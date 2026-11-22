(() => {
  'use strict';

  const BOOK_ID = `book:${String(window.BOOK_PLAN?.storageId || window.BOOK_STORY?.title || 'digital-book').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\d]+/gu, '-')}`;
  const SETTINGS_KEY = `${BOOK_ID}:settings`;
  const BOOKMARK_KEY = `${BOOK_ID}:bookmark`;
  const HINT_KEY = `${BOOK_ID}:gesture-hint-seen`;
  const MOBILE_QUERY = window.matchMedia('(max-width: 819px)');
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const READING_MODES = ['physical', 'classic', 'single', 'scroll', 'cinematic', 'focus'];

  const bookPlan = window.BOOK_PLAN || { chapters: [], reader: {} };
  const coverSource = () => bookPlan.cover?.src || `assets/images/${bookPlan.cover?.id || 'cover'}.webp`;
  const chapterMoods = ['gergin', 'gizem', 'korku', 'gergin', 'gizem', 'korku', 'umut'];
  const chapterEffects = ['belirme', 'cizgi', 'sis', 'murekkep', 'yazilma'];
  const chapterVignettes = [
    ['compass', 'moon', 'signal'], ['map', 'compass', 'signal'], ['moon', 'signal', 'line'],
    ['compass', 'map', 'moon'], ['line', 'signal', 'compass'], ['moon', 'map', 'signal']
  ];
  const plannedChapterFor = (title) => (bookPlan.chapters || []).find((item) => item.title === title);
  const defaultChapterFor = (title) => {
    const match = String(title || '').match(/^Bölüm\s+(\d+)\s+—/iu);
    if (!match) return null;
    const number = Number(match[1]);
    const index = Math.max(0, number - 1);
    return {
      number,
      title,
      mood: chapterMoods[index % chapterMoods.length],
      effect: chapterEffects[index % chapterEffects.length],
      vignettes: chapterVignettes[index % chapterVignettes.length]
    };
  };
  const chapterFor = (title) => {
    const fallback = defaultChapterFor(title);
    const planned = plannedChapterFor(title);
    return fallback || planned ? { ...(fallback || {}), ...(planned || {}) } : null;
  };
  const mediaForChapter = (chapter) => {
    const images = Array.isArray(chapter.images) && chapter.images.length
      ? chapter.images.map((image) => ({ ...image, kind: 'image' }))
      : (chapter.image ? [{ ...chapter.image, kind: 'image' }] : []);
    const media = Array.isArray(chapter.media) ? chapter.media : (Array.isArray(chapter.videos) ? chapter.videos : []);
    return [...media, ...images];
  };
  const sceneForMedia = (asset, chapter) => {
    const kind = asset.kind === 'video' || Boolean(asset.file) ? 'video' : 'image';
    const videoFile = String(asset.file || '').trim();
    const poster = String(asset.poster || '').trim();
    return {
      kind,
      mode: asset.placement === 'inline' ? 'inline' : 'full',
      src: kind === 'video'
        ? `assets/videos/${encodeURIComponent(videoFile)}`
        : (asset.src || (asset.id ? `assets/images/${asset.id}.webp` : coverSource())),
      poster: poster ? `assets/images/${poster}` : '',
      alt: asset.alt || chapter.title,
      position: asset.position || 'center',
      width: Number(asset.width) || 1024,
      height: Number(asset.height) || 1536,
      mood: chapter.mood || 'gizem',
      chapter,
    };
  };
  const scenePlan = (bookPlan.chapters || []).flatMap((chapter) => {
    const media = mediaForChapter(chapter);
    if (!media.length) return [];
    const anchored = media.filter(asset => asset.anchor);
    if (anchored.length === media.length) {
      return media.map(asset => ({
        anchor: asset.anchor,
        afterAnchor: asset.artAfter ?? chapter.artAfter === true,
        ...sceneForMedia(asset, chapter),
        chapter,
        afterScenes: [],
      }));
    }
    const [first = {}, ...after] = media;
    return [{
      anchor: chapter.anchor || chapter.title,
      afterAnchor: chapter.artAfter === true,
      ...sceneForMedia(first, chapter),
      chapter,
      afterScenes: after.map(asset => sceneForMedia(asset, chapter)),
    }];
  }).filter(Boolean).concat((bookPlan.chapters||[]).filter(chapter=>chapter.openingImage).map(chapter=>({anchor:chapter.title,...sceneForMedia(chapter.openingImage,chapter),chapter})));

  const presentationFor = (chapterTitle) => {
    const chapter = chapterFor(chapterTitle);
    if (chapter) return { mood: chapter.mood || 'gizem', effect: chapter.effect || 'belirme', number: chapter.number };
    return { mood: 'gizem', effect: 'belirme' };
  };

  const el = {
    app: document.querySelector('#app'),
    loading: document.querySelector('#loading-screen'),
    cover: document.querySelector('#cover-view'),
    coverTitle: document.querySelector('#cover-title'),
    coverKicker: document.querySelector('#cover-kicker'),
    coverGenre: document.querySelector('#cover-genre'),
    coverEditionInfo: document.querySelector('#cover-edition-info'),
    coverBrandCopy: document.querySelector('#cover-brand-copy'),
    coverEdition: document.querySelector('#cover-edition'),
    coverLocation: document.querySelector('#cover-location'),
    coverMark: document.querySelector('#cover-mark'),
    start: document.querySelector('#start-reading'),
    continueReading: document.querySelector('#continue-reading'),
    coverTocOpen: document.querySelector('#cover-toc-open'),
    coverResume: document.querySelector('#cover-resume'),
    coverBookmark: document.querySelector('#cover-bookmark'),
    coverProgress: document.querySelector('#cover-progress-meter'),
    coverProgressFill: document.querySelector('#cover-progress-fill'),
    coverAudioToggle: document.querySelector('#cover-audio-toggle'),
    coverAudioLabel: document.querySelector('#cover-audio-label'),
    reader: document.querySelector('#reader-view'),
    readerTitle: document.querySelector('#reader-title'),
    stage: document.querySelector('#book-stage'),
    pagePrevious: document.querySelector('#page-previous'),
    pageNext: document.querySelector('#page-next'),
    shell: document.querySelector('#book-shell'),
    spread: document.querySelector('#book-spread'),
    range: document.querySelector('#progress-range'),
    pageCount: document.querySelector('#page-count'),
    coverButton: document.querySelector('#cover-button'),
    settingsToggle: document.querySelector('#settings-toggle'),
    settings: document.querySelector('#settings-panel'),
    settingsClose: document.querySelector('#settings-close'),
    fontDecrease: document.querySelector('#font-decrease'),
    fontIncrease: document.querySelector('#font-increase'),
    fontSizeOutput: document.querySelector('#font-size-output'),
    lineHeight: document.querySelector('#line-height-range'),
    lineHeightOutput: document.querySelector('#line-height-output'),
    motionReduce: document.querySelector('#motion-reduce'),
    themeButtons: [...document.querySelectorAll('[data-theme-choice]')],
    audioToggle: document.querySelector('#audio-toggle'),
    audioToggleLabel: document.querySelector('#audio-toggle-label'),
    audioVolume: document.querySelector('#audio-volume'),
    audioVolumeOutput: document.querySelector('#audio-volume-output'),
    fullscreen: document.querySelector('#fullscreen-button'),
    toc: document.querySelector('#toc-list'),
    gallery: document.querySelector('#chapter-gallery'),
    hint: document.querySelector('#gesture-hint'),
    lab: document.querySelector('#pagination-lab'),
    error: document.querySelector('#error-view'),
    errorMessage: document.querySelector('#error-message'),
    themeMeta: document.querySelector('#theme-color-meta'),
  };

  const DEFAULT_SETTINGS = Object.freeze({ ...window.BookStyleStudio?.defaults, theme:bookPlan.reader?.defaultTheme || 'light', fontScale:1, lineHeight:1.72, reduceMotion:false, microEffects:true, audioVolume:16, focusMode:false, readingMode:'physical',
    readerFont:'lora', letterSpacing:0, paragraphSpacing:0, textWidth:100, pageMargin:1, textAlign:'left', surfaceBrightness:100, temperature:'neutral', contrast:'normal', paperTexture:.035, decorativeLight:.6, edgeShade:.06, atmosphereIntensity:'normal', breakMinutes:0, activeProfile:'personal', nightComfort:false });
  const state = {
    story: null,
    text: '',
    chapters: [],
    paragraphs: [],
    pages: [],
    active: 0,
    settings: { ...DEFAULT_SETTINGS },
    readingAnchor: null,
    activeLeaf: null,
    readerOpen: false,
    bookmarkSuspended: false,
    resizing: 0,
    coverTimer: 0,
    gesture: null,
    isTurning: false,
    turnTimer: 0,
    audio: {
      context: null,
      master: null,
      enabled: false,
      unavailable: false,
      nodes: [],
      bellTimer: 0,
      bellStep: 0,
    },
  };

  // Scene media stays deliberately separate from the book navigation state.
  // Only the page in view owns a decoded video, which keeps low-memory phones smooth.
  const sceneVideoState = { observer: null, active: null, elements: new Set(), visibilityBound: false };

  function motionReduced() {
    return REDUCED_MOTION.matches || Boolean(state.settings.reduceMotion);
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { /* File previews may disable storage. */ }
  }

  function parseStoredJson(key, fallback) {
    try {
      const value = storageGet(key);
      return value ? { ...fallback, ...JSON.parse(value) } : fallback;
    } catch {
      return fallback;
    }
  }

  function base64ToUtf8(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return {
      bytes,
      text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes),
    };
  }

  function assertStory() {
    const story = window.BOOK_STORY;
    if (!story || typeof story.textBase64 !== 'string') throw new Error('story.js geçerli bir kitap verisi içermiyor.');
    const decoded = base64ToUtf8(story.textBase64);
    const words = (decoded.text.match(/\S+/gu) || []).length;
    if (decoded.bytes.length !== story.byteLength || decoded.text.length !== story.charLength || words !== story.wordCount) {
      throw new Error('Gömülü hikâye bütünlük denetiminden geçemedi.');
    }
    const frontMatter = decoded.text.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    const hiddenLength = frontMatter ? frontMatter[0].length : 0;
    const rebase = (items) => (items || []).map((item) => ({ ...item, offset: Math.max(0, (item.offset || 0) - hiddenLength) }));
    const rebaseNarration = (narration) => !narration ? null : ({
      ...narration,
      chapters: (narration.chapters || []).map((chapter) => ({
        ...chapter,
        parts: (chapter.parts || []).map((part) => ({
          ...part,
          sourceStart: Math.max(0, (part.sourceStart || 0) - hiddenLength),
          sourceEnd: Math.max(0, (part.sourceEnd || 0) - hiddenLength),
        })),
      })),
    });
    state.story = hiddenLength ? {
      ...story,
      chapters: rebase(story.chapters),
      sourceChapters: rebase(story.sourceChapters),
      narration: rebaseNarration(story.narration),
      sources: (story.sources || []).map((source) => ({
        ...source,
        charStart: Math.max(0, (source.charStart || 0) - hiddenLength),
        charEnd: Math.max(0, (source.charEnd || 0) - hiddenLength),
      })),
    } : story;
    state.text = hiddenLength ? decoded.text.slice(hiddenLength) : decoded.text;
    const trimAfter = String(bookPlan.reader?.trimAfter || '');
    const trimAt = trimAfter ? state.text.indexOf(trimAfter) : -1;
    if (trimAt > 0) state.text = state.text.slice(0, trimAt);
    indexSource();
  }

  function sourceIndexAt(entries, offset) {
    let low = 0;
    let high = entries.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (entries[mid].offset <= offset) low = mid + 1;
      else high = mid;
    }
    return low - 1;
  }

  function indexSource() {
    const headings = (state.story.chapters || []).filter((chapter) =>
      (chapter.level >= 2 || plannedChapterFor(chapter.label)) && chapter.label !== state.story.title);
    const sources = state.story.sources || [];
    const sections = sources.length > 1 ? (state.story.sourceChapters || []).flatMap((chapter) => {
      if (headings.some((heading) => heading.offset === chapter.offset || heading.label === chapter.label)) return [];
      const source = sources.find((item) => item.charStart === chapter.offset);
      const continuation = bookPlan.continuations?.find((item) => item.source === source?.name);
      return [{ ...chapter, label: continuation?.title || chapter.label }];
    }) : [];
    const chapters = [...headings, ...sections].sort((left, right) => left.offset - right.offset);
    state.chapters = chapters.map((chapter, index) => ({
      id: plannedChapterFor(chapter.label)?.id || chapter.label.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\d]+/gu, '-'),
      title: chapter.label,
      offset: chapter.offset,
      end: chapters[index + 1]?.offset ?? state.text.length,
    }));
    state.paragraphs = [];
    const blocks = state.text.matchAll(/\S[\s\S]*?(?=\r?\n[ \t]*\r?\n|$)/gu);
    for (const block of blocks) {
      const copy = block[0];
      let fingerprint = 2166136261;
      for (let index = 0; index < copy.length; index++) fingerprint = Math.imul(fingerprint ^ copy.charCodeAt(index), 16777619);
      const chapter = state.chapters[sourceIndexAt(state.chapters, block.index)];
      state.paragraphs.push({
        id: (fingerprint >>> 0).toString(36),
        chapterId: chapter?.id || '',
        offset: block.index,
        length: copy.length,
        quote: copy.slice(0, 80),
      });
    }
  }

  function sourceAnchor(offset) {
    const chapter = state.chapters[sourceIndexAt(state.chapters, offset)];
    const paragraph = state.paragraphs[sourceIndexAt(state.paragraphs, offset)];
    return {
      offset,
      sourceHash: state.story?.sha256,
      chapterId: chapter?.id || '',
      paragraphId: paragraph?.id || '',
      paragraphOffset: paragraph ? offset - paragraph.offset : offset,
      paragraphLength: paragraph?.length || 0,
      quote: paragraph?.quote || '',
    };
  }

  function restoredOffset(bookmark) {
    if (!Number.isFinite(bookmark?.offset)) return 0;
    const anchor = bookmark.anchor;
    if (!anchor?.sourceHash || anchor.sourceHash === state.story?.sha256) {
      return Math.max(0, Math.min(state.text.length, bookmark.offset));
    }
    const matches = state.paragraphs.filter((paragraph) =>
      paragraph.id === anchor.paragraphId && paragraph.chapterId === anchor.chapterId &&
      paragraph.quote === anchor.quote && paragraph.length === anchor.paragraphLength);
    if (matches.length === 1) {
      const displacement = Math.max(0, Math.min(matches[0].length, Number(anchor.paragraphOffset) || 0));
      return matches[0].offset + displacement;
    }
    return state.chapters.find((chapter) => chapter.id === anchor.chapterId)?.offset || 0;
  }

  function storyInfo() {
    const lines = state.text.split(/\r\n|\n|\r/);
    const nonEmpty = lines.filter((line) => line.length > 0);
    const h1 = lines.find((line) => /^#\s+/.test(line));
    const title = bookPlan.title || (h1 ? h1.replace(/^#\s+/, '') : state.story.title);
    const titleLine = h1 ? lines.indexOf(h1) : -1;
    const afterTitle = lines.slice(titleLine + 1).filter((line) => line.trim());
    const plannedGenre = Array.isArray(bookPlan.genre) ? bookPlan.genre.join(' · ') : String(bookPlan.genre || '');
    const genre = plannedGenre || afterTitle.find((line) => line.includes('•')) || '';
    const subtitle = bookPlan.subtitle || afterTitle.find((line) => line !== genre && !/^#{1,6}\s/.test(line)) || '';
    return { title, subtitle, genre, nonEmpty };
  }

  function setCoverContent() {
    const info = storyInfo();
    const chapters = new Set((state.story?.chapters || [])
      .map((chapter) => chapter.label)
      .filter((label) => /^Bölüm\s+\d+\s+—/iu.test(label)));
    document.title = `${info.title} — Dijital Kitap`;
    el.coverTitle.textContent = info.title;
    el.coverKicker.textContent = info.subtitle;
    el.coverGenre.textContent = info.genre;
    el.readerTitle.textContent = info.title;
    const cover = el.cover.querySelector('.cover-art');
    const coverImage = cover?.querySelector('img');
    if (coverImage) {
      const source = new URL(coverSource(), document.baseURI).href;
      if (coverImage.src !== source) {
        coverImage.removeAttribute('srcset');
        coverImage.src = source;
      }
      if (bookPlan.cover?.alt) coverImage.alt = bookPlan.cover.alt;
      if (bookPlan.cover?.width) coverImage.width = bookPlan.cover.width;
      if (bookPlan.cover?.height) coverImage.height = bookPlan.cover.height;
      cover.setAttribute('aria-label', info.title + ' kitabını aç');
      const print = cover.querySelector('.cover-print-title');
      if (print) {
        const title = [...print.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()).filter(Boolean).join(' ');
        if (title !== info.title) {
          const author = document.createElement('small');
          author.textContent = bookPlan.author || '';
          print.replaceChildren(document.createTextNode(info.title), author);
        }
      }
    }
    if (el.coverEditionInfo && chapters.size) el.coverEditionInfo.textContent = `${chapters.size} bölüm · etkileşimli roman`;
    if (el.coverBrandCopy && bookPlan.coverBrand) el.coverBrandCopy.textContent = bookPlan.coverBrand;
    if (el.coverEdition && bookPlan.edition) el.coverEdition.textContent = bookPlan.edition;
    if (el.coverLocation && bookPlan.coverLocation) el.coverLocation.textContent = bookPlan.coverLocation;
    if (el.coverMark && bookPlan.coverMark) el.coverMark.textContent = bookPlan.coverMark;
    syncCoverResume();
  }

  function chapterAt(offset) {
    return [...(state.story?.chapters || [])].reverse().find((chapter) => chapter.level >= 2 && chapter.offset <= offset);
  }

  function syncCoverResume() {
    const bookmark = parseStoredJson(BOOKMARK_KEY, null);
    const offset = restoredOffset(bookmark);
    const canResume = offset > 0;
    const progress = canResume ? Math.round(offset / Math.max(1, state.text.length) * 100) : 0;
    if (el.continueReading) el.continueReading.hidden = !canResume;
    if (el.coverBookmark) el.coverBookmark.hidden = !canResume;
    if (el.coverResume) {
      el.coverResume.hidden = !canResume;
      if (canResume) {
        const label = document.createElement('span');
        label.textContent = `KİTAP AYRACIN · %${progress}`;
        const chapter = document.createElement('strong');
        chapter.textContent = chapterAt(offset)?.label || 'Kaldığın yer';
        el.coverResume.replaceChildren(label, chapter);
      }
    }
    if (el.coverProgress) {
      el.coverProgress.hidden = !canResume;
      el.coverProgress.setAttribute('aria-valuenow', String(progress));
      el.coverProgressFill?.style.setProperty('--cover-progress', String(progress / 100));
    }
  }

  function isMobile() {
    return MOBILE_QUERY.matches;
  }

  function continuousMode() {
    return state.settings.readingMode === 'scroll';
  }

  function singlePage() {
    return isMobile() || ['single', 'scroll', 'focus'].includes(state.settings.readingMode);
  }

  function syncReadingLayout() {
    el.app.dataset.readingMode = state.settings.readingMode;
    el.app.dataset.readerLayout = continuousMode() ? 'flow' : singlePage() ? 'single' : 'spread';
  }

  function getPageGeometry() {
    const rect = el.shell.getBoundingClientRect();
    return {
      width: Math.max(240, Math.floor(rect.width / (singlePage() ? 1 : 2))),
      height: Math.max(120, Math.floor(rect.height)),
    };
  }

  const pageLayouts = new Map();
  const layoutStorageKey = `${BOOK_ID}:page-layout-v1`;
  const layoutSettings = ['readingMode', 'fontScale', 'lineHeight', 'readerFont', 'letterSpacing',
    'paragraphSpacing', 'textWidth', 'pageMargin', 'textAlign', 'theme', ...window.BookStyleStudio?.geometry || []];

  function createMeasure(scene, geometry = getPageGeometry()) {
    const page = document.createElement('article');
    // Measure with exactly the same side-specific padding as a visible page.
    page.className = `book-page measure-page ${singlePage() ? 'book-page--single' : 'book-page--left'}`;
    page.style.width = `${geometry.width}px`;
    page.style.height = `${geometry.height}px`;

    const content = document.createElement('div');
    content.className = 'page-content';
    if (scene) {
      const figure = document.createElement('figure');
      figure.className = 'inline-illustration';
      const image = document.createElement('img');
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = scene.width || 1200;
      image.height = scene.height || 675;
      figure.append(image);
      content.append(figure);
    }
    const text = document.createElement('div');
    text.className = `page-text${scene ? ' page-text--with-image' : ''}`;
    const folio = document.createElement('p');
    folio.className = 'folio';
    folio.textContent = '00';
    content.append(text, folio);
    page.append(content);
    el.lab.append(page);
    return text;
  }

  function fitCandidate(measure, raw) {
    measure.replaceChildren();
    appendStoryText(measure, raw);
    return measure.scrollHeight <= measure.clientHeight + 0.75 && measure.scrollWidth <= measure.clientWidth + 0.75;
  }

  function avoidSplittingLineEnding(text, start, end) {
    let adjusted = end;
    if (adjusted > start && text[adjusted - 1] === '\r') adjusted -= 1;
    return adjusted;
  }

  function preferredBreak(text, start, candidate) {
    const minimum = Math.min(candidate, start + 140);
    const sample = text.slice(start, candidate);
    const paragraphBreak = Math.max(sample.lastIndexOf('\r\n\r\n'), sample.lastIndexOf('\n\n'));
    if (paragraphBreak >= 0) {
      const separatorLength = sample.startsWith('\r\n\r\n', paragraphBreak) ? 4 : 2;
      const at = start + paragraphBreak + separatorLength;
      if (at >= minimum) return at;
    }

    let sentenceEnd = -1;
    const sentence = /[.!?…][”"'»)]?(?:[ \t]+|\r?\n)/g;
    let match;
    while ((match = sentence.exec(sample))) {
      const at = start + match.index + match[0].length;
      if (at >= minimum) sentenceEnd = at;
    }
    if (sentenceEnd > start) return sentenceEnd;

    const whitespace = Math.max(sample.lastIndexOf(' '), sample.lastIndexOf('\t'), sample.lastIndexOf('\n'));
    if (whitespace >= 0) return start + whitespace + 1;
    return candidate;
  }

  function findFittingEnd(start, limit, scene, initialBudget) {
    const measure = createMeasure(scene);
    const budget = Math.max(1, Math.floor(initialBudget || 520));
    let low = start;
    let high = Math.min(limit, start + budget);

    // Never put the whole remaining chapter in the measurement DOM. Start
    // with a small window, then enlarge only when that window actually fits.
    // This retains exact no-overflow pagination without freezing the reader.
    while (high > low && fitCandidate(measure, state.text.slice(start, high))) {
      low = high;
      if (low >= limit) return low;
      const expanded = Math.min(limit, start + Math.max(budget, Math.floor((low - start) * 1.55)));
      if (expanded <= high) return low;
      high = expanded;
    }

    let best = low;
    let left = Math.max(start + 1, low + 1);
    let right = high;
    while (left <= right) {
      const rawPivot = Math.floor((left + right) / 2);
      const pivot = avoidSplittingLineEnding(state.text, start, rawPivot);
      // A CRLF-safe pivot can move one character to the left. If it moves
      // behind the active binary-search range, force the search forward;
      // otherwise a CRLF at this exact point can repeat forever.
      if (pivot < left) {
        left = rawPivot + 1;
        continue;
      }
      if (fitCandidate(measure, state.text.slice(start, pivot))) {
        best = pivot;
        left = pivot + 1;
      } else {
        right = pivot - 1;
      }
    }
    if (best <= start) return Math.min(limit, start + 1);
    const balanced = avoidSplittingLineEnding(state.text, start, preferredBreak(state.text, start, best));
    return balanced > start ? balanced : best;
  }

  // Measuring the complete remainder of a chapter before the first page is
  // painted can lock a phone for several seconds.  The reader therefore uses
  // a deliberately conservative, viewport-aware text budget.  It still
  // reflows when the viewport or type size changes, but never makes opening
  // the book depend on hundreds of forced browser layouts.
  function pageCharacterBudget(geometry, withIllustration) {
    const scale = Math.max(.8, Math.min(1.6, Number(state.settings.fontScale) || 1));
    const referenceHeight = isMobile() ? 720 : 680;
    const heightFactor = Math.max(.66, Math.min(1.12, geometry.height / referenceHeight));
    let budget = Math.floor(((isMobile() ? 560 : 1180) * heightFactor) / scale);
    if (withIllustration) budget = Math.floor(budget * .5);
    return Math.max(withIllustration ? 150 : 280, budget);
  }

  function findFastPageEnd(start, limit, budget) {
    const candidate = Math.min(limit, start + budget);
    if (candidate >= limit) return limit;
    const sample = state.text.slice(start, candidate);
    const minimum = start + Math.min(Math.floor(budget * .56), Math.max(90, budget - 80));
    const paragraphBreak = Math.max(sample.lastIndexOf('\r\n\r\n'), sample.lastIndexOf('\n\n'));
    if (paragraphBreak >= 0) {
      const separatorLength = sample.startsWith('\r\n\r\n', paragraphBreak) ? 4 : 2;
      const at = start + paragraphBreak + separatorLength;
      if (at >= minimum) return avoidSplittingLineEnding(state.text, start, at);
    }
    let sentenceEnd = -1;
    const sentence = /[.!?…][”"'»)]?(?:[ \t]+|\r?\n)/g;
    let match;
    while ((match = sentence.exec(sample))) {
      const at = start + match.index + match[0].length;
      if (at >= minimum) sentenceEnd = at;
    }
    if (sentenceEnd > start) return avoidSplittingLineEnding(state.text, start, sentenceEnd);
    const whitespace = Math.max(sample.lastIndexOf(' '), sample.lastIndexOf('\t'), sample.lastIndexOf('\n'));
    if (whitespace >= 0 && start + whitespace + 1 >= minimum) {
      return avoidSplittingLineEnding(state.text, start, start + whitespace + 1);
    }
    return avoidSplittingLineEnding(state.text, start, candidate);
  }

  // The fast, viewport-aware budget keeps first paint responsive.  Verify the
  // proposed slice before committing it so a font change, a narrow viewport,
  // or a long dialogue can never leave text clipped below a page edge.
  function verifyPageEnd(start, candidate, measure) {
    let end = candidate;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      measure.replaceChildren();
      appendStoryText(measure, state.text.slice(start, end));
      const contentHeight = measure.scrollHeight;
      const availableHeight = measure.clientHeight;
      const fitsWidth = measure.scrollWidth <= measure.clientWidth + 0.75;
      if (contentHeight <= availableHeight + 0.75 && fitsWidth) return end;
      const ratio = Math.min(.9, availableHeight / Math.max(1, contentHeight) * .95);
      const next = findFastPageEnd(start, end, Math.floor((end - start) * ratio));
      if (next <= start || next >= end) break;
      end = next;
    }
    let left = start + 1;
    let right = candidate;
    let best = start;
    while (left <= right) {
      const rawPivot = Math.floor((left + right) / 2);
      const pivot = avoidSplittingLineEnding(state.text, start, rawPivot);
      if (pivot < left) {
        left = rawPivot + 1;
        continue;
      }
      if (fitCandidate(measure, state.text.slice(start, pivot))) {
        best = pivot;
        left = pivot + 1;
      } else {
        right = pivot - 1;
      }
    }
    if (best <= start) return Math.min(candidate, start + 1);
    const balanced = avoidSplittingLineEnding(state.text, start, preferredBreak(state.text, start, best));
    return balanced > start ? balanced : best;
  }

  function resolvedScenes() {
    const sceneOffset = ({ anchor, chapter, afterAnchor }) => {
      const found = state.text.indexOf(anchor, Math.max(0, chapter?.offset || 0));
      if (found < 0) return -1;
      if (afterAnchor) {
        const end = found + anchor.length;
        const next = /\r?\n[ \t]*\r?\n/u.exec(state.text.slice(end));
        return next ? end + next.index + next[0].length : end;
      }
      const lineStart = state.text.lastIndexOf('\n', found - 1) + 1;
      // Plans use the readable heading text, while some source chapters use
      // Markdown headings. Include the marker so it cannot become an orphan
      // page immediately before a scene.
      return /^\s*#{1,6}\s+/u.test(state.text.slice(lineStart, found)) ? lineStart : found;
    };
    return scenePlan
      .map((scene) => ({ ...scene, offset: sceneOffset(scene) }))
      .filter((scene) => scene.offset >= 0)
      .sort((a, b) => a.offset - b.offset);
  }

  function nextSourceBoundary(offset) {
    const sources = state.story?.sources || [];
    for (const source of sources) {
      if (Number.isFinite(source.charStart) && source.charStart > offset) return source.charStart;
    }
    return state.text.length;
  }

  function continuationAt(offset) {
    const source = (state.story?.sources || []).find((item) => item.charStart === offset);
    if (!source) return null;
    return (bookPlan.continuations || []).find((item) => item.source === source.name) || null;
  }

  function resolvedChapterMarkers() {
    return (state.story?.chapters || [])
      .filter((chapter) => chapter.level >= 2)
      .map((chapter) => ({ offset: chapter.offset, chapter: chapterFor(chapter.label) }))
      .sort((a, b) => a.offset - b.offset);
  }

  function buildPages(geometry, savedEnds = null) {
    const flow = continuousMode();
    const pages = bookPlan.reader?.frontmatter ? [{ type: 'frontmatter', sourceStart: 0, sourceEnd: 0 }] : [];
    const scenes = resolvedScenes();
    const chapterMarkers = resolvedChapterMarkers();
    const measures = new Map();
    function measureFor(scene) {
      const type = Boolean(scene);
      if (!measures.has(type)) measures.set(type, createMeasure(scene, geometry));
      return measures.get(type);
    }
    const textBudget = pageCharacterBudget(geometry, false);
    const illustratedBudget = pageCharacterBudget(geometry, true);
    let sceneIndex = 0;
    let chapterIndex = 0;
    let offset = 0;
    let savedIndex = 0;
    let currentChapter = null;
    const shownContinuations = new Set();

    while (offset < state.text.length) {
      while (chapterMarkers[chapterIndex] && chapterMarkers[chapterIndex].offset <= offset) {
        currentChapter = chapterMarkers[chapterIndex].chapter || currentChapter;
        chapterIndex += 1;
      }
      const continuation = continuationAt(offset);
      if (continuation && !shownContinuations.has(offset)) {
        shownContinuations.add(offset);
        pages.push({ type: 'continuation', continuation, sourceStart: offset, sourceEnd: offset });
        continue;
      }
      let pendingScene = null;
      const now = scenes[sceneIndex];
      if (now && now.offset === offset) {
        sceneIndex += 1;
        currentChapter = now.chapter || currentChapter;
        if (now.mode === 'full') {
          pages.push({ type: 'art', scene: now, sourceStart: offset, sourceEnd: offset });
          (now.afterScenes || []).forEach((scene) => pages.push({ type: 'art', scene, sourceStart: offset, sourceEnd: offset }));
          continue;
        }
        pendingScene = now;
      }

      const nextScene = scenes[sceneIndex];
      const nextChapter = chapterMarkers[chapterIndex];
      // File boundaries are visual chapter boundaries only; they never add or
      // alter a character in the source stream. This also prevents two files
      // without a trailing newline from being visually fused into one paragraph.
      const limit = Math.min(nextScene ? nextScene.offset : state.text.length, nextChapter ? nextChapter.offset : state.text.length, nextSourceBoundary(offset));
      if (limit <= offset) throw new Error('Sayfalama sınırı ilerlemedi.');
      let end = limit;
      if (savedEnds) {
        end = savedEnds[savedIndex++];
        if (!Number.isInteger(end) || end <= offset || end > limit) return false;
      } else if (!flow) {
        const proposedEnd = findFastPageEnd(offset, limit, pendingScene ? illustratedBudget : textBudget);
        end = verifyPageEnd(offset, proposedEnd, measureFor(pendingScene));
      }
      if (end <= offset) throw new Error('Sayfalama ilerleyemedi.');
      pages.push({
        type: 'text',
        raw: state.text.slice(offset, end),
        sourceStart: offset,
        sourceEnd: end,
        scene: pendingScene,
        chapter: currentChapter,
        measured: false,
      });
      offset = end;
    }

    if (savedEnds && savedIndex !== savedEnds.length) return false;
    // Insert discovery leaves once, during pagination; never mutate the list on turns.
    const world=window.STORY_WORLD;
    if(world?.atlas){for(const [i,chapter]of world.chapters.entries()){
      const limit=world.chapters[i+1]?.offset??state.text.length;
      const places=world.facts.filter(f=>f.kind==='places'&&f.unlock<=limit&&((f.unlock>=chapter.offset)||(chapter.number===0&&f.chapter==='Giriş')));
      if(!places.length&&!bookPlan.reader?.chapterEndings)continue;
      const at=pages.findLastIndex(p=>p.type==='text'&&p.sourceEnd===limit);
      if(at>=0)pages.splice(at+1,0,{type:'discovery',sourceStart:limit-1,sourceEnd:limit-1,discovery:{chapter:chapter.title,limit:limit-1,places:places.map(f=>f.id),nextOffset:world.chapters[i+1]?.offset??null}});
    }}
    if (bookPlan.reader?.appendEndPage) pages.push({ type: 'end', sourceStart: state.text.length, sourceEnd: state.text.length });
    if (bookPlan.reader?.appendLetter) pages.push({ type: 'letter', sourceStart: state.text.length, sourceEnd: state.text.length });
    const reassembled = pages.filter((page) => page.type === 'text').map((page) => page.raw).join('');
    if (reassembled !== state.text) throw new Error('Dinamik sayfalama hikâye metnini eksiksiz koruyamadı.');
    state.pages = pages;
    el.lab.replaceChildren();
    return true;
  }

  function ensurePageFits(index) {
    const page = state.pages[index];
    if (!page || page.type !== 'text' || page.measured) return;
    // The reader is paginated once with a conservative text budget.  Splitting
    // a page only when it becomes visible used to mutate the page list during
    // reading, which shifted art leaves and made the page total jump around.
    // Keep the list immutable between a resize/type-size change instead.
    page.measured = true;
  }

  function sourceOffsetForCurrentPage() {
    if (state.readerOpen && Number.isFinite(state.readingAnchor)) return state.readingAnchor;
    const page = state.pages[state.active];
    if (!page) return 0;
    if (page.type === 'text') return page.sourceStart;
    if (page.type === 'art') return page.sourceStart;
    if (page.type === 'discovery') return page.sourceStart;
    if (page.type === 'end' || page.type === 'letter') return state.text.length;
    for (let index = state.active + 1; index < state.pages.length; index += 1) {
      if (state.pages[index].type === 'text') return state.pages[index].sourceStart;
    }
    for (let index = state.active - 1; index >= 0; index -= 1) {
      if (state.pages[index].type === 'text') return state.pages[index].sourceEnd;
    }
    return 0;
  }

  function pageAtOffset(offset) {
    if (offset >= state.text.length) return state.pages.length - 1;
    const frontmatterIndex = state.pages.findIndex((page) => page.type === 'frontmatter');
    if (offset <= 0 && frontmatterIndex >= 0) return frontmatterIndex;
    // An illustration is anchored to the first character of its following text.
    // Preserve that distinct reading position when restoring or reflowing.
    const artIndex = state.pages.findIndex((page) => page.type === 'art' && page.sourceStart === offset);
    if (artIndex >= 0) return artIndex;
    const discoveryIndex=state.pages.findIndex(page=>page.type==='discovery'&&page.sourceStart===offset);
    if(discoveryIndex>=0)return discoveryIndex;
    let closest = 0;
    for (let index = 0; index < state.pages.length; index += 1) {
      const page = state.pages[index];
      if (page.type !== 'text') continue;
      if (offset >= page.sourceStart && offset < page.sourceEnd) return index;
      if (page.sourceStart <= offset) closest = index;
    }
    return closest;
  }

  function pageAtTextOffset(offset) {
    let closest = 0;
    for (let index = 0; index < state.pages.length; index += 1) {
      const page = state.pages[index];
      if (page.type !== 'text') continue;
      if (offset >= page.sourceStart && offset < page.sourceEnd) return index;
      if (page.sourceStart <= offset) closest = index;
    }
    return closest;
  }

  function leafIdentity(page) {
    if (!page || page.type === 'text') return null;
    return page.type === 'art' ? 'art:' + (page.scene?.src || page.scene?.id || '') : page.type;
  }

  function pageAtAnchor(offset, leaf, preferText) {
    if (leaf) {
      const exact = state.pages.findIndex((page) => page.sourceStart === offset && leafIdentity(page) === leaf);
      if (exact >= 0) return exact;
    }
    return preferText ? pageAtTextOffset(offset) : pageAtOffset(offset);
  }

  function setActivePage(index) {
    state.activeLeaf = leafIdentity(state.pages[index]);
    state.active = singlePage() ? index : Math.floor(index / 2) * 2;
  }

  function makeImage(scene, className) {
    const figure = document.createElement('figure');
    figure.className = className;
    figure.dataset.chapterArt = scene.chapter?.id || '';
    const image = document.createElement('img');
    const source = scene.src.startsWith('./') ? scene.src : `./${scene.src}`;
    image.alt = scene.alt;
    image.draggable = false;
    image.style.objectPosition = scene.position || 'center';
    image.className = 'illustration-image';
    const prominent = className === 'art-illustration' && !continuousMode();
    image.loading = prominent ? 'eager' : 'lazy';
    image.fetchPriority = prominent ? 'high' : 'low';
    image.decoding = 'async';
    if (/\.webp$/iu.test(source)) {
      image.srcset = source.replace(/\.webp$/iu, '-480.webp') + ' 480w, ' + source + ` ${scene.width || 1024}w`;
      image.sizes = className === 'art-illustration' ? '(max-width: 819px) 100vw, 50vw' : '(max-width: 819px) 86vw, 40vw';
      image.width = scene.width || 1024;
      image.height = scene.height || 1536;
    }
    image.addEventListener('load', () => image.classList.add('is-loaded'), { once: true });
    image.addEventListener('error', () => {
      if (image.dataset.fallbackApplied || !image.hasAttribute('srcset')) {
        image.remove();
        figure.textContent = 'Sahne görseli yüklenemedi.';
        figure.classList.add('art-unavailable');
        return;
      }
      image.dataset.fallbackApplied = 'true';
      image.removeAttribute('srcset');
      image.src = source;
    });
    image.src = source;
    figure.append(image);
    return figure;
  }

  function sceneVideoSource(video) {
    if (!video?.dataset.src || video.dataset.loaded === 'true') return;
    video.dataset.loaded = 'true';
    const safari=/AppleWebKit/.test(navigator.userAgent)&&!/Chrome|Chromium|Edg\//.test(navigator.userAgent);
    if(safari){const controller=new AbortController();video.mediaLoadController=controller;fetch(video.dataset.src,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Media unavailable');return r.blob();}).then(blob=>{if(!sceneVideoState.elements.has(video)||controller.signal.aborted)return;video.mediaObjectUrl=URL.createObjectURL(blob);video.src=video.mediaObjectUrl;video.load();}).catch(e=>{if(e.name==='AbortError'||!sceneVideoState.elements.has(video))return;video.src=video.dataset.src;video.load();});}
    else{video.src = video.dataset.src;video.load();}
  }

  function updateSceneVideoControls(video) {
    const figure = video.closest('.scene-video-figure');
    if (!figure) return;
    const play = figure.querySelector('[data-scene-video-play]');
    const sound = figure.querySelector('[data-scene-video-sound]');
    if (play) {
      play.textContent = video.paused ? '▶' : 'Ⅱ';
      play.setAttribute('aria-label', video.paused ? 'Sahneyi oynat' : 'Sahneyi duraklat');
    }
    if (sound) {
      sound.textContent = video.muted ? '♩' : '♬';
      sound.setAttribute('aria-label', video.muted ? 'Sahne sesini aç' : 'Sahne sesini kapat');
      sound.setAttribute('aria-pressed', String(!video.muted));
    }
  }

  function activateSceneVideo(video, force = false) {
    if (!video || !sceneVideoState.elements.has(video)) return;
    if (sceneVideoState.active && sceneVideoState.active !== video) sceneVideoState.active.pause();
    sceneVideoState.active = video;
    const savesData = Boolean(navigator.connection?.saveData);
    if ((!force && (motionReduced() || savesData || video.dataset.userPaused === 'true')) || document.hidden) return;
    sceneVideoSource(video);
    const play = () => {
      if (sceneVideoState.active !== video || !sceneVideoState.elements.has(video) || document.hidden) return;
      video.play().catch(() => updateSceneVideoControls(video));
    };
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play();
    else video.addEventListener('canplay', play, { once: true });
  }

  function ensureSceneVideoObserver() {
    if (!sceneVideoState.observer && 'IntersectionObserver' in window) {
      sceneVideoState.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!sceneVideoState.elements.has(video)) return;
          if (entry.isIntersecting && entry.intersectionRatio >= .55) activateSceneVideo(video);
          else if (entry.intersectionRatio < .15 || video !== sceneVideoState.active) {
            video.pause();
            if (sceneVideoState.active === video) sceneVideoState.active = null;
          }
        });
      }, { threshold: [.15, .55, .85] });
    }
    if (!sceneVideoState.visibilityBound) {
      sceneVideoState.visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) sceneVideoState.active?.pause();
        else if (sceneVideoState.active) activateSceneVideo(sceneVideoState.active);
      }, { passive: true });
    }
  }

  function registerSceneVideo(video) {
    sceneVideoState.elements.add(video);
    ensureSceneVideoObserver();
    if (sceneVideoState.observer) sceneVideoState.observer.observe(video);
    else activateSceneVideo(video);
  }

  function disposeSceneVideos() {
    sceneVideoState.elements.forEach((video) => {
      sceneVideoState.observer?.unobserve(video);
      video.pause();
      video.mediaLoadController?.abort();
      if(video.mediaObjectUrl)URL.revokeObjectURL(video.mediaObjectUrl);
      video.removeAttribute('src');
    });
    sceneVideoState.elements.clear();
    sceneVideoState.active = null;
  }

  function makeVideo(scene, className) {
    const figure = document.createElement('figure');
    figure.className = `${className} scene-video-figure`;
    const video = document.createElement('video');
    video.className = 'scene-video';
    video.dataset.src = scene.src.startsWith('./') ? scene.src : `./${scene.src}`;
    video.preload = 'none';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = Boolean(scene.loop);
    video.playsInline = true;
    video.volume = .5;
    video.setAttribute('aria-label', scene.alt || 'Sinematik sahne');
    video.style.objectPosition = scene.position || 'center';
    if (scene.poster) video.poster = scene.poster.startsWith('./') ? scene.poster : `./${scene.poster}`;

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'scene-video-control scene-video-play';
    play.dataset.sceneVideoPlay = 'true';
    play.textContent = '▶';
    const sound = document.createElement('button');
    sound.type = 'button';
    sound.className = 'scene-video-control scene-video-sound';
    sound.dataset.sceneVideoSound = 'true';
    sound.textContent = '♩';
    sound.setAttribute('aria-pressed', 'false');

    const stopPageTurn = (event) => event.stopPropagation();
    [play, sound].forEach((button) => {
      button.addEventListener('pointerdown', stopPageTurn);
      button.addEventListener('pointerup', stopPageTurn);
    });
    play.addEventListener('click', (event) => {
      event.stopPropagation();
      if (video.paused) activateSceneVideo(video, true);
      else video.pause();
      updateSceneVideoControls(video);
    });
    sound.addEventListener('click', (event) => {
      event.stopPropagation();
      video.muted = !video.muted;
      if (!video.muted) activateSceneVideo(video, true);
      updateSceneVideoControls(video);
    });
    video.addEventListener('play', () => updateSceneVideoControls(video), { passive: true });
    video.addEventListener('pause', () => updateSceneVideoControls(video), { passive: true });
    video.addEventListener('error', () => {
      figure.classList.add('is-unavailable');
      play.hidden = true;
      sound.hidden = true;
    }, { once: true });
    figure.append(video, play, sound);
    registerSceneVideo(video);
    updateSceneVideoControls(video);
    return figure;
  }

  function makeSceneMedia(scene, className, preview = false) {
    if (scene.kind !== 'video') return makeImage(scene, className);
    if (!preview) return makeVideo(scene, className);
    return makeImage({ ...scene, src: scene.poster || coverSource() }, className);
  }

  function appendStoryText(container, raw, sourceStart = null) {
    let heading = raw.match(/^((?:\r?\n)*)(?:(#{1,3})\s+(.+?)|((?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SON)\s+KISIM\s+—\s+.+?|Bölüm\s+\d+\s+—\s+.+?|(?:PROLOG|EPİLOG)\s+—\s+.+?|BİRİNCİ\s+KISMIN\s+SONU|DEVAM\s+EDECEK\s+—\s+.+?))(?:\r?\n|$)/iu);
    if (!heading && bookPlan.title) {
      const firstLine = raw.match(/^((?:\r?\n)*)([^\r\n]+)(?:\r?\n|$)/u);
      if (firstLine?.[2] === bookPlan.title) heading = [firstLine[0], firstLine[1], null, null, firstLine[2]];
    }
    let body = raw;
    let prefixLength = 0;
    let bodyStart = 0;
    if (heading) {
      const opening = document.createElement('header');
      opening.className = 'chapter-opening';
      const leadingBreaks = heading[1];
      const firstTitle = (heading[3] || heading[4]).replace(/^\*\*(.+)\*\*$/u, '$1');
      const bookFollowup = firstTitle === bookPlan.title
        ? raw.slice(heading[0].length).match(/^(?:\r?\n[ \t]*)+(?:#{1,3})\s+((?:[IVXLCDM]+)\.\s+KİTAP\s+—\s+.+?)(?:\r?\n|$)/iu)
        : null;
      const isBookTitle = heading[2] === '#' || firstTitle === bookPlan.title || Boolean(bookFollowup);
      const chapterTitle = bookFollowup ? bookFollowup[1] : firstTitle;
      const parts = chapterTitle.match(/^Bölüm\s+(\d+)\s+—\s+(.+)$/iu);
      const epilogue = chapterTitle.match(/^EPİLOG\s+—\s+(.+)$/iu);
      const presentation = presentationFor(chapterTitle);
      opening.dataset.mood = presentation.mood;
      opening.dataset.effect = presentation.effect;
      const chapterSeal = plannedChapterFor(chapterTitle)?.seal;
      if (chapterSeal) opening.dataset.seal = chapterSeal;
      if (parts) opening.dataset.number = parts[1].padStart(2, '0');
      const part = chapterTitle.match(/^(?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SON)\s+KISIM\s+—\s+(.+)$/iu);
      const kicker = document.createElement('p');
      kicker.className = 'chapter-kicker';
      const archiveName = String(bookPlan.kicker || `${bookPlan.title || 'KEŞİF'} KAYITLARI`).toLocaleUpperCase('tr-TR');
      const dossierName = String(bookPlan.title || 'KEŞİF').toLocaleUpperCase('tr-TR') + ' DOSYASI';
      kicker.textContent = bookFollowup ? firstTitle : (parts ? 'BÖLÜM ' + parts[1] : (part ? 'KISIM' : (isBookTitle ? archiveName : (epilogue ? 'SON KAYIT' : dossierName))));
      const title = document.createElement('h2');
      title.textContent = parts ? parts[2] : (part ? part[1] : (epilogue ? epilogue[1] : chapterTitle));
      prefixLength = leadingBreaks.length;
      bodyStart = heading[0].length + (bookFollowup ? bookFollowup[0].length : 0);
      const titleStart = raw.lastIndexOf(title.textContent, bodyStart - title.textContent.length);
      if (sourceStart !== null && titleStart >= prefixLength) title.dataset.bookSourceStart = String(sourceStart + titleStart);
      if (parts) {
        title.id = `bolum-${parts[1]}-${parts[2].toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/gu, '')}`;
        title.tabIndex = -1;
      }
      const rule = document.createElement('span');
      rule.className = 'chapter-rule';
      rule.setAttribute('aria-hidden', 'true');
      opening.addEventListener('animationend', () => { opening.style.willChange = 'auto'; }, { once: true });
      rule.addEventListener('animationend', () => { rule.style.willChange = 'auto'; }, { once: true });
      opening.append(kicker, title, rule);
      container.append(opening);
      body = leadingBreaks + raw.slice(bodyStart);
    }
    const configuredKeywords = Array.isArray(bookPlan.keywords) ? bookPlan.keywords.filter(Boolean) : [];
    const escapedKeywords = configuredKeywords.map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const keywords = escapedKeywords.length
      ? new RegExp(escapedKeywords.join('|'), 'giu')
      : /(?!) /gu;
    const appendKeywords = (target, source) => {
      let cursor = 0;
      let match;
      keywords.lastIndex = 0;
      while ((match = keywords.exec(source))) {
        target.append(document.createTextNode(source.slice(cursor, match.index)));
        const key = document.createElement('span');
        key.className = 'story-keyword';
        key.textContent = match[0];
        target.append(key);
        cursor = keywords.lastIndex;
      }
      target.append(document.createTextNode(source.slice(cursor)));
    };
    let initialPlaced = !heading;
    const appendPrint = (target, source) => {
      if (!initialPlaced) {
        const first = source.search(/\p{L}/u);
        if (first >= 0) {
          appendKeywords(target, source.slice(0, first));
          const initial = document.createElement('span');
          initial.className = 'reader-initial';
          initial.textContent = String.fromCodePoint(source.codePointAt(first));
          target.append(initial);
          source = source.slice(first + initial.textContent.length);
          initialPlaced = true;
        }
      }
      let start = 0;
      for (const match of source.matchAll(/^(\*\*|\*)([^*\r\n]+)\1(?=\r?$)|^—[^\r\n]*|“[^”\r\n]+”|"[^"\r\n]+"/gmu)) {
        appendKeywords(target, source.slice(start, match.index));
        if (match[1]) {
          const formatted = document.createElement(match[1].length === 2 ? 'strong' : 'em');
          const marker = document.createElement('span');
          marker.hidden = true;
          marker.textContent = match[1];
          appendKeywords(formatted, match[2]);
          target.append(marker, formatted, marker.cloneNode(true));
        } else {
          const quotation = document.createElement('span');
          quotation.className = match[0].startsWith('—') ? 'reader-dialogue' : 'reader-quotation';
          appendKeywords(quotation, match[0]);
          target.append(quotation);
        }
        start = match.index + match[0].length;
      }
      appendKeywords(target, source.slice(start));
    };
    const appendMapped = (part, bodyOffset) => {
      if (sourceStart === null) {
        appendPrint(container, part);
        return;
      }
      const append = (text, offset) => {
        if (!text) return;
        const span = document.createElement('span');
        span.dataset.bookSourceStart = String(sourceStart + offset);
        appendPrint(span, text);
        container.append(span);
      };
      const prefix = Math.max(0, Math.min(part.length, prefixLength - bodyOffset));
      append(part.slice(0, prefix), bodyOffset);
      append(part.slice(prefix), bodyStart + bodyOffset + prefix - prefixLength);
    };
    if (state.settings.paragraphSpacing > 0) {
      let bodyOffset = 0;
      for (const part of body.split(/((?:\r?\n){2,})/u)) {
        appendMapped(part, bodyOffset);
        bodyOffset += part.length;
        if (/^(?:\r?\n){2,}$/u.test(part)) {
          const gap = document.createElement('span');
          gap.className = 'paragraph-spacer';
          gap.setAttribute('aria-hidden', 'true');
          container.append(gap);
        }
      }
    } else appendMapped(body, 0);
  }

  function makeLetter(content) {
    const message = String(bookPlan.mektup?.metin || '');
    const stage = document.createElement('div');
    stage.className = 'letter-stage';
    const envelope = document.createElement('button');
    envelope.type = 'button';
    envelope.className = 'letter-envelope';
    envelope.setAttribute('aria-label', 'Mektubu aç');
    envelope.innerHTML = '<span class="envelope-back" aria-hidden="true"></span><span class="envelope-flap" aria-hidden="true"></span><span class="envelope-seal" aria-hidden="true">✦</span><span class="envelope-hint">Dokun</span>';
    const paper = document.createElement('section');
    paper.className = 'letter-paper';
    paper.setAttribute('aria-live', 'polite');
    const text = document.createElement('p');
    text.className = 'letter-text';
    const actions = document.createElement('div');
    actions.className = 'letter-actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Kapat';
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = 'Tekrar';
    actions.append(close, replay);
    paper.append(text, actions);
    stage.append(envelope, paper);
    let timer = 0;
    const stopTyping = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };
    const type = () => {
      stopTyping();
      if (motionReduced() || !message) {
        text.textContent = message;
        return;
      }
      text.textContent = '';
      let cursor = 0;
      const delay = Math.max(38, Math.min(180, Math.floor(3800 / Math.max(1, message.length))));
      const tick = () => {
        text.textContent += message.charAt(cursor);
        cursor += 1;
        if (cursor < message.length) timer = window.setTimeout(tick, delay);
      };
      tick();
    };
    const open = (event) => {
      event?.stopPropagation();
      stage.classList.add('is-open');
      envelope.setAttribute('aria-expanded', 'true');
      state.active = state.pages.length - 1;
      state.activeLeaf = 'letter';
      state.readingAnchor = state.text.length;
      updateProgress();
      persistBookmark();
      type();
    };
    const closeLetter = (event) => {
      event?.stopPropagation();
      stopTyping();
      stage.classList.remove('is-open');
      envelope.setAttribute('aria-expanded', 'false');
      text.textContent = '';
    };
    envelope.addEventListener('click', open);
    close.addEventListener('click', closeLetter);
    replay.addEventListener('click', (event) => { event.stopPropagation(); type(); });
    stage.addEventListener('pointerdown', (event) => event.stopPropagation());
    stage.addEventListener('pointerup', (event) => event.stopPropagation());
    content.append(stage);
  }

  function makePage(page, side, index, preview = false) {
    const article = document.createElement('article');
    article.className = `book-page book-page--${side} ${page.type === 'art' ? 'art-page' : ''} ${page.type === 'end' ? 'end-page' : ''} ${page.type === 'letter' ? 'letter-page' : ''} ${page.type === 'frontmatter' ? 'frontmatter-page' : ''} ${page.type === 'continuation' ? 'continuation-page' : ''}`;
    article.dataset.pageIndex = String(index);
    article.dataset.pageType = page.type;
    article.dataset.sourceStart = String(page.sourceStart ?? 0);
    article.dataset.sourceEnd = String(page.sourceEnd ?? 0);
    const pageHeading = chapterAt(page.sourceStart)?.label;
    article.dataset.mood = page.scene?.mood || page.chapter?.mood || page.continuation?.mood || (page.type === 'letter' ? (bookPlan.end?.mood || 'gizem') : (pageHeading ? presentationFor(pageHeading).mood : 'gizem'));
    const content = document.createElement('div');
    content.className = 'page-content';

    if (page.type === 'frontmatter') {
      const ornament = document.createElement('div');
      ornament.className = 'frontmatter-ornament';
      ornament.setAttribute('aria-hidden', 'true');
      ornament.textContent = '✦';
      const label = document.createElement('p');
      label.className = 'frontmatter-label';
      label.textContent = 'Yazar';
      const author = document.createElement('p');
      author.className = 'frontmatter-author';
      author.textContent = bookPlan.author || '';
      const rule = document.createElement('span');
      rule.className = 'frontmatter-rule';
      rule.setAttribute('aria-hidden', 'true');
      const edition = document.createElement('p');
      edition.className = 'frontmatter-edition';
      edition.textContent = 'Dijital okuma edisyonu';
      content.append(ornament, label, author, rule, edition);
      article.setAttribute('aria-label', 'Kitap bilgileri');
    } else if (page.type === 'art') {
      content.append(makeSceneMedia(page.scene, 'art-illustration', preview));
      const caption = document.createElement('p');
      caption.className = 'scene-caption';
      caption.textContent = page.scene.chapter?.title || '';
      content.append(caption);
      article.setAttribute('aria-label', page.scene.alt);
    } else if (page.type === 'continuation') {
      const kicker = document.createElement('p');
      kicker.className = 'continuation-kicker';
      kicker.textContent = page.continuation.kicker || 'DEVAM';
      const title = document.createElement('h2');
      title.className = 'continuation-title';
      title.textContent = page.continuation.title || 'Devam';
      const arrow = document.createElement('button');
      arrow.type = 'button';
      arrow.className = 'continuation-arrow';
      arrow.textContent = '→';
      arrow.setAttribute('aria-label', `${page.continuation.title || 'Devam'} bölümüne geç`);
      arrow.addEventListener('pointerdown', (event) => event.stopPropagation());
      arrow.addEventListener('pointerup', (event) => event.stopPropagation());
      arrow.addEventListener('click', (event) => {
        event.stopPropagation();
        goTo(index + (singlePage() ? 1 : 2), { animate: true, direction: 1 });
      });
      content.append(kicker, title, arrow);
      article.setAttribute('aria-label', `${page.continuation.title || 'Devam'} geçiş sayfası`);
    } else if (page.type === 'discovery') {
      article.classList.add('discovery-page');
      const summary=window.BookAtlas?.summary(page.discovery);
      if(summary)content.append(summary);
      const actions=document.createElement('div');actions.className='discovery-actions';
      if (page.discovery.nextOffset !== null) {
        const next = document.createElement('button');
        next.type = 'button';
        next.textContent = 'Sonraki Bölüm →';
        next.addEventListener('click', (event) => {
          event.stopPropagation();
          const offset = page.discovery.nextOffset;
          goTo(pageAtOffset(offset), { animate: true, offset });
        });
        actions.append(next);
      }
      const chapters=document.createElement('button');chapters.type='button';chapters.textContent='Bölümler';chapters.addEventListener('click',e=>{e.stopPropagation();openGallery();});actions.append(chapters);
      actions.addEventListener('pointerdown',e=>e.stopPropagation());actions.addEventListener('pointerup',e=>e.stopPropagation());content.append(actions);article.setAttribute('aria-label',page.discovery.chapter+' — keşif haritası');
    } else if (page.type === 'end') {
      const mark = document.createElement('div');
      mark.className = 'end-mark';
      mark.textContent = 'Son';
      const note = document.createElement('p');
      note.textContent = 'Yolculuk tamamlandı';
      content.append(mark, note);
      article.setAttribute('aria-label', 'Son sayfası');
    } else if (page.type === 'letter') {
      makeLetter(content);
      article.setAttribute('aria-label', 'Mektup sayfası');
    } else if (page.type === 'rear') {
      const rearScene = { src: coverSource(), alt: bookPlan.cover?.alt || 'Kitap kapak illüstrasyonu.' };
      content.append(makeImage(rearScene, 'art-illustration'));
      article.setAttribute('aria-label', rearScene.alt);
    } else {
      if (page.scene) content.append(makeSceneMedia(page.scene, 'inline-illustration', preview));
      const text = document.createElement('div');
      text.className = `page-text${page.scene ? ' page-text--with-image' : ''}`;
      // The raw source remains intact; only its visible chapter treatment is semantic markup.
      appendStoryText(text, page.raw, preview ? null : page.sourceStart);
      content.append(text);
    }

    const folio = document.createElement('p');
    folio.className = 'folio';
    folio.textContent = page.type === 'rear' ? (bookPlan.coverMark || '✦') : String(index + 1);
    content.append(folio);
    article.append(content);
    return article;
  }

  function placeVignettes() {
    if (typeof window.makeBookVignette !== 'function') return;
    const labels = {
      bell: 'Pirinç çan süslemesi', cassette: 'Eski kasetçalar süslemesi', compass: 'Pusula süslemesi',
      footprint: 'Ayak izi süslemesi', key: 'Eski anahtar süslemesi', leaf: 'Yaprak süslemesi',
      mirror: 'Ayna süslemesi', moon: 'Ay süslemesi', seal: 'Mühür süslemesi', stone: 'Beyaz taş süslemesi', bird: 'Kuş süslemesi', letter: 'Mektup süslemesi',
      compass: 'Keşif pusulası süslemesi', moon: 'Ay ışığı süslemesi', signal: 'İşaret süslemesi',
      map: 'Keşif haritası süslemesi', line: 'Keşif rotası süslemesi',
    };
    window.requestAnimationFrame(() => {
      if (continuousMode()) return;
      el.spread.querySelectorAll('.book-page').forEach((article) => {
        const page = state.pages[Number(article.dataset.pageIndex)];
        const choices = page?.chapter?.vignettes;
        const copy = article.querySelector('.page-text');
        const folio = article.querySelector('.folio');
        const content = article.querySelector('.page-content');
        if (!choices?.length || !copy || !folio || !content || article.querySelector('.mini-vignette')) return;
        const range = document.createRange();
        range.selectNodeContents(copy);
        const lastText = range.getBoundingClientRect();
        const folioBox = folio.getBoundingClientRect();
        const contentBox = content.getBoundingClientRect();
        const available = folioBox.top - lastText.bottom;
        if (!lastText.height || available < 140) return;
        const name = choices[Math.abs(Number(article.dataset.pageIndex)) % choices.length];
        const vignette = window.makeBookVignette(name, labels[name] || 'Bölüm süslemesi');
        vignette.classList.add('mini-vignette');
        vignette.dataset.vignette = name;
        vignette.style.top = `${Math.max(8, Math.round(lastText.bottom - contentBox.top + 12))}px`;
        content.append(vignette);
      });
    });
  }

  function visibleStart() {
    return singlePage() ? state.active : Math.floor(state.active / 2) * 2;
  }

  function visiblePages() {
    if (!state.readerOpen) return [];
    if (continuousMode()) {
      const top = el.spread.scrollTop;
      const bottom = top + el.spread.clientHeight;
      const pages = el.spread.children;
      const visible = [];
      for (let index = state.active - 1; pages[index] && pages[index].offsetTop + pages[index].offsetHeight > top; index--) {
        visible.unshift(pages[index]);
      }
      for (let index = state.active; pages[index] && pages[index].offsetTop < bottom; index++) {
        if (pages[index].offsetTop + pages[index].offsetHeight > top) visible.push(pages[index]);
      }
      return visible;
    }
    const first = visibleStart();
    const count = singlePage() ? 1 : 2;
    return Array.from(el.spread.children).filter((article) => {
      const index = Number(article.dataset.pageIndex);
      return index >= first && index < first + count;
    });
  }

  const sourceSelector = '[data-book-source-start]';

  function boundaryOffset(container, offset) {
    const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    const span = element?.closest(sourceSelector);
    if (!span || !el.spread.contains(span)) return null;
    const range = document.createRange();
    range.selectNodeContents(span);
    range.setEnd(container, offset);
    return Number(span.dataset.bookSourceStart) + range.toString().length;
  }

  function sourceRange(range) {
    if (!range || range.collapsed || !el.spread.contains(range.commonAncestorContainer)) return null;
    const start = boundaryOffset(range.startContainer, range.startOffset);
    const end = boundaryOffset(range.endContainer, range.endOffset);
    if (start === null || end === null || end <= start) return null;
    const text = state.text.slice(start, end);
    return text === range.toString() ? { start, end, text } : null;
  }

  function boundaryInSpan(span, position) {
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      if (position <= text.length) return [text, position];
      position -= text.length;
    }
    return null;
  }

  function rangeForSource(start, end = start, within = el.spread) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return null;
    let first = null;
    let last = null;
    for (const span of within.querySelectorAll(sourceSelector)) {
      const offset = Number(span.dataset.bookSourceStart);
      const limit = offset + span.textContent.length;
      if (!first && start >= offset && start <= limit && (start < limit || end === start)) {
        first = boundaryInSpan(span, start - offset);
      }
      if (first && end >= offset && end <= limit) {
        last = boundaryInSpan(span, end - offset);
        if (last) break;
      }
    }
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(...first);
    range.setEnd(...last);
    return end === start || sourceRange(range) ? range : null;
  }

  let flowFrame = 0;
  let flowReport = 0;
  let intendedFlowTop = null;

  function clearFlowTracking() {
    cancelAnimationFrame(flowFrame);
    clearTimeout(flowReport);
    flowFrame = 0;
    flowReport = 0;
    intendedFlowTop = null;
  }

  function scrollToReadingAnchor() {
    if (!continuousMode()) return;
    const page = el.spread.children[state.active];
    if (!page) return;
    clearFlowTracking();
    let top = page.offsetTop;
    const offset = sourceOffsetForCurrentPage();
    if (offset > Number(page.dataset.sourceStart) && page.dataset.pageType === 'text') {
      const character = rangeForSource(offset, offset, page)?.getBoundingClientRect();
      if (character?.height) top = el.spread.scrollTop + character.top - el.spread.getBoundingClientRect().top - 24;
    }
    el.spread.scrollTop = top;
    intendedFlowTop = el.spread.scrollTop;
  }

  function observeFlowScroll() {
    if (!state.readerOpen || !continuousMode() || flowFrame) return;
    if (intendedFlowTop !== null && Math.abs(el.spread.scrollTop - intendedFlowTop) < 2) return;
    intendedFlowTop = null;
    flowFrame = requestAnimationFrame(() => {
      flowFrame = 0;
      if (!state.readerOpen || !continuousMode()) return;
      const guide = Math.min(96, el.spread.clientHeight * .18);
      const top = el.spread.scrollTop + guide;
      const children = el.spread.children;
      let low = 0;
      let high = children.length - 1;
      while (low < high) {
        const mid = (low + high) >>> 1;
        const child = children[mid];
        if (child.offsetTop + child.offsetHeight > top) high = mid;
        else low = mid + 1;
      }
      const article = children[low];
      const page = state.pages[low];
      if (!article || !page) return;
      let offset = page.sourceStart;
      const copy = article.querySelector('.page-text');
      if (copy) {
        const box = copy.getBoundingClientRect();
        const x = box.left + Math.min(10, box.width / 2);
        const y = Math.min(box.bottom - 2, el.spread.getBoundingClientRect().top + guide);
        if (y >= box.top) {
          const caret = document.caretPositionFromPoint?.(x, y);
          const fallback = caret ? null : document.caretRangeFromPoint?.(x, y);
          const node = caret?.offsetNode || fallback?.startContainer;
          const precise = node && article.contains(node) ? boundaryOffset(node, caret?.offset ?? fallback.startOffset) : null;
          offset = precise ?? (low === state.active ? state.readingAnchor : null) ?? offset;
        }
      }
      if (low === state.active && offset === state.readingAnchor) return;
      setActivePage(low);
      state.readingAnchor = offset;
      state.bookmarkSuspended = false;
      clearTimeout(flowReport);
      flowReport = setTimeout(() => {
        flowReport = 0;
        if (!state.readerOpen || !continuousMode()) return;
        publishLocation();
        persistBookmark();
      }, 135);
    });
  }

  function publishLocation() {
    const start = visibleStart();
    const visible = state.pages.slice(start, start + (singlePage() ? 1 : 2));
    const first = visible[0];
    el.app.dataset.mood = first?.chapter?.mood || first?.scene?.mood || presentationFor(chapterAt(first?.sourceStart)?.label).mood;
    updateProgress();
    if (!continuousMode()) {
      placeVignettes();
      window.BookSceneFx?.render(el.spread, visible.map((page, i) => ({
        index: start + i, type: page.type, raw: page.raw, chapter: chapterFor(chapterAt(page.sourceStart)?.label),
      })), state.settings.microEffects !== false && state.settings.atmosphereIntensity !== 'off' && !motionReduced() && !state.settings.focusMode);
    }
    window.BookSounds?.scene(visible.map((page) => ({ type: page.type, raw: page.raw, chapter: chapterFor(chapterAt(page.sourceStart)?.label) })));
    window.BookChapterVideo?.render(visible
      .filter((page) => page.type === 'text' || page.type === 'art')
      .map((page) => chapterFor(chapterAt(page.sourceStart)?.label)?.number));
    document.dispatchEvent(new CustomEvent('book:location', { detail: readerLocation() }));
  }

  function renderSpread() {
    if (!state.pages.length) return;
    window.BookSceneFx?.clear();
    clearFlowTracking();
    const start = visibleStart();
    ensurePageFits(start);
    if (!singlePage()) ensurePageFits(start + 1);
    disposeSceneVideos();
    const flow = continuousMode();
    el.spread.classList.toggle('is-reading-flow', flow);
    el.spread.setAttribute('aria-live', flow ? 'off' : 'polite');
    if (flow) {
      const content = document.createDocumentFragment();
      state.pages.forEach((page, index) => content.append(makePage(page, 'single', index)));
      el.spread.replaceChildren(content);
      el.spread.tabIndex = 0;
      el.spread.setAttribute('role', 'region');
      el.spread.setAttribute('aria-label', 'Kaydırmalı kitap metni');
      scrollToReadingAnchor();
    } else {
      el.spread.removeAttribute('tabindex');
      el.spread.removeAttribute('role');
      el.spread.removeAttribute('aria-label');
      if (singlePage()) el.spread.replaceChildren(makePage(state.pages[start], 'single', start));
      else el.spread.replaceChildren(
        makePage(state.pages[start], 'left', start),
        makePage(state.pages[start + 1] || { type: 'rear' }, 'right', start + 1),
      );
      el.spread.scrollTop = 0;
    }
    publishLocation();
  }

  function updateProgress() {
    const start = visibleStart();
    const total = state.pages.length;
    const atLetter = state.pages[state.active]?.type === 'letter';
    el.range.max = String(Math.max(0, total - 1));
    el.range.value = String(atLetter ? total - 1 : start);
    const final = singlePage() ? start + 1 : Math.min(start + 2, total);
    const label = atLetter ? `${total} / ${total}` : (singlePage() ? `${start + 1} / ${total}` : `${start + 1}–${final} / ${total}`);
    el.pageCount.textContent = label;
    const offset = sourceOffsetForCurrentPage();
    if (el.gallery.open) syncGallery(offset);
    el.range.setAttribute('aria-valuetext', `${continuousMode() ? 'Kesit' : 'Sayfa'} ${label}`);
    const step = singlePage() ? 1 : 2;
    const setNavState = (button, disabled) => {
      if (!button) return;
      const wasFocused = disabled && document.activeElement === button;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
      if (wasFocused && el.stage) el.stage.focus({ preventScroll: true });
    };
    setNavState(el.pagePrevious, start <= 0);
    setNavState(el.pageNext, start + step >= total);
  }

  function persistBookmark() {
    if (!state.readerOpen) return;
    const offset = sourceOffsetForCurrentPage();
    storageSet(BOOKMARK_KEY, JSON.stringify({
      offset, page: state.active, anchor: { ...sourceAnchor(offset), leaf: state.activeLeaf },
    }));
  }

  function fadeSpread() {
    if (motionReduced()) return;
    const single = singlePage();
    const speed = Math.max(.6, Math.min(1.6, Number(state.settings.turnSpeed) || 1));
    return el.spread.animate?.([{ opacity: single ? .88 : .62 }, { opacity: 1 }],
      { duration: (single ? 140 : 170) / speed, easing: 'ease-out' });
  }

  function goTo(target, { animate = false, source = 'user', offset = null } = {}) {
    if (state.isTurning && source !== 'turn') return false;
    const maximum = state.pages.length - 1;
    const clamped = Math.max(0, Math.min(maximum, target));
    const next = singlePage() ? clamped : Math.floor(clamped / 2) * 2;
    const moved = next !== state.active;
    if (!moved && offset === null) return false;
    state.readingAnchor = offset;
    setActivePage(clamped);
    if (continuousMode()) {
      scrollToReadingAnchor();
      publishLocation();
    } else if (moved) {
      renderSpread();
      if (animate) state.turnAnimation = fadeSpread();
    } else {
      updateProgress();
      document.dispatchEvent(new CustomEvent('book:location', { detail: readerLocation() }));
    }
    state.bookmarkSuspended = false;
    persistBookmark();
    return true;
  }

  function turnTarget(direction) {
    const target = visibleStart() + direction * (singlePage() ? 1 : 2);
    return target >= 0 && target < state.pages.length ? target : null;
  }

  function cancelTurn() {
    state.gesture = null;
    window.clearTimeout(state.turnTimer);
    state.turnAnimation?.cancel();
    state.turnAnimation = null;
    state.isTurning = false;
  }

  function navigate(direction) {
    if (state.isTurning || !state.readerOpen) return;
    const target = turnTarget(direction);
    if (target === null) return;
    if (continuousMode()) {
      goTo(target);
      return;
    }
    state.isTurning = true;
    window.BookSounds?.page();
    goTo(target, { animate: true, source: 'turn' });
    const animation = state.turnAnimation;
    const unlock = () => {
      if (state.turnAnimation !== animation) return;
      window.clearTimeout(state.turnTimer);
      state.turnAnimation = null;
      state.isTurning = false;
    };
    state.turnTimer = window.setTimeout(unlock, animation ? Number(animation.effect.getTiming().duration) + 80 : 100);
    animation?.finished.then(unlock, unlock);
  }

  function populateToc() {
    el.toc.replaceChildren();
    const chapters = state.chapters.map((chapter) => ({ label: chapter.title, offset: chapter.offset }));
    let gallerySelecting = false;
    for (const chapter of chapters) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chapter-card';
      button.setAttribute('aria-label', chapter.label);
      const planned = plannedChapterFor(chapter.label);
      const art = planned?.galleryImage || mediaForChapter(planned || {}).find((asset) => asset.kind === 'image');
      const visual = document.createElement('span');
      visual.className = 'chapter-card-art';
      visual.setAttribute('aria-hidden', 'true');
      visual.dataset.motif = planned?.vignettes?.[0] || 'compass';
      visual.classList.add('is-motif');
      if (art) button.dataset.chapterArt = planned.id;
      const copy = document.createElement('span');
      copy.className = 'chapter-card-copy';
      const number = document.createElement('span');
      number.className = 'chapter-card-number';
      const chapterNumber = chapter.label.match(/^Bölüm\s+(\d+)/iu)?.[1];
      number.textContent = chapterNumber ? `BÖLÜM ${chapterNumber.padStart(2, '0')}` :
        (/^EPİLOG/u.test(chapter.label) ? 'EPİLOG' : /^PROLOG/u.test(chapter.label) ? 'PROLOG' : 'KİTAP');
      const title = document.createElement('strong');
      title.textContent = chapter.label.replace(/^(?:Bölüm \d+|PROLOG|EPİLOG)\s+—\s+/iu, '');
      const status = document.createElement('span');
      status.className = 'chapter-card-status';
      copy.append(number, title, status);
      button.append(visual, copy);
      button.dataset.sourceOffset = String(chapter.offset);
      const openSelectedChapter=async()=>{
        el.gallery.close();closeSettings();
        if(!state.readerOpen)await showReader({anchor:chapter.offset}).catch(fail);
        else {
          goTo(pageAtOffset(chapter.offset), { animate: true, offset: chapter.offset });
          (continuousMode() ? el.spread : el.stage).focus({ preventScroll: true });
        }
      };
      button.addEventListener('click', async () => {
        if (state.isTurning || gallerySelecting) return;
        gallerySelecting = true;
        try {
        if (!motionReduced() && button.animate) await button.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,-3px,0) scale(.985)',offset:.55},{transform:'translate3d(0,0,0)'}],{duration:150,easing:'ease-out'}).finished.catch(()=>{});
        if (!el.gallery.open) return;
        if (window.BookAtlas?.previewChapter && planned?.galleryImage && button.dataset.artVisible === 'true') {
          const bookmark = parseStoredJson(BOOKMARK_KEY, null);
          const offset = state.readerOpen ? sourceOffsetForCurrentPage() : bookmark ? restoredOffset(bookmark) : -1;
          window.BookAtlas.previewChapter({
            ...planned,
            offset: chapter.offset,
            previewQuote: offset >= (planned.previewUnlock ?? Infinity) ? planned.previewQuote : '',
          }, openSelectedChapter);
          return;
        }
        await openSelectedChapter();
        } finally { gallerySelecting = false; }
      });
      el.toc.append(button);
    }
  }

  function syncGallery(offset) {
    const current = chapterAt(offset)?.offset;
    el.toc.querySelectorAll('[data-source-offset]').forEach((button) => {
      const start = Number(button.dataset.sourceOffset);
      const active = start === current;
      if (active) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
      button.dataset.read = String(current != null && start < current);
      button.querySelector('.chapter-card-status').textContent = active ? 'Kaldığın bölüm' : (start < current ? 'Geçildi' : 'Keşfedilmedi');
      const art = bookPlan.chapters.find(c => c.id === button.dataset.chapterArt)?.galleryImage;
      const visible = Boolean(art && offset >= (art.unlock ?? start));
      if (button.dataset.artVisible === String(visible)) return;
      button.dataset.artVisible = String(visible);
      const frame = button.querySelector('.chapter-card-art');
      frame.replaceChildren();
      frame.classList.toggle('is-motif', !visible);
      if (!visible) return;
      const img = document.createElement('img');
      img.width = art.width;
      img.height = art.height;
      img.alt = art.alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.srcset = `${art.src.replace(/\.webp$/, '-480.webp')} 480w, ${art.src} ${art.width}w`;
      img.sizes = '(max-width: 600px) 42vw, 300px';
      img.src = art.src;
      img.addEventListener('error', () => {
        img.remove();
        frame.classList.add('is-motif');
      }, { once: true });
      frame.append(img);
    });
  }

  function openGallery() {
    if (el.gallery.open) return;
    if (!el.toc.firstElementChild) populateToc();
    document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'gallery' }));
    window.BookSceneFx?.clear();
    const bookmark = parseStoredJson(BOOKMARK_KEY, null);
    syncGallery(state.readerOpen ? sourceOffsetForCurrentPage() : bookmark ? restoredOffset(bookmark) : -1);
    el.gallery.showModal();
  }

  function applySettings({ repaginate = false, fromProfile = false } = {}) {
    const scale = Math.max(.8, Math.min(1.6, Number(state.settings.fontScale) || 1));
    state.settings.fontScale = Math.round(scale * 100) / 100;
    const lineHeight = Math.max(1.45, Math.min(2.05, Number(state.settings.lineHeight) || 1.72));
    state.settings.lineHeight = Math.round(lineHeight * 100) / 100;
    state.settings.reduceMotion = Boolean(state.settings.reduceMotion);
    if (window.BookStyleStudio) window.BookStyleStudio.validate(state.settings);
    else if (!['light','sepia','night','oled','forest','moon','gold','contrast'].includes(state.settings.theme)) state.settings.theme = 'night';
    if (!fromProfile) state.settings.activeProfile = 'personal';
    const numberSetting = (key, low, high) => { const n = Number(state.settings[key]); state.settings[key] = Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : DEFAULT_SETTINGS[key]; };
    [['letterSpacing',0,.08],['paragraphSpacing',0,.6],['textWidth',80,100],['pageMargin',.75,1.25],['surfaceBrightness',85,110],['paperTexture',0,.1],['decorativeLight',0,1],['edgeShade',0,.2]].forEach(([key,low,high])=>numberSetting(key,low,high));
    const choose = (key, values) => { if (!values.includes(state.settings[key])) state.settings[key] = DEFAULT_SETTINGS[key]; };
    choose('readerFont',['lora','georgia','system','sans']); choose('textAlign',['left','justify']); choose('temperature',['neutral','warm','cool']); choose('contrast',['low','normal','high']); choose('atmosphereIntensity',['off','light','normal','cinematic']);
    choose('readingMode', READING_MODES);
    state.settings.focusMode = state.settings.readingMode === 'focus';
    syncReadingLayout();
    choose('breakMinutes',[0,20,30,45]);
    state.settings.audioVolume = clampAudioVolume(state.settings.audioVolume ?? 16);
    el.app.dataset.theme = state.settings.theme;
    el.app.dataset.reduceMotion = String(state.settings.reduceMotion);
    el.app.dataset.focus = String(Boolean(state.settings.focusMode));
    el.app.dataset.sceneFx = String(state.settings.microEffects !== false);
    el.app.dataset.readerContrast = state.settings.contrast;
    el.app.dataset.readerAlign = state.settings.textAlign;
    el.app.dataset.atmosphereIntensity = state.settings.atmosphereIntensity;
    const effectsToggle = document.querySelector('#scene-effects');
    if (effectsToggle) effectsToggle.checked = state.settings.microEffects !== false;
    if (motionReduced() || state.settings.microEffects === false || state.settings.atmosphereIntensity === 'off' || state.settings.focusMode) window.BookSceneFx?.clear();
    document.querySelector('#focus-exit').hidden = !state.settings.focusMode;
    const focusToggle = document.querySelector('#focus-mode');
    if (focusToggle) focusToggle.checked = Boolean(state.settings.focusMode);
    el.app.style.setProperty('--font-scale', String(state.settings.fontScale));
    el.app.style.setProperty('--line-height', String(state.settings.lineHeight));
    const font = {lora:'Lora, Georgia, serif',georgia:'Georgia, serif',system:'ui-serif, Georgia, serif',sans:'system-ui, sans-serif'}[state.settings.readerFont];
    const bright = state.settings.surfaceBrightness;
    const vars = {'--reader-font':font,'--reader-letter-spacing':state.settings.letterSpacing+'em','--reader-text-width':state.settings.textWidth+'%','--reader-paragraph-gap':state.settings.paragraphSpacing+'em','--reader-page-margin':state.settings.pageMargin,'--paper-texture':state.settings.paperTexture,'--surface-share':(bright<=100?bright:200-bright)+'%','--surface-mix':bright<=100?'#000':'#fff','--temperature-share':state.settings.temperature==='neutral'?'0%':'5%','--temperature-color':state.settings.temperature==='cool'?'#86b0c0':'#dab078','--scene-light':state.settings.focusMode?0:state.settings.decorativeLight,'--edge-shade':'rgba(0,0,0,'+state.settings.edgeShade+')'};
    Object.entries(vars).forEach(([key,value])=>el.app.style.setProperty(key,String(value)));
    window.BookSounds?.setIntensity(state.settings.atmosphereIntensity);
    el.fontDecrease.disabled = state.settings.fontScale <= .8;
    el.fontIncrease.disabled = state.settings.fontScale >= 1.6;
    el.fontSizeOutput.value = `${Math.round(state.settings.fontScale * 100)}%`;
    el.fontSizeOutput.textContent = `${Math.round(state.settings.fontScale * 100)}%`;
    if (el.lineHeight) el.lineHeight.value = String(state.settings.lineHeight);
    if (el.lineHeightOutput) el.lineHeightOutput.textContent = state.settings.lineHeight <= 1.6 ? 'Sıkı' : state.settings.lineHeight >= 1.9 ? 'Geniş' : 'Rahat';
    if (el.motionReduce) el.motionReduce.checked = state.settings.reduceMotion;
    el.themeButtons.forEach((button) => {
      const selected = button.dataset.themeChoice === state.settings.theme;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const themeColor = window.BookStyleStudio?.apply(state.settings);
    el.themeMeta.setAttribute('content', themeColor || (state.settings.theme === 'light' ? '#d9d3c9' : state.settings.theme === 'sepia' ? '#4d3e32' : '#1a1d22'));
    updateAudioControls();
    window.BookMusic?.refresh();
    storageSet(SETTINGS_KEY, JSON.stringify(state.settings));
    if (repaginate && state.readerOpen) {
      if (state.isTurning) requestRebuild(80);
      else rebuildPages(sourceOffsetForCurrentPage());
    }
    document.dispatchEvent(new CustomEvent('book:settings', { detail: { ...state.settings } }));
  }

  function fadePanelOut(panel) {
    if (motionReduced() || panel.hidden || !Element.prototype.animate) return;
    const rect = panel.getBoundingClientRect();
    const ghost = panel.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    ghost.classList.add('panel-exit-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    Object.assign(ghost.style, { position: 'fixed', inset: 'auto', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, maxHeight: 'none', margin: '0' });
    ghost.querySelectorAll('input').forEach((node, i) => { const source = panel.querySelectorAll('input')[i]; node.value = source.value; node.checked = source.checked; });
    el.app.append(ghost);
    ghost.scrollTop = panel.scrollTop;
    ghost.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 150, easing: 'ease-out' }).finished.catch(() => {}).finally(() => ghost.remove());
  }

  function openSettings() {
    document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'settings' }));
    window.BookSceneFx?.clear();
    el.settings.hidden = false;
    el.settingsToggle.setAttribute('aria-expanded', 'true');
    el.settingsClose.focus();
  }

  function closeSettings({ restoreFocus = false, animate = true } = {}) {
    const wasOpen = !el.settings.hidden;
    if (wasOpen && animate) fadePanelOut(el.settings);
    el.settings.hidden = true;
    el.settingsToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && wasOpen) el.settingsToggle.focus({ preventScroll: true });
  }

  function toggleSettings() {
    if (el.settings.hidden) openSettings(); else closeSettings();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.app.requestFullscreen();
    } catch {
      // Browsers that disallow fullscreen still keep all controls functional.
    }
  }

  function updateFullscreenLabel() {
    el.fullscreen.innerHTML = document.fullscreenElement ? '<span aria-hidden="true">⊡</span> Tam ekrandan çık' : '<span aria-hidden="true">⛶</span> Tam ekran';
  }

  let cinematicFullscreen = false;

  function exitCinematicFullscreen() {
    if (!cinematicFullscreen) return;
    cinematicFullscreen = false;
    if (document.fullscreenElement === el.app) document.exitFullscreen?.().catch(() => {});
  }

  function setReadingMode(mode) {
    if (!READING_MODES.includes(mode)) return;
    updateReaderSettings({ readingMode: mode });
    if (mode !== 'cinematic' || document.fullscreenElement || !el.app.requestFullscreen) return;
    el.app.requestFullscreen().then(() => {
      cinematicFullscreen = true;
      if (state.settings.readingMode !== 'cinematic' || !state.readerOpen) exitCinematicFullscreen();
    }).catch(() => {});
  }

  function clampAudioVolume(value) {
    return Math.max(0, Math.min(35, Math.round(Number(value) || 0)));
  }

  function audioVolumeText(volume) {
    if (volume === 0) return 'Sessiz';
    if (volume <= 10) return 'Çok düşük';
    if (volume <= 24) return 'Düşük';
    return 'Yumuşak';
  }

  function updateAudioControls() {
    const volume = clampAudioVolume(state.settings.audioVolume ?? 16);
    state.settings.audioVolume = volume;
    const isOn = state.audio.enabled;
    const unavailable = state.audio.unavailable;
    const settingsLabel = unavailable ? 'Desteklenmiyor' : isOn ? 'Efektleri kapat' : 'Efektleri aç';
    const coverLabel = unavailable ? 'Ambiyans kullanılamıyor' : isOn ? 'Karanlık ambiyansı kapat' : 'Karanlık ambiyansı başlat';

    el.audioVolume.value = String(volume);
    el.audioVolumeOutput.textContent = audioVolumeText(volume);
    el.audioToggleLabel.textContent = settingsLabel;
    el.coverAudioLabel.textContent = coverLabel;
    el.audioToggle.setAttribute('aria-pressed', String(isOn));
    el.coverAudioToggle.setAttribute('aria-pressed', String(isOn));
    el.audioToggle.setAttribute('aria-label', settingsLabel);
    el.coverAudioToggle.setAttribute('aria-label', coverLabel);
    el.audioToggle.disabled = unavailable;
    el.coverAudioToggle.disabled = unavailable;
  }

  function setAmbientGain() {
    const { context, master, enabled } = state.audio;
    if (!context || !master) return;
    const now = context.currentTime;
    // The 35-step control deliberately tops out at a quiet listening level.
    const target = enabled ? (state.settings.audioVolume / 35) * .09 : 0;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(target, now, .075);
  }

  function createAmbientAudio() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Bu tarayıcı Web Audio desteği vermiyor.');
    const context = new Context();
    const master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.connect(context.destination);
    state.audio.context = context;
    state.audio.master = master;

    const addDrone = (frequency, type, level, detune = 0) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const tremolo = context.createOscillator();
      const tremoloGain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.detune.setValueAtTime(detune, context.currentTime);
      gain.gain.setValueAtTime(level, context.currentTime);
      tremolo.type = 'sine';
      tremolo.frequency.setValueAtTime(.035 + (Math.abs(detune) / 2500), context.currentTime);
      tremoloGain.gain.setValueAtTime(level * .18, context.currentTime);
      tremolo.connect(tremoloGain).connect(gain.gain);
      oscillator.connect(gain).connect(master);
      oscillator.start();
      tremolo.start();
      state.audio.nodes.push(oscillator, tremolo);
    };

    // A sparse D-minor-inspired drone: it is generated locally, needs no
    // network file, and cannot start until the reader explicitly asks for it.
    addDrone(73.42, 'sine', .34, -5);
    addDrone(110, 'triangle', .15, 4);
    addDrone(146.83, 'sine', .075, -3);

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * .11;
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, context.currentTime);
    noiseGain.gain.setValueAtTime(.055, context.currentTime);
    noise.connect(filter).connect(noiseGain).connect(master);
    noise.start();
    state.audio.nodes.push(noise);
  }

  function stopAmbientBell() {
    window.clearTimeout(state.audio.bellTimer);
    state.audio.bellTimer = 0;
  }

  function ringAmbientBell() {
    const { context } = state.audio;
    if (!context || !state.audio.enabled || context.state !== 'running') return;
    const notes = [146.83, 174.61, 220];
    const now = context.currentTime;
    const bell = context.createOscillator();
    const bellGain = context.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(notes[state.audio.bellStep % notes.length], now);
    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.exponentialRampToValueAtTime(.024, now + .05);
    bellGain.gain.exponentialRampToValueAtTime(.0001, now + 2.8);
    bell.connect(bellGain).connect(state.audio.master);
    bell.start(now);
    bell.stop(now + 3);
    state.audio.bellStep += 1;
  }

  function scheduleAmbientBell() {
    stopAmbientBell();
    const next = () => {
      if (!state.audio.enabled) return;
      ringAmbientBell();
      state.audio.bellTimer = window.setTimeout(next, 18500);
    };
    state.audio.bellTimer = window.setTimeout(next, 6500);
  }

  async function toggleAmbient() {
    if (state.audio.unavailable) return;
    try {
      if (!state.audio.context) createAmbientAudio();
      if (state.audio.context.state === 'suspended') await state.audio.context.resume();
      state.audio.enabled = !state.audio.enabled;
      setAmbientGain();
      if (state.audio.enabled) scheduleAmbientBell(); else stopAmbientBell();
      updateAudioControls();
    } catch {
      state.audio.enabled = false;
      state.audio.unavailable = true;
      stopAmbientBell();
      updateAudioControls();
    }
  }

  function updateAmbientVolume(value) {
    state.settings.audioVolume = clampAudioVolume(value);
    setAmbientGain();
    updateAudioControls();
    storageSet(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function rebuildPages(anchor = 0, {
    leaf = state.activeLeaf,
    preferText = !leaf && state.pages[state.active]?.type === 'text',
    persist = !state.bookmarkSuspended,
  } = {}) {
    if (!state.readerOpen && el.reader.hidden) return;
    syncReadingLayout();
    const { width, height } = getPageGeometry();
    const layout = JSON.stringify([width, height, innerWidth, innerHeight, singlePage(),
      ...layoutSettings.map(key => state.settings[key])]);
    const cached = pageLayouts.get(layout);
    if (cached) {
      state.pages = cached;
      pageLayouts.delete(layout);
    } else {
      const fonts = document.fonts ? [...document.fonts] : [];
      const stableFonts = fonts.length > 0 && fonts.every(font => font.status === 'loaded');
      const diskKey = stableFonts && !continuousMode() ? JSON.stringify([
        state.story.sha256, navigator.userAgent, window.devicePixelRatio, layout,
      ]) : null;
      const saved = diskKey && parseStoredJson(layoutStorageKey, null);
      const ends = saved?.key === diskKey && Array.isArray(saved.ends) ? saved.ends : null;
      if (!ends || !buildPages({ width, height }, ends)) {
        buildPages({ width, height });
        if (diskKey) storageSet(layoutStorageKey, JSON.stringify({
          key: diskKey,
          ends: state.pages.filter(page => page.type === 'text').map(page => page.sourceEnd),
        }));
      }
    }
    pageLayouts.set(layout, state.pages);
    if (pageLayouts.size > 3) pageLayouts.delete(pageLayouts.keys().next().value);
    const offset = Math.max(0, Math.min(state.text.length, Number(anchor) || 0));
    state.readingAnchor = offset;
    setActivePage(pageAtAnchor(offset, leaf, preferText));
    renderSpread();
    if (persist) persistBookmark();
  }

  // Mobile browser chrome and orientation changes can fire in the middle of a
  // leaf turn. Wait for the short turn lock before rebuilding the spread.
  function requestRebuild(delay = 180, attempts = 0) {
    if (!state.readerOpen) return;
    window.clearTimeout(state.resizing);
    state.resizing = window.setTimeout(() => {
      if (!state.readerOpen) return;
      if (state.isTurning) {
        if (attempts < 6) requestRebuild(120, attempts + 1);
        return;
      }
      rebuildPages(sourceOffsetForCurrentPage());
    }, delay);
  }

  async function showReader({ restore = false, anchor = null, preferText = false, leaf = null, preserveBookmark = false } = {}) {
    if (state.isTurning) return;
    state.isTurning = true;
    const startLabel = el.start.querySelector('span');
    const originalLabel = startLabel?.textContent;
    el.start.disabled = true;
    el.reader.hidden = false;
    state.readerOpen = true;
    try {
      // The reader is ready synchronously: do not put a loading message or a
      // font/network wait between the reader and its first page.
      let readerAnchor = Number.isFinite(anchor) ? anchor : 0;
      if (restore) {
        const bookmark = parseStoredJson(BOOKMARK_KEY, null);
        if (bookmark) {
          readerAnchor = restoredOffset(bookmark);
          if (bookmark.anchor?.sourceHash === state.story.sha256) {
            leaf = bookmark.anchor.leaf;
            preferText = leaf === null;
          }
        }
      }
      state.bookmarkSuspended = Boolean(preserveBookmark);
      window.BookSounds?.open?.();
      rebuildPages(readerAnchor, { leaf, preferText, persist: !state.bookmarkSuspended });
      window.clearTimeout(state.coverTimer);
      el.cover.classList.remove('is-opening');
      el.cover.hidden = true;
      (continuousMode() ? el.spread : el.stage).focus({ preventScroll: true });
      if (!continuousMode()) showGestureHint();
    } finally {
      state.isTurning = false;
      el.start.disabled = false;
      if (startLabel && originalLabel) startLabel.textContent = originalLabel;
    }
  }

  function showCover() {
    document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'home' }));
    if (!state.readerOpen) {
      el.start.focus({ preventScroll: true });
      return;
    }
    cancelTurn();
    window.BookSceneFx?.clear();
    if (!state.bookmarkSuspended) persistBookmark();
    clearFlowTracking();
    disposeSceneVideos();
    exitCinematicFullscreen();
    state.bookmarkSuspended = false;
    window.clearTimeout(state.coverTimer);
    closeSettings();
    state.readerOpen = false;
    window.BookSounds?.stop();
    window.BookSounds?.close?.();
    el.reader.hidden = true;
    el.cover.classList.remove('is-opening');
    el.cover.hidden = false;
    syncCoverResume();
    el.start.focus({ preventScroll: true });
  }

  function showGestureHint() {
    if (storageGet(HINT_KEY)) return;
    el.hint.hidden = false;
    storageSet(HINT_KEY, '1');
    window.setTimeout(() => { el.hint.hidden = true; }, 6200);
  }

  function handlePointerDown(event) {
    if (!state.readerOpen || continuousMode() || state.isTurning || state.gesture || event.button > 0) return;
    if (el.stage.dataset.selectText === 'true' || event.target.closest('button, a, input, select, textarea, [contenteditable]')) return;
    const rect = el.stage.getBoundingClientRect();
    state.gesture = { pointer: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now(), rect };
    try { el.stage.setPointerCapture(event.pointerId); } catch { /* no-op */ }
  }

  function handlePointerUp(event) {
    const gesture = state.gesture;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    state.gesture = null;
    if (!state.readerOpen) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const elapsed = performance.now() - gesture.at;
    const horizontalSwipe = Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2;
    if (horizontalSwipe) {
      navigate(dx < 0 ? 1 : -1);
      return;
    }
    if (elapsed > 650 || Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
    const fraction = (event.clientX - gesture.rect.left) / gesture.rect.width;
    if (isMobile()) {
      // The central strip is reserved for controls; the rest behaves like the
      // familiar left/right halves of a handheld reader.
      if (fraction > .55) navigate(1);
      else if (fraction < .45) navigate(-1);
      else toggleSettings();
    } else if (fraction >= .5) {
      navigate(1);
    } else {
      navigate(-1);
    }
  }

  function handlePointerCancel(event) {
    const gesture = state.gesture;
    if (!gesture || (event && gesture.pointer !== event.pointerId)) return;
    state.gesture = null;
  }

  function bindEvents() {
    document.addEventListener('book:panel-close', (event) => fadePanelOut(event.detail));
    document.addEventListener('visibilitychange', () => { if (document.hidden) document.querySelectorAll('.panel-exit-ghost').forEach((node) => { node.getAnimations().forEach((animation) => animation.cancel()); node.remove(); }); });
    document.addEventListener('book:panel-open', (event) => {
      handlePointerCancel();
      el.hint.hidden = true;
      if (event.detail !== 'settings') closeSettings({ animate:false });
      window.BookSceneFx?.clear();
    });
    document.querySelector('#scene-effects')?.addEventListener('change', (event) => {
      state.settings.microEffects = event.target.checked;
      applySettings();
    });
    const openBook = () => showReader({ restore: false }).catch(fail);
    el.start.addEventListener('click', openBook);
    const coverArt = el.cover.querySelector('.cover-art');
    coverArt?.addEventListener('click', openBook);
    coverArt?.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openBook();
    });
    el.continueReading?.addEventListener('click', () => { showReader({ restore: true }).catch(fail); });
    el.coverTocOpen?.addEventListener('click', openGallery);
    document.querySelector('#reader-toc-open').addEventListener('click', openGallery);
    document.querySelector('#gallery-close').addEventListener('click', () => el.gallery.close());
    el.gallery.addEventListener('click', (event) => { if (event.target === el.gallery) { const r = el.gallery.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) el.gallery.close(); } });
    document.querySelector('#focus-exit').addEventListener('click', () => {
      updateReaderSettings({ focusMode: false });
      el.settingsToggle.focus({ preventScroll: true });
    });
    el.coverAudioToggle.addEventListener('click', toggleAmbient);
    el.coverButton.addEventListener('click', showCover);
    [[el.pagePrevious, -1], [el.pageNext, 1]].forEach(([button, direction]) => {
      if (!button) return;
      button.addEventListener('pointerdown', (event) => event.stopPropagation());
      button.addEventListener('pointerup', (event) => event.stopPropagation());
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (event.pointerType === 'mouse' && event.detail === 2) return;
        navigate(direction);
      });
    });
    document.querySelector('#focus-mode')?.addEventListener('change', (event) => {
      updateReaderSettings({ focusMode: event.target.checked });
    });
    el.settingsToggle.addEventListener('click', toggleSettings);
    el.settingsClose.addEventListener('click', () => closeSettings({ restoreFocus: true }));
    el.fontDecrease.addEventListener('click', () => {
      state.settings.fontScale = Math.max(.8, state.settings.fontScale - .08);
      applySettings({ repaginate: true });
    });
    el.fontIncrease.addEventListener('click', () => {
      state.settings.fontScale = Math.min(1.6, state.settings.fontScale + .08);
      applySettings({ repaginate: true });
    });
    el.lineHeight?.addEventListener('change', () => {
      state.settings.lineHeight = Number(el.lineHeight.value);
      applySettings({ repaginate: true });
    });
    el.motionReduce?.addEventListener('change', () => {
      state.settings.reduceMotion = el.motionReduce.checked;
      applySettings();
    });
    el.themeButtons.forEach((button) => button.addEventListener('click', () => {
      state.settings.theme = button.dataset.themeChoice;
      applySettings();
    }));
    el.audioToggle.addEventListener('click', toggleAmbient);
    el.audioVolume.addEventListener('input', () => updateAmbientVolume(el.audioVolume.value));
    el.fullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) cinematicFullscreen = false;
      updateFullscreenLabel();
    });
    el.range.addEventListener('input', () => goTo(Number(el.range.value), { animate: false }));
    el.spread.addEventListener('scroll', observeFlowScroll, { passive: true });
    window.addEventListener('pagehide', () => {
      if (!state.bookmarkSuspended) persistBookmark();
      clearFlowTracking();
    });
    el.stage.addEventListener('pointerdown', handlePointerDown);
    el.stage.addEventListener('pointerup', handlePointerUp);
    el.stage.addEventListener('pointercancel', handlePointerCancel);
    el.stage.addEventListener('lostpointercapture', handlePointerCancel);
    document.addEventListener('keydown', (event) => {
      if (!state.readerOpen || document.querySelector('dialog[open]') || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape' && !el.settings.hidden) {
        closeSettings({ restoreFocus: true });
        return;
      }
      if (event.key === 'Escape' && state.gesture) { handlePointerCancel(); return; }
      if (!el.settings.hidden || document.querySelector('#music-panel:not([hidden]), #reader-quick-panel:not([hidden])')) return;
      // Do not steal native keyboard behaviour from controls in the settings panel,
      // the cover button, or the progress slider.
      if (event.target.closest('button, input, select, textarea, [contenteditable="true"]')) return;
      if (el.stage.dataset.selectText === 'true') return;
      if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (continuousMode()) el.spread.scrollBy({ top: el.spread.clientHeight * .85 * (event.shiftKey ? -1 : 1), behavior: 'instant' });
        else navigate(1);
      }
    });
    window.addEventListener('resize', () => {
      requestRebuild();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      cancelTurn();
    });
    REDUCED_MOTION.addEventListener?.('change', () => {
      if (motionReduced()) cancelTurn();
    });
    MOBILE_QUERY.addEventListener?.('change', () => {
      requestRebuild(0);
    });
  }

  // Decorative only: on a mouse-equipped screen the room receives a subtle
  // moving glow. It is throttled to one paint and never participates in touch
  // gestures, page turns, or reduced-motion sessions.
  function bindAmbientPointer() {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const app = document.querySelector('#app');
    if (!app) return;
    let frame = 0;
    let x = 50;
    let y = 14;
    const paint = () => {
      frame = 0;
      app.style.setProperty('--spot-x', `${x}%`);
      app.style.setProperty('--spot-y', `${y}%`);
    };
    window.addEventListener('pointermove', (event) => {
      if (!media.matches || motionReduced() || state.settings.focusMode) return;
      x = Math.max(0, Math.min(100, (event.clientX / Math.max(1, window.innerWidth)) * 100));
      y = Math.max(0, Math.min(100, (event.clientY / Math.max(1, window.innerHeight)) * 100));
      if (!frame) frame = window.requestAnimationFrame(paint);
    }, { passive: true });
    const reset = () => {
      if (media.matches && !motionReduced()) return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      app.style.removeProperty('--spot-x');
      app.style.removeProperty('--spot-y');
    };
    media.addEventListener?.('change', reset);
    REDUCED_MOTION.addEventListener?.('change', reset);
  }

  function fail(error) {
    console.error(error);
    el.loading.hidden = true;
    el.cover.hidden = true;
    el.reader.hidden = true;
    el.error.hidden = false;
    el.errorMessage.textContent = error.message || 'Beklenmeyen bir hata oluştu.';
  }

  async function init() {
    try {
      assertStory();
      const saved = parseStoredJson(SETTINGS_KEY, null);
      state.settings = { ...state.settings, ...saved };
      if (!saved?.readingMode && saved?.focusMode) state.settings.readingMode = 'focus';
      applySettings({ fromProfile:true });
      setCoverContent();
      bindEvents();
      bindAmbientPointer();
      document.fonts?.addEventListener('loadingdone', () => {
        pageLayouts.clear();
        requestRebuild(0);
      });
      document.fonts?.load('italic 400 1rem Lora').catch(() => {});
      // Show the cover immediately. Paginating 33k characters is deferred
      // until the reader is requested, so an offline font request cannot keep
      // The loading screen must never remain visible indefinitely.
      el.cover.hidden = false;
      el.loading.hidden = true;
    } catch (error) {
      fail(error);
    }
  }

const floatingAudio = document.getElementById('floating-audio-toggle');
const floatingAudioLabel = document.getElementById('floating-audio-label');
const syncFloatingAudio = () => {
  if (!floatingAudio) return;
  const label = 'Müzik seçeneklerini aç';
  floatingAudio.setAttribute('aria-label', label);
  floatingAudio.title = label;
  if (floatingAudioLabel) floatingAudioLabel.textContent = label;
};
if (floatingAudio) {
  new MutationObserver(syncFloatingAudio).observe(document.getElementById('audio-toggle'), { attributes: true, attributeFilter: ['aria-pressed'] });
  syncFloatingAudio();
}

document.addEventListener('visibilitychange', () => {
  const context = state.audio.context;
  if (!context) return;
  if (document.hidden) {
    context.suspend().catch(() => {});
  } else if (state.audio.enabled) {
    context.resume().catch(() => {});
  }
}, { passive: true });

  function readerLocation() {
    const saved = state.readerOpen ? null : parseStoredJson(BOOKMARK_KEY, null);
    const offset = state.readerOpen ? sourceOffsetForCurrentPage() : restoredOffset(saved);
    const current = state.chapters[sourceIndexAt(state.chapters, offset)];
    const end = current?.end ?? state.chapters[0]?.offset ?? state.text.length;
    const start = current?.offset || 0;
    const page = state.pages[state.active];
    const shown = visiblePages();
    const leaf = state.readerOpen ? state.activeLeaf : saved?.anchor && saved.anchor.sourceHash === state.story?.sha256 ? saved.anchor.leaf : null;
    return {
      offset, length: state.text.length, chapter: current?.title || bookPlan.title,
      chapterPercent: Math.max(0, Math.min(100, Math.round((offset - start) / Math.max(1, end - start) * 100))),
      percent: Math.round(offset / Math.max(1, state.text.length) * 100),
      excerpt: state.text.slice(offset, offset + 90).replace(/\s+/g, ' ').trim(),
      page: state.active + 1, total: state.pages.length,
      pageStart: page?.sourceStart ?? offset, pageEnd: page?.sourceEnd ?? offset,
      visibleStart: shown.length ? Math.min(...shown.map((node) => Number(node.dataset.sourceStart))) : offset,
      visibleEnd: shown.length ? Math.max(...shown.map((node) => Number(node.dataset.sourceEnd))) : offset,
      open: state.readerOpen, mode: state.settings.readingMode, anchor: { ...sourceAnchor(offset), leaf },
    };
  }

  function updateReaderSettings(patch, { preset = false } = {}) {
    const next = { ...patch };
    const mode = state.settings.readingMode;
    if (!('readingMode' in next) && 'focusMode' in next) {
      if (next.focusMode) next.readingMode = 'focus';
      else if (mode === 'focus') next.readingMode = state.settings.previousReadingMode || 'physical';
    }
    const modeChanged = READING_MODES.includes(next.readingMode) && next.readingMode !== mode;
    if (modeChanged) {
      if (next.readingMode === 'focus') next.previousReadingMode = mode;
      if (mode === 'cinematic') exitCinematicFullscreen();
      el.hint.hidden = true;
      cancelTurn();
    }
    const geometry = ['fontScale','lineHeight','readerFont','letterSpacing','paragraphSpacing','textWidth','pageMargin','textAlign','theme',...window.BookStyleStudio?.geometry || []];
    const repaginate = modeChanged || geometry.some((key) => key in next && next[key] !== state.settings[key]);
    Object.assign(state.settings, next);
    applySettings({ repaginate, fromProfile: preset });
    if (modeChanged && state.readerOpen && next.readingMode === 'focus') {
      document.querySelector('#focus-exit').focus({ preventScroll: true });
    }
  }
  window.BookReader = Object.freeze({
    settings: () => ({...state.settings}), defaults: () => ({...DEFAULT_SETTINGS}), location: readerLocation,
    chapters: () => state.chapters.map(chapter => ({
      ...chapter,
      page: state.pages.findIndex(page => page.type === 'text' &&
        page.sourceStart <= chapter.offset && chapter.offset < page.sourceEnd) + 1,
    })),
    illustrations: () => state.pages.filter(page => page.scene?.kind === 'image').map(page => ({
      src: page.scene.src, chapterId: page.scene.chapter?.id, offset: page.sourceStart, leaf: leafIdentity(page),
    })),
    source: () => state.text,
    sourceAnchor, sourceRange, rangeForSource, visiblePages, setReadingMode,
    update: updateReaderSettings,
    reset() {
      exitCinematicFullscreen();
      cancelTurn();
      state.settings = { ...DEFAULT_SETTINGS };
      applySettings({ repaginate: true, fromProfile: true });
    },
    openSettings, closeSettings, home: showCover,
    async seek(offset, { preferText = false, anchor = null } = {}) {
      for(let n=0;state.isTurning&&n<8;n++)await new Promise(resolve=>setTimeout(resolve,80));
      if(state.isTurning)return false;
      const at = restoredOffset({ offset: Number(offset) || 0, anchor });
      const leaf = !anchor?.sourceHash || anchor.sourceHash === state.story.sha256 ? anchor?.leaf : null;
      const text = preferText || leaf === null && Boolean(anchor);
      if (!state.readerOpen) await showReader({ anchor: at, leaf, preferText: text });
      else goTo(pageAtAnchor(at, leaf, text), { offset: at });
      return true;
    },
  });
init();
})();

// File-backed music stays outside the paginated reader, so page turns never restart it.
(() => {
  'use strict';

  const bgm = document.getElementById('bgm');
  if (!bgm) return;
  const MUSIC_KEY = String(window.BOOK_PLAN?.storageId || 'digital-book') + ':music';
  const MUSIC_VOLUME_KEY = `${MUSIC_KEY}:volume`;
  const volume = document.getElementById('audio-volume');
  const panelVolume = document.getElementById('music-panel-volume');
  const volumeInputs = [volume, panelVolume].filter(Boolean);
  const panel = document.getElementById('music-panel');
  const list = document.getElementById('music-list');
  const labels = {
    setting: document.getElementById('audio-toggle-label'),
    cover: document.getElementById('cover-audio-label'),
    floating: document.getElementById('floating-audio-label'),
  };
  const controls = [document.getElementById('audio-toggle'), document.getElementById('cover-audio-toggle')].filter(Boolean);
  let tracks = [];
  let selected = Number(localStorage.getItem(MUSIC_KEY)) || 0;
  let intended = false;
  let pausedForVisibility = false;
  let starting = false;
  let sourceVersion = 0, sourceRequest = null;
  let playlistReady = null;
  let mediaObjectUrl = '';
  const storedVolumeRaw = localStorage.getItem(MUSIC_VOLUME_KEY);
  const storedVolume = storedVolumeRaw === null ? Number.NaN : Number(storedVolumeRaw);
  let playbackVolume = Number.isFinite(storedVolume) ? Math.max(0, Math.min(.5, storedVolume)) : .25;
  let chapterDucking = false, pausedForChapter = false;

  bgm.loop = true;
  bgm.preload = 'none';
  bgm.volume = playbackVolume;

  const selectedTrack = () => tracks.find((track) => Number(track.sira) === selected) || null;
  const musicFilters=document.createElement('div');musicFilters.className='music-filters';
  const musicSearch=document.createElement('input');musicSearch.type='search';musicSearch.id='music-search';musicSearch.placeholder='Parça veya sanatçı ara';musicSearch.setAttribute('aria-label','Müzik kütüphanesinde ara');
  const musicGenre=document.createElement('select');musicGenre.id='music-genre';musicGenre.setAttribute('aria-label','Doğrulanmış müzik türü');musicGenre.add(new Option('Bütün türler',''));musicFilters.append(musicSearch,musicGenre);list.before(musicFilters);
  musicSearch.addEventListener('input',()=>renderTracks());musicGenre.addEventListener('change',()=>renderTracks());
  bgm.addEventListener('loadedmetadata',()=>{const track=selectedTrack();if(track&&Number.isFinite(bgm.duration)){track.duration=bgm.duration;renderTracks();}});
  const applyPlaybackVolume = () => {
    const target = playbackVolume * (chapterDucking ? .25 : 1);
    bgm.volume = target;
    // iOS may ignore media volume. Pause this music only until ducking ends.
    if (chapterDucking && playbackVolume > 0 && Math.abs(bgm.volume - target) > .01) {
      pausedForChapter = intended;
      bgm.pause();
      return false;
    }
    return true;
  };
  const syncVolumes = () => {
    volumeInputs.forEach((input) => {
      const max = Number(input.max) || 100;
      input.value = String(Math.round((playbackVolume / .5) * max));
    });
    const output = document.getElementById('audio-volume-output');
    if (output) output.textContent = '%' + Math.round(playbackVolume / .5 * 100);
  };
  const applyVolume = (input) => {
    const max = Number(input?.max) || 100;
    playbackVolume = Math.max(0, Math.min(.5, (Number(input?.value) / max) * .5));
    applyPlaybackVolume();
    localStorage.setItem(MUSIC_VOLUME_KEY, String(playbackVolume));
    syncVolumes();
  };
  volumeInputs.forEach((input) => input.addEventListener('input', (event) => {
    event.stopImmediatePropagation();
    applyVolume(input);
  }, true));
  const sync = (playing) => {
    controls.forEach((control) => {
      control.setAttribute('aria-pressed', String(playing));
      control.setAttribute('aria-label', playing ? 'Arka plan müziğini kapat' : 'Arka plan müziğini başlat');
      control.title = playing ? 'Arka plan müziğini kapat' : 'Arka plan müziğini başlat';
    });
    if (labels.setting) labels.setting.textContent = playing ? 'Sesi kapat' : 'Sesi aç';
    if (labels.cover) labels.cover.textContent = playing ? 'Müziği kapat' : 'Müziği başlat';
    if (labels.floating) labels.floating.textContent = 'Müzik seçeneklerini aç';
    document.querySelectorAll('[data-music-track]').forEach((button) => {
      const active=Number(button.dataset.musicTrack)===selected;
      button.setAttribute('aria-pressed', String(active&&playing));button.dataset.selected=String(active);
      button.querySelector('.music-choice-index').textContent=active&&playing?'Ⅱ':'▶';
      const track=tracks.find(t=>String(t.sira)===button.dataset.musicTrack);button.setAttribute('aria-label',(track?.ad||'Parça')+(active&&playing?' · Duraklat':' · Oynat'));
    });
  };
  const renderTracks = () => {
    if (!list) return;
    list.replaceChildren();
    tracks.filter(t=>(!musicSearch.value||[t.ad,t.artist,t.dosya].join(' ').toLocaleLowerCase('tr').includes(musicSearch.value.toLocaleLowerCase('tr')))&&(!musicGenre.value||t.genre===musicGenre.value)).forEach((track) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'music-choice';
      button.dataset.musicTrack = String(track.sira);
      button.setAttribute('aria-pressed', String(Number(track.sira) === selected));
      const index = document.createElement('span');
      index.className = 'music-choice-index';
      index.textContent = String(track.sira);
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = track.ad;
      const mood = document.createElement('small');
      mood.textContent = [track.artist,track.mood,track.format?.toUpperCase(),track.duration?`${Math.floor(track.duration/60)}:${String(Math.floor(track.duration%60)).padStart(2,'0')}`:''].filter(Boolean).join(' · ');
      copy.append(name, mood);
      button.append(index, copy);
      list.append(button);
    });
    sync(!bgm.paused);
  };
  const releaseMediaObjectUrl = () => {
    if (!mediaObjectUrl) return;
    URL.revokeObjectURL(mediaObjectUrl);
    mediaObjectUrl = '';
  };
  const setSource = async (version) => {
    const track = selectedTrack();
    if (!track || (bgm.dataset.track === String(track.sira) && bgm.getAttribute('src'))) return Boolean(track);
    bgm.pause();
    bgm.removeAttribute('src');
    releaseMediaObjectUrl();
    bgm.dataset.track = String(track.sira);
    delete bgm.dataset.directFallback;
    const sourceUrl = `./assets/music/${encodeURIComponent(track.dosya)}`;
    sourceRequest = new AbortController();
    try {
      const response = await fetch(sourceUrl, { cache: 'force-cache', signal: sourceRequest.signal });
      if (!response.ok) throw new Error('music unavailable');
      const blob = await response.blob();
      if (!blob.size) throw new Error('empty music');
      if (version !== sourceVersion || !intended) return false;
      mediaObjectUrl = URL.createObjectURL(blob);
      bgm.src = mediaObjectUrl;
    } catch {
      if (version !== sourceVersion || !intended) return false;
      bgm.src = sourceUrl;
      bgm.dataset.directFallback = '1';
    }
    bgm.load();
    return true;
  };
  const start = async () => {
    if (starting) return;
    if (!tracks.length && playlistReady) await playlistReady;
    if (!tracks.length || starting) return;
    if (!selectedTrack()) { openPanel(true); return; }
    const version = sourceVersion;
    starting = true;
    intended = true;
    bgm.muted = false;
    if (!await setSource(version) || version !== sourceVersion || !intended) { if (version === sourceVersion) starting = false; return; }
    if (!applyPlaybackVolume()) { starting = false; return; }
    try {
      await bgm.play();
      if (version === sourceVersion) sync(!bgm.paused);
    } catch {
      if (version === sourceVersion) { intended = false; sync(false); }
    } finally {
      if (version === sourceVersion) starting = false;
    }
  };
  const stop = () => {
    sourceVersion += 1;
    sourceRequest?.abort();
    starting = false;
    intended = false;
    pausedForVisibility = false;
    pausedForChapter = false;
    bgm.pause();
    sync(false);
  };
  const choose = (id, play) => {
    const next = tracks.find((track) => Number(track.sira) === Number(id));
    if (!next) return;
    const resume = play || (intended && !bgm.paused);
    stop();
    selected = Number(next.sira);
    localStorage.setItem(MUSIC_KEY, String(selected));
    bgm.pause();
    bgm.removeAttribute('src');
    releaseMediaObjectUrl();
    delete bgm.dataset.track;
    renderTracks();
    sync(false);
    if (resume) start();
  };
  const openPanel = (open = true) => {
    if (!panel) return;
    if (open) document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'music' }));
    else if (!panel.hidden) document.dispatchEvent(new CustomEvent('book:panel-close', { detail: panel }));
    panel.hidden = !open;
    panel.classList.toggle('is-open', open);
    document.getElementById('floating-audio-toggle')?.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('book:panel-open', (event) => { if (event.detail !== 'music') openPanel(false); });
  const loadPlaylist = async () => {
    try {
      const response = await fetch('./assets/music/muzik.json?v=40000', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      tracks = Array.isArray(payload.tracks) ? payload.tracks.filter((track) => track?.dosya && track?.ad) : [];
      if (!selectedTrack()) selected = Number(tracks[0]?.sira) || 0;
      musicGenre.replaceChildren(new Option('Bütün türler',''));[...new Set(tracks.map(t=>t.genre).filter(Boolean))].forEach(g=>musicGenre.add(new Option(g,g)));
      musicGenre.hidden=!tracks.some(t=>t.genre);
      renderTracks();
      sync(false);
      if(!tracks.length){list.textContent="Bu kitap için henüz müzik eklenmedi. Kitap sesini ayarlardan yönetebilirsin.";[document.getElementById("cover-audio-toggle"),document.getElementById("audio-toggle")].filter(Boolean).forEach(b=>{b.disabled=true;b.title="Bu kitap için müzik dosyası eklenmedi";});if(labels.cover)labels.cover.textContent="Müzik eklenmedi";}
    } catch {
      tracks = [];
    }
  };

  document.addEventListener('click', (event) => {
    const target = event.target.closest('#audio-toggle, #cover-audio-toggle, #floating-audio-toggle, #music-close, #music-silent, [data-music-track]');
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (target.id === 'floating-audio-toggle') return openPanel(panel?.hidden);
    if (target.id === 'music-close') return openPanel(false);
    if (target.id === 'music-silent') { stop(); return openPanel(false); }
    if (target.dataset.musicTrack) { if(Number(target.dataset.musicTrack)===selected){if(!bgm.paused)stop();else start();}else choose(target.dataset.musicTrack,true);return; }
    if (intended || !bgm.paused) { window.BookSounds?.setEnabled(false); stop(); } else start();
  }, true);

  bgm.addEventListener('pause', () => { if (!pausedForVisibility) sync(false); });
  bgm.addEventListener('error', () => {
    const track = selectedTrack();
    if (track && mediaObjectUrl && !bgm.dataset.directFallback) {
      const sourceUrl = `./assets/music/${encodeURIComponent(track.dosya)}`;
      releaseMediaObjectUrl();
      bgm.dataset.directFallback = '1';
      bgm.src = sourceUrl;
      bgm.load();
      if (intended) bgm.play().then(() => sync(true)).catch(() => { intended = false; sync(false); });
      return;
    }
    intended = false;
    sync(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && intended && !bgm.paused) {
      pausedForVisibility = true;
      bgm.pause();
    } else if (!document.hidden && pausedForVisibility && intended) {
      pausedForVisibility = false;
      start();
    }
  });
  syncVolumes();
  const duckOwners = new Set();
  window.BookMusic = {
    refresh() { sync(!bgm.paused);syncVolumes(); },
    duck(active, owner = 'chapter') {
      const resume = pausedForChapter;
      if (active) duckOwners.add(owner); else duckOwners.delete(owner);
      chapterDucking = duckOwners.size > 0;
      if (!chapterDucking) pausedForChapter = false;
      applyPlaybackVolume();
      if (resume && !chapterDucking && intended) {
        if (document.hidden) pausedForVisibility = true;
        else void start();
      }
    },
  };
  playlistReady = loadPlaylist();
})();
