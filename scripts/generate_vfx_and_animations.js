/**
 * generate_vfx_and_animations.js
 * Diseñador de Imágenes PNG (Spritesheets de 4 cuadros con canal alfa real) y GIFs Animados (GIF89a)
 * para Crónicas de la Fractura (Valoria) — Efectos de Luz, Sombras, Movimiento, Clima, Combate y Personajes.
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
   CODIFICADOR PNG RGBA DE 32 BITS Y GIF89a ANIMADO
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

function encodeAnimatedGIF(frameWidth, frameHeight, framesRgba, delayCs = 12) {
  const palette = [[0, 0, 0]]; // índice 0 transparente
  const colorMap = new Map();

  const getColorIndex = (r, g, b, a) => {
    if (a < 55) return 0;
    // Si tiene semitransparencia, pre-mezclar suavemente o conservar color vivo
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
   LIENZO PIXEL ART 16-BIT CON SOPORTE DE LUZ, SOMBRA Y DITHER
   ========================================================= */
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4, 0);
  }

  hexToRgba(hex, overrideAlpha = null) {
    if (Array.isArray(hex)) {
      return [hex[0], hex[1], hex[2], overrideAlpha !== null ? overrideAlpha : (hex[3] ?? 255)];
    }
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const a = overrideAlpha !== null
      ? overrideAlpha
      : clean.length === 8
      ? parseInt(clean.substring(6, 8), 16)
      : 255;
    return [r, g, b, a];
  }

  pset(x, y, col, alphaOverride = null) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const [r, g, b, a] = this.hexToRgba(col, alphaOverride);
    if (a <= 0) return;
    const idx = (iy * this.w + ix) * 4;
    if (a >= 255 || this.data[idx + 3] === 0) {
      this.data[idx] = r;
      this.data[idx + 1] = g;
      this.data[idx + 2] = b;
      this.data[idx + 3] = a;
    } else {
      const alpha = a / 255;
      const inv = 1 - alpha;
      this.data[idx] = Math.round(r * alpha + this.data[idx] * inv);
      this.data[idx + 1] = Math.round(g * alpha + this.data[idx + 1] * inv);
      this.data[idx + 2] = Math.round(b * alpha + this.data[idx + 2] * inv);
      this.data[idx + 3] = Math.min(255, Math.round(a + this.data[idx + 3] * inv));
    }
  }

  rect(x, y, w, h, col, alphaOverride = null) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    for (let py = y0; py < y0 + rh; py++) {
      for (let px = x0; px < x0 + rw; px++) {
        this.pset(px, py, col, alphaOverride);
      }
    }
  }

  outlinedRect(x, y, w, h, fillCol, outlineCol = '#0D0A14') {
    this.rect(x, y, w, h, outlineCol);
    if (w > 2 && h > 2) {
      this.rect(x + 1, y + 1, w - 2, h - 2, fillCol);
    }
  }

  ellipse(cx, cy, rx, ry, col, outlineCol = null, alphaOverride = null) {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = (px - cx) / rx;
        const dy = (py - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d <= 1.0) {
          if (outlineCol && d >= 0.76) {
            this.pset(px, py, outlineCol, alphaOverride);
          } else {
            this.pset(px, py, col, alphaOverride);
          }
        }
      }
    }
  }

  /**
   * Halo radial o sombra con dithering Bayer 4x4 auténtico de 16 bits + canal alfa gradual
   * Funciona tanto en PNG (transparencia suave + patrón pixel art) como en GIF89a (dithered alpha).
   */
  radialGlow(cx, cy, rx, ry, stops) {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = (px - cx) / rx;
        const dy = (py - cy) / ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) continue;

        const bayer = (BAYER_4X4[((py % 4) + 4) % 4][((px % 4) + 4) % 4] + 0.5) / 16;
        // Encontrar stop según distancia
        for (const st of stops) {
          if (dist <= st.maxDist) {
            const localT = (dist - st.minDist) / Math.max(0.01, st.maxDist - st.minDist);
            const density = 1 - localT * 0.65;
            if (bayer <= density || st.solid) {
              this.pset(px, py, st.color, st.alpha);
            }
            break;
          }
        }
      }
    }
  }

  ring(cx, cy, rOuter, rInner, col, outlineCol = null, alphaOverride = 255) {
    const x0 = Math.floor(cx - rOuter - 1);
    const x1 = Math.ceil(cx + rOuter + 1);
    const y0 = Math.floor(cy - rOuter - 1);
    const y1 = Math.ceil(cy + rOuter + 1);
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const d = Math.hypot(px - cx, py - cy);
        if (d <= rOuter && d >= rInner) {
          if (outlineCol && (d >= rOuter - 1.2 || d <= rInner + 1.2)) {
            this.pset(px, py, outlineCol, alphaOverride);
          } else {
            this.pset(px, py, col, alphaOverride);
          }
        }
      }
    }
  }

  extractFrame(frameIdx, frameW) {
    const out = Buffer.alloc(frameW * this.h * 4);
    for (let y = 0; y < this.h; y++) {
      const srcStart = (y * this.w + frameIdx * frameW) * 4;
      this.data.copy(out, y * frameW * 4, srcStart, srcStart + frameW * 4);
    }
    return out;
  }
}

function saveSheetAndGif(name, sheetObj, delayCs = 12) {
  const pngPath = path.join(ASSETS_DIR, `${name}.png`);
  const pngBuf = encodePNG(sheetObj.canvas.w, sheetObj.canvas.h, sheetObj.canvas.data);
  fs.writeFileSync(pngPath, pngBuf);

  const frames = [];
  for (let i = 0; i < sheetObj.frameCount; i++) {
    frames.push(sheetObj.canvas.extractFrame(i, sheetObj.frameW));
  }
  const gifBuf = encodeAnimatedGIF(sheetObj.frameW, sheetObj.frameH, frames, delayCs);
  const gifPath = path.join(ASSETS_DIR, `${name}.gif`);
  fs.writeFileSync(gifPath, gifBuf);

  console.log(
    `[VFX] ${name.padEnd(24)} -> PNG ${sheetObj.canvas.w}x${sheetObj.canvas.h} (${(pngBuf.length / 1024).toFixed(1)}KB) | GIF ${sheetObj.frameW}x${sheetObj.frameH} (${(gifBuf.length / 1024).toFixed(1)}KB)`
  );
}

/* =========================================================
   1. EFECTOS DE LUZ, HALOS E ILUMINACIÓN AMBIENTAL (4 CUADROS)
   ========================================================= */

// 1a. Halo Cálido Pulsante (Fogatas, Antorchas, Faroles de Taberna y Herrería)
function buildWarmHaloSheet() {
  const FW = 96, FH = 96;
  const c = new PixelCanvas(FW * 4, FH);
  const radii = [38, 42, 40, 44];
  const sparks = [
    [[-14, -12], [16, -8], [-8, 15], [12, 14]],
    [[-16, -15], [18, -11], [-10, 12], [14, 10]],
    [[-12, -18], [15, -14], [-13, 9], [16, 7]],
    [[-15, -14], [13, -17], [-9, 13], [11, 12]]
  ];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const cy = 48;
    const r = radii[f];
    c.radialGlow(cx, cy, r, r, [
      { minDist: 0.0, maxDist: 0.25, color: '#FEF08A', alpha: 195, solid: true },
      { minDist: 0.25, maxDist: 0.55, color: '#F97316', alpha: 145, solid: false },
      { minDist: 0.55, maxDist: 0.82, color: '#EA580C', alpha: 95, solid: false },
      { minDist: 0.82, maxDist: 1.0, color: '#9A3412', alpha: 55, solid: false }
    ]);
    for (const [sx, sy] of sparks[f]) {
      c.rect(cx + sx, cy + sy, 2, 2, '#FEF08A', 230);
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 1b. Halo del Vacío (Cristales Morados, Antorchas del Vacío, Altares de Jefes)
function buildVoidHaloSheet() {
  const FW = 96, FH = 96;
  const c = new PixelCanvas(FW * 4, FH);
  const radii = [38, 43, 39, 44];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const cy = 48;
    const r = radii[f];
    c.radialGlow(cx, cy, r, r, [
      { minDist: 0.0, maxDist: 0.24, color: '#F5D0FE', alpha: 200, solid: true },
      { minDist: 0.24, maxDist: 0.55, color: '#C084FC', alpha: 150, solid: false },
      { minDist: 0.55, maxDist: 0.82, color: '#9333EA', alpha: 100, solid: false },
      { minDist: 0.82, maxDist: 1.0, color: '#4C1D95', alpha: 60, solid: false }
    ]);
    for (let i = 0; i < 6; i++) {
      const ang = (f / 4) * Math.PI * 2 + (i * Math.PI) / 3;
      const px = cx + Math.cos(ang) * (r * 0.62);
      const py = cy + Math.sin(ang) * (r * 0.62);
      c.outlinedRect(px - 1, py - 1, 3, 3, '#F0ABFC', '#4C1D95');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 1c. Halo de Linterna del Jugador (Luz en Cueva del Vacío y Noche)
function buildPlayerLanternHaloSheet() {
  const FW = 128, FH = 128;
  const c = new PixelCanvas(FW * 4, FH);
  const radii = [56, 59, 57, 60];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 64;
    const cy = 64;
    const r = radii[f];
    c.radialGlow(cx, cy, r, r * 0.88, [
      { minDist: 0.0, maxDist: 0.28, color: '#FEF9C3', alpha: 140, solid: false },
      { minDist: 0.28, maxDist: 0.62, color: '#FDE047', alpha: 95, solid: false },
      { minDist: 0.62, maxDist: 1.0, color: '#38BDF8', alpha: 50, solid: false }
    ]);
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 1d. Rayos de Luz Volumétrica / God-Rays (Claros del Bosque de la Fractura y Aldea)
function buildSunbeamsSheet() {
  const FW = 128, FH = 128;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const ox = f * FW;
    const beams = [
      { xTop: 18, w: 18, alpha: 95 + (f % 2) * 20 },
      { xTop: 52, w: 26, alpha: 120 - (f % 2) * 20 },
      { xTop: 92, w: 14, alpha: 85 + ((f + 1) % 2) * 25 }
    ];
    for (const b of beams) {
      for (let y = 0; y < FH; y++) {
        const shiftX = Math.floor(y * 0.35);
        const fade = 1 - Math.abs(y - FH * 0.45) / (FH * 0.65);
        if (fade <= 0) continue;
        for (let dx = 0; dx < b.w; dx++) {
          const px = ox + b.xTop + shiftX + dx;
          const bayer = (BAYER_4X4[y % 4][dx % 4] + 0.5) / 16;
          if (bayer <= fade * 0.75) {
            const col = dx > 4 && dx < b.w - 4 ? '#FEF08A' : '#FDE047';
            c.pset(px, y, col, Math.round(b.alpha * fade));
          }
        }
      }
    }
    // Motas de polen dorado flotando dentro de los haces de luz
    const motes = [
      [38, 34], [66, 52], [82, 78], [54, 96], [104, 62], [74, 28]
    ];
    motes.forEach(([mx, my], idx) => {
      const py = ((my + f * 6 + idx * 9) % 104) + 12;
      const px = ox + mx + ((f + idx) % 3) * 2;
      c.outlinedRect(px, py, 3, 3, '#FEF9C3', '#D9A441');
    });
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 1e. Aura Legendaria (+9 / +12) y Aura de Furia de Jefes (<30% PV)
function buildAuraSheet(kind = 'legendary') {
  const FW = 80, FH = 80;
  const c = new PixelCanvas(FW * 4, FH);
  const isFury = kind === 'fury';
  const mainCol = isFury ? '#EF4444' : '#FDE047';
  const coreCol = isFury ? '#FCA5A5' : '#FEF9C3';
  const darkCol = isFury ? '#7F1D1D' : '#B45309';

  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 40;
    const cy = 44;
    const r = 28 + (f % 2) * 2;

    // Anillo elíptico de energía en la base y aura envolvente
    c.ellipse(cx, cy + 12, r, 11, mainCol, darkCol, 175);
    c.ellipse(cx, cy + 12, r - 4, 8, coreCol, null, 210);

    // Lenguas de energía / runas orbitando en 4 cuadros
    for (let i = 0; i < 8; i++) {
      const ang = (f / 4) * Math.PI * 2 + (i * Math.PI) / 4;
      const ox = cx + Math.cos(ang) * (r - 2);
      const oy = cy - 4 + Math.sin(ang) * 18;
      const h = 8 + ((i + f) % 3) * 4;
      c.outlinedRect(ox - 2, oy - h, 4, h, mainCol, darkCol);
      c.rect(ox - 1, oy - h + 1, 2, h - 2, coreCol);
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   2. EFECTOS DE SOMBRAS DINÁMICAS 2.5D (4 CUADROS)
   ========================================================= */

// 2a. Sombra Dinámica de Entidad (4 fases: apoyo, paso alto, vuelo/salto, embate)
function buildEntityShadowSheet() {
  const FW = 64, FH = 32;
  const c = new PixelCanvas(FW * 4, FH);
  const rxList = [22, 19, 16, 25];
  const ryList = [9, 8, 6, 10];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 32;
    const cy = 16;
    const rx = rxList[f];
    const ry = ryList[f];
    c.radialGlow(cx, cy, rx, ry, [
      { minDist: 0.0, maxDist: 0.52, color: '#090612', alpha: 180, solid: true },
      { minDist: 0.52, maxDist: 0.82, color: '#0D0A14', alpha: 130, solid: false },
      { minDist: 0.82, maxDist: 1.0, color: '#1E1B2E', alpha: 75, solid: false }
    ]);
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 2b. Sombra Pesada de Jefe con Corrupción del Vacío (4 fases)
function buildBossShadowSheet() {
  const FW = 96, FH = 48;
  const c = new PixelCanvas(FW * 4, FH);
  const rxList = [38, 41, 39, 43];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const cy = 24;
    const rx = rxList[f];
    const ry = Math.round(rx * 0.44);
    c.radialGlow(cx, cy, rx, ry, [
      { minDist: 0.0, maxDist: 0.55, color: '#06030C', alpha: 215, solid: true },
      { minDist: 0.55, maxDist: 0.84, color: '#2E1065', alpha: 155, solid: false },
      { minDist: 0.84, maxDist: 1.0, color: '#7E22CE', alpha: 95, solid: false }
    ]);
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   3. EFECTOS DE MOVIMIENTO, LOCOMOCIÓN Y CLIMA (4 CUADROS)
   ========================================================= */

// 3a. Polvo de Pasos al Caminar/Correr (4 cuadros: nacimiento -> expansión -> disipación)
function buildFootstepDustSheet() {
  const FW = 48, FH = 48;
  const c = new PixelCanvas(FW * 4, FH);
  const clouds = [
    [[0, 4, 6], [-5, 6, 4], [5, 5, 4]],
    [[-6, 1, 8], [6, 0, 7], [0, -3, 6], [-10, 5, 4]],
    [[-10, -3, 7], [9, -4, 6], [-2, -8, 5], [12, 2, 4]],
    [[-14, -7, 4], [13, -8, 4], [-4, -12, 3], [6, -11, 3]]
  ];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 24;
    const cy = 28;
    const alpha = [245, 220, 175, 115][f];
    for (const [dx, dy, r] of clouds[f]) {
      c.ellipse(cx + dx, cy + dy, r, Math.max(2, Math.round(r * 0.78)), '#D6C7B2', '#57534E', alpha);
      if (r >= 5) {
        c.ellipse(cx + dx - 1, cy + dy - 1, Math.round(r * 0.55), Math.round(r * 0.45), '#F5ECE0', null, alpha);
      }
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 3b. Estela de Velocidad / Dash / Embestida / Montura (4 cuadros)
function buildDashTrailSheet() {
  const FW = 64, FH = 48;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const ox = f * FW;
    const cy = 24;
    // Líneas de viento aerodinámicas y anillo de choque
    const ringX = ox + 44 - f * 4;
    c.ellipse(ringX, cy, 6 + f * 2, 14 + f * 2, '#BAE6FD', '#0284C7', 210 - f * 30);
    const streaks = [
      { y: cy - 12, x: 8 + f * 3, len: 30 - f * 4, col: '#38BDF8' },
      { y: cy - 4, x: 4 + f * 4, len: 38 - f * 5, col: '#FFFFFF' },
      { y: cy + 5, x: 6 + f * 3, len: 34 - f * 4, col: '#7DD3FC' },
      { y: cy + 13, x: 10 + f * 2, len: 26 - f * 3, col: '#38BDF8' }
    ];
    for (const st of streaks) {
      c.outlinedRect(ox + st.x, st.y, st.len, 4, st.col, '#0369A1');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 3c. Ondas y Salpicaduras de Agua (Río del Bosque y Fuentes)
function buildWaterRippleSheet() {
  const FW = 64, FH = 32;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 32;
    const cy = 16;
    const rx1 = 8 + f * 5;
    const ry1 = 4 + f * 2;
    c.ellipse(cx, cy, rx1, ry1, '#0284C700', '#BAE6FD');
    const rx2 = 8 + ((f + 2) % 4) * 5;
    const ry2 = 4 + ((f + 2) % 4) * 2;
    c.ellipse(cx, cy, rx2, ry2, '#0284C700', '#38BDF8');
    // Gotas de espuma saltando
    const dropY = [10, 7, 9, 12][f];
    c.outlinedRect(cx - 10 + f * 2, dropY, 3, 3, '#FFFFFF', '#0284C7');
    c.outlinedRect(cx + 8 - f * 2, dropY + 1, 3, 3, '#E0F2FE', '#0284C7');
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 3d. Partículas Climáticas Animadas por Bioma (Mariposas, Ceniza, Nieve, Tormenta del Vacío)
function buildWeatherParticlesSheet(kind) {
  const FW = 32, FH = 32;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 16;
    const cy = 16;
    if (kind === 'butterflies') {
      // Mariposa luminosa batiendo las alas en 4 fases
      const wingW = [9, 5, 3, 6][f];
      const wingY = [0, -2, -3, -1][f];
      c.outlinedRect(cx - wingW - 1, cy - 6 + wingY, wingW, 7, '#FDE047', '#0D0A14');
      c.outlinedRect(cx + 1, cy - 6 + wingY, wingW, 7, '#FDE047', '#0D0A14');
      c.outlinedRect(cx - wingW, cy + 1, Math.max(2, wingW - 2), 5, '#FB923C', '#0D0A14');
      c.outlinedRect(cx + 2, cy + 1, Math.max(2, wingW - 2), 5, '#FB923C', '#0D0A14');
      if (wingW >= 5) {
        c.rect(cx - wingW + 1, cy - 4 + wingY, 2, 2, '#FFFFFF');
        c.rect(cx + wingW - 3, cy - 4 + wingY, 2, 2, '#FFFFFF');
      }
      c.outlinedRect(cx - 1, cy - 5, 3, 10, '#451A03', '#0D0A14');
    } else if (kind === 'ash') {
      // Pavesa volcánica ardiente girando con estela de humo
      const rot = f % 2;
      c.outlinedRect(cx - 4, cy - 3, 8, 6, '#44403C', '#0D0A14');
      c.rect(cx - 2 + rot, cy - 1, 4, 3, '#EA580C');
      c.rect(cx - 1 + rot, cy, 2, 2, '#FEF08A');
      c.outlinedRect(cx + 4, cy - 6 + f, 3, 3, '#FB923C', '#0D0A14');
    } else if (kind === 'snow') {
      // Copo de nieve cristalino de 16 bits rotando
      c.outlinedRect(cx - 2, cy - 7, 4, 14, '#E0F2FE', '#0284C7');
      c.outlinedRect(cx - 7, cy - 2, 14, 4, '#E0F2FE', '#0284C7');
      if (f % 2 === 0) {
        c.outlinedRect(cx - 5, cy - 5, 10, 10, '#BAE6FD', '#0369A1');
      }
      c.rect(cx - 2, cy - 2, 4, 4, '#FFFFFF');
    } else {
      // Fragmento/Rayo de Tormenta del Vacío
      const h = [12, 16, 14, 18][f];
      c.outlinedRect(cx - 4, cy - h / 2, 8, h, '#9333EA', '#0D0A14');
      c.rect(cx - 2, cy - h / 2 + 2, 4, h - 4, '#E879F9');
      c.rect(cx - 1, cy - 3, 2, 6, '#FFFFFF');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   4. EFECTOS DE COMBATE, HABILIDADES, PROYECTILES E IMPACTOS
   ========================================================= */

// 4a. Tajo de Espada / Golpe de Furia en 4 Cuadros
function buildSwordSlashSheet() {
  const FW = 72, FH = 72;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 28;
    const cy = 36;
    const aStart = -1.35 + f * 0.28;
    const aEnd = -0.35 + f * 0.55;
    for (let r = 16; r <= 30; r++) {
      for (let a = aStart; a <= aEnd; a += 0.03) {
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        const isEdge = r <= 17 || r >= 29 || a <= aStart + 0.06 || a >= aEnd - 0.06;
        const isCore = r >= 23 && r <= 27;
        c.pset(px, py, isEdge ? '#0D0A14' : isCore ? '#FFFFFF' : r > 20 ? '#FDE047' : '#F59E0B');
      }
    }
    // Chispas de corte metálico
    c.outlinedRect(cx + 18 + f * 3, cy - 14 + f * 6, 4, 4, '#FEF9C3', '#B45309');
    c.outlinedRect(cx + 12 + f * 4, cy + 8 + f * 3, 3, 3, '#FDE047', '#0D0A14');
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4b. Proyectiles Animados de 4 Cuadros (Bola de Fuego, Orbe Arcano, Orbe del Vacío, Flecha Veloz)
function buildProjectileSheet(kind) {
  const FW = 48, FH = 48;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const ox = f * FW;
    const cx = ox + 28;
    const cy = 24;

    if (kind === 'arrow') {
      // Estela aerodinámica + flecha con plumas y punta de acero
      const trailW = 14 + (f % 2) * 4;
      c.rect(cx - 18 - trailW, cy - 2, trailW, 4, '#FDE047', 160);
      c.outlinedRect(cx - 16, cy - 3, 24, 6, '#D9A441', '#0D0A14');
      c.rect(cx - 14, cy - 1, 20, 2, '#FEF08A');
      // Punta de diamante
      c.outlinedRect(cx + 6, cy - 5, 8, 10, '#E2E8F0', '#0D0A14');
      c.rect(cx + 8, cy - 3, 4, 6, '#FFFFFF');
      // Plumas traseras
      c.outlinedRect(cx - 20, cy - 6, 6, 4, '#EF4444', '#0D0A14');
      c.outlinedRect(cx - 20, cy + 2, 6, 4, '#EF4444', '#0D0A14');
    } else {
      const pal =
        kind === 'fire'
          ? { out: '#7C2D12', mid: '#EA580C', hi: '#FACC15', core: '#FFFFFF' }
          : kind === 'void'
          ? { out: '#3B0764', mid: '#9333EA', hi: '#E879F9', core: '#FFFFFF' }
          : { out: '#0369A1', mid: '#0284C7', hi: '#38BDF8', core: '#E0F2FE' };

      // Cola / estela flameante en 4 fases
      for (let t = 0; t < 3; t++) {
        const tx = cx - 8 - t * 6;
        const ty = cy + Math.round(Math.sin(f * 1.6 + t) * 2);
        const tr = 8 - t * 2;
        c.ellipse(tx, ty, tr + 2, tr, pal.mid, '#0D0A14');
        c.ellipse(tx, ty, tr - 1, Math.max(1, tr - 2), pal.hi);
      }
      // Núcleo esférico brillante
      c.ellipse(cx, cy, 10, 10, pal.mid, '#0D0A14');
      c.ellipse(cx, cy, 7, 7, pal.hi);
      c.ellipse(cx + 1, cy - 1, 4, 4, pal.core);
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4c. Explosión Ígnea (Bola de Fuego / Círculo de Ignis) en 4 Cuadros
function buildFireExplosionSheet() {
  const FW = 96, FH = 96;
  const c = new PixelCanvas(FW * 4, FH);
  const radii = [18, 30, 38, 42];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const cy = 48;
    const r = radii[f];
    if (f < 3) {
      c.ellipse(cx, cy, r, r, '#EA580C', '#0D0A14');
      c.ellipse(cx, cy, Math.round(r * 0.75), Math.round(r * 0.75), '#FACC15');
      c.ellipse(cx, cy, Math.round(r * 0.45), Math.round(r * 0.45), '#FEF9C3');
    } else {
      // Cuadro 3: anillo de humo y brasas expansivas
      c.ring(cx, cy, r, r - 10, '#EA580C', '#0D0A14');
      c.ring(cx, cy, r - 3, r - 7, '#FACC15');
    }
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4 + f * 0.2;
      const sx = cx + Math.cos(ang) * (r + 3);
      const sy = cy + Math.sin(ang) * (r + 3);
      c.outlinedRect(sx - 3, sy - 3, 6, 6, i % 2 === 0 ? '#FEF08A' : '#FB923C', '#0D0A14');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4d. Nova de Escarcha (Mago / Boreas) en 4 Cuadros
function buildFrostNovaSheet() {
  const FW = 96, FH = 96;
  const c = new PixelCanvas(FW * 4, FH);
  const radii = [18, 28, 36, 42];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const cy = 48;
    const r = radii[f];
    c.ring(cx, cy, r, Math.max(4, r - 8), '#38BDF8', '#0D0A14');
    c.ring(cx, cy, r - 2, Math.max(6, r - 6), '#E0F2FE');
    // Puntas de cristal de hielo en 8 direcciones
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      c.outlinedRect(px - 4, py - 4, 8, 8, '#BAE6FD', '#0369A1');
      c.rect(px - 2, py - 2, 4, 4, '#FFFFFF');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4e. Trampa de Raíces (Arquero) en 4 Cuadros
function buildRootTrapSheet() {
  const FW = 64, FH = 64;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 32;
    const cy = 36;
    c.ellipse(cx, cy + 4, 22, 10, '#14532D', '#0D0A14');
    c.ellipse(cx, cy + 4, 18, 7, '#166534');
    // Zarzas y raíces espinosas emergiendo según el cuadro
    const rootH = 12 + (f % 2) * 5;
    for (const rx of [-14, -6, 4, 12]) {
      const sway = ((f + rx) % 2 === 0 ? 2 : -2);
      c.outlinedRect(cx + rx + sway, cy - rootH, 6, rootH + 6, '#15803D', '#0D0A14');
      c.rect(cx + rx + sway + 1, cy - rootH + 2, 3, rootH, '#4ADE80');
      // Flores/espinas brillantes
      c.outlinedRect(cx + rx + sway - 1, cy - rootH - 2, 4, 4, '#FEF08A', '#0D0A14');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4f. Lluvia de Flechas (Arquero) en 4 Cuadros
function buildArrowRainSheet() {
  const FW = 96, FH = 96;
  const c = new PixelCanvas(FW * 4, FH);
  const arrows = [
    [-24, -18], [-8, -26], [12, -20], [26, -12], [-16, -4], [6, -8], [20, 4]
  ];
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const cy = 64;
    // Círculo de impacto dorado en el suelo
    c.ellipse(cx, cy + 8, 34, 14, '#EAB308', '#0D0A14', 175);
    c.ellipse(cx, cy + 8, 26, 10, '#FEF08A', null, 195);
    const drop = f * 8;
    for (const [ax, ay] of arrows) {
      const px = cx + ax;
      const py = cy + ay - 22 + ((drop + Math.abs(ax)) % 30);
      c.outlinedRect(px - 2, py - 18, 4, 18, '#FDE047', '#0D0A14');
      c.outlinedRect(px - 3, py - 3, 6, 5, '#FFFFFF', '#0D0A14');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4g. Impacto / Golpe Crítico (Hit Spark) en 4 Cuadros
function buildHitSparkSheet() {
  const FW = 48, FH = 48;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 24;
    const cy = 24;
    const r = 6 + f * 4;
    if (f < 2) {
      c.outlinedRect(cx - r, cy - 3, r * 2, 6, '#FDE047', '#0D0A14');
      c.outlinedRect(cx - 3, cy - r, 6, r * 2, '#FDE047', '#0D0A14');
      c.rect(cx - r + 2, cy - 1, (r - 2) * 2, 2, '#FFFFFF');
      c.rect(cx - 1, cy - r + 2, 2, (r - 2) * 2, '#FFFFFF');
    }
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + (i * Math.PI) / 2;
      const sx = cx + Math.cos(ang) * r;
      const sy = cy + Math.sin(ang) * r;
      c.outlinedRect(sx - 3, sy - 3, 6 - f, 6 - f, '#FEF08A', '#0D0A14');
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

// 4h. Columna de Luz al Subir de Nivel (Level Up!) en 4 Cuadros
function buildLevelUpSheet() {
  const FW = 96, FH = 112;
  const c = new PixelCanvas(FW * 4, FH);
  for (let f = 0; f < 4; f++) {
    const cx = f * FW + 48;
    const footY = 92;
    const colW = [22, 32, 26, 16][f];
    // Pilar vertical de luz celestial dorada
    c.rect(cx - colW / 2, 8, colW, footY - 4, '#F59E0B', 145);
    c.rect(cx - colW / 3, 8, (colW * 2) / 3, footY - 4, '#FDE047', 195);
    c.rect(cx - Math.max(2, colW / 6), 8, Math.max(4, colW / 3), footY - 4, '#FFFFFF', 230);
    // Anillos ascendentes alrededor del héroe
    for (let rIdx = 0; rIdx < 3; rIdx++) {
      const ry = footY - ((f * 18 + rIdx * 28) % 76);
      c.ellipse(cx, ry, 28 - rIdx * 3, 9, '#FDE047', '#B45309', 225);
      c.ellipse(cx, ry, 22 - rIdx * 3, 6, '#FFFFFF', null, 240);
    }
  }
  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   5. GIFs ANIMADOS DE 4 CUADROS PARA LOS 19 PERSONAJES, MASCOTAS Y JEFES BASE
   ========================================================= */
function loadAndCleanRawModel(name, w = 144, h = 144) {
  const rawPath = path.join(RAW_DIR, `${name}.rgba`);
  if (!fs.existsSync(rawPath)) return null;
  const d = Buffer.from(fs.readFileSync(rawPath));
  const total = w * h;
  const visited = new Uint8Array(total);
  const q = new Int32Array(total);
  let head = 0, tail = 0;

  const isBg = (idx) => {
    const o = idx * 4;
    const r = d[o], g = d[o + 1], b = d[o + 2], a = d[o + 3];
    if (a < 16) return true;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = (r + g + b) / 3;
    const sat = max - min;
    return (lum >= 232 && sat <= 26) || (r >= 224 && g >= 224 && b >= 224 && sat <= 18);
  };

  const push = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx] || !isBg(idx)) return;
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

function buildFourFramesFromModel(model) {
  const sw = model.w, sh = model.h;
  const padX = Math.max(5, Math.round(sw * 0.08));
  const padTop = Math.max(5, Math.round(sh * 0.06));
  const fw = sw + padX * 2;
  const fh = sh + padTop;
  const sheetData = Buffer.alloc(fw * 4 * fh * 4, 0);

  const blitRegion = (srcX, srcY, regW, regH, dstX, dstY) => {
    for (let ry = 0; ry < regH; ry++) {
      const sy = srcY + ry, dy = dstY + ry;
      if (sy < 0 || sy >= sh || dy < 0 || dy >= fh) continue;
      for (let rx = 0; rx < regW; rx++) {
        const sx = srcX + rx, dx = dstX + rx;
        if (sx < 0 || sx >= sw || dx < 0 || dx >= fw * 4) continue;
        const sO = (sy * sw + sx) * 4;
        if (model.data[sO + 3] < 20) continue;
        const dO = (dy * (fw * 4) + dx) * 4;
        sheetData[dO] = model.data[sO];
        sheetData[dO + 1] = model.data[sO + 1];
        sheetData[dO + 2] = model.data[sO + 2];
        sheetData[dO + 3] = model.data[sO + 3];
      }
    }
  };

  const headH = Math.floor(sh * 0.36);
  const torsoY = headH;
  const legY = Math.floor(sh * 0.64);
  const torsoH = legY - torsoY;
  const legH = sh - legY;
  const midX = Math.floor(sw * 0.5);
  const rightW = sw - midX;

  const stepPx = Math.max(3, Math.round(sw * 0.05));
  const liftPx = Math.max(3, Math.round(sh * 0.042));
  const swingPx = Math.max(2, Math.round(sw * 0.028));

  const drawFrame = (fIdx, { headDx = 0, headDy = 0, torsoDx = 0, torsoDy = 0, lDx = 0, lDy = 0, rDx = 0, rDy = 0 }) => {
    const ox = fIdx * fw + padX;
    const oy = padTop;
    blitRegion(0, legY, midX, legH, ox + lDx, oy + legY + lDy);
    blitRegion(midX, legY, rightW, legH, ox + midX + rDx, oy + legY + rDy);
    blitRegion(0, torsoY, sw, torsoH + 3, ox + torsoDx, oy + torsoY + torsoDy);
    blitRegion(0, 0, sw, headH + 2, ox + headDx, oy + headDy);
  };

  drawFrame(0, {});
  drawFrame(1, { headDx: swingPx, headDy: -liftPx, torsoDx: swingPx, torsoDy: -liftPx, lDx: -stepPx, lDy: -liftPx, rDx: stepPx, rDy: 0 });
  drawFrame(2, { headDx: -swingPx, headDy: -liftPx, torsoDx: -swingPx, torsoDy: -liftPx, lDx: -stepPx, lDy: 0, rDx: stepPx, rDy: -liftPx });
  drawFrame(3, { headDx: stepPx, headDy: -1, torsoDx: stepPx + swingPx, torsoDy: -1, lDx: -stepPx, lDy: 0, rDx: stepPx + 1, rDy: -2 });

  const frames = [];
  for (let f = 0; f < 4; f++) {
    const fBuf = Buffer.alloc(fw * fh * 4);
    for (let y = 0; y < fh; y++) {
      const srcStart = (y * (fw * 4) + f * fw) * 4;
      sheetData.copy(fBuf, y * fw * 4, srcStart, srcStart + fw * 4);
    }
    frames.push(fBuf);
  }
  return { fw, fh, frames };
}

function generateBaseModelGifs() {
  const baseModels = [
    'heroe_guerrero', 'heroe_mago', 'heroe_arquero',
    'heroina_guerrera', 'heroina_maga', 'heroina_arquera',
    'mascota_lobo', 'mascota_fantasma', 'mascota_gato', 'mascota_dragon',
    'jefe_malakor', 'jefe_ignis', 'jefe_boreas', 'jefe_vaelor',
    'enemigo_lobo', 'enemigo_trasgo', 'enemigo_esqueleto', 'enemigo_elemental',
    'npc_tabernero', 'npc_herrero', 'prop_muneco'
  ];

  for (const name of baseModels) {
    const cleaned = loadAndCleanRawModel(name);
    if (!cleaned) continue;
    const { fw, fh, frames } = buildFourFramesFromModel(cleaned);
    const gifBuf = encodeAnimatedGIF(fw, fh, frames, 13);
    const gifPath = path.join(ASSETS_DIR, `${name}.gif`);
    fs.writeFileSync(gifPath, gifBuf);
    console.log(`[CHAR-GIF] ${name}.gif (${fw}x${fh}, 4 frames, ${(gifBuf.length / 1024).toFixed(1)}KB)`);
  }
}

function main() {
  console.log('=== Generando Spritesheets PNG de 4 Cuadros + GIFs Animados (Luces, Sombras, Movimiento y Combate) ===');

  // 1. Efectos de Luz e Iluminación
  saveSheetAndGif('fx_halo_calido', buildWarmHaloSheet(), 14);
  saveSheetAndGif('fx_halo_vacio', buildVoidHaloSheet(), 14);
  saveSheetAndGif('fx_halo_jugador', buildPlayerLanternHaloSheet(), 16);
  saveSheetAndGif('fx_rayos_luz', buildSunbeamsSheet(), 15);
  saveSheetAndGif('fx_aura_legendaria', buildAuraSheet('legendary'), 11);
  saveSheetAndGif('fx_aura_furia', buildAuraSheet('fury'), 10);

  // 2. Efectos de Sombras Dinámicas 2.5D
  saveSheetAndGif('fx_sombra_entidad', buildEntityShadowSheet(), 13);
  saveSheetAndGif('fx_sombra_jefe', buildBossShadowSheet(), 14);

  // 3. Efectos de Movimiento, Locomoción y Clima
  saveSheetAndGif('fx_polvo_pasos', buildFootstepDustSheet(), 10);
  saveSheetAndGif('fx_estela_dash', buildDashTrailSheet(), 9);
  saveSheetAndGif('fx_ondas_agua', buildWaterRippleSheet(), 14);
  saveSheetAndGif('fx_clima_mariposas', buildWeatherParticlesSheet('butterflies'), 10);
  saveSheetAndGif('fx_clima_ceniza', buildWeatherParticlesSheet('ash'), 12);
  saveSheetAndGif('fx_clima_nieve', buildWeatherParticlesSheet('snow'), 14);
  saveSheetAndGif('fx_clima_vacio', buildWeatherParticlesSheet('void_storm'), 11);

  // 4. Efectos de Combate, Habilidades, Proyectiles e Impactos
  saveSheetAndGif('fx_tajo_espada', buildSwordSlashSheet(), 8);
  saveSheetAndGif('fx_proyectil_fuego', buildProjectileSheet('fire'), 9);
  saveSheetAndGif('fx_proyectil_arcano', buildProjectileSheet('arcane'), 9);
  saveSheetAndGif('fx_proyectil_vacio', buildProjectileSheet('void'), 9);
  saveSheetAndGif('fx_proyectil_flecha', buildProjectileSheet('arrow'), 9);
  saveSheetAndGif('fx_explosion_fuego', buildFireExplosionSheet(), 9);
  saveSheetAndGif('fx_nova_escarcha', buildFrostNovaSheet(), 10);
  saveSheetAndGif('fx_trampa_raices', buildRootTrapSheet(), 13);
  saveSheetAndGif('fx_lluvia_flechas', buildArrowRainSheet(), 9);
  saveSheetAndGif('fx_impacto_golpe', buildHitSparkSheet(), 8);
  saveSheetAndGif('fx_level_up', buildLevelUpSheet(), 11);

  // 5. GIFs animados de 4 cuadros para los personajes, mascotas y jefes base
  generateBaseModelGifs();

  console.log('=== Todos los PNGs y GIFs de efectos visuales fueron generados con éxito ===');
}

main();
