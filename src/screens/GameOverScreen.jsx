import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Home, Crosshair, Zap, BarChart3, Gem, Trophy } from "lucide-react";
import { MILESTONES } from "../data/milestones.js";
import { formatDistance } from "../utils/formatDistance.js";
import { playAchievement, playConfirm, startAmbient } from "../audio/soundManager.js";

const W = 420, H = 812;

export default function GameOverScreen({ stats, playerData, onPlayAgain, onMenu }) {
  const cvs = useRef(null);
  const rafBg = useRef(null);
  const frameRef = useRef(0);
  const starsRef = useRef([]);

  const [phase, setPhase] = useState("entering"); // entering → counting → done
  const [displayStats, setDisplayStats] = useState({
    distance: 0, kills: 0, wave: 0, combo: 0, coins: 0,
  });
  const [showButtons, setShowButtons] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const confettiRef = useRef(null);
  const [bpPlay, setBpPlay] = useState(false);
  const [bpMenu, setBpMenu] = useState(false);

  const distance = stats?.distance || 0;
  const bestDistance = playerData?.bestDistance || 0;
  const isNewRecord = distance >= bestDistance && distance > 0;
  const coinsEarned = stats?.coinsEarned ?? Math.floor(distance / 100_000);

  // Find zone reached
  let zoneReached = stats?.zoneReached || "Launch Pad";
  if (!stats?.zoneReached) {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (distance >= MILESTONES[i].distance) {
        zoneReached = `${MILESTONES[i].name} Orbit`;
        break;
      }
    }
  }

  useEffect(() => {
    if (stats?.newlyUnlocked?.length > 0) playAchievement();
  }, []);

  // Stars background canvas
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      s: Math.random() * 1.5 + 0.3, vy: 0.1 + Math.random() * 0.2,
    }));
    const render = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a0620"); bg.addColorStop(1, "#020206");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      starsRef.current.forEach(s => {
        s.y += s.vy; if (s.y > H) s.y = 0;
        ctx.globalAlpha = 0.5 + Math.sin(frameRef.current * 0.015 + s.x) * 0.2;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      rafBg.current = requestAnimationFrame(render);
    };
    rafBg.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafBg.current);
  }, []);

  // Animated stat counting
  const animateStats = useCallback(() => {
    const duration = 1500;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      setDisplayStats({
        distance: Math.floor(distance * eased),
        kills: Math.floor((stats?.kills || 0) * eased),
        wave: Math.floor((stats?.wave || 1) * eased),
        combo: Math.floor((stats?.bestCombo || 0) * eased),
        coins: Math.floor(coinsEarned * eased),
      });

      if (t < 1) requestAnimationFrame(animate);
      else setPhase("done");
    };
    animate();
  }, [distance, stats, coinsEarned]);

  // Animation timeline
  useEffect(() => {
    setTimeout(() => setPhase("counting"), 400);
    setTimeout(() => animateStats(), 600);
    setTimeout(() => setShowButtons(true), 2400);
    if (isNewRecord) {
      setTimeout(() => spawnConfetti(), 1800);
    }
  }, []);

  // Confetti for new record
  const spawnConfetti = () => {
    const colors = ["#ffaa00", "#00aaff", "#ff44aa", "#00ff88", "#ff6644"];
    const pieces = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        x: W / 2 + (Math.random() - 0.5) * 100,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 3,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 4,
      });
    }
    setConfetti(pieces);

    const interval = setInterval(() => {
      setConfetti(prev => {
        const next = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          rot: p.rot + p.rotSpeed,
        })).filter(p => p.y < H + 20);
        if (next.length === 0) clearInterval(interval);
        return next;
      });
    }, 16);
    confettiRef.current = interval;
    setTimeout(() => clearInterval(interval), 5000);
  };

  useEffect(() => {
    return () => { if (confettiRef.current) clearInterval(confettiRef.current); };
  }, []);

  const entering = phase === "entering";

  return (
    <div style={z.root}>
      <canvas ref={cvs} width={W} height={H} style={z.cvs} />

      {/* Confetti overlay */}
      {confetti.map(c => (
        <div key={c.id} style={{
          position: "absolute", left: c.x, top: c.y,
          width: c.size, height: c.size, background: c.color,
          transform: `rotate(${c.rot}deg)`,
          pointerEvents: "none", zIndex: 20,
        }} />
      ))}

      <div style={z.content}>
        {/* Title */}
        <div style={{
          ...z.titleBox,
          animation: !entering ? "fadeDown 0.6s ease-out" : "none",
          opacity: entering ? 0 : 1,
        }}>
          <h1 style={z.title}>GAME OVER</h1>
          {isNewRecord && (
            <div style={z.newRecord}>
              <Trophy size={14} color="#ffaa00" />
              <span>NEW RECORD</span>
              <Trophy size={14} color="#ffaa00" />
            </div>
          )}
        </div>

        {/* Big distance */}
        <div style={{
          ...z.distanceBox,
          opacity: !entering ? 1 : 0,
          animation: !entering ? "fadeUp 0.6s ease-out 0.2s both" : "none",
        }}>
          <p style={z.distLabel}>DISTANCE TRAVELED</p>
          <p style={z.distValue}>{formatDistance(displayStats.distance)}</p>
          <p style={z.zoneReached}>{zoneReached.toUpperCase()}</p>
        </div>

        {/* Stats grid */}
        <div style={{
          ...z.statsGrid,
          opacity: !entering ? 1 : 0,
          animation: !entering ? "fadeUp 0.6s ease-out 0.4s both" : "none",
        }}>
          <StatBox icon={<Crosshair size={16} />} label="KILLS" value={displayStats.kills} color="#ff5544" />
          <StatBox icon={<BarChart3 size={16} />} label="WAVE" value={displayStats.wave} color="#00ddaa" />
          <StatBox icon={<Zap size={16} />} label="BEST COMBO" value={`${displayStats.combo}x`} color="#aa55ff" />
          <StatBox icon={<Gem size={16} />} label="COINS" value={`+${displayStats.coins}`} color="#ffaa00" />
        </div>

        {/* Detailed summary */}
        {phase === "done" && (stats?.weaponUsed || stats?.bossesDefeated > 0 || stats?.powerupsCollected > 0) && (
          <div style={{ ...z.summary, animation: "fadeUp 0.5s ease-out" }}>
            {stats.weaponUsed && <SummaryRow label="Weapon used" value={stats.weaponUsed} />}
            {stats.bossesDefeated > 0 && <SummaryRow label="Bosses defeated" value={stats.bossesDefeated} />}
            {stats.powerupsCollected > 0 && <SummaryRow label="Power-ups collected" value={stats.powerupsCollected} />}
          </div>
        )}

        {/* Achievements */}
        {phase === "done" && stats?.newlyUnlocked?.length > 0 && (
          <div style={z.achSection}>
            <span style={z.achTitle}>ACHIEVEMENTS UNLOCKED</span>
            {stats.newlyUnlocked.map((ach, i) => (
              <div key={ach.id} style={{
                ...z.achItem,
                animation: `achIn 0.5s ease-out ${i * 0.15}s both`,
              }}>
                <div style={z.achIcon}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={z.achName}>{ach.name}</span>
                  <span style={z.achDesc}>{ach.desc}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Gem size={12} color="#ffaa00" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ffaa00" }}>+{ach.reward}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Buttons */}
        {showButtons && (
          <div style={z.buttons}>
            <button
              style={{ ...z.playBtn, ...(bpPlay ? z.btnPressed : {}) }}
              onTouchStart={() => setBpPlay(true)}
              onTouchEnd={() => { setBpPlay(false); playConfirm(); onPlayAgain(); }}
              onMouseDown={() => setBpPlay(true)}
              onMouseUp={() => { setBpPlay(false); playConfirm(); onPlayAgain(); }}
            >
              <Play size={18} fill="#fff" stroke="none" />
              <span style={z.playBtnText}>PLAY AGAIN</span>
            </button>
            <button
              style={{ ...z.menuBtn, ...(bpMenu ? z.btnPressed : {}) }}
              onTouchStart={() => setBpMenu(true)}
              onTouchEnd={() => { setBpMenu(false); playConfirm(); startAmbient(); onMenu(); }}
              onMouseDown={() => setBpMenu(true)}
              onMouseUp={() => { setBpMenu(false); playConfirm(); startAmbient(); onMenu(); }}
            >
              <Home size={16} color="rgba(255,255,255,0.6)" />
              <span style={z.menuBtnText}>MENU</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeDown { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes fadeUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGold { 0%,100% { box-shadow: 0 0 20px rgba(255,170,0,0.3); } 50% { box-shadow: 0 0 30px rgba(255,170,0,0.5); } }
        @keyframes gpOver { 0%,100% { box-shadow: 0 4px 30px rgba(0,140,255,0.3); } 50% { box-shadow: 0 4px 40px rgba(0,140,255,0.5); } }
        @keyframes achIn { 0% { opacity: 0; transform: translateX(-20px); } 100% { opacity: 1; transform: translateX(0); } }
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      padding: "14px 8px", borderRadius: 14,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ color, opacity: 0.85 }}>{icon}</div>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, fontFamily: "'Sora',sans-serif" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Sora',sans-serif" }}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Sora',sans-serif" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", fontFamily: "'Sora',sans-serif" }}>{value}</span>
    </div>
  );
}

const z = {
  root: { position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", aspectRatio: "420/812", overflow: "hidden", background: "#020206", fontFamily: "'Sora',sans-serif" },
  cvs: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  content: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: "60px 24px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, zIndex: 5, overflowY: "auto" },
  titleBox: { textAlign: "center" },
  title: { fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: 4, margin: 0, textShadow: "0 0 30px rgba(255,80,80,0.5)" },
  newRecord: { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "5px 14px", borderRadius: 20, background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)", animation: "pulseGold 2s infinite", fontSize: 10, fontWeight: 700, color: "#ffaa00", letterSpacing: 2 },
  distanceBox: { textAlign: "center", marginTop: 10 },
  distLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3, margin: 0 },
  distValue: { fontSize: 44, fontWeight: 800, color: "#00aaff", margin: "8px 0 0", textShadow: "0 0 30px rgba(0,170,255,0.4)" },
  zoneReached: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 2, margin: "6px 0 0" },
  statsGrid: { display: "flex", gap: 8, width: "100%" },
  summary: { width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginTop: 4 },
  achSection: { width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 },
  achTitle: { fontSize: 10, fontWeight: 600, color: "#ffaa00", letterSpacing: 3, textAlign: "center", marginBottom: 4 },
  achItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.12)" },
  achIcon: { width: 38, height: 38, borderRadius: 10, background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" },
  achName: { fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, display: "block" },
  achDesc: { fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginTop: 2 },
  buttons: { display: "flex", flexDirection: "column", gap: 10, width: "100%", animation: "fadeUp 0.6s ease-out" },
  playBtn: { width: "100%", height: 56, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#0088ff,#0055dd)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.1s", animation: "gpOver 3s infinite", fontFamily: "'Sora',sans-serif" },
  menuBtn: { width: "100%", height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "all 0.1s", fontFamily: "'Sora',sans-serif" },
  btnPressed: { transform: "scale(0.96)", filter: "brightness(0.85)" },
  playBtnText: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 4 },
  menuBtnText: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 3 },
};
