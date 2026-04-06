import { useState } from "react";
import { Move, Crosshair, Shield, ChevronRight, X } from "lucide-react";

const STEPS = [
  {
    title: "DRAG TO MOVE",
    desc: "Touch and drag anywhere to move your ship left and right",
    Icon: Move,
    color: "#00aaff",
  },
  {
    title: "AUTO-FIRE",
    desc: "Your ship fires automatically while you're touching the screen",
    Icon: Crosshair,
    color: "#ff5544",
  },
  {
    title: "COLLECT POWER-UPS",
    desc: "Grab shields, rapid fire, triple shot, and extra lives to survive longer",
    Icon: Shield,
    color: "#00ddaa",
  },
];

export default function Tutorial({ onComplete }) {
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      setAnimKey(k => k + 1);
    } else {
      onComplete();
    }
  };

  const current = STEPS[step];

  return (
    <div style={s.overlay}>
      <div style={s.container} key={animKey}>
        {/* Skip */}
        <button style={s.skip} onClick={onComplete}>
          <X size={14} />
          <span>SKIP</span>
        </button>

        {/* Step indicator */}
        <div style={s.dots}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              ...s.dot,
              background: i === step ? current.color : "rgba(255,255,255,0.1)",
              width: i === step ? 20 : 6,
            }} />
          ))}
        </div>

        {/* Animated illustration */}
        <div style={s.illustrationArea}>
          <div style={{
            ...s.iconCircle,
            background: `${current.color}12`,
            border: `2px solid ${current.color}30`,
            boxShadow: `0 0 40px ${current.color}15`,
          }}>
            {/* Animated ring */}
            <div style={{
              ...s.ring,
              borderColor: `${current.color}20`,
              animation: "tutRing 2s ease-in-out infinite",
            }} />
            <current.Icon size={40} color={current.color} strokeWidth={1.5} />
          </div>

          {/* Step 0: drag animation */}
          {step === 0 && (
            <div style={s.dragAnim}>
              <div style={s.dragLine} />
              <div style={s.dragDot} />
            </div>
          )}

          {/* Step 1: bullet animation */}
          {step === 1 && (
            <div style={s.bulletAnim}>
              <div style={s.bullet1} />
              <div style={s.bullet2} />
              <div style={s.bullet3} />
            </div>
          )}

          {/* Step 2: powerup icons floating */}
          {step === 2 && (
            <div style={s.powerAnim}>
              <div style={{ ...s.powerDot, background: "#00e5ff", animationDelay: "0s" }} />
              <div style={{ ...s.powerDot, background: "#ffff00", animationDelay: "0.3s" }} />
              <div style={{ ...s.powerDot, background: "#ff00ff", animationDelay: "0.6s" }} />
              <div style={{ ...s.powerDot, background: "#00ff00", animationDelay: "0.9s" }} />
            </div>
          )}
        </div>

        {/* Text */}
        <h2 style={{ ...s.title, color: current.color }}>{current.title}</h2>
        <p style={s.desc}>{current.desc}</p>

        {/* Button */}
        <button style={{ ...s.nextBtn, background: current.color }} onClick={next}>
          <span>{step < STEPS.length - 1 ? "NEXT" : "LET'S GO"}</span>
          {step < STEPS.length - 1 && <ChevronRight size={16} />}
        </button>

        {/* Step counter */}
        <p style={s.counter}>{step + 1} / {STEPS.length}</p>
      </div>

      <style>{`
        @keyframes tutIn{0%{opacity:0;transform:translateY(20px) scale(0.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes tutRing{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.15);opacity:0.6}}
        @keyframes dragSlide{0%,100%{transform:translateX(-30px)}50%{transform:translateX(30px)}}
        @keyframes bulletUp{0%{transform:translateY(0);opacity:0.8}100%{transform:translateY(-60px);opacity:0}}
        @keyframes powerFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.15)}}
      `}</style>
    </div>
  );
}

const s = {
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.85)", zIndex: 50,
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(8px)",
  },
  container: {
    width: "85%", maxWidth: 320,
    textAlign: "center", padding: "32px 24px",
    animation: "tutIn 0.4s ease-out",
  },
  skip: {
    position: "absolute", top: 20, right: 20,
    display: "flex", alignItems: "center", gap: 4,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, padding: "6px 14px",
    color: "rgba(255,255,255,0.35)",
    fontSize: 10, fontWeight: 600, letterSpacing: 2,
    cursor: "pointer", fontFamily: "'Sora',sans-serif",
  },
  dots: {
    display: "flex", justifyContent: "center", gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 6, borderRadius: 3,
    transition: "all 0.3s ease",
  },
  illustrationArea: {
    position: "relative",
    width: 120, height: 120,
    margin: "0 auto 28px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  iconCircle: {
    width: 90, height: 90, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  ring: {
    position: "absolute", top: -8, left: -8,
    width: "calc(100% + 16px)", height: "calc(100% + 16px)",
    borderRadius: "50%", border: "1.5px solid",
  },
  // Drag animation
  dragAnim: {
    position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
    width: 80, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
  },
  dragLine: {
    width: 60, height: 2, borderRadius: 1,
    background: "rgba(0,170,255,0.15)",
  },
  dragDot: {
    position: "absolute", width: 12, height: 12,
    borderRadius: "50%", background: "rgba(0,170,255,0.4)",
    boxShadow: "0 0 12px rgba(0,170,255,0.3)",
    animation: "dragSlide 2s ease-in-out infinite",
  },
  // Bullet animation
  bulletAnim: {
    position: "absolute", top: -5, left: "50%", transform: "translateX(-50%)",
    width: 20, height: 60,
  },
  bullet1: {
    position: "absolute", left: "50%", transform: "translateX(-50%)",
    width: 4, height: 4, borderRadius: "50%",
    background: "#ff5544", boxShadow: "0 0 6px rgba(255,85,68,0.5)",
    animation: "bulletUp 0.8s linear infinite",
  },
  bullet2: {
    position: "absolute", left: "50%", transform: "translateX(-50%)",
    width: 4, height: 4, borderRadius: "50%",
    background: "#ff5544", boxShadow: "0 0 6px rgba(255,85,68,0.5)",
    animation: "bulletUp 0.8s linear infinite 0.3s",
  },
  bullet3: {
    position: "absolute", left: "50%", transform: "translateX(-50%)",
    width: 4, height: 4, borderRadius: "50%",
    background: "#ff5544", boxShadow: "0 0 6px rgba(255,85,68,0.5)",
    animation: "bulletUp 0.8s linear infinite 0.6s",
  },
  // Powerup animation
  powerAnim: {
    position: "absolute", bottom: -15, left: "50%", transform: "translateX(-50%)",
    display: "flex", gap: 10,
  },
  powerDot: {
    width: 10, height: 10, borderRadius: "50%",
    animation: "powerFloat 1.5s ease-in-out infinite",
  },
  title: {
    fontSize: 22, fontWeight: 800, letterSpacing: 3,
    margin: "0 0 10px", fontFamily: "'Sora',sans-serif",
  },
  desc: {
    fontSize: 13, fontWeight: 400,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 1.6, margin: "0 0 28px",
    fontFamily: "'Sora',sans-serif",
  },
  nextBtn: {
    width: "100%", height: 48, borderRadius: 14,
    border: "none", cursor: "pointer",
    fontSize: 14, fontWeight: 700, color: "#fff",
    letterSpacing: 4, fontFamily: "'Sora',sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  counter: {
    fontSize: 10, color: "rgba(255,255,255,0.15)",
    letterSpacing: 2, marginTop: 16,
    fontFamily: "'Sora',sans-serif",
  },
};
