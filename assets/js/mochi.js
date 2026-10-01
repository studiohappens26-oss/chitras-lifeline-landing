/* ─────────────────────────────────────────────────────────────────────────
   Mochi, the clinic's mascot. Full notes in MOCHI.md.

   A soft white mochi (soft, bouncy, even: the skin people come in for) that
   keeps visitors company down the page. A vanilla port of Hapi, the Studio
   Happens companion, retuned for a clinic: Mochi is shy instead of
   uncatchable, and you squish it instead of catching it.

   Per section, [data-mochi] on the <section>:
     idle | look | happy | think
             Mochi sits in a bottom corner in that mood, hopping to the other
             side when the section changes. "look" watches the section's
             [data-mochi-target].
     peek    hides behind [data-mochi-spot="cards"] and peeks over the top
             edge of one card. If the cursor comes close it ducks, and comes
             up behind a different card.
     dock    flies over and sits on [data-mochi-dock] (the booking form),
             and watches whichever field you're filling in.
   [data-mochi-say] on a section: what Mochi says when tapped there.
   [data-mochi-floor]: fixed bars Mochi stands on (the phone dock).

   Moods: bouncing while it travels, surprised by a hard fling or a form
   error, shy when the cursor gets close, sleepy after 9 s of nothing, and
   happy when a booking goes through.

   Every face is CSS. The pose is one attribute on the SVG, and each pose
   shows its own eyes and mouth; blinks, breathing and hops run on the
   compositor. This file only moves Mochi, picks the mood and aims the eyes.

   Kept out of main.js on purpose, like motion.js: nothing here may put the
   booking form at risk. It reads the form and never writes to it.
   ───────────────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const doc = document;
  const html = doc.documentElement;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One drawing, every face. viewBox is 120 square: the body sits on y 102,
  // the eyes on y 68. See MOCHI.md for the parts.
  const ART =
    '<svg class="mochi" viewBox="0 0 120 120" data-pose="idle" aria-hidden="true" focusable="false">' +
      '<ellipse class="m-shadow" cx="60" cy="104" rx="36" ry="5"/>' +
      '<g class="m-body">' +
        '<path class="m-skin" d="M18 80C18 48 36 32 60 32s42 16 42 48c0 16-16 22-42 22S18 96 18 80z"/>' +
        '<path class="m-belly" d="M24 86c6 8 18 11 36 11s30-3 36-11c-9 5-21 7-36 7s-27-2-36-7z"/>' +
        '<path class="m-shine" d="M32 58q5-12 16-17"/>' +
        '<ellipse class="m-cheek" cx="37" cy="80" rx="7" ry="4"/>' +
        '<ellipse class="m-cheek" cx="83" cy="80" rx="7" ry="4"/>' +
        '<g class="m-face">' +
          '<g class="m-eyes m-open"><ellipse cx="48" cy="68" rx="4.5" ry="5.5"/><ellipse cx="72" cy="68" rx="4.5" ry="5.5"/>' +
            '<circle class="m-glint" cx="49.6" cy="66" r="1.6"/><circle class="m-glint" cx="73.6" cy="66" r="1.6"/></g>' +
          '<g class="m-eyes m-wide"><circle cx="48" cy="67" r="6.5"/><circle cx="72" cy="67" r="6.5"/>' +
            '<circle class="m-glint" cx="50.2" cy="64.6" r="2.2"/><circle class="m-glint" cx="74.2" cy="64.6" r="2.2"/></g>' +
          '<path class="m-eyes m-line m-happy" d="M42 70q6-8 12 0M66 70q6-8 12 0"/>' +
          '<path class="m-eyes m-line m-shut" d="M42 68q6 5 12 0M66 68q6 5 12 0"/>' +
          '<path class="m-mouth m-line m-smile" d="M55 78q5 5 10 0"/>' +
          '<path class="m-mouth m-grin" d="M53 77h14q-1 8-7 8t-7-8z"/>' +
          '<ellipse class="m-mouth m-o" cx="60" cy="80" rx="3.2" ry="4"/>' +
          '<path class="m-mouth m-line m-hmm" d="M55 80q2.5-2.5 5 0t5 0"/>' +
        '</g>' +
      '</g>' +
      '<path class="m-fx m-spark" d="M100 26l2.2 5.3 5.3 2.2-5.3 2.2L100 41l-2.2-5.3-5.3-2.2 5.3-2.2z"/>' +
      '<path class="m-fx m-drop" d="M100 44c-3 4-5 7-5 9a5 5 0 0 0 10 0c0-2-2-5-5-9z"/>' +
      '<path class="m-fx m-z" d="M90 34h8l-8 8h8"/>' +
      '<path class="m-fx m-z m-z2" d="M101 18h6l-6 6h6"/>' +
    '</svg>';

  /** Draws Mochi at the end of `el` and returns the SVG. */
  function art(el, pose) {
    el.insertAdjacentHTML('beforeend', ART);
    const svg = el.lastElementChild;
    if (pose) svg.dataset.pose = pose;
    return svg;
  }

  /** The jelly wobble. Runs on whatever wraps the drawing. */
  function squish(node, s = 1) {
    if (REDUCED || !node || !node.animate) return;
    node.animate([
      { transform: 'scale(1, 1)' },
      { transform: `scale(${1 + 0.26 * s}, ${1 - 0.3 * s})`, offset: 0.2 },
      { transform: `scale(${1 - 0.12 * s}, ${1 + 0.16 * s})`, offset: 0.45 },
      { transform: `scale(${1 + 0.05 * s}, ${1 - 0.05 * s})`, offset: 0.7 },
      { transform: 'scale(1, 1)' },
    ], { duration: 650, easing: 'ease-out' });
  }

  function track(event, params = {}) {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
    if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event, ...params });
  }

  /** One step of a critically damped spring: eases in, settles, never overshoots. */
  const damp = (x, v, to, w, dt) => {
    const d = x - to;
    const e = Math.exp(-w * dt);
    const k = (v + w * d) * dt;
    return [to + (d + k) * e, (v - w * k) * e];
  };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  // Static drawings: <span data-mochi-art="happy"></span>. Tap to squish.
  function statics() {
    doc.querySelectorAll('[data-mochi-art]').forEach((el) => {
      if (el.querySelector('.mochi')) return;
      art(el, el.dataset.mochiArt || 'idle');
      if (el.hasAttribute('data-mochi-squish')) el.addEventListener('click', () => squish(el));
    });
  }

  /* ── The companion ──────────────────────────────────────────────────── */
  function companion() {
    if (!doc.querySelector('[data-mochi]')) return;

    const desktop = matchMedia('(min-width: 861px)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let fine = finePointer.matches;

    const pal = doc.createElement('div');
    pal.className = 'mochi-pal';
    pal.setAttribute('aria-hidden', 'true');
    pal.innerHTML = '<div class="mochi-pal__show"><div class="mochi-pal__tip"><div class="mochi-pal__pop"></div></div></div>';
    const tip = pal.querySelector('.mochi-pal__tip');
    const pop = pal.querySelector('.mochi-pal__pop');
    const svg = art(pop);

    // Speech bubble. Everything in it is also on the page already, so it
    // stays out of the accessibility tree and the tab order.
    const say = doc.createElement('div');
    say.className = 'mochi-say';
    say.setAttribute('aria-hidden', 'true');
    say.hidden = true;
    say.innerHTML = '<p class="mochi-say__text"></p><a class="mochi-say__cta" href="#book" tabindex="-1">Book a consultation</a>' +
      '<button class="mochi-say__x" type="button" tabindex="-1" aria-label="Close">&times;</button>';
    const sayText = say.querySelector('.mochi-say__text');
    const sayCta = say.querySelector('.mochi-say__cta');
    doc.body.append(pal, say);

    const DEFAULT_SAY = "Hi, I'm Mochi. Soft, even, happy skin is kind of my thing. Want to book a consultation?";
    const FOOT = 0.9;           // where Mochi's feet are, as a share of its box
    const EYES = 0.57;          // eye line, same
    const SLEEP_AFTER = 9000;
    const PEEK_EDGE = 0.62;     // how much of Mochi shows over a card

    let sz = 0;
    const setSize = () => {
      sz = desktop.matches ? 76 : 62;
      pal.style.width = pal.style.height = `${sz}px`;
    };
    setSize();

    // Where Mochi is: x in px, rise 0 (tucked away) .. 1 (shown)
    let x = 0, vx = 0, rise = 1, vr = 0;
    let cur = { kind: 'lane', key: 'lane' };
    let pending = cur;
    let leaving = false;
    let side = 'right';
    let laneX = null;
    let pick = 0;
    let hiding = false, whileHidden = null, holdUntil = 0, ducked = false;

    // Docking onto the form: dk 0 = in the corner, 1 = sitting on the seat
    let dk = 0, vdk = 0, dockOn = null, lastSeat = null;

    // Mood
    let active = -2, section = null, sectionPose = 'idle';
    let lastInput = performance.now();
    let shockUntil = 0, shyUntil = 0, happyUntil = 0;
    let taps = [];
    let pose = 'idle';
    let focusField = null;
    const pointer = { x: -1e4, y: -1e4, seen: false };

    // Measured occasionally, not per frame
    let sections = [], tops = [], floors = [], floorRects = [];
    let sectionsAt = 0, floorsAt = 0;
    let footerIn = false;
    let plDone = html.dataset.pl !== 'active';

    // Last written values, so an unchanged frame writes nothing
    const shown = { tf: '', clip: '', visible: false, lx: 0, ly: 0, tip: 0 };
    let lx = 0, ly = 0, tipR = 0;
    let lastY = scrollY, lastT = performance.now(), raf = 0;

    // Bubble
    let sayOpen = false, sayY = 0, sayUntil = 0, sayW = 0, sayH = 0, sayTimer = 0;

    const laneRange = () => {
      const vw = innerWidth;
      if (!desktop.matches) return [Math.round(vw * 0.5 - sz / 2), vw - sz - 14];
      // In the margin beside the content column where it fits, so a resting
      // Mochi never sits on the copy. Mirrors .wrap: min(1280px, 100% - 2 * gut).
      const gut = Math.min(72, Math.max(20, vw * 0.05));
      const margin = (vw - Math.min(1280, vw - gut * 2)) / 2;
      const inset = Math.max(8, Math.min(28, margin - sz - 4));
      return [inset, vw - sz - inset];
    };
    const laneFor = (s) => laneRange()[s === 'left' ? 0 : 1];

    const floorTop = () => {
      const vh = innerHeight;
      let t = Infinity;
      for (const r of floorRects) if (r.height > 0 && r.top < vh && r.bottom > 0) t = Math.min(t, r.top);
      return t;
    };

    const firstRow = (spot) => {
      const kids = [...spot.children];
      if (!kids.length) return [];
      const top = kids[0].getBoundingClientRect().top;
      return kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 6);
    };

    /** Where a slot puts Mochi right now (it moves with the page). */
    const geo = (slot) => {
      const vh = innerHeight;
      if (slot.kind === 'lane') {
        const ft = floorTop();
        const lx0 = laneX ?? laneFor(side);
        // Standing on the phone dock, sinking into it to hide
        if (ft < Infinity) return { x: lx0, showY: ft - sz * FOOT, hideY: ft - sz * 0.12, clip: ft + 1 };
        return { x: lx0, showY: vh - sz - 26, hideY: vh + 8, clip: null };
      }
      const row = firstRow(slot.spot);
      const card = row[pick % Math.max(1, row.length)];
      const r = (card || slot.spot).getBoundingClientRect();
      const px = clamp(r.left + r.width * 0.5 - sz / 2, 8, innerWidth - sz - 8);
      return { x: px, showY: r.top - sz * PEEK_EDGE, hideY: r.top - sz * 0.2, clip: r.top + 1 };
    };

    /** What the active section wants, if its spot is somewhere usable. */
    const LANE = { kind: 'lane', key: 'lane' };
    const want = () => {
      if (!section || section.dataset.mochi !== 'peek') return LANE;
      const spot = section.querySelector('[data-mochi-spot]');
      if (!spot) return LANE;
      const top = firstRow(spot)[0]?.getBoundingClientRect().top ?? -1;
      if (top < 110 || top > Math.min(innerHeight, floorTop()) - sz * 0.5) return LANE;
      return { kind: 'peek', key: `peek:${active}`, spot };
    };

    const hide = (then, hold = 0) => {
      hiding = true;
      whileHidden = then;
      holdUntil = performance.now() + hold;
    };

    /** Peek from behind the card furthest from the pointer. */
    const repick = () => {
      if (cur.kind !== 'peek') return;
      const count = firstRow(cur.spot).length;
      if (count < 2) return;
      const keep = pick;
      let best = (pick + 1) % count, far = -1;
      for (let i = 0; i < count; i++) {
        if (i === keep) continue;
        pick = i;
        const g = geo(cur);
        const d = Math.hypot(g.x + sz / 2 - pointer.x, g.showY + sz / 2 - pointer.y);
        if (d > far) { far = d; best = i; }
      }
      pick = best;
    };

    const setPose = (p) => {
      if (p === pose) return;
      // A small wobble on every change of mood, so it reads as a reaction
      if (pose !== 'bounce' && p !== 'bounce') squish(pop, 0.35);
      pose = p;
      svg.dataset.pose = p;
    };

    /* ── Bubble ── */
    const openSay = (text, { cta = true, ms = 9000 } = {}) => {
      sayText.textContent = text;
      sayCta.hidden = !cta;
      say.hidden = false;
      sayW = say.offsetWidth;
      sayH = say.offsetHeight;
      sayY = scrollY;
      sayUntil = performance.now() + ms;
      clearTimeout(sayTimer);
      if (!sayOpen) requestAnimationFrame(() => say.classList.add('is-open'));
      sayOpen = true;
    };
    const closeSay = () => {
      if (!sayOpen) return;
      sayOpen = false;
      say.classList.remove('is-open');
      sayTimer = setTimeout(() => { if (!sayOpen) say.hidden = true; }, 300);
    };

    const onTap = () => {
      const now = performance.now();
      lastInput = now;
      squish(pop, 1);
      shyUntil = now + 1200;
      // Four quick squishes and it giggles
      taps = taps.filter((t) => now - t < 1600);
      taps.push(now);
      if (taps.length >= 4) {
        taps = [];
        happyUntil = now + 1600;
      }
      if (!sayOpen) {
        const docked = dk > 0.5;
        openSay(section?.dataset.mochiSay || DEFAULT_SAY, { cta: !docked });
        track('mochi_tap', { section: section?.id || 'none' });
      }
    };

    /* ── The frame ── */
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dts = Math.min(64, now - lastT) / 1000;
      lastT = now;
      const vw = innerWidth;
      const vh = innerHeight;

      const y = scrollY;
      const v = y - lastY;
      lastY = y;
      if (Math.abs(v) > 1) lastInput = now;
      if (!REDUCED && Math.abs(v) > 70) shockUntil = now + 600;

      if (now - sectionsAt > 600) {
        sectionsAt = now;
        sections = [...doc.querySelectorAll('[data-mochi]')];
        tops = sections.map((s) => s.getBoundingClientRect().top + y);
        floors = [...doc.querySelectorAll('[data-mochi-floor]')];
        floorsAt = 0;
      }
      if (now - floorsAt > 250) {
        floorsAt = now;
        floorRects = floors.map((f) => f.getBoundingClientRect());
      }

      // Which section are we in
      let idx = -1;
      for (let i = 0; i < tops.length; i++) if (tops[i] - y <= vh * 0.55) idx = i;
      if (idx !== active) {
        active = idx;
        section = idx >= 0 ? sections[idx] : null;
        const role = section?.dataset.mochi;
        sectionPose = ['idle', 'look', 'happy', 'think'].includes(role) ? role : 'idle';
        side = idx % 2 === 0 ? 'right' : 'left';
        laneX = null;
        pick = 0;
        if (sayOpen) closeSay();
      }

      // Slot changes go through hiding: tuck away here, pop up there
      const wanted = want();
      if (wanted.key !== cur.key) { leaving = true; pending = wanted; } else leaving = false;
      if (leaving && rise < 0.04) {
        cur = pending;
        leaving = false;
        x = geo(cur).x;
        vx = 0;
      }
      if (hiding && rise < 0.04) {
        if (whileHidden) {
          whileHidden();
          whileHidden = null;
          x = geo(cur).x;
          vx = 0;
        }
        let safe = now >= holdUntil;
        if (safe && fine && pointer.seen) {
          const g = geo(cur);
          safe = Math.hypot(g.x + sz / 2 - pointer.x, g.showY + sz / 2 - pointer.y) > sz * 1.6 + 60;
        }
        if (safe) { hiding = false; ducked = false; }
      }

      // Move
      const g = geo(cur);
      const lastX = x;
      if (cur.kind === 'lane' && !REDUCED) [x, vx] = damp(x, vx, g.x, 4.2, dts);
      else { x = g.x; vx = 0; }
      const riseTo = leaving || hiding ? 0 : 1;
      if (REDUCED) rise = riseTo;
      else [rise, vr] = damp(rise, vr, riseTo, riseTo < rise ? 15 : 8, dts);
      const top = g.hideY + (g.showY - g.hideY) * rise;

      // Docking onto the booking form
      const seat = section?.dataset.mochi === 'dock' ? section.querySelector('[data-mochi-dock]') : null;
      let seatR = null;
      if (seat) {
        seatR = seat.getBoundingClientRect();
        const floor = Math.min(vh, floorTop());
        // Hysteresis: easier to stay seated than to sit down
        // (the seat's top third is empty air above Mochi, so it may tuck under the nav)
        const pad = dockOn ? 0 : 30;
        const ok = seatR.width > 0 && seatR.top > 20 + pad && seatR.bottom < floor - 4 - pad;
        dockOn = ok ? seat : null;
      } else dockOn = null;
      if (dockOn) lastSeat = dockOn;
      if (REDUCED) dk = dockOn ? 1 : 0;
      else [dk, vdk] = damp(dk, vdk, dockOn ? 1 : 0, 4.6, dts);
      const docking = dk > 0.002 && lastSeat && lastSeat.isConnected;
      let fx = x, fy = top, scale = 1;
      if (docking) {
        const r = seatR && lastSeat === seat ? seatR : lastSeat.getBoundingClientRect();
        fx = x + (r.left - x) * dk;
        fy = top + (r.top - top) * dk;
        scale = 1 + (r.width / sz - 1) * dk;
      }

      const tf = `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      if (tf !== shown.tf) pal.style.transform = shown.tf = tf;
      const cp = g.clip === null || docking ? '' : `inset(-80px -80px ${Math.max(0, top + sz - g.clip).toFixed(1)}px -80px)`;
      if (cp !== shown.clip) pal.style.clipPath = shown.clip = cp;

      // Out of the way in the hero, over the footer and while a phone keyboard is up
      const vv = window.visualViewport;
      const keyboard = !desktop.matches && vv && vv.height < vh * 0.75;
      const visible = plDone && active >= 0 && ((!footerIn && !keyboard) || dk > 0.5);
      if (visible !== shown.visible) {
        shown.visible = visible;
        pal.classList.toggle('is-shown', visible);
        if (!visible) closeSay();
      }

      // Centre of the drawing on screen, for the pointer and the eyes
      const size = sz * scale;
      const cx = fx + size / 2;
      const cy = fy + size * EYES;
      const near = fine && pointer.seen ? Math.hypot(pointer.x - cx, pointer.y - cy) : Infinity;

      // Peeking: shy of the cursor, it ducks and comes up somewhere else
      if (cur.kind === 'peek' && visible && !hiding && !leaving && rise > 0.6 && near < size * 0.8 + 70) {
        ducked = true;
        hide(repick, 500);
      }

      // Mood
      const bouncing = cur.kind === 'lane' && Math.abs(vx) > 90 && dk < 0.1;
      let p;
      if (now < happyUntil) p = 'happy';
      else if (now < shyUntil) p = 'shy';
      else if (ducked && hiding) p = 'shock';
      else if (bouncing) p = 'bounce';
      else if (now < shockUntil) p = 'shock';
      else if (now - lastInput > SLEEP_AFTER) p = 'sleepy';
      else if (near < size * 0.6 + 60) p = 'shy';
      else if (dk > 0.5) p = focusField ? 'look' : 'happy';
      else if (cur.kind === 'peek') p = 'look';
      else p = sectionPose;
      // Idle Mochi opens its eyes when the cursor comes over to say hello
      if (p === 'idle' && near < 280) p = 'look';
      setPose(p);

      // Eyes: a focused form field, then the section's target, then the cursor
      let aim = null;
      if (dk > 0.5 && focusField) aim = focusField;
      else if (p === 'look' && sectionPose === 'look') aim = section.querySelector('[data-mochi-target]');
      let tx = 0, ty = 0;
      if (p === 'think') { tx = -4; ty = -3.5; }
      else if (p === 'look' || p === 'shy') {
        let px, py;
        if (aim) {
          const r = aim.getBoundingClientRect();
          px = r.left + r.width / 2;
          py = r.top + r.height / 2;
        } else if (fine && pointer.seen) { px = pointer.x; py = pointer.y; }
        if (px !== undefined) {
          const dx = px - cx, dy = py - cy;
          const dd = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, dd / 200);
          tx = (dx / dd) * 4 * k;
          ty = (dy / dd) * 3.2 * k;
        }
      }
      const ease = REDUCED ? 1 : Math.min(1, dts * 10);
      lx += (tx - lx) * ease;
      ly += (ty - ly) * ease;
      if (Math.abs(lx - shown.lx) > 0.05 || Math.abs(ly - shown.ly) > 0.05) {
        shown.lx = lx; shown.ly = ly;
        svg.style.setProperty('--lx', `${lx.toFixed(2)}px`);
        svg.style.setProperty('--ly', `${ly.toFixed(2)}px`);
      }

      // Scrolling tips it over a little; it settles when you stop
      if (!REDUCED) {
        const want2 = clamp(v * 0.35, -12, 12) * (1 - Math.min(1, dk * 1.5));
        tipR += (want2 - tipR) * Math.min(1, dts * 8);
        if (Math.abs(tipR - shown.tip) > 0.1) {
          shown.tip = tipR;
          tip.style.transform = `rotate(${tipR.toFixed(2)}deg)`;
        }
      }

      // Bubble follows Mochi, above it, kept on screen
      if (sayOpen) {
        if (now > sayUntil || Math.abs(y - sayY) > vh * 0.8) closeSay();
        const bx = clamp(cx - sayW / 2, 12, vw - sayW - 12);
        const by = Math.max(12, fy - sayH - 6);
        say.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
        say.style.setProperty('--tail', `${clamp(cx - bx, 22, sayW - 22).toFixed(1)}px`);
      }
    };

    /* ── Wiring ── */
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) footerIn = e.isIntersecting;
    });
    const footer = doc.querySelector('.foot');
    if (footer) io.observe(footer);

    if (!plDone) doc.addEventListener('cl:preloader-exit', () => { plDone = true; }, { once: true });
    // If the preloader never announces its exit, don't stay hidden forever
    setTimeout(() => { plDone = true; }, 7000);

    addEventListener('pointermove', (e) => {
      lastInput = performance.now();
      if (e.pointerType !== 'mouse') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
    }, { passive: true });
    addEventListener('touchstart', () => { lastInput = performance.now(); }, { passive: true });
    addEventListener('keydown', (e) => {
      lastInput = performance.now();
      if (e.key === 'Escape') closeSay();
    });
    addEventListener('resize', () => {
      setSize();
      fine = finePointer.matches;
      laneX = null;
      x = geo(cur).x;
      sectionsAt = 0;
    });

    pop.addEventListener('click', onTap);
    say.querySelector('.mochi-say__x').addEventListener('click', closeSay);
    sayCta.addEventListener('click', () => { track('book_mochi'); closeSay(); });
    doc.addEventListener('pointerdown', (e) => {
      if (sayOpen && !say.contains(e.target) && !pop.contains(e.target)) closeSay();
    });

    // The booking form: watch the field being filled in, react to the result.
    // main.js handles the submit first (it loads first) and has already
    // marked the status line by the time this listener runs.
    const form = doc.getElementById('lead-form');
    if (form) {
      form.addEventListener('focusin', (e) => { focusField = e.target.closest('.field, .consent') || e.target; });
      form.addEventListener('focusout', () => { focusField = null; });
      form.addEventListener('submit', () => {
        const status = form.querySelector('.form__status');
        const now = performance.now();
        lastInput = now;
        if (status?.classList.contains('is-ok')) {
          happyUntil = now + 4500;
          openSay("Now press send in WhatsApp. We'll reply to confirm your slot.", { cta: false, ms: 7000 });
        } else if (status?.classList.contains('is-bad')) {
          shockUntil = now + 1400;
          focusField = form.querySelector('.is-bad');
        }
      });
    }

    // Pause with the tab
    doc.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(raf);
      if (!doc.hidden) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });

    x = geo(cur).x;
    html.classList.add('mochi-live');
    raf = requestAnimationFrame(frame);
  }

  window.Mochi = { art, squish };
  statics();
  try { companion(); } catch (e) { console.error(e); }
})();
