/**
 * Punto de entrada principal — Crónicas de la Fractura (Fase 5)
 * Inicio animado, Selector de 3 Personajes, Creación detallada, 6 Mapas, Offline-First + MySQL.
 * TG Legacy S.A.S.
 */

import {
  FACTIONS,
  CLASSES,
  MAPS_META,
  getRaceLabel,
  getClassLabel,
  createInitialSave,
  normalizeSave
} from './game/data.js';
import { GameEngine } from './game/engine.js';
import {
  drawHomeValoriaBg,
  drawCreatorPreviewCanvas,
  drawSlotCardCanvas,
  getPixelIconSvg
} from './game/preview.js';
import {
  updateHudDom,
  renderUpgradesModal,
  renderShopModal,
  renderBackpackModal,
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

// Estado de creación de personaje
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

let upgradeTab = 'weapon';
let shopTab = 'pets';
let authMode = 'login';
let achievementsReturnRoute = 'inicio';

let menuRafId = null;
let menuLastTime = 0;
let menuElapsed = 0;

const canvas = document.getElementById('game-canvas');
const engine = new GameEngine(canvas, {
  onHudUpdate: (snap) => updateHudDom(snap),
  onToast: (msg, type) => showToast(msg, type),
  onAutoSave: (data) => persistActiveSlot(data, false),
  onOpenBackpack: () => navigate('mochila'),
  onOpenUpgrades: () => navigate('mejoras'),
  onOpenShop: () => navigate('tienda'),
  onOpenWorldMap: () => navigate('mapa'),
  onZoneBanner: (title, sub) => showZoneBanner(title, sub),
  onVictory: () => {
    engine.setPaused(true);
    document.getElementById('modal-victory').classList.remove('hidden');
  },
  onTogglePause: () => togglePauseRoute(),
  onInteractNpc: (npc) => openNpcDialog(npc)
});

/* =========================================================
   UTILIDADES UI (TOASTS, TEMA, AUDIO, DRAWER, SYNC)
   ========================================================= */
function showToast(message, type = 'info') {
  const wrap = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3600);
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
  if (pauseAudio) {
    const anyOn = settings.sfx || settings.music;
    pauseAudio.textContent = `Música y Sonidos: ${anyOn ? 'Activado' : 'Silenciado'}`;
  }
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
   BUCLE ANIMADO DE MENÚS (INICIO, 3 PERSONAJES Y CREACIÓN)
   ========================================================= */
function startMenuAnimation() {
  if (menuRafId) return;
  menuLastTime = performance.now();
  const step = (now) => {
    const dt = Math.min(0.05, (now - menuLastTime) / 1000);
    menuLastTime = now;
    menuElapsed += dt;

    const { route } = getCurrentRoute();

    if (['inicio', 'opciones', 'logros', 'cuenta', 'legal'].includes(route)) {
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
    } else if (route === 'personajes') {
      for (const key of SLOT_KEYS) {
        const rec = slotsMap[key];
        const c = document.getElementById(`slot-canvas-${key}`);
        if (rec?.saveData && c) drawSlotCardCanvas(c, rec.saveData, menuElapsed);
      }
    } else if (route === 'crear') {
      if (creatorState.attackTimer > 0) {
        creatorState.attackTimer = Math.max(0, creatorState.attackTimer - dt * 1.9);
      }
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
   SELECTOR DE 3 PERSONAJES (#personajes)
   ========================================================= */
function renderSlotsScreen() {
  const grid = document.getElementById('slots-grid');
  grid.innerHTML = '';

  SLOT_KEYS.forEach((key, idx) => {
    const rec = slotsMap[key];
    const card = document.createElement('div');
    const slotNum = idx + 1;

    if (rec?.saveData) {
      const s = normalizeSave(rec.saveData);
      slotsMap[key].saveData = s;
      const cls = CLASSES[s.heroClass] || CLASSES.guerrero;
      const fac = FACTIONS[s.faction] || FACTIONS.alba;
      const mapName = s.currentMap === 'aldea' ? fac.villageName : (MAPS_META[s.currentMap]?.name || 'Valoria');

      card.className = 'slot-card occupied';
      card.innerHTML = `
        <div class="slot-canvas-wrap">
          <canvas id="slot-canvas-${key}" width="240" height="150"></canvas>
        </div>
        <div class="slot-info">
          <small style="color:var(--text-muted)">Espacio ${slotNum} · ${mapName}</small>
          <h3>${s.name}</h3>
          <p><strong>Nivel ${s.level}</strong> · ${getClassLabel(s.heroClass, s.gender)} · ${getRaceLabel(s.race, s.gender)}</p>
          <p>${fac.name} · ${s.gold} Oro</p>
        </div>
        <div class="slot-actions">
          <button type="button" class="btn btn-primary btn-sm" data-enter-slot="${key}">Entrar al Mundo</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete-slot="${key}">Borrar</button>
        </div>
      `;
    } else {
      card.className = 'slot-card empty';
      card.innerHTML = `
        <small style="color:var(--text-muted)">Espacio ${slotNum} · Vacío</small>
        <p style="color:var(--text-muted);font-size:0.88rem">Crea un nuevo héroe independiente</p>
        <button type="button" class="btn btn-primary" data-create-slot="${key}">+ Crear Nuevo Personaje</button>
      `;
    }

    grid.appendChild(card);
  });

  grid.querySelectorAll('[data-enter-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSlotKey = btn.dataset.enterSlot;
      if (engine.running) engine.stop();
      navigate('jugar');
    });
  });

  grid.querySelectorAll('[data-create-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate('crear', btn.dataset.createSlot);
    });
  });

  grid.querySelectorAll('[data-delete-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingDeleteSlot = btn.dataset.deleteSlot;
      const heroName = slotsMap[pendingDeleteSlot]?.saveData?.name || 'este personaje';
      document.getElementById('confirm-delete-text').textContent =
        `¿Seguro que deseas borrar a "${heroName}"? Se perderá su progreso local y en la nube.`;
      document.getElementById('modal-confirm-delete').classList.remove('hidden');
    });
  });
}

/* =========================================================
   CREACIÓN DE PERSONAJE DETALLADA (#crear/slot_X)
   ========================================================= */
function renderCreatePickers() {
  const idx = Math.max(0, SLOT_KEYS.indexOf(creatorState.slotKey)) + 1;
  document.getElementById('create-slot-label').textContent = String(idx);
  document.getElementById('preview-dir-label').textContent = DIR_LABELS[creatorState.dir];

  // 1. Bando (2 escudos redondos en Pixel Art)
  const factionWrap = document.getElementById('faction-picker');
  factionWrap.innerHTML = '';
  [
    { id: 'alba', label: 'Alba', title: 'La Guardia del Alba (Villa Alba)', icon: 'shield_alba' },
    { id: 'hierro', label: 'Hierro', title: 'Los Clanes de Hierro (Campamento Hierro)', icon: 'shield_hierro' }
  ].forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = f.title;
    btn.className = `pixel-choice-tile ${creatorState.faction === f.id ? 'selected' : ''}`;
    btn.innerHTML = `${getPixelIconSvg(f.icon)}<span class="tile-caption">${f.label}</span>`;
    btn.addEventListener('click', () => {
      creatorState.faction = f.id;
      renderCreatePickers();
    });
    factionWrap.appendChild(btn);
  });

  // 2. Sexo (2 siluetas Pixel Art)
  const genderWrap = document.getElementById('gender-picker');
  genderWrap.innerHTML = '';
  [
    { id: 'male', label: 'Masc.', title: 'Masculino', icon: 'gender_male' },
    { id: 'female', label: 'Fem.', title: 'Femenino', icon: 'gender_female' }
  ].forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = g.title;
    btn.className = `pixel-choice-tile ${creatorState.gender === g.id ? 'selected' : ''}`;
    btn.innerHTML = `${getPixelIconSvg(g.icon)}<span class="tile-caption">${g.label}</span>`;
    btn.addEventListener('click', () => {
      creatorState.gender = g.id;
      renderCreatePickers();
    });
    genderWrap.appendChild(btn);
  });

  // 3. Raza (3 retratos de cabezas Pixel Art dinámicos según bando y sexo)
  const raceWrap = document.getElementById('race-picker');
  const races = FACTIONS[creatorState.faction].races;
  if (!races.some((r) => r.id === creatorState.race)) {
    creatorState.race = races[0].id;
  }
  raceWrap.innerHTML = '';
  for (const r of races) {
    const label = getRaceLabel(r.id, creatorState.gender);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${label}: ${r.desc}`;
    btn.className = `pixel-choice-tile ${r.id === creatorState.race ? 'selected' : ''}`;
    btn.innerHTML = `${getPixelIconSvg('portrait', { race: r.id, gender: creatorState.gender })}<span class="tile-caption">${label}</span>`;
    btn.addEventListener('click', () => {
      creatorState.race = r.id;
      renderCreatePickers();
    });
    raceWrap.appendChild(btn);
  }

  // 4. Clase (3 iconos de armas Pixel Art)
  const classWrap = document.getElementById('class-picker');
  classWrap.innerHTML = '';
  for (const cls of Object.values(CLASSES)) {
    const label = getClassLabel(cls.id, creatorState.gender);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${label} · ${cls.weapon} (Vida ${cls.hp}, ATQ ${cls.atk}, DEF ${cls.def})`;
    btn.className = `pixel-choice-tile ${cls.id === creatorState.heroClass ? 'selected' : ''}`;
    btn.innerHTML = `${getPixelIconSvg('class_' + cls.id)}<span class="tile-caption">${label}</span>`;
    btn.addEventListener('click', () => {
      creatorState.heroClass = cls.id;
      renderCreatePickers();
    });
    classWrap.appendChild(btn);
  }
}

/* =========================================================
   MODALES DEL JUEGO, CUENTA Y MARCO LEGAL
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
    onClose: () => {
      modal.classList.add('hidden');
      engine.setPaused(false);
    },
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
      <div>
        <strong>Sesión activa:</strong> ${user.username} (${user.email || 'Jugador'})<br/>
        <small>Conexión: ${navigator.onLine ? 'En línea' : 'Sin conexión'}</small>
      </div>
      <div class="modal-actions" style="margin-top:10px">
        <button type="button" id="btn-acc-sync" class="btn btn-primary btn-sm">Sincronizar 3 Espacios</button>
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
      showToast('Sesión cerrada. Tus 3 espacios locales siguen en el dispositivo.');
    });
  } else {
    formsWrap.classList.remove('hidden');
    statusBox.textContent = navigator.onLine
      ? 'Modo invitado local. Inicia sesión o regístrate para sincronizar tus 3 espacios con MySQL.'
      : 'Estás sin conexión. Tus 3 espacios se guardan localmente; sincroniza al volver internet.';
  }
}

/* =========================================================
   ENRUTADOR CON HISTORIAL REAL DEL NAVEGADOR
   ========================================================= */
function handleRoute({ route, param }) {
  closeDrawer();
  hideAllModals();

  const homeEl = document.getElementById('screen-home');
  const slotsEl = document.getElementById('screen-slots');
  const createEl = document.getElementById('screen-create');
  const gameEl = document.getElementById('screen-game');

  const isGameRoute = ['jugar', 'pausa', 'mejoras', 'tienda', 'mochila', 'mapa'].includes(route);

  if (isGameRoute && !getActiveSave()) {
    // Si hay algún espacio ocupado, usar el primero; si no, ir al selector
    const firstOccupied = SLOT_KEYS.find((k) => slotsMap[k]?.saveData);
    if (firstOccupied) {
      activeSlotKey = firstOccupied;
    } else {
      navigate('personajes', null, { replace: true });
      return;
    }
  }

  if (route === 'logros' && engine.running && achievementsReturnRoute === 'pausa') {
    engine.setPaused(true);
    renderAchievementsModal(engine.exportSave() || getActiveSave());
    document.getElementById('modal-achievements').classList.remove('hidden');
    return;
  }

  const showHome = !isGameRoute && route !== 'personajes' && route !== 'crear';
  homeEl.classList.toggle('hidden', !showHome);
  slotsEl.classList.toggle('hidden', route !== 'personajes');
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
    } else if (route === 'mejoras') {
      engine.setPaused(true);
      renderUpgradesModal(engine, upgradeTab, showToast, () =>
        persistActiveSlot(engine.exportSave(), false)
      );
      document.getElementById('modal-upgrades').classList.remove('hidden');
    } else if (route === 'tienda') {
      engine.setPaused(true);
      renderShopModal(engine, shopTab, showToast, () =>
        persistActiveSlot(engine.exportSave(), false)
      );
      document.getElementById('modal-shop').classList.remove('hidden');
    } else if (route === 'mapa') {
      engine.setPaused(true);
      renderWorldMapModal(engine, () => navigate('jugar'));
      document.getElementById('modal-worldmap').classList.remove('hidden');
    } else if (route === 'mochila') {
      engine.setPaused(true);
      renderBackpackModal(
        engine,
        () => persistActiveSlot(engine.exportSave(), false),
        () => navigate('jugar')
      );
      document.getElementById('modal-backpack').classList.remove('hidden');
    }
    return;
  }

  // Fuera del juego: guardar progreso y activar animaciones de menú
  if (engine.running) {
    persistActiveSlot(engine.exportSave(), false);
    engine.stop();
  }
  startMenuAnimation();

  if (route === 'personajes') {
    renderSlotsScreen();
  } else if (route === 'crear') {
    creatorState.slotKey = SLOT_KEYS.includes(param) ? param : 'slot_1';
    creatorState.dir = 0;
    creatorState.attackTimer = 0;
    document.getElementById('hero-name').value = '';
    renderCreatePickers();
  } else if (route === 'opciones') {
    applyTheme(settings.theme);
    applyAudioSettings();
    document.getElementById('modal-options').classList.remove('hidden');
  } else if (route === 'logros') {
    achievementsReturnRoute = 'inicio';
    const anySave = getActiveSave() || SLOT_KEYS.map((k) => slotsMap[k]?.saveData).find(Boolean) || null;
    renderAchievementsModal(anySave);
    document.getElementById('modal-achievements').classList.remove('hidden');
  } else if (route === 'cuenta') {
    renderAccountModal();
    document.getElementById('modal-account').classList.remove('hidden');
  } else if (route === 'legal') {
    const doc = LEGAL_DOCS[param] || LEGAL_DOCS.legal;
    document.getElementById('legal-title').textContent = doc.title;
    document.getElementById('legal-body').innerHTML = doc.html;
    document.getElementById('modal-legal').classList.remove('hidden');
  }
}

/* =========================================================
   CONTROLES TÁCTILES (PALANCA VIRTUAL + 4 BOTONES)
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

  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    e.preventDefault();
    moveJoy(e.clientX, e.clientY);
  });

  zone.addEventListener('pointerup', (e) => {
    if (e.pointerId === activePointer) resetJoy();
  });
  zone.addEventListener('pointercancel', resetJoy);

  function moveJoy(cx, cy) {
    const dx = cx - center.x;
    const dy = cy - center.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const tx = Math.cos(angle) * clamped;
    const ty = Math.sin(angle) * clamped;
    thumb.style.transform = `translate(${tx}px, ${ty}px)`;
    engine.setJoystick(tx / maxDist, ty / maxDist);
  }

  document.querySelectorAll('.skill-btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sfx.ensureCtx();
      engine.triggerAbility(Number(btn.dataset.skill));
    });
  });
}

/* =========================================================
   EVENTOS GLOBALES E INICIALIZACIÓN
   ========================================================= */
function bindEvents() {
  window.addEventListener('pointerdown', () => sfx.ensureCtx(), { once: true });
  window.addEventListener('keydown', () => sfx.ensureCtx(), { once: true });

  document.getElementById('btn-menu-open').addEventListener('click', openDrawer);
  document.getElementById('btn-menu-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);

  document.getElementById('brand-home').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('inicio');
  });

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    applyTheme(settings.theme === 'dark' ? 'light' : 'dark');
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.nav === 'logros') achievementsReturnRoute = 'inicio';
      navigate(btn.dataset.nav);
    });
  });

  document.querySelectorAll('[data-legal]').forEach((btn) => {
    btn.addEventListener('click', () => navigate('legal', btn.dataset.legal));
  });

  // Pantalla de Inicio
  document.getElementById('btn-home-play').addEventListener('click', () => navigate('personajes'));
  document.getElementById('btn-home-options').addEventListener('click', () => navigate('opciones'));

  // Selector de 3 personajes
  document.getElementById('btn-slots-back').addEventListener('click', () => navigate('inicio'));
  document.getElementById('btn-slots-sync').addEventListener('click', async () => {
    const res = await syncAllSlotsToCloud();
    slotsMap = await loadAllSlots();
    renderSlotsScreen();
    showToast(res.message, res.status === 'error' ? 'error' : 'success');
  });

  // Confirmación de borrado
  document.getElementById('btn-confirm-delete-yes').addEventListener('click', async () => {
    if (!pendingDeleteSlot) return;
    await deleteSlotGame(pendingDeleteSlot);
    slotsMap[pendingDeleteSlot] = null;
    pendingDeleteSlot = null;
    document.getElementById('modal-confirm-delete').classList.add('hidden');
    renderSlotsScreen();
    showToast('Personaje eliminado correctamente.');
  });

  // Creación de personaje
  document.getElementById('btn-create-back').addEventListener('click', () => navigate('personajes'));
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

  document.querySelectorAll('#faction-picker .choice-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      creatorState.faction = btn.dataset.faction;
      renderCreatePickers();
    });
  });

  document.querySelectorAll('#gender-picker .choice-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      creatorState.gender = btn.dataset.gender;
      renderCreatePickers();
    });
  });

  document.getElementById('form-create-hero').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('hero-name').value.trim();
    if (name.length < 3 || name.length > 15) {
      showToast('El nombre debe tener entre 3 y 15 letras.', 'error');
      return;
    }
    activeSlotKey = creatorState.slotKey;
    const freshSave = createInitialSave({
      name,
      faction: creatorState.faction,
      gender: creatorState.gender,
      race: creatorState.race,
      heroClass: creatorState.heroClass
    });
    await persistActiveSlot(freshSave, false);
    if (engine.running) engine.stop();
    navigate('jugar');
    const vName = FACTIONS[freshSave.faction]?.villageName || 'Valoria';
    const welcome = freshSave.gender === 'female' ? '¡Bienvenida' : '¡Bienvenido';
    showToast(`${welcome} a ${vName}, ${freshSave.name}!`, 'success');
  });

  // Opciones (sonido, música, tema, cuenta)
  document.getElementById('btn-opt-sfx').addEventListener('click', () => {
    settings.sfx = !settings.sfx;
    applyAudioSettings();
  });
  document.getElementById('btn-opt-music').addEventListener('click', () => {
    settings.music = !settings.music;
    applyAudioSettings();
  });
  document.getElementById('btn-opt-theme').addEventListener('click', () => {
    applyTheme(settings.theme === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('btn-opt-account').addEventListener('click', () => navigate('cuenta'));

  // HUD botones rápidos
  document.getElementById('btn-hud-potion').addEventListener('click', () => engine.useBestHealPotion());
  document.getElementById('btn-hud-upgrades').addEventListener('click', () => navigate('mejoras'));
  document.getElementById('btn-hud-shop').addEventListener('click', () => navigate('tienda'));
  document.getElementById('btn-hud-backpack').addEventListener('click', () => navigate('mochila'));
  document.getElementById('btn-hud-worldmap').addEventListener('click', () => navigate('mapa'));
  document.getElementById('btn-hud-pause').addEventListener('click', () => navigate('pausa'));
  document.getElementById('hud-quest-box').addEventListener('click', (e) => {
    const el = e.currentTarget;
    el.classList.toggle('collapsed');
    el.setAttribute('aria-expanded', String(!el.classList.contains('collapsed')));
  });
  document.getElementById('btn-interact-prompt').addEventListener('click', () => engine.interactNearest());
  document.getElementById('btn-victory-continue').addEventListener('click', () => {
    document.getElementById('modal-victory').classList.add('hidden');
    engine.setPaused(false);
  });

  // Pausa
  document.getElementById('btn-pause-resume').addEventListener('click', () => navigate('jugar'));
  document.getElementById('btn-pause-save').addEventListener('click', () =>
    persistActiveSlot(engine.exportSave(), true)
  );
  document.getElementById('btn-pause-audio').addEventListener('click', () => {
    const next = !(settings.sfx || settings.music);
    settings.sfx = next;
    settings.music = next;
    applyAudioSettings();
  });
  document.getElementById('btn-pause-achievements').addEventListener('click', () => {
    achievementsReturnRoute = 'pausa';
    navigate('logros');
  });
  document.getElementById('btn-pause-touch').addEventListener('click', () => {
    const order = ['auto', 'on', 'off'];
    settings.touchMode = order[(order.indexOf(settings.touchMode) + 1) % order.length];
    saveSettings(settings);
    applyTouchVisibility();
  });
  document.getElementById('btn-pause-theme').addEventListener('click', () => {
    applyTheme(settings.theme === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('btn-pause-home').addEventListener('click', () => navigate('personajes'));

  // Tabs Mejoras
  document.querySelectorAll('[data-upgrade-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      upgradeTab = btn.dataset.upgradeTab;
      document.querySelectorAll('[data-upgrade-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      renderUpgradesModal(engine, upgradeTab, showToast, () => persistActiveSlot(engine.exportSave(), false));
    });
  });

  // Tabs Tienda
  document.querySelectorAll('[data-shop-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      shopTab = btn.dataset.shopTab;
      document.querySelectorAll('[data-shop-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      renderShopModal(engine, shopTab, showToast, () => persistActiveSlot(engine.exportSave(), false));
    });
  });

  // Cerrar modales
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.close;
      if (target === 'modal-dialog') {
        document.getElementById('modal-dialog').classList.add('hidden');
        engine.setPaused(false);
      } else if (target === 'modal-confirm-delete') {
        pendingDeleteSlot = null;
        document.getElementById('modal-confirm-delete').classList.add('hidden');
      } else if (['modal-upgrades', 'modal-shop', 'modal-backpack', 'modal-worldmap', 'modal-pause'].includes(target)) {
        navigate('jugar');
      } else if (target === 'modal-achievements') {
        navigate(achievementsReturnRoute === 'pausa' ? 'pausa' : 'inicio');
      } else {
        navigate('inicio');
      }
    });
  });

  // Tabs Auth
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
      feedback.className = 'form-feedback ok';
      feedback.textContent = 'Sesión iniciada correctamente.';
      await syncAllSlotsToCloud();
      slotsMap = await loadAllSlots();
      updateSyncBadge('Sincronizado', 'online');
      renderAccountModal();
      showToast(`¡Bienvenido, ${data.user.username}!`, 'success');
    } catch (err) {
      feedback.textContent = err.message;
    }
  });

  if (!settings.cookiesAccepted) {
    document.getElementById('cookie-banner').classList.remove('hidden');
  }
  document.getElementById('btn-cookie-accept').addEventListener('click', () => {
    settings.cookiesAccepted = true;
    saveSettings(settings);
    document.getElementById('cookie-banner').classList.add('hidden');
  });

  window.addEventListener('online', async () => {
    updateSyncBadge('Sincronizando...', 'online');
    if (getSavedUser()?.token && hasPendingSync()) {
      const res = await syncAllSlotsToCloud();
      if (res.status === 'synced') {
        slotsMap = await loadAllSlots();
        updateSyncBadge('Sincronizado', 'online');
        showToast('Conexión recuperada: 3 espacios sincronizados con MySQL.', 'success');
        return;
      }
    }
    updateSyncBadge(getSavedUser()?.token ? 'En línea' : 'Local', 'online');
  });

  window.addEventListener('offline', () => {
    updateSyncBadge('Sin conexión', 'offline');
    showToast('Modo sin conexión activo. Tus 3 espacios se guardan en el dispositivo.');
  });
}

async function bootstrap() {
  applyTheme(settings.theme || 'dark');
  applyAudioSettings();

  slotsMap = await loadAllSlots();

  updateSyncBadge(
    navigator.onLine ? (getSavedUser()?.token ? 'En línea' : 'Local') : 'Sin conexión',
    navigator.onLine ? 'online' : 'offline'
  );

  initTouchControls();
  bindEvents();
  onRouteChange(handleRoute);
  initRouter();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

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
