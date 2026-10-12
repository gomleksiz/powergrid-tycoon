// Settings dialog. More options come in step 12.

import { h } from './dom.js';
import { openDialog } from './dialog.js';
import { T } from '../data/text.js';
import { GAME_VERSION } from '../data/balance.js';
import { getState } from '../core/store.js';

export function openSettings({ inGame = false } = {}) {
  const storageLine = h('p', { class: 'dim small' });
  navigator.storage?.persisted?.().then((yes) => {
    storageLine.textContent = yes ? T.storagePersisted : T.storageNotPersisted;
  }).catch(() => {});

  const dlg = openDialog(T.settingsTitle, [
    h('p', { class: 'note warn' }, T.privateNote),
    storageLine,
    inGame && getState() && h('p', { class: 'dim small' }, T.seedInfo(getState().seed)),
    h('p', { class: 'dim small' }, T.versionInfo(GAME_VERSION)),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
  ]);
  return dlg;
}
