// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The CRM screen's Outreach tab: what it reads from the sales agent's tabs, and the decisions it
// writes back for the agent to act on. Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadProject } from "./gas-mock.mjs";

const USER = "aaron@thirdshift.ca";
// The sales agent's columns (third-shift-outreach/src/Config.js, OUT_SHEETS).
const TABS = {
  Outreach: ["id", "status", "company", "website", "domain", "city", "industry", "place_id", "phone", "source",
    "about", "email", "email_kind", "email_source_url", "email_checked", "notice_check", "greeting_name", "reason",
    "subject", "body1", "body2", "body3", "approved", "step", "thread_id", "message_id", "next_send",
    "sent1", "sent2", "sent3", "replied", "reply_kind", "reply_summary", "closed_reason",
    "company_id", "contact_id", "deal_id", "error", "created", "updated"],
  Actions: ["id", "kind", "status", "deal_id", "outreach_id", "company", "to", "subject", "body", "thread_id",
    "in_reply_to", "call_start", "call_end", "approved", "note", "error", "created", "updated", "done"],
  Suppression: ["email", "domain", "reason", "source", "added"],
  Runs: ["at", "job", "summary", "errors"],
};

function crm({ agent = true } = {}) {
  const p = loadProject(["crm/Schema.gs", "crm/Crm.gs"], { activeUser: USER, effectiveUser: USER });
  p.env.props.CRM_SHEET_ID = p.ss.id;
  p.env.props.CRM_USERS = USER;
  p.ctx.setupCrm();
  if (agent) {
    for (const [name, head] of Object.entries(TABS)) p.ss.insertSheet(name).getRange(1, 1, 1, head.length).setValues([head]);
  }
  const D = p.ss.DateCtor;
  p.ago = (days) => new D(Date.now() - days * 864e5);
  p.add = (tab, rec) => p.ctx.crmAppend_(p.ss.getSheetByName(tab), rec);
  p.row = (tab, id) => p.ss.getSheetByName(tab).records().find((r) => r.id === id);
  return p;
}

const draft = (over = {}) => ({
  id: "O-1", status: "Draft", company: "Grand River Dental", city: "Kitchener", industry: "Dental clinic",
  email: "office@grandriverdental.example", email_kind: "role", email_source_url: "https://grandriverdental.example/contact",
  reason: "Insurance claims by hand", subject: "Insurance paperwork at Grand River Dental",
  body1: "Hi,\n\nFirst email.", body2: "Second.", body3: "Third.", approved: "", step: "0",
  thread_id: "", message_id: "", about: "A long page excerpt", deal_id: "D-1", ...over,
});

test("Outreach tab: says so plainly when the sales agent isn't set up", () => {
  const p = crm({ agent: false });
  const r = p.ctx.crmOutreachLoad();
  assert.equal(r.ready, false);
  assert.match(r.today, /^\d{4}-\d{2}-\d{2}$/);
});

test("Outreach tab: drafts, live sequences and recent results, without thread ids or old closed rows", () => {
  const p = crm();
  const today = p.ctx.crmToday_();
  p.add("Outreach", draft({ created: p.ago(0), updated: p.ago(0) }));
  p.add("Outreach", draft({ id: "O-2", status: "Active", step: "1", thread_id: "T-9", message_id: "<m@x>", sent1: p.ago(0), next_send: "'2026-10-26", updated: p.ago(0) }));
  p.add("Outreach", draft({ id: "O-3", status: "Replied", reply_kind: "interested", reply_summary: "Call me Thursday", updated: p.ago(2) }));
  p.add("Outreach", draft({ id: "O-4", status: "Finished", closed_reason: "No reply to 3 emails", updated: p.ago(3) }));
  p.add("Outreach", draft({ id: "O-5", status: "Skipped", updated: p.ago(60) }));
  p.add("Outreach", draft({ id: "O-6", status: "Excluded", closed_reason: "No-solicitation notice", updated: p.ago(2) }));
  p.add("Outreach", draft({ id: "O-7", status: "No email", updated: p.ago(10) }));
  p.add("Actions", { id: "X-1", kind: "call", status: "Draft", outreach_id: "O-3", deal_id: "D-1", company: "Grand River Dental", to: "maya@grandriverdental.example", subject: "Re: Insurance", body: "Thursday at 2 works.", thread_id: "T-3", in_reply_to: "<r@x>", call_start: p.ago(-2), created: p.ago(0), updated: p.ago(0) });
  p.add("Actions", { id: "X-2", kind: "reply", status: "Done", company: "Old Co", updated: p.ago(45) });
  p.add("Suppression", { email: "no@example.com", reason: "Unsubscribed" });
  p.add("Runs", { at: p.ago(1), job: "daily", summary: "found 4" });
  p.add("Runs", { at: p.ago(0), job: "tick", summary: "sent 1" });

  const r = JSON.parse(JSON.stringify(p.ctx.crmOutreachLoad()));
  assert.equal(r.ready, true);
  assert.deepEqual(r.outreach.map((o) => o.id).sort(), ["O-1", "O-2", "O-3", "O-4", "O-6"], "old closed rows and week-old passed-over rows are left off");
  const active = r.outreach.find((o) => o.id === "O-2");
  assert.equal(active.next_send, "2026-10-26");
  assert.ok(!("thread_id" in active) && !("message_id" in active) && !("about" in active), "mail ids and page text stay in the sheet");
  assert.equal(r.outreach.find((o) => o.id === "O-4").body2, undefined, "closed rows come without their email text");
  assert.equal(r.outreach.find((o) => o.id === "O-3").body1, "Hi,\n\nFirst email.", "replied rows keep it, for context");
  assert.deepEqual(r.actions.map((a) => a.id), ["X-1"]);
  assert.ok(!("in_reply_to" in r.actions[0]));
  assert.match(r.actions[0].call_start, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.equal(r.counts.Draft, 1);
  assert.equal(r.counts.Skipped, 1, "counts cover every row");
  assert.equal(r.sentToday, 1);
  assert.equal(r.suppressed, 1);
  assert.equal(r.lastDaily.summary, "found 4");
  assert.deepEqual(r.runs.map((x) => x.job), ["tick", "daily"], "newest first");
  assert.equal(r.today, today);
});

test("Outreach tab: approving writes the edits and then the decision, and only once", () => {
  const p = crm();
  p.add("Outreach", draft({ created: p.ago(0), updated: p.ago(1) }));
  const shown = p.ctx.crmOutreachLoad().outreach[0];

  const r = p.ctx.crmOutreachDecide({ id: "O-1", decision: "approve", updated: shown.updated, subject: "Claims at Grand River Dental", body1: "=Hi Maya,\n\nShorter." });
  assert.equal(r.outreach.approved, "yes");
  assert.equal(r.outreach.status, "Draft", "the agent moves it on, not the screen");
  const row = p.row("Outreach", "O-1");
  assert.equal(row.approved, "yes");
  assert.equal(row.subject, "Claims at Grand River Dental");
  assert.equal(row.body1, "=Hi Maya,\n\nShorter.", "formula-looking text is stored as text, line breaks kept");
  assert.equal(row.body2, "Second.", "untouched follow-ups stay as they were");

  const order = [];
  const sheet = p.ss.getSheetByName("Outreach");
  const head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const real = sheet.getRange.bind(sheet);
  sheet.getRange = (r1, c1, ...rest) => { const g = real(r1, c1, ...rest); const set = g.setValue.bind(g); g.setValue = (v) => { order.push(head[c1 - 1]); return set(v); }; return g; };
  p.add("Outreach", draft({ id: "O-2", created: p.ago(0) }));
  p.ctx.crmOutreachDecide({ id: "O-2", decision: "approve", body2: "New second." });
  assert.deepEqual(order, ["body2", "updated", "approved"], "the decision is the last cell written");
  sheet.getRange = real;

  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-1", decision: "skip" }), /^Error: CHANGED: this draft was already approved/);
  assert.equal(p.ctx.crmOutreachDecide({ id: "O-1", decision: "undo" }).outreach.approved, "");
  assert.equal(p.ctx.crmOutreachDecide({ id: "O-1", decision: "skip" }).outreach.approved, "skip");
});

test("Outreach tab: refuses stale edits, empty emails, rows the agent has moved on, and strangers", () => {
  const p = crm();
  p.add("Outreach", draft({ created: p.ago(0), updated: p.ago(1) }));
  p.add("Outreach", draft({ id: "O-2", status: "Active", step: "1" }));
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-1", decision: "save", updated: "2020-01-01T00:00:00", body1: "x" }), /^Error: CHANGED/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-1", decision: "approve", body1: "   " }), /can't be empty/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-1", decision: "approve", subject: "" }), /subject can't be empty/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-1", decision: "send" }), /Bad request/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-2", decision: "approve" }), /no longer a draft \(now Active\)/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-2", decision: "undo" }), /no longer a draft/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-404", decision: "approve" }), /Not found/);
  assert.equal(p.row("Outreach", "O-1").approved, "", "nothing written by the refused calls");

  p.env.activeUser = "someone@else.example";
  assert.throws(() => p.ctx.crmOutreachLoad(), /Not authorized/);
  assert.throws(() => p.ctx.crmOutreachDecide({ id: "O-1", decision: "approve" }), /Not authorized/);
  assert.throws(() => p.ctx.crmOutreachApproveAll(["O-1"]), /Not authorized/);
  assert.throws(() => p.ctx.crmActionDecide({ id: "X-1", decision: "approve" }), /Not authorized/);
});

test("Outreach tab: approve all approves only the drafts still waiting", () => {
  const p = crm();
  p.add("Outreach", draft({ id: "O-1" }));
  p.add("Outreach", draft({ id: "O-2" }));
  p.add("Outreach", draft({ id: "O-3", approved: "skip" }));
  p.add("Outreach", draft({ id: "O-4", status: "Excluded" }));
  const r = p.ctx.crmOutreachApproveAll(["O-1", "O-2", "O-3", "O-4", "O-404"]);
  assert.deepEqual([...r.outreach.map((o) => o.id)], ["O-1", "O-2"]);
  assert.equal(r.skipped, 3);
  assert.equal(p.row("Outreach", "O-3").approved, "skip", "an earlier skip stands");
  assert.throws(() => p.ctx.crmOutreachApproveAll("O-1"), /Bad request/);
});

test("Outreach tab: drafted replies and call bookings can be edited, sent or skipped", () => {
  const p = crm();
  p.add("Actions", { id: "X-1", kind: "reply", status: "Draft", company: "Grand River Dental", to: "maya@grandriverdental.example", subject: "Re: Insurance", body: "Hi Maya,\n\nHere are three times.", created: p.ago(0), updated: p.ago(0) });
  p.add("Actions", { id: "X-2", kind: "call", status: "Done", company: "Conestoga Plumbing", body: "Booked." });
  const r = p.ctx.crmActionDecide({ id: "X-1", decision: "approve", body: "Hi Maya,\n\nThursday at 2 works." });
  assert.equal(r.action.approved, "yes");
  assert.equal(p.row("Actions", "X-1").body, "Hi Maya,\n\nThursday at 2 works.");
  assert.throws(() => p.ctx.crmActionDecide({ id: "X-2", decision: "skip" }), /no longer a draft \(now Done\)/);
  assert.throws(() => p.ctx.crmActionDecide({ id: "X-1", decision: "approve", body: "" }), /already approved/);
});

test("cold-outreach prospects stay out of the morning summary; the agent sends its own", () => {
  const p = crm();
  p.env.forced.dow = "3";
  p.ctx.crmSaveDeal({ company_name: "Cold Prospect Co", source: "Cold outreach" });
  p.ctx.sendMorningSummary();
  assert.equal(p.env.mails.length, 0, "a day with only new prospects sends nothing");
  p.ctx.crmSaveDeal({ company_name: "Website Lead Ltd", source: "Website" });
  p.ctx.sendMorningSummary();
  assert.equal(p.env.mails.length, 1);
  assert.match(p.env.mails[0].subject, /1 thing today/);
  assert.ok(p.env.mails[0].htmlBody.includes("Website Lead Ltd"));
  assert.ok(!p.env.mails[0].htmlBody.includes("Cold Prospect Co"));
});
