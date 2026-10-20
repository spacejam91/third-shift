// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The town along the bottom of the footer. Two rows of buildings, a hazy back row and the front row,
// rise toward two downtowns around a pair of office towers in the middle. Every lit window has a dawn
// threshold (--t); the CSS switches it on once the footer is that far into view, whole floors at a
// time, the way offices light up. The tall tower's crown comes on last, as the shift ends.

const W = 1440, H = 200;
const NS = "http://www.w3.org/2000/svg";

// Window grid shared by every building: 8 units across, 10 up, so a building's width in steps of 8
// always fits whole columns with even margins.
const PX = 8, PY = 10, WIN_W = 4, WIN_H = 5;
const WIDTHS = [32, 40, 40, 48, 48, 56, 56, 64, 72, 88];

// The rows are laid out around this footprint; the two towers stand in it, the shorter one on the
// left and the tall one with the crown on the right.
const CORE = { w: 224, h: 144 };
const SHORT = { dx: 0, w: 96, floors: 11 };
const TALL = { dx: 104, w: 120, floors: 15 };

function el(tag, attrs, cls) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === "number" ? +v.toFixed(2) : v);
  if (cls) e.setAttribute("class", cls);
  return e;
}

function lcg(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

// How tall the town is at x, 0..1: the core in the middle, uptown to the left, a smaller rise east.
function profile(x) {
  const core = Math.exp(-(((x - W * 0.5) / 230) ** 2));
  const uptown = 0.78 * Math.exp(-(((x - W * 0.2) / 140) ** 2));
  const east = 0.5 * Math.exp(-(((x - W * 0.82) / 120) ** 2));
  return Math.max(core, uptown, east);
}

// Lays out one row of buildings outward from the core's sides. Heights snap to whole floors and
// never sit level with the neighbour, gaps are a tight 2-3 units with the odd street.
function row(rnd, { inner, minH, maxH, gap, street, nearCap }) {
  const out = [];
  for (const dir of [-1, 1]) {
    let edge = W / 2 + dir * inner;
    let prev = 0, sinceStreet = 0;
    while (dir < 0 ? edge > -40 : edge < W + 40) {
      const w = WIDTHS[Math.floor(rnd() * WIDTHS.length)];
      const x = dir < 0 ? edge - w : edge;
      const mid = x + w / 2;
      let h = minH + (maxH - minH) * profile(mid) * (0.62 + 0.38 * rnd());
      if (Math.abs(mid - W / 2) < 240) h = Math.min(h, nearCap);
      let floors = Math.max(2, Math.round((h - 14) / PY));
      if (Math.abs(floors - prev) < 2) floors += floors > 4 && rnd() < 0.5 ? -2 : 2;
      prev = floors;
      out.push({ x, w, h: floors * PY + 14, floors });
      sinceStreet++;
      const isStreet = sinceStreet > 3 && rnd() < 0.3;
      if (isStreet) sinceStreet = 0;
      edge += dir * (w + (isStreet ? street[0] + rnd() * (street[1] - street[0]) : gap[0] + Math.floor(rnd() * (gap[1] - gap[0] + 1))));
    }
  }
  return out;
}

// Roof shapes; returns the beacon point if the roof carries one.
function roof(rnd, b, group, front) {
  const top = H - b.h;
  const tall = b.h > 100, mid = b.h > 60;
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const kind = tall ? pick(["setback", "setback2", "spire", "antenna", "flat"])
    : mid ? pick(["setback", "antenna", "tank", "flat", "flat"])
    : pick(["pitch", "flat", "flat", "tank"]);
  const cx = b.x + b.w / 2;
  if (kind === "setback" || kind === "setback2") {
    group.append(el("rect", { x: b.x + b.w * 0.16, y: top - 10, width: b.w * 0.68, height: 11 }));
    if (kind === "setback2") group.append(el("rect", { x: b.x + b.w * 0.3, y: top - 19, width: b.w * 0.4, height: 10 }));
  } else if (kind === "spire") {
    group.append(el("rect", { x: cx - 6, y: top - 8, width: 12, height: 9 }));
    group.append(el("polygon", { points: `${cx - 3.5},${top - 8} ${cx},${top - 34} ${cx + 3.5},${top - 8}` }));
    return front ? [cx, top - 35] : null;
  } else if (kind === "antenna") {
    const ax = b.x + b.w * (0.3 + rnd() * 0.4);
    group.append(el("rect", { x: ax - 0.8, y: top - 22, width: 1.6, height: 23 }));
    return front ? [ax, top - 23] : null;
  } else if (kind === "tank") {
    const tx = b.x + b.w * (0.55 + rnd() * 0.2);
    group.append(el("rect", { x: tx, y: top - 10, width: 10, height: 7, rx: 1.5 }));
    group.append(el("rect", { x: tx + 1.5, y: top - 3, width: 1.2, height: 3 }), el("rect", { x: tx + 7.3, y: top - 3, width: 1.2, height: 3 }));
  } else if (kind === "pitch") {
    group.append(el("polygon", { points: `${b.x},${top + 0.5} ${cx},${top - 9} ${b.x + b.w},${top + 0.5}` }));
  }
  return null;
}

// A building's windows: unlit panes go into one shared path; lit ones are grouped by floor so a
// floor comes on together, with a few stragglers lighting on their own. Most offices burn warm, the
// odd one cool white. No building is left dark: if the dice leave it under minShare, the night shift
// is in a few more offices (from `extra`, so topping one building up doesn't reshuffle the town).
function windows(rnd, extra, b, panes, lit, { litShare, floorShare, minShare = 0, plain = false }) {
  const cols = Math.floor((b.w - 8) / PX) + 1;
  const gridW = (cols - 1) * PX + WIN_W;
  const x0 = b.x + (b.w - gridW) / 2;
  const y0 = H - b.h + 8;
  const strips = !plain && b.h > 100 && rnd() < 0.3;           // tall towers sometimes have vertical strip windows
  const floors = [], off = [];
  let count = 0, on = 0;
  for (let r = 0; r < b.floors; r++) {
    const y = y0 + r * PY;
    const floorOn = rnd() < floorShare;
    const floor = { t: 0.1 + rnd() * 0.8, d: "", singles: [] };
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * PX, w = strips ? 2.4 : WIN_W, hgt = strips ? 8 : WIN_H;
      const rect = `M${+x.toFixed(2)} ${+y.toFixed(2)}h${w}v${hgt}h${-w}z`;
      count++;
      if (floorOn && rnd() < 0.88) { floor.d += rect; on++; }
      else if (rnd() < litShare) { floor.singles.push(rect); on++; }
      else off.push(rect);
    }
    floors.push(floor);
  }
  for (let need = Math.ceil(count * minShare) - on; need > 0 && off.length; need--) {
    const [rect] = off.splice(Math.floor(extra() * off.length), 1);
    floors[0].singles.push(rect);
  }
  panes.push(...off);
  const light = (d, t) => {
    const p = el("path", { d }, extra() < 0.14 ? "cool" : null);
    p.style.setProperty("--t", t.toFixed(3));
    lit.append(p);
  };
  for (const floor of floors) {
    if (floor.d) light(floor.d, floor.t);
    for (const s of floor.singles) light(s, 0.1 + extra() * 0.85);
  }
}

export function initSkyline(reduced) {
  const svg = document.getElementById("skyline");
  const foot = svg && svg.closest("footer");
  if (!svg || !foot) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const rnd = lcg(20261020), extra = lcg(7001);

  const back = el("g", {}, "back");
  const backLit = el("g", {}, "back-lit");
  const front = el("g", {}, "front");
  const frontLit = el("g", {}, "lit");
  const beacons = el("g", {}, "beacons");
  const backPanes = [], frontPanes = [];
  const left = W / 2 - CORE.w / 2;

  for (const b of row(rnd, { inner: CORE.w / 2 - 30, minH: 52, maxH: 150, gap: [8, 16], street: [10, 18], nearCap: CORE.h - 8 })) {
    if (b.x > left && b.x + b.w < left + CORE.w) continue;    // hidden behind the towers anyway
    back.append(el("rect", { x: b.x, y: H - b.h, width: b.w, height: b.h + 2 }));
    roof(rnd, b, back, false);
    windows(rnd, extra, b, backPanes, backLit, { litShare: 0.1, floorShare: 0.04, minShare: 0.06 });
  }
  for (const b of row(rnd, { inner: CORE.w / 2 + 3, minH: 26, maxH: 128, gap: [2, 3], street: [12, 20], nearCap: CORE.h * 0.74 })) {
    front.append(el("rect", { x: b.x, y: H - b.h, width: b.w, height: b.h + 2 }));
    const beacon = roof(rnd, b, front, true);
    if (beacon && b.h > 80) beacons.append(el("circle", { cx: beacon[0], cy: beacon[1], r: 1.8 }));
    windows(rnd, extra, b, frontPanes, frontLit, { litShare: 0.2, floorShare: 0.09, minShare: 0.26 });
  }

  // The towers: offices with the night shift in, a plant room and aerial on the short one, and a
  // hazier block behind closing the gap between them.
  const short = { x: left + SHORT.dx, w: SHORT.w, floors: SHORT.floors, h: SHORT.floors * PY + 14 };
  const tall = { x: left + TALL.dx, w: TALL.w, floors: TALL.floors, h: TALL.floors * PY + 14 };
  const behind = { x: short.x + short.w - 16, w: 40, floors: 13, h: 13 * PY + 14 };
  back.append(el("rect", { x: behind.x, y: H - behind.h, width: behind.w, height: behind.h + 2 }));
  windows(rnd, extra, behind, backPanes, backLit, { litShare: 0.1, floorShare: 0.04, minShare: 0.06, plain: true });
  for (const t of [short, tall]) {
    front.append(el("rect", { x: t.x, y: H - t.h, width: t.w, height: t.h + 2 }));
    windows(rnd, extra, t, frontPanes, frontLit, { litShare: 0.26, floorShare: 0.2, minShare: 0.36, plain: true });
  }
  const st = H - short.h;
  front.append(
    el("rect", { x: short.x + 14, y: st - 8, width: 40, height: 9 }),
    el("rect", { x: short.x + 70 - 0.8, y: st - 20, width: 1.6, height: 21 }),
  );
  beacons.append(el("circle", { cx: short.x + 70, cy: st - 21, r: 1.8 }));

  // The tall tower steps in twice to a mast. Its crown is uplit, ledge by ledge from the bottom.
  const tt = H - tall.h, cx = tall.x + tall.w / 2;
  const steps = [
    { x: tall.x + 12, y: tt - 10, w: tall.w - 24, h: 10 },
    { x: tall.x + 30, y: tt - 19, w: tall.w - 60, h: 9 },
  ];
  for (const s of steps) front.append(el("rect", { x: s.x, y: s.y, width: s.w, height: s.h + 1 }));
  front.append(el("rect", { x: cx - 0.9, y: tt - 31, width: 1.8, height: 13 }));
  beacons.append(el("circle", { cx, cy: tt - 32, r: 2 }));

  const crown = el("g", { filter: "url(#ts-glow)" }, "crown");
  const ledges = [{ x: tall.x, y: tt, w: tall.w }, ...steps];
  ledges.forEach((s, i) => {
    if (i > 0) {
      const flood = el("rect", { x: s.x, y: s.y, width: s.w, height: s.h }, "flood");
      flood.style.setProperty("--t", (0.85 + i * 0.03).toFixed(3));
      crown.append(flood);
    }
    const ledge = el("rect", { x: s.x, y: s.y - 0.6, width: s.w, height: 1.2 }, "ledge");
    ledge.style.setProperty("--t", (0.84 + i * 0.03).toFixed(3));
    crown.append(ledge);
  });

  const defs = el("defs", {});
  const wash = el("linearGradient", { id: "ts-crown", x1: 0, y1: 1, x2: 0, y2: 0 });
  wash.append(el("stop", { offset: 0, "stop-color": "#F2B055", "stop-opacity": 0.55 }), el("stop", { offset: 1, "stop-color": "#F2B055", "stop-opacity": 0 }));
  const glow = el("filter", { id: "ts-glow", x: "-10%", y: "-60%", width: "120%", height: "220%" });
  const merge = el("feMerge", {});
  merge.append(el("feMergeNode", { in: "blur" }), el("feMergeNode", { in: "SourceGraphic" }));
  glow.append(el("feGaussianBlur", { stdDeviation: 1.6, result: "blur" }), merge);
  defs.append(wash, glow);

  svg.append(
    defs, back, el("path", { d: backPanes.join("") }, "back-panes"), backLit,
    front, el("path", { d: frontPanes.join("") }, "panes"), frontLit, crown, beacons,
  );

  let queued = false;
  const update = () => {
    queued = false;
    const r = foot.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / Math.max(1, r.height)));
    svg.style.setProperty("--dawn-p", p.toFixed(3));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  let on = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      svg.classList.toggle("is-live", on && !reduced);
      if (on) queue();
    }).observe(svg);
  }
  window.addEventListener("scroll", () => { if (on) queue(); }, { passive: true });
  window.addEventListener("resize", () => { if (on) queue(); }, { passive: true });
  update();
}
