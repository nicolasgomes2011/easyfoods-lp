/* ==========================================================================
   EasyFoods LP v2 · Legal pages (TOC + active section + copy link) and 404
   ========================================================================== */
(function () {
  'use strict';
  if (!window.EF) return;

  function legal(EF) {
    var body = document.querySelector('[data-legal]');
    var toc = document.querySelector('[data-toc]');
    if (!body || !toc) return;
    var heads = EF.$$('h2[id]', body);
    var links = heads.map(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/^\d+\.\s*/, '');
      li.appendChild(a);
      toc.appendChild(li);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'legal__copy';
      btn.setAttribute('aria-label', 'Copiar link da seção ' + a.textContent);
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
      btn.addEventListener('click', function () {
        var url = location.href.split('#')[0] + '#' + h.id;
        var ok = function () { EF.toast('Link da seção copiado.', 'success'); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(ok, function () { EF.toast(url, 'info'); });
        else { history.replaceState(null, '', '#' + h.id); EF.toast('Link atualizado na barra de endereço.', 'info'); }
      });
      h.appendChild(btn);
      return a;
    });

    if (!('IntersectionObserver' in window)) return;
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) current = e.target.id;
      });
      links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + current); });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  function notFound(EF) {
    var t = document.querySelector('[data-nf-ticket]');
    if (!t || !EF.motionOK()) return;
    var gsap = window.gsap;
    gsap.timeline({ delay: 0.5 })
      .fromTo(t, { clipPath: 'inset(0 0 100% 0)', y: -30 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.4, ease: 'steps(14)' })
      .fromTo('[data-nf-stamp]', { scale: 2.6, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.45, ease: 'back.out(3)' }, '+=0.15')
      .to(t, { keyframes: { rotate: [3, 1, 4, 3] }, duration: 0.5, ease: 'none' }, '<0.05');
  }

  window.EF.register('privacidade', legal);
  window.EF.register('termos', legal);
  window.EF.register('404', notFound);
})();
