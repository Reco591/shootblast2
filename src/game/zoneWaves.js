// ─── ZONE-SPECIFIC ENEMY WAVE POOLS ───
// Each planet zone has a unique enemy composition and meteor style.

export const ZONE_ENEMY_POOLS = {
  inner: {
    enemies: ["viper"],
    weights: [100],
    meteorStyle: "normal",
  },
  mercury: {
    enemies: ["viper", "kamikaze"],
    weights: [60, 40],
    meteorStyle: "fire",
    description: "Solar fire zone",
  },
  venus: {
    enemies: ["viper", "gnat", "warper"],
    weights: [30, 50, 20],
    meteorStyle: "toxic",
    description: "Toxic atmosphere",
  },
  earth: {
    enemies: ["viper", "sniper", "bomber"],
    weights: [40, 30, 30],
    meteorStyle: "normal",
    description: "Orbital defense grid",
  },
  mars: {
    enemies: ["bomber", "tank", "kamikaze"],
    weights: [40, 30, 30],
    meteorStyle: "rust",
    description: "Iron warlords",
  },
  asteroid: {
    enemies: ["gnat", "splitter", "minelayer"],
    weights: [40, 40, 20],
    meteorStyle: "dense",
    description: "Asteroid field",
    meteorMultiplier: 1.8,
  },
  jupiter: {
    enemies: ["warper", "dasher", "elite"],
    weights: [30, 40, 30],
    meteorStyle: "electric",
    description: "Electrical storms",
  },
  saturn: {
    enemies: ["elite", "summoner", "dasher"],
    weights: [30, 40, 30],
    meteorStyle: "golden",
    description: "Ring fragments",
  },
  uranus: {
    enemies: ["phantom", "sniper", "tank"],
    weights: [40, 30, 30],
    meteorStyle: "ice",
    description: "Cryogenic zone",
  },
  neptune: {
    enemies: ["phantom", "summoner", "warper", "elite"],
    weights: [30, 30, 20, 20],
    meteorStyle: "dark",
    description: "Deep pressure",
  },
  kuiper: {
    enemies: ["splitter", "minelayer", "bomber", "carrier"],
    weights: [30, 30, 20, 20],
    meteorStyle: "frozen",
    description: "Kuiper debris",
  },
  deep: {
    enemies: ["phantom", "elite", "summoner", "carrier", "dasher"],
    weights: [25, 25, 20, 15, 15],
    meteorStyle: "void",
    description: "Beyond the system",
    meteorMultiplier: 1.3,
  },
};

export function getCurrentZoneWaves(distance) {
  if (distance < 30_000_000)     return ZONE_ENEMY_POOLS.inner;
  if (distance < 80_000_000)     return ZONE_ENEMY_POOLS.mercury;
  if (distance < 120_000_000)    return ZONE_ENEMY_POOLS.venus;
  if (distance < 180_000_000)    return ZONE_ENEMY_POOLS.earth;
  if (distance < 350_000_000)    return ZONE_ENEMY_POOLS.mars;
  if (distance < 600_000_000)    return ZONE_ENEMY_POOLS.asteroid;
  if (distance < 1_100_000_000)  return ZONE_ENEMY_POOLS.jupiter;
  if (distance < 2_200_000_000)  return ZONE_ENEMY_POOLS.saturn;
  if (distance < 3_800_000_000)  return ZONE_ENEMY_POOLS.uranus;
  if (distance < 6_000_000_000)  return ZONE_ENEMY_POOLS.neptune;
  if (distance < 12_000_000_000) return ZONE_ENEMY_POOLS.kuiper;
  return ZONE_ENEMY_POOLS.deep;
}

export function pickEnemyFromZone(zone) {
  const total = zone.weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < zone.enemies.length; i++) {
    r -= zone.weights[i];
    if (r <= 0) return zone.enemies[i];
  }
  return zone.enemies[0];
}
