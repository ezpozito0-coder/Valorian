/**
 * Renderizador 16-bit para:
 * 1. Fondo animado de Valoria en la Pantalla de Inicio (Alba + Hierro + Vacío).
 * 2. Vista previa ampliada del Héroe en Creación (Masculino y Femenino, 6 razas, 4 direcciones, ataque).
 * 3. Miniaturas animadas en el Selector de 3 Personajes.
 */

import { getTexturePattern } from './textures.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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

/* =========================================================
   DIBUJO DETALLADO DEL HÉROE (MASCULINO O FEMENINO)
   ========================================================= */
export function drawDetailedHeroSprite(ctx, cx, cy, scale, state, time) {
  // Alas equipadas (Alas del Vacío moradas o alas de luz)
  if (state.wings) {
    const flap = Math.sin(time * 5) * 2.2 * scale;
    const isVoid = state.wings === 'alas_vacio';
    const outer = isVoid ? '#4C1D95' : '#CBD5E1';
    const mid = isVoid ? '#9333EA' : '#F8FAFC';
    const glow = isVoid ? '#F0ABFC' : '#FEF08A';
    ctx.save();
    if (isVoid) {
      ctx.fillStyle = 'rgba(147, 51, 234, 0.28)';
      ctx.beginPath();
      ctx.arc(cx, cy - 2 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ala izquierda y derecha
    px(ctx, cx - 17 * scale, cy - 12 * scale - flap, 11 * scale, 14 * scale, outer);
    px(ctx, cx - 15 * scale, cy - 10 * scale - flap, 8 * scale, 10 * scale, mid);
    px(ctx, cx - 13 * scale, cy - 8 * scale - flap, 4 * scale, 6 * scale, glow);
    px(ctx, cx + 6 * scale, cy - 12 * scale - flap, 11 * scale, 14 * scale, outer);
    px(ctx, cx + 7 * scale, cy - 10 * scale - flap, 8 * scale, 10 * scale, mid);
    px(ctx, cx + 9 * scale, cy - 8 * scale - flap, 4 * scale, 6 * scale, glow);
    ctx.restore();
  }

  if (state.gender === 'female') {
    drawDetailedFemaleSprite(ctx, cx, cy, scale, state, time);
    return;
  }

  const { faction, race, heroClass, dir = 0, attackTimer = 0 } = state;
  const s = scale;
  const breath = Math.sin(time * 4.5) * 0.6;
  const isAlba = faction === 'alba';
  const primary = isAlba ? '#1E4E8C' : '#9E2A2B';
  const secondary = isAlba ? '#F4F6FA' : '#C97A32';
  const accent = isAlba ? '#D9A441' : '#6E737B';

  let bodyW = 10;
  let bodyH = 10;
  let headYOff = 0;
  let skin = '#F2C9A0';

  if (race === 'Elfo') { bodyW = 8; bodyH = 12; headYOff = -2; skin = '#FDE4CF'; }
  else if (race === 'Enano') { bodyW = 12; bodyH = 8; headYOff = 3; skin = '#F2C19E'; }
  else if (race === 'Orco') { bodyW = 13; bodyH = 11; headYOff = -1; skin = '#5D9349'; }
  else if (race === 'Lobo Guerrero') { bodyW = 11; bodyH = 11; headYOff = -1; skin = '#64748B'; }
  else if (race === 'Nómada') { bodyW = 9; bodyH = 11; headYOff = -1; skin = '#D99B66'; }

  ctx.save();
  ctx.fillStyle = 'rgba(13, 10, 20, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16 * s, (bodyW + 3) * s * 0.7, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bY = cy - (bodyH * 0.5) * s + breath * s;
  const pRect = (ox, oy, ow, oh, col) => px(ctx, cx + ox * s, bY + oy * s, ow * s, oh * s, col);

  const facingBack = dir === 2;
  const facingRight = dir === 1;
  const facingLeft = dir === 3;
  const atkSwing = attackTimer > 0 ? Math.sin(attackTimer * Math.PI * 2.5) : 0;

  if (!facingBack) pRect(-bodyW / 2 - 1, 0, bodyW + 2, bodyH + 2, secondary);

  pRect(-bodyW / 2 + 1, bodyH, 3.5, 6, '#1E293B');
  pRect(bodyW / 2 - 4.5, bodyH, 3.5, 6, '#1E293B');

  pRect(-bodyW / 2 - 1, -1, bodyW + 2, bodyH + 2, '#0D0A14');
  pRect(-bodyW / 2, 0, bodyW, bodyH, primary);
  pRect(-bodyW / 2, bodyH - 3, bodyW, 2, accent);
  if (heroClass === 'mago') pRect(-1.5, 0, 3, bodyH, accent);
  else if (heroClass === 'arquero') pRect(-bodyW / 2 + 1, 1, bodyW - 2, 2, '#166534');

  if (facingBack) {
    pRect(-bodyW / 2 - 1, 0, bodyW + 2, bodyH + 3, secondary);
    pRect(-bodyW / 2 + 1, 2, bodyW - 2, 2, accent);
  }

  const hY = -9 + headYOff;
  pRect(-5, hY - 1, 10, 9, '#0D0A14');
  pRect(-4, hY, 8, 7, skin);

  if (race === 'Elfo') { pRect(-7, hY + 2, 3, 2, skin); pRect(4, hY + 2, 3, 2, skin); }
  if (race === 'Lobo Guerrero') {
    pRect(-4, hY - 3, 2.5, 3, '#475569'); pRect(1.5, hY - 3, 2.5, 3, '#475569');
    if (!facingBack) pRect(-2, hY + 4, 4, 2.5, '#94A3B8');
  }
  if (race === 'Enano' && !facingBack) { pRect(-4.5, hY + 4, 9, 5, '#92400E'); pRect(-2.5, hY + 8, 5, 2, '#B45309'); }
  if (race === 'Orco' && !facingBack) { pRect(-3, hY + 5, 1.5, 2, '#FFFFFF'); pRect(1.5, hY + 5, 1.5, 2, '#FFFFFF'); }
  if (race === 'Nómada') { pRect(-5, hY - 1, 10, 3, '#78350F'); if (!facingBack) pRect(-4, hY + 4.5, 8, 2.5, '#C97A32'); }

  if (heroClass === 'guerrero') { pRect(-5, hY - 2, 10, 3.5, '#CBD5E1'); pRect(-1, hY - 4, 2, 3, accent); }
  else if (heroClass === 'mago') { pRect(-6, hY - 1.5, 12, 2.5, primary); pRect(-3.5, hY - 6, 7, 5, primary); pRect(-5, hY - 1, 10, 1.5, accent); }
  else { pRect(-5, hY - 2, 10, 3, '#166534'); pRect(2, hY - 4.5, 2, 3, accent); }

  if (!facingBack) {
    const eyeShift = facingRight ? 1.5 : facingLeft ? -1.5 : 0;
    const eyeColor = race === 'Lobo Guerrero' ? '#FACC15' : '#0D0A14';
    pRect(-2.6 + eyeShift, hY + 2.3, 1.7, 1.8, eyeColor);
    pRect(1.0 + eyeShift, hY + 2.3, 1.7, 1.8, eyeColor);
    pRect(-2.4 + eyeShift, hY + 2.4, 0.65, 0.65, '#FFFFFF');
    pRect(1.2 + eyeShift, hY + 2.4, 0.65, 0.65, '#FFFFFF');
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
    // Dos espadas cruzadas
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
    // Báculo mágico brillante
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
    // Arco con flecha
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
export function getSkillIconSvg(heroClass, slot) {
  const wrap = (inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="28" height="28" shape-rendering="crispEdges" class="pixel-icon-svg">${inner}</svg>`;

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
export function drawPetSprite(ctx, petId, cx, cy, scale, time) {
  const s = scale;
  const bob = Math.sin(time * 7) * 1.4 * s;
  const x = cx;
  const y = cy + bob;
  const p = (ox, oy, ow, oh, col) => px(ctx, x + ox * s, y + oy * s, ow * s, oh * s, col);

  ctx.save();
  ctx.fillStyle = 'rgba(13, 10, 20, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7 * s, 8 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (petId === 'fantasma_hoz') {
    ctx.save();
    ctx.fillStyle = 'rgba(147, 51, 234, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y - 2 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    p(-5, -8, 10, 13, '#1E1B4B');
    p(-4, -7, 8, 10, '#312E81');
    p(-2, -5, 1.5, 1.5, '#E879F9');
    p(1, -5, 1.5, 1.5, '#E879F9');
    // Hoz
    p(5, -9, 1.5, 15, '#78350F');
    p(2, -10, 6, 2.5, '#CBD5E1');
  } else if (petId === 'gato_volador') {
    const flap = Math.sin(time * 14) * 2;
    p(-12, -5 + flap, 7, 4, '#FFFFFF');
    p(5, -5 - flap, 7, 4, '#FFFFFF');
    p(-5, -6, 10, 10, '#D6B898');
    p(-5, -9, 3, 3, '#A68362');
    p(2, -9, 3, 3, '#A68362');
    p(-3, -3, 1.5, 1.5, '#16A34A');
    p(1.5, -3, 1.5, 1.5, '#16A34A');
    p(-1, -1, 2, 1, '#F472B6');
  } else if (petId === 'dragon_negro') {
    const flap = Math.sin(time * 10) * 2;
    p(-13, -7 + flap, 8, 6, '#1C1917');
    p(-12, -6 + flap, 6, 4, '#991B1B');
    p(5, -7 - flap, 8, 6, '#1C1917');
    p(6, -6 - flap, 6, 4, '#991B1B');
    p(-5, -6, 10, 11, '#DC2626');
    p(-4, -10, 8, 5, '#991B1B');
    p(-5, -12, 2, 3, '#475569');
    p(3, -12, 2, 3, '#475569');
    p(-2, -8, 1.5, 1.5, '#FACC15');
    p(1, -8, 1.5, 1.5, '#FACC15');
  } else {
    // Lobo Blanco
    p(-7, -3, 14, 8, '#0D0A14');
    p(-6, -2, 12, 6, '#F1F5F9');
    p(-7, -7, 7, 6, '#FFFFFF');
    p(-7, -9, 2, 3, '#CBD5E1');
    p(-2, -9, 2, 3, '#CBD5E1');
    p(-5, -5, 1.5, 1.5, '#0284C7');
    p(5, -4, 4, 3, '#E2E8F0'); // cola
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

  // Cielo nocturno estrellado de Valoria
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

  // Posiciones en semicírculo (3 espacios + ranura "+")
  const spots = [
    { key: 'slot_1', x: w * 0.24, y: h * 0.63, anim: 'sit' },
    { key: 'slot_2', x: w * 0.37, y: h * 0.72, anim: 'idle' },
    { key: 'slot_3', x: w * 0.67, y: h * 0.70, anim: 'jump' }
  ];

  const hitboxes = [];

  for (const sp of spots) {
    const rec = slotsMap[sp.key];
    const isSel = selectedKey === sp.key;

    if (rec?.saveData) {
      const s = rec.saveData;
      // Aro dorado bajo el personaje seleccionado
      if (isSel) {
        ctx.save();
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 52, 46, 15, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(253, 224, 71, 0.2)';
        ctx.fill();
        ctx.restore();
      }

      const jumpOff = sp.anim === 'jump' ? -Math.abs(Math.sin(time * 4.5)) * 18 : 0;
      drawDetailedHeroSprite(
        ctx,
        sp.x,
        sp.y + jumpOff,
        3.2,
        {
          faction: s.faction,
          gender: s.gender || 'male',
          race: s.race,
          heroClass: s.heroClass,
          wings: s.gearSlots?.alas || null,
          dir: 0,
          attackTimer: 0
        },
        time
      );

      if (s.activePet) {
        drawPetSprite(ctx, s.activePet, sp.x + 42, sp.y + 34, 1.8, time);
      }

      // Nombre flotante
      ctx.font = 'bold 14px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0D0A14';
      ctx.fillText(s.name, sp.x + 1, sp.y - 54);
      ctx.fillStyle = isSel ? '#FDE047' : '#F8FAFC';
      ctx.fillText(s.name, sp.x, sp.y - 55);

      hitboxes.push({ type: 'select', key: sp.key, x: sp.x - 52, y: sp.y - 68, w: 104, h: 132 });
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
   MAPA ILUSTRADO DE VALORIA (VIAJE RÁPIDO + CALAVERAS/CORONAS)
   ========================================================= */
export function drawIllustratedWorldMap(canvas, mapsMeta, player, selectedMapId, time) {
  if (!canvas) return [];
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // Océano azul 16-bit
  ctx.fillStyle = '#0B4A8B';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(147, 197, 253, 0.22)';
  for (let i = 0; i < 18; i++) {
    px(ctx, ((i * 89 + time * 10) % w), (i * 41) % h, 26, 3, 'rgba(147,197,253,0.22)');
  }

  // Continente de Valoria
  ctx.fillStyle = '#2E7D32';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.52, w * 0.4, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D9B382';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Biomas distintivos sobre el continente
  ctx.fillStyle = '#57534E'; // Desierto
  ctx.beginPath(); ctx.ellipse(w * 0.74, h * 0.64, 95, 58, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#EA580C'; // Lava
  ctx.fillRect(w * 0.71, h * 0.62, 42, 14);
  ctx.fillStyle = '#E2E8F0'; // Montañas Heladas
  ctx.beginPath(); ctx.ellipse(w * 0.75, h * 0.33, 90, 52, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2E1065'; // Fortaleza del Vacío
  ctx.beginPath(); ctx.ellipse(w * 0.52, h * 0.24, 78, 42, 0, 0, Math.PI * 2); ctx.fill();

  // Caminos conectando los 6 mapas
  const ordered = Object.values(mapsMeta).sort((a, b) => a.order - b.order);
  ctx.strokeStyle = '#D6B88D';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ordered.forEach((m, idx) => {
    const mx = m.mapX * w;
    const my = m.mapY * h;
    if (idx === 0) ctx.moveTo(mx, my);
    else ctx.lineTo(mx, my);
  });
  ctx.stroke();

  const nodes = [];
  for (const m of ordered) {
    const mx = m.mapX * w;
    const my = m.mapY * h;
    const visited = player.visitedMaps.includes(m.id);
    const isCurrent = player.currentMap === m.id;
    const isSel = selectedMapId === m.id;
    const locked = player.level < m.reqLevel;

    // Nodo interactivo
    ctx.save();
    ctx.fillStyle = isSel ? '#FDE047' : visited ? m.color : '#475569';
    ctx.beginPath();
    ctx.arc(mx, my, isSel ? 17 : 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isCurrent ? '#FFFFFF' : '#0D0A14';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Calavera 💀 si jefe pendiente, Corona dorada 👑 si derrotado
    if (m.bossId) {
      const defeated = player.defeatedBosses.includes(m.bossId);
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(defeated ? '👑' : '💀', mx + 18, my - 10);
    }
    if (locked) {
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', mx - 18, my - 10);
    }

    // Etiqueta del mapa
    ctx.font = 'bold 12px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(`${m.order}. ${m.name}`, mx + 1, my + 31);
    ctx.fillStyle = isSel ? '#FDE047' : '#FFFFFF';
    ctx.fillText(`${m.order}. ${m.name}`, mx, my + 30);

    nodes.push({ id: m.id, x: mx - 45, y: my - 24, w: 90, h: 60 });
  }

  return nodes;
}
