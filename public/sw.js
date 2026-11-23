const CACHE_NAME = 'cronicas-fractura-v8';
const APP_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logo-espada-grieta.svg',
  '/css/styles.css',
  '/js/app.js',
  '/js/router.js',
  '/js/storage.js',
  '/js/legal.js',
  '/js/audio.js',
  '/js/game/data.js',
  '/js/game/textures.js',
  '/js/game/sprites.js',
  '/js/game/world.js',
  '/js/game/preview.js',
  '/js/game/engine.js',
  '/js/game/hud.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ offline: true, error: 'Sin conexión a internet.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
      )
    );
    return;
  }

  // Network-first con respaldo en caché para evitar mezclar versiones de módulos JS al actualizar
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
