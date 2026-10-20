// The night behind the whole page: a field of lights on a fixed canvas. Lights near the pointer
// wake up and link to their neighbours; moving across the page (or clicking an empty spot) sends a
// job travelling from light to light, and each job that arrives calls onJob(), which writes a line
// in the shift log. With nobody steering, jobs start on their own every few seconds.
//
// The field is an endless grid in page space that scrolls at a fraction of the page speed, so it
// reads as depth. Every light's position, brightness and twinkle come from a hash of its grid
// coordinates, so the same light is always in the same place no matter how far you scroll.

const TAU = Math.PI * 2;
const COOL = [157, 176, 204];
const AMBER = [242, 176, 85];
const HOT = [255, 214, 150];

const PARALLAX = 0.35;              // the field moves at 35% of the page's scroll speed
const MAX_JOBS = 7;
const JOB_SPEED = 300;              // px per second along the path
const TRAVEL_PER_JOB = 320;         // px of pointer movement that kicks off a job
const AMBIENT_MIN = 2200, AMBIENT_JITTER = 1600;
const IGNORE_CLICKS = "a, button, input, textarea, select, label, summary, form, .log, .calc-panel, .audit-list, .chip";

const rand = Math.random;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Deterministic 0..1 noise for a grid cell and a channel.
function hash(i, g, k) {
  let h = (i * 374761393 + g * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function initNight(canvas, { onJob = () => {}, onUserJob = () => {}, reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let w = 0, h = 0, sp = 46, radius = 170, cols = 0;
  let shift = 0;                     // page-space offset of the field, from scroll
  const heat = new Map();            // key -> 0..1, lights recently passed by a job
  const jobs = [];                   // { path: [key], seg, t }
  const rings = [];                  // { key, t, big }
  const ptr = { x: -1e4, y: -1e4, lastX: null, lastY: null, travel: 0, lastMove: 0 };
  let raf = 0, lastT = 0, nextAmbient = 3000, skip = false;

  const key = (i, g) => g * 4096 + i;
  const keyI = (k) => ((k % 4096) + 4096) % 4096;
  const keyG = (k) => Math.round((k - keyI(k)) / 4096);
  const px = (i, g) => i * sp + (hash(i, g, 1) - 0.5) * sp * 0.55;
  const py = (i, g) => g * sp + (hash(i, g, 2) - 0.5) * sp * 0.55 - shift;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sp = w < 640 ? 38 : 46;
    radius = w < 640 ? 120 : 170;
    cols = Math.ceil(w / sp) + 1;
    heat.clear();
    jobs.length = 0;
    rings.length = 0;
    if (reduced) drawStatic();
  }

  function visibleRows() {
    return [Math.floor(shift / sp) - 1, Math.ceil((shift + h) / sp) + 1];
  }

  function nearest(x, y) {
    const ci = Math.round(x / sp), cg = Math.round((y + shift) / sp);
    let best = key(Math.max(0, Math.min(cols - 1, ci)), cg), bestD = Infinity;
    for (let dg = -1; dg <= 1; dg++) {
      for (let di = -1; di <= 1; di++) {
        const i = ci + di, g = cg + dg;
        if (i < 0 || i >= cols) continue;
        const d = (px(i, g) - x) ** 2 + (py(i, g) - y) ** 2;
        if (d < bestD) { bestD = d; best = key(i, g); }
      }
    }
    return best;
  }

  function neighbours(k) {
    const i = keyI(k), g = keyG(k), out = [];
    for (let dg = -1; dg <= 1; dg++) {
      for (let di = -1; di <= 1; di++) {
        if ((di || dg) && i + di >= 0 && i + di < cols) out.push(key(i + di, g + dg));
      }
    }
    return out;
  }

  function pickTarget(from) {
    const fx = px(keyI(from), keyG(from)), fy = py(keyI(from), keyG(from));
    const [g0, g1] = visibleRows();
    for (let tries = 0; tries < 24; tries++) {
      const i = (rand() * cols) | 0, g = g0 + 1 + ((rand() * (g1 - g0 - 2)) | 0);
      const d = Math.hypot(px(i, g) - fx, py(i, g) - fy);
      if (d > 220 && d < 560) return key(i, g);
    }
    return key((rand() * cols) | 0, g0 + 2);
  }

  // Greedy walk toward the target with a little wobble, so paths look like routing, not rulers.
  function makePath(start, target) {
    const path = [start];
    const seen = new Set(path);
    const tx = px(keyI(target), keyG(target)), ty = py(keyI(target), keyG(target));
    let cur = start;
    for (let step = 0; step < 48 && cur !== target; step++) {
      let best = -1, bestD = Infinity;
      for (const n of neighbours(cur)) {
        if (seen.has(n)) continue;
        const d = Math.hypot(px(keyI(n), keyG(n)) - tx, py(keyI(n), keyG(n)) - ty) * (0.82 + rand() * 0.36);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best < 0) break;
      path.push(best);
      seen.add(best);
      cur = best;
    }
    return path;
  }

  function startJob(x, y, byUser = false) {
    if (!cols || jobs.length >= MAX_JOBS) return;
    let start;
    if (x == null) {
      const [g0, g1] = visibleRows();
      start = key((rand() * cols) | 0, g0 + 1 + ((rand() * (g1 - g0 - 2)) | 0));
    } else {
      start = nearest(x, y);
    }
    const path = makePath(start, pickTarget(start));
    if (path.length < 3) return;
    heat.set(start, 1);
    rings.push({ key: start, t: 0, big: false });
    jobs.push({ path, seg: 0, t: 0 });
    if (byUser) onUserJob();
    wake();
  }

  function step(dt, now) {
    const keep = Math.exp(-dt / 650);

    for (let q = jobs.length - 1; q >= 0; q--) {
      const job = jobs[q];
      let remaining = (JOB_SPEED * dt) / 1000;
      while (remaining > 0 && job.seg < job.path.length - 1) {
        const a = job.path[job.seg], b = job.path[job.seg + 1];
        const len = Math.hypot(px(keyI(b), keyG(b)) - px(keyI(a), keyG(a)), py(keyI(b), keyG(b)) - py(keyI(a), keyG(a))) || 1;
        const left = (1 - job.t) * len;
        if (remaining >= left) {
          remaining -= left;
          job.seg++;
          job.t = 0;
          heat.set(job.path[job.seg], 1);
        } else {
          job.t += remaining / len;
          remaining = 0;
        }
      }
      if (job.seg >= job.path.length - 1) {
        rings.push({ key: job.path[job.path.length - 1], t: 0, big: true });
        jobs.splice(q, 1);
        onJob();
      }
    }

    if (now - ptr.lastMove > 2500) {
      nextAmbient -= dt;
      if (nextAmbient <= 0) {
        startJob();
        nextAmbient = AMBIENT_MIN + rand() * AMBIENT_JITTER;
      }
    }

    for (const [k, v] of heat) {
      const nv = v * keep;
      if (nv < 0.01) heat.delete(k); else heat.set(k, nv);
    }
    for (let q = rings.length - 1; q >= 0; q--) {
      rings[q].t += dt / (rings[q].big ? 900 : 600);
      if (rings[q].t >= 1) rings.splice(q, 1);
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const r2 = radius * radius;
    const [g0, g1] = visibleRows();
    const lit = [];

    ctx.fillStyle = rgba(COOL, 1);
    for (let g = g0; g <= g1; g++) {
      for (let i = 0; i < cols; i++) {
        const x = px(i, g), y = py(i, g);
        const dx = x - ptr.x, dy = y - ptr.y, dd = dx * dx + dy * dy;
        const near = dd < r2 ? (1 - Math.sqrt(dd) / radius) ** 2 : 0;
        const k = key(i, g);
        const glow = Math.min(1, near + (heat.get(k) || 0));
        if (glow >= 0.03) { lit.push({ k, i, g, x, y, glow }); continue; }
        const base = 0.07 + hash(i, g, 3) * 0.16;
        ctx.globalAlpha = base * (0.6 + 0.4 * Math.sin(now * 0.0011 + hash(i, g, 4) * TAU));
        ctx.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
      }
    }
    ctx.globalAlpha = 1;

    // Links between awake neighbours (each pair once: right, down-left, down, down-right).
    const glowOf = new Map(lit.map((d) => [d.k, d]));
    ctx.lineWidth = 1;
    for (const d of lit) {
      if (d.glow < 0.05) continue;
      for (const [di, dg] of [[1, 0], [-1, 1], [0, 1], [1, 1]]) {
        const n = glowOf.get(key(d.i + di, d.g + dg));
        if (!n) continue;
        const gl = Math.min(d.glow, n.glow);
        if (gl < 0.05) continue;
        ctx.strokeStyle = rgba(AMBER, (gl * 0.5).toFixed(3));
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
    }

    for (const d of lit) {
      ctx.fillStyle = rgba(mix(COOL, AMBER, Math.min(1, d.glow * 1.4)), (0.25 + d.glow * 0.75).toFixed(3));
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1 + d.glow * 1.7, 0, TAU);
      ctx.fill();
    }

    for (const job of jobs) {
      const a = job.path[job.seg], b = job.path[Math.min(job.seg + 1, job.path.length - 1)];
      const ax = px(keyI(a), keyG(a)), ay = py(keyI(a), keyG(a));
      const hx = ax + (px(keyI(b), keyG(b)) - ax) * job.t, hy = ay + (py(keyI(b), keyG(b)) - ay) * job.t;
      let lx = hx, ly = hy;
      for (let k = 0; k < 5 && job.seg - k >= 0; k++) {
        const p = job.path[job.seg - k];
        const qx = px(keyI(p), keyG(p)), qy = py(keyI(p), keyG(p));
        ctx.strokeStyle = rgba(HOT, (0.75 * (1 - k / 5)).toFixed(3));
        ctx.lineWidth = 2 - k * 0.3;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(qx, qy);
        ctx.stroke();
        lx = qx; ly = qy;
      }
      ctx.fillStyle = rgba(AMBER, 0.18);
      ctx.beginPath(); ctx.arc(hx, hy, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(HOT, 1);
      ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fill();
    }

    for (const ring of rings) {
      const e = 1 - (1 - ring.t) ** 3;
      ctx.strokeStyle = rgba(AMBER, ((1 - ring.t) * 0.8).toFixed(3));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px(keyI(ring.key), keyG(ring.key)), py(keyI(ring.key), keyG(ring.key)), 3 + e * (ring.big ? 30 : 16), 0, TAU);
      ctx.stroke();
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = rgba(COOL, 1);
    const [g0, g1] = visibleRows();
    for (let g = g0; g <= g1; g++) {
      for (let i = 0; i < cols; i++) {
        ctx.globalAlpha = 0.07 + hash(i, g, 3) * 0.16;
        ctx.fillRect(px(i, g) - 0.7, py(i, g) - 0.7, 1.4, 1.4);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(50, lastT ? now - lastT : 16);
    lastT = now;
    shift = window.scrollY * PARALLAX;
    step(dt, now);
    // Nothing moving and nobody pointing: half frame rate is plenty for a twinkle.
    const idle = !jobs.length && !rings.length && now - ptr.lastMove > 1500;
    skip = idle ? !skip : false;
    if (!skip) draw(now);
    // A job started during step() may already have queued the next frame through wake().
    if (raf) return;
    if (!document.hidden) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }

  function wake() {
    if (!reduced && !raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function onPointerMove(e) {
    const x = e.clientX, y = e.clientY;
    if (ptr.lastX != null) ptr.travel += Math.hypot(x - ptr.lastX, y - ptr.lastY);
    ptr.x = ptr.lastX = x;
    ptr.y = ptr.lastY = y;
    ptr.lastMove = performance.now();
    if (ptr.travel > TRAVEL_PER_JOB) { ptr.travel = 0; startJob(x, y, true); }
  }

  function onPointerDown(e) {
    if (e.button > 0 || (e.target.closest && e.target.closest(IGNORE_CLICKS))) return;
    ptr.lastMove = performance.now();
    startJob(e.clientX, e.clientY, true);
    startJob(e.clientX, e.clientY);
  }

  function forgetPointer() { ptr.x = ptr.y = -1e4; ptr.lastX = null; }

  resize();
  if (reduced) {
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", () => { shift = window.scrollY * PARALLAX; drawStatic(); }, { passive: true });
    return { startJob() {} };
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); }, { passive: true });
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", (e) => { if (e.pointerType === "touch") forgetPointer(); }, { passive: true });
  window.addEventListener("pointercancel", forgetPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", forgetPointer);
  document.addEventListener("pointerdown", onPointerDown, { passive: true });
  wake();

  // startJob(x, y) in viewport coordinates, for other parts of the page to set off a job.
  return { startJob: (x, y) => startJob(x, y, true) };
}
