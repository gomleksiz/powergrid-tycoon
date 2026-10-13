import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { monthlyMoney, wholesalePrice, energyCost, emergencyLoan, upkeep } from '../js/sim/economy.js';
import { churnRate, fMarketing, fPrice, fCS, newCustomers } from '../js/sim/customers.js';
import { setSplit, splitSum } from '../js/sim/budget.js';
import { BUDGET, TIERS, CUSTOMERS } from '../js/data/balance.js';
import { createRng } from '../js/core/rng.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

// Version 1.2: 2,500 customers, 1 substation, customer service $3 each (section 9 had + $4,000).
test('month 1 on Normal = + $7,000 before tax', () => {
  const m = monthlyMoney(createState(1, 'normal'));
  near(m.revenue, 125_000);
  near(m.energy, 50_000);
  near(m.wages, 33_000);
  near(m.upkeep, 2_500);
  near(m.service, 7_500);
  near(m.budget, 25_000);
  near(m.interest, 0);
  near(m.preTax, 7_000);
  near(m.tax, 1_400);
  near(m.net, 5_600);
});

test('the month 1 check holds for many seeds', () => {
  for (let seed = 1; seed < 40; seed++) near(monthlyMoney(createState(seed, 'normal')).preTax, 7_000);
});

test('difficulty start values', () => {
  assert.equal(createState(1, 'easy').company.cash, 250_000);
  assert.equal(createState(1, 'hard').company.cash, 150_000);
  near(wholesalePrice(createState(1, 'hard')), 0.052);
});

test('customer service costs $ per customer of each tier (version 1.2)', () => {
  const s = createState(1, 'normal');
  const home = s.sectors.find((x) => x.owned);
  home.customers = { low: 1000, medium: 100, high: 10, corporate: 1 };
  near(monthlyMoney(s).service, 1000 * TIERS.low.serviceCost + 100 * TIERS.medium.serviceCost + 10 * TIERS.high.serviceCost + TIERS.corporate.serviceCost);
});

test('wholesale price: summer is × 1.25 of the base, winter × 1.15', () => {
  const s = createState(1, 'normal');
  const base = 0.05 / 1.15;
  near(wholesalePrice(s, 7), base * 1.25);  // July
  near(wholesalePrice(s, 4), base);         // April
  near(wholesalePrice(s, 12), base * 1.15); // December
});

test('extra own power sells back at 50 %', () => {
  near(energyCost(1000, 0, 0.1), 100);
  near(energyCost(1000, 1500, 0.1), -25);
});

test('upkeep = $2,000 per sector + $500 per building', () => {
  const s = createState(3, 'normal');
  s.sectors.find((x) => !x.owned).owned = true;
  near(upkeep(s), 2 * 2_000 + 1 * 500);   // Home Valley has 1 substation (version 1.2)
});

test('budget sliders always add up to 100 %', () => {
  const rng = createRng(7);
  let split = { ...BUDGET.START_SPLIT };
  let locks = Object.fromEntries(BUDGET.KEYS.map((k) => [k, false]));
  for (let i = 0; i < 2000; i++) {
    if (rng.chance(0.1)) locks = { ...locks, [BUDGET.KEYS[rng.int(0, 4)]]: rng.chance(0.4) };
    const key = BUDGET.KEYS[rng.int(0, 4)];
    const before = locks[key] ? split[key] : null;
    split = setSplit(split, locks, key, rng.int(-20, 120));
    assert.equal(splitSum(split), 100);
    for (const k of BUDGET.KEYS) assert.ok(split[k] >= 0 && Number.isInteger(split[k]));
    if (before !== null) assert.equal(split[key], before);
  }
});

test('locked sliders do not change', () => {
  const locks = { marketing: true, rd: false, maintenance: false, lobbying: true, pr: false };
  const s = setSplit({ ...BUDGET.START_SPLIT }, locks, 'rd', 50);
  assert.equal(s.marketing, 20);
  assert.equal(s.lobbying, 20);
  assert.equal(s.rd, 50);
  assert.equal(s.maintenance + s.pr, 10);
});

test('a slider cannot take more than the free part', () => {
  const locks = { marketing: true, rd: false, maintenance: true, lobbying: true, pr: false };
  const s = setSplit({ ...BUDGET.START_SPLIT }, locks, 'rd', 90);
  assert.equal(s.rd, 40);
  assert.equal(s.pr, 0);
});

test('churn formula (section 6)', () => {
  near(churnRate('low', { H: 0, m: 1, cs: 60 }), 0.005);
  // H = 96 is 2 × the Low limit: + 2 % × 1
  near(churnRate('low', { H: 96, m: 1, cs: 60 }), 0.025);
  // Price 1.5×: + 10 % × 0.5 (version 1.2: 4 % → 10 %)
  near(churnRate('medium', { H: 0, m: 1.5, cs: 60 }), TIERS.medium.baseChurn + 0.05);
  // CS < 30: × 1.5
  near(churnRate('high', { H: 0, m: 1, cs: 20 }), 0.0225);
  // Maximum 25 %
  near(churnRate('high', { H: 720, m: 1.5, cs: 10 }), 0.25);
});

test('new customer factors', () => {
  near(fMarketing(4_000), 0.7);
  near(fMarketing(100_000), 2.0);
  near(fMarketing(4_000, 1), 0.77);
  // Version 1.2: F price = 1 − 2.5 × (m − 1), in [0, 2]
  near(fPrice(1), 1);
  near(fPrice(0.6), 2);
  near(fPrice(0.8), 1.5);
  near(fPrice(1.2), 0.5);
  near(fPrice(1.5), 0);
  near(fCS(60), 1.1);
  near(fCS(80), 1.4);
  near(newCustomers({ potential: 3000, n: 2000, rival: 0, fM: 1, fP: 1, fC: 1 }), 1000 * CUSTOMERS.NEW_RATE);
});

test('more marketing brings more customers; a higher price brings more churn', () => {
  const run = (setup) => {
    setState(createState(11, 'normal'));
    setup();
    for (let i = 0; i < 4 * 12; i++) dispatch({ type: 'time/week' });
    return getState().history.customers.at(-1);
  };
  const base = run(() => {});
  const ads = run(() => dispatch({ type: 'budget/split', payload: { key: 'marketing', value: 80 } }));
  const pricey = run(() => dispatch({ type: 'price/set', payload: { tier: 'low', value: 1.5 } }));
  assert.ok(ads > base, `ads ${ads} > base ${base}`);
  assert.ok(pricey < base, `pricey ${pricey} < base ${base}`);
});

// Close to break-even: about + $15,000 a month on ~$110,000 of revenue (balance step 13).
test('with the start sliders the company is close to break-even for 24 months', () => {
  setState(createState(5, 'normal'));
  for (let i = 0; i < 4 * 24; i++) dispatch({ type: 'time/week' });
  const s = getState();
  assert.equal(s.history.net.length, 24);
  const cash = s.company.cash - s.company.debt;
  assert.ok(cash > 50_000 && cash < 700_000, `cash − debt = ${cash}`);
});

test('loans: steps of $50,000 up to the limit; interest 1 % a month', () => {
  setState(createState(1, 'hard'));
  for (let i = 0; i < 6; i++) dispatch({ type: 'loan/take' });
  assert.equal(getState().company.debt, 250_000);
  near(monthlyMoney(getState()).interest, 2_500);
  dispatch({ type: 'loan/repay' });
  assert.equal(getState().company.debt, 200_000);
});

test('emergency loan when cash < $0', () => {
  const s = createState(1, 'normal');
  s.company.cash = -70_000;
  assert.equal(emergencyLoan(s), 100_000);
  assert.equal(s.company.cash, 30_000);
  s.company.cash = -1_000_000;
  emergencyLoan(s);
  assert.equal(s.company.debt, 300_000);
  assert.ok(s.company.cash < 0);
});
