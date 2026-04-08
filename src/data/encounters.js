// ── NPC Encounter Definitions ──
// Random events that occur every 45-75 seconds.
// All choices are gameplay-focused: buy powerups, repair HP, or decline.

export const ENCOUNTERS = [
  // === MERCHANT ===
  {
    id: "merchant",
    name: "Trader Vessel",
    color: "#ffaa00",
    portrait: "merchant",
    weight: 25,
    intro: "A merchant ship hails you.",
    dialog: "\"I have power-ups for sale, pilot. What do you need?\"",
    choices: [
      {
        label: "Buy Shield (200 coins)",
        cost: 200,
        condition: (data) => data.coins >= 200,
        outcome: (state) => {
          state.actualCoinsThisRun -= 200;
          state.activeEffects.shield = 8000;
          return { msg: "Shield activated for 8 seconds!", success: true };
        },
      },
      {
        label: "Buy Triple Shot (300 coins)",
        cost: 300,
        condition: (data) => data.coins >= 300,
        outcome: (state) => {
          state.actualCoinsThisRun -= 300;
          state.activeEffects.triple = 10000;
          return { msg: "Triple shot active for 10 seconds!", success: true };
        },
      },
      {
        label: "Decline",
        outcome: () => ({ msg: "Trader drifts away.", success: false }),
      },
    ],
  },

  // === ENGINEER ===
  {
    id: "engineer",
    name: "Field Engineer",
    color: "#00ddaa",
    portrait: "merchant",
    weight: 20,
    intro: "An engineer offers ship repairs.",
    dialog: "\"Your hull looks rough. I can patch you up — for a price.\"",
    choices: [
      {
        label: "Repair +1 life (400 coins)",
        cost: 400,
        condition: (data) => data.coins >= 400 && data.lives < 5,
        outcome: (state) => {
          state.actualCoinsThisRun -= 400;
          state.lives = Math.min(5, state.lives + 1);
          return { msg: "+1 life restored!", success: true };
        },
      },
      {
        label: "Full repair (1000 coins)",
        cost: 1000,
        condition: (data) => data.coins >= 1000 && data.lives < 5,
        outcome: (state) => {
          state.actualCoinsThisRun -= 1000;
          state.lives = 5;
          return { msg: "Hull fully repaired!", success: true };
        },
      },
      {
        label: "Decline",
        outcome: () => ({ msg: "Engineer waves goodbye.", success: false }),
      },
    ],
  },

  // === WEAPONS DEALER ===
  {
    id: "weapon_dealer",
    name: "Weapons Dealer",
    color: "#ff5544",
    portrait: "soldier",
    weight: 15,
    intro: "A heavily armed ship pulls alongside.",
    dialog: "\"Need firepower? I deal in temporary upgrades.\"",
    choices: [
      {
        label: "Rapid Fire boost (250 coins)",
        cost: 250,
        condition: (data) => data.coins >= 250,
        outcome: (state) => {
          state.actualCoinsThisRun -= 250;
          state.activeEffects.rapid = 12000;
          return { msg: "Rapid fire for 12 seconds!", success: true };
        },
      },
      {
        label: "Buy Nuke (800 coins)",
        cost: 800,
        condition: (data) => data.coins >= 800,
        outcome: (state) => {
          state.actualCoinsThisRun -= 800;
          // Clear all enemies and meteors
          state.meteors.length = 0;
          state.enemies.length = 0;
          state.enemyProjectiles.length = 0;
          state.killFlashTimer = 30;
          state.killFlashColor = "#ffffff";
          state.comboShakeIntensity = 12;
          state.comboShakeDecay = 30;
          state.nukesUsed++;
          return { msg: "NUKE deployed!", success: true };
        },
      },
      {
        label: "Not interested",
        outcome: () => ({ msg: "Dealer moves on.", success: false }),
      },
    ],
  },

  // === SCIENTIST ===
  {
    id: "scientist",
    name: "Research Vessel",
    color: "#aa55ff",
    portrait: "wreck",
    weight: 15,
    intro: "A research ship offers experimental tech.",
    dialog: "\"I have prototypes. Some work, some... don't. Want to test one?\"",
    choices: [
      {
        label: "Slow Time boost (300 coins)",
        cost: 300,
        condition: (data) => data.coins >= 300,
        outcome: (state) => {
          state.actualCoinsThisRun -= 300;
          state.activeEffects.slowtime = 8000;
          return { msg: "Time slowed for 8 seconds!", success: true };
        },
      },
      {
        label: "Mystery tech (100 coins, RANDOM)",
        cost: 100,
        condition: (data) => data.coins >= 100,
        outcome: (state) => {
          state.actualCoinsThisRun -= 100;
          const types = ["shield", "rapid", "triple", "magnet", "doublepts", "freeze", "slowtime"];
          const type = types[Math.floor(Math.random() * types.length)];
          state.activeEffects[type] = 8000;
          return { msg: `MYSTERY: ${type.toUpperCase()} activated!`, success: true };
        },
      },
      {
        label: "Pass",
        outcome: () => ({ msg: "Scientist sighs and leaves.", success: false }),
      },
    ],
  },

  // === SALVAGE SHIP ===
  {
    id: "magnetic",
    name: "Salvage Ship",
    color: "#ffdd44",
    portrait: "merchant",
    weight: 15,
    intro: "A salvage ship offers magnetic services.",
    dialog: "\"I'll attract every coin in the area to your ship — for a fee.\"",
    choices: [
      {
        label: "Activate Magnet (200 coins)",
        cost: 200,
        condition: (data) => data.coins >= 200,
        outcome: (state) => {
          state.actualCoinsThisRun -= 200;
          state.activeEffects.magnet = 15000;
          return { msg: "Magnet active for 15 seconds!", success: true };
        },
      },
      {
        label: "Double Points (350 coins)",
        cost: 350,
        condition: (data) => data.coins >= 350,
        outcome: (state) => {
          state.actualCoinsThisRun -= 350;
          state.activeEffects.doublepts = 12000;
          return { msg: "Double coin earnings for 12 seconds!", success: true };
        },
      },
      {
        label: "No thanks",
        outcome: () => ({ msg: "Salvage ship moves on.", success: false }),
      },
    ],
  },

  // === VETERAN PILOT ===
  {
    id: "veteran",
    name: "Veteran Pilot",
    color: "#88ddff",
    portrait: "friendly",
    weight: 10,
    intro: "An experienced pilot greets you.",
    dialog: "\"Rough zone ahead. Want me to freeze the threats?\"",
    choices: [
      {
        label: "Freeze enemies (500 coins)",
        cost: 500,
        condition: (data) => data.coins >= 500,
        outcome: (state) => {
          state.actualCoinsThisRun -= 500;
          state.activeEffects.freeze = 6000;
          return { msg: "All enemies frozen for 6 seconds!", success: true };
        },
      },
      {
        label: "Free shield",
        outcome: (state) => {
          state.activeEffects.shield = 4000;
          return { msg: "Free 4-second shield!", success: true };
        },
      },
      {
        label: "Continue alone",
        outcome: () => ({ msg: "Veteran salutes and flies off.", success: false }),
      },
    ],
  },
];

export function pickRandomEncounter() {
  const total = ENCOUNTERS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of ENCOUNTERS) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return ENCOUNTERS[0];
}
