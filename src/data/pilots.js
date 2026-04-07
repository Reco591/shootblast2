export const PILOTS = [
  {
    id: "rebel",
    name: "REBEL ACE",
    desc: "Veteran X-Wing pilot",
    tag: "STARTER",
    price: 0,
    accent: "#ff8833",
    visor: "#ddaa33",
    bonus: { type: "coins", value: 0.15, label: "+15% coins earned" },
    ability: {
      id: "barrage",
      name: "BARRAGE",
      desc: "Fire 12 rapid shots in 1 second",
      cooldown: 20000,
      duration: 1000,
      icon: "zap",
      color: "#ff8833",
    },
  },
  {
    id: "trooper",
    name: "IMPERIAL TROOPER",
    desc: "Elite shock soldier",
    tag: "RARE",
    price: 5000,
    accent: "#dddddd",
    visor: "#000000",
    bonus: { type: "fireRate", value: 0.10, label: "+10% fire rate" },
    ability: {
      id: "shield_dome",
      name: "SHIELD DOME",
      desc: "Activate invincibility for 4 seconds",
      cooldown: 30000,
      duration: 4000,
      icon: "shield",
      color: "#dddddd",
    },
  },
  {
    id: "tie",
    name: "TIE INTERCEPTOR",
    desc: "Imperial fighter pilot",
    tag: "EPIC",
    price: 12000,
    accent: "#222244",
    visor: "#cc3322",
    bonus: { type: "damage", value: 0.10, label: "+10% bullet damage" },
    ability: {
      id: "phase_dash",
      name: "PHASE DASH",
      desc: "Dash forward, destroy meteors in path",
      cooldown: 15000,
      duration: 500,
      icon: "wind",
      color: "#cc3322",
    },
  },
  {
    id: "dark",
    name: "DARK LORD",
    desc: "Master of the dark side",
    tag: "LEGENDARY",
    price: 30000,
    accent: "#cc1100",
    visor: "#ff3300",
    bonus: { type: "all", value: 0.15, label: "+15% damage, fire rate & coins" },
    ability: {
      id: "force_blast",
      name: "FORCE BLAST",
      desc: "Wave of destruction destroys all enemies on screen",
      cooldown: 45000,
      duration: 600,
      icon: "explosion",
      color: "#cc1100",
    },
  },
];

export function getPilot(id) {
  return PILOTS.find(p => p.id === id) || PILOTS[0];
}

export function getPilotTagColor(tag) {
  switch (tag) {
    case "STARTER": return "#88cc88";
    case "RARE": return "#44aaff";
    case "EPIC": return "#cc66ff";
    case "LEGENDARY": return "#ffaa00";
    default: return "#888";
  }
}
