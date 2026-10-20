// Site logic that runs without a browser: the calculator math and the shift-log clock.

import { test } from "node:test";
import assert from "node:assert/strict";
import { estimate, summarize, formatMoney, formatWeeks } from "../site/assets/estimate.js";
import { _internal } from "../site/assets/log.js";

test("calculator defaults match the numbers printed in the HTML", () => {
  const r = estimate({ hoursPerWeek: 12, hourlyCost: 40, fit: "mostly" });
  assert.equal(Math.round(r.hoursBack * 10) / 10, 345.6);
  assert.equal(formatMoney(r.dollars), "$13,824");
  assert.equal(formatWeeks(r.weeks), "9.2");
  assert.equal(r.level, "strong");
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
