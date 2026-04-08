export const STATION_MODULES = [
  // === TIER 1 (always available) ===
  {
    id: "solar_array",
    name: "Solar Array",
    desc: "Collects solar energy and converts it to coins. Generates passive income while you're away.",
    type: "resource",
    icon: "sun",
    color: "#ffaa00",
    tier: 1,
    requires: [],
    levels: [
      { coinsPerHour: 80,   buildCost: 200,   buildTime: 30_000,    desc: "80 coins/hour" },
      { coinsPerHour: 200,  buildCost: 800,   buildTime: 180_000,   desc: "200 coins/hour" },
      { coinsPerHour: 500,  buildCost: 3000,  buildTime: 900_000,   desc: "500 coins/hour" },
      { coinsPerHour: 1200, buildCost: 10000, buildTime: 3600_000,  desc: "1,200 coins/hour" },
      { coinsPerHour: 3000, buildCost: 30000, buildTime: 14400_000, desc: "3,000 coins/hour" },
    ],
    maxStorage: 24,
  },
  {
    id: "command_center",
    name: "Command Center",
    desc: "The brain of your station. Each upgrade unlocks more building slots and enables advanced modules.",
    type: "core",
    icon: "command",
    color: "#00aaff",
    tier: 1,
    requires: [],
    levels: [
      { unlocksSlots: 1, buildCost: 500,   buildTime: 60_000,    desc: "Unlocks slot 3" },
      { unlocksSlots: 2, buildCost: 2000,  buildTime: 600_000,   desc: "Unlocks slot 4" },
      { unlocksSlots: 4, buildCost: 8000,  buildTime: 3600_000,  desc: "Unlocks slots 5 & 6" },
      { unlocksSlots: 6, buildCost: 25000, buildTime: 14400_000, desc: "Unlocks slots 7 & 8" },
    ],
  },

  // === TIER 2 (requires command center lv1 or solar array lv1) ===
  {
    id: "weapons_lab",
    name: "Weapons Lab",
    desc: "Research and unlock new weapons. Each level reveals a more powerful weapon and grants permanent damage bonus.",
    type: "production",
    icon: "swords",
    color: "#ff5544",
    tier: 2,
    requires: ["command_center:1"],
    levels: [
      { unlocksWeapon: "rapid",     dmgBuff: 0.05, buildCost: 1500,   buildTime: 300_000,    desc: "Unlocks Rapid Cannon, +5% damage" },
      { unlocksWeapon: "spread",    dmgBuff: 0.10, buildCost: 5000,   buildTime: 1800_000,   desc: "Unlocks Spread Gun, +10% damage" },
      { unlocksWeapon: "plasma",    dmgBuff: 0.15, buildCost: 15000,  buildTime: 7200_000,   desc: "Unlocks Plasma Cannon, +15% damage" },
      { unlocksWeapon: "lightning", dmgBuff: 0.25, buildCost: 40000,  buildTime: 21600_000,  desc: "Unlocks Lightning Chain, +25% damage" },
      { unlocksWeapon: "homing",    dmgBuff: 0.40, buildCost: 100000, buildTime: 43200_000,  desc: "Unlocks Homing Missiles, +40% damage" },
    ],
  },
  {
    id: "coin_refinery",
    name: "Coin Refinery",
    desc: "Processes raw materials into pure currency. Increases coins earned from every kill permanently.",
    type: "buff",
    icon: "coins",
    color: "#ffdd44",
    tier: 2,
    requires: ["solar_array:1"],
    levels: [
      { coinMult: 0.10, buildCost: 1000,  buildTime: 300_000,   desc: "+10% coins from kills" },
      { coinMult: 0.25, buildCost: 4000,  buildTime: 1800_000,  desc: "+25% coins from kills" },
      { coinMult: 0.50, buildCost: 15000, buildTime: 7200_000,  desc: "+50% coins from kills" },
      { coinMult: 1.00, buildCost: 50000, buildTime: 28800_000, desc: "+100% coins from kills" },
    ],
  },

  // === TIER 3 (requires weapons lab or command center lv2) ===
  {
    id: "shield_generator",
    name: "Shield Generator",
    desc: "Equips your ship with an emergency shield that activates at the start of every run.",
    type: "buff",
    icon: "shield",
    color: "#00aaff",
    tier: 3,
    requires: ["weapons_lab:1"],
    levels: [
      { startShield: 3,  buildCost: 3000,  buildTime: 1200_000,  desc: "3 second shield at run start" },
      { startShield: 6,  buildCost: 12000, buildTime: 5400_000,  desc: "6 second shield at run start" },
      { startShield: 12, buildCost: 40000, buildTime: 21600_000, desc: "12 second shield at run start" },
    ],
  },
  {
    id: "drone_bay",
    name: "Drone Bay",
    desc: "Constructs combat drones and unlocks drone slots. Required to purchase any drones from the hangar.",
    type: "production",
    icon: "bot",
    color: "#88ddff",
    tier: 3,
    requires: ["command_center:2"],
    levels: [
      { droneSlots: 1, droneDiscount: 0.10, buildCost: 5000,  buildTime: 1800_000,  desc: "1 drone slot, -10% drone prices" },
      { droneSlots: 2, droneDiscount: 0.20, buildCost: 20000, buildTime: 7200_000,  desc: "2 drone slots, -20% drone prices" },
      { droneSlots: 3, droneDiscount: 0.35, buildCost: 60000, buildTime: 21600_000, desc: "3 drone slots, -35% drone prices" },
    ],
  },

  // === TIER 4 (requires multiple) ===
  {
    id: "research_lab",
    name: "Research Lab",
    desc: "Advanced engineering facility. Discounts all weapon and module upgrades.",
    type: "buff",
    icon: "flask",
    color: "#ff44aa",
    tier: 4,
    requires: ["weapons_lab:2", "coin_refinery:1"],
    levels: [
      { upgradeDiscount: 0.15, buildCost: 8000,   buildTime: 3600_000,  desc: "-15% upgrade costs" },
      { upgradeDiscount: 0.30, buildCost: 30000,  buildTime: 14400_000, desc: "-30% upgrade costs" },
      { upgradeDiscount: 0.50, buildCost: 100000, buildTime: 43200_000, desc: "-50% upgrade costs" },
    ],
  },
  {
    id: "supply_depot",
    name: "Supply Depot",
    desc: "Stockpiles powerups and extends their duration in combat.",
    type: "buff",
    icon: "package",
    color: "#aa55ff",
    tier: 4,
    requires: ["solar_array:2", "command_center:2"],
    levels: [
      { powerupDuration: 0.25, startPowerups: 0, buildCost: 6000,  buildTime: 2700_000,  desc: "+25% powerup duration" },
      { powerupDuration: 0.50, startPowerups: 1, buildCost: 25000, buildTime: 10800_000, desc: "+50% duration, start with 1 powerup" },
      { powerupDuration: 1.00, startPowerups: 2, buildCost: 80000, buildTime: 36000_000, desc: "+100% duration, start with 2 powerups" },
    ],
  },

  // === TIER 5 (endgame) ===
  {
    id: "fortress_core",
    name: "Fortress Core",
    desc: "The pinnacle of station technology. Provides massive bonuses to damage, coins, and powerup duration.",
    type: "buff",
    icon: "fortress",
    color: "#ff00aa",
    tier: 5,
    requires: ["research_lab:1", "drone_bay:2"],
    levels: [
      { allStats: 0.15, buildCost: 50000,   buildTime: 14400_000, desc: "+15% to all stats" },
      { allStats: 0.30, buildCost: 200000,  buildTime: 43200_000, desc: "+30% to all stats" },
      { allStats: 0.50, buildCost: 1000000, buildTime: 86400_000, desc: "+50% to all stats" },
    ],
  },
];

export function getModule(id) {
  return STATION_MODULES.find(m => m.id === id);
}

// Check if a module's requirements are met
export function canBuild(moduleId, data) {
  const module = getModule(moduleId);
  if (!module) return false;

  return module.requires.every(req => {
    const [reqId, reqLevel] = req.split(":");
    const builtSlot = data.station.slots.find(slot =>
      slot && slot.moduleId === reqId && slot.level >= parseInt(reqLevel) - 1
      && Date.now() >= slot.buildEndsAt
    );
    return !!builtSlot;
  });
}

// Get required text for UI
export function getRequirementText(moduleId) {
  const module = getModule(moduleId);
  if (!module || module.requires.length === 0) return null;
  return module.requires.map(req => {
    const [reqId, reqLevel] = req.split(":");
    const reqModule = getModule(reqId);
    return `${reqModule.name} Lv${reqLevel}`;
  }).join(" + ");
}
