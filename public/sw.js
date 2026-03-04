/// <reference lib="webworker" />

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const MAPBOX_CACHE = `mapbox-tiles-${CACHE_VERSION}`;
const MAPBOX_CACHE_LIMIT = 50 * 1024 * 1024; // 50MB

// App shell resources to pre-cache
const APP_SHELL_URLS = ['/', '/offline'];

// Install — pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== MAPBOX_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API responses — never cache
  if (url.pathname.startsWith('/api/')) return;

  // Skip meal photos from Cloudflare Images — rely on CDN Cache-Control: immutable
  if (url.hostname === 'imagedelivery.net') return;

  // Mapbox tiles & styles — cache-first
  if (
    url.hostname.includes('mapbox.com') ||
    url.hostname.includes('tiles.mapbox.com')
  ) {
    event.respondWith(mapboxCacheFirst(request));
    return;
  }

  // App shell (HTML, CSS, JS, fonts) — stale-while-revalidate
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Cache-first strategy for Mapbox tiles with size limit
async function mapboxCacheFirst(request) {
  const cache = await caches.open(MAPBOX_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Check cache size before adding
      const keys = await cache.keys();
      if (keys.length > 500) {
        // Evict oldest entries when approaching limit
        for (let i = 0; i < 50; i++) {
          await cache.delete(keys[i]);
        }
      }
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 503 });
  }
}
