(() => {
  'use strict';

  const reader = window.BookReader;
  const plan = window.BOOK_PLAN;
  const clock = document.querySelector('.reader-header .session-clock');
  if (!reader || !plan || !clock) return;

  const route = document.createElement('span');
  route.className = 'reading-route';
  route.setAttribute('role', 'progressbar');
  route.setAttribute('aria-label', 'Hikâye rotası');
  route.setAttribute('aria-valuemin', '0');
  route.innerHTML = `
    <span class="reading-route-map" aria-hidden="true">
      <svg class="reading-route-road" viewBox="0 0 100 32" preserveAspectRatio="none">
        <path class="reading-route-base" d="M4 20 C16 10 23 10 34 18 S51 27 63 17 S83 9 96 18"/>
        <path class="reading-route-fill" pathLength="100" d="M4 20 C16 10 23 10 34 18 S51 27 63 17 S83 9 96 18"/>
        <g class="reading-route-arrows"></g>
      </svg>
      <span class="reading-route-stops"></span>
      <span class="reading-route-runner"><img src="./assets/images/reading-rabbit.webp" alt="" draggable="false"></span>
      <span class="reading-route-heart" hidden>♥</span>
    </span>
    <span class="reading-route-range" aria-hidden="true">
      <span data-route-start>0</span><span class="reading-route-caption">Başlangıç</span><span data-route-end>50</span>
    </span>`;
  clock.append(route);

  const map = route.querySelector('.reading-route-map');
  const path = route.querySelector('.reading-route-base');
  const fill = route.querySelector('.reading-route-fill');
  const stops = route.querySelector('.reading-route-stops');
  const runner = route.querySelector('.reading-route-runner');
  const heart = route.querySelector('.reading-route-heart');
  const startLabel = route.querySelector('[data-route-start]');
  const endLabel = route.querySelector('[data-route-end]');
  const caption = route.querySelector('.reading-route-caption');
  const pathLength = path.getTotalLength();
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const celebrated = new Set();
  let previousLocation;
  let hop;
  let previousWindow = -1;
  let stopSignature = '';
  let resizeFrame = 0;
  let resetFrame = 0;

  function point(fraction) {
    return path.getPointAtLength(pathLength * Math.max(0, Math.min(1, fraction)));
  }

  function position(node, fraction) {
    const at = point(fraction);
    node.style.left = at.x + '%';
    node.style.top = at.y / 32 * 100 + '%';
  }

  const arrowGroup = route.querySelector('.reading-route-arrows');
  for (const fraction of [.2, .5, .8]) {
    const at = point(fraction);
    const next = point(fraction + .01);
    const angle = Math.atan2(next.y - at.y, next.x - at.x) * 180 / Math.PI;
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('d', 'm-1.2 -1.5 1.8 1.5-1.8 1.5');
    arrow.setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${angle})`);
    arrowGroup.append(arrow);
  }

  function celebrate(location, completed, finalPage, reduced, locationChanged) {
    if (reduced) hop?.cancel();
    if (!locationChanged) return;
    const previous = previousLocation;
    previousLocation = location;
    if (!previous || location.page <= previous.page || location.offset < previous.offset) return;
    const milestone = finalPage ? 'end' : location.page - previous.page <= 2 ? completed : null;
    if (!milestone || celebrated.has(milestone)) return;
    celebrated.add(milestone);
    if (reduced) return;
    hop?.cancel();
    hop = runner.animate([
      { transform: 'translate(-50%, -50%)' },
      { transform: 'translate(-50%, calc(-50% - 6px)) scale(1.07)', offset: .48 },
      { transform: 'translate(-50%, -50%)' },
    ], { id: 'rabbit-hop', duration: 450, easing: 'ease-in-out' });
  }

  function update(locationChanged = false) {
    const location = reader.location();
    if (!location.open || !location.total) {
      previousLocation = undefined;
      hop?.cancel();
      return;
    }

    const page = Math.max(1, Math.min(location.total, location.page));
    const start = Math.floor((page - 1) / 50) * 50;
    const end = Math.min(start + 50, location.total);
    const span = Math.max(1, end - start);
    const fraction = (page - start) / span;
    const chapters = reader.chapters().filter(chapter => chapter.page > 0);
    const current = plan.chapters.filter(chapter => chapter.offset <= location.offset).at(-1);
    const reduced = reader.settings().reduceMotion || motionPreference.matches;
    route.dataset.motion = reduced ? 'off' : 'on';
    const visibleLeaves = location.mode === 'scroll' ? [] : reader.visiblePages();
    const finalPage = location.anchor.leaf === 'end' || visibleLeaves.some(node => node.dataset.pageType === 'end');
    const summary = visibleLeaves.find(node => node.dataset.pageType === 'discovery');
    const completed = location.anchor.leaf === 'discovery' ? current?.id
      : summary && plan.chapters.findLast(chapter => chapter.offset <= Number(summary.dataset.sourceStart))?.id;
    heart.hidden = !finalPage;
    if (finalPage) position(heart, fraction);
    celebrate(location, completed, finalPage, reduced, locationChanged);

    if (previousWindow !== start) {
      cancelAnimationFrame(resetFrame);
      route.classList.add('route-reset');
      resetFrame = requestAnimationFrame(() => {
        resetFrame = requestAnimationFrame(() => route.classList.remove('route-reset'));
      });
      previousWindow = start;
    }

    position(runner, fraction);
    fill.style.strokeDashoffset = String(100 - fraction * 100);
    route.dataset.page = String(page);
    route.dataset.windowStart = String(start);
    route.dataset.windowEnd = String(end);
    route.setAttribute('aria-valuenow', String(page));
    route.setAttribute('aria-valuemax', String(location.total));
    route.setAttribute('aria-valuetext', `${page} / ${location.total}. ${location.chapter}. ${start}–${end} aralığı.${finalPage ? ' Yolculuk tamamlandı.' : ''}`);
    const unit = location.mode === 'scroll' ? 'Kesit' : 'Sayfa';
    route.title = `${unit} ${page} / ${location.total} · ${location.chapter}`;
    startLabel.textContent = String(start);
    endLabel.textContent = String(end);
    caption.textContent = current ? `Bölüm ${current.number}` : 'Başlangıç';

    const candidates = chapters.filter(chapter => chapter.page >= start && chapter.page <= end);
    const preceding = chapters.filter(chapter => chapter.page < start).at(-1);
    if (preceding) candidates.unshift(preceding);
    const minimumGap = 29 / Math.max(100, map.clientWidth);
    const visible = [];
    candidates.sort((left, right) => Math.abs(left.page - page) - Math.abs(right.page - page));
    for (const chapter of candidates) {
      const progress = Math.max(0, Math.min(1, (chapter.page - start) / span));
      if (visible.length >= 4 || visible.some(item => Math.abs(item.progress - progress) < minimumGap)) continue;
      const planned = plan.chapters.find(item => item.id === chapter.id);
      const image = planned?.galleryImage;
      visible.push({ chapter, image, progress, revealed: Boolean(image && image.unlock <= location.offset) });
    }
    visible.sort((left, right) => left.progress - right.progress);
    const signature = visible.map(item => `${item.chapter.id}:${item.chapter.page}:${item.revealed}`).join('|') + ':' + start;
    if (signature === stopSignature) return;
    stopSignature = signature;
    stops.replaceChildren();
    for (const item of visible) {
      const stop = document.createElement('span');
      stop.className = 'reading-route-stop';
      stop.dataset.chapter = item.chapter.id;
      stop.dataset.revealed = String(item.revealed);
      stop.title = `${item.chapter.title} · ${unit} ${item.chapter.page}`;
      if (item.revealed) {
        const image = document.createElement('img');
        image.src = './' + item.image.src.replace(/\.webp$/, '-480.webp');
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        stop.append(image);
      } else {
        const landscape = document.createElement('span');
        landscape.className = 'reading-route-landscape';
        const planned = plan.chapters.find(chapter => chapter.id === item.chapter.id);
        const place = window.STORY_WORLD?.facts.find(fact => fact.kind === 'places' && fact.id === planned?.place);
        landscape.style.backgroundPosition = `${place?.x || 50}% ${place?.y || 50}%`;
        stop.append(landscape);
      }
      position(stop, item.progress);
      stops.append(stop);
    }
  }

  document.addEventListener('book:location', () => update(true));
  document.addEventListener('book:settings', () => update());
  motionPreference.addEventListener('change', () => update());
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      stopSignature = '';
      update();
    });
  }).observe(map);
  update();
})();
