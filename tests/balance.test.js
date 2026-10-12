// The balance targets of design section 18 (Normal, 20 seeds). Takes a few seconds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAll, TARGETS } from '../tools/balance.js';

const PASS_SHARE = 0.8;

test('all balance targets pass in at least 16 of 20 seeds (Normal)', async () => {
  const results = await runAll({ seeds: 20, difficulty: 'normal' });
  const failed = [];
  for (const t of TARGETS) {
    const runs = t.bot === '*' ? Object.values(results).flat() : results[t.bot];
    const ok = runs.filter(t.check).length;
    if (ok / runs.length < PASS_SHARE) failed.push(`${t.bot}: ${t.text} (${ok}/${runs.length})`);
  }
  assert.deepEqual(failed, []);
});
