/**
 * Motor 2D HTML5 Canvas — Crónicas de la Fractura (6 Mapas de Valoria)
 * Colisiones reales, cámara sin bordes negros, hielo resbaladizo, luz en cueva,
 * 4 jefes (Malakor, Ignis, Boreas, Vaelor), portales por nivel, minimapa y viaje rápido.
 */

import {
  MAX_LEVEL,
  CLASSES,
  ITEMS,
  PETS,
  QUESTS,
  ACHIEVEMENTS,
  MAPS_META,
  BOSS_META,
  TITLES,
  TALENTS,
  xpNeededForLevel,
  petXpNeeded,
  computeWeaponAtkBonus,
  computeArmorBonuses,
  normalizeSave
} from './data.js';
import {
  buildMapInstance,
  spawnEnemy,
  drawMapGround,
  drawWeatherOverlay,
  drawMinimap
} from './world.js';
import {
  drawHero,
  drawPet,
  drawBossAltar,
  drawCampfire,
  drawPortal,
  drawChest,
  drawGemNode,
  drawGroundDrop,
  drawNpc,
  drawEnemy,
  drawCrystal,
  drawBuilding,
  drawTree,
  drawProp
} from './sprites.js';
import { sfx } from '../audio.js';

export class GameEngine {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.callbacks = callbacks;

    this.running = false;
    this.paused = false;
    this.rafId = null;
    this.lastTime = 0;
    this.elapsed = 0;

    this.keys = new Set();
    this.joyVec = { x: 0, y: 0 };

    this.map = null;
    this.projectiles = [];
    this.traps = [];
    this.groundDrops = [];
    this.hazards = []; // círculos de fuego (Ignis) / hielo (Boreas)
    this.effects = [];
    this.floatingTexts = [];
    this.dustParticles = [];
    this.dustSpawnTimer = 0;

    this.petEntity = { x: 760, y: 720, vx: 0, vy: 0, dirX: 1, moving: false, healTimer: 0 };
    this.campfireTick = 0;
    this.portalCooldown = 0;
    this.portalLockMsgCooldown = 0;

    this.camera = { x: 0, y: 0, shake: 0 };
    this.autoSaveTimer = 0;

    this.player = null;
    this.saveState = null;

    this._boundResize = () => this.resize();
    this._boundKeyDown = (e) => this.onKeyDown(e);
    this._boundKeyUp = (e) => this.onKeyUp(e);
  }

  loadFromSave(rawSave) {
    this.saveState = normalizeSave(structuredClone(rawSave));
    const s = this.saveState;
    const cls = CLASSES[s.heroClass] || CLASSES.guerrero;

    this.player = {
      name: s.name,
      faction: s.faction,
      gender: s.gender || 'male',
      race: s.race,
      heroClass: s.heroClass,
      level: s.level,
      xp: s.xp,
      currentMap: s.currentMap,
      visitedMaps: [...s.visitedMaps],
      defeatedBosses: [...s.defeatedBosses],
      unlockedTitles: [...s.unlockedTitles],
      activeTitle: s.activeTitle,
      vaelorVictoryShown: s.vaelorVictoryShown,
      x: s.x,
      y: s.y,
      vx: 0,
      vy: 0,
      radius: 15,
      dirX: 0,
      dirY: 1,
      moving: false,
      hp: s.hp || cls.hp,
      maxHp: cls.hp,
      mp: s.mp ?? cls.mp,
      maxMp: cls.mp,
      speed: cls.speed,
      gold: s.gold ?? 60,
      equipment: s.equipment,
      gearSlots: s.gearSlots,
      skillPoints: s.skillPoints,
      skillLevels: [...s.skillLevels],
      talentPoints: s.talentPoints,
      talentLevels: { ...s.talentLevels },
      ownedPets: s.ownedPets,
      activePet: s.activePet,
      petProgress: s.petProgress,
      openedChests: s.openedChests,
      unlockedAchievements: s.unlockedAchievements,
      backpack: s.backpack,
      quest: s.quest,
      stats: s.stats,
      cooldowns: [0, 0, 0, 0],
      attackAnimTimer: 0,
      shieldBuffTimer: 0,
      speedBuffTimer: 0,
      slowedTimer: 0,
      invulnTimer: 0,
      hitFlash: 0
    };

    this.recalcDerivedStats(false);
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.loadMap(this.player.currentMap, this.player.x, this.player.y, false);
  }

  loadMap(mapId, spawnX, spawnY, showBanner = true) {
    const p = this.player;
    const meta = MAPS_META[mapId] || MAPS_META.aldea;
    p.currentMap = meta.id;
    if (!p.visitedMaps.includes(meta.id)) {
      p.visitedMaps.push(meta.id);
    }

    this.map = buildMapInstance(meta.id, {
      faction: p.faction,
      defeatedBosses: p.defeatedBosses,
      openedChests: p.openedChests,
      crystalsCollected: p.quest.crystalsCollected || 0
    });

    p.x = spawnX ?? meta.spawnX;
    p.y = spawnY ?? meta.spawnY;
    p.vx = 0;
    p.vy = 0;
    this.petEntity.x = p.x - 36;
    this.petEntity.y = p.y + 8;

    this.projectiles = [];
    this.traps = [];
    this.groundDrops = [];
    this.hazards = [];
    this.effects = [];
    this.floatingTexts = [];
    this.portalCooldown = 1.0;

    this.updateNpcMarkers();
    sfx.setMusicZone(meta.id);

    if (showBanner) {
      this.callbacks.onZoneBanner?.(this.map.name, meta.levelRange);
    }
    this.callbacks.onAutoSave?.(this.exportSave());
  }

  fastTravelTo(mapId) {
    if (!this.player) return false;
    const meta = MAPS_META[mapId];
    if (!meta || !this.player.visitedMaps.includes(mapId)) return false;
    sfx.playTeleport();
    this.loadMap(mapId, meta.spawnX, meta.spawnY, true);
    this.callbacks.onToast?.(`Viaje rápido a ${this.map.name}.`, 'success');
    return true;
  }

  getComputedStats() {
    const p = this.player;
    const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
    const lvlOff = Math.max(0, p.level - 1);
    const armorB = computeArmorBonuses(p.equipment.armor);
    const weapAtk = computeWeaponAtkBonus(p.equipment.weapon);

    // Bonos de equipo exclusivo en las 12 ranuras
    let gearHp = 0, gearMp = 0, gearAtk = 0, gearDef = 0, gearCrit = 0;
    for (const itemId of Object.values(p.gearSlots || {})) {
      const it = ITEMS[itemId];
      if (!it || it.type !== 'equipment') continue;
      gearHp += it.hp || 0;
      gearMp += it.mp || 0;
      gearAtk += it.atk || 0;
      gearDef += it.def || 0;
      gearCrit += it.crit || 0;
    }

    // Bonos de Talentos
    const tl = p.talentLevels || {};
    const talAtk = (tl.fuerza_bruta || 0) * 4;
    const talSpd = (tl.impetu || 0) * 8;
    const talCrit = (tl.golpe_letal || 0) * 3;
    const talHp = (tl.determinacion || 0) * 25;
    const talDef = (tl.pared_hierro || 0) * 3;
    const talMp = (tl.mente_clara || 0) * 18;

    // Bonos de Mascota activa según nivel
    let petHp = 0, petAtk = 0, petDef = 0, petCrit = 0;
    if (p.activePet && PETS[p.activePet]) {
      const petDefObj = PETS[p.activePet];
      const petLvl = p.petProgress?.[p.activePet]?.level || 1;
      petHp = Math.round(petDefObj.hpBase + (petLvl - 1) * petDefObj.hpPerLvl);
      petAtk = Math.round(petDefObj.atkBase + (petLvl - 1) * petDefObj.atkPerLvl);
      petDef = Math.round(petDefObj.defBase + (petLvl - 1) * petDefObj.defPerLvl);
      petCrit = petDefObj.critBase || 0;
    }

    // Bonos permanentes de TODOS los títulos desbloqueados
    let hpPct = 1, atkPct = 1, defPct = 1;
    for (const tId of p.unlockedTitles || []) {
      const t = TITLES[tId];
      if (!t) continue;
      if (t.hpPct) hpPct += t.hpPct;
      if (t.atkPct) atkPct += t.atkPct;
      if (t.defPct) defPct += t.defPct;
      if (t.allPct) { hpPct += t.allPct; atkPct += t.allPct; defPct += t.allPct; }
    }

    const shieldDef = p.shieldBuffTimer > 0 ? 14 : 0;
    const maxHp = Math.round((cls.hp + lvlOff * cls.hpPerLvl + armorB.hp + gearHp + talHp + petHp) * hpPct);
    const maxMp = Math.round((cls.mp + lvlOff * cls.mpPerLvl + gearMp + talMp) * hpPct);
    const atk = Math.round((cls.atk + lvlOff * cls.atkPerLvl + weapAtk + gearAtk + talAtk + petAtk) * atkPct);
    const def = Math.round((cls.def + lvlOff * cls.defPerLvl + armorB.def + gearDef + talDef + petDef + shieldDef) * defPct);
    const crit = Math.min(75, (cls.crit || 5) + gearCrit + talCrit + petCrit);
    const speed = cls.speed + talSpd;

    return { maxHp, maxMp, atk, def, crit, speed };
  }

  recalcDerivedStats(healOnIncrease = false) {
    const p = this.player;
    const st = this.getComputedStats();
    const prevMax = p.maxHp || st.maxHp;
    p.maxHp = st.maxHp;
    p.maxMp = st.maxMp;
    p.speed = st.speed;
    if (healOnIncrease && p.maxHp > prevMax) {
      p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - prevMax));
    }
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp ?? p.maxMp, p.maxMp);
  }

  getTotalAtk() {
    return this.getComputedStats().atk;
  }

  getTotalDef() {
    return this.getComputedStats().def;
  }

  exportSave() {
    if (!this.player || !this.saveState) return null;
    const p = this.player;
    return {
      ...this.saveState,
      version: 4,
      gender: p.gender || 'male',
      level: p.level,
      xp: p.xp,
      currentMap: p.currentMap,
      visitedMaps: p.visitedMaps,
      defeatedBosses: p.defeatedBosses,
      unlockedTitles: p.unlockedTitles,
      activeTitle: p.activeTitle,
      vaelorVictoryShown: p.vaelorVictoryShown,
      x: Math.round(p.x),
      y: Math.round(p.y),
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      mp: Math.round(p.mp),
      maxMp: p.maxMp,
      gold: p.gold,
      equipment: p.equipment,
      gearSlots: { ...p.gearSlots, mascota: p.activePet },
      skillPoints: p.skillPoints,
      skillLevels: p.skillLevels,
      talentPoints: p.talentPoints,
      talentLevels: p.talentLevels,
      ownedPets: p.ownedPets,
      activePet: p.activePet,
      petProgress: p.petProgress,
      openedChests: p.openedChests,
      unlockedAchievements: p.unlockedAchievements,
      backpack: p.backpack,
      quest: p.quest,
      stats: p.stats
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.resize();
    window.addEventListener('resize', this._boundResize);
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
    sfx.stopMusic();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._boundResize);
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
    this.keys.clear();
    this.joyVec = { x: 0, y: 0 };
  }

  setPaused(val) {
    this.paused = Boolean(val);
    if (!this.paused) this.lastTime = performance.now();
  }

  setJoystick(dx, dy) {
    this.joyVec.x = dx;
    this.joyVec.y = dy;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  onKeyDown(e) {
    if (this.paused) return;
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();
    this.keys.add(code);

    if (code === 'Space' || code === 'KeyJ') this.triggerAbility(0);
    else if (code === 'Digit1' || code === 'KeyK') this.triggerAbility(1);
    else if (code === 'Digit2' || code === 'KeyL') this.triggerAbility(2);
    else if (code === 'Digit3' || code === 'KeyU') this.triggerAbility(3);
    else if (code === 'KeyE') this.interactNearest();
    else if (code === 'KeyQ') this.useBestHealPotion();
    else if (code === 'KeyI' || code === 'KeyB' || code === 'KeyC') this.callbacks.onOpenCharacter?.();
    else if (code === 'KeyM') this.callbacks.onOpenUpgrades?.();
    else if (code === 'KeyT') this.callbacks.onOpenShop?.();
    else if (code === 'KeyN') this.callbacks.onOpenWorldMap?.();
    else if (code === 'KeyJ') this.callbacks.onOpenBosses?.();
    else if (code === 'Escape') this.callbacks.onTogglePause?.();
  }

  onKeyUp(e) {
    this.keys.delete(e.code);
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.paused && this.player && this.map) {
      this.elapsed += dt;
      this.update(dt);
      this.render();
    }
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  isOnIce(x, y) {
    for (const z of this.map.iceZones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return true;
    }
    return false;
  }

  isInSafeArea(x, y) {
    if (this.map.safeZone) return true;
    for (const s of this.map.safeBoxes) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    }
    return false;
  }

  update(dt) {
    const p = this.player;

    for (let i = 0; i < 4; i++) {
      if (p.cooldowns[i] > 0) p.cooldowns[i] = Math.max(0, p.cooldowns[i] - dt);
    }
    if (p.shieldBuffTimer > 0) p.shieldBuffTimer = Math.max(0, p.shieldBuffTimer - dt);
    if (p.attackAnimTimer > 0) p.attackAnimTimer = Math.max(0, p.attackAnimTimer - dt * 3.1);
    if (this.petEntity.attackAnimTimer > 0) {
      this.petEntity.attackAnimTimer = Math.max(0, this.petEntity.attackAnimTimer - dt * 3.1);
    }
    if (p.speedBuffTimer > 0) p.speedBuffTimer = Math.max(0, p.speedBuffTimer - dt);
    if (p.slowedTimer > 0) p.slowedTimer = Math.max(0, p.slowedTimer - dt);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);

    // Retroceso corto (knockback) anclado al suelo al recibir daño
    if (p.kbVx || p.kbVy) {
      this.moveEntityWithCollisions(p, (p.kbVx || 0) * dt, (p.kbVy || 0) * dt);
      const decay = Math.pow(0.0008, dt);
      p.kbVx = (p.kbVx || 0) * decay;
      p.kbVy = (p.kbVy || 0) * decay;
      if (Math.hypot(p.kbVx, p.kbVy) < 6) {
        p.kbVx = 0;
        p.kbVy = 0;
      }
    }
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    if (this.portalLockMsgCooldown > 0) this.portalLockMsgCooldown = Math.max(0, this.portalLockMsgCooldown - dt);
    if (this.camera.shake > 0) this.camera.shake = Math.max(0, this.camera.shake - dt * 18);

    // Regeneración suave de PM (Energía)
    if (p.mp < p.maxMp) {
      p.mp = Math.min(p.maxMp, p.mp + (this.isInSafeArea(p.x, p.y) ? 14 : 5.5) * dt);
    }

    // Fogatas de descanso (recuperan toda la vida y PM gratis en pocos segundos)
    for (const fire of this.map.campfires) {
      if (Math.hypot(p.x - fire.x, p.y - fire.y) <= fire.radius && (p.hp < p.maxHp || p.mp < p.maxMp)) {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.36 * dt);
        p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.4 * dt);
        this.campfireTick += dt;
        if (this.campfireTick >= 0.65) {
          this.campfireTick = 0;
          this.addFloatingText(p.x, p.y - 24, '+Vida / PM', '#4ADE80');
        }
      }
    }

    // Movimiento con aceleración y desaceleración suaves + física resbaladiza en Lago Congelado
    let mx = this.joyVec.x;
    let my = this.joyVec.y;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;

    const len = Math.hypot(mx, my);
    const spd = p.speed * (p.speedBuffTimer > 0 ? 1.45 : 1) * (p.slowedTimer > 0 ? 0.55 : 1);
    const onIce = this.isOnIce(p.x, p.y);

    if (len > 0.1) {
      const nx = mx / len;
      const ny = my / len;
      p.dirX = nx;
      p.dirY = ny;
      const accelRate = onIce ? 3.8 : 16.0;
      p.vx += (nx * spd - p.vx) * Math.min(1, dt * accelRate);
      p.vy += (ny * spd - p.vy) * Math.min(1, dt * accelRate);
    } else {
      const decelFactor = onIce ? 0.25 : 0.0005;
      p.vx *= Math.pow(decelFactor, dt);
      p.vy *= Math.pow(decelFactor, dt);
      if (Math.hypot(p.vx, p.vy) < 6) {
        p.vx = 0;
        p.vy = 0;
      }
    }

    const curSpeed = Math.hypot(p.vx, p.vy);
    p.moving = curSpeed > 18;
    p.moveSpeedRatio = Math.min(1.4, curSpeed / Math.max(1, p.speed));

    if (curSpeed > 4) {
      this.moveEntityWithCollisions(p, p.vx * dt, p.vy * dt);
    }

    // Partículas de polvo en la base de los pies al caminar
    if (p.moving) {
      this.dustSpawnTimer -= dt;
      if (this.dustSpawnTimer <= 0) {
        this.dustSpawnTimer = 0.11;
        this.dustParticles.push({
          x: p.x - p.dirX * 6 + (Math.random() - 0.5) * 10,
          y: p.y + 15 + (Math.random() - 0.5) * 3,
          vx: -p.dirX * (12 + Math.random() * 14) + (Math.random() - 0.5) * 8,
          vy: -6 - Math.random() * 8,
          size: 3 + Math.floor(Math.random() * 2),
          life: 0.34,
          maxLife: 0.34
        });
      }
    }

    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const dp = this.dustParticles[i];
      dp.x += dp.vx * dt;
      dp.y += dp.vy * dt;
      dp.life -= dt;
      if (dp.life <= 0) this.dustParticles.splice(i, 1);
    }

    // Comprobar portales entre mapas
    if (this.portalCooldown <= 0) {
      for (const pt of this.map.portals) {
        if (Math.hypot(p.x - pt.x, p.y - pt.y) < 34) {
          if (pt.reqLevel && p.level < pt.reqLevel) {
            if (this.portalLockMsgCooldown <= 0) {
              this.portalLockMsgCooldown = 2.5;
              this.callbacks.onToast?.(`Necesitas Nivel ${pt.reqLevel} para entrar a ${pt.label}.`, 'error');
            }
          } else if (pt.reqBoss && !p.defeatedBosses.includes(pt.reqBoss)) {
            if (this.portalLockMsgCooldown <= 0) {
              this.portalLockMsgCooldown = 2.5;
              this.callbacks.onToast?.(`Debes derrotar al jefe de esta zona para abrir el portal a ${pt.label}.`, 'error');
            }
          } else {
            sfx.playPortal();
            this.loadMap(pt.targetMap, pt.targetX, pt.targetY, true);
            return;
          }
        }
      }
    }

    for (const npc of this.map.npcs) {
      if (npc.hitFlash > 0) npc.hitFlash = Math.max(0, npc.hitFlash - dt);
    }

    // Gemas recolectables del mapa
    for (const g of this.map.gems) {
      if (g.collected) {
        g.respawnTimer -= dt;
        if (g.respawnTimer <= 0) g.collected = false;
      } else if (Math.hypot(p.x - g.x, p.y - g.y) < 34) {
        this.collectMapGem(g);
      }
    }

    // Botín en el suelo
    for (let i = this.groundDrops.length - 1; i >= 0; i--) {
      const d = this.groundDrops[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.groundDrops.splice(i, 1);
        continue;
      }
      if (Math.hypot(p.x - d.x, p.y - d.y) < 34) this.collectGroundDrop(i);
    }

    this.updatePet(dt);
    this.updateHazards(dt);

    // Trampas de Arquero
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.traps.splice(i, 1);
        continue;
      }
      for (const e of this.map.enemies) {
        if (!e.alive) continue;
        if (Math.hypot(e.x - tr.x, e.y - tr.y) < e.radius + 22) {
          e.rootTimer = 2.5;
          this.damageEnemy(e, Math.round(this.getTotalAtk() * 0.7), '#4ADE80');
          this.addEffect('ring', tr.x, tr.y, 30, '#16A34A', 0.3);
          this.traps.splice(i, 1);
          break;
        }
      }
    }

    this.updateProjectiles(dt);
    this.updateEnemies(dt);

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 28 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Cámara suave centrada sin mostrar espacios negros fuera del mapa
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxCamX = Math.max(0, this.map.width - vw);
    const maxCamY = Math.max(0, this.map.height - vh);
    const targetX = vw >= this.map.width ? (this.map.width - vw) / 2 : Math.max(0, Math.min(maxCamX, p.x - vw / 2));
    const targetY = vh >= this.map.height ? (this.map.height - vh) / 2 : Math.max(0, Math.min(maxCamY, p.y - vh / 2));
    this.camera.x += (targetX - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (targetY - this.camera.y) * Math.min(1, dt * 8);

    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 12) {
      this.autoSaveTimer = 0;
      this.callbacks.onAutoSave?.(this.exportSave());
    }

    drawMinimap(this.minimapCanvas, this.map, p);
    this.callbacks.onHudUpdate?.(this.getHudSnapshot());
  }

  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.timer -= dt;
      if (h.timer <= 0) {
        sfx.playBossWave();
        this.addEffect('ring', h.x, h.y, h.radius, h.color, 0.4);
        if (Math.hypot(p.x - h.x, p.y - h.y) <= h.radius) {
          this.damagePlayer(h.dmg);
          if (h.slow) p.slowedTimer = 2.5;
        }
        this.hazards.splice(i, 1);
      }
    }
  }

  updatePet(dt) {
    const p = this.player;
    if (!p.activePet || !PETS[p.activePet]) return;
    const petDef = PETS[p.activePet];
    const pet = this.petEntity;

    if (petDef.healPerTick > 0) {
      pet.healTimer += dt;
      if (pet.healTimer >= 4.0) {
        pet.healTimer = 0;
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + petDef.healPerTick);
          this.addFloatingText(p.x, p.y - 28, `+${petDef.healPerTick} HP (Fénix)`, '#FB923C');
        }
      }
    }

    // La mascota siempre acompaña al costado/detrás del héroe a nivel del suelo (nunca sobre la cabeza)
    const sideOffset = p.dirX > 0.2 ? -36 : p.dirX < -0.2 ? 36 : -34;
    let targetX = p.x + sideOffset;
    let targetY = p.y + 8;
    let targetDropIdx = -1;
    let targetMapGem = null;
    let bestDist = 240;

    for (let i = 0; i < this.groundDrops.length; i++) {
      const d = this.groundDrops[i];
      const canGrab = (d.kind === 'gold' && petDef.collectGold) || (d.kind === 'gem' && petDef.collectGems);
      if (!canGrab) continue;
      const dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (dist < bestDist) {
        bestDist = dist;
        targetDropIdx = i;
        targetX = d.x;
        targetY = d.y;
      }
    }

    if (targetDropIdx === -1 && petDef.collectGems) {
      for (const g of this.map.gems) {
        if (g.collected) continue;
        if (Math.hypot(g.x - p.x, g.y - p.y) < 170) {
          targetMapGem = g;
          targetX = g.x;
          targetY = g.y;
          break;
        }
      }
    }

    const dx = targetX - pet.x;
    const dy = targetY - pet.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 3) {
      // Seguimiento suavizado (lerp) detrás o al costado del jugador
      const isFetching = targetDropIdx !== -1 || Boolean(targetMapGem);
      const lerpSpeed = isFetching ? 7.5 : 5.2;
      const maxStep = (isFetching ? 270 : 225) * dt;
      const step = Math.min(dist, Math.max(dist * Math.min(1, dt * lerpSpeed), Math.min(dist, 45 * dt)), maxStep);
      const stepX = (dx / dist) * step;
      const stepY = (dy / dist) * step;
      pet.vx = stepX / Math.max(0.001, dt);
      pet.vy = stepY / Math.max(0.001, dt);
      pet.x += stepX;
      pet.y += stepY;
      if (Math.abs(dx) > 2) pet.dirX = dx >= 0 ? 1 : -1;
      pet.moving = Math.hypot(pet.vx, pet.vy) > 16;
    } else {
      pet.vx = 0;
      pet.vy = 0;
      pet.moving = false;
      if (Math.abs(p.dirX) > 0.2) pet.dirX = p.dirX >= 0 ? 1 : -1;
    }

    if (targetDropIdx !== -1 && Math.hypot(pet.x - targetX, pet.y - targetY) < 18) {
      this.collectGroundDrop(targetDropIdx);
    } else if (targetMapGem && Math.hypot(pet.x - targetMapGem.x, pet.y - targetMapGem.y) < 18) {
      this.collectMapGem(targetMapGem);
    }
  }

  collectMapGem(g) {
    if (g.collected) return;
    if (this.addItemToBackpack(g.itemId, 1)) {
      g.collected = true;
      g.respawnTimer = 45;
      sfx.playGem();
      const item = ITEMS[g.itemId];
      this.addFloatingText(g.x, g.y - 16, `+1 ${item.name}`, item.gemColor || '#38BDF8');
      this.callbacks.onAutoSave?.(this.exportSave());
    }
  }

  collectGroundDrop(index) {
    const d = this.groundDrops[index];
    if (!d) return;
    if (d.kind === 'gold') {
      this.player.gold += d.amount;
      sfx.playCoin();
      this.addFloatingText(d.x, d.y - 12, `+${d.amount} Oro`, '#EAB308');
      this.groundDrops.splice(index, 1);
    } else if (d.kind === 'gem') {
      if (this.addItemToBackpack(d.itemId, 1)) {
        const item = ITEMS[d.itemId];
        sfx.playGem();
        this.addFloatingText(d.x, d.y - 12, `+1 ${item.name}`, item.gemColor || '#38BDF8');
        this.groundDrops.splice(index, 1);
      }
    }
  }

  gainXp(amount) {
    const p = this.player;
    if (p.level >= MAX_LEVEL || amount <= 0) return;
    p.xp += amount;
    let leveled = false;
    while (p.level < MAX_LEVEL) {
      const needed = xpNeededForLevel(p.level);
      if (p.xp >= needed) {
        p.xp -= needed;
        p.level += 1;
        leveled = true;
      } else break;
    }
    if (p.level >= MAX_LEVEL) p.xp = 0;

    if (leveled) {
      p.skillPoints = (p.skillPoints || 0) + 1;
      p.talentPoints = (p.talentPoints || 0) + 1;
      this.recalcDerivedStats(false);
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      sfx.playLevelUp();
      this.addEffect('ring', p.x, p.y, 56, '#FDE047', 0.55);
      this.addFloatingText(p.x, p.y - 34, `¡NIVEL ${p.level}!`, '#FDE047');
      this.callbacks.onToast?.(`¡Subiste al Nivel ${p.level}! (+1 Punto de Habilidad y Talento)`, 'success');
      this.callbacks.onAutoSave?.(this.exportSave());
    }
  }

  gainPetXp(amount) {
    const p = this.player;
    if (!p.activePet || !p.petProgress?.[p.activePet] || amount <= 0) return;
    const prog = p.petProgress[p.activePet];
    prog.xp += amount;
    let leveled = false;
    while (prog.level < MAX_LEVEL && prog.xp >= petXpNeeded(prog.level)) {
      prog.xp -= petXpNeeded(prog.level);
      prog.level += 1;
      leveled = true;
    }
    if (leveled) {
      this.recalcDerivedStats(true);
      this.callbacks.onToast?.(`${PETS[p.activePet]?.name || 'Tu mascota'} subió a Nivel ${prog.level}!`, 'success');
    }
  }

  checkAchievements() {
    const saveSnap = this.exportSave();
    if (!saveSnap) return;
    let unlockedAny = false;
    for (const ach of ACHIEVEMENTS) {
      if (this.player.unlockedAchievements.includes(ach.id)) continue;
      if (ach.check(saveSnap)) {
        this.player.unlockedAchievements.push(ach.id);
        unlockedAny = true;
        sfx.playQuest();
        this.callbacks.onToast?.(`🏅 Logro desbloqueado: ${ach.title}`, 'success');
      }
    }
    if (unlockedAny) this.callbacks.onAutoSave?.(this.exportSave());
  }

  moveEntityWithCollisions(ent, dx, dy) {
    const tryX = Math.max(32, Math.min(this.map.width - 32, ent.x + dx));
    if (!this.collidesWorld(tryX, ent.y, ent.radius)) ent.x = tryX;
    const tryY = Math.max(32, Math.min(this.map.height - 32, ent.y + dy));
    if (!this.collidesWorld(ent.x, tryY, ent.radius)) ent.y = tryY;
  }

  collidesWorld(x, y, r) {
    for (const b of this.map.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y + 24 && y - r < b.y + b.h) return true;
    }
    for (const s of this.map.solids) {
      if (x + r > s.x && x - r < s.x + s.w && y + r > s.y && y - r < s.y + s.h) return true;
    }
    for (const t of this.map.trees) {
      if (Math.hypot(x - t.x, y - (t.y + 8)) < r + 14) return true;
    }
    return false;
  }

  triggerAbility(slot) {
    if (!this.player || this.paused) return;
    const p = this.player;
    if (p.cooldowns[slot] > 0) return;

    const cls = CLASSES[p.heroClass];
    const atk = this.getTotalAtk();
    const aim = this.getAimVector();
    p.atkDirX = aim.x;
    p.atkDirY = aim.y;
    this.petEntity.attackAnimTimer = 1.0;
    this.petEntity.atkDirX = aim.x;
    this.petEntity.atkDirY = aim.y;

    if (slot === 0) {
      p.cooldowns[0] = cls.basicCooldown;
      p.attackAnimTimer = 1.0;
      sfx.playAttack(p.gender);
      if (cls.basicType === 'melee') {
        this.performMeleeArc(p.x, p.y, aim.x, aim.y, cls.basicRange, atk, '#FDE047');
      } else if (cls.basicType === 'ranged_arcane') {
        this.addEffect('ring', p.x + aim.x * 16, p.y + aim.y * 16, 20, '#38BDF8', 0.2);
        this.spawnProjectile('player', p.x + aim.x * 14, p.y + aim.y * 14, aim.x * 380, aim.y * 380, atk, 8, '#38BDF8', 0.85, { style: 'orb' });
      } else {
        this.spawnProjectile('player', p.x + aim.x * 14, p.y + aim.y * 14, aim.x * 470, aim.y * 470, atk, 6, '#FDE047', 0.78, { style: 'arrow' });
      }
      return;
    }

    const skill = cls.skills[slot - 1];
    if (!skill) return;
    const mpCost = skill.mpCost || 15;
    if (p.mp < mpCost) {
      this.addFloatingText(p.x, p.y - 26, 'Sin PM', '#38BDF8');
      return;
    }
    p.mp = Math.max(0, p.mp - mpCost);
    const skLvl = p.skillLevels?.[slot - 1] || 1;
    const skMult = 1 + (skLvl - 1) * 0.16;
    p.cooldowns[slot] = Math.max(1.2, skill.cooldown - (skLvl - 1) * 0.25);
    p.attackAnimTimer = 1.0;
    sfx.playSkill(p.gender);

    if (skill.id === 'corte_pesado') {
      this.performMeleeArc(p.x, p.y, aim.x, aim.y, 76, Math.round(atk * 1.8 * skMult), '#D9A441');
      this.camera.shake = 5;
    } else if (skill.id === 'grito_escudo') {
      p.shieldBuffTimer = 5.0 + skLvl;
      this.addFloatingText(p.x, p.y - 24, `+14 DEF (${5 + skLvl}s)`, '#D9A441');
      this.addEffect('ring', p.x, p.y, 44, '#D9A441', 0.35);
    } else if (skill.id === 'embestida') {
      for (let step = 0; step < 6; step++) this.moveEntityWithCollisions(p, aim.x * 16, aim.y * 16);
      this.addEffect('ring', p.x, p.y, 58, '#60A5FA', 0.3);
      this.hitEnemiesInRadius(p.x, p.y, 64, Math.round(atk * 1.25 * skMult), (e) => { e.stunTimer = 1.5; });
      this.checkDummyHit(p.x, p.y, 64, Math.round(atk * 1.25 * skMult));
      this.camera.shake = 6;
    } else if (skill.id === 'bola_fuego') {
      this.spawnProjectile('player', p.x, p.y, aim.x * 320, aim.y * 320, Math.round(atk * 1.65 * skMult), 11, '#F97316', 0.95, { aoeRadius: 72 });
    } else if (skill.id === 'escarcha') {
      this.addEffect('ring', p.x, p.y, 125, '#38BDF8', 0.45);
      this.hitEnemiesInRadius(p.x, p.y, 125, Math.round(atk * 0.9 * skMult), (e) => { e.slowTimer = 3.0; });
      this.checkDummyHit(p.x, p.y, 125, Math.round(atk * 0.9 * skMult));
    } else if (skill.id === 'destello') {
      this.addEffect('ring', p.x, p.y, 28, '#9333EA', 0.25);
      p.invulnTimer = 0.5;
      for (let step = 0; step < 6; step++) this.moveEntityWithCollisions(p, -aim.x * 18, -aim.y * 18);
      this.addEffect('ring', p.x, p.y, 32, '#38BDF8', 0.3);
    } else if (skill.id === 'flecha_rapida') {
      this.spawnProjectile('player', p.x, p.y, aim.x * 490, aim.y * 490, Math.round(atk * 0.95 * skMult), 6, '#FACC15', 0.75);
      setTimeout(() => {
        if (!this.running || this.paused) return;
        this.spawnProjectile('player', p.x, p.y, aim.x * 490, aim.y * 490, Math.round(atk * 0.95 * skMult), 6, '#FACC15', 0.75);
      }, 130);
    } else if (skill.id === 'trampa_raices') {
      this.traps.push({ x: p.x + aim.x * 34, y: p.y + aim.y * 34, life: 12 });
      this.addFloatingText(p.x, p.y - 20, 'Trampa lista', '#4ADE80');
    } else if (skill.id === 'lluvia_flechas') {
      const tx = p.x + aim.x * 140;
      const ty = p.y + aim.y * 140;
      this.addEffect('ring', tx, ty, 92, '#EAB308', 0.55);
      this.hitEnemiesInRadius(tx, ty, 95, Math.round(atk * 1.55 * skMult));
      this.checkDummyHit(tx, ty, 95, Math.round(atk * 1.55 * skMult));
    }
  }

  getAimVector() {
    const p = this.player;
    let nearest = null;
    let bestDist = 300;
    for (const e of this.map.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestDist) { bestDist = d; nearest = e; }
    }
    if (!nearest) {
      for (const n of this.map.npcs) {
        if (n.kind === 'dummy' && Math.hypot(n.x - p.x, n.y - p.y) < 220) {
          nearest = n;
          break;
        }
      }
    }
    if (nearest) {
      const dx = nearest.x - p.x;
      const dy = nearest.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      p.dirX = dx / l;
      p.dirY = dy / l;
      return { x: dx / l, y: dy / l };
    }
    return { x: p.dirX || 0, y: p.dirY || -1 };
  }

  performMeleeArc(x, y, ax, ay, range, dmg, color) {
    const hitX = x + ax * (range * 0.58);
    const hitY = y + ay * (range * 0.58);
    const angle = Math.atan2(ay, ax);
    this.addEffect('slash', hitX, hitY, range * 0.68, color, 0.24, { angle });
    this.hitEnemiesInRadius(hitX, hitY, range * 0.75, dmg);
    this.checkDummyHit(hitX, hitY, range * 0.75, dmg);
  }

  checkDummyHit(x, y, radius, dmg) {
    for (const dummy of this.map.npcs) {
      if (dummy.kind !== 'dummy') continue;
      if (Math.hypot(dummy.x - x, dummy.y - y) <= radius + dummy.radius) {
        dummy.hitFlash = 0.25;
        sfx.playHit();
        this.addFloatingText(dummy.x, dummy.y - 26, `-${dmg}`, '#FACC15');
        const q = this.player.quest;
        if (q.currentId === 2 && q.talkedBlacksmith && q.dummyHits < 3) {
          q.dummyHits += 1;
          if (q.dummyHits >= 3) this.completeQuest(2);
        }
      }
    }
  }

  hitEnemiesInRadius(x, y, radius, rawDmg, onHit = null) {
    for (const e of this.map.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.radius) {
        this.damageEnemy(e, rawDmg);
        if (onHit) onHit(e);
      }
    }
  }

  damageEnemy(e, rawDmg, color = '#FFFFFF') {
    const isCrit = Math.random() * 100 < this.getComputedStats().crit;
    const baseDmg = Math.max(4, Math.round(rawDmg - e.def * 0.35));
    const dmg = isCrit ? Math.round(baseDmg * 1.6) : baseDmg;
    e.hp = Math.max(0, e.hp - dmg);
    e.hitFlash = 0.18;

    // Retroceso corto (knockback) anclado al suelo lejos del jugador + destello de impacto
    if (this.player) {
      const kdx = e.x - this.player.x;
      const kdy = e.y - this.player.y;
      const klen = Math.hypot(kdx, kdy) || 1;
      const kbForce = e.isBoss ? 55 : 155;
      e.kbVx = (kdx / klen) * kbForce;
      e.kbVy = (kdy / klen) * kbForce;
    }
    this.addEffect('ring', e.x, e.y, e.isBoss ? 28 : 18, isCrit ? '#FDE047' : '#F8FAFC', 0.16);
    sfx.playHit();
    this.addFloatingText(e.x, e.y - 24, isCrit ? `¡-${dmg}!` : `-${dmg}`, isCrit ? '#FDE047' : color);

    // Estado de FURIA en Jefes por debajo del 30% de vida
    if (e.isBoss && !e.furyActive && e.hp > 0 && e.hp <= e.maxHp * 0.3) {
      e.furyActive = true;
      e.speed = Math.round(e.speed * 1.35);
      e.attackCd = Math.max(0.65, e.attackCd * 0.72);
      e.specialCd = Math.max(2.2, (e.specialCd || 4.5) * 0.68);
      sfx.playBossWave();
      this.camera.shake = 12;
      this.addFloatingText(e.x, e.y - 58, '¡FURIA!', '#EF4444');
      this.callbacks.onToast?.(`¡${e.name} entró en Estado de Furia!`, 'error');
    }

    // Fase 2 de Jefes al bajar del 50% de vida
    if (e.isBoss && !e.phase2Triggered && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
      e.phase2Triggered = true;
      sfx.playBossWave();
      this.camera.shake = 10;
      if (e.kind === 'malakor') {
        this.addFloatingText(e.x, e.y - 48, '¡INVOCACIÓN DEL VACÍO!', '#C084FC');
        this.map.enemies.push(spawnEnemy('trasgo', e.x - 65, e.y + 45), spawnEnemy('trasgo', e.x + 65, e.y + 45));
        this.callbacks.onToast?.('Malakor invocó 2 Trasgos Sombríos.', 'error');
      } else if (e.kind === 'vaelor') {
        e.speed = Math.round(e.speed * 1.25);
        this.addFloatingText(e.x, e.y - 52, '¡SOMBRAS DEL TRONO!', '#F0ABFC');
        this.map.enemies.push(spawnEnemy('caballero_vacio', e.x - 80, e.y + 55), spawnEnemy('caballero_vacio', e.x + 80, e.y + 55));
        this.callbacks.onToast?.('¡Vaelor invocó 2 Caballeros del Vacío!', 'error');
      }
    }

    if (e.hp <= 0) this.handleEnemyDeath(e);
  }

  handleEnemyDeath(e) {
    e.alive = false;
    e.respawnTimer = e.isBoss ? 9999 : 16;

    this.player.stats.enemiesDefeated = (this.player.stats.enemiesDefeated || 0) + 1;
    if (e.kind === 'lobo') this.player.stats.wolvesTotal = (this.player.stats.wolvesTotal || 0) + 1;

    this.gainXp(e.xp || 30);
    this.gainPetXp(Math.round((e.xp || 30) * 0.5));
    this.addFloatingText(e.x, e.y - 34, `+${e.xp || 30} XP`, '#38BDF8');

    const goldGain = e.goldMin + Math.floor(Math.random() * (e.goldMax - e.goldMin + 1));
    this.groundDrops.push({ kind: 'gold', amount: goldGain, x: e.x + (Math.random() - 0.5) * 20, y: e.y + (Math.random() - 0.5) * 20, life: 35 });

    if (e.gemPool && Math.random() <= (e.gemDropChance || 0.35)) {
      const gemId = e.gemPool[Math.floor(Math.random() * e.gemPool.length)];
      this.groundDrops.push({ kind: 'gem', itemId: gemId, x: e.x + (Math.random() - 0.5) * 28, y: e.y + (Math.random() - 0.5) * 28, life: 40 });
    }

    const q = this.player.quest;
    if (e.kind === 'lobo' && q.currentId === 3) {
      q.wolvesKilled = Math.min(5, (q.wolvesKilled || 0) + 1);
      if (q.wolvesKilled >= 5) this.completeQuest(3);
    } else if (e.kind === 'trasgo' && q.currentId === 4) {
      q.goblinsKilled = Math.min(4, (q.goblinsKilled || 0) + 1);
      this.checkQuest4();
    } else if (e.isBoss) {
      const firstKill = !this.player.defeatedBosses.includes(e.kind);
      if (firstKill) this.player.defeatedBosses.push(e.kind);

      const meta = BOSS_META[e.kind];
      // Desbloquear título permanente del jefe
      if (meta?.titleId && !this.player.unlockedTitles.includes(meta.titleId)) {
        this.player.unlockedTitles.push(meta.titleId);
        if (!this.player.activeTitle) this.player.activeTitle = meta.titleId;
        this.recalcDerivedStats(true);
        this.callbacks.onToast?.(`👑 Título desbloqueado: ${TITLES[meta.titleId].name} (${TITLES[meta.titleId].bonusText})`, 'success');
      }
      // Soltar equipo exclusivo (100% la primera vez, 60% en revanchas)
      if (meta?.dropItemId && (firstKill || Math.random() < 0.6)) {
        this.addItemToBackpack(meta.dropItemId, 1);
        this.callbacks.onToast?.(`✨ ¡Equipo exclusivo obtenido: ${ITEMS[meta.dropItemId]?.name}!`, 'success');
      }

      if (e.kind === 'malakor') {
        q.malakorDefeated = true;
        sfx.playQuest();
      } else if (e.kind === 'ignis' || e.kind === 'boreas') {
        sfx.playQuest();
      } else if (e.kind === 'vaelor') {
        this.player.gold += 1200;
        this.addItemToBackpack('gema_zafiro', 5);
        this.addItemToBackpack('gema_rubi', 5);
        this.addItemToBackpack('gema_esmeralda', 5);
        this.player.vaelorVictoryShown = true;
        sfx.playVictory();
        this.checkAchievements();
        this.callbacks.onAutoSave?.(this.exportSave());
        this.callbacks.onVictory?.(this.exportSave());
        return;
      }
      this.callbacks.onAutoSave?.(this.exportSave());
    }

    this.checkAchievements();
  }

  checkQuest4() {
    const q = this.player.quest;
    if (q.currentId === 4 && q.goblinsKilled >= 4 && q.crystalsCollected >= 3) this.completeQuest(4);
  }

  completeQuest(questId) {
    const q = this.player.quest;
    const def = QUESTS.find((item) => item.id === questId);
    if (!def) return;

    this.player.gold += def.rewardGold;
    this.gainXp(def.rewardXp || 50);
    for (const reward of def.rewardItems || []) this.addItemToBackpack(reward.id, reward.qty);

    sfx.playQuest();
    if (questId < 5) {
      q.currentId = questId + 1;
      this.callbacks.onToast?.(`¡Misión completada: ${def.title}! (+${def.rewardGold} Oro)`, 'success');
    } else {
      q.completedAll = true;
      this.callbacks.onToast?.(`¡Misiones de inicio completadas! Sigue explorando hasta Nivel 90.`, 'success');
    }

    this.updateNpcMarkers();
    this.checkAchievements();
    this.callbacks.onAutoSave?.(this.exportSave());
  }

  updateNpcMarkers() {
    if (!this.map) return;
    const q = this.player.quest;
    const tabernero = this.map.npcs.find((n) => n.kind === 'tabernero');
    const herrero = this.map.npcs.find((n) => n.kind === 'herrero');
    if (tabernero) tabernero.marker = q.currentId === 1 || (q.currentId === 5 && q.malakorDefeated && !q.completedAll) ? '!' : '';
    if (herrero) herrero.marker = q.currentId === 2 && !q.talkedBlacksmith ? '!' : '';
  }

  spawnProjectile(owner, x, y, vx, vy, dmg, radius, color, life, extra = {}) {
    this.projectiles.push({ owner, x, y, vx, vy, dmg, radius, color, life, ...extra });
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      if (pr.life <= 0 || this.collidesWorld(pr.x, pr.y, pr.radius * 0.5)) {
        if (pr.aoeRadius) {
          this.addEffect('ring', pr.x, pr.y, pr.aoeRadius, '#F97316', 0.3);
          this.hitEnemiesInRadius(pr.x, pr.y, pr.aoeRadius, pr.dmg);
          this.checkDummyHit(pr.x, pr.y, pr.aoeRadius, pr.dmg);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.owner === 'player') {
        let hit = false;
        for (const e of this.map.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.radius + pr.radius) {
            if (pr.aoeRadius) {
              this.addEffect('ring', pr.x, pr.y, pr.aoeRadius, '#F97316', 0.3);
              this.hitEnemiesInRadius(pr.x, pr.y, pr.aoeRadius, pr.dmg);
            } else {
              this.damageEnemy(e, pr.dmg);
            }
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const dummy of this.map.npcs) {
            if (dummy.kind === 'dummy' && Math.hypot(dummy.x - pr.x, dummy.y - pr.y) < dummy.radius + pr.radius) {
              this.checkDummyHit(pr.x, pr.y, pr.radius + 10, pr.dmg);
              hit = true;
              break;
            }
          }
        }
        if (hit) this.projectiles.splice(i, 1);
      } else {
        if (Math.hypot(p.x - pr.x, p.y - pr.y) < p.radius + pr.radius) {
          this.damagePlayer(pr.dmg);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    const playerSafe = this.isInSafeArea(p.x, p.y);

    for (const e of this.map.enemies) {
      if (!e.alive) {
        if (!e.isBoss) {
          e.respawnTimer -= dt;
          if (e.respawnTimer <= 0) {
            e.alive = true;
            e.hp = e.maxHp;
            e.x = e.homeX;
            e.y = e.homeY;
          }
        }
        continue;
      }

      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.attackAnimTimer > 0) e.attackAnimTimer = Math.max(0, e.attackAnimTimer - dt * 2.8);

      // Aplicar retroceso corto (knockback) anclado al suelo al recibir daño
      if (e.kbVx || e.kbVy) {
        this.moveEntityWithCollisions(e, (e.kbVx || 0) * dt, (e.kbVy || 0) * dt);
        const decay = Math.pow(0.0006, dt);
        e.kbVx = (e.kbVx || 0) * decay;
        e.kbVy = (e.kbVy || 0) * decay;
        if (Math.hypot(e.kbVx, e.kbVy) < 5) {
          e.kbVx = 0;
          e.kbVy = 0;
        }
      }

      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        e.moving = false;
        continue;
      }
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.rootTimer > 0) e.rootTimer = Math.max(0, e.rootTimer - dt);
      if (e.attackTimer > 0) e.attackTimer -= dt;

      const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);

      // Ataques especiales de los 4 Jefes
      if (e.isBoss && distToPlayer < 330 && !playerSafe) {
        e.specialTimer -= dt;
        if (e.specialTimer <= 0) {
          e.specialTimer = e.specialCd || 5.0;
          e.attackAnimTimer = 1.0;
          e.atkDirX = (p.x - e.x) / (distToPlayer || 1);
          e.atkDirY = (p.y - e.y) / (distToPlayer || 1);
          if (e.kind === 'malakor' || (e.kind === 'vaelor' && e.phase2Triggered)) {
            this.hazards.push({ x: e.x, y: e.y, radius: 145, timer: 1.0, maxTimer: 1.0, dmg: Math.round(e.atk * 1.4), color: '#9333EA', slow: false });
            this.addFloatingText(e.x, e.y - 46, '¡ONDA DEL VACÍO!', '#E879F9');
          } else if (e.kind === 'ignis') {
            this.hazards.push({ x: p.x, y: p.y, radius: 85, timer: 0.95, maxTimer: 0.95, dmg: Math.round(e.atk * 1.35), color: '#F97316', slow: false });
            this.addFloatingText(e.x, e.y - 46, '¡CÍRCULO DE FUEGO!', '#FB923C');
          } else if (e.kind === 'boreas') {
            this.hazards.push({ x: p.x, y: p.y, radius: 95, timer: 0.95, maxTimer: 0.95, dmg: Math.round(e.atk * 1.25), color: '#38BDF8', slow: true });
            this.addFloatingText(e.x, e.y - 46, '¡ONDA GLACIAL!', '#7DD3FC');
          } else if (e.kind === 'vaelor') {
            // Fase 1: 3 rayos morados en abanico
            const baseAng = Math.atan2(p.y - e.y, p.x - e.x);
            [-0.25, 0, 0.25].forEach((off) => {
              this.spawnProjectile('enemy', e.x, e.y, Math.cos(baseAng + off) * 320, Math.sin(baseAng + off) * 320, e.atk, 8, '#E879F9', 1.3, { style: 'orb' });
            });
            this.addFloatingText(e.x, e.y - 46, '¡RAYOS DEL VACÍO!', '#E879F9');
          }
        }
      }

      if (!playerSafe && distToPlayer < e.aggroRange) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const len = distToPlayer || 1;
        if (Math.abs(dx) > 2) e.facingRight = dx > 0;

        if (distToPlayer > e.attackRange - 6 && e.rootTimer <= 0) {
          const spd = e.speed * (e.slowTimer > 0 ? 0.5 : 1);
          const prevX = e.x;
          const prevY = e.y;
          this.moveEntityWithCollisions(e, (dx / len) * spd * dt, (dy / len) * spd * dt);
          e.moving = Math.hypot(e.x - prevX, e.y - prevY) > 0.25;
        } else {
          e.moving = false;
        }

        if (distToPlayer <= e.attackRange && e.attackTimer <= 0) {
          e.attackTimer = e.attackCd;
          e.attackAnimTimer = 1.0;
          e.atkDirX = dx / len;
          e.atkDirY = dy / len;
          if (e.ranged) {
            this.spawnProjectile('enemy', e.x, e.y, (dx / len) * 270, (dy / len) * 270, e.atk, 6, e.projColor || '#C084FC', 1.15, { style: 'orb' });
          } else {
            const angle = Math.atan2(dy, dx);
            this.addEffect('slash', e.x + (dx / len) * 18, e.y + (dy / len) * 18, e.isBoss ? 34 : 22, '#F43F5E', 0.22, { angle });
            this.damagePlayer(e.atk, e.x, e.y);
          }
        }
      } else {
        const hd = Math.hypot(e.homeX - e.x, e.homeY - e.y);
        if (hd > 12 && e.rootTimer <= 0) {
          const hx = e.homeX - e.x;
          const hy = e.homeY - e.y;
          if (Math.abs(hx) > 2) e.facingRight = hx > 0;
          const prevX = e.x;
          const prevY = e.y;
          this.moveEntityWithCollisions(e, (hx / hd) * e.speed * 0.6 * dt, (hy / hd) * e.speed * 0.6 * dt);
          e.moving = Math.hypot(e.x - prevX, e.y - prevY) > 0.25;
        } else {
          e.moving = false;
        }
      }
    }
  }

  damagePlayer(rawDmg, srcX = null, srcY = null) {
    const p = this.player;
    if (p.invulnTimer > 0) return;
    const dmg = Math.max(2, Math.round(rawDmg - this.getTotalDef() * 0.45));
    p.hp = Math.max(0, p.hp - dmg);
    p.hitFlash = 0.2;
    if (srcX !== null && srcY !== null) {
      const kdx = p.x - srcX;
      const kdy = p.y - srcY;
      const klen = Math.hypot(kdx, kdy) || 1;
      p.kbVx = (kdx / klen) * 135;
      p.kbVy = (kdy / klen) * 135;
    }
    this.camera.shake = 5;
    sfx.playHit(p.gender);
    this.addFloatingText(p.x, p.y - 26, `-${dmg}`, '#F87171');

    if (p.hp <= 0) {
      p.hp = p.maxHp;
      p.invulnTimer = 1.5;
      this.loadMap('aldea', 800, 740, true);
      this.callbacks.onToast?.('Has caído en combate. Fuiste rescatado en la Aldea Inicial.', 'error');
    }
  }

  getNearestInteractable() {
    const p = this.player;
    for (const npc of this.map.npcs) {
      if (npc.kind === 'dummy' || npc.kind.startsWith('guardia')) continue;
      if (Math.hypot(npc.x - p.x, npc.y - p.y) < 74) {
        return { type: 'npc', target: npc, label: `Hablar con ${npc.name} (E)` };
      }
    }
    for (const ch of this.map.chests) {
      if (ch.opened) continue;
      if (Math.hypot(ch.x - p.x, ch.y - p.y) < 64) {
        return { type: 'chest', target: ch, label: 'Abrir Cofre Escondido (E)' };
      }
    }
    for (const c of this.map.crystals) {
      if (c.collected) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < 58) {
        return { type: 'crystal', target: c, label: 'Recoger Cristal Morado (E)' };
      }
    }
    if (this.map.bossAltar) {
      const aliveBoss = this.map.enemies.some((e) => e.isBoss && e.alive);
      if (!aliveBoss && Math.hypot(this.map.bossAltar.x - p.x, this.map.bossAltar.y - p.y) < 74) {
        return { type: 'altar', target: this.map.bossAltar, label: `${this.map.bossAltar.label} (E)` };
      }
    }
    return null;
  }

  interactNearest() {
    const found = this.getNearestInteractable();
    if (!found) return;

    if (found.type === 'altar') {
      const alt = found.target;
      this.map.enemies.push(spawnEnemy(alt.bossKind, alt.x, alt.y - 30));
      sfx.playBossWave();
      this.camera.shake = 10;
      this.callbacks.onToast?.(`¡${BOSS_META[alt.bossKind]?.name || 'El Jefe'} ha regresado para la revancha!`, 'error');
      return;
    }

    if (found.type === 'chest') {
      const ch = found.target;
      ch.opened = true;
      if (!this.player.openedChests.includes(ch.id)) this.player.openedChests.push(ch.id);
      this.player.gold += ch.gold;
      const summary = [`+${ch.gold} Oro`];
      for (const it of ch.items) {
        this.addItemToBackpack(it.id, it.qty);
        summary.push(`${it.qty}x ${ITEMS[it.id]?.name || it.id}`);
      }
      sfx.playChest();
      this.addEffect('ring', ch.x, ch.y, 44, '#FDE047', 0.45);
      this.addFloatingText(ch.x, ch.y - 20, '¡COFRE ABIERTO!', '#FDE047');
      this.callbacks.onToast?.(`Cofre encontrado: ${summary.join(', ')}.`, 'success');
      this.checkAchievements();
      this.callbacks.onAutoSave?.(this.exportSave());
      return;
    }

    if (found.type === 'crystal') {
      found.target.collected = true;
      this.addItemToBackpack('cristal_morado', 1);
      sfx.playCoin();
      this.player.quest.crystalsCollected = Math.min(3, (this.player.quest.crystalsCollected || 0) + 1);
      this.addFloatingText(found.target.x, found.target.y - 16, '+1 Cristal Morado', '#C084FC');
      this.checkQuest4();
      this.callbacks.onAutoSave?.(this.exportSave());
      return;
    }

    if (found.type === 'npc') {
      if (found.target.kind === 'mercader') {
        this.callbacks.onOpenShop?.();
      } else {
        this.callbacks.onInteractNpc?.(found.target);
      }
    }
  }

  addItemToBackpack(itemId, qty = 1) {
    const bag = this.player.backpack;
    const existing = bag.find((slot) => slot.id === itemId);
    if (existing) { existing.qty += qty; return true; }
    if (bag.length >= 16) {
      this.callbacks.onToast?.('Tu mochila está llena (16/16).', 'error');
      return false;
    }
    bag.push({ id: itemId, qty });
    return true;
  }

  getItemQty(itemId) {
    const found = this.player.backpack.find((s) => s.id === itemId);
    return found ? found.qty : 0;
  }

  consumeItem(itemId, qty = 1) {
    const idx = this.player.backpack.findIndex((s) => s.id === itemId);
    if (idx === -1 || this.player.backpack[idx].qty < qty) return false;
    this.player.backpack[idx].qty -= qty;
    if (this.player.backpack[idx].qty <= 0) this.player.backpack.splice(idx, 1);
    return true;
  }

  useConsumable(itemId) {
    if (!this.player) return false;
    const item = ITEMS[itemId];
    if (!item || item.type !== 'consumable') return false;

    if (item.heal) {
      if (this.player.hp >= this.player.maxHp) {
        this.callbacks.onToast?.('Tu vida ya está al máximo.');
        return false;
      }
      if (!this.consumeItem(itemId, 1)) return false;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.heal);
      sfx.playPotion();
      this.addFloatingText(this.player.x, this.player.y - 24, `+${item.heal} HP`, '#4ADE80');
      return true;
    }

    if (item.mana) {
      if (this.player.mp >= this.player.maxMp) {
        this.callbacks.onToast?.('Tu PM ya está al máximo.');
        return false;
      }
      if (!this.consumeItem(itemId, 1)) return false;
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.mana);
      sfx.playPotion();
      this.addFloatingText(this.player.x, this.player.y - 24, `+${item.mana} PM`, '#38BDF8');
      return true;
    }

    if (item.speedBoost) {
      if (!this.consumeItem(itemId, 1)) return false;
      this.player.speedBuffTimer = item.speedBoost;
      sfx.playSkill();
      this.addFloatingText(this.player.x, this.player.y - 24, '+Velocidad (12s)', '#38BDF8');
      return true;
    }

    if (item.teleportVillage) {
      if (!this.consumeItem(itemId, 1)) return false;
      sfx.playTeleport();
      this.loadMap('aldea', 800, 740, true);
      this.callbacks.onToast?.('Teletransportado a la Aldea Inicial.', 'success');
      return true;
    }

    return false;
  }

  useBestHealPotion() {
    if (this.paused) return false;
    if (this.getItemQty('pocion_vida') > 0) return this.useConsumable('pocion_vida');
    if (this.getItemQty('pocion_grande') > 0) return this.useConsumable('pocion_grande');
    this.callbacks.onToast?.('No tienes pociones de vida.', 'error');
    return false;
  }

  addEffect(kind, x, y, radius, color, life, extra = {}) {
    this.effects.push({ kind, x, y, radius, color, life, maxLife: life, ...extra });
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 0.95 });
  }

  getHudSnapshot() {
    const p = this.player;
    const boss = this.map.enemies.find((e) => e.isBoss && e.alive);
    const bossVisible = boss && Math.hypot(boss.x - p.x, boss.y - p.y) < 460;
    const petProg = p.activePet ? p.petProgress?.[p.activePet] || { level: 1, xp: 0 } : null;
    const st = this.getComputedStats();
    return {
      name: p.name,
      gender: p.gender || 'male',
      heroClass: p.heroClass,
      level: p.level,
      xp: p.xp,
      xpNeeded: xpNeededForLevel(p.level),
      weaponPlus: p.equipment.weapon.plus,
      weaponQuality: p.equipment.weapon.quality,
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      mp: Math.ceil(p.mp),
      maxMp: p.maxMp,
      gold: p.gold,
      atk: st.atk,
      def: st.def,
      crit: st.crit,
      zone: this.map.name,
      quest: p.quest,
      potions: this.getItemQty('pocion_vida') + this.getItemQty('pocion_grande'),
      bagCount: p.backpack.length,
      activePet: p.activePet,
      petLevel: petProg?.level || 1,
      petXp: petProg?.xp || 0,
      petXpNeeded: petXpNeeded(petProg?.level || 1),
      cooldowns: p.cooldowns,
      interactable: this.getNearestInteractable(),
      boss: bossVisible ? { name: `${boss.name} · Nv.${boss.level || 30}`, hp: Math.ceil(boss.hp), maxHp: boss.maxHp, fury: Boolean(boss.furyActive) } : null
    };
  }

  render() {
    const ctx = this.ctx;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const shakeX = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;
    const shakeY = this.camera.shake > 0 ? (Math.random() - 0.5) * this.camera.shake : 0;

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-Math.round(this.camera.x + shakeX), -Math.round(this.camera.y + shakeY));

    drawMapGround(ctx, this.map, this.player.faction, this.elapsed);

    for (const fire of this.map.campfires) drawCampfire(ctx, fire, this.elapsed);
    for (const pt of this.map.portals) drawPortal(ctx, pt, this.elapsed, this.player.level);
    if (this.map.bossAltar && !this.map.enemies.some((e) => e.isBoss && e.alive)) {
      drawBossAltar(ctx, this.map.bossAltar, this.elapsed);
    }

    // Áreas telegrafiadas de jefes (fuego / hielo / vacío)
    for (const h of this.hazards) {
      const prog = 1 - h.timer / h.maxTimer;
      ctx.save();
      ctx.fillStyle = h.color + '38';
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius * prog, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const tr of this.traps) {
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const d of this.groundDrops) drawGroundDrop(ctx, d, this.elapsed);

    // Partículas de polvo suaves en los pies al caminar
    for (const dp of this.dustParticles) {
      const a = Math.max(0, dp.life / dp.maxLife);
      ctx.save();
      ctx.fillStyle = `rgba(214, 199, 178, ${(a * 0.55).toFixed(2)})`;
      ctx.fillRect(Math.round(dp.x - dp.size / 2), Math.round(dp.y - dp.size / 2), dp.size, dp.size);
      ctx.restore();
    }

    // Ordenar entidades por eje Y para profundidad 2.5D
    const renderables = [];
    for (const b of this.map.buildings) renderables.push({ y: b.y + b.h, draw: () => drawBuilding(ctx, b, this.elapsed) });
    for (const t of this.map.trees) renderables.push({ y: t.y + 18, draw: () => drawTree(ctx, t) });
    for (const pr of this.map.props) renderables.push({ y: pr.y, draw: () => drawProp(ctx, pr, this.elapsed) });
    for (const ch of this.map.chests) renderables.push({ y: ch.y, draw: () => drawChest(ctx, ch, this.elapsed) });
    for (const c of this.map.crystals) if (!c.collected) renderables.push({ y: c.y, draw: () => drawCrystal(ctx, c, this.elapsed) });
    for (const g of this.map.gems) if (!g.collected) renderables.push({ y: g.y, draw: () => drawGemNode(ctx, g, this.elapsed) });
    for (const npc of this.map.npcs) renderables.push({ y: npc.y, draw: () => drawNpc(ctx, npc, this.elapsed) });
    for (const e of this.map.enemies) if (e.alive) renderables.push({ y: e.y, draw: () => drawEnemy(ctx, e, this.elapsed) });
    if (this.player.activePet && PETS[this.player.activePet]) {
      renderables.push({
        y: this.petEntity.y,
        draw: () =>
          drawPet(
            ctx,
            {
              id: this.player.activePet,
              x: this.petEntity.x,
              y: this.petEntity.y,
              dirX: this.petEntity.dirX,
              moving: this.petEntity.moving,
              attackAnimTimer: this.petEntity.attackAnimTimer,
              atkDirX: this.petEntity.atkDirX,
              atkDirY: this.petEntity.atkDirY
            },
            this.elapsed
          )
      });
    }
    renderables.push({ y: this.player.y, draw: () => drawHero(ctx, this.player, this.elapsed) });

    renderables.sort((a, b) => a.y - b.y);
    for (const r of renderables) r.draw();

    // Proyectiles con estela direccional clara (flechas, bolas de fuego, orbes arcanos)
    for (const pr of this.projectiles) {
      const ang = Math.atan2(pr.vy || 0, pr.vx || 1);
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(ang);
      if (pr.style === 'arrow') {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.42)';
        ctx.fillRect(-20, -1.5, 16, 3);
        ctx.fillStyle = pr.color;
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(4, -3, 4, 6);
      } else {
        ctx.fillStyle = pr.color + '55';
        ctx.beginPath();
        ctx.ellipse(-pr.radius * 1.1, 0, pr.radius * 1.8, pr.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pr.radius * 0.2, 0, pr.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const ef of this.effects) {
      const alpha = Math.max(0, ef.life / ef.maxLife);
      const prog = 1 - alpha;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (ef.kind === 'slash') {
        // Tajo direccional creciente en forma de media luna con filo blanco
        const baseAng = ef.angle !== undefined ? ef.angle : 0;
        const startA = baseAng - 1.15 + prog * 0.4;
        const endA = baseAng - 0.55 + prog * 1.95;
        const rad = ef.radius * (0.85 + prog * 0.35);
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, rad, startA, endA);
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, rad * 0.88, startA + 0.08, endA - 0.05);
        ctx.stroke();
      } else {
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius * (1.2 - alpha * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.font = 'bold 16px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.fillStyle = '#0D0A14';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();

    // Oscuridad suave con luz radial alrededor del jugador en Cueva del Vacío
    if (this.map.darkness) {
      const px = this.player.x - this.camera.x;
      const py = this.player.y - this.camera.y;
      const grad = ctx.createRadialGradient(px, py, 95, px, py, 340);
      grad.addColorStop(0, 'rgba(9, 5, 18, 0)');
      grad.addColorStop(1, 'rgba(9, 5, 18, 0.72)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, vw, vh);
    }

    drawWeatherOverlay(ctx, this.map, vw, vh, this.elapsed);
  }
}
