# Motion system — analysis of truekindskincare.com, and what we took

Reverse-engineered from the live site on 2026-09-05: markup, the three
stylesheets and the 593 KB `_nuxt` entry bundle. Recorded here so the
techniques are maintainable without re-deriving them.

## What they run

Nuxt 3 + **GSAP** (ScrollTrigger, SplitText, DrawSVG, CustomEase) + **Lenis**
smooth scroll + Swiper. Roughly 120 KB gzipped of animation libraries.

We reproduce the *techniques* in vanilla JS instead — see "What we built".

## The five effects worth stealing

### 1. Multi-speed scroll parallax — the "immersive" one

This is the effect that makes the site feel deep. Any element tagged
`.parallax-scroll` with a `data-parallax-speed` gets:

```js
const amount = parseInt(el.dataset.parallaxSpeed) * 22;   // percent of own height
gsap.timeline({
  defaults: { ease: 'none' },
  scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
})
.set(target, { y: `${amount}%` })
.to(target,  { y: `-${amount}%` });
```

So each element travels linearly from `+speed×22%` to `−speed×22%` of its own
height over the whole time it is crossing the viewport. Desktop only unless the
element also carries `data-parallax-mobile`.

The depth comes from **stacking different speeds inside one section**. Their
ingredients block, measured live:

| element | speed |
|---|---|
| `.ingredients__image-wrapper` | **−1** (drifts *with* the page, against the rest) |
| `.ingredients__item` ×4 | 2, 3, 3, 4 |
| `.ingredients__image-1/2` | 5, 5 |

A negative speed on the container plus positive speeds on its children is the
whole trick — the group slides one way while its contents slide the other, and
the eye reads that as parallax depth rather than as things sliding.

### 2. Cover-image parallax

Container `overflow: hidden` at 100vh, image inside at 110vh, then `yPercent`
driven `−20 → +30` across the scroll. Variant `data-parallax-top` pins from
`top top` instead for hero images.

### 3. Line-mask text reveal

Headings are split into lines; each line sits in an `overflow: hidden` box and
rises from `yPercent: 105` to `0` — stagger `0.15`, duration `1.4`,
ease `expo.out`. The mask is what makes it read as typeset rather than as a
fade-in.

### 4. Their motion constants

```
duration        1.2
stagger         0.15
scrollStart     "top bottom-=20%"
transitionDelay 0.2
customSlow      CustomEase "M0,0 C0.17,0.84 0.44,1 1,1"  ≡ cubic-bezier(.17,.84,.44,1)
fadeBottom      { y: 40, opacity: 0, stagger: 0.10 }
Lenis           { duration: 0.9, easing: t => Math.min(1, 1.001 - 2 ** (-11 * t)) }
```

Lenis runs `syncTouch: false`, so **touch devices keep native scrolling**. The
smooth scroll is a desktop-only affordance on their site too.

### 5. The loader (superseded — see the Just Dent port below)

Full-screen fixed `#2f2f2f` overlay, `z-index: 9999`, composed of:

- `.bg` split into `.bg__left` / `.bg__right`, each 50% wide with
  `transform-origin: top` — they `scaleY` away at the end as a two-panel curtain.
- `.line` — a 1px centre hairline, `transform-origin: top`, `scaleY(0)` → 1.
- `.text` — an 18rem two-digit odometer. Each digit is a `.6em × .9em`
  `overflow: hidden` window over a vertical column of `<span class="number">`
  that translates upward. Left column holds 0,2,6,9; right holds 0,5,7,8,9 — so
  it steps through fixed stops rather than counting every integer. Both columns
  are monotonic, which is the point: a units digit rolling 9→0 would visibly
  run backwards.
- `.logo` split into `.logo__left` (`translateY(-105%)`) and `.logo__right`
  (`translateY(105%)`), sliding in to meet in the middle.
- A CSS spinner at the bottom as the slow-connection fallback.

## What we built

Everything above, hand-written, in `assets/js/motion.js` plus the motion block
in `styles.css`. No GSAP, no ScrollTrigger, no SplitText, no Lenis — **6.9 KB
gzipped** at the time (about 10 KB now, with the Just Dent preloader and hero)
against roughly 120 KB for the stack it replaces. One rAF loop,
transform-only, so it stays on the compositor and never triggers layout.

### The markup hooks

| attribute | what it does |
|---|---|
| `data-px="3"` | multi-speed drift, ±speed×22% of the element's own height |
| `data-px-mobile` | opt this element back in below 860px |
| `data-px-contain` | clamp travel to the enclosing section (implied for `.float`) |
| `data-px-cover` | clipped frame, image inside drifts ±11.5% |
| `data-lines` | split into rendered lines, each rising out of a mask |

### Where we deliberately diverged

**The TrueKind loader has been replaced.** Its odometer curtain shipped first
(blush panels rather than their `#2f2f2f`, capped at 1.1 s). On 2026-09-15 it
gave way to the Just Dent preloader documented below, which keeps the session
gate and the reduced-motion skip but builds the clinic's own logo and waits on
real asset readiness.

**Travel is clamped to the section.** Copying their speeds directly, seven of
eight decorative layers drifted out of their own section — up to 64px — and
landed on the next section's background. Because the room available changes
with viewport and content, the engine measures it per element rather than
relying on tuned percentages in the stylesheet.

**Cover images are centred, not top-anchored.** A 130%-tall image anchored at
the top has slack in one direction only; drifting the other way opens a gap.
Ours is offset −15% so it overhangs evenly, and the drift budget (±11.5% of the
image's own height) is exactly that overhang. Measured on the hero, the naive
version left a 241px hole at full drift.

**Floats are anchored to the media column, not the section.** In the gutter
they overlapped the body copy at 1280px, where only 64px of margin exists. With
`align-items: center` the image column has a deep well of whitespace above and
below it, and that is the only place on this layout genuinely free of copy. It
also means the flipped sections mirror for free.

**Smooth scroll drives the real scroll position.** `scrollTo` each frame rather
than transforming a wrapper, so `getBoundingClientRect`, `position: sticky` and
IntersectionObserver all keep working and the rest of the motion code needs no
knowledge of it. It intercepts only the wheel; keyboard, scrollbar drag and
find-in-page stay native. Desktop only — the reference site also leaves touch
alone.

The stylesheet's `scroll-behavior: smooth` has to be handed over when this is
active, or every per-frame `scrollTo` starts its own CSS smooth animation and
the two easings fight, which makes the scroll lag the wheel. `motion.js` takes
it over and handles anchor clicks itself, reading `scroll-padding-top` back
from the stylesheet so the nav offset cannot drift out of sync.

**Headings with inline markup skip line splitting.** The rebuild moves text
nodes out of their parents, which would silently drop an `<em>`. None of the 14
headings uses inline markup today; if one ever does, it reveals as a single
block rather than losing the tag.

### Fixed along the way

`.deep__media` had no positioning context, so `.facemap` — which is
`position: absolute; inset: 0` — was resolving against the whole section rather
than the image. The botox face-map dots were landing nowhere near the face,
except while the reveal's `translateY` happened to be creating a containing
block for them. Adding `position: relative` fixes that and gives the float
layers their anchor. (The face map itself was later removed at the client's
request; the `position: relative` stays, for the floats.)

---

# Just Dent port — preloader, hero, metallic type

Added 2026-09-15. Source: the Just Dent build in `ClientWorks/JustDent` —
`Preloader.tsx`, `Hero.tsx` and `globals.css`. That site runs GSAP; here the
same timelines run on the Web Animations API and CSS custom properties, so
`motion.js` stays library-free.

## Preloader

### Their build → ours

| Just Dent (GSAP, default ease `expo.out`) | Chitra's (WAAPI) |
|---|---|
| `.jd-facet-mint` from `y 46, rotation −12`, origin bottom, 1.1 s at 0.15 | the two hair strokes, `translateY(30%) rotate(−12deg)`, 1.1 s at 150 / 260 ms |
| `.jd-facet-dark` `scaleX 0` from its left edge, 0.9 s at 0.5 | lashes and brow, the same, at 500 ms |
| `.jd-smile` stroke draws on, `power3.inOut`, 1.1 s at 0.55 | the chin line wipes in left to right into the leaf (`clip-path`), same timing |
| `.jd-just > *` rise, stagger 0.06, at 0.8 | "Chitra's", letter by letter, stagger 60 ms at 800 ms |
| `.jd-dent > *` at 1.0; tagline stagger 0.018 | "Lifeline Clinic", stagger 22 ms at 1000 ms |
| exit: logo `scale .94` + fade, 0.55 s `power2.in`; panel `clip-path` wipes up, 1 s `expo.inOut` | identical |
| `PRELOADER_EXIT` event starts the hero | `cl:preloader-exit` |

Percent translates resolve against each part's own box (`transform-box:
fill-box`), so the motion scales with the logo. The overlay is the hero
panel's colour (`--panel`), so the wipe uncovers a panel that already matches
and only the photograph and headline appear to arrive.

### The logo

There is no vector master, so `scripts/trace-logo.cjs` recovers one from the
PNG: it separates the three inks by colour, splits the mark into connected
shapes and each wordmark line into letters, and traces every part with
potrace. The result is inlined in `index.html` — 13.6 KB, 5 KB gzipped — so
the preloader costs no extra request.

### What makes it functional

- **It waits on real work.** The webfonts, the hero photograph downloaded
  *and decoded* (`img.decode()`), and the load event, weighted 25 / 40 / 20 in
  the meter. The other 15 is the document itself, already parsed when the
  deferred script runs.
- **It is bounded both ways.** It never exits before the logo is built
  (`MIN_MS` 1800) and never holds past `CAP_MS` 4500. On a warm cache the
  animation sets the pace; on a slow connection the finished logo holds while
  the meter keeps reporting.
- **The meter is honest.** It shows the lesser of real progress and animation
  progress, eased — never ahead of what has actually loaded, and on a fast
  load it does not hit 100% and then sit there looking hung.
- **It is decided before paint.** The `<head>` script sets `data-pl` from the
  session key `cl_pl` and `prefers-reduced-motion`, so a returning visitor
  never sees it flash.
- **It cannot strand the page.** Scroll is locked by capturing wheel,
  touchmove and key listeners and released on exit. The exit is sequenced with
  timers rather than animation promises, because a tab opened in the
  background may run no animation frames. If `motion.js` never arrives at all,
  a CSS animation hides the overlay at 7 s.

## Hero

Just Dent's hero is a 200svh section with a sticky 100svh stage, scrubbed by a
GSAP timeline (`scrub: 0.3`). Here `motion.js` writes one number — the
pinned-scroll progress, eased with a ~90 ms time constant to match that lag —
to `--hp` on `.hx`, and every moving part is a `calc()` of it:

| progress | Just Dent | ours |
|---|---|---|
| 0 → 1 | footage window `--hero-wx 50% → 0` (mobile `--hero-wy 54% → 0`) | `--hx-wx`, `--hx-wy` (mobile starts at 60%) |
| 0 → .15 | `.hero-fade` out | `.hx-fade` out, then `visibility: hidden` |
| 0 → 1, .25 → .55 | headline slides `xPercent −50`, fades | the same |
| .1 → .95 | `.hero-title-in` from `xPercent 100` | `.hx__title2`, in silver `text-metal` |
| .3 → .9 | `.hero-shade` in | `.hx__shade` |
| foot at 110% vh | tips rise, stagger .12 | `.is-end` on `.hx` |
| after the pin | photo `yPercent 0 → 6` | `--hx-lag` |

The window is two opposed translations — the frame moves in while its content
moves back out by the same amount — so the photograph holds still and only the
opening grows.

**The headline** is white with `mix-blend-mode: difference`: near-black on the
panel, an inversion of the photo where it crosses the seam. That only works
against what paints in the same stacking context, so it is a direct child of
the stage. It is decorative (`aria-hidden`); a visually hidden `<h1>` carries
the words and the ad-group swap. Three headlines share one grid cell and
rotate every 4.2 s, pausing while the tab is hidden or the headline has
scrolled away. **With `?s=`, only the matching headline shows, and it holds
still** — message match beats variety on a paid click.

**Where we diverged:** no `clip-path` reveal on the photo. It is the page's LCP
element, so it stays painted at full opacity under the preloader, and the
entrance is the 1.25× push-in only.

## Metallic type

Just Dent's `text-metal*` classes: a many-stop gradient clipped to the glyphs
and swept sideways over 11 s so the highlight travels. Three finishes here:

| class | used on | worst stop against its ground |
|---|---|---|
| `.text-metal` | the second hero title — silver, Just Dent's own stops, over photographs only | display size on the dark shade |
| `.text-metal-plum` | every section heading (their `text-metal-dark`, rebased on the page ink) | 5.19 : 1 on blush |
| `.text-metal-rose` | the hero trust figures | 4.96 : 1 on blush |

The gradient sweeps, so any stop can sit under any glyph: every stop is
checked, not the average. The class must be on the element that directly holds
the text — `background-clip: text` does not reach text inside a transformed
child — which is why `lineReveal` puts it on each line's inner span.
`data-metal="rose"` or `"none"` on a heading overrides the default.

## Lazy loading

- WebP `srcset` at 480 / 800 / 1200 / 1800 for every photo, from
  `scripts/build-images.mjs`; the 800w set is 87% lighter than the JPEGs.
- `loading="lazy"` and `decoding="async"` below the fold. Pending images show a
  shimmer and fade in on load — gated on `html.js`, so without JavaScript they
  simply render.
- The hero photo is preloaded at high priority by the head script, per ad
  group, before the parser reaches the `<img>`. The `<img>` has no `src` in
  the markup, so the wrong photograph is never fetched.
- The Google Maps iframe's `src` is withheld until its section is about 800px
  away.
