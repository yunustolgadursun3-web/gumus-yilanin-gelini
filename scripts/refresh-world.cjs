'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const { collectSource } = require('../build.js');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const config = read('book.config.json');
const bible = read('book-world.json');
const { text, bytes } = collectSource(path.join(root, config.source));
const strict = process.argv.includes('--strict-assets');
if (bible.storyId !== config.storyId) throw Error('Story namespace mismatch.');

const headings = [...text.matchAll(/^(?:#{1,3}[ \t]+)?(?:\*\*)?((?:BÖLÜM\s+\d+|PROLOG|EPİLOG)\s+—[^\r\n]+)/gmu)]
  .map(match => ({ title: match[1].replace(/\*\*$/u, ''), offset: match.index }));
if (headings.length !== bible.chapters.length) throw Error('Chapter count differs from the edition input.');
const chapters = bible.chapters.map((chapter, index) => {
  const heading = headings[index];
  const number = heading.title.match(/^BÖLÜM\s+(\d+)/u)?.[1];
  if (number && Number(number) !== chapter.number) throw Error('Chapter order mismatch.');
  return { ...chapter, ...heading, sourceChapter: index, end: headings[index + 1]?.offset ?? text.length };
});
const sourceChapter = number => number === -2 ? chapters.find(c => c.id === 'epilogue') :
  chapters.find(c => c.id !== 'epilogue' && c.number === number);
function point(phrase, chapter) {
  const start = chapter?.offset ?? 0;
  const end = chapter?.end ?? headings[0].offset;
  const at = text.indexOf(phrase, start);
  if (at < 0 || at + phrase.length > end) throw Error('Source phrase not found in ' + chapter?.title + ': ' + phrase);
  const lineStart = Math.max(start, text.lastIndexOf('\n', at - 1) + 1);
  const next = text.indexOf('\n', at + phrase.length);
  const lineEnd = Math.min(end, next < 0 ? text.length : next);
  const quote = text.slice(lineStart, lineEnd).replace(/\r$/u, '');
  return { quote, sourceStart: lineStart, sourceEnd: lineStart + quote.length, unlock: lineStart + quote.length };
}
function imageSize(src) {
  const file = path.join(root, src);
  if (!fs.existsSync(file)) {
    if (strict) throw Error('Missing image: ' + src);
    return { width: 1200, height: 800 };
  }
  const b = fs.readFileSync(file);
  for (let p = 12; p + 8 <= b.length;) {
    const tag = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4), d = p + 8;
    if (tag === 'VP8X') return { width: 1 + b.readUIntLE(d + 4, 3), height: 1 + b.readUIntLE(d + 7, 3) };
    if (tag === 'VP8 ') return { width: b.readUInt16LE(d + 6) & 16383, height: b.readUInt16LE(d + 8) & 16383 };
    if (tag === 'VP8L') { const value = b.readUInt32LE(d + 1); return { width: (value & 16383) + 1, height: ((value >>> 14) & 16383) + 1 }; }
    p = d + size + (size & 1);
  }
  throw Error('Invalid WebP: ' + src);
}
const art = key => 'assets/images/' + key + '.webp';
const coverArt = bible.coverArt || 'cover';
const atlasArt = bible.atlasArt || 'atlas';
const facts = bible.facts.map(input => {
  const chapter = sourceChapter(input.chapter);
  if (!chapter) throw Error('Unknown source chapter for ' + input.id);
  return { ...input, ...point(input.phrase, chapter), sourceChapter: chapter.sourceChapter,
    chapter: chapter.title };
});
const fact = id => {
  const value = facts.find(item => item.id === id);
  if (!value) throw Error('Unknown fact: ' + id);
  return value;
};
for (const item of facts) {
  if (item.kind === 'connections') item.unlock = Math.max(item.unlock, fact(item.from).unlock, fact(item.to).unlock);
}
const companion = read('book-chronicle.json');
function chronicleEntry(input) {
  if (input.fact) {
    const { name, quote, sourceStart, sourceEnd, sourceChapter, chapter } = fact(input.fact);
    return { name, ...input, quote, sourceStart, sourceEnd, sourceChapter, chapter };
  }
  const chapter = sourceChapter(input.chapter);
  if (!chapter) throw Error('Unknown chronicle chapter for ' + (input.id || input.question));
  const { phrase, ...entry } = input;
  return { ...entry, ...point(phrase, chapter), sourceChapter: chapter.sourceChapter, chapter: chapter.title };
}
const chronicle = companion.storyId === bible.storyId ? {
  characters: companion.characters.map(chronicleEntry),
  relationships: [...facts.filter(item => item.kind === 'connections'), ...companion.relationships.map(chronicleEntry)],
  glossary: companion.glossary.map(chronicleEntry),
  pastEvents: companion.pastEvents.map(chronicleEntry),
  quiz: companion.quiz.map(chronicleEntry),
} : null;
const scenes = bible.scenes.map(input => {
  const chapter = sourceChapter(input.chapter);
  const anchor = point(input.phrase, chapter);
  const src = art(input.id);
  return { id: input.id, chapter: chapter.sourceChapter, anchor: anchor.quote, memoryQuote: anchor.quote,
    src, alt: input.alt, ...imageSize(src), places: [input.place], placement: input.placement,
    offset: anchor.sourceStart, memoryOffset: anchor.sourceStart, memoryUnlock: anchor.unlock };
});
const plan = {
  title: bible.title, subtitle: bible.subtitle, storageId: bible.storyId, author: bible.author,
  genre: bible.genre,
  kicker: bible.kicker, coverBrand: bible.coverBrand, edition: 'TAM ROMAN',
  coverLocation: bible.coverLocation, coverMark: '✦',
  cover: { src: art(coverArt), alt: bible.art[coverArt].alt, ...imageSize(art(coverArt)) },
  reader: { appendEndPage: true, appendLetter: false, frontmatter: false, chapterEndings: true },
  end: { title: bible.title, mood: 'umut' },
  sceneSounds: false,
  keywords: bible.keywords,
  chapters: chapters.map((chapter, index) => {
    const chapterScenes = scenes.filter(scene => scene.chapter === index);
    const images = chapterScenes.map((scene, sceneIndex) => ({
      id: scene.id, src: scene.src, alt: scene.alt, width: scene.width, height: scene.height,
      anchor: scene.anchor, artAfter: true,
      placement: scene.placement || (sceneIndex > 0 || index % 3 === 0 ? 'full' : 'inline'),
      unlock: scene.memoryUnlock,
    }));
    const first = chapterScenes[0];
    const preview = first ? { quote: first.anchor, unlock: first.memoryUnlock }
      : chapter.preview ? point(chapter.preview, chapter) : null;
    return { id: chapter.id, number: chapter.number, sourceChapter: index, title: chapter.title,
      volume: chapter.volume, offset: chapter.offset, mood: chapter.mood, effect: 'cizgi', seal: 'oath',
      vignettes: ['moon', 'rings'], place: chapter.place, anchor: first?.anchor, artAfter: true,
      previewQuote: preview?.quote, previewUnlock: preview?.unlock, images, galleryImage: images[0] };
  }),
};
const hierarchy = {};
const locations = {};
const visuals = {};
for (const place of facts.filter(item => item.kind === 'places')) {
  const scene = scenes.find(s => s.src === art(place.art)) || scenes.find(s => s.places.includes(place.id));
  if (!scene) throw Error('Place has no artwork: ' + place.id);
  const unlock = place.unlock;
  hierarchy[place.id] = { fact: place.id, kind: place.mapKind, title: place.name, src: scene.src,
    quote: place.quote, sourceStart: place.sourceStart, sourceEnd: place.sourceEnd,
    sourceChapter: place.sourceChapter, unlock, children: [] };
  visuals[place.id] = { src: scene.src, type: 'illustration', scene: scene.id,
    unlock: Math.max(unlock, scene.memoryUnlock) };
  const memories = scenes.filter(s => s.places.includes(place.id));
  const columns = memories.length > 9 ? 5 : 3;
  const rows = Math.max(1, Math.ceil(memories.length / columns));
  locations[place.id] = { name: place.name, src: scene.src, areas: memories.map((memory, i) => ({
    id: memory.id, name: chapters[memory.chapter].title, label: chapters[memory.chapter].title.replace(/^BÖLÜM \d+ — /u, ''),
    quote: memory.anchor, sourceChapter: memory.chapter, src: memory.src, memorySrc: memory.src,
    x: columns === 3 ? 28 + (i % columns) * 22 : 14 + (i % columns) * 18,
    y: rows < 4 ? 37 + Math.floor(i / columns) * 14 : 23 + Math.floor(i / columns) * 54 / (rows - 1),
    sourceStart: memory.offset, sourceEnd: memory.memoryUnlock, unlock: Math.max(memory.memoryUnlock, place.unlock),
    chapter: { id: chapters[memory.chapter].id, number: chapters[memory.chapter].number,
      sourceChapter: memory.chapter, title: chapters[memory.chapter].title, offset: chapters[memory.chapter].offset },
    characters: [], discoveries: []
  })) };
}
for (const person of facts.filter(item => item.kind === 'characters' && item.art)) {
  const scene = scenes.find(item => item.src === art(person.art));
  visuals[person.id] = {
    src: art(person.art), type: 'illustration',
    unlock: Math.max(person.unlock, scene?.memoryUnlock || person.unlock),
  };
}
for (const [parent, child] of bible.atlasHierarchy || []) {
  hierarchy[child].parent = parent;
  hierarchy[child].unlock = Math.max(hierarchy[child].unlock, hierarchy[parent].unlock);
  const childIndex = hierarchy[parent].children.length;
  const x = 32 + (childIndex % 3) * 19, y = 54 + Math.floor(childIndex / 3) * 15;
  hierarchy[parent].children.push({ node: child, x, y, quote: fact(child).quote,
    sourceChapter: fact(child).sourceChapter, sourceStart: fact(child).sourceStart, sourceEnd: fact(child).sourceEnd,
    unlock: hierarchy[child].unlock });
  locations[parent].areas.push({ id: 'navigate-' + child, node: child, kind: 'city', name: fact(child).name,
    label: fact(child).name, x, y, src: hierarchy[child].src, memorySrc: hierarchy[child].src,
    quote: fact(child).quote, sourceStart: fact(child).sourceStart, sourceEnd: fact(child).sourceEnd,
    unlock: hierarchy[child].unlock, characters: [] });
}
const routes = (bible.routes || []).map(([from, to, number, phrase]) => {
  const chapter = sourceChapter(number);
  const anchor = point(phrase, chapter);
  return { id: from + '-to-' + to, from, to, label: fact(from).name + ' · ' + fact(to).name,
    ...anchor, sourceChapter: chapter.sourceChapter,
    unlock: Math.max(anchor.unlock, fact(from).unlock, fact(to).unlock) };
});
const atlas = { src: art(atlasArt), ...imageSize(art(atlasArt)), schematic: true,
  note: 'Anlatıdan doğrulanan mekânlar. İşaretlerin konumu temsili bir keşif düzenidir.',
  hierarchy, routes, temporal: {}, riders: [],
  regions: facts.filter(f => f.kind === 'places' && f.mapKind === 'region').map(f => ({
    id: f.id, name: f.name, motif: f.name, quote: f.quote, sourceStart: f.sourceStart,
    sourceEnd: f.sourceEnd, sourceChapter: f.sourceChapter, unlock: f.unlock
  }))
};
const theme = { title: bible.title, style: 'Buz mavisi, çam yeşili ve sıcak altın.',
  colors: { ink: '#122130', gold: '#be9560', copper: '#a66c49', paper: '#f2e9d8' },
  chapters: chapters.map(({ number, title, offset, id, volume, sourceChapter }) =>
    ({ number, title, offset, id, volume, sourceChapter })),
  scenes, facts, atlas, visuals };
const imageDetails = Object.fromEntries(read('art-manifest.json').map(image => {
  const src = image.src.replace('assets/images/', 'assets/images/detail/');
  return [image.src, { src, ...imageSize(src) }];
}));
theme.imageDetails = imageDetails;
write('plan.json', plan);
write('story-theme.json', theme);
write('locations.json', locations);
fs.writeFileSync(path.join(root, 'world-data.js'), 'window.STORY_WORLD=' + JSON.stringify({
  storyId: bible.storyId, chapters: theme.chapters, facts, scenes, atlas, visuals, imageDetails, locations, videos: [], chronicle
}) + ';\n');
const assets = [];
function scan(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const src = directory + '/' + entry.name;
    if (entry.isDirectory()) scan(src);
    else if (!src.endsWith('.json')) assets.push({ id: entry.name, src, storyId: bible.storyId,
      type: /\.(woff2)$/u.test(src) ? 'font' : /\.(webp|png|svg)$/u.test(src) ? 'image' : 'audio',
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, src))).digest('hex') });
  }
}
scan('assets');
write('media-manifest.json', { storyId: bible.storyId, assets, chapters: plan.chapters.map(chapter => ({
  id: chapter.id, number: chapter.number, title: chapter.title, gallery: chapter.galleryImage?.src || null,
  opening: null, inserts: chapter.images.map(image => image.src), discoveries: facts.filter(f => f.sourceChapter === chapter.sourceChapter).map(f => f.id)
})), music: read('assets/music/muzik.json').tracks, sounds: assets.filter(a => a.src.startsWith('assets/sounds/')), atlas, visuals, locations });
for (const key of Object.keys(bible.art)) if (strict) imageSize(art(key).replace('.webp', '-480.webp'));
console.log(JSON.stringify({ storyId: bible.storyId, chapters: chapters.length, facts: facts.length, illustrations: Object.keys(bible.art).length,
  sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex') }));
