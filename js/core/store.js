// The single game state. The UI changes it only with dispatch(action).

import { emit } from './bus.js';
import { ACTIONS } from '../sim/actions.js';
import { DEFAULT_DIFFICULTY, PRICE, BUDGET, STAFF, METERS } from '../data/balance.js';
import { DIFFICULTY } from '../data/difficulty.js';
import { createSectors, createTech } from '../sim/setup.js';
import { RIVAL_IDS } from '../data/rivals.js';

let state = null;
const subscribers = new Set();

// Every state field needs a start value here, so old saves can be filled in.
export function createState(seed, difficulty = DEFAULT_DIFFICULTY, options = {}) {
  const s = seed >>> 0;
  const d = DIFFICULTY[difficulty] ?? DIFFICULTY[DEFAULT_DIFFICULTY];
  const { sectors, nextId } = createSectors(s, d.startCustomers);
  return {
    seed: s,
    difficulty,
    rng: s,
    nextId,
    company: {
      name: options.companyName ?? '',
      cash: d.startCash,
      debt: 0,
      lastRevenue: 0,
      lastNet: 0,
      capexThisMonth: 0,
      capexTotal: 0,
      otherCostsThisMonth: 0,
    },
    time: { month: 1, week: 1 },
    prices: { low: PRICE.START, medium: PRICE.START, high: PRICE.START, corporate: PRICE.START },
    budget: {
      totalPct: BUDGET.START_PCT,
      split: { ...BUDGET.START_SPLIT },
      locks: Object.fromEntries(BUDGET.KEYS.map((k) => [k, false])),
    },
    staff: { ...STAFF.START, wageMult: 1, repairFirst: true, strikeMonths: 0, hiring: [], crunch: [], idle: { engineers: 0, technicians: 0 } },
    offices: { manager: { hired: false, autoResearch: true, autoDeploy: true }, marketing: { hired: false } },
    campaigns: [],
    govtSale: { share: 0, lastKwh: 0, lastIncome: 0 },
    projects: [],
    market: { walk: 1, eventMult: 1, priceMult: 1, supplyShare: 1, peakMult: 1, mods: [], shortage: 0, noise: 0 },
    meters: { ...METERS.START },
    govt: { auditCooldown: 0, finesDue: 0 },
    flags: { phase: 1 },
    disasters: { scheduled: [], active: [], log: [], stormDone: false },
    events: { cooldown: 0, pending: null },
    rivals: RIVAL_IDS.map((id) => ({ id, entered: false })),
    rivalPolicy: { franchise: [], monopolyCharter: false },
    policy: { autoPrep: true },   // version 1.2: pay Storm Prep by itself after a warning
    goals: {
      target: null,
      hold: { monopoly: 0, singularity: 0, utopia: 0 },
      loss: { bankrupt: 0, license: 0, collapse: 0 },
      ended: null,
    },
    sectors,
    tech: createTech(),
    tutorial: { enabled: options.tutorial ?? false, step: 0, breakDone: false },
    history: {
      cash: [], customers: [], revenue: [], net: [], outage: [], cs: [], es: [], gs: [], share: [],
      // version 1.2: for the live board
      costs: [], peak: [], ownPeak: [], capacity: [], demandKwh: [], ownKwh: [], wholesale: [], rivals: [],
    },
    report: null,
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
