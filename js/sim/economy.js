// Money each month (design section 6). Pure functions on the state.

import { TIERS, TIER_IDS, MONEY, WHOLESALE, SEASON_OF_MONTH, STAFF, BUDGET, METERS, REGION } from '../data/balance.js';
import { BUILDINGS, levelOf } from '../data/buildings.js';
import { OFFICES, OFFICE_IDS } from '../data/offices.js';
import { potentialTotal } from './setup.js';
import { diff } from '../data/difficulty.js';
import { priceCut } from './marketing.js';
import { govPriceMult } from './market.js';

export const seasonOf = (month) => SEASON_OF_MONTH[(month - 1) % 12];

export function wholesalePrice(state, month = state.time.month) {
  const base = diff(state).wholesaleStart / WHOLESALE.SEASON_MULT[seasonOf(1)];
  return base * WHOLESALE.SEASON_MULT[seasonOf(month)] * state.market.walk * state.market.eventMult
    * (1 + REGION.PRICE_K * (state.market.shortage ?? 0));
}

// What the government pays for own power (per kWh). Without a shortage: 50 % of wholesale.
export const govPrice = (state) => wholesalePrice(state) * govPriceMult(state.market.shortage ?? 0);

// The share of own plant power promised to the government. It counts only in a shortage.
export const govShareNow = (state) => ((state.market.shortage ?? 0) > 0 ? state.govtSale?.share ?? 0 : 0);

// Random walk ± 3 % each month, kept in [0.7, 1.6].
export function stepWalk(state, rng) {
  const change = 1 + (rng.next() * 2 - 1) * WHOLESALE.WALK_STEP;
  state.market.walk = Math.min(WHOLESALE.WALK_MAX, Math.max(WHOLESALE.WALK_MIN, state.market.walk * change));
}

export const ownedSectors = (state) => state.sectors.filter((s) => s.owned);

export function totalCustomers(state) {
  let n = 0;
  for (const s of ownedSectors(state)) for (const t of TIER_IDS) n += s.customers[t];
  return n;
}

// All possible customers in the 12 sectors.
export function totalPotential(state) {
  let n = 0;
  for (const s of state.sectors) n += potentialTotal(s);
  return n;
}

export const marketShare = (state) => totalCustomers(state) / totalPotential(state);

export function customersByTier(state) {
  const out = { low: 0, medium: 0, high: 0, corporate: 0 };
  for (const s of ownedSectors(state)) for (const t of TIER_IDS) out[t] += s.customers[t];
  return out;
}

// Full bill before any withheld payment. Price cuts and campaigns lower it.
export function sectorRevenue(state, sector) {
  let r = 0;
  for (const t of TIER_IDS) r += sector.customers[t] * TIERS[t].tariff * state.prices[t];
  return r * (1 - priceCut(state, sector)) * state.market.priceMult;
}

export function projectedRevenue(state) {
  return ownedSectors(state).reduce((sum, s) => sum + sectorRevenue(state, s), 0);
}

// The budget is a percent of last month's revenue. Month 1 uses this month's bill.
export function budgetBase(state) {
  return state.history.revenue.length ? state.company.lastRevenue : projectedRevenue(state);
}

export function budgetDollars(state) {
  const total = budgetBase(state) * state.budget.totalPct / 100;
  const out = { total };
  for (const k of BUDGET.KEYS) out[k] = total * state.budget.split[k] / 100;
  return out;
}

export function wages(state) {
  const s = state.staff;
  let w = 0;
  for (const role of STAFF.ROLES) w += s[role] * STAFF.WAGE[role];
  return w * s.wageMult + officeWages(state);
}

export function officeWages(state) {
  return OFFICE_IDS.reduce((n, id) => n + (state.offices?.[id]?.hired ? OFFICES[id].wage : 0), 0);
}

export function buildingCount(state) {
  return ownedSectors(state).reduce((n, s) => n + s.buildings.length, 0);
}

// An upgraded building costs more upkeep: $500 × its level.
export function upkeep(state) {
  const levels = ownedSectors(state).reduce((n, s) => n + s.buildings.reduce((x, b) => x + levelOf(b), 0), 0);
  return ownedSectors(state).length * MONEY.UPKEEP_SECTOR + levels * MONEY.UPKEEP_BUILDING;
}

// Version 1.2: serving customers costs money (billing, meters, the call center).
export function serviceCost(state) {
  let c = 0;
  for (const s of ownedSectors(state)) for (const t of TIER_IDS) c += s.customers[t] * TIERS[t].serviceCost;
  return c;
}

// Money out each month without energy and tax (for the Advisor, the manager and bots).
export const monthlyCosts = (state) => wages(state) + upkeep(state) + serviceCost(state) + interest(state) + budgetDollars(state).total;

export function demandKwh(state) {
  let kwh = 0;
  for (const s of ownedSectors(state)) for (const t of TIER_IDS) kwh += s.customers[t] * TIERS[t].kwh;
  return kwh;
}

// Buy what own plants do not make. Sell extra power back at 50 %.
export function energyCost(demand, ownKwh, price) {
  const buy = Math.max(0, demand - ownKwh);
  const sell = Math.max(0, ownKwh - demand);
  return buy * price - MONEY.SELLBACK_SHARE * sell * price;
}

// Version 1.1: in a shortage a share of own power goes to the government (govShare).
// Own power that customers do not need is sold too, all at sellPrice.
export function energyTrade(demand, ownKwh, price, sellPrice, govShare = 0) {
  const gov = ownKwh * govShare;
  const own = ownKwh - gov;
  const buyKwh = Math.max(0, demand - own);
  const sellKwh = gov + Math.max(0, own - demand);
  return { buyKwh, sellKwh, cost: buyKwh * price, sales: sellKwh * sellPrice };
}

export const interest = (state) => state.company.debt * MONEY.INTEREST_RATE;

// ctx: { withheld, penalties, ownKwh, capexCredit } from the other sim parts.
export function monthlyMoney(state, ctx = {}) {
  const price = wholesalePrice(state);
  const gross = projectedRevenue(state);
  const withheld = ctx.withheld ?? 0;
  const revenue = gross - withheld;
  const demand = demandKwh(state);
  const ownKwh = ctx.ownKwh ?? 0;
  const trade = energyTrade(demand, ownKwh, price, govPrice(state), govShareNow(state));
  const out = {
    revenue,
    gross,
    withheld,
    price,
    demandKwh: demand,
    ownKwh,
    energy: trade.cost,
    sales: trade.sales,
    soldKwh: trade.sellKwh,
    govPrice: govPrice(state),
    wages: wages(state),
    upkeep: upkeep(state),
    service: serviceCost(state),
    budget: budgetDollars(state).total,
    interest: interest(state),
    penalties: ctx.penalties ?? 0,
  };
  out.preTax = out.revenue + out.sales - out.energy - out.wages - out.upkeep - out.service - out.budget - out.interest - out.penalties;
  const tax = Math.max(0, out.preTax) * MONEY.TAX_RATE;
  out.tax = Math.max(0, tax - (ctx.capexCredit ?? 0));
  out.net = out.preTax - out.tax;
  return out;
}

// ---------- Loans ----------

// Round down to 1, 2 or 5 × 10ⁿ.
export function niceDown(v) {
  if (!(v > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(v));
  return [5, 2, 1].map((k) => k * p).find((x) => x <= v);
}

// Version 1.2: a bigger company can borrow more (2 months of revenue), in bigger steps.
export const loanLimit = (state) => Math.max(diff(state).loanLimit, niceDown((state.company.lastRevenue || 0) * MONEY.LOAN_REVENUE_MONTHS));
export const loanStep = (state) => Math.max(MONEY.LOAN_STEP, niceDown(loanLimit(state) / MONEY.LOAN_STEPS));
// A repayment is 1 step, or what is left of the debt.
export const repayStep = (state) => Math.min(state.company.debt, loanStep(state));

export function canTakeLoan(state) {
  return state.company.debt + loanStep(state) <= loanLimit(state);
}

export function canRepay(state) {
  return state.company.debt > 0 && state.company.cash >= repayStep(state);
}

export function takeLoan(state) {
  if (!canTakeLoan(state)) return 0;
  const step = loanStep(state);
  state.company.debt += step;
  state.company.cash += step;
  return step;
}

export function repayLoan(state) {
  if (!canRepay(state)) return false;
  const step = repayStep(state);
  state.company.debt -= step;
  state.company.cash -= step;
  return true;
}

// When cash < 0, borrow step by step while the limit allows. Returns the amount.
export function emergencyLoan(state) {
  let taken = 0;
  for (let step = 1; state.company.cash < 0 && step > 0;) {
    step = takeLoan(state);
    taken += step;
  }
  return taken;
}

// Spend money on a project or building. CapEx counts for the tax credit and the score.
export function spendCapex(state, amount) {
  state.company.cash -= amount;
  state.company.capexThisMonth += amount;
  state.company.capexTotal += amount;
}

export const buildingCost = (type) => BUILDINGS[type].cost;

// GS above 75 gives a 15 % CapEx tax credit (section 11).
export const CAPEX_HIGH_GS_DISCOUNT = 0.15;

export function capexCost(state, base) {
  return Math.round(base * (state.meters.gs > METERS.HIGH ? 1 - CAPEX_HIGH_GS_DISCOUNT : 1));
}
