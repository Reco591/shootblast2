import { useState } from "react";

export default function EncounterDialog({ encounter, coins, lives, onChoice }) {
  const [chosen, setChosen] = useState(false);

  if (!encounter) return null;

  const handleChoice = (i) => {
    if (chosen) return;
    setChosen(true);
    onChoice(i);
  };

  const checkData = { coins, lives };

  return (
    <div style={s.backdrop}>
      <div style={{ ...s.card, borderColor: encounter.color }}>
        {/* Header */}
        <div style={{ ...s.header, background: encounter.color + "20" }}>
          <div style={s.portrait}>
            <NPCPortrait type={encounter.portrait} color={encounter.color} />
          </div>
          <div>
            <p style={s.intro}>{encounter.intro}</p>
            <h3 style={{ ...s.name, color: encounter.color }}>{encounter.name}</h3>
          </div>
        </div>

        {/* Dialog */}
        <div style={s.dialog}>{encounter.dialog}</div>

        {/* Choices */}
        <div style={s.choices}>
          {encounter.choices.map((choice, i) => {
            const available = !choice.condition || choice.condition(checkData);
            return (
              <button
                key={i}
                disabled={!available || chosen}
                onClick={() => handleChoice(i)}
                style={{
                  ...s.choiceBtn,
                  borderColor: available && !chosen ? encounter.color + "60" : "transparent",
                  opacity: available && !chosen ? 1 : 0.35,
                  cursor: available && !chosen ? "pointer" : "default",
                }}
              >
                <span>{choice.label}</span>
                {choice.cost != null && <span style={s.cost}>{choice.cost}c</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NPCPortrait({ type, color }) {
  switch (type) {
    case "merchant":
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <circle cx="25" cy="20" r="12" fill={color} opacity="0.3" />
          <circle cx="25" cy="20" r="9" fill={color} />
          <rect x="13" y="32" width="24" height="14" rx="2" fill={color} opacity="0.6" />
          <circle cx="25" cy="18" r="2" fill="#fff" />
        </svg>
      );
    case "soldier":
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <rect x="10" y="14" width="30" height="22" fill={color} opacity="0.3" />
          <rect x="13" y="17" width="24" height="16" fill={color} />
          <rect x="20" y="20" width="10" height="3" fill="#000" />
          <rect x="22" y="33" width="6" height="10" fill={color} />
        </svg>
      );
    case "refugee":
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <ellipse cx="25" cy="25" rx="18" ry="12" fill={color} opacity="0.3" />
          <ellipse cx="25" cy="25" rx="14" ry="9" fill={color} />
          <line x1="14" y1="22" x2="36" y2="22" stroke="#000" strokeWidth="0.5" />
        </svg>
      );
    case "distress":
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <rect x="14" y="15" width="22" height="20" fill={color} />
          <rect x="22" y="10" width="6" height="8" fill={color} />
          <text x="25" y="30" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900">!</text>
        </svg>
      );
    case "wreck":
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <path d="M10 25 L18 15 L32 18 L40 28 L35 38 L15 35 Z" fill={color} opacity="0.4" />
          <path d="M14 22 L20 18 L28 22 L26 30 L18 32 Z" fill={color} />
        </svg>
      );
    case "friendly":
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <polygon points="25,10 38,30 33,38 17,38 12,30" fill={color} />
          <circle cx="25" cy="25" r="3" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg width="44" height="44" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="15" fill={color} opacity="0.5" />
        </svg>
      );
  }
}

const s = {
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  card: {
    width: "85%",
    maxWidth: 340,
    background: "rgba(15,15,25,0.97)",
    border: "2px solid",
    borderRadius: 16,
    overflow: "hidden",
    fontFamily: "'Sora', sans-serif",
  },
  header: {
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  portrait: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  intro: {
    fontSize: 9,
    color: "rgba(255,255,255,0.45)",
    margin: 0,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  name: {
    fontSize: 15,
    fontWeight: 800,
    margin: "2px 0 0 0",
    letterSpacing: 2,
  },
  dialog: {
    padding: "14px 18px",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontStyle: "italic",
    lineHeight: 1.5,
    borderTop: "1px solid rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  choices: {
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  choiceBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid",
    borderRadius: 10,
    padding: "11px 13px",
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Sora', sans-serif",
    WebkitTapHighlightColor: "transparent",
  },
  cost: {
    fontSize: 10,
    color: "#ffaa00",
    fontWeight: 700,
  },
};
