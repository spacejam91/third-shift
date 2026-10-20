// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Entry point for the service pages: booking links, the note on copies, and the page-wide effects
// (sky, header, reveals, glowing cards, the dawn footer). The home page's night network, shift log,
// calculator and form stay on the home page.

import { initEffects } from "./effects.js";
import { bookAll, flagCopies } from "./shared.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const parts = [
  ["booking", bookAll],
  ["origin", flagCopies],
  ["effects", () => initEffects({ reduced, finePointer })],
];
for (const [name, start] of parts) {
  try {
    start();
  } catch (err) {
    console.error(`[third-shift] ${name} did not start`, err);
  }
}
