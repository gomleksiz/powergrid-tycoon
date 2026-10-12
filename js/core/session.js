// The running game: new game, load, auto-save, quit. Talks to the UI with bus events:
// 'game:start', 'game:quit', 'news' ({ text, kind }).

import { createState, setState, getState, dispatch } from './store.js';
import { createLoop, pauseWhenHidden } from './loop.js';
import { emit, on } from './bus.js';
import { isGameOver } from '../sim/tick.js';
import { recalcDerived } from '../sim/derived.js';
import { writeAuto, writeSlot, requestPersist } from '../save/save.js';
import { T } from '../data/text.js';

let active = false;
let playTimeSec = 0;
let loop = null;

export function initSession() {
  loop = createLoop({
    onTick() {
      if (!active) return;
      dispatch({ type: 'time/week' });
      if (isGameOver(getState())) loop.setSpeed(0);
    },
    onFrame(_alpha, dtMs) {
      if (active && loop.getSpeed() > 0) playTimeSec += dtMs / 1000;
    },
  });
  loop.start();

  pauseWhenHidden(loop, () => active && news(T.tabPaused));
  on('month:end', () => autoSave({ quiet: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoSave({ quiet: true }); });
  window.addEventListener('pagehide', () => autoSave({ quiet: true }));
  return loop;
}

export const getLoop = () => loop;
export const isActive = () => active;

export function newGame({ seed, difficulty, companyName, tutorial }) {
  const state = recalcDerived(createState(seed, difficulty, { companyName, tutorial }));
  begin(state, 0);
  news(T.welcome(companyName));
}

// res is the result of readSave() / readContinue().
export function loadGame(res, name) {
  begin(res.state, res.playTimeSec);
  news(T.loaded(name));
  if (res.usedBackup) news(T.usedBackupSave, 'warn');
}

function begin(state, playTime) {
  loop.reset(); // a loaded game always starts paused
  playTimeSec = playTime;
  setState(state);
  active = true;
  emit('game:start', state);
}

export function quitToTitle() {
  autoSave({ quiet: true });
  active = false;
  loop.reset();
  emit('game:quit');
}

export function autoSave({ quiet = false } = {}) {
  if (!active) return null;
  const res = writeAuto(getState(), { playTimeSec });
  afterWrite(res, quiet ? null : T.autoSaved);
  return res;
}

export function saveToSlot(n) {
  const res = writeSlot(n, getState(), { playTimeSec });
  afterWrite(res, T.saved(T.slotName(n)));
  return res;
}

function afterWrite(res, okText) {
  if (res.ok) {
    if (okText) news(okText);
    requestPersist();
  } else {
    news(res.error === 'quota' ? T.saveFullError : T.saveError, 'error');
  }
}

export function news(text, kind = 'info') {
  emit('news', { text, kind });
}
