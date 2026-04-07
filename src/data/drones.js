export const DRONES = [
  {
    id: "scout",
    name: "SCOUT DRONE",
    desc: "Basic auto-fire support",
    tag: "STARTER",
    price: 3000,
    color: "#00aaff",
    accent: "#88ddff",
    fireRate: 240,
    bulletSpeed: 7,
    bulletDmg: 1,
    bulletColor: "#88ddff",
    behavior: "side",
    size: 7,
  },
  {
    id: "interceptor",
    name: "INTERCEPTOR",
    desc: "Faster fire rate",
    tag: "RARE",
    price: 8000,
    color: "#ffaa00",
    accent: "#ffdd66",
    fireRate: 180,
    bulletSpeed: 8,
    bulletDmg: 1,
    bulletColor: "#ffdd66",
    behavior: "side",
    size: 6,
  },
  {
    id: "guardian",
    name: "GUARDIAN",
    desc: "Defensive orbiter, occasionally blocks bullets",
    tag: "RARE",
    price: 12000,
    color: "#00ddaa",
    accent: "#88ffdd",
    fireRate: 300,
    bulletSpeed: 6,
    bulletDmg: 1,
    bulletColor: "#88ffdd",
    behavior: "orbit",
    size: 8,
    blocksProjectiles: true,
    blockChance: 0.4,
  },
  {
    id: "hunter",
    name: "HUNTER",
    desc: "Fires slow heavy shots",
    tag: "EPIC",
    price: 18000,
    color: "#ff5544",
    accent: "#ff8866",
    fireRate: 360,
    bulletSpeed: 4,
    bulletDmg: 2,
    bulletColor: "#ff8866",
    behavior: "rear",
    size: 7,
  },
  {
    id: "artillery",
    name: "ARTILLERY",
    desc: "Heavy slow shots",
    tag: "EPIC",
    price: 25000,
    color: "#aa55ff",
    accent: "#cc88ff",
    fireRate: 420,
    bulletSpeed: 9,
    bulletDmg: 3,
    bulletColor: "#cc88ff",
    behavior: "side",
    size: 8,
  },
  {
    id: "harvester",
    name: "HARVESTER",
    desc: "Auto-collects nearby coins & power-ups",
    tag: "LEGENDARY",
    price: 40000,
    color: "#ffdd44",
    accent: "#ffee88",
    fireRate: 320,
    bulletSpeed: 6,
    bulletDmg: 1,
    bulletColor: "#ffee88",
    behavior: "side",
    size: 9,
    magnetRange: 50,
  },
];

export function getDrone(id) {
  return DRONES.find(d => d.id === id);
}

export function getDroneTagColor(tag) {
  switch (tag) {
    case "STARTER": return "#888888";
    case "RARE": return "#00aaff";
    case "EPIC": return "#aa55ff";
    case "LEGENDARY": return "#ffaa00";
    default: return "#888888";
  }
}
