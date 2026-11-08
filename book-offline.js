(() => {
  'use strict';
  const panel = document.getElementById('hub-page-reading');
  if (!panel || !window.isSecureContext || !('serviceWorker' in navigator) || !window.caches) return;
  let manifest;
  let prefix;
  let installed = null;
  let controller = null;

  function button(text, run) {
    const node = document.createElement('button');
    node.type='button';
    node.className='hub-button';
    node.textContent=text;
    node.addEventListener('click',run);
    return node;
  }
  function format(bytes) {
    return new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1}).format(bytes/1048576) + ' MB';
  }
  const section = document.createElement('section');
  section.className='setting-group book-offline';
  section.hidden=true;
  const heading = document.createElement('h3');
  heading.className='hub-group-title';
  heading.textContent='Çevrimdışı kitap';
  const status = document.createElement('p');
  status.className='hub-hint';
  status.setAttribute('role','status');
  const progress = document.createElement('progress');
  progress.setAttribute('aria-label','Çevrimdışı kitap indirme');
  progress.hidden=true;
  const download = button('Bu kitabı indir',saveBook);
  download.id='book-offline-download';
  const cancel = button('İndirmeyi iptal et',()=>controller?.abort());
  cancel.hidden=true;
  const remove = button('Çevrimdışı kopyayı kaldır',removeBook);
  remove.id='book-offline-remove';
  remove.hidden=true;
  section.append(heading,status,progress,download,cancel,remove);
  panel.append(section);
  const marker = new URL('./offline-manifest.json',location.href).href;

  async function completeCaches() {
    const all = (await caches.keys()).filter(name=>name.startsWith(prefix));
    const ready = [];
    for (const name of all) {
      const cache = await caches.open(name);
      if (await cache.match(marker)) ready.push(name);
    }
    return ready;
  }
  async function refresh() {
    if (!manifest || controller) return;
    const ready=await completeCaches();
    installed=ready.find(name=>name.startsWith(prefix+manifest.revision+':')) || null;
    download.hidden=Boolean(installed);
    remove.hidden=!ready.length;
    download.disabled=!navigator.onLine;
    status.textContent=installed ? format(manifest.bytes)+' bu tarayıcıda çevrimdışı okumaya hazır.'
      : 'Metin, çizimler ve bu kitabın medya dosyaları için ' + format(manifest.bytes) + ' depolama.';
  }

  async function saveBook() {
    if (!manifest || controller || !navigator.onLine) return;
    controller=new AbortController();
    const {signal}=controller;
    const name=prefix+manifest.revision+':'+(globalThis.crypto?.randomUUID?.() || Date.now());
    download.disabled=true;
    cancel.hidden=false;
    remove.hidden=true;
    progress.hidden=false;
    progress.max=manifest.bytes;
    progress.value=0;
    let complete=false;
    let failure='';
    try {
      await navigator.serviceWorker.ready;
      if (signal.aborted) throw new DOMException('İptal edildi','AbortError');
      const previous=await completeCaches();
      const cache=await caches.open(name);
      let index=0, bytes=0;
      async function saveNext() {
        while(index<manifest.files.length && !signal.aborted) {
          const file=manifest.files[index++];
          const url=new URL(file.url,location.href);
          if (url.origin!==location.origin) throw new Error('Yayın kapsamı dışında dosya.');
          const response=await fetch(url,{cache:'no-store',signal});
          if (!response.ok || new URL(response.url).origin!==location.origin) throw new Error('İndirme başarısız.');
          await cache.put(url,response);
          bytes+=file.bytes;
          progress.value=bytes;
          status.textContent=format(bytes)+' / '+format(manifest.bytes);
        }
      }
      const results=await Promise.allSettled(Array.from({length:4},()=>saveNext().catch(error=>{controller.abort();throw error;})));
      if (signal.aborted || results.some(result=>result.status==='rejected')) throw results.find(result=>result.status==='rejected')?.reason || new DOMException('İptal edildi','AbortError');
      await cache.put(marker,new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
      complete=true;
      await Promise.allSettled(previous.map(old=>caches.delete(old)));
    } catch (error) {
      failure=error.name==='AbortError'?'İndirme iptal edildi.':'İndirme tamamlanamadı. Bağlantıyı ve boş alanı kontrol et.';
    } finally {
      if (!complete) await caches.delete(name).catch(()=>{});
      controller=null;
      progress.hidden=true;
      cancel.hidden=true;
      await refresh().catch(()=>{});
      if (failure) status.textContent=failure;
    }
  }
  async function removeBook() {
    if (controller) return;
    remove.disabled=true;
    try {
      await Promise.all((await completeCaches()).map(name=>caches.delete(name)));
      await refresh();
      status.textContent='Çevrimdışı kopya kaldırıldı.';
    } catch {status.textContent='Kopya kaldırılamadı.';}
    finally {remove.disabled=false;}
  }

  fetch(marker).then(response=>response.ok ? response.json() : null).then(data=>{
    if (!data?.enabled || data.id!==String(window.BOOK_PLAN?.storageId) || !Array.isArray(data.files) || !data.bytes) return;
    manifest=data;
    prefix=data.id+':offline:';
    section.hidden=false;
    return refresh();
  }).catch(()=>{});
  for(const event of ['online','offline']) window.addEventListener(event,()=>void refresh().catch(()=>{}));
  document.addEventListener('book:panel-open',event=>{if(event.detail==='settings')void refresh().catch(()=>{});});
})();
