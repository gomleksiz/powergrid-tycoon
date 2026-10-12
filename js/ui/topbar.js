// Top bar: menu, company, date with week pips, speed buttons, panel toggle.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { TIME } from '../data/balance.js';
import { subscribe, getState } from '../core/store.js';
import { on } from '../core/bus.js';
import { dateLabel } from '../core/time.js';
import { totalCustomers } from '../sim/economy.js';
import { money, moneyFull, signedMoney, num, numFull } from './format.js';

export function mountTopbar(root, { loop, onMenu, onTogglePanel }) {
  const company = h('span', { class: 'company' });
  const date = h('strong');
  const pips = h('span', { class: 'week-pips', 'aria-hidden': 'true' },
    Array.from({ length: TIME.WEEKS_PER_MONTH }, () => h('span')));
  const weekText = h('span', { class: 'visually-hidden' });
  const cash = h('strong', { class: 'cash-value' });
  const delta = h('span', { class: 'cash-delta small' });
  const cashBox = h('div', { class: 'stat cash', role: 'group' }, h('span', { 'aria-hidden': 'true' }, '💰'), h('span', { class: 'stack' }, cash, delta));
  const customers = h('span', { class: 'stat customers' });

  const speedButtons = TIME.SPEEDS.map((s) => h('button', {
    class: s === 0 ? 'btn' : 'btn speed-n',
    'aria-label': T.speedAria(s),
    title: T.speedAria(s),
    onclick: () => (s === 0 ? loop.togglePause() : loop.setSpeed(s)),
  }, s === 0 ? '⏸' : T.speedLabel(s)));

  // Phone: 1 button that goes 1x → 2x → 5x → 1x.
  const running = TIME.SPEEDS.filter((s) => s > 0);
  const cycle = h('button', {
    class: 'btn speed-cycle',
    onclick: () => loop.setSpeed(running[(running.indexOf(loop.lastSpeed()) + 1) % running.length]),
  });

  fill(root,
    h('button', { class: 'btn', onclick: onMenu, 'aria-label': T.menu, title: `${T.menu} (Esc)` }, '☰'),
    company,
    h('span', { class: 'spacer' }),
    h('div', { class: 'date' }, date, pips, weekText),
    cashBox,
    customers,
    h('span', { class: 'spacer' }),
    h('div', { class: 'speeds', role: 'group', 'aria-label': 'Speed' }, speedButtons, cycle),
    h('button', { class: 'btn panel-toggle', onclick: onTogglePanel, 'aria-label': T.panel }, '▤'),
  );

  function renderSpeed(speed) {
    TIME.SPEEDS.forEach((s, i) => {
      speedButtons[i].setAttribute('aria-pressed', String(s === speed));
    });
    speedButtons[0].textContent = speed === 0 ? '▶' : '⏸';
    speedButtons[0].setAttribute('aria-label', speed === 0 ? T.play : T.pause);
    speedButtons[0].setAttribute('aria-pressed', 'false');
    speedButtons[0].classList.toggle('btn-primary', speed === 0);
    const next = loop.lastSpeed();
    cycle.textContent = T.speedLabel(next);
    cycle.setAttribute('aria-label', T.speedCycle(next));
  }

  function renderState(state) {
    if (!state) return;
    company.textContent = state.company.name;
    date.textContent = dateLabel(state.time.month);
    [...pips.children].forEach((p, i) => p.classList.toggle('on', i < state.time.week));
    weekText.textContent = T.week(state.time.week);
    const c = state.company;
    cash.textContent = money(c.cash);
    cash.classList.toggle('bad', c.cash < 0);
    const hasLast = state.history.net.length > 0;
    delta.textContent = hasLast ? signedMoney(c.lastNet) : '';
    delta.className = `cash-delta small ${c.lastNet >= 0 ? 'good' : 'bad'}`;
    cashBox.title = T.cashAria(moneyFull(c.cash), hasLast ? moneyFull(c.lastNet) : '–');
    cashBox.setAttribute('aria-label', cashBox.title);
    const n = totalCustomers(state);
    customers.textContent = `👥 ${num(n)}`;
    customers.title = T.customersAria(numFull(n));
  }

  subscribe((state) => renderState(state));
  on('speed:change', renderSpeed);
  renderSpeed(loop.getSpeed());
  renderState(getState());
}
