/**
 * Generador y caché de texturas Pixel Art 16-bit (64x64 offscreen patterns).
 * Cero impacto en FPS: cada patrón se dibuja una sola vez y se reutiliza en Canvas.
 */

import { getAsset, onAssetsUpdated, TERRAIN_TILES_ATLAS, PROPS_STRUCTURES_ATLAS, SEAMLESS_TILES_ATLAS } from './assetLoader.js';

const patternCache = new Map();

// Cuando terminen de cargar las imágenes (tile_cesped.png, tile_adoquin.png, tiles_terreno_nuevos.png), limpiar la caché de patrones
onAssetsUpdated(() => {
  patternCache.clear();
});

function makeImageTile(img, size = 128) {
  // Macro-tile 4x4 (Wang / espejo y rotación alternada con micro-variación de luz y detalles orgánicos)
  // para eliminar por completo el efecto de cuadrícula repetitiva al recorrer el mapa.
  const c = document.createElement('canvas');
  const grid = 4;
  c.width = size * grid;
  c.height = size * grid;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const hash = ((gx * 73 + gy * 151 + 19) * 37) & 0xff;
      const flipX = (hash & 1) === 1;
      const flipY = (hash & 2) === 2;
      const rot90 = (hash & 4) === 4;
      const cx = gx * size + size * 0.5;
      const cy = gy * size + size * 0.5;

      ctx.save();
      ctx.translate(cx, cy);
      if (rot90) ctx.rotate(Math.PI * 0.5);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(img, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();

      // Variación sutil de luminosidad por sub-celda para romper la repetición visual
      if ((hash & 3) === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.032)';
        ctx.fillRect(gx * size, gy * size, size, size);
      } else if ((hash & 3) === 2) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.045)';
        ctx.fillRect(gx * size, gy * size, size, size);
      }
    }
  }
  return c;
}

function makeSubImageTile(img, rect, size = 96, isDirectional = false) {
  const c = document.createElement('canvas');
  const grid = 4;
  c.width = size * grid;
  c.height = size * grid;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const hash = ((gx * 97 + gy * 193 + 31) * 43) & 0xff;
      const flipX = (hash & 1) === 1;
      const flipY = !isDirectional && (hash & 2) === 2;
      const cx = gx * size + size * 0.5;
      const cy = gy * size + size * 0.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();

      if ((hash & 3) === 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(gx * size, gy * size, size, size);
      } else if ((hash & 3) === 3) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(gx * size, gy * size, size, size);
      }
    }
  }
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
    makeTile(256, (ctx) => {
      px(ctx, 0, 0, 256, 256, '#56657A');
      const pal = [
        ['#94A3B8', '#CBD5E1'],
        ['#8796AB', '#B6C3D4'],
        ['#7E8DA2', '#A8B6C8'],
        ['#9AA8BC', '#E2E8F0']
      ];
      let seed = 17;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0x10000;
      };
      for (let row = 0; row < 16; row++) {
        const y = row * 16 + 2;
        const h = 13;
        let x = (row % 2 === 1) ? -12 : 2;
        while (x < 254) {
          const w = 22 + Math.floor(rnd() * 18);
          const drawX = Math.max(1, x);
          const drawW = Math.min(255 - drawX, w - (drawX - x));
          if (drawW > 6) {
            const [base, hi] = pal[Math.floor(rnd() * pal.length)];
            px(ctx, drawX, y, drawW, h, base);
            px(ctx, drawX, y, drawW, 2, hi);
            px(ctx, drawX, y, 2, h, hi);
            px(ctx, drawX, y + h - 2, drawW, 2, '#64748B');
            if (rnd() < 0.22) {
              px(ctx, drawX + 4, y + 5, Math.min(8, drawW - 6), 1, '#475569');
            }
            if (rnd() < 0.14) {
              // Musgo sutil entre adoquines
              px(ctx, drawX + 2, y + h - 2, 5, 2, '#3C783E');
            }
          }
          x += w + 2;
        }
      }
    }),

  dirt_hierro: () =>
    makeTile(256, (ctx) => {
      px(ctx, 0, 0, 256, 256, '#6B3D26');
      let seed = 73;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0x10000;
      };
      const patches = ['#78462C', '#5E3420', '#7A482D', '#633822', '#824D31'];
      for (let i = 0; i < 64; i++) {
        const x = Math.floor(rnd() * 236);
        const y = Math.floor(rnd() * 236);
        const w = 16 + Math.floor(rnd() * 28);
        const h = 10 + Math.floor(rnd() * 18);
        px(ctx, x, y, w, h, patches[i % patches.length]);
      }
      // Rocas basálticas, gravilla de hierro y grietas secas variadas
      for (let i = 0; i < 48; i++) {
        const x = 6 + Math.floor(rnd() * 242);
        const y = 6 + Math.floor(rnd() * 242);
        const isDark = rnd() < 0.5;
        px(ctx, x, y, 5, 4, isDark ? '#44403C' : '#57534E');
        px(ctx, x + 1, y, 3, 2, isDark ? '#78716C' : '#9A5B3A');
      }
      for (let i = 0; i < 26; i++) {
        const x = 8 + Math.floor(rnd() * 238);
        const y = 8 + Math.floor(rnd() * 238);
        px(ctx, x, y, 3, 5, '#4A2818');
        px(ctx, x + 2, y - 2, 2, 4, '#8C5233');
      }
    }),

  dirt_road: () =>
    makeTile(256, (ctx) => {
      px(ctx, 0, 0, 256, 256, '#8C6C47');
      let seed = 131;
      const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed & 0xffff) / 0x10000;
      };
      const tones = ['#9B7A52', '#7D5F3D', '#93724C', '#826340'];
      for (let i = 0; i < 55; i++) {
        px(
          ctx,
          Math.floor(rnd() * 232),
          Math.floor(rnd() * 236),
          16 + Math.floor(rnd() * 26),
          10 + Math.floor(rnd() * 14),
          tones[i % tones.length]
        );
      }
      for (let i = 0; i < 42; i++) {
        const x = 4 + Math.floor(rnd() * 244);
        const y = 4 + Math.floor(rnd() * 244);
        px(ctx, x, y, 5, 3, i % 2 === 0 ? '#6B5235' : '#A88962');
      }
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
    } else if (name === 'snow_ground') {
      const snowImg = getAsset('tile_nieve');
      if (snowImg) {
        const tileCanvas = makeImageTile(snowImg, 128);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
      const terrainSheet = getAsset('tiles_terreno_nuevos');
      if (terrainSheet && TERRAIN_TILES_ATLAS.terreno_nieve) {
        const tileCanvas = makeSubImageTile(terrainSheet, TERRAIN_TILES_ATLAS.terreno_nieve, 96);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    } else if (name === 'ash_sand' || name === 'desert_sand') {
      const terrainSheet = getAsset('tiles_terreno_nuevos');
      if (terrainSheet && TERRAIN_TILES_ATLAS.terreno_arena) {
        const tileCanvas = makeSubImageTile(terrainSheet, TERRAIN_TILES_ATLAS.terreno_arena, 96);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    } else if (name === 'lava_pool') {
      const seamlessSheet = getAsset('seamless_tiles_sheet');
      if (seamlessSheet && SEAMLESS_TILES_ATLAS.lava_crater) {
        const tileCanvas = makeSubImageTile(seamlessSheet, SEAMLESS_TILES_ATLAS.lava_crater, 160);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
      const terrainSheet = getAsset('tiles_terreno_nuevos');
      if (terrainSheet && TERRAIN_TILES_ATLAS.terreno_lava) {
        const tileCanvas = makeSubImageTile(terrainSheet, TERRAIN_TILES_ATLAS.terreno_lava, 96);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    } else if (name === 'corrupt_lake') {
      const seamlessSheet = getAsset('seamless_tiles_sheet');
      if (seamlessSheet && SEAMLESS_TILES_ATLAS.corrupt_pond) {
        const tileCanvas = makeSubImageTile(seamlessSheet, SEAMLESS_TILES_ATLAS.corrupt_pond, 160);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
      const terrainSheet = getAsset('tiles_terreno_nuevos');
      if (terrainSheet && TERRAIN_TILES_ATLAS.terreno_lago_corrupto) {
        const tileCanvas = makeSubImageTile(terrainSheet, TERRAIN_TILES_ATLAS.terreno_lago_corrupto, 96);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    } else if (name === 'clear_water') {
      const terrainSheet = getAsset('tiles_terreno_nuevos');
      if (terrainSheet && TERRAIN_TILES_ATLAS.terreno_agua_clara) {
        const tileCanvas = makeSubImageTile(terrainSheet, TERRAIN_TILES_ATLAS.terreno_agua_clara, 96);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
    } else if (name === 'ice_lake') {
      const seamlessSheet = getAsset('seamless_tiles_sheet');
      if (seamlessSheet && SEAMLESS_TILES_ATLAS.ice_seamless) {
        const tileCanvas = makeSubImageTile(seamlessSheet, SEAMLESS_TILES_ATLAS.ice_seamless, 190);
        patternCache.set(name, ctx.createPattern(tileCanvas, 'repeat'));
        return patternCache.get(name);
      }
      const propSheet = getAsset('props_y_estructuras_sheet');
      if (propSheet && PROPS_STRUCTURES_ATLAS.tile_lago_congelado) {
        const tileCanvas = makeSubImageTile(propSheet, PROPS_STRUCTURES_ATLAS.tile_lago_congelado, 128);
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
