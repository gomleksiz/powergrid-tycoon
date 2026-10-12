// Staff, efficiency and the ES factor (design sections 9 and 11).

import { STAFF, METERS, WORK } from '../data/balance.js';
import { globalEffects } from './effects.js';

export const totalStaff = (state) => STAFF.ROLES.reduce((n, r) => n + state.staff[r], 0);

// 100 % up to M. After M: (M ÷ S)^0.8, at least 35 %.
export function efficiency(S, M) {
  if (S <= M) return 1;
  return Math.max(WORK.MIN_EFFICIENCY, (M / S) ** WORK.EFFICIENCY_POWER);
}

export function managementThreshold(state, g = globalEffects(state)) {
  return g.managementThreshold;
}

export function companyEfficiency(state, g = globalEffects(state)) {
  return efficiency(totalStaff(state), managementThreshold(state, g));
}

// F ES: 0.75 below 30, 1.2 above 75, else 1.
export function fES(es) {
  if (es < METERS.LOW) return WORK.F_ES_LOW;
  if (es > METERS.HIGH) return WORK.F_ES_HIGH;
  return 1;
}

export const isStriking = (state) => state.staff.strikeMonths > 0;

export function wagesFor(role, count) {
  return STAFF.WAGE[role] * count;
}
