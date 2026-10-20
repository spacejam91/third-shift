# Third Shift: handoff

The site is live at https://thirdshift.ca (GitHub Pages, HTTPS on). The contact form, the CRM and
the booking link are built but switched off until the steps below are done. Work down the list in order.

## Your to-do list

### 1. Lock down the accounts (2FA)

Use an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) or a passkey, not
text messages. Save each set of backup codes somewhere offline.

| Account | Why it matters | Where |
|---|---|---|
| GoDaddy | Whoever controls it controls thirdshift.ca | Account Settings > Login & PIN > 2-Step Verification. Then My Products > thirdshift.ca > turn on Domain Protection (lock) and Auto-renew. |
| Google (thirdshift.ca@gmail.com) | Holds the CRM sheet, both scripts and the inbox | myaccount.google.com > Security > 2-Step Verification. Add a passkey too. |
| GitHub (spacejam91) | Whoever has it can change the live site | github.com > Settings > Password and authentication > Two-factor authentication |
| Instagram, X, Facebook, LinkedIn | Brand accounts get hijacked for scams | Each app's Settings > Security > Two-factor authentication, as the marketing bot sets them up |
| Any email-sending or outreach service | The sales bot will send from it | Its security settings, before the first send |

### 2. Turn on the contact form (intake)

1. Signed in as thirdshift.ca@gmail.com, create a Google Sheet named **Third Shift CRM**.
2. In the sheet: Extensions > Apps Script. Create files matching `backend/intake/`, paste in `Schema.gs`, `Code.gs` and the contents of `appsscript.json` (Project Settings > show the manifest file).
3. Run `selfTest` once from the editor and approve the permissions. A test lead should land on the Leads tab and two emails should arrive.
4. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Copy the web app URL.
5. Paste it into `LEAD_ENDPOINT` in `site/assets/config.js`, then commit and push (see "Everyday" below).

### 3. Turn on the CRM

1. Create a new **standalone** Apps Script project (script.google.com > New project). Add the files from `backend/crm/` (`Schema.gs`, `Crm.gs`, `Index.html`, and the manifest from `appsscript.json`).
2. Project Settings > Script properties: `CRM_SHEET_ID` = the long id in the CRM sheet's URL.
3. Run `setupCrm` once. It builds the tabs, adds you to `CRM_USERS` and sets the 7 AM summary email.
4. Deploy > New deployment > Web app (Execute as: User accessing, Who has access: Only myself). Bookmark the URL.
5. In the intake project's Script properties, set `CRM_URL` to that URL so new-lead emails link straight to the CRM.

To try the CRM screen with demo data on this computer first: `node tools/crm-preview.mjs`, then open http://127.0.0.1:8915.

### 4. Booking link and bot check (optional, both free)

- **Booking link:** make a Google Calendar appointment schedule or a Cal.com page for a 20-minute call. Put its https link in `BOOKING_URL` in `site/assets/config.js`. Every "Book a call" button then opens it.
- **Cloudflare Turnstile** (stops form spam if it starts): Cloudflare > Turnstile > Add site for thirdshift.ca. The site key goes in `TURNSTILE_SITE_KEY` in `config.js`, and the secret goes in the intake project's `TURNSTILE_SECRET` script property.

### 5. Get found (SEO off the site)

The site itself is done: titles, descriptions, structured data for the business, services and FAQ, sitemap, robots.txt and llms.txt. The rest needs your accounts:

1. **Google Search Console** (search.google.com/search-console): add a Domain property for thirdshift.ca. It gives you a TXT record; add it in GoDaddy DNS. Then Sitemaps > submit `https://thirdshift.ca/sitemap.xml`.
2. **Bing Webmaster Tools** (bing.com/webmasters): sign in and import from Search Console. One click, and it also covers DuckDuckGo and ChatGPT search.
3. **Google Business Profile** (business.google.com): this is the biggest one for local search.
   - Set it up as a service-area business (hide the street address) serving Kitchener, Waterloo and Cambridge.
   - Primary category "Business management consultant", and add "Software company".
   - Use `social-kit/profile-picture.png` and the cover images.
   - Ask your first clients for reviews there.
4. **Local listings:** Greater Kitchener Waterloo Chamber of Commerce, Communitech, the Waterloo Region Small Business Centre, and a LinkedIn company page. Each links back to the site.

### 6. Copy to sign off

Written on your behalf. Change anything that isn't true or isn't how you'd say it.

- "Who's behind it" says you spent years in accounts payable and finance operations automating your own job. It names no employer.
- "First builds typically ship within a few weeks."
- "We'll reply within one business day." This appears on the form, in the auto-reply and in the success message, so keep all three in step.
- "We meet in person" across Waterloo Region (Kitchener, Waterloo, Cambridge).
- There's no pricing yet. A "from $X" line on step 2 helps small-business buyers decide to call.
- The footer says "© 2026 Third Shift". Once the name is registered, make it "[Legal name] o/a Third Shift" there and in `LICENSE`.

### 7. Smaller items

- **Social links:** the footer and the structured data point at instagram.com/thirdshift.ca, x.com/thirdshiftca and facebook.com/thirdshift.ca. Confirm those are the handles, and add LinkedIn when the page exists (there's a commented-out line in the footer of `site/index.html`).
- **Email at the domain:** hello@thirdshift.ca forwarding to the Gmail (GoDaddy email forwarding, or ImprovMX free). Then swap `NOTIFY_TO` and `REPLY_TO` in `backend/intake/Code.gs` and the addresses on the site.
- **IPv6 (optional):** in GoDaddy DNS, add AAAA records for @ pointing to 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153 and 2606:50c0:8003::153.
- **Keeping the code private:** the repo has to be public for free GitHub Pages. `LICENSE` says all rights reserved, which is what protects it legally. If you want the source hidden as well, a GitHub Pro plan lets Pages run from a private repo. The pages themselves are always visible in a browser.

## How it fits together

- `site/` is the website. It's plain HTML, CSS and JavaScript with no build step. GitHub Actions runs the tests, then publishes this folder on every push to `main`.
- `backend/intake/` is the public form endpoint, an Apps Script bound to the CRM sheet. It saves the lead first, then files it as company, contact, deal and inquiry, and records where the visitor came from (campaign tags or referring site).
- `backend/crm/` is the private CRM web app over the same sheet.
- `social-kit/` holds the logos, banners and animated videos for social profiles. Its README says what goes where.
- `tools/` holds the local preview server, the CRM preview, and the brand and video renderers.
- `docs/SYSTEM.md` describes how the site, the sales bot and the marketing bot work together: who owns what, the shared CRM, campaign tags, and how each bot reports back.

The bots: the sales bot (prospecting and outreach, repo `third-shift-outreach`) and the marketing bot (content and social) each run in their own lane and report to the main Third Shift session. The business manager bot gets a lane in `docs/SYSTEM.md` when it starts.

## Everyday

| To | Run |
|---|---|
| Preview the site | `npm run serve`, then http://127.0.0.1:8914 |
| Run the tests | `npm test` |
| Publish | commit, then `git push` (live in about a minute) |
| Preview the CRM with demo data | `node tools/crm-preview.mjs`, then http://127.0.0.1:8915 |
| Redraw logos, icons and banners | `node tools/render-brand.mjs` |
| Re-render the animated videos | `node tools/render-motion.mjs` (needs ffmpeg) |

## DNS at GoDaddy (for reference)

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
| CNAME | www | spacejam91.github.io |
| TXT | _github-pages-challenge-spacejam91 | (GitHub's domain verification, leave it) |

## Design and security notes

- The night network, the shift log and the dawn at the bottom carry the page. New sections should stay quiet around them.
- Palette tokens are at the top of `site/assets/styles.css`. On wide monitors everything sized in rem scales up gently, from 16px at 1440 wide to 22px at the cap.
- The log lines, the fast-forward summary and the videos show an example night. Once there's a real client, swap in real (anonymised) numbers.
- Every page carries a Content-Security-Policy meta tag; `_headers` has the same rules for hosts that read it. Scripts are first-party only, and there are no trackers. The privacy page promises that, so keep it true.
- If the site is ever served from a domain that isn't thirdshift.ca, it shows a "This is a copy" note linking back here.
