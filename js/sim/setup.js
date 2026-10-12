// Start values for the sectors and the tech tree of a new game.

import { mapgen, layoutSectors, findFreeSpot } from './mapgen.js';
import { SECTOR_START, HOME_BUILDINGS, SECTOR_TYPES, HOME } from '../data/sectors.js';
import { BUILDINGS } from '../data/buildings.js';
import { NODES, NODE_IDS } from '../data/techTree.js';
import { STATUS } from './effects.js';

export function emptyTiers(v = 0) {
  return { low: v, medium: v, high: v, corporate: v };
}

// Possible customers in a sector, for each tier.
// It grows over time (sector.growth, version 1.1).
export function sectorPotential(sector) {
  const base = SECTOR_TYPES[sector.type].potential;
  const mult = sector.home ? HOME.potentialMult : 1;
  return Object.fromEntries(Object.entries(base).map(([t, n]) => [t, Math.round(n * mult * (sector.growth?.[t] ?? 1))]));
}

export const potentialTotal = (sector) => Object.values(sectorPotential(sector)).reduce((a, b) => a + b, 0);

export function createSector(def) {
  return {
    id: def.id,
    type: def.type,
    name: def.name,
    home: !!def.home,
    owned: false,
    health: SECTOR_START.health,
    damage: 0,
    dmgHours: 0,         // damage hours so far this month (section 7)
    lastH: 0,            // outage hours of the last month
    lastParts: { wear: 0, overload: 0, damage: 0, shortage: 0, R: 1 },
    priority: SECTOR_START.priority,
    discount: 0,         // local price cut 0, 0.1, 0.2, 0.3
    customers: emptyTiers(),
    prosumers: 0,
    buildings: [],
    tech: {},            // per-sector deploy status, e.g. { D2: 'ACTIVE' }
    prep: false,         // Storm Prep paid
    prepRepair: false,   // a prepped sector was hit: crews repair at once
    rival: null,
    growth: emptyTiers(1), // more homes and firms over time (version 1.1)
    repairTechs: 0,        // technicians that repaired here last week
  };
}

// Returns { sectors, nextId }.
export function createSectors(seed, startCustomers) {
  const map = mapgen(seed);
  let nextId = 1;
  const sectors = layoutSectors(seed).map((def) => {
    const s = createSector(def);
    if (def.home) {
      s.owned = true;
      s.health = SECTOR_START.homeHealth;
      s.customers.low = startCustomers;
      for (const type of HOME_BUILDINGS) {
        const spot = findFreeSpot(map, s.buildings, s.id, BUILDINGS[type].size);
        if (spot) s.buildings.push({ id: nextId++, type, x: spot.x, y: spot.y, status: 'active' });
      }
    }
    return s;
  });
  return { sectors, nextId };
}

export function createTech() {
  const nodes = {};
  for (const id of NODE_IDS) {
    nodes[id] = { status: NODES[id].start ? STATUS.ACTIVE : STATUS.LOCKED, rp: 0, leap: false };
  }
  refreshAvailable(nodes);
  return { nodes, bankRp: 0 };
}

// LOCKED → AVAILABLE when all prerequisites are done (or the leap source is done).
export function refreshAvailable(nodes) {
  const done = (id) => nodes[id].status === STATUS.UNLOCKED || nodes[id].status === STATUS.ACTIVE;
  for (const id of NODE_IDS) {
    if (nodes[id].status !== STATUS.LOCKED) continue;
    const node = NODES[id];
    if (node.needs.every(done) || (node.leapFrom && done(node.leapFrom))) nodes[id].status = STATUS.AVAILABLE;
  }
}

// Can this node only be researched as a leapfrog right now?
export function needsLeap(nodes, id) {
  const done = (x) => nodes[x].status === STATUS.UNLOCKED || nodes[x].status === STATUS.ACTIVE;
  return !NODES[id].needs.every(done) && !!NODES[id].leapFrom && done(NODES[id].leapFrom);
}
