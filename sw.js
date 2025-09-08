
const CACHE = 'controle-equipes-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/tabs.js',
  './js/storage.js',
  './js/state.js',
  './js/signature.js',
  './js/ui.js',
  './js/checkout.js',
  './js/returns.js',
  './js/render_return.js',
  './js/openouts.js',
  './js/exports.js',
  './js/exports_bind.js',
  './manifest.json'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request))
  );
});
