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
     little narrower, plus soft capsules flowing along the middle. */
  const RIBBONS = {
    wave:   { vb: '0 0 1200 600', paths: ['M-80 470 C 180 330 380 600 650 450 S 1060 170 1290 300', 'M-80 560 C 220 430 420 690 700 540 S 1080 300 1290 420'] },
    high:   { vb: '0 0 1200 600', paths: ['M-80 160 C 200 300 420 40 700 170 S 1100 420 1290 330'] },
    corner: { vb: '0 0 600 300',  paths: ['M380 -30 C 440 90 520 120 640 110', 'M330 -30 C 400 130 500 170 640 170'] },
    swoop:  { vb: '0 0 1200 600', paths: ['M760 -60 C 640 160 980 260 860 430 S 980 640 1160 680', 'M840 -60 C 720 160 1060 260 940 430 S 1060 640 1240 680'] },
  };

  function ribbon(host) {
    const v = RIBBONS[host.dataset.ribbon] || RIBBONS.wave;
    let s = '';
    v.paths.forEach((p, i) => {
      const id = `rb${uid++}`;
      s += `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1800" height="1100">` +
             `<path d="${p}" fill="none" stroke="#fff" stroke-width="34" pathLength="1" class="draw"/>` +
             `<path d="${p}" fill="none" stroke="#000" stroke-width="31"/></mask></defs>` +
           `<path d="${p}" fill="none" stroke="currentColor" stroke-opacity=".10" stroke-width="31"/>` +
           `<rect x="-200" y="-200" width="1800" height="1100" fill="currentColor" fill-opacity=".85" mask="url(#${id})"/>` +
           `<path d="${p}" fill="none" stroke="currentColor" stroke-opacity=".32" stroke-width="9" stroke-linecap="round" stroke-dasharray="46 150" class="flow" style="animation-duration:${14 + i * 5}s"/>`;
    });
    host.innerHTML = `<svg class="ribbon" viewBox="${v.vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${s}</svg>`;
  }

  /* ── Lens circles over photographs ─────────────────────────────────── */
  function lens(host) {
    host.innerHTML =
      '<svg class="lens" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<g fill="none" stroke="currentColor" stroke-width=".35" stroke-opacity=".9">' +
      '<circle cx="38" cy="54" r="30"/><circle cx="38" cy="54" r="26.5" stroke-opacity=".45"/>' +
      '<circle cx="80" cy="30" r="17"/><circle cx="76" cy="80" r="14"/>' +
      '<circle cx="64.6" cy="40" r=".9" fill="currentColor"/><circle cx="62" cy="72" r=".9" fill="currentColor"/>' +
      '<circle cx="13" cy="38" r=".9" fill="currentColor"/></g></svg>';
  }

  $$('[data-ribbon]').forEach(ribbon);
  $$('[data-lens]').forEach(lens);

  const ribbons = $$('.ribbon');
  if (REDUCED || !('IntersectionObserver' in window)) ribbons.forEach((r) => r.classList.add('on'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    ribbons.forEach((r) => io.observe(r));
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
  if (stage) {
    layoutStage();
    addEventListener('resize', layoutStage);
    addEventListener('load', layoutStage, { once: true });
    doc.fonts?.ready.then(layoutStage);
    if ('ResizeObserver' in window) new ResizeObserver(layoutStage).observe(stage);
  }

  /* Opening: the circle grows into place while the words rise. Content is
     painted from the first frame (no preloader, no opacity gate on the
     photograph), so it costs the ad landing page nothing in LCP. */
  function opening() {
    if (REDUCED || !stage || !orb.animate) return;
    orb.animate([{ scale: .82 }, { scale: 1 }], { duration: 1500, easing: EASE });
    const r = parseFloat(inner.style.getPropertyValue('--r')) || 0;
    const cx = inner.style.getPropertyValue('--cx') || '50%';
    inner.animate([{ clipPath: `circle(${r * .82}px at ${cx} 50%)` }, { clipPath: `circle(${r}px at ${cx} 50%)` }], { duration: 1500, easing: EASE });
    $$('.hx [data-rise]').forEach((el, i) => {
      el.animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1000, delay: 80 + i * 70, easing: EASE, fill: 'backwards' });
    });
    $$('.hx__pill').forEach((el, i) => {
      el.animate([{ opacity: 0, scale: .8 }, { opacity: 1, scale: 1 }], { duration: 900, delay: 600 + i * 140, easing: EASE, fill: 'backwards' });
    });
  }
  opening();

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
    const p = Math.max(0, Math.min(1, (vh * .86 - r.top) / (r.height + vh * .3)));
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
    requestAnimationFrame(() => { paintFill(); paintSteps(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paintFill();
  paintSteps();
})();
