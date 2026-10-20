// Savings estimate behind the calculator. Pure functions, no DOM, so tests can import them.

export const WEEKS_PER_YEAR = 48;
export const HOURS_PER_WORK_WEEK = 37.5;

// Share of the hours that come back, by how rule-based the work is.
export const FIT_SHARE = Object.freeze({ same: 0.8, mostly: 0.6, judgment: 0.3 });

const FIT_WORDS = Object.freeze({ same: "the same steps every time", mostly: "mostly the same steps", judgment: "a lot of judgment calls" });

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function estimate({ hoursPerWeek, hourlyCost, fit }) {
  const share = FIT_SHARE[fit] ?? FIT_SHARE.mostly;
  const hours = clamp(num(hoursPerWeek), 0, 168);
  const rate = clamp(num(hourlyCost), 0, 10000);
  const hoursBack = hours * share * WEEKS_PER_YEAR;
  return {
    share,
    hoursBack,
    dollars: hoursBack * rate,
    weeks: hoursBack / HOURS_PER_WORK_WEEK,
    level: hoursBack >= 200 ? "strong" : hoursBack >= 80 ? "worth" : "not",
  };
}

export function formatMoney(n) {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

export function formatHours(n) {
  return Math.round(n).toLocaleString("en-CA");
}

export function formatWeeks(n) {
  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString("en-CA");
}

// One line for the contact form, so the call starts from the visitor's own numbers.
export function summarize(input, result) {
  const fitWords = FIT_WORDS[input.fit] ?? FIT_WORDS.mostly;
  return `From the calculator: about ${num(input.hoursPerWeek)} hours a week at ${formatMoney(num(input.hourlyCost))} an hour, ${fitWords}. ` +
    `Estimate: ${formatHours(result.hoursBack)} hours and ${formatMoney(result.dollars)} a year back.`;
}
