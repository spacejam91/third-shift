// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Page-wide effects: the night-to-dawn sky, header state, scroll reveals, the steps progress line,
// the service cards' illustrations, and the pointer effects (spotlight, glowing borders, tilting
// panels). Every effect writes CSS custom properties or transforms through the CSSOM, which the
// Content-Security-Policy allows without 'unsafe-inline'.
//
// Taken out on Oct 20, 2026 because they read as busy rather than calm: a ring trailing the mouse,
// buttons pulled toward it, and section labels that scrambled in from random characters.

import { initSkyline } from "./skyline.js";

export function initEffects({ reduced = false, finePointer = false } = {}) {
  const root = document.documentElement;
  initScroll(root);
  initReveal(root, reduced);
  initMobileCta();
  initSkyline(reduced);
  if (!reduced) initVizOnce(finePointer);
  if (!reduced) initComet();
  if (reduced || !finePointer) return;
  initSpotlight(root);
  initGlow();
  initTilt();
  initCardTilt();
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

// The main call-to-action gets a comet that laps its edge every few seconds, only while it's on screen.
function initComet() {
  const els = document.querySelectorAll(".comet");
  if (!els.length || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle("is-live", e.isIntersecting);
  });
  els.forEach((el) => io.observe(el));
}

// Dawn over the town at the foot of the page. Buildings are placed from a fixed seed so the skyline
// is the same on every visit; windows switch on as the footer scrolls into view (--dawn-p), each at
// its own moment (--t), like people arriving to find the work already done.
// Service cards lean toward the pointer. Uses the rotate property (axis and angle) so it never
// fights the transform the scroll reveal uses.
function initCardTilt() {
  for (const card of document.querySelectorAll(".card")) {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      const angle = Math.min(1, Math.hypot(nx, ny) * 1.6) * 5;
      card.style.rotate = `${(-ny).toFixed(3)} ${nx.toFixed(3)} 0 ${angle.toFixed(2)}deg`;
    });
    card.addEventListener("pointerleave", () => { card.style.rotate = ""; });
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

function initSpotlight(root) {
  let x = 0, y = 0, queued = false;
  window.addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      root.style.setProperty("--mx", x + "px");
      root.style.setProperty("--my", y + "px");
    });
  }, { passive: true });
}

function initGlow() {
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest("[data-glow]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", (e.clientX - r.left).toFixed(0) + "px");
    el.style.setProperty("--gy", (e.clientY - r.top).toFixed(0) + "px");
  }, { passive: true });
}

function initTilt() {
  const el = document.querySelector("[data-tilt]");
  if (!el) return;
  const wide = window.matchMedia("(min-width: 980px)");
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

  function frame() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    el.style.transform = `perspective(1000px) rotateX(${cy.toFixed(2)}deg) rotateY(${cx.toFixed(2)}deg)`;
    raf = Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01 ? requestAnimationFrame(frame) : 0;
  }
  function aim(x, y) {
    tx = x; ty = y;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", (e) => {
    if (!wide.matches) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    aim(nx * 7, -ny * 5);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => aim(0, 0));
  wide.addEventListener("change", () => { if (!wide.matches) { tx = ty = cx = cy = 0; el.style.transform = ""; } });
}
