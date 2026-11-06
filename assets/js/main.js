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

  /* ── Ad-group variants ────────────────────────────────────────────────
     One page, three faces. Each Google ad group lands on its own ?s= value
     so the headline matches what was searched. Wording avoids prescription
     drug names, which Google Ads does not allow on landing pages in India.
     ?s=botox is kept as an alias so any old link still lands sensibly. */
  const VARIANTS = {
    wrinkle: {
      title: 'Anti-wrinkle injections in Yelahanka, <em>by your dermatologist.</em>',
      sub: '<strong>Dr. Bindiya G P</strong> reads how your face moves, plans the dose around it and gives every injection herself.',
      tab: 'wrinkle', service: 'Anti-wrinkle injections',
    },
    laser: {
      title: 'Laser hair reduction in Yelahanka, <em>set for your skin.</em>',
      sub: 'Indian skin needs settings chosen for it. <strong>Dr. Bindiya G P</strong> reads your skin and hair type, and checks for causes like PCOS, before the first session.',
      tab: 'laser', service: 'Laser hair reduction',
    },
    facial: {
      title: 'Medi-facials in Yelahanka, <em>chosen after a skin check.</em>',
      sub: 'Your facial is picked after <strong>Dr. Bindiya G P</strong> has examined your skin, for acne, dullness, pigmentation or an event coming up.',
      tab: 'facial', service: 'Medi-facial',
    },
  };
  VARIANTS.botox = VARIANTS.wrinkle;
  const VARIANT_KEY = new URLSearchParams(location.search).get('s');
  const VARIANT = VARIANTS[VARIANT_KEY];

  function applyVariant() {
    if (!VARIANT) return;
    const title = $('[data-variant-title]');
    if (title) title.innerHTML = VARIANT.title;
    $$('[data-variant-sub]').forEach((el) => { el.innerHTML = VARIANT.sub; });
    const select = $('#f-service');
    if (select) select.value = VARIANT.service;
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

    selectTab = (key, focus = false) => {
      btns.forEach((b, i) => {
        const on = b.dataset.tab === key;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        if (on) {
          if (focus) b.focus();
          const img = $('.card__media img', panels[i]);
          if (img && !REDUCED) { img.classList.remove('in'); void img.offsetWidth; img.classList.add('in'); }
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

    selectTab(VARIANT ? VARIANT.tab : btns[0].dataset.tab);

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

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    items.forEach((el) => io.observe(el));

    // Anything already on screen at load (or after the font swap reflows the
    // page) is revealed straight away, so nothing waits for a scroll.
    const revealVisible = () => {
      items.forEach((el) => {
        if (el.classList.contains('is-in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-in'); io.unobserve(el); }
      });
    };
    requestAnimationFrame(revealVisible);
    document.fonts?.ready.then(revealVisible);
    addEventListener('load', revealVisible, { once: true });
  }

  /* ── Nav + mobile dock state ──────────────────────────────────────── */
  function scrollChrome() {
    const nav = $('#nav');
    const dock = $('.dock');
    const onScroll = () => {
      const y = scrollY;
      nav?.classList.toggle('is-stuck', y > 40);
      // The dock appears once past the hero, so it never covers the first CTA.
      dock?.classList.toggle('is-up', y > innerHeight * 0.7);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── FAQ: one open at a time ──────────────────────────────────────── */
  function accordion() {
    const acc = $('[data-acc]');
    if (!acc) return;
    $$('details', acc).forEach((d) => {
      d.addEventListener('toggle', () => {
        if (d.open) $$('details[open]', acc).forEach((o) => { if (o !== d) o.open = false; });
      });
    });
  }

  /* ── Clinic rail: horizontal drift tied to vertical scroll ────────── */
  function rail() {
    const host = $('[data-rail]');
    const track = host && $('.rail__track', host);
    if (!track || REDUCED) return;

    let raf = null;
    const update = () => {
      raf = null;
      const r = host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const progress = Math.max(0, Math.min(1, 1 - (r.top + r.height) / (innerHeight + r.height)));
      const overflow = Math.max(0, track.scrollWidth - host.clientWidth);
      track.style.transform = `translate3d(${-overflow * progress}px, 0, 0)`;
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ── Instagram reels ──────────────────────────────────────────────────
     Each .reel carries only its post id. The iframe is written in when the
     rail comes within a screen of the viewport, so Instagram's script costs
     nothing on arrival. A link sits underneath in case the embed is blocked. */
  function reels() {
    const rail = $('[data-reels-rail]');
    if (!rail) return;
    const cards = $$('.reel[data-ig]', rail);

    cards.forEach((c, i) => {
      const id = c.dataset.ig;
      const post = `https://www.instagram.com/p/${id}/`;
      c.innerHTML =
        `<div class="reel__wait"><span>Loading video ${i + 1} of ${cards.length}</span>` +
        `<a href="${post}" target="_blank" rel="noopener">Watch on Instagram</a></div>` +
        `<iframe title="Instagram video ${i + 1} by Dr. Bindiya G P" data-src="${post}embed/" loading="lazy" allowtransparency="true" scrolling="no" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    });

    const load = () => cards.forEach((c) => {
      const f = $('iframe[data-src]', c);
      if (f) { f.src = f.dataset.src; f.removeAttribute('data-src'); }
    });
    if (!('IntersectionObserver' in window)) load();
    else {
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { load(); io.disconnect(); }
      }, { rootMargin: '600px 0px' });
      io.observe(rail);
    }

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

    const setErr = (field, msg) => {
      const wrap = field.closest('.field') || field.closest('.consent');
      const slot = wrap && $('[data-err]', wrap);
      wrap?.classList.toggle('is-bad', Boolean(msg));
      if (slot) slot.textContent = msg || '';
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

      ['#f-service', '#f-when'].forEach((sel) => {
        const el = $(sel);
        if (!el.value) { setErr(el, 'Please choose an option'); ok = false; }
        else setErr(el, '');
      });

      const consent = form.querySelector('[name="consent"]');
      consent.closest('.consent')?.classList.toggle('is-bad', !consent.checked);
      if (!consent.checked) ok = false;

      return ok;
    };

    /* Booking goes to WhatsApp. The enquiry is written out as a formatted
       message to the clinic's number; the visitor only has to press send.
       *asterisks* render as bold there. */
    const WA_NUMBER = '918197516940';
    const waMessage = (d) => [
      "Hi, I'd like to book a consultation at Chitra's Lifeline Clinic.",
      '',
      `*Name:* ${d.name.trim()}`,
      `*Mobile:* ${d.phone.trim()}`,
      `*Interested in:* ${d.service}`,
      `*Best time to call:* ${d.preferred}`,
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
        return;
      }

      // Honeypot: silently accept and discard.
      if (form.querySelector('[name="company"]').value) return;

      const data = Object.fromEntries(new FormData(form).entries());
      data.page = location.pathname + location.search;
      data.variant = VARIANT_KEY && VARIANT ? VARIANT_KEY : 'generic';

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
      status.innerHTML =
        `WhatsApp should now be open with your details filled in. Press send and we'll reply to confirm your slot. <a href="${url}" target="_blank" rel="noopener" style="text-decoration:underline">Didn't open? Tap here.</a>`;
      status.classList.add('is-ok');
    });

    // Clear the error as soon as they start fixing it.
    $$('input, select, textarea', form).forEach((el) => {
      const clear = () => {
        el.closest('.field')?.classList.remove('is-bad');
        el.closest('.consent')?.classList.remove('is-bad');
      };
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
    const load = (f) => { f.src = f.dataset.src; f.removeAttribute('data-src'); };
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

  applyVariant();
  tabs();
  reveals();
  lazyFrames();
  scrollChrome();
  accordion();
  rail();
  reels();
  prefill();
  leadForm();
  trackClicks();
})();
