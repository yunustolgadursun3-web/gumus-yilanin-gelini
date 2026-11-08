(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const seen = new Set();
  const active = new Map();
  const patterns = new Map();
  let frame = 0;
  const enhancedScenes = new Set([2, 5]);
  const sketches = {
    clock: '<circle cx="64" cy="29" r="22"/><path d="M64 7V3m-7 0h14M42 11l-5-5m49 5 5-5"/><g class="fx-clock-hand"><path d="M64 13v16l12 6"/></g><circle cx="64" cy="29" r="2"/>',
    compass: '<circle cx="60" cy="28" r="21"/><circle cx="60" cy="28" r="17"/><path d="M60 3v5m0 40v5M35 28h5m40 0h5"/><g class="fx-needle"><path d="m68 16-4 17-12 7 4-17z"/></g>',
    wind: '<path d="M7 17h77q13 0 13-9M4 30h91q15 0 15 10M12 45h46" opacity=".4"/><g class="fx-leaf"><path d="M28 20q-2-14 16-13 0 17-16 13zm0 0 12-10"/></g><g class="fx-leaf fx-leaf--second"><path d="M78 43q-2-14 16-13 0 17-16 13zm0 0 12-10"/></g>',
    carousel: '<path d="M25 25h78L64 5zM33 25v23m31-23v23m31-23v23M24 52h80M64 5V1M28 48h72"/><g class="fx-carousel-horse"><path d="M40 37q6-9 13-3l7-1-4 9-11-2-2 6m11-6 4 6"/></g><g class="fx-carousel-horse fx-carousel-horse--second"><path d="M73 37q6-9 13-3l7-1-4 9-11-2-2 6m11-6 4 6"/></g>',
    train: '<g class="fx-train"><path d="M12 39h96V23H57V11H38v28m-9-16V9H18v30M9 9h23M58 23V8h28v15M64 14h16M98 23v16M6 49h108"/><circle cx="26" cy="41" r="7"/><circle cx="49" cy="41" r="7"/><circle cx="84" cy="41" r="7"/><path d="M21 4Q12-6 29-9m64 40h10"/></g>',
  };
  const drawings = {
    bell: '<path d="M43 40h43L79 31V19a15 15 0 0 0-30 0v12zM58 45q7 9 13 0M64 3v4m-30 8-8-6m68 6 8-6"/>',
    bird: '<path d="M9 30q17-24 42-8l13 8 13-8q25-16 42 8L73 43l-9-8-9 8zM64 30l5-14"/>',
    key: '<circle cx="82" cy="20" r="14"/><circle cx="82" cy="20" r="5"/><path d="M71 30 41 51m10-7 7 7m-16-1 6 6M24 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
    clock: "<circle cx=\"64\" cy=\"29\" r=\"22\"/><path d=\"M64 13v17l12 6M64 7V3m-7 0h14M42 11l-5-5m49 5 5-5\"/>",
    rings: "<g><circle cx=\"64\" cy=\"16\" r=\"9\"/><circle cx=\"75\" cy=\"22\" r=\"9\"/><circle cx=\"78\" cy=\"35\" r=\"9\"/><circle cx=\"69\" cy=\"44\" r=\"9\"/><circle cx=\"56\" cy=\"44\" r=\"9\"/><circle cx=\"48\" cy=\"33\" r=\"9\"/><circle cx=\"51\" cy=\"20\" r=\"9\"/></g>",
    carousel: "<path d=\"M25 25h78L64 5zm3 23h72M33 25v23m31-23v23m31-23v23M24 52h80M64 5V1M40 37q6-9 13-3l7-1-4 9-11-2-2 6m11-6 4 6m15-9q6-9 13-3l7-1-4 9-11-2-2 6\"/>",
    dragon: "<path d=\"M33 36q11-20 31-7l12-9 13 5-6 10-13 1-10 9-19-3-6 9m27-6 9 7M46 29 33 8l20 8 12-12 3 25M33 36Q12 19 14 35q0 13 21 7m45-17 3-8m8 14 9 2m-7 9 10-2\"/><circle cx=\"80\" cy=\"27\" r=\"1\"/>",
    ship: "<path d=\"M22 37h83L91 49H38zM65 5v32M62 7 37 32h25m7-24 24 24H69M13 53q9-5 18 0t18 0 18 0 18 0 18 0m-79-32 11-3\"/>",
    chess: "<path d=\"m48 12 8 11 8-14 8 14 8-11-4 20H52zm6 20-7 17h34l-7-17M42 53h44M64 1v7m-3-4h6\"/>",
    train: '<g class="fx-train"><path d="M12 39h96V23H57V11H38v28m-9-16V9H18v30M9 9h23M58 23V8h28v15M64 14h16M98 23v16M6 49h108"/><circle cx="26" cy="41" r="7"/><circle cx="49" cy="41" r="7"/><circle cx="84" cy="41" r="7"/><path d="M21 4Q12-6 29-9m64 40h10"/></g>',
    wind: '<path d="M10 20h66q17 0 17-9 0-10-12-6M4 30h99q16 0 16 10 0 11-14 7M21 40h45q14 0 14 8M27 10h25M10 49h30"/>',
    stars: '<path d="m30 8 4 12 12 4-12 4-4 12-4-12-12-4 12-4zm61 15 3 8 8 3-8 3-3 8-3-8-8-3 8-3zM60 7v6m-3-3h6m47 2v6m-3-3h6"/><circle cx="59" cy="39" r="1.3"/><circle cx="71" cy="22" r="1"/>',
    storm: '<path d="M21 25q-9-14 8-18 13-4 20 7 17-12 26 3 15-2 18 9H21M27 35l-5 10m22-10-5 10m35-10-5 10m22-10-5 10M56 25l-7 12h9l-6 13"/>',
    compass: '<circle cx="60" cy="28" r="21"/><circle cx="60" cy="28" r="17"/><path d="m68 16-4 17-12 7 4-17zM60 3v5m0 40v5M35 28h5m40 0h5M18 18q-8 11 0 23m83-23q8 11 0 23"/>',
    airship: '<path d="M19 29q19-21 55-13l27 10-17 13-46 1zM49 17l12-12 7 12M54 40l11 11 8-12M25 25 9 17l3 19 15-1M36 28h42M9 46h25"/><circle cx="38" cy="35" r="7"/><circle cx="83" cy="32" r="6"/>',
    signal: '<path d="M54 48h28M61 48l7-31 7 31M60 32h16M68 9v9M52 13q-11 10 0 20m32-20q11 10 0 20M43 6q-18 17 0 34m50-34q18 17 0 34"/>',
    note: '<path d="m33 7 55 4-3 42-55-4zM42 18l35 2M41 25l25 2M41 33l31 2M42 40l16 1m-18-34-9-3-4 39 4 1"/><circle cx="77" cy="42" r="5"/>',
    mechanical: '<circle cx="61" cy="28" r="15"/><circle cx="61" cy="28" r="6"/><path d="M61 5v8m0 30v8M38 28h8m30 0h8M45 12l6 6m20 20 6 6m0-32-6 6M51 38l-6 6M18 20h9m67 16h13"/>'
  };
  const finish = (node) => {
    window.clearTimeout(active.get(node));
    active.delete(node);
    node.remove();
  };
  const clear = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    [...active.keys()].forEach(finish);
  };
  const render = (root, candidates, enabled) => {
    clear();
    if (!enabled || reduced.matches || document.hidden) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      for (const page of candidates) {
        const fx = page.chapter?.microFx;
        if (page.type !== 'text' || !fx || !drawings[fx.type]) continue;
        const enhanced = enhancedScenes.has(page.chapter.number) && Boolean(sketches[fx.type]);
        const key = `${page.chapter.number}:${fx.type}`;
        if (seen.has(key)) continue;
        if (!patterns.has(fx.when)) patterns.set(fx.when, new RegExp(fx.when, 'iu'));
        if (!patterns.get(fx.when).test(page.raw || '')) continue;
        const article = root.querySelector(`[data-page-index="${page.index}"]`);
        const copy = article?.querySelector('.page-text');
        const content = article?.querySelector('.page-content');
        const folio = article?.querySelector('.folio');
        if (!copy || !content || !folio) continue;
        const textRange = document.createRange();
        textRange.selectNodeContents(copy);
        const body = textRange.getBoundingClientRect();
        const footer = folio.getBoundingClientRect();
        const box = content.getBoundingClientRect();
        const height = enhanced ? 30 : 24;
        const top = footer.top - (enhanced ? 9 : 3);
        const width = Math.min(enhanced ? 116 : 100, footer.width * (enhanced ? .36 : .32));
        // Only the quiet space beside the folio is used. Never reserve text space.
        if (top < body.bottom + 3 || top + height > box.bottom - 2 || width < 58 || !document.querySelector('#gesture-hint')?.hidden) continue;
        const node = document.createElement('span');
        node.className = `story-fx story-fx--${fx.type}`;
        node.classList.toggle('story-fx--enhanced', enhanced);
        node.dataset.fxKind = fx.type;
        node.dataset.fxChapter = String(page.chapter.number);
        node.setAttribute('aria-hidden', 'true');
        node.style.cssText = `top:${top - box.top}px;left:${footer.right - box.left - width - 24}px;width:${width}px;height:${height}px`;
        node.innerHTML = `<svg class="story-fx-ink" viewBox="0 0 128 58" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${enhanced ? sketches[fx.type] : drawings[fx.type]}</svg>`;
        seen.add(key);
        content.append(node);
        node.addEventListener('animationend', (event) => { if (event.target === node.firstElementChild) finish(node); });
        active.set(node, window.setTimeout(() => finish(node), 4100));
      }
    });
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  reduced.addEventListener?.('change', () => { if (reduced.matches) clear(); });
  window.BookSceneFx = Object.freeze({ render, clear });
})();
