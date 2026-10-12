// Every action the UI (or a bot) can dispatch. handler(state, payload) → events[].
// Handlers check the rules themselves, so a bad action does nothing.

import { weekTick } from './tick.js';
import { withStateRng } from '../core/rng.js';
import { UI, PRICE, BUDGET, TIER_IDS, METERS, REPAIR } from '../data/balance.js';
import { setSplit } from './budget.js';
import { takeLoan, repayLoan } from './economy.js';
import { isTierUnlocked } from './effects.js';
import { placeBuilding } from './build.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const roundStep = (v, step) => Math.round(v / step) * step;

export function maxPrice(state) {
  return state.meters.gs < METERS.LOW ? PRICE.LOW_GS_MAX : PRICE.MAX;
}

export const ACTIONS = {
  'time/week': (state) => withStateRng(state, (rng) => weekTick(state, rng)),

  'company/rename': (state, name) => {
    state.company.name = String(name).slice(0, UI.COMPANY_NAME_MAX);
  },

  'tutorial/skip': (state) => {
    state.tutorial.enabled = false;
  },

  'price/set': (state, { tier, value }) => {
    if (!TIER_IDS.includes(tier) || !isTierUnlocked(state, tier)) return;
    state.prices[tier] = +clamp(roundStep(value, PRICE.STEP), PRICE.MIN, maxPrice(state)).toFixed(2);
  },

  'budget/total': (state, value) => {
    state.budget.totalPct = Math.round(clamp(value, BUDGET.MIN_PCT, BUDGET.MAX_PCT));
  },

  'budget/split': (state, { key, value }) => {
    if (!BUDGET.KEYS.includes(key) || state.budget.locks[key]) return;
    state.budget.split = setSplit(state.budget.split, state.budget.locks, key, value);
  },

  'budget/lock': (state, { key, locked }) => {
    if (BUDGET.KEYS.includes(key)) state.budget.locks[key] = !!locked;
  },

  'loan/take': (state) => {
    takeLoan(state);
  },

  'loan/repay': (state) => {
    repayLoan(state);
  },

  'build/place': (state, { type, x, y }) => placeBuilding(state, type, x, y),

  'sector/priority': (state, { sector, priority }) => {
    const s = state.sectors[sector];
    if (s && REPAIR.PRIORITIES.includes(priority)) s.priority = priority;
  },

  'staff/repairFirst': (state, on) => {
    state.staff.repairFirst = !!on;
  },

  // Debug only (the UI sends it with ?debug=1).
  'debug/damage': (state, { sector, amount }) => {
    const s = state.sectors[sector];
    if (s?.owned) s.damage = Math.min(100, s.damage + amount);
  },
};
