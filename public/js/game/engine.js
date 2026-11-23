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
  xpNeededForLevel,
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

    this.petEntity = { x: 760, y: 720, healTimer: 0 };
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
      vaelorVictoryShown: s.vaelorVictoryShown,
      x: s.x,
      y: s.y,
      vx: 0,
      vy: 0,
      radius: 15,
      dirX: 0,
      dirY: -1,
      moving: false,
      hp: s.hp || cls.hp,
      maxHp: cls.hp,
      speed: cls.speed,
      gold: s.gold ?? 40,
      equipment: s.equipment,
      ownedPets: s.ownedPets,
      activePet: s.activePet,
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
    this.petEntity.x = p.x - 28;
    this.petEntity.y = p.y + 12;

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

  recalcDerivedStats(healOnIncrease = false) {
    const p = this.player;
    const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
    const lvlOffset = Math.max(0, p.level - 1);
    const armorBonus = computeArmorBonuses(p.equipment.armor);
    const prevMax = p.maxHp || cls.hp;
    p.maxHp = Math.round(cls.hp + lvlOffset * cls.hpPerLvl + armorBonus.hp);
    if (healOnIncrease && p.maxHp > prevMax) {
      p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - prevMax));
    }
  }

  getTotalAtk() {
    const p = this.player;
    const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
    return Math.round(cls.atk + Math.max(0, p.level - 1) * cls.atkPerLvl + computeWeaponAtkBonus(p.equipment.weapon));
  }

  getTotalDef() {
    const p = this.player;
    const cls = CLASSES[p.heroClass] || CLASSES.guerrero;
    const armorBonus = computeArmorBonuses(p.equipment.armor);
    const petDef = p.activePet && PETS[p.activePet] ? PETS[p.activePet].defBonus : 0;
    const shieldDef = p.shieldBuffTimer > 0 ? 12 : 0;
    return Math.round(cls.def + Math.max(0, p.level - 1) * cls.defPerLvl + armorBonus.def + petDef + shieldDef);
  }

  exportSave() {
    if (!this.player || !this.saveState) return null;
    const p = this.player;
    return {
      ...this.saveState,
      version: 3,
      gender: p.gender || 'male',
      level: p.level,
      xp: p.xp,
      currentMap: p.currentMap,
      visitedMaps: p.visitedMaps,
      defeatedBosses: p.defeatedBosses,
      vaelorVictoryShown: p.vaelorVictoryShown,
      x: Math.round(p.x),
      y: Math.round(p.y),
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      gold: p.gold,
      equipment: p.equipment,
      ownedPets: p.ownedPets,
      activePet: p.activePet,
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
    else if (code === 'KeyI' || code === 'KeyB') this.callbacks.onOpenBackpack?.();
    else if (code === 'KeyM') this.callbacks.onOpenUpgrades?.();
    else if (code === 'KeyT') this.callbacks.onOpenShop?.();
    else if (code === 'KeyN') this.callbacks.onOpenWorldMap?.();
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
    if (p.attackAnimTimer > 0) p.attackAnimTimer = Math.max(0, p.attackAnimTimer - dt * 2.5);
    if (p.speedBuffTimer > 0) p.speedBuffTimer = Math.max(0, p.speedBuffTimer - dt);
    if (p.slowedTimer > 0) p.slowedTimer = Math.max(0, p.slowedTimer - dt);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    if (this.portalLockMsgCooldown > 0) this.portalLockMsgCooldown = Math.max(0, this.portalLockMsgCooldown - dt);
    if (this.camera.shake > 0) this.camera.shake = Math.max(0, this.camera.shake - dt * 18);

    // Fogatas de descanso (recuperan toda la vida gratis en pocos segundos)
    for (const fire of this.map.campfires) {
      if (Math.hypot(p.x - fire.x, p.y - fire.y) <= fire.radius && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.36 * dt);
        this.campfireTick += dt;
        if (this.campfireTick >= 0.65) {
          this.campfireTick = 0;
          this.addFloatingText(p.x, p.y - 24, '+Vida (Fogata)', '#4ADE80');
        }
      }
    }

    // Movimiento (con física resbaladiza en Lago Congelado)
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
      p.moving = true;
      if (onIce) {
        p.vx += (nx * spd - p.vx) * Math.min(1, dt * 3.8);
        p.vy += (ny * spd - p.vy) * Math.min(1, dt * 3.8);
      } else {
        p.vx = nx * spd;
        p.vy = ny * spd;
      }
    } else {
      p.moving = false;
      if (onIce) {
        p.vx *= Math.pow(0.25, dt);
        p.vy *= Math.pow(0.25, dt);
      } else {
        p.vx = 0;
        p.vy = 0;
      }
    }

    if (Math.hypot(p.vx, p.vy) > 4) {
      this.moveEntityWithCollisions(p, p.vx * dt, p.vy * dt);
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

    let targetX = p.x - p.dirX * 34;
    let targetY = p.y - p.dirY * 34 + 8;
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
    if (dist > 6) {
      const speed = targetDropIdx !== -1 || targetMapGem ? 260 : 210;
      pet.x += (dx / dist) * Math.min(dist, speed * dt);
      pet.y += (dy / dist) * Math.min(dist, speed * dt);
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
      this.recalcDerivedStats(false);
      p.hp = p.maxHp;
      sfx.playLevelUp();
      this.addEffect('ring', p.x, p.y, 56, '#FDE047', 0.55);
      this.addFloatingText(p.x, p.y - 34, `¡NIVEL ${p.level}!`, '#FDE047');
      this.callbacks.onToast?.(`¡Subiste al Nivel ${p.level}!`, 'success');
      this.callbacks.onAutoSave?.(this.exportSave());
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

    if (slot === 0) {
      p.cooldowns[0] = cls.basicCooldown;
      p.attackAnimTimer = 1.0;
      sfx.playAttack(p.gender);
      if (cls.basicType === 'melee') {
        this.performMeleeArc(p.x, p.y, aim.x, aim.y, cls.basicRange, atk, '#F4F6FA');
      } else if (cls.basicType === 'ranged_arcane') {
        this.spawnProjectile('player', p.x, p.y, aim.x * 380, aim.y * 380, atk, 8, '#38BDF8', 0.8);
      } else {
        this.spawnProjectile('player', p.x, p.y, aim.x * 460, aim.y * 460, atk, 6, '#D9A441', 0.75);
      }
      return;
    }

    const skill = cls.skills[slot - 1];
    if (!skill) return;
    p.cooldowns[slot] = skill.cooldown;
    p.attackAnimTimer = 1.0;
    sfx.playSkill(p.gender);

    if (skill.id === 'corte_pesado') {
      this.performMeleeArc(p.x, p.y, aim.x, aim.y, 76, Math.round(atk * 1.8), '#D9A441');
      this.camera.shake = 5;
    } else if (skill.id === 'grito_escudo') {
      p.shieldBuffTimer = 5.0;
      this.addFloatingText(p.x, p.y - 24, '+12 DEF (5s)', '#D9A441');
      this.addEffect('ring', p.x, p.y, 44, '#D9A441', 0.35);
    } else if (skill.id === 'embestida') {
      for (let step = 0; step < 6; step++) this.moveEntityWithCollisions(p, aim.x * 16, aim.y * 16);
      this.addEffect('ring', p.x, p.y, 58, '#60A5FA', 0.3);
      this.hitEnemiesInRadius(p.x, p.y, 64, Math.round(atk * 1.25), (e) => { e.stunTimer = 1.5; });
      this.checkDummyHit(p.x, p.y, 64, Math.round(atk * 1.25));
      this.camera.shake = 6;
    } else if (skill.id === 'bola_fuego') {
      this.spawnProjectile('player', p.x, p.y, aim.x * 320, aim.y * 320, Math.round(atk * 1.65), 11, '#F97316', 0.95, { aoeRadius: 72 });
    } else if (skill.id === 'escarcha') {
      this.addEffect('ring', p.x, p.y, 125, '#38BDF8', 0.45);
      this.hitEnemiesInRadius(p.x, p.y, 125, Math.round(atk * 0.9), (e) => { e.slowTimer = 3.0; });
      this.checkDummyHit(p.x, p.y, 125, Math.round(atk * 0.9));
    } else if (skill.id === 'destello') {
      this.addEffect('ring', p.x, p.y, 28, '#9333EA', 0.25);
      p.invulnTimer = 0.5;
      for (let step = 0; step < 6; step++) this.moveEntityWithCollisions(p, -aim.x * 18, -aim.y * 18);
      this.addEffect('ring', p.x, p.y, 32, '#38BDF8', 0.3);
    } else if (skill.id === 'flecha_rapida') {
      this.spawnProjectile('player', p.x, p.y, aim.x * 490, aim.y * 490, Math.round(atk * 0.95), 6, '#FACC15', 0.75);
      setTimeout(() => {
        if (!this.running || this.paused) return;
        this.spawnProjectile('player', p.x, p.y, aim.x * 490, aim.y * 490, Math.round(atk * 0.95), 6, '#FACC15', 0.75);
      }, 130);
    } else if (skill.id === 'trampa_raices') {
      this.traps.push({ x: p.x + aim.x * 34, y: p.y + aim.y * 34, life: 12 });
      this.addFloatingText(p.x, p.y - 20, 'Trampa lista', '#4ADE80');
    } else if (skill.id === 'lluvia_flechas') {
      const tx = p.x + aim.x * 140;
      const ty = p.y + aim.y * 140;
      this.addEffect('ring', tx, ty, 92, '#EAB308', 0.55);
      this.hitEnemiesInRadius(tx, ty, 95, Math.round(atk * 1.55));
      this.checkDummyHit(tx, ty, 95, Math.round(atk * 1.55));
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
    const hitX = x + ax * (range * 0.65);
    const hitY = y + ay * (range * 0.65);
    this.addEffect('slash', hitX, hitY, range * 0.6, color, 0.18);
    this.hitEnemiesInRadius(hitX, hitY, range * 0.72, dmg);
    this.checkDummyHit(hitX, hitY, range * 0.72, dmg);
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
    const dmg = Math.max(4, Math.round(rawDmg - e.def * 0.35));
    e.hp = Math.max(0, e.hp - dmg);
    e.hitFlash = 0.14;
    sfx.playHit();
    this.addFloatingText(e.x, e.y - 24, `-${dmg}`, color);

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
        e.speed = Math.round(e.speed * 1.38);
        e.specialCd = 3.2;
        this.addFloatingText(e.x, e.y - 52, '¡FASE 2: LA FRACTURA!', '#F0ABFC');
        this.map.enemies.push(spawnEnemy('caballero_vacio', e.x - 80, e.y + 55), spawnEnemy('caballero_vacio', e.x + 80, e.y + 55));
        this.callbacks.onToast?.('¡Vaelor entró en Fase 2 e invocó 2 Caballeros del Vacío!', 'error');
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
      if (!this.player.defeatedBosses.includes(e.kind)) {
        this.player.defeatedBosses.push(e.kind);
      }
      if (e.kind === 'malakor') {
        q.malakorDefeated = true;
        this.addItemToBackpack('nucleo_malakor', 1);
        sfx.playQuest();
        this.callbacks.onToast?.('¡Malakor derrotado! Vuelve con el Tabernero o sube a Nv. 30 para el Desierto.', 'success');
      } else if (e.kind === 'ignis') {
        sfx.playQuest();
        this.callbacks.onToast?.('¡Ignis derrotado! Portal a las Montañas Heladas desbloqueado (Nv. 50).', 'success');
      } else if (e.kind === 'boreas') {
        sfx.playQuest();
        this.callbacks.onToast?.('¡Boreas derrotado! Portal a la Fortaleza del Vacío desbloqueado (Nv. 70).', 'success');
      } else if (e.kind === 'vaelor') {
        // Jefe Final: Cofre Legendario + Pantalla de Victoria
        this.player.gold += 1000;
        this.addItemToBackpack('cofre_legendario', 1);
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
      if (e.stunTimer > 0) { e.stunTimer = Math.max(0, e.stunTimer - dt); continue; }
      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.rootTimer > 0) e.rootTimer = Math.max(0, e.rootTimer - dt);
      if (e.attackTimer > 0) e.attackTimer -= dt;

      const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);

      // Ataques especiales de los 4 Jefes
      if (e.isBoss && distToPlayer < 330 && !playerSafe) {
        e.specialTimer -= dt;
        if (e.specialTimer <= 0) {
          e.specialTimer = e.specialCd || 5.0;
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
              this.spawnProjectile('enemy', e.x, e.y, Math.cos(baseAng + off) * 320, Math.sin(baseAng + off) * 320, e.atk, 8, '#E879F9', 1.3);
            });
            this.addFloatingText(e.x, e.y - 46, '¡RAYOS DEL VACÍO!', '#E879F9');
          }
        }
      }

      if (!playerSafe && distToPlayer < e.aggroRange) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const len = distToPlayer || 1;

        if (distToPlayer > e.attackRange - 6 && e.rootTimer <= 0) {
          const spd = e.speed * (e.slowTimer > 0 ? 0.5 : 1);
          this.moveEntityWithCollisions(e, (dx / len) * spd * dt, (dy / len) * spd * dt);
        }

        if (distToPlayer <= e.attackRange && e.attackTimer <= 0) {
          e.attackTimer = e.attackCd;
          if (e.ranged) {
            this.spawnProjectile('enemy', e.x, e.y, (dx / len) * 270, (dy / len) * 270, e.atk, 6, e.projColor || '#C084FC', 1.15);
          } else {
            this.damagePlayer(e.atk);
          }
        }
      } else {
        const hd = Math.hypot(e.homeX - e.x, e.homeY - e.y);
        if (hd > 12 && e.rootTimer <= 0) {
          this.moveEntityWithCollisions(e, ((e.homeX - e.x) / hd) * e.speed * 0.6 * dt, ((e.homeY - e.y) / hd) * e.speed * 0.6 * dt);
        }
      }
    }
  }

  damagePlayer(rawDmg) {
    const p = this.player;
    if (p.invulnTimer > 0) return;
    const dmg = Math.max(2, Math.round(rawDmg - this.getTotalDef() * 0.45));
    p.hp = Math.max(0, p.hp - dmg);
    p.hitFlash = 0.2;
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
    return null;
  }

  interactNearest() {
    const found = this.getNearestInteractable();
    if (!found) return;

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

  addEffect(kind, x, y, radius, color, life) {
    this.effects.push({ kind, x, y, radius, color, life, maxLife: life });
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 0.95 });
  }

  getHudSnapshot() {
    const p = this.player;
    const boss = this.map.enemies.find((e) => e.isBoss && e.alive);
    const bossVisible = boss && Math.hypot(boss.x - p.x, boss.y - p.y) < 420;
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
      gold: p.gold,
      atk: this.getTotalAtk(),
      def: this.getTotalDef(),
      zone: this.map.name,
      quest: p.quest,
      potions: this.getItemQty('pocion_vida') + this.getItemQty('pocion_grande'),
      bagCount: p.backpack.length,
      cooldowns: p.cooldowns,
      interactable: this.getNearestInteractable(),
      boss: bossVisible ? { name: boss.name, hp: Math.ceil(boss.hp), maxHp: boss.maxHp } : null
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
      renderables.push({ y: this.petEntity.y, draw: () => drawPet(ctx, { id: this.player.activePet, x: this.petEntity.x, y: this.petEntity.y }, this.elapsed) });
    }
    renderables.push({ y: this.player.y, draw: () => drawHero(ctx, this.player, this.elapsed) });

    renderables.sort((a, b) => a.y - b.y);
    for (const r of renderables) r.draw();

    for (const pr of this.projectiles) {
      ctx.fillStyle = pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ef of this.effects) {
      const alpha = ef.life / ef.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ef.color;
      ctx.lineWidth = ef.kind === 'slash' ? 5 : 3;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, ef.radius * (1.2 - alpha * 0.35), 0, Math.PI * 2);
      ctx.stroke();
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
