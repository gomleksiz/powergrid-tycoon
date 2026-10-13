// Version 1.2: a harder game. Connections, broken buildings, emergency crews, rivals and costs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { createRng } from '../js/core/rng.js';
import { updateCustomers, connectRoomKw } from '../js/sim/customers.js';
import { capacityMw, outageParts } from '../js/sim/grid.js';
import { globalEffects } from '../js/sim/effects.js';
import { budgetDollars, monthlyCosts, serviceCost, wages, upkeep, interest, loanLimit, loanStep, niceDown } from '../js/sim/economy.js';
import { budgetEffects } from '../js/sim/budgetEffects.js';
import { breakBuildings } from '../js/sim/disasters.js';
import { repairWeek, buildingRepairCost, contractorPower, stationedNow } from '../js/sim/repair.js';
import { outageAdvice } from '../js/sim/advice.js';
import { canUpgrade, canBuildIn } from '../js/sim/build.js';
import { rivalsMonth } from '../js/sim/rivals.js';
import { emptyTiers, sectorPotential } from '../js/sim/setup.js';
import { writeSlot, readSave, slotKey } from '../js/save/save.js';
import { TIERS, CONTRACTORS, BREAKDOWN } from '../js/data/balance.js';
import { BUILDINGS } from '../js/data/buildings.js';
import { RIVAL_IDS } from '../js/data/rivals.js';
import { POTENTIAL_MULT, SECTOR_TYPES, HOME } from '../js/data/sectors.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const home = (s) => s.sectors.find((x) => x.owned);

function game(seed = 1) {
  const s = createState(seed, 'normal');
  s.company.cash = 1e8;
  setState(s);
  return getState();
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

const ctx = (s) => ({ fx: globalEffects(s), budget: budgetDollars(s), cs: s.meters.cs });

test('the towns are 1.5 × bigger', () => {
  const s = createState(1);
  const h = home(s);
  assert.equal(sectorPotential(h).low, Math.round(SECTOR_TYPES.town.potential.low * HOME.potentialMult * POTENTIAL_MULT));
});

test('new customers connect only while the substations have room', () => {
  const s = game(2);
  const h = home(s);
  // Fill the 5 MW substation: 3,333 Low customers × 1.5 kW = 5 MW.
  h.customers.low = Math.floor(capacityMw(h) * 1000 / TIERS.low.peakKw);
  assert.ok(connectRoomKw(s, h) < TIERS.low.peakKw);
  s.meters.cs = 100;
  const before = h.customers.low;
  updateCustomers(s, createRng(1), ctx(s));
  assert.ok(h.customers.low <= before, 'nobody new connects');
  assert.ok(h.waiting > 0, 'they wait for a connection');
  assert.ok(outageAdvice(s, h).some((t) => t.id === 'connectFull'));
  // A second substation makes room.
  h.buildings.push({ id: 900, type: 'substation', x: 0, y: 0, status: 'active' });
  updateCustomers(s, createRng(1), ctx(s));
  assert.ok(h.customers.low > before);
});

test('a heatwave does not block new connections', () => {
  const s = game(3);
  const h = home(s);
  const room = connectRoomKw(s, h);
  s.market.peakMult = 1.25;
  near(connectRoomKw(s, h), room);
});

test('customer service is part of the monthly costs', () => {
  const s = createState(4);
  near(serviceCost(s), 2500 * TIERS.low.serviceCost);
  near(monthlyCosts(s), wages(s) + upkeep(s) + serviceCost(s) + interest(s) + budgetDollars(s).total);
});

test('a broken building gives nothing until it is repaired', () => {
  const s = game(5);
  const h = home(s);
  const sub = h.buildings[0];
  sub.broken = true;
  assert.equal(capacityMw(h), 0);
  assert.ok(outageParts(s, h).overload > 0);
  assert.equal(canUpgrade(s, sub.id).reason, 'busy');
  const tip = outageAdvice(s, h).find((t) => t.id === 'repairBuilding');
  assert.ok(tip && tip.action.type === 'building/repair');
  const cash = s.company.cash;
  dispatch({ type: 'building/repair', payload: { id: sub.id } });
  assert.equal(s.company.cash, cash - buildingRepairCost(sub));
  assert.equal(buildingRepairCost(sub), BUILDINGS.substation.cost * BREAKDOWN.REPAIR_SHARE);
  assert.equal(sub.repairWeeks, BREAKDOWN.REPAIR_WEEKS);
  dispatch({ type: 'building/repair', payload: { id: sub.id } });   // not twice
  assert.equal(s.company.cash, cash - buildingRepairCost(sub));
  for (let i = 0; i < BREAKDOWN.REPAIR_WEEKS; i++) dispatch({ type: 'time/week' });
  assert.ok(!sub.broken);
  assert.equal(capacityMw(h), 5);
});

test('disasters can break buildings; more damage, more breaks', () => {
  const s = createState(6);
  const h = home(s);
  for (let i = 0; i < 9; i++) h.buildings.push({ id: 100 + i, type: 'substation', x: 0, y: 0, status: 'active' });
  assert.deepEqual(breakBuildings(h, 0, createRng(1)), []);
  const broken = breakBuildings(h, 100, createRng(1));   // 60 % each
  assert.ok(broken.length >= 3 && broken.length <= 9, `${broken.length} broke`);
  assert.equal(h.buildings.filter((b) => b.broken).length, broken.length);
});

test('emergency crew: paid at once, repairs before the outage hours count, not slowed by a strike', () => {
  const s = game(7);
  const h = home(s);
  s.staff.technicians = 0;                       // nobody of your own repairs
  s.staff.strikeMonths = 2;
  h.damage = 30;
  assert.ok(outageAdvice(s, h).some((t) => t.id === 'contractors'));
  const cash = s.company.cash;
  dispatch({ type: 'sector/contractors', payload: { sector: h.id } });
  assert.equal(s.company.cash, cash - CONTRACTORS.COST);
  assert.equal(h.contractors, CONTRACTORS.WEEKS);
  dispatch({ type: 'sector/contractors', payload: { sector: h.id } });   // not twice
  assert.equal(s.company.cash, cash - CONTRACTORS.COST);
  h.dmgHours = 0;
  repairWeek(s);
  near(h.damage, 30 - contractorPower());
  near(h.dmgHours, 168 * (30 - contractorPower()) / 100);
  repairWeek(s);
  assert.equal(h.contractors, 0);
  const left = h.damage;
  repairWeek(s);
  near(h.damage, left);                          // gone after 2 weeks
});

test('no emergency crew without damage', () => {
  const s = game(8);
  const h = home(s);
  dispatch({ type: 'sector/contractors', payload: { sector: h.id } });
  assert.equal(h.contractors, 0);
});

test('3 rivals; an old save with 2 rivals still works', () => {
  const s = createState(9);
  assert.deepEqual(s.rivals.map((r) => r.id), RIVAL_IDS);
  assert.ok(RIVAL_IDS.includes('nova'));
  s.rivals = s.rivals.filter((r) => r.id !== 'nova');
  s.time.month = 80;                              // Nova's start month on Normal
  for (const x of s.sectors) x.rival = null;
  const ev = rivalsMonth(s, createRng(2));
  assert.ok(ev.some((e) => e.type === 'rival:enter' && e.payload.rival === 'nova'));
});

test('the new fields survive a save and load', () => {
  const s = game(10);
  const h = home(s);
  h.buildings[0].broken = true;
  h.buildings[0].repairWeeks = 1;
  h.contractors = 2;
  h.waiting = 40;
  h.noRivalUntil = 50;
  h.rival = { id: 'nova', strength: 30, customers: emptyTiers(), lowMonths: 0, H: 0, drive: 3, price: 0.95, war: false };
  const store = memoryStorage();
  writeSlot(1, s, {}, store);
  const back = readSave(slotKey(1), store).state;
  const hb = back.sectors[h.id];
  assert.equal(hb.buildings[0].broken, true);
  assert.equal(hb.contractors, 2);
  assert.equal(hb.waiting, 40);
  assert.equal(hb.noRivalUntil, 50);
  assert.equal(hb.rival.drive, 3);
});

// ---------- version 1.2, part 2: board, building from the panel, local crews, budget effects, loans ----------

test('build in a sector without picking a tile', () => {
  const s = game(11);
  const h = home(s);
  const n = h.buildings.length;
  const cash = s.company.cash;
  dispatch({ type: 'build/sector', payload: { type: 'substation', sector: h.id } });
  assert.equal(h.buildings.length, n + 1);
  assert.equal(s.company.cash, cash - BUILDINGS.substation.cost);
  const other = s.sectors.find((x) => !x.owned);
  dispatch({ type: 'build/sector', payload: { type: 'substation', sector: other.id } });
  assert.equal(other.buildings.length, 0);
  // Fill the sector: at some point there is no free tile left.
  let guard = 0;
  while (canBuildIn(s, 'substation', h.id).ok && guard++ < 500) dispatch({ type: 'build/sector', payload: { type: 'substation', sector: h.id } });
  assert.equal(canBuildIn(s, 'substation', h.id).reason, 'full');
});

test('the bank lends more to a bigger company, in bigger steps', () => {
  const s = createState(12, 'normal');
  assert.equal(loanLimit(s), 300_000);
  assert.equal(loanStep(s), 50_000);
  s.company.lastRevenue = 8_000_000;                  // 2 months = $16M → $10M (rounded to 1, 2, 5 × 10ⁿ)
  assert.equal(loanLimit(s), 10_000_000);
  assert.equal(loanStep(s), 1_000_000);
  setState(s);
  dispatch({ type: 'loan/take' });
  assert.equal(s.company.debt, 1_000_000);
  s.company.debt = 300_000;                           // repay what is left, not more
  dispatch({ type: 'loan/repay' });
  assert.equal(s.company.debt, 0);
  assert.equal(niceDown(7_300), 5_000);
  assert.equal(niceDown(23_000), 20_000);
});

test('stationed technicians repair their sector first, before the outage hours count', () => {
  const s = game(13);
  const [a, b] = [home(s), s.sectors.find((x) => !x.owned)];
  b.owned = true;
  s.staff.technicians = 4;
  a.damage = 30;
  b.damage = 30;
  a.priority = 'high';                                // without stationing, all 4 would repair a
  dispatch({ type: 'sector/assign', payload: { sector: b.id, count: 2 } });
  assert.equal(b.assigned, 2);
  dispatch({ type: 'sector/assign', payload: { sector: a.id, count: 99 } });
  assert.equal(a.assigned, 2, 'at most all technicians');
  a.assigned = 0;
  assert.deepEqual(stationedNow(s)[b.id], 2);
  b.dmgHours = 0;
  repairWeek(s);
  assert.ok(b.damage < 30, 'b was repaired');
  assert.ok(b.dmgHours < 168 * 30 / 100, 'before the hours counted');
  // A broken building in a sector with a local crew is repaired in 1 week.
  b.buildings.push({ id: 950, type: 'substation', x: 0, y: 0, status: 'active', broken: true });
  dispatch({ type: 'building/repair', payload: { id: 950 } });
  assert.equal(b.buildings.at(-1).repairWeeks, 1);
});

test('budget effects: each part shows its effect and the money above its top', () => {
  const s = createState(14);
  let fx = budgetEffects(s);
  assert.ok(fx.marketing.fromBudget > 0);
  assert.equal(fx.marketing.newPerMonth > fx.marketing.fromBudget, true);
  near(fx.pr.cs, Math.min(10, budgetDollars(s).pr / 5_000));
  assert.equal(fx.wasted, 0);
  s.company.lastRevenue = 10_000_000;                 // a big company: R&D, PR and lobbying go over the top
  s.history.revenue.push(10_000_000);
  fx = budgetEffects(s);
  assert.ok(fx.rd.over > 0 && fx.pr.over > 0 && fx.lobbying.over > 0);
  near(fx.rd.over, budgetDollars(s).rd - 11_250);
  assert.ok(fx.wasted >= fx.rd.over + fx.pr.over + fx.lobbying.over);
});

test('the board history grows each month, also for each sector', () => {
  const s = game(15);
  for (let i = 0; i < 8; i++) dispatch({ type: 'time/week' });
  for (const k of ['costs', 'peak', 'ownPeak', 'capacity', 'demandKwh', 'ownKwh', 'wholesale', 'rivals']) assert.equal(s.history[k].length, 2, k);
  const h = home(s);
  assert.equal(h.hist.c.length, 2);
  assert.equal(h.hist.c.at(-1), h.customers.low + h.customers.medium + h.customers.high + h.customers.corporate);
  assert.equal(s.sectors.find((x) => !x.owned).hist.c.at(-1), 0);
});
