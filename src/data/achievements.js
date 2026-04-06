import { Crosshair, Rocket, Zap, Shield, Crown, Star, Target, Gem, Trophy, Globe, Flame, Clock, TrendingUp, Award } from "lucide-react";

export const ACHIEVEMENTS = [
  // Kill milestones
  { id: "kill_1", name: "FIRST BLOOD", desc: "Destroy your first meteor", key: "totalKills", target: 1, reward: 50, Icon: Crosshair },
  { id: "kill_50", name: "HUNTER", desc: "Destroy 50 meteors total", key: "totalKills", target: 50, reward: 100, Icon: Crosshair },
  { id: "kill_500", name: "DESTROYER", desc: "Destroy 500 meteors total", key: "totalKills", target: 500, reward: 300, Icon: Crosshair },
  { id: "kill_2000", name: "EXTINCTION", desc: "Destroy 2,000 meteors total", key: "totalKills", target: 2000, reward: 800, Icon: Flame },

  // Distance milestones
  { id: "dist_mercury", name: "MERCURY ORBIT", desc: "Travel past Mercury (58M km)", key: "bestDistance", target: 58_000_000, reward: 150, Icon: Globe },
  { id: "dist_mars", name: "RED PLANET", desc: "Travel past Mars (228M km)", key: "bestDistance", target: 228_000_000, reward: 400, Icon: Globe },
  { id: "dist_jupiter", name: "GAS GIANT", desc: "Travel past Jupiter (778M km)", key: "bestDistance", target: 778_000_000, reward: 800, Icon: Globe },
  { id: "dist_total_1b", name: "DEEP VOYAGER", desc: "Travel 1B km total across all games", key: "totalDistance", target: 1_000_000_000, reward: 500, Icon: Rocket },

  // Combo milestones
  { id: "combo_10", name: "COMBO STARTER", desc: "Reach 10x combo", key: "bestCombo", target: 10, reward: 100, Icon: Zap },
  { id: "combo_25", name: "COMBO MASTER", desc: "Reach 25x combo", key: "bestCombo", target: 25, reward: 300, Icon: Zap },
  { id: "combo_50", name: "UNSTOPPABLE", desc: "Reach 50x combo", key: "bestCombo", target: 50, reward: 800, Icon: Crown },

  // Wave milestones
  { id: "wave_5", name: "SURVIVOR", desc: "Reach wave 5", key: "bestWave", target: 5, reward: 80, Icon: Shield },
  { id: "wave_10", name: "VETERAN", desc: "Reach wave 10", key: "bestWave", target: 10, reward: 200, Icon: Shield },
  { id: "wave_20", name: "LEGEND", desc: "Reach wave 20", key: "bestWave", target: 20, reward: 600, Icon: Trophy },

  // Game count
  { id: "games_10", name: "REGULAR", desc: "Play 10 games", key: "totalGames", target: 10, reward: 100, Icon: Target },
  { id: "games_50", name: "DEDICATED", desc: "Play 50 games", key: "totalGames", target: 50, reward: 300, Icon: Target },
  { id: "games_100", name: "ADDICTED", desc: "Play 100 games", key: "totalGames", target: 100, reward: 600, Icon: Star },

  // Coin milestones
  { id: "coins_1000", name: "INVESTOR", desc: "Earn 1,000 coins total", key: "totalCoinsEarned", target: 1000, reward: 150, Icon: Gem },
  { id: "coins_10000", name: "TYCOON", desc: "Earn 10,000 coins total", key: "totalCoinsEarned", target: 10000, reward: 500, Icon: Gem },

  // Skin collection
  { id: "skins_3", name: "COLLECTOR", desc: "Own 3 different ships", key: "ownedSkinsCount", target: 3, reward: 200, Icon: Rocket },
  { id: "skins_all", name: "FLEET COMMANDER", desc: "Own all 6 ships", key: "ownedSkinsCount", target: 6, reward: 2000, Icon: Award },

  // Boss fights
  { id: "boss_first", name: "GUARDIAN SLAYER", desc: "Defeat your first boss", key: "bossCount", target: 1, reward: 300, Icon: Crown },
  { id: "boss_all", name: "SYSTEM CONQUEROR", desc: "Defeat all 8 bosses", key: "bossCount", target: 8, reward: 5000, Icon: Award },
];

export function checkAchievements(playerData) {
  const unlockedIds = playerData.unlockedAchievements || [];
  const newlyUnlocked = [];

  const stats = {
    ...playerData,
    ownedSkinsCount: playerData.ownedSkins ? playerData.ownedSkins.length : 1,
    bossCount: playerData.defeatedBosses ? playerData.defeatedBosses.length : 0,
  };

  ACHIEVEMENTS.forEach(ach => {
    if (unlockedIds.includes(ach.id)) return;
    const value = stats[ach.key] || 0;
    if (value >= ach.target) {
      newlyUnlocked.push(ach);
    }
  });

  return newlyUnlocked;
}
