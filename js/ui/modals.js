// Event cards, disaster warnings and disaster reports. Each one pauses the game.

import { h } from './dom.js';
import { openDialog } from './dialog.js';
import { T } from '../data/text.js';
import { NODES } from '../data/techTree.js';
import { DISASTER } from '../data/disasters.js';
import { EVENTS } from '../data/events.js';
import { getState, dispatch, subscribe } from '../core/store.js';
import { canPrep } from '../sim/disasters.js';
import { money } from './format.js';
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

export function showWarning(w) {
  const s = getState();
  const name = T.disasterNames[w.type];
  const owned = w.sectors.map((id) => s.sectors[id]).filter((x) => x.owned);
  const buttons = h('div', { class: 'menu-list' });

  function renderButtons() {
    const st = getState();
    buttons.replaceChildren(...owned.map((sec) => (st.sectors[sec.id].prep
      ? h('p', { class: 'good' }, T.prepDone(sec.name))
      : h('button', {
        class: 'btn', disabled: !canPrep(st, sec.id),
        onclick: () => dispatch({ type: 'disaster/prep', payload: { sector: sec.id } }),
      }, T.prepButton(sec.name, money(DISASTER.PREP_COST))))));
  }
  renderButtons();
  const unsub = subscribe(renderButtons);

  const dlg = openDialog(`${T.disasterIcons[w.type]} ${T.warningTitle(name, w.weeks)}`, [
    h('p', {}, owned.length ? T.warningHits(owned.map((x) => x.name).join(', ')) : T.warningNotYours),
    owned.length ? h('p', { class: 'dim small' }, T.prepHelp(money(DISASTER.PREP_COST))) : null,
    buttons,
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
  ], { onClose: unsub });
  return dlg;
}

export function showDisasterReport(r) {
  const name = T.disasterNames[r.type];
  const body = [];
  if (r.type === 'heatwave') body.push(h('p', {}, T.heatText));
  if (!r.sectors.length && r.type !== 'heatwave') body.push(h('p', {}, T.noOwnedHit));
  for (const l of r.sectors) {
    body.push(h('div', { class: 'card' },
      h('strong', {}, T.disasterLine(l.name, Math.round(l.actual))),
      l.savedBy.length ? h('p', { class: 'good small' }, T.savedLine(l.savedBy.map((id) => NODES[id].name).join(' + '), Math.round(l.saved * 10) / 10)) : null,
      l.prep ? h('p', { class: 'good small' }, T.prepSaved) : null));
  }
  if (r.type === 'earthquake' && r.sectors.length) body.push(h('p', { class: 'dim small' }, T.quakeFission));
  if (r.sectors.length) body.push(h('p', { class: 'small' }, r.repairWeeks === null ? T.repairNone : T.repairTime(r.repairWeeks)));
  const dlg = openDialog(`${T.disasterIcons[r.type]} ${T.reportTitleDisaster(name)}`, [
    ...body,
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
  ]);
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
