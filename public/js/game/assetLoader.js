/**
 * assetLoader.js
 * Precarga asíncrona de los 18 assets Pixel Art (./assets/...) con recorte inteligente
 * de fondo blanco mediante BFS Flood-Fill desde las 4 esquinas/bordes y grilla 4x4 de iconos.
 */

export const ASSET_MANIFEST = {
  // Fondos (4)
  bg_campamento: { path: './assets/bg_campamento.png', floodFill: false },
  bg_creacion_alba: { path: './assets/bg_creacion_alba.png', floodFill: false },
  bg_creacion_hierro: { path: './assets/bg_creacion_hierro.png', floodFill: false },
  mapa_valoria: { path: './assets/mapa_valoria.png', floodFill: false },

  // Jefes (4)
  jefe_malakor: { path: './assets/jefe_malakor.png', floodFill: true },
  jefe_ignis: { path: './assets/jefe_ignis.png', floodFill: true },
  jefe_boreas: { path: './assets/jefe_boreas.png', floodFill: true },
  jefe_vaelor: { path: './assets/jefe_vaelor.png', floodFill: true },

  //Mascotas (4) + Montura de Guerra Blindada
  mascota_lobo: { path: './assets/mascota_lobo.png', floodFill: true },
  mascota_fantasma: { path: './assets/mascota_fantasma.png', floodFill: true },
  mascota_gato: { path: './assets/mascota_gato.png', floodFill: true },
  mascota_dragon: { path: './assets/mascota_dragon.png', floodFill: true },
  montura_caballo: { path: './assets/montura_caballo.png', floodFill: false },

  // Heroínas Femeninas (3)
  heroina_guerrera: { path: './assets/heroina_guerrera.png', floodFill: true },
  heroina_maga: { path: './assets/heroina_maga.png', floodFill: true },
  heroina_arquera: { path: './assets/heroina_arquera.png', floodFill: true },

  // Héroes Masculinos (3)
  heroe_guerrero: { path: './assets/heroe_guerrero.png', floodFill: true },
  heroe_mago: { path: './assets/heroe_mago.png', floodFill: true },
  heroe_arquero: { path: './assets/heroe_arquero.png', floodFill: true },

  // Hojas de Cuerpo Base sin Armadura en Cuadrícula 3x5 (3 ángulos x 5 acciones) (10)
  base_humano_m: { path: './assets/base_humano_m.png', grid3x5: true },
  base_humano_f: { path: './assets/base_humano_f.png', grid3x5: true },
  base_elfo_m: { path: './assets/base_elfo_m.png', grid3x5: true },
  base_elfo_f: { path: './assets/base_elfo_f.png', grid3x5: true },
  base_enano_m: { path: './assets/base_enano_m.png', grid3x5: true },
  base_enana_f: { path: './assets/base_enana_f.png', grid3x5: true },
  base_orco_m: { path: './assets/base_orco_m.png', grid3x5: true },
  base_orca_f: { path: './assets/base_orca_f.png', grid3x5: true },
  base_lobo_m: { path: './assets/base_lobo_m.png', grid3x5: true },
  base_lobo_f: { path: './assets/base_lobo_f.png', grid3x5: true },
  base_nomada_m: { path: './assets/base_nomada_m.png', grid3x5: true },
  base_nomada_f: { path: './assets/base_nomada_f.png', grid3x5: true },

  // Variantes de Bando (Los Clanes de Hierro) y Razas (Orco, Lobo Guerrero) en Spritesheets de 4 Cuadros (10)
  heroe_guerrero_hierro: { path: './assets/heroe_guerrero_hierro.png', floodFill: false },
  heroina_guerrera_hierro: { path: './assets/heroina_guerrera_hierro.png', floodFill: false },
  heroe_mago_hierro: { path: './assets/heroe_mago_hierro.png', floodFill: false },
  heroina_maga_hierro: { path: './assets/heroina_maga_hierro.png', floodFill: false },
  heroe_arquero_hierro: { path: './assets/heroe_arquero_hierro.png', floodFill: false },
  heroina_arquera_hierro: { path: './assets/heroina_arquera_hierro.png', floodFill: false },
  heroe_orco: { path: './assets/heroe_orco.png', floodFill: false },
  heroina_orca: { path: './assets/heroina_orca.png', floodFill: false },
  heroe_lobo: { path: './assets/heroe_lobo.png', floodFill: false },
  heroina_loba: { path: './assets/heroina_loba.png', floodFill: false },

  // NPCs y Entrenamiento en Villa Alba / Campamento Hierro / Desierto (6)
  npc_tabernero: { path: './assets/npc_tabernero.png', floodFill: true },
  npc_herrero: { path: './assets/npc_herrero.png', floodFill: true },
  npc_mercader: { path: './assets/npc_mercader.png', floodFill: false },
  npc_guardia_alba: { path: './assets/npc_guardia_alba.png', floodFill: false },
  npc_guardia_hierro: { path: './assets/npc_guardia_hierro.png', floodFill: false },
  prop_muneco: { path: './assets/prop_muneco.png', floodFill: true },

  // Enemigos Comunes y Regionales en Spritesheets de 4 Cuadros (10)
  enemigo_lobo: { path: './assets/enemigo_lobo.png', floodFill: true },
  enemigo_lobo_invernal: { path: './assets/enemigo_lobo_invernal.png', floodFill: false },
  enemigo_trasgo: { path: './assets/enemigo_trasgo.png', floodFill: true },
  enemigo_esqueleto: { path: './assets/enemigo_esqueleto.png', floodFill: true },
  enemigo_caballero_vacio: { path: './assets/enemigo_caballero_vacio.png', floodFill: false },
  enemigo_elemental: { path: './assets/enemigo_elemental.png', floodFill: true },
  enemigo_golem_hielo: { path: './assets/enemigo_golem_hielo.png', floodFill: false },
  enemigo_mago_sombrio: { path: './assets/enemigo_mago_sombrio.png', floodFill: false },
  enemigo_nomada: { path: './assets/enemigo_nomada.png', floodFill: false },
  enemigo_escorpion: { path: './assets/enemigo_escorpion.png', floodFill: false },

  // Entorno e Iconos (4)
  tile_cesped: { path: './assets/tile_cesped.png', floodFill: false },
  tile_adoquin: { path: './assets/tile_adoquin.png', floodFill: false },
  tile_cueva: { path: './assets/tile_cueva.png', floodFill: false },
  tile_nieve: { path: './assets/tile_nieve.png', floodFill: false },
  tile_corrupto: { path: './assets/tile_corrupto.png', floodFill: false },
  prop_arbol: { path: './assets/prop_arbol.png', floodFill: true },
  prop_pino_morado: { path: './assets/prop_pino_morado.png', floodFill: false },
  iconos_equipo: { path: './assets/iconos_equipo.png', floodFill: false },
  iconos_habilidades: { path: './assets/iconos_habilidades.png', floodFill: false },

  // Edificios Medievales Ilustrados (3)
  edificio_taberna: { path: './assets/edificio_taberna.png', floodFill: false },
  edificio_herreria: { path: './assets/edificio_herreria.png', floodFill: false },
  edificio_refugio: { path: './assets/edificio_refugio.png', floodFill: false },

  // Props Animados en Spritesheets de 4 Cuadros y GIFs (10)
  prop_fuente: { path: './assets/prop_fuente.png', floodFill: false },
  prop_fogata: { path: './assets/prop_fogata.png', floodFill: false },
  prop_portal: { path: './assets/prop_portal.png', floodFill: false },
  prop_cofre: { path: './assets/prop_cofre.png', floodFill: false },
  prop_antorcha: { path: './assets/prop_antorcha.png', floodFill: false },
  prop_antorcha_vacio: { path: './assets/prop_antorcha_vacio.png', floodFill: false },
  prop_estandarte_alba: { path: './assets/prop_estandarte_alba.png', floodFill: false },
  prop_estandarte_hierro: { path: './assets/prop_estandarte_hierro.png', floodFill: false },
  prop_cristal_vacio: { path: './assets/prop_cristal_vacio.png', floodFill: true },
  prop_altar_jefe: { path: './assets/prop_altar_jefe.png', floodFill: true },

  // Árboles y Props de Escenarios Pixel Art (12)
  prop_pino_nevado: { path: './assets/prop_pino_nevado.png', floodFill: false },
  prop_palmera_seca: { path: './assets/prop_palmera_seca.png', floodFill: false },
  prop_arbol_muerto: { path: './assets/prop_arbol_muerto.png', floodFill: false },
  prop_yunque: { path: './assets/prop_yunque.png', floodFill: false },
  prop_barril: { path: './assets/prop_barril.png', floodFill: false },
  prop_letrero: { path: './assets/prop_letrero.png', floodFill: false },
  prop_pilar_ruina: { path: './assets/prop_pilar_ruina.png', floodFill: false },
  prop_estatua_oscura: { path: './assets/prop_estatua_oscura.png', floodFill: false },
  prop_vagoneta: { path: './assets/prop_vagoneta.png', floodFill: false },
  prop_caravana: { path: './assets/prop_caravana.png', floodFill: false },
  prop_cristal_hielo: { path: './assets/prop_cristal_hielo.png', floodFill: false },
  prop_arbusto: { path: './assets/prop_arbusto.png', floodFill: false },

  // Efectos Visuales de Luz, Sombras, Movimiento, Clima y Combate en 4 Cuadros (34)
  fx_halo_calido: { path: './assets/fx_halo_calido.png', floodFill: false },
  fx_halo_vacio: { path: './assets/fx_halo_vacio.png', floodFill: false },
  fx_halo_jugador: { path: './assets/fx_halo_jugador.png', floodFill: false },
  fx_rayos_luz: { path: './assets/fx_rayos_luz.png', floodFill: false },
  fx_aura_legendaria: { path: './assets/fx_aura_legendaria.png', floodFill: false },
  fx_aura_furia: { path: './assets/fx_aura_furia.png', floodFill: false },
  fx_sombra_entidad: { path: './assets/fx_sombra_entidad.png', floodFill: false },
  fx_sombra_jefe: { path: './assets/fx_sombra_jefe.png', floodFill: false },
  fx_polvo_pasos: { path: './assets/fx_polvo_pasos.png', floodFill: false },
  fx_estela_dash: { path: './assets/fx_estela_dash.png', floodFill: false },
  fx_ondas_agua: { path: './assets/fx_ondas_agua.png', floodFill: false },
  fx_clima_mariposas: { path: './assets/fx_clima_mariposas.png', floodFill: false },
  fx_clima_ceniza: { path: './assets/fx_clima_ceniza.png', floodFill: false },
  fx_clima_nieve: { path: './assets/fx_clima_nieve.png', floodFill: false },
  fx_clima_vacio: { path: './assets/fx_clima_vacio.png', floodFill: false },
  fx_tajo_espada: { path: './assets/fx_tajo_espada.png', floodFill: false },
  fx_golpe_furia: { path: './assets/fx_golpe_furia.png', floodFill: false },
  fx_escudo_baluarte: { path: './assets/fx_escudo_baluarte.png', floodFill: false },
  fx_destello_arcano: { path: './assets/fx_destello_arcano.png', floodFill: false },
  fx_zarpazo_enemigo: { path: './assets/fx_zarpazo_enemigo.png', floodFill: false },
  fx_onda_vacio: { path: './assets/fx_onda_vacio.png', floodFill: false },
  fx_corte_dimensional: { path: './assets/fx_corte_dimensional.png', floodFill: false },
  fx_bendicion_celestial: { path: './assets/fx_bendicion_celestial.png', floodFill: false },
  fx_proyectil_hoz: { path: './assets/fx_proyectil_hoz.png', floodFill: false },
  fx_proyectil_fuego: { path: './assets/fx_proyectil_fuego.png', floodFill: false },
  fx_proyectil_arcano: { path: './assets/fx_proyectil_arcano.png', floodFill: false },
  fx_proyectil_vacio: { path: './assets/fx_proyectil_vacio.png', floodFill: false },
  fx_proyectil_flecha: { path: './assets/fx_proyectil_flecha.png', floodFill: false },
  fx_explosion_fuego: { path: './assets/fx_explosion_fuego.png', floodFill: false },
  fx_nova_escarcha: { path: './assets/fx_nova_escarcha.png', floodFill: false },
  fx_trampa_raices: { path: './assets/fx_trampa_raices.png', floodFill: false },
  fx_lluvia_flechas: { path: './assets/fx_lluvia_flechas.png', floodFill: false },
  fx_impacto_golpe: { path: './assets/fx_impacto_golpe.png', floodFill: false },
  fx_level_up: { path: './assets/fx_level_up.png', floodFill: false },

  // Iconos Pixel Art individuales 32x32 (public/assets/icons/) (38)
  icon_sword: { path: './assets/icons/icon_sword.png', floodFill: false },
  icon_fury_strike: { path: './assets/icons/icon_fury_strike.png', floodFill: false },
  icon_shield: { path: './assets/icons/icon_shield.png', floodFill: false },
  icon_charge: { path: './assets/icons/icon_charge.png', floodFill: false },
  icon_staff: { path: './assets/icons/icon_staff.png', floodFill: false },
  icon_fireball: { path: './assets/icons/icon_fireball.png', floodFill: false },
  icon_frost: { path: './assets/icons/icon_frost.png', floodFill: false },
  icon_blink: { path: './assets/icons/icon_blink.png', floodFill: false },
  icon_bow: { path: './assets/icons/icon_bow.png', floodFill: false },
  icon_quick_arrow: { path: './assets/icons/icon_quick_arrow.png', floodFill: false },
  icon_root_trap: { path: './assets/icons/icon_root_trap.png', floodFill: false },
  icon_arrow_rain: { path: './assets/icons/icon_arrow_rain.png', floodFill: false },
  icon_potion_hp: { path: './assets/icons/icon_potion_hp.png', floodFill: false },
  icon_potion_hp_large: { path: './assets/icons/icon_potion_hp_large.png', floodFill: false },
  icon_potion_mp: { path: './assets/icons/icon_potion_mp.png', floodFill: false },
  icon_potion_speed: { path: './assets/icons/icon_potion_speed.png', floodFill: false },
  icon_scroll: { path: './assets/icons/icon_scroll.png', floodFill: false },
  icon_gem_ruby: { path: './assets/icons/icon_gem_ruby.png', floodFill: false },
  icon_gem_emerald: { path: './assets/icons/icon_gem_emerald.png', floodFill: false },
  icon_gem_sapphire: { path: './assets/icons/icon_gem_sapphire.png', floodFill: false },
  icon_void_crystal: { path: './assets/icons/icon_void_crystal.png', floodFill: false },
  icon_void_shard: { path: './assets/icons/icon_void_shard.png', floodFill: false },
  icon_tools: { path: './assets/icons/icon_tools.png', floodFill: false },
  icon_backpack: { path: './assets/icons/icon_backpack.png', floodFill: false },
  icon_coin: { path: './assets/icons/icon_coin.png', floodFill: false },
  icon_skull: { path: './assets/icons/icon_skull.png', floodFill: false },
  icon_skull_red: { path: './assets/icons/icon_skull_red.png', floodFill: false },
  icon_helmet: { path: './assets/icons/icon_helmet.png', floodFill: false },
  icon_frost_helm: { path: './assets/icons/icon_frost_helm.png', floodFill: false },
  icon_armor: { path: './assets/icons/icon_armor.png', floodFill: false },
  icon_gauntlets: { path: './assets/icons/icon_gauntlets.png', floodFill: false },
  icon_gloves: { path: './assets/icons/icon_gloves.png', floodFill: false },
  icon_boots: { path: './assets/icons/icon_boots.png', floodFill: false },
  icon_ring: { path: './assets/icons/icon_ring.png', floodFill: false },
  icon_ring_lava: { path: './assets/icons/icon_ring_lava.png', floodFill: false },
  icon_necklace: { path: './assets/icons/icon_necklace.png', floodFill: false },
  icon_necklace_shadow: { path: './assets/icons/icon_necklace_shadow.png', floodFill: false },
  icon_fury_flame: { path: './assets/icons/icon_fury_flame.png', floodFill: false },
  icon_greaves: { path: './assets/icons/icon_greaves.png', floodFill: false },
  icon_wings_angel: { path: './assets/icons/icon_wings_angel.png', floodFill: false },
  icon_wings_void: { path: './assets/icons/icon_wings_void.png', floodFill: false },
  icon_mount_warhorse: { path: './assets/icons/icon_mount_warhorse.png', floodFill: false },
  icon_pet_wolf: { path: './assets/icons/icon_pet_wolf.png', floodFill: false },
  icon_pet_phantom: { path: './assets/icons/icon_pet_phantom.png', floodFill: false },
  icon_pet_skycat: { path: './assets/icons/icon_pet_skycat.png', floodFill: false },
  icon_pet_dragon: { path: './assets/icons/icon_pet_dragon.png', floodFill: false },
  icon_void_greatsword: { path: './assets/icons/icon_void_greatsword.png', floodFill: false },
  icon_void_staff: { path: './assets/icons/icon_void_staff.png', floodFill: false },
  icon_phoenix_bow: { path: './assets/icons/icon_phoenix_bow.png', floodFill: false },
  icon_paladin_claymore: { path: './assets/icons/icon_paladin_claymore.png', floodFill: false },
  icon_crown_royal: { path: './assets/icons/icon_crown_royal.png', floodFill: false },
  icon_heart_ruby: { path: './assets/icons/icon_heart_ruby.png', floodFill: false },
  icon_star_medal: { path: './assets/icons/icon_star_medal.png', floodFill: false },
  icon_chest_gold: { path: './assets/icons/icon_chest_gold.png', floodFill: false },

  // Hoja 4x4 (16 iconos/sprites 16-bit Nano Banana sobre fondo magenta #FF00FF): Emociones, Herramientas, Disfraces y Portal de Hielo
  ai_systems_sheet: { path: './assets/ai_systems_sheet.png', floodFill: false, magentaKey: true },

  // Spritesheets de Efectos en Cuadrícula 100x100px (public/assets/effects/) (9)
  fx_fireball: { path: './assets/effects/fx_fireball.png', floodFill: false, gridCols: 8, gridRows: 8, frameCount: 61 },
  fx_frost: { path: './assets/effects/fx_frost.png', floodFill: false, gridCols: 10, gridRows: 10, frameCount: 86 },
  fx_weapon_hit: { path: './assets/effects/fx_weapon_hit.png', floodFill: false, gridCols: 6, gridRows: 6, frameCount: 31 },
  fx_magic_hit: { path: './assets/effects/fx_magic_hit.png', floodFill: false, gridCols: 7, gridRows: 7, frameCount: 41 },
  fx_shield: { path: './assets/effects/fx_shield.png', floodFill: false, gridCols: 8, gridRows: 8, frameCount: 61 },
  fx_bluefire: { path: './assets/effects/fx_bluefire.png', floodFill: false, gridCols: 8, gridRows: 8, frameCount: 61 },
  fx_void_vortex: { path: './assets/effects/fx_void_vortex.png', floodFill: false, gridCols: 8, gridRows: 8, frameCount: 61 },
  fx_nature_trap: { path: './assets/effects/fx_nature_trap.png', floodFill: false, gridCols: 10, gridRows: 10, frameCount: 91 },
  fx_magic_cast: { path: './assets/effects/fx_magic_cast.png', floodFill: false, gridCols: 9, gridRows: 9, frameCount: 75 },

  // Efectos de Smear VFX 01, Hit Effect 01 y Animation Pack (public/assets/effects/) (8)
  fx_slash_01: { path: './assets/effects/fx_slash_01.png', floodFill: false, gridCols: 5, gridRows: 1, frameCount: 5 },
  fx_slash_heavy: { path: './assets/effects/fx_slash_heavy.png', floodFill: false, gridCols: 5, gridRows: 1, frameCount: 5 },
  fx_hit_01: { path: './assets/effects/fx_hit_01.png', floodFill: false, gridCols: 7, gridRows: 1, frameCount: 7 },
  fx_hit_blue: { path: './assets/effects/fx_hit_blue.png', floodFill: false, gridCols: 7, gridRows: 1, frameCount: 7 },
  fx_energy_ball: { path: './assets/effects/fx_energy_ball.png', floodFill: false, gridCols: 9, gridRows: 1, frameCount: 9 },
  fx_energy_impact: { path: './assets/effects/fx_energy_impact.png', floodFill: false, gridCols: 1, gridRows: 8, frameCount: 8 },
  fx_ice_ball: { path: './assets/effects/fx_ice_ball.png', floodFill: false, gridCols: 1, gridRows: 4, frameCount: 4 },
  fx_ice_burst: { path: './assets/effects/fx_ice_burst.png', floodFill: false, gridCols: 1, gridRows: 7, frameCount: 7 },

  // Hoja unificada de Recursos de Mapas (Transiciones, Doodads, Cliffs y Animaciones en Bucle)
  map_assets_sheet: { path: './assets/map_assets_sheet.png', floodFill: false },

  // Hoja 5x3 de Terrenos Base y Transiciones (Nieve, Arena, Lava, Lago Corrupto y Agua Clara) (15 tiles)
  tiles_terreno_nuevos: { path: './assets/tiles_terreno_nuevos.png', floodFill: false },

  // Megaspritesheet de Recursos, Objetos, Puentes, Bordes, Lugares y Jefes (3 Paquetes, 1024x764)
  props_y_estructuras_sheet: { path: './assets/props_y_estructuras_sheet.png', floodFill: false },

  // Hoja Seamless de Terrenos y Estructuras Continuas (Lava, Lago Corrupto, Hielo, Alfombra Real y Río con Orillas)
  seamless_tiles_sheet: { path: './assets/seamless_tiles_sheet.png', floodFill: false },

  // Hoja Maestra de Mejoras Visuales (Puentes Verticales, Rieles, Portal Arco, Fuente Leones, Armero, Lagos Orgánicos, Arenas de Jefes y Monumentos)
  world_upgrades_sheet: { path: './assets/world_upgrades_sheet.png', floodFill: false },

  // Hoja de 11 Escenarios 16-bit para Ventanas de Personaje, Montura, Mascotas y Jefes
  ui_backdrops_sheet: { path: './assets/ui_backdrops_sheet.png', floodFill: false },

  // Hoja 9-Slice de Marcos Perimetrales por Bioma (4 lados N/S/E/O + 4 Esquinas para Bosque, Cueva, Desierto y Nieve)
  map_borders_sheet: { path: './assets/map_borders_sheet.png', floodFill: false }
};

// Coordenadas 9-Slice (x, y, w, h + hueco interior hx, hy, hw, hh) de public/assets/map_borders_sheet.png (1330x1415)
export const MAP_BORDERS_ATLAS = {
  bosque: { x: 4, y: 4, w: 596, h: 665, hx: 106, hy: 152, hw: 383, hh: 384 },
  cueva: { x: 665, y: 4, w: 574, h: 642, hx: 95, hy: 129, hw: 383, hh: 386 },
  desierto: { x: 4, y: 677, w: 653, h: 726, hx: 166, hy: 195, hw: 320, hh: 338 },
  nieve: { x: 665, y: 677, w: 653, h: 726, hx: 165, hy: 197, hw: 321, hh: 337 }
};

// Coordenadas exactas de recorte de public/assets/ui_backdrops_sheet.png (1200x896)
export const UI_BACKDROPS_ATLAS = {
  stage_alba: { x: 26, y: 28, w: 366, h: 258 },
  stage_hierro: { x: 417, y: 28, w: 366, h: 258 },
  stage_establo: { x: 808, y: 28, w: 366, h: 258 },
  pet_lobo_blanco: { x: 75, y: 316, w: 234, h: 264 },
  pet_fantasma_hoz: { x: 351, y: 316, w: 235, h: 264 },
  pet_gato_volador: { x: 614, y: 316, w: 235, h: 264 },
  pet_dragon_negro: { x: 891, y: 315, w: 234, h: 265 },
  boss_malakor: { x: 75, y: 610, w: 234, h: 257 },
  boss_ignis: { x: 351, y: 610, w: 236, h: 257 },
  boss_boreas: { x: 614, y: 610, w: 235, h: 257 },
  boss_vaelor: { x: 891, y: 610, w: 234, h: 257 }
};

// Coordenadas exactas de recorte de public/assets/world_upgrades_sheet.png (1400x1599)
export const WORLD_UPGRADES_ATLAS = {
  puente_madera_v: { x: 8, y: 8, w: 175, h: 331 },
  puente_obsidiana_v: { x: 191, y: 8, w: 177, h: 295 },
  riel_mina: { x: 376, y: 8, w: 422, h: 77 },
  portal_arco: { x: 806, y: 8, w: 188, h: 202 },
  fuente_leones: { x: 1002, y: 8, w: 239, h: 202 },
  armero_entrenamiento: { x: 8, y: 347, w: 300, h: 162 },
  carreta_desierto: { x: 316, y: 347, w: 232, h: 185 },
  rocas_desierto: { x: 556, y: 347, w: 170, h: 176 },
  arbusto_seco: { x: 734, y: 347, w: 78, h: 73 },
  lago_lava_organico: { x: 820, y: 347, w: 232, h: 157 },
  lago_corrupto_organico: { x: 1060, y: 347, w: 231, h: 165 },
  arena_malakor: { x: 8, y: 540, w: 405, h: 240 },
  arena_ignis: { x: 421, y: 540, w: 431, h: 258 },
  arena_boreas: { x: 860, y: 540, w: 418, h: 256 },
  arena_vaelor: { x: 8, y: 806, w: 447, h: 262 },
  oasis_desierto: { x: 465, y: 806, w: 352, h: 366 },
  pilar_trono_vacio: { x: 825, y: 806, w: 180, h: 396 },
  totem_hielo: { x: 1013, y: 806, w: 346, h: 405 },
  pozo_aldea: { x: 8, y: 1219, w: 264, h: 363 },
  farola_aldea: { x: 280, y: 1219, w: 180, h: 372 },
  costillar_dragon: { x: 468, y: 1219, w: 358, h: 291 }
};

// Coordenadas exactas de recorte de public/assets/seamless_tiles_sheet.png (1024x571)
export const SEAMLESS_TILES_ATLAS = {
  lava_crater: { x: 45, y: 18, w: 268, h: 262 },
  corrupt_pond: { x: 379, y: 18, w: 266, h: 263 },
  ice_full: { x: 712, y: 18, w: 266, h: 263 },
  ice_seamless: { x: 750, y: 54, w: 190, h: 190 },
  alfombra_continua: { x: 92, y: 290, w: 163, h: 268 },
  rio_cesped: { x: 378, y: 326, w: 600, h: 204 }
};

// Coordenadas de recorte (x, y, w, h) de public/assets/props_y_estructuras_sheet.png (1024x764)
export const PROPS_STRUCTURES_ATLAS = {
  // PAQUETE 1 — Reemplazos de cuadros de colores
  veta_rubi: { x: 20, y: 38, w: 64, h: 64 },
  veta_esmeralda: { x: 91, y: 38, w: 64, h: 64 },
  veta_zafiro: { x: 162, y: 39, w: 63, h: 62 },
  bolsa_botin: { x: 266, y: 46, w: 58, h: 54 },
  cofre_botin: { x: 341, y: 46, w: 55, h: 54 },
  cerca_h_larga: { x: 438, y: 38, w: 174, h: 63 },
  cerca_h_corta: { x: 30, y: 120, w: 102, h: 60 },
  cerca_v: { x: 159, y: 120, w: 36, h: 123 },
  bordillo_piedra_top: { x: 256, y: 121, w: 158, h: 42 },
  bordillo_piedra_left: { x: 256, y: 121, w: 42, h: 122 },
  bordillo_piedra_right: { x: 372, y: 121, w: 42, h: 122 },
  grieta_lava: { x: 444, y: 112, w: 214, h: 63 },
  grieta_vacio: { x: 444, y: 181, w: 214, h: 64 },
  tile_lago_congelado: { x: 674, y: 61, w: 170, h: 169 },
  tile_alfombra_real: { x: 862, y: 61, w: 141, h: 161 },

  // PAQUETE 2 — Puentes y Bordes
  puente_madera: { x: 12, y: 306, w: 218, h: 165 },
  puente_obsidiana: { x: 266, y: 305, w: 196, h: 196 },
  borde_abismo: { x: 495, y: 306, w: 177, h: 108 },
  muro_nieve: { x: 690, y: 401, w: 69, h: 72 },
  muro_desierto: { x: 767, y: 401, w: 70, h: 72 },
  muro_cueva: { x: 859, y: 402, w: 64, h: 70 },
  muro_bosque: { x: 935, y: 401, w: 72, h: 72 },

  // PAQUETE 3 — Lugares y Jefes
  trono_vaelor: { x: 28, y: 548, w: 139, h: 200 },
  entrada_cueva: { x: 196, y: 567, w: 210, h: 166 },
  tienda_mercader: { x: 432, y: 564, w: 160, h: 138 },
  craneo_desierto: { x: 635, y: 525, w: 104, h: 84 },
  pino_congelado: { x: 773, y: 519, w: 66, h: 92 },
  roca_nevada: { x: 912, y: 525, w: 79, h: 79 },
  tienda_hierro: { x: 629, y: 617, w: 181, h: 136 },
  forja_hierro: { x: 818, y: 607, w: 188, h: 140 }
};

// Coordenadas exactas de recorte (x, y, w, h) de los 15 tiles en public/assets/tiles_terreno_nuevos.png (grilla 5x3, 1024x571)
export const TERRAIN_TILES_ATLAS = {
  // Fila 1 (row 0): Terrenos Base (recorte interior sin bordes negros de grilla)
  terreno_nieve: { row: 0, col: 0, x: 16, y: 14, w: 168, h: 159 },
  terreno_arena: { row: 0, col: 1, x: 226, y: 14, w: 162, h: 159 },
  terreno_lava: { row: 0, col: 2, x: 431, y: 14, w: 162, h: 159 },
  terreno_lago_corrupto: { row: 0, col: 3, x: 636, y: 14, w: 162, h: 159 },
  terreno_agua_clara: { row: 0, col: 4, x: 840, y: 14, w: 166, h: 159 },

  // Fila 2 (row 1): Transiciones 1
  trans_nieve_arena: { row: 1, col: 0, x: 16, y: 206, w: 168, h: 157 },
  trans_nieve_lava: { row: 1, col: 1, x: 226, y: 206, w: 162, h: 157 },
  trans_nieve_corrupto: { row: 1, col: 2, x: 431, y: 206, w: 162, h: 157 },
  trans_nieve_agua: { row: 1, col: 3, x: 636, y: 206, w: 162, h: 157 },
  trans_arena_lava: { row: 1, col: 4, x: 840, y: 206, w: 166, h: 157 },

  // Fila 3 (row 2): Transiciones 2
  trans_arena_corrupto: { row: 2, col: 0, x: 16, y: 394, w: 168, h: 163 },
  trans_arena_agua: { row: 2, col: 1, x: 226, y: 394, w: 162, h: 163 },
  trans_lava_corrupto: { row: 2, col: 2, x: 431, y: 394, w: 162, h: 163 },
  trans_lava_agua: { row: 2, col: 3, x: 636, y: 394, w: 162, h: 163 },
  trans_corrupto_agua: { row: 2, col: 4, x: 840, y: 394, w: 166, h: 163 }
};

// Coordenadas de recorte (x, y, w, h) de public/assets/map_assets_sheet.png (1024x571)
export const MAP_SHEET_ATLAS = {
  // Recurso 1: Transiciones y Bordes (Autotile)
  tile_grass_dirt_corner: { x: 6, y: 26, w: 80, h: 85 },
  tile_moss_stone_transition: { x: 8, y: 115, w: 120, h: 80 },
  tile_obsidian_sand_edge: { x: 8, y: 201, w: 246, h: 79 },

  // Recurso 2: Decoración y Doodads — Cueva / Obsidiana
  doodad_crystal_blue_lg: { x: 527, y: 49, w: 33, h: 42 },
  doodad_crystal_purple_lg: { x: 571, y: 49, w: 32, h: 42 },
  doodad_crystal_blue_sm: { x: 531, y: 99, w: 26, h: 27 },
  doodad_crystal_purple_sm: { x: 572, y: 99, w: 28, h: 28 },
  doodad_rock_obsidian: { x: 823, y: 59, w: 44, h: 31 },
  doodad_ore_iron: { x: 873, y: 54, w: 40, h: 35 },
  doodad_ore_gold: { x: 920, y: 58, w: 34, h: 31 },
  doodad_pebbles: { x: 614, y: 102, w: 28, h: 22 },
  doodad_void_crack: { x: 728, y: 101, w: 38, h: 25 },

  // Recurso 2: Decoración y Doodads — Bioma Corrupto
  doodad_corrupt_fern: { x: 527, y: 162, w: 34, h: 37 },
  doodad_mushroom_dark: { x: 570, y: 162, w: 34, h: 38 },
  doodad_mushroom_red: { x: 650, y: 167, w: 29, h: 31 },
  doodad_dead_root: { x: 687, y: 157, w: 34, h: 43 },
  doodad_dead_tree_md: { x: 866, y: 113, w: 57, h: 87 },
  doodad_dead_tree_lg: { x: 935, y: 100, w: 71, h: 100 },

  // Recurso 2: Decoración y Doodads — Guardia del Alba
  doodad_bush_green: { x: 524, y: 244, w: 38, h: 34 },
  doodad_bush_flower: { x: 568, y: 242, w: 38, h: 37 },
  doodad_flower_purple: { x: 613, y: 241, w: 30, h: 37 },
  doodad_flower_yellow: { x: 650, y: 241, w: 28, h: 36 },
  doodad_barrel: { x: 686, y: 236, w: 32, h: 44 },
  doodad_crate_front: { x: 724, y: 242, w: 36, h: 37 },
  doodad_crate_angle: { x: 768, y: 237, w: 36, h: 43 },
  doodad_cart: { x: 813, y: 231, w: 39, h: 48 },
  doodad_lantern_blue: { x: 902, y: 237, w: 19, h: 38 },
  doodad_well: { x: 961, y: 223, w: 47, h: 57 },

  // Recurso 3: Elevaciones, Acantilados (Cliffs), Escaleras y Ruinas
  cliff_rock_wall: { x: 8, y: 313, w: 146, h: 112 },
  cliff_grass_plateau: { x: 170, y: 312, w: 172, h: 129 },
  cliff_grass_step: { x: 7, y: 435, w: 110, h: 132 },
  stairs_stone: { x: 358, y: 313, w: 52, h: 61 },
  stairs_long: { x: 358, y: 390, w: 52, h: 69 },
  ramp_stone: { x: 426, y: 313, w: 69, h: 61 },
  ruin_wall_sm: { x: 170, y: 491, w: 52, h: 68 },
  ruin_wall_md: { x: 239, y: 491, w: 102, h: 77 },
  ruin_wall_arch: { x: 358, y: 475, w: 137, h: 93 },

  // Recurso 4: Animaciones en Bucle (Agua, Cascada, Hogueras, Antorchas y Cristales)
  anim_water_wave: { x: 519, y: 312, w: 250, h: 63 },
  anim_river_horiz: { x: 518, y: 380, w: 251, h: 63 },
  anim_river_vert: { x: 835, y: 312, w: 54, h: 132 },
  anim_waterfall: { x: 518, y: 448, w: 107, h: 120 },
  anim_fire: {
    fps: 7,
    frames: [
      { x: 719, y: 467, w: 33, h: 39 },
      { x: 780, y: 458, w: 37, h: 48 },
      { x: 847, y: 458, w: 36, h: 47 }
    ]
  },
  anim_torch: {
    fps: 6,
    frames: [
      { x: 919, y: 450, w: 16, h: 55 },
      { x: 977, y: 449, w: 18, h: 57 }
    ]
  },
  anim_crystal_blue: {
    fps: 4,
    frames: [
      { x: 649, y: 514, w: 41, h: 51 },
      { x: 720, y: 519, w: 29, h: 42 },
      { x: 778, y: 512, w: 42, h: 54 },
      { x: 836, y: 512, w: 52, h: 56 }
    ]
  },
  anim_crystal_purple: {
    fps: 3.5,
    frames: [
      { x: 904, y: 512, w: 46, h: 54 },
      { x: 969, y: 516, w: 37, h: 48 }
    ]
  }
};

// Mapeo directo de claves de habilidades, equipo, objetos, talentos y HUD a iconos 32x32 individuales
export const ICON_ASSET_MAP = {
  // Clases y habilidades de Guerrero
  guerrero: 'icon_sword',
  guerrero_0: 'icon_sword',
  guerrero_1: 'icon_fury_strike',
  corte_pesado: 'icon_fury_strike',
  guerrero_2: 'icon_shield',
  grito_escudo: 'icon_shield',
  guerrero_3: 'icon_charge',
  embestida: 'icon_charge',

  // Clases y habilidades de Mago
  mago: 'icon_staff',
  mago_0: 'icon_staff',
  mago_1: 'icon_fireball',
  bola_fuego: 'icon_fireball',
  mago_2: 'icon_frost',
  escarcha: 'icon_frost',
  mago_3: 'icon_blink',
  destello: 'icon_blink',

  // Clases y habilidades de Arquero
  arquero: 'icon_bow',
  arquero_0: 'icon_bow',
  arquero_1: 'icon_quick_arrow',
  flecha_rapida: 'icon_quick_arrow',
  arquero_2: 'icon_root_trap',
  trampa_raices: 'icon_root_trap',
  arquero_3: 'icon_arrow_rain',
  lluvia_flechas: 'icon_arrow_rain',

  // Consumibles, gemas y materiales
  pocion_vida: 'icon_potion_hp',
  pocion_grande: 'icon_potion_hp_large',
  pocion_mana: 'icon_potion_mp',
  pocion_velocidad: 'icon_potion_speed',
  pergamino_aldea: 'icon_scroll',
  gema_rubi: 'icon_gem_ruby',
  gema_esmeralda: 'icon_gem_emerald',
  gema_zafiro: 'icon_gem_sapphire',
  cristal_morado: 'icon_void_crystal',
  fragmento_vacio: 'icon_void_shard',
  esencia_hierro: 'icon_tools',

  // Ranuras de equipo y drops exclusivos de jefes
  arma: 'icon_sword',
  espada_alba: 'icon_paladin_claymore',
  mandoble_fractura: 'icon_paladin_claymore',
  espada_vaelor: 'icon_void_greatsword',
  baston_vacio: 'icon_void_staff',
  arco_ceniza: 'icon_phoenix_bow',
  casco: 'icon_helmet',
  casco_escarcha: 'icon_frost_helm',
  pechera: 'icon_armor',
  guanteletes: 'icon_gauntlets',
  guantes: 'icon_gloves',
  pierneras: 'icon_greaves',
  botas: 'icon_boots',
  alas: 'icon_wings_angel',
  alas_alba: 'icon_wings_angel',
  alas_ceniza: 'icon_wings_angel',
  alas_vacio: 'icon_wings_void',
  anillo: 'icon_ring',
  anillo1: 'icon_ring',
  anillo2: 'icon_ring',
  anillo_escarcha: 'icon_ring',
  anillo_lava: 'icon_ring_lava',
  collar: 'icon_necklace',
  collar_runas: 'icon_necklace',
  collar_vacio: 'icon_necklace_shadow',
  collar_sombras: 'icon_necklace_shadow',

  // Mascotas y Montura de Guerra
  mascota: 'icon_pet_wolf',
  lobo_blanco: 'icon_pet_wolf',
  fantasma_hoz: 'icon_pet_phantom',
  gato_volador: 'icon_pet_skycat',
  dragon_negro: 'icon_pet_dragon',
  dragon_rojo: 'icon_pet_dragon',
  montura: 'icon_mount_warhorse',
  mount: 'icon_mount_warhorse',
  montura_caballo: 'icon_mount_warhorse',

  // HUD, talentos y estados
  anvil: 'icon_tools',
  backpack: 'icon_backpack',
  coin: 'icon_coin',
  skull: 'icon_skull',
  skull_red: 'icon_skull_red',
  shield: 'icon_shield',
  flame: 'icon_fury_flame',
  speed: 'icon_potion_speed',
  crown: 'icon_crown_royal',
  heart: 'icon_heart_ruby',
  star: 'icon_star_medal',
  chest: 'icon_chest_gold'
};

// Mapeo de los 16 iconos de iconos_equipo.png (grilla 4x4)
// Fila 0: [0,0] casco, [0,1] pechera, [0,2] guanteletes, [0,3] guantes
// Fila 1: [1,0] pierneras, [1,1] botas, [1,2] arma, [1,3] alas
// Fila 2: [2,0] collar, [2,1] anillo1, [2,2] anillo2, [2,3] pocion_vida
// Fila 3: [3,0] pocion_mana, [3,1] gema_rubi, [3,2] gema_esmeralda, [3,3] pergamino_aldea
export const EQUIP_ICON_GRID_MAP = {
  casco: { row: 0, col: 0 },
  pechera: { row: 0, col: 1 },
  guanteletes: { row: 0, col: 2 },
  guantes: { row: 0, col: 3 },
  pierneras: { row: 1, col: 0 },
  botas: { row: 1, col: 1 },
  arma: { row: 1, col: 2 },
  espada_alba: { row: 1, col: 2 },
  hacha_hierro: { row: 1, col: 2 },
  mandoble_fractura: { row: 1, col: 2 },
  baston_vacio: { row: 1, col: 2 },
  arco_ceniza: { row: 1, col: 2 },
  espada_vaelor: { row: 1, col: 2 },
  alas: { row: 1, col: 3 },
  alas_alba: { row: 1, col: 3 },
  alas_ceniza: { row: 1, col: 3 },
  alas_vacio: { row: 1, col: 3 },
  collar: { row: 2, col: 0 },
  collar_runas: { row: 2, col: 0 },
  collar_vacio: { row: 2, col: 0 },
  anillo1: { row: 2, col: 1 },
  anillo_escarcha: { row: 2, col: 1 },
  anillo2: { row: 2, col: 2 },
  anillo_lava: { row: 2, col: 2 },
  pocion_vida: { row: 2, col: 3 },
  pocion_grande: { row: 2, col: 3 },
  pocion_mana: { row: 3, col: 0 },
  elixir_hierro: { row: 3, col: 0 },
  gema_rubi: { row: 3, col: 1 },
  gema_diamante: { row: 3, col: 1 },
  gema_esmeralda: { row: 3, col: 2 },
  mineral_hierro: { row: 3, col: 2 },
  pergamino_aldea: { row: 3, col: 3 },
  pergamino_furia: { row: 3, col: 3 }
};

// Mapeo de los 16 iconos 16-bit de iconos_habilidades.png (grilla 4x4)
// Fila 0 (Guerrero): [0,0] ataque, [0,1] corte_pesado, [0,2] grito_escudo, [0,3] embestida
// Fila 1 (Mago):     [1,0] ataque, [1,1] bola_fuego,   [1,2] escarcha,     [1,3] destello
// Fila 2 (Arquero):  [2,0] ataque, [2,1] flecha_rapida,[2,2] trampa_raices,[2,3] lluvia_flechas
// Fila 3 (HUD RPG):  [3,0] anvil,  [3,1] coin,         [3,2] backpack,     [3,3] skull
export const SKILL_ICON_GRID_MAP = {
  guerrero: { row: 0, col: 0 },
  guerrero_0: { row: 0, col: 0 },
  guerrero_1: { row: 0, col: 1 },
  corte_pesado: { row: 0, col: 1 },
  guerrero_2: { row: 0, col: 2 },
  grito_escudo: { row: 0, col: 2 },
  shield: { row: 0, col: 2 },
  guerrero_3: { row: 0, col: 3 },
  embestida: { row: 0, col: 3 },
  speed: { row: 0, col: 3 },

  mago: { row: 1, col: 0 },
  mago_0: { row: 1, col: 0 },
  mago_1: { row: 1, col: 1 },
  bola_fuego: { row: 1, col: 1 },
  flame: { row: 1, col: 1 },
  mago_2: { row: 1, col: 2 },
  escarcha: { row: 1, col: 2 },
  mago_3: { row: 1, col: 3 },
  destello: { row: 1, col: 3 },

  arquero: { row: 2, col: 0 },
  arquero_0: { row: 2, col: 0 },
  arquero_1: { row: 2, col: 1 },
  flecha_rapida: { row: 2, col: 1 },
  arquero_2: { row: 2, col: 2 },
  trampa_raices: { row: 2, col: 2 },
  arquero_3: { row: 2, col: 3 },
  lluvia_flechas: { row: 2, col: 3 },

  anvil: { row: 3, col: 0 },
  esencia_hierro: { row: 3, col: 0 },
  coin: { row: 3, col: 1 },
  backpack: { row: 3, col: 2 },
  skull: { row: 3, col: 3 },
  skull_red: { row: 3, col: 3 }
};

const loadedAssets = new Map();
const processedSprites = new Map();
const croppedIconDataUrls = new Map();
const croppedSkillIconDataUrls = new Map();
const processedPetPortraits = new Map();
const processedBossPortraits = new Map();

let preloadPromise = null;
const assetListeners = new Set();

export function onAssetsUpdated(cb) {
  if (typeof cb === 'function') {
    assetListeners.add(cb);
  }
  return () => assetListeners.delete(cb);
}

function notifyAssetListeners() {
  assetListeners.forEach((cb) => {
    try { cb(); } catch { /* ignore */ }
  });
}

/**
 * Recorta el fondo blanco exterior usando BFS Flood-Fill desde las 4 esquinas y bordes,
 * además de limpiar huecos cerrados de fondo blanco puro (ej. entre brazo/martillo de Ignis o hacha de Boreas),
 * preservando cualquier píxel blanco interno legítimo del personaje, jefe o mascota.
 * También recorta automáticamente el bounding-box útil para centrar el sprite limpio.
 */
export function removeWhiteBackgroundFloodFill(img, threshold = 228) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return img;

  // Reducir a máx 256px antes del BFS (16x más rápido sin pérdida visual en sprites 16-bit)
  const maxDim = 256;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);

  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch {
    return img;
  }

  const data = imgData.data;
  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isExteriorWhite = (idx) => {
    const p = idx * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const a = data[p + 3];
    if (a === 0) return true;
    return r >= threshold && g >= threshold && b >= threshold &&
      Math.abs(r - g) <= 18 && Math.abs(g - b) <= 18;
  };

  const enqueue = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    if (isExteriorWhite(idx)) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  // Semillas desde las 4 esquinas y todo el perímetro exterior
  enqueue(0, 0);
  enqueue(w - 1, 0);
  enqueue(0, h - 1);
  enqueue(w - 1, h - 1);
  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  // BFS 4-conectado exterior
  while (head < tail) {
    const idx = queue[head++];
    const p = idx * 4;
    data[p + 3] = 0; // Transparente

    const x = idx % w;
    const y = (idx - x) / w;

    if (x > 0) enqueue(x - 1, y);
    if (x < w - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < h - 1) enqueue(x, y + 1);
  }

  // Segunda pasada inteligente: detectar "islas/huecos cerrados" de fondo blanco puro (>=246)
  // que hayan quedado encerrados entre un arma/brazo y el cuerpo (ej. Ignis, Boreas, arco de Arquera)
  // Un hueco de fondo se distingue del pelaje blanco porque su frontera toca mayoritariamente el contorno oscuro (#000-#303038)
  const holeVisited = new Uint8Array(total);
  const compPixels = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const startIdx = y * w + x;
      if (visited[startIdx] || holeVisited[startIdx]) continue;
      const p0 = startIdx * 4;
      if (data[p0] < 236 || data[p0 + 1] < 236 || data[p0 + 2] < 236) continue;
      if (Math.abs(data[p0] - data[p0 + 1]) > 18 || Math.abs(data[p0 + 1] - data[p0 + 2]) > 18) continue;

      // Explorar componente conexa de blanco casi puro
      compPixels.length = 0;
      let darkBorderCount = 0;
      let lightBorderCount = 0;
      let qHead = 0;
      holeVisited[startIdx] = 1;
      compPixels.push(startIdx);

      while (qHead < compPixels.length) {
        const curr = compPixels[qHead++];
        const neighbors = [curr - 1, curr + 1, curr - w, curr + w];
        for (let n = 0; n < 4; n++) {
          const nIdx = neighbors[n];
          if (nIdx < 0 || nIdx >= total || visited[nIdx]) continue;
          const np = nIdx * 4;
          const nr = data[np], ng = data[np + 1], nb = data[np + 2];
          if (nr >= 216 && ng >= 216 && nb >= 216 && Math.abs(nr - ng) <= 18 && Math.abs(ng - nb) <= 18) {
            if (!holeVisited[nIdx]) {
              holeVisited[nIdx] = 1;
              compPixels.push(nIdx);
            }
          } else {
            // Es píxel frontera del hueco
            const luma = (nr + ng + nb) / 3;
            if (luma < 145) darkBorderCount++;
            else lightBorderCount++;
          }
        }
      }

      // Si el hueco blanco está rodeado por línea de contorno oscuro, es fondo encerrado
      if (compPixels.length >= 4 && darkBorderCount >= lightBorderCount * 0.45) {
        for (let k = 0; k < compPixels.length; k++) {
          const cIdx = compPixels[k];
          visited[cIdx] = 1;
          data[cIdx * 4 + 3] = 0;
        }
      }
    }
  }

  // Limpieza suave de halo (2 pasadas) en la frontera con el fondo eliminado
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (visited[idx]) continue;
        if (
          visited[idx - 1] ||
          visited[idx + 1] ||
          visited[idx - w] ||
          visited[idx + w]
        ) {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          if (r > 205 && g > 205 && b > 205 && Math.abs(r - g) <= 22 && Math.abs(g - b) <= 22) {
            data[p + 3] = 0;
            visited[idx] = 1;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Recortar al bounding box de píxeles opacos para que todos los sprites queden bien proporcionados
  let minX = w, minY = h, maxX = 0, maxY = 0;
  let foundOpaque = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 16) {
        foundOpaque = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!foundOpaque) return canvas;

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);

  const trimmed = document.createElement('canvas');
  trimmed.width = cropW;
  trimmed.height = cropH;
  const tctx = trimmed.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmed;
}

/**
 * Procesa la hoja iconos_equipo.png (4x4) y genera DataURLs de cada icono con fondo oscuro/transparente limpio.
 */
function buildEquipmentIconsCache(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;

  const cellW = Math.floor(w / 4);
  const cellH = Math.floor(h / 4);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = false;

      // Recortar con ligero margen interno para evitar bordes de celdas vecinas
      const insetX = Math.floor(cellW * 0.06);
      const insetY = Math.floor(cellH * 0.06);
      ctx.drawImage(
        img,
        col * cellW + insetX,
        row * cellH + insetY,
        cellW - insetX * 2,
        cellH - insetY * 2,
        0,
        0,
        64,
        64
      );

      // Flood-fill del fondo azul-oscuro (#181d27) de iconos_equipo.png para que el icono sea transparente
      try {
        const imgData = ctx.getImageData(0, 0, 64, 64);
        const d = imgData.data;
        const cornerR = d[0], cornerG = d[1], cornerB = d[2];
        const visited = new Uint8Array(64 * 64);
        const q = new Int32Array(64 * 64);
        let head = 0, tail = 0;

        const isDarkBg = (idx) => {
          const p = idx * 4;
          return Math.abs(d[p] - cornerR) <= 22 &&
            Math.abs(d[p + 1] - cornerG) <= 22 &&
            Math.abs(d[p + 2] - cornerB) <= 24;
        };

        const push = (x, y) => {
          if (x < 0 || x >= 64 || y < 0 || y >= 64) return;
          const idx = y * 64 + x;
          if (visited[idx] || !isDarkBg(idx)) return;
          visited[idx] = 1;
          q[tail++] = idx;
        };

        for (let i = 0; i < 64; i++) {
          push(i, 0);
          push(i, 63);
          push(0, i);
          push(63, i);
        }

        while (head < tail) {
          const idx = q[head++];
          d[idx * 4 + 3] = 0;
          const x = idx % 64;
          const y = (idx - x) / 64;
          push(x - 1, y);
          push(x + 1, y);
          push(x, y - 1);
          push(x, y + 1);
        }
        ctx.putImageData(imgData, 0, 0);
      } catch {
        // Ignore CORS/read errors
      }

      const key = `${row}_${col}`;
      croppedIconDataUrls.set(key, c.toDataURL('image/png'));
    }
  }
}

/**
 * Procesa la hoja iconos_habilidades.png (4x4, 384x384 RGBA transparente) y genera DataURLs nítidos 96x96
 * para los 12 iconos de Ataque y Habilidades de las 3 clases + 4 iconos principales del HUD.
 */
function buildSkillIconsCache(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;

  const cellW = Math.floor(w / 4);
  const cellH = Math.floor(h / 4);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const c = document.createElement('canvas');
      c.width = cellW;
      c.height = cellH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);
      croppedSkillIconDataUrls.set(`${row}_${col}`, c.toDataURL('image/png'));
    }
  }
}

/**
 * Sintetiza automáticamente un spritesheet horizontal de 4 cuadros reales (4 * frameW x frameH)
 * a partir de un sprite de 1 cuadro ya recortado con Flood-Fill:
 *   - Cuadro 0 (Reposo / Postura base): personaje erguido centrado sobre footY.
 *   - Cuadro 1 (Paso A / Zancada izquierda): pierna izquierda adelantada y elevada (-3px),
 *     pierna derecha atrasada (+3px), torso/brazos con braceo (+1px) y elevación de paso (-2px).
 *   - Cuadro 2 (Paso B / Zancada derecha): pierna derecha adelantada y elevada (-3px),
 *     pierna izquierda atrasada (-3px), torso/brazos con braceo opuesto (-1px) y elevación (-2px).
 *   - Cuadro 3 (Impulso / Ataque / Acción): torso y arma proyectados hacia adelante (+3px/+5px)
 *     con guardia abierta en las piernas.
 */
function shouldSynthesizeFourFrames(key, canvas) {
  if (!canvas || canvas.width >= canvas.height * 2.2) return false;
  return (
    key.startsWith('heroe_') ||
    key.startsWith('heroina_') ||
    key.startsWith('mascota_') ||
    key.startsWith('enemigo_') ||
    key.startsWith('jefe_') ||
    key.startsWith('npc_')
  );
}

function synthesizeFourFrameSheet(srcCanvas, key) {
  const sw = srcCanvas.width || 64;
  const sh = srcCanvas.height || 64;
  if (!shouldSynthesizeFourFrames(key, srcCanvas)) {
    return srcCanvas;
  }

  const padX = Math.max(5, Math.round(sw * 0.09));
  const padTop = Math.max(5, Math.round(sh * 0.07));
  const fw = sw + padX * 2;
  const fh = sh + padTop;

  const sheet = document.createElement('canvas');
  sheet.width = fw * 4;
  sheet.height = fh;
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Deformación continua por franjas horizontales y mitades laterales con solapamiento suave (sin partir armas ni túnicas)
  const srcCtx = srcCanvas.getContext('2d');
  let srcData = null;
  try {
    srcData = srcCtx.getImageData(0, 0, sw, sh).data;
  } catch {
    srcData = null;
  }

  if (srcData) {
    const outImg = ctx.createImageData(fw * 4, fh);
    const dst = outImg.data;
    const stepAmp = Math.max(2.5, sw * 0.048);
    const liftAmp = Math.max(2.5, sh * 0.038);

    const renderWarped = (fIdx, warpFn) => {
      const ox = fIdx * fw + padX;
      const oy = padTop;
      for (let dy = -padTop; dy < sh; dy++) {
        const ny = dy / sh;
        for (let dx = -padX; dx < sw + padX; dx++) {
          const nx = dx / sw;
          const { offX, offY } = warpFn(nx, ny);
          const sx = Math.round(dx - offX);
          const sy = Math.round(dy - offY);
          if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
          const sO = (sy * sw + sx) * 4;
          if (srcData[sO + 3] < 20) continue;
          const outX = ox + dx;
          const outY = oy + dy;
          if (outX < fIdx * fw || outX >= (fIdx + 1) * fw || outY < 0 || outY >= fh) continue;
          const dO = (outY * (fw * 4) + outX) * 4;
          dst[dO] = srcData[sO];
          dst[dO + 1] = srcData[sO + 1];
          dst[dO + 2] = srcData[sO + 2];
          dst[dO + 3] = srcData[sO + 3];
        }
      }
    };

    renderWarped(0, () => ({ offX: 0, offY: 0 }));
    renderWarped(1, (nx, ny) => {
      const legT = Math.max(0, Math.min(1, (ny - 0.56) / 0.44));
      const smoothLeg = legT * legT * (3 - 2 * legT);
      const side = Math.max(-1, Math.min(1, (nx - 0.5) * 3.2));
      return {
        offX: (1 - smoothLeg) * (stepAmp * 0.35) + side * smoothLeg * stepAmp * 0.85,
        offY: -liftAmp * 0.65 - Math.max(0, -side) * smoothLeg * liftAmp * 1.35
      };
    });
    renderWarped(2, (nx, ny) => {
      const legT = Math.max(0, Math.min(1, (ny - 0.56) / 0.44));
      const smoothLeg = legT * legT * (3 - 2 * legT);
      const side = Math.max(-1, Math.min(1, (nx - 0.5) * 3.2));
      return {
        offX: -(1 - smoothLeg) * (stepAmp * 0.35) - side * smoothLeg * stepAmp * 0.75,
        offY: -liftAmp * 0.65 - Math.max(0, side) * smoothLeg * liftAmp * 1.35
      };
    });
    renderWarped(3, (nx, ny) => {
      const upperT = Math.max(0, Math.min(1, (0.78 - ny) / 0.78));
      const legT = Math.max(0, Math.min(1, (ny - 0.58) / 0.42));
      const side = Math.max(-1, Math.min(1, (nx - 0.5) * 3.0));
      return {
        offX: upperT * stepAmp * 1.15 + side * legT * stepAmp * 0.7,
        offY: -upperT * (liftAmp * 0.45)
      };
    });

    ctx.putImageData(outImg, 0, 0);
    return sheet;
  }

  for (let i = 0; i < 4; i++) {
    ctx.drawImage(srcCanvas, i * fw + padX, padTop);
  }
  return sheet;
}

/**
 * Procesa una hoja de personaje en cuadrícula 3x5 (3 filas de ángulo x 5 columnas de acción):
 * - Divide la imagen original en sus 15 celdas (5 columnas x 3 filas).
 * - Elimina los bordes/líneas divisorias de la cuadrícula y aplica BFS Flood-Fill exterior
 *   desde los 4 bordes de cada celda (R>230, G>230, B>230), conservando intactos los detalles
 *   internos claros (pelaje claro, ojos, colmillos, vendas).
 * - Alinea cada cuadro horizontalmente al centro de su celda y verticalmente en la línea de los pies (footY),
 *   manteniendo en la columna 3 (jump) una ligera elevación natural.
 */
export function processGrid3x5SpriteSheet(img, threshold = 230) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return img;

  // Normalizar hoja 3x5 a máx 600px de ancho (celdas de ~120x112px) para evitar bloquear el hilo principal
  const maxSheetW = 600;
  const scale = Math.min(1, maxSheetW / srcW);
  const totalW = Math.max(5, Math.round(srcW * scale));
  const totalH = Math.max(3, Math.round(srcH * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = totalW;
  srcCanvas.height = totalH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  srcCtx.imageSmoothingEnabled = false;
  srcCtx.drawImage(img, 0, 0, totalW, totalH);

  // Eliminar líneas divisorias de cuadrícula que atraviesan la hoja completa (evita el cuadrado parpadeante al moverse)
  try {
    const fullImg = srcCtx.getImageData(0, 0, totalW, totalH);
    const fd = fullImg.data;
    const clearCols = [];
    for (let x = 0; x < totalW; x++) {
      let dark = 0;
      for (let y = 0; y < totalH; y += 2) {
        const p = (y * totalW + x) * 4;
        if (fd[p + 3] > 20 && fd[p] < 95 && fd[p + 1] < 95 && fd[p + 2] < 95) dark++;
      }
      if (dark > (totalH * 0.5) * 0.45) clearCols.push(x);
    }
    const clearRows = [];
    for (let y = 0; y < totalH; y++) {
      let dark = 0;
      for (let x = 0; x < totalW; x += 2) {
        const p = (y * totalW + x) * 4;
        if (fd[p + 3] > 20 && fd[p] < 95 && fd[p + 1] < 95 && fd[p + 2] < 95) dark++;
      }
      if (dark > (totalW * 0.5) * 0.45) clearRows.push(y);
    }
    for (const x of clearCols) {
      for (let y = 0; y < totalH; y++) fd[(y * totalW + x) * 4 + 3] = 0;
    }
    for (const y of clearRows) {
      for (let x = 0; x < totalW; x++) fd[(y * totalW + x) * 4 + 3] = 0;
    }
    if (clearCols.length || clearRows.length) srcCtx.putImageData(fullImg, 0, 0);
  } catch {
    // ignore
  }

  const cellW = Math.floor(totalW / 5);
  const cellH = Math.floor(totalH / 3);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cellW * 5;
  outCanvas.height = cellH * 3;
  outCanvas.dataset.grid3x5 = 'true';
  outCanvas._cellAnchors = {};
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;

  // Margen perimetral base para descartar bordes de la cuadrícula
  const borderPadX = Math.max(4, Math.round(cellW * 0.035));
  const borderPadY = Math.max(4, Math.round(cellH * 0.035));
  const maxGridMarginX = Math.round(cellW * 0.16);
  const maxGridMarginY = Math.round(cellH * 0.14);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const sx = col * cellW;
      const sy = row * cellH;
      let cellData;
      try {
        cellData = srcCtx.getImageData(sx, sy, cellW, cellH);
      } catch {
        return img;
      }

      const d = cellData.data;
      const total = cellW * cellH;
      const visited = new Uint8Array(total);
      const q = new Int32Array(total);
      let head = 0;
      let tail = 0;

      // 1. Detectar líneas divisorias negras/grises desplazadas dentro del margen exterior (hasta 16% X / 14% Y)
      let effLeftPad = borderPadX;
      let effRightPad = borderPadX;
      let effTopPad = borderPadY;
      let effBottomPad = borderPadY;

      for (let x = 0; x < maxGridMarginX; x++) {
        let darkCount = 0;
        for (let y = 0; y < cellH; y++) {
          const p = (y * cellW + x) * 4;
          if (d[p + 3] > 40 && (d[p] + d[p + 1] + d[p + 2]) / 3 < 135) darkCount++;
        }
        if (darkCount > cellH * 0.42) effLeftPad = Math.max(effLeftPad, x + 2);
      }
      for (let x = cellW - 1; x >= cellW - maxGridMarginX; x--) {
        let darkCount = 0;
        for (let y = 0; y < cellH; y++) {
          const p = (y * cellW + x) * 4;
          if (d[p + 3] > 40 && (d[p] + d[p + 1] + d[p + 2]) / 3 < 135) darkCount++;
        }
        if (darkCount > cellH * 0.42) effRightPad = Math.max(effRightPad, cellW - x + 1);
      }
      for (let y = 0; y < maxGridMarginY; y++) {
        let darkCount = 0;
        for (let x = 0; x < cellW; x++) {
          const p = (y * cellW + x) * 4;
          if (d[p + 3] > 40 && (d[p] + d[p + 1] + d[p + 2]) / 3 < 135) darkCount++;
        }
        if (darkCount > cellW * 0.42) effTopPad = Math.max(effTopPad, y + 2);
      }
      for (let y = cellH - 1; y >= cellH - maxGridMarginY; y--) {
        let darkCount = 0;
        for (let x = 0; x < cellW; x++) {
          const p = (y * cellW + x) * 4;
          if (d[p + 3] > 40 && (d[p] + d[p + 1] + d[p + 2]) / 3 < 135) darkCount++;
        }
        if (darkCount > cellW * 0.42) effBottomPad = Math.max(effBottomPad, cellH - y + 1);
      }

      // Limpiar franja de líneas divisorias en los 4 bordes de la celda
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          if (x < effLeftPad || x >= cellW - effRightPad || y < effTopPad || y >= cellH - effBottomPad) {
            d[(y * cellW + x) * 4 + 3] = 0;
          }
        }
      }

      const isExteriorWhite = (idx) => {
        const p = idx * 4;
        if (d[p + 3] === 0) return true;
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        return r > threshold && g > threshold && b > threshold &&
          Math.abs(r - g) <= 20 && Math.abs(g - b) <= 20;
      };

      const enqueue = (x, y) => {
        if (x < 0 || x >= cellW || y < 0 || y >= cellH) return;
        const idx = y * cellW + x;
        if (visited[idx]) return;
        if (isExteriorWhite(idx)) {
          visited[idx] = 1;
          q[tail++] = idx;
        }
      };

      for (let x = 0; x < cellW; x++) {
        enqueue(x, effTopPad);
        enqueue(x, cellH - 1 - effBottomPad);
      }
      for (let y = 0; y < cellH; y++) {
        enqueue(effLeftPad, y);
        enqueue(cellW - 1 - effRightPad, y);
      }

      while (head < tail) {
        const idx = q[head++];
        d[idx * 4 + 3] = 0;
        const x = idx % cellW;
        const y = (idx - x) / cellW;
        if (x > 0) enqueue(x - 1, y);
        if (x < cellW - 1) enqueue(x + 1, y);
        if (y > 0) enqueue(x, y - 1);
        if (y < cellH - 1) enqueue(x, y + 1);
      }

      // Limpiar huecos blancos internos cerrados (ej. entre piernas al caminar de lado o entre brazos y torso)
      const isStrictPureWhite = (idx) => {
        const p = idx * 4;
        if (d[p + 3] === 0) return false;
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        return (
          r > 236 &&
          g > 236 &&
          b > 236 &&
          Math.abs(r - g) <= 14 &&
          Math.abs(g - b) <= 14 &&
          Math.abs(r - b) <= 14
        );
      };

      const innerVisited = new Uint8Array(total);
      for (let y = borderPadY; y < cellH - borderPadY; y++) {
        for (let x = borderPadX; x < cellW - borderPadX; x++) {
          const startIdx = y * cellW + x;
          if (visited[startIdx] || innerVisited[startIdx] || !isStrictPureWhite(startIdx)) continue;

          const compPixels = [];
          const cq = [startIdx];
          innerVisited[startIdx] = 1;
          let touchesOutline = false;

          while (cq.length > 0) {
            const cIdx = cq.pop();
            compPixels.push(cIdx);
            const cx = cIdx % cellW;
            const cy = (cIdx - cx) / cellW;
            const neighbors = [];
            if (cx > 0) neighbors.push(cIdx - 1);
            if (cx < cellW - 1) neighbors.push(cIdx + 1);
            if (cy > 0) neighbors.push(cIdx - cellW);
            if (cy < cellH - 1) neighbors.push(cIdx + cellW);

            for (let n = 0; n < neighbors.length; n++) {
              const nIdx = neighbors[n];
              const np = nIdx * 4;
              if (d[np + 3] === 0) {
                touchesOutline = true;
                continue;
              }
              const nr = d[np];
              const ng = d[np + 1];
              const nb = d[np + 2];
              const luma = (nr + ng + nb) / 3;
              if (luma < 175) touchesOutline = true;
              if (!visited[nIdx] && !innerVisited[nIdx] && isStrictPureWhite(nIdx)) {
                innerVisited[nIdx] = 1;
                cq.push(nIdx);
              }
            }
          }

          if (compPixels.length >= 4 && touchesOutline) {
            for (let k = 0; k < compPixels.length; k++) {
              d[compPixels[k] * 4 + 3] = 0;
            }
          }
        }
      }

      // Suavizado de halo blanco residual en bordes (2 pasadas)
      for (let pass = 0; pass < 2; pass++) {
        const toClear = [];
        for (let y = borderPadY; y < cellH - borderPadY; y++) {
          for (let x = borderPadX; x < cellW - borderPadX; x++) {
            const idx = y * cellW + x;
            const p = idx * 4;
            if (d[p + 3] === 0) continue;
            const r = d[p];
            const g = d[p + 1];
            const b = d[p + 2];
            if (r > 208 && g > 208 && b > 208 && Math.abs(r - g) <= 18 && Math.abs(g - b) <= 18) {
              const hasTransparentNeighbor =
                d[(idx - 1) * 4 + 3] === 0 ||
                d[(idx + 1) * 4 + 3] === 0 ||
                d[(idx - cellW) * 4 + 3] === 0 ||
                d[(idx + cellW) * 4 + 3] === 0;
              if (hasTransparentNeighbor) toClear.push(p);
            }
          }
        }
        for (let k = 0; k < toClear.length; k++) {
          d[toClear[k] + 3] = 0;
        }
      }

      // Quitar líneas horizontales sueltas de sombra de piso dibujadas debajo de los pies (1-2px de grosor aislados)
      for (let y = Math.floor(cellH * 0.82); y < cellH - borderPadY; y++) {
        let rowOpaque = 0;
        for (let x = borderPadX; x < cellW - borderPadX; x++) {
          if (d[(y * cellW + x) * 4 + 3] > 20) rowOpaque++;
        }
        if (rowOpaque > 0 && rowOpaque < cellW * 0.35) {
          // Verificar si la fila de arriba y la de abajo son transparentes (línea fina de suelo)
          let aboveOpaque = 0;
          let belowOpaque = 0;
          for (let x = borderPadX; x < cellW - borderPadX; x++) {
            if (y > 0 && d[((y - 2) * cellW + x) * 4 + 3] > 20) aboveOpaque++;
            if (y + 2 < cellH && d[((y + 2) * cellW + x) * 4 + 3] > 20) belowOpaque++;
          }
          if (aboveOpaque === 0 && belowOpaque === 0) {
            for (let dy = -1; dy <= 1; dy++) {
              const yy = y + dy;
              if (yy >= 0 && yy < cellH) {
                for (let x = 0; x < cellW; x++) d[(yy * cellW + x) * 4 + 3] = 0;
              }
            }
          }
        }
      }

      // Aislar componente central del personaje para descartar restos de bordes desconectados
      const compLabels = new Int32Array(total);
      let nextLabel = 0;
      let bestLabel = 0;
      let bestScore = -1;
      const cellCenterX = cellW * 0.5;
      const cellCenterY = cellH * 0.52;

      for (let y = effTopPad; y < cellH - effBottomPad; y++) {
        for (let x = effLeftPad; x < cellW - effRightPad; x++) {
          const sIdx = y * cellW + x;
          if (compLabels[sIdx] !== 0 || d[sIdx * 4 + 3] <= 24) continue;
          nextLabel++;
          const label = nextLabel;
          const bq = [sIdx];
          compLabels[sIdx] = label;
          let count = 0;
          let sumX = 0;
          let sumY = 0;

          while (bq.length > 0) {
            const cur = bq.pop();
            count++;
            const cx = cur % cellW;
            const cy = (cur - cx) / cellW;
            sumX += cx;
            sumY += cy;
            // Radio de puente de 2px para mantener unidos detalles cercanos (puntas de arma, mechones)
            for (let dy = -2; dy <= 2; dy++) {
              const ny = cy + dy;
              if (ny < effTopPad || ny >= cellH - effBottomPad) continue;
              for (let dx = -2; dx <= 2; dx++) {
                const nx = cx + dx;
                if (nx < effLeftPad || nx >= cellW - effRightPad) continue;
                const nIdx = ny * cellW + nx;
                if (compLabels[nIdx] === 0 && d[nIdx * 4 + 3] > 24) {
                  compLabels[nIdx] = label;
                  bq.push(nIdx);
                }
              }
            }
          }

          if (count >= 25) {
            const avgX = sumX / count;
            const avgY = sumY / count;
            const distPenalty = Math.hypot(avgX - cellCenterX, avgY - cellCenterY);
            const score = count - distPenalty * 12;
            if (score > bestScore) {
              bestScore = score;
              bestLabel = label;
            }
          }
        }
      }

      if (bestLabel > 0) {
        for (let i = 0; i < total; i++) {
          if (d[i * 4 + 3] > 0 && compLabels[i] !== bestLabel) {
            d[i * 4 + 3] = 0;
          }
        }
      }

      // Detectar bounding-box del personaje dentro de la celda para anclarlo exactamente en footY (base de la celda)
      let minX = cellW, minY = cellH, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          if (d[(y * cellW + x) * 4 + 3] > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }

      if (found) {
        const tmp = document.createElement('canvas');
        tmp.width = cellW;
        tmp.height = cellH;
        tmp.getContext('2d').putImageData(cellData, 0, 0);

        const charW = maxX - minX + 1;
        const charH = maxY - minY + 1;
        const dstInCellX = Math.round((cellW - charW) / 2);
        const dstX = col * cellW + dstInCellX;
        // En col === 3 (jump) dejamos un pequeño margen inferior para que las piernas encogidas se vean en el aire
        const bottomMargin = col === 3 ? Math.round(cellH * 0.06) : 2;
        const dstInCellY = cellH - charH - bottomMargin;
        const dstY = row * cellH + dstInCellY;
        outCtx.drawImage(tmp, minX, minY, charW, charH, dstX, dstY, charW, charH);

        // Calcular puntos de anclaje anatómicos reales normalizados respecto a (drawW, drawH) con origen en (footX, footY)
        const toNormX = (srcX) => (dstInCellX + (srcX - minX) - cellW * 0.5) / cellW;
        const toNormY = (srcY) => (dstInCellY + (srcY - minY) - cellH) / cellH;

        const rowMin = new Int32Array(charH).fill(maxX);
        const rowMax = new Int32Array(charH).fill(minX);
        for (let ry = 0; ry < charH; ry++) {
          const y = minY + ry;
          for (let x = minX; x <= maxX; x++) {
            if (d[(y * cellW + x) * 4 + 3] > 32) {
              if (x < rowMin[ry]) rowMin[ry] = x;
              if (x > rowMax[ry]) rowMax[ry] = x;
            }
          }
        }

        const measureBand = (t0, t1, quantile = 0.5) => {
          const y0 = Math.max(0, Math.floor(t0 * (charH - 1)));
          const y1 = Math.min(charH - 1, Math.ceil(t1 * (charH - 1)));
          const cxs = [];
          const ws = [];
          for (let ry = y0; ry <= y1; ry++) {
            if (rowMax[ry] >= rowMin[ry]) {
              const l = toNormX(rowMin[ry]);
              const r = toNormX(rowMax[ry]);
              cxs.push((l + r) * 0.5);
              ws.push(r - l);
            }
          }
          if (!cxs.length) return { cx: 0, w: (charW / cellW) * 0.45 };
          cxs.sort((a, b) => a - b);
          ws.sort((a, b) => a - b);
          const midIdx = Math.floor(cxs.length * 0.5);
          const qIdx = Math.min(ws.length - 1, Math.max(0, Math.floor(ws.length * quantile)));
          return { cx: cxs[midIdx], w: ws[qIdx] };
        };

        const topYNorm = toNormY(minY);
        const footYNorm = toNormY(maxY);
        const charHNorm = charH / cellH;
        const charWNorm = charW / cellW;

        const headBand = measureBand(0.05, 0.22, 0.65);
        const neckBand = measureBand(0.22, 0.28, 0.4);
        const torsoBand = measureBand(0.29, 0.56, 0.25);

        // Detectar extremos de manos/brazos en la franja media-superior (0.20 .. 0.60)
        let leftHandSrcX = maxX, leftHandSrcY = Math.round(minY + charH * 0.45);
        let rightHandSrcX = minX, rightHandSrcY = Math.round(minY + charH * 0.45);
        const armY0 = Math.floor(charH * 0.20);
        const armY1 = Math.ceil(charH * 0.60);
        for (let ry = armY0; ry <= armY1; ry++) {
          if (rowMax[ry] >= rowMin[ry]) {
            if (rowMin[ry] < leftHandSrcX) {
              leftHandSrcX = rowMin[ry];
              leftHandSrcY = minY + ry;
            }
            if (rowMax[ry] > rightHandSrcX) {
              rightHandSrcX = rowMax[ry];
              rightHandSrcY = minY + ry;
            }
          }
        }

        // Detectar centros de pierna izquierda/derecha y pie izquierdo/derecho
        const midSrcX = minX + charW * 0.5;
        const measureSplitBand = (t0, t1) => {
          const y0 = Math.max(0, Math.floor(t0 * (charH - 1)));
          const y1 = Math.min(charH - 1, Math.ceil(t1 * (charH - 1)));
          let lSum = 0, lCnt = 0, rSum = 0, rCnt = 0;
          let lMin = maxX, lMax = minX, rMin = maxX, rMax = minX;
          for (let ry = y0; ry <= y1; ry++) {
            const y = minY + ry;
            for (let x = minX; x <= maxX; x++) {
              if (d[(y * cellW + x) * 4 + 3] > 32) {
                if (x <= midSrcX) {
                  lSum += x; lCnt++;
                  if (x < lMin) lMin = x;
                  if (x > lMax) lMax = x;
                } else {
                  rSum += x; rCnt++;
                  if (x < rMin) rMin = x;
                  if (x > rMax) rMax = x;
                }
              }
            }
          }
          const lCx = lCnt > 0 ? toNormX(lSum / lCnt) : -charWNorm * 0.16;
          const rCx = rCnt > 0 ? toNormX(rSum / rCnt) : charWNorm * 0.16;
          const lW = lCnt > 0 && lMax >= lMin ? Math.max(0.05, (lMax - lMin + 1) / cellW) : charWNorm * 0.2;
          const rW = rCnt > 0 && rMax >= rMin ? Math.max(0.05, (rMax - rMin + 1) / cellW) : charWNorm * 0.2;
          return { lCx, rCx, lW, rW };
        };

        const legsSplit = measureSplitBand(0.64, 0.85);
        const feetSplit = measureSplitBand(0.86, 0.99);

        outCanvas._cellAnchors[`${row}_${col}`] = {
          topY: topYNorm,
          footY: footYNorm,
          charW: charWNorm,
          charH: charHNorm,
          headCx: headBand.cx,
          headTopY: topYNorm,
          headW: Math.max(0.11, Math.min(0.28, headBand.w)),
          headH: charHNorm * 0.22,
          neckCx: neckBand.cx,
          neckY: topYNorm + charHNorm * 0.24,
          torsoCx: (headBand.cx * 0.45 + torsoBand.cx * 0.55),
          torsoTopY: topYNorm + charHNorm * 0.25,
          torsoW: Math.max(0.13, Math.min(0.32, torsoBand.w)),
          torsoH: charHNorm * 0.30,
          leftHandX: toNormX(leftHandSrcX),
          leftHandY: toNormY(leftHandSrcY),
          rightHandX: toNormX(rightHandSrcX),
          rightHandY: toNormY(rightHandSrcY),
          legTopY: topYNorm + charHNorm * 0.62,
          legH: charHNorm * 0.23,
          leftLegCx: legsSplit.lCx,
          rightLegCx: legsSplit.rCx,
          legW: Math.max(0.06, Math.min(0.16, (legsSplit.lW + legsSplit.rW) * 0.5)),
          footTopY: topYNorm + charHNorm * 0.85,
          footH: charHNorm * 0.15,
          leftFootCx: feetSplit.lCx,
          rightFootCx: feetSplit.rCx,
          footW: Math.max(0.07, Math.min(0.17, (feetSplit.lW + feetSplit.rW) * 0.5))
        };
      }
    }

    // Estabilizar el ancho de cabeza y torso de toda la fila usando col 0 (idle) como referencia
    const idleA = outCanvas._cellAnchors[`${row}_0`];
    if (idleA) {
      for (let col = 1; col < 5; col++) {
        const a = outCanvas._cellAnchors[`${row}_${col}`];
        if (a) {
          a.headW = idleA.headW;
          a.torsoW = idleA.torsoW;
        }
      }
    }
  }

  return outCanvas;
}

export function getGrid3x5CellAnchors(img, rowIndex = 0, colIndex = 0) {
  if (!img || !img._cellAnchors) return null;
  const r = Math.max(0, Math.min(2, Math.floor(rowIndex)));
  const c = Math.max(0, Math.min(4, Math.floor(colIndex)));
  return img._cellAnchors[`${r}_${c}`] || img._cellAnchors[`${r}_0`] || null;
}

// Mapa 4x4 de la hoja ai_systems_sheet.png generada con Nano Banana sobre fondo magenta (#FF00FF)
export const AI_SYSTEM_ICON_GRID_MAP = {
  enojo: { row: 0, col: 0 },
  feliz: { row: 0, col: 1 },
  sueno: { row: 0, col: 2 },
  ayuda: { row: 0, col: 3 },
  siguiendo: { row: 1, col: 0 },
  sigilo: { row: 1, col: 1 },
  chisme: { row: 1, col: 2 },
  territorio: { row: 1, col: 3 },
  talar: { row: 2, col: 0 },
  madera: { row: 2, col: 0 },
  minar: { row: 2, col: 1 },
  mineral: { row: 2, col: 1 },
  reparar: { row: 2, col: 2 },
  trabajo: { row: 2, col: 2 },
  comida: { row: 2, col: 3 },
  disfraz_alba: { row: 3, col: 0 },
  disfraz_hierro: { row: 3, col: 1 },
  elixir_forja: { row: 3, col: 2 },
  portal_hielo: { row: 3, col: 3 }
};

/**
 * Recorta el fondo magenta sólido (#FF00FF) y limpia cualquier borde magenta por compresión.
 */
export function removeMagentaChromaKey(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const total = w * h;
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const r = d[p];
      const g = d[p + 1];
      const b = d[p + 2];
      if (r >= 170 && b >= 170 && g <= 115 && r + b - g * 2 >= 200) {
        d[p + 3] = 0;
      }
    }
    // Pasada de limpieza de halo magenta en píxeles adyacentes a transparente
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const p = idx * 4;
        if (d[p + 3] === 0) continue;
        const r = d[p];
        const g = d[p + 1];
        const b = d[p + 2];
        if (r >= 145 && b >= 145 && g <= 125 && r + b - g * 2 >= 150) {
          if (
            d[(idx - 1) * 4 + 3] === 0 ||
            d[(idx + 1) * 4 + 3] === 0 ||
            d[(idx - w) * 4 + 3] === 0 ||
            d[(idx + w) * 4 + 3] === 0
          ) {
            d[p + 3] = 0;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    return img;
  }
  return c;
}

export function drawAiSystemIcon(ctx, iconKey, cx, cy, size = 20) {
  const sheet = getAsset('ai_systems_sheet');
  const cell = AI_SYSTEM_ICON_GRID_MAP[iconKey];
  if (!sheet || !cell) return false;
  const totalW = sheet.naturalWidth || sheet.width;
  const totalH = sheet.naturalHeight || sheet.height;
  if (!totalW || !totalH) return false;
  const cellW = Math.floor(totalW / 4);
  const cellH = Math.floor(totalH / 4);
  const pad = Math.floor(cellW * 0.06);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    cell.col * cellW + pad,
    cell.row * cellH + pad,
    cellW - pad * 2,
    cellH - pad * 2,
    Math.round(cx - size * 0.5),
    Math.round(cy - size * 0.5),
    Math.round(size),
    Math.round(size)
  );
  ctx.restore();
  return true;
}

function loadSingleAsset(key, config) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        loadedAssets.set(key, img);
        if (config.magentaKey) {
          processedSprites.set(key, removeMagentaChromaKey(img));
        } else if (config.grid3x5) {
          const gridCanvas = processGrid3x5SpriteSheet(img, 230);
          processedSprites.set(key, gridCanvas);
        } else if (config.floodFill) {
          const cleanCanvas = removeWhiteBackgroundFloodFill(img);
          if (key.startsWith('mascota_') || key.startsWith('jefe_')) {
            try {
              const dataUrl = cleanCanvas.toDataURL('image/png');
              if (key.startsWith('mascota_')) processedPetPortraits.set(key, dataUrl);
              if (key.startsWith('jefe_')) processedBossPortraits.set(key, dataUrl);
            } catch {
              // fallback
            }
          }
          const finalSpriteCanvas = synthesizeFourFrameSheet(cleanCanvas, key);
          processedSprites.set(key, finalSpriteCanvas);
        } else {
          processedSprites.set(key, img);
        }

        if (key === 'iconos_equipo') {
          buildEquipmentIconsCache(img);
        } else if (key === 'iconos_habilidades') {
          buildSkillIconsCache(img);
        }

        notifyAssetListeners();
      } catch (err) {
        console.warn('[assetLoader] Error procesando asset:', key, err);
        processedSprites.set(key, img);
      }
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = config.path;
  });
}

/**
 * Inicia la precarga asíncrona de los 18 assets.
 */
export function preloadAllGameAssets() {
  if (preloadPromise) return preloadPromise;
  const tasks = Object.entries(ASSET_MANIFEST).map(([key, cfg]) => loadSingleAsset(key, cfg));
  preloadPromise = Promise.allSettled(tasks).then((results) => {
    notifyAssetListeners();
    return results;
  });
  return preloadPromise;
}

/**
 * Obtiene el sprite procesado (con Flood-Fill si aplica) o null si aún no está listo (para usar fallback).
 */
export function getAsset(key) {
  return processedSprites.get(key) || loadedAssets.get(key) || null;
}

/**
 * Obtiene el sprite de héroe o heroína según clase ('guerrero', 'mago', 'arquero'),
 * sexo ('male' | 'female'), bando ('alba' | 'hierro') y raza ('Humano', 'Elfo', 'Enano', 'Orco', 'Lobo Guerrero', 'Nómada').
 */
export function getHeroClassAsset(clase, gender = 'male', faction = 'alba', race = 'Humano') {
  const isFem = gender === 'female';
  const isHierro = faction === 'hierro' || race === 'Orco' || race === 'Lobo Guerrero' || race === 'Nómada';

  // Si es Guerrero/Guerrera Orco o Lobo Guerrero, usar sus modelos dedicados de raza
  if (clase === 'guerrero') {
    if (race === 'Orco') {
      return getAsset(isFem ? 'heroina_orca' : 'heroe_orco') || getAsset(isFem ? 'heroina_guerrera_hierro' : 'heroe_guerrero_hierro');
    }
    if (race === 'Lobo Guerrero') {
      return getAsset(isFem ? 'heroina_loba' : 'heroe_lobo') || getAsset(isFem ? 'heroina_guerrera_hierro' : 'heroe_guerrero_hierro');
    }
    if (isHierro) {
      return getAsset(isFem ? 'heroina_guerrera_hierro' : 'heroe_guerrero_hierro') || getAsset(isFem ? 'heroina_guerrera' : 'heroe_guerrero');
    }
    return getAsset(isFem ? 'heroina_guerrera' : 'heroe_guerrero') || getAsset('heroina_guerrera');
  }

  if (clase === 'mago') {
    if (isHierro) {
      return getAsset(isFem ? 'heroina_maga_hierro' : 'heroe_mago_hierro') || getAsset(isFem ? 'heroina_maga' : 'heroe_mago');
    }
    return getAsset(isFem ? 'heroina_maga' : 'heroe_mago') || getAsset('heroina_maga');
  }

  if (clase === 'arquero') {
    if (isHierro) {
      return getAsset(isFem ? 'heroina_arquera_hierro' : 'heroe_arquero_hierro') || getAsset(isFem ? 'heroina_arquera' : 'heroe_arquero');
    }
    return getAsset(isFem ? 'heroina_arquera' : 'heroe_arquero') || getAsset('heroina_arquera');
  }

  return getAsset(isFem ? 'heroina_guerrera' : 'heroe_guerrero') || getAsset('heroina_guerrera');
}

/**
 * Obtiene el sprite de NPC o muñeco de entrenamiento según kind ('tabernero', 'herrero', 'mercader', 'guardia_alba', 'guardia_hierro', 'dummy').
 */
export function getNpcAsset(kind) {
  if (kind === 'dummy') return getAsset('prop_muneco');
  if (kind === 'herrero') return getAsset('npc_herrero');
  if (kind === 'mercader') return getAsset('npc_mercader') || getAsset('npc_tabernero');
  if (kind === 'tabernero') return getAsset('npc_tabernero');
  if (kind === 'guardia_alba') return getAsset('npc_guardia_alba') || getAsset('heroe_guerrero');
  if (kind === 'guardia_hierro') return getAsset('npc_guardia_hierro') || getAsset('heroe_orco') || getAsset('heroe_guerrero');
  return null;
}

/**
 * Obtiene el sprite de enemigo común o regional según kind ('lobo', 'lobo_invernal', 'trasgo', 'mago_sombrio', 'nomada', 'esqueleto', 'caballero_vacio', 'golem_hielo', 'escorpion', 'elemental').
 */
export function getEnemyAsset(kind) {
  if (kind === 'lobo_invernal') return getAsset('enemigo_lobo_invernal') || getAsset('enemigo_lobo');
  if (kind === 'lobo') return getAsset('enemigo_lobo');
  if (kind === 'mago_sombrio') return getAsset('enemigo_mago_sombrio') || getAsset('enemigo_trasgo');
  if (kind === 'nomada') return getAsset('enemigo_nomada') || getAsset('enemigo_trasgo');
  if (kind === 'trasgo') return getAsset('enemigo_trasgo');
  if (kind === 'caballero_vacio') return getAsset('enemigo_caballero_vacio') || getAsset('enemigo_esqueleto');
  if (kind === 'esqueleto') return getAsset('enemigo_esqueleto');
  if (kind === 'golem_hielo') return getAsset('enemigo_golem_hielo') || getAsset('enemigo_elemental');
  if (kind === 'escorpion') return getAsset('enemigo_escorpion') || getAsset('enemigo_elemental');
  if (kind === 'elemental') return getAsset('enemigo_elemental');
  return null;
}

/**
 * Obtiene la hoja 3x5 de cuerpo base sin armadura según raza ('Humano', 'Elfo', 'Enano', 'Orco', 'Lobo Guerrero')
 * y sexo ('male' | 'female'). Si la raza aún no tiene hoja propia (ej. 'Nómada'), retorna null para usar el fallback.
 */
export function getBaseRace3x5Asset(race = 'Humano', gender = 'male') {
  const isFem = gender === 'female';
  const r = String(race || '').toLowerCase();
  if (r.includes('human')) return getAsset(isFem ? 'base_humano_f' : 'base_humano_m');
  if (r.includes('elf')) return getAsset(isFem ? 'base_elfo_f' : 'base_elfo_m');
  if (r.includes('enan')) return getAsset(isFem ? 'base_enana_f' : 'base_enano_m');
  if (r.includes('orc')) return getAsset(isFem ? 'base_orca_f' : 'base_orco_m');
  if (r.includes('lobo')) return getAsset(isFem ? 'base_lobo_f' : 'base_lobo_m');
  if (r.includes('nomad') || r.includes('nómad')) return getAsset(isFem ? 'base_nomada_f' : 'base_nomada_m');
  return null;
}

/**
 * Detecta automáticamente si un sprite es:
 *  1) Una hoja en cuadrícula 3x5 (5 columnas de acción × 3 filas de ángulo: row 0=frente, 1=lado, 2=espalda;
 *     col 0=idle, 1=walk_1, 2=walk_2, 3=jump, 4=attack),
 *  2) Un spritesheet horizontal de 4 cuadros (ancho >= 2.2 * alto), o
 *  3) Una imagen de 1 solo cuadro.
 */
export function getSpriteFrameMetrics(img, frameIndex = 0, rowIndex = 0) {
  const totalW = img.naturalWidth || img.width || 64;
  const totalH = img.naturalHeight || img.height || 64;
  const isGrid3x5 =
    img?.dataset?.grid3x5 === 'true' ||
    (totalW >= 500 && totalH >= 300 && Math.abs(totalW / totalH - 1024 / 571) < 0.22);

  if (isGrid3x5) {
    const frameWidth = Math.floor(totalW / 5);
    const frameHeight = Math.floor(totalH / 3);
    const clampedCol = Math.max(0, Math.min(4, Math.floor(frameIndex)));
    const clampedRow = Math.max(0, Math.min(2, Math.floor(rowIndex)));
    return {
      isGrid3x5: true,
      isFourFrameSheet: false,
      frameCount: 5,
      rowCount: 3,
      frameWidth,
      frameHeight,
      sx: clampedCol * frameWidth,
      sy: clampedRow * frameHeight,
      aspect: frameWidth / Math.max(1, frameHeight)
    };
  }

  const isFourFrameSheet = totalW >= totalH * 2.2;
  const frameCount = isFourFrameSheet ? 4 : 1;
  const frameWidth = isFourFrameSheet ? Math.floor(totalW / 4) : totalW;
  const frameHeight = totalH;
  const clampedFrame = isFourFrameSheet ? Math.max(0, Math.min(3, Math.floor(frameIndex))) : 0;
  const sx = clampedFrame * frameWidth;
  return {
    isGrid3x5: false,
    isFourFrameSheet,
    frameCount,
    rowCount: 1,
    frameWidth,
    frameHeight,
    sx,
    sy: 0,
    aspect: frameWidth / Math.max(1, frameHeight)
  };
}

/**
 * Dibuja un sprite (cuadrícula 3x5, spritesheet de 4 cuadros o imagen de 1 cuadro)
 * anclado exactamente en la base de los pies (footX, footY), con soporte de fila de ángulo (rowIndex),
 * columna de acción (frameIndex), espejo horizontal (flipX), squash-and-stretch (scaleX, scaleY) y filtro.
 */
export function drawFootAnchoredSprite(
  ctx,
  img,
  footX,
  footY,
  targetHeight,
  {
    frameIndex = 0,
    rowIndex = 0,
    flipX = false,
    tiltRad = 0,
    scaleX = 1,
    scaleY = 1,
    filter = null,
    alpha = 1
  } = {}
) {
  if (!img) return null;
  const m = getSpriteFrameMetrics(img, frameIndex, rowIndex);
  const drawH = targetHeight * scaleY;
  const drawW = targetHeight * m.aspect * scaleX;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (filter) ctx.filter = filter;
  ctx.translate(Math.round(footX), Math.round(footY));
  if (tiltRad !== 0) ctx.rotate(tiltRad);
  if (flipX) ctx.scale(-1, 1);

  ctx.drawImage(
    img,
    m.sx,
    m.sy,
    m.frameWidth,
    m.frameHeight,
    Math.round(-drawW / 2),
    Math.round(-drawH),
    Math.round(drawW),
    Math.round(drawH)
  );
  ctx.restore();
  return { drawW, drawH, isFourFrameSheet: m.isFourFrameSheet, isGrid3x5: m.isGrid3x5 };
}

/**
 * Reproduce un spritesheet de efectos en cuadrícula (cols x rows, celdas de 100x100px)
 * según el progreso normalizado [0..1] sin asignaciones de memoria por cuadro.
 */
export function drawGridEffectSprite(ctx, assetKey, cx, cy, size, progress, alpha = 1) {
  const img = getAsset(assetKey);
  const cfg = ASSET_MANIFEST[assetKey];
  if (!img || !cfg || !cfg.gridCols || !cfg.gridRows) return false;

  const totalW = img.naturalWidth || img.width;
  const totalH = img.naturalHeight || img.height;
  if (!totalW || !totalH) return false;

  const cols = cfg.gridCols;
  const rows = cfg.gridRows;
  const totalFrames = cfg.frameCount || cols * rows;
  const frameW = Math.floor(totalW / cols);
  const frameH = Math.floor(totalH / rows);
  const idx = Math.max(0, Math.min(totalFrames - 1, Math.floor(progress * totalFrames)));
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(
    img,
    col * frameW,
    row * frameH,
    frameW,
    frameH,
    Math.round(cx - size * 0.5),
    Math.round(cy - size * 0.5),
    Math.round(size),
    Math.round(size)
  );
  ctx.restore();
  return true;
}

/**
 * Dibuja un sprite recortado desde map_assets_sheet.png (estático o secuencia en bucle).
 */
export function drawMapSheetSprite(ctx, spriteId, dx, dy, dw = null, dh = null, time = 0) {
  const sheet = getAsset('map_assets_sheet');
  const entry = MAP_SHEET_ATLAS[spriteId];
  if (!sheet || !entry) return false;

  let frame = entry;
  if (Array.isArray(entry.frames)) {
    const idx = Math.floor(time * (entry.fps || 5)) % entry.frames.length;
    frame = entry.frames[idx];
  }
  const outW = dw || frame.w;
  const outH = dh || frame.h;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, Math.round(dx), Math.round(dy), Math.round(outW), Math.round(outH));
  ctx.restore();
  return true;
}

/**
 * Dibuja uno de los 15 tiles de terreno/transición desde tiles_terreno_nuevos.png.
 */
export function drawTerrainTile(ctx, tileKey, dx, dy, dw = 64, dh = 64) {
  const sheet = getAsset('tiles_terreno_nuevos');
  const entry = TERRAIN_TILES_ATLAS[tileKey];
  if (!sheet || !entry) return false;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  ctx.restore();
  return true;
}

/**
 * Dibuja un elemento o estructura desde props_y_estructuras_sheet.png (Paquetes 1, 2 y 3).
 */
export function drawPropStructureSprite(ctx, key, dx, dy, dw = null, dh = null, rotate90 = false) {
  const sheet = getAsset('props_y_estructuras_sheet');
  const entry = PROPS_STRUCTURES_ATLAS[key];
  if (!sheet || !entry) return false;

  const outW = dw || entry.w;
  const outH = dh || entry.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (rotate90) {
    ctx.translate(Math.round(dx + outW / 2), Math.round(dy + outH / 2));
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, -Math.round(outH / 2), -Math.round(outW / 2), Math.round(outH), Math.round(outW));
  } else {
    ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, Math.round(dx), Math.round(dy), Math.round(outW), Math.round(outH));
  }
  ctx.restore();
  return true;
}

/**
 * Dibuja un bloque o textura continua desde seamless_tiles_sheet.png.
 */
export function drawSeamlessTileSprite(ctx, key, dx, dy, dw = null, dh = null, flipX = false) {
  const sheet = getAsset('seamless_tiles_sheet');
  const entry = SEAMLESS_TILES_ATLAS[key];
  if (!sheet || !entry) return false;

  const outW = dw || entry.w;
  const outH = dh || entry.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(Math.round(dx + outW), Math.round(dy));
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, 0, 0, Math.round(outW), Math.round(outH));
  } else {
    ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, Math.round(dx), Math.round(dy), Math.round(outW), Math.round(outH));
  }
  ctx.restore();
  return true;
}

/**
 * Dibuja un sprite desde world_upgrades_sheet.png (puentes verticales nativos, lagos orgánicos, arenas de jefes, rieles, portal, fuente, armero, rocas).
 */
export function drawWorldUpgradeSprite(ctx, key, dx, dy, dw = null, dh = null) {
  const sheet = getAsset('world_upgrades_sheet');
  const entry = WORLD_UPGRADES_ATLAS[key];
  if (!sheet || !entry) return false;

  const outW = dw || entry.w;
  const outH = dh || entry.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, Math.round(dx), Math.round(dy), Math.round(outW), Math.round(outH));
  ctx.restore();
  return true;
}

/**
 * Dibuja uno de los 11 escenarios 16-bit de ui_backdrops_sheet.png para ventanas de Personaje, Montura, Mascotas y Jefes.
 */
export function drawUiBackdrop(ctx, key, dx, dy, dw, dh) {
  const sheet = getAsset('ui_backdrops_sheet');
  const entry = UI_BACKDROPS_ATLAS[key];
  if (!sheet || !entry) return false;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, entry.x, entry.y, entry.w, entry.h, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  ctx.restore();
  return true;
}

/**
 * Dibuja el marco perimetral completo de 8 piezas (Norte, Sur, Oeste, Este + 4 Esquinas NO, NE, SO, SE)
 * para el bioma ('bosque' | 'cueva' | 'desierto' | 'nieve') usando 9-Slice desde map_borders_sheet.png.
 */
export function drawBiomePerimeterFrame(ctx, biomeKey, W, H) {
  const sheet = getAsset('map_borders_sheet');
  const e = MAP_BORDERS_ATLAS[biomeKey] || MAP_BORDERS_ATLAS.bosque;
  if (!sheet || !e) return false;

  const srcLeftW = e.hx;
  const srcRightW = e.w - (e.hx + e.hw);
  const srcTopH = e.hy;
  const srcBotH = e.h - (e.hy + e.hh);

  const sideW = 40;
  const topH = 44;
  const botH = 42;
  const segLen = 220;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Borde Norte (Top) y Borde Sur (Bottom) con espejo horizontal alternado para empalme continuo
  ctx.save();
  ctx.beginPath();
  ctx.rect(sideW, 0, W - sideW * 2, H);
  ctx.clip();
  let idxX = 0;
  for (let bx = sideW; bx < W - sideW; bx += segLen) {
    const flip = idxX % 2 === 1;
    // Norte
    ctx.save();
    if (flip) {
      ctx.translate(Math.round(bx + segLen), 0);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, e.x + e.hx, e.y, e.hw, srcTopH, 0, 0, segLen + 1, topH);
    } else {
      ctx.drawImage(sheet, e.x + e.hx, e.y, e.hw, srcTopH, Math.round(bx), 0, segLen + 1, topH);
    }
    ctx.restore();

    // Sur
    ctx.save();
    if (flip) {
      ctx.translate(Math.round(bx + segLen), H - botH);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, e.x + e.hx, e.y + e.hy + e.hh, e.hw, srcBotH, 0, 0, segLen + 1, botH);
    } else {
      ctx.drawImage(sheet, e.x + e.hx, e.y + e.hy + e.hh, e.hw, srcBotH, Math.round(bx), H - botH, segLen + 1, botH);
    }
    ctx.restore();
    idxX++;
  }
  ctx.restore();

  // 2. Borde Oeste (Left) y Borde Este (Right) con espejo vertical alternado para empalme continuo
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, topH, W, H - topH - botH);
  ctx.clip();
  let idxY = 0;
  for (let by = topH; by < H - botH; by += segLen) {
    const flip = idxY % 2 === 1;
    // Oeste (Izquierda)
    ctx.save();
    if (flip) {
      ctx.translate(0, Math.round(by + segLen));
      ctx.scale(1, -1);
      ctx.drawImage(sheet, e.x, e.y + e.hy, srcLeftW, e.hh, 0, 0, sideW, segLen + 1);
    } else {
      ctx.drawImage(sheet, e.x, e.y + e.hy, srcLeftW, e.hh, 0, Math.round(by), sideW, segLen + 1);
    }
    ctx.restore();

    // Este (Derecha)
    ctx.save();
    if (flip) {
      ctx.translate(W - sideW, Math.round(by + segLen));
      ctx.scale(1, -1);
      ctx.drawImage(sheet, e.x + e.hx + e.hw, e.y + e.hy, srcRightW, e.hh, 0, 0, sideW, segLen + 1);
    } else {
      ctx.drawImage(sheet, e.x + e.hx + e.hw, e.y + e.hy, srcRightW, e.hh, W - sideW, Math.round(by), sideW, segLen + 1);
    }
    ctx.restore();
    idxY++;
  }
  ctx.restore();

  // 3. Las 4 Esquinas (NO, NE, SO, SE) en su orientación natural
  ctx.drawImage(sheet, e.x, e.y, srcLeftW, srcTopH, 0, 0, sideW, topH);
  ctx.drawImage(sheet, e.x + e.hx + e.hw, e.y, srcRightW, srcTopH, W - sideW, 0, sideW, topH);
  ctx.drawImage(sheet, e.x, e.y + e.hy + e.hh, srcLeftW, srcBotH, 0, H - botH, sideW, botH);
  ctx.drawImage(sheet, e.x + e.hx + e.hw, e.y + e.hy + e.hh, srcRightW, srcBotH, W - sideW, H - botH, sideW, botH);

  ctx.restore();
  return true;
}

/**
 * Obtiene el sprite de mascota según petId ('lobo_blanco', 'fantasma_hoz', 'gato_volador', 'dragon_negro' o 'dragon_rojo').
 */
export function getPetAsset(petId) {
  const map = {
    lobo_blanco: 'mascota_lobo',
    fantasma_hoz: 'mascota_fantasma',
    gato_volador: 'mascota_gato',
    dragon_negro: 'mascota_dragon',
    dragon_rojo: 'mascota_dragon'
  };
  return getAsset(map[petId] || 'mascota_lobo');
}

/**
 * Obtiene el DataURL transparente de la mascota para tarjetas HTML.
 */
export function getPetPortraitDataUrl(petId) {
  const map = {
    lobo_blanco: 'mascota_lobo',
    fantasma_hoz: 'mascota_fantasma',
    gato_volador: 'mascota_gato',
    dragon_negro: 'mascota_dragon',
    dragon_rojo: 'mascota_dragon'
  };
  return processedPetPortraits.get(map[petId] || 'mascota_lobo') || null;
}

/**
 * Obtiene el sprite de jefe según bossKey ('malakor', 'ignis', 'boreas', 'vaelor').
 */
export function getBossAsset(bossKey) {
  const cleanKey = String(bossKey || '').toLowerCase();
  if (cleanKey.includes('malakor')) return getAsset('jefe_malakor');
  if (cleanKey.includes('ignis')) return getAsset('jefe_ignis');
  if (cleanKey.includes('boreas')) return getAsset('jefe_boreas');
  if (cleanKey.includes('vaelor')) return getAsset('jefe_vaelor');
  return getAsset(`jefe_${cleanKey}`);
}

/**
 * Obtiene el DataURL transparente del jefe para tarjetas HTML.
 */
export function getBossPortraitDataUrl(bossKey) {
  const cleanKey = String(bossKey || '').toLowerCase();
  if (cleanKey.includes('malakor')) return processedBossPortraits.get('jefe_malakor') || null;
  if (cleanKey.includes('ignis')) return processedBossPortraits.get('jefe_ignis') || null;
  if (cleanKey.includes('boreas')) return processedBossPortraits.get('jefe_boreas') || null;
  if (cleanKey.includes('vaelor')) return processedBossPortraits.get('jefe_vaelor') || null;
  return processedBossPortraits.get(`jefe_${cleanKey}`) || null;
}

/**
 * Obtiene la URL del icono individual en ./assets/icons/ o el DataURL recortado de iconos_equipo.png / iconos_habilidades.png.
 */
export function getEquipIconUrl(keyOrItemId) {
  const directKey = ICON_ASSET_MAP[keyOrItemId];
  if (directKey && ASSET_MANIFEST[directKey]) {
    return ASSET_MANIFEST[directKey].path;
  }
  const cell = EQUIP_ICON_GRID_MAP[keyOrItemId];
  if (cell) {
    const url = croppedIconDataUrls.get(`${cell.row}_${cell.col}`);
    if (url) return url;
  }
  const skillCell = SKILL_ICON_GRID_MAP[keyOrItemId];
  if (skillCell) {
    return croppedSkillIconDataUrls.get(`${skillCell.row}_${skillCell.col}`) || null;
  }
  return null;
}

/**
 * Obtiene la imagen cargada (HTMLImageElement/Canvas) del icono 16-bit de un ítem/gema para dibujarla en el suelo del mapa, idéntica a la Mochila y la Tienda.
 */
export function getItemIconAsset(keyOrItemId) {
  const directKey = ICON_ASSET_MAP[keyOrItemId];
  if (directKey) {
    const img = getAsset(directKey);
    if (img) return img;
  }
  return null;
}

/**
 * Obtiene la URL 16-bit de ataque o habilidad desde ./assets/icons/ o iconos_habilidades.png según clase y ranura (0..3) o id.
 */
export function getSkillIconUrl(heroClassOrId, slot = null) {
  const lookupKey = slot !== null ? `${heroClassOrId}_${slot}` : heroClassOrId;
  const directKey = ICON_ASSET_MAP[lookupKey];
  if (directKey && ASSET_MANIFEST[directKey]) {
    return ASSET_MANIFEST[directKey].path;
  }
  const cell = SKILL_ICON_GRID_MAP[lookupKey];
  if (!cell) return null;
  return croppedSkillIconDataUrls.get(`${cell.row}_${cell.col}`) || null;
}

// Disparar precarga de inmediato al importar el módulo
if (typeof window !== 'undefined') {
  preloadAllGameAssets();
}
