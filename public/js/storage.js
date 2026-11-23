/**
 * Almacenamiento Offline-First de 3 espacios independientes (IndexedDB + localStorage)
 * y sincronización automática con MySQL.
 */

const DB_NAME = 'CronicasFracturaDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const LS_SLOTS_KEY = 'cdf_slots_v2';
const LS_LEGACY_KEY = 'cdf_save_primary_v1';
const LS_SETTINGS_KEY = 'cdf_settings_v1';
const LS_USER_KEY = 'cdf_user_v1';
const LS_PENDING_KEY = 'cdf_pending_sync_v1';

export const SLOT_KEYS = ['slot_1', 'slot_2', 'slot_3'];

function openIDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return resolve(null);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slotKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readLsSlots() {
  try {
    const raw = localStorage.getItem(LS_SLOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLsSlots(map) {
  try {
    localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(map));
  } catch {
    // Cuota llena
  }
}

export async function saveSlotGame(slotKey, saveData) {
  const key = SLOT_KEYS.includes(slotKey) ? slotKey : 'slot_1';
  const record = { slotKey: key, updatedAt: Date.now(), saveData };

  const lsMap = readLsSlots();
  lsMap[key] = record;
  writeLsSlots(lsMap);
  try {
    localStorage.setItem(LS_PENDING_KEY, '1');
  } catch {}

  try {
    const db = await openIDB();
    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {}

  return record;
}

export async function deleteSlotGame(slotKey) {
  const key = SLOT_KEYS.includes(slotKey) ? slotKey : 'slot_1';
  const lsMap = readLsSlots();
  delete lsMap[key];
  writeLsSlots(lsMap);

  try {
    const db = await openIDB();
    if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {}

  // Si hay sesión e internet, eliminar también en MySQL
  if (navigator.onLine && getSavedUser()?.token) {
    try {
      await apiRequest(`/api/saves/${encodeURIComponent(key)}`, { method: 'DELETE' });
    } catch {}
  }
}

export async function loadAllSlots() {
  const result = { slot_1: null, slot_2: null, slot_3: null };

  // 1. Leer IndexedDB
  try {
    const db = await openIDB();
    if (db) {
      const all = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      for (const rec of all) {
        if (SLOT_KEYS.includes(rec.slotKey) && rec.saveData) {
          result[rec.slotKey] = rec;
        } else if (rec.slotKey === 'primary' && rec.saveData && !result.slot_1) {
          // Migrar partida antigua a slot_1
          result.slot_1 = { slotKey: 'slot_1', updatedAt: rec.updatedAt || Date.now(), saveData: rec.saveData };
        }
      }
    }
  } catch {}

  // 2. Combinar con localStorage (fallback y migración)
  const lsMap = readLsSlots();
  for (const key of SLOT_KEYS) {
    if (lsMap[key]?.saveData) {
      if (!result[key] || (lsMap[key].updatedAt || 0) > (result[key].updatedAt || 0)) {
        result[key] = lsMap[key];
      }
    }
  }

  if (!result.slot_1) {
    try {
      const legacy = localStorage.getItem(LS_LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.saveData) {
          result.slot_1 = { slotKey: 'slot_1', updatedAt: parsed.updatedAt || Date.now(), saveData: parsed.saveData };
          await saveSlotGame('slot_1', parsed.saveData);
        }
      }
    } catch {}
  }

  return result;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      theme: parsed.theme || 'dark',
      sfx: parsed.sfx !== undefined ? parsed.sfx : parsed.audio !== false,
      music: parsed.music !== undefined ? parsed.music : parsed.audio !== false,
      touchMode: parsed.touchMode || 'auto',
      cookiesAccepted: Boolean(parsed.cookiesAccepted)
    };
  } catch {
    return { theme: 'dark', sfx: true, music: true, touchMode: 'auto', cookiesAccepted: false };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function getSavedUser() {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedUser(user) {
  try {
    if (!user) localStorage.removeItem(LS_USER_KEY);
    else localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  } catch {}
}

export async function apiRequest(path, options = {}) {
  const user = getSavedUser();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;

  const relPath = path.startsWith('/') ? `.${path}` : path;
  const res = await fetch(relPath, { ...options, headers, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
  return data;
}

/**
 * Sincroniza los 3 espacios de personaje con MySQL.
 */
export async function syncAllSlotsToCloud() {
  if (!navigator.onLine) return { status: 'offline', message: 'Sin conexión. Guardado en el dispositivo.' };
  const user = getSavedUser();
  if (!user?.token) return { status: 'local', message: 'Guardado localmente (inicia sesión para sincronizar).' };

  const slots = await loadAllSlots();
  let syncedCount = 0;

  try {
    // 1. Subir espacios locales ocupados
    for (const key of SLOT_KEYS) {
      const rec = slots[key];
      if (!rec?.saveData) continue;
      const resp = await apiRequest('/api/saves/sync', {
        method: 'POST',
        body: JSON.stringify({ slotKey: key, updatedAt: rec.updatedAt, saveData: rec.saveData })
      });
      if (resp.resolution === 'cloud_newer' && resp.saveData) {
        await saveSlotGame(key, resp.saveData);
      }
      syncedCount += 1;
    }

    // 2. Descargar espacios de la nube que estén vacíos en este dispositivo
    const { saves } = await apiRequest('/api/saves');
    for (const remote of saves || []) {
      const key = remote.slot_key === 'primary' ? 'slot_1' : remote.slot_key;
      if (!SLOT_KEYS.includes(key)) continue;
      if (!slots[key]) {
        const parsed = typeof remote.save_payload === 'string' ? JSON.parse(remote.save_payload) : remote.save_payload;
        await saveSlotGame(key, parsed);
        syncedCount += 1;
      }
    }

    localStorage.removeItem(LS_PENDING_KEY);
    return { status: 'synced', message: `Sincronización MySQL completa (${syncedCount} espacios).` };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

export function hasPendingSync() {
  return localStorage.getItem(LS_PENDING_KEY) === '1';
}
