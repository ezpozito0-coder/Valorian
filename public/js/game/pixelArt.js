/**
 * Motor de Iconos y Matrices Pixel Art 16-bit reales — Crónicas de la Fractura
 * Reemplaza todos los emojis del sistema por arte pixelado 16x16 nítido (shape-rendering="crispEdges")
 * y dibuja retratos escénicos 16-bit para las 4 Mascotas y los 4 Jefes de Valoria.
 */

import { getEquipIconUrl, getBossAsset } from './assetLoader.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const PIXEL_ICON_DEFS = {
  // Clases y Combate
  guerrero: `
    <rect x="11" y="2" width="3" height="3" fill="#141018"/>
    <rect x="9" y="4" width="3" height="3" fill="#141018"/>
    <rect x="7" y="6" width="3" height="3" fill="#141018"/>
    <rect x="5" y="8" width="3" height="3" fill="#141018"/>
    <rect x="11" y="2" width="2" height="2" fill="#F8FAFC"/>
    <rect x="9" y="4" width="2" height="2" fill="#E2E8F0"/>
    <rect x="7" y="6" width="2" height="2" fill="#CBD5E1"/>
    <rect x="5" y="8" width="2" height="2" fill="#94A3B8"/>
    <rect x="3" y="9" width="5" height="2" fill="#F2B63D"/>
    <rect x="4" y="8" width="2" height="5" fill="#F2B63D"/>
    <rect x="2" y="12" width="2" height="2" fill="#78350F"/>
    <rect x="1" y="13" width="2" height="2" fill="#F2B63D"/>
  `,
  mago: `
    <rect x="7" y="4" width="2" height="11" fill="#141018"/>
    <rect x="7" y="5" width="1" height="9" fill="#92400E"/>
    <rect x="5" y="1" width="6" height="5" fill="#141018"/>
    <rect x="6" y="2" width="4" height="3" fill="#38BDF8"/>
    <rect x="7" y="2" width="2" height="2" fill="#E0F2FE"/>
    <rect x="4" y="3" width="1" height="2" fill="#F2B63D"/>
    <rect x="11" y="3" width="1" height="2" fill="#F2B63D"/>
  `,
  arquero: `
    <rect x="4" y="2" width="3" height="1" fill="#92400E"/>
    <rect x="6" y="3" width="2" height="2" fill="#B45309"/>
    <rect x="7" y="5" width="2" height="6" fill="#D97706"/>
    <rect x="6" y="11" width="2" height="2" fill="#B45309"/>
    <rect x="4" y="13" width="3" height="1" fill="#92400E"/>
    <rect x="4" y="3" width="1" height="10" fill="#E2E8F0"/>
    <rect x="3" y="7" width="10" height="2" fill="#F2B63D"/>
    <rect x="12" y="6" width="2" height="4" fill="#F8FAFC"/>
  `,

  // 12 Ranuras de Equipo
  casco: `
    <rect x="3" y="3" width="10" height="10" fill="#141018"/>
    <rect x="4" y="4" width="8" height="4" fill="#CBD5E1"/>
    <rect x="5" y="3" width="6" height="2" fill="#F8FAFC"/>
    <rect x="4" y="8" width="3" height="4" fill="#94A3B8"/>
    <rect x="9" y="8" width="3" height="4" fill="#94A3B8"/>
    <rect x="7" y="6" width="2" height="5" fill="#F2B63D"/>
  `,
  pechera: `
    <rect x="2" y="3" width="12" height="11" fill="#141018"/>
    <rect x="3" y="4" width="10" height="3" fill="#CBD5E1"/>
    <rect x="4" y="7" width="8" height="6" fill="#94A3B8"/>
    <rect x="5" y="5" width="6" height="2" fill="#F8FAFC"/>
    <rect x="6" y="7" width="4" height="4" fill="#1E4E8C"/>
    <rect x="7" y="8" width="2" height="3" fill="#F2B63D"/>
  `,
  guanteletes: `
    <rect x="3" y="4" width="10" height="8" fill="#141018"/>
    <rect x="4" y="5" width="8" height="6" fill="#94A3B8"/>
    <rect x="4" y="5" width="8" height="2" fill="#E2E8F0"/>
    <rect x="5" y="7" width="6" height="2" fill="#F2B63D"/>
  `,
  guantes: `
    <rect x="4" y="3" width="8" height="10" fill="#141018"/>
    <rect x="5" y="4" width="6" height="5" fill="#92400E"/>
    <rect x="5" y="9" width="6" height="3" fill="#78350F"/>
    <rect x="5" y="8" width="6" height="1" fill="#F2B63D"/>
  `,
  pierneras: `
    <rect x="4" y="2" width="8" height="12" fill="#141018"/>
    <rect x="5" y="3" width="6" height="3" fill="#1E4E8C"/>
    <rect x="5" y="6" width="2" height="7" fill="#94A3B8"/>
    <rect x="9" y="6" width="2" height="7" fill="#94A3B8"/>
    <rect x="5" y="5" width="6" height="1" fill="#F2B63D"/>
  `,
  botas: `
    <rect x="3" y="3" width="4" height="10" fill="#141018"/>
    <rect x="2" y="10" width="6" height="3" fill="#141018"/>
    <rect x="4" y="4" width="2" height="7" fill="#94A3B8"/>
    <rect x="3" y="10" width="4" height="2" fill="#CBD5E1"/>
    <rect x="9" y="3" width="4" height="10" fill="#141018"/>
    <rect x="9" y="10" width="6" height="3" fill="#141018"/>
    <rect x="10" y="4" width="2" height="7" fill="#94A3B8"/>
    <rect x="10" y="10" width="4" height="2" fill="#CBD5E1"/>
  `,
  arma: `
    <rect x="10" y="2" width="4" height="4" fill="#141018"/>
    <rect x="7" y="5" width="4" height="4" fill="#141018"/>
    <rect x="11" y="2" width="2" height="2" fill="#E0F2FE"/>
    <rect x="9" y="4" width="2" height="2" fill="#7DD3FC"/>
    <rect x="7" y="6" width="2" height="2" fill="#38BDF8"/>
    <rect x="5" y="8" width="2" height="2" fill="#0284C7"/>
    <rect x="3" y="9" width="5" height="2" fill="#F2B63D"/>
    <rect x="2" y="12" width="2" height="2" fill="#78350F"/>
  `,
  alas: `
    <rect x="1" y="3" width="6" height="10" fill="#141018"/>
    <rect x="9" y="3" width="6" height="10" fill="#141018"/>
    <rect x="2" y="4" width="4" height="7" fill="#F8FAFC"/>
    <rect x="3" y="5" width="3" height="5" fill="#BAE6FD"/>
    <rect x="10" y="4" width="4" height="7" fill="#F8FAFC"/>
    <rect x="10" y="5" width="3" height="5" fill="#BAE6FD"/>
  `,
  alas_vacio: `
    <rect x="1" y="2" width="6" height="11" fill="#141018"/>
    <rect x="9" y="2" width="6" height="11" fill="#141018"/>
    <rect x="2" y="3" width="4" height="8" fill="#A855F7"/>
    <rect x="3" y="4" width="3" height="6" fill="#F0ABFC"/>
    <rect x="10" y="3" width="4" height="8" fill="#A855F7"/>
    <rect x="10" y="4" width="3" height="6" fill="#F0ABFC"/>
  `,
  collar: `
    <rect x="4" y="3" width="8" height="7" fill="#141018"/>
    <rect x="5" y="4" width="6" height="5" fill="#F2B63D"/>
    <rect x="6" y="4" width="4" height="3" fill="#181D27"/>
    <rect x="6" y="9" width="4" height="5" fill="#141018"/>
    <rect x="7" y="10" width="2" height="3" fill="#3B82F6"/>
  `,
  anillo: `
    <rect x="4" y="4" width="8" height="9" fill="#141018"/>
    <rect x="5" y="6" width="6" height="6" fill="#CBD5E1"/>
    <rect x="6" y="7" width="4" height="4" fill="#181D27"/>
    <rect x="6" y="3" width="4" height="3" fill="#38BDF8"/>
    <rect x="7" y="3" width="2" height="2" fill="#E0F2FE"/>
  `,
  anillo_lava: `
    <rect x="4" y="4" width="8" height="9" fill="#141018"/>
    <rect x="5" y="6" width="6" height="6" fill="#F2B63D"/>
    <rect x="6" y="7" width="4" height="4" fill="#181D27"/>
    <rect x="6" y="3" width="4" height="3" fill="#EA580C"/>
    <rect x="7" y="3" width="2" height="2" fill="#FEF08A"/>
  `,
  mascota: `
    <rect x="3" y="3" width="10" height="10" fill="#141018"/>
    <rect x="4" y="2" width="2" height="3" fill="#E2E8F0"/>
    <rect x="10" y="2" width="2" height="3" fill="#E2E8F0"/>
    <rect x="4" y="5" width="8" height="7" fill="#F8FAFC"/>
    <rect x="5" y="7" width="2" height="2" fill="#0284C7"/>
    <rect x="9" y="7" width="2" height="2" fill="#0284C7"/>
    <rect x="7" y="9" width="2" height="2" fill="#141018"/>
  `,

  // 4 Mascotas
  lobo_blanco: `
    <rect x="3" y="2" width="10" height="12" fill="#141018"/>
    <rect x="4" y="2" width="2" height="3" fill="#CBD5E1"/>
    <rect x="10" y="2" width="2" height="3" fill="#CBD5E1"/>
    <rect x="4" y="5" width="8" height="7" fill="#F8FAFC"/>
    <rect x="5" y="7" width="2" height="2" fill="#0284C7"/>
    <rect x="9" y="7" width="2" height="2" fill="#0284C7"/>
    <rect x="7" y="9" width="2" height="2" fill="#0F172A"/>
  `,
  fantasma_hoz: `
    <rect x="3" y="3" width="9" height="11" fill="#141018"/>
    <rect x="4" y="4" width="7" height="9" fill="#4C1D95"/>
    <rect x="5" y="5" width="5" height="5" fill="#090612"/>
    <rect x="6" y="7" width="1" height="1" fill="#F0ABFC"/>
    <rect x="8" y="7" width="1" height="1" fill="#F0ABFC"/>
    <rect x="11" y="2" width="2" height="12" fill="#78350F"/>
    <rect x="7" y="2" width="6" height="2" fill="#E2E8F0"/>
  `,
  gato_volador: `
    <rect x="1" y="5" width="4" height="5" fill="#F8FAFC"/>
    <rect x="11" y="5" width="4" height="5" fill="#F8FAFC"/>
    <rect x="4" y="3" width="8" height="10" fill="#141018"/>
    <rect x="5" y="3" width="2" height="2" fill="#A68362"/>
    <rect x="9" y="3" width="2" height="2" fill="#A68362"/>
    <rect x="5" y="5" width="6" height="7" fill="#D6B898"/>
    <rect x="6" y="7" width="1" height="2" fill="#16A34A"/>
    <rect x="9" y="7" width="1" height="2" fill="#16A34A"/>
    <rect x="7" y="9" width="2" height="1" fill="#F472B6"/>
  `,
  dragon_negro: `
    <rect x="1" y="4" width="4" height="7" fill="#1C1917"/>
    <rect x="11" y="4" width="4" height="7" fill="#1C1917"/>
    <rect x="4" y="2" width="8" height="11" fill="#141018"/>
    <rect x="4" y="2" width="2" height="3" fill="#64748B"/>
    <rect x="10" y="2" width="2" height="3" fill="#64748B"/>
    <rect x="5" y="5" width="6" height="7" fill="#DC2626"/>
    <rect x="6" y="7" width="1" height="2" fill="#FACC15"/>
    <rect x="9" y="7" width="1" height="2" fill="#FACC15"/>
  `,

  // Consumibles, Gemas y Objetos de Mochila
  pocion_vida: `
    <rect x="6" y="2" width="4" height="3" fill="#92400E"/>
    <rect x="5" y="4" width="6" height="2" fill="#CBD5E1"/>
    <rect x="3" y="6" width="10" height="8" fill="#141018"/>
    <rect x="4" y="7" width="8" height="6" fill="#DC2626"/>
    <rect x="5" y="8" width="2" height="3" fill="#FCA5A5"/>
  `,
  pocion_grande: `
    <rect x="5" y="1" width="6" height="3" fill="#F2B63D"/>
    <rect x="3" y="4" width="10" height="10" fill="#141018"/>
    <rect x="4" y="5" width="8" height="8" fill="#B91C1C"/>
    <rect x="5" y="6" width="6" height="6" fill="#EF4444"/>
    <rect x="5" y="6" width="2" height="3" fill="#FECACA"/>
  `,
  pocion_mana: `
    <rect x="6" y="2" width="4" height="3" fill="#92400E"/>
    <rect x="5" y="4" width="6" height="2" fill="#CBD5E1"/>
    <rect x="3" y="6" width="10" height="8" fill="#141018"/>
    <rect x="4" y="7" width="8" height="6" fill="#2563EB"/>
    <rect x="5" y="8" width="2" height="3" fill="#93C5FD"/>
  `,
  pocion_velocidad: `
    <rect x="6" y="2" width="4" height="3" fill="#92400E"/>
    <rect x="3" y="5" width="10" height="9" fill="#141018"/>
    <rect x="4" y="6" width="8" height="7" fill="#EAB308"/>
    <rect x="5" y="7" width="3" height="3" fill="#FEF9C3"/>
  `,
  pergamino_aldea: `
    <rect x="3" y="2" width="10" height="12" fill="#141018"/>
    <rect x="4" y="3" width="8" height="10" fill="#E5C27A"/>
    <rect x="3" y="3" width="10" height="2" fill="#B45309"/>
    <rect x="3" y="11" width="10" height="2" fill="#B45309"/>
    <rect x="6" y="6" width="4" height="3" fill="#DC2626"/>
  `,
  gema_rubi: `
    <rect x="3" y="3" width="10" height="10" fill="#141018"/>
    <rect x="4" y="4" width="8" height="8" fill="#991B1B"/>
    <rect x="5" y="5" width="6" height="6" fill="#EF4444"/>
    <rect x="5" y="5" width="3" height="3" fill="#FCA5A5"/>
  `,
  gema_esmeralda: `
    <rect x="4" y="2" width="8" height="12" fill="#141018"/>
    <rect x="5" y="3" width="6" height="10" fill="#15803D"/>
    <rect x="6" y="4" width="4" height="8" fill="#22C55E"/>
    <rect x="6" y="4" width="2" height="3" fill="#BBF7D0"/>
  `,
  gema_zafiro: `
    <rect x="3" y="3" width="10" height="10" fill="#141018"/>
    <rect x="4" y="4" width="8" height="8" fill="#1D4ED8"/>
    <rect x="5" y="5" width="6" height="6" fill="#38BDF8"/>
    <rect x="5" y="5" width="3" height="3" fill="#E0F2FE"/>
  `,
  esencia_hierro: `
    <rect x="3" y="4" width="10" height="8" fill="#141018"/>
    <rect x="4" y="5" width="8" height="6" fill="#64748B"/>
    <rect x="5" y="6" width="6" height="3" fill="#CBD5E1"/>
  `,
  cristal_morado: `
    <rect x="4" y="2" width="8" height="12" fill="#141018"/>
    <rect x="5" y="3" width="6" height="10" fill="#6B21A8"/>
    <rect x="6" y="4" width="4" height="8" fill="#A855F7"/>
    <rect x="6" y="4" width="2" height="3" fill="#F3E8FF"/>
  `,

  // Iconos de Sistema HUD (Calavera, Corona, Candado, Yunque, Moneda, Mochila, Corazón, Escudo, Fuego, Bota)
  skull: `
    <rect x="3" y="2" width="10" height="12" fill="#141018"/>
    <rect x="4" y="3" width="8" height="7" fill="#E2E8F0"/>
    <rect x="5" y="10" width="6" height="3" fill="#CBD5E1"/>
    <rect x="5" y="5" width="2" height="2" fill="#141018"/>
    <rect x="9" y="5" width="2" height="2" fill="#141018"/>
    <rect x="7" y="8" width="2" height="1" fill="#141018"/>
    <rect x="6" y="11" width="1" height="2" fill="#141018"/>
    <rect x="9" y="11" width="1" height="2" fill="#141018"/>
  `,
  skull_red: `
    <rect x="2" y="2" width="12" height="12" fill="#141018"/>
    <rect x="3" y="3" width="10" height="10" fill="#7F1D1D"/>
    <rect x="4" y="4" width="8" height="6" fill="#FCA5A5"/>
    <rect x="5" y="10" width="6" height="2" fill="#F87171"/>
    <rect x="5" y="6" width="2" height="2" fill="#141018"/>
    <rect x="9" y="6" width="2" height="2" fill="#141018"/>
  `,
  crown: `
    <rect x="2" y="4" width="12" height="9" fill="#141018"/>
    <rect x="3" y="5" width="2" height="6" fill="#F2B63D"/>
    <rect x="7" y="4" width="2" height="7" fill="#FDE047"/>
    <rect x="11" y="5" width="2" height="6" fill="#F2B63D"/>
    <rect x="3" y="8" width="10" height="4" fill="#F2B63D"/>
    <rect x="7" y="9" width="2" height="2" fill="#EF4444"/>
  `,
  lock: `
    <rect x="5" y="2" width="6" height="5" fill="#141018"/>
    <rect x="6" y="3" width="4" height="4" fill="#94A3B8"/>
    <rect x="7" y="4" width="2" height="3" fill="#181D27"/>
    <rect x="3" y="7" width="10" height="7" fill="#141018"/>
    <rect x="4" y="8" width="8" height="5" fill="#F2B63D"/>
    <rect x="7" y="9" width="2" height="3" fill="#141018"/>
  `,
  anvil: `
    <rect x="2" y="5" width="12" height="4" fill="#141018"/>
    <rect x="3" y="6" width="10" height="2" fill="#94A3B8"/>
    <rect x="5" y="9" width="6" height="4" fill="#475569"/>
    <rect x="3" y="12" width="10" height="2" fill="#1E293B"/>
    <rect x="9" y="2" width="3" height="3" fill="#F2B63D"/>
  `,
  coin: `
    <rect x="3" y="3" width="10" height="10" fill="#141018"/>
    <rect x="4" y="4" width="8" height="8" fill="#D97706"/>
    <rect x="5" y="5" width="6" height="6" fill="#F2B63D"/>
    <rect x="7" y="6" width="2" height="4" fill="#FEF08A"/>
  `,
  backpack: `
    <rect x="3" y="3" width="10" height="11" fill="#141018"/>
    <rect x="4" y="4" width="8" height="9" fill="#92400E"/>
    <rect x="4" y="5" width="8" height="3" fill="#B45309"/>
    <rect x="7" y="7" width="2" height="3" fill="#F2B63D"/>
  `,
  heart: `
    <rect x="2" y="3" width="5" height="5" fill="#141018"/>
    <rect x="9" y="3" width="5" height="5" fill="#141018"/>
    <rect x="3" y="7" width="10" height="4" fill="#141018"/>
    <rect x="5" y="11" width="6" height="2" fill="#141018"/>
    <rect x="3" y="4" width="3" height="3" fill="#EF4444"/>
    <rect x="10" y="4" width="3" height="3" fill="#EF4444"/>
    <rect x="4" y="6" width="8" height="4" fill="#DC2626"/>
    <rect x="6" y="10" width="4" height="2" fill="#B91C1C"/>
    <rect x="4" y="4" width="2" height="2" fill="#FCA5A5"/>
  `,
  heart_empty: `
    <rect x="2" y="3" width="5" height="5" fill="#141018"/>
    <rect x="9" y="3" width="5" height="5" fill="#141018"/>
    <rect x="3" y="7" width="10" height="4" fill="#141018"/>
    <rect x="5" y="11" width="6" height="2" fill="#141018"/>
    <rect x="3" y="4" width="3" height="3" fill="#334155"/>
    <rect x="10" y="4" width="3" height="3" fill="#334155"/>
    <rect x="4" y="6" width="8" height="4" fill="#1E293B"/>
    <rect x="6" y="10" width="4" height="2" fill="#1E293B"/>
  `,
  shield: `
    <rect x="3" y="2" width="10" height="12" fill="#141018"/>
    <rect x="4" y="3" width="8" height="9" fill="#94A3B8"/>
    <rect x="5" y="4" width="6" height="7" fill="#1E4E8C"/>
    <rect x="7" y="4" width="2" height="7" fill="#F2B63D"/>
  `,
  flame: `
    <rect x="5" y="2" width="6" height="12" fill="#141018"/>
    <rect x="4" y="5" width="8" height="8" fill="#EA580C"/>
    <rect x="5" y="6" width="6" height="6" fill="#F97316"/>
    <rect x="6" y="8" width="4" height="4" fill="#FEF08A"/>
  `,
  speed: `
    <rect x="5" y="3" width="8" height="10" fill="#141018"/>
    <rect x="6" y="4" width="6" height="8" fill="#F2B63D"/>
    <rect x="2" y="6" width="4" height="2" fill="#38BDF8"/>
    <rect x="1" y="9" width="5" height="2" fill="#BAE6FD"/>
  `,
  pause: `
    <rect x="4" y="3" width="3" height="10" fill="#E2E8F0"/>
    <rect x="9" y="3" width="3" height="10" fill="#E2E8F0"/>
  `
};

const EMOJI_TO_KEY = {
  '⚔️': 'guerrero',
  '🪄': 'mago',
  '🏹': 'arquero',
  '🪖': 'casco',
  '🛡️': 'pechera',
  '🦾': 'guanteletes',
  '🧤': 'guantes',
  '👖': 'pierneras',
  '🥾': 'botas',
  '🪽': 'alas',
  '📿': 'collar',
  '💍': 'anillo',
  '🐾': 'mascota',
  '🐺': 'lobo_blanco',
  '👻': 'fantasma_hoz',
  '🐱': 'gato_volador',
  '🐉': 'dragon_negro',
  '🧪': 'pocion_vida',
  '🍷': 'pocion_grande',
  '💧': 'pocion_mana',
  '⚡': 'pocion_velocidad',
  '📜': 'pergamino_aldea',
  '♦️': 'gema_rubi',
  '💚': 'gema_esmeralda',
  '💎': 'gema_zafiro',
  '⚒️': 'anvil',
  '🔮': 'cristal_morado',
  '✨': 'gema_zafiro',
  '💀': 'skull',
  '👑': 'crown',
  '🔒': 'lock',
  '🪙': 'coin',
  '🎒': 'backpack',
  '❤️': 'heart',
  '🔥': 'flame',
  '🏃': 'speed',
  '🧰': 'backpack',
  '🌟': 'crown',
  '🏆': 'crown'
};

export function pixelIcon(keyOrEmoji, size = 18) {
  const key = PIXEL_ICON_DEFS[keyOrEmoji] ? keyOrEmoji : (EMOJI_TO_KEY[keyOrEmoji] || keyOrEmoji || 'coin');
  const croppedUrl = getEquipIconUrl(key);
  if (croppedUrl) {
    return `<img src="${croppedUrl}" width="${size}" height="${size}" class="pixel-icon-svg" style="image-rendering:pixelated;object-fit:contain" alt="" aria-hidden="true" />`;
  }
  const inner = PIXEL_ICON_DEFS[key] || PIXEL_ICON_DEFS.coin;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" class="pixel-icon-svg" aria-hidden="true">${inner}</svg>`;
}

export function drawCanvasPixelBadge(ctx, kind, cx, cy, scale = 1) {
  const s = scale;
  const p = (ox, oy, ow, oh, col) => px(ctx, cx + ox * s, cy + oy * s, ow * s, oh * s, col);
  if (kind === 'crown') {
    p(-6, -4, 12, 9, '#141018');
    p(-5, -3, 2, 6, '#F2B63D');
    p(-1, -4, 2, 7, '#FDE047');
    p(3, -3, 2, 6, '#F2B63D');
    p(-5, 0, 10, 4, '#F2B63D');
    p(-1, 1, 2, 2, '#EF4444');
  } else if (kind === 'lock') {
    p(-3, -6, 6, 5, '#141018');
    p(-2, -5, 4, 4, '#94A3B8');
    p(-5, -1, 10, 7, '#141018');
    p(-4, 0, 8, 5, '#F2B63D');
    p(-1, 1, 2, 3, '#141018');
  } else {
    // Skull
    p(-5, -6, 10, 11, '#141018');
    p(-4, -5, 8, 6, '#F8FAFC');
    p(-3, 1, 6, 3, '#CBD5E1');
    p(-3, -3, 2, 2, '#141018');
    p(1, -3, 2, 2, '#141018');
  }
}

/* =========================================================
   ESCENARIOS Y RETRATOS PIXEL ART 16-BIT DE LOS 4 JEFES DE VALORIA
   (Estilo idéntico a la imagen de referencia de Jefes de Valoria)
   ========================================================= */
export function drawBossPortraitCard(canvas, bossId, time = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  const p = (x, y, pw, ph, col) => px(ctx, x, y, pw, ph, col);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h * 0.56);

  const bossImg = getBossAsset(bossId);
  if (bossImg) {
    // Pintar escenario temático detrás del sprite transparente del jefe (Flood-Fill)
    if (bossId === 'malakor') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#121E18');
      g.addColorStop(0.65, '#1F3327');
      g.addColorStop(1, '#0F1A14');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      p(10, 0, 16, h, '#0B130E');
      p(w - 24, 0, 16, h, '#0B130E');
      p(cx - 42, h - 18, 84, 10, '#080D0A');
    } else if (bossId === 'ignis') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1C0D0A');
      g.addColorStop(0.6, '#45140B');
      g.addColorStop(1, '#7C2D12');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      p(0, h - 34, w, 34, '#291512');
      p(12, h - 24, w - 24, 8, '#EA580C');
      p(24, h - 22, w - 48, 4, '#FEF08A');
    } else if (bossId === 'boreas') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#7DD3FC');
      g.addColorStop(0.55, '#BAE6FD');
      g.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      [14, 34, 118, 138].forEach((ix, i) => {
        p(ix, 0, 10, 22 + (i % 2) * 10, '#38BDF8');
        p(ix + 2, 0, 5, 18 + (i % 2) * 8, '#E0F2FE');
      });
      p(10, h - 85, 55, 55, '#94A3B8');
      p(22, h - 95, 32, 20, '#F8FAFC');
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#130722');
      g.addColorStop(0.6, '#260E45');
      g.addColorStop(1, '#120824');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      p(16, 12, 18, h - 24, '#1B0C33');
      p(w - 34, 12, 18, h - 24, '#1B0C33');
    }

    const pad = 12;
    const maxW = w - pad * 2;
    const maxH = h - pad * 2;
    const iw = bossImg.width || 128;
    const ih = bossImg.height || 128;
    const ratio = Math.min(maxW / iw, maxH / ih);
    const dw = Math.round(iw * ratio);
    const dh = Math.round(ih * ratio);
    const breathY = Math.sin(time * 4) * 2;
    ctx.drawImage(bossImg, Math.round((w - dw) / 2), Math.round(h - dh - 8 + breathY), dw, dh);
    return;
  }

  if (bossId === 'malakor') {
    // Fondo: Bosque/Cueva sombría con raíces y niebla verde-oscura
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#121E18');
    g.addColorStop(0.65, '#1F3327');
    g.addColorStop(1, '#0F1A14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Árboles retorcidos al fondo
    p(10, 0, 16, h, '#0B130E');
    p(w - 24, 0, 16, h, '#0B130E');
    p(0, 0, w, 18, '#09100C');

    // Sombra
    p(cx - 38, h - 22, 76, 10, '#080D0A');

    // Alas demoníacas oscuras
    p(cx - 56, cy - 58, 28, 56, '#141018');
    p(cx - 52, cy - 54, 22, 48, '#2E1F47');
    p(cx + 28, cy - 58, 28, 56, '#141018');
    p(cx + 30, cy - 54, 22, 48, '#2E1F47');

    // Cuerpo acorazado con cristales morados (Malakor)
    p(cx - 28, cy - 32, 56, 48, '#141018');
    p(cx - 24, cy - 28, 48, 40, '#3B2854');
    p(cx - 16, cy - 22, 32, 28, '#4C356B');

    // Piernas y garras
    p(cx - 26, cy + 14, 18, 28, '#2A1C3D');
    p(cx + 8, cy + 14, 18, 28, '#2A1C3D');
    p(cx - 28, cy + 38, 20, 6, '#A855F7');
    p(cx + 8, cy + 38, 20, 6, '#A855F7');

    // Cristales del Vacío en hombros y pecho
    p(cx - 38, cy - 38, 14, 18, '#C084FC');
    p(cx - 34, cy - 44, 8, 12, '#F0ABFC');
    p(cx + 24, cy - 38, 14, 18, '#C084FC');
    p(cx + 26, cy - 44, 8, 12, '#F0ABFC');
    p(cx - 6, cy - 14, 12, 14, '#E879F9');

    // Cabeza con cuernos curvos
    p(cx - 16, cy - 54, 32, 24, '#141018');
    p(cx - 13, cy - 50, 26, 18, '#3B2854');
    p(cx - 24, cy - 66, 8, 18, '#1E142D');
    p(cx + 16, cy - 66, 8, 18, '#1E142D');
    p(cx - 8, cy - 43, 5, 3, '#F0ABFC');
    p(cx + 3, cy - 43, 5, 3, '#F0ABFC');
  } else if (bossId === 'ignis') {
    // Fondo: Cráter volcánico con ríos de lava brillante
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1C0D0A');
    g.addColorStop(0.6, '#45140B');
    g.addColorStop(1, '#7C2D12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Ríos de lava en el suelo
    p(0, h - 38, w, 38, '#291512');
    p(12, h - 28, w - 24, 8, '#EA580C');
    p(24, h - 26, w - 48, 4, '#FEF08A');

    // Llamas en los hombros y espalda
    p(cx - 42, cy - 56, 84, 36, '#EA580C');
    p(cx - 34, cy - 62, 68, 28, '#FACC15');

    // Cuerpo de roca volcánica agrietada con magma interno
    p(cx - 30, cy - 34, 60, 50, '#141018');
    p(cx - 26, cy - 30, 52, 42, '#292524');
    p(cx - 16, cy - 22, 32, 8, '#EA580C');
    p(cx - 4, cy - 26, 8, 32, '#F97316');
    p(cx - 2, cy - 20, 4, 22, '#FEF08A');

    // Piernas de basalto
    p(cx - 26, cy + 14, 18, 28, '#1C1917');
    p(cx + 8, cy + 14, 18, 28, '#1C1917');

    // Cabeza de obsidiana ardiente
    p(cx - 14, cy - 54, 28, 22, '#141018');
    p(cx - 11, cy - 51, 22, 17, '#292524');
    p(cx - 7, cy - 45, 5, 3, '#FEF08A');
    p(cx + 2, cy - 45, 5, 3, '#FEF08A');
    p(cx - 6, cy - 39, 12, 3, '#F97316');

    // Martillo de magma incandescente
    p(cx - 46, cy - 6, 56, 6, '#78350F');
    p(cx - 32, cy + 6, 26, 22, '#141018');
    p(cx - 29, cy + 9, 20, 16, '#EA580C');
    p(cx - 25, cy + 12, 12, 10, '#FEF08A');
  } else if (bossId === 'boreas') {
    // Fondo: Picos nevados y estalactitas de hielo
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#7DD3FC');
    g.addColorStop(0.55, '#BAE6FD');
    g.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Estalactitas superiores
    [14, 34, 118, 138].forEach((ix, i) => {
      p(ix, 0, 10, 24 + (i % 2) * 12, '#38BDF8');
      p(ix + 2, 0, 5, 20 + (i % 2) * 10, '#E0F2FE');
    });

    // Montaña nevada detrás
    p(10, h - 85, 55, 55, '#94A3B8');
    p(22, h - 95, 32, 20, '#F8FAFC');

    // Cuerpo de Titán con armadura de escarcha plateada
    p(cx - 32, cy - 34, 64, 50, '#141018');
    p(cx - 28, cy - 30, 56, 42, '#64748B');
    p(cx - 22, cy - 26, 44, 32, '#94A3B8');
    p(cx - 38, cy - 36, 18, 18, '#BAE6FD');
    p(cx + 20, cy - 36, 18, 18, '#BAE6FD');

    // Botas de piel helada
    p(cx - 24, cy + 14, 18, 28, '#475569');
    p(cx + 6, cy + 14, 18, 28, '#475569');
    p(cx - 26, cy + 14, 20, 6, '#F8FAFC');
    p(cx + 6, cy + 14, 20, 6, '#F8FAFC');

    // Cabeza y gran barba escarchada
    p(cx - 14, cy - 56, 28, 24, '#141018');
    p(cx - 11, cy - 53, 22, 18, '#CBD5E1');
    p(cx - 7, cy - 46, 5, 3, '#38BDF8');
    p(cx + 2, cy - 46, 5, 3, '#38BDF8');
    p(cx - 12, cy - 39, 24, 18, '#E0F2FE');
    p(cx - 8, cy - 35, 16, 14, '#FFFFFF');

    // Gran Hacha de Cristal de Hielo
    p(cx - 48, cy - 14, 88, 6, '#475569');
    p(cx - 52, cy - 32, 24, 34, '#0284C7');
    p(cx - 49, cy - 28, 18, 26, '#7DD3FC');
    p(cx - 46, cy - 24, 10, 18, '#E0F2FE');
  } else {
    // Vaelor: Salón del Trono del Vacío con alas de energía morada y mandoble
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#130722');
    g.addColorStop(0.6, '#260E45');
    g.addColorStop(1, '#120824');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Pilares del trono al fondo
    p(16, 12, 18, h - 24, '#1B0C33');
    p(w - 34, 12, 18, h - 24, '#1B0C33');

    // Grandes Alas de Energía del Vacío
    p(cx - 58, cy - 60, 34, 58, '#4C1D95');
    p(cx - 53, cy - 55, 26, 48, '#A855F7');
    p(cx - 48, cy - 48, 18, 36, '#F0ABFC');
    p(cx + 24, cy - 60, 34, 58, '#4C1D95');
    p(cx + 27, cy - 55, 26, 48, '#A855F7');
    p(cx + 30, cy - 48, 18, 36, '#F0ABFC');

    // Armadura negra y dorada de Vaelor
    p(cx - 26, cy - 32, 52, 52, '#141018');
    p(cx - 22, cy - 28, 44, 46, '#1E1B2E');
    p(cx - 18, cy - 24, 36, 10, '#F2B63D');
    p(cx - 8, cy - 12, 16, 36, '#581C87');
    p(cx - 4, cy - 10, 8, 32, '#A855F7');

    // Yelmo con cuernos dorados y hendidura morada
    p(cx - 14, cy - 54, 28, 24, '#141018');
    p(cx - 11, cy - 51, 22, 18, '#1E1B2E');
    p(cx - 18, cy - 66, 6, 16, '#F2B63D');
    p(cx + 12, cy - 66, 6, 16, '#F2B63D');
    p(cx - 7, cy - 44, 14, 3, '#F0ABFC');

    // Espada del Vacío apoyada al frente
    p(cx - 46, cy - 22, 18, 5, '#F2B63D');
    p(cx - 40, cy - 34, 6, 14, '#F2B63D');
    p(cx - 43, cy - 17, 12, 56, '#141018');
    p(cx - 41, cy - 15, 8, 52, '#9333EA');
    p(cx - 39, cy - 12, 4, 46, '#F0ABFC');
  }
}

/* =========================================================
   ESCENARIOS DE RETRATO DE LAS 4 MASCOTAS DE VALORIA
   ========================================================= */
export function drawPetPortraitBackdrop(ctx, w, h, petId) {
  const p = (x, y, pw, ph, col) => px(ctx, x, y, pw, ph, col);
  if (petId === 'lobo_blanco') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1B2D45');
    g.addColorStop(0.65, '#334E68');
    g.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    p(12, 10, 12, h - 32, '#132235');
    p(w - 26, 14, 12, h - 36, '#132235');
    p(0, h - 26, w, 26, '#E2E8F0');
  } else if (petId === 'fantasma_hoz') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2E1065');
    g.addColorStop(0.7, '#4C1D95');
    g.addColorStop(1, '#1E1B2E');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Cruz y lápidas al fondo
    p(18, 22, 6, 36, '#1E1B2E');
    p(10, 30, 22, 6, '#1E1B2E');
    p(w - 28, h - 42, 16, 22, '#312E81');
  } else if (petId === 'gato_volador') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#38BDF8');
    g.addColorStop(0.7, '#7DD3FC');
    g.addColorStop(1, '#E0F2FE');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Nubes suaves y templo flotante en el horizonte
    p(w - 50, 14, 34, 16, '#D6C7B2');
    p(w - 46, 8, 26, 6, '#94A3B8');
    p(0, h - 20, w, 20, '#FFFFFF');
  } else {
    // Dragón Rojo y Negro: Caverna de lava
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2A0A08');
    g.addColorStop(0.65, '#5C1612');
    g.addColorStop(1, '#9A3412');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    p(0, h - 24, w, 24, '#291512');
    p(10, h - 16, w - 20, 5, '#EA580C');
  }
}
