let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let ambientSource = null;
let engineSource = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.connect(audioCtx.destination);
    musicGain.gain.value = 0.3;
    sfxGain = audioCtx.createGain();
    sfxGain.connect(audioCtx.destination);
    sfxGain.gain.value = 0.5;
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// ─── UTILITY ───

function playTone(freq, duration, type = "sine", volume = 0.3, destination = null) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(destination || sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume = 0.2, filterFreq = 3000, filterType = "lowpass") {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  source.start();
  source.stop(ctx.currentTime + duration);
}

// ─── UI SOUNDS ───

export function playClick() {
  playTone(800, 0.08, "square", 0.1);
}

export function playConfirm() {
  playTone(600, 0.1, "sine", 0.15);
  setTimeout(() => playTone(900, 0.12, "sine", 0.15), 60);
}

export function playSheetOpen() {
  playNoise(0.15, 0.06, 2000, "highpass");
  playTone(300, 0.15, "sine", 0.05);
}

export function playSheetClose() {
  playNoise(0.1, 0.04, 1500, "highpass");
  playTone(200, 0.1, "sine", 0.04);
}

export function playCoinCollect() {
  [880, 1100, 1320, 1760].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, "sine", 0.12), i * 50);
  });
}

export function playCoinPickup() {
  playTone(1200, 0.06, "sine", 0.08);
}

export function playDailyReward() {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "triangle", 0.15), i * 80);
  });
  setTimeout(() => playNoise(0.2, 0.05, 5000, "highpass"), 300);
}

// ─── GAME SOUNDS ───

export function playShoot() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

export function playExplosionSmall() {
  playNoise(0.2, 0.2, 1500, "lowpass");
  playTone(150, 0.15, "sine", 0.1);
}

export function playExplosionLarge() {
  playNoise(0.4, 0.3, 800, "lowpass");
  playTone(80, 0.3, "sine", 0.15);
  setTimeout(() => playNoise(0.2, 0.15, 1200, "lowpass"), 50);
}

export function playPowerup() {
  [400, 600, 800, 1200].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, "sine", 0.12), i * 40);
  });
}

export function playPlayerHit() {
  // Bass impact
  playTone(60, 0.3, "sine", 0.25);
  // Noise burst
  playNoise(0.15, 0.25, 600, "lowpass");
  // Alarm beep
  setTimeout(() => playTone(440, 0.1, "square", 0.08), 100);
  setTimeout(() => playTone(440, 0.1, "square", 0.08), 250);
}

export function playCombo() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playComboBreak() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

export function playWaveStart() {
  playTone(300, 0.3, "sawtooth", 0.08);
  setTimeout(() => playTone(450, 0.3, "sawtooth", 0.08), 150);
  setTimeout(() => playTone(600, 0.4, "sawtooth", 0.1), 300);
}

export function playMilestone() {
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, "triangle", 0.1), i * 70);
  });
}

export function playGameOver() {
  [400, 350, 300, 200, 150].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.4, "sawtooth", 0.08), i * 120);
  });
  setTimeout(() => playNoise(0.5, 0.1, 400, "lowpass"), 400);
}

export function playAchievement() {
  [660, 880, 1100, 1320].forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.2, "sine", 0.12);
      playTone(freq * 1.5, 0.15, "triangle", 0.06);
    }, i * 60);
  });
}

export function playLowHp() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

// ─── BOSS SOUNDS ───

export function playBossWarning() {
  // Low ominous rising tone
  playTone(80, 0.6, "sawtooth", 0.12);
  setTimeout(() => playTone(120, 0.5, "sawtooth", 0.12), 200);
  setTimeout(() => playTone(180, 0.4, "sawtooth", 0.15), 400);
  playNoise(0.8, 0.08, 300, "lowpass");
}

export function playBossShoot() {
  playTone(200, 0.12, "square", 0.1);
  playNoise(0.08, 0.1, 2000, "lowpass");
}

export function playBossHit() {
  playTone(300, 0.08, "square", 0.08);
  playNoise(0.06, 0.08, 1500, "highpass");
}

export function playBossExplosionSmall() {
  playNoise(0.25, 0.25, 1200, "lowpass");
  playTone(120, 0.2, "sine", 0.12);
}

export function playBossExplosionLarge() {
  playNoise(0.6, 0.4, 600, "lowpass");
  playTone(50, 0.5, "sine", 0.2);
  setTimeout(() => playNoise(0.4, 0.2, 1000, "lowpass"), 100);
  setTimeout(() => playTone(40, 0.4, "sine", 0.15), 200);
}

export function playBossDefeated() {
  [400, 500, 600, 800, 1000, 1200].forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.3, "sine", 0.12);
      playTone(freq * 1.5, 0.2, "triangle", 0.06);
    }, i * 80);
  });
  setTimeout(() => playNoise(0.3, 0.1, 4000, "highpass"), 300);
}

// ─── AMBIENT / LOOPS ───

export function startAmbient() {
  const ctx = getCtx();
  if (ambientSource) return;

  // Low drone
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = "sine";
  osc1.frequency.value = 55;
  osc2.type = "sine";
  osc2.frequency.value = 82.5;

  filter.type = "lowpass";
  filter.frequency.value = 200;

  gain.gain.value = 0.06;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(musicGain);

  osc1.start();
  osc2.start();

  ambientSource = { osc1, osc2, gain };
}

export function stopAmbient() {
  if (!ambientSource) return;
  try {
    ambientSource.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    setTimeout(() => {
      try { ambientSource.osc1.stop(); } catch(e) {}
      try { ambientSource.osc2.stop(); } catch(e) {}
      ambientSource = null;
    }, 600);
  } catch(e) {
    ambientSource = null;
  }
}

export function startEngine() {
  const ctx = getCtx();
  if (engineSource) return;

  // Filtered noise for engine rumble
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 150;

  const gain = ctx.createGain();
  gain.gain.value = 0.04;

  // Slight LFO for pulsing
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 3;
  lfoGain.gain.value = 0.01;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  source.start();

  engineSource = { source, gain, lfo };
}

export function stopEngine() {
  if (!engineSource) return;
  try {
    engineSource.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    setTimeout(() => {
      try { engineSource.source.stop(); } catch(e) {}
      try { engineSource.lfo.stop(); } catch(e) {}
      engineSource = null;
    }, 400);
  } catch(e) {
    engineSource = null;
  }
}

// ─── VOLUME CONTROL ───

export function setSoundEnabled(enabled) {
  if (sfxGain) sfxGain.gain.value = enabled ? 0.5 : 0;
}

export function setMusicEnabled(enabled) {
  if (musicGain) musicGain.gain.value = enabled ? 0.3 : 0;
  if (!enabled) stopAmbient();
}

export function setSoundVolume(volume) {
  // volume: 0-100
  const v = Math.max(0, Math.min(100, volume)) / 100;
  if (sfxGain) sfxGain.gain.value = v * 0.5;
}

export function setMusicVolume(volume) {
  // volume: 0-100
  const v = Math.max(0, Math.min(100, volume)) / 100;
  if (musicGain) musicGain.gain.value = v * 0.3;
  if (volume === 0) stopAmbient();
}

// ─── INIT ───
// Call this on first user interaction (touch/click)
export function initAudio(soundEnabled, musicEnabled, soundVolume, musicVolume) {
  getCtx();
  if (soundVolume != null) {
    setSoundVolume(soundVolume);
  } else {
    setSoundEnabled(soundEnabled);
  }
  if (musicVolume != null) {
    setMusicVolume(musicVolume);
  } else {
    setMusicEnabled(musicEnabled);
  }
}
