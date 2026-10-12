// Weekly and monthly simulation steps. No DOM, no Math.random().
// Each function changes the state and returns a list of events.

import { TIME } from '../data/balance.js';
import { monthlyMoney, budgetDollars, stepWalk, emergencyLoan, totalCustomers } from './economy.js';
import { updateCustomers } from './customers.js';
import { globalEffects } from './effects.js';
import { calculateGrid, updateHealth, randomFailures, ownEnergy, averageOutage } from './grid.js';
import { repairWeek } from './repair.js';

export function weekTick(state, rng) {
  const events = [{ type: 'week:end', payload: { ...state.time } }];
  events.push(...advanceConstruction(state));
  repairWeek(state);
  state.time.week += 1;
  if (state.time.week > TIME.WEEKS_PER_MONTH) {
    state.time.week = 1;
    events.push(...monthTick(state, rng));
  }
  return events;
}

// The month steps in the order of design section 2.
export function monthTick(state, rng) {
  const events = [];
  const month = state.time.month;
  const fx = globalEffects(state);
  const budget = budgetDollars(state);
  const start = { cash: state.company.cash, customers: totalCustomers(state), meters: { ...state.meters } };

  // 4. Calculate the grid: outage hours of this month (used by money and customers)
  const grid = calculateGrid(state);

  // 1. Collect money
  const own = ownEnergy(state);
  const money = monthlyMoney(state, { capexCredit: state.company.capexThisMonth * fx.capexTaxCredit, ownKwh: own.kwh });
  state.company.cash += money.net;
  state.company.lastRevenue = money.revenue;
  state.company.lastNet = money.net;

  // Customers come and go
  const customers = updateCustomers(state, rng, { fx, budget, cs: state.meters.cs });

  // Lines get older; Maintenance makes them better. Weak lines can break.
  updateHealth(state, budget.maintenance);
  for (const s of randomFailures(state, rng)) {
    events.push({ type: 'news', payload: { key: 'lineFailure', sector: s.name, kind: 'warn' } });
  }
  for (const s of state.sectors) s.dmgHours = 0;

  // Wholesale price for next month
  stepWalk(state, rng);

  // Emergency loan when cash < $0
  const loan = emergencyLoan(state);
  if (loan > 0) events.push({ type: 'news', payload: { key: 'emergencyLoan', amount: loan, kind: 'warn' } });

  // 7. Report and history
  state.report = {
    month,
    money,
    budget,
    customers: { start: start.customers, end: totalCustomers(state), ...customers },
    cash: { start: start.cash, end: state.company.cash },
    loan,
    grid: { avgH: averageOutage(state), peak: grid.totalPeak, gap: grid.gap },
  };
  pushHistory(state, money);

  state.company.capexThisMonth = 0;
  state.time.month += 1;
  events.push({ type: 'month:end', payload: { month, report: state.report } });
  return events;
}

function pushHistory(state, money) {
  const h = state.history;
  h.cash.push(Math.round(state.company.cash));
  h.customers.push(totalCustomers(state));
  h.revenue.push(Math.round(money.revenue));
  h.net.push(Math.round(money.net));
  h.outage.push(+averageOutage(state).toFixed(2));
}

// Buildings with a build time (fission, fusion) count down each week.
function advanceConstruction(state) {
  const events = [];
  for (const s of state.sectors) {
    for (const b of s.buildings) {
      if (b.status !== 'construction') continue;
      b.weeksLeft -= 1;
      if (b.weeksLeft <= 0) {
        b.status = 'active';
        delete b.weeksLeft;
        events.push({ type: 'news', payload: { key: 'buildDone', building: b.type, sector: s.name } });
      }
    }
  }
  return events;
}

export function isGameOver(state) {
  return state.time.month > TIME.END_MONTH;
}
