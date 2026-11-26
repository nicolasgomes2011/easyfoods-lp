/* ==========================================================================
   EasyFoods LP v2 · Core runtime
   Classic deferred script (no ES modules) so the site also works when opened
   straight from disk (file://). Load order on every page:
     gsap.min.js → GSAP plugins → js/config.js → js/core.js → feature/page scripts
   All of them use `defer`, so they execute in order before DOMContentLoaded,
   which is when EF boots.

   Public API (window.EF):
     EF.register(pageName, fn)          page script; runs when <body data-page="pageName">
     EF.use(selector, fn, {idle})       feature module; fn(el, EF) for each match
     EF.motionOK() / EF.finePointer()   environment checks
     EF.onVisible(el, cb, opts)         IntersectionObserver helper (cb(entry, stop))
     EF.inView(el, onEnter, onLeave)    continuous visibility (for pausing loops)
     EF.splitIntro(el, {delay})         SplitText line/char reveal for one element
     EF.toast(message, type)            accessible toast ('info' | 'success' | 'error')
     EF.whatsappURL(text) / EF.config   contact helpers
     EF.skipAutoIntro = true            set inside a page fn to run your own intro
   Events dispatched on document: 'ef:ready', 'tabs:change' (on the tabs root),
   'lead:success' (on the form root).
   ========================================================================== */
(function () {
  'use strict';

  var EF = (window.EF = window.EF || {});
  var doc = document;
  var root = doc.documentElement;
  var CONFIG = (EF.config = window.EF_CONFIG || {});
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(hover: hover) and (pointer: fine)');

  EF.pages = EF.pages || {};
  EF.uses = EF.uses || [];
  var booted = false;
  // Registrations made after boot (async/late scripts) run immediately.
  EF.register = function (name, fn) {
    EF.pages[name] = fn;
    if (booted && doc.body.getAttribute('data-page') === name) safe('page ' + name, function () { fn(EF); });
  };
  EF.use = function (selector, fn, opts) {
    var u = { selector: selector, fn: fn, opts: opts || {} };
    EF.uses.push(u);
    if (booted) runUse(u);
  };
  EF.motionOK = function () { return !reduceMQ.matches && !!window.gsap; };
  EF.finePointer = function () { return fineMQ.matches; };

  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  EF.$ = $;
  EF.$$ = $$;

  function safe(label, fn) {
    try { fn(); } catch (err) { console.error('[EasyFoods] ' + label + ' failed:', err); }
  }

  /* ---------------------------------------------------------------------
     GSAP setup
     --------------------------------------------------------------------- */
  function setupGSAP() {
    var gsap = window.gsap;
    if (!gsap) return;
    [
      'CustomEase', 'SplitText', 'Flip', 'DrawSVGPlugin', 'MotionPathPlugin', 'MorphSVGPlugin',
      'ScrambleTextPlugin', 'TextPlugin', 'Draggable', 'InertiaPlugin', 'Observer', 'Physics2DPlugin', 'ScrollTrigger',
    ].forEach(function (name) {
      if (window[name]) gsap.registerPlugin(window[name]);
    });
    if (window.CustomEase) {
      window.CustomEase.create('ef-out', '0.16,1,0.3,1');
      window.CustomEase.create('ef-in-out', '0.65,0,0.35,1');
      window.CustomEase.create('ef-spring', '0.34,1.56,0.64,1');
      gsap.defaults({ ease: 'ef-out', duration: 0.8 });
    } else {
      gsap.defaults({ ease: 'expo.out', duration: 0.8 });
    }
    EF.gsap = gsap;
  }

  /* ---------------------------------------------------------------------
     Visibility helpers
     --------------------------------------------------------------------- */
  // Safety net for fast flings / anchor jumps: an element can go from below
  // the viewport to above it between two frames without ever "intersecting".
  // Pending one-shot callbacks also fire once their element has been passed.
  var pending = [];
  var sweepQueued = false;
  function sweep() {
    sweepQueued = false;
    pending = pending.filter(function (p) {
      if (p.done) return false;
      if (p.el.getBoundingClientRect().top < window.innerHeight) { p.fire(); return false; }
      return true;
    });
  }
  window.addEventListener('scroll', function () {
    if (pending.length && !sweepQueued) { sweepQueued = true; requestAnimationFrame(sweep); }
  }, { passive: true });

  EF.onVisible = function (el, cb, opts) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb({ isIntersecting: true, target: el }, function () {}); return; }
    var p = { el: el, done: false };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) cb(entry, function () { p.done = true; io.unobserve(entry.target); });
      });
    }, opts || { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    p.fire = function () {
      if (p.done) return;
      cb({ isIntersecting: true, target: el, boundingClientRect: el.getBoundingClientRect() }, function () { p.done = true; io.unobserve(el); });
    };
    pending.push(p);
    io.observe(el);
    return io;
  };

  EF.inView = function (el, onEnter, onLeave, opts) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { onEnter && onEnter(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) onEnter && onEnter(entry);
        else onLeave && onLeave(entry);
      });
    }, opts || { threshold: 0 });
    io.observe(el);
    return io;
  };

  /* ---------------------------------------------------------------------
     Contact links (single source: js/config.js)
     --------------------------------------------------------------------- */
  EF.whatsappURL = function (text) {
    return 'https://wa.me/' + (CONFIG.whatsapp || '') + '?text=' + encodeURIComponent(text || CONFIG.whatsappMessage || '');
  };

  function initContactLinks() {
    $$('[data-whatsapp]').forEach(function (a) {
      a.href = EF.whatsappURL(a.getAttribute('data-whatsapp') || '');
      a.target = '_blank';
      a.rel = 'noopener';
    });
    $$('[data-email]').forEach(function (a) {
      if (!CONFIG.email) return;
      a.href = 'mailto:' + CONFIG.email + (a.getAttribute('data-email') ? '?subject=' + encodeURIComponent(a.getAttribute('data-email')) : '');
      if (a.hasAttribute('data-email-text')) a.textContent = CONFIG.email;
    });
    $$('[data-whatsapp-text]').forEach(function (el) {
      var n = String(CONFIG.whatsapp || '');
      // 55 11 91234-5678 → +55 (11) 91234-5678
      el.textContent = n.length >= 12 ? '+' + n.slice(0, 2) + ' (' + n.slice(2, 4) + ') ' + n.slice(4, n.length - 4) + '-' + n.slice(-4) : n;
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------------------------------------------------------------------
     Header, active nav, mobile menu, dock
     --------------------------------------------------------------------- */
  function initHeader() {
    var header = $('[data-header]');
    if (!header) return;
    var ticking = false;
    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function initActiveNav() {
    var page = doc.body.getAttribute('data-page');
    if (!page) return;
    $$('[data-nav="' + page + '"]').forEach(function (a) { a.setAttribute('aria-current', 'page'); });
  }

  function initMenu() {
    var btn = $('[data-menu-toggle]');
    var menu = btn && doc.getElementById(btn.getAttribute('aria-controls'));
    var header = $('[data-header]');
    if (!btn || !menu) return;
    var gsap = window.gsap;
    var open = false;
    var lastFocus = null;

    function focusables() {
      return [btn].concat($$('a[href], button:not([disabled])', menu));
    }

    function onKey(e) {
      if (e.key === 'Escape') { close(); btn.focus(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function openMenu() {
      open = true;
      lastFocus = doc.activeElement;
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Fechar menu');
      header && header.classList.add('menu-open');
      doc.body.classList.add('is-locked');
      doc.addEventListener('keydown', onKey);
      if (EF.motionOK()) {
        gsap.killTweensOf(menu);
        gsap.fromTo(menu, { clipPath: 'circle(0% at calc(100% - 40px) 32px)' }, { clipPath: 'circle(150% at calc(100% - 40px) 32px)', duration: 0.7, ease: 'ef-in-out' });
        gsap.fromTo($$('.mobile-menu__link', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.06, delay: 0.15 });
        gsap.fromTo($$('.mobile-menu__footer > *', menu), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, delay: 0.35 });
      }
      var firstLink = $('.mobile-menu__link', menu);
      firstLink && setTimeout(function () { firstLink.focus({ preventScroll: true }); }, 60);
    }

    function close() {
      if (!open) return;
      open = false;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Abrir menu');
      doc.removeEventListener('keydown', onKey);
      var done = function () {
        menu.hidden = true;
        header && header.classList.remove('menu-open');
        doc.body.classList.remove('is-locked');
      };
      if (EF.motionOK()) {
        gsap.to(menu, { clipPath: 'circle(0% at calc(100% - 40px) 32px)', duration: 0.5, ease: 'ef-in-out', onComplete: done });
      } else done();
      if (lastFocus && lastFocus !== btn) lastFocus.focus && lastFocus.focus({ preventScroll: true });
    }

    btn.addEventListener('click', function () { open ? close() : openMenu(); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', close); });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) close(); });
    EF.closeMenu = close;
  }

  function initDock() {
    var dock = $('[data-dock]');
    if (!dock) return;
    var trigger = $('[data-hero-cta]');
    var hiders = $$('[data-dock-hide]');
    var pastHero = !trigger;
    var hiddenBy = 0;
    var render = function () { dock.classList.toggle('is-visible', pastHero && hiddenBy === 0); };
    if (trigger) {
      EF.inView(trigger, function () { pastHero = false; render(); }, function (entry) {
        // only count as "past" when the trigger left through the top of the viewport
        pastHero = entry.boundingClientRect.top < 0;
        render();
      });
    } else {
      var onScroll = function () { pastHero = window.scrollY > 480; render(); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    hiders.forEach(function (el) {
      var visible = false;
      EF.inView(el, function () { if (!visible) { visible = true; hiddenBy++; render(); } }, function () { if (visible) { visible = false; hiddenBy--; render(); } });
    });
    render();
  }

  /* ---------------------------------------------------------------------
     Pointer effects: magnetic, spotlight, tilt
     --------------------------------------------------------------------- */
  function initMagnetic() {
    if (!EF.motionOK() || !EF.finePointer()) return;
    var gsap = window.gsap;
    $$('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.35;
      var label = $('.btn__label', el);
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      var lx = label && gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3.out' });
      var ly = label && gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        xTo(dx * strength);
        yTo(dy * strength);
        if (label) { lx(dx * strength * 0.45); ly(dy * strength * 0.45); }
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' });
        label && gsap.to(label, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' });
      });
    });
  }

  function setSpot(card, e) {
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }

  function initSpotlight() {
    if (!EF.finePointer()) return;
    $$('[data-spotlight]').forEach(function (group) {
      var cards = $$('.spotlight', group);
      group.addEventListener('pointermove', function (e) {
        cards.forEach(function (c) { setSpot(c, e); c.style.setProperty('--spot', '1'); });
      });
      group.addEventListener('pointerleave', function () {
        cards.forEach(function (c) { c.style.setProperty('--spot', '0'); });
      });
    });
    $$('.spotlight').forEach(function (card) {
      if (card.closest('[data-spotlight]')) return;
      card.addEventListener('pointermove', function (e) { setSpot(card, e); });
      card.addEventListener('pointerenter', function () { card.style.setProperty('--spot', '1'); });
      card.addEventListener('pointerleave', function () { card.style.setProperty('--spot', '0'); });
    });
  }

  function initTilt() {
    if (!EF.motionOK() || !EF.finePointer()) return;
    var gsap = window.gsap;
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      gsap.set(el, { transformPerspective: 1000, transformStyle: 'preserve-3d' });
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3.out' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * max * 2);
        rx(-py * max * 2);
      });
      el.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
  }

  /* ---------------------------------------------------------------------
     Intro choreography: [data-split] headings + [data-intro] elements
     --------------------------------------------------------------------- */
  EF.splitIntro = function (el, opts) {
    opts = opts || {};
    var gsap = window.gsap;
    var delay = opts.delay != null ? opts.delay : parseFloat(el.getAttribute('data-split-delay') || '0');
    if (!EF.motionOK() || !window.SplitText) { el.style.visibility = 'visible'; return null; }
    var mode = el.getAttribute('data-split') || 'lines';
    var split = window.SplitText.create(el, {
      type: mode === 'chars' ? 'chars,words,lines' : mode === 'words' ? 'words,lines' : 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: function (self) {
        gsap.set(el, { visibility: 'visible' });
        var targets = mode === 'chars' ? self.chars : mode === 'words' ? self.words : self.lines;
        return gsap.from(targets, {
          yPercent: 118,
          rotate: mode === 'lines' ? 0 : 6,
          duration: mode === 'chars' ? 1 : 1.15,
          ease: 'ef-out',
          stagger: mode === 'chars' ? 0.016 : mode === 'words' ? 0.045 : 0.1,
          delay: delay,
        });
      },
    });
    return split;
  };

  EF.intro = function () {
    var gsap = window.gsap;
    var splits = $$('[data-split]');
    var intros = $$('[data-intro]');
    if (!EF.motionOK()) {
      splits.forEach(function (el) { el.style.visibility = 'visible'; });
      intros.forEach(function (el) { el.style.opacity = 1; });
      return;
    }
    splits.forEach(function (el) {
      // headings below the fold animate when they enter; above the fold right away
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) EF.splitIntro(el);
      else EF.onVisible(el, function (entry, stop) { stop(); EF.splitIntro(el, { delay: 0 }); });
    });
    intros.sort(function (a, b) {
      return (parseFloat(a.getAttribute('data-intro')) || 0) - (parseFloat(b.getAttribute('data-intro')) || 0);
    });
    intros.forEach(function (el) {
      var order = parseFloat(el.getAttribute('data-intro')) || 0;
      gsap.fromTo(el, { opacity: 0, y: 26, filter: 'blur(6px)' }, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, delay: 0.25 + order * 0.12,
        clearProps: 'filter',
      });
    });
  };

  /* ---------------------------------------------------------------------
     Subtle reveal on enter (NOT scroll-driven: fires once, short)
     data-reveal = "" | "stagger" | "scale"
     --------------------------------------------------------------------- */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (!els.length) return;
    if (!EF.motionOK()) { els.forEach(function (el) { el.style.opacity = 1; }); return; }
    var gsap = window.gsap;
    els.forEach(function (el) {
      var kind = el.getAttribute('data-reveal');
      if (kind === 'stagger') {
        gsap.set(el, { opacity: 1 });
        gsap.set(el.children, { opacity: 0, y: 28 });
      } else {
        gsap.set(el, { y: kind === 'scale' ? 0 : 28, scale: kind === 'scale' ? 0.96 : 1 });
      }
      EF.onVisible(el, function (entry, stop) {
        stop();
        if (kind === 'stagger') {
          gsap.to(el.children, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 });
        } else {
          gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: 1 });
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Counters: <span data-count-to="5">5</span> (text is the no-JS value)
     --------------------------------------------------------------------- */
  function initCounters() {
    var els = $$('[data-count-to]');
    if (!els.length || !EF.motionOK()) return;
    var gsap = window.gsap;
    els.forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count-to'));
      var obj = { v: 0 };
      el.textContent = '0';
      EF.onVisible(el, function (entry, stop) {
        stop();
        gsap.to(obj, {
          v: to, duration: 1.6, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('pt-BR'); },
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     FAQ: <details class="faq__item"> enhanced with smooth height animation.
     Add data-accordion="single" on .faq to keep only one open.
     --------------------------------------------------------------------- */
  function initFAQ() {
    $$('.faq').forEach(function (group) {
      var single = group.getAttribute('data-accordion') === 'single';
      var items = $$('details.faq__item', group);
      items.forEach(function (item) {
        var summary = $('summary', item);
        var answer = $('.faq__a', item);
        if (!summary || !answer) return;
        summary.addEventListener('click', function (e) {
          if (!EF.motionOK()) {
            if (single && !item.open) items.forEach(function (o) { if (o !== item) o.open = false; });
            return;
          }
          e.preventDefault();
          var gsap = window.gsap;
          if (item.open) {
            gsap.to(answer, { height: 0, opacity: 0, duration: 0.45, ease: 'ef-in-out', onComplete: function () {
              item.open = false; gsap.set(answer, { clearProps: 'height,opacity' });
            } });
          } else {
            if (single) items.forEach(function (o) { if (o !== item && o.open) o.querySelector('summary').click(); });
            item.open = true;
            gsap.fromTo(answer, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'ef-out', clearProps: 'height' });
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Tabs: [data-tabs] > .tabs__list[role=tablist] > .tabs__tab[role=tab]
           + .tabs__panel[role=tabpanel]. Optional data-tabs-autoplay="7000".
     --------------------------------------------------------------------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (rootEl) {
      var list = $('[role="tablist"]', rootEl);
      var tabs = $$('[role="tab"]', rootEl);
      var panels = tabs.map(function (t) { return doc.getElementById(t.getAttribute('aria-controls')); });
      var indicator = $('.tabs__indicator', rootEl);
      var gsap = window.gsap;
      var current = Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));
      var autoplay = parseInt(rootEl.getAttribute('data-tabs-autoplay') || '0', 10);
      var timer = null;
      var paused = false;
      var visible = false;

      function moveIndicator(animate) {
        if (!indicator || !list) return;
        var t = tabs[current];
        var props = { x: t.offsetLeft - 5, width: t.offsetWidth };
        if (gsap && animate && EF.motionOK()) gsap.to(indicator, Object.assign({ duration: 0.55, ease: 'ef-out' }, props));
        else if (gsap) gsap.set(indicator, props);
        else { indicator.style.transform = 'translateX(' + props.x + 'px)'; indicator.style.width = props.width + 'px'; }
      }

      function select(i, focus, fromUser) {
        if (i === current) return;
        var prevPanel = panels[current];
        tabs[current].setAttribute('aria-selected', 'false');
        tabs[current].tabIndex = -1;
        current = (i + tabs.length) % tabs.length;
        var tab = tabs[current];
        var panel = panels[current];
        tab.setAttribute('aria-selected', 'true');
        tab.tabIndex = 0;
        if (focus) tab.focus();
        if (tab.scrollIntoView && list.scrollWidth > list.clientWidth) {
          list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: EF.motionOK() ? 'smooth' : 'auto' });
        }
        moveIndicator(true);
        if (prevPanel) prevPanel.hidden = true;
        if (panel) {
          panel.hidden = false;
          if (EF.motionOK()) {
            gsap.fromTo(panel, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, clearProps: 'filter' });
          }
        }
        rootEl.dispatchEvent(new CustomEvent('tabs:change', { detail: { index: current, tab: tab, panel: panel, fromUser: !!fromUser } }));
        if (fromUser) stopAuto();
      }

      function stopAuto() { if (timer) { clearInterval(timer); timer = null; } autoplay = 0; rootEl.classList.remove('is-autoplay'); }
      function tick() { if (!paused && visible) select(current + 1, false, false); }

      tabs.forEach(function (tab, i) {
        tab.tabIndex = i === current ? 0 : -1;
        tab.addEventListener('click', function () { select(i, false, true); });
        tab.addEventListener('keydown', function (e) {
          var k = e.key;
          if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(current + 1, true, true); }
          else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(current - 1, true, true); }
          else if (k === 'Home') { e.preventDefault(); select(0, true, true); }
          else if (k === 'End') { e.preventDefault(); select(tabs.length - 1, true, true); }
        });
      });
      panels.forEach(function (p, i) { if (p) p.hidden = i !== current; });
      rootEl.classList.add('is-ready');
      moveIndicator(false);
      window.addEventListener('resize', function () { moveIndicator(false); });
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { moveIndicator(false); });

      if (autoplay && EF.motionOK()) {
        rootEl.classList.add('is-autoplay');
        rootEl.addEventListener('pointerenter', function () { paused = true; });
        rootEl.addEventListener('pointerleave', function () { paused = false; });
        rootEl.addEventListener('focusin', function () { paused = true; });
        rootEl.addEventListener('focusout', function () { paused = false; });
        EF.inView(rootEl, function () { visible = true; }, function () { visible = false; }, { threshold: 0.35 });
        timer = setInterval(tick, autoplay);
      }
      rootEl.efTabs = { select: function (i) { select(i, false, true); } };
    });
  }

  /* ---------------------------------------------------------------------
     Toasts
     --------------------------------------------------------------------- */
  var toastRegion = null;
  EF.toast = function (message, type) {
    if (!toastRegion) {
      toastRegion = doc.createElement('div');
      toastRegion.className = 'toast-region';
      toastRegion.setAttribute('role', 'status');
      toastRegion.setAttribute('aria-live', 'polite');
      doc.body.appendChild(toastRegion);
    }
    var t = doc.createElement('div');
    t.className = 'toast toast--' + (type || 'info');
    t.innerHTML = '<span class="toast__dot" aria-hidden="true"></span><span></span>';
    t.lastChild.textContent = message;
    toastRegion.appendChild(t);
    var gsap = window.gsap;
    var remove = function () { t.remove(); };
    if (gsap && EF.motionOK()) {
      gsap.fromTo(t, { y: 24, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'ef-spring' });
      gsap.to(t, { y: 12, opacity: 0, duration: 0.4, delay: 4.2, onComplete: remove });
    } else setTimeout(remove, 4600);
  };

  /* ---------------------------------------------------------------------
     Lead forms: <form data-lead-form> (fields: nome, restaurante, email,
     telefone, operacao, mensagem, consentimento)
     --------------------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fieldOf(input) { return input.closest('.field') || input.closest('.check'); }

  function validateInput(input) {
    var v = (input.type === 'checkbox' ? (input.checked ? 'on' : '') : input.value || '').trim();
    var msg = '';
    if (input.required && !v) {
      msg = input.type === 'checkbox' ? 'Precisamos do seu aceite para entrar em contato.' : 'Preencha este campo.';
    } else if (v && input.type === 'email' && !EMAIL_RE.test(v)) {
      msg = 'Confira o e-mail: algo como nome@restaurante.com.br.';
    } else if (v && input.type === 'tel' && v.replace(/\D/g, '').length < 10) {
      msg = 'Informe o telefone com DDD.';
    }
    var field = fieldOf(input);
    var out = field && $('.field__msg', field);
    if (field) {
      field.classList.toggle('is-invalid', !!msg);
      field.classList.toggle('is-valid', !msg && !!v && input.type !== 'checkbox');
    }
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (out) out.textContent = msg;
    return !msg;
  }

  function maskPhone(input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '').slice(0, 11);
      var out = d;
      if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      input.value = out;
    });
  }

  function ticketHTML(data) {
    var code = 'DEMO-' + String(Date.now()).slice(-4);
    var esc = function (s) { var d = doc.createElement('div'); d.textContent = s || ''; return d.innerHTML; };
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    return (
      '<div class="lead-success">' +
        '<div class="lead-ticket" data-ticket>' +
          '<div class="lead-ticket__head"><strong>EasyFoods</strong><span>Comanda #' + code + ' · ' + hh + '</span></div>' +
          '<div class="lead-ticket__row"><span>Cliente</span><span>' + esc(data.nome) + '</span></div>' +
          '<div class="lead-ticket__row"><span>Restaurante</span><span>' + esc(data.restaurante) + '</span></div>' +
          '<div class="lead-ticket__row"><span>Pedido</span><span>1x Demonstração</span></div>' +
          '<div class="lead-ticket__row"><span>Observação</span><span>sem pressa, com carinho</span></div>' +
          '<div style="text-align:center"><span class="lead-ticket__stamp" data-stamp>RECEBIDO</span></div>' +
          '<p class="lead-ticket__msg">Seu pedido entrou na fila. A gente responde em até 1 dia útil para marcar a demonstração.</p>' +
        '</div>' +
        '<a class="btn btn--ghost" href="index.html"><span class="btn__label">Voltar para o início</span></a>' +
      '</div>'
    );
  }

  function showSuccess(form, data) {
    var host = form.closest('[data-lead-host]') || form;
    host.innerHTML = ticketHTML(data);
    var ticket = $('[data-ticket]', host);
    var stamp = $('[data-stamp]', host);
    var gsap = window.gsap;
    if (gsap && EF.motionOK()) {
      var tl = gsap.timeline();
      tl.fromTo(ticket, { clipPath: 'inset(0 0 100% 0)', y: -30 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.5, ease: 'steps(16)' })
        .fromTo(stamp, { scale: 2.6, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.45, ease: 'back.out(3)' }, '+=0.1')
        .fromTo(ticket, { x: -4 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }, '<0.05');
    }
    host.setAttribute('tabindex', '-1');
    host.focus({ preventScroll: true });
    form.dispatchEvent(new CustomEvent('lead:success', { bubbles: true, detail: data }));
  }

  function initForms() {
    $$('form[data-lead-form]').forEach(function (form) {
      form.setAttribute('novalidate', '');
      var inputs = $$('input, textarea, select', form).filter(function (i) { return i.name; });
      var status = $('.form__status', form);
      var submit = $('button[type="submit"]', form);
      var touched = false;

      $$('input[type="tel"]', form).forEach(maskPhone);
      inputs.forEach(function (input) {
        input.addEventListener('blur', function () { if (input.value || touched) validateInput(input); });
        input.addEventListener('input', function () { if (touched || fieldOf(input) && fieldOf(input).classList.contains('is-invalid')) validateInput(input); });
        input.addEventListener('change', function () { if (input.type === 'checkbox') validateInput(input); });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        touched = true;
        var invalid = inputs.filter(function (i) { return !validateInput(i); });
        if (status) { status.className = 'form__status'; status.textContent = ''; }
        if (invalid.length) {
          if (status) { status.classList.add('is-error'); status.textContent = 'Faltou pouco: confira os campos destacados.'; }
          invalid[0].focus();
          if (window.gsap && EF.motionOK()) {
            window.gsap.fromTo(invalid.map(fieldOf).filter(Boolean), { x: 0 }, { keyframes: { x: [-8, 8, -6, 6, -3, 0] }, duration: 0.45, ease: 'none' });
          }
          return;
        }
        var data = {};
        inputs.forEach(function (i) { data[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
        data.origem = doc.body.getAttribute('data-page') || location.pathname;
        data.enviadoEm = new Date().toISOString();

        if (!CONFIG.formEndpoint) {
          console.warn('[EasyFoods] EF_CONFIG.formEndpoint está vazio: abrindo o WhatsApp com a mensagem pronta.');
          var text = 'Olá! Quero agendar uma demonstração do EasyFoods.\n\n' +
            'Nome: ' + (data.nome || '') + '\n' +
            'Restaurante: ' + (data.restaurante || '') + '\n' +
            (data.operacao ? 'Operação: ' + data.operacao + '\n' : '') +
            'E-mail: ' + (data.email || '') + '\n' +
            (data.telefone ? 'Telefone: ' + data.telefone + '\n' : '') +
            (data.mensagem ? '\n' + data.mensagem : '');
          var win = window.open(EF.whatsappURL(text), '_blank', 'noopener');
          if (status) {
            status.classList.add('is-info');
            status.innerHTML = '';
            var msg = doc.createElement('span');
            msg.textContent = win ? 'Abrimos o WhatsApp com a sua mensagem pronta. É só enviar. ' : 'Seu navegador bloqueou a nova aba. ';
            var wa = doc.createElement('a');
            wa.href = EF.whatsappURL(text); wa.target = '_blank'; wa.rel = 'noopener'; wa.className = 'link';
            wa.textContent = 'Abrir WhatsApp';
            var mail = doc.createElement('a');
            mail.href = 'mailto:' + (CONFIG.email || '') + '?subject=' + encodeURIComponent('Demonstração EasyFoods') + '&body=' + encodeURIComponent(text);
            mail.className = 'link'; mail.textContent = 'enviar por e-mail';
            status.appendChild(msg); status.appendChild(wa); status.appendChild(doc.createTextNode(' ou ')); status.appendChild(mail);
          }
          return;
        }

        submit && submit.setAttribute('data-state', 'sending');
        var ctrl = 'AbortController' in window ? new AbortController() : null;
        var to = setTimeout(function () { ctrl && ctrl.abort(); }, 12000);
        fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
          signal: ctrl ? ctrl.signal : undefined,
        }).then(function (res) {
          clearTimeout(to);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          showSuccess(form, data);
        }).catch(function (err) {
          clearTimeout(to);
          console.error('[EasyFoods] lead form error:', err);
          submit && submit.removeAttribute('data-state');
          if (status) {
            status.classList.add('is-error');
            status.textContent = 'Não conseguimos enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.';
          }
          EF.toast('Falha no envio. Seus dados continuam no formulário.', 'error');
        });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Page transitions. Browsers with cross-document View Transitions use the
     CSS in base.css. Others get an ember curtain wipe (fast, 300ms).
     --------------------------------------------------------------------- */
  function initCurtain() {
    var supportsVT = 'onpagereveal' in window;
    if (supportsVT || !EF.motionOK() || location.protocol === 'file:') return;
    var gsap = window.gsap;
    var curtain = doc.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(curtain);

    var KEY = 'ef-curtain';
    try {
      if (sessionStorage.getItem(KEY)) {
        sessionStorage.removeItem(KEY);
        gsap.set(curtain, { scaleY: 1, transformOrigin: 'top' });
        gsap.to(curtain, { scaleY: 0, duration: 0.55, ease: 'ef-in-out', delay: 0.05 });
      }
    } catch (e) { /* storage blocked: no-op */ }

    window.addEventListener('pageshow', function (e) { if (e.persisted) gsap.set(curtain, { scaleY: 0 }); });

    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download') || a.getAttribute('href').charAt(0) === '#') return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      try { sessionStorage.setItem(KEY, '1'); } catch (err) {}
      gsap.set(curtain, { transformOrigin: 'bottom' });
      gsap.to(curtain, { scaleY: 1, duration: 0.32, ease: 'ef-in-out', onComplete: function () { location.href = url.href; } });
    });
  }

  /* ---------------------------------------------------------------------
     Feature modules registered with EF.use()
     --------------------------------------------------------------------- */
  function runUse(u) {
    var els = $$(u.selector);
    if (!els.length) return;
    var run = function () { els.forEach(function (el) { safe(u.selector, function () { u.fn(el, EF); }); }); };
    if (u.opts.idle) {
      if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1200 });
      else setTimeout(run, 300);
    } else run();
  }

  function runUses() { EF.uses.forEach(runUse); }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  function boot() {
    clearTimeout(window.__efFailsafe);
    setupGSAP();
    if (!EF.motionOK()) root.classList.remove('motion-ok');

    safe('contact links', initContactLinks);
    safe('header', initHeader);
    safe('active nav', initActiveNav);
    safe('menu', initMenu);
    safe('dock', initDock);
    safe('magnetic', initMagnetic);
    safe('spotlight', initSpotlight);
    safe('tilt', initTilt);
    safe('faq', initFAQ);
    safe('tabs', initTabs);
    safe('forms', initForms);
    safe('curtain', initCurtain);
    safe('modules', runUses);

    var page = doc.body.getAttribute('data-page');
    if (page && EF.pages[page]) safe('page ' + page, function () { EF.pages[page](EF); });

    if (!EF.skipAutoIntro) safe('intro', EF.intro);
    safe('reveal', initReveal);
    safe('counters', initCounters);

    // elements already passed (e.g. page opened on #agendar) reveal right away
    requestAnimationFrame(sweep);

    root.classList.add('ef-ready');
    doc.dispatchEvent(new CustomEvent('ef:ready'));
  }

  // Deferred scripts execute while readyState === 'interactive' and BEFORE
  // DOMContentLoaded, so boot must wait for that event: every page script
  // loaded after core.js (also deferred) has registered by then.
  function bootOnce() {
    if (booted) return;
    booted = true;
    boot();
  }
  if (doc.readyState === 'complete') bootOnce();
  else {
    doc.addEventListener('DOMContentLoaded', bootOnce);
    window.addEventListener('load', bootOnce);
  }
})();
