// Shared visual presentation. Discovery truth and reading position stay in STORY_WORLD/BookReader.
(() => {
  'use strict';
  const data=window.STORY_WORLD,api=window.BookReader,seenCards=new Set();
  if(!data||!api)return;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const paths={
    palace:'M3 21h18M5 21V9h14v12M3 9l9-6 9 6M9 12v6m6-6v6M10 21v-3h4v3M12 3V1',
    opera:'M3 21h18M5 21V9h14v12M3 9l9-6 9 6M8 12h8M8 15h8M9 21v-3h6v3M12 3V1',
    garden:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 6v6l4 3M4 4l2 2m12 12 2 2M3 12h2m14 0h2',
    harbor:'M12 3v13M8 6h8M7 12H4c0 5 3 9 8 9s8-4 8-9h-3M9 3a3 3 0 1 0 6 0',
    shop:'M3 10h18l-2-6H5zM5 10v11h14V10M8 21v-6h4v6M15 13h2',
    eldoria:'M3 20h18M5 20V10h4v10m0-14h6v14m0-10h4v10M12 2v4M10 8h4m-2 0v4',
    archive:'M4 7h16v14H4zM3 3h18v4H3zM9 11h6m-6 4h6',
    characters:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21v-3c0-6 14-6 14 0v3',
    atlas:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15',
    timeline:'M5 3v18M3 6h4m-4 6h4m-4 6h4M11 5h9m-9 7h7m-7 7h9',
    journal:'M5 3h15v18H5zM2 7h5m-5 5h5m-5 5h5M10 7h6m-6 5h6m-6 5h4',
    memory:'M3 4h18v16H3zM5 18l5-6 4 4 3-4 3 6M8 7h1',
    chapters:'M12 5C8 2 4 3 2 4v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1zm0 0v16',
    desk:'M3 13h18M5 13v8m14-8v8M6 10V4h8v6zm10 0 3-7 2 1-3 7M9 7h2',
    objects:'M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5m-9 5v10',
    symbols:'m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
    events:'M12 3v9l6 3M12 3a9 9 0 1 0 9 9'
  };
  Object.assign(paths,{"greyhaven":"M12 2 5 12h4l-5 5h6v5h4v-5h6l-5-5h4z","cabin":"M2 11 12 3l10 8M5 9v12h14V9M10 21v-7h4v7","bracken":"M3 21V11l5-4 5 4v10M13 21V8l4-4 4 4v13M6 15h3m7-3h2","hollowmere":"M3 21V9h18v12M8 9V3h8v6M12 4v3l2 1M7 14h3m4 0h3","bridge":"M2 9h20M2 6v9m20-9v9M3 21V9h18v12M7 21v-7h4v7m2 0v-7h4v7","vale":"M2 19 7 8l5 8 5-12 5 15M4 21h16M10 17l2-3","monastery":"M4 21V9l8-6 8 6v12M9 21v-7h6v7M12 3v5m-3 0h6","lighthouse":"M7 21 9 6h6l2 15M7 6h10M10 2h4v4M3 4l3 1m12 0 3-1M10 11h4","threshold":"M5 21V9a7 7 0 0 1 14 0v12M8 21V9a4 4 0 0 1 8 0v12M3 21h18","crown":"m3 7 4 4 5-7 5 7 4-4-2 13H5z","sword":"m5 21 13-13 2-5-5 2L2 18m0-4 8 8","bell":"M5 17h14l-3-5V8a4 4 0 0 0-8 0v4zM10 20h4","scarlet":"M12 22V11m0 6-5-3m5-3C0 12 4 2 10 6c-3-9 8-8 5 0 10-3 9 8-1 6","cinder":"m5 9-1-6 6 4h4l6-4-1 6c5 8-1 13-7 13S0 17 5 9m4 4h1m4 0h1m-4 4h2M6 15H1m17 0h5"});
  Object.assign(paths,{valthera:'M12 2C9 8 4 9 5 15a7 7 0 0 0 14 0c0-4-4-6-4-9l-3 5z',myrhael:'M3 8h18M5 12h14M3 16h18M8 20h8',korvann:'m7 3 6 5-4 5-6-5zM10 11l10 10M13 3l6 6-3 3-6-6',thalerys:paths.harbor,elarwyn:'M4 21C1 5 10 2 21 3c0 14-6 20-17 18zm0 0L18 6',noxeris:'M17 3A9 9 0 1 0 21 16 8 8 0 0 1 17 3',solmara:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z','valthera-city':paths.eldoria,'greyfang-valley':'m2 20 7-16 6 16m-4-9 6-8 6 17','greyfang':'m2 20 7-16 6 16m-4-9 6-8 6 17',palace:paths.palace,cave:'M2 21 6 7l6-4 7 6 3 12M7 21v-8l5-5 5 5v8'});
  function icon(key){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.25');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const aliases={oratorium:'palace',solmerya:'solmara',nivareth:'valthera',vharcain:'noxeris',tsukimori:'garden',aurekhan:'korvann',mournwyck:'elarwyn',asterel:'eldoria','red-pass':'cave','ash-plain':'atlas','fen-home':'shop','first-gate':'harbor','asterel-archive':'archive','eclipse-tower':'palace',aetheryon:'myrhael'};const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[aliases[key]||key]||paths.archive);svg.append(p);return svg;}
  const quiet=()=>{const s=api.settings();return document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||s.reduceMotion||s.nightComfort||s.focusMode||s.quality==='low'||navigator.connection?.saveData;};
  function asset(f) {
    if (f.kind === 'connections') return null;
    const offset = api.location().offset;
    const visual = data.visuals?.[f.id];
    if (visual && visual.unlock <= offset) return visual.src;
    const scene = data.scenes.find(item => item.chapter === f.sourceChapter && item.memoryUnlock <= offset);
    return f.image || scene?.src || null;
  }
  function photo(src, alt, cls = '') {
    const img = el('img', cls);
    const source = './' + src.replace(/^\.\//, '');
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    const artwork = window.BOOK_PLAN.chapters.find(c => c.galleryImage?.src === src)?.galleryImage
      || data.scenes.find(scene => scene.src === src && scene.width);
    const portrait = /\/(kaelor|selvara|ilyne|nymera|aethros|morvain)\.webp$/.test(src);
    if (/^assets\/images\/.+\.webp$/.test(src)) {
      img.width = artwork?.width || (portrait || src.endsWith('/cover.webp') ? 800 : 1200);
      img.height = artwork?.height || (portrait ? 1200 : src.endsWith('/cover.webp') ? 1200 : 800);
      img.srcset = source.replace(/\.webp$/, '-480.webp') + ' 480w, ' + source + ' ' + img.width + 'w';
      img.sizes = '(max-width:600px) calc(100vw - 70px), (max-width:899px) 500px, 360px';
      img.addEventListener('error', () => {
        img.removeAttribute('srcset');
        img.src = source;
      }, {once:true});
    }
    img.src = source;
    return img;
  }
  function viewer(src,label,{landmark=false,compact=false,preloaded=null,diorama=null}={}){
    const figure=el('figure','world-viewer'+(landmark?' landmark-viewer':'')+(compact?' world-viewer--compact':'')),stage=el('div','miniature-stage'),model=el('div','miniature-model'),image=preloaded||photo(src,label,'miniature-image'),frame=el('span','miniature-frame'),light=el('span','miniature-light');image.classList.add('miniature-image');
    if(!compact&&image.srcset)image.sizes='(max-width:600px) calc(100vw - 70px), 900px';frame.setAttribute('aria-hidden','true');light.setAttribute('aria-hidden','true');model.append(image,light,frame);stage.append(model);figure.append(stage);
    figure.dataset.motion=quiet()?'off':'on';
    const place=diorama||(landmark?Object.entries(data.visuals||{}).find(([id,v])=>['cabin','palace','vale','eldoria'].includes(id)&&v.src===src)?.[0]:null);stage.style.aspectRatio=src.includes('/riven.')||src.includes('/seryn.')||src.includes('/tavian.')?'4 / 5':'3 / 2';
    let scenery=null,rear=null;
    if(place){figure.dataset.diorama=place;rear=el('span','miniature-rear');scenery=el('span','miniature-scenery');rear.setAttribute('aria-hidden','true');scenery.setAttribute('aria-hidden','true');const motifs={eldoria:'M15 660V15h1170v645M35 640h1130M85 640V535h50v105m930 0V535h50v105',realm:'M10 660V15h1180v645M30 640h1140M400 640l20-30h360l20 30',cabin:'M4 660V20h65v640M1131 660V20h65v640M38 28h1124v26H38M35 640h1130v25H35',palace:'M20 665V240Q35 68 600 12q565 56 580 228v425M65 665V242Q90 110 600 55q510 55 535 187v423M21 600h55m1048 0h55M21 390h55m1048 0h55',vale:'M0 675q200-100 430-15m770 15q-200-100-430-15M40 675l18-120m-8 72-27-25m29 5 26-33m1062 101-18-120m8 72 27-25m-29 5-26-33'};scenery.innerHTML='<svg viewBox="0 0 1200 675" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="5"><path d="'+(motifs[place]||motifs.realm)+'"/></svg>';model.prepend(rear);model.append(scenery);}
    const control=new AbortController(),overlays=[];let raf=0,px=0,py=0,zoom=1;
    function paint(){raf=0;model.style.transform=`perspective(1000px) rotateX(${py*-3}deg) rotateY(${px*4}deg) scale(${zoom})`;image.style.transform=`translate3d(${px*-3}px,${py*-3}px,6px)`;overlays.forEach(n=>n.style.transform=image.style.transform);light.style.transform=`translate3d(${px*14}px,${py*9}px,18px)`;if(scenery)scenery.style.transform=`translate3d(${px*-8}px,${py*-6}px,28px)`;if(rear)rear.style.transform=`translate3d(${px*4}px,${py*3}px,-10px)`;if(image.srcset){const size=Math.round(stage.clientWidth*zoom)+'px';if(stage.clientWidth&&image.sizes!==size)image.sizes=size;}}
    figure.addOverlay=node=>{overlays.push(node);model.append(node);node.style.transform=image.style.transform;};
    stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||quiet())return;const b=stage.getBoundingClientRect();px=Math.max(-1,Math.min(1,(e.clientX-b.x)/b.width*2-1));py=Math.max(-1,Math.min(1,(e.clientY-b.y)/b.height*2-1));if(!raf)raf=requestAnimationFrame(paint);},{passive:true,signal:control.signal});
    stage.addEventListener('pointerleave',()=>{px=py=0;if(!raf)raf=requestAnimationFrame(paint);},{passive:true,signal:control.signal});
    if(!compact){const row=el('label','detail-zoom');row.append(el('span','','Detay yakınlaştırma'));const range=el('input');range.type='range';range.min='1';range.max='2';range.step='.05';range.value='1';range.setAttribute('aria-label','Mekân veya görsel detay yakınlaştırma');range.addEventListener('input',()=>{zoom=Number(range.value);paint();},{signal:control.signal});row.append(range);figure.append(row,el('figcaption','',landmark?'2.5D illüstratif minyatür · Mimari yorum':'Hikâye illüstrasyonu'));}
    if(place){figure.classList.add('paper-diorama');const caption=figure.querySelector('figcaption')||el('figcaption');caption.textContent='Katmanlı 2.5D kâğıt diorama · İllüstratif yorum';if(!caption.isConnected)figure.append(caption);if(!compact){const angles=el('div','miniature-angles');angles.setAttribute('aria-label','İllüstratif bakış açısı');for(const[x,label]of [[-.7,'Sol'],[0,'Önden'],[.7,'Sağ']]){const b=el('button','world-button',label);b.type='button';b.addEventListener('click',()=>{px=quiet()?0:x;py=0;paint();angles.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));},{signal:control.signal});angles.append(b);}figure.append(angles);}}
    const fullscreen=el('button','world-button world-fullscreen','Tam Ekran İncele');
    fullscreen.type='button';
    fullscreen.setAttribute('aria-label',label+' görselini tam ekran incele');
    fullscreen.addEventListener('click',event=>{
      event.stopPropagation();
      window.BookIllustrations?.openSource(src,{title:label,alt:label,trigger:fullscreen});
    },{signal:control.signal});
    figure.append(fullscreen);
    figure.dispose=()=>{control.abort();cancelAnimationFrame(raf);figure.getAnimations({subtree:true}).forEach(a=>a.cancel());};return figure;
  }
  function dispose(parent){parent.querySelectorAll('.royal-hierarchy').forEach(v=>v.dispose?.());parent.querySelectorAll('.location-explorer').forEach(v=>v.dispose?.());parent.querySelectorAll('.world-viewer').forEach(v=>v.dispose?.());parent.querySelectorAll('.atlas-sheet').forEach(v=>v.atlasCamera?.destroy());}
  function decorateCard(card,f){enableArtTrigger(card,f);card.dataset.kind=f.kind;if(!seenCards.has(f.id)){seenCards.add(f.id);if(!quiet()){card.classList.add('first-discovery');const finish=()=>card.classList.remove('first-discovery');card.addEventListener('animationend',finish,{once:true});card.addEventListener('animationcancel',finish,{once:true});}}const crest=el('span','fact-crest');crest.append(icon(paths[f.id]?f.id:f.kind));crest.setAttribute('aria-hidden','true');card.prepend(crest);const badge=el('span','discovery-badge','Keşfedildi');card.append(badge);if(f.kind==='characters'){card.classList.add('portrait-card');const img=card.querySelector('img');if(img)img.alt=f.name+(data.visuals[f.id]?.type==='portrait'?' · Karakter portresi':' · Hikâye sahnesi');}}
  function enableArtTrigger(card,f){if(!['objects','symbols','characters'].includes(f.kind))return;const image=card.querySelector('img'),inspect=card.querySelector('button');if(!image||!inspect)return;const trigger=el('button','world-art-trigger');trigger.type='button';trigger.dataset.inspectFact=f.id;trigger.setAttribute('aria-label',f.name+' görselini incele');image.replaceWith(trigger);trigger.append(image);trigger.addEventListener('click',()=>inspect.click());}
  const descriptions={archive:'Metinden doğrulanan kişiler, yerler ve nesneler.',characters:'Karşılaşılan yüzler ve öğrenilen bağlar.',atlas:'Mühürleri açılan Altı Krallığı Keşfet.',timeline:'Yalnızca öğrenilen olayların kaynak sırası.',journal:'Yolculuğun okunmuş sayfalardan oluşan defteri.',memory:'Ulaşılan sahnelerin resimli koleksiyonu.',chapters:'Keşfedilmiş bölümlerden oluşan kitaplık.',desk:'Kişisel okuma alanın ve saklı yer imlerin.'};
  function navigation(head,nav,title){
    const brand=el('div','world-brand');brand.append(el('small','',window.BOOK_PLAN.title),el('strong','','Yedi Sürü Keşif Arşivi'));title.before(brand);
    const note=el('p','world-nav-note');nav.after(note);nav.setAttribute('aria-label','Yedi Sürü keşif kategorileri');
    const buttons=[...nav.querySelectorAll('button')],groups=[['Keşif',['atlas','archive','characters']],['Hikâye',['chapters','timeline','memory']],['Kişisel',['journal','desk']]];
    for(const[label,keys]of groups){const group=el('div','world-tab-group');group.dataset.group=label;group.setAttribute('role','group');group.setAttribute('aria-label',label);group.append(el('span','world-group-label',label));for(const key of keys){const b=buttons.find(b=>b.dataset.worldTab===key);b.prepend(icon(key));b.setAttribute('aria-controls','world-content');group.append(b);}nav.append(group);}
    const quick=el('label','world-category-jump');quick.append(el('span','','Keşif kategorisi'));const select=el('select');select.setAttribute('aria-label','Keşif kategorisine geç');for(const b of buttons){const o=el('option','',b.textContent);o.value=b.dataset.worldTab;select.append(o);}select.addEventListener('change',()=>buttons.find(b=>b.dataset.worldTab===select.value).click());quick.append(select);note.before(quick);
    const indicator=el('span','world-active-indicator');indicator.setAttribute('aria-hidden','true');nav.append(indicator);let selected=null,lastTransform=null,indicatorAnimation=null;
    function positionIndicator(animate=false){if(!selected||nav.clientWidth<1){indicator.hidden=true;return;}indicator.hidden=false;const left=selected.getBoundingClientRect().left-nav.getBoundingClientRect().left+nav.scrollLeft,top=selected.getBoundingClientRect().bottom-nav.getBoundingClientRect().top+nav.scrollTop-2,target=`translate3d(${left}px,${top}px,0) scaleX(${selected.offsetWidth})`;indicatorAnimation?.cancel();indicator.style.transform=target;if(animate&&lastTransform&&lastTransform!==target&&!quiet())indicatorAnimation=indicator.animate([{transform:lastTransform},{transform:target}],{duration:330,easing:'cubic-bezier(.2,.7,.25,1)'});lastTransform=target;}
    new ResizeObserver(()=>positionIndicator(false)).observe(nav);
    nav.addEventListener('keydown',e=>{const list=[...nav.querySelectorAll('button')],index=list.indexOf(document.activeElement);if(index<0||!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const i=e.key==='Home'?0:e.key==='End'?list.length-1:(index+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;list[i].focus();list[i].click();});
    return key=>{title.textContent=key;note.textContent=descriptions[key]||'';select.value=key;const b=buttons.find(b=>b.dataset.worldTab===key);if(b){const changed=selected!==b;selected=b;const left=b.getBoundingClientRect().left-nav.getBoundingClientRect().left+nav.scrollLeft;if(left<nav.scrollLeft||left+b.offsetWidth>nav.scrollLeft+nav.clientWidth)nav.scrollLeft=Math.max(0,left-nav.clientWidth/2+b.offsetWidth/2);positionIndicator(changed);}};
  }
  function empty(parent,text){const state=el('section','world-empty-premium'),seal=el('span','empty-seal');seal.setAttribute('aria-hidden','true');seal.append(icon('archive'));state.append(seal,el('small','','YEDİ SÜRÜ · MÜHÜRLÜ SAYFALAR'),el('h3','','Yolculukla açılan izler'),el('p','',text));parent.append(state);}
  function spotlight(parent,facts,open){const f=facts.filter(f=>f.kind!=='connections').sort((a,b)=>b.unlock-a.unlock)[0];if(!f)return;const card=el('button','discovery-spotlight');card.type='button';card.setAttribute('aria-label','Öne çıkan keşif: '+f.name);const src=asset(f);if(src)card.append(photo(src,f.name));else card.append(icon(f.kind));const copy=el('span');copy.append(el('small','','ÖNE ÇIKAN KEŞİF'),el('strong','',f.name));card.append(copy,el('span','spotlight-arrow','↗'));card.addEventListener('click',()=>open(f));parent.prepend(card);}
  function chapterCards(parent, limit, onPreview) {
    const grid = el('div', 'world-chapter-library');
    for (const [index, chapter] of data.chapters.entries()) {
      const end = data.chapters[index + 1]?.offset ?? api.location().length;
      const progress = Math.max(0, Math.min(100, Math.round((limit - chapter.offset) / (end - chapter.offset) * 100)));
      const card = el('button', 'world-chapter-card');
      card.type = 'button';
      card.dataset.chapter = String(chapter.number);
      const art = window.BOOK_PLAN.chapters.find(item => item.id === chapter.id)?.galleryImage;
      if (art && limit >= art.unlock) card.append(photo(art.src, art.alt));
      else {
        const seal = el('span', 'chapter-locked-seal');
        seal.append(icon('chapters'));
        card.append(seal);
      }
      const label = /^PROLOG/u.test(chapter.title) ? 'PROLOG' : /^EPİLOG/u.test(chapter.title) ? 'EPİLOG' : 'BÖLÜM ' + String(chapter.number).padStart(2, '0');
      card.append(el('small','',label), el('h3','',chapter.title.split(' — ').slice(1).join(' — ')), el('span','chapter-state',progress === 100 ? 'Okundu' : progress > 0 ? 'Okuma sürüyor' : 'Henüz okunmadı'));
      const bar = el('progress');
      bar.max = 100;
      bar.value = progress;
      bar.setAttribute('aria-label', 'Bölüm ilerlemesi');
      card.append(bar);
      card.addEventListener('click', () => onPreview(chapter));
      grid.append(card);
    }
    parent.append(grid);
  }
  function enhance(parent,key,{facts,location,names}){parent.dataset.worldSection=key;parent.querySelectorAll('.world-grid').forEach(g=>{if(g.querySelector('[data-kind="objects"]'))g.classList.add('archive-vitrine');});
    if(key==='timeline'){parent.classList.add('world-timeline');[...parent.querySelectorAll('.world-card')].sort((a,b)=>facts.find(f=>f.id===a.dataset.fact).unlock-facts.find(f=>f.id===b.dataset.fact).unlock).forEach((c,i)=>{c.prepend(el('span','timeline-number',String(i+1).padStart(2,'0')));parent.append(c);});}else parent.classList.remove('world-timeline');
    if(key==='journal'){const h=el('header','journal-cover');h.append(icon('journal'),el('small','','YEDİ SÜRÜ · KEŞİF DEFTERİ'),el('h3','','Yolculuğun izleri'),el('p','',facts.length+' doğrulanmış keşif'));parent.prepend(h);const complete=data.chapters.filter((c,i)=>data.chapters[i+1]?.offset<=location.offset);if(complete.length){const row=el('section','journal-complete');row.append(el('h3','','Tamamlanan bölümler'));complete.forEach(c=>row.append(el('p','',c.title)));parent.append(row);}}
    if(key==='memory')parent.querySelector('.world-grid')?.classList.add('memory-gallery');
    if(key==='desk'){const header=el('section','private-desk-header');header.append(photo('assets/images/cover.webp','Ayın Unuttuğu Kral koleksiyon cildi'),el('small','','KİŞİSEL KİTAP VİTRİNİ'),el('h3','',location.chapter),el('p','',names[api.settings().activeProfile]||'Kişisel görünüm'));const progress=el('progress');progress.max=100;progress.value=location.percent;progress.setAttribute('aria-label','Kitap ilerlemesi');header.append(progress,el('strong','','%'+location.percent));parent.prepend(header);const collection=el('section','desk-collection');for(const f of facts.filter(f=>['objects','symbols'].includes(f.kind)).slice(-3)){const src=asset(f);if(!src)continue;const figure=el('figure');figure.append(photo(src,f.name),el('figcaption','',f.name));collection.append(figure);}if(collection.childElementCount)parent.append(el('h3','world-category','Keşif vitrinin'),collection);}
  }
  window.BookWorld=Object.freeze({icon,quiet,asset,photo,viewer,dispose,decorateCard,navigation,chapterCards,enhance,descriptions,empty,spotlight});
})();
