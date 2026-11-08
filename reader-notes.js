(() => {
  'use strict';
  const reader = window.BookReader;
  const notebook = window.BookNotebook;
  const plan = window.BOOK_PLAN;
  const stage = document.getElementById('book-stage');
  const settings = document.getElementById('hub-page-reading');
  const app = document.getElementById('app');
  if (!reader || !notebook || !plan || !stage || !settings || !app) return;

  const bookId = String(plan.storageId || plan.title).toLocaleLowerCase('tr-TR').replace(/[^\p{L}\d]+/gu, '-');
  const key = 'book:' + bookId + ':annotations:v1';
  const journalKey = 'book:' + bookId + ':journal:v1';
  const types = {note:'Not', highlight:'Vurgu', tag:'Etiket', corner:'Köşe işareti'};
  const colors = {amber:'Kehribar', rose:'Gül', jade:'Yeşim', sky:'Gök'};
  let records = readRecords();
  let resolution = new WeakMap();
  let journal = readJson(journalKey);
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) journal = {};
  let journalTimer = 0;
  let selected = null;
  let draft = null;
  let scheduled = 0;

  function readJson(name) {
    try { return JSON.parse(localStorage.getItem(name) || 'null'); } catch { return null; }
  }
  function readRecords() {
    const stored = readJson(key);
    if (!Array.isArray(stored)) return [];
    return stored.slice(0,500).filter(item => item && typeof item.id === 'string' &&
      Object.hasOwn(types,item.kind) && Object.hasOwn(colors,item.color) &&
      Number.isInteger(item.start) && item.start >= 0 && typeof item.quote === 'string' &&
      item.quote.length > 0 && item.quote.length <= 1400);
  }
  function writeRecords(next) {
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { return false; }
    records = next;
    resolution = new WeakMap();
    schedulePaint();
    return true;
  }
  function chapterAt(offset) {
    return reader.chapters().find(item => item.offset <= offset && offset < item.end);
  }
  function pin(range, kind) {
    const source = reader.source();
    const anchor = reader.sourceAnchor(range.start);
    return {
      id: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2),
      kind, color:'amber', start:range.start, quote:range.text, sourceHash:anchor.sourceHash, chapterId:anchor.chapterId,
      before:source.slice(Math.max(0,range.start-36),range.start), after:source.slice(range.end,range.end+36),
      text:'', collection:'Alıntılar', created:Date.now(),
    };
  }
  function locate(item) {
    if (resolution.has(item)) return resolution.get(item);
    const source = reader.source();
    const revision = reader.sourceAnchor(0).sourceHash;
    if (!source || !revision) return null;
    let hit = null;
    if (revision === item.sourceHash && source.slice(item.start,item.start+item.quote.length) === item.quote) {
      hit = {start:item.start, end:item.start+item.quote.length};
    } else if (revision !== item.sourceHash) {
      const chapter = reader.chapters().find(value => value.id === item.chapterId);
      const lower = chapter?.offset ?? (item.chapterId ? -1 : 0);
      const upper = chapter?.end ?? reader.chapters()[0]?.offset ?? source.length;
      if (lower >= 0) {
        let start = source.indexOf(item.quote, lower);
        while (start >= 0 && start + item.quote.length <= upper) {
          const end = start + item.quote.length;
          const left = typeof item.before === 'string' && source.slice(Math.max(0,start-item.before.length),start) === item.before;
          const right = typeof item.after === 'string' && source.slice(end,end+item.after.length) === item.after;
          if (left && right) {
            if (hit) { hit = null; break; }
            hit = {start,end};
          }
          start = source.indexOf(item.quote,start+1);
        }
      }
    }
    resolution.set(item,hit);
    return hit;
  }
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, click, className = 'notebook-action') {
    const node = make('button',className,text);
    node.type = 'button';
    node.addEventListener('click',click);
    return node;
  }
  function select(entries, label) {
    const node = make('select');
    node.setAttribute('aria-label',label);
    for (const [value,text] of Object.entries(entries)) node.append(new Option(text,value));
    return node;
  }

  const toolbar = make('section','annotation-toolbar');
  toolbar.hidden = true;
  toolbar.setAttribute('aria-label','Metin işaretleme');
  const instruction = make('p','', 'Bir cümle seç.');
  instruction.setAttribute('role','status');
  const addNote = button('Not yaz', () => selected && edit(pin(selected,'note')));
  const addHighlight = button('Vurgula', () => selected && edit(pin(selected,'highlight')));
  const stop = button('Seçimi kapat', () => selectionMode(false));
  toolbar.append(instruction,addNote,addHighlight,stop);
  document.getElementById('reader-view').append(toolbar);

  const tools = make('div','annotation-setting');
  const selectText = button('Metni işaretle', () => {
    reader.closeSettings({animate:false});
    selectionMode(true);
  },'hub-button');
  selectText.id = 'annotation-start';
  const corner = button('Sayfanın köşesini işaretle', () => {
    const at = reader.location().offset;
    const anchor = reader.sourceAnchor(at);
    const start = at - anchor.paragraphOffset;
    const text = reader.source().slice(start,start+Math.min(anchor.paragraphLength,100));
    if (text) edit(pin({start,end:start+text.length,text},'corner'));
  },'hub-button');
  corner.id = 'annotation-corner-add';
  tools.append(selectText,corner);
  settings.prepend(tools);

  function selectionMode(enabled) {
    stage.dataset.selectText = String(enabled);
    toolbar.hidden = !enabled;
    if (!enabled) window.getSelection()?.removeAllRanges();
    selected = null;
    updateSelection();
  }
  function updateSelection() {
    if (toolbar.hidden) return;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? reader.sourceRange(selection.getRangeAt(0)) : null;
    selected = range && range.text.trim() && range.text.length <= 1400 ? range : null;
    instruction.textContent = selected ? selected.text.trim().slice(0,92) : 'Bir cümle seç.';
    addNote.disabled = addHighlight.disabled = !selected;
  }
  document.addEventListener('selectionchange',updateSelection);
  document.addEventListener('keydown',event=>{
    if (event.key === 'Escape' && !toolbar.hidden && !document.querySelector('dialog[open]')) selectionMode(false);
  });
  for (const control of [addNote,addHighlight]) {
    control.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') event.preventDefault();
    });
  }
  document.addEventListener('book:location', () => {
    if (!toolbar.hidden && !reader.location().open) selectionMode(false);
  });

  const editor = make('dialog','annotation-editor');
  editor.id = 'annotation-editor';
  editor.setAttribute('aria-labelledby','annotation-editor-title');
  const form = make('form');
  const editorTitle = make('h2','','Metin işareti');
  editorTitle.id = 'annotation-editor-title';
  const quote = make('blockquote','annotation-quote');
  const kind = select(types,'İşaret türü');
  const color = select(colors,'Vurgu rengi');
  const note = make('textarea');
  note.maxLength = 1800;
  note.rows = 4;
  note.placeholder = 'Notun veya etiketin';
  note.setAttribute('aria-label','Not metni');
  const collection = make('input');
  collection.maxLength = 64;
  collection.placeholder = 'Alıntı koleksiyonu';
  collection.setAttribute('aria-label','Alıntı koleksiyonu');
  const message = make('p','annotation-message');
  message.setAttribute('role','status');
  const actions = make('div','annotation-actions');
  const save = make('button','notebook-action','Kaydet');
  save.type = 'submit';
  actions.append(save,button('İptal',()=>editor.close()));
  form.append(editorTitle,quote,kind,color,note,collection,message,actions);
  editor.append(form);
  app.append(editor);

  function editorFields() {
    note.hidden = kind.value === 'highlight' || kind.value === 'corner';
    note.required = !note.hidden;
    collection.hidden = kind.value !== 'highlight';
  }
  kind.addEventListener('change',editorFields);
  function edit(item) {
    reader.closeSettings({animate:false});
    draft = item;
    quote.textContent = item.quote;
    kind.value = item.kind;
    color.value = item.color;
    note.value = item.text || '';
    collection.value = item.collection || 'Alıntılar';
    message.textContent = '';
    editorFields();
    editor.showModal();
    (note.hidden ? kind : note).focus();
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!draft) return;
    const current = readRecords();
    const existing = current.findIndex(item => item.id === draft.id);
    if (existing < 0 && current.length >= 500) { message.textContent = '500 kayıt sınırına ulaştın.'; return; }
    if (!note.hidden && !note.value.trim()) {message.textContent = 'Not metnini yaz.';return;}
    const saved = {...draft,kind:kind.value,color:color.value,text:note.hidden?'':note.value.trim(),collection:collection.value.trim() || 'Alıntılar'};
    if (existing >= 0) current[existing] = saved;
    else current.unshift(saved);
    if (!writeRecords(current)) {message.textContent = 'Tarayıcı kaydı kabul etmedi.';return;}
    window.BookSounds?.ribbon?.();
    editor.close();
    selectionMode(false);
    notebook.refresh();
  });
  editor.addEventListener('close',()=>{draft=null;});

  function schedulePaint() {
    if (!scheduled) scheduled = requestAnimationFrame(paint);
  }
  function paint() {
    scheduled = 0;
    const ranges = Object.fromEntries(Object.keys(colors).map(color=>[color,[]]));
    const support = window.CSS?.highlights && typeof window.Highlight === 'function';
    for (const page of reader.visiblePages()) {
      page.querySelectorAll('.annotation-overlay,.annotation-page-mark').forEach(node=>node.remove());
      const lower = Number(page.dataset.sourceStart);
      const upper = Number(page.dataset.sourceEnd);
      for (const item of records) {
        const target = locate(item);
        if (!target || target.start >= upper || target.end <= lower) continue;
        if (item.kind === 'corner' || item.kind === 'tag') {
          if (target.start < lower) continue;
          const label = item.kind === 'corner' ? '◆' : String(item.text || 'Etiket').slice(0,30);
          const mark = button(label,()=>notebook.open('notes'),'annotation-page-mark');
          mark.dataset.kind = item.kind;
          mark.dataset.color = item.color;
          mark.setAttribute('aria-label', types[item.kind] + ': ' + (item.text || item.quote));
          if (!page.querySelector('.annotation-page-mark[data-kind="'+item.kind+'"]')) page.append(mark);
          continue;
        }
        const range = reader.rangeForSource(Math.max(lower,target.start),Math.min(upper,target.end),page);
        if (!range) continue;
        if (support) ranges[item.color].push(range);
        else {
          const box = page.getBoundingClientRect();
          for (const rect of range.getClientRects()) {
            const overlay = make('span','annotation-overlay');
            overlay.dataset.color = item.color;
            overlay.setAttribute('aria-hidden','true');
            Object.assign(overlay.style,{left:rect.left-box.left+'px',top:rect.top-box.top+'px',width:rect.width+'px',height:rect.height+'px'});
            page.append(overlay);
          }
        }
      }
    }
    if (support) {
      for (const [color, list] of Object.entries(ranges)) CSS.highlights.set('book-' + color,new Highlight(...list));
    }
  }
  document.addEventListener('book:location',schedulePaint);
  document.addEventListener('book:settings',schedulePaint);
  window.addEventListener('storage',event=>{
    if (event.key === key) {records=readRecords();resolution=new WeakMap();schedulePaint();notebook.refresh();}
  });

  let filter = 'all';
  let collectionFilter = '';
  notebook.register('notes','Notlar',({pane,status,jump,empty,refresh})=>{
    const category = select({all:'Tümü',...types},'Not ve vurgu filtresi');
    category.value = filter;
    const group = make('input','annotation-collection-filter');
    group.placeholder = 'Koleksiyon adı';
    group.setAttribute('aria-label','Alıntı koleksiyonuna göre filtrele');
    group.value = collectionFilter;
    const results = make('div');
    pane.append(category,group,results);
    category.addEventListener('change',()=>{filter=category.value;list();});
    group.addEventListener('input',()=>{collectionFilter=group.value;list();});
    function list() {
      results.replaceChildren();
      const visible = records.filter(item => (filter === 'all' || item.kind === filter) &&
        (!collectionFilter || item.kind === 'highlight' && String(item.collection).toLocaleLowerCase('tr-TR').includes(collectionFilter.toLocaleLowerCase('tr-TR'))));
      if (!visible.length) {results.append(make('p','notebook-empty','Bu filtrede kayıt yok.'));return;}
      for (const item of visible) {
        const target = locate(item);
        const card = make('article','annotation-card');
        card.dataset.color = item.color;
        card.append(make('small','',types[item.kind] + (item.kind === 'highlight' ? ' · ' + item.collection : '')),
          make('blockquote','annotation-quote',item.quote));
        if (item.text) card.append(make('p','',item.text));
        if (!target) card.append(make('p','annotation-message','Metin değişti. Bu kayıt için güvenli eşleşme bulunamadı.'));
        const controls = make('div','annotation-actions');
        if (target) controls.append(button('Metne dön',()=>jump(target.start,{preferText:true})));
        controls.append(button('Düzenle',()=>edit(item)),button('Sil',()=>{
          if (!writeRecords(readRecords().filter(candidate=>candidate.id!==item.id))) status.textContent='Silme işlemi kaydedilemedi.';
          else refresh();
        }));
        card.append(controls);
        results.append(card);
      }
    }
    list();
  });

  const fold = value => String(value || '').toLocaleLowerCase('tr-TR');
  function sourceMatches(source,query) {
    const whole = fold(source);
    const offsets = whole.length === source.length ? null : [];
    let searchable = whole;
    if (offsets) {
      searchable = '';
      let start = 0;
      for (const character of source) {
        const value = fold(character);
        searchable += value;
        for (let index=0;index<value.length;index++) offsets.push(start);
        start += character.length;
      }
    }
    const found = [];
    let at = searchable.indexOf(query);
    while (at >= 0 && found.length < 160) {
      found.push(offsets ? offsets[at] : at);
      at = searchable.indexOf(query,at+query.length);
    }
    return found;
  }

  notebook.register('search','Ara',({pane,row})=>{
    const query = make('input','annotation-search');
    query.type = 'search';
    query.maxLength = 120;
    query.placeholder = 'Kitapta, notlarda ve vurgularda ara';
    query.setAttribute('aria-label','Kitapta ara');
    const gate = make('label','annotation-search-gate');
    const spoiler = make('input');
    spoiler.type = 'checkbox';
    spoiler.checked = true;
    gate.append(spoiler,' İlerideki bölümleri gizle');
    const output = make('div');
    output.setAttribute('aria-live','polite');
    pane.append(query,gate,output);
    let pending;
    function search() {
      output.replaceChildren();
      const text = fold(query.value.trim());
      if (text.length < 2) {output.append(make('p','notebook-empty','En az iki karakter yaz.'));return;}
      const source = reader.source();
      const chapters = reader.chapters();
      const at = reader.location().offset;
      const limit = spoiler.checked ? (chapterAt(at)?.end ?? chapters[0]?.offset ?? at) : source.length;
      const result = [];
      for (const chapter of chapters) if (chapter.offset < limit && fold(chapter.title).includes(text)) result.push([chapter.title,'Bölüm başlığı',chapter.offset]);
      for (const item of records) {
        const target = locate(item);
        if (target && target.start < limit && fold([item.quote,item.text,item.collection].join(' ')).includes(text))
          result.push([types[item.kind],item.text || item.quote,target.start]);
      }
      for (const offset of sourceMatches(source.slice(0,limit),text)) {
        if (result.length >= 60) break;
        const title = chapterAt(offset)?.title || plan.title;
        const excerpt = source.slice(Math.max(0,offset-38), Math.min(limit,offset+text.length+52)).replace(/\s+/gu,' ').trim();
        result.push([title,excerpt,offset]);
      }
      if (!result.length) output.append(make('p','notebook-empty','Sonuç bulunamadı.'));
      for (const [title,excerpt,offset] of result.slice(0,60)) output.append(row(title,excerpt,offset,{preferText:true}));
    }
    query.addEventListener('input',()=>{clearTimeout(pending);pending=setTimeout(search,120);});
    spoiler.addEventListener('change',search);
    search();
  });

  function persistJournal() {
    clearTimeout(journalTimer);
    try {localStorage.setItem(journalKey,JSON.stringify(journal));} catch {}
  }
  document.addEventListener('book:location',()=>{
    const location=reader.location();
    if (!location.open || !location.length) return;
    const visited = Array.isArray(journal.visited) ? journal.visited : [];
    const chapter = location.anchor?.chapterId;
    journal = {
      lastChapter:location.chapter,lastAnchor:location.anchor,completed:Boolean(journal.completed || location.offset===location.length),
      visited:chapter ? [...new Set([...visited,chapter])].slice(-500) : visited,
    };
    clearTimeout(journalTimer);
    journalTimer = setTimeout(persistJournal,300);
  });
  window.addEventListener('pagehide',persistJournal);
  notebook.register('recent','Son okunan',({pane,row})=>{
    const location = reader.location();
    const progress = make('progress','notebook-progress');
    progress.max=100;
    progress.value=location.percent;
    progress.setAttribute('aria-label','Okuma ilerlemesi');
    pane.append(make('p','notebook-chapter',location.chapter+' · %'+location.percent),progress);
    const marks = window.BookComfort?.bookmarks().length || 0;
    pane.append(make('p','notebook-empty',[
      journal.completed ? 'Tamamlandı' : 'Okunuyor',
      (Array.isArray(journal.visited)?journal.visited.length:0) + ' ziyaret edilen bölüm',
      marks + ' yer imi', records.length + ' kişisel işaret', (window.BookStyleStudio?.label(reader.settings().theme) || 'Kişisel') + ' teması',
    ].join(' · ')));
    pane.append(row('Okumaya dön',location.excerpt,location.offset,{anchor:location.anchor}));
  });

  window.BookAnnotations = Object.freeze({list:()=>records.map(item=>({...item})), locate});
})();
