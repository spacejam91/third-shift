// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Every page on the site: search markup, the security policy, links that go somewhere, and the house
// rules on copy. The service pages must also be exactly what content/services.mjs builds.

import { test } from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { SERVICES } from "../content/services.mjs";
import { renderService, sitePolicy } from "../tools/build-pages.mjs";

const SITE = new URL("../site/", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, SITE), "utf8").replace(/\r\n/g, "\n");
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const norm = (s) => s.replace(/[‘’]/g, "'");
const ldOf = (html) => {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return block ? JSON.parse(block[1]) : null;
};

// Pages meant to be found in search: every .html file except the 404.
const PAGES = fs.readdirSync(SITE).filter((f) => f.endsWith(".html") && f !== "404.html");
const ALL = [...PAGES, "404.html"];
const urlOf = (file) => "https://thirdshift.ca/" + (file === "index.html" ? "" : file.replace(/\.html$/, ""));

test("each service page is exactly what its content builds", () => {
  const policy = sitePolicy();
  for (const svc of SERVICES) {
    assert.equal(read(svc.slug + ".html"), renderService(svc, SERVICES, policy), `${svc.slug}.html is out of date: run npm run pages`);
  }
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
  for (const svc of SERVICES) assert.ok(svc.log.rows.length <= 6, `${svc.slug} has ${svc.log.rows.length} log rows`);
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

test("house rules: a copyright line on every page, no tool names, no emojis", () => {
  for (const file of ALL) assert.match(read(file), /^<!DOCTYPE html>\n<!-- Copyright \(c\) 2026 Third Shift/, file);
  const files = fs.readdirSync(SITE, { recursive: true })
    .map((f) => f.replace(/\\/g, "/"))
    .filter((f) => /\.(html|js|css|txt|xml|webmanifest)$/.test(f));
  for (const f of files) {
    const text = read(f);
    assert.doesNotMatch(text, /\b(claude|anthropic|openai|chatgpt|copilot)\b/i, `${f} names a tool`);
    // © and ® are pictographic to Unicode but are plain typography here.
    assert.doesNotMatch(text, /(?![©®])\p{Extended_Pictographic}/u, `${f} has an emoji`);
  }
});
