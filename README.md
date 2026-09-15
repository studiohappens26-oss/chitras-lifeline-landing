# Chitra's Lifeline Clinic — Google Ads landing page

Single-page, static, zero-dependency landing page for Cloudflare Pages.
Creative and image brief: [BRIEF.md](BRIEF.md).
Hero, preloader and scroll mechanics: [MOTION.md](MOTION.md).

```
index.html              the whole page
assets/css/styles.css   design system + all motion
assets/css/fonts.css    @font-face rules — generated, do not edit by hand
assets/fonts/           self-hosted Comfortaa + Nunito (woff2)
assets/js/main.js       interaction layer (no libraries)
assets/js/motion.js     preloader, hero, smooth scroll, parallax, line reveals — see MOTION.md
type.html               font specimen page — 11 pairings, for reference
assets/img/             imagery — currently Pexels placeholders
assets/img/CREDITS.json photographer credits per slot
functions/api/lead.js   Cloudflare Pages Function — receives the booking form
scripts/fetch-images.mjs   re-pull placeholder stock
scripts/candidates.mjs     preview alternatives for one image slot
scripts/fetch-fonts.mjs    re-download + self-host the webfonts
scripts/serve.mjs          local preview server
scripts/build-images.mjs   responsive WebP variants + srcset for every photo
scripts/trace-logo.cjs     traces the logo PNG into the preloader's animated SVG
package.json            dev tools only (sharp, potrace) — the site ships no dependencies
_headers                caching + security headers
```

## Run it locally

```bash
node scripts/serve.mjs
```

Then open <http://localhost:4321>. The preview server stubs `/api/lead` and logs
submissions to the console. To exercise the real Function:

```bash
npx wrangler pages dev .
```

## The three ad-group URLs

One page, three faces. The `?s=` parameter swaps the H1, the sub-headline and
the hero photograph, holds the hero's rotating headline on the matching line,
floats the matching deep-dive section to the top, and preselects
the treatment in the booking form. Point each Google ad group at its own URL so
the headline matches the search term — better message match, better Quality
Score, cheaper clicks.

| Ad group | Final URL |
|---|---|
| Botox | `https://your-domain/?s=botox` |
| Laser hair removal | `https://your-domain/?s=laser` |
| Medi-facials | `https://your-domain/?s=facial` |
| Generic / brand | `https://your-domain/` |

The variant is submitted with every lead as `variant`, so conversions attribute
back to the ad group without extra tracking setup.

## Deploy to Cloudflare Pages

1. Push this folder to a Git repo (or use `npx wrangler pages deploy .`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → connect the repo.
3. Build settings: **no build command**, output directory `/`. It's static.
4. Add a custom domain — `skin.chitraslifelineclinic.com` is recommended so it
   inherits the existing domain's trust.
5. **Polish** (Speed → Optimization) is not needed: responsive WebP variants
   are pre-built by `scripts/build-images.mjs` and served through `srcset`.

### Environment variables for lead capture

Set these under **Settings → Environment variables**. All are optional and the
form degrades gracefully — if none are set, leads are still accepted and logged,
and if the endpoint fails entirely the browser offers to send the enquiry over
WhatsApp instead so no lead is lost.

| Variable | Purpose |
|---|---|
| `LEAD_WEBHOOK` | Any URL accepting JSON. Easiest route into a Google Sheet via Apps Script, Zapier or Make. |
| `RESEND_API_KEY` | Email notification on each lead, via [Resend](https://resend.com). |
| `LEAD_TO_EMAIL` | Recipient(s), comma-separated. |
| `LEAD_FROM_EMAIL` | Verified sender on your Resend domain. |

## Before this goes live

- [ ] Replace placeholder imagery — see [BRIEF.md](BRIEF.md) §4. Every `<img>`
      carries a `data-slot` matching a numbered shot in the brief.
- [ ] Confirm Dr. Bindiya's exact degree string and print it verbatim. Listings
      suggest MBBS, DDVL but that is unverified, so the page currently omits it.
- [ ] Replace the four placeholder reviews with real, attributable ones.
- [ ] Swap the four Instagram reel cards for real reel URLs and cover frames —
      BRIEF.md §4 Tier 4. They currently all link to the profile's reels tab.
- [ ] Add the Google Ads conversion tag and GA4 (see below).
- [ ] Set a real OG image at 1200×630 and update the `og:image` meta tag.
- [ ] Point `<link rel="canonical">` at the final domain.

## Analytics and conversion tracking

`main.js` fires events through `gtag()` and `dataLayer` if either exists, so you
only need to paste the GA4 / Google Ads tag into `<head>`. Events emitted:

`call_nav` · `call_dock` · `call_location` · `whatsapp_hero` · `whatsapp_book` ·
`whatsapp_dock` · `book_hero` · `book_nav` · `book_dock` · `book_botox` ·
`book_laser` · `book_facial` · `directions` · `instagram_profile` ·
`instagram_reel` · `lead_submit`

Import `lead_submit` and the `call_*` events as Google Ads conversions.

## Notes on the build

- **No frameworks and no build step.** Everything is hand-written HTML, CSS and
  vanilla JS, so the page is as fast as it can be — which matters directly,
  since Google scores landing page experience and every 100ms costs money on
  paid traffic.
- **Motion degrades.** Every animation is wrapped in `prefers-reduced-motion`
  handling; the page becomes a clean static document for anyone who asks for it.
- **The motion layer is a separate file.** `motion.js` carries the preloader,
  the hero, smooth scroll, multi-speed parallax and line reveals — about 10 KB
  gzipped, no libraries, versus roughly 120 KB for the GSAP + Lenis stack the techniques
  come from. It is deliberately not in `main.js`: that file holds the booking
  form and conversion tracking, and pulling an animation must never put the
  form at risk. Technique notes are in [MOTION.md](MOTION.md).
- **The preloader is functional, and bounded.** It builds the clinic's logo,
  then holds until the webfonts, the hero photograph (downloaded and decoded)
  and the page load are actually ready — the meter reports them. It never
  exits before the 1.8 s build (`MIN_MS`) and never waits past 4.5 s
  (`CAP_MS`), shows once per session, is skipped under reduced motion, and
  never blocks paint: the page renders underneath, so LCP is unaffected. If
  `motion.js` fails to load, the stylesheet clears it at 7 s. To drop it,
  delete the `.pl` block from `index.html`.
- **Lazy by default.** Every photo below the fold is `loading="lazy"` and
  `decoding="async"`, and arrives through a WebP `srcset` sized for the
  screen — the 800w set is 87% lighter than the source JPEGs. Pending images
  show a soft shimmer and fade in when they land. The hero photograph is the
  exception: the head script preloads the right one for the ad group at high
  priority before the parser reaches it. The Google Maps embed, the heaviest
  thing on the page, is not requested until its section is about a screen
  away.
- **The form is resilient.** Client-side validation, a honeypot, Indian mobile
  format handling (`+91`, `0` and spaced variants all accepted), and a WhatsApp
  fallback if the endpoint is unreachable.
- **Fonts are self-hosted.** Comfortaa (display) and Nunito (body), Latin +
  Latin-Ext only, 109 KB of WOFF2 in `assets/fonts/`. The page makes zero
  third-party requests, so no extra DNS/TLS round trip before text can paint.
  Re-pull or change them with `node scripts/fetch-fonts.mjs`, which regenerates
  `assets/css/fonts.css`.

## Replacing an image

Drop the new JPEG in `assets/img/` under the same name, rebuild its WebP
variants, and redeploy:

```bash
npm install
```

```bash
node scripts/build-images.mjs
```

The page serves those WebP files through `srcset`, so a replaced JPEG alone
will not show. Nothing in the HTML or CSS needs editing by hand.

Hero photographs must be landscape and at least 1800px wide — the head script
requests all four widths by name. Which photo each ad group gets is the `HERO`
map in that `<head>` script.

To try different stock for a slot:

```bash
node scripts/candidates.mjs "female doctor portrait" portrait 6
```

Pick one by eye from `assets/img/_candidates/`, set its query and index in
`scripts/fetch-images.mjs`, then:

```bash
node scripts/fetch-images.mjs hero-doctor --force
```
