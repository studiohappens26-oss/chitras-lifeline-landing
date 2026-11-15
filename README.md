# Chitra's Lifeline Clinic: website and Google Ads landing pages

A static site for Cloudflare Pages: plain HTML, CSS and JavaScript, no frameworks and no
runtime dependencies.

- [BRIEF.md](BRIEF.md): the rules first (what may be said, which pages ads point to), then the
  original creative brief.
- [DESIGN.md](DESIGN.md): tokens, components, motion and the performance rules.
- [MOCHI.md](MOCHI.md): the mascot.

```
scripts/build-pages.mjs   THE SOURCE OF TRUTH for every page below. Edit it, then `npm run build`.
  index.html                home page
  anti-wrinkle-injections.html, laser-hair-reduction.html, medi-facials.html
                            ad landing pages (the Google Ads final URLs)
  botox.html                organic search only, never an ad final URL, not linked from the site
  404.html                  served by Cloudflare Pages for any unknown path
  sitemap.xml, _headers     caching, security and Early Hints headers
privacy.html              privacy notice, hand-written
assets/css/styles.css     design system and all styling
assets/css/fonts.css      @font-face rules, written by scripts/fetch-fonts.mjs
assets/fonts/             self-hosted Manrope (woff2)
assets/js/main.js         booking form, tabs, nav, reels, tracking
assets/js/motion.js       decorative motion only (can fail without breaking the form)
assets/js/mochi.js        the mascot
assets/img/               the clinic's own photographs, plus WebP sizes made by build-images
functions/api/lead.js     Cloudflare Pages Function that receives the booking form
scripts/build-images.mjs  WebP variants and srcset for every photo
scripts/serve.mjs         local preview server (mirrors Pages: pretty URLs, 404, Brotli)
scripts/fetch-fonts.mjs   re-download and self-host the webfonts
scripts/fetch-images.mjs, scripts/candidates.mjs   stock-photo helpers from the first draft
type.html, mochi.html     reference sheets (fonts, Mochi's poses), not part of the site
```

## Build and run

```bash
npm install
```

```bash
npm run build
```

```bash
npm run serve
```

Then open <http://localhost:4321>. `npm run build` writes the pages, then adds the responsive
`srcset` to every photo. Always run both: `npm run pages` alone leaves the photos without
their small sizes. The preview server stubs `/api/lead` and logs submissions. To run the real
Function instead:

```bash
npx wrangler pages dev .
```

## Ad final URLs

Each Google Ads group points at its own page, so the headline matches the search:

| Ad group | Final URL |
|---|---|
| Anti-wrinkle | `/anti-wrinkle-injections` |
| Laser hair reduction | `/laser-hair-reduction` |
| Medi-facials | `/medi-facials` |
| Brand / generic | `/` |

The home page also accepts `?s=wrinkle`, `?s=laser` or `?s=facial`, which swaps its headline,
hero photo, open tab and form preset. Every lead is submitted with the page it came from, so
conversions attribute to the ad group without extra setup. No page an ad can point to names a
prescription drug (BRIEF.md, top rules).

## Deploy to Cloudflare Pages

1. Run `npm run build` and commit the generated files. Pages serves the folder as it is.
2. Cloudflare dashboard, **Workers & Pages**, **Create**, **Pages**, connect the repository.
   Build command: none. Output directory: `/`.
3. Add the custom domain, then turn these on under the domain's **Speed** settings:
   - **Early Hints**: sends the font and stylesheets before the page itself (the `Link`
     headers in `_headers` drive it).
   - **HTTP/3 (with QUIC)**: on by default for most zones; check it.
   - Brotli compression is automatic. Auto Minify is retired and not needed. Polish is not
     needed either, because the WebP sizes are built in advance.

`_headers` sets one-year immutable caching for CSS, JS and fonts (every reference carries a
content hash, `?v=`, so a change always reaches visitors), 30 days for images, and no caching
for the HTML itself.

### Lead capture

A valid booking form opens WhatsApp (+91 81975 16940) with the enquiry written out, and posts a
copy to `/api/lead` in the background. These environment variables are optional; with none set,
leads are still accepted and logged.

| Variable | Purpose |
|---|---|
| `LEAD_WEBHOOK` | Any URL accepting JSON (Google Sheets via Apps Script, Zapier, Make). |
| `RESEND_API_KEY` | Email on each lead, via [Resend](https://resend.com). |
| `LEAD_TO_EMAIL` | Recipients, comma-separated. |
| `LEAD_FROM_EMAIL` | A verified sender on your Resend domain. |

## Before this goes live

- [x] Dr. Bindiya's degrees and Karnataka Medical Council registration number, from her
      KMC certificate (`DEGREES` and `KMC` in `scripts/build-pages.mjs`).
- [ ] Dr. Bindiya reviews the medical copy on the three treatment pages.
- [ ] Add the Google Ads conversion tag and GA4 (below).
- [ ] Set a 1200×630 `og:image`, and confirm the canonical domain.

## Analytics

`main.js` sends events through `gtag()` or `dataLayer` when either is on the page, so only the
GA4 / Google Ads tag needs pasting into `<head>`. Events:

`book_hero` · `book_nav` · `book_dock` · `book_feature` · `book_mochi` · `call_nav` ·
`call_dock` · `call_location` · `whatsapp_hero` · `whatsapp_book` · `whatsapp_dock` ·
`whatsapp_faq` · `directions` · `instagram_follow` · `lead_submit` · `mochi_tap`

Ad pages add `call_hero`, `directions_trust`, `book_closing`, `whatsapp_closing` and
`call_closing`.

Import `lead_submit` and the `call_*` events as Google Ads conversions.

## Lighthouse (mobile, November 2026)

Performance 94 to 100, Accessibility 100, Best Practices 100, SEO 100 on every page. The 404
page scores 66 for SEO by design: it is `noindex`, so search engines never list an error page.
What keeps it there is in DESIGN.md, "Performance rules".

## Replacing a photograph

Drop the new JPEG into `assets/img/` and run `npm run build`. The pages serve the WebP sizes
through `srcset`, so the JPEG alone will not show. Images are cached for 30 days (`_headers`),
so a replacement under the same name can take that long to reach returning visitors; give a
changed photo a new name to show it at once. Hero photographs must be
landscape and at least 1800px wide; which photo each ad group gets is the `HERO` map in the
home page's head script (`build-pages.mjs`).
