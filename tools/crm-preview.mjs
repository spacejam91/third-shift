// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Local preview of the CRM screen with fictional demo data.
//
//   node tools/crm-preview.mjs [port]      then open http://127.0.0.1:8915
//
// Runs the real Crm.gs (and the intake's lead-to-deal code) inside the same Apps Script stand-in
// the tests use, and serves backend/crm/Index.html with a small shim in place of google.script.run,
// so every click goes through the real server-side validation. Nothing here touches Google.
// Data lives in memory and resets when the process restarts.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadProject, MockSpreadsheet, backendDir } from "../tests/gas-mock.mjs";

const PORT = Number(process.argv[2]) || 8915;
const USER = "demo@thirdshift.ca";
const CALLABLE = new Set([
  "crmLoad", "crmSaveDeal", "crmMoveDeal", "crmAddActivity", "crmSetTaskDone", "crmSaveContact", "crmSaveCompany",
  // The Outreach tab. With no sales tabs in the demo sheet it says the agent isn't set up yet; for a demo with
  // agent data, run `npm run crm` in third-shift-outreach.
  "crmOutreachLoad", "crmOutreachDecide", "crmOutreachApproveAll", "crmActionDecide",
]);

const ss = new MockSpreadsheet("DEMO-SHEET");
const crm = loadProject(["crm/Schema.gs", "crm/Crm.gs"], { ss, activeUser: USER, effectiveUser: USER });
crm.env.props.CRM_SHEET_ID = ss.id;
crm.ctx.setupCrm();
seed();

function seed() {
  const c = crm.ctx;
  // Both projects share the sheet; reads should hand back the CRM sandbox's own Date type.
  const DateCtor = ss.DateCtor;
  const intake = loadProject(["intake/Schema.gs", "intake/Code.gs"], { ss });
  ss.DateCtor = DateCtor;
  const today = c.crmToday_();
  const day = (n) => new Date(Date.parse(today + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

  // Website inquiries, the way the intake project files them.
  const leads = [
    { name: "Priya Raman", email: "priya@grandriverphysio.example", company: "Grand River Physio", phone: "519-555-0142", message: "We spend every Monday re-keying intake forms into our booking system. Can this be automated? We're three clinics." },
    { name: "Marc Dubois", email: "marc@duboisbuild.example", company: "Dubois Build Co.", phone: "", message: "Quotes go out by email and nobody follows up. Looking for something that chases them for us." },
  ];
  for (const lead of leads) intake.ctx.crmCreateFromLead_(ss, Object.assign({ source: "thirdshift.ca" }, lead));

  const deal = (o) => c.crmSaveDeal(o).deal;
  const d1 = deal({ company_name: "Birchwood Dental", company_city: "Guelph", company_website: "birchwooddental.example", contact_name: "Dr. Helen Kim", contact_title: "Owner", contact_email: "helen@birchwood.example", contact_phone: "519-555-0188", value: "6800", source: "Referral", stage: "Plan sent", next_step: "Check they read the plan", next_date: day(-2) });
  const d2 = deal({ company_name: "Lakeside Logistics", company_city: "Hamilton", contact_name: "Tom Becker", contact_title: "Operations manager", contact_email: "tom@lakeside.example", value: "14500", source: "Networking event", stage: "Call booked", next_step: "20-minute call", next_date: day(1) });
  const d3 = deal({ company_name: "Maple & Main Bakery", company_city: "London", contact_name: "Sofia Alvarez", contact_title: "Co-owner", contact_email: "sofia@maplemain.example", value: "3200", source: "Website", stage: "Contacted", next_step: "Send two time slots", next_date: day(0) });
  const d4 = deal({ company_name: "Northfield Accounting", company_city: "Guelph", contact_name: "Raj Patel", contact_title: "Partner", contact_email: "raj@northfield.example", value: "22000", source: "Referral", stage: "Building", next_step: "Week 2 check-in", next_date: day(4) });
  const d5 = deal({ company_name: "Huron Home Care", company_city: "London", contact_name: "Ellen Morris", contact_email: "ellen@huronhc.example", value: "9800", source: "Cold outreach", stage: "Live", next_step: "Monthly review", next_date: day(18) });
  const d6 = deal({ company_name: "Riverbend Auto", company_city: "Hamilton", contact_name: "Dan Kowalski", contact_email: "dan@riverbend.example", value: "4100", source: "Networking event", stage: "Lost" });
  c.crmSaveDeal({ id: d6.id, lost_reason: "Went with their accountant's software add-on" });
  const d7 = deal({ company_name: "Conestoga Print Shop", company_city: "Guelph", contact_name: "Amy Chen", contact_email: "amy@conestogaprint.example", value: "5600", source: "Existing client", stage: "Contacted", next_step: "Send case study", next_date: day(-1) });

  const log = (d, type, summary, due) => c.crmAddActivity({ deal_id: d.id, type, summary, due: due || "" });
  log(d1, "Call", "Walked through their claims paperwork. About 6 hours a week between two front-desk staff.");
  log(d1, "Email", "Sent the one-page plan: claims follow-up automation, fixed price, three weeks.");
  log(d2, "Meeting", "Met at the Communitech mixer. They reconcile carrier invoices by hand every Friday.");
  log(d2, "Task", "Pull two freight-invoice examples before the call", day(0));
  log(d3, "Note", "Wholesale orders come in by email and get typed into a spreadsheet each morning.");
  log(d4, "Task", "Confirm read-only access to their accounting system", day(-1));
  log(d4, "Note", "Build started. Bank-feed matching first, then supplier statements.");
  log(d5, "Note", "Live since last month. Scheduling follow-ups run nightly with no misses.");
  log(d7, "Task", "Send the before-and-after timing sheet", day(3));

  // Spread the creation times out so "2 days ago" and friends have something to show.
  const deals = crm.ctx.crmSheet_(ss, "Deals");
  const rows = crm.ctx.crmRows_(deals);
  const ages = [0.1, 1.4, 12, 9, 6, 35, 60, 20, 4];
  rows.forEach((r, i) => {
    const t = new DateCtor(Date.now() - (ages[i % ages.length] * 864e5));
    crm.ctx.crmUpdateRow_(deals, r._row, { created: t });
  });
}

const SHIM = `(() => {
  // Stand-in for google.script.run: same chaining, calls go to the local preview server.
  function runner(ok, fail) {
    return new Proxy({}, {
      get(_, name) {
        if (name === "withSuccessHandler") return (fn) => runner(fn, fail);
        if (name === "withFailureHandler") return (fn) => runner(ok, fn);
        if (name === "withUserObject") return () => runner(ok, fail);
        return (...args) => {
          fetch("/__preview/api/" + encodeURIComponent(name), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args) })
            .then((r) => r.json())
            .then((b) => setTimeout(() => (b.ok ? ok && ok(b.result) : fail && fail(new Error(b.message))), 120 + Math.random() * 220))
            .catch((e) => fail && fail(e));
        };
      },
    });
  }
  window.google = { script: { run: runner(null, null) } };
})();`;

function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = fs.readFileSync(path.join(backendDir, "crm", "Index.html"), "utf8")
      .replace("<head>", '<head>\n<script src="/__preview/shim.js"></script>');
    return send(res, 200, "text/html; charset=utf-8", html);
  }
  if (req.method === "GET" && url.pathname === "/__preview/shim.js") return send(res, 200, "text/javascript", SHIM);
  if (req.method === "POST" && url.pathname.startsWith("/__preview/api/")) {
    const name = decodeURIComponent(url.pathname.slice("/__preview/api/".length));
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try {
        if (!CALLABLE.has(name)) throw new Error("Unknown call " + name);
        const args = JSON.parse(body || "[]");
        const result = crm.ctx[name](...(Array.isArray(args) ? args : []));
        send(res, 200, "application/json", JSON.stringify({ ok: true, result }));
      } catch (err) {
        send(res, 200, "application/json", JSON.stringify({ ok: false, message: err && err.message ? err.message : String(err) }));
      }
    });
    return;
  }
  send(res, 404, "text/plain", "Not found");
}).listen(PORT, "127.0.0.1", () => console.log(`CRM preview with demo data: http://127.0.0.1:${PORT}`));
