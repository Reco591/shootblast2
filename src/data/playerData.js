import { MILESTONES } from "./milestones.js";
import { generateDailyMissions, getDateSeedStr } from "./missions.js";
import { checkAchievements } from "./achievements.js";
import { claimDailyReward as claimDaily, checkDailyReward as checkDaily } from "./dailyReward.js";

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

  // Achievements
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
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DATA, ...parsed };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getPlayerData() {
  return loadData();
}

export function processAchievements() {
  const data = loadData();
  const newlyUnlocked = checkAchievements(data);

  if (newlyUnlocked.length === 0) return { data, newlyUnlocked: [] };

  newlyUnlocked.forEach(ach => {
    data.unlockedAchievements.push(ach.id);
    data.coins += ach.reward;
    data.totalCoinsEarned += ach.reward;
  });

  saveData(data);
  return { data, newlyUnlocked };
}

export function recordGame(distance, kills, wave, bestCombo, playTimeSeconds, powerupsCollected, noHitWaves, defeatedBosses, bossCoinsEarned) {
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
  return { ...DEFAULT_DATA };
}

export function buySkin(skinId, price) {
  const data = loadData();
  if (data.coins < price) return { success: false, data };
  if (data.ownedSkins.includes(skinId)) return { success: false, data };
  data.coins -= price;
  data.ownedSkins.push(skinId);
  data.equippedSkin = skinId;
  saveData(data);

  // Check skin collection achievements
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
  saveData(data);
  return { success: true, data };
}

export function upgradeWeapon(weaponId, cost) {
  const data = loadData();
  if (data.coins < cost) return { success: false, data };
  const owned = data.ownedWeapons.find(w => w.id === weaponId);
  if (!owned || owned.level >= 19) return { success: false, data };
  data.coins -= cost;
  owned.level += 1;
  saveData(data);
  return { success: true, data };
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
