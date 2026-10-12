import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapgen, layoutSectors, neighbors, sectorAt, TILE, canPlace } from '../js/sim/mapgen.js';
import { fnv1a } from '../js/save/checksum.js';
import { MAP, SECTOR_TYPES } from '../js/data/sectors.js';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { serialize, readSave } from '../js/save/save.js';

const tileHash = (seed) => fnv1a(mapgen(seed, { useCache: false }).tiles.join(','));

test('the same seed gives the same tile array (hash)', () => {
  assert.equal(tileHash(123), tileHash(123));
  assert.deepEqual(mapgen(123, { useCache: false }).plots, mapgen(123, { useCache: false }).plots);
  assert.notEqual(tileHash(123), tileHash(124));
});

test('a fixed seed always makes the same map (guards against changes)', () => {
  const map = mapgen(42);
  assert.equal(map.tiles.length, 48 * 30);
  assert.deepEqual(layoutSectors(42), map.sectors);
  assert.equal(layoutSectors(42).map((s) => s.type).join(), layoutSectors(42).map((s) => s.type).join());
});

test('48 × 30 tiles and 12 sectors with the type counts from section 5', () => {
  for (const seed of [1, 2, 3, 99, 4242]) {
    const sectors = layoutSectors(seed);
    assert.equal(sectors.length, 12);
    const counts = {};
    for (const s of sectors) counts[s.type] = (counts[s.type] ?? 0) + 1;
    for (const [type, def] of Object.entries(SECTOR_TYPES)) assert.equal(counts[type], def.count, `${type} on seed ${seed}`);
    const home = sectors.filter((s) => s.home);
    assert.equal(home.length, 1);
    assert.equal(home[0].name, 'Home Valley');
    assert.equal(home[0].type, 'town');
    assert.equal(neighbors(home[0].id).length, 4);
  }
});

test('roads cross every sector', () => {
  const map = mapgen(7);
  for (let id = 0; id < 12; id++) {
    const roadTiles = map.tiles.filter((t, i) => sectorAt(i % MAP.W, Math.floor(i / MAP.W)) === id && (t === TILE.ROAD || t === TILE.BRIDGE));
    assert.ok(roadTiles.length >= 20, `sector ${id} has ${roadTiles.length} road tiles`);
  }
});

test('the start sector has 2 substations on free tiles', () => {
  const s = createState(9, 'normal');
  const home = s.sectors.find((x) => x.owned);
  assert.equal(home.buildings.length, 2);
  for (const b of home.buildings) assert.equal(b.type, 'substation');
});

test('place a building: size, free tiles, owned sector, cost', () => {
  setState(createState(9, 'normal'));
  const s = getState();
  const home = s.sectors.find((x) => x.owned);
  const map = mapgen(s.seed);
  const all = s.sectors.flatMap((x) => x.buildings);
  // find a free tile in the home sector
  let spot = null;
  for (let y = 0; y < MAP.H && !spot; y++) for (let x = 0; x < MAP.W && !spot; x++) {
    if (sectorAt(x, y) === home.id && canPlace(map, all, home.id, x, y, 1)) spot = { x, y };
  }
  const cash = s.company.cash;
  dispatch({ type: 'build/place', payload: { type: 'substation', ...spot } });
  assert.equal(home.buildings.length, 3);
  assert.equal(s.company.cash, cash - 40_000);
  // the same tile again is refused
  dispatch({ type: 'build/place', payload: { type: 'substation', ...spot } });
  assert.equal(home.buildings.length, 3);
  // a locked building is refused
  dispatch({ type: 'build/place', payload: { type: 'solar', x: spot.x + 1, y: spot.y } });
  assert.equal(home.buildings.length, 3);
  // a sector that is not owned is refused
  const other = s.sectors.find((x) => !x.owned);
  const ob = { x: (other.id % 4) * 12 + 1, y: Math.floor(other.id / 4) * 10 + 1 };
  dispatch({ type: 'build/place', payload: { type: 'substation', ...ob } });
  assert.equal(other.buildings.length, 0);
});

test('buildings stay after save and load', () => {
  setState(createState(9, 'normal'));
  const s = getState();
  const before = JSON.stringify(s.sectors.map((x) => x.buildings));
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  storage.setItem('k', JSON.stringify(serialize(s)));
  const loaded = readSave('k', storage).state;
  assert.equal(JSON.stringify(loaded.sectors.map((x) => x.buildings)), before);
});
