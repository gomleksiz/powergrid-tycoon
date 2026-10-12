// Helpers for the test bots. Bots read the state, but change it only with dispatch(),
// like the UI does.

import { getState, dispatch } from '../../js/core/store.js';
import { NODES, NODE_IDS } from '../../js/data/techTree.js';
import { BUILDINGS } from '../../js/data/buildings.js';
import { SECTOR_TYPES } from '../../js/data/sectors.js';
import { TIER_IDS, WORK, MONEY } from '../../js/data/balance.js';
import { STATUS, globalEffects } from '../../js/sim/effects.js';
import { needsLeap, potentialTotal } from '../../js/sim/setup.js';
import { canStartResearch, researchProjects } from '../../js/sim/research.js';
import { canDeploy, fieldProjects } from '../../js/sim/deployment.js';
import { canOpenSector, openCost } from '../../js/sim/growth.js';
import { mapgen, findFreeSpot } from '../../js/sim/mapgen.js';
import { buildAllowed, capexCost } from '../../js/sim/build.js';
import { capacityMw, peakMw } from '../../js/sim/grid.js';
import { wages, upkeep, interest, budgetDollars, canTakeLoan } from '../../js/sim/economy.js';
import { totalStaff, managementThreshold } from '../../js/sim/workforce.js';
import { backlogWeeks } from '../../js/sim/repair.js';
import { buyoutCost, canMonopoly } from '../../js/sim/rivals.js';

export const S = () => getState();
export const act = (type, payload) => dispatch({ type, payload });

export const owned = () => S().sectors.filter((s) => s.owned);
export const monthlyCosts = () => wages(S()) + upkeep(S()) + interest(S()) + budgetDollars(S()).total;
export const done = (id) => [STATUS.UNLOCKED, STATUS.ACTIVE].includes(S().tech.nodes[id].status);

// ---------- money ----------

export function manageLoans({ bufferMonths = 1, repayAbove = 6 } = {}) {
  const c = monthlyCosts();
  while (S().company.cash < c * bufferMonths && canTakeLoan(S())) act('loan/take');
  while (S().company.debt > 0 && S().company.cash > c * repayAbove + MONEY.LOAN_STEP) act('loan/repay');
}

export const canSpend = (amount, keepMonths = 2) => S().company.cash - amount > monthlyCosts() * keepMonths;

// Borrow (in $50,000 steps) to make a good investment possible.
export function borrowFor(amount, keepMonths = 1) {
  while (!canSpend(amount, keepMonths) && canTakeLoan(S())) act('loan/take');
  return canSpend(amount, keepMonths);
}

export function setBudget(totalPct, split) {
  act('budget/total', totalPct);
  act('budget/setAll', split);
}

export function setPrices(m) {
  for (const t of TIER_IDS) act('price/set', { tier: t, value: m });
}

// ---------- staff ----------

export function hireTo(role, target, keepMonths = 3) {
  const s = S();
  const have = s.staff[role] + s.staff.hiring.filter((x) => x.role === role).reduce((n, x) => n + x.count, 0);
  const need = target - have;
  if (need > 0 && canSpend(need * 6_000, keepMonths)) act('staff/hire', { role, count: need });
}

// Engineers for `teams` research teams and enough technicians for crews and repair.
export function staffPlan({ teams = 2, crews = 1, pr = 1, overM = 0, backlogCrew = true } = {}) {
  const s = S();
  const M = managementThreshold(s) + overM;
  const want = { engineers: teams * WORK.TEAM_SIZE, technicians: crews * WORK.CREW_SIZE + (backlogCrew && backlogWeeks(s) > 2 ? WORK.CREW_SIZE : 0), pr };
  const total = Object.values(want).reduce((a, b) => a + b, 0);
  const scale = total > M ? M / total : 1;
  for (const role of ['technicians', 'engineers', 'pr']) hireTo(role, Math.max(role === 'pr' ? 1 : 3, Math.floor(want[role] * scale)));
  return totalStaff(s);
}

// ---------- research and deployment ----------

// Queue the first available nodes of the list (leapfrog when that is the only way).
export function research(order, { teams = 3, leap = true } = {}) {
  const s = S();
  for (const id of order) {
    if (researchProjects(s).length >= WORK.QUEUE_MAX) break;
    const st = s.tech.nodes[id].status;
    if (st !== STATUS.AVAILABLE) continue;
    const isLeap = needsLeap(s.tech.nodes, id);
    if (isLeap && !leap) continue;
    if (canStartResearch(s, id, isLeap).ok) act('research/start', { node: id, teams, leap: isLeap });
  }
}

export const nextOpen = (order) => order.filter((id) => !done(id));

// Deploy these nodes in every owned sector (a few at a time).
export function deployAll(ids, maxWaiting = 3) {
  const s = S();
  for (const id of ids) {
    if (!NODES[id].deploy?.weeks || !done(id)) continue;
    for (const sec of owned()) {
      if (fieldProjects(s).filter((p) => p.status === 'waiting').length >= maxWaiting) return;
      if (canDeploy(s, id, sec.id).ok && canSpend(NODES[id].deploy.cost, 2)) act('deploy/start', { node: id, sector: sec.id });
    }
  }
}

export function activateOneTime() {
  for (const id of NODE_IDS) {
    if (NODES[id].deploy?.oneTime && S().tech.nodes[id].status === STATUS.UNLOCKED && canSpend(NODES[id].deploy.oneTime)) act('tech/activate', { node: id });
  }
}

// ---------- map ----------

export function build(type, sectorId) {
  const s = S();
  if (!buildAllowed(s, type).ok || !canSpend(capexCost(s, BUILDINGS[type].cost))) return false;
  const spot = findFreeSpot(mapgen(s.seed), s.sectors.flatMap((x) => x.buildings), sectorId, BUILDINGS[type].size);
  if (!spot) return false;
  const before = s.sectors[sectorId].buildings.length;
  act('build/place', { type, x: spot.x, y: spot.y });
  return s.sectors[sectorId].buildings.length > before;
}

// A substation where the evening peak is close to the capacity.
export function substations(margin = 0.85) {
  for (const sec of owned()) {
    if (peakMw(S(), sec) > capacityMw(sec) * margin) build('substation', sec.id);
  }
}

const potentialOf = (sec) => potentialTotal(sec);

// Open the best sector next to ours (most possible customers).
export function expand({ keepMonths = 1, max = 1 } = {}) {
  let opened = 0;
  while (opened < max) {
    const s = S();
    const cost = openCost(s);
    if (cost === null || !s.sectors.some((x) => canOpenSector({ ...s, company: { ...s.company, cash: Infinity } }, x.id).ok)) return;
    if (!borrowFor(cost, keepMonths)) return;
    const best = s.sectors.filter((x) => canOpenSector(s, x.id).ok).sort((a, b) => potentialOf(b) - potentialOf(a))[0];
    if (!best) return;
    act('sector/open', { sector: best.id });
    opened++;
  }
}

// ---------- rivals, storms, events ----------

export function fightRivals({ buyout = true, cut = 0.1, franchise = true, monopoly = true } = {}) {
  const s = S();
  const g = globalEffects(s);
  if (monopoly && canMonopoly(s)) act('rival/monopoly');
  if (franchise && g.franchiseSectors > 0 && s.rivalPolicy.franchise.length < 3) {
    const top = owned().sort((a, b) => potentialOf(b) - potentialOf(a)).slice(0, 3);
    for (const sec of top) if (!s.rivalPolicy.franchise.includes(sec.id)) act('rival/franchise', { sector: sec.id, on: true });
  }
  for (const sec of owned()) {
    if (!sec.rival) { if (sec.discount > 0) act('sector/discount', { sector: sec.id, discount: 0 }); continue; }
    if (buyout && canSpend(buyoutCost(s, sec), 4)) act('rival/buyout', { sector: sec.id });
    else if (cut) act('sector/discount', { sector: sec.id, discount: cut });
  }
}

export function stormPrep() {
  const s = S();
  for (const d of s.disasters.scheduled) {
    if (!d.warned) continue;
    for (const h of d.hits) if (s.sectors[h.sector].owned && !s.sectors[h.sector].prep && canSpend(10_000)) act('disaster/prep', { sector: h.sector });
  }
}

export function repairPriority() {
  for (const sec of owned()) act('sector/priority', { sector: sec.id, priority: sec.damage > 20 ? 'high' : 'normal' });
}

export { STATUS, NODES, NODE_IDS, globalEffects, peakMw, capacityMw, potentialOf, totalStaff, managementThreshold };
