/* KEVITU PWA — app shell only. API and authentication never cached. */
const CACHE='kevitu-shell-live-v1';
const FILES=['./','./index.html','./admin.html','./styles.css','./app.js','./pwa.js','./public-config.js','./admin-config.js','./admin-auth.js','./manifest.webmanifest','./assets/img/brand/kevitu-logo.webp','./assets/img/houses/rumah-merah.webp','./assets/img/houses/rumah-biru.webp','./assets/img/houses/rumah-hijau.webp','./assets/img/houses/rumah-kuning.webp'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kevitu-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));return}
event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)))}return response}).catch(()=>caches.match(req)))});
