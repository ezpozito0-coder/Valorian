const CACHE_NAME = 'cronicas-fractura-v62';
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
  './assets/montura_caballo.png',
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
  './assets/base_humano_m.png',
  './assets/base_humano_f.png',
  './assets/base_elfo_m.png',
  './assets/base_elfo_f.png',
  './assets/base_enano_m.png',
  './assets/base_enana_f.png',
  './assets/base_orco_m.png',
  './assets/base_orca_f.png',
  './assets/base_lobo_m.png',
  './assets/base_lobo_f.png',
  './assets/base_nomada_m.png',
  './assets/base_nomada_f.png',
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
  './assets/tile_nieve.png',
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
  './assets/map_assets_sheet.png',
  './assets/tiles_terreno_nuevos.png',
  './assets/props_y_estructuras_sheet.png',
  './assets/seamless_tiles_sheet.png',
  './assets/world_upgrades_sheet.png',
  './assets/ui_backdrops_sheet.png',
  './assets/map_borders_sheet.png',
  './assets/iconos_equipo.png',
  './assets/icons/icon_sword.png',
  './assets/icons/icon_fury_strike.png',
  './assets/icons/icon_shield.png',
  './assets/icons/icon_charge.png',
  './assets/icons/icon_staff.png',
  './assets/icons/icon_fireball.png',
  './assets/icons/icon_frost.png',
  './assets/icons/icon_blink.png',
  './assets/icons/icon_bow.png',
  './assets/icons/icon_quick_arrow.png',
  './assets/icons/icon_root_trap.png',
  './assets/icons/icon_arrow_rain.png',
  './assets/icons/icon_potion_hp.png',
  './assets/icons/icon_potion_hp_large.png',
  './assets/icons/icon_potion_mp.png',
  './assets/icons/icon_potion_speed.png',
  './assets/icons/icon_scroll.png',
  './assets/icons/icon_gem_ruby.png',
  './assets/icons/icon_gem_emerald.png',
  './assets/icons/icon_gem_sapphire.png',
  './assets/icons/icon_void_crystal.png',
  './assets/icons/icon_void_shard.png',
  './assets/icons/icon_tools.png',
  './assets/icons/icon_backpack.png',
  './assets/icons/icon_coin.png',
  './assets/icons/icon_skull.png',
  './assets/icons/icon_skull_red.png',
  './assets/icons/icon_helmet.png',
  './assets/icons/icon_frost_helm.png',
  './assets/icons/icon_armor.png',
  './assets/icons/icon_gauntlets.png',
  './assets/icons/icon_gloves.png',
  './assets/icons/icon_boots.png',
  './assets/icons/icon_ring.png',
  './assets/icons/icon_ring_lava.png',
  './assets/icons/icon_necklace.png',
  './assets/icons/icon_necklace_shadow.png',
  './assets/icons/icon_fury_flame.png',
  './assets/icons/icon_greaves.png',
  './assets/icons/icon_wings_angel.png',
  './assets/icons/icon_wings_void.png',
  './assets/icons/icon_mount_warhorse.png',
  './assets/icons/icon_pet_wolf.png',
  './assets/icons/icon_pet_phantom.png',
  './assets/icons/icon_pet_skycat.png',
  './assets/icons/icon_pet_dragon.png',
  './assets/icons/icon_void_greatsword.png',
  './assets/icons/icon_void_staff.png',
  './assets/icons/icon_phoenix_bow.png',
  './assets/icons/icon_paladin_claymore.png',
  './assets/icons/icon_crown_royal.png',
  './assets/icons/icon_heart_ruby.png',
  './assets/icons/icon_star_medal.png',
  './assets/icons/icon_chest_gold.png',
  './assets/ui/emblema_alba.png',
  './assets/ui/emblema_hierro.png',
  './assets/ui/ui_hud_plate.png',
  './assets/ui/ui_minimap_frame.png',
  './assets/ui/ui_slot_stone.png',
  './assets/ui/ui_slot_legendary.png',
  './assets/ui/ui_btn_gold.png',
  './assets/ui/ui_btn_steel.png',
  './assets/ui/ui_window_panel.png',
  './assets/ui/ui_forge_banner.png',
  './assets/ui/ui_skill_card.png',
  './assets/ui/ui_stats_plate.png',
  './assets/ui/cursor_default.png',
  './assets/ui/cursor_pointer.png',
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
  './assets/effects/fx_fireball.png',
  './assets/effects/fx_frost.png',
  './assets/effects/fx_weapon_hit.png',
  './assets/effects/fx_magic_hit.png',
  './assets/effects/fx_shield.png',
  './assets/effects/fx_bluefire.png',
  './assets/effects/fx_void_vortex.png',
  './assets/effects/fx_nature_trap.png',
  './assets/effects/fx_magic_cast.png',
  './assets/effects/fx_slash_01.png',
  './assets/effects/fx_slash_heavy.png',
  './assets/effects/fx_hit_01.png',
  './assets/effects/fx_hit_blue.png',
  './assets/effects/fx_energy_ball.png',
  './assets/effects/fx_energy_impact.png',
  './assets/effects/fx_ice_ball.png',
  './assets/effects/fx_ice_burst.png',
  './css/styles.css',
  './js/app.js',
  './js/wow-actionbar.js',
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

  // Network-first con bypass total de caché HTTP para HTML/CSS/JS/PNG del mismo origen
  event.respondWith(
    fetch(request, { cache: 'no-store' })
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
