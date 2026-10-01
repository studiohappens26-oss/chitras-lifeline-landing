# Chitra's Lifeline Clinic — Google Ads Landing Page
## Creative + Technical Brief

**Client:** Chitra's Lifeline Clinic, Yelahanka New Town, Bengaluru
**Goal:** Single-page, high-conversion landing page for Google Search Ads
**Focus services:** Botox · Laser Hair Removal · Medi-Facial (+ secondary: PRP, Peels, Hair Fall, Pigmentation)
**Host:** Cloudflare Pages (static, no server)

---

## 1. Verified clinic information

Everything below is pulled from the live site and public listings. **Anything marked `[CONFIRM]` must be verified by the clinic before it goes live.**

| Field | Value |
|---|---|
| Clinic | Chitra's Lifeline Clinic — Dermatology & Cosmetology (Skin & Lasers); Neurosurgery & Spine Surgery |
| Address | Ward No. 4, LMN Arcade, 17-B/4, 1169, Opposite Rail Wheel Factory, Yelahanka New Town, Bengaluru, Karnataka 560064 |
| Phone | +91 81975 16940 · +91 99860 86610 |
| Email | akshayhari@gmail.com `[CONFIRM]` — recommend a branded address |
| Hours | Monday–Saturday, 11:00 AM – 8:00 PM |
| Landmark | Opposite Rail Wheel Factory / near Cafe Coffee Day |

**Dr. Bindiya G P** — Aesthetic Dermatologist & Cosmetologist
- 7+ years experience
- Trained at Command Hospital Air Force, Bangalore
- Memberships: IMA, IADVL, Bangalore Dermatological Society, CDSI, ACSI
- `[CONFIRM]` Full degree string (MBBS, MD/DDVL/DNB?) — the site does not state it and we **must** print it accurately

**Dr. Akshay Hari** — Consultant Neuro & Spine Surgeon
- MBBS, DNB (Neurosurgery), Rajiv Gandhi University of Health Sciences
- Consultant of Neurosciences, Aster CMI Hospital, Hebbal
- *Kept off this landing page except as a one-line credibility mention — the ad traffic is aesthetic-intent only.*

**Public ratings** (usable as social proof if we cite the source)
- Justdial: 4.8 / 5 from 160+ ratings
- Practo aggregate: 4.6 / 5 from 245 patients

---

## 2. Strategy — why this page wins

The competition on "botox bangalore" and "laser hair removal near me" is chains: Kaya, Oliva, VLCC, Cutis. They outspend us. We beat them on two things:

**A. Doctor-performed, not technician-performed.**
At most chains the laser and the injections are done by a trained therapist under loose supervision. Here, a dermatologist does it. That is the single strongest differentiator in this category and it becomes the spine of the page.

**B. Proximity.**
Yelahanka New Town, Jakkur, Vidyaranyapura, Sahakar Nagar, Hebbal, Doddaballapur Road. Someone searching "laser hair removal near me" from Yelahanka does not want to drive to Indiranagar. Location is a conversion weapon — we lead with the landmark, not the pin code.

**Positioning line:** *Doctor-performed aesthetics. In Yelahanka.*

### The one-page, three-faces trick
We build one page, but the hero headline + hero image + first-scroll section swap based on a URL parameter:

- `/?s=botox` → "Botox in Yelahanka, by a Dermatologist"
- `/?s=laser` → "Laser Hair Removal in Yelahanka, by a Dermatologist"
- `/?s=facial` → "Medi-Facials in Yelahanka, by a Dermatologist"
- `/` (no param) → generic aesthetic hero

Each Google ad group points at its own parameter. Result: near-perfect message match → higher Quality Score → **lower cost per click for the same position**. One page to maintain, three landing experiences. This is the highest-ROI decision in the whole build.

---

## 3. Page architecture

### The scroll system

The page uses the layered scroll treatment you asked for, modelled on
truekindskincare.com. Three things carry it:

- **A preloader** — the clinic's logo builds itself piece by piece, in the
  manner of the Just Dent site, while a meter tracks the fonts and the hero
  photograph actually loading. It lifts once both the logo and those assets are
  ready — never sooner than **1.8 seconds**, never later than **4.5** — and
  shows **once per session**. That ceiling is deliberate and worth
  understanding: this page is paid traffic, so a visitor who waits is a visitor
  already paid for. It never blocks the page from rendering underneath, so it
  does not slow the score Google measures.
- **Multi-speed parallax** — inside each treatment section, the photograph, the
  frame around it and two accent images all travel at different rates as you
  scroll, and the frame drifts *against* the layers on top of it. That mismatch
  is what reads as depth rather than as things sliding about.
- **Line-by-line headings** — every section heading is split into its rendered
  lines, each rising out of a mask. It reads as type being set rather than as a
  fade-in.

The accent layers are decorative and are the first thing dropped as the screen
narrows — below 1200px they are hidden entirely, and on phones the parallax
switches off completely so scrolling stays fast on the device where most of
your booking traffic will arrive. Anyone whose system asks for reduced motion
gets a clean static page.

None of this uses an animation library. It is about 7 KB of code against the
roughly 120 KB the reference site loads for the same effects — which matters
directly, because Google scores page experience and every extra second is
billed on paid clicks. Technique notes are in `MOTION.md`.

### Section by section

Section by section, with the animation treatment for each.

| # | Section | Purpose | Motion / effect |
|---|---|---|---|
| 1 | **Sticky nav** | Always-visible Call + WhatsApp | Transparent over hero, frosts to solid glass on scroll. Logo shrinks. Mobile: bottom bar with Call / WhatsApp / Book. |
| 2 | **Hero** | Promise + proof + CTA in one screen | Split screen in the Just Dent format: headline, CTAs and trust figures on a blush panel, the photograph in a window on the right (below, on phones). As you scroll the window opens to fill the screen, the headline slides away — inverting where it crosses the photo — and a second, metallic title slides in over it. The headline rotates between the three treatments, or holds on the one the visitor searched for. |
| 3 | **Trust strip** | Kill doubt immediately | 4.8★ · 160+ reviews · 7+ yrs · IADVL member · Doctor-performed. Counters roll up when scrolled into view. |
| 4 | **The difference** | Doctor vs. technician | Split-screen compare. Left "At a chain", right "At Chitra's". Divider wipes open on scroll. |
| 5 | **Services** | Three hero cards | 3D tilt on mouse move, image zooms inside a clipped frame, pink border draws itself on hover. |
| 6 | **Botox deep-dive** | Convert the botox ad group | Sticky image column while text scrolls. Animated "areas treated" face diagram — dots pulse in sequence. |
| 7 | **Laser hair removal deep-dive** | Convert the LHR ad group | A light bar sweeps across the image on scroll — literal laser pass. Body-area selector chips that update the session time. |
| 8 | **Medi-facial deep-dive** | Convert the facial ad group | Horizontal scroll of facial types. Water-ripple / glow filter on the hero image. |
| 9 | **Instagram reels** | Show the doctor's own expertise | 9:16 reel cards, poster zooms on hover, play button fades up, links out to @chitraslifelineclinic. |
| 10 | **Meet Dr. Bindiya** | Trust anchor | Portrait masked reveal from bottom, credentials type in line by line, membership logos fade up staggered. |
| 11 | **Inside the clinic** | "Is this place clean and real?" | Gallery that scrolls horizontally as you scroll vertically. Parallax depth on each frame. |
| 12 | **What to expect** | Reduce anxiety | 4-step timeline, a champagne line draws downward as you scroll. |
| 13 | **Reviews** | Social proof | Auto-marquee of review cards, pauses on hover. Google logo + star rating. |
| 14 | **FAQ** | Kill last objections | Smooth accordion, pink plus rotates to minus. Doubles as SEO/schema. |
| 15 | **Location** | Close the local loop | Embedded map, landmark callout, parking note, "12 min from Hebbal" distances. |
| 16 | **Lead form + WhatsApp** | The conversion | Floating labels, inline validation, button morphs into a tick on success. Form posts to a Cloudflare Worker. |
| 17 | **Footer** | Legal + secondary links | Disclaimers, hours, both doctors, credits. |

### Design direction — the palette

Brand colours were sampled directly off the logo artwork: **magenta `#AD1E87`** and **cyan `#28C2DA`**.

The page is **light throughout — no dark sections anywhere.** That removes the easiest way to make pink look expensive (deep plum grounds), so the luxury has to come from elsewhere. Three decisions carry it:

1. **Three tinted surfaces instead of light-vs-dark.** Paper `#FFFFFF` → bone `#FDF8FA` → blush `#F9E9F1`. Sections alternate between them, so the page still has rhythm and depth without ever going dark. All three are warm pink-whites — a cool grey next to this pink reads as dirty.
2. **A metallic does the luxury work, not the pink.** Champagne `#E3C39F` → `#77522B` carries the numerals, the medallion on the doctor's portrait, the star ratings and the fine rules. Pink is reserved for brand and action.
3. **Cyan appears in small doses only.** The pulse dot, the tick marks. Enough to tie back to the logo and stop the page going monochrome pink.

| Role | Token | Value |
|---|---|---|
| Surfaces | `--paper` / `--bone` / `--blush` | `#FFFFFF` / `#FDF8FA` / `#F9E9F1` |
| Brand / action | `--accent` | `#AD1E87` |
| Bright pink | `--accent-hi` | `#E24BA6` |
| Deep pink | `--accent-deep` | `#7C1361` |
| Metallic | `--lux-hi` / `--lux` / `--lux-deep` | `#F5E3C9` / `#E3C39F` / `#77522B` |
| Brand secondary | `--brand-cyan` | `#28C2DA` |
| Text | `--tx` / `--tx-mute` | `#1F0E1A` / `#574350` |
| Hairlines | `--line` | `#EFE1E9` |

51 text/background pairs were measured against WCAG AA and all pass. Two colours are deliberately deeper than they look like they need to be: `--lux-deep`, because champagne fails contrast on white at anything lighter, and `--accent-deep`, which replaced the brighter `--accent-hi` on small text once the dark backgrounds were removed.

**Readability pass (after the switch to Jost).** Jost has thinner strokes and a smaller x-height than Nunito, so text that passed on paper still read faint. Four changes, none of which alter the look at a glance:

- `--tx-mute` darkened `#6E5766` → `#574350` (6.5:1 → 9.0:1 on white, 7.7:1 on blush) and `--lux-deep` `#8C6538` → `#77522B`. The old champagne measured 4.45:1 on blush, a fail for small text.
- The root font size is 106.25% (17px), which lifts every rem-sized text together.
- No uppercase label is below .75rem (12.75px), and all of them are weight 500.
- Form errors use `#B3261E` (6.5:1); the old `#E0655B` was 3.4:1.

**Spacing.** Section padding is `clamp(56px, 6.8vw, 100px)` (was up to 160px, which left ~320px of blank between sections on a laptop). Two adjacent sections on the same ground drop the second one's top padding, since together they read as one block.

The only light-on-dark text left on the page is the caption inside each Instagram reel card — correct, because it sits on the photo's own gradient rather than on a page surface.

- **Structure:** a blush-panel split hero that opens onto a full-bleed photograph, then sections alternating paper / bone / blush, closing on a bone footer. Contrast comes from the pink-bordered comparison panel, the champagne medallion, and soft shadows rather than from inverted sections.
- **Logo:** the clinic's own mark, trimmed and downscaled from the 2000px source (1.5 MB → 55 KB).
- **Type:** Display: **Bodoni Moda**, a high-contrast Didone, the serif fashion and beauty houses use. Body: **Jost**, a Futura-style geometric sans that stays quiet beside it. Both self-hosted, so the page makes **zero third-party requests** on load. (Replaced Comfortaa and Nunito, the earlier rounded pairing, when the client asked for something more elegant.)
  - Bodoni Moda has an optical-size axis: the browser redraws it for the size it's set at, so the hairlines thicken at 16px and sharpen at 8rem. One file covers both.
  - Elegance comes from contrast, not weight. Headings sit at 500 (enough to keep the hairlines visible through the metallic gradients), the big hero lines at 400, with only light negative tracking.
  - Emphasis is the drawn italic, never bold: the hero's accent words, the marquee, the step and service numerals, and Dr. Bindiya's pull-quote.
  - Buttons use a dedicated `--accent-btn` (`#C93A9E`) rather than `--accent-hi`: white label text on `#E24BA6` measures only 3.6:1, under the 4.5 needed at button sizes.
- **Texture:** Fine film grain overlay everywhere at 3–4% opacity. It's what separates "template" from "designed".

### Performance guardrails
This is Google Ads traffic — every 100ms of load time costs money, and Google scores landing page experience directly.

- Static HTML/CSS/JS on Cloudflare Pages. No React, no build bloat.
- Hero animation in **pure CSS** so the largest paint is never blocked by JavaScript.
- GSAP + ScrollTrigger self-hosted and deferred, only for the scroll work below the fold.
- All images AVIF + WebP with JPG fallback, served through Cloudflare Images/Polish, `srcset` at 3 widths.
- Target: LCP < 1.5s on 4G mobile, Lighthouse 95+.
- `prefers-reduced-motion` respected throughout — every animation degrades to a fade.

---

## 4. IMAGE MANIFEST — what to procure

Organised by priority. **Tier 1 is non-negotiable** — the page cannot launch without these. Tier 2 makes it excellent. Tier 3 is polish we can substitute with stock.

> **Shooting notes for whoever takes these:** shoot horizontal AND vertical of every setup (we need both for desktop and mobile crops). Natural light where possible, no harsh on-camera flash. Minimum 3000px on the long edge. Deliver unedited RAW/JPEG — we'll handle grading so everything matches.

### TIER 1 — Required to launch

| # | Image | Spec & direction |
|---|---|---|
| 1.1 | **Hero — the doctor at work** | Dr. Bindiya performing or preparing a procedure: gloved hands, the patient partly in frame, soft daylight, no text or signage in shot. **Landscape, 3:2, 3000px+ wide, with the subject in the right half** — the hero opens on the right half only, and the left half sits under the headline. Ideally one per treatment (botox, laser, facial), since each ad group gets its own. *This is the single most important asset on the page.* A vertical half-body portrait against a plain wall is still worth shooting for the doctor section and social. |
| 1.2 | **Dr. Bindiya — consulting** | Seated across from a patient (or a stand-in), mid-conversation, gesturing. Candid, not posed. Shows the "doctor listens to you" promise. |
| 1.3 | **Dr. Bindiya — performing a procedure** | Gloved, close in on the hands + the device/syringe, patient's face partially in frame or cropped out. This is the "doctor-performed" proof shot. Needs to be sharp and clinical. |
| 1.4 | **The laser machine — full unit** | The actual device, clean, in the treatment room, brand name legible. `[CONFIRM which laser — Diode? Candela? Soprano? Alma?]` Naming the machine is a major trust and ad-differentiation signal. |
| 1.5 | **Laser handpiece in use** | Macro-ish shot of the handpiece against skin — underarm, leg or forearm. Model's skin clean, no jewellery. This sells LHR better than any headline. |
| 1.6 | **Botox injection close-up** | Gloved hand, fine needle at the forehead/crow's-feet area, patient reclined. Shot tight and shallow depth of field so it reads elegant, not scary. |
| 1.7 | **Medi-facial in progress** | Mask/serum application, patient reclined with headband, eyes closed, relaxed. Warm spa lighting. This is the "indulgence" image. |
| 1.8 | **Treatment room — wide** | Bed made, machine visible, spotless, lights on. Shot from a corner at chest height. Both landscape and portrait. |
| 1.9 | **Reception / waiting area** | Clean, welcoming, signage visible if possible. |
| 1.10 | **Clinic exterior + signage** | Street-level, daytime, showing the board and the entrance. Include enough context that someone recognises it when they arrive. Helps enormously with local intent. |
| 1.11 | ~~**Clinic logo**~~ ✅ **Received** | Mark and full lockup both in place. A vector (`.svg`/`.ai`/`.eps`) would still be worth having for print and for razor-sharp rendering on high-DPI screens. |

### TIER 2 — Strongly recommended

| # | Image | Spec & direction |
|---|---|---|
| 2.1 | *(removed — no before/after section on this page)* | — |
| 2.2 | **Dr. Bindiya — environmental portrait** | Standing in the clinic, arms crossed, room in soft focus behind. Used in the "Meet your doctor" section. |
| 2.3 | **Hands / detail shots ×4** | Gloves being put on, serum bottle being poured, a device dial, sanitiser dispenser. These fill layout gaps and read as "clean and careful". |
| 2.4 | **Skin macro texture ×2** | Extreme close-up of clear, healthy skin — cheek or collarbone. Used as section background texture. |
| 2.5 | **Patient / model portraits ×3** | Indian women, 25–45, clear skin, natural makeup, neutral background, genuine expression. For testimonial cards and the results section. **Consent required if real patients.** |
| 2.6 | **Membership / association logos** | IADVL, IMA, CDSI, ACSI, Bangalore Dermatological Society. PNG with transparency. `[CONFIRM the clinic is entitled to display each of these]` |
| 2.7 | **Team photo** | Dr. Bindiya with clinic staff, all in uniform, outside or in reception. Makes the practice feel established. |
| 2.8 | **Consultation room** | Desk, chairs, diplomas on the wall if any. Frame the certificates — they're free credibility. |

### TIER 3 — Nice to have / can substitute with stock

| # | Image | Spec & direction |
|---|---|---|
| 3.1 | **10–15s video loop of the clinic** | Slow pan across reception or a laser pass. Silent, no audio needed. Muted autoplay behind the hero. Massive perceived-quality upgrade. |
| 3.2 | **Product / serum still life** | The skincare products the clinic uses or dispenses, arranged on a clean surface with soft shadow. |
| 3.3 | **Certificates & degrees** | Photographed straight-on. Used small, as a credibility strip. |
| 3.4 | **Abstract texture plates** | Silk fold, water droplet macro, rose/champagne particle bokeh. I can source or generate these — no shoot needed. |
| 3.5 | **Dr. Akshay Hari portrait** | One shot, white coat, for the single-line credibility mention in the footer. |
| 3.6 | **Google reviews screenshot** | Clean screenshot of the Google Business Profile rating card. |

### TIER 4 — Instagram section (new)

The page now carries a reels section pulling from **[@chitraslifelineclinic](https://www.instagram.com/chitraslifelineclinic/)**. Four cards are live with placeholder posters. To finish it I need, for each of four reels:

| # | Needed | Notes |
|---|---|---|
| 4.1–4.4 | **The reel URL** | e.g. `https://www.instagram.com/reel/ABC123/`. Pick the four that best sell Botox, laser, medi-facials and hair fall. |
| 4.1–4.4 | **A cover frame from each reel** | Vertical 9:16, ideally 1080×1920. A screenshot of the reel's own cover is fine. |
| 4.1–4.4 | **A one-line title + subtitle** | Currently placeholders like "What botox actually does / And what it can't fix". Yours will be better — you know which reels performed. |

Pick reels where Dr. Bindiya is **on camera and talking**. Faces outperform treatment close-ups badly in this slot — the whole point of the section is that the viewer meets her before they book.

> The clinic's Instagram bio currently reads "Dermatology • Skin • Hair • Laser / Spine & Pain Specialist Care / Advanced treatments | Expert guidance". Worth pointing it at the landing page URL once this is live — Instagram bio traffic converts well and costs nothing.

### If a photoshoot isn't possible right now
The page is already built and running on licensed stock. The shots that genuinely cannot be faked — because the whole page is built on "this specific doctor, in this specific place" — are **1.1, 1.2, 1.3 and 1.10**: the doctor's portrait, her consulting, her performing a procedure, and the clinic exterior. Everything else can ship as-is and be upgraded later. Swapping any image is drop the file in, run `node scripts/build-images.mjs`, redeploy; the layout doesn't move.

---

## 5. Copy & data I need from the clinic

These are blanks in the page that only they can fill:

1. **Dr. Bindiya's exact degree string** — third-party listings suggest **MBBS, DDVL**, but I could not verify that against a primary source, so the page does not print it. Confirm and I'll add it. This must be verbatim and correct.
2. **Laser machine make and model** — for LHR. Big trust signal.
3. **Botox brand used** — Allergan Botox / Dysport / Xeomin? Also a trust signal.
6. **Which number should leads go to** — is +91 81975 16940 the WhatsApp number?
7. **Where should form submissions land** — an email address, a Google Sheet, or straight to WhatsApp?
8. **Preferred domain** — a subdomain like `skin.chitraslifelineclinic.com` or a fresh domain? (I'd recommend a subdomain of the existing site.)
9. **3–5 written patient testimonials** with first name + area (e.g. "Priya S., Jakkur"). Even better: permission to quote existing Google/Justdial reviews verbatim.
10. **Consent forms** for any before/after images.

---

## 6. Compliance — read before approving creative

Worth flagging clearly, because it shapes what we can put on the page:

- **Botox is a prescription drug in India.** Under the Drugs & Magic Remedies (Objectionable Advertisements) Act, 1954 and NMC advertising norms, we must position this as *information about a clinical service*, not a promotional product ad. Practical effect: no "guaranteed results", no "cheapest in Bangalore", no cure claims, no superlatives like "best". We say what the treatment is, who performs it, and what to expect. This is also just better copy.
- **Google Ads policy:** cosmetic-procedure ads are permitted in India, but before/after imagery can trigger the "personalised advertising / health" policy on Display. On Search it's generally fine on the landing page. We'll keep before/afters below the fold and non-sensationalised.
- **No before/after section.** Removed at your request — which also removes the biggest consent and policy exposure on the page. If it's ever added back, those images need documented *written* patient consent on file, not verbal.
- **Instagram embeds** are fine — the content is already public and published by the clinic itself.
- The page carries a visible disclaimer: *results vary between individuals; a consultation is required to determine suitability.*

None of this weakens the page. Restraint reads as medical authority — the chains that scream "50% OFF BOTOX!!" look cheap next to a page that reads like a real doctor wrote it.

---

## 7. Build sequence

1. You send Tier 1 images + the §5 answers
2. I build the full page with real content, placeholder-grading the images
3. Deploy to Cloudflare Pages on a preview URL for review
4. Revisions
5. Point the domain, add Google Analytics 4 + Google Ads conversion tag + Meta pixel if needed
6. Set up the lead-capture Worker (form → email + Google Sheet)
7. Handover: I'll document the three `?s=` ad-group URLs for the Google Ads setup

**I can start immediately on the build with stock placeholders** — the structure, copy, animations and deploy pipeline don't depend on final photography. Say the word and I'll have a live preview URL up before the images arrive.
