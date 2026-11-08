(() => {
  'use strict';
  const reader = window.BookReader;
  const app = document.getElementById('app');
  if (!reader || !app) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'illustration-studio';
  dialog.id = 'illustration-studio';
  dialog.setAttribute('aria-labelledby', 'illustration-studio-title');
  const title = document.createElement('h2');
  title.id = 'illustration-studio-title';
  const header = document.createElement('header');
  header.className = 'illustration-head';
  const tools = document.createElement('div');
  tools.className = 'illustration-tools';
  const viewport = document.createElement('div');
  viewport.className = 'illustration-inspection';
  viewport.tabIndex = 0;
  viewport.setAttribute('aria-label', 'Görseli sürükleyerek incele. Oklar kaydırır, artı ve eksi yakınlaştırır.');
  const picture = document.createElement('img');
  picture.draggable = false;
  const lens = document.createElement('div');
  lens.className = 'illustration-lens';
  lens.hidden = true;
  lens.setAttribute('aria-hidden', 'true');
  const paper = document.createElement('div');
  paper.className = 'illustration-paper';
  paper.hidden = true;
  paper.setAttribute('role', 'img');
  const stage = document.createElement('div');
  stage.className = 'illustration-paper-stage';
  paper.append(stage);
  const status = document.createElement('p');
  status.className = 'illustration-status';
  status.setAttribute('role', 'status');
  viewport.append(picture, lens);
  const pointers = new Map();
  let returnFocus, scene, fallbackSource, requestedSource;
  let scale = 1, x = 0, y = 0, fitWidth = 0, fitHeight = 0, magnifying = false;
  const touchControls = () => matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;

  function button(label, callback) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = label;
    control.addEventListener('click', callback);
    return control;
  }
  const decrease = button('−', () => zoom(scale / 1.3));
  decrease.setAttribute('aria-label', 'Uzaklaştır');
  const increase = button('+', () => zoom(scale * 1.3));
  increase.setAttribute('aria-label', 'Yakınlaştır');
  const reset = button('Sıfırla', () => { scale = 1; x = y = 0; paint(); });
  const magnifier = button('Büyüteç', () => {
    magnifying = !magnifying;
    magnifier.setAttribute('aria-pressed', String(magnifying));
    lens.hidden = true;
  });
  const exhibit = button('Kâğıt sahne', () => showPaper(paper.hidden));
  const close = button('Kapat', () => dialog.close());
  close.className = 'illustration-close';
  const retry = button('Yeniden dene', () => requestImage());
  retry.hidden = true;
  const hint = document.createElement('p');
  hint.className = 'illustration-hint';
  hint.textContent = 'İki parmakla yakınlaştır. Büyütülmüş görseli sürükleyerek gez. Sıfırla ile tamamını göster.';
  header.append(title, close);
  tools.append(decrease, increase, reset, magnifier, exhibit, retry);
  dialog.append(header, tools, viewport, paper, status, hint);
  app.append(dialog);

  let imageFrame = 0;
  let viewBox;
  function schedulePaint() {
    if (!imageFrame) imageFrame = requestAnimationFrame(paint);
  }
  function paint() {
    if (imageFrame) cancelAnimationFrame(imageFrame);
    imageFrame = 0;
    const box = viewBox || viewport.getBoundingClientRect();
    const edgeX = Math.max(0, (fitWidth * scale - box.width) / 2);
    const edgeY = Math.max(0, (fitHeight * scale - box.height) / 2);
    x = Math.max(-edgeX, Math.min(edgeX, x));
    y = Math.max(-edgeY, Math.min(edgeY, y));
    picture.style.transform = 'translate(-50%, -50%) translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
    const percentage = '%' + Math.round(scale * 100);
    if (status.textContent !== percentage) status.textContent = percentage;
    decrease.disabled = scale <= 1;
    increase.disabled = scale >= 5;
    lens.hidden = true;
  }

  function zoom(value, px = 0, py = 0, defer = false) {
    const next = Math.max(1, Math.min(5, value));
    const ratio = next / scale;
    x = px - (px - x) * ratio;
    y = py - (py - y) * ratio;
    scale = next;
    if (defer) schedulePaint();
    else paint();
  }

  function fit() {
    if (!dialog.open || viewport.hidden || viewport.getAttribute('aria-busy') === 'true' || !picture.naturalWidth) return;
    const box = viewport.getBoundingClientRect();
    viewBox = box;
    const ratio = Math.min(box.width / picture.naturalWidth, box.height / picture.naturalHeight);
    fitWidth = picture.naturalWidth * ratio;
    fitHeight = picture.naturalHeight * ratio;
    picture.style.width = fitWidth + 'px';
    picture.style.height = fitHeight + 'px';
    paint();
  }

  function point(event) {
    const box = viewBox || viewport.getBoundingClientRect();
    return {x: event.clientX - box.left - box.width / 2, y: event.clientY - box.top - box.height / 2};
  }
  const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y);
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    viewBox = viewport.getBoundingClientRect();
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point(event));
    lens.hidden = true;
  });
  viewport.addEventListener('pointermove', event => {
    const next = point(event);
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      if (!magnifying || event.pointerType === 'touch') return;
      const image = picture.getBoundingClientRect();
      const relativeX = event.clientX - image.left;
      const relativeY = event.clientY - image.top;
      if (relativeX < 0 || relativeY < 0 || relativeX > image.width || relativeY > image.height) {lens.hidden = true; return;}
      const box = viewport.getBoundingClientRect();
      const factor = 2.25;
      lens.hidden = false;
      lens.style.left = (event.clientX - box.left) + 'px';
      lens.style.top = (event.clientY - box.top) + 'px';
      lens.style.backgroundImage = 'url(' + JSON.stringify(picture.src) + ')';
      lens.style.backgroundSize = (image.width * factor) + 'px ' + (image.height * factor) + 'px';
      lens.style.backgroundPosition = (lens.offsetWidth / 2 - relativeX * factor) + 'px ' + (lens.offsetHeight / 2 - relativeY * factor) + 'px';
      return;
    }
    pointers.set(event.pointerId, next);
    if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
      x += (next.x - previous.x) / 2;
      y += (next.y - previous.y) / 2;
      zoom(scale * distance(next, other) / Math.max(4, distance(previous, other)), (next.x + other.x) / 2, (next.y + other.y) / 2, true);
    } else {
      x += next.x - previous.x;
      y += next.y - previous.y;
      schedulePaint();
    }
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) viewport.addEventListener(type, event => pointers.delete(event.pointerId));
  viewport.addEventListener('pointerleave', () => {lens.hidden = true;});
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const at = point(event);
    zoom(scale * Math.exp(-event.deltaY / 550), at.x, at.y);
  }, {passive:false});
  viewport.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') zoom(scale * 1.3);
    else if (event.key === '-') zoom(scale / 1.3);
    else if (event.key === 'ArrowLeft') { x += 35; paint(); }
    else if (event.key === 'ArrowRight') { x -= 35; paint(); }
    else if (event.key === 'ArrowUp') { y += 35; paint(); }
    else if (event.key === 'ArrowDown') { y -= 35; paint(); }
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
  function loaded() {
    if (!dialog.open) return;
    viewport.setAttribute('aria-busy', 'false');
    picture.style.visibility = '';
    retry.hidden = true;
    fit();
  }
  picture.addEventListener('load', loaded);
  picture.addEventListener('error', () => {
    if (!dialog.open) return;
    if (fallbackSource && picture.src !== fallbackSource) {
      picture.src = fallbackSource;
      return;
    }
    viewport.setAttribute('aria-busy', 'false');
    status.textContent = 'Görsel yüklenemedi. Yeniden deneyebilirsin.';
    retry.hidden = false;
  });
  viewport.addEventListener('dblclick', event => {
    event.preventDefault();
    const at = point(event);
    zoom(scale > 1 ? 1 : 2, at.x, at.y);
  });
  new ResizeObserver(fit).observe(viewport);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  paper.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduced.matches || reader.settings().reduceMotion) return;
    const box = paper.getBoundingClientRect();
    stage.style.setProperty('--paper-y', ((event.clientX - box.left) / box.width - .5) * 8 + 'deg');
    stage.style.setProperty('--paper-x', (.5 - (event.clientY - box.top) / box.height) * 6 + 'deg');
  });
  paper.addEventListener('pointerleave', () => {stage.style.removeProperty('--paper-x'); stage.style.removeProperty('--paper-y');});

  function showPaper(show) {
    if (show && !scene) return;
    paper.hidden = !show;
    viewport.hidden = show;
    exhibit.textContent = show ? 'Çizime dön' : 'Kâğıt sahne';
    for (const control of [decrease, increase, reset, magnifier]) {
      control.hidden = show || control === magnifier && touchControls();
    }
    stage.replaceChildren();
    stage.style.removeProperty('--paper-x');
    stage.style.removeProperty('--paper-y');
    if (!show) { fit(); return; }
    paper.setAttribute('aria-label', scene.description);
    status.textContent = scene.description;
    for (const layer of scene.layers) {
      const plane = document.createElement('img');
      plane.alt = '';
      plane.className = 'paper-scene-layer';
      plane.style.setProperty('--paper-depth', layer.depth + 'px');
      plane.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 570">' + layer.art + '</svg>');
      stage.append(plane);
    }
  }

  function requestImage() {
    viewport.setAttribute('aria-busy', 'true');
    picture.style.visibility = 'hidden';
    status.textContent = 'Görsel yükleniyor…';
    retry.hidden = true;
    picture.src = requestedSource;
    queueMicrotask(() => {
      if (picture.complete && picture.naturalWidth) loaded();
    });
  }

  function openSource(src, { title: label = 'Hikâye görseli', alt = label, trigger = null, chapterId = null } = {}) {
    if (!src) return false;
    fallbackSource = new URL(src, document.baseURI).href;
    const details = window.STORY_WORLD?.imageDetails || {};
    const detail = Object.entries(details).find(([source]) => new URL(source, document.baseURI).href === fallbackSource)?.[1];
    requestedSource = detail?.src ? new URL(detail.src, document.baseURI).href : fallbackSource;
    const eligible = window.BOOK_LAYER_SCENES || [];
    scene = eligible.find(item => item.illustration === chapterId && reader.location().offset >= item.unlock && item.layers?.length >= 3);
    title.textContent = scene?.title || label;
    picture.alt = alt;
    returnFocus = trigger || document.activeElement;
    scale = 1; x = y = 0;
    fitWidth = fitHeight = 0;
    pointers.clear();
    magnifying = false;
    magnifier.setAttribute('aria-pressed', 'false');
    exhibit.hidden = !scene;
    document.dispatchEvent(new CustomEvent('book:panel-open', {detail:'illustration'}));
    if (!dialog.open) dialog.showModal();
    requestImage();
    showPaper(false);
    viewport.focus();
    return true;
  }

  function open(figure, trigger) {
    const image = figure.querySelector('img.illustration-image') || figure.querySelector('img');
    if (!image) return;
    const chapter = window.BOOK_PLAN?.chapters.find(item => item.id === figure.dataset.chapterArt);
    openSource(image.src, { title: chapter?.title || 'Hikâye çizimi', alt: image.alt, trigger, chapterId: chapter?.id });
  }

  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    cancelAnimationFrame(imageFrame);
    imageFrame = 0;
    viewBox = null;
    pointers.clear();
    stage.replaceChildren();
    picture.removeAttribute('src');
    lens.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  document.addEventListener('book:panel-open', event => {
    if (dialog.open && event.detail !== 'illustration') dialog.close();
  });

  function decorate() {
    for (const page of reader.visiblePages()) {
      for (const figure of page.querySelectorAll('figure[data-chapter-art]')) {
        if (!figure.querySelector('img') || figure.querySelector('.inspect-illustration')) continue;
        const trigger = button('Görseli incele', () => open(figure, trigger));
        trigger.className = 'inspect-illustration';
        trigger.setAttribute('aria-haspopup', 'dialog');
        for (const event of ['pointerdown', 'pointerup']) trigger.addEventListener(event, e => e.stopPropagation());
        figure.append(trigger);
      }
      for (const summary of page.querySelectorAll('.discovery-summary')) {
        const image = summary.querySelector('img.closing-image');
        if (!image || summary.querySelector('.inspect-closing-illustration')) continue;
        const trigger = button('Görseli incele', () => openSource(image.src, { title:'Bölümün hikâye çizimi', alt:image.alt, trigger }));
        trigger.className = 'inspect-closing-illustration';
        summary.append(trigger);
      }
    }
  }
  document.addEventListener('book:location', decorate);
  window.BookIllustrations = Object.freeze({ openSource });
  decorate();
})();
