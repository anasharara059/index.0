// INDEX — Service Worker
// Bump this version whenever index.html (or any cached asset) changes,
// so returning users automatically get the fresh copy.
const CACHE_VERSION = 'index-app-v5';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Cache each URL individually so one failed (e.g. offline first install,
      // or a blocked CDN) doesn't prevent the rest from being cached.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Skip caching', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          // Keep the cache fresh in the background for next time.
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached: fall back to the main page for navigations
          // so the app shell still loads instead of showing a browser error.
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      // Cache-first for instant loads; network still updates the cache.
      return cachedResponse || networkFetch;
    })
  );
});
