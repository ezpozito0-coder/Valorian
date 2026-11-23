/**
 * Controlador de HUD, Pantalla de Mejoras (Gemas+Oro), Tienda de Oro y Mascotas, Mochila, Logros y Diálogos.
 */

import {
  MAX_LEVEL,
  CLASSES,
  ITEMS,
  PETS,
  QUALITIES,
  QUESTS,
  ACHIEVEMENTS,
  MAPS_META,
  FACTIONS,
  getClassLabel,
  getTierUpgradeCost,
  getPlusUpgradeCost,
  getQualityUpgradeCost,
  computeWeaponAtkBonus,
  computeArmorBonuses
} from './data.js';
import { sfx } from '../audio.js';
import { getSkillIconSvg } from './preview.js';

let lastIconClass = null;

export function formatQuestStatus(q) {
  if (q.completedAll) return 'Todas las misiones completadas (Salvador de Valoria)';
  if (q.currentId === 1) return '1/5: Habla con el Tabernero';
  if (q.currentId === 2) {
    return q.talkedBlacksmith
      ? `2/5: Golpea el Muñeco (${q.dummyHits}/3)`
      : '2/5: Habla con el Herrero';
  }
  if (q.currentId === 3) return `3/5: Lobos Corruptos (${q.wolvesKilled}/5)`;
  if (q.currentId === 4) {
    return `4/5: Trasgos (${q.goblinsKilled}/4) · Cristales (${q.crystalsCollected}/3)`;
  }
  if (q.currentId === 5) {
    return q.malakorDefeated
      ? '5/5: Vuelve con el Tabernero'
      : '5/5: Derrota a Malakor al fondo de la cueva';
  }
  return '';
}

export function updateHudDom(snap) {
  const cls = CLASSES[snap.heroClass] || CLASSES.guerrero;
  const qual = QUALITIES[snap.weaponQuality] || QUALITIES[0];

  document.getElementById('hud-hero-name').textContent = snap.name;
  const metaEl = document.getElementById('hud-hero-meta');
  metaEl.textContent = `Nv.${snap.level} ${getClassLabel(snap.heroClass, snap.gender)} · +${snap.weaponPlus}`;
  metaEl.style.color = qual.color;

  const hpPct = Math.max(0, Math.min(100, (snap.hp / snap.maxHp) * 100));
  document.getElementById('hud-hp-fill').style.width = `${hpPct}%`;
  document.getElementById('hud-hp-text').textContent = `${snap.hp} / ${snap.maxHp}`;

  // Barra delgada de XP debajo de la vida
  const xpPct =
    snap.level >= MAX_LEVEL
      ? 100
      : Math.max(0, Math.min(100, (snap.xp / Math.max(1, snap.xpNeeded)) * 100));
  const xpFill = document.getElementById('hud-xp-fill');
  if (xpFill) xpFill.style.width = `${xpPct}%`;

  document.getElementById('hud-gold').textContent = `${snap.gold} Oro`;
  document.getElementById('hud-atk').textContent = `ATQ ${snap.atk}`;
  document.getElementById('hud-def').textContent = `DEF ${snap.def}`;
  document.getElementById('hud-zone').textContent = snap.zone;
  document.getElementById('hud-quest-text').textContent = formatQuestStatus(snap.quest);
  document.getElementById('hud-potion-count').textContent = String(snap.potions);
  document.getElementById('hud-bag-count').textContent = `${snap.bagCount}/16`;

  cls.skills.forEach((sk, idx) => {
    const lbl = document.getElementById(`lbl-skill-${idx + 1}`);
    if (lbl) lbl.textContent = sk.short;
  });

  if (lastIconClass !== snap.heroClass) {
    lastIconClass = snap.heroClass;
    for (let i = 0; i < 4; i++) {
      const ico = document.getElementById(`ico-skill-${i}`);
      if (ico) ico.innerHTML = getSkillIconSvg(snap.heroClass, i);
    }
  }

  for (let i = 0; i < 4; i++) {
    const cdEl = document.getElementById(`cd-skill-${i}`);
    if (cdEl) {
      const rem = snap.cooldowns[i];
      const maxCd = i === 0 ? cls.basicCooldown : (cls.skills[i - 1]?.cooldown || 1);
      if (rem > 0.08) {
        cdEl.textContent = rem.toFixed(1);
        const deg = Math.round((rem / maxCd) * 360);
        cdEl.style.background = `conic-gradient(rgba(13,10,20,0.78) ${deg}deg, rgba(13,10,20,0.2) 0deg)`;
      } else {
        cdEl.textContent = '';
        cdEl.style.background = '';
      }
    }
  }

  const bossWrap = document.getElementById('hud-boss-bar');
  if (snap.boss) {
    bossWrap.classList.remove('hidden');
    const bossNameEl = bossWrap.querySelector('.hud-boss-name');
    if (bossNameEl) bossNameEl.textContent = snap.boss.name || 'Jefe';
    const bp = Math.max(0, (snap.boss.hp / snap.boss.maxHp) * 100);
    document.getElementById('hud-boss-fill').style.width = `${bp}%`;
    document.getElementById('hud-boss-text').textContent = `${snap.boss.hp} / ${snap.boss.maxHp}`;
  } else {
    bossWrap.classList.add('hidden');
  }

  const promptBtn = document.getElementById('btn-interact-prompt');
  if (snap.interactable) {
    promptBtn.classList.remove('hidden');
    promptBtn.textContent = snap.interactable.label;
  } else {
    promptBtn.classList.add('hidden');
  }
}

/* =========================================================
   PANTALLA DE MEJORAS DIRECTA (RUBÍ / ESMERALDA / ZAFIRO + ORO)
   ========================================================= */
export function renderUpgradesModal(engine, pieceKey, onToast, onSave) {
  const container = document.getElementById('upgrades-content');
  const p = engine.player;
  const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
  const piece = p.equipment[pieceKey];
  const qual = QUALITIES[piece.quality] || QUALITIES[0];
  const pieceName = pieceKey === 'weapon' ? cls.weapon : cls.armor;

  document.getElementById('upgrades-gold').textContent = `${p.gold} Oro`;

  const rubies = engine.getItemQty('gema_rubi');
  const emeralds = engine.getItemQty('gema_esmeralda');
  const sapphires = engine.getItemQty('gema_zafiro');

  const statSummary =
    pieceKey === 'weapon'
      ? `Bono actual: +${computeWeaponAtkBonus(piece)} ATQ`
      : (() => {
          const b = computeArmorBonuses(piece);
          return `Bono actual: +${b.def} DEF · +${b.hp} Vida`;
        })();

  const glowLabel =
    piece.plus >= 12
      ? ' · ✨ Brillo Supremo (+12)'
      : piece.plus >= 9
      ? ' · ✨ Brillo Activo (+9)'
      : '';

  container.innerHTML = `
    <div class="equip-summary-card">
      <div>
        <strong class="equip-name ${piece.quality === 4 ? 'legendary-glow' : ''}" style="color:${qual.color}">
          ${pieceName} +${piece.plus}
        </strong>
        <div class="equip-meta-line">
          Nivel de equipo: <strong>${piece.tier}</strong> · Calidad: <strong style="color:${qual.color}">${qual.name}</strong>${glowLabel}
        </div>
        <small>${statSummary}</small>
      </div>
      <div class="gem-counts">
        <span class="gem-pill rubi">♦️ ${rubies}</span>
        <span class="gem-pill esmeralda">💚 ${emeralds}</span>
        <span class="gem-pill zafiro">💎 ${sapphires}</span>
      </div>
    </div>
  `;

  // 1. Subir Nivel de Equipo (Rubí + Oro)
  const tierCost = getTierUpgradeCost(piece);
  container.appendChild(
    buildUpgradeRow({
      title: 'Subir Nivel de Equipo (Rubí)',
      subtitle: tierCost
        ? `Nv. ${piece.tier} → Nv. ${tierCost.nextTier} · Costo: ${tierCost.gemQty}x Rubí + ${tierCost.gold} Oro`
        : 'Nivel máximo alcanzado (Nv. 90).',
      btnLabel: tierCost ? `Subir a Nv. ${tierCost.nextTier}` : 'Máximo',
      disabled: !tierCost || p.gold < tierCost.gold || rubies < tierCost.gemQty,
      onClick: () => {
        if (!tierCost || p.gold < tierCost.gold || !engine.consumeItem('gema_rubi', tierCost.gemQty)) {
          onToast('Te falta Rubí u Oro.', 'error');
          return;
        }
        p.gold -= tierCost.gold;
        piece.tier = tierCost.nextTier;
        engine.recalcDerivedStats(true);
        sfx.playUpgrade();
        onToast(`${pieceName} subió a Nivel ${piece.tier}.`, 'success');
        engine.checkAchievements();
        onSave();
        renderUpgradesModal(engine, pieceKey, onToast, onSave);
      }
    })
  );

  // 2. Subir Mejora +1 a +12 (Esmeralda + Oro)
  const plusCost = getPlusUpgradeCost(piece);
  container.appendChild(
    buildUpgradeRow({
      title: 'Reforzar Equipo +1 a +12 (Esmeralda)',
      subtitle: plusCost
        ? `+${piece.plus} → +${plusCost.nextPlus} (brillo desde +9, máximo +12) · Costo: ${plusCost.gemQty}x Esmeralda + ${plusCost.gold} Oro`
        : 'Mejora máxima alcanzada (+12 Brillo Supremo).',
      btnLabel: plusCost ? `Mejorar a +${plusCost.nextPlus}` : 'Máximo',
      disabled: !plusCost || p.gold < plusCost.gold || emeralds < plusCost.gemQty,
      onClick: () => {
        if (!plusCost || p.gold < plusCost.gold || !engine.consumeItem('gema_esmeralda', plusCost.gemQty)) {
          onToast('Te falta Esmeralda u Oro.', 'error');
          return;
        }
        p.gold -= plusCost.gold;
        piece.plus = plusCost.nextPlus;
        engine.recalcDerivedStats(true);
        sfx.playUpgrade();
        onToast(`${pieceName} mejorada a +${piece.plus}.`, 'success');
        engine.checkAchievements();
        onSave();
        renderUpgradesModal(engine, pieceKey, onToast, onSave);
      }
    })
  );

  // 3. Subir Calidad (Zafiro + Oro)
  const qualCost = getQualityUpgradeCost(piece);
  const nextQualObj = qualCost ? QUALITIES[qualCost.nextQuality] : null;
  container.appendChild(
    buildUpgradeRow({
      title: 'Elevar Calidad (Zafiro)',
      subtitle: qualCost
        ? `${qual.name} → ${nextQualObj.name} · Costo: ${qualCost.gemQty}x Zafiro + ${qualCost.gold} Oro`
        : 'Calidad máxima alcanzada (Legendario).',
      btnLabel: qualCost ? `Subir a ${nextQualObj.name}` : 'Máximo',
      disabled: !qualCost || p.gold < qualCost.gold || sapphires < qualCost.gemQty,
      onClick: () => {
        if (!qualCost || p.gold < qualCost.gold || !engine.consumeItem('gema_zafiro', qualCost.gemQty)) {
          onToast('Te falta Zafiro u Oro.', 'error');
          return;
        }
        p.gold -= qualCost.gold;
        piece.quality = qualCost.nextQuality;
        engine.recalcDerivedStats(true);
        sfx.playUpgrade();
        onToast(`¡${pieceName} ahora es ${nextQualObj.name}!`, 'success');
        engine.checkAchievements();
        onSave();
        renderUpgradesModal(engine, pieceKey, onToast, onSave);
      }
    })
  );
}

function buildUpgradeRow({ title, subtitle, btnLabel, disabled, onClick }) {
  const row = document.createElement('div');
  row.className = 'forge-item';
  row.innerHTML = `<div><strong>${title}</strong><br/><small>${subtitle}</small></div>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-primary btn-sm';
  btn.textContent = btnLabel;
  btn.disabled = disabled;
  btn.addEventListener('click', onClick);
  row.appendChild(btn);
  return row;
}

/* =========================================================
   TIENDA DE ORO Y MASCOTAS
   ========================================================= */
export function renderShopModal(engine, shopTab, onToast, onSave) {
  const container = document.getElementById('shop-content');
  const p = engine.player;
  document.getElementById('shop-gold').textContent = `${p.gold} Oro`;
  container.innerHTML = '';

  if (shopTab === 'pets') {
    for (const pet of Object.values(PETS)) {
      const owned = p.ownedPets.includes(pet.id);
      const equipped = p.activePet === pet.id;
      const row = document.createElement('div');
      row.className = 'forge-item';
      row.innerHTML = `
        <div>
          <strong>${pet.icon} ${pet.name}</strong> ${equipped ? '<span class="tag-equipped">Equipada</span>' : ''}<br/>
          <small>${pet.desc}</small>
        </div>
      `;

      const btn = document.createElement('button');
      btn.type = 'button';
      if (!owned) {
        btn.className = 'btn btn-primary btn-sm';
        btn.textContent = `Comprar (${pet.price} Oro)`;
        btn.disabled = p.gold < pet.price;
        btn.addEventListener('click', () => {
          if (p.gold < pet.price) return;
          p.gold -= pet.price;
          p.ownedPets.push(pet.id);
          p.activePet = pet.id;
          sfx.playBuy();
          onToast(`¡Compraste y equipaste a ${pet.name}!`, 'success');
          engine.checkAchievements();
          onSave();
          renderShopModal(engine, shopTab, onToast, onSave);
        });
      } else {
        btn.className = equipped ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
        btn.textContent = equipped ? 'Desequipar' : 'Equipar';
        btn.addEventListener('click', () => {
          p.activePet = equipped ? null : pet.id;
          sfx.playCoin();
          onToast(p.activePet ? `${pet.name} ahora te acompaña.` : 'Mascota guardada.');
          onSave();
          renderShopModal(engine, shopTab, onToast, onSave);
        });
      }
      row.appendChild(btn);
      container.appendChild(row);
    }
    return;
  }

  const listIds =
    shopTab === 'consumables'
      ? ['pocion_vida', 'pocion_grande', 'pocion_velocidad']
      : ['gema_rubi', 'gema_esmeralda', 'gema_zafiro', 'pergamino_aldea'];

  for (const id of listIds) {
    const item = ITEMS[id];
    const row = document.createElement('div');
    row.className = 'forge-item';
    row.innerHTML = `
      <div>
        <strong>${item.icon} ${item.name}</strong><br/>
        <small>${item.desc} · ${item.price} Oro</small>
      </div>
    `;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = `Comprar (${item.price} Oro)`;
    btn.disabled = p.gold < item.price;
    btn.addEventListener('click', () => {
      if (p.gold < item.price) return;
      if (engine.addItemToBackpack(id, 1)) {
        p.gold -= item.price;
        sfx.playBuy();
        onToast(`Compraste 1x ${item.name}.`, 'success');
        onSave();
        renderShopModal(engine, shopTab, onToast, onSave);
      }
    });
    row.appendChild(btn);
    container.appendChild(row);
  }
}

/* =========================================================
   MOCHILA (16 ESPACIOS) Y LOGROS
   ========================================================= */
export function renderBackpackModal(engine, onSave, onCloseModal) {
  const grid = document.getElementById('backpack-grid');
  const detail = document.getElementById('backpack-detail');
  const bag = engine.player.backpack;

  document.getElementById('bag-slots-label').textContent = `${bag.length}/16`;
  document.getElementById('bag-gold-label').textContent = `${engine.player.gold} Oro`;

  grid.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const slot = bag[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `bag-slot ${slot ? 'filled' : 'empty'}`;
    if (slot && ITEMS[slot.id]) {
      const item = ITEMS[slot.id];
      btn.innerHTML = `<span style="font-size:1.35rem">${item.icon}</span><strong>${item.name}</strong><small>x${slot.qty}</small>`;
      btn.addEventListener('click', () => {
        detail.innerHTML = `<div><strong>${item.name} (x${slot.qty})</strong><br/><small>${item.desc}</small></div>`;
        if (item.type === 'consumable') {
          const useBtn = document.createElement('button');
          useBtn.type = 'button';
          useBtn.className = 'btn btn-primary btn-sm';
          useBtn.textContent = item.teleportVillage ? 'Teletransportar' : 'Usar ahora';
          useBtn.addEventListener('click', () => {
            if (engine.useConsumable(item.id)) {
              onSave();
              if (item.teleportVillage) {
                onCloseModal?.();
              } else {
                renderBackpackModal(engine, onSave, onCloseModal);
              }
            }
          });
          detail.appendChild(useBtn);
        }
      });
    } else {
      btn.innerHTML = '<small>Vacío</small>';
    }
    grid.appendChild(btn);
  }
}

export function renderAchievementsModal(saveData) {
  const list = document.getElementById('achievements-list');
  list.innerHTML = '';
  const unlockedSet = new Set(saveData?.unlockedAchievements || []);

  for (const ach of ACHIEVEMENTS) {
    const isDone = saveData ? unlockedSet.has(ach.id) || ach.check(saveData) : false;
    const prog = saveData ? ach.progress(saveData) : '0';
    const card = document.createElement('div');
    card.className = `achievement-card ${isDone ? 'unlocked' : ''}`;
    card.innerHTML = `
      <span class="ach-icon">${ach.icon}</span>
      <div class="ach-info">
        <strong>${ach.title}</strong>
        <small>${ach.desc}</small>
      </div>
      <span class="ach-status">${isDone ? '✓ Logrado' : prog}</span>
    `;
    list.appendChild(card);
  }
}

/* =========================================================
   DIÁLOGOS NPC (TABERNERO Y HERRERO)
   ========================================================= */
export function buildNpcDialog(npc, engine, { onClose, onOpenUpgrades, onSave }) {
  const q = engine.player.quest;
  const isFem = engine.player.gender === 'female';
  const titleEl = document.getElementById('dialog-npc-name');
  const bodyEl = document.getElementById('dialog-text');
  const actionsEl = document.getElementById('dialog-actions');
  actionsEl.innerHTML = '';

  titleEl.textContent = npc.name;

  if (npc.kind === 'tabernero') {
    if (q.currentId === 1) {
      bodyEl.textContent = isFem
        ? '¡Bienvenida a Valoria, aventurera! La Fractura del Vacío está corrompiendo el bosque y la cueva al norte.\n\nToma estas pociones de vida y ve a hablar con el Herrero. Si te hieren, descansa junto a la fogata de la plaza.'
        : '¡Bienvenido a Valoria, aventurero! La Fractura del Vacío está corrompiendo el bosque y la cueva al norte.\n\nToma estas pociones de vida y ve a hablar con el Herrero. Si te hieren, descansa junto a la fogata de la plaza.';
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Aceptar Pociones y Misión 2';
      btn.addEventListener('click', () => {
        engine.completeQuest(1);
        onSave();
        onClose();
      });
      actionsEl.appendChild(btn);
    } else if (q.currentId === 5 && q.malakorDefeated && !q.completedAll) {
      bodyEl.textContent =
        '¡Lo lograste! Has derrotado a Malakor, el Guardián Caído, y sellado la grieta de la cueva.\n\nValoria recordará tu nombre por generaciones. Toma tu recompensa final y gemas de forja.';
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Reclamar Recompensa Final';
      btn.addEventListener('click', () => {
        engine.completeQuest(5);
        onSave();
        onClose();
      });
      actionsEl.appendChild(btn);
    } else if (q.completedAll) {
      bodyEl.textContent = isFem
        ? '¡Salud, Salvadora de Valoria! Sigue subiendo hasta Nivel 90, recolectando gemas y buscando los 6 cofres escondidos.'
        : '¡Salud, Salvador de Valoria! Sigue subiendo hasta Nivel 90, recolectando gemas y buscando los 6 cofres escondidos.';
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Cerrar';
      btn.addEventListener('click', onClose);
      actionsEl.appendChild(btn);
    } else {
      const cur = QUESTS.find((x) => x.id === q.currentId);
      bodyEl.textContent = `Misión actual: ${cur?.title}\n${cur?.objective}\n\n¡Recuerda que puedes descansar en la fogata para curarte gratis!`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Entendido';
      btn.addEventListener('click', onClose);
      actionsEl.appendChild(btn);
    }
    return;
  }

  if (npc.kind === 'herrero') {
    if (q.currentId === 2 && !q.talkedBlacksmith) {
      q.talkedBlacksmith = true;
      engine.updateNpcMarkers();
      onSave();
      bodyEl.textContent = isFem
        ? '¡Bienvenida a la forja, guerrera! Antes de ir al bosque, prueba tus golpes en los Muñecos de Entrenamiento (3 golpes).\n\nUsa Rubíes, Esmeraldas y Zafiros junto con Oro en la Pantalla de Mejoras para potenciar tu arma y armadura.'
        : '¡Buen acero necesitas para enfrentar al Vacío! Antes de ir al bosque, prueba tus golpes en los Muñecos de Entrenamiento (3 golpes).\n\nUsa Rubíes, Esmeraldas y Zafiros junto con Oro en la Pantalla de Mejoras para potenciar tu arma y armadura.';
    } else {
      bodyEl.textContent = isFem
        ? '¿Lista para mejorar tu arma o armadura con Gemas y Oro? También puedes abrir Mejoras desde cualquier lugar del mapa.'
        : '¿Listo para mejorar tu arma o armadura con Gemas y Oro? También puedes abrir Mejoras desde cualquier lugar del mapa.';
    }

    const forgeBtn = document.createElement('button');
    forgeBtn.className = 'btn btn-primary';
    forgeBtn.textContent = 'Abrir Mejoras de Equipo';
    forgeBtn.addEventListener('click', () => {
      onClose();
      onOpenUpgrades();
    });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary';
    closeBtn.textContent = 'Salir';
    closeBtn.addEventListener('click', onClose);

    actionsEl.appendChild(forgeBtn);
    actionsEl.appendChild(closeBtn);
  }
}

/* =========================================================
   MAPA DEL MUNDO (VIAJE RÁPIDO) Y BANNER DE ZONA
   ========================================================= */
export function renderWorldMapModal(engine, onClose) {
  const wrap = document.getElementById('worldmap-list');
  const p = engine.player;
  wrap.innerHTML = '';

  const ordered = Object.values(MAPS_META).sort((a, b) => a.order - b.order);
  for (const m of ordered) {
    const visited = p.visitedMaps.includes(m.id);
    const isCurrent = p.currentMap === m.id;
    const displayName = m.id === 'aldea' ? (FACTIONS[p.faction]?.villageName || m.name) : m.name;

    const card = document.createElement('div');
    card.className = `worldmap-card ${visited ? 'visited' : 'locked'} ${isCurrent ? 'current' : ''}`;
    card.style.borderLeftColor = m.color;
    card.innerHTML = `
      <div>
        <strong>${m.order}. ${displayName}</strong>
        <span class="worldmap-lvl">${m.levelRange}</span>
        <p>${m.desc}</p>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (isCurrent) {
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = 'Aquí estás';
      btn.disabled = true;
    } else if (visited) {
      btn.className = 'btn btn-primary btn-sm';
      btn.textContent = 'Viajar';
      btn.addEventListener('click', () => {
        engine.fastTravelTo(m.id);
        onClose();
      });
    } else {
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = `Sin visitar (Nv.${m.reqLevel})`;
      btn.disabled = true;
    }

    card.appendChild(btn);
    wrap.appendChild(card);
  }
}

let bannerTimer = null;
export function showZoneBanner(title, subtitle) {
  const el = document.getElementById('zone-banner');
  if (!el) return;
  document.getElementById('zone-banner-title').textContent = title;
  document.getElementById('zone-banner-sub').textContent = subtitle || '';
  el.classList.remove('hidden');
  el.classList.add('show');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    el.classList.remove('show');
    el.classList.add('hidden');
  }, 2600);
}
