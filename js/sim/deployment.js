// Field deployment (design section 8). Technicians work in crews of 4.
// 1 crew works on 1 sector at a time. The CapEx is paid when the work starts.
// Plants with a build time (fission, fusion) also need a crew.

import { WORK, REPAIR } from '../data/balance.js';
import { NODES, LEAP } from '../data/techTree.js';
import { BUILDINGS } from '../data/buildings.js';
import { STATUS, globalEffects } from './effects.js';
import { companyEfficiency, fES, isStriking } from './workforce.js';
import { spendCapex, capexCost } from './economy.js';
import { freeTechnicians, totalDamage } from './repair.js';

export const fieldProjects = (state) => state.projects.filter((p) => p.kind === 'deploy' || p.kind === 'build');

export function deploySlots(state) {
  return Math.floor(freeTechnicians(state) / WORK.CREW_SIZE);
}

export function deployWeeks(state, id) {
  const g = globalEffects(state);
  const leap = state.tech.nodes[id].leap ? LEAP.DEPLOY_MULT : 1;
  return NODES[id].deploy.weeks * leap * g.deployTimeMult;
}

export const deployCost = (state, id) => capexCost(state, NODES[id].deploy.cost);

// → { ok, reason }
export function canDeploy(state, id, sectorId) {
  const def = NODES[id];
  const node = state.tech.nodes[id];
  const sector = state.sectors[sectorId];
  if (!def?.deploy?.weeks) return { ok: false, reason: 'noDeploy' };
  if (node.status !== STATUS.UNLOCKED && node.status !== STATUS.ACTIVE) return { ok: false, reason: 'notResearched' };
  if (!sector?.owned) return { ok: false, reason: 'notOwned' };
  if (sector.tech[id]) return { ok: false, reason: 'already' };
  if (fieldProjects(state).some((p) => p.node === id && p.sector === sectorId)) return { ok: false, reason: 'already' };
  return { ok: true };
}

// The project waits until a crew is free and the cash is there.
export function startDeploy(state, id, sectorId) {
  if (!canDeploy(state, id, sectorId).ok) return false;
  state.projects.push({
    id: state.nextId++, kind: 'deploy', node: id, sector: sectorId,
    status: 'waiting', progress: 0, total: deployWeeks(state, id), rushed: false, paid: false,
  });
  return true;
}

export function addBuildProject(state, building, sectorId) {
  state.projects.push({
    id: state.nextId++, kind: 'build', building: building.id, type: building.type, sector: sectorId,
    status: 'waiting', progress: 0, total: BUILDINGS[building.type].buildWeeks * globalEffects(state).deployTimeMult,
    rushed: false, paid: true,
  });
}

export function cancelField(state, projectId) {
  const i = state.projects.findIndex((p) => p.id === projectId && p.kind === 'deploy' && p.status === 'waiting');
  if (i < 0) return false;
  state.projects.splice(i, 1);
  return true;
}

// "Repair first": while there is damage, free technicians repair, so no new crew starts.
function canStartCrew(state) {
  if (state.staff.repairFirst && totalDamage(state) > 0) return false;
  return deploySlots(state) > 0;
}

export function crewSpeed(state) {
  return companyEfficiency(state) * fES(state.meters.es) * (isStriking(state) ? REPAIR.STRIKE_MULT : 1);
}

// 1 week of field work. Returns the finished projects.
export function deployWeek(state) {
  // Start waiting projects in order.
  for (const p of fieldProjects(state)) {
    if (p.status !== 'waiting' || !canStartCrew(state)) continue;
    if (!p.paid) {
      const cost = deployCost(state, p.node);
      if (state.company.cash < cost) continue;
      spendCapex(state, cost);
      p.paid = true;
      state.sectors[p.sector].tech[p.node] = STATUS.DEPLOYING;
    }
    p.status = 'active';
  }
  const speed = crewSpeed(state);
  const done = [];
  for (const p of fieldProjects(state)) {
    if (p.status !== 'active') continue;
    p.progress = Math.min(p.total, p.progress + speed);
    if (p.progress >= p.total - 1e-9) done.push(p);
  }
  for (const p of done) finishField(state, p);
  return done;
}

function finishField(state, p) {
  state.projects.splice(state.projects.indexOf(p), 1);
  const sector = state.sectors[p.sector];
  if (p.kind === 'deploy') {
    sector.tech[p.node] = STATUS.ACTIVE;
  } else {
    const b = sector.buildings.find((x) => x.id === p.building);
    if (b) { b.status = 'active'; delete b.weeksLeft; }
  }
}

// O4: pay once to switch it on everywhere.
export function activateOneTime(state, id) {
  const def = NODES[id];
  const node = state.tech.nodes[id];
  if (!def?.deploy?.oneTime || node.status !== STATUS.UNLOCKED) return false;
  const cost = capexCost(state, def.deploy.oneTime);
  if (state.company.cash < cost) return false;
  spendCapex(state, cost);
  node.status = STATUS.ACTIVE;
  return true;
}
