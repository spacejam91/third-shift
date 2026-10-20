// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The "Tonight's shift" panel. The rows in the HTML are the opening of the night; every job that
// finishes on the hero canvas adds the next one, on a simulated clock that runs from 11 PM to 7 AM
// and then starts a new shift. Text is built with textContent only.

const SHIFT_START = 23 * 60;          // 11:00 PM, in minutes after midnight
const SHIFT_LENGTH = 8 * 60;          // to 7:00 AM
const SUMMARY_AT = SHIFT_LENGTH - 5;  // 6:55 AM
const MAX_ROWS = 12;
const ROW_GAP_MS = 650;
// Fast-forward: a whole night in about six seconds, quick at first and quicker toward dawn.
const FF_GAP_START = 230, FF_GAP_END = 85;

const r = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const money = () => (r(40, 2400) + r(0, 99) / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const vendors = ["a packaging supplier", "the freight carrier", "a new parts vendor", "the cleaning contractor"];

// [kind, text]. The kind matches a phrase in the hero's opening line (ap, leads, quotes, reports).
const JOBS = [
  ["ap", () => `Picked up ${r(4, 31)} supplier invoices from the AP inbox`],
  ["ap", () => `Matched invoice ${r(10400, 98900)} to PO ${r(4100, 4999)} and posted it`],
  ["ap", () => `Matched ${r(12, 48)} invoices to purchase orders, queued for payment`],
  ["quotes", () => `Sent a follow-up on quote Q-${r(1200, 1899)}, ${r(5, 14)} days old`],
  ["leads", () => `Logged a website inquiry in the CRM, reply sent`],
  ["", () => { const n = r(18, 64), left = r(0, 2); return left ? `Matched ${n} bank lines, ${left} left for review` : `Matched all ${n} bank lines`; }],
  ["", () => `Pulled ${r(8, 30)} timesheets into payroll`],
  ["", () => `Reconciled ${r(20, 90)} card transactions to receipts`],
  ["reports", () => `Updated ${pick(days)}’s cash position report`],
  ["", () => `Chased ${r(2, 9)} overdue customer invoices, statements attached`],
  ["", () => `Synced ${r(10, 60)} online orders to the ledger`],
  ["ap", () => `Filed ${r(4, 20)} receipts from the expenses inbox`],
  ["leads", () => `Booked ${r(2, 6)} discovery calls from last week’s inquiries`],
  ["reports", () => `Built the weekly sales report, ready for 7 AM`],
  ["quotes", () => `Chased ${r(2, 7)} open quotes, ${r(1, 2)} accepted overnight`],
];
const HELD = [
  () => `Invoice ${r(10400, 98900)} held for review: $${money()} over the PO`,
  () => `Bank details changed for ${pick(vendors)}: held for a call-back`,
  () => `Duplicate invoice from ${pick(vendors)} held, not posted`,
];

function clockText(minutesIntoShift) {
  const t = (SHIFT_START + minutesIntoShift) % 1440;
  const h24 = Math.floor(t / 60), m = t % 60;
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

function minutesFromText(text) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(text).trim());
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return ((h * 60 + Number(m[2])) - SHIFT_START + 1440) % 1440;
}

export function initLog({ list, doneEl, heldEl, onKind = () => {} }) {
  const seeded = list.querySelectorAll("li");
  let minutes = seeded.length ? minutesFromText(seeded[seeded.length - 1].querySelector("time").textContent) : 0;
  let done = Number(doneEl.textContent) || seeded.length;
  let held = Number(heldEl.textContent) || 0;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const queue = [];
  let busy = false;
  let racing = false;

  function row(time, text, cls) {
    const li = document.createElement("li");
    li.className = "live" + (cls ? " " + cls : "");
    if (time) {
      const t = document.createElement("time");
      t.textContent = time;
      li.append(t);
    }
    const s = document.createElement("span");
    s.textContent = text;
    li.append(s);
    list.append(li);
    while (list.children.length > MAX_ROWS) list.firstElementChild.remove();
    list.classList.toggle("is-full", list.scrollHeight > list.clientHeight + 1);
    list.scrollTo({ top: list.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  function counters() {
    doneEl.textContent = String(done);
    heldEl.textContent = String(held);
  }

  function endShift() {
    row(clockText(SUMMARY_AT), "Morning summary sent to three inboxes");
    row(null, "Shift complete. Next one starts 11 PM", "divider");
    minutes = r(1, 4);
    done = 0;
    held = 0;
  }

  // Writes one job at the current clock; returns its kind ("" for general jobs) and whether it was held.
  function job() {
    const isHeld = Math.random() < 0.16;
    const [kind, text] = isHeld ? ["", pick(HELD)] : pick(JOBS);
    row(clockText(minutes), text(), isHeld ? "flag" : "");
    done++;
    if (isHeld) held++;
    counters();
    return { kind, isHeld };
  }

  function next() {
    minutes += r(3, 9);
    if (minutes >= SUMMARY_AT) endShift();
    const { kind } = job();
    if (kind) onKind(kind);
  }

  function pump() {
    if (racing || busy || !queue.length) return;
    busy = true;
    queue.shift();
    next();
    setTimeout(() => { busy = false; pump(); }, ROW_GAP_MS);
  }

  return {
    push() {
      if (racing || queue.length >= 3) return;
      queue.push(1);
      pump();
    },

    // Runs a whole night from 11 PM to the morning summary, fast. onRow(kind, progress 0..1, clock)
    // fires for every job. Resolves with the night's tally; the live log carries on afterwards.
    fastForward({ onRow = () => {} } = {}) {
      if (racing) return Promise.resolve(null);
      racing = true;
      queue.length = 0;
      row(null, "Fast-forward: a whole night", "divider");
      minutes = 0;
      done = 0;
      held = 0;
      counters();
      const tally = { done: 0, held: 0 };
      const step = () => {
        minutes += r(8, 15);
        const { kind, isHeld } = job();
        tally.done++;
        if (isHeld) tally.held++;
        onRow(kind, Math.min(1, minutes / SUMMARY_AT), clockText(minutes));
      };
      const finish = () => {
        // done and held reset for the next night, but the footer keeps showing this one's totals
        endShift();
        racing = false;
        return tally;
      };
      if (!smooth) {
        while (minutes < SUMMARY_AT - 15) step();
        return Promise.resolve(finish());
      }
      return new Promise((resolve) => {
        const tick = () => {
          step();
          if (minutes >= SUMMARY_AT - 15) { resolve(finish()); return; }
          const p = minutes / SUMMARY_AT;
          setTimeout(tick, FF_GAP_START + (FF_GAP_END - FF_GAP_START) * p);
        };
        tick();
      });
    },
  };
}

// Exposed for tests.
export const _internal = { clockText, minutesFromText };
