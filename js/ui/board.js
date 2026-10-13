// The live board (version 1.2): the state of the whole company at a glance, instead of the map.
// Company numbers, power, money, every city with its chart, rivals and disasters.
// Only parts whose text changed are rebuilt (fillKeyed), so buttons keep working.

import { h, fillKeyed } from './dom.js';
import { T } from '../data/text.js';
import { TIER_IDS, UI } from '../data/balance.js';
import { RIVALS } from '../data/rivals.js';
import { DISASTER } from '../data/disasters.js';
import { getState, subscribe, dispatch } from '../core/store.js';
import { on } from '../core/bus.js';
import { ui, setUi } from './uiState.js';
import { dateLabel } from '../core/time.js';
import { totalCustomers, marketShare, wholesalePrice, loanLimit } from '../sim/economy.js';
import { averageOutage, sectorStatus, capacityMw, peakMw, ownPeakMw, ownEnergy } from '../sim/grid.js';
import { sectorPotential } from '../sim/setup.js';
import { rivalPrice } from '../sim/rivals.js';
import { weekIndex } from '../sim/disasters.js';
import { stationedNow } from '../sim/repair.js';
import { drawLineChart } from './lineChart.js';
import { money, num, numFull, pct, hours, energy, signedMoney, signed } from './format.js';

const sum = (o) => (o ? TIER_IDS.reduce((n, t) => n + (o[t] ?? 0), 0) : 0);
const COLORS = { you: '#6cb8ff', rival: '#ff5d6c', cap: '#a9b2d6', own: '#3ad1a0', cash: '#ffd23f', cost: '#ffa53a' };
const LOG_ROWS = 6;

export function mountBoard(area, { onSelectSector, onMode }) {
  const kpis = h('div', { class: 'board-kpis' });
  const charts = h('div', { class: 'board-charts' });
  const cities = h('div', { class: 'board-cities' });
  const rivals = h('div');
  const disasters = h('div');
  const el = h('section', { class: 'board', hidden: true, 'aria-label': T.boardTitle },
    kpis,
    charts,
    h('h3', { class: 'board-h' }, T.boardCities),
    cities,
    h('div', { class: 'board-two' },
      h('section', { class: 'card' }, h('h3', {}, T.tabs.rivals), rivals),
      h('section', { class: 'card' }, h('h3', {}, T.boardDisasters), disasters)),
  );
  area.append(el);

  // Big charts: made once, drawn again when a month is added or the size changes.
  const big = [
    makeChart(T.boardPowerPeak, (s) => [
      { values: s.history.peak ?? [], color: COLORS.you, label: T.boardPeakDemand },
      { values: s.history.capacity ?? [], color: COLORS.cap, label: T.boardCapacity },
      { values: s.history.ownPeak ?? [], color: COLORS.own, label: T.boardOwnPeak },
    ], { format: (v) => `${num(v)} MW` }),
    makeChart(T.boardEnergy, (s) => [
      { values: (s.history.demandKwh ?? []).map((v) => v / 1e6), color: COLORS.you, label: T.boardUse },
      { values: (s.history.ownKwh ?? []).map((v) => v / 1e6), color: COLORS.own, label: T.boardProduce },
    ], { format: (v) => `${v < 10 ? v.toFixed(1) : num(v)} GWh` }),
    makeChart(T.boardMoney, (s) => [
      { values: s.history.revenue, color: COLORS.cash, label: T.boardRevenue },
      { values: s.history.costs ?? [], color: COLORS.cost, label: T.boardCosts },
    ], { format: money }),
    makeChart(T.boardCustomers, (s) => [
      { values: s.history.customers, color: COLORS.you, label: T.boardYou },
      { values: s.history.rivals ?? [], color: COLORS.rival, label: T.boardRivalCustomers },
    ], { format: num }),
  ];
  charts.append(...big.map((c) => c.el));
  const cityCharts = new Map();   // sector id → { canvas, key }

  function makeChart(title, series, opts) {
    const canvas = h('canvas', { class: 'chart', role: 'img', 'aria-label': title });
    const legend = h('p', { class: 'small dim legend' });
    const box = h('div', { class: 'chart-box' }, h('h4', {}, title), canvas, legend);
    let key = '';
    return {
      el: box,
      draw(s, force) {
        const list = series(s);
        const k = `${s.history.cash.length}|${canvas.clientWidth}`;
        if (!force && k === key) return;
        key = k;
        legend.replaceChildren(...list.map((x, i) => h('span', { class: 'legend-item' }, h('span', { class: `swatch dash${i}`, style: `border-color:${x.color}` }), x.label)));
        drawLineChart(canvas, list, opts);
      },
    };
  }

  // ---------- parts ----------

  function kpiTiles(s) {
    const c = s.company;
    const r = s.report?.money;
    const prev = s.history.customers.at(-2) ?? s.history.customers.at(-1) ?? totalCustomers(s);
    const tile = (label, value, sub = '', cls = '') => h('div', { class: `kpi ${cls}` },
      h('span', { class: 'kpi-label' }, label), h('strong', { class: 'kpi-value' }, value), sub ? h('span', { class: 'kpi-sub small' }, sub) : null);
    const short = s.market.shortage ?? 0;
    const H = averageOutage(s);
    return [
      tile(T.boardCash, money(c.cash), s.history.net.length ? T.boardLastMonth(signedMoney(c.lastNet)) : '', c.cash < 0 ? 'bad' : ''),
      tile(T.boardRevenue, r ? money(r.revenue) : '–', r ? T.boardCostsLine(money(r.revenue + r.sales - r.net)) : ''),
      tile(T.boardCustomersNow, num(totalCustomers(s)), T.boardChange(signed(totalCustomers(s) - prev))),
      tile(T.boardShare, pct(marketShare(s), 1), T.boardRivalShare(num(sum(Object.fromEntries(TIER_IDS.map((t) => [t, s.sectors.reduce((n, x) => n + (x.rival?.customers[t] ?? 0), 0)])))))),
      tile(T.boardOutage, hours(H), T.boardOutageSub, H > 12 ? 'bad' : H > 4 ? 'warn' : 'good'),
      tile(T.boardPower, `${peakMw(s, { customers: sumTiers(s) }).toFixed(1)} MW`, T.boardPowerSub(ownPeakMw(s).toFixed(1), s.sectors.reduce((n, x) => n + (x.owned ? capacityMw(x) : 0), 0).toFixed(1))),
      tile(T.boardWholesale, `$${wholesalePrice(s).toFixed(3)}`, short > 0 ? T.boardShortage(Math.round(short * 100)) : T.boardNoShortage, short > 0 ? 'warn' : ''),
      tile(T.boardDebt, money(c.debt), T.boardLoanLimit(money(loanLimit(s)))),
    ];
  }

  function sumTiers(s) {
    const out = { low: 0, medium: 0, high: 0, corporate: 0 };
    for (const x of s.sectors) if (x.owned) for (const t of TIER_IDS) out[t] += x.customers[t];
    return out;
  }

  function cityCard(s, sec, here) {
    const pot = sectorPotential(sec);
    const potAll = sum(pot);
    const mine = sec.owned ? sum(sec.customers) : 0;
    const rv = sec.rival;
    const st = sectorStatus(sec);
    const pick = () => { setUi({ selected: sec.id }); onSelectSector(sec.id); };
    const card = h('div', {
      class: `city ${sec.owned ? 'owned' : 'locked'} ${st ?? ''} ${ui.selected === sec.id ? 'selected' : ''}`,
      role: 'button', tabindex: 0, 'aria-label': T.boardOpenCity(sec.name),
      onclick: pick,
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(); } },
    });
    const head = h('div', { class: 'city-head' },
      h('strong', {}, sec.owned ? '' : '🔒 ', sec.name),
      st ? h('span', { class: `status-pill ${st}` }, T.statusIcon[st], ' ', hours(sec.lastH)) : h('span', { class: 'dim small' }, T.sectorTypes[sec.type]));
    const lines = [];
    if (sec.owned) {
      lines.push(h('p', { class: 'small' }, T.boardCityCustomers(numFull(mine), numFull(potAll), pct(potAll ? mine / potAll : 0))));
      lines.push(h('p', { class: 'small dim' }, TIER_IDS.filter((t) => pot[t]).map((t) => `${T.tierLetters[t]} ${num(sec.customers[t])}`).join(' · ')));
      const cap = capacityMw(sec);
      const peak = peakMw(s, sec);
      lines.push(h('p', { class: `small ${peak > cap ? 'bad' : peak > cap * 0.9 ? 'warn' : ''}` }, T.boardCityPower(peak.toFixed(1), cap.toFixed(1))));
      lines.push(h('div', { class: 'mini-bars' },
        miniBar(T.health, sec.health, sec.health < 40 ? 'bad' : sec.health < 60 ? 'warn' : 'good'),
        sec.damage > 0 ? miniBar(T.damage, sec.damage, 'bad') : null));
      const flags = [];
      if (sec.waiting > 0) flags.push(h('span', { class: 'flag warn' }, T.boardWaiting(num(sec.waiting))));
      const broken = sec.buildings.filter((b) => b.broken).length;
      if (broken) flags.push(h('span', { class: 'flag bad' }, T.boardBroken(broken)));
      if (sec.assigned > 0) flags.push(h('span', { class: 'flag' }, T.boardLocalCrew(sec.assigned, here[sec.id] ?? 0)));
      if (sec.contractors > 0) flags.push(h('span', { class: 'flag' }, T.boardContractors(sec.contractors)));
      if (sec.repairTechs > 0) flags.push(h('span', { class: 'flag' }, `🔧 ${sec.repairTechs}`));
      if (sec.prep) flags.push(h('span', { class: 'flag good' }, T.boardPrepped));
      if (flags.length) lines.push(h('div', { class: 'flags' }, flags));
    } else {
      lines.push(h('p', { class: 'small dim' }, T.boardCityLocked(numFull(potAll))));
    }
    if (rv) {
      lines.push(h('p', { class: 'small rival-line' },
        h('span', { class: `tag ${rv.id}` }, T.rivalLetters[rv.id]), ' ',
        T.boardRivalLine(T.rivalNames[rv.id], rivalPrice(rv).toFixed(2), Math.round(rv.strength), num(sum(rv.customers))),
        rv.drive > 0 ? h('span', { class: 'warn' }, ` · ${T.boardDrive}`) : null,
        rv.war ? h('span', { class: 'warn' }, ` · ${T.boardWar}`) : null));
    }
    // A chart only where someone has customers (yours or a rival's).
    const hasData = [...(sec.hist?.c ?? []), ...(sec.hist?.r ?? [])].some((v) => v > 0);
    const canvas = hasData ? h('canvas', { class: 'city-chart', role: 'img', 'aria-label': T.boardCityChart(sec.name) }) : null;
    if (canvas) cityCharts.set(sec.id, { canvas, key: '' }); else cityCharts.delete(sec.id);
    card.append(head, ...lines, ...(canvas ? [canvas] : []));
    return card;
  }

  function miniBar(label, v, cls) {
    return h('span', { class: 'mini-bar', title: `${label} ${Math.round(v)}` },
      h('span', { class: 'small dim' }, label), h('span', { class: 'bar' }, h('span', { class: `fill ${cls}`, style: `width:${Math.max(0, Math.min(100, v))}%` })),
      h('span', { class: 'small num' }, Math.round(v)));
  }

  function cityKey(s, sec, here) {
    const rv = sec.rival;
    return [sec.id, sec.owned, sum(sec.customers), Math.round(sec.lastH * 10), Math.round(sec.health), Math.round(sec.damage),
      sec.waiting, sec.buildings.length, sec.buildings.filter((b) => b.broken).length, sec.assigned, here[sec.id], sec.contractors, sec.repairTechs, sec.prep,
      rv ? `${rv.id}:${Math.round(rv.strength)}:${sum(rv.customers)}:${rivalPrice(rv).toFixed(2)}:${rv.drive}:${rv.war}` : '-',
      ui.selected === sec.id, capacityMw(sec), s.history.cash.length].join(',');
  }

  function drawCityCharts(s) {
    for (const sec of s.sectors) {
      const c = cityCharts.get(sec.id);
      if (!c) continue;
      const k = `${sec.hist?.c?.length ?? 0}|${c.canvas.clientWidth}`;
      if (k === c.key) continue;
      c.key = k;
      drawLineChart(c.canvas, [
        { values: sec.hist?.c ?? [], color: COLORS.you },
        { values: sec.hist?.r ?? [], color: COLORS.rival },
      ], { compact: true, format: num });
    }
  }

  function rivalsPart(s) {
    const present = s.sectors.filter((x) => x.rival);
    if (!present.length) return h('p', { class: 'small dim' }, T.rivalsNone);
    return h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', {}, T.boardRival), h('th', {}, T.boardCity), h('th', { class: 'num' }, T.boardPrice),
        h('th', { class: 'num' }, T.rivalStrength), h('th', { class: 'num' }, T.colCustomers))),
      h('tbody', {}, present.map((x) => h('tr', {},
        h('td', {}, h('span', { class: `tag ${x.rival.id}` }, T.rivalLetters[x.rival.id]), ' ', T.rivalNames[x.rival.id]),
        h('td', {}, x.owned ? '' : '🔒 ', x.name),
        h('td', { class: `num ${x.rival.drive > 0 || x.rival.war ? 'warn' : ''}` }, `${rivalPrice(x.rival).toFixed(2)}×`, ' ', h('span', { class: 'dim' }, `(${T.boardYours} ${yourPrice(s, x)})`)),
        h('td', { class: 'num' }, Math.round(x.rival.strength)),
        h('td', { class: 'num' }, num(sum(x.rival.customers)))))));
  }

  function yourPrice(s, sec) {
    const n = sum(sec.customers);
    if (!sec.owned || !n) return `${s.prices.low.toFixed(2)}×`;
    const avg = TIER_IDS.reduce((x, t) => x + sec.customers[t] * s.prices[t], 0) / n * (1 - (sec.discount ?? 0));
    return `${avg.toFixed(2)}×`;
  }

  function disastersPart(s) {
    const now = weekIndex(s.time.month, s.time.week);
    const warned = s.disasters.scheduled.filter((d) => d.warned);
    return [
      h('label', { class: 'check-row' },
        h('input', { type: 'checkbox', checked: !!s.policy?.autoPrep, onchange: (e) => dispatch({ type: 'policy/autoPrep', payload: e.target.checked }) }),
        h('span', {}, T.autoPrep)),
      h('p', { class: 'dim small' }, T.autoPrepHelp(money(DISASTER.PREP_COST))),
      h('h4', {}, T.boardComing),
      warned.length ? h('ul', { class: 'plain' }, warned.map((d) => h('li', { class: 'small warn' },
        `${T.disasterIcons[d.type]} `, T.boardWarning(T.disasterNames[d.type], Math.max(1, weekIndex(d.month, d.week) - now),
          d.hits.map((x) => s.sectors[x.sector]).filter((x) => x.owned).map((x) => `${x.name}${x.prep ? ' ✓' : ''}`).join(', ') || T.boardNotYours))))
        : h('p', { class: 'small dim' }, T.boardNoWarning),
      h('h4', {}, T.boardRecent),
      s.disasters.log.length ? h('ul', { class: 'plain disaster-log' }, s.disasters.log.slice(0, LOG_ROWS).map((r) => h('li', { class: 'small' },
        h('strong', {}, `${T.disasterIcons[r.type]} ${T.disasterNames[r.type]}`), ` · ${dateLabel(r.month)} · `,
        r.sectors.length ? r.sectors.map((l) => T.boardHitLine(l.name, Math.round(l.actual), l.broken?.length ? l.broken.map((b) => T.buildings[b]).join(', ') : '', l.prep)).join('; ')
          : (r.type === 'heatwave' ? T.boardHeat : T.noOwnedHit))))
        : h('p', { class: 'small dim' }, T.boardNoDisasters),
    ];
  }

  // ---------- update ----------

  function update(force = false) {
    const s = getState();
    if (!s || el.hidden) return;
    const here = stationedNow(s);
    const kpiKey = JSON.stringify([s.company.cash, s.company.debt, s.time, totalCustomers(s), s.market.shortage, s.report?.month]);
    fillKeyed(kpis, kpiKey, () => kpiTiles(s));
    for (const c of big) c.draw(s, force);
    // Home Valley first, then your sectors by size, then sectors with a rival, then the rest.
    const order = [...s.sectors].sort((a, b) => (b.home - a.home) || (b.owned - a.owned) || (sum(b.customers) - sum(a.customers)) || (!!b.rival - !!a.rival) || a.id - b.id);
    const cKey = order.map((x) => x.id).join(',');
    if (cities.dataset.order !== cKey) {
      cities.dataset.order = cKey;
      cities.replaceChildren(...order.map(() => h('div', { class: 'city-slot' })));
    }
    order.forEach((sec, i) => {
      const slot = cities.children[i];
      const before = slot.dataset.key;
      fillKeyed(slot, cityKey(s, sec, here), () => cityCard(s, sec, here));
    });
    drawCityCharts(s);
    fillKeyed(rivals, s.sectors.map((x) => (x.rival ? `${x.id}:${x.rival.id}:${Math.round(x.rival.strength)}:${sum(x.rival.customers)}:${rivalPrice(x.rival).toFixed(2)}` : '')).join('|') + JSON.stringify(s.prices), () => rivalsPart(s));
    fillKeyed(disasters, JSON.stringify([s.policy?.autoPrep, s.time, s.disasters.scheduled.filter((d) => d.warned).map((d) => d.id), s.disasters.log.length, s.disasters.log[0]?.id, s.sectors.map((x) => x.prep)]), () => disastersPart(s));
  }

  let timer = null;
  subscribe(() => {
    if (timer || el.hidden) return;
    timer = setTimeout(() => { timer = null; update(); }, UI.PANEL_REFRESH_MS);
  });
  on('ui:change', () => update());
  new ResizeObserver(() => update(true)).observe(el);

  // The switch between the map and the board (in the top bar). Key: D.
  const buttons = ['map', 'board'].map((m) => h('button', {
    class: 'btn', 'aria-pressed': 'false', onclick: () => { setMode(m); onMode?.(m); }, title: T.modeHelp[m],
  }, h('span', { 'aria-hidden': 'true' }, T.modeIcons[m]), ' ', h('span', { class: 'mode-name' }, T.modeNames[m])));
  const switchEl = h('div', { class: 'seg mode-switch', role: 'group', 'aria-label': T.modeLabel }, buttons);

  function setMode(m) {
    setUi({ mode: m });
    el.hidden = m !== 'board';
    area.classList.toggle('board-mode', m === 'board');
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(['map', 'board'][i] === m)));
    if (m === 'board') { cities.dataset.order = ''; update(true); }
  }

  return { el, switchEl, setMode, toggle: () => setMode(ui.mode === 'board' ? 'map' : 'board'), update };
}
