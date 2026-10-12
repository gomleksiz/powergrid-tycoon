// Modal dialogs with the native <dialog> element (focus trap, Esc, top layer).

import { h } from './dom.js';
import { T } from '../data/text.js';

// Opens a dialog. Returns { el, close }. onClose runs once when it closes.
export function openDialog(title, body, { onClose, closable = true } = {}) {
  const el = h('dialog', { class: 'dlg', 'aria-label': title },
    h('h2', {}, title),
    h('div', { class: 'dlg-body' }, body),
  );
  el.addEventListener('cancel', (e) => { if (!closable) e.preventDefault(); });
  el.addEventListener('close', () => { el.remove(); onClose?.(); }, { once: true });
  document.body.append(el);
  el.showModal();
  return { el, close: () => el.open && el.close() };
}

export function isDialogOpen() {
  return document.querySelector('dialog[open]') !== null;
}

export function confirmDialog(text, { yes = T.yes, no = T.no, danger = false } = {}) {
  return new Promise((resolve) => {
    let answer = false;
    const dlg = openDialog(text, [
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => dlg.close() }, no),
        h('button', {
          class: danger ? 'btn btn-danger' : 'btn btn-primary',
          onclick: () => { answer = true; dlg.close(); },
        }, yes),
      ),
    ], { onClose: () => resolve(answer) });
  });
}

export function alertDialog(text) {
  return new Promise((resolve) => {
    const dlg = openDialog(text, [
      h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
    ], { onClose: resolve });
  });
}
