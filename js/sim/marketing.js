// Marketing campaigns and the price customers really pay (version 1.1).
// A campaign cuts the price in all owned sectors or in 1 sector for some months.
// It needs the Marketing department (sim/offices.js).

import { CAMPAIGN } from '../data/offices.js';

const ownedSectors = (state) => state.sectors.filter((s) => s.owned);

export const campaignCovers = (c, sector) => c.sector === null || c.sector === sector.id;

// The biggest campaign cut that covers this sector (0 when none).
export function campaignCut(state, sector) {
  let cut = 0;
  for (const c of state.campaigns ?? []) if (campaignCovers(c, sector)) cut = Math.max(cut, c.cut);
  return cut;
}

// The local price cut (Rivals tab) and a campaign together.
export function priceCut(state, sector) {
  return 1 - (1 - (sector.discount ?? 0)) * (1 - campaignCut(state, sector));
}

export const effectivePrice = (state, sector, tier) => state.prices[tier] * (1 - priceCut(state, sector));

// × new customers while a campaign runs here.
export const campaignBuzz = (state, sector) => (campaignCut(state, sector) > 0 ? CAMPAIGN.BUZZ : 1);

export function campaignCost(state, sectorId) {
  return CAMPAIGN.SETUP_PER_SECTOR * (sectorId === null ? ownedSectors(state).length : 1);
}

// → { ok, reason }
export function canStartCampaign(state, { cut, months, sector = null }) {
  if (!state.offices.marketing.hired) return { ok: false, reason: 'noOffice' };
  if (!CAMPAIGN.CUTS.includes(cut) || !CAMPAIGN.MONTHS.includes(months)) return { ok: false, reason: 'bad' };
  if (sector !== null && !state.sectors[sector]?.owned) return { ok: false, reason: 'notOwned' };
  if (state.campaigns.length >= CAMPAIGN.MAX_ACTIVE) return { ok: false, reason: 'max' };
  if (state.campaigns.some((c) => c.sector === sector)) return { ok: false, reason: 'running' };
  if (state.company.cash < campaignCost(state, sector)) return { ok: false, reason: 'cash' };
  return { ok: true };
}

export function startCampaign(state, opts) {
  if (!canStartCampaign(state, opts).ok) return false;
  const cost = campaignCost(state, opts.sector ?? null);
  state.company.cash -= cost;
  state.company.otherCostsThisMonth += cost;
  state.campaigns.push({ id: state.nextId++, cut: opts.cut, months: opts.months, left: opts.months, sector: opts.sector ?? null });
  return true;
}

export function stopCampaign(state, id) {
  const before = state.campaigns.length;
  state.campaigns = state.campaigns.filter((c) => c.id !== id);
  return state.campaigns.length < before;
}

// The month step, after customers and money. Returns events.
export function campaignsMonth(state) {
  const events = [];
  if (state.campaigns.some((c) => c.cut >= CAMPAIGN.DEEP_CUT)) {
    state.meters.gs = Math.max(0, Math.min(100, state.meters.gs + CAMPAIGN.DEEP_GS));
  }
  for (const c of state.campaigns) c.left -= 1;
  for (const c of state.campaigns.filter((x) => x.left <= 0)) {
    events.push({ type: 'news', payload: { key: 'campaignEnd', sector: c.sector === null ? null : state.sectors[c.sector].name, cut: Math.round(c.cut * 100) } });
  }
  state.campaigns = state.campaigns.filter((c) => c.left > 0);
  return events;
}
