// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Site logic that runs without a browser: the calculator math and the shift-log clock.

import { test } from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { estimate, summarize, formatMoney, formatWeeks } from "../site/assets/estimate.js";
import { _internal } from "../site/assets/log.js";

const html = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
const decode = (s) => s.replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

test("calculator defaults match the numbers printed in the HTML", () => {
  const r = estimate({ hoursPerWeek: 12, hourlyCost: 40, fit: "mostly" });
  assert.equal(Math.round(r.hoursBack * 10) / 10, 345.6);
  assert.equal(formatMoney(r.dollars), "$13,824");
  assert.equal(formatWeeks(r.weeks), "9.2");
  assert.equal(r.level, "strong");
  assert.equal(Math.round(r.hoursBack / 8), 43, "nights-back count");
  const html = fs.readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  assert.ok(html.includes('id="r-nights">43<'), "the HTML prints the same nights count");
});

test("calculator levels and guards", () => {
  assert.equal(estimate({ hoursPerWeek: 4, hourlyCost: 40, fit: "mostly" }).level, "worth");
  assert.equal(estimate({ hoursPerWeek: 2, hourlyCost: 40, fit: "judgment" }).level, "not");
  assert.equal(estimate({ hoursPerWeek: 10, hourlyCost: 40, fit: "bogus" }).share, 0.6);
  assert.equal(estimate({ hoursPerWeek: "abc", hourlyCost: -5, fit: "same" }).dollars, 0);
  assert.equal(estimate({ hoursPerWeek: 1e9, hourlyCost: 40, fit: "same" }).hoursBack, 168 * 0.8 * 48);
});

test("calculator summary for the contact form", () => {
  const input = { hoursPerWeek: 30, hourlyCost: 40, fit: "same" };
  assert.equal(
    summarize(input, estimate(input)),
    "From the calculator: about 30 hours a week at $40 an hour, the same steps every time. Estimate: 1,152 hours and $46,080 a year back.",
  );
});

test("shift clock runs 11 PM to 7 AM", () => {
  const { clockText, minutesFromText } = _internal;
  assert.equal(clockText(0), "11:00 PM");
  assert.equal(clockText(62), "12:02 AM");
  assert.equal(clockText(475), "6:55 AM");
  assert.equal(minutesFromText("1:15 AM"), 135);
  assert.equal(minutesFromText("11:02 PM"), 2);
  assert.equal(clockText(minutesFromText("3:30 AM")), "3:30 AM");
  assert.equal(minutesFromText("garbage"), 0);
});

test("search markup: title and description fit, structured data parses", () => {
  const title = decode(html.match(/<title>([^<]*)<\/title>/)[1]);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.ok(title.length <= 65, `title is ${title.length} characters`);
  assert.ok(desc.length >= 110 && desc.length <= 160, `description is ${desc.length} characters`);
  assert.match(html, /<link rel="canonical" href="https:\/\/thirdshift\.ca\/">/);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const types = ld["@graph"].map((n) => n["@type"]);
  assert.deepEqual(types.sort(), ["FAQPage", "ProfessionalService", "WebSite"]);
});

test("the FAQ in the structured data says exactly what the page says", () => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const faq = ld["@graph"].find((n) => n["@type"] === "FAQPage").mainEntity;
  const onPage = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [decode(m[1]), decode(m[2])]);
  const norm = (s) => s.replace(/[\u2018\u2019]/g, "'");
  assert.equal(faq.length, onPage.length);
  faq.forEach((q, i) => {
    assert.equal(norm(q.name), norm(onPage[i][0]));
    assert.equal(norm(q.acceptedAnswer.text), norm(onPage[i][1]), q.name);
  });
});

test("every page in the sitemap exists", () => {
  const xml = fs.readFileSync(new URL("../site/sitemap.xml", import.meta.url), "utf8");
  for (const [, loc] of xml.matchAll(/<loc>https:\/\/thirdshift\.ca\/([^<]*)<\/loc>/g)) {
    const file = loc === "" ? "index.html" : loc + ".html";
    assert.ok(fs.existsSync(new URL("../site/" + file, import.meta.url)), file);
  }
});
