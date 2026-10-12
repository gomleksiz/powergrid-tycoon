// Bring an old save up to SAVE_VERSION, then fill any missing fields
// with the start values from createState().

import { SAVE_VERSION } from '../data/balance.js';
import { createState } from '../core/store.js';

// MIGRATIONS[v] turns a version v state into a version v + 1 state.
// Version 1 is the first format, so the list is empty for now.
export const MIGRATIONS = {};

export function migrate(state, fromVersion, migrations = MIGRATIONS) {
  let s = state;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No migration from save version ${v}`);
    s = step(s);
  }
  return fillDefaults(s, createState(s.seed, s.difficulty));
}

export function fillDefaults(target, defaults) {
  for (const [key, value] of Object.entries(defaults)) {
    if (target[key] === undefined) {
      target[key] = value;
    } else if (isPlainObject(value) && isPlainObject(target[key])) {
      fillDefaults(target[key], value);
    }
  }
  return target;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
