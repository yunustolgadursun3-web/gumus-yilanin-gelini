(() => {
  'use strict';

  const reader = window.BookReader;
  const app = document.getElementById('app');
  if (!reader || !app) return;

  const blossom = '<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true"><circle cx="20" cy="10" r="8"/><circle cx="30" cy="17" r="8"/><circle cx="26" cy="29" r="8"/><circle cx="14" cy="29" r="8"/><circle cx="10" cy="17" r="8"/><circle cx="20" cy="20" r="4" fill="#e6b769"/></svg>';
  const dialog = document.createElement('dialog');
  dialog.className = 'thank-you-letter';
  dialog.setAttribute('aria-labelledby', 'thank-you-title');
  dialog.innerHTML = `
    <button class="thank-you-close" type="button" aria-label="Mektubu kapat" autofocus>×</button>
    <div class="thank-you-scene">
      <div class="thank-you-petals" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <article class="thank-you-paper">
        <span class="thank-you-blossom">${blossom}</span>
        <p class="thank-you-eyebrow">SANA KÜÇÜK BİR NOT</p>
        <h2 id="thank-you-title">İyi ki okudun,<br><em>hatun.</em></h2>
        <span class="thank-you-rule" aria-hidden="true">♡</span>
        <div class="thank-you-message">
          <p>Hikâyeyi bitirdin! Umarım bu yolculuğu sen de benim kadar sevmişsindir.</p>
          <p>Beğendiysen bu ekranın bir görüntüsünü alıp bana atar mısın, rica etsem?</p>
          <p>Okuduğun ve bu hikâyeye zaman ayırdığın için teşekkür ederim.</p>
        </div>
        <p class="thank-you-signature">Sevgiyle <span aria-hidden="true">♡</span></p>
      </article>
      <button class="thank-you-return" type="button">Mektubu kapat <span aria-hidden="true">♡</span></button>
    </div>`;
  app.append(dialog);

  function close() { dialog.close(); }
  dialog.querySelector('.thank-you-close').addEventListener('click', close);
  dialog.querySelector('.thank-you-return').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  dialog.addEventListener('close', () => {
    document.querySelectorAll('.ending-letter-button').forEach(button => button.setAttribute('aria-expanded', 'false'));
  });

  function mount() {
    dialog.dataset.motion = reader.settings().reduceMotion ? 'off' : 'on';
    for (const page of document.querySelectorAll('#book-spread .end-page:not([data-thank-you])')) {
      const mark = page.querySelector('.end-mark');
      if (!mark) continue;
      page.dataset.thankYou = 'true';
      const pair = document.createElement('div');
      pair.className = 'ending-pair';
      mark.before(pair);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ending-letter-button';
      button.setAttribute('aria-label', 'Sana bir mektup: teşekkür notunu aç');
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = `<span class="ending-envelope" aria-hidden="true"><span class="ending-envelope-fold"></span><span class="ending-envelope-seal">${blossom}</span></span><span class="ending-letter-label">Sana bir mektup</span><span class="ending-letter-hint">Açmak için dokun ↗</span>`;
      for (const type of ['pointerdown', 'pointerup']) button.addEventListener(type, event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.stopPropagation();
        document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'thank-you-letter' }));
        dialog.dataset.motion = reader.settings().reduceMotion ? 'off' : 'on';
        dialog.scrollTop = 0;
        dialog.showModal();
        button.setAttribute('aria-expanded', 'true');
      });
      pair.append(mark, button);
    }
  }
  document.addEventListener('book:location', mount);
  document.addEventListener('book:settings', mount);
  mount();
})();
