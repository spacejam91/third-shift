/**
 * Third Shift — lead intake backend (Google Apps Script, container-bound to a Sheet)
 *
 * Setup:
 *   1. Create a Google Sheet called "Third Shift Leads" (in the thirdshift.ca@gmail Drive).
 *   2. Extensions → Apps Script → paste this file over Code.gs → Save.
 *   3. Deploy → New deployment → Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *      Authorize when prompted (it needs Sheets + Mail).
 *   4. Copy the web app URL into LEAD_ENDPOINT in site/index.html.
 *   5. Pick selfTest in the editor's function dropdown → Run. A row should land in the sheet
 *      and two emails (the lead notice and the auto-reply) in the gmail.
 *
 * Every later code change needs Deploy → Manage deployments → Edit → New version,
 * otherwise the live URL keeps serving the old code.
 */

const SHEET_NAME = "Leads";
const NOTIFY_TO = "thirdshift.ca@gmail.com";   // swap to hello@thirdshift.ca once that mailbox exists
const FROM_NAME = "Third Shift";
const REPLY_TO = "hello@thirdshift.ca";

// A gmail account can send MailApp mail to about 100 recipients a day, and each lead uses two
// (the notice to us, the auto-reply to them). The cap keeps a bot hammering the form from burning
// that quota or using the auto-reply to mail strangers. Leads past the cap still land in the sheet.
const DAILY_MAIL_CAP = 40;
const AUTO_REPLY_GAP_SECONDS = 21600;          // one auto-reply per address per 6 hours (CacheService max)

const HEADERS = ["Received", "Name", "Email", "Company", "Phone", "What takes up their time", "Source", "Submitted (client)", "Status"];

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "{}";
    const data = JSON.parse(raw);

    // Honeypot: real people never fill the hidden "website" field.
    if (data.website) return json_({ ok: true });

    const name = clean_(data.name, 120);
    const email = clean_(data.email, 160);
    const company = clean_(data.company, 160);
    const phone = clean_(data.phone, 40);
    const message = clean_(data.message, 4000);
    const source = clean_(data.source, 80) || "thirdshift.ca";
    const submitted = clean_(data.submitted_at, 40);

    if (!name || !email || !company || !message) return json_({ ok: false, error: "missing_fields" });
    if (!isEmail_(email)) return json_({ ok: false, error: "bad_email" });

    const sheet = getSheet_();
    sheet.appendRow([new Date(), name, email, company, phone, message, source, submitted, "New"].map(cellSafe_));

    // The row is saved. A mail failure (quota, a bounced address) must not come back as an error,
    // or the visitor retries and the lead lands twice.
    try {
      if (takeMailBudget_()) notify_(name, email, company, phone, message);
      if (firstReplyFor_(email) && takeMailBudget_()) autoReply_(name, email);
    } catch (mailErr) {
      console.error("Lead saved but mail failed: " + mailErr);
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: "server_error" });
  }
}

// GET lets you sanity-check the deployment URL in a browser.
function doGet() {
  return json_({ ok: true, service: "thirdshift-leads" });
}

function notify_(name, email, company, phone, message) {
  const subject = "New lead: " + name + " at " + company;
  const html =
    "<p><strong>" + esc_(name) + "</strong> at <strong>" + esc_(company) + "</strong></p>" +
    "<p>" + esc_(email) + (phone ? " · " + esc_(phone) : "") + "</p>" +
    "<p style='white-space:pre-wrap'>" + esc_(message) + "</p>" +
    "<p>Reply to this email to answer them directly.</p>";
  MailApp.sendEmail({ to: NOTIFY_TO, replyTo: email, subject: subject, htmlBody: html, name: FROM_NAME });
}

function autoReply_(name, email) {
  // Only a plain first name goes into the greeting, so the form can't be used to put
  // someone else's words (or a link) into mail we send to a stranger.
  const first = (name.split(/\s+/)[0].match(/^[\p{L}'’-]{1,30}$/u) || [])[0] || "there";
  const body =
    "Hi " + first + ",\n\n" +
    "Got your note. I'll read it properly and reply within one business day with a time for a call, " +
    "or a straight answer if it's not a fit.\n\n" +
    "Aaron\nThird Shift\nthirdshift.ca";
  MailApp.sendEmail({ to: email, replyTo: REPLY_TO, subject: "Got it — Third Shift", body: body, name: FROM_NAME });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// One unit of the day's mail allowance, or false once it's used up.
function takeMailBudget_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    const today = Utilities.formatDate(new Date(), "America/Toronto", "yyyy-MM-dd");
    const used = props.getProperty("mailDay") === today ? Number(props.getProperty("mailUsed") || 0) : 0;
    if (used >= DAILY_MAIL_CAP) return false;
    props.setProperties({ mailDay: today, mailUsed: String(used + 1) });
    return true;
  } finally {
    lock.releaseLock();
  }
}

// True the first time an address shows up in AUTO_REPLY_GAP_SECONDS; false for repeats.
function firstReplyFor_(email) {
  const cache = CacheService.getScriptCache();
  const key = "autoreply:" + email.toLowerCase();
  if (cache.get(key)) return false;
  cache.put(key, "1", AUTO_REPLY_GAP_SECONDS);
  return true;
}

function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}
// Sheets reads a value starting with = + - @ as a formula: a phone like "+1 519 555 0100" turns
// into #ERROR!, and a message starting with "=" would run. A leading apostrophe stores it as text.
function cellSafe_(v) { return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v; }
function isEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function esc_(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// Run this once from the editor to confirm the sheet + email path work.
// (No trailing underscore: Apps Script hides functions ending in "_" from the Run dropdown.)
function selfTest() {
  const fake = { postData: { contents: JSON.stringify({ name: "Test Person", email: NOTIFY_TO, company: "Test Co", phone: "+1 519 555 0100", message: "Self-test from the Apps Script editor.", source: "selftest" }) } };
  Logger.log(doPost(fake).getContent());
}
