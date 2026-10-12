import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { phaseOf } from '../js/data/phases.js';
import { canOpenSector, openSector, withheldHigh, corporateContracts, currentPhase } from '../js/sim/growth.js';
import { updateProsumers } from '../js/sim/prosumers.js';
import { neighbors } from '../js/sim/mapgen.js';
import { marketShare, totalPotential } from '../js/sim/economy.js';
import { potentialTotal } from '../js/sim/setup.js';
import { CUSTOMERS } from '../js/data/balance.js';
import { globalEffects } from '../js/sim/effects.js';
import { createRng } from '../js/core/rng.js';
import { on } from '../js/core/bus.js';

const home = (s) => s.sectors.find((x) => x.owned);

test('phases start at months 1, 41, 101, 181', () => {
  assert.equal(phaseOf(1).id, 1);
  assert.equal(phaseOf(40).id, 1);
  assert.equal(phaseOf(41).id, 2);
  assert.equal(phaseOf(100).id, 2);
  assert.equal(phaseOf(101).id, 3);
  assert.equal(phaseOf(181).id, 4);
  assert.equal(phaseOf(240).id, 4);
});

test('phase 2 starts at month 41 (event)', () => {
  setState(createState(1));
  const s = getState();
  s.company.cash = 1e8;             // stay solvent for 40 months
  const seen = [];
  const off = on('phase:start', ({ phase }) => seen.push([phase, s.time.month]));
  while (s.time.month < 42) dispatch({ type: 'time/week' });
  off();
  assert.deepEqual(seen, [[2, 41]]);
});

test('sector rules: phase, neighbor, limit of 6 in phase 2, cost', () => {
  const s = createState(2);
  s.company.cash = 1e7;
  const h = home(s);
  const n = neighbors(h.id)[0];
  assert.equal(canOpenSector(s, n).reason, 'phase');
  s.time.month = 41;
  const far = s.sectors.find((x) => !x.owned && !neighbors(h.id).includes(x.id) && !neighbors(x.id).some((y) => s.sectors[y].owned));
  assert.equal(canOpenSector(s, far.id).reason, 'adjacent');
  const cash = s.company.cash;
  assert.equal(openSector(s, n), true);
  assert.equal(s.company.cash, cash - 50_000);
  assert.equal(s.sectors[n].buildings.length, 1);   // a starter substation
  // open 4 more (6 in all), then the 7th is refused
  for (let i = 0; i < 4; i++) {
    const next = s.sectors.find((x) => !x.owned && canOpenSector(s, x.id).ok);
    assert.ok(next, `sector ${i + 2}`);
    openSector(s, next.id);
  }
  assert.equal(s.sectors.filter((x) => x.owned).length, 6);
  const seventh = s.sectors.find((x) => !x.owned && neighbors(x.id).some((y) => s.sectors[y].owned));
  assert.equal(canOpenSector(s, seventh.id).reason, 'limit');
  s.time.month = 101;
  assert.equal(currentPhase(s).id, 3);
  assert.equal(canOpenSector(s, seventh.id).ok, true);
  const before = s.company.cash;
  openSector(s, seventh.id);
  assert.equal(s.company.cash, before - 150_000);
});

test('High tier does not pay in a month with H over 4 h; Smart Meters halve it', () => {
  const s = createState(3);
  const h = home(s);
  h.customers.high = 100;
  h.lastH = 3;
  assert.equal(withheldHigh(s), 0);
  h.lastH = 5;
  assert.equal(withheldHigh(s), 100 * 250);
  h.tech.P6 = 'ACTIVE';
  assert.equal(withheldHigh(s), 100 * 250 * 0.5);
});

test('Corporate: 50 % chance to end each contract when H > 0.5 h; penalty 3 × tariff (fixed seed)', () => {
  const s = createState(4);
  const h = home(s);
  h.customers.corporate = 40;
  h.lastH = 0.4;
  assert.equal(corporateContracts(s, createRng(1)).lost, 0);
  h.lastH = 2;
  const res = corporateContracts(s, createRng(99));
  assert.ok(res.lost > 10 && res.lost < 30, `lost ${res.lost}`);
  assert.equal(res.penalty, res.lost * 3 * 6000);
  assert.equal(h.customers.corporate, 40 - res.lost);
  // the same seed gives the same result
  const s2 = createState(4);
  home(s2).customers.corporate = 40;
  home(s2).lastH = 2;
  assert.equal(corporateContracts(s2, createRng(99)).lost, res.lost);
});

test('a long outage in a Corporate sector can end a contract (full month tick)', () => {
  setState(createState(5));
  const s = getState();
  const h = home(s);
  h.customers.corporate = 10;
  s.staff.technicians = 0;
  h.damage = 50;
  const lost = [];
  const off = on('news', (p) => { if (p.key === 'contractLost') lost.push(p); });
  for (let i = 0; i < 4; i++) dispatch({ type: 'time/week' });
  off();
  assert.ok(h.customers.corporate < 10);
  assert.equal(lost.length, 1);
  assert.ok(s.report.money.penalties > 0);
});

test('prosumers: PROSUMER_RATE × F marketing join each month where the program is active', () => {
  const s = createState(6);
  const h = home(s);
  h.tech.P5 = 'ACTIVE';
  const g = globalEffects(s);
  const n = updateProsumers(s, createRng(3), 4_000, g);
  const expected = 2000 * CUSTOMERS.PROSUMER_RATE * 0.77;   // 1 sector, $4,000 marketing, 1 PR
  assert.ok(Math.abs(n - expected) <= 1, `${n} vs ${expected}`);
  assert.equal(h.prosumers, n);
  h.customers.low = 10;
  updateProsumers(s, createRng(3), 4_000, g);
  assert.ok(h.prosumers <= 10);
});

test('market share = customers ÷ all possible customers in 12 sectors', () => {
  const s = createState(7);
  const all = s.sectors.reduce((n, x) => n + potentialTotal(x), 0);
  assert.equal(totalPotential(s), all);
  assert.equal(marketShare(s), 2000 / all);
  assert.ok(all > 30_000, 'section 18 asks for more than 30,000 customers at month 180');
});

test('Medium, High and Corporate tiers open with their techs', () => {
  setState(createState(8));
  const s = getState();
  s.time.month = 41;
  s.company.cash = 1e7;
  const sub = s.sectors.find((x) => x.type === 'suburb');
  sub.owned = true;
  for (let i = 0; i < 8; i++) dispatch({ type: 'time/week' });
  assert.equal(sub.customers.medium, 0);
  dispatch({ type: 'debug/unlock', payload: { node: 'P2' } });
  for (let i = 0; i < 8; i++) dispatch({ type: 'time/week' });
  assert.ok(sub.customers.medium > 0);
});
