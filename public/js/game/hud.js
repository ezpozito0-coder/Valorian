/**
 * Controlador de HUD Horizontal 16:9, Características (Equipo 12 ranuras / Habilidades / Talentos),
 * Mascotas de Valoria, Jefes de Valoria, Mapa Ilustrado, Mejoras, Tienda, Logros y Diálogos.
 * 100% Pixel Art 16-bit real (cero emojis del sistema, cero textos cortados, cero barras de scroll).
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
import {
  pixelIcon,
  drawBossPortraitCard,
  drawPetPortraitBackdrop
} from './pixelArt.js';
import { onAssetsUpdated, getNpcAsset, getPetPortraitDataUrl, getAsset, drawUiBackdrop, drawFootAnchoredSprite } from './assetLoader.js';
import {
  AI_CHARACTERS_DEFS,
  getCharacterMemory,
  getAiState,
  chatWithAiCharacter,
  decideCharacterNextGoal,
  generateImmediateNpcReport,
  getDynamicPriceMultiplier,
  hasGeminiApiKey
} from './geminiAI.js';

let lastIconClass = null;
let lastPetIconKey = null;
let staticHudIconsMounted = false;
let selectedBagIndex = -1;
let selectedWorldMapId = 'aldea';
let worldMapNodes = [];

onAssetsUpdated(() => {
  staticHudIconsMounted = false;
  lastIconClass = null;
  lastPetIconKey = null;
});

function ensureStaticHudIcons() {
  if (staticHudIconsMounted) return;
  const map = [
    ['hud-boss-skull-ico', 'skull', 16],
    ['ico-hud-bosses', 'skull', 20],
    ['ico-hud-pause', 'pause', 18],
    ['ico-hud-potion', 'pocion_vida', 22],
    ['ico-hud-upgrades', 'anvil', 22],
    ['ico-hud-shop', 'coin', 22],
    ['ico-hud-backpack', 'backpack', 22]
  ];
  for (const [id, key, size] of map) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = pixelIcon(key, size);
  }
  staticHudIconsMounted = true;
}

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
  ensureStaticHudIcons();
  const cls = CLASSES[snap.heroClass] || CLASSES.guerrero;

  if (lastIconClass !== snap.heroClass) {
    lastIconClass = snap.heroClass;
    const icoEl = document.getElementById('hud-class-icon');
    if (icoEl) icoEl.innerHTML = pixelIcon(snap.heroClass, 32);
    for (let i = 0; i < 4; i++) {
      const ico = document.getElementById(`ico-skill-${i}`);
      if (ico) ico.innerHTML = getSkillIconSvg(snap.heroClass, i, 44);
    }
  }

  const lvlEl = document.getElementById('hud-level-badge');
  if (lvlEl) lvlEl.textContent = `Nv.${snap.level}`;

  document.getElementById('hud-hero-name').textContent = snap.name;
  const hudGoldEl = document.getElementById('hud-gold');
  if (hudGoldEl) hudGoldEl.textContent = `${snap.gold} Oro`;

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

  // Recuadro de Mascota activa con icono Pixel Art 16x16
  const petObj = snap.activePet ? PETS[snap.activePet] : null;
  const petKey = petObj ? petObj.id : 'mascota';
  if (lastPetIconKey !== petKey) {
    lastPetIconKey = petKey;
    const petIcoEl = document.getElementById('hud-pet-icon');
    if (petIcoEl) {
      const petPortrait = petObj ? getPetPortraitDataUrl(petKey) : null;
      petIcoEl.innerHTML = petPortrait
        ? `<img src="${petPortrait}" width="22" height="22" class="pixel-icon-svg" style="image-rendering:pixelated;object-fit:contain" alt="" aria-hidden="true" />`
        : pixelIcon(petKey, 20);
    }
  }
  if (petObj) {
    document.getElementById('hud-pet-name').textContent = petObj.name;
    document.getElementById('hud-pet-lvl').textContent = `Nv.${snap.petLevel}`;
    const pPct = Math.min(100, (snap.petXp / Math.max(1, snap.petXpNeeded)) * 100);
    document.getElementById('hud-pet-xp').style.width = `${pPct}%`;
  } else {
    document.getElementById('hud-pet-name').textContent = 'Sin mascota';
    document.getElementById('hud-pet-lvl').textContent = 'Abrir';
    document.getElementById('hud-pet-xp').style.width = '0%';
  }

  document.getElementById('hud-zone').textContent = snap.zone;
  document.getElementById('hud-quest-text').textContent = formatQuestStatus(snap.quest);

  // Reloj del ciclo Día / Tarde / Noche al lado del botón de Jefes
  const clockBadge = document.getElementById('hud-clock-badge');
  const clockText = document.getElementById('hud-clock-text');
  const clockPhase = document.getElementById('hud-clock-phase');
  if (clockBadge && clockText && typeof snap.timeOfDay === 'number') {
    const t = ((snap.timeOfDay % 1) + 1) % 1;
    let totalMins = 0;
    if (t < 0.55) {
      totalMins = 360 + (t / 0.55) * 720; // 06:00 -> 18:00
    } else if (t < 0.72) {
      totalMins = 1080 + ((t - 0.55) / 0.17) * 120; // 18:00 -> 20:00
    } else {
      totalMins = (1200 + ((t - 0.72) / 0.28) * 600) % 1440; // 20:00 -> 06:00
    }
    const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(totalMins % 60)).padStart(2, '0');
    clockText.textContent = `${hh}:${mm}`;
    const isNight = t > 0.72;
    const isDusk = t > 0.55 && !isNight;
    clockBadge.classList.toggle('is-night', isNight);
    clockBadge.classList.toggle('is-dusk', isDusk);
    if (clockPhase) clockPhase.textContent = isNight ? '☾' : isDusk ? '◐' : '☀';
  }
  document.getElementById('hud-potion-count').textContent = String(snap.potions);
  document.getElementById('hud-bag-count').textContent = `${snap.bagCount}/16`;

  cls.skills.forEach((sk, idx) => {
    const lbl = document.getElementById(`lbl-skill-${idx + 1}`);
    if (lbl) lbl.textContent = sk.short;
  });

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

  // Barra metálica de Jefe con Calavera Pixel Art y Furia
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
   VENTANA FLOTANTE DE ESTADÍSTICAS Y GRADO DE MEJORA (TOOLTIP RPG)
   ========================================================= */
function getUpgradeGradeColor(plus = 0, qualityIdx = 0) {
  // Priorizar el color más alto entre el grado +1..+12 y la calidad del objeto
  let plusTier = 0;
  if (plus >= 12) plusTier = 4;
  else if (plus >= 9) plusTier = 3;
  else if (plus >= 6) plusTier = 2;
  else if (plus >= 3) plusTier = 1;
  const tier = Math.max(plusTier, qualityIdx || 0);
  const palette = [
    '#38BDF8', // +0..+2 / Normal (Azul Arcano)
    '#22C55E', // +3..+5 / Mejorado (Verde Esmeralda)
    '#EAB308', // +6..+8 / Clásico (Dorado Clásico)
    '#C084FC', // +9..+11 / Épico (Morado Reliquia)
    '#FDE047'  // +12 / Legendario (Oro Legendario Brillante)
  ];
  return palette[Math.min(palette.length - 1, Math.max(0, tier))];
}

function ensureItemHoverTooltipEl() {
  let el = document.getElementById('valoria-item-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'valoria-item-tooltip';
    el.className = 'valoria-item-tooltip hidden';
    document.body.appendChild(el);
  }
  return el;
}

export function hideItemHoverTooltip() {
  const el = document.getElementById('valoria-item-tooltip');
  if (el) el.classList.add('hidden');
}

function positionItemHoverTooltip(ev) {
  const el = document.getElementById('valoria-item-tooltip');
  if (!el || el.classList.contains('hidden')) return;
  const pad = 14;
  const rect = el.getBoundingClientRect();
  let x = (ev.clientX || 0) + 16;
  let y = (ev.clientY || 0) + 14;
  if (x + rect.width + pad > window.innerWidth) {
    x = Math.max(pad, (ev.clientX || 0) - rect.width - 14);
  }
  if (y + rect.height + pad > window.innerHeight) {
    y = Math.max(pad, window.innerHeight - rect.height - pad);
  }
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}

function showItemHoverTooltip(ev, data) {
  if (!data) {
    hideItemHoverTooltip();
    return;
  }
  const el = ensureItemHoverTooltipEl();
  const statsHtml = (data.stats || [])
    .map(
      (s) => `<div class="vtt-stat-row">
        <span class="vtt-stat-lbl">${s.label}</span>
        <strong class="vtt-stat-val" style="color:${s.color || '#4ADE80'}">${s.value}</strong>
      </div>`
    )
    .join('');

  const iconContent = data.iconHtml || pixelIcon(data.iconKey, 28);
  el.style.borderColor = data.color || '#38BDF8';
  el.innerHTML = `
    <div class="vtt-header">
      <div class="vtt-icon">${iconContent}</div>
      <div class="vtt-title-wrap">
        <div class="vtt-name" style="color:${data.color || '#F8FAFC'}">${data.name}</div>
        <div class="vtt-sub">${data.subtitle || ''}</div>
      </div>
    </div>
    ${statsHtml ? `<div class="vtt-stats">${statsHtml}</div>` : ''}
    ${data.desc ? `<div class="vtt-desc">${data.desc}</div>` : ''}
    <div class="vtt-grade-footer" style="border-top-color:${data.color || '#334155'}44">
      <span class="vtt-grade-label">Grado</span>
      <span class="vtt-grade-badge" style="color:${data.color || '#FDE047'};border-color:${data.color || '#FDE047'}66">${data.gradeBadge || '+0'}</span>
    </div>
  `;
  el.classList.remove('hidden');
  positionItemHoverTooltip(ev);
}

function buildItemTooltipDataForPlayer(p, it, qty = 1) {
  if (!it) return null;
  const wPlus = p.equipment?.weapon?.plus || 0;
  const aPlus = p.equipment?.armor?.plus || 0;
  const refPlus = it.slot === 'arma' ? wPlus : it.type === 'equipment' ? aPlus : 0;
  const qualIdx = it.quality ?? (it.type === 'gem' ? 2 : it.type === 'consumable' ? 1 : 0);
  const qualObj = QUALITIES[qualIdx] || QUALITIES[0];
  const color = it.gemColor || getUpgradeGradeColor(refPlus, qualIdx);
  const stats = [];
  if (it.atk) stats.push({ label: 'Ataque', value: `+${it.atk} ATQ`, color: '#4ADE80' });
  if (it.def) stats.push({ label: 'Defensa', value: `+${it.def} DEF`, color: '#38BDF8' });
  if (it.hp) stats.push({ label: 'Vida Máxima', value: `+${it.hp} PV`, color: '#F87171' });
  if (it.mp) stats.push({ label: 'Energía (PM)', value: `+${it.mp} PM`, color: '#60A5FA' });
  if (it.crit) stats.push({ label: 'Golpe Crítico', value: `+${it.crit}%`, color: '#FDE047' });
  if (it.heal) stats.push({ label: 'Restaura Vida', value: `+${it.heal} PV`, color: '#4ADE80' });
  if (it.mana) stats.push({ label: 'Restaura Energía', value: `+${it.mana} PM`, color: '#38BDF8' });
  if (it.speedBoost) stats.push({ label: 'Velocidad', value: `+45% (${it.speedBoost}s)`, color: '#FDE047' });
  if (qty > 1) stats.push({ label: 'Cantidad', value: `x${qty}`, color: '#E2E8F0' });

  const gradeBadge = it.type === 'equipment'
    ? `+${Math.max(1, refPlus)} · ${qualObj.name}`
    : it.type === 'gem'
    ? 'Joya de Forja'
    : it.type === 'consumable'
    ? 'Consumible'
    : 'Material';

  return {
    iconKey: it.id,
    name: it.type === 'equipment' && refPlus > 0 ? `${it.name} +${refPlus}` : it.name,
    subtitle: it.type === 'equipment' ? `Equipo ${qualObj.name}` : it.type === 'gem' ? 'Gema de Mejora' : 'Objeto de Mochila',
    color,
    stats,
    desc: it.desc,
    gradeBadge
  };
}

function equipOrUseFromBackpackIndex(engine, bagIndex, preferredGearSlot = null, { onToast, onSave, onClose } = {}) {
  const p = engine?.player;
  if (!p || !Array.isArray(p.backpack)) return false;
  const slot = p.backpack[bagIndex];
  if (!slot || !ITEMS[slot.id]) return false;
  const it = ITEMS[slot.id];

  if (it.type === 'equipment') {
    let targetSlot = it.slot;
    if ((preferredGearSlot === 'anillo1' || preferredGearSlot === 'anillo2') && (it.slot === 'anillo1' || it.slot === 'anillo2')) {
      targetSlot = preferredGearSlot;
    } else if (it.slot === 'anillo1' && p.gearSlots.anillo1 && !p.gearSlots.anillo2) {
      targetSlot = 'anillo2';
    }
    const prevItem = p.gearSlots[targetSlot];
    slot.qty -= 1;
    if (slot.qty <= 0) {
      p.backpack.splice(bagIndex, 1);
    }
    if (prevItem && ITEMS[prevItem]) {
      engine.addItemToBackpack(prevItem, 1);
    }
    p.gearSlots[targetSlot] = it.id;
    engine.recalcDerivedStats(true);
    sfx.playUpgrade();
    onToast?.(`¡Equipaste ${it.name}!`, 'success');
    onSave?.();
    return true;
  } else if (it.type === 'consumable') {
    if (engine.useConsumable(it.id)) {
      onSave?.();
      if (it.teleportVillage) onClose?.();
      return true;
    }
  }
  return false;
}

/* =========================================================
   VENTANA FLOTANTE IZQUIERDA (C): CARACTERÍSTICAS (EQUIPO / HABILIDADES / TALENTOS)
   ========================================================= */
export function renderCharacterModal(engine, activeTab, { onToast, onSave, onOpenUpgrades, onOpenPets, onClose, onRefreshAll }) {
  hideItemHoverTooltip();
  const body = document.getElementById('character-tab-body');
  if (!body) return;
  const p = engine.player;
  const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
  const st = engine.getComputedStats();

  const refreshViews = () => {
    renderCharacterModal(engine, activeTab, { onToast, onSave, onOpenUpgrades, onOpenPets, onClose, onRefreshAll });
    onRefreshAll?.();
  };

  if (activeTab === 'equipo') {
    const getSlotInfo = (slotDef) => {
      const val = p.gearSlots?.[slotDef.id];
      const item = val && ITEMS[val] ? ITEMS[val] : null;
      const pet = slotDef.id === 'mascota' && p.activePet ? PETS[p.activePet] : null;
      const isBase = val === 'base';
      const filled = Boolean(item || pet || isBase);
      const isLeg = item?.quality === 4 || (isBase && ((slotDef.id === 'arma' && p.equipment.weapon.quality >= 4) || (slotDef.id !== 'arma' && p.equipment.armor.quality >= 4)));
      const iconKey = item ? item.id : pet ? pet.id : slotDef.id;
      const shortTip = item
        ? item.name
        : pet
        ? `${pet.name} (Nv.${p.petProgress?.[pet.id]?.level || 1})`
        : isBase
        ? `${slotDef.label}: ${slotDef.id === 'arma' ? `${cls.weapon} +${p.equipment.weapon.plus}` : `${cls.armor} +${p.equipment.armor.plus}`}`
        : `${slotDef.label}: Vacío`;
      const tip = item
        ? `${slotDef.label}: ${item.name} — ${item.desc}`
        : pet
        ? `Mascota: ${pet.name} (Nv.${p.petProgress?.[pet.id]?.level || 1})`
        : isBase
        ? `${slotDef.label}: Equipo Base (${slotDef.id === 'arma' ? `${cls.weapon} +${p.equipment.weapon.plus}` : `${cls.armor} +${p.equipment.armor.plus}`})`
        : `${slotDef.label}: Ranura vacía`;

      let tooltipData = null;
      if (item) {
        tooltipData = buildItemTooltipDataForPlayer(p, item, 1);
      } else if (pet) {
        const petLvl = p.petProgress?.[pet.id]?.level || 1;
        const petAtk = Math.round(pet.atkBase + (petLvl - 1) * pet.atkPerLvl);
        const petDef = Math.round(pet.defBase + (petLvl - 1) * pet.defPerLvl);
        const petHp = Math.round(pet.hpBase + (petLvl - 1) * pet.hpPerLvl);
        const color = getUpgradeGradeColor(petLvl, petLvl >= 15 ? 4 : petLvl >= 8 ? 3 : 2);
        tooltipData = {
          iconKey: pet.id,
          name: `${pet.name} (Nv.${petLvl})`,
          subtitle: 'Mascota Compañera',
          color,
          stats: [
            { label: 'Bono de Ataque', value: `+${petAtk} ATQ`, color: '#4ADE80' },
            { label: 'Bono de Defensa', value: `+${petDef} DEF`, color: '#38BDF8' },
            { label: 'Bono de Vida', value: `+${petHp} PV`, color: '#F87171' },
            { label: 'Golpe Crítico', value: `+${pet.critBase}%`, color: '#FDE047' }
          ],
          desc: pet.desc,
          gradeBadge: `Nivel ${petLvl}`
        };
      } else if (isBase) {
        const isWeapon = slotDef.id === 'arma';
        const piece = isWeapon ? p.equipment.weapon : p.equipment.armor;
        const qual = QUALITIES[piece.quality] || QUALITIES[0];
        const color = getUpgradeGradeColor(piece.plus, piece.quality);
        const stats = isWeapon
          ? [
              { label: 'Ataque de Arma', value: `+${computeWeaponAtkBonus(piece)} ATQ`, color: '#4ADE80' },
              { label: 'Nivel de Forja', value: `Nv. ${piece.tier}`, color: '#38BDF8' },
              { label: 'Multiplicador Calidad', value: `x${qual.mult.toFixed(2)} (${qual.name})`, color }
            ]
          : [
              { label: 'Defensa de Armadura', value: `+${computeArmorBonuses(piece).def} DEF`, color: '#38BDF8' },
              { label: 'Vida de Armadura', value: `+${computeArmorBonuses(piece).hp} PV`, color: '#4ADE80' },
              { label: 'Nivel de Forja', value: `Nv. ${piece.tier}`, color: '#E2E8F0' },
              { label: 'Multiplicador Calidad', value: `x${qual.mult.toFixed(2)} (${qual.name})`, color }
            ];
        tooltipData = {
          iconKey,
          name: `${isWeapon ? cls.weapon : cls.armor} +${piece.plus}`,
          subtitle: `${slotDef.label} · Calidad ${qual.name}`,
          color,
          stats,
          desc: `Equipo de ${getClassLabel(p.heroClass, p.gender)} mejorado en la Herrería.`,
          gradeBadge: `+${piece.plus} (${qual.name})`
        };
      }

      return { filled, isLeg, iconKey, tip, shortTip, tooltipData };
    };

    const slotTooltipMap = new Map();
    const renderSlot = (slotDef) => {
      const info = getSlotInfo(slotDef);
      if (info.tooltipData) slotTooltipMap.set(slotDef.id, info.tooltipData);
      return `<button type="button" class="gear-slot-btn ${info.filled ? 'equipped' : 'empty-slot'} ${info.isLeg ? 'legendary' : ''}" data-gear-slot="${slotDef.id}" data-slot-short="${info.shortTip}" data-slot-tip="${info.tip}" aria-label="${slotDef.label}">
        ${pixelIcon(info.iconKey, 24)}
      </button>`;
    };

    body.innerHTML = `
      <div class="equip-doll-panel compact-only-equip">
        <div class="equip-doll-grid">
          <div class="equip-col">${DEFENSE_SLOTS.map(renderSlot).join('')}</div>
          <div class="doll-center-wrap">
            <canvas id="char-doll-canvas" width="194" height="186"></canvas>
          </div>
          <div class="equip-col">${OFFENSE_SLOTS.map(renderSlot).join('')}</div>
        </div>

        <div class="stats-And-upg-row">
          <div class="stats-box">
            <span>${pixelIcon('heart', 14)} PV: <strong>${st.maxHp}</strong></span>
            <span>${pixelIcon('shield', 14)} Defensa: <strong>${st.def}</strong></span>
            <span>${pixelIcon('pocion_mana', 14)} PM: <strong>${st.maxMp}</strong></span>
            <span>${pixelIcon('speed', 14)} Velocidad: <strong>${Math.round(st.speed / 20)}</strong></span>
            <span>${pixelIcon('arma', 14)} Ataque: <strong>${st.atk} <small style="color:#4ADE80">(+${p.equipment.weapon.plus})</small></strong></span>
            <span>${pixelIcon('flame', 14)} Crítico: <strong>${st.crit}%</strong></span>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px">
            <button type="button" id="btn-char-unequip" class="btn btn-secondary btn-sm hidden">Desequipar</button>
            <button type="button" id="btn-char-go-upgrades" class="btn btn-gold btn-sm">${pixelIcon('anvil', 16)} Mejoras</button>
            <button type="button" id="btn-char-toggle-mount" class="btn btn-secondary btn-sm">${pixelIcon('montura', 16)} ${p.mounted ? 'Desmontar' : 'Montura (Z)'}</button>
          </div>
        </div>
      </div>
    `;

    const dollCanvas = document.getElementById('char-doll-canvas');
    if (dollCanvas) {
      const ctx = dollCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const stageKey = p.faction === 'hierro' ? 'stage_hierro' : 'stage_alba';
      if (!drawUiBackdrop(ctx, stageKey, 0, 0, 194, 186)) {
        ctx.fillStyle = '#0d111a';
        ctx.fillRect(0, 0, 194, 186);
      }
      drawDetailedHeroSprite(ctx, 97, 132, 2.95, {
        faction: p.faction, gender: p.gender, race: p.race, heroClass: p.heroClass,
        wings: p.gearSlots?.alas || null, gearSlots: p.gearSlots, equipment: p.equipment,
        dir: 0, attackTimer: 0
      }, performance.now() / 1000);
    }

    const unequipBtn = document.getElementById('btn-char-unequip');
    let selectedGearSlotId = null;

    // Permitir arrastrar objetos desde la Mochila (B) hacia cualquier ranura o al panel de Equipo para equiparlos
    const equipPanel = body.querySelector('.equip-doll-panel');
    const handleEquipDrop = (e, targetSlotId = null) => {
      e.preventDefault();
      e.stopPropagation();
      equipPanel?.classList.remove('drag-over');
      body.querySelectorAll('.gear-slot-btn').forEach((el) => el.classList.remove('drag-over'));
      const dragInfo = window.__valoriaBagDrag;
      if (!dragInfo || typeof dragInfo.bagIndex !== 'number') return;
      window.__valoriaBagDragHandled = true;
      if (equipOrUseFromBackpackIndex(engine, dragInfo.bagIndex, targetSlotId, { onToast, onSave, onClose })) {
        refreshViews();
      }
    };

    if (equipPanel) {
      equipPanel.addEventListener('dragover', (e) => {
        if (!window.__valoriaBagDrag) return;
        e.preventDefault();
        equipPanel.classList.add('drag-over');
      });
      equipPanel.addEventListener('dragleave', () => equipPanel.classList.remove('drag-over'));
      equipPanel.addEventListener('drop', (e) => handleEquipDrop(e, null));
    }

    body.querySelectorAll('.gear-slot-btn').forEach((btn) => {
      const slotId = btn.dataset.gearSlot;
      const showTip = (ev) => {
        const tData = slotTooltipMap.get(slotId);
        if (tData && ev) showItemHoverTooltip(ev, tData);
      };
      btn.addEventListener('mouseenter', (ev) => showTip(ev));
      btn.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
      btn.addEventListener('mouseleave', () => hideItemHoverTooltip());
      btn.addEventListener('focus', (ev) => showTip(ev));
      btn.addEventListener('blur', () => hideItemHoverTooltip());
      btn.addEventListener('dragover', (e) => {
        if (!window.__valoriaBagDrag) return;
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('drag-over');
      });
      btn.addEventListener('dragleave', () => btn.classList.remove('drag-over'));
      btn.addEventListener('drop', (e) => handleEquipDrop(e, slotId));
      btn.addEventListener('click', () => {
        hideItemHoverTooltip();
        if (slotId === 'mascota') {
          onOpenPets();
          return;
        }
        body.querySelectorAll('.gear-slot-btn').forEach((el) => el.classList.remove('active-slot'));
        btn.classList.add('active-slot');
        selectedGearSlotId = slotId;
        const curVal = p.gearSlots?.[slotId];
        if (unequipBtn) {
          if (curVal) {
            unequipBtn.classList.remove('hidden');
            unequipBtn.textContent = 'Desequipar';
          } else if (slotId === 'pechera' || slotId === 'arma') {
            unequipBtn.classList.remove('hidden');
            unequipBtn.textContent = 'Equipar Base';
          } else {
            unequipBtn.classList.add('hidden');
          }
        }
      });
    });

    if (unequipBtn) {
      unequipBtn.addEventListener('click', () => {
        if (!selectedGearSlotId) return;
        const curVal = p.gearSlots?.[selectedGearSlotId];
        if (curVal) {
          if (ITEMS[curVal]) {
            engine.addItemToBackpack(curVal, 1);
            onToast(`Desequipaste ${ITEMS[curVal].name} y volvió a tu mochila.`, 'info');
          } else {
            onToast('Equipo base desequipado.', 'info');
          }
          p.gearSlots[selectedGearSlotId] = null;
        } else if (selectedGearSlotId === 'pechera' || selectedGearSlotId === 'arma') {
          p.gearSlots[selectedGearSlotId] = 'base';
          onToast('Equipo base equipado.', 'success');
        }
        engine.recalcDerivedStats(true);
        sfx.playCoin();
        onSave();
        refreshViews();
      });
    }

    document.getElementById('btn-char-go-upgrades').addEventListener('click', () => onOpenUpgrades());
    document.getElementById('btn-char-toggle-mount')?.addEventListener('click', () => {
      engine.toggleMount();
      onSave();
      refreshViews();
    });
    return;
  }

  if (activeTab === 'habilidades') {
    const resetCost = 200;
    body.innerHTML = `
      <div class="skills-tab-layout">
        <div class="bag-footer-bar">
          <strong>Puntos de Habilidad: <span style="color:#FDE047">${p.skillPoints || 0}</span></strong>
          <button type="button" id="btn-reset-skills" class="btn btn-secondary btn-sm">Restablecer (${resetCost} Oro)</button>
        </div>
        <div id="skills-list-rows" class="icon-only-grid cols-4"></div>
      </div>
    `;
    const rowsWrap = document.getElementById('skills-list-rows');

    const attachHover = (el, tData) => {
      el.addEventListener('mouseenter', (ev) => showItemHoverTooltip(ev, tData));
      el.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
      el.addEventListener('mouseleave', () => hideItemHoverTooltip());
      el.addEventListener('dragstart', () => hideItemHoverTooltip());
    };

    // 1. Icono solo de Ataque Básico (arrastrable a la barra inferior)
    const basicCard = document.createElement('div');
    basicCard.className = 'icon-slot-card';
    basicCard.draggable = true;
    basicCard.dataset.skillIndex = '0';
    const basicIconHtml = getSkillIconSvg(p.heroClass, 0, 36);
    basicCard.innerHTML = `
      <div class="icon-slot-box">
        ${basicIconHtml}
        <span class="icon-slot-badge">Base</span>
      </div>
      <span class="icon-slot-action-tag">Arrastrable</span>
    `;
    attachHover(basicCard, {
      iconHtml: getSkillIconSvg(p.heroClass, 0, 28),
      name: `Ataque Básico (${cls.weapon})`,
      subtitle: `Habilidad Base · ${getClassLabel(p.heroClass, p.gender)}`,
      color: '#38BDF8',
      stats: [
        { label: 'Daño Físico / Arcano', value: '100% ATQ', color: '#4ADE80' },
        { label: 'Costo de Energía', value: '0 PM', color: '#38BDF8' },
        { label: 'Tiempo de Recarga', value: `${cls.basicCooldown}s`, color: '#FDE047' }
      ],
      desc: 'Ataque principal de tu clase. Arrastra el icono a la barra inferior (1–8).',
      gradeBadge: 'Base'
    });
    rowsWrap.appendChild(basicCard);

    // 2. Iconos solos de las 3 habilidades de clase
    cls.skills.forEach((sk, idx) => {
      const lvl = p.skillLevels?.[idx] || 1;
      const effCd = Math.max(1.2, sk.cooldown - (lvl - 1) * 0.25).toFixed(1);
      const skColor = getUpgradeGradeColor(lvl * 2, lvl >= 5 ? 4 : lvl >= 3 ? 3 : 1);
      const card = document.createElement('div');
      card.className = 'icon-slot-card';
      card.draggable = true;
      card.dataset.skillIndex = String(idx + 1);
      card.innerHTML = `
        <div class="icon-slot-box" style="border-color:${skColor}88">
          ${getSkillIconSvg(p.heroClass, idx + 1, 36)}
          <span class="icon-slot-badge" style="color:${skColor}">${lvl}/5</span>
        </div>
      `;
      attachHover(card, {
        iconHtml: getSkillIconSvg(p.heroClass, idx + 1, 28),
        name: `${sk.name} (Nv.${lvl})`,
        subtitle: `Habilidad Activa · ${getClassLabel(p.heroClass, p.gender)}`,
        color: skColor,
        stats: [
          { label: 'Nivel de Habilidad', value: `Nv. ${lvl} / 5`, color: skColor },
          { label: 'Costo de Energía', value: `${sk.mpCost} PM`, color: '#38BDF8' },
          { label: 'Tiempo de Recarga', value: `${effCd}s`, color: '#4ADE80' }
        ],
        desc: `${sk.desc} (Arrastra el icono a la barra inferior).`,
        gradeBadge: `+${lvl} (Nv.${lvl}/5)`
      });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = lvl >= 5 ? 'Máx.' : '+ Subir';
      btn.disabled = lvl >= 5 || (p.skillPoints || 0) <= 0;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideItemHoverTooltip();
        p.skillLevels[idx] = lvl + 1;
        p.skillPoints -= 1;
        sfx.playUpgrade();
        onSave();
        renderCharacterModal(engine, 'habilidades', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
      });
      card.appendChild(btn);
      rowsWrap.appendChild(card);
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

  // Pestaña Talentos: Iconos solos por rama con ventana flotante al pasar el cursor
  const resetCost = 250;
  body.innerHTML = `
    <div class="skills-tab-layout">
      <div class="bag-footer-bar">
        <strong>Puntos de Talento: <span style="color:#FDE047">${p.talentPoints || 0}</span></strong>
        <button type="button" id="btn-reset-talents" class="btn btn-secondary btn-sm">Reiniciar (${resetCost} Oro)</button>
      </div>
      <div class="talents-grid">
        <div class="talent-branch">
          <div class="talent-branch-head" style="color:#F97316">${pixelIcon('flame', 18)} RAMA FURIA</div>
          <div id="branch-furia" class="icon-only-grid cols-3"></div>
        </div>
        <div class="talent-branch">
          <div class="talent-branch-head" style="color:#38BDF8">${pixelIcon('shield', 18)} RAMA BALUARTE</div>
          <div id="branch-baluarte" class="icon-only-grid cols-3"></div>
        </div>
      </div>
    </div>
  `;

  const renderBranch = (list, elId, branchTitle) => {
    const wrap = document.getElementById(elId);
    for (const node of list) {
      const lvl = p.talentLevels?.[node.id] || 0;
      const tColor = getUpgradeGradeColor(lvl * 2, lvl >= 5 ? 4 : lvl >= 3 ? 3 : lvl > 0 ? 1 : 0);
      const card = document.createElement('div');
      card.className = `icon-slot-card ${lvl > 0 ? 'active-talent' : ''}`;
      card.innerHTML = `
        <div class="icon-slot-box" style="border-color:${lvl > 0 ? tColor : '#475569'}">
          ${pixelIcon(node.icon, 30)}
          <span class="icon-slot-badge" style="color:${lvl > 0 ? tColor : '#94A3B8'}">${lvl}/${node.maxLevel}</span>
        </div>
      `;

      const statBonusText = node.atk
        ? `+${lvl * node.atk} ATQ (+${node.atk}/Nv.)`
        : node.speed
        ? `+${lvl * node.speed} Velocidad (+${node.speed}/Nv.)`
        : node.crit
        ? `+${lvl * node.crit}% Crítico (+${node.crit}%/Nv.)`
        : node.hp
        ? `+${lvl * node.hp} PV (+${node.hp}/Nv.)`
        : node.def
        ? `+${lvl * node.def} DEF (+${node.def}/Nv.)`
        : `+${lvl * (node.mp || 18)} PM (+${node.mp || 18}/Nv.)`;

      const tData = {
        iconKey: node.icon,
        name: `${node.name} (${lvl}/${node.maxLevel})`,
        subtitle: `Talento Pasivo · ${branchTitle}`,
        color: tColor,
        stats: [
          { label: 'Bono Activo Total', value: statBonusText, color: '#4ADE80' },
          { label: 'Efecto por Punto', value: node.desc, color: '#38BDF8' }
        ],
        desc: 'Talento permanente que fortalece a tu personaje en todo momento.',
        gradeBadge: `+${lvl} (${lvl}/${node.maxLevel})`
      };
      card.addEventListener('mouseenter', (ev) => showItemHoverTooltip(ev, tData));
      card.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
      card.addEventListener('mouseleave', () => hideItemHoverTooltip());

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = lvl >= node.maxLevel ? 'Máx.' : '+ Subir';
      btn.disabled = lvl >= node.maxLevel || (p.talentPoints || 0) <= 0;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideItemHoverTooltip();
        p.talentLevels[node.id] = lvl + 1;
        p.talentPoints -= 1;
        engine.recalcDerivedStats(true);
        sfx.playUpgrade();
        onSave();
        renderCharacterModal(engine, 'talentos', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose });
      });
      card.appendChild(btn);
      wrap.appendChild(card);
    }
  };

  renderBranch(TALENTS.furia, 'branch-furia', 'Rama Furia');
  renderBranch(TALENTS.baluarte, 'branch-baluarte', 'Rama Baluarte');

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
    renderCharacterModal(engine, 'talentos', { onToast, onSave, onOpenUpgrades, onOpenPets, onClose, onRefreshAll });
  });
}

/* =========================================================
   VENTANA FLOTANTE DERECHA (B): MOCHILA 4x4 INDEPENDIENTE
   ========================================================= */
export function renderBackpackModal(engine, { onToast, onSave, onClose, onRefreshCharacter } = {}) {
  hideItemHoverTooltip();
  const body = document.getElementById('backpack-modal-body');
  const titleEl = document.getElementById('backpack-modal-title');
  if (!body || !engine?.player) return;
  const p = engine.player;

  if (titleEl) titleEl.textContent = `Mochila (${p.backpack.length}/16)`;

  body.innerHTML = `
    <div class="bag-panel compact-only-bag">
      <div id="char-bag-grid" class="backpack-grid"></div>
      <div class="bag-footer-bar">
        <span class="gold-counter-box">${pixelIcon('coin', 16)} ${p.gold} Oro</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button type="button" id="btn-char-drop" class="btn btn-secondary btn-sm" disabled>Botar</button>
          <button type="button" id="btn-char-use-equip" class="btn btn-gold btn-sm" disabled>Usar / Equipar</button>
        </div>
      </div>
    </div>
  `;

  const bagGrid = document.getElementById('char-bag-grid');
  const dropBtn = document.getElementById('btn-char-drop');
  const useBtn = document.getElementById('btn-char-use-equip');
  const bagModalCard = document.querySelector('#modal-backpack .modal-card');
  const charModalEl = document.getElementById('modal-character');
  const charModalCard = document.querySelector('#modal-character .modal-card');
  selectedBagIndex = -1;

  const refreshBoth = () => {
    renderBackpackModal(engine, { onToast, onSave, onClose, onRefreshCharacter });
    onRefreshCharacter?.();
  };

  const triggerDropToGround = (bagIdx) => {
    hideItemHoverTooltip();
    const dropped = engine.dropBackpackItem(bagIdx, 1);
    if (dropped) {
      onSave?.();
      refreshBoth();
    }
  };

  for (let i = 0; i < 16; i++) {
    const slot = p.backpack[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `bag-slot ${slot ? 'filled' : 'empty'}`;
    if (slot && ITEMS[slot.id]) {
      const it = ITEMS[slot.id];
      const tData = buildItemTooltipDataForPlayer(p, it, slot.qty);
      b.dataset.name = it.name;
      b.setAttribute('aria-label', it.name);
      b.draggable = true;
      b.innerHTML = `
        ${pixelIcon(it.id, 26)}
        <span class="bag-slot-qty">${slot.qty}</span>
      `;
      b.addEventListener('mouseenter', (ev) => showItemHoverTooltip(ev, tData));
      b.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
      b.addEventListener('mouseleave', () => hideItemHoverTooltip());
      b.addEventListener('dragstart', () => {
        hideItemHoverTooltip();
        window.__valoriaBagDrag = { bagIndex: i, itemId: it.id };
        window.__valoriaBagDragHandled = false;
      });
      b.addEventListener('dragend', (ev) => {
        hideItemHoverTooltip();
        const wasHandled = Boolean(window.__valoriaBagDragHandled);
        window.__valoriaBagDrag = null;
        window.__valoriaBagDragHandled = false;
        if (wasHandled) return;

        const cx = ev.clientX || 0;
        const cy = ev.clientY || 0;
        if (cx <= 0 && cy <= 0) return;

        // Si se soltó sobre la barra inferior estilo WoW, no botar al suelo
        const wowBar = document.getElementById('wow-actionbar');
        if (wowBar) {
          const wRect = wowBar.getBoundingClientRect();
          if (cx >= wRect.left && cx <= wRect.right && cy >= wRect.top && cy <= wRect.bottom) {
            return;
          }
        }

        // Si se soltó sobre la ventana izquierda de Características (C), equiparlo directamente
        if (charModalEl && !charModalEl.classList.contains('hidden') && charModalCard) {
          const cRect = charModalCard.getBoundingClientRect();
          if (cx >= cRect.left && cx <= cRect.right && cy >= cRect.top && cy <= cRect.bottom) {
            if (equipOrUseFromBackpackIndex(engine, i, null, { onToast, onSave, onClose })) {
              refreshBoth();
            }
            return;
          }
        }

        // Si se soltó fuera de la ventana de Mochila (en el suelo del mapa), botarlo al suelo
        if (bagModalCard) {
          const bRect = bagModalCard.getBoundingClientRect();
          const isOutsideBag = cx < bRect.left - 10 || cx > bRect.right + 10 || cy < bRect.top - 10 || cy > bRect.bottom + 10;
          if (isOutsideBag) {
            triggerDropToGround(i);
          }
        }
      });
      b.addEventListener('click', () => {
        bagGrid.querySelectorAll('.bag-slot').forEach((el) => el.classList.remove('selected-bag'));
        b.classList.add('selected-bag');
        selectedBagIndex = i;
        if (dropBtn) dropBtn.disabled = false;
        if (useBtn) {
          useBtn.disabled = !(it.type === 'consumable' || it.type === 'equipment');
          useBtn.textContent = it.type === 'equipment' ? 'Equipar' : it.teleportVillage ? 'Teletransportar' : 'Usar';
        }
      });
      b.addEventListener('dblclick', () => {
        hideItemHoverTooltip();
        if (equipOrUseFromBackpackIndex(engine, i, null, { onToast, onSave, onClose })) {
          refreshBoth();
        }
      });
    } else {
      b.innerHTML = '';
    }
    bagGrid.appendChild(b);
  }

  if (dropBtn) {
    dropBtn.addEventListener('click', () => {
      if (selectedBagIndex < 0 || !p.backpack[selectedBagIndex]) return;
      triggerDropToGround(selectedBagIndex);
    });
  }

  if (useBtn) {
    useBtn.addEventListener('click', () => {
      if (selectedBagIndex < 0 || !p.backpack[selectedBagIndex]) return;
      hideItemHoverTooltip();
      if (equipOrUseFromBackpackIndex(engine, selectedBagIndex, null, { onToast, onSave, onClose })) {
        refreshBoth();
      }
    });
  }
}

/* =========================================================
   FICHA ILUSTRADA DE LA MASCOTA EQUIPADA (AL DAR CLIC EN LA MASCOTA DEL HUD)
   ========================================================= */
export function renderPetsModal(engine, onToast, onSave) {
  hideItemHoverTooltip();
  const grid = document.getElementById('pets-grid');
  const p = engine.player;
  document.getElementById('pets-gold').textContent = `${p.gold} Oro`;
  grid.innerHTML = '';

  const activePetId = p.activePet || p.ownedPets?.[0] || 'lobo_blanco';
  const pet = PETS[activePetId] || PETS.lobo_blanco;
  const prog = p.petProgress?.[pet.id] || { level: 1, xp: 0 };
  const xpNeed = Math.max(1, petXpNeeded(prog.level));
  const xpPct = Math.min(100, Math.round((prog.xp / xpNeed) * 100));
  const atk = Math.round(pet.atkBase + (prog.level - 1) * pet.atkPerLvl);
  const def = Math.round(pet.defBase + (prog.level - 1) * pet.defPerLvl);
  const hp = Math.round(pet.hpBase + (prog.level - 1) * pet.hpPerLvl);
  const petColor = getUpgradeGradeColor(prog.level, prog.level >= 15 ? 4 : prog.level >= 8 ? 3 : 2);

  const filledHearts = Math.min(5, 3 + Math.floor(prog.level / 4));
  let heartsHtml = '';
  for (let h = 0; h < 5; h++) {
    heartsHtml += pixelIcon(h < filledHearts ? 'heart' : 'heart_empty', 15);
  }

  const ownedList = (p.ownedPets || ['lobo_blanco']).filter((id) => PETS[id]);
  const ownedIconsHtml = ownedList
    .map((id) => {
      const pt = PETS[id];
      const pr = p.petProgress?.[id] || { level: 1 };
      const isEq = id === pet.id;
      return `<button type="button" class="icon-slot-box pet-switch-ico ${isEq ? 'is-active' : ''}" data-switch-pet="${id}" aria-label="${pt.name}">
        ${pixelIcon(id, 28)}
        <span class="icon-slot-badge">Nv.${pr.level}</span>
      </button>`;
    })
    .join('');

  const showcase = document.createElement('div');
  showcase.className = 'equipped-pet-showcase metallic-frame';
  showcase.innerHTML = `
    <div class="pet-showcase-left">
      <div class="rpg-portrait-stage pet-large-stage">
        <canvas id="active-pet-showcase-canvas" width="230" height="186"></canvas>
      </div>
      <div class="pet-hearts-lvl-row" style="width:100%">
        <span class="pet-hearts">${heartsHtml}</span>
        <strong style="color:${petColor};font-size:0.95rem">Nivel ${prog.level}</strong>
      </div>
      <div class="hud-xp-wrap" style="width:100%;height:9px !important">
        <div class="hud-xp-fill gold" style="width:${xpPct}%"></div>
      </div>
      <small style="color:#94A3B8;font-size:0.72rem">EXP: ${prog.xp} / ${xpNeed} (${xpPct}%)</small>
      ${ownedList.length > 1 ? `<div class="pet-owned-strip">${ownedIconsHtml}</div>` : ''}
    </div>

    <div class="pet-showcase-right">
      <div class="pet-showcase-header">
        <strong class="pixel-heading" style="font-size:1.2rem;color:${petColor}">${pet.name}</strong>
        <span class="vtt-grade-badge" style="color:${petColor};border-color:${petColor}66">Mascota Equipada · Nv.${prog.level}</span>
      </div>
      <p class="pet-showcase-desc">${pet.desc}</p>

      <div class="pet-stats-detail-grid">
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Ataque Otorgado</span>
          <strong style="color:#4ADE80">+${atk} ATQ <small style="color:#94A3B8">(+${pet.atkPerLvl}/Nv.)</small></strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Defensa Otorgada</span>
          <strong style="color:#38BDF8">+${def} DEF <small style="color:#94A3B8">(+${pet.defPerLvl}/Nv.)</small></strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Vida Máxima</span>
          <strong style="color:#F87171">+${hp} PV <small style="color:#94A3B8">(+${pet.hpPerLvl}/Nv.)</small></strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Golpe Crítico</span>
          <strong style="color:#FDE047">+${pet.critBase}% Crítico</strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Recolección Automática</span>
          <strong style="color:#E2E8F0">${pet.collectGems ? 'Oro y Gemas' : 'Oro'}</strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Regeneración Pasiva</span>
          <strong style="color:#4ADE80">${pet.healPerTick > 0 ? `+${pet.healPerTick} PV cada 4s` : 'Sin regeneración'}</strong>
        </div>
      </div>
      <small style="color:#94A3B8;font-size:0.74rem">💡 Puedes comprar nuevas mascotas en <strong>Tienda de Valoria → Mascotas</strong>.</small>
    </div>
  `;
  grid.appendChild(showcase);

  const cv = showcase.querySelector('#active-pet-showcase-canvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawPetPortraitBackdrop(ctx, cv.width, cv.height, pet.id);
    drawPetSprite(ctx, pet.id, 115, 118, 5.2, performance.now() / 1000);
  }

  showcase.querySelectorAll('[data-switch-pet]').forEach((btn) => {
    const switchId = btn.dataset.switchPet;
    const pt = PETS[switchId];
    const pr = p.petProgress?.[switchId] || { level: 1 };
    const tData = {
      iconKey: switchId,
      name: `${pt.name} (Nv.${pr.level})`,
      subtitle: switchId === pet.id ? 'Mascota Equipada' : 'Clic para equipar',
      color: getUpgradeGradeColor(pr.level, 2),
      stats: [
        { label: 'Ataque', value: `+${Math.round(pt.atkBase + (pr.level - 1) * pt.atkPerLvl)} ATQ`, color: '#4ADE80' },
        { label: 'Defensa', value: `+${Math.round(pt.defBase + (pr.level - 1) * pt.defPerLvl)} DEF`, color: '#38BDF8' },
        { label: 'Vida', value: `+${Math.round(pt.hpBase + (pr.level - 1) * pt.hpPerLvl)} PV`, color: '#F87171' }
      ],
      desc: pt.desc,
      gradeBadge: `Nivel ${pr.level}`
    };
    btn.addEventListener('mouseenter', (ev) => showItemHoverTooltip(ev, tData));
    btn.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
    btn.addEventListener('mouseleave', () => hideItemHoverTooltip());
    btn.addEventListener('click', () => {
      if (switchId === pet.id) return;
      hideItemHoverTooltip();
      p.activePet = switchId;
      p.gearSlots.mascota = switchId;
      engine.recalcDerivedStats(true);
      sfx.playCoin();
      onToast(`${pt.name} equipada.`);
      onSave();
      renderPetsModal(engine, onToast, onSave);
    });
  });

  // Tarjeta de Montura de Guerra — Corcel Blindado (+65% Velocidad) con escenario del Establo Real
  const mountCard = document.createElement('div');
  mountCard.className = 'equipped-pet-showcase metallic-frame';
  mountCard.style.marginTop = '10px';
  mountCard.innerHTML = `
    <div class="pet-showcase-left">
      <div class="rpg-portrait-stage pet-large-stage" style="height:138px">
        <canvas id="warhorse-showcase-canvas" width="230" height="138"></canvas>
      </div>
      <button type="button" id="btn-pet-modal-mount" class="btn btn-gold btn-sm" style="width:100%;margin-top:6px">
        ${pixelIcon('montura', 16)} ${p.mounted ? 'Desmontar Corcel (Z)' : 'Invocar Montura (Z)'}
      </button>
    </div>
    <div class="pet-showcase-right">
      <div class="pet-showcase-header">
        <strong class="pixel-heading" style="font-size:1.1rem;color:#FDE047">Corcel de Guerra Blindado</strong>
        <span class="vtt-grade-badge" style="color:#FDE047;border-color:#FDE04766">${p.mounted ? 'Montura Activa' : 'Montura Real'}</span>
      </div>
      <p class="pet-showcase-desc">Destrero de batalla con barda de acero y oro. Pulsa la tecla <strong>Z</strong> en cualquier mapa para cabalgar a gran velocidad.</p>
      <div class="pet-stats-detail-grid">
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Velocidad en Mapa</span>
          <strong style="color:#4ADE80">+65% Velocidad</strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Terreno Adverso</span>
          <strong style="color:#38BDF8">Inmune a Arena y Nieve</strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Desmonte de Combate</span>
          <strong style="color:#FDE047">Onda de Impacto al Atacar</strong>
        </div>
        <div class="pet-stat-box">
          <span class="vtt-stat-lbl">Atajo Rápido</span>
          <strong style="color:#E2E8F0">Tecla Z o /montura</strong>
        </div>
      </div>
    </div>
  `;
  grid.appendChild(mountCard);

  const mCv = mountCard.querySelector('#warhorse-showcase-canvas');
  if (mCv) {
    const mCtx = mCv.getContext('2d');
    mCtx.imageSmoothingEnabled = false;
    drawPetPortraitBackdrop(mCtx, mCv.width, mCv.height, 'montura_caballo');
    const horseSheet = getAsset('montura_caballo');
    if (horseSheet) {
      const fIdx = Math.floor((performance.now() / 1000) * 8) % 4;
      drawFootAnchoredSprite(mCtx, horseSheet, 115, 126, 96, { frameIndex: fIdx });
    }
  }

  mountCard.querySelector('#btn-pet-modal-mount')?.addEventListener('click', () => {
    engine.toggleMount();
    onSave();
    renderPetsModal(engine, onToast, onSave);
  });
}

/* =========================================================
   JEFES DE VALORIA (4 RETRATOS PIXEL ART EN 1 FILA DE 4 COLUMNAS)
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
    card.innerHTML = `
      <div class="rpg-portrait-stage" style="height:190px"><canvas width="180" height="190" data-boss-preview="${b.id}"></canvas></div>
      <div class="boss-skull-badge">${pixelIcon(defeated ? 'crown' : 'skull_red', 18)}</div>
      <div class="wood-name-plate">
        <div style="font-size:1rem;letter-spacing:0.04em">${b.name.toUpperCase()}</div>
        <div style="font-size:0.75rem;color:#E2E8F0">${b.levelRange} · ${defeated ? 'Vencido' : 'Pendiente'}</div>
      </div>
      <small style="color:#FDE047;display:inline-flex;align-items:center;justify-content:center;gap:4px">
        ${dropItem ? pixelIcon(dropItem.id, 14) : ''} ${dropItem?.name || ''}
      </small>
      <small style="color:#4ADE80;font-size:0.72rem">${titleObj?.name} (${titleObj?.bonusText})</small>
    `;
    grid.appendChild(card);

    const cv = card.querySelector('canvas');
    if (cv) drawBossPortraitCard(cv, b.id, performance.now() / 1000);
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
        <strong>${m.order}. ${m.name}</strong>
        <span class="worldmap-lvl">${m.levelRange}</span>
        ${boss ? `<small style="margin-left:8px;color:${bossDone ? '#FDE047' : '#FCA5A5'};display:inline-flex;align-items:center;gap:4px">${pixelIcon(bossDone ? 'crown' : 'skull', 14)} Jefe: ${boss.name} (${bossDone ? 'Vencido' : 'Pendiente'})</small>` : ''}
        <p style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${m.desc}</p>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (isCurrent) {
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = 'Aquí estás';
      btn.disabled = true;
    } else if (!locked) {
      btn.className = 'btn btn-gold btn-sm';
      btn.textContent = 'Viajar ahora';
      btn.addEventListener('click', () => {
        engine.fastTravelTo(m.id);
        onClose();
      });
    } else {
      btn.className = 'btn btn-secondary btn-sm';
      btn.textContent = `Bloqueado (Req. Nv.${m.reqLevel})`;
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
        <span class="gem-pill" style="display:inline-flex;align-items:center;gap:4px">${pixelIcon('gema_rubi', 14)} ${rubies}</span>
        <span class="gem-pill" style="display:inline-flex;align-items:center;gap:4px">${pixelIcon('gema_esmeralda', 14)} ${emeralds}</span>
        <span class="gem-pill" style="display:inline-flex;align-items:center;gap:4px">${pixelIcon('gema_zafiro', 14)} ${sapphires}</span>
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

  // Encantamientos Elementales de Arma (Fuego / Escarcha / Robo de Vida)
  if (pieceKey === 'weapon') {
    const curEnch = piece.enchant || null;
    const enchNames = { fire: '🔥 Fuego (+15% Daño)', ice: '❄️ Escarcha (Ralentiza)', nature: '💚 Vida (+10% Robo PV)' };
    const enchRow = document.createElement('div');
    enchRow.className = 'forge-item';
    enchRow.innerHTML = `
      <div>
        <strong>Encantamiento Elemental ${curEnch ? `<span style="color:#FDE047">(${enchNames[curEnch]})</span>` : ''}</strong><br/>
        <small>1 Gema + 150 Oro: Fuego (Rubí), Escarcha (Zafiro) o Robo de Vida (Esmeralda)</small>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button type="button" class="btn btn-gold btn-sm" data-ench="fire" ${p.gold < 150 || rubies < 1 || curEnch === 'fire' ? 'disabled' : ''}>Fuego</button>
        <button type="button" class="btn btn-gold btn-sm" data-ench="ice" ${p.gold < 150 || sapphires < 1 || curEnch === 'ice' ? 'disabled' : ''}>Hielo</button>
        <button type="button" class="btn btn-gold btn-sm" data-ench="nature" ${p.gold < 150 || emeralds < 1 || curEnch === 'nature' ? 'disabled' : ''}>Vida</button>
      </div>
    `;
    enchRow.querySelectorAll('[data-ench]').forEach((b) => {
      b.addEventListener('click', () => {
        const kind = b.dataset.ench;
        const gemMap = { fire: 'gema_rubi', ice: 'gema_zafiro', nature: 'gema_esmeralda' };
        if (p.gold < 150 || !engine.consumeItem(gemMap[kind], 1)) return;
        p.gold -= 150;
        piece.enchant = kind;
        sfx.playUpgrade();
        onToast(`¡Arma encantada con ${enchNames[kind]}!`, 'success');
        onSave();
        renderUpgradesModal(engine, pieceKey, onToast, onSave);
      });
    });
    container.appendChild(enchRow);
  }

  // Fabricación en la Herrería con Madera, Piedra y Mineral recolectados
  const woods = engine.countItem('madera_roble');
  const stones = engine.countItem('piedra_runica');
  const ores = engine.countItem('mineral_hierro');
  const craftRow = document.createElement('div');
  craftRow.className = 'forge-item';
  craftRow.innerHTML = `
    <div>
      <strong>Fabricación Artesanal (Madera: <span style="color:#FDE047">${woods}</span> · Piedra: <span style="color:#CBD5E1">${stones}</span> · Mineral: <span style="color:#38BDF8">${ores}</span>)</strong><br/>
      <small>Forja elixires de curación, refuerza armas o crea un disfraz del bando contrario para el Portal de Hielo.</small>
    </div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      <button type="button" class="btn btn-gold btn-sm" id="btn-craft-elixir" ${woods < 1 || stones < 1 ? 'disabled' : ''} title="1 Madera + 1 Piedra">Elixir (+420 PV)</button>
      <button type="button" class="btn btn-gold btn-sm" id="btn-craft-weapon" ${woods < 2 || ores < 2 || p.equipment.weapon.plus >= 12 ? 'disabled' : ''} title="2 Madera + 2 Mineral">Forjar Arma +1</button>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-craft-disguise" ${woods < 1 || ores < 1 || p.gold < 60 ? 'disabled' : ''} title="1 Madera + 1 Mineral + 60 Oro">Disfraz Portal</button>
    </div>
  `;
  craftRow.querySelector('#btn-craft-elixir')?.addEventListener('click', () => {
    if (!engine.consumeItem('madera_roble', 1) || !engine.consumeItem('piedra_runica', 1)) return;
    engine.addItemToBackpack('elixir_forja', 1);
    sfx.playUpgrade();
    onToast('¡Fabricaste 1x Elixir Maestro de Forja (+420 PV / +140 PM)!', 'success');
    onSave();
    renderUpgradesModal(engine, pieceKey, onToast, onSave);
  });
  craftRow.querySelector('#btn-craft-weapon')?.addEventListener('click', () => {
    if (p.equipment.weapon.plus >= 12) return;
    if (!engine.consumeItem('madera_roble', 2) || !engine.consumeItem('mineral_hierro', 2)) return;
    p.equipment.weapon.plus += 1;
    engine.recalcDerivedStats(true);
    sfx.playUpgrade();
    onToast(`¡Forjaste tu arma con madera y mineral a +${p.equipment.weapon.plus}!`, 'success');
    onSave();
    renderUpgradesModal(engine, pieceKey, onToast, onSave);
  });
  craftRow.querySelector('#btn-craft-disguise')?.addEventListener('click', () => {
    if (p.gold < 60 || !engine.consumeItem('madera_roble', 1) || !engine.consumeItem('mineral_hierro', 1)) return;
    p.gold -= 60;
    const disguiseId = p.faction === 'alba' ? 'disfraz_hierro' : 'disfraz_alba';
    engine.addItemToBackpack(disguiseId, 1);
    sfx.playUpgrade();
    onToast(`¡Fabricaste ${ITEMS[disguiseId].name} para cruzar el Portal de Hielo!`, 'success');
    onSave();
    renderUpgradesModal(engine, pieceKey, onToast, onSave);
  });
  container.appendChild(craftRow);
}

export function renderShopModal(engine, shopTab, onToast, onSave, onOpenPets) {
  hideItemHoverTooltip();
  const container = document.getElementById('shop-content');
  const p = engine.player;
  document.getElementById('shop-gold').textContent = `${p.gold} Oro`;
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'icon-only-grid cols-4';
  container.appendChild(grid);

  if (shopTab === 'pets') {
    for (const pet of Object.values(PETS)) {
      const owned = p.ownedPets.includes(pet.id);
      const equipped = p.activePet === pet.id;
      const prog = p.petProgress?.[pet.id] || { level: 1, xp: 0 };
      const atk = Math.round(pet.atkBase + (prog.level - 1) * pet.atkPerLvl);
      const def = Math.round(pet.defBase + (prog.level - 1) * pet.defPerLvl);
      const hp = Math.round(pet.hpBase + (prog.level - 1) * pet.hpPerLvl);
      const petColor = owned ? getUpgradeGradeColor(prog.level, 3) : '#FDE047';

      const card = document.createElement('div');
      card.className = `icon-slot-card ${equipped ? 'active-talent' : ''}`;
      card.innerHTML = `
        <div class="icon-slot-box pet-shop-box" style="border-color:${equipped ? '#FDE047' : owned ? '#38BDF8' : '#7C8DA6'}">
          ${pixelIcon(pet.id, 38)}
          <span class="icon-slot-badge" style="color:${petColor}">${owned ? `Nv.${prog.level}` : `${pet.price}g`}</span>
        </div>
      `;

      const tData = {
        iconKey: pet.id,
        name: `${pet.name} ${owned ? `(Nv.${prog.level})` : ''}`,
        subtitle: owned ? (equipped ? 'Mascota Equipada' : 'Mascota Adquirida') : `Mascota de Valoria · ${pet.price} Oro`,
        color: petColor,
        stats: [
          { label: 'Bono de Ataque', value: `+${atk} ATQ (+${pet.atkPerLvl}/Nv.)`, color: '#4ADE80' },
          { label: 'Bono de Defensa', value: `+${def} DEF (+${pet.defPerLvl}/Nv.)`, color: '#38BDF8' },
          { label: 'Bono de Vida', value: `+${hp} PV (+${pet.hpPerLvl}/Nv.)`, color: '#F87171' },
          { label: 'Golpe Crítico', value: `+${pet.critBase}%`, color: '#FDE047' },
          { label: 'Recolección', value: pet.collectGems ? 'Oro y Gemas' : 'Oro', color: '#E2E8F0' }
        ],
        desc: pet.desc,
        gradeBadge: owned ? `Nivel ${prog.level}` : `${pet.price} Oro`
      };
      card.addEventListener('mouseenter', (ev) => showItemHoverTooltip(ev, tData));
      card.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
      card.addEventListener('mouseleave', () => hideItemHoverTooltip());

      const btn = document.createElement('button');
      btn.type = 'button';
      if (!owned) {
        btn.className = 'btn btn-gold btn-sm';
        btn.textContent = `Comprar (${pet.price} Oro)`;
        btn.disabled = p.gold < pet.price;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (p.gold < pet.price) return;
          hideItemHoverTooltip();
          p.gold -= pet.price;
          p.ownedPets.push(pet.id);
          p.activePet = pet.id;
          p.gearSlots.mascota = pet.id;
          engine.recalcDerivedStats(true);
          sfx.playBuy();
          onToast(`¡Compraste y equipaste a ${pet.name}!`, 'success');
          engine.checkAchievements();
          onSave();
          renderShopModal(engine, shopTab, onToast, onSave, onOpenPets);
        });
      } else {
        btn.className = equipped ? 'btn btn-gold btn-sm' : 'btn btn-secondary btn-sm';
        btn.textContent = equipped ? 'Equipada' : 'Equipar';
        btn.disabled = equipped;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          hideItemHoverTooltip();
          p.activePet = pet.id;
          p.gearSlots.mascota = pet.id;
          engine.recalcDerivedStats(true);
          sfx.playCoin();
          onToast(`${pet.name} equipada.`);
          onSave();
          renderShopModal(engine, shopTab, onToast, onSave, onOpenPets);
        });
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
    return;
  }

  const priceMult = getDynamicPriceMultiplier(p.faction);
  const listIds = shopTab === 'consumables'
    ? ['pocion_vida', 'pocion_grande', 'pocion_mana', 'pocion_velocidad']
    : ['gema_rubi', 'gema_esmeralda', 'gema_zafiro', 'pergamino_aldea'];

  for (const id of listIds) {
    const item = ITEMS[id];
    const effPrice = Math.max(5, Math.round(item.price * priceMult));
    const inBag = p.backpack.find((s) => s.id === id)?.qty || 0;
    const itemColor = item.gemColor || (item.id === 'pocion_grande' ? '#F97316' : item.id === 'pocion_velocidad' ? '#FDE047' : item.id === 'pocion_mana' ? '#38BDF8' : '#22C55E');

    const card = document.createElement('div');
    card.className = 'icon-slot-card';
    card.innerHTML = `
      <div class="icon-slot-box" style="border-color:${itemColor}88">
        ${pixelIcon(item.id, 34)}
        ${inBag > 0 ? `<span class="icon-slot-badge" style="color:#FDE047">x${inBag}</span>` : ''}
      </div>
    `;

    const stats = [];
    if (item.heal) stats.push({ label: 'Restaura Vida', value: `+${item.heal} PV`, color: '#4ADE80' });
    if (item.mana) stats.push({ label: 'Restaura Energía', value: `+${item.mana} PM`, color: '#38BDF8' });
    if (item.speedBoost) stats.push({ label: 'Velocidad', value: `+45% (${item.speedBoost}s)`, color: '#FDE047' });
    if (item.teleportVillage) stats.push({ label: 'Efecto', value: 'Viaje Instantáneo', color: '#C084FC' });
    stats.push({ label: `Precio (Economía x${priceMult})`, value: `${effPrice} Oro`, color: '#FDE047' });
    if (inBag > 0) stats.push({ label: 'En tu Mochila', value: `x${inBag}`, color: '#E2E8F0' });

    const tData = {
      iconKey: item.id,
      name: item.name,
      subtitle: item.type === 'gem' ? 'Joya de Forja' : 'Consumible de Tienda',
      color: itemColor,
      stats,
      desc: item.desc,
      gradeBadge: `${effPrice} Oro`
    };
    card.addEventListener('mouseenter', (ev) => showItemHoverTooltip(ev, tData));
    card.addEventListener('mousemove', (ev) => positionItemHoverTooltip(ev));
    card.addEventListener('mouseleave', () => hideItemHoverTooltip());

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-gold btn-sm';
    btn.textContent = `Comprar (${effPrice} Oro)`;
    btn.disabled = p.gold < effPrice;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (p.gold < effPrice) return;
      if (engine.addItemToBackpack(id, 1)) {
        p.gold -= effPrice;
        sfx.playBuy();
        onToast(`Compraste 1x ${item.name} por ${effPrice} Oro.`, 'success');
        onSave();
        renderShopModal(engine, shopTab, onToast, onSave, onOpenPets);
      }
    });
    card.appendChild(btn);
    grid.appendChild(card);
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
    card.innerHTML = `<span class="ach-icon">${pixelIcon(ach.icon, 24)}</span><div class="ach-info"><strong>${ach.title}</strong><small>${ach.desc}</small></div><span class="ach-status">${isDone ? '✓ Logrado' : prog}</span>`;
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

  const setDialogWithPortrait = (msgText) => {
    bodyEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <canvas id="dialog-npc-portrait" width="68" height="68" style="flex-shrink:0;background:#10141d;border:2px solid #f2b63d;outline:1px solid #0a0d12;image-rendering:pixelated"></canvas>
        <div id="dialog-msg-span" style="flex:1;line-height:1.45;white-space:pre-line"></div>
      </div>
    `;
    const span = document.getElementById('dialog-msg-span');
    if (span) span.textContent = msgText;
    const cv = document.getElementById('dialog-npc-portrait');
    const npcImg = getNpcAsset(npc.kind);
    if (cv && npcImg) {
      const pctx = cv.getContext('2d');
      pctx.imageSmoothingEnabled = false;
      pctx.fillStyle = '#151c28';
      pctx.fillRect(0, 0, 68, 68);
      const totalW = npcImg.width || 64;
      const totalH = npcImg.height || 64;
      const isSheet = totalW >= totalH * 2.2;
      const iw = isSheet ? Math.floor(totalW / 4) : totalW;
      const ih = totalH;
      const r = Math.min(60 / iw, 60 / ih);
      const dw = Math.round(iw * r);
      const dh = Math.round(ih * r);
      pctx.drawImage(npcImg, 0, 0, iw, ih, Math.round((68 - dw) / 2), Math.round((68 - dh) / 2), dw, dh);
    }
  };

  if (npc.kind === 'tabernero') {
    if (q.currentId === 1) {
      setDialogWithPortrait(
        isFem
          ? '¡Bienvenida a Valoria, aventurera! Toma estas pociones de PV y PM y ve a hablar con el Herrero.'
          : '¡Bienvenido a Valoria, aventurero! Toma estas pociones de PV y PM y ve a hablar con el Herrero.'
      );
      const btn = document.createElement('button');
      btn.className = 'btn btn-gold';
      btn.textContent = 'Aceptar Pociones y Misión 2';
      btn.addEventListener('click', () => { engine.completeQuest(1); onSave(); onClose(); });
      actionsEl.appendChild(btn);
    } else if (q.currentId === 5 && q.malakorDefeated && !q.completedAll) {
      setDialogWithPortrait('¡Derrotaste a Malakor! Reclama tu recompensa y prepárate para el Desierto de Ceniza (Nv. 30).');
      const btn = document.createElement('button');
      btn.className = 'btn btn-gold';
      btn.textContent = 'Reclamar Recompensa';
      btn.addEventListener('click', () => { engine.completeQuest(5); onSave(); onClose(); });
      actionsEl.appendChild(btn);
    } else {
      const cur = QUESTS.find((x) => x.id === q.currentId);
      setDialogWithPortrait(
        q.completedAll
          ? (isFem ? '¡Salud, Salvadora! Desafía a Ignis, Boreas y Vaelor para conquistar sus equipos exclusivos.' : '¡Salud, Salvador! Desafía a Ignis, Boreas y Vaelor para conquistar sus equipos exclusivos.')
          : `Misión actual: ${cur?.title}\n${cur?.objective}`
      );
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
      setDialogWithPortrait(
        isFem
          ? '¡Bienvenida a la forja! Prueba tus golpes en los Muñecos de Entrenamiento (3 veces) y usa Gemas + Oro en Mejoras.'
          : '¡Bienvenido a la forja! Prueba tus golpes en los Muñecos de Entrenamiento (3 veces) y usa Gemas + Oro en Mejoras.'
      );
    } else {
      setDialogWithPortrait(isFem ? '¿Lista para potenciar tu equipo con Gemas y Oro?' : '¿Listo para potenciar tu equipo con Gemas y Oro?');
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
    return;
  }

  // Diálogo interactivo con Gemini Flash + IA Local para los 4 héroes IA, guardias del portal y mercader
  const player = engine.player;
  const mem = getCharacterMemory(npc.aiId || npc.id);
  const aiState = getAiState();
  const factionKey = npc.faction || player.faction || 'alba';
  const factionName = factionKey === 'alba' ? 'Guardia del Alba' : 'Clanes de Hierro';
  const rep = aiState.factionReputation?.[factionKey] ?? 15;
  const priceMult = getDynamicPriceMultiplier(factionKey, npc.aiId || npc.id);
  const def = AI_CHARACTERS_DEFS[npc.aiId || npc.id];

  setDialogWithPortrait(npc.dialog || def?.personality || 'Saludos, viajero de Valoria.');

  const aiPanel = document.createElement('div');
  aiPanel.style.cssText = 'margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(15,23,42,0.88);border:1px solid rgba(245,158,11,0.35);font-size:11px;color:#e2e8f0;';
  aiPanel.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;margin-bottom:6px;">
      <span><strong>Bando:</strong> ${factionName} (Rep: ${rep})</span>
      <span><strong>Amistad:</strong> ${mem.friendship ?? 15}/100</span>
      <span><strong>Oficio:</strong> ${npc.profession || def?.profession || 'Habitante'}</span>
      <span><strong>Economía:</strong> x${priceMult.toFixed(2)}</span>
      <span style="color:${hasGeminiApiKey() ? '#4ade80' : '#fbbf24'};"><strong>IA:</strong> ${hasGeminiApiKey() ? 'Gemini Flash Activo' : 'IA Local (Configura clave en Pausa)'}</span>
    </div>
    ${npc.isAiHero ? `<div style="font-size:10px;color:#94a3b8;margin-bottom:6px;">PV: ${Math.round(npc.hp || 1800)}/${npc.maxHp || 1800} · Hambre: ${Math.round(mem.hunger || 18)}% · Energía: ${Math.round(mem.energy || 85)}% · Tarea: ${npc.goal || 'patrullar'}</div>` : ''}
    <div style="display:flex;gap:6px;">
      <input id="npc-ai-chat-input" type="text" placeholder="Escribe para conversar, regatear, pedir misión o ayuda..." style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid #475569;background:#0f172a;color:#f8fafc;font-size:12px;" />
      <button id="npc-ai-chat-send" class="btn btn-gold btn-xs" type="button">Hablar</button>
    </div>
  `;
  bodyEl.appendChild(aiPanel);

  const replyBox = document.getElementById('dialog-msg-span') || bodyEl;

  const sendChatMessage = async (msgText) => {
    const clean = (msgText || '').trim();
    if (!clean) return;
    replyBox.textContent = 'Pensando...';
    const res = await chatWithAiCharacter(npc.aiId || npc.id, clean, {
      playerName: player.name,
      playerFaction: player.faction,
      playerLevel: player.level,
      mapName: engine.map?.name || 'Valoria',
      weather: engine.map?.weather || 'clear',
      npcHp: npc.hp,
      npcMaxHp: npc.maxHp
    });
    replyBox.textContent = `"${res.reply}"`;
    if (res.becomeHostile) {
      npc.hostile = true;
      npc.emotion = 'enojo';
      engine.callFactionReinforcements(npc);
    } else if (res.becomeCompanion) {
      npc.isCompanion = true;
      npc.emotion = 'siguiendo';
      engine.addFloatingText(npc.x, npc.y - 26, '¡Te acompaño!', '#38bdf8');
    } else if (res.discount > 0) {
      engine.addFloatingText(npc.x, npc.y - 26, '¡Descuento otorgado!', '#4ade80');
    } else if (res.offerQuest) {
      npc.activeDynamicQuest = res.offerQuest;
      engine.callbacks.onToast?.(`Nueva misión de ${npc.shortName || npc.name}: ${res.offerQuest.title}`, 'info');
    }
  };

  setTimeout(() => {
    const inp = document.getElementById('npc-ai-chat-input');
    const sendBtn = document.getElementById('npc-ai-chat-send');
    if (sendBtn && inp) {
      sendBtn.addEventListener('click', () => {
        sendChatMessage(inp.value);
        inp.value = '';
      });
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          sendChatMessage(inp.value);
          inp.value = '';
        }
      });
    }
  }, 0);

  // Botón de misión dinámica / entrega
  const questBtn = document.createElement('button');
  questBtn.className = 'btn btn-gold btn-xs';
  const activeQ = npc.activeDynamicQuest || mem.activeQuest;
  questBtn.textContent = activeQ ? `Entregar: ${activeQ.title}` : 'Pedir Misión';
  questBtn.addEventListener('click', () => {
    const qObj = npc.activeDynamicQuest || mem.activeQuest;
    if (qObj) {
      const reqId = qObj.reqItem || qObj.itemId;
      const reqQty = qObj.reqQty || qObj.qty || 2;
      if (reqId && engine.getItemQty(reqId) >= reqQty) {
        engine.consumeItem(reqId, reqQty);
        player.gold += (qObj.rewardGold || 140);
        if (qObj.rewardItem) engine.addItemToBackpack(qObj.rewardItem, 1);
        npc.activeDynamicQuest = null;
        mem.activeQuest = null;
        replyBox.textContent = `"¡Excelente trabajo! Aquí tienes tus ${qObj.rewardGold || 140} de Oro."`;
        engine.addFloatingText(player.x, player.y - 26, `+${qObj.rewardGold || 140} Oro`, '#fbbf24');
        questBtn.textContent = 'Pedir Misión';
        onSave?.();
      } else if (!reqId) {
        player.gold += (qObj.rewardGold || 160);
        npc.activeDynamicQuest = null;
        mem.activeQuest = null;
        replyBox.textContent = `"¡Gracias por defender la zona! Toma ${qObj.rewardGold || 160} de Oro."`;
        questBtn.textContent = 'Pedir Misión';
        onSave?.();
      } else {
        replyBox.textContent = `"Aún te falta conseguir ${reqQty}x ${ITEMS[reqId]?.name || reqId}."`;
      }
    } else {
      sendChatMessage('¿Tienes alguna misión o necesitas madera, mineral o ayuda?');
    }
  });
  actionsEl.appendChild(questBtn);

  // Botón de regatear
  const haggleBtn = document.createElement('button');
  haggleBtn.className = 'btn btn-secondary btn-xs';
  haggleBtn.textContent = 'Regatear Precios';
  haggleBtn.addEventListener('click', () => {
    sendChatMessage('Somos aliados del bando, ¿puedes darme una rebaja y buen precio hoy?');
  });
  actionsEl.appendChild(haggleBtn);

  // Botón de acompañante
  if (npc.isAiHero) {
    const followBtn = document.createElement('button');
    followBtn.className = 'btn btn-secondary btn-xs';
    followBtn.textContent = npc.isCompanion ? 'Dejar de Seguirme' : 'Acompañarme (60 Oro / Amistad)';
    followBtn.addEventListener('click', () => {
      if (npc.isCompanion) {
        npc.isCompanion = false;
        mem.companionUntil = 0;
        npc.emotion = 'feliz';
        replyBox.textContent = '"De acuerdo, volveré a mis labores en la zona."';
        followBtn.textContent = 'Acompañarme (60 Oro / Amistad)';
      } else if ((mem.friendship || 0) >= 20 || player.gold >= 60) {
        if ((mem.friendship || 0) < 20) player.gold -= 60;
        npc.isCompanion = true;
        mem.companionUntil = Date.now() + 180000;
        npc.emotion = 'siguiendo';
        replyBox.textContent = '"¡Cuenta con mi arma! Te cubriré las espaldas en cualquier mapa."';
        followBtn.textContent = 'Dejar de Seguirme';
        onSave?.();
      } else {
        replyBox.textContent = '"Necesitas al menos 60 de Oro o mayor amistad conmigo para que te escolte."';
      }
    });
    actionsEl.appendChild(followBtn);

    // Botón para pedir reporte directo a mejoras_npc.md
    const reportBtn = document.createElement('button');
    reportBtn.className = 'btn btn-secondary btn-xs';
    reportBtn.textContent = 'Guardar Reporte en mejoras_npc.md';
    reportBtn.addEventListener('click', async () => {
      replyBox.textContent = 'Observando el mundo y guardando sugerencia en mejoras_npc.md...';
      const repText = await generateImmediateNpcReport(npc, {
        weather: engine.map?.weather,
        severeWeather: engine.weatherSevere,
        mapName: engine.map?.name
      });
      replyBox.textContent = `"${repText}" (Guardado en mejoras_npc.md)`;
    });
    actionsEl.appendChild(reportBtn);
  }

  // Si es mercader, abrir tienda o comprar disfraz
  if (npc.kind === 'mercader') {
    const shopBtn = document.createElement('button');
    shopBtn.className = 'btn btn-gold btn-xs';
    shopBtn.textContent = 'Abrir Tienda';
    shopBtn.addEventListener('click', () => {
      onClose();
      renderShopModal(engine, 'consumables', engine.callbacks.onToast, onSave, () => {});
      document.getElementById('modal-shop')?.classList.remove('hidden');
    });
    actionsEl.appendChild(shopBtn);

    const disguiseId = player.faction === 'alba' ? 'disfraz_hierro' : 'disfraz_alba';
    const disgBtn = document.createElement('button');
    disgBtn.className = 'btn btn-secondary btn-xs';
    disgBtn.textContent = `Comprar ${ITEMS[disguiseId]?.name || 'Disfraz'} (120 Oro)`;
    disgBtn.addEventListener('click', () => {
      if (player.gold < 120) {
        replyBox.textContent = '"Necesitas 120 de Oro para adquirir este disfraz de infiltración."';
        return;
      }
      if (engine.addItemToBackpack(disguiseId, 1)) {
        player.gold -= 120;
        onSave?.();
        replyBox.textContent = `"Aquí tienes tu ${ITEMS[disguiseId]?.name}. Equípalo desde la mochila (B) para cruzar el Portal de Hielo e infiltrarte en ${player.faction === 'alba' ? 'Bastión de Hierro' : 'Villa Alba'} sin ser atacado."`;
      }
    });
    actionsEl.appendChild(disgBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-secondary btn-xs';
  closeBtn.textContent = 'Cerrar';
  closeBtn.addEventListener('click', onClose);
  actionsEl.appendChild(closeBtn);
}
