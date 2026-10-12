// Pause menu: Resume, Save, Load, Settings, Quit to title.
// Opening it pauses the game; Resume goes back to the old speed.

import { h } from './dom.js';
import { openDialog, confirmDialog } from './dialog.js';
import { T } from '../data/text.js';

export function openPauseMenu({ loop, onSave, onLoad, onSettings, onQuit }) {
  const speedBefore = loop.getSpeed();
  loop.setSpeed(0);
  let resume = true;

  const item = (text, fn, cls = 'btn') => h('button', { class: cls, onclick: fn }, text);

  const dlg = openDialog(T.paused, [
    h('div', { class: 'menu-list' },
      item(T.resume, () => dlg.close(), 'btn btn-primary'),
      item(T.save, onSave),
      item(T.load, onLoad),
      item(T.settings, onSettings),
      item(T.quitToTitle, async () => {
        if (!(await confirmDialog(T.quitConfirm))) return;
        resume = false;
        dlg.close();
        onQuit();
      }, 'btn btn-danger'),
    ),
  ], {
    onClose: () => { if (resume && speedBefore > 0) loop.setSpeed(speedBefore); },
  });

  // A load from this menu replaces the game; it must stay paused.
  return { ...dlg, keepPaused() { resume = false; } };
}
