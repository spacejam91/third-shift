// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The lead form: validation, the optional Turnstile bot check, and the POST to Apps Script.

import { LEAD_ENDPOINT, TURNSTILE_SITE_KEY } from "./config.js";

const REQUIRED = ["name", "email", "company", "message"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIMEOUT_MS = 15000;
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const ARRIVAL_KEY = "ts-arrival";
const TAGS = ["utm_source", "utm_medium", "utm_campaign"];

// Where this visit came from: the campaign tags on the link the visitor arrived by and the site that
// sent them, kept for the tab's session so they survive a look at the privacy page. They go out with
// the form so the CRM shows which posts and emails bring leads (docs/SYSTEM.md). The tags are then
// taken off the address bar so a shared link doesn't carry them.
function arrival() {
  try {
    const kept = JSON.parse(sessionStorage.getItem(ARRIVAL_KEY) || "null");
    if (kept) return kept;
  } catch { /* storage blocked */ }
  const url = new URL(location.href);
  const found = { referrer: "" };
  for (const k of TAGS) found[k] = (url.searchParams.get(k) || "").slice(0, 120);
  try {
    const from = document.referrer ? new URL(document.referrer).host : "";
    if (from && from !== location.host) found.referrer = from.slice(0, 120);
  } catch { /* no usable referrer */ }
  try { sessionStorage.setItem(ARRIVAL_KEY, JSON.stringify(found)); } catch { /* storage blocked */ }
  if (TAGS.some((k) => url.searchParams.has(k))) {
    TAGS.forEach((k) => url.searchParams.delete(k));
    try { history.replaceState(history.state, "", url.pathname + url.search + url.hash); } catch { /* sandboxed */ }
  }
  return found;
}

// onLaunch(x, y) fires when a message actually goes out, from the Send button's centre, so the
// night canvas can send it across the page as a job.
export function initForm(form, { onLaunch = () => {} } = {}) {
  if (!form) return null;
  const came = arrival();
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
      say("The form isn’t connected yet. Email thirdshift.ca@gmail.com for now.", true);
      return;
    }
    if (TURNSTILE_SITE_KEY && !token) {
      say("One second, still checking this isn’t a bot. Try Send again.", true);
      return;
    }

    send.disabled = true;
    send.textContent = "Sending";
    send.classList.add("is-sending");
    const at = send.getBoundingClientRect();
    onLaunch(at.left + at.width / 2, at.top + at.height / 2);
    data.source = location.hostname || "thirdshift.ca";
    data.submitted_at = new Date().toISOString();
    data.elapsed_ms = Math.round(performance.now() - openedAt);
    for (const [k, v] of Object.entries(came)) if (v) data[k] = v;
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
      say("Couldn’t send just now. Try again, or email thirdshift.ca@gmail.com.", true);
      send.disabled = false;
      send.textContent = "Send";
      send.classList.remove("is-sending");
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
    const line = document.createElement("span");
    line.className = "sent-line";
    line.textContent = "It’s on tonight’s shift. We’ll reply within one business day. If it’s urgent, email thirdshift.ca@gmail.com.";
    box.append(strong, line);
    const swap = () => form.replaceChildren(box);
    // The form morphs into the confirmation where the browser supports view transitions.
    // Then the live status line has gone with the form, so focus moves to the confirmation for screen
    // readers, and a second burst of light marks it delivered.
    const after = () => {
      box.focus();
      const at = box.getBoundingClientRect();
      if (at.width) onLaunch(at.left + at.width / 2, at.top + at.height / 2);
    };
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!calm && document.startViewTransition) document.startViewTransition(swap).finished.finally(after);
    else { swap(); after(); }
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
