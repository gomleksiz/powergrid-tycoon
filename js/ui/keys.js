// Keyboard: every action has a key. "?" shows the list (design section 15).

import { h } from './dom.js';
import { isDialogOpen, openDialog } from './dialog.js';
import { T } from '../data/text.js';

const SPEED_KEYS = { Digit1: 1, Digit2: 2, Digit3: 5, Numpad1: 1, Numpad2: 2, Numpad3: 5 };
const TAB_KEYS = { e: 'sector', b: 'budget', r: 'research', p: 'projects', s: 'staff', c: 'customers', x: 'rivals', g: 'goals' };

export function openKeyList() {
  const dlg = openDialog(T.keysTitle, [
    h('table', { class: 'data' }, h('tbody', {}, T.keyList.map(([k, what]) => h('tr', {}, h('td', {}, h('kbd', {}, k)), h('td', {}, what))))),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
  ]);
  return dlg;
}

export function bindKeys({ loop, isPlaying, onMenu, onTab, onTree, onNews, onMute, onBoard }) {
  // Capture phase: still works when focus was left on a hidden element.
  window.addEventListener('keydown', (e) => {
    if (e.key === '?' && !isDialogOpen()) { e.preventDefault(); openKeyList(); return; }
    if (!isPlaying() || isDialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input, select, textarea')) return;

    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.code === 'Space') {
      e.preventDefault(); // stop a focused button from also clicking
      loop.togglePause();
    } else if (e.code in SPEED_KEYS) {
      loop.setSpeed(SPEED_KEYS[e.code]);
    } else if (e.key === 'Escape') {
      e.preventDefault(); // else Chrome's close watcher cancels the new dialog at once
      onMenu();
    } else if (k in TAB_KEYS) {
      onTab(TAB_KEYS[k]);
    } else if (k === 't') {
      onTree();
    } else if (k === 'n') {
      onNews();
    } else if (k === 'm') {
      onMute();
    } else if (k === 'd') {
      onBoard?.();
    }
  }, true);
}
