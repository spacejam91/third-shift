// Page-wide effects: the night-to-dawn sky, header state, scroll reveals, the steps progress line,
// and the pointer effects (spotlight, glowing borders, magnetic buttons, tilting log panel).
// Every effect writes CSS custom properties or transforms through the CSSOM, which the
// Content-Security-Policy allows without 'unsafe-inline'.

export function initEffects({ reduced = false, finePointer = false } = {}) {
  const root = document.documentElement;
  initScroll(root);
  initReveal(root, reduced);
  if (reduced || !finePointer) return;
  initSpotlight(root);
  initGlow();
  initMagnetic();
  initTilt();
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
