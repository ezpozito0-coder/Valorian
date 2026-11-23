/**
 * Controlador de HUD Horizontal 16:9, Características (Equipo 12 ranuras / Habilidades / Talentos),
 * Mascotas de Valoria, Jefes de Valoria, Mapa Ilustrado, Mejoras, Tienda, Logros y Diálogos.
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
  DEFENSE_SLOTS,
  OFFENSE_SLOTS,
  TALENTS,
  TITLES,
  BOSS_META,
  getClassLabel,
  petXpNeeded,
  getTierUpgradeCost,
  getPlusUpgradeCost,
  getQualityUpgradeCost,
  computeWeaponAtkBonus,
  computeArmorBonuses
} from './data.js';
import { sfx } from '../audio.js';
import {
  getSkillIconSvg,
  drawDetailedHeroSprite,
  drawPetSprite,
  drawIllustratedWorldMap
} from './preview.js';

let lastIconClass = null;
let selectedBagIndex = -1;
let selectedWorldMapId = 'aldea';
let worldMapNodes = [];

export function formatQuestStatus(q) {
  if (q.completedAll) return 'Misiones completadas (Explora hasta Nv. 90)';
  if (q.currentId === 1) return '1/5: Habla con el Tabernero';
  if (q.currentId === 2) return q.talkedBlacksmith ? `2/5: Golpea los Muñecos (${q.dummyHits}/3)` : '2/5: Habla con el Herrero';
  if (q.currentId === 3) return `3/5: Lobos Corruptos (${q.wolvesKilled}/5)`;
  if (q.currentId === 4) return `4/5: Trasgos (${q.goblinsKilled}/4) · Cristales (${q.crystalsCollected}/3)`;
  if (q.currentId === 5) return q.malakorDefeated ? '5/5: Vuelve con el Tabernero' : '5/5: Derrota a Malakor en la Cueva';
  return '';
}

export function updateHudDom(snap) {
  const cls = CLASSES[snap.heroClass] || CLASSES.guerrero;
  const classEmoji = snap.heroClass === 'mago' ? '🪄' : snap.heroClass === 'arquero' ? '🏹' : '⚔️';

  const icoEl = document.getElementById('hud-class-icon');
  if (icoEl) icoEl.textContent = classEmoji;
  const lvlEl = document.getElementById('hud-level-badge');
  if (lvlEl) lvlEl.textContent = `Nv.${snap.level}`;

  document.getElementById('hud-hero-name').textContent = snap.name;
  document.getElementById('hud-gold').textContent = `${snap.gold} Oro`;

  const hpPct = Math.max(0, Math.min(100, (snap.hp / Math.max(1, snap.maxHp)) * 100));
  document.getElementById('hud-hp-fill').style.width = `${hpPct}%`;
  document.getElementById('hud-hp-text').textContent = `PV ${snap.hp}/${snap.maxHp}`;

  const mpPct = Math.max(0, Math.min(100, (snap.mp / Math.max(1, snap.maxMp)) * 100));
  const mpFill = document.getElementById('hud-mp-fill');
  if (mpFill) mpFill.style.width = `${mpPct}%`;
  const mpText = document.getElementById('hud-mp-text');
  if (mpText) mpText.textContent = `PM ${snap.mp}/${snap.maxMp}`;

  const xpPct = snap.level >= MAX_LEVEL ? 100 : Math.max(0, Math.min(100, (snap.xp / Math.max(1, snap.xpNeeded)) * 100));
  const xpFill = document.getElementById('hud-xp-fill');
  if (xpFill) xpFill.style.width = `${xpPct}%`;

  // Recuadro de Mascota activa
  const petObj = snap.activePet ? PETS[snap.activePet] : null;
  if (petObj) {
    document.getElementById('hud-pet-icon').textContent = petObj.icon;
    document.getElementById('hud-pet-name').textContent = petObj.name;
    document.getElementById('hud-pet-lvl').textContent = `Nv.${snap.petLevel}`;
    const pPct = Math.min(100, (snap.petXp / Math.max(1, snap.petXpNeeded)) * 100);
    document.getElementById('hud-pet-xp').style.width = `${pPct}%`;
  } else {
    document.getElementById('hud-pet-icon').textContent = '🐾';
    document.getElementById('hud-pet-name').textContent = 'Sin mascota';
    document.getElementById('hud-pet-lvl').textContent = 'Abrir';
    document.getElementById('hud-pet-xp').style.width = '0%';
  }

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

  // Barra metálica de Jefe con Calavera y Furia
  const bossWrap = document.getElementById('hud-boss-bar');
  if (snap.boss) {
    bossWrap.classList.remove('hidden');
    document.getElementById('hud-boss-name').textContent = snap.boss.name;
    document.getElementById('hud-boss-fury').classList.toggle('hidden', !snap.boss.fury);
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
   VENTANA UNIFICADA DE CARACTERÍSTICAS (EQUIPO / HABILIDADES / TALENTOS)
   ========================================================= */
export function renderCharacterModal(engine, activeTab, { onToast, onSave, onOpenUpgrades, onOpenPets, onClose }) {
  const body = document.getElementById('character-tab-body');
  const p = engine.player;
  const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
  const st = engine.getComputedStats();

  if (activeTab === 'equipo') {
    const renderSlot = (slotDef) => {
      const val = p.gearSlots?.[slotDef.id];
      const item = val && ITEMS[val] ? ITEMS[val] : null;
      const pet = slotDef.id === 'mascota' && p.activePet ? PETS[p.activePet] : null;
      const isBase = val === 'base';
      const filled = Boolean(item || pet || isBase);
      const isLeg = item?.quality === 4;
      const icon = item ? item.icon : pet ? pet.icon : slotDef.icon;
      const tip = item ? `${item.name}: ${item.desc}` : pet ? `${pet.name} (Nv.${p.petProgress?.[pet.id]?.level || 1})` : slotDef.label;
      return `<button type="button" class="gear-slot-btn ${filled ? 'equipped' : ''} ${isLeg ? 'legendary' : ''}" data-gear-slot="${slotDef.id}" title="${tip}">
        <span style="font-size:1.1rem">${icon}</span>
        <span>${slotDef.label.slice(0, 6)}</span>
      </button>`;
    };

    const titleOpts = [
      `<option value="">Sin título</option>`,
      ...(p.unlockedTitles || []).map((tId) => {
        const t = TITLES[tId];
        return t ? `<option value="${tId}" ${p.activeTitle === tId ? 'selected' : ''}>${t.name} (${t.bonusText})</option>` : '';
      })
    ].join('');

    body.innerHTML = `
      <div class="char-equip-layout">
        <div class="equip-doll-panel">
          <div class="equip-doll-grid">
            <div class="equip-col">${DEFENSE_SLOTS.map(renderSlot).join('')}</div>
            <div class="doll-center-wrap">
              <canvas id="char-doll-canvas" width="190" height="180"></canvas>
              <strong style="font-family:var(--font-pixel)">${p.name} · Nv.${p.level} ${getClassLabel(p.heroClass, p.gender)}</strong>
            </div>
            <div class="equip-col">${OFFENSE_SLOTS.map(renderSlot).join('')}</div>
          </div>

          <div class="title-picker-row">
            <label for="select-active-title">Título:</label>
            <select id="select-active-title">${titleOpts}</select>
          </div>

          <div class="stats-box">
            <span>Vida: <strong>${st.maxHp}</strong></span>
            <span>Defensa: <strong>${st.def}</strong></span>
            <span>Energía (PM): <strong>${st.maxMp}</strong></span>
            <span>Velocidad: <strong>${Math.round(st.speed / 20)}</strong></span>
            <span>Ataque: <strong>${st.atk} (+${p.equipment.weapon.plus})</strong></span>
            <span>Crítico: <strong>${st.crit}%</strong></span>
          </div>

          <button type="button" id="btn-char-go-upgrades" class="btn btn-gold btn-sm">⚒️ Abrir Mejoras (Gemas + Oro)</button>
        </div>

        <div class="bag-panel">
          <div class="modal-head">
            <strong>Mochila (${p.backpack.length}/16)</strong>
            <span class="hud-stat gold">${p.gold} Oro</span>
          </div>
          <div id="char-bag-grid" class="backpack-grid"></div>
          <div id="char-bag-detail" class="backpack-detail">Selecciona un objeto para usarlo o equiparlo.</div>
          <div class="bag-footer-bar">
            <span class="hud-stat gold">🪙 ${p.gold} Oro</span>
            <button type="button" id="btn-char-use-equip" class="btn btn-gold btn-sm" disabled>Usar / Equipar</button>
          </div>
        </div>
      </div>
    `;

    // Dibujar silueta a color + alas + mascota en el centro
    const dollCanvas = document.getElementById('char-doll-canvas');
    if (dollCanvas) {
      const ctx = dollCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#121725';
      ctx.fillRect(0, 0, 190, 180);
      drawDetailedHeroSprite(ctx, 82, 108, 3.1, {
        faction: p.faction, gender: p.gender, race: p.race, heroClass: p.heroClass,
        wings: p.gearSlots?.alas || null, dir: 0, attackTimer: 0
      }, performance.now() / 1000);
      if (p.activePet) drawPetSprite(ctx, p.activePet, 146, 134, 1.8, performance.now() / 1000);
    }

    document.getElementById('select-active-title').addEventListener('change', (e) => {
      p.activeTitle = e.target.value || null;
      onSave();
      onToast(p.activeTitle ? `Título equipado: ${TITLES[p.activeTitle].name}` : 'Título ocultado.');
    });

    document.getElementById('btn-char-go-upgrades').addEventListener('click', () => onOpenUpgrades());
    body.querySelector('[data-gear-slot="mascota"]')?.addEventListener('click', () => onOpenPets());

    // Renderizar cuadrícula 4x4 de mochila
    const bagGrid = document.getElementById('char-bag-grid');
    const detailEl = document.getElementById('char-bag-detail');
    const useBtn = document.getElementById('btn-char-use-equip');
    selectedBagIndex = -1;

    for (let i = 0; i < 16; i++) {
      const slot = p.backpack[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `bag-slot ${slot ? 'filled' : 'empty'}`;
      if (slot && ITEMS[slot.id]) {
        const it = ITEMS[slot.id];
        b.innerHTML = `<span style="font-size:1.25rem">${it.icon}</span><strong>${it.name.slice(0, 11)}</strong><small>x${slot.qty}</small>`;
        b.addEventListener('click', () => {
          selectedBagIndex = i;
          detailEl.innerHTML = `<div><strong>${it.name} (x${slot.qty})</strong><br/><small>${it.desc}</small></div>`;
          useBtn.disabled = !(it.type === 'consumable' || it.type === 'equipment');
          useBtn.textContent = it.type === 'equipment' ? 'Equipar' : it.teleportVillage ? 'Teletransportar' : 'Usar';
        });
      } else {
        b.innerHTML = '<small>—</small>';
      }
      bagGrid.appendChild(b);
    }

    useBtn.addEventListener('click', () => {
      const slot = p.backpack[selectedBagIndex];
      if (!slot || !ITEMS[slot.id]) return;
      const it = ITEMS[slot.id];
      if (it.type === 'equipment') {
        const targetSlot = it.slot === 'anillo1' && p.gearSlots.anillo1 && !p.gearSlots.anillo2 ? 'anillo2' : it.slot;
        p.gearSlots[targetSlot] = it.id;
        engine.recalcDerivedStats(true);
        sfx.playUpgrade();
        onToast(`¡Equipaste ${it.name}!`, 'success');
        onSave();
        renderCharacterModal(engine, 'equipo', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
      } else if (it.type === 'consumable') {
        if (engine.useConsumable(it.id)) {
          onSave();
          if (it.teleportVillage) onClose();
          else renderCharacterModal(engine, 'equipo', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
        }
      }
    });
    return;
  }

  if (activeTab === 'habilidades') {
    const resetCost = 200;
    body.innerHTML = `
      <div class="skills-tab-layout">
        <div class="bag-footer-bar">
          <strong>Puntos de Habilidad disponibles: <span style="color:#FDE047">${p.skillPoints || 0}</span></strong>
          <button type="button" id="btn-reset-skills" class="btn btn-secondary btn-sm">Restablecer (${resetCost} Oro)</button>
        </div>
        <div id="skills-list-rows" class="forge-content"></div>
      </div>
    `;
    const rowsWrap = document.getElementById('skills-list-rows');
    cls.skills.forEach((sk, idx) => {
      const lvl = p.skillLevels?.[idx] || 1;
      const row = document.createElement('div');
      row.className = 'skill-upgrade-row';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          <div>${getSkillIconSvg(p.heroClass, idx + 1)}</div>
          <div>
            <strong>${sk.name}</strong> <span style="color:#FDE047">Nv.${lvl}/5</span><br/>
            <small>${sk.desc}</small><br/>
            <small style="color:#38BDF8">Costo: ${sk.mpCost} PM · Recarga: ${Math.max(1.2, sk.cooldown - (lvl - 1) * 0.25).toFixed(1)}s</small>
          </div>
        </div>
      `;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = lvl >= 5 ? 'Máx.' : '+ Subir';
      btn.disabled = lvl >= 5 || (p.skillPoints || 0) <= 0;
      btn.addEventListener('click', () => {
        p.skillLevels[idx] = lvl + 1;
        p.skillPoints -= 1;
        sfx.playUpgrade();
        onSave();
        renderCharacterModal(engine, 'habilidades', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
      });
      row.appendChild(btn);
      rowsWrap.appendChild(row);
    });

    document.getElementById('btn-reset-skills').addEventListener('click', () => {
      if (p.gold < resetCost) return onToast('Necesitas 200 Oro para restablecer habilidades.', 'error');
      const spent = p.skillLevels.reduce((acc, v) => acc + Math.max(0, v - 1), 0);
      if (spent === 0) return onToast('Tus habilidades ya están en nivel base.');
      p.gold -= resetCost;
      p.skillLevels = [1, 1, 1];
      p.skillPoints += spent;
      sfx.playCoin();
      onToast('Puntos de habilidad restablecidos.', 'success');
      onSave();
      renderCharacterModal(engine, 'habilidades', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
    });
    return;
  }

  // Pestaña Talentos (Rama Furia y Rama Baluarte)
  const resetCost = 250;
  body.innerHTML = `
    <div class="skills-tab-layout">
      <div class="bag-footer-bar">
        <strong>Puntos de Talento disponibles: <span style="color:#FDE047">${p.talentPoints || 0}</span></strong>
        <button type="button" id="btn-reset-talents" class="btn btn-secondary btn-sm">Reiniciar (${resetCost} Oro)</button>
      </div>
      <div class="talents-grid">
        <div class="talent-branch">
          <strong style="color:#F97316">🔥 RAMA FURIA (Ataque y Crítico)</strong>
          <div id="branch-furia" class="forge-content"></div>
        </div>
        <div class="talent-branch">
          <strong style="color:#38BDF8">🛡️ RAMA BALUARTE (Vida y Defensa)</strong>
          <div id="branch-baluarte" class="forge-content"></div>
        </div>
      </div>
    </div>
  `;

  const renderBranch = (list, elId) => {
    const wrap = document.getElementById(elId);
    for (const node of list) {
      const lvl = p.talentLevels?.[node.id] || 0;
      const div = document.createElement('div');
      div.className = 'talent-node';
      div.innerHTML = `<div><strong>${node.icon} ${node.name} (${lvl}/${node.maxLevel})</strong><br/><small>${node.desc}</small></div>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = lvl >= node.maxLevel ? 'Máx.' : '+ Subir';
      btn.disabled = lvl >= node.maxLevel || (p.talentPoints || 0) <= 0;
      btn.addEventListener('click', () => {
        p.talentLevels[node.id] = lvl + 1;
        p.talentPoints -= 1;
        engine.recalcDerivedStats(true);
        sfx.playUpgrade();
        onSave();
        renderCharacterModal(engine, 'talentos', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
      });
      div.appendChild(btn);
      wrap.appendChild(div);
    }
  };

  renderBranch(TALENTS.furia, 'branch-furia');
  renderBranch(TALENTS.baluarte, 'branch-baluarte');

  document.getElementById('btn-reset-talents').addEventListener('click', () => {
    if (p.gold < resetCost) return onToast('Necesitas 250 Oro para reiniciar talentos.', 'error');
    const spent = Object.values(p.talentLevels).reduce((a, b) => a + b, 0);
    if (spent === 0) return onToast('No tienes puntos de talento asignados.');
    p.gold -= resetCost;
    Object.keys(p.talentLevels).forEach((k) => { p.talentLevels[k] = 0; });
    p.talentPoints += spent;
    engine.recalcDerivedStats(false);
    sfx.playCoin();
    onToast('Talentos reiniciados.', 'success');
    onSave();
    renderCharacterModal(engine, 'talentos', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
  });
}

/* =========================================================
   MASCOTAS DE VALORIA (4 TARJETAS CON NIVEL Y EXP)
   ========================================================= */
export function renderPetsModal(engine, onToast, onSave) {
  const grid = document.getElementById('pets-grid');
  const p = engine.player;
  document.getElementById('pets-gold').textContent = `${p.gold} Oro`;
  grid.innerHTML = '';

  for (const pet of Object.values(PETS)) {
    const owned = p.ownedPets.includes(pet.id);
    const equipped = p.activePet === pet.id;
    const prog = p.petProgress?.[pet.id] || { level: 1, xp: 0 };
    const atk = Math.round(pet.atkBase + (prog.level - 1) * pet.atkPerLvl);
    const def = Math.round(pet.defBase + (prog.level - 1) * pet.defPerLvl);
    const hp = Math.round(pet.hpBase + (prog.level - 1) * pet.hpPerLvl);

    const card = document.createElement('div');
    card.className = `rpg-portrait-card ${equipped ? 'highlight' : ''}`;
    card.innerHTML = `
      <div class="rpg-portrait-stage"><canvas width="140" height="100" data-pet-preview="${pet.id}"></canvas></div>
      <strong>${pet.name}</strong>
      <small style="color:#FDE047">Nv. ${prog.level} · EXP ${prog.xp}/${petXpNeeded(prog.level)}</small>
      <small>⚔️+${atk} · 🛡️+${def} · ❤️+${hp}</small>
      <small style="color:var(--text-muted)">${pet.desc}</small>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (!owned) {
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = `Adoptar (${pet.price} Oro)`;
      btn.disabled = p.gold < pet.price;
      btn.addEventListener('click', () => {
        if (p.gold < pet.price) return;
        p.gold -= pet.price;
        p.ownedPets.push(pet.id);
        p.activePet = pet.id;
        p.gearSlots.mascota = pet.id;
        engine.recalcDerivedStats(true);
        sfx.playBuy();
        onToast(`¡${pet.name} ahora te acompaña!`, 'success');
        engine.checkAchievements();
        onSave();
        renderPetsModal(engine, onToast, onSave);
      });
    } else {
      btn.className = equipped ? 'btn btn-secondary btn-sm' : 'btn btn-gold btn-sm';
      btn.textContent = equipped ? 'Equipado' : 'Seleccionar';
      btn.disabled = equipped;
      btn.addEventListener('click', () => {
        p.activePet = pet.id;
        p.gearSlots.mascota = pet.id;
        engine.recalcDerivedStats(true);
        sfx.playCoin();
        onToast(`${pet.name} equipado.`);
        onSave();
        renderPetsModal(engine, onToast, onSave);
      });
    }
    card.appendChild(btn);
    grid.appendChild(card);

    const cv = card.querySelector('canvas');
    if (cv) {
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      drawPetSprite(ctx, pet.id, 70, 56, 3.0, performance.now() / 1000);
    }
  }
}

/* =========================================================
   JEFES DE VALORIA (4 TARJETAS CON CALAVERA / CORONA Y EQUIPO EXCLUSIVO)
   ========================================================= */
export function renderBossesModal(engine) {
  const grid = document.getElementById('bosses-grid');
  const p = engine.player;
  grid.innerHTML = '';

  for (const b of Object.values(BOSS_META)) {
    const defeated = p.defeatedBosses.includes(b.id);
    const dropItem = ITEMS[b.dropItemId];
    const titleObj = TITLES[b.titleId];

    const card = document.createElement('div');
    card.className = `rpg-portrait-card ${defeated ? 'highlight' : ''}`;
    card.style.borderTopColor = b.color;
    card.innerHTML = `
      <div class="rpg-portrait-stage" style="font-size:2.6rem">${defeated ? '👑' : '💀'}</div>
      <strong style="color:${b.color};font-family:var(--font-pixel);font-size:1.15rem">${b.name}</strong>
      <small>${b.levelRange} · ${defeated ? 'Derrotado' : 'Pendiente'}</small>
      <small>${b.powers}</small>
      <small style="color:#FDE047">Exclusivo: ${dropItem?.icon || ''} ${dropItem?.name || ''}</small>
      <small style="color:#4ADE80">Título: ${titleObj?.name} (${titleObj?.bonusText})</small>
    `;
    grid.appendChild(card);
  }
}

/* =========================================================
   MAPA ILUSTRADO DE VALORIA (VIAJE RÁPIDO)
   ========================================================= */
export function renderWorldMapModal(engine, onClose) {
  const canvas = document.getElementById('worldmap-canvas');
  const bar = document.getElementById('worldmap-detail-bar');
  const p = engine.player;
  if (!MAPS_META[selectedWorldMapId]) selectedWorldMapId = p.currentMap;

  const paint = () => {
    worldMapNodes = drawIllustratedWorldMap(canvas, MAPS_META, p, selectedWorldMapId, performance.now() / 1000);
    const m = MAPS_META[selectedWorldMapId];
    const visited = p.visitedMaps.includes(m.id);
    const isCurrent = p.currentMap === m.id;
    const locked = p.level < m.reqLevel;
    const boss = m.bossId ? BOSS_META[m.bossId] : null;
    const bossDone = boss && p.defeatedBosses.includes(boss.id);

    bar.innerHTML = `
      <div>
        <strong>${m.order}. ${m.id === 'aldea' ? (FACTIONS[p.faction]?.villageName || m.name) : m.name}</strong>
        <span class="worldmap-lvl">${m.levelRange}</span>
        ${boss ? `<small style="margin-left:8px;color:${bossDone ? '#FDE047' : '#FCA5A5'}">${bossDone ? '👑' : '💀'} Jefe: ${boss.name} (${bossDone ? 'Vencido' : 'Pendiente'})</small>` : ''}
        <p style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${m.desc}</p>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (isCurrent) {
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = 'Aquí estás';
      btn.disabled = true;
    } else if (visited && !locked) {
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = 'Viajar ahora';
      btn.addEventListener('click', () => {
        engine.fastTravelTo(m.id);
        onClose();
      });
    } else {
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = locked ? `Bloqueado (Req. Nv.${m.reqLevel})` : 'Explora el portal primero';
      btn.disabled = true;
    }
    bar.appendChild(btn);
  };

  paint();
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const hit = worldMapNodes.find((n) => cx >= n.x && cx <= n.x + n.w && cy >= n.y && cy <= n.y + n.h);
    if (hit) {
      selectedWorldMapId = hit.id;
      paint();
    }
  };
}

/* =========================================================
   MEJORAS, TIENDA, LOGROS, BANNER Y DIÁLOGOS NPC
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
  const statSummary = pieceKey === 'weapon'
    ? `Bono: +${computeWeaponAtkBonus(piece)} ATQ`
    : (() => { const b = computeArmorBonuses(piece); return `Bono: +${b.def} DEF · +${b.hp} PV`; })();

  container.innerHTML = `
    <div class="equip-summary-card">
      <div>
        <strong class="equip-name ${piece.quality === 4 ? 'legendary-glow' : ''}" style="color:${qual.color}">${pieceName} +${piece.plus}</strong>
        <div class="equip-meta-line">Nivel: <strong>${piece.tier}</strong> · Calidad: <strong style="color:${qual.color}">${qual.name}</strong></div>
        <small>${statSummary}</small>
      </div>
      <div class="gem-counts">
        <span class="gem-pill">♦️ ${rubies}</span>
        <span class="gem-pill">💚 ${emeralds}</span>
        <span class="gem-pill">💎 ${sapphires}</span>
      </div>
    </div>
  `;

  const addRow = (title, sub, label, disabled, fn) => {
    const row = document.createElement('div');
    row.className = 'forge-item';
    row.innerHTML = `<div><strong>${title}</strong><br/><small>${sub}</small></div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-gold btn-sm';
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener('click', fn);
    row.appendChild(btn);
    container.appendChild(row);
  };

  const tc = getTierUpgradeCost(piece);
  addRow('Subir Nivel de Equipo (Rubí)', tc ? `Nv.${piece.tier} → Nv.${tc.nextTier} · ${tc.gemQty}x Rubí + ${tc.gold} Oro` : 'Nivel Máximo (90)', tc ? `Subir Nv.${tc.nextTier}` : 'Máx.', !tc || p.gold < tc.gold || rubies < tc.gemQty, () => {
    p.gold -= tc.gold; engine.consumeItem('gema_rubi', tc.gemQty); piece.tier = tc.nextTier;
    engine.recalcDerivedStats(true); sfx.playUpgrade(); onToast(`${pieceName} subió a Nv.${piece.tier}.`, 'success');
    onSave(); renderUpgradesModal(engine, pieceKey, onToast, onSave);
  });

  const pc = getPlusUpgradeCost(piece);
  addRow('Reforzar +1 a +12 (Esmeralda)', pc ? `+${piece.plus} → +${pc.nextPlus} · ${pc.gemQty}x Esmeralda + ${pc.gold} Oro` : 'Brillo Supremo (+12)', pc ? `Subir +${pc.nextPlus}` : 'Máx.', !pc || p.gold < pc.gold || emeralds < pc.gemQty, () => {
    p.gold -= pc.gold; engine.consumeItem('gema_esmeralda', pc.gemQty); piece.plus = pc.nextPlus;
    engine.recalcDerivedStats(true); sfx.playUpgrade(); engine.checkAchievements(); onToast(`${pieceName} mejorada a +${piece.plus}.`, 'success');
    onSave(); renderUpgradesModal(engine, pieceKey, onToast, onSave);
  });

  const qc = getQualityUpgradeCost(piece);
  const nq = qc ? QUALITIES[qc.nextQuality] : null;
  addRow('Elevar Calidad (Zafiro)', qc ? `${qual.name} → ${nq.name} · ${qc.gemQty}x Zafiro + ${qc.gold} Oro` : 'Calidad Legendaria', qc ? `A ${nq.name}` : 'Máx.', !qc || p.gold < qc.gold || sapphires < qc.gemQty, () => {
    p.gold -= qc.gold; engine.consumeItem('gema_zafiro', qc.gemQty); piece.quality = qc.nextQuality;
    engine.recalcDerivedStats(true); sfx.playUpgrade(); engine.checkAchievements(); onToast(`¡${pieceName} ahora es ${nq.name}!`, 'success');
    onSave(); renderUpgradesModal(engine, pieceKey, onToast, onSave);
  });
}

export function renderShopModal(engine, shopTab, onToast, onSave, onOpenPets) {
  const container = document.getElementById('shop-content');
  const p = engine.player;
  document.getElementById('shop-gold').textContent = `${p.gold} Oro`;
  container.innerHTML = '';

  if (shopTab === 'pets') {
    const row = document.createElement('div');
    row.className = 'forge-item';
    row.innerHTML = '<div><strong>Mascotas de Valoria</strong><br/><small>Adopta y entrena a Lobo Blanco, Fantasma con Hoz, Gato Gigante Volador y Dragón Rojo y Negro.</small></div>';
    const b = document.createElement('button');
    b.className = 'btn btn-gold btn-sm';
    b.textContent = 'Abrir Mascotas';
    b.addEventListener('click', () => onOpenPets?.());
    row.appendChild(b);
    container.appendChild(row);
    return;
  }

  const listIds = shopTab === 'consumables'
    ? ['pocion_vida', 'pocion_grande', 'pocion_mana', 'pocion_velocidad']
    : ['gema_rubi', 'gema_esmeralda', 'gema_zafiro', 'pergamino_aldea'];

  for (const id of listIds) {
    const item = ITEMS[id];
    const row = document.createElement('div');
    row.className = 'forge-item';
    row.innerHTML = `<div><strong>${item.icon} ${item.name}</strong><br/><small>${item.desc} · ${item.price} Oro</small></div>`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-gold btn-sm';
    btn.textContent = `Comprar (${item.price} Oro)`;
    btn.disabled = p.gold < item.price;
    btn.addEventListener('click', () => {
      if (p.gold < item.price) return;
      if (engine.addItemToBackpack(id, 1)) {
        p.gold -= item.price;
        sfx.playBuy();
        onToast(`Compraste 1x ${item.name}.`, 'success');
        onSave();
        renderShopModal(engine, shopTab, onToast, onSave, onOpenPets);
      }
    });
    row.appendChild(btn);
    container.appendChild(row);
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
    card.innerHTML = `<span class="ach-icon">${ach.icon}</span><div class="ach-info"><strong>${ach.title}</strong><small>${ach.desc}</small></div><span class="ach-status">${isDone ? '✓ Logrado' : prog}</span>`;
    list.appendChild(card);
  }
}

let bannerTimer = null;
export function showZoneBanner(title, subtitle) {
  const el = document.getElementById('zone-banner');
  if (!el) return;
  document.getElementById('zone-banner-title').textContent = title;
  document.getElementById('zone-banner-sub').textContent = subtitle || '';
  el.classList.remove('hidden');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

export function buildNpcDialog(npc, engine, { onClose, onOpenUpgrades, onSave }) {
  const q = engine.player.quest;
  const isFem = engine.player.gender === 'female';
  document.getElementById('dialog-npc-name').textContent = npc.name;
  const bodyEl = document.getElementById('dialog-text');
  const actionsEl = document.getElementById('dialog-actions');
  actionsEl.innerHTML = '';

  if (npc.kind === 'tabernero') {
    if (q.currentId === 1) {
      bodyEl.textContent = isFem
        ? '¡Bienvenida a Valoria, aventurera! Toma estas pociones de PV y PM y ve a hablar con el Herrero.'
        : '¡Bienvenido a Valoria, aventurero! Toma estas pociones de PV y PM y ve a hablar con el Herrero.';
      const btn = document.createElement('button');
      btn.className = 'btn btn-gold';
      btn.textContent = 'Aceptar Pociones y Misión 2';
      btn.addEventListener('click', () => { engine.completeQuest(1); onSave(); onClose(); });
      actionsEl.appendChild(btn);
    } else if (q.currentId === 5 && q.malakorDefeated && !q.completedAll) {
      bodyEl.textContent = '¡Derrotaste a Malakor! Reclama tu recompensa y prepárate para el Desierto de Ceniza (Nv. 30).';
      const btn = document.createElement('button');
      btn.className = 'btn btn-gold';
      btn.textContent = 'Reclamar Recompensa';
      btn.addEventListener('click', () => { engine.completeQuest(5); onSave(); onClose(); });
      actionsEl.appendChild(btn);
    } else {
      const cur = QUESTS.find((x) => x.id === q.currentId);
      bodyEl.textContent = q.completedAll
        ? (isFem ? '¡Salud, Salvadora! Desafía a Ignis, Boreas y Vaelor para conquistar sus equipos exclusivos.' : '¡Salud, Salvador! Desafía a Ignis, Boreas y Vaelor para conquistar sus equipos exclusivos.')
        : `Misión actual: ${cur?.title}\n${cur?.objective}`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Cerrar';
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
        ? '¡Bienvenida a la forja! Prueba tus golpes en los Muñecos de Entrenamiento (3 veces) y usa Gemas + Oro en Mejoras.'
        : '¡Bienvenido a la forja! Prueba tus golpes en los Muñecos de Entrenamiento (3 veces) y usa Gemas + Oro en Mejoras.';
    } else {
      bodyEl.textContent = isFem ? '¿Lista para potenciar tu equipo con Gemas y Oro?' : '¿Listo para potenciar tu equipo con Gemas y Oro?';
    }
    const forgeBtn = document.createElement('button');
    forgeBtn.className = 'btn btn-gold';
    forgeBtn.textContent = 'Abrir Mejoras';
    forgeBtn.addEventListener('click', () => { onClose(); onOpenUpgrades(); });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary';
    closeBtn.textContent = 'Salir';
    closeBtn.addEventListener('click', onClose);
    actionsEl.appendChild(forgeBtn);
    actionsEl.appendChild(closeBtn);
  }
}
