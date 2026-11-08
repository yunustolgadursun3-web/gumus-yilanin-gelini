// Runic engravings belong to this book and never alter manuscript text.
(() => {
  'use strict';
  const api=window.BookReader,world=window.BookWorld;if(!api||!world)return;
  const played=new Set(),animations=new Set();let frame=0;
  const el=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
  const seals = {
    oath:'M4 12h16m-12-5 4-4 4 4m-8 10 4 4 4-4', crystal:'M12 2 19 10 16 19 12 22 8 19 5 10Z M5 10h14M12 2v20',
    child:'M4 19 16 7m-4-4 8 8M6 13l5 5m-7-2-2 5 5-2', wing:'M3 19Q5 5 21 3l-5 8-6 1-2 5Z',
    spring:'M4 15q4-5 8 0t8 0M4 19q4-5 8 0t8 0M12 3l-4 6a4 4 0 0 0 8 0z', spear:'M3 21 15 9l-1-5 7-1-1 7-5-1',
    book:'M2 5q5-2 10 2 5-4 10-2v14q-5-2-10 2-5-4-10-2zM12 7v14', path:'M4 20c9 0 15-4 7-7s-4-7 5-7m-4-3 5 3-5 3',
    leaf:'M5 21C0 10 9 4 21 3c0 11-5 17-16 18L17 7', anvil:'M2 6h20l-5 6h-4v4l5 3H6l5-3v-4H7Z',
    tide:'M2 14q5-7 10 0t10 0M2 19q5-7 10 0t10 0M12 3v5m-3-2h6', letter:'M3 6h18v12H3zM3 6l9 7 9-7',
    archive:'M4 6h16v14H4zM2 3h20v3H2zM9 10h6', stars:'m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2zM3 5h4m-2-2v4m13 12h4',
    ring:'M7 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0zM5 4l-2 4m16-4 2 4M8 21h8', split:'m12 2 9 10-9 10-9-10zM12 2l-3 9 6 2-3 9',
    throne:'M7 20V5l5-3 5 3v15M4 20h16M7 13h10M4 9v7m16-7v7', lesson:'M4 20Q7 5 20 4M7 16q6 2 12-5M13 10l-1-5',
    court:'M3 18h18M4 15V8m4 7V6m4 9V4m4 11V6m4 9V8', breath:'M4 15c2-9 8-8 7-2-1 5 8 2 9-6M4 19c4-3 7 3 13 0',
    names:'M3 6h18M5 6v3m3-3v5m4-5v8m4-8v5m3-5v3M6 17h12', broken:'M4 9l4-4 5 5-4 4-5-5m7 6 4-4 5 5-4 4-5-5M3 19l3-2m12-11 3-2',
    choice:'M12 21v-9L5 5m7 7 7-7M3 9V3h6m6 0h6v6', return:'m2 19 6-10 4 5 5-11 5 16zM8 9l2 4m7-10 2 7',
    moons:'M6 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10-6a5 5 0 1 0 5 6 6 6 0 0 1-5-6zM8 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  };
  function seal(opening) {
    const path = seals[opening.dataset.seal];
    if (!path || opening.querySelector('.chapter-seal')) return;
    const mark = el('span','chapter-seal');
    mark.setAttribute('aria-hidden','true');
    mark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"><path d="${path}"/></svg>`;
    opening.append(mark);
  }
  function clear(){animations.forEach(a=>a.cancel());animations.clear();}
  function heading(node,type,key){if(!node||played.has(key)||world.quiet())return;played.add(key);const a=node.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:800,easing:'cubic-bezier(.2,.7,.2,1)'});animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));}
  function ornament(parent){if(parent.querySelector(':scope>.sky-engraving'))return;const img=el('img','sky-engraving');img.src='./assets/images/book-sigil.svg';img.alt='';img.setAttribute('aria-hidden','true');img.decoding='async';parent.append(img);}
  function panel(parent,key){clear();const hero=parent.querySelector('.atlas-heading,.journal-cover,.explore-page-title')||parent;ornament(hero);heading(hero.querySelector('h3'),'trace','panel:'+key);}
  function pages() {
    for (const page of api.visiblePages()) {
      const opening = page.querySelector('.chapter-opening,.frontmatter-label,.end-page');
      if (opening) {
        seal(opening);
        ornament(page);
        heading(opening.querySelector('h2') || opening,'trace','page:'+page.dataset.sourceStart);
      }
      const artwork = page.querySelector('[data-chapter-art="chapter-00"] img, [data-chapter-art="chapter-18"] img, [data-chapter-art="chapter-24"] img');
      const key = 'art:' + artwork?.getAttribute('src');
      if (!artwork || played.has(key) || world.quiet() || matchMedia('(max-width:819px)').matches) continue;
      played.add(key);
      const animation = artwork.animate([{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:900,easing:'ease-out'});
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    }
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(pages);}
  document.addEventListener('book:location',()=>{clear();schedule();});document.addEventListener('book:settings',()=>{clear();schedule();});document.addEventListener('book:panel-open',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});window.addEventListener('pagehide',()=>{clear();cancelAnimationFrame(frame);});
  window.BookManuscript=Object.freeze({clear,panel,heading,ornament});schedule();
})();
