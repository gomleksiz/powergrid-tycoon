// Temporary market changes from events and disasters:
// wholesale price (fuel crisis), price (raise or cut), supply (crunch), heat (heatwave).
// Version 1.1: the regional power shortage also lowers the supply.

import { GRID, REGION, SEASON_OF_MONTH, TIME, MONEY } from '../data/balance.js';

export function addMod(state, mod) {
  state.market.mods.push({ ...mod });
  refreshMarket(state);
}

// Turn the list of changes into the market values that the sim reads.
export function refreshMarket(state) {
  const m = state.market;
  m.eventMult = 1;
  m.priceMult = 1;
  m.supplyShare = 1 - (m.shortage ?? 0);
  m.peakMult = 1;
  for (const mod of m.mods) {
    if (mod.kind === 'wholesale') m.eventMult *= mod.mult;
    if (mod.kind === 'price') m.priceMult *= mod.mult;
    if (mod.kind === 'supply') m.supplyShare = Math.min(m.supplyShare, mod.share);
    if (mod.kind === 'peak') m.peakMult *= mod.mult;   // version 1.2: heat dome card
    if (mod.kind === 'heat') {
      m.peakMult *= GRID.HEATWAVE_PEAK;
      m.supplyShare = Math.min(m.supplyShare, GRID.HEATWAVE_SUPPLY);
    }
  }
}

// After each month tick: 1 month less for each change.
export function tickMods(state) {
  state.market.mods = state.market.mods.filter((mod) => --mod.months > 0);
  refreshMarket(state);
}

// ---------- the region (version 1.1) ----------

const years = (month) => (month - 1) / TIME.MONTHS_PER_YEAR;

// Supply ÷ demand − 1 in the region. Below 0 = a shortage.
export function regionMargin(month, noise = 0) {
  const y = years(month);
  const supply = (1 + REGION.START_MARGIN) * (1 + REGION.SUPPLY_YEAR) ** y;
  const season = REGION.SEASON[SEASON_OF_MONTH[(month - 1) % 12]];
  const demand = (1 + REGION.DEMAND_YEAR) ** y * (1 + season) * (1 + noise);
  return supply / demand - 1;
}

export const shortageAt = (month, noise = 0) => Math.max(0, -regionMargin(month, noise));

// The government buys power at this share of the wholesale price (50 % without a shortage).
export function govPriceMult(shortage) {
  return Math.min(REGION.GOV_MAX, MONEY.SELLBACK_SHARE + REGION.GOV_K * shortage);
}

// The month step: a small random walk, then the shortage of next month. Returns events.
export function updateRegion(state, rng) {
  const m = state.market;
  const before = m.shortage ?? 0;
  m.noise = Math.max(-REGION.NOISE_MAX, Math.min(REGION.NOISE_MAX, (m.noise ?? 0) + (rng.next() * 2 - 1) * REGION.NOISE_STEP));
  m.shortage = shortageAt(state.time.month + 1, m.noise);
  refreshMarket(state);
  const pct = Math.round(m.shortage * 100);
  if (before === 0 && m.shortage > 0) return [{ type: 'news', payload: { key: 'shortageStart', pct, kind: 'warn' } }];
  if (before > 0 && m.shortage === 0) return [{ type: 'news', payload: { key: 'shortageEnd' } }];
  if (Math.abs(m.shortage - before) >= REGION.NEWS_STEP) return [{ type: 'news', payload: { key: 'shortageNow', pct, kind: 'warn' } }];
  return [];
}

// Growth factor of the evening peak for each customer.
export const loadGrowth = (month, rate) => (1 + rate) ** years(month);
