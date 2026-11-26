(function () {
  // Ano no rodapé
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  // Menu mobile
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('open', open);
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }

  // Formulário de contato (validação local)
  // TODO: ligar a um endpoint real (e-mail, CRM ou backend) antes de publicar.
  var form = document.getElementById('form-contato');
  if (!form) return;

  var status = form.querySelector('.form-status');
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var valid = true;

    form.querySelectorAll('input, textarea').forEach(function (field) {
      field.classList.remove('invalid');
    });

    ['nome', 'restaurante', 'email'].forEach(function (id) {
      var field = form.elements[id];
      var ok = field.value.trim() !== '';
      if (id === 'email') ok = ok && emailRe.test(field.value.trim());
      if (!ok) {
        field.classList.add('invalid');
        valid = false;
      }
    });

    status.className = 'form-status';
    if (!valid) {
      status.textContent = 'Preencha nome, restaurante e um e-mail válido.';
      status.classList.add('error');
      return;
    }

    status.textContent = 'Recebemos sua mensagem. Em breve entraremos em contato.';
    status.classList.add('success');
    form.reset();
  });
})();
