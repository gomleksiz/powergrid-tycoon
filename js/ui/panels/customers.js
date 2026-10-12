// Customers panel: customers, price and bill for each tier.

import { h, fill, fillKeyed } from '../dom.js';
import { dispatch } from '../../core/store.js';
import { CAMPAIGN } from '../../data/offices.js';
import { canStartCampaign, campaignCost } from '../../sim/marketing.js';
import { sectorRevenue } from '../../sim/economy.js';
import { T } from '../../data/text.js';
import { TIER_IDS, TIERS } from '../../data/balance.js';
import { SECTOR_TYPES } from '../../data/sectors.js';
import { customersByTier, totalCustomers, ownedSectors, marketShare } from '../../sim/economy.js';
import { prosumerShareAll } from '../../sim/prosumers.js';
import { sectorPotential } from '../../sim/setup.js';
import { isTierUnlocked } from '../../sim/effects.js';
import { num, numFull, money, mult, hours, pct } from '../format.js';

export function createCustomersPanel() {
  const total = h('p', { class: 'big-number' });
  const change = h('p', { class: 'dim small' });
  const potential = h('p', { class: 'dim small' });
  const share = h('p', { class: 'small' });
  const pros = h('p', { class: 'small' });
  const rows = h('tbody');

  // Marketing campaigns (version 1.1)
  const pick = { cut: CAMPAIGN.CUTS[1], months: CAMPAIGN.MONTHS[1], sector: null };
  const seg = (values, key, text) => h('div', { class: `seg seg${values.length}`, role: 'group' }, values.map((v) => h('button', {
    class: 'btn', 'data-v': String(v), onclick: () => { pick[key] = v; refresh(); },
  }, text(v))));
  const cutSeg = seg(CAMPAIGN.CUTS, 'cut', (v) => T.campaignCutText(Math.round(v * 100)));
  const monthSeg = seg(CAMPAIGN.MONTHS, 'months', (v) => T.campaignMonthsText(v));
  const where = h('select', { class: 'branch-select', 'aria-label': T.campaignWhere, onchange: () => { pick.sector = where.value === 'all' ? null : Number(where.value); refresh(); } });
  const costText = h('p', { class: 'small' });
  const whyNot = h('p', { class: 'small warn' });
  const startBtn = h('button', { class: 'btn btn-primary', onclick: () => dispatch({ type: 'campaign/start', payload: { ...pick } }) }, T.campaignStart);
  const running = h('div');
  const needsOffice = h('p', { class: 'dim small' }, T.marketingNeedsOffice);
  const builder = h('div', {},
    h('h4', {}, T.campaignCutLabel), cutSeg,
    h('h4', {}, T.campaignMonthsLabel), monthSeg,
    h('h4', {}, T.campaignWhere), where,
    costText, whyNot, h('div', { class: 'actions' }, startBtn));
  let last = null;
  const refresh = () => last && update(last);

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' },
      h('h3', {}, T.customersTitle),
      total, change, share, pros, potential,
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data' },
          h('thead', {}, h('tr', {},
            h('th', {}, T.colTier), h('th', {}, T.colCustomers), h('th', {}, T.colPrice),
            h('th', {}, T.colRevenue), h('th', {}, T.colLimit))),
          rows)),
    ),
    h('section', { class: 'card' },
      h('h3', {}, T.marketingTitle),
      h('p', { class: 'dim small' }, T.campaignHelp),
      needsOffice, running, builder),
  );

  function updateCampaigns(s) {
    const hired = s.offices.marketing.hired;
    needsOffice.hidden = hired;
    builder.hidden = !hired;
    const owned = ownedSectors(s);
    fillKeyed(where, owned.map((x) => x.id).join(','), () => [
      h('option', { value: 'all' }, T.campaignAll),
      owned.map((x) => h('option', { value: String(x.id) }, x.name)),
    ]);
    if (pick.sector !== null && !s.sectors[pick.sector]?.owned) pick.sector = null;
    where.value = pick.sector === null ? 'all' : String(pick.sector);
    for (const b of cutSeg.children) b.setAttribute('aria-pressed', String(Number(b.dataset.v) === pick.cut));
    for (const b of monthSeg.children) b.setAttribute('aria-pressed', String(Number(b.dataset.v) === pick.months));
    const scope = pick.sector === null ? owned : [s.sectors[pick.sector]];
    const loss = scope.reduce((x, sec) => x + sectorRevenue(s, sec), 0) * pick.cut;
    costText.textContent = T.campaignCost(money(campaignCost(s, pick.sector)), money(loss));
    const ok = canStartCampaign(s, pick);
    startBtn.disabled = !ok.ok;
    whyNot.textContent = ok.ok ? '' : T.campaignReasons[ok.reason];
    whyNot.hidden = ok.ok || !T.campaignReasons[ok.reason];

    fillKeyed(running, s.campaigns.map((c) => `${c.id}:${c.left}`).join('|'), () => s.campaigns.map((c) => h('div', { class: 'cut-row' },
      h('span', { class: 'small' }, T.campaignActive(Math.round(c.cut * 100), c.sector === null ? T.campaignAll : s.sectors[c.sector].name, c.left)),
      h('button', { class: 'btn btn-danger', onclick: () => dispatch({ type: 'campaign/stop', payload: { id: c.id } }) }, T.campaignStop))));
  }

  function update(s) {
    last = s;
    updateCampaigns(s);
    const n = totalCustomers(s);
    total.textContent = T.customersTotal(numFull(n));
    const r = s.report?.customers;
    change.textContent = r ? T.lastMonthChange(num(r.gained), num(r.lost)) : '';
    let pot = 0;
    for (const sec of ownedSectors(s)) {
      for (const t of TIER_IDS) if (isTierUnlocked(s, t)) pot += sectorPotential(sec)[t] ?? 0;
    }
    potential.textContent = T.potentialInfo(numFull(pot));
    share.textContent = T.marketShareLine(pct(marketShare(s), 1));
    const nPros = s.sectors.reduce((x, sec) => x + (sec.owned ? sec.prosumers : 0), 0);
    pros.hidden = nPros === 0;
    pros.textContent = T.prosumersLine(numFull(nPros), pct(prosumerShareAll(s)));

    const by = customersByTier(s);
    fill(rows, TIER_IDS.map((t) => {
      const open = isTierUnlocked(s, t);
      return h('tr', { class: open ? '' : 'locked' },
        h('td', {}, open ? '' : '🔒 ', T.tierNames[t]),
        h('td', { class: 'num' }, open ? numFull(by[t]) : '–'),
        h('td', { class: 'num' }, mult(s.prices[t])),
        h('td', { class: 'num', title: open ? numFull(by[t] * TIERS[t].tariff * s.prices[t]) : '' },
          open ? money(by[t] * TIERS[t].tariff * s.prices[t]) : '–'),
        h('td', { class: 'num' }, hours(TIERS[t].limitH)));
    }));
  }

  return { id: 'customers', el, update };
}
