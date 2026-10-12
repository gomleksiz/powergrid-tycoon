// Prosumers: homes with rooftop solar (design sections 10 and 14).
// In sectors with the Prosumer Program, 2 % × F marketing of Low and Medium customers join each month.

import { CUSTOMERS } from '../data/balance.js';
import { sectorEffects } from './effects.js';
import { fMarketing, roundChance } from './customers.js';

export function updateProsumers(state, rng, marketingDollars, g) {
  const fM = fMarketing(marketingDollars, state.staff.pr, g.prBonus);
  let joined = 0;
  for (const s of state.sectors) {
    if (!s.owned) continue;
    const homes = s.customers.low + s.customers.medium;
    // Prosumers can never be more than the Low and Medium customers (they leave too).
    s.prosumers = Math.min(s.prosumers, homes);
    if (!sectorEffects(state, s).prosumer) continue;
    const n = roundChance((homes - s.prosumers) * CUSTOMERS.NEW_RATE * fM, rng);
    s.prosumers = Math.min(homes, s.prosumers + n);
    joined += n;
  }
  return joined;
}

export function prosumerShareAll(state) {
  let homes = 0;
  let pros = 0;
  for (const s of state.sectors) {
    if (!s.owned) continue;
    homes += s.customers.low + s.customers.medium;
    pros += s.prosumers;
  }
  return homes > 0 ? pros / homes : 0;
}
