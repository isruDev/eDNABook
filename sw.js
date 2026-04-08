const CACHE_NAME = 'edna-logger-v31';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/gps.js',
  './js/scanner.js',
  './js/export.js',
  './js/gps-pill.js',
  './js/photo.js',
  './js/util.js',
  './js/templates.js',
  './js/views/home.js',
  './js/views/project-form.js',
  './js/views/project-dashboard.js',
  './js/views/sample-entry.js',
  './js/views/sample-detail.js',
  './js/views/export-dialog.js',
  './js/views/more-modal.js',
  './js/views/offline-guide.js',
  './js/views/about.js',
  './js/views/settings.js',
  './js/views/changelog.js',
  './lib/idb.js',
  './lib/html5-qrcode.min.js',
  './lib/papaparse.min.js',
  './lib/sql-wasm.js',
  './lib/sql-wasm.wasm',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

/**
 * Handles the service worker install event.
 *
 * Opens the versioned cache and precaches all assets listed in PRECACHE_ASSETS.
 * The install is held pending until all assets are cached (waitUntil).
 *
 * @param {ExtendableEvent} event - The install lifecycle event.
 * @returns {void}
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

/**
 * Handles the service worker activate event.
 *
 * Deletes all caches whose name does not match CACHE_NAME to remove
 * stale assets from previous versions.
 *
 * @param {ExtendableEvent} event - The activate lifecycle event.
 * @returns {void}
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/**
 * Handles fetch events using a cache-first strategy.
 *
 * Checks the cache for a matching response. On a cache hit the cached
 * response is returned immediately. On a cache miss the request is fetched
 * from the network, the response clone is stored in the cache for future
 * requests, and the live response is returned. If both the cache and network
 * are unavailable the browser's default error handling takes over.
 *
 * Only GET requests are intercepted; non-GET requests are passed through
 * to the network without caching.
 *
 * @param {FetchEvent} event - The fetch lifecycle event.
 * @returns {void}
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response && response.status === 200) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        // Network unavailable and asset not in cache.
        // All critical assets are precached, so this path should not be hit
        // during normal offline operation.
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })
  );
});
