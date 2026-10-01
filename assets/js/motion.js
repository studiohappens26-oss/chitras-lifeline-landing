/**
 * Motion layer — preloader, hero, smooth scroll, multi-speed parallax, line
 * reveals.
 *
 * The preloader and the hero are ported from the Just Dent build
 * (ClientWorks/JustDent); the scroll techniques from truekindskincare.com.
 * MOTION.md records both analyses. They run GSAP + ScrollTrigger + SplitText + Lenis, which is
 * ~120 KB gzipped of library. This is a Google Ads landing page where latency
 * is billed to the client on every click, so everything below is hand-written
 * against the same maths — one rAF loop, transforms only, ~7 KB.
 *
 * Kept separate from main.js because main.js is the conversion path (form,
 * tracking, nav). If the motion layer ever has to be pulled, deleting one
 * script tag must not take the booking form with it.
 */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* Their CustomEase "M0,0 C0.17,0.84 0.44,1 1,1" is just this curve. */
  const EASE = 'cubic-bezier(.17,.84,.44,1)';

  /* JustDent's GSAP eases, as the cubic-béziers they approximate. */
  const EXPO = 'cubic-bezier(.16,1,.3,1)';          // expo.out
  const EXPO_IO = 'cubic-bezier(.87,0,.13,1)';      // expo.inOut
  const POWER3_IO = 'cubic-bezier(.65,0,.35,1)';    // power3.inOut
  const POWER2_IN = 'cubic-bezier(.55,.085,.68,.53)';

  const html = document.documentElement;
  const anim = (el, frames, duration, delay = 0, easing = EXPO) =>
    el.animate(frames, { duration, delay, easing, fill: 'both' });

  /* ══ Preloader ══════════════════════════════════════════════════════════
     Rebuilt from Just Dent's Preloader.tsx: the clinic's logo assembles
     piece by piece, holds, then the panel wipes away upward to uncover a hero
     panel of the same colour. Their GSAP timeline runs here on the Web
     Animations API, with the same timings, and the logo is Chitra's own mark
     traced into separate parts (scripts/trace-logo.cjs).

     It does real work rather than just playing. It waits on what the first
     screen needs — the webfonts, the hero photograph downloaded *and
     decoded*, and the page's load event — and the meter reports those as they
     arrive. The logo takes MIN_MS to build: if everything is ready sooner the
     exit follows the animation; if not, the finished logo holds until it is,
     up to CAP_MS. Past that it lets go regardless — a paid click must never be
     held hostage by one slow photograph.

     Whether a visit gets it at all is decided in <head> before first paint
     (once per session, never under reduced motion), so a returning visitor
     never sees it flash. */
  const PL_KEY = 'cl_pl';
  const MIN_MS = 1800;
  const CAP_MS = 4500;

  const whenLoaded = () => (document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((r) => addEventListener('load', r, { once: true })));

  const whenDecoded = (img) => {
    if (!img) return Promise.resolve();
    const loaded = img.complete
      ? Promise.resolve()
      : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    // decode(), so the wipe never uncovers a photograph still being rasterised.
    return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : undefined));
  };

  function preloader() {
    const el = $('.pl');
    if (!el || html.dataset.pl !== 'active') {
      el?.remove();
      html.dataset.pl = 'done';
      return Promise.resolve();
    }

    /* Scroll lock. Capturing listeners that stop the event outright, so the
       smooth-scroll wheel handler never sees it either; overflow alone would
       not stop a trackpad's momentum from arriving after the unlock. */
    const block = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
    const KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
    const blockKey = (e) => { if (KEYS.has(e.key)) block(e); };
    const LOCK = { capture: true, passive: false };
    addEventListener('wheel', block, LOCK);
    addEventListener('touchmove', block, LOCK);
    addEventListener('keydown', blockKey, true);
    html.style.overflow = 'hidden';
    const unlock = () => {
      removeEventListener('wheel', block, LOCK);
      removeEventListener('touchmove', block, LOCK);
      removeEventListener('keydown', blockKey, true);
      html.style.overflow = '';
    };

    /* ── The build ─────────────────────────────────────────────────────────
       JustDent → here:
         mint facet rises and rotates up from its base  → the two hair strokes
         dark facet grows from its left edge            → lashes and brow
         the smile draws on as a stroke                 → the chin line sweeps
                                                           in, left to right,
                                                           into the leaf
         "Just", then "Dent", letter by letter          → "Chitra's", then
                                                           "Lifeline Clinic"
       Percent translates are of each part's own box (transform-box: fill-box
       in the stylesheet), so the motion scales with the logo. */
    const logo = $('.pl__logo', el);
    const parts = (s) => $$(s, logo);
    const from = (props) => [{ opacity: 0, ...props }, { opacity: 1, transform: 'none' }];

    parts('.pl-hair').forEach((p, i) => {
      p.style.transformOrigin = '50% 100%';
      anim(p, from({ transform: 'translateY(30%) rotate(-12deg)' }), 1100, 150 + i * 110);
    });
    parts('.pl-face').forEach((p) => {
      p.style.transformOrigin = '0% 50%';
      anim(p, from({ transform: 'scaleX(0)' }), 900, 500);
    });
    parts('.pl-leaf').forEach((p) => {
      anim(p, [{ opacity: 1, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)' }], 1100, 550, POWER3_IO);
    });
    parts('.pl-lips').forEach((p) => {
      p.style.transformOrigin = '50% 50%';
      anim(p, from({ transform: 'scale(.3)' }), 800, 700);
    });
    parts('.pl-w1').forEach((p, i) => anim(p, from({ transform: 'translateY(45%)' }), 1000, 800 + i * 60));
    parts('.pl-w2').forEach((p, i) => anim(p, from({ transform: 'translateY(35%)' }), 900, 1000 + i * 22));

    /* ── The meter ─────────────────────────────────────────────────────────
       Weighted by how much each item actually holds up the first screen. The
       document itself is already parsed — this script is deferred. */
    const bar = $('.pl__bar', el);
    const pct = $('.pl__pct', el);
    const tasks = [
      [0.15, Promise.resolve()],
      [0.25, document.fonts ? document.fonts.ready : Promise.resolve()],
      [0.4, whenDecoded($('.hx__img'))],
      [0.2, whenLoaded()],
    ].map(([w, p]) => [w, p.catch(() => {})]);
    let real = 0;
    tasks.forEach(([w, p]) => p.then(() => { real += w; }));
    const ready = Promise.all(tasks.map(([, p]) => p));

    /* What the meter shows never runs ahead of what has actually loaded, and
       never ahead of the logo either: on a warm cache everything is ready in a
       few hundred ms, and a bar that hit 100% and then sat there while the
       logo finished would read as a hang. So it is the lesser of the two, and
       eased so the steps between assets read as movement. */
    const t0 = performance.now();
    let shown = 0, last = t0, raf = 0;
    const draw = (now) => {
      const goal = Math.min(real, (now - t0) / MIN_MS, 1);
      shown += (goal - shown) * (1 - Math.exp(-(now - last) / 140));
      last = now;
      bar.style.setProperty('--p', shown.toFixed(4));
      pct.textContent = `${Math.round(shown * 100)}%`;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return new Promise((resolve) => {
      let gone = false;
      const exit = () => {
        if (gone) return;
        gone = true;
        clearTimeout(cap);
        cancelAnimationFrame(raf);
        bar.style.setProperty('--p', '1');
        pct.textContent = '100%';

        // The hero starts its own entrance on this, exactly as JustDent's
        // PRELOADER_EXIT event, so the two overlap rather than queue.
        document.dispatchEvent(new CustomEvent('cl:preloader-exit'));

        anim(logo, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], 550, 0, POWER2_IN);
        anim($('.pl__meter', el), [{ opacity: 1 }, { opacity: 0 }], 400, 0, POWER2_IN);
        anim(el, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], 1000, 100, EXPO_IO);

        /* A timer rather than the animation's finished promise: a tab opened
           in the background may not run animation frames at all, and the page
           has to be usable the moment the visitor switches to it. */
        setTimeout(() => {
          el.remove();
          unlock();
          html.dataset.pl = 'done';
          try { sessionStorage.setItem(PL_KEY, '1'); } catch { /* private mode */ }
          resolve();
        }, 1150);
      };

      const cap = setTimeout(exit, CAP_MS);
      Promise.all([ready, new Promise((r) => setTimeout(r, MIN_MS))]).then(exit);
    });
  }

  /* ══ Hero ═══════════════════════════════════════════════════════════════
     Just Dent's hero (Hero.tsx) scrubs a GSAP timeline against the scroll.
     Here a single number does the job: the hero's scroll progress, eased so it
     trails the wheel by roughly their 0.3s scrub, written to --hp. Every
     moving part is a calc() of that in the stylesheet, so one custom property
     per frame drives the whole scene and nothing but transform and opacity
     ever changes. */
  const ROTATE_MS = 4200;

  function hero() {
    const sec = $('[data-hx]');
    if (!sec) return;
    const stage = $('.hx__stage', sec);
    const media = $('.hx__media', sec);
    const sets = $$('.hx__set', sec);

    /* ── Rotating headline ─────────────────────────────────────────────────
       Three headlines share one grid cell and take turns: the outgoing lines
       leave upward through their masks while the next set rises in behind
       them. A visitor from an ad group sees only the headline that matches
       what they searched — message match beats variety — so it holds still. */
    const only = sets.find((s) => s.dataset.set === html.dataset.variant);
    const order = only ? [only] : sets;
    let cur = 0, hp = 0;

    const show = (s, delay) => {
      s.style.setProperty('--d', `${delay}s`);
      s.classList.remove('is-out');
      s.classList.add('is-shown');
      void s.offsetWidth;            // commit the lowered start so the rise transitions
      s.classList.add('is-in');
    };
    const hide = (s) => {
      s.classList.remove('is-in');
      s.classList.add('is-out');
      // Once it has left, drop it back below its mask, out of sight.
      setTimeout(() => s.classList.remove('is-shown', 'is-out'), 900);
    };
    const next = () => {
      // Not while nobody can see it: a hidden tab, or scrolled past the point
      // where the headline has faded out.
      if (document.hidden || hp > 0.55) return;
      const prev = order[cur];
      cur = (cur + 1) % order.length;
      hide(prev);
      show(order[cur], 0.4);
    };

    sec.classList.add('is-live');

    /* ── Entrance ──────────────────────────────────────────────────────────
       The photograph eases back from a 1.25× push-in while the first headline
       rises, both keyed to the preloader lifting. The push-in's start scale is
       set in the stylesheet so it is already in place at first paint. */
    const enter = () => {
      if (!REDUCED && media) anim(media, [{ transform: 'scale(1.25)' }, { transform: 'none' }], 2400);
      show(order[0], 0.2);
      if (order.length > 1 && !REDUCED) setInterval(next, ROTATE_MS);
    };
    if (html.dataset.pl === 'active') document.addEventListener('cl:preloader-exit', enter, { once: true });
    else enter();

    /* ── Phones: where the photo window starts ─────────────────────────────
       Just below the Book button, which sits under the headline in normal
       flow. Measured rather than set in CSS because the headline's height
       depends on the font, the width and the longest of the three headlines.
       Capped so at least ~38% of the screen is always photograph. */
    const intro = $('.hx__intro', sec);
    const PHONE = matchMedia('(max-width: 1023px)');
    const place = () => {
      if (!PHONE.matches || !intro) { sec.style.removeProperty('--hx-start-y'); return; }
      const start = Math.min(intro.offsetTop + intro.offsetHeight + 24, stage.offsetHeight * 0.62);
      sec.style.setProperty('--hx-start-y', `${Math.round(start)}px`);
    };
    place();
    if (document.fonts?.ready) document.fonts.ready.then(place);
    addEventListener('resize', place);

    if (REDUCED) return;

    /* ── Scroll ────────────────────────────────────────────────────────────
       Progress is measured over the stretch where the stage is pinned: the
       section's height less the stage's own. */
    let top = 0, span = 1, height = 0, vh = innerHeight, target = 0, raf = 0, last = 0;

    const read = () => {
      const y = scrollY - top;
      target = clamp(y / span, 0, 1);
      // The treatment names rise once the section's foot passes 110% of the
      // viewport, and sink again on the way back up.
      sec.classList.toggle('is-end', height - y < vh * 1.1);
      // After the pin releases, the photo drifts down a little as it leaves.
      sec.style.setProperty('--hx-lag', `${(clamp((y - span) / vh, 0, 1) * 6).toFixed(2)}%`);
    };

    const frame = (now) => {
      const dt = Math.min(64, now - (last || now));
      last = now;
      hp += (target - hp) * (1 - Math.exp(-dt / 90));
      if (Math.abs(target - hp) < 0.0005) hp = target;
      sec.style.setProperty('--hp', hp.toFixed(4));
      // The panel copy is fully faded by 15%; past that it is hidden outright
      // so its buttons cannot take an invisible click.
      sec.classList.toggle('is-open', hp > 0.16);
      if (hp === target) { raf = 0; last = 0; } else raf = requestAnimationFrame(frame);
    };
    const kick = () => { read(); if (!raf) raf = requestAnimationFrame(frame); };

    const measure = () => {
      vh = innerHeight;
      const r = sec.getBoundingClientRect();
      top = r.top + scrollY;
      height = r.height;
      span = Math.max(1, height - stage.offsetHeight);
      read();
    };

    measure();
    hp = target;                     // a reload part-way down starts in place
    sec.style.setProperty('--hp', hp.toFixed(4));
    sec.classList.toggle('is-open', hp > 0.16);
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { measure(); kick(); });
  }

  /* ══ Smooth scroll ══════════════════════════════════════════════════════
     Lenis-equivalent, ~30 lines. Two rules make it safe to bolt onto an
     existing page:

     1. It drives the real scroll position via scrollTo rather than
        transforming a wrapper. So getBoundingClientRect, position:sticky,
        IntersectionObserver and :target all keep working — the parallax and
        reveal code below needs no knowledge that this exists.
     2. It only intercepts the wheel. Keyboard, spacebar, scrollbar drag,
        find-in-page and focus scrolling stay native, and the target resyncs
        whenever the page moves for a reason we did not cause.

     Touch is left native — the reference site does the same (syncTouch: false).
     Momentum scrolling on a phone is already smooth and fighting it costs
     responsiveness on the device where the booking form matters most. */
  function smoothScroll() {
    if (REDUCED || matchMedia('(pointer: coarse)').matches) return;
    if (matchMedia('(max-width: 860px)').matches) return;

    const doc = document.documentElement;

    /* The stylesheet sets `scroll-behavior: smooth` for anchor jumps. Left on,
       every per-frame scrollTo below would kick off its own CSS smooth
       animation and the two easings would fight — the scroll goes rubbery and
       lags the wheel. So CSS smoothing is handed over to this loop, and the
       anchor handler further down takes over the job it was doing. */
    doc.style.scrollBehavior = 'auto';

    const LERP = 0.115;
    let target = scrollY, current = scrollY, running = false, ours = -1;

    const max = () => doc.scrollHeight - innerHeight;

    const frame = () => {
      current += (target - current) * LERP;
      if (Math.abs(target - current) < 0.35) { current = target; running = false; }
      ours = Math.round(current);
      scrollTo(0, ours);
      if (running) requestAnimationFrame(frame);
    };

    const glideTo = (y) => {
      target = clamp(y, 0, max());
      if (!running) { running = true; requestAnimationFrame(frame); }
    };

    /* Anchor links. scroll-padding-top was clearing the fixed nav for us; read
       it back rather than hard-coding the height, so the two cannot drift. */
    const pad = () => parseFloat(getComputedStyle(doc).scrollPaddingTop) || 0;

    document.addEventListener('click', (e) => {
      const a = e.target.closest?.('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const dest = document.querySelector(id);
      if (!dest) return;
      e.preventDefault();
      glideTo(dest.getBoundingClientRect().top + scrollY - pad());
      // Keep the URL and the focus ring honest — preventDefault skipped both.
      history.pushState(null, '', id);
      dest.setAttribute('tabindex', '-1');
      dest.focus({ preventScroll: true });
    });


    addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;                         // pinch-zoom
      // Let anything with its own scroller (the review rail, a select) keep it.
      if (e.target.closest?.('[data-native-scroll]')) return;
      e.preventDefault();
      glideTo(target + e.deltaY);
    }, { passive: false });

    // Any movement we did not author — anchor jump, keyboard, scrollbar.
    addEventListener('scroll', () => {
      if (Math.abs(scrollY - ours) > 2) { target = current = scrollY; running = false; }
    }, { passive: true });

    addEventListener('resize', () => { target = current = scrollY; });
  }

  /* ══ Multi-speed parallax ═══════════════════════════════════════════════
     The effect that carries the whole reference site. Each [data-px] element
     travels from +speed×22% to −speed×22% of its own height over the entire
     time it crosses the viewport, linearly — exactly the GSAP timeline they
     scrub, without the scrubbing engine.

     Depth comes from stacking mismatched speeds inside one section, and above
     all from letting a container run at a negative speed while its children
     run positive: the group drifts one way, the contents the other, and the
     eye reads it as distance rather than as sliding.

     One rAF loop for every element, geometry cached and only re-measured on
     resize, and nothing touched but transform — so this stays on the
     compositor and never triggers layout. */
  const UNIT = 22;
  const GAP = 12;              // breathing room left at the section boundary

  function parallax() {
    if (REDUCED) return;
    const desktop = !matchMedia('(max-width: 860px)').matches;
    const items = $$('[data-px]')
      .filter((el) => desktop || el.hasAttribute('data-px-mobile'))
      // Layers the stylesheet has hidden at this width measure as zero-height
      // and would just be dead weight in the loop.
      .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed')
      .map((el) => ({
        el, amt: parseFloat(el.dataset.px || '1') * UNIT, top: 0, h: 0,
        clamped: el.classList.contains('float') || el.hasAttribute('data-px-contain'),
        up: Infinity, down: Infinity,
      }));
    if (!items.length) return;

    let vh = innerHeight, queued = false;

    const measure = () => {
      vh = innerHeight;
      const y = scrollY;
      for (const it of items) {
        // Measure against the untransformed box, or each remeasure would
        // compound the offset we ourselves applied a frame earlier.
        it.el.style.transform = '';
        const r = it.el.getBoundingClientRect();
        it.top = r.top + y;
        it.h = r.height;

        /* How far this element may actually travel before it crosses out of
           its own section. A decorative layer that drifts past the boundary
           lands on the next section's background and reads as a bug, and the
           amount of room available changes with viewport and content — so it
           is measured rather than guessed at in the stylesheet. Content
           images opt out: they are inside their section by construction and
           clamping them would flatten the effect near the edges. */
        if (it.clamped) {
          const sec = it.el.closest('section');
          if (sec) {
            const sr = sec.getBoundingClientRect();
            it.up = Math.max(0, (it.top - (sr.top + y)) - GAP);
            it.down = Math.max(0, ((sr.top + y + sr.height) - (it.top + it.h)) - GAP);
          } else { it.up = it.down = Infinity; }
        }
      }
      apply();
    };

    const apply = () => {
      queued = false;
      const y = scrollY;
      for (const it of items) {
        const p = clamp((vh - (it.top - y)) / (vh + it.h), 0, 1);
        let off = (it.amt - 2 * it.amt * p) / 100 * it.h;      // px
        if (it.clamped) off = clamp(off, -it.up, it.down);
        it.el.style.transform = `translate3d(0,${off.toFixed(2)}px,0)`;
      }
    };

    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', measure);
    // Webfont swap reflows the page after first paint, so anything measured
    // before it lands is measured against the fallback's metrics.
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    measure();
  }

  /* ══ Cover-image parallax ═══════════════════════════════════════════════
     The other half of their system: a clipped frame with an oversized image
     inside drifting −20% → +30%. Separate from the above because the driver
     is the frame's position but the thing that moves is the child, and the
     travel is asymmetric. */
  /* The image is 130% tall and offset by -15%, so it overhangs the frame by
     15% of the frame on each side — which is 15/130 ≈ 11.5% of the image's
     own height, the unit a percentage translate is measured in. Keep this in
     step with the [data-px-cover] rules in the stylesheet. */
  const SLACK = 11.5;

  function coverParallax() {
    if (REDUCED) return;
    const frames = $$('[data-px-cover]').map((el) => ({
      el, img: el.querySelector('img'), top: 0, h: 0,
    })).filter((f) => f.img);
    if (!frames.length) return;

    let vh = innerHeight, queued = false;

    const measure = () => {
      vh = innerHeight;
      const y = scrollY;
      for (const f of frames) {
        const r = f.el.getBoundingClientRect();
        f.top = r.top + y; f.h = r.height;
      }
      apply();
    };

    const apply = () => {
      queued = false;
      const y = scrollY;
      for (const f of frames) {
        const p = clamp((vh - (f.top - y)) / (vh + f.h), 0, 1);
        // ±SLACK, matching the overhang the stylesheet gives the image. Any
        // wider and the frame is exposed at one end of the travel.
        f.img.style.transform = `translate3d(0,${(p * 2 * SLACK - SLACK).toFixed(3)}%,0)`;
      }
    };

    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(apply); } }, { passive: true });
    addEventListener('resize', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    measure();
  }

  /* ══ Two-layer flip ═════════════════════════════════════════════════════
     Lakova's signature move (their FlipMedia + effects.ts), without GSAP.
     Two photographs stacked in one frame; scrolling wipes the upper one away
     with a clip-path inset and uncovers a different photograph underneath.
     Both sit at scale(1.2) and drift in opposite directions inside that
     headroom while the wipe runs, so they move against each other instead of
     sliding as one plate. That counter-motion is what makes it read as depth
     rather than a crossfade.

     Scrubbed, not fired once: the point is watching one photo become the
     other, so progress is tied to scroll position. It runs from the frame's
     top entering the screen to its centre reaching 65% down (their window),
     and trails the scroll by a short ease, the way their scrub: 0.8 does.
     The end is measured from the centre, not an edge, so a frame taller than
     the screen still finishes. */
  const FLIP_DRIFT = 7;      // % of the image's box; scale(1.2) leaves 10% a side
  const FLIP_TAU = 0.22;     // seconds the wipe takes to catch up with the scroll
  const FLIP = {
    up:    { clip: (p) => `inset(0% 0% ${p}% 0%)`, axis: 'Y', sign: -1 },
    down:  { clip: (p) => `inset(${p}% 0% 0% 0%)`, axis: 'Y', sign: 1 },
    left:  { clip: (p) => `inset(0% ${p}% 0% 0%)`, axis: 'X', sign: -1 },
    right: { clip: (p) => `inset(0% 0% 0% ${p}%)`, axis: 'X', sign: 1 },
  };

  function flipMedia() {
    if (REDUCED) return;
    const frames = $$('[data-flip-media]').map((el) => ({
      el,
      cfg: FLIP[el.dataset.direction] || FLIP.up,
      up: el.querySelector('.flip__layer--up'),
      upImg: el.querySelector('.flip__layer--up img'),
      downImg: el.querySelector('.flip__layer--down img'),
      top: 0, h: 0, p: 0, shown: -1,
    })).filter((f) => f.up);
    if (!frames.length) return;

    let vh = innerHeight, raf = 0, last = 0;

    // 0 as the frame's top enters the screen, 1 once its centre is 65% down
    const target = (f) => clamp((vh - (f.top - scrollY)) / (vh * 0.35 + f.h / 2), 0, 1);

    const paint = (f) => {
      const key = Math.round(f.p * 1000);
      if (key === f.shown) return;             // nothing visible changed
      f.shown = key;
      const { cfg } = f;
      const move = (v) => `translate${cfg.axis}(${v.toFixed(2)}%) scale(1.2)`;
      f.up.style.clipPath = cfg.clip((f.p * 100).toFixed(2));
      if (f.upImg) f.upImg.style.transform = move(cfg.sign * FLIP_DRIFT * f.p);
      if (f.downImg) f.downImg.style.transform = move(-cfg.sign * FLIP_DRIFT * (1 - f.p));
    };

    const tick = (now) => {
      const dt = last ? Math.min(64, now - last) / 1000 : 1 / 60;
      last = now;
      const k = 1 - Math.exp(-dt / FLIP_TAU);
      let moving = false;
      for (const f of frames) {
        const to = target(f);
        f.p += (to - f.p) * k;
        if (Math.abs(to - f.p) < 0.0005) f.p = to; else moving = true;
        paint(f);
      }
      if (moving) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const measure = () => {
      vh = innerHeight;
      const y = scrollY;
      for (const f of frames) {
        const r = f.el.getBoundingClientRect();
        f.top = r.top + y;
        f.h = r.height;
      }
      kick();
    };

    measure();
    // Start where the page already is, so a reload halfway down doesn't
    // replay every wipe from the beginning.
    for (const f of frames) { f.p = target(f); paint(f); }
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    addEventListener('load', measure);
  }

  /* ══ Line-mask reveal ═══════════════════════════════════════════════════
     Headings split into their rendered lines, each line rising out of an
     overflow-hidden box. The mask is the whole point — without it this is a
     fade-up; with it, it reads as type being set.

     Splitting has to happen on the laid-out text, so it runs after fonts
     settle and re-runs on resize, because where the lines break is a function
     of the final metrics and the current width. The original text is kept so
     re-splitting is non-destructive and screen readers get one clean string. */
  function lineReveal() {
    const targets = $$('[data-lines]');
    if (!targets.length) return;
    /* Section headings take Just Dent's metallic finish — their
       text-metal-dark, here rebased on the page's plum. The class goes on each
       line's inner span, the element that directly holds the text, because
       background-clip:text does not reach text inside a transformed child.
       data-metal="rose" picks the pink finish; "none" opts out. */
    const metal = (el) => (el.dataset.metal === 'none' ? '' : `text-metal-${el.dataset.metal || 'plum'}`);
    const whole = (el) => { if (metal(el)) el.classList.add(metal(el)); };

    if (REDUCED) { targets.forEach((el) => { whole(el); el.classList.add('is-in'); }); return; }

    const split = (el) => {
      if (!el._raw) el._raw = el.innerHTML;
      else el.innerHTML = el._raw;

      /* The rebuild below moves text nodes out of their parents, which would
         silently drop an <em> or <strong> wrapping part of a heading. No
         heading uses inline markup today, but rather than let a future edit
         lose formatting without a word, such a heading skips line splitting
         and reveals as a single block. */
      if (el.firstElementChild) { el.classList.add('ln-whole'); whole(el); return; }

      // Wrap every word, read back its offsetTop, and group words that share
      // one into a line. Measuring after the browser has laid the text out is
      // the only reliable way to know where it actually broke.
      const html = el.innerHTML;
      el.innerHTML = html.replace(/(<[^>]+>)|([^<\s]+)/g, (m, tag, word) =>
        tag ? tag : `<span class="ln__w">${word}</span>`);

      const words = $$('.ln__w', el);
      if (!words.length) return;

      const rows = [];
      let last = null;
      words.forEach((w) => {
        const t = Math.round(w.offsetTop);
        if (last === null || Math.abs(t - last) > 4) { rows.push([]); last = t; }
        rows[rows.length - 1].push(w);
      });

      // Rebuild as one masked box per line.
      const frag = document.createDocumentFragment();
      rows.forEach((row, i) => {
        const box = document.createElement('span');
        box.className = 'ln';
        const inner = document.createElement('span');
        inner.className = `ln__i ${metal(el)}`.trim();
        inner.style.setProperty('--i', i);
        row.forEach((w, j) => {
          if (j) inner.append(' ');
          // Unwrap the measuring span; the line box carries the animation now.
          while (w.firstChild) inner.append(w.firstChild);
        });
        // Trailing space so the heading's textContent still reads as prose —
        // without it the last word of one line runs into the first of the next
        // for anything reading the text rather than the layout.
        if (i < rows.length - 1) inner.append(' ');
        box.append(inner);
        frag.append(box);
      });
      el.replaceChildren(frag);
      el.style.setProperty('--n', rows.length);
    };

    const run = () => targets.forEach(split);

    if (document.fonts?.ready) document.fonts.ready.then(run); else run();

    let t;
    let w = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth === w) return;              // ignore mobile URL-bar height changes
      w = innerWidth;
      clearTimeout(t);
      t = setTimeout(() => {
        run();
        targets.forEach((el) => { if (el.dataset.lnIn) el.classList.add('is-in'); });
      }, 180);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        e.target.dataset.lnIn = '1';
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12%', threshold: 0.1 });

    targets.forEach((el) => io.observe(el));

    // Anything already on screen at load reveals without waiting for a scroll.
    const showVisible = () => targets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-in'); el.dataset.lnIn = '1'; io.unobserve(el); }
    });
    if (document.fonts?.ready) document.fonts.ready.then(showVisible);
  }

  /* ══ Boot ═══════════════════════════════════════════════════════════════ */
  const start = () => { smoothScroll(); parallax(); coverParallax(); flipMedia(); lineReveal(); };

  // The hero first, so it is already listening when the preloader announces
  // its exit. The rest waits for the preloader to clear — smooth scroll must
  // not start taking wheel events while the page is locked — and neither may
  // strand the site if it throws, hence the catches.
  try { hero(); } catch (e) { console.error(e); }
  preloader().then(start, start);

  // Expose the easing token for anything else that wants to match.
  document.documentElement.style.setProperty('--ease-tk', EASE);
})();
