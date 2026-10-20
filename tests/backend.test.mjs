// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Backend tests: the public intake project and the private CRM project, run against gas-mock.mjs.
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadProject, backendDir, MockSpreadsheet } from "./gas-mock.mjs";

const INTAKE = ["intake/Schema.gs", "intake/Code.gs"];
const CRM = ["crm/Schema.gs", "crm/Crm.gs"];

const lead = (over = {}) => ({
  name: "Jane Doe", email: "jane@acme.example", company: "Acme Distribution", phone: "+1 519 555 0100",
  message: "=HYPERLINK(\"x\")\nWe key 200 invoices a month.", elapsed_ms: 45000, ...over,
});
const post = (ctx, data) => JSON.parse(ctx.doPost({ postData: { contents: typeof data === "string" ? data : JSON.stringify(data) } }).getContent());
const tab = (ss, name) => (ss.getSheetByName(name) ? ss.getSheetByName(name).records() : []);

// ------------------------------------------------------------------ intake

test("a lead lands on the Leads tab and is filed as company, contact, deal and inquiry", () => {
  const { ctx, env, ss } = loadProject(INTAKE);
  assert.deepEqual(post(ctx, lead()), { ok: true });

  const [row] = tab(ss, "Leads");
  assert.equal(row.phone, "+1 519 555 0100", "phone stored as text, not #ERROR!");
  assert.ok(row.message.startsWith("=HYPERLINK"), "formula-looking message stored as text");
  assert.ok(row.message.includes("\n"), "message keeps its line breaks");
  assert.equal(row.status, "New");

  const [company] = tab(ss, "Companies");
  const [contact] = tab(ss, "Contacts");
  const [deal] = tab(ss, "Deals");
  const [act] = tab(ss, "Activities");
  assert.equal(company.name, "Acme Distribution");
  assert.equal(contact.company_id, company.id);
  assert.equal(deal.contact_id, contact.id);
  assert.equal(deal.stage, "New");
  assert.equal(row.deal_id, deal.id);
  assert.equal(act.type, "Inquiry");
  assert.equal(act.deal_id, deal.id);
  const nextDow = new Date(deal.next_date).getUTCDay();
  assert.ok(nextDow >= 1 && nextDow <= 5, "follow-up lands on a weekday");

  assert.equal(env.mails.length, 2);
  assert.equal(env.mails[0].replyTo, "jane@acme.example");
  assert.ok(env.mails[1].body.startsWith("Hi Jane,"));
});

test("a repeat inquiry joins the open deal instead of making a duplicate", () => {
  const { ctx, env, ss } = loadProject(INTAKE);
  post(ctx, lead());
  post(ctx, lead({ message: "Following up." }));
  assert.equal(tab(ss, "Contacts").length, 1);
  assert.equal(tab(ss, "Deals").length, 1);
  assert.equal(tab(ss, "Activities").length, 2);
  assert.equal(tab(ss, "Leads").length, 2);
  assert.equal(env.mails.length, 3, "second auto-reply suppressed");

  post(ctx, lead({ email: "sam@acme.example", name: "Sam Lee", company: "ACME distribution " }));
  assert.equal(tab(ss, "Companies").length, 1, "company matched by name, case and spacing ignored");
  assert.equal(tab(ss, "Deals").length, 2);
});

test("campaign tags and the referring site are kept, and set the deal's source", () => {
  const cases = [
    [{ utm_source: "instagram", utm_medium: "social", utm_campaign: "launch-reel" }, "Instagram"],
    [{ utm_source: "outreach", utm_medium: "email", utm_campaign: "seq-ap-1" }, "Outreach"],
    [{ utm_source: "Newsletter" }, "Newsletter"],
    [{ referrer: "l.instagram.com" }, "Instagram"],
    [{ referrer: "www.google.ca" }, "Google"],
    [{ referrer: "t.co" }, "X"],
    [{ referrer: "example.org" }, "Website"],
    [{}, "Website"],
  ];
  for (const [tags, source] of cases) {
    const { ctx, ss } = loadProject(INTAKE);
    assert.deepEqual(post(ctx, lead(tags)), { ok: true });
    const [row] = tab(ss, "Leads");
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "referrer"]) assert.equal(row[k], tags[k] || "", k);
    assert.equal(tab(ss, "Deals")[0].source, source, JSON.stringify(tags));
  }
});

test("an inquiry from someone the sales bot already emailed joins their deal and keeps it Outreach", () => {
  const { ctx, ss } = loadProject(INTAKE);
  const now = new Date();
  ctx.crmAppend_(ctx.crmSheet_(ss, "Companies"), { id: "CO-1", name: "Acme Distribution", created: now, updated: now });
  ctx.crmAppend_(ctx.crmSheet_(ss, "Contacts"), { id: "P-1", name: "Jane Doe", email: "Jane@Acme.example", company_id: "CO-1", created: now, updated: now });
  ctx.crmAppend_(ctx.crmSheet_(ss, "Deals"), {
    id: "D-1", title: "Acme Distribution", company_id: "CO-1", contact_id: "P-1", stage: "Contacted",
    source: "Outreach", next_step: "Follow-up email 2", next_date: "2026-11-30", created: now, updated: now,
  });
  assert.deepEqual(post(ctx, lead({ utm_source: "outreach", utm_campaign: "seq-ap-1" })), { ok: true });
  const deals = tab(ss, "Deals");
  assert.equal(deals.length, 1, "no duplicate deal");
  assert.equal(deals[0].source, "Outreach");
  assert.equal(deals[0].next_step, "Reply to the inquiry", "the inquiry becomes the next step");
  const acts = tab(ss, "Activities");
  assert.equal(acts.length, 1);
  assert.equal(acts[0].type, "Inquiry", "the sales bot stops its sequence when it sees this");
  assert.equal(acts[0].deal_id, "D-1");
  assert.equal(tab(ss, "Contacts").length, 1);
});

test("bots get a quiet ok and nothing is stored", () => {
  const { ctx, env, ss } = loadProject(INTAKE);
  assert.deepEqual(post(ctx, lead({ website: "spam" })), { ok: true });
  assert.deepEqual(post(ctx, lead({ elapsed_ms: 400 })), { ok: true });
  assert.equal(tab(ss, "Leads").length, 0);
  assert.equal(env.mails.length, 0);
  const { elapsed_ms, ...old } = lead();
  assert.deepEqual(post(ctx, old), { ok: true }, "older clients without elapsed_ms still get through");
  assert.equal(tab(ss, "Leads").length, 1);
});

test("bad requests are refused without detail", () => {
  const { ctx } = loadProject(INTAKE);
  assert.deepEqual(post(ctx, lead({ company: "  " })), { ok: false, error: "missing_fields" });
  assert.deepEqual(post(ctx, lead({ email: "nope" })), { ok: false, error: "bad_email" });
  assert.deepEqual(post(ctx, "{bad json"), { ok: false, error: "bad_request" });
  assert.deepEqual(post(ctx, "[1,2]"), { ok: false, error: "bad_request" });
  assert.deepEqual(post(ctx, JSON.stringify(lead({ message: "x".repeat(25000) }))), { ok: false, error: "bad_request" });
  assert.deepEqual(JSON.parse(ctx.doPost({}).getContent()), { ok: false, error: "bad_request" });
  assert.deepEqual(JSON.parse(ctx.doGet().getContent()), { ok: true, service: "thirdshift-intake" });
});

test("invisible and direction-flipping characters are stripped", () => {
  const { ctx, ss } = loadProject(INTAKE);
  post(ctx, lead({ name: "Jane‮ Doe​", company: "Acme\u0000 Co" }));
  const [row] = tab(ss, "Leads");
  assert.equal(row.name, "Jane Doe");
  assert.equal(row.company, "Acme  Co", "control character becomes a space");
});

test("auto-reply greeting only ever uses a plain first name", () => {
  const { ctx, env } = loadProject(INTAKE);
  post(ctx, lead({ email: "a@x.example", name: "http://evil.example buy now" }));
  assert.ok(env.mails.at(-1).body.startsWith("Hi there,"));
  post(ctx, lead({ email: "b@x.example", name: "Zoë-Anne O'Neil" }));
  assert.ok(env.mails.at(-1).body.startsWith("Hi Zoë-Anne,"));
});

test("Turnstile: enforced once the secret is set, hostname checked, outage tolerated", () => {
  const { ctx, env, ss } = loadProject(INTAKE);
  env.props.TURNSTILE_SECRET = "secret";
  assert.deepEqual(post(ctx, lead()), { ok: false, error: "bot_check" }, "no token");

  env.fetchImpl = () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ success: true, hostname: "thirdshift.ca" }) });
  assert.deepEqual(post(ctx, lead({ cf_token: "t1" })), { ok: true });
  assert.equal(env.fetches.at(-1).o.payload.secret, "secret");

  env.fetchImpl = () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ success: true, hostname: "evil.example" }) });
  assert.deepEqual(post(ctx, lead({ cf_token: "t2", email: "b@x.example" })), { ok: false, error: "bot_check" }, "token from another site");

  env.fetchImpl = () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ success: false }) });
  assert.deepEqual(post(ctx, lead({ cf_token: "t3", email: "c@x.example" })), { ok: false, error: "bot_check" });

  env.fetchImpl = () => { throw new Error("DNS"); };
  assert.deepEqual(post(ctx, lead({ cf_token: "t4", email: "d@x.example" })), { ok: true });
  assert.equal(tab(ss, "Leads").at(-1).status, "New (bot check unavailable)");

  env.props.ALLOWED_HOSTS = "thirdshift.pages.dev";
  env.fetchImpl = () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ success: true, hostname: "thirdshift.pages.dev" }) });
  assert.deepEqual(post(ctx, lead({ cf_token: "t5", email: "e@x.example" })), { ok: true });
});

test("burst and daily caps stop floods; the mail cap still files leads", () => {
  const { ctx, env, ss } = loadProject(INTAKE);
  for (let i = 0; i < 10; i++) assert.deepEqual(post(ctx, lead({ email: `u${i}@x.example` })), { ok: true });
  assert.deepEqual(post(ctx, lead({ email: "u10@x.example" })), { ok: false, error: "busy" });
  assert.equal(tab(ss, "Leads").length, 10);

  const day = loadProject(INTAKE);
  day.env.props.leadDay = day.ctx.crmToday_();
  day.env.props.leadCount = "100";
  assert.deepEqual(post(day.ctx, lead()), { ok: false, error: "busy" });

  const mail = loadProject(INTAKE);
  mail.env.props.mailDay = mail.ctx.crmToday_();
  mail.env.props.mailUsed = "40";
  assert.deepEqual(post(mail.ctx, lead()), { ok: true });
  assert.equal(mail.env.mails.length, 0);
  assert.equal(tab(mail.ss, "Leads").length, 1);
  assert.equal(env.mails.length, 20, "10 leads, 2 mails each");
});

test("a mail outage or a CRM filing error never loses the lead", () => {
  const a = loadProject(INTAKE);
  a.env.mailFails = true;
  assert.deepEqual(post(a.ctx, lead()), { ok: true });
  assert.equal(tab(a.ss, "Leads").length, 1);

  const b = loadProject(INTAKE);
  b.ctx.crmCreateFromLead_ = () => { throw new Error("boom"); };
  assert.deepEqual(post(b.ctx, lead()), { ok: true });
  assert.equal(tab(b.ss, "Leads")[0].status, "Needs CRM entry");
});

test("the new-lead email links the CRM only when CRM_URL is a Google script URL", () => {
  const a = loadProject(INTAKE);
  a.env.props.CRM_URL = "https://script.google.com/macros/s/X/exec";
  post(a.ctx, lead());
  assert.ok(a.env.mails[0].htmlBody.includes("Open the CRM"));
  const b = loadProject(INTAKE);
  b.env.props.CRM_URL = "javascript:alert(1)";
  post(b.ctx, lead());
  assert.ok(!b.env.mails[0].htmlBody.includes("Open the CRM"));
  assert.ok(!b.env.mails[0].htmlBody.includes("<script"), "message HTML-escaped");
});

test("selfTest is runnable from the editor", () => {
  const { ctx } = loadProject(INTAKE);
  assert.equal(typeof ctx.selfTest, "function");
  ctx.selfTest();
});

// ------------------------------------------------------------------ CRM

function crm(opts = {}) {
  const ss = opts.ss || new MockSpreadsheet("CRMSHEET");
  const p = loadProject(CRM, { ss, ...opts });
  p.env.props.CRM_SHEET_ID = "CRMSHEET";
  if (opts.setup !== false) p.ctx.setupCrm();
  return p;
}

test("the CRM shares the intake's schema file byte for byte", () => {
  const a = fs.readFileSync(path.join(backendDir, "intake/Schema.gs"), "utf8");
  const b = fs.readFileSync(path.join(backendDir, "crm/Schema.gs"), "utf8");
  assert.equal(a, b);
});

// The sales bot (third-shift-outreach, next to this repo) writes to the same sheet with its own copy
// of the schema. Only checked where that repo is checked out, so CI here doesn't depend on it.
const outreachSchema = path.join(backendDir, "..", "..", "third-shift-outreach", "src", "Schema.js");
test("the sales bot's copy of the core tabs matches the CRM's", { skip: !fs.existsSync(outreachSchema) && "third-shift-outreach not checked out" }, () => {
  const block = (src) => (src.replace(/\r\n/g, "\n").match(/const CRM_SHEETS = Object\.freeze\(\{[\s\S]*?\}\);/) || [""])[0];
  const ours = block(fs.readFileSync(path.join(backendDir, "crm/Schema.gs"), "utf8"));
  assert.ok(ours, "CRM_SHEETS found in crm/Schema.gs");
  assert.equal(block(fs.readFileSync(outreachSchema, "utf8")), ours, "update third-shift-outreach/src/Schema.js from backend/crm/Schema.gs");
});

test("only listed users get in, and setup lists the owner", () => {
  const p = crm({ setup: false });
  assert.throws(() => p.ctx.crmLoad(), /Not authorized/);
  assert.ok(String(p.ctx.doGet().html).includes("private"));
  p.ctx.setupCrm();
  assert.equal(p.env.props.CRM_USERS, "owner@example.com");
  assert.equal(p.ctx.doGet().file, "Index");
  p.env.activeUser = "someone@else.example";
  assert.throws(() => p.ctx.crmLoad(), /Not authorized/);
  assert.throws(() => p.ctx.crmSaveDeal({ company_name: "X" }), /Not authorized/);
  p.env.activeUser = "";
  assert.throws(() => p.ctx.crmLoad(), /Not authorized/);
});

test("setup builds every tab, a stage dropdown and exactly one morning trigger", () => {
  const p = crm();
  p.ctx.setupCrm();
  for (const name of ["Leads", "Companies", "Contacts", "Deals", "Activities"]) assert.ok(p.ss.getSheetByName(name), name);
  assert.deepEqual([...p.ss.getSheetByName("Deals").validation.list], ["New", "Contacted", "Call booked", "Plan sent", "Building", "Live", "Lost"]);
  assert.equal(p.env.triggers.length, 1);
  assert.equal(p.env.triggers[0].fn, "sendMorningSummary");
  assert.equal(p.env.triggers[0].hour, 7);
});

test("intake leads show up in the CRM with plain-string dates", () => {
  const ss = new MockSpreadsheet("CRMSHEET");
  const intake = loadProject(INTAKE, { ss });
  post(intake.ctx, lead());
  const p = crm({ ss });
  const data = p.ctx.crmLoad();
  assert.equal(data.deals.length, 1);
  assert.equal(data.contacts[0].email, "jane@acme.example");
  assert.match(data.deals[0].created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  assert.match(data.deals[0].next_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!("_row" in data.deals[0]));
  assert.deepEqual([...data.stages], ["New", "Contacted", "Call booked", "Plan sent", "Building", "Live", "Lost"]);
});

test("a new deal brings its company and contact, reusing ones that exist", () => {
  const p = crm();
  const r1 = p.ctx.crmSaveDeal({ company_name: "Birch Dental", contact_name: "Dr. Kim", contact_email: "kim@birch.example", value: "$4,500", source: "Referral", next_date: "2026-11-02" });
  assert.equal(r1.deal.value, 4500);
  assert.equal(r1.company.name, "Birch Dental");
  assert.equal(r1.contact.company_id, r1.company.id);
  const r2 = p.ctx.crmSaveDeal({ company_name: "birch dental", contact_email: "KIM@birch.example", title: "Phase 2" });
  assert.equal(r2.deal.company_id, r1.company.id);
  assert.equal(r2.deal.contact_id, r1.contact.id);
  assert.ok(!r2.company && !r2.contact, "nothing new created");
  assert.throws(() => p.ctx.crmSaveDeal({ title: "No company" }), /needs a company/);
});

test("stage moves stamp and clear the close date and log the change", () => {
  const p = crm();
  const { deal } = p.ctx.crmSaveDeal({ company_name: "Cedar Trades" });
  const won = p.ctx.crmMoveDeal(deal.id, "Building", deal.updated);
  assert.equal(won.deal.stage, "Building");
  assert.equal(won.deal.closed, p.ctx.crmToday_());
  assert.equal(won.activity.summary, "New → Building");
  const reopened = p.ctx.crmMoveDeal(deal.id, "Contacted", "");
  assert.equal(reopened.deal.closed, "");
  assert.equal(p.ctx.crmLoad().activities.filter((a) => a.type === "Stage").length, 2);
  assert.throws(() => p.ctx.crmMoveDeal(deal.id, "Pending", ""), /Unknown stage/);
});

test("a save based on stale data is refused instead of overwriting", () => {
  const p = crm();
  const { deal } = p.ctx.crmSaveDeal({ company_name: "Delta Machining" });
  assert.throws(() => p.ctx.crmSaveDeal({ id: deal.id, value: 100, updated: "2001-01-01T00:00:00" }), /CHANGED/);
  const ok = p.ctx.crmSaveDeal({ id: deal.id, value: 100, next_step: "=cmd()", updated: deal.updated });
  assert.equal(ok.deal.value, 100);
  const stored = p.ss.getSheetByName("Deals").records()[0];
  assert.equal(stored.next_step, "=cmd()", "formula-looking text stored as text");
});

test("input validation", () => {
  const p = crm();
  const { deal } = p.ctx.crmSaveDeal({ company_name: "Elm Accounting" });
  assert.throws(() => p.ctx.crmSaveDeal({ id: deal.id, value: "lots" }), /dollar amount/);
  assert.throws(() => p.ctx.crmSaveDeal({ id: deal.id, value: -5 }), /dollar amount/);
  assert.throws(() => p.ctx.crmSaveDeal({ id: deal.id, next_date: "next week" }), /Dates look like/);
  assert.throws(() => p.ctx.crmSaveDeal(null), /Bad request/);
  assert.throws(() => p.ctx.crmSaveDeal({ id: "D-NOPE" }), /Not found/);
  const c = p.ctx.crmLoad().companies[0];
  assert.equal(p.ctx.crmSaveCompany({ id: c.id, website: "elm.example" }).company.website, "https://elm.example");
  assert.throws(() => p.ctx.crmSaveCompany({ id: c.id, website: "not a site" }), /website/);
  assert.throws(() => p.ctx.crmAddActivity({ deal_id: deal.id, type: "Note", summary: "  " }), /Write something/);
});

test("notes, calls and tasks; tasks tick off", () => {
  const p = crm();
  const { deal } = p.ctx.crmSaveDeal({ company_name: "Fir Logistics", contact_name: "Pat", contact_email: "pat@fir.example" });
  const note = p.ctx.crmAddActivity({ deal_id: deal.id, type: "Call", summary: "Talked AP volume.\nAbout 300 a month." });
  assert.equal(note.activity.type, "Call");
  assert.ok(note.activity.summary.includes("\n"));
  const task = p.ctx.crmAddActivity({ deal_id: deal.id, type: "Task", summary: "Send the plan", due: "2026-10-23" });
  assert.equal(task.activity.done, "no");
  assert.equal(task.activity.due, "2026-10-23");
  assert.equal(p.ctx.crmSetTaskDone(task.activity.id, true).activity.done, "yes");
  assert.throws(() => p.ctx.crmSetTaskDone(note.activity.id, true), /isn't a task/);
  const spoof = p.ctx.crmAddActivity({ deal_id: deal.id, type: "Stage", summary: "x" });
  assert.equal(spoof.activity.type, "Note", "system types can't be added by hand");
});

test("contact edits", () => {
  const p = crm();
  const r = p.ctx.crmSaveDeal({ company_name: "Gale Clinic", contact_name: "Lee", contact_email: "lee@gale.example" });
  const saved = p.ctx.crmSaveContact({ id: r.contact.id, phone: "+1 226 555 0199", title: "Office manager", updated: r.contact.updated });
  assert.equal(saved.contact.phone, "+1 226 555 0199");
  assert.throws(() => p.ctx.crmSaveContact({ id: r.contact.id, email: "bad" }), /email/);
});

test("morning summary: sends what's due, escaped; skips clear days and weekends", () => {
  const p = crm();
  p.env.forced.dow = "2";
  p.ctx.sendMorningSummary();
  assert.equal(p.env.mails.length, 0, "nothing due, nothing sent");

  const today = p.ctx.crmToday_();
  p.ctx.crmSaveDeal({ company_name: "<b>Hollow</b> Co", next_date: today });
  const { deal } = p.ctx.crmSaveDeal({ company_name: "Ivy Ltd", stage: "Contacted", next_step: "Call back", next_date: "2026-01-05" });
  p.ctx.crmAddActivity({ deal_id: deal.id, type: "Task", summary: "Send pricing", due: today });
  p.ctx.sendMorningSummary();
  assert.equal(p.env.mails.length, 1);
  const m = p.env.mails[0];
  assert.equal(m.to, "owner@example.com");
  assert.match(m.subject, /3 things today/);
  assert.ok(m.htmlBody.includes("&lt;b&gt;Hollow&lt;/b&gt;"));
  assert.ok(m.htmlBody.includes("overdue since 2026-01-05"));
  assert.ok(m.htmlBody.includes("Send pricing"));

  p.env.forced.dow = "6";
  p.ctx.sendMorningSummary();
  assert.equal(p.env.mails.length, 1, "Saturday: nothing sent");
});

// ------------------------------------------------------------------ CRM screen

test("CRM screen: data only reaches the page as text, and every server call exists", () => {
  const html = fs.readFileSync(path.join(backendDir, "crm", "Index.html"), "utf8");
  const script = html.slice(html.indexOf("<script>"), html.lastIndexOf("</script>"));
  for (const sink of ["innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval(", "new Function"]) {
    assert.ok(!script.includes(sink), `no ${sink} in the CRM screen`);
  }
  assert.ok(!/<script[^>]+src=/i.test(html), "no outside scripts");

  const crm = fs.readFileSync(path.join(backendDir, "crm", "Crm.gs"), "utf8");
  const calls = [...script.matchAll(/api\("(\w+)"/g)].map((m) => m[1]);
  assert.ok(calls.length >= 5);
  // The edit dialogs pass these two by name.
  for (const name of new Set([...calls, "crmSaveContact", "crmSaveCompany"])) {
    assert.ok(crm.includes("\nfunction " + name + "("), `${name} is defined in Crm.gs`);
    assert.ok(!name.endsWith("_"), `${name} is callable from the page`);
  }
});

test("CRM screen: the local preview's demo data loads through the real backend", () => {
  const ss = new MockSpreadsheet("DEMO");
  const p = loadProject(CRM, { ss, activeUser: "demo@thirdshift.ca", effectiveUser: "demo@thirdshift.ca" });
  p.env.props.CRM_SHEET_ID = ss.id;
  p.ctx.setupCrm();
  const r = p.ctx.crmSaveDeal({ company_name: "Example Co", contact_name: "Pat", value: "1,200", source: "Referral" });
  const data = JSON.parse(JSON.stringify(p.ctx.crmLoad()));
  assert.equal(data.deals.length, 1);
  assert.equal(data.deals[0].value, 1200);
  assert.match(data.deals[0].created, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, "timestamps arrive as plain local strings");
  assert.equal(data.deals[0].id, r.deal.id);
});
