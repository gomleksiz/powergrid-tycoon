// Money each month (design section 6). Pure functions on the state.

import { TIERS, TIER_IDS, MONEY, WHOLESALE, SEASON_OF_MONTH, STAFF, BUDGET, METERS } from '../data/balance.js';
import { BUILDINGS } from '../data/buildings.js';
import { diff } from '../data/difficulty.js';

export const seasonOf = (month) => SEASON_OF_MONTH[(month - 1) % 12];

export function wholesalePrice(state, month = state.time.month) {
  const base = diff(state).wholesaleStart / WHOLESALE.SEASON_MULT[seasonOf(1)];
  return base * WHOLESALE.SEASON_MULT[seasonOf(month)] * state.market.walk * state.market.eventMult;
}

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

export function customersByTier(state) {
  const out = { low: 0, medium: 0, high: 0, corporate: 0 };
  for (const s of ownedSectors(state)) for (const t of TIER_IDS) out[t] += s.customers[t];
  return out;
}

// Full bill before any withheld payment.
export function sectorRevenue(state, sector) {
  let r = 0;
  for (const t of TIER_IDS) r += sector.customers[t] * TIERS[t].tariff * state.prices[t];
  return r * (1 - (sector.discount ?? 0));
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
  return w * s.wageMult;
}

export function buildingCount(state) {
  return ownedSectors(state).reduce((n, s) => n + s.buildings.length, 0);
}

export function upkeep(state) {
  return ownedSectors(state).length * MONEY.UPKEEP_SECTOR + buildingCount(state) * MONEY.UPKEEP_BUILDING;
}

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

export const interest = (state) => state.company.debt * MONEY.INTEREST_RATE;

// ctx: { withheld, penalties, ownKwh, capexCredit } from the other sim parts.
export function monthlyMoney(state, ctx = {}) {
  const price = wholesalePrice(state);
  const gross = projectedRevenue(state);
  const withheld = ctx.withheld ?? 0;
  const revenue = gross - withheld;
  const demand = demandKwh(state);
  const ownKwh = ctx.ownKwh ?? 0;
  const out = {
    revenue,
    gross,
    withheld,
    price,
    demandKwh: demand,
    ownKwh,
    energy: energyCost(demand, ownKwh, price),
    wages: wages(state),
    upkeep: upkeep(state),
    budget: budgetDollars(state).total,
    interest: interest(state),
    penalties: ctx.penalties ?? 0,
  };
  out.preTax = out.revenue - out.energy - out.wages - out.upkeep - out.budget - out.interest - out.penalties;
  const tax = Math.max(0, out.preTax) * MONEY.TAX_RATE;
  out.tax = Math.max(0, tax - (ctx.capexCredit ?? 0));
  out.net = out.preTax - out.tax;
  return out;
}

// ---------- Loans ----------

export const loanLimit = (state) => diff(state).loanLimit;

export function canTakeLoan(state) {
  return state.company.debt + MONEY.LOAN_STEP <= loanLimit(state);
}

export function canRepay(state) {
  return state.company.debt >= MONEY.LOAN_STEP && state.company.cash >= MONEY.LOAN_STEP;
}

export function takeLoan(state) {
  if (!canTakeLoan(state)) return false;
  state.company.debt += MONEY.LOAN_STEP;
  state.company.cash += MONEY.LOAN_STEP;
  return true;
}

export function repayLoan(state) {
  if (!canRepay(state)) return false;
  state.company.debt -= MONEY.LOAN_STEP;
  state.company.cash -= MONEY.LOAN_STEP;
  return true;
}

// When cash < 0, borrow in $50,000 steps while the limit allows. Returns the amount.
export function emergencyLoan(state) {
  let taken = 0;
  while (state.company.cash < 0 && takeLoan(state)) taken += MONEY.LOAN_STEP;
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
