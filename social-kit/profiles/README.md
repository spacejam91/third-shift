# Profile kit: LinkedIn company page and Google Business Profile

Black on white, like the other social profiles. No city or region anywhere; the only place named is "Ontario, Canada". Made by `node tools/render-brand.mjs social-kit/profiles` from `tools/brand/art.html`; that command makes only these files and leaves `site/` alone.

## Which file goes where

| Platform | Slot | File | Size |
|---|---|---|---|
| LinkedIn company page | Logo | `linkedin-logo-400x400.png` | 400 x 400 |
| LinkedIn company page | Cover image | `linkedin-cover-1128x191@2x.png` (sharper on high-density screens); `linkedin-cover-1128x191.png` is the exact size if the upload asks for it | 2256 x 382, or 1128 x 191 |
| Google Business Profile | Logo | `google-logo-720x720.png` | 720 x 720 |
| Google Business Profile | Cover photo | `google-cover-1024x576.png` | 1024 x 576 |
| Google Business Profile | Photos, in this order | `google-photo-1-inquiries-720x720.png`, `google-photo-2-reporting-720x720.png`, `google-photo-3-routines-720x720.png`, `google-photo-4-approval-720x720.png` | 720 x 720 each |

The four photos carry headlines the site already uses: "Every inquiry answered. Every quote followed up.", "The Monday numbers, ready before you are.", "The job only one person knows how to do." and "People approve the money." They have no web address or call to action.

## How the platforms crop them (checked on the rendered files)

- **LinkedIn cover:** the page logo sits over the cover's bottom left, and phones trim the sides. The cover is just the line, centred; its text spans 33% to 67% of the width, so a phone that keeps only the middle 40% still shows all of it, and the logo covers nothing.
- **Logos:** Google shows the logo in a circle in Maps and Search; LinkedIn uses a rounded square. The crescent reaches 60% of the way from the centre to the edge, well inside either.
- **Google cover:** Google crops it to different shapes in different places. Everything sits between 31% and 69% of the width, inside the middle square, so a square or 4:3 crop keeps the whole lockup.
- **Google photos:** the photo grid shows square thumbnails. All text sits inside the middle 80% and stays readable at 200 px.

## Good to know

- Google decides which photo leads, and it may pick a photo over the cover. Its guidelines ask for photos that show the real business, so text pictures like these may be shown less often than real ones; add real photos (a meeting, the CRM on a laptop) when there are some. No stock photos.
- Google's file rules: JPG or PNG, 10 KB to 5 MB, at least 250 x 250. Every file here fits.
- LinkedIn accepts JPG or PNG; PNG keeps the type crisp.
