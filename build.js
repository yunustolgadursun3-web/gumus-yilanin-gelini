#!/usr/bin/env node
'use strict';

/*
 * Hikâye kaynağını değiştirmeden story.js içine UTF-8 byte'ları olarak gömer.
 * Varsayılan kaynak: kitap/metin/ (dosya adına göre birleştirilir).
 * Örnek: node build.js --source "hikaye.md"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const Bol = require('./bol.js');

const BOOK_DIR = __dirname;
const BOOK_CONFIG_PATH = path.join(BOOK_DIR, 'book.config.json');

function readBookConfig() {
  if (!fs.existsSync(BOOK_CONFIG_PATH)) return {};
  const config = JSON.parse(fs.readFileSync(BOOK_CONFIG_PATH, 'utf8'));
  return config && typeof config === 'object' && !Array.isArray(config) ? config : {};
}

const BOOK_CONFIG = readBookConfig();
const DEFAULT_SOURCE_DIR = path.resolve(BOOK_DIR, BOOK_CONFIG.source || 'metin');
const DEFAULT_SOURCE = fs.existsSync(DEFAULT_SOURCE_DIR)
  ? DEFAULT_SOURCE_DIR
  : path.join(BOOK_DIR, 'new-hikaye.md');
const OUTPUT = path.join(BOOK_DIR, 'story.js');
const PLAN = path.resolve(BOOK_DIR, BOOK_CONFIG.plan || 'plan.json');
const VOICE_INPUT_ROOT = path.join(BOOK_DIR, 'ses-girdi');
const VOICE_SETTINGS_ROOT = path.join(BOOK_DIR, 'sesler');
const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.docx']);
const fileCollator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function decodeUtf8(bytes, label) {
  try {
    // ignoreBOM:true lets byte-for-byte validation retain a possible BOM as U+FEFF.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} geçerli UTF-8 değil: ${error.message}`);
  }
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readZipEntry(zipBytes, wantedName) {
  // Minimal ZIP reader for ordinary .docx files. It intentionally needs no npm package.
  const eocd = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  let eocdOffset = -1;
  for (let i = zipBytes.length - 22; i >= Math.max(0, zipBytes.length - 65557); i -= 1) {
    if (zipBytes.subarray(i, i + 4).equals(eocd)) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('DOCX ZIP son dizini bulunamadı.');

  const centralDirectoryOffset = zipBytes.readUInt32LE(eocdOffset + 16);
  const centralDirectorySize = zipBytes.readUInt32LE(eocdOffset + 12);
  let cursor = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (cursor < end) {
    if (zipBytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('DOCX ZIP dizini okunamadı.');
    const compression = zipBytes.readUInt16LE(cursor + 10);
    const compressedSize = zipBytes.readUInt32LE(cursor + 20);
    const nameLength = zipBytes.readUInt16LE(cursor + 28);
    const extraLength = zipBytes.readUInt16LE(cursor + 30);
    const commentLength = zipBytes.readUInt16LE(cursor + 32);
    const localOffset = zipBytes.readUInt32LE(cursor + 42);
    const fileName = zipBytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');

    if (fileName === wantedName) {
      if (zipBytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('DOCX yerel dosya başlığı okunamadı.');
      const localNameLength = zipBytes.readUInt16LE(localOffset + 26);
      const localExtraLength = zipBytes.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = zipBytes.subarray(dataStart, dataStart + compressedSize);
      if (compression === 0) return compressed;
      if (compression === 8) return zlib.inflateRawSync(compressed);
      throw new Error(`DOCX için desteklenmeyen ZIP sıkıştırması: ${compression}`);
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`DOCX içinde ${wantedName} bulunamadı.`);
}

function readDocx(filePath) {
  const xml = readZipEntry(fs.readFileSync(filePath), 'word/document.xml').toString('utf8');
  const paragraphs = [];
  const paragraphPattern = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let paragraph;
  while ((paragraph = paragraphPattern.exec(xml))) {
    // Read the relevant inline nodes in document order. Replacing <w:br/> first
    // and then collecting only <w:t> used to silently discard manual line breaks
    // and tabs from DOCX sources.
    const tokens = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(br|cr|tab)(?:\s[^>]*)?\s*\/>/g;
    let text = '';
    let token;
    while ((token = tokens.exec(paragraph[1]))) {
      if (token[1] !== undefined) text += decodeXml(token[1]);
      else text += token[2] === 'tab' ? '\t' : '\n';
    }
    paragraphs.push(text);
  }
  return Buffer.from(paragraphs.join('\r\n\r\n'), 'utf8');
}

function listSourceFiles(sourcePath) {
  const stat = fs.statSync(sourcePath);
  if (stat.isFile()) {
    const ext = path.extname(sourcePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) throw new Error(`Desteklenmeyen kaynak türü: ${ext}`);
    return [sourcePath];
  }
  if (!stat.isDirectory()) throw new Error(`Kaynak dosya veya klasör değil: ${sourcePath}`);

  const files = [];
  for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) files.push(path.join(sourcePath, entry.name));
  }
  files.sort((a, b) => fileCollator.compare(path.basename(a), path.basename(b)));
  if (!files.length) throw new Error(`Kaynak klasöründe .txt, .md veya .docx dosyası yok: ${sourcePath}`);
  return files;
}

function lineEndingInfo(text) {
  return {
    crlf: (text.match(/\r\n/g) || []).length,
    lf: (text.match(/(?<!\r)\n/g) || []).length,
    cr: (text.match(/\r(?!\n)/g) || []).length,
  };
}

function chapterHints(text) {
  const hints = [];
  const pattern = /^(#{1,6})\s+(.+?)(?:\r?\n|$)/gm;
  let match;
  while ((match = pattern.exec(text))) {
    const isChapter = /^(?:Bölüm\s+\d+|PROLOG|EPİLOG)\s+—/iu.test(match[2]);
    hints.push({ level: isChapter ? 2 : match[1].length, label: match[2], offset: match.index });
  }
  const partPattern = /^((?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SON)\s+KISIM\s+—\s+.+?)(?:\r?\n|$)/gmu;
  while ((match = partPattern.exec(text))) hints.push({ level: 1, label: match[1], offset: match.index });
  const chapterPattern = /^((?:Bölüm\s+\d+|PROLOG|EPİLOG)\s+—\s+.+?)(?:\r?\n|$)/gimu;
  while ((match = chapterPattern.exec(text))) hints.push({ level: 2, label: match[1], offset: match.index });
  return hints.sort((a, b) => a.offset - b.offset || a.level - b.level);
}

function titleFrom(text, fallback) {
  const heading = text.match(/^#\s+(.+?)(?:\r?\n|$)/m);
  if (heading) return heading[1];
  const firstLine = text.replace(/^\uFEFF/u, '').split(/\r?\n|\r/u).find((line) => line.trim());
  return firstLine ? firstLine.trim() : fallback;
}

function collectSource(sourcePath) {
  const files = listSourceFiles(sourcePath);
  let byteOffset = 0;
  let charOffset = 0;
  const parts = files.map((filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    const input = fs.readFileSync(filePath);
    const storyBytes = extension === '.docx' ? readDocx(filePath) : input;
    const text = decodeUtf8(storyBytes, path.basename(filePath));
    const part = {
      name: path.basename(filePath),
      type: extension.slice(1),
      sourceByteLength: input.length,
      sourceSha256: sha256(input),
      byteStart: byteOffset,
      byteEnd: byteOffset + storyBytes.length,
      charStart: charOffset,
      charEnd: charOffset + text.length,
      storyByteLength: storyBytes.length,
      storySha256: sha256(storyBytes),
      storyBytes,
    };
    byteOffset = part.byteEnd;
    charOffset = part.charEnd;
    return part;
  });

  // No separator is injected: every source file remains an exact byte segment.
  // The reader uses source boundaries as non-text chapter/page boundaries instead.
  const bytes = Buffer.concat(parts.map((part) => part.storyBytes));
  const text = decodeUtf8(bytes, 'Birleştirilmiş hikâye');
  const fallbackTitle = path.basename(sourcePath, path.extname(sourcePath));
  const title = titleFrom(decodeUtf8(parts[0].storyBytes, parts[0].name), fallbackTitle);

  return {
    bytes,
    text,
    manifest: {
      version: 1,
      title,
      textBase64: bytes.toString('base64'),
      encoding: 'utf-8',
      byteLength: bytes.length,
      sha256: sha256(bytes),
      charLength: text.length,
      wordCount: (text.match(/\S+/gu) || []).length,
      lineEndings: lineEndingInfo(text),
      firstNonEmptyLine: (text.match(/^.+$/m) || [''])[0],
      lastNonEmptyLine: ((text.match(/^.+$/gm) || []).at(-1) || ''),
      chapters: parts.flatMap(part => chapterHints(decodeUtf8(part.storyBytes, part.name))
        .map(chapter => ({ ...chapter, offset: part.charStart + chapter.offset }))),
      sourceChapters: parts.map((part) => ({
        label: path.basename(part.name, path.extname(part.name)),
        offset: part.charStart,
      })),
      sources: parts.map(({ storyBytes, ...part }) => part),
    },
  };
}

function getRequestedSource(argv) {
  const sourceIndex = argv.indexOf('--source');
  if (sourceIndex >= 0) {
    const source = argv[sourceIndex + 1];
    if (!source) throw new Error('--source sonrasında bir dosya veya klasör yolu gerekli.');
    return path.resolve(source);
  }
  return DEFAULT_SOURCE;
}

function getRequestedPlan(argv) {
  const planIndex = argv.indexOf('--plan');
  if (planIndex >= 0) {
    const plan = argv[planIndex + 1];
    if (!plan) throw new Error('--plan sonrasında bir JSON dosyası yolu gerekli.');
    return path.resolve(plan);
  }
  return PLAN;
}

function readPlan(planPath = PLAN) {
  if (!fs.existsSync(planPath)) return Object.freeze({ chapters: [] });
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

function readJson(filePath, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function frontMatter(text) {
  const match = String(text || '').match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) return {};
  return match[1].split(/\r?\n/u).reduce((result, line) => {
    const item = line.match(/^\s*([\p{L}_][\p{L}\d_-]*)\s*:\s*(.*?)\s*$/u);
    if (!item) return result;
    const raw = item[2].replace(/^['"]|['"]$/gu, '').trim();
    result[item[1].toLocaleLowerCase('tr-TR')] = /^(true|evet)$/iu.test(raw) ? true : /^(false|hayır|hayir)$/iu.test(raw) ? false : raw;
    return result;
  }, {});
}

function voiceSettings(slug) {
  const defaults = readJson(path.join(VOICE_SETTINGS_ROOT, 'sesler.json'), {});
  const book = readJson(path.join(VOICE_SETTINGS_ROOT, `${slug}.json`), {});
  return {
    ...defaults,
    ...book,
    roller: { ...(defaults.roller || {}), ...(book.roller || {}) },
  };
}

function outputScript(manifest, plan) {
  const serialized = JSON.stringify(manifest)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const serializedPlan = JSON.stringify(plan)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `/* build.js tarafından üretildi; hikâye metni Base64 UTF-8 olarak korunur. */\nwindow.BOOK_STORY = Object.freeze(${serialized});\nwindow.BOOK_PLAN = Object.freeze(${serializedPlan});\n`;
}

function slugify(value, fallback = 'kitap') {
  const slug = String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/gu, '')
    .replace(/ı/gu, 'i').replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return slug || fallback;
}

function headingRecords(text) {
  const records = [];
  const pattern = /^(#{1,6})[ \t]+(.+?)(?:\r?\n|$)/gmu;
  let match;
  while ((match = pattern.exec(text))) {
    const titleStart = match.index + match[0].indexOf(match[2]);
    records.push({ level: match[1].length, title: match[2], start: match.index, end: pattern.lastIndex, titleStart, titleEnd: titleStart + match[2].length });
  }
  const partPattern = /^((?:BİRİNCİ|İKİNCİ|ÜÇÜNCÜ|DÖRDÜNCÜ|BEŞİNCİ|ALTINCI|YEDİNCİ|SON)\s+KISIM\s+—\s+.+?)(?:\r?\n|$)/gmu;
  while ((match = partPattern.exec(text))) {
    records.push({ level: 1, title: match[1], start: match.index, end: partPattern.lastIndex, titleStart: match.index, titleEnd: match.index + match[1].length });
  }
  const chapterPattern = /^((?:Bölüm\s+\d+|EPİLOG)\s+—\s+.+?)(?:\r?\n|$)/gimu;
  while ((match = chapterPattern.exec(text))) {
    records.push({ level: 2, title: match[1], start: match.index, end: chapterPattern.lastIndex, titleStart: match.index, titleEnd: match.index + match[1].length });
  }
  return records.sort((a, b) => a.start - b.start || a.level - b.level);
}

function selectVoiceChapters(text, manifest) {
  const headings = headingRecords(text);
  const explicitChapters = headings.filter((heading) => /^(?:Bölüm\s+\d+|EPİLOG)\s+—/iu.test(heading.title));
  if (explicitChapters.length) {
    const sourceEndFor = (offset) => (manifest.sources || []).find((source) => offset >= source.charStart && offset < source.charEnd)?.charEnd ?? text.length;
    const titleLine = text.match(/^\uFEFF?[^\r\n]*(?:\r?\n|$)/u)?.[0] || '';
    const openingBody = text.slice(titleLine.length, explicitChapters[0].start);
    const output = [];
    if (/\S/u.test(openingBody)) {
      output.push({ title: manifest.title, body: openingBody, bodyStart: titleLine.length, titleStart: 0, titleEnd: manifest.title.length });
    }
    explicitChapters.forEach((heading, index) => {
      const nextHeading = explicitChapters[index + 1]?.start ?? text.length;
      const bodyEnd = Math.min(nextHeading, sourceEndFor(heading.start));
      output.push({
        title: heading.title,
        body: text.slice(heading.end, bodyEnd),
        bodyStart: heading.end,
        titleStart: heading.titleStart,
        titleEnd: heading.titleEnd,
      });
    });
    return output;
  }
  if (!headings.length) return [{ title: manifest.title, body: text, bodyStart: 0, titleStart: 0, titleEnd: 0 }];
  const titleHeading = headings[0];
  const later = headings.slice(1);
  if (!later.length) return [{ title: titleHeading.title || manifest.title, body: text.slice(titleHeading.end), bodyStart: titleHeading.end, titleStart: titleHeading.titleStart, titleEnd: titleHeading.titleEnd }];
  const level = Math.min(...later.map((heading) => heading.level));
  const chapters = later.filter((heading) => heading.level === level);
  const output = chapters.map((heading, index) => ({
    title: heading.title,
    body: text.slice(heading.end, chapters[index + 1]?.start ?? text.length),
    bodyStart: heading.end,
    titleStart: heading.titleStart,
    titleEnd: heading.titleEnd,
  }));
  const introduction = text.slice(titleHeading.end, chapters[0].start);
  if (/\S/u.test(introduction)) output.unshift({ title: titleHeading.title || manifest.title, body: introduction, bodyStart: titleHeading.end, titleStart: titleHeading.titleStart, titleEnd: titleHeading.titleEnd });
  return output;
}

function chapterParts(chapter) {
  const parts = [];
  const push = (metin, tur, son = 'cumle', sourceStart = 0, sourceEnd = sourceStart + String(metin || '').length) => {
    if (!/\S/u.test(metin || '')) return;
    parts.push({ i: parts.length, metin, tur, son, sourceStart, sourceEnd });
  };
  push(chapter.title, 'baslik', 'cumle', chapter.titleStart, chapter.titleEnd);
  const blocks = String(chapter.body || '').split(/(\r?\n[ \t]*\r?\n(?:[ \t]*\r?\n)*)/gu);
  let blockOffset = 0;
  for (let index = 0; index < blocks.length; index += 2) {
    const paragraph = blocks[index] || '';
    const gap = blocks[index + 1] || '';
    const pieces = Bol.segment(paragraph);
    let paragraphOffset = 0;
    pieces.forEach((metin, pieceIndex) => {
      const final = pieceIndex === pieces.length - 1;
      const son = final ? ((gap.match(/\r?\n/gu) || []).length > 2 ? 'sahne' : 'paragraf') : 'cumle';
      const found = paragraph.indexOf(metin, paragraphOffset);
      const localStart = found >= 0 ? found : paragraphOffset;
      const spoken = final ? `${metin}${gap}` : metin;
      const sourceStart = chapter.bodyStart + blockOffset + localStart;
      push(spoken, 'cumle', son, sourceStart, sourceStart + spoken.length);
      paragraphOffset = localStart + String(metin).length;
    });
    blockOffset += paragraph.length + gap.length;
  }
  return parts;
}

function writeJsonAtomically(filePath, value) {
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filePath);
}

function buildVoiceInputs(text, manifest, plan = {}) {
  const slug = slugify(manifest.title);
  fs.mkdirSync(VOICE_INPUT_ROOT, { recursive: true });
  const matter = frontMatter(text);
  const settings = voiceSettings(slug);
  // Front matter is the normal contract.  The sidecar switch preserves already
  // published legacy books without modifying their source text.
  const ownVoice = String(matter.sesli || settings.sesli || '').toLocaleLowerCase('tr-TR') === 'kendi';
  const enabled = matter.sesli === true || settings.sesli === true || ownVoice;
  if (!enabled) {
    const registryPath = path.join(VOICE_INPUT_ROOT, 'kitaplar.json');
    const registry = readJson(registryPath, { version: 1, kitaplar: [] });
    const books = Array.isArray(registry.kitaplar) ? registry.kitaplar.filter((book) => book.slug !== slug) : [];
    writeJsonAtomically(registryPath, { version: 1, kitaplar: books });
    return { enabled: false, slug, bolumler: [], narration: { version: 1, slug, chapters: [] } };
  }
  const chapterDir = path.join(VOICE_INPUT_ROOT, slug);
  fs.mkdirSync(chapterDir, { recursive: true });
  const chapters = selectVoiceChapters(text, manifest);
  const index = {
    version: 1,
    enabled: true,
    kitap: { baslik: manifest.title, sha256: manifest.sha256, sesli: true },
    slug,
    ayarlar: { saglayici: ownVoice ? 'kendi' : (settings.saglayici || 'edge'), mood_ayari: settings.mood_ayari !== false, okuyucu_adi: matter.okuyucu_adi || settings.okuyucu_adi || '' },
    bolucu: { surum: Bol.version },
    bolumler: [],
    narration: { version: 1, slug, chapters: [] },
  };
  let globalPartIndex = 0;
  chapters.forEach((chapter, chapterIndex) => {
    const n = chapterIndex + 1;
    const planned = (plan.chapters || []).find((item) => item.title === chapter.title) || {};
    const parcalar = chapterParts(chapter);
    parcalar.forEach((part) => { part.g = globalPartIndex; globalPartIndex += 1; });
    const signature = Bol.signature(parcalar);
    const file = path.join(chapterDir, `${n}.json`);
    const input = {
      version: 1,
      kitap: { baslik: manifest.title, sha256: manifest.sha256, slug, sesli: true },
      bolum: n,
      baslik: chapter.title,
      mood: planned.mood || '',
      signature,
      count: parcalar.length,
      parcalar,
    };
    writeJsonAtomically(file, input);
    const narrationChapter = { id: `${slug}-${n}`, slug, n, baslik: chapter.title, mood: planned.mood || '', signature, count: parcalar.length, parts: parcalar };
    index.narration.chapters.push(narrationChapter);
    index.bolumler.push({ id: `${slug}-${n}`, slug, n, baslik: chapter.title, signature, count: parcalar.length, kaynak: `${slug}/${n}.json` });
  });
  writeJsonAtomically(path.join(VOICE_INPUT_ROOT, 'index.json'), index);
  const localIndex = { ...index, bolumler: index.bolumler.map((item) => ({ ...item, kaynak: path.basename(item.kaynak) })) };
  writeJsonAtomically(path.join(chapterDir, 'index.json'), localIndex);
  const registryPath = path.join(VOICE_INPUT_ROOT, 'kitaplar.json');
  const registry = readJson(registryPath, { version: 1, kitaplar: [] });
  const books = Array.isArray(registry.kitaplar) ? registry.kitaplar.filter((book) => book.slug !== slug) : [];
  books.push({ slug, baslik: manifest.title, sesli: true, index: `${slug}/index.json`, sha256: manifest.sha256 });
  writeJsonAtomically(registryPath, { version: 1, kitaplar: books });
  return index;
}

function main() {
  const argv = process.argv.slice(2);
  const sourcePath = getRequestedSource(argv);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Kaynak bulunamadı: ${sourcePath}\nVarsayılan için proje kökünde metin/ oluşturun veya --source kullanın.`);
  }
  const { bytes, text, manifest } = collectSource(sourcePath);
  const roundTrip = Buffer.from(manifest.textBase64, 'base64');
  if (!roundTrip.equals(bytes) || sha256(roundTrip) !== manifest.sha256) {
    throw new Error('Base64 gömme doğrulaması başarısız oldu; story.js yazılmadı.');
  }
  const syncPath = path.join(BOOK_DIR, 'scripts', 'sync-videos.js');
  if (fs.existsSync(syncPath)) require(syncPath).syncVideoAssets({ bookDir: BOOK_DIR, config: BOOK_CONFIG });
  const plan = readPlan(getRequestedPlan(argv));
  const voiceIndex = buildVoiceInputs(text, manifest, plan);
  manifest.voiceEnabled = Boolean(voiceIndex.enabled);
  manifest.narration = voiceIndex.enabled ? voiceIndex.narration : null;
  fs.writeFileSync(OUTPUT, outputScript(manifest, plan), 'utf8');
  console.log(`story.js üretildi: ${manifest.byteLength} byte, ${manifest.charLength} karakter, ${manifest.wordCount} token`);
  console.log(`SHA-256: ${manifest.sha256}`);
  console.log(`Ses girdisi: ${voiceIndex.enabled ? voiceIndex.bolumler.length : 0} bölüm`);
  console.log(`Kaynak: ${sourcePath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Hata: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { collectSource, getRequestedSource, getRequestedPlan, sha256, buildVoiceInputs, slugify, readBookConfig };
