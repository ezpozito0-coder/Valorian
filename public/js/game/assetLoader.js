/**
 * assetLoader.js
 * Precarga asíncrona de los 18 assets Pixel Art (./assets/...) con recorte inteligente
 * de fondo blanco mediante BFS Flood-Fill desde las 4 esquinas/bordes y grilla 4x4 de iconos.
 */

export const ASSET_MANIFEST = {
  // Fondos (3)
  bg_campamento: { path: './assets/bg_campamento.png', floodFill: false },
  bg_creacion: { path: './assets/bg_creacion.png', floodFill: false },
  mapa_valoria: { path: './assets/mapa_valoria.png', floodFill: false },

  // Jefes (4)
  jefe_malakor: { path: './assets/jefe_malakor.png', floodFill: true },
  jefe_ignis: { path: './assets/jefe_ignis.png', floodFill: true },
  jefe_boreas: { path: './assets/jefe_boreas.png', floodFill: true },
  jefe_vaelor: { path: './assets/jefe_vaelor.png', floodFill: true },

  // Mascotas (4)
  mascota_lobo: { path: './assets/mascota_lobo.png', floodFill: true },
  mascota_fantasma: { path: './assets/mascota_fantasma.png', floodFill: true },
  mascota_gato: { path: './assets/mascota_gato.png', floodFill: true },
  mascota_dragon: { path: './assets/mascota_dragon.png', floodFill: true },

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
  prop_cristal_vacio: { path: './assets/prop_cristal_vacio.png', floodFill: false },
  prop_altar_jefe: { path: './assets/prop_altar_jefe.png', floodFill: false },

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
  fx_level_up: { path: './assets/fx_level_up.png', floodFill: false }
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
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);

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
      if (data[p0] < 245 || data[p0 + 1] < 245 || data[p0 + 2] < 245) continue;

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
          if (nr >= 218 && ng >= 218 && nb >= 218 && Math.abs(nr - ng) <= 18 && Math.abs(ng - nb) <= 18) {
            if (!holeVisited[nIdx]) {
              holeVisited[nIdx] = 1;
              compPixels.push(nIdx);
            }
          } else {
            // Es píxel frontera del hueco
            const luma = (nr + ng + nb) / 3;
            if (luma < 140) darkBorderCount++;
            else lightBorderCount++;
          }
        }
      }

      // Si el hueco blanco está rodeado por línea de contorno oscuro, es fondo encerrado
      if (compPixels.length >= 16 && darkBorderCount >= lightBorderCount * 0.45) {
        for (let k = 0; k < compPixels.length; k++) {
          const cIdx = compPixels[k];
          visited[cIdx] = 1;
          data[cIdx * 4 + 3] = 0;
        }
      }
    }
  }

  // Limpieza suave de halo de 1px en la frontera inmediata con el fondo eliminado
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
        if (r > 212 && g > 212 && b > 212 && Math.abs(r - g) <= 20 && Math.abs(g - b) <= 20) {
          data[p + 3] = 0;
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
  const totalW = img.naturalWidth || img.width;
  const totalH = img.naturalHeight || img.height;
  if (!totalW || !totalH) return img;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = totalW;
  srcCanvas.height = totalH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  srcCtx.imageSmoothingEnabled = false;
  srcCtx.drawImage(img, 0, 0);

  const cellW = Math.floor(totalW / 5);
  const cellH = Math.floor(totalH / 3);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cellW * 5;
  outCanvas.height = cellH * 3;
  outCanvas.dataset.grid3x5 = 'true';
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;

  // Margen perimetral para descartar las líneas negras/grises divisorias de la cuadrícula
  const borderPadX = Math.max(4, Math.round(cellW * 0.035));
  const borderPadY = Math.max(4, Math.round(cellH * 0.035));

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

      // Limpiar franja de líneas divisorias en los 4 bordes de la celda
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          if (x < borderPadX || x >= cellW - borderPadX || y < borderPadY || y >= cellH - borderPadY) {
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
        enqueue(x, borderPadY);
        enqueue(x, cellH - 1 - borderPadY);
      }
      for (let y = 0; y < cellH; y++) {
        enqueue(borderPadX, y);
        enqueue(cellW - 1 - borderPadX, y);
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
        const dstX = col * cellW + Math.round((cellW - charW) / 2);
        // En col === 3 (jump) dejamos un pequeño margen inferior para que las piernas encogidas se vean en el aire
        const bottomMargin = col === 3 ? Math.round(cellH * 0.06) : 2;
        const dstY = row * cellH + (cellH - charH - bottomMargin);
        outCtx.drawImage(tmp, minX, minY, charW, charH, dstX, dstY, charW, charH);
      }
    }
  }

  return outCanvas;
}

function loadSingleAsset(key, config) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      loadedAssets.set(key, img);
      if (config.grid3x5) {
        const gridCanvas = processGrid3x5SpriteSheet(img, 230);
        processedSprites.set(key, gridCanvas);
      } else if (config.floodFill) {
        const cleanCanvas = removeWhiteBackgroundFloodFill(img);
        try {
          const dataUrl = cleanCanvas.toDataURL('image/png');
          if (key.startsWith('mascota_')) processedPetPortraits.set(key, dataUrl);
          if (key.startsWith('jefe_')) processedBossPortraits.set(key, dataUrl);
        } catch {
          // fallback
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
 * Obtiene el DataURL de un icono recortado de iconos_equipo.png o iconos_habilidades.png según clave.
 */
export function getEquipIconUrl(keyOrItemId) {
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
 * Obtiene el DataURL 16-bit de ataque o habilidad desde iconos_habilidades.png según clase y ranura (0..3) o id.
 */
export function getSkillIconUrl(heroClassOrId, slot = null) {
  const lookupKey = slot !== null ? `${heroClassOrId}_${slot}` : heroClassOrId;
  const cell = SKILL_ICON_GRID_MAP[lookupKey];
  if (!cell) return null;
  return croppedSkillIconDataUrls.get(`${cell.row}_${cell.col}`) || null;
}

// Disparar precarga de inmediato al importar el módulo
if (typeof window !== 'undefined') {
  preloadAllGameAssets();
}
