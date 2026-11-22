(() => {
  'use strict';

  const reader = window.BookReader;
  const app = document.getElementById('app');
  if (!reader || !app) return;

  const sealedChapters = new Set([2, 5, 7, 13, 24, 38, 51]);
  const seals = new Map(window.BOOK_PLAN.chapters
    .filter(chapter => sealedChapters.has(chapter.number) && chapter.galleryImage?.anchor)
    .map(chapter => [chapter.galleryImage.src, chapter]));
  const dialog = document.createElement('dialog');
  dialog.id = 'scene-seal';
  dialog.setAttribute('aria-labelledby', 'scene-seal-title');
  dialog.innerHTML = `
    <form method="dialog">
      <button class="scene-seal-close" aria-label="Alıntıyı kapat" autofocus>×</button>
      <span class="scene-seal-mark" aria-hidden="true">✦</span>
      <h2 id="scene-seal-title">Sahnenin mührü</h2>
      <blockquote></blockquote>
      <p class="scene-seal-chapter"></p>
      <button class="scene-seal-return">Sahneye dön</button>
    </form>`;
  app.append(dialog);
  const quote = dialog.querySelector('blockquote');
  const attribution = dialog.querySelector('.scene-seal-chapter');

  function mount() {
    for (const page of reader.visiblePages()) {
      for (const figure of page.querySelectorAll('figure[data-chapter-art]')) {
        const source = figure.querySelector('img.illustration-image')?.getAttribute('src');
        const chapter = source && seals.get(source.replace(/^\.\//, ''));
        if (!chapter || figure.querySelector('.scene-seal-trigger')) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'scene-seal-trigger';
        button.setAttribute('aria-label', 'Saklı mührü aç ve sahnenin alıntısını oku');
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', dialog.id);
        button.title = 'Saklı mühür';
        button.textContent = '✦';
        for (const event of ['pointerdown', 'pointerup']) button.addEventListener(event, action => action.stopPropagation());
        button.addEventListener('click', event => {
          event.stopPropagation();
          quote.textContent = chapter.galleryImage.anchor;
          attribution.textContent = chapter.title;
          document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'scene-seal' }));
          dialog.showModal();
        });
        figure.append(button);
      }
    }
  }

  document.addEventListener('book:location', mount);
  mount();
})();
