// Outage help for 1 sector (version 1.1). Always on, also without the Advisor.
// Each tip: { id, details, action } — action is a dispatch object, or { build: type } for the map.

import { OUTAGE_HELP } from '../data/advisorRules.js';
import { STAFF, WORK, CONTRACTORS } from '../data/balance.js';
import { BUILDINGS, levelOf } from '../data/buildings.js';
import { repairPower, freeTechnicians, totalDamage, canCallContractors, buildingRepairCost, canRepairBuilding } from './repair.js';
import { canUpgrade, buildAllowed } from './build.js';
import { capacityMw, peakMw } from './grid.js';
import { isStriking } from './workforce.js';

// Weeks to fix this sector with the technicians that work there now.
export function repairWeeksHere(state, sector) {
  if (sector.damage <= 0) return 0;
  const power = repairPower(state, sector.repairTechs ?? 0);
  return power > 0 ? sector.damage / power : Infinity;
}

export function outageAdvice(state, sector) {
  if (!sector.owned) return [];
  const p = sector.lastParts;
  const tips = [];
  const add = (id, details, action = null) => tips.push({ id, details, action });

  // Version 1.2: broken buildings first, then the emergency crew.
  for (const b of sector.buildings.filter((x) => x.broken && !(x.repairWeeks > 0))) {
    add('repairBuilding', { type: b.type, cost: buildingRepairCost(b) },
      canRepairBuilding(state, b, sector) ? { type: 'building/repair', payload: { id: b.id } } : null);
  }
  if (sector.damage > 0 && !(sector.contractors > 0)) {
    add('contractors', { techs: CONTRACTORS.TECHS, weeks: CONTRACTORS.WEEKS, cost: CONTRACTORS.COST },
      canCallContractors(state, sector.id) ? { type: 'sector/contractors', payload: { sector: sector.id } } : null);
  }

  if (sector.damage > 0) {
    const weeks = repairWeeksHere(state, sector);
    if (isStriking(state)) {
      add('strike', {}, { type: 'staff/wage', payload: state.staff.wageMult + OUTAGE_HELP.WAGE_STEP });
    }
    if (!(sector.repairTechs > 0) && freeTechnicians(state) === 0) {
      add('noCrew', {}, { type: 'staff/hire', payload: { role: 'technicians', count: WORK.CREW_SIZE } });
    } else if (weeks > OUTAGE_HELP.SLOW_REPAIR_WEEKS) {
      add('slowRepair', { weeks: Number.isFinite(weeks) ? Math.ceil(weeks) : null }, { type: 'staff/hire', payload: { role: 'technicians', count: WORK.CREW_SIZE } });
    }
    const others = state.sectors.some((s) => s.owned && s.id !== sector.id && s.damage > 0);
    if (others && sector.priority !== 'high') add('priority', {}, { type: 'sector/priority', payload: { sector: sector.id, priority: 'high' } });
    const waiting = state.projects.some((x) => x.status === 'waiting' && x.kind !== 'research');
    if (!state.staff.repairFirst && waiting) add('repairFirst', {}, { type: 'staff/repairFirst', payload: true });
  }

  if (p.wear >= OUTAGE_HELP.WEAR_HOURS || sector.health < OUTAGE_HELP.HEALTH) {
    const key = 'maintenance';
    const can = !state.budget.locks[key] && state.budget.split[key] < 100;
    add('maintenance', { health: Math.round(sector.health) },
      can ? { type: 'budget/split', payload: { key, value: Math.min(100, state.budget.split[key] + OUTAGE_HELP.BUDGET_STEP) } } : null);
  }

  const cap = capacityMw(sector);
  const peak = peakMw(state, sector);
  if (sector.waiting > 0) add('connectFull', { waiting: sector.waiting });
  if (p.overload > 0 || peak > cap * OUTAGE_HELP.CAPACITY_WARN || sector.waiting > 0) {
    const sub = sector.buildings.find((b) => b.type === 'substation' && canUpgrade(state, b.id).ok);
    if (sub) add('upgradeSubstation', { level: levelOf(sub) + 1 }, { type: 'building/upgrade', payload: { id: sub.id } });
    add('buildSubstation', { mw: BUILDINGS.substation.capacityMw }, buildAllowed(state, 'substation').ok ? { build: 'substation' } : null);
  }

  if (p.shortage > 0) {
    if ((state.govtSale?.share ?? 0) > 0) add('sellLess', {}, { type: 'govt/share', payload: 0 });
    const plant = OUTAGE_HELP.PLANTS.find((t) => buildAllowed(state, t).ok);
    add('ownPower', { type: plant ?? null }, plant ? { build: plant } : null);
  }

  // Nothing else helps: more technicians in general.
  if (!tips.length && totalDamage(state) > 0 && freeTechnicians(state) === 0 && state.staff.technicians < STAFF.MAX_PER_ROLE) {
    add('noCrew', {}, { type: 'staff/hire', payload: { role: 'technicians', count: WORK.CREW_SIZE } });
  }
  return tips.slice(0, OUTAGE_HELP.MAX_TIPS);
}
