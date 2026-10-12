import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { csTarget, esTarget, gsTarget, moveMeter, energyMix, averagePrice, updateMeters, topReason } from '../js/sim/satisfaction.js';
import { DIFFICULTY } from '../js/data/difficulty.js';
import { createRng } from '../js/core/rng.js';
import { fCS, churnRate } from '../js/sim/customers.js';
import { fES } from '../js/sim/workforce.js';
import { capexCost } from '../js/sim/economy.js';
import { buildAllowed } from '../js/sim/build.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const part = (t, key) => t.parts.find((p) => p.key === key).value;
const home = (s) => s.sectors.find((x) => x.owned);

test('CS target: 60 − 40(m̄ − 1) − min(30, 1.5 H̄) + 10c − 10k + B', () => {
  const s = createState(1);
  s.budget.split = { marketing: 25, rd: 25, maintenance: 25, lobbying: 25, pr: 0 };
  home(s).lastH = 4;
  s.prices.low = 1.2;
  const t = csTarget(s);
  near(part(t, 'price'), -8);
  near(part(t, 'outage'), -6);
  near(part(t, 'clean'), 0);
  near(part(t, 'coal'), -6);
  near(part(t, 'pr'), 0);
  near(t.target, 60 - 8 - 6 - 6);
  home(s).lastH = 100;
  near(part(csTarget(s), 'outage'), -30);
});

test('CS bonuses: PR budget ÷ $5,000 (max 10), Community Outreach + 3, Prosumer Program + 5', () => {
  const s = createState(1);
  s.company.lastRevenue = 1_000_000;
  s.history.revenue.push(1);
  s.budget.totalPct = 60;
  s.budget.split = { marketing: 0, rd: 0, maintenance: 0, lobbying: 0, pr: 100 };
  near(part(csTarget(s), 'pr'), 10);
  s.tech.nodes.P7.status = 'ACTIVE';
  near(part(csTarget(s), 'tech'), 3);
  home(s).tech.P5 = 'ACTIVE';
  near(part(csTarget(s), 'tech'), 8);
});

test('ES target: 65 + 30(w − 1) − min(30, 10 crunch) − 20 o + B', () => {
  const s = createState(1);
  near(esTarget(s).target, 65);
  s.staff.wageMult = 1.2;
  near(part(esTarget(s), 'wage'), 6);
  s.staff.crunch = [3, 2, 1, 1];
  near(part(esTarget(s), 'crunch'), -30);
  home(s).damage = 100;
  s.staff.technicians = 4;            // 6 points a week → 16.7 weeks of backlog → o = 1
  near(part(esTarget(s), 'overload'), -20);
  s.tech.nodes.O2.status = 'ACTIVE';
  near(part(esTarget(s), 'tech'), 5);
});

test('GS target: 50 + 25c − 20k + U + L − A + B', () => {
  const s = createState(1);
  s.budget.split = { marketing: 25, rd: 25, maintenance: 25, lobbying: 25, pr: 0 };
  home(s).lastH = 1;
  const t = gsTarget(s);
  near(part(t, 'coal'), -12);
  near(part(t, 'uptime'), 10);
  near(part(t, 'lobbying'), (5_000 / 5_000) * 1.15);
  home(s).lastH = 20;
  near(part(gsTarget(s), 'uptime'), -20);
  s.tech.nodes.R2.status = 'ACTIVE';
  near(part(gsTarget(s), 'coal'), -6);   // coal drag − 50 %
  near(part(gsTarget(s), 'tech'), 5);
});

test('own clean plants raise c and lower k', () => {
  const s = createState(1);
  home(s).buildings.push({ id: 90, type: 'fission', x: 0, y: 0, status: 'active' });
  const mix = energyMix(s);
  assert.equal(mix.c, 1);
  assert.equal(mix.k, 0);
});

test('m̄ is weighted by customers and lowered by a local price cut', () => {
  const s = createState(1);
  s.prices.low = 1.2;
  near(averagePrice(s), 1.2);
  home(s).discount = 0.1;
  near(averagePrice(s), 1.08);
});

test('move formula: r up and r down by difficulty', () => {
  near(moveMeter(50, 70, DIFFICULTY.normal), 54);
  near(moveMeter(50, 30, DIFFICULTY.normal), 46);
  near(moveMeter(50, 70, DIFFICULTY.easy), 55);
  near(moveMeter(50, 30, DIFFICULTY.easy), 48);
  near(moveMeter(50, 70, DIFFICULTY.hard), 53);
  near(moveMeter(50, 30, DIFFICULTY.hard), 44);
});

test('limits 30 and 75', () => {
  assert.equal(churnRate('low', { cs: 29 }), 0.005 * 1.5);
  assert.equal(churnRate('low', { cs: 30 }), 0.005);
  near(fCS(76), 0.5 + 0.76 + 0.1);
  near(fCS(75), 1.25);
  assert.equal(fES(29.9), 0.75);
  assert.equal(fES(75.1), 1.2);
  const s = createState(1);
  s.meters.gs = 76;
  assert.equal(capexCost(s, 100_000), 85_000);
  s.meters.gs = 75;
  assert.equal(capexCost(s, 100_000), 100_000);
});

test('GS < 30: price max 1.1×, audit fine, no fission permit', () => {
  setState(createState(2));
  const s = getState();
  s.prices.low = 1.4;
  s.meters.gs = 10;
  const res = updateMeters(s, createRng(1));
  assert.ok(s.prices.low <= 1.1);
  assert.ok(res.fine >= 50_000 && res.fine <= 250_000);
  assert.equal(s.govt.auditCooldown, 6);
  dispatch({ type: 'price/set', payload: { tier: 'low', value: 1.5 } });
  assert.equal(s.prices.low, 1.1);
  s.tech.nodes.G4.status = 'UNLOCKED';
  s.company.cash = 1e7;
  assert.equal(buildAllowed(s, 'fission').reason, 'permit');
});

test('ES < 30: strikes happen (50 % a month)', () => {
  let strikes = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = createState(seed);
    s.meters.es = 10;
    updateMeters(s, createRng(seed));
    if (s.staff.strikeMonths > 0) strikes++;
  }
  assert.ok(strikes > 70 && strikes < 130, `strikes ${strikes}`);
});

test('a price rise makes CS go down slowly, not at once', () => {
  setState(createState(3));
  const s = getState();
  const start = s.meters.cs;
  dispatch({ type: 'price/set', payload: { tier: 'low', value: 1.5 } });
  assert.equal(s.meters.cs, start);
  for (let i = 0; i < 4; i++) dispatch({ type: 'time/week' });
  const m1 = s.meters.cs;
  for (let i = 0; i < 4 * 5; i++) dispatch({ type: 'time/week' });
  const m6 = s.meters.cs;
  assert.ok(m1 < start && m1 > start - 10, `month 1: ${m1}`);
  assert.ok(m6 < m1, `month 6: ${m6}`);
  assert.equal(s.report.meters.reasons.cs, 'price');
});

test('top reason: the biggest part in the direction of the change', () => {
  const parts = [{ key: 'base', value: 60 }, { key: 'price', value: -8 }, { key: 'outage', value: -3 }, { key: 'pr', value: 2 }];
  assert.equal(topReason(parts, -1), 'price');
  assert.equal(topReason(parts, 1), 'pr');
});
