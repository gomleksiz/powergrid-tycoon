// Device settings (pgt.settings). Not part of a game save.

import { SAVE } from '../data/balance.js';
import { emit } from '../core/bus.js';

export const DEFAULT_PREFS = {
  pauseOnProject: false,   // version 1.1: the game runs on when a project is done
  mainView: 'board',       // version 1.2: 'board' (live board) or 'map'
  reportMode: 'popup',     // popup | log
  font: 'atkinson',        // atkinson | lexend | system
  textSize: 100,           // 90–150 %
  highContrast: false,
  reduceMotion: false,
  batterySaver: false,
  music: 40,
  effects: 70,
  mute: false,
};

let prefs = load();

function load() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(SAVE.SETTINGS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export const getPrefs = () => prefs;

export function setPrefs(patch) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(SAVE.SETTINGS_KEY, JSON.stringify(prefs)); } catch { /* storage full or blocked */ }
  emit('prefs:change', prefs);
}
