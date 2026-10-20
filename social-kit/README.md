# Third Shift social kit

Made by `node tools/render-brand.mjs` from `tools/brand/art.html`. Change the art page and run it again to regenerate everything.

| File | Use it for | Size |
|---|---|---|
| `profile-picture.png` | Profile photo on LinkedIn (page and personal), Instagram, Facebook, X, Google Business Profile. A flat black crescent on white: no stars, glow or gradients, so it stays crisp when a platform shrinks it. Platforms crop it to a circle; the moon stays inside. | 1080 x 1080 |
| `profile-picture-400.png` | The same, for uploads that want a small file | 400 x 400 |
| `linkedin-cover-1584x396.png` | Background photo on a personal LinkedIn profile | 1584 x 396 |
| `linkedin-page-cover-1128x191.png` | Cover image on the LinkedIn company page (exported at 2x for sharpness) | 2256 x 382 |
| `facebook-cover-1640x624.png` | Facebook page cover. Text sits inside the area phones show. Exported at 2x for sharpness. | 3280 x 1248 (shows at 1640 x 624) |
| `x-header-1500x500.png` | X (Twitter) header. Exported at 2x so X's own downscale stays sharp; upload it as is, without zooming in X's crop tool. | 3000 x 1000 (shows at 1500 x 500) |
| `instagram-post-1080.png` | First Instagram or LinkedIn post, Google Business Profile photo | 1080 x 1080 |
| `logo-for-dark-backgrounds.png` | Logo with light lettering, transparent background: slides, dark documents, email signatures on dark themes | 2135 x 476 |
| `logo-for-light-backgrounds.png` | Logo with navy lettering, transparent background: proposals, invoices, Chamber and Communitech listings | 2135 x 476 |
| `logo-mark.png` | The moon on its own, transparent | 1024 x 1024 |
| `link-preview-1200x630.png` | The picture that shows when thirdshift.ca is shared in a post or message (already set on the site). Also good as a LinkedIn or Facebook post image. | 1200 x 630 |

The covers and header match it: black on white, flat, the line centred with "AI automation · Ontario, Canada" and thirdshift.ca. They leave the crescent off, because X and Facebook place the profile picture over the cover's bottom left and two moons would stack. The first post keeps the crescent. The website keeps its amber crescent and night colours.

Colours: night `#050913`, amber `#F2B055`, dawn `#FF8F4D`, light text `#ECF1F8`, navy text `#0B1222`.
Type: Bricolage Grotesque (headings, logo), IBM Plex Mono (labels). Both free on Google Fonts.

The site's own icons (`site/favicon.ico`, `site/apple-touch-icon.png`, `site/icon-192.png`, `site/icon-512.png`) and the link preview (`site/assets/og-image.png`) come from the same script.

## Animated videos (`motion/`)

Made by `npm run motion` from `tools/brand/motion.html`, in about three minutes (all twenty videos render side by side). Needs Google Chrome and ffmpeg (`winget install Gyan.FFmpeg.Essentials`, once; the script finds winget's copy even before a new terminal picks up the PATH). All are H.264 MP4 at 30 fps with a silent audio track, which every platform accepts.

There are three folders:

- **`motion/`: black on white, for social.** It matches the profile picture, covers and first post: a white background, black crescent and type, no colour at all.
- **`motion/industries/`: the same black-on-white shift, one per "Who it's for" page**, for posts aimed at that kind of business.
- **`motion/night/`: night and amber**, the website's colours, kept for anywhere that look is wanted (the site itself, slides on a dark screen). Don't mix it with the black-on-white videos in the same feed.

All are flat, with no gradients, glow or fine lines, so they stay crisp after X, Instagram and LinkedIn recompress them. Moves ease in and settle; nothing bounces, flashes or types itself.

| File (in `motion/` and `motion/night/`) | Use it for | Length |
|---|---|---|
| `logo-reveal-1080x1080.mp4` | Instagram and LinkedIn feed, X. A full disc becomes the crescent as its shadow slides in (the shift starts when the day ends), then the name, the line, "AI automation · Ontario, Canada" and thirdshift.ca. The last frame is the first post (`instagram-post-1080.png`) plus the address. | 9 s |
| `logo-reveal-story-1080x1920.mp4` | Instagram Reels and Stories, TikTok, YouTube Shorts. Everything sits above the bottom fifth, where the apps put their buttons and captions. | 9 s |
| `logo-reveal-wide-1920x1080.mp4` | X, LinkedIn and YouTube in landscape | 9 s |
| `overnight-shift-1080x1350.mp4` | Instagram 4:5 feed. An example night as a checklist, 11 PM to 7 AM: web inquiries, open quotes, the weekly sales report, crew schedules and appointment reminders, then supplier invoices, with one invoice held for a person to approve. Each job is ticked off as the clock runs, then the logo. It says "Example shift" on screen; keep captions to the same framing. | 14.5 s |
| `overnight-shift-story-1080x1920.mp4` | The same night for Reels, Stories and TikTok | 14.5 s |

**By industry** (`motion/industries/`, black on white, 14.5 s each, a 4:5 feed version and a story version):

| Files | The night on the checklist |
|---|---|
| `overnight-shift-trades-1080x1350.mp4`, `overnight-shift-trades-story-1080x1920.mp4` | 9 PM to 7 AM: quotes followed up, website inquiries, tomorrow's crew schedules, customer reminders, supplier invoices matched to jobs, two held, timesheets checked |
| `overnight-shift-distributors-1080x1350.mp4`, `overnight-shift-distributors-story-1080x1920.mp4` | 9:30 PM to 7 AM: emailed orders read and drafted, two held, supplier invoices matched, the reorder list, past-due statements, the morning summary |
| `overnight-shift-clinics-1080x1350.mp4`, `overnight-shift-clinics-story-1080x1920.mp4` | 9:30 PM to 7 AM, business side only: website inquiries, next week's staff schedule, the supply reorder list, monthly numbers, supplier invoices, two held, the morning summary |
| `overnight-shift-professional-services-1080x1350.mp4`, `overnight-shift-professional-services-story-1080x1920.mp4` | 8 PM to 7 AM: year-end paper reminders, a new client set up, time entries held, invoices drafted from approved time, overdue accounts, the morning summary |
| `overnight-shift-manufacturers-1080x1350.mp4`, `overnight-shift-manufacturers-story-1080x1920.mp4` | 5:30 PM to 7 AM: shift timesheets, material reorders, the weekly report, supplier invoices matched, one held (steel over the PO), the morning summary |

Each says "Example:" and the kind of business in the corner. The rows are the example night on that industry's page, shortened to fit, with the same times, order and numbers. The jobs tick at an even pace and the clock hurries through the quiet hours.

**Covers.** The reveal opens on a plain disc, so wherever the platform lets you pick a cover or thumbnail (Instagram, TikTok, LinkedIn, YouTube), pick the last frame: the full logo. A shift video's first frame, the night's to-do list, works as it is.

**Re-rendering**

| To | Run |
|---|---|
| Re-render all twenty | `npm run motion` |
| Re-render one set | `npm run motion -- mono` (everything black on white) or `npm run motion -- night` |
| Re-render some | Add parts of the paths: `npm run motion -- industries`, `npm run motion -- trades`, `npm run motion -- mono story`, `npm run motion -- night reveal wide` |
| Check a change without encoding | `npm run motion -- mono shift --stills 0,6.8,14.4 --to tmp-stills` (PNGs at those seconds) |
| Pull a still from a finished video | `ffmpeg -ss 6.8 -i social-kit/motion/overnight-shift-1080x1350.mp4 -frames:v 1 still.png` |
| Watch it while editing | Open `tools/brand/motion.html?scene=shift&mono=1&night=trades&play=1` in Chrome (leave out `mono=1` for night colours, `night=` for the general night), or add `&t=6.5` to hold one moment. The layout follows the window size, so set the window (or the DevTools device toolbar) to the video's size. |

The checklists are `NIGHTS` in `motion.html`: one row per job, with its clock time, job, result and whether it's held for a person. When an industry page's example night changes in `content/industries.mjs`, change its night there too. The industry videos follow the list of pages, so a new page stops the render until its night is added. A row too long for the card also stops it, with the row named. The closing logo is `lockup()`, laid out like the flat Instagram post; each set's colours are the CSS variables at the top (`:root` for night, `:root.mono` for black on white). If ffmpeg lives somewhere unusual, set `FFMPEG` to its path.
