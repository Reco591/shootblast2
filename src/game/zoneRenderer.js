import { CANVAS_W, CANVAS_H } from "./constants.js";
import { MILESTONES } from "../data/milestones.js";

// Zone-specific background rendering — each celestial zone has unique visuals

const ZONE_THEMES = [
  {
    // Default: near Sun
    name: "Solar Departure",
    maxDistance: 58_000_000,
    bgTop: "#120808",
    bgMid: "#0a0510",
    bgBot: "#020206",
    nebula: null,
    ambientHue: 30,       // warm orange
    ambientAlpha: 0.03,
    specialEffect: "solarFlares",
  },
  {
    name: "Inner Planets",
    maxDistance: 228_000_000,
    bgTop: "#080618",
    bgMid: "#060510",
    bgBot: "#020206",
    nebula: { hue: 220, alpha: 0.015 },
    ambientHue: 210,
    ambientAlpha: 0.01,
    specialEffect: null,
  },
  {
    name: "Asteroid Belt",
    maxDistance: 420_000_000,
    bgTop: "#0a0808",
    bgMid: "#080606",
    bgBot: "#030204",
    nebula: { hue: 35, alpha: 0.02 },
    ambientHue: 35,
    ambientAlpha: 0.02,
    specialEffect: "dustClouds",
  },
  {
    name: "Gas Giants",
    maxDistance: 1_400_000_000,
    bgTop: "#060818",
    bgMid: "#040612",
    bgBot: "#010208",
    nebula: { hue: 270, alpha: 0.02 },
    ambientHue: 270,
    ambientAlpha: 0.015,
    specialEffect: "gasWisps",
  },
  {
    name: "Ice Giants",
    maxDistance: 4_500_000_000,
    bgTop: "#061018",
    bgMid: "#040a14",
    bgBot: "#01040a",
    nebula: { hue: 190, alpha: 0.025 },
    ambientHue: 190,
    ambientAlpha: 0.02,
    specialEffect: "iceCrystals",
  },
  {
    name: "Kuiper Belt",
    maxDistance: 7_500_000_000,
    bgTop: "#080810",
    bgMid: "#050508",
    bgBot: "#020204",
    nebula: { hue: 280, alpha: 0.015 },
    ambientHue: 280,
    ambientAlpha: 0.015,
    specialEffect: "dustClouds",
  },
  {
    name: "Deep Space",
    maxDistance: Infinity,
    bgTop: "#030308",
    bgMid: "#020206",
    bgBot: "#010102",
    nebula: { hue: 320, alpha: 0.02 },
    ambientHue: 320,
    ambientAlpha: 0.02,
    specialEffect: "voidPulse",
  },
];

function getZoneTheme(distance) {
  for (const z of ZONE_THEMES) {
    if (distance < z.maxDistance) return z;
  }
  return ZONE_THEMES[ZONE_THEMES.length - 1];
}

export function getCurrentZoneName(distance) {
  return getZoneTheme(distance).name;
}

// Persistent ambient particles per zone
let ambientParticles = [];
let lastZoneName = "";

function resetAmbientParticles(zone) {
  ambientParticles = [];
  for (let i = 0; i < 20; i++) {
    ambientParticles.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
      alpha: Math.random() * 0.15 + 0.05,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

// Render zone-specific background (called BEFORE stars)
export function renderZoneBackground(ctx, state) {
  const zone = getZoneTheme(state.distance);
  const { frame } = state;

  // Reset ambient particles on zone change
  if (zone.name !== lastZoneName) {
    lastZoneName = zone.name;
    resetAmbientParticles(zone);
  }

  // Base gradient
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, zone.bgTop);
  bg.addColorStop(0.5, zone.bgMid);
  bg.addColorStop(1, zone.bgBot);
  ctx.fillStyle = bg;
  ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

  // Nebula layer
  if (zone.nebula) {
    const nebulaX = CANVAS_W * 0.3 + Math.sin(frame * 0.001) * 50;
    const nebulaY = CANVAS_H * 0.4 + Math.cos(frame * 0.0008) * 40;
    const ng = ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, CANVAS_H * 0.5);
    ng.addColorStop(0, `hsla(${zone.nebula.hue}, 50%, 30%, ${zone.nebula.alpha})`);
    ng.addColorStop(0.5, `hsla(${zone.nebula.hue}, 40%, 20%, ${zone.nebula.alpha * 0.5})`);
    ng.addColorStop(1, "transparent");
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Second smaller nebula
    const n2x = CANVAS_W * 0.7 + Math.cos(frame * 0.0012) * 30;
    const n2y = CANVAS_H * 0.6 + Math.sin(frame * 0.001) * 30;
    const ng2 = ctx.createRadialGradient(n2x, n2y, 0, n2x, n2y, CANVAS_H * 0.3);
    ng2.addColorStop(0, `hsla(${(zone.nebula.hue + 40) % 360}, 40%, 25%, ${zone.nebula.alpha * 0.6})`);
    ng2.addColorStop(1, "transparent");
    ctx.fillStyle = ng2;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Zone-specific special effects
  switch (zone.specialEffect) {
    case "solarFlares":
      renderSolarFlares(ctx, frame);
      break;
    case "dustClouds":
      renderDustClouds(ctx, frame, zone.ambientHue);
      break;
    case "gasWisps":
      renderGasWisps(ctx, frame);
      break;
    case "iceCrystals":
      renderIceCrystals(ctx, frame);
      break;
    case "voidPulse":
      renderVoidPulse(ctx, frame);
      break;
  }

  // Ambient floating particles
  const worldSpeed = state.worldSpeed || 1;
  for (const p of ambientParticles) {
    p.y += p.speed * worldSpeed;
    p.x += Math.sin(p.phase + frame * 0.01) * 0.3;
    if (p.y > CANVAS_H + 5) {
      p.y = -5;
      p.x = Math.random() * CANVAS_W;
    }
    ctx.globalAlpha = p.alpha * (0.7 + Math.sin(frame * 0.02 + p.phase) * 0.3);
    ctx.fillStyle = `hsl(${zone.ambientHue}, 40%, 60%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Special effect renderers ---

function renderSolarFlares(ctx, frame) {
  // Warm glow from top-left corner (the sun direction)
  const flareAlpha = 0.04 + Math.sin(frame * 0.005) * 0.015;
  const fg = ctx.createRadialGradient(-50, -50, 0, -50, -50, CANVAS_H * 0.6);
  fg.addColorStop(0, `rgba(255, 120, 20, ${flareAlpha})`);
  fg.addColorStop(0.4, `rgba(255, 80, 10, ${flareAlpha * 0.4})`);
  fg.addColorStop(1, "transparent");
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Lens flare streaks
  if (frame % 180 < 60) {
    const streakAlpha = Math.sin((frame % 180) * Math.PI / 60) * 0.03;
    ctx.globalAlpha = streakAlpha;
    ctx.strokeStyle = "#ff8844";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CANVAS_W * 0.6, CANVAS_H * 0.4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function renderDustClouds(ctx, frame, hue) {
  // Drifting dust patches
  for (let i = 0; i < 3; i++) {
    const x = (CANVAS_W * 0.3 * i + frame * 0.1) % (CANVAS_W + 200) - 100;
    const y = CANVAS_H * 0.3 + i * CANVAS_H * 0.2 + Math.sin(frame * 0.003 + i) * 30;
    const dg = ctx.createRadialGradient(x, y, 0, x, y, 80 + i * 20);
    dg.addColorStop(0, `hsla(${hue}, 30%, 25%, 0.03)`);
    dg.addColorStop(1, "transparent");
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

function renderGasWisps(ctx, frame) {
  // Swirling purple/blue wisps
  for (let i = 0; i < 2; i++) {
    const t = frame * 0.002 + i * 3;
    const x = CANVAS_W * 0.5 + Math.sin(t) * CANVAS_W * 0.3;
    const y = CANVAS_H * 0.5 + Math.cos(t * 0.7) * CANVAS_H * 0.3;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, 100);
    gg.addColorStop(0, `hsla(${260 + i * 30}, 50%, 30%, 0.025)`);
    gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

function renderIceCrystals(ctx, frame) {
  // Subtle sparkle points
  ctx.fillStyle = "rgba(150, 220, 255, 0.4)";
  for (let i = 0; i < 5; i++) {
    const phase = frame * 0.02 + i * 1.3;
    const visible = Math.sin(phase) > 0.7;
    if (visible) {
      const x = ((i * 97 + frame * 0.5) % CANVAS_W);
      const y = ((i * 143 + frame * 0.3) % CANVAS_H);
      const size = 1 + Math.sin(phase) * 0.5;
      ctx.globalAlpha = (Math.sin(phase) - 0.7) / 0.3 * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      // Cross sparkle
      ctx.strokeStyle = "rgba(150, 220, 255, 0.2)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function renderVoidPulse(ctx, frame) {
  // Deep space pulsing darkness with rare color flashes
  const pulse = Math.sin(frame * 0.003) * 0.5 + 0.5;
  const vg = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, 0,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.5
  );
  vg.addColorStop(0, `rgba(20, 0, 40, ${pulse * 0.04})`);
  vg.addColorStop(1, "transparent");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Rare distant color flash (every ~5 sec)
  if (frame % 300 < 15) {
    const flashAlpha = Math.sin((frame % 300) * Math.PI / 15) * 0.02;
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = `hsl(${(frame * 0.5) % 360}, 60%, 40%)`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
  }
}
