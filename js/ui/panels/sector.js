// Sector panel: the selected sector. Type, hazard, customers, buildings, build menu.

import { h, fill, fillKeyed } from '../dom.js';
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
import { money, numFull, hours } from '../format.js';
import { dispatch } from '../../core/store.js';
import { sectorStatus, capacityMw, peakMw } from '../../sim/grid.js';
import { REPAIR, TIERS as TIER_DATA } from '../../data/balance.js';
import { canOpenSector, openCost } from '../../sim/growth.js';
import { warningsFor, canPrep, weekIndex } from '../../sim/disasters.js';
import { DISASTER } from '../../data/disasters.js';

export function createSectorPanel({ onBuild }) {
  const head = h('div', { class: 'sector-head' });
  const info = h('div');
  const openBox = h('div');
  const warnBox = h('div');
  const customers = h('div');
  const buildings = h('div');
  const grid = h('div');
  const prioButtons = REPAIR.PRIORITIES.map((p) => h('button', {
    class: 'btn', 'aria-pressed': 'false',
    onclick: () => dispatch({ type: 'sector/priority', payload: { sector: selected(getState()).id, priority: p } }),
  }, T.priorities[p]));
  const build = h('div', { class: 'build-list' });

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' }, head, warnBox, info, openBox),
    h('section', { class: 'card grid-card' }, h('h3', {}, T.gridTitle), grid,
      h('h4', {}, T.repairPriority), h('div', { class: 'seg seg3', role: 'group', 'aria-label': T.repairPriority }, prioButtons)),
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

    const warns = sec.owned ? warningsFor(s, sec.id) : [];
    const now = weekIndex(s.time.month, s.time.week);
    fillKeyed(warnBox, `${sec.id}|${warns.map((w) => w.id).join(',')}|${sec.prep}|${canPrep(s, sec.id)}|${now}`, () => (warns.length ? h('div', { class: 'note warn' },
      warns.map((w) => h('p', { class: 'small' }, '⚠ ', T.prepInSector(T.disasterNames[w.type], Math.max(1, weekIndex(w.month, w.week) - now)))),
      sec.prep ? h('p', { class: 'good small' }, T.prepDone(sec.name))
        : h('button', { class: 'btn btn-primary', disabled: !canPrep(s, sec.id),
          onclick: () => dispatch({ type: 'disaster/prep', payload: { sector: sec.id } }) }, T.stormPrep(money(DISASTER.PREP_COST))),
      h('p', { class: 'dim small' }, T.prepHelp(money(DISASTER.PREP_COST)))) : null));

    const oc = canOpenSector(s, sec.id);
    const cost = openCost(s);
    fillKeyed(openBox, `${sec.id}|${sec.owned}|${oc.ok}|${oc.reason}|${cost}`, () => (sec.owned ? null : [
      h('button', {
        class: 'btn btn-primary wide', disabled: !oc.ok,
        onclick: () => dispatch({ type: 'sector/open', payload: { sector: sec.id } }),
      }, T.openSector(cost === null ? '–' : money(cost))),
      oc.ok ? null : h('p', { class: 'small warn' }, T.openReasons[oc.reason](oc)),
    ]));

    const hz = Object.entries(type.hazard);
    fill(info,
      sec.rival ? h('p', { class: 'small bad' }, '⚔ ', T.sectorRival(T.rivalNames[sec.rival.id], Math.round(sec.rival.strength))) : null,
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

    const gridCard = grid.closest('.grid-card');
    gridCard.hidden = !sec.owned;
    if (sec.owned) {
      const st = sectorStatus(sec);
      const p = sec.lastParts;
      const limits = TIER_IDS.filter((t) => sec.customers[t] > 0).map((t) => `${T.tierNames[t]} ${hours(TIER_DATA[t].limitH)}`);
      fill(grid,
        h('p', { class: `status-line ${st}` }, T.statusIcon[st], ' ', T.statusText[st](hours(sec.lastH))),
        h('p', { class: 'dim small' }, T.limitsLine(limits.join(' · ') || '–')),
        meter(T.health, sec.health, 100, sec.health < 40 ? 'bad' : sec.health < 60 ? 'warn' : 'good'),
        sec.damage > 0 ? meter(T.damage, sec.damage, 100, 'bad') : null,
        h('table', { class: 'data' }, h('tbody', {},
          row(T.hParts.wear, hours(p.wear)),
          row(T.hParts.overload, hours(p.overload)),
          row(T.hParts.damage, hours(p.damage)),
          row(T.hParts.shortage, hours(p.shortage)),
          row(T.hParts.R, `× ${p.R.toFixed(2)}`),
          row(T.hParts.total, hours(sec.lastH), 'total'))),
        h('p', { class: 'dim small' }, T.capacityLine(capacityMw(sec).toFixed(1), peakMw(s, sec).toFixed(1))));
      REPAIR.PRIORITIES.forEach((pr, i) => prioButtons[i].setAttribute('aria-pressed', String(sec.priority === pr)));
    }

    const counts = {};
    for (const b of sec.buildings) counts[b.type] = (counts[b.type] ?? 0) + 1;
    fill(buildings, Object.keys(counts).length
      ? h('ul', { class: 'plain' }, Object.entries(counts).map(([t, n]) => h('li', {}, `${n} × ${T.buildings[t]}`)))
      : h('p', { class: 'dim small' }, T.noBuildings));

    if (!sec.owned) {
      fillKeyed(build, 'locked', () => h('p', { class: 'dim small' }, T.buildNeedsOwned));
      return;
    }
    const key = BUILDING_IDS.map((id) => `${buildAllowed(s, id).reason ?? 'ok'}:${capexCost(s, BUILDINGS[id].cost)}`).join('|');
    fillKeyed(build, key, () => BUILDING_IDS.map((id) => {
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

  function meter(label, v, max, cls) {
    return h('div', { class: 'meter-row' },
      h('span', {}, label),
      h('span', { class: 'bar', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': Math.round(v), 'aria-label': label },
        h('span', { class: `fill ${cls}`, style: `width:${Math.max(0, Math.min(100, (v / max) * 100))}%` })),
      h('span', { class: 'num' }, Math.round(v)));
  }

  function row(label, value, cls = '') {
    return h('tr', { class: cls }, h('td', {}, label), h('td', { class: 'num' }, value));
  }

  on('ui:change', () => { const s = getState(); if (s && !el.hidden) update(s); });
  return { id: 'sector', el, update };
}
