import { useState, useEffect, useRef, useCallback } from "react";
import { CANVAS_W, CANVAS_H } from "../game/constants.js";
import { createGameState, updateGame, renderGame } from "../game/engine.js";
import { getSkin } from "../data/skins.js";
import { BOSSES } from "../data/bosses.js";
import {
  initAudio, playShoot, playExplosionSmall, playExplosionLarge,
  playPowerup, playPlayerHit, playCombo, playWaveStart,
  playMilestone, playGameOver as playGameOverSound,
  startEngine, stopEngine,
  playBossWarning, playBossShoot, playBossHit,
  playBossExplosionSmall, playBossExplosionLarge, playBossDefeated,
} from "../audio/soundManager.js";
import Tutorial from "../components/Tutorial.jsx";
import { markTutorialSeen } from "../data/playerData.js";

export default function GameScreen({ onGameOver, onBack, playerData, skinId, weaponId = "blaster", weaponLevel = 0, sensitivity = 1.0, soundEnabled = true, vibrationEnabled = true }) {
  const [showTutorial, setShowTutorial] = useState(playerData && !playerData.tutorialSeen);
  const [gameStarted, setGameStarted] = useState(playerData ? playerData.tutorialSeen : true);
  const [debugMode, setDebugMode] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const debugTapRef = useRef({ count: 0, timer: null });
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const skinRef = useRef(getSkin(skinId));
  const startTimeRef = useRef(null);

  const handleDebugTap = useCallback(() => {
    const dt = debugTapRef.current;
    dt.count++;
    clearTimeout(dt.timer);
    dt.timer = setTimeout(() => { dt.count = 0; }, 1500);
    if (dt.count >= 5) {
      setDebugMode(prev => !prev);
      dt.count = 0;
    }
  }, []);

  const spawnDebugBoss = useCallback((bossId) => {
    const state = stateRef.current;
    if (!state) return;
    const boss = BOSSES.find(b => b.id === bossId);
    if (!boss) return;
    // Clear current boss if any
    state.bossActive = null;
    state.bossProjectiles = [];
    state.bossState = "none";
    state.bossSpecific = {};
    // Remove from defeated list so it can spawn
    state.bossDefeatedList = state.bossDefeatedList.filter(id => id !== bossId);
    // Set distance to trigger
    state.distance = boss.triggerDistance;
    state.meteorSpawningEnabled = false;
    state.meteors = [];
  }, []);

  const killActiveBoss = useCallback(() => {
    const state = stateRef.current;
    if (!state || !state.bossActive || state.bossState !== "fighting") return;
    state.bossHP = 0;
    state.bossState = "dying";
    state.bossTimer = 0;
  }, []);

  const addDistance = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    state.distance += 100_000_000;
  }, []);

  const handleTouch = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const touch = e.touches[0];
    if (touch) {
      stateRef.current.touching = true;
      stateRef.current.touchX = (touch.clientX - rect.left) * scaleX;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (stateRef.current) {
      stateRef.current.touching = false;
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    stateRef.current.touching = true;
    stateRef.current.touchX = (e.clientX - rect.left) * scaleX;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!stateRef.current || !stateRef.current.touching) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    stateRef.current.touchX = (e.clientX - rect.left) * scaleX;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (stateRef.current) stateRef.current.touching = false;
  }, []);

  const handleTutorialComplete = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
    setGameStarted(true);
  }, []);

  // Render background (stars) even during tutorial
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (gameStarted) return; // full game loop will handle rendering
    const ctx = canvas.getContext("2d");
    const state = createGameState();
    stateRef.current = state;
    const skin = skinRef.current;

    const bgLoop = () => {
      // Only render background — no updateGame so no meteors/gameplay
      renderGame(ctx, state, skin);
      rafRef.current = requestAnimationFrame(bgLoop);
    };
    rafRef.current = requestAnimationFrame(bgLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameStarted]);

  // Full game loop — starts only after tutorial
  useEffect(() => {
    if (!gameStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Reuse existing state if background was rendering, otherwise create new
    if (!stateRef.current) {
      stateRef.current = createGameState();
    }
    stateRef.current.sensitivity = sensitivity;
    stateRef.current.vibrationEnabled = vibrationEnabled;
    stateRef.current.weaponId = weaponId;
    stateRef.current.weaponLevel = weaponLevel;
    stateRef.current.bestCombo = 0;
    stateRef.current.bossDefeatedList = playerData ? [...(playerData.defeatedBosses || [])] : [];
    startTimeRef.current = performance.now();
    const skin = skinRef.current;

    initAudio(soundEnabled, false); // no music during gameplay
    if (soundEnabled) startEngine();

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    const loop = () => {
      const state = stateRef.current;
      if (!state) return;

      updateGame(state, 16.67);
      renderGame(ctx, state, skin);

      // Play sounds based on engine flags
      if (soundEnabled) {
        const sfx = state.sfx;
        if (sfx.shoot) playShoot();
        if (sfx.explosionSmall) playExplosionSmall();
        if (sfx.explosionLarge) playExplosionLarge();
        if (sfx.powerup) playPowerup();
        if (sfx.playerHit) playPlayerHit();
        if (sfx.combo) playCombo();
        if (sfx.waveStart) playWaveStart();
        if (sfx.milestone) playMilestone();
        if (sfx.gameOver) { stopEngine(); playGameOverSound(); }
        if (sfx.bossWarning) playBossWarning();
        if (sfx.bossShoot) playBossShoot();
        if (sfx.bossHit) playBossHit();
        if (sfx.bossExplosionSmall) playBossExplosionSmall();
        if (sfx.bossExplosionLarge) playBossExplosionLarge();
        if (sfx.bossDefeated) playBossDefeated();
      }

      // God mode: refill lives every frame
      if (godMode) {
        state.lives = 5;
        state.invincibleTimer = Math.max(state.invincibleTimer, 10);
      }

      if (state.combo > state.bestCombo) {
        state.bestCombo = state.combo;
      }

      if (state.gameOver) {
        stopEngine();
        const playTime = Math.floor((performance.now() - startTimeRef.current) / 1000);
        onGameOver({
          distance: state.distance,
          wave: state.wave,
          kills: state.kills,
          bestCombo: state.bestCombo,
          playTime,
          powerupsCollected: state.powerupsCollected,
          noHitWaves: state.noHitWaves,
          defeatedBosses: state.bossDefeatedList,
          bossCoinsEarned: state.bossCoinsEarned,
        });
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      stopEngine();
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("touchstart", handleTouch);
      canvas.removeEventListener("touchmove", handleTouch);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [gameStarted, godMode, handleTouch, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp, onGameOver]);

  const debugBosses = [
    { id: "solar_sentinel", label: "SENTINEL" },
    { id: "acid_wraith", label: "WRAITH" },
    { id: "orbital_fortress", label: "FORTRESS" },
    { id: "iron_colossus", label: "COLOSSUS" },
    { id: "storm_titan", label: "TITAN" },
    { id: "ring_weaver", label: "WEAVER" },
    { id: "cryo_phantom", label: "PHANTOM" },
    { id: "void_leviathan", label: "LEVIATHAN" },
  ];

  return (
    <div style={styles.root}>
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={styles.canvas} />
      <button style={styles.backBtn} onTouchEnd={(e) => { e.preventDefault(); onBack(); }} onClick={onBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
      </button>
      {/* Hidden debug tap zone on wave counter area */}
      <div
        style={styles.debugTapZone}
        onClick={handleDebugTap}
        onTouchEnd={(e) => { e.preventDefault(); handleDebugTap(); }}
      />
      {debugMode && (
        <div style={styles.debugOverlay}>
          <div style={styles.debugTitle}>DEBUG MODE</div>
          <div style={styles.debugRow}>
            {debugBosses.map(b => (
              <button key={b.id} style={styles.debugBtn} onClick={() => spawnDebugBoss(b.id)}>{b.label}</button>
            ))}
          </div>
          <div style={styles.debugRow}>
            <button style={styles.debugBtn} onClick={killActiveBoss}>KILL BOSS</button>
            <button style={{ ...styles.debugBtn, background: godMode ? "rgba(0,255,100,0.4)" : "rgba(255,255,255,0.15)" }} onClick={() => setGodMode(g => !g)}>
              GOD MODE {godMode ? "ON" : "OFF"}
            </button>
            <button style={styles.debugBtn} onClick={addDistance}>+100M KM</button>
            <button style={{ ...styles.debugBtn, background: "rgba(255,50,50,0.3)" }} onClick={() => setDebugMode(false)}>CLOSE</button>
          </div>
        </div>
      )}
      {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0}
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    position: "relative",
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    aspectRatio: "420/812",
    overflow: "hidden",
    background: "#020206",
    fontFamily: "'Sora',sans-serif",
    touchAction: "none",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
  },
  debugTapZone: {
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: 120,
    height: 50,
    zIndex: 5,
  },
  debugOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(8px)",
    padding: "8px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  debugTitle: {
    color: "#ff4444",
    fontSize: 11,
    fontWeight: 800,
    fontFamily: "'Sora',sans-serif",
    letterSpacing: 2,
  },
  debugRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
  },
  debugBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 4,
    color: "#fff",
    fontSize: 9,
    fontWeight: 600,
    fontFamily: "'Sora',sans-serif",
    padding: "4px 8px",
    cursor: "pointer",
    letterSpacing: 0.5,
  },
};
