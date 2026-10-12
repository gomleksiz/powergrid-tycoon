// Customers panel: customers, price and bill for each tier.

import { h, fill } from '../dom.js';
import { T } from '../../data/text.js';
import { TIER_IDS, TIERS } from '../../data/balance.js';
import { SECTOR_TYPES } from '../../data/sectors.js';
import { customersByTier, totalCustomers, ownedSectors } from '../../sim/economy.js';
import { isTierUnlocked } from '../../sim/effects.js';
import { num, numFull, money, mult, hours } from '../format.js';

export function createCustomersPanel() {
  const total = h('p', { class: 'big-number' });
  const change = h('p', { class: 'dim small' });
  const potential = h('p', { class: 'dim small' });
  const rows = h('tbody');

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' },
      h('h3', {}, T.customersTitle),
      total, change, potential,
      h('div', { class: 'table-wrap' },
        h('table', { class: 'data' },
          h('thead', {}, h('tr', {},
            h('th', {}, T.colTier), h('th', {}, T.colCustomers), h('th', {}, T.colPrice),
            h('th', {}, T.colRevenue), h('th', {}, T.colLimit))),
          rows)),
    ),
  );

  function update(s) {
    const n = totalCustomers(s);
    total.textContent = T.customersTotal(numFull(n));
    const r = s.report?.customers;
    change.textContent = r ? T.lastMonthChange(num(r.gained), num(r.lost)) : '';
    let pot = 0;
    for (const sec of ownedSectors(s)) {
      for (const t of TIER_IDS) if (isTierUnlocked(s, t)) pot += SECTOR_TYPES[sec.type].potential[t] ?? 0;
    }
    potential.textContent = T.potentialInfo(numFull(pot));

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
