// Place buildings on the map (design section 5).

import { BUILDINGS, LEVELS, levelOf } from '../data/buildings.js';
import { METERS } from '../data/balance.js';
import { mapgen, sectorAt, canPlace, findFreeSpot } from './mapgen.js';
import { globalEffects } from './effects.js';
import { spendCapex, capexCost } from './economy.js';
import { addBuildProject, addUpgradeProject } from './deployment.js';

export { capexCost };

export function buildingUnlocked(state, type, g = globalEffects(state)) {
  const b = BUILDINGS[type];
  return !!b && (b.needs === null || g.unlockBuilding.includes(type));
}

// Can the player start this building at all (ignores the place)? → { ok, reason }
export function buildAllowed(state, type) {
  const b = BUILDINGS[type];
  if (!b) return { ok: false, reason: 'unknown' };
  if (!buildingUnlocked(state, type)) return { ok: false, reason: 'locked', tech: b.needs };
  if (b.permitGs && (state.meters.gs < b.permitGs || state.meters.gs < METERS.LOW)) return { ok: false, reason: 'permit', gs: b.permitGs };
  if (state.company.cash < capexCost(state, b.cost)) return { ok: false, reason: 'cash' };
  return { ok: true };
}

// Can it stand on this tile? (x, y) is the top-left tile.
export function buildCheck(state, type, x, y) {
  const allowed = buildAllowed(state, type);
  if (!allowed.ok) return allowed;
  const sid = sectorAt(x, y);
  const sector = state.sectors[sid];
  if (!sector?.owned) return { ok: false, reason: 'notOwned' };
  const all = state.sectors.flatMap((s) => s.buildings);
  if (!canPlace(mapgen(state.seed), all, sid, x, y, BUILDINGS[type].size)) return { ok: false, reason: 'blocked' };
  return { ok: true, sector };
}

export function placeBuilding(state, type, x, y) {
  const check = buildCheck(state, type, x, y);
  if (!check.ok) return [{ type: 'news', payload: { key: 'buildFailed', reason: check.reason, kind: 'warn' } }];
  const b = BUILDINGS[type];
  spendCapex(state, capexCost(state, b.cost));
  const building = { id: state.nextId++, type, x, y, status: b.buildWeeks ? 'construction' : 'active' };
  check.sector.buildings.push(building);
  if (b.buildWeeks) addBuildProject(state, building, check.sector.id);  // a field crew builds it
  return [{ type: 'build:placed', payload: { type, sector: check.sector.id } }];
}

// ---------- build from the panel (version 1.2): the game picks the tile ----------

export function freeSpot(state, type, sectorId) {
  const sector = state.sectors[sectorId];
  if (!sector?.owned || !BUILDINGS[type]) return null;
  return findFreeSpot(mapgen(state.seed), state.sectors.flatMap((s) => s.buildings), sectorId, BUILDINGS[type].size);
}

// → { ok, reason } like buildAllowed, plus 'notOwned' and 'full' (no free tiles left).
export function canBuildIn(state, type, sectorId) {
  const allowed = buildAllowed(state, type);
  if (!allowed.ok) return allowed;
  if (!state.sectors[sectorId]?.owned) return { ok: false, reason: 'notOwned' };
  return freeSpot(state, type, sectorId) ? { ok: true } : { ok: false, reason: 'full' };
}

export function buildInSector(state, type, sectorId) {
  const check = canBuildIn(state, type, sectorId);
  if (!check.ok) return [{ type: 'news', payload: { key: 'buildFailed', reason: check.reason, kind: 'warn' } }];
  const spot = freeSpot(state, type, sectorId);
  return placeBuilding(state, type, spot.x, spot.y);
}

// ---------- upgrades (version 1.1) ----------

export function findBuilding(state, id) {
  for (const sector of state.sectors) {
    const b = sector.buildings.find((x) => x.id === id);
    if (b) return { b, sector };
  }
  return null;
}

export function upgradeCost(state, b) {
  return capexCost(state, BUILDINGS[b.type].cost * LEVELS.COST[levelOf(b) + 1]);
}

// → { ok, reason }
export function canUpgrade(state, id) {
  const found = findBuilding(state, id);
  if (!found || !found.sector.owned) return { ok: false, reason: 'notOwned' };
  const { b } = found;
  const def = BUILDINGS[b.type];
  if (levelOf(b) >= LEVELS.MAX) return { ok: false, reason: 'max' };
  if (b.status !== 'active' || b.upgrading || b.broken) return { ok: false, reason: 'busy' };
  if (def.permitGs && (state.meters.gs < def.permitGs || state.meters.gs < METERS.LOW)) return { ok: false, reason: 'permit', gs: def.permitGs };
  if (state.company.cash < upgradeCost(state, b)) return { ok: false, reason: 'cash' };
  return { ok: true };
}

// Small buildings are upgraded at once. Plants with a build time need a field crew.
export function upgradeBuilding(state, id) {
  if (!canUpgrade(state, id).ok) return [];
  const { b, sector } = findBuilding(state, id);
  spendCapex(state, upgradeCost(state, b));
  if (BUILDINGS[b.type].buildWeeks) {
    b.upgrading = true;
    addUpgradeProject(state, b, sector.id);
    return [];
  }
  b.level = levelOf(b) + 1;
  return [{ type: 'news', payload: { key: 'upgraded', building: b.type, sector: sector.name, level: b.level } }];
}
