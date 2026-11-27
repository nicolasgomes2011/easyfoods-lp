/* ==========================================================================
   Tá na Mão LP v2 · "A jornada do pedido #01042"
   Interactive, synchronized simulation of one order crossing the restaurant:
   Cliente (phone) → Balcão (browser) → Cozinha (tablet) → Entregador (phone).
   The visitor drives it by clicking the glowing action button; it also
   autoplays while visible (until the first interaction).
   Mount: <div class="journey" data-journey> (static fallback inside).
   ========================================================================== */
(function () {
  'use strict';
  if (!window.EF) return;

  var STEPS = [
    { key: 'cart',      clock: '19:02', actor: 'cliente',    act: 'Fazer pedido',       rail: 'Pedido',      live: 'Ana Souza monta o pedido no cardápio online.' },
    { key: 'pending',   clock: '19:03', actor: 'balcao',     act: 'Confirmar pedido',   rail: 'Confirmação', live: 'Pedido #01042 chegou no balcão: Aguardando confirmação.' },
    { key: 'confirmed', clock: '19:04', actor: 'cozinha',    act: 'Iniciar preparo',    rail: 'Cozinha',     live: 'Pedido #01042 confirmado. A cozinha já vê na fila.' },
    { key: 'preparing', clock: '19:05', actor: 'cozinha',    act: 'Marcar pronto',      rail: 'Preparo',     live: 'Pedido #01042 em preparo. Cliente vê: pronto às 19:21.' },
    { key: 'ready',     clock: '19:20', actor: 'entregador', act: 'Pegar para entrega', rail: 'Pronto',      live: 'Pedido #01042 pronto para retirada. O entregador foi avisado.' },
    { key: 'out',       clock: '19:22', actor: 'entregador', act: 'Confirmar entrega',  rail: 'Entrega',     live: 'Pedido #01042 saiu para entrega. Previsão 19:36.' },
    { key: 'delivered', clock: '19:35', actor: 'balcao',     act: 'Concluir',           rail: 'Entregue',    live: 'Pedido #01042 entregue às 19:35.' },
    { key: 'done',      clock: '19:36', actor: null,         act: null,                 rail: 'Concluído',   live: 'Pedido #01042 concluído. Todo mundo viu cada passo.' },
  ];

  var BADGE = {
    pending: ['pending', 'Aguardando confirmação'],
    confirmed: ['confirmed', 'Confirmado'],
    preparing: ['preparing', 'Em preparo'],
    ready: ['ready', 'Pronto para retirada'],
    out: ['out', 'Saiu para entrega'],
    delivered: ['delivered', 'Entregue'],
    done: ['done', 'Concluído'],
  };

  var SCREENS = [
    { id: 'cliente', label: 'Cliente', device: 'no celular' },
    { id: 'balcao', label: 'Balcão', device: 'no computador' },
    { id: 'cozinha', label: 'Cozinha', device: 'no tablet' },
    { id: 'entregador', label: 'Entregador', device: 'no celular' },
  ];

  function badge(key) {
    var b = BADGE[key];
    return b ? '<span class="ui-badge ui-badge--' + b[0] + '" data-jr-badge>' + b[1] + '</span>' : '';
  }

  function actBtn(label, cls) {
    return '<button type="button" class="ui-btn ' + (cls || '') + ' jr-act" data-jr-act>' + label + '</button>';
  }

  /* ---------- Screen templates (pure functions of the step index) ---------- */
  function cliente(i) {
    var k = STEPS[i].key;
    if (k === 'cart') {
      return '' +
        '<div class="jc">' +
          '<p class="jc__brand">Cantina da Vila <span class="jc__open">Aberto</span></p>' +
          '<p class="jc__sec">Seu carrinho</p>' +
          '<div class="jc__line"><span>1x Smash Burger Duplo</span><span class="ui-mono">R$ 38,90</span></div>' +
          '<div class="jc__line"><span>1x Batata Rústica G</span><span class="ui-mono">R$ 19,90</span></div>' +
          '<div class="jc__line"><span>1x Limonada da Casa</span><span class="ui-mono">R$ 9,90</span></div>' +
          '<div class="jc__line jc__line--muted"><span>Taxa de entrega · Centro</span><span class="ui-mono">R$ 3,10</span></div>' +
          '<div class="jc__total"><span>Total</span><span class="ui-mono">R$ 71,80</span></div>' +
          '<p class="jc__pay">Pagamento na entrega · Pix</p>' +
          actBtn('Fazer pedido', 'jc__cta') +
        '</div>';
    }
    var order = ['pending', 'confirmed', 'preparing', 'ready', 'out', 'delivered'];
    var labels = ['Pedido recebido', 'Confirmado', 'Em preparo', 'Pronto', 'Saiu para entrega', 'Entregue'];
    var times = ['19:03', '19:04', '19:05', '19:20', '19:22', '19:35'];
    var cur = k === 'done' ? 5 : order.indexOf(k);
    var steps = labels.map(function (l, n) {
      var st = n < cur || k === 'done' || (n === cur && k === 'delivered') ? 'is-done' : n === cur ? 'is-active' : '';
      return '<li class="' + st + '"><span>' + l + '</span><span class="ui-mono">' + (n <= cur ? times[n] : '') + '</span></li>';
    }).join('');
    var head;
    if (k === 'delivered' || k === 'done') head = '<p class="jc__eta-label">Entregue às</p><p class="jc__eta ui-mono is-ok">19:35</p><p class="jc__eta-sub">Bom apetite, Ana!</p>';
    else if (k === 'out') head = '<p class="jc__eta-label">Chega por volta de</p><p class="jc__eta ui-mono">19:36</p><p class="jc__eta-sub">O entregador já saiu</p>';
    else if (k === 'preparing') head = '<p class="jc__eta-label">Seu pedido fica pronto às</p><p class="jc__eta ui-mono">19:21</p><p class="jc__eta-sub" data-jr-count>faltam 16:00</p>';
    else if (k === 'ready') head = '<p class="jc__eta-label">Pronto!</p><p class="jc__eta ui-mono">19:20</p><p class="jc__eta-sub">Saindo para entrega</p>';
    else head = '<p class="jc__eta-label">Pedido #01042</p><p class="jc__eta jc__eta--sm">' + (k === 'pending' ? 'Recebido' : 'Confirmado') + '</p><p class="jc__eta-sub">A cozinha já foi avisada</p>';
    return '<div class="jc jc--track">' + head + '<ol class="jc__steps" role="list">' + steps + '</ol></div>';
  }

  function balcao(i) {
    var k = STEPS[i].key;
    var row = '';
    if (k !== 'cart') {
      var right = k === 'pending' ? actBtn('Confirmar pedido') : k === 'delivered' ? actBtn('Concluir', 'ui-btn--green') : '<span class="ui-mono jb__val">R$ 71,80</span>';
      row = '<div class="jb__row jb__row--main' + (k === 'pending' ? ' is-new' : '') + '"><span class="ui-mono">#01042</span><span>Ana Souza · Delivery</span>' + badge(k) + right + '</div>';
    }
    return '' +
      '<div class="jb">' +
        '<div class="jb__head"><span>Pedidos em andamento</span>' + (k === 'pending' ? '<span class="jb__alert">Novo pedido</span>' : '<span class="jb__filters">Hoje · Todos os tipos</span>') + '</div>' +
        (row || '<div class="jb__empty">Aguardando novos pedidos…</div>') +
        '<div class="jb__row"><span class="ui-mono">#01041</span><span>Mesa 4</span><span class="ui-badge ui-badge--preparing">Em preparo</span><span class="ui-mono jb__val">R$ 92,50</span></div>' +
        '<div class="jb__row"><span class="ui-mono">#01040</span><span>Retirada · Caio</span><span class="ui-badge ui-badge--ready">Pronto para retirada</span><span class="ui-mono jb__val">R$ 38,00</span></div>' +
        '<div class="jb__row"><span class="ui-mono">#01039</span><span>Mesa 2</span><span class="ui-badge ui-badge--done">Concluído</span><span class="ui-mono jb__val">R$ 126,40</span></div>' +
      '</div>';
  }

  function cozinha(i) {
    var k = STEPS[i].key;
    var wait = 1, prep = 1, ready = 0;
    var card = '';
    if (k === 'confirmed') {
      wait = 2;
      card = '<div class="jk__card is-mine"><div class="jk__top"><span class="ui-mono">#01042</span><span class="ui-mono jk__time">00:40</span></div><p>Delivery · Ana</p>' +
        '<p class="jk__item">1x Smash Burger Duplo</p><p class="jk__item">1x Batata Rústica G</p><p class="jk__item">1x Limonada da Casa</p>' + actBtn('Iniciar preparo') + '</div>';
    } else if (k === 'preparing') {
      prep = 2;
      card = '<div class="jk__card is-mine is-prep"><div class="jk__top"><span class="ui-mono">#01042</span><span class="ui-mono jk__time" data-jr-timer>00:00</span></div><p>Delivery · Ana</p>' +
        '<p class="jk__item" data-jr-check>1x Smash Burger Duplo</p><p class="jk__item" data-jr-check>1x Batata Rústica G</p><p class="jk__item" data-jr-check>1x Limonada da Casa</p>' + actBtn('Marcar pronto', 'ui-btn--green') + '</div>';
    } else if (k === 'ready') {
      ready = 1;
      card = '<div class="jk__card is-mine is-ready"><div class="jk__top"><span class="ui-mono">#01042</span>' + badge('ready') + '</div><p>Delivery · Ana</p><p class="jk__done">Feito em 15 min</p></div>';
    }
    return '' +
      '<div class="jk">' +
        '<div class="jk__counts"><span>Aguardando <b>' + wait + '</b></span><span>Em preparo <b>' + prep + '</b></span><span>Prontos <b>' + ready + '</b></span></div>' +
        '<div class="jk__grid">' + card +
          '<div class="jk__card"><div class="jk__top"><span class="ui-mono">#01041</span><span class="ui-mono jk__time">09:12</span></div><p>Mesa 4</p><p class="jk__item is-checked">2x Pizza Margherita</p><p class="jk__item">1x Salada da Casa</p></div>' +
          (card ? '' : '<div class="jk__card jk__card--ghost">Fila em ordem de chegada</div>') +
        '</div>' +
      '</div>';
  }

  function entregador(i) {
    var k = STEPS[i].key;
    var body;
    if (k === 'ready') {
      body = '<p class="jd__sec">Prontos para retirada</p><div class="jd__card is-mine"><div class="jk__top"><span class="ui-mono">#01042</span>' + badge('ready') + '</div>' +
        '<p><b>Ana Souza</b></p><p class="jd__addr">Rua das Acácias, 214 · ap. 32</p><p class="jd__addr">(11) 9••••-4821</p>' + actBtn('Pegar para entrega') + '</div>';
    } else if (k === 'out') {
      body = '<p class="jd__sec">Em rota</p><div class="jd__card is-mine"><div class="jk__top"><span class="ui-mono">#01042</span>' + badge('out') + '</div>' +
        '<p><b>Ana Souza</b></p><p class="jd__addr">Rua das Acácias, 214 · ap. 32</p><p class="jd__addr">Receber: R$ 71,80 · Pix</p>' + actBtn('Confirmar entrega', 'ui-btn--green') + '</div>';
    } else if (k === 'delivered' || k === 'done') {
      body = '<p class="jd__sec">Entregues hoje</p><div class="jd__card jd__card--ok"><div class="jk__top"><span class="ui-mono">#01042</span>' + badge('delivered') + '</div><p><b>Ana Souza</b> · 19:35</p></div>';
    } else {
      body = '<p class="jd__sec">Prontos para retirada</p><div class="jd__empty">Nenhuma entrega pronta.<br>Você recebe aqui assim que a cozinha marcar pronto.</div>';
    }
    return '<div class="jd"><div class="jd__head"><span>Entregas</span><span class="jd__avail">Disponível</span></div>' + body + '</div>';
  }

  var RENDER = { cliente: cliente, balcao: balcao, cozinha: cozinha, entregador: entregador };

  function frame(s) {
    var inner = '<div class="jr-screen__body" data-jr-body="' + s.id + '"></div>';
    if (s.id === 'balcao') {
      return '<div class="device device--browser jr-dev"><div class="device__bar"><span class="device__dots"><i></i><i></i><i></i></span><span class="device__url">painel.tanamao / pedidos</span></div>' + inner + '</div>';
    }
    if (s.id === 'cozinha') return '<div class="device device--tablet jr-dev"><div class="device__screen">' + inner + '</div></div>';
    return '<div class="device device--phone jr-dev"><div class="device__screen"><div class="device__notch"></div>' + inner + '</div></div>';
  }

  /* ---------- Mount ---------- */
  function mount(root, EF) {
    var gsap = window.gsap;
    var motion = EF.motionOK();

    root.innerHTML = '' +
      '<div class="jr" data-jr>' +
        '<div class="jr__bar">' +
          '<ol class="jr__rail" role="list" aria-label="Etapas do pedido">' +
            STEPS.map(function (s, n) { return '<li><button type="button" class="jr__dot" data-jr-go="' + n + '"><span class="jr__dot-i" aria-hidden="true"></span><span class="jr__dot-l">' + s.rail + '</span></button></li>'; }).join('') +
          '</ol>' +
          '<div class="jr__ctrl">' +
            '<span class="jr__clock ui-mono" aria-hidden="true"><i></i><span data-jr-clock>19:02</span></span>' +
            '<button type="button" class="jr__btn" data-jr-play aria-label="Pausar demonstração"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg></button>' +
            '<button type="button" class="jr__btn" data-jr-restart aria-label="Recomeçar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>' +
          '</div>' +
        '</div>' +
        '<div class="jr__switch" role="tablist" aria-label="Escolher tela">' +
          SCREENS.map(function (s) { return '<button type="button" role="tab" class="jr__sw" data-jr-show="' + s.id + '" aria-selected="false">' + s.label + '</button>'; }).join('') +
        '</div>' +
        '<div class="jr__stage" data-jr-stage>' +
          '<div class="jr__wire" aria-hidden="true"></div>' +
          SCREENS.map(function (s) {
            return '<section class="jr-screen jr-screen--' + s.id + '" data-jr-screen="' + s.id + '" aria-label="Tela: ' + s.label + '">' +
              '<p class="jr-screen__label"><b>' + s.label + '</b> ' + s.device + '</p>' + frame(s) + '</section>';
          }).join('') +
        '</div>' +
        '<p class="jr__live" aria-live="polite" data-jr-live></p>' +
      '</div>';

    var stage = root.querySelector('[data-jr-stage]');
    var bodies = {};
    SCREENS.forEach(function (s) { bodies[s.id] = root.querySelector('[data-jr-body="' + s.id + '"]'); });
    var screens = {};
    SCREENS.forEach(function (s) { screens[s.id] = root.querySelector('[data-jr-screen="' + s.id + '"]'); });
    var dots = EF.$$('[data-jr-go]', root);
    var clock = root.querySelector('[data-jr-clock]');
    var live = root.querySelector('[data-jr-live]');
    var playBtn = root.querySelector('[data-jr-play]');
    var switches = EF.$$('[data-jr-show]', root);
    var narrow = window.matchMedia('(max-width: 1099.98px)');

    var step = -1;
    var autoplay = motion;
    var visible = false;
    var autoTimer = null;
    var tickTimer = null;
    var shown = 'cliente';

    function showScreen(id, animate) {
      shown = id;
      switches.forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-jr-show') === id)); });
      SCREENS.forEach(function (s) { screens[s.id].classList.toggle('is-shown', s.id === id); });
      if (animate && motion && narrow.matches) {
        gsap.fromTo(screens[id], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'ef-out' });
      }
    }

    function packets(fromId) {
      if (!motion || narrow.matches || !fromId) return;
      var sr = stage.getBoundingClientRect();
      var fr = screens[fromId].querySelector('.jr-dev').getBoundingClientRect();
      var fx = fr.left + fr.width / 2 - sr.left;
      var fy = fr.top + fr.height / 2 - sr.top;
      SCREENS.forEach(function (s) {
        if (s.id === fromId) return;
        var tr = screens[s.id].querySelector('.jr-dev').getBoundingClientRect();
        var tx = tr.left + tr.width / 2 - sr.left;
        var ty = tr.top + tr.height / 2 - sr.top;
        var p = document.createElement('span');
        p.className = 'jr__packet';
        stage.appendChild(p);
        var midY = Math.min(fy, ty) - 60;
        gsap.timeline({ onComplete: function () { p.remove(); } })
          .set(p, { x: fx, y: fy, scale: 0.4, opacity: 0 })
          .to(p, { opacity: 1, scale: 1, duration: 0.15 })
          .to(p, { duration: 0.75, ease: 'power2.inOut', keyframes: [{ x: (fx + tx) / 2, y: midY }, { x: tx, y: ty }] })
          .to(p, { scale: 3, opacity: 0, duration: 0.35, ease: 'power2.out' })
          .add(function () { ping(s.id); }, '-=0.35');
      });
    }

    function ping(id) {
      var el = screens[id];
      el.classList.remove('is-ping');
      void el.offsetWidth;
      el.classList.add('is-ping');
    }

    function startTicks() {
      clearInterval(tickTimer);
      var k = STEPS[step].key;
      if (k !== 'preparing') return;
      var sec = 0;
      var left = 16 * 60;
      var checks = EF.$$('[data-jr-check]', bodies.cozinha);
      tickTimer = setInterval(function () {
        sec += 37;
        left = Math.max(0, left - 37);
        var t = bodies.cozinha.querySelector('[data-jr-timer]');
        var c = bodies.cliente.querySelector('[data-jr-count]');
        if (t) t.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
        if (c) c.textContent = 'faltam ' + String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
        var n = Math.min(checks.length, Math.floor(sec / 200));
        checks.forEach(function (el, idx) { el.classList.toggle('is-checked', idx < n); });
      }, 220);
    }

    function go(n, fromUser) {
      if (n < 0 || n >= STEPS.length || n === step) return;
      var prevActor = step >= 0 ? STEPS[step].actor : null;
      step = n;
      var s = STEPS[n];
      SCREENS.forEach(function (sc) { bodies[sc.id].innerHTML = RENDER[sc.id](n); });
      SCREENS.forEach(function (sc) { screens[sc.id].classList.toggle('is-actor', sc.id === s.actor); });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-done', i < n);
        d.classList.toggle('is-current', i === n);
        if (i === n) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      clock.textContent = s.clock;
      live.textContent = s.live;
      var act = s.actor && bodies[s.actor].querySelector('[data-jr-act]');
      if (act) {
        act.classList.add('is-cta');
        act.setAttribute('aria-describedby', 'jr-hint');
      }
      EF.$$('[data-jr-act]', root).forEach(function (b) {
        if (b !== act) { b.disabled = true; b.tabIndex = -1; }
      });

      if (motion) {
        EF.$$('[data-jr-badge]', root).forEach(function (b) {
          gsap.fromTo(b, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.6)', delay: 0.35 });
        });
        var mine = EF.$$('.is-mine, .jb__row--main', root);
        if (mine.length) gsap.fromTo(mine, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'ef-out', delay: 0.25 });
      }
      packets(prevActor);
      if (narrow.matches && s.actor) showScreen(s.actor, true);
      else if (narrow.matches && !s.actor) showScreen('cliente', true);
      startTicks();
      if (fromUser) stopAuto();
      scheduleAuto();
    }

    function scheduleAuto() {
      clearTimeout(autoTimer);
      if (!autoplay || !visible || document.hidden) return;
      var last = step === STEPS.length - 1;
      autoTimer = setTimeout(function () { go(last ? 0 : step + 1, false); }, last ? 4200 : STEPS[step].key === 'preparing' ? 3600 : 2800);
    }

    function setPlayUI() {
      playBtn.setAttribute('aria-label', autoplay ? 'Pausar demonstração' : 'Reproduzir demonstração');
      playBtn.innerHTML = autoplay
        ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>';
    }

    function stopAuto() { autoplay = false; clearTimeout(autoTimer); setPlayUI(); }

    // Events
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-jr-act]');
      if (a && !a.disabled) {
        if (motion) gsap.fromTo(a, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
        go(step === STEPS.length - 1 ? 0 : step + 1, true);
        return;
      }
      var d = e.target.closest('[data-jr-go]');
      if (d) { go(parseInt(d.getAttribute('data-jr-go'), 10), true); return; }
      var sw = e.target.closest('[data-jr-show]');
      if (sw) { showScreen(sw.getAttribute('data-jr-show'), true); return; }
    });
    playBtn.addEventListener('click', function () {
      autoplay = !autoplay;
      setPlayUI();
      if (autoplay && step === STEPS.length - 1) go(0, false); else scheduleAuto();
    });
    root.querySelector('[data-jr-restart]').addEventListener('click', function () { step = -1; go(0, false); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(autoTimer); else scheduleAuto(); });
    EF.inView(root, function () { visible = true; scheduleAuto(); }, function () { visible = false; clearTimeout(autoTimer); }, { threshold: 0.3 });
    narrow.addEventListener('change', function () { showScreen(STEPS[step].actor || 'cliente', false); });

    var hint = document.createElement('span');
    hint.id = 'jr-hint';
    hint.className = 'visually-hidden';
    hint.textContent = 'Próximo passo do pedido';
    root.appendChild(hint);

    setPlayUI();
    showScreen('cliente', false);
    go(0, false);

    if (motion) {
      EF.onVisible(root, function (e, stop) {
        stop();
        gsap.from(EF.$$('.jr-screen', root), { y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: 'ef-out' });
      }, { threshold: 0.2 });
    }
  }

  window.EF.use('[data-journey]', mount);
})();
