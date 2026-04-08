import { useState, useEffect, useRef } from "react";
import {
  Play, Target, Rocket, Trophy, BarChart3, X, Lock, Gem, Check,
  Settings as SettingsIcon, Volume2, Music, Smartphone, Crosshair,
  Trash2, Zap, Clock, TrendingUp, Gift, Flame, Building
} from "lucide-react";
import { formatDistance } from "../utils/formatDistance.js";
import { getSkin, SKINS, getTagColor } from "../data/skins.js";
import { buySkin, equipSkin, updateSettings, resetAllData, getMissions, claimMission, claimDailyReward as claimDailyRewardFn, buyWeapon, upgradeWeapon, equipWeapon, buyPilot, equipPilot, buyDrone, equipDrone, unequipDrone, getPendingStationCoins, getActiveBuffs } from "../data/playerData.js";
import StationScreen from "./StationScreen.jsx";
import { WEAPONS, getWeapon, MAX_WEAPON_LEVEL } from "../data/weapons.js";
import { STATION_MODULES } from "../data/modules.js";
import { renderCustomShip } from "../components/CustomShips.jsx";
import { PilotHelmet } from "../components/PilotHelmet.jsx";
import { PILOTS, getPilotTagColor } from "../data/pilots.js";
import { DRONES, getDrone, getDroneTagColor } from "../data/drones.js";
import { MISSION_POOL } from "../data/missions.js";
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, getAchievementsByCategory, getCategory } from "../data/achievements.js";
import { DAILY_REWARDS, checkDailyReward as checkDailyRewardFn } from "../data/dailyReward.js";
import {
  initAudio, playClick, playConfirm, playSheetOpen, playSheetClose,
  playCoinCollect, playDailyReward as playDailyRewardSound, playUpgrade,
  startAmbient, stopAmbient, setSoundEnabled, setMusicEnabled,
  setSoundVolume, setMusicVolume, playUIHover, playPurchase,
} from "../audio/soundManager.js";

const W = 420, H = 812, CX = W / 2, CY = H / 2 - 30;

function fmtAchNum(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function darkenHex(hex, factor = 0.6) {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r},${g},${b})`;
}

function fmtTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function SettingRow({ icon, label, value, onChange, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ color: "rgba(255,255,255,0.4)" }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 26, borderRadius: 13, border: "none",
          background: value ? accent : "rgba(255,255,255,0.08)",
          position: "relative", cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          background: "#fff",
          position: "absolute", top: 3,
          left: value ? 21 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

function VolumeSlider({ icon, label, value, onChange, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.4)" }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min="0" max="100" step="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{ width: 80, accentColor: accent || "#00aaff" }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: value > 0 ? (accent || "#00aaff") : "rgba(255,255,255,0.2)", minWidth: 28, textAlign: "right" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", marginBottom: 6,
      borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${accent}10`,
        border: `1px solid ${accent}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", letterSpacing: 1, display: "block" }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>
        {value}
      </span>
    </div>
  );
}

export default function MenuScreen({ onPlay, playerData, onDataChange }) {
  const cvs = useRef(null);
  const raf = useRef(null);
  const fr = useRef(0);
  const stars = useRef([]);
  const menuParts = useRef([]);

  const [warpT, setWarpT] = useState(0);
  const [whiteFlash, setWhiteFlash] = useState(0);
  const [menuMode, setMenuMode] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [showStation, setShowStation] = useState(false);
  const [bp, setBp] = useState(false);
  const [hangarMode, setHangarMode] = useState("ships");
  const [achCat, setAchCat] = useState("kills");
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [dailyRewardInfo, setDailyRewardInfo] = useState(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [upgradeAnim, setUpgradeAnim] = useState(null);

  const bestDistance = playerData?.bestDistance || 0;
  const skin = getSkin(playerData?.equippedSkin);

  const planets = useRef([
    { triggerT: 0.12, dur: 0.18, side: -1, xBase: -160, yBase: -40, r: 80, hue: 25, sat: 60, ring: true },
    { triggerT: 0.30, dur: 0.16, side: 1, xBase: 180, yBase: 30, r: 55, hue: 215, sat: 55, ring: false },
    { triggerT: 0.50, dur: 0.20, side: -1, xBase: -200, yBase: -80, r: 110, hue: 35, sat: 65, ring: true },
    { triggerT: 0.68, dur: 0.14, side: 1, xBase: 220, yBase: 60, r: 45, hue: 280, sat: 50, ring: false },
  ]);

  useEffect(() => {
    stars.current = Array.from({ length: 600 }, () => ({
      x: (Math.random() - 0.5) * 2500,
      y: (Math.random() - 0.5) * 2500,
      z: Math.random() * 1500 + 50,
      s: Math.random() * 1.6 + 0.3,
      hue: Math.random() > 0.85 ? 190 + Math.random() * 50 : 0,
    }));
  }, []);

  useEffect(() => {
    let t = 0;
    const iv = setInterval(() => {
      t += 0.003;
      if (t > 1) t = 1;
      setWarpT(t);

      if (t > 0.82) {
        const flashT = (t - 0.82) / 0.18;
        setWhiteFlash(Math.pow(flashT, 1.5));
      }

      if (t >= 1) {
        clearInterval(iv);
        setTimeout(() => {
          setMenuMode(true);
          setWhiteFlash(1);
          let f = 1;
          const fadeIv = setInterval(() => {
            f -= 0.025;
            if (f <= 0) { f = 0; clearInterval(fadeIv); }
            setWhiteFlash(f);
          }, 16);
          setShowShip(true);
          setTimeout(() => setShowTitle(true), 300);
          setTimeout(() => setShowPlay(true), 800);
          setTimeout(() => setShowCards(true), 1300);
        }, 200);
      }
    }, 16);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!showCards) return;
    if (playerData.musicEnabled) {
      initAudio(playerData.soundEnabled, playerData.musicEnabled, playerData.soundVolume, playerData.musicVolume);
      startAmbient();
    }
    const check = checkDailyRewardFn(playerData);
    if (check.canClaim) {
      setDailyRewardInfo(check);
      setShowDailyReward(true);
    }
    return () => stopAmbient();
  }, [showCards]);

  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");

    const render = () => {
      fr.current++;
      const t = fr.current * 0.016;
      const isWarp = !menuMode;

      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, H * 0.8);
      bg.addColorStop(0, isWarp ? "#0a0620" : "#080618");
      bg.addColorStop(0.5, "#060510");
      bg.addColorStop(1, "#020206");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      [[W*0.7,H*0.18,160,245,0.04],[W*0.15,H*0.5,130,275,0.03],[W*0.6,H*0.75,100,215,0.025]].forEach(([nx,ny,r,h,a]) => {
        const g = ctx.createRadialGradient(nx+Math.sin(t*0.04)*6, ny, 0, nx, ny, r);
        g.addColorStop(0, `hsla(${h},50%,25%,${a})`);
        g.addColorStop(0.5, `hsla(${h},40%,15%,${a*0.3})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI*2); ctx.fill();
      });

      const warpSpeed = isWarp ? (3 + warpT * 50) : 0.3;

      stars.current.forEach(s => {
        s.z -= warpSpeed;
        if (s.z < 1) {
          s.x = (Math.random() - 0.5) * 2500;
          s.y = (Math.random() - 0.5) * 2500;
          s.z = 1500;
          return;
        }

        const sx = (s.x / s.z) * 260 + CX;
        const sy = (s.y / s.z) * 260 + CY;
        if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) return;

        const bri = Math.min(1, (1 - s.z / 1500) * 2);
        const px = (s.x / (s.z + warpSpeed)) * 260 + CX;
        const py = (s.y / (s.z + warpSpeed)) * 260 + CY;
        const len = Math.sqrt((sx - px) ** 2 + (sy - py) ** 2);

        const warmth = isWarp ? warpT : 0;
        const starColor = s.hue > 0
          ? `hsla(${s.hue},${80 - warmth * 40}%,${72 + warmth * 20}%,`
          : `rgba(${180 + warmth * 75},${210 + warmth * 40},${255},`;

        if (len > 2 && warpSpeed > 2) {
          const sg = ctx.createLinearGradient(px, py, sx, sy);
          sg.addColorStop(0, starColor + "0)");
          sg.addColorStop(1, starColor + `${bri * 0.7})`);
          ctx.strokeStyle = sg;
          ctx.lineWidth = Math.min(s.s * bri * (1 + warmth * 0.8), 3);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
        }

        ctx.globalAlpha = bri * (isWarp ? (0.4 + warmth * 0.4) : 0.7);
        ctx.fillStyle = starColor + "1)";
        ctx.beginPath(); ctx.arc(sx, sy, s.s * bri * (isWarp ? (0.4 + warmth * 0.3) : 0.9), 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (isWarp) {
        planets.current.forEach(p => {
          if (warpT < p.triggerT || warpT > p.triggerT + p.dur) return;
          const localT = (warpT - p.triggerT) / p.dur;
          const depthCurve = Math.sin(localT * Math.PI);
          const scale = 0.2 + depthCurve * 1.2;
          const alpha = depthCurve * 0.65;
          if (alpha < 0.02) return;

          const px = CX + p.xBase * (1 - localT * 0.5);
          const py = CY + p.yBase + (localT - 0.5) * 100;
          const r = p.r * scale;

          ctx.save();
          ctx.globalAlpha = alpha;

          for (let i = 3; i >= 0; i--) {
            const ar = r + i * 10 * scale;
            const ag = ctx.createRadialGradient(px, py, r * 0.8, px, py, ar);
            ag.addColorStop(0, "transparent");
            ag.addColorStop(0.6, `hsla(${p.hue},60%,50%,${0.012 * (4 - i)})`);
            ag.addColorStop(1, "transparent");
            ctx.fillStyle = ag;
            ctx.beginPath(); ctx.arc(px, py, ar, 0, Math.PI * 2); ctx.fill();
          }

          ctx.save();
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
          const pbg = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.05, px, py, r);
          pbg.addColorStop(0, `hsla(${p.hue},${p.sat}%,50%,1)`);
          pbg.addColorStop(0.5, `hsla(${p.hue},${p.sat}%,30%,1)`);
          pbg.addColorStop(1, `hsla(${p.hue},${p.sat}%,10%,1)`);
          ctx.fillStyle = pbg;
          ctx.fillRect(px - r, py - r, r * 2, r * 2);

          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.sin(i) * 0.02})`;
            ctx.beginPath();
            ctx.ellipse(px, py - r * 0.5 + i * r * 0.3, r * 0.8, r * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          const shd = ctx.createLinearGradient(px - r, py, px + r * 0.6, py);
          shd.addColorStop(0, "transparent"); shd.addColorStop(0.5, "transparent"); shd.addColorStop(1, "rgba(0,0,10,0.65)");
          ctx.fillStyle = shd; ctx.fillRect(px - r, py - r, r * 2, r * 2);

          const spc = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px - r * 0.3, py - r * 0.3, r * 0.5);
          spc.addColorStop(0, "rgba(255,255,255,0.07)"); spc.addColorStop(1, "transparent");
          ctx.fillStyle = spc; ctx.fillRect(px - r, py - r, r * 2, r * 2);
          ctx.restore();

          if (p.ring) {
            for (let i = 0; i < 3; i++) {
              ctx.strokeStyle = `rgba(${180 + i * 20},${190 + i * 15},${230},${(0.35 - i * 0.08) * alpha})`;
              ctx.lineWidth = (3 - i * 0.7) * scale;
              ctx.beginPath();
              ctx.ellipse(px, py, r * (1.5 + i * 0.14), r * (0.2 + i * 0.02), -0.15, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          ctx.restore();
        });
      }

      if (isWarp && warpT < 0.95) {
        const ha = Math.min(1, warpT * 2) * (warpT < 0.85 ? 1 : (1 - (warpT - 0.85) / 0.1));
        ctx.save();
        ctx.globalAlpha = ha * 0.4;
        ctx.strokeStyle = "#4488cc";
        ctx.lineWidth = 1.5;

        ctx.beginPath(); ctx.moveTo(5, 40); ctx.lineTo(50, 55); ctx.lineTo(100, 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - 5, 40); ctx.lineTo(W - 50, 55); ctx.lineTo(W - 100, 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, H - 35); ctx.lineTo(70, H - 55); ctx.lineTo(140, H - 50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W - 5, H - 35); ctx.lineTo(W - 70, H - 55); ctx.lineTo(W - 140, H - 50); ctx.stroke();

        ctx.globalAlpha = ha * 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(CX, CY, 44, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(CX - 30, CY); ctx.lineTo(CX - 18, CY);
        ctx.moveTo(CX + 18, CY); ctx.lineTo(CX + 30, CY);
        ctx.moveTo(CX, CY - 30); ctx.lineTo(CX, CY - 18);
        ctx.moveTo(CX, CY + 18); ctx.lineTo(CX, CY + 30);
        ctx.stroke();

        ctx.globalAlpha = ha * 0.45;
        ctx.fillStyle = "#5599cc";
        ctx.font = "600 10px 'Sora',sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`SPD ${(warpT * 9.8 + 0.2).toFixed(1)}c`, 22, H - 65);
        ctx.fillText(`SECTOR 7-G`, 22, H - 50);

        ctx.textAlign = "right";
        ctx.fillText(`HULL 100%`, W - 22, H - 65);
        ctx.fillText(`WARP ACTIVE`, W - 22, H - 50);

        ctx.globalAlpha = ha * 0.3;
        ctx.fillStyle = "rgba(0,170,255,0.12)";
        ctx.fillRect(22, H - 78, 100, 3);
        ctx.fillStyle = `rgba(${150 + warpT * 105},${200 + warpT * 55},255,0.6)`;
        ctx.fillRect(22, H - 78, 100 * warpT, 3);

        ctx.restore();
      }

      if (menuMode) {
        if (fr.current % 5 === 0) {
          menuParts.current.push({
            x: Math.random() * W, y: H + 3,
            vy: -(Math.random() * 0.3 + 0.08), vx: (Math.random() - 0.5) * 0.15,
            l: 1, s: Math.random() * 1.2 + 0.3,
            hue: [200, 230, 260, 290][Math.floor(Math.random() * 4)],
          });
        }
        menuParts.current.forEach(p => { p.y += p.vy; p.x += p.vx; p.l -= 0.003; });
        menuParts.current = menuParts.current.filter(p => p.l > 0);
        menuParts.current.forEach(p => {
          ctx.globalAlpha = p.l * 0.18;
          ctx.fillStyle = `hsl(${p.hue},55%,65%)`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      const vig = ctx.createRadialGradient(CX, CY, H * 0.2, CX, CY, H * 0.65);
      vig.addColorStop(0, "transparent"); vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      raf.current = requestAnimationFrame(render);
    };
    raf.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf.current);
  }, [menuMode, warpT]);

  return (
    <div style={z.root} onTouchStart={() => initAudio(playerData.soundEnabled, playerData.musicEnabled, playerData.soundVolume, playerData.musicVolume)} onClick={() => initAudio(playerData.soundEnabled, playerData.musicEnabled, playerData.soundVolume, playerData.musicVolume)}>
      <canvas ref={cvs} width={W} height={H} style={z.cvs} />

      <div style={{ ...z.flash, opacity: whiteFlash, pointerEvents: "none" }} />

      {showShip && (
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:4,animation:"shipIn 0.7s cubic-bezier(0.34,1.4,0.64,1) forwards",pointerEvents:"none",filter:`drop-shadow(0 15px 50px ${hexToRgba(skin.accent, 0.2)})`}}>
          <div style={{position:"relative",width:280,height:340,animation:"bob 4s ease-in-out infinite"}}>
            {skin.customShip ? renderCustomShip(skin.shipType, undefined, playerData.equippedPilot || "rebel") : (
            <svg width="280" height="340" viewBox="0 0 280 340" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="hull" x1="140" y1="20" x2="140" y2="280" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={skin.hull.top}/><stop offset="40%" stopColor={skin.hull.mid}/><stop offset="100%" stopColor={skin.hull.bot}/>
                </linearGradient>
                <linearGradient id="wingLG" x1="0" y1="0" x2="1" y2="0.5">
                  <stop offset="0%" stopColor="#0c0c20"/><stop offset="100%" stopColor="#1e1e40"/>
                </linearGradient>
                <linearGradient id="wingRG" x1="1" y1="0" x2="0" y2="0.5">
                  <stop offset="0%" stopColor="#0c0c20"/><stop offset="100%" stopColor="#1e1e40"/>
                </linearGradient>
                <linearGradient id="ckG" x1="140" y1="55" x2="140" y2="155" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={skin.visor} stopOpacity="0.5"/><stop offset="50%" stopColor={darkenHex(skin.visor, 0.5)} stopOpacity="0.25"/><stop offset="100%" stopColor={darkenHex(skin.visor, 0.2)} stopOpacity="0.2"/>
                </linearGradient>
                <linearGradient id="fG" x1="140" y1="268" x2="140" y2="340" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={skin.flame} stopOpacity="0.9"/><stop offset="50%" stopColor={darkenHex(skin.accent)} stopOpacity="0.4"/><stop offset="100%" stopColor={darkenHex(skin.accent, 0.3)} stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="fC" x1="140" y1="270" x2="140" y2="320" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.75"/><stop offset="100%" stopColor={skin.accent} stopOpacity="0"/>
                </linearGradient>
                <radialGradient id="eG" cx="140" cy="278" r="55" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={skin.accent} stopOpacity="0.3"/><stop offset="100%" stopColor={darkenHex(skin.accent, 0.2)} stopOpacity="0"/>
                </radialGradient>
                <linearGradient id="nacL" x1="85" y1="155" x2="105" y2="155" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0e0e25"/><stop offset="100%" stopColor="#1a1a3e"/>
                </linearGradient>
                <linearGradient id="nacR" x1="195" y1="155" x2="175" y2="155" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0e0e25"/><stop offset="100%" stopColor="#1a1a3e"/>
                </linearGradient>
                <filter id="gl"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="gl2"><feGaussianBlur stdDeviation="5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>

              <ellipse cx="140" cy="282" rx="40" ry="55" fill="url(#eG)"/>
              <path d="M126 270 Q130 310 140 336 Q150 310 154 270" fill="url(#fG)"><animate attributeName="d" values="M126 270 Q130 310 140 336 Q150 310 154 270;M126 270 Q128 318 140 345 Q152 318 154 270;M126 270 Q130 310 140 336 Q150 310 154 270" dur="0.35s" repeatCount="indefinite"/></path>
              <path d="M134 270 Q136 298 140 316 Q144 298 146 270" fill="url(#fC)"><animate attributeName="d" values="M134 270 Q136 298 140 316 Q144 298 146 270;M134 270 Q135 305 140 325 Q145 305 146 270;M134 270 Q136 298 140 316 Q144 298 146 270" dur="0.25s" repeatCount="indefinite"/></path>
              <path d="M96 252 Q97 264 98 274 Q100 264 101 252" fill="url(#fG)" opacity="0.5"><animate attributeName="d" values="M96 252 Q97 264 98 274 Q100 264 101 252;M96 252 Q96 270 98 282 Q100 270 101 252;M96 252 Q97 264 98 274 Q100 264 101 252" dur="0.3s" repeatCount="indefinite"/></path>
              <path d="M179 252 Q180 264 182 274 Q184 264 185 252" fill="url(#fG)" opacity="0.5"><animate attributeName="d" values="M179 252 Q180 264 182 274 Q184 264 185 252;M179 252 Q179 270 182 282 Q184 270 185 252;M179 252 Q180 264 182 274 Q184 264 185 252" dur="0.3s" repeatCount="indefinite"/></path>

              <path d="M118 115 L12 192 L5 208 L20 214 L58 202 L116 165" fill="url(#wingLG)" stroke={hexToRgba(skin.accent, 0.12)} strokeWidth="0.7"/>
              <line x1="108" y1="125" x2="18" y2="198" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.5"/>
              <line x1="100" y1="140" x2="28" y2="202" stroke={hexToRgba(skin.accent, 0.04)} strokeWidth="0.5"/>
              <line x1="16" y1="206" x2="82" y2="182" stroke={hexToRgba(skin.accent, 0.22)} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="22" y1="211" x2="60" y2="198" stroke={hexToRgba(skin.accent, 0.1)} strokeWidth="1.5"/>
              <rect x="7" y="197" width="7" height="20" rx="2" fill="#0c0c22" stroke={hexToRgba(skin.accent, 0.15)} strokeWidth="0.7"/>
              <circle cx="10" cy="195" r="2.5" fill={skin.wingTipL} opacity="0.6" filter="url(#gl)"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/></circle>

              <path d="M162 115 L268 192 L275 208 L260 214 L222 202 L164 165" fill="url(#wingRG)" stroke={hexToRgba(skin.accent, 0.12)} strokeWidth="0.7"/>
              <line x1="172" y1="125" x2="262" y2="198" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.5"/>
              <line x1="180" y1="140" x2="252" y2="202" stroke={hexToRgba(skin.accent, 0.04)} strokeWidth="0.5"/>
              <line x1="264" y1="206" x2="198" y2="182" stroke={hexToRgba(skin.accent, 0.22)} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="258" y1="211" x2="220" y2="198" stroke={hexToRgba(skin.accent, 0.1)} strokeWidth="1.5"/>
              <rect x="266" y="197" width="7" height="20" rx="2" fill="#0c0c22" stroke={hexToRgba(skin.accent, 0.15)} strokeWidth="0.7"/>
              <circle cx="270" cy="195" r="2.5" fill={skin.wingTipR} opacity="0.5" filter="url(#gl)"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.5s" repeatCount="indefinite" begin="0.75s"/></circle>

              <path d="M80 185 L76 170 L86 155 L106 155 L110 170 L110 248 L102 256 L88 256 L80 248Z" fill="url(#nacL)" stroke={hexToRgba(skin.accent, 0.1)} strokeWidth="0.7"/>
              <rect x="84" y="160" width="20" height="3" rx="1" fill={hexToRgba(skin.accent, 0.12)}/>
              <rect x="86" y="195" width="16" height="1.5" rx="0.5" fill={hexToRgba(skin.accent, 0.06)}/>
              <rect x="86" y="215" width="16" height="1.5" rx="0.5" fill={hexToRgba(skin.accent, 0.06)}/>
              <rect x="86" y="235" width="16" height="1.5" rx="0.5" fill={hexToRgba(skin.accent, 0.06)}/>
              <rect x="83" y="245" width="22" height="9" rx="2" fill="#080818" stroke={hexToRgba(skin.accent, 0.2)} strokeWidth="0.7"/>
              <rect x="88" y="247" width="12" height="5" rx="1" fill={hexToRgba(skin.accent, 0.15)}/>

              <path d="M200 185 L204 170 L194 155 L174 155 L170 170 L170 248 L178 256 L192 256 L200 248Z" fill="url(#nacR)" stroke={hexToRgba(skin.accent, 0.1)} strokeWidth="0.7"/>
              <rect x="176" y="160" width="20" height="3" rx="1" fill={hexToRgba(skin.accent, 0.12)}/>
              <rect x="178" y="195" width="16" height="1.5" rx="0.5" fill={hexToRgba(skin.accent, 0.06)}/>
              <rect x="178" y="215" width="16" height="1.5" rx="0.5" fill={hexToRgba(skin.accent, 0.06)}/>
              <rect x="178" y="235" width="16" height="1.5" rx="0.5" fill={hexToRgba(skin.accent, 0.06)}/>
              <rect x="175" y="245" width="22" height="9" rx="2" fill="#080818" stroke={hexToRgba(skin.accent, 0.2)} strokeWidth="0.7"/>
              <rect x="180" y="247" width="12" height="5" rx="1" fill={hexToRgba(skin.accent, 0.15)}/>

              <path d="M140 22 L116 78 L110 140 L108 218 L113 255 L124 268 L156 268 L167 255 L172 218 L170 140 L164 78Z" fill="url(#hull)" stroke={hexToRgba(skin.accent, 0.1)} strokeWidth="0.8"/>
              <line x1="140" y1="28" x2="140" y2="265" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.7"/>
              <line x1="113" y1="98" x2="167" y2="98" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.5"/>
              <line x1="111" y1="150" x2="169" y2="150" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.5"/>
              <line x1="110" y1="195" x2="170" y2="195" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.5"/>
              <line x1="112" y1="238" x2="168" y2="238" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.5"/>
              <line x1="117" y1="88" x2="113" y2="232" stroke={hexToRgba(skin.accent, 0.05)} strokeWidth="1.2"/>
              <line x1="163" y1="88" x2="167" y2="232" stroke={hexToRgba(skin.accent, 0.05)} strokeWidth="1.2"/>
              <rect x="118" y="205" width="9" height="3" rx="1" fill="rgba(0,0,0,0.25)" stroke={hexToRgba(skin.accent, 0.08)} strokeWidth="0.4"/>
              <rect x="153" y="205" width="9" height="3" rx="1" fill="rgba(0,0,0,0.25)" stroke={hexToRgba(skin.accent, 0.08)} strokeWidth="0.4"/>
              <rect x="118" y="225" width="9" height="3" rx="1" fill="rgba(0,0,0,0.25)" stroke={hexToRgba(skin.accent, 0.08)} strokeWidth="0.4"/>
              <rect x="153" y="225" width="9" height="3" rx="1" fill="rgba(0,0,0,0.25)" stroke={hexToRgba(skin.accent, 0.08)} strokeWidth="0.4"/>
              <rect x="120" y="255" width="16" height="14" rx="3" fill="#0a0a22" stroke={hexToRgba(skin.accent, 0.18)} strokeWidth="0.7"/>
              <rect x="144" y="255" width="16" height="14" rx="3" fill="#0a0a22" stroke={hexToRgba(skin.accent, 0.18)} strokeWidth="0.7"/>
              <rect x="123" y="258" width="10" height="8" rx="2" fill={hexToRgba(skin.accent, 0.12)}/>
              <rect x="147" y="258" width="10" height="8" rx="2" fill={hexToRgba(skin.accent, 0.12)}/>

              <path d="M140 48 Q123 70 120 98 Q118 125 120 148 L160 148 Q162 125 160 98 Q157 70 140 48Z" fill="url(#ckG)" stroke={hexToRgba(skin.visor, 0.3)} strokeWidth="1.5"/>
              <path d="M140 50 Q126 72 123 98" stroke={hexToRgba(skin.visor, 0.1)} strokeWidth="0.6" fill="none"/>
              <path d="M140 50 Q154 72 157 98" stroke={hexToRgba(skin.visor, 0.1)} strokeWidth="0.6" fill="none"/>
              <line x1="121" y1="118" x2="159" y2="118" stroke={hexToRgba(skin.visor, 0.08)} strokeWidth="0.5"/>
              <path d="M137 52 Q127 74 125 98 Q124 112 125 125 L131 125 Q130 108 131 92 Q133 72 137 52Z" fill="rgba(255,255,255,0.04)"/>

              <circle cx="140" cy="86" r="15" fill="#2a2a52" stroke={hexToRgba(skin.accent, 0.1)} strokeWidth="0.6"/>
              <circle cx="140" cy="86" r="16" fill="none" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.4"/>
              <g transform="translate(128, 72)">
                <PilotHelmet pilotId={playerData.equippedPilot || "rebel"} size={24} />
              </g>
              <line x1="140" y1="72" x2="140" y2="99" stroke={hexToRgba(skin.visor, 0.08)} strokeWidth="0.4"/>
              <rect x="122" y="82" width="5" height="9" rx="2" fill="#1e1e42" stroke={hexToRgba(skin.accent, 0.08)} strokeWidth="0.4"/>
              <rect x="153" y="82" width="5" height="9" rx="2" fill="#1e1e42" stroke={hexToRgba(skin.accent, 0.08)} strokeWidth="0.4"/>
              <path d="M126 99 L122 108 L124 128 L140 131 L156 128 L158 108 L154 99" fill="#1e1e42" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.4"/>
              <path d="M126 99 L118 104 L120 114 L126 112" fill="#181840" stroke={hexToRgba(skin.accent, 0.05)} strokeWidth="0.4"/>
              <path d="M154 99 L162 104 L160 114 L154 112" fill="#181840" stroke={hexToRgba(skin.accent, 0.05)} strokeWidth="0.4"/>
              <circle cx="140" cy="112" r="3" fill={hexToRgba(skin.accent, 0.5)} filter="url(#gl)">
                <animate attributeName="r" values="3;3.5;3" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite"/>
              </circle>
              <line x1="129" y1="108" x2="151" y2="108" stroke={hexToRgba(skin.accent, 0.06)} strokeWidth="0.4"/>
              <line x1="131" y1="120" x2="149" y2="120" stroke={hexToRgba(skin.accent, 0.05)} strokeWidth="0.4"/>

              <line x1="140" y1="5" x2="140" y2="25" stroke={hexToRgba(skin.accent, 0.2)} strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="140" cy="4" r="3.5" fill={hexToRgba(skin.accent, 0.35)} filter="url(#gl)">
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite"/>
              </circle>
              <circle cx="140" cy="28" r="4" fill={hexToRgba(skin.accent, 0.1)} stroke={hexToRgba(skin.accent, 0.12)} strokeWidth="0.7"/>

              <ellipse cx="140" cy="160" rx="148" ry="178" fill="none" stroke={hexToRgba(skin.accent, 0.03)} strokeWidth="1.5">
                <animate attributeName="stroke-opacity" values="0.03;0.07;0.03" dur="3s" repeatCount="indefinite"/>
              </ellipse>
            </svg>
            )}
          </div>
        </div>
      )}

      <div style={z.ui}>
        {showTitle && (
          <div style={{ ...z.top, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={z.bsL}>BEST DISTANCE</p>
              <p style={z.bsV}>{bestDistance > 0 ? formatDistance(bestDistance) : "0 km"}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {playerData.loginStreak > 1 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 12,
                  background: "rgba(255,170,0,0.05)",
                  border: "1px solid rgba(255,170,0,0.08)",
                }}>
                  <Flame size={11} color="#ffaa00" />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#ffaa00", letterSpacing: 1 }}>
                    {playerData.loginStreak} DAY STREAK
                  </span>
                </div>
              )}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <Gem size={14} color="#ffaa00" />
                <span style={{ fontSize: 15, fontWeight: 700, color: "#ffaa00", fontFamily: "'Sora',sans-serif" }}>
                  {(playerData?.coins || 0).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => { playClick(); setSheet("settings"); }}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  width: 36, height: 36,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <SettingsIcon size={16} color="rgba(255,255,255,0.4)" />
              </button>
            </div>
          </div>
        )}
        {showTitle && <div style={z.titA}><h1 style={z.tit}><span style={z.titW}>SHOOT</span><span style={{ ...z.titB, color: skin.accent, textShadow: `0 0 40px ${hexToRgba(skin.accent, 0.5)},0 0 100px ${hexToRgba(skin.accent, 0.15)}` }}>BLAST</span></h1><p style={z.sub}>DEEP SPACE DEFENDER</p></div>}
        <div style={{ flex: 1 }} />
        {showPlay && <div style={z.pa}><button style={{ ...z.pb, background: `linear-gradient(135deg,${skin.accent},${darkenHex(skin.accent)})`, animation: "none", boxShadow: `0 4px 30px ${hexToRgba(skin.accent, 0.3)}`, ...(bp ? z.pbp : {}) }} onTouchStart={() => setBp(true)} onTouchEnd={() => { setBp(false); playConfirm(); stopAmbient(); onPlay && onPlay(); }} onMouseDown={() => setBp(true)} onMouseUp={() => { setBp(false); playConfirm(); stopAmbient(); onPlay && onPlay(); }}><Play size={22} fill="#fff" stroke="none" /><span style={z.pt}>PLAY</span></button></div>}
        {showCards && (() => {
          const mData = getMissions();
          const unclaimedCount = mData.missions.filter(m => !m.claimed).length;
          const pendingCoins = getPendingStationCoins();
          return <div style={z.cards}>{[
          { k: "missions", l: "Missions", s: unclaimedCount > 0 ? `${unclaimedCount} active` : "All done", I: Target, c: "#00aaff" },
          { k: "station", l: "Station", s: pendingCoins > 0 ? `+${pendingCoins}` : "Build & buff", I: Building, c: "#00ddaa", badge: pendingCoins > 0 },
          { k: "hangar", l: "Hangar", s: `${SKINS.length} ships`, I: Rocket, c: "#aa55ff" },
          { k: "armory", l: "Armory", s: `${WEAPONS.length} weapons`, I: Crosshair, c: "#ff5544" },
          { k: "awards", l: "Awards", s: `${(playerData.achievements?.unlocked || []).length}/${ACHIEVEMENTS.length}`, I: Trophy, c: "#ffaa00" },
          { k: "stats", l: "Stats", s: "Lifetime", I: BarChart3, c: "#00ddaa" },
        ].map(c => (
          <button key={c.k} style={{ ...z.card, ...(c.k === "hangar" ? { borderColor: hexToRgba(skin.accent, 0.15) } : {}) }} onClick={() => { if (c.k === "station") { playSheetOpen(); setShowStation(true); } else { playSheetOpen(); setSheet(c.k); } }}>
            <div style={{ ...z.ci, background: `${c.c}10`, border: `1px solid ${c.c}20`, position: "relative" }}>
              <c.I size={17} color={c.c} strokeWidth={2} />
              {c.badge && <div style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#ff4444", border: "1.5px solid rgba(4,4,16,0.98)" }} />}
            </div>
            <span style={z.cl}>{c.l}</span><span style={z.cs}>{c.s}</span>
          </button>
        ))}</div>;
        })()}
      </div>

      {sheet && <div style={z.shBg} onClick={() => { playSheetClose(); setSheet(null); }}><div style={z.sh} onClick={e => e.stopPropagation()}>
        <div style={z.shTop}><h2 style={z.shT}>{sheet.charAt(0).toUpperCase() + sheet.slice(1)}</h2><button style={z.shX} onClick={() => { playSheetClose(); setSheet(null); }}><X size={16} color="rgba(255,255,255,0.5)" /></button></div>
        <div style={z.shB}>
          {sheet === "missions" && (() => {
            const mData = getMissions();
            const missions = mData.missions;
            const formatDist = (km) => {
              if (km < 1000) return `${Math.floor(km)} km`;
              if (km < 1_000_000) return `${(km/1000).toFixed(1)}K km`;
              if (km < 1_000_000_000) return `${(km/1_000_000).toFixed(1)}M km`;
              return `${(km/1_000_000_000).toFixed(2)}B km`;
            };

            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const hoursLeft = Math.ceil((midnight - now) / 3600000);

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
                    Complete for coin rewards
                  </p>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <Clock size={12} color="rgba(255,255,255,0.3)" />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                      {hoursLeft}h left
                    </span>
                  </div>
                </div>

                {missions.map((m, i) => {
                  const done = m.progress >= m.target;
                  const pct = Math.min(100, (m.progress / m.target) * 100);
                  const MIcon = MISSION_POOL.find(mp => mp.id === m.templateId)?.Icon || Target;

                  let displayText = m.text;
                  if (m.formatTarget) {
                    displayText = m.text.replace("FORMAT_DISTANCE", formatDist(m.target));
                  }

                  let progressText;
                  if (m.formatTarget) {
                    progressText = `${formatDist(Math.min(m.progress, m.target))} / ${formatDist(m.target)}`;
                  } else {
                    progressText = `${Math.min(m.progress, m.target)} / ${m.target}`;
                  }

                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "14px", borderRadius: 14, marginBottom: 8,
                      background: done
                        ? (m.claimed ? "rgba(255,255,255,0.01)" : "rgba(0,220,120,0.04)")
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${done
                        ? (m.claimed ? "rgba(255,255,255,0.03)" : "rgba(0,220,120,0.1)")
                        : "rgba(255,255,255,0.04)"}`,
                      opacity: m.claimed ? 0.45 : 1,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: done ? "rgba(0,220,120,0.08)" : `${skin.accent}08`,
                        border: `1px solid ${done ? "rgba(0,220,120,0.15)" : `${skin.accent}15`}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <MIcon size={16} color={done ? "#00dd78" : skin.accent} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: m.claimed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)",
                          display: "block", marginBottom: 8,
                          textDecoration: m.claimed ? "line-through" : "none",
                        }}>
                          {displayText}
                        </span>
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 2,
                            width: `${pct}%`,
                            background: done
                              ? "#00dd78"
                              : `linear-gradient(90deg, ${skin.accent}, ${darkenHex(skin.accent)})`,
                            transition: "width 0.3s",
                          }} />
                        </div>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 4, display: "block" }}>
                          {progressText}
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 50 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Gem size={13} color={m.claimed ? "#666" : "#ffaa00"} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: m.claimed ? "#666" : "#ffaa00" }}>
                            {m.reward}
                          </span>
                        </div>
                        {done && !m.claimed && (
                          <button
                            onClick={() => {
                              playCoinCollect();
                              const newData = claimMission(i);
                              onDataChange(newData);
                            }}
                            style={{
                              fontSize: 8, fontWeight: 700, color: "#fff",
                              padding: "4px 12px", borderRadius: 8,
                              background: "linear-gradient(135deg, #00dd78, #00aa55)",
                              border: "none", cursor: "pointer",
                              letterSpacing: 1,
                              boxShadow: "0 2px 8px rgba(0,220,120,0.25)",
                            }}
                          >
                            CLAIM
                          </button>
                        )}
                        {m.claimed && (
                          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: 1 }}>
                            DONE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {sheet === "hangar" && (
            <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setHangarMode("ships")} style={{
                flex: 1, padding: "10px", borderRadius: 10,
                background: hangarMode === "ships" ? "#00aaff" : "rgba(255,255,255,0.05)",
                color: hangarMode === "ships" ? "#000" : "#888",
                border: "none", fontWeight: 600, fontSize: 11, letterSpacing: 1.5, cursor: "pointer",
                fontFamily: "'Sora',sans-serif",
              }}>SHIPS</button>
              <button onClick={() => setHangarMode("pilots")} style={{
                flex: 1, padding: "10px", borderRadius: 10,
                background: hangarMode === "pilots" ? "#00aaff" : "rgba(255,255,255,0.05)",
                color: hangarMode === "pilots" ? "#000" : "#888",
                border: "none", fontWeight: 600, fontSize: 11, letterSpacing: 1.5, cursor: "pointer",
                fontFamily: "'Sora',sans-serif",
              }}>PILOTS</button>
              <button onClick={() => setHangarMode("drones")} style={{
                flex: 1, padding: "10px", borderRadius: 10,
                background: hangarMode === "drones" ? "#00aaff" : "rgba(255,255,255,0.05)",
                color: hangarMode === "drones" ? "#000" : "#888",
                border: "none", fontWeight: 600, fontSize: 11, letterSpacing: 1.5, cursor: "pointer",
                fontFamily: "'Sora',sans-serif",
              }}>DRONES</button>
            </div>
            {hangarMode === "pilots" && (
              <div style={z.sg}>
                {PILOTS.map(pl => {
                  const owned = (playerData.ownedPilots || ["rebel"]).includes(pl.id);
                  const equipped = (playerData.equippedPilot || "rebel") === pl.id;
                  const canAfford = playerData.coins >= pl.price;
                  const tagCol = getPilotTagColor(pl.tag);

                  return (
                    <div key={pl.id} style={{
                      ...z.sc,
                      borderColor: equipped ? (pl.accent === "#222244" ? "#6666aa" : pl.accent) : "rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ width: 60, height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PilotHelmet pilotId={pl.id} size={48} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: pl.accent === "#222244" ? "#8888cc" : pl.accent, letterSpacing: 2 }}>
                        {pl.name}
                      </span>
                      <span style={{
                        fontSize: 7, fontWeight: 600, color: tagCol,
                        letterSpacing: 2, padding: "2px 6px",
                        border: `1px solid ${tagCol}44`,
                        borderRadius: 4,
                      }}>
                        {pl.tag}
                      </span>
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>
                        {pl.bonus.label}
                      </span>

                      {equipped && (
                        <span style={{ fontSize: 7, color: "#00dd78", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                          <Check size={10} /> ACTIVE
                        </span>
                      )}

                      {owned && !equipped && (
                        <button
                          onClick={() => {
                            playConfirm();
                            const newData = equipPilot(pl.id);
                            onDataChange(newData);
                          }}
                          style={{
                            fontSize: 8, fontWeight: 700, color: "#fff",
                            background: pl.accent === "#222244" ? "#6666aa" : pl.accent, border: "none",
                            borderRadius: 6, padding: "4px 14px", cursor: "pointer",
                            fontFamily: "'Sora',sans-serif",
                          }}
                        >
                          SELECT
                        </button>
                      )}

                      {!owned && (
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            if (!canAfford) return;
                            playPurchase();
                            const result = buyPilot(pl.id, pl.price);
                            if (result.success) onDataChange(result.data);
                          }}
                          style={{
                            fontSize: 9, fontWeight: 700,
                            color: canAfford ? "#fff" : "rgba(255,255,255,0.25)",
                            background: canAfford ? (pl.accent === "#222244" ? "#6666aa" : pl.accent) : "rgba(255,255,255,0.05)",
                            border: canAfford ? "none" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 6, padding: "4px 14px", cursor: canAfford ? "pointer" : "default",
                            display: "flex", alignItems: "center", gap: 4,
                            opacity: canAfford ? 1 : 0.5,
                            fontFamily: "'Sora',sans-serif",
                          }}
                        >
                          <Gem size={11} color={canAfford ? "#fff" : "#666"} />
                          BUY & EQUIP · {pl.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {hangarMode === "ships" && (
            <div style={z.sg}>
              {SKINS.map(sk => {
                const owned = playerData.ownedSkins.includes(sk.id);
                const equipped = playerData.equippedSkin === sk.id;
                const canAfford = playerData.coins >= sk.price;
                const tagCol = getTagColor(sk.tag);

                return (
                  <div key={sk.id} style={{
                    ...z.sc,
                    borderColor: equipped ? sk.accent : "rgba(255,255,255,0.04)",
                  }}>
                    {sk.customShip ? (
                      <div style={{ width: 40, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {renderCustomShip(sk.shipType, 40)}
                      </div>
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: `linear-gradient(135deg, ${sk.accent}, ${darkenHex(sk.accent)})`,
                        boxShadow: `0 0 16px ${hexToRgba(sk.accent, 0.4)}`,
                      }} />
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, color: sk.accent, letterSpacing: 2 }}>
                      {sk.name}
                    </span>
                    <span style={{
                      fontSize: 7, fontWeight: 600, color: tagCol,
                      letterSpacing: 2, padding: "2px 6px",
                      border: `1px solid ${hexToRgba(tagCol, 0.3)}`,
                      borderRadius: 4,
                    }}>
                      {sk.tag}
                    </span>

                    {equipped && (
                      <span style={{ fontSize: 7, color: "#00dd78", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                        <Check size={10} /> ACTIVE
                      </span>
                    )}

                    {owned && !equipped && (
                      <button
                        onClick={() => {
                          playConfirm();
                          const newData = equipSkin(sk.id);
                          onDataChange(newData);
                        }}
                        style={{
                          fontSize: 8, fontWeight: 700, color: "#fff",
                          background: sk.accent, border: "none",
                          borderRadius: 6, padding: "4px 14px", cursor: "pointer",
                        }}
                      >
                        SELECT
                      </button>
                    )}

                    {!owned && (
                      <button
                        disabled={!canAfford}
                        onClick={() => {
                          if (!canAfford) return;
                          playPurchase();
                          const result = buySkin(sk.id, sk.price);
                          if (result.success) onDataChange(result.data);
                        }}
                        style={{
                          fontSize: 9, fontWeight: 700,
                          color: canAfford ? "#fff" : "rgba(255,255,255,0.25)",
                          background: canAfford ? sk.accent : "rgba(255,255,255,0.05)",
                          border: canAfford ? "none" : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 6, padding: "4px 14px", cursor: canAfford ? "pointer" : "default",
                          display: "flex", alignItems: "center", gap: 4,
                          opacity: canAfford ? 1 : 0.5,
                        }}
                      >
                        <Gem size={11} color={canAfford ? "#fff" : "#666"} />
                        BUY & EQUIP · {sk.price.toLocaleString()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            )}
            {hangarMode === "drones" && (() => {
              const drBuffsCheck = getActiveBuffs();
              const droneBayUnlocked = drBuffsCheck.drone_slots > 0;
              const maxDroneSlots = drBuffsCheck.drone_slots || 0;

              if (!droneBayUnlocked) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
                    <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: 2, margin: 0 }}>DRONES LOCKED</h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>Build a Drone Bay in your Space Station to unlock drone purchases.</p>
                    <p style={{ color: "#88ddff", fontSize: 11, marginTop: 4 }}>{"Requires: Command Center Lv2 \u2192 Drone Bay"}</p>
                  </div>
                );
              }

              return (<div>
                <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 8 }}>EQUIPPED ({(playerData.equippedDrones || []).length}/{maxDroneSlots})</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[...Array(maxDroneSlots)].map((_, slot) => {
                      const droneId = (playerData.equippedDrones || [])[slot];
                      const drone = droneId ? getDrone(droneId) : null;
                      return (
                        <div key={slot} style={{
                          flex: 1, padding: "8px", borderRadius: 8, textAlign: "center",
                          background: drone ? `${drone.color}15` : "rgba(255,255,255,0.02)",
                          border: drone ? `1px solid ${drone.color}44` : "1px dashed rgba(255,255,255,0.1)",
                          cursor: drone ? "pointer" : "default",
                        }} onClick={() => { if (drone) { playClick(); onDataChange(unequipDrone(slot)); } }}>
                          {drone ? (
                            <>
                              <div style={{ width: 20, height: 20, borderRadius: 10, background: drone.color, margin: "0 auto 4px", boxShadow: `0 0 8px ${drone.color}66` }} />
                              <span style={{ fontSize: 7, fontWeight: 700, color: drone.color, letterSpacing: 1 }}>{drone.name}</span>
                              <p style={{ fontSize: 6, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>TAP TO REMOVE</p>
                            </>
                          ) : (
                            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", fontWeight: 600 }}>EMPTY</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={z.sg}>
                  {DRONES.map(drone => {
                    const isOwned = (playerData.ownedDrones || []).includes(drone.id);
                    const isEquipped = (playerData.equippedDrones || []).includes(drone.id);
                    const drnDiscount = 1 - (drBuffsCheck.drone_discount || 0);
                    const drnPrice = Math.floor(drone.price * drnDiscount);
                    const canAfford = playerData.coins >= drnPrice;
                    const slotsFull = (playerData.equippedDrones || []).length >= maxDroneSlots;
                    const tagCol = getDroneTagColor(drone.tag);
                    return (
                      <div key={drone.id} style={{ ...z.sc, borderColor: isEquipped ? drone.color : "rgba(255,255,255,0.04)" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 18, background: `${drone.color}20`, border: `1px solid ${drone.color}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 18, height: 18, borderRadius: 9, background: drone.color, boxShadow: `0 0 10px ${drone.color}88` }} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: drone.color, letterSpacing: 2 }}>{drone.name}</span>
                        <span style={{ fontSize: 7, fontWeight: 600, color: tagCol, letterSpacing: 2, padding: "2px 6px", border: `1px solid ${tagCol}44`, borderRadius: 4 }}>{drone.tag}</span>
                        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", fontWeight: 500, textAlign: "center", lineHeight: 1.3 }}>{drone.desc}</span>
                        <div style={{ display: "flex", gap: 6, fontSize: 7, color: "rgba(255,255,255,0.3)" }}>
                          <span>DMG {drone.bulletDmg}</span>
                          <span>{"\u00b7"}</span>
                          <span>SPD {drone.bulletSpeed}</span>
                        </div>
                        {isEquipped && (
                          <span style={{ fontSize: 7, color: "#00dd78", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                            <Check size={10} /> EQUIPPED
                          </span>
                        )}
                        {isOwned && !isEquipped && !slotsFull && (
                          <button onClick={() => { playConfirm(); onDataChange(equipDrone(drone.id, (playerData.equippedDrones || []).length)); }} style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: drone.color, border: "none", borderRadius: 6, padding: "4px 14px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>EQUIP</button>
                        )}
                        {isOwned && !isEquipped && slotsFull && (
                          <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>SLOTS FULL</span>
                        )}
                        {!isOwned && (
                          <button disabled={!canAfford} onClick={() => { if (!canAfford) return; playPurchase(); const result = buyDrone(drone.id, drnPrice); if (result.success) onDataChange(result.data); }} style={{ fontSize: 9, fontWeight: 700, color: canAfford ? "#fff" : "rgba(255,255,255,0.25)", background: canAfford ? drone.color : "rgba(255,255,255,0.05)", border: canAfford ? "none" : "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 14px", cursor: canAfford ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4, opacity: canAfford ? 1 : 0.5, fontFamily: "'Sora',sans-serif" }}>
                            <Gem size={11} color={canAfford ? "#fff" : "#666"} />
                            {drnPrice.toLocaleString()}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>);
            })()}
            </div>
          )}
          {sheet === "armory" && (() => {
            const ownedWeapons = playerData.ownedWeapons || [{ id: "blaster", level: 0 }];
            const equippedId = playerData.equippedWeapon || "blaster";
            const weaponsUnlocked = playerData.station?.weaponsUnlocked || ["blaster"];

            return (
              <div>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 16 }}>
                  Select & upgrade your weapons
                </p>
                {WEAPONS.map(wp => {
                  const isWeaponUnlocked = weaponsUnlocked.includes(wp.id);
                  const ownedEntry = ownedWeapons.find(o => o.id === wp.id);
                  const owned = !!ownedEntry;
                  const level = owned ? ownedEntry.level : 0;
                  const equipped = equippedId === wp.id;
                  const canBuy = isWeaponUnlocked && !owned && playerData.coins >= wp.price;
                  const stBuffs = getActiveBuffs();
                  const wpnDiscount = 1 - (stBuffs.upgrade_discount || 0);
                  const wpnUpCost = level < MAX_WEAPON_LEVEL ? Math.floor(wp.upgradeCosts[level + 1] * wpnDiscount) : 0;
                  const canUpgrade = owned && level < MAX_WEAPON_LEVEL && playerData.coins >= wpnUpCost;
                  const stats = wp.levels[level];
                  const maxStats = wp.levels[MAX_WEAPON_LEVEL];
                  const nextStats = level < MAX_WEAPON_LEVEL ? wp.levels[level + 1] : null;

                  // Locked weapon - not yet unlocked via Weapons Lab
                  if (!isWeaponUnlocked) {
                    const labLevel = STATION_MODULES.find(m => m.id === "weapons_lab")?.levels.findIndex(l => l.unlocksWeapon === wp.id);
                    const reqLevel = labLevel != null ? labLevel + 1 : "?";
                    return (
                      <div key={wp.id} style={{
                        padding: "14px 16px", borderRadius: 14, marginBottom: 8,
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.04)",
                        opacity: 0.4,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Lock size={14} color="rgba(255,255,255,0.3)" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1.5, display: "block" }}>
                              {wp.name}
                            </span>
                            <span style={{ fontSize: 9, color: "#ff5544", display: "block", marginTop: 2 }}>
                              LOCKED
                            </span>
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", display: "block", marginTop: 1 }}>
                              Build Weapons Lab Lv{reqLevel} to unlock
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={wp.id} style={{
                      padding: "14px 16px", borderRadius: 14, marginBottom: 8,
                      background: equipped ? `${wp.color}08` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${equipped ? hexToRgba(wp.color, 0.2) : "rgba(255,255,255,0.04)"}`,
                      position: "relative", overflow: "hidden",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${wp.color}15`,
                          border: `1px solid ${wp.color}30`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: "50%",
                            background: wp.color,
                            boxShadow: `0 0 10px ${wp.color}`,
                          }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: wp.color, letterSpacing: 1.5, display: "block" }}>
                            {wp.name}
                          </span>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginTop: 2 }}>
                            {wp.desc}
                          </span>
                        </div>
                        {owned && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: wp.color, letterSpacing: 0.5 }}>
                              LV.{level + 1}
                            </span>
                            <div style={{ width: 48, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${((level + 1) / 20) * 100}%`,
                                background: wp.color,
                                transition: "width 0.3s",
                              }} />
                            </div>
                            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)" }}>/20</span>
                          </div>
                        )}
                      </div>

                      {/* Stat bars */}
                      {owned && (
                        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                          {[
                            { label: "DMG", val: stats.dmg, max: maxStats.dmg, next: nextStats?.dmg },
                            { label: "RATE", val: (1000 / stats.fireRate), max: (1000 / wp.levels[MAX_WEAPON_LEVEL].fireRate), next: nextStats ? (1000 / nextStats.fireRate) : null },
                            { label: "BULLETS", val: stats.bullets, max: maxStats.bullets, next: nextStats?.bullets },
                          ].map(s => (
                            <div key={s.label} style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                                <span style={{ fontSize: 7, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>
                                  {s.label}
                                </span>
                                {s.next != null && s.next > s.val && (
                                  <span style={{ fontSize: 7, color: "#00dd78", fontWeight: 600 }}>
                                    {Math.round(s.val * 10) / 10}→{Math.round(s.next * 10) / 10} ↑
                                  </span>
                                )}
                              </div>
                              <div style={{ height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: 1.5,
                                  width: `${Math.min(100, (s.val / s.max) * 100)}%`,
                                  background: wp.color,
                                  transition: "width 0.3s",
                                }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {equipped && (
                          <span style={{ fontSize: 8, color: "#00dd78", fontWeight: 700, display: "flex", alignItems: "center", gap: 3, letterSpacing: 1 }}>
                            <Check size={10} /> EQUIPPED
                          </span>
                        )}
                        {owned && !equipped && (
                          <button
                            onClick={() => {
                              playConfirm();
                              onDataChange(equipWeapon(wp.id));
                            }}
                            style={{
                              fontSize: 8, fontWeight: 700, color: "#fff",
                              background: wp.color, border: "none",
                              borderRadius: 6, padding: "5px 14px", cursor: "pointer",
                              letterSpacing: 1,
                            }}
                          >
                            EQUIP
                          </button>
                        )}
                        {owned && level < MAX_WEAPON_LEVEL && (
                          <button
                            disabled={!canUpgrade}
                            onClick={() => {
                              if (!canUpgrade) return;
                              const result = upgradeWeapon(wp.id, wpnUpCost);
                              if (result.success) {
                                setUpgradeAnim({ weaponId: wp.id, fromLevel: level, toLevel: level + 1, timer: 0 });
                                onDataChange(result.data);
                                playUpgrade();
                                setTimeout(() => setUpgradeAnim(null), 1500);
                              }
                            }}
                            style={{
                              fontSize: 8, fontWeight: 700,
                              color: canUpgrade ? "#fff" : "rgba(255,255,255,0.25)",
                              background: canUpgrade ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                              border: canUpgrade ? `1px solid ${wp.color}40` : "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 6, padding: "5px 12px", cursor: canUpgrade ? "pointer" : "default",
                              display: "flex", alignItems: "center", gap: 4,
                              opacity: canUpgrade ? 1 : 0.5,
                            }}
                          >
                            UPGRADE <Gem size={9} color={canUpgrade ? "#ffaa00" : "#666"} /> {wpnUpCost.toLocaleString()}
                          </button>
                        )}
                        {owned && level >= MAX_WEAPON_LEVEL && (
                          <span style={{ fontSize: 8, color: "rgba(255,170,0,0.6)", fontWeight: 700, letterSpacing: 1 }}>
                            MAX LEVEL
                          </span>
                        )}
                        {!owned && (
                          <button
                            disabled={!canBuy}
                            onClick={() => {
                              if (!canBuy) return;
                              playPurchase();
                              const result = buyWeapon(wp.id, wp.price);
                              if (result.success) onDataChange(result.data);
                            }}
                            style={{
                              fontSize: 9, fontWeight: 700,
                              color: canBuy ? "#fff" : "rgba(255,255,255,0.25)",
                              background: canBuy ? wp.color : "rgba(255,255,255,0.05)",
                              border: canBuy ? "none" : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 6, padding: "5px 16px", cursor: canBuy ? "pointer" : "default",
                              display: "flex", alignItems: "center", gap: 4,
                              opacity: canBuy ? 1 : 0.5,
                            }}
                          >
                            <Gem size={11} color={canBuy ? "#fff" : "#666"} />
                            BUY & EQUIP · {wp.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                      {upgradeAnim && upgradeAnim.weaponId === wp.id && (
                        <div style={{
                          position: "absolute",
                          top: 0, left: 0, right: 0, bottom: 0,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          background: "rgba(0,0,0,0.7)",
                          borderRadius: 14,
                          pointerEvents: "none",
                          animation: "upgradeOverlayFadeIn 0.15s ease-out",
                          zIndex: 10,
                        }}>
                          {/* Radial burst */}
                          <div style={{
                            position: "absolute",
                            width: 100, height: 100,
                            animation: "upgradeOverlayRotate 1.5s linear",
                          }}>
                            {[...Array(12)].map((_, i) => (
                              <div key={i} style={{
                                position: "absolute",
                                top: "50%", left: "50%",
                                width: 3, height: 30,
                                background: "linear-gradient(to top, transparent, #00aaff)",
                                transformOrigin: "top center",
                                transform: `rotate(${i * 30}deg) translateY(-40px)`,
                                animation: "upgradeOverlayBurstRay 0.6s ease-out",
                              }} />
                            ))}
                          </div>
                          {/* Level text */}
                          <div style={{
                            display: "flex", alignItems: "center", gap: 12,
                            animation: "upgradeOverlayPopIn 0.4s ease-out",
                            zIndex: 2,
                          }}>
                            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 700, textDecoration: "line-through" }}>
                              LV.{upgradeAnim.fromLevel + 1}
                            </div>
                            <div style={{ fontSize: 18, color: "#00aaff", fontWeight: 900 }}>→</div>
                            <div style={{
                              fontSize: 22, color: "#00ffaa", fontWeight: 900,
                              textShadow: "0 0 12px #00ffaa",
                              animation: "upgradeOverlayGlow 0.8s ease-out",
                            }}>
                              LV.{upgradeAnim.toLevel + 1}
                            </div>
                          </div>
                          {/* "UPGRADED!" text */}
                          <div style={{
                            position: "absolute", bottom: 12,
                            fontSize: 11, color: "#00ffaa", fontWeight: 800,
                            letterSpacing: 3,
                            animation: "upgradeOverlaySlideUp 0.6s ease-out",
                          }}>UPGRADED!</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {sheet === "awards" && (() => {
            const achData = playerData.achievements || { unlocked: [], progress: {} };
            const unlocked = achData.unlocked || [];
            const progress = achData.progress || {};
            const totalReward = ACHIEVEMENTS.reduce((sum, a) => sum + a.reward, 0);
            const earnedReward = ACHIEVEMENTS.filter(a => unlocked.includes(a.id)).reduce((sum, a) => sum + a.reward, 0);

            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h2 style={z.shT}>Achievements</h2>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginTop: 2 }}>
                      {unlocked.length} / {ACHIEVEMENTS.length} unlocked
                    </p>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 8,
                    background: "rgba(255,170,0,0.05)",
                    border: "1px solid rgba(255,170,0,0.1)",
                  }}>
                    <Gem size={11} color="#ffaa00" />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#ffaa00" }}>
                      {earnedReward.toLocaleString()} / {totalReward.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Overall progress bar */}
                <div style={{
                  height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)",
                  overflow: "hidden", marginBottom: 12,
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%`,
                    background: "linear-gradient(90deg, #ffaa00, #ff8800)",
                    transition: "width 0.5s",
                  }} />
                </div>

                {/* Category tabs - horizontal scroll */}
                <div style={{
                  display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8, marginBottom: 10,
                  scrollbarWidth: "none", msOverflowStyle: "none",
                }}>
                  {ACHIEVEMENT_CATEGORIES.map(cat => {
                    const items = getAchievementsByCategory(cat.id);
                    const catUnlocked = items.filter(a => unlocked.includes(a.id)).length;
                    const isSelected = (achCat || "kills") === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setAchCat(cat.id); playClick(); }}
                        style={{
                          padding: "5px 10px", borderRadius: 8, border: "1px solid",
                          borderColor: isSelected ? cat.color : "rgba(255,255,255,0.06)",
                          background: isSelected ? `${cat.color}12` : "rgba(255,255,255,0.02)",
                          cursor: "pointer", flexShrink: 0, display: "flex", flexDirection: "column",
                          alignItems: "center", gap: 2, minWidth: 70,
                        }}
                      >
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: isSelected ? cat.color : "rgba(255,255,255,0.3)" }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: 8, color: isSelected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)" }}>
                          {catUnlocked}/{items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Achievement list for selected category */}
                {(() => {
                  const selectedCat = achCat || "kills";
                  const cat = getCategory(selectedCat);
                  const catColor = cat ? cat.color : "#ffaa00";
                  return getAchievementsByCategory(selectedCat).map(ach => {
                    const isUnlocked = unlocked.includes(ach.id);
                    const currentValue = progress[ach.id] || 0;
                    const pct = Math.min(100, (currentValue / ach.target) * 100);

                    return (
                      <div key={ach.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 10, marginBottom: 5,
                        background: isUnlocked ? `${catColor}08` : "rgba(255,255,255,0.015)",
                        border: `1px solid ${isUnlocked ? `${catColor}20` : "rgba(255,255,255,0.04)"}`,
                        opacity: isUnlocked ? 1 : 0.6,
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8,
                          background: isUnlocked ? `${catColor}15` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isUnlocked ? `${catColor}30` : "rgba(255,255,255,0.05)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, fontSize: 16,
                        }}>
                          {isUnlocked ? "🏆" : <Lock size={13} color="rgba(255,255,255,0.2)" />}
                        </div>

                        <div style={{ flex: 1 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                            color: isUnlocked ? "#fff" : "rgba(255,255,255,0.4)",
                            display: "block", marginBottom: 2,
                          }}>
                            {ach.name}
                          </span>
                          <span style={{
                            fontSize: 9, color: "rgba(255,255,255,0.25)", display: "block", marginBottom: 4,
                          }}>
                            {ach.desc}
                          </span>
                          {!isUnlocked && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: 1.5,
                                  width: `${pct}%`,
                                  background: `${catColor}50`,
                                }} />
                              </div>
                              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
                                {fmtAchNum(currentValue)}/{fmtAchNum(ach.target)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                          {isUnlocked
                            ? <Check size={14} color="#00dd78" />
                            : <>
                                <Gem size={9} color={`${catColor}66`} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: `${catColor}66` }}>{ach.reward >= 1000 ? `${(ach.reward/1000).toFixed(0)}K` : ach.reward}</span>
                              </>
                          }
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            );
          })()}
          {sheet === "settings" && (
            <>
              <VolumeSlider
                icon={<Volume2 size={18} />}
                label="Sound Effects"
                value={playerData.soundVolume ?? 70}
                onChange={(v) => {
                  setSoundVolume(v);
                  const d = updateSettings("soundVolume", v);
                  onDataChange(updateSettings("soundEnabled", v > 0));
                  if (v > 0) playClick();
                }}
                accent={skin.accent}
              />
              <VolumeSlider
                icon={<Music size={18} />}
                label="Music"
                value={playerData.musicVolume ?? 50}
                onChange={(v) => {
                  setMusicVolume(v);
                  if (v > 0) startAmbient(); else stopAmbient();
                  const d = updateSettings("musicVolume", v);
                  onDataChange(updateSettings("musicEnabled", v > 0));
                }}
                accent={skin.accent}
              />
              <SettingRow icon={<Smartphone size={18} />} label="Vibration" value={playerData.vibrationEnabled} onChange={(v) => onDataChange(updateSettings("vibrationEnabled", v))} accent={skin.accent} />
              <div style={z.setRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Crosshair size={18} color="rgba(255,255,255,0.4)" />
                  <span style={z.setLabel}>Sensitivity</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", width: 32, textAlign: "right" }}>
                    {playerData.sensitivity.toFixed(1)}x
                  </span>
                  <input
                    type="range"
                    min="0.5" max="2.0" step="0.1"
                    value={playerData.sensitivity}
                    onChange={(e) => onDataChange(updateSettings("sensitivity", parseFloat(e.target.value)))}
                    style={z.slider}
                  />
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "16px 0" }} />
              <button
                onClick={() => {
                  if (window.confirm("Reset all progress? This cannot be undone. You will lose all coins, skins, and stats.")) {
                    const fresh = resetAllData();
                    onDataChange(fresh);
                    setSheet(null);
                  }
                }}
                style={{
                  width: "100%", padding: "12px",
                  background: "rgba(255,50,50,0.06)",
                  border: "1px solid rgba(255,50,50,0.12)",
                  borderRadius: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Trash2 size={14} color="#ff4444" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ff4444", letterSpacing: 1 }}>
                  RESET ALL DATA
                </span>
              </button>
            </>
          )}
          {sheet === "stats" && (
            <>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 16 }}>
                Your journey so far
              </p>
              <StatCard icon={<Rocket size={18} />} label="Total Distance" value={formatDistance(playerData.totalDistance)} accent="#00aaff" />
              <StatCard icon={<Target size={18} />} label="Best Distance" value={formatDistance(playerData.bestDistance)} accent="#ffaa00" />
              <StatCard icon={<Crosshair size={18} />} label="Meteors Destroyed" value={playerData.totalKills.toLocaleString()} accent="#ff5544" />
              <StatCard icon={<Gem size={18} />} label="Total Coins Earned" value={playerData.totalCoinsEarned.toLocaleString()} accent="#ffaa00" />
              <StatCard icon={<Zap size={18} />} label="Best Combo" value={`${playerData.bestCombo}x`} accent="#aa55ff" />
              <StatCard icon={<BarChart3 size={18} />} label="Best Wave" value={playerData.bestWave.toString()} accent="#00ddaa" />
              <StatCard icon={<Play size={18} />} label="Games Played" value={playerData.totalGames.toString()} accent="#00aaff" />
              <StatCard icon={<Clock size={18} />} label="Total Play Time" value={fmtTime(playerData.totalPlayTime)} accent="#8888aa" />
              {playerData.totalGames > 0 && (
                <StatCard icon={<TrendingUp size={18} />} label="Avg Distance / Game" value={formatDistance(Math.floor(playerData.totalDistance / playerData.totalGames))} accent="#44aaff" />
              )}
              {playerData.milestonesReached.length > 0 && (
                <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>ZONES EXPLORED</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {playerData.milestonesReached.map(name => (
                      <span key={name} style={{
                        fontSize: 9, fontWeight: 600, color: "#00ddaa",
                        padding: "3px 10px", borderRadius: 6,
                        background: "rgba(0,220,170,0.06)",
                        border: "1px solid rgba(0,220,170,0.1)",
                        letterSpacing: 1,
                      }}>
                        {name.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div></div>}

      {showDailyReward && dailyRewardInfo && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.3s ease-out",
        }}>
          <div style={{
            width: "88%", maxWidth: 340,
            background: "rgba(10,10,28,0.97)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,170,0,0.12)",
            borderRadius: 20, padding: "24px 20px",
            animation: "popIn 0.4s cubic-bezier(0.34,1.4,0.64,1)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                background: "rgba(255,170,0,0.1)",
                border: "1px solid rgba(255,170,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Gift size={24} color="#ffaa00" />
              </div>
              <h2 style={{
                fontSize: 20, fontWeight: 800, color: "#fff",
                letterSpacing: 2, margin: 0,
              }}>
                DAILY REWARD
              </h2>
              <p style={{
                fontSize: 11, color: "rgba(255,255,255,0.3)",
                letterSpacing: 2, marginTop: 4,
              }}>
                Day {dailyRewardInfo.currentDay} of 7 — Streak: {dailyRewardInfo.streak}
              </p>
            </div>

            <div style={{
              display: "flex", gap: 6, justifyContent: "center",
              marginBottom: 20,
            }}>
              {DAILY_REWARDS.map((dr, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === dailyRewardInfo.currentDay;
                const isPast = dayNum < dailyRewardInfo.currentDay;

                return (
                  <div key={dayNum} style={{
                    width: 38, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 4, padding: "8px 0",
                    borderRadius: 10,
                    background: isToday
                      ? "rgba(255,170,0,0.12)"
                      : isPast
                        ? "rgba(0,220,120,0.05)"
                        : "rgba(255,255,255,0.02)",
                    border: isToday
                      ? "1.5px solid rgba(255,170,0,0.3)"
                      : isPast
                        ? "1px solid rgba(0,220,120,0.1)"
                        : "1px solid rgba(255,255,255,0.04)",
                    transform: isToday ? "scale(1.08)" : "scale(1)",
                    transition: "all 0.2s",
                  }}>
                    <span style={{
                      fontSize: 7, fontWeight: 600, letterSpacing: 1,
                      color: isToday ? "#ffaa00" : isPast ? "#00dd78" : "rgba(255,255,255,0.2)",
                    }}>
                      D{dayNum}
                    </span>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: isToday
                        ? "rgba(255,170,0,0.2)"
                        : isPast
                          ? "rgba(0,220,120,0.1)"
                          : "rgba(255,255,255,0.03)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isPast
                        ? <Check size={12} color="#00dd78" />
                        : <Gem size={10} color={isToday ? "#ffaa00" : "rgba(255,255,255,0.15)"} />
                      }
                    </div>
                    <span style={{
                      fontSize: 8, fontWeight: 700,
                      color: isToday ? "#ffaa00" : isPast ? "rgba(0,220,120,0.5)" : "rgba(255,255,255,0.15)",
                    }}>
                      {dr.coins}
                    </span>
                  </div>
                );
              })}
            </div>

            {!rewardClaimed && (
              <div style={{
                textAlign: "center", padding: "16px",
                background: "rgba(255,170,0,0.05)",
                border: "1px solid rgba(255,170,0,0.08)",
                borderRadius: 14, marginBottom: 16,
              }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>
                  TODAY YOU RECEIVE
                </span>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, marginTop: 8,
                }}>
                  <Gem size={20} color="#ffaa00" />
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#ffaa00" }}>
                    {dailyRewardInfo.reward}
                  </span>
                </div>
              </div>
            )}

            {rewardClaimed && (
              <div style={{
                textAlign: "center", padding: "16px",
                background: "rgba(0,220,120,0.05)",
                border: "1px solid rgba(0,220,120,0.1)",
                borderRadius: 14, marginBottom: 16,
              }}>
                <Check size={28} color="#00dd78" />
                <p style={{ fontSize: 14, fontWeight: 700, color: "#00dd78", marginTop: 8, letterSpacing: 2 }}>
                  CLAIMED!
                </p>
              </div>
            )}

            {!rewardClaimed ? (
              <button
                onClick={() => {
                  playDailyRewardSound();
                  const result = claimDailyRewardFn();
                  if (result.claimed) {
                    onDataChange(result.data);
                    setRewardClaimed(true);
                    setTimeout(() => setShowDailyReward(false), 1200);
                  }
                }}
                style={{
                  width: "100%", height: 50, borderRadius: 14,
                  border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #ffaa00, #cc7700)",
                  boxShadow: "0 4px 20px rgba(255,170,0,0.3)",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                  letterSpacing: 4, display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <Gift size={18} />
                CLAIM
              </button>
            ) : (
              <button
                onClick={() => setShowDailyReward(false)}
                style={{
                  width: "100%", height: 44, borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  color: "rgba(255,255,255,0.5)", letterSpacing: 3,
                }}
              >
                CONTINUE
              </button>
            )}

            <p style={{
              textAlign: "center", fontSize: 9,
              color: "rgba(255,255,255,0.15)", marginTop: 12,
              letterSpacing: 1,
            }}>
              Come back tomorrow to keep your streak
            </p>
          </div>
        </div>
      )}

      {showStation && (
        <StationScreen
          onClose={() => { playSheetClose(); setShowStation(false); }}
          onDataChange={onDataChange}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes fi{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes shipIn{0%{opacity:0;transform:translate(-50%,-50%) scale(0.6)}60%{transform:translate(-50%,-50%) scale(1.03)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes gp{0%,100%{box-shadow:0 4px 30px ${hexToRgba(skin.accent, 0.3)}}50%{box-shadow:0 4px 40px ${hexToRgba(skin.accent, 0.5)}}}
        @keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
        @keyframes popIn{0%{opacity:0;transform:scale(0.85)}60%{transform:scale(1.02)}100%{opacity:1;transform:scale(1)}}
        @keyframes coinFloat{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-30px) scale(1.3)}}
        @keyframes upgradeOverlayFadeIn{0%{opacity:0}100%{opacity:1}}
        @keyframes upgradeOverlayRotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes upgradeOverlayBurstRay{0%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
        @keyframes upgradeOverlayPopIn{0%{transform:scale(0.3);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
        @keyframes upgradeOverlayGlow{0%,100%{text-shadow:0 0 12px #00ffaa}50%{text-shadow:0 0 25px #00ffaa,0 0 40px #00ffaa}}
        @keyframes upgradeOverlaySlideUp{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${skin.accent};cursor:pointer;box-shadow:0 0 8px ${hexToRgba(skin.accent, 0.4)}}
        input[type="range"]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:${skin.accent};cursor:pointer;border:none;box-shadow:0 0 8px ${hexToRgba(skin.accent, 0.4)}}
      `}</style>
    </div>
  );
}

const z = {
  root: { position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", aspectRatio: "420/812", overflow: "hidden", background: "#020206", fontFamily: "'Sora',sans-serif" },
  cvs: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  flash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse, rgba(200,230,255,1) 0%, rgba(150,200,255,0.9) 40%, rgba(100,150,255,0.7) 100%)", zIndex: 6, transition: "opacity 0.05s" },
  ui: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 8, display: "flex", flexDirection: "column", pointerEvents: "none" },
  top: { padding: "16px 20px", animation: "fi 0.7s ease-out", pointerEvents: "auto" },
  bsL: { fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.2)", letterSpacing: 3 },
  bsV: { fontSize: 26, fontWeight: 700, color: "#fff", marginTop: 2 },
  titA: { textAlign: "center", padding: "0 20px", animation: "fi 0.8s ease-out" },
  tit: { fontSize: 48, fontWeight: 800, letterSpacing: 3, lineHeight: 1.1 },
  titW: { color: "#fff", display: "block" },
  titB: { color: "#00aaff", display: "block", textShadow: "0 0 40px rgba(0,170,255,0.5),0 0 100px rgba(0,170,255,0.15)" },
  sub: { fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.15)", letterSpacing: 10, marginTop: 8 },
  pa: { display: "flex", justifyContent: "center", padding: "0 40px", marginBottom: 18, animation: "fi 0.6s ease-out", pointerEvents: "auto" },
  pb: { width: "100%", maxWidth: 240, height: 56, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#0088ff,#0055dd)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.1s", animation: "gp 3s infinite" },
  pbp: { transform: "scale(0.96)", filter: "brightness(0.85)" },
  pt: { fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: 8 },
  cards: { display: "flex", gap: 8, padding: "0 14px 18px", animation: "fi 0.6s ease-out", pointerEvents: "auto" },
  card: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 4px 10px", borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(10px)", cursor: "pointer" },
  ci: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  cl: { fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: 1 },
  cs: { fontSize: 8, color: "rgba(255,255,255,0.2)" },
  shBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", zIndex: 10, display: "flex", alignItems: "flex-end" },
  sh: { width: "100%", maxHeight: "65%", borderRadius: "20px 20px 0 0", background: "rgba(8,8,22,0.95)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.05)", borderBottom: "none", animation: "su 0.25s ease-out", display: "flex", flexDirection: "column" },
  shTop: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 10px" },
  shT: { fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: 2 },
  shX: { background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  shB: { padding: "0 16px 24px", overflowY: "auto", flex: 1 },
  mr: { display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, marginBottom: 8 },
  mi2: { width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", flexShrink: 0, background: "rgba(0,170,255,0.05)" },
  mt: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", display: "block", marginBottom: 8 },
  mbr: { height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" },
  mfl: { height: "100%", borderRadius: 2 },
  mre: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 40 },
  mc: { fontSize: 13, fontWeight: 700, color: "#ffaa00" },
  clm: { fontSize: 8, fontWeight: 700, color: "#fff", padding: "3px 10px", borderRadius: 8, background: "#00bb55" },
  sg: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  sc: { borderRadius: 14, padding: "14px 8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  ac: { borderRadius: 14, padding: "16px 8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  rr: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)", marginBottom: 6 },
  setRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  setLabel: { fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: 0.5 },
  slider: { WebkitAppearance: "none", width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", outline: "none", cursor: "pointer" },
};
