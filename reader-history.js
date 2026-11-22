(() => {
  'use strict';
  const reader = window.BookReader;
  const plan = window.BOOK_PLAN;
  if (!reader || !plan) return;
  const bookId = String(plan.storageId || plan.title).toLocaleLowerCase('tr-TR').replace(/[^\p{L}\d]+/gu, '-');
  const searchKey = 'book:' + bookId + ':search-ranges:v1';

  function readingRanges(hash, length) {
    let stored;
    try { stored = JSON.parse(localStorage.getItem(searchKey) || 'null'); } catch { return []; }
    if (stored?.hash !== hash || !Array.isArray(stored.ranges)) return [];
    return stored.ranges.filter(range => Array.isArray(range) && range.length === 2 &&
      range.every(Number.isInteger) && range[0] >= 0 && range[1] <= length && range[0] < range[1]);
  }

  function flowRanges(page, viewport) {
    const ranges = [];
    const measure = document.createRange();
    for (const span of page.querySelectorAll('[data-book-source-start]')) {
      const box = span.getBoundingClientRect();
      if (!box.height || box.bottom <= viewport.top || box.top >= viewport.bottom) continue;
      let start = Number(span.dataset.bookSourceStart);
      if (box.top >= viewport.top && box.bottom <= viewport.bottom) {
        ranges.push([start, start + span.textContent.length]);
        continue;
      }

      // Source spans can cover a whole chapter in scrolling mode. Measure only
      // the visible lines without treating an offscreen part as already opened.
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        measure.selectNodeContents(node);
        const bounds = measure.getBoundingClientRect();
        if (bounds.height && bounds.top < viewport.bottom && bounds.bottom > viewport.top) {
          const boundary = (beforeViewportEdge) => {
            let low = 0;
            let high = node.length;
            while (low < high) {
              const mid = (low + high) >>> 1;
              measure.setStart(node, mid);
              measure.setEnd(node, mid + 1);
              if (beforeViewportEdge(measure.getBoundingClientRect())) low = mid + 1;
              else high = mid;
            }
            return low;
          };
          const first = bounds.top < viewport.top ? boundary(rect => rect.top < viewport.top) : 0;
          const last = bounds.bottom > viewport.bottom ? boundary(rect => rect.bottom <= viewport.bottom) : node.length;
          if (first < last) ranges.push([start + first, start + last]);
        }
        start += node.length;
      }
    }
    return ranges;
  }

  let reachedHash;
  let reachedSource = '';
  let reached = [];
  let cancelWrite;

  function mergeRanges(incoming) {
    const ordered = [...reached, ...incoming].sort(([a], [b]) => a - b);
    const merged = [];
    for (const [start, end] of ordered) {
      const previous = merged.at(-1);
      if (previous && (start <= previous[1] || /^[\s*#]*$/u.test(reachedSource.slice(previous[1], start)))) {
        previous[1] = Math.max(previous[1], end);
      } else {
        merged.push([start, end]);
      }
    }
    reached = merged;
  }

  function persistReached() {
    if (!cancelWrite) return;
    cancelWrite();
    cancelWrite = null;
    mergeRanges(readingRanges(reachedHash, reachedSource.length));
    try { localStorage.setItem(searchKey, JSON.stringify({ hash: reachedHash, ranges: reached })); } catch {}
  }

  function queueWrite() {
    if (cancelWrite) return;
    if (typeof requestIdleCallback === 'function') {
      const job = requestIdleCallback(persistReached, { timeout: 700 });
      cancelWrite = () => cancelIdleCallback(job);
    } else {
      const job = setTimeout(persistReached, 300);
      cancelWrite = () => clearTimeout(job);
    }
  }

  function rememberVisibleText(location) {
    const { open, length, mode, anchor } = location;
    if (!length || !anchor.sourceHash) return;
    if (reachedHash !== anchor.sourceHash) {
      persistReached();
      reachedHash = anchor.sourceHash;
      reachedSource = reader.source();
      reached = readingRanges(reachedHash, length);
    }
    if (!open) return;
    const pages = reader.visiblePages().filter(page => page.dataset.pageType === 'text');
    const viewport = mode === 'scroll' ? document.getElementById('book-spread').getBoundingClientRect() : null;
    const ranges = pages.flatMap(page => viewport ? flowRanges(page, viewport) :
      [[Number(page.dataset.sourceStart), Number(page.dataset.sourceEnd)]]);
    if (ranges.every(([start, end]) => reached.some(([a, b]) => a <= start && end <= b))) return;

    mergeRanges(ranges);
    queueWrite();
  }
  document.addEventListener('book:location', event => rememberVisibleText(event.detail));
  window.addEventListener('storage', event => {
    if (!reachedHash || (event.key !== searchKey && event.key !== null)) return;
    const stored = readingRanges(reachedHash, reachedSource.length);
    if (cancelWrite) mergeRanges(stored);
    else reached = stored;
  });
  window.addEventListener('pagehide', persistReached);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistReached();
  });

  window.BookReadingHistory = Object.freeze({
    ranges() {
      rememberVisibleText(reader.location());
      return reached.map(range => [...range]);
    },
  });
})();
