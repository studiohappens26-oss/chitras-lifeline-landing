/* ═══════════════════════════════════════════════════════════════════════
   Chitra's Lifeline Clinic · motion layer (November 2026 redesign)

   One seamless motion: every section grows out of the one before it. The
   hero circle opens, the mission text fills in as it is read, ribbons draw
   themselves along their length, the visit cards stack under a progress
   line. Rules in DESIGN.md.

   Kept apart from main.js on purpose: nothing here can break the booking
   form. Everything is decorative and the page reads fully without it.
   Only transform, opacity, clip-path and stroke offsets are animated.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const doc = document;
  const $  = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  let uid = 0;

  /* ── Ribbons ──────────────────────────────────────────────────────────
     Two thin parallel outlines, made by masking a wide stroke with one a
     little narrower, plus soft capsules along the middle. The paths loop
     back on themselves, after the hand-drawn curves in the brand reference.
     Strokes scale with the viewBox, so small cards get finer lines. */
  const RIBBONS = {
    wave:   { vb: '0 0 1200 600', paths: ['M-100 430 C 90 150 330 110 430 290 C 510 440 400 560 310 490 C 220 420 320 250 530 270 C 770 295 850 560 1060 520 C 1180 497 1240 410 1300 340', 'M-100 560 C 210 400 420 690 690 530 C 900 405 1060 250 1300 430'] },
    high:   { vb: '0 0 1200 600', paths: ['M-100 230 C 140 40 380 50 470 200 C 535 310 440 390 375 325 C 300 250 420 115 610 150 C 830 190 900 410 1100 340 C 1200 305 1250 230 1300 190'] },
    corner: { vb: '0 0 600 300',  paths: ['M300 -40 C 320 70 470 50 480 140 C 488 215 395 225 385 168 C 375 105 470 75 640 115', 'M230 -40 C 290 170 520 215 640 210'] },
    swoop:  { vb: '0 0 1200 600', paths: ['M700 -80 C 560 120 910 150 890 320 C 875 455 715 445 730 360 C 745 265 960 300 1010 460 C 1045 570 1090 640 1180 700', 'M810 -80 C 690 150 1050 200 1010 390 C 985 510 1130 620 1260 700'] },
  };

  function ribbon(host) {
    const v = RIBBONS[host.dataset.ribbon] || RIBBONS.wave;
    const k = Number(v.vb.split(' ')[2]) / 1200;
    const W = 34 * k, w = 31 * k;
    let s = '';
    v.paths.forEach((p) => {
      const id = `rb${uid++}`;
      s += `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1800" height="1100">` +
             `<path d="${p}" fill="none" stroke="#fff" stroke-width="${W}" pathLength="1" class="draw"/>` +
             `<path d="${p}" fill="none" stroke="#000" stroke-width="${w}"/></mask></defs>` +
           `<path d="${p}" fill="none" stroke="currentColor" stroke-opacity=".10" stroke-width="${w}"/>` +
           `<rect x="-200" y="-200" width="1800" height="1100" fill="currentColor" fill-opacity=".85" mask="url(#${id})"/>` +
           `<path d="${p}" fill="none" stroke="currentColor" stroke-opacity=".32" stroke-width="${9 * k}" stroke-linecap="round" stroke-dasharray="${46 * k} ${150 * k}" class="flow"/>`;
    });
    // Starts undrawn (scroll then draws it); with reduced motion it is simply drawn.
    host.innerHTML = `<svg class="ribbon" viewBox="${v.vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"${REDUCED ? '' : ' style="--d:1"'}>${s}</svg>`;
  }

  /* ── Lens circles over photographs ─────────────────────────────────── */
  function lens(host) {
    host.innerHTML =
      '<svg class="lens" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<g fill="none" stroke="currentColor" stroke-width=".35" stroke-opacity=".9">' +
      '<circle class="l1" cx="38" cy="54" r="30"/><circle class="l2" cx="38" cy="54" r="26.5" stroke-opacity=".45"/>' +
      '<circle class="l3" cx="80" cy="30" r="17"/><circle class="l4" cx="76" cy="80" r="14"/>' +
      '<circle class="l3" cx="64.6" cy="40" r=".9" fill="currentColor"/><circle class="l4" cx="62" cy="72" r=".9" fill="currentColor"/>' +
      '<circle class="l1" cx="13" cy="38" r=".9" fill="currentColor"/></g></svg>';
  }

  $$('[data-ribbon]').forEach(ribbon);
  $$('[data-lens]').forEach(lens);

  /* ── Scroll-linked lines, circles and photographs ─────────────────────
     Each ribbon draws itself in as it crosses the screen (fully drawn as
     its top reaches the top of the screen), and its capsules slide along the
     line with the scroll. Lens circles turn, drift and breathe. Photographs
     drift inside their frames (parallax), slightly enlarged so no edge
     shows. Only the elements near the viewport are measured, all reads
     before any writes, inside the one scroll frame. */
  const photos = REDUCED ? [] : $$('.hx__orb img, .card__media img, .doc__photo img, .feat__img img');
  photos.forEach((img) => img.classList.add('par'));
  const linked = [...$$('.ribbon'), ...$$('.lens'), ...photos];
  const live = new Set();
  if (!REDUCED) {
    const near = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target)));
      onScroll(); // paint the newcomers in their right place at once
    }, { rootMargin: '200px 0px' });
    linked.forEach((el) => near.observe(el));
  }
  function paintLinked() {
    if (!live.size) return;
    const vh = innerHeight;
    // 0 as the top edge enters at the bottom, 1 as the bottom edge leaves the top.
    const at = [...live].map((el) => {
      const r = el.getBoundingClientRect();
      return [el, Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)))];
    });
    at.forEach(([el, p]) => {
      if (el.classList.contains('ribbon')) {
        el.style.setProperty('--d', (1 - Math.min(1, p * 1.6)).toFixed(4));
        el.style.setProperty('--f', (-p * 900).toFixed(1));
      } else if (el.classList.contains('lens')) {
        el.style.setProperty('--c', (p * 2 - 1).toFixed(4));
      } else {
        el.style.translate = '0 ' + ((p * 2 - 1) * 6).toFixed(2) + '%';
      }
    });
  }

  /* ── Hero: the white copy of the marquee is clipped to the circle ──── */
  const stage = $('.hx__stage');
  const orb = stage && $('.hx__orb', stage);
  const inner = stage && $('.hx__marq--in', stage);

  function layoutStage() {
    if (!orb || !inner) return;
    const s = stage.getBoundingClientRect();
    const o = orb.getBoundingClientRect();
    const r = o.width / 2;
    inner.style.setProperty('--r', `${r}px`);
    inner.style.setProperty('--cx', `${o.left - s.left + r}px`);
    stage.style.setProperty('--rr', `${r}px`);
  }
  // A ResizeObserver reports after layout and before paint, so measuring
  // here forces no extra layout. Its first report also starts the opening.
  let opened = false;
  if (stage) new ResizeObserver(() => { layoutStage(); if (!opened) { opened = true; opening(); } }).observe(stage);

  /* Opening: the circle grows into place while the words rise. Nothing
     starts invisible (no preloader, no fade on the headline or photograph),
     because the browser only counts LCP once the largest element shows. */
  function opening() {
    if (REDUCED || !stage) return;
    orb.animate([{ scale: .82 }, { scale: 1 }], { duration: 1500, easing: EASE });
    const r = parseFloat(inner.style.getPropertyValue('--r')) || 0;
    const cx = inner.style.getPropertyValue('--cx') || '50%';
    inner.animate([{ clipPath: `circle(${r * .82}px at ${cx} 50%)` }, { clipPath: `circle(${r}px at ${cx} 50%)` }], { duration: 1500, easing: EASE });
    $$('.hx [data-rise]').forEach((el, i) => {
      el.animate([{ transform: 'translateY(22px)' }, { transform: 'none' }],
        { duration: 1000, delay: 80 + i * 70, easing: EASE, fill: 'backwards' });
    });
    $$('.hx__pill').forEach((el, i) => {
      el.animate([{ opacity: 0, scale: .8 }, { opacity: 1, scale: 1 }], { duration: 900, delay: 600 + i * 140, easing: EASE, fill: 'backwards' });
    });
  }

  /* ── Mission statement: fills word by word with the scroll ─────────── */
  const fill = $('[data-fill]');
  let units = [];
  if (fill) {
    (function wrap(el) {
      [...el.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = doc.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.append(w); return; }
            const s = doc.createElement('span');
            s.className = 'w';
            s.textContent = w;
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('chip-img')) wrap(n);
      });
    })(fill);
    units = $$('.w, .chip-img', fill);
  }
  function paintFill() {
    if (!units.length) return;
    const r = fill.getBoundingClientRect();
    const vh = innerHeight;
    if (r.bottom < -vh || r.top > vh * 2) return;
    // Starts as the text enters; done when its middle is 40% down the screen
    const p = Math.max(0, Math.min(1, (vh * .9 - r.top) / (vh * .5 + r.height * .5)));
    const n = Math.round(p * units.length);
    units.forEach((u, i) => u.classList.toggle('on', REDUCED || i < n));
  }

  /* ── Visit steps: the progress line follows the stacking cards ─────── */
  const steps = $$('.step');
  const dots = $('[data-dots]');
  const dotEls = dots ? $$('span', dots) : [];
  function paintSteps() {
    if (!steps.length || !dots) return;
    let k = -1;
    const line = innerHeight * .62;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < line) k = i; });
    dotEls.forEach((e, i) => e.classList.toggle('on', i <= k));
    dots.style.setProperty('--p', k < 0 ? 0 : k / Math.max(1, dotEls.length - 1));
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { paintFill(); paintSteps(); paintLinked(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();
