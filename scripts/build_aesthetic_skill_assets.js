/**
 * build_aesthetic_skill_assets.js
 * Procesa las láminas 16-bit SNES/GBA de iconos de ataque/habilidades (iconos_habilidades_raw.rgba)
 * y efectos de combate (vfx_combate_raw.rgba, vfx_proyectiles_raw.rgba):
 * 1. Recorta y elimina el fondo oscuro (#181D27) con BFS Flood-Fill + detección de huecos cerrados.
 * 2. Exporta `public/assets/iconos_habilidades.png` (grilla 4x4 limpia de 32-bit RGBA transparente)
 *    + cada icono individual en `public/assets/` si se requiere.
 * 3. Exporta los spritesheets PNG de 4 cuadros (512x128 RGBA) y GIFs animados (128x128 GIF89a)
 *    para todos los ataques, proyectiles, explosiones, novas, trampas y lluvias de flechas.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_DIR = path.join(__dirname, 'raw_models');
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

/* =========================================================
   CODIFICADORES PNG RGBA Y GIF89a ANIMADO
   ========================================================= */
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  const dict = new Map();
  let bitBuf = 0;
  let bitCount = 0;
  const out = [];

  const emit = (code) => {
    bitBuf |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    if (dict.has(key)) {
      prefix = dict.get(key);
    } else {
      emit(prefix);
      if (nextCode < 4096) {
        dict.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        dict.clear();
        codeSize = minCodeSize + 1;
        nextCode = endCode + 1;
      }
      prefix = k;
    }
  }
  emit(prefix);
  emit(endCode);
  if (bitCount > 0) out.push(bitBuf & 0xff);
  return Buffer.from(out);
}

function encodeAnimatedGIF(frameWidth, frameHeight, framesRgba, delayCs = 9) {
  const palette = [[0, 0, 0]];
  const colorMap = new Map();

  const getColorIndex = (r, g, b, a) => {
    if (a < 80) return 0;
    const qr = r & 0xf8;
    const qg = g & 0xf8;
    const qb = b & 0xf8;
    const key = (qr << 16) | (qg << 8) | qb;
    if (colorMap.has(key)) return colorMap.get(key);
    if (palette.length < 256) {
      const idx = palette.length;
      palette.push([qr, qg, qb]);
      colorMap.set(key, idx);
      return idx;
    }
    let bestIdx = 1;
    let bestDist = Infinity;
    for (let i = 1; i < palette.length; i++) {
      const [pr, pg, pb] = palette[i];
      const d = (pr - qr) ** 2 + (pg - qg) ** 2 + (pb - qb) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const indexedFrames = framesRgba.map((rgba) => {
    const idxArr = new Uint8Array(frameWidth * frameHeight);
    for (let i = 0; i < idxArr.length; i++) {
      idxArr[i] = getColorIndex(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], rgba[i * 4 + 3]);
    }
    return idxArr;
  });

  while (palette.length < 256) palette.push([0, 0, 0]);

  const chunks = [];
  const header = Buffer.alloc(13);
  header.write('GIF89a', 0, 'ascii');
  header.writeUInt16LE(frameWidth, 6);
  header.writeUInt16LE(frameHeight, 8);
  header[10] = 0xf7;
  chunks.push(header);

  const gct = Buffer.alloc(256 * 3);
  for (let i = 0; i < 256; i++) {
    gct[i * 3] = palette[i][0];
    gct[i * 3 + 1] = palette[i][1];
    gct[i * 3 + 2] = palette[i][2];
  }
  chunks.push(gct);

  chunks.push(
    Buffer.from([
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
      0x03, 0x01, 0x00, 0x00, 0x00
    ])
  );

  for (const idxArr of indexedFrames) {
    chunks.push(
      Buffer.from([
        0x21, 0xf9, 0x04, 0x09,
        delayCs & 0xff, (delayCs >> 8) & 0xff,
        0x00, 0x00
      ])
    );
    const desc = Buffer.alloc(10);
    desc[0] = 0x2c;
    desc.writeUInt16LE(frameWidth, 5);
    desc.writeUInt16LE(frameHeight, 7);
    chunks.push(desc);

    const lzw = lzwEncode(idxArr, 8);
    chunks.push(Buffer.from([8]));
    for (let pos = 0; pos < lzw.length; pos += 255) {
      const slice = lzw.slice(pos, Math.min(lzw.length, pos + 255));
      chunks.push(Buffer.from([slice.length]));
      chunks.push(slice);
    }
    chunks.push(Buffer.from([0x00]));
  }

  chunks.push(Buffer.from([0x3b]));
  return Buffer.concat(chunks);
}

/* =========================================================
   EXTRACTOR DE CELDAS 4x4 CON RECORTE FLOOD-FILL DE #181D27
   ========================================================= */
function extractAndCleanCell(sheetBuf, sheetSize, row, col, { removeEnclosedHoles = true, insetPx = 3 } = {}) {
  const cellSz = Math.floor(sheetSize / 4); // 128
  const cw = cellSz - insetPx * 2;
  const ch = cellSz - insetPx * 2;
  const cell = Buffer.alloc(cw * ch * 4);

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = col * cellSz + insetPx + x;
      const sy = row * cellSz + insetPx + y;
      const sO = (sy * sheetSize + sx) * 4;
      const dO = (y * cw + x) * 4;
      cell[dO] = sheetBuf[sO];
      cell[dO + 1] = sheetBuf[sO + 1];
      cell[dO + 2] = sheetBuf[sO + 2];
      cell[dO + 3] = 255;
    }
  }

  // Muestrear el color de fondo en las 4 esquinas de la celda (típicamente ~24, 29, 39)
  const samples = [0, cw - 1, (ch - 1) * cw, (ch - 1) * cw + cw - 1];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const sIdx of samples) {
    bgR += cell[sIdx * 4];
    bgG += cell[sIdx * 4 + 1];
    bgB += cell[sIdx * 4 + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  const total = cw * ch;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;

  const isDarkSlateBg = (idx, tol = 22) => {
    const o = idx * 4;
    const r = cell[o], g = cell[o + 1], b = cell[o + 2];
    return (
      Math.abs(r - bgR) <= tol &&
      Math.abs(g - bgG) <= tol &&
      Math.abs(b - bgB) <= tol + 2
    );
  };

  const push = (x, y) => {
    if (x < 0 || x >= cw || y < 0 || y >= ch) return;
    const idx = y * cw + x;
    if (visited[idx] || !isDarkSlateBg(idx, 22)) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  };

  for (let x = 0; x < cw; x++) {
    push(x, 0);
    push(x, ch - 1);
  }
  for (let y = 0; y < ch; y++) {
    push(0, y);
    push(cw - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    cell[idx * 4 + 3] = 0;
    const x = idx % cw;
    const y = (idx - x) / cw;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  // Segunda pasada: eliminar huecos internos cerrados del mismo color exacto de fondo (#181D27),
  // como el centro hueco de anillos de humo/escarcha/impacto o el hueco entre arco y cuerda.
  if (removeEnclosedHoles) {
    const holeVis = new Uint8Array(total);
    const comp = new Int32Array(total);
    for (let i = 0; i < total; i++) {
      if (visited[i] || holeVis[i] || !isDarkSlateBg(i, 13)) continue;
      let cHead = 0, cTail = 0;
      holeVis[i] = 1;
      comp[cTail++] = i;
      while (cHead < cTail) {
        const cur = comp[cHead++];
        const cx = cur % cw;
        const cy = (cur - cx) / cw;
        const nbs = [
          cx > 0 ? cur - 1 : -1,
          cx < cw - 1 ? cur + 1 : -1,
          cy > 0 ? cur - cw : -1,
          cy < ch - 1 ? cur + cw : -1
        ];
        for (const nb of nbs) {
          if (nb >= 0 && !visited[nb] && !holeVis[nb] && isDarkSlateBg(nb, 14)) {
            holeVis[nb] = 1;
            comp[cTail++] = nb;
          }
        }
      }
      if (cTail >= 18) {
        for (let k = 0; k < cTail; k++) {
          const pIdx = comp[k];
          visited[pIdx] = 1;
          cell[pIdx * 4 + 3] = 0;
        }
      }
    }
  }

  // Suavizar borde anti-alias JPEG de 1px junto al fondo eliminado
  for (let y = 1; y < ch - 1; y++) {
    for (let x = 1; x < cw - 1; x++) {
      const idx = y * cw + x;
      if (visited[idx]) continue;
      if (visited[idx - 1] || visited[idx + 1] || visited[idx - cw] || visited[idx + cw]) {
        if (isDarkSlateBg(idx, 28)) {
          cell[idx * 4 + 3] = 0;
        }
      }
    }
  }

  // Recortar al bounding box opaco y centrar en un lienzo cuadrado limpio (targetBox x targetBox)
  let minX = cw, minY = ch, maxX = 0, maxY = 0, hasOpaque = false;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (cell[(y * cw + x) * 4 + 3] > 20) {
        hasOpaque = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return { cell, cw, ch, minX, minY, maxX, maxY, hasOpaque };
}

function centerCropIntoBox(extracted, boxSize, pad = 4, scaleFill = false) {
  const out = Buffer.alloc(boxSize * boxSize * 4, 0);
  if (!extracted.hasOpaque) return out;

  const bw = extracted.maxX - extracted.minX + 1;
  const bh = extracted.maxY - extracted.minY + 1;
  const avail = boxSize - pad * 2;
  const scale = scaleFill ? Math.min(avail / bw, avail / bh) : Math.min(1, avail / bw, avail / bh);
  const dw = Math.max(1, Math.round(bw * scale));
  const dh = Math.max(1, Math.round(bh * scale));
  const ox = Math.floor((boxSize - dw) / 2);
  const oy = Math.floor((boxSize - dh) / 2);

  for (let dy = 0; dy < dh; dy++) {
    const sy = extracted.minY + Math.min(bh - 1, Math.floor(dy / scale));
    for (let dx = 0; dx < dw; dx++) {
      const sx = extracted.minX + Math.min(bw - 1, Math.floor(dx / scale));
      const sO = (sy * extracted.cw + sx) * 4;
      if (extracted.cell[sO + 3] < 20) continue;
      const dO = ((oy + dy) * boxSize + (ox + dx)) * 4;
      out[dO] = extracted.cell[sO];
      out[dO + 1] = extracted.cell[sO + 1];
      out[dO + 2] = extracted.cell[sO + 2];
      out[dO + 3] = extracted.cell[sO + 3];
    }
  }
  return out;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}

function buildSkillsIconSheet() {
  const raw = fs.readFileSync(path.join(RAW_DIR, 'iconos_habilidades_raw.rgba'));
  const SHEET_SIZE = 512;
  const CELL_OUT = 96; // 4x4 -> 384x384 RGBA transparente
  const outSheet = Buffer.alloc(CELL_OUT * 4 * CELL_OUT * 4 * 4, 0);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      // Eliminar huecos internos #181D27 en el arco [2,0] y en el halo del escudo [0,2], preservando el yunque [3,0] y el vórtice [1,3]
      const cleanInnerHoles = (row === 2 && col === 0) || (row === 0 && col === 2);
      const ext = extractAndCleanCell(raw, SHEET_SIZE, row, col, {
        removeEnclosedHoles: cleanInnerHoles,
        insetPx: 3
      });
      const iconBuf = centerCropIntoBox(ext, CELL_OUT, 3, true);

      for (let y = 0; y < CELL_OUT; y++) {
        const srcStart = y * CELL_OUT * 4;
        const dstStart = ((row * CELL_OUT + y) * (CELL_OUT * 4) + col * CELL_OUT) * 4;
        iconBuf.copy(outSheet, dstStart, srcStart, srcStart + CELL_OUT * 4);
      }
    }
  }

  const outPath = path.join(ASSETS_DIR, 'iconos_habilidades.png');
  const png = encodePNG(CELL_OUT * 4, CELL_OUT * 4, outSheet);
  fs.writeFileSync(outPath, png);
  console.log(`[ICONS] Saved ${outPath} (${CELL_OUT * 4}x${CELL_OUT * 4}, ${(png.length / 1024).toFixed(1)}KB)`);
}

function saveVfxRowAsFourFrameSheet(rawBuf, rowIdx, outName, { delayCs = 9, pixelMapper = null } = {}) {
  const SHEET_SIZE = 512;
  const FRAME_SZ = 120;
  const sheetRgba = Buffer.alloc(FRAME_SZ * 4 * FRAME_SZ * 4, 0);
  const frames = [];

  for (let col = 0; col < 4; col++) {
    const ext = extractAndCleanCell(rawBuf, SHEET_SIZE, rowIdx, col, {
      removeEnclosedHoles: true,
      insetPx: 2
    });
    // Preservar escala relativa real entre los 4 cuadros (pequeño -> grande -> disipación) centrando cada cuadro
    const fBuf = Buffer.alloc(FRAME_SZ * FRAME_SZ * 4, 0);
    if (ext.hasOpaque) {
      const bw = ext.maxX - ext.minX + 1;
      const bh = ext.maxY - ext.minY + 1;
      const scale = Math.min(1, (FRAME_SZ - 6) / Math.max(bw, bh));
      const dw = Math.max(1, Math.round(bw * scale));
      const dh = Math.max(1, Math.round(bh * scale));
      const ox = Math.floor((FRAME_SZ - dw) / 2);
      const oy = Math.floor((FRAME_SZ - dh) / 2);

      for (let dy = 0; dy < dh; dy++) {
        const sy = ext.minY + Math.min(bh - 1, Math.floor(dy / scale));
        for (let dx = 0; dx < dw; dx++) {
          const sx = ext.minX + Math.min(bw - 1, Math.floor(dx / scale));
          const sO = (sy * ext.cw + sx) * 4;
          if (ext.cell[sO + 3] < 20) continue;
          let r = ext.cell[sO], g = ext.cell[sO + 1], b = ext.cell[sO + 2];
          if (pixelMapper) {
            [r, g, b] = pixelMapper(r, g, b);
          }
          const dO = ((oy + dy) * FRAME_SZ + (ox + dx)) * 4;
          fBuf[dO] = r;
          fBuf[dO + 1] = g;
          fBuf[dO + 2] = b;
          fBuf[dO + 3] = ext.cell[sO + 3];
        }
      }
    }

    frames.push(fBuf);
    for (let y = 0; y < FRAME_SZ; y++) {
      const srcStart = y * FRAME_SZ * 4;
      const dstStart = (y * (FRAME_SZ * 4) + col * FRAME_SZ) * 4;
      fBuf.copy(sheetRgba, dstStart, srcStart, srcStart + FRAME_SZ * 4);
    }
  }

  const pngPath = path.join(ASSETS_DIR, `${outName}.png`);
  const pngBuf = encodePNG(FRAME_SZ * 4, FRAME_SZ, sheetRgba);
  fs.writeFileSync(pngPath, pngBuf);

  const gifPath = path.join(ASSETS_DIR, `${outName}.gif`);
  const gifBuf = encodeAnimatedGIF(FRAME_SZ, FRAME_SZ, frames, delayCs);
  fs.writeFileSync(gifPath, gifBuf);

  console.log(`[VFX-16BIT] ${outName.padEnd(22)} -> PNG ${(pngBuf.length / 1024).toFixed(1)}KB | GIF ${(gifBuf.length / 1024).toFixed(1)}KB`);
}

function main() {
  buildSkillsIconSheet();

  const rawCombate = fs.readFileSync(path.join(RAW_DIR, 'vfx_combate_raw.rgba'));
  const rawProj = fs.readFileSync(path.join(RAW_DIR, 'vfx_proyectiles_raw.rgba'));

  // Lámina 1: Tajo de espada (acero dorado), Golpe de Furia (ígneo carmesí-oro), Corte Dimensional (Vacío), Explosión, Escarcha, Impacto y Destello
  saveVfxRowAsFourFrameSheet(rawCombate, 0, 'fx_tajo_espada', {
    delayCs: 8,
    pixelMapper: (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s > 0.12 && l > 0.1) {
        return hslToRgb(48, Math.min(1, s * 0.85), Math.min(0.98, l * 1.06));
      }
      return [r, g, b];
    }
  });
  saveVfxRowAsFourFrameSheet(rawCombate, 0, 'fx_golpe_furia', {
    delayCs: 8,
    pixelMapper: (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s > 0.12 && l > 0.08) {
        return hslToRgb(Math.max(8, h - 18), Math.min(1, s * 1.18), l);
      }
      return [r, g, b];
    }
  });
  saveVfxRowAsFourFrameSheet(rawCombate, 0, 'fx_corte_dimensional', {
    delayCs: 8,
    pixelMapper: (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s > 0.12 && l > 0.08) {
        return hslToRgb(285, Math.min(1, s * 1.1), l);
      }
      return [r, g, b];
    }
  });
  saveVfxRowAsFourFrameSheet(rawCombate, 1, 'fx_explosion_fuego', { delayCs: 9 });
  saveVfxRowAsFourFrameSheet(rawCombate, 2, 'fx_nova_escarcha', { delayCs: 10 });
  saveVfxRowAsFourFrameSheet(rawCombate, 3, 'fx_impacto_golpe', { delayCs: 8 });
  saveVfxRowAsFourFrameSheet(rawCombate, 3, 'fx_destello_arcano', {
    delayCs: 8,
    pixelMapper: (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s > 0.1 && l > 0.08) {
        return hslToRgb(282, Math.min(1, s * 1.15), l);
      }
      return [r, g, b];
    }
  });

  // Lámina 2: Proyectil de Fuego, Orbe Arcano, Orbe del Vacío (variante púrpura), Trampa de Raíces, Lluvia de Flechas
  saveVfxRowAsFourFrameSheet(rawProj, 0, 'fx_proyectil_fuego', { delayCs: 9 });
  saveVfxRowAsFourFrameSheet(rawProj, 1, 'fx_proyectil_arcano', { delayCs: 9 });
  saveVfxRowAsFourFrameSheet(rawProj, 1, 'fx_proyectil_vacio', {
    delayCs: 9,
    pixelMapper: (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s > 0.15 && l > 0.08) {
        return hslToRgb(286, Math.min(1, s * 1.05), l);
      }
      return [r, g, b];
    }
  });
  saveVfxRowAsFourFrameSheet(rawProj, 2, 'fx_trampa_raices', { delayCs: 12 });
  saveVfxRowAsFourFrameSheet(rawProj, 3, 'fx_lluvia_flechas', { delayCs: 9 });
}

main();
