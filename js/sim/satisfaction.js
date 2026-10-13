// The 3 meters: Customer, Employee and Government Satisfaction (design section 11).
// Each month the game finds a target; the meter moves part of the way to it.

import { TIERS, TIER_IDS, METERS, SAT, REGION } from '../data/balance.js';
import { diff } from '../data/difficulty.js';
import { globalEffects } from './effects.js';
import { budgetDollars, demandKwh, marketShare, govShareNow } from './economy.js';
import { priceCut } from './marketing.js';
import { ownEnergy, averageOutage, prosumerKwh } from './grid.js';
import { backlogWeeks } from './repair.js';
import { crunchCount } from './staffing.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// m̄: the price slider, weighted by customers (a local price cut lowers it).
export function averagePrice(state) {
  let n = 0;
  let sum = 0;
  for (const s of state.sectors) {
    if (!s.owned) continue;
    for (const t of TIER_IDS) {
      const c = s.customers[t];
      n += c;
      sum += c * state.prices[t] * (1 - priceCut(state, s));
    }
  }
  return n > 0 ? sum / n : 1;
}

// c = clean share, k = coal share = wholesale share × 0.6.
export function energyMix(state) {
  const demand = demandKwh(state);
  if (demand <= 0) return { c: 0, k: 0, wholesale: 1 };
  // Power promised to the government does not count for own customers.
  const keep = 1 - govShareNow(state);
  const all = ownEnergy(state);
  const own = { kwh: all.kwh * keep, clean: all.clean * keep, fusion: all.fusion * keep };
  const roof = prosumerKwh(state);
  const clean = Math.min(demand, own.clean + roof);
  const wholesale = Math.max(0, demand - own.kwh - roof) / demand;
  return { c: clamp(clean / demand, 0, 1), k: wholesale * SAT.COAL_SHARE, wholesale, fusion: Math.min(1, own.fusion / demand) };
}

// Each target as a list of parts, so the tooltip can explain it.
export function csTarget(state, ctx = {}) {
  const g = ctx.g ?? globalEffects(state);
  const mix = ctx.mix ?? energyMix(state);
  const H = ctx.H ?? averageOutage(state);
  const pr = budgetDollars(state).pr;
  const parts = [
    { key: 'base', value: SAT.CS_BASE },
    { key: 'price', value: -SAT.CS_PRICE * (averagePrice(state) - 1) },
    { key: 'outage', value: -Math.min(SAT.CS_OUTAGE_MAX, SAT.CS_OUTAGE * H) },
    { key: 'clean', value: SAT.CS_CLEAN * mix.c },
    { key: 'coal', value: -SAT.CS_COAL * mix.k },
    { key: 'tech', value: g.csBonus },
    { key: 'pr', value: Math.min(SAT.PR_MAX, pr / SAT.PR_DIVISOR) },
  ];
  return withTotal(parts);
}

export function esTarget(state, ctx = {}) {
  const g = ctx.g ?? globalEffects(state);
  const parts = [
    { key: 'base', value: SAT.ES_BASE },
    { key: 'wage', value: SAT.ES_WAGE * (state.staff.wageMult - 1) },
    { key: 'crunch', value: -Math.min(SAT.ES_CRUNCH_MAX, SAT.ES_CRUNCH * crunchCount(state)) },
    { key: 'overload', value: -SAT.ES_OVERLOAD * Math.min(1, backlogWeeks(state) / SAT.ES_BACKLOG_WEEKS) },
    { key: 'tech', value: g.esBonus },
  ];
  return withTotal(parts);
}

export function gsTarget(state, ctx = {}) {
  const g = ctx.g ?? globalEffects(state);
  const mix = ctx.mix ?? energyMix(state);
  const H = ctx.H ?? averageOutage(state);
  const lobby = budgetDollars(state).lobbying;
  const uptime = H < SAT.UPTIME_GOOD_H ? SAT.UPTIME_GOOD : H > SAT.UPTIME_BAD_H ? SAT.UPTIME_BAD : 0;
  const antitrust = marketShare(state) > SAT.ANTITRUST_SHARE && !state.rivalPolicy.monopolyCharter ? SAT.ANTITRUST : 0;
  const parts = [
    { key: 'base', value: SAT.GS_BASE },
    { key: 'clean', value: SAT.GS_CLEAN * mix.c },
    { key: 'coal', value: -SAT.GS_COAL * mix.k * g.coalDragMult },
    { key: 'uptime', value: uptime },
    { key: 'lobbying', value: Math.min(SAT.LOBBY_MAX, (lobby / SAT.LOBBY_DIVISOR) * (1 + SAT.PR_LOBBY * state.staff.pr)) },
    { key: 'gridHelp', value: gridHelp(state) },
    { key: 'antitrust', value: -antitrust },
    { key: 'tech', value: g.gsBonus },
  ];
  return withTotal(parts);
}

// Power sold to the government in a shortage (last month) pleases the government.
export function gridHelp(state) {
  if (!((state.market.shortage ?? 0) > 0)) return 0;
  return Math.min(REGION.GS_MAX, ((state.govtSale?.lastKwh ?? 0) / 1e6) * REGION.GS_PER_GWH);
}

function withTotal(parts) {
  const raw = parts.reduce((s, p) => s + p.value, 0);
  return { target: clamp(raw, 0, 100), parts };
}

export function targets(state) {
  const ctx = { g: globalEffects(state), mix: energyMix(state), H: averageOutage(state) };
  return { cs: csTarget(state, ctx), es: esTarget(state, ctx), gs: gsTarget(state, ctx) };
}

// Meter + r × (Target − Meter). r depends on the direction and the difficulty.
export function moveMeter(value, target, d) {
  const r = target > value ? d.meterUp : d.meterDown;
  return clamp(value + r * (target - value), 0, 100);
}

// The main reason for a change: the part (not the base) that pushes most in that direction.
export function topReason(parts, dir) {
  const list = parts.filter((p) => p.key !== 'base' && Math.sign(p.value) === dir);
  list.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return list[0]?.key ?? null;
}

// The month step: move the meters, then the effects below 30.
export function updateMeters(state, rng) {
  const d = diff(state);
  const t = targets(state);
  const before = { ...state.meters };
  for (const k of ['cs', 'es', 'gs']) state.meters[k] = moveMeter(state.meters[k], t[k].target, d);

  const events = [];
  // ES < 30: 50 % chance of a 1-month strike.
  if (state.meters.es < METERS.LOW && state.staff.strikeMonths === 0 && rng.chance(SAT.STRIKE_CHANCE)) {
    state.staff.strikeMonths = SAT.STRIKE_MONTHS;
    events.push({ type: 'news', payload: { key: 'strike', kind: 'error' } });
  }
  // GS < 30: an audit fine every 6 months.
  if (state.govt.auditCooldown > 0) state.govt.auditCooldown -= 1;
  let fine = 0;
  if (state.meters.gs < METERS.LOW && state.govt.auditCooldown === 0) {
    // Version 1.2: the fine fits the company size, so a small company is not wiped out.
    const [lo, hi] = SAT.AUDIT_REVENUE;
    const raw = (state.company.lastRevenue || 0) * (lo + rng.next() * (hi - lo));
    fine = Math.round(Math.min(SAT.AUDIT_FINE[1], Math.max(SAT.AUDIT_FINE[0], raw)) / SAT.AUDIT_STEP) * SAT.AUDIT_STEP;
    state.govt.auditCooldown = SAT.AUDIT_EVERY;
    events.push({ type: 'news', payload: { key: 'audit', amount: fine, kind: 'error' } });
  }
  // GS < 30: prices can be 1.1× at most.
  if (state.meters.gs < METERS.LOW) {
    for (const tier of TIER_IDS) state.prices[tier] = Math.min(state.prices[tier], SAT.LOW_GS_PRICE_MAX);
  }
  const reasons = {};
  for (const k of ['cs', 'es', 'gs']) {
    const dir = Math.sign(state.meters[k] - before[k]);
    reasons[k] = dir ? topReason(t[k].parts, dir) : null;
  }
  return { before, after: { ...state.meters }, targets: t, reasons, fine, events };
}

export const tierLimit = (t) => TIERS[t].limitH;
