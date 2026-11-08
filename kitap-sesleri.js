(() => {
  'use strict';
  const id = String(window.BOOK_PLAN?.storageId || 'digital-book').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\d]+/gu, '-');
  const key = 'book:' + id + ':sounds';
  const toggle = document.getElementById('book-sounds');
  const Context = window.AudioContext || window.webkitAudioContext;
  let enabled = false;
  const levels = {book:.75, scene:.65};
  try {
    enabled = localStorage.getItem(key) === 'true';
    const saved = JSON.parse(localStorage.getItem(key + ':levels') || 'null');
    for (const group of Object.keys(levels)) if (Number.isFinite(saved?.[group])) levels[group] = Math.max(0, Math.min(1,saved[group]));
  } catch {}
  let context, active, activeGroup = null, clockChapter = null, generation = 0;
  let intensity = 1;
  const buffers = new Map(), clocks = new Set();
  const effects = {
    page: { file: 'sayfa', duration: .62, gain: .26, group: 'book' },
    open: { file: 'sayfa', duration: .82, gain: .22, rate: .71, group: 'book' },
    close: { file: 'sayfa', duration: .37, gain: .19, rate: .61, group: 'book' },
    ribbon: { file: 'sayfa', duration: .18, gain: .14, rate: 1.38, group: 'book' },
    journal: { file: 'sayfa', duration: .48, gain: .17, rate: .94, group: 'book' },
    clock: { file: 'saat', duration: 2.6, gain: .18 },
    street: { file: 'sokak', duration: 2.8, gain: .09 },
    fairy: { file: 'peri', duration: 1.8, gain: .1 },
    glitter: { file: 'parilti', duration: 2.1, gain: .09 },
    forest: { file: 'orman', duration: 3.2, gain: .1 },
    transition: { file: 'gecis', duration: 2.4, gain: .065 },
    magic: { file: 'buyu', duration: 2.2, gain: .09 }
  };
  const stop = () => {
    generation += 1;
    clockChapter = null;
    activeGroup = null;
    if (active) { try { active.stop(); } catch {} active = null; }
  };
  const unlock = () => {
    if (!enabled || !Context || document.hidden) return;
    try {
      context ||= new Context();
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {}
  };
  const setEnabled = (value) => {
    enabled = Boolean(value);
    if (toggle) toggle.checked = enabled;
    try { localStorage.setItem(key, String(enabled)); } catch {}
    if (enabled) unlock(); else { stop(); context?.suspend().catch(() => {}); }
  };
  const load = (kind) => {
    const file = effects[kind].file;
    if (!buffers.has(file)) buffers.set(file, fetch(`./assets/sounds/${file}.wav`, { cache: 'force-cache' })
      .then((response) => { if (!response.ok) throw new Error('Unavailable effect'); return response.arrayBuffer(); })
      .then((bytes) => context.decodeAudioData(bytes))
      .catch(() => { buffers.delete(file); return null; }));
    return buffers.get(file);
  };
  const play = async (kind, chapter = null) => {
    const effect = effects[kind];
    if (!effect || !enabled || !context || context.state !== 'running' || document.hidden) return false;
    const group = effect.group || 'scene';
    if (!levels[group] || (group === 'scene' && (!intensity || activeGroup === 'book'))) return false;
    stop();
    clockChapter = chapter;
    activeGroup = group;
    const ticket = generation;
    const buffer = await load(kind);
    if (!buffer || ticket !== generation || !enabled || document.hidden || context.state !== 'running') {
      if (ticket === generation) stop();
      return false;
    }
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    const rate = effect.rate || 1;
    const sample = Math.min(buffer.duration, effect.duration * rate);
    const duration = sample / rate;
    const now = context.currentTime;
    source.playbackRate.value = rate;
    gain.gain.setValueAtTime(0, now);
    const level = effect.gain * levels[group] * (group === 'book' ? 1 : intensity);
    gain.gain.linearRampToValueAtTime(level, now + Math.min(.16, duration / 4));
    gain.gain.setValueAtTime(level, now + Math.max(Math.min(.16,duration/4),duration*.68));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(gain).connect(context.destination);
    active = source;
    source.onended = () => { source.disconnect(); gain.disconnect(); if (active === source) { active = null; activeGroup = null; clockChapter = null; } };
    source.start(0, 0, sample);
    return true;
  };
  const page = () => { void play('page'); };
  const scene = (pages) => {
    if (window.BOOK_PLAN?.sceneSounds === false) return;
    if (clockChapter !== null && !pages.some((page) => page.chapter?.number === clockChapter)) stop();
    if (!enabled || !context || context.state !== 'running') return;
    for (const page of pages) {
      const number = page.chapter?.number;
      const configured = page.chapter?.sound;
      const kind = configured?.id;
      const pattern = configured?.when || 'saat|zaman|çan';
      if (page.type !== 'text' || !effects[kind] || clocks.has(number) || !new RegExp(pattern, 'iu').test(page.raw || '')) continue;
      clocks.add(number);
      void play(kind, number).then((played) => { if (!played) clocks.delete(number); });
      break;
    }
  };
  if (toggle) {
    toggle.checked = enabled;
    toggle.disabled = !Context;
    toggle.addEventListener('change', () => setEnabled(toggle.checked));
  }
  document.addEventListener('pointerdown', (event) => { if (event.isTrusted) unlock(); }, { capture: true, passive: true });
  document.addEventListener('keydown', (event) => { if (event.isTrusted && ['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) unlock(); }, { capture: true });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('#music-silent, #audio-toggle, #cover-audio-toggle');
    if (target?.id === 'music-silent') setEnabled(false);
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); context?.suspend().catch(() => {}); } });
  window.addEventListener('pagehide', stop);
  const setIntensity = (mode) => { intensity = mode === 'off' ? 0 : mode === 'light' ? .45 : 1; if (!intensity && clockChapter !== null) stop(); };
  function mountLevels() {
    const panel = document.getElementById('hub-page-audio');
    if (!panel || !Context) return;
    for (const [group, title] of [['book','Kitap efektleri'],['scene','Sahne sesleri']]) {
      const label = document.createElement('label');
      label.className = 'hub-field';
      const caption = document.createElement('span');
      caption.textContent = title;
      const input = document.createElement('input');
      input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1';
      input.value = String(Math.round(levels[group] * 100));
      input.id = 'book-sound-level-' + group;
      input.addEventListener('input', () => {
        levels[group] = Number(input.value) / 100;
        if (levels[group] === 0 && activeGroup === group) stop();
        try {localStorage.setItem(key + ':levels',JSON.stringify(levels));} catch {}
      });
      label.append(caption,input);
      panel.append(label);
    }
  }
  document.addEventListener('DOMContentLoaded', mountLevels, {once:true});
  window.BookSounds = Object.freeze({
    page, scene, stop, stopScene:()=>{if(clockChapter!==null)stop();},play,setEnabled,setIntensity,
    open:()=>void play('open'),close:()=>void play('close'),ribbon:()=>void play('ribbon'),journal:()=>void play('journal'),
  });
})();
