import {
  CANVAS_W, CANVAS_H, PLAYER_SPEED, BULLET_SPEED, BULLET_RADIUS,
  FIRE_RATE_MS, INITIAL_LIVES, MAX_LIVES, INVINCIBLE_FRAMES,
  WAVE_DURATION_FRAMES, METEOR_TYPES, POWERUP_TYPES,
} from "./constants.js";
import { MILESTONES } from "../data/milestones.js";
import { ACHIEVEMENT_CATEGORIES } from "../data/achievements.js";
import { getBossForDistance } from "../data/bosses.js";
import { updateBoss } from "./bossAI.js";
import { drawBoss, drawBossProjectiles, drawBossWarning, drawBossHPBar, drawBossDefeated } from "./bossRenderer.js";
import { maybeSpawnEnemy, updateEnemies, updateEnemyProjectiles, checkBulletEnemyCollisions, checkPlayerEnemyCollisions } from "./enemies.js";
import { drawEnemies, drawEnemyProjectiles } from "./enemyRenderer.js";
import { spawnComboText, updateComboEffects, renderComboEffects, clearComboTexts } from "./comboEffects.js";
import { renderZoneBackground, getCurrentZoneName } from "./zoneRenderer.js";
import { getCurrentZoneWaves } from "./zoneWaves.js";
import { getActiveBuffs } from "../data/playerData.js";
import { formatDistance } from "../utils/formatDistance.js";
import { getWeapon } from "../data/weapons.js";
import { onLightningHit } from "./lightningChain.js";
import { getPilot } from "../data/pilots.js";
import { getDrone } from "../data/drones.js";
import { pickRandomEncounter } from "../data/encounters.js";

const BASE_DISTANCE_PER_FRAME = 8333; // ~500,000 km per second at 60fps

// ── Delta-time state ──
let lastFrameTime = performance.now();
let deltaTime = 1; // multiplier — 1 = 60fps target

export function computeDeltaTime() {
  const now = performance.now();
  deltaTime = (now - lastFrameTime) / 16.667;
  if (deltaTime > 3) deltaTime = 3; // cap to prevent huge jumps after pause/tab-switch
  lastFrameTime = now;
  return deltaTime;
}

export function getDeltaTime() { return deltaTime; }
export function resetDeltaTime() { lastFrameTime = performance.now(); deltaTime = 1; }

// ── Particle Pool ──
const PARTICLE_POOL_SIZE = 400;
const particlePool = [];
let activeParticleCount = 0;

for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
  particlePool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, size: 0, color: "#ffffff" });
}

export function spawnPoolParticle(x, y, vx, vy, life, decay, size, color) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) {
      p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.decay = decay; p.size = size; p.color = color;
      activeParticleCount++;
      return p;
    }
  }
  return null;
}

function updatePoolParticles(dt) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.03 * dt;
    p.life -= p.decay * dt;
    if (p.life <= 0 || p.y > CANVAS_H + 20 || p.y < -20) {
      p.active = false;
      activeParticleCount--;
    }
  }
}

function updatePoolParticlesDeathScene(slowFactor) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    p.x += p.vx * slowFactor;
    p.y += p.vy * slowFactor;
    p.life -= p.decay * slowFactor;
    if (p.life <= 0) {
      p.active = false;
      activeParticleCount--;
    }
  }
}

function drawPoolParticles(ctx) {
  const colorGroups = {};
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    if (!colorGroups[p.color]) colorGroups[p.color] = [];
    colorGroups[p.color].push(p);
  }
  for (const color in colorGroups) {
    ctx.fillStyle = color;
    const group = colorGroups[color];
    for (let j = 0; j < group.length; j++) {
      const p = group[j];
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function resetParticlePool() {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    particlePool[i].active = false;
  }
  activeParticleCount = 0;
}

export function getActiveParticleCount() { return activeParticleCount; }

// ── Combo Tiers (for engine-level VFX: kill flash, speed lines, screen shake) ──
const COMBO_TIERS = [
  { min: 0,    name: "",              color: "#ffffff", glow: "#ffffff", shake: 0,  particles: 1,   speedLines: false },
  // EARLY (white → cool blue)
  { min: 3,    name: "NICE",          color: "#00aaff", glow: "#00aaff", shake: 1,  particles: 1.5, speedLines: false },
  { min: 5,    name: "GOOD",          color: "#00ddaa", glow: "#00ddaa", shake: 2,  particles: 2,   speedLines: false },
  { min: 8,    name: "GREAT",         color: "#00ff88", glow: "#00ff88", shake: 2,  particles: 2.2, speedLines: false },
  { min: 12,   name: "AWESOME",       color: "#88ff44", glow: "#88ff44", shake: 3,  particles: 2.5, speedLines: true },
  // MID (yellow → orange → red)
  { min: 18,   name: "AMAZING",       color: "#ffdd00", glow: "#ffdd00", shake: 3,  particles: 2.8, speedLines: true },
  { min: 25,   name: "INCREDIBLE",    color: "#ffaa00", glow: "#ffaa00", shake: 4,  particles: 3,   speedLines: true },
  { min: 35,   name: "UNSTOPPABLE",   color: "#ff8800", glow: "#ff8800", shake: 4,  particles: 3.5, speedLines: true },
  { min: 50,   name: "FEROCIOUS",     color: "#ff5500", glow: "#ff5500", shake: 5,  particles: 4,   speedLines: true },
  // HIGH (red → pink → purple)
  { min: 70,   name: "RAMPAGE",       color: "#ff2244", glow: "#ff2244", shake: 5,  particles: 4.5, speedLines: true },
  { min: 100,  name: "LEGENDARY",     color: "#ff0066", glow: "#ff0066", shake: 6,  particles: 5,   speedLines: true },
  { min: 130,  name: "MYTHICAL",      color: "#ff00aa", glow: "#ff00aa", shake: 6,  particles: 5.5, speedLines: true },
  { min: 170,  name: "GODLIKE",       color: "#dd00ff", glow: "#dd00ff", shake: 7,  particles: 6,   speedLines: true },
  // EXTREME (purple → cyan → rainbow)
  { min: 220,  name: "DIVINE",        color: "#aa00ff", glow: "#aa00ff", shake: 7,  particles: 6.5, speedLines: true },
  { min: 280,  name: "TRANSCENDENT",  color: "#6644ff", glow: "#6644ff", shake: 8,  particles: 7,   speedLines: true },
  { min: 350,  name: "ETHEREAL",      color: "#00ddff", glow: "#00ddff", shake: 8,  particles: 7.5, speedLines: true },
  { min: 430,  name: "ASCENDED",      color: "#00ffdd", glow: "#00ffdd", shake: 9,  particles: 8,   speedLines: true },
  // GODTIER (rainbow + special FX)
  { min: 520,  name: "IMMORTAL",      color: "#ffffff", glow: "#ffaa00", shake: 9,  particles: 9,   speedLines: true, rainbow: true },
  { min: 620,  name: "OMNIPOTENT",    color: "#ffffff", glow: "#ff00ff", shake: 10, particles: 10,  speedLines: true, rainbow: true },
  { min: 730,  name: "COSMIC",        color: "#ffffff", glow: "#00ffff", shake: 10, particles: 11,  speedLines: true, rainbow: true },
  { min: 850,  name: "ABSOLUTE",      color: "#ffffff", glow: "#ff44dd", shake: 11, particles: 12,  speedLines: true, rainbow: true },
  // BEYOND (ultimate tiers)
  { min: 1000, name: "INFINITE",      color: "#ffffff", glow: "#ffffff", shake: 12, particles: 14,  speedLines: true, rainbow: true, beyond: true },
  { min: 1500, name: "BEYOND",        color: "#ffffff", glow: "#ffffff", shake: 13, particles: 16,  speedLines: true, rainbow: true, beyond: true },
  { min: 2000, name: "ETERNAL",       color: "#ffffff", glow: "#ffffff", shake: 14, particles: 18,  speedLines: true, rainbow: true, beyond: true },
];

const COMBO_TIMEOUT = 240; // 4 seconds at 60fps

// ── Wave Events ──
const WAVE_EVENTS = [
  { id: "meteor_storm",   name: "METEOR STORM",    desc: "Massive meteor shower incoming",          duration: 15000, color: "#ff6622", weight: 30 },
  { id: "elite_wave",     name: "ELITE SQUADRON",   desc: "Elite enemies inbound",                   duration: 20000, color: "#aa44dd", weight: 25 },
  { id: "bonus_wave",     name: "BONUS WAVE",       desc: "Coin meteors approaching",                duration: 12000, color: "#ffaa00", weight: 20 },
  { id: "swarm",          name: "DRONE SWARM",      desc: "Massive enemy swarm detected",            duration: 18000, color: "#00cc88", weight: 20 },
  { id: "asteroid_field", name: "ASTEROID FIELD",   desc: "Navigate through dense asteroid field",   duration: 20000, color: "#888866", weight: 25 },
  { id: "double_trouble", name: "DOUBLE TROUBLE",   desc: "Everything spawns 2x but worth 2x",      duration: 15000, color: "#ff44aa", weight: 15 },
  { id: "speed_run",      name: "HYPERSPEED",       desc: "Everything moves 3x faster!",             duration: 10000, color: "#00ddff", weight: 15 },
];

function pickWaveEvent() {
  const totalWeight = WAVE_EVENTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const event of WAVE_EVENTS) {
    r -= event.weight;
    if (r <= 0) return event;
  }
  return WAVE_EVENTS[0];
}

function getComboTier(combo) {
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo >= COMBO_TIERS[i].min) return COMBO_TIERS[i];
  }
  return COMBO_TIERS[0];
}

function getComboTierIndex(combo) {
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo >= COMBO_TIERS[i].min) return i;
  }
  return 0;
}

function getTierColor(tier, time) {
  if (!tier.rainbow) return tier.color;
  const hue = (time * 0.3) % 360;
  return `hsl(${hue}, 100%, 65%)`;
}

function getTierGlow(tier, time) {
  if (!tier.rainbow) return tier.glow || tier.color;
  const hue = (time * 0.3) % 360;
  return `hsl(${hue}, 100%, 60%)`;
}

function triggerComboBreak(state) {
  if (state.combo < 5) return;
  const tier = getComboTier(state.combo);
  state.comboBreak = {
    combo: state.combo,
    tier,
    timer: 60,
    maxTimer: 60,
    shards: [],
  };
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    state.comboBreak.shards.push({
      x: CANVAS_W / 2,
      y: 110,
      vx: Math.cos(angle) * (3 + Math.random() * 3),
      vy: Math.sin(angle) * (3 + Math.random() * 3) - 1,
      life: 1,
      size: 3 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }
  state.sfx.comboBreak = true;
}

// Central kill handler — call for every enemy/meteor/boss destruction
// FIX: Default sfx to state.sfx when not provided (prevents crash from ability kills)
export function onKill(state, x, y, color, bonusDistance, sfx, coinValue) {
  if (!sfx) sfx = state.sfx;
  const prevTierIdx = getComboTierIndex(state.combo);
  state.combo++;
  state.comboTimer = COMBO_TIMEOUT;
  state.comboMultiplier = Math.min(3, 1 + Math.floor(state.combo / 3) * 0.5);
  const dpMult = state.activeEffects && state.activeEffects.doublepts > 0 ? 2 : 1;
  if (bonusDistance) state.distance += Math.floor(bonusDistance * state.comboMultiplier * dpMult);
  state.kills++;
  if (state.combo > state.bestComboThisGame) state.bestComboThisGame = state.combo;

  const newTier = getComboTier(state.combo);
  const newTierIdx = getComboTierIndex(state.combo);

  // Scaled kill particles — count scales with combo, size stays small
  const pCount = Math.floor(12 * Math.min(newTier.particles, 5));
  const spread = 3 + Math.min(state.combo, 30) * 0.1;
  for (let pi = 0; pi < pCount; pi++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * spread;
    spawnPoolParticle(
      x, y,
      Math.cos(angle) * speed, Math.sin(angle) * speed,
      1, 0.03 + Math.random() * 0.03,
      0.8 + Math.random() * 1.5,
      Math.random() < 0.3 ? newTier.color : color
    );
  }

  // Kill flash
  state.killFlashTimer = 6 + Math.min(state.combo, 15);
  state.killFlashColor = newTier.color;

  // Combo screen shake
  if (newTier.shake > state.comboShakeIntensity) state.comboShakeIntensity = newTier.shake;
  state.comboShakeDecay = 10;

  // Tier change popup
  if (newTierIdx > prevTierIdx && newTierIdx > state.lastComboTier) {
    state.comboPopup = {
      text: newTier.name,
      sub: `${state.combo}x`,
      color: newTier.color,
      combo: state.combo,
      timer: 90,
      maxTimer: 90,
    };
    sfx.combo = true;
    sfx.comboTier = true;
    state.lastComboTier = newTierIdx;
  }

  // Combo sound at multiples of 5
  if (state.combo > 0 && state.combo % 5 === 0) sfx.combo = true;
  spawnComboText(x, y, state.combo, state.comboMultiplier);

  // Queue combo achievement checks for GameScreen to process
  state.achievementQueue.push({ type: "combo", value: state.combo });

  // Coin pop animation
  if (coinValue && coinValue > 0) {
    const coinMult = 1 + (state.stationBuffs?.coin_mult || 0);
    const finalCoins = Math.floor(coinValue * coinMult);
    state.actualCoinsThisRun += finalCoins;
    spawnCoinPop(state, x, y, finalCoins);
  }
}

// ── Coin Pop Animation ──

function spawnCoinPop(state, x, y, amount) {
  const pops = Math.min(amount, 8);
  const valuePerCoin = Math.ceil(amount / pops);
  for (let i = 0; i < pops; i++) {
    state.coinPops.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 3,
      vy: -2 - Math.random() * 2,
      targetX: 55,
      targetY: 25,
      timer: 0,
      duration: 50 + Math.random() * 15,
      phase: "burst",
      value: valuePerCoin,
      size: 5,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      delay: i * 2,
      dead: false,
    });
  }
}

function updateCoinPops(state, dt) {
  state.coinPops.forEach(coin => {
    if (coin.delay > 0) { coin.delay -= dt; return; }
    coin.timer += dt;
    coin.rotation += coin.rotSpeed * dt;

    if (coin.phase === "burst") {
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;
      coin.vy += 0.15 * dt;
      if (coin.timer > 8) coin.phase = "travel";
    } else if (coin.phase === "travel") {
      const dx = coin.targetX - coin.x;
      const dy = coin.targetY - coin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ease = Math.min(1, coin.timer / coin.duration);
      const speed = 4 + ease * 12;
      if (dist > 5) {
        coin.x += (dx / dist) * speed * dt;
        coin.y += (dy / dist) * speed * dt;
      } else {
        coin.x = coin.targetX;
        coin.y = coin.targetY;
        coin.phase = "arrive";
      }
      coin.rotSpeed *= 1.02;
    } else if (coin.phase === "arrive") {
      state.hudCoinDisplay += coin.value;
      state.coinCounterPulse = 1.3;
      state.sfx.coinPickup = true;
      coin.dead = true;
    }
  });
  state.coinPops = state.coinPops.filter(c => !c.dead);
}

function drawCoinPops(ctx, state) {
  state.coinPops.forEach(coin => {
    if (coin.delay > 0) return;
    ctx.save();
    ctx.translate(coin.x, coin.y);
    const wobble = coin.phase === "travel" ? Math.sin(coin.timer * 0.5) * 0.15 : 0;
    ctx.rotate(coin.rotation + wobble);

    ctx.shadowColor = "#ffaa00";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc44";
    ctx.beginPath();
    ctx.arc(0, 0, coin.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffee88";
    ctx.beginPath();
    ctx.arc(-1, -1, coin.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cc8800";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Trailing sparkle
    if (coin.phase === "travel" && Math.random() < 0.4) {
      ctx.save();
      ctx.fillStyle = "#ffee88";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(coin.x - 1, coin.y - 1, 2, 2);
      ctx.restore();
    }
  });
}

function formatCoins(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function drawCoinCounter(ctx, state) {
  if (state.coinCounterPulse > 1) {
    state.coinCounterPulse -= 0.03;
    if (state.coinCounterPulse < 1) state.coinCounterPulse = 1;
  }
  const pulse = state.coinCounterPulse;
  const x = 55;
  const y = 25;

  // Coin icon
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "#ffaa00";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffcc44";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Number
  ctx.font = `700 ${16 * pulse}px 'Sora', sans-serif`;
  ctx.fillStyle = pulse > 1.05 ? "#ffdd44" : "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(formatCoins(state.hudCoinDisplay), x + 12, y + 5);
}

function getDifficultyTier(distance) {
  // Returns multipliers based on planet zone — spawn values lower = faster spawning
  if (distance < 30_000_000)        return { hp: 1.0,  speed: 1.0,  spawn: 0.70 };  // Inner system
  if (distance < 80_000_000)        return { hp: 1.3,  speed: 1.1,  spawn: 0.65 };  // Mercury
  if (distance < 120_000_000)       return { hp: 1.6,  speed: 1.15, spawn: 0.60 };  // Venus
  if (distance < 180_000_000)       return { hp: 2.0,  speed: 1.2,  spawn: 0.55 };  // Earth
  if (distance < 350_000_000)       return { hp: 2.5,  speed: 1.25, spawn: 0.50 };  // Mars
  if (distance < 600_000_000)       return { hp: 3.2,  speed: 1.3,  spawn: 0.45 };  // Asteroid belt
  if (distance < 1_100_000_000)     return { hp: 4.0,  speed: 1.4,  spawn: 0.40 };  // Jupiter
  if (distance < 2_200_000_000)     return { hp: 5.0,  speed: 1.5,  spawn: 0.36 };  // Saturn
  if (distance < 3_800_000_000)     return { hp: 6.5,  speed: 1.6,  spawn: 0.32 };  // Uranus
  if (distance < 6_000_000_000)     return { hp: 8.0,  speed: 1.7,  spawn: 0.28 };  // Neptune
  if (distance < 12_000_000_000)    return { hp: 10.0, speed: 1.8,  spawn: 0.25 };  // Kuiper belt
  return                                   { hp: 13.0, speed: 2.0,  spawn: 0.22 };  // Deep space
}

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
  resetParticlePool();
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    s: Math.random() * 1.2 + 0.3,
    speed: Math.random() * 0.4 + 0.1,
    hue: Math.random() > 0.85 ? 190 + Math.random() * 50 : 0,
  }));

  const state = {
    // Death scene
    deathScene: null,
    player: { x: CANVAS_W / 2, y: CANVAS_H - 80, w: 28, h: 36, targetX: CANVAS_W / 2 },
    bullets: [],
    meteors: [],
    powerups: [],
    enemies: [],
    enemyProjectiles: [],
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
    bestComboThisGame: 0,
    lastComboTier: 0,
    shakeTimer: 0,
    shakeX: 0,
    shakeY: 0,
    // Combo VFX state
    killFlashTimer: 0,
    killFlashColor: "#ffffff",
    comboShakeIntensity: 0,
    comboShakeDecay: 0,
    speedLineParticles: [],
    comboPopup: null,
    comboBreak: null,
    // FIX: Removed duplicate zoneNotification (defined below with zoneNotificationTimer)
    lastZoneName: "",
    activeEffects: { shield: 0, rapid: 0, triple: 0, slowtime: 0, magnet: 0, doublepts: 0, freeze: 0 },
    powerupsCollected: 0,
    nukesUsed: 0,
    abilitiesUsed: 0,
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
    // Achievement notification queue (drained by GameScreen)
    achievementQueue: [],
    achievementNotification: null,
    achievementNotificationTimer: 0,
    achNotificationQueue: [],
    achNotification: null,
    _achNextDelay: 0,
    // Coin pop animation
    coinPops: [],
    hudCoinDisplay: 0,
    actualCoinsThisRun: 0,
    coinCounterPulse: 1,
    meteorSpawningEnabled: true,
    // Station buffs (loaded once at game start)
    stationBuffs: getActiveBuffs(),
    // Wave events
    activeWaveEvent: null,
    waveEventTimer: 0,
    waveEventWarning: null,
    wavesUntilEvent: 5 + Math.floor(Math.random() * 3),
    totalWaveEventsCompleted: 0,
    eventCoinsEarned: 0,
    rewardPopup: null,
    waveEventSpawnTimer: 0,
    // NPC Encounters
    encounter: null,         // active encounter object
    encounterTimer: 0,       // seconds since last check
    encounterNextTime: 45 + Math.random() * 30, // 45-75 sec
    encounterPaused: false,  // true while encounter dialog is open
    encounterEnemySpawns: [],// queued enemy spawns from choices
    // Drones
    drones: [],
    // Weapon
    weaponId: "blaster",
    // Lightning chain arcs
    lightningArcs: [],
    weaponLevel: 0,
    // Trail particles (engine exhaust)
    trailParticles: [],
    // Pilot active ability state
    ability: { cooldown: 0, duration: 0, active: false },
    barrageShots: 0,
    barrageTimer: 0,
    dashState: null,
    forceWave: null,
    // Zone tracking
    lastZoneDesc: null,
    zoneNotification: null,   // string: zone description for top HUD
    zoneNotificationTimer: 0,
    zoneNameNotification: null, // object: {name, timer, color} for center popup
    // Sound event flags (consumed each frame by GameScreen)
    sfx: { shoot: false, explosionSmall: false, explosionLarge: false, powerup: false, playerHit: false, combo: false, comboBreak: false, waveStart: false, milestone: false, gameOver: false, bossWarning: false, bossShoot: false, bossHit: false, bossExplosionSmall: false, bossExplosionLarge: false, bossDefeated: false, eventWarning: false, eventComplete: false, lowHp: false, ability: false, coinPickup: false, comboTier: false, abilityReady: false, encounterStart: false, encounterSuccess: false, encounterDanger: false },
    lastLives: 3,
  };

  // Apply station buffs at game start
  const buffs = state.stationBuffs;
  if (buffs.start_shield > 0) {
    state.activeEffects.shield = buffs.start_shield * 1000;
  }
  if (buffs.start_powerups > 0) {
    for (let i = 0; i < buffs.start_powerups; i++) {
      const pType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      state.powerups.push({
        x: state.player.x + (Math.random() - 0.5) * 60,
        y: 100 + Math.random() * 80,
        type: pType.type, color: pType.color, duration: pType.duration,
        vy: 1.5, pulse: 0,
      });
    }
  }

  return state;
}

export function spawnMeteor(state, distanceSpeedMult = 1) {
  const w = state.wave;
  const tier = getDifficultyTier(state.distance);
  const zone = getCurrentZoneWaves(state.distance);
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
  const scaledHp = Math.ceil(type.hp * 1.4 * tier.hp);

  state.meteors.push({
    x: type.radius + Math.random() * (CANVAS_W - type.radius * 2),
    y: -type.radius * 2,
    radius: type.radius,
    hp: scaledHp,
    maxHp: scaledHp,
    speed: type.speed * waveSpeedMult * distanceSpeedMult * tier.speed * 1.2,
    bonusDistance: type.bonusDistance,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    shape,
    hue: 15 + Math.random() * 25,
    meteorStyle: zone.meteorStyle,
  });
}

function spawnGoldenMeteor(state) {
  const radius = 16 + Math.random() * 8;
  const shape = generateMeteorShape(radius);
  state.meteors.push({
    x: radius + Math.random() * (CANVAS_W - radius * 2),
    y: -radius * 2,
    radius,
    hp: Math.ceil(1 * 1.4),
    maxHp: Math.ceil(1 * 1.4),
    speed: (1.5 + Math.random() * 1.5) * 1.2,
    bonusDistance: 50_000,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    shape,
    hue: 45,
    golden: true,
    meteorStyle: "golden",  // FIX: golden meteors always use golden style regardless of zone
    coinValue: 5,
  });
}

function spawnSmallMeteor(state, speedMult) {
  const radius = 12;
  const shape = generateMeteorShape(radius);
  // FIX: Add meteorStyle from current zone so asteroid_field event meteors match zone theme
  const zone = getCurrentZoneWaves(state.distance);
  state.meteors.push({
    x: radius + Math.random() * (CANVAS_W - radius * 2),
    y: -radius * 2,
    radius,
    hp: Math.ceil(1 * 1.4),
    maxHp: Math.ceil(1 * 1.4),
    speed: (1.5 + Math.random()) * speedMult * 1.2,
    bonusDistance: 30_000,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    shape,
    hue: 15 + Math.random() * 25,
    meteorStyle: zone.meteorStyle,
  });
}

function spawnEventEnemy(state, type, opts = {}) {
  // Simplified enemy spawning for wave events — create enemies directly
  const DEFS = {
    elite: { hp: 6, speed: 2, coins: 10, distBonus: 150_000, hitRadius: 25, accent: "#7744cc", accentLight: "#bb88ff", shield: 4 },
    gnat:  { hp: 1, speed: 2.5, coins: 1, distBonus: 15_000, hitRadius: 10, accent: "#00cc88", accentLight: "#00ffaa" },
    kamikaze: { hp: 2, speed: 6, coins: 5, distBonus: 60_000, hitRadius: 16, accent: "#cc2200", accentLight: "#ff4422" },
  };
  const def = DEFS[type];
  if (!def) return;
  const baseX = CANVAS_W / 2 + (opts.offsetX || 0);
  const enemy = {
    type,
    x: Math.max(def.hitRadius, Math.min(CANVAS_W - def.hitRadius, baseX + (Math.random() - 0.5) * 60)),
    y: -30 - Math.random() * 40,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    coins: def.coins,
    distBonus: def.distBonus,
    hitRadius: def.hitRadius,
    accent: def.accent,
    accentLight: def.accentLight,
    timer: 0,
  };
  if (type === "elite") {
    enemy.shieldHP = def.shield;
    enemy.shootTimer = 120 + Math.random() * 60;
    enemy.phaseOffset = Math.random() * Math.PI * 2;
    enemy.enteredScreen = false;
  }
  if (type === "gnat") {
    enemy.isLeader = false;
    enemy.wobbleX = 0;
    enemy.wobbleY = 0;
    enemy.targetX = enemy.x;
  }
  if (type === "kamikaze") {
    enemy.lockedOnPlayer = false;
    enemy.chargeAngle = 0;
  }
  state.enemies.push(enemy);
}

export function spawnParticles(state, x, y, count, color, sizeBase) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = Math.random() * 3 + 1;
    spawnPoolParticle(
      x, y,
      Math.cos(a) * spd, Math.sin(a) * spd,
      1, 0.015 + Math.random() * 0.02,
      (sizeBase || 2) * (0.5 + Math.random()),
      color
    );
  }
}

// ── NPC Encounter Choice Handler ──

export function handleEncounterChoice(state, choiceIndex) {
  if (!state.encounter || state.encounter.phase !== "dialog") return;
  const enc = state.encounter.data;
  const choice = enc.choices[choiceIndex];
  if (!choice) return;

  // Check condition
  if (choice.condition) {
    const checkData = { coins: state.actualCoinsThisRun, lives: state.lives };
    if (!choice.condition(checkData)) return;
  }

  // Execute outcome
  const result = choice.outcome(state);

  // Resume game from encounter pause
  state.encounterPaused = false;
  resetDeltaTime();

  // Show result
  state.encounter.resultMsg = result.msg;
  state.encounter.resultSuccess = result.success;
  state.encounter.resultDanger = result.danger || false;
  state.encounter.phase = "result";
  state.encounter.timer = 0;

  // Reward popup for result message
  const color = result.success ? "#00ff88" : (result.danger ? "#ff3344" : "#888888");
  state.rewardPopup = { text: result.msg, color, timer: 150, maxTimer: 150 };

  // Sound
  if (result.success) state.sfx.encounterSuccess = true;
  else if (result.danger) state.sfx.encounterDanger = true;

  // Coin pop for coin changes
  if (result.msg.includes("+") && result.msg.includes("coins")) {
    const match = result.msg.match(/\+(\d+)/);
    if (match) spawnCoinPop(state, CANVAS_W / 2, CANVAS_H / 2, parseInt(match[1]));
  }

  // Hide React dialog
  if (window.onEncounterEnd) window.onEncounterEnd();
}

export function spawnDrones(state) {
  state.drones = [];
  const equipped = state.equippedDrones || [];
  equipped.forEach((droneId, idx) => {
    const data = getDrone(droneId);
    if (!data) return;
    state.drones.push({
      ...data,
      x: state.player.x + (idx === 0 ? -35 : 35),
      y: state.player.y,
      fireTimer: 0,
      angle: idx * Math.PI,
    });
  });
}

function updateDrones(state, dt) {
  state.drones.forEach((drone, idx) => {
    switch (drone.behavior) {
      case "side": {
        const targetX = state.player.x + (idx === 0 ? -35 : 35);
        const targetY = state.player.y + 5;
        drone.x += (targetX - drone.x) * 0.15 * dt;
        drone.y += (targetY - drone.y) * 0.15 * dt;
        break;
      }
      case "orbit":
        drone.angle += 0.04 * dt;
        drone.x = state.player.x + Math.cos(drone.angle) * 45;
        drone.y = state.player.y + Math.sin(drone.angle) * 45;
        break;
      case "rear": {
        const targetRX = state.player.x + (idx === 0 ? -20 : 20);
        const targetRY = state.player.y + 30;
        drone.x += (targetRX - drone.x) * 0.12 * dt;
        drone.y += (targetRY - drone.y) * 0.12 * dt;
        break;
      }
    }

    // Firing
    drone.fireTimer -= dt;
    if (drone.fireTimer <= 0) {
      fireDroneShot(state, drone);
      drone.fireTimer = drone.fireRate / 16.667; // convert frame count to dt-based timer
    }

    // Magnet behavior (harvester)
    if (drone.magnetRange) {
      state.powerups.forEach(p => {
        const dx = drone.x - p.x;
        const dy = drone.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < drone.magnetRange && dist > 0) {
          p.x += (dx / dist) * 3 * dt;
          p.y += (dy / dist) * 3 * dt;
        }
      });
    }

    // Block projectiles (guardian) — only blockChance % of the time
    if (drone.blocksProjectiles) {
      for (let pi = state.bossProjectiles.length - 1; pi >= 0; pi--) {
        const proj = state.bossProjectiles[pi];
        const dx = drone.x - proj.x;
        const dy = drone.y - proj.y;
        if (Math.sqrt(dx * dx + dy * dy) < drone.size + 3) {
          if (Math.random() < (drone.blockChance || 1)) {
            state.bossProjectiles.splice(pi, 1);
            spawnParticles(state, proj.x, proj.y, 5, drone.accent);
          }
        }
      }
      // Also block enemy projectiles
      for (let pi = state.enemyProjectiles.length - 1; pi >= 0; pi--) {
        const proj = state.enemyProjectiles[pi];
        const dx = drone.x - proj.x;
        const dy = drone.y - proj.y;
        if (Math.sqrt(dx * dx + dy * dy) < drone.size + 3) {
          if (Math.random() < (drone.blockChance || 1)) {
            state.enemyProjectiles.splice(pi, 1);
            spawnParticles(state, proj.x, proj.y, 5, drone.accent);
          }
        }
      }
    }
  });
}

function fireDroneShot(state, drone) {
  // Always fire straight up — no targeting
  state.bullets.push({
    x: drone.x,
    y: drone.y,
    vx: 0,
    vy: -drone.bulletSpeed,
    size: 3,
    dmg: drone.bulletDmg,
    color: drone.bulletColor,
    fromDrone: true,
  });

  spawnParticles(state, drone.x, drone.y, 2, drone.accent, 1);
}

function updateLightningArcs(state, dt) {
  state.lightningArcs.forEach(arc => arc.timer -= dt);
  state.lightningArcs = state.lightningArcs.filter(a => a.timer > 0);
}

function drawLightningArcs(ctx, state) {
  state.lightningArcs.forEach(arc => {
    const t = arc.timer / arc.maxTimer;

    arc.links.forEach(link => {
      // Generate 3 parallel jagged lines per arc for thickness
      for (let layer = 0; layer < 3; layer++) {
        const segments = 10;
        const maxOffset = layer === 0 ? 4 : (layer === 1 ? 7 : 10);
        const lineWidth = layer === 0 ? 3 : (layer === 1 ? 2 : 1);
        const alpha = layer === 0 ? t * 0.95 : (layer === 1 ? t * 0.5 : t * 0.25);

        ctx.save();
        ctx.strokeStyle = layer === 0 ? "#ffffff" : "#88ddff";
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = "#88ddff";
        ctx.shadowBlur = layer === 0 ? 15 : 8;
        ctx.globalAlpha = alpha;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(link.from.x, link.from.y);

        for (let i = 1; i < segments; i++) {
          const progress = i / segments;
          const x = link.from.x + (link.to.x - link.from.x) * progress + (Math.random() - 0.5) * maxOffset;
          const y = link.from.y + (link.to.y - link.from.y) * progress + (Math.random() - 0.5) * maxOffset;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(link.to.x, link.to.y);
        ctx.stroke();
        ctx.restore();
      }

      // Branching sparks at endpoints
      [link.from, link.to].forEach(point => {
        ctx.save();
        ctx.strokeStyle = "#aaeeff";
        ctx.lineWidth = 1;
        ctx.shadowColor = "#88ddff";
        ctx.shadowBlur = 6;
        ctx.globalAlpha = t * 0.6;
        for (let i = 0; i < 4; i++) {
          const angle = Math.random() * Math.PI * 2;
          const len = 4 + Math.random() * 6;
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(point.x + Math.cos(angle) * len, point.y + Math.sin(angle) * len);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Hit flash at each target
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = t * 0.5;
      ctx.shadowColor = "#88ddff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(link.to.x, link.to.y, 6 * t + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  });
}

function drawDrones(ctx, state) {
  const frame = state.frame;
  state.drones.forEach(drone => {
    ctx.save();
    ctx.translate(drone.x, drone.y);

    ctx.shadowColor = drone.color;
    ctx.shadowBlur = 8;

    ctx.fillStyle = drone.color;

    if (drone.behavior === "orbit") {
      ctx.fillRect(-drone.size / 2, -drone.size / 2, drone.size, drone.size);
      ctx.strokeStyle = drone.accent;
      ctx.lineWidth = 1;
      ctx.strokeRect(-drone.size / 2, -drone.size / 2, drone.size, drone.size);
    } else if (drone.id === "hunter") {
      ctx.beginPath();
      ctx.moveTo(0, -drone.size);
      ctx.lineTo(-drone.size * 0.7, drone.size * 0.5);
      ctx.lineTo(drone.size * 0.7, drone.size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = drone.accent;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, drone.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = drone.accent;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Inner core
    ctx.fillStyle = drone.accent;
    ctx.beginPath();
    ctx.arc(0, 0, drone.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Center light pulse
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.1) * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
    ctx.restore();

    // Magnet aura (harvester)
    if (drone.magnetRange) {
      ctx.save();
      ctx.strokeStyle = drone.color;
      ctx.globalAlpha = 0.1;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, drone.magnetRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
}

export function startDeathScene(state, skinAccent) {
  // Force-collect any pending coin pops
  state.coinPops.forEach(coin => {
    if (!coin.dead) state.hudCoinDisplay += coin.value;
  });
  state.coinPops = [];

  state.deathScene = {
    timer: 0,
    duration: 150,     // 2.5 seconds at 60fps
    slowFactor: 0.15,
    shipPieces: [],
    explosionParticles: [],
  };

  // Create ship debris (12 angular pieces)
  for (let i = 0; i < 12; i++) {
    state.deathScene.shipPieces.push({
      x: state.player.x + (Math.random() - 0.5) * 20,
      y: state.player.y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 8,
      color: skinAccent,
    });
  }

  // Big explosion (60 particles)
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    state.deathScene.explosionParticles.push({
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.015 + Math.random() * 0.015,
      size: 1 + Math.random() * 3,
      color: i < 30 ? "#ff8844" : "#ffaa00",
    });
  }

  // Hard screen shake
  state.shakeTimer = 60;
}

export function updateDeathScene(state) {
  if (!state.deathScene) return false;
  state.deathScene.timer++;

  // Update debris
  state.deathScene.shipPieces.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // gravity
    p.rotation += p.rotSpeed;
  });

  // Update explosion particles
  state.deathScene.explosionParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= p.decay;
  });
  state.deathScene.explosionParticles = state.deathScene.explosionParticles.filter(p => p.life > 0);

  // Slow-mo: update stars slowly
  state.stars.forEach(s => {
    s.y += s.speed * state.deathScene.slowFactor;
    if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
  });

  // Slow-mo: drift meteors and enemies slowly
  state.meteors.forEach(m => {
    m.y += m.speed * state.deathScene.slowFactor;
    m.rotation += m.rotSpeed * state.deathScene.slowFactor;
  });

  // Screen shake decay
  if (state.shakeTimer > 0) {
    state.shakeTimer = Math.max(0, state.shakeTimer - 1);
    const intensity = 12 * (state.shakeTimer / 60);
    state.shakeX = (Math.random() - 0.5) * intensity * 2;
    state.shakeY = (Math.random() - 0.5) * intensity * 2;
  } else {
    state.shakeX = 0;
    state.shakeY = 0;
  }

  // Existing particles continue (pooled)
  updatePoolParticlesDeathScene(state.deathScene.slowFactor);

  // After 2.5 sec, signal done
  return state.deathScene.timer >= state.deathScene.duration;
}

export function drawDeathScene(ctx, state) {
  if (!state.deathScene) return;

  // Slow-mo overlay (subtle dark tint)
  ctx.fillStyle = "rgba(20,0,0,0.15)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Big white flash at start
  if (state.deathScene.timer < 8) {
    ctx.fillStyle = `rgba(255,255,255,${(8 - state.deathScene.timer) / 8 * 0.6})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Draw debris
  state.deathScene.shipPieces.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  });

  // Draw explosion particles
  state.deathScene.explosionParticles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // "GAME OVER" text fades in at end
  if (state.deathScene.timer > 60) {
    const t = Math.min(1, (state.deathScene.timer - 60) / 30);
    ctx.save();
    ctx.globalAlpha = t * 0.9;
    ctx.textAlign = "center";
    ctx.font = "900 48px 'Sora', sans-serif";
    ctx.fillStyle = "#ff3333";
    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 30;
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function activateNuke(state, sfx) {
  // Destroy all meteors
  state.meteors.forEach(m => spawnParticles(state, m.x, m.y, 10, `hsl(${m.hue},70%,55%)`, 3));
  state.meteors.length = 0;
  // Destroy all enemies
  state.enemies.forEach(e => spawnParticles(state, e.x, e.y, 10, e.accent || "#ff5544", 3));
  state.enemies.length = 0;
  // Clear boss projectiles and enemy projectiles
  if (state.bossActive) state.bossProjectiles.length = 0;
  state.enemyProjectiles.length = 0;
  // Big visual feedback
  state.killFlashTimer = 30;
  state.killFlashColor = "#ffffff";
  state.comboShakeIntensity = 12;
  state.comboShakeDecay = 30;
  sfx.explosionLarge = true;
}

// ── Pilot Active Abilities ──

export function tryActivateAbility(state) {
  if (state.ability.cooldown > 0 || state.ability.active) return false;
  if (state.gameOver || state.deathScene) return false;

  const pilot = getPilot(state.pilotId);
  if (!pilot.ability) return false;

  state.ability.active = true;
  state.ability.duration = pilot.ability.duration;
  state.ability.cooldown = pilot.ability.cooldown;
  state.abilitiesUsed++;
  state.sfx.ability = true;

  executeAbility(state, pilot.ability.id);
  return true;
}

function updateAbility(state, dt) {
  const dtMs = dt * 16.667;

  if (state.ability.cooldown > 0) {
    const prev = state.ability.cooldown;
    state.ability.cooldown -= dtMs;
    if (state.ability.cooldown <= 0) {
      state.ability.cooldown = 0;
      if (prev > 0) state.sfx.abilityReady = true;
    }
  }

  if (state.ability.duration > 0) {
    state.ability.duration -= dtMs;
    if (state.ability.duration <= 0) {
      state.ability.duration = 0;
      state.ability.active = false;
      onAbilityEnd(state);
    }
  }

  // Barrage shots
  if (state.barrageShots > 0) {
    state.barrageTimer += dt;
    if (state.barrageTimer >= 5) {
      fireBarrageShot(state);
      state.barrageShots--;
      state.barrageTimer = 0;
      state.sfx.shoot = true;
    }
  }

  // Phase dash
  if (state.dashState) {
    state.dashState.timer += dt;
    state.player.y -= 8 * dt;
    state.invincibleTimer = Math.max(state.invincibleTimer, 5);

    // Destroy meteors and enemies in path
    state.meteors.forEach(m => {
      const dx = m.x - state.player.x;
      const dy = m.y - state.player.y;
      if (Math.abs(dx) < 30 && dy > -50 && dy < 100) {
        spawnParticles(state, m.x, m.y, 10, "#cc3322", 3);
        m.hp = 0;
        onKill(state, m.x, m.y, "#cc3322", 5000);
      }
    });
    state.enemies.forEach(e => {
      const dx = e.x - state.player.x;
      const dy = e.y - state.player.y;
      if (Math.abs(dx) < 30 && dy > -50 && dy < 100) {
        spawnParticles(state, e.x, e.y, 10, "#cc3322", 3);
        e.hp = 0;
        onKill(state, e.x, e.y, "#cc3322", 5000);
      }
    });

    if (state.dashState.timer >= state.dashState.duration) {
      state.dashState = null;
      state.player.y = CANVAS_H - 80;
    }
  }

  // Force wave
  if (state.forceWave) {
    state.forceWave.radius += 15 * dt;
    state.forceWave.alpha -= 0.03 * dt;
    if (state.forceWave.radius >= state.forceWave.maxRadius || state.forceWave.alpha <= 0) {
      state.forceWave = null;
    }
  }
}

function onAbilityEnd(state) {
  // Ensure invincibility from shield_dome ends
  // (invincibleTimer will naturally expire, but clear dash state)
  if (state.dashState) {
    state.dashState = null;
    state.player.y = CANVAS_H - 80;
  }
}

function executeAbility(state, abilityId) {
  switch (abilityId) {
    case "barrage":
      state.barrageShots = 12;
      state.barrageTimer = 0;
      break;
    case "shield_dome":
      state.invincibleTimer = Math.max(state.invincibleTimer, 240); // ~4 sec at 60fps
      break;
    case "phase_dash":
      state.dashState = { timer: 0, duration: 30, startY: state.player.y };
      break;
    case "force_blast":
      executeForceBlast(state);
      break;
  }
}

function fireBarrageShot(state) {
  for (let i = -1; i <= 1; i++) {
    state.bullets.push({
      x: state.player.x + i * 8,
      y: state.player.y - 20,
      vx: i * 0.5,
      vy: -12,
      size: 4,
      dmg: 2,
      color: "#ff8833",
      type: "barrage",
      weaponId: state.weaponId,
    });
  }
}

function executeForceBlast(state) {
  // Destroy all meteors and enemies
  state.meteors.forEach(m => {
    spawnParticles(state, m.x, m.y, 10, "#cc1100", 3);
    onKill(state, m.x, m.y, "#cc1100", 5000);
  });
  state.meteors.length = 0;

  state.enemies.forEach(e => {
    spawnParticles(state, e.x, e.y, 10, "#cc1100", 3);
    onKill(state, e.x, e.y, "#cc1100", 5000);
  });
  state.enemies.length = 0;

  // Abilities do NOT damage bosses — only clear projectiles
  if (state.bossActive) {
    state.bossHitFlash = 5;
  }

  // Clear projectiles
  if (state.bossActive) state.bossProjectiles.length = 0;
  state.enemyProjectiles.length = 0;

  // Big screen effects
  state.killFlashTimer = 40;
  state.killFlashColor = "#cc1100";
  state.comboShakeIntensity = 15;
  state.comboShakeDecay = 30;

  // Force wave visual
  state.forceWave = { radius: 0, maxRadius: 400, alpha: 1 };

  state.sfx.explosionLarge = true;
}

export function updateGame(state) {
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
  sfx.eventWarning = false; sfx.eventComplete = false; sfx.lowHp = false; sfx.ability = false; sfx.coinPickup = false;
  sfx.comboBreak = false; sfx.achievement = false; sfx.comboTier = false; sfx.abilityReady = false;
  sfx.encounterStart = false; sfx.encounterSuccess = false; sfx.encounterDanger = false;

  // Compute delta time
  const dt = computeDeltaTime();

  // DEBUG: boss trigger diagnostics (disabled in production)
  // if (state.frame % 60 === 0) {
  //   console.log("Distance:", state.distance, "Defeated:", state.bossDefeatedList, "ActiveBoss:", state.bossActive?.id, "BossState:", state.bossState, "WaveEvent:", state.activeWaveEvent?.id);
  // }

  // World speed multiplier (HYPERSPEED event or encounter buff)
  const encounterSpeed = state._encounterSpeedMult || 1;
  const worldSpeed = state.activeWaveEvent?.id === "speed_run" ? 3 : encounterSpeed;
  state.worldSpeed = worldSpeed;

  // Slow-time and freeze factors for enemies (worldSpeed stacks on top)
  const frozen = state.activeEffects.freeze > 0;
  const baseEnemySlow = frozen ? 0 : (state.activeEffects.slowtime > 0 ? 0.3 : 1);
  const enemySlowFactor = baseEnemySlow * worldSpeed;

  // Double-points multiplier + pilot coin bonus
  const pilotCoinMult = (state.pilotBonus && (state.pilotBonus.type === "coins" || state.pilotBonus.type === "all"))
    ? (1 + state.pilotBonus.value) : 1;
  const distMultiplier = (state.activeEffects.doublepts > 0 ? 2 : 1) * pilotCoinMult;

  // Distance accumulation (paused during boss fight)
  if (!state.bossActive) {
    state.distance += BASE_DISTANCE_PER_FRAME * dt * distMultiplier * worldSpeed;
  }

  // Zone change check
  const currentZone = getCurrentZoneWaves(state.distance);
  if (currentZone.description && currentZone.description !== state.lastZoneDesc) {
    state.lastZoneDesc = currentZone.description;
    state.zoneNotification = currentZone.description.toUpperCase();
    state.zoneNotificationTimer = 180; // 3 seconds
  }
  if (state.zoneNotificationTimer > 0) {
    state.zoneNotificationTimer -= dt;
    if (state.zoneNotificationTimer <= 0) {
      state.zoneNotification = null;
    }
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
    state.milestoneNotificationTimer -= dt;
    if (state.milestoneNotificationTimer <= 0) {
      state.milestoneNotification = null;
    }
  }

  // Achievement notification decay (legacy)
  if (state.achievementNotificationTimer > 0) {
    state.achievementNotificationTimer -= dt;
    if (state.achievementNotificationTimer <= 0) {
      state.achievementNotification = null;
    }
  }

  // Dramatic achievement notification update
  if (state.achNotification) {
    state.achNotification.timer -= dt;
    state.achNotification.rays += dt;
    const t = state.achNotification.timer / state.achNotification.maxTimer;
    if (t > 0.85) state.achNotification.phase = "intro";
    else if (t < 0.15) state.achNotification.phase = "outro";
    else state.achNotification.phase = "display";
    state.achNotification.sparkles.forEach(s => {
      if (s.delay > 0) { s.delay -= dt; return; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 0.05 * dt;
      s.life -= 0.015 * dt;
    });
    if (state.achNotification.timer <= 0) {
      state.achNotification = null;
      if (state.achNotificationQueue.length > 0) {
        state._achNextDelay = 6;
      }
    }
  }
  if (state._achNextDelay > 0) {
    state._achNextDelay -= dt;
    if (state._achNextDelay <= 0) {
      state._achNextDelay = 0;
      if (state.achNotificationQueue.length > 0) {
        const next = state.achNotificationQueue.shift();
        _startAchNotification(state, next);
      }
    }
  }

  // ─── BOSS TRIGGER (priority over wave events) ───
  if (!state.bossActive && state.bossState === "none") {
    const boss = getBossForDistance(state.distance, state.bossDefeatedList);
    if (boss) {
      // Cancel any active wave events — boss takes priority
      state.activeWaveEvent = null;
      state.waveEventWarning = null;
      state.waveEventTimer = 0;
      state.meteorSpawningEnabled = false;
      state.meteors = [];
      state.enemies = [];
      state.enemyProjectiles = [];
      state.bossWarningTimer = 150;
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
      state.bossWarningTimer -= dt;
      if (state.bossWarningTimer <= 0) {
        state.bossState = "entering";
        state.bossEntranceTimer = 0;
      }
    }

    if (state.bossState === "entering") {
      state.bossEntranceTimer = (state.bossEntranceTimer || 0) + dt;
      // Player is invincible during entrance
      state.invincibleTimer = Math.max(state.invincibleTimer, 2);
      state.bossY += 1.5 * dt;
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
      state.bossPhaseTransitionTimer -= dt;
      // Screen shake for first 5 frames
      if (state.bossPhaseTransitionTimer > 55) {
        state.shakeTimer = Math.max(state.shakeTimer, 2);
      }
    }

    // Decay hit flash and smooth HP bar
    if (state.bossHitFlash > 0) state.bossHitFlash -= dt;
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
        p.x += (p.vx || 0) * dt * enemySlowFactor;
        p.y += (p.vy || 0) * dt * enemySlowFactor;
        p.lifetime = (p.lifetime || 300) - dt;

        // Homing missiles
        if (p.homing) {
          const dx = state.player.x - p.x;
          const dy = state.player.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            p.vx += (dx / len) * 0.1 * dt * enemySlowFactor;
            p.vy += (dy / len) * 0.1 * dt * enemySlowFactor;
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

          // Lightning chain from boss hit
          if (b.type === "lightning" && b.chains > 0) {
            onLightningHit(state, b, { x: state.bossX, y: state.bossY });
          }

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
      state.bossTimer += dt;

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

        // Queue boss achievement check for GameScreen to process
        state.achievementQueue.push({ type: "boss", bossId: state.bossActive.id, totalDefeated: state.bossDefeatedList.length });

        // Boss kill counts toward combo (with boss reward as coin value)
        onKill(state, state.bossX, state.bossY, state.bossActive.color, 0, sfx, state.bossActive.reward);

        state.bossState = "dead";
        state.bossTimer = 0;
      }
    }

    if (state.bossState === "dead") {
      state.bossTimer += dt;
      if (state.bossWhiteFlash > 0) state.bossWhiteFlash -= dt;
      if (state.bossDefeatTextTimer > 0) state.bossDefeatTextTimer -= dt;
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
  const tier = getDifficultyTier(state.distance);

  // Player movement — X only, Y is ALWAYS locked
  if (state.touching) {
    state.player.targetX = state.touchX;
  }
  const sens = state.sensitivity || 1.0;
  state.player.x += (state.player.targetX - state.player.x) * 0.15 * sens * dt;
  state.player.x = Math.max(state.player.w, Math.min(CANVAS_W - state.player.w, state.player.x));
  state.player.y = CANVAS_H - 80; // LOCKED — never changes

  // Update pilot active ability
  updateAbility(state, dt);
  // Phase dash overrides y-lock
  if (state.dashState) {
    state.player.y = Math.max(100, state.player.y);
  }

  // Auto-fire (weapon-aware)
  const weapon = getWeapon(state.weaponId);
  const wStats = weapon.levels[state.weaponLevel] || weapon.levels[0];
  const baseFireRate = wStats.fireRate;
  // Pilot fire rate bonus
  const pilotFRMult = (state.pilotBonus && (state.pilotBonus.type === "fireRate" || state.pilotBonus.type === "all"))
    ? (1 - state.pilotBonus.value) : 1;
  const fireRate = (state.activeEffects.rapid > 0 ? baseFireRate / 2.5 : baseFireRate) * pilotFRMult;
  // Pilot damage bonus
  const pilotDmgMult = (state.pilotBonus && (state.pilotBonus.type === "damage" || state.pilotBonus.type === "all"))
    ? (1 + state.pilotBonus.value) : 1;
  if (state.touching && now - state.lastFireTime > fireRate) {
    state.lastFireTime = now;
    sfx.shoot = true;
    const px = state.player.x;
    const py = state.player.y - state.player.h;
    const stationDmgMult = 1 + (state.stationBuffs?.damage_mult || 0);
    const encounterDmgMult = state._encounterDamageMult || 1;
    const adjustedDmg = wStats.dmg * pilotDmgMult * stationDmgMult * encounterDmgMult;
    const bulletBase = { size: wStats.size, dmg: adjustedDmg, weaponId: state.weaponId };

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
    } else if (wStats.chains !== undefined) {
      // Lightning chain
      for (let i = 0; i < wStats.bullets; i++) {
        const offsetX = wStats.bullets > 1 ? (i - (wStats.bullets - 1) / 2) * 10 : 0;
        state.bullets.push({ x: px + offsetX, y: py, vx: 0, vy: -wStats.speed, ...bulletBase, type: "lightning", chains: wStats.chains, chainRange: wStats.chainRange });
      }
      if (tripleActive) {
        state.bullets.push({ x: px - 8, y: py + 4, vx: -1.2, vy: -wStats.speed, ...bulletBase, type: "lightning", chains: wStats.chains, chainRange: wStats.chainRange });
        state.bullets.push({ x: px + 8, y: py + 4, vx: 1.2, vy: -wStats.speed, ...bulletBase, type: "lightning", chains: wStats.chains, chainRange: wStats.chainRange });
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
      // Find nearest target (meteors + enemies)
      let nearest = null, nearDist = Infinity;
      state.meteors.forEach(m => {
        const dx = m.x - b.x, dy = m.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearDist) { nearDist = d; nearest = m; }
      });
      state.enemies.forEach(en => {
        const dx = en.x - b.x, dy = en.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearDist) { nearDist = d; nearest = en; }
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
        spawnPoolParticle(
          b.x, b.y,
          (Math.random() - 0.5) * 0.5, Math.random() * 0.5 + 0.2,
          0.6, 0.03, 2, "rgba(180,180,180,0.5)"
        );
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  });
  state.bullets = state.bullets.filter(b => b.y > -10 && b.y < CANVAS_H + 10 && b.x > -10 && b.x < CANVAS_W + 10);

  // Waves
  state.waveFrame += dt;
  if (state.waveFrame >= WAVE_DURATION_FRAMES) {
    if (!state.wasHitThisWave) state.noHitWaves++;
    state.wasHitThisWave = false;
    state.waveFrame = 0;
    state.wave++;
    sfx.waveStart = true;

    // Wave event trigger check
    if (!state.bossActive && !state.activeWaveEvent && !state.waveEventWarning) {
      state.wavesUntilEvent--;
      if (state.wavesUntilEvent <= 0) {
        const event = pickWaveEvent();
        state.waveEventWarning = { event, timer: 180, maxTimer: 180 };
        sfx.eventWarning = true;
      }
    }
  }

  // ─── WAVE EVENT UPDATE ───
  if (state.waveEventWarning) {
    state.waveEventWarning.timer -= dt;
    if (state.waveEventWarning.timer <= 0) {
      const event = state.waveEventWarning.event;
      state.activeWaveEvent = event;
      state.waveEventTimer = event.duration / 16.667;
      state.waveEventSpawnTimer = 0;
      state.waveEventWarning = null;
    }
  }

  if (state.activeWaveEvent) {
    state.waveEventTimer -= dt;
    if (state.waveEventTimer <= 0) {
      // Event complete — bonus reward
      const bonusCoins = 50 + state.totalWaveEventsCompleted * 10;
      state.eventCoinsEarned += bonusCoins;
      state.actualCoinsThisRun += bonusCoins;
      state.totalWaveEventsCompleted++;
      state.rewardPopup = { text: `+${bonusCoins} COINS`, color: "#ffaa00", timer: 120, maxTimer: 120 };
      // Spawn coin pop from center of screen
      spawnCoinPop(state, CANVAS_W / 2, CANVAS_H / 2, bonusCoins);
      state.activeWaveEvent = null;
      state.wavesUntilEvent = 5 + Math.floor(Math.random() * 3);
      sfx.eventComplete = true;
    }
  }

  // Reward popup decay
  if (state.rewardPopup && state.rewardPopup.timer > 0) {
    state.rewardPopup.timer -= dt;
  }

  // ─── NPC ENCOUNTER SYSTEM ───

  // Encounter timer — only tick when no boss, no wave event, no active encounter dialog
  if (!state.bossActive && !state.activeWaveEvent && !state.waveEventWarning && !state.encounter) {
    state.encounterTimer += dt / 60; // convert frames to seconds
    if (state.encounterTimer >= state.encounterNextTime) {
      state.encounterTimer = 0;
      state.encounterNextTime = 45 + Math.random() * 30; // 45-75 sec
      {
        const enc = pickRandomEncounter();
        state.encounter = {
          data: enc,
          phase: "approach",  // approach → dialog → result → leave
          timer: 0,
          npcX: -50,
          npcY: 150,
          targetX: CANVAS_W / 2 - 60,
          resultMsg: null,
          resultSuccess: false,
          resultDanger: false,
        };
        sfx.encounterStart = true;
      }
    }
  }

  // Update active encounter animation
  if (state.encounter) {
    state.encounter.timer += dt;
    if (state.encounter.phase === "approach") {
      state.encounter.npcX += 1.5 * dt;
      if (state.encounter.npcX >= state.encounter.targetX) {
        state.encounter.phase = "dialog";
        state.encounterPaused = true;
        // Signal React layer to show dialog
        if (window.onEncounterDialog) {
          window.onEncounterDialog(state.encounter.data);
        }
      }
    } else if (state.encounter.phase === "result") {
      if (state.encounter.timer > 150) {
        state.encounter.phase = "leave";
      }
    } else if (state.encounter.phase === "leave") {
      state.encounter.npcX += 2.5 * dt;
      if (state.encounter.npcX > CANVAS_W + 60) {
        state.encounter = null;
      }
    }
  }

  // Pause game completely during encounter dialog
  if (state.encounterPaused) return;

  // Process encounter enemy spawns
  if (state.encounterEnemySpawns && state.encounterEnemySpawns.length > 0) {
    const spawns = state.encounterEnemySpawns.splice(0);
    for (const s of spawns) {
      spawnEventEnemy(state, s.type, { offsetX: s.x - CANVAS_W / 2 });
    }
  }

  // Spawn meteors (distance-based difficulty affects spawn rate)
  if (state.waveEventWarning) {
    // Pause spawning during warning
  } else if (state.activeWaveEvent) {
    // Event-specific spawning
    state.waveEventSpawnTimer -= dt;
    if (state.waveEventSpawnTimer <= 0) {
      switch (state.activeWaveEvent.id) {
        case "meteor_storm":
          for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            spawnMeteor(state, tier.speed * 1.3);
          }
          state.waveEventSpawnTimer = 30;
          break;
        case "elite_wave":
          spawnEventEnemy(state, "elite");
          state.waveEventSpawnTimer = 80;
          break;
        case "bonus_wave":
          spawnGoldenMeteor(state);
          state.waveEventSpawnTimer = 50;
          break;
        case "swarm":
          for (let i = 0; i < 6; i++) {
            spawnEventEnemy(state, "gnat", { offsetX: (i - 3) * 40 });
          }
          state.waveEventSpawnTimer = 120;
          break;
        case "asteroid_field":
          for (let i = 0; i < 4; i++) {
            spawnSmallMeteor(state, tier.speed * 0.7);
          }
          state.waveEventSpawnTimer = 25;
          break;
        case "double_trouble":
          spawnMeteor(state, tier.speed);
          spawnMeteor(state, tier.speed);
          // Mark last two meteors as double reward
          for (let i = Math.max(0, state.meteors.length - 2); i < state.meteors.length; i++) {
            state.meteors[i].doubleReward = true;
          }
          state.waveEventSpawnTimer = 60;
          break;
        case "speed_run":
          spawnMeteor(state, tier.speed);
          state.waveEventSpawnTimer = 100;
          break;
      }
    }
  } else if (state.meteorSpawningEnabled) {
    const zone = getCurrentZoneWaves(state.distance);
    const meteorMult = zone.meteorMultiplier || 1;
    const baseSpawnRate = 60;
    const spawnRate = Math.max(6, Math.floor(baseSpawnRate * tier.spawn / meteorMult));
    if (state.frame % spawnRate === 0) {
      spawnMeteor(state, tier.speed);
    }
  }

  // Enemy ships spawn check (every 60 frames, not during boss, wave events, or encounter dialog)
  const encounterBlocking = state.encounter && state.encounter.phase === "dialog";
  if (state.frame % 60 === 0 && !state.bossActive && !state.activeWaveEvent && !state.waveEventWarning && !encounterBlocking) {
    maybeSpawnEnemy(state);
  }
  updateEnemies(state, dt, enemySlowFactor);
  updateEnemyProjectiles(state, dt, enemySlowFactor);

  // Meteors
  state.meteors.forEach(m => {
    m.y += m.speed * dt * enemySlowFactor;  // enemySlowFactor already includes worldSpeed
    m.rotation += m.rotSpeed * dt * baseEnemySlow;
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

        // Lightning chain
        if (b.type === "lightning" && b.chains > 0) {
          onLightningHit(state, b, m);
        }

        if (m.hp <= 0) {
          // Sound: large meteor (radius > 20) vs small
          if (m.radius > 20) sfx.explosionLarge = true;
          else sfx.explosionSmall = true;

          // Golden meteor bonus
          let meteorCoins = 1;
          if (m.golden) {
            const goldCoins = (m.coinValue || 5) * 5;
            state.eventCoinsEarned += goldCoins;
            meteorCoins = goldCoins;
            // Gold burst particles
            spawnParticles(state, m.x, m.y, 15, "#ffcc44", 3);
          }

          // Double trouble reward multiplier
          const rewardMult = m.doubleReward ? 2 : 1;

          // Combo via centralized onKill (with coin value for pop animation)
          onKill(state, m.x, m.y, m.golden ? "#ffcc44" : `hsl(${m.hue},70%,55%)`, m.bonusDistance * rewardMult, sfx, meteorCoins);

          // Powerup drop (doubled by karma buff)
          const dropChance = 0.15 * (state._encounterPowerupMult || 1);
          if (Math.random() < dropChance) {
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

  // Bullet-enemy and player-enemy collisions
  checkBulletEnemyCollisions(state);
  if (state.gameOver) return;
  checkPlayerEnemyCollisions(state);
  if (state.gameOver) return;

  // Invincibility
  if (state.invincibleTimer > 0) state.invincibleTimer -= dt;

  // Magnet effect — pull powerups toward player
  if (state.activeEffects.magnet > 0) {
    state.powerups.forEach(pu => {
      const dx = state.player.x - pu.x;
      const dy = state.player.y - pu.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        pu.x += (dx / dist) * 5 * dt;
        pu.y += (dy / dist) * 5 * dt;
      }
    });
  }

  // Drone companions
  if (state.drones.length > 0) {
    updateDrones(state, dt);
  }

  // Powerup collection
  for (let pi = state.powerups.length - 1; pi >= 0; pi--) {
    const p = state.powerups[pi];
    p.y += p.vy * dt * worldSpeed;
    p.pulse += 0.08 * dt;
    const dx = state.player.x - p.x;
    const dy = state.player.y - p.y;
    if (dx * dx + dy * dy < 900) {
      if (p.type === "life") {
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
      } else if (p.type === "nuke") {
        activateNuke(state, sfx);
        state.nukesUsed++;
      } else {
        const puDurMult = 1 + (state.stationBuffs?.powerup_duration || 0);
        state.activeEffects[p.type] = p.duration * puDurMult;
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

  // Particles (pooled)
  updatePoolParticles(dt);

  // Lightning arcs
  updateLightningArcs(state, dt);

  // Coin pops
  updateCoinPops(state, dt);

  // Stars drift
  state.stars.forEach(s => {
    s.y += s.speed * dt * worldSpeed;
    if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
  });

  // FIX: Zone change detection — uses separate state field to avoid overwriting string notification
  {
    const zoneName = getCurrentZoneName(state.distance);
    if (zoneName !== state.lastZoneName) {
      state.lastZoneName = zoneName;
      state.zoneNameNotification = { name: zoneName, timer: 120, color: "#aaddff" };
    }
  }
  // Zone name notification decay
  if (state.zoneNameNotification && state.zoneNameNotification.timer > 0) {
    state.zoneNameNotification.timer -= dt;
  }

  // Combo decay
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0 && state.combo > 0) {
      triggerComboBreak(state);
      state.combo = 0;
      state.comboMultiplier = 1;
      state.lastComboTier = 0;
    }
  }

  // Combo break animation update
  if (state.comboBreak) {
    state.comboBreak.timer -= dt;
    state.comboBreak.shards.forEach(s => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 0.15 * dt;
      s.rotation += s.rotSpeed * dt;
      s.life -= 0.018 * dt;
    });
    if (state.comboBreak.timer <= 0) state.comboBreak = null;
  }

  // Kill flash decay
  if (state.killFlashTimer > 0) state.killFlashTimer -= dt;

  // Combo shake decay
  if (state.comboShakeDecay > 0) {
    state.comboShakeDecay -= dt;
    if (state.comboShakeDecay <= 0) state.comboShakeIntensity = 0;
  }

  // Combo popup decay
  if (state.comboPopup && state.comboPopup.timer > 0) {
    state.comboPopup.timer -= dt;
  }

  // Speed lines update
  const comboTier = getComboTier(state.combo);
  const hasHyperspeed = state.activeWaveEvent?.id === "speed_run";
  if (!comboTier.speedLines && !hasHyperspeed) {
    state.speedLineParticles = [];
  } else {
    // Combo speed lines
    if (comboTier.speedLines && Math.random() < 0.3) {
      const side = Math.random() < 0.5;
      state.speedLineParticles.push({
        x: side ? Math.random() * 60 : CANVAS_W - Math.random() * 60,
        y: CANVAS_H + 10,
        speed: 8 + Math.random() * 6,
        length: 30 + Math.random() * 40,
        alpha: 0.1 + Math.random() * 0.15,
        width: 1 + Math.random(),
      });
    }
    // HYPERSPEED extra speed lines (cyan, wider spread, faster)
    if (hasHyperspeed && Math.random() < 0.6) {
      state.speedLineParticles.push({
        x: Math.random() < 0.5 ? Math.random() * 80 : CANVAS_W - Math.random() * 80,
        y: CANVAS_H + 10,
        speed: 20 + Math.random() * 10,
        length: 60 + Math.random() * 40,
        alpha: 0.2 + Math.random() * 0.2,
        width: 1.5,
        color: "#00ddff",
      });
    }
    state.speedLineParticles.forEach(p => { p.y -= p.speed * dt; });
    state.speedLineParticles = state.speedLineParticles.filter(p => p.y + p.length > 0);
    if (state.speedLineParticles.length > 60) {
      state.speedLineParticles = state.speedLineParticles.slice(-60);
    }
  }

  // Update combo visual effects
  updateComboEffects();

  // Active effects decay
  for (const key of Object.keys(state.activeEffects)) {
    if (state.activeEffects[key] > 0) {
      state.activeEffects[key] -= 16.667 * dt;
      if (state.activeEffects[key] < 0) state.activeEffects[key] = 0;
    }
  }

  // Screen shake — combine damage shake, boss shake, and combo shake
  if (state.shakeTimer > 0 || state.comboShakeDecay > 0) {
    state.shakeTimer = Math.max(0, state.shakeTimer - dt);
    let intensity = 0;
    if (state.shakeTimer > 0) {
      intensity = (state.bossState === "dying" || state.bossState === "dead") ? 8 : 6;
    }
    if (state.comboShakeDecay > 0) {
      intensity = Math.max(intensity, state.comboShakeIntensity);
    }
    state.shakeX = (Math.random() - 0.5) * intensity * 2;
    state.shakeY = (Math.random() - 0.5) * intensity * 2;
  } else {
    state.shakeX = 0;
    state.shakeY = 0;
  }

  // Low HP warning — trigger sound when lives drop to 1
  if (state.lives === 1 && state.lastLives > 1) {
    sfx.lowHp = true;
  }
  state.lastLives = state.lives;
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

// ── Ship drawing functions ──

function drawDefaultShip(ctx, state, skin) {
  const shipAccent = skin ? skin.accent : "#00aaff";
  const shipFlame = skin ? skin.flame : "#88ddff";
  const shipVisor = skin ? skin.visor : "#00ddff";
  const shipHullTop = skin && skin.hull ? skin.hull.top : "#3e3e68";
  const shipHullMid = skin && skin.hull ? skin.hull.mid : "#2a2a4e";
  const shipHullBot = skin && skin.hull ? skin.hull.bot : "#161636";
  const frame = state.frame;

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
}

// Old drawFlame removed — trail system handles all flames now

function drawReaper(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  // SVG viewBox 280x340, center (140,165), scale ~0.155
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Organic curved wings - left
  ctx.fillStyle = "#2a0e35";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(130));
  ctx.quadraticCurveTo(sx(70), sy(145), sx(35), sy(185));
  ctx.quadraticCurveTo(sx(22), sy(240), sx(60), sy(270));
  ctx.quadraticCurveTo(sx(105), sy(240), sx(130), sy(185));
  ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.7; ctx.stroke();
  // Left wing tip barb
  ctx.fillStyle = "#3a1645";
  ctx.beginPath();
  ctx.moveTo(sx(35), sy(185)); ctx.lineTo(sx(20), sy(170)); ctx.lineTo(sx(33), sy(195));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();

  // Right wing
  ctx.fillStyle = "#2a0e35";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(130));
  ctx.quadraticCurveTo(sx(210), sy(145), sx(245), sy(185));
  ctx.quadraticCurveTo(sx(258), sy(240), sx(220), sy(270));
  ctx.quadraticCurveTo(sx(175), sy(240), sx(150), sy(185));
  ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.7; ctx.stroke();
  // Right wing tip barb
  ctx.fillStyle = "#3a1645";
  ctx.beginPath();
  ctx.moveTo(sx(245), sy(185)); ctx.lineTo(sx(260), sy(170)); ctx.lineTo(sx(247), sy(195));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();

  // Wing veins (left)
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(145)); ctx.quadraticCurveTo(sx(90), sy(165), sx(60), sy(215)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.3); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(150)); ctx.quadraticCurveTo(sx(105), sy(175), sx(75), sy(225)); ctx.stroke();
  // Wing veins (right)
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(145)); ctx.quadraticCurveTo(sx(190), sy(165), sx(220), sy(215)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.3); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(150)); ctx.quadraticCurveTo(sx(175), sy(175), sx(205), sy(225)); ctx.stroke();

  // Main body (elongated organic shape)
  ctx.fillStyle = "#3a1645";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(30));
  ctx.quadraticCurveTo(sx(170), sy(55), sx(185), sy(130));
  ctx.quadraticCurveTo(sx(190), sy(220), sx(160), sy(280));
  ctx.quadraticCurveTo(sx(140), sy(310), sx(120), sy(280));
  ctx.quadraticCurveTo(sx(90), sy(220), sx(95), sy(130));
  ctx.quadraticCurveTo(sx(110), sy(55), sx(140), sy(30));
  ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.7; ctx.stroke();
  // Inner body
  ctx.fillStyle = "#4a1c5a";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(42));
  ctx.quadraticCurveTo(sx(165), sy(65), sx(178), sy(135));
  ctx.quadraticCurveTo(sx(182), sy(215), sx(155), sy(270));
  ctx.quadraticCurveTo(sx(140), sy(295), sx(125), sy(270));
  ctx.quadraticCurveTo(sx(98), sy(215), sx(102), sy(135));
  ctx.quadraticCurveTo(sx(115), sy(65), sx(140), sy(42));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.4; ctx.stroke();

  // Body vein
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(155)); ctx.quadraticCurveTo(sx(132), sy(200), sx(140), sy(245)); ctx.stroke();

  // Alien eye cockpit
  ctx.fillStyle = "#1a0820";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(115), 18*S, 26*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(f, 0.8); ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillStyle = hexToRgba(a, 0.4);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(115), 14*S, 22*S, 0, 0, Math.PI*2); ctx.fill();
  // Pupil
  ctx.fillStyle = "#2a1240";
  ctx.beginPath(); ctx.arc(sx(140), sy(115), 10*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.4; ctx.stroke();
  // Visor slit
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.fillRect(sx(131), sy(112), 18*S, 6*S);
  // Eye highlight
  ctx.fillStyle = hexToRgba(v, 0.4);
  ctx.beginPath(); ctx.ellipse(sx(137), sy(108), 4*S, 5*S, 0, 0, Math.PI*2); ctx.fill();
}

function drawTitan(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Dual heavy engines (nozzle hardware only — flame handled by trail system)
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.roundRect(sx(105), sy(295), 22*S, 20*S, 2*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(sx(153), sy(295), 22*S, 20*S, 2*S); ctx.fill();
  ctx.stroke();

  // Left cannon pod
  ctx.fillStyle = "#3a2818";
  ctx.beginPath(); ctx.roundRect(sx(20), sy(100), 50*S, 180*S, 5*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.6); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = "#4a3320";
  ctx.beginPath(); ctx.roundRect(sx(25), sy(105), 40*S, 170*S, 3*S); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();
  // Left pod rivets
  ctx.fillStyle = "#1a1208";
  [115, 265].forEach(ry => { [35, 55].forEach(rx => {
    ctx.beginPath(); ctx.arc(sx(rx), sy(ry), 2.5*S, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  }); });
  // Left pod armor bands
  ctx.fillStyle = "#5a3f25";
  [155, 190, 225].forEach(y => ctx.fillRect(sx(25), sy(y), 40*S, 3*S));
  // Left pod gun barrel
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.roundRect(sx(38), sy(85), 14*S, 18*S, 1*S); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();
  ctx.fillStyle = hexToRgba(f, 0.6);
  ctx.beginPath(); ctx.arc(sx(45), sy(85), 3*S, 0, Math.PI*2); ctx.fill();

  // Right cannon pod
  ctx.fillStyle = "#3a2818";
  ctx.beginPath(); ctx.roundRect(sx(210), sy(100), 50*S, 180*S, 5*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.6); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = "#4a3320";
  ctx.beginPath(); ctx.roundRect(sx(215), sy(105), 40*S, 170*S, 3*S); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();
  // Right pod rivets
  ctx.fillStyle = "#1a1208";
  [115, 265].forEach(ry => { [225, 245].forEach(rx => {
    ctx.beginPath(); ctx.arc(sx(rx), sy(ry), 2.5*S, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  }); });
  // Right pod armor bands
  ctx.fillStyle = "#5a3f25";
  [155, 190, 225].forEach(y => ctx.fillRect(sx(215), sy(y), 40*S, 3*S));
  // Right pod gun barrel
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.roundRect(sx(228), sy(85), 14*S, 18*S, 1*S); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();
  ctx.fillStyle = hexToRgba(f, 0.6);
  ctx.beginPath(); ctx.arc(sx(235), sy(85), 3*S, 0, Math.PI*2); ctx.fill();

  // Main armored hull
  ctx.fillStyle = "#3a2818";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(185), sy(95)); ctx.lineTo(sx(195), sy(235));
  ctx.lineTo(sx(185), sy(280)); ctx.lineTo(sx(140), sy(305));
  ctx.lineTo(sx(95), sy(280)); ctx.lineTo(sx(85), sy(235)); ctx.lineTo(sx(95), sy(95));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
  // Inner hull
  ctx.fillStyle = "#4a3320";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(60)); ctx.lineTo(sx(180), sy(100)); ctx.lineTo(sx(188), sy(230));
  ctx.lineTo(sx(180), sy(273)); ctx.lineTo(sx(140), sy(295));
  ctx.lineTo(sx(100), sy(273)); ctx.lineTo(sx(92), sy(230)); ctx.lineTo(sx(100), sy(100));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();
  // Armor plate lines
  ctx.strokeStyle = "#5a3f25"; ctx.lineWidth = 0.4;
  [140, 180, 220, 255].forEach(y => {
    ctx.beginPath(); ctx.moveTo(sx(98), sy(y)); ctx.lineTo(sx(182), sy(y)); ctx.stroke();
  });

  // Tank cockpit
  ctx.fillStyle = "#1a1208";
  ctx.beginPath(); ctx.roundRect(sx(118), sy(92), 44*S, 42*S, 4*S); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = "#0e0804";
  ctx.beginPath(); ctx.roundRect(sx(123), sy(97), 34*S, 32*S, 3*S); ctx.fill();
  ctx.fillStyle = hexToRgba(v, 0.4);
  ctx.beginPath(); ctx.roundRect(sx(127), sy(103), 26*S, 20*S, 2*S); ctx.fill();
  // Cockpit inner circle
  ctx.fillStyle = "#3a2818";
  ctx.beginPath(); ctx.arc(sx(140), sy(113), 9*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = a; ctx.lineWidth = 0.4; ctx.stroke();
  // Visor slit
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.fillRect(sx(131), sy(111), 18*S, 6*S);

  // Antenna array
  ctx.strokeStyle = a; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sx(135), sy(50)); ctx.lineTo(sx(135), sy(35)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(140), sy(28)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx(145), sy(50)); ctx.lineTo(sx(145), sy(35)); ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.6);
  ctx.beginPath(); ctx.arc(sx(140), sy(26), 2.5*S, 0, Math.PI*2); ctx.fill();
}

function drawShadow(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Single thin engine (nozzle hardware only)
  ctx.fillStyle = "#0a0a18";
  ctx.beginPath(); ctx.roundRect(sx(132), sy(295), 16*S, 14*S, 1*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.4; ctx.stroke();

  // Backswept sharp wings - left
  ctx.fillStyle = "#0e0e1e";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(80)); ctx.lineTo(sx(70), sy(140));
  ctx.lineTo(sx(40), sy(210)); ctx.lineTo(sx(70), sy(235));
  ctx.lineTo(sx(120), sy(200)); ctx.lineTo(sx(140), sy(150));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.6; ctx.stroke();
  // Left wing vein
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(70), sy(140)); ctx.lineTo(sx(120), sy(200)); ctx.stroke();
  // Left wing tip light
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.beginPath(); ctx.arc(sx(42), sy(220), 2*S, 0, Math.PI*2); ctx.fill();

  // Right wing
  ctx.fillStyle = "#0e0e1e";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(80)); ctx.lineTo(sx(210), sy(140));
  ctx.lineTo(sx(240), sy(210)); ctx.lineTo(sx(210), sy(235));
  ctx.lineTo(sx(160), sy(200)); ctx.lineTo(sx(140), sy(150));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.6; ctx.stroke();
  // Right wing vein
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(210), sy(140)); ctx.lineTo(sx(160), sy(200)); ctx.stroke();
  // Right wing tip light
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.beginPath(); ctx.arc(sx(238), sy(220), 2*S, 0, Math.PI*2); ctx.fill();

  // Narrow blade hull (outer)
  ctx.fillStyle = "#141428";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(60)); ctx.lineTo(sx(160), sy(120)); ctx.lineTo(sx(165), sy(220));
  ctx.lineTo(sx(155), sy(270)); ctx.lineTo(sx(140), sy(300));
  ctx.lineTo(sx(125), sy(270)); ctx.lineTo(sx(115), sy(220));
  ctx.lineTo(sx(120), sy(120));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.6; ctx.stroke();
  // Inner hull
  ctx.fillStyle = "#1a1a32";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(70)); ctx.lineTo(sx(156), sy(122)); ctx.lineTo(sx(162), sy(218));
  ctx.lineTo(sx(152), sy(265)); ctx.lineTo(sx(140), sy(290));
  ctx.lineTo(sx(128), sy(265)); ctx.lineTo(sx(118), sy(218));
  ctx.lineTo(sx(124), sy(122));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.3); ctx.lineWidth = 0.3; ctx.stroke();

  // Center line
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(70)); ctx.lineTo(sx(140), sy(290)); ctx.stroke();
  // Hull cross lines
  ctx.strokeStyle = hexToRgba(a, 0.3); ctx.lineWidth = 0.3;
  [180, 220, 250].forEach(y => {
    ctx.beginPath(); ctx.moveTo(sx(125), sy(y)); ctx.lineTo(sx(155), sy(y)); ctx.stroke();
  });

  // Slim cockpit
  ctx.fillStyle = "#141428";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(130), 7*S, 22*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.6); ctx.lineWidth = 0.4; ctx.stroke();
  ctx.fillStyle = "#1e1e3a";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(130), 5*S, 18*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0e0e22";
  ctx.beginPath(); ctx.arc(sx(140), sy(135), 6*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  // Visor slit
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.fillRect(sx(134), sy(132), 12*S, 4*S);

  // Antenna spike
  ctx.strokeStyle = hexToRgba(a, 0.6); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(60)); ctx.lineTo(sx(140), sy(42)); ctx.stroke();
}

function drawPhoenix(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Engine nozzle hardware (flames handled by trail system)
  ctx.fillStyle = "#3a1a08";
  ctx.beginPath(); ctx.roundRect(sx(115), sy(295), 14*S, 14*S, 2*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.6); ctx.lineWidth = 0.4; ctx.stroke();
  ctx.fillStyle = "#3a1a08";
  ctx.beginPath(); ctx.roundRect(sx(151), sy(295), 14*S, 14*S, 2*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.6); ctx.lineWidth = 0.4; ctx.stroke();

  // Flame-shaped wings - left
  ctx.fillStyle = "#5a1a08";
  ctx.beginPath();
  ctx.moveTo(sx(85), sy(130));
  ctx.quadraticCurveTo(sx(40), sy(100), sx(15), sy(130));
  ctx.quadraticCurveTo(sx(5), sy(175), sx(30), sy(210));
  ctx.quadraticCurveTo(sx(70), sy(220), sx(100), sy(185));
  ctx.quadraticCurveTo(sx(120), sy(155), sx(105), sy(120));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Inner left wing
  ctx.fillStyle = "#7a2a08";
  ctx.beginPath();
  ctx.moveTo(sx(92), sy(140));
  ctx.quadraticCurveTo(sx(55), sy(115), sx(30), sy(140));
  ctx.quadraticCurveTo(sx(22), sy(170), sx(42), sy(195));
  ctx.quadraticCurveTo(sx(72), sy(205), sx(98), sy(175));
  ctx.quadraticCurveTo(sx(113), sy(150), sx(102), sy(130));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Left wing flame highlights
  ctx.fillStyle = hexToRgba(f, 0.6);
  ctx.beginPath(); ctx.moveTo(sx(50), sy(165)); ctx.quadraticCurveTo(sx(55), sy(145), sx(60), sy(165)); ctx.fill();
  ctx.fillStyle = hexToRgba(f, 0.5);
  ctx.beginPath(); ctx.moveTo(sx(75), sy(150)); ctx.quadraticCurveTo(sx(78), sy(138), sx(83), sy(150)); ctx.fill();

  // Right wing
  ctx.fillStyle = "#5a1a08";
  ctx.beginPath();
  ctx.moveTo(sx(195), sy(130));
  ctx.quadraticCurveTo(sx(240), sy(100), sx(265), sy(130));
  ctx.quadraticCurveTo(sx(275), sy(175), sx(250), sy(210));
  ctx.quadraticCurveTo(sx(210), sy(220), sx(180), sy(185));
  ctx.quadraticCurveTo(sx(160), sy(155), sx(175), sy(120));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Inner right wing
  ctx.fillStyle = "#7a2a08";
  ctx.beginPath();
  ctx.moveTo(sx(188), sy(140));
  ctx.quadraticCurveTo(sx(225), sy(115), sx(250), sy(140));
  ctx.quadraticCurveTo(sx(258), sy(170), sx(238), sy(195));
  ctx.quadraticCurveTo(sx(208), sy(205), sx(182), sy(175));
  ctx.quadraticCurveTo(sx(167), sy(150), sx(178), sy(130));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Right wing flame highlights
  ctx.fillStyle = hexToRgba(f, 0.6);
  ctx.beginPath(); ctx.moveTo(sx(230), sy(165)); ctx.quadraticCurveTo(sx(225), sy(145), sx(220), sy(165)); ctx.fill();
  ctx.fillStyle = hexToRgba(f, 0.5);
  ctx.beginPath(); ctx.moveTo(sx(205), sy(150)); ctx.quadraticCurveTo(sx(202), sy(138), sx(197), sy(150)); ctx.fill();

  // Main body
  ctx.fillStyle = "#5a1a08";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(175), sy(95)); ctx.lineTo(sx(182), sy(215));
  ctx.lineTo(sx(165), sy(265)); ctx.lineTo(sx(140), sy(300));
  ctx.lineTo(sx(115), sy(265)); ctx.lineTo(sx(98), sy(215)); ctx.lineTo(sx(105), sy(95));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.7; ctx.stroke();
  // Inner body
  ctx.fillStyle = "#7a2a10";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(60)); ctx.lineTo(sx(168), sy(100)); ctx.lineTo(sx(176), sy(210));
  ctx.lineTo(sx(160), sy(258)); ctx.lineTo(sx(140), sy(290));
  ctx.lineTo(sx(120), sy(258)); ctx.lineTo(sx(104), sy(210)); ctx.lineTo(sx(112), sy(100));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Body detail lines
  ctx.fillStyle = hexToRgba(a, 0.6);
  ctx.fillRect(sx(125), sy(200), 30*S, 2*S);
  ctx.fillRect(sx(120), sy(225), 40*S, 2*S);
  ctx.fillRect(sx(125), sy(250), 30*S, 2*S);

  // Fire glow cockpit
  ctx.fillStyle = "#1a0a02";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(125), 14*S, 22*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(f, 0.8); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = hexToRgba(a, 0.5);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(125), 11*S, 18*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a1a08";
  ctx.beginPath(); ctx.arc(sx(140), sy(125), 9*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(f, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.fillRect(sx(131), sy(122), 18*S, 6*S);
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.beginPath(); ctx.ellipse(sx(136), sy(119), 4*S, 5*S, 0, 0, Math.PI*2); ctx.fill();

  // Nose beacon
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(140), sy(32)); ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.6);
  ctx.beginPath(); ctx.arc(sx(140), sy(30), 3*S, 0, Math.PI*2); ctx.fill();
}

function drawNebula(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Floating crystal shards
  ctx.fillStyle = hexToRgba(a, 0.4);
  [[65,110,68,103,72,110,68,116],[210,100,213,93,217,100,213,106]].forEach(p => {
    ctx.beginPath();
    ctx.moveTo(sx(p[0]), sy(p[1])); ctx.lineTo(sx(p[2]), sy(p[3]));
    ctx.lineTo(sx(p[4]), sy(p[5])); ctx.lineTo(sx(p[6]), sy(p[7]));
    ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = hexToRgba(a, 0.3);
  [[55,275,58,268,62,275,58,281],[220,280,223,273,227,280,223,286]].forEach(p => {
    ctx.beginPath();
    ctx.moveTo(sx(p[0]), sy(p[1])); ctx.lineTo(sx(p[2]), sy(p[3]));
    ctx.lineTo(sx(p[4]), sy(p[5])); ctx.lineTo(sx(p[6]), sy(p[7]));
    ctx.closePath(); ctx.fill();
  });

  // Faceted crystal wings - left (outer)
  ctx.fillStyle = "#0a3328";
  ctx.beginPath();
  ctx.moveTo(sx(80), sy(140)); ctx.lineTo(sx(50), sy(180));
  ctx.lineTo(sx(38), sy(230)); ctx.lineTo(sx(60), sy(255));
  ctx.lineTo(sx(100), sy(230)); ctx.lineTo(sx(110), sy(180));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Left inner facet
  ctx.fillStyle = "#0d4435";
  ctx.beginPath();
  ctx.moveTo(sx(85), sy(150)); ctx.lineTo(sx(60), sy(180));
  ctx.lineTo(sx(52), sy(225)); ctx.lineTo(sx(72), sy(245));
  ctx.lineTo(sx(100), sy(228)); ctx.lineTo(sx(105), sy(190));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  // Left crystal facet lines
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(60), sy(180)); ctx.lineTo(sx(98), sy(215)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(85), sy(150)); ctx.lineTo(sx(78), sy(240)); ctx.stroke();

  // Right wing (outer)
  ctx.fillStyle = "#0a3328";
  ctx.beginPath();
  ctx.moveTo(sx(200), sy(140)); ctx.lineTo(sx(230), sy(180));
  ctx.lineTo(sx(242), sy(230)); ctx.lineTo(sx(220), sy(255));
  ctx.lineTo(sx(180), sy(230)); ctx.lineTo(sx(170), sy(180));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Right inner facet
  ctx.fillStyle = "#0d4435";
  ctx.beginPath();
  ctx.moveTo(sx(195), sy(150)); ctx.lineTo(sx(220), sy(180));
  ctx.lineTo(sx(228), sy(225)); ctx.lineTo(sx(208), sy(245));
  ctx.lineTo(sx(180), sy(228)); ctx.lineTo(sx(175), sy(190));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  // Right crystal facet lines
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(220), sy(180)); ctx.lineTo(sx(182), sy(215)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(195), sy(150)); ctx.lineTo(sx(202), sy(240)); ctx.stroke();

  // Crystal body (outer)
  ctx.fillStyle = "#0e3a2c";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(40)); ctx.lineTo(sx(168), sy(80)); ctx.lineTo(sx(178), sy(180));
  ctx.lineTo(sx(170), sy(250)); ctx.lineTo(sx(150), sy(295));
  ctx.lineTo(sx(140), sy(310)); ctx.lineTo(sx(130), sy(295));
  ctx.lineTo(sx(110), sy(250)); ctx.lineTo(sx(102), sy(180));
  ctx.lineTo(sx(112), sy(80));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
  // Inner body
  ctx.fillStyle = "#125540";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(52)); ctx.lineTo(sx(162), sy(85)); ctx.lineTo(sx(172), sy(180));
  ctx.lineTo(sx(165), sy(245)); ctx.lineTo(sx(148), sy(285));
  ctx.lineTo(sx(140), sy(300)); ctx.lineTo(sx(132), sy(285));
  ctx.lineTo(sx(115), sy(245)); ctx.lineTo(sx(108), sy(180));
  ctx.lineTo(sx(118), sy(85));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.4; ctx.stroke();

  // Body crystal lines
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(52)); ctx.lineTo(sx(140), sy(300)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(115), sy(180)); ctx.lineTo(sx(165), sy(180)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx(118), sy(220)); ctx.lineTo(sx(162), sy(220)); ctx.stroke();

  // Glowing core cockpit
  ctx.fillStyle = "#0e3a2c";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(125), 13*S, 22*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(f, 0.9); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = hexToRgba(a, 0.8);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(125), 10*S, 18*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#0a2a20";
  ctx.beginPath(); ctx.arc(sx(140), sy(125), 9*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(f, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.fillRect(sx(131), sy(122), 18*S, 6*S);
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.beginPath(); ctx.ellipse(sx(136), sy(119), 4*S, 5*S, 0, 0, Math.PI*2); ctx.fill();

  // Glowing energy core in body
  ctx.fillStyle = hexToRgba(f, 0.4);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(220), 8*S, 15*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(220), 5*S, 10*S, 0, 0, Math.PI*2); ctx.fill();

  // Nose crystal point
  ctx.fillStyle = hexToRgba(f, 0.7);
  ctx.beginPath();
  ctx.moveTo(sx(136), sy(40)); ctx.lineTo(sx(140), sy(22)); ctx.lineTo(sx(144), sy(40));
  ctx.closePath(); ctx.fill();
}

function drawVoid(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Sweeping curved wings - left
  ctx.fillStyle = "#1a0828";
  ctx.beginPath();
  ctx.moveTo(sx(85), sy(140));
  ctx.quadraticCurveTo(sx(35), sy(175), sx(25), sy(230));
  ctx.quadraticCurveTo(sx(55), sy(255), sx(100), sy(230));
  ctx.quadraticCurveTo(sx(120), sy(190), sx(105), sy(155));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Left inner wing
  ctx.fillStyle = "#2a1240";
  ctx.beginPath();
  ctx.moveTo(sx(90), sy(152));
  ctx.quadraticCurveTo(sx(48), sy(180), sx(42), sy(225));
  ctx.quadraticCurveTo(sx(67), sy(245), sx(102), sy(225));
  ctx.quadraticCurveTo(sx(115), sy(195), sx(105), sy(165));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Left wing energy arc
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(48), sy(220)); ctx.quadraticCurveTo(sx(60), sy(208), sx(70), sy(220)); ctx.stroke();
  // Left wing spike
  ctx.fillStyle = "#3a1645";
  ctx.beginPath();
  ctx.moveTo(sx(25), sy(230)); ctx.lineTo(sx(15), sy(222)); ctx.lineTo(sx(23), sy(240));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();

  // Right wing
  ctx.fillStyle = "#1a0828";
  ctx.beginPath();
  ctx.moveTo(sx(195), sy(140));
  ctx.quadraticCurveTo(sx(245), sy(175), sx(255), sy(230));
  ctx.quadraticCurveTo(sx(225), sy(255), sx(180), sy(230));
  ctx.quadraticCurveTo(sx(160), sy(190), sx(175), sy(155));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Right inner wing
  ctx.fillStyle = "#2a1240";
  ctx.beginPath();
  ctx.moveTo(sx(190), sy(152));
  ctx.quadraticCurveTo(sx(232), sy(180), sx(238), sy(225));
  ctx.quadraticCurveTo(sx(213), sy(245), sx(178), sy(225));
  ctx.quadraticCurveTo(sx(165), sy(195), sx(175), sy(165));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Right wing energy arc
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(232), sy(220)); ctx.quadraticCurveTo(sx(220), sy(208), sx(210), sy(220)); ctx.stroke();
  // Right wing spike
  ctx.fillStyle = "#3a1645";
  ctx.beginPath();
  ctx.moveTo(sx(255), sy(230)); ctx.lineTo(sx(265), sy(222)); ctx.lineTo(sx(257), sy(240));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();

  // Main body (outer)
  ctx.fillStyle = "#1a0828";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(170), sy(95)); ctx.lineTo(sx(182), sy(200));
  ctx.lineTo(sx(170), sy(260)); ctx.lineTo(sx(140), sy(295));
  ctx.lineTo(sx(110), sy(260)); ctx.lineTo(sx(98), sy(200)); ctx.lineTo(sx(110), sy(95));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.7; ctx.stroke();
  // Inner body
  ctx.fillStyle = "#2a1240";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(62)); ctx.lineTo(sx(165), sy(100)); ctx.lineTo(sx(176), sy(195));
  ctx.lineTo(sx(165), sy(252)); ctx.lineTo(sx(140), sy(285));
  ctx.lineTo(sx(115), sy(252)); ctx.lineTo(sx(104), sy(195)); ctx.lineTo(sx(115), sy(100));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.4); ctx.lineWidth = 0.3; ctx.stroke();

  // Body energy lines
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(118), sy(200)); ctx.quadraticCurveTo(sx(128), sy(205), sx(118), sy(218)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx(162), sy(200)); ctx.quadraticCurveTo(sx(152), sy(205), sx(162), sy(218)); ctx.stroke();

  // Black hole core cockpit
  ctx.fillStyle = "#0a0218";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(135), 15*S, 22*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(f, 0.9); ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = hexToRgba(a, 0.8);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(135), 12*S, 18*S, 0, 0, Math.PI*2); ctx.fill();
  // Black hole center
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(sx(140), sy(135), 8*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  // Inner void
  ctx.fillStyle = "#1a0828";
  ctx.beginPath(); ctx.arc(sx(140), sy(135), 5*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Visor slit
  ctx.fillStyle = hexToRgba(a, 0.6);
  ctx.fillRect(sx(133), sy(133), 14*S, 4*S);

  // Nose light
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(140), sy(32)); ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.6);
  ctx.beginPath(); ctx.arc(sx(140), sy(30), 2.5*S, 0, Math.PI*2); ctx.fill();
}

function drawGuardian(ctx, state, skin) {
  const a = skin.accent, v = skin.visor, f = skin.flame;
  const S = 0.155, cx = 140, cy = 165;
  function sx(x) { return (x - cx) * S; }
  function sy(y) { return (y - cy) * S; }

  // Golden engines (nozzle hardware only — flame handled by trail system)
  ctx.fillStyle = "#1a1408";
  ctx.beginPath(); ctx.roundRect(sx(115), sy(293), 18*S, 14*S, 2*S); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(sx(147), sy(293), 18*S, 14*S, 2*S); ctx.fill();
  ctx.stroke();

  // Wide elegant wings - left (outer)
  ctx.fillStyle = "#3a3018";
  ctx.beginPath();
  ctx.moveTo(sx(85), sy(130));
  ctx.quadraticCurveTo(sx(35), sy(145), sx(22), sy(200));
  ctx.quadraticCurveTo(sx(35), sy(235), sx(85), sy(220));
  ctx.quadraticCurveTo(sx(120), sy(195), sx(130), sy(160));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Left inner wing
  ctx.fillStyle = "#4a3818";
  ctx.beginPath();
  ctx.moveTo(sx(88), sy(142));
  ctx.quadraticCurveTo(sx(45), sy(155), sx(35), sy(195));
  ctx.quadraticCurveTo(sx(48), sy(225), sx(88), sy(215));
  ctx.quadraticCurveTo(sx(118), sy(192), sx(125), sy(165));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Left wing gold trim lines
  ctx.strokeStyle = hexToRgba(v, 0.6); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(48), sy(170)); ctx.lineTo(sx(118), sy(180)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(55), sy(200)); ctx.lineTo(sx(115), sy(195)); ctx.stroke();
  // Left wing tip gem
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.beginPath(); ctx.arc(sx(28), sy(215), 2.5*S, 0, Math.PI*2); ctx.fill();

  // Right wing (outer)
  ctx.fillStyle = "#3a3018";
  ctx.beginPath();
  ctx.moveTo(sx(195), sy(130));
  ctx.quadraticCurveTo(sx(245), sy(145), sx(258), sy(200));
  ctx.quadraticCurveTo(sx(245), sy(235), sx(195), sy(220));
  ctx.quadraticCurveTo(sx(160), sy(195), sx(150), sy(160));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
  // Right inner wing
  ctx.fillStyle = "#4a3818";
  ctx.beginPath();
  ctx.moveTo(sx(192), sy(142));
  ctx.quadraticCurveTo(sx(235), sy(155), sx(245), sy(195));
  ctx.quadraticCurveTo(sx(232), sy(225), sx(192), sy(215));
  ctx.quadraticCurveTo(sx(162), sy(192), sx(155), sy(165));
  ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3; ctx.stroke();
  // Right wing gold trim lines
  ctx.strokeStyle = hexToRgba(v, 0.6); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sx(232), sy(170)); ctx.lineTo(sx(162), sy(180)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(225), sy(200)); ctx.lineTo(sx(165), sy(195)); ctx.stroke();
  // Right wing tip gem
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.beginPath(); ctx.arc(sx(252), sy(215), 2.5*S, 0, Math.PI*2); ctx.fill();

  // Main body (outer)
  ctx.fillStyle = "#3a3018";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(50)); ctx.lineTo(sx(175), sy(95)); ctx.lineTo(sx(185), sy(220));
  ctx.lineTo(sx(170), sy(280)); ctx.lineTo(sx(140), sy(305));
  ctx.lineTo(sx(110), sy(280)); ctx.lineTo(sx(95), sy(220)); ctx.lineTo(sx(105), sy(95));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(a, 0.8); ctx.lineWidth = 0.8; ctx.stroke();
  // Inner body
  ctx.fillStyle = "#4a3a18";
  ctx.beginPath();
  ctx.moveTo(sx(140), sy(62)); ctx.lineTo(sx(168), sy(100)); ctx.lineTo(sx(178), sy(215));
  ctx.lineTo(sx(163), sy(270)); ctx.lineTo(sx(140), sy(293));
  ctx.lineTo(sx(117), sy(270)); ctx.lineTo(sx(102), sy(215)); ctx.lineTo(sx(112), sy(100));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.4; ctx.stroke();

  // Body gold trim lines
  ctx.strokeStyle = hexToRgba(v, 0.4); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(62)); ctx.lineTo(sx(140), sy(293)); ctx.stroke();
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(sx(115), sy(160)); ctx.lineTo(sx(165), sy(160)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx(115), sy(220)); ctx.lineTo(sx(165), sy(220)); ctx.stroke();
  // Body detail bands
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.fillRect(sx(120), sy(180), 40*S, 2.5*S);
  ctx.fillRect(sx(120), sy(240), 40*S, 2.5*S);
  // Body side gems
  ctx.fillStyle = hexToRgba(v, 0.6);
  ctx.beginPath(); ctx.arc(sx(108), sy(200), 2.5*S, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx(172), sy(200), 2.5*S, 0, Math.PI*2); ctx.fill();

  // Gold-framed cockpit
  ctx.fillStyle = "#1a1408";
  ctx.beginPath(); ctx.ellipse(sx(140), sy(125), 14*S, 22*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 1.0); ctx.lineWidth = 0.7; ctx.stroke();
  ctx.fillStyle = hexToRgba(a, 0.8);
  ctx.beginPath(); ctx.ellipse(sx(140), sy(125), 11*S, 18*S, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3a2a10";
  ctx.beginPath(); ctx.arc(sx(140), sy(125), 9*S, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hexToRgba(v, 0.5); ctx.lineWidth = 0.3; ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.7);
  ctx.fillRect(sx(131), sy(122), 18*S, 6*S);
  ctx.fillStyle = hexToRgba(v, 0.5);
  ctx.beginPath(); ctx.ellipse(sx(136), sy(119), 4*S, 5*S, 0, 0, Math.PI*2); ctx.fill();

  // Crown antenna
  ctx.fillStyle = hexToRgba(v, 0.9);
  ctx.beginPath();
  ctx.moveTo(sx(132), sy(50)); ctx.lineTo(sx(137), sy(32)); ctx.lineTo(sx(140), sy(42));
  ctx.lineTo(sx(143), sy(32)); ctx.lineTo(sx(148), sy(50));
  ctx.closePath(); ctx.fill();
  // Crown top gem
  ctx.strokeStyle = hexToRgba(a, 0.7); ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sx(140), sy(32)); ctx.lineTo(sx(140), sy(22)); ctx.stroke();
  ctx.fillStyle = hexToRgba(v, 0.8);
  ctx.beginPath(); ctx.arc(sx(140), sy(20), 2*S, 0, Math.PI*2); ctx.fill();
}

function drawPilotHelmetCanvas(ctx, x, y, pilotId) {
  switch (pilotId) {
    case "rebel":
      ctx.fillStyle = "#f5dc8a";
      ctx.strokeStyle = "#8a6520";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cc4422";
      ctx.fillRect(x - 5, y - 4, 10, 1.5);
      ctx.fillStyle = "#aa7722";
      ctx.fillRect(x - 5, y - 1, 10, 3);
      break;
    case "trooper":
      ctx.fillStyle = "#f0f0f0";
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0a0a0e";
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 1);
      ctx.lineTo(x + 5, y - 1);
      ctx.lineTo(x + 4, y + 2);
      ctx.lineTo(x - 4, y + 2);
      ctx.closePath();
      ctx.fill();
      break;
    case "tie":
      ctx.fillStyle = "#0a0a14";
      ctx.strokeStyle = "#1e1e2a";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#04040a";
      ctx.fillRect(x - 5, y - 1, 10, 3);
      ctx.fillStyle = "#cc3322";
      ctx.beginPath();
      ctx.arc(x - 2.5, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 2.5, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "dark":
      ctx.fillStyle = "#0a0a0e";
      ctx.strokeStyle = "#222226";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cc1100";
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 1);
      ctx.lineTo(x - 1.5, y - 2);
      ctx.lineTo(x - 1, y + 1);
      ctx.lineTo(x - 3.5, y + 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 1);
      ctx.lineTo(x + 1.5, y - 2);
      ctx.lineTo(x + 1, y + 1);
      ctx.lineTo(x + 3.5, y + 1.5);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

// ── Trail & Exhaust System ──

const MAX_TRAIL_PARTICLES = 80;

function getEnginePositions(player, skin) {
  const defaultEngines = [
    { x: player.x - 6, y: player.y + 16 },
    { x: player.x + 6, y: player.y + 16 },
  ];
  if (!skin || !skin.customShip) return defaultEngines;
  switch (skin.shipType) {
    case "reaper":
      return [{ x: player.x, y: player.y + 18 }];
    case "titan":
      return [
        { x: player.x - 8, y: player.y + 18 },
        { x: player.x + 8, y: player.y + 18 },
      ];
    case "shadow":
      return [{ x: player.x, y: player.y + 18 }];
    case "phoenix":
      return [
        { x: player.x - 6, y: player.y + 16 },
        { x: player.x + 6, y: player.y + 16 },
        { x: player.x, y: player.y + 18 },
      ];
    case "nebula":
      return [{ x: player.x, y: player.y + 17 }];
    case "void":
      return [{ x: player.x, y: player.y + 18 }];
    case "guardian":
      return [
        { x: player.x - 7, y: player.y + 17 },
        { x: player.x + 7, y: player.y + 17 },
      ];
    default:
      return defaultEngines;
  }
}

function spawnTrailParticles(state, skin) {
  const flameColor = skin.flame || skin.accent || "#00aaff";
  const enginePositions = getEnginePositions(state.player, skin);

  enginePositions.forEach(pos => {
    const count = Math.random() < 0.7 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      state.trailParticles.push({
        x: pos.x + (Math.random() - 0.5) * 3,
        y: pos.y + Math.random() * 2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1.5 + Math.random() * 1.5,
        life: 1,
        decay: 0.04 + Math.random() * 0.03,
        size: 1.5 + Math.random() * 2,
        color: flameColor,
        type: "ember",
      });
    }
    // Occasional bright spark
    if (Math.random() < 0.15) {
      state.trailParticles.push({
        x: pos.x,
        y: pos.y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2 + Math.random() * 2,
        life: 1,
        decay: 0.06,
        size: 0.8,
        color: "#ffffff",
        type: "spark",
      });
    }
  });

  if (state.trailParticles.length > MAX_TRAIL_PARTICLES) {
    state.trailParticles.splice(0, state.trailParticles.length - MAX_TRAIL_PARTICLES);
  }
}

function updateTrailParticles(state, dt) {
  state.trailParticles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= p.decay * dt;
    p.size *= 0.97;
  });
  state.trailParticles = state.trailParticles.filter(p => p.life > 0);
}

function drawTrailParticles(ctx, state) {
  state.trailParticles.forEach(p => {
    ctx.globalAlpha = p.life * 0.7;
    if (p.type === "spark") {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 4;
    } else {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawFlameAtEngine(ctx, x, y, skin, frameCount) {
  const flameColor = skin.flame || skin.accent || "#00aaff";
  const flicker = 1 + Math.sin(frameCount * 0.4) * 0.15 + Math.sin(frameCount * 0.7) * 0.1;
  const baseLength = 14 * flicker;

  // Layer 1: Outer glow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = flameColor;
  ctx.shadowColor = flameColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(x, y + baseLength * 0.6, 4, baseLength, 0, 0, Math.PI * 2);
  ctx.fill();

  // Layer 2: Mid flame
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = flameColor;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(x, y + baseLength * 0.5, 2.5, baseLength * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Layer 3: Inner core (white-hot)
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = flameColor;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.ellipse(x, y + baseLength * 0.4, 1.2, baseLength * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Layer 4: Tip wisps
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = flameColor;
  for (let i = 0; i < 3; i++) {
    const wispOffset = Math.sin(frameCount * 0.3 + i * 2) * 1.5;
    ctx.beginPath();
    ctx.ellipse(
      x + wispOffset,
      y + baseLength * (1.1 + i * 0.15),
      0.8 - i * 0.2,
      2 + i * 0.5,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawHeatShimmer(ctx, x, y, frameCount) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) {
    const waveX = x + Math.sin(frameCount * 0.05 + i) * 2;
    const waveY = y + 20 + i * 6;
    ctx.beginPath();
    ctx.ellipse(waveX, waveY, 5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBioWisps(ctx, x, y, frameCount, skin) {
  ctx.save();
  ctx.strokeStyle = skin.flame;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 3; i++) {
    const offset = Math.sin(frameCount * 0.1 + i * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + offset, y + 12, x - offset, y + 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhoenixEmbers(ctx, x, y, frameCount) {
  for (let i = 0; i < 5; i++) {
    const offset = (frameCount * 2 + i * 30) % 60;
    const ex = x + Math.sin(i + frameCount * 0.05) * 8;
    const ey = y + offset;
    ctx.globalAlpha = 1 - offset / 60;
    ctx.fillStyle = i % 2 === 0 ? "#ffaa33" : "#ff6622";
    ctx.beginPath();
    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVoidSingularity(ctx, x, y, frameCount) {
  const pulse = (frameCount % 30) / 30;
  ctx.save();
  ctx.strokeStyle = "#aa44ff";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4 * (1 - pulse);
  ctx.beginPath();
  ctx.arc(x, y + 5, 3 + pulse * 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#000";
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x, y + 5, 3, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    const angle = frameCount * 0.1 + (i * Math.PI / 2);
    const r = 5 + Math.sin(frameCount * 0.05 + i) * 2;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#dd66ff";
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * r, y + 5 + Math.sin(angle) * r, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrystalParticles(ctx, x, y, frameCount) {
  for (let i = 0; i < 4; i++) {
    const offset = (frameCount * 1.5 + i * 25) % 50;
    const cx = x + Math.sin(i + frameCount * 0.03) * 6;
    const cy = y + offset;
    ctx.globalAlpha = (1 - offset / 50) * 0.6;
    ctx.fillStyle = "#33eeaa";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 1.5);
    ctx.lineTo(cx + 1, cy);
    ctx.lineTo(cx, cy + 1.5);
    ctx.lineTo(cx - 1, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShipTrail(ctx, state, skin) {
  const enginePositions = getEnginePositions(state.player, skin);
  const frameCount = state.frame;

  // Heat shimmer (behind everything)
  enginePositions.forEach(pos => {
    drawHeatShimmer(ctx, pos.x, pos.y, frameCount);
  });

  // Ship-specific special effects
  if (skin && skin.customShip) {
    switch (skin.shipType) {
      case "reaper":
        drawBioWisps(ctx, state.player.x, state.player.y + 18, frameCount, skin);
        break;
      case "phoenix":
        drawPhoenixEmbers(ctx, state.player.x, state.player.y + 16, frameCount);
        break;
      case "void":
        drawVoidSingularity(ctx, state.player.x, state.player.y + 18, frameCount);
        break;
      case "nebula":
        drawCrystalParticles(ctx, state.player.x, state.player.y + 17, frameCount);
        break;
    }
  }

  // Flame at each engine
  enginePositions.forEach(pos => {
    drawFlameAtEngine(ctx, pos.x, pos.y, skin, frameCount);
  });
}

function drawPlayerShip(ctx, state, skin) {
  if (skin && skin.customShip) {
    switch (skin.shipType) {
      case "reaper":   drawReaper(ctx, state, skin); break;
      case "titan":    drawTitan(ctx, state, skin); break;
      case "shadow":   drawShadow(ctx, state, skin); break;
      case "phoenix":  drawPhoenix(ctx, state, skin); break;
      case "nebula":   drawNebula(ctx, state, skin); break;
      case "void":     drawVoid(ctx, state, skin); break;
      case "guardian": drawGuardian(ctx, state, skin); break;
      default:         drawDefaultShip(ctx, state, skin);
    }
  } else {
    drawDefaultShip(ctx, state, skin);
  }
}

// ── Ability Visual Effects ──

function drawAbilityEffects(ctx, state) {
  const pilot = getPilot(state.pilotId);
  if (!pilot.ability) return;

  switch (pilot.ability.id) {
    case "shield_dome": {
      const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      ctx.save();
      ctx.strokeStyle = pilot.ability.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = pilot.ability.color;
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y, 35 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = pilot.ability.color;
      ctx.fill();
      ctx.restore();
      break;
    }
    case "phase_dash": {
      ctx.save();
      ctx.fillStyle = "#cc3322";
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(state.player.x - 12, state.player.y + i * 6, 24, 4);
      }
      ctx.restore();
      break;
    }
    case "barrage": {
      ctx.save();
      ctx.shadowColor = "#ff8833";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffaa44";
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(state.player.x, state.player.y - 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawAbilityButton(ctx, state) {
  const pilot = getPilot(state.pilotId);
  if (!pilot.ability) return;

  const bx = 50;
  const by = CANVAS_H - 80;
  const r = 32;

  const ready = state.ability.cooldown <= 0 && !state.ability.active;
  const cdProgress = pilot.ability.cooldown > 0 ? 1 - (state.ability.cooldown / pilot.ability.cooldown) : 1;

  ctx.save();

  // Background circle
  ctx.fillStyle = ready ? `${pilot.ability.color}40` : "rgba(0,0,0,0.5)";
  ctx.strokeStyle = ready ? pilot.ability.color : "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cooldown arc
  if (!ready && state.ability.cooldown > 0) {
    ctx.strokeStyle = pilot.ability.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdProgress);
    ctx.stroke();
  }

  // Pulsing glow when ready
  if (ready) {
    const glow = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
    ctx.strokeStyle = pilot.ability.color;
    ctx.shadowColor = pilot.ability.color;
    ctx.shadowBlur = 15 + glow * 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, r - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Icon
  ctx.fillStyle = ready ? "#ffffff" : "rgba(255,255,255,0.4)";
  drawAbilityIcon(ctx, bx, by, pilot.ability.id);

  // Cooldown text
  if (!ready && state.ability.cooldown > 0) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 14px 'Sora', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.ceil(state.ability.cooldown / 1000), bx, by);
    ctx.textBaseline = "alphabetic";
  }

  // Active indicator
  if (state.ability.active) {
    ctx.fillStyle = pilot.ability.color;
    ctx.font = "800 9px 'Sora', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ACTIVE", bx, by + r + 14);
  }

  // Ability name label
  ctx.font = "600 8px 'Sora', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = ready ? pilot.ability.color : "rgba(255,255,255,0.3)";
  ctx.fillText(pilot.ability.name, bx, by - r - 6);

  ctx.restore();
}

function drawAbilityIcon(ctx, x, y, id) {
  switch (id) {
    case "barrage":
      // Lightning bolt
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 8);
      ctx.lineTo(x + 2, y - 1);
      ctx.lineTo(x - 2, y - 1);
      ctx.lineTo(x + 4, y + 8);
      ctx.lineTo(x - 1, y + 1);
      ctx.lineTo(x + 3, y + 1);
      ctx.closePath();
      ctx.fill();
      break;
    case "shield_dome":
      // Shield shape
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 9, y - 5);
      ctx.lineTo(x + 9, y + 3);
      ctx.quadraticCurveTo(x, y + 12, x - 9, y + 3);
      ctx.lineTo(x - 9, y - 5);
      ctx.closePath();
      ctx.fill();
      break;
    case "phase_dash":
      // Arrow up
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x + 7, y - 1);
      ctx.lineTo(x + 3, y - 1);
      ctx.lineTo(x + 3, y + 8);
      ctx.lineTo(x - 3, y + 8);
      ctx.lineTo(x - 3, y - 1);
      ctx.lineTo(x - 7, y - 1);
      ctx.closePath();
      ctx.fill();
      break;
    case "force_blast":
      // Star burst
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.fillRect(
          x + Math.cos(a) * 3 - 1,
          y + Math.sin(a) * 3 - 1,
          Math.abs(Math.cos(a) * 6) + 2,
          Math.abs(Math.sin(a) * 6) + 2
        );
      }
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawHUDFrame(ctx) {
  ctx.save();

  const bracketSize = 18;
  ctx.strokeStyle = "rgba(100,180,255,0.25)";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  // Corner brackets
  ctx.beginPath();
  ctx.moveTo(8, 8 + bracketSize); ctx.lineTo(8, 8); ctx.lineTo(8 + bracketSize, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CANVAS_W - 8 - bracketSize, 8); ctx.lineTo(CANVAS_W - 8, 8); ctx.lineTo(CANVAS_W - 8, 8 + bracketSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, CANVAS_H - 8 - bracketSize); ctx.lineTo(8, CANVAS_H - 8); ctx.lineTo(8 + bracketSize, CANVAS_H - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CANVAS_W - 8 - bracketSize, CANVAS_H - 8); ctx.lineTo(CANVAS_W - 8, CANVAS_H - 8); ctx.lineTo(CANVAS_W - 8, CANVAS_H - 8 - bracketSize);
  ctx.stroke();

  // Edge highlight lines
  ctx.strokeStyle = "rgba(100,180,255,0.08)";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(40, 8); ctx.lineTo(CANVAS_W - 40, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, CANVAS_H - 8); ctx.lineTo(CANVAS_W - 40, CANVAS_H - 8); ctx.stroke();

  // Center tick marks on top edge
  ctx.strokeStyle = "rgba(100,180,255,0.3)";
  ctx.lineWidth = 1;
  const cx = CANVAS_W / 2;
  ctx.beginPath();
  ctx.moveTo(cx, 8); ctx.lineTo(cx, 14);
  ctx.moveTo(cx - 15, 8); ctx.lineTo(cx - 15, 12);
  ctx.moveTo(cx + 15, 8); ctx.lineTo(cx + 15, 12);
  ctx.stroke();

  // Side tech details
  ctx.strokeStyle = "rgba(100,180,255,0.2)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    const y = CANVAS_H / 2 - 20 + i * 20;
    ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(14, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_W - 8, y); ctx.lineTo(CANVAS_W - 14, y); ctx.stroke();
  }

  // Subtle scanline
  const scanY = (performance.now() * 0.05) % CANVAS_H;
  ctx.strokeStyle = "rgba(100,180,255,0.04)";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, scanY); ctx.lineTo(CANVAS_W, scanY); ctx.stroke();

  ctx.restore();
}

// ── NPC Encounter Ship Drawing ──

function drawEncounterShip(ctx, state) {
  const enc = state.encounter;
  if (!enc) return;
  const e = enc.data;
  const x = enc.npcX;
  const y = enc.npcY;
  const t = performance.now() * 0.002;

  ctx.save();
  ctx.translate(x, y + Math.sin(t) * 3); // gentle hover

  // Engine glow
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = e.color + "40";
  ctx.beginPath();
  ctx.ellipse(0, 14, 8, 4 + Math.sin(t * 3) * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ship hull
  ctx.shadowBlur = 12;
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(14, 6);
  ctx.lineTo(10, 14);
  ctx.lineTo(-10, 14);
  ctx.lineTo(-14, 6);
  ctx.closePath();
  ctx.fill();

  // Hull accent stripe
  ctx.fillStyle = e.color + "80";
  ctx.fillRect(-8, 2, 16, 3);

  // Cockpit
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#88ddff";
  ctx.beginPath();
  ctx.ellipse(0, -4, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff60";
  ctx.beginPath();
  ctx.ellipse(-1, -6, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = e.color + "aa";
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-22, 12);
  ctx.lineTo(-16, 14);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(22, 12);
  ctx.lineTo(16, 14);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Name label during approach/dialog
  if (enc.phase === "approach" || enc.phase === "dialog") {
    ctx.save();
    ctx.globalAlpha = Math.min(1, enc.timer / 30);
    ctx.fillStyle = e.color;
    ctx.font = "700 9px 'Sora', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(e.name.toUpperCase(), x, y - 26);
    ctx.restore();
  }
}

export function renderGame(ctx, state, skin) {
  const { frame } = state;

  // Update trail particles (driven by render since skin is available here)
  if (!state.deathScene && skin) {
    spawnTrailParticles(state, skin);
    updateTrailParticles(state, getDeltaTime());
  }

  ctx.save();
  ctx.translate(state.shakeX, state.shakeY);

  // Zone-specific background
  renderZoneBackground(ctx, state);

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

  // Combo background tint (enhanced at high combos)
  if (state.combo >= 5) {
    const cTier = getComboTier(state.combo);
    const time = Date.now();
    const color = getTierColor(cTier, time);
    const intensity = state.combo >= 50
      ? Math.min(0.08, state.combo * 0.0003)
      : Math.min(0.04, state.combo * 0.001);
    ctx.fillStyle = color;
    ctx.globalAlpha = intensity;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  // Speed lines (behind game objects)
  if (state.speedLineParticles.length > 0) {
    const slTier = getComboTier(state.combo);
    const slColor = getTierColor(slTier, Date.now());
    state.speedLineParticles.forEach(p => {
      ctx.strokeStyle = p.color || slColor;
      ctx.globalAlpha = p.alpha;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + p.length);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Powerups
  state.powerups.forEach(p => {
    const t = performance.now() * 0.005;
    const pulse = 1 + Math.sin(t) * 0.1;
    const pulseR = 10 + Math.sin(p.pulse) * 3;

    // Base glow
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = p.color + "30";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = p.color + "60";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Icon (simple shapes per type)
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;

    switch(p.type) {
      case "shield":
        // Shield arc
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, -Math.PI * 0.8, Math.PI * 0.8);
        ctx.stroke();
        break;
      case "rapid":
        // Lightning bolt
        ctx.beginPath();
        ctx.moveTo(p.x + 2, p.y - 6);
        ctx.lineTo(p.x - 2, p.y);
        ctx.lineTo(p.x + 1, p.y);
        ctx.lineTo(p.x - 2, p.y + 6);
        ctx.stroke();
        break;
      case "triple":
        // Three lines
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(p.x + i * 4, p.y - 5);
          ctx.lineTo(p.x + i * 4, p.y + 5);
          ctx.stroke();
        }
        break;
      case "life":
        // Heart
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y - 2, 3, Math.PI, 0);
        ctx.arc(p.x + 3, p.y - 2, 3, Math.PI, 0);
        ctx.lineTo(p.x, p.y + 5);
        ctx.closePath();
        ctx.fill();
        break;
      case "slowtime":
        // Clock icon
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 4);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 3, p.y);
        ctx.stroke();
        break;
      case "magnet":
        // Magnet U-shape
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, Math.PI, 0, false);
        ctx.lineTo(p.x + 5, p.y + 3);
        ctx.moveTo(p.x - 5, p.y);
        ctx.lineTo(p.x - 5, p.y + 3);
        ctx.stroke();
        break;
      case "doublepts":
        // Star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2 / 5) - Math.PI / 2;
          const r1 = 6, r2 = 3;
          const outerX = p.x + Math.cos(a) * r1;
          const outerY = p.y + Math.sin(a) * r1;
          const innerA = a + Math.PI / 5;
          const innerX = p.x + Math.cos(innerA) * r2;
          const innerY = p.y + Math.sin(innerA) * r2;
          if (i === 0) ctx.moveTo(outerX, outerY);
          else ctx.lineTo(outerX, outerY);
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case "freeze":
        // Snowflake (3 lines)
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(a) * 6, p.y - Math.sin(a) * 6);
          ctx.lineTo(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6);
          ctx.stroke();
        }
        break;
      case "nuke":
        // Explosion star burst
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3);
          ctx.lineTo(p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        // Fallback circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  });

  // Meteors
  state.meteors.forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rotation);

    if (m.golden) {
      // Golden meteor glow
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#ddaa33";
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffcc44";
      ctx.beginPath();
      ctx.arc(0, 0, m.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      const t = Date.now() * 0.003;
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.1;
        const sx = Math.cos(a) * m.radius * 0.6;
        const sy = Math.sin(a) * m.radius * 0.6;
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      }
      ctx.shadowBlur = 0;
    } else {
      // Draw procedural shape
      ctx.beginPath();
      ctx.moveTo(m.shape.pts[0].x, m.shape.pts[0].y);
      for (let i = 1; i < m.shape.pts.length; i++) {
        ctx.lineTo(m.shape.pts[i].x, m.shape.pts[i].y);
      }
      ctx.closePath();

      const style = m.meteorStyle || "normal";
      switch (style) {
        case "fire": {
          ctx.fillStyle = "#4a1a08";
          ctx.strokeStyle = "#ff6622";
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.shadowColor = "#ff8833";
          ctx.shadowBlur = 10;
          ctx.fillStyle = "#cc4422";
          ctx.beginPath();
          ctx.arc(0, 0, m.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#ff8833";
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(-m.radius * 0.4, -m.radius * 0.2);
          ctx.lineTo(m.radius * 0.3, m.radius * 0.4);
          ctx.stroke();
          break;
        }
        case "toxic": {
          ctx.fillStyle = "#1a3308";
          ctx.strokeStyle = "#88cc22";
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#aacc33";
          ctx.globalAlpha = 0.6;
          const seed = m.rotation * 1000;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const ox = Math.sin(seed + i * 7.3) * m.radius * 0.4;
            const oy = Math.cos(seed + i * 13.1) * m.radius * 0.4;
            ctx.arc(ox, oy, m.radius * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "rust": {
          ctx.fillStyle = "#3a1808";
          ctx.strokeStyle = "#cc6622";
          ctx.lineWidth = 1;
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "#aa4422";
          ctx.lineWidth = 0.5;
          const rseed = m.rotation * 1000;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.sin(rseed + i * 5.7) * m.radius * 0.5, -m.radius);
            ctx.lineTo(Math.cos(rseed + i * 3.2) * m.radius * 0.5, m.radius);
            ctx.stroke();
          }
          break;
        }
        case "electric": {
          ctx.fillStyle = "#0a0a28";
          ctx.strokeStyle = "#4488ff";
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "#88aaff";
          ctx.lineWidth = 0.8;
          const et = Date.now() * 0.01;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const x1 = Math.sin(et + i * 2.1) * m.radius * 0.6;
            const y1 = Math.cos(et + i * 3.7) * m.radius * 0.6;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + Math.sin(et * 3 + i) * 6, y1 + Math.cos(et * 3 + i) * 6);
            ctx.stroke();
          }
          break;
        }
        case "ice": {
          ctx.fillStyle = "#0a1a2a";
          ctx.strokeStyle = "#88ccee";
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#aaddff";
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const dist = m.radius * 0.4;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "golden": {
          ctx.fillStyle = "#3a2808";
          ctx.strokeStyle = "#ffcc44";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#ffaa00";
          ctx.shadowBlur = 10;
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#ffdd66";
          ctx.fillRect(-2, -2, 1, 1);
          ctx.fillRect(1, 0, 1, 1);
          break;
        }
        case "dark": {
          ctx.fillStyle = "#0a0414";
          ctx.strokeStyle = "#6622aa";
          ctx.lineWidth = 1;
          ctx.fill(); ctx.stroke();
          ctx.shadowColor = "#aa44ff";
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;
        }
        case "frozen": {
          ctx.fillStyle = "#0a1418";
          ctx.strokeStyle = "#66aacc";
          ctx.lineWidth = 1;
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "#aaccee";
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(-m.radius * 0.3, -m.radius * 0.3);
          ctx.lineTo(m.radius * 0.2, 0);
          ctx.lineTo(-m.radius * 0.2, m.radius * 0.3);
          ctx.stroke();
          break;
        }
        case "void": {
          ctx.fillStyle = "#000000";
          ctx.strokeStyle = "#aa44ff";
          ctx.lineWidth = 1.5;
          ctx.fill(); ctx.stroke();
          ctx.shadowColor = "#dd66ff";
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#2a0a44";
          ctx.beginPath();
          ctx.arc(0, 0, m.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "dense": {
          // Asteroid belt — rocky, metallic gray-brown with visible mineral veins
          ctx.fillStyle = "#2a2218";
          ctx.strokeStyle = "#887766";
          ctx.lineWidth = 2;
          ctx.fill(); ctx.stroke();
          // Mineral veins
          ctx.strokeStyle = "#aabb99";
          ctx.lineWidth = 0.7;
          const dseed = m.rotation * 1000;
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            const x1 = Math.sin(dseed + i * 4.3) * m.radius * 0.6;
            const y1 = Math.cos(dseed + i * 6.7) * m.radius * 0.6;
            const x2 = Math.sin(dseed + i * 2.1 + 1) * m.radius * 0.5;
            const y2 = Math.cos(dseed + i * 3.9 + 1) * m.radius * 0.5;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          // Metal flecks
          ctx.fillStyle = "#ccbbaa";
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const fx = Math.sin(dseed + i * 8.1) * m.radius * 0.35;
            const fy = Math.cos(dseed + i * 5.3) * m.radius * 0.35;
            ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          break;
        }
        case "normal":
        default: {
          const mg = ctx.createRadialGradient(-m.radius * 0.2, -m.radius * 0.2, 0, 0, 0, m.radius);
          mg.addColorStop(0, `hsl(${m.hue},35%,40%)`);
          mg.addColorStop(0.6, `hsl(${m.hue},30%,25%)`);
          mg.addColorStop(1, `hsl(${m.hue},25%,12%)`);
          ctx.fillStyle = mg;
          ctx.fill();
          ctx.strokeStyle = `hsla(${m.hue},20%,55%,0.3)`;
          ctx.lineWidth = 1;
          ctx.stroke();
          m.shape.craters.forEach(c => {
            ctx.fillStyle = `hsla(${m.hue},20%,10%,0.4)`;
            ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `hsla(${m.hue},15%,35%,0.2)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.arc(c.x, c.y, c.r, Math.PI * 0.8, Math.PI * 1.8); ctx.stroke();
          });
          break;
        }
      }

      // HP indicator for multi-hit
      if (m.maxHp > 1) {
        const hpRatio = m.hp / m.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? "rgba(0,255,100,0.4)" : "rgba(255,100,0,0.5)";
        ctx.fillRect(-m.radius * 0.5, m.radius + 4, m.radius * hpRatio, 2);
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-m.radius * 0.5, m.radius + 4, m.radius, 2);
      }
    }

    // Double reward indicator
    if (m.doubleReward) {
      ctx.fillStyle = "#ff44aa";
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.008) * 0.3;
      ctx.font = "700 10px 'Sora', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("2x", 0, -m.radius - 4);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  });

  // Enemy ships
  drawEnemies(ctx, state);
  drawEnemyProjectiles(ctx, state);

  // NPC encounter ship
  if (state.encounter) {
    drawEncounterShip(ctx, state);
  }

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

    // Combo bullet trail enhancement
    if (state.combo >= 5) {
      const btTier = getComboTier(state.combo);
      const btColor = getTierColor(btTier, Date.now());
      const trailLen = Math.min(15, 5 + state.combo * 0.3);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = btColor;
      ctx.fillRect(b.x - 1, b.y, 2, trailLen);
      ctx.globalAlpha = 1;
    }

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

      case "lightning":
        // Pulsing electric orb
        const pulse = 1 + Math.sin(Date.now() * 0.03) * 0.2;
        ctx.shadowColor = "#88ddff";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#88ddff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, bSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        for (let si = 0; si < 3; si++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = bSize + Math.random() * 4;
          ctx.fillRect(b.x + Math.cos(angle) * dist, b.y + Math.sin(angle) * dist, 1, 1);
        }
        ctx.shadowBlur = 0;
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

  // Lightning arcs
  drawLightningArcs(ctx, state);

  // Particles (pooled)
  drawPoolParticles(ctx);

  // Trail particles & flame effects (world space, behind ship)
  if (!state.deathScene && skin) {
    drawTrailParticles(ctx, state);
    drawShipTrail(ctx, state, skin);
  }

  // Force wave (behind player)
  if (state.forceWave) {
    ctx.save();
    ctx.strokeStyle = "#cc1100";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#ff3300";
    ctx.shadowBlur = 25;
    ctx.globalAlpha = Math.max(0, state.forceWave.alpha);
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.forceWave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Player ship (hidden during death scene)
  const px = state.player.x;
  const py = state.player.y;
  const blink = state.invincibleTimer > 0 && Math.floor(state.frame / 4) % 2 === 0;

  if (!blink && !state.deathScene) {
    ctx.save();
    ctx.translate(px, py);

    try {
      drawPlayerShip(ctx, state, skin);
      // Draw pilot helmet in cockpit
      if (state.pilotId) {
        drawPilotHelmetCanvas(ctx, 0, -8, state.pilotId);
      }
    } catch(e) {
      console.error("Ship draw error:", e);
      drawDefaultShip(ctx, state, skin);
    }

    // Shield effect (shared by all ships)
    const shipVisor = skin ? skin.visor : "#00ddff";
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

  // Ability effects (drawn after player ship)
  if (state.ability.active && !state.deathScene) {
    drawAbilityEffects(ctx, state);
  }

  // Drones (drawn in world space, after player)
  if (state.drones.length > 0 && !state.deathScene) {
    drawDrones(ctx, state);
  }

  // Vignette
  const vig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.65);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

  // Slow-time visual: slight blue tint overlay
  if (state.activeEffects.slowtime > 0) {
    ctx.fillStyle = "rgba(100,180,255,0.04)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Freeze visual: ice border effect
  if (state.activeEffects.freeze > 0) {
    ctx.strokeStyle = "rgba(100,180,255,0.2)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CANVAS_W - 4, CANVAS_H - 4);
    // Frost particles along top
    ctx.fillStyle = "rgba(200,230,255,0.3)";
    for (let i = 0; i < 12; i++) {
      const fx = (Date.now() * 0.05 + i * 35) % CANVAS_W;
      ctx.fillRect(fx, 4, 2, 2);
      ctx.fillRect(fx + 10, CANVAS_H - 6, 2, 2);
    }
  }

  // Double-points visual: gold tint
  if (state.activeEffects.doublepts > 0) {
    ctx.fillStyle = "rgba(255,170,0,0.03)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Magnet visual: purple aura around player
  if (state.activeEffects.magnet > 0) {
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, 30, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(170,85,255,0.08)";
    ctx.fill();
  }

  // Kill flash overlay
  if (state.killFlashTimer > 0) {
    ctx.globalAlpha = (state.killFlashTimer / 20) * 0.1;
    ctx.fillStyle = state.killFlashColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  // Edge vignette pulse (combo >= 15)
  if (state.combo >= 15) {
    const vigTier = getComboTier(state.combo);
    const vigTime = Date.now();
    const vigColor = getTierColor(vigTier, vigTime);
    const vigPulse = 0.03 + Math.sin(vigTime * 0.005) * 0.015;
    const vigGrad = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.3,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.65
    );
    vigGrad.addColorStop(0, "transparent");
    vigGrad.addColorStop(1, vigColor);
    ctx.globalAlpha = vigPulse;
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  // Low HP warning — pulsing red vignette at 1 HP
  if (state.lives === 1 && !state.gameOver) {
    const lowPulse = 0.15 + Math.sin(Date.now() * 0.012) * 0.1;
    const lowGrad = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.25,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.65
    );
    lowGrad.addColorStop(0, "transparent");
    lowGrad.addColorStop(0.6, "transparent");
    lowGrad.addColorStop(1, "#ff0033");
    ctx.save();
    ctx.globalAlpha = lowPulse;
    ctx.fillStyle = lowGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();

    // Flashing warning text
    if (Math.sin(Date.now() * 0.008) > 0) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "700 11px 'Sora', sans-serif";
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 8;
      ctx.fillText("\u26A0 CRITICAL DAMAGE \u26A0", CANVAS_W / 2, 200);
      ctx.restore();
    }
  }

  ctx.restore(); // shake

  // Coin pop particles (not affected by shake — they fly to HUD)
  drawCoinPops(ctx, state);

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

    // Zone change notification
    if (state.zoneNotification && state.zoneNotificationTimer > 0) {
      const zt = state.zoneNotificationTimer;
      const zAlpha = zt > 150 ? (180 - zt) / 30 : zt < 30 ? zt / 30 : 1;
      ctx.font = "700 16px 'Sora',sans-serif";
      ctx.fillStyle = `rgba(255,200,80,${zAlpha * 0.9})`;
      ctx.shadowColor = "rgba(255,150,0,0.6)";
      ctx.shadowBlur = 12;
      ctx.fillText("— " + state.zoneNotification + " —", CANVAS_W / 2, 92);
      ctx.shadowBlur = 0;
    }

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

    // Dramatic Achievement notification
    _drawAchievementNotification(ctx, state);

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

  // Coin counter (always visible)
  drawCoinCounter(ctx, state);

  // Combo effects (enhanced visual feedback)
  renderComboEffects(ctx, state);

  // Combo milestone popup
  if (state.comboPopup && state.comboPopup.timer > 0) {
    const cp = state.comboPopup;
    const t = cp.timer / cp.maxTimer; // 1 → 0
    const scale = 1 + (1 - t) * 0.6;
    const alpha = t < 0.2 ? t * 5 : (t > 0.7 ? (1 - t) / 0.3 : 1);
    const time = Date.now();

    const popupTier = getComboTier(cp.combo || state.combo);
    const color = getTierColor(popupTier, time);
    const glow = getTierGlow(popupTier, time);

    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = alpha * 0.95;

    // Background flash for high tiers
    if (popupTier.beyond || (cp.combo || state.combo) >= 220) {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.05;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = alpha * 0.95;
    }

    // Big tier name
    ctx.font = `900 ${42 * scale}px 'Sora', sans-serif`;
    ctx.fillStyle = color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = popupTier.beyond ? 40 : 25;
    ctx.fillText(cp.text, CANVAS_W / 2, CANVAS_H / 2 - 50);

    // Combo count
    ctx.font = `900 ${22 * scale}px 'Sora', sans-serif`;
    ctx.shadowBlur = 15;
    ctx.fillText(cp.sub, CANVAS_W / 2, CANVAS_H / 2 - 18);

    // Beyond tier extra effects
    if (popupTier.beyond) {
      ctx.shadowBlur = 0;
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 - i * 0.5;
        ctx.globalAlpha = (alpha * 0.5) - i * 0.15;
        ctx.beginPath();
        ctx.arc(CANVAS_W / 2, CANVAS_H / 2 - 35, 80 + i * 20 + (1 - t) * 30, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Active effects indicators (with timer rings)
  {
    const EFFECT_COLORS = {
      shield: "#00e5ff", rapid: "#ffff00", triple: "#ff00ff",
      slowtime: "#88ddff", magnet: "#aa55ff", doublepts: "#ffaa00", freeze: "#5599ff",
    };
    const EFFECT_DURATIONS = {
      shield: 5000, rapid: 4000, triple: 5000,
      slowtime: 4000, magnet: 6000, doublepts: 6000, freeze: 3000,
    };
    let pyOffset = 96;
    for (const [key, val] of Object.entries(state.activeEffects)) {
      if (val <= 0) continue;
      const col = EFFECT_COLORS[key] || "#ffffff";
      const maxDur = EFFECT_DURATIONS[key] || 5000;
      const progress = val / maxDur;

      // Mini icon circle
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(CANVAS_W - 25, pyOffset, 8, 0, Math.PI * 2);
      ctx.fill();

      // Timer ring
      ctx.beginPath();
      ctx.arc(CANVAS_W - 25, pyOffset, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6;
      ctx.font = "600 8px 'Sora',sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(key.toUpperCase(), CANVAS_W - 40, pyOffset + 3);

      ctx.globalAlpha = 1;
      pyOffset += 28;
    }
  }

  // Boss defeat white flash overlay
  if (state.bossWhiteFlash > 0) {
    ctx.globalAlpha = Math.min(0.5, state.bossWhiteFlash / 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  // ─── WAVE EVENT UI ───
  // Active event HUD banner
  if (state.activeWaveEvent) {
    const maxFrames = state.activeWaveEvent.duration / 16.667;
    const progress = state.waveEventTimer / maxFrames;
    ctx.save();
    ctx.fillStyle = state.activeWaveEvent.color;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 145, CANVAS_W, 30);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(0, 145, CANVAS_W, 1);
    ctx.fillRect(0, 174, CANVAS_W, 1);
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "700 13px 'Sora', sans-serif";
    ctx.fillStyle = state.activeWaveEvent.color;
    ctx.fillText(state.activeWaveEvent.name, CANVAS_W / 2, 163);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = state.activeWaveEvent.color;
    ctx.fillRect(20, 170, (CANVAS_W - 40) * progress, 2);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Active event background tint
    ctx.save();
    const evPulse = 0.03 + Math.sin(Date.now() * 0.003) * 0.015;
    ctx.globalAlpha = evPulse;
    ctx.fillStyle = state.activeWaveEvent.color;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Wave event warning overlay
  if (state.waveEventWarning) {
    const w = state.waveEventWarning;
    const t = w.timer / w.maxTimer;
    const event = w.event;
    const pulse = 0.15 + Math.sin(Date.now() * 0.01) * 0.08;
    ctx.save();
    // Edge vignette
    const grad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.2, CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.7);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, event.color);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
    // Warning text
    const textPulse = 1 + Math.sin(Date.now() * 0.012) * 0.08;
    ctx.textAlign = "center";
    ctx.font = "700 14px 'Sora', sans-serif";
    ctx.fillStyle = event.color;
    ctx.globalAlpha = 0.9;
    ctx.fillText("\u26A0 WARNING \u26A0", CANVAS_W / 2, CANVAS_H / 2 - 80);
    ctx.font = `900 ${36 * textPulse}px 'Sora', sans-serif`;
    ctx.fillStyle = event.color;
    ctx.shadowColor = event.color;
    ctx.shadowBlur = 25;
    ctx.fillText(event.name, CANVAS_W / 2, CANVAS_H / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.font = "500 13px 'Sora', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(event.desc, CANVAS_W / 2, CANVAS_H / 2);
    const secondsLeft = Math.ceil(w.timer / 60);
    ctx.font = "800 48px 'Sora', sans-serif";
    ctx.fillStyle = event.color;
    ctx.fillText(secondsLeft.toString(), CANVAS_W / 2, CANVAS_H / 2 + 70);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Reward popup
  if (state.rewardPopup && state.rewardPopup.timer > 0) {
    const rp = state.rewardPopup;
    const t = rp.timer / rp.maxTimer;
    const yOffset = (1 - t) * 30;
    const alpha = t < 0.3 ? t * 3.3 : t;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.font = "900 24px 'Sora', sans-serif";
    ctx.fillStyle = rp.color;
    ctx.shadowColor = rp.color;
    ctx.shadowBlur = 15;
    ctx.fillText(rp.text, CANVAS_W / 2, CANVAS_H / 2 + yOffset);
    ctx.font = "700 16px 'Sora', sans-serif";
    ctx.fillText("EVENT COMPLETE", CANVAS_W / 2, CANVAS_H / 2 - 30 + yOffset);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Zone notification
  // FIX: Use zoneNameNotification (object) instead of zoneNotification (string)
  if (state.zoneNameNotification && state.zoneNameNotification.timer > 0) {
    const t = state.zoneNameNotification.timer / 120;
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = (t < 0.2 ? t * 5 : (t > 0.7 ? (1 - t) / 0.3 : 1)) * 0.5;
    ctx.font = "500 11px 'Sora', sans-serif";
    ctx.fillStyle = state.zoneNameNotification.color;
    ctx.fillText(`ENTERING ${state.zoneNameNotification.name.toUpperCase()}`, CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.restore();
  }

  // Ability button (bottom-left, always visible during gameplay)
  if (!state.deathScene && !state.gameOver) {
    drawAbilityButton(ctx, state);
  }

  // Death scene overlay (drawn on top of everything)
  if (state.deathScene) {
    drawDeathScene(ctx, state);
  }

  // HUD frame (sci-fi viewport decoration, on top of everything)
  if (!state.deathScene) {
    drawHUDFrame(ctx);
  }

  ctx.restore();
}

// ── Dramatic Achievement Notification System ──

export function showAchievementNotification(state, ach, playSound) {
  state.achNotificationQueue.push({ ach, playSound });
  if (!state.achNotification) {
    const next = state.achNotificationQueue.shift();
    _startAchNotification(state, next);
  }
}

function _startAchNotification(state, entry) {
  const { ach, playSound } = entry;
  const sparkles = [];
  for (let i = 0; i < 30; i++) {
    sparkles.push({
      x: CANVAS_W / 2 + (Math.random() - 0.5) * 60,
      y: 100 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 1,
      life: 1,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 30,
    });
  }
  state.achNotification = {
    ach,
    timer: 300,
    maxTimer: 300,
    phase: "intro",
    sparkles,
    rays: 0,
  };
  if (playSound) state.sfx.achievement = true;
}

function _easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _drawAchievementNotification(ctx, state) {
  if (!state.achNotification) return;

  const n = state.achNotification;
  const t = n.timer / n.maxTimer;
  const ach = n.ach;
  const cat = ACHIEVEMENT_CATEGORIES.find(c => c.id === ach.cat);
  const color = cat ? cat.color : "#ffaa00";

  let slide = 1;
  if (n.phase === "intro") {
    const introT = (1 - t) / 0.15;
    slide = _easeOutBack(Math.min(1, introT));
  } else if (n.phase === "outro") {
    const outroT = t / 0.15;
    slide = Math.max(0, outroT);
  }

  const cardW = 320;
  const cardH = 90;
  const cardX = (CANVAS_W - cardW) / 2;
  const cardY = 70 - (1 - slide) * 80;

  ctx.save();

  // Screen-wide light rays
  ctx.save();
  ctx.translate(CANVAS_W / 2, cardY + cardH / 2);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + n.rays * 0.02;
    ctx.save();
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, 200, 0);
    grad.addColorStop(0, color + "60");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.globalAlpha = slide * 0.3;
    ctx.fillRect(0, -3, 200, 6);
    ctx.restore();
  }
  ctx.restore();

  // Card glow backdrop
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 30 * slide;
  ctx.fillStyle = color;
  ctx.globalAlpha = slide * 0.15;
  _roundRect(ctx, cardX - 10, cardY - 5, cardW + 20, cardH + 10, 16);
  ctx.fill();
  ctx.restore();

  // Main card
  ctx.save();
  ctx.globalAlpha = slide * 0.97;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, "rgba(20,20,30,0.97)");
  cardGrad.addColorStop(1, "rgba(10,10,20,0.97)");
  ctx.fillStyle = cardGrad;
  _roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.fill();

  // Color bar at top
  ctx.fillStyle = color;
  _roundRectTop(ctx, cardX, cardY, cardW, 4, 14);
  ctx.fill();

  // Border glow
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  _roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Trophy icon (left side, pulsing)
  const iconX = cardX + 35;
  const iconY = cardY + cardH / 2;
  const iconPulse = 1 + Math.sin(n.rays * 0.1) * 0.08;

  ctx.save();
  ctx.translate(iconX, iconY);
  ctx.scale(iconPulse, iconPulse);
  ctx.fillStyle = color;
  ctx.globalAlpha = slide * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = slide;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.font = "700 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u2605", 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Text
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = "700 9px 'Sora',sans-serif";
  ctx.fillStyle = color;
  ctx.fillText("ACHIEVEMENT UNLOCKED", cardX + 70, cardY + 28);

  ctx.font = "800 17px 'Sora',sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.fillText(ach.name, cardX + 70, cardY + 50);
  ctx.shadowBlur = 0;

  ctx.font = "500 11px 'Sora',sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(ach.desc, cardX + 70, cardY + 67);

  // Coin reward (right side)
  ctx.textAlign = "right";
  ctx.font = "800 14px 'Sora',sans-serif";
  ctx.fillStyle = "#ffaa00";
  ctx.shadowColor = "#ffaa00";
  ctx.shadowBlur = 8;
  ctx.fillText(`+${ach.reward}`, cardX + cardW - 18, cardY + 50);
  ctx.font = "600 9px 'Sora',sans-serif";
  ctx.fillText("COINS", cardX + cardW - 18, cardY + 65);
  ctx.shadowBlur = 0;

  ctx.restore();

  // Sparkles
  n.sparkles.forEach(s => {
    if (s.delay > 0 || s.life <= 0) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = s.life;
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    ctx.restore();
  });

  ctx.restore();
}
