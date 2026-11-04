// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Writes the service pages, the "who it's for" pages and the guides, site/<slug>.html, from
// content/services.mjs, content/industries.mjs and content/guides.mjs.
//
// The pages are plain HTML like the rest of site/ and are committed as built, so GitHub Pages serves
// them as they are and there is still no build step on deploy. This only saves keeping a dozen copies
// of the header, footer and search markup in step by hand. Edit the content, run `npm run pages`,
// and commit both. tests/pages.test.mjs fails if a page and its content disagree.
//
// Usage:  node tools/build-pages.mjs

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SERVICES } from "../content/services.mjs";
import { INDUSTRIES } from "../content/industries.mjs";
import { GUIDES } from "../content/guides.mjs";

const SITE = "https://thirdshift.ca/";
const ROOT = new URL("../site/", import.meta.url);

// Each set of pages hangs off one section of the home page, which is its breadcrumb's middle step.
export const COLLECTIONS = [
  {
    source: "content/services.mjs",
    items: SERVICES,
    crumb: { name: "What we automate", href: "./#services" },
    more: { kicker: "What else we automate", h2: "Other places to start" },
  },
  {
    source: "content/industries.mjs",
    items: INDUSTRIES,
    crumb: { name: "Who it’s for", href: "./#fit" },
    more: { kicker: "Who else it’s for", h2: "Other kinds of business" },
  },
  {
    source: "content/guides.mjs",
    items: GUIDES,
    crumb: { name: "Guides", href: "./#guides" },
    more: { kicker: "More guides", h2: "Other dates worth knowing" },
    guide: true,
  },
];

const AREA = [
  { "@type": "State", name: "Ontario" },
];

const BUSINESS = { "@type": "ProfessionalService", "@id": SITE + "#business", name: "Third Shift", url: SITE };

// The policy is written once, in index.html (and _headers); the service pages copy it.
export function sitePolicy() {
  const html = fs.readFileSync(new URL("index.html", ROOT), "utf8");
  return html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lines = (items, fn) => items.map(fn).join("\n");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const shortDate = (iso) => longDate(iso).replace(/^(\w{3})\w*/, "$1");

function breadcrumbData(page, url, collection) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: collection.crumb.name, item: SITE + collection.crumb.href.slice(2) },
      { "@type": "ListItem", position: 3, name: page.crumb, item: url },
    ],
  };
}

function faqData(page) {
  return {
    "@type": "FAQPage",
    mainEntity: page.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

// "<" never appears in the copy, but escaping it keeps a stray "</script>" from ever closing the block.
const ldJson = (graph) => JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");

function structuredData(svc, url, collection) {
  return ldJson([
    {
      "@type": "Service",
      "@id": url + "#service",
      name: svc.schema.name,
      serviceType: svc.schema.serviceType,
      description: svc.schema.description,
      url,
      provider: BUSINESS,
      areaServed: AREA,
      ...(svc.schema.audience ? { audience: { "@type": "BusinessAudience", name: svc.schema.audience } } : {}),
    },
    breadcrumbData(svc, url, collection),
    faqData(svc),
  ]);
}

function guideData(guide, url, collection) {
  return ldJson([
    {
      "@type": "Article",
      "@id": url + "#article",
      headline: guide.h1.replace(/<[^>]+>/g, ""),
      description: guide.description,
      url,
      inLanguage: "en-CA",
      datePublished: guide.published,
      dateModified: guide.checked,
      about: { "@type": "Thing", name: guide.about },
      author: BUSINESS,
      publisher: BUSINESS,
      isBasedOn: guide.sources.map(([, href]) => href),
    },
    breadcrumbData(guide, url, collection),
    faqData(guide),
  ]);
}

// A link to a service page or a guide uses that page's own wording.
function pageLink(slug, className) {
  const target = [...SERVICES, ...GUIDES].find((s) => s.slug === slug);
  if (!target) throw new Error(`No page called ${slug}`);
  return `<a class="${className}" href="${target.slug}">${esc(target.linkText)}</a>`;
}
const cardLink = (slug) => `\n          ${pageLink(slug, "link-quiet card-link")}`;

// Everything above <main>: the head, with this page's own search markup, and the site header.
function pageTop(page, collection, policy, data) {
  const url = SITE + page.slug;
  return `<!DOCTYPE html>
<!-- Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE. -->
<!-- Built by tools/build-pages.mjs from ${collection.source}. Change those, then run npm run pages. -->
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${policy}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="author" content="Third Shift">
<meta name="copyright" content="© 2026 Third Shift, thirdshift.ca. All rights reserved.">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="geo.region" content="CA-ON">
<meta name="geo.placename" content="Ontario">
<link rel="canonical" href="${url}">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#EEEBE3">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Third Shift">
<meta property="og:locale" content="en_CA">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="https://thirdshift.ca/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Third Shift: the work that gets done while you sleep. AI systems implementation, thirdshift.ca.">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${data}
</script>
<script>document.documentElement.classList.add("js");</script>
<link rel="preload" href="assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/styles.css">
<script type="module" src="assets/page.js"></script>
</head>
<body class="svc">
<a class="skip" href="#main">Skip to content</a>

<header class="top">
  <div class="wrap top-in">
    <a class="mark" href="./" aria-label="Third Shift home">
      <svg viewBox="0 0 26 26" aria-hidden="true">
        <mask id="mark-cut">
          <rect width="26" height="26" fill="white"/>
          <circle cx="17.5" cy="10.5" r="9" fill="black"/>
        </mask>
        <circle class="mark-moon" cx="13" cy="13" r="12" mask="url(#mark-cut)"/>
      </svg>
      <span>Third Shift</span>
    </a>
    <nav aria-label="Main">
      <a class="nav-link" href="./#services">What we automate</a>
      <a class="nav-link" href="./#how">How it starts</a>
      <a class="nav-link" href="./#faq">Questions</a>
      <a class="btn btn-sm" href="./#contact" data-book>Book a call</a>
    </nav>
  </div>
</header>
`;
}

function crumbs(page, collection) {
  return `        <nav class="crumbs" aria-label="Breadcrumb">
          <ol>
            <li><a href="./">Home</a></li>
            <li><a href="${collection.crumb.href}">${esc(collection.crumb.name)}</a></li>
            <li aria-current="page">${esc(page.crumb)}</li>
          </ol>
        </nav>`;
}

// Everything from the questions down: the FAQ, the rest of the collection, the call to action and
// the site footer.
function pageEnd(page, collection) {
  const others = collection.items.filter((s) => s.slug !== page.slug);
  return `  <section id="faq" class="section" aria-labelledby="faq-title">
    <div class="wrap faq">
      <header class="sec-head">
        <p class="kicker">Questions</p>
        <h2 id="faq-title">What owners ask</h2>
      </header>
      <div class="faq-list">
${lines(page.faq, ([q, a]) => `        <details>
          <summary>${esc(q)}</summary>
          <p>${esc(a)}</p>
        </details>`)}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="more-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(collection.more.kicker)}</p>
        <h2 id="more-title">${esc(collection.more.h2)}</h2>
      </header>
      <ul class="more-list">
${lines(others, (o) => `        <li><a href="${o.slug}"><strong>${esc(o.crumb)}</strong><span>${esc(o.more)}</span></a></li>`)}
      </ul>
    </div>
  </section>

  <section class="section" aria-labelledby="cta-title">
    <div class="wrap">
      <div class="cta-end" data-panel data-cta-end>
        <div>
          <p class="kicker">Book a call</p>
          <h2 id="cta-title">${esc(page.cta.h2)}</h2>
          <p>${esc(page.cta.p)}</p>
        </div>
        <a class="btn btn-lg" href="./#contact" data-book>Book a free 20-minute call</a>
      </div>
      <p class="cta-alt">Prefer email? <a href="mailto:thirdshift.ca@gmail.com">thirdshift.ca@gmail.com</a></p>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <p class="foot-line">Shift ends 7:00 AM.<br><span>Your team starts the day with it done.</span></p>
    <div class="foot-grid">
      <div>
        <div>Third Shift · AI systems implementation for small businesses, Ontario, Canada</div>
        <div>© 2026 Third Shift · <a href="privacy">Privacy</a></div>
      </div>
      <ul>
        <li><a href="mailto:thirdshift.ca@gmail.com">thirdshift.ca@gmail.com</a></li>
        <li><a href="https://www.instagram.com/thirdshift.ca" rel="me">Instagram</a></li>
        <li><a href="https://x.com/thirdshiftca" rel="me">X</a></li>
        <li><a href="https://www.facebook.com/thirdshift.ca" rel="me">Facebook</a></li>
      </ul>
    </div>
  </div>
  <svg class="skyline" id="skyline" viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"></svg>
</footer>

<a class="mobile-cta" id="mobile-cta" href="./#contact" data-book>Book a free 20-minute call</a>
</body>
</html>
`;
}

export function renderPage(svc, collection = COLLECTIONS[0], policy = sitePolicy()) {
  if (collection.guide) return renderGuide(svc, collection, policy);
  const url = SITE + svc.slug;
  const { log, handles, how, person, fit } = svc;
  const jump = how ? ["#how-it-works", "How it works"] : ["#what-it-handles", "What it takes off your plate"];

  return `${pageTop(svc, collection, policy, structuredData(svc, url, collection))}
<main id="main">

  <section class="svc-hero" data-hero aria-labelledby="page-title">
    <div class="wrap svc-hero-in">
      <div class="hero-copy">
${crumbs(svc, collection)}
        <h1 id="page-title">${svc.h1}</h1>
        <p class="lede">${esc(svc.lede)}</p>
        <div class="actions">
          <a class="btn btn-lg" href="./#contact" data-book>Book a free 20-minute call</a>
          <a class="link-quiet" href="${jump[0]}">${jump[1]}</a>
        </div>
      </div>
      <aside class="log log-static" aria-label="${esc(log.label)}">
        <header class="log-head">
          <strong>${esc(log.label)}</strong>
          <span>Ontario</span>
        </header>
        <ul class="log-boot" aria-label="Connected for this run">
${lines(log.boot, ([name, state, hold]) => `          <li${hold ? ' class="hold"' : ""}>${esc(name)} <b>${esc(state)}</b></li>`)}
        </ul>
        <ol class="log-rows">
${lines(log.rows, ([time, text, flag]) => `          <li${flag ? ' class="flag"' : ""}><time>${esc(time)}</time><span>${esc(text)}</span></li>`)}
        </ol>
        <footer class="log-foot"><span>${esc(log.foot)}</span></footer>
      </aside>
    </div>
  </section>

  <section class="section" id="what-it-handles" aria-labelledby="handles-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(handles.kicker)}</p>
        <h2 id="handles-title">${esc(handles.h2)}</h2>
        <p class="intro">${esc(handles.intro)}</p>
      </header>
      <ul class="cards">
${lines(handles.cards, ([h, p, link]) => `        <li class="card" data-panel>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>${link ? cardLink(link) : ""}
        </li>`)}
      </ul>
    </div>
  </section>
${how ? `
  <section class="section" id="how-it-works" aria-labelledby="how-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(how.kicker)}</p>
        <h2 id="how-title">${esc(how.h2)}</h2>
        <p class="intro">${esc(how.intro)}</p>
      </header>
      <ol class="steps" id="steps">
${lines(how.steps, ([h, p], i) => `        <li>
          <span class="step-n" aria-hidden="true">${i + 1}</span>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>
        </li>`)}
      </ol>
    </div>
  </section>
` : ""}
  <section class="section" aria-labelledby="person-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(person.kicker)}</p>
        <h2 id="person-title">${esc(person.h2)}</h2>${person.intro ? `
        <p class="intro">${esc(person.intro)}</p>` : ""}
      </header>
      <ul class="principles">
${lines(person.items, ([h, p]) => `        <li>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>
        </li>`)}
      </ul>
    </div>
  </section>

  <section class="section" aria-label="Who it’s for and what it works with">
    <div class="wrap fit">
      <div>
        <p class="kicker">Who it’s for</p>
        <h2>A good fit if</h2>
        <ul class="fit-list">
${lines(fit.items, (t) => `          <li>${esc(t)}</li>`)}
        </ul>
      </div>
      <div>
        <p class="kicker">Works with</p>
        <h2>What you already run</h2>
        <ul class="custom-list" aria-label="Systems it works with">
${lines(fit.tools, (t) => `          <li>${esc(t)}</li>`)}
        </ul>
        <p class="fit-note">Using something else? Ask. If you can log into it, there’s usually a way to connect it.</p>
      </div>
    </div>
  </section>

${pageEnd(svc, collection)}`;
}

// A guide is shorter than a service page: the facts from the official page, how to do the thing,
// where we come in, and the pages it was checked against. Its panel lists the facts at a glance
// instead of an example night, and there's no "what you already run".
function renderGuide(guide, collection, policy) {
  const url = SITE + guide.slug;
  const { glance, facts, rules, how, help } = guide;
  const host = new URL(guide.sources[0][1]).hostname.replace(/^www\./, "");

  return `${pageTop(guide, collection, policy, guideData(guide, url, collection))}
<main id="main">

  <section class="svc-hero" data-hero aria-labelledby="page-title">
    <div class="wrap svc-hero-in">
      <div class="hero-copy">
${crumbs(guide, collection)}
        <h1 id="page-title">${guide.h1}</h1>
        <p class="lede">${esc(guide.lede)}</p>
        <div class="actions">
          <a class="btn btn-lg" href="./#contact" data-book>Book a free 20-minute call</a>
          <a class="link-quiet" href="#${how.id}">${esc(how.jump)}</a>
        </div>
      </div>
      <aside class="log log-static" aria-label="${esc(glance.label)}">
        <header class="log-head">
          <strong>${esc(glance.label)}</strong>
          <span>Ontario</span>
        </header>
        <ul class="log-rows">
${lines(glance.rows, ([label, text]) => `          <li><b>${esc(label)}</b><span>${esc(text)}</span></li>`)}
        </ul>
        <footer class="log-foot"><span>Checked ${shortDate(guide.checked)} on ${esc(host)}</span></footer>
      </aside>
    </div>
  </section>

  <section class="section" aria-labelledby="facts-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(facts.kicker)}</p>
        <h2 id="facts-title">${esc(facts.h2)}</h2>
        <p class="intro">${esc(facts.intro)}</p>
      </header>
      <ul class="principles">
${lines(facts.items, ([h, p]) => `        <li>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>
        </li>`)}
      </ul>
    </div>
  </section>
${rules ? `
  <section class="section" aria-labelledby="rules-title">
    <div class="wrap fit">
      <div>
        <p class="kicker">${esc(rules.kicker)}</p>
        <h2 id="rules-title">${esc(rules.h2)}</h2>
        <p>${esc(rules.intro)}</p>
      </div>
      <ul class="fit-list">
${lines(rules.items, (t) => `        <li>${esc(t)}</li>`)}
      </ul>
    </div>
  </section>
` : ""}
  <section class="section" id="${how.id}" aria-labelledby="how-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(how.kicker)}</p>
        <h2 id="how-title">${esc(how.h2)}</h2>
        <p class="intro">${esc(how.intro)}</p>
      </header>
      <ol class="steps">
${lines(how.steps, ([h, p], i) => `        <li>
          <span class="step-n" aria-hidden="true">${i + 1}</span>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>
        </li>`)}
      </ol>
    </div>
  </section>

  <section class="section" aria-labelledby="help-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">${esc(help.kicker)}</p>
        <h2 id="help-title">${esc(help.h2)}</h2>
        <p class="intro">${esc(help.intro)}</p>
      </header>
      <ul class="principles">
${lines(help.items, ([h, p]) => `        <li>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>
        </li>`)}
      </ul>
      <div class="custom-links">
        ${pageLink(help.link, "link-quiet custom-link")}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="sources-title">
    <div class="wrap">
      <header class="sec-head">
        <p class="kicker">Sources</p>
        <h2 id="sources-title">Checked on ${longDate(guide.checked)}</h2>
        <p class="intro">Every fact on this page comes from these official pages. Where this page and the official one ever differ, go by the official one.</p>
      </header>
      <ul class="more-list">
${lines(guide.sources, ([name, href, note]) => `        <li><a href="${esc(href)}"><strong>${esc(name)}</strong><span>${esc(note)}</span></a></li>`)}
      </ul>
    </div>
  </section>

${pageEnd(guide, collection)}`;
}

export function buildAll() {
  const policy = sitePolicy();
  return COLLECTIONS.flatMap((collection) => collection.items.map((page) => {
    const file = new URL(page.slug + ".html", ROOT);
    fs.writeFileSync(file, renderPage(page, collection, policy));
    return fileURLToPath(file);
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  for (const file of buildAll()) console.log("wrote " + file);
}
