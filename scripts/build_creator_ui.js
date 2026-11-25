/**
 * build_creator_ui.js
 * Genera las imágenes PNG de la pantalla de Creación de Personaje en public/assets/ui/:
 *  - Emblemas de bando (emblema_alba.png, emblema_hierro.png)
 *  - Retratos de sexo (sexo_m.png, sexo_f.png)
 *  - Retratos de raza por sexo (raza_<raza>_<m|f>.png) en medallón con fondo del bando
 *  - Figuras de clase por sexo y bando (clase_<clase>_<m|f>_<alba|hierro>.png)
 * Basado en los modelos Pixel Art originales del juego.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, 'raw_ui');
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'ui');
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ---------- PNG ---------- */
const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ CRC[(c ^ b[i]) & 0xff]; return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const tb = Buffer.from(t); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([tb, d]))); return Buffer.concat([l, tb, d, c]); };
function savePNG(name, img) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(img.w, 0); ih.writeUInt32BE(img.h, 4); ih[8] = 8; ih[9] = 6;
  const st = img.w * 4; const raw = Buffer.alloc((st + 1) * img.h);
  for (let y = 0; y < img.h; y++) { raw[y * (st + 1)] = 0; img.d.copy(raw, y * (st + 1) + 1, y * st, (y + 1) * st); }
  const buf = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), buf);
  console.log(`ui/${name}.png (${img.w}x${img.h}, ${(buf.length / 1024).toFixed(1)}KB)`);
}

/* ---------- Utilidades de imagen ---------- */
const newImg = (w, h) => ({ w, h, d: Buffer.alloc(w * h * 4, 0) });
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function pset(img, x, y, rgb, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const o = (y * img.w + x) * 4; const al = a / 255; const inv = 1 - al;
  img.d[o] = Math.round(rgb[0] * al + img.d[o] * inv);
  img.d[o + 1] = Math.round(rgb[1] * al + img.d[o + 1] * inv);
  img.d[o + 2] = Math.round(rgb[2] * al + img.d[o + 2] * inv);
  img.d[o + 3] = Math.min(255, Math.round(a + img.d[o + 3] * inv));
}
function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const o = (y * src.w + x) * 4; const a = src.d[o + 3];
    if (a > 10) pset(dst, ox + x, oy + y, [src.d[o], src.d[o + 1], src.d[o + 2]], a);
  }
}

function loadRaw(name, size) {
  const d = Buffer.from(fs.readFileSync(path.join(RAW_DIR, `${name}.rgba`)));
  const img = { w: size, h: size, d };
  // Flood-fill del fondo blanco desde los bordes
  const W = size, H = size, total = W * H; const vis = new Uint8Array(total); const q = new Int32Array(total); let hd = 0, tl = 0;
  // Detecta sólo el fondo blanco exterior casi puro (lum >= 245 y sat <= 10) para no borrar pelaje blanco sombreado
  const bg = (i) => { const o = i * 4; const r = d[o], g = d[o + 1], b = d[o + 2]; const sat = Math.max(r, g, b) - Math.min(r, g, b); return (r + g + b) / 3 >= 245 && sat <= 12; };
  const push = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (vis[i] || !bg(i)) return; vis[i] = 1; q[tl++] = i; };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (hd < tl) { const i = q[hd++]; d[i * 4 + 3] = 0; const x = i % W, y = (i - x) / W; push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1); }
  return img;
}

function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const dd = mx - mn; s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); if (mx === r) h = (g - b) / dd + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / dd + 2; else h = (r - g) / dd + 4; h /= 6; } return [h * 360, s, l]; }
function hslToRgb(h, s, l) { h = (((h % 360) + 360) % 360) / 360; if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; } const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q; return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => Math.round(v * 255)); }
function recolor(src, fn) {
  const out = { w: src.w, h: src.h, d: Buffer.from(src.d) };
  for (let i = 0; i < out.w * out.h; i++) {
    const o = i * 4; if (out.d[o + 3] < 10) continue;
    const [h, s, l] = rgbToHsl(out.d[o], out.d[o + 1], out.d[o + 2]);
    const res = fn(h, s, l, out.d[o], out.d[o + 1], out.d[o + 2]);
    if (res) { out.d[o] = res[0]; out.d[o + 1] = res[1]; out.d[o + 2] = res[2]; }
  }
  return out;
}
const isSkin = (h, s, l) => h >= 10 && h <= 38 && s >= 0.22 && l >= 0.4 && l <= 0.88;
const toHierro = (img) => recolor(img, (h, s, l) => (h >= 150 && h <= 300 && s > 0.22 ? hslToRgb(358, Math.min(0.85, s * 1.1), l * 0.92) : (h >= 90 && h < 150 && s > 0.22 ? hslToRgb(18, 0.62, l * 0.9) : null)));
const toOrc = (img) => recolor(toHierro(img), (h, s, l) => (isSkin(h, s, l) ? hslToRgb(102, 0.45, l * 0.86) : null));
const toNomad = (img) => recolor(img, (h, s, l) => {
  if (h >= 90 && h <= 165 && s > 0.2) return hslToRgb(28, 0.7, l * 0.95); // verde -> arena/ocre
  if (isSkin(h, s, l)) return hslToRgb(24, 0.5, l * 0.78); // piel curtida
  return null;
});
const toFrost = (img) => recolor(img, (h, s, l) => (l > 0.12 ? hslToRgb(205, 0.25, Math.min(0.95, 0.35 + l * 0.75)) : null));

// Contorno oscuro 1px alrededor del sprite para resaltarlo sobre el fondo
function outline(img, rgb = [10, 8, 16]) {
  const out = { w: img.w, h: img.h, d: Buffer.from(img.d) };
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.d[(y * img.w + x) * 4 + 3] > 10) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < img.w && ny < img.h && img.d[(ny * img.w + nx) * 4 + 3] > 10; });
    if (near) { const o = (y * img.w + x) * 4; out.d[o] = rgb[0]; out.d[o + 1] = rgb[1]; out.d[o + 2] = rgb[2]; out.d[o + 3] = 255; }
  }
  return out;
}

/* ---------- Fondos de medallón ---------- */
function medallion(size, theme) {
  const img = newImg(size, size);
  const pal = {
    alba: { a: '#2E6BB8', b: '#0E1B33', rim: '#D9A441' },
    hierro: { a: '#B3302C', b: '#2A0B0A', rim: '#C97A32' },
    neutral: { a: '#4B5A73', b: '#10141D', rim: '#F2B63D' }
  }[theme];
  const ca = hex(pal.a), cb = hex(pal.b);
  const c = size / 2, R = size / 2 - 1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c * 0.85; const dist = Math.hypot(dx, dy) / (R * 1.15);
    const t = Math.min(1, dist);
    // tramado de 2 tonos para estética 16-bit
    const dith = ((x + y) % 2 === 0 ? 0.04 : -0.04);
    const k = Math.max(0, Math.min(1, t + dith));
    pset(img, x, y, [0, 1, 2].map((i) => Math.round(ca[i] * (1 - k) + cb[i] * k)));
  }
  // Rayos de luz suaves
  for (let i = 0; i < 6; i++) {
    const ang = -Math.PI / 2 + (i - 2.5) * 0.32;
    for (let r = 6; r < size * 0.7; r++) pset(img, c + Math.cos(ang) * r, c * 0.9 + Math.sin(ang) * r, [255, 240, 190], 22);
  }
  return img;
}

/* ---------- Emblemas de bando dibujados a mano (pixel art 48x48 escalado x2) ---------- */
function upscale(img, k) {
  const out = newImg(img.w * k, img.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) {
    const so = (Math.floor(y / k) * img.w + Math.floor(x / k)) * 4; const o = (y * out.w + x) * 4;
    img.d.copy(out.d, o, so, so + 4);
  }
  return out;
}
function emblemAlba() {
  const S = 48; const img = newImg(S, S);
  const inShield = (x, y, m = 0) => { const cx = 24; if (y < 5 + m || y > 44 - m) return false; const half = y < 28 ? 17 - m : (17 - m) * Math.cos(((y - 28) / (16 - m)) * (Math.PI / 2)); return Math.abs(x + 0.5 - cx) <= half; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inShield(x, y)) continue;
    if (!inShield(x, y, 1)) pset(img, x, y, hex('#0D0A14'));
    else if (!inShield(x, y, 3)) pset(img, x, y, hex(y < 14 ? '#FDE68A' : '#D9A441'));
    else if (!inShield(x, y, 4)) pset(img, x, y, hex('#7C5A1C'));
    else {
      const base = y < 26 ? '#2E6BB8' : '#1E4E8C';
      pset(img, x, y, hex((x + y) % 2 === 0 && y > 30 ? '#183F73' : base));
    }
  }
  // Sol del amanecer (Alba) con rayos
  const sx = 24, sy = 27;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; for (let r = 8; r < (i % 2 ? 12 : 14); r++) pset(img, sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.9, hex('#FDE047')); }
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const d = Math.hypot(x, y); if (d <= 7) pset(img, sx + x, sy + y, hex(d > 5.8 ? '#B45309' : d < 3 ? '#FFFBEB' : '#FACC15')); }
  // Línea de horizonte y montañas plateadas
  for (let x = 10; x < 38; x++) { pset(img, x, 33, hex('#E2E8F0')); }
  for (let x = 12; x < 36; x++) { const hgt = Math.max(0, 5 - Math.abs(((x - 12) % 12) - 6)); for (let y = 0; y < hgt; y++) pset(img, x, 38 - y, hex(y === hgt - 1 ? '#F8FAFC' : '#94A3B8')); }
  // Brillo especular
  for (let y = 8; y < 20; y++) pset(img, 11, y, hex('#BFDBFE'), 160);
  return upscale(img, 2);
}
function emblemHierro() {
  const S = 48; const img = newImg(S, S); const c = 23.5;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - c, y - c);
    if (d > 21.5) continue;
    if (d > 20.5) pset(img, x, y, hex('#0D0A14'));
    else if (d > 18) pset(img, x, y, hex(y < 20 ? '#E5A15A' : '#9A5B24'));
    else if (d > 17) pset(img, x, y, hex('#4A2A10'));
    else pset(img, x, y, hex((x + y) % 2 === 0 && y > 26 ? '#6E1414' : y < 18 ? '#B3302C' : '#8F1D1D'));
  }
  // Remaches de hierro en el borde
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const rx = c + Math.cos(a) * 19.2, ry = c + Math.sin(a) * 19.2; pset(img, rx, ry, hex('#E2E8F0')); pset(img, rx + 1, ry + 1, hex('#475569')); }
  // Hachas cruzadas
  const axe = (dir) => {
    for (let t = -14; t <= 14; t++) { const x = c + t * 0.72 * dir, y = c + t * 0.72; pset(img, x, y, hex('#5C3A21')); pset(img, x + 1, y, hex('#3B2314')); }
    const hx = c - 10 * 0.72 * dir, hy = c - 10 * 0.72;
    for (let yy = -6; yy <= 6; yy++) for (let xx = 0; xx <= 6 - Math.abs(yy) * 0.5; xx++) {
      const px = hx - dir * (2 + xx), py = hy + yy - xx * 0.2;
      pset(img, px, py, hex(xx > 4 - Math.abs(yy) * 0.5 ? '#F8FAFC' : '#94A3B8'));
    }
  };
  axe(1); axe(-1);
  // Bocado de lobo central (umbo de bronce)
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.hypot(x, y); if (d <= 4) pset(img, c + x, c + y, hex(d > 3 ? '#4A2A10' : d < 1.5 ? '#FEF3C7' : '#E5A15A')); }
  for (let y = 7; y < 15; y++) pset(img, 10, y + 6, hex('#FCA5A5'), 140);
  return upscale(img, 2);
}

/* ---------- Composición ---------- */
function portrait(bust, theme) {
  const bg = medallion(96, theme);
  blit(bg, outline(bust), 0, 4);
  return bg;
}
function figure(fig) {
  const img = newImg(112, 112);
  // Sombra en el suelo
  for (let y = -5; y <= 5; y++) for (let x = -30; x <= 30; x++) if ((x * x) / 900 + (y * y) / 25 <= 1) pset(img, 56 + x, 104 + y, [0, 0, 0], 90);
  blit(img, outline(fig), 0, 0);
  return img;
}

const B = (n) => loadRaw(n, 96);
const F = (n) => loadRaw(n, 112);

const busts = {
  gm: B('bust_guerrero_m'), gf: B('bust_guerrera_f'), mm: B('bust_mago_m'), mf: B('bust_maga_f'),
  am: B('bust_arquero_m'), af: B('bust_arquera_f'), herrero: B('bust_herrero'),
  loboE: B('bust_lobo_enemigo'), loboM: B('bust_lobo_mascota')
};

// Emblemas de bando
savePNG('emblema_alba', emblemAlba());
savePNG('emblema_hierro', emblemHierro());

// Sexo
savePNG('sexo_m', portrait(busts.gm, 'neutral'));
savePNG('sexo_f', portrait(busts.gf, 'neutral'));

// Razas (Guardia del Alba)
savePNG('raza_humano_m', portrait(busts.gm, 'alba'));
savePNG('raza_humano_f', portrait(busts.gf, 'alba'));
savePNG('raza_elfo_m', portrait(busts.mm, 'alba'));
savePNG('raza_elfo_f', portrait(busts.mf, 'alba'));
savePNG('raza_enano_m', portrait(busts.herrero, 'alba'));
savePNG('raza_enano_f', portrait(busts.af, 'alba'));
// Razas (Clanes de Hierro)
savePNG('raza_orco_m', portrait(toOrc(busts.gm), 'hierro'));
savePNG('raza_orco_f', portrait(toOrc(busts.gf), 'hierro'));
savePNG('raza_lobo_m', portrait(busts.loboE, 'hierro'));
savePNG('raza_lobo_f', portrait(toFrost(busts.loboE), 'hierro'));
savePNG('raza_nomada_m', portrait(toNomad(busts.am), 'hierro'));
savePNG('raza_nomada_f', portrait(toNomad(busts.af), 'hierro'));

// Clases (figura completa por sexo y bando)
const figs = {
  guerrero_m: F('fig_guerrero_m'), guerrero_f: F('fig_guerrera_f'),
  mago_m: F('fig_mago_m'), mago_f: F('fig_maga_f'),
  arquero_m: F('fig_arquero_m'), arquero_f: F('fig_arquera_f')
};
for (const [k, img] of Object.entries(figs)) {
  savePNG(`clase_${k}_alba`, figure(img));
  savePNG(`clase_${k}_hierro`, figure(toHierro(img)));
}
