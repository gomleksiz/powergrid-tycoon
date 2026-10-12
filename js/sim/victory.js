// Victory paths, loss rules and the final score (design section 14).

import { VICTORY, LOSS, SCORE } from '../data/advisorRules.js';
import { TIME } from '../data/balance.js';
import { diff } from '../data/difficulty.js';
import { marketShare, totalCustomers, canTakeLoan } from './economy.js';
import { energyMix } from './satisfaction.js';
import { prosumerShareAll } from './prosumers.js';
import { STATUS } from './effects.js';

const activeIn = (state, id) => state.sectors.filter((s) => s.owned && s.tech[id] === STATUS.ACTIVE).length;

// Each condition: { key, value, target, ok, progress (0–1) }.
function cond(key, value, target) {
  return { key, value, target, ok: value >= target, progress: Math.max(0, Math.min(1, target > 0 ? value / target : 1)) };
}

export function pathConditions(state, path) {
  const d = diff(state);
  if (path === 'monopoly') {
    return [cond('cash', state.company.cash, d.victoryCash), cond('share', marketShare(state), d.victoryShare)];
  }
  if (path === 'singularity') {
    const v = VICTORY.singularity;
    return [cond('fusion', energyMix(state).fusion ?? 0, v.fusionShare), cond('wireless', activeIn(state, 'D8'), v.wirelessSectors)];
  }
  const v = VICTORY.utopia;
  return [
    cond('prosumers', prosumerShareAll(state), v.prosumerShare),
    cond('vpp', activeIn(state, 'S3'), v.vppSectors),
    cond('gs', state.meters.gs, v.gs),
    cond('cs', state.meters.cs, v.cs),
  ];
}

// The progress bar shows the weakest condition.
export function pathProgress(state, path) {
  const list = pathConditions(state, path);
  const weakest = list.reduce((a, b) => (b.progress < a.progress ? b : a));
  return { ok: list.every((c) => c.ok), weakest, list, hold: state.goals.hold[path] };
}

export function netWorth(state) {
  return state.company.cash - state.company.debt + SCORE.CAPEX_SHARE * state.company.capexTotal;
}

export function computeScore(state, { win, monthEnded }) {
  const m = state.meters;
  const parts = {
    netWorth: netWorth(state) / SCORE.NET_WORTH_DIV,
    share: SCORE.SHARE * marketShare(state) * 100,
    meters: SCORE.METERS * ((m.cs + m.es + m.gs) / 3),
    win: win ? SCORE.WIN : 0,
    // Months left reward an early win only; a loss gets no bonus for ending early.
    monthsLeft: win ? SCORE.MONTH_LEFT * Math.max(0, TIME.END_MONTH - monthEnded) : 0,
  };
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  const total = Math.round(raw * diff(state).scoreMult);
  return { parts, mult: diff(state).scoreMult, total, grade: gradeOf(total) };
}

export function gradeOf(score) {
  return SCORE.GRADES.find(([, min]) => score >= min)[0];
}

// Loss counters and red warnings. Returns { lost: reason|null, warnings: [] }.
export function updateLoss(state) {
  const d = diff(state);
  const L = state.goals.loss;
  // Bankrupt: cash below $0 and the bank gives no more loans.
  L.bankrupt = state.company.cash < 0 && !canTakeLoan(state) ? L.bankrupt + 1 : 0;
  L.license = state.meters.gs < LOSS.LICENSE_GS ? L.license + 1 : 0;
  L.collapse = totalCustomers(state) < LOSS.COLLAPSE_CUSTOMERS ? L.collapse + 1 : 0;
  if (L.bankrupt >= d.bankruptMonths) return 'bankrupt';
  if (L.license >= LOSS.LICENSE_MONTHS) return 'license';
  if (L.collapse >= LOSS.COLLAPSE_MONTHS) return 'collapse';
  return null;
}

export function lossWarnings(state) {
  const d = diff(state);
  const L = state.goals.loss;
  const out = [];
  if (L.bankrupt > 0 && L.bankrupt >= d.bankruptMonths - LOSS.BANKRUPT_WARN_BEFORE) out.push({ key: 'bankrupt', left: d.bankruptMonths - L.bankrupt });
  if (L.license >= LOSS.LICENSE_WARN) out.push({ key: 'license', left: LOSS.LICENSE_MONTHS - L.license });
  if (L.collapse >= LOSS.COLLAPSE_WARN) out.push({ key: 'collapse', left: LOSS.COLLAPSE_MONTHS - L.collapse });
  return out;
}

// At the end of each month: holds, wins, losses and the end of time. Returns events.
export function checkEnd(state, month) {
  if (state.goals.ended) return [];
  let winner = null;
  for (const path of VICTORY.PATHS) {
    const ok = pathConditions(state, path).every((c) => c.ok);
    state.goals.hold[path] = ok ? state.goals.hold[path] + 1 : 0;
    if (!winner && state.goals.hold[path] >= VICTORY.HOLD_MONTHS) winner = path;
  }
  const lost = winner ? null : updateLoss(state);
  let result = null;
  if (winner) result = { result: 'win', path: winner };
  else if (lost) result = { result: 'loss', reason: lost };
  else if (month >= TIME.END_MONTH) result = { result: 'time' };
  if (!result) return [];
  state.goals.ended = { ...result, month, score: computeScore(state, { win: result.result === 'win', monthEnded: month }) };
  return [{ type: 'game:end', payload: state.goals.ended }];
}
