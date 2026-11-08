(() => {
  'use strict';

  const app = document.getElementById('app');
  if (!app) return;

  // IDs used by earlier books remain valid, including the two legacy presets.
  const catalog = [
    ['antique', 'Antik Kütüphane', '#eee1c2 #38291c #655342 #773e22 #986333 #b89c6e #564034 #211713', 'cotton engraved ledger center classic ink'],
    ['night', 'Gotik Gece', '#20202b #ede6ea #c6bdd0 #e8a8bb #bf7f9e #63546d #262234 #0f0c15', 'art gothic arch outer illuminated emboss'],
    ['sakura', 'Sakura Bahçesi', '#fff0f1 #462c3b #6c4960 #8f2858 #c67390 #c997aa #514053 #242032', 'cotton petals lyrical center classic blossom'],
    ['victorian', 'Viktorya', '#f5ead4 #382a1d #5d5042 #345e54 #98734b #b59d7a #3d5047 #1f2924', 'novel double typeset outer illuminated manuscript'],
    ['gold', 'Kraliyet Cildi', '#f5e9cd #351f27 #5d4143 #8d2e49 #aa7837 #c5a771 #5f263c #200f19', 'art regalia arch center illuminated trace'],
    ['sepia', 'Parşömen', '#ecd4a9 #40291d #64503b #77371f #a3753d #b59463 #604332 #281b17', 'parchment engraved ledger outer classic manuscript'],
    ['moon', 'Ay Işığı', '#243449 #e0edf8 #b5cae0 #acd4fa #82aad1 #647d9c #2b3952 #0c1627', 'matte orbit lyrical center plain fade'],
    ['candle', 'Mum Işığı', '#3c2a21 #fff0d6 #e0c6aa #ffd6a0 #d49b65 #886749 #423122 #1a120e', 'parchment double ledger outer classic trace'],
    ['minimal', 'Modern Minimal', '#ffffff #222c36 #4b5a68 #234f88 #5a7fae #a2b2c3 #d5dce4 #748599', 'matte none clean outer plain fade'],
    ['academia', 'Koyu Akademi', '#31312b #f0e6d2 #c7bca7 #dfbf82 #b18c52 #766851 #3c3530 #171614', 'novel register typeset center illuminated emboss'],
    ['light', 'Fildişi', '#f8f2e8 #2e2a27 #605955 #68475d #a37d7f #cbbcaf #76726b #34363c', 'novel rule lyrical outer classic ink'],
    ['oled', 'OLED Gece', '#050506 #f0eef2 #c2bece #d3c5e9 #807392 #675b73 #08080a #000000', 'matte none clean center plain off'],
  ];
  const colorNames = ['paper', 'ink', 'muted', 'accent', 'trim', 'edge', 'desk', 'deep'];
  const designNames = ['material', 'border', 'heading', 'folio', 'initial', 'animation'];
  const unpack = (names, values) => Object.fromEntries(values.split(' ').map((value, index) => [names[index], value]));
  const unpackTheme = ([id, label, colors, design]) => ({id, label, colors: unpack(colorNames, colors), design: unpack(designNames, design)});
  const themes = new Map([
    ...catalog,
    ['forest', 'Orman Mürekkebi', '#202d28 #e9ece2 #bccabd #bbd5ae #91a884 #637f70 #26372f #121c1a', 'cotton rule lyrical outer classic ink'],
    ['contrast', 'Yüksek Kontrast', '#ffffff #161616 #353535 #183863 #4b6482 #727982 #d3d6da #40464c', 'matte rule clean center plain off'],
  ].map(unpackTheme).map(theme => [theme.id, theme]));
  const options = {
    paperTone: ['Kâğıt rengi', [['theme','Temadan'], ['white','Beyaz'], ['ivory','Fildişi'], ['wheat','Buğday'], ['graphite','Grafit'], ['midnight','Gece mavisi']]],
    pageMaterial: ['Kâğıt dokusu', [['theme','Temadan'], ['cotton','Pamuk lifli'], ['parchment','Eskitilmiş parşömen'], ['novel','Roman kâğıdı'], ['matte','İnce mat'], ['art','Sanat kâğıdı']]],
    pageBorder: ['Kenar deseni', [['theme','Temadan'], ['none','Desensiz'], ['rule','İnce çizgi'], ['double','Çift çizgi'], ['engraved','Gravür'], ['gothic','Gotik köşeler'], ['petals','Çiçekler'], ['regalia','Altın işlemeler'], ['orbit','Ay yörüngesi'], ['register','Arşiv şeridi']]],
    pageHeading: ['Başlık tasarımı', [['theme','Temadan'], ['ledger','El yazması'], ['arch','Kemer'], ['lyrical','Lirik'], ['typeset','Klasik dizgi'], ['clean','Sade']]],
    pageFolio: ['Sayfa numarası', [['theme','Temadan'], ['center','Altta ortada'], ['outer','Dış kenarda'], ['top','Üst köşede'], ['hidden','Gizli']]],
    pageInitial: ['İlk harf', [['theme','Temadan'], ['plain','Sade'], ['classic','Büyük baş harf'], ['illuminated','Çerçeveli baş harf']]],
    pageAnimation: ['Başlık hareketi', [['theme','Temadan'], ['ink','Mürekkep'], ['trace','Altın iz'], ['blossom','Çiçek'], ['emboss','Kabartma'], ['fade','Yumuşak belirme'], ['manuscript','El yazması'], ['off','Kapalı']]],
  };
  const designKeys = {
    material: 'pageMaterial', border: 'pageBorder', heading: 'pageHeading',
    folio: 'pageFolio', initial: 'pageInitial', animation: 'pageAnimation',
  };
  const defaults = Object.freeze(Object.fromEntries(Object.keys(options).map(key => [key, 'theme'])));
  const geometry = ['pageHeading', 'pageInitial', 'pageFolio'];
  const available = catalog.map(([id]) => id);
  const tones = {
    white: unpack(colorNames, '#fffdfb #252b31 #4e555c #315478 #6a829d #aab6c2'),
    ivory: unpack(colorNames, '#f8f0df #30271d #5e5041 #74532e #9e7848 #c7b291'),
    wheat: unpack(colorNames, '#eed7ae #412c1c #634b32 #783b23 #a67741 #b79b70'),
    graphite: unpack(colorNames, '#28272b #f3eced #cec4c8 #efb5c6 #c2869a #6c5963'),
    midnight: unpack(colorNames, '#152339 #eef5ff #bccde4 #b6d8ff #79a7d6 #4c6789'),
  };

  function validate(settings) {
    if (!themes.has(settings.theme)) settings.theme = 'night';
    for (const [key, [, choices]] of Object.entries(options)) {
      if (!choices.some(([value]) => value === settings[key])) settings[key] = defaults[key];
    }
  }

  function apply(settings) {
    const theme = themes.get(settings.theme);
    const colors = {...theme.colors, ...tones[settings.paperTone]};
    app.dataset.bookStyle = theme.id;
    for (const [key, value] of Object.entries(colors)) app.style.setProperty('--studio-' + key, value);
    for (const [attribute, key] of Object.entries(designKeys)) {
      app.setAttribute('data-studio-' + attribute, settings[key] === 'theme' ? theme.design[attribute] : settings[key]);
    }
    return colors.deep;
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function action(label, onClick, id) {
    const button = node('button', 'hub-button', label);
    button.type = 'button';
    if (id) button.id = id;
    button.addEventListener('click', onClick);
    return button;
  }

  const picker = document.querySelector('#theme-label + .theme-row');
  if (picker) picker.replaceChildren(...available.map(id => {
    const theme = themes.get(id);
    const button = node('button', 'theme-swatch studio-theme-swatch');
    button.type = 'button';
    button.dataset.themeChoice = id;
    button.setAttribute('aria-label', theme.label + ' teması');
    button.style.setProperty('--swatch-paper', theme.colors.paper);
    button.style.setProperty('--swatch-accent', theme.colors.accent);
    button.append(node('span', '', theme.label));
    return button;
  }));

  const storeKey = 'living-book:style-library:v1';
  const libraryFormat = 'living-book-style-v1';
  const profileNumbers = {
    fontScale: [.8, 1.6], lineHeight: [1.45, 2.05], letterSpacing: [0, .08], paragraphSpacing: [0, .6],
    textWidth: [80, 100], pageMargin: [.75, 1.25], surfaceBrightness: [85, 110], paperTexture: [0, .1],
    decorativeLight: [0, 1], edgeShade: [0, .2],
  };
  const profileChoices = {
    theme: [...themes.keys()], readerFont: ['lora','georgia','system','sans'], textAlign: ['left','justify'],
    temperature: ['neutral','warm','cool'], contrast: ['low','normal','high'],
    ...Object.fromEntries(Object.entries(options).map(([key, [, values]]) => [key, values.map(([value]) => value)])),
  };

  function safeProfile(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.name !== 'string') return null;
    const name = input.name.trim().slice(0, 56);
    const style = input.style;
    if (!name || !style || typeof style !== 'object' || Array.isArray(style) || !themes.has(style.theme)) return null;
    const clean = {};
    for (const [key, range] of Object.entries(profileNumbers)) {
      if (Number.isFinite(style[key]) && style[key] >= range[0] && style[key] <= range[1]) clean[key] = style[key];
    }
    for (const [key, values] of Object.entries(profileChoices)) {
      if (values.includes(style[key])) clean[key] = style[key];
    }
    if (typeof style.reduceMotion === 'boolean') clean.reduceMotion = style.reduceMotion;
    Object.assign(clean, window.BookBindingStudio?.styleProfile(style) || {});
    return {name, style: clean};
  }

  function mount() {
    const reader = window.BookReader;
    const look = document.getElementById('hub-page-look');
    if (!reader || !look) return;
    const custom = node('details', 'studio-workshop');
    custom.append(node('summary', '', 'Sayfa tasarım atölyesi'));
    const status = node('p', 'hub-status');
    status.setAttribute('role', 'status');
    const controls = {};
    for (const [key, [caption, values]] of Object.entries(options)) {
      const label = node('label', 'hub-field');
      const select = node('select');
      select.id = 'studio-' + key;
      for (const [value, text] of values) {
        const option = node('option', '', text);
        option.value = value;
        select.append(option);
      }
      select.addEventListener('change', () => reader.update({[key]: select.value}));
      controls[key] = select;
      label.append(node('span', '', caption), select);
      custom.append(label);
    }
    const library = node('section', 'studio-library');
    const heading = node('h3', 'hub-group-title', 'Kişisel tema kitaplığı');
    const name = node('input');
    name.id = 'studio-profile-name';
    name.maxLength = 56;
    name.placeholder = 'Tema adı';
    name.setAttribute('aria-label', 'Tema adı');
    const saved = node('select');
    saved.id = 'studio-profile-list';
    saved.setAttribute('aria-label', 'Kaydedilen temalar');
    const file = node('input');
    file.type = 'file';
    file.accept = 'application/json,.json';
    file.hidden = true;

    function load() {
      try {
        const rows = JSON.parse(localStorage.getItem(storeKey) || '[]');
        return Array.isArray(rows) ? rows.slice(0, 40).map(safeProfile).filter(Boolean) : [];
      } catch { return []; }
    }

    function write(profiles) {
      try {
        localStorage.setItem(storeKey, JSON.stringify(profiles));
        return true;
      } catch {
        status.textContent = 'Tema kitaplığına kayıt yapılamadı.';
        return false;
      }
    }

    const profileActions = node('div', 'studio-actions');
    const selected = () => load().find(profile => profile.name === saved.value);
    const use = action('Uygula', () => {
      const profile = selected();
      if (!profile) return;
      const defaults = safeProfile({name: 'Varsayılan', style: {...reader.defaults(), ...window.BookBindingStudio?.defaults}});
      reader.update({...defaults?.style, ...profile.style});
      status.textContent = profile.name + ' uygulandı.';
    }, 'studio-profile-apply');
    const remove = action('Sil', () => {
      const profile = selected();
      if (profile && write(load().filter(row => row.name !== profile.name))) {
        render();
        status.textContent = profile.name + ' silindi.';
      }
    }, 'studio-profile-delete');
    const exportTheme = action('Dışa aktar', () => {
      const profile = selected();
      if (!profile) return;
      const blob = new Blob([JSON.stringify({format: libraryFormat, profile}, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const link = node('a');
      link.href = url;
      link.download = profile.name.replace(/[\\/:*?"<>|]/g, '-') + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'studio-profile-export');

    function render(wanted = saved.value) {
      const profiles = load();
      const hint = node('option', '', profiles.length ? 'Kayıt seç' : 'Henüz kayıt yok');
      hint.value = '';
      saved.replaceChildren(hint, ...profiles.map(profile => {
        const option = node('option', '', profile.name);
        option.value = profile.name;
        return option;
      }));
      saved.value = profiles.some(profile => profile.name === wanted) ? wanted : '';
      syncActions();
    }

    function syncActions() {
      use.disabled = remove.disabled = exportTheme.disabled = !saved.value;
    }

    function save(profile, importMode = false) {
      if (!profile) {
        status.textContent = importMode ? 'Geçerli bir tema dosyası seç.' : 'Önce temana bir ad ver.';
        return;
      }
      const profiles = load();
      const match = profiles.findIndex(row => row.name.toLocaleLowerCase('tr-TR') === profile.name.toLocaleLowerCase('tr-TR'));
      if (match >= 0 && importMode) {
        status.textContent = 'Bu adla bir tema var. Önce mevcut kaydı sil.';
        return;
      }
      if (match >= 0) profiles[match] = profile;
      else if (profiles.length < 40) profiles.push(profile);
      else {
        status.textContent = '40 tema sınırına ulaştın. Bir kaydı sil.';
        return;
      }
      if (!write(profiles)) return;
      render(profile.name);
      status.textContent = profile.name + (importMode ? ' içe aktarıldı.' : ' kaydedildi.');
    }

    const importTheme = action('İçe aktar', () => file.click(), 'studio-profile-import');
    file.addEventListener('change', async () => {
      try {
        const incoming = file.files[0];
        if (!incoming) return;
        if (incoming.size > 16000) throw Error('Büyük dosya');
        const payload = JSON.parse(await incoming.text());
        if (payload.format !== libraryFormat) throw Error('Bilinmeyen biçim');
        save(safeProfile(payload.profile), true);
      } catch { status.textContent = 'Tema dosyası okunamadı.'; }
      finally { file.value = ''; }
    });
    saved.addEventListener('change', syncActions);
    window.addEventListener('storage', event => { if (event.key === storeKey) render(); });
    const saveTheme = action('Kendi Temamı Kaydet', () => save(safeProfile({name: name.value, style: reader.settings()})), 'studio-profile-save');
    profileActions.append(use, remove, exportTheme, importTheme);
    library.append(heading, name, saveTheme, saved, profileActions, file,
      node('p', 'hub-hint', 'Tema kayıtları bu tarayıcıda tutulur. Başka bir kitap adresine dosya olarak aktarabilirsin.'), status);
    custom.append(library);
    look.append(custom);

    function sync() {
      const settings = reader.settings();
      for (const [key, select] of Object.entries(controls)) select.value = settings[key];
    }
    document.addEventListener('book:settings', sync);
    render();
    sync();
  }

  window.BookStyleStudio = Object.freeze({defaults, geometry, available, validate, apply, label:id=>themes.get(id)?.label});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();
