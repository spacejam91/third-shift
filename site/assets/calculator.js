// The "What is the repetitive work costing you?" calculator.

import { estimate, formatHours, formatMoney, formatWeeks, summarize } from "./estimate.js";

const VERDICTS = {
  strong: ["Strong candidate.", " This is the kind of work we’d build first."],
  worth: ["Worth a look.", " Usually one focused build, and worth a call to check."],
  not: ["Probably not worth a build yet.", " We’d tell you the same on the call. Small, occasional jobs rarely pay back."],
};

export function initCalculator({ reduced = false, onSend = () => {} } = {}) {
  const hours = document.getElementById("c-hours");
  const rate = document.getElementById("c-rate");
  const fits = document.querySelectorAll('input[name="c-fit"]');
  const out = {
    hoursLabel: document.getElementById("o-hours"),
    rateLabel: document.getElementById("o-rate"),
    hours: document.getElementById("r-hours"),
    dollars: document.getElementById("r-dollars"),
    weeks: document.getElementById("r-weeks"),
    verdict: document.getElementById("r-verdict"),
    live: document.getElementById("calc-live"),
  };
  const send = document.getElementById("calc-send");
  if (!hours || !rate || !fits.length || !out.hours) return null;
  const nights = initNights(document.getElementById("nights"), document.getElementById("r-nights"));

  const shown = { hours: 0, dollars: 0, weeks: 0 };
  let animRaf = 0, liveTimer = 0;

  function input() {
    const fit = [...fits].find((f) => f.checked)?.value || "mostly";
    return { hoursPerWeek: Number(hours.value), hourlyCost: Number(rate.value), fit };
  }

  function fill(range) {
    const p = ((range.value - range.min) / (range.max - range.min)) * 100;
    range.style.setProperty("--fill", p.toFixed(1) + "%");
  }

  function paint(values) {
    out.hours.textContent = formatHours(values.hours);
    out.dollars.textContent = formatMoney(values.dollars);
    out.weeks.textContent = formatWeeks(values.weeks);
  }

  // Count from what's on screen to the new numbers.
  function animateTo(target) {
    cancelAnimationFrame(animRaf);
    if (reduced) { Object.assign(shown, target); paint(shown); return; }
    const from = { ...shown };
    const start = performance.now();
    const dur = 420;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - (1 - t) ** 3;
      for (const k of Object.keys(target)) shown[k] = from[k] + (target[k] - from[k]) * e;
      paint(shown);
      if (t < 1) animRaf = requestAnimationFrame(tick);
    };
    animRaf = requestAnimationFrame(tick);
  }

  function update() {
    const inp = input();
    const res = estimate(inp);
    out.hoursLabel.textContent = String(inp.hoursPerWeek);
    out.rateLabel.textContent = formatMoney(inp.hourlyCost);
    hours.setAttribute("aria-valuetext", `${inp.hoursPerWeek} hours a week`);
    rate.setAttribute("aria-valuetext", `${formatMoney(inp.hourlyCost)} an hour`);
    fill(hours);
    fill(rate);
    animateTo({ hours: res.hoursBack, dollars: res.dollars, weeks: res.weeks });
    nights.set(Math.round(res.hoursBack / 8));

    const [lead, rest] = VERDICTS[res.level];
    const strong = document.createElement("strong");
    strong.textContent = lead;
    out.verdict.replaceChildren(strong, document.createTextNode(rest));
    out.verdict.dataset.level = res.level;

    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      out.live.textContent = `About ${formatHours(res.hoursBack)} hours and ${formatMoney(res.dollars)} a year. ${lead}`;
    }, 700);
    return { inp, res };
  }

  hours.addEventListener("input", update);
  rate.addEventListener("input", update);
  fits.forEach((f) => f.addEventListener("change", update));
  send?.addEventListener("click", () => {
    const { inp, res } = update();
    onSend(summarize(inp, res));
  });

  // Start from the HTML's numbers so the first paint doesn't count up from zero.
  const first = estimate(input());
  Object.assign(shown, { hours: first.hoursBack, dollars: first.dollars, weeks: first.weeks });
  update();
  return { update };
}

// A year of nights as a 7 x 52 grid of dots; one lights for every eight-hour shift the work adds up to.
// The grid fills the first time it scrolls into view, then follows the sliders.
function initNights(grid, num) {
  const DOTS = 364;
  const dots = [];
  let lit = 0, want = 0, ready = !grid || !("IntersectionObserver" in window);
  if (grid) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < DOTS; i++) dots.push(frag.appendChild(document.createElement("i")));
    grid.append(frag);
    if (!ready) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        ready = true;
        paint();
      }, { threshold: 0.4 });
      io.observe(grid);
    }
  }
  function paint() {
    const target = Math.min(DOTS, want);
    if (!dots.length || target === lit) return;
    const up = target > lit;
    const lo = Math.min(target, lit), hi = Math.max(target, lit);
    // Only the dots that change get a stagger, so small slider moves feel immediate.
    for (let i = lo; i < hi; i++) {
      dots[i].style.setProperty("--k", String(up ? i - lo : hi - 1 - i));
      dots[i].classList.toggle("on", up);
    }
    lit = target;
  }
  return {
    set(n) {
      want = Math.max(0, n);
      if (num) num.textContent = String(want);
      if (ready) paint();
    },
  };
}
