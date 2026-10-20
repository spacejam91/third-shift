# Third Shift social kit

Made by `node tools/render-brand.mjs` from `tools/brand/art.html`. Change the art page and run it again to regenerate everything.

| File | Use it for | Size |
|---|---|---|
| `profile-picture.png` | Profile photo on LinkedIn (page and personal), Instagram, Facebook, X, Google Business Profile. A flat black crescent on white: no stars, glow or gradients, so it stays crisp when a platform shrinks it. Platforms crop it to a circle; the moon stays inside. | 1080 x 1080 |
| `profile-picture-400.png` | The same, for uploads that want a small file | 400 x 400 |
| `linkedin-cover-1584x396.png` | Background photo on a personal LinkedIn profile | 1584 x 396 |
| `linkedin-page-cover-1128x191.png` | Cover image on the LinkedIn company page (exported at 2x for sharpness) | 2256 x 382 |
| `facebook-cover-1640x624.png` | Facebook page cover. Text sits inside the area phones show. | 1640 x 624 |
| `x-header-1500x500.png` | X (Twitter) header | 1500 x 500 |
| `instagram-post-1080.png` | First Instagram or LinkedIn post, Google Business Profile photo | 1080 x 1080 |
| `logo-for-dark-backgrounds.png` | Logo with light lettering, transparent background: slides, dark documents, email signatures on dark themes | 2135 x 476 |
| `logo-for-light-backgrounds.png` | Logo with navy lettering, transparent background: proposals, invoices, Chamber and Communitech listings | 2135 x 476 |
| `logo-mark.png` | The moon on its own, transparent | 1024 x 1024 |
| `link-preview-1200x630.png` | The picture that shows when thirdshift.ca is shared in a post or message (already set on the site). Also good as a LinkedIn or Facebook post image. | 1200 x 630 |

The covers and header match it: black on white, flat, the line centred with "AI automation · Ontario, Canada" and thirdshift.ca. They leave the crescent off, because X and Facebook place the profile picture over the cover's bottom left and two moons would stack. The first post keeps the crescent. The website keeps its amber crescent and night colours.

Colours: night `#050913`, amber `#F2B055`, dawn `#FF8F4D`, light text `#ECF1F8`, navy text `#0B1222`.
Type: Bricolage Grotesque (headings, logo), IBM Plex Mono (labels). Both free on Google Fonts.

The site's own icons (`site/favicon.ico`, `site/apple-touch-icon.png`, `site/icon-192.png`, `site/icon-512.png`) and the link preview (`site/assets/og-image.png`) come from the same script.

## Animated logos (`motion/`)

Made by `node tools/render-motion.mjs` from `tools/brand/motion.html` (needs ffmpeg: `winget install Gyan.FFmpeg.Essentials`). All are H.264 MP4 at 30 fps with a silent audio track, which every platform accepts.

| File | Use it for | Length |
|---|---|---|
| `motion/logo-reveal-1080x1080.mp4` | Instagram and LinkedIn feed, X. Night falls, jobs run across the network to the moon, then the name, the line and thirdshift.ca. | 9 s |
| `motion/logo-reveal-story-1080x1920.mp4` | Instagram Reels and Stories, TikTok, YouTube Shorts | 9 s |
| `motion/logo-reveal-wide-1920x1080.mp4` | X, LinkedIn and YouTube in landscape | 9 s |
| `motion/overnight-shift-1080x1350.mp4` | Instagram 4:5 feed. An example night in the shift log, 11 PM to 7 AM, ending on the logo at dawn. It says "Example shift" on screen; keep captions to the same framing. | 14.5 s |
| `motion/overnight-shift-story-1080x1920.mp4` | The same night for Reels, Stories and TikTok | 14.5 s |

To preview the animation in a browser while editing, open `tools/brand/motion.html?scene=reveal&play=1` (or `scene=shift`).
