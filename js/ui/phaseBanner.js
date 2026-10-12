// "Phase 2: Regional Grid" banner over the map, with 1 line about what is new.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { on } from '../core/bus.js';

const SHOW_MS = 9000;

export function mountPhaseBanner(area) {
  const el = h('div', { class: 'phase-banner', role: 'status', hidden: true });
  area.append(el);
  let timer = null;

  function show(id) {
    const p = T.phases[id];
    fill(el,
      h('strong', {}, T.phaseBanner(id, p.name)),
      h('span', {}, p.line),
      h('button', { class: 'btn', 'aria-label': T.close, onclick: hide }, '✕'));
    el.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(hide, SHOW_MS);
  }

  function hide() { el.hidden = true; }

  on('phase:start', ({ phase }) => show(phase));
  on('game:quit', hide);
  return { show, hide };
}
