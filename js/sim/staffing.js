// Hire, fire, wages, rush and crunch (design sections 8 and 9).

import { STAFF, WORK } from '../data/balance.js';
import { NODES } from '../data/techTree.js';
import { BUILDINGS } from '../data/buildings.js';
import { clampMeter } from './research.js';

const wage = (state, role) => STAFF.WAGE[role] * state.staff.wageMult;

export const hireCost = (state, role, n) => wage(state, role) * n * STAFF.HIRE_COST_MONTHS;
export const fireCost = (state, role, n) => wage(state, role) * n * STAFF.FIRE_COST_MONTHS;

export const pendingHires = (state, role) =>
  state.staff.hiring.filter((h) => h.role === role).reduce((n, h) => n + h.count, 0);

function payStaffCost(state, amount) {
  state.company.cash -= amount;
  state.company.otherCostsThisMonth += amount;
}

// New staff start next week.
export function hire(state, role, n) {
  if (!STAFF.ROLES.includes(role) || n < 1) return false;
  if (state.staff[role] + pendingHires(state, role) + n > STAFF.MAX_PER_ROLE) return false;
  const cost = hireCost(state, role, n);
  if (state.company.cash < cost) return false;
  payStaffCost(state, cost);
  state.staff.hiring.push({ role, count: n });
  return true;
}

export function fire(state, role, n) {
  if (!STAFF.ROLES.includes(role) || n < 1 || n > state.staff[role]) return false;
  payStaffCost(state, fireCost(state, role, n));
  state.staff[role] -= n;
  state.meters.es = clampMeter(state.meters.es + STAFF.FIRE_ES_SHOCK * n);
  return true;
}

export function setWage(state, v) {
  const step = STAFF.WAGE_STEP;
  state.staff.wageMult = +Math.min(STAFF.WAGE_MAX, Math.max(STAFF.WAGE_MIN, Math.round(v / step) * step)).toFixed(2);
}

export function staffArrive(state) {
  const events = [];
  for (const h of state.staff.hiring) {
    state.staff[h.role] += h.count;
    events.push({ type: 'news', payload: { key: 'staffArrived', role: h.role, count: h.count } });
  }
  state.staff.hiring = [];
  return events;
}

// Each month: crunch and strike counters go down.
export function monthStaff(state) {
  state.staff.crunch = state.staff.crunch.map((m) => m - 1).filter((m) => m > 0);
  if (state.staff.strikeMonths > 0) state.staff.strikeMonths -= 1;
}

export const crunchCount = (state) => state.staff.crunch.length;

// ---------- Rush ----------

export function rushCost(state, p) {
  if (p.kind === 'research') return p.total * WORK.RUSH_RP_DOLLARS * WORK.RUSH_COST_SHARE;
  if (p.kind === 'deploy') return NODES[p.node].deploy.cost * WORK.RUSH_COST_SHARE;
  return BUILDINGS[p.type].cost * WORK.RUSH_COST_SHARE;
}

export function canRush(state, p) {
  return !!p && !p.rushed && p.status === 'active' && state.company.cash >= rushCost(state, p);
}

// Cut the time left by 50 %. ES − 5 at once; crunch + 1 for 3 months.
export function rush(state, projectId) {
  const p = state.projects.find((x) => x.id === projectId);
  if (!canRush(state, p)) return false;
  state.company.cash -= rushCost(state, p);
  state.company.otherCostsThisMonth += rushCost(state, p);
  if (p.kind === 'research') {
    const node = state.tech.nodes[p.node];
    node.rp += (p.total - node.rp) / 2;
  } else {
    p.progress += (p.total - p.progress) / 2;
  }
  p.rushed = true;
  state.meters.es = clampMeter(state.meters.es + WORK.RUSH_ES_SHOCK);
  state.staff.crunch.push(WORK.CRUNCH_MONTHS);
  return true;
}
