import { useState } from "react";
import { Play, Settings, Home, X, Volume2, Music, Vibrate } from "lucide-react";
import { getPlayerData, updateSettings } from "../data/playerData.js";
import { setSoundVolume, setMusicVolume, startAmbient, stopAmbient } from "../audio/soundManager.js";

export default function PauseOverlay({ mode, onResume, onSettings, onBack, onQuit, onConfirmQuit }) {
  const [data, setData] = useState(getPlayerData);

  const toggle = (key) => {
    const updated = updateSettings(key, !data[key]);
    setData(updated);
  };

  const setSensitivity = (val) => {
    const updated = updateSettings("sensitivity", val);
    setData(updated);
  };

  return (
    <div style={s.backdrop}>
      <div style={s.panel}>
        {mode === "main" && (
          <>
            <div style={s.header}>
              <h2 style={s.title}>PAUSED</h2>
            </div>
            <div style={s.buttons}>
              <button onClick={onResume} style={s.primaryBtn}>
                <Play size={18} fill="#fff" stroke="none" />
                <span>RESUME</span>
              </button>
              <button onClick={onSettings} style={s.secondaryBtn}>
                <Settings size={16} />
                <span>SETTINGS</span>
              </button>
              <button onClick={onQuit} style={s.dangerBtn}>
                <Home size={16} />
                <span>QUIT TO MENU</span>
              </button>
            </div>
          </>
        )}

        {mode === "settings" && (
          <>
            <div style={s.header}>
              <button onClick={onBack} style={s.backBtn}>
                <X size={20} />
              </button>
              <h2 style={s.title}>SETTINGS</h2>
            </div>
            <div style={s.settingsList}>
              <VolumeSlider
                icon={<Volume2 size={18} />}
                label="Sound effects"
                value={data.soundVolume ?? 70}
                onChange={(v) => {
                  setSoundVolume(v);
                  let d = updateSettings("soundVolume", v);
                  d = updateSettings("soundEnabled", v > 0);
                  setData(d);
                }}
              />
              <VolumeSlider
                icon={<Music size={18} />}
                label="Music"
                value={data.musicVolume ?? 50}
                onChange={(v) => {
                  setMusicVolume(v);
                  if (v > 0) startAmbient(); else stopAmbient();
                  let d = updateSettings("musicVolume", v);
                  d = updateSettings("musicEnabled", v > 0);
                  setData(d);
                }}
              />
              <SettingRow
                icon={<Vibrate size={18} />}
                label="Vibration"
                value={data.vibrationEnabled}
                onToggle={() => toggle("vibrationEnabled")}
              />
              <div style={s.sliderRow}>
                <span style={s.settingLabel}>Touch sensitivity</span>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={data.sensitivity || 1}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  style={s.slider}
                />
                <span style={s.sliderValue}>{(data.sensitivity || 1).toFixed(1)}x</span>
              </div>
            </div>
            <button onClick={onBack} style={s.primaryBtn}>
              <span>DONE</span>
            </button>
          </>
        )}

        {mode === "confirm-quit" && (
          <>
            <div style={s.header}>
              <h2 style={s.title}>QUIT GAME?</h2>
            </div>
            <p style={s.warning}>
              Your current progress will be lost.
              Distance and coins earned this run won't be saved as a record.
            </p>
            <div style={s.buttons}>
              <button onClick={onConfirmQuit} style={s.dangerBtn}>
                <Home size={16} />
                <span>YES, QUIT</span>
              </button>
              <button onClick={onBack} style={s.secondaryBtn}>
                <span>CANCEL</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VolumeSlider({ icon, label, value, onChange }) {
  return (
    <div style={s.settingRow}>
      <div style={s.settingLabelGroup}>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{icon}</span>
        <span style={s.settingLabel}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min="0" max="100" step="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{ ...s.slider, width: 80 }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: value > 0 ? "#00aaff" : "rgba(255,255,255,0.2)", minWidth: 24, textAlign: "right" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SettingRow({ icon, label, value, onToggle }) {
  return (
    <div style={s.settingRow}>
      <div style={s.settingLabelGroup}>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>{icon}</span>
        <span style={s.settingLabel}>{label}</span>
      </div>
      <button onClick={onToggle} style={{
        ...s.toggle,
        background: value ? "#00aaff" : "rgba(255,255,255,0.1)",
      }}>
        <div style={{
          ...s.toggleKnob,
          transform: value ? "translateX(20px)" : "translateX(2px)",
        }} />
      </button>
    </div>
  );
}

const s = {
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  panel: {
    width: "85%",
    maxWidth: 340,
    padding: "32px 24px",
    borderRadius: 20,
    background: "rgba(20,20,30,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    fontFamily: "'Sora',sans-serif",
  },
  header: {
    position: "relative",
    textAlign: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: 4,
    margin: 0,
  },
  backBtn: {
    position: "absolute",
    left: 0,
    top: 0,
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.5)",
    cursor: "pointer",
    padding: 4,
  },
  buttons: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg,#0088ff,#0055dd)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,140,255,0.3)",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: 3,
    fontFamily: "'Sora',sans-serif",
  },
  secondaryBtn: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
    fontFamily: "'Sora',sans-serif",
  },
  dangerBtn: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,80,80,0.2)",
    background: "rgba(255,50,50,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "#ff6666",
    letterSpacing: 2,
    fontFamily: "'Sora',sans-serif",
  },
  settingsList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 20,
  },
  settingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 12px",
    borderRadius: 10,
  },
  settingLabelGroup: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: 500,
  },
  toggle: {
    width: 42,
    height: 22,
    borderRadius: 11,
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.2s",
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    background: "#fff",
    position: "absolute",
    top: 2,
    transition: "transform 0.2s",
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 12px",
  },
  slider: {
    flex: 1,
    accentColor: "#00aaff",
  },
  sliderValue: {
    fontSize: 12,
    color: "#00aaff",
    fontWeight: 700,
    minWidth: 30,
    textAlign: "right",
  },
  warning: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 1.6,
    marginBottom: 24,
  },
};
