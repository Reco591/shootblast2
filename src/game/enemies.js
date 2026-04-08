import { CANVAS_W, CANVAS_H, POWERUP_TYPES } from "./constants.js";
import { spawnParticles, onKill, applyPlayerDamage, getPremiumPassive } from "./engine.js";
import { onLightningHit } from "./lightningChain.js";
import { getCurrentZoneWaves, pickEnemyFromZone } from "./zoneWaves.js";

// ─── ENEMY TYPE DEFINITIONS ───
const ENEMY_DEFS = {
  viper: {
    hp: 2, speed: 3, coins: 1, distBonus: 30_000,
    hitRadius: 22, accent: "#993030", accentLight: "#cc4040",
  },
  gnat: {
    hp: 1, speed: 2.5, coins: 1, distBonus: 15_000,
    hitRadius: 10, accent: "#00cc88", accentLight: "#00ffaa",
  },
  warper: {
    hp: 4, speed: 0, coins: 3, distBonus: 80_000,
    hitRadius: 20, accent: "#40dd20", accentLight: "#80ff60",
  },
  bomber: {
    hp: 8, speed: 1, coins: 5, distBonus: 120_000,
    hitRadius: 35, accent: "#446688", accentLight: "#5599dd",
  },
  elite: {
    hp: 6, speed: 2, coins: 7, distBonus: 150_000,
    hitRadius: 25, accent: "#7744cc", accentLight: "#bb88ff",
    shield: 4,
  },
  carrier: {
    hp: 20, speed: 0.5, coins: 14, distBonus: 300_000,
    hitRadius: 60, accent: "#3a4470", accentLight: "#5599dd",
  },
  sniper: {
    hp: 3, speed: 0, coins: 4, distBonus: 50_000,
    hitRadius: 18, accent: "#1a5c1a", accentLight: "#33aa33",
  },
  kamikaze: {
    hp: 2, speed: 6, coins: 3, distBonus: 60_000,
    hitRadius: 16, accent: "#cc2200", accentLight: "#ff4422",
  },
  tank: {
    hp: 25, speed: 0.5, coins: 10, distBonus: 100_000,
    hitRadius: 30, accent: "#555544", accentLight: "#887766",
  },
  minelayer: {
    hp: 5, speed: 1.5, coins: 5, distBonus: 80_000,
    hitRadius: 20, accent: "#227788", accentLight: "#44bbcc",
  },
  splitter: {
    hp: 4, speed: 2, coins: 7, distBonus: 90_000,
    hitRadius: 22, accent: "#cc8800", accentLight: "#ffaa00",
  },
  splitter_child: {
    hp: 2, speed: 3, coins: 1, distBonus: 20_000,
    hitRadius: 12, accent: "#cc8800", accentLight: "#ffaa00",
  },
  dasher: {
    hp: 4, speed: 4, coins: 5, distBonus: 75_000,
    hitRadius: 16, accent: "#00cccc", accentLight: "#00ffff",
  },
  summoner: {
    hp: 8, speed: 0.8, coins: 8, distBonus: 120_000,
    hitRadius: 24, accent: "#6622aa", accentLight: "#aa44ff",
  },
  phantom: {
    hp: 6, speed: 2, coins: 10, distBonus: 150_000,
    hitRadius: 20, accent: "#888899", accentLight: "#ccccdd",
  },
};

// ─── SPAWN LOGIC (zone-based) ───
export function maybeSpawnEnemy(state) {
  if (state.bossActive) return;

  const zone = getCurrentZoneWaves(state.distance);
  if (!zone || zone.enemies.length === 0) return;

  // Spawn chance scales with distance
  const distProgress = Math.min(1, state.distance / 12_000_000_000);
  const chance = 0.05 + distProgress * 0.15;
  if (Math.random() > chance) return;

  const enemyType = pickEnemyFromZone(zone);
  const def = ENEMY_DEFS[enemyType];
  if (!def) return;

  spawnEnemyByType(state, enemyType, def);
}

function spawnEnemyByType(state, type, def) {
  switch (type) {
    case "viper": {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        state.enemies.push(createEnemy("viper", def, {
          x: 40 + Math.random() * (CANVAS_W - 80),
          y: -30 - i * 40,
          phaseOffset: Math.random() * Math.PI * 2,
        }));
      }
      break;
    }
    case "gnat": {
      const count = 5 + Math.floor(Math.random() * 4);
      const cx = CANVAS_W * 0.3 + Math.random() * CANVAS_W * 0.4;
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const side = i % 2 === 0 ? -1 : 1;
        const offsetX = i === 0 ? 0 : side * row * 18;
        const offsetY = i === 0 ? 0 : -row * 14;
        state.enemies.push(createEnemy("gnat", def, {
          x: cx + offsetX,
          y: -20 + offsetY,
          isLeader: i === 0,
          wobbleX: 0, wobbleY: 0,
          targetX: cx + offsetX,
        }));
      }
      break;
    }
    case "warper": {
      const onScreen = state.enemies.filter(e => e.type === "warper").length;
      if (onScreen >= 2) break;
      state.enemies.push(createEnemy("warper", def, {
        x: 60 + Math.random() * (CANVAS_W - 120),
        y: 80 + Math.random() * (CANVAS_H * 0.4),
        teleportTimer: 120,
        shootTimer: 60,
        visible: true,
        prevX: 0, prevY: 0,
        afterimageAlpha: 0,
      }));
      break;
    }
    case "bomber": {
      state.enemies.push(createEnemy("bomber", def, {
        x: 40 + Math.random() * (CANVAS_W - 80),
        y: -60,
        mineTimer: 180,
      }));
      break;
    }
    case "elite": {
      state.enemies.push(createEnemy("elite", def, {
        x: CANVAS_W / 2,
        y: -40,
        shieldHP: def.shield,
        shootTimer: 150,
        phaseOffset: Math.random() * Math.PI * 2,
        enteredScreen: false,
      }));
      break;
    }
    case "carrier": {
      const onScreen = state.enemies.filter(e => e.type === "carrier").length;
      if (onScreen >= 1) break;
      state.enemies.push(createEnemy("carrier", def, {
        x: CANVAS_W / 2,
        y: -70,
        targetY: 80 + Math.random() * 40,
        driftDir: Math.random() < 0.5 ? -1 : 1,
        spawnTimer: 240,
        shootTimer: 360,
        spawnedGnats: [],
        enteredScreen: false,
      }));
      break;
    }
    case "sniper": {
      const onScreen = state.enemies.filter(e => e.type === "sniper").length;
      if (onScreen >= 2) break;
      state.enemies.push(createEnemy("sniper", def, {
        x: 60 + Math.random() * (CANVAS_W - 120),
        y: 40 + Math.random() * 30,
        aimTimer: 0,
        aimX: state.player.x,
        aimY: state.player.y,
        enteredScreen: false,
      }));
      break;
    }
    case "kamikaze": {
      for (let i = 0; i < 2; i++) {
        const spawnX = 80 + Math.random() * (CANVAS_W - 160);
        state.enemies.push(createEnemy("kamikaze", def, {
          x: spawnX,
          y: -30 - i * 30,
          vx: 0, vy: 0,
          locked: false,
          pulseTimer: 0,
        }));
      }
      break;
    }
    case "tank": {
      const onScreen = state.enemies.filter(e => e.type === "tank").length;
      if (onScreen >= 1) break;
      state.enemies.push(createEnemy("tank", def, {
        x: 60 + Math.random() * (CANVAS_W - 120),
        y: -50,
        shootTimer: 240,
        turretAngle: 0,
      }));
      break;
    }
    case "minelayer": {
      state.enemies.push(createEnemy("minelayer", def, {
        x: Math.random() < 0.5 ? -20 : CANVAS_W + 20,
        y: 60 + Math.random() * 100,
        driftDir: 0,
        minesDropped: 0,
        mineTimer: 60,
      }));
      const ml = state.enemies[state.enemies.length - 1];
      ml.driftDir = ml.x < 0 ? 1 : -1;
      break;
    }
    case "splitter": {
      state.enemies.push(createEnemy("splitter", def, {
        x: 40 + Math.random() * (CANVAS_W - 80),
        y: -30,
        pulseTimer: 0,
      }));
      break;
    }
    case "dasher": {
      state.enemies.push(createEnemy("dasher", def, {
        x: 60 + Math.random() * (CANVAS_W - 120),
        y: -20,
        state: "pause",
        stateTimer: 0,
        dashDir: 0,
        chargeGlow: 0,
      }));
      break;
    }
    case "summoner": {
      const onScreen = state.enemies.filter(e => e.type === "summoner").length;
      if (onScreen >= 1) break;
      state.enemies.push(createEnemy("summoner", def, {
        x: 60 + Math.random() * (CANVAS_W - 120),
        y: -40,
        summonTimer: 120,
        orbAngle: 0,
      }));
      break;
    }
    case "phantom": {
      const onScreen = state.enemies.filter(e => e.type === "phantom").length;
      if (onScreen >= 2) break;
      state.enemies.push(createEnemy("phantom", def, {
        x: 60 + Math.random() * (CANVAS_W - 120),
        y: -30,
        visible: true,
        alpha: 1,
        visTimer: 0,
        phase: Math.random() * Math.PI * 2,
        shootTimer: 180,
      }));
      break;
    }
  }
}

function createEnemy(type, def, extra) {
  return {
    type,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    coins: def.coins,
    distBonus: def.distBonus,
    hitRadius: def.hitRadius,
    accent: def.accent,
    accentLight: def.accentLight,
    timer: 0,
    ...extra,
  };
}

// ─── AI UPDATE ───
export function updateEnemies(state, dt = 1, enemySlowFactor = 1) {
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.timer += dt * enemySlowFactor;

    switch (e.type) {
      case "viper":
        e.y += e.speed * dt * enemySlowFactor;
        e.x += Math.sin(e.timer * 0.067 + (e.phaseOffset || 0)) * 2 * dt * enemySlowFactor;
        break;

      case "gnat":
        e.y += e.speed * dt * enemySlowFactor;
        // Drift toward player x
        const gnatDx = state.player.x - e.x;
        e.x += Math.sign(gnatDx) * 0.3 * dt * enemySlowFactor;
        // Wobble
        e.x += (Math.random() - 0.5) * 2 * dt * enemySlowFactor;
        break;

      case "warper":
        e.teleportTimer -= dt * enemySlowFactor;
        e.shootTimer -= dt * enemySlowFactor;

        // Fade afterimage
        if (e.afterimageAlpha > 0) e.afterimageAlpha -= 0.02 * dt;

        // Shoot at player
        if (e.shootTimer <= 0 && e.visible) {
          const dx = state.player.x - e.x;
          const dy = state.player.y - e.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            for (let s = 0; s < 2; s++) {
              const spread = (s - 0.5) * 0.15;
              const angle = Math.atan2(dy, dx) + spread;
              state.enemyProjectiles.push({
                x: e.x, y: e.y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                radius: 3, color: "#50ff40",
                lifetime: 300,
              });
            }
            state.sfx.bossShoot = true;
          }
          e.shootTimer = 90;
        }

        // Teleport
        if (e.teleportTimer <= 0) {
          e.prevX = e.x;
          e.prevY = e.y;
          e.afterimageAlpha = 0.3;
          e.x = 60 + Math.random() * (CANVAS_W - 120);
          e.y = 80 + Math.random() * (CANVAS_H * 0.4);
          e.teleportTimer = 120;
          e.shootTimer = 30; // shoot shortly after teleport
        }
        break;

      case "bomber":
        e.y += e.speed * dt * enemySlowFactor;
        e.mineTimer -= dt * enemySlowFactor;

        if (e.mineTimer <= 0 && e.y > 0 && e.y < CANVAS_H - 100) {
          // Drop mine — mines are stored in enemies array as a special type
          const mineCount = state.enemies.filter(m => m.type === "mine").length;
          if (mineCount < 3) {
            state.enemies.push({
              type: "mine",
              x: e.x, y: e.y,
              hp: 1, maxHp: 1,
              speed: 0, coins: 0, distBonus: 0,
              hitRadius: 7, accent: "#dd8800", accentLight: "#ffaa00",
              timer: 0,
              fuseTime: 300, // 5 sec
              pulse: 0,
              isMine: true,
            });
          }
          e.mineTimer = 180;
        }
        break;

      case "mine":
        // timer already incremented above
        e.pulse += 0.1 * dt * enemySlowFactor;
        if (e.timer >= e.fuseTime) {
          // Explode
          spawnParticles(state, e.x, e.y, 20, "#ff8800", 4);
          state.sfx.explosionLarge = true;
          // Damage player if close
          const mdx = state.player.x - e.x;
          const mdy = state.player.y - e.y;
          if (Math.sqrt(mdx * mdx + mdy * mdy) < 40 && state.invincibleTimer <= 0 && state.activeEffects.shield <= 0) {
            applyPlayerDamage(state, state.sfx);
          }
          state.shakeTimer = Math.max(state.shakeTimer, 5);
          state.enemies.splice(i, 1);
          continue;
        }
        break;

      case "elite": {
        // Enter screen first
        if (!e.enteredScreen) {
          e.y += 2 * dt * enemySlowFactor;
          if (e.y >= 60) { e.enteredScreen = true; }
          break;
        }
        // Arc movement
        e.x = CANVAS_W / 2 + Math.sin(e.timer * 0.02 + (e.phaseOffset || 0)) * 80;
        e.y = 100 + Math.sin(e.timer * 0.015) * 30;

        e.shootTimer -= dt * enemySlowFactor;
        if (e.shootTimer <= 0) {
          const dx = state.player.x - e.x;
          const dy = state.player.y - e.y;
          const angle = Math.atan2(dy, dx);
          state.enemyProjectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            radius: 4, color: "#9955ee",
            lifetime: 300,
            homing: true, homingFrames: 60,
            homingRate: Math.PI / 180,
          });
          state.sfx.bossShoot = true;
          e.shootTimer = 150;
        }
        break;
      }

      case "carrier": {
        // Enter screen
        if (!e.enteredScreen) {
          e.y += 1 * dt * enemySlowFactor;
          if (e.y >= e.targetY) { e.y = e.targetY; e.enteredScreen = true; }
          break;
        }
        // Drift left/right
        e.x += e.driftDir * 0.3 * dt * enemySlowFactor;
        if (e.x < 80) e.driftDir = 1;
        if (e.x > CANVAS_W - 80) e.driftDir = -1;

        // Spawn gnats
        e.spawnTimer -= dt * enemySlowFactor;
        if (e.spawnTimer <= 0) {
          // Clean dead gnats from tracking
          e.spawnedGnats = e.spawnedGnats.filter(id => state.enemies.some(en => en._id === id));
          if (e.spawnedGnats.length < 6) {
            for (let g = 0; g < 2; g++) {
              const gnatDef = ENEMY_DEFS.gnat;
              const gnat = createEnemy("gnat", gnatDef, {
                x: e.x + (g === 0 ? -15 : 15),
                y: e.y + 20,
                isLeader: false,
                carrierSpawned: true,
                _id: Math.random().toString(36).slice(2),
              });
              gnat.carrierId = e._id || (e._id = Math.random().toString(36).slice(2));
              state.enemies.push(gnat);
              e.spawnedGnats.push(gnat._id);
            }
          }
          e.spawnTimer = 240;
        }

        // Fire spread shots
        e.shootTimer -= dt * enemySlowFactor;
        if (e.shootTimer <= 0) {
          for (let s = -1; s <= 1; s++) {
            state.enemyProjectiles.push({
              x: e.x + s * 20, y: e.y + 30,
              vx: s * 0.8, vy: 3,
              w: 4, h: 6, color: "#5588cc",
              lifetime: 300,
              isRect: true,
            });
          }
          state.sfx.bossShoot = true;
          e.shootTimer = 360;
        }
        break;
      }

      case "sniper": {
        // Enter screen first
        if (!e.enteredScreen) {
          e.y += 2 * dt * enemySlowFactor;
          if (e.y >= 40 + (e.x % 30)) { e.enteredScreen = true; }
          break;
        }
        // Stays at top, aims at player
        e.aimTimer += dt * enemySlowFactor;
        e.aimX = state.player.x;
        e.aimY = state.player.y;

        if (e.aimTimer >= 120) {
          // Fire precise shot
          const dx = e.aimX - e.x;
          const dy = e.aimY - e.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            state.enemyProjectiles.push({
              x: e.x, y: e.y,
              vx: (dx / len) * 7,
              vy: (dy / len) * 7,
              radius: 4, color: "#ff3333",
              lifetime: 200,
            });
            state.sfx.bossShoot = true;
          }
          e.aimTimer = 0;
        }
        break;
      }

      case "kamikaze": {
        e.pulseTimer += dt * enemySlowFactor * 0.1;
        if (!e.locked) {
          // Lock direction toward player
          const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
          e.vx = Math.cos(angle) * 6;
          e.vy = Math.sin(angle) * 6;
          e.locked = true;
        }
        e.x += e.vx * dt * enemySlowFactor;
        e.y += e.vy * dt * enemySlowFactor;
        break;
      }

      case "tank": {
        e.y += e.speed * dt * enemySlowFactor;
        e.turretAngle += 0.01 * dt * enemySlowFactor;

        e.shootTimer -= dt * enemySlowFactor;
        if (e.shootTimer <= 0 && e.y > 0) {
          // Fire heavy slow shot straight down
          state.enemyProjectiles.push({
            x: e.x, y: e.y + 20,
            vx: 0, vy: 2.5,
            radius: 6, color: "#887766",
            lifetime: 400,
          });
          state.sfx.bossShoot = true;
          e.shootTimer = 240;
        }
        break;
      }

      case "minelayer": {
        // Drift side to side
        e.x += e.driftDir * e.speed * dt * enemySlowFactor;
        e.y += 0.3 * dt * enemySlowFactor;

        // Bounce off edges
        if (e.x < 20) e.driftDir = 1;
        if (e.x > CANVAS_W - 20) e.driftDir = -1;

        // Drop mines
        e.mineTimer -= dt * enemySlowFactor;
        if (e.mineTimer <= 0 && e.minesDropped < 4) {
          state.enemies.push({
            type: "mine",
            x: e.x, y: e.y + 10,
            hp: 1, maxHp: 1,
            speed: 0, coins: 0, distBonus: 0,
            hitRadius: 7, accent: "#dd8800", accentLight: "#ffaa00",
            timer: 0,
            fuseTime: 300,
            pulse: 0,
            isMine: true,
          });
          e.minesDropped++;
          e.mineTimer = 60;
        }
        break;
      }

      case "splitter": {
        e.y += e.speed * dt * enemySlowFactor;
        e.x += Math.sin(e.timer * 0.04) * 1.5 * dt * enemySlowFactor;
        e.pulseTimer += dt * 0.05;
        break;
      }

      case "splitter_child": {
        e.x += (e.vx || 0) * dt * enemySlowFactor;
        e.y += (e.vy || 0) * dt * enemySlowFactor;
        break;
      }

      case "dasher": {
        e.stateTimer += dt * enemySlowFactor;
        // Always drift down slowly
        e.y += 0.5 * dt * enemySlowFactor;

        if (e.state === "pause") {
          e.chargeGlow = Math.min(1, e.chargeGlow + 0.02 * dt);
          if (e.stateTimer > 60) {
            e.state = "dash";
            e.stateTimer = 0;
            e.dashDir = Math.random() < 0.5 ? -1 : 1;
            e.chargeGlow = 0;
          }
        } else if (e.state === "dash") {
          e.x += e.dashDir * 8 * dt * enemySlowFactor;
          // Bounce off walls during dash
          if (e.x < 20) { e.x = 20; e.dashDir = 1; }
          if (e.x > CANVAS_W - 20) { e.x = CANVAS_W - 20; e.dashDir = -1; }
          if (e.stateTimer > 60) {
            e.state = "pause";
            e.stateTimer = 0;
          }
        }
        break;
      }

      case "summoner": {
        e.y += e.speed * dt * enemySlowFactor;
        e.x += Math.sin(e.timer * 0.02) * 0.8 * dt * enemySlowFactor;
        e.orbAngle += 0.03 * dt * enemySlowFactor;

        e.summonTimer -= dt * enemySlowFactor;
        if (e.summonTimer <= 0 && e.y > 0) {
          // Cap summoned gnats at 6 (same as carrier)
          const summonedCount = state.enemies.filter(en => en.summonerSpawned).length;
          if (summonedCount < 6) {
            const gnatDef = ENEMY_DEFS.gnat;
            for (let g = 0; g < 2; g++) {
              state.enemies.push(createEnemy("gnat", gnatDef, {
                x: e.x + (g === 0 ? -15 : 15),
                y: e.y + 10,
                isLeader: false,
                summonerSpawned: true,
              }));
            }
            spawnParticles(state, e.x, e.y, 8, "#aa44ff", 2);
          }
          e.summonTimer = 180;
        }
        break;
      }

      case "phantom": {
        e.visTimer += dt * enemySlowFactor;
        if (e.visTimer > 90) {
          e.visible = !e.visible;
          e.visTimer = 0;
        }
        // Alpha fade in/out
        if (e.visible) {
          e.alpha = Math.min(1, e.alpha + 0.05 * dt);
        } else {
          e.alpha = Math.max(0.15, e.alpha - 0.05 * dt);
        }

        // Sine wave movement
        e.x += Math.sin(e.timer * 0.03 + e.phase) * 2 * dt * enemySlowFactor;
        e.y += 1.5 * dt * enemySlowFactor;

        // Shoot when visible
        e.shootTimer -= dt * enemySlowFactor;
        if (e.shootTimer <= 0 && e.alpha > 0.5 && e.y > 0) {
          const dx = state.player.x - e.x;
          const dy = state.player.y - e.y;
          const angle = Math.atan2(dy, dx);
          state.enemyProjectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 3.5,
            vy: Math.sin(angle) * 3.5,
            radius: 3, color: "#aaaacc",
            lifetime: 250,
          });
          state.sfx.bossShoot = true;
          e.shootTimer = 180;
        }
        break;
      }
    }

    // Remove off-screen — stationary types (warper, carrier, sniper, tank) handled separately
    const stationaryTypes = ["warper", "carrier", "mine", "elite", "sniper"];
    if (!stationaryTypes.includes(e.type)) {
      if (e.y > CANVAS_H + 50 || e.y < -200 || e.x < -100 || e.x > CANVAS_W + 100) {
        state.enemies.splice(i, 1);
        continue;
      }
    }
    // Remove warper/sniper if around too long
    if ((e.type === "warper" || e.type === "sniper") && e.timer > 900) {
      state.enemies.splice(i, 1);
    }
  }
}

// ─── ENEMY PROJECTILE UPDATE ───
export function updateEnemyProjectiles(state, dt = 1, enemySlowFactor = 1) {
  for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
    const p = state.enemyProjectiles[i];

    // Homing
    if (p.homing && p.homingFrames > 0) {
      p.homingFrames -= dt * enemySlowFactor;
      const dx = state.player.x - p.x;
      const dy = state.player.y - p.y;
      const targetAngle = Math.atan2(dy, dx);
      const currentAngle = Math.atan2(p.vy, p.vx);
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turn = Math.max(-p.homingRate, Math.min(p.homingRate, diff * dt * enemySlowFactor));
      const newAngle = currentAngle + turn;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.vx = Math.cos(newAngle) * spd;
      p.vy = Math.sin(newAngle) * spd;
    }

    p.x += (p.vx || 0) * dt * enemySlowFactor;
    p.y += (p.vy || 0) * dt * enemySlowFactor;
    p.lifetime = (p.lifetime || 300) - dt;

    // Off-screen or expired
    if (p.lifetime <= 0 || p.y > CANVAS_H + 20 || p.y < -20 || p.x < -20 || p.x > CANVAS_W + 20) {
      state.enemyProjectiles.splice(i, 1);
      continue;
    }

    // Hit player
    const dx = p.x - state.player.x;
    const dy = p.y - state.player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 18 && state.invincibleTimer <= 0 && state.activeEffects.shield <= 0) {
      state.enemyProjectiles.splice(i, 1);
      if (applyPlayerDamage(state, state.sfx)) return;
    }
  }
}

// ─── BULLET-ENEMY COLLISIONS ───
export function checkBulletEnemyCollisions(state) {
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    const bRadius = b.size || 3;

    for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
      const e = state.enemies[ei];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      if (dx * dx + dy * dy < (e.hitRadius + bRadius) * (e.hitRadius + bRadius)) {
        state.bullets.splice(bi, 1);

        // Lightning chain
        if (b.type === "lightning" && b.chains > 0) {
          onLightningHit(state, b, e);
        }

        const dmg = Math.ceil(b.dmg || 1);

        // Elite shield absorbs damage first
        if (e.type === "elite" && e.shieldHP > 0) {
          e.shieldHP -= dmg;
          spawnParticles(state, b.x, b.y, 4, "#bb88ff", 1.5);
          if (e.shieldHP <= 0) {
            e.shieldHP = 0;
            // Purple particle burst when shield pops
            spawnParticles(state, e.x, e.y, 15, "#9955ee", 3);
          }
          break;
        }

        // Tank front shield — bullets from above are blocked
        if (e.type === "tank" && b.y < e.y && Math.abs(b.x - e.x) < 25) {
          spawnParticles(state, b.x, b.y, 3, "#aaaaaa", 1);
          break; // bullet destroyed, no damage
        }

        // Phantom — only takes damage when alpha > 0.5
        if (e.type === "phantom" && e.alpha <= 0.5) {
          break; // bullet passes through (destroyed but no damage)
        }

        e.hp -= dmg;
        spawnParticles(state, b.x, b.y, 3, e.accent, 1.5);

        // Dragon burn passive
        const burnPassive = getPremiumPassive(state._premiumSkinId);
        if (burnPassive?.type === "burn" && !e.burning) {
          e.burning = {
            dmg: burnPassive.value.dmg,
            duration: burnPassive.value.duration,
            tickInterval: burnPassive.value.tickInterval,
            lastTick: 0,
          };
        }

        if (e.hp <= 0) {
          destroyEnemy(state, e, ei);
        }
        break;
      }
    }
  }
}

function destroyEnemy(state, e, index) {
  // Death particles
  spawnParticles(state, e.x, e.y, 15, e.accent, 2.5);

  // Sound
  if (e.hitRadius > 20) state.sfx.explosionLarge = true;
  else state.sfx.explosionSmall = true;

  // Combo via centralized onKill (with coin value for pop animation)
  onKill(state, e.x, e.y, e.accent, e.distBonus, state.sfx, e.coins || 1);

  // Splitter death: spawn 4 children
  if (e.type === "splitter") {
    const childDef = ENEMY_DEFS.splitter_child;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      state.enemies.push(createEnemy("splitter_child", childDef, {
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3 + 1,
      }));
    }
    spawnParticles(state, e.x, e.y, 12, "#ffaa00", 3);
  }

  // Carrier death: kill all spawned gnats
  if (e.type === "carrier" && e.spawnedGnats) {
    for (let gi = state.enemies.length - 1; gi >= 0; gi--) {
      if (state.enemies[gi].carrierId === e._id) {
        spawnParticles(state, state.enemies[gi].x, state.enemies[gi].y, 8, "#00cc88", 2);
        state.enemies.splice(gi, 1);
      }
    }
  }

  // 10% powerup drop
  if (Math.random() < 0.10 && e.type !== "mine") {
    const pType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    state.powerups.push({
      x: e.x, y: e.y,
      type: pType.type, color: pType.color, duration: pType.duration,
      vy: 1.5, pulse: 0,
    });
  }

  state.enemies.splice(index, 1);
}

// ─── PLAYER-ENEMY COLLISIONS ───
export function checkPlayerEnemyCollisions(state) {
  if (state.invincibleTimer > 0 || state.activeEffects.shield > 0) return;

  for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
    const e = state.enemies[ei];
    if (e.type === "mine") continue; // mines don't body-collide, they explode on timer
    if (e.type === "splitter_child" && e.timer < 5) continue; // brief invulnerability after split
    const dx = state.player.x - e.x;
    const dy = state.player.y - e.y;
    if (Math.sqrt(dx * dx + dy * dy) < e.hitRadius + state.player.w * 0.6) {
      // Destroy the enemy on contact
      spawnParticles(state, e.x, e.y, 10, e.accent, 2);
      state.enemies.splice(ei, 1);

      if (applyPlayerDamage(state, state.sfx)) return;
      break;
    }
  }
}
