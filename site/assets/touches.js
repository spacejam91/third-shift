// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The page answering the visitor, each touch tied to the work rather than decoration:
//  - the carbon copies under the time card drift with the pointer, like loose sheets on a desk;
//  - a marker glides to the line under the pointer in the page's lists, the way you'd slide a ruler
//    down a printed form to keep your place;
//  - a lamp follows the pointer across the black band, like working by a desk lamp at night;
//  - the opening statement fills in word by word as you read down to it (scroll, so phones get it too).
// The pointer ones are mouse only (nothing on touch screens), and none of it runs with reduced motion.
// None of them moves the layout: the copies and the marker move by transform, the lamp is a background
// and the statement only changes colour, so nothing on the page shifts. Every write goes through the
// CSSOM, which the Content-Security-Policy allows without 'unsafe-inline'.

export function initTouches({ reduced = false, finePointer = false } = {}) {
  if (reduced) return;
  initReading();
  if (!finePointer) return;
  initSheets();
  initRowMarkers();
  initLamps();
}

// --sx and --sy run from -1 to 1 across the opening; styles.css turns them into how far each copy
// slides. Eased toward the pointer a little each frame, so the paper lags the hand.
function initSheets() {
  for (const stage of document.querySelectorAll(".hero, .svc-hero")) {
    if (!stage.querySelector(".log")) continue;
    let x = 0, y = 0, tx = 0, ty = 0, frame = 0;
    const step = () => {
      x += (tx - x) * 0.09;
      y += (ty - y) * 0.09;
      stage.style.setProperty("--sx", x.toFixed(3));
      stage.style.setProperty("--sy", y.toFixed(3));
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const go = () => { if (!frame) frame = requestAnimationFrame(step); };
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      go();
    });
    stage.addEventListener("pointerleave", () => { tx = 0; ty = 0; go(); });
  }
}

function initRowMarkers() {
  const LISTS = [
    // name, list, its lines, and how far the marker reaches past the line on each side (into the margin,
    // so its edge sits beside the words rather than on them)
    ["cards", ".cards", ":scope > li", 16],
    ["steps", ".steps", ":scope > li", 16],
    ["audit", ".audit-list ul", ":scope > li", 0],
    ["faq", ".faq-list", ":scope > details", 16],
    ["more", ".more-list", ":scope > li", 16],
    ["log", ".log-rows", ":scope > li", 0],
  ];
  for (const [name, listSelector, rowSelector, reach] of LISTS) {
    const rowTag = rowSelector.replace(":scope > ", "");
    for (const list of document.querySelectorAll(listSelector)) {
      const host = list.parentElement;
      const marker = document.createElement("span");
      marker.className = "row-marker is-jump";
      marker.dataset.list = name;
      marker.setAttribute("aria-hidden", "true");
      host.classList.add("marker-host");
      list.before(marker);
      let current = null, px = 0, py = 0;
      const place = (row) => {
        const r = row.getBoundingClientRect();
        const h = host.getBoundingClientRect();
        marker.style.transform = `translate(${(r.left - h.left - reach).toFixed(1)}px, ${(r.top - h.top).toFixed(1)}px)`;
        marker.style.width = `${(r.width + 2 * reach).toFixed(1)}px`;
        marker.style.height = `${r.height.toFixed(1)}px`;
      };
      list.addEventListener("pointermove", (e) => {
        px = e.clientX;
        py = e.clientY;
        const row = e.target.closest(rowTag);
        if (!row || row.parentElement !== list) return;
        if (!marker.classList.contains("is-on")) {
          // The first line it lands on, it appears in place; after that it glides between lines.
          marker.classList.add("is-jump");
          place(row);
          marker.getBoundingClientRect();
          marker.classList.remove("is-jump");
          marker.classList.add("is-on");
        } else if (row !== current || row.tagName === "DETAILS") {
          place(row);
        }
        current = row;
      });
      list.addEventListener("pointerleave", () => { marker.classList.remove("is-on"); current = null; });
      // An answer opening or closing changes the line's height under a still pointer, and a new row
      // in the shift log moves the others up under it: follow whichever line is under it now.
      list.addEventListener("toggle", () => { if (current) place(current); }, true);
      new MutationObserver(() => {
        if (!current) return;
        setTimeout(() => {
          const row = document.elementFromPoint(px, py)?.closest(rowTag);
          if (row && row.parentElement === list) { current = row; place(row); }
        }, 650);
      }).observe(list, { childList: true });
    }
  }
}

function initLamps() {
  for (const band of document.querySelectorAll("#trust, .cta-end")) {
    band.classList.add("has-lamp");
    let x = 0, y = 0, tx = 0, ty = 0, frame = 0, lit = false;
    const step = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      band.style.setProperty("--lx", `${x.toFixed(1)}px`);
      band.style.setProperty("--ly", `${y.toFixed(1)}px`);
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    band.addEventListener("pointermove", (e) => {
      const r = band.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!lit) { lit = true; x = tx; y = ty; band.classList.add("lamp-on"); }
      if (!frame) frame = requestAnimationFrame(step);
    });
    band.addEventListener("pointerleave", () => { lit = false; band.classList.remove("lamp-on"); });
  }
}

// The statement under "What we take off your plate" is set big and starts out grey; each word turns
// to ink as the reader scrolls down to it, all of it lit by the time its last line is halfway up the
// screen. Only colour changes, so the words never move.
function initReading() {
  const el = document.querySelector("#services .intro");
  if (!el) return;
  const words = [];
  const wrap = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) { wrap(child); continue; }
      if (child.nodeType !== Node.TEXT_NODE) continue;
      const frag = document.createDocumentFragment();
      for (const part of child.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(part); continue; }
        const w = document.createElement("span");
        w.className = "w";
        w.textContent = part;
        words.push(w);
        frag.append(w);
      }
      child.replaceWith(frag);
    }
  };
  wrap(el);
  el.classList.add("reading");
  let lit = 0, queued = false;
  const update = () => {
    queued = false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.88 - r.top) / (vh * 0.38 + r.height)));
    const n = Math.round(p * words.length);
    if (n === lit) return;
    for (let i = Math.min(n, lit); i < Math.max(n, lit); i++) words[i].classList.toggle("is-lit", i < n);
    lit = n;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  update();
}
