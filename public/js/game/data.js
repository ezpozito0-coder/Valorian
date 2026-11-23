/**
 * Datos maestros — Crónicas de la Fractura (Fases 8, 9 y 10)
 * 12 Ranuras de Equipo, PM/Energía, Habilidades, Talentos, 4 Mascotas con Niveles,
 * 4 Jefes con Furia, Equipo Exclusivo y Títulos con bonos permanentes.
 */

export const MAX_LEVEL = 90;
export const EQUIP_TIERS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];

export const QUALITIES = [
  { id: 0, name: 'Normal', color: '#3B82F6', mult: 1.0 },
  { id: 1, name: 'Mejorado', color: '#22C55E', mult: 1.2 },
  { id: 2, name: 'Clásico', color: '#EAB308', mult: 1.45 },
  { id: 3, name: 'Épico', color: '#F97316', mult: 1.75 },
  { id: 4, name: 'Legendario', color: '#FDE047', mult: 2.15 }
];

// Exactamente 6 ranuras de defensa (izquierda) y 6 de ataque/accesorios (derecha)
export const DEFENSE_SLOTS = [
  { id: 'casco', label: 'Casco', icon: '🪖' },
  { id: 'pechera', label: 'Pechera', icon: '🛡️' },
  { id: 'guanteletes', label: 'Guanteletes', icon: '🦾' },
  { id: 'guantes', label: 'Guantes', icon: '🧤' },
  { id: 'pierneras', label: 'Pierneras', icon: '👖' },
  { id: 'botas', label: 'Botas', icon: '🥾' }
];

export const OFFENSE_SLOTS = [
  { id: 'arma', label: 'Arma', icon: '⚔️' },
  { id: 'alas', label: 'Alas', icon: '🪽' },
  { id: 'collar', label: 'Collar', icon: '📿' },
  { id: 'anillo1', label: 'Anillo 1', icon: '💍' },
  { id: 'anillo2', label: 'Anillo 2', icon: '💍' },
  { id: 'mascota', label: 'Mascota', icon: '🐾' }
];

export const TITLES = {
  vencedor_malakor: {
    id: 'vencedor_malakor',
    name: 'Vencedor de Malakor',
    bossId: 'malakor',
    bonusText: '+5% Ataque permanente',
    atkPct: 0.05
  },
  senor_ceniza: {
    id: 'senor_ceniza',
    name: 'Señor de la Ceniza',
    bossId: 'ignis',
    bonusText: '+5% Vida permanente',
    hpPct: 0.05
  },
  rompehielos: {
    id: 'rompehielos',
    name: 'Rompehielos',
    bossId: 'boreas',
    bonusText: '+5% Defensa permanente',
    defPct: 0.05
  },
  salvador_valoria: {
    id: 'salvador_valoria',
    name: 'Salvador de Valoria',
    bossId: 'vaelor',
    bonusText: '+5% a todas las estadísticas',
    allPct: 0.05
  }
};

export const BOSS_META = {
  malakor: {
    id: 'malakor',
    name: 'Malakor',
    fullName: 'Malakor, el Guardián Caído',
    mapId: 'cueva',
    level: 25,
    levelRange: 'Nv. 15–30',
    dropItemId: 'collar_sombras',
    titleId: 'vencedor_malakor',
    powers: 'Púas del Vacío · Onda Oscura',
    color: '#9333EA'
  },
  ignis: {
    id: 'ignis',
    name: 'Ignis',
    fullName: 'Ignis, el Señor de la Ceniza',
    mapId: 'desierto',
    level: 50,
    levelRange: 'Nv. 30–50',
    dropItemId: 'anillo_lava',
    titleId: 'senor_ceniza',
    powers: 'Lluvia de Ceniza · Anillo de Lava',
    color: '#EA580C'
  },
  boreas: {
    id: 'boreas',
    name: 'Boreas',
    fullName: 'Boreas, el Titán Congelado',
    mapId: 'montanas',
    level: 70,
    levelRange: 'Nv. 50–70',
    dropItemId: 'casco_escarcha',
    titleId: 'rompehielos',
    powers: 'Aliento Helado · Tormenta de Carámbanos',
    color: '#38BDF8'
  },
  vaelor: {
    id: 'vaelor',
    name: 'Vaelor',
    fullName: 'Vaelor, el Arquitecto de la Fractura',
    mapId: 'fortaleza',
    level: 90,
    levelRange: 'Nv. 70–90',
    dropItemId: 'alas_vacio',
    titleId: 'salvador_valoria',
    powers: 'Corte Dimensional · Rayo · Sombras del Trono',
    color: '#A855F7'
  }
};

export const MAPS_META = {
  aldea: {
    id: 'aldea', order: 1, name: 'Aldea Inicial', levelRange: 'Zona Segura', reqLevel: 1,
    color: '#22C55E', spawnX: 800, spawnY: 700, mapX: 0.19, mapY: 0.56, bossId: null,
    desc: 'Refugio seguro con Fogata, Taberna, Herrería y Zona de Entrenamiento.'
  },
  bosque: {
    id: 'bosque', order: 2, name: 'Bosque de la Fractura', levelRange: 'Niveles 1–15', reqLevel: 1,
    color: '#16A34A', spawnX: 800, spawnY: 1140, mapX: 0.37, mapY: 0.45, bossId: null,
    desc: 'Sendero Sur, Río con puente, Ruinas y acceso a la cueva corrupta.'
  },
  cueva: {
    id: 'cueva', order: 3, name: 'Cueva del Vacío', levelRange: 'Niveles 15–30', reqLevel: 1,
    color: '#9333EA', spawnX: 800, spawnY: 1140, mapX: 0.54, mapY: 0.67, bossId: 'malakor',
    desc: 'Túneles oscuros, Paso del Abismo y el Altar del jefe Malakor.'
  },
  desierto: {
    id: 'desierto', order: 4, name: 'Desierto de Ceniza', levelRange: 'Niveles 30–50', reqLevel: 30,
    color: '#EA580C', spawnX: 800, spawnY: 1140, mapX: 0.75, mapY: 0.65, bossId: 'ignis',
    desc: 'Tierras quemadas con ceniza, lava y el Cráter de Ignis.'
  },
  montanas: {
    id: 'montanas', order: 5, name: 'Montañas Heladas', levelRange: 'Niveles 50–70', reqLevel: 50,
    color: '#38BDF8', spawnX: 800, spawnY: 1140, mapX: 0.77, mapY: 0.34, bossId: 'boreas',
    desc: 'Cordilleras nevadas, lago congelado resbaladizo y la Cima de Boreas.'
  },
  fortaleza: {
    id: 'fortaleza', order: 6, name: 'Fortaleza del Vacío', levelRange: 'Niveles 70–90', reqLevel: 70,
    color: '#7E22CE', spawnX: 800, spawnY: 1140, mapX: 0.52, mapY: 0.24, bossId: 'vaelor',
    desc: 'Origen de la Fractura y Salón del Trono de Vaelor.'
  }
};

export const FACTIONS = {
  alba: {
    id: 'alba',
    name: 'La Guardia del Alba',
    villageName: 'Villa Alba',
    primary: '#1E4E8C',
    secondary: '#F4F6FA',
    accent: '#D9A441',
    races: [
      { id: 'Humano', name: 'Humano', desc: 'Versátil defensor de los reinos de Valoria.' },
      { id: 'Elfo', name: 'Elfo', desc: 'Ágil guardián de los bosques ancestrales.' },
      { id: 'Enano', name: 'Enano', desc: 'Forjador resistente de las montañas del norte.' }
    ]
  },
  hierro: {
    id: 'hierro',
    name: 'Los Clanes de Hierro',
    villageName: 'Campamento Hierro',
    primary: '#9E2A2B',
    secondary: '#C97A32',
    accent: '#6E737B',
    races: [
      { id: 'Orco', name: 'Orco', desc: 'Guerrero feroz nacido para la batalla.' },
      { id: 'Lobo Guerrero', name: 'Lobo Guerrero', desc: 'Cazador veloz de las estepas heladas.' },
      { id: 'Nómada', name: 'Nómada', desc: 'Superviviente astuto de las tierras rojas.' }
    ]
  }
};

export const CLASSES = {
  guerrero: {
    id: 'guerrero', name: 'Guerrero', weapon: 'Espada y Escudo', armor: 'Armadura de Placas',
    hp: 165, mp: 100, atk: 18, def: 15, crit: 5,
    hpPerLvl: 11, mpPerLvl: 4, atkPerLvl: 1.9, defPerLvl: 1.4,
    speed: 205, basicRange: 58, basicCooldown: 0.46, basicType: 'melee',
    skills: [
      { id: 'corte_pesado', name: 'Golpe de Furia', short: 'Furia', mpCost: 15, cooldown: 3.5, desc: 'Tajo devastador en arco que inflige 180% de daño físico.' },
      { id: 'grito_escudo', name: 'Baluarte de Hierro', short: 'Escudo', mpCost: 22, cooldown: 9.0, desc: 'Aumenta +14 Defensa durante 6 segundos.' },
      { id: 'embestida', name: 'Embestida', short: 'Embestir', mpCost: 25, cooldown: 6.5, desc: 'Carga hacia adelante y aturde enemigos 1.5 segundos.' }
    ]
  },
  mago: {
    id: 'mago', name: 'Mago', weapon: 'Bastón', armor: 'Túnica Arcana',
    hp: 105, mp: 150, atk: 24, def: 8, crit: 8,
    hpPerLvl: 7.5, mpPerLvl: 8, atkPerLvl: 2.3, defPerLvl: 0.9,
    speed: 198, basicRange: 265, basicCooldown: 0.52, basicType: 'ranged_arcane',
    skills: [
      { id: 'bola_fuego', name: 'Bola de Fuego', short: 'Fuego', mpCost: 20, cooldown: 3.8, desc: 'Lanza una esfera ígnea con explosión de daño en área.' },
      { id: 'escarcha', name: 'Escarcha', short: 'Escarcha', mpCost: 22, cooldown: 6.0, desc: 'Onda helada que ralentiza enemigos cercanos por 3 segundos.' },
      { id: 'destello', name: 'Destello', short: 'Destello', mpCost: 18, cooldown: 5.5, desc: 'Salto arcano hacia atrás para esquivar ataques.' }
    ]
  },
  arquero: {
    id: 'arquero', name: 'Arquero', weapon: 'Arco', armor: 'Cota de Cuero',
    hp: 125, mp: 120, atk: 20, def: 11, crit: 10,
    hpPerLvl: 9, mpPerLvl: 5, atkPerLvl: 2.1, defPerLvl: 1.1,
    speed: 220, basicRange: 290, basicCooldown: 0.44, basicType: 'ranged_arrow',
    skills: [
      { id: 'flecha_rapida', name: 'Flecha Rápida', short: 'Doble', mpCost: 14, cooldown: 3.0, desc: 'Dispara dos flechas consecutivas de alta precisión.' },
      { id: 'trampa_raices', name: 'Trampa de Raíces', short: 'Raíces', mpCost: 20, cooldown: 7.5, desc: 'Coloca una trampa que inmoviliza enemigos durante 2.5 segundos.' },
      { id: 'lluvia_flechas', name: 'Lluvia de Flechas', short: 'Lluvia', mpCost: 28, cooldown: 6.5, desc: 'Descarga una salva de flechas con daño en área.' }
    ]
  }
};

export const TALENTS = {
  furia: [
    { id: 'fuerza_bruta', name: 'Fuerza Bruta', icon: '⚔️', maxLevel: 5, desc: '+4 Ataque por nivel', atk: 4 },
    { id: 'impetu', name: 'Ímpetu', icon: '🏃', maxLevel: 5, desc: '+8 Velocidad por nivel', speed: 8 },
    { id: 'golpe_letal', name: 'Golpe Letal', icon: '🔥', maxLevel: 5, desc: '+3% Golpe Crítico por nivel', crit: 3 }
  ],
  baluarte: [
    { id: 'determinacion', name: 'Determinación', icon: '💚', maxLevel: 5, desc: '+25 Vida máxima por nivel', hp: 25 },
    { id: 'pared_hierro', name: 'Pared de Hierro', icon: '🛡️', maxLevel: 5, desc: '+3 Defensa por nivel', def: 3 },
    { id: 'mente_clara', name: 'Mente Clara', icon: '🔮', maxLevel: 5, desc: '+18 PM máximo por nivel', mp: 18 }
  ]
};

// 4 Mascotas icónicas con niveles y progresión
export const PETS = {
  lobo_blanco: {
    id: 'lobo_blanco', name: 'Lobo Blanco', icon: '🐺', price: 120,
    collectGold: true, collectGems: false, healPerTick: 0,
    atkBase: 3, atkPerLvl: 1, defBase: 1, defPerLvl: 0.4, hpBase: 10, hpPerLvl: 4, critBase: 1,
    desc: 'Lobo fiel de las nieves. Recoge oro automáticamente y aumenta tu Ataque.'
  },
  fantasma_hoz: {
    id: 'fantasma_hoz', name: 'Fantasma con Hoz', icon: '👻', price: 260,
    collectGold: true, collectGems: true, healPerTick: 0,
    atkBase: 5, atkPerLvl: 1.3, defBase: 0, defPerLvl: 0.3, hpBase: 8, hpPerLvl: 3, critBase: 4,
    desc: 'Espectro segador. Recoge oro y gemas, y potencia tu Golpe Crítico.'
  },
  gato_volador: {
    id: 'gato_volador', name: 'Gato Gigante Volador', icon: '🐱', price: 420,
    collectGold: true, collectGems: true, healPerTick: 14,
    atkBase: 2, atkPerLvl: 0.8, defBase: 3, defPerLvl: 0.8, hpBase: 24, hpPerLvl: 7, critBase: 2,
    desc: 'Guardián alado. Recoge oro y gemas, y regenera tu PV cada 4 segundos.'
  },
  dragon_negro: {
    id: 'dragon_negro', name: 'Dragón Rojo y Negro', icon: '🐉', price: 620,
    collectGold: true, collectGems: true, healPerTick: 6,
    atkBase: 8, atkPerLvl: 1.8, defBase: 6, defPerLvl: 1.2, hpBase: 30, hpPerLvl: 9, critBase: 5,
    desc: 'Dragón ancestral. Recoge oro y gemas, y otorga grandes bonos a todas las stats.'
  }
};

export const ITEMS = {
  pocion_vida: { id: 'pocion_vida', name: 'Poción Pequeña', icon: '🧪', type: 'consumable', heal: 85, price: 25, desc: 'Restaura 85 PV al instante.' },
  pocion_grande: { id: 'pocion_grande', name: 'Poción Grande', icon: '🍷', type: 'consumable', heal: 260, price: 65, desc: 'Restaura 260 PV al instante.' },
  pocion_mana: { id: 'pocion_mana', name: 'Poción de PM', icon: '💧', type: 'consumable', mana: 90, price: 35, desc: 'Restaura 90 PM (Energía) al instante.' },
  pocion_velocidad: { id: 'pocion_velocidad', name: 'Poción de Velocidad', icon: '⚡', type: 'consumable', speedBoost: 12, price: 55, desc: 'Aumenta +45% tu velocidad por 12 segundos.' },
  pergamino_aldea: { id: 'pergamino_aldea', name: 'Pergamino a la Aldea', icon: '📜', type: 'consumable', teleportVillage: true, price: 45, desc: 'Teletransporta al instante a tu Aldea Inicial.' },
  gema_rubi: { id: 'gema_rubi', name: 'Rubí', icon: '♦️', type: 'gem', gemColor: '#EF4444', price: 140, desc: 'Sube el nivel del equipo de 10 en 10 (hasta Nv. 90).' },
  gema_esmeralda: { id: 'gema_esmeralda', name: 'Esmeralda', icon: '💚', type: 'gem', gemColor: '#22C55E', price: 120, desc: 'Refuerza el equipo de +1 a +12 (brillo desde +9).' },
  gema_zafiro: { id: 'gema_zafiro', name: 'Zafiro', icon: '💎', type: 'gem', gemColor: '#3B82F6', price: 180, desc: 'Sube la calidad del equipo hasta Legendario.' },
  esencia_hierro: { id: 'esencia_hierro', name: 'Esencia de Hierro', icon: '⚒️', type: 'material', price: 35, desc: 'Material de forja de Valoria.' },
  cristal_morado: { id: 'cristal_morado', name: 'Cristal Morado', icon: '🔮', type: 'quest_material', price: 0, desc: 'Fragmento del Vacío recogido en la Cueva.' },
  fragmento_vacio: { id: 'fragmento_vacio', name: 'Fragmento del Vacío', icon: '✨', type: 'material', price: 50, desc: 'Energía oscura condensada.' },
  // Equipo Exclusivo de los 4 Jefes (equipable en las 12 ranuras)
  collar_sombras: {
    id: 'collar_sombras', name: 'Collar de Sombras', icon: '📿', type: 'equipment', slot: 'collar',
    quality: 3, crit: 8, mp: 45, atk: 8, price: 0,
    desc: 'Exclusivo de Malakor (Épico). +8% Crítico, +45 PM y +8 ATQ.'
  },
  anillo_lava: {
    id: 'anillo_lava', name: 'Anillo de Lava', icon: '💍', type: 'equipment', slot: 'anillo1',
    quality: 3, atk: 18, hp: 90, crit: 4, price: 0,
    desc: 'Exclusivo de Ignis (Épico). +18 ATQ, +90 PV y +4% Crítico.'
  },
  casco_escarcha: {
    id: 'casco_escarcha', name: 'Casco de Escarcha', icon: '🪖', type: 'equipment', slot: 'casco',
    quality: 3, def: 20, hp: 140, price: 0,
    desc: 'Exclusivo de Boreas (Épico). +20 DEF y +140 PV.'
  },
  alas_vacio: {
    id: 'alas_vacio', name: 'Alas del Vacío', icon: '🪽', type: 'equipment', slot: 'alas',
    quality: 4, atk: 28, def: 22, hp: 180, mp: 80, crit: 10, price: 0,
    desc: 'Exclusivo de Vaelor (Legendario). Visibles en la espalda con aura morada. +28 ATQ, +22 DEF, +180 PV, +80 PM, +10% Crítico.'
  }
};

export const ACHIEVEMENTS = [
  { id: 'lobos_10', icon: '🐺', title: 'Cazador del Bosque', desc: 'Vence a 10 Lobos Corruptos.', check: (s) => (s.stats?.wolvesTotal || 0) >= 10, progress: (s) => `${Math.min(10, s.stats?.wolvesTotal || 0)}/10` },
  { id: 'cofres_6', icon: '🧰', title: 'Buscador de Tesoros', desc: 'Abre los 6 cofres escondidos de Valoria.', check: (s) => (s.openedChests?.length || 0) >= 6, progress: (s) => `${Math.min(6, s.openedChests?.length || 0)}/6` },
  { id: 'primera_mascota', icon: '🐾', title: 'Compañero Fiel', desc: 'Consigue tu primera mascota.', check: (s) => (s.ownedPets?.length || 0) >= 1, progress: (s) => ((s.ownedPets?.length || 0) >= 1 ? '1/1' : '0/1') },
  { id: 'arma_12', icon: '⚡', title: 'Brillo Supremo (+12)', desc: 'Sube tu arma o armadura hasta +12.', check: (s) => (s.equipment?.weapon?.plus || 0) >= 12 || (s.equipment?.armor?.plus || 0) >= 12, progress: (s) => `+${Math.max(s.equipment?.weapon?.plus || 0, s.equipment?.armor?.plus || 0)}/+12` },
  { id: 'arma_legendaria', icon: '🌟', title: 'Forja Legendaria', desc: 'Consigue equipo de calidad Legendaria.', check: (s) => (s.equipment?.weapon?.quality || 0) >= 4 || (s.equipment?.armor?.quality || 0) >= 4 || Boolean(s.gearSlots?.alas), progress: (s) => ((s.equipment?.weapon?.quality || 0) >= 4 || Boolean(s.gearSlots?.alas) ? 'Obtenido' : 'En progreso') },
  { id: 'malakor', icon: '👑', title: 'Vencedor de Malakor', desc: 'Derrota a Malakor en la Cueva del Vacío.', check: (s) => Boolean(s.defeatedBosses?.includes('malakor')), progress: (s) => (s.defeatedBosses?.includes('malakor') ? '1/1' : '0/1') },
  { id: 'vaelor', icon: '🏆', title: 'Salvador de Valoria', desc: 'Derrota a Vaelor en la Fortaleza del Vacío.', check: (s) => Boolean(s.defeatedBosses?.includes('vaelor')), progress: (s) => (s.defeatedBosses?.includes('vaelor') ? '1/1' : '0/1') }
];

export const QUESTS = [
  { id: 1, title: 'Bienvenida en la Taberna', objective: 'Habla con el Tabernero en la Aldea Inicial.', targetMap: 'aldea', rewardGold: 45, rewardXp: 50, rewardItems: [{ id: 'pocion_vida', qty: 2 }, { id: 'pocion_mana', qty: 2 }] },
  { id: 2, title: 'Prueba de la Forja', objective: 'Habla con el Herrero y golpea los Muñecos (3 veces).', targetMap: 'aldea', requiredHits: 3, rewardGold: 65, rewardXp: 80, rewardItems: [{ id: 'gema_esmeralda', qty: 1 }, { id: 'esencia_hierro', qty: 1 }] },
  { id: 3, title: 'Amenaza en el Bosque', objective: 'Derrota 5 Lobos Corruptos en el Bosque de la Fractura.', targetMap: 'bosque', requiredKills: 5, rewardGold: 130, rewardXp: 170, rewardItems: [{ id: 'gema_rubi', qty: 1 }, { id: 'pocion_vida', qty: 2 }] },
  { id: 4, title: 'Sombras en la Cueva', objective: 'Derrota 4 Trasgos y recoge 3 Cristales Morados en la Cueva.', targetMap: 'cueva', requiredKills: 4, requiredCrystals: 3, rewardGold: 220, rewardXp: 290, rewardItems: [{ id: 'gema_zafiro', qty: 1 }, { id: 'pocion_grande', qty: 1 }] },
  { id: 5, title: 'El Guardián Caído', objective: 'Derrota a Malakor en la Cueva y vuelve con el Tabernero.', targetMap: 'cueva', rewardGold: 450, rewardXp: 650, rewardItems: [{ id: 'gema_rubi', qty: 2 }, { id: 'gema_esmeralda', qty: 2 }, { id: 'gema_zafiro', qty: 1 }] }
];

export const ENEMY_TEMPLATES = {
  lobo: { kind: 'lobo', name: 'Lobo Corrupto', hp: 65, atk: 13, def: 4, xp: 36, speed: 124, radius: 17, aggroRange: 220, attackRange: 34, attackCd: 1.15, goldMin: 14, goldMax: 24, gemDropChance: 0.36, gemPool: ['gema_esmeralda', 'gema_rubi'] },
  trasgo: { kind: 'trasgo', name: 'Trasgo Sombrío', hp: 95, atk: 18, def: 7, xp: 64, speed: 102, radius: 16, aggroRange: 260, attackRange: 195, ranged: true, projColor: '#C084FC', attackCd: 1.6, goldMin: 20, goldMax: 34, gemDropChance: 0.42, gemPool: ['gema_esmeralda', 'gema_zafiro', 'gema_rubi'] },
  esqueleto: { kind: 'esqueleto', name: 'Esqueleto del Vacío', hp: 155, atk: 24, def: 13, xp: 98, speed: 92, radius: 19, aggroRange: 220, attackRange: 38, attackCd: 1.35, goldMin: 28, goldMax: 45, gemDropChance: 0.5, gemPool: ['gema_rubi', 'gema_zafiro', 'gema_esmeralda'] },
  malakor: { kind: 'malakor', name: 'Malakor, el Guardián Caído', level: 25, isBoss: true, hp: 520, atk: 32, def: 15, xp: 520, speed: 98, radius: 34, aggroRange: 340, attackRange: 58, attackCd: 1.35, specialCd: 4.8, goldMin: 240, goldMax: 320, gemDropChance: 1.0, gemPool: ['gema_zafiro', 'gema_rubi', 'gema_esmeralda'] },
  escorpion: { kind: 'escorpion', name: 'Escorpión de Ceniza', hp: 230, atk: 38, def: 18, xp: 165, speed: 155, radius: 17, aggroRange: 240, attackRange: 36, attackCd: 0.95, goldMin: 42, goldMax: 64, gemDropChance: 0.48, gemPool: ['gema_rubi', 'gema_esmeralda'] },
  nomada: { kind: 'nomada', name: 'Nómada Corrupto', hp: 210, atk: 42, def: 16, xp: 190, speed: 112, radius: 17, aggroRange: 280, attackRange: 220, ranged: true, projColor: '#F97316', attackCd: 1.45, goldMin: 48, goldMax: 72, gemDropChance: 0.52, gemPool: ['gema_rubi', 'gema_zafiro'] },
  ignis: { kind: 'ignis', name: 'Ignis, el Señor de la Ceniza', level: 50, isBoss: true, hp: 1150, atk: 54, def: 26, xp: 1050, speed: 104, radius: 36, aggroRange: 350, attackRange: 62, attackCd: 1.3, specialCd: 4.5, goldMin: 420, goldMax: 520, gemDropChance: 1.0, gemPool: ['gema_rubi', 'gema_zafiro'] },
  lobo_invernal: { kind: 'lobo_invernal', name: 'Lobo Invernal', hp: 360, atk: 56, def: 24, xp: 290, speed: 172, radius: 18, aggroRange: 260, attackRange: 36, attackCd: 0.9, goldMin: 68, goldMax: 95, gemDropChance: 0.54, gemPool: ['gema_esmeralda', 'gema_zafiro'] },
  golem_hielo: { kind: 'golem_hielo', name: 'Gólem de Hielo', hp: 620, atk: 62, def: 42, xp: 350, speed: 82, radius: 24, aggroRange: 230, attackRange: 46, attackCd: 1.6, goldMin: 82, goldMax: 115, gemDropChance: 0.6, gemPool: ['gema_zafiro', 'gema_rubi'] },
  boreas: { kind: 'boreas', name: 'Boreas, el Titán Congelado', level: 70, isBoss: true, hp: 1850, atk: 76, def: 44, xp: 1750, speed: 94, radius: 38, aggroRange: 360, attackRange: 66, attackCd: 1.35, specialCd: 4.6, goldMin: 620, goldMax: 760, gemDropChance: 1.0, gemPool: ['gema_zafiro', 'gema_esmeralda'] },
  caballero_vacio: { kind: 'caballero_vacio', name: 'Caballero del Vacío', hp: 720, atk: 88, def: 52, xp: 490, speed: 118, radius: 21, aggroRange: 260, attackRange: 44, attackCd: 1.2, goldMin: 110, goldMax: 150, gemDropChance: 0.65, gemPool: ['gema_rubi', 'gema_esmeralda', 'gema_zafiro'] },
  mago_sombrio: { kind: 'mago_sombrio', name: 'Mago Sombrío', hp: 560, atk: 96, def: 36, xp: 530, speed: 108, radius: 18, aggroRange: 300, attackRange: 250, ranged: true, projColor: '#A855F7', attackCd: 1.35, goldMin: 120, goldMax: 165, gemDropChance: 0.68, gemPool: ['gema_zafiro', 'gema_rubi'] },
  vaelor: { kind: 'vaelor', name: 'Vaelor, el Arquitecto de la Fractura', level: 90, isBoss: true, isFinalBoss: true, hp: 3100, atk: 112, def: 58, xp: 3400, speed: 110, radius: 40, aggroRange: 390, attackRange: 74, attackCd: 1.2, specialCd: 4.0, goldMin: 1200, goldMax: 1500, gemDropChance: 1.0, gemPool: ['gema_zafiro', 'gema_rubi', 'gema_esmeralda'] }
};

export function xpNeededForLevel(level) {
  if (level >= MAX_LEVEL) return 0;
  return Math.round(60 + (level - 1) * 32 + Math.pow(level - 1, 1.3) * 7);
}

export function petXpNeeded(level) {
  return Math.round(50 + (level - 1) * 40);
}

export function getTierUpgradeCost(piece) {
  const idx = EQUIP_TIERS.indexOf(piece.tier);
  if (idx === -1 || idx >= EQUIP_TIERS.length - 1) return null;
  return { gemId: 'gema_rubi', gemQty: 1 + Math.floor(idx / 3), gold: 60 + idx * 55, nextTier: EQUIP_TIERS[idx + 1] };
}

export function getPlusUpgradeCost(piece) {
  if (piece.plus >= 12) return null;
  const nextPlus = piece.plus + 1;
  return { gemId: 'gema_esmeralda', gemQty: nextPlus >= 9 ? 2 : 1, gold: 35 + nextPlus * 30, nextPlus };
}

export function getQualityUpgradeCost(piece) {
  if (piece.quality >= QUALITIES.length - 1) return null;
  const nextQuality = piece.quality + 1;
  return { gemId: 'gema_zafiro', gemQty: nextQuality >= 3 ? 2 : 1, gold: 90 + nextQuality * 110, nextQuality };
}

export function computeWeaponAtkBonus(weapon) {
  const tierIdx = Math.max(0, EQUIP_TIERS.indexOf(weapon.tier));
  const qual = QUALITIES[weapon.quality] || QUALITIES[0];
  return Math.round((tierIdx * 8 + weapon.plus * 3.5) * qual.mult);
}

export function computeArmorBonuses(armor) {
  const tierIdx = Math.max(0, EQUIP_TIERS.indexOf(armor.tier));
  const qual = QUALITIES[armor.quality] || QUALITIES[0];
  return {
    def: Math.round((tierIdx * 5 + armor.plus * 2.5) * qual.mult),
    hp: Math.round((tierIdx * 24 + armor.plus * 12) * qual.mult)
  };
}

export function getRaceLabel(raceId, gender = 'male') {
  if (gender !== 'female') return raceId;
  const map = { Humano: 'Humana', Elfo: 'Elfa', Enano: 'Enana', Orco: 'Orca', 'Lobo Guerrero': 'Loba Guerrera', 'Nómada': 'Nómada' };
  return map[raceId] || raceId;
}

export function getClassLabel(classId, gender = 'male') {
  const cls = CLASSES[classId] || CLASSES.guerrero;
  if (gender !== 'female') return cls.name;
  const map = { guerrero: 'Guerrera', mago: 'Maga', arquero: 'Arquera' };
  return map[classId] || cls.name;
}

function defaultGearSlots() {
  return {
    casco: null, pechera: 'base', guanteletes: null, guantes: null, pierneras: null, botas: null,
    arma: 'base', alas: null, collar: null, anillo1: null, anillo2: null, mascota: 'lobo_blanco'
  };
}

export function createInitialSave({ name, faction, gender = 'male', race, heroClass }) {
  const cls = CLASSES[heroClass] || CLASSES.guerrero;
  return {
    version: 4,
    name: name.trim().slice(0, 15) || 'Héroe',
    faction,
    gender: gender === 'female' ? 'female' : 'male',
    race,
    heroClass,
    level: 1,
    xp: 0,
    currentMap: 'aldea',
    visitedMaps: ['aldea'],
    defeatedBosses: [],
    unlockedTitles: [],
    activeTitle: null,
    vaelorVictoryShown: false,
    x: 800,
    y: 720,
    hp: cls.hp,
    maxHp: cls.hp,
    mp: cls.mp,
    maxMp: cls.mp,
    gold: 60,
    equipment: {
      weapon: { tier: 1, plus: 0, quality: 0 },
      armor: { tier: 1, plus: 0, quality: 0 }
    },
    gearSlots: defaultGearSlots(),
    skillPoints: 1,
    skillLevels: [1, 1, 1],
    talentPoints: 1,
    talentLevels: {
      fuerza_bruta: 0, impetu: 0, golpe_letal: 0,
      determinacion: 0, pared_hierro: 0, mente_clara: 0
    },
    ownedPets: ['lobo_blanco'],
    activePet: 'lobo_blanco',
    petProgress: {
      lobo_blanco: { level: 1, xp: 0 },
      fantasma_hoz: { level: 1, xp: 0 },
      gato_volador: { level: 1, xp: 0 },
      dragon_negro: { level: 1, xp: 0 }
    },
    openedChests: [],
    unlockedAchievements: [],
    backpack: [{ id: 'pocion_vida', qty: 3 }, { id: 'pocion_mana', qty: 2 }],
    quest: {
      currentId: 1, talkedBlacksmith: false, dummyHits: 0, wolvesKilled: 0,
      goblinsKilled: 0, crystalsCollected: 0, malakorDefeated: false, completedAll: false
    },
    stats: { enemiesDefeated: 0, wolvesTotal: 0, playTimeSec: 0 }
  };
}

const LEGACY_PET_MAP = {
  cachorro: 'lobo_blanco',
  espiritu: 'fantasma_hoz',
  fenix: 'gato_volador',
  golem: 'dragon_negro'
};

export function normalizeSave(raw) {
  if (!raw) return null;
  const cls = CLASSES[raw.heroClass] || CLASSES.guerrero;
  const validMap = MAPS_META[raw.currentMap] ? raw.currentMap : 'aldea';
  const visited = Array.isArray(raw.visitedMaps) && raw.visitedMaps.length > 0 ? [...raw.visitedMaps] : ['aldea'];
  if (!visited.includes(validMap)) visited.push(validMap);

  const migratedPets = (Array.isArray(raw.ownedPets) ? raw.ownedPets : ['lobo_blanco'])
    .map((id) => LEGACY_PET_MAP[id] || id)
    .filter((id) => Boolean(PETS[id]));
  if (migratedPets.length === 0) migratedPets.push('lobo_blanco');

  const rawActivePet = LEGACY_PET_MAP[raw.activePet] || raw.activePet;
  const activePet = rawActivePet && PETS[rawActivePet] ? rawActivePet : migratedPets[0];

  const defeatedBosses = Array.isArray(raw.defeatedBosses)
    ? [...raw.defeatedBosses]
    : raw.quest?.malakorDefeated ? ['malakor'] : [];

  const unlockedTitles = Array.isArray(raw.unlockedTitles) ? [...raw.unlockedTitles] : [];
  for (const bId of defeatedBosses) {
    const tId = BOSS_META[bId]?.titleId;
    if (tId && !unlockedTitles.includes(tId)) unlockedTitles.push(tId);
  }

  const gearSlots = { ...defaultGearSlots(), ...(raw.gearSlots || {}), mascota: activePet };

  return {
    version: 4,
    name: raw.name || 'Héroe',
    faction: raw.faction || 'alba',
    gender: raw.gender === 'female' ? 'female' : 'male',
    race: raw.race || 'Humano',
    heroClass: raw.heroClass || 'guerrero',
    level: Math.max(1, Math.min(MAX_LEVEL, Number(raw.level || 1))),
    xp: Math.max(0, Number(raw.xp || 0)),
    currentMap: validMap,
    visitedMaps: visited,
    defeatedBosses,
    unlockedTitles,
    activeTitle: raw.activeTitle && TITLES[raw.activeTitle] ? raw.activeTitle : (unlockedTitles[0] || null),
    vaelorVictoryShown: Boolean(raw.vaelorVictoryShown),
    x: raw.x ?? 800,
    y: raw.y ?? 720,
    hp: raw.hp ?? cls.hp,
    maxHp: raw.maxHp ?? cls.hp,
    mp: raw.mp ?? cls.mp,
    maxMp: raw.maxMp ?? cls.mp,
    gold: raw.gold ?? 60,
    equipment: {
      weapon: {
        tier: EQUIP_TIERS.includes(raw.equipment?.weapon?.tier) ? raw.equipment.weapon.tier : 1,
        plus: Math.max(0, Math.min(12, Number(raw.equipment?.weapon?.plus ?? raw.weaponLevel ?? 0))),
        quality: Math.max(0, Math.min(4, Number(raw.equipment?.weapon?.quality || 0)))
      },
      armor: {
        tier: EQUIP_TIERS.includes(raw.equipment?.armor?.tier) ? raw.equipment.armor.tier : 1,
        plus: Math.max(0, Math.min(12, Number(raw.equipment?.armor?.plus || 0))),
        quality: Math.max(0, Math.min(4, Number(raw.equipment?.armor?.quality || 0)))
      }
    },
    gearSlots,
    skillPoints: Number(raw.skillPoints ?? Math.max(1, Number(raw.level || 1))),
    skillLevels: Array.isArray(raw.skillLevels) && raw.skillLevels.length === 3 ? raw.skillLevels : [1, 1, 1],
    talentPoints: Number(raw.talentPoints ?? Math.max(1, Number(raw.level || 1))),
    talentLevels: {
      fuerza_bruta: 0, impetu: 0, golpe_letal: 0,
      determinacion: 0, pared_hierro: 0, mente_clara: 0,
      ...(raw.talentLevels || {})
    },
    ownedPets: [...new Set(migratedPets)],
    activePet,
    petProgress: {
      lobo_blanco: { level: 1, xp: 0 },
      fantasma_hoz: { level: 1, xp: 0 },
      gato_volador: { level: 1, xp: 0 },
      dragon_negro: { level: 1, xp: 0 },
      ...(raw.petProgress || {})
    },
    openedChests: Array.isArray(raw.openedChests) ? raw.openedChests : [],
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    backpack: Array.isArray(raw.backpack) ? raw.backpack : [{ id: 'pocion_vida', qty: 2 }],
    quest: {
      currentId: 1, talkedBlacksmith: false, dummyHits: 0, wolvesKilled: 0,
      goblinsKilled: 0, crystalsCollected: 0, malakorDefeated: false, completedAll: false,
      ...(raw.quest || {})
    },
    stats: { enemiesDefeated: 0, wolvesTotal: raw.quest?.wolvesKilled || 0, playTimeSec: 0, ...(raw.stats || {}) }
  };
}
