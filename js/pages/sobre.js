/* ==========================================================================
   EasyFoods LP v2 · Sobre: manifesto word-light, expandable principles
   ========================================================================== */
(function () {
  'use strict';
  if (!window.EF) return;

  function manifesto(EF) {
    var p = document.querySelector('[data-manifesto]');
    if (!p || !EF.motionOK()) return;
    var hot = ['herói', 'equipe', 'mesmo', 'pedido,'];
    var words = p.textContent.split(/\s+/);
    p.setAttribute('aria-label', p.textContent);
    p.innerHTML = words.map(function (w) {
      var cls = 'word' + (hot.indexOf(w.toLowerCase()) > -1 ? ' is-hotword' : '');
      return '<span class="' + cls + '" aria-hidden="true">' + w + '</span>';
    }).join(' ');
    var spans = EF.$$('.word', p);
    // one-shot: words light up in sequence when the block is seen
    EF.onVisible(p, function (e, stop) {
      stop();
      spans.forEach(function (s, i) {
        setTimeout(function () {
          s.classList.add('is-lit');
          if (s.classList.contains('is-hotword')) s.classList.add('is-hot');
        }, 200 + i * 45);
      });
    }, { threshold: 0.4 });
  }

  function principles(EF) {
    var list = document.querySelector('[data-principles]');
    if (!list) return;
    var gsap = window.gsap;
    var items = EF.$$('.pr', list);
    function toggle(btn, open) {
      var detail = btn.querySelector('.pr__detail');
      btn.setAttribute('aria-expanded', String(open));
      if (EF.motionOK()) {
        gsap.fromTo(detail, { height: open ? 0 : detail.offsetHeight, opacity: open ? 0 : 1 },
          { height: open ? 'auto' : 0, opacity: open ? 1 : 0, duration: open ? 0.55 : 0.4, ease: 'ef-out', clearProps: open ? 'height,opacity' : '' });
      }
    }
    items.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        items.forEach(function (o) { if (o !== btn && o.getAttribute('aria-expanded') === 'true') toggle(o, false); });
        toggle(btn, open);
      });
    });
    toggle(items[0], true);
  }

  window.EF.register('sobre', function (EF) {
    manifesto(EF);
    principles(EF);
  });
})();
