/* ==========================================================================
   EasyFoods LP v2 · Site configuration
   Edit ONLY this file to change contact data and the lead form destination.
   Every [data-whatsapp] / [data-email] link on every page reads from here.
   ========================================================================== */
window.EF_CONFIG = {
  // Temporary: personal e-mail until the commercial one exists.
  email: 'gomes.nicolas.2011@gmail.com',

  // WhatsApp number: country + area code, digits only.
  whatsapp: '5551993810808',

  // Default message pre-filled when someone taps a WhatsApp button.
  whatsappMessage: 'Olá! Vim pelo site e quero agendar uma demonstração do EasyFoods.',

  // TODO: lead form endpoint (Formspree, Make, n8n, your own API...). It receives a
  // JSON POST with { nome, restaurante, email, telefone, operacao, mensagem, origem, enviadoEm }.
  // While empty, the form never pretends to send: it opens WhatsApp with the
  // message already written (and offers e-mail as an alternative).
  formEndpoint: '',
};
