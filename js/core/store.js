// The single game state. The UI changes it only with dispatch(action).

import { emit } from './bus.js';
import { ACTIONS } from '../sim/actions.js';
import { DEFAULT_DIFFICULTY } from '../data/balance.js';

let state = null;
const subscribers = new Set();

// Every state field needs a start value here, so old saves can be filled in.
export function createState(seed, difficulty = DEFAULT_DIFFICULTY, options = {}) {
  const s = seed >>> 0;
  return {
    seed: s,
    difficulty,
    company: { name: options.companyName ?? '' },
    rng: s,
    time: { month: 1, week: 1 },
    tutorial: { enabled: options.tutorial ?? false, step: 0 },
    history: [],
  };
}

export function getState() {
  return state;
}

// Swap in a whole state (new game or load).
export function setState(next) {
  state = next;
  notify({ type: 'state/replace' });
}

export function dispatch(action) {
  const handler = ACTIONS[action.type];
  if (!handler) throw new Error(`Unknown action: ${action.type}`);
  if (!state) throw new Error('No game is running.');
  const events = handler(state, action.payload) ?? [];
  notify(action);
  for (const ev of events) emit(ev.type, ev.payload);
  return events;
}

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify(action) {
  for (const fn of [...subscribers]) fn(state, action);
}
