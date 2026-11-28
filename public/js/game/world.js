/**
 * Generador y renderizador de los 6 Mapas del Continente de Valoria (Niveles 1–90).
 */

import { ENEMY_TEMPLATES, MAPS_META, FACTIONS } from './data.js';
import { getTexturePattern } from './textures.js';
import { drawMapSheetSprite, drawTerrainTile, drawPropStructureSprite, drawSeamlessTileSprite, drawWorldUpgradeSprite, drawBiomePerimeterFrame, getAsset, getSpriteFrameMetrics, drawFootAnchoredSprite } from './assetLoader.js';
import { AI_CHARACTERS_DEFS, getCharacterMemory, getAiState } from './geminiAI.js';

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
  const isVillageMap = mapId === 'aldea' || mapId === 'aldea_hierro';
  const villageFaction = mapId === 'aldea_hierro' ? 'hierro' : 'alba';
  const base = {
    id: mapId,
    name: mapId === 'aldea' ? 'Villa Alba' : mapId === 'aldea_hierro' ? 'Bastión de Hierro' : MAPS_META[mapId]?.name || 'Valoria',
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    safeZone: (mapId === 'aldea' && faction === 'alba') || (mapId === 'aldea_hierro' && faction === 'hierro'),
    villageFaction: isVillageMap ? villageFaction : null,
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
    cliffs: [],
    stairs: [],
    doodads: [],
    groundDetails: [],
    animatedLoops: [],
    terrainZones: [],
    bossAltar: null
  };

  const addTerrainZone = (kind, x, y, w, h, transitionKey = null) => {
    base.terrainZones.push({ kind, x, y, w, h, transitionKey });
  };

  const addCliff = (kind, x, y, w, h, solidPadY = 26) => {
    base.cliffs.push({ kind, x, y, w, h });
    base.solids.push({ x: x + 4, y: y + solidPadY, w: Math.max(16, w - 8), h: Math.max(16, h - solidPadY), fromCliff: true });
  };
  const addStairs = (kind, x, y, w, h) => {
    base.stairs.push({ kind, x, y, w, h });
  };
  const addDoodad = (kind, x, y, w, h, solid = false) => {
    if (solid) {
      base.doodads.push({ kind, x, y, w, h });
      base.solids.push({ x: x - w * 0.38, y: y - h * 0.28, w: w * 0.76, h: h * 0.42 });
    } else {
      base.groundDetails.push({ kind, x, y, w, h });
    }
  };

  // Muros perimetrales externos
  const wall = 30;
  base.solids.push(
    { x: 0, y: 0, w: MAP_WIDTH, h: wall },
    { x: 0, y: MAP_HEIGHT - wall, w: MAP_WIDTH, h: wall },
    { x: 0, y: 0, w: wall, h: MAP_HEIGHT },
    { x: MAP_WIDTH - wall, y: 0, w: wall, h: MAP_HEIGHT }
  );

  if (mapId === 'aldea' || mapId === 'aldea_hierro') {
    const isAlba = mapId === 'aldea';
    base.buildings.push(
      {
        id: 'taberna',
        label: 'TABERNA',
        x: 360,
        y: 360,
        w: 185,
        h: 115,
        isHierro: !isAlba,
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
        isHierro: !isAlba,
        wallColor: '#94A3B8',
        roofColor: isAlba ? '#475569' : '#7F1D1D',
        roofHighlight: '#C97A32'
      }
    );

    base.campfires.push({ x: 800, y: 690, radius: 85 });

    base.npcs.push(
      { id: 'tabernero', kind: 'tabernero', name: isAlba ? 'Tabernero de Villa Alba' : 'Tabernero del Bastión', faction: isAlba ? 'alba' : 'hierro', x: 452, y: 515, radius: 18, marker: '!' },
      { id: 'herrero', kind: 'herrero', name: isAlba ? 'Maestro Herrero (Alba)' : 'Forjador de Hierro', faction: isAlba ? 'alba' : 'hierro', x: 1120, y: 515, radius: 18, marker: '' },
      { id: 'mercader_aldea', kind: 'mercader', name: isAlba ? 'Mercader Real (Alba)' : 'Mercader del Clan (Hierro)', faction: isAlba ? 'alba' : 'hierro', x: 540, y: 785, radius: 18, marker: '' },
      { id: 'dummy1', kind: 'dummy', name: 'Muñeco de Entrenamiento', x: 1130, y: 800, radius: 18, hitFlash: 0 },
      { id: 'dummy2', kind: 'dummy', name: 'Muñeco de Entrenamiento', x: 1210, y: 800, radius: 18, hitFlash: 0 },
      {
        id: 'guard1',
        kind: isAlba ? 'guardia_alba' : 'guardia_hierro',
        name: isAlba ? 'Guardia del Alba' : 'Centinela de Hierro',
        faction: isAlba ? 'alba' : 'hierro',
        isPortalGuard: true,
        x: 700,
        y: 240,
        homeX: 700,
        homeY: 240,
        hp: 460,
        maxHp: 460,
        atk: 38,
        def: 18,
        speed: 135,
        radius: 18,
        emotion: 'neutral',
        hostile: false
      },
      {
        id: 'guard2',
        kind: isAlba ? 'guardia_alba' : 'guardia_hierro',
        name: isAlba ? 'Guardia del Alba' : 'Centinela de Hierro',
        faction: isAlba ? 'alba' : 'hierro',
        isPortalGuard: true,
        x: 900,
        y: 240,
        homeX: 900,
        homeY: 240,
        hp: 460,
        maxHp: 460,
        atk: 38,
        def: 18,
        speed: 135,
        radius: 18,
        emotion: 'neutral',
        hostile: false
      }
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
      { kind: 'sign', x: 855, y: 235 },
      { kind: 'armero_entrenamiento', x: 1175, y: 762 }
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

    // Pozo techado medieval, farolas de hierro forjado y doodads 16-bit de Guardia del Alba / Aldea
    base.props.push({ kind: 'pozo_aldea', x: 595, y: 538 });
    base.solids.push({ x: 567, y: 515, w: 56, h: 36 });
    if (isAlba) {
      base.props.push(
        { kind: 'farola_aldea', x: 718, y: 470 },
        { kind: 'farola_aldea', x: 882, y: 470 }
      );
    }
    addDoodad('doodad_cart', 315, 565, 42, 48, true);
    addDoodad('doodad_crate_front', 332, 446, 32, 34, true);
    addDoodad('doodad_crate_angle', 1228, 472, 34, 38, true);
    addDoodad('doodad_barrel', 1262, 486, 28, 38, true);
    addDoodad('doodad_lantern_blue', 744, 502, 20, 38, false);
    addDoodad('doodad_lantern_blue', 856, 502, 20, 38, false);
    addDoodad('doodad_bush_flower', 505, 650, 38, 36, false);
    addDoodad('doodad_bush_green', 1075, 655, 38, 34, false);
    addDoodad('doodad_flower_purple', 540, 690, 28, 34, false);
    addDoodad('doodad_flower_yellow', 1020, 695, 26, 34, false);
    addCliff('ruin_wall_md', 210, 120, 102, 77, 28);
    addCliff('ruin_wall_md', 1280, 120, 102, 77, 28);
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
      { id: 'back_aldea', x: 710, y: 1225, targetMap: 'aldea', targetX: 800, targetY: 200, label: 'Villa Alba (Guardia del Alba)', color: '#38BDF8', reqLevel: 1 },
      { id: 'back_aldea_hierro', x: 890, y: 1225, targetMap: 'aldea_hierro', targetX: 800, targetY: 200, label: 'Bastión de Hierro (Clanes de Hierro)', color: '#EF4444', reqLevel: 1 },
      { id: 'to_cueva', x: 800, y: 125, targetMap: 'cueva', targetX: 800, targetY: 1140, label: 'Cueva del Vacío', color: '#9333EA', reqLevel: 1 }
    );

    // Ruinas medievales, boca de cueva rocosa, escalera de acceso, río animado y detalles de Bioma Corrupto / Alba
    base.props.push({ kind: 'entrada_cueva', x: 800, y: 120 });
    base.solids.push(
      { x: 705, y: 50, w: 48, h: 72 },
      { x: 847, y: 50, w: 48, h: 72 }
    );
    addStairs('stairs_stone', 774, 155, 52, 61);
    addCliff('ruin_wall_arch', 395, 455, 137, 93, 34);
    addDoodad('doodad_dead_tree_md', 310, 560, 56, 86, true);
    addDoodad('doodad_corrupt_fern', 540, 595, 34, 37, false);
    addDoodad('doodad_mushroom_dark', 610, 480, 34, 38, false);
    addDoodad('doodad_mushroom_red', 1050, 510, 29, 31, false);
    addDoodad('doodad_dead_root', 1180, 520, 34, 43, false);
    addDoodad('doodad_bush_flower', 660, 1045, 38, 37, false);
    addDoodad('doodad_flower_yellow', 920, 1020, 28, 36, false);
    addTerrainZone('corrupt_water', 180, 240, 176, 112, 'trans_corrupto_agua');
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

    // Cristales limpios, vetas de mineral y detalles de Cueva/Obsidiana (puente limpio sin escalera encimada)
    addDoodad('doodad_crystal_purple_lg', 605, 340, 36, 46, true);
    addDoodad('doodad_crystal_blue_lg', 995, 340, 36, 46, true);
    addDoodad('doodad_rock_obsidian', 440, 910, 44, 31, true);
    addDoodad('doodad_ore_gold', 1170, 880, 34, 31, true);
    addDoodad('doodad_ore_iron', 350, 560, 40, 35, true);
    addDoodad('doodad_pebbles', 690, 960, 28, 22, false);
    addDoodad('doodad_void_crack', 895, 965, 38, 25, false);
    addDoodad('doodad_crystal_purple_sm', 560, 520, 28, 28, false);
    addDoodad('doodad_crystal_blue_sm', 1050, 525, 26, 27, false);
    addTerrainZone('corrupt_water', 180, 825, 176, 110, 'trans_lava_corrupto');
    addTerrainZone('corrupt_water', 1240, 825, 176, 110, 'trans_lava_corrupto');
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
    addTerrainZone('lava', 200, 430, 192, 120, 'trans_arena_lava');
    addTerrainZone('lava', 1200, 430, 192, 120, 'trans_arena_lava');
    addTerrainZone('shallow_water', 1210, 980, 168, 108, 'trans_arena_agua');
    // Tienda del Mercader Viajero, Cráneos Gigantes, Rocas de Arenisca y Arbustos Secos del Desierto
    base.props.push(
      { kind: 'tienda_mercader', x: 930, y: 1042 },
      { kind: 'craneo_desierto', x: 610, y: 345 },
      { kind: 'craneo_desierto', x: 990, y: 345 },
      { kind: 'rocas_desierto', x: 260, y: 360 },
      { kind: 'rocas_desierto', x: 1340, y: 780 },
      { kind: 'arbusto_seco', x: 630, y: 865 },
      { kind: 'arbusto_seco', x: 1020, y: 500 },
      { kind: 'arbusto_seco', x: 420, y: 920 },
      { kind: 'costillar_dragon', x: 350, y: 690 }
    );
    base.solids.push(
      { x: 868, y: 985, w: 124, h: 52 },
      { x: 576, y: 320, w: 68, h: 36 },
      { x: 956, y: 320, w: 68, h: 36 }
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
    addTerrainZone('lava', 1190, 240, 168, 108, 'trans_nieve_lava');
    addTerrainZone('corrupt_water', 200, 240, 168, 108, 'trans_nieve_corrupto');
    // Rocas nevadas grandes, pinos congelados y tótems monolito de hielo rúnico
    base.props.push(
      { kind: 'roca_nevada', x: 610, y: 335 },
      { kind: 'roca_nevada', x: 990, y: 335 },
      { kind: 'pino_congelado', x: 430, y: 370 },
      { kind: 'pino_congelado', x: 1170, y: 370 },
      { kind: 'totem_hielo', x: 540, y: 265 },
      { kind: 'totem_hielo', x: 1060, y: 265 }
    );
    base.solids.push(
      { x: 582, y: 312, w: 56, h: 34 },
      { x: 962, y: 312, w: 56, h: 34 },
      { x: 408, y: 348, w: 44, h: 32 },
      { x: 1148, y: 348, w: 44, h: 32 }
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
      { kind: 'pilar_trono_vacio', x: 685, y: 420 },
      { kind: 'pilar_trono_vacio', x: 915, y: 420 },
      { kind: 'pilar_trono_vacio', x: 685, y: 740 },
      { kind: 'pilar_trono_vacio', x: 915, y: 740 },
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
    addTerrainZone('lava', 210, 430, 176, 112, 'trans_lava_corrupto');
    addTerrainZone('corrupt_water', 1210, 430, 176, 112, 'trans_lava_corrupto');
    // Trono Oscuro de Vaelor al norte de la alfombra imperial (Paquete 3)
    base.props.push({ kind: 'trono_vaelor', x: 800, y: 205 });
    base.solids.push({ x: 748, y: 145, w: 104, h: 64 });
  }

  // Portal Mágico Vigilado en el Mapa de Hielo que conecta Villa Alba (Guardia del Alba) con Bastión de Hierro (Clanes de Hierro)
  if (mapId === 'aldea' || mapId === 'aldea_hierro') {
    const isAlbaMap = mapId === 'aldea';
    base.portals.push({
      id: 'portal_hielo_frontera',
      x: 250,
      y: 560,
      targetMap: 'montanas',
      targetX: isAlbaMap ? 680 : 920,
      targetY: 900,
      label: isAlbaMap ? 'Portal de Hielo → Invadir Bastión de Hierro' : 'Portal de Hielo → Invadir Villa Alba',
      color: isAlbaMap ? '#38BDF8' : '#EF4444',
      reqLevel: 1,
      isGuardedIcePortal: true
    });
    base.gems.push(
      { id: 'res_wood_1', itemId: 'madera_roble', x: 260, y: 390, collected: false, respawnTimer: 0 },
      { id: 'res_ore_1', itemId: 'mineral_hierro', x: 1295, y: 460, collected: false, respawnTimer: 0 },
      { id: 'res_stone_1', itemId: 'piedra_runica', x: 1295, y: 580, collected: false, respawnTimer: 0 }
    );
  } else if (mapId === 'montanas') {
    // Dos portales en la frontera del Mapa de Hielo: Occidente (Villa Alba) y Oriente (Bastión de Hierro)
    base.portals.push(
      {
        id: 'portal_cruce_alba',
        x: 680,
        y: 830,
        targetMap: 'aldea',
        targetX: 250,
        targetY: 615,
        label: 'Portal Vigilado → Villa Alba (Guardia del Alba)',
        color: '#38BDF8',
        reqLevel: 1,
        guardFaction: 'alba',
        isGuardedIcePortal: true
      },
      {
        id: 'portal_cruce_hierro',
        x: 920,
        y: 830,
        targetMap: 'aldea_hierro',
        targetX: 250,
        targetY: 615,
        label: 'Portal Vigilado → Bastión de Hierro (Clanes de Hierro)',
        color: '#EF4444',
        reqLevel: 1,
        guardFaction: 'hierro',
        isGuardedIcePortal: true
      }
    );
    // Guardias permanentes de ambos bandos custodiando su respectivo Portal en el Mapa de Hielo
    base.npcs.push(
      {
        id: 'guard_portal_1',
        kind: 'guardia_alba',
        name: 'Centinela del Portal (Alba)',
        faction: 'alba',
        isPortalGuard: true,
        x: 640,
        y: 845,
        homeX: 640,
        homeY: 845,
        hp: 420,
        maxHp: 420,
        atk: 36,
        def: 18,
        speed: 132,
        radius: 18,
        emotion: 'neutral',
        hostile: false
      },
      {
        id: 'guard_portal_2',
        kind: 'guardia_hierro',
        name: 'Centinela del Portal (Hierro)',
        faction: 'hierro',
        isPortalGuard: true,
        x: 960,
        y: 845,
        homeX: 960,
        homeY: 845,
        hp: 420,
        maxHp: 420,
        atk: 36,
        def: 18,
        speed: 132,
        radius: 18,
        emotion: 'neutral',
        hostile: false
      }
    );
    base.gems.push(
      { id: 'ice_wood_1', itemId: 'madera_roble', x: 310, y: 900, collected: false, respawnTimer: 0 },
      { id: 'ice_ore_1', itemId: 'mineral_hierro', x: 1240, y: 900, collected: false, respawnTimer: 0 }
    );
  } else if (mapId === 'bosque') {
    base.gems.push(
      { id: 'for_wood_1', itemId: 'madera_roble', x: 480, y: 820, collected: false, respawnTimer: 0 },
      { id: 'for_wood_2', itemId: 'madera_roble', x: 1120, y: 780, collected: false, respawnTimer: 0 },
      { id: 'for_stone_1', itemId: 'piedra_runica', x: 650, y: 420, collected: false, respawnTimer: 0 }
    );
  } else if (mapId === 'desierto' || mapId === 'cueva') {
    base.gems.push(
      { id: `${mapId}_ore_1`, itemId: 'mineral_hierro', x: 490, y: 720, collected: false, respawnTimer: 0 },
      { id: `${mapId}_stone_1`, itemId: 'piedra_runica', x: 1110, y: 720, collected: false, respawnTimer: 0 }
    );
  }

  // Instanciar a los 4 Personajes Principales con IA Mixta en sus territorios separados
  const aiPositionsByMap = {
    aldea: {
      paladina_alba: { x: 640, y: 590 },
      explorador_alba: { x: 560, y: 740 }
    },
    aldea_hierro: {
      guerrero_hierro: { x: 980, y: 610 },
      chamana_hierro: { x: 960, y: 750 }
    },
    bosque: {
      explorador_alba: { x: 740, y: 960 },
      paladina_alba: { x: 850, y: 980 }
    },
    desierto: {
      guerrero_hierro: { x: 760, y: 1030 },
      chamana_hierro: { x: 840, y: 1045 }
    },
    montanas: {
      paladina_alba: { x: 650, y: 950 },
      explorador_alba: { x: 590, y: 1020 },
      guerrero_hierro: { x: 950, y: 950 },
      chamana_hierro: { x: 1010, y: 1020 }
    }
  };

  const mapAiCoords = aiPositionsByMap[mapId] || {};
  const nowMs = Date.now();
  for (const [aiId, def] of Object.entries(AI_CHARACTERS_DEFS)) {
    const mem = getCharacterMemory(aiId);
    const isCompanion = (mem.companionUntil || 0) > nowMs;
    const pos = mapAiCoords[aiId] || (isCompanion ? { x: 780, y: 740 } : null);
    if (!pos) continue;

    base.npcs.push({
      id: aiId,
      aiId,
      isAiHero: true,
      kind: def.spriteKind,
      heroAssetKey: def.heroAssetKey,
      name: `${def.name} (${def.title})`,
      shortName: def.name,
      title: def.title,
      faction: def.faction,
      profession: def.profession,
      x: pos.x,
      y: pos.y,
      homeX: pos.x,
      homeY: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      vx: 0,
      vy: 0,
      hp: def.maxHp,
      maxHp: def.maxHp,
      atk: def.atk,
      def: def.def,
      speed: def.speed,
      radius: 18,
      goal: mem.goal || def.preferredGoals[0],
      emotion: isCompanion ? 'siguiendo' : (mem.emotion || 'neutral'),
      hostile: Boolean(mem.hostile),
      isCompanion,
      fleeing: false,
      actionTimer: 0,
      attackCd: 0,
      goalTimer: 12 + Math.random() * 10,
      workAnimTimer: 0,
      hitFlash: 0,
      marker: '★'
    });
  }

  // Bandera de control territorial disputado en cada mapa
  const defaultTerritoryOwner = mapId === 'aldea_hierro' || mapId === 'desierto' ? 'hierro' : mapId === 'aldea' || mapId === 'bosque' ? 'alba' : (faction === 'hierro' ? 'hierro' : 'alba');
  const owner = getAiState().territoryOwner?.[mapId] || defaultTerritoryOwner;
  base.territoryFaction = owner;

  return base;
}

export function drawMapGround(ctx, map, faction, time) {
  const W = map.width;
  const H = map.height;

  // Helper para dibujar bordillos de piedra y mechones orgánicos de césped en los bordes de caminos/plazas
  const drawStoneCurbRect = (rx, ry, rw, rh, isAlbaStyle = true) => {
    const curbBase = isAlbaStyle ? '#475569' : '#451A03';
    const curbStone = isAlbaStyle ? '#94A3B8' : '#78350F';
    const curbHi = isAlbaStyle ? '#CBD5E1' : '#9A5B3A';
    // Sombra exterior del bordillo sobre el césped
    ctx.fillStyle = 'rgba(10, 13, 18, 0.35)';
    ctx.fillRect(rx - 8, ry - 8, rw + 16, rh + 16);

    // Bloques de bordillo superior e inferior
    for (let x = rx - 6; x < rx + rw + 6; x += 24) {
      const bw = Math.min(22, rx + rw + 6 - x);
      ctx.fillStyle = curbBase;
      ctx.fillRect(x, ry - 6, bw, 8);
      ctx.fillRect(x, ry + rh - 2, bw, 8);
      ctx.fillStyle = curbStone;
      ctx.fillRect(x + 1, ry - 5, bw - 2, 5);
      ctx.fillRect(x + 1, ry + rh - 1, bw - 2, 5);
      ctx.fillStyle = curbHi;
      ctx.fillRect(x + 1, ry - 5, bw - 2, 2);
      ctx.fillRect(x + 1, ry + rh - 1, bw - 2, 2);
    }
    // Bloques de bordillo izquierdo y derecho
    for (let y = ry + 4; y < ry + rh - 6; y += 24) {
      const bh = Math.min(22, ry + rh - 4 - y);
      ctx.fillStyle = curbBase;
      ctx.fillRect(rx - 6, y, 8, bh);
      ctx.fillRect(rx + rw - 2, y, 8, bh);
      ctx.fillStyle = curbStone;
      ctx.fillRect(rx - 5, y + 1, 5, bh - 2);
      ctx.fillRect(rx + rw - 1, y + 1, 5, bh - 2);
      ctx.fillStyle = curbHi;
      ctx.fillRect(rx - 5, y + 1, 2, bh - 2);
    }
    // Mechones orgánicos de pasto invadiendo suavemente las orillas (si es Villa Alba)
    if (isAlbaStyle) {
      ctx.fillStyle = '#22C55E';
      for (let x = rx + 12; x < rx + rw - 12; x += 48) {
        ctx.fillRect(x, ry - 3, 6, 4);
        ctx.fillRect(x + 20, ry + rh - 1, 6, 4);
      }
      for (let y = ry + 18; y < ry + rh - 18; y += 52) {
        ctx.fillRect(rx - 3, y, 4, 6);
        ctx.fillRect(rx + rw - 1, y + 16, 4, 6);
      }
    }
  };

  // Helper para cercas de madera con postes, travesaños y sombra 16-bit
  const drawWoodenFenceRect = (fx, fy, fw, fh) => {
    ctx.fillStyle = 'rgba(10, 13, 18, 0.32)';
    ctx.fillRect(fx - 2, fy + 4, fw + 4, 6);
    ctx.fillRect(fx - 2, fy + fh + 2, fw + 4, 6);

    // Travesaños horizontales dobles
    ctx.fillStyle = '#451A03';
    ctx.fillRect(fx, fy - 4, fw, 4);
    ctx.fillRect(fx, fy + 2, fw, 3);
    ctx.fillRect(fx, fy + fh - 4, fw, 4);
    ctx.fillRect(fx, fy + fh + 2, fw, 3);
    ctx.fillStyle = '#92400E';
    ctx.fillRect(fx, fy - 3, fw, 2);
    ctx.fillRect(fx, fy + fh - 3, fw, 2);

    // Travesaños laterales
    ctx.fillStyle = '#451A03';
    ctx.fillRect(fx - 2, fy, 4, fh);
    ctx.fillRect(fx + fw - 2, fy, 4, fh);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(fx - 1, fy, 2, fh);
    ctx.fillRect(fx + fw - 1, fy, 2, fh);

    // Postes verticales de madera cada 38px
    for (let px = fx; px <= fx + fw; px += 38) {
      ctx.fillStyle = '#0D0A14';
      ctx.fillRect(px - 4, fy - 10, 8, 16);
      ctx.fillRect(px - 4, fy + fh - 10, 8, 16);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(px - 3, fy - 9, 6, 14);
      ctx.fillRect(px - 3, fy + fh - 9, 6, 14);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(px - 3, fy - 9, 6, 3);
      ctx.fillRect(px - 3, fy + fh - 9, 6, 3);
    }
  };

  if (map.id === 'aldea' || map.id === 'aldea_hierro') {
    const isAlba = map.id === 'aldea';
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'grass_lush' : 'dirt_hierro') || (isAlba ? '#3B6E3A' : '#6B4226');
    ctx.fillRect(0, 0, W, H);

    // Plaza central con adoquín o tierra apisonada + bordillos de piedra tallada
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'cobble_alba' : 'dirt_road') || '#94A3B8';
    ctx.fillRect(340, 420, 920, 480);
    drawStoneCurbRect(340, 420, 920, 480, isAlba);

    // Camino norte al portal con bordillos
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'cobble_alba' : 'dirt_road') || '#CBD5E1';
    ctx.fillRect(735, 100, 130, 330);
    drawStoneCurbRect(735, 100, 130, 322, isAlba);
    // Empalme limpio entre camino norte y plaza
    ctx.fillStyle = getTexturePattern(ctx, isAlba ? 'cobble_alba' : 'dirt_road') || '#94A3B8';
    ctx.fillRect(738, 412, 124, 18);

    // Suelo de arena de combate y cerca de postes de madera en la Zona de Entrenamiento (Paquete 1)
    ctx.fillStyle = 'rgba(120, 83, 48, 0.38)';
    ctx.fillRect(1082, 742, 186, 111);
    if (!drawPropStructureSprite(ctx, 'cerca_h_larga', 1080, 722, 190, 32)) {
      drawWoodenFenceRect(1080, 740, 190, 115);
    } else {
      drawPropStructureSprite(ctx, 'cerca_h_larga', 1080, 836, 190, 32);
      drawPropStructureSprite(ctx, 'cerca_v', 1072, 738, 22, 115);
      drawPropStructureSprite(ctx, 'cerca_v', 1256, 738, 22, 115);
    }

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
    // Transición orgánica entre ambos biomas
    const trans = ctx.createLinearGradient(0, 480, 0, 660);
    trans.addColorStop(0, 'rgba(46, 43, 58, 0.88)');
    trans.addColorStop(1, 'rgba(52, 105, 54, 0)');
    ctx.fillStyle = trans;
    ctx.fillRect(0, 480, W, 180);

    // Camino de tierra texturizado con piedras en las orillas
    ctx.fillStyle = 'rgba(45, 28, 14, 0.45)';
    ctx.fillRect(737, 160, 126, 1080);
    ctx.fillStyle = getTexturePattern(ctx, 'dirt_road') || '#8C6D49';
    ctx.fillRect(745, 160, 110, 1080);
    for (let py = 180; py < 1220; py += 36) {
      ctx.fillStyle = '#57534E';
      ctx.fillRect(739, py, 6, 8);
      ctx.fillRect(855, py + 16, 6, 8);
    }

    // Río continuo con orillas de césped y tierra (seamless_tiles_sheet: rio_cesped)
    if (getAsset('seamless_tiles_sheet')) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(30, 774, 1540, 124);
      ctx.clip();
      const segW = 360;
      const period = segW * 2;
      const riverShift = Math.floor(time * 24) % period;
      let segIdx = 0;
      for (let rx = 30 - period; rx < 1570 + period; rx += segW) {
        drawSeamlessTileSprite(ctx, 'rio_cesped', rx + riverShift, 774, segW + 1, 124, segIdx % 2 === 1);
        segIdx++;
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(30, 780, 1540, 110);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(30, 784, 1540, 102);
      ctx.fillStyle = getTexturePattern(ctx, 'clear_water') || '#1E40AF';
      ctx.fillRect(30, 790, 1540, 90);
    }
    const rippleSheet = getAsset('fx_ondas_agua');
    if (rippleSheet) {
      for (let rx = 140; rx < 1500; rx += 220) {
        if (rx > 680 && rx < 920) continue;
        const rFrame = Math.floor(time * 6 + rx * 0.03) % 4;
        drawFootAnchoredSprite(ctx, rippleSheet, rx, 845, 24, { frameIndex: rFrame, alpha: 0.78 });
      }
    }

    // Puente de madera vertical nativo en perspectiva 3/4 (barandillas a izquierda/derecha y entradas norte/sur abiertas)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(728, 766, 150, 140);
    if (!drawWorldUpgradeSprite(ctx, 'puente_madera_v', 722, 758, 156, 152) && !drawPropStructureSprite(ctx, 'puente_madera', 722, 764, 156, 144, true)) {
      ctx.fillStyle = '#3B2314';
      ctx.fillRect(718, 783, 164, 104);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(722, 785, 156, 100);
      ctx.fillStyle = '#92400E';
      for (let by = 791; by < 880; by += 12) {
        ctx.fillRect(728, by, 144, 8);
        ctx.fillStyle = '#B45309';
        ctx.fillRect(728, by, 144, 2);
        ctx.fillStyle = '#92400E';
      }
      ctx.fillStyle = '#3B2314';
      ctx.fillRect(718, 783, 8, 104);
      ctx.fillRect(874, 783, 8, 104);
      for (let py = 785; py <= 875; py += 28) {
        ctx.fillStyle = '#F2B63D';
        ctx.fillRect(719, py, 6, 6);
        ctx.fillRect(875, py, 6, 6);
      }
    }

    // Grietas moradas luminosas del Vacío al norte (Paquete 1) y pared de montaña
    if (!drawPropStructureSprite(ctx, 'grieta_vacio', 530, 308, 130, 32)) {
      const voidGlow = 0.55 + Math.sin(time * 4) * 0.25;
      ctx.fillStyle = `rgba(147, 51, 234, ${voidGlow * 0.45})`;
      ctx.fillRect(534, 316, 122, 16);
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(540, 320, 110, 6);
    }
    drawPropStructureSprite(ctx, 'grieta_vacio', 970, 268, 136, 32);

    ctx.fillStyle = getTexturePattern(ctx, 'cave_stone') || '#334155';
    ctx.fillRect(30, 30, 670, 160);
    ctx.fillRect(900, 30, 670, 160);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(30, 182, 670, 8);
    ctx.fillRect(900, 182, 670, 8);
  } else if (map.id === 'cueva') {
    ctx.fillStyle = getTexturePattern(ctx, 'cave_stone') || '#1B1628';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#090512';
    ctx.fillRect(30, 665, 1540, 160);
    // Bordes de abismo rocosos (Paquete 2)
    for (let ax = 30; ax < 720; ax += 138) drawPropStructureSprite(ctx, 'borde_abismo', ax, 648, 140, 56);
    for (let ax = 875; ax < 1560; ax += 138) drawPropStructureSprite(ctx, 'borde_abismo', ax, 648, 140, 56);
    ctx.fillStyle = `rgba(147, 51, 234, ${0.3 + Math.sin(time * 3) * 0.12})`;
    ctx.fillRect(30, 730, 1540, 28);
    // Arena circular de runas del Vacío bajo el Jefe Malakor
    drawWorldUpgradeSprite(ctx, 'arena_malakor', 660, 178, 280, 168);
    // Puente de piedra oscura / obsidiana vertical nativo sobre el abismo
    if (!drawWorldUpgradeSprite(ctx, 'puente_obsidiana_v', 716, 646, 168, 198) && !drawPropStructureSprite(ctx, 'puente_obsidiana', 716, 646, 168, 198, true)) {
      ctx.fillStyle = getTexturePattern(ctx, 'cobble_alba') || '#475569';
      ctx.fillRect(725, 660, 150, 170);
      drawStoneCurbRect(725, 660, 150, 170, true);
    }
    // Rieles de madera y acero bajo las vagonetas de la Cueva
    if (!drawWorldUpgradeSprite(ctx, 'riel_mina', 405, 1002, 235, 36)) {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;
      ctx.strokeRect(430, 990, 220, 14);
    }
    drawWorldUpgradeSprite(ctx, 'riel_mina', 1020, 962, 235, 36);
  } else if (map.id === 'desierto') {
    ctx.fillStyle = getTexturePattern(ctx, 'ash_sand') || '#44403C';
    ctx.fillRect(0, 0, W, H);
    // Cráter volcánico circular de la arena del Jefe Ignis
    drawWorldUpgradeSprite(ctx, 'arena_ignis', 655, 172, 290, 174);
    // Grietas incandescentes de lava (Paquete 1)
    if (!drawPropStructureSprite(ctx, 'grieta_lava', 340, 830, 180, 32)) {
      const lavaPulse = 0.65 + Math.sin(time * 4) * 0.25;
      ctx.fillStyle = `rgba(234, 88, 12, ${lavaPulse})`;
      ctx.fillRect(340, 840, 180, 12);
    }
    drawPropStructureSprite(ctx, 'grieta_lava', 1090, 780, 210, 32);
    drawPropStructureSprite(ctx, 'grieta_lava', 520, 400, 130, 28);
  } else if (map.id === 'montanas') {
    ctx.fillStyle = getTexturePattern(ctx, 'snow_ground') || '#CBD5E1';
    ctx.fillRect(0, 0, W, H);
    // Círculo rúnico congelado de la arena del Jefe Boreas
    drawWorldUpgradeSprite(ctx, 'arena_boreas', 660, 170, 280, 168);
    // Lago congelado con grietas y patrón continuo sin costuras (seamless_tiles_sheet)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(280, 420, 1040, 310, 26);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = getTexturePattern(ctx, 'ice_lake') || '#7DD3FC';
    ctx.fillRect(280, 420, 1040, 310);
    ctx.restore();
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else if (map.id === 'fortaleza') {
    ctx.fillStyle = getTexturePattern(ctx, 'obsidian_floor') || '#120D1D';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#06030C';
    ctx.fillRect(30, 895, 650, 375);
    ctx.fillRect(920, 895, 650, 375);
    for (let ax = 30; ax < 670; ax += 138) drawPropStructureSprite(ctx, 'borde_abismo', ax, 882, 140, 56);
    for (let ax = 920; ax < 1560; ax += 138) drawPropStructureSprite(ctx, 'borde_abismo', ax, 882, 140, 56);
    // Puente de obsidiana vertical nativo a la entrada de la Fortaleza
    ctx.fillStyle = getTexturePattern(ctx, 'obsidian_floor') || '#27203A';
    ctx.fillRect(680, 890, 240, 370);
    if (!drawWorldUpgradeSprite(ctx, 'puente_obsidiana_v', 676, 890, 248, 190)) {
      drawPropStructureSprite(ctx, 'puente_obsidiana', 676, 890, 248, 190, true);
    }
    if (!drawWorldUpgradeSprite(ctx, 'puente_obsidiana_v', 676, 1075, 248, 190)) {
      drawPropStructureSprite(ctx, 'puente_obsidiana', 676, 1075, 248, 190, true);
    }
    // Alfombra imperial púrpura y dorada continua hacia el Trono de Vaelor (seamless_tiles_sheet)
    ctx.fillStyle = '#3B0764';
    ctx.fillRect(746, 275, 108, 960);
    if (getAsset('seamless_tiles_sheet')) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(742, 275, 116, 960);
      ctx.clip();
      for (let cy = 275; cy < 1235; cy += 180) {
        drawSeamlessTileSprite(ctx, 'alfombra_continua', 742, cy, 116, 180);
      }
      ctx.restore();
      // Remate dorado superior e inferior del pasillo real
      ctx.fillStyle = '#D9A441';
      ctx.fillRect(744, 275, 112, 4);
      ctx.fillRect(744, 1231, 112, 4);
    } else {
      for (let cy = 275; cy < 1180; cy += 120) {
        drawPropStructureSprite(ctx, 'tile_alfombra_real', 744, cy, 112, 124);
      }
    }
    // Sello imperial octogonal de la arena del Jefe Vaelor frente al Trono
    drawWorldUpgradeSprite(ctx, 'arena_vaelor', 665, 195, 270, 162);
    drawPropStructureSprite(ctx, 'grieta_vacio', 420, 448, 140, 32);
    drawPropStructureSprite(ctx, 'grieta_vacio', 1040, 448, 140, 32);
  }

  // Muros perimetrales / acantilados de 8 piezas (Norte, Sur, Oeste, Este + 4 Esquinas) por bioma (9-Slice)
  const borderBiomeKey =
    map.id === 'montanas'
      ? 'nieve'
      : map.id === 'desierto'
      ? 'desierto'
      : map.id === 'cueva' || map.id === 'fortaleza'
      ? 'cueva'
      : 'bosque';
  if (!drawBiomePerimeterFrame(ctx, borderBiomeKey, W, H)) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, W, 30);
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillRect(0, 0, 30, H);
    ctx.fillRect(W - 30, 0, 30, H);
  }

  // Zonas de Terreno (Estanques orgánicos naturales para Lava y Agua Corrupta, y orilla redondeada para Agua Clara)
  for (const tz of map.terrainZones || []) {
    const pulse = 0.14 + Math.sin(time * 4.5 + tz.x * 0.02) * 0.07;
    if (tz.kind === 'lava' && drawWorldUpgradeSprite(ctx, 'lago_lava_organico', tz.x - 14, tz.y - 12, tz.w + 28, tz.h + 24)) {
      ctx.save();
      ctx.fillStyle = `rgba(251, 146, 60, ${(pulse * 0.85).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(tz.x + tz.w / 2, tz.y + tz.h / 2, tz.w * 0.42, tz.h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (tz.kind === 'corrupt_water' && drawWorldUpgradeSprite(ctx, 'lago_corrupto_organico', tz.x - 14, tz.y - 12, tz.w + 28, tz.h + 24)) {
      ctx.save();
      ctx.fillStyle = `rgba(168, 85, 247, ${(pulse * 0.85).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(tz.x + tz.w / 2, tz.y + tz.h / 2, tz.w * 0.42, tz.h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (tz.kind === 'shallow_water' && drawWorldUpgradeSprite(ctx, 'oasis_desierto', tz.x - 16, tz.y - 30, tz.w + 32, tz.h + 42)) {
      continue;
    }

    const patName =
      tz.kind === 'lava'
        ? 'lava_pool'
        : tz.kind === 'corrupt_water'
        ? 'corrupt_lake'
        : 'clear_water';
    const fallbackCol =
      tz.kind === 'lava'
        ? '#EA580C'
        : tz.kind === 'corrupt_water'
        ? '#4C1D95'
        : '#0284C7';
    const rimCol =
      tz.kind === 'lava'
        ? '#7C2D12'
        : tz.kind === 'corrupt_water'
        ? '#3B0764'
        : '#0369A1';
    const glowCol =
      tz.kind === 'lava'
        ? 'rgba(234, 88, 12, 0.28)'
        : tz.kind === 'corrupt_water'
        ? 'rgba(147, 51, 234, 0.26)'
        : 'rgba(56, 189, 248, 0.22)';

    ctx.save();
    ctx.fillStyle = glowCol;
    ctx.beginPath();
    ctx.roundRect(tz.x - 6, tz.y - 6, tz.w + 12, tz.h + 12, 26);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(tz.x, tz.y, tz.w, tz.h, 20);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = getTexturePattern(ctx, patName) || fallbackCol;
    ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
    ctx.fillStyle = `rgba(186, 230, 253, ${(pulse * 0.65).toFixed(2)})`;
    ctx.fillRect(tz.x, tz.y, tz.w, tz.h);
    ctx.restore();

    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  // Animaciones de agua/río/cascada en bucle + escaleras + detalles de suelo sin colisión (Recurso 2 y 4)
  for (const al of map.animatedLoops || []) {
    if (al.kind === 'anim_river_horiz' || al.kind === 'anim_water_wave') {
      const shift = Math.floor(time * 26) % 24;
      drawMapSheetSprite(ctx, al.kind, al.x - shift * 0.5, al.y, al.w + 12, al.h, time);
    } else {
      drawMapSheetSprite(ctx, al.kind, al.x, al.y, al.w, al.h, time);
    }
  }
  for (const st of map.stairs || []) {
    drawMapSheetSprite(ctx, st.kind, st.x, st.y, st.w, st.h, time);
  }
  for (const gd of map.groundDetails || []) {
    drawMapSheetSprite(ctx, gd.kind, gd.x - gd.w * 0.5, gd.y - gd.h * 0.5, gd.w, gd.h, time);
  }
}

// Simulación física independiente en coordenadas del mundo (1600x1300) para el clima (no se arrastra con la cámara del jugador)
const weatherWorldState = {
  mapId: null,
  lastTime: 0,
  particles: []
};

function ensureWeatherParticles(map, time) {
  if (weatherWorldState.mapId === map.id && weatherWorldState.particles.length > 0) return;
  weatherWorldState.mapId = map.id;
  weatherWorldState.lastTime = time;
  weatherWorldState.particles = [];
  const count =
    map.weather === 'snow'
      ? 95
      : map.weather === 'ash'
      ? 75
      : map.weather === 'void_storm'
      ? 65
      : map.weather === 'butterflies'
      ? 26
      : 0;
  for (let i = 0; i < count; i++) {
    weatherWorldState.particles.push(spawnWeatherParticle(map.weather, true, i));
  }
}

function spawnWeatherParticle(kind, randomY = false, seed = 0) {
  const wx = Math.random() * MAP_WIDTH;
  const wy = randomY ? Math.random() * MAP_HEIGHT : kind === 'void_storm' ? MAP_HEIGHT + 20 : -20;
  if (kind === 'snow') {
    return {
      wx,
      wy,
      vx: -14 + Math.random() * 28,
      vy: 58 + Math.random() * 44,
      swayFreq: 1.6 + Math.random() * 1.8,
      swayAmp: 18 + Math.random() * 22,
      phase: Math.random() * Math.PI * 2,
      size: 13 + Math.random() * 6,
      seed
    };
  }
  if (kind === 'ash') {
    return {
      wx,
      wy,
      vx: 22 + Math.random() * 26,
      vy: 38 + Math.random() * 34,
      swayFreq: 2.0 + Math.random() * 2.0,
      swayAmp: 15 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
      size: 13 + Math.random() * 5,
      seed
    };
  }
  if (kind === 'void_storm') {
    return {
      wx,
      wy,
      vx: -10 + Math.random() * 20,
      vy: -(42 + Math.random() * 38),
      swayFreq: 2.4 + Math.random() * 2.2,
      swayAmp: 14 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      size: 16 + Math.random() * 6,
      seed
    };
  }
  // Mariposas del Bosque de la Fractura
  return {
    wx,
    wy: 560 + Math.random() * 680,
    vx: -24 + Math.random() * 48,
    vy: -14 + Math.random() * 28,
    swayFreq: 3.2 + Math.random() * 2.5,
    swayAmp: 22 + Math.random() * 18,
    phase: Math.random() * Math.PI * 2,
    size: 18 + Math.random() * 6,
    seed
  };
}

export function drawWeatherOverlay(ctx, map, vw, vh, time, camX = 0, camY = 0) {
  if (!map.weather) return;
  ensureWeatherParticles(map, time);
  const dt = Math.max(0.001, Math.min(0.05, time - weatherWorldState.lastTime));
  weatherWorldState.lastTime = time;

  if (map.weather === 'butterflies') {
    // Rayos de luz volumétrica (god-rays) anclados en claros reales del Bosque (no pegados a la cámara)
    const sunbeamSheet = getAsset('fx_rayos_luz');
    if (sunbeamSheet) {
      const sbFrame = Math.floor(time * 5) % 4;
      const m = getSpriteFrameMetrics(sunbeamSheet, sbFrame);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.38;
      constSpots: for (const [wx, wy, sz] of [
        [360, 580, 240],
        [1080, 620, 260],
        [480, 960, 240],
        [1140, 980, 250]
      ]) {
        const sx = Math.round(wx - camX);
        const sy = Math.round(wy - camY);
        if (sx + sz < 0 || sx > vw || sy + sz < 0 || sy > vh) continue constSpots;
        ctx.drawImage(sunbeamSheet, m.sx, m.sy, m.frameWidth, m.frameHeight, sx, sy, sz, sz);
      }
      ctx.restore();
    }
  }

  const sheetKey =
    map.weather === 'butterflies'
      ? 'fx_clima_mariposas'
      : map.weather === 'ash'
      ? 'fx_clima_ceniza'
      : map.weather === 'snow'
      ? 'fx_clima_nieve'
      : 'fx_clima_vacio';
  const sheet = getAsset(sheetKey);

  for (const p of weatherWorldState.particles) {
    // Actualizar física real en el mundo (gravedad + viento turbulento)
    const wind = Math.sin(time * p.swayFreq + p.phase) * p.swayAmp;
    p.wx += (p.vx + wind) * dt;
    p.wy += p.vy * dt;

    if (map.weather === 'butterflies') {
      p.wy += Math.cos(time * 3.5 + p.phase) * 18 * dt;
      if (p.wx < 40) { p.wx = 40; p.vx = Math.abs(p.vx); }
      if (p.wx > MAP_WIDTH - 40) { p.wx = MAP_WIDTH - 40; p.vx = -Math.abs(p.vx); }
      if (p.wy < 540) { p.wy = 540; p.vy = Math.abs(p.vy); }
      if (p.wy > MAP_HEIGHT - 40) { p.wy = MAP_HEIGHT - 40; p.vy = -Math.abs(p.vy); }
    } else if (map.weather === 'void_storm') {
      if (p.wy < -24) {
        p.wy = MAP_HEIGHT + 16;
        p.wx = Math.random() * MAP_WIDTH;
      }
      if (p.wx < 0) p.wx += MAP_WIDTH;
      if (p.wx > MAP_WIDTH) p.wx -= MAP_WIDTH;
    } else {
      // Nieve o ceniza cayendo con gravedad real hacia el suelo del mundo
      if (p.wy > MAP_HEIGHT + 24) {
        p.wy = -16;
        p.wx = Math.random() * MAP_WIDTH;
      }
      if (p.wx < 0) p.wx += MAP_WIDTH;
      if (p.wx > MAP_WIDTH) p.wx -= MAP_WIDTH;
    }

    // Convertir de coordenada del mundo a coordenada de cámara visible
    const sx = p.wx - camX;
    const sy = p.wy - camY;
    if (sx < -32 || sx > vw + 32 || sy < -32 || sy > vh + 32) continue;

    if (sheet) {
      const fIdx = Math.floor(time * 9 + p.seed) % 4;
      drawFootAnchoredSprite(ctx, sheet, sx, sy + 8, p.size, {
        frameIndex: fIdx,
        alpha: map.weather === 'snow' ? 0.88 : 0.82
      });
    } else {
      ctx.fillStyle =
        map.weather === 'snow'
          ? 'rgba(255, 255, 255, 0.8)'
          : map.weather === 'ash'
          ? 'rgba(251, 146, 60, 0.55)'
          : map.weather === 'void_storm'
          ? 'rgba(192, 132, 252, 0.55)'
          : '#FEF08A';
      ctx.fillRect(Math.round(sx), Math.round(sy), 4, 4);
    }
  }

  if (map.weather === 'void_storm' && Math.sin(time * 1.7) > 0.985) {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.14)';
    ctx.fillRect(0, 0, vw, vh);
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
    map.id === 'aldea' ? '#244C26' :
    map.id === 'aldea_hierro' ? '#451A03' :
    map.id === 'bosque' ? '#1E3E29' :
    map.id === 'cueva' ? '#1A1326' :
    map.id === 'desierto' ? '#44403C' :
    map.id === 'montanas' ? '#94A3B8' : '#150E24';
  ctx.fillRect(0, 0, w, h);

  // Caminos y plaza en el minimapa táctico
  if (map.id === 'aldea' || map.id === 'aldea_hierro') {
    ctx.fillStyle = map.id === 'aldea_hierro' ? '#78350F' : '#64748B';
    ctx.fillRect(340 * sx, 420 * sy, 920 * sx, 480 * sy);
    ctx.fillRect(735 * sx, 100 * sy, 130 * sx, 330 * sy);
  } else if (map.id === 'bosque') {
    ctx.fillStyle = '#312E3F';
    ctx.fillRect(0, 0, w, 540 * sy);
    ctx.fillStyle = '#8C6D49';
    ctx.fillRect(745 * sx, 160 * sy, 110 * sx, 1080 * sy);
  } else if (map.id === 'fortaleza') {
    ctx.fillStyle = '#4C1D95';
    ctx.fillRect(746 * sx, 275 * sy, 108 * sx, 960 * sy);
  }

  // Agua / hielo / sólidos / puentes / edificios
  ctx.fillStyle = '#1D4ED8';
  for (const r of map.waterRects) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  ctx.fillStyle = '#7DD3FC';
  for (const r of map.iceZones) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  for (const r of map.solids) ctx.fillRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  ctx.fillStyle = '#B45309';
  for (const b of map.bridges) ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
  for (const b of map.buildings) {
    ctx.fillStyle = b.roofColor || '#3B82F6';
    ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
    ctx.strokeStyle = '#F2B63D';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
  }

  // Fogatas (naranja cálido)
  ctx.fillStyle = '#F97316';
  for (const f of map.campfires || []) {
    ctx.fillRect(f.x * sx - 2, f.y * sy - 2, 4, 4);
  }

  // Portales (azul celeste)
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
    ctx.fillRect(e.x * sx - (e.isBoss ? 3.2 : 1.8), e.y * sy - (e.isBoss ? 3.2 : 1.8), e.isBoss ? 6.4 : 3.6, e.isBoss ? 6.4 : 3.6);
  }

  // Jugador (blanco con borde dorado)
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(player.x * sx, player.y * sy, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Marco interior táctico + indicador Norte "N"
  ctx.strokeStyle = 'rgba(242, 182, 61, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}
