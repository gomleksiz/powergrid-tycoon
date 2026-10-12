import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../js/core/store.js';
import { efficiency, companyEfficiency, managementThreshold, fES, totalStaff } from '../js/sim/workforce.js';

const near = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('efficiency table (section 9, M = 25)', () => {
  const rows = [[20, 1, 20], [30, 0.864, 25.9], [40, 0.687, 27.5], [60, 0.496, 29.8], [80, 0.394, 31.5]];
  for (const [S, eff, work] of rows) {
    near(efficiency(S, 25), eff);
    near(S * efficiency(S, 25), work, 0.1);
  }
  near(efficiency(1000, 25), 0.35);
});

test('M comes from the active Organization techs', () => {
  const s = createState(1);
  assert.equal(managementThreshold(s), 25);
  s.tech.nodes.O1.status = 'ACTIVE';
  assert.equal(managementThreshold(s), 45);
  s.tech.nodes.O3.status = 'ACTIVE';
  assert.equal(managementThreshold(s), 70);
  s.tech.nodes.O6.status = 'ACTIVE';
  assert.equal(managementThreshold(s), 100);
});

test('company efficiency uses all staff', () => {
  const s = createState(1);
  assert.equal(totalStaff(s), 8);
  assert.equal(companyEfficiency(s), 1);
  s.staff.engineers = 40;
  near(companyEfficiency(s), efficiency(45, 25));
});

test('F ES: 0.75 below 30, 1.2 above 75', () => {
  assert.equal(fES(20), 0.75);
  assert.equal(fES(50), 1);
  assert.equal(fES(80), 1.2);
});
