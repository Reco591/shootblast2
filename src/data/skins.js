export const SKINS = [
  {
    id: "arc7",
    name: "ARC-7",
    tag: "STANDARD",
    price: 0,
    hull: { top: "#3e3e68", mid: "#2a2a4e", bot: "#161636" },
    accent: "#00aaff",
    visor: "#00ddff",
    flame: "#88ddff",
    wingTipL: "#ff4444",
    wingTipR: "#44ff88",
  },
  {
    id: "ember",
    name: "EMBER",
    tag: "RARE",
    price: 800,
    hull: { top: "#5e3030", mid: "#4a2020", bot: "#361515" },
    accent: "#ff5534",
    visor: "#ff8844",
    flame: "#ffaa66",
    wingTipL: "#ff2222",
    wingTipR: "#ffaa00",
  },
  {
    id: "wraith",
    name: "WRAITH",
    tag: "EPIC",
    price: 1500,
    hull: { top: "#4a3a6e", mid: "#35284e", bot: "#201636" },
    accent: "#9955ff",
    visor: "#bb77ff",
    flame: "#cc99ff",
    wingTipL: "#ff44ff",
    wingTipR: "#8844ff",
  },
  {
    id: "aurora",
    name: "AURORA",
    tag: "EPIC",
    price: 2200,
    hull: { top: "#2a5e5a", mid: "#1a4a42", bot: "#103630" },
    accent: "#00ddaa",
    visor: "#44ffcc",
    flame: "#66ffdd",
    wingTipL: "#00ff88",
    wingTipR: "#00aaff",
  },
  {
    id: "solar",
    name: "SOLAR",
    tag: "LEGENDARY",
    price: 4000,
    hull: { top: "#5e5530", mid: "#4a4020", bot: "#363015" },
    accent: "#ffaa00",
    visor: "#ffcc44",
    flame: "#ffdd88",
    wingTipL: "#ff6600",
    wingTipR: "#ffcc00",
  },
  {
    id: "nyx",
    name: "NYX",
    tag: "LEGENDARY",
    price: 8000,
    hull: { top: "#5e2040", mid: "#4a1530", bot: "#360a20" },
    accent: "#ff0066",
    visor: "#ff4488",
    flame: "#ff6699",
    wingTipL: "#ff0044",
    wingTipR: "#ff00aa",
  },
];

export function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

export function getTagColor(tag) {
  switch (tag) {
    case "LEGENDARY": return "#ffaa00";
    case "EPIC": return "#aa55ff";
    case "RARE": return "#00aaff";
    default: return "#667788";
  }
}
