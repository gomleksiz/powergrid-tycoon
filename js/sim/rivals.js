// Rivals (design section 12). Simple rules, no full economy.

import { RIVALS, RIVAL_IDS, RIVAL } from '../data/rivals.js';
import { TIERS, TIER_IDS, METERS } from '../data/balance.js';
import { SECTOR_TYPES } from '../data/sectors.js';
import { diff } from '../data/difficulty.js';
import { globalEffects } from './effects.js';
import { roundChance } from './customers.js';
import { averagePrice } from './satisfaction.js';
import { clampMeter } from './research.js';
import { emptyTiers } from './setup.js';
import { spendCapex } from './economy.js';

export const enterMonth = (state, id) => diff(state).firstRivalMonth + RIVALS[id].enterAfterFirst;

const sum = (o) => TIER_IDS.reduce((n, t) => n + (o?.[t] ?? 0), 0);
const potentialOf = (s) => sum(SECTOR_TYPES[s.type].potential);

// m̄ in one sector (weighted by customers, with the local price cut). Not owned: the player's m̄.
function sectorPrice(state, s) {
  const n = sum(s.customers);
  if (!s.owned || n === 0) return averagePrice(state);
  return TIER_IDS.reduce((x, t) => x + s.customers[t] * state.prices[t], 0) / n * (1 - s.discount);
}

export function unservedShare(s) {
  const pot = potentialOf(s);
  return pot > 0 ? Math.max(0, pot - sum(s.customers) - sum(s.rival?.customers)) / pot : 0;
}

// Entry = 50 × Unserved + 2 × max(0, H − 12) + 30 × (m̄ − 1) + 20 × [CS < 30]
export function entryScore(state, s) {
  const H = s.owned ? s.lastH : 0;
  return RIVAL.ENTRY_UNSERVED * unservedShare(s)
    + RIVAL.ENTRY_OUTAGE * Math.max(0, H - RIVAL.ENTRY_OUTAGE_FROM)
    + RIVAL.ENTRY_PRICE * (sectorPrice(state, s) - 1)
    + (state.meters.cs < METERS.LOW ? RIVAL.ENTRY_LOW_CS : 0);
}

export function franchiseActive(state) {
  return globalEffects(state).franchiseSectors > 0 && state.meters.gs >= RIVAL.FRANCHISE_GS;
}

export function isProtected(state, id) {
  return franchiseActive(state) && state.rivalPolicy.franchise.includes(id);
}

// Every 3 months from its start month: enter the best sector if the score is over 25.
function tryEnter(state, rng, rid) {
  const r = state.rivals.find((x) => x.id === rid);
  const m = state.time.month;
  if (state.rivalPolicy.monopolyCharter || m < enterMonth(state, rid) || (m - enterMonth(state, rid)) % RIVAL.CHECK_EVERY !== 0) return null;
  let best = null;
  for (const s of state.sectors) {
    if (s.rival || isProtected(state, s.id)) continue;
    const score = entryScore(state, s);
    // Ties go to a random sector (seeded).
    const key = score + rng.next() * 1e-6;
    if (!best || key > best.key) best = { s, score, key };
  }
  if (!best || best.score <= RIVAL.ENTRY_MIN) return null;
  best.s.rival = { id: rid, strength: RIVAL.START_STRENGTH, customers: emptyTiers(), lowMonths: 0, H: 0 };
  r.entered = true;
  return { type: 'rival:enter', payload: { rival: rid, sector: best.s.id, name: best.s.name, score: +best.score.toFixed(1) } };
}

// Customers that move from the player to the rival in 1 tier.
export function moveCount(n, strength, H, limit, m, mRival) {
  return n * (strength / 100) * RIVAL.MOVE_RATE * (1 + Math.max(0, H / limit - 1))
    * Math.max(RIVAL.MIN_PRICE_FACTOR, 1 + m - mRival);
}

export function rivalRevenue(s) {
  if (!s.rival) return 0;
  const price = RIVALS[s.rival.id].price;
  return TIER_IDS.reduce((x, t) => x + s.rival.customers[t] * TIERS[t].tariff * price, 0);
}

// Buyout = rival monthly revenue × 24 × (1.5 − GS ÷ 100)
export function buyoutCost(state, s) {
  return rivalRevenue(s) * RIVAL.BUYOUT_MONTHS * (1.5 - state.meters.gs / 100);
}

function overLimit(s) {
  return TIER_IDS.some((t) => s.customers[t] > 0 && s.lastH > TIERS[t].limitH);
}

// The month step for every rival presence. Returns events.
export function rivalsMonth(state, rng) {
  const events = [];
  const growth = diff(state).rivalGrowth;
  for (const s of state.sectors) {
    const rv = s.rival;
    if (!rv) continue;
    const def = RIVALS[rv.id];
    rv.H = rng.int(def.outage[0], def.outage[1]);

    // Strength: + 3 a month, unless the player gives better service (fewer outage hours) there.
    const better = s.owned && s.lastH < rv.H;
    if (!better) rv.strength += RIVAL.GROWTH * growth;
    if (s.owned && overLimit(s)) rv.strength += RIVAL.OUTAGE_BONUS * growth;
    if (s.discount > 0) rv.strength -= RIVAL.CUT_STRENGTH_PER_10 * Math.round(s.discount * 10);
    rv.strength = Math.min(RIVAL.MAX_STRENGTH, rv.strength);

    // Customers move to the rival; the rival also wins unserved customers.
    const pot = SECTOR_TYPES[s.type].potential;
    for (const t of TIER_IDS) {
      if (!pot[t]) continue;
      if (s.owned && s.customers[t] > 0) {
        const m = state.prices[t] * (1 - s.discount);
        const n = Math.min(s.customers[t], roundChance(moveCount(s.customers[t], rv.strength, s.lastH, TIERS[t].limitH, m, def.price), rng));
        s.customers[t] -= n;
        rv.customers[t] += n;
      }
      const free = Math.max(0, pot[t] - s.customers[t] - rv.customers[t]);
      rv.customers[t] += roundChance(free * RIVAL.NEW_RATE * (rv.strength / RIVAL.NEW_STRENGTH_DIV), rng);
    }

    // The rival leaves at strength 0, or after 6 months under 5 % of the customers.
    const all = sum(s.customers) + sum(rv.customers);
    rv.lowMonths = all > 0 && sum(rv.customers) / all < RIVAL.LEAVE_SHARE ? rv.lowMonths + 1 : 0;
    if (rv.strength <= 0 || rv.lowMonths >= RIVAL.LEAVE_MONTHS) {
      events.push({ type: 'rival:leave', payload: { rival: rv.id, sector: s.id, name: s.name } });
      s.rival = null;
    }
  }
  // Local price cut of 30 %: GS − 2 each month (unfair price).
  const deep = state.sectors.filter((s) => s.owned && s.discount >= RIVAL.DISCOUNTS[3] - 1e-9).length;
  if (deep) state.meters.gs = clampMeter(state.meters.gs + RIVAL.CUT_GS_AT_30 * deep);

  for (const rid of RIVAL_IDS) {
    const e = tryEnter(state, rng, rid);
    if (e) events.push(e);
  }
  return events;
}

// ---------- the player's 5 answers ----------

export function setFranchise(state, sectorId, on) {
  if (globalEffects(state).franchiseSectors <= 0 || !state.sectors[sectorId]) return false;
  const list = state.rivalPolicy.franchise.filter((x) => x !== sectorId);
  if (on) {
    if (list.length >= RIVAL.FRANCHISE_MAX) return false;
    list.push(sectorId);
  }
  state.rivalPolicy.franchise = list;
  return true;
}

export function canMonopoly(state) {
  return globalEffects(state).monopolyCharter && state.meters.gs > RIVAL.MONOPOLY_GS && !state.rivalPolicy.monopolyCharter;
}

export function monopolyCharter(state) {
  if (!canMonopoly(state)) return false;
  for (const s of state.sectors) s.rival = null;
  state.rivalPolicy.monopolyCharter = true;
  state.meters.gs = clampMeter(state.meters.gs + RIVAL.MONOPOLY_GS_SHOCK);
  return true;
}

export function canBuyout(state, sectorId) {
  const s = state.sectors[sectorId];
  return !!s?.owned && !!s.rival && state.company.cash >= buyoutCost(state, s);
}

// The player gets the rival's customers (in tiers the player can serve). The rival leaves.
export function buyout(state, sectorId) {
  if (!canBuyout(state, sectorId)) return false;
  const s = state.sectors[sectorId];
  const g = globalEffects(state);
  spendCapex(state, buyoutCost(state, s));   // an investment: it counts for net worth
  for (const t of TIER_IDS) if (g.unlockTier.includes(t)) s.customers[t] += s.rival.customers[t];
  s.rival = null;
  return true;
}

export function setDiscount(state, sectorId, d) {
  const s = state.sectors[sectorId];
  if (!s?.owned || !RIVAL.DISCOUNTS.some((x) => Math.abs(x - d) < 1e-9)) return false;
  s.discount = d;
  return true;
}

export const rivalShare = (state) => {
  let r = 0;
  for (const s of state.sectors) r += sum(s.rival?.customers);
  return r;
};
