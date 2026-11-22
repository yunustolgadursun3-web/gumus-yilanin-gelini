(() => {
  'use strict';

  const reader = window.BookReader;
  const history = window.BookReadingHistory;
  const world = window.STORY_WORLD;
  const chronicle = world?.chronicle;
  const app = document.getElementById('app');
  const spread = document.getElementById('book-spread');
  if (!reader || !history || !chronicle || !app || !spread) return;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, className, action) {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  const chapterLabel = index => 'Bölüm ' + world.chapters[index].number;
  const fold = value => value.toLocaleLowerCase('tr-TR');
  const viewed = ranges => ({ sourceStart, sourceEnd }) => ranges.some(([start, end]) => start <= sourceStart && sourceEnd <= end);
  const byOffset = (a, b) => a.sourceStart - b.sourceStart;
  const people = new Map(chronicle.characters.map(person => [person.id, person]));
  const aliases = new Map(chronicle.characters.flatMap(person => person.aliases.map(name => [fold(name), person.id])));
  const names = [...aliases.keys()].sort((a, b) => b.length - a.length)
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const namePattern = new RegExp('(?<![\\p{L}\\p{M}\\p{N}])(?:' + names + ')(?![\\p{L}\\p{M}\\p{N}])', 'giu');
  let indexedSource = '';
  let mentions = [];
  let mentionsByPerson = new Map();

  function indexMentions() {
    const source = reader.source();
    if (source === indexedSource) return;
    indexedSource = source;
    mentions = [];
    mentionsByPerson = new Map();
    for (const match of source.matchAll(namePattern)) {
      const person = aliases.get(fold(match[0]));
      if (!person) continue;
      const mention = { person, sourceStart: match.index, sourceEnd: match.index + match[0].length };
      mentions.push(mention);
      if (!mentionsByPerson.has(person)) mentionsByPerson.set(person, []);
      mentionsByPerson.get(person).push(mention);
    }
  }

  function firstMentionAt(offset) {
    let low = 0;
    let high = mentions.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (mentions[middle].sourceStart < offset) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  const linkedPages = new WeakSet();
  function linkNames(page) {
    if (linkedPages.has(page) || page.dataset.pageType !== 'text') return;
    linkedPages.add(page);
    const focusable = new Set();
    const links = [];
    for (const span of page.querySelectorAll('.page-text [data-book-source-start]:not(.chapter-opening *)')) {
      let cursor = Number(span.dataset.bookSourceStart);
      let index = firstMentionAt(cursor);
      const spanEnd = cursor + span.textContent.length;
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      function advance() {
        cursor += node.length;
        node = walker.nextNode();
      }
      while (node && mentions[index]?.sourceStart < spanEnd) {
        const mention = mentions[index++];
        if (mention.sourceEnd > spanEnd) break;
        while (node && cursor + node.length <= mention.sourceStart) advance();
        if (!node) break;
        const startNode = node;
        const startOffset = mention.sourceStart - cursor;
        while (node && cursor + node.length < mention.sourceEnd) advance();
        if (!node) break;

        const label = indexedSource.slice(mention.sourceStart, mention.sourceEnd);
        const link = element('a', 'story-person-link');
        link.href = '#character-reminder';
        link.dataset.person = mention.person;
        link.dataset.mention = String(mention.sourceStart);
        link.setAttribute('aria-haspopup', 'dialog');
        link.setAttribute('aria-label', label + ' · Bu kimdi?');
        if (focusable.has(mention.person)) link.tabIndex = -1;
        focusable.add(mention.person);
        links.push({ link, label, startNode, startOffset, endNode: node, endOffset: mention.sourceEnd - cursor });
      }
    }

    // Wrap from the end so earlier offsets remain valid. A name may begin
    // in the chapter's decorative initial and finish in the next text node.
    const range = document.createRange();
    for (const { link, label, startNode, startOffset, endNode, endOffset } of links.reverse()) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      if (startOffset === 0 && startNode !== endNode && startNode.parentElement.classList.contains('reader-initial')) {
        range.setStartBefore(startNode.parentElement);
      }
      if (range.toString() !== label) continue;
      link.append(range.extractContents());
      range.insertNode(link);
    }
  }
  function syncLinks() {
    const visible = reader.visiblePages();
    if (!visible.length) return;
    indexMentions();
    visible.forEach(linkNames);
  }
  document.addEventListener('book:location', syncLinks);

  const reminder = element('dialog', 'character-reminder');
  reminder.id = 'character-reminder';
  reminder.setAttribute('aria-labelledby', 'character-reminder-title');
  const reminderHead = element('header', 'character-reminder-head');
  const reminderTitle = element('h2', '', 'Bu kimdi?');
  reminderTitle.id = 'character-reminder-title';
  const close = button('×', 'chronicle-button character-reminder-close', () => reminder.close());
  close.setAttribute('aria-label', 'Karakter hatırlatmasını kapat');
  close.autofocus = true;
  reminderHead.append(reminderTitle, close);
  const reminderBody = element('div', 'character-reminder-body');
  reminder.append(reminderHead, reminderBody);
  app.append(reminder);

  let reminderTrigger;
  let returningToPassage = false;
  reminder.addEventListener('close', () => {
    if (!returningToPassage) reminderTrigger?.focus({ preventScroll: true });
    reminderTrigger = null;
    returningToPassage = false;
  });
  document.addEventListener('book:panel-open', event => {
    if (event.detail !== 'character-reminder' && reminder.open) reminder.close();
  });

  function previousAppearance(person, offset, pageStart, ranges) {
    const anchor = reader.sourceAnchor(offset);
    const paragraphStart = offset - anchor.paragraphOffset;
    const earlier = mentionsByPerson.get(person.id) || [];
    const alreadyRead = viewed(ranges);
    const before = (limit) => earlier.findLast(mention => mention.sourceEnd <= limit && alreadyRead(mention));
    return before(Math.min(pageStart, paragraphStart)) || before(paragraphStart);
  }

  function mentionExcerpt(mention, ranges) {
    const [start, end] = ranges.find(([a, b]) => a <= mention.sourceStart && mention.sourceEnd <= b);
    const source = reader.source();
    const from = Math.max(start, source.lastIndexOf('\n', mention.sourceStart - 1) + 1, mention.sourceStart - 74);
    const lineEnd = source.indexOf('\n', mention.sourceEnd);
    const to = Math.min(end, lineEnd < 0 ? source.length : lineEnd, mention.sourceEnd + 96);
    return source.slice(from, to).trim();
  }

  function openReminder(link) {
    const person = people.get(link.dataset.person);
    const offset = Number(link.dataset.mention);
    const pageStart = Number(link.closest('.book-page').dataset.sourceStart);
    const ranges = history.ranges();
    const known = viewed(ranges)(person);
    const previous = previousAppearance(person, offset, pageStart, ranges);
    reminderBody.replaceChildren(
      element('h3', '', known ? person.name : link.textContent),
      ...(known ? [element('p', 'character-reminder-description', person.detail)] : []),
    );
    const record = previous || (known && person.sourceEnd <= offset ? person : null);
    if (record) {
      const chapter = world.chapters.findLast(item => item.offset <= record.sourceStart);
      const context = element('div', 'character-reminder-memory');
      const label = previous ? 'Önceki karşılaşma' : 'Tanıtıldığı sahne';
      context.append(
        element('h4', '', chapter ? label + ' · Bölüm ' + chapter.number : label),
        element('blockquote', '', previous ? mentionExcerpt(previous, ranges) : record.quote),
        button('Sahneye dön', 'chronicle-button', async () => {
          returningToPassage = true;
          reminder.close();
          await reader.seek(record.sourceStart, { preferText: true });
          readingFocus();
        }),
      );
      reminderBody.append(context);
    } else {
      reminderBody.append(element('p', 'chronicle-empty', 'Açtığın önceki sahnelerde bu karakterle başka bir karşılaşma yok.'));
    }
    reminderTrigger = link;
    document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'character-reminder' }));
    reminder.showModal();
  }

  function readingFocus() {
    const target = reader.location().mode === 'scroll' ? spread : document.getElementById('book-stage');
    target.focus({ preventScroll: true });
  }

  spread.addEventListener('click', event => {
    const link = event.target.closest('.story-person-link');
    if (!link) return;
    event.preventDefault();
    if (document.getElementById('book-stage').dataset.selectText !== 'true') openReminder(link);
  });

  let selectedPerson = 'fredo';
  function renderRelationships(parent, onRead) {
    const seen = viewed(history.ranges());
    const known = chronicle.characters.filter(seen);
    const knownIds = new Set(known.map(person => person.id));
    const links = chronicle.relationships.filter(edge => seen(edge) && knownIds.has(edge.from) && knownIds.has(edge.to)).sort(byOffset);
    const panel = element('section', 'chronicle-panel');
    panel.append(element('h3', 'chronicle-heading', 'Karakter ilişkileri haritası'));
    parent.append(panel);
    if (!known.length) {
      panel.append(element('p', 'chronicle-empty', 'Karakterlerle karşılaştıkça adları ve öğrendiğin bağlar burada görünecek.'));
      return;
    }

    const select = element('select', 'chronicle-select');
    select.setAttribute('aria-label', 'Haritanın merkezindeki karakter');
    for (const person of known) {
      const option = element('option', '', person.name);
      option.value = person.id;
      select.append(option);
    }
    const label = element('label', 'chronicle-field', 'Karakter seç');
    label.append(select);
    const graph = element('div', 'chronicle-graph');
    panel.append(label, graph);
    if (!knownIds.has(selectedPerson)) selectedPerson = known[0].id;

    function draw() {
      select.value = selectedPerson;
      const person = people.get(selectedPerson);
      const center = element('div', 'chronicle-map-center');
      center.dataset.person = person.id;
      center.append(element('h4', '', person.name), element('p', '', person.detail));
      graph.replaceChildren(center);

      const branches = new Map();
      for (const edge of links) {
        const neighbor = edge.from === selectedPerson ? edge.to : edge.to === selectedPerson ? edge.from : null;
        if (!neighbor) continue;
        if (!branches.has(neighbor)) branches.set(neighbor, []);
        branches.get(neighbor).push(edge);
      }
      if (!branches.size) {
        graph.append(element('p', 'chronicle-empty', 'Bu karakter için açılmış ilişki kaydı henüz yok.'));
        return;
      }
      const list = element('ul', 'chronicle-branches');
      for (const [id, edges] of branches) {
        const neighbor = people.get(id);
        const branch = element('li', 'chronicle-branch');
        const node = button(neighbor.name, 'chronicle-map-person', () => {
          selectedPerson = id;
          draw();
          select.focus();
        });
        node.dataset.relatedPerson = id;
        node.setAttribute('aria-label', neighbor.name + ' bağlantılarını göster');
        branch.append(node);
        for (const edge of edges) {
          const record = button(edge.name, 'chronicle-edge', () => onRead(edge.sourceStart));
          record.dataset.relation = edge.id;
          record.append(element('span', '', chapterLabel(edge.sourceChapter) + ' ↗'));
          branch.append(record);
        }
        list.append(branch);
      }
      graph.append(list);
    }
    select.addEventListener('change', () => {
      selectedPerson = select.value;
      draw();
    });
    draw();
  }

  function renderGlossary(parent, onRead) {
    const entries = chronicle.glossary.filter(viewed(history.ranges())).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
    const panel = element('section', 'chronicle-panel');
    panel.append(element('h3', 'chronicle-heading', 'Büyü ve eşya sözlüğü'));
    parent.append(panel);
    if (!entries.length) {
      panel.append(element('p', 'chronicle-empty', 'Büyüleri, mühürleri ve eşyaları keşfettikçe sözlük burada dolacak.'));
      return;
    }
    const query = element('input', 'chronicle-search');
    query.type = 'search';
    query.maxLength = 100;
    query.placeholder = 'Adı veya açıklamasıyla ara';
    query.setAttribute('aria-label', 'Sözlükte ara');
    const filters = element('div', 'chronicle-filters');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Sözlük kategorileri');
    const categories = ['Tümü', ...new Set(entries.map(item => item.category))];
    const results = element('div', 'chronicle-definitions');
    const status = element('p', 'sr-only');
    status.setAttribute('role', 'status');
    let selected = 'Tümü';
    const filterButtons = categories.map(category => {
      const filter = button(category, 'chronicle-button', () => {
        selected = category;
        draw();
      });
      filters.append(filter);
      return filter;
    });
    panel.append(query, filters, status, results);

    function draw() {
      filterButtons.forEach((filter, index) => filter.setAttribute('aria-pressed', String(categories[index] === selected)));
      const needle = fold(query.value.trim());
      const matches = entries.filter(entry => (selected === 'Tümü' || entry.category === selected) &&
        fold(entry.name + ' ' + entry.detail).includes(needle));
      status.textContent = matches.length + ' sözlük kaydı';
      results.replaceChildren();
      for (const term of matches) {
        const card = element('article', 'chronicle-term');
        card.dataset.term = term.id;
        card.append(element('small', '', term.category), element('h4', '', term.name), element('p', '', term.detail),
          button(chapterLabel(term.sourceChapter) + ' · Sahneye dön ↗', 'chronicle-button', () => onRead(term.sourceStart)));
        results.append(card);
      }
      if (!matches.length) results.append(element('p', 'chronicle-empty', 'Açılan sözlük kayıtlarında sonuç bulunamadı.'));
    }
    query.addEventListener('input', draw);
    draw();
  }

  function renderTimeline(parent, onRead) {
    const seen = viewed(history.ranges());
    const readEvents = world.facts.filter(fact => fact.kind === 'events' && seen(fact)).sort(byOffset);
    const past = chronicle.pastEvents.filter(seen);
    const between = (first, last) => readEvents.filter(event => first <= event.sourceChapter + 1 && event.sourceChapter + 1 <= last);
    const eras = [
      ['Yıkılıştan önce', past.filter(event => event.era === 'before')],
      ['Yirmi yıl önce', [...past.filter(event => event.era === 'fall'), ...between(1, 1)]],
      ['Dağ yılları', between(2, 2)],
      ['Merkez Şehir ve Ragewind', between(3, 13)],
      ['Kara büyünün izinde', between(14, 27)],
      ['Alwyn Sarayı', between(28, 47)],
      ['Frosthold’a dönüş', between(48, 51)],
    ].filter(([, events]) => events.length);
    const panel = element('section', 'chronicle-panel');
    panel.append(element('h3', 'chronicle-heading', 'Frosthold zaman çizelgesi'));
    parent.append(panel);
    if (!eras.length) {
      panel.append(element('p', 'chronicle-empty', 'Önemli sahneleri açtıkça olaylar gerçekleşme sırasıyla burada görünecek.'));
      return;
    }

    const select = element('select', 'chronicle-select');
    select.setAttribute('aria-label', 'Zaman çizelgesinde döneme git');
    const placeholder = element('option', '', 'Döneme git');
    placeholder.value = '';
    select.append(placeholder);
    panel.append(select);
    const headings = [];
    for (const [index, [title, events]] of eras.entries()) {
      const option = element('option', '', title);
      option.value = String(index);
      select.append(option);
      const era = element('section', 'chronicle-era');
      const heading = element('h4', 'chronicle-era-title', title);
      heading.tabIndex = -1;
      headings.push(heading);
      const list = element('ol', 'chronicle-events');
      for (const event of events) {
        const item = element('li', 'chronicle-moment');
        item.dataset.event = event.id;
        const open = button('', 'chronicle-event', () => onRead(event.sourceStart));
        const scene = !event.era && world.scenes.find(entry => entry.chapter === event.sourceChapter &&
          seen({ sourceStart: entry.memoryOffset, sourceEnd: entry.memoryUnlock }));
        if (scene) {
          const image = element('img');
          image.src = './' + scene.src.replace(/\.webp$/u, '-480.webp');
          image.alt = '';
          image.loading = 'lazy';
          image.decoding = 'async';
          open.append(image);
        }
        const copy = element('span', 'chronicle-event-copy');
        copy.append(element('small', '', chapterLabel(event.sourceChapter) + (event.era ? ' · Geçmişin anlatıldığı sahne' : '')),
          element('strong', '', event.name));
        const symbol = element('span', 'chronicle-event-arrow', '↗');
        symbol.setAttribute('aria-hidden', 'true');
        open.append(copy, symbol);
        item.append(open);
        list.append(item);
      }
      era.append(heading, list);
      panel.append(era);
    }
    select.addEventListener('change', () => {
      if (select.value === '') return;
      const heading = headings[Number(select.value)];
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start' });
      select.value = '';
    });
  }

  syncLinks();
  window.BookChronicle = Object.freeze({ renderRelationships, renderGlossary, renderTimeline, readingFocus });
})();
