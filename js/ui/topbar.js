// Top bar: menu, company, date with week pips, speed buttons, panel toggle.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { TIME } from '../data/balance.js';
import { subscribe, getState } from '../core/store.js';
import { on } from '../core/bus.js';
import { dateLabel } from '../core/time.js';

export function mountTopbar(root, { loop, onMenu, onTogglePanel }) {
  const company = h('span', { class: 'company' });
  const date = h('strong');
  const pips = h('span', { class: 'week-pips', 'aria-hidden': 'true' },
    Array.from({ length: TIME.WEEKS_PER_MONTH }, () => h('span')));
  const weekText = h('span', { class: 'visually-hidden' });

  const speedButtons = TIME.SPEEDS.map((s) => h('button', {
    class: 'btn',
    'aria-label': T.speedAria(s),
    title: T.speedAria(s),
    onclick: () => (s === 0 ? loop.togglePause() : loop.setSpeed(s)),
  }, s === 0 ? '⏸' : T.speedLabel(s)));

  fill(root,
    h('button', { class: 'btn', onclick: onMenu, 'aria-label': T.menu, title: `${T.menu} (Esc)` }, '☰'),
    company,
    h('span', { class: 'spacer' }),
    h('div', { class: 'date' }, date, pips, weekText),
    h('div', { class: 'speeds', role: 'group', 'aria-label': 'Speed' }, speedButtons),
    h('span', { class: 'spacer' }),
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
  }

  function renderState(state) {
    if (!state) return;
    company.textContent = state.company.name;
    date.textContent = dateLabel(state.time.month);
    [...pips.children].forEach((p, i) => p.classList.toggle('on', i < state.time.week));
    weekText.textContent = T.week(state.time.week);
  }

  subscribe((state) => renderState(state));
  on('speed:change', renderSpeed);
  renderSpeed(loop.getSpeed());
  renderState(getState());
}
