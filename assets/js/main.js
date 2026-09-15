/* ═══════════════════════════════════════════════════════════════════════
   Chitra's Lifeline Clinic — interaction layer
   Zero dependencies. Everything here is progressive: with JS disabled the
   page still reads, still scrolls, and the form still submits natively.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = matchMedia('(pointer: fine)').matches;

  /* ── Ad-group variants ────────────────────────────────────────────────
     One page, three faces. Each Google ad group lands on its own ?s= value
     so the headline matches the search term that was typed. Better message
     match → better Quality Score → cheaper clicks.                       */
  const VARIANTS = {
    botox: {
      title: 'Botox in Yelahanka, performed by a <em>dermatologist</em>.',
      sub: '<strong>Dr. Bindiya G P</strong>, an aesthetic dermatologist and cosmetologist with more than seven years of practice, assesses your face and places every unit herself instead of handing it to a technician.',
      first: 'botox',
    },
    laser: {
      title: 'Laser Hair Removal in Yelahanka, done by a <em>dermatologist</em>.',
      sub: 'Indian skin needs settings chosen for it, and machine presets won\'t do that. <strong>Dr. Bindiya G P</strong> reads your skin and hair type before the first pass.',
      first: 'laser',
    },
    facial: {
      title: 'Medi-Facials in Yelahanka, prescribed by a <em>dermatologist</em>.',
      sub: 'Your facial is chosen after <strong>Dr. Bindiya G P</strong>, an aesthetic dermatologist and cosmetologist with more than seven years of practice, has examined your skin.',
      first: 'facial',
    },
  };

  function applyVariant() {
    const key = new URLSearchParams(location.search).get('s');
    const v = VARIANTS[key];
    if (!v) return;

    // The ad group's hero photograph and display headline are already chosen
    // (the head script, then motion.js); this swaps the words.
    const title = $('[data-variant-title]');
    if (title) title.innerHTML = v.title;
    $$('[data-variant-sub]').forEach((el) => { el.innerHTML = v.sub; });

    // Float the matching deep-dive to the top of the three.
    const host = $('#deep-dives');
    const target = host && $(`[data-service="${v.first}"]`, host);
    if (host && target && host.firstElementChild !== target) {
      host.insertBefore(target, host.firstElementChild);
    }

    // Preselect it in the booking form too.
    const label = { botox: 'Botox', laser: 'Laser Hair Removal', facial: 'Medi-Facial' }[v.first];
    const select = $('#f-service');
    if (select && label) select.value = label;
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
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    items.forEach((el) => io.observe(el));

    // The observer deliberately waits until an element is 12% visible, which is
    // right for below-the-fold content but leaves anything only partly on the
    // first screen stuck at opacity 0 until the user scrolls. On a tall phone
    // that can hide the hero's sub-copy and CTAs entirely. Reveal whatever is
    // already on screen at load; the stagger delays still play.
    const revealVisible = () => {
      items.forEach((el) => {
        if (el.classList.contains('is-in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    };

    requestAnimationFrame(revealVisible);
    // Webfonts swap in after first paint and reflow the page, so an element
    // that was below the fold a moment ago may now be on screen. Re-check once
    // the fonts have settled, or that content stays invisible until a scroll.
    if (document.fonts?.ready) document.fonts.ready.then(revealVisible);
    addEventListener('load', revealVisible, { once: true });
  }

  /* Elements that trigger their own keyframe sets (face map, laser sweep,
     step markers) rather than the generic fade. */
  function inViewFlags() {
    const targets = [...$$('.deep__media'), ...$$('.steps li')];
    if (!targets.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting));
    }, { threshold: 0.35 });
    targets.forEach((t) => io.observe(t));
  }

  /* ── Counters ─────────────────────────────────────────────────────── */
  function counters() {
    const els = $$('[data-count]');
    if (!els.length || REDUCED || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);

        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const start = performance.now();
        const dur = 1500;

        const tick = (now) => {
          const t = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (t < 1) requestAnimationFrame(tick);
          else el.textContent = target.toFixed(decimals);
        };
        el.textContent = (0).toFixed(decimals);
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });

    els.forEach((el) => io.observe(el));
  }

  /* ── Nav + mobile dock state ──────────────────────────────────────── */
  function scrollChrome() {
    const nav = $('#nav');
    const dock = $('.dock');
    let last = 0;

    const onScroll = () => {
      const y = window.scrollY;
      nav?.classList.toggle('is-stuck', y > 40);
      // Dock appears once past the hero, so it never covers the first CTA.
      dock?.classList.toggle('is-up', y > window.innerHeight * 0.7);
      last = y;
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 3D tilt ──────────────────────────────────────────────────────── */
  function tilt() {
    if (!FINE_POINTER || REDUCED) return;

    $$('[data-tilt]').forEach((el) => {
      let raf = null;

      const move = (ev) => {
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width - 0.5;
        const py = (ev.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform =
            `perspective(1100px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateZ(0)`;
        });
      };
      const leave = () => {
        cancelAnimationFrame(raf);
        el.style.transform = '';
      };

      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
    });
  }

  /* ── Magnetic buttons ─────────────────────────────────────────────── */
  function magnetic() {
    if (!FINE_POINTER || REDUCED) return;

    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect();
        const x = ev.clientX - r.left - r.width / 2;
        const y = ev.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.16}px, ${y * 0.22}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ── Cursor glow ──────────────────────────────────────────────────── */
  function cursorGlow() {
    const glow = $('.cursor-glow');
    if (!glow || !FINE_POINTER || REDUCED) return;

    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, raf;

    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      glow.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });

    function loop() {
      cx += (x - cx) * 0.12;
      cy += (y - cy) * 0.12;
      glow.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      raf = Math.abs(x - cx) > 0.4 || Math.abs(y - cy) > 0.4 ? requestAnimationFrame(loop) : null;
    }
  }

  /* ── Laser area chips ─────────────────────────────────────────────── */
  function chips() {
    const group = $('.chips');
    if (!group) return;

    const outArea = $('[data-chip-out="area"]');
    const outTime = $('[data-chip-out="time"]');

    group.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.chip');
      if (!chip) return;
      $$('.chip', group).forEach((c) => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      if (outArea) outArea.textContent = chip.dataset.area;
      if (outTime) outTime.textContent = chip.dataset.time;
    });
  }

  /* ── FAQ: one open at a time, with a height transition ────────────── */
  function accordion() {
    const acc = $('[data-acc]');
    if (!acc) return;

    $$('details', acc).forEach((d) => {
      const body = $('.acc__body', d);
      if (!body) return;

      d.addEventListener('toggle', () => {
        if (!d.open) return;
        // Close siblings.
        $$('details[open]', acc).forEach((o) => { if (o !== d) o.open = false; });
        if (REDUCED) return;
        body.animate(
          [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)' },
        );
      });
    });
  }

  /* ── Clinic rail: horizontal drift tied to vertical scroll ────────── */
  function rail() {
    const rail = $('[data-rail]');
    const track = rail && $('.rail__track', rail);
    if (!track || REDUCED) return;

    let raf = null;
    const update = () => {
      raf = null;
      const r = rail.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;

      // 0 → 1 as the rail crosses the viewport.
      const progress = 1 - (r.top + r.height) / (innerHeight + r.height);
      const overflow = Math.max(0, track.scrollWidth - innerWidth);
      track.style.transform = `translate3d(${-overflow * Math.max(0, Math.min(1, progress))}px, 0, 0)`;
    };

    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
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
      if (!name.value.trim() || name.value.trim().length < 2) {
        setErr(name, 'Please enter your name'); ok = false;
      } else setErr(name, '');

      // Indian mobile: 10 digits starting 6–9, optionally with +91 / 0 prefix.
      const phone = $('#f-phone');
      const digits = phone.value.replace(/\D/g, '').replace(/^(91|0)/, '');
      if (!/^[6-9]\d{9}$/.test(digits)) {
        setErr(phone, 'Enter a valid 10-digit mobile number'); ok = false;
      } else setErr(phone, '');

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
       message to the clinic's number, which is where the clinic replies from;
       the visitor only has to press send. *asterisks* render as bold there. */
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
      data.variant = new URLSearchParams(location.search).get('s') || 'generic';

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
      el.addEventListener('input', () => {
        el.closest('.field')?.classList.remove('is-bad');
        el.closest('.consent')?.classList.remove('is-bad');
      });
    });
  }

  /* ── Lazy media ───────────────────────────────────────────────────────
     Photographs below the fold load natively lazily; this handles how they
     arrive. Each shows a shimmer until it lands, then fades in — unless it
     was already cached, in which case it simply appears. */
  function lazyMedia() {
    $$('img[loading="lazy"]').forEach((img) => {
      if (img.complete && img.naturalWidth) { img.classList.add('is-cached'); return; }
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('is-cached'), { once: true });
    });

    /* The map embed brings several hundred kilobytes of Google's script, and
       loading="lazy" on an iframe still starts it well ahead of the fold in
       some browsers. So its src is held back until the section is within
       roughly a screen of the viewport. */
    const frames = $$('iframe[data-src]');
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
  reveals();
  lazyMedia();
  inViewFlags();
  counters();
  scrollChrome();
  tilt();
  magnetic();
  cursorGlow();
  chips();
  accordion();
  rail();
  prefill();
  leadForm();
  trackClicks();
})();
