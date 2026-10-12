// Side panel with tabs (PC) → drawer (tablet) → bottom sheet (phone).
// Only the visible panel updates, at most every UI.PANEL_REFRESH_MS.

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { UI } from '../data/balance.js';
import { subscribe, getState } from '../core/store.js';

const PHONE_TABS = 4; // the rest go under "More" on a phone

export function mountSidepanel({ panel, scrim, bottombar, panels }) {
  const tabs = {};
  const phoneTabs = {};
  let current = panels[0].id;
  let timer = null;

  const strip = h('div', { class: 'tab-strip', role: 'tablist', 'aria-label': T.panel },
    panels.map((p) => {
      tabs[p.id] = h('button', {
        class: 'tab', role: 'tab', id: `tab-${p.id}`, 'aria-controls': `pane-${p.id}`,
        onclick: () => show(p.id),
      }, T.tabs[p.id]);
      return tabs[p.id];
    }));

  const body = h('div', { class: 'panel-scroll' },
    panels.map((p) => {
      p.el.id = `pane-${p.id}`;
      p.el.setAttribute('role', 'tabpanel');
      p.el.setAttribute('aria-labelledby', `tab-${p.id}`);
      return p.el;
    }));

  fill(panel,
    h('div', { class: 'panel-head' },
      h('strong', {}, T.panel),
      h('button', { class: 'btn', onclick: close, 'aria-label': T.closePanel }, '✕')),
    strip,
    body,
  );

  fill(bottombar,
    panels.slice(0, PHONE_TABS).map((p) => {
      phoneTabs[p.id] = h('button', { 'aria-pressed': 'false', onclick: () => toggleTab(p.id) }, T.tabs[p.id]);
      return phoneTabs[p.id];
    }),
    h('button', { 'aria-pressed': 'false', onclick: () => toggleTab(null) }, T.moreTabs),
  );

  scrim.addEventListener('click', close);

  function show(id) {
    current = id;
    for (const p of panels) {
      const on = p.id === id;
      p.el.hidden = !on;
      tabs[p.id].setAttribute('aria-selected', String(on));
      tabs[p.id].tabIndex = on ? 0 : -1;
    }
    syncPhoneTabs();
    refreshNow();
    body.scrollTop = 0;
  }

  function syncPhoneTabs() {
    const open = isOpen();
    for (const [id, t] of Object.entries(phoneTabs)) t.setAttribute('aria-pressed', String(open && id === current));
  }

  function open(id) {
    if (id) show(id);
    document.body.classList.add('panel-open');
    scrim.hidden = false;
    syncPhoneTabs();
  }

  function close() {
    document.body.classList.remove('panel-open');
    scrim.hidden = true;
    syncPhoneTabs();
  }

  function isOpen() {
    return document.body.classList.contains('panel-open');
  }

  // id null = "More": open the sheet on a tab that is not in the bottom bar.
  function toggleTab(id) {
    const target = id ?? (panels.findIndex((p) => p.id === current) >= PHONE_TABS ? current : panels[PHONE_TABS]?.id);
    if (isOpen() && current === target) close();
    else open(target);
  }

  function refreshNow() {
    const s = getState();
    if (!s) return;
    panels.find((p) => p.id === current)?.update(s);
  }

  subscribe(() => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; refreshNow(); }, UI.PANEL_REFRESH_MS);
  });

  show(current);
  return { open, close, show, toggle: () => (isOpen() ? close() : open()), isOpen, refresh: refreshNow };
}
