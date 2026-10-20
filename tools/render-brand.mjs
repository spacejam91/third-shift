// Exports every logo, icon, social banner and the link-preview image from tools/brand/art.html.
//
//   node tools/render-brand.mjs            (needs Microsoft Edge or Google Chrome installed)
//
// Drives a headless browser over the DevTools protocol so it can wait for the fonts, crop the
// wordmarks tight, and keep transparent backgrounds transparent. Writes to brand/ (files to upload
// to social profiles) and site/ (favicons, app icons, the share image).

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const art = pathToFileURL(path.join(root, "tools", "brand", "art.html")).href;

// out, kind, size, query, and options: dsf (device scale), clip (selector to crop to), clear (transparent)
const JOBS = [
  // Site icons
  { out: "site/apple-touch-icon.png", w: 180, h: 180, q: "kind=mark&bg=night&net=0&scale=.6&glow=0" },
  { out: "site/icon-192.png", w: 192, h: 192, q: "kind=mark&bg=night&net=0&scale=.56&glow=0" },
  { out: "site/icon-512.png", w: 512, h: 512, q: "kind=mark&bg=night&net=0&scale=.54" },
  { out: "tmp:fav-16", w: 16, h: 16, q: "kind=mark&bg=none&scale=1", clear: true },
  { out: "tmp:fav-32", w: 32, h: 32, q: "kind=mark&bg=none&scale=1", clear: true },
  { out: "tmp:fav-48", w: 48, h: 48, q: "kind=mark&bg=none&scale=1", clear: true },
  { out: "site/assets/og-image.png", w: 1200, h: 630, q: "kind=og" },

  // Social profiles
  { out: "brand/profile-picture.png", w: 1080, h: 1080, q: "kind=mark&bg=night&scale=.46" },
  { out: "brand/logo-mark.png", w: 1024, h: 1024, q: "kind=mark&bg=none&scale=.92", clear: true },
  { out: "brand/logo-for-dark-backgrounds.png", w: 3000, h: 600, q: "kind=wordmark&theme=dark", clip: "#logo", clear: true },
  { out: "brand/logo-for-light-backgrounds.png", w: 3000, h: 600, q: "kind=wordmark&theme=light", clip: "#logo", clear: true },
  { out: "brand/linkedin-cover-1584x396.png", w: 1584, h: 396, q: "kind=banner" },
  { out: "brand/linkedin-page-cover-1128x191.png", w: 1128, h: 191, q: "kind=banner", dsf: 2 },
  { out: "brand/x-header-1500x500.png", w: 1500, h: 500, q: "kind=banner" },
  { out: "brand/facebook-cover-1640x624.png", w: 1640, h: 624, q: "kind=banner&inset=.19" },
  { out: "brand/instagram-post-1080.png", w: 1080, h: 1080, q: "kind=square" },
];

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const exe = BROWSERS.find((p) => fs.existsSync(p));
if (!exe) throw new Error("Install Microsoft Edge or Google Chrome first.");

const port = 9334;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ts-brand-"));
const browser = spawn(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageSocket() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error("The browser did not start.");
}

const ws = new WebSocket(await pageSocket());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const waiting = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

const icoParts = {};
try {
  await send("Page.enable");
  for (const job of JOBS) {
    const dsf = job.dsf || 1;
    await send("Emulation.setDeviceMetricsOverride", { width: job.w, height: job.h, deviceScaleFactor: dsf, mobile: false });
    await send("Emulation.setDefaultBackgroundColorOverride", job.clear ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
    await send("Page.navigate", { url: `${art}?${job.q}` });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) { await sleep(100); ready = await evaluate("document.body && document.body.dataset.ready === '1'").catch(() => false); }
    if (!ready) throw new Error("Art page never finished: " + job.q);
    await sleep(150);

    const params = { format: "png", captureBeyondViewport: false };
    if (job.clip) {
      const r = await evaluate(`(() => { const b = document.querySelector(${JSON.stringify(job.clip)}).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })()`);
      params.clip = { x: r.x, y: r.y, width: Math.ceil(r.width), height: Math.ceil(r.height), scale: 1 };
    }
    const shot = await send("Page.captureScreenshot", params);
    const png = Buffer.from(shot.data, "base64");
    if (job.out.startsWith("tmp:")) {
      icoParts[job.out.slice(4)] = { png, size: job.w };
    } else {
      const file = path.join(root, job.out);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, png);
    }
    console.log("wrote", job.out);
  }

  // favicon.ico holding 16, 32 and 48 px PNGs (the ICO format allows PNG entries).
  const parts = ["fav-16", "fav-32", "fav-48"].map((k) => icoParts[k]);
  const header = Buffer.alloc(6 + parts.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(parts.length, 4);
  let offset = header.length;
  parts.forEach((p, i) => {
    const at = 6 + i * 16;
    header.writeUInt8(p.size, at);
    header.writeUInt8(p.size, at + 1);
    header.writeUInt8(0, at + 2);
    header.writeUInt8(0, at + 3);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(p.png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += p.png.length;
  });
  fs.writeFileSync(path.join(root, "site", "favicon.ico"), Buffer.concat([header, ...parts.map((p) => p.png)]));
  console.log("wrote site/favicon.ico");
} finally {
  ws.close();
  browser.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
process.exit(0);
