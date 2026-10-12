import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { withStateRng } from '../js/core/rng.js';
import { serialize, writeAuto, writeSlot, readSave, readContinue, listSaves, slotKey } from '../js/save/save.js';
import { migrate } from '../js/save/migrate.js';
import { fnv1a, checksum } from '../js/save/checksum.js';
import { SAVE, SAVE_VERSION } from '../js/data/balance.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    raw: m,
  };
}

function playedState(weeks = 10) {
  setState(createState(2024, 'normal', { companyName: 'Test Power' }));
  for (let i = 0; i < weeks; i++) dispatch({ type: 'time/week' });
  withStateRng(getState(), (rng) => rng.next()); // move the rng on
  return getState();
}

test('FNV-1a matches known values', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(checksum('a'), 'e40c292c');
  assert.equal(checksum('foobar'), 'bf9cf968');
});

test('round trip: save → load gives an equal state', () => {
  const store = memoryStorage();
  const state = playedState();
  assert.equal(writeSlot(1, state, { playTimeSec: 95 }, store).ok, true);
  const res = readSave(slotKey(1), store);
  assert.equal(res.ok, true);
  assert.deepEqual(res.state, state);
  assert.equal(res.playTimeSec, 95);
});

test('after load the rng gives the same next numbers', () => {
  const store = memoryStorage();
  const state = playedState();
  writeSlot(2, state, {}, store);
  const expected = withStateRng(structuredClone(state), (rng) => [rng.next(), rng.next(), rng.int(1, 100)]);
  const loaded = readSave(slotKey(2), store).state;
  assert.deepEqual(withStateRng(loaded, (rng) => [rng.next(), rng.next(), rng.int(1, 100)]), expected);
});

test('a bad checksum is refused', () => {
  const store = memoryStorage();
  writeSlot(1, playedState(), {}, store);
  const save = JSON.parse(store.getItem(slotKey(1)));
  save.state.time.month = 99;
  store.setItem(slotKey(1), JSON.stringify(save));
  assert.deepEqual(readSave(slotKey(1), store), { ok: false, reason: 'checksum' });
});

test('broken JSON is refused', () => {
  const store = memoryStorage();
  store.setItem(slotKey(3), '{not json');
  assert.equal(readSave(slotKey(3), store).reason, 'parse');
});

test('a save from a newer version is refused', () => {
  const store = memoryStorage();
  const save = serialize(playedState());
  save.saveVersion = SAVE_VERSION + 1;
  store.setItem(slotKey(1), JSON.stringify(save));
  assert.equal(readSave(slotKey(1), store).reason, 'newer');
});

test('a fake old save migrates and gets the missing fields', () => {
  // Pretend version 0 kept the date as "date" and had no tutorial or history.
  const old = { seed: 5, difficulty: 'easy', company: { name: 'Old Co' }, rng: 123, date: { month: 30, week: 2 } };
  const fakeMigrations = {
    0: ({ date, ...rest }) => ({ ...rest, time: date }),
  };
  const s = migrate(structuredClone(old), 0, fakeMigrations);
  assert.deepEqual(s.time, { month: 30, week: 2 });
  assert.equal(s.rng, 123);
  assert.equal(s.company.name, 'Old Co');
  assert.deepEqual(s.tutorial, { enabled: false, step: 0 });
  assert.deepEqual(s.history, []);
  assert.equal('date' in s, false);
});

test('a missing migration step is refused', () => {
  const store = memoryStorage();
  const save = serialize(playedState());
  save.saveVersion = 0;
  store.setItem(slotKey(1), JSON.stringify(save));
  assert.equal(readSave(slotKey(1), store).reason, 'migrate');
});

test('auto-saves rotate between a and b', () => {
  const store = memoryStorage();
  const state = playedState();
  const t = (s) => ({ now: new Date(`2030-01-01T00:00:0${s}Z`) });
  assert.equal(writeAuto(state, t(1), store).key, SAVE.AUTO_KEYS[0]);
  assert.equal(writeAuto(state, t(2), store).key, SAVE.AUTO_KEYS[1]);
  assert.equal(writeAuto(state, t(3), store).key, SAVE.AUTO_KEYS[0]);
});

test('continue uses the other auto-save when the newest is broken', () => {
  const store = memoryStorage();
  setState(createState(9));
  writeAuto(getState(), { now: new Date('2030-01-01T00:00:01Z') }, store); // a: month 1
  for (let i = 0; i < 4; i++) dispatch({ type: 'time/week' });
  writeAuto(getState(), { now: new Date('2030-01-01T00:00:02Z') }, store); // b: month 2

  assert.equal(readContinue(store).state.time.month, 2);
  store.setItem(SAVE.AUTO_KEYS[1], store.getItem(SAVE.AUTO_KEYS[1]).replace('"time":{"month":2', '"time":{"month":7'));
  const res = readContinue(store);
  assert.equal(res.ok, true);
  assert.equal(res.usedBackup, true);
  assert.equal(res.state.time.month, 1);
});

test('a full storage reports a quota error and does not throw', () => {
  const store = memoryStorage();
  store.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  assert.deepEqual(writeAuto(playedState(), {}, store), { ok: false, key: SAVE.AUTO_KEYS[0], error: 'quota' });
});

test('listSaves reads only the meta entries', () => {
  const store = memoryStorage();
  writeSlot(2, playedState(8), {}, store);
  const reads = [];
  const get = store.getItem;
  store.getItem = (k) => { reads.push(k); return get(k); };
  const list = listSaves(store);
  const slot2 = list.find((s) => s.key === slotKey(2));
  assert.equal(slot2.header.meta.dateLabel, 'Mar 2030');
  assert.equal(slot2.header.meta.companyName, 'Test Power');
  assert.equal(list.filter((s) => s.exists).length, 1);
  // The full save is only checked for existence; its JSON is never parsed.
  assert.ok(reads.includes(`${slotKey(2)}.meta`));
});
