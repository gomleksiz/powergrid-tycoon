// Research (design section 8). Engineers work in teams of 3.
// RP per month = engineers on the project × 10 × Efficiency × F ES × F RD.

import { WORK } from '../data/balance.js';
import { NODES, RESEARCH_COST, LEAP } from '../data/techTree.js';
import { STATUS } from './effects.js';
import { refreshAvailable, needsLeap } from './setup.js';
import { companyEfficiency, fES } from './workforce.js';
import { budgetDollars } from './economy.js';

export function researchCost(id, leap = false) {
  return Math.round(RESEARCH_COST[NODES[id].tier] * (leap ? LEAP.COST_MULT : 1));
}

export function fRD(rdDollars) {
  return Math.min(WORK.RD_MAX, WORK.RD_BASE + rdDollars / WORK.RD_DIVISOR);
}

// RP per month for 1 team (3 engineers).
export function rpPerTeamMonth(state) {
  return WORK.TEAM_SIZE * WORK.RP_PER_ENGINEER * companyEfficiency(state) * fES(state.meters.es)
    * fRD(budgetDollars(state).rd);
}

export const researchProjects = (state) => state.projects.filter((p) => p.kind === 'research');

export function researchSlots(state) {
  return Math.floor(state.staff.engineers / WORK.TEAM_SIZE);
}

// → { ok, reason }
export function canStartResearch(state, id, leap = false) {
  const node = state.tech.nodes[id];
  if (!node) return { ok: false, reason: 'unknown' };
  if (node.status !== STATUS.AVAILABLE) return { ok: false, reason: 'status' };
  if (needsLeap(state.tech.nodes, id) && !leap) return { ok: false, reason: 'needsLeap' };
  if (researchProjects(state).length >= WORK.QUEUE_MAX) return { ok: false, reason: 'queueFull' };
  return { ok: true };
}

export function startResearch(state, id, teams = 1, leap = false) {
  if (!canStartResearch(state, id, leap).ok) return false;
  const node = state.tech.nodes[id];
  // It is a leap only when the normal path is not open yet.
  node.leap = needsLeap(state.tech.nodes, id);
  node.status = STATUS.RESEARCHING;
  state.projects.push({
    id: state.nextId++,
    kind: 'research',
    node: id,
    teamsWanted: clampTeams(teams),
    teams: 0,
    status: 'waiting',
    total: researchCost(id, node.leap),
    rushed: false,
  });
  scheduleResearch(state);
  return true;
}

export function cancelResearch(state, projectId) {
  const i = state.projects.findIndex((p) => p.id === projectId && p.kind === 'research');
  if (i < 0) return false;
  const p = state.projects[i];
  state.projects.splice(i, 1);
  // Progress stays in node.rp, so a later restart goes on from there.
  state.tech.nodes[p.node].status = STATUS.AVAILABLE;
  state.tech.nodes[p.node].leap = false;
  scheduleResearch(state);
  return true;
}

export const clampTeams = (n) => Math.max(1, Math.min(WORK.MAX_TEAMS_PER_PROJECT, Math.round(n)));

// Give teams to projects in queue order. A project with 0 teams waits.
export function scheduleResearch(state) {
  let free = researchSlots(state);
  for (const p of researchProjects(state)) {
    p.teams = Math.min(p.teamsWanted, free);
    free -= p.teams;
    p.status = p.teams > 0 ? 'active' : 'waiting';
  }
}

export function progressOf(state, p) {
  return p.kind === 'research' ? state.tech.nodes[p.node].rp : p.progress;
}

// 1 week of research. Returns finished node ids.
export function researchWeek(state) {
  scheduleResearch(state);
  const perTeamWeek = rpPerTeamMonth(state) / 4;
  const done = [];
  const first = researchProjects(state).find((p) => p.teams > 0);
  if (first && state.tech.bankRp > 0) {
    state.tech.nodes[first.node].rp += state.tech.bankRp;   // RP from an event card
    state.tech.bankRp = 0;
  }
  for (const p of researchProjects(state)) {
    if (p.teams <= 0) continue;
    const node = state.tech.nodes[p.node];
    node.rp = Math.min(p.total, node.rp + p.teams * perTeamWeek);
    if (node.rp >= p.total - 1e-9) done.push(p);
  }
  for (const p of done) finishResearch(state, p);
  if (done.length) scheduleResearch(state);
  return done.map((p) => p.node);
}

function finishResearch(state, p) {
  state.projects.splice(state.projects.indexOf(p), 1);
  const node = state.tech.nodes[p.node];
  const def = NODES[p.node];
  node.rp = p.total;
  // No field work: ACTIVE everywhere at once. Else UNLOCKED, ready to deploy or build.
  node.status = def.deploy === null ? STATUS.ACTIVE : STATUS.UNLOCKED;
  if (node.leap && def.leapShock) {
    for (const [meter, v] of Object.entries(def.leapShock)) state.meters[meter] = clampMeter(state.meters[meter] + v);
  }
  refreshAvailable(state.tech.nodes);
}

export const clampMeter = (v) => Math.max(0, Math.min(100, v));

// Months left with the current teams (Infinity when waiting).
export function monthsLeft(state, p) {
  const rate = p.teams * rpPerTeamMonth(state);
  if (rate <= 0) return Infinity;
  return (p.total - state.tech.nodes[p.node].rp) / rate;
}
