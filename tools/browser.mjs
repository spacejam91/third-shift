// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// A headless Edge or Chrome driven over the DevTools protocol, shared by the brand and motion exporters.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Chrome first: Edge's efficiency mode can stall a hidden renderer for seconds at a time on Windows.
const BROWSERS = [
  process.env.BROWSER,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// extraArgs go on the browser's command line, e.g. "--disable-lcd-text" for the videos
export async function openBrowser(port, extraArgs = []) {
  const exe = BROWSERS.find((p) => p && fs.existsSync(p));
  if (!exe) throw new Error("Install Microsoft Edge or Google Chrome first.");
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ts-brand-"));
  const child = spawn(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb",
    // a headless window counts as hidden; without these it gets throttled and stalls long renders
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling", ...extraArgs,
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

  let url = null;
  for (let i = 0; i < 60 && !url; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      url = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    if (!url) await sleep(200);
  }
  if (!url) { child.kill(); throw new Error("The browser did not start."); }

  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0;
  let closed = false;
  const waiting = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  // If the browser goes away mid-run, fail every pending call instead of waiting forever.
  const fail = (why) => {
    closed = true;
    for (const done of waiting.values()) done({ error: { message: why } });
    waiting.clear();
  };
  ws.addEventListener("close", () => fail("the browser closed"));
  child.on("exit", () => fail("the browser exited"));
  const send = (method, params = {}, timeoutMs = 30000) => new Promise((resolve, reject) => {
    if (closed) { reject(new Error(`${method}: the browser is gone`)); return; }
    const id = ++seq;
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`${method}: no answer in ${timeoutMs / 1000}s`)); }, timeoutMs);
    waiting.set(id, (m) => { clearTimeout(timer); m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result); });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  await send("Page.enable");

  return {
    send,
    evaluate,
    // Size the viewport, load the page and wait for it to set body[data-ready].
    async load(url, { w, h, dsf = 1, clear = false }) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dsf, mobile: false });
      await send("Emulation.setDefaultBackgroundColorOverride", clear ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
      await send("Page.navigate", { url });
      for (let i = 0; i < 150; i++) {
        await sleep(100);
        if (await evaluate("document.body && document.body.dataset.ready === '1'").catch(() => false)) return;
      }
      throw new Error("Page never finished: " + url);
    },
    async close() {
      ws.close();
      child.kill();
      await sleep(300);
      // Windows can hold the profile's files for a moment after the browser exits; a temp folder left
      // behind is harmless, so it never fails the export.
      try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* left for the OS */ }
    },
  };
}
