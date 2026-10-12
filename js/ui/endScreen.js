// End screen: win or loss, grade, score parts and 4 line charts of the whole game.
// Loss rule warnings (red banners) also live here.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { subscribe, getState } from '../core/store.js';
import { on } from '../core/bus.js';
import { lossWarnings } from '../sim/victory.js';
import { drawLineChart } from './lineChart.js';
import { money, num, pct } from './format.js';

export function mountLossBanners(area) {
  const el = h('div', { class: 'loss-banners', role: 'alert' });
  area.append(el);
  let key = '';
  subscribe((s) => {
    if (!s) return;
    const w = lossWarnings(s);
    const k = w.map((x) => `${x.key}${x.left}`).join(',');
    if (k === key) return;
    key = k;
    fill(el, w.map((x) => h('div', { class: 'loss-banner' }, '⚠ ', T.lossBanner[x.key](x.left))));
  });
  on('game:quit', () => { key = ''; fill(el); });
}

export function mountEndScreen(root, { onLoadAuto, onLoadSlot, onTitle }) {
  const screen = h('section', { class: 'end-screen', hidden: true, 'aria-label': T.gameTitle });
  root.append(screen);

  function chart(title, series, opts) {
    const c = h('canvas', { class: 'chart', 'aria-label': title, role: 'img' });
    const legend = series.length > 1 ? h('p', { class: 'small dim' }, series.map((s) => s.label).join(' · ')) : null;
    return { el: h('div', { class: 'chart-box' }, h('h4', {}, title), c, legend), draw: () => drawLineChart(c, series, opts) };
  }

  function show(end) {
    const s = getState();
    const hist = s.history;
    const title = end.result === 'win' ? T.endWin(T.pathNames[end.path])
      : end.result === 'loss' ? T.endLoss[end.reason] : T.endTime;
    const charts = [
      chart(T.chartCash, [{ values: hist.cash, color: '#ffd23f', label: T.chartCash }], { format: money }),
      chart(T.chartCustomers, [{ values: hist.customers, color: '#6cb8ff', label: T.chartCustomers }], { format: num }),
      chart(T.chartMeters, [
        { values: hist.cs, color: '#3ad1a0', label: 'CS' },
        { values: hist.es, color: '#ffa53a', label: 'ES' },
        { values: hist.gs, color: '#c9b8ff', label: 'GS' },
      ], { min: 0, max: 100 }),
      chart(T.chartShare, [{ values: hist.share, color: '#ff5d6c', label: T.chartShare }], { format: (v) => pct(v), min: 0 }),
    ];
    const sc = end.score;
    fill(screen, h('div', { class: 'end-card' },
      h('h1', { class: `end-title ${end.result}` }, title),
      end.result === 'time' ? h('p', {}, T.endTimeText) : null,
      h('div', { class: 'grade-row' },
        h('span', { class: `grade grade-${sc.grade}` }, sc.grade),
        h('div', {},
          h('p', { class: 'big-number' }, T.scoreTotal(sc.total.toLocaleString('en-US'))),
          h('table', { class: 'data' }, h('tbody', {},
            Object.entries(sc.parts).map(([k, v]) => h('tr', {}, h('td', {}, T.scoreParts[k]), h('td', { class: 'num' }, Math.round(v).toLocaleString('en-US')))),
            h('tr', { class: 'total' }, h('td', {}, T.scoreMult(sc.mult)), h('td', { class: 'num' }, sc.total.toLocaleString('en-US'))))))),
      h('div', { class: 'chart-grid' }, charts.map((c) => c.el)),
      h('div', { class: 'actions' },
        end.result === 'loss' ? h('button', { class: 'btn btn-primary', onclick: onLoadAuto }, T.loadAuto) : null,
        h('button', { class: 'btn', onclick: onLoadSlot }, T.loadSlot),
        h('button', { class: end.result === 'loss' ? 'btn' : 'btn btn-primary', onclick: onTitle }, T.toTitle))));
    screen.hidden = false;
    requestAnimationFrame(() => charts.forEach((c) => c.draw()));
  }

  function hide() { screen.hidden = true; }
  return { show, hide };
}
