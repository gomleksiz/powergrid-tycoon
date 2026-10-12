import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch, subscribe } from '../js/core/store.js';
import { on } from '../js/core/bus.js';
import { createLoop } from '../js/core/loop.js';
import { TIME } from '../js/data/balance.js';

test('createState sets the start values', () => {
  const s = createState(77, 'hard', { companyName: 'Volt Co' });
  assert.equal(s.seed, 77);
  assert.equal(s.rng, 77);
  assert.equal(s.difficulty, 'hard');
  assert.equal(s.company.name, 'Volt Co');
  assert.deepEqual(s.time, { month: 1, week: 1 });
});

test('dispatch time/week adds 1 week', () => {
  setState(createState(1));
  dispatch({ type: 'time/week' });
  assert.deepEqual(getState().time, { month: 1, week: 2 });
});

test('4 weeks make 1 month and emit month:end once', () => {
  setState(createState(1));
  const ended = [];
  const offBus = on('month:end', (p) => ended.push(p.month));
  for (let i = 0; i < 4; i++) dispatch({ type: 'time/week' });
  offBus();
  assert.deepEqual(getState().time, { month: 2, week: 1 });
  assert.deepEqual(ended, [1]);
});

test('subscribers hear each dispatch', () => {
  setState(createState(1));
  const seen = [];
  const unsub = subscribe((_, action) => seen.push(action.type));
  dispatch({ type: 'company/rename', payload: 'Grid Masters' });
  unsub();
  dispatch({ type: 'time/week' });
  assert.deepEqual(seen, ['company/rename']);
  assert.equal(getState().company.name, 'Grid Masters');
});

test('unknown actions throw', () => {
  setState(createState(1));
  assert.throws(() => dispatch({ type: 'nope' }), /Unknown action/);
});

function monthSeconds(speed) {
  let ticks = 0;
  const loop = createLoop({ onTick: () => ticks++ });
  loop.setSpeed(speed);
  let ms = 0;
  while (ticks < TIME.WEEKS_PER_MONTH) { loop.advance(10); ms += 10; }
  return ms / 1000;
}

test('1 month takes 30 s at 1x, 15 s at 2x, 6 s at 5x', () => {
  assert.equal(monthSeconds(1), 30);
  assert.equal(monthSeconds(2), 15);
  assert.equal(monthSeconds(5), 6);
});

test('pause stops the clock and a long frame is clamped', () => {
  let ticks = 0;
  const loop = createLoop({ onTick: () => ticks++ });
  loop.advance(60_000);
  assert.equal(ticks, 0);
  loop.togglePause();
  assert.equal(loop.getSpeed(), 1);
  loop.advance(60_000); // one 60 s frame is clamped to MAX_FRAME_MS
  assert.equal(ticks, 0);
});
