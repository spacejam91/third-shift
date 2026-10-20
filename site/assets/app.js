// Entry point. Each feature starts on its own, so one failing never takes the others down.

import { initNight } from "./night.js";
import { initLog } from "./log.js";
import { initEffects } from "./effects.js";
import { initCalculator } from "./calculator.js";
import { initAudit } from "./audit.js";
import { initForm } from "./form.js";
import { BOOKING_URL } from "./config.js";

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

safely("clock", () => {
  const el = document.getElementById("clock");
  if (!el) return;
  // en-US gives "1:03 AM" to match the log rows; en-CA would print "1:03 a.m."
  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
  const tick = () => { el.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30000);
});

safely("booking", () => {
  if (!/^https:\/\/[^\s]+$/.test(BOOKING_URL)) return;
  for (const a of document.querySelectorAll("[data-book]")) {
    a.href = BOOKING_URL;
    a.target = "_blank";
    a.rel = "noopener";
  }
});

// The opening line's tasks ("clear your invoices", ...) underline as the log does that kind of job.
const lede = safely("lede", () => {
  const tasks = new Map([...document.querySelectorAll(".lede .task")].map((el) => [el.dataset.kind, el]));
  const timers = new Map();
  return {
    flash(kind) {
      const el = tasks.get(kind);
      if (!el) return;
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

// "N jobs kicked off since you got here": appears after the visitor's third job, hides at the form.
const chip = safely("chip", () => {
  const box = document.getElementById("chip");
  const n = document.getElementById("chip-n");
  if (!box || !n) return null;
  let count = 0, dismissed = false, atForm = false;
  try { dismissed = sessionStorage.getItem("ts-chip") === "hidden"; } catch { /* storage blocked */ }
  const show = () => { box.hidden = dismissed || atForm || count < 3; };
  document.getElementById("chip-x")?.addEventListener("click", () => {
    dismissed = true;
    show();
    try { sessionStorage.setItem("ts-chip", "hidden"); } catch { /* storage blocked */ }
  });
  const contact = document.getElementById("contact");
  if (contact && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { atForm = e.isIntersecting; show(); }, { threshold: 0.15 }).observe(contact);
  }
  return { bump() { count++; n.textContent = String(count); show(); } };
});

const night = safely("night", () => {
  const canvas = document.querySelector("canvas.night");
  return canvas ? initNight(canvas, { reduced, onJob: () => log?.push(), onUserJob: () => chip?.bump() }) : null;
});

safely("effects", () => initEffects({ reduced, finePointer }));

const form = safely("form", () => initForm(document.getElementById("lead"), {
  onLaunch: (x, y) => { if (!reduced) night?.launch(x, y); },
}));

safely("calculator", () => initCalculator({ reduced, onSend: (text) => form?.prefill(text) }));

safely("audit", () => initAudit({
  onTick: (x, y) => night?.startJob(x, y),
  onSend: (text) => form?.prefill(text),
}));
