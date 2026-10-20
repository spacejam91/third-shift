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
 *   4. Copy the web app URL into LEAD_ENDPOINT in index.html.
 *
 * Every later code change needs Deploy → Manage deployments → Edit → New version,
 * otherwise the live URL keeps serving the old code.
 */

const SHEET_NAME = "Leads";
const NOTIFY_TO = "thirdshift.ca@gmail.com";   // swap to hello@thirdshift.ca once that mailbox exists
const FROM_NAME = "Third Shift";
const REPLY_TO = "hello@thirdshift.ca";

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
    sheet.appendRow([new Date(), name, email, company, phone, message, source, submitted, "New"]);

    notify_(name, email, company, phone, message);
    autoReply_(name, email);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
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
  const first = name.split(" ")[0];
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

function clean_(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}
function isEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function esc_(s) { return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// Run this once from the editor to confirm the sheet + email path work.
function selfTest_() {
  const fake = { postData: { contents: JSON.stringify({ name: "Test Person", email: NOTIFY_TO, company: "Test Co", phone: "", message: "Self-test from the Apps Script editor.", source: "selftest" }) } };
  Logger.log(doPost(fake).getContent());
}
