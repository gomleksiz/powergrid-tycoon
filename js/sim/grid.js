// Capacity, peak load and outage hours (design section 7).
// The game does not simulate each hour: it finds H for each sector each month.

import { TIERS, TIER_IDS, TIME, GRID, GROWTH } from '../data/balance.js';
import { BUILDINGS, kwhPerMonth, outputMult } from '../data/buildings.js';
import { SECTOR_TYPES } from '../data/sectors.js';
import { OUTAGE_REDUCE_MIN_R } from '../data/techTree.js';
import { sectorEffects } from './effects.js';
import { loadGrowth } from './market.js';

const active = (b) => b.status === 'active';

// An upgraded building gives more (data/buildings.js LEVELS).
export function capacityMw(sector) {
  return sector.buildings.filter((b) => active(b) && BUILDINGS[b.type].capacityMw)
    .reduce((mw, b) => mw + BUILDINGS[b.type].capacityMw * outputMult(b), 0);
}

// Each customer needs a bit more power at the peak every year (version 1.1).
export function peakMw(state, sector) {
  let kw = 0;
  for (const t of TIER_IDS) kw += sector.customers[t] * TIERS[t].peakKw;
  return (kw / 1000) * state.market.peakMult * loadGrowth(state.time.month, GROWTH.PEAK_YEAR);
}

// Own help at the evening peak (MW): plants, batteries and the VPP. Solar gives 0.
// govShare: the part of plant power promised to the government (it does not help own customers).
export function ownPeakMw(state, govShare = 0) {
  let mw = 0;
  for (const s of state.sectors) {
    if (!s.owned) continue;
    const bonus = SECTOR_TYPES[s.type].windBonus ?? 0;
    for (const b of s.buildings) {
      if (!active(b) || b.stopped > 0) continue;
      const def = BUILDINGS[b.type];
      if (def.peakMw) mw += def.peakMw * outputMult(b);
      else if (def.mw) mw += def.mw * outputMult(b) * (def.peakShare ?? 0) * (b.type === 'wind' ? 1 + bonus : 1) * (1 - govShare);
    }
    if (sectorEffects(state, s).vpp) mw += (s.prosumers * GRID.VPP_KW_PER_PROSUMER) / 1000;
  }
  return mw;
}

// Own energy for the month (kWh), and the clean part of it.
export function ownEnergy(state) {
  let kwh = 0;
  let fusion = 0;
  let clean = 0;
  for (const s of state.sectors) {
    if (!s.owned) continue;
    const bonus = SECTOR_TYPES[s.type].windBonus ?? 0;
    for (const b of s.buildings) {
      if (!active(b) || b.stopped > 0) continue;
      const def = BUILDINGS[b.type];
      const k = kwhPerMonth(def, b.type === 'wind' ? bonus : 0) * outputMult(b);
      kwh += k;
      if (def.clean) clean += k;
      if (def.fusion) fusion += k;
    }
  }
  return { kwh, fusion, clean };
}

export function prosumerKwh(state) {
  return state.sectors.reduce((sum, s) => sum + (s.owned ? s.prosumers : 0), 0) * GRID.PROSUMER_KWH;
}

// Company-wide supply gap at the peak (MW). Only when the wholesaler gives less than all.
export function supplyGapMw(state, totalPeak) {
  if (state.market.supplyShare >= 1) return 0;
  const gov = (state.market.shortage ?? 0) > 0 ? state.govtSale?.share ?? 0 : 0;
  return Math.max(0, totalPeak * (1 - state.market.supplyShare) - ownPeakMw(state, gov));
}

// The parts of H for 1 sector (section 7).
export function outageParts(state, sector, shortageRatio = 0) {
  const fx = sectorEffects(state, sector);
  const peak = peakMw(state, sector);
  const cap = capacityMw(sector);
  const wear = ((100 - sector.health) / 100) * GRID.WEAR_HOURS * fx.fLine;
  const overload = peak > 0 ? GRID.PEAK_HOURS * Math.max(0, (peak - cap) / peak) : 0;
  const prosumerCut = fx.prosumer ? prosumerShare(sector) * GRID.PROSUMER_DAMAGE_CUT : 0;
  const damage = sector.dmgHours * (1 - prosumerCut);
  const shortage = GRID.PEAK_HOURS * shortageRatio;
  const R = Math.max(OUTAGE_REDUCE_MIN_R, 1 - fx.outageReduce);
  const H = Math.min(TIME.HOURS_PER_MONTH, wear + overload + damage + shortage) * R;
  return { wear, overload, damage, shortage, R, H, peak, cap };
}

export function prosumerShare(sector) {
  const lm = sector.customers.low + sector.customers.medium;
  return lm > 0 ? Math.min(1, sector.prosumers / lm) : 0;
}

// H for every owned sector. Saves H in sector.lastH and the parts in sector.lastParts.
export function calculateGrid(state) {
  const owned = state.sectors.filter((s) => s.owned);
  const totalPeak = owned.reduce((sum, s) => sum + peakMw(state, s), 0);
  const gap = supplyGapMw(state, totalPeak);
  const ratio = totalPeak > 0 ? gap / totalPeak : 0;
  for (const s of owned) {
    const p = outageParts(state, s, ratio);
    s.lastH = p.H;
    s.lastParts = { wear: p.wear, overload: p.overload, damage: p.damage, shortage: p.shortage, R: p.R };
  }
  return { totalPeak, gap };
}

// Health − d + maintenance ÷ $2,500. The Maintenance budget is split by grid size.
export function updateHealth(state, maintenanceDollars) {
  const owned = state.sectors.filter((s) => s.owned);
  const weight = (s) => GRID.SIZE_BASE + TIER_IDS.reduce((n, t) => n + s.customers[t], 0);
  const total = owned.reduce((sum, s) => sum + weight(s), 0) || 1;
  for (const s of owned) {
    const share = maintenanceDollars * weight(s) / total;
    const d = sectorEffects(state, s).healthDecay;
    s.health = Math.min(100, Math.max(0, s.health - d + share / GRID.MAINTENANCE_PER_POINT));
  }
}

// Small random failures when Health < 40. Returns the sectors that failed.
export function randomFailures(state, rng) {
  const failed = [];
  for (const s of state.sectors) {
    if (!s.owned || s.health >= GRID.FAILURE_HEALTH) continue;
    const chance = ((GRID.FAILURE_HEALTH - s.health) / GRID.FAILURE_HEALTH) * GRID.FAILURE_MAX_CHANCE;
    if (rng.chance(chance)) {
      s.damage = Math.min(100, s.damage + rng.int(GRID.FAILURE_DAMAGE[0], GRID.FAILURE_DAMAGE[1]));
      failed.push(s);
    }
  }
  return failed;
}

// Map color: 'ok' (green ✓), 'warn' (yellow !), 'bad' (red ✕).
export function sectorStatus(sector) {
  if (!sector.owned) return null;
  if (sector.lastH > GRID.RED_HOURS) return 'bad';
  const over = TIER_IDS.some((t) => sector.customers[t] > 0 && sector.lastH > TIERS[t].limitH);
  return over ? 'warn' : 'ok';
}

// H̄: average outage hours, weighted by customers.
export function averageOutage(state) {
  let n = 0;
  let sum = 0;
  for (const s of state.sectors) {
    if (!s.owned) continue;
    const c = TIER_IDS.reduce((x, t) => x + s.customers[t], 0);
    n += c;
    sum += c * s.lastH;
  }
  return n > 0 ? sum / n : 0;
}
