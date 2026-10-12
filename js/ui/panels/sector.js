// Sector panel: the selected sector. Type, hazard, customers, buildings, build menu.

import { h, fill } from '../dom.js';
import { T } from '../../data/text.js';
import { TIER_IDS } from '../../data/balance.js';
import { SECTOR_TYPES } from '../../data/sectors.js';
import { BUILDINGS, BUILDING_IDS } from '../../data/buildings.js';
import { NODES } from '../../data/techTree.js';
import { ui } from '../uiState.js';
import { on } from '../../core/bus.js';
import { getState } from '../../core/store.js';
import { buildAllowed, capexCost } from '../../sim/build.js';
import { isTierUnlocked } from '../../sim/effects.js';
import { money, numFull } from '../format.js';

export function createSectorPanel({ onBuild }) {
  const head = h('div', { class: 'sector-head' });
  const info = h('div');
  const customers = h('div');
  const buildings = h('div');
  const build = h('div', { class: 'build-list' });

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' }, head, info),
    h('section', { class: 'card' }, h('h3', {}, T.customersTitle), customers),
    h('section', { class: 'card' }, h('h3', {}, T.buildingsTitle), buildings),
    h('section', { class: 'card build-card' }, h('h3', {}, T.buildTitle), build),
  );

  function selected(s) {
    return s.sectors[ui.selected ?? s.sectors.find((x) => x.owned)?.id ?? 0];
  }

  function update(s) {
    const sec = selected(s);
    const type = SECTOR_TYPES[sec.type];
    fill(head,
      h('h3', {}, sec.owned ? '' : '🔒 ', sec.name),
      h('p', { class: 'dim small' }, T.sectorTypes[sec.type], ' · ', sec.owned ? T.sectorOwned : T.sectorLocked));

    const hz = Object.entries(type.hazard);
    fill(info,
      hz.length
        ? hz.map(([k, m]) => h('p', { class: 'small warn' }, '⚠ ', T.hazardLine(T.hazards[k], m)))
        : h('p', { class: 'small dim' }, T.hazardNone),
      type.windBonus ? h('p', { class: 'small' }, T.windBonus(Math.round(type.windBonus * 100))) : null);

    fill(customers, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', {}, T.colTier), h('th', { class: 'num' }, T.colCustomers), h('th', { class: 'num' }, T.colPotential))),
      h('tbody', {}, TIER_IDS.filter((t) => type.potential[t]).map((t) => h('tr', { class: isTierUnlocked(s, t) ? '' : 'locked' },
        h('td', {}, isTierUnlocked(s, t) ? '' : '🔒 ', T.tierNames[t]),
        h('td', { class: 'num' }, sec.owned ? numFull(sec.customers[t]) : '–'),
        h('td', { class: 'num' }, numFull(type.potential[t])))))));

    const counts = {};
    for (const b of sec.buildings) counts[b.type] = (counts[b.type] ?? 0) + 1;
    fill(buildings, Object.keys(counts).length
      ? h('ul', { class: 'plain' }, Object.entries(counts).map(([t, n]) => h('li', {}, `${n} × ${T.buildings[t]}`)))
      : h('p', { class: 'dim small' }, T.noBuildings));

    if (!sec.owned) {
      fill(build, h('p', { class: 'dim small' }, T.buildNeedsOwned));
      return;
    }
    fill(build, BUILDING_IDS.map((id) => {
      const b = BUILDINGS[id];
      const ok = buildAllowed(s, id);
      const why = ok.ok ? T.buildingInfo[id]
        : ok.reason === 'locked' ? T.tierLocked(NODES[ok.tech].name)
          : T.buildReasons[ok.reason];
      return h('button', {
        class: `btn build-btn ${ok.ok ? '' : 'off'}`,
        disabled: !ok.ok && ok.reason === 'locked',
        onclick: () => (ok.ok ? onBuild(id) : null),
        'aria-label': `${T.buildings[id]}, ${money(capexCost(s, b.cost))}. ${why}`,
      },
      h('span', { class: 'bb-name' }, T.buildings[id]),
      h('span', { class: 'bb-cost' }, money(capexCost(s, b.cost))),
      h('span', { class: 'bb-size dim' }, `${b.size}×${b.size}`),
      h('span', { class: 'bb-why dim' }, why));
    }));
  }

  on('ui:change', () => { const s = getState(); if (s && !el.hidden) update(s); });
  return { id: 'sector', el, update };
}
