(() => {
  'use strict';
  const reader = window.BookReader;
  const comfort = window.BookComfort;
  const app = document.getElementById('app');
  const stage = document.getElementById('book-stage');
  if (!reader || !comfort || !app || !stage) return;

  const tab = comfort.addTab('room', 'Ortam');
  const backdrop = document.createElement('div');
  backdrop.className = 'reading-room';
  backdrop.setAttribute('aria-hidden', 'true');
  for (const className of ['reading-room-scene', 'reading-room-table', 'reading-room-light']) {
    const plane = document.createElement('div');
    plane.className = className;
    if (className === 'reading-room-table') window.BookPhysics?.solidify(plane);
    backdrop.append(plane);
  }
  stage.prepend(backdrop);
  const choices = {
    readingDesk: ['Okuma masası', {off:'Kapalı',wood:'Antik ahşap',academy:'Koyu akademi',marble:'Mermer',modern:'Sade modern',library:'Nostaljik kütüphane'}],
    readingRoom: ['Arka plan', {story:'Kitabın atmosferi',rain:'Yağmurlu pencere',library:'Eski kütüphane',sakura:'Sakura bahçesi',night:'Gece çalışma odası',lounge:'Sakin salon',minimal:'Minimal karanlık'}],
    readingLight: ['Aydınlatma', {story:'Temaya göre',day:'Gün ışığı',dusk:'Akşam',candle:'Mum ışığı',moon:'Ay ışığı',library:'Loş kütüphane',oled:'OLED'}],
  };
  const heading = document.createElement('h3');
  heading.className = 'hub-group-title';
  heading.textContent = 'Okuma ortamı';
  tab.append(heading);
  const fields = {};
  for (const [key, [caption, entries]] of Object.entries(choices)) {
    const label = document.createElement('label');
    label.className = 'hub-field';
    const name = document.createElement('span');
    name.textContent = caption;
    const field = document.createElement('select');
    field.id = 'room-' + key;
    for (const [value, text] of Object.entries(entries)) field.append(new Option(text, value));
    field.addEventListener('change', () => reader.update({[key]: field.value}));
    label.append(name, field);
    tab.append(label);
    fields[key] = field;
  }
  const angleLabel = document.createElement('label');
  angleLabel.className = 'hub-field';
  const angleCaption = document.createElement('span');
  angleCaption.textContent = 'Masa açısı';
  const angle = document.createElement('input');
  angle.id = 'room-angle';
  angle.type = 'range';
  angle.min = '-5';
  angle.max = '5';
  angle.step = '1';
  angleLabel.append(angleCaption, angle);
  tab.append(angleLabel);
  angle.addEventListener('input', () => reader.update({readingDeskAngle: Number(angle.value)}));

  const popupPreference = document.createElement('label');
  popupPreference.className = 'motion-toggle';
  const popupEnabled = document.createElement('input');
  popupEnabled.type = 'checkbox';
  popupEnabled.id = 'popup-pages-toggle';
  popupEnabled.addEventListener('change', () => reader.update({popupPages: popupEnabled.checked}));
  popupPreference.append(popupEnabled, ' Sayfada katlanan kâğıt sahneleri');
  document.getElementById('hub-page-binding')?.append(popupPreference);
  const mobilePerformance=matchMedia('(max-width:819px)');
  mobilePerformance.addEventListener('change',apply);
  function apply() {
    const settings = reader.settings();
    popupEnabled.checked = settings.popupPages !== false;
    const limited=mobilePerformance.matches||navigator.connection?.saveData||(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4);
    app.dataset.performanceLite=String(settings.quality==='low'||(settings.quality==='balanced'||((settings.quality||'auto')==='auto'&&limited)));
    for (const [key, [, allowed]] of Object.entries(choices)) {
      const value = Object.hasOwn(allowed, settings[key]) ? settings[key] : Object.keys(allowed)[0];
      fields[key].value = value;
      app.dataset[key] = value;
    }
    const degrees = Math.max(-5, Math.min(5, Number(settings.readingDeskAngle) || 0));
    app.style.setProperty('--room-tilt', degrees + 'deg');
    app.style.setProperty('--room-shadow-x', (degrees * 1.5) + 'px');
    angle.value = String(degrees);
    angle.disabled = app.dataset.readingDesk === 'off';
    angle.setAttribute('aria-valuetext', degrees + ' derece');
  }
  document.addEventListener('book:settings', apply);
  apply();
})();
