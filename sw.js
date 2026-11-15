/// <reference lib="webworker" />
// Offline support: keeps a copy of the app on the phone.
// Bump VERSION whenever index.html changes so phones pick up the new version.
const VERSION = 'daily-hub-v3';
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

sw.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => sw.clients.claim()));
});

// Network first (so updates arrive when online), cached copy when offline.
sw.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html'))
      .then(r => r || Response.error()))
  );
});
