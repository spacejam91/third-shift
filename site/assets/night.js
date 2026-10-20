// The hero background: a field of lights over the night. Lights near the pointer wake up and link to
// their neighbours; moving across the field (or tapping it) sends a job travelling from light to
// light. When a job arrives it calls onJob(), which writes a line in the shift log. With no pointer
// around, jobs start on their own every few seconds so the page is alive on phones too.

const TAU = Math.PI * 2;
const COOL = [157, 176, 204];
const AMBER = [242, 176, 85];
const HOT = [255, 214, 150];

const MAX_JOBS = 6;
const JOB_SPEED = 300;            // px per second along the path
const TRAVEL_PER_JOB = 340;       // px of pointer movement that kicks off a job
const AMBIENT_MIN = 2200, AMBIENT_JITTER = 1600;   // ms between self-started jobs

const rand = Math.random;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export function initNight(canvas, { onJob = () => {}, reduced = false } = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const hero = canvas.parentElement;

  let w = 0, h = 0, spacing = 46, radius = 170;
  let dots = [];
  const jobs = [];
  const rings = [];
  const ptr = { x: -1e4, y: -1e4, lastX: null, lastY: null, travel: 0, lastMove: 0 };
  let inView = true, raf = 0, lastT = 0, nextAmbient = 3000;

  function build() {
    const r = hero.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = w < 640 ? 38 : 46;
    radius = w < 640 ? 120 : 170;
    const cols = Math.ceil(w / spacing) + 1;
    const rows = Math.ceil(h / spacing) + 1;
    dots = new Array(cols * rows);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        dots[j * cols + i] = {
          x: i * spacing + (rand() - 0.5) * spacing * 0.55,
          y: j * spacing + (rand() - 0.5) * spacing * 0.55,
          base: 0.07 + rand() * 0.16,
          phase: rand() * TAU,
          heat: 0,
          glow: 0,
          n: [],
        };
      }
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const d = dots[j * cols + i];
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            if (!di && !dj) continue;
            const ni = i + di, nj = j + dj;
            if (ni >= 0 && nj >= 0 && ni < cols && nj < rows) d.n.push(nj * cols + ni);
          }
        }
      }
    }
    jobs.length = 0;
    rings.length = 0;
    if (reduced) drawStatic();
  }

  function nearestDot(x, y) {
    let best = 0, bestD = Infinity;
    for (let k = 0; k < dots.length; k++) {
      const dx = dots[k].x - x, dy = dots[k].y - y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = k; }
    }
    return best;
  }

  function pickTarget(from) {
    const a = dots[from];
    for (let tries = 0; tries < 24; tries++) {
      const k = (rand() * dots.length) | 0;
      const b = dots[k];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > 220 && d < 560 && b.x > 10 && b.y > 10 && b.x < w - 10 && b.y < h - 10) return k;
    }
    return (rand() * dots.length) | 0;
  }

  // Greedy walk toward the target with a little wobble, so paths look like routing, not rulers.
  function makePath(start, target) {
    const path = [start];
    const seen = new Set(path);
    const T = dots[target];
    let cur = start;
    for (let step = 0; step < 48 && cur !== target; step++) {
      let best = -1, bestD = Infinity;
      for (const n of dots[cur].n) {
        if (seen.has(n)) continue;
        const d = Math.hypot(dots[n].x - T.x, dots[n].y - T.y) * (0.82 + rand() * 0.36);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best < 0) break;
      path.push(best);
      seen.add(best);
      cur = best;
    }
    return path;
  }

  function startJob(fromX, fromY) {
    if (!dots.length || jobs.length >= MAX_JOBS) return;
    const start = fromX == null ? (rand() * dots.length) | 0 : nearestDot(fromX, fromY);
    const path = makePath(start, pickTarget(start));
    if (path.length < 3) return;
    dots[start].heat = 1;
    rings.push({ x: dots[start].x, y: dots[start].y, t: 0, big: false });
    jobs.push({ path, seg: 0, t: 0 });
    wake();
  }

  function step(dt, now) {
    const heatKeep = Math.exp(-dt / 650);

    // Jobs move first so the lights they pass get their heat this frame.
    for (let q = jobs.length - 1; q >= 0; q--) {
      const job = jobs[q];
      let remaining = (JOB_SPEED * dt) / 1000;
      while (remaining > 0 && job.seg < job.path.length - 1) {
        const a = dots[job.path[job.seg]], b = dots[job.path[job.seg + 1]];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const left = (1 - job.t) * len;
        if (remaining >= left) {
          remaining -= left;
          job.seg++;
          job.t = 0;
          dots[job.path[job.seg]].heat = 1;
        } else {
          job.t += remaining / len;
          remaining = 0;
        }
      }
      if (job.seg >= job.path.length - 1) {
        const end = dots[job.path[job.path.length - 1]];
        rings.push({ x: end.x, y: end.y, t: 0, big: true });
        jobs.splice(q, 1);
        onJob();
      }
    }

    // Self-started jobs when nobody is steering.
    if (now - ptr.lastMove > 2500) {
      nextAmbient -= dt;
      if (nextAmbient <= 0) {
        startJob();
        nextAmbient = AMBIENT_MIN + rand() * AMBIENT_JITTER;
      }
    }

    for (const d of dots) d.heat *= heatKeep;
    for (let q = rings.length - 1; q >= 0; q--) {
      rings[q].t += dt / (rings[q].big ? 900 : 600);
      if (rings[q].t >= 1) rings.splice(q, 1);
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const r2 = radius * radius;

    // Quiet lights: one fill colour, alpha per light, squares are cheaper than arcs at this size.
    ctx.fillStyle = rgba(COOL, 1);
    for (const d of dots) {
      const dx = d.x - ptr.x, dy = d.y - ptr.y, dd = dx * dx + dy * dy;
      const near = dd < r2 ? (1 - Math.sqrt(dd) / radius) ** 2 : 0;
      d.glow = Math.min(1, near + d.heat);
      if (d.glow < 0.03) {
        ctx.globalAlpha = d.base * (0.6 + 0.4 * Math.sin(now * 0.0011 + d.phase));
        ctx.fillRect(d.x - 0.7, d.y - 0.7, 1.4, 1.4);
      }
    }
    ctx.globalAlpha = 1;

    // Links between awake neighbours.
    ctx.lineWidth = 1;
    for (let k = 0; k < dots.length; k++) {
      const d = dots[k];
      if (d.glow < 0.05) continue;
      for (const n of d.n) {
        if (n < k) continue;
        const g = Math.min(d.glow, dots[n].glow);
        if (g < 0.05) continue;
        ctx.strokeStyle = rgba(AMBER, (g * 0.5).toFixed(3));
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(dots[n].x, dots[n].y);
        ctx.stroke();
      }
    }

    // Awake lights.
    for (const d of dots) {
      if (d.glow < 0.03) continue;
      ctx.fillStyle = rgba(mix(COOL, AMBER, Math.min(1, d.glow * 1.4)), (0.25 + d.glow * 0.75).toFixed(3));
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1 + d.glow * 1.7, 0, TAU);
      ctx.fill();
    }

    // Jobs: a bright head with a fading trail back along the path.
    for (const job of jobs) {
      const a = dots[job.path[job.seg]], b = dots[job.path[Math.min(job.seg + 1, job.path.length - 1)]];
      const hx = a.x + (b.x - a.x) * job.t, hy = a.y + (b.y - a.y) * job.t;
      let px = hx, py = hy;
      for (let k = 0; k < 5 && job.seg - k >= 0; k++) {
        const p = dots[job.path[job.seg - k]];
        ctx.strokeStyle = rgba(HOT, (0.75 * (1 - k / 5)).toFixed(3));
        ctx.lineWidth = 2 - k * 0.3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        px = p.x; py = p.y;
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
      ctx.arc(ring.x, ring.y, 3 + e * (ring.big ? 30 : 16), 0, TAU);
      ctx.stroke();
    }
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = rgba(COOL, 1);
    for (const d of dots) {
      ctx.globalAlpha = d.base;
      ctx.fillRect(d.x - 0.7, d.y - 0.7, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(50, lastT ? now - lastT : 16);
    lastT = now;
    step(dt, now);
    draw(now);
    // A job started during step() may already have queued the next frame through wake().
    if (raf) return;
    if (inView && !document.hidden) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }

  function wake() {
    if (!reduced && !raf && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { ptr.x = ptr.y = -1e4; ptr.lastX = null; return; }
    if (ptr.lastX != null) ptr.travel += Math.hypot(x - ptr.lastX, y - ptr.lastY);
    ptr.x = ptr.lastX = x;
    ptr.y = ptr.lastY = y;
    ptr.lastMove = performance.now();
    if (ptr.travel > TRAVEL_PER_JOB) { ptr.travel = 0; startJob(x, y); }
  }

  function onPointerDown(e) {
    if (e.target.closest("a, button, input, textarea, label, .log")) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ptr.lastMove = performance.now();
    startJob(x, y);
    startJob(x, y);
  }

  function forgetPointer() { ptr.x = ptr.y = -1e4; ptr.lastX = null; }

  build();
  if (reduced) {
    new ResizeObserver(() => build()).observe(hero);
    return { startJob() {} };
  }

  let resizeTimer = 0;
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 120); }).observe(hero);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; wake(); }).observe(hero);
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", (e) => { if (e.pointerType === "touch") forgetPointer(); }, { passive: true });
  window.addEventListener("pointercancel", forgetPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", forgetPointer);
  hero.addEventListener("pointerdown", onPointerDown);
  wake();

  return { startJob };
}
