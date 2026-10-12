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

export function applyEffects(state, fx) {
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
}

export function chooseEvent(state, choice) {
  const p = state.events.pending;
  if (!p) return false;
  const card = EVENTS[p.id];
  const c = card.choices[choice];
  if (!c) return false;
  applyEffects(state, c.effects);
  state.events.pending = null;
  state.events.cooldown = EVENT_RULES.COOLDOWN;
  return true;
}
