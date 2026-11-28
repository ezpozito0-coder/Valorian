/**
 * Renderizador 16-bit para:
 * 1. Fondo animado de Valoria en la Pantalla de Inicio (Alba + Hierro + Vacío).
 * 2. Vista previa ampliada del Héroe en Creación (Masculino y Femenino, 6 razas, 4 direcciones, ataque).
 * 3. Miniaturas animadas en el Selector de 3 Personajes.
 */

import { getTexturePattern } from './textures.js';
import { drawCanvasPixelBadge } from './pixelArt.js';
import {
  getAsset,
  getHeroClassAsset,
  getBaseRace3x5Asset,
  getGrid3x5CellAnchors,
  getPetAsset,
  getSkillIconUrl,
  getSpriteFrameMetrics,
  drawFootAnchoredSprite
} from './assetLoader.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Curva de ataque en 3 fases (anticipación 60-90ms -> estocada/embate rápido -> retorno suave):
 * attackTimer va de 1.0 (inicio) a 0.0 (fin).
 */
export function computeAttackPhase(attackTimer) {
  if (!attackTimer || attackTimer <= 0) {
    return { offset: 0, scaleX: 1, scaleY: 1, progress: 0 };
  }
  const p = 1 - Math.max(0, Math.min(1, attackTimer)); // 0 -> 1
  if (p < 0.22) {
    // Fase 1: Anticipación / carga breve (retroceso ligero)
    const t = p / 0.22;
    const pull = -Math.sin(t * (Math.PI / 2)) * 0.35;
    return {
      offset: pull,
      scaleX: 1 + t * 0.05,
      scaleY: 1 - t * 0.06,
      progress: p
    };
  }
  if (p < 0.58) {
    // Fase 2: Embate / estocada rápida hacia el objetivo
    const t = (p - 0.22) / 0.36;
    const lunge = -0.35 + Math.sin(t * (Math.PI / 2)) * 1.35; // llega a +1.0
    return {
      offset: lunge,
      scaleX: 1.06,
      scaleY: 0.95,
      progress: p
    };
  }
  // Fase 3: Retorno suave a la posición base
  const t = (p - 0.58) / 0.42;
  const easeOut = 1 - t * t;
  return {
    offset: easeOut,
    scaleX: 1 + easeOut * 0.03,
    scaleY: 1 - easeOut * 0.02,
    progress: p
  };
}

export function drawHomeValoriaBg(ctx, w, h, time) {
  ctx.clearRect(0, 0, w, h);
  const mid = Math.floor(w / 2);

  const gradAlba = ctx.createLinearGradient(0, 0, mid, h);
  gradAlba.addColorStop(0, '#1E3A8A');
  gradAlba.addColorStop(0.55, '#1E4E8C');
  gradAlba.addColorStop(1, '#0F172A');
  ctx.fillStyle = gradAlba;
  ctx.fillRect(0, 0, mid, h);

  const gradHierro = ctx.createLinearGradient(mid, 0, w, h);
  gradHierro.addColorStop(0, '#450A0A');
  gradHierro.addColorStop(0.55, '#9E2A2B');
  gradHierro.addColorStop(1, '#1C1917');
  ctx.fillStyle = gradHierro;
  ctx.fillRect(mid, 0, w - mid, h);

  const horizon = Math.floor(h * 0.68);
  ctx.fillStyle = '#172554';
  ctx.fillRect(0, horizon, mid, h - horizon);
  px(ctx, mid * 0.22, horizon - 72, 34, 72, '#1E3A8A');
  px(ctx, mid * 0.22 - 4, horizon - 88, 42, 18, '#D9A441');
  px(ctx, mid * 0.48, horizon - 54, 28, 54, '#1E3A8A');
  px(ctx, mid * 0.48 - 4, horizon - 66, 36, 14, '#F4F6FA');

  ctx.fillStyle = '#291515';
  ctx.fillRect(mid, horizon, w - mid, h - horizon);
  px(ctx, mid + (w - mid) * 0.52, horizon - 64, 46, 64, '#451A03');
  px(ctx, mid + (w - mid) * 0.55, horizon - 82, 16, 20, '#EA580C');
  px(ctx, mid + (w - mid) * 0.28, horizon - 46, 36, 46, '#3B1818');

  const pulse = 0.65 + Math.sin(time * 3.2) * 0.25;
  ctx.save();
  ctx.fillStyle = `rgba(147, 51, 234, ${pulse * 0.28})`;
  ctx.fillRect(mid - 38, 0, 76, h);
  for (let y = 0; y < h; y += 22) {
    const zig = Math.sin(y * 0.05) * 10;
    px(ctx, mid + zig - 7, y, 14, 24, '#0D0A14');
    px(ctx, mid + zig - 4, y, 8, 24, '#4C1D95');
    px(ctx, mid + zig - 2, y, 4, 24, '#A855F7');
  }
  ctx.restore();

  for (let i = 0; i < 14; i++) {
    const ax = ((i * 73 + time * 12) % Math.max(40, mid - 20));
    const ay = h - ((i * 59 + time * 24) % h);
    px(ctx, ax, ay, 4, 4, i % 2 === 0 ? '#FDE047' : '#BAE6FD');
    const hx = mid + 20 + ((i * 89 + time * 14) % Math.max(40, w - mid - 20));
    const hy = h - ((i * 67 + time * 32) % h);
    px(ctx, hx, hy, 4, 4, i % 2 === 0 ? '#FB923C' : '#FACC15');
    const vx = mid + Math.sin(time * 2 + i) * 34;
    const vy = h - ((i * 53 + time * 40) % h);
    px(ctx, vx, vy, 4, 5, '#C084FC');
  }
}

function drawCreatorBackdrop(ctx, w, h, faction, time) {
  const isAlba = faction === 'alba';
  const groundY = Math.floor(h * 0.67);

  if (isAlba) {
    // Cielo soleado con degradado suave
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#0284C7');
    sky.addColorStop(0.55, '#38BDF8');
    sky.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    // Sol 16-bit con halo
    px(ctx, w - 62, 16, 32, 32, 'rgba(254, 240, 138, 0.35)');
    px(ctx, w - 56, 22, 20, 20, '#FEF08A');
    px(ctx, w - 52, 26, 12, 12, '#FFFFFF');

    // Nubes detalladas con sombreado
    const cShift = ((time * 7) % (w + 100)) - 50;
    const drawCloud = (cx, cy, cw) => {
      px(ctx, cx, cy + 4, cw, 10, '#E2E8F0');
      px(ctx, cx + 4, cy, cw - 8, 10, '#FFFFFF');
      px(ctx, cx + 10, cy - 4, cw - 20, 6, '#FFFFFF');
    };
    drawCloud(cShift, 28, 56);
    drawCloud((cShift + 170) % (w + 40) - 20, 48, 44);

    // Torres del castillo de Villa Alba al fondo
    [48, w - 92].forEach((tx) => {
      px(ctx, tx, groundY - 92, 44, 56, '#94A3B8');
      px(ctx, tx + 3, groundY - 92, 10, 56, '#CBD5E1');
      px(ctx, tx - 4, groundY - 108, 52, 18, '#1E4E8C');
      px(ctx, tx, groundY - 118, 44, 12, '#2563EB');
      px(ctx, tx + 18, groundY - 76, 8, 14, '#0F172A');
      px(ctx, tx + 20, groundY - 126, 4, 10, '#D9A441');
    });

    // Muralla con ladrillos detallados y almenas
    px(ctx, 0, groundY - 40, w, 40, '#94A3B8');
    for (let bx = 0; bx < w; bx += 24) {
      px(ctx, bx, groundY - 48, 16, 10, '#CBD5E1');
      px(ctx, bx + 2, groundY - 36, 20, 14, '#B6C3D4');
      px(ctx, bx + 2, groundY - 36, 20, 2, '#E2E8F0');
      px(ctx, bx + 12, groundY - 20, 20, 14, '#A8B6C8');
      px(ctx, bx + 12, groundY - 20, 20, 2, '#CBD5E1');
    }

    // Suelo de adoquín texturizado 16-bit
    ctx.fillStyle = getTexturePattern(ctx, 'cobble_alba') || '#94A3B8';
    ctx.fillRect(0, groundY, w, h - groundY);
    px(ctx, 0, groundY, w, 4, '#64748B');

    // Banderas doradas ondeando
    const wave = Math.sin(time * 5) * 3;
    [28, w - 46].forEach((bx) => {
      px(ctx, bx, groundY - 76, 5, 76, '#78350F');
      px(ctx, bx + 5, groundY - 72, 22 + wave, 26, '#1E4E8C');
      px(ctx, bx + 10, groundY - 65, 10, 12, '#D9A441');
    });
  } else {
    // Cielo rojizo dramático de Campamento Hierro
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#2A0808');
    sky.addColorStop(0.55, '#7F1D1D');
    sky.addColorStop(1, '#C97A32');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    // Riscos volcánicos al fondo
    px(ctx, 20, groundY - 82, 74, 46, '#3B1818');
    px(ctx, 42, groundY - 102, 34, 24, '#451A1A');
    px(ctx, w - 104, groundY - 76, 84, 40, '#3B1818');
    px(ctx, w - 76, groundY - 96, 36, 22, '#451A1A');

    // Empalizadas de madera afilada con sombreado
    for (let sx = 4; sx < w; sx += 22) {
      px(ctx, sx, groundY - 52, 16, 52, '#451A03');
      px(ctx, sx + 2, groundY - 52, 10, 52, '#6B3620');
      px(ctx, sx + 4, groundY - 62, 8, 12, '#7C3E26');
      px(ctx, sx + 2, groundY - 34, 14, 3, '#1C1917');
    }

    // Suelo de tierra rojiza texturizada
    ctx.fillStyle = getTexturePattern(ctx, 'dirt_hierro') || '#6B3626';
    ctx.fillRect(0, groundY, w, h - groundY);
    px(ctx, 0, groundY, w, 4, '#451A03');

    // Antorchas animadas con halo
    const fl = Math.sin(time * 16) * 3;
    [34, w - 40].forEach((tx) => {
      px(ctx, tx - 10, groundY - 66, 26, 26, 'rgba(249, 115, 22, 0.25)');
      px(ctx, tx, groundY - 44, 6, 44, '#3B2314');
      px(ctx, tx - 4, groundY - 58 - fl, 14, 16, '#EA580C');
      px(ctx, tx - 1, groundY - 54 - fl, 8, 10, '#FDE047');
    });
  }
}

/* =========================================================
   DIBUJO DETALLADO FEMENINO 16-BIT (6 RAZAS, 3 CLASES, 4 DIRS)
   Silueta fantasía curvilínea (cintura marcada, busto/cadera definidos)
   ========================================================= */
function drawDetailedFemaleSprite(ctx, cx, cy, scale, { faction, race, heroClass, dir = 0, attackTimer = 0 }, time) {
  const s = scale;
  const breath = Math.sin(time * 4.2) * 0.55;
  const hairSway = Math.sin(time * 3.6) * 0.9;
  const isAlba = faction === 'alba';
  const primary = isAlba ? '#1E4E8C' : '#9E2A2B';
  const secondary = isAlba ? '#F4F6FA' : '#C97A32';
  const accent = isAlba ? '#D9A441' : '#6E737B';

  let skin = '#F5CEB0';
  let skinShade = '#E2AF8D';
  let hair = '#92400E';
  let hairLight = '#D97706';
  let hScale = 1.0;
  let wScale = 1.0;

  if (race === 'Elfo') {
    skin = '#FFE8D6'; skinShade = '#EAC2A6'; hair = '#E2E8F0'; hairLight = '#FFFFFF';
    hScale = 1.1; wScale = 0.95;
  } else if (race === 'Enano') {
    skin = '#F4C6A4'; skinShade = '#DBA47E'; hair = '#B45309'; hairLight = '#F59E0B';
    hScale = 0.86; wScale = 1.12;
  } else if (race === 'Orco') {
    skin = '#629E4E'; skinShade = '#487A39'; hair = '#1E1B2E'; hairLight = '#475569';
    hScale = 1.06; wScale = 1.1;
  } else if (race === 'Lobo Guerrero') {
    skin = '#64748B'; skinShade = '#475569'; hair = '#1E293B'; hairLight = '#94A3B8';
    hScale = 1.02; wScale = 1.0;
  } else if (race === 'Nómada') {
    skin = '#D99B66'; skinShade = '#B87B49'; hair = '#1C1917'; hairLight = '#57534E';
    hScale = 1.02; wScale = 0.98;
  }

  // Sombra suave
  ctx.save();
  ctx.fillStyle = 'rgba(13, 10, 20, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16 * s, 9.5 * s * wScale, 4.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bY = cy - 4 * s + breath * s;
  const pRect = (ox, oy, ow, oh, col) =>
    px(ctx, cx + ox * s * wScale, bY + oy * s * hScale, ow * s * wScale, oh * s * hScale, col);

  const facingBack = dir === 2;
  const facingRight = dir === 1;
  const facingLeft = dir === 3;
  const sideDir = facingRight ? 1 : facingLeft ? -1 : 0;
  const atkSwing = attackTimer > 0 ? Math.sin(attackTimer * Math.PI * 2.5) : 0;

  // Capa corta (Arquera) o cabello largo detrás si mira de frente/perfil
  if (!facingBack) {
    if (heroClass === 'arquero') {
      pRect(-5, 0, 10, 8, '#166534');
    }
    if (race === 'Humano' || race === 'Elfo' || race === 'Nómada') {
      pRect(-5.5 + hairSway * 0.4, -8, 11, 13, hair);
      pRect(-4 + hairSway * 0.4, -6, 2.5, 9, hairLight);
    }
  }

  // Piernas estilizadas + Botas altas hasta el muslo
  const legColor = skin;
  const bootColor = heroClass === 'guerrero' ? '#CBD5E1' : heroClass === 'mago' ? primary : '#5C3A21';
  if (sideDir !== 0) {
    // Perfil: muestra claramente la curva de glúteos y piernas
    pRect(-2.5, 8, 5, 6, legColor);
    pRect(-2.5, 11.5, 5, 6.5, bootColor);
    pRect(-2.5, 11.5, 5, 1.2, accent);
  } else {
    pRect(-4.6, 8, 3.8, 5, legColor);
    pRect(0.8, 8, 3.8, 5, legColor);
    pRect(-4.8, 11.5, 4.1, 6.5, bootColor);
    pRect(0.7, 11.5, 4.1, 6.5, bootColor);
    pRect(-4.8, 11.5, 4.1, 1.2, accent);
    pRect(0.7, 11.5, 4.1, 1.2, accent);
  }

  // Caderas anchas y glúteos bien definidos (especialmente visibles de perfil y de espaldas)
  const hipColor = heroClass === 'arquero' ? '#5C3A21' : primary;
  if (sideDir !== 0) {
    // Perfil: curva trasera pronunciada hacia el lado opuesto a donde mira
    const backSign = -sideDir;
    pRect(backSign > 0 ? -2.5 : -5.5, 5.2, 8, 4.4, '#0D0A14');
    pRect(backSign > 0 ? -2 : -4.8, 5.7, 6.8, 3.4, hipColor);
    // Detalle contorno trasero
    pRect(backSign > 0 ? 2.8 : -4.8, 6.2, 2.2, 2.6, backSign > 0 ? accent : hipColor);
  } else {
    // Frente o Espalda: silueta reloj de arena (caderas anchas)
    pRect(-6, 5.0, 12, 4.6, '#0D0A14');
    pRect(-5.2, 5.5, 10.4, 3.6, hipColor);
    if (facingBack) {
      // Definición trasera con sombreado pixel art
      pRect(-0.5, 6.0, 1, 3.0, '#0D0A14');
      pRect(-4.6, 5.8, 3.8, 2.8, hipColor);
      pRect(0.8, 5.8, 3.8, 2.8, hipColor);
      pRect(-5.2, 5.2, 10.4, 1.2, accent);
    } else {
      // Cinturón / abertura frontal corta
      pRect(-5.2, 5.3, 10.4, 1.3, accent);
      if (heroClass === 'guerrero') pRect(-1.5, 6.8, 3, 2.5, secondary);
    }
  }

  // Cintura estrecha marcada (piel descubierta en estilo fantasía RPG)
  pRect(-3.6, 2.6, 7.2, 3.0, '#0D0A14');
  pRect(-3.0, 2.9, 6.0, 2.5, skin);
  if (race === 'Nómada') {
    pRect(-1.8, 3.4, 3.6, 1.2, '#9E2A2B'); // marca tribal
  }

  // Torso superior / Busto pronunciado + Armadura pequeña ajustada
  const topColor = heroClass === 'guerrero' ? '#CBD5E1' : heroClass === 'mago' ? primary : '#78350F';
  if (sideDir !== 0) {
    // Perfil: busto sobresaliendo hacia adelante
    const fSign = sideDir;
    pRect(fSign > 0 ? -3.2 : -5.8, -1.2, 9.0, 4.4, '#0D0A14');
    pRect(fSign > 0 ? -2.6 : -5.0, -0.7, 7.6, 3.4, topColor);
    pRect(fSign > 0 ? 2.5 : -5.0, 0.0, 2.6, 2.4, accent);
  } else {
    pRect(-5.5, -1.2, 11, 4.3, '#0D0A14');
    pRect(-4.8, -0.7, 9.6, 3.3, topColor);
    if (!facingBack) {
      // Realce de peto / escote de fantasía
      pRect(-4.2, -0.2, 3.6, 2.4, heroClass === 'guerrero' ? primary : accent);
      pRect(0.6, -0.2, 3.6, 2.4, heroClass === 'guerrero' ? primary : accent);
      pRect(-1.2, -0.7, 2.4, 1.5, skinShade);
    }
  }

  // Hombreras marcadas (Guerrera) o brillos arcanos (Maga)
  if (heroClass === 'guerrero') {
    pRect(-6.8, -2.0, 3.2, 3.2, primary);
    pRect(3.6, -2.0, 3.2, 3.2, primary);
    pRect(-6.4, -2.0, 2.4, 1.0, accent);
    pRect(4.0, -2.0, 2.4, 1.0, accent);
  } else if (heroClass === 'mago') {
    pRect(-5.5, -1.0, 1.6, 1.6, '#38BDF8');
    pRect(3.9, -1.0, 1.6, 1.6, '#38BDF8');
  }

  // Cabeza
  const hY = -9.5;
  pRect(-4.6, hY - 0.8, 9.2, 8.6, '#0D0A14');
  pRect(-3.8, hY, 7.6, 7.0, skin);

  // Rasgos de cada raza femenina
  if (race === 'Elfo') {
    pRect(-6.8, hY + 2.0, 3.2, 1.8, skin);
    pRect(3.6, hY + 2.0, 3.2, 1.8, skin);
  } else if (race === 'Lobo Guerrero') {
    pRect(-4.0, hY - 3.0, 2.4, 3.2, '#475569');
    pRect(1.6, hY - 3.0, 2.4, 3.2, '#475569');
    if (!facingBack) pRect(-1.6, hY + 4.0, 3.2, 2.0, '#94A3B8');
  } else if (race === 'Orco' && !facingBack) {
    pRect(-2.4, hY + 5.2, 1.2, 1.5, '#FFFFFF');
    pRect(1.2, hY + 5.2, 1.2, 1.5, '#FFFFFF');
  }

  // Peinado distintivo por raza
  if (facingBack) {
    pRect(-4.8 + hairSway * 0.4, hY - 1, 9.6, 10.5, hair);
    pRect(-3.2 + hairSway * 0.4, hY + 1, 2.2, 7.5, hairLight);
    if (race === 'Enano') {
      // Trenzas gruesas con aros dorados (sin barba)
      pRect(-5.4, hY + 3, 2.4, 7.5, hair);
      pRect(3.0, hY + 3, 2.4, 7.5, hair);
      pRect(-5.4, hY + 8, 2.4, 1.4, '#FDE047');
      pRect(3.0, hY + 8, 2.4, 1.4, '#FDE047');
    } else if (race === 'Orco') {
      // Coleta alta
      pRect(-2.0, hY - 4.5, 4.0, 4.5, hair);
    }
  } else {
    pRect(-4.6, hY - 1.2, 9.2, 2.8, hair);
    pRect(-3.0, hY - 1.0, 3.0, 1.2, hairLight);
    if (race === 'Enano') {
      pRect(-5.4, hY + 1, 2.2, 7.5, hair);
      pRect(3.2, hY + 1, 2.2, 7.5, hair);
      pRect(-5.4, hY + 6.5, 2.2, 1.3, '#FDE047');
      pRect(3.2, hY + 6.5, 2.2, 1.3, '#FDE047');
    } else if (race === 'Orco') {
      pRect(-2.0, hY - 4.8, 4.0, 3.8, hair);
    } else if (race === 'Nómada') {
      pRect(-4.6, hY - 1.6, 9.2, 1.3, '#D9A441'); // diadema metálica
    }
    // Ojos expresivos 16-bit con brillo blanco
    const eyeShift = facingRight ? 1.4 : facingLeft ? -1.4 : 0;
    const eyeCol = race === 'Lobo Guerrero' ? '#FACC15' : '#0D0A14';
    pRect(-2.5 + eyeShift, hY + 2.6, 1.7, 1.9, eyeCol);
    pRect(0.9 + eyeShift, hY + 2.6, 1.7, 1.9, eyeCol);
    pRect(-2.3 + eyeShift, hY + 2.7, 0.7, 0.7, '#FFFFFF');
    pRect(1.1 + eyeShift, hY + 2.7, 0.7, 0.7, '#FFFFFF');
    // Rubor y brillo de cabello
    pRect(-3.2 + eyeShift, hY + 4.4, 1.1, 0.7, skinShade);
    pRect(2.1 + eyeShift, hY + 4.4, 1.1, 0.7, skinShade);
  }

  // Armas + Animación "Probar Ataque"
  const weaponSide = facingLeft ? -1 : 1;
  const wx = weaponSide * 7.5;
  const swingOff = atkSwing * 5 * weaponSide;

  if (heroClass === 'guerrero') {
    pRect(wx - 1 + swingOff, -5 - Math.abs(atkSwing) * 4, 2.4, 12, '#E2E8F0');
    pRect(wx - 2.4 + swingOff, 4 - Math.abs(atkSwing) * 4, 5.2, 1.6, accent);
    const sx = -weaponSide * 7.8;
    pRect(sx - 2, 0, 4.8, 7.5, primary);
    pRect(sx - 1, 1.5, 2.8, 4.5, accent);
    if (attackTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + weaponSide * 10 * s, bY + 2 * s, 14 * s, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    }
  } else if (heroClass === 'mago') {
    pRect(wx - 0.8 + swingOff * 0.5, -7, 2, 18, '#78350F');
    pRect(wx - 2 + swingOff * 0.5, -10, 4.5, 4.5, '#38BDF8');
    if (attackTimer > 0) {
      const dist = (1 - attackTimer) * 28 * s;
      ctx.save();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(cx + weaponSide * (12 * s + dist), bY - 2 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(cx + weaponSide * (12 * s + dist), bY - 2 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    pRect(wx - 0.5, -4, 2, 13, '#92400E');
    pRect(wx + weaponSide * 1.5, -3, 1, 11, '#F4F6FA');
    if (attackTimer > 0) {
      const dist = (1 - attackTimer) * 34 * s;
      pRect(wx + weaponSide * (3 + dist / s), 1, 7, 1.5, '#FACC15');
    }
  }
}

/**
 * Dibuja las Alas equipadas (Alas del Vacío o Alas de Luz) ancladas exactamente a los omóplatos reales
 * del personaje, moviéndose con su salto, caminata y estocada, y respetando el Z-order (frente/lado vs espalda).
 */
function drawAnchoredHeroWings(ctx, wingAnchorX, wingAnchorY, scale, wingsType, time, isSide = false, facingLeft = false) {
  if (!wingsType) return;
  const flap = Math.sin(time * 5) * 1.8 * scale;
  const isVoid = wingsType === 'alas_vacio';
  const outer = isVoid ? '#4C1D95' : '#94A3B8';
  const mid = isVoid ? '#9333EA' : '#E2E8F0';
  const inner = isVoid ? '#C084FC' : '#F8FAFC';
  const glow = isVoid ? '#F0ABFC' : '#FEF08A';

  ctx.save();
  if (isVoid) {
    ctx.fillStyle = 'rgba(147, 51, 234, 0.16)';
    ctx.beginPath();
    ctx.ellipse(wingAnchorX, wingAnchorY + 2 * scale, 18 * scale, 13 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const drawWing = (side, scaleMult = 1) => {
    const lift = flap * 0.55;
    const feathers = [
      { len: 18 * scaleMult, ang: -0.98, w: 3.8 },
      { len: 21 * scaleMult, ang: -0.66, w: 4.2 },
      { len: 20 * scaleMult, ang: -0.34, w: 4.2 },
      { len: 16 * scaleMult, ang: -0.04, w: 3.8 },
      { len: 12 * scaleMult, ang: 0.28, w: 3.2 }
    ];
    const ox = wingAnchorX + side * 3.2 * scale * scaleMult;
    const oy = wingAnchorY;
    for (let i = feathers.length - 1; i >= 0; i--) {
      const f = feathers[i];
      const a = f.ang + (-lift / (18 * scale)) * (1 - i * 0.12);
      const dx = Math.cos(a) * f.len * scale * side;
      const dy = Math.sin(a) * f.len * scale;
      const nx = -Math.sin(a) * f.w * scale * 0.45 * side * -1;
      const ny = Math.cos(a) * f.w * scale * 0.45;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(ox + nx, oy + ny);
        ctx.lineTo(ox + dx + nx * 0.45, oy + dy + ny * 0.45);
        ctx.lineTo(ox + dx * 1.04, oy + dy * 1.04);
        ctx.lineTo(ox + dx - nx * 0.45, oy + dy - ny * 0.45);
        ctx.lineTo(ox - nx, oy - ny);
        ctx.closePath();
      };
      ctx.fillStyle = '#0D0A14';
      path();
      ctx.fill();
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(0.84, 0.84);
      ctx.translate(-ox, -oy);
      ctx.fillStyle = i === 0 ? inner : i % 2 === 0 ? outer : mid;
      path();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = glow;
    ctx.fillRect(Math.round(ox - side * 1.5 * scale - 1), Math.round(oy - 1.5 * scale), Math.max(2, Math.round(2.4 * scale)), Math.max(2, Math.round(2.4 * scale)));
  };

  if (isSide) {
    // En vista lateral las alas se proyectan hacia la espalda del personaje
    const backSide = facingLeft ? 1 : -1;
    drawWing(backSide, 0.92);
  } else {
    drawWing(-1, 1);
    drawWing(1, 1);
  }
  ctx.restore();
}

/**
 * Renderiza las capas modulares de armadura y arma sobre el cuerpo base 3x5 sin armadura,
 * adaptadas exactamente a los puntos de anclaje anatómicos reales (cabeza, cuello, torso, manos, piernas y pies)
 * de cada raza y cuadro (rowIndex: 0=frente, 1=lado, 2=espalda; colIndex: 0=idle, 1/2=walk, 3=jump, 4=attack)
 * con estética Pixel Art 16-bit sombreada.
 */
function drawHeroEquipmentLayers(ctx, anchorX, anchorY, s, state, { rowIndex, colIndex, flipX, drawW, drawH, anchors }) {
  const heroClass = state.heroClass || 'guerrero';
  const isHierro = state.faction === 'hierro';
  const gear = state.gearSlots || {
    casco: null, pechera: 'base', guanteletes: null, guantes: null, pierneras: null, botas: null,
    arma: 'base', alas: null, collar: null
  };
  const armorPlus = state.equipment?.armor?.plus || 0;
  const armorQual = state.equipment?.armor?.quality || 0;
  const weaponPlus = state.equipment?.weapon?.plus || 0;

  const primary = isHierro ? '#9E2A2B' : '#1E4E8C';
  const primaryHi = isHierro ? '#EF4444' : '#3B82F6';
  const primaryDark = isHierro ? '#5F1415' : '#132F57';
  const trim = armorQual >= 4 ? '#FDE047' : armorQual >= 2 ? '#F2B63D' : isHierro ? '#D97706' : '#CBD5E1';
  const trimHi = '#FEF08A';
  const plate = armorPlus >= 9 ? '#E2E8F0' : '#94A3B8';
  const plateHi = '#F8FAFC';
  const plateDark = '#475569';
  const leather = '#78350F';
  const leatherHi = '#B45309';
  const leatherDark = '#451A03';
  const outline = '#0D0A14';

  const effW = drawW || 38 * s;
  const effH = drawH || 38 * s;
  const a = anchors || {
    topY: -0.82, footY: -0.02, charW: 0.42, charH: 0.80,
    headCx: 0, headTopY: -0.82, headW: 0.18, headH: 0.18,
    neckCx: 0, neckY: -0.62,
    torsoCx: 0, torsoTopY: -0.61, torsoW: 0.20, torsoH: 0.24,
    leftHandX: -0.17, leftHandY: -0.44, rightHandX: 0.17, rightHandY: -0.44,
    legTopY: -0.32, legH: 0.18, leftLegCx: -0.07, rightLegCx: 0.07, legW: 0.09,
    footTopY: -0.14, footH: 0.12, leftFootCx: -0.08, rightFootCx: 0.08, footW: 0.10
  };

  const u = Math.max(0.75, s * 0.52);
  const pStep = Math.max(1, Math.round(0.6 * u));
  const isSide = rowIndex === 1;
  const isBack = rowIndex === 2;
  const isWalk1 = colIndex === 1;
  const isWalk2 = colIndex === 2;
  const isJump = colIndex === 3;
  const isAttack = colIndex === 4;

  // Balanceo vertical de 1px al caminar para que todas las piezas acompañen el paso
  const walkBobY = (isWalk1 || isWalk2) ? -0.9 * u : 0;

  ctx.save();
  ctx.translate(Math.round(anchorX), Math.round(anchorY));
  if (flipX) ctx.scale(-1, 1);

  const r = (ox, oy, ow, oh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(ox), Math.round(oy), Math.max(1, Math.round(ow)), Math.max(1, Math.round(oh)));
  };
  const rShaded = (ox, oy, ow, oh, baseCol, hiCol, darkCol) => {
    const x = Math.round(ox);
    const y = Math.round(oy);
    const w = Math.max(2, Math.round(ow));
    const h = Math.max(2, Math.round(oh));
    const b = pStep;
    r(x - b, y - b, w + b * 2, h + b * 2, outline);
    r(x, y, w, h, baseCol);
    if (hiCol && h >= 3) r(x, y, w, Math.max(1, Math.round(h * 0.28)), hiCol);
    if (darkCol && h >= 3) r(x, y + h - Math.max(1, Math.round(h * 0.25)), w, Math.max(1, Math.round(h * 0.25)), darkCol);
  };

  // Coordenadas anatómicas en píxeles de canvas para este cuadro exacto
  const headCx = a.headCx * effW;
  const headTopY = a.headTopY * effH + walkBobY;
  const headW = Math.max(6 * u, a.headW * effW);
  const headH = Math.max(6 * u, a.headH * effH);

  const torsoCx = a.torsoCx * effW;
  const torsoTopY = a.torsoTopY * effH + walkBobY;
  const torsoW = Math.max(6.5 * u, a.torsoW * effW * (isSide ? 0.72 : 0.86));
  const torsoH = Math.max(6 * u, a.torsoH * effH * 0.78);

  const legTopY = a.legTopY * effH;
  const legH = Math.max(3.2 * u, a.legH * effH * 0.72);
  const legW = Math.max(2.6 * u, a.legW * effW * 0.78);
  const lLegX = a.leftLegCx * effW;
  const rLegX = a.rightLegCx * effW;

  const footTopY = a.footTopY * effH;
  const footH = Math.max(2.4 * u, a.footH * effH * 0.72);
  const footW = Math.max(2.8 * u, a.footW * effW * 0.80);
  const lFootX = a.leftFootCx * effW;
  const rFootX = a.rightFootCx * effW;

  const lHandX = a.leftHandX * effW;
  const lHandY = a.leftHandY * effH + walkBobY;
  const rHandX = a.rightHandX * effW;
  const rHandY = a.rightHandY * effH + walkBobY;

  // Desfase vertical de piernas al caminar (col 1 vs col 2)
  const lStepY = isWalk1 ? -1.4 * u : isWalk2 ? 0.6 * u : 0;
  const rStepY = isWalk2 ? -1.4 * u : isWalk1 ? 0.6 * u : 0;

  const isFemale = state.gender === 'female';

  // 1. Pierneras (Grebas / Musleras): en heroínas femeninas solo dibujar ligas/musleras finas dejando muslos y piernas descubiertos
  if (gear.pierneras) {
    const legBase = heroClass === 'guerrero' ? plate : heroClass === 'mago' ? primary : leather;
    const legHi = heroClass === 'guerrero' ? plateHi : heroClass === 'mago' ? primaryHi : leatherHi;
    const legDk = heroClass === 'guerrero' ? plateDark : heroClass === 'mago' ? primaryDark : leatherDark;
    if (isFemale) {
      const bandH = Math.max(1.5 * u, pStep * 1.6);
      if (isSide) {
        const sideLegX = ((lLegX + rLegX) * 0.5) - legW * 0.52;
        r(sideLegX, legTopY + legH * 0.35 + lStepY * 0.5, legW * 1.05, bandH, trim);
      } else {
        r(lLegX - legW * 0.45, legTopY + legH * 0.35 + lStepY, legW * 0.9, bandH, trim);
        r(rLegX - legW * 0.45, legTopY + legH * 0.35 + rStepY, legW * 0.9, bandH, trim);
      }
    } else if (isSide) {
      const sideLegX = ((lLegX + rLegX) * 0.5) - legW * 0.55;
      rShaded(sideLegX, legTopY + lStepY * 0.5, legW * 1.15, legH, legBase, legHi, legDk);
      r(sideLegX + pStep, legTopY + lStepY * 0.5 + legH * 0.45, legW * 1.15 - pStep * 2, pStep, trim);
    } else {
      rShaded(lLegX - legW * 0.5, legTopY + lStepY, legW, legH, legBase, legHi, legDk);
      rShaded(rLegX - legW * 0.5, legTopY + rStepY, legW, legH, legBase, legHi, legDk);
      // Rodillera pixel art
      r(lLegX - legW * 0.3, legTopY + lStepY + pStep, legW * 0.6, pStep, trim);
      r(rLegX - legW * 0.3, legTopY + rStepY + pStep, legW * 0.6, pStep, trim);
    }
  }

  // 2. Botas ancladas a cada pie real
  if (gear.botas) {
    const bBase = heroClass === 'guerrero' ? plateDark : leather;
    const bHi = heroClass === 'guerrero' ? plate : leatherHi;
    const bDk = heroClass === 'guerrero' ? '#1E293B' : leatherDark;
    if (isSide) {
      if (isWalk1 || isWalk2 || isAttack) {
        rShaded(lFootX - footW * 0.48, footTopY + lStepY, footW * 0.95, footH, bBase, bHi, bDk);
        rShaded(rFootX - footW * 0.48, footTopY + rStepY, footW * 0.95, footH, bBase, bHi, bDk);
      } else {
        const sideFootX = ((lFootX + rFootX) * 0.5) - footW * 0.5;
        rShaded(sideFootX, footTopY, footW * 1.15, footH, bBase, bHi, bDk);
        r(sideFootX, footTopY, footW * 0.85, pStep, trim);
      }
    } else {
      rShaded(lFootX - footW * 0.5, footTopY + lStepY, footW, footH, bBase, bHi, bDk);
      rShaded(rFootX - footW * 0.5, footTopY + rStepY, footW, footH, bBase, bHi, bDk);
      r(lFootX - footW * 0.4, footTopY + lStepY, footW * 0.8, pStep, trim);
      r(rFootX - footW * 0.4, footTopY + rStepY, footW * 0.8, pStep, trim);
    }
  }

  // 3. Pechera / Coraza / Túnica: en heroínas femeninas usar bikini-armor mínimo que deja abdomen, cintura, escote y caderas al descubierto
  if (gear.pechera) {
    const tx = torsoCx - torsoW * 0.5;
    const ty = torsoTopY + torsoH * 0.08;
    const tw = torsoW;
    const th = torsoH * 0.86;
    const waistW = tw * 0.82;
    const waistX = torsoCx - waistW * 0.5;

    if (isFemale) {
      const braBase = heroClass === 'guerrero' ? primary : heroClass === 'mago' ? primaryHi : leather;
      const braTrim = trim;
      const cupW = Math.max(2.2 * u, tw * 0.34);
      const cupH = Math.max(1.8 * u, th * 0.26);
      const cupY = ty + th * 0.14;
      if (isBack) {
        // De espaldas: solo un tirante fino horizontal dejando espalda, cintura y glúteos descubiertos
        r(tx + tw * 0.14, cupY + cupH * 0.35, tw * 0.72, pStep, braTrim);
      } else if (isSide) {
        // De perfil: copa del bikini-armor realzando el busto hacia adelante y cinturón fino en cadera
        r(torsoCx - cupW * 0.25, cupY, cupW * 0.95, cupH, braBase);
        r(torsoCx - cupW * 0.25, cupY, cupW * 0.95, pStep, braTrim);
      } else {
        // De frente: dos copas separadas dejando escote central y todo el abdomen/cintura descubiertos
        r(torsoCx - cupW - pStep * 0.6, cupY, cupW, cupH, braBase);
        r(torsoCx + pStep * 0.6, cupY, cupW, cupH, braBase);
        r(torsoCx - cupW - pStep * 0.6, cupY, cupW, pStep, braTrim);
        r(torsoCx + pStep * 0.6, cupY, cupW, pStep, braTrim);
      }
      // Hombreras pequeñas minimalistas solo si es Guerrera
      if (heroClass === 'guerrero' && !isSide) {
        const pW = Math.max(1.8 * u, tw * 0.24);
        const pH = Math.max(1.5 * u, th * 0.22);
        r(tx - pW * 0.35, ty, pW, pH, plate);
        r(tx + tw - pW * 0.65, ty, pW, pH, plate);
        r(tx - pW * 0.35, ty, pW, pStep, braTrim);
        r(tx + tw - pW * 0.65, ty, pW, pStep, braTrim);
      }
    } else if (heroClass === 'guerrero') {
      // Peto superior y cintura entallada (forma de coraza en V)
      rShaded(waistX, ty + th * 0.45, waistW, th * 0.55, plateDark, plate, '#1E293B');
      rShaded(tx, ty, tw, th * 0.58, plate, plateHi, plateDark);
      // Tabardo central con emblema de facción
      r(torsoCx - tw * 0.18, ty + pStep, tw * 0.36, th - pStep * 2, primary);
      r(torsoCx - tw * 0.08, ty + th * 0.22, tw * 0.16, th * 0.32, trim);
      // Cinturón metálico
      rShaded(waistX - pStep * 0.5, ty + th - pStep * 2.2, waistW + pStep, pStep * 2.2, leather, trim, leatherDark);
      r(torsoCx - pStep * 1.2, ty + th - pStep * 2.4, pStep * 2.4, pStep * 2.4, trimHi);

      // Hombreras escalonadas sobre los hombros reales
      const paulW = Math.max(2.4 * u, tw * 0.34);
      const paulH = Math.max(2.2 * u, th * 0.38);
      if (!isSide) {
        rShaded(tx - paulW * 0.55, ty - pStep, paulW, paulH, plate, plateHi, plateDark);
        rShaded(tx + tw - paulW * 0.45, ty - pStep, paulW, paulH, plate, plateHi, plateDark);
        r(tx - paulW * 0.45, ty, paulW * 0.8, pStep, trim);
        r(tx + tw - paulW * 0.35, ty, paulW * 0.8, pStep, trim);
      } else {
        rShaded(torsoCx - paulW * 0.55, ty - pStep, paulW * 1.15, paulH, plate, plateHi, plateDark);
        r(torsoCx - paulW * 0.4, ty, paulW * 0.85, pStep, trim);
      }
    } else if (heroClass === 'mago') {
      // Túnica arcana entallada con faldón y estola dorada
      rShaded(waistX - pStep, ty + th * 0.4, waistW + pStep * 2, th * 0.78, primaryDark, primary, '#0F172A');
      rShaded(tx, ty, tw, th * 0.56, primary, primaryHi, primaryDark);
      r(torsoCx - tw * 0.16, ty, tw * 0.32, th * 1.12, trim);
      r(torsoCx - tw * 0.08, ty + pStep, tw * 0.16, th * 1.0, primaryHi);
      // Hombreras de tela arcana
      const paulW = Math.max(2.2 * u, tw * 0.32);
      const paulH = Math.max(1.8 * u, th * 0.30);
      if (!isSide) {
        rShaded(tx - paulW * 0.45, ty - pStep * 0.5, paulW, paulH, primaryHi, trim, primaryDark);
        rShaded(tx + tw - paulW * 0.55, ty - pStep * 0.5, paulW, paulH, primaryHi, trim, primaryDark);
      } else {
        rShaded(torsoCx - paulW * 0.5, ty - pStep * 0.5, paulW, paulH, primaryHi, trim, primaryDark);
      }
    } else {
      // Brigantina / Cota de cuero de Arquero con correas cruzadas
      rShaded(waistX, ty + th * 0.45, waistW, th * 0.55, leatherDark, leather, '#271202');
      rShaded(tx, ty, tw, th * 0.58, leather, leatherHi, leatherDark);
      r(tx + pStep, ty + pStep, tw - pStep * 2, th * 0.36, '#15803D');
      // Correa diagonal y hebilla
      r(torsoCx - tw * 0.32, ty + pStep, tw * 0.22, pStep * 1.4, trim);
      r(torsoCx - tw * 0.10, ty + th * 0.28, tw * 0.22, pStep * 1.4, trim);
      rShaded(waistX, ty + th - pStep * 2, waistW, pStep * 2, leatherDark, leatherHi, '#1C0D02');
      r(torsoCx - pStep, ty + th - pStep * 2, pStep * 2, pStep * 2, trim);
    }

    // Si está de espaldas (row 2), dibujar capa corta sobre la espalda
    if (isBack) {
      rShaded(tx + pStep * 0.5, ty + pStep, tw - pStep, th * 1.08, primary, primaryHi, primaryDark);
      r(tx + pStep * 1.5, ty + th * 0.96, tw - pStep * 3, pStep, trim);
    }
  }

  // 4. Collar / Amuleto en la base del cuello
  if (gear.collar && !isBack) {
    const neckX = (a.neckCx * effW) + (isSide ? 1.0 * u : 0);
    const neckY = (a.neckY * effH) + walkBobY + 0.8 * u;
    const isShadow = gear.collar === 'collar_sombras';
    const gemCol = isShadow ? '#A855F7' : '#38BDF8';
    const gemHi = isShadow ? '#F0ABFC' : '#E0F2FE';
    // Cadena dorada + gema central
    r(neckX - 2.2 * u, neckY - 0.6 * u, 4.4 * u, pStep, trim);
    rShaded(neckX - 1.2 * u, neckY, 2.4 * u, 2.2 * u, gemCol, gemHi, '#3B0764');
  }

  // 5. Guanteletes / Guantes anclados directamente a las manos reales de cada cuadro
  if (gear.guanteletes || gear.guantes) {
    const gBase = gear.guanteletes ? plate : leather;
    const gHi = gear.guanteletes ? plateHi : leatherHi;
    const gDk = gear.guanteletes ? plateDark : leatherDark;
    const gw = Math.max(2.2 * u, torsoW * 0.24);
    const gh = Math.max(2.2 * u, torsoH * 0.28);
    if (isSide) {
      rShaded(rHandX - gw * 0.65, rHandY - gh * 0.4, gw, gh, gBase, gHi, gDk);
      r(rHandX - gw * 0.55, rHandY - gh * 0.4, gw * 0.8, pStep, trim);
    } else {
      rShaded(lHandX - gw * 0.25, lHandY - gh * 0.45, gw, gh, gBase, gHi, gDk);
      rShaded(rHandX - gw * 0.75, rHandY - gh * 0.45, gw, gh, gBase, gHi, gDk);
      r(lHandX - gw * 0.15, lHandY - gh * 0.45, gw * 0.8, pStep, trim);
      r(rHandX - gw * 0.65, rHandY - gh * 0.45, gw * 0.8, pStep, trim);
    }
  }

  // 6. Casco / Corona / Sombrero encajado sobre la frente/coronilla real (sin flotar ni tapar ojos)
  if (gear.casco) {
    const isFrostHelm = gear.casco === 'casco_escarcha';
    const hw = headW * (isSide ? 0.92 : 0.98);
    const hx = headCx - hw * 0.5;
    // Se asienta exactamente sobre el tercio superior de la cabeza real (frente/coronilla)
    const hy = headTopY + headH * 0.04;
    const hh = Math.max(2.6 * u, headH * 0.36);

    if (heroClass === 'guerrero' || isFrostHelm) {
      const hBase = isFrostHelm ? '#0284C7' : plate;
      const hHi = isFrostHelm ? '#7DD3FC' : plateHi;
      const hDk = isFrostHelm ? '#0369A1' : plateDark;
      // Cúpula escalonada + banda frontal dorada + protector nasal corto
      rShaded(hx + hw * 0.12, hy - pStep * 1.2, hw * 0.76, pStep * 1.5, hBase, hHi, hDk);
      rShaded(hx, hy, hw, hh, hBase, hHi, hDk);
      r(hx + pStep, hy + hh - pStep * 1.4, hw - pStep * 2, pStep * 1.2, trim);
      if (!isBack && !isSide) {
        // Protector nasal fino entre las cejas
        r(headCx - pStep * 0.8, hy + hh - pStep * 0.5, pStep * 1.6, pStep * 1.8, trim);
      }
      if (isFrostHelm) {
        // Cuernos curvos de escarcha a ambos lados del casco
        const hornW = Math.max(1.6 * u, hw * 0.18);
        const hornH = Math.max(2.8 * u, hh * 1.05);
        if (!isSide) {
          rShaded(hx - hornW * 0.75, hy - hornH * 0.55, hornW, hornH, '#BAE6FD', '#F0F9FF', '#38BDF8');
          rShaded(hx + hw - hornW * 0.25, hy - hornH * 0.55, hornW, hornH, '#BAE6FD', '#F0F9FF', '#38BDF8');
        } else {
          rShaded(headCx - hornW * 0.6, hy - hornH * 0.6, hornW * 1.1, hornH, '#BAE6FD', '#F0F9FF', '#38BDF8');
        }
      } else {
        // Cimera/cresta del casco
        rShaded(headCx - pStep * 1.4, hy - pStep * 2.4, pStep * 2.8, pStep * 1.8, primary, primaryHi, primaryDark);
      }
    } else if (heroClass === 'mago') {
      // Sombrero arcano en punta / tiara mística ajustada a la frente
      rShaded(hx - pStep * 1.8, hy + hh * 0.55, hw + pStep * 3.6, pStep * 2.0, primaryDark, primary, '#0F172A');
      rShaded(hx + hw * 0.12, hy - hh * 0.5, hw * 0.76, hh * 1.1, primary, primaryHi, primaryDark);
      rShaded(hx + hw * 0.26, hy - hh * 1.05, hw * 0.48, hh * 0.65, primary, primaryHi, primaryDark);
      r(hx + hw * 0.12, hy + hh * 0.38, hw * 0.76, pStep * 1.2, trim);
    } else {
      // Capucha/diadema de explorador con pluma lateral
      rShaded(hx, hy + pStep * 0.4, hw, hh * 0.85, '#166534', '#22C55E', '#052E16');
      r(hx + pStep, hy + hh * 0.65, hw - pStep * 2, pStep * 1.1, trim);
      rShaded(hx + hw - pStep * 2.2, hy - pStep * 2.2, pStep * 1.8, pStep * 2.8, '#EF4444', '#FCA5A5', '#991B1B');
    }
  }

  // 7. Arma y Escudo anclados a las manos reales del personaje (sin tapar el pecho)
  if (gear.arma) {
    // En vista frontal/trasera el arma va en la mano derecha del canvas (rHand) hacia afuera, y el escudo en lHand
    const wx = isSide ? rHandX + 0.8 * u : rHandX + 1.4 * u;
    const wy = rHandY;
    const bladeCol = weaponPlus >= 9 ? '#FEF08A' : '#E2E8F0';
    const bladeHi = '#FFFFFF';
    const bladeDk = weaponPlus >= 9 ? '#CA8A04' : '#64748B';

    if (heroClass === 'guerrero') {
      if (isAttack) {
        // Estocada horizontal hacia adelante
        rShaded(wx + 1.0 * u, wy - 1.2 * u, 11.5 * u, 2.4 * u, bladeCol, bladeHi, bladeDk);
        rShaded(wx - 0.6 * u, wy - 2.8 * u, 1.8 * u, 5.4 * u, trim, trimHi, leatherDark);
        rShaded(wx - 2.4 * u, wy - 0.9 * u, 2.0 * u, 1.8 * u, leather, leatherHi, leatherDark);
      } else {
        // Espada sostenida en la mano exterior con pomo, empuñadura, guarda en cruz y hoja biselada
        const bladeH = 11.0 * u;
        const bladeW = 2.2 * u;
        rShaded(wx - bladeW * 0.5, wy - bladeH - 1.0 * u, bladeW, bladeH, bladeCol, bladeHi, bladeDk);
        // Punta de la espada
        rShaded(wx - bladeW * 0.35, wy - bladeH - 2.2 * u, bladeW * 0.7, 1.4 * u, bladeHi, bladeHi, bladeCol);
        // Guarda en cruz dorada
        rShaded(wx - 2.6 * u, wy - 1.2 * u, 5.2 * u, 1.5 * u, trim, trimHi, leatherDark);
        // Empuñadura y pomo
        rShaded(wx - 0.8 * u, wy + 0.2 * u, 1.6 * u, 2.2 * u, leather, leatherHi, leatherDark);
        r(wx - 1.1 * u, wy + 2.2 * u, 2.2 * u, 1.2 * u, trim);
      }

      // Escudo heráldico en la mano opuesta (lHand), al costado exterior del brazo sin cubrir el torso
      if (!isSide) {
        const sw = Math.max(3.8 * u, torsoW * 0.38);
        const sh = Math.max(5.6 * u, torsoH * 0.62);
        const sx = lHandX - sw * 0.75;
        const sy = lHandY - sh * 0.48;
        rShaded(sx, sy, sw, sh * 0.75, primary, primaryHi, primaryDark);
        // Punta inferior del escudo en forma de cometa
        rShaded(sx + sw * 0.15, sy + sh * 0.70, sw * 0.70, sh * 0.30, primaryDark, primary, '#0F172A');
        // Borde y cruz heráldica
        r(sx + sw * 0.38, sy + pStep, sw * 0.24, sh * 0.78, trim);
        r(sx + pStep, sy + sh * 0.32, sw - pStep * 2, pStep * 1.4, trim);
      }
    } else if (heroClass === 'mago') {
      // Bastón arcano en la mano exterior con orbe cristalino
      const staffX = wx + (isAttack ? 2.0 * u : 0.4 * u);
      const staffTopY = wy - 11.5 * u;
      rShaded(staffX - 0.8 * u, staffTopY, 1.6 * u, 16.5 * u, leather, leatherHi, leatherDark);
      // Engaste dorado y gema arcana luminosa
      rShaded(staffX - 2.0 * u, staffTopY - 1.0 * u, 4.0 * u, 1.4 * u, trim, trimHi, leatherDark);
      rShaded(staffX - 2.2 * u, staffTopY - 4.2 * u, 4.4 * u, 3.4 * u, '#0284C7', '#38BDF8', '#0369A1');
      r(staffX - 1.0 * u, staffTopY - 3.4 * u, 2.0 * u, 1.8 * u, '#E0F2FE');
    } else {
      // Arco recurvo tallado + cuerda tensada
      const bowX = wx + (isAttack ? 1.8 * u : 0.4 * u);
      const bowTopY = wy - 7.5 * u;
      const bowH = 13.0 * u;
      // Cuerpo curvo del arco en 3 segmentos escalonados
      rShaded(bowX + 0.4 * u, bowTopY + bowH * 0.2, 1.6 * u, bowH * 0.6, leatherHi, trim, leatherDark);
      rShaded(bowX - 0.8 * u, bowTopY, 1.6 * u, bowH * 0.24, leather, leatherHi, leatherDark);
      rShaded(bowX - 0.8 * u, bowTopY + bowH * 0.76, 1.6 * u, bowH * 0.24, leather, leatherHi, leatherDark);
      // Cuerda del arco
      r(bowX - 1.0 * u, bowTopY + 1.0 * u, Math.max(1, Math.round(0.7 * u)), bowH - 2.0 * u, '#E2E8F0');
      if (isAttack) {
        // Flecha cargada lista para disparar
        rShaded(bowX - 1.0 * u, wy - 0.7 * u, 7.5 * u, 1.4 * u, '#F8FAFC', '#FEF08A', '#94A3B8');
      }
    }
  }

  ctx.restore();
}

/* =========================================================
   DIBUJO DETALLADO DEL HÉROE (MASCULINO O FEMENINO)
   ========================================================= */
export function drawDetailedHeroSprite(ctx, cx, cy, scale, state, time) {
  // 1) Priorizar la hoja 3x5 sin armadura (3 ángulos × 5 acciones) + capas modulares de armadura y arma
  const base3x5 = getBaseRace3x5Asset(state.race || 'Humano', state.gender || 'male');
  const heroImg = base3x5 || getHeroClassAsset(
    state.heroClass || 'guerrero',
    state.gender || 'male',
    state.faction || 'alba',
    state.race || 'Humano'
  );
  if (heroImg) {
    const s = scale * (state.race === 'Enano' ? 0.88 : 1);
    const dir = state.dir ?? 0;
    const facingLeft = dir === 3;
    const isMoving = Boolean(state.moving);
    const attackTimer = state.attackTimer || 0;
    const jumpTimer = state.jumpTimer || 0;
    const jumpHeight = state.jumpHeight || 0;
    const speedRatio = state.moveSpeedRatio || 1;
    const footY = cy + 16 * s;

    const metrics = getSpriteFrameMetrics(heroImg, 0, 0);
    let rowIndex = 0;
    let frameIndex = 0;

    if (metrics.isGrid3x5) {
      // Filas: 0 = frente, 1 = perfil (con flipX si es izquierda), 2 = espalda
      rowIndex = dir === 2 ? 2 : (dir === 1 || dir === 3) ? 1 : 0;
      // Columnas: 0 = idle, 1/2 = walk_1/walk_2, 3 = jump, 4 = attack
      if (attackTimer > 0.08) {
        frameIndex = 4;
      } else if (jumpTimer > 0) {
        frameIndex = 3;
      } else if (isMoving) {
        const walkRate = 7.5 + speedRatio * 3.5;
        frameIndex = Math.floor(time * walkRate) % 2 === 0 ? 1 : 2;
      } else {
        frameIndex = 0;
      }
    } else {
      const WALK_FRAMES_4 = [0, 1, 2, 3];
      if (attackTimer > 0.12) {
        frameIndex = 3;
      } else if (isMoving) {
        frameIndex = WALK_FRAMES_4[Math.floor(time * 10) % 4];
      }
    }

    // Movimiento al caminar anclado en footY SIN rotación ni bamboleo lateral ("tronquito"):
    const stepSin = Math.sin(time * (12 + speedRatio * 3));
    const stepBounce = isMoving && jumpTimer <= 0 ? Math.abs(stepSin) : 0;
    const stepBounceY = isMoving && jumpTimer <= 0
      ? -stepBounce * (metrics.isGrid3x5 || metrics.isFourFrameSheet ? 1.5 : 2.8) * s
      : 0;
    const idleBreathY = !isMoving && jumpTimer <= 0 ? Math.sin(time * 3.8) * 0.014 : 0;

    let scaleY = isMoving && jumpTimer <= 0 ? 0.97 + stepBounce * 0.06 : 1 + idleBreathY;
    let scaleX = isMoving && jumpTimer <= 0 ? 1.02 - stepBounce * 0.04 : 1 - idleBreathY * 0.4;

    // Animación de ataque en 3 fases (anticipación -> estocada/lunge -> retorno suave)
    const atkPhase = computeAttackPhase(attackTimer);
    const aimX = state.atkDirX !== undefined ? state.atkDirX : (facingLeft ? -1 : 1);
    const aimY = state.atkDirY !== undefined ? state.atkDirY : 0;
    const lungeDist = 9.5 * s;
    const lungeX = atkPhase.offset * aimX * lungeDist;
    const lungeY = atkPhase.offset * aimY * (lungeDist * 0.55);
    if (attackTimer > 0) {
      scaleX *= atkPhase.scaleX;
      scaleY *= atkPhase.scaleY;
    }

    // Sombra ovalada siempre anclada en el suelo bajo los pies (footY), encogiéndose durante el salto
    const jumpShadowScale = jumpHeight > 0 ? Math.max(0.55, 1 - jumpHeight / 55) : 1;
    const shadowSheet = getAsset('fx_sombra_entidad');
    if (shadowSheet) {
      const m = getSpriteFrameMetrics(shadowSheet, Math.min(3, frameIndex));
      const sRx = 12 * s * (1 - stepBounce * 0.08) * jumpShadowScale;
      const sRy = 5 * s * jumpShadowScale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.76 * jumpShadowScale;
      ctx.drawImage(
        shadowSheet,
        m.sx,
        m.sy,
        m.frameWidth,
        m.frameHeight,
        Math.round(cx + lungeX * 0.4 - sRx),
        Math.round(footY + lungeY * 0.4 - sRy),
        Math.round(sRx * 2),
        Math.round(sRy * 2)
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = `rgba(13, 10, 20, ${0.42 * jumpShadowScale})`;
      ctx.beginPath();
      ctx.ellipse(
        cx + lungeX * 0.4,
        footY + lungeY * 0.4,
        11 * s * (1 - stepBounce * 0.08) * jumpShadowScale,
        4.5 * s * jumpShadowScale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }

    const spriteFootX = cx + lungeX;
    const spriteFootY = footY + stepBounceY + lungeY - jumpHeight * s * 0.65;
    const cellAnchors = metrics.isGrid3x5 ? getGrid3x5CellAnchors(heroImg, rowIndex, frameIndex) : null;
    const estDrawH = 38 * s * scaleY;
    const estDrawW = 38 * s * metrics.aspect * scaleX;
    const wingOffsetX = cellAnchors ? (facingLeft ? -cellAnchors.torsoCx : cellAnchors.torsoCx) * estDrawW : 0;
    const wingOffsetY = cellAnchors ? (cellAnchors.torsoTopY + cellAnchors.torsoH * 0.28) * estDrawH : -21 * s;

    // Si está de frente o de perfil (rowIndex !== 2), dibujar las alas DETRÁS del cuerpo base
    if (state.wings && rowIndex !== 2) {
      drawAnchoredHeroWings(
        ctx,
        spriteFootX + wingOffsetX,
        spriteFootY + wingOffsetY,
        s,
        state.wings,
        time,
        rowIndex === 1,
        facingLeft
      );
    }

    const drawnMetrics = drawFootAnchoredSprite(
      ctx,
      heroImg,
      spriteFootX,
      spriteFootY,
      38 * s,
      {
        frameIndex,
        rowIndex,
        flipX: facingLeft,
        tiltRad: 0, // CERO bamboleo lateral tipo "tronquito"
        scaleX,
        scaleY
      }
    );

    // Si usamos la hoja base 3x5 sin armadura, renderizar las capas modulares de equipo y arma encima
    if (metrics.isGrid3x5) {
      drawHeroEquipmentLayers(ctx, spriteFootX, spriteFootY, s, state, {
        rowIndex,
        colIndex: frameIndex,
        flipX: facingLeft,
        drawW: drawnMetrics?.drawW || estDrawW,
        drawH: drawnMetrics?.drawH || estDrawH,
        anchors: cellAnchors
      });
    }

    // Si está de espaldas (rowIndex === 2), dibujar las alas ENCIMA de la espalda/armadura
    if (state.wings && rowIndex === 2) {
      drawAnchoredHeroWings(
        ctx,
        spriteFootX + wingOffsetX,
        spriteFootY + wingOffsetY,
        s,
        state.wings,
        time,
        false,
        facingLeft
      );
    }

    // Efecto visual de ataque contundente y animado frente al personaje ("Probar Ataque" y combate)
    if (attackTimer > 0) {
      const weaponSide = facingLeft ? -1 : 1;
      const p = atkPhase.progress;
      const aimAngle = state.atkDirX !== undefined
        ? Math.atan2(state.atkDirY || 0, state.atkDirX || weaponSide)
        : (facingLeft ? Math.PI : 0);

      ctx.save();
      if (state.heroClass === 'mago') {
        // Destello de báculo + orbe arcano con estela y anillo mágico
        const castX = cx + lungeX + Math.cos(aimAngle) * (10 * s);
        const castY = cy - 4 * s + lungeY + Math.sin(aimAngle) * (10 * s);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = Math.max(2, 2.2 * s);
        ctx.beginPath();
        ctx.arc(castX, castY, (6 + p * 8) * s, 0, Math.PI * 2);
        ctx.stroke();

        const orbDist = p * 32 * s;
        const ox = castX + Math.cos(aimAngle) * orbDist;
        const oy = castY + Math.sin(aimAngle) * orbDist;
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(ox, oy, 5.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E0F2FE';
        ctx.beginPath();
        ctx.arc(ox, oy, 2.8 * s, 0, Math.PI * 2);
        ctx.fill();
      } else if (state.heroClass === 'arquero') {
        // Cuerda tensándose + flecha veloz con estela dorada
        const bowX = cx + lungeX + Math.cos(aimAngle) * (9 * s);
        const bowY = cy - 3 * s + lungeY + Math.sin(aimAngle) * (9 * s);
        const arrowDist = Math.max(0, (p - 0.18) / 0.82) * 38 * s;
        const ax = bowX + Math.cos(aimAngle) * arrowDist;
        const ay = bowY + Math.sin(aimAngle) * arrowDist;

        ctx.translate(ax, ay);
        ctx.rotate(aimAngle);
        // Estela de velocidad
        ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
        ctx.fillRect(Math.round(-16 * s), Math.round(-1.2 * s), Math.round(14 * s), Math.round(2.4 * s));
        // Cuerpo y punta de la flecha
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(Math.round(-5 * s), Math.round(-1.3 * s), Math.round(10 * s), Math.round(2.6 * s));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(4 * s), Math.round(-2 * s), Math.round(3 * s), Math.round(4 * s));
      } else {
        // Guerrero: Arco de tajo de espada barrido dinámicamente con doble filo brillante
        const slashCenterX = cx + lungeX + Math.cos(aimAngle) * (8 * s);
        const slashCenterY = cy - 2 * s + lungeY + Math.sin(aimAngle) * (8 * s);
        const sweepStart = aimAngle - 1.15 + p * 0.45;
        const sweepEnd = aimAngle - 0.8 + p * 2.1;

        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = Math.max(3, 4.2 * (s / 1.5));
        ctx.beginPath();
        ctx.arc(slashCenterX, slashCenterY, 17 * s, sweepStart, sweepEnd);
        ctx.stroke();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(2, 2.2 * (s / 1.5));
        ctx.beginPath();
        ctx.arc(slashCenterX, slashCenterY, 14.5 * s, sweepStart + 0.1, sweepEnd);
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  if (state.gender === 'female') {
    drawDetailedFemaleSprite(ctx, cx, cy, scale, state, time);
    return;
  }

  const { faction, race, heroClass, dir = 0, attackTimer = 0 } = state;
  const s = scale;
  const breath = Math.sin(time * 4.5) * 0.5;
  const isAlba = faction === 'alba';
  const primary = isAlba ? '#1E4E8C' : '#9E2A2B';
  const primaryDark = isAlba ? '#153663' : '#731C1D';
  const secondary = isAlba ? '#E2E8F0' : '#C97A32';
  const accent = isAlba ? '#F2B63D' : '#D97706';

  let bodyW = 10;
  let bodyH = 10;
  let headYOff = 0;
  let skin = '#F2C9A0';
  let skinShade = '#D9AA7E';
  let hair = '#3B2314';

  if (race === 'Elfo') { bodyW = 9; bodyH = 11; headYOff = -1.5; skin = '#FDE4CF'; skinShade = '#E6C3A8'; hair = '#E2E8F0'; }
  else if (race === 'Enano') { bodyW = 12; bodyH = 8.5; headYOff = 2.5; skin = '#F2C19E'; skinShade = '#D89E78'; hair = '#B45309'; }
  else if (race === 'Orco') { bodyW = 13; bodyH = 11; headYOff = -1; skin = '#5D9349'; skinShade = '#426E32'; hair = '#1E1B2E'; }
  else if (race === 'Lobo Guerrero') { bodyW = 11; bodyH = 11; headYOff = -1; skin = '#64748B'; skinShade = '#475569'; hair = '#334155'; }
  else if (race === 'Nómada') { bodyW = 9.5; bodyH = 11; headYOff = -1; skin = '#D99B66'; skinShade = '#B87B49'; hair = '#1C1917'; }

  ctx.save();
  ctx.fillStyle = 'rgba(13, 10, 20, 0.44)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16 * s, (bodyW + 3) * s * 0.72, 4.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bY = cy - (bodyH * 0.5) * s + breath * s;
  const pRect = (ox, oy, ow, oh, col) => px(ctx, cx + ox * s, bY + oy * s, ow * s, oh * s, col);

  const facingBack = dir === 2;
  const facingRight = dir === 1;
  const facingLeft = dir === 3;
  const atkSwing = attackTimer > 0 ? Math.sin(attackTimer * Math.PI * 2.5) : 0;

  // Capa heroica con borde oscuro y pliegues
  if (!facingBack) {
    pRect(-bodyW / 2 - 2, -0.5, bodyW + 4, bodyH + 4, '#141018');
    pRect(-bodyW / 2 - 1, 0, bodyW + 2, bodyH + 3, primaryDark);
  }

  // Piernas y Grebas / Botas metálicas con relieve
  pRect(-bodyW / 2 + 0.5, bodyH - 0.5, 4.2, 7.2, '#141018');
  pRect(bodyW / 2 - 4.7, bodyH - 0.5, 4.2, 7.2, '#141018');
  const bootCol = heroClass === 'guerrero' ? '#94A3B8' : '#5C3A21';
  const bootHi = heroClass === 'guerrero' ? '#E2E8F0' : '#784A2A';
  pRect(-bodyW / 2 + 1, bodyH, 3.2, 6.2, bootCol);
  pRect(bodyW / 2 - 4.2, bodyH, 3.2, 6.2, bootCol);
  pRect(-bodyW / 2 + 1, bodyH, 1.4, 5.5, bootHi);
  pRect(bodyW / 2 - 4.2, bodyH, 1.4, 5.5, bootHi);

  // Torso / Peto con contorno oscuro #141018 y 3 tonos de sombreado
  pRect(-bodyW / 2 - 1.5, -1.5, bodyW + 3, bodyH + 2.5, '#141018');
  pRect(-bodyW / 2 - 0.5, -0.5, bodyW + 1, bodyH + 0.8, primary);
  if (heroClass === 'guerrero') {
    // Coraza de placas plateada y azul/roja con tabardo
    pRect(-bodyW / 2 + 0.5, 0, bodyW - 1, bodyH * 0.55, '#94A3B8');
    pRect(-bodyW / 2 + 1, 0.5, bodyW - 3, 2, '#E2E8F0');
    pRect(-1.8, 1.5, 3.6, bodyH - 1, primary);
    pRect(-0.8, 1.5, 1.6, bodyH - 1, accent);
    // Hombreras biseladas
    pRect(-bodyW / 2 - 3, -2, 3.8, 4.5, '#141018');
    pRect(bodyW / 2 - 0.8, -2, 3.8, 4.5, '#141018');
    pRect(-bodyW / 2 - 2.3, -1.3, 2.6, 3.2, '#CBD5E1');
    pRect(bodyW / 2 - 0.3, -1.3, 2.6, 3.2, '#CBD5E1');
    pRect(-bodyW / 2 - 2.3, -1.3, 2.6, 1, accent);
    pRect(bodyW / 2 - 0.3, -1.3, 2.6, 1, accent);
  } else if (heroClass === 'mago') {
    pRect(-2, 0, 4, bodyH, primaryDark);
    pRect(-1, 0, 2, bodyH, accent);
    pRect(-bodyW / 2 - 2, -1.2, 3, 3.5, accent);
    pRect(bodyW / 2 - 1, -1.2, 3, 3.5, accent);
  } else {
    // Arquero: Cota de cuero tachonado y capa verde bosque
    pRect(-bodyW / 2 + 0.5, 0, bodyW - 1, bodyH - 1, '#78350F');
    pRect(-bodyW / 2 + 1, 0.5, bodyW - 2, 2.5, '#166534');
    pRect(-1, 0.5, 2, bodyH - 2, accent);
  }
  // Cinturón con hebilla dorada
  pRect(-bodyW / 2, bodyH - 2.8, bodyW, 2, '#3B2314');
  pRect(-1.4, bodyH - 2.8, 2.8, 2, accent);

  if (facingBack) {
    pRect(-bodyW / 2 - 1, -0.5, bodyW + 2, bodyH + 3.5, primaryDark);
    pRect(-bodyW / 2 + 1, 1.5, bodyW - 2, 2, accent);
  }

  // Cabeza y cabello/casco 16-bit
  const hY = -9.5 + headYOff;
  pRect(-5.2, hY - 1.2, 10.4, 9.4, '#141018');
  pRect(-4.2, hY, 8.4, 7.2, skin);
  pRect(-4.2, hY + 5.2, 8.4, 2, skinShade);

  if (race === 'Elfo') { pRect(-7.2, hY + 2, 3, 2, skin); pRect(4.2, hY + 2, 3, 2, skin); }
  if (race === 'Lobo Guerrero') {
    pRect(-4.2, hY - 3.2, 2.6, 3.2, '#475569'); pRect(1.6, hY - 3.2, 2.6, 3.2, '#475569');
    if (!facingBack) pRect(-2.2, hY + 4, 4.4, 2.6, '#94A3B8');
  }
  if (race === 'Enano' && !facingBack) {
    pRect(-4.8, hY + 4, 9.6, 5.5, '#92400E');
    pRect(-3, hY + 8, 6, 2.5, '#B45309');
    pRect(-1.2, hY + 6, 2.4, 1.2, accent);
  }
  if (race === 'Orco' && !facingBack) { pRect(-3.2, hY + 5, 1.6, 2.2, '#FFFFFF'); pRect(1.6, hY + 5, 1.6, 2.2, '#FFFFFF'); }
  if (race === 'Nómada') { pRect(-5, hY - 1, 10, 3, '#78350F'); if (!facingBack) pRect(-4.2, hY + 4.5, 8.4, 2.6, primary); }

  if (heroClass === 'guerrero') {
    // Cabello o yelmo con diadema dorada
    pRect(-5, hY - 2, 10, 3.2, hair);
    pRect(-4.5, hY - 0.2, 9, 1.4, '#CBD5E1');
    pRect(-1.2, hY - 1.2, 2.4, 2.2, accent);
  } else if (heroClass === 'mago') {
    pRect(-6.5, hY - 1.5, 13, 2.5, primary);
    pRect(-3.8, hY - 6.5, 7.6, 5.2, primary);
    pRect(-5, hY - 1, 10, 1.5, accent);
  } else {
    pRect(-5, hY - 2, 10, 3, '#166534');
    pRect(2, hY - 4.5, 2, 3, accent);
  }

  if (!facingBack) {
    const eyeShift = facingRight ? 1.4 : facingLeft ? -1.4 : 0;
    const eyeColor = race === 'Lobo Guerrero' ? '#FACC15' : '#141018';
    pRect(-3.2 + eyeShift, hY + 1.6, 2.2, 0.8, hair);
    pRect(1.0 + eyeShift, hY + 1.6, 2.2, 0.8, hair);
    pRect(-2.7 + eyeShift, hY + 2.4, 1.8, 1.9, eyeColor);
    pRect(1.1 + eyeShift, hY + 2.4, 1.8, 1.9, eyeColor);
    pRect(-2.5 + eyeShift, hY + 2.5, 0.7, 0.7, '#FFFFFF');
    pRect(1.3 + eyeShift, hY + 2.5, 0.7, 0.7, '#FFFFFF');
  }

  const weaponSide = facingLeft ? -1 : 1;
  const wx = weaponSide * (bodyW / 2 + 2.5);
  const swingOff = atkSwing * 5 * weaponSide;

  if (heroClass === 'guerrero') {
    pRect(wx - 1 + swingOff, -5 - Math.abs(atkSwing) * 4, 2.5, 12, '#E2E8F0');
    pRect(wx - 2.5 + swingOff, 4 - Math.abs(atkSwing) * 4, 5.5, 1.8, accent);
    const sx = -weaponSide * (bodyW / 2 + 3);
    pRect(sx - 2, 0, 5, 8, primary);
    pRect(sx - 1, 1.5, 3, 5, accent);
    if (attackTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + weaponSide * 10 * s, bY + 2 * s, 14 * s, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    }
  } else if (heroClass === 'mago') {
    pRect(wx - 0.8 + swingOff * 0.5, -7, 2, 18, '#78350F');
    pRect(wx - 2 + swingOff * 0.5, -10, 4.5, 4.5, '#38BDF8');
    if (attackTimer > 0) {
      const dist = (1 - attackTimer) * 28 * s;
      ctx.save();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(cx + weaponSide * (12 * s + dist), bY - 2 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(cx + weaponSide * (12 * s + dist), bY - 2 * s, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else {
    pRect(wx - 0.5, -4, 2, 13, '#92400E');
    pRect(wx + weaponSide * 1.5, -3, 1, 11, '#F4F6FA');
    if (attackTimer > 0) {
      const dist = (1 - attackTimer) * 34 * s;
      pRect(wx + weaponSide * (3 + dist / s), 1, 7, 1.5, '#FACC15');
    }
  }
}

export function drawCreatorPreviewCanvas(canvas, state, time) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

 const creacionBg = getAsset(state.faction === 'hierro' ? 'bg_creacion_hierro' : 'bg_creacion_alba') || getAsset('bg_creacion');
  if (creacionBg) {
    // Dibujar bg_creacion.png a pantalla completa y colocar al personaje y su mascota sobre el pedestal de piedra con un halo rúnico sutil
    ctx.drawImage(creacionBg, 0, 0, w, h);
    const pedX = w * 0.255;
  const pedY = state.faction === 'hierro' ? h * 0.725 : h * 0.675;

    drawDetailedHeroSprite(ctx, pedX - 18, pedY - 62, 4.1, state, time);
    drawPetSprite(ctx, 'lobo_blanco', pedX + 58, pedY - 12, 2.3, time);
    return;
  }

  drawCreatorBackdrop(ctx, w, h, state.faction, time);

  // Pedestal de piedra tallada al centro
  const pedX = w * 0.44;
  const pedY = h * 0.77;
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.ellipse(pedX, pedY + 12, 118, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.ellipse(pedX, pedY, 112, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D9A441';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Personaje ampliado sobre el pedestal + Mascota acompañante (Lobo Blanco)
  drawDetailedHeroSprite(ctx, pedX - 18, pedY - 62, 4.3, state, time);
  drawPetSprite(ctx, 'lobo_blanco', pedX + 56, pedY - 14, 2.3, time);
}

export function drawSlotCardCanvas(canvas, save, time) {
  if (!canvas || !save) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;
  drawCreatorBackdrop(ctx, w, h, save.faction, time);
  drawDetailedHeroSprite(
    ctx,
    w / 2,
    h * 0.64,
    2.7,
    {
      faction: save.faction,
      gender: save.gender || 'male',
      race: save.race,
      heroClass: save.heroClass,
      dir: 0,
      attackTimer: 0
    },
    time
  );
}

/* =========================================================
   ICONOS PIXEL ART 16-BIT PARA CREACIÓN COMPACTA (SVG CRISP)
   ========================================================= */
export function getPixelIconSvg(kind, { race = 'Humano', gender = 'male' } = {}) {
  const wrap = (inner, size = 44) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" class="pixel-icon-svg">${inner}</svg>`;

  if (kind === 'shield_alba') {
    // Escudo redondo azul con león dorado
    return wrap(`
      <rect x="4" y="1" width="8" height="14" fill="#D9A441"/>
      <rect x="2" y="3" width="12" height="10" fill="#D9A441"/>
      <rect x="1" y="4" width="14" height="8" fill="#D9A441"/>
      <rect x="4" y="2" width="8" height="12" fill="#1E4E8C"/>
      <rect x="2" y="4" width="12" height="8" fill="#1E4E8C"/>
      <!-- León dorado -->
      <rect x="5" y="4" width="6" height="5" fill="#FDE047"/>
      <rect x="4" y="5" width="8" height="3" fill="#D9A441"/>
      <rect x="6" y="5" width="4" height="4" fill="#FDE047"/>
      <rect x="6" y="6" width="1" height="1" fill="#1E4E8C"/>
      <rect x="9" y="6" width="1" height="1" fill="#1E4E8C"/>
      <rect x="6" y="9" width="4" height="3" fill="#D9A441"/>
      <rect x="7" y="10" width="2" height="2" fill="#FDE047"/>
    `);
  }

  if (kind === 'shield_hierro') {
    // Escudo redondo rojo/ocre con lobo de hierro
    return wrap(`
      <rect x="4" y="1" width="8" height="14" fill="#C97A32"/>
      <rect x="2" y="3" width="12" height="10" fill="#C97A32"/>
      <rect x="1" y="4" width="14" height="8" fill="#C97A32"/>
      <rect x="4" y="2" width="8" height="12" fill="#9E2A2B"/>
      <rect x="2" y="4" width="12" height="8" fill="#9E2A2B"/>
      <!-- Lobo de hierro -->
      <rect x="4" y="3" width="2" height="3" fill="#CBD5E1"/>
      <rect x="10" y="3" width="2" height="3" fill="#CBD5E1"/>
      <rect x="5" y="5" width="6" height="6" fill="#94A3B8"/>
      <rect x="6" y="6" width="4" height="5" fill="#CBD5E1"/>
      <rect x="6" y="7" width="1" height="1" fill="#FACC15"/>
      <rect x="9" y="7" width="1" height="1" fill="#FACC15"/>
      <rect x="7" y="9" width="2" height="2" fill="#1E293B"/>
    `);
  }

  if (kind === 'gender_male') {
    // Silueta masculina azul/acero
    return wrap(`
      <rect x="6" y="2" width="4" height="4" fill="#60A5FA"/>
      <rect x="4" y="6" width="8" height="5" fill="#3B82F6"/>
      <rect x="5" y="11" width="2" height="4" fill="#1E4E8C"/>
      <rect x="9" y="11" width="2" height="4" fill="#1E4E8C"/>
    `);
  }

  if (kind === 'gender_female') {
    // Silueta femenina dorada/naranja curvilínea con cabello largo
    return wrap(`
      <rect x="5" y="1" width="6" height="7" fill="#EA580C"/>
      <rect x="6" y="2" width="4" height="3" fill="#FDE047"/>
      <rect x="5" y="6" width="6" height="2" fill="#F59E0B"/>
      <rect x="6" y="8" width="4" height="2" fill="#FDE047"/>
      <rect x="4" y="10" width="8" height="3" fill="#F59E0B"/>
      <rect x="5" y="13" width="2" height="2" fill="#D97706"/>
      <rect x="9" y="13" width="2" height="2" fill="#D97706"/>
    `);
  }

  if (kind === 'class_guerrero') {
    const url = getSkillIconUrl('guerrero', 0);
    if (url) {
      return `<img src="${url}" width="44" height="44" class="pixel-icon-svg skill-art-img" style="image-rendering:pixelated;object-fit:contain" alt="" aria-hidden="true" />`;
    }
    // Fallback dos espadas cruzadas
    return wrap(`
      <rect x="2" y="2" width="2" height="2" fill="#F8FAFC"/>
      <rect x="4" y="4" width="2" height="2" fill="#E2E8F0"/>
      <rect x="6" y="6" width="4" height="4" fill="#CBD5E1"/>
      <rect x="10" y="10" width="2" height="2" fill="#D9A441"/>
      <rect x="12" y="12" width="2" height="2" fill="#92400E"/>
      <rect x="12" y="2" width="2" height="2" fill="#F8FAFC"/>
      <rect x="10" y="4" width="2" height="2" fill="#E2E8F0"/>
      <rect x="4" y="10" width="2" height="2" fill="#D9A441"/>
      <rect x="2" y="12" width="2" height="2" fill="#92400E"/>
      <rect x="3" y="9" width="3" height="1" fill="#FDE047"/>
      <rect x="10" y="9" width="3" height="1" fill="#FDE047"/>
    `);
  }

  if (kind === 'class_mago') {
    const url = getSkillIconUrl('mago', 0);
    if (url) {
      return `<img src="${url}" width="44" height="44" class="pixel-icon-svg skill-art-img" style="image-rendering:pixelated;object-fit:contain" alt="" aria-hidden="true" />`;
    }
    // Fallback báculo mágico brillante
    return wrap(`
      <rect x="7" y="6" width="2" height="9" fill="#92400E"/>
      <rect x="6" y="2" width="4" height="4" fill="#38BDF8"/>
      <rect x="7" y="3" width="2" height="2" fill="#E0F2FE"/>
      <rect x="5" y="5" width="6" height="1" fill="#D9A441"/>
      <rect x="4" y="2" width="1" height="1" fill="#BAE6FD"/>
      <rect x="11" y="2" width="1" height="1" fill="#BAE6FD"/>
      <rect x="7" y="0" width="2" height="1" fill="#7DD3FC"/>
    `);
  }

  if (kind === 'class_arquero') {
    const url = getSkillIconUrl('arquero', 0);
    if (url) {
      return `<img src="${url}" width="44" height="44" class="pixel-icon-svg skill-art-img" style="image-rendering:pixelated;object-fit:contain" alt="" aria-hidden="true" />`;
    }
    // Fallback arco con flecha
    return wrap(`
      <rect x="4" y="2" width="3" height="2" fill="#92400E"/>
      <rect x="3" y="4" width="2" height="8" fill="#B45309"/>
      <rect x="4" y="12" width="3" height="2" fill="#92400E"/>
      <rect x="6" y="3" width="1" height="10" fill="#F8FAFC"/>
      <rect x="5" y="7" width="8" height="2" fill="#D9A441"/>
      <rect x="12" y="6" width="2" height="4" fill="#FDE047"/>
      <rect x="14" y="7" width="1" height="2" fill="#FFFFFF"/>
    `);
  }

  if (kind === 'portrait') {
    const isFem = gender === 'female';
    let skin = '#F2C9A0';
    let hair = '#78350F';
    let extra = '';

    if (race === 'Humano') {
      skin = '#F5CEB0';
      hair = isFem ? '#B45309' : '#78350F';
      if (isFem) extra = '<rect x="3" y="4" width="2" height="9" fill="#B45309"/><rect x="11" y="4" width="2" height="9" fill="#B45309"/>';
    } else if (race === 'Elfo') {
      skin = '#FFE8D6';
      hair = isFem ? '#E2E8F0' : '#CBD5E1';
      extra = `<rect x="2" y="7" width="2" height="2" fill="${skin}"/><rect x="12" y="7" width="2" height="2" fill="${skin}"/>`;
      if (isFem) extra += '<rect x="3" y="4" width="2" height="9" fill="#E2E8F0"/><rect x="11" y="4" width="2" height="9" fill="#E2E8F0"/>';
    } else if (race === 'Enano') {
      skin = '#F4C6A4';
      hair = '#B45309';
      extra = isFem
        ? '<rect x="3" y="6" width="2" height="8" fill="#B45309"/><rect x="11" y="6" width="2" height="8" fill="#B45309"/><rect x="3" y="12" width="2" height="1" fill="#FDE047"/><rect x="11" y="12" width="2" height="1" fill="#FDE047"/>'
        : '<rect x="4" y="10" width="8" height="4" fill="#92400E"/><rect x="5" y="13" width="6" height="2" fill="#B45309"/>';
    } else if (race === 'Orco') {
      skin = '#5D9349';
      hair = '#1E1B2E';
      extra = '<rect x="5" y="11" width="1" height="2" fill="#FFFFFF"/><rect x="10" y="11" width="1" height="2" fill="#FFFFFF"/>';
      if (isFem) extra += '<rect x="6" y="0" width="4" height="3" fill="#1E1B2E"/>';
    } else if (race === 'Lobo Guerrero') {
      skin = '#64748B';
      hair = '#334155';
      extra = '<rect x="4" y="1" width="2" height="3" fill="#475569"/><rect x="10" y="1" width="2" height="3" fill="#475569"/><rect x="6" y="10" width="4" height="2" fill="#94A3B8"/>';
    } else if (race === 'Nómada') {
      skin = '#D99B66';
      hair = '#1C1917';
      extra = isFem
        ? '<rect x="4" y="3" width="8" height="2" fill="#D9A441"/><rect x="3" y="5" width="2" height="8" fill="#1C1917"/><rect x="11" y="5" width="2" height="8" fill="#1C1917"/>'
        : '<rect x="4" y="10" width="8" height="3" fill="#C97A32"/>';
    }

    const eyeCol = race === 'Lobo Guerrero' ? '#FACC15' : '#0D0A14';
    return wrap(`
      <rect x="4" y="3" width="8" height="10" fill="#0D0A14"/>
      <rect x="5" y="4" width="6" height="8" fill="${skin}"/>
      <rect x="4" y="3" width="8" height="3" fill="${hair}"/>
      ${extra}
      <rect x="6" y="7" width="1" height="2" fill="${eyeCol}"/>
      <rect x="9" y="7" width="1" height="2" fill="${eyeCol}"/>
    `);
  }

  return '';
}

/* =========================================================
   ICONOS PIXEL ART DE HABILIDADES PARA BOTONES DE COMBATE
   ========================================================= */
export function getSkillIconSvg(heroClass, slot, size = 40) {
  const cls = heroClass || 'guerrero';
  const skillImgUrl = getSkillIconUrl(cls, slot);
  if (skillImgUrl) {
    return `<img src="${skillImgUrl}" width="${size}" height="${size}" draggable="false" class="pixel-icon-svg skill-art-img" style="image-rendering:pixelated;object-fit:contain" alt="" aria-hidden="true" />`;
  }

  const wrap = (inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" shape-rendering="crispEdges" class="pixel-icon-svg">${inner}</svg>`;

  if (slot === 0) {
    if (heroClass === 'mago') return getPixelIconSvg('class_mago');
    if (heroClass === 'arquero') return getPixelIconSvg('class_arquero');
    return getPixelIconSvg('class_guerrero');
  }

  if (heroClass === 'guerrero') {
    if (slot === 1) {
      // Corte Pesado
      return wrap('<rect x="2" y="10" width="10" height="2" fill="#FDE047"/><rect x="4" y="6" width="8" height="3" fill="#F8FAFC"/><rect x="10" y="3" width="3" height="4" fill="#D9A441"/>');
    }
    if (slot === 2) {
      // Grito de Escudo
      return wrap('<rect x="4" y="2" width="8" height="10" fill="#D9A441"/><rect x="5" y="3" width="6" height="8" fill="#1E4E8C"/><rect x="7" y="4" width="2" height="6" fill="#FDE047"/>');
    }
    // Embestida
    return wrap('<rect x="2" y="7" width="8" height="2" fill="#60A5FA"/><rect x="8" y="4" width="5" height="8" fill="#E2E8F0"/><rect x="12" y="6" width="2" height="4" fill="#FDE047"/>');
  }

  if (heroClass === 'mago') {
    if (slot === 1) {
      // Bola de Fuego
      return wrap('<rect x="4" y="4" width="8" height="8" fill="#EA580C"/><rect x="5" y="5" width="6" height="6" fill="#F97316"/><rect x="6" y="6" width="4" height="4" fill="#FEF08A"/>');
    }
    if (slot === 2) {
      // Escarcha
      return wrap('<rect x="7" y="2" width="2" height="12" fill="#38BDF8"/><rect x="2" y="7" width="12" height="2" fill="#38BDF8"/><rect x="5" y="5" width="6" height="6" fill="#BAE6FD"/>');
    }
    // Destello
    return wrap('<rect x="6" y="2" width="4" height="12" fill="#A855F7"/><rect x="2" y="6" width="12" height="4" fill="#C084FC"/><rect x="6" y="6" width="4" height="4" fill="#FFFFFF"/>');
  }

  // Arquero
  if (slot === 1) {
    // Doble Flecha
    return wrap('<rect x="2" y="4" width="10" height="2" fill="#FACC15"/><rect x="11" y="3" width="2" height="4" fill="#FFFFFF"/><rect x="2" y="10" width="10" height="2" fill="#FACC15"/><rect x="11" y="9" width="2" height="4" fill="#FFFFFF"/>');
  }
  if (slot === 2) {
    // Trampa de Raíces
    return wrap('<rect x="3" y="11" width="10" height="3" fill="#166534"/><rect x="4" y="6" width="2" height="6" fill="#22C55E"/><rect x="10" y="6" width="2" height="6" fill="#22C55E"/><rect x="7" y="4" width="2" height="8" fill="#4ADE80"/>');
  }
  // Lluvia de Flechas
  return wrap('<rect x="3" y="2" width="2" height="8" fill="#EAB308"/><rect x="7" y="4" width="2" height="8" fill="#FDE047"/><rect x="11" y="2" width="2" height="8" fill="#EAB308"/><rect x="2" y="10" width="4" height="2" fill="#FFFFFF"/><rect x="6" y="12" width="4" height="2" fill="#FFFFFF"/><rect x="10" y="10" width="4" height="2" fill="#FFFFFF"/>');
}

/* =========================================================
   4 MASCOTAS ICÓNICAS 16-BIT (Lobo Blanco, Fantasma, Gato, Dragón)
   ========================================================= */
export function drawPetSprite(ctx, petId, cx, cy, scale, time, opts = {}) {
  const s = scale;
  const isAerial = petId === 'fantasma_hoz' || petId === 'gato_volador';
  const isMoving = Boolean(opts.moving);
  const facingLeft = opts.dirX !== undefined && opts.dirX < 0;
  const attackTimer = opts.attackTimer || 0;
  const footY = cy + 8 * s;
  const stepBounce = isMoving ? Math.abs(Math.sin(time * 15)) : 0;
  const bob = isAerial
    ? Math.sin(time * 5.8) * 1.9 * s - 2 * s
    : isMoving
    ? -stepBounce * 2.2 * s
    : 0;

  const atkPhase = computeAttackPhase(attackTimer);
  const atkDirX = opts.atkDirX !== undefined ? opts.atkDirX : (facingLeft ? -1 : 1);
  const atkDirY = opts.atkDirY !== undefined ? opts.atkDirY : 0;
  const lungeX = atkPhase.offset * atkDirX * 7 * s;
  const lungeY = atkPhase.offset * atkDirY * 4 * s;

  const x = cx + lungeX;
  const y = cy + bob + lungeY;
  const p = (ox, oy, ow, oh, col) => px(ctx, x + ox * s, y + oy * s, ow * s, oh * s, col);

  const shadowSheet = getAsset('fx_sombra_entidad');
  if (shadowSheet) {
    const sFrame = attackTimer > 0.15 ? 3 : isAerial ? 2 : isMoving ? Math.floor(time * 10) % 4 : 0;
    const m = getSpriteFrameMetrics(shadowSheet, sFrame);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = isAerial ? 0.58 : 0.72;
    ctx.drawImage(
      shadowSheet,
      m.sx,
      m.sy,
      m.frameWidth,
      m.frameHeight,
      Math.round(cx + lungeX * 0.4 - 10 * s),
      Math.round(footY + lungeY * 0.4 - 4 * s),
      Math.round(20 * s),
      Math.round(8 * s)
    );
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(13, 10, 20, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx + lungeX * 0.4, footY + lungeY * 0.4, 9 * s, 3.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Si el asset PNG de la mascota (mascota_lobo, mascota_fantasma, mascota_gato, mascota_dragon) está cargado y procesado con Flood-Fill:
  const petImg = getPetAsset(petId);
  if (petImg) {
    const WALK_FRAMES_4 = [0, 1, 2, 3];
    const frameIndex = attackTimer > 0.15 ? 3 : isMoving ? WALK_FRAMES_4[Math.floor(time * 10) % 4] : 0;
    let scaleY = isAerial ? 1 : isMoving ? 0.96 + stepBounce * 0.08 : 1 + Math.sin(time * 4) * 0.015;
    let scaleX = isAerial ? 1 : isMoving ? 1.03 - stepBounce * 0.05 : 1;
    if (attackTimer > 0) {
      scaleX *= atkPhase.scaleX;
      scaleY *= atkPhase.scaleY;
    }
    drawFootAnchoredSprite(ctx, petImg, x, footY + bob + lungeY, 22 * s, {
      frameIndex,
      flipX: facingLeft,
      tiltRad: 0, // CERO rotación de péndulo al caminar
      scaleX,
      scaleY
    });
    return;
  }

  if (petId === 'fantasma_hoz') {
    ctx.save();
    ctx.fillStyle = 'rgba(147, 51, 234, 0.28)';
    ctx.beginPath();
    ctx.arc(x, y - 2 * s, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Túnica espectral con contorno oscuro #141018 y pliegues
    p(-6, -10, 12, 16, '#141018');
    p(-5, -9, 10, 13, '#312E81');
    p(-4, -8, 8, 10, '#4338CA');
    p(-3, -6, 6, 5, '#090612');
    p(-2, -4.5, 1.5, 1.5, '#F0ABFC');
    p(1, -4.5, 1.5, 1.5, '#F0ABFC');
    // Gran Hoz de luna
    p(5, -11, 2, 18, '#78350F');
    p(0, -13, 9, 3, '#141018');
    p(1, -12, 7, 2, '#E2E8F0');
    p(6, -11, 3, 4, '#CBD5E1');
  } else if (petId === 'gato_volador') {
    const flap = Math.sin(time * 13) * 1.8;
    // Alas emplumadas blancas con borde oscuro
    p(-14, -7 + flap, 9, 6, '#141018');
    p(-13, -6 + flap, 7, 4, '#F8FAFC');
    p(-11, -5 + flap, 5, 2, '#BAE6FD');
    p(5, -7 - flap, 9, 6, '#141018');
    p(6, -6 - flap, 7, 4, '#F8FAFC');
    p(6, -5 - flap, 5, 2, '#BAE6FD');
    // Cuerpo atigrado regordete
    p(-6, -7, 12, 12, '#141018');
    p(-5, -6, 10, 10, '#D6B898');
    p(-4, -3, 8, 2, '#A68362');
    p(-3, 0, 6, 4, '#F5ECE0');
    // Orejas
    p(-5, -10, 3.5, 3.5, '#141018');
    p(1.5, -10, 3.5, 3.5, '#141018');
    p(-4.2, -9, 2, 2, '#F472B6');
    p(2.2, -9, 2, 2, '#F472B6');
    // Ojos verdes esmeralda y nariz rosada
    p(-3, -4.5, 1.8, 1.8, '#15803D');
    p(1.4, -4.5, 1.8, 1.8, '#15803D');
    p(-0.8, -2.5, 1.6, 1.2, '#F472B6');
  } else if (petId === 'dragon_negro') {
    const flap = Math.sin(time * 10) * 2;
    // Alas de dragón negras con membrana carmesí
    p(-15, -9 + flap, 10, 8, '#141018');
    p(-14, -8 + flap, 8, 6, '#7F1D1D');
    p(-12, -7 + flap, 6, 4, '#DC2626');
    p(5, -9 - flap, 10, 8, '#141018');
    p(6, -8 - flap, 8, 6, '#7F1D1D');
    p(6, -7 - flap, 6, 4, '#DC2626');
    // Cuerpo escamoso rojo y pecho negro
    p(-6, -7, 12, 13, '#141018');
    p(-5, -6, 10, 11, '#B91C1C');
    p(-3, -4, 6, 8, '#292524');
    // Cabeza y cuernos de obsidiana
    p(-5, -12, 10, 6, '#141018');
    p(-4, -11, 8, 5, '#DC2626');
    p(-6, -15, 2.5, 4, '#57534E');
    p(3.5, -15, 2.5, 4, '#57534E');
    p(-2.5, -9, 1.8, 1.6, '#FACC15');
    p(1, -9, 1.8, 1.6, '#FACC15');
  } else {
    // Lobo Blanco de las nieves detallado (con patas, pelaje de 3 tonos, orejas, hocico y cola)
    // Contorno cuerpo y cabeza
    p(-9, -4, 17, 9, '#141018');
    p(-9, -10, 9, 8, '#141018');
    // Patas
    p(-7, 4, 3, 4.5, '#141018');
    p(-3, 4, 3, 4.5, '#141018');
    p(2, 4, 3, 4.5, '#141018');
    p(5, 4, 3, 4.5, '#141018');
    p(-6.3, 4, 1.8, 3.8, '#E2E8F0');
    p(-2.3, 4, 1.8, 3.8, '#CBD5E1');
    p(2.7, 4, 1.8, 3.8, '#E2E8F0');
    p(5.7, 4, 1.8, 3.8, '#CBD5E1');
    // Cuerpo y melena blanca/plateada
    p(-8, -3, 15, 7, '#E2E8F0');
    p(-7, -3, 13, 4.5, '#FFFFFF');
    p(-8, -5, 8, 5, '#F8FAFC'); // melena del cuello
    // Cola tupida
    p(7, -5, 5, 4, '#141018');
    p(7.5, -4.3, 3.8, 2.8, '#F1F5F9');
    // Cabeza, orejas y hocico
    p(-8, -9, 7, 6, '#FFFFFF');
    p(-8.5, -12, 2.6, 3.5, '#141018');
    p(-3.8, -12, 2.6, 3.5, '#141018');
    p(-7.8, -11, 1.5, 2.4, '#CBD5E1');
    p(-3.1, -11, 1.5, 2.4, '#CBD5E1');
    // Hocico hacia adelante y ojos azules
    p(-10.5, -6.5, 3.5, 3, '#141018');
    p(-9.8, -6, 2.8, 2, '#F1F5F9');
    p(-10.2, -6, 1.2, 1.2, '#0F172A'); // trufa/nariz
    p(-6.8, -7.2, 1.6, 1.6, '#0284C7');
    p(-3.8, -7.2, 1.6, 1.6, '#0284C7');
  }
}

/* =========================================================
   ESCENARIO DE SELECCIÓN DE PERSONAJES EN SEMICÍRCULO (16:9)
   ========================================================= */
export function drawCampScene(canvas, slotsMap, selectedKey, time) {
  if (!canvas) return [];
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  const campBg = getAsset('bg_campamento');
  if (campBg) {
    // Dibujar bg_campamento.png nítido a pantalla completa y añadir únicamente un halo radial suave y chispas finas (sin bloques opacos que tapen la fogata ilustrada)
    ctx.drawImage(campBg, 0, 0, w, h);

    const fx = w * 0.502;
    const fy = h * 0.75;
    const glow = 0.16 + Math.sin(time * 7) * 0.05;
    ctx.save();
    const grad = ctx.createRadialGradient(fx, fy - 10, 6, fx, fy - 10, 110);
    grad.addColorStop(0, `rgba(253, 224, 71, ${glow * 0.9})`);
    grad.addColorStop(0.45, `rgba(249, 115, 22, ${glow * 0.55})`);
    grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(fx, fy - 10, 110, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      const spY = ((time * 38 + i * 19) % 75);
      const spX = Math.sin(time * 4.5 + i * 1.9) * 16;
      px(ctx, fx + spX - 1, fy - 24 - spY, 2, 2, i % 2 === 0 ? '#FEF08A' : '#FB923C');
    }
    ctx.restore();
  } else {
    // Fallback procedural: Cielo nocturno estrellado de Valoria
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.56);
    sky.addColorStop(0, '#0B132B');
    sky.addColorStop(1, '#1E3A5F');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.56);

    // Estrellas
    ctx.fillStyle = '#F8FAFC';
    for (let i = 0; i < 28; i++) {
      const sx = (i * 97) % w;
      const sy = 16 + ((i * 53) % Math.floor(h * 0.35));
      if (Math.sin(time * 2 + i) > -0.3) ctx.fillRect(sx, sy, 2, 2);
    }

    // Montañas y pinos al fondo
    ctx.fillStyle = '#172A45';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.56);
    ctx.lineTo(w * 0.25, h * 0.34);
    ctx.lineTo(w * 0.5, h * 0.48);
    ctx.lineTo(w * 0.78, h * 0.32);
    ctx.lineTo(w, h * 0.56);
    ctx.closePath();
    ctx.fill();

    // Suelo de campamento texturizado
    ctx.fillStyle = '#254C2E';
    ctx.fillRect(0, h * 0.54, w, h * 0.46);
    // Claro de tierra alrededor de la fogata
    ctx.fillStyle = '#7A5434';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.78, w * 0.38, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tronco a la izquierda para personaje sentado
    px(ctx, w * 0.14, h * 0.67, 130, 24, '#5C3A21');
    px(ctx, w * 0.14, h * 0.67, 130, 6, '#78350F');

    // Fogata central animada
    const fx = w * 0.5;
    const fy = h * 0.73;
    const glow = 0.26 + Math.sin(time * 7) * 0.07;
    ctx.fillStyle = `rgba(249, 115, 22, ${glow})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 95, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, fx - 24, fy + 8, 48, 12, '#475569');
    const fl = Math.sin(time * 18) * 5;
    px(ctx, fx - 14, fy - 24 - fl * 0.4, 28, 34, '#EA580C');
    px(ctx, fx - 8, fy - 34 - fl, 16, 30, '#FACC15');
    px(ctx, fx - 4, fy - 20, 8, 16, '#FEF9C3');
  }

  // Posiciones en semicírculo alrededor de la fogata (3 espacios bien distribuidos)
  const spots = [
    { key: 'slot_1', x: w * 0.23, y: h * 0.63 },
    { key: 'slot_2', x: w * 0.37, y: h * 0.72 },
    { key: 'slot_3', x: w * 0.67, y: h * 0.69 }
  ];

  const hitboxes = [];

  for (const sp of spots) {
    const rec = slotsMap[sp.key];
    const isSel = selectedKey === sp.key;

    if (rec?.saveData) {
      const s = rec.saveData;
      const heroScale = 3.2;
      const footY = sp.y + 16 * heroScale;

      // Aro dorado luminoso exactamente en la base de los pies del personaje seleccionado
      if (isSel) {
        const pulse = 0.8 + Math.sin(time * 5) * 0.2;
        ctx.save();
        ctx.fillStyle = `rgba(253, 224, 71, ${0.18 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(sp.x, footY, 44, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      drawDetailedHeroSprite(
        ctx,
        sp.x,
        sp.y,
        heroScale,
        {
          faction: s.faction,
          gender: s.gender || 'male',
          race: s.race,
          heroClass: s.heroClass,
          wings: s.gearSlots?.alas || null,
          dir: sp.x > w * 0.5 ? 3 : 1,
          attackTimer: 0
        },
        time
      );

      if (s.activePet) {
        const petOffsetX = sp.x > w * 0.5 ? -46 : 44;
        drawPetSprite(ctx, s.activePet, sp.x + petOffsetX, sp.y + 36, 1.75, time, {
          dirX: sp.x > w * 0.5 ? -1 : 1
        });
      }

      // Placa flotante limpia sobre la cabeza del personaje (sin encimarse con el casco/cabello)
      const labelY = sp.y - 82;
      ctx.font = 'bold 13px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      const nameLabel = `${s.name} · Nv.${s.level || 1}`;
      const tw = Math.ceil(ctx.measureText(nameLabel).width) + 14;
      px(ctx, sp.x - tw / 2 - 1, labelY - 13, tw + 2, 18, '#0A0D12');
      px(ctx, sp.x - tw / 2, labelY - 12, tw, 16, isSel ? '#2A2112' : '#161C28');
      px(ctx, sp.x - tw / 2, labelY - 12, tw, 2, isSel ? '#FDE047' : '#64748B');
      ctx.fillStyle = '#0D0A14';
      ctx.fillText(nameLabel, sp.x + 1, labelY + 1);
      ctx.fillStyle = isSel ? '#FDE047' : '#F8FAFC';
      ctx.fillText(nameLabel, sp.x, labelY);

      hitboxes.push({ type: 'select', key: sp.key, x: sp.x - 54, y: sp.y - 90, w: 108, h: 152 });
    } else {
      // Ranura vacía con símbolo "+" brillante
      const pulse = 0.65 + Math.sin(time * 4) * 0.25;
      ctx.save();
      ctx.fillStyle = `rgba(253, 224, 71, ${pulse * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 42, 42, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 30px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FDE047';
      ctx.fillText('+', sp.x, sp.y + 50);
      ctx.restore();

      hitboxes.push({ type: 'create', key: sp.key, x: sp.x - 46, y: sp.y, w: 92, h: 74 });
    }
  }

  return hitboxes;
}

/* =========================================================
   MAPA ILUSTRADO DE VALORIA (PIXEL ART 16-BIT CON COSTAS, BIOMAS Y VIAJE RÁPIDO)
   ========================================================= */
export function drawIllustratedWorldMap(canvas, mapsMeta, player, selectedMapId, time) {
  if (!canvas) return [];
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  const mapImg = getAsset('mapa_valoria');
  if (mapImg) {
    // Dibujar mapa_valoria.png limpio a pantalla completa del canvas del mapa
    ctx.drawImage(mapImg, 0, 0, w, h);
  } else {
    // Fallback procedural: Océano profundo con franjas y olas pixel art animadas
    ctx.fillStyle = '#093567';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      if ((y / 16) % 2 === 0) px(ctx, 0, y, w, 8, '#0B3E78');
    }
    for (let i = 0; i < 28; i++) {
      const wx = Math.round((i * 79 + time * 9) % (w - 30));
      const wy = Math.round(14 + ((i * 43) % (h - 28)));
      px(ctx, wx, wy, 16, 2, '#38BDF8');
      px(ctx, wx + 4, wy + 2, 8, 2, '#BAE6FD');
    }

    // Silueta irregular pixel-art del continente de Valoria (bloque a bloque de 6px)
    const coastBlocks = [
      [100, 126, 560, 110],
      [82, 142, 596, 84],
      [126, 98, 510, 162],
      [164, 74, 444, 206],
      [220, 56, 336, 236],
      [270, 44, 210, 250],
      [430, 62, 230, 216],
      [468, 170, 206, 124],
      [150, 210, 260, 74]
    ];

    for (const [bx, by, bw, bh] of coastBlocks) {
      px(ctx, bx - 10, by - 10, bw + 20, bh + 20, '#1D6FA5');
    }
    for (const [bx, by, bw, bh] of coastBlocks) {
      px(ctx, bx - 5, by - 5, bw + 10, bh + 10, '#D9B382');
    }
    for (const [bx, by, bw, bh] of coastBlocks) {
      px(ctx, bx, by, bw, bh, '#2E6F34');
    }
    px(ctx, 108, 128, 240, 102, '#3B853F');
    px(ctx, 142, 106, 210, 134, '#347A38');
    px(ctx, 355, 192, 130, 82, '#2B223C');
    px(ctx, 370, 204, 102, 62, '#3B2854');
    px(ctx, 492, 174, 172, 110, '#574C44');
    px(ctx, 506, 184, 146, 90, '#6E5A4F');
    px(ctx, 540, 202, 68, 38, '#291D1A');
    px(ctx, 550, 210, 48, 22, '#EA580C');
    px(ctx, 560, 215, 28, 12, '#FEF08A');
    px(ctx, 496, 68, 168, 104, '#CBD5E1');
    px(ctx, 510, 78, 140, 84, '#E2E8F0');
    [[525, 86], [562, 76], [602, 88], [546, 114], [590, 116]].forEach(([mx, my]) => {
      px(ctx, mx, my, 28, 20, '#64748B');
      px(ctx, mx + 4, my - 8, 20, 12, '#94A3B8');
      px(ctx, mx + 8, my - 14, 12, 10, '#FFFFFF');
    });
    px(ctx, 326, 48, 152, 84, '#1F1137');
    px(ctx, 340, 56, 124, 68, '#3B1464');
    px(ctx, 376, 40, 14, 34, '#141018');
    px(ctx, 392, 30, 18, 44, '#141018');
    px(ctx, 412, 40, 14, 34, '#141018');
    px(ctx, 397, 36, 8, 14, '#C084FC');
    [
      [136, 140], [164, 134], [218, 122], [248, 114], [272, 128],
      [302, 118], [236, 174], [268, 182], [312, 168], [186, 212]
    ].forEach(([tx, ty]) => {
      px(ctx, tx, ty + 6, 12, 6, '#14532D');
      px(ctx, tx + 2, ty, 8, 8, '#22C55E');
    });
    px(ctx, 126, 166, 26, 20, '#94A3B8');
    px(ctx, 124, 158, 10, 10, '#1E4E8C');
    px(ctx, 144, 158, 10, 10, '#1E4E8C');
    px(ctx, 134, 162, 10, 8, '#F2B63D');
  }

  const ordered = Object.values(mapsMeta).sort((a, b) => a.order - b.order);
  if (!mapImg) {
    for (let i = 0; i < ordered.length - 1; i++) {
      const a = ordered[i];
      const b = ordered[i + 1];
      const x1 = a.mapX * w;
      const y1 = a.mapY * h;
      const x2 = b.mapX * w;
      const y2 = b.mapY * h;
      const steps = 16;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const sx = x1 + (x2 - x1) * t;
        const sy = y1 + (y2 - y1) * t;
        px(ctx, sx - 4, sy - 4, 8, 8, '#141018');
        px(ctx, sx - 3, sy - 3, 6, 6, '#E5C27A');
      }
    }
  }

  // Nodos de las 6 zonas con iconos Pixel Art reales (sin emojis)
  const nodes = [];
  for (const m of ordered) {
    const mx = Math.round(m.mapX * w);
    const my = Math.round(m.mapY * h);
    const locked = player.level < m.reqLevel;
    const visited = player.visitedMaps.includes(m.id) || !locked;
    const isCurrent = player.currentMap === m.id;
    const isSel = selectedMapId === m.id;

    // Marco cuadrado biselado 16-bit para cada nodo de región
    const r = isSel ? 15 : 12;
    px(ctx, mx - r - 2, my - r - 2, (r + 2) * 2, (r + 2) * 2, '#141018');
    px(ctx, mx - r, my - r, r * 2, r * 2, isSel ? '#F2B63D' : isCurrent ? '#FFFFFF' : '#7C8DA6');
    px(ctx, mx - r + 3, my - r + 3, (r - 3) * 2, (r - 3) * 2, visited ? m.color : '#334155');
    if (isCurrent) {
      px(ctx, mx - 4, my - 4, 8, 8, '#FEF08A');
    }

    // Icono Pixel Art de Corona (jefe derrotado) o Calavera (jefe pendiente)
    if (m.bossId) {
      const defeated = player.defeatedBosses.includes(m.bossId);
      drawCanvasPixelBadge(ctx, defeated ? 'crown' : 'skull', mx + 22, my - 10, 1.3);
    }
    if (locked) {
      drawCanvasPixelBadge(ctx, 'lock', mx - 22, my - 10, 1.3);
    }

    // Placa estilo madera/hierro 16-bit con el nombre de cada región del continente
    ctx.font = 'bold 12px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    const label = `${m.order}. ${m.name}`;
    const tw = Math.ceil(ctx.measureText(label).width) + 14;
    px(ctx, mx - tw / 2 - 1, my + 17, tw + 2, 20, '#0A0D12');
    px(ctx, mx - tw / 2, my + 18, tw, 18, isSel ? '#6E4726' : '#4E331B');
    px(ctx, mx - tw / 2, my + 18, tw, 2, isSel ? '#F2B63D' : '#8C6239');
    ctx.fillStyle = '#000000';
    ctx.fillText(label, mx + 1, my + 32);
    ctx.fillStyle = isSel ? '#FDE047' : '#F8FAFC';
    ctx.fillText(label, mx, my + 31);

    nodes.push({ id: m.id, x: mx - 58, y: my - 30, w: 116, h: 74 });
  }

  return nodes;
}
