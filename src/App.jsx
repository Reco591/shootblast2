import { useState } from "react";
import MenuScreen from "./screens/MenuScreen";
import GameScreen from "./screens/GameScreen";
import GameOverScreen from "./screens/GameOverScreen";
import { getPlayerData, recordGame, getMissions, markTutorialSeen } from "./data/playerData";

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [stats, setStats] = useState(null);
  const [playerData, setPlayerData] = useState(getPlayerData());

  const handleGameOver = (s) => {
    const result = recordGame(s.distance, s.kills, s.wave, s.bestCombo || 0, s.playTime || 0, s.powerupsCollected || 0, s.noHitWaves || 0, s.defeatedBosses || [], s.bossCoinsEarned || 0);
    setPlayerData(result);
    setStats({
      ...s,
      coinsEarned: result.coinsEarned,
      newlyUnlocked: result.newlyUnlocked || [],
    });
    setScreen("gameover");
  };

  return (
    <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
      {screen === "menu" && (
        <MenuScreen
          playerData={playerData}
          onDataChange={(newData) => setPlayerData(newData)}
          onPlay={() => setScreen("game")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          playerData={playerData}
          skinId={playerData.equippedSkin}
          weaponId={playerData.equippedWeapon || "blaster"}
          weaponLevel={(playerData.ownedWeapons || [{ id: "blaster", level: 0 }]).find(w => w.id === (playerData.equippedWeapon || "blaster"))?.level || 0}
          sensitivity={playerData.sensitivity}
          soundEnabled={playerData.soundEnabled}
          vibrationEnabled={playerData.vibrationEnabled}
          onGameOver={handleGameOver}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "gameover" && (
        <GameOverScreen
          stats={stats}
          playerData={playerData}
          onPlayAgain={() => setScreen("game")}
          onMenu={() => { setPlayerData(getPlayerData()); setScreen("menu"); }}
        />
      )}
    </div>
  );
}
