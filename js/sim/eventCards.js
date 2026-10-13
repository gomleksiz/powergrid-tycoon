// Event cards (design section 13). One general effect reader, no code per card.

import { EVENTS, EVENT_IDS, EVENT_RULES } from '../data/events.js';
import { STAFF } from '../data/balance.js';
import { addMod } from './market.js';
import { clampMeter, researchProjects } from './research.js';
import { totalStaff } from './workforce.js';

function conditionHolds(state, when = {}) {
  if (when.minMonth && state.time.month < when.minMonth) return false;
  if (when.csBelow !== undefined && state.meters.cs >= when.csBelow) return false;
  if (when.minStaff && totalStaff(state) < when.minStaff) return false;
  if (when.hasBuilding && !state.sectors.some((s) => s.owned && s.buildings.some((b) => b.type === when.hasBuilding && b.status === 'active' && !b.broken))) return false;
  return true;
}

export function eligibleCards(state) {
  return EVENT_IDS.filter((id) => conditionHolds(state, EVENTS[id].when));
}

// At a month tick: maybe draw a card. Returns events.
export function rollEventCard(state, rng) {
  const ev = state.events;
  if (ev.pending) return [];
  if (ev.cooldown > 0) { ev.cooldown -= 1; return []; }
  if (!rng.chance(EVENT_RULES.CHANCE)) return [];
  const ids = eligibleCards(state);
  if (!ids.length) return [];
  const total = ids.reduce((s, id) => s + EVENTS[id].weight, 0);
  let r = rng.next() * total;
  let pick = ids[0];
  for (const id of ids) {
    if (r < EVENTS[id].weight) { pick = id; break; }
    r -= EVENTS[id].weight;
  }
  ev.pending = { id: pick, month: state.time.month };
  return [{ type: 'event:card', payload: { id: pick } }];
}

export function applyEffects(state, fx, rng = null) {
  if (fx.cash) {
    state.company.cash += fx.cash;
    if (fx.cash < 0) state.company.otherCostsThisMonth -= fx.cash;
  }
  for (const m of ['cs', 'es', 'gs']) if (fx[m]) state.meters[m] = clampMeter(state.meters[m] + fx[m]);
  if (fx.wageMult) state.staff.wageMult = +Math.min(STAFF.WAGE_MAX, state.staff.wageMult + fx.wageMult).toFixed(2);
  if (fx.rp) {
    const p = researchProjects(state)[0];
    if (p) state.tech.nodes[p.node].rp = Math.min(p.total, state.tech.nodes[p.node].rp + fx.rp);
    else state.tech.bankRp += fx.rp;
  }
  if (fx.wholesale) addMod(state, { kind: 'wholesale', mult: fx.wholesale.mult, months: fx.wholesale.months });
  if (fx.price) addMod(state, { kind: 'price', mult: fx.price.mult, months: fx.price.months });
  if (fx.supply) addMod(state, { kind: 'supply', share: fx.supply.share, months: fx.supply.months });
  // Version 1.2
  if (fx.peak) addMod(state, { kind: 'peak', mult: fx.peak.mult, months: fx.peak.months });
  if (fx.strike) state.staff.strikeMonths = Math.max(state.staff.strikeMonths, fx.strike);
  if (fx.staff) state.staff[fx.staff.role] = Math.max(0, state.staff[fx.staff.role] - fx.staff.count);
  const pick = (list) => (list.length ? list[rng ? rng.int(0, list.length - 1) : 0] : null);
  if (fx.breakBuilding) {
    const b = pick(state.sectors.filter((s) => s.owned).flatMap((s) => s.buildings)
      .filter((x) => x.type === fx.breakBuilding && x.status === 'active' && !x.broken));
    if (b) b.broken = true;
  }
  if (fx.damage) {
    const s = pick(state.sectors.filter((x) => x.owned));
    if (s) s.damage = Math.min(100, s.damage + fx.damage);
  }
}

export function chooseEvent(state, choice, rng = null) {
  const p = state.events.pending;
  if (!p) return false;
  const card = EVENTS[p.id];
  const c = card.choices[choice];
  if (!c) return false;
  applyEffects(state, c.effects, rng);
  state.events.pending = null;
  state.events.cooldown = EVENT_RULES.COOLDOWN;
  return true;
}
