// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Renders the animated videos in tools/brand/motion.html to MP4 for X, Instagram, TikTok and LinkedIn.
//
//   npm run motion                                  every video: the black-on-white set into
//                                                   social-kit/motion/, the night set into motion/night/,
//                                                   one night per industry page into motion/industries/
//   npm run motion -- mono story                    only the videos matching every word: "mono" or
//                                                   "night" picks a set, anything else a path part
//   npm run motion -- --stills 0,5,14.4 --to <folder>
//                                                   still PNGs at those seconds instead, for checking
//
// Needs Chrome (or Edge) and ffmpeg (winget install Gyan.FFmpeg.Essentials). Each frame is drawn from
// its time alone, so the output is the same on every run, whatever the machine speed. Frames are taken
// at twice the size and scaled down by ffmpeg, which keeps curved edges clean and slow moves smooth.
// The videos render side by side, one browser each (--jobs 1 to do them one at a time).

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openBrowser } from "./browser.mjs";
import { INDUSTRIES } from "../content/industries.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = pathToFileURL(path.join(root, "tools", "brand", "motion.html")).href;
const FPS = 30;
const SUPERSAMPLE = 2;
// Greyscale text edges: the coloured fringes of Windows ClearType turn to smudges once the video's colour
// is subsampled, and they would sit wrong on any text that moves.
const CHROME_ARGS = ["--disable-lcd-text"];

const FILES = [
  { name: "logo-reveal-1080x1080.mp4", w: 1080, h: 1080, scene: "reveal" },
  { name: "logo-reveal-story-1080x1920.mp4", w: 1080, h: 1920, scene: "reveal" },
  { name: "logo-reveal-wide-1920x1080.mp4", w: 1920, h: 1080, scene: "reveal" },
  { name: "overnight-shift-1080x1350.mp4", w: 1080, h: 1350, scene: "shift" },
  { name: "overnight-shift-story-1080x1920.mp4", w: 1080, h: 1920, scene: "shift" },
];
// Social posts use black on white, like the profile pictures and covers; the night set keeps the site's
// amber and night colours.
const SETS = [
  { set: "mono", dir: "", query: "&mono=1" },
  { set: "night", dir: "night/", query: "" },
];
// One example night per "Who it's for" page, black on white, for posts aimed at that kind of business.
// The list comes from the pages themselves, so a new page needs its night in motion.html before this runs.
const INDUSTRY_SIZES = [
  { size: "1080x1350", w: 1080, h: 1350 },
  { size: "story-1080x1920", w: 1080, h: 1920 },
];
const VIDEOS = [
  ...SETS.flatMap((s) => FILES.map((f) => ({ ...f, ...s, out: s.dir + f.name }))),
  ...INDUSTRIES.flatMap(({ slug }) => INDUSTRY_SIZES.map(({ size, w, h }) => {
    const name = `overnight-shift-${slug}-${size}.mp4`;
    return { name, w, h, scene: "shift", set: "mono", query: `&mono=1&night=${slug}`, out: "industries/" + name };
  })),
];

const args = process.argv.slice(2);
const flag = (name) => { const k = args.indexOf(name); return k < 0 ? null : args.splice(k, 2)[1]; };
const stills = flag("--stills");
const stillsTo = flag("--to");
const jobs = Math.max(1, Number(flag("--jobs")) || Math.min(VIDEOS.length, Math.floor(os.cpus().length / 4) || 1));
// A set's name picks that set only (so "night" doesn't also catch "overnight-shift"); any other word is
// part of a path, folder included ("industries", "trades", "story").
const setNames = new Set(SETS.map((s) => s.set));
const todo = VIDEOS.filter((v) => args.every((word) => (setNames.has(word) ? v.set === word : v.out.includes(word))));
if (!todo.length) throw new Error("No video matches " + args.join(" "));

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  // winget either links ffmpeg into Links or puts its own folder on PATH, and PATH only reaches shells
  // opened after the install, so look in both places before falling back to PATH
  const winget = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet");
  const links = path.join(winget, "Links", "ffmpeg.exe");
  if (fs.existsSync(links)) return links;
  const packages = path.join(winget, "Packages");
  for (const pkg of fs.existsSync(packages) ? fs.readdirSync(packages) : []) {
    if (!pkg.startsWith("Gyan.FFmpeg")) continue;
    for (const build of fs.readdirSync(path.join(packages, pkg))) {
      const exe = path.join(packages, pkg, build, "bin", "ffmpeg.exe");
      if (fs.existsSync(exe)) return exe;
    }
  }
  return "ffmpeg";
}

function encoder(file, { w, h }, duration) {
  const ff = spawn(ffmpegPath(), [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    // a silent audio track: some upload paths reject video with no audio stream at all
    "-f", "lavfi", "-t", String(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-map", "0:v", "-map", "1:a",
    "-vf", `scale=${w}:${h}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p`,
    // flat colour and type: the animation tuning keeps edges clean instead of spending bits on grain
    "-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", "14", "-g", String(FPS * 2),
    "-profile:v", "high", "-level", "4.2", "-r", String(FPS),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart",
    file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => {
    ff.on("error", (err) => rej(err.code === "ENOENT" ? new Error("ffmpeg not found: winget install Gyan.FFmpeg.Essentials, or set FFMPEG to its path") : err));
    ff.on("close", (code) => (code ? rej(new Error("ffmpeg exited with " + code)) : res()));
  });
  return {
    write: (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once("drain", res))),
    end: () => { ff.stdin.end(); return done; },
    done,
  };
}

async function render(v, port) {
  const url = `${page}?scene=${v.scene}${v.query}`;
  const size = { w: v.w, h: v.h, dsf: stills ? 1 : SUPERSAMPLE };
  let browser = await openBrowser(port, CHROME_ARGS);
  try {
    await browser.load(url, size);
    const problem = await browser.evaluate("document.body.dataset.error || \"\"");
    if (problem) throw new Error(`${v.out}: ${problem}`);
    const duration = await browser.evaluate("window.DURATION");
    // Frames depend only on t, so if the browser dies part-way, a fresh one picks up the same frame.
    const shoot = async (t, tries = 3) => {
      try {
        await browser.evaluate(`window.frame(${t})`);
        return Buffer.from((await browser.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true })).data, "base64");
      } catch (err) {
        if (!tries) throw err;
        console.error(`${v.out}: frame at ${t}s failed (${err.message}); restarting the browser`);
        await browser.close().catch(() => {});
        browser = await openBrowser(port, CHROME_ARGS);
        await browser.load(url, size);
        return shoot(t, tries - 1);
      }
    };

    if (stills) {
      const dir = path.resolve(stillsTo || path.join(root, "tmp-stills"));
      fs.mkdirSync(dir, { recursive: true });
      for (const t of stills.split(",").map(Number)) {
        const file = path.join(dir, `${v.set}-${v.name.replace(".mp4", "")}-${t}s.png`);
        fs.writeFileSync(file, await shoot(t));
        console.log("wrote", file);
      }
      return;
    }

    const file = path.join(root, "social-kit", "motion", v.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const enc = encoder(file, v, duration);
    enc.done.catch(() => {});   // reported by end() below; this only stops an early failure going unhandled
    const frames = Math.round(duration * FPS);
    const started = Date.now();
    for (let k = 0; k < frames; k++) {
      await enc.write(await shoot(k / FPS));
      if (k && k % (FPS * 4) === 0) console.log(`${v.out}  ${k}/${frames}`);
    }
    await enc.end();
    console.log(`wrote social-kit/motion/${v.out}  ${frames} frames, ${duration}s, in ${Math.round((Date.now() - started) / 1000)}s`);
  } finally {
    await browser.close();
  }
}

const queue = [...todo];
try {
  await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async (_, k) => {
    for (let v; (v = queue.shift());) await render(v, 9335 + k);
  }));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
process.exit(0);
