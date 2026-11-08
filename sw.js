importScripts('./book-worker-data.js');

const {id, revision, core, allowOffline} = self.BOOK_WORKER_DATA;
const shellCache = id + '-v' + revision;
const imageCache = shellCache + '-images';
const imageLimit = 24;
let imageWrites = Promise.resolve();
const offlinePrefix = id + ':offline:';
const marker = new URL('./offline-manifest.json', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(shellCache).then(cache => cache.addAll(core)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(id+'-v') && key !== shellCache && key !== imageCache).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function cachedFile(request) {
  if (allowOffline) {
    const names = (await caches.keys()).filter(name => name.startsWith(offlinePrefix+revision+':'));
    for (const name of names) {
      const cache = await caches.open(name);
      if (!await cache.match(marker)) continue;
      const file = await cache.match(request,{ignoreSearch:true});
      if (file) return file;
    }
  }
  const shell = await caches.open(shellCache);
  return await shell.match(request,{ignoreSearch:true}) ||
    (request.mode === 'navigate' ? shell.match('./') : null);
}

async function mediaRange(response, range) {
  const syntax = /^bytes=(\d*)-(\d*)$/.exec(range);
  const buffer = await response.arrayBuffer();
  const length = buffer.byteLength;
  const suffix = syntax && !syntax[1] ? Number(syntax[2]) : 0;
  const start = syntax && (suffix ? Math.max(0,length-suffix) : Number(syntax[1]));
  const end = syntax && Math.min(length-1, suffix || !syntax[2] ? length-1 : Number(syntax[2]));
  if (!syntax || !syntax[1] && !suffix || start >= length || end < start) {
    return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+length}});
  }
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Accept-Ranges','bytes');
  headers.set('Content-Range','bytes '+start+'-'+end+'/'+length);
  headers.set('Content-Length',String(end-start+1));
  return new Response(buffer.slice(start,end+1),{status:206,headers});
}

self.addEventListener('fetch',event=>{
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  const range = request.headers.get('range');
  const media = /\.(mp3|m4a|ogg|wav|mp4|webm)$/i.test(new URL(request.url).pathname);
  const image = !range && request.cache !== 'no-store' && request.destination === 'image' &&
    /\/assets\/images\/.+\.webp$/i.test(new URL(request.url).pathname);
  event.respondWith((async () => {
    try {
      if (image) {
        const hit = await caches.match(request, {cacheName: imageCache}).catch(() => null);
        if (hit) return hit;
      }
      const response = await fetch(request);
      if (!media && !range && response.ok && request.cache !== 'no-store') {
        const copy = response.clone();
        if (image) {
          imageWrites = imageWrites.then(async () => {
            const cache = await caches.open(imageCache);
            await cache.put(request, copy);
            const keys = await cache.keys();
            await Promise.all(keys.slice(0, Math.max(0, keys.length - imageLimit)).map(key => cache.delete(key)));
          }).catch(() => {});
          event.waitUntil(imageWrites);
        } else event.waitUntil(caches.open(shellCache).then(cache => cache.put(request,copy)).catch(()=>{}));
      }
      return response;
    } catch {
      const response = await cachedFile(request);
      if (!response) return Response.error();
      return range && media ? mediaRange(response,range) : response;
    }
  })());
});
