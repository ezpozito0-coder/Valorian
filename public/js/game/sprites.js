/**
 * Renderizador Pixel Art 16-bit procedural — Los 6 Mapas de Valoria
 * Sombras suaves, animaciones de agua/fuego/gemas, 13 tipos de enemigos/jefes, NPCs y decoraciones.
 */

import { QUALITIES, TITLES, ITEMS } from './data.js';
import { drawDetailedHeroSprite, drawPetSprite, computeAttackPhase } from './preview.js';
import {
  getAsset,
  getBossAsset,
  getNpcAsset,
  getEnemyAsset,
  getItemIconAsset,
  getSpriteFrameMetrics,
  drawFootAnchoredSprite,
  drawPropStructureSprite,
  drawWorldUpgradeSprite,
  drawAiSystemIcon
} from './assetLoader.js';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function drawShadow(ctx, x, y, rx, ry, { isBoss = false, frameIndex = 0 } = {}) {
  const shadowSheet = getAsset(isBoss ? 'fx_sombra_jefe' : 'fx_sombra_entidad');
  if (shadowSheet) {
    const m = getSpriteFrameMetrics(shadowSheet, frameIndex);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = isBoss ? 0.85 : 0.72;
    ctx.drawImage(
      shadowSheet,
      m.sx,
      m.sy,
      m.frameWidth,
      m.frameHeight,
      Math.round(x - rx * 1.15),
      Math.round(y - ry * 1.15),
      Math.round(rx * 2.3),
      Math.round(ry * 2.3)
    );
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = 'rgba(13, 10, 20, 0.36)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHero(ctx, p, time) {
  const x = Math.round(p.x);
  const y = Math.round(p.y);

  // Estela de velocidad animada (fx_estela_dash) cuando el héroe corre con poción de velocidad o montura
  if (p.moving && (p.speedBuffTimer > 0 || p.mounted)) {
    const dashSheet = getAsset('fx_estela_dash');
    if (dashSheet) {
      const fIdx = Math.floor(time * 14) % 4;
      const m = getSpriteFrameMetrics(dashSheet, fIdx);
      const ang = Math.atan2(p.dirY || 0, p.dirX || 1);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.78;
      ctx.translate(x - (p.dirX || 0) * 18, y + 2 - (p.dirY || 0) * 12);
      ctx.rotate(ang);
      ctx.drawImage(dashSheet, m.sx, m.sy, m.frameWidth, m.frameHeight, -28, -18, 48, 36);
      ctx.restore();
    }
  }

  // Brillo visual de equipo a partir de +9 (intensificado al llegar a +12 con fx_aura_legendaria)
  const maxPlus = Math.max(p.equipment?.weapon?.plus || 0, p.equipment?.armor?.plus || 0);
  if (maxPlus >= 9) {
    const isMax12 = maxPlus >= 12;
    const auraSheet = getAsset('fx_aura_legendaria');
    if (auraSheet) {
      const frameIndex = Math.floor(time * (isMax12 ? 10 : 7)) % 4;
      drawFootAnchoredSprite(ctx, auraSheet, x, y + 18, isMax12 ? 64 : 52, {
        frameIndex,
        alpha: isMax12 ? 0.92 : 0.65
      });
    } else {
      const qualColor = (QUALITIES[p.equipment?.weapon?.quality || 0] || QUALITIES[0]).color;
      const pulse = 0.5 + Math.sin(time * (isMax12 ? 9 : 5)) * 0.3;
      ctx.save();
      ctx.strokeStyle = isMax12 ? '#FDE047' : qualColor;
      ctx.globalAlpha = isMax12 ? 0.85 : 0.45 + pulse * 0.25;
      ctx.lineWidth = isMax12 ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2, (isMax12 ? 26 : 21) + Math.sin(time * 7) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (p.speedBuffTimer > 0 || p.mounted) {
    ctx.save();
    ctx.strokeStyle = p.mounted ? '#FDE047' : '#38BDF8';
    ctx.lineWidth = p.mounted ? 3 : 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 13, p.mounted ? 22 : 18, p.mounted ? 9 : 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (p.shieldBuffTimer > 0) {
    const shieldSheet = getAsset('fx_escudo_baluarte');
    if (shieldSheet) {
      const fIdx = Math.floor(time * 9) % 4;
      drawFootAnchoredSprite(ctx, shieldSheet, x, y + 18, 62, {
        frameIndex: fIdx,
        alpha: 0.88
      });
    } else {
      ctx.save();
      ctx.strokeStyle = '#D9A441';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24 + Math.sin(time * 10) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Renderizado unificado 16-bit 4-direcciones (Masculino y Femenino) anclado a la base de los pies (footY)
  let dir = 0;
  if (Math.abs(p.dirX) > Math.abs(p.dirY)) dir = p.dirX >= 0 ? 1 : 3;
  else dir = p.dirY < 0 ? 2 : 0;

  // Si está en Montura de Guerra, dibujar el Corcel Blindado 16-bit en 4 cuadros y sentar al jinete en la montura
  const mountSheet = p.mounted ? getAsset('montura_caballo') : null;
  const riderYOffset = p.mounted ? -14 : -2;
  if (mountSheet) {
    const mFrame = p.moving ? Math.floor(time * 11) % 4 : 0;
    const faceLeft = (p.dirX || 0) < -0.05 || dir === 3;
    drawShadow(ctx, x, y + 15, 26, 10);
    drawFootAnchoredSprite(ctx, mountSheet, x, y + 18, 64, {
      frameIndex: mFrame,
      flipX: faceLeft
    });
  }

  ctx.save();
  if (p.stealthActive) {
    ctx.globalAlpha = 0.56;
  }

  drawDetailedHeroSprite(
    ctx,
    x,
    y + riderYOffset,
    1.42,
    {
      faction: p.faction,
      gender: p.gender || 'male',
      race: p.race,
      heroClass: p.heroClass,
      wings: p.gearSlots?.alas || null,
      gearSlots: p.gearSlots,
      equipment: p.equipment,
      dir,
      moving: Boolean(p.moving),
      moveSpeedRatio: p.moveSpeedRatio || 1,
      jumpTimer: p.jumpTimer || 0,
      jumpHeight: p.jumpHeight || 0,
      attackTimer: p.attackAnimTimer || 0,
      atkDirX: p.atkDirX ?? p.dirX ?? 0,
      atkDirY: p.atkDirY ?? p.dirY ?? 1
    },
    time
  );
  ctx.restore();

  if (p.stealthActive) {
    drawAiSystemIcon(ctx, 'sigilo', x, y - 48, 20);
  } else if (p.gearSlots?.pechera === 'disfraz_alba' || p.gearSlots?.pechera === 'disfraz_hierro') {
    drawAiSystemIcon(ctx, p.gearSlots.pechera, x + 16, y - 46, 17);
  }

  // Nombre y Título dorado activo del personaje en el mapa
  if (p.activeTitle && TITLES[p.activeTitle]) {
    ctx.font = 'bold 11px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(TITLES[p.activeTitle].name, x + 1, y - 36);
    ctx.fillStyle = '#FDE047';
    ctx.fillText(TITLES[p.activeTitle].name, x, y - 37);
  }

  if (p.hitFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(x - 14, y - 28, 28, 46);
  }
}

export function drawPet(ctx, pet, time) {
  drawPetSprite(ctx, pet.id, pet.x, pet.y, 1.35, time, {
    dirX: pet.dirX,
    moving: pet.moving,
    attackTimer: pet.attackAnimTimer || 0,
    atkDirX: pet.atkDirX,
    atkDirY: pet.atkDirY
  });
}

export function drawBossAltar(ctx, altar, time) {
  const x = Math.round(altar.x);
  const y = Math.round(altar.y);
  drawShadow(ctx, x, y + 14, 24, 9);
  const voidHalo = getAsset('fx_halo_vacio');
  if (voidHalo) {
    const hFrame = Math.floor(time * 6) % 4;
    drawFootAnchoredSprite(ctx, voidHalo, x, y + 36, 76, { frameIndex: hFrame, alpha: 0.58 });
  }

  const altarSheet = getAsset('prop_altar_jefe');
  if (altarSheet) {
    const frameIndex = Math.floor(time * 5) % 4;
    drawFootAnchoredSprite(ctx, altarSheet, x, y + 18, 66, { frameIndex });
  } else {
    px(ctx, x - 14, y - 10, 28, 20, '#334155');
    px(ctx, x - 10, y - 14, 20, 6, '#94A3B8');
    px(ctx, x - 4, y - 22, 8, 10, '#A855F7');
  }
}

export function drawCampfire(ctx, fire, time) {
  const x = Math.round(fire.x);
  const y = Math.round(fire.y);
  const glow = 0.24 + Math.sin(time * 6) * 0.07;

  // Halo radial cálido multicapa de la fogata + sprite fx_halo_calido de 16 bits
  const warmHalo = getAsset('fx_halo_calido');
  if (warmHalo) {
    const hFrame = Math.floor(time * 7) % 4;
    drawFootAnchoredSprite(ctx, warmHalo, x, y + Math.round(fire.radius * 0.72), Math.round(fire.radius * 1.45), {
      frameIndex: hFrame,
      alpha: 0.48
    });
  }
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 8, x, y, fire.radius);
  grad.addColorStop(0, `rgba(251, 146, 60, ${glow * 1.4})`);
  grad.addColorStop(0.55, `rgba(234, 88, 12, ${glow * 0.65})`);
  grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, fire.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Usar spritesheet animado de 4 cuadros prop_fogata.png (y prop_fogata.gif)
  const fireSheet = getAsset('prop_fogata');
  if (fireSheet) {
    const frameIndex = Math.floor(time * 8) % 4;
    drawFootAnchoredSprite(ctx, fireSheet, x, y + 14, 58, { frameIndex });
  } else {
    drawShadow(ctx, x, y + 6, 20, 8);
    const flicker = Math.sin(time * 18) * 3;
    px(ctx, x - 11, y - 3, 22, 5, '#78350F');
    px(ctx, x - 8, y - 18 - flicker * 0.5, 16, 15, '#EA580C');
    px(ctx, x - 5, y - 22 - flicker, 10, 15, '#FACC15');
  }
}

export function drawPortal(ctx, portal, time, playerLevel) {
  const x = Math.round(portal.x);
  const y = Math.round(portal.y);
  const locked = portal.reqLevel && playerLevel < portal.reqLevel;
  const mainColor = locked ? '#64748B' : portal.color || '#38BDF8';

  const portalSheet = getAsset('prop_portal');
  if (drawWorldUpgradeSprite(ctx, 'portal_arco', x - 44, y - 62, 88, 94)) {
    const pulse = 0.16 + Math.sin(time * 5) * 0.08;
    ctx.save();
    ctx.fillStyle = locked ? 'rgba(100,116,139,0.28)' : `rgba(56, 189, 248, ${pulse.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 24, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (portalSheet) {
    const frameIndex = Math.floor(time * 7) % 4;
    drawFootAnchoredSprite(ctx, portalSheet, x, y + 26, 86, {
      frameIndex,
      filter: locked ? 'grayscale(0.85) brightness(0.8)' : null
    });
  } else {
    const pulse = Math.sin(time * 5) * 4;
    drawShadow(ctx, x, y + 12, 38, 12);
    ctx.save();
    ctx.fillStyle = locked ? 'rgba(100,116,139,0.25)' : 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, 36 + pulse * 0.4, 20 + pulse * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, 28, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.font = 'bold 12px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  const labelText = locked ? `${portal.label} (Nv.${portal.reqLevel})` : portal.label;
  const tw = Math.ceil(ctx.measureText(labelText).width) + 12;
  px(ctx, x - tw / 2, y - 38, tw, 16, 'rgba(10, 13, 18, 0.82)');
  px(ctx, x - tw / 2, y - 38, tw, 2, mainColor);
  ctx.fillStyle = '#0D0A14';
  ctx.fillText(labelText, x + 1, y - 25);
  ctx.fillStyle = locked ? '#FCA5A5' : '#F8FAFC';
  ctx.fillText(labelText, x, y - 26);
}

export function drawChest(ctx, chest, time) {
  const x = Math.round(chest.x);
  const y = Math.round(chest.y);
  const chestSheet = getAsset('prop_cofre');
  if (chestSheet) {
    const fw = Math.floor(chestSheet.width / 2);
    const fh = chestSheet.height;
    const frameX = chest.opened ? fw : 0;
    drawShadow(ctx, x, y + 14, 22, 8);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(chestSheet, frameX, 0, fw, fh, x - 28, y - 34, 56, 56);
    ctx.restore();
    return;
  }
  drawShadow(ctx, x, y + 12, 18, 7);
  px(ctx, x - 15, y - 11, 30, 22, '#0D0A14');
  px(ctx, x - 13, y - 9, 26, 18, chest.opened ? '#3B1D0A' : '#92400E');
  px(ctx, x - 13, y - 9, 26, 6, chest.opened ? '#1C1917' : '#B45309');
  px(ctx, x - 11, y - 9, 3, 18, '#D9A441');
  px(ctx, x + 8, y - 9, 3, 18, '#D9A441');
  if (!chest.opened) {
    px(ctx, x - 13, y - 3, 26, 3, '#D9A441');
    px(ctx, x - 3, y - 5, 6, 7, '#FDE047');
    px(ctx, x - 1, y - 3, 2, 3, '#0D0A14');
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
  const bob = Math.sin(time * 5 + g.x) * 2.5;
  const x = Math.round(g.x);
  const y = Math.round(g.y + bob);

  drawShadow(ctx, g.x, g.y + 11, 11, 4);
  // Halo brillante en el suelo del color de la gema
  ctx.save();
  ctx.strokeStyle = mid;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(g.x, g.y + 8, 12, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Usar exactamente el mismo icono 16-bit de la gema que aparece en la Mochila, Herrería y Tienda
  const iconImg = getItemIconAsset(g.itemId);
  if (iconImg) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(iconImg, x - 14, y - 16, 28, 28);
    ctx.restore();
    if (Math.sin(time * 7 + g.x * 0.1) > 0.35) {
      px(ctx, x + 5, y - 13, 3, 3, '#FFFFFF');
      px(ctx, x + 6, y - 15, 1, 7, light);
      px(ctx, x + 3, y - 12, 7, 1, light);
    }
    return;
  }

  px(ctx, x - 7, y - 9, 14, 16, '#0D0A14');
  px(ctx, x - 5, y - 7, 10, 12, dark);
  px(ctx, x - 3, y - 6, 6, 9, mid);
  px(ctx, x - 2, y - 5, 3, 4, light);
}

export function drawGroundDrop(ctx, drop, time) {
  const bob = Math.sin(time * 7 + drop.x) * 2;
  const x = Math.round(drop.x);
  const y = Math.round(drop.y + bob);

  // Parpadeo de aviso cuando quedan menos de 5 segundos en el suelo
  const isExpiring = drop.life !== undefined && drop.life < 5;
  const blinkAlpha = isExpiring ? (Math.sin(time * 18) > 0 ? 1 : 0.35) : 1;

  ctx.save();
  if (blinkAlpha < 1) ctx.globalAlpha = blinkAlpha;

  if (drop.kind === 'gold') {
    drawShadow(ctx, x, Math.round(drop.y + 7), 9, 4);
    const coinImg = getItemIconAsset('coin');
    if (coinImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(coinImg, x - 12, y - 14, 24, 24);
    } else if (!drawPropStructureSprite(ctx, 'bolsa_botin', x - 14, y - 16, 28, 26)) {
      px(ctx, x - 5, y - 5, 10, 10, '#0D0A14');
      px(ctx, x - 4, y - 4, 8, 8, '#EAB308');
      px(ctx, x - 2, y - 2, 4, 4, '#FEF08A');
    }
  } else if (drop.kind === 'item') {
    const it = ITEMS[drop.itemId];
    const auraCol = it?.quality === 4 ? '#FDE047' : it?.quality === 3 ? '#C084FC' : it?.gemColor || '#38BDF8';
    drawShadow(ctx, x, Math.round(drop.y + 7), 10, 4);
    // Aura circular en el suelo
    ctx.strokeStyle = auraCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, Math.round(drop.y + 5), 12, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Mostrar en el suelo el mismo icono exacto del objeto/gema que aparece en la Mochila y Tienda
    const itemIconImg = getItemIconAsset(drop.itemId);
    if (itemIconImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(itemIconImg, x - 14, y - 17, 28, 28);
    } else {
      const dropKey = it?.type === 'equipment' || it?.type === 'gem' ? 'cofre_botin' : 'bolsa_botin';
      if (!drawPropStructureSprite(ctx, dropKey, x - 14, y - 17, 28, 28)) {
        px(ctx, x - 7, y - 7, 14, 13, '#0D0A14');
        px(ctx, x - 6, y - 5, 12, 10, '#78350F');
      }
    }

    // Etiqueta con nombre del objeto y tiempo restante para recogerlo
    const secs = Math.max(1, Math.ceil(drop.life || 1));
    const label = `${it?.name || 'Objeto'}${drop.qty > 1 ? ` x${drop.qty}` : ''} (${secs}s)`;
    ctx.font = 'bold 10px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    const tw = Math.ceil(ctx.measureText(label).width) + 8;
    ctx.fillStyle = 'rgba(13, 10, 20, 0.82)';
    ctx.fillRect(Math.round(x - tw / 2), y - 22, tw, 13);
    ctx.strokeStyle = auraCol;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - tw / 2) + 0.5, y - 21.5, tw - 1, 12);
    ctx.fillStyle = auraCol;
    ctx.fillText(label, x, y - 12);
  } else {
    drawGemNode(ctx, { x, y, itemId: drop.itemId, collected: false }, time);
  }
  ctx.restore();
}

export function drawNpc(ctx, npc, time) {
  const x = Math.round(npc.x);
  const y = Math.round(npc.y);
  const footY = y + 15;
  drawShadow(ctx, x, footY, 13, 6);

  const npcImg = (npc.heroAssetKey && getAsset(npc.heroAssetKey)) || getNpcAsset(npc.kind);

  if (npc.kind === 'dummy') {
    const wobbleRad = npc.hitFlash > 0 ? Math.sin(time * 48) * 0.18 : 0;
    if (npcImg) {
      drawFootAnchoredSprite(ctx, npcImg, x, footY, 52, {
        frameIndex: npc.hitFlash > 0 ? 3 : 0,
        tiltRad: wobbleRad,
        scaleX: npc.hitFlash > 0 ? 1.04 : 1,
        scaleY: npc.hitFlash > 0 ? 0.96 : 1
      });
      if (npc.hitFlash > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(x - 16, y - 28, 32, 44);
      }
      return;
    }
    const wobble = npc.hitFlash > 0 ? Math.sin(time * 50) * 4 : 0;
    px(ctx, x - 2, y - 4, 4, 20, '#78350F');
    px(ctx, x - 12 + wobble, y - 6, 24, 4, '#92400E');
    px(ctx, x - 8 + wobble, y - 14, 16, 16, '#D9A441');
    px(ctx, x - 6 + wobble, y - 22, 12, 9, '#E5C27A');
    px(ctx, x - 3 + wobble, y - 19, 2, 2, '#0D0A14');
    px(ctx, x + 2 + wobble, y - 19, 2, 2, '#0D0A14');
    return;
  }

  const isMoving = Math.hypot(npc.vx || 0, npc.vy || 0) > 8;
  const isWorkingOrAttacking = (npc.workAnimTimer || 0) > 0;
  const flipLeft = (npc.vx || 0) < -4;

  if (npcImg) {
    let frameIndex = 0;
    if (isWorkingOrAttacking) frameIndex = 3;
    else if (isMoving) frameIndex = Math.floor(time * 9) % 4;
    const breathScaleY = isMoving ? 0.98 + Math.abs(Math.sin(time * 12)) * 0.05 : 1 + Math.sin(time * 3.5 + x * 0.05) * 0.016;
    drawFootAnchoredSprite(ctx, npcImg, x, footY, 52, {
      frameIndex,
      flipX: flipLeft,
      scaleX: 1 - (breathScaleY - 1) * 0.4,
      scaleY: breathScaleY
    });
  } else {
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
    px(ctx, x - 3, y - 15, 2, 2, '#0D0A14');
    px(ctx, x + 2, y - 15, 2, 2, '#0D0A14');
  }

  // Barra de vida, nombre/objetivo e icono 16-bit de emoción sobre los 4 personajes IA y guardias del portal
  if (npc.isAiHero || npc.isPortalGuard) {
    const hpRatio = Math.max(0, Math.min(1, (npc.hp || npc.maxHp || 100) / (npc.maxHp || 100)));
    const barColor = npc.hostile ? '#DC2626' : npc.faction === 'hierro' ? '#F97316' : '#38BDF8';
    px(ctx, x - 18, y - 39, 36, 5, '#0D0A14');
    px(ctx, x - 17, y - 38, Math.round(34 * hpRatio), 3, barColor);

    const goalLabels = {
      talar: 'Talando',
      minar: 'Minando',
      reparar: 'Reparando',
      descansar: 'Descansando',
      refugiarse: 'Refugiado',
      patrullar: 'Patrullando'
    };
    const tag = npc.fleeing
      ? '¡Huyendo!'
      : npc.hostile
      ? '¡Hostil!'
      : npc.isCompanion
      ? 'Acompañante'
      : npc.isPortalGuard
      ? 'Custodio'
      : (goalLabels[npc.goal] || 'Patrullando');
    const titleStr = `${npc.shortName || npc.name.split(' ')[0]} · ${tag}`;
    ctx.font = 'bold 10px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(titleStr, x + 1, y - 42);
    ctx.fillStyle = npc.hostile ? '#FCA5A5' : npc.isCompanion ? '#4ADE80' : '#FDE047';
    ctx.fillText(titleStr, x, y - 43);

    // Burbuja de Emoción 16-bit (Nano Banana) sobre la cabeza
    const emoKey = npc.hostile
      ? 'enojo'
      : npc.fleeing
      ? 'ayuda'
      : npc.isCompanion
      ? 'siguiendo'
      : npc.emotion === 'trabajo'
      ? (npc.goal === 'talar' ? 'talar' : npc.goal === 'minar' ? 'minar' : 'reparar')
      : (npc.emotion || 'feliz');
    const floatY = Math.round(Math.sin(time * 4.5 + x * 0.1) * 2);
    const bx = x;
    const by = y - 61 + floatY;
    // Fondo circular pixel art para el icono de emoción
    px(ctx, bx - 11, by - 11, 22, 22, '#0D0A14');
    px(ctx, bx - 10, by - 10, 20, 20, 'rgba(15, 23, 42, 0.92)');
    if (!drawAiSystemIcon(ctx, emoKey, bx, by, 18)) {
      px(ctx, bx - 4, by - 4, 8, 8, barColor);
    }
    return;
  }

  if (npc.marker) {
    const floatY = Math.sin(time * 5) * 3;
    ctx.font = 'bold 18px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(npc.marker, x + 1, y - 34 + floatY + 1);
    ctx.fillStyle = '#EAB308';
    ctx.fillText(npc.marker, x, y - 34 + floatY);
  }
}

export function drawEnemy(ctx, e, time) {
  const isMoving = Boolean(e.moving);
  const attackAnimTimer = e.attackAnimTimer || 0;
  const atkPhase = computeAttackPhase(attackAnimTimer);
  const atkDirX = e.atkDirX !== undefined ? e.atkDirX : (e.facingRight ? 1 : -1);
  const atkDirY = e.atkDirY !== undefined ? e.atkDirY : 0;
  const lungeDist = e.isBoss ? 18 : 12;
  const lungeX = atkPhase.offset * atkDirX * lungeDist;
  const lungeY = atkPhase.offset * atkDirY * (lungeDist * 0.65);

  const x = Math.round(e.x + lungeX);
  const y = Math.round(e.y + lungeY);
  const footY = y + (e.isBoss ? 24 : 14);
  const shadowFrame = attackAnimTimer > 0.15 ? 3 : isMoving ? Math.floor(time * 9 + (e.id || 0)) % 4 : 0;

  drawShadow(
    ctx,
    e.x + lungeX * 0.4,
    e.y + (e.isBoss ? 24 : 14) + lungeY * 0.4,
    e.radius * 0.88,
    e.radius * 0.42,
    { isBoss: Boolean(e.isBoss), frameIndex: shadowFrame }
  );

  // Si es un enemigo común y su sprite PNG (enemigo_lobo, enemigo_trasgo, enemigo_esqueleto, enemigo_elemental) está cargado:
  const enemyImg = !e.isBoss ? getEnemyAsset(e.kind) : null;
  if (enemyImg) {
    const WALK_FRAMES_4 = [0, 1, 2, 3];
    const metrics = getSpriteFrameMetrics(enemyImg, 0);
    const stepSin = Math.sin(time * 13 + (e.id || 0));
    const stepWave = isMoving ? Math.abs(stepSin) : 0;
    const frameIndex = attackAnimTimer > 0.15
      ? 3
      : isMoving
      ? WALK_FRAMES_4[Math.floor(time * 9 + (e.id || 0)) % 4]
      : 0;
    const bounceY = isMoving ? -stepWave * (metrics.isFourFrameSheet ? 1.4 : 2.8) : 0;
    const idleBreathY = !isMoving ? Math.sin(time * 3.8 + (e.id || 0)) * 0.016 : 0;
    let scaleY = isMoving ? 0.96 + stepWave * 0.08 : 1 + idleBreathY;
    let scaleX = isMoving ? 1.03 - stepWave * 0.05 : 1 - idleBreathY * 0.5;
    if (attackAnimTimer > 0) {
      scaleX *= atkPhase.scaleX;
      scaleY *= atkPhase.scaleY;
    }

    const targetH = e.kind === 'golem_hielo' || e.kind === 'caballero_vacio' ? 54 : 46;
    const facingRight = Boolean(e.facingRight);

    drawFootAnchoredSprite(ctx, enemyImg, x, footY + bounceY, targetH, {
      frameIndex,
      flipX: facingRight,
      tiltRad: 0, // CERO rotación lateral tipo "tronquito"
      scaleX,
      scaleY
    });
  } else if (e.kind === 'lobo' || e.kind === 'lobo_invernal') {
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
    // Brillo rojo intenso en Estado de Furia (<30% vida) usando fx_aura_furia de 4 cuadros
    if (e.furyActive) {
      const furySheet = getAsset('fx_aura_furia');
      if (furySheet) {
        const fFrame = Math.floor(time * 10) % 4;
        drawFootAnchoredSprite(ctx, furySheet, x, footY + 12, 92, { frameIndex: fFrame, alpha: 0.88 });
      }
      ctx.fillStyle = `rgba(220, 38, 38, ${0.24 + Math.sin(time * 12) * 0.1})`;
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
      const WALK_FRAMES_4 = [0, 1, 2, 3];
      const stepWave = isMoving ? Math.abs(Math.sin(time * 11 + (e.id || 0))) : 0;
      const bounceY = isMoving ? -stepWave * 2.2 : 0;
      const idleBreath = !isMoving ? Math.sin(time * 4.0 + (e.id || 0)) * 0.018 : 0;
      let scaleY = isMoving ? 0.96 + stepWave * 0.07 : 1 + idleBreath;
      let scaleX = isMoving ? 1.03 - stepWave * 0.05 : 1 - idleBreath * 0.5;
      if (attackAnimTimer > 0) {
        scaleX *= atkPhase.scaleX;
        scaleY *= atkPhase.scaleY;
      }
      drawFootAnchoredSprite(ctx, bossImg, x, footY + bounceY, 96, {
        frameIndex: attackAnimTimer > 0.15 ? 3 : isMoving ? WALK_FRAMES_4[Math.floor(time * 8) % 4] : 0,
        flipX: Boolean(e.facingRight),
        tiltRad: 0,
        scaleX,
        scaleY
      });
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

  // Efecto visual de zarpazo / tajo / impacto del enemigo o jefe frente a él durante su ataque
  if (attackAnimTimer > 0 && atkPhase.progress > 0.18) {
    const aimAngle = Math.atan2(atkDirY || 0, atkDirX || 1);
    const reach = (e.isBoss ? 26 : 16);
    const sx = x + Math.cos(aimAngle) * reach;
    const sy = y - (e.isBoss ? 12 : 4) + Math.sin(aimAngle) * reach;
    const p = atkPhase.progress;
    ctx.save();
    ctx.strokeStyle = e.isBoss ? '#EF4444' : '#F43F5E';
    ctx.lineWidth = e.isBoss ? 4.5 : 3;
    ctx.beginPath();
    ctx.arc(sx, sy, e.isBoss ? 26 : 15, aimAngle - 0.95 + p * 0.3, aimAngle - 0.6 + p * 1.6);
    ctx.stroke();
    ctx.strokeStyle = '#FECDD3';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(sx, sy, e.isBoss ? 22 : 12, aimAngle - 0.8 + p * 0.3, aimAngle - 0.5 + p * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  if (e.hitFlash > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
    const flashW = e.isBoss ? 68 : 34;
    const flashH = e.isBoss ? 78 : 42;
    ctx.fillRect(Math.round(x - flashW / 2), Math.round(footY - flashH), flashW, flashH);
    ctx.restore();
  }

  if (!e.isBoss && e.hp < e.maxHp) {
    const bw = 38;
    const by = Math.round(footY - (e.kind === 'golem_hielo' ? 58 : 50));
    px(ctx, x - bw / 2 - 1, by - 1, bw + 2, 7, '#0A0D12');
    px(ctx, x - bw / 2, by, bw, 5, '#1E293B');
    const fillW = Math.max(0, Math.round(((bw - 2) * e.hp) / e.maxHp));
    px(ctx, x - bw / 2 + 1, by + 1, fillW, 3, '#EF4444');
    px(ctx, x - bw / 2 + 1, by + 1, fillW, 1, '#FCA5A5');
  }
}

export function drawCrystal(ctx, c, time) {
  if (c.collected) return;
  const voidHalo = getAsset('fx_halo_vacio');
  if (voidHalo) {
    const hFrame = Math.floor(time * 6 + c.x * 0.05) % 4;
    drawFootAnchoredSprite(ctx, voidHalo, c.x, c.y + 20, 48, { frameIndex: hFrame, alpha: 0.65 });
  } else {
    const glow = 0.65 + Math.sin(time * 5 + c.x) * 0.25;
    ctx.save();
    ctx.fillStyle = `rgba(147, 51, 234, ${glow * 0.35})`;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const crystalSheet = getAsset('prop_cristal_vacio');
  if (crystalSheet) {
    const fIdx = Math.floor(time * 5 + c.x * 0.05) % 4;
    drawFootAnchoredSprite(ctx, crystalSheet, c.x, c.y + 12, 38, { frameIndex: fIdx });
    return;
  }
  px(ctx, c.x - 6, c.y - 12, 12, 20, '#0D0A14');
  px(ctx, c.x - 4, c.y - 10, 8, 16, '#7E22CE');
  px(ctx, c.x - 2, c.y - 8, 4, 10, '#E9D5FF');
}

export function drawBuilding(ctx, b, time) {
  // Si el edificio es de Los Clanes de Hierro, usar su arquitectura tribal/forja del Paquete 3
  if (b.isHierro && (b.id === 'taberna' || b.id === 'forja')) {
    if (b.chimney || b.id === 'forja') {
      const cx = b.x + b.w * 0.52;
      const cy = b.y - 6;
      for (let i = 0; i < 3; i++) {
        const puff = ((time * 18) + i * 10) % 28;
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, 0.55 - puff / 50)})`;
        ctx.beginPath();
        ctx.arc(cx + Math.sin(time * 2.2 + i) * 5, cy - puff, 5 + puff * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const hierroKey = b.id === 'forja' ? 'forja_hierro' : 'tienda_hierro';
    if (drawPropStructureSprite(ctx, hierroKey, b.x - 10, b.y - 14, b.w + 20, b.h + 24)) {
      ctx.font = 'bold 13px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      const tw = Math.ceil(ctx.measureText(b.label).width) + 20;
      const bx = Math.round(b.x + b.w / 2 - tw / 2);
      const by = b.y - 4;
      px(ctx, bx - 2, by - 2, tw + 4, 22, '#0D0A14');
      px(ctx, bx, by, tw, 18, '#3B2314');
      px(ctx, bx, by, tw, 2, '#F2B63D');
      px(ctx, bx, by + 16, tw, 2, '#92400E');
      ctx.fillStyle = '#0D0A14';
      ctx.fillText(b.label, b.x + b.w / 2 + 1, by + 14);
      ctx.fillStyle = '#FEF08A';
      ctx.fillText(b.label, b.x + b.w / 2, by + 13);
      return;
    }
  }

  const assetKey =
    b.id === 'forja'
      ? 'edificio_herreria'
      : b.id === 'refugio'
      ? 'edificio_refugio'
      : 'edificio_taberna';
  const bImg = getAsset(assetKey);

  if (bImg) {
    // Humo animado saliendo de la chimenea sobre el sprite ilustrado
    if (b.chimney) {
      const cx = b.x + b.w * 0.78;
      const cy = b.y - 6;
      for (let i = 0; i < 3; i++) {
        const puff = ((time * 18) + i * 10) % 28;
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, 0.55 - puff / 50)})`;
        ctx.beginPath();
        ctx.arc(cx + Math.sin(time * 2.2 + i) * 5, cy - puff, 5 + puff * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bImg, Math.round(b.x - 10), Math.round(b.y - 12), Math.round(b.w + 20), Math.round(b.h + 20));
    ctx.restore();

    // Placa de madera/hierro biselada con el nombre del edificio
    ctx.font = 'bold 13px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    const tw = Math.ceil(ctx.measureText(b.label).width) + 20;
    const bx = Math.round(b.x + b.w / 2 - tw / 2);
    const by = b.y - 4;
    px(ctx, bx - 2, by - 2, tw + 4, 22, '#0D0A14');
    px(ctx, bx, by, tw, 18, '#3B2314');
    px(ctx, bx, by, tw, 2, '#F2B63D');
    px(ctx, bx, by + 16, tw, 2, '#92400E');
    ctx.fillStyle = '#0D0A14';
    ctx.fillText(b.label, b.x + b.w / 2 + 1, by + 14);
    ctx.fillStyle = '#FEF08A';
    ctx.fillText(b.label, b.x + b.w / 2, by + 13);
    return;
  }

  // Fallback si la imagen aún se está cargando
  px(ctx, b.x + 8, b.y + 12, b.w, b.h, 'rgba(8, 10, 16, 0.42)');

  // Chimenea de ladrillo con humo animado en varias volutas
  if (b.chimney) {
    const cx = b.x + b.w - 34;
    const cy = b.y - 16;
    px(ctx, cx - 2, cy - 2, 18, 20, '#0D0A14');
    px(ctx, cx, cy, 14, 18, '#475569');
    px(ctx, cx + 2, cy + 4, 10, 3, '#334155');
    px(ctx, cx - 1, cy - 2, 16, 4, '#64748B');
    for (let i = 0; i < 2; i++) {
      const puff = ((time * 18) + i * 12) % 26;
      ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, 0.52 - puff / 48)})`;
      ctx.beginPath();
      ctx.arc(cx + 7 + Math.sin(time * 2 + i) * 4, cy - 4 - puff, 5 + puff * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cuerpo de fachada con contorno oscuro #0D0A14
  const wallY = b.y + 30;
  const wallH = b.h - 30;
  px(ctx, b.x, wallY, b.w, wallH, '#0D0A14');
  px(ctx, b.x + 3, wallY + 2, b.w - 6, wallH - 5, b.wallColor);

  // Sombra bajo el alero del tejado
  px(ctx, b.x + 3, wallY + 4, b.w - 6, 7, 'rgba(13, 10, 20, 0.35)');

  // Zócalo inferior de bloques de piedra tallada
  const plinthY = b.y + b.h - 18;
  px(ctx, b.x + 3, plinthY, b.w - 6, 15, '#475569');
  for (let sx = b.x + 5; sx < b.x + b.w - 16; sx += 18) {
    px(ctx, sx, plinthY + 2, 15, 6, '#64748B');
    px(ctx, sx, plinthY + 2, 15, 2, '#94A3B8');
    px(ctx, sx + 4, plinthY + 9, 13, 5, '#526071');
  }

  // Entramado medieval de vigas de roble (verticales y horizontal intermedia)
  const timberCol = '#3B2314';
  const timberHi = '#5C3A21';
  px(ctx, b.x + 3, wallY + 4, 6, wallH - 7, timberCol);
  px(ctx, b.x + b.w - 9, wallY + 4, 6, wallH - 7, timberCol);
  px(ctx, b.x + 3, wallY + Math.floor(wallH * 0.48), b.w - 6, 5, timberCol);
  px(ctx, b.x + 3, wallY + Math.floor(wallH * 0.48), b.w - 6, 2, timberHi);
  px(ctx, b.x + 52, wallY + 4, 5, wallH - 20, timberCol);
  px(ctx, b.x + b.w - 57, wallY + 4, 5, wallH - 20, timberCol);

  // Tejado escalonado de tejas 16-bit con cumbrera y alero
  px(ctx, b.x - 8, b.y, b.w + 16, 36, '#0D0A14');
  px(ctx, b.x - 5, b.y + 3, b.w + 10, 30, b.roofColor);
  px(ctx, b.x - 5, b.y + 3, b.w + 10, 6, b.roofHighlight);
  // Filas de tejas pixeladas
  for (let ry = b.y + 11; ry < b.y + 30; ry += 7) {
    px(ctx, b.x - 4, ry, b.w + 8, 2, 'rgba(13, 10, 20, 0.32)');
    for (let rx = b.x - 2 + ((ry % 2) * 8); rx < b.x + b.w - 4; rx += 16) {
      px(ctx, rx, ry - 4, 2, 5, 'rgba(13, 10, 20, 0.22)');
    }
  }
  // Bordes laterales de madera en el tejado
  px(ctx, b.x - 5, b.y + 3, 4, 30, '#D9A441');
  px(ctx, b.x + b.w + 1, b.y + 3, 4, 30, '#D9A441');

  // Puerta arqueada de madera con herrajes y escalón de piedra
  const doorX = Math.round(b.x + b.w / 2 - 16);
  const doorY = b.y + b.h - 38;
  px(ctx, doorX - 4, b.y + b.h - 4, 40, 6, '#94A3B8'); // escalón
  px(ctx, doorX - 2, doorY - 2, 36, 38, '#0D0A14');
  px(ctx, doorX, doorY, 32, 36, '#3B2314');
  px(ctx, doorX + 3, doorY + 3, 12, 32, '#5C3A21');
  px(ctx, doorX + 17, doorY + 3, 12, 32, '#5C3A21');
  // Herrajes y aldaba dorada
  px(ctx, doorX + 2, doorY + 9, 28, 3, '#1E293B');
  px(ctx, doorX + 2, doorY + 24, 28, 3, '#1E293B');
  px(ctx, doorX + 22, doorY + 16, 4, 4, '#FDE047');

  // Faroles encendidos a ambos lados de la puerta con halo cálido
  const lanternGlow = 0.26 + Math.sin(time * 7 + b.x) * 0.08;
  [doorX - 10, doorX + 38].forEach((lx) => {
    const ly = doorY + 10;
    ctx.save();
    ctx.fillStyle = `rgba(250, 204, 21, ${lanternGlow})`;
    ctx.beginPath();
    ctx.arc(lx + 2, ly + 3, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    px(ctx, lx, ly, 5, 7, '#0D0A14');
    px(ctx, lx + 1, ly + 1, 3, 5, '#FEF08A');
  });

  // Ventanas con marco de madera, 4 cristales iluminados y alféizar
  [b.x + 16, b.x + b.w - 42].forEach((wx) => {
    const wy = b.y + 46;
    px(ctx, wx - 2, wy - 2, 28, 24, '#3B2314');
    px(ctx, wx, wy, 24, 20, '#F59E0B');
    px(ctx, wx + 2, wy + 2, 9, 7, '#FEF08A');
    px(ctx, wx + 13, wy + 2, 9, 7, '#FEF08A');
    px(ctx, wx + 11, wy, 2, 20, '#3B2314');
    px(ctx, wx, wy + 9, 24, 2, '#3B2314');
    px(ctx, wx - 3, wy + 20, 30, 4, '#64748B'); // alféizar
  });

  // Detalles temáticos específicos por edificio
  if (b.id === 'forja') {
    // Horno de forja exterior con brasas encendidas a la derecha
    const fx = b.x + b.w - 36;
    const fy = b.y + b.h - 26;
    px(ctx, fx, fy, 24, 20, '#1E293B');
    px(ctx, fx + 4, fy + 6, 16, 12, '#EA580C');
    px(ctx, fx + 7, fy + 9, 10, 7, '#FEF08A');
  } else if (b.id === 'taberna') {
    // Letrero colgante con jarra dorada a la izquierda
    px(ctx, b.x - 12, b.y + 44, 14, 3, '#1E293B');
    px(ctx, b.x - 11, b.y + 47, 12, 12, '#78350F');
    px(ctx, b.x - 8, b.y + 50, 6, 7, '#FDE047');
  }

  // Placa de madera/hierro biselada con el nombre del edificio
  ctx.font = 'bold 13px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  const tw = Math.ceil(ctx.measureText(b.label).width) + 20;
  const bx = Math.round(b.x + b.w / 2 - tw / 2);
  const by = b.y + 8;
  px(ctx, bx - 2, by - 2, tw + 4, 22, '#0D0A14');
  px(ctx, bx, by, tw, 18, '#3B2314');
  px(ctx, bx, by, tw, 2, '#F2B63D');
  px(ctx, bx, by + 16, tw, 2, '#92400E');
  ctx.fillStyle = '#0D0A14';
  ctx.fillText(b.label, b.x + b.w / 2 + 1, by + 14);
  ctx.fillStyle = '#FEF08A';
  ctx.fillText(b.label, b.x + b.w / 2, by + 13);
}

export function drawTree(ctx, t) {
  drawShadow(ctx, t.x, t.y + 18, 22, 9);
  const drawTreeSprite = (assetKey, tw, th, yOffset = 22) => {
    const img = getAsset(assetKey);
    if (!img) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(t.x - tw / 2), Math.round(t.y - th + yOffset), tw, th);
    ctx.restore();
    return true;
  };

  if (t.style === 'snow_pine') {
    if (drawTreeSprite('prop_pino_nevado', 76, 82)) return;
    px(ctx, t.x - 6, t.y + 2, 12, 20, '#3B2314');
    px(ctx, t.x - 22, t.y - 10, 44, 16, '#141018');
    px(ctx, t.x - 20, t.y - 8, 40, 13, '#14532D');
    px(ctx, t.x - 18, t.y - 22, 36, 16, '#166534');
    px(ctx, t.x - 14, t.y - 28, 28, 10, '#F1F5F9');
    px(ctx, t.x - 8, t.y - 36, 16, 10, '#FFFFFF');
  } else if (t.style === 'dry_palm') {
    if (drawTreeSprite('prop_palmera_seca', 78, 84)) return;
    px(ctx, t.x - 5, t.y - 16, 10, 38, '#141018');
    px(ctx, t.x - 4, t.y - 15, 8, 36, '#78350F');
    px(ctx, t.x - 22, t.y - 22, 44, 6, '#92400E');
    px(ctx, t.x - 14, t.y - 28, 28, 6, '#A16207');
  } else if (t.style === 'dead') {
    if (drawTreeSprite('prop_arbol_muerto', 74, 80)) return;
    px(ctx, t.x - 6, t.y, 12, 22, '#3F3F46');
    px(ctx, t.x - 16, t.y - 16, 32, 5, '#52525B');
    px(ctx, t.x - 10, t.y - 26, 20, 5, '#52525B');
  } else {
    // Renderizar el sprite Pixel Art correspondiente (pino morado si está corrupto, árbol verde si no)
    if (drawTreeSprite(t.corrupted ? 'prop_pino_morado' : 'prop_arbol', t.corrupted ? 76 : 74, t.corrupted ? 82 : 78)) return;
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
    if (drawWorldUpgradeSprite(ctx, 'fuente_leones', x - 56, y - 54, 112, 95)) {
      const ripple = 10 + ((time * 16) % 16);
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y + 2, ripple, ripple * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const fountainSheet = getAsset('prop_fuente');
    if (fountainSheet) {
      const frameIndex = Math.floor(time * 7) % 4;
      drawFootAnchoredSprite(ctx, fountainSheet, x, y + 32, 92, { frameIndex });
      return;
    }
    drawShadow(ctx, x, y + 18, 36, 15);
    // Borde exterior de piedra tallada octogonal/elíptica
    ctx.fillStyle = '#0D0A14';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 33, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 31, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 29, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Estanque de agua cristalina con ondas animadas
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 24, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 21, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    const ripple = 8 + ((time * 16) % 13);
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, ripple, ripple * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Columna central escalonada y chorros de agua en cascada
    px(ctx, x - 7, y - 6, 14, 12, '#475569');
    px(ctx, x - 5, y - 14, 10, 12, '#94A3B8');
    px(ctx, x - 9, y - 12, 18, 4, '#CBD5E1');
    const spray = Math.sin(time * 12) * 3;
    px(ctx, x - 3, y - 22 - spray, 6, 10 + spray, '#E0F2FE');
    px(ctx, x - 11, y - 10, 3, 12, '#BAE6FD');
    px(ctx, x + 8, y - 10, 3, 12, '#BAE6FD');
  } else if (prop.kind === 'banner_alba' || prop.kind === 'banner_hierro') {
    const bannerSheet = getAsset(prop.kind === 'banner_alba' ? 'prop_estandarte_alba' : 'prop_estandarte_hierro');
    if (bannerSheet) {
      drawShadow(ctx, x, y + 8, 12, 4);
      const frameIndex = Math.floor(time * 6 + x * 0.05) % 4;
      drawFootAnchoredSprite(ctx, bannerSheet, x + 6, y + 10, 48, { frameIndex });
      return;
    }
    const wave = Math.sin(time * 6 + x) * 2;
    px(ctx, x - 2, y - 26, 4, 34, '#78350F');
    px(ctx, x + 2, y - 24, 14 + wave, 16, prop.kind === 'banner_alba' ? '#1E4E8C' : '#9E2A2B');
    px(ctx, x + 5, y - 20, 6, 6, prop.kind === 'banner_alba' ? '#D9A441' : '#C97A32');
  } else if (prop.kind === 'torch' || prop.kind === 'torch_void') {
    const isVoid = prop.kind === 'torch_void';
    const torchSheet = getAsset(isVoid ? 'prop_antorcha_vacio' : 'prop_antorcha');
    if (torchSheet) {
      ctx.save();
      const gr = ctx.createRadialGradient(x, y - 10, 2, x, y - 10, 34);
      gr.addColorStop(0, isVoid ? 'rgba(168, 85, 247, 0.36)' : 'rgba(251, 146, 60, 0.36)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, y - 10, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawShadow(ctx, x, y + 8, 9, 4);
      const frameIndex = Math.floor(time * 8 + x * 0.07) % 4;
      drawFootAnchoredSprite(ctx, torchSheet, x, y + 10, 42, { frameIndex });
      return;
    }
    px(ctx, x - 2, y - 10, 4, 18, '#57534E');
    const fl = Math.sin(time * 16 + x) * 2;
    px(ctx, x - 4, y - 18 - fl, 8, 9, isVoid ? '#9333EA' : '#EA580C');
    px(ctx, x - 2, y - 16 - fl, 4, 5, isVoid ? '#F0ABFC' : '#FDE047');
  } else if (prop.kind === 'anvil') {
    drawShadow(ctx, x, y + 8, 15, 6);
    const img = getAsset('prop_yunque');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.round(x - 20), Math.round(y - 26), 40, 40);
      ctx.restore();
      if (Math.sin(time * 14) > 0.65) {
        px(ctx, x + 4, y - 16, 3, 3, '#FDE047');
        px(ctx, x - 5, y - 14, 2, 2, '#FB923C');
      }
      return;
    }
    px(ctx, x - 12, y - 4, 24, 10, '#334155');
    px(ctx, x - 7, y + 4, 14, 6, '#1E293B');
    if (Math.sin(time * 14) > 0.6) {
      px(ctx, x + 4, y - 10, 3, 3, '#FDE047');
      px(ctx, x - 6, y - 8, 2, 2, '#FB923C');
    }
  } else if (prop.kind === 'barrel') {
    drawShadow(ctx, x, y + 8, 11, 5);
    const img = getAsset('prop_barril');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.round(x - 16), Math.round(y - 20), 32, 32);
      ctx.restore();
      return;
    }
    px(ctx, x - 8, y - 10, 16, 18, '#78350F');
    px(ctx, x - 8, y - 6, 16, 2, '#334155');
    px(ctx, x - 8, y + 2, 16, 2, '#334155');
  } else if (prop.kind === 'sign') {
    drawShadow(ctx, x, y + 11, 10, 4);
    const img = getAsset('prop_letrero');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.round(x - 20), Math.round(y - 26), 40, 40);
      ctx.restore();
      return;
    }
    px(ctx, x - 2, y - 4, 4, 16, '#78350F');
    px(ctx, x - 14, y - 14, 28, 12, '#A16207');
    px(ctx, x - 10, y - 10, 20, 2, '#FEF08A');
  } else if (prop.kind === 'ruin_pillar' || prop.kind === 'dark_statue') {
    drawShadow(ctx, x, y + 14, 19, 7);
    const img = getAsset(prop.kind === 'dark_statue' ? 'prop_estatua_oscura' : 'prop_pilar_ruina');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.round(x - 26), Math.round(y - 42), 52, 60);
      ctx.restore();
      return;
    }
    px(ctx, x - 14, y - 24, 28, 38, '#0D0A14');
    px(ctx, x - 12, y - 22, 24, 34, prop.kind === 'dark_statue' ? '#312E81' : '#64748B');
    px(ctx, x - 8, y - 18, 16, 6, prop.kind === 'dark_statue' ? '#9333EA' : '#94A3B8');
  } else if (prop.kind === 'minecart' || prop.kind === 'caravan') {
    const isCaravan = prop.kind === 'caravan';
    drawShadow(ctx, x, y + 12, isCaravan ? 30 : 20, 8);
    const img = getAsset(isCaravan ? 'prop_caravana' : 'prop_vagoneta');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (isCaravan) {
        ctx.drawImage(img, Math.round(x - 38), Math.round(y - 42), 76, 60);
      } else {
        ctx.drawImage(img, Math.round(x - 26), Math.round(y - 28), 52, 44);
      }
      ctx.restore();
      return;
    }
    px(ctx, x - 18, y - 10, 36, 18, isCaravan ? '#92400E' : '#475569');
    px(ctx, x - 14, y - 6, 28, 8, isCaravan ? '#D6C7B2' : '#1E293B');
  } else if (prop.kind === 'ice_crystal') {
    drawShadow(ctx, x, y + 10, 14, 5);
    const img = getAsset('prop_cristal_hielo');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.round(x - 21), Math.round(y - 36), 42, 50);
      ctx.restore();
      return;
    }
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
    const crystalSheet = getAsset('prop_cristal_vacio');
    if (crystalSheet) {
      const frameIndex = Math.floor(time * 5) % 4;
      drawFootAnchoredSprite(ctx, crystalSheet, x, y + 26 + fl, 84, { frameIndex });
      return;
    }
    px(ctx, x - 16, y - 44 + fl, 32, 56, '#4C1D95');
    px(ctx, x - 10, y - 54 + fl, 20, 62, '#9333EA');
    px(ctx, x - 4, y - 44 + fl, 8, 42, '#F5D0FE');
  } else if (prop.kind === 'bush') {
    drawShadow(ctx, x, y + 9, 16, 6);
    const img = getAsset('prop_arbusto');
    if (img) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.round(x - 20), Math.round(y - 20), 40, 34);
      ctx.restore();
      return;
    }
    px(ctx, x - 14, y - 8, 28, 16, '#14532D');
    px(ctx, x - 10, y - 12, 20, 12, '#16A34A');
  } else if (prop.kind === 'flower') {
    px(ctx, x - 3, y - 3, 6, 6, prop.color || '#60A5FA');
    px(ctx, x - 1, y - 1, 2, 2, '#FFFFFF');
  } else if (prop.kind === 'trono_vaelor') {
    drawShadow(ctx, x, y + 18, 42, 14);
    drawPropStructureSprite(ctx, 'trono_vaelor', x - 64, y - 140, 128, 165);
  } else if (prop.kind === 'entrada_cueva') {
    drawPropStructureSprite(ctx, 'entrada_cueva', x - 95, y - 110, 190, 142);
  } else if (prop.kind === 'tienda_mercader') {
    drawShadow(ctx, x, y + 18, 52, 16);
    drawPropStructureSprite(ctx, 'tienda_mercader', x - 72, y - 92, 144, 122);
  } else if (prop.kind === 'craneo_desierto') {
    drawShadow(ctx, x, y + 10, 32, 11);
    drawPropStructureSprite(ctx, 'craneo_desierto', x - 44, y - 48, 88, 70);
  } else if (prop.kind === 'roca_nevada') {
    drawShadow(ctx, x, y + 12, 28, 10);
    drawPropStructureSprite(ctx, 'roca_nevada', x - 36, y - 48, 72, 72);
  } else if (prop.kind === 'pino_congelado') {
    drawShadow(ctx, x, y + 14, 22, 9);
    drawPropStructureSprite(ctx, 'pino_congelado', x - 34, y - 68, 68, 88);
  } else if (prop.kind === 'armero_entrenamiento') {
    drawShadow(ctx, x, y + 12, 42, 12);
    drawWorldUpgradeSprite(ctx, 'armero_entrenamiento', x - 64, y - 46, 128, 70);
  } else if (prop.kind === 'rocas_desierto') {
    drawShadow(ctx, x, y + 14, 34, 12);
    drawWorldUpgradeSprite(ctx, 'rocas_desierto', x - 44, y - 58, 88, 90);
  } else if (prop.kind === 'arbusto_seco') {
    drawShadow(ctx, x, y + 8, 16, 6);
    drawWorldUpgradeSprite(ctx, 'arbusto_seco', x - 22, y - 28, 44, 42);
  } else if (prop.kind === 'pozo_aldea') {
    drawShadow(ctx, x, y + 16, 34, 12);
    drawWorldUpgradeSprite(ctx, 'pozo_aldea', x - 38, y - 74, 76, 98);
  } else if (prop.kind === 'farola_aldea') {
    const glow = 0.22 + Math.sin(time * 6 + x) * 0.06;
    ctx.save();
    const gr = ctx.createRadialGradient(x + 10, y - 46, 2, x + 10, y - 46, 38);
    gr.addColorStop(0, `rgba(253, 224, 71, ${glow})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x + 10, y - 46, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawShadow(ctx, x, y + 10, 14, 5);
    drawWorldUpgradeSprite(ctx, 'farola_aldea', x - 22, y - 74, 44, 90);
  } else if (prop.kind === 'pilar_trono_vacio') {
    const glow = 0.26 + Math.sin(time * 7 + y) * 0.08;
    ctx.save();
    const gr = ctx.createRadialGradient(x, y - 42, 3, x, y - 42, 42);
    gr.addColorStop(0, `rgba(168, 85, 247, ${glow})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y - 42, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawShadow(ctx, x, y + 14, 24, 9);
    drawWorldUpgradeSprite(ctx, 'pilar_trono_vacio', x - 28, y - 96, 56, 118);
  } else if (prop.kind === 'totem_hielo') {
    drawShadow(ctx, x, y + 14, 30, 11);
    drawWorldUpgradeSprite(ctx, 'totem_hielo', x - 42, y - 82, 84, 102);
  } else if (prop.kind === 'costillar_dragon') {
    drawShadow(ctx, x, y + 16, 48, 16);
    drawWorldUpgradeSprite(ctx, 'costillar_dragon', x - 68, y - 72, 136, 108);
  }
}
