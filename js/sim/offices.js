// Offices (version 1.1): the Project Manager and the Marketing department.
// The manager watches for idle staff and stuck projects, and can plan projects by itself.
// "Schedule all" (no manager needed) queues every project that can start.

import { OFFICES, MANAGER } from '../data/offices.js';
import { WORK } from '../data/balance.js';
import { NODES, NODE_IDS } from '../data/techTree.js';
import { STATUS } from './effects.js';
import { researchProjects, researchSlots, startResearch, scheduleResearch, clampTeams } from './research.js';
import { fieldProjects, deploySlots, deployCost, canDeploy, startDeploy } from './deployment.js';
import { busyTechnicians, repairTechnicians, totalDamage } from './repair.js';
import { monthlyCosts } from './economy.js';
import { nextResearch } from './advisor.js';

// ---------- hire and close ----------

export function hireOffice(state, id) {
  const o = state.offices[id];
  if (!o || o.hired || state.company.cash < OFFICES[id].hireCost) return false;
  state.company.cash -= OFFICES[id].hireCost;
  state.company.otherCostsThisMonth += OFFICES[id].hireCost;
  o.hired = true;
  return true;
}

export function closeOffice(state, id) {
  const o = state.offices[id];
  if (!o?.hired) return false;
  o.hired = false;
  if (id === 'marketing') state.campaigns = [];
  return true;
}

// ---------- idle staff and waiting projects ----------

export function idleEngineers(state) {
  const busy = researchProjects(state).reduce((n, p) => n + p.teams, 0) * WORK.TEAM_SIZE;
  return Math.max(0, state.staff.engineers - busy);
}

export function idleTechnicians(state) {
  return Math.max(0, state.staff.technicians - busyTechnicians(state) - repairTechnicians(state));
}

// Why a project waits: 'team' (no free research team), 'repair' (Repair first), 'crew' or 'cash'.
export function waitReason(state, p) {
  if (p.kind === 'research') return 'team';
  if (state.staff.repairFirst && totalDamage(state) > 0) return 'repair';
  if (deploySlots(state) < 1) return 'crew';
  if (!p.paid && state.company.cash < deployCost(state, p.node)) return 'cash';
  return 'crew';
}

// Alert at N weeks, then every REPEAT_WEEKS weeks.
const alertNow = (weeks, from) => weeks === from || (weeks > from && (weeks - from) % MANAGER.REPEAT_WEEKS === 0);

// The week step, after the work of the week: count idle weeks and waiting weeks.
// With a manager: news when something sits for a long time. Returns events.
export function watchWeek(state) {
  const idle = state.staff.idle;
  idle.engineers = idleEngineers(state) >= WORK.TEAM_SIZE ? idle.engineers + 1 : 0;
  idle.technicians = idleTechnicians(state) >= WORK.CREW_SIZE ? idle.technicians + 1 : 0;
  for (const p of state.projects) p.waitWeeks = p.status === 'waiting' ? (p.waitWeeks ?? 0) + 1 : 0;

  if (!state.offices.manager.hired) return [];
  const events = [];
  if (alertNow(idle.engineers, MANAGER.IDLE_WEEKS)) {
    events.push({ type: 'news', payload: { key: 'pmIdle', role: 'engineers', count: idleEngineers(state), weeks: idle.engineers, kind: 'warn' } });
  }
  if (alertNow(idle.technicians, MANAGER.IDLE_WEEKS)) {
    events.push({ type: 'news', payload: { key: 'pmIdle', role: 'technicians', count: idleTechnicians(state), weeks: idle.technicians, kind: 'warn' } });
  }
  for (const p of state.projects) {
    if (p.status !== 'waiting' || !alertNow(p.waitWeeks, MANAGER.WAIT_WEEKS)) continue;
    events.push({ type: 'news', payload: { key: 'pmStuck', project: projectLabel(state, p), reason: waitReason(state, p), weeks: p.waitWeeks, kind: 'warn' } });
  }
  return events;
}

// Data for the text: { kind, node, type, sector }.
export function projectLabel(state, p) {
  return { kind: p.kind, node: p.node ?? null, type: p.type ?? null, sector: p.sector === undefined ? null : state.sectors[p.sector].name };
}

// What the manager would tell you now (for the Staff tab).
export function managerReport(state) {
  const out = [];
  const idle = state.staff.idle;
  if (idleEngineers(state) >= WORK.TEAM_SIZE) out.push({ id: 'idle', role: 'engineers', count: idleEngineers(state), weeks: idle.engineers });
  if (idleTechnicians(state) >= WORK.CREW_SIZE) out.push({ id: 'idle', role: 'technicians', count: idleTechnicians(state), weeks: idle.technicians });
  for (const p of state.projects) {
    if (p.status === 'waiting' && (p.waitWeeks ?? 0) >= 1) {
      out.push({ id: 'stuck', project: projectLabel(state, p), reason: waitReason(state, p), weeks: p.waitWeeks });
    }
  }
  return out;
}

// ---------- planning ----------

const freeTeams = (state) => researchSlots(state) - researchProjects(state).reduce((n, p) => n + p.teams, 0);

// Give free research teams work: new research first, then more teams on running research.
export function fillResearch(state) {
  let started = 0;
  while (freeTeams(state) >= 1 && researchProjects(state).length < WORK.QUEUE_MAX) {
    const id = nextResearch(state);
    if (!id || !startResearch(state, id, 1)) break;
    started++;
  }
  for (const p of researchProjects(state)) {
    const free = freeTeams(state);
    if (free < 1) break;
    if (p.teamsWanted < WORK.MAX_TEAMS_PER_PROJECT) {
      p.teamsWanted = clampTeams(p.teamsWanted + free);
      scheduleResearch(state);
    }
  }
  return started;
}

// Every deployment that can start: unlocked tech × owned sectors, the cheapest first.
export function deployCandidates(state) {
  const out = [];
  for (const id of NODE_IDS) {
    if (!NODES[id].deploy?.weeks) continue;
    const st = state.tech.nodes[id].status;
    if (st !== STATUS.UNLOCKED && st !== STATUS.ACTIVE) continue;
    for (const s of state.sectors) if (s.owned && canDeploy(state, id, s.id).ok) out.push({ node: id, sector: s.id, cost: deployCost(state, id) });
  }
  return out.sort((a, b) => a.cost - b.cost || a.sector - b.sector);
}

// "Schedule all": every possible deployment and research. Returns the number of new projects.
export function scheduleAll(state) {
  let n = fillResearch(state);
  for (const c of deployCandidates(state)) if (startDeploy(state, c.node, c.sector)) n++;
  return n;
}

// The manager's week, before the work: plan research and deployments.
// Deployments only when a crew is free and the cash stays above a reserve.
export function managerWeek(state) {
  const pm = state.offices.manager;
  if (!pm.hired) return;
  if (pm.autoResearch) fillResearch(state);
  if (!pm.autoDeploy) return;
  if (state.staff.repairFirst && totalDamage(state) > 0) return;
  const waiting = fieldProjects(state).filter((p) => p.status === 'waiting').length;
  let slots = deploySlots(state) - waiting;
  const reserve = monthlyCosts(state) * MANAGER.RESERVE_MONTHS;
  let cash = state.company.cash;
  for (const c of deployCandidates(state)) {
    if (slots < 1) break;
    if (cash - c.cost < reserve) continue;
    if (startDeploy(state, c.node, c.sector)) { slots--; cash -= c.cost; }
  }
}
