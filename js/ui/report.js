// Monthly report card: money in, money out, customers. It does not pause the game.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { UI } from '../data/balance.js';
import { on } from '../core/bus.js';
import { dateLabel } from '../core/time.js';
import { money, moneyFull, signedMoney, num } from './format.js';

export function mountReport(root, { isEnabled = () => true } = {}) {
  const card = h('section', { class: 'report-card', hidden: true, 'aria-live': 'polite' });
  root.append(card);
  let timer = null;

  function line(label, value, cls = '') {
    return h('div', { class: `rl ${cls}` }, h('span', {}, label), h('span', { class: 'num', title: moneyFull(value) }, money(value)));
  }

  function show(r) {
    const m = r.money;
    const outs = [
      [T.energy, m.energy], [T.wages, m.wages], [T.upkeep, m.upkeep], [T.budget, m.budget],
      [T.interest, m.interest], [T.penalties, m.penalties], [T.tax, m.tax],
    ].filter(([, v]) => Math.abs(v) >= 1);

    fill(card,
      h('div', { class: 'report-head' },
        h('h3', {}, T.reportTitle(dateLabel(r.month))),
        h('button', { class: 'btn', 'aria-label': T.closeReport, onclick: hide }, '✕')),
      h('div', { class: 'report-cols' },
        h('div', {},
          h('h4', {}, T.moneyIn),
          line(T.revenue, m.gross),
          m.withheld > 0 && line(T.withheld, -m.withheld, 'bad')),
        h('div', {},
          h('h4', {}, T.moneyOut),
          outs.map(([label, v]) => line(label, -v)))),
      h('div', { class: `rl total ${m.net >= 0 ? 'good' : 'bad'}` },
        h('span', {}, T.net), h('span', { class: 'num', title: moneyFull(m.net) }, signedMoney(m.net))),
      h('p', { class: 'small' }, T.customersLine(num(r.customers.gained), num(r.customers.lost))),
      r.staffCosts > 0 ? h('p', { class: 'dim small' }, T.staffCostsLine(money(r.staffCosts))) : null,
      r.capex > 0 ? h('p', { class: 'dim small' }, T.capexLine(money(r.capex))) : null,
      h('p', { class: 'dim small' }, T.wholesaleLine(`$${m.price.toFixed(3)}`)),
    );
    card.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(hide, UI.REPORT_SHOW_MS);
  }

  function hide() {
    card.hidden = true;
    clearTimeout(timer);
  }

  on('month:end', ({ report }) => { if (report && isEnabled()) show(report); });
  on('game:quit', hide);
  return { show, hide };
}
