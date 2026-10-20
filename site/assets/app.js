// Entry point. Each feature starts on its own, so one failing never takes the others down.

import { initNight } from "./night.js";
import { initLog } from "./log.js";
import { initEffects } from "./effects.js";
import { initCalculator } from "./calculator.js";
import { initForm } from "./form.js";

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

const log = safely("log", () => initLog({
  list: document.getElementById("shiftlog"),
  doneEl: document.getElementById("log-done"),
  heldEl: document.getElementById("log-held"),
}));

safely("night", () => {
  const canvas = document.querySelector("canvas.night");
  if (canvas) initNight(canvas, { reduced, onJob: () => log?.push() });
});

safely("effects", () => initEffects({ reduced, finePointer }));

const form = safely("form", () => initForm(document.getElementById("lead")));

safely("calculator", () => initCalculator({ reduced, onSend: (text) => form?.prefill(text) }));
