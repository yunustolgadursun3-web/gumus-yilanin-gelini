(() => {
  'use strict';

  const reader = window.BookReader;
  const comfort = window.BookComfort;
  const plan = window.BOOK_PLAN;
  const settingsPage = document.getElementById('hub-page-reading');
  if (!reader || !comfort || !plan || !settingsPage) return;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function action(label, run, className = 'notebook-action') {
    const button = element('button', className, label);
    button.type = 'button';
    button.addEventListener('click', run);
    return button;
  }

  const dialog = element('dialog', 'book-notebook');
  dialog.id = 'book-notebook';
  dialog.setAttribute('aria-labelledby', 'book-notebook-title');
  const header = element('header', 'notebook-header');
  const title = element('div');
  const heading = element('h2', '', 'Kitap defteri');
  heading.id = 'book-notebook-title';
  title.append(element('small', '', plan.title), heading);
  const close = action('×', () => dialog.close(), 'notebook-close');
  close.setAttribute('aria-label', 'Kitap defterini kapat');
  header.append(title, close);

  const tabs = element('div', 'notebook-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Defter sayfaları');
  const pane = element('section', 'notebook-pane');
  pane.id = 'book-notebook-pane';
  pane.setAttribute('role', 'tabpanel');
  pane.tabIndex = 0;
  const status = element('p', 'notebook-status');
  status.setAttribute('role', 'status');
  dialog.append(header, tabs, pane, status);
  document.getElementById('app').append(dialog);

  const sections = new Map();
  let active = 'chapters';
  let returnFocus = null;

  async function jump(offset, options) {
    const found = await reader.seek(offset, options);
    if (found) dialog.close();
    else status.textContent = 'Sayfa hazır olunca yeniden deneyebilirsin.';
    return found;
  }

  function row(titleText, detail, offset, { image, preferText, anchor } = {}) {
    const row = action('', () => jump(offset, { preferText, anchor }), 'notebook-row');
    if (image?.src) {
      const thumbnail = element('img');
      thumbnail.src = image.src;
      thumbnail.alt = image.alt || '';
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      row.append(thumbnail);
    }
    const copy = element('span', 'notebook-row-copy');
    copy.append(element('strong', '', titleText));
    if (detail) copy.append(element('span', '', detail));
    const arrow = element('span', 'notebook-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    row.append(copy, arrow);
    return row;
  }

  function empty(message) {
    pane.append(element('p', 'notebook-empty', message));
  }

  function refresh() {
    pane.replaceChildren();
    pane.scrollTop = 0;
    status.textContent = '';
    const section = sections.get(active);
    pane.setAttribute('aria-labelledby', section.button.id);
    section.render({ pane, status, jump, row, empty, refresh });
  }

  function select(id) {
    if (!sections.has(id)) return;
    active = id;
    for (const [name, section] of sections) {
      const selected = name === id;
      section.button.setAttribute('aria-selected', String(selected));
      section.button.tabIndex = selected ? 0 : -1;
    }
    refresh();
  }

  function register(id, label, render) {
    const existing = sections.get(id);
    if (existing) {
      existing.render = render;
      if (dialog.open && active === id) refresh();
      return;
    }
    const button = action(label, () => select(id), 'notebook-tab');
    button.id = `book-notebook-tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', pane.id);
    button.setAttribute('aria-selected', 'false');
    button.tabIndex = -1;
    sections.set(id, { button, render });
    tabs.append(button);
  }

  tabs.addEventListener('keydown', event => {
    const names = [...sections.keys()];
    const current = names.indexOf(active);
    let next;
    if (event.key === 'ArrowLeft') next = (current + names.length - 1) % names.length;
    if (event.key === 'ArrowRight') next = (current + 1) % names.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = names.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    select(names[next]);
    sections.get(active).button.focus();
  });

  register('chapters', 'Bölümler', () => {
    for (const chapter of reader.chapters()) {
      pane.append(row(chapter.title, '', chapter.offset, { preferText: true }));
    }
    if (!pane.childElementCount) empty('Bu kitapta ayrı bölüm başlıkları yok.');
  });

  register('bookmarks', 'Yer imleri', () => {
    pane.append(action('Bu konuma kurdele koy', () => {
      comfort.addBookmark();
      refresh();
    }));
    const marks = comfort.bookmarks();
    if (!marks.length) empty('Henüz bir yer imi eklenmedi.');
    for (const mark of marks) pane.append(row(mark.title, mark.excerpt, mark.offset, { anchor: mark.anchor }));
  });

  register('images', 'Görseller', () => {
    const current = reader.location().offset;
    const headings = reader.chapters();
    const placements = reader.illustrations?.() || [];
    for (const chapter of plan.chapters || []) {
      const image = chapter.galleryImage;
      const heading = headings.find(item => item.id === chapter.id || item.title === chapter.title);
      const anchor = image?.unlock ?? heading?.offset;
      if (!image?.src || !Number.isFinite(anchor) || current < anchor) continue;
      const placement = placements.find(item => item.src === image.src);
      const target = placement?.offset ?? anchor;
      pane.append(row(chapter.title, image.alt, target, {
        image, anchor: placement ? { ...reader.sourceAnchor(target), leaf: placement.leaf } : undefined,
      }));
    }
    if (!pane.childElementCount) empty('Okurken karşılaştığın çizimler burada birikir.');
  });

  register('notes', 'Notlar', () => empty('Henüz kenar notu eklenmedi.'));

  register('recent', 'Son okunan', () => {
    const location = reader.location();
    const progress = element('progress', 'notebook-progress');
    progress.max = 100;
    progress.value = location.percent;
    progress.setAttribute('aria-label', 'Okuma ilerlemesi');
    pane.append(element('p', 'notebook-chapter', `${location.chapter} · %${location.percent}`), progress,
      row('Okumaya dön', location.excerpt, location.offset, { anchor: location.anchor }));
  });

  function open(id = 'chapters') {
    if (!reader.location().open) return;
    if (!dialog.open) {
      returnFocus = document.activeElement;
      document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'notebook' }));
      dialog.showModal();
      window.BookSounds?.journal?.();
    }
    select(sections.has(id) ? id : 'chapters');
    sections.get(active).button.focus();
  }

  dialog.addEventListener('close', () => {
    if (returnFocus?.getClientRects().length) returnFocus.focus({ preventScroll: true });
    else if (reader.location().open && !document.querySelector('dialog[open]')) {
      document.getElementById('book-stage')?.focus({ preventScroll: true });
    }
    returnFocus = null;
  });
  document.addEventListener('book:panel-open', event => {
    if (dialog.open && event.detail !== 'notebook') dialog.close();
  });
  const trigger = action('Kitap defterini aç', () => open(), 'hub-button');
  trigger.id = 'reader-notebook-open';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  settingsPage.prepend(trigger);

  window.BookNotebook = Object.freeze({ open, register, refresh: () => { if (dialog.open) refresh(); } });
})();
