const CACHE_NAME = 'cronicas-fractura-v16';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo-espada-grieta.svg',
  './assets/bg_campamento.png',
  './assets/bg_creacion.png',
  './assets/mapa_valoria.png',
  './assets/jefe_malakor.png',
  './assets/jefe_ignis.png',
  './assets/jefe_boreas.png',
  './assets/jefe_vaelor.png',
  './assets/mascota_lobo.png',
  './assets/mascota_fantasma.png',
  './assets/mascota_gato.png',
  './assets/mascota_dragon.png',
  './assets/heroina_guerrera.png',
  './assets/heroina_maga.png',
  './assets/heroina_arquera.png',
  './assets/tile_cesped.png',
  './assets/tile_adoquin.png',
  './assets/prop_arbol.png',
  './assets/iconos_equipo.png',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/storage.js',
  './js/legal.js',
  './js/audio.js',
  './js/game/assetLoader.js',
  './js/game/data.js',
  './js/game/pixelArt.js',
  './js/game/textures.js',
  './js/game/sprites.js',
  './js/game/world.js',
  './js/game/preview.js',
  './js/game/engine.js',
  './js/game/hud.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Forzar descarga fresca desde la red (bypass HTTP cache del navegador) al instalar nueva versión
      await Promise.allSettled(
        APP_ASSETS.map(async (assetUrl) => {
          const req = new Request(assetUrl, { cache: 'reload' });
          const res = await fetch(req);
          if (res && res.ok) {
            await cache.put(assetUrl, res);
          }
        })
      );
    })
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.includes('/api/')) {
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

  // Network-first con bypass de caché HTTP vieja para HTML/CSS/JS/PNG del mismo origen
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
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
