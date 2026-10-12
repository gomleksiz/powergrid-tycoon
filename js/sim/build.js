// Place buildings on the map (design section 5).

import { BUILDINGS } from '../data/buildings.js';
import { METERS } from '../data/balance.js';
import { mapgen, sectorAt, canPlace } from './mapgen.js';
import { globalEffects } from './effects.js';
import { spendCapex, capexCost } from './economy.js';
import { addBuildProject } from './deployment.js';

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
