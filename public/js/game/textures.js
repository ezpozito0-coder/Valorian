/**
 * Generador y caché de texturas Pixel Art 16-bit (64x64 offscreen patterns).
 * Cero impacto en FPS: cada patrón se dibuja una sola vez y se reutiliza en Canvas.
 */

import { getAsset, onAssetsUpdated } from './assetLoader.js';

const patternCache = new Map();

// Cuando terminen de cargar las imágenes (tile_cesped.png, tile_adoquin.png), limpiar la caché de patrones
onAssetsUpdated(() => {
  patternCache.clear();
});

function makeImageTile(img, size = 128) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  return c;
}

function makeTile(size, drawFn) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);
  return c;
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const TILE_BUILDERS = {
  grass_lush: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#346936');
      // Variaciones suaves de pasto
      px(ctx, 4, 6, 12, 8, '#3C783E');
      px(ctx, 34, 18, 16, 10, '#2E5E30');
      px(ctx, 14, 42, 18, 10, '#3C783E');
      px(ctx, 44, 48, 12, 8, '#2E5E30');
      // Briznas de pasto 16-bit
      [
        [8, 12], [24, 8], [50, 14], [16, 30], [40, 34], [6, 52], [30, 56], [54, 46]
      ].forEach(([x, y]) => {
        px(ctx, x, y, 2, 4, '#244C26');
        px(ctx, x + 2, y - 2, 2, 4, '#4E944F');
      });
      // Piedritas y florecitas discretas
      px(ctx, 20, 22, 4, 3, '#7C8594');
      px(ctx, 21, 22, 2, 1, '#94A3B8');
      px(ctx, 46, 26, 3, 3, '#FEF08A');
      px(ctx, 12, 48, 3, 3, '#BAE6FD');
    }),

  grass_corrupt: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#2E2B3A');
      px(ctx, 6, 8, 16, 10, '#363245');
      px(ctx, 36, 32, 18, 12, '#252230');
      // Briznas secas y motas del Vacío
      [[10, 18], [44, 14], [22, 46], [52, 50]].forEach(([x, y]) => {
        px(ctx, x, y, 2, 4, '#4B5563');
        px(ctx, x + 2, y - 1, 2, 3, '#6B7280');
      });
      px(ctx, 28, 24, 4, 2, '#6B21A8');
      px(ctx, 14, 54, 5, 2, '#4C1D95');
    }),

  cobble_alba: () =>
    makeTile(64, (ctx) => {
      // Mortero / grietas suaves
      px(ctx, 0, 0, 64, 64, '#64748B');
      const stones = [
        [2, 2, 28, 14, '#94A3B8', '#CBD5E1'],
        [32, 2, 30, 14, '#8796AB', '#B6C3D4'],
        [2, 18, 18, 14, '#8796AB', '#B6C3D4'],
        [22, 18, 26, 14, '#9AA8BC', '#CBD5E1'],
        [50, 18, 12, 14, '#7E8DA2', '#A8B6C8'],
        [2, 34, 30, 14, '#94A3B8', '#CBD5E1'],
        [34, 34, 28, 14, '#8493A8', '#B6C3D4'],
        [2, 50, 20, 12, '#8E9DB2', '#C0CDD9'],
        [24, 50, 22, 12, '#7E8DA2', '#A8B6C8'],
        [48, 50, 14, 12, '#94A3B8', '#CBD5E1']
      ];
      for (const [x, y, w, h, base, hi] of stones) {
        px(ctx, x, y, w, h, base);
        px(ctx, x, y, w, 2, hi);
        px(ctx, x, y, 2, h, hi);
        px(ctx, x, y + h - 2, w, 2, '#6E7D91');
      }
      // Grieta sutil
      px(ctx, 12, 8, 6, 1, '#526072');
      px(ctx, 42, 40, 5, 1, '#526072');
    }),

  dirt_hierro: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#6B3D26');
      px(ctx, 6, 6, 20, 12, '#78462C');
      px(ctx, 34, 24, 22, 14, '#5E3420');
      px(ctx, 10, 44, 18, 12, '#7A482D');
      // Piedras y polvo rojizo
      px(ctx, 16, 18, 5, 4, '#57534E');
      px(ctx, 17, 18, 3, 2, '#78716C');
      px(ctx, 48, 12, 4, 3, '#44403C');
      px(ctx, 38, 50, 6, 4, '#57534E');
      px(ctx, 26, 34, 3, 2, '#9A5B3A');
    }),

  dirt_road: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#8C6C47');
      px(ctx, 4, 8, 18, 10, '#9B7A52');
      px(ctx, 32, 26, 20, 12, '#7D5F3D');
      px(ctx, 12, 44, 22, 10, '#9B7A52');
      px(ctx, 22, 16, 4, 3, '#6B5235');
      px(ctx, 48, 48, 5, 3, '#A88962');
      px(ctx, 10, 32, 3, 3, '#6B5235');
    }),

  cave_stone: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#1B1628');
      px(ctx, 4, 4, 26, 24, '#221C32');
      px(ctx, 34, 8, 24, 22, '#171222');
      px(ctx, 10, 34, 28, 22, '#231D34');
      px(ctx, 42, 36, 18, 22, '#161120');
      // Grietas y destellos húmedos
      px(ctx, 14, 16, 8, 2, '#100C1A');
      px(ctx, 46, 46, 6, 2, '#3B1F54');
      px(ctx, 24, 44, 4, 3, '#475569');
    }),

  ash_sand: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#48433E');
      px(ctx, 0, 12, 32, 8, '#534D47');
      px(ctx, 28, 36, 36, 8, '#3F3A36');
      px(ctx, 8, 52, 28, 6, '#57514B');
      // Carboncillos y chispas apagadas
      px(ctx, 18, 22, 4, 3, '#292524');
      px(ctx, 48, 16, 3, 3, '#EA580C');
      px(ctx, 36, 50, 4, 3, '#292524');
    }),

  snow_ground: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#D6E2EE');
      px(ctx, 6, 8, 24, 10, '#E8F0F8');
      px(ctx, 34, 26, 24, 12, '#C2D4E6');
      px(ctx, 10, 44, 26, 10, '#EDF4FA');
      // Destellos de nieve y piedritas congeladas
      px(ctx, 16, 14, 3, 3, '#FFFFFF');
      px(ctx, 48, 42, 3, 3, '#FFFFFF');
      px(ctx, 28, 34, 4, 3, '#94A3B8');
    }),

  obsidian_floor: () =>
    makeTile(64, (ctx) => {
      px(ctx, 0, 0, 64, 64, '#0E0A18');
      // Baldosas de obsidiana 32x32 con juntas tenues moradas
      for (let y = 0; y < 64; y += 32) {
        for (let x = 0; x < 64; x += 32) {
          px(ctx, x + 2, y + 2, 28, 28, '#171126');
          px(ctx, x + 2, y + 2, 28, 2, '#261D3D');
          px(ctx, x + 2, y + 2, 2, 28, '#261D3D');
        }
      }
      px(ctx, 14, 14, 4, 2, '#4C1D95');
      px(ctx, 46, 46, 4, 2, '#581C87');
    })
};

export function getTexturePattern(ctx, name) {
  if (!patternCache.has(name)) {
    if (name === 'grass_lush') {
      const grassImg = getAsset('tile_cesped');
      if (grassImg) {
        const tileCanvas = makeImageTile(grassImg, 128);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    } else if (name === 'cobble_alba') {
      const cobbleImg = getAsset('tile_adoquin');
      if (cobbleImg) {
        const tileCanvas = makeImageTile(cobbleImg, 96);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
      } else if (name === 'grass_corrupt') {
      const corruptImg = getAsset('tile_corrupto');
      if (corruptImg) {
        const tileCanvas = makeImageTile(corruptImg, 128);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
  } else if (name === 'obsidian_floor' || name === 'cave_stone') {
      const caveImg = getAsset('tile_cueva');
      if (caveImg) {
        const tileCanvas = makeImageTile(caveImg, 128);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    }

    const builder = TILE_BUILDERS[name];
    if (!builder) return null;
    const tileCanvas = builder();
    patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
  }
  return patternCache.get(name);
}
