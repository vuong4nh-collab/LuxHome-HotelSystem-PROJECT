const CACHE_NAME = 'luxstay-pwa-v5';
const CACHE_PREFIX = 'luxstay-pwa-';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/luxhome-192.png',
  '/icons/luxhome-512.png',
  '/icons/luxhome-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shellResponse = await fetch('/index.html');
    if (!shellResponse.ok) throw new Error('Failed to precache app shell');

    const shellHtml = await shellResponse.clone().text();
    const assetUrls = [...new Set(shellHtml.match(/\/assets\/[^"'\s]+/g) || [])];
    const cache = await caches.open(CACHE_NAME);

    await cache.put('/index.html', shellResponse);
    await cache.addAll(APP_SHELL_URLS.filter((url) => url !== '/index.html').concat(assetUrls));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            return caches.open(CACHE_NAME)
              .then((cache) => cache.put('/index.html', response.clone()))
              .then(() => response);
          }
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || Response.error())
    );
    return;
  }

  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(request.destination)
    || requestUrl.pathname.startsWith('/assets/');
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      if (response.ok) {
        const responseToCache = response.clone();
        await caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
      }
      return response;
    })
  );
});
