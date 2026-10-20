# Third Shift: how the pieces work together

The bots, each its own working session, build and run Third Shift. Each one has its own lane and does only that work.
The bots report to **thirdshift**, which pulls everything together for the owner. Nobody does another
lane's work. If a job seems to belong to two lanes, the lane table below decides. If it isn't
listed, ask thirdshift.

## Lanes

| Lane | Session | Owns | Does not touch |
|---|---|---|---|
| Hub: site, intake, CRM core, brand | **thirdshift** | The `third-shift` repo: `site/`, `backend/intake/`, `backend/crm/` (apart from the Outreach view), `tools/`, `social-kit/`, `docs/`. Owns the CRM schema, deploys, and the owner's combined updates. | Doesn't prospect, email prospects or post to social. |
| Sales | **sales bot** | The `third-shift-outreach` repo: finding companies, enriching them, drafting and sending outreach, follow-ups, tracking replies. Also the Outreach view inside the CRM screen and the server functions it calls, its own tabs in the CRM sheet, and the Suppression list. | Doesn't touch `site/`, `tools/`, `social-kit/` or brand files. Doesn't post to social or make marketing content. |
| Marketing | **marketing bot** | Its own folder (`third-shift-marketing`): content calendar, post copy, social profile setup, scheduling. Uses the files in `social-kit/` as they are. | Doesn't touch `site/`, `backend/`, `tools/` or `social-kit/`. Doesn't email prospects or build lead lists. |
| Community | **community bot** (from when the owner starts it) | Day-to-day talk on Third Shift's own social accounts: replies to comments, mentions and messages people send us, likes and follows, and short, useful replies in Ontario small-business and AI threads. Keeps its log in the shared notes folder. | Doesn't publish posts or change profiles (marketing), doesn't pitch, cold-message or build lead lists (sales), and commits to no repo. |
| Business manager | **business manager bot** (coming) | To be set when the owner starts it. It gets its own lane and reports to thirdshift like the others, and this table is updated before it starts work. | Until then, no session takes on business-manager work. |

Need something from another lane? Message its session; don't do the work yourself:
- Need a site page, a CRM schema change, new brand art or a video? Ask thirdshift.
- Need a prospect list or an email sent? Ask the sales bot.
- Need a post? Ask the marketing bot.
- Someone to answer in comments or mentions? Ask the community bot.

### Community bot rules

- **Every reply, like and follow is a draft** until the owner OKs it in the community bot's chat. On X that's about 5 follows and 2 or 3 replies a day at most; other platforms get the same restraint.
- **It speaks as "we", for Third Shift.** It never names the owner or mentions a job, employer or background.
- **When someone asks about working with us** (price, a call, their own process), it points them to the site or the booking link with `utm_campaign=reply`. It quotes no prices or timelines and tells thirdshift, which logs them in the CRM. From then on, the sales bot leaves them alone.
- **It never sends the first message** to anyone in private. Cold contact is the sales bot's, and only by email.

## One source of truth: the CRM Google Sheet

- **Core tabs:** `Leads`, `Companies`, `Contacts`, `Deals` and `Activities`.
  - Their columns are defined once, in `backend/crm/Schema.gs`. The copies in `backend/intake/` and `third-shift-outreach/src/` must match it.
  - A change to these five tabs goes through thirdshift, which updates all three copies together.
- **Sales tabs:** the sales bot adds its own tabs (prospects, sequences, drafts, `Suppression`) to the same spreadsheet. It owns them.
- **Every touch is logged:** every person a bot contacts is a Contact, and every touch is an Activity on their Deal (email sent, reply, call, inquiry). The CRM screen is the one place the owner looks.
- **System activity types:** `Inquiry` (intake), `Reply` (the sales bot, for inbound replies) and `Stage` (stage moves) are written by code only. People can't add them by hand in the CRM screen, so a bot can trust them.

## No doubling up on a person

- **Before any outbound email:** the sales bot checks the CRM and skips anyone who:
  - is on the Suppression list, or
  - has an inbound Inquiry or Reply activity, or
  - has a Deal past "New" that came from the website.
- **When a prospect fills in the site form:** intake matches them by email. The inquiry joins their existing Contact and Deal; no duplicate is made. The sales bot sees the Inquiry and stops its sequence for that person.
- **Any reply, inquiry or opt-out pauses all automated outreach to that contact.**

## Where leads come from

Every link to thirdshift.ca that a bot publishes carries campaign tags, so the CRM shows what worked. Never put names, emails or contact ids in a URL.

| From | Tags |
|---|---|
| Social posts | `?utm_source=<instagram, x, facebook, linkedin, tiktok>&utm_medium=social&utm_campaign=<post-slug>` |
| Profile links | Same, with `utm_campaign=bio`, or `page-button` for the Facebook action button |
| Community replies | Same, with `utm_campaign=reply` |
| Google Business Profile | `?utm_source=google&utm_medium=social&utm_campaign=<post-slug or bio>` |
| Outreach emails | `?utm_source=outreach&utm_medium=email&utm_campaign=cold-vN-<industry>` (the sales bot bumps N when the copy changes; `cold-v2` since Oct 20) |

Links may land on any page: the home page, a service page (`/invoice-automation` and the others) or a "who it's for" page (`/trades`, `/distributors`, `/clinics`, `/professional-services`, `/manufacturers`). The sales bot links each industry to its page; logistics, property and anything else go to the home page.

Whichever page a visit starts on, the site keeps the first tags the visitor arrived with and sends them along with the form. Intake writes them to the `Leads` tab and sets the Deal's `source`:

| `utm_source` | Deal source |
|---|---|
| `outreach` | Cold outreach (the same name the sales bot uses on the deals it creates) |
| `instagram`, `x`, `facebook`, `linkedin`, `tiktok`, `google` | Instagram, X, Facebook, LinkedIn, TikTok, Google |
| anything else | the tag as written |
| no tags | the referring site (Google, Bing, Instagram and so on), else Website |

`utm_campaign` is free text and kept as written on the lead.

## Approvals and limits (every lane)

- **Drafts first:** nothing public or outbound goes out without the owner's OK (posts, emails, profile changes), until the owner tells a bot it can run on its own.
- **Real-world actions are the owner's:** no new accounts, purchases, domains or paid tools without the owner's say-so.
- **Copy:** no invented clients, results or testimonials. Claims must match the site: fixed-price builds, people approve the money, read-only access where possible, we meet in person in Waterloo Region.
- **Privacy:** no ad pixels or trackers on the site. The privacy page promises none.
- **CASL:** the sales bot owns compliance (identification, unsubscribe, consent basis). The Suppression list applies to every lane.

## Reporting to thirdshift

At the end of each block of work, each bot sends thirdshift one message in this shape:

```
REPORT <sales bot | marketing bot | community bot>
Done: what changed since the last report
Committed: repo, commit, files (or "nothing yet")
Needs from thirdshift: schema, site or asset requests (or "none")
Needs the owner: decisions or approvals waiting on the owner (or "none")
Next: what it will do next
```

thirdshift checks the claims (repo state, files), answers the requests in its lane, and gives the owner one combined update.

## Shared repo etiquette

`third-shift` is one checkout shared by sessions:
- Stage only your own paths (`git add backend/crm tests/...`). Never `git add -A`, stash, reset or check out.
- Message thirdshift before pushing to `main`, because a push deploys the site.

## Daily rhythm once live (proposed; times are Toronto)

| When | What |
|---|---|
| Real time | Site inquiries go to intake, then the CRM and an email to the owner. |
| Weekdays 7:00 AM | Sales bot: new prospects, today's first emails and follow-ups as drafts for approval. |
| Weekdays during the day | Sales bot: replies logged to the CRM, and their sequences paused. |
| Per the content calendar | Marketing bot: posts drafted for approval, then scheduled. |
| Mondays | Each bot reports last week's numbers to thirdshift: emails sent, replies, posts, clicks and leads by source. thirdshift sends the owner one summary. |
