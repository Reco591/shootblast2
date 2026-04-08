import { useState, useEffect, useRef, useCallback } from "react";
import { CANVAS_W, CANVAS_H } from "../game/constants.js";
import { createGameState, updateGame, renderGame, startDeathScene, updateDeathScene, resetDeltaTime, spawnDrones, tryActivateAbility, showAchievementNotification, getActiveParticleCount, handleEncounterChoice } from "../game/engine.js";
import { getActiveBuffs } from "../data/playerData.js";
import { getSkin } from "../data/skins.js";
import { getWeapon } from "../data/weapons.js";
import { getPilot } from "../data/pilots.js";
import { getCurrentZoneName } from "../game/zoneRenderer.js";
import { BOSSES } from "../data/bosses.js";
import {
  initAudio, playShoot, playExplosionSmall, playExplosionLarge,
  playPowerup, playPlayerHit, playCombo, playWaveStart,
  playMilestone, playGameOver as playGameOverSound,
  startEngine, stopEngine,
  playBossWarning, playBossShoot, playBossHit,
  playBossExplosionSmall, playBossExplosionLarge, playBossDefeated,
  playLowHp, playCoinPickup, playComboBreak, playAchievement,
  playPowerupCollect, playAbilityReady, playComboTier,
  playEncounterStart, playEncounterSuccess, playEncounterDanger,
} from "../audio/soundManager.js";
import Tutorial from "../components/Tutorial.jsx";
import PauseOverlay from "../components/PauseOverlay.jsx";
import EncounterDialog from "../components/EncounterDialog.jsx";
import { markTutorialSeen, updateAchievementProgress, getPlayerData } from "../data/playerData.js";
import { ACHIEVEMENTS } from "../data/achievements.js";

export default function GameScreen({ onGameOver, onBack, playerData, skinId, weaponId = "blaster", weaponLevel = 0, pilotId = "rebel", equippedDrones = [], sensitivity = 1.0, soundEnabled = true, vibrationEnabled = true }) {
  const [showTutorial, setShowTutorial] = useState(playerData && !playerData.tutorialSeen);
  const [gameStarted, setGameStarted] = useState(playerData ? playerData.tutorialSeen : true);
  const [debugMode, setDebugMode] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const [pauseMode, setPauseMode] = useState(null); // null | "main" | "settings" | "confirm-quit"
  const [encounterUI, setEncounterUI] = useState(null);
  const [muted, setMuted] = useState(!soundEnabled);
  const mutedRef = useRef(!soundEnabled);
  const [showFps, setShowFps] = useState(false);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now(), fps: 0 });
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

  const checkAbilityButton = useCallback((canvasX, canvasY) => {
    const bx = 50;
    const by = CANVAS_H - 80;
    const dx = canvasX - bx;
    const dy = canvasY - by;
    if (Math.sqrt(dx * dx + dy * dy) < 35) {
      if (stateRef.current) tryActivateAbility(stateRef.current);
      return true;
    }
    return false;
  }, []);

  const handleTouch = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const touch = e.touches[0];
    if (touch) {
      const cx = (touch.clientX - rect.left) * scaleX;
      const cy = (touch.clientY - rect.top) * scaleY;
      // On touchstart, check ability button first
      if (e.type === "touchstart" && checkAbilityButton(cx, cy)) return;
      stateRef.current.touching = true;
      stateRef.current.touchX = cx;
    }
  }, [checkAbilityButton]);

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
    const scaleY = CANVAS_H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    if (checkAbilityButton(cx, cy)) return;
    stateRef.current.touching = true;
    stateRef.current.touchX = cx;
  }, [checkAbilityButton]);

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
    stateRef.current.pilotId = pilotId;
    stateRef.current.pilotBonus = getPilot(pilotId).bonus;
    stateRef.current.equippedDrones = equippedDrones;
    spawnDrones(stateRef.current);
    // Apply station start_shield buff
    const buffs = getActiveBuffs();
    if (buffs.start_shield > 0) {
      stateRef.current.activeEffects.shield = buffs.start_shield * 1000;
    }
    stateRef.current.bestCombo = 0;
    stateRef.current.bossDefeatedList = []; // Reset every game — bosses respawn each playthrough
    startTimeRef.current = performance.now();
    const skin = skinRef.current;

    initAudio(soundEnabled, false, playerData.soundVolume, 0); // no music during gameplay
    if (soundEnabled) startEngine();
    resetDeltaTime(); // initialize delta-time tracking

    // NPC encounter callbacks
    window.onEncounterDialog = (encData) => setEncounterUI(encData);
    window.onEncounterEnd = () => setEncounterUI(null);

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    const loop = () => {
      const state = stateRef.current;
      if (!state) return;

      // FPS counter
      const fpsData = fpsRef.current;
      fpsData.frames++;
      const now = performance.now();
      if (now - fpsData.lastTime >= 1000) {
        fpsData.fps = fpsData.frames;
        fpsData.frames = 0;
        fpsData.lastTime = now;
      }

      try {
        // Pause: only render, don't update
        if (state._paused) {
          renderGame(ctx, state, skin);
          resetDeltaTime(); // prevent delta-time spike on unpause
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        // Death scene: runs its own update/render loop
        if (state.deathScene) {
          const done = updateDeathScene(state);
          renderGame(ctx, state, skin);
          if (done) {
            state.deathScene = null;
            const playTime = Math.floor((performance.now() - startTimeRef.current) / 1000);
            const bossesDefeated = (state.bossDefeatedList || []).length;
            onGameOver({
              distance: state.distance,
              wave: state.wave,
              kills: state.kills,
              bestCombo: state.bestComboThisGame,
              playTime,
              powerupsCollected: state.powerupsCollected,
              noHitWaves: state.noHitWaves,
              defeatedBosses: state.bossDefeatedList,
              bossCoinsEarned: state.actualCoinsThisRun || ((state.bossCoinsEarned || 0) + (state.eventCoinsEarned || 0)),
              bossesDefeated,
              weaponUsed: getWeapon(weaponId).name,
              weaponId,
              nukesUsed: state.nukesUsed || 0,
              abilitiesUsed: state.abilitiesUsed || 0,
              zoneReached: getCurrentZoneName(state.distance),
            });
            return;
          }
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        updateGame(state);
        renderGame(ctx, state, skin);

        // Play sounds based on engine flags
        if (soundEnabled && !mutedRef.current) {
          const sfx = state.sfx;
          if (sfx.shoot) playShoot();
          if (sfx.explosionSmall) playExplosionSmall();
          if (sfx.explosionLarge) playExplosionLarge();
          if (sfx.powerup) playPowerup();
          if (sfx.playerHit) playPlayerHit();
          if (sfx.combo) playCombo();
          if (sfx.comboBreak) playComboBreak();
          if (sfx.waveStart) playWaveStart();
          if (sfx.milestone) playMilestone();
          if (sfx.gameOver) { stopEngine(); playGameOverSound(); }
          if (sfx.bossWarning) playBossWarning();
          if (sfx.bossShoot) playBossShoot();
          if (sfx.bossHit) playBossHit();
          if (sfx.bossExplosionSmall) playBossExplosionSmall();
          if (sfx.bossExplosionLarge) playBossExplosionLarge();
          if (sfx.bossDefeated) playBossDefeated();
          if (sfx.lowHp) playLowHp();
          if (sfx.achievement) playAchievement();
          if (sfx.ability) playPowerup();
          if (sfx.coinPickup) playCoinPickup();
          if (sfx.powerup) playPowerupCollect();
          if (sfx.abilityReady) playAbilityReady();
          if (sfx.comboTier) playComboTier();
          if (sfx.encounterStart) playEncounterStart();
          if (sfx.encounterSuccess) playEncounterSuccess();
          if (sfx.encounterDanger) playEncounterDanger();
        }

        // Process achievement queue from engine
        if (state.achievementQueue.length > 0) {
          const queue = state.achievementQueue.splice(0);
          for (const evt of queue) {
            if (evt.type === "combo") {
              const tierAchIds = [
                "tier_nice", "tier_good", "tier_great", "tier_awesome",
                "tier_amazing", "tier_incredible", "tier_unstoppable", "tier_ferocious",
                "tier_rampage", "tier_legendary", "tier_mythical", "tier_godlike",
                "tier_divine", "tier_transcendent", "tier_ethereal", "tier_ascended",
                "tier_immortal", "tier_omnipotent", "tier_cosmic", "tier_absolute",
                "tier_infinite", "tier_beyond", "tier_eternal"
              ];
              for (const id of tierAchIds) {
                const result = updateAchievementProgress(id, evt.value);
                if (result.unlocked) {
                  showAchievementNotification(state, result.achievement, soundEnabled && !mutedRef.current);
                }
              }
            } else if (evt.type === "boss") {
              const r1 = updateAchievementProgress("boss_first", 1);
              if (r1.unlocked) showAchievementNotification(state, r1.achievement, soundEnabled && !mutedRef.current);
              const bossAch = ACHIEVEMENTS.find(a => a.bossId === evt.bossId);
              if (bossAch) {
                const result = updateAchievementProgress(bossAch.id, 1);
                if (result.unlocked) showAchievementNotification(state, result.achievement, soundEnabled && !mutedRef.current);
              }
              const allResult = updateAchievementProgress("boss_all", evt.totalDefeated);
              if (allResult.unlocked) showAchievementNotification(state, allResult.achievement, soundEnabled && !mutedRef.current);
            }
          }
        }

        // God mode: refill lives every frame
        if (godMode) {
          state.lives = 5;
          state.invincibleTimer = Math.max(state.invincibleTimer, 10);
        }

        if (state.combo > state.bestCombo) {
          state.bestCombo = state.combo;
        }

        // Death scene: start on first gameOver frame
        if (state.gameOver) {
          startDeathScene(state, skinRef.current.accent);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
      } catch (err) {
        console.error("Game loop error:", err);
        // Continue running — don't let a single bad frame crash the game
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
      window.onEncounterDialog = null;
      window.onEncounterEnd = null;
    };
  }, [gameStarted, godMode, handleTouch, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp, onGameOver]);

  // Sync pause state with engine
  useEffect(() => {
    if (stateRef.current) stateRef.current._paused = !!pauseMode;
  }, [pauseMode]);

  // Auto-pause when tab loses focus
  useEffect(() => {
    if (!gameStarted) return;
    const onVisChange = () => {
      if (document.hidden && !pauseMode) setPauseMode("main");
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [gameStarted, pauseMode]);

  const handlePause = useCallback(() => {
    setPauseMode(m => m ? null : "main");
  }, []);

  const handleMuteToggle = useCallback(() => {
    setMuted(m => {
      mutedRef.current = !m;
      return !m;
    });
  }, []);

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
      {/* Pause button (top-right) */}
      <button style={styles.pauseBtn} onTouchEnd={(e) => { e.preventDefault(); handlePause(); }} onClick={handlePause}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" stroke="none">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      </button>
      {/* Mute toggle (below pause) */}
      <button style={styles.muteBtn} onTouchEnd={(e) => { e.preventDefault(); handleMuteToggle(); }} onClick={handleMuteToggle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted ? "rgba(255,80,80,0.6)" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={muted ? "rgba(255,80,80,0.3)" : "rgba(255,255,255,0.2)"} />
          {muted ? <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></> : <><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>}
        </svg>
      </button>
      {/* FPS counter (debug only) */}
      {showFps && (
        <div style={styles.fpsCounter}>{fpsRef.current.fps} FPS | {getActiveParticleCount()} P</div>
      )}
      {/* Pause overlay */}
      {pauseMode && (
        <PauseOverlay
          mode={pauseMode}
          onResume={() => setPauseMode(null)}
          onSettings={() => setPauseMode("settings")}
          onBack={() => setPauseMode("main")}
          onQuit={() => setPauseMode("confirm-quit")}
          onConfirmQuit={() => { setPauseMode(null); onBack(); }}
        />
      )}
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
            <button style={{ ...styles.debugBtn, background: showFps ? "rgba(0,255,100,0.3)" : "rgba(255,255,255,0.15)" }} onClick={() => setShowFps(f => !f)}>
              FPS {showFps ? "ON" : "OFF"}
            </button>
            <button style={{ ...styles.debugBtn, background: "rgba(255,215,0,0.3)" }} onClick={() => {
              const d = getPlayerData();
              console.log("=== ACHIEVEMENT STATE ===");
              console.log("Unlocked:", d.achievements?.unlocked || []);
              console.log("Progress:", d.achievements?.progress || {});
              console.log("Total kills:", d.achievements?.totalKills || 0);
              console.log("Best combo:", d.bestCombo || 0);
            }}>ACH LOG</button>
            <button style={{ ...styles.debugBtn, background: "rgba(255,50,50,0.3)" }} onClick={() => setDebugMode(false)}>CLOSE</button>
          </div>
        </div>
      )}
      {/* NPC Encounter Dialog */}
      {encounterUI && (
        <EncounterDialog
          encounter={encounterUI}
          coins={stateRef.current?.actualCoinsThisRun || 0}
          lives={stateRef.current?.lives || 0}
          onChoice={(i) => {
            if (stateRef.current) {
              handleEncounterChoice(stateRef.current, i);
              setEncounterUI(null);
            }
          }}
        />
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
  pauseBtn: {
    position: "absolute",
    top: 56,
    right: 10,
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
  muteBtn: {
    position: "absolute",
    top: 96,
    right: 10,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
  },
  fpsCounter: {
    position: "absolute",
    top: 10,
    left: 52,
    zIndex: 10,
    fontSize: 10,
    fontWeight: 600,
    fontFamily: "'Sora',sans-serif",
    color: "rgba(0,255,100,0.5)",
    letterSpacing: 1,
    pointerEvents: "none",
  },
};
