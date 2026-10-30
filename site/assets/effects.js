// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Page-wide effects: scroll progress (--p, which the header's crescent follows), header state, scroll
// reveals, the steps progress line, the service cards' illustrations, the phone call-to-action and the
// town at the foot of the page. Every effect writes CSS custom properties or classes through the CSSOM,
// which the Content-Security-Policy allows without 'unsafe-inline'.
//
// Taken out because they read as busy rather than calm: on Oct 20, 2026 a ring trailing the mouse,
// buttons pulled toward it and section labels that scrambled in; with the Daylight design, the pointer
// spotlight, glowing card borders, tilting cards and log, the comet around the main button and the
// scroll progress bar.

import { initSkyline } from "./skyline.js";

export function initEffects({ reduced = false, finePointer = false } = {}) {
  const root = document.documentElement;
  initScroll(root);
  initReveal(root, reduced);
  initMobileCta();
  initSkyline(reduced);
  if (!reduced) initVizOnce(finePointer);
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

// The service cards' illustrations play through once as each card arrives, then rest on a finished
// frame instead of looping; hovering a card plays it again. The times are the moment in each loop
// where the picture is complete (all four are drawn in styles.css). Without this script the CSS loops
// as before, so nothing breaks if it never runs.
const VIZ_REST = { "viz-ap": 2160, "viz-leads": 4800, "viz-report": 4800, "viz-list": 4800 };

function initVizOnce(finePointer) {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target._play();
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  for (const viz of document.querySelectorAll(".viz")) {
    const card = viz.closest(".card");
    const rest = VIZ_REST[[...viz.classList].find((c) => c in VIZ_REST)];
    if (!card || !rest || !viz.getAnimations) continue;
    let timer = 0;
    card._play = () => {
      const anims = viz.getAnimations({ subtree: true });
      clearTimeout(timer);
      for (const a of anims) { a.currentTime = 0; a.play(); }
      timer = setTimeout(() => {
        for (const a of anims) { a.pause(); a.currentTime = rest; }
        timer = 0;
      }, rest);
    };
    io.observe(card);
    if (finePointer) card.addEventListener("pointerenter", () => { if (!timer) card._play(); });
  }
}

function initScroll(root) {
  const header = document.querySelector(".top");
  const steps = document.getElementById("steps");
  let queued = false;

  function update() {
    queued = false;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    root.style.setProperty("--p", p.toFixed(4));
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    if (steps) {
      const r = steps.getBoundingClientRect();
      const sp = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - r.top) / Math.max(1, r.height)));
      steps.style.setProperty("--steps-p", sp.toFixed(4));
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  update();
}

function initReveal(root, reduced) {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length || !("IntersectionObserver" in window)) return;

  // Stagger siblings a little so a row of cards arrives as a sequence.
  const seen = new Map();
  items.forEach((el) => {
    const parent = el.parentElement;
    const i = seen.get(parent) || 0;
    seen.set(parent, i + 1);
    if (!reduced && i) el.style.setProperty("--d", Math.min(i * 90, 360) + "ms");
  });

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  root.classList.add("fx");
  items.forEach((el) => io.observe(el));
}
