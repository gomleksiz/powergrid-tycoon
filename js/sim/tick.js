// Weekly and monthly simulation steps. No DOM, no Math.random().
// Each function changes the state and returns a list of events.

import { TIME } from '../data/balance.js';
import { monthlyMoney, budgetDollars, stepWalk, emergencyLoan, totalCustomers } from './economy.js';
import { updateCustomers } from './customers.js';
import { globalEffects } from './effects.js';
import { calculateGrid, updateHealth, randomFailures, ownEnergy, averageOutage } from './grid.js';
import { repairWeek } from './repair.js';
import { researchWeek } from './research.js';
import { deployWeek } from './deployment.js';
import { staffArrive, monthStaff } from './staffing.js';
import { updateMeters } from './satisfaction.js';
import { marketShare } from './economy.js';
import { withheldHigh, corporateContracts, checkPhase } from './growth.js';
import { updateProsumers } from './prosumers.js';
import { disasterWeek, rollDisasters, monthDisasters } from './disasters.js';
import { rollEventCard } from './eventCards.js';
import { tickMods } from './market.js';
import { rivalsMonth } from './rivals.js';
import { checkEnd } from './victory.js';
import { DISASTER } from '../data/disasters.js';

export function weekTick(state, rng) {
  const events = [{ type: 'week:end', payload: { ...state.time } }];
  events.push(...staffArrive(state));
  events.push(...disasterWeek(state));
  for (const id of researchWeek(state)) events.push({ type: 'project:done', payload: { kind: 'research', node: id } });
  for (const p of deployWeek(state)) events.push({ type: 'project:done', payload: { kind: p.kind, node: p.node, type: p.type, sector: p.sector } });
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

  // Corporate contracts can end after outages; the company pays a penalty.
  const corp = corporateContracts(state, rng);
  for (const c of corp.sectors) events.push({ type: 'news', payload: { key: 'contractLost', sector: c.name, count: c.lost, kind: 'error' } });

  // 1. Collect money (fines from last month's audit are paid now)
  const own = ownEnergy(state);
  const penalties = (state.govt.finesDue ?? 0) + corp.penalty;
  const money = monthlyMoney(state, {
    capexCredit: state.company.capexThisMonth * fx.capexTaxCredit,
    ownKwh: own.kwh,
    penalties,
    withheld: withheldHigh(state),
  });
  state.govt.finesDue = 0;
  state.company.cash += money.net;
  state.company.lastRevenue = money.revenue;
  state.company.lastNet = money.net;

  // Customers come and go
  const customers = updateCustomers(state, rng, { fx, budget, cs: state.meters.cs });
  customers.lost += corp.lost;
  customers.prosumersJoined = updateProsumers(state, rng, budget.marketing, fx);

  // Lines get older; Maintenance makes them better. Weak lines can break.
  updateHealth(state, budget.maintenance);
  for (const s of randomFailures(state, rng)) {
    events.push({ type: 'news', payload: { key: 'lineFailure', sector: s.name, kind: 'warn' } });
  }
  monthStaff(state);

  // 5. Update the meters
  const meters = updateMeters(state, rng);
  events.push(...meters.events);
  state.govt.finesDue = meters.fine;

  // 6. Outside events: disasters for 2 months later, event cards
  tickMods(state);
  events.push(...rivalsMonth(state, rng));
  monthDisasters(state);
  rollDisasters(state, rng, month + DISASTER.SCHEDULE_AHEAD);
  events.push(...rollEventCard(state, rng));
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
    meters: { before: meters.before, after: meters.after, reasons: meters.reasons },
  };
  pushHistory(state, money);

  state.report.otherCosts = state.company.otherCostsThisMonth;
  state.report.capex = state.company.capexThisMonth;
  state.company.capexThisMonth = 0;
  state.company.otherCostsThisMonth = 0;
  const end = checkEnd(state, month);
  state.time.month += 1;
  events.push({ type: 'month:end', payload: { month, report: state.report } });
  events.push(...end);
  if (!end.length) events.push(...checkPhase(state));
  return events;
}

function pushHistory(state, money) {
  const h = state.history;
  h.cash.push(Math.round(state.company.cash));
  h.customers.push(totalCustomers(state));
  h.revenue.push(Math.round(money.revenue));
  h.net.push(Math.round(money.net));
  h.outage.push(+averageOutage(state).toFixed(2));
  h.cs.push(Math.round(state.meters.cs * 10) / 10);
  h.es.push(Math.round(state.meters.es * 10) / 10);
  h.gs.push(Math.round(state.meters.gs * 10) / 10);
  h.share.push(+marketShare(state).toFixed(4));
}

export function isGameOver(state) {
  return !!state.goals.ended || state.time.month > TIME.END_MONTH;
}
