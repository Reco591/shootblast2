import { useState, useEffect, useRef } from "react";
import { Play, Home, Gem } from "lucide-react";
import { MILESTONES } from "../data/milestones.js";
import { formatDistance } from "../utils/formatDistance.js";
import { playAchievement, playCoinCollect, playConfirm, startAmbient } from "../audio/soundManager.js";

const W = 420, H = 812;

export default function GameOverScreen({ stats, playerData, onPlayAgain, onMenu }) {
  const cvs = useRef(null);
  const raf = useRef(null);
  const fr = useRef(0);
  const stars = useRef([]);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [bpPlay, setBpPlay] = useState(false);
  const [bpMenu, setBpMenu] = useState(false);

  const distance = stats?.distance || 0;
  const bestDistance = playerData?.bestDistance || 0;
  const isNewBest = distance >= bestDistance && distance > 0;
  const coinsEarned = stats?.coinsEarned ?? Math.floor(distance / 100_000);
  const coinBalance = playerData?.coins || 0;

  // Find the zone reached
  let zoneReached = "Launch Pad";
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (distance >= MILESTONES[i].distance) {
      zoneReached = `${MILESTONES[i].name} Orbit`;
      break;
    }
  }

  useEffect(() => {
    if (stats?.newlyUnlocked?.length > 0) playAchievement();
  }, []);

  useEffect(() => {
    stars.current = Array.from({ length: 100 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() * 1.2 + 0.3,
      speed: Math.random() * 0.15 + 0.05,
      hue: Math.random() > 0.85 ? 190 + Math.random() * 50 : 0,
    }));
    setTimeout(() => setShowContent(true), 300);
    setTimeout(() => setShowButtons(true), 1200);
  }, []);

  // Distance count-up animation
  useEffect(() => {
    if (!stats || !showContent) return;
    if (distance === 0) { setDisplayDistance(0); return; }
    const duration = 1500;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayDistance(Math.floor(distance * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [stats, showContent, distance]);

  // Canvas background
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d");
    const render = () => {
      fr.current++;
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.8);
      bg.addColorStop(0, "#080618");
      bg.addColorStop(0.5, "#060510");
      bg.addColorStop(1, "#020206");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      stars.current.forEach(s => {
        s.y += s.speed;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        ctx.globalAlpha = 0.4 + Math.sin(fr.current * 0.015 + s.x) * 0.2;
        ctx.fillStyle = s.hue > 0 ? `hsl(${s.hue},60%,75%)` : "#cce0ff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.65);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf.current = requestAnimationFrame(render);
    };
    raf.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div style={z.root}>
      <canvas ref={cvs} width={W} height={H} style={z.cvs} />
      <div style={z.overlay}>
        {showContent && (
          <div style={z.content}>
            <h1 style={z.title}>GAME OVER</h1>

            {isNewBest && (
              <div style={z.newBest}>NEW RECORD!</div>
            )}

            <div style={z.distanceBox}>
              <p style={z.distLabel}>DISTANCE TRAVELED</p>
              <p style={z.distValue}>{formatDistance(displayDistance)}</p>
            </div>

            <div style={z.zoneBox}>
              <p style={z.zoneLabel}>ZONE REACHED</p>
              <p style={z.zoneValue}>{zoneReached}</p>
            </div>

            <div style={z.statsRow}>
              <div style={z.statItem}>
                <span style={z.coinValue}>+{coinsEarned}</span>
                <span style={z.statLabel}>COINS EARNED</span>
              </div>
              <div style={z.divider} />
              <div style={z.statItem}>
                <span style={z.statValue}>{stats?.kills || 0}</span>
                <span style={z.statLabel}>DESTROYED</span>
              </div>
            </div>

            <div style={z.balanceRow}>
              <Gem size={14} color="#ffaa00" />
              <span style={z.balanceValue}>{coinBalance.toLocaleString()}</span>
              <span style={z.balanceLabel}>BALANCE</span>
            </div>

            {stats.newlyUnlocked && stats.newlyUnlocked.length > 0 && (
              <div style={{
                width: "100%", maxWidth: 320, margin: "16px auto 0",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: "#ffaa00",
                  letterSpacing: 3, textAlign: "center", marginBottom: 4,
                }}>
                  ACHIEVEMENTS UNLOCKED
                </span>

                {stats.newlyUnlocked.map((ach, i) => (
                  <div key={ach.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 14,
                    background: "rgba(255,170,0,0.06)",
                    border: "1px solid rgba(255,170,0,0.12)",
                    animation: `achIn 0.5s ease-out ${i * 0.15}s both`,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "rgba(255,170,0,0.1)",
                      border: "1px solid rgba(255,170,0,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <ach.Icon size={18} color="#ffaa00" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1, display: "block" }}>
                        {ach.name}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginTop: 2 }}>
                        {ach.desc}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Gem size={12} color="#ffaa00" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#ffaa00" }}>+{ach.reward}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showButtons && (
          <div style={z.buttons}>
            <button
              style={{ ...z.playBtn, ...(bpPlay ? z.btnPressed : {}) }}
              onTouchStart={() => setBpPlay(true)}
              onTouchEnd={() => { setBpPlay(false); playConfirm(); onPlayAgain(); }}
              onMouseDown={() => setBpPlay(true)}
              onMouseUp={() => { setBpPlay(false); playConfirm(); onPlayAgain(); }}
            >
              <Play size={20} fill="#fff" stroke="none" />
              <span style={z.btnText}>PLAY AGAIN</span>
            </button>
            <button
              style={{ ...z.menuBtn, ...(bpMenu ? z.btnPressed : {}) }}
              onTouchStart={() => setBpMenu(true)}
              onTouchEnd={() => { setBpMenu(false); playConfirm(); startAmbient(); onMenu(); }}
              onMouseDown={() => setBpMenu(true)}
              onMouseUp={() => { setBpMenu(false); playConfirm(); startAmbient(); onMenu(); }}
            >
              <Home size={18} color="rgba(255,255,255,0.6)" />
              <span style={z.menuBtnText}>MENU</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeSlideIn{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 20px rgba(0,200,255,0.5),0 0 60px rgba(0,200,255,0.2)}50%{text-shadow:0 0 30px rgba(0,200,255,0.8),0 0 80px rgba(0,200,255,0.3)}}
        @keyframes gpOver{0%,100%{box-shadow:0 4px 30px rgba(0,140,255,0.3)}50%{box-shadow:0 4px 40px rgba(0,140,255,0.5)}}
        @keyframes achIn{0%{opacity:0;transform:translateX(-20px)}100%{opacity:1;transform:translateX(0)}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}

const z = {
  root: { position: "relative", width: "100%", maxWidth: 420, margin: "0 auto", aspectRatio: "420/812", overflow: "hidden", background: "#020206", fontFamily: "'Sora',sans-serif" },
  cvs: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" },
  content: { textAlign: "center", animation: "fadeSlideIn 0.8s ease-out" },
  title: { fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: 4, marginBottom: 16, textShadow: "0 0 40px rgba(255,255,255,0.15)" },
  newBest: { fontSize: 14, fontWeight: 700, color: "#00ccff", letterSpacing: 6, marginBottom: 20, animation: "glow 2s ease-in-out infinite" },
  distanceBox: { marginBottom: 20 },
  distLabel: { fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: 4, marginBottom: 4 },
  distValue: { fontSize: 48, fontWeight: 800, color: "#00aaff", textShadow: "0 0 40px rgba(0,170,255,0.4)" },
  zoneBox: { marginBottom: 24 },
  zoneLabel: { fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: 4, marginBottom: 4 },
  zoneValue: { fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.7)" },
  statsRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 16 },
  statItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  statValue: { fontSize: 28, fontWeight: 700, color: "#fff" },
  coinValue: { fontSize: 28, fontWeight: 700, color: "#ffaa00" },
  statLabel: { fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: 3 },
  divider: { width: 1, height: 40, background: "rgba(255,255,255,0.08)" },
  balanceRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" },
  balanceValue: { fontSize: 16, fontWeight: 700, color: "#ffaa00" },
  balanceLabel: { fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: 3, marginLeft: 4 },
  buttons: { display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 240, marginTop: 36, animation: "fadeSlideIn 0.6s ease-out" },
  playBtn: { width: "100%", height: 56, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#0088ff,#0055dd)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.1s", animation: "gpOver 3s infinite" },
  menuBtn: { width: "100%", height: 48, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "all 0.1s", backdropFilter: "blur(10px)" },
  btnPressed: { transform: "scale(0.96)", filter: "brightness(0.85)" },
  btnText: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 6 },
  menuBtnText: { fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 4 },
};
