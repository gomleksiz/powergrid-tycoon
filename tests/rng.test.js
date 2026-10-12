import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/core/rng.js';

const take = (rng, n) => Array.from({ length: n }, () => rng.next());

test('the same seed gives the same 1,000 numbers', () => {
  assert.deepEqual(take(createRng(12345), 1000), take(createRng(12345), 1000));
});

test('different seeds give different numbers', () => {
  assert.notDeepEqual(take(createRng(1), 20), take(createRng(2), 20));
});

test('next() stays in [0, 1)', () => {
  for (const x of take(createRng(7), 1000)) assert.ok(x >= 0 && x < 1);
});

test('int(min, max) includes both ends and nothing else', () => {
  const rng = createRng(99);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const v = rng.int(3, 6);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 6);
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6]);
});

test('chance(0) is never true, chance(1) is always true', () => {
  const rng = createRng(5);
  for (let i = 0; i < 500; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
});

test('getState / setState continue the same sequence', () => {
  const a = createRng(42);
  take(a, 50);
  const saved = a.getState();
  const expected = take(a, 100);
  const b = createRng(0);
  b.setState(saved);
  assert.deepEqual(take(b, 100), expected);
});
