// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// Writes the service pages and the "who it's for" pages, site/<slug>.html, from content/services.mjs
// and content/industries.mjs.
//
// The pages are plain HTML like the rest of site/ and are committed as built, so GitHub Pages serves
// them as they are and there is still no build step on deploy. This only saves keeping ten copies
// of the header, footer and search markup in step by hand. Edit the content, run `npm run pages`,
// and commit both. tests/pages.test.mjs fails if a page and its content disagree.
//
// Usage:  node tools/build-pages.mjs

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SERVICES } from "../content/services.mjs";
import { INDUSTRIES } from "../content/industries.mjs";

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
];

const AREA = [
  { "@type": "City", name: "Kitchener" },
  { "@type": "City", name: "Waterloo" },
  { "@type": "City", name: "Cambridge" },
  { "@type": "AdministrativeArea", name: "Region of Waterloo, Ontario" },
  { "@type": "State", name: "Ontario" },
];

// The policy is written once, in index.html (and _headers); the service pages copy it.
export function sitePolicy() {
  const html = fs.readFileSync(new URL("index.html", ROOT), "utf8");
  return html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1];
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lines = (items, fn) => items.map(fn).join("\n");

function structuredData(svc, url, collection) {
  const graph = [
    {
      "@type": "Service",
      "@id": url + "#service",
      name: svc.schema.name,
      serviceType: svc.schema.serviceType,
      description: svc.schema.description,
      url,
      provider: { "@type": "ProfessionalService", "@id": SITE + "#business", name: "Third Shift", url: SITE },
      areaServed: AREA,
      ...(svc.schema.audience ? { audience: { "@type": "BusinessAudience", name: svc.schema.audience } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: collection.crumb.name, item: SITE + collection.crumb.href.slice(2) },
        { "@type": "ListItem", position: 3, name: svc.crumb, item: url },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: svc.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  // "<" never appears in the copy, but escaping it keeps a stray "</script>" from ever closing the block.
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");
}

// A card can name the service page it belongs to; the link uses that page's own wording.
function cardLink(slug) {
  const target = SERVICES.find((s) => s.slug === slug);
  if (!target) throw new Error(`No service page called ${slug}`);
  return `\n          <a class="link-quiet card-link" href="${target.slug}">${esc(target.linkText)}</a>`;
}

export function renderPage(svc, collection = COLLECTIONS[0], policy = sitePolicy()) {
  const url = SITE + svc.slug;
  const others = collection.items.filter((s) => s.slug !== svc.slug);
  const ogTitle = svc.title.replace(/ \| Third Shift$/, "") + " — Third Shift";
  const { log, handles, how, person, fit } = svc;
  const jump = how ? ["#how-it-works", "How it works"] : ["#what-it-handles", "What it takes off your plate"];

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
<title>${esc(svc.title)}</title>
<meta name="description" content="${esc(svc.description)}">
<meta name="geo.region" content="CA-ON">
<meta name="geo.placename" content="Kitchener-Waterloo">
<link rel="canonical" href="${url}">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#060A14">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Third Shift">
<meta property="og:locale" content="en_CA">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(svc.description)}">
<meta property="og:image" content="https://thirdshift.ca/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Third Shift: the work that gets done while you sleep. AI automation for small businesses in Kitchener-Waterloo.">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${structuredData(svc, url, collection)}
</script>
<script>document.documentElement.classList.add("js");</script>
<link rel="preload" href="assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/styles.css">
<script type="module" src="assets/page.js"></script>
</head>
<body class="svc">
<a class="skip" href="#main">Skip to content</a>

<div class="sky" aria-hidden="true">
  <div class="stars"></div>
  <div class="dawn"></div>
</div>
<div class="spot" aria-hidden="true"></div>
<div class="progress" aria-hidden="true"></div>

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

<main id="main">

  <section class="svc-hero" data-hero aria-labelledby="page-title">
    <div class="wrap svc-hero-in">
      <div class="hero-copy">
        <nav class="crumbs" aria-label="Breadcrumb">
          <ol>
            <li><a href="./">Home</a></li>
            <li><a href="${collection.crumb.href}">${esc(collection.crumb.name)}</a></li>
            <li aria-current="page">${esc(svc.crumb)}</li>
          </ol>
        </nav>
        <h1 id="page-title">${svc.h1}</h1>
        <p class="lede">${esc(svc.lede)}</p>
        <div class="actions">
          <a class="btn btn-lg comet" href="./#contact" data-book>Book a free 20-minute call</a>
          <a class="link-quiet" href="${jump[0]}">${jump[1]}</a>
        </div>
      </div>
      <aside class="log log-static" aria-label="${esc(log.label)}" data-tilt>
        <header class="log-head">
          <strong>${esc(log.label)}</strong>
          <span>Kitchener</span>
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
      <header class="sec-head" data-reveal>
        <p class="kicker">${esc(handles.kicker)}</p>
        <h2 id="handles-title">${esc(handles.h2)}</h2>
        <p class="intro">${esc(handles.intro)}</p>
      </header>
      <ul class="cards">
${lines(handles.cards, ([h, p, link]) => `        <li class="card" data-glow data-reveal>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>${link ? cardLink(link) : ""}
        </li>`)}
      </ul>
    </div>
  </section>
${how ? `
  <section class="section" id="how-it-works" aria-labelledby="how-title">
    <div class="wrap">
      <header class="sec-head" data-reveal>
        <p class="kicker">${esc(how.kicker)}</p>
        <h2 id="how-title">${esc(how.h2)}</h2>
        <p class="intro">${esc(how.intro)}</p>
      </header>
      <ol class="steps" id="steps">
${lines(how.steps, ([h, p], i) => `        <li data-reveal>
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
      <header class="sec-head" data-reveal>
        <p class="kicker">${esc(person.kicker)}</p>
        <h2 id="person-title">${esc(person.h2)}</h2>${person.intro ? `
        <p class="intro">${esc(person.intro)}</p>` : ""}
      </header>
      <ul class="principles">
${lines(person.items, ([h, p]) => `        <li data-reveal>
          <h3>${esc(h)}</h3>
          <p>${esc(p)}</p>
        </li>`)}
      </ul>
    </div>
  </section>

  <section class="section" aria-label="Who it’s for and what it works with">
    <div class="wrap fit">
      <div data-reveal>
        <p class="kicker">Who it’s for</p>
        <h2>A good fit if</h2>
        <ul class="fit-list">
${lines(fit.items, (t) => `          <li>${esc(t)}</li>`)}
        </ul>
      </div>
      <div data-reveal>
        <p class="kicker">Works with</p>
        <h2>What you already run</h2>
        <ul class="custom-list" aria-label="Systems it works with">
${lines(fit.tools, (t) => `          <li>${esc(t)}</li>`)}
        </ul>
        <p class="fit-note">Using something else? Ask. If you can log into it, there’s usually a way to connect it.</p>
      </div>
    </div>
  </section>

  <section id="faq" class="section" aria-labelledby="faq-title">
    <div class="wrap faq">
      <header class="sec-head" data-reveal>
        <p class="kicker">Questions</p>
        <h2 id="faq-title">What owners ask</h2>
      </header>
      <div class="faq-list" data-reveal>
${lines(svc.faq, ([q, a]) => `        <details>
          <summary>${esc(q)}</summary>
          <p>${esc(a)}</p>
        </details>`)}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="more-title">
    <div class="wrap">
      <header class="sec-head" data-reveal>
        <p class="kicker">${esc(collection.more.kicker)}</p>
        <h2 id="more-title">${esc(collection.more.h2)}</h2>
      </header>
      <ul class="more-list" data-reveal>
${lines(others, (o) => `        <li><a href="${o.slug}"><strong>${esc(o.crumb)}</strong><span>${esc(o.more)}</span></a></li>`)}
      </ul>
    </div>
  </section>

  <section class="section" aria-labelledby="cta-title">
    <div class="wrap">
      <div class="cta-end" data-glow data-reveal data-cta-end>
        <div>
          <p class="kicker">Book a call</p>
          <h2 id="cta-title">${esc(svc.cta.h2)}</h2>
          <p>${esc(svc.cta.p)}</p>
        </div>
        <a class="btn btn-lg" href="./#contact" data-book>Book a free 20-minute call</a>
      </div>
      <p class="cta-alt">Prefer email? <a href="mailto:thirdshift.ca@gmail.com">thirdshift.ca@gmail.com</a></p>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <p class="foot-line" data-reveal>Shift ends 7:00 AM.<br><span>Your team starts the day with it done.</span></p>
    <div class="foot-grid">
      <div>
        <div>Third Shift — AI automation for small businesses, Kitchener-Waterloo, Ontario</div>
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
