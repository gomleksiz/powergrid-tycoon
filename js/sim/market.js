// Temporary market changes from events and disasters:
// wholesale price (fuel crisis), price (raise or cut), supply (crunch), heat (heatwave).

import { GRID } from '../data/balance.js';

export function addMod(state, mod) {
  state.market.mods.push({ ...mod });
  refreshMarket(state);
}

// Turn the list of changes into the market values that the sim reads.
export function refreshMarket(state) {
  const m = state.market;
  m.eventMult = 1;
  m.priceMult = 1;
  m.supplyShare = 1;
  m.peakMult = 1;
  for (const mod of m.mods) {
    if (mod.kind === 'wholesale') m.eventMult *= mod.mult;
    if (mod.kind === 'price') m.priceMult *= mod.mult;
    if (mod.kind === 'supply') m.supplyShare = Math.min(m.supplyShare, mod.share);
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
