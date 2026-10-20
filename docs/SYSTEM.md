# Third Shift: how the pieces work together

Three bots, each its own working session, build and run Third Shift. Each one has its own lane and does only that work.
The bots report to **thirdshift**, which pulls everything together for Aaron. Nobody does another
lane's work. If a job seems to belong to two lanes, the lane table below decides. If it isn't
listed, ask thirdshift.

## Lanes

| Lane | Session | Owns | Does not touch |
|---|---|---|---|
| Hub: site, intake, CRM core, brand | **thirdshift** | The `third-shift` repo: `site/`, `backend/intake/`, `backend/crm/` (apart from the Outreach view), `tools/`, `social-kit/`, `docs/`. Owns the CRM schema, deploys, and Aaron's combined updates. | Doesn't prospect, email prospects or post to social. |
| Sales | **sales bot** | The `third-shift-outreach` repo: finding companies, enriching them, drafting and sending outreach, follow-ups, tracking replies. Also the Outreach view inside the CRM screen and the server functions it calls, its own tabs in the CRM sheet, and the Suppression list. | Doesn't touch `site/`, `tools/`, `social-kit/` or brand files. Doesn't post to social or make marketing content. |
| Marketing | **marketing bot** | Its own folder (`third-shift-marketing`): content calendar, post copy, social profile setup, scheduling. Uses the files in `social-kit/` as they are. | Doesn't touch `site/`, `backend/`, `tools/` or `social-kit/`. Doesn't email prospects or build lead lists. |
| Business manager | **business manager bot** (coming) | To be set when Aaron starts it. It gets its own lane and reports to thirdshift like the others, and this table is updated before it starts work. | Until then, no session takes on business-manager work. |

Need something from another lane? Message its session; don't do the work yourself:
- Need a site page, a CRM schema change, new brand art or a video? Ask thirdshift.
- Need a prospect list or an email sent? Ask the sales bot.
- Need a post? Ask the marketing bot.

## One source of truth: the CRM Google Sheet

- **Core tabs:** `Leads`, `Companies`, `Contacts`, `Deals` and `Activities`.
  - Their columns are defined once, in `backend/crm/Schema.gs`. The copies in `backend/intake/` and `third-shift-outreach/src/` must match it.
  - A change to these five tabs goes through thirdshift, which updates all three copies together.
- **Sales tabs:** the sales bot adds its own tabs (prospects, sequences, drafts, `Suppression`) to the same spreadsheet. It owns them.
- **Every touch is logged:** every person a bot contacts is a Contact, and every touch is an Activity on their Deal (email sent, reply, call, inquiry). The CRM screen is the one place Aaron looks.

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
| Outreach emails | `?utm_source=outreach&utm_medium=email&utm_campaign=<sequence-id>` |

The site keeps the first tags a visitor arrived with and sends them along with the form. Intake writes them to the `Leads` tab, and the Deal's `source` becomes Outreach, Instagram, X, and so on, or Website when there are no tags.

## Approvals and limits (every lane)

- **Drafts first:** nothing public or outbound goes out without Aaron's OK (posts, emails, profile changes), until he tells a bot it can run on its own.
- **Real-world actions are Aaron's:** no new accounts, purchases, domains or paid tools without his say-so.
- **Copy:** no invented clients, results or testimonials. Claims must match the site: fixed-price builds, people approve the money, read-only access where possible, we meet in person in Waterloo Region.
- **Privacy:** no ad pixels or trackers on the site. The privacy page promises none.
- **CASL:** the sales bot owns compliance (identification, unsubscribe, consent basis). The Suppression list applies to every lane.

## Reporting to thirdshift

At the end of each block of work, each bot sends thirdshift one message in this shape:

```
REPORT <sales bot | marketing bot>
Done: what changed since the last report
Committed: repo, commit, files (or "nothing yet")
Needs from thirdshift: schema, site or asset requests (or "none")
Needs Aaron: decisions or approvals waiting on him (or "none")
Next: what it will do next
```

thirdshift checks the claims (repo state, files), answers the requests in its lane, and gives Aaron one combined update.

## Shared repo etiquette

`third-shift` is one checkout shared by sessions:
- Stage only your own paths (`git add backend/crm tests/...`). Never `git add -A`, stash, reset or check out.
- Message thirdshift before pushing to `main`, because a push deploys the site.

## Daily rhythm once live (proposed; times are Toronto)

| When | What |
|---|---|
| Real time | Site inquiries go to intake, then the CRM and an email to Aaron. |
| Weekdays 7:00 AM | Sales bot: new prospects, today's first emails and follow-ups as drafts for approval. |
| Weekdays during the day | Sales bot: replies logged to the CRM, and their sequences paused. |
| Per the content calendar | Marketing bot: posts drafted for approval, then scheduled. |
| Mondays | Each bot reports last week's numbers to thirdshift: emails sent, replies, posts, clicks and leads by source. thirdshift sends Aaron one summary. |
