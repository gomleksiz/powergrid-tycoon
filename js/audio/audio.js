// Music and sound effects with the Web Audio API. Everything is made in code:
// no sound files, so there are no licenses to track.
// Browsers play sound only after a click, so start() runs on New Game or Continue.

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);   // MIDI note → Hz

// 2 loops: calm (major, slow) and tense (minor, faster). 1 step = an eighth note.
const MUSIC = {
  calm: {
    bpm: 84, wave: 'triangle', bassWave: 'sine', gain: 0.18,
    chords: [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]],   // C G Am F
    bass: [36, 31, 33, 29],
    pattern: [0, 1, 2, 3, 2, 1, 2, 1],
  },
  tense: {
    bpm: 120, wave: 'square', bassWave: 'sawtooth', gain: 0.08,
    chords: [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]],   // Am F G E
    bass: [33, 29, 31, 28],
    pattern: [0, 0, 2, 0, 1, 0, 3, 2],
  },
};

const LOOKAHEAD_S = 0.3;
const TICK_MS = 100;

let ctx = null;
let master = null;
let musicBus = null;
let sfxBus = null;
let noise = null;
let mood = 'calm';
let step = 0;
let nextTime = 0;
let timer = null;
let volumes = { music: 40, effects: 70, mute: false };

export const audioStarted = () => !!ctx;

export function startAudio() {
  if (ctx) { ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  noise = makeNoise();
  applyVolumes();
  nextTime = ctx.currentTime + 0.1;
  timer = setInterval(schedule, TICK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}

export function setVolumes(v) {
  volumes = { ...volumes, ...v };
  applyVolumes();
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(volumes.mute ? 0 : 1, t, 0.05);
  musicBus.gain.setTargetAtTime(volumes.music / 100, t, 0.1);
  sfxBus.gain.setTargetAtTime(volumes.effects / 100, t, 0.05);
}

export function setMood(m) {
  if (MUSIC[m]) mood = m;
}

function makeNoise() {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(bus, { freq, start, dur, wave = 'sine', gain = 0.2, attack = 0.01, slideTo = null, filter = null }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  let node = osc;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(bus);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  const m = MUSIC[mood];
  const stepDur = 60 / m.bpm / 2;
  while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
    const bar = Math.floor(step / 8) % m.chords.length;
    const chord = m.chords[bar];
    const n = chord[m.pattern[step % 8]];
    tone(musicBus, { freq: NOTE(n), start: nextTime, dur: stepDur * 0.9, wave: m.wave, gain: m.gain, filter: 2400 });
    if (step % 4 === 0) tone(musicBus, { freq: NOTE(m.bass[bar]), start: nextTime, dur: stepDur * 3.6, wave: m.bassWave, gain: m.gain * 0.9, filter: 600 });
    nextTime += stepDur;
    step++;
  }
}

function noiseBurst({ start, dur, gain = 0.4, from = 1200, to = 120 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, start);
  f.frequency.exponentialRampToValueAtTime(to, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start(start);
  src.stop(start + dur);
}

// Sound effects from section 15: click, cash, alert, storm, done, victory, loss.
const SFX = {
  click: (t) => tone(sfxBus, { freq: 1200, start: t, dur: 0.04, gain: 0.08 }),
  cash: (t) => {
    tone(sfxBus, { freq: NOTE(84), start: t, dur: 0.09, wave: 'triangle', gain: 0.18 });
    tone(sfxBus, { freq: NOTE(91), start: t + 0.08, dur: 0.16, wave: 'triangle', gain: 0.18 });
  },
  alert: (t) => {
    tone(sfxBus, { freq: 660, start: t, dur: 0.12, wave: 'square', gain: 0.12, filter: 3000 });
    tone(sfxBus, { freq: 660, start: t + 0.18, dur: 0.12, wave: 'square', gain: 0.12, filter: 3000 });
  },
  storm: (t) => {
    noiseBurst({ start: t, dur: 1.4, gain: 0.5 });
    tone(sfxBus, { freq: 60, start: t, dur: 1.2, wave: 'sine', gain: 0.3, slideTo: 35 });
  },
  done: (t) => [72, 76, 79].forEach((n, i) => tone(sfxBus, { freq: NOTE(n), start: t + i * 0.09, dur: 0.18, wave: 'triangle', gain: 0.16 })),
  victory: (t) => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(sfxBus, { freq: NOTE(n), start: t + i * 0.12, dur: i === 6 ? 0.9 : 0.2, wave: 'triangle', gain: 0.18 })),
  loss: (t) => [67, 63, 60, 48].forEach((n, i) => tone(sfxBus, { freq: NOTE(n), start: t + i * 0.25, dur: 0.4, wave: 'sawtooth', gain: 0.1, filter: 1200 })),
};

export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || volumes.mute) return;
  SFX[name]?.(ctx.currentTime + 0.01);
}

export function stopAudio() {
  clearInterval(timer);
}
