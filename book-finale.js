(() => {
  'use strict';
  const app = document.getElementById('app');
  const world = window.STORY_WORLD;
  if (!app || !world) return;

  const journey = [
    ['mountain-lesson', 'Dağ kulübesindeki ilk ders'],
    ['central-city', 'Merkez Şehir’e varış'],
    ['ragewind-meeting', 'Ragewind’de karşılaşma'],
    ['three-arrows', 'Aragorn’un üç oku'],
    ['healing-circle', 'Ron’un şifa çemberi'],
    ['divine-awakening', 'Frosthold’da ilahi uyanış'],
    ['frosthold-renewed', 'Frosthold’da yeni bir sabah'],
  ].flatMap(([id, title]) => {
    const scene = world.scenes.find(item => item.id === id);
    return scene ? [{ ...scene, title }] : [];
  });

  const dialog = document.createElement('dialog');
  dialog.id = 'book-finale';
  dialog.setAttribute('aria-labelledby', 'book-finale-title');
  dialog.innerHTML = `
    <header class="finale-header">
      <h2 id="book-finale-title">Frosthold’un ardından</h2>
      <form method="dialog"><button class="finale-close" aria-label="Final eklerini kapat" autofocus>×</button></form>
    </header>
    <nav class="finale-menu" aria-label="Final ekleri">
      <button type="button" data-finale-view="compare" aria-current="true" aria-controls="finale-compare">Önce ve sonra</button>
      <button type="button" data-finale-view="letters" aria-controls="finale-letters">Mektuplar</button>
      <button type="button" data-finale-view="album" aria-controls="finale-album">Final albümü</button>
    </nav>
    <div class="finale-content">
      <section id="finale-compare" data-finale-panel="compare">
        <h3>Frosthold’un iki hâli</h3>
        <div class="finale-compare-art">
          <img src="./assets/images/frosthold-final-sonra.webp" width="1080" height="720" loading="lazy" alt="Gün doğumunda yeniden kurulan Frosthold.">
          <img class="finale-before" src="./assets/images/frosthold-final-once.webp" width="1080" height="720" loading="lazy" alt="Aynı dağ yamacında, kar altındaki Frosthold harabeleri.">
          <span class="finale-divider" aria-hidden="true"></span>
        </div>
        <label class="finale-range">
          <span class="sr-only">Frosthold’un yıkılmış ve yeniden kurulan hâli arasındaki sınır</span>
          <input type="range" min="0" max="100" value="50" aria-valuetext="Yarım yıkılmış, yarım yeniden kurulmuş Frosthold">
          <span aria-hidden="true">Yıkılıştan sonra</span>
          <span aria-hidden="true">Yeniden kurulduğunda</span>
        </label>
      </section>
      <section id="finale-letters" data-finale-panel="letters" hidden>
        <h3>Finale özel iki mektup</h3>
        <details class="finale-letter" open>
          <summary>Fredo’dan ustasına</summary>
          <div class="finale-letter-paper">
            <img src="./assets/images/mountain-lesson-480.webp" width="480" height="319" loading="lazy" alt="Fredo ile ustası karlı dağ kulübesinin önünde.">
            <p>Ustam,</p>
            <p>Kulübenin önünde bana koca bir kayanın içindeki tek kum tanesini oynatmayı öğretmiştiniz. Bugün meydandaki son taşı yerine koyarken elim yine o günkü gibi titredi. Bu kez yanımda bir şehri birlikte kurduğum insanlar vardı.</p>
            <p>İlk kar yağdığında sizi Frosthold’a bekliyorum. Pencerenin yanındaki yerinizi ayırdım. Çayı da her zamanki gibi demleyeceğim.</p>
            <p class="finale-signature">Öğrenciniz, Fredo</p>
          </div>
        </details>
        <details class="finale-letter">
          <summary>Aisha’dan Fredo’ya</summary>
          <div class="finale-letter-paper">
            <img src="./assets/images/frosthold-renewed-480.webp" width="480" height="319" loading="lazy" alt="Fredo ile Aisha yeniden kurulan Frosthold meydanında el ele.">
            <p>Fredo,</p>
            <p>Ragewind’de çözemediğim o büyüyü nasıl anlattığını hatırlıyor musun? Eve döner dönmez defterime yazmıştım. Bugün defteri açınca kenarına küçük harflerle adını da yazdığımı gördüm.</p>
            <p>Yarın güneş doğarken meydanda buluşalım. Bu kez acelemiz yok. Yol boyunca bana dağdaki kulübeyi anlatırsın.</p>
            <p class="finale-signature">Aisha</p>
          </div>
        </details>
      </section>
      <section id="finale-album" data-finale-panel="album" hidden>
        <h3>Yolculuğun resimli albümü</h3>
        <figure class="finale-album-frame">
          <img width="1200" height="800" alt="">
          <figcaption aria-live="polite"><strong></strong><p></p></figcaption>
        </figure>
        <div class="finale-album-controls">
          <button type="button" data-album-step="-1">← Önceki</button>
          <output aria-label="Albümdeki sahne"></output>
          <button type="button" data-album-step="1">Sonraki →</button>
        </div>
      </section>
    </div>`;
  app.append(dialog);

  const sections = [...dialog.querySelectorAll('[data-finale-panel]')];
  const tabs = [...dialog.querySelectorAll('[data-finale-view]')];
  const range = dialog.querySelector('.finale-range input');
  const comparison = dialog.querySelector('.finale-compare-art');
  const album = dialog.querySelector('#finale-album');
  const albumImage = album.querySelector('img');
  const albumButtons = [...album.querySelectorAll('[data-album-step]')];
  let sceneIndex = 0;

  function compare() {
    const percent = Number(range.value);
    comparison.style.setProperty('--before-width', percent + '%');
    range.setAttribute('aria-valuetext', `Yüzde ${percent} yıkılmış, yüzde ${100 - percent} yeniden kurulmuş Frosthold`);
  }
  range.addEventListener('input', compare);
  compare();

  function showScene() {
    const scene = journey[sceneIndex];
    if (!scene) return;
    albumImage.alt = scene.alt;
    albumImage.src = './' + scene.src;
    album.querySelector('figcaption strong').textContent = scene.title;
    album.querySelector('figcaption p').textContent = scene.alt;
    album.querySelector('output').textContent = `${sceneIndex + 1} / ${journey.length}`;
    albumButtons[0].disabled = sceneIndex === 0;
    albumButtons[1].disabled = sceneIndex === journey.length - 1;
  }
  for (const button of albumButtons) {
    button.addEventListener('click', () => {
      sceneIndex += Number(button.dataset.albumStep);
      showScene();
    });
  }
  function show(view) {
    for (const section of sections) section.hidden = section.dataset.finalePanel !== view;
    for (const button of tabs) {
      if (button.dataset.finaleView === view) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    if (view === 'album') showScene();
    dialog.scrollTop = 0;
  }
  for (const button of tabs) button.addEventListener('click', () => show(button.dataset.finaleView));

  function mount() {
    const page = document.querySelector('#book-spread .end-page .page-content');
    if (!page || page.querySelector('.finale-entry')) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'finale-entry';
    trigger.textContent = 'Final eklerini aç';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', dialog.id);
    for (const type of ['pointerdown', 'pointerup']) trigger.addEventListener(type, event => event.stopPropagation());
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'book-finale' }));
      dialog.showModal();
      show('compare');
    });
    page.querySelector('.folio').before(trigger);
  }
  document.addEventListener('book:location', mount);
  mount();
})();
