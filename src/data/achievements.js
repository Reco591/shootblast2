export const ACHIEVEMENT_CATEGORIES = [
  { id: "kills",       name: "DESTROYER",     icon: "crosshair", color: "#ff5544" },
  { id: "distance",    name: "EXPLORER",      icon: "compass",   color: "#00aaff" },
  { id: "combo",       name: "COMBO MASTER",  icon: "zap",       color: "#aa55ff" },
  { id: "boss",        name: "BOSS HUNTER",   icon: "skull",     color: "#ff44aa" },
  { id: "weapons",     name: "ARMORY",        icon: "swords",    color: "#ffaa00" },
  { id: "skins",       name: "COLLECTOR",     icon: "rocket",    color: "#00ddaa" },
  { id: "drones",      name: "DRONE PILOT",   icon: "bot",       color: "#88ddff" },
  { id: "pilots",      name: "PILOT CORPS",   icon: "user",      color: "#ddcc44" },
  { id: "powerups",    name: "POWER USER",    icon: "sparkles",  color: "#ff8866" },
  { id: "challenges",  name: "DAREDEVIL",     icon: "flame",     color: "#ff3300" },
];

export const ACHIEVEMENTS = [
  // === KILLS ===
  { id: "kill_10",      cat: "kills", name: "First Blood",      desc: "Destroy 10 enemies",       target: 10,       reward: 50 },
  { id: "kill_100",     cat: "kills", name: "Marksman",         desc: "Destroy 100 enemies",      target: 100,      reward: 200 },
  { id: "kill_500",     cat: "kills", name: "Sharpshooter",     desc: "Destroy 500 enemies",      target: 500,      reward: 500 },
  { id: "kill_2k",      cat: "kills", name: "Veteran",          desc: "Destroy 2,000 enemies",    target: 2000,     reward: 1500 },
  { id: "kill_10k",     cat: "kills", name: "Annihilator",      desc: "Destroy 10,000 enemies",   target: 10000,    reward: 5000 },
  { id: "kill_50k",     cat: "kills", name: "Genocide",         desc: "Destroy 50,000 enemies",   target: 50000,    reward: 25000 },

  // === DISTANCE ===
  { id: "dist_mercury", cat: "distance", name: "Mercury Reached",   desc: "Travel 30M km",           target: 30_000_000,    reward: 100 },
  { id: "dist_venus",   cat: "distance", name: "Venus Visitor",     desc: "Travel 80M km",           target: 80_000_000,    reward: 250 },
  { id: "dist_earth",   cat: "distance", name: "Earth Defender",    desc: "Travel 120M km",          target: 120_000_000,   reward: 400 },
  { id: "dist_mars",    cat: "distance", name: "Red Planet",        desc: "Travel 180M km",          target: 180_000_000,   reward: 600 },
  { id: "dist_belt",    cat: "distance", name: "Asteroid Crosser",  desc: "Cross asteroid belt",     target: 350_000_000,   reward: 1000 },
  { id: "dist_jupiter", cat: "distance", name: "Gas Giant",         desc: "Travel 600M km",          target: 600_000_000,   reward: 1500 },
  { id: "dist_saturn",  cat: "distance", name: "Ring Master",       desc: "Travel 1.1B km",          target: 1_100_000_000, reward: 2500 },
  { id: "dist_uranus",  cat: "distance", name: "Frozen Frontier",   desc: "Travel 2.2B km",          target: 2_200_000_000, reward: 4000 },
  { id: "dist_neptune", cat: "distance", name: "Deep Blue",         desc: "Travel 3.8B km",          target: 3_800_000_000, reward: 6000 },
  { id: "dist_kuiper",  cat: "distance", name: "Edge of System",    desc: "Travel 6B km",            target: 6_000_000_000, reward: 10000 },
  { id: "dist_deep",    cat: "distance", name: "Void Walker",       desc: "Travel 12B km",           target: 12_000_000_000,reward: 20000 },
  { id: "dist_legend",  cat: "distance", name: "Legend",            desc: "Travel 50B km",           target: 50_000_000_000,reward: 100000 },

  // === COMBO (tier achievements) ===
  { id: "tier_nice",          cat: "combo", name: "First Step",     desc: "Reach NICE tier (3x)",          target: 3,    reward: 50 },
  { id: "tier_good",          cat: "combo", name: "Warming Up",     desc: "Reach GOOD tier (5x)",          target: 5,    reward: 75 },
  { id: "tier_great",         cat: "combo", name: "Got the Touch",  desc: "Reach GREAT tier (8x)",         target: 8,    reward: 100 },
  { id: "tier_awesome",       cat: "combo", name: "In the Zone",    desc: "Reach AWESOME tier (12x)",      target: 12,   reward: 150 },
  { id: "tier_amazing",       cat: "combo", name: "Locked In",      desc: "Reach AMAZING tier (18x)",      target: 18,   reward: 200 },
  { id: "tier_incredible",    cat: "combo", name: "Heating Up",     desc: "Reach INCREDIBLE tier (25x)",   target: 25,   reward: 300 },
  { id: "tier_unstoppable",   cat: "combo", name: "Unstoppable",    desc: "Reach UNSTOPPABLE tier (35x)",  target: 35,   reward: 500 },
  { id: "tier_ferocious",     cat: "combo", name: "Ferocious",      desc: "Reach FEROCIOUS tier (50x)",    target: 50,   reward: 750 },
  { id: "tier_rampage",       cat: "combo", name: "Rampage",        desc: "Reach RAMPAGE tier (70x)",      target: 70,   reward: 1000 },
  { id: "tier_legendary",     cat: "combo", name: "Legendary",      desc: "Reach LEGENDARY tier (100x)",   target: 100,  reward: 1500 },
  { id: "tier_mythical",      cat: "combo", name: "Mythical",       desc: "Reach MYTHICAL tier (130x)",    target: 130,  reward: 2000 },
  { id: "tier_godlike",       cat: "combo", name: "Godlike",        desc: "Reach GODLIKE tier (170x)",     target: 170,  reward: 3000 },
  { id: "tier_divine",        cat: "combo", name: "Divine",         desc: "Reach DIVINE tier (220x)",      target: 220,  reward: 4000 },
  { id: "tier_transcendent",  cat: "combo", name: "Transcendent",   desc: "Reach TRANSCENDENT (280x)",     target: 280,  reward: 5000 },
  { id: "tier_ethereal",      cat: "combo", name: "Ethereal",       desc: "Reach ETHEREAL (350x)",         target: 350,  reward: 7500 },
  { id: "tier_ascended",      cat: "combo", name: "Ascended",       desc: "Reach ASCENDED (430x)",         target: 430,  reward: 10000 },
  { id: "tier_immortal",      cat: "combo", name: "Immortal",       desc: "Reach IMMORTAL (520x)",         target: 520,  reward: 15000 },
  { id: "tier_omnipotent",    cat: "combo", name: "Omnipotent",     desc: "Reach OMNIPOTENT (620x)",       target: 620,  reward: 20000 },
  { id: "tier_cosmic",        cat: "combo", name: "Cosmic",         desc: "Reach COSMIC (730x)",           target: 730,  reward: 30000 },
  { id: "tier_absolute",      cat: "combo", name: "Absolute",       desc: "Reach ABSOLUTE (850x)",         target: 850,  reward: 40000 },
  { id: "tier_infinite",      cat: "combo", name: "Infinite",       desc: "Reach INFINITE (1000x)",        target: 1000, reward: 75000 },
  { id: "tier_beyond",        cat: "combo", name: "Beyond Mortal",  desc: "Reach BEYOND (1500x)",          target: 1500, reward: 150000 },
  { id: "tier_eternal",       cat: "combo", name: "Eternal",        desc: "Reach ETERNAL (2000x)",         target: 2000, reward: 500000 },

  // === BOSSES ===
  { id: "boss_first",    cat: "boss", name: "First Hunt",       desc: "Defeat your first boss",             target: 1, reward: 200 },
  { id: "boss_sentinel", cat: "boss", name: "Sun Stopper",      desc: "Defeat Solar Sentinel",              target: 1, reward: 300, bossId: "solar_sentinel" },
  { id: "boss_wraith",   cat: "boss", name: "Acid Burned",      desc: "Defeat Acid Wraith",                 target: 1, reward: 400, bossId: "acid_wraith" },
  { id: "boss_fortress", cat: "boss", name: "Earth Saved",      desc: "Defeat Orbital Fortress",            target: 1, reward: 500, bossId: "orbital_fortress" },
  { id: "boss_colossus", cat: "boss", name: "Iron Wrecker",     desc: "Defeat Iron Colossus",               target: 1, reward: 700, bossId: "iron_colossus" },
  { id: "boss_titan",    cat: "boss", name: "Storm Slayer",     desc: "Defeat Storm Titan",                 target: 1, reward: 1000, bossId: "storm_titan" },
  { id: "boss_weaver",   cat: "boss", name: "Ring Breaker",     desc: "Defeat Ring Weaver",                 target: 1, reward: 1500, bossId: "ring_weaver" },
  { id: "boss_phantom",  cat: "boss", name: "Cryo Crusher",     desc: "Defeat Cryo Phantom",                target: 1, reward: 2000, bossId: "cryo_phantom" },
  { id: "boss_leviathan",cat: "boss", name: "Void Reaper",      desc: "Defeat Void Leviathan",              target: 1, reward: 3000, bossId: "void_leviathan" },
  { id: "boss_all",      cat: "boss", name: "Boss Hunter",      desc: "Defeat all 8 bosses",                target: 8, reward: 10000 },
  { id: "boss_all_run",  cat: "boss", name: "Untouchable",      desc: "Defeat all 8 bosses in one run",     target: 8, reward: 25000 },

  // === WEAPONS ===
  { id: "wpn_buy_1",    cat: "weapons", name: "Armory Open",       desc: "Buy your first weapon",     target: 1, reward: 100 },
  { id: "wpn_buy_all",  cat: "weapons", name: "Full Arsenal",      desc: "Own all 6 weapons",         target: 6, reward: 2000 },
  { id: "wpn_max_1",    cat: "weapons", name: "Maxed Out",         desc: "Max out a weapon",          target: 1, reward: 1500 },
  { id: "wpn_max_all",  cat: "weapons", name: "Master Gunner",     desc: "Max out all weapons",       target: 6, reward: 15000 },
  { id: "wpn_blast_1k", cat: "weapons", name: "Blaster Pro",       desc: "1000 kills with Blaster",   target: 1000, reward: 500, weaponId: "blaster" },
  { id: "wpn_plasma_1k",cat: "weapons", name: "Plasma Pro",        desc: "1000 kills with Plasma",    target: 1000, reward: 500, weaponId: "plasma" },

  // === SKINS ===
  { id: "skin_buy_1",   cat: "skins", name: "Style Upgrade",     desc: "Buy your first skin",       target: 1, reward: 100 },
  { id: "skin_5",       cat: "skins", name: "Collector",         desc: "Own 5 ship skins",          target: 5, reward: 1000 },
  { id: "skin_10",      cat: "skins", name: "Hangar Full",       desc: "Own 10 ship skins",         target: 10, reward: 5000 },
  { id: "skin_all",     cat: "skins", name: "Completionist",     desc: "Own all 13 ship skins",     target: 13, reward: 25000 },
  { id: "skin_mythic",  cat: "skins", name: "Mythic Pilot",      desc: "Own a Mythic skin",         target: 1, reward: 5000 },

  // === DRONES ===
  { id: "drone_first",  cat: "drones", name: "Wingman",            desc: "Buy your first drone",      target: 1, reward: 200 },
  { id: "drone_3",      cat: "drones", name: "Squadron Leader",    desc: "Own 3 drones",              target: 3, reward: 1500 },
  { id: "drone_all",    cat: "drones", name: "Drone Commander",    desc: "Own all 6 drones",          target: 6, reward: 10000 },

  // === PILOTS ===
  { id: "pilot_2",      cat: "pilots", name: "Crew Roster",        desc: "Unlock 2 pilots",           target: 2, reward: 500 },
  { id: "pilot_all",    cat: "pilots", name: "Pilot Corps",        desc: "Unlock all 4 pilots",       target: 4, reward: 5000 },
  { id: "ability_50",   cat: "pilots", name: "Ability Veteran",    desc: "Use abilities 50 times",    target: 50, reward: 1000 },

  // === POWER-UPS ===
  { id: "pu_first",     cat: "powerups", name: "Power Surge",       desc: "Collect first power-up",   target: 1, reward: 50 },
  { id: "pu_50",        cat: "powerups", name: "Power Hungry",      desc: "Collect 50 power-ups",     target: 50, reward: 500 },
  { id: "pu_500",       cat: "powerups", name: "Charged Up",        desc: "Collect 500 power-ups",    target: 500, reward: 5000 },
  { id: "pu_nuke_5",    cat: "powerups", name: "Demolition",        desc: "Use 5 nukes",              target: 5, reward: 800 },

  // === CHALLENGES ===
  { id: "ch_no_hit_5",  cat: "challenges", name: "Untouched",        desc: "Survive 5 waves no damage", target: 5,  reward: 1000 },
  { id: "ch_no_hit_10", cat: "challenges", name: "Ghost",             desc: "Survive 10 waves no damage",target: 10, reward: 5000 },
  { id: "ch_no_pu",     cat: "challenges", name: "Pure Skill",        desc: "Beat boss without power-ups", target: 1, reward: 2000 },
  { id: "ch_starter",   cat: "challenges", name: "Minimalist",        desc: "Reach 500M km with starter weapon", target: 500_000_000, reward: 3000 },
  { id: "ch_speed",     cat: "challenges", name: "Speed Demon",       desc: "Reach 100M km in 2 minutes", target: 1, reward: 1500 },
  { id: "ch_coins_1m",  cat: "challenges", name: "Millionaire",       desc: "Earn 1,000,000 total coins", target: 1_000_000, reward: 25000 },
];

// Old ID → new ID mapping for migration
export const ACHIEVEMENT_MIGRATION = {
  "kill_1": "kill_10",
  "kill_50": "kill_100",
  "kill_500": "kill_500",
  "kill_2000": "kill_2k",
  "dist_mercury": "dist_mercury",
  "dist_mars": "dist_mars",
  "dist_jupiter": "dist_jupiter",
  "dist_total_1b": "dist_saturn",
  "combo_5": "tier_good",
  "combo_10": "tier_awesome",
  "combo_25": "tier_incredible",
  "combo_50": "tier_ferocious",
  "combo_100": "tier_legendary",
  "boss_first": "boss_first",
  "boss_all": "boss_all",
  "skins_3": "skin_5",
  "skins_all": "skin_all",
  "coins_1000": null,
  "coins_10000": null,
  "wave_5": null,
  "wave_10": null,
  "wave_20": null,
  "games_10": null,
  "games_50": null,
  "games_100": null,
};

export function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(catId) {
  return ACHIEVEMENTS.filter(a => a.cat === catId);
}

export function getCategory(catId) {
  return ACHIEVEMENT_CATEGORIES.find(c => c.id === catId);
}

// Check all achievements against current progress data
export function checkAllAchievements(data) {
  const unlocked = data.achievements?.unlocked || [];
  const progress = data.achievements?.progress || {};
  const newlyUnlocked = [];

  ACHIEVEMENTS.forEach(ach => {
    if (unlocked.includes(ach.id)) return;
    const value = progress[ach.id] || 0;
    if (value >= ach.target) {
      newlyUnlocked.push(ach);
    }
  });

  return newlyUnlocked;
}
