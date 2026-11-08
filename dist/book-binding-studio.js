(() => {
  'use strict';

  const app = document.getElementById('app');
  const reader = window.BookReader;
  const physics = window.BookPhysics;
  const comfort = window.BookComfort;
  if (!app || !reader || !physics || !comfort) return;

  const materials = [
    ['classic-leather', 'Klasik deri', 'Taneli yüzey, dikiş izi ve kaburgalı sırt'],
    ['dark-leather', 'Koyu deri', 'İnce taneli yüzey ve koyu pres çizgileri'],
    ['linen', 'Kumaş kaplama', 'Çapraz keten örgüsü ve düz dokuma sırt'],
    ['velvet', 'Kadife', 'Yönlü hav, yumuşak kenar ve düşük parlaklık'],
    ['antique', 'Antika sert kapak', 'Aşınmış köşeler ve kalın kaburga izleri'],
    ['modern', 'Modern sert kapak', 'Düz levha, geometrik sırt ve keskin kenarlar'],
    ['minimal', 'Minimal mat kapak', 'İnce, mat levha ve sade sırt'],
  ];
  const choices = {
    bindingTrim: [['theme', 'Temaya göre'], ['brass', 'Eskitilmiş pirinç'], ['copper', 'Bakır'], ['silver', 'Gümüş'], ['none', 'Metalsiz']],
    bindingCorners: [['brackets', 'Metal köşebent'], ['ornate', 'Kıvrımlı işlemeli'], ['plain', 'Sade']],
    bindingEdge: [['paper', 'Doğal kâğıt'], ['gilded', 'Yaldızlı kenar'], ['inked', 'Mürekkep boyalı'], ['speckled', 'Benekli kenar']],
    bindingSpine: [['material', 'Cilde uygun'], ['ribbed', 'Kaburgalı'], ['smooth', 'Düz']],
    bindingFrame: [['material', 'Cilde uygun'], ['line', 'İnce çizgi'], ['double', 'Çift çerçeve'], ['none', 'Çerçevesiz']],
    bindingTitle: [['raised', 'Kabartma etkisi'], ['printed', 'Düz baskı']],
    bookDepth: [['full', 'Tam 3B'], ['light', 'Hafif 3B'], ['flat', 'Düz geçiş']],
  };
  const defaults = Object.freeze({
    bindingMaterial: 'dark-leather', bindingTrim: 'theme', bindingCorners: 'brackets', bindingEdge: 'paper',
    bindingSpine: 'material', bindingFrame: 'material', bindingTitle: 'raised', bindingThickness: 16,
    bookDepth: 'full', turnSpeed: 1,
  });

  const page = comfort.addTab('binding', 'Kitap');
  const fields = new Map();
  const swatches = new Map();
  const cover = document.querySelector('#cover-view .cover-art');
  const shell = document.getElementById('book-shell');
  physics.decorateCover(cover);

  function create(tag, className, label) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (label) element.textContent = label;
    return element;
  }

  function group(title) {
    const section = create('section', 'setting-group binding-group');
    section.append(create('h3', 'hub-group-title', title));
    page.append(section);
    return section;
  }

  function select(parent, key, title) {
    const field = create('label', 'hub-field');
    const input = create('select');
    input.id = `binding-${key}`;
    for (const [value, label] of choices[key]) {
      const option = create('option', '', label);
      option.value = value;
      input.append(option);
    }
    input.addEventListener('change', () => reader.update({ [key]: input.value }));
    field.append(create('span', '', title), input);
    parent.append(field);
    fields.set(key, input);
  }

  function range(parent, key, title, min, max, step, format) {
    const field = create('label', 'hub-field binding-range');
    const label = create('span', '', title);
    const input = create('input');
    input.id = `binding-${key}`;
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    const value = create('output', 'binding-range-value');
    value.htmlFor = input.id;
    function display() {
      const text = format(Number(input.value));
      value.value = text;
      input.setAttribute('aria-valuetext', text);
    }
    input.addEventListener('input', display);
    input.addEventListener('change', () => reader.update({ [key]: Number(input.value) }));
    field.append(label, input, value);
    parent.append(field);
    fields.set(key, { input, display });
  }

  const materialsGroup = group('Fiziksel cilt');
  const preview = create('div', 'binding-preview');
  const mock = create('div', 'binding-preview-cover');
  mock.setAttribute('aria-hidden', 'true');
  const coverImage = cover?.querySelector('img')?.cloneNode();
  if (coverImage) {
    coverImage.alt = '';
    coverImage.removeAttribute('id');
    coverImage.removeAttribute('fetchpriority');
    coverImage.sizes = '66px';
    coverImage.loading = 'lazy';
    mock.append(coverImage);
  }
  physics.decorateCover(mock);
  const previewCopy = create('div', 'binding-preview-copy');
  const previewName = create('strong');
  const previewDescription = create('p');
  previewCopy.append(previewName, previewDescription);
  preview.append(mock, previewCopy);
  materialsGroup.append(preview);

  const materialGrid = create('div', 'binding-materials');
  materialGrid.setAttribute('role', 'group');
  materialGrid.setAttribute('aria-label', 'Cilt malzemesi');
  for (const [key, label] of materials) {
    const button = create('button', 'binding-material');
    button.type = 'button';
    button.dataset.bindingChoice = key;
    button.setAttribute('aria-pressed', 'false');
    const sample = create('span', 'binding-material-sample');
    sample.dataset.bindingMaterial = key;
    sample.setAttribute('aria-hidden', 'true');
    button.append(sample, create('span', '', label));
    button.addEventListener('click', () => reader.update({ bindingMaterial: key }));
    swatches.set(key, button);
    materialGrid.append(button);
  }
  materialsGroup.append(materialGrid);

  const details = group('Cilt ayrıntıları');
  select(details, 'bindingTrim', 'Metal işleme');
  select(details, 'bindingCorners', 'Köşe işlemesi');
  select(details, 'bindingSpine', 'Kitap sırtı');
  select(details, 'bindingFrame', 'Kapak çerçevesi');
  select(details, 'bindingTitle', 'Kapak başlığı');
  select(details, 'bindingEdge', 'Sayfa kenarı');
  range(details, 'bindingThickness', 'Cilt kalınlığı', 8, 30, 1, value => `Yaklaşık ${value} mm`);

  const motion = group('Sayfa hareketi');
  select(motion, 'bookDepth', 'Üç boyut düzeyi');
  range(motion, 'turnSpeed', 'Sayfa çevirme hızı', .6, 1.6, .1, value => `Yüzde ${Math.round(value * 100)}`);
  motion.append(create('p', 'hub-hint', 'Üç boyut ve hız, Fiziksel 3D kitap ile Sinematik okuma biçimlerinde uygulanır.'));

  function syncSettings() {
    const saved = reader.settings();
    const settings = { ...defaults };
    const material = materials.find(([key]) => key === saved.bindingMaterial) || materials.find(([key]) => key === defaults.bindingMaterial);
    settings.bindingMaterial = material[0];
    for (const [key, options] of Object.entries(choices)) {
      if (options.some(([value]) => value === saved[key])) settings[key] = saved[key];
    }
    for (const key of ['bindingThickness', 'turnSpeed']) {
      const control = fields.get(key).input;
      const number = Number(saved[key]);
      if (Number.isFinite(number)) settings[key] = Math.min(Number(control.max), Math.max(Number(control.min), number));
    }

    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('binding')) app.dataset[key] = String(value);
      const control = fields.get(key);
      if (!control) continue;
      const input = control.input || control;
      input.value = String(value);
      control.display?.();
    }
    const depth = settings.bindingThickness * .76;
    app.style.setProperty('--binding-cover-depth', `${depth}px`);
    previewName.textContent = material[1];
    previewDescription.textContent = material[2];
    for (const [key, button] of swatches) button.setAttribute('aria-pressed', String(key === settings.bindingMaterial));
    const location = reader.location();
    if (location.open && shell) {
      const active = ['physical', 'cinematic'].includes(location.mode) && settings.bookDepth !== 'flat';
      physics.binding(shell, location.offset, location.length, app.dataset.readerLayout === 'single', active);
    }
  }

  function styleProfile(input) {
    const result = {};
    if (materials.some(([key]) => key === input.bindingMaterial)) result.bindingMaterial = input.bindingMaterial;
    for (const [key, entries] of Object.entries(choices)) {
      if (entries.some(([value]) => value === input[key])) result[key] = input[key];
    }
    if (Number.isFinite(input.bindingThickness) && input.bindingThickness >= 8 && input.bindingThickness <= 30) result.bindingThickness = input.bindingThickness;
    if (Number.isFinite(input.turnSpeed) && input.turnSpeed >= .6 && input.turnSpeed <= 1.6) result.turnSpeed = input.turnSpeed;
    return result;
  }

  window.BookBindingStudio = Object.freeze({ defaults, styleProfile });
  document.addEventListener('book:settings', syncSettings);
  syncSettings();
})();
