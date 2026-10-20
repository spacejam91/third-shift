// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The town along the bottom of the footer. Two rows of buildings, a hazy back row and the front row,
// rise toward two downtowns, and the tower in the middle spells a word in its windows. Every lit
// window has a dawn threshold (--t); the CSS switches it on once the footer is that far into view,
// whole floors at a time, the way offices light up.

const W = 1440, H = 200;
const NS = "http://www.w3.org/2000/svg";

// Window grid shared by every building: 8 units across, 10 up, so a building's width in steps of 8
// always fits whole columns with even margins.
const PX = 8, PY = 10, WIN_W = 4, WIN_H = 5;
const WIDTHS = [32, 40, 40, 48, 48, 56, 56, 64, 72, 88];

// 5x7 dot-matrix letters for the tower's word.
const DOTS = {
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
};
const WORD = "DONE.";
const TOWER = { cols: 27, rows: 13 };

function el(tag, attrs, cls) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === "number" ? +v.toFixed(2) : v);
  if (cls) e.setAttribute("class", cls);
  return e;
}

// How tall the town is at x, 0..1: the core in the middle, uptown to the left, a smaller rise east.
function profile(x) {
  const core = Math.exp(-(((x - W * 0.5) / 230) ** 2));
  const uptown = 0.78 * Math.exp(-(((x - W * 0.2) / 140) ** 2));
  const east = 0.5 * Math.exp(-(((x - W * 0.82) / 120) ** 2));
  return Math.max(core, uptown, east);
}

// Grid cells ("col,row") that spell the word, centred across and sitting in the lower middle.
function wordCells(cols, rows) {
  const glyphs = [...WORD].map((ch) => DOTS[ch]);
  const width = glyphs.reduce((n, g) => n + g[0].length, 0) + glyphs.length - 1;
  let c0 = Math.floor((cols - width) / 2);
  const r0 = rows - 7 - 2;
  const on = new Set();
  for (const g of glyphs) {
    g.forEach((line, r) => [...line].forEach((bit, c) => { if (bit === "1") on.add(`${c0 + c},${r0 + r}`); }));
    c0 += g[0].length + 1;
  }
  return on;
}

// Lays out one row of buildings outward from the tower's sides. Heights snap to whole floors and
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
// floor comes on together, with a few stragglers lighting on their own.
function windows(rnd, b, panes, lit, { litShare, floorShare }) {
  const cols = Math.floor((b.w - 8) / PX) + 1;
  const gridW = (cols - 1) * PX + WIN_W;
  const x0 = b.x + (b.w - gridW) / 2;
  const y0 = H - b.h + 8;
  const strips = b.h > 100 && rnd() < 0.3;           // tall towers sometimes have vertical strip windows
  const bands = !strips && b.h < 60 && b.w >= 56 && rnd() < 0.5;   // low blocks sometimes have ribbon windows
  for (let r = 0; r < b.floors; r++) {
    const y = y0 + r * PY;
    const floorOn = rnd() < floorShare;
    const floorT = 0.1 + rnd() * 0.8;
    let d = "";
    const singles = [];
    const cells = bands ? [[x0, gridW]] : Array.from({ length: cols }, (_, c) => [x0 + c * PX, strips ? 2.4 : WIN_W]);
    for (const [x, w] of cells) {
      const hgt = strips ? 8 : bands ? 3 : WIN_H;
      const rect = `M${+x.toFixed(2)} ${+y.toFixed(2)}h${w}v${hgt}h${-w}z`;
      if (floorOn ? rnd() < 0.88 : false) d += rect;
      else if (rnd() < litShare) singles.push(rect);
      else panes.push(rect);
    }
    if (d) {
      const p = el("path", { d });
      p.style.setProperty("--t", floorT.toFixed(3));
      lit.append(p);
    }
    for (const s of singles) {
      const p = el("path", { d: s });
      p.style.setProperty("--t", (0.1 + rnd() * 0.85).toFixed(3));
      lit.append(p);
    }
  }
}

export function initSkyline(reduced) {
  const svg = document.getElementById("skyline");
  const foot = svg && svg.closest("footer");
  if (!svg || !foot) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  let seed = 20261020;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // The tower: the town's tallest, in the middle so it shows even on a phone.
  const tw = (TOWER.cols - 1) * PX + WIN_W + 12;
  const tower = { x: W / 2 - tw / 2, w: tw, floors: TOWER.rows, h: TOWER.rows * PY + 14 };

  const back = el("g", {}, "back");
  const backLit = el("g", {}, "back-lit");
  const front = el("g", {}, "front");
  const frontLit = el("g", {}, "lit");
  const beacons = el("g", {}, "beacons");
  const backPanes = [], frontPanes = [];

  for (const b of row(rnd, { inner: tw / 2 - 30, minH: 52, maxH: 150, gap: [8, 16], street: [10, 18], nearCap: tower.h - 8 })) {
    if (b.x > tower.x && b.x + b.w < tower.x + tower.w) continue;    // hidden behind the tower anyway
    back.append(el("rect", { x: b.x, y: H - b.h, width: b.w, height: b.h + 2 }));
    roof(rnd, b, back, false);
    windows(rnd, b, backPanes, backLit, { litShare: 0.1, floorShare: 0.04 });
  }
  for (const b of row(rnd, { inner: tw / 2 + 3, minH: 26, maxH: 128, gap: [2, 3], street: [12, 20], nearCap: tower.h * 0.74 })) {
    front.append(el("rect", { x: b.x, y: H - b.h, width: b.w, height: b.h + 2 }));
    const beacon = roof(rnd, b, front, true);
    if (beacon && b.h > 80) beacons.append(el("circle", { cx: beacon[0], cy: beacon[1], r: 1.8 }));
    windows(rnd, b, frontPanes, frontLit, { litShare: 0.2, floorShare: 0.09 });
  }

  // Tower body, crown and mast, then its window grid with the word.
  const top = H - tower.h;
  front.append(
    el("rect", { x: tower.x, y: top, width: tower.w, height: tower.h + 2 }),
    el("rect", { x: tower.x + tower.w * 0.22, y: top - 12, width: tower.w * 0.56, height: 13 }),
    el("rect", { x: W / 2 - 0.9, y: top - 34, width: 1.8, height: 23 }),
  );
  beacons.append(el("circle", { cx: W / 2, cy: top - 35, r: 2 }));
  const cells = wordCells(TOWER.cols, TOWER.rows);
  const word = el("g", { filter: "url(#ts-glow)" }, "word");
  const gx = tower.x + 6;
  for (let r = 0; r < TOWER.rows; r++) {
    for (let c = 0; c < TOWER.cols; c++) {
      const x = gx + c * PX, y = top + 8 + r * PY;
      if (!cells.has(`${c},${r}`)) { frontPanes.push(`M${x} ${y}h${WIN_W}v${WIN_H}h${-WIN_W}z`); continue; }
      // the lit dots are a touch bigger than a window, and sweep on from the first letter to the last
      const dot = el("rect", { x: x - 0.5, y: y - 0.5, width: WIN_W + 1, height: WIN_H + 1 });
      dot.style.setProperty("--t", (0.5 + (c / TOWER.cols) * 0.32 + rnd() * 0.02).toFixed(3));
      dot.style.setProperty("--c", String(c));
      word.append(dot);
    }
  }

  const defs = el("defs", {});
  const glow = el("filter", { id: "ts-glow", x: "-10%", y: "-30%", width: "120%", height: "160%" });
  const merge = el("feMerge", {});
  merge.append(el("feMergeNode", { in: "blur" }), el("feMergeNode", { in: "SourceGraphic" }));
  glow.append(el("feGaussianBlur", { stdDeviation: 1.8, result: "blur" }), merge);
  defs.append(glow);

  // A train light running along the bottom of the town.
  const track = el("rect", { x: 0, y: H - 3, width: W, height: 1 }, "track");
  const train = el("rect", { x: -60, y: H - 6.5, width: 54, height: 3, rx: 1.5 }, "train");
  svg.append(
    defs, back, el("path", { d: backPanes.join("") }, "back-panes"), backLit,
    front, el("path", { d: frontPanes.join("") }, "panes"), frontLit, word, beacons, track, train,
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
