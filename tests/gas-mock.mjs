// A small in-memory stand-in for the Apps Script services the backend uses, close enough to the
// real behaviour that matters: Sheets turns "2026-10-21" into a Date, treats a leading apostrophe as
// "store as text", and shows #ERROR! for a value that starts like a formula.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const backendDir = path.join(here, "..", "backend");

const isDate = (v) => Object.prototype.toString.call(v) === "[object Date]";

// DateCtor is the sandbox's own Date, so values read back pass `instanceof Date` inside the .gs code.
function sheetValue(v, DateCtor) {
  if (typeof v !== "string") return v;
  if (v.startsWith("'")) return { text: v.slice(1) };
  if (/^[=+\-@]/.test(v) && v.length > 1) return { formula: v };
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new DateCtor(v + "T12:00:00Z");
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
function readValue(c) {
  if (c == null) return "";
  if (typeof c === "object" && !isDate(c)) return c.formula ? "#ERROR!" : c.text;
  return c;
}

class MockRange {
  constructor(sheet, r, c, nr = 1, nc = 1) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = this.sheet.rows[this.r - 1 + i] || [];
      const vals = [];
      for (let j = 0; j < this.nc; j++) {
        const v = readValue(row[this.c - 1 + j]);
        // Hand dates back in the reading sandbox's own Date type, like Sheets would.
        vals.push(isDate(v) && this.sheet.ss.DateCtor ? new this.sheet.ss.DateCtor(v.getTime()) : v);
      }
      out.push(vals);
    }
    return out;
  }
  setValues(values) {
    values.forEach((vals, i) => vals.forEach((v, j) => this.sheet.put(this.r + i, this.c + j, v)));
    return this;
  }
  setValue(v) { this.sheet.put(this.r, this.c, v); return this; }
  setFontWeight() { return this; }
  setDataValidation(rule) { this.sheet.validation = rule; return this; }
}

class MockSheet {
  constructor(name, ss) { this.name = name; this.ss = ss; this.rows = []; this.frozen = 0; this.validation = null; }
  put(r, c, v) {
    while (this.rows.length < r) this.rows.push([]);
    const row = this.rows[r - 1];
    while (row.length < c) row.push("");
    row[c - 1] = sheetValue(v, this.ss.DateCtor || Date);
  }
  getLastRow() {
    for (let i = this.rows.length; i > 0; i--) if (this.rows[i - 1].some((v) => v !== "" && v != null)) return i;
    return 0;
  }
  getLastColumn() {
    let m = 0;
    for (const row of this.rows) for (let j = row.length; j > m; j--) if (row[j - 1] !== "" && row[j - 1] != null) { m = j; break; }
    return m;
  }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  appendRow(values) { const r = this.getLastRow() + 1; values.forEach((v, j) => this.put(r, j + 1, v)); }
  getRange(r, c, nr, nc) { return new MockRange(this, r, c, nr, nc); }
  setFrozenRows(n) { this.frozen = n; }
  // Test helper: rows as objects keyed by header, values as Sheets would show them.
  records() {
    const all = this.getRange(1, 1, this.getLastRow() || 1, this.getLastColumn() || 1).getValues();
    const head = all[0];
    return all.slice(1).map((row) => Object.fromEntries(head.map((h, i) => [h, row[i]])));
  }
}

class MockSpreadsheet {
  constructor(id = "SHEET123") { this.id = id; this.sheets = new Map(); }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new MockSheet(n, this); this.sheets.set(n, s); return s; }
}

function formatDate(date, tz, fmt, forced) {
  if (fmt === "u" && forced.dow) return forced.dow;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short",
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const dow = { Mon: "1", Tue: "2", Wed: "3", Thu: "4", Fri: "5", Sat: "6", Sun: "7" }[parts.weekday];
  return fmt
    .replace("yyyy", parts.year).replace("MM", parts.month).replace("dd", parts.day)
    .replace("'T'", "T").replace("HH", parts.hour).replace("mm", parts.minute).replace("ss", parts.second)
    .replace(/^u$/, dow);
}

function chain(record = {}) {
  const proxy = new Proxy(record, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return (...args) => { target.calls = target.calls || []; target.calls.push([prop, args]); return proxy; };
    },
  });
  return proxy;
}

// Builds a fresh sandbox with the given .gs files loaded, plus handles to inspect and steer it.
export function loadProject(files, opts = {}) {
  const ss = opts.ss || new MockSpreadsheet();
  const env = {
    ss,
    mails: [],
    props: {},
    cache: {},
    fetches: [],
    triggers: [],
    activeUser: opts.activeUser ?? "owner@example.com",
    effectiveUser: opts.effectiveUser ?? "owner@example.com",
    mailFails: false,
    fetchImpl: null,
    forced: { dow: null },
  };

  const ctx = {
    console: { error: () => {}, log: () => {} },
    Logger: { log: () => {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: (id) => { if (id !== ss.id) throw new Error("No sheet " + id); return ss; },
      newDataValidation: () => {
        const rule = { kind: "rule" };
        const b = { requireValueInList: (list) => { rule.list = list; return b; }, setAllowInvalid: () => b, build: () => rule };
        return b;
      },
    },
    MailApp: { sendEmail: (m) => { if (env.mailFails) throw new Error("Service invoked too many times"); env.mails.push(m); } },
    UrlFetchApp: {
      fetch: (url, o) => {
        env.fetches.push({ url, o });
        if (!env.fetchImpl) throw new Error("no network in tests");
        return env.fetchImpl(url, o);
      },
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in env.props ? env.props[k] : null),
      setProperty: (k, v) => { env.props[k] = String(v); },
      setProperties: (o) => { for (const [k, v] of Object.entries(o)) env.props[k] = String(v); },
    }) },
    CacheService: { getScriptCache: () => ({ get: (k) => env.cache[k] ?? null, put: (k, v) => { env.cache[k] = v; } }) },
    Utilities: {
      formatDate: (d, tz, fmt) => formatDate(d, tz, fmt, env.forced),
      getUuid: () => crypto.randomUUID(),
    },
    Session: {
      getActiveUser: () => ({ getEmail: () => env.activeUser }),
      getEffectiveUser: () => ({ getEmail: () => env.effectiveUser }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (s) => ({ setMimeType() { return this; }, getContent: () => s }),
    },
    HtmlService: {
      XFrameOptionsMode: { DEFAULT: "DEFAULT", ALLOWALL: "ALLOWALL" },
      createHtmlOutputFromFile: (file) => chain({ file }),
      createHtmlOutput: (html) => chain({ html }),
    },
    ScriptApp: {
      getProjectTriggers: () => env.triggers.slice(),
      deleteTrigger: (t) => { env.triggers = env.triggers.filter((x) => x !== t); },
      newTrigger: (fn) => {
        const t = { fn, getHandlerFunction: () => fn };
        const b = { timeBased: () => b, atHour: (h) => { t.hour = h; return b; }, everyDays: () => b, inTimezone: (z) => { t.tz = z; return b; }, create: () => { env.triggers.push(t); return t; } };
        return b;
      },
      getService: () => ({ getUrl: () => "https://script.google.com/macros/s/CRM/exec" }),
    },
  };
  vm.createContext(ctx);
  ss.DateCtor = vm.runInContext("Date", ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(backendDir, f), "utf8"), ctx, { filename: f });
  return { ctx, env, ss };
}

export { MockSpreadsheet };
