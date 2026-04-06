export const DAILY_REWARDS = [
  { day: 1, coins: 50, label: "Day 1" },
  { day: 2, coins: 75, label: "Day 2" },
  { day: 3, coins: 100, label: "Day 3" },
  { day: 4, coins: 150, label: "Day 4" },
  { day: 5, coins: 200, label: "Day 5" },
  { day: 6, coins: 300, label: "Day 6" },
  { day: 7, coins: 500, label: "Day 7" },
];

function getDateStr(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getDateStr(d);
}

export function checkDailyReward(playerData) {
  const today = getDateStr();
  const lastClaim = playerData.lastClaimDate || "";
  const streak = playerData.loginStreak || 0;

  // Already claimed today
  if (lastClaim === today) {
    return { canClaim: false, currentDay: ((streak - 1) % 7) + 1, streak };
  }

  // Calculate new streak
  let newStreak;
  if (lastClaim === getYesterdayStr()) {
    // Consecutive day — continue streak
    newStreak = streak + 1;
  } else {
    // Missed a day or first time — reset to 1
    newStreak = 1;
  }

  // Cycle day (1-7)
  const currentDay = ((newStreak - 1) % 7) + 1;
  const reward = DAILY_REWARDS.find(r => r.day === currentDay);

  return {
    canClaim: true,
    currentDay,
    streak: newStreak,
    reward: reward.coins,
  };
}

export function claimDailyReward(playerData) {
  const result = checkDailyReward(playerData);
  if (!result.canClaim) return { data: playerData, claimed: false };

  const data = { ...playerData };
  data.lastClaimDate = getDateStr();
  data.loginStreak = result.streak;
  data.coins += result.reward;
  data.totalCoinsEarned += result.reward;

  return { data, claimed: true, reward: result.reward, day: result.currentDay, streak: result.streak };
}
