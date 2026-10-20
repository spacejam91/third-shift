// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Pieces every page uses: the booking links and the note on copies of the site.

import { BOOKING_URL } from "./config.js";

// Where the real site lives. Anywhere else (a scraped copy, a cloned repo on a new domain) gets a note.
const HOMES = ["thirdshift.ca", "www.thirdshift.ca", "spacejam91.github.io", "localhost", "127.0.0.1"];

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
  console.info("Third Shift, thirdshift.ca. Built in Kitchener-Waterloo. All rights reserved.");
  const host = location.hostname;
  if (!host || HOMES.includes(host) || host.endsWith(".localhost") || host.endsWith(".translate.goog")) return;
  const note = document.createElement("a");
  note.className = "origin-note";
  note.href = "https://thirdshift.ca/";
  note.textContent = "This is a copy. The original is at thirdshift.ca";
  document.body.append(note);
}
