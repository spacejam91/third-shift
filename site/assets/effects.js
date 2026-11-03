// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Page-wide effects: scroll progress (--p, which the header's crescent follows), header state, the
// phone call-to-action, the town at the foot of the page, and the touches that answer the visitor
// (touches.js). Every effect writes CSS custom properties or classes through the CSSOM, which the
// Content-Security-Policy allows without 'unsafe-inline'.
//
// Taken out because they read as busy rather than calm: on Oct 20, 2026 a ring trailing the mouse,
// buttons pulled toward it and section labels that scrambled in; with the Daylight design, the pointer
// spotlight, glowing card borders, tilting cards and log, the comet around the main button and the
// scroll progress bar. With Work Order (Nov 2026), because they read as a generated site: the sketches
// of software above each service, everything fading up as it scrolled in, and the steps' progress line.

import { initSkyline } from "./skyline.js";
import { initTouches } from "./touches.js";

export function initEffects({ reduced = false, finePointer = false } = {}) {
  initScroll(document.documentElement);
  initMobileCta();
  initSkyline(reduced);
  initTouches({ reduced, finePointer });
}

// The phone call-to-action bar shows once the hero is gone and hides again at the form (on the
// service pages, at the closing call-to-action).
function initMobileCta() {
  const bar = document.getElementById("mobile-cta");
  const hero = document.querySelector(".hero, [data-hero]");
  const contact = document.querySelector("#contact, [data-cta-end]");
  if (!bar || !hero || !contact || !("IntersectionObserver" in window)) return;
  const seen = { hero: true, contact: false };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen[e.target === hero ? "hero" : "contact"] = e.isIntersecting;
    bar.classList.toggle("is-on", !seen.hero && !seen.contact);
  });
  io.observe(hero);
  io.observe(contact);
}

function initScroll(root) {
  const header = document.querySelector(".top");
  let queued = false;

  function update() {
    queued = false;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    root.style.setProperty("--p", p.toFixed(4));
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  update();
}
