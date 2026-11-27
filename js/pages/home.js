/* ==========================================================================
   Tá na Mão LP v2 · Home page interactions
   Hero composition, before/after board (GSAP Flip), bento live tiles.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.EF) return;

  function pad(n) { return String(n).padStart(2, '0'); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }

  /* Runs fn every `ms` only while `el` is on screen and the tab is visible. */
  function loopWhileVisible(EF, el, ms, fn) {
    var timer = null;
    var on = false;
    function start() { if (!timer && !document.hidden) timer = setInterval(fn, ms); }
    function stop() { clearInterval(timer); timer = null; }
    EF.inView(el, function () { on = true; start(); }, function () { on = false; stop(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (on) start(); });
  }

  /* ---------------- Hero ---------------- */
  function hero(EF) {
    var stage = document.querySelector('[data-hero-stage]');
    if (!stage) return;
    var gsap = window.gsap;
    var floats = EF.$$('.float', stage);
    var motion = EF.motionOK();

    // Intro: fragments fly in after the headline starts
    if (motion) {
      gsap.from(floats, {
        opacity: 0, y: 60, rotate: function (i) { return [-10, 12, -6, 8][i] || 0; }, scale: 0.9,
        duration: 1.3, stagger: 0.12, delay: 0.55, ease: 'ef-out', clearProps: 'opacity,scale',
      });
      // Idle float (yoyo) on inner wrappers so it composes with pointer parallax
      floats.forEach(function (f, i) {
        var inner = f.firstElementChild;
        gsap.to(inner, { y: i % 2 ? -10 : 10, duration: 3 + i * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
      // Pointer parallax by depth
      if (EF.finePointer()) {
        var heroEl = stage.closest('.hero');
        var setters = floats.map(function (f) {
          return {
            d: parseFloat(f.getAttribute('data-depth')) || 0.5,
            x: gsap.quickTo(f, 'x', { duration: 1, ease: 'power3.out' }),
            y: gsap.quickTo(f, 'y', { duration: 1, ease: 'power3.out' }),
          };
        });
        heroEl.addEventListener('pointermove', function (e) {
          var cx = e.clientX / window.innerWidth - 0.5;
          var cy = e.clientY / window.innerHeight - 0.5;
          setters.forEach(function (s) { s.x(cx * 40 * s.d); s.y(cy * 30 * s.d); });
        });
        heroEl.addEventListener('pointerleave', function () { setters.forEach(function (s) { s.x(0); s.y(0); }); });
      }
    }

    // Live data: kitchen badge cycle, timer, countdown, KPI, toast
    var badge = stage.querySelector('[data-hero-badge]');
    var action = stage.querySelector('[data-hero-action]');
    var timerEl = stage.querySelector('[data-hero-timer]');
    var countEl = stage.querySelector('[data-hero-count]');
    var kpiEl = stage.querySelector('[data-hero-kpi]');
    var toast = stage.querySelector('[data-hero-toast]');
    var states = [
      { cls: 'confirmed', label: 'Confirmado', action: 'Iniciar preparo' },
      { cls: 'preparing', label: 'Em preparo', action: 'Marcar pronto' },
      { cls: 'ready', label: 'Pronto para retirada', action: 'Chamar entregador' },
    ];
    var si = 1;
    var elapsed = 12 * 60 + 4;
    var remaining = 18 * 60;
    var kpi = 86;
    var tick = 0;

    loopWhileVisible(EF, stage, 1000, function () {
      tick++;
      elapsed++;
      remaining = remaining > 0 ? remaining - 1 : 18 * 60;
      if (timerEl) timerEl.textContent = mmss(elapsed);
      if (countEl) countEl.textContent = 'em ' + mmss(remaining);

      if (tick % 3 === 0 && badge) {
        si = (si + 1) % states.length;
        var s = states[si];
        var swap = function () {
          badge.className = 'ui-badge ui-badge--' + s.cls;
          badge.textContent = s.label;
          if (action) action.textContent = s.action;
        };
        if (motion) {
          gsap.timeline()
            .to(badge, { scale: 0.6, opacity: 0, duration: 0.18, ease: 'power2.in', onComplete: swap })
            .to(badge, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(3)' });
        } else swap();
      }

      if (tick % 7 === 0) {
        kpi++;
        if (kpiEl) kpiEl.textContent = kpi;
        if (toast && motion) {
          gsap.fromTo(toast.firstElementChild, { scale: 0.85, opacity: 0, y: 14 }, { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2.2)' });
        }
      }
    });
  }

  /* ---------------- Before / after board ---------------- */
  function chaos(EF) {
    var board = document.querySelector('[data-chaos]');
    var sw = document.querySelector('.chaos__switch');
    if (!board || !sw) return;
    var gsap = window.gsap;
    var opts = EF.$$('[data-chaos-mode]', sw);
    var live = document.querySelector('[data-chaos-live]');
    var mode = 'before';
    var auto = true;
    sw.setAttribute('data-mode', mode);

    function set(next, user) {
      if (next === mode) return;
      if (user) auto = false;
      var items = EF.$$('.chaos__item', board);
      var state = window.Flip && EF.motionOK() ? window.Flip.getState(items) : null;
      mode = next;
      sw.setAttribute('data-mode', mode);
      opts.forEach(function (o) { o.setAttribute('aria-checked', String(o.getAttribute('data-chaos-mode') === mode)); });
      board.classList.toggle('is-before', mode === 'before');
      board.classList.toggle('is-after', mode === 'after');
      if (live) live.textContent = mode === 'after' ? 'Mostrando a operação com o Tá na Mão.' : 'Mostrando a operação de hoje, sem sistema.';
      if (state) {
        window.Flip.from(state, {
          duration: 0.9, ease: 'ef-out', stagger: 0.05, absolute: false, nested: true,
          onEnter: function (els) { return gsap.fromTo(els, { opacity: 0 }, { opacity: 1 }); },
        });
        gsap.fromTo(EF.$$(mode === 'after' ? '.chaos__after' : '.chaos__before', board),
          { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, delay: 0.25 });
      }
    }

    opts.forEach(function (o) {
      o.addEventListener('click', function () { set(o.getAttribute('data-chaos-mode'), true); });
      o.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) > -1) {
          e.preventDefault();
          var next = mode === 'before' ? 'after' : 'before';
          set(next, true);
          sw.querySelector('[data-chaos-mode="' + next + '"]').focus();
        }
      });
    });

    // Play it once by itself the first time it is seen
    EF.onVisible(board, function (entry, stop) {
      stop();
      setTimeout(function () { if (auto) set('after', false); }, 1600);
    }, { threshold: 0.45 });
  }

  /* ---------------- Bento live tiles ---------------- */
  function tiles(EF) {
    var gsap = window.gsap;
    var motion = EF.motionOK();

    // ETA countdown
    var etaTile = document.querySelector('[data-tile="eta"]');
    if (etaTile) {
      var cd = etaTile.querySelector('[data-countdown]');
      var bar = etaTile.querySelector('[data-eta-bar]');
      var total = parseInt(cd.getAttribute('data-countdown'), 10);
      var left = total;
      loopWhileVisible(EF, etaTile, 1000, function () {
        left = left > 0 ? left - 1 : total;
        cd.textContent = 'faltam ' + mmss(left);
        if (bar) bar.style.width = (100 - (left / total) * 100 + 35 * (left / total)) + '%';
      });
    }

    // Kitchen ring: counts up, turns red at "20:00" (sped up 20x)
    var ringTile = document.querySelector('[data-tile="timer"]');
    if (ringTile) {
      var ring = ringTile.querySelector('[data-ring]');
      var rt = ringTile.querySelector('[data-ring-time]');
      var sec = 8 * 60;
      var C = 213.6;
      loopWhileVisible(EF, ringTile, 250, function () {
        sec += 5;
        if (sec > 23 * 60) sec = 8 * 60;
        var late = sec >= 20 * 60;
        rt.textContent = mmss(sec);
        rt.classList.toggle('is-late', late);
        ring.classList.toggle('is-late', late);
        ring.style.strokeDashoffset = String(C - (Math.min(sec, 20 * 60) / (20 * 60)) * C);
      });
    }

    // Menu options toggle
    var menuTile = document.querySelector('[data-tile="menu"]');
    if (menuTile) {
      var optsEl = EF.$$('.opt', menuTile);
      var step = 0;
      var patterns = [[1, 4], [2, 3, 4], [0, 3], [1, 3, 4]];
      loopWhileVisible(EF, menuTile, 1400, function () {
        step = (step + 1) % patterns.length;
        optsEl.forEach(function (o, i) { o.classList.toggle('is-on', patterns[step].indexOf(i) > -1); });
      });
    }

    if (!motion) return;

    // Bill split: total breaks into people on hover/visible
    var splitTile = document.querySelector('[data-tile="split"]');
    if (splitTile) {
      var people = splitTile.querySelectorAll('.split__people i');
      var playSplit = function () {
        gsap.fromTo(people, { y: -26, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(2)' });
      };
      EF.onVisible(splitTile, function (e, stop) { stop(); playSplit(); });
      splitTile.addEventListener('pointerenter', playSplit);
    }

    // Bars grow when seen / on hover
    EF.$$('[data-bars]').forEach(function (b) {
      var bars = b.querySelectorAll('i');
      var grow = function () { gsap.fromTo(bars, { scaleY: 0.05 }, { scaleY: 1, duration: 0.9, stagger: 0.05, ease: 'ef-out' }); };
      EF.onVisible(b, function (e, stop) { stop(); grow(); });
      var card = b.closest('.card, .tabs__panel');
      if (card && card.classList.contains('card')) card.addEventListener('pointerenter', grow);
    });

    // Re-grow dashboard bars when the "Dono" tab is shown again
    var tabs = document.querySelector('.roles__tabs');
    if (tabs) {
      tabs.addEventListener('tabs:change', function (e) {
        var panel = e.detail.panel;
        if (!panel) return;
        var bars = panel.querySelectorAll('[data-bars] i');
        if (bars.length) gsap.fromTo(bars, { scaleY: 0.05 }, { scaleY: 1, duration: 0.9, stagger: 0.04, ease: 'ef-out', delay: 0.1 });
        var mock = panel.querySelector('.role__mock');
        if (mock) gsap.fromTo(mock, { y: 30, rotateX: 8, opacity: 0 }, { y: 0, rotateX: 0, opacity: 1, duration: 0.8, ease: 'ef-out', transformPerspective: 900 });
      });
    }
  }

  window.EF.register('home', function (EF) {
    hero(EF);
    chaos(EF);
    tiles(EF);
  });
})();
