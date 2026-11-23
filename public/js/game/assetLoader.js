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

  // Heroínas / Clases (3)
  heroina_guerrera: { path: './assets/heroina_guerrera.png', floodFill: true },
  heroina_maga: { path: './assets/heroina_maga.png', floodFill: true },
  heroina_arquera: { path: './assets/heroina_arquera.png', floodFill: true },

  // Entorno e Iconos (4)
  tile_cesped: { path: './assets/tile_cesped.png', floodFill: false },
  tile_adoquin: { path: './assets/tile_adoquin.png', floodFill: false },
  prop_arbol: { path: './assets/prop_arbol.png', floodFill: true },
  iconos_equipo: { path: './assets/iconos_equipo.png', floodFill: false }
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

const loadedAssets = new Map();
const processedSprites = new Map();
const croppedIconDataUrls = new Map();
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

function loadSingleAsset(key, config) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      loadedAssets.set(key, img);
      if (config.floodFill) {
        const cleanCanvas = removeWhiteBackgroundFloodFill(img);
        processedSprites.set(key, cleanCanvas);
        try {
          const dataUrl = cleanCanvas.toDataURL('image/png');
          if (key.startsWith('mascota_')) processedPetPortraits.set(key, dataUrl);
          if (key.startsWith('jefe_')) processedBossPortraits.set(key, dataUrl);
        } catch {
          // fallback
        }
      } else {
        processedSprites.set(key, img);
      }

      if (key === 'iconos_equipo') {
        buildEquipmentIconsCache(img);
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
 * Obtiene el sprite de heroína/héroe según la clase elegida ('guerrero', 'mago', 'arquero').
 */
export function getHeroClassAsset(clase) {
  if (clase === 'mago') return getAsset('heroina_maga');
  if (clase === 'arquero') return getAsset('heroina_arquera');
  return getAsset('heroina_guerrera');
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
 * Obtiene el DataURL de un icono recortado de la hoja 4x4 iconos_equipo.png según slotKey o itemId.
 */
export function getEquipIconUrl(keyOrItemId) {
  const cell = EQUIP_ICON_GRID_MAP[keyOrItemId];
  if (!cell) return null;
  return croppedIconDataUrls.get(`${cell.row}_${cell.col}`) || null;
}

// Disparar precarga de inmediato al importar el módulo
if (typeof window !== 'undefined') {
  preloadAllGameAssets();
}
