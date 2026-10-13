// The Advisor (design section 14): rules, not real AI. Each rule checks the state and gives a tip.

import { ADVISOR_RULES, SUGGESTED_BUDGET } from '../data/advisorRules.js';
import { NODES, NODE_IDS } from '../data/techTree.js';
import { diff } from '../data/difficulty.js';
import { globalEffects, STATUS } from './effects.js';
import { monthlyCosts, canTakeLoan } from './economy.js';
import { backlogWeeks } from './repair.js';
import { totalStaff, managementThreshold } from './workforce.js';
import { averagePrice } from './satisfaction.js';
import { prosumerShareAll } from './prosumers.js';
import { researchProjects, canStartResearch, researchCost } from './research.js';
import { neighbors } from './mapgen.js';

export function advisorOn(state) {
  return diff(state).advisorAlways || globalEffects(state).advisor;
}

// The cheapest research the player can start now (optionally in 1 branch).
export function nextResearch(state, branch) {
  return NODE_IDS
    .filter((id) => (!branch || NODES[id].branch === branch) && state.tech.nodes[id].status === STATUS.AVAILABLE && canStartResearch(state, id).ok)
    .sort((a, b) => researchCost(a) - researchCost(b))[0] ?? null;
}

// Does the rule hold? Returns details for the tip text, or null.
function check(state, w) {
  switch (w.kind) {
    case 'cashMonthsBelow': {
      const c = monthlyCosts(state);
      return state.company.cash < c * w.value ? {} : null;
    }
    case 'healthBelow': {
      const s = state.sectors.filter((x) => x.owned && x.health < w.value).sort((a, b) => a.health - b.health)[0];
      return s ? { sector: s.name } : null;
    }
    case 'backlogAbove':
      return backlogWeeks(state) > w.value ? {} : null;
    case 'csBelowAndPriceAbove':
      return state.meters.cs < w.cs && averagePrice(state) > w.price ? {} : null;
    case 'staffOverShareOfM':
      return totalStaff(state) > managementThreshold(state) * w.value ? {} : null;
    case 'gsBelowAndRivalNear': {
      if (state.meters.gs >= w.value) return null;
      const near = state.sectors.some((s) => s.rival && (s.owned || neighbors(s.id).some((n) => state.sectors[n].owned)));
      return near ? {} : null;
    }
    case 'pathAndProsumersBelow':
      return state.goals.target === w.path && prosumerShareAll(state) < w.value ? {} : null;
    case 'noResearch':
      return researchProjects(state).length === 0 && nextResearch(state) ? {} : null;
    default:
      return null;
  }
}

// Can the Apply button do something now?
function applyAction(state, a) {
  switch (a.kind) {
    case 'loan': return canTakeLoan(state) ? { type: 'loan/take' } : null;
    case 'budget': return { type: 'budget/split', payload: { key: a.key, value: state.budget.split[a.key] + a.add } };
    case 'hire': return { type: 'staff/hire', payload: { role: a.role, count: a.count } };
    case 'priceDown': return { type: 'prices/down', payload: a.step };
    case 'research': {
      const id = nextResearch(state, a.branch);
      return id ? { type: 'research/start', payload: { node: id } } : null;
    }
    default: return null;
  }
}

// The top 3 tips: { id, details, action }.
export function advisorTips(state, max = 3) {
  return ADVISOR_RULES
    .map((r) => ({ r, details: check(state, r.when) }))
    .filter((x) => x.details)
    .sort((a, b) => b.r.priority - a.r.priority)
    .slice(0, max)
    .map(({ r, details }) => ({ id: r.id, details, action: applyAction(state, r.apply) }));
}

export function suggestedBudget(state) {
  return SUGGESTED_BUDGET[state.goals.target ?? 'none'] ?? SUGGESTED_BUDGET.none;
}
