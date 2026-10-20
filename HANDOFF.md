# Third Shift: handoff

The site is live at https://thirdshift.ca (GitHub Pages, HTTPS on), with a page for each service. The
contact form, the CRM and the booking link are built but switched off until the steps below are done.
Until then, every "Book a call" button leads to a form that says it isn't connected yet, so the booking
link (step 3) is the quickest way to make the site take leads. Work down the list in order.

Decided on Oct 20, 2026: business email runs on **Google Workspace** on thirdshift.ca. The CRM sheet,
both Apps Script projects and the booking calendar belong to the Workspace user (suggested:
`office@thirdshift.ca`, named "Third Shift"), not to thirdshift.ca@gmail.com. The sales bot runs as that
user too.

Also decided that night: the owner stays anonymous in anything public. The site, emails, posts, docs and
commits in this repo never name the owner or mention a job, employer, career or background, and
Third Shift speaks as "we". Commits here are authored "Third Shift <hello@thirdshift.ca>".

## Your to-do list

### 1. Lock down the accounts (2FA)

Use an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) or a passkey, not
text messages. Save each set of backup codes somewhere offline.

| Account | Why it matters | Where |
|---|---|---|
| GoDaddy | Whoever controls it controls thirdshift.ca | Account Settings > Login & PIN > 2-Step Verification. Then My Products > thirdshift.ca > turn on Domain Protection (lock) and Auto-renew. |
| Google (thirdshift.ca@gmail.com, and the Workspace user once it exists) | Holds the CRM sheet, both scripts and the inbox | myaccount.google.com > Security > 2-Step Verification. Add a passkey too. |
| GitHub (spacejam91) | Whoever has it can change the live site | github.com > Settings > Password and authentication > Two-factor authentication |
| Instagram, X, Facebook, LinkedIn | Brand accounts get hijacked for scams | Each app's Settings > Security > Two-factor authentication, as the marketing bot sets them up |
| Any email-sending or outreach service | The sales bot will send from it | Its security settings, before the first send |

### 2. Google Workspace on thirdshift.ca

1. Sign up for Google Workspace **Business Starter** with the domain thirdshift.ca. Create the user as
   first name "Third", last name "Shift", with the address `office@thirdshift.ca`, and turn on 2-step
   verification for it straight away. That name and address are what prospects see as the organizer
   on calendar invites and on the booking page, so they show the business, not a person. Cold email
   goes out from its own send-as alias with its own display name (see `third-shift-outreach/README.md`),
   so it isn't tied to this account's name.
2. Workspace asks you to verify the domain with a TXT record. Add it in GoDaddy (My Products >
   thirdshift.ca > DNS > Add record). Leave every existing record alone: the A records, the `www`
   CNAME and the `_github-pages-challenge-spacejam91` TXT keep the site up.
3. Add the MX record the setup wizard shows (`smtp.google.com`, priority 1). Mail to @thirdshift.ca
   starts arriving in Workspace once it takes effect.
4. In the Admin console, add `hello@thirdshift.ca` as an alias of that user.
5. Set up SPF, DKIM and DMARC for thirdshift.ca. The exact records are in
   `third-shift-outreach/README.md`, section 1, which also covers the separate domain cold email will
   go out from. The sales bot can check every record once you've added them.
6. Tell the thirdshift session when `hello@thirdshift.ca` receives mail. It then swaps the address on the
   site, in the contact form's emails and in the privacy page. Until then, everything keeps using
   thirdshift.ca@gmail.com.

### 3. Booking link

The fastest way to make every "Book a call" button work. Make it as the Workspace user: the sales bot
watches that account's calendar to notice booked calls.

1. In Google Calendar, Create > **Appointment schedule**. Title: "Third Shift: free 20-minute call".
2. Duration 20 minutes. Set the hours you can take calls, a minimum notice (a day is sensible) and a
   buffer of 10 minutes between calls.
3. Location: Google Meet, or phone if you prefer. If the booking form lets you add questions, ask for the
   company name and "What takes up your team's time?".
4. Save, open the booking page, and copy its link.
5. Paste the link to the thirdshift session. It goes into `BOOKING_URL` in `site/assets/config.js`, and
   from then on every "Book a call" button on every page opens it.

If Workspace won't be ready before the marketing launch on Monday Oct 26, make the schedule under
thirdshift.ca@gmail.com for now and swap the link later. It's a one-line change.

### 4. Turn on the contact form (intake)

1. Signed in as the Workspace user, create a Google Sheet named **Third Shift CRM**.
2. In the sheet: Extensions > Apps Script. Create files matching `backend/intake/`, paste in `Schema.gs`, `Code.gs` and the contents of `appsscript.json` (Project Settings > show the manifest file).
3. Run `selfTest` once from the editor and approve the permissions. A test lead should land on the Leads tab and two emails should arrive.
4. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Copy the web app URL.
5. Paste it to the thirdshift session (or into `LEAD_ENDPOINT` in `site/assets/config.js`), then commit and push (see "Everyday" below).
6. Send the sheet's id (the long part of its URL) to the sales bot. It needs it too.

### 5. Turn on the CRM

1. Create a new **standalone** Apps Script project (script.google.com > New project) as the Workspace user. Add the files from `backend/crm/` (`Schema.gs`, `Crm.gs`, `Index.html`, and the manifest from `appsscript.json`).
2. Project Settings > Script properties: `CRM_SHEET_ID` = the long id in the CRM sheet's URL.
3. Run `setupCrm` once. It builds the tabs, adds you to `CRM_USERS` and sets the 7 AM summary email.
4. Deploy > New deployment > Web app (Execute as: User accessing, Who has access: Only myself).
   Open its URL and install it as a desktop app: in Chrome, the menu > Cast, save and share > Install
   page as app (or Create shortcut, with "Open as window" ticked); in Edge, the menu > Apps > Install
   this site as an app. It opens in its own window with the Third Shift icon, and you can pin it to the
   taskbar. On a phone, use Add to Home screen.
5. In the intake project's Script properties, set `CRM_URL` to that URL so new-lead emails link straight to the CRM.

To try the CRM screen with demo data on this computer first: `node tools/crm-preview.mjs`, then open http://127.0.0.1:8915.

### 6. Get found: Search Console and Bing

The site side is done: titles, descriptions, structured data for the business, each service and the FAQs,
breadcrumbs, a sitemap with all seven pages, robots.txt and llms.txt. These two steps need your accounts.

**Google Search Console** (about 10 minutes, plus waiting for DNS):

1. Go to search.google.com/search-console and sign in (thirdshift.ca@gmail.com is fine; you can add the
   Workspace user as an owner later under Settings > Users and permissions).
2. Add property > **Domain** > `thirdshift.ca`. Google shows a TXT record. Copy it.
3. In GoDaddy DNS, add a TXT record with Name `@` and that value. Several TXT records on `@` are fine.
4. Back in Search Console, press Verify. If it says not found, wait an hour and try again.
5. Sitemaps > enter `sitemap.xml` > Submit.
6. Optional: URL Inspection > paste each page's address > Request indexing. It speeds up the first visit.

**Bing Webmaster Tools** (2 minutes, after Search Console is verified): go to bing.com/webmasters, sign
in, and choose **Import from Google Search Console**. It brings the site and the sitemap across, and it
also covers DuckDuckGo and the search inside ChatGPT.

### 7. Google Business Profile

For "automation Kitchener" style searches this is probably the strongest single listing, and Google's
verification can take days or weeks, so start it early.

1. business.google.com > Add business. Name: **Third Shift**. Primary category: "Business management
   consultant". Add "Software company" as a second category if offered.
2. When it asks about a location customers can visit, say **no**. That makes it a service-area business
   with your address hidden. Service areas: Kitchener, Waterloo, Cambridge.
3. Website: `https://thirdshift.ca/?utm_source=google&utm_medium=social&utm_campaign=bio` (the tags
   let the CRM show leads that came from the profile).
4. Verify the way Google offers (video, phone, email or postcard). For a video, Google lists what to show.
5. Once verified, fill it in from `third-shift-marketing/docs/PROFILE-KIT.md` (description and photos), add
   the five services with a line each from the service pages, and add the booking link from step 3.
6. Tell the marketing bot it's live. It then connects the profile in Zernio and posts there weekly.

Either Google account can own it. If you make it as thirdshift.ca@gmail.com, add the Workspace user as an
owner later, from the profile's settings (the people and access, or managers, page).

### 8. Bot check on the form (optional, free)

**Cloudflare Turnstile** stops form spam if it starts: Cloudflare > Turnstile > Add site for
thirdshift.ca. The site key goes in `TURNSTILE_SITE_KEY` in `config.js`, and the secret goes in the
intake project's `TURNSTILE_SECRET` script property.

### 9. Local listings

Greater Kitchener Waterloo Chamber of Commerce, Communitech, the Waterloo Region Small Business Centre,
and a LinkedIn company page. Each links back to the site.

### 10. Smaller items

- **Social links:** the footer and the structured data point at instagram.com/thirdshift.ca, x.com/thirdshiftca and facebook.com/thirdshift.ca. Add LinkedIn when the page exists (there's a commented-out line in the footer of `site/index.html`).
- **Legal name:** the footer and `LICENSE` say "Third Shift", which keeps the owner off the site. Registering the business name or incorporating later doesn't need to change that, but public business registries do list who is behind a registered name.
- **Pricing:** none on the site for now (decided Oct 20). A "from $X" line can go on the home page and the service pages whenever you want one.
- **IPv6 (optional):** in GoDaddy DNS, add AAAA records for @ pointing to 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153 and 2606:50c0:8003::153.
- **Keeping the code private:** the repo has to be public for free GitHub Pages. `LICENSE` says all rights reserved, which is what protects it legally. If you want the source hidden as well, a GitHub Pro plan lets Pages run from a private repo. The pages themselves are always visible in a browser.

## Copy: signed off

The owner confirmed the site copy on Oct 20, 2026: "First builds typically ship within a few weeks",
"We'll reply within one business day" (form, auto-reply and success message), "We meet in person" across
Waterloo Region, and the "Built to fit" list. The service and "who it's for" pages added the same day use
only those claims. Anything new that promises a time, a price or a result needs the owner's OK first.

Changed after sign-off, on the owner's word the same night:
- "Nothing pays, posts or sends money without a person signing off" became "No money is paid or sent
  without a person signing off", because the example log shows matched invoices being posted automatically.
- The "Who's behind it" paragraph became "Where we work", with no name or background (see the anonymity
  note at the top).
- Service area: in person across Waterloo Region, and elsewhere in Ontario by video call.

## How it fits together

- `site/` is the website. It's plain HTML, CSS and JavaScript with no build step. GitHub Actions runs the tests, then publishes this folder on every push to `main`.
- The five service pages (`site/invoice-automation.html` and the others) are written from `content/services.mjs` by `tools/build-pages.mjs`. Change the words in `content/services.mjs`, run `npm run pages`, and commit both. A test fails if the two disagree. The pages are committed as built, so deploys still have no build step.
- `backend/intake/` is the public form endpoint, an Apps Script bound to the CRM sheet. It saves the lead first, then files it as company, contact, deal and inquiry, and records where the visitor came from (campaign tags or referring site).
- `backend/crm/` is the private CRM web app over the same sheet.
- `social-kit/` holds the logos, banners and animated videos for social profiles. Its README says what goes where.
- `tools/` holds the local preview server, the CRM preview, the page builder, and the brand and video renderers.
- `docs/SYSTEM.md` describes how the site, the sales bot and the marketing bot work together: who owns what, the shared CRM, campaign tags, and how each bot reports back.

Why this stack: browsers only run HTML, CSS and JavaScript, so every site ends up as those three whatever
it's written in. Python or Java would mean renting and patching a server for pages that don't need one.
If the site grows to many more pages of its own (case studies, a blog), move `site/` to a static site
generator such as Astro: same output, same free hosting. Anything that needs a database or a login
lives in the backend, as the intake and CRM already do.

The bots: the sales bot (prospecting and outreach, repo `third-shift-outreach`) and the marketing bot (content and social) each run in their own lane and report to the main Third Shift session. The business manager bot gets a lane in `docs/SYSTEM.md` when it starts.

## Everyday

| To | Run |
|---|---|
| Preview the site | `npm run serve`, then http://127.0.0.1:8914 |
| Run the tests | `npm test` |
| Rebuild the service pages after changing `content/services.mjs` | `npm run pages` |
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

Workspace (step 2) and Search Console (step 6) each add a TXT record on `@`, and Workspace adds the MX
record. None of them touch the records above.

## Design and security notes

- The night network, the shift log and the dawn at the bottom carry the page. New sections should stay quiet around them.
- Motion should mean something (a job getting done), not decorate. On Oct 20, at the owner's word, these went: the two crossing slogan ribbons above the form (now one still line of the four promises), the rubber stamps ("Free call", "Fixed price", "Human sign-off"), the ring trailing the mouse, buttons pulled toward the mouse, section labels scrambling in, and the "jobs kicked off since you got here" pop-up. The four service-card illustrations now play once as each card arrives, rest on their finished picture, and replay on hover.
- Palette tokens are at the top of `site/assets/styles.css`. On wide monitors everything sized in rem scales up gently, from 16px at 1440 wide to 22px at the cap.
- The log lines, the fast-forward summary, the service pages' example logs and the videos show example nights. Once there's a real client, swap in real (anonymised) numbers.
- Every page carries a Content-Security-Policy meta tag; `_headers` has the same rules for hosts that read it, and a test keeps them all in step. Scripts are first-party only, and there are no trackers. The privacy page promises that, so keep it true.
- If the site is ever served from a domain that isn't thirdshift.ca, it shows a "This is a copy" note linking back here.
