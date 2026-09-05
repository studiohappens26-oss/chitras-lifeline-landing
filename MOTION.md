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

### 5. The loader

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
gzipped** against roughly 120 KB for the stack it replaces. One rAF loop,
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

**Light, not dark.** The reference loader is a `#2f2f2f` curtain. Ours had to
live inside a light-mode brief, so the panels are a blush gradient and the only
strong colour is the pink hairline. Flat bone panels were tried first and
abandoned — the page underneath is bone too, so they parted invisibly.

**The loader is capped and session-gated.** This is a Google Ads landing page;
paid traffic makes every extra second cost money. It dismisses at
`min(hero image + fonts ready, 1100 ms)`, shows once per session so a
back-button return is instant, and is skipped entirely under
`prefers-reduced-motion`. See `MAX_MS` in `motion.js`. Removing it is deleting
the `.loader` block from `index.html` — nothing else depends on it.

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
layers their anchor.
