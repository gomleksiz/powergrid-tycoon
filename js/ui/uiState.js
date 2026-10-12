// Screen-only state: what is selected, the map view, building placement.
// It is not part of the game state and is not saved.

import { emit } from '../core/bus.js';

export const ui = {
  selected: null,     // sector id
  view: 'normal',     // normal | outage | tiers | rivals | hazards
  placing: null,      // building type being placed
  ghost: null,        // { x, y, ok, reason } tile of the building being placed
};

export function setUi(patch) {
  Object.assign(ui, patch);
  emit('ui:change', ui);
}
