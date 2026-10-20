/**
 * Third Shift — lead intake (Google Apps Script, bound to the "Third Shift CRM" spreadsheet)
 *
 * The public half of the backend. thirdshift.ca's contact form posts here; this project files the
 * lead in the CRM (Leads, Companies, Contacts, Deals, Activities tabs) and sends two emails. It has
 * no endpoint that returns CRM data, so nothing in the sheet can leak through it.
 *
 * Layers, cheapest first: body size cap → honeypot → too-fast-to-be-human check → field validation
 * → Cloudflare Turnstile (once TURNSTILE_SECRET is set) → burst + daily caps → formula-safe writes.
 *
 * Script properties (Project Settings → Script properties), all optional:
 *   TURNSTILE_SECRET  Cloudflare Turnstile secret key. Without it the bot check is skipped.
 *   ALLOWED_HOSTS     Comma-separated hostnames Turnstile tokens may come from.
 *                     Default: thirdshift.ca,www.thirdshift.ca
 *   CRM_URL           The CRM web app URL, linked from the new-lead email.
 *
 * Setup and redeploy steps: HANDOFF.md, "Backend".
 */

const NOTIFY_TO = "thirdshift.ca@gmail.com";   // swap to hello@thirdshift.ca once that mailbox exists
const FROM_NAME = "Third Shift";
const REPLY_TO = "thirdshift.ca@gmail.com";   // swap to hello@thirdshift.ca once email forwarding exists
const DEFAULT_ALLOWED_HOSTS = ["thirdshift.ca", "www.thirdshift.ca"];
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const MAX_BODY_CHARS = 20000;
const MIN_FILL_MS = 2000;                      // a person can't open the page and send the form faster
const BURST_LIMIT = 10;                        // leads per 10 minutes, across everyone
const BURST_WINDOW_SECONDS = 600;
const DAILY_LEAD_CAP = 100;

// A gmail account can send MailApp mail to about 100 recipients a day, and each lead uses two
// (the notice to us, the auto-reply to them). The cap keeps a bot from burning that quota or using
// the auto-reply to mail strangers. Leads past the cap still land in the CRM.
const DAILY_MAIL_CAP = 40;
const AUTO_REPLY_GAP_SECONDS = 21600;          // one auto-reply per address per 6 hours (CacheService max)

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    if (!raw || raw.length > MAX_BODY_CHARS) return json_({ ok: false, error: "bad_request" });
    let data;
    try { data = JSON.parse(raw); } catch (parseErr) { return json_({ ok: false, error: "bad_request" }); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return json_({ ok: false, error: "bad_request" });

    // Bots: the hidden field filled in, or the form sent faster than a person could. Both get a quiet ok.
    if (data.website) return json_({ ok: true });
    const elapsed = Number(data.elapsed_ms);
    if (data.elapsed_ms != null && Number.isFinite(elapsed) && elapsed < MIN_FILL_MS) return json_({ ok: true });

    const lead = {
      name: clean_(data.name, 120),
      email: clean_(data.email, 160),
      company: clean_(data.company, 160),
      phone: clean_(data.phone, 40),
      message: clean_(data.message, 4000, true),
      source: clean_(data.source, 80) || "thirdshift.ca",
      submitted: clean_(data.submitted_at, 40),
    };
    if (!lead.name || !lead.email || !lead.company || !lead.message) return json_({ ok: false, error: "missing_fields" });
    if (!isEmail_(lead.email)) return json_({ ok: false, error: "bad_email" });

    const check = verifyTurnstile_(data.cf_token);
    if (check === "fail") return json_({ ok: false, error: "bot_check" });

    const saved = withLock_(function () {
      if (!underLimits_()) return { ok: false, error: "busy" };
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const leads = crmSheet_(ss, "Leads");
      // The raw lead is written first: if filing it in the CRM fails, it is still on the Leads tab.
      const row = crmAppend_(leads, {
        received: new Date(), name: lead.name, email: lead.email, company: lead.company, phone: lead.phone,
        message: lead.message, source: lead.source, submitted: lead.submitted,
        status: check === "unverified" ? "New (bot check unavailable)" : "New",
      });
      try {
        crmUpdateRow_(leads, row, { deal_id: crmCreateFromLead_(ss, lead) });
      } catch (crmErr) {
        console.error("Lead saved, CRM filing failed: " + crmErr);
        crmUpdateRow_(leads, row, { status: "Needs CRM entry" });
      }
      return { ok: true, notify: takeMailBudget_(), reply: firstReplyFor_(lead.email) && takeMailBudget_() };
    });
    if (!saved.ok) return json_({ ok: false, error: saved.error });

    // The lead is saved. A mail failure (quota, a bounced address) must not come back as an error,
    // or the visitor retries and the lead lands twice.
    try {
      if (saved.notify) notify_(lead);
      if (saved.reply) autoReply_(lead);
    } catch (mailErr) {
      console.error("Lead saved but mail failed: " + mailErr);
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: "server_error" });
  }
}

// GET lets you sanity-check the deployment URL in a browser. It never returns data.
function doGet() {
  return json_({ ok: true, service: "thirdshift-intake" });
}

// Company matched by name, contact by email; a contact with an open deal gets the new inquiry on
// that deal instead of a duplicate card. Returns the deal id.
function crmCreateFromLead_(ss, lead) {
  const now = new Date();
  const companies = crmSheet_(ss, "Companies");
  const contacts = crmSheet_(ss, "Contacts");
  const deals = crmSheet_(ss, "Deals");
  const activities = crmSheet_(ss, "Activities");

  let company = crmRows_(companies).filter(function (c) { return crmNorm_(c.name) === crmNorm_(lead.company); })[0];
  if (!company) {
    company = { id: crmId_("CO"), name: lead.company, created: now, updated: now };
    crmAppend_(companies, company);
  }

  let contact = crmRows_(contacts).filter(function (c) { return crmNorm_(c.email) === crmNorm_(lead.email); })[0];
  if (!contact) {
    contact = { id: crmId_("P"), name: lead.name, email: lead.email, phone: lead.phone, company_id: company.id, created: now, updated: now };
    crmAppend_(contacts, contact);
  }

  let deal = crmRows_(deals).filter(function (d) {
    return d.contact_id === contact.id && CRM_OPEN_STAGES.indexOf(d.stage) !== -1;
  })[0];
  if (!deal) {
    deal = {
      id: crmId_("D"), title: lead.company, company_id: company.id, contact_id: contact.id, stage: "New",
      source: lead.source, next_step: "Reply to the inquiry", next_date: crmNextBusinessDay_(now), created: now, updated: now,
    };
    crmAppend_(deals, deal);
  } else {
    crmUpdateRow_(deals, deal._row, { updated: now });
  }

  crmAppend_(activities, { id: crmId_("A"), deal_id: deal.id, type: "Inquiry", summary: lead.message, created: now });
  return deal.id;
}

function notify_(lead) {
  const crmUrl = scriptProp_("CRM_URL");
  const subject = "New lead: " + lead.name + " at " + lead.company;
  const html =
    "<p><strong>" + esc_(lead.name) + "</strong> at <strong>" + esc_(lead.company) + "</strong></p>" +
    "<p>" + esc_(lead.email) + (lead.phone ? " · " + esc_(lead.phone) : "") + "</p>" +
    "<p style='white-space:pre-wrap'>" + esc_(lead.message) + "</p>" +
    "<p>Reply to this email to answer them directly." +
    (/^https:\/\/script\.google\.com\//.test(crmUrl) ? " <a href='" + esc_(crmUrl) + "'>Open the CRM</a>." : "") + "</p>";
  MailApp.sendEmail({ to: NOTIFY_TO, replyTo: lead.email, subject: subject, htmlBody: html, name: FROM_NAME });
}

function autoReply_(lead) {
  // Only a plain first name goes into the greeting, so the form can't be used to put
  // someone else's words (or a link) into mail we send to a stranger.
  const first = (lead.name.split(/\s+/)[0].match(/^[\p{L}'’-]{1,30}$/u) || [])[0] || "there";
  const body =
    "Hi " + first + ",\n\n" +
    "Got your note. I'll read it properly and reply within one business day with a time for a call, " +
    "or a straight answer if it's not a fit.\n\n" +
    "Aaron\nThird Shift\nthirdshift.ca";
  MailApp.sendEmail({ to: lead.email, replyTo: REPLY_TO, subject: "Got it — Third Shift", body: body, name: FROM_NAME });
}

// "ok", "fail" (Cloudflare said no, or the token is missing), or "unverified" (no secret configured
// is "ok"; Cloudflare unreachable is "unverified", so an outage doesn't lose real leads).
function verifyTurnstile_(token) {
  const secret = scriptProp_("TURNSTILE_SECRET");
  if (!secret) return "ok";
  if (!token || typeof token !== "string" || token.length > 2048) return "fail";
  let res;
  try {
    res = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, { method: "post", payload: { secret: secret, response: token }, muteHttpExceptions: true });
  } catch (netErr) {
    console.error("Turnstile unreachable: " + netErr);
    return "unverified";
  }
  if (res.getResponseCode() >= 500) return "unverified";
  let body;
  try { body = JSON.parse(res.getContentText()); } catch (badJson) { return "unverified"; }
  if (!body || body.success !== true) return "fail";
  return allowedHosts_().indexOf(String(body.hostname || "").toLowerCase()) !== -1 ? "ok" : "fail";
}

function allowedHosts_() {
  const configured = scriptProp_("ALLOWED_HOSTS");
  const list = configured ? configured.split(",") : DEFAULT_ALLOWED_HOSTS;
  return list.map(function (h) { return h.trim().toLowerCase(); }).filter(String);
}

// Burst and daily caps across all visitors. Call inside withLock_.
function underLimits_() {
  const cache = CacheService.getScriptCache();
  const bucket = "burst:" + Math.floor(Date.now() / (BURST_WINDOW_SECONDS * 1000));
  const inWindow = Number(cache.get(bucket) || 0);
  if (inWindow >= BURST_LIMIT) return false;

  const props = PropertiesService.getScriptProperties();
  const today = crmToday_();
  const usedToday = props.getProperty("leadDay") === today ? Number(props.getProperty("leadCount") || 0) : 0;
  if (usedToday >= DAILY_LEAD_CAP) return false;

  cache.put(bucket, String(inWindow + 1), BURST_WINDOW_SECONDS);
  props.setProperties({ leadDay: today, leadCount: String(usedToday + 1) });
  return true;
}

// One unit of the day's mail allowance, or false once it's used up. Call inside withLock_.
function takeMailBudget_() {
  const props = PropertiesService.getScriptProperties();
  const today = crmToday_();
  const used = props.getProperty("mailDay") === today ? Number(props.getProperty("mailUsed") || 0) : 0;
  if (used >= DAILY_MAIL_CAP) return false;
  props.setProperties({ mailDay: today, mailUsed: String(used + 1) });
  return true;
}

// True the first time an address shows up in AUTO_REPLY_GAP_SECONDS; false for repeats.
function firstReplyFor_(email) {
  const cache = CacheService.getScriptCache();
  const key = "autoreply:" + email.toLowerCase();
  if (cache.get(key)) return false;
  cache.put(key, "1", AUTO_REPLY_GAP_SECONDS);
  return true;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function scriptProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

// Strips control characters plus the invisible and direction-flipping ones that can disguise text
// in an email or a sheet. Newlines survive only where asked for (the message).
function clean_(v, max, multiline) {
  let s = String(v == null ? "" : v).replace(/\r\n?/g, "\n");
  s = s.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  s = s.replace(/[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g, "");
  if (multiline) s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim().slice(0, max);
}
function isEmail_(s) { return s.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function esc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// Run this once from the editor to confirm the sheet + email path work.
// (No trailing underscore: Apps Script hides functions ending in "_" from the Run dropdown.)
function selfTest() {
  const fake = { postData: { contents: JSON.stringify({
    name: "Test Person", email: NOTIFY_TO, company: "Test Co", phone: "+1 519 555 0100",
    message: "Self-test from the Apps Script editor.", source: "selftest", elapsed_ms: 60000,
  }) } };
  Logger.log(doPost(fake).getContent());
}
