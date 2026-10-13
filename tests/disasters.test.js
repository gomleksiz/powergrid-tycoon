import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { on } from '../js/core/bus.js';
import { serialize, readSave } from '../js/save/save.js';
import { weekIndex, warningWeeks } from '../js/sim/disasters.js';
import { eligibleCards } from '../js/sim/eventCards.js';
import { EVENTS } from '../js/data/events.js';

const home = (s) => s.sectors.find((x) => x.owned);

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

// Play months and record every disaster (type, month, week, sectors, damage).
function recordDisasters(months, start = null) {
  const seen = [];
  const off = on('disaster:hit', (r) => seen.push(`${r.type}@${r.month}.${r.week}:${r.sectors.map((x) => `${x.sector}=${x.actual}`).join(',')}`));
  const offCard = on('event:card', () => dispatch({ type: 'event/choose', payload: { choice: 0 } }));
  const s = start ?? getState();
  const end = s.time.month + months;
  while (s.time.month < end && !s.goals.ended) dispatch({ type: 'time/week' });
  off();
  offCard();
  return seen;
}

function rich(seed) {
  const s = createState(seed, 'normal');
  s.company.cash = 1e9;   // stay in business for the whole test
  return s;
}

test('the same seed gives the same disasters', () => {
  setState(rich(77));
  const a = recordDisasters(130);
  setState(rich(77));
  const b = recordDisasters(130);
  assert.ok(a.length > 3, `only ${a.length} disasters`);
  assert.deepEqual(a, b);
});

test('the same disasters also after save and load', () => {
  setState(rich(78));
  recordDisasters(30);
  const storage = memoryStorage();
  storage.setItem('k', JSON.stringify(serialize(getState())));
  const after = recordDisasters(60);
  const loaded = readSave('k', storage).state;
  setState(loaded);
  assert.deepEqual(recordDisasters(60), after);
});

test('the Storm of the Decade comes at month 110 with a 4-week warning', () => {
  setState(rich(79));
  const s = getState();
  s.time.month = 100;
  const warnings = [];
  const hits = [];
  // Events come after the week tick, so the clock already shows the next week.
  const offW = on('disaster:warning', (w) => { if (w.type === 'superstorm') warnings.push([s.time.month, w.weeks]); });
  const offH = on('disaster:hit', (r) => { if (r.type === 'superstorm') hits.push([r.month, r.week, r.sectors.length]); });
  const offC = on('event:card', () => dispatch({ type: 'event/choose', payload: { choice: 0 } }));
  while (s.time.month < 112) dispatch({ type: 'time/week' });
  offW(); offH(); offC();
  assert.deepEqual(warnings, [[109, 4]]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0][0], 110);
  assert.equal(hits[0][1], 1);
});

test('Storm Poles show a smaller damage number in the report', () => {
  const run = (poles) => {
    setState(rich(80));
    const s = getState();
    const h = home(s);
    if (poles) h.tech.D2 = 'ACTIVE';
    dispatch({ type: 'debug/disaster', payload: { type: 'windstorm', sector: h.id } });
    let report = null;
    const off = on('disaster:hit', (r) => { report = r; });
    dispatch({ type: 'time/week' });
    dispatch({ type: 'time/week' });
    off();
    return report.sectors[0];
  };
  const plain = run(false);
  const poles = run(true);
  assert.equal(plain.actual, 40);
  assert.equal(poles.actual, 24);
  assert.equal(poles.saved, 16);
  assert.deepEqual(poles.savedBy, ['D2']);
});

test('warnings: 1 week with Weatherproof Sensors on Normal, none without; 2 weeks on Easy', () => {
  const s = createState(81, 'normal');
  const h = home(s);
  const item = { type: 'windstorm', hits: [{ sector: h.id, base: 30 }] };
  assert.equal(warningWeeks(s, item), 0);
  h.tech.D3 = 'ACTIVE';
  assert.equal(warningWeeks(s, item), 1);
  assert.equal(warningWeeks(createState(81, 'easy'), item), 2);
  assert.equal(warningWeeks(createState(81, 'hard'), item), 0);
});

test('Storm Prep: $10,000 and damage − 20 %', () => {
  setState(rich(82));
  const s = getState();
  const h = home(s);
  h.tech.D3 = 'ACTIVE';
  dispatch({ type: 'policy/autoPrep', payload: false });   // pay it by hand here
  dispatch({ type: 'debug/disaster', payload: { type: 'windstorm', sector: h.id } });
  s.disasters.scheduled[0].week += 1;               // 2 weeks away, so a warning comes first
  if (s.disasters.scheduled[0].week > 4) { s.disasters.scheduled[0].week = 1; s.disasters.scheduled[0].month += 1; }
  dispatch({ type: 'time/week' });
  assert.equal(s.disasters.scheduled[0].warned, false);
  dispatch({ type: 'time/week' });
  assert.equal(s.disasters.scheduled[0].warned, true);
  const cash = s.company.cash;
  dispatch({ type: 'disaster/prep', payload: { sector: h.id } });
  assert.equal(s.company.cash, cash - 10_000);
  let report = null;
  const off = on('disaster:hit', (r) => { report = r; });
  dispatch({ type: 'time/week' });
  off();
  assert.equal(report.sectors[0].actual, 32);
  assert.equal(report.sectors[0].prep, true);
});

test('Storm Prep is paid by itself after a warning (version 1.2)', () => {
  setState(rich(82));
  const s = getState();
  const h = home(s);
  h.tech.D3 = 'ACTIVE';
  assert.equal(s.policy.autoPrep, true);
  dispatch({ type: 'debug/disaster', payload: { type: 'windstorm', sector: h.id } });
  s.disasters.scheduled[0].week += 1;
  if (s.disasters.scheduled[0].week > 4) { s.disasters.scheduled[0].week = 1; s.disasters.scheduled[0].month += 1; }
  let warning = null;
  const off = on('disaster:warning', (w) => { warning = w; });
  const cash = s.company.cash;
  dispatch({ type: 'time/week' });
  dispatch({ type: 'time/week' });
  off();
  assert.ok(h.prep);
  assert.deepEqual(warning.prepped, [h.id]);
  assert.ok(s.company.cash <= cash - 10_000);
});

test('an earthquake stops a fission plant for 2 months', () => {
  setState(rich(83));
  const s = getState();
  const h = home(s);
  h.buildings.push({ id: 999, type: 'fission', x: 0, y: 0, status: 'active' });
  dispatch({ type: 'debug/disaster', payload: { type: 'earthquake', sector: h.id } });
  dispatch({ type: 'time/week' });
  dispatch({ type: 'time/week' });
  assert.equal(h.buildings.find((b) => b.id === 999).stopped, 2);
});

test('heatwave: peak + 25 % and wholesale gives 85 % → shortage hours', () => {
  setState(rich(84));
  const s = getState();
  const h = home(s);
  dispatch({ type: 'debug/disaster', payload: { type: 'heatwave', sector: h.id } });
  while (!s.disasters.log.length) dispatch({ type: 'time/week' });
  assert.equal(s.market.peakMult, 1.25);
  assert.equal(s.market.supplyShare, 0.85);
  while (s.time.week !== 1) dispatch({ type: 'time/week' });
  assert.ok(h.lastParts.shortage > 0);
  assert.equal(s.market.peakMult, 1);   // gone after 1 month
});

test('event cards: conditions, a choice applies its effects, cooldown', () => {
  setState(rich(85));
  const s = getState();
  assert.ok(!eligibleCards(s).includes('evChargers'));
  s.time.month = 30;
  assert.ok(eligibleCards(s).includes('evChargers'));
  assert.ok(!eligibleCards(s).includes('publicPetition'));
  s.meters.cs = 20;
  assert.ok(eligibleCards(s).includes('publicPetition'));
  dispatch({ type: 'debug/event', payload: 'evChargers' });
  const cash = s.company.cash;
  const gs = s.meters.gs;
  dispatch({ type: 'event/choose', payload: { choice: 0 } });
  assert.equal(s.company.cash, cash - 100_000);
  assert.equal(s.meters.gs, gs + 8);
  assert.equal(s.events.pending, null);
  assert.equal(s.events.cooldown, 2);   // version 1.2: 3 → 2
  dispatch({ type: 'debug/event', payload: 'fuelCrisis' });
  dispatch({ type: 'event/choose', payload: { choice: 1 } });
  assert.equal(s.market.eventMult, 1.5);
  assert.equal(s.market.priceMult, 1.1);
  for (let i = 0; i < 4 * 3; i++) dispatch({ type: 'time/week' });
  assert.equal(s.market.eventMult, 1);
});

test('version 1.2 cards: strike, broken substation, heat dome, cyber attack, engineers leave', () => {
  setState(rich(87));
  const s = getState();
  const h = s.sectors.find((x) => x.owned);
  s.time.month = 40;
  dispatch({ type: 'debug/event', payload: 'unionStrike' });
  dispatch({ type: 'event/choose', payload: { choice: 1 } });
  assert.equal(s.staff.strikeMonths, 2);
  dispatch({ type: 'debug/event', payload: 'substationFire' });
  dispatch({ type: 'event/choose', payload: { choice: 1 } });
  assert.ok(h.buildings.some((b) => b.type === 'substation' && b.broken));
  assert.ok(!eligibleCards(s).includes('substationFire'));   // no working substation left
  dispatch({ type: 'debug/event', payload: 'heatDome' });
  dispatch({ type: 'event/choose', payload: { choice: 1 } });
  assert.equal(s.market.peakMult, 1.3);
  dispatch({ type: 'debug/event', payload: 'cyberAttack' });
  dispatch({ type: 'event/choose', payload: { choice: 1 } });
  assert.equal(h.damage, 35);
  const eng = s.staff.engineers;
  dispatch({ type: 'debug/event', payload: 'poachEngineers' });
  dispatch({ type: 'event/choose', payload: { choice: 1 } });
  assert.equal(s.staff.engineers, Math.max(0, eng - 3));
});

test('about 1 event card each 6 months', () => {
  setState(rich(86));
  let cards = 0;
  const off = on('event:card', () => { cards++; dispatch({ type: 'event/choose', payload: { choice: 1 } }); });
  const s = getState();
  // An idle company can lose before 2049, so stop at the end of the game.
  while (s.time.month < 241 && !s.goals.ended) dispatch({ type: 'time/week' });
  off();
  const perMonth = cards / s.time.month;
  assert.ok(perMonth > 1 / 14 && perMonth < 1 / 4, `${cards} cards in ${s.time.month} months`);
  assert.ok(Object.keys(EVENTS).length >= 5);
});

test('weekIndex', () => {
  assert.equal(weekIndex(1, 1), 0);
  assert.equal(weekIndex(110, 1), 436);
});
