// Disasters (design section 13). Rolled with the seeded rng 2 months ahead,
// so warnings fit and a load gives the same future.

import { DISASTERS, DISASTER_TYPES, SUPERSTORM, DISASTER } from '../data/disasters.js';
import { SECTOR_TYPES } from '../data/sectors.js';
import { NODES, NODE_IDS } from '../data/techTree.js';
import { TIME, BREAKDOWN } from '../data/balance.js';
import { diff } from '../data/difficulty.js';
import { neighbors } from './mapgen.js';
import { seasonOf } from './economy.js';
import { sectorEffects, nodeActiveIn } from './effects.js';
import { repairPower, freeTechnicians } from './repair.js';
import { addMod } from './market.js';

export const weekIndex = (month, week) => (month - 1) * TIME.WEEKS_PER_MONTH + (week - 1);
const nowIndex = (state) => weekIndex(state.time.month, state.time.week);

// Weighted pick of n different sectors. Hazard sectors have a higher chance.
function pickSectors(state, rng, hazard, n) {
  const pool = state.sectors.map((s) => ({ id: s.id, w: SECTOR_TYPES[s.type].hazard[hazard] ?? 1 }));
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((sum, p) => sum + p.w, 0);
    let r = rng.next() * total;
    let k = 0;
    while (k < pool.length - 1 && r >= pool[k].w) { r -= pool[k].w; k++; }
    out.push(pool[k].id);
    pool.splice(k, 1);
  }
  return out;
}

function makeHits(state, rng, def, hazard, count) {
  const main = pickSectors(state, rng, hazard, count);
  const hits = main.map((id) => ({ sector: id, base: rng.int(def.damage[0], def.damage[1]) }));
  if (def.spread) {
    for (const id of main) {
      const ns = neighbors(id).filter((n) => !hits.some((x) => x.sector === n));
      const list = def.spread === 'neighbor' && ns.length ? [ns[rng.int(0, ns.length - 1)]] : def.spread === 'neighbors' ? ns : [];
      for (const n of list) hits.push({ sector: n, base: Math.round(rng.int(def.damage[0], def.damage[1]) * DISASTER.NEIGHBOR_DAMAGE) });
    }
  }
  return hits;
}

// At a month tick: roll each disaster type once for `month` (2 months ahead).
export function rollDisasters(state, rng, month) {
  if (month > TIME.END_MONTH) return;
  const mult = diff(state).disasterMult;
  const season = seasonOf(month);
  for (const type of DISASTER_TYPES) {
    const def = DISASTERS[type];
    if (def.fromMonth && month < def.fromMonth) continue;
    if (!rng.chance(def.chance[season] * mult)) continue;
    const week = rng.int(1, TIME.WEEKS_PER_MONTH);
    const hits = def.allSectors
      ? state.sectors.map((s) => ({ sector: s.id, base: 0 }))
      : makeHits(state, rng, def, def.hazard ?? type, rng.int(def.sectors[0], def.sectors[1]));
    state.disasters.scheduled.push({ id: state.nextId++, type, month, week, hits, warned: false });
  }
  if (month === SUPERSTORM.month && !state.disasters.stormDone) {
    const hits = pickSectors(state, rng, 'windstorm', SUPERSTORM.sectors)
      .map((id) => ({ sector: id, base: rng.int(SUPERSTORM.damage[0], SUPERSTORM.damage[1]) }));
    state.disasters.scheduled.push({ id: state.nextId++, type: 'superstorm', month, week: SUPERSTORM.week, hits, warned: false });
    state.disasters.stormDone = true;
  }
}

// Weeks of warning for this disaster (0 = none).
export function warningWeeks(state, item) {
  if (item.type === 'superstorm') return SUPERSTORM.warningWeeks;
  const d = diff(state);
  if (!d.warningNeedsTech) return d.warningWeeks;
  const sensed = item.hits.some((h) => {
    const s = state.sectors[h.sector];
    return s.owned && sectorEffects(state, s).warning;
  });
  return sensed ? d.warningWeeks : 0;
}

const damageKey = (type) => type;

// Techs active in the sector that change this kind of damage (for the report).
function savers(state, sector, type) {
  return NODE_IDS.filter((id) => NODES[id].effects.damageMult?.[type] !== undefined && nodeActiveIn(state, id, sector)
    && NODES[id].effects.damageMult[type] < 1).map((id) => id);
}

function strike(state, item, rng) {
  const def = DISASTERS[item.type] ?? DISASTERS.windstorm;
  const key = damageKey(item.type);
  const lines = [];
  for (const hit of item.hits) {
    const s = state.sectors[hit.sector];
    if (!s.owned || hit.base <= 0) continue;
    const fx = sectorEffects(state, s);
    const techMult = fx.damageMult[key] ?? 1;
    const prepMult = s.prep ? DISASTER.PREP_DAMAGE_MULT : 1;
    const actual = Math.min(100 - s.damage, hit.base * techMult * prepMult);
    s.damage = Math.min(100, s.damage + actual);
    if (s.prep) s.prepRepair = true;
    lines.push({
      sector: s.id, name: s.name, base: hit.base, actual: +actual.toFixed(1),
      saved: +(hit.base - hit.base * techMult * prepMult).toFixed(1),
      savedBy: savers(state, s, key), prep: s.prep,
    });
    s.prep = false;
    lines[lines.length - 1].broken = breakBuildings(s, actual, rng);
    if (def.stopsFission) for (const b of s.buildings) if (b.type === 'fission' && b.status === 'active') b.stopped = def.stopsFission;
  }
  if (def.heat) addMod(state, { kind: 'heat', months: 1 });
  const totalDamage = lines.reduce((n, l) => n + l.actual, 0);
  const power = repairPower(state, freeTechnicians(state));
  const report = {
    id: item.id, type: item.type, month: item.month, week: item.week, sectors: lines,
    repairWeeks: totalDamage > 0 ? (power > 0 ? Math.ceil(totalDamage / power) : null) : 0,
  };
  state.disasters.log.unshift(report);
  state.disasters.log.length = Math.min(state.disasters.log.length, DISASTER.LOG_MAX);
  state.disasters.active.push({ type: item.type, sectors: item.hits.map((h) => h.sector), weeks: 1 });
  return report;
}

// Version 1.2: a hit can break buildings. The chance grows with the damage
// (tech and Storm Prep already lowered it). Returns the types that broke.
export function breakBuildings(sector, damage, rng) {
  const broken = [];
  const chance = damage * BREAKDOWN.CHANCE_PER_POINT;
  if (!rng || chance <= 0) return broken;
  for (const b of sector.buildings) {
    if (b.status !== 'active' || b.broken || !rng.chance(chance)) continue;
    b.broken = true;
    broken.push(b.type);
  }
  return broken;
}

// Each week: give warnings, then let the disasters of this week strike.
export function disasterWeek(state, rng) {
  const events = [];
  state.disasters.active = state.disasters.active.filter((a) => --a.weeks >= 0);
  const now = nowIndex(state);
  const left = [];
  for (const item of state.disasters.scheduled) {
    const at = weekIndex(item.month, item.week);
    if (at <= now) {
      const report = strike(state, item, rng);
      events.push({ type: 'disaster:hit', payload: report });
      continue;
    }
    const ww = warningWeeks(state, item);
    if (!item.warned && ww > 0 && at - now <= ww) {
      item.warned = true;
      // Version 1.2: Storm Prep is paid by itself (the player can turn this off).
      const prepped = state.policy?.autoPrep ? item.hits.map((h) => h.sector).filter((id) => stormPrep(state, id)) : [];
      events.push({ type: 'disaster:warning', payload: { id: item.id, type: item.type, weeks: at - now, sectors: item.hits.map((h) => h.sector), prepped } });
    }
    left.push(item);
  }
  state.disasters.scheduled = left;
  return events;
}

// Warned disasters that will hit this sector.
export function warningsFor(state, sectorId) {
  return state.disasters.scheduled.filter((d) => d.warned && d.hits.some((h) => h.sector === sectorId));
}

export function canPrep(state, sectorId) {
  const s = state.sectors[sectorId];
  return !!s?.owned && !s.prep && warningsFor(state, sectorId).length > 0 && state.company.cash >= DISASTER.PREP_COST;
}

// Storm Prep: $10,000, damage − 20 %, crews wait near the sector (repair starts at once).
export function stormPrep(state, sectorId) {
  if (!canPrep(state, sectorId)) return false;
  state.company.cash -= DISASTER.PREP_COST;
  state.company.otherCostsThisMonth += DISASTER.PREP_COST;
  state.sectors[sectorId].prep = true;
  return true;
}

// Each month: stopped fission plants count down.
export function monthDisasters(state) {
  for (const s of state.sectors) for (const b of s.buildings) if (b.stopped > 0) b.stopped -= 1;
}

