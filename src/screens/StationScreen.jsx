import { useState, useEffect } from "react";
import { getPlayerData, startBuilding, upgradeModule, removeModule, collectFromModule, getActiveBuffs, checkModuleCompletions } from "../data/playerData.js";
import { STATION_MODULES, getModule, canBuild, getRequirementText } from "../data/modules.js";
import { X, ArrowUp, Clock, Check, Plus, Gem, Trash2, Lock, ChevronRight } from "lucide-react";
import { playClick, playConfirm, playCoinCollect, playPurchase } from "../audio/soundManager.js";

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatTime(ms) {
  if (ms <= 0) return "Done!";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatModuleValue(mod, level) {
  const stats = mod.levels[level];
  if (mod.type === "resource") return `${stats.coinsPerHour}/hr`;
  if (mod.type === "core") return `+${stats.unlocksSlots} slots`;
  if (stats.unlocksWeapon) return `${stats.unlocksWeapon.toUpperCase()} +${Math.round(stats.dmgBuff * 100)}% DMG`;
  if (stats.dmgBuff) return `+${Math.round(stats.dmgBuff * 100)}% DMG`;
  if (stats.coinMult) return `+${Math.round(stats.coinMult * 100)}% Coins`;
  if (stats.startShield) return `${stats.startShield}s Shield`;
  if (stats.droneSlots) return `+${stats.droneSlots} Drone Slots`;
  if (stats.upgradeDiscount) return `-${Math.round(stats.upgradeDiscount * 100)}% Costs`;
  if (stats.powerupDuration != null) return `+${Math.round(stats.powerupDuration * 100)}% Duration`;
  if (stats.allStats) return `+${Math.round(stats.allStats * 100)}% All`;
  return "Active";
}

const MODULE_ICONS = {
  sun: "\u2600",
  command: "\u2318",
  coins: "\ud83e\ude99",
  swords: "\u2694",
  shield: "\ud83d\udee1",
  bot: "\ud83e\udd16",
  package: "\ud83d\udce6",
  factory: "\ud83c\udfed",
  flask: "\ud83e\uddea",
  fortress: "\ud83c\udff0",
};

export default function StationScreen({ onClose, onDataChange }) {
  const [data, setData] = useState(getPlayerData());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModules, setShowModules] = useState(false);
  const [slotDetail, setSlotDetail] = useState(null);
  const [collectAnim, setCollectAnim] = useState(null);
  const [notification, setNotification] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Check module completions on every tick
  useEffect(() => {
    const result = checkModuleCompletions();
    if (result.notifications.length > 0) {
      refresh(result.data);
      const msg = result.notifications.map(n => {
        if (n.type === "weapon") return `WEAPON UNLOCKED: ${n.weapon.toUpperCase()}`;
        if (n.type === "slots") return `+${n.count} STATION SLOTS UNLOCKED`;
        return "";
      }).join(" | ");
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
    }
  }, [now]);

  const refresh = (newData) => {
    const d = newData || getPlayerData();
    setData(d);
    if (onDataChange) onDataChange(d);
  };

  const handleBuild = (moduleId) => {
    const result = startBuilding(selectedSlot, moduleId);
    if (result.success) {
      playPurchase();
      refresh(result.data);
    }
    setShowModules(false);
    setSelectedSlot(null);
  };

  const handleUpgrade = (slotIdx) => {
    const result = upgradeModule(slotIdx);
    if (result.success) {
      playPurchase();
      refresh(result.data);
      setSlotDetail(null);
    }
  };

  const handleCollect = (slotIdx) => {
    const result = collectFromModule(slotIdx);
    if (result.collected > 0) {
      playCoinCollect();
      setCollectAnim({ slot: slotIdx, amount: result.collected });
      setTimeout(() => setCollectAnim(null), 1200);
      refresh(result.data);
    }
  };

  const handleRemove = (slotIdx) => {
    const result = removeModule(slotIdx);
    if (result.success) {
      playClick();
      refresh(result.data);
      setSlotDetail(null);
    }
  };

  const handleSlotClick = (slotIdx) => {
    const slot = data.station.slots[slotIdx];
    if (slotIdx >= data.station.unlockedSlots) return;
    if (!slot) {
      playClick();
      setSelectedSlot(slotIdx);
      setShowModules(true);
      return;
    }
    const mod = getModule(slot.moduleId);
    if (mod?.type === "resource" && now >= slot.buildEndsAt) {
      handleCollect(slotIdx);
    } else {
      playClick();
      setSlotDetail(slotIdx);
    }
  };

  const buffs = getActiveBuffs();

  return (
    <div style={z.root}>
      {/* Header */}
      <div style={z.header}>
        <button style={z.backBtn} onClick={() => { playClick(); onClose(); }}>
          <X size={16} color="rgba(255,255,255,0.5)" />
        </button>
        <h2 style={z.title}>SPACE STATION</h2>
        <div style={z.coins}>
          <Gem size={12} color="#ffaa00" />
          <span>{data.coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div style={z.notifBanner}>{notification}</div>
      )}

      {/* Scrollable content */}
      <div style={z.scrollArea}>
        {/* Active Buffs Panel */}
        <ActiveBuffsPanel buffs={buffs} />

        {/* Station Grid - 8 slots in 2 rows */}
        <div style={z.section}>
          <div style={z.sectionHeader}>
            <span style={z.sectionTitle}>STATION SLOTS</span>
            <span style={z.sectionSub}>{data.station.unlockedSlots}/8 unlocked</span>
          </div>
          <div style={z.slotGrid}>
            {[...Array(8)].map((_, i) => {
              const slot = data.station.slots[i];
              const isUnlocked = i < data.station.unlockedSlots;
              const isBuilding = slot && now < slot.buildEndsAt;
              const mod = slot ? getModule(slot.moduleId) : null;

              return (
                <div
                  key={i}
                  style={{
                    ...z.slot,
                    borderColor: isBuilding ? "rgba(255,255,255,0.08)" :
                      mod ? hexToRgba(mod.color, 0.3) : "rgba(255,255,255,0.06)",
                    background: isBuilding ? "rgba(255,255,255,0.02)" :
                      mod ? hexToRgba(mod.color, 0.06) : "rgba(255,255,255,0.02)",
                    cursor: isUnlocked ? "pointer" : "default",
                    opacity: isUnlocked ? 1 : 0.3,
                  }}
                  onClick={() => handleSlotClick(i)}
                >
                  {!isUnlocked && <span style={z.lockIcon}><Lock size={14} color="rgba(255,255,255,0.3)" /></span>}
                  {isUnlocked && !slot && <Plus size={18} color="rgba(255,255,255,0.25)" />}
                  {slot && isBuilding && (
                    <div style={z.slotInner}>
                      <Clock size={14} color="rgba(255,255,255,0.4)" />
                      <div style={z.buildTimer}>{formatTime(slot.buildEndsAt - now)}</div>
                      <div style={z.progressBar}>
                        <div style={{
                          ...z.progressFill,
                          width: `${Math.max(0, (1 - (slot.buildEndsAt - now) / (mod.levels[slot.level].buildTime)) * 100)}%`,
                          background: mod.color,
                        }} />
                      </div>
                    </div>
                  )}
                  {slot && !isBuilding && (
                    <div style={z.slotInner}>
                      <span style={{ fontSize: 18 }}>{MODULE_ICONS[mod.icon] || "\u2605"}</span>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>LV{slot.level + 1}</div>
                      {mod.type === "resource" && (() => {
                        const elapsed = now - slot.lastCollected;
                        const hours = Math.min(mod.maxStorage, elapsed / 3600000);
                        const pending = Math.floor(mod.levels[slot.level].coinsPerHour * hours);
                        return pending > 0 ? (
                          <div style={z.collectBadge}>+{pending}</div>
                        ) : null;
                      })()}
                      {mod.type !== "resource" && <Check size={10} color="#00ff88" />}
                    </div>
                  )}
                  {collectAnim && collectAnim.slot === i && (
                    <div style={z.collectPopup}>+{collectAnim.amount}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tech Tree / Module Library */}
        <div style={z.section}>
          <div style={z.sectionHeader}>
            <span style={z.sectionTitle}>TECH TREE</span>
          </div>
          {[1, 2, 3, 4, 5].map(tier => {
            const tierModules = STATION_MODULES.filter(m => m.tier === tier);
            if (tierModules.length === 0) return null;
            return (
              <div key={tier} style={{ marginBottom: 12 }}>
                <div style={z.tierLabel}>TIER {tier}</div>
                {tierModules.map(m => {
                  const isBuilt = data.station.slots.some(s => s && s.moduleId === m.id);
                  const builtSlot = data.station.slots.find(s => s && s.moduleId === m.id);
                  const builtLevel = builtSlot ? builtSlot.level : -1;
                  const meetsReqs = canBuild(m.id, data);
                  const reqText = getRequirementText(m.id);
                  const isMaxed = isBuilt && builtLevel >= m.levels.length - 1;

                  return (
                    <div key={m.id} style={{
                      ...z.techCard,
                      opacity: meetsReqs || isBuilt ? 1 : 0.45,
                      borderColor: isBuilt ? hexToRgba(m.color, 0.25) : "rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ ...z.techIcon, background: hexToRgba(m.color, 0.1), borderColor: hexToRgba(m.color, 0.2) }}>
                        <span style={{ fontSize: 18 }}>{MODULE_ICONS[m.icon] || "\u2605"}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={z.techName}>{m.name}</span>
                          {isBuilt && (
                            <span style={{ fontSize: 8, color: m.color, fontWeight: 700 }}>
                              LV{builtLevel + 1}/{m.levels.length}
                            </span>
                          )}
                          {isMaxed && (
                            <span style={{ fontSize: 7, color: "#00ff88", fontWeight: 700, letterSpacing: 1 }}>MAX</span>
                          )}
                        </div>
                        <div style={z.techDesc}>{m.desc}</div>
                        {isBuilt && m.levels[builtLevel]?.desc && (
                          <div style={{ fontSize: 11, color: "#88ddff", marginTop: 4 }}>
                            {m.levels[builtLevel].desc}
                          </div>
                        )}
                        {!isBuilt && meetsReqs && m.levels[0]?.desc && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, fontStyle: "italic" }}>
                            {m.levels[0].desc}
                          </div>
                        )}
                        {!meetsReqs && !isBuilt && reqText && (
                          <div style={z.techReq}>Requires: {reqText}</div>
                        )}
                        {isBuilt && !isMaxed && (
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            Next: {formatModuleValue(m, builtLevel + 1)} \u00b7 {m.levels[builtLevel + 1].buildCost.toLocaleString()} coins
                          </div>
                        )}
                        {!isBuilt && meetsReqs && (
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            {formatModuleValue(m, 0)} \u00b7 {m.levels[0].buildCost.toLocaleString()} coins \u00b7 {formatTime(m.levels[0].buildTime)}
                          </div>
                        )}
                      </div>
                      {isBuilt && (
                        <div style={{ ...z.techStatus, background: hexToRgba(m.color, 0.1) }}>
                          <Check size={12} color={m.color} />
                        </div>
                      )}
                      {!isBuilt && !meetsReqs && (
                        <div style={z.techStatus}>
                          <Lock size={12} color="rgba(255,255,255,0.2)" />
                        </div>
                      )}
                      {!isBuilt && meetsReqs && (
                        <div style={{ ...z.techStatus, background: hexToRgba(m.color, 0.15) }}>
                          <ChevronRight size={14} color={m.color} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom spacer */}
        <div style={{ height: 40 }} />
      </div>

      {/* Module selector sheet */}
      {showModules && (
        <div style={z.sheetBg} onClick={() => { setShowModules(false); setSelectedSlot(null); }}>
          <div style={z.sheet} onClick={e => e.stopPropagation()}>
            <div style={z.sheetTop}>
              <h3 style={z.sheetTitle}>SELECT MODULE</h3>
              <button style={z.sheetClose} onClick={() => { setShowModules(false); setSelectedSlot(null); }}>
                <X size={14} color="rgba(255,255,255,0.5)" />
              </button>
            </div>
            <div style={z.moduleList}>
              {STATION_MODULES.map(m => {
                const cost = m.levels[0].buildCost;
                const time = m.levels[0].buildTime;
                const canAfford = data.coins >= cost;
                const alreadyBuilt = data.station.slots.some(s => s && s.moduleId === m.id);
                const meetsReqs = canBuild(m.id, data);
                const reqText = getRequirementText(m.id);
                const canPlace = canAfford && !alreadyBuilt && meetsReqs;
                return (
                  <div key={m.id} style={{ ...z.moduleCard, opacity: canPlace ? 1 : 0.45 }}>
                    <div style={{ ...z.moduleIconBox, background: hexToRgba(m.color, 0.1), borderColor: hexToRgba(m.color, 0.2) }}>
                      <span style={{ fontSize: 20 }}>{MODULE_ICONS[m.icon] || "\u2605"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={z.moduleName}>{m.name}</div>
                      <div style={z.moduleDesc}>{m.desc}</div>
                      {m.levels[0]?.desc && (
                        <div style={{ fontSize: 10, color: "#88ddff", marginTop: 2 }}>{m.levels[0].desc}</div>
                      )}
                      {!meetsReqs && reqText && (
                        <div style={{ fontSize: 9, color: "#ff5544", marginTop: 2 }}>Requires: {reqText}</div>
                      )}
                      <div style={z.moduleStats}>
                        {formatModuleValue(m, 0)} \u00b7 {formatTime(time)}
                        {m.levels.length > 1 && ` \u00b7 ${m.levels.length} levels`}
                      </div>
                    </div>
                    <button
                      disabled={!canPlace}
                      onClick={() => handleBuild(m.id)}
                      style={{ ...z.buildBtn, background: canPlace ? hexToRgba(m.color, 0.2) : "rgba(255,255,255,0.04)" }}
                    >
                      {alreadyBuilt ? (
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>BUILT</span>
                      ) : !meetsReqs ? (
                        <Lock size={12} color="rgba(255,255,255,0.3)" />
                      ) : (
                        <>
                          <Gem size={10} color="#ffaa00" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{cost.toLocaleString()}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Slot detail sheet */}
      {slotDetail !== null && (() => {
        const slot = data.station.slots[slotDetail];
        if (!slot) return null;
        const mod = getModule(slot.moduleId);
        if (!mod) return null;
        const isBuilding = now < slot.buildEndsAt;
        const canUpgrade = !isBuilding && slot.level < mod.levels.length - 1;
        const nextCost = canUpgrade ? mod.levels[slot.level + 1].buildCost : 0;
        const canAffordUpgrade = canUpgrade && data.coins >= nextCost;

        return (
          <div style={z.sheetBg} onClick={() => setSlotDetail(null)}>
            <div style={z.detailSheet} onClick={e => e.stopPropagation()}>
              <div style={z.sheetTop}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{MODULE_ICONS[mod.icon] || "\u2605"}</span>
                  <div>
                    <h3 style={z.sheetTitle}>{mod.name}</h3>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Level {slot.level + 1} / {mod.levels.length}</div>
                  </div>
                </div>
                <button style={z.sheetClose} onClick={() => setSlotDetail(null)}>
                  <X size={14} color="rgba(255,255,255,0.5)" />
                </button>
              </div>

              <div style={{ padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{mod.desc}</div>
                {mod.levels[slot.level]?.desc && (
                  <div style={{ fontSize: 11, color: "#88ddff", marginBottom: 8 }}>{mod.levels[slot.level].desc}</div>
                )}
                <div style={{ fontSize: 13, color: mod.color, fontWeight: 700, marginBottom: 12 }}>
                  {formatModuleValue(mod, slot.level)}
                </div>

                {isBuilding && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Building...</div>
                    <div style={z.progressBarLg}>
                      <div style={{
                        ...z.progressFill,
                        width: `${Math.max(0, (1 - (slot.buildEndsAt - now) / mod.levels[slot.level].buildTime) * 100)}%`,
                        background: mod.color,
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{formatTime(slot.buildEndsAt - now)} remaining</div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  {canUpgrade && (
                    <button
                      style={{ ...z.actionBtn, background: canAffordUpgrade ? hexToRgba(mod.color, 0.2) : "rgba(255,255,255,0.04)", opacity: canAffordUpgrade ? 1 : 0.5, flex: 1 }}
                      disabled={!canAffordUpgrade}
                      onClick={() => handleUpgrade(slotDetail)}
                    >
                      <ArrowUp size={12} color={mod.color} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>Upgrade</span>
                      <Gem size={10} color="#ffaa00" />
                      <span style={{ fontSize: 10, color: "#ffaa00" }}>{nextCost.toLocaleString()}</span>
                    </button>
                  )}
                  {!isBuilding && (
                    <button
                      style={{ ...z.actionBtn, background: "rgba(255,60,60,0.1)", flexShrink: 0 }}
                      onClick={() => handleRemove(slotDetail)}
                    >
                      <Trash2 size={12} color="#ff4444" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ActiveBuffsPanel({ buffs }) {
  const activeList = [];

  if (buffs.damage_mult > 0)      activeList.push({ icon: "\u2694", label: "Damage", value: `+${(buffs.damage_mult * 100).toFixed(0)}%`, color: "#ff5544" });
  if (buffs.coin_mult > 0)        activeList.push({ icon: "\ud83d\udcb0", label: "Coin earn", value: `+${(buffs.coin_mult * 100).toFixed(0)}%`, color: "#ffdd44" });
  if (buffs.powerup_duration > 0) activeList.push({ icon: "\u23f1", label: "Powerup time", value: `+${(buffs.powerup_duration * 100).toFixed(0)}%`, color: "#aa55ff" });
  if (buffs.start_shield > 0)     activeList.push({ icon: "\ud83d\udee1", label: "Start shield", value: `${buffs.start_shield}s`, color: "#00aaff" });
  if (buffs.drone_slots > 0)      activeList.push({ icon: "\ud83e\udd16", label: "Drone slots", value: `+${buffs.drone_slots}`, color: "#88ddff" });
  if (buffs.drone_discount > 0)   activeList.push({ icon: "%", label: "Drone discount", value: `-${(buffs.drone_discount * 100).toFixed(0)}%`, color: "#88ddff" });
  if (buffs.upgrade_discount > 0) activeList.push({ icon: "%", label: "Upgrade discount", value: `-${(buffs.upgrade_discount * 100).toFixed(0)}%`, color: "#ff44aa" });
  if (buffs.start_powerups > 0)   activeList.push({ icon: "\u2728", label: "Start powerups", value: `+${buffs.start_powerups}`, color: "#aa55ff" });

  return (
    <div style={z.buffPanel}>
      <div style={z.sectionHeader}>
        <span style={z.sectionTitle}>ACTIVE BUFFS</span>
      </div>
      {activeList.length === 0 ? (
        <p style={z.noBuffs}>No active buffs. Build modules to earn permanent boosts.</p>
      ) : (
        <div style={z.buffList}>
          {activeList.map((b, i) => (
            <div key={i} style={z.buffRow}>
              <span style={{ fontSize: 14, minWidth: 20, textAlign: "center" }}>{b.icon}</span>
              <span style={z.buffLabel}>{b.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: b.color, marginLeft: "auto" }}>{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const z = {
  root: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(4,4,16,0.98)",
    display: "flex", flexDirection: "column",
    zIndex: 20,
    animation: "fi 0.3s ease-out",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 16px 8px",
    flexShrink: 0,
  },
  backBtn: {
    background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 10,
    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  title: {
    fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: 3,
  },
  coins: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 13, fontWeight: 700, color: "#ffaa00",
  },
  notifBanner: {
    background: "rgba(0,220,170,0.15)", border: "1px solid rgba(0,220,170,0.3)",
    borderRadius: 10, margin: "0 16px 8px", padding: "8px 12px",
    fontSize: 11, fontWeight: 700, color: "#00ddaa",
    textAlign: "center", letterSpacing: 1.5,
    animation: "fi 0.3s ease-out",
  },
  scrollArea: {
    flex: 1, overflowY: "auto", padding: "0 16px",
    WebkitOverflowScrolling: "touch",
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.25)",
    letterSpacing: 2,
  },
  sectionSub: {
    fontSize: 9, color: "rgba(255,255,255,0.2)",
  },
  // Slot grid - 4 columns, 2 rows
  slotGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
  },
  slot: {
    aspectRatio: "1", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s",
    position: "relative",
  },
  lockIcon: { display: "flex", alignItems: "center", justifyContent: "center" },
  slotInner: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  },
  buildTimer: {
    fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)",
  },
  progressBar: {
    width: 48, height: 3, borderRadius: 2,
    background: "rgba(255,255,255,0.06)", overflow: "hidden",
  },
  progressBarLg: {
    width: "100%", height: 5, borderRadius: 3,
    background: "rgba(255,255,255,0.06)", overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: 2, transition: "width 1s linear",
  },
  collectBadge: {
    fontSize: 9, fontWeight: 700, color: "#ffaa00",
    background: "rgba(255,170,0,0.15)", borderRadius: 6,
    padding: "1px 5px", marginTop: 1,
  },
  collectPopup: {
    position: "absolute", top: -12,
    fontSize: 14, fontWeight: 800, color: "#ffaa00",
    textShadow: "0 0 8px rgba(255,170,0,0.5)",
    animation: "coinFloat 1.2s ease-out forwards",
    pointerEvents: "none",
  },
  // Buff panel
  buffPanel: {
    marginBottom: 16,
  },
  noBuffs: {
    fontSize: 10, color: "rgba(255,255,255,0.2)", margin: "4px 0",
  },
  buffList: {
    display: "flex", flexDirection: "column", gap: 4,
  },
  buffRow: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 10px", borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
  },
  buffLabel: {
    fontSize: 11, color: "rgba(255,255,255,0.5)",
  },
  // Tech tree
  tierLabel: {
    fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.15)",
    letterSpacing: 2, marginBottom: 6,
  },
  techCard: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px", borderRadius: 12,
    marginBottom: 6,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
    transition: "opacity 0.2s",
  },
  techIcon: {
    width: 40, height: 40, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid", flexShrink: 0,
  },
  techName: {
    fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)",
  },
  techDesc: {
    fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1,
  },
  techReq: {
    fontSize: 9, color: "#ff5544", marginTop: 2,
  },
  techStatus: {
    width: 32, height: 32, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  // Sheets
  sheetBg: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.6)", zIndex: 30,
    display: "flex", alignItems: "flex-end",
  },
  sheet: {
    width: "100%", maxHeight: "70%",
    borderRadius: "20px 20px 0 0",
    background: "rgba(8,8,22,0.97)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.05)", borderBottom: "none",
    display: "flex", flexDirection: "column",
    animation: "su 0.25s ease-out",
  },
  detailSheet: {
    width: "100%",
    borderRadius: "20px 20px 0 0",
    background: "rgba(8,8,22,0.97)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.05)", borderBottom: "none",
    animation: "su 0.25s ease-out",
  },
  sheetTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 16px 8px",
  },
  sheetTitle: {
    fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 1.5, margin: 0,
  },
  sheetClose: {
    background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8,
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  moduleList: {
    padding: "4px 12px 24px", overflowY: "auto", flex: 1,
  },
  moduleCard: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px", borderRadius: 12,
    marginBottom: 6,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.04)",
    transition: "opacity 0.2s",
  },
  moduleIconBox: {
    width: 40, height: 40, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid", flexShrink: 0,
  },
  moduleName: {
    fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)",
  },
  moduleDesc: {
    fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1,
  },
  moduleStats: {
    fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 3,
  },
  buildBtn: {
    display: "flex", alignItems: "center", gap: 4,
    padding: "6px 10px", borderRadius: 8,
    border: "none", cursor: "pointer",
  },
  actionBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "10px 14px", borderRadius: 10,
    border: "none", cursor: "pointer",
  },
};
