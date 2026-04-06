import {
  CANVAS_W, CANVAS_H, PLAYER_SPEED, BULLET_SPEED, BULLET_RADIUS,
  FIRE_RATE_MS, INITIAL_LIVES, MAX_LIVES, INVINCIBLE_FRAMES,
  WAVE_DURATION_FRAMES, METEOR_TYPES, POWERUP_TYPES,
} from "./constants.js";
import { MILESTONES } from "../data/milestones.js";
import { getBossForDistance } from "../data/bosses.js";
import { updateBoss } from "./bossAI.js";
import { drawBoss, drawBossProjectiles, drawBossWarning, drawBossHPBar, drawBossDefeated } from "./bossRenderer.js";
import { formatDistance } from "../utils/formatDistance.js";
import { getWeapon } from "../data/weapons.js";

const BASE_DISTANCE_PER_FRAME = 8333; // ~500,000 km per second at 60fps

const DIFFICULTY_TIERS = [
  { threshold: 0, speedMult: 1, spawnMult: 1 },
  { threshold: 10_000_000, speedMult: 1.1, spawnMult: 1.1 },
  { threshold: 50_000_000, speedMult: 1.2, spawnMult: 1.2 },
  { threshold: 150_000_000, speedMult: 1.3, spawnMult: 1.3 },
  { threshold: 500_000_000, speedMult: 1.4, spawnMult: 1.4 },
];

function generateMeteorShape(radius) {
  const pts = [];
  const n = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    const r = radius * (0.7 + Math.random() * 0.35);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  const craters = [];
  const nc = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < nc; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * radius * 0.5;
    craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: radius * (0.12 + Math.random() * 0.15) });
  }
  return { pts, craters };
}

export function createGameState() {
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    s: Math.random() * 1.2 + 0.3,
    speed: Math.random() * 0.4 + 0.1,
    hue: Math.random() > 0.85 ? 190 + Math.random() * 50 : 0,
  }));

  return {
    player: { x: CANVAS_W / 2, y: CANVAS_H - 80, w: 28, h: 36, targetX: CANVAS_W / 2 },
    bullets: [],
    meteors: [],
    powerups: [],
    particles: [],
    stars,
    lives: INITIAL_LIVES,
    distance: 0,
    wave: 1,
    kills: 0,
    waveFrame: 0,
    milestoneIndex: 0,
    milestoneNotification: null,
    milestoneNotificationTimer: 0,
    invincibleTimer: 0,
    lastFireTime: 0,
    touching: false,
    touchX: CANVAS_W / 2,
    combo: 0,
    comboTimer: 0,
    comboMultiplier: 1,
    shakeTimer: 0,
    shakeX: 0,
    shakeY: 0,
    activeEffects: { shield: 0, rapid: 0, triple: 0 },
    powerupsCollected: 0,
    noHitWaves: 0,
    wasHitThisWave: false,
    gameOver: false,
    frame: 0,
    // Boss fight state
    bossActive: null,
    bossHP: 0,
    bossMaxHP: 0,
    bossX: CANVAS_W / 2,
    bossY: -60,
    bossState: "none",      // none | warning | entering | fighting | dying | dead
    bossTimer: 0,
    bossPhase: 1,
    bossProjectiles: [],
    bossWarningTimer: 0,
    bossInvulnerable: false,
    bossDefeatedList: [],
    bossSpecific: {},
    bossDamageMultiplier: 1,
    bossWhiteFlash: 0,
    bossHitFlash: 0,
    bossDisplayHP: 0,
    bossCoinsEarned: 0,
    meteorSpawningEnabled: true,
    // Weapon
    weaponId: "blaster",
    weaponLevel: 0,
    // Sound event flags (consumed each frame by GameScreen)
    sfx: { shoot: false, explosionSmall: false, explosionLarge: false, powerup: false, playerHit: false, combo: false, waveStart: false, milestone: false, gameOver: false, bossWarning: false, bossShoot: false, bossHit: false, bossExplosionSmall: false, bossExplosionLarge: false, bossDefeated: false },
  };
}

export function spawnMeteor(state, distanceSpeedMult = 1) {
  const w = state.wave;
  const typeWeights = [5, w > 2 ? 3 : 0, w > 4 ? 2 : 0];
  const total = typeWeights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let typeIdx = 0;
  for (let i = 0; i < typeWeights.length; i++) {
    r -= typeWeights[i];
    if (r <= 0) { typeIdx = i; break; }
  }
  const type = METEOR_TYPES[typeIdx];
  const waveSpeedMult = 1 + (w - 1) * 0.12;
  const shape = generateMeteorShape(type.radius);

  state.meteors.push({
    x: type.radius + Math.random() * (CANVAS_W - type.radius * 2),
    y: -type.radius * 2,
    radius: type.radius,
    hp: type.hp,
    maxHp: type.hp,
    speed: type.speed * waveSpeedMult * distanceSpeedMult,
    bonusDistance: type.bonusDistance,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    shape,
    hue: 15 + Math.random() * 25,
  });
}

export function spawnParticles(state, x, y, count, color, sizeBase) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = Math.random() * 3 + 1;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: (sizeBase || 2) * (0.5 + Math.random()),
      color,
    });
  }
}

export function updateGame(state, dt) {
  if (state.gameOver) return;
  state.frame++;
  const now = performance.now();

  // Reset sound flags each frame
  const sfx = state.sfx;
  sfx.shoot = false; sfx.explosionSmall = false; sfx.explosionLarge = false;
  sfx.powerup = false; sfx.playerHit = false; sfx.combo = false;
  sfx.waveStart = false; sfx.milestone = false; sfx.gameOver = false;
  sfx.bossWarning = false; sfx.bossShoot = false; sfx.bossHit = false;
  sfx.bossExplosionSmall = false; sfx.bossExplosionLarge = false; sfx.bossDefeated = false;

  // Distance accumulation (paused during boss fight)
  if (!state.bossActive) {
    state.distance += BASE_DISTANCE_PER_FRAME;
  }

  // Milestone check
  if (state.milestoneIndex < MILESTONES.length) {
    const next = MILESTONES[state.milestoneIndex];
    if (state.distance >= next.distance) {
      state.milestoneNotification = `${next.name.toUpperCase()} ORBIT REACHED`;
      state.milestoneNotificationTimer = 120; // 2 seconds at 60fps
      spawnParticles(state, CANVAS_W / 2, CANVAS_H / 2, 20, "#00aaff", 3);
      state.milestoneIndex++;
      sfx.milestone = true;
    }
  }

  // Milestone notification decay
  if (state.milestoneNotificationTimer > 0) {
    state.milestoneNotificationTimer--;
    if (state.milestoneNotificationTimer <= 0) {
      state.milestoneNotification = null;
    }
  }

  // ─── BOSS TRIGGER ───
  if (!state.bossActive && state.bossState === "none") {
    const boss = getBossForDistance(state.distance, state.bossDefeatedList);
    if (boss) {
      state.meteorSpawningEnabled = false;
      state.meteors = [];
      state.bossWarningTimer = 180;
      state.bossActive = boss;
      state.bossHP = boss.hp;
      state.bossMaxHP = boss.hp;
      state.bossDisplayHP = boss.hp;
      state.bossHitFlash = 0;
      state.bossState = "warning";
      state.bossTimer = 0;
      state.bossPhase = 1;
      state.bossProjectiles = [];
      state.bossInvulnerable = false;
      state.bossSpecific = {};
      state.bossDamageMultiplier = 1;
      state.bossX = CANVAS_W / 2;
      state.bossY = -60;
      state.bossEntranceTimer = 0;
      state.bossPrevPhase = 1;
      state.bossPhaseTransitionTimer = 0;
      state.bossDefeatFreezeTimer = 0;
      state.bossDefeatFlashTimer = 0;
      state.bossDefeatTextTimer = 0;
      sfx.bossWarning = true;
    }
  }

  // ─── BOSS UPDATE ───
  if (state.bossActive) {
    if (state.bossState === "warning") {
      state.bossWarningTimer--;
      if (state.bossWarningTimer <= 0) {
        state.bossState = "entering";
        state.bossEntranceTimer = 0;
      }
    }

    if (state.bossState === "entering") {
      state.bossEntranceTimer = (state.bossEntranceTimer || 0) + 1;
      // Player is invincible during entrance
      state.invincibleTimer = Math.max(state.invincibleTimer, 2);
      state.bossY += 1.5;
      state.bossInvulnerable = true;
      if (state.bossY >= 100) {
        state.bossY = 100;
        state.bossState = "fighting";
        state.bossInvulnerable = false;
        state.bossTimer = 0;
      }
    }

    // Phase transition effect — timer only, invulnerability applied after AI update
    if (state.bossPhaseTransitionTimer > 0) {
      state.bossPhaseTransitionTimer--;
      // Screen shake for first 5 frames
      if (state.bossPhaseTransitionTimer > 55) {
        state.shakeTimer = Math.max(state.shakeTimer, 2);
      }
    }

    // Decay hit flash and smooth HP bar
    if (state.bossHitFlash > 0) state.bossHitFlash--;
    if (state.bossActive) {
      if (state.bossDisplayHP === 0) state.bossDisplayHP = state.bossHP;
      state.bossDisplayHP += (state.bossHP - state.bossDisplayHP) * 0.1;
    }

    if (state.bossState === "fighting") {
      // Build boss AI state
      const bossAIState = {
        bossX: state.bossX,
        bossY: state.bossY,
        bossHP: state.bossHP,
        bossMaxHP: state.bossMaxHP,
        bossTimer: state.bossTimer,
        bossPhase: state.bossPhase,
        bossProjectiles: state.bossProjectiles,
        bossSpecific: state.bossSpecific,
        bossInvulnerable: state.bossInvulnerable,
        bossDamageMultiplier: state.bossDamageMultiplier,
        playerX: state.player.x,
        playerY: state.player.y,
        canvasW: CANVAS_W,
        canvasH: CANVAS_H,
        sfxBossShoot: false,
        // Damage flags from boss AI
        flameHitPlayer: false,
        poolHitPlayer: false,
        shockwaveHitPlayer: false,
        lightningHitPlayer: false,
        orbHitPlayer: false,
        segmentHitPlayer: false,
        iceHitPlayer: false,
        tentacleHitPlayer: false,
        miniCreatureHitPlayer: false,
        gravityPullX: 0,
        gravityPullY: 0,
      };

      const result = updateBoss(state.bossActive, bossAIState);

      // Write back
      state.bossX = result.bossX;
      state.bossY = result.bossY;
      state.bossTimer = result.bossTimer;
      state.bossPhase = result.bossPhase;
      state.bossProjectiles = result.bossProjectiles;
      state.bossSpecific = result.bossSpecific;
      state.bossInvulnerable = result.bossInvulnerable;
      state.bossDamageMultiplier = result.bossDamageMultiplier || 1;

      if (result.sfxBossShoot) sfx.bossShoot = true;

      // Detect phase transition
      if (state.bossPhase !== state.bossPrevPhase) {
        state.bossPhaseTransitionTimer = 60; // 1 sec transition
        state.shakeTimer = 5;
        state.bossHitFlash = 3;
        state.bossPrevPhase = state.bossPhase;
      }

      // Phase transition invulnerability — overrides AI for 1 second, then AI takes over
      if (state.bossPhaseTransitionTimer > 0) {
        state.bossInvulnerable = true;
      }

      // Apply gravity pull from boss — HORIZONTAL ONLY
      if (result.gravityPullX) {
        state.player.x += result.gravityPullX;
        state.player.x = Math.max(state.player.w, Math.min(CANVAS_W - state.player.w, state.player.x));
        state.player.targetX = state.player.x;
      }
      // NEVER modify player.y — player stays locked at bottom
      // gravityPullY is intentionally ignored to prevent vertical movement bug
      state.player.y = CANVAS_H - 80;

      // Check if boss AI flagged player damage
      const hitFlags = [
        result.flameHitPlayer, result.poolHitPlayer, result.shockwaveHitPlayer,
        result.lightningHitPlayer, result.orbHitPlayer, result.segmentHitPlayer,
        result.iceHitPlayer, result.tentacleHitPlayer, result.miniCreatureHitPlayer,
      ];
      if (hitFlags.some(Boolean) && state.invincibleTimer <= 0 && state.activeEffects.shield <= 0) {
        state.lives--;
        state.invincibleTimer = INVINCIBLE_FRAMES;
        state.shakeTimer = 10;
        state.wasHitThisWave = true;
        sfx.playerHit = true;
        spawnParticles(state, state.player.x, state.player.y, 12, "#ff4444", 2);
        if (state.vibrationEnabled && navigator.vibrate) navigator.vibrate(50);
        if (state.lives <= 0) {
          state.gameOver = true;
          sfx.gameOver = true;
          return;
        }
      }

      // Boss projectiles update & player collision
      for (let pi = state.bossProjectiles.length - 1; pi >= 0; pi--) {
        const p = state.bossProjectiles[pi];
        p.x += p.vx || 0;
        p.y += p.vy || 0;
        p.lifetime = (p.lifetime || 300) - 1;

        // Homing missiles
        if (p.homing) {
          const dx = state.player.x - p.x;
          const dy = state.player.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            p.vx += (dx / len) * 0.1;
            p.vy += (dy / len) * 0.1;
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 2.5) { p.vx = (p.vx / speed) * 2.5; p.vy = (p.vy / speed) * 2.5; }
          }
        }

        if (p.lifetime <= 0 || p.y > CANVAS_H + 20 || p.y < -20 || p.x < -20 || p.x > CANVAS_W + 20) {
          state.bossProjectiles.splice(pi, 1);
          continue;
        }

        const dx = p.x - state.player.x;
        const dy = p.y - state.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 18 && state.invincibleTimer <= 0 && state.activeEffects.shield <= 0) {
          state.lives--;
          state.invincibleTimer = INVINCIBLE_FRAMES;
          state.shakeTimer = 10;
          sfx.playerHit = true;
          if (state.vibrationEnabled && navigator.vibrate) navigator.vibrate(80);
          spawnParticles(state, state.player.x, state.player.y, 20, "#ff0044", 4);
          state.bossProjectiles.splice(pi, 1);
          if (state.lives <= 0) {
            state.gameOver = true;
            sfx.gameOver = true;
            return;
          }
        }
      }

      // Player bullets hit boss
      for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
        const b = state.bullets[bi];

        // Check sub-targets first (turrets, drones, tentacles) — they consume the bullet
        if (handleBossSubTargetHit(state, b)) {
          state.bullets.splice(bi, 1);
          sfx.bossHit = true;
          state.shakeTimer = 2;
          state.bossHitFlash = 3;
          if (state.bossHP <= 0) {
            state.bossHP = 0;
            state.bossState = "dying";
            state.bossTimer = 0;
          }
          continue;
        }

        const dx = b.x - state.bossX;
        const dy = b.y - state.bossY;
        const hitRadius = state.bossActive.hitRadius || 40;

        if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
          state.bullets.splice(bi, 1);
          if (!state.bossInvulnerable) {
            const bulletDmg = b.dmg || 1;
            const dmg = Math.floor(10 * bulletDmg * (state.bossDamageMultiplier || 1));
            state.bossHP -= dmg;
            spawnParticles(state, b.x, b.y, 5, state.bossActive.color, 2);
            sfx.bossHit = true;
            state.shakeTimer = 2;
            state.bossHitFlash = 3;

            if (state.bossHP <= 0) {
              state.bossHP = 0;
              state.bossState = "dying";
              state.bossTimer = 0;
            }
          } else {
            // Blocked
            spawnParticles(state, b.x, b.y, 2, "rgba(255,255,255,0.3)", 1);
          }
        }
      }

      // Also check bullets against sub-targets (drones, split wraiths, mini creatures, etc.)
      handleBulletSubTargets(state, sfx);
    }

    // Boss dying sequence — improved
    if (state.bossState === "dying") {
      state.bossTimer++;

      // Step 1: Freeze for 0.5 sec (30 frames)
      if (state.bossTimer <= 30) {
        // Boss frozen, no movement
      }
      // Step 2: Rapid white flashing (frames 30-60)
      else if (state.bossTimer <= 60) {
        if (state.bossTimer % 2 === 0) {
          state.bossHitFlash = 2;
        }
      }
      // Step 3: Small explosions building up
      else if (state.bossTimer <= 120) {
        if (state.bossTimer % 6 === 0) {
          const ex = state.bossX + (Math.random() - 0.5) * 80;
          const ey = state.bossY + (Math.random() - 0.5) * 60;
          spawnParticles(state, ex, ey, 15, state.bossActive.color, 5);
          spawnParticles(state, ex, ey, 10, state.bossActive.colorLight, 3);
          sfx.bossExplosionSmall = true;
          state.shakeTimer = 5;
        }
      }

      // Step 4: Final explosion
      if (state.bossTimer >= 120) {
        // Large explosion: 60 particles in boss accent + white
        spawnParticles(state, state.bossX, state.bossY, 60, state.bossActive.color, 6);
        spawnParticles(state, state.bossX, state.bossY, 30, "#ffffff", 4);
        sfx.bossExplosionLarge = true;
        sfx.bossDefeated = true;
        state.shakeTimer = 15; // screen shake 15 frames, intensity 8
        state.bossWhiteFlash = 30; // screen flash white, fades over 0.5 sec

        state.bossDefeatedList.push(state.bossActive.id);
        state.bossCoinsEarned += state.bossActive.reward;
        state.bossDefeatTextTimer = 120; // "BOSS DEFEATED" text for 2 sec

        state.bossState = "dead";
        state.bossTimer = 0;
      }
    }

    if (state.bossState === "dead") {
      state.bossTimer++;
      if (state.bossWhiteFlash > 0) state.bossWhiteFlash--;
      if (state.bossTimer >= 150) {
        // Resume normal gameplay
        state.bossActive = null;
        state.bossProjectiles = [];
        state.meteorSpawningEnabled = true;
        state.bossState = "none";
        // Reset player Y in case gravity beam moved it
        state.player.y = CANVAS_H - 80;
      }
    }
  }

  // Distance-based difficulty
  const tier = [...DIFFICULTY_TIERS].reverse().find(t => state.distance >= t.threshold) || DIFFICULTY_TIERS[0];

  // Player movement — X only, Y is ALWAYS locked
  if (state.touching) {
    state.player.targetX = state.touchX;
  }
  const sens = state.sensitivity || 1.0;
  state.player.x += (state.player.targetX - state.player.x) * 0.15 * sens;
  state.player.x = Math.max(state.player.w, Math.min(CANVAS_W - state.player.w, state.player.x));
  state.player.y = CANVAS_H - 80; // LOCKED — never changes

  // Auto-fire (weapon-aware)
  const weapon = getWeapon(state.weaponId);
  const wStats = weapon.levels[state.weaponLevel] || weapon.levels[0];
  const baseFireRate = wStats.fireRate;
  const fireRate = state.activeEffects.rapid > 0 ? baseFireRate / 2.5 : baseFireRate;
  if (state.touching && now - state.lastFireTime > fireRate) {
    state.lastFireTime = now;
    sfx.shoot = true;
    const px = state.player.x;
    const py = state.player.y - state.player.h;
    const bulletBase = { size: wStats.size, dmg: wStats.dmg, weaponId: state.weaponId };

    // Triple-shot powerup adds extra bullets
    const tripleActive = state.activeEffects.triple > 0;

    if (wStats.spread) {
      // Spread weapon
      const baseAngle = -Math.PI / 2;
      const spreadRad = (wStats.spread) * Math.PI / 180;
      for (let i = 0; i < wStats.bullets; i++) {
        const t = wStats.bullets === 1 ? 0 : (i / (wStats.bullets - 1)) - 0.5;
        const angle = baseAngle + t * spreadRad * 2;
        state.bullets.push({ x: px, y: py, vx: Math.cos(angle) * wStats.speed, vy: Math.sin(angle) * wStats.speed, ...bulletBase });
      }
      if (tripleActive) {
        state.bullets.push({ x: px - 8, y: py + 4, vx: -1.2, vy: -wStats.speed, ...bulletBase });
        state.bullets.push({ x: px + 8, y: py + 4, vx: 1.2, vy: -wStats.speed, ...bulletBase });
      }
    } else if (wStats.homing) {
      // Homing missiles
      for (let i = 0; i < wStats.bullets; i++) {
        const offsetX = wStats.bullets > 1 ? (i - (wStats.bullets - 1) / 2) * 12 : 0;
        state.bullets.push({ x: px + offsetX, y: py, vx: 0, vy: -wStats.speed, ...bulletBase, homing: true, turnRate: wStats.turnRate, smokeTimer: 0 });
      }
      if (tripleActive) {
        state.bullets.push({ x: px - 8, y: py + 4, vx: -1.2, vy: -wStats.speed, ...bulletBase, homing: true, turnRate: wStats.turnRate, smokeTimer: 0 });
        state.bullets.push({ x: px + 8, y: py + 4, vx: 1.2, vy: -wStats.speed, ...bulletBase, homing: true, turnRate: wStats.turnRate, smokeTimer: 0 });
      }
    } else if (wStats.beam) {
      // Beam rifle — fast bullets
      for (let i = 0; i < wStats.bullets; i++) {
        const offsetX = wStats.bullets > 1 ? (i - (wStats.bullets - 1) / 2) * 6 : 0;
        state.bullets.push({ x: px + offsetX, y: py, vx: 0, vy: -wStats.speed, ...bulletBase, beam: true, beamWidth: wStats.beamWidth });
      }
      if (tripleActive) {
        state.bullets.push({ x: px - 8, y: py + 4, vx: -1.2, vy: -wStats.speed, ...bulletBase, beam: true, beamWidth: wStats.beamWidth });
        state.bullets.push({ x: px + 8, y: py + 4, vx: 1.2, vy: -wStats.speed, ...bulletBase, beam: true, beamWidth: wStats.beamWidth });
      }
    } else {
      // Normal weapons (blaster, rapid, plasma)
      for (let i = 0; i < wStats.bullets; i++) {
        const offsetX = wStats.bullets > 1 ? (i - (wStats.bullets - 1) / 2) * 10 : 0;
        state.bullets.push({ x: px + offsetX, y: py, vx: 0, vy: -wStats.speed, ...bulletBase });
      }
      if (tripleActive) {
        state.bullets.push({ x: px - 8, y: py + 4, vx: -1.2, vy: -wStats.speed, ...bulletBase });
        state.bullets.push({ x: px + 8, y: py + 4, vx: 1.2, vy: -wStats.speed, ...bulletBase });
      }
    }
  }

  // Bullets (with homing logic)
  state.bullets.forEach(b => {
    if (b.homing) {
      // Find nearest target
      let nearest = null, nearDist = Infinity;
      state.meteors.forEach(m => {
        const dx = m.x - b.x, dy = m.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearDist) { nearDist = d; nearest = m; }
      });
      if (state.bossActive && (state.bossState === "fighting" || state.bossState === "entering")) {
        const dx = state.bossX - b.x, dy = state.bossY - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearDist) { nearDist = d; nearest = { x: state.bossX, y: state.bossY }; }
      }
      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
        const currentAngle = Math.atan2(b.vy, b.vx);
        let diff = targetAngle - currentAngle;
        // Normalize to [-PI, PI]
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxTurn = (b.turnRate || 2) * 0.02;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
        const newAngle = currentAngle + turn;
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = Math.cos(newAngle) * spd;
        b.vy = Math.sin(newAngle) * spd;
      }
      // Smoke trail particles
      b.smokeTimer = (b.smokeTimer || 0) + 1;
      if (b.smokeTimer % 3 === 0) {
        state.particles.push({
          x: b.x, y: b.y,
          vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 0.5 + 0.2,
          life: 0.6, decay: 0.03, size: 2, color: "rgba(180,180,180,0.5)",
        });
      }
    }
    b.x += b.vx;
    b.y += b.vy;
  });
  state.bullets = state.bullets.filter(b => b.y > -10 && b.y < CANVAS_H + 10 && b.x > -10 && b.x < CANVAS_W + 10);

  // Waves
  state.waveFrame++;
  if (state.waveFrame >= WAVE_DURATION_FRAMES) {
    if (!state.wasHitThisWave) state.noHitWaves++;
    state.wasHitThisWave = false;
    state.waveFrame = 0;
    state.wave++;
    sfx.waveStart = true;
  }

  // Spawn meteors (distance-based difficulty affects spawn rate)
  if (state.meteorSpawningEnabled) {
    const baseSpawnRate = Math.max(15, 50 - state.wave * 4);
    const spawnRate = Math.max(10, Math.floor(baseSpawnRate / tier.spawnMult));
    if (state.frame % spawnRate === 0) {
      spawnMeteor(state, tier.speedMult);
    }
  }

  // Meteors
  state.meteors.forEach(m => {
    m.y += m.speed;
    m.rotation += m.rotSpeed;
  });

  // Bullet-meteor collisions
  for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
    const b = state.bullets[bi];
    const bRadius = b.size || BULLET_RADIUS;
    for (let mi = state.meteors.length - 1; mi >= 0; mi--) {
      const m = state.meteors[mi];
      const dx = b.x - m.x;
      const dy = b.y - m.y;
      if (dx * dx + dy * dy < (m.radius + bRadius) * (m.radius + bRadius)) {
        state.bullets.splice(bi, 1);
        m.hp -= (b.dmg || 1);
        spawnParticles(state, b.x, b.y, 3, `hsl(${m.hue},60%,60%)`, 1.5);

        if (m.hp <= 0) {
          spawnParticles(state, m.x, m.y, 15 + Math.floor(Math.random() * 6), `hsl(${m.hue},70%,55%)`, 2.5);

          // Sound: large meteor (radius > 20) vs small
          if (m.radius > 20) sfx.explosionLarge = true;
          else sfx.explosionSmall = true;

          // Combo
          state.combo++;
          state.comboTimer = 120;
          state.comboMultiplier = Math.min(3, 1 + Math.floor(state.combo / 3) * 0.5);
          state.distance += Math.floor(m.bonusDistance * state.comboMultiplier);
          state.kills++;

          // Combo sound at multiples of 5
          if (state.combo > 0 && state.combo % 5 === 0) sfx.combo = true;

          // Powerup drop
          if (Math.random() < 0.15) {
            const pType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            state.powerups.push({
              x: m.x, y: m.y,
              type: pType.type, color: pType.color, duration: pType.duration,
              vy: 1.5, pulse: 0,
            });
          }

          state.meteors.splice(mi, 1);
        }
        break;
      }
    }
  }

  // Player-meteor collisions
  if (state.invincibleTimer <= 0 && state.activeEffects.shield <= 0) {
    for (let mi = state.meteors.length - 1; mi >= 0; mi--) {
      const m = state.meteors[mi];
      const dx = state.player.x - m.x;
      const dy = state.player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < m.radius + state.player.w * 0.6) {
        state.lives--;
        state.invincibleTimer = INVINCIBLE_FRAMES;
        state.shakeTimer = 10;
        state.wasHitThisWave = true;
        sfx.playerHit = true;
        spawnParticles(state, state.player.x, state.player.y, 12, "#ff4444", 2);
        if (state.vibrationEnabled && navigator.vibrate) {
          navigator.vibrate(50);
        }
        state.meteors.splice(mi, 1);

        if (state.lives <= 0) {
          state.gameOver = true;
          sfx.gameOver = true;
          return;
        }
        break;
      }
    }
  }

  // Invincibility
  if (state.invincibleTimer > 0) state.invincibleTimer--;

  // Powerup collection
  for (let pi = state.powerups.length - 1; pi >= 0; pi--) {
    const p = state.powerups[pi];
    p.y += p.vy;
    p.pulse += 0.08;
    const dx = state.player.x - p.x;
    const dy = state.player.y - p.y;
    if (dx * dx + dy * dy < 900) {
      if (p.type === "life") {
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
      } else {
        state.activeEffects[p.type] = p.duration;
      }
      state.powerupsCollected++;
      sfx.powerup = true;
      spawnParticles(state, p.x, p.y, 10, p.color, 2);
      state.powerups.splice(pi, 1);
      continue;
    }
  }
  state.powerups = state.powerups.filter(p => p.y < CANVAS_H + 20);

  // Remove offscreen meteors
  state.meteors = state.meteors.filter(m => m.y < CANVAS_H + m.radius * 2);

  // Particles
  state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life -= p.decay; });
  state.particles = state.particles.filter(p => p.life > 0);

  // Stars drift
  state.stars.forEach(s => {
    s.y += s.speed;
    if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
  });

  // Combo decay
  if (state.comboTimer > 0) {
    state.comboTimer--;
  } else {
    state.combo = 0;
    state.comboMultiplier = 1;
  }

  // Active effects decay
  for (const key of Object.keys(state.activeEffects)) {
    if (state.activeEffects[key] > 0) {
      state.activeEffects[key] -= 16.67;
      if (state.activeEffects[key] < 0) state.activeEffects[key] = 0;
    }
  }

  // Screen shake — stronger during boss defeat
  if (state.shakeTimer > 0) {
    state.shakeTimer--;
    const shakeIntensity = (state.bossState === "dying" || state.bossState === "dead") ? 8 : 6;
    state.shakeX = (Math.random() - 0.5) * shakeIntensity;
    state.shakeY = (Math.random() - 0.5) * shakeIntensity;
  } else {
    state.shakeX = 0;
    state.shakeY = 0;
  }
}

function handleBossSubTargetHit(state, bullet) {
  const sp = state.bossSpecific;
  const boss = state.bossActive;
  if (!boss) return false;

  // Orbital Fortress: hit turrets first (priority over core)
  if (boss.id === "orbital_fortress" && sp.turrets) {
    for (const t of sp.turrets) {
      if (!t.alive) continue;
      const tx = state.bossX + t.x;
      const ty = state.bossY + t.y;
      const dx = bullet.x - tx;
      const dy = bullet.y - ty;
      if (Math.sqrt(dx * dx + dy * dy) < 14) {
        t.hp -= 10;
        spawnParticles(state, tx, ty, 5, boss.color, 2);
        if (t.hp <= 0) {
          t.alive = false;
          spawnParticles(state, tx, ty, 15, boss.color, 3);
          state.sfx.bossExplosionSmall = true;
        }
        return true;
      }
    }
  }

  // Void Leviathan: hit tentacles in ALL phases
  if (boss.id === "void_leviathan" && sp.tentacles) {
    for (const t of sp.tentacles) {
      if (!t.alive) continue;
      const angle = t.currentAngle || t.baseAngle;
      const tipX = state.bossX + Math.cos(angle) * t.length;
      const tipY = state.bossY + Math.sin(angle) * t.length;
      const dx = bullet.x - tipX;
      const dy = bullet.y - tipY;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        t.hp -= 10;
        spawnParticles(state, tipX, tipY, 5, boss.color, 2);
        if (t.hp <= 0) {
          t.alive = false;
          spawnParticles(state, tipX, tipY, 15, boss.color, 3);
          state.sfx.bossExplosionSmall = true;
        }
        return true;
      }
    }
  }

  return false;
}

function handleBulletSubTargets(state, sfx) {
  const sp = state.bossSpecific;
  const boss = state.bossActive;
  if (!boss) return;

  // Orbital Fortress: destroy shield drones
  if (boss.id === "orbital_fortress" && sp.drones) {
    for (const drone of sp.drones) {
      if (!drone.alive) continue;
      const droneX = state.bossX + Math.cos(drone.angle) * 55;
      const droneY = state.bossY + Math.sin(drone.angle) * 55;
      for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
        const b = state.bullets[bi];
        const dx = b.x - droneX;
        const dy = b.y - droneY;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          state.bullets.splice(bi, 1);
          drone.hp -= 10;
          spawnParticles(state, droneX, droneY, 3, boss.colorLight, 1.5);
          if (drone.hp <= 0) {
            drone.alive = false;
            drone.respawnTimer = 600;
            spawnParticles(state, droneX, droneY, 10, boss.colorLight, 2);
            sfx.explosionSmall = true;
          }
          break;
        }
      }
    }
  }


  // Void Leviathan: hit mini creatures
  if (boss.id === "void_leviathan" && sp.miniCreatures) {
    for (let mi = sp.miniCreatures.length - 1; mi >= 0; mi--) {
      const mc = sp.miniCreatures[mi];
      for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
        const b = state.bullets[bi];
        const dx = b.x - mc.x;
        const dy = b.y - mc.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
          state.bullets.splice(bi, 1);
          spawnParticles(state, mc.x, mc.y, 5, boss.colorLight, 1.5);
          sp.miniCreatures.splice(mi, 1);
          sfx.explosionSmall = true;
          break;
        }
      }
    }
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function renderGame(ctx, state, skin) {
  const { frame } = state;

  ctx.save();
  ctx.translate(state.shakeX, state.shakeY);

  // Background
  const bg = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 0, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.8);
  bg.addColorStop(0, "#080618");
  bg.addColorStop(0.5, "#060510");
  bg.addColorStop(1, "#020206");
  ctx.fillStyle = bg;
  ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

  // Stars
  state.stars.forEach(s => {
    ctx.globalAlpha = 0.5 + Math.sin(frame * 0.02 + s.x) * 0.2;
    const col = s.hue > 0 ? `hsl(${s.hue},60%,75%)` : "#cce0ff";
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Powerups
  state.powerups.forEach(p => {
    const pulseR = 10 + Math.sin(p.pulse) * 3;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseR + 8);
    glow.addColorStop(0, p.color + "55");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(p.x, p.y, pulseR + 8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.7 + Math.sin(p.pulse) * 0.3;
    ctx.beginPath(); ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Meteors
  state.meteors.forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rotation);

    // Body
    ctx.beginPath();
    ctx.moveTo(m.shape.pts[0].x, m.shape.pts[0].y);
    for (let i = 1; i < m.shape.pts.length; i++) {
      ctx.lineTo(m.shape.pts[i].x, m.shape.pts[i].y);
    }
    ctx.closePath();

    const mg = ctx.createRadialGradient(-m.radius * 0.2, -m.radius * 0.2, 0, 0, 0, m.radius);
    mg.addColorStop(0, `hsl(${m.hue},35%,40%)`);
    mg.addColorStop(0.6, `hsl(${m.hue},30%,25%)`);
    mg.addColorStop(1, `hsl(${m.hue},25%,12%)`);
    ctx.fillStyle = mg;
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = `hsla(${m.hue},20%,55%,0.3)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Craters
    m.shape.craters.forEach(c => {
      ctx.fillStyle = `hsla(${m.hue},20%,10%,0.4)`;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `hsla(${m.hue},15%,35%,0.2)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, Math.PI * 0.8, Math.PI * 1.8); ctx.stroke();
    });

    // HP indicator for multi-hit
    if (m.maxHp > 1) {
      const hpRatio = m.hp / m.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "rgba(0,255,100,0.4)" : "rgba(255,100,0,0.5)";
      ctx.fillRect(-m.radius * 0.5, m.radius + 4, m.radius * hpRatio, 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-m.radius * 0.5, m.radius + 4, m.radius, 2);
    }

    ctx.restore();
  });

  // Boss rendering (between meteors and bullets layer)
  if (state.bossActive) {
    // Subtle accent color screen tint during boss fight
    if (state.bossState === "fighting" || state.bossState === "dying") {
      ctx.globalAlpha = 0.02;
      ctx.fillStyle = state.bossActive.color;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    }

    if (state.bossState === "warning") {
      drawBossWarning(ctx, state.bossActive, state.bossWarningTimer);
    }
    if (state.bossState === "entering") {
      // Boss name text during entrance
      const entranceT = state.bossEntranceTimer || 0;
      if (entranceT < 90) {
        ctx.globalAlpha = entranceT < 60 ? Math.min(1, entranceT / 20) : Math.max(0, 1 - (entranceT - 60) / 30);
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 22px 'Sora', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(state.bossActive.name, CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.globalAlpha = 1;
      }
      drawBoss(ctx, state.bossActive, state);
    }
    if (state.bossState === "fighting" || state.bossState === "dying") {
      drawBoss(ctx, state.bossActive, state);
    }
    if (state.bossState === "fighting" || state.bossState === "dying") {
      drawBossProjectiles(ctx, state.bossProjectiles, state.bossActive);
    }

    // Phase transition text
    if (state.bossPhaseTransitionTimer > 0) {
      const pt = state.bossPhaseTransitionTimer;
      ctx.globalAlpha = pt > 90 ? 1 : pt / 90;
      ctx.fillStyle = state.bossActive.color;
      ctx.font = "800 16px 'Sora', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PHASE " + state.bossPhase, CANVAS_W / 2, 50);
      ctx.globalAlpha = 1;
    }
  }

  // Bullets (weapon-aware rendering)
  const weaponDef = getWeapon(state.weaponId);
  state.bullets.forEach(b => {
    const wColor = weaponDef.color;
    ctx.fillStyle = wColor;
    ctx.shadowColor = wColor;
    ctx.shadowBlur = 6;
    const bSize = b.size || BULLET_RADIUS;
    const wid = b.weaponId || state.weaponId;

    switch (wid) {
      case "blaster":
        // Circle + vertical trail
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = wColor;
        ctx.fillRect(b.x - 1, b.y, 2, 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = wColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "rapid":
        // Small fast dots
        ctx.fillStyle = wColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "spread":
        // Small dots with slight trail
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = wColor;
        ctx.fillRect(b.x - 1, b.y, 2, 5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = wColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "plasma":
        // Large orb with glow ring
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = wColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "laser":
        // Thin beam line from bullet to top of screen
        ctx.fillStyle = wColor;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(b.x - (b.beamWidth || 3), 0, (b.beamWidth || 3) * 2, b.y);
        ctx.globalAlpha = 0.6;
        ctx.fillRect(b.x - 1, 0, 2, b.y);
        ctx.globalAlpha = 1;
        break;

      case "homing":
        // Triangle pointing in movement direction
        ctx.fillStyle = wColor;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -bSize);
        ctx.lineTo(-bSize * 0.6, bSize * 0.5);
        ctx.lineTo(bSize * 0.6, bSize * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;

      default: {
        // Fallback — classic style
        const bulletAccent = skin ? skin.accent : "#00ddff";
        const bulletVisor = skin ? skin.visor : "#00ddff";
        const tg = ctx.createLinearGradient(b.x, b.y + 12, b.x, b.y);
        tg.addColorStop(0, "transparent");
        tg.addColorStop(1, hexToRgba(bulletAccent, 0.4));
        ctx.strokeStyle = tg;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y + 12); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = bulletVisor;
        ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });

  // Particles
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Player ship
  const px = state.player.x;
  const py = state.player.y;
  const blink = state.invincibleTimer > 0 && Math.floor(state.frame / 4) % 2 === 0;

  if (!blink) {
    ctx.save();
    ctx.translate(px, py);

    // Engine glow
    const shipAccent = skin ? skin.accent : "#00aaff";
    const shipFlame = skin ? skin.flame : "#88ddff";
    const shipVisor = skin ? skin.visor : "#00ddff";
    const shipHullTop = skin ? skin.hull.top : "#3e3e68";
    const shipHullMid = skin ? skin.hull.mid : "#2a2a4e";
    const shipHullBot = skin ? skin.hull.bot : "#161636";

    const eg = ctx.createRadialGradient(0, 16, 0, 0, 16, 20);
    eg.addColorStop(0, hexToRgba(shipAccent, 0.3));
    eg.addColorStop(1, "transparent");
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(0, 16, 20, 0, Math.PI * 2); ctx.fill();

    // Flame
    const flameH = 12 + Math.sin(frame * 0.3) * 4;
    const fg = ctx.createLinearGradient(0, 14, 0, 14 + flameH);
    fg.addColorStop(0, hexToRgba(shipFlame, 0.8));
    fg.addColorStop(0.5, hexToRgba(shipAccent, 0.3));
    fg.addColorStop(1, "transparent");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.quadraticCurveTo(-3, 14 + flameH * 0.7, 0, 14 + flameH);
    ctx.quadraticCurveTo(3, 14 + flameH * 0.7, 6, 14);
    ctx.fill();

    // Hull
    ctx.beginPath();
    ctx.moveTo(0, -state.player.h);
    ctx.lineTo(-14, 8);
    ctx.lineTo(-18, 14);
    ctx.lineTo(-10, 16);
    ctx.lineTo(10, 16);
    ctx.lineTo(18, 14);
    ctx.lineTo(14, 8);
    ctx.closePath();
    const hg = ctx.createLinearGradient(0, -state.player.h, 0, 16);
    hg.addColorStop(0, shipHullTop);
    hg.addColorStop(0.5, shipHullMid);
    hg.addColorStop(1, shipHullBot);
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = hexToRgba(shipAccent, 0.2);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Wings
    ctx.fillStyle = "#0c0c20";
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(-26, 10); ctx.lineTo(-22, 14); ctx.lineTo(-10, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(26, 10); ctx.lineTo(22, 14); ctx.lineTo(10, 10);
    ctx.fill();

    // Wing accents
    ctx.strokeStyle = hexToRgba(shipAccent, 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-22, 12); ctx.lineTo(-12, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, 12); ctx.lineTo(12, 6); ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.moveTo(0, -state.player.h + 6);
    ctx.quadraticCurveTo(-6, -12, -6, -2);
    ctx.lineTo(6, -2);
    ctx.quadraticCurveTo(6, -12, 0, -state.player.h + 6);
    ctx.fillStyle = hexToRgba(shipVisor, 0.35);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(shipVisor, 0.3);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Nose light
    ctx.fillStyle = hexToRgba(shipAccent, 0.35);
    ctx.beginPath(); ctx.arc(0, -state.player.h - 2, 2, 0, Math.PI * 2); ctx.fill();

    // Shield effect
    if (state.activeEffects.shield > 0) {
      ctx.strokeStyle = hexToRgba(shipVisor, 0.2 + Math.sin(frame * 0.1) * 0.15);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
      const sg = ctx.createRadialGradient(0, 0, 20, 0, 0, 30);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(1, hexToRgba(shipVisor, 0.05 + Math.sin(frame * 0.1) * 0.03));
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  // Vignette
  const vig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.65);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

  ctx.restore(); // shake

  // HUD (not affected by shake)
  ctx.save();

  if (state.bossActive && state.bossState !== "none" && state.bossState !== "dead") {
    // Boss HP bar replaces distance HUD
    drawBossHPBar(ctx, state.bossActive, state.bossDisplayHP || state.bossHP, state.bossMaxHP, state.bossPhase);

    // Lives (still shown during boss fight)
    ctx.textAlign = "right";
    for (let i = 0; i < state.lives; i++) {
      ctx.fillStyle = "#00aaff";
      ctx.beginPath();
      ctx.arc(CANVAS_W - 20 - i * 18, 44, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "500 9px 'Sora',sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("LIVES", CANVAS_W - 16, 38);
  } else if (state.bossActive && state.bossState === "dead" && (state.bossDefeatTextTimer > 0 || state.bossTimer < 120)) {
    // Defeat text with extended timer
    if (state.bossDefeatTextTimer > 0) state.bossDefeatTextTimer--;
    const fadeAlpha = state.bossDefeatTextTimer > 30 ? 1 : (state.bossDefeatTextTimer / 30);
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 26px 'Sora', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOSS DEFEATED", CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.font = "700 16px 'Sora', sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("+" + state.bossActive.reward + " COINS", CANVAS_W / 2, CANVAS_H / 2 + 15);
    ctx.globalAlpha = 1;
  } else {
    // Normal distance display
    ctx.textAlign = "center";
    ctx.font = "800 22px 'Sora',sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(formatDistance(state.distance), CANVAS_W / 2, 32);

    // Zone name below distance
    let zoneName = "Departing Sun";
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (state.distance >= MILESTONES[i].distance) {
        zoneName = `Past ${MILESTONES[i].name}`;
        break;
      }
    }
    if (state.milestoneIndex < MILESTONES.length && state.distance < MILESTONES[state.milestoneIndex].distance) {
      const next = MILESTONES[state.milestoneIndex];
      if (state.distance >= next.distance * 0.7) {
        zoneName = `Approaching ${next.name}`;
      }
    }
    ctx.font = "500 9px 'Sora',sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(zoneName, CANVAS_W / 2, 46);

    // Milestone notification flash
    if (state.milestoneNotification && state.milestoneNotificationTimer > 0) {
      const alpha = Math.min(1, state.milestoneNotificationTimer / 30);
      ctx.font = "700 14px 'Sora',sans-serif";
      ctx.fillStyle = `rgba(0,200,255,${alpha})`;
      ctx.shadowColor = "rgba(0,200,255,0.6)";
      ctx.shadowBlur = 15;
      ctx.fillText(state.milestoneNotification, CANVAS_W / 2, 72);
      ctx.shadowBlur = 0;
    }

    // Lives
    ctx.textAlign = "right";
    for (let i = 0; i < state.lives; i++) {
      ctx.fillStyle = i < state.lives ? "#00aaff" : "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(CANVAS_W - 20 - i * 18, 28, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "500 9px 'Sora',sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("LIVES", CANVAS_W - 16, 20);
  }

  // Combo
  if (state.combo > 1) {
    ctx.textAlign = "center";
    ctx.font = "800 18px 'Sora',sans-serif";
    const comboAlpha = Math.min(1, state.comboTimer / 30);
    ctx.fillStyle = `rgba(255,200,0,${comboAlpha})`;
    ctx.fillText(`${state.comboMultiplier.toFixed(1)}x COMBO`, CANVAS_W / 2, CANVAS_H - 60);
  }

  // Active effects indicators
  let ey = 96;
  for (const [key, val] of Object.entries(state.activeEffects)) {
    if (val > 0) {
      const col = key === "shield" ? "#00e5ff" : key === "rapid" ? "#ffff00" : "#ff00ff";
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6 + Math.sin(frame * 0.1) * 0.2;
      ctx.font = "600 10px 'Sora',sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${key.toUpperCase()} ${(val / 1000).toFixed(1)}s`, 16, ey);
      ey += 16;
    }
  }
  ctx.globalAlpha = 1;

  // Boss defeat white flash overlay
  if (state.bossWhiteFlash > 0) {
    ctx.globalAlpha = Math.min(0.5, state.bossWhiteFlash / 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
