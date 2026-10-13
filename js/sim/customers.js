// New and lost customers each month (design section 6).

import { TIERS, TIER_IDS, CUSTOMERS, CONNECT, GROWTH } from '../data/balance.js';
import { sectorPotential } from './setup.js';
import { effectivePrice, campaignBuzz } from './marketing.js';
import { capacityMw, peakMw } from './grid.js';
import { loadGrowth } from './market.js';

const ownedCount = (state) => Math.max(1, state.sectors.filter((s) => s.owned).length);

export function fMarketing(marketingDollars, prCount = 0, prBonus = 0) {
  const base = Math.min(CUSTOMERS.MKT_MAX, CUSTOMERS.MKT_BASE + marketingDollars / CUSTOMERS.MKT_DIVISOR);
  return base * (1 + prCount * CUSTOMERS.PR_MARKETING * (1 + prBonus));
}

// Version 1.2: new customers care more about the price (design: 2 − m).
// 1.2× → 0.5, 1.4× → 0 (nobody new joins); 0.8× → 1.5.
export const fPrice = (m) => Math.max(0, Math.min(CUSTOMERS.PRICE_F_MAX, 1 - CUSTOMERS.PRICE_ELASTICITY * (m - 1)));

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

// Version 1.2: room for new connections in a sector, in kW at the evening peak.
// A heatwave does not count: it is the normal peak against the substation capacity.
export function connectRoomKw(state, s) {
  const peak = peakMw(state, s) / (state.market.peakMult || 1);
  return Math.max(0, (capacityMw(s) * CONNECT.SHARE - peak) * 1000);
}

// kW at the evening peak for 1 new customer of this tier.
export const connectKw = (state, t) => TIERS[t].peakKw * loadGrowth(state.time.month, GROWTH.PEAK_YEAR);

// New and lost customers in every owned sector. Returns totals for the report.
// ctx: { fx (global effects), budget (budget dollars), cs }
export function updateCustomers(state, rng, ctx) {
  // The marketing budget is spread over the owned sectors (balance step 13).
  const fM = fMarketing(ctx.budget.marketing / ownedCount(state), state.staff.pr, ctx.fx.prBonus);
  const fC = fCS(ctx.cs);
  const out = { gained: 0, lost: 0, waiting: 0, byTier: {} };
  for (const t of TIER_IDS) out.byTier[t] = { gained: 0, lost: 0 };

  for (const s of state.sectors) {
    if (!s.owned) continue;
    const potential = sectorPotential(s);
    const buzz = campaignBuzz(state, s);
    let room = connectRoomKw(state, s);
    s.waiting = 0;
    for (const t of TIER_IDS) {
      if (!ctx.fx.unlockTier.includes(t) || !potential[t]) continue;
      const n = s.customers[t];
      const rival = s.rival?.customers?.[t] ?? 0;
      // The price after a local cut or a campaign (version 1.1).
      const m = effectivePrice(state, s, t);
      // Corporate customers leave only by the contract rule (sim/growth.js).
      const lost = t === 'corporate' ? 0 : roundChance(n * churnRate(t, { H: s.lastH, m, cs: ctx.cs }), rng);
      // Version 1.2: new customers connect only while the substations have room (leavers free some).
      const want = roundChance(newCustomers({ potential: potential[t], n, rival, fM: fM * buzz, fP: fPrice(m), fC }), rng);
      const kw = connectKw(state, t);
      room += lost * kw;
      const gained = Math.min(want, Math.floor(room / kw));
      room -= gained * kw;
      s.waiting += want - gained;
      const next = Math.max(0, Math.min(potential[t] - rival, n + gained - lost));
      out.byTier[t].gained += Math.max(0, next - n + lost);
      out.byTier[t].lost += lost;
      s.customers[t] = next;
    }
  }
  out.waiting = state.sectors.reduce((x, s) => x + (s.owned ? s.waiting : 0), 0);
  for (const t of TIER_IDS) {
    out.gained += out.byTier[t].gained;
    out.lost += out.byTier[t].lost;
  }
  return out;
}
