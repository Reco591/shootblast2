export const MAX_WEAPON_LEVEL = 19; // 0-indexed, 20 levels total

function generateLevels(base, increments, count = 20) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    levels.push({
      dmg: Math.round((base.dmg + increments.dmg * i) * 100) / 100,
      fireRate: Math.round(base.fireRate - increments.fireRate * i),
      bullets: base.bullets + Math.floor(increments.bullets * i),
      speed: Math.round((base.speed + increments.speed * i) * 10) / 10,
      size: Math.round((base.size + increments.size * i) * 10) / 10,
      ...(base.spread !== undefined && { spread: Math.round(base.spread + increments.spread * i) }),
      ...(base.homing && { homing: true, turnRate: Math.round((base.turnRate + increments.turnRate * i) * 10) / 10 }),
      ...(base.chains !== undefined && {
        chains: Math.floor(base.chains + increments.chains * i),
        chainRange: Math.round(base.chainRange + increments.chainRange * i),
      }),
    });
  }
  return levels;
}

function generateUpgradeCosts(basePrice, count = 20) {
  const costs = [basePrice];
  for (let i = 1; i < count; i++) {
    costs.push(Math.round((80 + i * 40 + i * i * 8) / 10) * 10);
  }
  return costs;
}

export const WEAPONS = [
  {
    id: "blaster",
    name: "STANDARD BLASTER",
    desc: "Reliable single shot",
    color: "#00aaff",
    price: 0,
    levels: generateLevels(
      { dmg: 1, fireRate: 160, bullets: 1, speed: 7, size: 2.5 },
      { dmg: 0.15, fireRate: 3.5, bullets: 0, speed: 0.2, size: 0.15 }
    ),
    upgradeCosts: generateUpgradeCosts(0),
  },
  {
    id: "rapid",
    name: "PULSE CANNON",
    desc: "Fast fire rate, light damage",
    color: "#ffaa00",
    price: 600,
    levels: generateLevels(
      { dmg: 1, fireRate: 90, bullets: 1, speed: 9, size: 2 },
      { dmg: 0.1, fireRate: 2.5, bullets: 0.06, speed: 0.2, size: 0.05 }
    ),
    upgradeCosts: generateUpgradeCosts(600),
  },
  {
    id: "spread",
    name: "SCATTER GUN",
    desc: "Wide spread, covers more area",
    color: "#00dd88",
    price: 800,
    levels: generateLevels(
      { dmg: 1, fireRate: 210, bullets: 3, speed: 6.5, size: 2.5, spread: 14 },
      { dmg: 0.08, fireRate: 4, bullets: 0.22, speed: 0.12, size: 0.08, spread: 0.9 }
    ),
    upgradeCosts: generateUpgradeCosts(800),
  },
  {
    id: "plasma",
    name: "PLASMA CANNON",
    desc: "Slow but devastating hits",
    color: "#aa55ff",
    price: 1200,
    levels: generateLevels(
      { dmg: 3, fireRate: 420, bullets: 1, speed: 4.5, size: 7 },
      { dmg: 0.45, fireRate: 7, bullets: 0, speed: 0.15, size: 0.3 }
    ),
    upgradeCosts: generateUpgradeCosts(1200),
  },
  {
    id: "lightning",
    name: "LIGHTNING CHAIN",
    desc: "Strikes one target, jumps to nearby enemies",
    color: "#88ddff",
    price: 2000,
    levels: generateLevels(
      { dmg: 2, fireRate: 180, bullets: 1, speed: 12, size: 4, chains: 2, chainRange: 80 },
      { dmg: 0.2, fireRate: 4, bullets: 0, speed: 0.15, size: 0.1, chains: 0.15, chainRange: 3 }
      // chains: 2→4 over 20 levels, chainRange: 80→137
    ),
    upgradeCosts: generateUpgradeCosts(2000),
  },
  {
    id: "homing",
    name: "SEEKER MISSILES",
    desc: "Tracks nearest target",
    color: "#ff8800",
    price: 3000,
    levels: generateLevels(
      { dmg: 2, fireRate: 520, bullets: 1, speed: 3.5, size: 4.5, homing: true, turnRate: 1.8 },
      { dmg: 0.3, fireRate: 12, bullets: 0.11, speed: 0.12, size: 0.1, turnRate: 0.1 }
    ),
    upgradeCosts: generateUpgradeCosts(3000),
  },
];

export function getWeapon(id) {
  return WEAPONS.find(w => w.id === id) || WEAPONS[0];
}
