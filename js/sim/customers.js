// New and lost customers each month (design section 6).

import { TIERS, TIER_IDS, CUSTOMERS } from '../data/balance.js';
import { sectorPotential } from './setup.js';

const ownedCount = (state) => Math.max(1, state.sectors.filter((s) => s.owned).length);

export function fMarketing(marketingDollars, prCount = 0, prBonus = 0) {
  const base = Math.min(CUSTOMERS.MKT_MAX, CUSTOMERS.MKT_BASE + marketingDollars / CUSTOMERS.MKT_DIVISOR);
  return base * (1 + prCount * CUSTOMERS.PR_MARKETING * (1 + prBonus));
}

export const fPrice = (m) => 2 - m;

export function fCS(cs) {
  return CUSTOMERS.CS_BASE + cs / 100 + (cs > CUSTOMERS.WORD_OF_MOUTH_CS ? CUSTOMERS.WORD_OF_MOUTH : 0);
}

// Expected new customers (a real number). The tick rounds it with the rng.
export function newCustomers({ potential, n, rival = 0, fM, fP, fC }) {
  return Math.max(0, potential - n - rival) * CUSTOMERS.NEW_RATE * fM * fP * fC;
}

// Share of customers that leave this month.
export function churnRate(tier, { H = 0, m = 1, cs = 60 }) {
  const t = TIERS[tier];
  let rate = t.baseChurn
    + t.outageK * Math.max(0, H / t.limitH - 1)
    + CUSTOMERS.PRICE_CHURN * Math.max(0, m - 1);
  if (cs < CUSTOMERS.LOW_CS) rate *= CUSTOMERS.LOW_CS_CHURN_MULT;
  return Math.min(CUSTOMERS.MAX_CHURN, rate);
}

// Round x to a whole number; the part after the point becomes a chance.
export function roundChance(x, rng) {
  const whole = Math.floor(x);
  return whole + (rng.next() < x - whole ? 1 : 0);
}

// New and lost customers in every owned sector. Returns totals for the report.
// ctx: { fx (global effects), budget (budget dollars), cs }
export function updateCustomers(state, rng, ctx) {
  // The marketing budget is spread over the owned sectors (balance step 13).
  const fM = fMarketing(ctx.budget.marketing / ownedCount(state), state.staff.pr, ctx.fx.prBonus);
  const fC = fCS(ctx.cs);
  const out = { gained: 0, lost: 0, byTier: {} };
  for (const t of TIER_IDS) out.byTier[t] = { gained: 0, lost: 0 };

  for (const s of state.sectors) {
    if (!s.owned) continue;
    const potential = sectorPotential(s);
    for (const t of TIER_IDS) {
      if (!ctx.fx.unlockTier.includes(t) || !potential[t]) continue;
      const n = s.customers[t];
      const rival = s.rival?.customers?.[t] ?? 0;
      const m = state.prices[t];
      const gained = roundChance(newCustomers({ potential: potential[t], n, rival, fM, fP: fPrice(m), fC }), rng);
      // Corporate customers leave only by the contract rule (sim/growth.js).
      const lost = t === 'corporate' ? 0 : roundChance(n * churnRate(t, { H: s.lastH, m, cs: ctx.cs }), rng);
      const next = Math.max(0, Math.min(potential[t] - rival, n + gained - lost));
      out.byTier[t].gained += Math.max(0, next - n + lost);
      out.byTier[t].lost += lost;
      s.customers[t] = next;
    }
  }
  for (const t of TIER_IDS) {
    out.gained += out.byTier[t].gained;
    out.lost += out.byTier[t].lost;
  }
  return out;
}
