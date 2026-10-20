// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
/**
 * Third Shift CRM — sheet schema and row helpers.
 *
 * The intake project and the CRM project each carry an identical copy of this file
 * (tests/backend.test.js fails if the two drift apart). The spreadsheet is the database:
 * one tab per record type, first row = column keys. Columns are found by header name, so
 * reordering or adding columns in the sheet doesn't break anything.
 */

const CRM_SHEETS = Object.freeze({
  Leads: ["received", "name", "email", "company", "phone", "message", "source", "submitted", "status", "deal_id", "utm_source", "utm_medium", "utm_campaign", "referrer"],
  Companies: ["id", "name", "website", "industry", "size", "city", "notes", "created", "updated"],
  Contacts: ["id", "name", "email", "phone", "title", "company_id", "notes", "created", "updated"],
  Deals: ["id", "title", "company_id", "contact_id", "stage", "value", "source", "next_step", "next_date", "created", "updated", "closed", "lost_reason"],
  Activities: ["id", "deal_id", "type", "summary", "due", "done", "created"],
});

const CRM_STAGES = Object.freeze(["New", "Contacted", "Call booked", "Plan sent", "Building", "Live", "Lost"]);
const CRM_OPEN_STAGES = Object.freeze(["New", "Contacted", "Call booked", "Plan sent"]);
const CRM_WON_STAGES = Object.freeze(["Building", "Live"]);
const CRM_ACTIVITY_TYPES = Object.freeze(["Inquiry", "Reply", "Note", "Call", "Email", "Meeting", "Task", "Stage"]);
const CRM_DATE_ONLY = Object.freeze(["next_date", "due", "closed"]);
const CRM_TZ = "America/Toronto";

// The tab for a record type, created with its header row if missing; missing columns are appended.
function crmSheet_(ss, name) {
  const headers = CRM_SHEETS[name];
  if (!headers) throw new Error("Unknown CRM sheet: " + name);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return sheet;
  }
  const have = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(String);
  const missing = headers.filter(function (h) { return have.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight("bold");
  }
  return sheet;
}

function crmHeaderIndex_(sheet) {
  const head = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const map = {};
  head.forEach(function (h, i) { if (h !== "" && h != null) map[String(h)] = i; });
  return map;
}

// Every data row as a plain object keyed by header, plus _row (the sheet row number).
function crmRows_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(1, 1, last, Math.max(1, sheet.getLastColumn())).getValues();
  const head = values[0].map(String);
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (row.every(function (v) { return v === "" || v == null; })) continue;
    const obj = { _row: r + 1 };
    head.forEach(function (h, i) { if (h) obj[h] = crmPlain_(h, row[i]); });
    out.push(obj);
  }
  return out;
}

// Dates leave the sheet as strings: yyyy-MM-dd for date-only columns, local ISO time otherwise.
function crmPlain_(header, v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, CRM_TZ, CRM_DATE_ONLY.indexOf(header) !== -1 ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm:ss");
  }
  return v == null ? "" : v;
}

function crmAppend_(sheet, obj) {
  const idx = crmHeaderIndex_(sheet);
  const row = new Array(Math.max(1, sheet.getLastColumn())).fill("");
  Object.keys(obj).forEach(function (k) { if (k in idx) row[idx[k]] = cellSafe_(obj[k]); });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

// Writes only the given columns, so formulas added by hand elsewhere in the row survive.
function crmUpdateRow_(sheet, rowNum, obj) {
  const idx = crmHeaderIndex_(sheet);
  Object.keys(obj).forEach(function (k) {
    if (k in idx) sheet.getRange(rowNum, idx[k] + 1).setValue(cellSafe_(obj[k]));
  });
}

function crmId_(prefix) {
  return prefix + "-" + Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
}

function crmNorm_(s) {
  return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");
}

function crmToday_() {
  return Utilities.formatDate(new Date(), CRM_TZ, "yyyy-MM-dd");
}

// The next Monday-to-Friday date after `from`, as yyyy-MM-dd in Toronto time.
function crmNextBusinessDay_(from) {
  const d = new Date(from.getTime());
  do {
    d.setTime(d.getTime() + 86400000);
  } while (["6", "7"].indexOf(Utilities.formatDate(d, CRM_TZ, "u")) !== -1);
  return Utilities.formatDate(d, CRM_TZ, "yyyy-MM-dd");
}

// Sheets reads a value starting with = + - @ as a formula: a phone like "+1 519 555 0100" turns
// into #ERROR!, and a message starting with "=" would run. A leading apostrophe stores it as text.
function cellSafe_(v) {
  return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
}
