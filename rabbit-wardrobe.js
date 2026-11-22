(() => {
  'use strict';

  const plan = window.BOOK_PLAN;
  const app = document.getElementById('app');
  if (!plan || !app) return;

  const options = [
    ['plain', 'Sade'],
    ['sakura', 'Sakura tacı'],
    ['scarf', 'Küçük atkı'],
    ['leaf', 'Yaprak şapkası'],
  ];
  const storageKey = plan.storageId + ':rabbit-accessory:v1';
  let selected = 'plain';
  try {
    const saved = localStorage.getItem(storageKey);
    if (options.some(([id]) => id === saved)) selected = saved;
  } catch {}

  function picture() {
    const face = document.createElement('span');
    face.className = 'reading-rabbit-picture';
    face.dataset.accessory = selected;
    face.setAttribute('aria-hidden', 'true');
    face.innerHTML = '<img src="./assets/images/reading-rabbit.webp" alt="" draggable="false">' +
      '<span class="rabbit-crown"><i></i><i></i><i></i></span><span class="rabbit-scarf"></span><span class="rabbit-leaf"></span>';
    return face;
  }

  function mount(trigger) {
    const runner = picture();
    trigger.replaceChildren(runner);
    const dialog = document.createElement('dialog');
    dialog.id = 'rabbit-wardrobe';
    dialog.setAttribute('aria-labelledby', 'rabbit-wardrobe-title');
    dialog.innerHTML = `
      <header class="rabbit-wardrobe-head">
        <h2 id="rabbit-wardrobe-title">Rota tavşanını süsle</h2>
        <form method="dialog"><button aria-label="Aksesuar seçimini kapat" autofocus>×</button></form>
      </header>
      <div class="rabbit-wardrobe-body">
        <div class="rabbit-wardrobe-preview"></div>
        <fieldset class="rabbit-wardrobe-options"><legend>Aksesuar</legend></fieldset>
        <p class="rabbit-wardrobe-status" role="status">Seçimin bu tarayıcıda hatırlanır.</p>
      </div>`;
    const preview = picture();
    const status = dialog.querySelector('.rabbit-wardrobe-status');
    dialog.querySelector('.rabbit-wardrobe-preview').append(preview);
    const choices = dialog.querySelector('fieldset');
    for (const [id, name] of options) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'rabbit-accessory';
      radio.value = id;
      radio.checked = id === selected;
      label.append(radio, document.createTextNode(name));
      choices.append(label);
    }
    app.append(dialog);

    function showAccessory() {
      runner.dataset.accessory = selected;
      preview.dataset.accessory = selected;
      trigger.setAttribute('aria-label', 'Tavşana aksesuar seç · ' + options.find(([id]) => id === selected)[1]);
    }
    showAccessory();
    trigger.setAttribute('aria-controls', dialog.id);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.title = 'Tavşana aksesuar seç';
    trigger.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'rabbit-wardrobe' }));
      dialog.showModal();
    });
    choices.addEventListener('change', event => {
      selected = event.target.value;
      showAccessory();
      try {
        localStorage.setItem(storageKey, selected);
        status.textContent = 'Aksesuar kaydedildi.';
      } catch {
        status.textContent = 'Aksesuar değişti. Tarayıcı seçimini kaydedemedi.';
      }
    });
    document.addEventListener('book:panel-open', event => {
      if (event.detail !== 'rabbit-wardrobe' && dialog.open) dialog.close();
    });
  }

  window.BookRabbitWardrobe = Object.freeze({ mount });
})();
