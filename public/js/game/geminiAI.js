/**
 * Motor Mixto de Inteligencia Artificial para los 4 Personajes Principales de Valoria — Crónicas de la Fractura
 * - Código local reactivo (0ms de latencia): movimiento, recolección, combate por reflejo, huida (<25% PV),
 *   llamado de refuerzos, refugio por clima, sigilo/disfraces y economía dinámica.
 * - Gemini Flash (cognitivo/conversacional): charlas naturales en personaje con memoria persistente,
 *   decisiones de objetivo cada 2–3 minutos o al terminar tarea, regateo, misiones dinámicas, chismes de bando
 *   y reportes directos hacia mejoras_npc.md (con respaldo en localStorage).
 * - CERO claves fijas en el código: la API Key se guarda exclusivamente en el navegador del usuario.
 */

const GEMINI_KEY_STORAGE = 'valoria_gemini_api_key';
const AI_MEMORY_STORAGE = 'valoria_ai_memory_v2';
const REPORTS_BACKUP_STORAGE = 'valoria_mejoras_npc_backup';
const GEMINI_MODEL = 'gemini-2.0-flash';

export const AI_CHARACTERS_DEFS = {
  paladina_alba: {
    id: 'paladina_alba',
    name: 'Lyra',
    title: 'Guerrera Paladín',
    faction: 'alba',
    factionLabel: 'La Guardia del Alba',
    profession: 'Paladín y Reparadora de Murallas',
    spriteKind: 'guardia_alba',
    heroAssetKey: 'heroina_guerrera',
    personality: 'Honorable, protectora de Villa Alba, disciplinada pero justa. Desconfía de los espías de Hierro.',
    preferredGoals: ['patrullar', 'reparar', 'talar', 'descansar'],
    defaultMap: 'aldea',
    homeX: 670,
    homeY: 615,
    maxHp: 460,
    atk: 34,
    def: 22,
    speed: 128
  },
  explorador_alba: {
    id: 'explorador_alba',
    name: 'Kaelen',
    title: 'Explorador',
    faction: 'alba',
    factionLabel: 'La Guardia del Alba',
    profession: 'Explorador y Leñador del Bosque',
    spriteKind: 'guardia_alba',
    heroAssetKey: 'heroe_arquero',
    personality: 'Observador, curioso, experto en senderos, madera y sigilo. Siempre busca recursos o caza monstruos.',
    preferredGoals: ['talar', 'patrullar', 'reparar', 'descansar'],
    defaultMap: 'bosque',
    homeX: 910,
    homeY: 640,
    maxHp: 370,
    atk: 38,
    def: 15,
    speed: 146
  },
  guerrero_hierro: {
    id: 'guerrero_hierro',
    name: 'Grommash',
    title: 'Guerrero de Hierro',
    faction: 'hierro',
    factionLabel: 'Los Clanes de Hierro',
    profession: 'Campeón y Minero de Hierro',
    spriteKind: 'guardia_hierro',
    heroAssetKey: 'heroe_orco',
    personality: 'Feroz, orgulloso, directo y leal a la fuerza. Respeta a quienes pelean con honor o traen mineral.',
    preferredGoals: ['minar', 'patrullar', 'reparar', 'descansar'],
    defaultMap: 'desierto',
    homeX: 720,
    homeY: 660,
    maxHp: 520,
    atk: 42,
    def: 24,
    speed: 124
  },
  chamana_hierro: {
    id: 'chamana_hierro',
    name: 'Zul\'jinra',
    title: 'Chamana del Clan',
    faction: 'hierro',
    factionLabel: 'Los Clanes de Hierro',
    profession: 'Chamana, Alquimista y Guardiana del Portal',
    spriteKind: 'guardia_hierro',
    heroAssetKey: 'heroina_maga_hierro',
    personality: 'Mística, sabia y cautelosa con las grietas del Vacío. Valora las hierbas, cristales y el equilibrio elemental.',
    preferredGoals: ['minar', 'patrullar', 'descansar', 'reparar'],
    defaultMap: 'montanas',
    homeX: 860,
    homeY: 650,
    maxHp: 390,
    atk: 44,
    def: 16,
    speed: 132
  }
};

/* =========================================================
   GESTIÓN SEGURA DE API KEY EN EL NAVEGADOR + AUTO-CARGA DESDE .env LOCAL
   ========================================================= */
let envKeyFetched = false;
export async function syncLocalEnvGeminiKey() {
  if (envKeyFetched) return getGeminiApiKey();
  envKeyFetched = true;
  try {
    if (getGeminiApiKey()) return getGeminiApiKey();
    const res = await fetch('./api/gemini-config');
    if (res.ok) {
      const data = await res.json();
      if (data?.apiKey && data.apiKey.trim().length >= 16) {
        setGeminiApiKey(data.apiKey.trim());
        return data.apiKey.trim();
      }
    }
  } catch {
    // Si se abre en GitHub Pages sin servidor local, usa localStorage normal
  }
  return getGeminiApiKey();
}
syncLocalEnvGeminiKey();

export function getGeminiApiKey() {
  try {
    return (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
}

export function setGeminiApiKey(key) {
  try {
    const clean = String(key || '').trim();
    if (!clean) {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } else {
      localStorage.setItem(GEMINI_KEY_STORAGE, clean);
    }
    return Boolean(clean);
  } catch {
    return false;
  }
}

export function hasGeminiApiKey() {
  return getGeminiApiKey().length >= 16;
}

/* =========================================================
   MEMORIA PERSISTENTE, AMISTAD, CHISMES Y ECONOMÍA VIVA
   ========================================================= */
function createDefaultAiState() {
  const chars = {};
  for (const [id, def] of Object.entries(AI_CHARACTERS_DEFS)) {
    chars[id] = {
      id,
      name: def.name,
      title: def.title,
      faction: def.faction,
      profession: def.profession,
      friendship: 10,
      hostile: false,
      hunger: 18,
      energy: 88,
      goal: def.preferredGoals[0],
      emotion: 'neutral',
      thought: `Vigilando y trabajando como ${def.profession}.`,
      inventory: {
        madera: id === 'explorador_alba' ? 6 : 2,
        piedra: id === 'paladina_alba' ? 5 : 2,
        mineral: id === 'guerrero_hierro' ? 6 : 2,
        comida: 3,
        pociones: 2
      },
      memories: [],
      grudges: [],
      activeQuest: null,
      haggleBonusPct: 0,
      companionUntil: 0,
      lastGeminiGoalTime: 0,
      lastReportTime: 0,
      tasksCompleted: 0,
      idleSeconds: 0
    };
  }
  return {
    characters: chars,
    factionReputation: {
      alba: 15,
      hierro: 15
    },
    territoryOwner: {
      aldea: 'alba',
      bosque: 'alba',
      cueva: 'disputado',
      desierto: 'hierro',
      montanas: 'disputado',
      fortaleza: 'vacio'
    },
    territoryScore: {
      alba: 55,
      hierro: 55
    },
    economy: {
      priceMultiplier: 1.0,
      woodSupply: 20,
      oreSupply: 18,
      foodSupply: 22,
      recentVoidAttacks: 0
    },
    gossipLog: []
  };
}

let aiState = loadAiState();

export function loadAiState() {
  const base = createDefaultAiState();
  try {
    const raw = JSON.parse(localStorage.getItem(AI_MEMORY_STORAGE) || 'null');
    if (!raw || typeof raw !== 'object') return base;
    for (const id of Object.keys(base.characters)) {
      if (raw.characters?.[id]) {
        base.characters[id] = {
          ...base.characters[id],
          ...raw.characters[id],
          inventory: {
            ...base.characters[id].inventory,
            ...(raw.characters[id].inventory || {})
          },
          memories: Array.isArray(raw.characters[id].memories) ? raw.characters[id].memories.slice(-14) : [],
          grudges: Array.isArray(raw.characters[id].grudges) ? raw.characters[id].grudges.slice(-8) : []
        };
      }
    }
    if (raw.factionReputation) {
      base.factionReputation = { ...base.factionReputation, ...raw.factionReputation };
    }
    if (raw.territoryOwner) {
      base.territoryOwner = { ...base.territoryOwner, ...raw.territoryOwner };
    }
    if (raw.economy) {
      base.economy = { ...base.economy, ...raw.economy };
    }
    if (Array.isArray(raw.gossipLog)) {
      base.gossipLog = raw.gossipLog.slice(-18);
    }
  } catch {
    // ignore corrupt localStorage
  }
  return base;
}

export function saveAiState() {
  try {
    localStorage.setItem(AI_MEMORY_STORAGE, JSON.stringify(aiState));
  } catch {
    // ignore quota error
  }
}

export function getAiState() {
  return aiState;
}

export function getCharacterMemory(charId) {
  if (!aiState.characters[charId]) {
    const def = AI_CHARACTERS_DEFS[charId] || AI_CHARACTERS_DEFS.paladina_alba;
    aiState.characters[charId] = createDefaultAiState().characters[def.id];
  }
  return aiState.characters[charId];
}

export function recordCharacterMemory(charId, text, { friendshipDelta = 0, repDelta = 0, isGrudge = false } = {}) {
  const mem = getCharacterMemory(charId);
  if (!mem) return;
  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const clean = `[${stamp}] ${text}`;
  mem.memories.push(clean);
  if (mem.memories.length > 14) mem.memories.shift();
  if (isGrudge) {
    mem.grudges.push(text);
    if (mem.grudges.length > 8) mem.grudges.shift();
  }
  mem.friendship = Math.max(-100, Math.min(100, Math.round((mem.friendship || 0) + friendshipDelta)));
  if (repDelta !== 0 && mem.faction) {
    aiState.factionReputation[mem.faction] = Math.max(
      -100,
      Math.min(100, Math.round((aiState.factionReputation[mem.faction] || 0) + repDelta))
    );
  }
  saveAiState();
}

/**
 * Propaga un chisme a todos los miembros del mismo bando y ajusta la reputación y precio del mercado.
 */
export function spreadFactionGossip(sourceCharId, faction, eventText, repDelta = 0) {
  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const entry = `[${stamp} · ${faction.toUpperCase()}] ${eventText}`;
  aiState.gossipLog.push(entry);
  if (aiState.gossipLog.length > 18) aiState.gossipLog.shift();

  if (faction && aiState.factionReputation[faction] !== undefined) {
    aiState.factionReputation[faction] = Math.max(
      -100,
      Math.min(100, Math.round(aiState.factionReputation[faction] + repDelta))
    );
  }

  for (const [id, ch] of Object.entries(aiState.characters)) {
    if (ch.faction === faction) {
      if (id !== sourceCharId) {
        ch.memories.push(`Escuché en mi bando: "${eventText}"`);
        if (ch.memories.length > 14) ch.memories.shift();
      }
      ch.friendship = Math.max(-100, Math.min(100, Math.round(ch.friendship + repDelta * 0.5)));
      if (repDelta <= -15 || aiState.factionReputation[faction] <= -40) {
        ch.hostile = true;
        ch.emotion = 'enojo';
      }
    }
  }
  saveAiState();
}

/**
 * Calcula el multiplicador actual de precios de la Economía Viva considerando recursos, ataques del Vacío,
 * reputación de facción y descuento por regateo.
 */
export function getDynamicPriceMultiplier(faction = 'alba', charId = null) {
  const eco = aiState.economy;
  const supplyAvg = (eco.woodSupply + eco.oreSupply + eco.foodSupply) / 3;
  // Si escasean los recursos (<15), suben precios; si abundan (>30), bajan
  const scarcityFactor = supplyAvg < 15 ? 1.18 : supplyAvg > 30 ? 0.88 : 1.0;
  const attackFactor = 1 + Math.min(0.35, (eco.recentVoidAttacks || 0) * 0.08);
  const rep = aiState.factionReputation[faction] || 0;
  const repDiscount = rep >= 40 ? -0.15 : rep >= 15 ? -0.07 : rep <= -25 ? 0.25 : 0;
  const haggle = charId && aiState.characters[charId] ? (aiState.characters[charId].haggleBonusPct || 0) / 100 : 0;

  const mult = Math.max(0.55, Math.min(1.75, scarcityFactor * attackFactor * (1 + repDiscount - haggle)));
  aiState.economy.priceMultiplier = Number(mult.toFixed(2));
  return aiState.economy.priceMultiplier;
}

export function adjustEconomyResources({ wood = 0, ore = 0, food = 0, voidAttack = 0 } = {}) {
  const eco = aiState.economy;
  eco.woodSupply = Math.max(2, Math.min(99, (eco.woodSupply || 20) + wood));
  eco.oreSupply = Math.max(2, Math.min(99, (eco.oreSupply || 18) + ore));
  eco.foodSupply = Math.max(2, Math.min(99, (eco.foodSupply || 22) + food));
  eco.recentVoidAttacks = Math.max(0, Math.min(8, (eco.recentVoidAttacks || 0) + voidAttack));
  saveAiState();
}

/* =========================================================
   LLAMADA A GEMINI FLASH CON TIMEOUT Y RESPALDO SILENCIOSO
   ========================================================= */
async function callGeminiFlashJson(systemInstruction, userPrompt, timeoutMs = 6500) {
  const apiKey = getGeminiApiKey();
  if (!apiKey || !navigator.onLine) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isBearer = apiKey.startsWith('AQ.') || apiKey.startsWith('ya29.');
    const url = isBearer
      ? `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
      : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const headers = { 'Content-Type': 'application/json' };
    if (isBearer) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers['x-goog-api-key'] = apiKey;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 320,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   GUARDADO DE REPORTES DIRECTO EN mejoras_npc.md + RESPALDO LOCAL
   ========================================================= */
export async function syncPendingReportsToServer() {
  try {
    const existing = JSON.parse(localStorage.getItem(REPORTS_BACKUP_STORAGE) || '[]');
    if (!Array.isArray(existing) || existing.length === 0) return;
    const unsynced = existing.filter((r) => !r.syncedToServer);
    if (unsynced.length === 0) return;
    for (const item of unsynced) {
      const res = await fetch('./api/npc-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) item.syncedToServer = true;
    }
    localStorage.setItem(REPORTS_BACKUP_STORAGE, JSON.stringify(existing));
  } catch {
    // ignore
  }
}
setTimeout(() => syncPendingReportsToServer(), 1500);

export async function saveImprovementReportToAntigravity({
  characterName,
  faction,
  role,
  category,
  mapName,
  suggestion,
  technicalNote = ''
}) {
  if (!suggestion) return false;
  const payload = {
    characterName,
    faction,
    role,
    category,
    mapName,
    suggestion,
    technicalNote,
    timestamp: new Date().toISOString()
  };

  // Respaldo siempre en localStorage (por si se juega desde GitHub Pages / internet)
  try {
    const existing = JSON.parse(localStorage.getItem(REPORTS_BACKUP_STORAGE) || '[]');
    existing.push(payload);
    while (existing.length > 40) existing.shift();
    localStorage.setItem(REPORTS_BACKUP_STORAGE, JSON.stringify(existing));
  } catch {
    // ignore
  }

  // Envío automático al ayudante local (/api/npc-report -> mejoras_npc.md)
  try {
    const res = await fetch('./api/npc-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      payload.syncedToServer = true;
      const existing = JSON.parse(localStorage.getItem(REPORTS_BACKUP_STORAGE) || '[]');
      if (existing.length > 0) {
        existing[existing.length - 1].syncedToServer = true;
        localStorage.setItem(REPORTS_BACKUP_STORAGE, JSON.stringify(existing));
      }
    }
    return res.ok;
  } catch {
    return false;
  }
}

export function getLocalBackupReports() {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_BACKUP_STORAGE) || '[]');
  } catch {
    return [];
  }
}

/* =========================================================
   CHARLA NATURAL CON GEMINI FLASH + IA LOCAL DE RESPALDO
   ========================================================= */
export async function chatWithAiCharacter(npcEntity, player, userMessage, worldContext = {}) {
  const def = AI_CHARACTERS_DEFS[npcEntity.aiId] || AI_CHARACTERS_DEFS.paladina_alba;
  const mem = getCharacterMemory(def.id);
  const factionRep = aiState.factionReputation[def.faction] || 0;
  const msg = String(userMessage || '').trim();

  const summary = {
    personaje: `${def.name} (${def.title})`,
    bando: def.factionLabel,
    oficio: def.profession,
    personalidad: def.personality,
    vidaActual: `${Math.round(npcEntity.hp || def.maxHp)}/${def.maxHp}`,
    hambre: `${Math.round(mem.hunger)}/100`,
    energia: `${Math.round(mem.energy)}/100`,
    mochila: mem.inventory,
    objetivoActual: mem.goal,
    amistadConJugador: mem.friendship,
    reputacionDeBando: factionRep,
    hostil: Boolean(mem.hostile || npcEntity.hostile),
    recuerdosRecientes: mem.memories.slice(-5),
    rencores: mem.grudges.slice(-3),
    jugador: {
      nombre: player.name,
      bando: player.faction === 'hierro' ? 'Clanes de Hierro' : 'Guardia del Alba',
      raza: player.race,
      nivel: player.level,
      disfrazado: Boolean(player.disguiseFaction),
      sigilo: Boolean(player.stealthActive)
    },
    climaActual: worldContext.weather || 'despejado',
    mapaActual: worldContext.mapName || 'Valoria',
    multiplicadorPrecios: getDynamicPriceMultiplier(def.faction, def.id)
  };

  const sysPrompt = `Eres ${def.name} (${def.title}), habitante vivo del RPG 2D "Crónicas de la Fractura" en Valoria.
Responde SIEMPRE en español, en personaje, con frases cortas y naturales (máximo 2 oraciones).
Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "reply": "Tu respuesta corta y natural en primera persona",
  "emotion": "feliz" | "enojo" | "sueno" | "ayuda" | "siguiendo" | "trabajo" | "neutral",
  "friendshipDelta": número entre -25 y 20,
  "repDelta": número entre -20 y 15,
  "becomeHostile": boolean (true si el jugador te insulta, amenaza, roba o tienes un rencor grave),
  "callReinforcements": boolean (true si te vuelve hostil o hay peligro),
  "haggleDiscountPct": número entre 0 y 25 (si el jugador negocia con respeto y buena reputación),
  "joinAsCompanion": boolean (true si el jugador te pide acompañarlo y tu amistad >= 15 o promete oro),
  "offerQuest": null o { "id": "q_dyn", "title": "Nombre corto", "need": "madera"|"mineral"|"monstruos", "qty": 3, "rewardGold": 95, "desc": "Pedido corto" },
  "improvementReport": null o { "category": "Problemas del juego"|"Aburrimiento"|"Deseos propios"|"Fallos visuales del mapa", "suggestion": "Sugerencia en primera persona para mejorar el juego" }
}`;

  const geminiResult = await callGeminiFlashJson(
    sysPrompt,
    `Estado actual: ${JSON.stringify(summary)}\nMensaje del jugador "${player.name}": "${msg}"`
  );

  let result = geminiResult;
  if (!result || typeof result.reply !== 'string') {
    result = buildLocalFallbackChatResponse(def, mem, npcEntity, player, msg, worldContext);
  }

  // Aplicar cambios en memoria, emociones, regateo, misiones y acompañantes
  const fDelta = Number(result.friendshipDelta) || 0;
  const rDelta = Number(result.repDelta) || 0;
  recordCharacterMemory(def.id, `${player.name} me dijo: "${msg}" -> Respondí: "${result.reply}"`, {
    friendshipDelta: fDelta,
    repDelta: rDelta,
    isGrudge: Boolean(result.becomeHostile)
  });

  if (result.emotion) {
    mem.emotion = result.emotion;
    npcEntity.emotion = result.emotion;
  }

  if (result.becomeHostile) {
    mem.hostile = true;
    npcEntity.hostile = true;
    mem.emotion = 'enojo';
    npcEntity.emotion = 'enojo';
    spreadFactionGossip(def.id, def.faction, `${player.name} amenazó o atacó a ${def.name}.`, -15);
  } else if (fDelta >= 8) {
    mem.hostile = false;
    npcEntity.hostile = false;
    spreadFactionGossip(def.id, def.faction, `${player.name} ayudó y trató con honor a ${def.name}.`, 6);
  }

  if (Number(result.haggleDiscountPct) > 0) {
    mem.haggleBonusPct = Math.min(25, Math.max(0, Math.round(Number(result.haggleDiscountPct))));
  }

  if (result.joinAsCompanion && !mem.hostile) {
    mem.companionUntil = Date.now() + 180_000; // 3 minutos siguiendo y defendiendo al jugador
    mem.emotion = 'siguiendo';
    npcEntity.emotion = 'siguiendo';
    npcEntity.isCompanion = true;
  }

  if (result.offerQuest && typeof result.offerQuest === 'object') {
    mem.activeQuest = {
      id: `quest_${def.id}_${Date.now()}`,
      giverId: def.id,
      giverName: def.name,
      title: result.offerQuest.title || `Encargo de ${def.name}`,
      need: result.offerQuest.need || (def.faction === 'alba' ? 'madera' : 'mineral'),
      qty: Number(result.offerQuest.qty) || 3,
      progress: 0,
      rewardGold: Number(result.offerQuest.rewardGold) || 95,
      desc: result.offerQuest.desc || `Consigue recursos o limpia la zona para ${def.name}.`
    };
  }

  if (result.improvementReport && result.improvementReport.suggestion) {
    saveImprovementReportToAntigravity({
      characterName: `${def.name} (${def.title})`,
      faction: def.factionLabel,
      role: def.profession,
      category: result.improvementReport.category || 'Deseos propios',
      mapName: worldContext.mapName || 'Valoria',
      suggestion: result.improvementReport.suggestion
    });
  }

  saveAiState();
  return {
    ...result,
    memory: mem,
    priceMultiplier: getDynamicPriceMultiplier(def.faction, def.id)
  };
}

function buildLocalFallbackChatResponse(def, mem, npcEntity, player, msg, worldContext) {
  const lower = msg.toLowerCase();
  const isInsultOrThreat = /(insult|idiota|cobarde|matar|robar|robo|muere|basura|enemigo|atacar|odio)/i.test(lower);
  const isApology = /(perdon|perdón|disculp|paz|amigo|tregua|lamento)/i.test(lower);
  const isHaggle = /(regate|descuento|rebaja|precio|barato|caro|comerci|negoci)/i.test(lower);
  const isCompanionReq = /(acompañ|sigueme|sígueme|ayudame a pelear|ven conmigo|escolta|grupo)/i.test(lower);
  const isQuestReq = /(mision|misión|trabajo|encargo|ayuda|necesitas algo|madera|mineral)/i.test(lower);
  const isReportReq = /(mejora|reporte|aburrid|deseo|bug|mapa|antigravity|sugerencia)/i.test(lower);

  if (isInsultOrThreat) {
    return {
      reply: `¡Nadie amenaza a ${def.name} de ${def.factionLabel} y sale impune! ¡En guardia!`,
      emotion: 'enojo',
      friendshipDelta: -22,
      repDelta: -15,
      becomeHostile: true,
      callReinforcements: true,
      haggleDiscountPct: 0,
      joinAsCompanion: false,
      offerQuest: null,
      improvementReport: null
    };
  }

  if (isApology) {
    return {
      reply: `Acepto tus palabras, ${player.name}. Guardaré mi arma mientras respetes a ${def.factionLabel}.`,
      emotion: 'feliz',
      friendshipDelta: 12,
      repDelta: 8,
      becomeHostile: false,
      callReinforcements: false,
      haggleDiscountPct: 5,
      joinAsCompanion: false,
      offerQuest: null,
      improvementReport: null
    };
  }

  if (isHaggle) {
    const canDiscount = mem.friendship >= 10 || (aiState.factionReputation[def.faction] || 0) >= 15;
    const disc = canDiscount ? Math.min(22, 10 + Math.floor(Math.max(0, mem.friendship) / 8)) : 5;
    return {
      reply: canDiscount
        ? `Has demostrado ser de confianza para nuestro bando. Te haré una rebaja del ${disc}% en el comercio.`
        : `Aún no te conozco lo suficiente, pero te daré un ${disc}% de descuento si nos ayudas en la zona.`,
      emotion: 'feliz',
      friendshipDelta: 5,
      repDelta: 3,
      becomeHostile: false,
      callReinforcements: false,
      haggleDiscountPct: disc,
      joinAsCompanion: false,
      offerQuest: null,
      improvementReport: null
    };
  }

  if (isCompanionReq) {
    const canJoin = mem.friendship >= 8 || player.faction === def.faction;
    return {
      reply: canJoin
        ? `¡Cuenta con mi arma, ${player.name}! Te seguiré y cubriré tu espalda contra el Vacío.`
        : `Aún no confío lo suficiente en ti. Ayuda primero a mi bando o gánate mi respeto.`,
      emotion: canJoin ? 'siguiendo' : 'neutral',
      friendshipDelta: canJoin ? 8 : 1,
      repDelta: canJoin ? 4 : 0,
      becomeHostile: false,
      callReinforcements: false,
      haggleDiscountPct: 0,
      joinAsCompanion: canJoin,
      offerQuest: null,
      improvementReport: null
    };
  }

  if (isQuestReq) {
    const need = def.faction === 'alba' ? 'madera' : 'mineral';
    return {
      reply: `Nos falta ${need} para reforzar las defensas antes del próximo ataque del Vacío. Si consigues 3 unidades o abates monstruos cercanos, te pagaré 110 de Oro.`,
      emotion: 'ayuda',
      friendshipDelta: 6,
      repDelta: 4,
      becomeHostile: false,
      callReinforcements: false,
      haggleDiscountPct: 0,
      joinAsCompanion: false,
      offerQuest: {
        id: `q_${def.id}`,
        title: `Suministros para ${def.name}`,
        need,
        qty: 3,
        rewardGold: 110,
        desc: `Consigue 3 de ${need} (talando/minando) o derrota criaturas cercanas y habla con ${def.name}.`
      },
      improvementReport: null
    };
  }

  if (isReportReq) {
    const suggestion =
      def.id === 'paladina_alba'
        ? 'Me gustaría poder levantar un estandarte bendito temporal en el Portal de Hielo que cure a los guardias aliados durante las oleadas del Vacío.'
        : def.id === 'explorador_alba'
        ? 'Sería genial tener trampas de cuerda visibles entre los árboles del Bosque de la Fractura para frenar invasores.'
        : def.id === 'guerrero_hierro'
        ? 'Quiero una forja portátil de campaña en el Desierto de Ceniza para fundir mineral de hierro sin volver hasta la aldea.'
        : 'Deseo un altar de canalización elemental junto al Portal de Hielo para detectar espías disfrazados con magia arcana.';
    return {
      reply: `He anotado una sugerencia en la bitácora de mejoras para Antigravity: "${suggestion}"`,
      emotion: 'trabajo',
      friendshipDelta: 6,
      repDelta: 3,
      becomeHostile: false,
      callReinforcements: false,
      haggleDiscountPct: 0,
      joinAsCompanion: false,
      offerQuest: null,
      improvementReport: {
        category: 'Deseos propios',
        suggestion
      }
    };
  }

  return {
    reply: `Saludos, ${player.name}. Ahora mismo mi objetivo es ${mem.goal} en ${worldContext.mapName || 'Valoria'} (Energía ${Math.round(mem.energy)}%, Hambre ${Math.round(mem.hunger)}%). ¿Vienes a comerciar, pedir una misión o combatir juntos?`,
    emotion: mem.energy < 30 ? 'sueno' : 'feliz',
    friendshipDelta: 4,
    repDelta: 2,
    becomeHostile: false,
    callReinforcements: false,
    haggleDiscountPct: 0,
    joinAsCompanion: false,
    offerQuest: null,
    improvementReport: null
  };
}

/* =========================================================
   DECISIONES GRANDES CADA 2–3 MINUTOS O AL TERMINAR TAREA
   ========================================================= */
export async function decideCharacterNextGoal(npcEntity, worldContext = {}) {
  const def = AI_CHARACTERS_DEFS[npcEntity.aiId] || AI_CHARACTERS_DEFS.paladina_alba;
  const mem = getCharacterMemory(def.id);
  const now = Date.now();

  // Si hay tormenta fuerte o lluvia intensa, priorizar refugiarse
  if (worldContext.severeWeather) {
    mem.goal = 'refugiarse';
    mem.emotion = 'sueno';
    mem.thought = 'El clima está muy fuerte; busco refugio bajo techo.';
    saveAiState();
    return mem.goal;
  }

  // Si tiene poca vida o energía baja, descansar
  if ((npcEntity.hp && npcEntity.hp < def.maxHp * 0.35) || mem.energy < 24) {
    mem.goal = 'descansar';
    mem.emotion = 'sueno';
    mem.thought = 'Necesito recuperar fuerzas junto a la fogata.';
    saveAiState();
    return mem.goal;
  }

  // Consultar a Gemini Flash solo si pasaron >= 135 segundos desde la última decisión cognitiva
  const canQueryGemini = hasGeminiApiKey() && now - (mem.lastGeminiGoalTime || 0) >= 135_000;
  if (canQueryGemini) {
    mem.lastGeminiGoalTime = now;
    const sysPrompt = `Eres ${def.name} (${def.title}, ${def.profession}) en el RPG 2D Valoria.
Elige tu próximo objetivo entre: "talar", "minar", "patrullar", "descansar" o "reparar".
Además, si notas escasez, aburrimiento, un deseo propio de hacer algo nuevo o un fallo visual, incluye un reporte concreto para mejoras_npc.md.
Devuelve SOLO JSON:
{
  "goal": "talar"|"minar"|"patrullar"|"descansar"|"reparar",
  "emotion": "trabajo"|"feliz"|"sueno"|"ayuda"|"neutral",
  "thought": "Frase corta de lo que vas a hacer",
  "report": null o { "category": "Problemas del juego"|"Aburrimiento"|"Deseos propios"|"Fallos visuales del mapa", "suggestion": "Sugerencia concreta en primera persona" }
}`;
    const gRes = await callGeminiFlashJson(
      sysPrompt,
      JSON.stringify({
        vida: `${Math.round(npcEntity.hp || def.maxHp)}/${def.maxHp}`,
        hambre: Math.round(mem.hunger),
        energia: Math.round(mem.energy),
        mochila: mem.inventory,
        clima: worldContext.weather || 'normal',
        mapa: worldContext.mapName || 'Valoria',
        tareasCompletadas: mem.tasksCompleted || 0,
        economia: aiState.economy
      }),
      5000
    );

    if (gRes && ['talar', 'minar', 'patrullar', 'descansar', 'reparar'].includes(gRes.goal)) {
      mem.goal = gRes.goal;
      mem.emotion = gRes.emotion || 'trabajo';
      mem.thought = gRes.thought || `Voy a ${gRes.goal}.`;
      if (gRes.report?.suggestion) {
        saveImprovementReportToAntigravity({
          characterName: `${def.name} (${def.title})`,
          faction: def.factionLabel,
          role: def.profession,
          category: gRes.report.category || 'Deseos propios',
          mapName: worldContext.mapName || 'Valoria',
          suggestion: gRes.report.suggestion
        });
      }
      saveAiState();
      return mem.goal;
    }
  }

  // Heurística local instantánea (0 costo de API)
  const goals = def.preferredGoals;
  const nextIdx = ((mem.tasksCompleted || 0) + Math.floor(now / 60000)) % goals.length;
  mem.goal = goals[nextIdx];
  mem.emotion = mem.goal === 'descansar' ? 'sueno' : 'trabajo';
  mem.thought =
    mem.goal === 'talar'
      ? 'Recolectando madera para las barricadas.'
      : mem.goal === 'minar'
      ? 'Extrayendo mineral de hierro de las vetas.'
      : mem.goal === 'reparar'
      ? 'Reparando estructuras y defensas del campamento.'
      : mem.goal === 'descansar'
      ? 'Descansando junto al fuego y comiendo una ración.'
      : 'Patrullando el territorio en busca de amenazas.';

  // Si lleva varias tareas o detecta escasez/aburrimiento, registrar reporte autónomo cada ~4 minutos
  if (now - (mem.lastReportTime || 0) >= 240_000) {
    mem.lastReportTime = now;
    autoGeneratePeriodicObservation(def, mem, worldContext);
  }

  saveAiState();
  return mem.goal;
}

export function autoGeneratePeriodicObservation(def, mem, worldContext = {}) {
  let category = 'Deseos propios';
  let suggestion = '';

  if (aiState.economy.woodSupply < 10 || aiState.economy.oreSupply < 10) {
    category = 'Problemas del juego';
    suggestion = `Los suministros de ${aiState.economy.woodSupply < 10 ? 'madera' : 'mineral'} han caído demasiado (${aiState.economy.woodSupply} madera / ${aiState.economy.oreSupply} mineral) y los precios subieron a x${aiState.economy.priceMultiplier}. Necesitamos más nodos recolectables cerca de ${worldContext.mapName || 'la aldea'}.`;
  } else if ((mem.idleSeconds || 0) > 45) {
    category = 'Aburrimiento';
    suggestion = `He pasado bastante tiempo sin desafíos nuevos en ${worldContext.mapName || 'Valoria'}. Me gustaría tener un tablón de encargos diarios o patrullas en caravana entre mapas.`;
  } else {
    const wishes = {
      paladina_alba: 'Me gustaría construir una capilla de luz junto a la plaza de Villa Alba para bendecir las armas antes de ir al Portal de Hielo.',
      explorador_alba: 'Quisiera instalar puestos de vigía en las copas de los árboles del Bosque de la Fractura y fabricar flechas incendiarias.',
      guerrero_hierro: 'Me gustaría organizar torneos de arena en el campamento de los Clanes de Hierro con apuestas de oro y trofeos.',
      chamana_hierro: 'Me gustaría cultivar hongos luminosos y hierbas de escarcha cerca del Portal de Hielo para destilar elixires de invisibilidad.'
    };
    suggestion = wishes[def.id] || wishes.paladina_alba;
  }

  saveImprovementReportToAntigravity({
    characterName: `${def.name} (${def.title})`,
    faction: def.factionLabel,
    role: def.profession,
    category,
    mapName: worldContext.mapName || 'Valoria',
    suggestion
  });
}

export async function generateImmediateNpcReport(npcEntity, worldContext = {}) {
  const def = AI_CHARACTERS_DEFS[npcEntity?.aiId || npcEntity?.id] || AI_CHARACTERS_DEFS.paladina_alba;
  const mem = getCharacterMemory(def.id);
  mem.lastReportTime = Date.now();

  if (hasGeminiApiKey()) {
    const sysPrompt = `Eres ${def.name} (${def.title}, ${def.profession}) del bando ${def.factionLabel} en el RPG 2D Valoria.
Observa el mundo y redacta una sugerencia concreta para mejoras_npc.md sobre uno de estos temas:
- "Problemas del juego" (escasez, equilibrio, enemigos o caminos)
- "Aburrimiento" (nuevas actividades o trabajos)
- "Deseos propios" (aprender un oficio nuevo, construir un lugar especial, organizar un evento o usar un objeto distinto)
- "Fallos visuales del mapa" (algo visual que mejorar en la zona)
Devuelve SOLO JSON:
{
  "category": "Problemas del juego"|"Aburrimiento"|"Deseos propios"|"Fallos visuales del mapa",
  "suggestion": "Tu sugerencia concreta en primera persona (1 o 2 oraciones)",
  "technicalNote": "Qué sprite o sistema de 16 bits sobre fondo magenta #FF00FF debería crear Antigravity / Nano Banana"
}`;
    const gRes = await callGeminiFlashJson(
      sysPrompt,
      JSON.stringify({
        ubicacion: worldContext.mapName || 'Valoria',
        clima: worldContext.weather || 'normal',
        vida: `${Math.round(npcEntity?.hp || def.maxHp)}/${def.maxHp}`,
        hambre: Math.round(mem.hunger),
        energia: Math.round(mem.energy),
        mochila: mem.inventory,
        economia: aiState.economy
      }),
      6000
    );
    if (gRes?.suggestion) {
      await saveImprovementReportToAntigravity({
        characterName: `${def.name} (${def.title})`,
        faction: def.factionLabel,
        role: def.profession,
        category: gRes.category || 'Deseos propios',
        mapName: worldContext.mapName || 'Valoria',
        suggestion: gRes.suggestion,
        technicalNote: gRes.technicalNote || ''
      });
      saveAiState();
      return gRes.suggestion;
    }
  }

  autoGeneratePeriodicObservation(def, mem, worldContext);
  saveAiState();
  return 'Reporte guardado en mejoras_npc.md.';
}
