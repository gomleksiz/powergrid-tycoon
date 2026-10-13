// Screen-only state: what is selected, the map view, map or board.
// It is not part of the game state and is not saved.

import { emit } from '../core/bus.js';

export const ui = {
  selected: null,     // sector id
  view: 'normal',     // normal | outage | tiers | rivals | hazards
  mode: 'board',      // version 1.2: 'map' or 'board' (the live board)
};

export function setUi(patch) {
  Object.assign(ui, patch);
  emit('ui:change', ui);
}
