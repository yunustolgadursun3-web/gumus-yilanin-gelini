(() => {
  'use strict';

  const reader = window.BookReader;
  const app = document.getElementById('app');
  const stage = document.getElementById('book-stage');
  const comfort = document.getElementById('hub-page-comfort');
  if (!reader || !app || !stage || !comfort) return;

  const option = document.createElement('label');
  option.className = 'motion-toggle';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'paragraph-focus-choice';
  option.append(checkbox, ' Odak modunda tek paragraf');
  comfort.prepend(option);
  checkbox.addEventListener('change', () => reader.update({ paragraphFocus: checkbox.checked }));

  const sheet = document.createElement('section');
  sheet.className = 'paragraph-focus-sheet';
  sheet.setAttribute('aria-label', 'Tek paragraf okuma alanı');
  sheet.hidden = true;
  sheet.tabIndex = 0;
  const label = document.createElement('h2');
  label.textContent = 'Paragraf odağı';
  const copy = document.createElement('p');
  copy.className = 'paragraph-focus-copy';
  copy.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div');
  actions.className = 'paragraph-focus-actions';
  const previous = button('Önceki paragraf', () => step(-1));
  const next = button('Sonraki paragraf', () => step(1));
  const exit = button('Sayfa görünümüne dön', () => {
    reader.update({ paragraphFocus: false });
    stage.focus({ preventScroll: true });
  });
  actions.append(previous, next, exit);
  sheet.append(label, copy, actions);
  stage.append(sheet);

  function button(text, run) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = text;
    control.addEventListener('click', run);
    return control;
  }

  function currentParagraph(offset = reader.location().offset) {
    const anchor = reader.sourceAnchor(offset);
    const start = offset - anchor.paragraphOffset;
    return { start, end: start + anchor.paragraphLength };
  }

  function step(direction) {
    const { start, end } = currentParagraph();
    if (direction < 0 && start > 0) {
      const previous = currentParagraph(start - 1);
      void reader.seek(previous.start, { preferText: true });
    }
    if (direction > 0) {
      const nextCharacter = reader.source().slice(end).search(/\S/u);
      if (nextCharacter >= 0) void reader.seek(end + nextCharacter, { preferText: true });
    }
  }

  function sync() {
    const settings = reader.settings();
    const location = reader.location();
    checkbox.checked = settings.paragraphFocus === true;
    const show = checkbox.checked && location.open && location.mode === 'focus' && location.offset < location.length;
    const wasHidden = sheet.hidden;
    sheet.hidden = !show;
    app.dataset.paragraphFocus = String(show);
    if (!show) return;
    const { start, end } = currentParagraph(location.offset);
    const text = reader.source();
    const paragraph = text.slice(start, end);
    if (copy.textContent !== paragraph) {
      copy.textContent = paragraph;
      copy.scrollTop = 0;
    }
    previous.disabled = start === 0;
    next.disabled = !/\S/u.test(text.slice(end));
    if (wasHidden) sheet.focus({ preventScroll: true });
  }

  sheet.addEventListener('pointerdown', event => event.stopPropagation());
  sheet.addEventListener('keydown', event => {
    const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 0;
    if (!direction || copy.scrollHeight > copy.clientHeight + 2 && ['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    step(direction);
  });
  document.addEventListener('book:settings', sync);
  document.addEventListener('book:location', sync);
  sync();
})();
