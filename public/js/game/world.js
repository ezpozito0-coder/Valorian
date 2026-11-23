/**
 * Generador y renderizador de los 6 Mapas del Continente de Valoria (Niveles 1–90).
 */

import { ENEMY_TEMPLATES, MAPS_META, FACTIONS } from './data.js';
import { getTexturePattern } from './textures.js';

export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1300;

let nextEnemyId = 1;

export function spawnEnemy(kind, x, y) {
  const tpl = ENEMY_TEMPLATES[kind];
  return {
    id: nextEnemyId++,
    ...tpl,
    maxHp: tpl.hp,
    x,
    y,
    homeX: x,
    homeY: y,
    attackTimer: 0.7,
    specialTimer: tpl.specialCd || 5.0,
    telegraphTimer: 0,
    telegraphKind: null,
    telegraphTarget: null,
    phase2Triggered: false,
    stunTimer: 0,
    slowTimer: 0,
    rootTimer: 0,
    hitFlash: 0,
    alive: true,
    respawnTimer: 0
  };
}

export function buildMapInstance(mapId, { faction = 'alba', defeatedBosses = [], openedChests = [], crystalsCollected = 0 } = {}) {
  const base = {
    id: mapId,
    name: mapId === 'aldea' ? (FACTIONS[faction]?.villageName || 'Aldea Inicial') : MAPS_META[mapId]?.name || 'Valoria',
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    safeZone: mapId === 'aldea',
    darkness: mapId === 'cueva',
    weather: mapId === 'bosque' ? 'butterflies' : mapId === 'desierto' ? 'ash' : mapId === 'montanas' ? 'snow' : mapId === 'fortaleza' ? 'void_storm' : 'none',
    buildings: [],
    npcs: [],
    campfires: [],
    trees: [],
    props: [],
    crystals: [],
    gems: [],
    chests: [],
    solids: [],
    waterRects: [],
    bridges: [],
    iceZones: [],
    portals: [],
    enemies: [],
    safeBoxes: [],
    bossAltar: null
  };

  // Muros perimetrales externos
  const wall = 30;
  base.solids.push(
    { x: 0, y: 0, w: MAP_WIDTH, h: wall },
    { x: 0, y: MAP_HEIGHT - wall, w: MAP_WIDTH, h: wall },
    { x: 0, y: 0, w: wall, h: MAP_HEIGHT },
    { x: MAP_WIDTH - wall, y: 0, w: wall, h: MAP_HEIGHT }
  );

  if (mapId === 'aldea') {
    const isAlba = faction === 'alba';
    base.buildings.push(
      {
        id: 'taberna',
        label: 'TABERNA',
        x: 360,
        y: 360,
        w: 185,
        h: 115,
        wallColor: isAlba ? '#E2D9C8' : '#78716C',
        roofColor: isAlba ? '#1E4E8C' : '#9E2A2B',
        roofHighlight: isAlba ? '#3B82F6' : '#C97A32',
        chimney: true
      },
      {
        id: 'forja',
        label: 'HERRERÍA',
        x: 1030,
        y: 360,
        w: 180,
        h: 115,
        wallColor: '#94A3B8',
        roofColor: isAlba ? '#475569' : '#7F1D1D',
        roofHighlight: '#C97A32'
      }
    );

    base.campfires.push({ x: 800, y: 690, radius: 85 });

    base.npcs.push(
      { id: 'tabernero', kind: 'tabernero', name: 'Tabernero', x: 452, y: 515, radius: 18, marker: '!' },
      { id: 'herrero', kind: 'herrero', name: 'Herrero', x: 1120, y: 515, radius: 18, marker: '' },
      { id: 'dummy1', kind: 'dummy', name: 'Muñeco de Entrenamiento', x: 1130, y: 800, radius: 18, hitFlash: 0 },
      { id: 'dummy2', kind: 'dummy', name: 'Muñeco de Entrenamiento', x: 1210, y: 800, radius: 18, hitFlash: 0 },
      { id: 'guard1', kind: isAlba ? 'guardia_alba' : 'guardia_hierro', name: isAlba ? 'Guardia del Alba' : 'Guerrero de Hierro', x: 700, y: 240, radius: 18 },
      { id: 'guard2', kind: isAlba ? 'guardia_alba' : 'guardia_hierro', name: isAlba ? 'Guardia del Alba' : 'Guerrero de Hierro', x: 900, y: 240, radius: 18 }
    );

    // Decoración por bando
    if (isAlba) {
      base.props.push(
        { kind: 'fountain', x: 800, y: 520 },
        { kind: 'banner_alba', x: 650, y: 390 },
        { kind: 'banner_alba', x: 950, y: 390 },
        { kind: 'banner_alba', x: 730, y: 170 },
        { kind: 'banner_alba', x: 870, y: 170 },
        { kind: 'flower', x: 520, y: 640, color: '#60A5FA' },
        { kind: 'flower', x: 540, y: 660, color: '#FFFFFF' },
        { kind: 'flower', x: 1040, y: 650, color: '#60A5FA' },
        { kind: 'flower', x: 640, y: 820, color: '#FFFFFF' }
      );
      base.solids.push({ x: 772, y: 505, w: 56, h: 32 }); // colisión fuente
    } else {
      base.props.push(
        { kind: 'banner_hierro', x: 650, y: 390 },
        { kind: 'banner_hierro', x: 950, y: 390 },
        { kind: 'banner_hierro', x: 730, y: 170 },
        { kind: 'banner_hierro', x: 870, y: 170 },
        { kind: 'torch', x: 680, y: 530 },
        { kind: 'torch', x: 920, y: 530 },
        { kind: 'torch', x: 720, y: 200 },
        { kind: 'torch', x: 880, y: 200 }
      );
    }

    // Elementos comunes
    base.props.push(
      { kind: 'anvil', x: 1185, y: 535 },
      { kind: 'barrel', x: 345, y: 485 },
      { kind: 'barrel', x: 370, y: 495 },
      { kind: 'sign', x: 855, y: 235 }
    );

    base.trees.push(
      { x: 180, y: 220 }, { x: 260, y: 340 }, { x: 190, y: 740 }, { x: 240, y: 980 },
      { x: 1380, y: 240 }, { x: 1410, y: 620 }, { x: 1380, y: 990 }, { x: 540, y: 1080 }, { x: 1050, y: 1080 }
    );

    base.portals.push({
      id: 'to_bosque',
      x: 800,
      y: 120,
      targetMap: 'bosque',
      targetX: 800,
      targetY: 1140,
      label: 'Bosque de la Fractura',
      color: '#22C55E',
      reqLevel: 1
    });
  } else if (mapId === 'bosque') {
    // Río horizontal con puente único al centro
    base.waterRects.push({ x: 30, y: 790, w: 1540, h: 90 });
    base.bridges.push({ x: 720, y: 785, w: 160, h: 100 });
    base.solids.push(
      { x: 30, y: 790, w: 690, h: 90 },
      { x: 880, y: 790, w: 690, h: 90 },
      // Pared de montaña norte dejando acceso a la cueva
      { x: 30, y: 30, w: 670, h: 160 },
      { x: 900, y: 30, w: 670, h: 160 }
    );

    base.trees.push(
      // Sur verde vivo
      { x: 260, y: 1040 }, { x: 420, y: 960 }, { x: 560, y: 1120 }, { x: 1050, y: 1060 }, { x: 1260, y: 970 }, { x: 1420, y: 1100 },
      { x: 240, y: 920 }, // árbol que oculta Cofre 1
      // Norte seco/corrupto
      { x: 220, y: 560, corrupted: true }, { x: 380, y: 430, style: 'dead' }, { x: 1240, y: 580, corrupted: true }, { x: 1380, y: 420, style: 'dead' }
    );

    base.props.push(
      { kind: 'sign', x: 865, y: 1090 },
      { kind: 'flower', x: 640, y: 1030, color: '#FACC15' },
      { kind: 'flower', x: 960, y: 990, color: '#F472B6' },
      { kind: 'ruin_pillar', x: 580, y: 520 },
      { kind: 'ruin_pillar', x: 1020, y: 490 },
      { kind: 'bush', x: 1230, y: 325 },
      { kind: 'bush', x: 1290, y: 325 }
    );

    base.chests.push(
      { id: 'chest_1', x: 210, y: 955, opened: openedChests.includes('chest_1'), gold: 95, items: [{ id: 'gema_esmeralda', qty: 2 }, { id: 'pocion_vida', qty: 2 }] },
      { id: 'chest_2', x: 1260, y: 285, opened: openedChests.includes('chest_2'), gold: 130, items: [{ id: 'gema_rubi', qty: 2 }, { id: 'pocion_velocidad', qty: 1 }] }
    );

    base.gems.push(
      { id: 'bg1', itemId: 'gema_esmeralda', x: 470, y: 640, collected: false, respawnTimer: 0 },
      { id: 'bg2', itemId: 'gema_rubi', x: 1140, y: 620, collected: false, respawnTimer: 0 },
      { id: 'bg3', itemId: 'gema_zafiro', x: 1360, y: 690, collected: false, respawnTimer: 0 }
    );

    base.enemies.push(
      spawnEnemy('lobo', 620, 620),
      spawnEnemy('lobo', 960, 600),
      spawnEnemy('lobo', 790, 470),
      spawnEnemy('lobo', 460, 490),
      spawnEnemy('lobo', 1120, 450)
    );

    base.portals.push(
      { id: 'back_aldea', x: 800, y: 1225, targetMap: 'aldea', targetX: 800, targetY: 200, label: 'Volver a Aldea', color: '#38BDF8', reqLevel: 1 },
      { id: 'to_cueva', x: 800, y: 125, targetMap: 'cueva', targetX: 800, targetY: 1140, label: 'Cueva del Vacío', color: '#9333EA', reqLevel: 1 }
    );
  } else if (mapId === 'cueva') {
    // Paso del Abismo (solo se cruza por el puente central)
    base.bridges.push({ x: 725, y: 660, w: 150, h: 170 });
    base.solids.push(
      { x: 30, y: 665, w: 695, h: 160 },
      { x: 875, y: 665, w: 695, h: 160 }
    );

    base.props.push(
      { kind: 'minecart', x: 470, y: 1020 },
      { kind: 'minecart', x: 1120, y: 980 },
      { kind: 'ruin_pillar', x: 350, y: 490 },
      { kind: 'ruin_pillar', x: 1210, y: 500 },
      { kind: 'torch_void', x: 710, y: 650 },
      { kind: 'torch_void', x: 890, y: 650 }
    );

    // 3 Cristales morados (Misión 4)
    const cPos = [{ id: 'c1', x: 520, y: 960 }, { id: 'c2', x: 1080, y: 920 }, { id: 'c3', x: 960, y: 1080 }];
    cPos.forEach((c, idx) => base.crystals.push({ ...c, collected: crystalsCollected > idx }));

    base.chests.push({
      id: 'chest_3',
      x: 280,
      y: 470,
      opened: openedChests.includes('chest_3'),
      gold: 185,
      items: [{ id: 'gema_zafiro', qty: 2 }, { id: 'pocion_grande', qty: 2 }]
    });

    base.gems.push(
      { id: 'cg1', itemId: 'gema_rubi', x: 420, y: 580, collected: false, respawnTimer: 0 },
      { id: 'cg2', itemId: 'gema_esmeralda', x: 1180, y: 570, collected: false, respawnTimer: 0 },
      { id: 'cg3', itemId: 'gema_zafiro', x: 1290, y: 940, collected: false, respawnTimer: 0 }
    );

    base.enemies.push(
      spawnEnemy('trasgo', 560, 1020),
      spawnEnemy('trasgo', 1020, 1010),
      spawnEnemy('trasgo', 660, 890),
      spawnEnemy('trasgo', 960, 880),
      spawnEnemy('esqueleto', 640, 520),
      spawnEnemy('esqueleto', 960, 520)
    );
    base.bossAltar = { bossKind: 'malakor', x: 800, y: 265, label: 'Invocar a Malakor (Revancha)' };
    if (!defeatedBosses.includes('malakor')) {
      base.enemies.push(spawnEnemy('malakor', 800, 265));
    }

    base.portals.push(
      { id: 'back_bosque', x: 800, y: 1225, targetMap: 'bosque', targetX: 800, targetY: 210, label: 'Bosque de la Fractura', color: '#22C55E', reqLevel: 1 },
      { id: 'to_desierto', x: 800, y: 105, targetMap: 'desierto', targetX: 800, targetY: 1140, label: 'Desierto de Ceniza', color: '#EA580C', reqLevel: 30 }
    );
  } else if (mapId === 'desierto') {
    base.safeBoxes.push({ x: 450, y: 960, w: 700, h: 300 });
    base.campfires.push({ x: 670, y: 1090, radius: 80 });
    base.npcs.push({ id: 'mercader', kind: 'mercader', name: 'Mercader Viajero', x: 930, y: 1090, radius: 18 });

    base.trees.push(
      { x: 520, y: 560, style: 'dry_palm' },
      { x: 1080, y: 580, style: 'dry_palm' },
      { x: 460, y: 740, style: 'dry_palm' },
      { x: 1150, y: 720, style: 'dry_palm' }
    );

    base.props.push(
      { kind: 'caravan', x: 540, y: 1040 },
      { kind: 'ruin_pillar', x: 295, y: 760 }, // roca partida ocultando Cofre 4
      { kind: 'ruin_pillar', x: 700, y: 560 },
      { kind: 'ruin_pillar', x: 900, y: 560 }
    );
    base.solids.push({ x: 280, y: 735, w: 30, h: 36 });

    base.chests.push({
      id: 'chest_4',
      x: 230,
      y: 765,
      opened: openedChests.includes('chest_4'),
      gold: 260,
      items: [{ id: 'gema_rubi', qty: 3 }, { id: 'pocion_grande', qty: 2 }]
    });

    base.gems.push(
      { id: 'dg1', itemId: 'gema_rubi', x: 390, y: 650, collected: false, respawnTimer: 0 },
      { id: 'dg2', itemId: 'gema_esmeralda', x: 1220, y: 640, collected: false, respawnTimer: 0 },
      { id: 'dg3', itemId: 'gema_zafiro', x: 1320, y: 470, collected: false, respawnTimer: 0 }
    );

    base.enemies.push(
      spawnEnemy('escorpion', 560, 810),
      spawnEnemy('escorpion', 1020, 800),
      spawnEnemy('nomada', 640, 620),
      spawnEnemy('nomada', 960, 620),
      spawnEnemy('escorpion', 800, 500)
    );
    base.bossAltar = { bossKind: 'ignis', x: 800, y: 260, label: 'Invocar a Ignis (Revancha)' };
    if (!defeatedBosses.includes('ignis')) {
      base.enemies.push(spawnEnemy('ignis', 800, 260));
    }

    base.portals.push(
      { id: 'back_cueva', x: 800, y: 1225, targetMap: 'cueva', targetX: 800, targetY: 190, label: 'Cueva del Vacío', color: '#9333EA', reqLevel: 1 },
      { id: 'to_montanas', x: 800, y: 105, targetMap: 'montanas', targetX: 800, targetY: 1140, label: 'Montañas Heladas', color: '#38BDF8', reqLevel: 50, reqBoss: 'ignis' }
    );
  } else if (mapId === 'montanas') {
    base.safeBoxes.push({ x: 450, y: 970, w: 700, h: 290 });
    base.buildings.push({
      id: 'refugio',
      label: 'REFUGIO',
      x: 470,
      y: 1010,
      w: 150,
      h: 95,
      wallColor: '#CBD5E1',
      roofColor: '#0369A1',
      roofHighlight: '#BAE6FD',
      chimney: true
    });
    base.campfires.push({ x: 700, y: 1090, radius: 80 });

    // Lago congelado resbaladizo
    base.iceZones.push({ x: 280, y: 420, w: 1040, h: 310 });

    base.trees.push(
      { x: 220, y: 960, style: 'snow_pine' },
      { x: 1180, y: 960, style: 'snow_pine' },
      { x: 1320, y: 810, style: 'snow_pine' }, // pino ocultando Cofre 5
      { x: 190, y: 540, style: 'snow_pine' },
      { x: 1410, y: 540, style: 'snow_pine' }
    );

    base.props.push(
      { kind: 'ice_crystal', x: 350, y: 780 },
      { kind: 'ice_crystal', x: 1250, y: 380 },
      { kind: 'ice_crystal', x: 360, y: 370 }
    );

    base.chests.push({
      id: 'chest_5',
      x: 1380,
      y: 815,
      opened: openedChests.includes('chest_5'),
      gold: 380,
      items: [{ id: 'gema_zafiro', qty: 3 }, { id: 'gema_esmeralda', qty: 2 }]
    });

    base.gems.push(
      { id: 'mg1', itemId: 'gema_zafiro', x: 460, y: 560, collected: false, respawnTimer: 0 },
      { id: 'mg2', itemId: 'gema_esmeralda', x: 1120, y: 570, collected: false, respawnTimer: 0 },
      { id: 'mg3', itemId: 'gema_rubi', x: 800, y: 690, collected: false, respawnTimer: 0 }
    );

    base.enemies.push(
      spawnEnemy('lobo_invernal', 560, 620),
      spawnEnemy('lobo_invernal', 1020, 620),
      spawnEnemy('golem_hielo', 660, 480),
      spawnEnemy('golem_hielo', 940, 480)
    );
    base.bossAltar = { bossKind: 'boreas', x: 800, y: 255, label: 'Invocar a Boreas (Revancha)' };
    if (!defeatedBosses.includes('boreas')) {
      base.enemies.push(spawnEnemy('boreas', 800, 255));
    }

    base.portals.push(
      { id: 'back_desierto', x: 800, y: 1225, targetMap: 'desierto', targetX: 800, targetY: 190, label: 'Desierto de Ceniza', color: '#EA580C', reqLevel: 30 },
      { id: 'to_fortaleza', x: 800, y: 105, targetMap: 'fortaleza', targetX: 800, targetY: 1140, label: 'Fortaleza del Vacío', color: '#A855F7', reqLevel: 70, reqBoss: 'boreas' }
    );
  } else if (mapId === 'fortaleza') {
    base.safeBoxes.push({ x: 660, y: 980, w: 280, h: 280 });
    // Puente de las Sombras sobre el Vacío (entrada)
    base.bridges.push({ x: 680, y: 890, w: 240, h: 370 });
    base.solids.push(
      { x: 30, y: 895, w: 650, h: 375 },
      { x: 920, y: 895, w: 650, h: 375 }
    );

    base.campfires.push({ x: 800, y: 1090, radius: 75 });

    base.props.push(
      { kind: 'torch_void', x: 700, y: 1020 },
      { kind: 'torch_void', x: 900, y: 1020 },
      { kind: 'torch_void', x: 700, y: 910 },
      { kind: 'torch_void', x: 900, y: 910 },
      { kind: 'dark_statue', x: 540, y: 680 },
      { kind: 'dark_statue', x: 1060, y: 680 },
      { kind: 'ruin_pillar', x: 310, y: 610 }, // torre caída para Cofre 6
      { kind: 'void_crystal_giant', x: 800, y: 115 }
    );

    base.chests.push({
      id: 'chest_6',
      x: 245,
      y: 615,
      opened: openedChests.includes('chest_6'),
      gold: 750,
      items: [{ id: 'gema_zafiro', qty: 4 }, { id: 'gema_rubi', qty: 4 }, { id: 'gema_esmeralda', qty: 4 }]
    });

    base.gems.push(
      { id: 'fg1', itemId: 'gema_zafiro', x: 460, y: 540, collected: false, respawnTimer: 0 },
      { id: 'fg2', itemId: 'gema_rubi', x: 1140, y: 540, collected: false, respawnTimer: 0 },
      { id: 'fg3', itemId: 'gema_esmeralda', x: 1260, y: 740, collected: false, respawnTimer: 0 }
    );

    base.enemies.push(
      spawnEnemy('caballero_vacio', 630, 740),
      spawnEnemy('caballero_vacio', 970, 740),
      spawnEnemy('mago_sombrio', 560, 560),
      spawnEnemy('mago_sombrio', 1040, 560)
    );
    base.bossAltar = { bossKind: 'vaelor', x: 800, y: 275, label: 'Invocar a Vaelor (Revancha)' };
    if (!defeatedBosses.includes('vaelor')) {
      base.enemies.push(spawnEnemy('vaelor', 800, 275));
    }

    base.portals.push({
      id: 'back_montanas',
      x: 800,
      y: 1225,
      targetMap: 'montanas',
      targetX: 800,
      targetY: 190,
      label: 'Montañas Heladas',
      color: '#38BDF8',
      reqLevel: 50
    });
  }

  return base;
}

export function drawMapGround(ctx, map, faction, time) {
  const W = map.width;
  const H = map.height;

  if (map.id === 'aldea') {
    const isAlba = faction === 'alba';
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'grass_lush' : 'dirt_hierro') || (isAlba ? '#3B6E3A' : '#6B4226');
    ctx.fillRect(0, 0, W, H);

    // Borde de transición suave hacia la plaza
    ctx.fillStyle = isAlba ? 'rgba(71, 85, 105, 0.45)' : 'rgba(69, 26, 3, 0.45)';
    ctx.fillRect(334, 414, 932, 492);

    // Plaza central con adoquín o tierra apisonada
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'cobble_alba' : 'dirt_road') || '#94A3B8';
    ctx.fillRect(340, 420, 920, 480);

    // Camino norte al portal con bordes
    ctx.fillStyle = isAlba ? 'rgba(71, 85, 105, 0.45)' : 'rgba(69, 26, 3, 0.45)';
    ctx.fillRect(729, 100, 142, 330);
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'cobble_alba' : 'dirt_road') || '#CBD5E1';
    ctx.fillRect(735, 100, 130, 330);

    // Zona de entrenamiento cercada
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 5;
    ctx.strokeRect(1080, 740, 190, 115);

    if (!isAlba) {
      ctx.fillStyle = '#451A03';
      ctx.fillRect(260, 280, 440, 18);
      ctx.fillRect(900, 280, 440, 18);
    }
  } else if (map.id === 'bosque') {
    // Sur: pasto vivo 16-bit -> Norte: pasto corrupto grisáceo
    ctx.fillStyle = getTexturePattern(ctx, 'grass_lush') || '#2F6F3E';
    ctx.fillRect(0, 540, W, H - 540);
    ctx.fillStyle = getTexturePattern(ctx, 'grass_corrupt') || '#312E3F';
    ctx.fillRect(0, 0, W, 560);
    // Transición suave entre ambos biomas
    const trans = ctx.createLinearGradient(0, 480, 0, 660);
    trans.addColorStop(0, 'rgba(46, 43, 58, 0.85)');
    trans.addColorStop(1, 'rgba(52, 105, 54, 0)');
    ctx.fillStyle = trans;
    ctx.fillRect(0, 480, W, 180);

    // Camino de tierra texturizado
    ctx.fillStyle = 'rgba(69, 45, 25, 0.45)';
    ctx.fillRect(739, 160, 122, 1080);
    ctx.fillStyle = getTexturePattern(ctx, 'dirt_road') || '#8C6D49';
    ctx.fillRect(745, 160, 110, 1080);

    // Río animado con orillas de piedra
    ctx.fillStyle = '#526072';
    ctx.fillRect(30, 784, 1540, 102);
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(30, 790, 1540, 90);
    ctx.fillStyle = 'rgba(147, 197, 253, 0.38)';
    const waveShift = (time * 45) % 90;
    for (let rx = 30; rx < 1540; rx += 90) {
      ctx.fillRect(rx + waveShift, 815, 36, 5);
      ctx.fillRect(rx + ((waveShift + 45) % 90), 850, 28, 5);
    }

    // Puente de madera vieja con tablones
    ctx.fillStyle = '#5C3A21';
    ctx.fillRect(720, 785, 160, 100);
    ctx.fillStyle = '#92400E';
    for (let by = 793; by < 880; by += 14) ctx.fillRect(726, by, 148, 8);

    // Grietas moradas al norte y pared de montaña
    ctx.fillStyle = 'rgba(147, 51, 234, 0.45)';
    ctx.fillRect(540, 320, 110, 8);
    ctx.fillRect(980, 280, 120, 8);
    ctx.fillStyle = getTexturePattern(ctx, 'cave_stone') || '#334155';
    ctx.fillRect(30, 30, 670, 160);
    ctx.fillRect(900, 30, 670, 160);
  } else if (map.id === 'cueva') {
    ctx.fillStyle = getTexturePattern(ctx, 'cave_stone') || '#1B1628';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#090512';
    ctx.fillRect(30, 665, 1540, 160);
    ctx.fillStyle = `rgba(147, 51, 234, ${0.3 + Math.sin(time * 3) * 0.12})`;
    ctx.fillRect(30, 730, 1540, 28);
    ctx.fillStyle = getTexturePattern(ctx, 'cobble_alba') || '#475569';
    ctx.fillRect(725, 660, 150, 170);
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.strokeRect(430, 990, 220, 14);
    ctx.strokeStyle = `rgba(168, 85, 247, ${0.55 + Math.sin(time * 4) * 0.2})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(800, 265, 135, 0, Math.PI * 2);
    ctx.stroke();
  } else if (map.id === 'desierto') {
    ctx.fillStyle = getTexturePattern(ctx, 'ash_sand') || '#44403C';
    ctx.fillRect(0, 0, W, H);
    const lavaPulse = 0.65 + Math.sin(time * 4) * 0.25;
    ctx.fillStyle = `rgba(234, 88, 12, ${lavaPulse})`;
    ctx.fillRect(340, 840, 180, 10);
    ctx.fillRect(1090, 790, 210, 10);
    ctx.fillRect(520, 410, 120, 8);
    ctx.strokeStyle = `rgba(249, 115, 22, ${lavaPulse})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(800, 260, 145, 0, Math.PI * 2);
    ctx.stroke();
  } else if (map.id === 'montanas') {
    ctx.fillStyle = getTexturePattern(ctx, 'snow_ground') || '#CBD5E1';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(280, 420, 1040, 310);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let ix = 310; ix < 1280; ix += 140) ctx.fillRect(ix, 460, 60, 6);
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 4;
    ctx.strokeRect(280, 420, 1040, 310);
    ctx.fillStyle = getTexturePattern(ctx, 'cobble_alba') || '#94A3B8';
    ctx.beginPath();
    ctx.arc(800, 255, 145, 0, Math.PI * 2);
    ctx.fill();
  } else if (map.id === 'fortaleza') {
    ctx.fillStyle = getTexturePattern(ctx, 'obsidian_floor') || '#120D1D';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#06030C';
    ctx.fillRect(30, 895, 650, 375);
    ctx.fillRect(920, 895, 650, 375);
    ctx.fillStyle = getTexturePattern(ctx, 'obsidian_floor') || '#27203A';
    ctx.fillRect(680, 890, 240, 370);
    ctx.strokeStyle = '#4C1D95';
    ctx.lineWidth = 3;
    ctx.strokeRect(680, 890, 240, 370);
    const vp = 0.5 + Math.sin(time * 5) * 0.25;
    ctx.fillStyle = `rgba(168, 85, 247, ${vp})`;
    ctx.fillRect(420, 460, 140, 8);
    ctx.fillRect(1040, 460, 140, 8);
    ctx.strokeStyle = `rgba(192, 132, 252, ${vp})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(800, 275, 165, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, W, 30);
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillRect(0, 0, 30, H);
  ctx.fillRect(W - 30, 0, 30, H);
}

export function drawWeatherOverlay(ctx, map, vw, vh, time) {
  if (map.weather === 'butterflies') {
    ctx.fillStyle = '#FEF08A';
    for (let i = 0; i < 8; i++) {
      const bx = ((i * 190 + time * 24) % vw);
      const by = 80 + ((i * 95) % (vh - 140)) + Math.sin(time * 4 + i) * 14;
      ctx.fillRect(bx, by, 4, 3);
    }
  } else if (map.weather === 'ash') {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
    for (let i = 0; i < 28; i++) {
      const ax = (i * 97 + time * 18) % vw;
      const ay = (i * 63 + time * 42) % vh;
      ctx.fillRect(ax, ay, 3, 3);
    }
  } else if (map.weather === 'snow') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    for (let i = 0; i < 36; i++) {
      const sx = (i * 83 + Math.sin(time + i) * 20 + vw) % vw;
      const sy = (i * 59 + time * 68) % vh;
      ctx.fillRect(sx, sy, 4, 4);
    }
  } else if (map.weather === 'void_storm') {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.45)';
    for (let i = 0; i < 18; i++) {
      const vx = (i * 113) % vw;
      const vy = (vh - ((i * 71 + time * 35) % vh));
      ctx.fillRect(vx, vy, 3, 5);
    }
    // Rayo suave ocasional al fondo
    if (Math.sin(time * 1.7) > 0.985) {
      ctx.fillStyle = 'rgba(192, 132, 252, 0.14)';
      ctx.fillRect(0, 0, vw, vh);
    }
  }
}

/**
 * Dibuja el Minimapa real del mapa actual en la esquina superior derecha.
 * Colores: Jugador (blanco), Aliados (amarillo), Enemigos (rojo), Cofres (dorado), Portales (azul).
 */
export function drawMinimap(mmCanvas, map, player) {
  if (!mmCanvas || !map || !player) return;
  const ctx = mmCanvas.getContext('2d');
  const w = mmCanvas.width;
  const h = mmCanvas.height;
  const sx = w / map.width;
  const sy = h / map.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle =
    map.id === 'aldea' ? '#2D5A2E' :
    map.id === 'bosque' ? '#1E3E29' :
    map.id === 'cueva' ? '#1A1326' :
    map.id === 'desierto' ? '#44403C' :
    map.id === 'montanas' ? '#94A3B8' : '#150E24';
  ctx.fillRect(0, 0, w, h);

  // Agua / hielo / sólidos / puentes
  ctx.fillStyle = '#1D4ED8';
  for (const r of map.waterRects) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  ctx.fillStyle = '#7DD3FC';
  for (const r of map.iceZones) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  for (const r of map.solids) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  ctx.fillStyle = '#A16207';
  for (const b of map.bridges) ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
  ctx.fillStyle = '#64748B';
  for (const b of map.buildings) ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);

  // Portales (azul)
  ctx.fillStyle = '#38BDF8';
  for (const pt of map.portals) {
    ctx.beginPath();
    ctx.arc(pt.x * sx, pt.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cofres sin abrir (dorado)
  ctx.fillStyle = '#FDE047';
  for (const ch of map.chests) {
    if (ch.opened) continue;
    ctx.fillRect(ch.x * sx - 2, ch.y * sy - 2, 4, 4);
  }

  // Aliados / NPCs (amarillo)
  ctx.fillStyle = '#EAB308';
  for (const npc of map.npcs) {
    if (npc.kind === 'dummy') continue;
    ctx.fillRect(npc.x * sx - 2, npc.y * sy - 2, 4, 4);
  }

  // Enemigos vivos (rojo)
  ctx.fillStyle = '#EF4444';
  for (const e of map.enemies) {
    if (!e.alive) continue;
    ctx.fillRect(e.x * sx - (e.isBoss ? 3 : 1.8), e.y * sy - (e.isBoss ? 3 : 1.8), e.isBoss ? 6 : 3.6, e.isBoss ? 6 : 3.6);
  }

  // Jugador (blanco)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 3.2, 0, Math.PI * 2);
  ctx.fill();
}
