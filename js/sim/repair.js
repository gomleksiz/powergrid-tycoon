// Damage repair each week (design section 7).
// Each technician on repair fixes 1.5 damage points a week × Efficiency × F ES.

import { REPAIR, TIME, WORK, CONTRACTORS, BREAKDOWN } from '../data/balance.js';
import { BUILDINGS, levelOf } from '../data/buildings.js';
import { globalEffects } from './effects.js';
import { companyEfficiency, fES, isStriking } from './workforce.js';

const FIELD = ['deploy', 'build', 'upgrade'];

// Technicians in a field crew (deployment, plant building or upgrade) are busy.
export function busyTechnicians(state) {
  return state.projects.filter((p) => FIELD.includes(p.kind) && p.status === 'active').length * WORK.CREW_SIZE;
}

export function freeTechnicians(state) {
  return Math.max(0, state.staff.technicians - busyTechnicians(state));
}

export const totalDamage = (state) => state.sectors.reduce((sum, s) => sum + (s.owned ? s.damage : 0), 0);

// Technicians that work on repair this week.
// "Repair first": all free technicians repair while there is damage.
// "Build first": crews for waiting deployments are kept free first.
export function repairTechnicians(state) {
  if (totalDamage(state) <= 0) return 0;
  const free = freeTechnicians(state);
  if (state.staff.repairFirst) return free;
  const waiting = state.projects.filter((p) => FIELD.includes(p.kind) && p.status === 'waiting').length;
  return Math.max(0, free - waiting * WORK.CREW_SIZE);
}

// Damage points a week for n technicians.
export function repairPower(state, n = repairTechnicians(state), g = globalEffects(state)) {
  return n * REPAIR.POINTS_PER_TECH_WEEK * companyEfficiency(state, g) * fES(state.meters.es)
    * (1 + g.repairBonus) * (isStriking(state) ? REPAIR.STRIKE_MULT : 1);
}

// Weeks to fix all damage with all free technicians.
export function backlogWeeks(state) {
  const dmg = totalDamage(state);
  if (dmg <= 0) return 0;
  const power = repairPower(state, freeTechnicians(state));
  return power > 0 ? Math.min(REPAIR.BACKLOG_MAX_WEEKS, dmg / power) : REPAIR.BACKLOG_MAX_WEEKS;
}

// High → Normal → Low priority; more damage first.
export function repairOrder(state) {
  const rank = (p) => REPAIR.PRIORITIES.indexOf(p);
  return state.sectors
    .filter((s) => s.owned && s.damage > 0)
    .sort((a, b) => rank(a.priority) - rank(b.priority) || b.damage - a.damage);
}

// ---------- version 1.2: technicians stationed in a sector ----------

// How many of the stationed technicians can work this week (only free technicians, in sector order).
export function stationedNow(state) {
  let left = repairTechnicians(state) > 0 || totalDamage(state) <= 0 ? freeTechnicians(state) : 0;
  if (!state.staff.repairFirst) left = Math.min(left, repairTechnicians(state));
  const out = {};
  for (const s of state.sectors) {
    const n = s.owned ? Math.min(left, s.assigned ?? 0) : 0;
    out[s.id] = n;
    left -= n;
  }
  return out;
}

export const assignedTotal = (state) => state.sectors.reduce((n, s) => n + (s.owned ? s.assigned ?? 0 : 0), 0);

// Station n technicians in a sector (at most all technicians).
export function assignTechnicians(state, sectorId, n) {
  const s = state.sectors[sectorId];
  if (!s?.owned) return false;
  const others = assignedTotal(state) - (s.assigned ?? 0);
  s.assigned = Math.max(0, Math.min(Math.round(n), state.staff.technicians - others));
  return true;
}

// 1 week: count the damage hours, then repair. Returns the points used.
// sector.repairTechs = technicians that worked there this week (for the map and the panel).
export function repairWeek(state) {
  let points = repairPower(state);
  const used = points;
  const perTech = repairPower(state, 1);
  const fixAt = (s, fix) => {
    s.damage = Math.max(0, +(s.damage - fix).toFixed(4));
    s.repairTechs += perTech > 0 ? Math.ceil(fix / perTech - 1e-9) : 0;
    points -= fix;
  };
  for (const s of state.sectors) s.repairTechs = 0;
  contractorWeek(state);
  // Stationed technicians are already there: they repair their sector before the hours count.
  const here = stationedNow(state);
  for (const s of state.sectors) {
    if (!here[s.id] || s.damage <= 0) continue;
    fixAt(s, Math.min(points, s.damage, here[s.id] * perTech));
  }
  // Storm Prep: the crews wait near the sector, so they repair before the outage hours count.
  for (const s of state.sectors) {
    if (!s.prepRepair) continue;
    fixAt(s, Math.min(points, s.damage));
    s.prepRepair = false;
  }
  for (const s of state.sectors) {
    if (s.owned && s.damage > 0) s.dmgHours += TIME.HOURS_PER_WEEK * (s.damage / 100);
  }
  for (const s of repairOrder(state)) {
    if (points <= 0) break;
    fixAt(s, Math.min(points, s.damage));
  }
  return used - points;
}

// ---------- version 1.2: emergency crews and broken buildings ----------

// Damage points a week for the contractors in 1 sector. No strike, no ES, no efficiency.
export const contractorPower = () => CONTRACTORS.TECHS * REPAIR.POINTS_PER_TECH_WEEK;

export function canCallContractors(state, sectorId) {
  const s = state.sectors[sectorId];
  return !!s?.owned && s.damage > 0 && !(s.contractors > 0) && state.company.cash >= CONTRACTORS.COST;
}

// Contractors come at once and repair this sector for some weeks.
export function callContractors(state, sectorId) {
  if (!canCallContractors(state, sectorId)) return false;
  state.company.cash -= CONTRACTORS.COST;
  state.company.otherCostsThisMonth += CONTRACTORS.COST;
  state.sectors[sectorId].contractors = CONTRACTORS.WEEKS;
  return true;
}

// They repair before the week's outage hours count (they are already there).
function contractorWeek(state) {
  for (const s of state.sectors) {
    if (!(s.contractors > 0)) continue;
    s.contractors -= 1;
    if (!s.owned) continue;
    s.damage = Math.max(0, +(s.damage - Math.min(s.damage, contractorPower())).toFixed(4));
  }
}

export function buildingRepairCost(b) {
  return Math.max(BREAKDOWN.MIN_REPAIR, Math.round(BUILDINGS[b.type].cost * levelOf(b) * BREAKDOWN.REPAIR_SHARE));
}

export function canRepairBuilding(state, b, sector) {
  return !!sector?.owned && !!b?.broken && !(b.repairWeeks > 0) && state.company.cash >= buildingRepairCost(b);
}

// A paid repair team fixes the building in some weeks.
export function repairBuilding(state, id) {
  for (const sector of state.sectors) {
    const b = sector.buildings.find((x) => x.id === id);
    if (!b) continue;
    if (!canRepairBuilding(state, b, sector)) return false;
    const cost = buildingRepairCost(b);
    state.company.cash -= cost;
    state.company.otherCostsThisMonth += cost;
    // Stationed technicians help: the repair takes 1 week.
    b.repairWeeks = sector.assigned > 0 ? 1 : BREAKDOWN.REPAIR_WEEKS;
    return true;
  }
  return false;
}

export function buildingRepairWeek(state) {
  const events = [];
  for (const s of state.sectors) {
    for (const b of s.buildings) {
      if (!b.broken || !(b.repairWeeks > 0)) continue;
      b.repairWeeks -= 1;
      if (b.repairWeeks > 0) continue;
      b.broken = false;
      events.push({ type: 'news', payload: { key: 'buildingFixed', building: b.type, sector: s.name } });
    }
  }
  return events;
}

export const brokenBuildings = (state) => state.sectors.flatMap((s) => (s.owned ? s.buildings.filter((b) => b.broken).map((b) => ({ b, sector: s })) : []));
