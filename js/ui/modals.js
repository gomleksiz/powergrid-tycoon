// Event cards. A card pauses the game while it is open.
// Version 1.2: disaster warnings and reports are news lines and live board items, not dialogs.

import { h } from './dom.js';
import { openDialog } from './dialog.js';
import { T } from '../data/text.js';
import { EVENTS } from '../data/events.js';
import { dispatch } from '../core/store.js';
import { readButton, textOf } from './readAloud.js';

// An event card must be answered: it cannot be closed with Esc.
export function showEventCard(id) {
  const card = T.cards[id];
  const dlg = openDialog(`${T.eventTitle}: ${card.title}`, [
    h('p', {}, card.text),
    h('div', { class: 'menu-list' }, EVENTS[id].choices.map((_, i) => h('button', {
      class: i === 0 ? 'btn btn-primary' : 'btn',
      onclick: () => { dispatch({ type: 'event/choose', payload: { choice: i } }); dlg.close(); },
    }, card.choices[i]))),
  ], { closable: false });
  dlg.el.classList.add('event-card');
  addReadButton(dlg.el);
  return dlg;
}

// 🔊 next to the dialog title.
function addReadButton(el) {
  const b = readButton(() => textOf(el));
  if (!b) return;
  const title = el.querySelector('h2');
  title.classList.add('with-read');
  title.append(b);
}
