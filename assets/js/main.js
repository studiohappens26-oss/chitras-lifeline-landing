/* ═══════════════════════════════════════════════════════════════════════
   Chitra's Lifeline Clinic · interaction layer
   Zero dependencies. Everything here is progressive: with JS disabled the
   page still reads, every treatment panel shows, and the WhatsApp links work.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Treatment pages name their treatment on <body data-service>, so the
     booking form arrives with it already chosen. */
  function presetService() {
    const v = document.body.dataset.service;
    const select = $('#f-service');
    if (v && select && !select.value) select.value = v;
  }

  /* ── Treatment tabs ───────────────────────────────────────────────────
     WAI-ARIA tabs: arrow keys move between them, the photograph opens as a
     circle each time a panel is shown. */
  let selectTab = () => {};
  function tabs() {
    const list = $('[data-tabs]');
    if (!list) return;
    const btns = $$('[role="tab"]', list);
    const panels = btns.map((b) => document.getElementById(b.getAttribute('aria-controls')));

    selectTab = (key, focus = false, animate = true) => {
      btns.forEach((b, i) => {
        const on = b.dataset.tab === key;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        if (on) {
          if (focus) b.focus();
          const img = $('.card__media img', panels[i]);
          if (img && animate && !REDUCED) { img.classList.remove('in'); void img.offsetWidth; img.classList.add('in'); }
        }
      });
    };

    btns.forEach((b, i) => {
      b.addEventListener('click', () => selectTab(b.dataset.tab));
      b.addEventListener('keydown', (e) => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          selectTab(btns[e.key === 'Home' ? 0 : btns.length - 1].dataset.tab, true);
        } else if (k) {
          e.preventDefault();
          selectTab(btns[(i + k + btns.length) % btns.length].dataset.tab, true);
        }
      });
    });

    // Without JS every panel shows; with it, only the chosen one (no opening animation at load)
    selectTab(btns[0].dataset.tab, false, false);

    // Footer links jump to the section with the right tab open.
    $$('[data-goto-tab]').forEach((a) => a.addEventListener('click', () => selectTab(a.dataset.gotoTab)));
  }

  /* ── Scroll reveal ────────────────────────────────────────────────── */
  function reveals() {
    const items = $$('[data-reveal]');
    items.forEach((el) => {
      const d = el.dataset.revealDelay;
      if (d) el.style.setProperty('--d', d);
    });

    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }

    // The observer's first report covers everything already on screen, so
    // nothing visible at load waits for a scroll, and nothing is measured here.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    });
    items.forEach((el) => io.observe(el));
  }

  /* Sections below the hero skip rendering until they come near the screen
     (styles.css, .frame). An in-page link would then smooth-scroll to an
     estimated position, so on the first such click every section is drawn
     first. The cost lands on the click, not on page load. */
  function inPageJumps() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('a[href*="#"]')) document.documentElement.classList.add('all-drawn');
    }, { capture: true });
  }

  /* ── Nav + mobile dock state ──────────────────────────────────────── */
  function scrollChrome() {
    const nav = $('#nav');
    const dock = $('.dock');
    // Runs straight from the scroll event: it only flips classes, and the
    // browser already coalesces scroll events to one per frame.
    let lastY = 0, travel = 0; // not scrollY: reading it here would force a layout
    const onScroll = () => {
      const y = Math.max(0, scrollY);
      const dy = y - lastY;
      lastY = y;
      nav?.classList.toggle('is-stuck', y > 40);
      // The dock appears once past the hero, so it never covers the first CTA.
      dock?.classList.toggle('is-up', y > innerHeight * 0.7);
      if (!nav) return;
      // The nav slides away while reading down and returns on the first scroll
      // up. A little travel is needed in one direction first, so a trackpad
      // wobble doesn't make it flicker. Always shown near the top.
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (y < 120) nav.classList.remove('is-hidden');
      else if (travel > 24) nav.classList.add('is-hidden');
      else if (travel < -12) nav.classList.remove('is-hidden');
    };
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* An .embed shows its loader (build-pages.mjs, loading()) until the iframe
     inside reports load; then the iframe fades in over it. */
  const whenLoaded = (frame) => frame.addEventListener('load', () => frame.closest('.embed')?.classList.add('is-ready'), { once: true });

  /* ── Instagram reels ──────────────────────────────────────────────────
     Each .reel ships with its post id and a "Watch on Instagram" link
     (build-pages.mjs). The embeds are created only when the rail comes
     within a screen of the viewport: an iframe is costly even before it
     loads anything, so none exist at page load. */
  function reels() {
    const rail = $('[data-reels-rail]');
    if (!rail) return;
    const cards = $$('.reel[data-ig]', rail);
    const load = () => cards.forEach((c, i) => {
      const f = document.createElement('iframe');
      f.title = `Instagram video ${i + 1} by Dr. Bindiya G P`;
      f.src = `https://www.instagram.com/p/${c.dataset.ig}/embed/`;
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.setAttribute('scrolling', 'no');
      whenLoaded(f);
      c.append(f);
    });
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: '600px 0px' });
    io.observe(rail);

    $$('[data-reels]').forEach((b) => b.addEventListener('click', () => {
      const step = (cards[0]?.getBoundingClientRect().width || 300) + 14;
      const per = Math.max(1, Math.floor(rail.clientWidth / step));
      rail.scrollBy({ left: Number(b.dataset.reels) * step * per, behavior: REDUCED ? 'auto' : 'smooth' });
    }));
  }

  /* ── Prefill service when a section CTA is used ───────────────────── */
  function prefill() {
    $$('[data-prefill]').forEach((a) => {
      a.addEventListener('click', () => {
        const select = $('#f-service');
        if (select) select.value = a.dataset.prefill;
      });
    });
  }

  /* ── Lead form ────────────────────────────────────────────────────── */
  function leadForm() {
    const form = $('#lead-form');
    if (!form) return;

    const status = $('.form__status', form);

    // Shows or clears a field's message, and ties it to the field so a
    // screen reader reads it with the field (aria-invalid, aria-describedby).
    const setErr = (field, msg) => {
      const wrap = field.closest('.field') || field.closest('.consent');
      const slot = wrap && $('[data-err]', wrap);
      wrap?.classList.toggle('is-bad', Boolean(msg));
      if (!slot) return;
      slot.textContent = msg || '';
      slot.id ||= `${field.id || field.name}-err`;
      field.toggleAttribute('aria-invalid', Boolean(msg));
      if (msg) field.setAttribute('aria-describedby', slot.id);
      else field.removeAttribute('aria-describedby');
    };

    const validate = () => {
      let ok = true;

      const name = $('#f-name');
      if (name.value.trim().length < 2) { setErr(name, 'Please enter your name'); ok = false; }
      else setErr(name, '');

      // Indian mobile: 10 digits starting 6 to 9, optionally with +91 / 0.
      const phone = $('#f-phone');
      const digits = phone.value.replace(/\D/g, '').replace(/^(91|0)/, '');
      if (!/^[6-9]\d{9}$/.test(digits)) { setErr(phone, 'Enter a valid 10-digit mobile number'); ok = false; }
      else setErr(phone, '');

      // The short form on the ad pages has no 'best time to call'
      ['#f-service', '#f-when'].forEach((sel) => {
        const el = $(sel);
        if (!el) return;
        if (!el.value) { setErr(el, 'Please choose an option'); ok = false; }
        else setErr(el, '');
      });

      const consent = form.querySelector('[name="consent"]');
      setErr(consent, consent.checked ? '' : 'Please tick the box to continue');
      if (!consent.checked) ok = false;

      return ok;
    };

    /* Booking goes to WhatsApp. The enquiry is written out as a formatted
       message to the clinic's number; the visitor only has to press send.
       *asterisks* render as bold there. */
    const WA_NUMBER = '918031687353';
    const waMessage = (d) => [
      "Hi, I'd like to book a consultation at Chitra's Lifeline Clinic.",
      '',
      `*Name:* ${d.name.trim()}`,
      `*Mobile:* ${d.phone.trim()}`,
      `*Interested in:* ${d.service}`,
      ...(d.preferred ? [`*Best time to call:* ${d.preferred}`] : []),
      ...(d.message && d.message.trim() ? [`*Note:* ${d.message.trim()}`] : []),
      '',
      '(Sent from the clinic website)',
    ].join('\n');

    // Deliberately not async: a browser only lets a page open a new window as
    // the direct result of a click, so WhatsApp has to open before any await.
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      status.textContent = '';
      status.className = 'form__status';

      if (!validate()) {
        status.textContent = 'Please check the highlighted fields.';
        status.classList.add('is-bad');
        $('[aria-invalid]', form)?.focus();   // straight to the first field to fix
        return;
      }

      // Honeypot: silently accept and discard.
      if (form.querySelector('[name="company"]').value) return;

      const data = Object.fromEntries(new FormData(form).entries());
      data.page = location.pathname + location.search;
      data.variant = document.body.dataset.page || 'generic';   // which page (ad group) the lead came from

      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMessage(data))}`;
      const win = window.open(url, '_blank');
      if (win) win.opener = null;
      else location.href = url;              // popup blocked: go there directly

      // A copy for the clinic's records, in case the visitor never presses
      // send. keepalive lets it finish even as focus moves to WhatsApp.
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {});

      track('lead_submit', { service: data.service, variant: data.variant });
      form.reset();
      presetService();
      status.innerHTML =
        `WhatsApp should now be open with your details filled in. Press send to reach the clinic. <a href="${url}" target="_blank" rel="noopener" style="text-decoration:underline">Didn't open? Tap here.</a>`;
      status.classList.add('is-ok');
    });

    // Clear the error as soon as they start fixing it.
    $$('input, select, textarea', form).forEach((el) => {
      const clear = () => setErr(el, '');
      el.addEventListener('input', clear);
      el.addEventListener('change', clear);
    });
  }

  /* ── Lazy map ─────────────────────────────────────────────────────────
     The map embed brings several hundred kilobytes of Google's script, and
     loading="lazy" on an iframe still starts it early in some browsers, so
     its src is held back until it is within roughly a screen of the view. */
  function lazyFrames() {
    const frames = $$('iframe[data-src]').filter((f) => !f.closest('[data-reels-rail]'));
    const load = (f) => { whenLoaded(f); f.src = f.dataset.src; f.removeAttribute('data-src'); };
    if (!('IntersectionObserver' in window)) { frames.forEach(load); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      load(e.target);
      io.unobserve(e.target);
    }), { rootMargin: '800px 0px' });
    frames.forEach((f) => io.observe(f));
  }

  /* ── Conversion tracking ──────────────────────────────────────────── */
  function track(event, params = {}) {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...params });
  }

  function trackClicks() {
    $$('[data-track]').forEach((el) => {
      el.addEventListener('click', () => track(el.dataset.track.replace(/-/g, '_')));
    });
  }

  /* ── Init ─────────────────────────────────────────────────────────── */
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  presetService();
  tabs();
  reveals();
  lazyFrames();
  inPageJumps();
  scrollChrome();
  reels();
  prefill();
  leadForm();
  trackClicks();
})();
