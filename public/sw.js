// public/sw.js
// BUMP THIS when you change the SW so it updates for users.
const CACHE_NAME = 'bookshelf-ai-v3';

const PRECACHE_URLS = [
  '/',               // SPA shell
  '/index.html',
  '/manifest.json',
  '/offline.html',   // offline fallback page
  '/icon-192.png',
  '/icon-512.png'
];

// Install: precache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) =>
          k !== CACHE_NAME && k.startsWith('bookshelf-ai-') ? caches.delete(k) : null
        )
      )
    )
  );
  self.clients.claim();
});

// Fetch:
// - For navigations (user loads/links pages): network-first, fallback to offline.html
// - For other GETs: stale-while-revalidate (serve cache, then update in background)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  // Navigation requests (SPA routes)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Optionally keep an up-to-date copy of the shell
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('/', clone));
          return res;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // All other GETs: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
