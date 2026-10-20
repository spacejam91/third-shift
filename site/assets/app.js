// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Entry point. Each feature starts on its own, so one failing never takes the others down.

import { initNight } from "./night.js";
import { initLog } from "./log.js";
import { initEffects } from "./effects.js";
import { initCalculator } from "./calculator.js";
import { initAudit } from "./audit.js";
import { initForm } from "./form.js";
import { book, bookAll, flagCopies } from "./shared.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function safely(name, start) {
  try {
    return start();
  } catch (err) {
    console.error(`[third-shift] ${name} did not start`, err);
    return null;
  }
}

// The log's clock shows Kitchener time; the fast-forward borrows it to show the simulated night.
const clock = safely("clock", () => {
  const el = document.getElementById("clock");
  if (!el) return null;
  // en-US gives "1:03 AM" to match the log rows; en-CA would print "1:03 a.m."
  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
  let held = false;
  const tick = () => { if (!held) el.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30000);
  return {
    hold(text) { held = true; el.textContent = text; },
    release() { held = false; tick(); },
  };
});

safely("booking", bookAll);
safely("origin", flagCopies);

// The opening line's tasks ("clear your invoices", ...) underline as the log does that kind of job.
const lede = safely("lede", () => {
  const tasks = new Map([...document.querySelectorAll(".lede .task")].map((el) => [el.dataset.kind, el]));
  const timers = new Map();
  const started = new Map();
  return {
    flash(kind) {
      const el = tasks.get(kind);
      if (!el) return;
      // the fast-forward fires these quickly; let a sweep finish its draw before restarting it
      const now = performance.now();
      if (now - (started.get(kind) || -1e4) < 800) return;
      started.set(kind, now);
      el.classList.remove("is-done");
      void el.offsetWidth;            // restart the sweep if it was already showing
      el.classList.add("is-done");
      clearTimeout(timers.get(kind));
      timers.set(kind, setTimeout(() => el.classList.remove("is-done"), 2600));
    },
  };
});

const log = safely("log", () => initLog({
  list: document.getElementById("shiftlog"),
  doneEl: document.getElementById("log-done"),
  heldEl: document.getElementById("log-held"),
  onKind: (kind) => lede?.flash(kind),
}));

const night = safely("night", () => {
  const canvas = document.querySelector("canvas.night");
  return canvas ? initNight(canvas, { reduced, onJob: () => log?.push() }) : null;
});

safely("effects", () => initEffects({ reduced, finePointer }));

// "Fast-forward to 7 AM": the whole night runs in a few seconds, with jobs streaking off the panel
// and dawn coming up inside it, then the morning summary with the booking link.
safely("fast-forward", () => {
  const btn = document.getElementById("ff");
  const panel = document.querySelector(".log");
  if (!btn || !panel || !log) return;
  const label = btn.textContent;
  btn.hidden = false;
  document.getElementById("log-ends")?.setAttribute("hidden", "");
  let card = null;

  function el(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.append(...kids);
    return e;
  }

  function back() {
    card?.remove();
    card = null;
    panel.classList.remove("is-ff");
    panel.style.setProperty("--ff", "0");
    clock?.release();
    btn.hidden = false;
    btn.disabled = false;
    btn.textContent = label;
    btn.focus({ preventScroll: true });
  }

  function summary({ done, held }) {
    const cta = el("a", "btn btn-sm", "Book a free call");
    cta.href = "#contact";
    cta.dataset.book = "";
    book(cta);
    const again = el("button", "link-quiet", "Back to tonight");
    again.type = "button";
    again.addEventListener("click", back);
    const box = el("div", "ff-card",
      el("p", "ff-time", "7:00 AM"),
      el("p", "ff-head", "Your team walks in to:"),
      el("ul", "ff-list",
        el("li", null, el("b", null, String(done)), " jobs finished overnight"),
        el("li", null, el("b", null, String(held)), held === 1 ? " held for a person, with the reason" : " held for a person, each with the reason"),
        el("li", null, "The morning summary, in three inboxes at 6:55")),
      el("p", "ff-note", "An example night. Yours would run on your own invoices, inquiries and reports."),
      el("div", "ff-actions", cta, again));
    box.tabIndex = -1;
    box.setAttribute("role", "status");
    return box;
  }

  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = "Fast-forwarding";
    card?.remove();
    panel.classList.add("is-ff");
    let n = 0;
    const tally = await log.fastForward({
      onRow(kind, progress, time) {
        panel.style.setProperty("--ff", progress.toFixed(3));
        clock?.hold(time);
        if (kind) lede?.flash(kind);
        if (!reduced && night && n++ % 3 === 0) {
          const r = panel.getBoundingClientRect();
          const x = Math.max(12, r.left - 30 - Math.random() * 160);
          night.pulse(x, r.top + 40 + Math.random() * Math.max(40, r.height - 80));
        }
      },
    });
    if (!tally) return;
    clock?.hold("7:00 AM");
    btn.hidden = true;
    card = summary(tally);
    panel.append(card);
    card.focus({ preventScroll: true });
  });
});

const form = safely("form", () => initForm(document.getElementById("lead"), {
  onLaunch: (x, y) => { if (!reduced) night?.launch(x, y); },
}));

safely("calculator", () => initCalculator({ reduced, onSend: (text) => form?.prefill(text) }));

safely("audit", () => initAudit({
  onTick: (x, y) => night?.startJob(x, y),
  onSend: (text) => form?.prefill(text),
}));
