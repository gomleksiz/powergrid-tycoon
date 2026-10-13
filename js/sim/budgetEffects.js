// What each budget part does now (version 1.2), so the player can see the effect of a slider.
// Each part: { dollars, top (dollars a month where more does nothing), over (dollars above the top), ... }.
// Pure: it reads the state, it changes nothing.

import { CUSTOMERS, WORK, GRID, SAT, TIER_IDS } from '../data/balance.js';
import { budgetDollars, ownedSectors } from './economy.js';
import { globalEffects, sectorEffects } from './effects.js';
import { fMarketing, fPrice, fCS, newCustomers } from './customers.js';
import { campaignBuzz, effectivePrice } from './marketing.js';
import { sectorPotential } from './setup.js';
import { fRD, rpPerTeamMonth, researchProjects } from './research.js';

const over = (dollars, top) => Math.max(0, dollars - top);

// New customers a month in all owned sectors with a marketing budget of `dollars`
// (before the substation room and the rivals).
function expectedNew(state, dollars, g) {
  const owned = ownedSectors(state);
  const fM = fMarketing(dollars / Math.max(1, owned.length), state.staff.pr, g.prBonus);
  const fC = fCS(state.meters.cs);
  let n = 0;
  for (const s of owned) {
    const pot = sectorPotential(s);
    for (const t of TIER_IDS) {
      if (!g.unlockTier.includes(t) || !pot[t]) continue;
      n += newCustomers({
        potential: pot[t], n: s.customers[t], rival: s.rival?.customers?.[t] ?? 0,
        fM: fM * campaignBuzz(state, s), fP: fPrice(effectivePrice(state, s, t)), fC,
      });
    }
  }
  return n;
}

export function budgetEffects(state) {
  const d = budgetDollars(state);
  const g = globalEffects(state);
  const owned = ownedSectors(state);
  const n = Math.max(1, owned.length);

  // Marketing: F marketing in each sector, × 2 at most.
  const mktTop = (CUSTOMERS.MKT_MAX - CUSTOMERS.MKT_BASE) * CUSTOMERS.MKT_DIVISOR * n;
  const withBudget = expectedNew(state, d.marketing, g);
  const marketing = {
    dollars: d.marketing, top: mktTop, over: over(d.marketing, mktTop),
    factor: Math.min(CUSTOMERS.MKT_MAX, CUSTOMERS.MKT_BASE + d.marketing / n / CUSTOMERS.MKT_DIVISOR),
    newPerMonth: withBudget,
    fromBudget: withBudget - expectedNew(state, 0, g),
  };

  // R&D: research speed × 0.75 … × 1.5.
  const rdTop = (WORK.RD_MAX - WORK.RD_BASE) * WORK.RD_DIVISOR;
  const teams = researchProjects(state).reduce((x, p) => x + (p.teams ?? 0), 0);
  const rpNow = teams * rpPerTeamMonth(state);
  const rd = {
    dollars: d.rd, top: rdTop, over: over(d.rd, rdTop),
    factor: fRD(d.rd), teams, rpPerMonth: rpNow,
    fromBudget: fRD(d.rd) > 0 ? rpNow * (1 - WORK.RD_BASE / fRD(d.rd)) : 0,
  };

  // Maintenance: health points a month in each sector (split by size), minus the decay.
  const weight = (s) => GRID.SIZE_BASE + TIER_IDS.reduce((x, t) => x + s.customers[t], 0);
  const total = owned.reduce((x, s) => x + weight(s), 0) || 1;
  let worst = null;
  let need = 0;
  let netSum = 0;
  for (const s of owned) {
    const share = weight(s) / total;
    const decay = sectorEffects(state, s).healthDecay;
    const net = (d.maintenance * share) / GRID.MAINTENANCE_PER_POINT - decay;
    netSum += net;
    if (!worst || net < worst.net) worst = { name: s.name, net, health: s.health };
    need = Math.max(need, (decay * GRID.MAINTENANCE_PER_POINT) / share);   // holds every sector's health
  }
  const allFull = owned.every((s) => s.health >= 100);
  const maintenance = {
    dollars: d.maintenance, top: allFull ? need : Infinity, over: allFull ? over(d.maintenance, need) : 0,
    avgNet: owned.length ? netSum / owned.length : 0, worst, holdDollars: need,
  };

  // Lobbying: GS target + 20 at most. PR specialists make it stronger.
  const lobbyMult = 1 + SAT.PR_LOBBY * state.staff.pr;
  const lobbyTop = (SAT.LOBBY_MAX * SAT.LOBBY_DIVISOR) / lobbyMult;
  const lobbying = {
    dollars: d.lobbying, top: lobbyTop, over: over(d.lobbying, lobbyTop),
    gs: Math.min(SAT.LOBBY_MAX, (d.lobbying / SAT.LOBBY_DIVISOR) * lobbyMult),
  };

  // PR: CS target + 10 at most.
  const prTop = SAT.PR_MAX * SAT.PR_DIVISOR;
  const pr = {
    dollars: d.pr, top: prTop, over: over(d.pr, prTop),
    cs: Math.min(SAT.PR_MAX, d.pr / SAT.PR_DIVISOR),
  };

  const wasted = marketing.over + rd.over + maintenance.over + lobbying.over + pr.over;
  return { marketing, rd, maintenance, lobbying, pr, wasted };
}
