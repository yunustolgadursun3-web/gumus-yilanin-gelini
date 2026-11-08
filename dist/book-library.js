(() => {
  'use strict';
  const reader = window.BookReader;
  const plan = window.BOOK_PLAN;
  const app = document.getElementById('app');
  const cover = document.querySelector('#cover-view .cover-content');
  if (!reader || !plan || !app || !cover) return;

  const home = {
    id:plan.storageId, title:plan.title, subtitle:plan.subtitle, color:'#483448',
    cover:plan.cover?.src || document.querySelector('#cover-view .cover-art img')?.getAttribute('src'),
    href:'./', active:true,
  };
  function imageUrl(value) {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin || url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  }
  const books = [home, ...(window.BOOK_LIBRARY_ITEMS || []).filter(item=>item.id!==home.id &&
    typeof item.title === 'string' && imageUrl(item.cover) && imageUrl(item.href))];

  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function control(text, run, className = 'library-control') {
    const el = node('button', className, text);
    el.type = 'button';
    el.addEventListener('click', run);
    return el;
  }
  function bookImage(book, className) {
    const image = node('img',className);
    image.src = imageUrl(book.cover);
    image.alt = book.title + ' kapak resmi';
    image.loading = 'lazy';
    image.decoding = 'async';
    return image;
  }

  const dialog = node('dialog','living-library');
  dialog.id = 'living-library';
  dialog.setAttribute('aria-labelledby','living-library-title');
  const head = node('header','library-header');
  const title = node('h2','','Kitaplık');
  title.id = 'living-library-title';
  const close = control('Kapat',()=>dialog.close());
  head.append(title,close);
  const views = node('div','library-views');
  views.setAttribute('role','group');
  views.setAttribute('aria-label','Kitaplık görünümü');
  const shelf = node('div','library-shelf');
  shelf.dataset.view = 'shelf';
  const preview = node('section','library-preview');
  preview.setAttribute('aria-label','Seçili kitabın ön kapağı');
  const layout = node('div','library-layout');
  layout.append(shelf,preview);
  dialog.append(head,views,layout);
  app.append(dialog);
  let returnedFocus;
  let selectedId = home.id;

  function setView(value) {
    shelf.dataset.view = value;
    if (value === 'cards') shelf.querySelectorAll('img').forEach(image=>{image.loading='eager';});
    shelfButton.setAttribute('aria-pressed',String(value==='shelf'));
    cardButton.setAttribute('aria-pressed',String(value==='cards'));
  }
  const shelfButton = control('Kitap sırtları',()=>setView('shelf'));
  const cardButton = control('Kapak kartları',()=>setView('cards'));
  views.append(shelfButton,cardButton);
  setView('shelf');

  const items = new Map();
  for (const book of books) {
    const item = control('',()=>selectBook(book),'library-book');
    item.setAttribute('aria-label',book.title);
    item.style.setProperty('--library-binding',/^#[a-f0-9]{6}$/i.test(book.color) ? book.color : '#453343');
    const spine = node('span','library-spine',book.title);
    spine.setAttribute('aria-hidden','true');
    const volume = node('span','library-volume');
    volume.setAttribute('aria-hidden','true');
    volume.append(bookImage(book,'library-volume-cover'));
    if (window.BookPhysics?.solidify) {
      window.BookPhysics.solidify(volume).left.append(spine);
      item.append(volume);
    } else item.append(spine);
    item.append(bookImage(book,'library-thumbnail'),node('span','library-book-label',book.title));
    items.set(book.id,item);
    shelf.append(item);
  }
  function selectBook(book) {
    selectedId=book.id;
    for(const [id,item] of items)item.setAttribute('aria-pressed',String(id===selectedId));
    const copy=node('div','library-preview-copy');
    copy.append(node('h3','',book.title),node('p','',book.subtitle || ''));
    let open;
    if(book.active) {
      open=control(reader.location().open?'Okumaya dön':'Kitabı aç',()=>{
        const reading=reader.location().open;
        dialog.close();
        if (!reading) {
          const resume = document.getElementById('continue-reading');
          if (resume && !resume.hidden) resume.click();
          else document.getElementById('start-reading')?.click();
        }
      });
    } else {
      open=node('a','library-control','Kitabı aç');
      open.href=imageUrl(book.href);
      open.target='_blank';
      open.rel='noopener noreferrer';
      open.setAttribute('aria-label',book.title + ' kitabını yeni sekmede aç');
    }
    copy.append(open);
    const front = bookImage(book,'library-preview-cover');
    front.loading='eager';
    preview.replaceChildren(front,copy);
  }

  function open() {
    returnedFocus=document.activeElement;
    document.dispatchEvent(new CustomEvent('book:panel-open',{detail:'library'}));
    selectBook(books.find(book=>book.id===selectedId) || home);
    dialog.showModal();
    items.get(selectedId)?.focus();
  }
  dialog.addEventListener('close',()=>{if(returnedFocus?.getClientRects().length)returnedFocus.focus();});
  document.addEventListener('book:panel-open',event=>{if(dialog.open && event.detail!=='library')dialog.close();});
  const entrance = control('Kitaplık',open,'cover-library-button');
  entrance.id='cover-library-open';
  entrance.setAttribute('aria-haspopup','dialog');
  cover.append(entrance);
  const inside = control('Kitaplığa dön',open,'hub-button');
  inside.setAttribute('aria-haspopup','dialog');
  document.getElementById('hub-page-reading')?.append(inside);
})();
