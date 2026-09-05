/**
 * Motion layer — loader, smooth scroll, multi-speed parallax, line reveals.
 *
 * The techniques here are lifted from truekindskincare.com; MOTION.md records
 * the analysis. They run GSAP + ScrollTrigger + SplitText + Lenis, which is
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

  /* ══ Loader ═════════════════════════════════════════════════════════════
     A loader on a paid-traffic landing page is a cost, not a flourish: the
     visitor already paid for the click and every extra second leaks them. So
     this one is bounded from three directions —
       · it dismisses at min(fonts + hero image ready, MAX_MS)
       · it shows once per session, so a back-button return is instant
       · it is skipped entirely under prefers-reduced-motion
     The page renders underneath it the whole time; this is an overlay, never
     a gate on paint, so it does not push out LCP.
     To remove it, delete the .loader element — nothing else depends on it. */
  const MAX_MS = 1100;
  const MIN_MS = 600;          // below this the exit animation just looks broken

  function loader() {
    const el = $('.loader');
    if (!el) return Promise.resolve();

    const seen = (() => {
      try { return sessionStorage.getItem('cl_seen') === '1'; } catch { return false; }
    })();

    if (REDUCED || seen) { el.remove(); document.documentElement.classList.add('is-ready'); return Promise.resolve(); }
    try { sessionStorage.setItem('cl_seen', '1'); } catch { /* private mode */ }

    document.documentElement.classList.add('is-loading');

    /* Two digit columns that only ever move forward — the reason the reference
       site picks odd stops like 0,2,6,9 rather than counting every integer is
       that a units digit rolling 9→0 would visibly run backwards. Both columns
       here are monotonic, so the roll is always downward. */
    const STOPS = ['00', '13', '25', '47', '68', '99'];
    const L = [...new Set(STOPS.map((s) => s[0]))];
    const R = [...new Set(STOPS.map((s) => s[1]))];
    const fill = (sel, digits) => {
      const box = $(sel, el);
      if (box) box.innerHTML = `<span class="loader__di">${digits.map((d) => `<span>${d}</span>`).join('')}</span>`;
    };
    fill('.loader__d--l', L);
    fill('.loader__d--r', R);

    const roll = (i) => {
      const [a, b] = STOPS[i];
      const lb = $('.loader__d--l', el), rb = $('.loader__d--r', el);
      if (lb) lb.style.setProperty('--i', L.indexOf(a));
      if (rb) rb.style.setProperty('--i', R.indexOf(b));
    };

    const t0 = performance.now();
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      if (step < STOPS.length) roll(step);
    }, MAX_MS / STOPS.length);

    // Assets that actually matter for the first screen. A hero image still
    // decoding is the one thing worth waiting a few hundred ms for.
    const hero = $('.hero__frame img');
    const ready = Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      hero && !hero.complete
        ? new Promise((r) => { hero.addEventListener('load', r, { once: true }); hero.addEventListener('error', r, { once: true }); })
        : Promise.resolve(),
    ]);

    return new Promise((resolve) => {
      const finish = () => {
        clearInterval(timer);
        roll(STOPS.length - 1);
        el.classList.add('is-out');
        document.documentElement.classList.remove('is-loading');
        document.documentElement.classList.add('is-ready');
        // Matches the longest exit transition in the CSS.
        setTimeout(() => { el.remove(); resolve(); }, 900);
      };

      const cap = setTimeout(finish, MAX_MS);
      ready.then(() => {
        const waited = performance.now() - t0;
        if (waited >= MAX_MS) return;              // the cap already fired
        clearTimeout(cap);
        setTimeout(finish, Math.max(0, MIN_MS - waited));
      });
    });
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
    if (REDUCED) { targets.forEach((el) => el.classList.add('is-in')); return; }

    const split = (el) => {
      if (!el._raw) el._raw = el.innerHTML;
      else el.innerHTML = el._raw;

      /* The rebuild below moves text nodes out of their parents, which would
         silently drop an <em> or <strong> wrapping part of a heading. No
         heading uses inline markup today, but rather than let a future edit
         lose formatting without a word, such a heading skips line splitting
         and reveals as a single block. */
      if (el.firstElementChild) { el.classList.add('ln-whole'); return; }

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
        inner.className = 'ln__i';
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
  const start = () => { smoothScroll(); parallax(); coverParallax(); lineReveal(); };

  // Parallax measures geometry, so it must not run while the loader is over
  // the page — but nothing here should be able to strand the site if the
  // loader throws, hence the catch.
  loader().then(start).catch(start);

  // Expose the easing token for anything else that wants to match.
  document.documentElement.style.setProperty('--ease-tk', EASE);
})();
