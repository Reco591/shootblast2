import { CANVAS_W, CANVAS_H } from "./constants.js";

export function updateBoss(boss, s) {
  s.bossTimer++;

  switch (boss.id) {
    case "solar_sentinel": return updateSolarSentinel(boss, s);
    case "acid_wraith": return updateAcidWraith(boss, s);
    case "orbital_fortress": return updateOrbitalFortress(boss, s);
    case "iron_colossus": return updateIronColossus(boss, s);
    case "storm_titan": return updateStormTitan(boss, s);
    case "ring_weaver": return updateRingWeaver(boss, s);
    case "cryo_phantom": return updateCryoPhantom(boss, s);
    case "void_leviathan": return updateVoidLeviathan(boss, s);
  }
  return s;
}

// ─── SOLAR SENTINEL (Mercury) ───
function updateSolarSentinel(boss, s) {
  // Fast left/right tracking player loosely
  const targetX = s.playerX + (Math.sin(s.bossTimer * 0.02) * 60);
  s.bossX += (targetX - s.bossX) * 0.03;
  s.bossX = Math.max(40, Math.min(CANVAS_W - 40, s.bossX));
  s.bossInvulnerable = false;

  // Fire heat shards every 60 frames
  if (s.bossTimer % 60 === 0) {
    const count = 3 + Math.floor(Math.random() * 3);
    const spread = 0.6;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + (i - (count - 1) / 2) * (spread / count);
      s.bossProjectiles.push({
        x: s.bossX, y: s.bossY + 30,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        type: "shard",
        lifetime: 600,
      });
    }
    s.sfxBossShoot = true;
  }

  // Dash every 300 frames
  if (s.bossTimer % 300 === 0) {
    const sp = s.bossSpecific;
    sp.dashing = true;
    sp.dashDir = s.bossX < CANVAS_W / 2 ? 1 : -1;
    sp.dashTimer = 40;
    sp.flameTrail = [];
  }

  const sp = s.bossSpecific;
  if (sp.dashing) {
    s.bossX += sp.dashDir * 8;
    sp.flameTrail = sp.flameTrail || [];
    sp.flameTrail.push({ x: s.bossX, y: s.bossY, life: 120 });
    sp.dashTimer--;
    if (sp.dashTimer <= 0 || s.bossX < 30 || s.bossX > CANVAS_W - 30) {
      sp.dashing = false;
    }
  }

  // Update flame trail
  if (sp.flameTrail) {
    for (let i = sp.flameTrail.length - 1; i >= 0; i--) {
      sp.flameTrail[i].life--;
      if (sp.flameTrail[i].life <= 0) sp.flameTrail.splice(i, 1);
    }
    // Flame trail damages player
    for (const f of sp.flameTrail) {
      const dx = f.x - s.playerX;
      const dy = f.y - s.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        s.flameHitPlayer = true;
        break;
      }
    }
  }

  return s;
}

// ─── ACID WRAITH (Venus) ───
function updateAcidWraith(boss, s) {
  const sp = s.bossSpecific;

  if (!sp.initialized) {
    sp.initialized = true;
    sp.eyeGlowTimer = 0;
    sp.phase2 = false;
  }

  const hpPercent = s.bossHP / s.bossMaxHP;

  // Phase 2 at 50% HP: increased aggression, no split
  if (!sp.phase2 && hpPercent <= 0.5) {
    sp.phase2 = true;
    s.bossPhase = 2;
  }

  // Eye glow cycle: open for 180 frames (3s), closed for 120 frames (2s)
  sp.eyeGlowTimer = (sp.eyeGlowTimer || 0) + 1;
  const eyeCycle = sp.eyeGlowTimer % 300;
  sp.eyeOpen = eyeCycle < 180;
  // Always hittable, but reduced damage when eyes closed
  s.bossDamageMultiplier = sp.eyeOpen ? 1 : 0.5;
  s.bossInvulnerable = false;

  // Phase 2: 40% faster attack rate
  const attackMult = sp.phase2 ? 0.6 : 1;
  // Phase 2: acid pools last 5s (300 frames) instead of 4s (240 frames)
  const poolLifetime = sp.phase2 ? 300 : 240;

  // Main wraith movement (single entity entire fight)
  s.bossX += Math.sin(s.bossTimer * 0.015) * 1.5;
  s.bossX = Math.max(40, Math.min(CANVAS_W - 40, s.bossX));

  // Drop acid pool every 90 frames (scaled by attack rate)
  if (s.bossTimer % Math.floor(90 * attackMult) === 0) {
    sp.acidPools = sp.acidPools || [];
    sp.acidPools.push({ x: s.bossX, y: s.bossY + 30, radius: 30, lifetime: poolLifetime });
  }

  // Fire acid blobs every 120 frames (scaled by attack rate)
  if (s.bossTimer % Math.floor(120 * attackMult) === 0) {
    s.bossProjectiles.push(
      { x: s.bossX - 10, y: s.bossY + 30, vx: -0.5, vy: 2.5, type: "acid", lifetime: 500 },
      { x: s.bossX + 10, y: s.bossY + 30, vx: 0.5, vy: 2.5, type: "acid", lifetime: 500 },
    );
    s.sfxBossShoot = true;
  }

  // Phase 2: toxic rain every 150 frames — 20 drops scattered across the screen
  if (sp.phase2 && s.bossTimer % Math.floor(150 * attackMult) === 0) {
    for (let i = 0; i < 20; i++) {
      s.bossProjectiles.push({
        x: 20 + Math.random() * (CANVAS_W - 40),
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 2 + Math.random() * 1.5,
        type: "acid",
        lifetime: 600,
      });
    }
    s.sfxBossShoot = true;
  }

  // Update acid pools
  sp.acidPools = sp.acidPools || [];
  for (let i = sp.acidPools.length - 1; i >= 0; i--) {
    const pool = sp.acidPools[i];
    pool.lifetime--;
    pool.y += 0.5;
    if (pool.lifetime <= 0 || pool.y > CANVAS_H + 20) {
      sp.acidPools.splice(i, 1);
      continue;
    }
    // Pool damages player
    const dx = pool.x - s.playerX;
    const dy = pool.y - s.playerY;
    if (Math.sqrt(dx * dx + dy * dy) < pool.radius) {
      s.poolHitPlayer = true;
    }
  }

  return s;
}

// ─── ORBITAL FORTRESS (Earth) ───
function updateOrbitalFortress(boss, s) {
  const sp = s.bossSpecific;

  if (!sp.initialized) {
    sp.initialized = true;
    const turretHP = Math.floor(s.bossMaxHP / 5);
    sp.turrets = [
      { id: "top", x: 0, y: -30, hp: turretHP, maxHP: turretHP, alive: true },
      { id: "bottom", x: 0, y: 30, hp: turretHP, maxHP: turretHP, alive: true },
      { id: "left", x: -40, y: 0, hp: turretHP, maxHP: turretHP, alive: true },
      { id: "right", x: 40, y: 0, hp: turretHP, maxHP: turretHP, alive: true },
    ];
    sp.drones = [
      { angle: 0, hp: 30, alive: true, respawnTimer: 0 },
      { angle: Math.PI, hp: 30, alive: true, respawnTimer: 0 },
    ];
    sp.turretCycle = 0;
    sp.allTurretsDestroyed = false;
  }

  s.bossX = CANVAS_W / 2;

  // Rotate turret fire cycle
  sp.turretCycle = (sp.turretCycle + 1) % 240;
  const activeTurretIdx = Math.floor(sp.turretCycle / 60) % 4;

  const aliveTurrets = sp.turrets.filter(t => t.alive);
  sp.allTurretsDestroyed = aliveTurrets.length === 0;

  // Core always damageable, but 3x damage when all turrets gone
  s.bossInvulnerable = false;
  s.bossDamageMultiplier = sp.allTurretsDestroyed ? 3 : 1;

  // Turret attacks
  if (sp.turretCycle % 60 === 30) {
    const turret = sp.turrets[activeTurretIdx];
    if (turret && turret.alive) {
      const tx = s.bossX + turret.x;
      const ty = s.bossY + turret.y;

      if (turret.id === "top") {
        for (let i = -1; i <= 1; i++) {
          s.bossProjectiles.push({ x: tx + i * 12, y: ty, vx: i * 0.3, vy: 3, type: "bullet", lifetime: 500 });
        }
      } else if (turret.id === "bottom") {
        // Homing missile
        const angle = Math.atan2(s.playerY - ty, s.playerX - tx);
        s.bossProjectiles.push({ x: tx, y: ty, vx: Math.cos(angle) * 1.5, vy: Math.sin(angle) * 1.5, type: "missile", lifetime: 600, homing: true });
      } else {
        // Side turrets spread at player
        const angle = Math.atan2(s.playerY - ty, s.playerX - tx);
        for (let i = -1; i <= 1; i++) {
          const a = angle + i * 0.2;
          s.bossProjectiles.push({ x: tx, y: ty, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, type: "bullet", lifetime: 500 });
        }
      }
      s.sfxBossShoot = true;
    }
  }

  // Shield drones orbit
  for (const drone of sp.drones) {
    if (drone.alive) {
      drone.angle += 0.02;
    } else {
      drone.respawnTimer--;
      if (drone.respawnTimer <= 0) {
        drone.alive = true;
        drone.hp = 30;
      }
    }
  }

  return s;
}

// ─── IRON COLOSSUS (Mars) ───
function updateIronColossus(boss, s) {
  const sp = s.bossSpecific;

  if (!sp.initialized) {
    sp.initialized = true;
    sp.moveDir = 1;
    sp.charging = false;
    sp.chargeTimer = 0;
    sp.pauseTimer = 0;
    sp.facingAway = false;
    sp.drones = [];
    sp.enraged = false;
  }

  const hpPercent = s.bossHP / s.bossMaxHP;
  const speedMult = (!sp.enraged && hpPercent <= 0.3) ? 1.4 : 1;
  if (hpPercent <= 0.3 && !sp.enraged) {
    sp.enraged = true;
    s.bossPhase = 2;
  }

  // Default: invulnerable (must hit from behind during charge pause)
  s.bossInvulnerable = true;

  if (sp.charging) {
    // Charge toward player X
    const dir = s.playerX > s.bossX ? 1 : -1;
    s.bossX += dir * 4;
    sp.chargeTimer--;
    if (sp.chargeTimer <= 0) {
      sp.charging = false;
      sp.facingAway = true;
      sp.pauseTimer = 120; // 2 second vulnerability window
    }
  } else if (sp.facingAway) {
    // Vulnerable window!
    s.bossInvulnerable = false;
    sp.pauseTimer--;
    if (sp.pauseTimer <= 0) {
      sp.facingAway = false;
    }
  } else {
    // Normal movement
    s.bossX += sp.moveDir * boss.speed * speedMult;
    if (s.bossX > CANVAS_W - 50) sp.moveDir = -1;
    if (s.bossX < 50) sp.moveDir = 1;

    // Periodically stop
    if (s.bossTimer % 120 === 0) sp.moveDir *= -1;
  }

  const attackRate = sp.enraged ? 0.6 : 1;

  // Shockwave every 180 frames
  if (s.bossTimer % Math.floor(180 * attackRate) === 0 && !sp.charging && !sp.facingAway) {
    // Two gaps in the shockwave
    const gap1 = 40 + Math.random() * (CANVAS_W - 120);
    const gap2 = gap1 + 60 + Math.random() * 80;
    sp.shockwave = { y: s.bossY + 30, gap1, gap2, gapWidth: 40, active: true };
    s.sfxBossShoot = true;
  }

  // Update shockwave
  if (sp.shockwave && sp.shockwave.active) {
    sp.shockwave.y += 3;
    if (sp.shockwave.y > CANVAS_H + 20) {
      sp.shockwave.active = false;
    } else {
      // Check player collision (not in gaps)
      const py = s.playerY;
      const px = s.playerX;
      if (Math.abs(sp.shockwave.y - py) < 10) {
        const inGap1 = px > sp.shockwave.gap1 && px < sp.shockwave.gap1 + sp.shockwave.gapWidth;
        const inGap2 = px > sp.shockwave.gap2 && px < sp.shockwave.gap2 + sp.shockwave.gapWidth;
        if (!inGap1 && !inGap2) {
          s.shockwaveHitPlayer = true;
        }
      }
    }
  }

  // Summon meteor drones every 240 frames
  if (s.bossTimer % Math.floor(240 * attackRate) === 0 && !sp.charging) {
    sp.drones = [];
    for (let i = 0; i < 4; i++) {
      sp.drones.push({ angle: (Math.PI * 2 * i) / 4, dist: 50, ramTimer: i * 120 + 60, alive: true });
    }
  }

  // Update drones
  for (let i = sp.drones.length - 1; i >= 0; i--) {
    const d = sp.drones[i];
    if (!d.alive) continue;
    d.angle += 0.03;
    d.ramTimer--;
    if (d.ramTimer <= 0) {
      // Ram toward player
      const dx = s.playerX - (s.bossX + Math.cos(d.angle) * d.dist);
      const dy = s.playerY - (s.bossY + Math.sin(d.angle) * d.dist);
      const len = Math.sqrt(dx * dx + dy * dy);
      s.bossProjectiles.push({
        x: s.bossX + Math.cos(d.angle) * d.dist,
        y: s.bossY + Math.sin(d.angle) * d.dist,
        vx: (dx / len) * 3, vy: (dy / len) * 3,
        type: "drone", lifetime: 500,
      });
      d.alive = false;
    }
  }

  // Cannon fire every 120 frames
  if (s.bossTimer % Math.floor(120 * attackRate) === 0 && !sp.facingAway) {
    s.bossProjectiles.push(
      { x: s.bossX - 25, y: s.bossY + 30, vx: -0.5, vy: 3, type: "cannon", lifetime: 500 },
      { x: s.bossX + 25, y: s.bossY + 30, vx: 0.5, vy: 3, type: "cannon", lifetime: 500 },
    );
    s.sfxBossShoot = true;
  }

  // Charge every 300 frames
  if (s.bossTimer % Math.floor(300 * attackRate) === 0 && !sp.charging && !sp.facingAway) {
    sp.charging = true;
    sp.chargeTimer = 30;
  }

  return s;
}

// ─── STORM TITAN (Jupiter) ───
function updateStormTitan(boss, s) {
  const sp = s.bossSpecific;

  if (!sp.initialized) {
    sp.initialized = true;
    sp.eyeOpenTimer = 0;
    sp.lightningWarnings = [];
    sp.gravityWell = null;
    sp.orbs = [];
  }

  const hpPercent = s.bossHP / s.bossMaxHP;
  if (hpPercent <= 0.33) s.bossPhase = 3;
  else if (hpPercent <= 0.66) s.bossPhase = 2;

  // Eye tracks player
  s.bossX += (s.playerX - s.bossX) * 0.005;
  s.bossX = Math.max(60, Math.min(CANVAS_W - 60, s.bossX));

  // Eye open cycle: open for 90 frames every 300 frames
  sp.eyeOpenTimer = (sp.eyeOpenTimer + 1) % 300;
  sp.eyeOpen = sp.eyeOpenTimer < 90;
  s.bossInvulnerable = !sp.eyeOpen;

  const boltCount = s.bossPhase >= 3 ? 3 : s.bossPhase >= 2 ? 2 : 1;

  // Lightning every 60 frames
  if (s.bossTimer % 60 === 0) {
    for (let i = 0; i < boltCount; i++) {
      const col = 30 + Math.random() * (CANVAS_W - 60);
      sp.lightningWarnings.push({ x: col, timer: 30 });
    }
    s.sfxBossShoot = true;
  }

  // Process lightning warnings
  for (let i = sp.lightningWarnings.length - 1; i >= 0; i--) {
    const w = sp.lightningWarnings[i];
    w.timer--;
    if (w.timer <= 0) {
      // Strike!
      sp.lightningWarnings.splice(i, 1);
      // Check if player is in column
      if (Math.abs(w.x - s.playerX) < 20) {
        s.lightningHitPlayer = true;
      }
      // Add visual bolt
      sp.activeBolts = sp.activeBolts || [];
      sp.activeBolts.push({ x: w.x, timer: 15 });
    }
  }

  // Decay active bolts
  sp.activeBolts = sp.activeBolts || [];
  for (let i = sp.activeBolts.length - 1; i >= 0; i--) {
    sp.activeBolts[i].timer--;
    if (sp.activeBolts[i].timer <= 0) sp.activeBolts.splice(i, 1);
  }

  // Gravity well every 180 frames
  if (s.bossTimer % 180 === 0 || (s.bossPhase >= 3 && !sp.gravityWell)) {
    sp.gravityWell = { x: CANVAS_W / 2, timer: 180 };
  }

  if (sp.gravityWell) {
    sp.gravityWell.timer--;
    // Pull player toward center
    s.gravityPullX = (sp.gravityWell.x - s.playerX) * 0.02;
    if (sp.gravityWell.timer <= 0 && s.bossPhase < 3) {
      sp.gravityWell = null;
      s.gravityPullX = 0;
    }
  } else {
    s.gravityPullX = 0;
  }

  // Electric orbs every 150 frames
  if (s.bossTimer % 150 === 0) {
    sp.orbs.push({ x: 30 + Math.random() * (CANVAS_W - 60), y: s.bossY + 40, vy: 1.2 });
  }

  for (let i = sp.orbs.length - 1; i >= 0; i--) {
    sp.orbs[i].y += sp.orbs[i].vy;
    if (sp.orbs[i].y > CANVAS_H + 20) {
      sp.orbs.splice(i, 1);
      continue;
    }
    const dx = sp.orbs[i].x - s.playerX;
    const dy = sp.orbs[i].y - s.playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 15) {
      s.orbHitPlayer = true;
      sp.orbs.splice(i, 1);
    }
  }

  return s;
}

// ─── RING WEAVER (Saturn) ───
function updateRingWeaver(boss, s) {
  const sp = s.bossSpecific;

  if (!sp.initialized) {
    sp.initialized = true;
    sp.segments = [];
    for (let i = 0; i < 6; i++) {
      sp.segments.push({ angle: (Math.PI * 2 * i) / 6, deployed: false, returnTimer: 0, orbitDist: 35 });
    }
    sp.shieldTimer = 0;
    sp.shielding = false;
    sp.shatterFragments = [];
  }

  const hpPercent = s.bossHP / s.bossMaxHP;
  if (hpPercent <= 0.25) s.bossPhase = 3;
  else if (hpPercent <= 0.5) s.bossPhase = 2;

  // Elegant circular movement
  s.bossX = CANVAS_W / 2 + Math.sin(s.bossTimer * 0.01) * 80;
  s.bossY = 100 + Math.sin(s.bossTimer * 0.008) * 20;

  // Count deployed segments
  const deployedCount = sp.segments.filter(seg => seg.deployed).length;
  // More damage when segments away
  s.bossDamageMultiplier = deployedCount === 6 ? 2 : 1;
  s.bossInvulnerable = sp.shielding;

  // Launch segments every 90 frames — boomerang toward player then return
  const launchCount = s.bossPhase >= 2 ? 3 : s.bossPhase >= 1 ? 2 : 1;
  if (s.bossTimer % 90 === 0 && !sp.shielding) {
    let launched = 0;
    for (const seg of sp.segments) {
      if (!seg.deployed && launched < launchCount) {
        seg.deployed = true;
        seg.phase = "outbound";
        seg.targetX = s.playerX;
        seg.targetY = s.playerY; // player area (~CANVAS_H - 70)
        seg.speed = 5;
        seg.projX = s.bossX + Math.cos(seg.angle) * seg.orbitDist;
        seg.projY = s.bossY + Math.sin(seg.angle) * seg.orbitDist;
        seg.lifetime = 400;
        launched++;
      }
    }
    if (launched > 0) s.sfxBossShoot = true;
  }

  // Update segments — outbound/returning boomerang
  for (const seg of sp.segments) {
    if (seg.deployed) {
      seg.lifetime--;
      if (seg.lifetime <= 0) { seg.deployed = false; continue; }

      if (seg.phase === "outbound") {
        // Fly toward player target
        const dx = seg.targetX - seg.projX;
        const dy = seg.targetY - seg.projY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          seg.phase = "returning";
        } else {
          seg.projX += (dx / dist) * seg.speed;
          seg.projY += (dy / dist) * seg.speed;
        }
      } else {
        // Return to boss
        const dx = s.bossX - seg.projX;
        const dy = s.bossY - seg.projY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 15) {
          seg.deployed = false;
        } else {
          seg.projX += (dx / dist) * (seg.speed * 0.8);
          seg.projY += (dy / dist) * (seg.speed * 0.8);
        }
      }

      // Player collision
      const pdx = seg.projX - s.playerX;
      const pdy = seg.projY - s.playerY;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 18) {
        s.segmentHitPlayer = true;
      }
    } else {
      // Orbit boss
      seg.angle += 0.03;
    }
  }

  // Golden orb barrage every 200 frames — orbs rain down with vy >= 3.5
  if (s.bossTimer % 200 === 0 && !sp.shielding) {
    const orbCount = s.bossPhase >= 3 ? 8 : s.bossPhase >= 2 ? 6 : 4;
    for (let i = 0; i < orbCount; i++) {
      s.bossProjectiles.push({
        x: 30 + Math.random() * (CANVAS_W - 60),
        y: s.bossY + 30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 3.5 + Math.random() * 1.5,
        type: "orb",
        lifetime: 600,
      });
    }
    s.sfxBossShoot = true;
  }

  // Ring shield every 360 frames
  sp.shieldTimer++;
  if (sp.shieldTimer >= 360 && !sp.shielding) {
    sp.shielding = true;
    sp.shieldDuration = 180; // 3 seconds
    // Recall all segments
    for (const seg of sp.segments) {
      seg.deployed = false;
    }
  }

  if (sp.shielding) {
    sp.shieldDuration--;
    if (sp.shieldDuration <= 0) {
      // SHATTER
      sp.shielding = false;
      sp.shieldTimer = 0;
      const fragCount = s.bossPhase >= 3 ? 12 : 6;
      sp.shatterFragments = [];
      for (let i = 0; i < fragCount; i++) {
        const a = (Math.PI * 2 * i) / fragCount;
        sp.shatterFragments.push({
          x: s.bossX, y: s.bossY,
          vx: Math.cos(a) * 6, vy: Math.sin(a) * 6,
          life: 300, // fly until off-screen
        });
      }
      s.sfxBossShoot = true;
    }
  }

  // Update shatter fragments — fly to screen edges
  for (let i = sp.shatterFragments.length - 1; i >= 0; i--) {
    const f = sp.shatterFragments[i];
    f.x += f.vx; f.y += f.vy;
    f.life--;
    // Remove when off-screen or life expired
    if (f.life <= 0 || f.x < -20 || f.x > CANVAS_W + 20 || f.y < -20 || f.y > CANVAS_H + 20) {
      sp.shatterFragments.splice(i, 1); continue;
    }
    const dx = f.x - s.playerX;
    const dy = f.y - s.playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 15) {
      s.segmentHitPlayer = true;
      sp.shatterFragments.splice(i, 1);
    }
  }

  return s;
}

// ─── CRYO PHANTOM (Uranus) ───
function updateCryoPhantom(boss, s) {
  const sp = s.bossSpecific;

  if (!sp.initialized) {
    sp.initialized = true;
    sp.teleportTimer = 240; // first teleport
    sp.vulnerableTimer = 0;
    sp.frozenColumns = [];
    sp.teleportCount = 0;
    sp.visible = true;
    sp.iceSpikes = [];
    sp.iceShardTimer = 0;
  }

  const hpPercent = s.bossHP / s.bossMaxHP;
  if (hpPercent <= 0.25) s.bossPhase = 3;
  else if (hpPercent <= 0.5) s.bossPhase = 2;

  // Teleport frequency: Phase 3 = 150, Phase 2 = 150 (was 180→now 150 i.e. every 2.5s), Phase 1 = 180 (every 3s)
  const teleportInterval = s.bossPhase >= 3 ? 150 : s.bossPhase >= 2 ? 150 : 180;
  // Freeze columns: Phase 2 reduced from 3 to 2
  const freezeCount = s.bossPhase >= 3 ? 4 : s.bossPhase >= 2 ? 2 : 2;

  if (sp.vulnerableTimer > 0) {
    // Vulnerable window after teleport — 3 seconds (180 frames)
    sp.vulnerableTimer--;
    s.bossInvulnerable = false;
    sp.visible = true;
    // When vulnerable: phantom STOPS attacking (clear window to shoot)
  } else {
    s.bossInvulnerable = true;
    sp.visible = false;

    // Fire ice shards while invulnerable — every 120 frames (2 sec), 3 slow shards aimed at player
    sp.iceShardTimer = (sp.iceShardTimer || 0) + 1;
    if (sp.iceShardTimer % 120 === 0) {
      const baseAngle = Math.atan2(s.playerY - s.bossY, s.playerX - s.bossX);
      for (let i = -1; i <= 1; i++) {
        const spread = i * (20 * Math.PI / 180); // ±20°
        s.bossProjectiles.push({
          x: s.bossX, y: s.bossY + 20,
          vx: Math.cos(baseAngle + spread) * 3,
          vy: Math.sin(baseAngle + spread) * 3,
          type: "ice_shard",
          lifetime: 400,
        });
      }
      s.sfxBossShoot = true;
    }

    sp.teleportTimer--;

    if (sp.teleportTimer <= 0) {
      sp.teleportCount++;

      // Every 3rd teleport: appear behind player
      if (sp.teleportCount % 3 === 0) {
        s.bossX = s.playerX;
        s.bossY = CANVAS_H - 120;
        // Fire ice spikes upward
        for (let i = -2; i <= 2; i++) {
          sp.iceSpikes.push({
            x: s.bossX + i * 25, y: s.bossY - 20,
            vx: i * 0.35, vy: -2.8, // 30% slower frost nova
            lifetime: 150,
          });
        }
      } else {
        s.bossX = 60 + Math.random() * (CANVAS_W - 120);
        s.bossY = 60 + Math.random() * 150;
      }

      sp.vulnerableTimer = 180; // 3 seconds vulnerability window (was 90/1.5s)
      sp.teleportTimer = teleportInterval;
      sp.iceShardTimer = 0; // reset shard timer on teleport

      // Freeze columns — show warning first (warningTimer), then activate
      for (let i = 0; i < freezeCount; i++) {
        const col = 20 + Math.random() * (CANVAS_W - 40);
        sp.frozenColumns.push({ x: col, width: 30, timer: 300, warningTimer: 90 }); // 1.5 sec warning
      }

      s.sfxBossShoot = true;
    }
  }

  // Update frozen columns
  for (let i = sp.frozenColumns.length - 1; i >= 0; i--) {
    const col = sp.frozenColumns[i];
    if (col.warningTimer > 0) {
      // Still in warning phase — no damage yet
      col.warningTimer--;
    } else {
      col.timer--;
      if (col.timer <= 0) {
        sp.frozenColumns.splice(i, 1);
        continue;
      }
      // Column damages player (only after warning)
      if (Math.abs(col.x - s.playerX) < col.width / 2) {
        s.iceHitPlayer = true;
      }
    }
  }

  // Update ice spikes
  for (let i = sp.iceSpikes.length - 1; i >= 0; i--) {
    const spike = sp.iceSpikes[i];
    spike.x += spike.vx;
    spike.y += spike.vy;
    spike.lifetime--;
    if (spike.lifetime <= 0 || spike.y < -20 || spike.y > CANVAS_H + 20) {
      sp.iceSpikes.splice(i, 1);
      continue;
    }
    const dx = spike.x - s.playerX;
    const dy = spike.y - s.playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 15) {
      s.iceHitPlayer = true;
      sp.iceSpikes.splice(i, 1);
    }
  }

  return s;
}

// ─── VOID LEVIATHAN (Neptune) ───
function updateVoidLeviathan(boss, s) {
  const sp = s.bossSpecific;
  const PLAYER_Y = CANVAS_H - 70; // Fixed player Y reference

  if (!sp.initialized) {
    sp.initialized = true;
    sp.tentacles = [];
    for (let i = 0; i < 8; i++) {
      sp.tentacles.push({
        baseAngle: (Math.PI * i) / 8 + Math.PI * 0.25,
        length: 120 + Math.random() * 40,
        hp: Math.floor(s.bossMaxHP / 10),
        maxHP: Math.floor(s.bossMaxHP / 10),
        alive: true,
        swayOffset: Math.random() * Math.PI * 2,
        sweepX: 0, // horizontal sweep position
      });
    }
    sp.miniCreatures = [];
    sp.gravityBeam = false;
    sp.eyeOpen = false;
    sp.phase = 1;
  }

  s.bossX = CANVAS_W / 2 + Math.sin(s.bossTimer * 0.005) * 30;

  // Phase 3+ descent: boss moves down but stops 200px from player
  if (sp.phase >= 3) {
    const minBossY = PLAYER_Y - 200;
    if (s.bossY < minBossY) {
      s.bossY += 0.2;
    }
    // Clamp to never enter player zone
    if (s.bossY > minBossY) s.bossY = minBossY;
  } else {
    s.bossY = 80;
  }

  const hpPercent = s.bossHP / s.bossMaxHP;
  const aliveTentacles = sp.tentacles.filter(t => t.alive).length;
  const destroyedTentacles = 8 - aliveTentacles;

  // Phase transitions — one-time triggers
  if (hpPercent <= 0.25 && sp.phase < 4) {
    sp.phase = 4;
    s.bossPhase = 4;
  } else if (hpPercent <= 0.5 && sp.phase < 3) {
    sp.phase = 3;
    s.bossPhase = 3;
    // Regenerate 2 tentacles
    let regen = 0;
    for (const t of sp.tentacles) {
      if (!t.alive && regen < 2) {
        t.alive = true;
        t.hp = t.maxHP;
        regen++;
      }
    }
  } else if (destroyedTentacles >= 4 && sp.phase < 2) {
    sp.phase = 2;
    s.bossPhase = 2;
  }

  // Per-frame state — NO phase-based invulnerability
  // Eye and body take damage in ALL phases. Invulnerability is ONLY
  // from the 1-second phaseTransitionTimer in engine.js.
  s.bossInvulnerable = false;
  sp.eyeOpen = true;

  // Tentacle sweep — sweeps HORIZONTALLY, reaches down from boss
  for (const t of sp.tentacles) {
    if (!t.alive) continue;
    // Horizontal sweep: tentacles sway left-right across screen
    const sweepSpeed = sp.phase >= 4 ? 0.025 : 0.02;
    const sway = Math.sin(s.bossTimer * sweepSpeed + t.swayOffset) * 0.3;
    t.currentAngle = t.baseAngle + sway;

    // Tentacle tip position
    const tipX = s.bossX + Math.cos(t.currentAngle) * t.length;
    const tipY = s.bossY + Math.sin(t.currentAngle) * t.length;

    // Check player collision with tentacle (simplified as tip check)
    const dx = tipX - s.playerX;
    const dy = tipY - s.playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      s.tentacleHitPlayer = true;
    }
  }

  // Gravity beam (phase 2 and 4) — HORIZONTAL pull only, never vertical
  if ((sp.phase === 2 || sp.phase === 4) && s.bossTimer % 300 < 180) {
    sp.gravityBeam = true;
    const pullStrength = sp.phase === 4 ? 0.03 : 0.02;
    // Pull player HORIZONTALLY toward beam center X only
    s.gravityPullX = (s.bossX - s.playerX) * pullStrength;
    // NEVER pull player vertically
    s.gravityPullY = 0;
  } else {
    sp.gravityBeam = false;
    s.gravityPullX = 0;
    s.gravityPullY = 0;
  }

  // Mini creatures (phase 2+)
  if (sp.phase >= 2 && s.bossTimer % 180 === 0) {
    const count = sp.phase >= 4 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      sp.miniCreatures.push({
        x: s.bossX + (Math.random() - 0.5) * 60,
        y: s.bossY + 30,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random(),
        hp: 1,
      });
    }
  }

  // Update mini creatures
  for (let i = sp.miniCreatures.length - 1; i >= 0; i--) {
    const mc = sp.miniCreatures[i];
    mc.x += mc.vx; mc.y += mc.vy;
    if (mc.y > CANVAS_H + 20) { sp.miniCreatures.splice(i, 1); continue; }
    const dx = mc.x - s.playerX;
    const dy = mc.y - s.playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 14) {
      s.miniCreatureHitPlayer = true;
      sp.miniCreatures.splice(i, 1);
    }
  }

  // Phase 4: all tentacles attack simultaneously (faster sway)
  if (sp.phase === 4) {
    for (const t of sp.tentacles) {
      if (t.alive) t.swayOffset += 0.005;
    }
  }

  return s;
}
