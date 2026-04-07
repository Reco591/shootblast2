import { CANVAS_W } from "./constants.js";

// ─── MAIN DRAW DISPATCHERS ───

export function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    switch (e.type) {
      case "viper":         drawViper(ctx, e, state.frame);         break;
      case "gnat":          drawGnat(ctx, e, state.frame);          break;
      case "warper":        drawWarper(ctx, e, state.frame);        break;
      case "bomber":        drawBomber(ctx, e, state.frame);        break;
      case "elite":         drawElite(ctx, e, state.frame);         break;
      case "carrier":       drawCarrier(ctx, e, state.frame);       break;
      case "mine":          drawMine(ctx, e, state.frame);          break;
      case "sniper":        drawSniper(ctx, e, state);              break;
      case "kamikaze":      drawKamikaze(ctx, e, state.frame);      break;
      case "tank":          drawTank(ctx, e, state.frame);          break;
      case "minelayer":     drawMinelayer(ctx, e, state.frame);     break;
      case "splitter":      drawSplitter(ctx, e, state.frame);      break;
      case "splitter_child":drawSplitterChild(ctx, e, state.frame); break;
      case "dasher":        drawDasher(ctx, e, state.frame);        break;
      case "summoner":      drawSummoner(ctx, e, state.frame);      break;
      case "phantom":       drawPhantom(ctx, e, state.frame);       break;
    }
    // HP bar for multi-hp enemies
    if (e.maxHp > 1 && e.type !== "mine") {
      const hpRatio = e.hp / e.maxHp;
      const barW = e.hitRadius * 1.2;
      ctx.fillStyle = hpRatio > 0.5 ? "rgba(0,255,100,0.5)" : "rgba(255,100,0,0.6)";
      ctx.fillRect(-barW / 2, e.hitRadius + 6, barW * hpRatio, 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-barW / 2, e.hitRadius + 6, barW, 2);
    }
    ctx.restore();

    // Sniper laser sight (drawn in world space)
    if (e.type === "sniper" && e.enteredScreen && e.aimX !== undefined) {
      ctx.save();
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.15 + (e.aimTimer / 120) * 0.25;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.aimX, e.aimY);
      ctx.stroke();
      // Dot at aim point
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = 0.3 + (e.aimTimer / 120) * 0.4;
      ctx.beginPath();
      ctx.arc(e.aimX, e.aimY, 2 + (e.aimTimer / 120) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Warper afterimage at previous position
    if (e.type === "warper" && e.afterimageAlpha > 0) {
      ctx.save();
      ctx.translate(e.prevX, e.prevY);
      ctx.globalAlpha = e.afterimageAlpha;
      drawWarperDiamond(ctx, 18);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

export function drawEnemyProjectiles(ctx, state) {
  for (const p of state.enemyProjectiles) {
    ctx.save();
    if (p.isRect) {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x - (p.w || 4) / 2, p.y - (p.h || 6) / 2, p.w || 4, p.h || 6);
    } else {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius || 3, 0, Math.PI * 2);
      ctx.fill();
      // Inner bright core
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.radius || 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ─── VIPER — TIE-class scout ───

function drawViper(ctx, e, frame) {
  const scale = 0.55;
  ctx.scale(scale, scale);

  // Left wing panel
  drawHexWing(ctx, -38, 0);
  // Right wing panel
  drawHexWing(ctx, 38, 0);

  // Connecting pylons
  ctx.fillStyle = "#331010";
  ctx.strokeStyle = "#772020";
  ctx.lineWidth = 1;
  ctx.fillRect(-22, -4, 10, 8);
  ctx.strokeRect(-22, -4, 10, 8);
  ctx.fillRect(12, -4, 10, 8);
  ctx.strokeRect(12, -4, 10, 8);

  // Cockpit sphere layers
  // Outer
  ctx.fillStyle = "#1a0808";
  ctx.strokeStyle = "#993030";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Inner
  ctx.fillStyle = "#220e0e";
  ctx.strokeStyle = "#772222";
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Viewport
  ctx.fillStyle = "#0e0404";
  ctx.strokeStyle = "#aa3838";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Inner viewport
  ctx.fillStyle = "#180808";
  ctx.strokeStyle = "#883030";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Highlight
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#cc4040";
  ctx.beginPath(); ctx.ellipse(0, -1, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Crosshair
  ctx.strokeStyle = "#662020";
  ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();

  // Rear engine
  ctx.fillStyle = "#330808";
  ctx.beginPath(); ctx.ellipse(0, 20, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#882020";
  ctx.beginPath(); ctx.ellipse(0, 20, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHexWing(ctx, cx, cy) {
  const hw = 15, hh = 35;
  // Outer hex
  ctx.fillStyle = "#1a0808";
  ctx.strokeStyle = "#882222";
  ctx.lineWidth = 1.2;
  drawHex(ctx, cx, cy, hw, hh);
  ctx.fill(); ctx.stroke();

  // Inner hex
  ctx.fillStyle = "#220c0c";
  ctx.strokeStyle = "#661818";
  ctx.lineWidth = 0.5;
  drawHex(ctx, cx, cy, hw * 0.75, hh * 0.8);
  ctx.fill(); ctx.stroke();

  // Solar panel lines (7 horizontal)
  ctx.strokeStyle = "#551515";
  ctx.lineWidth = 0.4;
  for (let i = 0; i < 7; i++) {
    const yy = cy - hh * 0.7 + (hh * 1.4 / 6) * i;
    ctx.beginPath(); ctx.moveTo(cx - hw * 0.65, yy); ctx.lineTo(cx + hw * 0.65, yy); ctx.stroke();
  }
  // Vertical center line
  ctx.beginPath(); ctx.moveTo(cx, cy - hh * 0.7); ctx.lineTo(cx, cy + hh * 0.7); ctx.stroke();
}

function drawHex(ctx, cx, cy, hw, hh) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy - hh * 0.5);
  ctx.lineTo(cx + hw, cy + hh * 0.5);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy + hh * 0.5);
  ctx.lineTo(cx - hw, cy - hh * 0.5);
  ctx.closePath();
}

// ─── GNAT — swarm drone ───

function drawGnat(ctx, e, frame) {
  const r = e.isLeader ? 10 : 8;

  // Faint glow
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = "#00cc88";
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Outer hex
  ctx.fillStyle = "#0a3328";
  ctx.strokeStyle = "#00cc88";
  ctx.lineWidth = 0.7;
  drawRegularPoly(ctx, 0, 0, r, 6);
  ctx.fill(); ctx.stroke();

  // Inner hex
  ctx.fillStyle = "#0d4435";
  ctx.strokeStyle = "#00aa77";
  ctx.lineWidth = 0.5;
  drawRegularPoly(ctx, 0, 0, r * 0.65, 6);
  ctx.fill(); ctx.stroke();

  // Core light
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#00ffaa";
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#aaffdd";
  ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Wing lines from corners
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 / 6) * (i * 1.5) + Math.PI / 6;
    const innerR = r;
    const outerR = r + 5 + Math.random() * 2;
    ctx.strokeStyle = "#00cc88";
    ctx.lineWidth = 0.6 + Math.random() * 0.4;
    ctx.globalAlpha = 0.3 + Math.random() * 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawRegularPoly(ctx, cx, cy, r, sides) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ─── WARPER — interdimensional glitch ───

function drawWarper(ctx, e, frame) {
  // Portal rings
  ctx.strokeStyle = "#30ee20";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.12;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#50ff40";
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.08;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Diamond body layers
  drawWarperDiamond(ctx, 18);

  // Core eye — nested circles
  const eyeColors = [
    { r: 12, fill: "#30aa20", alpha: 0.35 },
    { r: 8,  fill: "#50dd30", alpha: 0.45 },
    { r: 5,  fill: "#80ff60", alpha: 0.55 },
    { r: 2.5, fill: "#ccffaa", alpha: 0.5 },
  ];
  for (const c of eyeColors) {
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = c.fill;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Glitch particles
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 / 7) * i + frame * 0.02;
    const dist = 15 + Math.sin(frame * 0.1 + i) * 8;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    const size = 3 + Math.random() * 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.random() * Math.PI);
    const colors = ["#50ff40", "#80ff60", "#40cc30"];
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.25 + Math.random() * 0.25;
    ctx.fillRect(-size / 2, -size / 2, size, size * 0.6);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Energy crackling
  ctx.strokeStyle = "#60ff40";
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + frame * 0.03;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    ctx.lineTo(Math.cos(a + 0.3) * 14, Math.sin(a + 0.3) * 14);
    ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWarperDiamond(ctx, size) {
  const layers = [
    { s: 1.0, fill: "#0a2208", stroke: "#40dd20", lw: 1.2 },
    { s: 0.75, fill: "#0e3010", stroke: "#30bb18", lw: 0.7 },
    { s: 0.55, fill: "#124418", stroke: "#40cc28", lw: 0.5 },
    { s: 0.35, fill: "#1a6620", stroke: null, lw: 0 },
  ];
  for (const l of layers) {
    const s = size * l.s;
    ctx.fillStyle = l.fill;
    ctx.globalAlpha = l.s < 0.4 ? 0.6 : 1;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    if (l.stroke) {
      ctx.strokeStyle = l.stroke;
      ctx.lineWidth = l.lw;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── BOMBER — sleek ordnance platform ───

function drawBomber(ctx, e, frame) {
  const scale = 0.5;
  ctx.scale(scale, scale);

  // Main fuselage (teardrop/oval)
  ctx.fillStyle = "#181830";
  ctx.strokeStyle = "#446688";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -65);
  ctx.bezierCurveTo(-35, -50, -35, 40, -20, 60);
  ctx.lineTo(20, 60);
  ctx.bezierCurveTo(35, 40, 35, -50, 0, -65);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Inner fuselage
  ctx.fillStyle = "#1e1e38";
  ctx.strokeStyle = "#334466";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -55);
  ctx.bezierCurveTo(-25, -40, -25, 35, -14, 50);
  ctx.lineTo(14, 50);
  ctx.bezierCurveTo(25, 35, 25, -40, 0, -55);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Hull panel lines
  ctx.strokeStyle = "#2a2a48";
  ctx.lineWidth = 0.35;
  for (let i = 0; i < 4; i++) {
    const yy = -40 + i * 25;
    ctx.beginPath();
    ctx.moveTo(-22, yy);
    ctx.quadraticCurveTo(0, yy - 5, 22, yy);
    ctx.stroke();
  }
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 10, -55);
    ctx.lineTo(i * 10, 55);
    ctx.stroke();
  }

  // Command bridge dome
  ctx.fillStyle = "#222245";
  ctx.strokeStyle = "#556688";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-12, -50);
  ctx.quadraticCurveTo(0, -65, 12, -50);
  ctx.lineTo(12, -42);
  ctx.lineTo(-12, -42);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Bridge windows
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = `rgba(85,153,221,${0.35 + i * 0.05})`;
    ctx.beginPath(); ctx.arc(i * 5, -48, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Antenna
  ctx.strokeStyle = "#556688";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(0, -68); ctx.stroke();
  ctx.fillStyle = "#5599dd";
  ctx.beginPath(); ctx.arc(0, -68, 1.5, 0, Math.PI * 2); ctx.fill();

  // Swept wing nacelles
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#141428";
    ctx.strokeStyle = "#3a4470";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(side * 28, -10);
    ctx.bezierCurveTo(side * 50, 0, side * 45, 30, side * 30, 40);
    ctx.lineTo(side * 25, 20);
    ctx.bezierCurveTo(side * 30, 10, side * 30, -5, side * 28, -10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Wing weapon mount
    ctx.fillStyle = "#0c0c1e";
    ctx.beginPath(); ctx.arc(side * 38, 15, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#4488cc";
    ctx.beginPath(); ctx.arc(side * 38, 15, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Engine nozzles (3)
  for (let i = -1; i <= 1; i++) {
    const ex = i * 14;
    const ey = 55;
    const rx = 10 + Math.abs(i) * 4;
    const ry = 5.5;
    ctx.fillStyle = "#101022";
    ctx.strokeStyle = "#335588";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.11;
    ctx.fillStyle = "#3366cc";
    ctx.beginPath(); ctx.ellipse(ex, ey, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Bomb bay
  ctx.fillStyle = "#08081a";
  const bayW = 14, bayH = 6;
  ctx.beginPath();
  roundedRect(ctx, -bayW / 2, 35, bayW, bayH, 3);
  ctx.fill();
}

// ─── MINE ───

function drawMine(ctx, e, frame) {
  const pulse = 1 + Math.sin(e.pulse) * 0.2;
  const urgency = e.timer / e.fuseTime;

  // Outer pulsing ring
  ctx.strokeStyle = "#dd8800";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4 + urgency * 0.4;
  ctx.beginPath(); ctx.arc(0, 0, 7 * pulse, 0, Math.PI * 2); ctx.stroke();

  // Body
  ctx.fillStyle = "#442200";
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();

  // Blinking core — blinks faster as fuse runs out
  const blinkRate = Math.max(3, 20 - Math.floor(urgency * 18));
  if (Math.floor(frame / blinkRate) % 2 === 0) {
    ctx.fillStyle = "#ff4400";
    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── ELITE — phantom hunter ───

function drawElite(ctx, e, frame) {
  // Shield bubble (if active)
  if (e.shieldHP > 0) {
    ctx.strokeStyle = "#8844dd";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.12;
    ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Outer glow
    ctx.globalAlpha = 0.025;
    ctx.fillStyle = "#7730cc";
    ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  const scale = 0.7;
  ctx.scale(scale, scale);

  // Main body — elongated pointed hexagon
  ctx.fillStyle = "#1a0a35";
  ctx.strokeStyle = "#7744cc";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -35);      // Nose
  ctx.lineTo(16, -15);
  ctx.lineTo(20, 10);
  ctx.lineTo(14, 28);
  ctx.lineTo(-14, 28);
  ctx.lineTo(-20, 10);
  ctx.lineTo(-16, -15);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Inner body
  ctx.fillStyle = "#220e45";
  ctx.strokeStyle = "#6633aa";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(12, -10);
  ctx.lineTo(15, 8);
  ctx.lineTo(10, 22);
  ctx.lineTo(-10, 22);
  ctx.lineTo(-15, 8);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Core fill
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#2a1255";
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(8, -5);
  ctx.lineTo(10, 5);
  ctx.lineTo(6, 15);
  ctx.lineTo(-6, 15);
  ctx.lineTo(-10, 5);
  ctx.lineTo(-8, -5);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Hull panel lines
  ctx.strokeStyle = "#6633aa";
  ctx.lineWidth = 0.35;
  for (const yy of [-10, 5, 18]) {
    ctx.beginPath(); ctx.moveTo(-16, yy); ctx.lineTo(16, yy); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 26); ctx.stroke();

  // Cockpit at nose
  ctx.fillStyle = "#100828";
  ctx.strokeStyle = "#9955ee";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(6, -22);
  ctx.lineTo(5, -15);
  ctx.lineTo(-5, -15);
  ctx.lineTo(-6, -22);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Cockpit inner
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#7744cc";
  ctx.fillRect(-3, -28, 6, 10);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#bb88ff";
  ctx.beginPath(); ctx.ellipse(0, -24, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Engine nacelles
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#180a30";
    ctx.strokeStyle = "#6633aa";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(side * 16, 15);
    ctx.lineTo(side * 22, 20);
    ctx.lineTo(side * 20, 30);
    ctx.lineTo(side * 14, 28);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Engine glow
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#9955ee";
    ctx.beginPath(); ctx.ellipse(side * 18, 28, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#bb88ff";
    ctx.beginPath(); ctx.ellipse(side * 18, 28, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Wing blade accents
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#7744cc";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-28, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, -8); ctx.lineTo(28, -2); ctx.stroke();
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-20, 12); ctx.lineTo(-30, 18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, 12); ctx.lineTo(30, 18); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ─── CARRIER — capital mothership ───

function drawCarrier(ctx, e, frame) {
  const scale = 0.45;
  ctx.scale(scale, scale);

  // Main hull — elongated diamond/wedge
  ctx.fillStyle = "#12122a";
  ctx.strokeStyle = "#3a4470";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -60);       // Nose
  ctx.bezierCurveTo(40, -55, 140, -20, 150, 0);
  ctx.bezierCurveTo(140, 20, 40, 55, 0, 60);
  ctx.bezierCurveTo(-40, 55, -140, 20, -150, 0);
  ctx.bezierCurveTo(-140, -20, -40, -55, 0, -60);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Inner hull
  ctx.fillStyle = "#181835";
  ctx.strokeStyle = "#2d3458";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -45);
  ctx.bezierCurveTo(30, -40, 110, -15, 120, 0);
  ctx.bezierCurveTo(110, 15, 30, 40, 0, 45);
  ctx.bezierCurveTo(-30, 40, -110, 15, -120, 0);
  ctx.bezierCurveTo(-110, -15, -30, -40, 0, -45);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Hull panel lines (horizontal)
  ctx.strokeStyle = "#252545";
  ctx.lineWidth = 0.35;
  for (const yy of [-30, -10, 10, 30]) {
    ctx.beginPath();
    ctx.moveTo(-120, yy);
    ctx.quadraticCurveTo(0, yy - 3, 120, yy);
    ctx.stroke();
  }
  // Vertical
  for (const xx of [-80, -40, 0, 40, 80]) {
    ctx.beginPath();
    ctx.moveTo(xx, -45);
    ctx.lineTo(xx, 45);
    ctx.stroke();
  }

  // Command superstructure
  ctx.fillStyle = "#1e1e40";
  ctx.strokeStyle = "#4a5580";
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-25, -48);
  ctx.quadraticCurveTo(0, -68, 25, -48);
  ctx.lineTo(25, -40);
  ctx.lineTo(-25, -40);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Bridge windows
  for (let i = -1; i <= 2; i++) {
    ctx.fillStyle = `rgba(85,153,221,${0.35 + i * 0.03})`;
    ctx.beginPath(); ctx.arc(i * 8 - 4, -50, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Antenna
  ctx.strokeStyle = "#4a5580";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(0, -75); ctx.stroke();
  ctx.fillStyle = "#5599dd";
  ctx.beginPath(); ctx.arc(0, -75, 1.5, 0, Math.PI * 2); ctx.fill();

  // Sensor domes
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#1a1a38";
    ctx.beginPath(); ctx.arc(side * 20, -50, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#5599dd";
    ctx.beginPath(); ctx.arc(side * 20, -50, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Engine thrusters (5 in arc at rear)
  for (let i = -2; i <= 2; i++) {
    const ex = i * 28;
    const ey = 50 + Math.abs(i) * 3;
    const rx = 13 - Math.abs(i);
    const ry = 5.5;
    ctx.fillStyle = "#0e0e22";
    ctx.strokeStyle = "#335580";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#3366cc";
    ctx.beginPath(); ctx.ellipse(ex, ey, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Hangar bay (ventral center)
  ctx.fillStyle = "#08081a";
  ctx.strokeStyle = "#2a4477";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  roundedRect(ctx, -20, 20, 40, 12, 4);
  ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#1a2a55";
  ctx.fillRect(-16, 23, 32, 6);
  ctx.globalAlpha = 1;

  // Weapon turrets (4)
  const turretPositions = [[-90, -8], [90, -8], [-60, 25], [60, 25]];
  for (const [tx, ty] of turretPositions) {
    ctx.fillStyle = "#141430";
    ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.19;
    ctx.fillStyle = "#5588cc";
    ctx.beginPath(); ctx.arc(tx, ty, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Docking lights (6)
  const lightPositions = [[-130, -5], [-110, -15], [-100, 15], [130, -5], [110, -15], [100, 15]];
  for (const [lx, ly] of lightPositions) {
    ctx.globalAlpha = 0.22 + Math.sin(frame * 0.05 + lx) * 0.08;
    ctx.fillStyle = "#5599dd";
    ctx.beginPath(); ctx.arc(lx, ly, 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── SNIPER — long-range precision ───

function drawSniper(ctx, e, state) {
  const scale = 0.6;
  ctx.scale(scale, scale);

  // Long thin fuselage
  ctx.fillStyle = "#0a2a0a";
  ctx.strokeStyle = "#1a5c1a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -45);
  ctx.lineTo(8, -20);
  ctx.lineTo(10, 30);
  ctx.lineTo(6, 40);
  ctx.lineTo(-6, 40);
  ctx.lineTo(-10, 30);
  ctx.lineTo(-8, -20);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Telescopic scope on top
  ctx.fillStyle = "#0e3a0e";
  ctx.strokeStyle = "#33aa33";
  ctx.lineWidth = 0.7;
  ctx.fillRect(-3, -55, 6, 20);
  ctx.strokeRect(-3, -55, 6, 20);
  // Lens
  ctx.fillStyle = "#ff2222";
  ctx.globalAlpha = 0.6 + (e.aimTimer / 120) * 0.4;
  ctx.beginPath(); ctx.arc(0, -55, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Side fins
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#0a2a0a";
    ctx.strokeStyle = "#1a5c1a";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(side * 10, 10);
    ctx.lineTo(side * 22, 25);
    ctx.lineTo(side * 18, 35);
    ctx.lineTo(side * 8, 30);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // Engine
  ctx.fillStyle = "#082008";
  ctx.beginPath(); ctx.ellipse(0, 38, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#33aa33";
  ctx.beginPath(); ctx.ellipse(0, 38, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── KAMIKAZE — explosive dive bomber ───

function drawKamikaze(ctx, e, frame) {
  const pulse = 1 + Math.sin(e.pulseTimer) * 0.15;
  const scale = 0.55;
  ctx.scale(scale, scale);

  // Pulsing red glow
  ctx.globalAlpha = 0.08 * pulse;
  ctx.fillStyle = "#ff2200";
  ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Angular body — no cockpit, warhead shape
  ctx.fillStyle = "#440000";
  ctx.strokeStyle = "#cc2200";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -30);   // Warhead tip
  ctx.lineTo(14, -10);
  ctx.lineTo(16, 15);
  ctx.lineTo(10, 25);
  ctx.lineTo(-10, 25);
  ctx.lineTo(-16, 15);
  ctx.lineTo(-14, -10);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Warhead markings
  ctx.strokeStyle = "#ff4422";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, 5); ctx.lineTo(8, 5); ctx.stroke();

  // Warhead nose glow
  ctx.fillStyle = "#ff4422";
  ctx.globalAlpha = 0.5 + pulse * 0.3;
  ctx.beginPath(); ctx.arc(0, -25, 5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Speed lines trailing behind
  if (e.locked) {
    ctx.strokeStyle = "#ff4422";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 3; i++) {
      const ox = (Math.random() - 0.5) * 16;
      ctx.beginPath();
      ctx.moveTo(ox, 25);
      ctx.lineTo(ox + (Math.random() - 0.5) * 4, 45 + Math.random() * 15);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── TANK — heavy armored ───

function drawTank(ctx, e, frame) {
  const scale = 0.55;
  ctx.scale(scale, scale);

  // Wide rectangular hull
  ctx.fillStyle = "#222218";
  ctx.strokeStyle = "#555544";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  roundedRect(ctx, -35, -30, 70, 60, 6);
  ctx.fill(); ctx.stroke();

  // Inner hull
  ctx.fillStyle = "#2a2a20";
  ctx.strokeStyle = "#444433";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  roundedRect(ctx, -28, -24, 56, 48, 4);
  ctx.fill(); ctx.stroke();

  // Tread patterns on sides
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#1a1a10";
    ctx.strokeStyle = "#444433";
    ctx.lineWidth = 0.6;
    ctx.fillRect(side * 30, -28, side * 12, 56);
    ctx.strokeRect(side * 30, -28, side * 12, 56);
    // Tread lines
    ctx.strokeStyle = "#333322";
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 8; i++) {
      const yy = -24 + i * 7;
      ctx.beginPath();
      ctx.moveTo(side * 30, yy);
      ctx.lineTo(side * 42, yy);
      ctx.stroke();
    }
  }

  // Front shield panel (glowing)
  ctx.fillStyle = "#334433";
  ctx.strokeStyle = "#88aa88";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(-25, -32, 50, 8);
  ctx.strokeRect(-25, -32, 50, 8);
  // Shield glow
  ctx.globalAlpha = 0.15 + Math.sin(frame * 0.05) * 0.08;
  ctx.fillStyle = "#66ff66";
  ctx.fillRect(-25, -32, 50, 8);
  ctx.globalAlpha = 1;

  // Top turret
  ctx.save();
  ctx.rotate(e.turretAngle || 0);
  ctx.fillStyle = "#333328";
  ctx.strokeStyle = "#666655";
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // Barrel
  ctx.fillStyle = "#444438";
  ctx.fillRect(-2, 0, 4, 18);
  ctx.strokeRect(-2, 0, 4, 18);
  ctx.restore();

  // Brown accent markings
  ctx.strokeStyle = "#887766";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-20, -15); ctx.lineTo(20, -15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(20, 10); ctx.stroke();
}

// ─── MINELAYER — cargo deployer ───

function drawMinelayer(ctx, e, frame) {
  const scale = 0.55;
  ctx.scale(scale, scale);

  // Box-shaped ship
  ctx.fillStyle = "#0a2830";
  ctx.strokeStyle = "#227788";
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundedRect(ctx, -22, -25, 44, 50, 5);
  ctx.fill(); ctx.stroke();

  // Inner panel
  ctx.fillStyle = "#0e3340";
  ctx.strokeStyle = "#1a5566";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  roundedRect(ctx, -16, -20, 32, 40, 3);
  ctx.fill(); ctx.stroke();

  // Cargo hold underneath (visible hatches)
  ctx.fillStyle = "#082228";
  ctx.strokeStyle = "#44bbcc";
  ctx.lineWidth = 0.6;
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    roundedRect(ctx, i * 4 - 5, 18, 10, 8, 2);
    ctx.fill(); ctx.stroke();
  }

  // Teal accent lights
  ctx.fillStyle = "#44bbcc";
  ctx.globalAlpha = 0.4 + Math.sin(frame * 0.08) * 0.2;
  ctx.beginPath(); ctx.arc(-12, -12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12, -12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Side engines
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#082228";
    ctx.beginPath(); ctx.ellipse(side * 20, 5, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#44bbcc";
    ctx.beginPath(); ctx.ellipse(side * 20, 5, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─── SPLITTER — crystalline entity ───

function drawSplitter(ctx, e, frame) {
  const pulse = 1 + Math.sin(e.pulseTimer || 0) * 0.1;
  const scale = 0.7;
  ctx.scale(scale, scale);

  // Outer glow
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath(); ctx.arc(0, 0, 35 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Crystalline shape (irregular polygon)
  ctx.fillStyle = "#3a2200";
  ctx.strokeStyle = "#cc8800";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(18, -14);
  ctx.lineTo(24, 8);
  ctx.lineTo(14, 24);
  ctx.lineTo(-8, 26);
  ctx.lineTo(-22, 10);
  ctx.lineTo(-20, -12);
  ctx.lineTo(-8, -24);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Crack lines showing it's about to split
  ctx.strokeStyle = "#ffaa00";
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.lineTo(2, 0); ctx.lineTo(-3, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(0, 3); ctx.lineTo(20, -2); ctx.stroke();
  ctx.globalAlpha = 1;

  // Inner glow
  ctx.fillStyle = "#ffaa00";
  ctx.globalAlpha = 0.25 * pulse;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#ffdd44";
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── SPLITTER CHILD — small crystal fragment ───

function drawSplitterChild(ctx, e, frame) {
  // Small crystal
  ctx.fillStyle = "#3a2200";
  ctx.strokeStyle = "#ffaa00";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, -3);
  ctx.lineTo(6, 8);
  ctx.lineTo(-6, 8);
  ctx.lineTo(-8, -3);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Core glow
  ctx.fillStyle = "#ffaa00";
  ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── DASHER — speed demon ───

function drawDasher(ctx, e, frame) {
  const scale = 0.6;
  ctx.scale(scale, scale);
  const isDashing = e.state === "dash";

  // Charge glow during pause
  if (!isDashing && e.chargeGlow > 0) {
    ctx.globalAlpha = e.chargeGlow * 0.15;
    ctx.fillStyle = "#00ffff";
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Sleek thin body
  ctx.fillStyle = "#0a2828";
  ctx.strokeStyle = "#00cccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(10, -10);
  ctx.lineTo(12, 15);
  ctx.lineTo(6, 28);
  ctx.lineTo(-6, 28);
  ctx.lineTo(-12, 15);
  ctx.lineTo(-10, -10);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Neon cyan highlights
  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(0, 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.globalAlpha = 1;

  // Core light
  ctx.fillStyle = "#00ffff";
  ctx.globalAlpha = isDashing ? 0.8 : 0.4;
  ctx.beginPath(); ctx.arc(0, -5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Speed trail when dashing
  if (isDashing) {
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 4; i++) {
      const oy = 10 + i * 8;
      const ox = -(e.dashDir || 1) * (5 + i * 6);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + (Math.random() - 0.5) * 4, oy + 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── SUMMONER — alien commander ───

function drawSummoner(ctx, e, frame) {
  const scale = 0.6;
  ctx.scale(scale, scale);

  // Orbiting energy circles
  ctx.strokeStyle = "#aa44ff";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < 3; i++) {
    const a = (e.orbAngle || 0) + (Math.PI * 2 / 3) * i;
    const ox = Math.cos(a) * 30;
    const oy = Math.sin(a) * 30;
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Dark purple alien ship body
  ctx.fillStyle = "#1a0a30";
  ctx.strokeStyle = "#6622aa";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.bezierCurveTo(20, -28, 28, -5, 25, 15);
  ctx.bezierCurveTo(22, 30, 8, 35, 0, 35);
  ctx.bezierCurveTo(-8, 35, -22, 30, -25, 15);
  ctx.bezierCurveTo(-28, -5, -20, -28, 0, -35);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Inner body
  ctx.fillStyle = "#220e40";
  ctx.strokeStyle = "#5518aa";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.bezierCurveTo(14, -18, 18, -2, 16, 10);
  ctx.bezierCurveTo(14, 22, 5, 25, 0, 25);
  ctx.bezierCurveTo(-5, 25, -14, 22, -16, 10);
  ctx.bezierCurveTo(-18, -2, -14, -18, 0, -25);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Glowing eye in center
  ctx.fillStyle = "#aa44ff";
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.arc(0, -2, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#dd88ff";
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(0, -2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.arc(0, -2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Summon flash indicator
  if (e.summonTimer < 30) {
    ctx.globalAlpha = (30 - e.summonTimer) / 30 * 0.3;
    ctx.fillStyle = "#aa44ff";
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─── PHANTOM — ghostly intruder ───

function drawPhantom(ctx, e, frame) {
  ctx.globalAlpha = e.alpha || 1;
  const scale = 0.6;
  ctx.scale(scale, scale);

  // Ghostly outline glow (always slightly visible)
  if (e.alpha < 0.5) {
    ctx.strokeStyle = "#888899";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(16, -10);
    ctx.lineTo(20, 15);
    ctx.lineTo(10, 28);
    ctx.lineTo(-10, 28);
    ctx.lineTo(-20, 15);
    ctx.lineTo(-16, -10);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = e.alpha || 1;
  }

  // Main body — ghostly white/gray
  ctx.fillStyle = "#2a2a35";
  ctx.strokeStyle = "#888899";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(16, -10);
  ctx.lineTo(20, 15);
  ctx.lineTo(10, 28);
  ctx.lineTo(-10, 28);
  ctx.lineTo(-20, 15);
  ctx.lineTo(-16, -10);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Inner shimmer
  ctx.fillStyle = "#3a3a48";
  ctx.strokeStyle = "#666677";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(11, -6);
  ctx.lineTo(14, 12);
  ctx.lineTo(7, 22);
  ctx.lineTo(-7, 22);
  ctx.lineTo(-14, 12);
  ctx.lineTo(-11, -6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eerie glowing core
  ctx.fillStyle = "#ccccdd";
  ctx.globalAlpha = (e.alpha || 1) * 0.5;
  ctx.beginPath(); ctx.arc(0, 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = (e.alpha || 1) * 0.3;
  ctx.beginPath(); ctx.arc(0, 2, 3, 0, Math.PI * 2); ctx.fill();

  // Ghostly wisps
  ctx.strokeStyle = "#aaaacc";
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = (e.alpha || 1) * 0.2;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI * 2 / 4) * i + frame * 0.015;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.lineTo(Math.cos(a + 0.5) * 20, Math.sin(a + 0.5) * 20);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

// ─── UTILITY ───

function roundedRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}
