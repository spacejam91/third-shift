// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Exports every logo, icon, social banner and the link-preview image from tools/brand/art.html.
//
//   node tools/render-brand.mjs            (needs Microsoft Edge or Google Chrome installed)
//   node tools/render-brand.mjs social-kit (only the files whose path contains that text)
//
// Drives a headless browser over the DevTools protocol so it can wait for the fonts, crop the
// wordmarks tight, and keep transparent backgrounds transparent. Writes to social-kit/ (files to
// upload to social profiles) and site/ (favicons, app icons, the share image).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openBrowser, sleep } from "./browser.mjs";

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
  { out: "social-kit/link-preview-1200x630.png", w: 1200, h: 630, q: "kind=og" },

  // Social profiles: flat, so they stay crisp when the platforms shrink and recompress them.
  { out: "social-kit/profile-picture.png", w: 1080, h: 1080, q: "kind=flat&fg=000000&bg=FFFFFF&scale=.62" },
  { out: "social-kit/profile-picture-400.png", w: 400, h: 400, q: "kind=flat&fg=000000&bg=FFFFFF&scale=.62" },
  { out: "social-kit/logo-mark.png", w: 1024, h: 1024, q: "kind=mark&bg=none&scale=.92", clear: true },
  { out: "social-kit/logo-for-dark-backgrounds.png", w: 3000, h: 600, q: "kind=wordmark&theme=dark", clip: "#logo", clear: true },
  { out: "social-kit/logo-for-light-backgrounds.png", w: 3000, h: 600, q: "kind=wordmark&theme=light", clip: "#logo", clear: true },
  { out: "social-kit/linkedin-cover-1584x396.png", w: 1584, h: 396, q: "kind=banner&flat=1&mono=1&moon=0&align=center" },
  { out: "social-kit/linkedin-page-cover-1128x191.png", w: 1128, h: 191, q: "kind=banner&flat=1&mono=1&moon=0&align=center", dsf: 2 },
  { out: "social-kit/x-header-1500x500.png", w: 1500, h: 500, q: "kind=banner&flat=1&mono=1&moon=0&zoom=1.6&inset=.085", dsf: 2 },
  // Facebook shows covers from a 960 px copy stretched to about 1250 px on desktop, and shades the
  // bottom edge, so this one is a small crescent over one bold line, centred and a little high.
  { out: "social-kit/facebook-cover-1640x624.png", w: 1640, h: 624, dsf: 2,
    q: "kind=banner&flat=1&mono=1&align=center&kicker=0&moon=top&lift=.05&url=0&zoom=.85&line=" + encodeURIComponent("Inquiries answered. Quotes chased.|Reports done overnight.") },
  { out: "social-kit/instagram-post-1080.png", w: 1080, h: 1080, q: "kind=square&flat=1&mono=1" },

  // Profile kit (social-kit/profiles/README.md): the LinkedIn company page and the Google Business Profile.
  // The logos are the profile picture at each platform's size; its crescent stays inside a circle crop.
  { out: "social-kit/profiles/linkedin-logo-400x400.png", w: 400, h: 400, q: "kind=flat&fg=000000&bg=FFFFFF&scale=.62" },
  // LinkedIn puts the logo over the cover's bottom left and trims the sides on phones, so the cover is
  // just the line, centred, in the middle two fifths. The @2x copy is sharper on high-density screens.
  ...[1, 2].map((dsf) => ({
    out: `social-kit/profiles/linkedin-cover-1128x191${dsf > 1 ? "@2x" : ""}.png`, w: 1128, h: 191, dsf,
    q: "kind=banner&flat=1&mono=1&moon=0&align=center&kicker=0&url=0&zoom=1.25&line=" + encodeURIComponent("The work that gets done|while you sleep."),
  })),
  { out: "social-kit/profiles/google-logo-720x720.png", w: 720, h: 720, q: "kind=flat&fg=000000&bg=FFFFFF&scale=.62" },
  // Google crops the cover to different shapes in Search and Maps; the post's lockup sits in the middle square.
  { out: "social-kit/profiles/google-cover-1024x576.png", w: 1024, h: 576, q: "kind=square&flat=1&mono=1" },
  ...["inquiries", "reporting", "routines", "approval"].map((name, n) => (
    { out: `social-kit/profiles/google-photo-${n + 1}-${name}-720x720.png`, w: 720, h: 720, q: `kind=card&n=${n}` })),
];
const only = process.argv[2];

// ClearType would leave red and green fringes on the text that platforms then smear when they recompress.
const browser = await openBrowser(9334, ["--disable-lcd-text"]);

const icoParts = {};
try {
  for (const job of JOBS) {
    if (only && !job.out.includes(only)) continue;
    await browser.load(`${art}?${job.q}`, job);
    await sleep(150);

    const params = { format: "png", captureBeyondViewport: false };
    if (job.clip) {
      const r = await browser.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(job.clip)}).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; })()`);
      params.clip = { x: r.x, y: r.y, width: Math.ceil(r.width), height: Math.ceil(r.height), scale: 1 };
    }
    const shot = await browser.send("Page.captureScreenshot", params);
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

  // favicon.ico holding 16, 32 and 48 px PNGs (the ICO format allows PNG entries). A partial run
  // that skipped those sizes leaves the existing favicon alone.
  const parts = ["fav-16", "fav-32", "fav-48"].map((k) => icoParts[k]);
  if (parts.every(Boolean)) writeIco(parts);
} finally {
  await browser.close();
}
process.exit(0);

function writeIco(parts) {
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
}
