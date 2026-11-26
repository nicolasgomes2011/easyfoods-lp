/* ==========================================================================
   EasyFoods LP v2 · Recursos: Flip-animated filters + search, roles matrix,
   orbit hero.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.EF) return;

  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function catalog(EF) {
    var wrap = document.querySelector('[data-feats]');
    if (!wrap) return;
    var gsap = window.gsap;
    var cards = EF.$$('.feat', wrap);
    var chips = EF.$$('[data-filter]');
    var search = document.querySelector('[data-search]');
    var count = document.querySelector('[data-count]');
    var empty = document.querySelector('[data-empty]');
    var clear = document.querySelector('[data-clear]');
    var area = 'all';
    var term = '';
    var titles = cards.map(function (c) { var h = c.querySelector('h3'); return { h: h, text: h.textContent }; });

    function apply() {
      var motion = EF.motionOK() && window.Flip;
      var state = motion ? window.Flip.getState(cards) : null;
      var q = norm(term.trim());
      var shown = 0;
      cards.forEach(function (c, i) {
        var ok = (area === 'all' || c.getAttribute('data-area') === area) && (!q || norm(c.getAttribute('data-title')).indexOf(q) > -1);
        c.hidden = !ok;
        if (ok) shown++;
        // highlight search term in the title
        var t = titles[i];
        if (q && ok) {
          var src = t.text;
          var idx = norm(src).indexOf(q);
          if (idx > -1) {
            t.h.textContent = '';
            t.h.appendChild(document.createTextNode(src.slice(0, idx)));
            var m = document.createElement('mark');
            m.textContent = src.slice(idx, idx + q.length);
            t.h.appendChild(m);
            t.h.appendChild(document.createTextNode(src.slice(idx + q.length)));
          } else t.h.textContent = src;
        } else t.h.textContent = t.text;
      });
      count.textContent = shown === 1 ? 'Mostrando 1 recurso' : 'Mostrando ' + shown + ' recursos';
      empty.hidden = shown !== 0;
      if (state) {
        window.Flip.from(state, {
          duration: 0.65, ease: 'ef-out', absolute: true, stagger: 0.015, nested: true,
          onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 0.55, stagger: 0.02 }); },
          onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: 0.88, duration: 0.35 }); },
        });
      }
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        area = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });
    var debounce = null;
    search.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { term = search.value; apply(); }, 160);
    });
    clear.addEventListener('click', function () { search.value = ''; term = ''; apply(); search.focus(); });

    // Deep link: recursos.html?area=cozinha
    var p = new URLSearchParams(location.search).get('area');
    var pre = p && chips.filter(function (c) { return c.getAttribute('data-filter') === p; })[0];
    if (pre) pre.click();
  }

  function matrix(EF) {
    var picks = EF.$$('[data-role]');
    var cells = EF.$$('[data-matrix]');
    var live = document.querySelector('[data-matrix-live]');
    if (!picks.length) return;
    var gsap = window.gsap;

    function select(btn) {
      var areas = btn.getAttribute('data-areas').split(' ');
      picks.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); b.classList.toggle('is-active', b === btn); });
      var on = [];
      cells.forEach(function (c) {
        var yes = areas.indexOf(c.getAttribute('data-matrix')) > -1;
        c.classList.toggle('is-on', yes);
        if (yes) on.push(c);
      });
      if (EF.motionOK()) gsap.fromTo(on, { y: 10 }, { y: 0, duration: 0.5, stagger: 0.05, ease: 'back.out(2)' });
      if (live) live.textContent = btn.querySelector('b').textContent + ' usa: ' + on.map(function (c) { return c.querySelector('b').textContent; }).join(', ') + '.';
    }
    picks.forEach(function (b) { b.addEventListener('click', function () { select(b); }); });
    select(picks[0]);
  }

  function orbit(EF) {
    var el = document.querySelector('[data-orbit]');
    if (!el || !EF.motionOK()) return;
    var gsap = window.gsap;
    var sats = EF.$$('.orbit__sat', el);
    gsap.from(sats, { scale: 0, opacity: 0, duration: 0.8, stagger: 0.08, delay: 0.5, ease: 'back.out(2)' });
    gsap.from(el.querySelector('.orbit__core img'), { scale: 0.6, rotate: -20, opacity: 0, duration: 1.2, delay: 0.3, ease: 'ef-out' });
    // Slow orbit: rotate the ring group via CSS variable offset
    var rot = { a: 0 };
    var tween = gsap.to(rot, {
      a: 360, duration: 60, ease: 'none', repeat: -1,
      onUpdate: function () {
        sats.forEach(function (s, i) {
          s.style.setProperty('--a', (i * 360 / 7 - 90 + rot.a) + 'deg');
        });
      },
    });
    EF.inView(el, function () { tween.resume(); }, function () { tween.pause(); });
    if (EF.finePointer()) {
      el.addEventListener('pointerenter', function () { gsap.to(tween, { timeScale: 4, duration: 0.8 }); });
      el.addEventListener('pointerleave', function () { gsap.to(tween, { timeScale: 1, duration: 1.2 }); });
    }
  }

  window.EF.register('recursos', function (EF) {
    catalog(EF);
    matrix(EF);
    orbit(EF);
  });
})();
