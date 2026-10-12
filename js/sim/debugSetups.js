// Debug jumps (with ?debug=1): put the game 1 month before a win or a loss.
// The next month tick then ends the game.

import { SECTOR_TYPES } from '../data/sectors.js';
import { TIER_IDS } from '../data/balance.js';
import { NODES } from '../data/techTree.js';
import { diff } from '../data/difficulty.js';
import { VICTORY, LOSS } from '../data/advisorRules.js';
import { STATUS } from './effects.js';
import { sectorPotential } from './setup.js';

function ownAll(state) {
  for (const s of state.sectors) {
    s.owned = true;
    s.rival = null;
    for (const t of TIER_IDS) s.customers[t] = sectorPotential(s)[t] ?? 0;
  }
}

function unlockAll(state) {
  for (const [id, n] of Object.entries(state.tech.nodes)) n.status = NODES[id].deploy === null || NODES[id].deploy.build || NODES[id].deploy.oneTime ? STATUS.ACTIVE : STATUS.UNLOCKED;
}

export function debugSetup(state, name) {
  const d = diff(state);
  const hold = VICTORY.HOLD_MONTHS - 1;
  switch (name) {
    case 'winMonopoly':
      ownAll(state);
      state.company.cash = d.victoryCash * 2;
      state.goals.hold.monopoly = hold;
      break;
    case 'winSingularity':
      ownAll(state);
      unlockAll(state);
      for (const s of state.sectors) s.tech.D8 = STATUS.ACTIVE;
      state.sectors[0].buildings.push({ id: state.nextId++, type: 'fusion', x: 0, y: 0, status: 'active' });
      state.sectors[1].buildings.push({ id: state.nextId++, type: 'fusion', x: 12, y: 0, status: 'active' });
      state.goals.hold.singularity = hold;
      break;
    case 'winUtopia':
      ownAll(state);
      unlockAll(state);
      for (const s of state.sectors) { s.tech.S3 = STATUS.ACTIVE; s.tech.P5 = STATUS.ACTIVE; s.prosumers = s.customers.low + s.customers.medium; }
      state.meters.gs = 90;
      state.meters.cs = 95;
      state.goals.hold.utopia = hold;
      break;
    case 'loseBankrupt':
      state.company.debt = d.loanLimit;
      state.company.cash = -5_000_000;
      state.goals.loss.bankrupt = d.bankruptMonths - 1;
      break;
    case 'loseLicense':
      state.meters.gs = 0;
      state.goals.loss.license = LOSS.LICENSE_MONTHS - 1;
      break;
    case 'loseCollapse':
      for (const s of state.sectors) for (const t of TIER_IDS) s.customers[t] = 0;
      state.goals.loss.collapse = LOSS.COLLAPSE_MONTHS - 1;
      break;
    case 'endOfTime':
      state.time.month = 240;
      state.time.week = 1;
      break;
    default:
      break;
  }
}
