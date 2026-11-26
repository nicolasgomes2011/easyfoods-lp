/* ==========================================================================
   EasyFoods LP v2 · Contato: live receipt preview that mirrors the form.
   Validation, masking, sending and the success ticket live in core.js.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.EF) return;

  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*';

  function scramble(el, text, EF) {
    if (!EF.motionOK()) { el.textContent = text; return; }
    var frame = 0;
    var total = 10;
    clearInterval(el._t);
    el._t = setInterval(function () {
      frame++;
      var done = Math.floor((frame / total) * text.length);
      var out = text.slice(0, done);
      for (var i = done; i < text.length; i++) out += text[i] === ' ' ? ' ' : CHARS[(Math.random() * CHARS.length) | 0];
      el.textContent = out;
      if (frame >= total) { clearInterval(el._t); el.textContent = text; }
    }, 28);
  }

  window.EF.register('contato', function (EF) {
    var preview = document.querySelector('[data-preview]');
    if (!preview) return;
    var gsap = window.gsap;
    var status = preview.querySelector('[data-pv-status]');
    var sources = EF.$$('[data-pv-src]');

    function filled() { return sources.filter(function (s) { return s.value.trim(); }).length; }

    sources.forEach(function (src) {
      var key = src.getAttribute('data-pv-src');
      var out = preview.querySelector('[data-pv="' + key + '"]');
      out.classList.add('is-empty');
      var debounce = null;
      var update = function () {
        var v = src.value.trim();
        out.classList.toggle('is-empty', !v);
        scramble(out, v || '...', EF);
        var n = filled();
        status.textContent = n === sources.length
          ? 'Comanda completa. É só enviar.'
          : n ? 'Montando sua comanda: ' + n + ' de ' + sources.length + ' itens.' : 'Preencha o formulário para montar sua comanda.';
        if (EF.motionOK()) gsap.fromTo(preview, { y: -3 }, { y: 0, duration: 0.3, ease: 'power2.out' });
      };
      src.addEventListener(src.tagName === 'SELECT' ? 'change' : 'input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(update, src.tagName === 'SELECT' ? 0 : 180);
      });
    });

    // The receipt "prints" out of the printer on load
    if (EF.motionOK()) {
      gsap.fromTo(preview, { clipPath: 'inset(0 0 100% 0)', y: -40 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.6, delay: 0.6, ease: 'steps(18)' });
    }
  });
})();
