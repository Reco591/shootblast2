export const CANVAS_W = 420;
export const CANVAS_H = 812;
export const PLAYER_SPEED = 5;
export const BULLET_SPEED = 8;
export const BULLET_RADIUS = 3;
export const FIRE_RATE_MS = 150;
export const INITIAL_LIVES = 3;
export const MAX_LIVES = 5;
export const INVINCIBLE_FRAMES = 120;
export const WAVE_DURATION_FRAMES = 600;

export const METEOR_TYPES = [
  { radius: 14, hp: 1, speed: 2, bonusDistance: 50_000 },
  { radius: 22, hp: 2, speed: 1.5, bonusDistance: 100_000 },
  { radius: 30, hp: 3, speed: 1, bonusDistance: 200_000 },
];

export const POWERUP_TYPES = [
  { type: "shield",    color: "#00e5ff", duration: 5000 },
  { type: "rapid",     color: "#ffff00", duration: 4000 },
  { type: "triple",    color: "#ff00ff", duration: 5000 },
  { type: "life",      color: "#00ff00", duration: 0 },
  { type: "slowtime",  color: "#88ddff", duration: 4000 },
  { type: "magnet",    color: "#aa55ff", duration: 6000 },
  { type: "doublepts", color: "#ffaa00", duration: 6000 },
  { type: "freeze",    color: "#5599ff", duration: 3000 },
  { type: "nuke",      color: "#ff3333", duration: 0 },
];
