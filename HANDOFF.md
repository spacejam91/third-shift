# Third Shift — site v1 handoff

Files: `index.html` (the site, single file, no build step) and `Code.gs` (form backend).

## Deploy order

1. **Form backend** — follow the header comment in `Code.gs`. Paste the web app URL into `LEAD_ENDPOINT` in `index.html`. Run `selfTest_` once from the editor; a row should land in the sheet and an email in the gmail.
2. **Hosting** — Cloudflare Pages (free, fast, no server):
   - Cloudflare → Workers & Pages → Create → Pages → Upload assets → drop the folder (just `index.html`).
   - Custom domains → add `thirdshift.ca` and `www.thirdshift.ca`.
3. **DNS** — easiest is to move nameservers from GoDaddy to Cloudflare (Cloudflare → Add site → it gives two nameservers → GoDaddy → DNS → Nameservers → Change). That also unlocks Cloudflare Email Routing for `hello@thirdshift.ca` → gmail, free. Propagation is usually under an hour.
4. Until the mailbox exists, the site already shows `hello@thirdshift.ca`; get Email Routing live before the first visitor, or swap to the gmail in the two `mailto:` links and the footer.

In Claude Code: `git init`, commit these three files, and iterate from there. Every edit is just "re-upload to Pages" (or connect the repo to Pages for auto-deploy on push).

## Copy you need to sign off on

Written on your behalf — change anything that isn't true or isn't how you'd say it:

- "Who's behind it": says you spent years inside accounts payable / finance ops automating your own job. Doesn't name an employer.
- "First builds typically ship within a few weeks." — delivery promise.
- "We'll reply within one business day." — appears on the form, the auto-reply, and the success message. Keep them in sync if you change it.
- "We meet in person." — Waterloo Region only; fine if you mean it.
- Services list leans on AP/invoicing first. Reorder if you want lead intake to lead.
- No pricing anywhere yet. Add a "from $X" line to step 2 once you've decided; small-business buyers filter on it.
- Legal footer says "© 2026 Third Shift". Once the business name is registered under the corp, add "[Legal Name] o/a Third Shift" there.

## Social links in the footer

Instagram `thirdshift.ca`, X `thirdshiftca`, Facebook `thirdshift.ca` match what you set up. The LinkedIn URL (`/company/thirdshiftca`) is a guess at the slug you'll pick — fix it when the company page exists.

## Design notes (for future edits)

- One memorable element: the dark "Tonight's shift" log panel. Everything else stays quiet. Don't add cards/gradients around it.
- Palette tokens live at the top of the CSS; dark mode is handled via `prefers-color-scheme` and `data-theme`.
- Fonts: Bricolage Grotesque (all text) + IBM Plex Mono (log panel only), from Google Fonts.
- The log lines are illustrative. Once there's a real client build, replace them with real (anonymized) numbers — far more convincing.
