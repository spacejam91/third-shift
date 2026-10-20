// Page-wide effects: the night-to-dawn sky, header state, scroll reveals, the steps progress line,
// and the pointer effects (spotlight, glowing borders, magnetic buttons, tilting log panel).
// Every effect writes CSS custom properties or transforms through the CSSOM, which the
// Content-Security-Policy allows without 'unsafe-inline'.

export function initEffects({ reduced = false, finePointer = false } = {}) {
  const root = document.documentElement;
  initScroll(root);
  initReveal(root, reduced);
  initMobileCta();
  if (!reduced) initScramble();
  if (reduced || !finePointer) return;
  initSpotlight(root);
  initGlow();
  initMagnetic();
  initTilt();
  initCardTilt();
  initRing();
}

// The phone call-to-action bar shows once the hero is gone and hides again at the form.
function initMobileCta() {
  const bar = document.getElementById("mobile-cta");
  const hero = document.querySelector(".hero");
  const contact = document.getElementById("contact");
  if (!bar || !hero || !contact || !("IntersectionObserver" in window)) return;
  const seen = { hero: true, contact: false };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen[e.target === hero ? "hero" : "contact"] = e.isIntersecting;
    bar.classList.toggle("is-on", !seen.hero && !seen.contact);
  });
  io.observe(hero);
  io.observe(contact);
}

// Section labels decode from machine noise into words as they arrive, and again on hover.
function initScramble() {
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#";
  const els = [...document.querySelectorAll(".kicker")];
  if (!els.length || !("IntersectionObserver" in window)) return;

  function run(el) {
    const final = el.dataset.text;
    cancelAnimationFrame(el._scramble || 0);
    const start = performance.now();
    const dur = 500 + final.length * 22;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const shown = Math.floor(t * final.length);
      let out = final.slice(0, shown);
      for (let i = shown; i < final.length; i++) out += final[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (t < 1) el._scramble = requestAnimationFrame(tick);
    };
    el._scramble = requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      run(e.target);
      io.unobserve(e.target);
    }
  }, { threshold: 0.6 });
  for (const el of els) {
    el.dataset.text = el.textContent;
    io.observe(el);
    el.addEventListener("pointerenter", () => run(el));
  }
}

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

// A soft ring that trails the mouse and swells over anything clickable.
function initRing() {
  const ring = document.querySelector(".ring");
  if (!ring) return;
  const HOT = "a, button, input, textarea, select, summary, label, [data-magnetic]";
  let x = -100, y = -100, cx = x, cy = y, raf = 0;

  function frame() {
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    ring.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(frame) : 0;
  }
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX;
    y = e.clientY;
    if (!ring.classList.contains("is-on")) { cx = x; cy = y; ring.classList.add("is-on"); }
    ring.classList.toggle("is-hot", !!(e.target.closest && e.target.closest(HOT)));
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
  window.addEventListener("pointerdown", () => ring.classList.add("is-down"), { passive: true });
  window.addEventListener("pointerup", () => ring.classList.remove("is-down"), { passive: true });
  document.documentElement.addEventListener("pointerleave", () => ring.classList.remove("is-on"));
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

function initMagnetic() {
  for (const el of document.querySelectorAll("[data-magnetic]")) {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.transform = `translate(${(dx * 6).toFixed(1)}px, ${(dy * 4).toFixed(1)}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  }
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
