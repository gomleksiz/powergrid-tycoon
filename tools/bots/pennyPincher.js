// Penny-pincher: minimum budget, high prices, few staff, little research.
import { makePlayer } from './player.js';

export default makePlayer({
  name: 'pennyPincher',
  budgetPct: 10,
  price: 1.4,
  research: ['P2', 'R1', 'P3'],
  deploy: [],
  teams: () => 1,
  crews: () => 1,
  pr: () => 1,
  expand: false,
  backlogCrew: false,
  fight: null,
  power: false,
  event: (id) => (id === 'evChargers' || id === 'university' || id === 'unionRaise' ? 1 : 0),
});
