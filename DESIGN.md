# Design system (November 2026)

The page is a stack of rounded cards (`.frame`, 34px radius) on a lilac canvas. Each card has its
own soft blur gradient, and thin ribbon lines and lens circles run across them. The idea is
that the page reads as one continuous motion, not as separate sections.

## Tokens (`assets/css/styles.css`, `:root`)

| Token | Value | Use |
|---|---|---|
| `--canvas` | #EEEDF3 | Page background between cards |
| `--ink` | #2B2447 | Text, footer background |
| `--pink` | #AD1E87 | Clinic pink: primary buttons, highlighted words |
| `--peri` / `--peri-deep` | #8C9DE0 / #5A6BBE | Complementary periwinkle: selected tab, feature card |
| `--pink-soft`, `--peri-soft`, `--mist`, `--blush` | | Blur gradient colours only |

There's one typeface: **Manrope** (self-hosted, `scripts/fetch-fonts.mjs`), weights 300 to 700. The
wordmark is Manrope 600 with "Lifeline" in pink. Don't add a second display face. A serif
wordmark was tried and dropped because it clashed.

## Pieces

- **`.mesh`** with `<i style="--c;--x;--y;--s;--o">` children: blurred colour blobs that drift slowly.
- **`[data-ribbon="wave|high|corner|swoop"]`**: drawn by `motion.js`. Two hairline outlines (a
  wide stroke masked by a slightly narrower one) with soft capsules flowing along the middle. They
  draw themselves in when they come into view.
- **`[data-lens]`**: thin outline circles laid over a photograph. Keep them off faces.
- **`.pill`**: frosted label with a pink dot.
- **Hero**: the photograph sits in a circle, and the treatment names scroll across it. The copy
  inside the circle is white and is clipped to the circle by `motion.js`.

## Motion

- The hero circle grows into place on load. There's no preloader, so the photo is painted on the
  first frame (this matters for the Ads LCP score).
- The mission statement fills in word by word as it scrolls past.
- Visit steps stack as sticky cards, with a progress line.
- Each treatment photo opens as a growing circle when its tab is selected.
- The gallery rail drifts sideways as you scroll.
- Only transform, opacity, clip-path and stroke offsets are animated, and everything respects
  `prefers-reduced-motion`.

## Photographs

`assets/img/cl-*.jpg` are frames from the clinic's own footage (February 2026), and
`dr-bindiya.jpg` is the doctor's photo. Run `node scripts/build-images.mjs` after adding or
replacing one. It writes the WebP sizes and the `srcset` attributes on every page.
