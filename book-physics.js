(() => {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const radiansToDegrees = 180 / Math.PI;

  function node(className) {
    const element = document.createElement('div');
    element.className = className;
    return element;
  }

  function decorateCover(cover) {
    if (!cover || cover.querySelector(':scope > .binding-hardware')) return;
    const hardware = node('binding-hardware');
    hardware.setAttribute('aria-hidden', 'true');
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      hardware.append(node(`binding-corner binding-corner--${corner}`));
    }
    cover.append(hardware);
  }

  function canAnimate(reduced, level) {
    const memory = navigator.deviceMemory;
    return !reduced && level !== 'flat' && !document.hidden && !navigator.connection?.saveData &&
      !(memory > 0 && memory <= 2) && window.CSS?.supports('transform-style', 'preserve-3d');
  }

  function animate(duration, draw, finish) {
    let frame;
    let lastFrame;
    let elapsed = 0;
    function tick(now) {
      // A long first layout should not skip the hinge or the closing fold.
      elapsed += Math.min(now - (lastFrame ?? now), 96);
      lastFrame = now;
      const fraction = clamp(elapsed / duration, 0, 1);
      draw(fraction);
      if (fraction < 1) frame = requestAnimationFrame(tick);
      else finish();
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }

  function solidify(box, { back = true } = {}) {
    box.classList.add('book-volume');
    const faces = {};
    for (const name of ['left', 'right', 'top', 'bottom', ...(back ? ['back'] : [])]) {
      const face = document.createElement('span');
      face.className = `volume-face volume-face--${name}`;
      face.setAttribute('aria-hidden', 'true');
      faces[name] = face;
      box.append(face);
    }
    return faces;
  }

  function copyPrint(page, foldedPrint) {
    const clone = page.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    clone.querySelectorAll('.popup-leaf-panel').forEach(panel => {
      if (foldedPrint) {
        const image = document.createElement('img');
        image.className = 'popup-folded-print';
        image.src = foldedPrint;
        image.alt = '';
        panel.replaceWith(image);
      } else panel.remove();
    });
    clone.querySelectorAll('.inspect-illustration,.scene-inspect,.inspect-closing-illustration,.popup-leaf-actions').forEach(control=>control.remove());
    clone.querySelectorAll('video').forEach(video => {
      const poster = video.getAttribute('poster');
      if (poster) {
        const image = document.createElement('img');
        image.src = poster;
        image.alt = '';
        image.className = 'illustration-image is-loaded';
        video.replaceWith(image);
      } else video.remove();
    });
    return clone;
  }

  function leaf({ layer, outgoing, reverse, under, single, direction, light = false, speed = 1 }) {
    const width = outgoing.offsetWidth;
    const height = outgoing.offsetHeight;
    if (!width || !height) return null;

    const popup = window.BookPopup?.beginTurn(outgoing);
    const foldShare = popup?.share || 0;
    const stage = node('physical-turn');
    stage.inert = true;
    stage.setAttribute('aria-hidden', 'true');
    stage.dataset.direction = direction > 0 ? 'next' : 'previous';
    stage.dataset.side = single ? 'single' : direction > 0 ? 'right' : 'left';
    stage.style.setProperty('--fold-width', `${width}px`);
    const bed = under ? copyPrint(under) : node('physical-blank-bed');
    bed.classList.add('physical-under-page');
    const shadow = node('physical-fold-shadow');
    const surface = node('physical-leaf');
    stage.append(bed, shadow, surface);

    const frontPrint = copyPrint(outgoing, popup?.print(outgoing));
    const backPrint = copyPrint(reverse);
    const limited = (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
    const lightMesh = light || limited || document.getElementById('app')?.dataset.performanceLite==='true';
    const segmentCount = lightMesh ? 3 : single ? 5 : 6;
    const step = width / segmentCount;
    const bleed = .35;
    const strips = [];
    stage.style.setProperty('--fold-bleed', `${bleed}px`);

    function face(side, print, left) {
      const element = node(`physical-leaf-face physical-leaf-face--${side}`);
      const crop = print.cloneNode(true);
      crop.style.left = `${bleed - left}px`;
      element.append(crop);
      return element;
    }

    for (let index = 0; index < segmentCount; index += 1) {
      const strip = node('physical-leaf-strip');
      const near = index * step;
      const far = width - (index + 1) * step;
      strip.style.width = `${step}px`;
      strip.style.transformOrigin = `${direction > 0 ? 'left' : 'right'} center`;
      strip.append(face('front', frontPrint, direction > 0 ? near : far),
        face('back', backPrint, direction > 0 ? far : near));
      surface.append(strip);
      strips.push(strip);
    }

    let progress = 0;
    let pendingFrame = 0;
    let stopMotion;
    let destroyed = false;

    function draw(fraction) {
      progress = clamp(fraction, 0, 1);
      popup?.move(progress);
      const parked = progress < foldShare;
      const sheet = clamp((progress - foldShare) / (1 - foldShare), 0, 1);
      stage.classList.toggle('physical-turn--parked', parked);
      outgoing.classList.toggle('physical-turn-source', !parked);
      const lift = Math.sin(Math.PI * sheet);
      const sweep = Math.PI * sheet;
      const curl = lift * (lightMesh ? .73 : .92);
      // The free edge leads. Each strip starts at the previous strip's end,
      // while the inner edge remains on the same hinge for the whole turn.
      let x = 0;
      let z = 0;
      const hinge = single && direction > 0 ? 0 : width;

      for (let index = 0; index < strips.length; index += 1) {
        const strip = strips[index];
        const angle = sweep + curl * (2 * (index + .5) / segmentCount - 1);
        const left = hinge + direction * x - (direction < 0 ? step : 0);
        strip.style.transform = `translate3d(${left}px,0,${z}px) rotateY(${-direction * angle * radiansToDegrees}deg)`;
        const normal = Math.cos(angle - direction * .32);
        strip.style.setProperty('--fold-front-shade', String(lift * (.05 + .21 * (1 - Math.max(0, normal)))));
        strip.style.setProperty('--fold-back-shade', String(lift * (.04 + .18 * (1 - Math.max(0, -normal)))));
        x += step * Math.cos(angle);
        z += step * Math.sin(angle);
      }

      shadow.style.opacity = String(.56 * lift);
      shadow.style.transform = `translate3d(${direction * width * (.3 - .6 * sheet)}px,0,0) scaleX(${.28 + .65 * lift})`;
      stage.dataset.progress = progress.toFixed(3);
      stage.dataset.sheetProgress = sheet.toFixed(3);
    }

    draw(0);
    layer.replaceChildren(stage);

    return {
      move(fraction) {
        cancelAnimationFrame(pendingFrame);
        pendingFrame = requestAnimationFrame(() => draw(fraction));
      },
      settle(commit, fraction, velocity, finish) {
        cancelAnimationFrame(pendingFrame);
        if (Number.isFinite(fraction)) draw(fraction);
        const start = progress;
        const target = Number(commit);
        const remaining = Math.abs(target - start);
        const speedFactor = clamp(Number(speed) || 1, .6, 1.6);
        const duration = clamp((185 + 240 * remaining - Math.abs(velocity) * 55) / speedFactor, 130, 710);
        stopMotion = animate(duration, time => {
          const ease = commit && start < .01 ? time * time * (3 - 2 * time) : 1 - (1 - time) ** 2;
          draw(start + (target - start) * ease);
        }, finish);
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(pendingFrame);
        stopMotion?.();
        stage.remove();
        outgoing.classList.remove('physical-turn-source');
        popup?.end();
      },
    };
  }

  function binding(shell, offset, length, single, enabled = true) {
    shell.classList.toggle('has-physical-binding', enabled);
    let casework = shell.querySelector('.physical-binding');
    if (!enabled) {
      if (casework) casework.hidden = true;
      return;
    }
    if (!casework) {
      casework = node('physical-binding');
      casework.setAttribute('aria-hidden', 'true');
      for (const side of ['left', 'right']) {
        const stack = node(`physical-stack physical-stack--${side}`);
        solidify(stack, { back: false });
        casework.append(stack);
      }
      casework.append(node('physical-spine'));
      decorateCover(casework);
      shell.prepend(casework);
    }
    casework.hidden = false;
    casework.classList.toggle('physical-binding--single', single);
    const fraction = clamp(offset / Math.max(1, length), 0, 1);
    const thickness = clamp(Number(shell.closest('#app')?.dataset.bindingThickness) || 16, 8, 30);
    const stock = Math.min(18, Math.max(5, Math.sqrt(length / 80) * .4));
    const depth = stock * thickness / 16 * (single ? .55 : 1);
    casework.style.setProperty('--stack-left', `${(2 + depth * fraction).toFixed(2)}px`);
    casework.style.setProperty('--stack-right', `${(2 + depth * (1 - fraction)).toFixed(2)}px`);
    casework.dataset.progress = fraction.toFixed(4);
  }

  function cover({ app, source, shell, closedBox, openBox, single, closing, finish }) {
    if (!closedBox.width || !openBox.width) return null;
    const stage = node('physical-cover-stage');
    stage.setAttribute('aria-hidden', 'true');
    stage.dataset.action = closing ? 'close' : 'open';
    stage.inert = true;
    const pose = node('physical-cover-pose');
    const board = node('physical-cover-board');
    const block = node('physical-cover-block');
    const spine = node('physical-cover-spine');
    const hinge = node('physical-cover-hinge');
    const front = node('physical-cover-face physical-cover-face--front');
    const inside = node('physical-cover-face physical-cover-face--inside');
    const art = source.querySelector('img')?.cloneNode();
    const title = source.querySelector('.cover-print-title')?.cloneNode(true);
    if (art) front.append(art);
    if (title) front.append(title);
    decorateCover(front);
    hinge.append(front, inside);
    solidify(hinge, { back: false });
    solidify(board);
    solidify(block);
    solidify(spine);
    pose.append(board, block, spine, hinge);
    stage.append(pose);
    app.append(stage);

    source.classList.toggle('physical-cover-source', closing);
    shell.classList.toggle('physical-cover-reveal', !closing);
    const openWidth = single ? openBox.width : openBox.width / 2;
    let cancelled = false;
    let stopMotion;

    function draw(time) {
      const amount = closing ? 1 - time : time;
      const travel = amount * amount * (3 - 2 * amount);
      const open = clamp((amount - .08) / .81, 0, 1);
      const ease = open * open * (3 - 2 * open);
      stage.dataset.opening = ease.toFixed(3);
      const x = closedBox.left + (openBox.right - openWidth - closedBox.left) * travel;
      const y = closedBox.top + (openBox.top - closedBox.top) * travel;
      const width = closedBox.width + (openWidth - closedBox.width) * travel;
      const height = closedBox.height + (openBox.height - closedBox.height) * travel;
      pose.style.width = `${width}px`;
      pose.style.height = `${height}px`;
      pose.style.transform = `translate3d(${x}px,${y - 11 * Math.sin(Math.PI * travel)}px,0) rotateY(${-11 * (1 - travel)}deg) rotateX(${3 * (1 - travel)}deg)`;
      hinge.style.transform = `rotateY(${-177 * ease}deg)`;
      spine.style.transform = `translateZ(${-4 * ease}px) rotateY(${12 * ease}deg)`;
      stage.style.opacity = String(closing ? 1 : 1 - clamp((amount - .73) / .27, 0, 1));
      if (!closing) shell.style.setProperty('--physical-cover-reveal', String(.15 + .85 * clamp((amount - .23) / .55, 0, 1)));
    }

    function destroy() {
      if (cancelled) return;
      cancelled = true;
      stopMotion?.();
      stage.remove();
      source.classList.remove('physical-cover-source');
      shell.classList.remove('physical-cover-reveal');
      shell.style.removeProperty('--physical-cover-reveal');
    }

    draw(0);
    stopMotion = animate(closing ? 640 : 700, draw, () => { destroy(); finish?.(); });
    return destroy;
  }

  window.BookPhysics = Object.freeze({ canAnimate, leaf, binding, cover, decorateCover, solidify });
})();
