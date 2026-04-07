import { MILESTONES } from "./milestones.js";
import { generateDailyMissions, getDateSeedStr } from "./missions.js";
import { ACHIEVEMENTS, ACHIEVEMENT_MIGRATION, getAchievement, checkAllAchievements } from "./achievements.js";
import { claimDailyReward as claimDaily, checkDailyReward as checkDaily } from "./dailyReward.js";
import { SKINS } from "./skins.js";

const STORAGE_KEY = "shootblast_player";

const DEFAULT_DATA = {
  bestDistance: 0,
  coins: 0,
  ownedSkins: ["arc7"],
  equippedSkin: "arc7",
  totalGames: 0,
  totalKills: 0,
  totalDistance: 0,
  milestonesReached: [],

  // Settings
  soundEnabled: true,
  musicEnabled: true,
  soundVolume: 70,
  musicVolume: 50,
  vibrationEnabled: true,
  sensitivity: 1.0,

  // Additional stats
  totalCoinsEarned: 0,
  bestCombo: 0,
  bestWave: 0,
  totalPlayTime: 0,

  // Missions
  missions: [],
  missionDate: "",

  // Achievements v2
  achievements: {
    unlocked: [],
    progress: {},
    totalKills: 0,
    totalCoinsEarned: 0,
    totalPowerupsUsed: 0,
    totalAbilitiesUsed: 0,
    totalNukesUsed: 0,
    bossesDefeatedSet: [],
    weaponKills: {},
    noHitWavesRun: 0,
    bossesDefeatedThisRun: [],
  },

  // Legacy (kept for migration)
  unlockedAchievements: [],

  // Daily login
  lastClaimDate: "",
  loginStreak: 0,

  // Tutorial
  tutorialSeen: false,

  // Boss fights
  defeatedBosses: [],

  // Weapons
  equippedWeapon: "blaster",
  ownedWeapons: [{ id: "blaster", level: 0 }],

  // Pilots
  equippedPilot: "rebel",
  ownedPilots: ["rebel"],

  // Drones
  ownedDrones: [],
  equippedDrones: [],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA, achievements: { ...DEFAULT_DATA.achievements } };
    const parsed = JSON.parse(raw);
    const data = { ...DEFAULT_DATA, ...parsed };

    // Ensure achievements v2 object exists
    if (!data.achievements || !data.achievements.unlocked) {
      data.achievements = { ...DEFAULT_DATA.achievements };
    }

    let migrated = false;

    // Migration: laser → lightning
    if (data.equippedWeapon === "laser") {
      data.equippedWeapon = "lightning";
      migrated = true;
    }
    if (data.ownedWeapons.some(w => w.id === "laser")) {
      data.ownedWeapons = data.ownedWeapons.map(w =>
        w.id === "laser" ? { ...w, id: "lightning" } : w
      );
      migrated = true;
    }

    // Migration: sniper → artillery
    if (data.ownedDrones.includes("sniper")) {
      data.ownedDrones = data.ownedDrones.map(d => d === "sniper" ? "artillery" : d);
      migrated = true;
    }
    if (data.equippedDrones.some(d => d === "sniper")) {
      data.equippedDrones = data.equippedDrones.map(d => d === "sniper" ? "artillery" : d);
      migrated = true;
    }

    // Migration: old achievements v1 → v2
    if (data.unlockedAchievements && data.unlockedAchievements.length > 0 && data.achievements.unlocked.length === 0) {
      data.unlockedAchievements.forEach(oldId => {
        const newId = ACHIEVEMENT_MIGRATION[oldId];
        if (newId && !data.achievements.unlocked.includes(newId)) {
          data.achievements.unlocked.push(newId);
          const ach = getAchievement(newId);
          if (ach) data.achievements.progress[newId] = ach.target;
        }
      });

      // Seed progress from existing stats
      data.achievements.totalKills = data.totalKills || 0;
      data.achievements.totalCoinsEarned = data.totalCoinsEarned || 0;
      data.achievements.bossesDefeatedSet = [...(data.defeatedBosses || [])];

      // Seed progress values from stats so progress bars show correctly
      const tk = data.totalKills || 0;
      ["kill_10", "kill_100", "kill_500", "kill_2k", "kill_10k", "kill_50k"].forEach(id => {
        data.achievements.progress[id] = Math.max(data.achievements.progress[id] || 0, tk);
      });
      const td = data.totalDistance || 0;
      ["dist_mercury", "dist_venus", "dist_earth", "dist_mars", "dist_belt", "dist_jupiter",
       "dist_saturn", "dist_uranus", "dist_neptune", "dist_kuiper", "dist_deep", "dist_legend"].forEach(id => {
        data.achievements.progress[id] = Math.max(data.achievements.progress[id] || 0, td);
      });
      const bc = data.bestCombo || 0;
      ["tier_nice", "tier_good", "tier_great", "tier_awesome", "tier_amazing",
       "tier_incredible", "tier_unstoppable", "tier_ferocious", "tier_rampage",
       "tier_legendary", "tier_mythical", "tier_godlike", "tier_divine",
       "tier_transcendent", "tier_ethereal", "tier_ascended", "tier_immortal",
       "tier_omnipotent", "tier_cosmic", "tier_absolute", "tier_infinite",
       "tier_beyond", "tier_eternal"].forEach(id => {
        data.achievements.progress[id] = Math.max(data.achievements.progress[id] || 0, bc);
      });
      const bossCount = (data.defeatedBosses || []).length;
      data.achievements.progress["boss_first"] = Math.min(bossCount, 1);
      data.achievements.progress["boss_all"] = bossCount;
      (data.defeatedBosses || []).forEach(bId => {
        const bossAch = ACHIEVEMENTS.find(a => a.bossId === bId);
        if (bossAch) data.achievements.progress[bossAch.id] = 1;
      });
      const skinCount = (data.ownedSkins || []).length;
      data.achievements.progress["skin_buy_1"] = skinCount > 1 ? 1 : 0;
      data.achievements.progress["skin_5"] = skinCount;
      data.achievements.progress["skin_10"] = skinCount;
      data.achievements.progress["skin_all"] = skinCount;
      const wpnCount = (data.ownedWeapons || []).length;
      data.achievements.progress["wpn_buy_1"] = wpnCount > 1 ? 1 : 0;
      data.achievements.progress["wpn_buy_all"] = wpnCount;
      const droneCount = (data.ownedDrones || []).length;
      data.achievements.progress["drone_first"] = droneCount > 0 ? 1 : 0;
      data.achievements.progress["drone_3"] = droneCount;
      data.achievements.progress["drone_all"] = droneCount;
      const pilotCount = (data.ownedPilots || []).length;
      data.achievements.progress["pilot_2"] = pilotCount;
      data.achievements.progress["pilot_all"] = pilotCount;
      data.achievements.progress["ch_coins_1m"] = data.totalCoinsEarned || 0;

      // Check mythic skin
      const hasMythic = (data.ownedSkins || []).some(sId => {
        const sk = SKINS.find(s => s.id === sId);
        return sk && sk.tag === "MYTHIC";
      });
      if (hasMythic) data.achievements.progress["skin_mythic"] = 1;

      // Now check if any seeded progress unlocks new achievements
      const newUnlocks = checkAllAchievements(data);
      newUnlocks.forEach(ach => {
        if (!data.achievements.unlocked.includes(ach.id)) {
          data.achievements.unlocked.push(ach.id);
        }
      });

      data.unlockedAchievements = []; // clear old
      migrated = true;
    }

    if (migrated) saveData(data);
    return data;
  } catch {
    return { ...DEFAULT_DATA, achievements: { ...DEFAULT_DATA.achievements } };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPlayerData() {
  return loadData();
}

// Update a single achievement's progress and check for unlock
export function updateAchievementProgress(id, value) {
  const data = loadData();  // Always load fresh to avoid stale state
  if (data.achievements.unlocked.includes(id)) return { unlocked: false, data };

  // Take max of current progress and new value (never decrease)
  const currentProgress = data.achievements.progress[id] || 0;
  const newProgress = Math.max(currentProgress, value);
  data.achievements.progress[id] = newProgress;

  const ach = getAchievement(id);
  if (ach && newProgress >= ach.target) {
    data.achievements.unlocked.push(id);
    data.coins += ach.reward;
    data.totalCoinsEarned += ach.reward;
    data.achievements.totalCoinsEarned = data.totalCoinsEarned;
    saveData(data);
    return { unlocked: true, achievement: ach, data };
  }
  saveData(data);
  return { unlocked: false, data };
}

// Process all achievements (called after recordGame for batch check)
export function processAchievements() {
  const data = loadData();
  const newlyUnlocked = checkAllAchievements(data);

  if (newlyUnlocked.length === 0) return { data, newlyUnlocked: [] };

  newlyUnlocked.forEach(ach => {
    data.achievements.unlocked.push(ach.id);
    data.coins += ach.reward;
    data.totalCoinsEarned += ach.reward;
  });
  data.achievements.totalCoinsEarned = data.totalCoinsEarned;

  saveData(data);
  return { data, newlyUnlocked };
}

export function recordGame(distance, kills, wave, bestCombo, playTimeSeconds, powerupsCollected, noHitWaves, defeatedBosses, bossCoinsEarned, weaponId, nukesUsed, abilitiesUsed) {
  const data = loadData();
  const baseCoins = Math.floor(distance / 100_000);
  const bossCoins = bossCoinsEarned || 0;
  const coinsEarned = baseCoins + bossCoins;
  data.coins += coinsEarned;
  data.totalCoinsEarned += coinsEarned;

  // Merge defeated bosses
  if (defeatedBosses && defeatedBosses.length > 0) {
    data.defeatedBosses = [...new Set([...data.defeatedBosses, ...defeatedBosses])];
  }
  data.totalGames += 1;
  data.totalKills += kills;
  data.totalDistance += distance;
  data.totalPlayTime += playTimeSeconds;
  if (distance > data.bestDistance) data.bestDistance = distance;
  if (bestCombo > data.bestCombo) data.bestCombo = bestCombo;
  if (wave > data.bestWave) data.bestWave = wave;

  MILESTONES.forEach(m => {
    if (distance >= m.distance && !data.milestonesReached.includes(m.name)) {
      data.milestonesReached.push(m.name);
    }
  });

  // Update achievement progress from game stats
  const ach = data.achievements;
  ach.totalKills = data.totalKills;
  ach.totalCoinsEarned = data.totalCoinsEarned;

  // Kill achievements — use Math.max to never decrease progress
  ["kill_10", "kill_100", "kill_500", "kill_2k", "kill_10k", "kill_50k"].forEach(id => {
    ach.progress[id] = Math.max(ach.progress[id] || 0, data.totalKills);
  });

  // Distance achievements (use totalDistance)
  ["dist_mercury", "dist_venus", "dist_earth", "dist_mars", "dist_belt", "dist_jupiter",
   "dist_saturn", "dist_uranus", "dist_neptune", "dist_kuiper", "dist_deep", "dist_legend"].forEach(id => {
    ach.progress[id] = Math.max(ach.progress[id] || 0, data.totalDistance);
  });

  // Combo tier achievements (use best ever combo)
  ["tier_nice", "tier_good", "tier_great", "tier_awesome", "tier_amazing",
   "tier_incredible", "tier_unstoppable", "tier_ferocious", "tier_rampage",
   "tier_legendary", "tier_mythical", "tier_godlike", "tier_divine",
   "tier_transcendent", "tier_ethereal", "tier_ascended", "tier_immortal",
   "tier_omnipotent", "tier_cosmic", "tier_absolute", "tier_infinite",
   "tier_beyond", "tier_eternal"].forEach(id => {
    ach.progress[id] = Math.max(ach.progress[id] || 0, data.bestCombo);
  });

  // Boss achievements
  if (defeatedBosses && defeatedBosses.length > 0) {
    ach.bossesDefeatedSet = [...data.defeatedBosses];
    ach.progress["boss_first"] = Math.min(data.defeatedBosses.length, 1);
    ach.progress["boss_all"] = data.defeatedBosses.length;
    data.defeatedBosses.forEach(bId => {
      const bossAch = ACHIEVEMENTS.find(a => a.bossId === bId);
      if (bossAch) ach.progress[bossAch.id] = 1;
    });
    // Bosses in one run
    ach.bossesDefeatedThisRun = defeatedBosses;
    ach.progress["boss_all_run"] = Math.max(ach.progress["boss_all_run"] || 0, defeatedBosses.length);
  }

  // Power-ups
  if (powerupsCollected > 0) {
    ach.totalPowerupsUsed = (ach.totalPowerupsUsed || 0) + powerupsCollected;
    ach.progress["pu_first"] = Math.max(ach.progress["pu_first"] || 0, Math.min(ach.totalPowerupsUsed, 1));
    ach.progress["pu_50"] = Math.max(ach.progress["pu_50"] || 0, ach.totalPowerupsUsed);
    ach.progress["pu_500"] = Math.max(ach.progress["pu_500"] || 0, ach.totalPowerupsUsed);
  }

  // Abilities
  if (abilitiesUsed > 0) {
    ach.totalAbilitiesUsed = (ach.totalAbilitiesUsed || 0) + abilitiesUsed;
    ach.progress["ability_50"] = Math.max(ach.progress["ability_50"] || 0, ach.totalAbilitiesUsed);
  }

  // Nukes
  if (nukesUsed > 0) {
    ach.totalNukesUsed = (ach.totalNukesUsed || 0) + nukesUsed;
    ach.progress["pu_nuke_5"] = Math.max(ach.progress["pu_nuke_5"] || 0, ach.totalNukesUsed);
  }

  // No-hit waves
  if (noHitWaves > 0) {
    ach.noHitWavesRun = Math.max(ach.noHitWavesRun || 0, noHitWaves);
    ach.progress["ch_no_hit_5"] = Math.max(ach.progress["ch_no_hit_5"] || 0, ach.noHitWavesRun);
    ach.progress["ch_no_hit_10"] = Math.max(ach.progress["ch_no_hit_10"] || 0, ach.noHitWavesRun);
  }

  // Challenge: no power-ups boss defeat
  if (defeatedBosses && defeatedBosses.length > 0 && powerupsCollected === 0) {
    ach.progress["ch_no_pu"] = 1;
  }

  // Challenge: starter weapon distance
  if (weaponId === "blaster" && distance >= 500_000_000) {
    ach.progress["ch_starter"] = Math.max(ach.progress["ch_starter"] || 0, distance);
  }

  // Challenge: speed demon (100M km in 2 minutes)
  if (distance >= 100_000_000 && playTimeSeconds <= 120) {
    ach.progress["ch_speed"] = 1;
  }

  // Challenge: millionaire
  ach.progress["ch_coins_1m"] = Math.max(ach.progress["ch_coins_1m"] || 0, data.totalCoinsEarned);

  // Weapon kills tracking (per-weapon)
  if (weaponId && kills > 0) {
    ach.weaponKills = ach.weaponKills || {};
    ach.weaponKills[weaponId] = (ach.weaponKills[weaponId] || 0) + kills;
    // Check weapon-specific kill achievements
    ACHIEVEMENTS.filter(a => a.weaponId).forEach(a => {
      if (a.weaponId === weaponId) {
        ach.progress[a.id] = Math.max(ach.progress[a.id] || 0, ach.weaponKills[weaponId]);
      }
    });
  }

  saveData(data);

  // Check achievements after saving updated stats
  const achResult = processAchievements();

  // Update missions after saving base stats
  updateMissionProgress({
    distance, kills, wave, bestCombo,
    powerupsCollected: powerupsCollected || 0,
    noHitWaves: noHitWaves || 0,
  });

  return { ...achResult.data, coinsEarned, newlyUnlocked: achResult.newlyUnlocked };
}

export function updateSettings(key, value) {
  const data = loadData();
  data[key] = value;
  saveData(data);
  return data;
}

export function markTutorialSeen() {
  const data = loadData();
  data.tutorialSeen = true;
  saveData(data);
  return data;
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_DATA, achievements: { ...DEFAULT_DATA.achievements } };
}

export function buySkin(skinId, price) {
  const data = loadData();
  if (data.coins < price) return { success: false, data };
  if (data.ownedSkins.includes(skinId)) return { success: false, data };
  data.coins -= price;
  data.ownedSkins.push(skinId);
  data.equippedSkin = skinId;

  // Update skin achievement progress
  const skinCount = data.ownedSkins.length;
  data.achievements.progress["skin_buy_1"] = 1;
  data.achievements.progress["skin_5"] = skinCount;
  data.achievements.progress["skin_10"] = skinCount;
  data.achievements.progress["skin_all"] = skinCount;

  // Check mythic
  const sk = SKINS.find(s => s.id === skinId);
  if (sk && sk.tag === "MYTHIC") {
    data.achievements.progress["skin_mythic"] = 1;
  }

  saveData(data);

  const achResult = processAchievements();
  return { success: true, data: achResult.data, newlyUnlocked: achResult.newlyUnlocked };
}

export function buyWeapon(weaponId, price) {
  const data = loadData();
  if (data.coins < price) return { success: false, data };
  if (data.ownedWeapons.find(w => w.id === weaponId)) return { success: false, data };
  data.coins -= price;
  data.ownedWeapons.push({ id: weaponId, level: 0 });
  data.equippedWeapon = weaponId;

  // Update weapon achievement progress
  const wpnCount = data.ownedWeapons.length;
  data.achievements.progress["wpn_buy_1"] = 1;
  data.achievements.progress["wpn_buy_all"] = wpnCount;

  saveData(data);

  const achResult = processAchievements();
  return { success: true, data: achResult.data, newlyUnlocked: achResult.newlyUnlocked };
}

export function upgradeWeapon(weaponId, cost) {
  const data = loadData();
  if (data.coins < cost) return { success: false, data };
  const owned = data.ownedWeapons.find(w => w.id === weaponId);
  if (!owned || owned.level >= 19) return { success: false, data };
  data.coins -= cost;
  owned.level += 1;

  // Check weapon max achievements
  if (owned.level >= 19) {
    const maxedCount = data.ownedWeapons.filter(w => w.level >= 19).length;
    data.achievements.progress["wpn_max_1"] = maxedCount;
    data.achievements.progress["wpn_max_all"] = maxedCount;
  }

  saveData(data);

  const achResult = processAchievements();
  return { success: true, data: achResult.data, newlyUnlocked: achResult.newlyUnlocked };
}

export function equipWeapon(weaponId) {
  const data = loadData();
  if (!data.ownedWeapons.find(w => w.id === weaponId)) return data;
  data.equippedWeapon = weaponId;
  saveData(data);
  return data;
}

export function equipSkin(skinId) {
  const data = loadData();
  if (!data.ownedSkins.includes(skinId)) return data;
  data.equippedSkin = skinId;
  saveData(data);
  return data;
}

export function buyPilot(pilotId, price) {
  const data = loadData();
  if (data.coins < price) return { success: false, data };
  if (data.ownedPilots.includes(pilotId)) return { success: false, data };
  data.coins -= price;
  data.ownedPilots.push(pilotId);
  data.equippedPilot = pilotId;

  // Update pilot achievement progress
  const pilotCount = data.ownedPilots.length;
  data.achievements.progress["pilot_2"] = pilotCount;
  data.achievements.progress["pilot_all"] = pilotCount;

  saveData(data);

  const achResult = processAchievements();
  return { success: true, data: achResult.data, newlyUnlocked: achResult.newlyUnlocked };
}

export function buyDrone(droneId, price) {
  const data = loadData();
  if (data.coins < price) return { success: false, data };
  if (data.ownedDrones.includes(droneId)) return { success: false, data };
  data.coins -= price;
  data.ownedDrones.push(droneId);
  if (data.equippedDrones.length < 2) {
    data.equippedDrones.push(droneId);
  }

  // Update drone achievement progress
  const droneCount = data.ownedDrones.length;
  data.achievements.progress["drone_first"] = 1;
  data.achievements.progress["drone_3"] = droneCount;
  data.achievements.progress["drone_all"] = droneCount;

  saveData(data);

  const achResult = processAchievements();
  return { success: true, data: achResult.data, newlyUnlocked: achResult.newlyUnlocked };
}

export function equipDrone(droneId, slot) {
  const data = loadData();
  if (!data.ownedDrones.includes(droneId)) return data;
  data.equippedDrones[slot] = droneId;
  saveData(data);
  return data;
}

export function unequipDrone(slot) {
  const data = loadData();
  data.equippedDrones.splice(slot, 1);
  saveData(data);
  return data;
}

export function equipPilot(pilotId) {
  const data = loadData();
  if (!data.ownedPilots.includes(pilotId)) return data;
  data.equippedPilot = pilotId;
  saveData(data);
  return data;
}

export function getMissions() {
  const data = loadData();
  const today = getDateSeedStr();

  if (data.missionDate !== today || !data.missions || data.missions.length === 0) {
    data.missions = generateDailyMissions();
    data.missionDate = today;
    saveData(data);
  }

  return data;
}

function updateMissionProgress(gameStats) {
  const data = getMissions();

  data.missions.forEach(m => {
    if (m.claimed) return;

    switch (m.key) {
      case "kills":
        m.progress += gameStats.kills;
        break;
      case "distance":
        m.progress += gameStats.distance;
        break;
      case "combo":
        m.progress = Math.max(m.progress, gameStats.bestCombo);
        break;
      case "wave":
        m.progress = Math.max(m.progress, gameStats.wave);
        break;
      case "games":
        m.progress += 1;
        break;
      case "powerups":
        m.progress += gameStats.powerupsCollected || 0;
        break;
      case "noHitWaves":
        m.progress = Math.max(m.progress, gameStats.noHitWaves || 0);
        break;
      case "singleDistance":
        m.progress = Math.max(m.progress, gameStats.distance);
        break;
    }
  });

  saveData(data);
  return data;
}

export function claimMission(index) {
  const data = loadData();
  const mission = data.missions[index];
  if (!mission || mission.claimed || mission.progress < mission.target) return data;

  mission.claimed = true;
  data.coins += mission.reward;
  data.totalCoinsEarned += mission.reward;
  saveData(data);
  return data;
}

export function checkDailyReward() {
  const data = loadData();
  return checkDaily(data);
}

export function claimDailyReward() {
  const data = loadData();
  const result = claimDaily(data);
  if (result.claimed) {
    saveData(result.data);
  }
  return result;
}
