// Rivals panel: where the rivals are, and the 5 ways to fight back.

import { h, fillKeyed } from '../dom.js';
import { T } from '../../data/text.js';
import { RIVAL_IDS, RIVAL } from '../../data/rivals.js';
import { TIER_IDS } from '../../data/balance.js';
import { dispatch } from '../../core/store.js';
import { dateLabel } from '../../core/time.js';
import { globalEffects } from '../../sim/effects.js';
import { buyoutCost, canBuyout, canMonopoly, franchiseActive, enterMonth } from '../../sim/rivals.js';
import { money, numFull, pct } from '../format.js';

const sum = (o) => TIER_IDS.reduce((n, t) => n + (o?.[t] ?? 0), 0);

export function createRivalsPanel() {
  const list = h('div', { class: 'proj-list' });
  const cuts = h('div', { class: 'proj-list' });
  const charters = h('div');

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' }, h('h3', {}, T.rivalsTitle), list, h('p', { class: 'dim small' }, T.beBetter)),
    h('section', { class: 'card' }, h('h3', {}, T.priceCutTitle), h('p', { class: 'dim small' }, T.priceCutHelp), cuts),
    h('section', { class: 'card' }, h('h3', {}, T.chartersTitle), charters),
  );

  function rivalItem(s, sec) {
    const rv = sec.rival;
    const n = sum(rv.customers);
    const all = n + sum(sec.customers);
    const cost = buyoutCost(s, sec);
    return h('div', { class: 'proj' },
      h('div', { class: 'proj-head' }, h('strong', {}, T.rivalIn(T.rivalNames[rv.id], sec.name)),
        h('span', { class: `tag ${rv.id}` }, T.rivalLetters[rv.id])),
      rv.drive > 0 ? h('p', { class: 'small warn' }, T.rivalDriveLine(rv.drive)) : null,
      h('div', { class: 'meter-row' }, h('span', {}, T.rivalStrength),
        h('span', { class: 'bar' }, h('span', { class: 'fill bad', style: `width:${Math.max(0, Math.min(100, rv.strength))}%` })),
        h('span', { class: 'num' }, Math.round(rv.strength))),
      h('p', { class: 'small' }, T.rivalCustomers(numFull(n), pct(all ? n / all : 0))),
      sec.owned
        ? h('div', { class: 'proj-actions' }, h('button', {
          class: 'btn btn-primary', disabled: !canBuyout(s, sec.id), title: T.buyoutHelp,
          onclick: () => dispatch({ type: 'rival/buyout', payload: { sector: sec.id } }),
        }, T.buyout(money(cost))))
        : h('p', { class: 'dim small' }, T.rivalUnowned));
  }

  function update(s) {
    const present = s.sectors.filter((x) => x.rival);
    const key = present.map((x) => `${x.id}:${x.rival.id}:${Math.round(x.rival.strength)}:${sum(x.rival.customers)}:${canBuyout(s, x.id)}:${x.rival.drive ?? 0}`).join('|')
      + `|${s.meters.gs.toFixed(0)}`;
    fillKeyed(list, key || 'none', () => (present.length ? present.map((x) => rivalItem(s, x))
      : [h('p', { class: 'small' }, T.rivalsNone),
        ...RIVAL_IDS.filter((id) => enterMonth(s, id) !== null)
          .map((id) => h('p', { class: 'dim small' }, T.rivalsComing(T.rivalNames[id], dateLabel(enterMonth(s, id)))))]));

    const owned = s.sectors.filter((x) => x.owned);
    fillKeyed(cuts, owned.map((x) => `${x.id}:${x.discount}`).join('|'), () => owned.map((sec) => h('div', { class: 'cut-row' },
      h('span', { class: 'small' }, sec.name, sec.rival ? ` (${T.rivalNames[sec.rival.id]})` : ''),
      h('div', { class: 'seg seg4', role: 'group', 'aria-label': `${T.priceCutTitle}: ${sec.name}` }, RIVAL.DISCOUNTS.map((d) => h('button', {
        class: 'btn', 'aria-pressed': String(Math.abs(sec.discount - d) < 1e-9),
        onclick: () => dispatch({ type: 'sector/discount', payload: { sector: sec.id, discount: d } }),
      }, T.priceCut(Math.round(d * 100))))))));

    const g = globalEffects(s);
    const fr = g.franchiseSectors;
    const cKey = `${fr}|${franchiseActive(s)}|${s.rivalPolicy.franchise.join(',')}|${canMonopoly(s)}|${g.monopolyCharter}|${s.rivalPolicy.monopolyCharter}|${owned.length}`;
    fillKeyed(charters, cKey, () => [
      h('p', { class: 'small' }, T.franchiseHelp(RIVAL.FRANCHISE_MAX)),
      fr <= 0 ? h('p', { class: 'dim small' }, T.franchiseOff)
        : [
          franchiseActive(s) ? null : h('p', { class: 'small warn' }, T.franchiseLowGs),
          h('div', { class: 'proj-actions wrap' }, s.sectors.map((sec) => {
            const on = s.rivalPolicy.franchise.includes(sec.id);
            return h('button', {
              class: 'btn', 'aria-pressed': String(on),
              disabled: !on && s.rivalPolicy.franchise.length >= RIVAL.FRANCHISE_MAX,
              onclick: () => dispatch({ type: 'rival/franchise', payload: { sector: sec.id, on: !on } }),
            }, (on ? '🛡 ' : ''), sec.name);
          })),
        ],
      h('p', { class: 'small' }, T.monopolyHelp),
      s.rivalPolicy.monopolyCharter ? h('p', { class: 'good small' }, T.monopolyDone)
        : !g.monopolyCharter ? h('p', { class: 'dim small' }, T.monopolyOff)
          : h('button', { class: 'btn btn-danger', disabled: !canMonopoly(s), onclick: () => dispatch({ type: 'rival/monopoly' }) }, T.monopolyButton),
    ]);
  }

  return { id: 'rivals', el, update };
}

