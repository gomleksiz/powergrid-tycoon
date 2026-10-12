// Growth: phases, opening sectors, the High and Corporate tier rules (design sections 3, 5 and 6).

import { TIERS, CORPORATE, HIGH_TIER, GROWTH, TIER_IDS, TIME } from '../data/balance.js';
import { PHASES, phaseOf } from '../data/phases.js';
import { SECTOR_START, NEW_SECTOR_BUILDINGS } from '../data/sectors.js';
import { BUILDINGS } from '../data/buildings.js';
import { neighbors, mapgen, findFreeSpot } from './mapgen.js';
import { potentialTotal } from './setup.js';
import { sectorEffects } from './effects.js';
import { spendCapex, capexCost } from './economy.js';
import { priceCut } from './marketing.js';

export const currentPhase = (state) => phaseOf(state.time.month);
export const ownedCount = (state) => state.sectors.filter((s) => s.owned).length;

export function openCost(state) {
  const cost = currentPhase(state).openCost;
  return cost === null ? null : capexCost(state, cost);
}

// → { ok, reason }
export function canOpenSector(state, id) {
  const s = state.sectors[id];
  if (!s) return { ok: false, reason: 'unknown' };
  if (s.owned) return { ok: false, reason: 'owned' };
  const phase = currentPhase(state);
  if (phase.openCost === null) return { ok: false, reason: 'phase', month: PHASES[1].start };
  if (ownedCount(state) >= phase.maxSectors) {
    const next = PHASES.find((p) => p.maxSectors > phase.maxSectors);
    return { ok: false, reason: 'limit', max: phase.maxSectors, month: next?.start };
  }
  if (!neighbors(id).some((n) => state.sectors[n].owned)) return { ok: false, reason: 'adjacent' };
  if (state.company.cash < openCost(state)) return { ok: false, reason: 'cash' };
  return { ok: true };
}

// The opening cost includes 1 substation, so the new sector has some capacity.
export function openSector(state, id) {
  if (!canOpenSector(state, id).ok) return false;
  const s = state.sectors[id];
  spendCapex(state, openCost(state));
  s.owned = true;
  s.health = SECTOR_START.health;
  const map = mapgen(state.seed);
  for (const type of NEW_SECTOR_BUILDINGS) {
    const all = state.sectors.flatMap((x) => x.buildings);
    const spot = findFreeSpot(map, all, id, BUILDINGS[type].size);
    if (spot) s.buildings.push({ id: state.nextId++, type, x: spot.x, y: spot.y, status: 'active' });
  }
  return true;
}

// High tier: no payment in a month with H over 4 h. Smart Meters: only 50 % is withheld.
export function withheldHigh(state) {
  let sum = 0;
  for (const s of state.sectors) {
    if (!s.owned || s.customers.high <= 0 || s.lastH <= TIERS.high.limitH) continue;
    const bill = s.customers.high * TIERS.high.tariff * state.prices.high * (1 - priceCut(state, s));
    sum += bill * HIGH_TIER.WITHHOLD_SHARE * sectorEffects(state, s).withheldHighMult;
  }
  return sum;
}

// Corporate tier: with H over 0.5 h, each contract has a 50 % chance to end. Penalty = 3 × tariff.
export function corporateContracts(state, rng) {
  const out = { lost: 0, penalty: 0, sectors: [] };
  for (const s of state.sectors) {
    if (!s.owned || s.customers.corporate <= 0 || s.lastH <= TIERS.corporate.limitH) continue;
    let lost = 0;
    for (let i = 0; i < s.customers.corporate; i++) if (rng.chance(CORPORATE.CONTRACT_END_CHANCE)) lost++;
    if (!lost) continue;
    s.customers.corporate -= lost;
    out.lost += lost;
    out.penalty += lost * CORPORATE.PENALTY_TARIFFS * TIERS.corporate.tariff * state.prices.corporate;
    out.sectors.push({ name: s.name, lost });
  }
  return out;
}

// Version 1.1: more homes and firms each year. Sets sector.growth for the month.
export function growthAt(month) {
  const y = Math.max(0, month - GROWTH.START_MONTH) / TIME.MONTHS_PER_YEAR;
  return Object.fromEntries(TIER_IDS.map((t) => [t, (1 + GROWTH.POTENTIAL_YEAR[t]) ** y]));
}

// The month step. Each December: news with the number of new possible customers.
export function growRegion(state, nextMonth) {
  const g = growthAt(nextMonth);
  for (const s of state.sectors) s.growth = { ...g };
  if ((nextMonth - 1) % TIME.MONTHS_PER_YEAR !== 0) return [];
  const yearAgo = growthAt(nextMonth - TIME.MONTHS_PER_YEAR);
  const total = (growth) => state.sectors.reduce((n, s) => n + potentialTotal({ ...s, growth }), 0);
  const count = total(g) - total(yearAgo);
  return count > 0 ? [{ type: 'news', payload: { key: 'regionGrew', count } }] : [];
}

// A new phase starts at a fixed month. Returns events.
export function checkPhase(state) {
  const p = currentPhase(state);
  if (p.id === state.flags.phase) return [];
  state.flags.phase = p.id;
  return [{ type: 'phase:start', payload: { phase: p.id } }];
}
