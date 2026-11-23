/**
 * Renderizador Pixel Art 16-bit procedural — Los 6 Mapas de Valoria
 * Sombras suaves, animaciones de agua/fuego/gemas, 13 tipos de enemigos/jefes, NPCs y decoraciones.
 */

import { QUALITIES, TITLES } from './data.js';
import { drawDetailedHeroSprite, drawPetSprite } from './preview.js';
import { getAsset, getBossAsset } from './assetLoader.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawShadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.fillStyle = 'rgba(13, 10, 20, 0.36)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHero(ctx, p, time) {
  const bob = p.moving ? Math.sin(time * 13) * 2.2 : 0;
  const x = Math.round(p.x);
  const y = Math.round(p.y + bob);
  const isAlba = p.faction === 'alba';
  const primary = isAlba ? '#1E4E8C' : '#9E2A2B';
  const accent = isAlba ? '#D9A441' : '#C97A32';
  const cape = isAlba ? '#F4F6FA' : '#6E737B';

  drawShadow(ctx, p.x, p.y + 15, 13, 6);

  // Brillo visual de equipo a partir de +9 (intensificado al llegar a +12)
  const maxPlus = Math.max(p.equipment?.weapon?.plus || 0, p.equipment?.armor?.plus || 0);
  if (maxPlus >= 9) {
    const isMax12 = maxPlus >= 12;
    const qualColor = (QUALITIES[p.equipment?.weapon?.quality || 0] || QUALITIES[0]).color;
    const pulse = 0.5 + Math.sin(time * (isMax12 ? 9 : 5)) * 0.3;
    ctx.save();
    ctx.strokeStyle = isMax12 ? '#FDE047' : qualColor;
    ctx.globalAlpha = isMax12 ? 0.85 : 0.45 + pulse * 0.25;
    ctx.lineWidth = isMax12 ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, (isMax12 ? 26 : 21) + Math.sin(time * 7) * 2, 0, Math.PI * 2);
    ctx.stroke();

    if (isMax12) {
      for (let i = 0; i < 4; i++) {
        const ang = time * 3.5 + (i * Math.PI) / 2;
        px(ctx, p.x + Math.cos(ang) * 24 - 2, p.y - 4 + Math.sin(ang) * 16 - 2, 4, 4, '#FDE047');
      }
    }
    ctx.restore();
  }

  if (p.speedBuffTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y + 10, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (p.shieldBuffTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#D9A441';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24 + Math.sin(time * 10) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Renderizado unificado 16-bit 4-direcciones (Masculino y Femenino) con sombreado y brillo
  let dir = 0;
  if (Math.abs(p.dirX) > Math.abs(p.dirY)) dir = p.dirX >= 0 ? 1 : 3;
  else dir = p.dirY < 0 ? 2 : 0;

  drawDetailedHeroSprite(
    ctx,
    x,
    y - 2,
    1.42,
    {
      faction: p.faction,
      gender: p.gender || 'male',
      race: p.race,
      heroClass: p.heroClass,
      wings: p.gearSlots?.alas || null,
      dir,
      attackTimer: p.attackAnimTimer || 0
    },
    time
  );

  // Nombre y Título dorado activo del personaje en el mapa
  if (p.activeTitle && TITLES[p.activeTitle]) {
    ctx.font = 'bold 11px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(TITLES[p.activeTitle].name, x + 1, y - 34);
    ctx.fillStyle = '#FDE047';
    ctx.fillText(TITLES[p.activeTitle].name, x, y - 35);
  }

  if (p.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(x - 10, y - 22, 20, 36);
  }
}

export function drawPet(ctx, pet, time) {
  drawPetSprite(ctx, pet.id, pet.x, pet.y, 1.35, time);
}

export function drawBossAltar(ctx, altar, time) {
  const x = Math.round(altar.x);
  const y = Math.round(altar.y);
  const pulse = 0.55 + Math.sin(time * 4) * 0.25;
  ctx.save();
  ctx.fillStyle = `rgba(147, 51, 234, ${pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D9A441';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  px(ctx, x - 14, y - 10, 28, 20, '#334155');
  px(ctx, x - 10, y - 14, 20, 6, '#94A3B8');
  px(ctx, x - 4, y - 22, 8, 10, '#A855F7');
  ctx.font = 'bold 11px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDE047';
  ctx.fillText('ALTAR DE REVANCHA', x, y + 26);
}

export function drawCampfire(ctx, fire, time) {
  const x = Math.round(fire.x);
  const y = Math.round(fire.y);
  const glow = 0.22 + Math.sin(time * 6) * 0.06;
  ctx.save();
  ctx.fillStyle = `rgba(249, 115, 22, ${glow})`;
  ctx.beginPath();
  ctx.arc(x, y, fire.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  px(ctx, x - 14, y + 2, 28, 10, '#475569');
  px(ctx, x - 11, y - 2, 22, 8, '#78350F');
  const flicker = Math.sin(time * 18) * 3;
  px(ctx, x - 8, y - 14 - flicker * 0.4, 16, 16, '#EA580C');
  px(ctx, x - 5, y - 18 - flicker, 10, 14, '#FACC15');
  px(ctx, x - 2, y - 12, 4, 8, '#FEF9C3');
  // Chispas subiendo
  const sp1 = (time * 32) % 24;
  const sp2 = ((time * 32) + 12) % 24;
  px(ctx, x - 5 + Math.sin(time * 5) * 4, y - 16 - sp1, 2, 2, '#FEF08A');
  px(ctx, x + 4 + Math.cos(time * 6) * 4, y - 14 - sp2, 2, 2, '#FB923C');

  ctx.font = 'bold 11px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('FOGATA', x, y + 24);
}

export function drawPortal(ctx, portal, time, playerLevel) {
  const x = Math.round(portal.x);
  const y = Math.round(portal.y);
  const locked = portal.reqLevel && playerLevel < portal.reqLevel;
  const mainColor = locked ? '#64748B' : portal.color || '#38BDF8';
  const pulse = Math.sin(time * 5) * 4;

  ctx.save();
  ctx.fillStyle = locked ? 'rgba(100,116,139,0.22)' : 'rgba(56, 189, 248, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, 36 + pulse * 0.4, 22 + pulse * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 28, 16, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Partículas orbitando el portal
  for (let i = 0; i < 4; i++) {
    const a = time * 3 + (i * Math.PI) / 2;
    px(ctx, x + Math.cos(a) * 26 - 2, y + Math.sin(a) * 14 - 2, 4, 4, locked ? '#94A3B8' : '#E0F2FE');
  }
  ctx.restore();

  ctx.font = 'bold 12px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0D0A14';
  ctx.fillText(portal.label, x + 1, y - 24 + 1);
  ctx.fillStyle = locked ? '#FCA5A5' : '#F8FAFC';
  ctx.fillText(locked ? `${portal.label} (Nv.${portal.reqLevel})` : portal.label, x, y - 24);
}

export function drawChest(ctx, chest, time) {
  const x = Math.round(chest.x);
  const y = Math.round(chest.y);
  drawShadow(ctx, x, y + 12, 16, 6);
  px(ctx, x - 14, y - 10, 28, 20, '#0D0A14');
  px(ctx, x - 12, y - 8, 24, 16, chest.opened ? '#451A03' : '#92400E');
  if (chest.opened) {
    px(ctx, x - 12, y - 8, 24, 6, '#1C1917');
  } else {
    px(ctx, x - 12, y - 2, 24, 3, '#D9A441');
    px(ctx, x - 3, y - 4, 6, 7, '#FDE047');
    if (Math.sin(time * 6 + x) > 0.25) {
      px(ctx, x + 10, y - 14, 3, 3, '#FDE047');
      px(ctx, x - 13, y - 12, 2, 2, '#FEF9C3');
    }
  }
}

export function drawGemNode(ctx, g, time) {
  if (g.collected) return;
  const colors = {
    gema_rubi: ['#991B1B', '#EF4444', '#FCA5A5'],
    gema_esmeralda: ['#166534', '#22C55E', '#86EFAC'],
    gema_zafiro: ['#1E3A8A', '#3B82F6', '#93C5FD']
  };
  const [dark, mid, light] = colors[g.itemId] || colors.gema_rubi;
  const bob = Math.sin(time * 5 + g.x) * 2;
  const x = Math.round(g.x);
  const y = Math.round(g.y + bob);

  drawShadow(ctx, g.x, g.y + 11, 10, 4);
  px(ctx, x - 7, y - 9, 14, 16, '#0D0A14');
  px(ctx, x - 5, y - 7, 10, 12, dark);
  px(ctx, x - 3, y - 6, 6, 9, mid);
  px(ctx, x - 2, y - 5, 3, 4, light);

  // Destello animado de gema
  if (Math.sin(time * 7 + g.x * 0.1) > 0.35) {
    px(ctx, x + 5, y - 11, 3, 3, '#FFFFFF');
    px(ctx, x + 6, y - 13, 1, 7, light);
    px(ctx, x + 3, y - 10, 7, 1, light);
  }
}

export function drawGroundDrop(ctx, drop, time) {
  const bob = Math.sin(time * 7 + drop.x) * 2;
  const x = Math.round(drop.x);
  const y = Math.round(drop.y + bob);

  if (drop.kind === 'gold') {
    px(ctx, x - 5, y - 5, 10, 10, '#0D0A14');
    px(ctx, x - 4, y - 4, 8, 8, '#EAB308');
    px(ctx, x - 2, y - 2, 4, 4, '#FEF08A');
  } else {
    drawGemNode(ctx, { x, y, itemId: drop.itemId, collected: false }, time);
  }
}

export function drawNpc(ctx, npc, time) {
  const x = Math.round(npc.x);
  const y = Math.round(npc.y);
  drawShadow(ctx, x, y + 15, 13, 6);

  if (npc.kind === 'dummy') {
    const wobble = npc.hitFlash > 0 ? Math.sin(time * 50) * 4 : 0;
    px(ctx, x - 2, y - 4, 4, 20, '#78350F');
    px(ctx, x - 12 + wobble, y - 6, 24, 4, '#92400E');
    px(ctx, x - 8 + wobble, y - 14, 16, 16, '#D9A441');
    px(ctx, x - 6 + wobble, y - 22, 12, 9, '#E5C27A');
    px(ctx, x - 3 + wobble, y - 19, 2, 2, '#0D0A14');
    px(ctx, x + 2 + wobble, y - 19, 2, 2, '#0D0A14');
    return;
  }

  let coat = '#1E4E8C';
  let apron = '#F4F6FA';
  if (npc.kind === 'herrero') { coat = '#9E2A2B'; apron = '#475569'; }
  else if (npc.kind === 'mercader') { coat = '#0F766E'; apron = '#D9A441'; }
  else if (npc.kind === 'guardia_alba') { coat = '#CBD5E1'; apron = '#1E4E8C'; }
  else if (npc.kind === 'guardia_hierro') { coat = '#7F1D1D'; apron = '#57534E'; }

  px(ctx, x - 10, y - 8, 20, 19, '#0D0A14');
  px(ctx, x - 8, y - 6, 16, 15, coat);
  px(ctx, x - 6, y - 1, 12, 10, apron);
  px(ctx, x - 7, y - 20, 14, 13, '#0D0A14');
  px(ctx, x - 5, y - 18, 10, 10, npc.kind === 'guardia_hierro' ? '#6D9E51' : '#F2C9A0');
  if (npc.kind === 'guardia_alba') {
    px(ctx, x - 6, y - 21, 12, 5, '#E2E8F0');
    px(ctx, x + 10, y - 16, 3, 26, '#94A3B8'); // lanza plateada
  } else if (npc.kind === 'guardia_hierro') {
    px(ctx, x - 6, y - 21, 12, 4, '#57534E');
    px(ctx, x + 10, y - 14, 4, 24, '#78350F'); // hacha
    px(ctx, x + 11, y - 15, 6, 7, '#CBD5E1');
  } else {
    px(ctx, x - 5, y - 11, 10, 4, npc.kind === 'herrero' ? '#334155' : '#92400E');
  }
  px(ctx, x - 3, y - 15, 2, 2, '#0D0A14');
  px(ctx, x + 2, y - 15, 2, 2, '#0D0A14');

  if (npc.marker) {
    const floatY = Math.sin(time * 5) * 3;
    ctx.font = 'bold 18px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(npc.marker, x + 1, y - 28 + floatY + 1);
    ctx.fillStyle = '#EAB308';
    ctx.fillText(npc.marker, x, y - 28 + floatY);
  }
}

export function drawEnemy(ctx, e, time) {
  const bob = Math.sin(time * 8 + e.id) * 1.8;
  const x = Math.round(e.x);
  const y = Math.round(e.y + bob);

  drawShadow(ctx, e.x, e.y + (e.isBoss ? 24 : 13), e.radius * 0.85, e.radius * 0.4);

  if (e.kind === 'lobo' || e.kind === 'lobo_invernal') {
    const isIce = e.kind === 'lobo_invernal';
    px(ctx, x - 14, y - 6, 28, 14, '#0D0A14');
    px(ctx, x - 12, y - 4, 24, 10, isIce ? '#CBD5E1' : '#3B1F54');
    px(ctx, x - 10, y - 10, 12, 8, isIce ? '#E2E8F0' : '#4C1D95');
    px(ctx, x - 8, y - 8, 3, 2, isIce ? '#38BDF8' : '#E879F9');
    px(ctx, x + 6, y - 7, 8, 4, isIce ? '#93C5FD' : '#9333EA');
    px(ctx, x - 10, y + 6, 4, 6, isIce ? '#64748B' : '#1E1B2E');
    px(ctx, x + 6, y + 6, 4, 6, isIce ? '#64748B' : '#1E1B2E');
  } else if (e.kind === 'trasgo' || e.kind === 'mago_sombrio') {
    const isDark = e.kind === 'mago_sombrio';
    px(ctx, x - 9, y - 8, 18, 18, '#0D0A14');
    px(ctx, x - 7, y - 6, 14, 14, isDark ? '#1E1B4B' : '#4C1D95');
    px(ctx, x - 8, y - 17, 16, 11, isDark ? '#312E81' : '#581C87');
    if (!isDark) {
      px(ctx, x - 12, y - 15, 4, 3, '#6B21A8');
      px(ctx, x + 8, y - 15, 4, 3, '#6B21A8');
    } else {
      px(ctx, x - 6, y - 22, 12, 6, '#4C1D95');
    }
    px(ctx, x - 4, y - 13, 3, 2, isDark ? '#E879F9' : '#F43F5E');
    px(ctx, x + 2, y - 13, 3, 2, isDark ? '#E879F9' : '#F43F5E');
    px(ctx, x + 9, y - 12, 3, 20, '#9333EA');
  } else if (e.kind === 'esqueleto') {
    px(ctx, x - 10, y - 9, 20, 20, '#0D0A14');
    px(ctx, x - 8, y - 7, 16, 16, '#475569');
    px(ctx, x - 6, y - 5, 12, 2, '#E2E8F0');
    px(ctx, x - 6, y - 1, 12, 2, '#E2E8F0');
    px(ctx, x - 7, y - 20, 14, 12, '#E2E8F0');
    px(ctx, x - 4, y - 16, 3, 3, '#9333EA');
    px(ctx, x + 2, y - 16, 3, 3, '#9333EA');
  } else if (e.kind === 'escorpion') {
    px(ctx, x - 13, y - 4, 26, 12, '#0D0A14');
    px(ctx, x - 11, y - 2, 22, 8, '#7C2D12');
    px(ctx, x + 7, y - 14, 5, 12, '#EA580C'); // cola curva
    px(ctx, x + 4, y - 16, 6, 4, '#FACC15'); // aguijón
    px(ctx, x - 15, y - 6, 5, 5, '#EA580C'); // pinzas
  } else if (e.kind === 'nomada') {
    px(ctx, x - 9, y - 8, 18, 18, '#0D0A14');
    px(ctx, x - 7, y - 6, 14, 14, '#9A3412');
    px(ctx, x - 7, y - 18, 14, 11, '#78350F');
    px(ctx, x - 4, y - 13, 3, 2, '#FACC15');
    px(ctx, x + 2, y - 13, 3, 2, '#FACC15');
    px(ctx, x + 9, y - 8, 3, 16, '#F97316'); // arco ígneo
  } else if (e.kind === 'golem_hielo') {
    px(ctx, x - 16, y - 14, 32, 28, '#0D0A14');
    px(ctx, x - 14, y - 12, 28, 24, '#38BDF8');
    px(ctx, x - 10, y - 10, 20, 12, '#BAE6FD');
    px(ctx, x - 6, y - 7, 4, 3, '#0369A1');
    px(ctx, x + 3, y - 7, 4, 3, '#0369A1');
  } else if (e.kind === 'caballero_vacio') {
    px(ctx, x - 12, y - 10, 24, 22, '#0D0A14');
    px(ctx, x - 10, y - 8, 20, 18, '#1E1B4B');
    px(ctx, x - 8, y - 22, 16, 14, '#312E81');
    px(ctx, x - 5, y - 16, 10, 3, '#C084FC');
    px(ctx, x + 12, y - 18, 4, 28, '#A855F7');
  } else if (e.isBoss) {
    // Jefes imponentes (2.5x - 3x tamaño del héroe) con Estado de Furia rojo (<30% PV)
    const palette =
      e.kind === 'ignis'
        ? { aura: 'rgba(249,115,22,0.65)', body: '#292524', mid: '#EA580C', core: '#FDE047', eye: '#FEF08A', weapon: '#F97316' }
        : e.kind === 'boreas'
        ? { aura: 'rgba(56,189,248,0.65)', body: '#475569', mid: '#38BDF8', core: '#E0F2FE', eye: '#38BDF8', weapon: '#7DD3FC' }
        : e.kind === 'vaelor'
        ? { aura: 'rgba(192,132,252,0.78)', body: '#090612', mid: '#4C1D95', core: '#F0ABFC', eye: '#FFFFFF', weapon: '#C084FC' }
        : { aura: 'rgba(147,51,234,0.6)', body: '#2E1065', mid: '#581C87', core: '#C084FC', eye: '#F0ABFC', weapon: '#9333EA' };

    ctx.save();
    // Brillo rojo intenso en Estado de Furia (<30% vida)
    if (e.furyActive) {
      ctx.fillStyle = `rgba(220, 38, 38, ${0.26 + Math.sin(time * 12) * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y - 6, e.radius + 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.strokeStyle = palette.aura;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y - 4, e.radius + 8 + Math.sin(time * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Si el asset PNG del jefe (jefe_malakor, jefe_ignis, jefe_boreas, jefe_vaelor) está cargado y procesado con Flood-Fill:
    const bossImg = getBossAsset(e.kind);
    if (bossImg) {
      const breathY = Math.sin(time * 4.2 + (e.id || 0)) * 3;
      const bw = 96;
      const bh = 96;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bossImg, Math.round(x - bw / 2), Math.round(y - bh * 0.72 + breathY), bw, bh);
      ctx.restore();
    } else {
      // Fallback procedural: Alas de energía morada en Vaelor
      if (e.kind === 'vaelor') {
        const flap = Math.sin(time * 6) * 5;
        px(ctx, x - 52, y - 34 - flap, 28, 36, '#4C1D95');
        px(ctx, x - 48, y - 30 - flap, 20, 26, '#A855F7');
        px(ctx, x + 24, y - 34 - flap, 28, 36, '#4C1D95');
        px(ctx, x + 28, y - 30 - flap, 20, 26, '#A855F7');
      }

      // Cuerpo gigante imponente
      px(ctx, x - 28, y - 20, 56, 44, '#0D0A14');
      px(ctx, x - 24, y - 16, 48, 36, palette.body);
      px(ctx, x - 18, y - 8, 36, 12, palette.mid);
      px(ctx, x - 7, y - 6, 14, 14, palette.core);
      // Hombros en llamas (Ignis) o cristales (Malakor/Boreas)
      px(ctx, x - 34, y - 22, 12, 14, palette.mid);
      px(ctx, x + 22, y - 22, 12, 14, palette.mid);
      // Cabeza con cuernos / barba escarchada
      px(ctx, x - 16, y - 40, 32, 22, '#0D0A14');
      px(ctx, x - 13, y - 37, 26, 16, palette.body);
      px(ctx, x - 22, y - 48, 6, 14, e.kind === 'boreas' ? '#BAE6FD' : '#D9A441');
      px(ctx, x + 16, y - 48, 6, 14, e.kind === 'boreas' ? '#BAE6FD' : '#D9A441');
      px(ctx, x - 8, y - 30, 5, 4, palette.eye);
      px(ctx, x + 3, y - 30, 5, 4, palette.eye);
      if (e.kind === 'boreas') {
        px(ctx, x - 10, y - 22, 20, 10, '#E0F2FE'); // barba escarchada
      }
      // Arma gigante (Martillo / Hacha de cristal / Espada del Vacío / Garras)
      px(ctx, x + 26, y - 34, 8, 52, palette.weapon);
      if (e.kind === 'ignis' || e.kind === 'boreas') {
        px(ctx, x + 20, y - 38, 22, 14, palette.core);
      }
    }
  }

  if (e.stunTimer > 0) {
    ctx.fillStyle = '#EAB308';
    ctx.font = 'bold 12px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ ATURDIDO', x, y - (e.isBoss ? 44 : 26));
  } else if (e.rootTimer > 0) {
    ctx.strokeStyle = '#16A34A';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 14, y + 6, 28, 8);
  } else if (e.slowTimer > 0) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(x - 12, y - 16, 24, 28);
  }

  if (e.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(x - e.radius, y - e.radius, e.radius * 2, e.radius * 2);
  }

  if (!e.isBoss && e.hp < e.maxHp) {
    const bw = 34;
    px(ctx, x - bw / 2, y - 26, bw, 5, '#0D0A14');
    px(ctx, x - bw / 2 + 1, y - 25, Math.max(0, ((bw - 2) * e.hp) / e.maxHp), 3, '#D9383A');
  }
}

export function drawCrystal(ctx, c, time) {
  if (c.collected) return;
  const glow = 0.65 + Math.sin(time * 5 + c.x) * 0.25;
  ctx.save();
  ctx.fillStyle = `rgba(147, 51, 234, ${glow * 0.35})`;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  px(ctx, c.x - 6, c.y - 12, 12, 20, '#0D0A14');
  px(ctx, c.x - 4, c.y - 10, 8, 16, '#7E22CE');
  px(ctx, c.x - 2, c.y - 8, 4, 10, '#E9D5FF');
}

export function drawBuilding(ctx, b, time) {
  px(ctx, b.x + 8, b.y + 10, b.w, b.h, 'rgba(0,0,0,0.3)');
  px(ctx, b.x, b.y + 28, b.w, b.h - 28, '#0D0A14');
  px(ctx, b.x + 3, b.y + 30, b.w - 6, b.h - 33, b.wallColor);
  px(ctx, b.x - 6, b.y, b.w + 12, 34, '#0D0A14');
  px(ctx, b.x - 3, b.y + 3, b.w + 6, 28, b.roofColor);
  px(ctx, b.x - 3, b.y + 3, b.w + 6, 6, b.roofHighlight);
  px(ctx, b.x + b.w / 2 - 14, b.y + b.h - 32, 28, 32, '#3B2314');
  px(ctx, b.x + b.w / 2 - 11, b.y + b.h - 29, 22, 29, '#5C3A21');
  px(ctx, b.x + 18, b.y + 48, 20, 18, '#FACC15');
  px(ctx, b.x + b.w - 38, b.y + 48, 20, 18, '#FACC15');

  // Chimenea con humo animado
  if (b.chimney) {
    const cx = b.x + b.w - 28;
    const cy = b.y - 12;
    px(ctx, cx, cy, 14, 16, '#475569');
    const puff = (time * 18) % 24;
    ctx.fillStyle = `rgba(226, 232, 240, ${0.55 - puff / 45})`;
    ctx.beginPath();
    ctx.arc(cx + 7 + Math.sin(time * 2) * 3, cy - puff, 6 + puff * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = 'bold 14px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(b.label, b.x + b.w / 2, b.y + 22);
}

export function drawTree(ctx, t) {
  drawShadow(ctx, t.x, t.y + 18, 22, 9);
  if (t.style === 'snow_pine') {
    px(ctx, t.x - 6, t.y + 2, 12, 20, '#3B2314');
    px(ctx, t.x - 22, t.y - 10, 44, 16, '#141018');
    px(ctx, t.x - 20, t.y - 8, 40, 13, '#14532D');
    px(ctx, t.x - 18, t.y - 22, 36, 16, '#166534');
    px(ctx, t.x - 14, t.y - 28, 28, 10, '#F1F5F9');
    px(ctx, t.x - 8, t.y - 36, 16, 10, '#FFFFFF');
  } else if (t.style === 'dry_palm') {
    px(ctx, t.x - 5, t.y - 16, 10, 38, '#141018');
    px(ctx, t.x - 4, t.y - 15, 8, 36, '#78350F');
    px(ctx, t.x - 22, t.y - 22, 44, 6, '#92400E');
    px(ctx, t.x - 14, t.y - 28, 28, 6, '#A16207');
  } else if (t.style === 'dead') {
    px(ctx, t.x - 6, t.y, 12, 22, '#3F3F46');
    px(ctx, t.x - 16, t.y - 16, 32, 5, '#52525B');
    px(ctx, t.x - 10, t.y - 26, 20, 5, '#52525B');
  } else {
    // Si prop_arbol.png está disponible (y no es árbol corrupto), renderizar el sprite Pixel Art con sombra en la base
    const treeImg = !t.corrupted ? getAsset('prop_arbol') : null;
    if (treeImg) {
      const tw = 74;
      const th = 78;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(treeImg, Math.round(t.x - tw / 2), Math.round(t.y - th + 22), tw, th);
      ctx.restore();
      return;
    }
    // Fallback procedural: Árbol frondoso multicapa de 16 bits con raíces, corteza sombreada y follaje en 3 tonos
    const cDark = t.corrupted ? '#2E1065' : '#14532D';
    const cMid = t.corrupted ? '#4C1D95' : '#15803D';
    const cLight = t.corrupted ? '#7E22CE' : '#22C55E';
    // Tronco y raíces con contorno #141018
    px(ctx, t.x - 8, t.y + 12, 16, 8, '#141018');
    px(ctx, t.x - 7, t.y - 2, 14, 22, '#141018');
    px(ctx, t.x - 5, t.y, 10, 19, '#5C3A21');
    px(ctx, t.x - 5, t.y, 4, 18, '#7C4D2B');
    // Copa frondosa escalonada (3 lóbulos de follaje con relieve)
    px(ctx, t.x - 24, t.y - 24, 48, 26, '#141018');
    px(ctx, t.x - 18, t.y - 34, 36, 16, '#141018');
    px(ctx, t.x - 22, t.y - 22, 44, 22, cDark);
    px(ctx, t.x - 20, t.y - 26, 40, 18, cMid);
    px(ctx, t.x - 16, t.y - 32, 32, 14, cMid);
    px(ctx, t.x - 14, t.y - 31, 26, 9, cLight);
    px(ctx, t.x - 18, t.y - 21, 12, 7, cLight);
    px(ctx, t.x + 6, t.y - 21, 12, 7, cLight);
  }
}

export function drawProp(ctx, prop, time) {
  const x = Math.round(prop.x);
  const y = Math.round(prop.y);

  if (prop.kind === 'fountain') {
    drawShadow(ctx, x, y + 18, 32, 14);
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 23, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    const spray = Math.sin(time * 12) * 3;
    px(ctx, x - 3, y - 16 - spray, 6, 20 + spray, '#BAE6FD');
    px(ctx, x - 9, y - 12, 18, 3, '#E0F2FE');
  } else if (prop.kind === 'banner_alba' || prop.kind === 'banner_hierro') {
    const wave = Math.sin(time * 6 + x) * 2;
    px(ctx, x - 2, y - 26, 4, 34, '#78350F');
    px(ctx, x + 2, y - 24, 14 + wave, 16, prop.kind === 'banner_alba' ? '#1E4E8C' : '#9E2A2B');
    px(ctx, x + 5, y - 20, 6, 6, prop.kind === 'banner_alba' ? '#D9A441' : '#C97A32');
  } else if (prop.kind === 'torch' || prop.kind === 'torch_void') {
    px(ctx, x - 2, y - 10, 4, 18, '#57534E');
    const fl = Math.sin(time * 16 + x) * 2;
    px(ctx, x - 4, y - 18 - fl, 8, 9, prop.kind === 'torch_void' ? '#9333EA' : '#EA580C');
    px(ctx, x - 2, y - 16 - fl, 4, 5, prop.kind === 'torch_void' ? '#F0ABFC' : '#FDE047');
  } else if (prop.kind === 'anvil') {
    drawShadow(ctx, x, y + 8, 14, 5);
    px(ctx, x - 12, y - 4, 24, 10, '#334155');
    px(ctx, x - 7, y + 4, 14, 6, '#1E293B');
    if (Math.sin(time * 14) > 0.6) {
      px(ctx, x + 4, y - 10, 3, 3, '#FDE047');
      px(ctx, x - 6, y - 8, 2, 2, '#FB923C');
    }
  } else if (prop.kind === 'barrel') {
    drawShadow(ctx, x, y + 8, 10, 4);
    px(ctx, x - 8, y - 10, 16, 18, '#78350F');
    px(ctx, x - 8, y - 6, 16, 2, '#334155');
    px(ctx, x - 8, y + 2, 16, 2, '#334155');
  } else if (prop.kind === 'sign') {
    px(ctx, x - 2, y - 4, 4, 16, '#78350F');
    px(ctx, x - 14, y - 14, 28, 12, '#A16207');
    px(ctx, x - 10, y - 10, 20, 2, '#FEF08A');
  } else if (prop.kind === 'ruin_pillar' || prop.kind === 'dark_statue') {
    drawShadow(ctx, x, y + 14, 18, 7);
    px(ctx, x - 14, y - 24, 28, 38, '#0D0A14');
    px(ctx, x - 12, y - 22, 24, 34, prop.kind === 'dark_statue' ? '#312E81' : '#64748B');
    px(ctx, x - 8, y - 18, 16, 6, prop.kind === 'dark_statue' ? '#9333EA' : '#94A3B8');
  } else if (prop.kind === 'minecart' || prop.kind === 'caravan') {
    drawShadow(ctx, x, y + 10, 20, 7);
    px(ctx, x - 18, y - 10, 36, 18, prop.kind === 'caravan' ? '#92400E' : '#475569');
    px(ctx, x - 14, y - 6, 28, 8, prop.kind === 'caravan' ? '#D6C7B2' : '#1E293B');
  } else if (prop.kind === 'ice_crystal') {
    px(ctx, x - 7, y - 18, 14, 24, '#0284C7');
    px(ctx, x - 4, y - 22, 8, 22, '#7DD3FC');
  } else if (prop.kind === 'void_crystal_giant') {
    const fl = Math.sin(time * 3) * 6;
    ctx.save();
    ctx.fillStyle = 'rgba(147, 51, 234, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y - 10 + fl, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    px(ctx, x - 16, y - 44 + fl, 32, 56, '#4C1D95');
    px(ctx, x - 10, y - 54 + fl, 20, 62, '#9333EA');
    px(ctx, x - 4, y - 44 + fl, 8, 42, '#F5D0FE');
  } else if (prop.kind === 'bush') {
    drawShadow(ctx, x, y + 8, 14, 5);
    px(ctx, x - 14, y - 8, 28, 16, '#14532D');
    px(ctx, x - 10, y - 12, 20, 12, '#16A34A');
  } else if (prop.kind === 'flower') {
    px(ctx, x - 3, y - 3, 6, 6, prop.color || '#60A5FA');
    px(ctx, x - 1, y - 1, 2, 2, '#FFFFFF');
  }
}
