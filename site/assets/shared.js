// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Pieces every page uses: where the visit came from, the booking links, and the note on copies of
// the site.

import { BOOKING_URL } from "./config.js";

// Where the real site lives. Anywhere else (a scraped copy, a cloned repo on a new domain) gets a note.
const HOMES = ["thirdshift.ca", "www.thirdshift.ca", "spacejam91.github.io", "localhost", "127.0.0.1"];
const ARRIVAL_KEY = "ts-arrival";
const TAGS = ["utm_source", "utm_medium", "utm_campaign"];

// Where this visit came from: the campaign tags on the link the visitor arrived by and the site that
// sent them. Every page calls this on load, so a visit that starts on a service or "who it's for" page
// keeps its tags when the visitor moves on to the form. They're kept for the tab's session and go out
// with the form, so the CRM shows which posts and emails bring leads (docs/SYSTEM.md). The tags are
// then taken off the address bar so a shared link doesn't carry them.
export function arrival() {
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

// "Book a call" links go to the booking page once BOOKING_URL is set, otherwise to the form.
export function book(a) {
  if (!/^https:\/\/[^\s]+$/.test(BOOKING_URL)) return;
  a.href = BOOKING_URL;
  a.target = "_blank";
  a.rel = "noopener";
}

export function bookAll() {
  document.querySelectorAll("[data-book]").forEach(book);
}

export function flagCopies() {
  console.info("Third Shift, thirdshift.ca. Built in Ontario, Canada. All rights reserved.");
  const host = location.hostname;
  if (!host || HOMES.includes(host) || host.endsWith(".localhost") || host.endsWith(".translate.goog")) return;
  const note = document.createElement("a");
  note.className = "origin-note";
  note.href = "https://thirdshift.ca/";
  note.textContent = "This is a copy. The original is at thirdshift.ca";
  document.body.append(note);
}
