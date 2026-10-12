// Every action the UI (or a bot) can dispatch. handler(state, payload) → events[].

import { weekTick } from './tick.js';
import { UI } from '../data/balance.js';

export const ACTIONS = {
  'time/week': (state) => weekTick(state),

  'company/rename': (state, name) => {
    state.company.name = String(name).slice(0, UI.COMPANY_NAME_MAX);
  },

  'tutorial/skip': (state) => {
    state.tutorial.enabled = false;
  },
};
