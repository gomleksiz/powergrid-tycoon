// Side panel (PC) → drawer (tablet) → bottom sheet (phone).
// The boxes are empty for now; later steps fill them.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';

const BOXES = [
  { id: 'budget', title: T.panelBudget },
  { id: 'sector', title: T.panelSector },
  { id: 'meters', title: T.panelMeters },
];

export function mountSidepanel({ panel, scrim, bottombar, onMenu }) {
  const boxes = {};
  const tabs = {};

  fill(panel,
    h('div', { class: 'panel-head' },
      h('strong', {}, T.panel),
      h('button', { class: 'btn', onclick: close, 'aria-label': T.closePanel }, '✕')),
    BOXES.map((b) => {
      boxes[b.id] = h('section', { class: 'panel-box', id: `box-${b.id}`, 'aria-label': b.title },
        h('h3', {}, b.title),
        h('p', { class: 'dim small' }, T.panelEmpty));
      return boxes[b.id];
    }),
  );

  fill(bottombar,
    BOXES.map((b) => {
      tabs[b.id] = h('button', { 'aria-pressed': 'false', onclick: () => toggleTab(b.id) }, b.title);
      return tabs[b.id];
    }),
    h('button', { onclick: onMenu }, T.menu),
  );

  scrim.addEventListener('click', close);

  let current = null;

  function open(id) {
    current = id ?? current;
    document.body.classList.add('panel-open');
    scrim.hidden = false;
    for (const [k, t] of Object.entries(tabs)) t.setAttribute('aria-pressed', String(k === current));
    if (current) boxes[current].scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function close() {
    document.body.classList.remove('panel-open');
    scrim.hidden = true;
    for (const t of Object.values(tabs)) t.setAttribute('aria-pressed', 'false');
  }

  function isOpen() {
    return document.body.classList.contains('panel-open');
  }

  function toggleTab(id) {
    if (isOpen() && current === id) close();
    else open(id);
  }

  return { open, close, toggle: () => (isOpen() ? close() : open()), isOpen };
}
