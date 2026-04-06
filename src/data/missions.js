import { Target, Crosshair, Zap, Shield, Rocket, BarChart3 } from "lucide-react";

// Each mission template has:
// - id: unique identifier
// - text: display text (use {target} placeholder for the number)
// - key: which stat to track
// - tiers: array of [target, reward] pairs (easy/medium/hard variants)
// - Icon: lucide-react icon component

export const MISSION_POOL = [
  {
    id: "kills",
    text: "Destroy {target} meteors",
    key: "kills",
    tiers: [[15, 80], [30, 150], [50, 250], [100, 500]],
    Icon: Crosshair,
  },
  {
    id: "distance",
    text: "Travel {target}",
    key: "distance",
    tiers: [[10_000_000, 100], [50_000_000, 200], [150_000_000, 400], [500_000_000, 800]],
    Icon: Rocket,
    formatTarget: true,
  },
  {
    id: "combo",
    text: "Reach {target}x combo",
    key: "combo",
    tiers: [[5, 80], [10, 150], [15, 300], [25, 600]],
    Icon: Zap,
  },
  {
    id: "wave",
    text: "Reach wave {target}",
    key: "wave",
    tiers: [[3, 60], [5, 120], [8, 250], [12, 500]],
    Icon: BarChart3,
  },
  {
    id: "games",
    text: "Play {target} games",
    key: "games",
    tiers: [[1, 30], [3, 80], [5, 150], [10, 300]],
    Icon: Target,
  },
  {
    id: "powerups",
    text: "Collect {target} power-ups",
    key: "powerups",
    tiers: [[3, 60], [5, 120], [10, 250], [20, 500]],
    Icon: Shield,
  },
  {
    id: "nohit",
    text: "Clear {target} waves without damage",
    key: "noHitWaves",
    tiers: [[1, 100], [2, 200], [3, 400]],
    Icon: Shield,
  },
  {
    id: "singledist",
    text: "Travel {target} in one run",
    key: "singleDistance",
    tiers: [[5_000_000, 80], [20_000_000, 180], [80_000_000, 350], [200_000_000, 700]],
    Icon: Rocket,
    formatTarget: true,
  },
];

function getDateSeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateDailyMissions() {
  const seed = hashStr(getDateSeed());
  const pool = [...MISSION_POOL];
  const missions = [];

  for (let i = 0; i < 3; i++) {
    const idx = (seed * (i + 1) * 7 + i * 13) % pool.length;
    const template = pool.splice(idx, 1)[0];

    const tierIdx = ((seed * (i + 3)) % template.tiers.length);
    const [target, reward] = template.tiers[tierIdx];

    missions.push({
      templateId: template.id,
      key: template.key,
      text: template.text.replace("{target}",
        template.formatTarget ? "FORMAT_DISTANCE" : target.toString()
      ),
      target,
      reward,
      formatTarget: template.formatTarget || false,
      progress: 0,
      claimed: false,
    });
  }

  return missions;
}

export function getDateSeedStr() {
  return getDateSeed();
}
