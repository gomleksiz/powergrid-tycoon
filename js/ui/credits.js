// Credits: the sources and licenses of fonts, art and sounds.

import { h } from './dom.js';
import { openDialog } from './dialog.js';
import { T } from '../data/text.js';

export function openCredits() {
  const dlg = openDialog(T.creditsTitle, [
    h('dl', { class: 'credits' }, T.creditsList.flatMap(([what, who]) => [h('dt', {}, what), h('dd', {}, who)])),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
  ]);
  return dlg;
}
