import React from "react";
import { PilotHelmet } from "./PilotHelmet.jsx";

export function ReaperSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <ellipse cx="140" cy="170" rx="120" ry="140" fill="#aa00aa" opacity="0.04"/>
      <path d="M140 130 Q70 145 35 185 Q22 240 60 270 Q105 240 130 185" fill="#2a0e35" stroke="#aa44cc" strokeWidth="1"/>
      <path d="M140 130 Q210 145 245 185 Q258 240 220 270 Q175 240 150 185" fill="#2a0e35" stroke="#aa44cc" strokeWidth="1"/>
      <path d="M140 145 Q90 165 60 215" fill="none" stroke="#dd66ff" strokeWidth="0.5" opacity="0.4"/>
      <path d="M140 150 Q105 175 75 225" fill="none" stroke="#dd66ff" strokeWidth="0.4" opacity="0.3"/>
      <path d="M140 145 Q190 165 220 215" fill="none" stroke="#dd66ff" strokeWidth="0.5" opacity="0.4"/>
      <path d="M140 150 Q175 175 205 225" fill="none" stroke="#dd66ff" strokeWidth="0.4" opacity="0.3"/>
      <path d="M35 185 L20 170 L33 195 Z" fill="#3a1645" stroke="#aa44cc" strokeWidth="0.5"/>
      <path d="M245 185 L260 170 L247 195 Z" fill="#3a1645" stroke="#aa44cc" strokeWidth="0.5"/>
      <path d="M140 30 Q170 55 185 130 Q190 220 160 280 Q140 310 120 280 Q90 220 95 130 Q110 55 140 30 Z" fill="#3a1645" stroke="#aa44cc" strokeWidth="1"/>
      <path d="M140 42 Q165 65 178 135 Q182 215 155 270 Q140 295 125 270 Q98 215 102 135 Q115 65 140 42 Z" fill="#4a1c5a" stroke="#bb55dd" strokeWidth="0.5"/>
      <ellipse cx="140" cy="115" rx="18" ry="26" fill="#1a0820" stroke="#dd44ff" strokeWidth="1"/>
      <ellipse cx="140" cy="115" rx="14" ry="22" fill="#aa44cc" opacity="0.4"/>
      <circle cx="140" cy="115" r="10" fill="#2a1240" stroke="#dd66ff" strokeWidth="0.5"/>
      <rect x="131" y="112" width="18" height="6" rx="1" fill="#dd88ff" opacity="0.7"/>
      <ellipse cx="137" cy="108" rx="4" ry="5" fill="#ffccff" opacity="0.4"/>
      <path d="M140 155 Q132 200 140 245" stroke="#dd66ff" strokeWidth="0.5" opacity="0.4" fill="none"/>
      <ellipse cx="140" cy="300" rx="14" ry="10" fill="#dd44ff" opacity="0.3"/>
      <ellipse cx="140" cy="298" rx="10" ry="7" fill="#ff66ff" opacity="0.4"/>
      <ellipse cx="140" cy="296" rx="6" ry="4" fill="#ffccff" opacity="0.5"/>
    </svg>
  );
}

export function TitanSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <ellipse cx="140" cy="280" rx="80" ry="40" fill="#cc6622" opacity="0.06"/>
      <rect x="20" y="100" width="50" height="180" rx="5" fill="#3a2818" stroke="#aa6622" strokeWidth="0.8"/>
      <rect x="25" y="105" width="40" height="170" rx="3" fill="#4a3320" stroke="#cc7733" strokeWidth="0.5"/>
      <circle cx="35" cy="115" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <circle cx="55" cy="115" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <circle cx="35" cy="265" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <circle cx="55" cy="265" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <rect x="25" y="155" width="40" height="3" fill="#5a3f25"/>
      <rect x="25" y="190" width="40" height="3" fill="#5a3f25"/>
      <rect x="25" y="225" width="40" height="3" fill="#5a3f25"/>
      <rect x="38" y="85" width="14" height="18" rx="1" fill="#1a1208" stroke="#cc7733" strokeWidth="0.6"/>
      <circle cx="45" cy="85" r="3" fill="#ff6622" opacity="0.6"/>
      <rect x="210" y="100" width="50" height="180" rx="5" fill="#3a2818" stroke="#aa6622" strokeWidth="0.8"/>
      <rect x="215" y="105" width="40" height="170" rx="3" fill="#4a3320" stroke="#cc7733" strokeWidth="0.5"/>
      <circle cx="225" cy="115" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <circle cx="245" cy="115" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <circle cx="225" cy="265" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <circle cx="245" cy="265" r="2.5" fill="#1a1208" stroke="#aa6622" strokeWidth="0.5"/>
      <rect x="215" y="155" width="40" height="3" fill="#5a3f25"/>
      <rect x="215" y="190" width="40" height="3" fill="#5a3f25"/>
      <rect x="215" y="225" width="40" height="3" fill="#5a3f25"/>
      <rect x="228" y="85" width="14" height="18" rx="1" fill="#1a1208" stroke="#cc7733" strokeWidth="0.6"/>
      <circle cx="235" cy="85" r="3" fill="#ff6622" opacity="0.6"/>
      <path d="M140 50 L185 95 L195 235 L185 280 L140 305 L95 280 L85 235 L95 95 Z" fill="#3a2818" stroke="#aa6622" strokeWidth="1.2"/>
      <path d="M140 60 L180 100 L188 230 L180 273 L140 295 L100 273 L92 230 L100 100 Z" fill="#4a3320" stroke="#cc7733" strokeWidth="0.6"/>
      <line x1="100" y1="140" x2="180" y2="140" stroke="#5a3f25" strokeWidth="0.6"/>
      <line x1="98" y1="180" x2="182" y2="180" stroke="#5a3f25" strokeWidth="0.6"/>
      <line x1="98" y1="220" x2="182" y2="220" stroke="#5a3f25" strokeWidth="0.6"/>
      <line x1="98" y1="255" x2="182" y2="255" stroke="#5a3f25" strokeWidth="0.6"/>
      <rect x="118" y="92" width="44" height="42" rx="4" fill="#1a1208" stroke="#cc7733" strokeWidth="0.8"/>
      <rect x="123" y="97" width="34" height="32" rx="3" fill="#0e0804"/>
      <rect x="127" y="103" width="26" height="20" rx="2" fill="#ff8844" opacity="0.4"/>
      <circle cx="140" cy="113" r="9" fill="#3a2818" stroke="#cc7733" strokeWidth="0.5"/>
      <rect x="131" y="111" width="18" height="6" rx="1" fill="#ffaa44" opacity="0.7"/>
      <rect x="105" y="295" width="22" height="20" rx="2" fill="#1a1208" stroke="#aa6622" strokeWidth="0.7"/>
      <rect x="153" y="295" width="22" height="20" rx="2" fill="#1a1208" stroke="#aa6622" strokeWidth="0.7"/>
      <rect x="110" y="300" width="12" height="10" rx="1" fill="#ff6622" opacity="0.5"/>
      <rect x="158" y="300" width="12" height="10" rx="1" fill="#ff6622" opacity="0.5"/>
      <line x1="135" y1="50" x2="135" y2="35" stroke="#cc7733" strokeWidth="0.7"/>
      <line x1="140" y1="50" x2="140" y2="28" stroke="#cc7733" strokeWidth="0.8"/>
      <line x1="145" y1="50" x2="145" y2="35" stroke="#cc7733" strokeWidth="0.7"/>
      <circle cx="140" cy="26" r="2.5" fill="#ff8833" opacity="0.6"/>
    </svg>
  );
}

export function ShadowSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <ellipse cx="140" cy="180" rx="60" ry="120" fill="#222244" opacity="0.05"/>
      <polygon points="140,80 70,140 40,210 70,235 120,200 140,150" fill="#0e0e1e" stroke="#556688" strokeWidth="0.8"/>
      <polygon points="140,80 210,140 240,210 210,235 160,200 140,150" fill="#0e0e1e" stroke="#556688" strokeWidth="0.8"/>
      <line x1="70" y1="140" x2="120" y2="200" stroke="#6677aa" strokeWidth="0.4" opacity="0.4"/>
      <line x1="210" y1="140" x2="160" y2="200" stroke="#6677aa" strokeWidth="0.4" opacity="0.4"/>
      <circle cx="42" cy="220" r="2" fill="#6688ff" opacity="0.5"/>
      <circle cx="238" cy="220" r="2" fill="#6688ff" opacity="0.5"/>
      <path d="M140 60 L160 120 L165 220 L155 270 L140 300 L125 270 L115 220 L120 120 Z" fill="#141428" stroke="#445577" strokeWidth="0.9"/>
      <path d="M140 70 L156 122 L162 218 L152 265 L140 290 L128 265 L118 218 L124 122 Z" fill="#1a1a32" stroke="#556688" strokeWidth="0.5"/>
      <line x1="140" y1="70" x2="140" y2="290" stroke="#6677aa" strokeWidth="0.3" opacity="0.4"/>
      <ellipse cx="140" cy="130" rx="7" ry="22" fill="#141428" stroke="#6677aa" strokeWidth="0.6"/>
      <ellipse cx="140" cy="130" rx="5" ry="18" fill="#1e1e3a"/>
      <circle cx="140" cy="135" r="6" fill="#0e0e22" stroke="#6677aa" strokeWidth="0.5"/>
      <rect x="134" y="132" width="12" height="4" rx="0.5" fill="#88aaff" opacity="0.7"/>
      <line x1="125" y1="180" x2="155" y2="180" stroke="#6677aa" strokeWidth="0.3" opacity="0.3"/>
      <line x1="125" y1="220" x2="155" y2="220" stroke="#6677aa" strokeWidth="0.3" opacity="0.3"/>
      <line x1="125" y1="250" x2="155" y2="250" stroke="#6677aa" strokeWidth="0.3" opacity="0.3"/>
      <rect x="132" y="295" width="16" height="14" rx="1" fill="#0a0a18" stroke="#445577" strokeWidth="0.5"/>
      <rect x="135" y="299" width="10" height="7" rx="0.5" fill="#4466aa" opacity="0.5"/>
      <line x1="140" y1="60" x2="140" y2="42" stroke="#556688" strokeWidth="0.7"/>
    </svg>
  );
}

export function PhoenixSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <ellipse cx="140" cy="180" rx="100" ry="140" fill="#ff6633" opacity="0.04"/>
      <ellipse cx="140" cy="200" rx="70" ry="120" fill="#ffaa33" opacity="0.05"/>
      <path d="M85 130 Q40 100 15 130 Q5 175 30 210 Q70 220 100 185 Q120 155 105 120" fill="#5a1a08" stroke="#ff6622" strokeWidth="0.9"/>
      <path d="M92 140 Q55 115 30 140 Q22 170 42 195 Q72 205 98 175 Q113 150 102 130" fill="#7a2a08" stroke="#ff8833" strokeWidth="0.5"/>
      <path d="M50 165 Q55 145 60 165" fill="#ffaa33" opacity="0.6"/>
      <path d="M75 150 Q78 138 83 150" fill="#ffcc55" opacity="0.5"/>
      <path d="M195 130 Q240 100 265 130 Q275 175 250 210 Q210 220 180 185 Q160 155 175 120" fill="#5a1a08" stroke="#ff6622" strokeWidth="0.9"/>
      <path d="M188 140 Q225 115 250 140 Q258 170 238 195 Q208 205 182 175 Q167 150 178 130" fill="#7a2a08" stroke="#ff8833" strokeWidth="0.5"/>
      <path d="M230 165 Q225 145 220 165" fill="#ffaa33" opacity="0.6"/>
      <path d="M205 150 Q202 138 197 150" fill="#ffcc55" opacity="0.5"/>
      <path d="M140 50 L175 95 L182 215 L165 265 L140 300 L115 265 L98 215 L105 95 Z" fill="#5a1a08" stroke="#ff6622" strokeWidth="1"/>
      <path d="M140 60 L168 100 L176 210 L160 258 L140 290 L120 258 L104 210 L112 100 Z" fill="#7a2a10" stroke="#ff8833" strokeWidth="0.5"/>
      <ellipse cx="140" cy="125" rx="14" ry="22" fill="#1a0a02" stroke="#ffaa33" strokeWidth="0.8"/>
      <ellipse cx="140" cy="125" rx="11" ry="18" fill="#cc4422" opacity="0.5"/>
      <circle cx="140" cy="125" r="9" fill="#3a1a08" stroke="#ffaa33" strokeWidth="0.5"/>
      <rect x="131" y="122" width="18" height="6" rx="1" fill="#ffaa44" opacity="0.7"/>
      <ellipse cx="136" cy="119" rx="4" ry="5" fill="#ffcc88" opacity="0.5"/>
      <rect x="125" y="200" width="30" height="2" rx="1" fill="#ff8833" opacity="0.6"/>
      <rect x="120" y="225" width="40" height="2" rx="1" fill="#ff8833" opacity="0.6"/>
      <rect x="125" y="250" width="30" height="2" rx="1" fill="#ff8833" opacity="0.6"/>
      <rect x="115" y="295" width="14" height="14" rx="2" fill="#3a1a08" stroke="#ff8833" strokeWidth="0.6"/>
      <rect x="151" y="295" width="14" height="14" rx="2" fill="#3a1a08" stroke="#ff8833" strokeWidth="0.6"/>
      <ellipse cx="122" cy="315" rx="6" ry="10" fill="#ff3300" opacity="0.5"/>
      <ellipse cx="158" cy="315" rx="6" ry="10" fill="#ff3300" opacity="0.5"/>
      <ellipse cx="140" cy="320" rx="12" ry="16" fill="#ff6622" opacity="0.5"/>
      <ellipse cx="140" cy="318" rx="7" ry="11" fill="#ffaa33" opacity="0.6"/>
      <line x1="140" y1="50" x2="140" y2="32" stroke="#ff8833" strokeWidth="0.9"/>
      <circle cx="140" cy="30" r="3" fill="#ffaa44" opacity="0.6"/>
    </svg>
  );
}

export function NebulaSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <ellipse cx="140" cy="180" rx="100" ry="130" fill="#00ddaa" opacity="0.05"/>
      <polygon points="80,140 50,180 38,230 60,255 100,230 110,180" fill="#0a3328" stroke="#00cc88" strokeWidth="0.9"/>
      <polygon points="85,150 60,180 52,225 72,245 100,228 105,190" fill="#0d4435" stroke="#00ddaa" strokeWidth="0.5"/>
      <line x1="60" y1="180" x2="98" y2="215" stroke="#33eeaa" strokeWidth="0.5" opacity="0.5"/>
      <line x1="85" y1="150" x2="78" y2="240" stroke="#33eeaa" strokeWidth="0.4" opacity="0.4"/>
      <polygon points="200,140 230,180 242,230 220,255 180,230 170,180" fill="#0a3328" stroke="#00cc88" strokeWidth="0.9"/>
      <polygon points="195,150 220,180 228,225 208,245 180,228 175,190" fill="#0d4435" stroke="#00ddaa" strokeWidth="0.5"/>
      <line x1="220" y1="180" x2="182" y2="215" stroke="#33eeaa" strokeWidth="0.5" opacity="0.5"/>
      <line x1="195" y1="150" x2="202" y2="240" stroke="#33eeaa" strokeWidth="0.4" opacity="0.4"/>
      <polygon points="140,40 168,80 178,180 170,250 150,295 140,310 130,295 110,250 102,180 112,80" fill="#0e3a2c" stroke="#00cc88" strokeWidth="1.2"/>
      <polygon points="140,52 162,85 172,180 165,245 148,285 140,300 132,285 115,245 108,180 118,85" fill="#125540" stroke="#00ddaa" strokeWidth="0.6"/>
      <line x1="140" y1="52" x2="140" y2="300" stroke="#33eeaa" strokeWidth="0.5" opacity="0.4"/>
      <line x1="115" y1="180" x2="165" y2="180" stroke="#33eeaa" strokeWidth="0.5" opacity="0.4"/>
      <line x1="118" y1="220" x2="162" y2="220" stroke="#33eeaa" strokeWidth="0.4" opacity="0.3"/>
      <ellipse cx="140" cy="125" rx="13" ry="22" fill="#0e3a2c" stroke="#00ffaa" strokeWidth="0.9"/>
      <ellipse cx="140" cy="125" rx="10" ry="18" fill="#125540" opacity="0.8"/>
      <circle cx="140" cy="125" r="9" fill="#0a2a20" stroke="#00ffaa" strokeWidth="0.5"/>
      <rect x="131" y="122" width="18" height="6" rx="1" fill="#88ffdd" opacity="0.7"/>
      <ellipse cx="136" cy="119" rx="4" ry="5" fill="#ccffee" opacity="0.5"/>
      <ellipse cx="140" cy="220" rx="8" ry="15" fill="#00ffaa" opacity="0.4"/>
      <ellipse cx="140" cy="220" rx="5" ry="10" fill="#88ffdd" opacity="0.5"/>
      <polygon points="65,110 68,103 72,110 68,116" fill="#33eeaa" opacity="0.4"/>
      <polygon points="210,100 213,93 217,100 213,106" fill="#33eeaa" opacity="0.4"/>
      <polygon points="55,275 58,268 62,275 58,281" fill="#33eeaa" opacity="0.3"/>
      <polygon points="220,280 223,273 227,280 223,286" fill="#33eeaa" opacity="0.3"/>
      <ellipse cx="140" cy="310" rx="10" ry="6" fill="#00ffaa" opacity="0.4"/>
      <ellipse cx="140" cy="308" rx="6" ry="4" fill="#88ffdd" opacity="0.5"/>
      <polygon points="136,40 140,22 144,40" fill="#00ffaa" opacity="0.7"/>
    </svg>
  );
}

export function VoidSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <circle cx="140" cy="180" r="130" fill="#aa00ff" opacity="0.04"/>
      <circle cx="140" cy="180" r="90" fill="#000" opacity="0.15"/>
      <path d="M85 140 Q35 175 25 230 Q55 255 100 230 Q120 190 105 155" fill="#1a0828" stroke="#aa44ff" strokeWidth="0.9"/>
      <path d="M90 152 Q48 180 42 225 Q67 245 102 225 Q115 195 105 165" fill="#2a1240" stroke="#bb55ee" strokeWidth="0.5"/>
      <path d="M48 220 Q60 208 70 220" stroke="#dd66ff" strokeWidth="0.4" fill="none" opacity="0.5"/>
      <path d="M25 230 L15 222 L23 240 Z" fill="#3a1645" stroke="#aa44ff" strokeWidth="0.5"/>
      <path d="M195 140 Q245 175 255 230 Q225 255 180 230 Q160 190 175 155" fill="#1a0828" stroke="#aa44ff" strokeWidth="0.9"/>
      <path d="M190 152 Q232 180 238 225 Q213 245 178 225 Q165 195 175 165" fill="#2a1240" stroke="#bb55ee" strokeWidth="0.5"/>
      <path d="M232 220 Q220 208 210 220" stroke="#dd66ff" strokeWidth="0.4" fill="none" opacity="0.5"/>
      <path d="M255 230 L265 222 L257 240 Z" fill="#3a1645" stroke="#aa44ff" strokeWidth="0.5"/>
      <path d="M140 50 L170 95 L182 200 L170 260 L140 295 L110 260 L98 200 L110 95 Z" fill="#1a0828" stroke="#aa44ff" strokeWidth="1"/>
      <path d="M140 62 L165 100 L176 195 L165 252 L140 285 L115 252 L104 195 L115 100 Z" fill="#2a1240" stroke="#bb55ee" strokeWidth="0.5"/>
      <ellipse cx="140" cy="135" rx="15" ry="22" fill="#0a0218" stroke="#dd44ff" strokeWidth="0.9"/>
      <ellipse cx="140" cy="135" rx="12" ry="18" fill="#1a0828" opacity="0.8"/>
      <circle cx="140" cy="135" r="8" fill="#000" stroke="#aa44ff" strokeWidth="0.5"/>
      <circle cx="140" cy="135" r="5" fill="#1a0828" stroke="#dd66ff" strokeWidth="0.4"/>
      <rect x="133" y="133" width="14" height="4" rx="0.5" fill="#aa44ff" opacity="0.6"/>
      <path d="M118 200 Q128 205 118 218" stroke="#dd66ff" strokeWidth="0.5" fill="none" opacity="0.4"/>
      <path d="M162 200 Q152 205 162 218" stroke="#dd66ff" strokeWidth="0.5" fill="none" opacity="0.4"/>
      <circle cx="140" cy="295" r="10" fill="#aa44ff" opacity="0.3"/>
      <circle cx="140" cy="295" r="6" fill="#dd66ff" opacity="0.4"/>
      <circle cx="140" cy="295" r="3" fill="#000"/>
      <circle cx="139" cy="293" r="1" fill="#fff" opacity="0.5"/>
      <line x1="140" y1="50" x2="140" y2="32" stroke="#aa44ff" strokeWidth="0.9"/>
      <circle cx="140" cy="30" r="2.5" fill="#dd66ff" opacity="0.6"/>
    </svg>
  );
}

export function GuardianSVG({ size }) {
  const w = size || 280, h = size ? Math.round(size * 340 / 280) : 340;
  return (
    <svg width={w} height={h} viewBox="0 0 280 340">
      <ellipse cx="140" cy="180" rx="100" ry="130" fill="#ddcc44" opacity="0.04"/>
      <path d="M85 130 Q35 145 22 200 Q35 235 85 220 Q120 195 130 160" fill="#3a3018" stroke="#ddcc44" strokeWidth="0.9"/>
      <path d="M88 142 Q45 155 35 195 Q48 225 88 215 Q118 192 125 165" fill="#4a3818" stroke="#ffee66" strokeWidth="0.5"/>
      <line x1="48" y1="170" x2="118" y2="180" stroke="#ffee66" strokeWidth="0.5" opacity="0.6"/>
      <line x1="55" y1="200" x2="115" y2="195" stroke="#ffee66" strokeWidth="0.4" opacity="0.5"/>
      <circle cx="28" cy="215" r="2.5" fill="#ffee66" opacity="0.7"/>
      <path d="M195 130 Q245 145 258 200 Q245 235 195 220 Q160 195 150 160" fill="#3a3018" stroke="#ddcc44" strokeWidth="0.9"/>
      <path d="M192 142 Q235 155 245 195 Q232 225 192 215 Q162 192 155 165" fill="#4a3818" stroke="#ffee66" strokeWidth="0.5"/>
      <line x1="232" y1="170" x2="162" y2="180" stroke="#ffee66" strokeWidth="0.5" opacity="0.6"/>
      <line x1="225" y1="200" x2="165" y2="195" stroke="#ffee66" strokeWidth="0.4" opacity="0.5"/>
      <circle cx="252" cy="215" r="2.5" fill="#ffee66" opacity="0.7"/>
      <path d="M140 50 L175 95 L185 220 L170 280 L140 305 L110 280 L95 220 L105 95 Z" fill="#3a3018" stroke="#ddcc44" strokeWidth="1.2"/>
      <path d="M140 62 L168 100 L178 215 L163 270 L140 293 L117 270 L102 215 L112 100 Z" fill="#4a3a18" stroke="#ffee66" strokeWidth="0.6"/>
      <line x1="140" y1="62" x2="140" y2="293" stroke="#ffee66" strokeWidth="0.4" opacity="0.4"/>
      <line x1="115" y1="160" x2="165" y2="160" stroke="#ffee66" strokeWidth="0.4" opacity="0.5"/>
      <line x1="115" y1="220" x2="165" y2="220" stroke="#ffee66" strokeWidth="0.4" opacity="0.5"/>
      <ellipse cx="140" cy="125" rx="14" ry="22" fill="#1a1408" stroke="#ffee66" strokeWidth="1"/>
      <ellipse cx="140" cy="125" rx="11" ry="18" fill="#2a2010" opacity="0.8"/>
      <circle cx="140" cy="125" r="9" fill="#3a2a10" stroke="#ffee66" strokeWidth="0.5"/>
      <rect x="131" y="122" width="18" height="6" rx="1" fill="#ffdd55" opacity="0.7"/>
      <ellipse cx="136" cy="119" rx="4" ry="5" fill="#ffeeaa" opacity="0.5"/>
      <rect x="120" y="180" width="40" height="2.5" rx="1" fill="#ffee66" opacity="0.5"/>
      <rect x="120" y="240" width="40" height="2.5" rx="1" fill="#ffee66" opacity="0.5"/>
      <circle cx="108" cy="200" r="2.5" fill="#ffee66" opacity="0.6"/>
      <circle cx="172" cy="200" r="2.5" fill="#ffee66" opacity="0.6"/>
      <rect x="115" y="293" width="18" height="14" rx="2" fill="#1a1408" stroke="#ddcc44" strokeWidth="0.7"/>
      <rect x="147" y="293" width="18" height="14" rx="2" fill="#1a1408" stroke="#ddcc44" strokeWidth="0.7"/>
      <rect x="119" y="297" width="10" height="8" rx="1" fill="#ffcc44" opacity="0.5"/>
      <rect x="151" y="297" width="10" height="8" rx="1" fill="#ffcc44" opacity="0.5"/>
      <polygon points="132,50 137,32 140,42 143,32 148,50" fill="#ffee66"/>
      <line x1="140" y1="32" x2="140" y2="22" stroke="#ddcc44" strokeWidth="0.7"/>
      <circle cx="140" cy="20" r="2" fill="#ffee66"/>
    </svg>
  );
}

// Cockpit positions in 280x340 SVG viewBox for each ship type
const COCKPIT_POS = {
  reaper:   { x: 140, y: 115 },
  titan:    { x: 140, y: 113 },
  shadow:   { x: 140, y: 130 },
  phoenix:  { x: 140, y: 125 },
  nebula:   { x: 140, y: 125 },
  void:     { x: 140, y: 135 },
  guardian: { x: 140, y: 125 },
};

export function renderCustomShip(shipType, size, pilotId) {
  const ship = (() => {
    switch (shipType) {
      case "reaper": return <ReaperSVG size={size} />;
      case "titan": return <TitanSVG size={size} />;
      case "shadow": return <ShadowSVG size={size} />;
      case "phoenix": return <PhoenixSVG size={size} />;
      case "nebula": return <NebulaSVG size={size} />;
      case "void": return <VoidSVG size={size} />;
      case "guardian": return <GuardianSVG size={size} />;
      default: return null;
    }
  })();
  if (!pilotId || !ship) return ship;

  // Overlay pilot helmet at cockpit position
  const w = size || 280;
  const scale = w / 280;
  const pos = COCKPIT_POS[shipType] || { x: 140, y: 125 };
  const helmetSize = Math.round(20 * scale);
  const hx = (pos.x - 10) * scale;
  const hy = (pos.y - 12) * scale;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {ship}
      <div style={{
        position: "absolute",
        left: hx,
        top: hy,
        pointerEvents: "none",
      }}>
        <PilotHelmet pilotId={pilotId} size={helmetSize} />
      </div>
    </div>
  );
}
