// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Renders the animated logos in tools/brand/motion.html to MP4 for X, Instagram, TikTok and LinkedIn.
//
//   node tools/render-motion.mjs                    every video, into social-kit/motion/
//   node tools/render-motion.mjs story              only the videos whose file name contains "story"
//   node tools/render-motion.mjs --stills 2.6,8 --to <folder>
//                                                   still PNGs at those seconds instead, for checking
//
// Needs Edge or Chrome, and ffmpeg (winget install Gyan.FFmpeg.Essentials). Each frame is drawn from
// its time alone and screenshotted, so the output is the same on every run, whatever the machine speed.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openBrowser } from "./browser.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = pathToFileURL(path.join(root, "tools", "brand", "motion.html")).href;
const FPS = 30;

const VIDEOS = [
  { out: "logo-reveal-1080x1080.mp4", w: 1080, h: 1080, scene: "reveal" },
  { out: "logo-reveal-story-1080x1920.mp4", w: 1080, h: 1920, scene: "reveal" },
  { out: "logo-reveal-wide-1920x1080.mp4", w: 1920, h: 1080, scene: "reveal" },
  { out: "overnight-shift-1080x1350.mp4", w: 1080, h: 1350, scene: "shift" },
  { out: "overnight-shift-story-1080x1920.mp4", w: 1080, h: 1920, scene: "shift" },
];

const args = process.argv.slice(2);
const flag = (name) => { const k = args.indexOf(name); return k < 0 ? null : args.splice(k, 2)[1]; };
const stills = flag("--stills");
const stillsTo = flag("--to");
const filter = args[0] || "";
const todo = VIDEOS.filter((v) => v.out.includes(filter));
if (!todo.length) throw new Error("No video matches " + filter);

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  // winget adds this folder to PATH, but only for shells opened after the install
  const links = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "ffmpeg.exe");
  return fs.existsSync(links) ? links : "ffmpeg";
}

function encoder(file) {
  const ff = spawn(ffmpegPath(), [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    // a silent audio track: some upload paths reject video with no audio stream at all
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-shortest",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-x264-params", "aq-mode=3",
    "-profile:v", "high", "-level", "4.2",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart",
    file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (code) => (code ? rej(new Error("ffmpeg exited with " + code)) : res())));
  return {
    write: (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once("drain", res))),
    end: () => { ff.stdin.end(); return done; },
  };
}

let browser = await openBrowser(9335);
try {
  for (const v of todo) {
    const url = `${page}?scene=${v.scene}`;
    await browser.load(url, v);
    const duration = await browser.evaluate("window.DURATION");
    // Frames depend only on t, so if the browser dies part-way, a fresh one picks up the same frame.
    const shoot = async (t, tries = 3) => {
      try {
        await browser.evaluate(`window.frame(${t})`);
        return Buffer.from((await browser.send("Page.captureScreenshot", { format: "png" })).data, "base64");
      } catch (err) {
        if (!tries) throw err;
        console.error(`
frame at ${t}s failed (${err.message}); restarting the browser`);
        await browser.close().catch(() => {});
        browser = await openBrowser(9335);
        await browser.load(url, v);
        return shoot(t, tries - 1);
      }
    };

    if (stills) {
      const dir = stillsTo || path.join(root, "tmp-stills");
      fs.mkdirSync(dir, { recursive: true });
      for (const t of stills.split(",").map(Number)) {
        const file = path.join(dir, `${v.out.replace(".mp4", "")}-${t}s.png`);
        fs.writeFileSync(file, await shoot(t));
        console.log("wrote", file);
      }
      continue;
    }

    const file = path.join(root, "social-kit", "motion", v.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const enc = encoder(file);
    const frames = Math.round(duration * FPS);
    const started = Date.now();
    for (let k = 0; k < frames; k++) {
      await enc.write(await shoot(k / FPS));
      if (k % 60 === 0) process.stdout.write(`\r${v.out}  ${k}/${frames}`);
    }
    await enc.end();
    console.log(`\rwrote social-kit/motion/${v.out}  ${frames} frames in ${Math.round((Date.now() - started) / 1000)}s`);
  }
} finally {
  await browser.close();
}
process.exit(0);
