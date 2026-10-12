// Idle: does nothing after month 1. Says no to every event card.
import { EVENTS } from '../../js/data/events.js';

export default {
  name: 'idle',
  setup() {},
  month() {},
  event: (id) => EVENTS[id].choices.length - 1,
};
