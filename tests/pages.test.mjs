// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Every page on the site: search markup, the security policy, links that go somewhere, and the house
// rules on copy. The service pages must also be exactly what content/services.mjs builds.

import { test } from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { SERVICES } from "../content/services.mjs";
import { INDUSTRIES } from "../content/industries.mjs";
import { COLLECTIONS, renderPage, sitePolicy } from "../tools/build-pages.mjs";

const SITE = new URL("../site/", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, SITE), "utf8").replace(/\r\n/g, "\n");
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = (s) => s.replace(/[‘’]/g, "'");
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const PLACE_HASHES = new Set([
  "4676fef2821e300a3101f81a1090f37da82163cfc2a70a990b0c0e45fa6f4092",
  "eae6d77e26d53f8b50aae22c0c31508293e4abe5056e6db46d13d681e9880f42",
  "546f729f98eb03a0486f48ed2044711dfc9da79e1031a7c883c333bfb6d4e874",
]);
const ldOf = (html) => {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return block ? JSON.parse(block[1]) : null;
};

// Pages meant to be found in search: every .html file except the 404.
const PAGES = fs.readdirSync(SITE).filter((f) => f.endsWith(".html") && f !== "404.html");
const ALL = [...PAGES, "404.html"];
const urlOf = (file) => "https://thirdshift.ca/" + (file === "index.html" ? "" : file.replace(/\.html$/, ""));

test("each built page is exactly what its content builds", () => {
  const policy = sitePolicy();
  for (const collection of COLLECTIONS) {
    for (const page of collection.items) {
      assert.equal(read(page.slug + ".html"), renderPage(page, collection, policy), `${page.slug}.html is out of date: run npm run pages`);
    }
  }
});

test("built pages have unique addresses, and the home page links to every one", () => {
  const slugs = COLLECTIONS.flatMap((c) => c.items.map((p) => p.slug));
  assert.equal(new Set(slugs).size, slugs.length, "two pages share a slug");
  const home = read("index.html");
  for (const slug of slugs) assert.ok(home.includes(`href="${slug}"`), `the home page doesn't link to ${slug}`);
});

test("every page in search has a title, description, canonical link and one h1", () => {
  for (const file of PAGES) {
    const html = read(file);
    const title = decode(html.match(/<title>([^<]*)<\/title>/)[1]);
    const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)[1]);
    assert.ok(title.length <= 65, `${file}: title is ${title.length} characters`);
    assert.ok(desc.length >= 110 && desc.length <= 160, `${file}: description is ${desc.length} characters`);
    assert.ok(html.includes(`<link rel="canonical" href="${urlOf(file)}">`), `${file}: canonical link`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${file}: one h1`);
  }
});

test("titles and descriptions are not shared between pages", () => {
  const seen = new Map();
  for (const file of PAGES) {
    const html = read(file);
    for (const key of [html.match(/<title>([^<]*)</)[1], html.match(/<meta name="description" content="([^"]*)"/)[1]]) {
      assert.ok(!seen.has(key), `${file} repeats ${seen.get(key)}: ${key}`);
      seen.set(key, file);
    }
  }
});

test("the sitemap lists every page in search and nothing else", () => {
  const listed = [...read("sitemap.xml").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, PAGES.map(urlOf).sort());
});

test("every page carries the same security policy, and it allows each inline script", () => {
  const policy = sitePolicy();
  for (const file of ALL) {
    const html = read(file);
    assert.equal(html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1], policy, file);
    for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = "'sha256-" + crypto.createHash("sha256").update(body, "utf8").digest("base64") + "'";
      assert.ok(policy.includes(hash), `${file}: an inline script isn't allowed by the policy`);
    }
  }
  // _headers has the same rules plus frame-ancestors, which only works as a header.
  const header = policy.replace("; upgrade-insecure-requests", "; frame-ancestors 'none'; upgrade-insecure-requests");
  assert.ok(read("_headers").includes("Content-Security-Policy: " + header), "_headers and the pages disagree");
});

test("links between pages go somewhere", () => {
  const ids = new Map();
  const idsOf = (file) => {
    if (!ids.has(file)) ids.set(file, new Set([...read(file).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    return ids.get(file);
  };
  for (const file of ALL) {
    for (const [, href] of read(file).matchAll(/\shref="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [path, hash] = href.split("#");
      const target = path === "" ? file : path === "./" ? "index.html" : path;
      const real = fs.existsSync(new URL(target, SITE)) ? target : target + ".html";
      assert.ok(fs.existsSync(new URL(real, SITE)), `${file}: ${href} goes nowhere`);
      if (hash) assert.ok(idsOf(real).has(hash), `${file}: ${href} has no #${hash} to land on`);
    }
  }
});

test("each page's FAQ structured data says exactly what the page says", () => {
  for (const file of PAGES) {
    const html = read(file);
    const faq = ldOf(html)?.["@graph"].find((n) => n["@type"] === "FAQPage");
    const onPage = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [decode(m[1]), decode(m[2])]);
    if (!faq) {
      assert.equal(onPage.length, 0, `${file}: questions on the page but none in the structured data`);
      continue;
    }
    assert.equal(faq.mainEntity.length, onPage.length, file);
    faq.mainEntity.forEach((q, i) => {
      assert.equal(norm(q.name), norm(onPage[i][0]), file);
      assert.equal(norm(q.acceptedAnswer.text), norm(onPage[i][1]), `${file}: ${q.name}`);
    });
  }
});

test("example logs fit the staggered entrance in styles.css (six rows at most)", () => {
  for (const page of [...SERVICES, ...INDUSTRIES]) assert.ok(page.log.rows.length <= 6, `${page.slug} has ${page.log.rows.length} log rows`);
});

test("the home page and each service page agree on the service's address", () => {
  const home = ldOf(read("index.html"))["@graph"].find((n) => n["@type"] === "ProfessionalService");
  const offered = home.hasOfferCatalog.itemListElement.map((o) => o.itemOffered.url).sort();
  assert.deepEqual(offered, SERVICES.map((s) => "https://thirdshift.ca/" + s.slug).sort());
  for (const svc of SERVICES) {
    const service = ldOf(read(svc.slug + ".html"))["@graph"].find((n) => n["@type"] === "Service");
    assert.equal(service.url, "https://thirdshift.ca/" + svc.slug);
    assert.equal(service.provider["@id"], "https://thirdshift.ca/#business");
  }
});

// Daylight (Oct 30, 2026) took out the night network behind every page and the pointer effects. The
// shift log now gets its jobs from a timer in app.js instead of the network. Work Order (Nov 2026) took
// out what read as a generated site: the sketches of software above each service, everything fading
// up as it scrolled in, the pulsing dot. The pointer touches it added (touches.js) answer the mouse
// without moving the layout.
test("Work Order: no night network or generated-site defaults, every page on card stock, the shift log still runs", () => {
  assert.ok(!fs.existsSync(new URL("assets/night.js", SITE)), "assets/night.js is back");
  for (const f of fs.readdirSync(new URL("assets/", SITE)).filter((name) => name.endsWith(".js"))) {
    // (calculator.js has initNights, its year of nights: a different thing)
    assert.doesNotMatch(read("assets/" + f), /night\.js|\binitNight\b/, `assets/${f} still loads the night network`);
  }
  for (const file of ALL) {
    const html = read(file);
    assert.doesNotMatch(html, /<canvas class="night"|class="(sky|spot|progress)"|data-glow|data-tilt|\bcomet\b/, `${file} still has part of the night layer`);
    assert.doesNotMatch(html, /class="viz\b|data-reveal|class="pulse"/, `${file} has a sketch, a scroll reveal or the pulsing dot back`);
    assert.match(html, /<meta name="color-scheme" content="light">/, `${file} should say it is a light page`);
    assert.match(html, /<meta name="theme-color" content="#EEEBE3">/, `${file} should have the card-stock theme colour`);
    assert.match(html, /<link rel="preload" href="assets\/fonts\/archivo-latin\.woff2" as="font" type="font\/woff2" crossorigin>/, `${file} should preload Archivo`);
  }
  // Every font the stylesheet asks for is on the site, and nothing in fonts/ goes unused.
  const css = read("assets/styles.css");
  const used = [...css.matchAll(/url\("fonts\/([^"]+)"\)/g)].map((m) => m[1]).sort();
  const shipped = fs.readdirSync(new URL("assets/fonts/", SITE)).filter((name) => name.endsWith(".woff2")).sort();
  assert.deepEqual(used, shipped);
  assert.match(read("assets/app.js"), /log\.push\(\)/, "nothing adds rows to the shift log");
});

test("house rules: a copyright line on every page, no tool names, no city names, no emojis", () => {
  for (const file of ALL) {
    const html = read(file);
    assert.match(html, /^<!DOCTYPE html>\n<!-- Copyright \(c\) 2026 Third Shift/, file);
    assert.doesNotMatch(html, /<title>[^<]*—|og:title" content="[^"]*—/, `${file} has a long dash in its title`);
  }
  const files = fs.readdirSync(SITE, { recursive: true })
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => /\.(html|js|css|txt|xml|webmanifest)$/.test(f));
  for (const f of files) {
    const text = read(f);
    assert.doesNotMatch(text, /\b(claude|anthropic|openai|chatgpt|copilot)\b/i, `${f} names a tool`);
    // Public copy says Ontario and never the city or region (the owner, Oct 22). The names are kept
    // as hashes so this file doesn't list them.
    const place = [...new Set(text.toLowerCase().match(/\p{L}+/gu) || [])].find((w) => PLACE_HASHES.has(sha256(w)));
    assert.equal(place, undefined, `${f} names a city`);
    // Words that read as machine-written: show it, don't announce it (the owner, Nov 2).
    assert.doesNotMatch(text, /\b(plainly|honestly|genuinely)\b/i, `${f} vouches for its own honesty`);
    // © and ® are pictographic to Unicode but are plain typography here.
    assert.doesNotMatch(text, /(?![©®])\p{Extended_Pictographic}/u, `${f} has an emoji`);
  }
});
