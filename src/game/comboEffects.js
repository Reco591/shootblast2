import { CANVAS_W, CANVAS_H } from "./constants.js";

// Visual combo effects — escalating feedback for kill streaks

const COMBO_TIMEOUT = 240;

const COMBO_TIERS = [
  { min: 0,    label: "",              color: "#ffffff", glow: "#ffffff", screenTint: null },
  // EARLY (white → cool blue)
  { min: 3,    label: "NICE",          color: "#00aaff", glow: "#00aaff", screenTint: "rgba(0,170,255,0.02)" },
  { min: 5,    label: "GOOD",          color: "#00ddaa", glow: "#00ddaa", screenTint: "rgba(0,221,170,0.025)" },
  { min: 8,    label: "GREAT",         color: "#00ff88", glow: "#00ff88", screenTint: "rgba(0,255,136,0.03)" },
  { min: 12,   label: "AWESOME",       color: "#88ff44", glow: "#88ff44", screenTint: "rgba(136,255,68,0.03)" },
  // MID (yellow → orange → red)
  { min: 18,   label: "AMAZING",       color: "#ffdd00", glow: "#ffdd00", screenTint: "rgba(255,221,0,0.035)" },
  { min: 25,   label: "INCREDIBLE",    color: "#ffaa00", glow: "#ffaa00", screenTint: "rgba(255,170,0,0.04)" },
  { min: 35,   label: "UNSTOPPABLE",   color: "#ff8800", glow: "#ff8800", screenTint: "rgba(255,136,0,0.04)" },
  { min: 50,   label: "FEROCIOUS",     color: "#ff5500", glow: "#ff5500", screenTint: "rgba(255,85,0,0.045)" },
  // HIGH (red → pink → purple)
  { min: 70,   label: "RAMPAGE",       color: "#ff2244", glow: "#ff2244", screenTint: "rgba(255,34,68,0.05)" },
  { min: 100,  label: "LEGENDARY",     color: "#ff0066", glow: "#ff0066", screenTint: "rgba(255,0,102,0.05)" },
  { min: 130,  label: "MYTHICAL",      color: "#ff00aa", glow: "#ff00aa", screenTint: "rgba(255,0,170,0.055)" },
  { min: 170,  label: "GODLIKE",       color: "#dd00ff", glow: "#dd00ff", screenTint: "rgba(221,0,255,0.06)" },
  // EXTREME (purple → cyan)
  { min: 220,  label: "DIVINE",        color: "#aa00ff", glow: "#aa00ff", screenTint: "rgba(170,0,255,0.06)" },
  { min: 280,  label: "TRANSCENDENT",  color: "#6644ff", glow: "#6644ff", screenTint: "rgba(102,68,255,0.06)" },
  { min: 350,  label: "ETHEREAL",      color: "#00ddff", glow: "#00ddff", screenTint: "rgba(0,221,255,0.06)" },
  { min: 430,  label: "ASCENDED",      color: "#00ffdd", glow: "#00ffdd", screenTint: "rgba(0,255,221,0.06)" },
  // GODTIER (rainbow + special FX)
  { min: 520,  label: "IMMORTAL",      color: "#ffffff", glow: "#ffaa00", screenTint: "rgba(255,255,255,0.06)", rainbow: true },
  { min: 620,  label: "OMNIPOTENT",    color: "#ffffff", glow: "#ff00ff", screenTint: "rgba(255,255,255,0.07)", rainbow: true },
  { min: 730,  label: "COSMIC",        color: "#ffffff", glow: "#00ffff", screenTint: "rgba(255,255,255,0.07)", rainbow: true },
  { min: 850,  label: "ABSOLUTE",      color: "#ffffff", glow: "#ff44dd", screenTint: "rgba(255,255,255,0.07)", rainbow: true },
  // BEYOND (ultimate tiers)
  { min: 1000, label: "INFINITE",      color: "#ffffff", glow: "#ffffff", screenTint: "rgba(255,255,255,0.08)", rainbow: true, beyond: true },
  { min: 1500, label: "BEYOND",        color: "#ffffff", glow: "#ffffff", screenTint: "rgba(255,255,255,0.08)", rainbow: true, beyond: true },
  { min: 2000, label: "ETERNAL",       color: "#ffffff", glow: "#ffffff", screenTint: "rgba(255,255,255,0.08)", rainbow: true, beyond: true },
];

function getComboTier(combo) {
  let tier = COMBO_TIERS[0];
  for (const t of COMBO_TIERS) {
    if (combo >= t.min) tier = t;
  }
  return tier;
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

// Floating combo text particles
const comboTexts = [];

export function spawnComboText(x, y, combo, multiplier) {
  const tier = getComboTier(combo);
  if (combo < 3) return;

  comboTexts.push({
    x,
    y,
    text: tier.label,
    subText: `${multiplier.toFixed(1)}x`,
    color: tier.color,
    rainbow: tier.rainbow,
    life: 1.0,
    decay: 0.012,
    vy: -1.5,
    scale: 1.0 + Math.min(combo, 25) * 0.02,
  });
}

export function updateComboEffects() {
  for (const t of comboTexts) {
    t.y += t.vy;
    t.vy *= 0.98;
    t.life -= t.decay;
  }
  for (let i = comboTexts.length - 1; i >= 0; i--) {
    if (comboTexts[i].life <= 0) comboTexts.splice(i, 1);
  }
}

export function renderComboEffects(ctx, state) {
  const { combo, comboTimer, comboMultiplier, frame } = state;
  const time = Date.now();

  // Screen tint based on combo tier
  const tier = getComboTier(combo);
  if (tier.screenTint && comboTimer > 0) {
    ctx.fillStyle = tier.screenTint;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Edge glow effect for high combos
  if (combo >= 5 && comboTimer > 0) {
    const color = getTierColor(tier, time);
    const intensity = Math.min(1, (combo - 5) / 20);
    const pulse = 0.5 + Math.sin(frame * 0.08) * 0.3;
    const alpha = intensity * pulse * 0.15;

    const lg = ctx.createLinearGradient(0, 0, 40, 0);
    lg.addColorStop(0, color);
    lg.addColorStop(1, "transparent");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, 40, CANVAS_H);

    const rg = ctx.createLinearGradient(CANVAS_W, 0, CANVAS_W - 40, 0);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(CANVAS_W - 40, 0, 40, CANVAS_H);

    ctx.globalAlpha = 1;
  }

  // Combo ring around player for 10+ combo
  if (combo >= 10 && comboTimer > 0) {
    const color = getTierColor(tier, time);
    const ringAlpha = Math.min(0.4, (combo - 10) * 0.02);
    const ringRadius = 32 + Math.sin(frame * 0.06) * 4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = ringAlpha;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    const dotCount = Math.min(6, Math.floor(combo / 5));
    for (let i = 0; i < dotCount; i++) {
      const angle = (frame * 0.03) + (Math.PI * 2 * i) / dotCount;
      const dx = Math.cos(angle) * ringRadius;
      const dy = Math.sin(angle) * ringRadius;
      ctx.fillStyle = color;
      ctx.globalAlpha = ringAlpha * 0.8;
      ctx.beginPath();
      ctx.arc(state.player.x + dx, state.player.y + dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Floating text particles
  for (const t of comboTexts) {
    const tColor = t.rainbow ? getTierColor(tier, time) : t.color;
    ctx.globalAlpha = t.life;
    ctx.fillStyle = tColor;
    ctx.font = `800 ${Math.floor(14 * t.scale)}px 'Sora', sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = tColor;
    ctx.shadowBlur = 10;
    ctx.fillText(t.text, t.x, t.y);
    ctx.font = `600 ${Math.floor(10 * t.scale)}px 'Sora', sans-serif`;
    ctx.fillText(t.subText, t.x, t.y + 16 * t.scale);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Enhanced combo HUD — top center with timer bar
  if (combo >= 2 && comboTimer > 0) {
    const color = getTierColor(tier, time);
    const glow = getTierGlow(tier, time);
    const pulse = 1 + Math.sin(time * 0.008) * 0.06;

    ctx.save();
    ctx.textAlign = "center";

    // Big combo number
    ctx.font = `900 ${32 * pulse}px 'Sora', sans-serif`;
    ctx.fillStyle = color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = tier.beyond ? 25 : 12;
    ctx.fillText(`${combo}x COMBO`, CANVAS_W / 2, 110);

    // Tier name
    if (tier.label) {
      ctx.font = "800 13px 'Sora', sans-serif";
      ctx.globalAlpha = 0.9;
      ctx.fillText(tier.label, CANVAS_W / 2, 130);
    }

    // Beyond tier extra glow ring
    if (tier.beyond) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4 + Math.sin(time * 0.01) * 0.2;
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, 115, 60 + Math.sin(time * 0.005) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Timer bar
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.4;
    const barW = 100 * (comboTimer / COMBO_TIMEOUT);
    ctx.fillStyle = color;
    ctx.fillRect(CANVAS_W / 2 - 50, 138, 100, 2);
    ctx.globalAlpha = 1;
    ctx.fillRect(CANVAS_W / 2 - 50, 138, barW, 2);

    ctx.restore();
  }

  // Combo break animation
  drawComboBreak(ctx, state);
}

function drawComboBreak(ctx, state) {
  const cb = state.comboBreak;
  if (!cb) return;

  const t = cb.timer / cb.maxTimer;

  // Cracked combo text
  ctx.save();
  ctx.textAlign = "center";
  ctx.globalAlpha = t * 0.7;
  ctx.font = "900 32px 'Sora', sans-serif";
  ctx.fillStyle = "#ff3333";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 15;

  const distort = (1 - t) * 8;
  ctx.fillText("BROKEN", CANVAS_W / 2 - distort, 105);
  ctx.fillStyle = "#aa0000";
  ctx.fillText("BROKEN", CANVAS_W / 2 + distort, 115);

  // Show lost combo
  ctx.font = "700 14px 'Sora', sans-serif";
  ctx.fillStyle = "#ff5555";
  ctx.fillText(`-${cb.combo}x LOST`, CANVAS_W / 2, 138);

  ctx.restore();

  // Draw shards
  cb.shards.forEach(s => {
    if (s.life <= 0) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);
    ctx.globalAlpha = s.life;
    ctx.fillStyle = "#ff3333";
    ctx.shadowColor = "#ff5555";
    ctx.shadowBlur = 5;
    ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
    ctx.restore();
  });

  // Brief red flash
  if (t > 0.85) {
    ctx.save();
    ctx.fillStyle = "rgba(200,0,0,0.15)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
  }
}

export function clearComboTexts() {
  comboTexts.length = 0;
}
