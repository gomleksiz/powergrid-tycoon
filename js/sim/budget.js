// The 5 linked budget sliders. They always add up to 100 %.

import { BUDGET } from '../data/balance.js';

// Set split[key] to value. The other open (not locked) sliders change to keep 100 %.
// They change in proportion to their size. Returns a new split of whole numbers.
export function setSplit(split, locks, key, value) {
  if (locks[key]) return { ...split };
  const keys = BUDGET.KEYS;
  const others = keys.filter((k) => k !== key && !locks[k]);
  const lockedSum = keys.filter((k) => k !== key && locks[k]).reduce((s, k) => s + split[k], 0);

  // The moved slider cannot take more than what is free.
  const room = others.length ? 100 - lockedSum : split[key];
  const v = Math.round(Math.min(Math.max(0, value), room));
  const rest = 100 - lockedSum - v;

  const out = { ...split, [key]: v };
  // Round down, then give the few leftover points to the smallest sliders first.
  // So repeated small moves keep the other sliders balanced.
  const oldSum = others.reduce((sum, k) => sum + split[k], 0);
  const exact = others.map((k) => ({ k, x: oldSum > 0 ? rest * split[k] / oldSum : rest / others.length }));
  let given = 0;
  for (const e of exact) { out[e.k] = Math.floor(e.x); given += out[e.k]; }
  exact
    .sort((a, b) => out[a.k] - out[b.k] || (b.x % 1) - (a.x % 1))
    .slice(0, rest - given)
    .forEach((e) => { out[e.k] += 1; });
  return fixSum(out, locks, key);
}

// Safety net: push any rounding error into an open slider.
function fixSum(split, locks, moved) {
  const sum = BUDGET.KEYS.reduce((s, k) => s + split[k], 0);
  if (sum === 100) return split;
  const k = BUDGET.KEYS.find((x) => x !== moved && !locks[x] && split[x] + (100 - sum) >= 0) ?? moved;
  return { ...split, [k]: split[k] + (100 - sum) };
}

export const splitSum = (split) => BUDGET.KEYS.reduce((s, k) => s + split[k], 0);
