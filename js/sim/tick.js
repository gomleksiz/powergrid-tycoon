// Weekly and monthly simulation steps. No DOM, no Math.random().
// Each function changes the state and returns a list of events.

import { TIME } from '../data/balance.js';

export function weekTick(state) {
  const events = [{ type: 'week:end', payload: { ...state.time } }];
  state.time.week += 1;
  if (state.time.week > TIME.WEEKS_PER_MONTH) {
    state.time.week = 1;
    events.push(...monthTick(state));
  }
  return events;
}

export function monthTick(state) {
  const ended = state.time.month;
  state.time.month += 1;
  return [{ type: 'month:end', payload: { month: ended } }];
}

export function isGameOver(state) {
  return state.time.month > TIME.END_MONTH;
}
