// Top bar meters (CS, ES, GS) with ▲ / ▼, and a tooltip that explains each part of the target.
// The tooltip opens on hover (mouse) and on tap, so it works on phones too.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { METERS, SAT } from '../data/balance.js';
import { subscribe, getState } from '../core/store.js';
import { targets } from '../sim/satisfaction.js';

const KEYS = ['cs', 'es', 'gs'];

export function mountMeters(container) {
  const chips = {};
  const pop = h('div', { class: 'popover', role: 'tooltip', hidden: true });
  document.body.append(pop);
  let openKey = null;

  for (const k of KEYS) {
    const value = h('span', { class: 'm-val' });
    const arrow = h('span', { class: 'm-arrow', 'aria-hidden': 'true' });
    const btn = h('button', {
      class: 'meter-chip', 'aria-haspopup': 'true', 'aria-expanded': 'false',
      onclick: () => (openKey === k ? close() : open(k)),
      onpointerenter: (e) => { if (e.pointerType === 'mouse') open(k); },
      onpointerleave: (e) => { if (e.pointerType === 'mouse') close(); },
    }, h('span', { class: 'm-icon', 'aria-hidden': 'true' }, T.meterIcons[k]), h('span', { class: 'm-name' }, T.meterShort[k]), value, arrow);
    chips[k] = { btn, value, arrow };
    container.append(btn);
  }

  function zone(v) {
    return v < METERS.LOW ? 'bad' : v > METERS.HIGH ? 'good' : 'mid';
  }

  function render() {
    const s = getState();
    if (!s) return;
    const t = targets(s);
    for (const k of KEYS) {
      const v = s.meters[k];
      const tgt = t[k].target;
      const dir = tgt > v + SAT.ARROW_DEADBAND ? 1 : tgt < v - SAT.ARROW_DEADBAND ? -1 : 0;
      const c = chips[k];
      c.value.textContent = Math.round(v);
      c.arrow.textContent = dir > 0 ? '▲' : dir < 0 ? '▼' : '';
      c.arrow.className = `m-arrow ${dir > 0 ? 'good' : 'bad'}`;
      c.btn.className = `meter-chip ${zone(v)}`;
      c.btn.setAttribute('aria-label', T.meterAria(T.meterNames[k], Math.round(v), Math.round(tgt)));
    }
    if (openKey) renderPop(openKey, t);
  }

  function renderPop(k, t = targets(getState())) {
    const s = getState();
    const tk = t[k];
    fill(pop,
      h('strong', {}, T.meterNames[k]),
      h('p', { class: 'small' }, T.meterNow(Math.round(s.meters[k]), Math.round(tk.target))),
      h('table', { class: 'data' }, h('tbody', {},
        tk.parts.filter((p) => p.key === 'base' || Math.abs(p.value) >= 0.05).map((p) => h('tr', {},
          h('td', {}, T.meterParts[k][p.key]),
          h('td', { class: `num ${p.key === 'base' ? '' : p.value >= 0 ? 'good' : 'bad'}` },
            p.key === 'base' ? Math.round(p.value) : `${p.value >= 0 ? '+' : '−'}${Math.abs(p.value).toFixed(1)}`))))),
      h('p', { class: 'dim small' }, T.meterEffects[k]));
  }

  function open(k) {
    openKey = k;
    renderPop(k);
    pop.hidden = false;
    for (const x of KEYS) chips[x].btn.setAttribute('aria-expanded', String(x === k));
    const r = chips[k].btn.getBoundingClientRect();
    const w = Math.min(320, window.innerWidth - 16);
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
    pop.style.top = `${r.bottom + 6}px`;
  }

  function close() {
    openKey = null;
    pop.hidden = true;
    for (const x of KEYS) chips[x].btn.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('pointerdown', (e) => {
    if (openKey && !pop.contains(e.target) && !container.contains(e.target)) close();
  });
  subscribe(render);
  render();
  return { render, close };
}
