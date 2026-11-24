/**
 * Generador de Assets PNG de 4 cuadros y GIFs Animados (GIF89a) de Pixel Art 16-Bit Detallado
 * Produce archivos reales de imagen (.png y .gif) en public/assets/ con:
 * - Edificios ilustrados con dithering, tejas individuales, mampostería, vigas de roble, vitrales, barriles y horno:
 *   * edificio_taberna.png (220x160)
 *   * edificio_herreria.png (220x160)
 *   * edificio_refugio.png (220x160)
 * - Spritesheets animados de 4 cuadros (.png) y sus respectivos GIFs animados (.gif):
 *   * prop_fuente.png (4 cuadros: 384x96 -> 96x96 por cuadro) + prop_fuente.gif
 *   * prop_fogata.png (4 cuadros: 256x64 -> 64x64 por cuadro) + prop_fogata.gif
 *   * prop_portal.png (4 cuadros: 384x96 -> 96x96 por cuadro) + prop_portal.gif
 *   * prop_cofre.png  (2 cuadros: 128x64 -> 64x64 cerrado/abierto)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

/* =========================================================
   CODIFICADOR PNG RGBA DE 32 BITS (CON TRANSPARENCIA REAL)
   ========================================================= */
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
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

/* =========================================================
   CODIFICADOR GIF89a ANIMADO CON TRANSPARENCIA Y LOOP INFINITO
   ========================================================= */
function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dict = new Map();

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
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
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
  // Construir paleta global de hasta 255 colores + índice 0 transparente
  const palette = [[0, 0, 0]]; // idx 0 = transparente
  const colorMap = new Map();

  const getColorIndex = (r, g, b, a) => {
    if (a < 128) return 0;
    // Cuantizar ligeramente a 6 bits para asegurar <255 colores únicos
    const qr = r & 0xfc;
    const qg = g & 0xfc;
    const qb = b & 0xfc;
    const key = (qr << 16) | (qg << 8) | qb;
    if (colorMap.has(key)) return colorMap.get(key);
    if (palette.length < 256) {
      const idx = palette.length;
      palette.push([qr, qg, qb]);
      colorMap.set(key, idx);
      return idx;
    }
    // Buscar color más cercano en la paleta
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
  // Header GIF89a + Logical Screen Descriptor
  const header = Buffer.alloc(13);
  header.write('GIF89a', 0, 'ascii');
  header.writeUInt16LE(frameWidth, 6);
  header.writeUInt16LE(frameHeight, 8);
  header[10] = 0xf7; // Global Color Table 256 colors (2^(7+1))
  header[11] = 0; // bg color index
  header[12] = 0;
  chunks.push(header);

  // Global Color Table (256 * 3 bytes)
  const gct = Buffer.alloc(256 * 3);
  for (let i = 0; i < 256; i++) {
    gct[i * 3] = palette[i][0];
    gct[i * 3 + 1] = palette[i][1];
    gct[i * 3 + 2] = palette[i][2];
  }
  chunks.push(gct);

  // Netscape 2.0 Application Extension for infinite looping
  chunks.push(
    Buffer.from([
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
      0x03, 0x01, 0x00, 0x00, 0x00
    ])
  );

  for (const idxArr of indexedFrames) {
    // Graphic Control Extension (Dispose to background, transparency index 0)
    const gce = Buffer.from([
      0x21, 0xf9, 0x04,
      0x09, // disposal method 2 (restore to bg) + transparent flag 1
      delayCs & 0xff, (delayCs >> 8) & 0xff,
      0x00, // transparent color index = 0
      0x00
    ]);
    chunks.push(gce);

    // Image Descriptor
    const desc = Buffer.alloc(10);
    desc[0] = 0x2c;
    desc.writeUInt16LE(0, 1);
    desc.writeUInt16LE(0, 3);
    desc.writeUInt16LE(frameWidth, 5);
    desc.writeUInt16LE(frameHeight, 7);
    desc[9] = 0x00;
    chunks.push(desc);

    // LZW Image Data
    const minCodeSize = 8;
    const lzw = lzwEncode(idxArr, minCodeSize);
    chunks.push(Buffer.from([minCodeSize]));
    for (let pos = 0; pos < lzw.length; pos += 255) {
      const slice = lzw.slice(pos, Math.min(lzw.length, pos + 255));
      chunks.push(Buffer.from([slice.length]));
      chunks.push(slice);
    }
    chunks.push(Buffer.from([0x00])); // block terminator
  }

  chunks.push(Buffer.from([0x3b])); // GIF trailer
  return Buffer.concat(chunks);
}

/* =========================================================
   LIENZO PIXEL ART DE 16 BITS CON PRIMITIVAS DETALLADAS
   ========================================================= */
class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4, 0);
  }

   hexToRgba(hex) {
    if (Array.isArray(hex)) return hex;
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const a = clean.length === 8 ? parseInt(clean.substring(6, 8), 16) : 255;
    return [r, g, b, a];
  }

  pset(x, y, col) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const [r, g, b, a] = this.hexToRgba(col);
    const idx = (iy * this.w + ix) * 4;
    if (a === 255) {
      this.data[idx] = r;
      this.data[idx + 1] = g;
      this.data[idx + 2] = b;
      this.data[idx + 3] = 255;
    } else if (a > 0) {
      const alpha = a / 255;
      const inv = 1 - alpha;
      this.data[idx] = Math.round(r * alpha + this.data[idx] * inv);
      this.data[idx + 1] = Math.round(g * alpha + this.data[idx + 1] * inv);
      this.data[idx + 2] = Math.round(b * alpha + this.data[idx + 2] * inv);
      this.data[idx + 3] = Math.min(255, Math.round(a + this.data[idx + 3] * inv));
    }
  }

  rect(x, y, w, h, col) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    for (let py = y0; py < y0 + rh; py++) {
      for (let px = x0; px < x0 + rw; px++) {
        this.pset(px, py, col);
      }
    }
  }

  ditherRect(x, y, w, h, colA, colB, pattern = 'checker') {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    for (let py = y0; py < y0 + rh; py++) {
      for (let px = x0; px < x0 + rw; px++) {
        const useB =
          pattern === 'checker'
            ? (px + py) % 2 === 0
            : pattern === 'sparse'
            ? (px % 2 === 0 && py % 2 === 0)
            : (py % 2 === 0);
        this.pset(px, py, useB ? colB : colA);
      }
    }
  }

  outlinedRect(x, y, w, h, fillCol, outlineCol = '#0D0A14') {
    this.rect(x, y, w, h, outlineCol);
    if (w > 2 && h > 2) {
      this.rect(x + 1, y + 1, w - 2, h - 2, fillCol);
    }
  }

  ellipse(cx, cy, rx, ry, col, outlineCol = null) {
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
          if (outlineCol && d >= 0.78) {
            this.pset(px, py, outlineCol);
          } else {
            this.pset(px, py, col);
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

/* =========================================================
   1. EDIFICIOS MEDIEVALES 16-BIT (TABERNA, HERRERÍA, REFUGIO)
   ========================================================= */
function drawDetailedBuildingSprite(kind) {
  const W = 220;
  const H = 160;
  const c = new PixelCanvas(W, H);

  const palettes = {
    taberna: {
      roofDark: '#6A231B',
      roofMid: '#943428',
      roofHi: '#B84A39',
      roofTrim: '#D9A441',
      wallBase: '#D9C3A1',
      wallDither: '#CBB28D',
      wallShadow: '#A68D6A',
      timberDark: '#2E1A0F',
      timberMid: '#4A2B18',
      timberHi: '#684026',
      winGlow: '#FEF08A',
      winMid: '#F59E0B',
      accent: '#EAB308'
    },
    herreria: {
      roofDark: '#1E293B',
      roofMid: '#334155',
      roofHi: '#475569',
      roofTrim: '#94A3B8',
      wallBase: '#94A3B8',
      wallDither: '#7C8DA6',
      wallShadow: '#64748B',
      timberDark: '#1E1B18',
      timberMid: '#3B2F2F',
      timberHi: '#574646',
      winGlow: '#FB923C',
      winMid: '#DC2626',
      accent: '#EA580C'
    },
    refugio: {
      roofDark: '#17376E',
      roofMid: '#1E4E8C',
      roofHi: '#2E6BB8',
      roofTrim: '#F2B63D',
      wallBase: '#E2E8F0',
      wallDither: '#CBD5E1',
      wallShadow: '#94A3B8',
      timberDark: '#1E293B',
      timberMid: '#334155',
      timberHi: '#475569',
      winGlow: '#BAE6FD',
      winMid: '#38BDF8',
      accent: '#FDE047'
    }
  };

  const p = palettes[kind] || palettes.taberna;

  // Sombra proyectada en la base
  c.ellipse(110, 148, 98, 10, '#0D0A1488');

  // Chimenea de piedra lateral derecha
  const chimX = 166;
  const chimY = 6;
  c.outlinedRect(chimX, chimY, 24, 38, '#475569', '#0D0A14');
  c.ditherRect(chimX + 2, chimY + 2, 20, 34, '#475569', '#64748B', 'sparse');
  for (let cy = chimY + 6; cy < chimY + 32; cy += 6) {
    c.rect(chimX + 2, cy, 20, 1, '#1E293B');
    c.rect(chimX + 8 + ((cy % 12) ? 4 : 0), cy - 5, 1, 5, '#1E293B');
  }
  c.outlinedRect(chimX - 2, chimY, 28, 6, '#64748B', '#0D0A14');
  c.rect(chimX, chimY + 1, 24, 2, '#94A3B8');

  // Cuerpo principal de la fachada
  const wallX = 18;
  const wallY = 58;
  const wallW = 184;
  const wallH = 88;
  c.outlinedRect(wallX, wallY, wallW, wallH, p.wallBase, '#0D0A14');
  c.ditherRect(wallX + 2, wallY + 2, wallW - 4, wallH - 4, p.wallBase, p.wallDither, 'sparse');
  // Sombra profunda bajo el alero
  c.rect(wallX + 2, wallY + 2, wallW - 4, 8, p.wallShadow);
  c.rect(wallX + 2, wallY + 2, wallW - 4, 4, '#0D0A1466');

  // Zócalo inferior de mampostería de piedra tallada (24px de alto)
  const plinthY = wallY + wallH - 24;
  c.outlinedRect(wallX, plinthY, wallW, 24, '#475569', '#0D0A14');
  for (let row = 0; row < 3; row++) {
    const ry = plinthY + 2 + row * 7;
    const offset = (row % 2) * 11;
    for (let bx = wallX + 2 + offset; bx < wallX + wallW - 14; bx += 22) {
      c.outlinedRect(bx, ry, 20, 6, '#64748B', '#1E293B');
      c.rect(bx + 1, ry + 1, 18, 2, '#94A3B8');
    }
  }

  // Entramado de vigas de madera de roble (half-timbered RPG framing)
  const beamPositions = [wallX + 2, wallX + 54, wallX + wallW - 60, wallX + wallW - 8];
  for (const bx of beamPositions) {
    c.outlinedRect(bx, wallY + 2, 6, wallH - 24, p.timberMid, '#0D0A14');
    c.rect(bx + 1, wallY + 3, 2, wallH - 26, p.timberHi);
  }
  // Viga horizontal central
  const midBeamY = wallY + 38;
  c.outlinedRect(wallX + 2, midBeamY, wallW - 4, 6, p.timberMid, '#0D0A14');
  c.rect(wallX + 3, midBeamY + 1, wallW - 6, 2, p.timberHi);

  // Tejado inclinado escalonado en perspectiva 2.5D con tejas individuales
  const roofTopY = 16;
  const roofH = 46;
  for (let ry = 0; ry < roofH; ry++) {
    const spread = Math.floor((ry / roofH) * 14);
    const rx = 14 - spread;
    const rw = W - 28 + spread * 2;
    const py = roofTopY + ry;
    c.rect(rx, py, rw, 1, '#0D0A14');
    const isRidge = ry < 5;
    const col = isRidge ? p.roofHi : ry > roofH - 6 ? p.roofDark : p.roofMid;
    c.rect(rx + 2, py, rw - 4, 1, col);

    // Patrón de tejas curvas cada 6px
    if (ry >= 6 && ry < roofH - 3) {
      if (ry % 6 === 0) {
        c.rect(rx + 3, py, rw - 6, 1, p.roofDark);
      } else if (ry % 6 === 1) {
        c.rect(rx + 3, py, rw - 6, 1, p.roofHi);
      }
      const tileShift = (Math.floor(ry / 6) % 2) * 7;
      for (let tx = rx + 6 + tileShift; tx < rx + rw - 6; tx += 14) {
        c.pset(tx, py, p.roofDark);
        c.pset(tx + 1, py, '#0D0A14');
      }
    }
    // Borde dorado/madera lateral del tejado
    c.rect(rx + 1, py, 3, 1, p.roofTrim);
    c.rect(rx + rw - 4, py, 3, 1, p.roofTrim);
  }
  // Cumbrera superior decorada
  c.outlinedRect(14, roofTopY - 2, W - 28, 6, p.roofTrim, '#0D0A14');
  c.rect(16, roofTopY - 1, W - 32, 2, '#FEF08A');

  // Buhardilla / Gablete central sobre el tejado
  const gabX = 82;
  const gabY = 22;
  c.outlinedRect(gabX, gabY, 56, 36, p.wallBase, '#0D0A14');
  c.outlinedRect(gabX - 4, gabY - 4, 64, 8, p.roofTrim, '#0D0A14');
  c.outlinedRect(gabX + 18, gabY + 8, 20, 18, p.timberDark, '#0D0A14');
  c.rect(gabX + 20, gabY + 10, 16, 14, p.winMid);
  c.rect(gabX + 22, gabY + 12, 5, 5, p.winGlow);
  c.rect(gabX + 29, gabY + 12, 5, 5, p.winGlow);

  // Puerta principal arqueada de roble con herrajes y escalinata de piedra
  const doorW = 38;
  const doorH = 46;
  const doorX = Math.floor(W / 2 - doorW / 2);
  const doorY = wallY + wallH - doorH;
  // Escalones de piedra
  c.outlinedRect(doorX - 8, wallY + wallH - 4, doorW + 16, 6, '#94A3B8', '#0D0A14');
  c.outlinedRect(doorX - 4, wallY + wallH - 8, doorW + 8, 5, '#CBD5E1', '#0D0A14');
  // Marco de piedra de la puerta
  c.outlinedRect(doorX - 4, doorY - 4, doorW + 8, doorH + 2, '#64748B', '#0D0A14');
  c.outlinedRect(doorX, doorY, doorW, doorH - 2, p.timberDark, '#0D0A14');
  c.ditherRect(doorX + 2, doorY + 2, 15, doorH - 6, p.timberMid, p.timberHi, 'vertical');
  c.ditherRect(doorX + 21, doorY + 2, 15, doorH - 6, p.timberMid, p.timberHi, 'vertical');
  // Herrajes de hierro y aldaba dorada
  c.rect(doorX + 2, doorY + 10, doorW - 4, 3, '#1E293B');
  c.rect(doorX + 2, doorY + 30, doorW - 4, 3, '#1E293B');
  c.outlinedRect(doorX + 24, doorY + 18, 6, 6, '#FDE047', '#0D0A14');

  // Ventanas laterales iluminadas con celosía y jardinera/alféizar
  const winPositions = [28, 156];
  for (const wx of winPositions) {
    const wy = wallY + 14;
    c.outlinedRect(wx - 2, wy - 2, 38, 30, p.timberDark, '#0D0A14');
    c.rect(wx + 1, wy + 1, 32, 24, p.winMid);
    // 4 paneles de cristal brillante
    c.rect(wx + 3, wy + 3, 12, 9, p.winGlow);
    c.rect(wx + 19, wy + 3, 12, 9, p.winGlow);
    c.rect(wx + 3, wy + 14, 12, 9, p.winGlow);
    c.rect(wx + 19, wy + 14, 12, 9, p.winGlow);
    // Reflejo blanco diagonal en el cristal
    c.rect(wx + 5, wy + 5, 3, 3, '#FFFFFF');
    c.rect(wx + 21, wy + 5, 3, 3, '#FFFFFF');
    // Alféizar de piedra tallada
    c.outlinedRect(wx - 4, wy + 26, 42, 6, '#64748B', '#0D0A14');
    c.rect(wx - 2, wy + 27, 38, 2, '#CBD5E1');
  }

  // Faroles de hierro forjado a ambos lados de la puerta
  for (const lx of [doorX - 14, doorX + doorW + 6]) {
    const ly = doorY + 10;
    c.ellipse(lx + 4, ly + 5, 11, 11, '#FACC1544');
    c.outlinedRect(lx, ly, 8, 11, '#FEF08A', '#0D0A14');
    c.rect(lx - 1, ly - 2, 10, 3, '#1E293B');
  }

  // Atrezzo exterior específico de cada edificio
  if (kind === 'taberna') {
    // Barriles de cerveza de roble a la izquierda y letrero con jarra dorada
    for (const bx of [22, 42]) {
      const by = wallY + wallH - 22;
      c.outlinedRect(bx, by, 18, 22, '#78350F', '#0D0A14');
      c.ditherRect(bx + 2, by + 2, 14, 18, '#92400E', '#B45309', 'vertical');
      c.rect(bx + 1, by + 5, 16, 2, '#334155');
      c.rect(bx + 1, by + 15, 16, 2, '#334155');
    }
    // Letrero colgante con jarra espumosa
    c.rect(4, wallY + 8, 16, 3, '#1E293B');
    c.outlinedRect(4, wallY + 11, 16, 18, '#5C3A21', '#0D0A14');
    c.outlinedRect(7, wallY + 15, 9, 10, '#FACC15', '#0D0A14');
    c.rect(7, wallY + 13, 9, 3, '#FFFFFF');
  } else if (kind === 'herreria') {
    // Horno de fundición exterior con carbón incandescente a la derecha y soporte de armas a la izquierda
    const fx = 154;
    const fy = wallY + wallH - 34;
    c.outlinedRect(fx, fy, 42, 34, '#334155', '#0D0A14');
    c.outlinedRect(fx + 6, fy + 10, 30, 20, '#7C2D12', '#0D0A14');
    c.rect(fx + 9, fy + 14, 24, 14, '#EA580C');
    c.rect(fx + 13, fy + 18, 16, 8, '#FEF08A');
    // Rack de espadas a la izquierda
    c.outlinedRect(24, wallY + wallH - 26, 30, 24, '#5C3A21', '#0D0A14');
    for (const sx of [29, 38, 47]) {
      c.rect(sx, wallY + wallH - 32, 3, 20, '#E2E8F0');
      c.rect(sx - 2, wallY + wallH - 26, 7, 2, '#D9A441');
    }
  } else if (kind === 'refugio') {
    // Estandartes reales azules y dorados de la Alianza a ambos lados de la puerta
    for (const sx of [68, 138]) {
      const sy = wallY + 12;
      c.outlinedRect(sx, sy, 14, 38, '#1E4E8C', '#0D0A14');
      c.rect(sx + 2, sy + 2, 10, 34, '#2563EB');
      c.rect(sx + 4, sy + 10, 6, 14, '#FDE047');
    }
  }

  return c;
}

/* =========================================================
   2. FUENTE MEDIEVAL ANIMADA EN 4 CUADROS (PNG + GIF)
   ========================================================= */
function drawAnimatedFountainSheet() {
  const FW = 96;
  const FH = 96;
  const c = new PixelCanvas(FW * 4, FH);

  for (let f = 0; f < 4; f++) {
    const ox = f * FW;
    const cx = ox + 48;
    const cy = 58;

    // Sombra en el suelo
    c.ellipse(cx, cy + 16, 40, 18, '#0D0A1477');

    // Brocal exterior de piedra tallada
    c.ellipse(cx, cy + 4, 38, 22, '#475569', '#0D0A14');
    c.ellipse(cx, cy + 2, 36, 20, '#94A3B8', '#1E293B');
    c.ellipse(cx, cy, 33, 18, '#CBD5E1');

    // Estanque de agua azul profunda con ondas concéntricas animadas según el cuadro f
    c.ellipse(cx, cy + 1, 29, 15, '#0369A1', '#0D0A14');
    c.ellipse(cx, cy, 26, 13, '#0284C7');
    c.ellipse(cx, cy - 1, 22, 11, '#38BDF8');

    // Ondas de agua expansivas por cuadro (0..3)
    const r1 = 8 + ((f * 5) % 18);
    const r2 = 8 + (((f + 2) * 5) % 18);
    for (let ang = 0; ang < 24; ang++) {
      const a = (ang / 24) * Math.PI * 2;
      c.pset(cx + Math.cos(a) * r1, cy + Math.sin(a) * (r1 * 0.5), '#BAE6FD');
      c.pset(cx + Math.cos(a) * r2, cy + Math.sin(a) * (r2 * 0.5), '#E0F2FE');
    }

    // Pedestal central de piedra de 3 niveles
    c.outlinedRect(cx - 10, cy - 14, 20, 18, '#64748B', '#0D0A14');
    c.ditherRect(cx - 8, cy - 12, 16, 14, '#64748B', '#94A3B8', 'vertical');
    // Plato intermedio
    c.ellipse(cx, cy - 16, 16, 7, '#94A3B8', '#0D0A14');
    c.ellipse(cx, cy - 17, 13, 5, '#38BDF8');
    // Columna superior
    c.outlinedRect(cx - 6, cy - 30, 12, 15, '#94A3B8', '#0D0A14');
    c.ellipse(cx, cy - 31, 9, 4, '#CBD5E1', '#0D0A14');

    // Chorros de agua animados en 4 fases reales
    const jetH = [10, 13, 11, 14][f];
    c.rect(cx - 3, cy - 31 - jetH, 6, jetH, '#BAE6FD');
    c.rect(cx - 1, cy - 31 - jetH - 2, 2, jetH + 2, '#FFFFFF');

    // Cascadas laterales cayendo del plato superior e intermedio con espuma animada
    const dropShift = f * 2;
    for (const side of [-13, -7, 6, 12]) {
      c.rect(cx + side, cy - 15, 2, 16, '#7DD3FC');
      c.pset(cx + side, cy - 14 + (dropShift % 12), '#FFFFFF');
      c.pset(cx + side, cy - 14 + ((dropShift + 6) % 12), '#E0F2FE');
      // Espuma al chocar con el agua
      c.rect(cx + side - 1, cy + (f % 2), 4, 2, '#FFFFFF');
    }
  }

  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   3. FOGATA DE CAMPAMENTO ANIMADA EN 4 CUADROS (PNG + GIF)
   ========================================================= */
function drawAnimatedCampfireSheet() {
  const FW = 64;
  const FH = 64;
  const c = new PixelCanvas(FW * 4, FH);

  const stoneCoords = [
    [-20, 4], [-15, 10], [-6, 13], [5, 13], [14, 10], [19, 4],
    [15, -3], [6, -6], [-6, -6], [-15, -3]
  ];

  // Formas distintas de las llamas en cada uno de los 4 cuadros
  const flameProfiles = [
    { hMain: 26, lean: -2, sparkOff: 0 },
    { hMain: 30, lean: 2, sparkOff: 5 },
    { hMain: 24, lean: 1, sparkOff: 10 },
    { hMain: 29, lean: -1, sparkOff: 15 }
  ];

  for (let f = 0; f < 4; f++) {
    const ox = f * FW;
    const cx = ox + 32;
    const cy = 44;
    const prof = flameProfiles[f];

    // Sombra y brasas bajo los troncos
    c.ellipse(cx, cy + 5, 24, 11, '#0D0A1488');
    c.ellipse(cx, cy + 2, 16, 7, '#991B1B');
    c.ellipse(cx, cy + 2, 11, 5, '#EA580C');

    // Troncos de leña cruzados
    c.outlinedRect(cx - 17, cy - 3, 34, 8, '#451A03', '#0D0A14');
    c.ditherRect(cx - 15, cy - 1, 30, 4, '#78350F', '#92400E', 'checker');
    c.outlinedRect(cx - 13, cy - 7, 26, 7, '#5C3A21', '#0D0A14');

    // Anillo de piedras de río sombreadas
    for (const [sx, sy] of stoneCoords) {
      c.outlinedRect(cx + sx - 4, cy + sy - 3, 8, 7, '#64748B', '#0D0A14');
      c.rect(cx + sx - 2, cy + sy - 2, 4, 2, '#CBD5E1');
    }

    // Llamas Pixel Art multicapa (Rojo carmesí -> Naranja vivo -> Amarillo oro -> Núcleo blanco)
    const h = prof.hMain;
    for (let ly = 0; ly < h; ly++) {
      const t = ly / h;
      const wave = Math.round(Math.sin(t * Math.PI * 2 + f * 1.5) * 2.5) + Math.round(prof.lean * t);
      const halfW = Math.max(1, Math.round((1 - t * 0.88) * 13));
      const py = cy - 2 - ly;
      c.rect(cx + wave - halfW - 1, py, halfW * 2 + 2, 1, '#0D0A14');
      c.rect(cx + wave - halfW, py, halfW * 2, 1, '#DC2626');
      if (halfW > 2) {
        c.rect(cx + wave - halfW + 2, py, (halfW - 2) * 2, 1, '#EA580C');
      }
      if (halfW > 4 && t < 0.78) {
        c.rect(cx + wave - halfW + 4, py, (halfW - 4) * 2, 1, '#FACC15');
      }
      if (halfW > 6 && t < 0.45) {
        c.rect(cx + wave - halfW + 6, py, (halfW - 6) * 2, 1, '#FEF9C3');
      }
    }

    // Chispas ascendentes distintas por cuadro
    const sparks = [
      [-8, -18], [7, -24], [-3, -31], [9, -15], [-10, -27]
    ];
    sparks.forEach(([sx, sy], idx) => {
      const py = cy + sy - ((prof.sparkOff + idx * 4) % 12);
      const px = cx + sx + ((f + idx) % 2 === 0 ? 2 : -2);
      c.outlinedRect(px, py, 3, 3, idx % 2 === 0 ? '#FEF08A' : '#FB923C', '#0D0A14');
    });
  }

  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   4. PORTAL RÚNICO ANIMADO EN 4 CUADROS (PNG + GIF)
   ========================================================= */
function drawAnimatedPortalSheet() {
  const FW = 96;
  const FH = 96;
  const c = new PixelCanvas(FW * 4, FH);

  for (let f = 0; f < 4; f++) {
    const ox = f * FW;
    const cx = ox + 48;
    const cy = 54;

    c.ellipse(cx, cy + 16, 40, 12, '#0D0A1488');

    // Vórtice elíptico de energía con rotación por cuadro
    c.ellipse(cx, cy, 30, 17, '#0284C7', '#0D0A14');
    c.ellipse(cx, cy, 24, 13, '#38BDF8');
    c.ellipse(cx, cy, 16, 9, '#7DD3FC');
    c.ellipse(cx, cy, 9, 5, '#E0F2FE');

    // Espiral de partículas arcanas en 4 posiciones
    for (let i = 0; i < 6; i++) {
      const ang = (f / 4) * Math.PI * 2 + (i * Math.PI) / 3;
      const px = cx + Math.cos(ang) * 21;
      const py = cy + Math.sin(ang) * 11;
      c.outlinedRect(px - 2, py - 2, 4, 4, '#FFFFFF', '#0284C7');
    }

    // 2 Obeliscos rúnicos de piedra tallada a izquierda y derecha
    for (const side of [-36, 24]) {
      const bx = cx + side;
      const by = cy - 26;
      c.outlinedRect(bx, by, 14, 38, '#475569', '#0D0A14');
      c.ditherRect(bx + 2, by + 2, 10, 34, '#475569', '#64748B', 'vertical');
      c.rect(bx + 2, by + 2, 3, 34, '#94A3B8');
      // Runa grabada pulsante
      const runeCol = f % 2 === 0 ? '#E0F2FE' : '#38BDF8';
      c.outlinedRect(bx + 4, by + 12, 6, 12, runeCol, '#0369A1');
    }
  }

  return { canvas: c, frameW: FW, frameH: FH, frameCount: 4 };
}

/* =========================================================
   5. COFRE DEL TESORO 2 CUADROS (CERRADO / ABIERTO)
   ========================================================= */
function drawChestSheet() {
  const FW = 64;
  const FH = 64;
  const c = new PixelCanvas(FW * 2, FH);

  for (let f = 0; f < 2; f++) {
    const ox = f * FW;
    const cx = ox + 32;
    const cy = 38;
    const opened = f === 1;

    c.ellipse(cx, cy + 12, 22, 8, '#0D0A1488');
    // Cuerpo de madera de roble y bandas de oro
    c.outlinedRect(cx - 18, cy - 12, 36, 24, opened ? '#451A03' : '#78350F', '#0D0A14');
    c.ditherRect(cx - 16, cy - 4, 32, 14, '#78350F', '#92400E', 'checker');
    if (opened) {
      // Interior lleno de monedas de oro y gemas brillantes
      c.rect(cx - 15, cy - 10, 30, 7, '#1C1917');
      c.ditherRect(cx - 13, cy - 8, 26, 5, '#FACC15', '#FEF08A', 'checker');
      c.rect(cx - 4, cy - 8, 4, 3, '#EF4444');
      c.rect(cx + 5, cy - 7, 3, 3, '#38BDF8');
    } else {
      // Tapa abombada cerrada
      c.outlinedRect(cx - 18, cy - 14, 36, 10, '#92400E', '#0D0A14');
      c.rect(cx - 16, cy - 12, 32, 3, '#B45309');
    }
    // Herrajes dorados laterales y cerradura central
    c.outlinedRect(cx - 14, cy - 13, 5, 24, '#D9A441', '#0D0A14');
    c.outlinedRect(cx + 9, cy - 13, 5, 24, '#D9A441', '#0D0A14');
    if (!opened) {
      c.outlinedRect(cx - 4, cy - 7, 8, 9, '#FDE047', '#0D0A14');
      c.rect(cx - 1, cy - 4, 2, 4, '#0D0A14');
    }
  }

  return { canvas: c, frameW: FW, frameH: FH, frameCount: 2 };
}

function savePngAndGif(baseName, sheetObj, makeGif = true) {
  const pngPath = path.join(ASSETS_DIR, `${baseName}.png`);
  const pngBuf = encodePNG(sheetObj.canvas.w, sheetObj.canvas.h, sheetObj.canvas.data);
  fs.writeFileSync(pngPath, pngBuf);
  console.log(`Saved PNG: ${pngPath} (${sheetObj.canvas.w}x${sheetObj.canvas.h}, ${(pngBuf.length / 1024).toFixed(1)} KB)`);

  if (makeGif && sheetObj.frameCount > 1) {
    const frames = [];
    for (let i = 0; i < sheetObj.frameCount; i++) {
      frames.push(sheetObj.canvas.extractFrame(i, sheetObj.frameW));
    }
    const gifBuf = encodeAnimatedGIF(sheetObj.frameW, sheetObj.frameH, frames, 14);
    const gifPath = path.join(ASSETS_DIR, `${baseName}.gif`);
    fs.writeFileSync(gifPath, gifBuf);
    console.log(`Saved Animated GIF: ${gifPath} (${sheetObj.frameCount} frames, ${(gifBuf.length / 1024).toFixed(1)} KB)`);
  }
}

function main() {
  // 1. Guardar las 3 ilustraciones PNG de edificios medievales
  for (const kind of ['taberna', 'herreria', 'refugio']) {
    const bCanvas = drawDetailedBuildingSprite(kind);
    const p = path.join(ASSETS_DIR, `edificio_${kind}.png`);
    const buf = encodePNG(bCanvas.w, bCanvas.h, bCanvas.data);
    fs.writeFileSync(p, buf);
    console.log(`Saved Building PNG: ${p} (${bCanvas.w}x${bCanvas.h}, ${(buf.length / 1024).toFixed(1)} KB)`);
  }

  // 2. Guardar hojas PNG de 4 cuadros + GIFs animados reales
  savePngAndGif('prop_fuente', drawAnimatedFountainSheet(), true);
  savePngAndGif('prop_fogata', drawAnimatedCampfireSheet(), true);
  savePngAndGif('prop_portal', drawAnimatedPortalSheet(), true);
  savePngAndGif('prop_cofre', drawChestSheet(), true);
}

main();
