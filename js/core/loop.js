// Fixed-timestep game loop. The sim runs in whole weeks; drawing runs every frame.
// advance(dtMs) is pure timing logic, so tests can drive it without a browser.

import { TIME } from '../data/balance.js';
import { WEEK_MS } from './time.js';
import { emit } from './bus.js';

export function createLoop({ onTick, onFrame = () => {} }) {
  let speed = 0;
  let lastSpeed = 1;
  let acc = 0;
  let lastTime = null;
  let rafId = null;

  function advance(dtMs) {
    const dt = Math.min(dtMs, TIME.MAX_FRAME_MS);
    if (speed > 0) acc += dt * speed;
    let ticks = 0;
    while (acc >= WEEK_MS && ticks < TIME.MAX_TICKS_PER_FRAME) {
      acc -= WEEK_MS;
      ticks += 1;
      onTick();
      if (speed === 0) { acc = 0; break; } // a tick may auto-pause
    }
    if (ticks === TIME.MAX_TICKS_PER_FRAME) acc = Math.min(acc, WEEK_MS);
    return ticks;
  }

  function frame(now) {
    const dt = Math.min(lastTime === null ? 0 : now - lastTime, TIME.MAX_FRAME_MS);
    lastTime = now;
    advance(dt);
    onFrame(acc / WEEK_MS, dt); // 0..1 progress through the current week
    rafId = requestAnimationFrame(frame);
  }

  function setSpeed(s) {
    if (!TIME.SPEEDS.includes(s)) return;
    if (s > 0) lastSpeed = s;
    if (s === speed) return;
    speed = s;
    emit('speed:change', speed);
  }

  return {
    advance,
    setSpeed,
    getSpeed: () => speed,
    lastSpeed: () => lastSpeed,
    togglePause: () => setSpeed(speed === 0 ? lastSpeed : 0),
    reset: () => { acc = 0; setSpeed(0); },
    start() {
      if (rafId !== null) return;
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}

// Pause when the tab is hidden. The player presses play again on return.
export function pauseWhenHidden(loop, onPaused) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && loop.getSpeed() > 0) {
      loop.setSpeed(0);
      onPaused?.();
    }
  });
}
