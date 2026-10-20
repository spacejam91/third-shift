// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
/**
 * Third Shift CRM — private web app (standalone Google Apps Script project)
 *
 * The pipeline, contacts, companies and activity log for Third Shift, stored in the same
 * "Third Shift CRM" spreadsheet the website's intake project writes new leads into.
 *
 * Who can get in: the web app is deployed "Execute as: User accessing the web app" and
 * "Who has access: Only myself", so Google sign-in guards the door and every read or write runs
 * with the visitor's own Google permissions (someone without access to the sheet gets nothing even
 * if the deployment is ever widened by mistake). On top of that, every call checks the visitor's
 * email against the CRM_USERS script property.
 *
 * Script properties:
 *   CRM_SHEET_ID  (required) the spreadsheet id, the long string in the sheet's URL
 *   CRM_USERS     comma-separated emails allowed in. setupCrm() fills in your own.
 *
 * First run: set CRM_SHEET_ID, then run setupCrm() from the editor. Steps in HANDOFF.md.
 */

const CRM_MANUAL_TYPES = Object.freeze(["Note", "Call", "Email", "Meeting", "Task"]);
const CRM_SOURCES = Object.freeze(["Website", "Referral", "Networking event", "Cold outreach", "Existing client", "Other"]);
const MAX_VALUE = 10000000;

// ------------------------------------------------------------------ web app

function doGet() {
  try {
    assertUser_();
  } catch (err) {
    return HtmlService.createHtmlOutput("<p style='font-family:sans-serif'>This CRM is private.</p>").setTitle("Third Shift CRM");
  }
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Third Shift CRM")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// ------------------------------------------------------------------ API (called with google.script.run)

function crmLoad() {
  const me = assertUser_();
  const ss = openCrm_();
  return {
    me: me,
    today: crmToday_(),
    stages: CRM_STAGES.slice(),
    openStages: CRM_OPEN_STAGES.slice(),
    wonStages: CRM_WON_STAGES.slice(),
    activityTypes: CRM_MANUAL_TYPES.slice(),
    sources: CRM_SOURCES.slice(),
    companies: crmRows_(crmSheet_(ss, "Companies")).map(out_),
    contacts: crmRows_(crmSheet_(ss, "Contacts")).map(out_),
    deals: crmRows_(crmSheet_(ss, "Deals")).map(out_),
    activities: crmRows_(crmSheet_(ss, "Activities")).map(out_),
  };
}

// Create (no id) or update a deal. A new deal can bring a new company and contact with it.
// Updates must send the `updated` value they were based on; if the row changed since (say, an edit
// straight in the sheet), the save is refused so nothing is silently overwritten.
function crmSaveDeal(input) {
  assertUser_();
  input = obj_(input);
  return withLock_(function () {
    const ss = openCrm_();
    const deals = crmSheet_(ss, "Deals");
    const now = new Date();
    const result = {};

    if (!input.id) {
      const company = findOrCreateCompany_(ss, input, now, result);
      const contact = findOrCreateContact_(ss, input, company, now, result);
      const deal = {
        id: crmId_("D"),
        title: str_(input.title, 160) || company.name,
        company_id: company.id,
        contact_id: contact ? contact.id : "",
        stage: stage_(input.stage || "New"),
        value: money_(input.value),
        source: str_(input.source, 80) || "Other",
        next_step: str_(input.next_step, 200),
        next_date: date_(input.next_date),
        created: now,
        updated: now,
        closed: "",
        lost_reason: "",
      };
      if (CRM_OPEN_STAGES.indexOf(deal.stage) === -1) deal.closed = crmToday_();
      crmAppend_(deals, deal);
      result.deal = out_(deal);
      return result;
    }

    const current = byId_(deals, input.id);
    checkFresh_(current, input.updated);
    const patch = { updated: now };
    if ("title" in input) patch.title = str_(input.title, 160) || current.title;
    if ("value" in input) patch.value = money_(input.value);
    if ("source" in input) patch.source = str_(input.source, 80);
    if ("next_step" in input) patch.next_step = str_(input.next_step, 200);
    if ("next_date" in input) patch.next_date = date_(input.next_date);
    if ("lost_reason" in input) patch.lost_reason = str_(input.lost_reason, 300);
    let activity = null;
    if ("stage" in input && input.stage !== current.stage) {
      Object.assign(patch, stagePatch_(current, stage_(input.stage)));
      activity = logStage_(ss, current, patch.stage, now);
    }
    crmUpdateRow_(deals, current._row, patch);
    result.deal = out_(Object.assign({}, current, patch));
    if (activity) result.activity = activity;
    return result;
  });
}

// Drag and drop on the board.
function crmMoveDeal(id, stage, expectedUpdated) {
  return crmSaveDeal({ id: id, stage: stage, updated: expectedUpdated });
}

function crmAddActivity(input) {
  assertUser_();
  input = obj_(input);
  return withLock_(function () {
    const ss = openCrm_();
    const deals = crmSheet_(ss, "Deals");
    const deal = byId_(deals, str_(input.deal_id, 40));
    const type = CRM_MANUAL_TYPES.indexOf(input.type) !== -1 ? input.type : "Note";
    const summary = str_(input.summary, 4000, true);
    if (!summary) throw new Error("Write something first.");
    const now = new Date();
    const activity = {
      id: crmId_("A"), deal_id: deal.id, type: type, summary: summary,
      due: type === "Task" ? date_(input.due) : "", done: type === "Task" ? "no" : "", created: now,
    };
    crmAppend_(crmSheet_(ss, "Activities"), activity);
    crmUpdateRow_(deals, deal._row, { updated: now });
    return { activity: out_(activity), deal: out_(Object.assign({}, deal, { updated: now })) };
  });
}

function crmSetTaskDone(id, done) {
  assertUser_();
  return withLock_(function () {
    const ss = openCrm_();
    const sheet = crmSheet_(ss, "Activities");
    const task = byId_(sheet, str_(id, 40));
    if (task.type !== "Task") throw new Error("That isn't a task.");
    const patch = { done: done ? "yes" : "no" };
    crmUpdateRow_(sheet, task._row, patch);
    return { activity: out_(Object.assign({}, task, patch)) };
  });
}

function crmSaveContact(input) {
  assertUser_();
  input = obj_(input);
  return withLock_(function () {
    const ss = openCrm_();
    const sheet = crmSheet_(ss, "Contacts");
    const current = byId_(sheet, str_(input.id, 40));
    checkFresh_(current, input.updated);
    const patch = { updated: new Date() };
    if ("name" in input) patch.name = str_(input.name, 120) || current.name;
    if ("email" in input) patch.email = email_(input.email);
    if ("phone" in input) patch.phone = str_(input.phone, 40);
    if ("title" in input) patch.title = str_(input.title, 120);
    if ("notes" in input) patch.notes = str_(input.notes, 2000, true);
    crmUpdateRow_(sheet, current._row, patch);
    return { contact: out_(Object.assign({}, current, patch)) };
  });
}

function crmSaveCompany(input) {
  assertUser_();
  input = obj_(input);
  return withLock_(function () {
    const ss = openCrm_();
    const sheet = crmSheet_(ss, "Companies");
    const current = byId_(sheet, str_(input.id, 40));
    checkFresh_(current, input.updated);
    const patch = { updated: new Date() };
    if ("name" in input) patch.name = str_(input.name, 160) || current.name;
    if ("website" in input) patch.website = url_(input.website);
    if ("industry" in input) patch.industry = str_(input.industry, 80);
    if ("size" in input) patch.size = str_(input.size, 40);
    if ("city" in input) patch.city = str_(input.city, 80);
    if ("notes" in input) patch.notes = str_(input.notes, 2000, true);
    crmUpdateRow_(sheet, current._row, patch);
    return { company: out_(Object.assign({}, current, patch)) };
  });
}

// ------------------------------------------------------------------ morning summary

// Weekday mornings at 7 (trigger installed by setupCrm): what needs a reply, a follow-up or a task
// today. Sends nothing when the day is clear.
function sendMorningSummary() {
  if (["6", "7"].indexOf(Utilities.formatDate(new Date(), CRM_TZ, "u")) !== -1) return;
  const ss = openCrm_();
  const today = crmToday_();
  const companies = indexBy_(crmRows_(crmSheet_(ss, "Companies")));
  const contacts = indexBy_(crmRows_(crmSheet_(ss, "Contacts")));
  const deals = crmRows_(crmSheet_(ss, "Deals")).filter(function (d) { return CRM_OPEN_STAGES.indexOf(d.stage) !== -1; });
  const tasks = crmRows_(crmSheet_(ss, "Activities")).filter(function (a) {
    return a.type === "Task" && a.done !== "yes" && a.due && a.due <= today;
  });
  const fresh = deals.filter(function (d) { return d.stage === "New"; });
  const due = deals.filter(function (d) { return d.stage !== "New" && d.next_date && d.next_date <= today; });
  if (!fresh.length && !due.length && !tasks.length) return;

  const dealName = function (d) {
    const co = companies[d.company_id], p = contacts[d.contact_id];
    return (co ? co.name : d.title) + (p ? " (" + p.name + ")" : "");
  };
  const dealsById = indexBy_(deals);
  const section = function (title, items) {
    if (!items.length) return "";
    return "<h3 style='margin:18px 0 6px;font:600 15px sans-serif'>" + esc_(title) + "</h3><ul style='margin:0;padding-left:18px'>" +
      items.map(function (t) { return "<li style='margin:4px 0'>" + esc_(t) + "</li>"; }).join("") + "</ul>";
  };
  const count = fresh.length + due.length + tasks.length;
  const url = ScriptApp.getService().getUrl();
  const html = "<div style='font:14px/1.5 sans-serif;color:#13203A'>" +
    section("New inquiries to answer", fresh.map(dealName)) +
    section("Follow-ups due", due.map(function (d) { return dealName(d) + ": " + (d.next_step || "follow up") + (d.next_date < today ? " (overdue since " + d.next_date + ")" : ""); })) +
    section("Tasks due", tasks.map(function (a) { const d = dealsById[a.deal_id]; return a.summary + (d ? " — " + dealName(d) : ""); })) +
    (url ? "<p style='margin-top:20px'><a href='" + esc_(url) + "'>Open the CRM</a></p>" : "") + "</div>";
  const to = scriptProp_("CRM_USERS").split(",")[0].trim() || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: to, subject: "Morning summary: " + count + (count === 1 ? " thing" : " things") + " today", htmlBody: html, name: "Third Shift CRM" });
}

// ------------------------------------------------------------------ setup (run once from the editor)

function setupCrm() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("CRM_SHEET_ID")) {
    throw new Error("Set the CRM_SHEET_ID script property first: the long id in the spreadsheet's URL.");
  }
  const ss = openCrm_();
  Object.keys(CRM_SHEETS).forEach(function (name) { crmSheet_(ss, name); });
  if (!props.getProperty("CRM_USERS")) props.setProperty("CRM_USERS", Session.getEffectiveUser().getEmail());

  // A stage dropdown in the sheet too, so edits made there stay valid.
  const deals = crmSheet_(ss, "Deals");
  const col = crmHeaderIndex_(deals).stage + 1;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(CRM_STAGES.slice(), true).setAllowInvalid(false).build();
  deals.getRange(2, col, Math.max(1, deals.getMaxRows() - 1), 1).setDataValidation(rule);

  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "sendMorningSummary"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("sendMorningSummary").timeBased().atHour(7).everyDays(1).inTimezone(CRM_TZ).create();

  Logger.log("CRM ready. Allowed users: " + props.getProperty("CRM_USERS"));
}

// ------------------------------------------------------------------ helpers

function assertUser_() {
  const me = crmNorm_(Session.getActiveUser().getEmail());
  const allowed = scriptProp_("CRM_USERS").split(",").map(crmNorm_).filter(String);
  if (!me || !allowed.length || allowed.indexOf(me) === -1) throw new Error("Not authorized.");
  return me;
}

function openCrm_() {
  const id = scriptProp_("CRM_SHEET_ID");
  if (!id) throw new Error("CRM_SHEET_ID is not set.");
  return SpreadsheetApp.openById(id);
}

function findOrCreateCompany_(ss, input, now, result) {
  const sheet = crmSheet_(ss, "Companies");
  const rows = crmRows_(sheet);
  if (input.company_id) {
    const found = rows.filter(function (c) { return c.id === input.company_id; })[0];
    if (found) return found;
  }
  const name = str_(input.company_name, 160);
  if (!name) throw new Error("A deal needs a company.");
  const byName = rows.filter(function (c) { return crmNorm_(c.name) === crmNorm_(name); })[0];
  if (byName) return byName;
  const company = { id: crmId_("CO"), name: name, website: url_(input.company_website), city: str_(input.company_city, 80), created: now, updated: now };
  crmAppend_(sheet, company);
  result.company = out_(company);
  return company;
}

function findOrCreateContact_(ss, input, company, now, result) {
  const sheet = crmSheet_(ss, "Contacts");
  const rows = crmRows_(sheet);
  if (input.contact_id) {
    const found = rows.filter(function (c) { return c.id === input.contact_id; })[0];
    if (found) return found;
  }
  const name = str_(input.contact_name, 120);
  const email = email_(input.contact_email);
  if (!name && !email) return null;
  if (email) {
    const byEmail = rows.filter(function (c) { return crmNorm_(c.email) === crmNorm_(email); })[0];
    if (byEmail) return byEmail;
  }
  const contact = {
    id: crmId_("P"), name: name || email, email: email, phone: str_(input.contact_phone, 40),
    title: str_(input.contact_title, 120), company_id: company.id, created: now, updated: now,
  };
  crmAppend_(sheet, contact);
  result.contact = out_(contact);
  return contact;
}

// Closing a deal stamps the close date; reopening clears it.
function stagePatch_(current, next) {
  const patch = { stage: next };
  const wasOpen = CRM_OPEN_STAGES.indexOf(current.stage) !== -1;
  const isOpen = CRM_OPEN_STAGES.indexOf(next) !== -1;
  if (wasOpen && !isOpen) patch.closed = crmToday_();
  if (!wasOpen && isOpen) { patch.closed = ""; patch.lost_reason = ""; }
  return patch;
}

function logStage_(ss, deal, next, now) {
  const activity = { id: crmId_("A"), deal_id: deal.id, type: "Stage", summary: (deal.stage || "None") + " → " + next, created: now };
  crmAppend_(crmSheet_(ss, "Activities"), activity);
  return out_(activity);
}

function byId_(sheet, id) {
  const found = crmRows_(sheet).filter(function (r) { return r.id === id; })[0];
  if (!found) throw new Error("Not found: " + id + ". It may have been deleted in the sheet.");
  return found;
}

function checkFresh_(current, expected) {
  if (expected == null || expected === "") return;
  if (String(current.updated) !== String(expected)) {
    throw new Error("CHANGED: this record was edited somewhere else. Reload to see the latest.");
  }
}

function indexBy_(rows) {
  const map = {};
  rows.forEach(function (r) { map[r.id] = r; });
  return map;
}

// What the browser gets: dates as strings, no sheet row numbers.
function out_(obj) {
  const clean = {};
  Object.keys(obj).forEach(function (k) {
    if (k === "_row") return;
    clean[k] = crmPlain_(k, obj[k]);
  });
  return clean;
}

function obj_(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Bad request.");
  return v;
}

function str_(v, max, multiline) {
  let s = String(v == null ? "" : v).replace(/\r\n?/g, "\n");
  s = s.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  s = s.replace(/[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g, "");
  return s.trim().slice(0, max);
}

function stage_(v) {
  if (CRM_STAGES.indexOf(v) === -1) throw new Error("Unknown stage: " + v);
  return v;
}

function money_(v) {
  if (v === "" || v == null) return "";
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  if (!isFinite(n) || n < 0 || n > MAX_VALUE) throw new Error("Value should be a dollar amount.");
  return Math.round(n * 100) / 100;
}

function date_(v) {
  const s = String(v == null ? "" : v).trim();
  if (!s) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Dates look like 2026-10-21.");
  return s;
}

function email_(v) {
  const s = str_(v, 160);
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error("That email doesn't look right.");
  return s;
}

function url_(v) {
  let s = str_(v, 300);
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  if (!/^https?:\/\/[^\s/$.?#][^\s]*$/i.test(s)) throw new Error("That website doesn't look right.");
  return s;
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

function esc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
