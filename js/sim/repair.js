// Damage repair each week (design section 7).
// Each technician on repair fixes 1.5 damage points a week × Efficiency × F ES.

import { REPAIR, TIME, WORK } from '../data/balance.js';
import { globalEffects } from './effects.js';
import { companyEfficiency, fES, isStriking } from './workforce.js';

const FIELD = ['deploy', 'build', 'upgrade'];

// Technicians in a field crew (deployment, plant building or upgrade) are busy.
export function busyTechnicians(state) {
  return state.projects.filter((p) => FIELD.includes(p.kind) && p.status === 'active').length * WORK.CREW_SIZE;
}

export function freeTechnicians(state) {
  return Math.max(0, state.staff.technicians - busyTechnicians(state));
}

export const totalDamage = (state) => state.sectors.reduce((sum, s) => sum + (s.owned ? s.damage : 0), 0);

// Technicians that work on repair this week.
// "Repair first": all free technicians repair while there is damage.
// "Build first": crews for waiting deployments are kept free first.
export function repairTechnicians(state) {
  if (totalDamage(state) <= 0) return 0;
  const free = freeTechnicians(state);
  if (state.staff.repairFirst) return free;
  const waiting = state.projects.filter((p) => FIELD.includes(p.kind) && p.status === 'waiting').length;
  return Math.max(0, free - waiting * WORK.CREW_SIZE);
}

// Damage points a week for n technicians.
export function repairPower(state, n = repairTechnicians(state), g = globalEffects(state)) {
  return n * REPAIR.POINTS_PER_TECH_WEEK * companyEfficiency(state, g) * fES(state.meters.es)
    * (1 + g.repairBonus) * (isStriking(state) ? REPAIR.STRIKE_MULT : 1);
}

// Weeks to fix all damage with all free technicians.
export function backlogWeeks(state) {
  const dmg = totalDamage(state);
  if (dmg <= 0) return 0;
  const power = repairPower(state, freeTechnicians(state));
  return power > 0 ? Math.min(REPAIR.BACKLOG_MAX_WEEKS, dmg / power) : REPAIR.BACKLOG_MAX_WEEKS;
}

// High → Normal → Low priority; more damage first.
export function repairOrder(state) {
  const rank = (p) => REPAIR.PRIORITIES.indexOf(p);
  return state.sectors
    .filter((s) => s.owned && s.damage > 0)
    .sort((a, b) => rank(a.priority) - rank(b.priority) || b.damage - a.damage);
}

// 1 week: count the damage hours, then repair. Returns the points used.
// sector.repairTechs = technicians that worked there this week (for the map and the panel).
export function repairWeek(state) {
  let points = repairPower(state);
  const used = points;
  const perTech = repairPower(state, 1);
  const fixAt = (s, fix) => {
    s.damage = Math.max(0, +(s.damage - fix).toFixed(4));
    s.repairTechs += perTech > 0 ? Math.ceil(fix / perTech - 1e-9) : 0;
    points -= fix;
  };
  for (const s of state.sectors) s.repairTechs = 0;
  // Storm Prep: the crews wait near the sector, so they repair before the outage hours count.
  for (const s of state.sectors) {
    if (!s.prepRepair) continue;
    fixAt(s, Math.min(points, s.damage));
    s.prepRepair = false;
  }
  for (const s of state.sectors) {
    if (s.owned && s.damage > 0) s.dmgHours += TIME.HOURS_PER_WEEK * (s.damage / 100);
  }
  for (const s of repairOrder(state)) {
    if (points <= 0) break;
    fixAt(s, Math.min(points, s.damage));
  }
  return used - points;
}
