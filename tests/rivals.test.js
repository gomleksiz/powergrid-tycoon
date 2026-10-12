import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { on } from '../js/core/bus.js';
import { entryScore, unservedShare, buyoutCost, moveCount, enterMonth, rivalsMonth, rivalRevenue } from '../js/sim/rivals.js';
import { emptyTiers } from '../js/sim/setup.js';
import { createRng } from '../js/core/rng.js';
import { serialize, readSave } from '../js/save/save.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const home = (s) => s.sectors.find((x) => x.owned);

function rich(seed, difficulty = 'normal') {
  const s = createState(seed, difficulty);
  s.company.cash = 1e9;
  return s;
}

test('entry score = 50 × unserved + 2 × max(0, H − 12) + 30 × (m̄ − 1) + 20 × [CS < 30]', () => {
  const s = createState(1);
  const h = home(s);                       // Town: 3,000 + 500 possible, 2,000 customers
  near(unservedShare(h), 1500 / 3500);
  h.lastH = 0;
  near(entryScore(s, h), 50 * 1500 / 3500);
  h.lastH = 30;
  s.prices.low = 1.2;
  s.meters.cs = 20;
  near(entryScore(s, h), 50 * 1500 / 3500 + 2 * 18 + 30 * 0.2 + 20);
  const free = s.sectors.find((x) => !x.owned);
  s.prices.low = 1;
  s.meters.cs = 60;
  near(entryScore(s, free), 50);
});

test('buyout cost at GS 0, 50 and 100', () => {
  const s = createState(2);
  const h = home(s);
  h.rival = { id: 'apex', strength: 40, customers: { ...emptyTiers(), low: 100 }, lowMonths: 0, H: 15 };
  const rev = 100 * 50 * 0.8;
  near(rivalRevenue(h), rev);
  s.meters.gs = 0;
  near(buyoutCost(s, h), rev * 24 * 1.5);
  s.meters.gs = 50;
  near(buyoutCost(s, h), rev * 24 * 1.0);
  s.meters.gs = 100;
  near(buyoutCost(s, h), rev * 24 * 0.5);
});

test('customers that move to the rival (section 12)', () => {
  near(moveCount(1000, 50, 0, 48, 1, 0.8), 1000 * 0.5 * 0.03 * 1 * 1.2);
  near(moveCount(1000, 50, 96, 48, 1, 0.8), 1000 * 0.5 * 0.03 * 2 * 1.2);
  near(moveCount(1000, 50, 0, 48, 0.6, 1.1), 1000 * 0.5 * 0.03 * 1 * 0.5);
});

test('on Normal, Apex enters a sector at month 55 (Hard 40, Easy 80; Volt 65 months later)', () => {
  assert.equal(enterMonth(createState(1, 'normal'), 'apex'), 55);
  assert.equal(enterMonth(createState(1, 'hard'), 'apex'), 40);
  assert.equal(enterMonth(createState(1, 'easy'), 'apex'), 80);
  assert.equal(enterMonth(createState(1, 'normal'), 'volt'), 120);
  setState(rich(3));
  const s = getState();
  const entries = [];
  const off = on('rival:enter', (e) => entries.push([e.rival, s.time.month - 1]));
  const offC = on('event:card', () => dispatch({ type: 'event/choose', payload: { choice: 0 } }));
  while (s.time.month <= 56) dispatch({ type: 'time/week' });
  off(); offC();
  assert.deepEqual(entries[0], ['apex', 55]);
});

test('Apex picks a weak owned sector over a strong one', () => {
  const s = createState(4);
  s.time.month = 55;
  for (const x of s.sectors) x.owned = true;    // no unopened sectors left
  for (const x of s.sectors) for (const t of Object.keys(x.customers)) x.customers[t] = 0;
  // fill every sector, so the unserved share is 0 …
  for (const x of s.sectors) x.customers.low = 999_999;
  const weak = s.sectors[5];
  weak.customers.low = 10;                      // … except 1 weak sector
  weak.lastH = 40;
  const events = rivalsMonth(s, createRng(1));
  const e = events.find((x) => x.type === 'rival:enter');
  assert.equal(e.payload.sector, weak.id);
});

test('strength + 3 a month, + 5 when the player is over a tier limit', () => {
  const s = createState(5);
  const h = home(s);
  h.rival = { id: 'apex', strength: 20, customers: emptyTiers(), lowMonths: 0, H: 0 };
  h.lastH = 100;                                 // over the Low limit, worse than Apex
  rivalsMonth(s, createRng(2));
  assert.equal(h.rival.strength, 28);
});

test('being better (fewer outage hours than the rival) stops the growth', () => {
  const s = createState(6);
  const h = home(s);
  h.rival = { id: 'apex', strength: 20, customers: emptyTiers(), lowMonths: 0, H: 0 };
  h.lastH = 1;                                   // Apex has 12–24 h
  rivalsMonth(s, createRng(3));
  assert.equal(h.rival.strength, 20);
});

test('local price cut: strength − 4 per 10 %; at 30 %: GS − 2 each month', () => {
  setState(rich(7));
  const s = getState();
  const h = home(s);
  h.rival = { id: 'apex', strength: 40, customers: emptyTiers(), lowMonths: 0, H: 0 };
  h.lastH = 1;
  dispatch({ type: 'sector/discount', payload: { sector: h.id, discount: 0.3 } });
  const gs = s.meters.gs;
  rivalsMonth(s, createRng(4));
  assert.equal(h.rival.strength, 28);
  assert.equal(s.meters.gs, gs - 2);
});

test('the rival leaves after 6 months under 5 %', () => {
  const s = createState(8);
  const h = home(s);
  h.rival = { id: 'volt', strength: 1, customers: emptyTiers(), lowMonths: 5, H: 0 };
  h.lastH = 0;
  const ev = rivalsMonth(s, createRng(5));
  assert.equal(h.rival, null);
  assert.ok(ev.some((e) => e.type === 'rival:leave'));
});

test('Franchise Charter protects up to 3 sectors while GS ≥ 60', () => {
  setState(rich(9));
  const s = getState();
  s.tech.nodes.R3.status = 'ACTIVE';
  const ids = s.sectors.map((x) => x.id);
  for (const id of ids.slice(0, 4)) dispatch({ type: 'rival/franchise', payload: { sector: id, on: true } });
  assert.deepEqual(s.rivalPolicy.franchise, ids.slice(0, 3));
  s.meters.gs = 70;
  s.time.month = 55;
  // make the protected sectors the only good targets
  for (const x of s.sectors) if (!ids.slice(0, 3).includes(x.id)) x.rival = { id: 'volt', strength: 50, customers: emptyTiers(), lowMonths: 0, H: 0 };
  const ev = rivalsMonth(s, createRng(6));
  assert.ok(!ev.some((e) => e.type === 'rival:enter'));
  s.meters.gs = 50;                                 // charter stops below GS 60
  s.time.month = 58;
  const ev2 = rivalsMonth(s, createRng(7));
  assert.ok(ev2.some((e) => e.type === 'rival:enter'));
});

test('Monopoly Charter: all rivals leave when GS > 75; GS − 10; no new rivals', () => {
  setState(rich(10));
  const s = getState();
  s.tech.nodes.R4.status = 'ACTIVE';
  for (const x of s.sectors.slice(0, 4)) x.rival = { id: 'apex', strength: 50, customers: emptyTiers(), lowMonths: 0, H: 0 };
  s.meters.gs = 70;
  dispatch({ type: 'rival/monopoly' });
  assert.ok(s.sectors.some((x) => x.rival));
  s.meters.gs = 80;
  dispatch({ type: 'rival/monopoly' });
  assert.ok(s.sectors.every((x) => !x.rival));
  assert.equal(s.meters.gs, 70);
  s.time.month = 58;
  assert.ok(!rivalsMonth(s, createRng(8)).some((e) => e.type === 'rival:enter'));
});

test('buyout gives the player the rival customers; actions stay after save and load', () => {
  setState(rich(11));
  const s = getState();
  const h = home(s);
  h.rival = { id: 'apex', strength: 50, customers: { ...emptyTiers(), low: 300, medium: 50 }, lowMonths: 0, H: 0 };
  s.tech.nodes.R3.status = 'ACTIVE';
  dispatch({ type: 'rival/franchise', payload: { sector: h.id, on: true } });
  dispatch({ type: 'sector/discount', payload: { sector: h.id, discount: 0.2 } });
  const low = h.customers.low;
  const cash = s.company.cash;
  dispatch({ type: 'rival/buyout', payload: { sector: h.id } });
  assert.equal(h.rival, null);
  assert.equal(h.customers.low, low + 300);
  assert.equal(h.customers.medium, 0);          // Medium is not unlocked: those customers go back to the pool
  assert.ok(s.company.cash < cash);
  const m = new Map();
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  storage.setItem('k', JSON.stringify(serialize(s)));
  const l = readSave('k', storage).state;
  assert.deepEqual(l.rivalPolicy, s.rivalPolicy);
  assert.equal(l.sectors[h.id].discount, 0.2);
});
