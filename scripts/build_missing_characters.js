/**
 * build_missing_characters.js
 * Toma los modelos base de 16-bit Pixel Art proporcionados por el usuario, aplica Flood-Fill inteligente
 * de recorte de fondo blanco + huecos internos, y diseña todos los personajes, razas, NPCs y enemigos
 * que faltaban en el juego, exportando tanto hojas PNG reales de 4 cuadros (4*frameW x frameH)
 * como GIFs animados (GIF89a con loop infinito y transparencia) en public/assets/.
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

function encodeAnimatedGIF(frameWidth, frameHeight, framesRgba, delayCs = 14) {
  const palette = [[0, 0, 0]];
  const colorMap = new Map();

  const getColorIndex = (r, g, b, a) => {
    if (a < 128) return 0;
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
   BFS FLOOD-FILL + RECORTE AUTOMÁTICO DE MODELO BASE
   ========================================================= */
function loadAndCleanModel(name, w = 144, h = 144) {
  const rawPath = path.join(RAW_DIR, `${name}.rgba`);
  const d = Buffer.from(fs.readFileSync(rawPath));
  const total = w * h;
  const visited = new Uint8Array(total);
  const q = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBg = (idx) => {
    const o = idx * 4;
    const r = d[o], g = d[o + 1], b = d[o + 2], a = d[o + 3];
    if (a < 16) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = (r + g + b) / 3;
    const sat = max - min;
    return (lum >= 232 && sat <= 26) || (r >= 224 && g >= 224 && b >= 224 && sat <= 18);
  };

  const push = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    if (!isBg(idx)) return;
    visited[idx] = 1;
    q[tail++] = idx;
  };

  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  while (head < tail) {
    const idx = q[head++];
    d[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }

  // Limpiar huecos blancos cerrados (entre piernas, arco y brazo, báculo, etc.)
  const compVisited = new Uint8Array(total);
  const compQueue = new Int32Array(total);
  const isInnerWhite = (idx) => {
    const o = idx * 4;
    if (d[o + 3] === 0) return false;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const lum = (r + g + b) / 3;
    return lum >= 242 && sat <= 14;
  };

  for (let startY = 0; startY < h; startY++) {
    for (let startX = 0; startX < w; startX++) {
      const startIdx = startY * w + startX;
      if (compVisited[startIdx] || !isInnerWhite(startIdx)) continue;
      let cHead = 0, cTail = 0, touchesTop = false;
      compVisited[startIdx] = 1;
      compQueue[cTail++] = startIdx;
      while (cHead < cTail) {
        const curr = compQueue[cHead++];
        const cx = curr % w;
        const cy = (curr - cx) / w;
        if (cy < h * 0.25) touchesTop = true;
        const nbs = [
          cx > 0 ? curr - 1 : -1,
          cx < w - 1 ? curr + 1 : -1,
          cy > 0 ? curr - w : -1,
          cy < h - 1 ? curr + w : -1
        ];
        for (const nb of nbs) {
          if (nb >= 0 && !compVisited[nb] && isInnerWhite(nb)) {
            compVisited[nb] = 1;
            compQueue[cTail++] = nb;
          }
        }
      }
      if (cTail >= 12 && (!touchesTop || cTail >= 55)) {
        for (let i = 0; i < cTail; i++) d[compQueue[i] * 4 + 3] = 0;
      }
    }
  }

  // Suavizar halo de 1px
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (d[o + 3] === 0) continue;
      const r = d[o], g = d[o + 1], b = d[o + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 224 && sat < 24) {
        if (
          d[(idx - 1) * 4 + 3] === 0 ||
          d[(idx + 1) * 4 + 3] === 0 ||
          d[(idx - w) * 4 + 3] === 0 ||
          d[(idx + w) * 4 + 3] === 0
        ) {
          d[o + 3] = 0;
        }
      }
    }
  }

  // Recortar al bounding box exacto
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cw = Math.max(1, maxX - minX + 1);
  const ch = Math.max(1, maxY - minY + 1);
  const cropped = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const srcO = ((minY + y) * w + (minX + x)) * 4;
      const dstO = (y * cw + x) * 4;
      cropped[dstO] = d[srcO];
      cropped[dstO + 1] = d[srcO + 1];
      cropped[dstO + 2] = d[srcO + 2];
      cropped[dstO + 3] = d[srcO + 3];
    }
  }

  return { w: cw, h: ch, data: cropped };
}

/* =========================================================
   MOTOR DE REDISEÑO DE PALETAS Y RASGOS PIXEL ART
   ========================================================= */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
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
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
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
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function transformSprite(model, pixelMapper) {
  const out = Buffer.from(model.data);
  for (let y = 0; y < model.h; y++) {
    for (let x = 0; x < model.w; x++) {
      const o = (y * model.w + x) * 4;
      if (out[o + 3] < 20) continue;
      const [nr, ng, nb] = pixelMapper(out[o], out[o + 1], out[o + 2], x / model.w, y / model.h);
      out[o] = Math.max(0, Math.min(255, nr));
      out[o + 1] = Math.max(0, Math.min(255, ng));
      out[o + 2] = Math.max(0, Math.min(255, nb));
    }
  }
  return { w: model.w, h: model.h, data: out };
}

/* =========================================================
   GENERADOR DE SPRITESHEET DE 4 CUADROS CON DEFORMACIÓN DE MALLA CONTINUA (SIN CORTES NI HUECOS)
   ========================================================= */
function buildFourFrameSheetFromModel(model) {
  const sw = model.w;
  const sh = model.h;
  const padX = Math.max(6, Math.round(sw * 0.1));
  const padTop = Math.max(6, Math.round(sh * 0.07));
  const fw = sw + padX * 2;
  const fh = sh + padTop;

  const sheetData = Buffer.alloc(fw * 4 * fh * 4, 0);

  // Deformación continua por píxel (mesh warp) para que la espada, túnica, piernas y cuerpo nunca se partan
  const renderWarpedFrame = (fIdx, warpFn) => {
    const ox = fIdx * fw + padX;
    const oy = padTop;

    for (let dy = -padTop; dy < sh; dy++) {
      for (let dx = -padX; dx < sw + padX; dx++) {
        const nx = dx / sw;
        const ny = dy / sh;
        const { offX, offY } = warpFn(nx, ny);
        const sx = Math.round(dx - offX);
        const sy = Math.round(dy - offY);
        if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
        const sO = (sy * sw + sx) * 4;
        if (model.data[sO + 3] < 20) continue;

        const outX = ox + dx;
        const outY = oy + dy;
        if (outX < fIdx * fw || outX >= (fIdx + 1) * fw || outY < 0 || outY >= fh) continue;
        const dO = (outY * (fw * 4) + outX) * 4;
        sheetData[dO] = model.data[sO];
        sheetData[dO + 1] = model.data[sO + 1];
        sheetData[dO + 2] = model.data[sO + 2];
        sheetData[dO + 3] = model.data[sO + 3];
      }
    }
  };

  const stepAmp = Math.max(2.5, sw * 0.048);
  const liftAmp = Math.max(2.5, sh * 0.038);

  // Cuadro 0: Postura Base / Reposo
  renderWarpedFrame(0, () => ({ offX: 0, offY: 0 }));

  // Cuadro 1: Paso A (Zancada izquierda adelantada y elevada, torso con braceo suave, sin partir el sprite)
  renderWarpedFrame(1, (nx, ny) => {
    // Factor de altura en las piernas (0 en cintura ny<=0.58, 1 en los pies ny=1)
    const legT = Math.max(0, Math.min(1, (ny - 0.56) / 0.44));
    const smoothLeg = legT * legT * (3 - 2 * legT);
    // Lado izquierdo (-1) vs lado derecho (+1) suavizado en el centro
    const side = Math.max(-1, Math.min(1, (nx - 0.5) * 3.2));
    // En Paso A: las piernas se abren suavemente y la pierna izquierda (side < 0) se eleva
    const legOffX = side * smoothLeg * stepAmp * 0.85;
    const leftLift = Math.max(0, -side) * smoothLeg * liftAmp * 1.35;
    const torsoSwingX = (1 - smoothLeg) * (stepAmp * 0.35);
    const bodyBobY = -liftAmp * 0.65;
    return {
      offX: torsoSwingX + legOffX,
      offY: bodyBobY - leftLift
    };
  });

  // Cuadro 2: Paso B (Zancada derecha adelantada y elevada, pierna izquierda apoyada, braceo opuesto)
  renderWarpedFrame(2, (nx, ny) => {
    const legT = Math.max(0, Math.min(1, (ny - 0.56) / 0.44));
    const smoothLeg = legT * legT * (3 - 2 * legT);
    const side = Math.max(-1, Math.min(1, (nx - 0.5) * 3.2));
    // En Paso B: la pierna derecha (side > 0) se eleva y las piernas invierten el apoyo
    const legOffX = -side * smoothLeg * stepAmp * 0.75;
    const rightLift = Math.max(0, side) * smoothLeg * liftAmp * 1.35;
    const torsoSwingX = -(1 - smoothLeg) * (stepAmp * 0.35);
    const bodyBobY = -liftAmp * 0.65;
    return {
      offX: torsoSwingX + legOffX,
      offY: bodyBobY - rightLift
    };
  });

  // Cuadro 3: Impulso / Ataque (Torso y brazo de arma proyectados hacia adelante en curva continua)
  renderWarpedFrame(3, (nx, ny) => {
    const upperT = Math.max(0, Math.min(1, (0.78 - ny) / 0.78));
    const lungeX = upperT * stepAmp * 1.15;
    const legT = Math.max(0, Math.min(1, (ny - 0.58) / 0.42));
    const side = Math.max(-1, Math.min(1, (nx - 0.5) * 3.0));
    const stanceX = side * legT * stepAmp * 0.7;
    return {
      offX: lungeX + stanceX,
      offY: -upperT * (liftAmp * 0.45)
    };
  });

  return { sheetW: fw * 4, sheetH: fh, frameW: fw, frameH: fh, data: sheetData };
}

function saveCharacterSheetAndGif(outName, model) {
  const sheet = buildFourFrameSheetFromModel(model);
  const pngPath = path.join(ASSETS_DIR, `${outName}.png`);
  const pngBuf = encodePNG(sheet.sheetW, sheet.sheetH, sheet.data);
  fs.writeFileSync(pngPath, pngBuf);

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const fBuf = Buffer.alloc(sheet.frameW * sheet.frameH * 4);
    for (let y = 0; y < sheet.frameH; y++) {
      const srcStart = (y * sheet.sheetW + f * sheet.frameW) * 4;
      sheet.data.copy(fBuf, y * sheet.frameW * 4, srcStart, srcStart + sheet.frameW * 4);
    }
    frames.push(fBuf);
  }
  const gifPath = path.join(ASSETS_DIR, `${outName}.gif`);
  const gifBuf = encodeAnimatedGIF(sheet.frameW, sheet.frameH, frames, 13);
  fs.writeFileSync(gifPath, gifBuf);
  console.log(`Generated 4-frame PNG & GIF: ${outName} (${sheet.sheetW}x${sheet.sheetH}, PNG ${(pngBuf.length / 1024).toFixed(1)}KB, GIF ${(gifBuf.length / 1024).toFixed(1)}KB)`);
}

/* =========================================================
   MODELO PROPIO 16-BIT PARA ESCORPIÓN DE CENIZA (4 CUADROS)
   ========================================================= */
function buildScorpionModel() {
  const W = 96;
  const H = 84;
  const data = Buffer.alloc(W * H * 4, 0);
  const pset = (x, y, r, g, b) => {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const o = (iy * W + ix) * 4;
    data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
  };
  const rect = (x, y, w, h, col) => {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) pset(px, py, col[0], col[1], col[2]);
    }
  };
  const oRect = (x, y, w, h, fill, out = [13, 10, 20]) => {
    rect(x, y, w, h, out);
    if (w > 2 && h > 2) rect(x + 1, y + 1, w - 2, h - 2, fill);
  };

  // Cuerpo acorazado de obsidiana y magma volcánico
  oRect(24, 42, 46, 22, [69, 20, 11]);
  oRect(28, 45, 38, 16, [124, 45, 18]);
  rect(32, 48, 30, 5, [234, 88, 12]);
  rect(36, 50, 20, 2, [254, 240, 138]);

  // Cabeza y ojos brillantes de fuego
  oRect(16, 46, 14, 16, [41, 21, 18]);
  rect(18, 50, 4, 3, [254, 240, 138]);
  rect(18, 55, 4, 3, [250, 204, 21]);

  // Pinzas delanteras articuladas
  oRect(4, 34, 16, 12, [154, 52, 18]);
  oRect(2, 54, 16, 12, [154, 52, 18]);
  rect(6, 37, 8, 4, [249, 115, 22]);
  rect(4, 57, 8, 4, [249, 115, 22]);

  // Cola segmentada arqueada hacia arriba con aguijón de lava incandescente
  const tailSegments = [
    [66, 36, 12, 12],
    [72, 24, 12, 12],
    [68, 14, 12, 11],
    [56, 8, 14, 10],
    [44, 10, 13, 10]
  ];
  for (const [tx, ty, tw, th] of tailSegments) {
    oRect(tx, ty, tw, th, [124, 45, 18]);
    rect(tx + 3, ty + 3, tw - 6, th - 6, [234, 88, 12]);
  }
  // Aguijón ígneo
  oRect(34, 12, 12, 9, [234, 88, 12]);
  rect(36, 14, 7, 5, [254, 240, 138]);

  // 6 Patas articuladas (3 a la izquierda, 3 a la derecha para la animación de 4 cuadros)
  for (const lx of [28, 38, 50, 60]) {
    oRect(lx, 62, 6, 18, [41, 21, 18]);
    rect(lx + 1, 64, 3, 12, [154, 52, 18]);
  }

  return { w: W, h: H, data };
}

function main() {
  // 1. Cargar los modelos base proporcionados por el usuario
  const baseGuerrera = loadAndCleanModel('heroina_guerrera');
  const baseMaga = loadAndCleanModel('heroina_maga');
  const baseArquera = loadAndCleanModel('heroina_arquera');
  const baseGuerrero = loadAndCleanModel('heroe_guerrero');
  const baseMago = loadAndCleanModel('heroe_mago');
  const baseArquero = loadAndCleanModel('heroe_arquero');
  const baseTabernero = loadAndCleanModel('npc_tabernero');
  const baseHerrero = loadAndCleanModel('npc_herrero');
  const baseLobo = loadAndCleanModel('enemigo_lobo');
  const baseTrasgo = loadAndCleanModel('enemigo_trasgo');
  const baseEsqueleto = loadAndCleanModel('enemigo_esqueleto');
  const baseElemental = loadAndCleanModel('enemigo_elemental');

  // 2. Diseñar los 3 NPCs que faltaban basados en tus modelos
  // a) Mercader Viajero (basado en npc_tabernero -> túnica esmeralda/turquesa del desierto y faja dorada)
  const npcMercader = transformSprite(baseTabernero, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Delantal marrón -> túnica verde esmeralda/turquesa real con bordes dorados
    if (h >= 15 && h <= 45 && s > 0.2 && l < 0.58) {
      return hslToRgb(168, Math.min(1, s * 1.35), l * 0.95);
    }
    // Camisa blanca -> seda crema dorada
    if (s < 0.18 && l > 0.65) {
      return hslToRgb(42, 0.55, l * 0.96);
    }
    return [r, g, b];
  });
  saveCharacterSheetAndGif('npc_mercader', npcMercader);

  // b) Guardia del Alba (basado en heroe_guerrero -> armadura de plata bruñida y capa azul/dorada)
  const npcGuardiaAlba = transformSprite(baseGuerrero, (r, g, b, nx, ny) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Armadura azul -> acero plateado reluciente con reflejos celestes
    if (h >= 190 && h <= 245 && s > 0.25) {
      return hslToRgb(210, s * 0.35, Math.min(0.92, l * 1.18));
    }
    // Cabello -> yelmo de acero real
    if (ny < 0.18 && h >= 15 && h <= 42 && l < 0.45) {
      return hslToRgb(215, 0.22, Math.min(0.8, l * 1.45));
    }
    return [r, g, b];
  });
  saveCharacterSheetAndGif('npc_guardia_alba', npcGuardiaAlba);

  // c) Guerrero de Hierro / Guardia Orco (basado en heroe_guerrero -> piel verde Orco y armadura carmesí/hierro)
  const npcGuardiaHierro = transformSprite(baseGuerrero, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Armadura azul -> carmesí sangre y hierro oscuro de los Clanes de Hierro
    if (h >= 185 && h <= 250 && s > 0.2) {
      return hslToRgb(356, Math.min(0.85, s * 1.15), l * 0.88);
    }
    // Piel humana -> piel verde oliva de Orco Guerrero
    if (h >= 12 && h <= 36 && s >= 0.25 && l >= 0.42 && l <= 0.85) {
      return hslToRgb(104, 0.46, l * 0.86);
    }
    return [r, g, b];
  });
  saveCharacterSheetAndGif('npc_guardia_hierro', npcGuardiaHierro);

  // 3. Diseñar los 6 Enemigos Regionales que faltaban basados en tus modelos
  // a) Lobo Invernal (basado en enemigo_lobo -> pelaje blanco/escarcha glaciar y llamas de hielo cian)
  const enemigoLoboInvernal = transformSprite(baseLobo, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Llamas moradas -> aura de escarcha cian brillante
    if (h >= 255 && h <= 325 && s > 0.35) {
      return hslToRgb(194, 0.92, Math.min(0.92, l * 1.38));
    }
    // Pelaje gris oscuro -> pelaje blanco/azul ártico de las Montañas Heladas
    if (l > 0.12 && l < 0.65) {
      return hslToRgb(204, 0.38, Math.min(0.94, 0.42 + l * 0.85));
    }
    return [r, g, b];
  });
  saveCharacterSheetAndGif('enemigo_lobo_invernal', enemigoLoboInvernal);

  // b) Gólem de Hielo (basado en enemigo_elemental -> roca glaciar azul y cristales de hielo cian)
  const enemigoGolemHielo = transformSprite(baseElemental, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Magma naranja/amarillo -> hielo cristalino cian/blanco
    if ((h <= 65 || h >= 340) && s > 0.35) {
      return hslToRgb(195, 0.9, Math.min(0.96, l * 1.12));
    }
    // Roca volcánica marrón/gris -> roca glaciar azulada
    return hslToRgb(210, 0.35, Math.min(0.85, l * 1.15));
  });
  saveCharacterSheetAndGif('enemigo_golem_hielo', enemigoGolemHielo);

  // c) Caballero del Vacío (basado en enemigo_esqueleto -> armadura negra obsidiana y energía morada del Vacío)
  const enemigoCaballeroVacio = transformSprite(baseEsqueleto, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Hueso/acero -> armadura del Vacío violeta/obsidiana y filo púrpura neón
    if (s < 0.25 && l > 0.45) {
      return hslToRgb(272, 0.78, l * 0.95);
    }
    if (h >= 15 && h <= 50) {
      return hslToRgb(262, 0.52, l * 0.78);
    }
    return [r, g, b];
  });
  saveCharacterSheetAndGif('enemigo_caballero_vacio', enemigoCaballeroVacio);

  // d) Mago Sombrío (basado en heroe_mago -> túnica oscura del Vacío, piel espectral y cristal carmesí/violeta)
  const enemigoMagoSombrio = transformSprite(baseMago, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Piel -> rostro sombrío espectral violeta con ojos brillantes
    if (h >= 12 && h <= 38 && s > 0.22 && l > 0.45) {
      return hslToRgb(275, 0.35, l * 0.65);
    }
    // Cristal azul -> orbe carmesí/magenta corrupto
    if (h >= 180 && h <= 230 && s > 0.45) {
      return hslToRgb(325, 0.92, l);
    }
    // Túnica morada/dorada -> túnica negra abisal con bordes púrpura
    if (h >= 35 && h <= 65 && s > 0.4) {
      return hslToRgb(285, 0.75, l * 0.85);
    }
    return hslToRgb(h, s, l * 0.72);
  });
  saveCharacterSheetAndGif('enemigo_mago_sombrio', enemigoMagoSombrio);

  // e) Nómada Corrupto (basado en heroe_arquero -> armadura del Desierto de Ceniza y arco ígneo)
  const enemigoNomada = transformSprite(baseArquero, (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b);
    // Túnica verde -> armadura de cuero rojo/ceniza volcánica
    if (h >= 90 && h <= 165 && s > 0.2) {
      return hslToRgb(14, 0.76, l * 0.92);
    }
    // Piel -> tono bronceado/ceniza con ojos amarillos
    if (h >= 14 && h <= 38 && l > 0.45) {
      return hslToRgb(24, 0.48, l * 0.82);
    }
    return [r, g, b];
  });
  saveCharacterSheetAndGif('enemigo_nomada', enemigoNomada);

  // f) Escorpión de Ceniza (modelo propio 16-bit de 4 cuadros)
  saveCharacterSheetAndGif('enemigo_escorpion', buildScorpionModel());

  // 4. Diseñar las 6 Variantes de Héroes y Heroínas del Bando "Los Clanes de Hierro" (Orco / Lobo Guerrero / Nómada)
  const makeHierroHero = (baseModel, isOrcSkin = false) =>
    transformSprite(baseModel, (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      // Armadura/túnica azul, morada o verde -> carmesí real y bronce de los Clanes de Hierro
      if ((h >= 90 && h <= 295) && s > 0.22) {
        return hslToRgb(358, Math.min(0.86, s * 1.12), l * 0.94);
      }
      if (isOrcSkin && h >= 12 && h <= 36 && s >= 0.24 && l >= 0.42 && l <= 0.86) {
        return hslToRgb(102, 0.45, l * 0.88);
      }
      return [r, g, b];
    });

  saveCharacterSheetAndGif('heroe_guerrero_hierro', makeHierroHero(baseGuerrero, false));
  saveCharacterSheetAndGif('heroina_guerrera_hierro', makeHierroHero(baseGuerrera, false));
  saveCharacterSheetAndGif('heroe_mago_hierro', makeHierroHero(baseMago, false));
  saveCharacterSheetAndGif('heroina_maga_hierro', makeHierroHero(baseMaga, false));
  saveCharacterSheetAndGif('heroe_arquero_hierro', makeHierroHero(baseArquero, false));
  saveCharacterSheetAndGif('heroina_arquera_hierro', makeHierroHero(baseArquera, false));

  // Variantes específicas de raza Orco (piel verde) y Lobo Guerrero (pelaje gris lobuno)
  const makeWolfRaceHero = (baseModel) =>
    transformSprite(baseModel, (r, g, b) => {
      const [h, s, l] = rgbToHsl(r, g, b);
      if ((h >= 90 && h <= 295) && s > 0.22) {
        return hslToRgb(18, 0.65, l * 0.9);
      }
      if (h >= 12 && h <= 38 && s >= 0.22 && l >= 0.35 && l <= 0.86) {
        return hslToRgb(215, 0.18, l * 0.88);
      }
      return [r, g, b];
    });

  saveCharacterSheetAndGif('heroe_orco', makeHierroHero(baseGuerrero, true));
  saveCharacterSheetAndGif('heroina_orca', makeHierroHero(baseGuerrera, true));
  saveCharacterSheetAndGif('heroe_lobo', makeWolfRaceHero(baseGuerrero));
  saveCharacterSheetAndGif('heroina_loba', makeWolfRaceHero(baseGuerrera));
}

main();
