// Save cards for loading (slots + auto-saves) and for saving (slots only).

import { h, fill } from './dom.js';
import { openDialog, confirmDialog, alertDialog } from './dialog.js';
import { T } from '../data/text.js';
import { listSaves, readSave, deleteSave, isSlotFull } from '../save/save.js';

const REASONS = { newer: T.newerSave, checksum: T.brokenSave, parse: T.brokenSave };

function saveName(s) {
  return s.kind === 'slot' ? T.slotName(s.id) : T.autoName(s.id);
}

function describe(header) {
  const m = header.meta ?? {};
  const when = header.savedAt ? new Date(header.savedAt).toLocaleString() : '';
  return {
    who: m.companyName || '—',
    info: [
      `${m.dateLabel ?? ''} · ${T.difficulty[m.difficulty] ?? ''}`,
      `${T.savedAt(when)} · ${T.playTime(Math.round((header.playTimeSec ?? 0) / 60))}`,
    ],
  };
}

// mode: 'load' | 'save'. onLoaded(res, name) after a good load. onSave(n) to write a slot.
export function openSaveScreen({ mode = 'load', onLoaded, onSave, onClose }) {
  const list = h('div', { class: 'save-list' });
  const dlg = openDialog(mode === 'load' ? T.loadTitle : T.saveTitle, [
    list,
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => dlg.close() }, T.back)),
  ], { onClose });

  function render() {
    const saves = listSaves().filter((s) => mode === 'load' || s.kind === 'slot');
    fill(list, saves.map(card));
  }

  function card(s) {
    const name = saveName(s);
    const label = h('span', { class: 'save-label' }, name);
    const buttons = h('div', { class: 'btns' });

    if (mode === 'save') {
      buttons.append(h('button', { class: 'btn btn-primary', onclick: () => saveHere(s) }, T.save));
    } else if (s.exists) {
      buttons.append(h('button', { class: 'btn btn-primary', onclick: () => load(s) }, T.load));
    }
    if (s.exists) {
      buttons.append(h('button', { class: 'btn btn-danger', onclick: () => remove(s) }, T.deleteSave));
    }

    if (!s.exists) {
      return h('div', { class: 'save-card empty' }, label, h('span', { class: 'who' }, T.emptySlot), buttons);
    }
    if (!s.header) {
      return h('div', { class: 'save-card broken' }, label, h('span', { class: 'info' }, T.brokenSave), buttons);
    }
    const d = describe(s.header);
    return h('div', { class: 'save-card' }, label, h('span', { class: 'who' }, d.who),
      d.info.map((line) => h('span', { class: 'info' }, line)), buttons);
  }

  async function load(s) {
    const res = readSave(s.key);
    if (!res.ok) {
      await alertDialog(REASONS[res.reason] ?? T.loadError);
      return;
    }
    dlg.close();
    onLoaded(res, saveName(s));
  }

  async function saveHere(s) {
    if (isSlotFull(s.id) && !(await confirmDialog(T.replaceSave))) return;
    const res = onSave(s.id);
    if (res?.ok) dlg.close();
  }

  async function remove(s) {
    if (!(await confirmDialog(T.deleteConfirm, { yes: T.deleteSave, danger: true }))) return;
    deleteSave(s.key);
    render();
  }

  render();
  return dlg;
}
