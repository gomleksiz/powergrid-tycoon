// Debug helpers. They work only when the address has ?debug=1.

import { dispatch, getState } from '../core/store.js';
import { ui } from './uiState.js';

export const isDebug = () => new URLSearchParams(location.search).get('debug') === '1';

const DAMAGE_STEP = 25;

export function bindDebugKeys() {
  if (!isDebug()) return;
  window.addEventListener('keydown', (e) => {
    if (!getState() || e.target.closest?.('input, select, textarea')) return;
    // K: add damage to the selected sector (or Home Valley)
    if (e.key === 'k' || e.key === 'K') {
      const sector = ui.selected ?? getState().sectors.find((s) => s.owned).id;
      dispatch({ type: 'debug/damage', payload: { sector, amount: DAMAGE_STEP } });
    }
  });
}
