/* Ortak Türkçe cümle bölücü: Node build'i ve tarayıcı aynı kuralları kullanır. */
(function attachBol(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Bol = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const ABBREVIATIONS = new Set(['dr.', 'prof.', 'doç.', 'doç.dr.', 'sn.', 'vb.', 'vs.', 'bkz.', 'sf.', 'no.', 'hz.', 'mr.', 'mrs.', 'ms.', 'st.']);
  const trimEnd = (value) => String(value || '').replace(/\s+$/u, '');

  function splitDash(value) {
    const pieces = [];
    let cursor = 0;
    const dash = /(?:^|[\r\n]|\s)(—\s)/gu;
    let match;
    while ((match = dash.exec(value))) {
      const at = match.index + match[0].length - match[1].length;
      if (at > cursor) pieces.push(value.slice(cursor, at));
      cursor = at;
    }
    if (cursor < value.length || !pieces.length) pieces.push(value.slice(cursor));
    return pieces.filter(Boolean);
  }

  function splitLong(value, limit = 220) {
    if (value.length <= limit) return [value];
    const output = [];
    let rest = value;
    while (rest.length > limit) {
      const sample = rest.slice(0, limit + 1);
      let cut = Math.max(sample.lastIndexOf(','), sample.lastIndexOf(';'));
      if (cut < Math.floor(limit * 0.48)) cut = Math.max(sample.lastIndexOf(':'), sample.lastIndexOf(' '));
      if (cut < 1) cut = limit;
      else cut += 1;
      output.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest) output.push(rest);
    return output;
  }

  function fallbackSegments(text) {
    const output = [];
    let start = 0;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (!'.!?…'.includes(char)) continue;
      if (char === '.' && text.slice(index, index + 3) === '...') { index += 2; continue; }
      if (char === '.' && text[index + 1] === '.') continue;
      const previous = trimEnd(text.slice(start, index + 1)).toLocaleLowerCase('tr-TR');
      const lastWord = previous.match(/(?:[\p{L}]+\.)$/u)?.[0] || '';
      if (char === '.' && ABBREVIATIONS.has(lastWord)) continue;
      const next = text[index + 1] || '';
      if (next && !/[\s”"'»—]/u.test(next)) continue;
      let end = index + 1;
      while (end < text.length && /[”"'»\])]/u.test(text[end])) end += 1;
      while (end < text.length && /\s/u.test(text[end])) end += 1;
      output.push(text.slice(start, end));
      start = end;
      index = end - 1;
    }
    if (start < text.length) output.push(text.slice(start));
    return output.filter(Boolean);
  }

  function segment(text) {
    const source = String(text || '');
    if (!source) return [];
    let raw = [];
    try {
      if (typeof Intl?.Segmenter === 'function') {
        raw = [...new Intl.Segmenter('tr', { granularity: 'sentence' }).segment(source)].map((part) => part.segment);
        const merged = [];
        raw.forEach((part) => {
          const previous = trimEnd(merged.at(-1) || '').toLocaleLowerCase('tr-TR');
          const lastWord = previous.match(/(?:[\p{L}]+\.)$/u)?.[0] || '';
          if (merged.length && (ABBREVIATIONS.has(lastWord) || /^\s*[.…]/u.test(part))) merged[merged.length - 1] += part;
          else merged.push(part);
        });
        raw = merged;
      }
    } catch { raw = []; }
    if (!raw.length) raw = fallbackSegments(source);
    return raw.flatMap(splitDash).flatMap((part) => splitLong(part)).filter((part) => /\S/u.test(part));
  }

  function signature(items) {
    let hash = 0x811c9dc5;
    const source = Array.isArray(items) ? items : [items];
    source.forEach((item, index) => {
      const text = typeof item === 'string' ? item : String(item?.metin ?? item?.text ?? '');
      const value = `${index}\u0000${text}\u0001`;
      for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
    });
    return `bol1-${(hash >>> 0).toString(16).padStart(8, '0')}-${source.length}`;
  }

  return Object.freeze({ version: '1', abbreviations: ABBREVIATIONS, segment, signature, trimEnd });
}));
