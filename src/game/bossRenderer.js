import { CANVAS_W, CANVAS_H } from "./constants.js";

export function drawBoss(ctx, boss, s) {
  if (!boss) return;

  switch (boss.id) {
    case "solar_sentinel": drawSolarSentinel(ctx, boss, s); break;
    case "acid_wraith": drawAcidWraith(ctx, boss, s); break;
    case "orbital_fortress": drawOrbitalFortress(ctx, boss, s); break;
    case "iron_colossus": try { drawIronColossus(ctx, boss, s); } catch(e) { console.error("Colossus draw error:", e); } break;
    case "storm_titan": drawStormTitan(ctx, boss, s); break;
    case "ring_weaver": drawRingWeaver(ctx, boss, s); break;
    case "cryo_phantom": drawCryoPhantom(ctx, boss, s); break;
    case "void_leviathan": drawVoidLeviathan(ctx, boss, s); break;
  }

  // Hit flash overlay — white flash on boss when damaged
  if (s.bossHitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = s.bossHitFlash / 3 * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.bossX, s.bossY, boss.hitRadius + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawBossProjectiles(ctx, projectiles, boss) {
  for (const p of projectiles) {
    // Draw fading trail (last 4 positions)
    p.trail = p.trail || [];
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 4) p.trail.shift();
    const trailColor = p.type === "shard" ? "#F0997B" :
      p.type === "acid" ? "#97C459" :
      p.type === "cannon" ? "#ff6644" :
      p.type === "missile" ? "#ff4444" :
      p.type === "drone" ? "#F09595" :
      p.type === "ice_shard" ? "#5DCAA5" :
      (boss ? boss.colorLight : "#ffffff");
    for (let ti = 0; ti < p.trail.length - 1; ti++) {
      const t = p.trail[ti];
      ctx.globalAlpha = (ti / p.trail.length) * 0.2;
      ctx.fillStyle = trailColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, (3) * (ti / p.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Glow effect for all projectile types
    const glowColor = trailColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;

    if (p.type === "shard") {
      ctx.fillStyle = "#F0997B";
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(3, 0); ctx.lineTo(0, 6); ctx.lineTo(-3, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#D85A30";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === "acid") {
      ctx.fillStyle = "#97C459";
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#639922";
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === "bullet") {
      ctx.fillStyle = boss ? boss.colorLight : "#85B7EB";
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "missile") {
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(3, 3); ctx.lineTo(-3, 3);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath(); ctx.arc(0, 5, 2, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "drone") {
      // Simple circle with inner dot
      ctx.fillStyle = "rgba(121,31,31,0.4)";
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#E24B4A";
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "cannon") {
      // Simple filled rect with glow
      ctx.fillStyle = "#E24B4A";
      ctx.shadowColor = "#E24B4A";
      ctx.shadowBlur = 6;
      ctx.fillRect(-3, -5, 6, 10);
      ctx.shadowBlur = 0;
    } else if (p.type === "orb") {
      // Golden orb — simple glowing circle
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#FFF8DC";
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "ice_shard") {
      // Diamond shape ice shard
      ctx.fillStyle = "#5DCAA5";
      ctx.shadowColor = "#5DCAA5";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(4, 0); ctx.lineTo(0, 7); ctx.lineTo(-4, 0);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#9FE1CB";
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = boss ? boss.color : "#ffffff";
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export function drawBossWarning(ctx, boss, timer) {
  // timer counts DOWN from 150 to 0
  // elapsed = how far into the intro we are (0 → 150)
  const elapsed = 150 - timer;
  const duration = 150;
  const t = elapsed / duration;

  // Phase 1: WARNING (0-60 frames) — red flashing text
  if (elapsed < 60) {
    const flash = Math.sin(elapsed * 0.5) > 0;
    if (flash) {
      ctx.fillStyle = "rgba(255,0,40,0.15)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "900 32px 'Sora', sans-serif";
    ctx.fillStyle = "#ff3344";
    ctx.shadowColor = "#ff0033";
    ctx.shadowBlur = 25;

    const scale = 1 + Math.sin(elapsed * 0.3) * 0.05;
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 50);
    ctx.scale(scale, scale);
    ctx.fillText("\u26A0 WARNING \u26A0", 0, 0);
    ctx.restore();

    ctx.font = "600 13px 'Sora', sans-serif";
    ctx.fillStyle = "#ff6666";
    ctx.shadowBlur = 10;
    ctx.fillText("BOSS APPROACHING", CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.restore();
  }

  // Phase 2: REVEAL (60-120 frames) — boss name appears
  if (elapsed >= 60 && elapsed < 120) {
    const t2 = (elapsed - 60) / 60;

    // Dark overlay
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, t2)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.min(1, t2 * 2);

    ctx.font = "900 36px 'Sora', sans-serif";
    ctx.fillStyle = boss.color || "#ffffff";
    ctx.shadowColor = boss.color || "#ffffff";
    ctx.shadowBlur = 30;
    ctx.fillText(boss.name, CANVAS_W / 2, CANVAS_H / 2 - 10);

    ctx.font = "600 11px 'Sora', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.shadowBlur = 6;
    const subtitle = boss.subtitle || ("Guardian of " + (boss.planet || "this sector"));
    ctx.fillText(subtitle.toUpperCase(), CANVAS_W / 2, CANVAS_H / 2 + 18);

    ctx.restore();
  }

  // Phase 3: READY (120-150 frames) — bright flash transition
  if (elapsed >= 120) {
    const t3 = (elapsed - 120) / 30;
    ctx.fillStyle = `rgba(255,255,255,${(1 - t3) * 0.3})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  ctx.globalAlpha = 1;
}

export function drawBossHPBar(ctx, boss, hp, maxHP, phase) {
  const barWidth = 300;
  const barX = 60;
  const barY = 20;

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 12px 'Sora', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(boss.name, barX, barY - 6);

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "400 9px 'Sora', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(boss.planet + " guardian", barX + barWidth, barY - 6);

  // Bar background
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, 8, 4);
  ctx.fill();

  // Bar fill with boss accent gradient
  const hpPercent = Math.max(0, hp / maxHP);
  const fillWidth = barWidth * hpPercent;
  if (fillWidth > 0) {
    const grad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
    grad.addColorStop(0, boss.color);
    grad.addColorStop(1, boss.colorLight);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillWidth, 8, 4);
    ctx.fill();
  }

  // Phase dots
  if (boss.phases > 1) {
    for (let i = 0; i < boss.phases; i++) {
      ctx.fillStyle = i < phase ? boss.color : "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.arc(barX + (i * 12) + 6, barY + 16, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawBossDefeated(ctx, boss, timer) {
  ctx.globalAlpha = 1 - (timer / 120);
  ctx.fillStyle = boss.color;
  ctx.font = "800 24px 'Sora', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BOSS DEFEATED", CANVAS_W / 2, CANVAS_H / 2 - 20);
  ctx.font = "500 14px 'Sora', sans-serif";
  ctx.fillStyle = "#ffaa00";
  ctx.fillText("+" + boss.reward + " coins", CANVAS_W / 2, CANVAS_H / 2 + 10);
  ctx.globalAlpha = 1;
}

// ─── Individual Boss Draw Functions ───

function drawSolarSentinel(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const t = s.bossTimer;

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 50);
  glow.addColorStop(0, "rgba(216,90,48,0.3)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill();

  // Multi-point star body
  const points = 8;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2 + t * 0.02;
    const r = i % 2 === 0 ? 30 : 15;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const sg = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, 30);
  sg.addColorStop(0, boss.colorLight);
  sg.addColorStop(0.6, boss.color);
  sg.addColorStop(1, "#6B2D18");
  ctx.fillStyle = sg;
  ctx.fill();

  // Core
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.6 + Math.sin(t * 0.1) * 0.2;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Orbiting shard particles
  for (let i = 0; i < 4; i++) {
    const a = t * 0.05 + (Math.PI * 2 * i) / 4;
    const px = x + Math.cos(a) * 40;
    const py = y + Math.sin(a) * 20;
    ctx.fillStyle = boss.colorLight;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(px, py - 4); ctx.lineTo(px + 2, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 2, py);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Flame trail
  const sp = s.bossSpecific;
  if (sp.flameTrail) {
    for (const f of sp.flameTrail) {
      ctx.globalAlpha = f.life / 120 * 0.4;
      ctx.fillStyle = boss.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, 8 * (f.life / 120), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawAcidWraith(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const t = s.bossTimer;
  const sp = s.bossSpecific;

  // Draw acid pools
  if (sp.acidPools) {
    for (const pool of sp.acidPools) {
      ctx.globalAlpha = (pool.lifetime / 300) * 0.4;
      const pg = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, pool.radius);
      pg.addColorStop(0, "#97C459");
      pg.addColorStop(0.7, "#639922");
      pg.addColorStop(1, "transparent");
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const drawWraithBody = (wx, wy, scale) => {
    // Amorphous cloud
    ctx.save();
    ctx.translate(wx, wy);
    ctx.scale(scale, scale);

    const cg = ctx.createRadialGradient(0, -5, 0, 0, 0, 35);
    cg.addColorStop(0, boss.colorLight);
    cg.addColorStop(0.5, boss.color);
    cg.addColorStop(1, "rgba(99,153,34,0)");
    ctx.fillStyle = cg;

    // Main body ellipses
    ctx.beginPath(); ctx.ellipse(0, -5, 28, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, 5, 18, 14, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 5, 18, 14, -0.2, 0, Math.PI * 2); ctx.fill();

    // Eyes
    const eyeGlow = sp.eyeOpen ? 1 : 0.3;
    ctx.fillStyle = `rgba(255,255,100,${eyeGlow})`;
    ctx.beginPath(); ctx.arc(-8, -8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -8, 4, 0, Math.PI * 2); ctx.fill();
    if (sp.eyeOpen) {
      ctx.fillStyle = "rgba(255,255,200,0.8)";
      ctx.beginPath(); ctx.arc(-8, -8, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -8, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Invulnerable shield effect when eyes closed
    if (!sp.eyeOpen) {
      ctx.strokeStyle = "rgba(100,255,100,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Dripping tendrils
    for (let i = -2; i <= 2; i++) {
      const tx = i * 10;
      const ty = 20 + Math.sin(t * 0.05 + i) * 5;
      ctx.strokeStyle = boss.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, 10);
      ctx.quadraticCurveTo(tx + Math.sin(t * 0.03 + i) * 5, ty - 5, tx, ty);
      ctx.stroke();
      // Drip
      ctx.fillStyle = boss.colorLight;
      ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  drawWraithBody(x, y, 1);
}

function drawOrbitalFortress(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const sp = s.bossSpecific;

  // Station body - octagon
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    const r = 35;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const sg = ctx.createRadialGradient(x, y, 0, x, y, 35);
  sg.addColorStop(0, boss.colorLight);
  sg.addColorStop(0.5, boss.color);
  sg.addColorStop(1, "#0C3058");
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = "rgba(133,183,235,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Solar panel wings
  ctx.fillStyle = "#1a3366";
  ctx.fillRect(x - 60, y - 6, 20, 12);
  ctx.fillRect(x + 40, y - 6, 20, 12);
  ctx.strokeStyle = boss.colorLight;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.strokeRect(x - 58 + i * 5, y - 4, 4, 8);
    ctx.strokeRect(x + 42 + i * 5, y - 4, 4, 8);
  }
  ctx.globalAlpha = 1;

  // Turrets
  if (sp.turrets) {
    for (const t of sp.turrets) {
      const tx = x + t.x;
      const ty = y + t.y;
      if (t.alive) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(tx - 6, ty - 6, 12, 12);
        ctx.fillStyle = boss.colorLight;
        ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,100,50,0.3)";
        ctx.fillRect(tx - 6, ty - 6, 12, 12);
      }
    }
  }

  // Shield drones
  if (sp.drones) {
    for (const d of sp.drones) {
      if (!d.alive) continue;
      const dx = x + Math.cos(d.angle) * 55;
      const dy = y + Math.sin(d.angle) * 55;
      ctx.fillStyle = boss.colorLight;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Core (visible when turrets destroyed)
  if (sp.allTurretsDestroyed) {
    ctx.fillStyle = "#ff4444";
    ctx.globalAlpha = 0.5 + Math.sin(s.bossTimer * 0.1) * 0.3;
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawIronColossus(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const sp = s.bossSpecific;
  const enraged = sp.enraged;

  // Glow if enraged
  if (enraged) {
    const eg = ctx.createRadialGradient(x, y, 0, x, y, 60);
    eg.addColorStop(0, "rgba(255,50,50,0.2)");
    eg.addColorStop(1, "transparent");
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2); ctx.fill();
  }

  // Legs
  ctx.fillStyle = "#4A1515";
  ctx.fillRect(x - 20, y + 20, 10, 18);
  ctx.fillRect(x + 10, y + 20, 10, 18);

  // Torso
  const tg = ctx.createLinearGradient(x, y - 25, x, y + 20);
  tg.addColorStop(0, boss.colorLight);
  tg.addColorStop(0.5, boss.color);
  tg.addColorStop(1, "#4A1515");
  ctx.fillStyle = tg;
  ctx.fillRect(x - 22, y - 25, 44, 45);

  // Shoulder blocks
  ctx.fillStyle = boss.color;
  ctx.fillRect(x - 35, y - 22, 15, 20);
  ctx.fillRect(x + 20, y - 22, 15, 20);

  // Cannon arms
  ctx.fillStyle = "#6B2020";
  ctx.fillRect(x - 38, y - 5, 8, 25);
  ctx.fillRect(x + 30, y - 5, 8, 25);
  ctx.fillStyle = enraged ? "#ff4444" : boss.colorLight;
  ctx.beginPath(); ctx.arc(x - 34, y + 20, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 34, y + 20, 4, 0, Math.PI * 2); ctx.fill();

  // Head with visor
  ctx.fillStyle = "#3A1515";
  ctx.fillRect(x - 12, y - 35, 24, 12);
  ctx.fillStyle = enraged ? "#ff2222" : "#ffaa44";
  ctx.fillRect(x - 8, y - 32, 16, 4);

  // Back panel indicator (when facing away = vulnerable)
  if (sp.facingAway) {
    ctx.fillStyle = "#ff4444";
    ctx.globalAlpha = 0.5 + Math.sin(s.bossTimer * 0.15) * 0.3;
    ctx.fillRect(x - 15, y - 20, 30, 35);
    ctx.globalAlpha = 1;
  }

  // Shockwave — simple horizontal rect expanding downward
  if (sp.shockwave && sp.shockwave.active) {
    const shHeight = CANVAS_H - sp.shockwave.y;
    if (shHeight > 0) {
      // Warning line ahead of shockwave
      if (sp.shockwave.y < CANVAS_H * 0.5) {
        ctx.globalAlpha = 0.3 + Math.sin(s.bossTimer * 10) * 0.15;
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(0, sp.shockwave.y + 40, CANVAS_W, 2);
        ctx.fillStyle = "#00ff66";
        ctx.fillRect(sp.shockwave.gap1, sp.shockwave.y + 38, sp.shockwave.gapWidth, 6);
        ctx.fillRect(sp.shockwave.gap2, sp.shockwave.y + 38, sp.shockwave.gapWidth, 6);
        ctx.globalAlpha = 1;
      }
      // Main shockwave band
      ctx.fillStyle = "rgba(226,75,74,0.3)";
      ctx.fillRect(0, sp.shockwave.y - 5, CANVAS_W, 10);
      // Safe gaps — clear sections
      ctx.clearRect(sp.shockwave.gap1, sp.shockwave.y - 5, 40, 10);
      ctx.clearRect(sp.shockwave.gap2, sp.shockwave.y - 5, 40, 10);
    }
  }

  // Drones — simple circles with inner dot
  for (const d of sp.drones || []) {
    if (!d.alive) continue;
    const dx = x + Math.cos(d.angle) * d.dist;
    const dy = y + Math.sin(d.angle) * d.dist;
    ctx.fillStyle = "rgba(121,31,31,0.4)";
    ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E24B4A";
    ctx.beginPath(); ctx.arc(dx, dy, 2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStormTitan(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const sp = s.bossSpecific;

  // Massive cloud layers
  for (let i = 3; i >= 0; i--) {
    const layerY = y - 20 + i * 25;
    const layerW = 160 - i * 15;
    ctx.globalAlpha = 0.3 + i * 0.15;
    const cg = ctx.createRadialGradient(x, layerY, 0, x, layerY, layerW / 2);
    cg.addColorStop(0, boss.colorLight);
    cg.addColorStop(0.6, boss.color);
    cg.addColorStop(1, "transparent");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(x, layerY, layerW / 2, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Central eye
  ctx.fillStyle = sp.eyeOpen ? "#ffffff" : "#2a2050";
  ctx.beginPath();
  ctx.ellipse(x, y + 15, sp.eyeOpen ? 18 : 12, sp.eyeOpen ? 14 : 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (sp.eyeOpen) {
    // Pupil
    ctx.fillStyle = boss.color;
    ctx.beginPath(); ctx.arc(x, y + 15, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(x, y + 15, 4, 0, Math.PI * 2); ctx.fill();
    // Eye glow
    const eg = ctx.createRadialGradient(x, y + 15, 0, x, y + 15, 30);
    eg.addColorStop(0, "rgba(175,169,236,0.3)");
    eg.addColorStop(1, "transparent");
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(x, y + 15, 30, 0, Math.PI * 2); ctx.fill();
  }

  // Lightning warnings
  if (sp.lightningWarnings) {
    for (const w of sp.lightningWarnings) {
      ctx.globalAlpha = 0.3 + Math.sin(w.timer * 0.3) * 0.2;
      ctx.fillStyle = boss.colorLight;
      ctx.fillRect(w.x - 10, 0, 20, CANVAS_H);
      ctx.globalAlpha = 1;
    }
  }

  // Active lightning bolts
  if (sp.activeBolts) {
    for (const bolt of sp.activeBolts) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.globalAlpha = bolt.timer / 15;
      ctx.beginPath();
      let bx = bolt.x;
      let by = y + 60;
      ctx.moveTo(bx, by);
      while (by < CANVAS_H) {
        bx += (Math.random() - 0.5) * 20;
        by += 20 + Math.random() * 15;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.strokeStyle = boss.colorLight;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Gravity well
  if (sp.gravityWell) {
    ctx.strokeStyle = boss.colorLight;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1;
    for (let r = 20; r < 120; r += 15) {
      ctx.beginPath();
      ctx.arc(sp.gravityWell.x, CANVAS_H / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Electric orbs
  if (sp.orbs) {
    for (const orb of sp.orbs) {
      ctx.fillStyle = boss.colorLight;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(orb.x, orb.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(orb.x, orb.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawRingWeaver(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const sp = s.bossSpecific;

  // Central sphere
  const sg = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, 22);
  sg.addColorStop(0, boss.colorLight);
  sg.addColorStop(0.5, boss.color);
  sg.addColorStop(1, "#5A3A0A");
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();

  // Surface bands
  ctx.strokeStyle = "rgba(250,199,117,0.3)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y + i * 5, 20, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ring segments (orbiting or deployed)
  if (sp.segments) {
    if (sp.shielding) {
      // Full ring shield
      ctx.strokeStyle = boss.colorLight;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.7 + Math.sin(s.bossTimer * 0.1) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      for (const seg of sp.segments) {
        if (seg.deployed) {
          // Flying segment
          ctx.fillStyle = boss.colorLight;
          ctx.save();
          ctx.translate(seg.projX, seg.projY);
          ctx.rotate(s.bossTimer * 0.1);
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI);
          ctx.fill();
          ctx.restore();
        } else {
          // Orbiting
          const sx = x + Math.cos(seg.angle) * seg.orbitDist;
          const sy = y + Math.sin(seg.angle) * seg.orbitDist;
          ctx.fillStyle = boss.colorLight;
          ctx.globalAlpha = 0.7;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(seg.angle);
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI);
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // Shatter fragments
  if (sp.shatterFragments) {
    for (const f of sp.shatterFragments) {
      ctx.fillStyle = boss.colorLight;
      ctx.globalAlpha = f.life / 60;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y - 4); ctx.lineTo(f.x + 3, f.y); ctx.lineTo(f.x, f.y + 4); ctx.lineTo(f.x - 3, f.y);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawCryoPhantom(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const sp = s.bossSpecific;

  // Frozen columns — with thick red warning lines
  if (sp.frozenColumns) {
    for (const col of sp.frozenColumns) {
      if (col.warningTimer > 0) {
        // Warning phase: thick red pulsing line
        ctx.globalAlpha = 0.5 + Math.sin(s.bossTimer * 0.2) * 0.3;
        ctx.fillStyle = "#ff2222";
        ctx.fillRect(col.x - 4, 0, 8, CANVAS_H); // THICK red warning line
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(col.x - col.width / 2, 0, col.width, CANVAS_H);
        ctx.globalAlpha = 1;
      } else {
        // Active column
        ctx.globalAlpha = (col.timer / 300) * 0.25;
        ctx.fillStyle = boss.colorLight;
        ctx.fillRect(col.x - col.width / 2, 0, col.width, CANVAS_H);
        // Ice texture
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 0.5;
        ctx.globalAlpha *= 0.5;
        for (let iy = 0; iy < CANVAS_H; iy += 30) {
          ctx.beginPath();
          ctx.moveTo(col.x - col.width / 2, iy);
          ctx.lineTo(col.x, iy + 15);
          ctx.lineTo(col.x + col.width / 2, iy);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // Ice spikes
  if (sp.iceSpikes) {
    for (const spike of sp.iceSpikes) {
      ctx.fillStyle = boss.colorLight;
      ctx.save();
      ctx.translate(spike.x, spike.y);
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(4, 0); ctx.lineTo(0, 8); ctx.lineTo(-4, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // Boss body — vulnerability visual states
  const isVulnerable = sp.visible;
  // Invulnerable: 40% opacity; Vulnerable: full opacity with pulse
  const bodyOpacity = isVulnerable ? 1 : 0.4;
  const bodyScale = isVulnerable ? (1.0 + Math.sin(s.bossTimer * 0.15) * 0.05) : 1.0;
  ctx.globalAlpha = bodyOpacity;

  // Crystal layers
  const drawCrystal = (cx, cy, size, rot) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(bodyScale, bodyScale);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, -size * 0.3);
    ctx.lineTo(size * 0.6, size * 0.3);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, size * 0.3);
    ctx.lineTo(-size * 0.6, -size * 0.3);
    ctx.closePath();

    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    cg.addColorStop(0, boss.colorLight);
    cg.addColorStop(0.6, boss.color);
    cg.addColorStop(1, "#0E5840");
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = "rgba(159,225,203,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  drawCrystal(x, y, 25, s.bossTimer * 0.01);
  drawCrystal(x - 12, y - 10, 12, -s.bossTimer * 0.015);
  drawCrystal(x + 12, y - 10, 12, s.bossTimer * 0.012);

  // Ice shard diamonds around body — bright glow when vulnerable (opacity 0.9 vs 0.6)
  const crystalOpacity = isVulnerable ? 0.9 : 0.6;
  ctx.globalAlpha = bodyOpacity * crystalOpacity;
  for (let i = 0; i < 5; i++) {
    const a = s.bossTimer * 0.03 + (Math.PI * 2 * i) / 5;
    const dx = x + Math.cos(a) * 32;
    const dy = y + Math.sin(a) * 32;
    ctx.fillStyle = "#5DCAA5";
    ctx.beginPath();
    ctx.moveTo(dx, dy - 5); ctx.lineTo(dx + 3, dy); ctx.lineTo(dx, dy + 5); ctx.lineTo(dx - 3, dy);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = bodyOpacity;

  // Eyes — pulse larger when vulnerable
  const eyeRadius = isVulnerable ? (3 + Math.sin(s.bossTimer * 0.15) * 1.5) : 3;
  ctx.fillStyle = isVulnerable ? "#ffffff" : "rgba(255,255,255,0.4)";
  ctx.beginPath(); ctx.arc(x - 7, y - 3, eyeRadius, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 7, y - 3, eyeRadius, 0, Math.PI * 2); ctx.fill();

  if (isVulnerable) {
    // Bright glow when vulnerable — stronger
    const vg = ctx.createRadialGradient(x, y, 0, x, y, 50);
    vg.addColorStop(0, "rgba(159,225,203,0.5)");
    vg.addColorStop(0.5, "rgba(93,202,165,0.2)");
    vg.addColorStop(1, "transparent");
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawVoidLeviathan(ctx, boss, s) {
  const x = s.bossX;
  const y = s.bossY;
  const sp = s.bossSpecific;

  // Void energy at screen edges (phase 4)
  if (sp.phase >= 4) {
    ctx.globalAlpha = 0.1 + Math.sin(s.bossTimer * 0.05) * 0.05;
    ctx.fillStyle = boss.color;
    ctx.fillRect(0, 0, 15, CANVAS_H);
    ctx.fillRect(CANVAS_W - 15, 0, 15, CANVAS_H);
    ctx.globalAlpha = 1;
  }

  // Tentacles
  if (sp.tentacles) {
    for (const t of sp.tentacles) {
      if (!t.alive) continue;
      const angle = t.currentAngle || t.baseAngle;
      ctx.strokeStyle = boss.color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.7;

      // Draw tentacle as curved line
      ctx.beginPath();
      const startX = x + Math.cos(angle) * 20;
      const startY = y + Math.sin(angle) * 20;
      const midX = x + Math.cos(angle) * (t.length * 0.5) + Math.sin(s.bossTimer * 0.03 + t.swayOffset) * 15;
      const midY = y + Math.sin(angle) * (t.length * 0.5);
      const endX = x + Math.cos(angle) * t.length;
      const endY = y + Math.sin(angle) * t.length;
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      // Tentacle tip
      ctx.fillStyle = boss.colorLight;
      ctx.beginPath(); ctx.arc(endX, endY, 5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Body
  const bg = ctx.createRadialGradient(x, y, 0, x, y, 40);
  bg.addColorStop(0, boss.colorLight);
  bg.addColorStop(0.5, boss.color);
  bg.addColorStop(1, "#4A1A2B");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(x, y, 35, 28, 0, 0, Math.PI * 2); ctx.fill();

  // Crest spines
  for (let i = -3; i <= 3; i++) {
    const spineX = x + i * 8;
    const spineY = y - 28 - Math.abs(i) * 2;
    ctx.strokeStyle = boss.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spineX, y - 20);
    ctx.lineTo(spineX, spineY);
    ctx.stroke();
  }

  // Central eye
  if (sp.eyeOpen) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.ellipse(x, y, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = boss.color;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = "#4A1A2B";
    ctx.beginPath(); ctx.ellipse(x, y, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Gravity beam with pulsing warning
  if (sp.gravityBeam) {
    // Warning pulsing edge lines
    ctx.globalAlpha = 0.3 + Math.sin(s.bossTimer * 0.15) * 0.15;
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 30); ctx.lineTo(x - 40, CANVAS_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 30); ctx.lineTo(x + 40, CANVAS_H);
    ctx.stroke();

    ctx.globalAlpha = 0.15;
    const gg = ctx.createLinearGradient(x, y + 30, x, CANVAS_H);
    gg.addColorStop(0, boss.colorLight);
    gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 30);
    ctx.lineTo(x - 40, CANVAS_H);
    ctx.lineTo(x + 40, CANVAS_H);
    ctx.lineTo(x + 20, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Mini creatures
  if (sp.miniCreatures) {
    for (const mc of sp.miniCreatures) {
      ctx.fillStyle = boss.colorLight;
      ctx.beginPath(); ctx.arc(mc.x, mc.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(mc.x, mc.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}
