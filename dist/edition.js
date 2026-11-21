(() => {
  'use strict';
  const reader = window.BookReader;
  const plan = window.BOOK_PLAN;
  if (!reader || !plan) return;
  const home = document.getElementById('cover-button');
  home.setAttribute('aria-label', 'Ana Menüye Dön');
  home.title = 'Ana Menüye Dön';
  function action(label, handler) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = label;
    for (const type of ['pointerdown', 'pointerup']) control.addEventListener(type, event => event.stopPropagation());
    control.addEventListener('click', event => { event.stopPropagation(); handler(control); });
    return control;
  }
  function navigation() {
    const close = document.getElementById('world-close');
    if (close && !document.querySelector('.world-head-actions')) {
      const actions = document.createElement('div');
      actions.className = 'world-head-actions';
      close.before(actions);
      const menu = action('⌂ Menü', () => reader.home());
      menu.className = 'world-button world-home';
      menu.setAttribute('aria-label', 'Ana Menüye Dön');
      actions.append(menu, close);
    }
    for (const paper of document.querySelectorAll('.letter-paper:not([data-navigation])')) {
      paper.dataset.navigation = 'true';
      const nav = document.createElement('nav');
      nav.className = 'letter-navigation';
      nav.setAttribute('aria-label', 'Mektuptan sonra kitap gezinmesi');
      const note = document.createElement('p');
      note.textContent = 'Ana menüye dönerek kitabı yeniden açabilir.';
      nav.append(note, action('⌂ Ana Menü', () => reader.home()));
      paper.append(nav);
    }
  }
  document.addEventListener('book:location', navigation);
  window.addEventListener('load', navigation, { once: true });
  navigation();
  document.getElementById('cover-edition-info').textContent = `${plan.chapters.length} bölüm · tam roman`;
})();
