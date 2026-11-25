const CACHE_NAME = 'cronicas-fractura-v40';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo-espada-grieta.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/bg_campamento.png',
  './assets/bg_creacion_alba.png',
  './assets/bg_creacion_hierro.png',
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
  './assets/heroe_guerrero.png',
  './assets/heroe_mago.png',
  './assets/heroe_arquero.png',
  './assets/heroe_guerrero_hierro.png',
  './assets/heroina_guerrera_hierro.png',
  './assets/heroe_mago_hierro.png',
  './assets/heroina_maga_hierro.png',
  './assets/heroe_arquero_hierro.png',
  './assets/heroina_arquera_hierro.png',
  './assets/heroe_orco.png',
  './assets/heroina_orca.png',
  './assets/heroe_lobo.png',
  './assets/heroina_loba.png',
  './assets/npc_tabernero.png',
  './assets/npc_herrero.png',
  './assets/npc_mercader.png',
  './assets/npc_guardia_alba.png',
  './assets/npc_guardia_hierro.png',
  './assets/prop_muneco.png',
  './assets/enemigo_lobo.png',
  './assets/enemigo_lobo_invernal.png',
  './assets/enemigo_trasgo.png',
  './assets/enemigo_esqueleto.png',
  './assets/enemigo_caballero_vacio.png',
  './assets/enemigo_elemental.png',
  './assets/enemigo_golem_hielo.png',
  './assets/enemigo_mago_sombrio.png',
  './assets/enemigo_nomada.png',
  './assets/enemigo_escorpion.png',
  './assets/tile_cesped.png',
  './assets/tile_adoquin.png',
  './assets/tile_cueva.png',
  './assets/tile_corrupto.png',
  './assets/prop_arbol.png',
  './assets/prop_pino_morado.png',
  './assets/prop_pino_nevado.png',
  './assets/prop_palmera_seca.png',
  './assets/prop_arbol_muerto.png',
  './assets/prop_antorcha.png',
  './assets/prop_antorcha_vacio.png',
  './assets/prop_estandarte_alba.png',
  './assets/prop_estandarte_hierro.png',
  './assets/prop_cristal_vacio.png',
  './assets/prop_altar_jefe.png',
  './assets/prop_yunque.png',
  './assets/prop_barril.png',
  './assets/prop_letrero.png',
  './assets/prop_pilar_ruina.png',
  './assets/prop_estatua_oscura.png',
  './assets/prop_vagoneta.png',
  './assets/prop_caravana.png',
  './assets/prop_cristal_hielo.png',
  './assets/prop_arbusto.png',
  './assets/iconos_equipo.png',
  './assets/ui/emblema_alba.png',
  './assets/ui/emblema_hierro.png',
  './assets/ui/sexo_m.png',
  './assets/ui/sexo_f.png',
  './assets/ui/raza_humano_m.png',
  './assets/ui/raza_humano_f.png',
  './assets/ui/raza_elfo_m.png',
  './assets/ui/raza_elfo_f.png',
  './assets/ui/raza_enano_m.png',
  './assets/ui/raza_enano_f.png',
  './assets/ui/raza_orco_m.png',
  './assets/ui/raza_orco_f.png',
  './assets/ui/raza_lobo_m.png',
  './assets/ui/raza_lobo_f.png',
  './assets/ui/raza_nomada_m.png',
  './assets/ui/raza_nomada_f.png',
  './assets/ui/clase_guerrero_m_alba.png',
  './assets/ui/clase_guerrero_m_hierro.png',
  './assets/ui/clase_guerrero_f_alba.png',
  './assets/ui/clase_guerrero_f_hierro.png',
  './assets/ui/clase_mago_m_alba.png',
  './assets/ui/clase_mago_m_hierro.png',
  './assets/ui/clase_mago_f_alba.png',
  './assets/ui/clase_mago_f_hierro.png',
  './assets/ui/clase_arquero_m_alba.png',
  './assets/ui/clase_arquero_m_hierro.png',
  './assets/ui/clase_arquero_f_alba.png',
  './assets/ui/clase_arquero_f_hierro.png',
  './assets/edificio_taberna.png',
  './assets/edificio_herreria.png',
  './assets/edificio_refugio.png',
  './assets/prop_fuente.png',
  './assets/prop_fuente.gif',
  './assets/prop_fogata.png',
  './assets/prop_fogata.gif',
  './assets/prop_portal.png',
  './assets/prop_portal.gif',
  './assets/prop_cofre.png',
  './assets/prop_cofre.gif',
  './assets/fx_golpe_furia.png',
  './assets/fx_escudo_baluarte.png',
  './assets/fx_destello_arcano.png',
  './assets/fx_zarpazo_enemigo.png',
  './assets/fx_onda_vacio.png',
  './assets/fx_corte_dimensional.png',
  './assets/fx_bendicion_celestial.png',
  './assets/fx_proyectil_hoz.png',
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
