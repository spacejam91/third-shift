// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Campaign tags survive the visit: a prospect who lands on any page from a tagged link and then fills
// in the form on the home page is filed under that campaign, not as a plain website visit.

import { test } from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { arrival } from "../site/assets/shared.js";

// The bits of a browser tab that arrival() reads, with a session store that lasts until reset.
let store = new Map();
function set(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
function visit(href, referrer = "") {
  const replaced = [];
  set("location", new URL(href));
  set("document", { referrer });
  set("history", { state: null, replaceState: (_s, _t, url) => replaced.push(url) });
  set("sessionStorage", { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) });
  return replaced;
}

test("a visit that starts on a who-it's-for page keeps its outreach tags all the way to the form", () => {
  store = new Map();
  const replaced = visit("https://thirdshift.ca/clinics?utm_source=outreach&utm_medium=email&utm_campaign=cold-v2-clinic");
  const first = arrival();
  assert.deepEqual(first, { referrer: "", utm_source: "outreach", utm_medium: "email", utm_campaign: "cold-v2-clinic" });
  assert.deepEqual(replaced, ["/clinics"], "the tags come off the address bar");

  // "Book a call" takes them to the home page form, which reads what the first page kept.
  visit("https://thirdshift.ca/#contact", "https://thirdshift.ca/clinics");
  assert.deepEqual(arrival(), first);
});

test("a visit from a search engine records the referring site and no tags", () => {
  store = new Map();
  const replaced = visit("https://thirdshift.ca/trades", "https://www.google.com/");
  assert.deepEqual(arrival(), { referrer: "www.google.com", utm_source: "", utm_medium: "", utm_campaign: "" });
  assert.deepEqual(replaced, []);
});

test("every page's entry script records the arrival on load", () => {
  const read = (f) => fs.readFileSync(new URL("../site/assets/" + f, import.meta.url), "utf8");
  assert.match(read("page.js"), /\["arrival", arrival\]/, "service and who-it's-for pages");
  assert.match(read("app.js"), /safely\("arrival", arrival\)/, "home page");
});
