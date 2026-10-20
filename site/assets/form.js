// The lead form: validation, the optional Turnstile bot check, and the POST to Apps Script.

import { LEAD_ENDPOINT, TURNSTILE_SITE_KEY } from "./config.js";

const REQUIRED = ["name", "email", "company", "message"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIMEOUT_MS = 15000;
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function initForm(form) {
  if (!form) return null;
  const status = document.getElementById("status");
  const send = document.getElementById("send");
  const slot = document.getElementById("ts-slot");
  const message = form.elements.namedItem("message");
  const openedAt = performance.now();
  let token = "";
  let widgetId = null;
  let lastPrefill = "";

  function say(msg, isErr) {
    status.textContent = msg;
    status.classList.toggle("err", !!isErr);
  }

  function field(name) { return form.elements.namedItem(name); }

  for (const name of REQUIRED) {
    field(name).addEventListener("input", () => field(name).removeAttribute("aria-invalid"));
  }

  if (TURNSTILE_SITE_KEY && slot) {
    slot.hidden = false;
    window.onThirdShiftTurnstile = () => {
      widgetId = window.turnstile.render(slot, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        appearance: "interaction-only",
        callback: (t) => { token = t; },
        "expired-callback": () => { token = ""; },
        "error-callback": () => { token = ""; },
      });
    };
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC + "&onload=onThirdShiftTurnstile";
    s.async = true;
    document.head.append(s);
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    say("", false);

    const data = Object.fromEntries(new FormData(form).entries());
    const missing = REQUIRED.filter((k) => !String(data[k] || "").trim());
    missing.forEach((k) => field(k).setAttribute("aria-invalid", "true"));
    if (missing.length) {
      say("Fill in name, work email, company and what takes up your time.", true);
      field(missing[0]).focus();
      return;
    }
    if (!EMAIL_RE.test(String(data.email).trim())) {
      field("email").setAttribute("aria-invalid", "true");
      say("That email doesn’t look right.", true);
      field("email").focus();
      return;
    }
    if (!LEAD_ENDPOINT) {
      say("The form isn’t connected yet. Email hello@thirdshift.ca for now.", true);
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      say("One second, still checking this isn’t a bot. Try Send again.", true);
      return;
    }

    send.disabled = true;
    send.textContent = "Sending";
    data.source = location.hostname || "thirdshift.ca";
    data.submitted_at = new Date().toISOString();
    data.elapsed_ms = Math.round(performance.now() - openedAt);
    if (token) data.cf_token = token;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      // text/plain keeps this a simple request (no CORS preflight), which Apps Script web apps need.
      const res = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        signal: ctrl.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      let ok = res.ok;
      try { const j = await res.json(); ok = ok && j.ok === true; } catch { ok = false; }
      if (!ok) throw new Error("bad response");
      done();
    } catch {
      say("Couldn’t send just now. Try again, or email hello@thirdshift.ca.", true);
      send.disabled = false;
      send.textContent = "Send";
      token = "";
      if (widgetId != null && window.turnstile) window.turnstile.reset(widgetId);
    } finally {
      clearTimeout(timer);
    }
  });

  function done() {
    const box = document.createElement("div");
    box.className = "sent full";
    box.tabIndex = -1;
    const strong = document.createElement("strong");
    strong.textContent = "Sent.";
    box.append(strong, "We’ll reply within one business day. If it’s urgent, email hello@thirdshift.ca.");
    form.replaceChildren(box);
    // The live status line went with the form, so move focus to the confirmation for screen readers.
    box.focus();
  }

  return {
    // Put the calculator's numbers in the message box and bring the visitor to the form.
    prefill(text) {
      if (!message) return;
      const current = message.value.trim();
      if (!current || current === lastPrefill) message.value = text;
      else if (!current.includes(text)) message.value = current + "\n\n" + text;
      lastPrefill = text;
      document.getElementById("contact")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      setTimeout(() => field("name").focus({ preventScroll: true }), 600);
    },
  };
}
