import React from "react";

export function PilotHelmet({ pilotId, size = 24 }) {
  switch (pilotId) {
    case "rebel":   return <RebelHelmet size={size} />;
    case "trooper": return <TrooperHelmet size={size} />;
    case "tie":     return <TIEHelmet size={size} />;
    case "dark":    return <DarkHelmet size={size} />;
    default:        return <RebelHelmet size={size} />;
  }
}

function RebelHelmet({ size }) {
  return (
    <svg width={size} height={size * 1.16} viewBox="0 0 24 28">
      <path d="M3 8 Q3 3 8 1 Q12 0 16 1 Q21 3 21 8 L21.5 17 Q21 22 19 25 L17 27 L7 27 L5 25 Q3 22 2.5 17 Z" fill="#f5dc8a" stroke="#8a6520" strokeWidth="0.4"/>
      <rect x="4" y="6" width="16" height="3" fill="#cc4422"/>
      <path d="M4 11 L20 11 L19.5 16 L4.5 16 Z" fill="#3a2810" stroke="#5a4818" strokeWidth="0.3"/>
      <path d="M5 12 L19 12 L18.5 15 L5.5 15 Z" fill="#aa7722" opacity="0.7"/>
      <path d="M5.5 12.5 L18.5 12.5 L18 14 L6 14 Z" fill="#dd9933" opacity="0.5"/>
      <rect x="5.5" y="17" width="1" height="6" fill="#cc4422" opacity="0.6"/>
      <rect x="17.5" y="17" width="1" height="6" fill="#cc4422" opacity="0.6"/>
      <rect x="8" y="20" width="8" height="3" rx="0.5" fill="#daa548"/>
    </svg>
  );
}

function TrooperHelmet({ size }) {
  return (
    <svg width={size} height={size * 1.16} viewBox="0 0 24 28">
      <path d="M3 8 Q3 3 8 1 Q12 0 16 1 Q21 3 21 8 L21.5 17 Q21 22 19 25 L17 27 L7 27 L5 25 Q3 22 2.5 17 Z" fill="#f0f0f0" stroke="#888" strokeWidth="0.4"/>
      <path d="M4 6 Q4 3 8 1.5 Q12 0.8 16 1.5 Q20 3 20 6" fill="#fafafa"/>
      <path d="M5 11 L19 11 L18 16 L6 16 Z" fill="#0a0a0e"/>
      <polygon points="11,11.5 12,10 13,11.5" fill="#0a0a0e"/>
      <rect x="11" y="16.5" width="2" height="2.5" rx="0.3" fill="#e0e0e0" stroke="#888" strokeWidth="0.2"/>
      <path d="M6 19 L18 19 L17 23 L7 23 Z" fill="#dddddd" stroke="#888" strokeWidth="0.3"/>
      <path d="M9 21 Q12 22.5 15 21" stroke="#222" strokeWidth="0.4" fill="none"/>
      <line x1="5" y1="18" x2="5" y2="22" stroke="#888" strokeWidth="0.3"/>
      <line x1="19" y1="18" x2="19" y2="22" stroke="#888" strokeWidth="0.3"/>
    </svg>
  );
}

function TIEHelmet({ size }) {
  return (
    <svg width={size} height={size * 1.16} viewBox="0 0 24 28">
      <path d="M3 8 Q3 3 8 1 Q12 0 16 1 Q21 3 21 8 L21.5 17 Q21 22 19 25 L17 27 L7 27 L5 25 Q3 22 2.5 17 Z" fill="#0a0a14" stroke="#1e1e2a" strokeWidth="0.4"/>
      <path d="M4 6 Q4 3 8 1.5 Q12 0.8 16 1.5 Q20 3 20 6" fill="#14141e"/>
      <rect x="4" y="10" width="16" height="6" fill="#04040a" stroke="#222" strokeWidth="0.3"/>
      <line x1="5" y1="11.5" x2="19" y2="11.5" stroke="#1a1a2a" strokeWidth="0.3"/>
      <line x1="5" y1="14" x2="19" y2="14" stroke="#1a1a2a" strokeWidth="0.3"/>
      <circle cx="8" cy="13" r="0.6" fill="#aa3322" opacity="0.6"/>
      <circle cx="16" cy="13" r="0.6" fill="#aa3322" opacity="0.6"/>
      <rect x="9" y="7" width="6" height="2" rx="0.3" fill="#16161a"/>
      <rect x="7" y="18" width="10" height="5" rx="0.5" fill="#16161a" stroke="#2a2a30" strokeWidth="0.3"/>
      <line x1="9" y1="19" x2="9" y2="22" stroke="#2a2a30" strokeWidth="0.3"/>
      <line x1="11" y1="19" x2="11" y2="22" stroke="#2a2a30" strokeWidth="0.3"/>
      <line x1="13" y1="19" x2="13" y2="22" stroke="#2a2a30" strokeWidth="0.3"/>
      <line x1="15" y1="19" x2="15" y2="22" stroke="#2a2a30" strokeWidth="0.3"/>
      <path d="M5 23 Q3 25 1 27" stroke="#1a1a24" strokeWidth="1.5" fill="none"/>
      <path d="M19 23 Q21 25 23 27" stroke="#1a1a24" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function DarkHelmet({ size }) {
  return (
    <svg width={size} height={size * 1.16} viewBox="0 0 24 28">
      <path d="M3 8 Q3 3 8 1 Q12 0 16 1 Q21 3 21 8 L21.5 17 Q21 22 19 25 L17 27 L7 27 L5 25 Q3 22 2.5 17 Z" fill="#0a0a0e" stroke="#222226" strokeWidth="0.5"/>
      <path d="M4 6 Q4 3 8 1.5 Q12 0.8 16 1.5 Q20 3 20 6" fill="#16161a"/>
      <polygon points="5,11 9,10 9.5,14 6,14.5" fill="#1a0808" stroke="#330000" strokeWidth="0.3"/>
      <polygon points="19,11 15,10 14.5,14 18,14.5" fill="#1a0808" stroke="#330000" strokeWidth="0.3"/>
      <polygon points="6,11.5 8.5,10.8 9,13.5 6.5,13.8" fill="#cc1100" opacity="0.5"/>
      <polygon points="18,11.5 15.5,10.8 15,13.5 17.5,13.8" fill="#cc1100" opacity="0.5"/>
      <circle cx="7.5" cy="12.5" r="0.4" fill="#ff3300"/>
      <circle cx="16.5" cy="12.5" r="0.4" fill="#ff3300"/>
      <polygon points="11,9 12,6 13,9" fill="#1a1a1e"/>
      <path d="M5 9.5 Q12 8 19 9.5" stroke="#000" strokeWidth="0.5" fill="none"/>
      <rect x="8" y="17" width="8" height="6" rx="0.5" fill="#0a0a0e" stroke="#222226" strokeWidth="0.3"/>
      <line x1="9" y1="18" x2="9" y2="22" stroke="#1a1a20" strokeWidth="0.3"/>
      <line x1="10" y1="18" x2="10" y2="22" stroke="#1a1a20" strokeWidth="0.3"/>
      <line x1="11" y1="18" x2="11" y2="22" stroke="#1a1a20" strokeWidth="0.3"/>
      <line x1="13" y1="18" x2="13" y2="22" stroke="#1a1a20" strokeWidth="0.3"/>
      <line x1="14" y1="18" x2="14" y2="22" stroke="#1a1a20" strokeWidth="0.3"/>
      <line x1="15" y1="18" x2="15" y2="22" stroke="#1a1a20" strokeWidth="0.3"/>
      <rect x="11" y="19" width="2" height="2" rx="0.2" fill="#222226"/>
      <rect x="4" y="18" width="1.5" height="3" rx="0.2" fill="#222226"/>
      <rect x="18.5" y="18" width="1.5" height="3" rx="0.2" fill="#222226"/>
    </svg>
  );
}

// Canvas drawing function for in-game rendering
export function drawPilotHelmet(ctx, x, y, pilotId) {
  switch (pilotId) {
    case "rebel":
      ctx.fillStyle = "#f5dc8a";
      ctx.strokeStyle = "#8a6520";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cc4422";
      ctx.fillRect(x - 5, y - 4, 10, 1.5);
      ctx.fillStyle = "#aa7722";
      ctx.fillRect(x - 5, y - 1, 10, 3);
      break;

    case "trooper":
      ctx.fillStyle = "#f0f0f0";
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0a0a0e";
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 1);
      ctx.lineTo(x + 5, y - 1);
      ctx.lineTo(x + 4, y + 2);
      ctx.lineTo(x - 4, y + 2);
      ctx.closePath();
      ctx.fill();
      break;

    case "tie":
      ctx.fillStyle = "#0a0a14";
      ctx.strokeStyle = "#1e1e2a";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#04040a";
      ctx.fillRect(x - 5, y - 1, 10, 3);
      ctx.fillStyle = "#cc3322";
      ctx.beginPath();
      ctx.arc(x - 2.5, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 2.5, y, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "dark":
      ctx.fillStyle = "#0a0a0e";
      ctx.strokeStyle = "#222226";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cc1100";
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 1);
      ctx.lineTo(x - 1.5, y - 2);
      ctx.lineTo(x - 1, y + 1);
      ctx.lineTo(x - 3.5, y + 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 1);
      ctx.lineTo(x + 1.5, y - 2);
      ctx.lineTo(x + 1, y + 1);
      ctx.lineTo(x + 3.5, y + 1.5);
      ctx.closePath();
      ctx.fill();
      break;
  }
}
