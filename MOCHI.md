# Mochi, the clinic's mascot

Code: `assets/js/mochi.js` · styles: the "Mochi" block at the end of `assets/css/styles.css`
Pose sheet: `mochi.html` (open it on the preview server)

---

## 1. Who Mochi is

A soft white mochi with pink cheeks. Mochi skin is a real beauty term for skin that is soft,
bouncy and even, which is what people come to the clinic for. The plum outline, pink blush
and cyan sweat drop are the logo's colours.

Mochi is the web cousin of **Hapi**, the Studio Happens mascot (`Workflows/Studio Happens/
v0-copy/components/hapi/`). The behaviour is ported from Hapi's companion. The personality
is retuned for a clinic:

| Hapi | Mochi |
|---|---|
| Can't be caught with a mouse; runs off | Shy: blushes when the cursor comes close, ducks when peeking |
| Catch him to open a contact dialog | Squish it; it wobbles and offers a booking link |
| One limb (the tail) that points | No limbs. It looks at things instead |
| Lands on the founders' palm | Sits on the booking form while it's filled in |
| React + GSAP | Vanilla JS, no libraries, about 10 KB gzipped with its CSS (a lot of that is comments) |

## 2. Why it's built this way

- **One SVG, every face.** Poses are an attribute (`data-pose`) and CSS shows that pose's eyes
  and mouth. No image files, sharp at any size, 1.6 KB of markup.
- **The compositor does the animation.** Blinks, breathing, hops and sparkles are CSS
  keyframes. `mochi.js` only moves Mochi, picks the mood and aims the eyes, and only writes a
  style when a value has changed.
- **It can't break the page.** It's a separate, last-loaded file, like `motion.js`. It reads the
  booking form and never writes to it. Delete the `<script>` line and every `data-mochi`
  attribute does nothing.
- **Reduced motion** turns it into a still companion: no travel, no hops, no blinking.

## 3. Moods

| Pose | Reads as | When |
|---|---|---|
| `idle` | content, eyes closed | the default |
| `look` | eyes open, following | cursor nearby, a `look` section's target, the form field in use |
| `happy` | hopping, sparkle | a `happy` section, a booking sent, four quick squishes |
| `think` | head tilted, eyes up | a `think` section |
| `shock` | wide eyes, sweat drop | a hard fling of the page, a form error, ducking out of sight |
| `sleepy` | eyes shut, floating z's | 9 seconds with no scrolling, pointer or keys |
| `bounce` | hopping on the move | crossing to the other side of the screen |
| `shy` | blushing, smiling | cursor right beside it, or just squished |

## 4. Placing it (HTML only)

On any `<section>`:

| Attribute | Effect |
|---|---|
| `data-mochi="idle"`, `"look"`, `"happy"`, `"think"` | Mochi sits in a bottom corner in that mood, switching sides each section |
| `data-mochi="look"` + `data-mochi-target` on a child | it watches that element |
| `data-mochi="peek"` + `data-mochi-spot="cards"` on a grid | it peeks over the top edge of a card in the first row |
| `data-mochi="dock"` + `data-mochi-dock` on an element | it flies over and sits on that element |
| `data-mochi-say="..."` | what Mochi says when tapped in that section |

`data-mochi-floor` on a fixed bar makes Mochi stand on it (the phone dock uses this).

It stays hidden over the hero, the preloader and the footer, and while a phone keyboard is
open.

## 5. Rules

1. **Nowhere near the hero or the medical claims.** It sits in a corner, or on the form. It
   never covers copy, and it never goes in the hero.
2. **Mochi only says what the page already says.** Every `data-mochi-say` line paraphrases copy
   on the page. No new promises, results, prices or claims, ever. A mascot making a medical
   claim is still a medical claim.
3. **It is never sad, and never at the visitor's expense.** `shock` is surprise, not fear.
4. **It doesn't change colour.** White body, plum outline, pink cheeks.
5. **One Mochi on screen.** The one on the form is the same Mochi, flown over.
6. **The bubble is supplementary.** It's hidden from screen readers and the tab order, so
   anything it offers must also exist on the page (it does: the booking section).

## 6. Analytics

`mochi_tap` (with the section id) when the bubble opens, and `book_mochi` when its
"Book a consultation" link is used. Both go through `gtag()`/`dataLayer` like the rest of
the page's events.
