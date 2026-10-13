import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { outageParts, capacityMw, peakMw, calculateGrid, updateHealth, sectorStatus, ownPeakMw } from '../js/sim/grid.js';
import { repairPower, repairWeek, repairOrder, backlogWeeks } from '../js/sim/repair.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const home = (s) => s.sectors.find((x) => x.owned);

test('capacity from substations, peak from customers', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  assert.equal(capacityMw(h), 5);                 // version 1.2: 1 substation
  near(peakMw(s, h), 2500 * 1.5 / 1000);          // version 1.2: 2,500 customers, 1.5 kW each
});

test('H wear = (100 − Health) ÷ 100 × 20 × f line', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  h.health = 80;
  near(outageParts(s, h).wear, 4);
  h.health = 0;
  near(outageParts(s, h).wear, 20);
  h.tech.D2 = 'ACTIVE';                // Storm Poles: f line 0.7
  near(outageParts(s, h).wear, 14);
});

test('H overload = 120 × (Peak − Capacity) ÷ Peak', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  h.health = 100;
  h.buildings = [h.buildings[0]];       // 5 MW
  h.customers.low = 5000;               // 7.5 MW peak (1.5 kW each)
  near(outageParts(s, h).overload, 120 * (7.5 - 5) / 7.5);
});

test('H damage = sum of 168 × Damage ÷ 100 each week', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  s.staff.technicians = 0;              // nobody repairs
  h.damage = 50;
  for (let i = 0; i < 4; i++) repairWeek(s);
  near(h.dmgHours, 4 * 84);
});

test('H shortage = 120 × gap ÷ peak (heatwave or supply crunch)', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  h.health = 100;
  s.market.supplyShare = 0.85;          // the wholesaler gives 85 %
  const g = calculateGrid(s);
  near(g.gap, g.totalPeak * 0.15);
  near(h.lastParts.shortage, 120 * 0.15);
  // own plants at the peak fill the gap
  h.buildings.push({ id: 99, type: 'battery', x: 0, y: 0, status: 'active' });
  assert.equal(ownPeakMw(s), 2);
  calculateGrid(s);
  near(h.lastParts.shortage, 0);
});

test('R: tech cuts outage hours, but not below 0.5', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  h.health = 50;                        // wear 10
  h.tech.P6 = 'ACTIVE';                 // − 10 %
  near(outageParts(s, h).H, 9);
  s.tech.nodes.O4.status = 'ACTIVE';    // − 20 % more
  near(outageParts(s, h).H, 7);
});

test('H is never more than 720', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  h.health = 0;
  h.dmgHours = 5000;
  near(outageParts(s, h).H, 720);
});

test('repair: 1.5 points per technician per week', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  h.damage = 30;
  near(repairPower(s), 4 * 1.5);
  repairWeek(s);
  near(h.damage, 24);
  s.tech.nodes.O2.status = 'ACTIVE';    // Field Crew Training + 25 %
  near(repairPower(s), 4 * 1.5 * 1.25);
  s.staff.strikeMonths = 1;
  near(repairPower(s), 4 * 1.5 * 1.25 * 0.5);
});

test('repair goes High → Normal → Low', () => {
  const s = createState(1, 'normal');
  const [a, b, c] = s.sectors.filter((x) => !x.owned).slice(0, 3);
  for (const x of [a, b, c]) { x.owned = true; x.damage = 10; }
  a.priority = 'low';
  b.priority = 'high';
  c.damage = 20;
  assert.deepEqual(repairOrder(s).map((x) => x.id), [b.id, c.id, a.id]);
  assert.ok(backlogWeeks(s) > 0);
});

test('health: − d + Maintenance ÷ $2,500', () => {
  const s = createState(1, 'normal');
  const h = home(s);
  updateHealth(s, 4_000);
  near(h.health, 80 - 2 + 1.6);
});

test('a sector with low health turns yellow, then red', () => {
  setState(createState(3, 'normal'));
  const s = getState();
  const h = home(s);
  h.health = 100;
  calculateGrid(s);
  assert.equal(sectorStatus(h), 'ok');
  s.tech.nodes.P2.status = 'ACTIVE';
  h.customers.medium = 100;             // Medium limit: 12 h
  h.health = 30;                        // wear 14 h
  calculateGrid(s);
  assert.equal(sectorStatus(h), 'warn');
  dispatch({ type: 'debug/damage', payload: { sector: h.id, amount: 60 } });
  s.staff.technicians = 0;
  for (let i = 0; i < 4; i++) dispatch({ type: 'time/week' });
  assert.equal(sectorStatus(h), 'bad');
});

test('long outages make customers leave', () => {
  const run = (damage) => {
    setState(createState(4, 'normal'));
    const s = getState();
    s.staff.technicians = 0;
    home(s).damage = damage;
    for (let i = 0; i < 4 * 3; i++) dispatch({ type: 'time/week' });
    return s.history.customers.at(-1);
  };
  assert.ok(run(90) < run(0) - 100);
});
