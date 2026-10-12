// Debug tools. They work only when the address has ?debug=1 (design section 18).
// F9 opens the debug panel. K adds damage to the selected sector.

import { h } from './dom.js';
import { dispatch, getState } from '../core/store.js';
import { ui } from './uiState.js';
import { TIME } from '../data/balance.js';
import { NODE_IDS, NODES } from '../data/techTree.js';
import { EVENT_IDS } from '../data/events.js';
import { DISASTER_TYPES } from '../data/disasters.js';
import { alertDialog } from './dialog.js';

export const isDebug = () => new URLSearchParams(location.search).get('debug') === '1';

const DAMAGE_STEP = 25;
const CASH_STEP = 1_000_000;
const SETUPS = ['winMonopoly', 'winSingularity', 'winUtopia', 'loseBankrupt', 'loseLicense', 'loseCollapse', 'endOfTime'];

const selectedSector = () => ui.selected ?? getState().sectors.find((s) => s.owned).id;

function select(label, options) {
  return h('label', { class: 'dbg-row' }, label, h('select', {}, options.map((o) => h('option', { value: o.value ?? o }, o.label ?? o))));
}

function buildPanel(loop) {
  const month = h('input', { type: 'number', min: 1, max: TIME.END_MONTH, value: 100 });
  const meterKey = select('Meter', ['cs', 'es', 'gs']);
  const meterVal = h('input', { type: 'number', min: 0, max: 100, value: 80 });
  const disaster = select('Disaster', [...DISASTER_TYPES, 'superstorm']);
  const event = select('Event', EVENT_IDS);
  const tech = select('Tech', NODE_IDS.map((id) => ({ value: id, label: `${id} ${NODES[id].name}` })));
  const setup = select('Jump', SETUPS);
  const val = (lab) => lab.querySelector('select').value;
  const btn = (text, fn) => h('button', { class: 'btn', onclick: fn }, text);

  const panel = h('section', { class: 'debug-panel', hidden: true, 'aria-label': 'Debug' },
    h('strong', {}, 'Debug (F9)'),
    h('div', { class: 'dbg-row' }, btn('Speed 20x', () => loop.setSpeed(TIME.DEBUG_SPEED)), btn('+ $1M', () => dispatch({ type: 'debug/cash', payload: CASH_STEP }))),
    h('div', { class: 'dbg-row' }, meterKey, meterVal, btn('Set', () => dispatch({ type: 'debug/meter', payload: { key: val(meterKey), value: Number(meterVal.value) } }))),
    h('div', { class: 'dbg-row' }, 'Month', month, btn('Go', () => dispatch({ type: 'debug/month', payload: Number(month.value) }))),
    h('div', { class: 'dbg-row' }, disaster, btn('Next week', () => dispatch({ type: 'debug/disaster', payload: { type: val(disaster), sector: selectedSector() } }))),
    h('div', { class: 'dbg-row' }, event, btn('Now', () => dispatch({ type: 'debug/event', payload: val(event) }))),
    h('div', { class: 'dbg-row' }, tech, btn('Unlock', () => dispatch({ type: 'debug/unlock', payload: { node: val(tech) } }))),
    h('div', { class: 'dbg-row' }, setup, btn('Set up', () => dispatch({ type: 'debug/setup', payload: val(setup) }))),
    h('div', { class: 'dbg-row' }, btn('Add damage (K)', () => dispatch({ type: 'debug/damage', payload: { sector: selectedSector(), amount: DAMAGE_STEP } }))),
    h('div', { class: 'dbg-row' },
      btn('Show seed', () => alertDialog(`Seed: ${getState().seed}`)),
      btn('State → console', () => {
        const text = JSON.stringify(getState());
        console.info(getState());
        navigator.clipboard?.writeText(text).catch(() => {});
      })),
  );
  document.body.append(panel);
  return panel;
}

export function bindDebug(loop) {
  if (!isDebug()) return;
  let panel = null;
  window.addEventListener('keydown', (e) => {
    if (!getState() || e.target.closest?.('input, select, textarea')) return;
    if (e.key === 'F9') {
      e.preventDefault();
      panel ??= buildPanel(loop);
      panel.hidden = !panel.hidden;
    } else if (e.key === 'k' || e.key === 'K') {
      dispatch({ type: 'debug/damage', payload: { sector: selectedSector(), amount: DAMAGE_STEP } });
    }
  });
}
