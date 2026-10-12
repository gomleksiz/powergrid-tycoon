// Save and load with localStorage. 2 rotating auto-saves and 3 slots.
// Each save also writes a small "<key>.meta" entry, so the slot cards
// can be listed without parsing the full state.

import { SAVE, SAVE_VERSION, GAME_VERSION } from '../data/balance.js';
import { checksum } from './checksum.js';
import { migrate } from './migrate.js';
import { recalcDerived } from '../sim/derived.js';
import { dateLabel } from '../core/time.js';

const local = () => globalThis.localStorage;

export const slotKey = (n) => `${SAVE.PREFIX}slot.${n}`;
const metaKey = (key) => key + SAVE.META_SUFFIX;

export function serialize(state, { playTimeSec = 0, now = new Date() } = {}) {
  return {
    saveVersion: SAVE_VERSION,
    gameVersion: GAME_VERSION,
    savedAt: now.toISOString(),
    playTimeSec: Math.floor(playTimeSec),
    checksum: checksum(JSON.stringify(state)),
    meta: {
      companyName: state.company.name,
      difficulty: state.difficulty,
      month: state.time.month,
      dateLabel: dateLabel(state.time.month),
      seed: state.seed,
    },
    state,
  };
}

function headerOf(save) {
  const { saveVersion, gameVersion, savedAt, playTimeSec, meta } = save;
  return { saveVersion, gameVersion, savedAt, playTimeSec, meta };
}

function write(key, state, opts, storage) {
  const save = serialize(state, opts);
  try {
    storage.setItem(key, JSON.stringify(save));
    storage.setItem(metaKey(key), JSON.stringify(headerOf(save)));
    return { ok: true, key };
  } catch (e) {
    return { ok: false, key, error: isQuotaError(e) ? 'quota' : 'other' };
  }
}

export function isQuotaError(e) {
  return e?.name === 'QuotaExceededError'
    || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || e?.code === 22 || e?.code === 1014;
}

// Write to the older of the 2 auto-save keys, so 1 good copy always stays.
export function writeAuto(state, opts = {}, storage = local()) {
  const [a, b] = SAVE.AUTO_KEYS;
  const ta = readHeader(a, storage)?.savedAt ?? '';
  const tb = readHeader(b, storage)?.savedAt ?? '';
  return write(ta <= tb ? a : b, state, opts, storage);
}

export function writeSlot(n, state, opts = {}, storage = local()) {
  return write(slotKey(n), state, opts, storage);
}

export function isSlotFull(n, storage = local()) {
  return storage.getItem(slotKey(n)) !== null;
}

// parse → checksum → version → migrate → derived values.
// Returns { ok: true, state, playTimeSec } or { ok: false, reason }.
export function readSave(key, storage = local()) {
  const raw = storage.getItem(key);
  if (raw === null) return { ok: false, reason: 'missing' };

  let save;
  try {
    save = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'parse' };
  }
  if (!save?.state || typeof save.saveVersion !== 'number') return { ok: false, reason: 'parse' };
  if (checksum(JSON.stringify(save.state)) !== save.checksum) return { ok: false, reason: 'checksum' };
  if (save.saveVersion > SAVE_VERSION) return { ok: false, reason: 'newer' };

  let state;
  try {
    state = recalcDerived(migrate(save.state, save.saveVersion));
  } catch {
    return { ok: false, reason: 'migrate' };
  }
  return { ok: true, key, state, playTimeSec: save.playTimeSec ?? 0, savedAt: save.savedAt };
}

// Header only. Falls back to the full save if the meta entry is lost or broken.
export function readHeader(key, storage = local()) {
  try {
    const m = storage.getItem(metaKey(key));
    if (m !== null) return JSON.parse(m);
  } catch { /* use the full save below */ }
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : headerOf(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function listSaves(storage = local()) {
  const autos = SAVE.AUTO_KEYS.map((key) => ({ key, kind: 'auto', id: key.slice(-1) }));
  const slots = Array.from({ length: SAVE.SLOT_COUNT }, (_, i) => ({ key: slotKey(i + 1), kind: 'slot', id: i + 1 }));
  return [...slots, ...autos].map((s) => {
    const exists = storage.getItem(s.key) !== null;
    return { ...s, exists, header: exists ? readHeader(s.key, storage) : null };
  });
}

// Newest auto-save that loads. usedBackup = the newest one was damaged.
export function readContinue(storage = local()) {
  const autos = SAVE.AUTO_KEYS
    .map((key) => ({ key, savedAt: readHeader(key, storage)?.savedAt ?? '' }))
    .filter((a) => storage.getItem(a.key) !== null)
    .sort((x, y) => y.savedAt.localeCompare(x.savedAt));
  for (let i = 0; i < autos.length; i++) {
    const res = readSave(autos[i].key, storage);
    if (res.ok) return { ...res, usedBackup: i > 0 };
  }
  return { ok: false, reason: 'missing' };
}

export function hasContinue(storage = local()) {
  return SAVE.AUTO_KEYS.some((k) => storage.getItem(k) !== null);
}

export function deleteSave(key, storage = local()) {
  storage.removeItem(key);
  storage.removeItem(metaKey(key));
}

// Ask the browser not to clean up our storage. Runs once per page load.
let persistAsked = false;
export async function requestPersist() {
  if (persistAsked) return null;
  persistAsked = true;
  try {
    return (await navigator.storage?.persist?.()) ?? null;
  } catch {
    return null;
  }
}
