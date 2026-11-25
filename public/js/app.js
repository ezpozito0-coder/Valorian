/**
 * Punto de entrada principal — Crónicas de la Fractura (Fases 8, 9 y 10 · 16:9)
 * Flujo de inicio inteligente, Campamento en Semicírculo, Características (Equipo/Habilidades/Talentos),
 * Mascotas con Niveles, Jefes del Mundo con Furia y Títulos. TG Legacy S.A.S.
 */

import {
  FACTIONS,
  CLASSES,
  TITLES,
  getRaceLabel,
  getClassLabel,
  createInitialSave,
  normalizeSave
} from './game/data.js';
import { GameEngine } from './game/engine.js';
import {
  drawHomeValoriaBg,
  drawCreatorPreviewCanvas,
  drawCampScene,
  getPixelIconSvg
} from './game/preview.js';
import {
  updateHudDom,
  renderCharacterModal,
  renderPetsModal,
  renderBossesModal,
  renderUpgradesModal,
  renderShopModal,
  renderAchievementsModal,
  renderWorldMapModal,
  showZoneBanner,
  buildNpcDialog
} from './game/hud.js';
import { initRouter, navigate, onRouteChange, getCurrentRoute } from './router.js';
import {
  SLOT_KEYS,
  saveSlotGame,
  deleteSlotGame,
  loadAllSlots,
  loadSettings,
  saveSettings,
  getSavedUser,
  setSavedUser,
  apiRequest,
  syncAllSlotsToCloud,
  hasPendingSync
} from './storage.js';
import { LEGAL_DOCS } from './legal.js';
import { sfx } from './audio.js';

const settings = loadSettings();
let slotsMap = { slot_1: null, slot_2: null, slot_3: null };
let activeSlotKey = 'slot_1';
let pendingDeleteSlot = null;
let campHitboxes = [];

const DIR_LABELS = ['Frente', 'Derecha', 'Espalda', 'Izquierda'];
const creatorState = {
  slotKey: 'slot_1',
  faction: 'alba',
  gender: 'male',
  race: FACTIONS.alba.races[0].id,
  heroClass: 'guerrero',
  dir: 0,
  attackTimer: 0
};

let charTab = 'equipo';
let upgradeTab = 'weapon';
let shopTab = 'consumables';
let authMode = 'login';
let achievementsReturnRoute = 'personajes';

let menuRafId = null;
let menuLastTime = 0;
let menuElapsed = 0;

const canvas = document.getElementById('game-canvas');
const engine = new GameEngine(canvas, {
  onHudUpdate: (snap) => updateHudDom(snap),
  onToast: (msg, type) => showToast(msg, type),
  onAutoSave: (data) => persistActiveSlot(data, false),
  onOpenCharacter: () => navigate('caracteristicas'),
  onOpenUpgrades: () => navigate('mejoras'),
  onOpenShop: () => navigate('tienda'),
  onOpenWorldMap: () => navigate('mapa'),
  onOpenBosses: () => navigate('jefes'),
  onZoneBanner: (title, sub) => showZoneBanner(title, sub),
  onVictory: () => {
    engine.setPaused(true);
    document.getElementById('modal-victory').classList.remove('hidden');
  },
  onTogglePause: () => togglePauseRoute(),
  onInteractNpc: (npc) => openNpcDialog(npc)
});

/* =========================================================
   MINI-CHAT DEL SISTEMA (LOGROS, BOTÍN, EVENTOS) + CONSOLA GM
   ========================================================= */
function appendChatMessage(message, type = 'info', customTag = null) {
  const log = document.getElementById('hud-chat-log');
  if (!log) return;

  let tag = customTag;
  let cssClass = 'chat-info';
  if (type === 'gm') {
    tag = tag || 'GM';
    cssClass = 'chat-gm';
  } else if (type === 'loot' || message.includes('Oro') || message.includes('Recogiste')) {
    tag = tag || 'Botín';
    cssClass = 'chat-loot';
  } else if (message.includes('Logro') || message.includes('Título') || message.includes('🏅') || message.includes('👑')) {
    tag = tag || 'Logro';
    cssClass = 'chat-success';
  } else if (type === 'success') {
    tag = tag || 'Evento';
    cssClass = 'chat-success';
  } else if (type === 'error') {
    tag = tag || 'Alerta';
    cssClass = 'chat-error';
  } else {
    tag = tag || 'Sistema';
    cssClass = 'chat-info';
  }

  const line = document.createElement('div');
  line.className = `chat-line ${cssClass}`;
  const cleanText = String(message).replace(/^[🏅👑✨]\s*/, '');
  line.innerHTML = `<span class="chat-tag">[${tag}]</span><span></span>`;
  line.lastElementChild.textContent = cleanText;
  log.appendChild(line);

  while (log.children.length > 35) {
    log.removeChild(log.firstChild);
  }
  log.scrollTop = log.scrollHeight;
}

function executeGmCommand(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return;

  const p = engine.player;
  if (!p) {
    appendChatMessage('Debes entrar al mundo con un personaje para usar comandos GM.', 'error', 'GM');
    return;
  }

  const lower = text.toLowerCase();
  const parts = lower.replace(/^\//, '').split(/\s+/);
  const cmd = parts[0];
  const argNum = parseInt(parts[1], 10);

  // 1. Comando de Oro: /oro 5000, oro 5000, +oro 5000, /gold 5000, gm 5000 o un número directo
  if (
    cmd === 'oro' ||
    cmd === '+oro' ||
    cmd === 'gold' ||
    cmd === 'monedas' ||
    (cmd === 'gm' && !Number.isNaN(argNum)) ||
    /^\+?\d+$/.test(cmd)
  ) {
    const amount = /^\+?\d+$/.test(cmd)
      ? parseInt(cmd, 10)
      : (!Number.isNaN(argNum) && argNum > 0 ? argNum : 10000);
    p.gold = Math.max(0, (p.gold || 0) + amount);
    sfx.playCoin();
    engine.addFloatingText(p.x, p.y - 26, `+${amount} Oro (GM)`, '#FDE047');
    updateHudDom(engine.getHudSnapshot());
    persistActiveSlot(engine.exportSave(), false);
    appendChatMessage(`+${amount.toLocaleString()} Oro agregado (Total: ${p.gold.toLocaleString()} Oro).`, 'gm', 'GM');
    return;
  }

  // 2. Comando de Nivel: /nivel 50, nivel 90, /lvl 50
  if (cmd === 'nivel' || cmd === 'lvl' || cmd === 'level') {
    const targetLvl = !Number.isNaN(argNum) ? Math.max(1, Math.min(90, argNum)) : Math.min(90, p.level + 10);
    const diff = Math.max(0, targetLvl - p.level);
    p.level = targetLvl;
    p.xp = 0;
    if (diff > 0) {
      p.skillPoints = (p.skillPoints || 0) + diff;
      p.talentPoints = (p.talentPoints || 0) + diff;
    }
    engine.recalcDerivedStats(false);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    sfx.playLevelUp();
    engine.addFloatingText(p.x, p.y - 30, `¡NIVEL ${p.level} (GM)!`, '#FDE047');
    updateHudDom(engine.getHudSnapshot());
    persistActiveSlot(engine.exportSave(), false);
    appendChatMessage(`Nivel ajustado a Nv.${p.level} (+${diff} Puntos de Habilidad y Talento).`, 'gm', 'GM');
    return;
  }

  // 3. Comando de Gemas: /gemas, gemas
  if (cmd === 'gemas' || cmd === 'gems') {
    const qty = !Number.isNaN(argNum) && argNum > 0 ? argNum : 10;
    engine.addItemToBackpack('gema_rubi', qty);
    engine.addItemToBackpack('gema_esmeralda', qty);
    engine.addItemToBackpack('gema_zafiro', qty);
    sfx.playGem();
    updateHudDom(engine.getHudSnapshot());
    persistActiveSlot(engine.exportSave(), false);
    appendChatMessage(`+${qty} Rubíes, +${qty} Esmeraldas y +${qty} Zafiros agregados a la mochila.`, 'gm', 'GM');
    return;
  }

  // 4. Comando de Curar: /curar, curar, /heal
  if (cmd === 'curar' || cmd === 'heal' || cmd === 'vida') {
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    sfx.playPotion();
    updateHudDom(engine.getHudSnapshot());
    appendChatMessage('Vida (PV) y Energía (PM) restauradas al 100%.', 'gm', 'GM');
    return;
  }

  // 5. Comando de Equipo Máximo: /max, /equipo, max
  if (cmd === 'max' || cmd === 'equipo' || cmd === 'full') {
    p.equipment.weapon = { tier: 4, plus: 12, quality: 4 };
    p.equipment.armor = { tier: 4, plus: 12, quality: 4 };
    p.gearSlots.alas = 'alas_vacio';
    engine.addItemToBackpack('alas_vacio', 1);
    engine.recalcDerivedStats(true);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    sfx.playUpgrade();
    updateHudDom(engine.getHudSnapshot());
    persistActiveSlot(engine.exportSave(), false);
    appendChatMessage('Arma y Armadura subidas a +12 Legendario y Alas del Vacío equipadas.', 'gm', 'GM');
    return;
  }

  // 6. Comando de Mascotas y Títulos: /mascotas, /titulos
  if (cmd === 'mascotas' || cmd === 'pets') {
    ['lobo_blanco', 'fantasma_hoz', 'gato_volador', 'dragon_negro'].forEach((id) => {
      if (!p.ownedPets.includes(id)) p.ownedPets.push(id);
    });
    persistActiveSlot(engine.exportSave(), false);
    appendChatMessage('Las 4 Mascotas de Valoria han sido desbloqueadas.', 'gm', 'GM');
    return;
  }

  if (cmd === 'titulos' || cmd === 'titles') {
    Object.keys(TITLES).forEach((id) => {
      if (!p.unlockedTitles.includes(id)) p.unlockedTitles.push(id);
    });
    engine.recalcDerivedStats(true);
    persistActiveSlot(engine.exportSave(), false);
    appendChatMessage('Todos los títulos de Jefes de Valoria desbloqueados.', 'gm', 'GM');
    return;
  }

  // 7. Montura de Guerra (/montura o tecla Z)
  if (cmd === 'montura' || cmd === 'mount' || cmd === 'caballo') {
    engine.toggleMount();
    return;
  }

  // 8. Ciclo Día / Noche (/noche, /dia, /atardecer)
  if (cmd === 'noche' || cmd === 'night') {
    engine.lockedTimeOfDay = 0.85;
    appendChatMessage('Ciclo ambiental fijado en Noche Estrellada de Valoria.', 'gm', 'GM');
    return;
  }
  if (cmd === 'dia' || cmd === 'day') {
    engine.lockedTimeOfDay = 0.25;
    appendChatMessage('Ciclo ambiental fijado en Día Soleado.', 'gm', 'GM');
    return;
  }

  // 9. Ayuda GM: /ayuda, /gm, ayuda
  if (cmd === 'ayuda' || cmd === 'help' || cmd === 'gm' || cmd === 'codigos') {
    appendChatMessage('Códigos GM: /oro 5000 | /nivel 50 | /gemas | /curar | /max | /montura | /noche | /dia', 'gm', 'GM');
    return;
  }

  // Mensaje libre en el chat
  appendChatMessage(text, 'gm', p.name || 'GM');
}

function showToast(message, type = 'info') {
  // Siempre registrar en el mini-chat del sistema para no perder ningún evento
  appendChatMessage(message, type);

  // Si el jugador está dentro del mapa (#screen-game visible), NO mostrar globos grandes flotantes
  const gameScreen = document.getElementById('screen-game');
  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    return;
  }

  const wrap = document.getElementById('toast-container');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function applyTheme(theme) {
  settings.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const optTheme = document.getElementById('btn-opt-theme');
  if (optTheme) optTheme.textContent = `Tema de Menús: ${theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}`;
  saveSettings(settings);
}

function applyAudioSettings() {
  sfx.setSfxEnabled(settings.sfx);
  sfx.setMusicEnabled(settings.music);
  const optSfx = document.getElementById('btn-opt-sfx');
  if (optSfx) optSfx.textContent = `Efectos de Sonido: ${settings.sfx ? 'Activado' : 'Silenciado'}`;
  const optMusic = document.getElementById('btn-opt-music');
  if (optMusic) optMusic.textContent = `Música Ambiental: ${settings.music ? 'Activada' : 'Silenciada'}`;
  const pauseAudio = document.getElementById('btn-pause-audio');
  if (pauseAudio) pauseAudio.textContent = `Música y Sonidos: ${(settings.sfx || settings.music) ? 'Activado' : 'Silenciado'}`;
  saveSettings(settings);
}

function applyTouchVisibility() {
  const touchEl = document.getElementById('touch-controls');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let show = isTouchDevice;
  if (settings.touchMode === 'on') show = true;
  if (settings.touchMode === 'off') show = false;
  touchEl.classList.toggle('hidden', !show);

  const labelMap = { auto: 'Auto', on: 'Siempre visibles', off: 'Ocultos' };
  const btn = document.getElementById('btn-pause-touch');
  if (btn) btn.textContent = `Controles Táctiles: ${labelMap[settings.touchMode] || 'Auto'}`;
}

function updateSyncBadge(statusText, mode = 'local') {
  const badge = document.getElementById('sync-badge');
  const text = document.getElementById('sync-badge-text');
  badge.classList.remove('online', 'offline');
  if (mode === 'online') badge.classList.add('online');
  if (mode === 'offline') badge.classList.add('offline');
  text.textContent = statusText;
}

function getActiveSave() {
  return slotsMap[activeSlotKey]?.saveData || null;
}

function hasAnyCharacter() {
  return SLOT_KEYS.some((k) => Boolean(slotsMap[k]?.saveData));
}

function firstEmptySlot() {
  return SLOT_KEYS.find((k) => !slotsMap[k]?.saveData) || null;
}

async function persistActiveSlot(saveData, notify = false) {
  if (!saveData) return;
  const normalized = normalizeSave(saveData);
  const rec = await saveSlotGame(activeSlotKey, normalized);
  slotsMap[activeSlotKey] = rec;

  if (navigator.onLine && getSavedUser()?.token) {
    const res = await syncAllSlotsToCloud();
    if (res.status === 'synced') {
      updateSyncBadge('Sincronizado', 'online');
      if (notify) showToast('Progreso guardado y sincronizado con MySQL.', 'success');
      return;
    }
  }
  updateSyncBadge(navigator.onLine ? 'Local' : 'Sin conexión', navigator.onLine ? 'local' : 'offline');
  if (notify) showToast('Progreso guardado localmente en este dispositivo.', 'success');
}

function openDrawer() {
  document.getElementById('nav-drawer').classList.add('open');
  document.getElementById('nav-drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-backdrop').classList.remove('hidden');
  document.getElementById('btn-menu-open').setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
  document.getElementById('nav-drawer').classList.remove('open');
  document.getElementById('nav-drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('drawer-backdrop').classList.add('hidden');
  document.getElementById('btn-menu-open').setAttribute('aria-expanded', 'false');
}

/* =========================================================
   CAMPAMENTO EN SEMICÍRCULO (SELECCIÓN DE PERSONAJES)
   ========================================================= */
function updateCampBottomBar() {
  if (!slotsMap[activeSlotKey]?.saveData) {
    const first = SLOT_KEYS.find((k) => slotsMap[k]?.saveData);
    if (first) activeSlotKey = first;
  }
  const s = getActiveSave();
  const sumEl = document.getElementById('camp-hero-summary');
  const titleEl = document.getElementById('camp-hero-title');
  const playBtn = document.getElementById('btn-camp-play');
  const delBtn = document.getElementById('btn-camp-delete');
  const createBtn = document.getElementById('btn-camp-create');

  if (s) {
    if (sumEl) sumEl.textContent = '';
    if (titleEl) titleEl.textContent = '';
    if (playBtn) playBtn.disabled = false;
    if (delBtn) delBtn.disabled = false;
  } else {
    if (sumEl) sumEl.textContent = '';
    if (titleEl) titleEl.textContent = '';
    if (playBtn) playBtn.disabled = true;
    if (delBtn) delBtn.disabled = true;
  }

  if (createBtn) {
    // Siempre permitir abrir la pantalla de Creación de Personaje (si los 3 espacios están llenos, crea/reemplaza en el espacio seleccionado)
    createBtn.disabled = false;
  }
}

function startMenuAnimation() {
  if (menuRafId) return;
  menuLastTime = performance.now();
  const step = (now) => {
    const dt = Math.min(0.05, (now - menuLastTime) / 1000);
    menuLastTime = now;
    menuElapsed += dt;

    const { route } = getCurrentRoute();

    if (route === 'inicio') {
      const bg = document.getElementById('home-bg-canvas');
      if (bg && !document.getElementById('screen-home').classList.contains('hidden')) {
        const w = bg.clientWidth || window.innerWidth;
        const h = bg.clientHeight || window.innerHeight;
        if (bg.width !== Math.floor(w / 2) || bg.height !== Math.floor(h / 2)) {
          bg.width = Math.max(160, Math.floor(w / 2));
          bg.height = Math.max(120, Math.floor(h / 2));
        }
        drawHomeValoriaBg(bg.getContext('2d'), bg.width, bg.height, menuElapsed);
      }
    } else if (['personajes', 'opciones', 'logros', 'cuenta', 'legal'].includes(route)) {
      const campCanvas = document.getElementById('camp-canvas');
      if (campCanvas && !document.getElementById('screen-slots').classList.contains('hidden')) {
        campHitboxes = drawCampScene(campCanvas, slotsMap, activeSlotKey, menuElapsed);
      }
    } else if (route === 'crear') {
      if (creatorState.attackTimer > 0) creatorState.attackTimer = Math.max(0, creatorState.attackTimer - dt * 1.9);
      const c = document.getElementById('creator-canvas');
      if (c) drawCreatorPreviewCanvas(c, creatorState, menuElapsed);
    }

    menuRafId = requestAnimationFrame(step);
  };
  menuRafId = requestAnimationFrame(step);
}

function stopMenuAnimation() {
  if (menuRafId) {
    cancelAnimationFrame(menuRafId);
    menuRafId = null;
  }
}

/* =========================================================
   CREACIÓN DE PERSONAJE 16:9 CON RETRATOS E ICONOS PNG ILUSTRADOS
   ========================================================= */
function getRaceSlug(raceId) {
  const map = {
    Humano: 'humano',
    Elfo: 'elfo',
    Enano: 'enano',
    Orco: 'orco',
    'Lobo Guerrero': 'lobo',
    'Nómada': 'nomada'
  };
  return map[raceId] || 'humano';
}

function renderCreatePickers() {
  const idx = Math.max(0, SLOT_KEYS.indexOf(creatorState.slotKey)) + 1;
  document.getElementById('create-slot-label').textContent = `Espacio ${idx}`;
  document.getElementById('preview-dir-label').textContent = DIR_LABELS[creatorState.dir];
  const gCode = creatorState.gender === 'female' ? 'f' : 'm';
  const fCode = creatorState.faction === 'hierro' ? 'hierro' : 'alba';

  const factionWrap = document.getElementById('faction-picker');
  factionWrap.innerHTML = '';
  [
    { id: 'alba', label: 'Alba', title: 'La Guardia del Alba', img: './assets/ui/emblema_alba.png' },
    { id: 'hierro', label: 'Hierro', title: 'Los Clanes de Hierro', img: './assets/ui/emblema_hierro.png' }
  ].forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = f.title;
    btn.className = `pixel-choice-tile ${creatorState.faction === f.id ? 'selected' : ''}`;
    btn.innerHTML = `<img src="${f.img}" alt="${f.label}" class="creator-tile-img" width="52" height="52" /><span class="tile-caption">${f.label}</span>`;
    btn.addEventListener('click', () => { creatorState.faction = f.id; renderCreatePickers(); });
    factionWrap.appendChild(btn);
  });

  const genderWrap = document.getElementById('gender-picker');
  genderWrap.innerHTML = '';
  [
    { id: 'male', label: 'Masc.', title: 'Masculino', img: './assets/ui/sexo_m.png' },
    { id: 'female', label: 'Fem.', title: 'Femenino', img: './assets/ui/sexo_f.png' }
  ].forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = g.title;
    btn.className = `pixel-choice-tile ${creatorState.gender === g.id ? 'selected' : ''}`;
    btn.innerHTML = `<img src="${g.img}" alt="${g.label}" class="creator-tile-img portrait-frame" width="52" height="52" /><span class="tile-caption">${g.label}</span>`;
    btn.addEventListener('click', () => { creatorState.gender = g.id; renderCreatePickers(); });
    genderWrap.appendChild(btn);
  });

  const raceWrap = document.getElementById('race-picker');
  const races = FACTIONS[creatorState.faction].races;
  if (!races.some((r) => r.id === creatorState.race)) creatorState.race = races[0].id;
  raceWrap.innerHTML = '';
  for (const r of races) {
    const label = getRaceLabel(r.id, creatorState.gender);
    const slug = getRaceSlug(r.id);
    const imgPath = `./assets/ui/raza_${slug}_${gCode}.png`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${label}: ${r.desc}`;
    btn.className = `pixel-choice-tile ${r.id === creatorState.race ? 'selected' : ''}`;
    btn.innerHTML = `<img src="${imgPath}" alt="${label}" class="creator-tile-img portrait-frame" width="56" height="56" /><span class="tile-caption">${label}</span>`;
    btn.addEventListener('click', () => { creatorState.race = r.id; renderCreatePickers(); });
    raceWrap.appendChild(btn);
  }

  const classWrap = document.getElementById('class-picker');
  classWrap.innerHTML = '';
  for (const cls of Object.values(CLASSES)) {
    const label = getClassLabel(cls.id, creatorState.gender);
    const imgPath = `./assets/ui/clase_${cls.id}_${gCode}_${fCode}.png`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${label} · ${cls.weapon}`;
    btn.className = `pixel-choice-tile class-tile ${cls.id === creatorState.heroClass ? 'selected' : ''}`;
    btn.innerHTML = `<img src="${imgPath}" alt="${label}" class="creator-tile-img class-fig-img" width="60" height="60" /><span class="tile-caption">${label}</span>`;
    btn.addEventListener('click', () => { creatorState.heroClass = cls.id; renderCreatePickers(); });
    classWrap.appendChild(btn);
  }
}

/* =========================================================
   MODALES Y ENRUTADOR
   ========================================================= */
function hideAllModals() {
  document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
}

function togglePauseRoute() {
  const isPaused = !document.getElementById('modal-pause').classList.contains('hidden');
  if (isPaused) navigate('jugar');
  else navigate('pausa');
}

function openNpcDialog(npc) {
  engine.setPaused(true);
  hideAllModals();
  const modal = document.getElementById('modal-dialog');
  modal.classList.remove('hidden');
  buildNpcDialog(npc, engine, {
    onClose: () => { modal.classList.add('hidden'); engine.setPaused(false); },
    onOpenUpgrades: () => navigate('mejoras'),
    onSave: () => persistActiveSlot(engine.exportSave(), false)
  });
}

function renderAccountModal() {
  const user = getSavedUser();
  const statusBox = document.getElementById('account-status-box');
  const formsWrap = document.getElementById('account-forms');

  if (user) {
    formsWrap.classList.add('hidden');
    statusBox.innerHTML = `
      <div><strong>Sesión activa:</strong> ${user.username} (${user.email || 'Jugador'})</div>
      <div class="modal-actions" style="margin-top:10px">
        <button type="button" id="btn-acc-sync" class="btn btn-gold btn-sm">Sincronizar 3 Espacios</button>
        <button type="button" id="btn-acc-logout" class="btn btn-danger btn-sm">Cerrar Sesión</button>
      </div>
    `;
    document.getElementById('btn-acc-sync').addEventListener('click', async () => {
      const res = await syncAllSlotsToCloud();
      slotsMap = await loadAllSlots();
      showToast(res.message, res.status === 'error' ? 'error' : 'success');
      updateSyncBadge(res.status === 'synced' ? 'Sincronizado' : 'Local', res.status === 'synced' ? 'online' : 'local');
    });
    document.getElementById('btn-acc-logout').addEventListener('click', async () => {
      try { await apiRequest('/api/auth/logout', { method: 'POST' }); } catch {}
      setSavedUser(null);
      updateSyncBadge('Local', 'local');
      renderAccountModal();
      showToast('Sesión cerrada.');
    });
  } else {
    formsWrap.classList.remove('hidden');
    statusBox.textContent = navigator.onLine
      ? 'Modo local activo. Inicia sesión para sincronizar tus personajes y logros con MySQL.'
      : 'Sin conexión. Todo se guarda localmente y sincronizará al volver internet.';
  }
}

function handleRoute({ route, param }) {
  closeDrawer();
  hideAllModals();

  const homeEl = document.getElementById('screen-home');
  const slotsEl = document.getElementById('screen-slots');
  const createEl = document.getElementById('screen-create');
  const gameEl = document.getElementById('screen-game');

  const isGameRoute = ['jugar', 'pausa', 'caracteristicas', 'mascotas', 'jefes', 'mejoras', 'tienda', 'mapa'].includes(route);

  if (isGameRoute && !getActiveSave()) {
    const first = SLOT_KEYS.find((k) => slotsMap[k]?.saveData);
    if (first) activeSlotKey = first;
    else { navigate('crear', 'slot_1', { replace: true }); return; }
  }

  if (route === 'logros' && engine.running && achievementsReturnRoute === 'pausa') {
    engine.setPaused(true);
    renderAchievementsModal(engine.exportSave() || getActiveSave());
    document.getElementById('modal-achievements').classList.remove('hidden');
    return;
  }

  homeEl.classList.toggle('hidden', route !== 'inicio');
  slotsEl.classList.toggle('hidden', isGameRoute || route === 'inicio' || route === 'crear');
  createEl.classList.toggle('hidden', route !== 'crear');
  gameEl.classList.toggle('hidden', !isGameRoute);
  document.body.classList.toggle('in-game', isGameRoute);

  if (isGameRoute) {
    stopMenuAnimation();
    if (!engine.running) {
      engine.loadFromSave(getActiveSave());
      engine.start();
    }
    applyTouchVisibility();

    if (route === 'jugar') {
      engine.setPaused(false);
    } else if (route === 'pausa') {
      engine.setPaused(true);
      document.getElementById('modal-pause').classList.remove('hidden');
    } else if (route === 'caracteristicas') {
      engine.setPaused(true);
      renderCharacterModal(engine, charTab, {
        onToast: showToast,
        onSave: () => persistActiveSlot(engine.exportSave(), false),
        onOpenUpgrades: () => navigate('mejoras'),
        onOpenPets: () => navigate('mascotas'),
        onClose: () => navigate('jugar')
      });
      document.getElementById('modal-character').classList.remove('hidden');
    } else if (route === 'mascotas') {
      engine.setPaused(true);
      renderPetsModal(engine, showToast, () => persistActiveSlot(engine.exportSave(), false));
      document.getElementById('modal-pets').classList.remove('hidden');
    } else if (route === 'jefes') {
      engine.setPaused(true);
      renderBossesModal(engine);
      document.getElementById('modal-bosses').classList.remove('hidden');
    } else if (route === 'mejoras') {
      engine.setPaused(true);
      renderUpgradesModal(engine, upgradeTab, showToast, () => persistActiveSlot(engine.exportSave(), false));
      document.getElementById('modal-upgrades').classList.remove('hidden');
    } else if (route === 'tienda') {
      engine.setPaused(true);
      renderShopModal(engine, shopTab, showToast, () => persistActiveSlot(engine.exportSave(), false), () => navigate('mascotas'));
      document.getElementById('modal-shop').classList.remove('hidden');
    } else if (route === 'mapa') {
      engine.setPaused(true);
      renderWorldMapModal(engine, () => navigate('jugar'));
      document.getElementById('modal-worldmap').classList.remove('hidden');
    }
    return;
  }

  if (engine.running) {
    persistActiveSlot(engine.exportSave(), false);
    engine.stop();
  }
  startMenuAnimation();

  if (route === 'personajes') {
    updateCampBottomBar();
  } else if (route === 'crear') {
    creatorState.slotKey = SLOT_KEYS.includes(param) ? param : (firstEmptySlot() || 'slot_1');
    creatorState.dir = 0;
    creatorState.attackTimer = 0;
    document.getElementById('hero-name').value = '';
    renderCreatePickers();
  } else if (route === 'opciones') {
    updateCampBottomBar();
    applyTheme(settings.theme);
    applyAudioSettings();
    document.getElementById('modal-options').classList.remove('hidden');
  } else if (route === 'logros') {
    achievementsReturnRoute = 'personajes';
    updateCampBottomBar();
    const anySave = getActiveSave() || SLOT_KEYS.map((k) => slotsMap[k]?.saveData).find(Boolean) || null;
    renderAchievementsModal(anySave);
    document.getElementById('modal-achievements').classList.remove('hidden');
  } else if (route === 'cuenta') {
    updateCampBottomBar();
    renderAccountModal();
    document.getElementById('modal-account').classList.remove('hidden');
  } else if (route === 'legal') {
    updateCampBottomBar();
    const doc = LEGAL_DOCS[param] || LEGAL_DOCS.legal;
    document.getElementById('legal-title').textContent = doc.title;
    document.getElementById('legal-body').innerHTML = doc.html;
    document.getElementById('modal-legal').classList.remove('hidden');
  }
}

/* =========================================================
   CONTROLES TÁCTILES Y EVENTOS
   ========================================================= */
function initTouchControls() {
  const zone = document.getElementById('joystick-zone');
  const thumb = document.getElementById('joystick-thumb');
  const maxDist = 38;
  let activePointer = null;
  let center = { x: 0, y: 0 };

  function resetJoy() {
    activePointer = null;
    thumb.style.transform = 'translate(0px, 0px)';
    engine.setJoystick(0, 0);
  }

  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sfx.ensureCtx();
    activePointer = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    const rect = zone.getBoundingClientRect();
    center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    moveJoy(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === activePointer) { e.preventDefault(); moveJoy(e.clientX, e.clientY); } });
  zone.addEventListener('pointerup', (e) => { if (e.pointerId === activePointer) resetJoy(); });
  zone.addEventListener('pointercancel', resetJoy);

  function moveJoy(cx, cy) {
    const dx = cx - center.x;
    const dy = cy - center.y;
    const clamped = Math.min(Math.hypot(dx, dy), maxDist);
    const angle = Math.atan2(dy, dx);
    thumb.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;
    engine.setJoystick((Math.cos(angle) * clamped) / maxDist, (Math.sin(angle) * clamped) / maxDist);
  }

  document.querySelectorAll('.skill-btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sfx.ensureCtx();
      engine.triggerAbility(Number(btn.dataset.skill));
    });
  });
}

function bindEvents() {
  window.addEventListener('pointerdown', () => sfx.ensureCtx(), { once: true });
  window.addEventListener('keydown', () => sfx.ensureCtx(), { once: true });

  document.getElementById('btn-menu-open').addEventListener('click', openDrawer);
  document.getElementById('btn-menu-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
  document.getElementById('brand-home').addEventListener('click', (e) => { e.preventDefault(); navigate('personajes'); });
  document.getElementById('btn-theme-toggle').addEventListener('click', () => applyTheme(settings.theme === 'dark' ? 'light' : 'dark'));

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.nav === 'logros') achievementsReturnRoute = 'personajes';
      navigate(btn.dataset.nav);
    });
  });
  document.querySelectorAll('[data-legal]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('legal', btn.dataset.legal));
  });

  // Portada
  document.getElementById('btn-home-play').addEventListener('click', () => navigate(hasAnyCharacter() ? 'personajes' : 'crear', hasAnyCharacter() ? null : 'slot_1'));
  document.getElementById('btn-home-options').addEventListener('click', () => navigate('opciones'));

  // Campamento en Semicírculo (click en personajes o "+")
  document.getElementById('camp-canvas').addEventListener('click', (e) => {
    const cv = e.currentTarget;
    const rect = cv.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * cv.width;
    const cy = ((e.clientY - rect.top) / rect.height) * cv.height;
    const hit = campHitboxes.find((h) => cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h);
    if (!hit) return;
    if (hit.type === 'select') {
      activeSlotKey = hit.key;
      sfx.playCoin();
      updateCampBottomBar();
    } else if (hit.type === 'create') {
      navigate('crear', hit.key);
    }
  });

  document.getElementById('btn-camp-play').addEventListener('click', () => {
    if (!getActiveSave()) return;
    if (engine.running) engine.stop();
    navigate('jugar');
  });
  document.getElementById('btn-camp-create').addEventListener('click', () => {
    const empty = firstEmptySlot();
    if (empty) {
      navigate('crear', empty);
    } else {
      // Si los 3 espacios están ocupados, abrir la pantalla de creación en el espacio actualmente seleccionado
      navigate('crear', activeSlotKey || 'slot_1');
    }
  });
  document.getElementById('btn-camp-delete').addEventListener('click', () => {
    const s = getActiveSave();
    if (!s) return;
    pendingDeleteSlot = activeSlotKey;
    document.getElementById('confirm-delete-text').textContent = `¿Seguro que deseas eliminar a "${s.name}" (Nv.${s.level})?`;
    document.getElementById('modal-confirm-delete').classList.remove('hidden');
  });
  document.getElementById('btn-confirm-delete-yes').addEventListener('click', async () => {
    if (!pendingDeleteSlot) return;
    await deleteSlotGame(pendingDeleteSlot);
    slotsMap[pendingDeleteSlot] = null;
    pendingDeleteSlot = null;
    document.getElementById('modal-confirm-delete').classList.add('hidden');
    if (!hasAnyCharacter()) {
      navigate('crear', 'slot_1');
    } else {
      updateCampBottomBar();
    }
    showToast('Personaje eliminado.');
  });

  // Creación
  document.getElementById('btn-create-back').addEventListener('click', () => navigate(hasAnyCharacter() ? 'personajes' : 'inicio'));
  document.getElementById('btn-rot-left').addEventListener('click', () => {
    creatorState.dir = (creatorState.dir + 3) % 4;
    document.getElementById('preview-dir-label').textContent = DIR_LABELS[creatorState.dir];
  });
  document.getElementById('btn-rot-right').addEventListener('click', () => {
    creatorState.dir = (creatorState.dir + 1) % 4;
    document.getElementById('preview-dir-label').textContent = DIR_LABELS[creatorState.dir];
  });
  document.getElementById('btn-test-attack').addEventListener('click', () => {
    creatorState.attackTimer = 1.0;
    sfx.playAttack(creatorState.gender);
  });

  document.getElementById('form-create-hero').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('hero-name').value.trim();
    if (name.length < 3 || name.length > 15) return showToast('El nombre debe tener entre 3 y 15 letras.', 'error');
    activeSlotKey = creatorState.slotKey;
    const freshSave = createInitialSave({
      name, faction: creatorState.faction, gender: creatorState.gender,
      race: creatorState.race, heroClass: creatorState.heroClass
    });
    await persistActiveSlot(freshSave, false);
    if (engine.running) engine.stop();
    navigate('jugar');
    showToast(`${freshSave.gender === 'female' ? '¡Bienvenida' : '¡Bienvenido'} a Valoria, ${freshSave.name}!`, 'success');
  });

  // Opciones
  document.getElementById('btn-opt-sfx').addEventListener('click', () => { settings.sfx = !settings.sfx; applyAudioSettings(); });
  document.getElementById('btn-opt-music').addEventListener('click', () => { settings.music = !settings.music; applyAudioSettings(); });
  document.getElementById('btn-opt-theme').addEventListener('click', () => applyTheme(settings.theme === 'dark' ? 'light' : 'dark'));
  document.getElementById('btn-opt-account').addEventListener('click', () => navigate('cuenta'));

  // HUD
  document.getElementById('btn-hud-char-open').addEventListener('click', () => navigate('caracteristicas'));
  document.getElementById('btn-hud-pet').addEventListener('click', () => navigate('mascotas'));
  document.getElementById('btn-hud-bosses').addEventListener('click', () => navigate('jefes'));
  document.getElementById('btn-hud-potion').addEventListener('click', () => engine.useBestHealPotion());
  document.getElementById('btn-hud-upgrades').addEventListener('click', () => navigate('mejoras'));
  document.getElementById('btn-hud-shop').addEventListener('click', () => navigate('tienda'));
  document.getElementById('btn-hud-backpack').addEventListener('click', () => navigate('caracteristicas'));
  document.getElementById('btn-hud-worldmap').addEventListener('click', () => navigate('mapa'));
  document.getElementById('btn-hud-pause').addEventListener('click', () => navigate('pausa'));
  document.getElementById('hud-quest-box').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('collapsed');
  });
  document.getElementById('btn-interact-prompt').addEventListener('click', () => engine.interactNearest());
  document.getElementById('btn-victory-continue').addEventListener('click', () => {
    document.getElementById('modal-victory').classList.add('hidden');
    engine.setPaused(false);
  });

  // Pestañas Características (Equipo / Habilidades / Talentos)
  document.querySelectorAll('[data-char-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      charTab = btn.dataset.charTab;
      document.querySelectorAll('[data-char-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      renderCharacterModal(engine, charTab, {
        onToast: showToast,
        onSave: () => persistActiveSlot(engine.exportSave(), false),
        onOpenUpgrades: () => navigate('mejoras'),
        onOpenPets: () => navigate('mascotas'),
        onClose: () => navigate('jugar')
      });
    });
  });

  // Pausa
  document.getElementById('btn-pause-resume').addEventListener('click', () => navigate('jugar'));
  document.getElementById('btn-pause-save').addEventListener('click', () => persistActiveSlot(engine.exportSave(), true));
  document.getElementById('btn-pause-audio').addEventListener('click', () => {
    const next = !(settings.sfx || settings.music);
    settings.sfx = next; settings.music = next; applyAudioSettings();
  });
  document.getElementById('btn-pause-achievements').addEventListener('click', () => { achievementsReturnRoute = 'pausa'; navigate('logros'); });
  document.getElementById('btn-pause-touch').addEventListener('click', () => {
    const order = ['auto', 'on', 'off'];
    settings.touchMode = order[(order.indexOf(settings.touchMode) + 1) % order.length];
    saveSettings(settings);
    applyTouchVisibility();
  });
  document.getElementById('btn-pause-theme').addEventListener('click', () => applyTheme(settings.theme === 'dark' ? 'light' : 'dark'));
  document.getElementById('btn-pause-home').addEventListener('click', () => navigate('personajes'));

  // Tabs Mejoras y Tienda
  document.querySelectorAll('[data-upgrade-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      upgradeTab = btn.dataset.upgradeTab;
      document.querySelectorAll('[data-upgrade-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      renderUpgradesModal(engine, upgradeTab, showToast, () => persistActiveSlot(engine.exportSave(), false));
    });
  });
  document.querySelectorAll('[data-shop-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      shopTab = btn.dataset.shopTab;
      document.querySelectorAll('[data-shop-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      renderShopModal(engine, shopTab, showToast, () => persistActiveSlot(engine.exportSave(), false), () => navigate('mascotas'));
    });
  });

  // Cerrar modales
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.close;
      if (target === 'modal-dialog') { document.getElementById('modal-dialog').classList.add('hidden'); engine.setPaused(false); }
      else if (target === 'modal-confirm-delete') { pendingDeleteSlot = null; document.getElementById('modal-confirm-delete').classList.add('hidden'); }
      else if (['modal-character', 'modal-pets', 'modal-bosses', 'modal-upgrades', 'modal-shop', 'modal-worldmap', 'modal-pause'].includes(target)) navigate('jugar');
      else if (target === 'modal-achievements') navigate(achievementsReturnRoute === 'pausa' ? 'pausa' : 'personajes');
      else navigate('personajes');
    });
  });

  // Auth
  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      authMode = btn.dataset.authTab;
      document.querySelectorAll('[data-auth-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      const isReg = authMode === 'register';
      document.querySelectorAll('.auth-register-only').forEach((el) => el.classList.toggle('hidden', !isReg));
      document.getElementById('lbl-auth-id').textContent = isReg ? 'Correo electrónico' : 'Usuario o Correo';
      document.getElementById('btn-auth-submit').textContent = isReg ? 'Crear Cuenta' : 'Iniciar Sesión';
      document.getElementById('auth-feedback').textContent = '';
    });
  });

  document.getElementById('form-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('auth-feedback');
    feedback.className = 'form-feedback';
    feedback.textContent = 'Conectando...';
    const identifier = document.getElementById('auth-identifier').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value.trim();
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register' ? { username, email: identifier, password } : { identifier, password };
      const data = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setSavedUser({ ...data.user, token: data.token });
      await syncAllSlotsToCloud();
      slotsMap = await loadAllSlots();
      feedback.className = 'form-feedback ok';
      feedback.textContent = 'Sesión iniciada correctamente.';
      updateSyncBadge('Sincronizado', 'online');
      renderAccountModal();
      showToast(`¡Bienvenido, ${data.user.username}!`, 'success');
    } catch (err) {
      feedback.textContent = err.message;
    }
  });

  if (!settings.cookiesAccepted) document.getElementById('cookie-banner').classList.remove('hidden');
  document.getElementById('btn-cookie-accept').addEventListener('click', () => {
    settings.cookiesAccepted = true;
    saveSettings(settings);
    document.getElementById('cookie-banner').classList.add('hidden');
  });

  // Eventos del Mini-Chat del Sistema y Consola GM
  const chatForm = document.getElementById('hud-chat-form');
  const chatInput = document.getElementById('hud-chat-input');
  const chatPanel = document.getElementById('hud-chat-panel');
  const chatToggle = document.getElementById('btn-chat-toggle');

  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!chatInput) return;
    const val = chatInput.value.trim();
    if (val) {
      executeGmCommand(val);
      chatInput.value = '';
    }
    chatInput.blur();
  });

  chatToggle?.addEventListener('click', () => {
    if (!chatPanel) return;
    const collapsed = chatPanel.classList.toggle('collapsed');
    chatToggle.textContent = collapsed ? '▴' : '▾';
  });

  appendChatMessage('Consola GM lista. Escribe /oro 5000, /nivel 50, /gemas, /max o /ayuda.', 'gm', 'GM');

  window.addEventListener('online', async () => {
    updateSyncBadge('Sincronizando...', 'online');
    if (getSavedUser()?.token && hasPendingSync()) {
      const res = await syncAllSlotsToCloud();
      if (res.status === 'synced') {
        slotsMap = await loadAllSlots();
        updateSyncBadge('Sincronizado', 'online');
        showToast('Conexión recuperada: personajes sincronizados con MySQL.', 'success');
        return;
      }
    }
    updateSyncBadge(getSavedUser()?.token ? 'En línea' : 'Local', 'online');
  });

  window.addEventListener('offline', () => {
    updateSyncBadge('Sin conexión', 'offline');
    showToast('Modo sin conexión activo.');
  });
}

async function bootstrap() {
  applyTheme(settings.theme || 'dark');
  applyAudioSettings();

  slotsMap = await loadAllSlots();
  // Normalizar todos los espacios cargados
  for (const k of SLOT_KEYS) {
    if (slotsMap[k]?.saveData) slotsMap[k].saveData = normalizeSave(slotsMap[k].saveData);
  }
  const firstOccupied = SLOT_KEYS.find((k) => slotsMap[k]?.saveData);
  if (firstOccupied) activeSlotKey = firstOccupied;

  updateSyncBadge(
    navigator.onLine ? (getSavedUser()?.token ? 'En línea' : 'Local') : 'Sin conexión',
    navigator.onLine ? 'online' : 'offline'
  );

  initTouchControls();
  bindEvents();
  onRouteChange(handleRoute);

  // Lógica de inicio obligatoria:
  // Sin personajes -> abrir Creación directamente; con 1+ personajes -> abrir Selección en Semicírculo
  const rawHash = (window.location.hash || '').replace(/^#/, '');
  if (!rawHash || rawHash === 'inicio') {
    if (hasAnyCharacter()) {
      window.history.replaceState({ route: 'personajes', param: null }, '', '#personajes');
    } else {
      window.history.replaceState({ route: 'crear', param: 'slot_1' }, '', '#crear/slot_1');
    }
  }
  initRouter();

  if ('serviceWorker' in navigator) {
    let refreshingSw = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshingSw) return;
      refreshingSw = true;
      showToast('Actualizando a la última versión de Valoria...', 'info');
      setTimeout(() => window.location.reload(), 450);
    });

    navigator.serviceWorker
      .register('./sw.js?v=40', { updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {});
  }

  // Instalación como App nativa (PWA / WebAPK en Android, iOS y PC)
  let deferredInstallPrompt = null;
  const installBtns = [
    document.getElementById('btn-install-app'),
    document.getElementById('btn-drawer-install'),
    document.getElementById('btn-home-install'),
    document.getElementById('btn-pause-install'),
    document.getElementById('btn-opt-install')
  ].filter(Boolean);
  const modalInstall = document.getElementById('modal-install-app');
  const btnModalTriggerInstall = document.getElementById('btn-modal-trigger-install');

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    installBtns.forEach((b) => b.classList.add('hidden'));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!isStandalone) {
      installBtns.forEach((b) => b.classList.remove('hidden'));
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installBtns.forEach((b) => b.classList.add('hidden'));
    modalInstall?.classList.add('hidden');
    showToast('¡Crónicas de la Fractura se instaló como App en tu dispositivo!', 'success');
  });

  const triggerNativeOrGuideInstall = async (fromModalButton = false) => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') {
        installBtns.forEach((b) => b.classList.add('hidden'));
        modalInstall?.classList.add('hidden');
      }
      deferredInstallPrompt = null;
      return;
    }
    if (isStandalone) {
      showToast('Ya estás jugando desde la App instalada.', 'success');
      return;
    }
    if (!fromModalButton && modalInstall) {
      modalInstall.classList.remove('hidden');
      return;
    }
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) {
      showToast('En iPhone/iPad: toca el botón Compartir de Safari y elige "Agregar a inicio".', 'info');
    } else {
      showToast('Usa el menú de 3 puntos del navegador (⋮) arriba a la derecha y toca "Instalar aplicación".', 'info');
    }
  };

  for (const btn of installBtns) {
    btn.addEventListener('click', () => {
      closeDrawer();
      triggerNativeOrGuideInstall(false);
    });
  }
  btnModalTriggerInstall?.addEventListener('click', () => triggerNativeOrGuideInstall(true));

  if (navigator.onLine && getSavedUser()?.token) {
    syncAllSlotsToCloud().then(async (res) => {
      if (res.status === 'synced') {
        slotsMap = await loadAllSlots();
        updateSyncBadge('Sincronizado', 'online');
      }
    });
  }
}

bootstrap();
