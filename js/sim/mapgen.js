// Map from a seed (design section 5): 48 × 30 tiles, 12 sectors of 12 × 10.
// The map is not saved: the same seed always makes the same map.
// It uses its own rng, so it never changes the game rng.

import { createRng } from '../core/rng.js';
import { MAP, SECTOR_TYPES, SECTOR_NAMES, HOME } from '../data/sectors.js';
import { BUILDINGS } from '../data/buildings.js';

export const TILE = {
  GRASS: 0, GRASS2: 1, TREE: 2, WATER: 3, ROAD: 4, PLOT: 5, FIELD: 6,
  ROCK: 7, HILL: 8, SAND: 9, PAVE: 10, MARSH: 11, CRACK: 12, BRIDGE: 13,
};

// Tiles a building can stand on.
const BUILDABLE = new Set([TILE.GRASS, TILE.GRASS2, TILE.FIELD, TILE.SAND, TILE.PAVE, TILE.HILL, TILE.TREE]);
export const isBuildable = (t) => BUILDABLE.has(t);

const MAP_SALT = 0x5bd1e995;
const cache = new Map();

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Which type and name goes in each of the 12 cells. Home Valley is always a Town in the middle row.
export function layoutSectors(seed) {
  const rng = createRng((seed ^ MAP_SALT) >>> 0);
  const [hc, hr] = MAP.HOME_CELLS[rng.int(0, MAP.HOME_CELLS.length - 1)];
  const types = [];
  for (const [type, def] of Object.entries(SECTOR_TYPES)) {
    for (let i = 0; i < def.count; i++) types.push(type);
  }
  types.splice(types.indexOf(HOME.type), 1);
  shuffle(types, rng);

  const names = {};
  for (const [type, list] of Object.entries(SECTOR_NAMES)) names[type] = shuffle([...list], rng);

  const sectors = [];
  for (let row = 0; row < MAP.ROWS; row++) {
    for (let col = 0; col < MAP.COLS; col++) {
      const home = col === hc && row === hr;
      const type = home ? HOME.type : types.pop();
      const name = home ? HOME.name : names[type].pop();
      sectors.push({ id: row * MAP.COLS + col, col, row, type, name, home });
    }
  }
  return sectors;
}

export function neighbors(sectorId) {
  const col = sectorId % MAP.COLS;
  const row = Math.floor(sectorId / MAP.COLS);
  const out = [];
  if (col > 0) out.push(sectorId - 1);
  if (col < MAP.COLS - 1) out.push(sectorId + 1);
  if (row > 0) out.push(sectorId - MAP.COLS);
  if (row < MAP.ROWS - 1) out.push(sectorId + MAP.COLS);
  return out;
}

export function sectorAt(x, y) {
  if (x < 0 || y < 0 || x >= MAP.W || y >= MAP.H) return -1;
  return Math.floor(y / MAP.SECTOR_H) * MAP.COLS + Math.floor(x / MAP.SECTOR_W);
}

export function sectorBounds(id) {
  const col = id % MAP.COLS;
  const row = Math.floor(id / MAP.COLS);
  return { x: col * MAP.SECTOR_W, y: row * MAP.SECTOR_H, w: MAP.SECTOR_W, h: MAP.SECTOR_H };
}

// The full map: { tiles, plots, roadRows, roadCols, sectors }.
export function mapgen(seed) {
  const key = seed >>> 0;
  if (cache.has(key)) return cache.get(key);

  const rng = createRng((key ^ MAP_SALT ^ 0x27d4eb2f) >>> 0);
  const sectors = layoutSectors(key);
  const W = MAP.W;
  const tiles = new Array(W * MAP.H).fill(TILE.GRASS);
  const set = (x, y, t) => { tiles[y * W + x] = t; };
  const get = (x, y) => tiles[y * W + x];

  // Grass variation
  for (let i = 0; i < tiles.length; i++) if (rng.chance(0.3)) tiles[i] = TILE.GRASS2;

  // 1 road row in each sector row, 1 road column in each sector column. They join across sectors.
  const roadRows = Array.from({ length: MAP.ROWS }, (_, r) => r * MAP.SECTOR_H + rng.int(4, 5));
  const roadCols = Array.from({ length: MAP.COLS }, (_, c) => c * MAP.SECTOR_W + rng.int(5, 6));

  for (const s of sectors) terrain(s, rng, set, get);

  for (const y of roadRows) for (let x = 0; x < W; x++) set(x, y, get(x, y) === TILE.WATER ? TILE.BRIDGE : TILE.ROAD);
  for (const x of roadCols) for (let y = 0; y < MAP.H; y++) set(x, y, get(x, y) === TILE.WATER ? TILE.BRIDGE : TILE.ROAD);

  // House, office and factory plots next to the roads, nearest to the sector center first.
  const plots = {};
  for (const s of sectors) plots[s.id] = makePlots(s, rng, set, get);

  const map = { tiles, plots, roadRows, roadCols, sectors };
  cache.set(key, map);
  return map;
}

const PLOT_SHARE = { town: 0.75, suburb: 0.85, commercial: 0.9, industrial: 0.6, river: 0.5, hills: 0.45, fault: 0.55 };

function makePlots(s, rng, set, get) {
  const b = sectorBounds(s.id);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const list = [];
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      const t = get(x, y);
      if (!(t === TILE.GRASS || t === TILE.GRASS2 || t === TILE.PAVE)) continue;
      const nearRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= b.x && ny >= b.y && nx < b.x + b.w && ny < b.y + b.h && get(nx, ny) === TILE.ROAD;
      });
      if (nearRoad && rng.chance(PLOT_SHARE[s.type])) list.push([x, y, Math.hypot(x - cx, y - cy) + rng.next()]);
    }
  }
  list.sort((p, q) => p[2] - q[2]);
  for (const [x, y] of list) set(x, y, TILE.PLOT);
  return list.map(([x, y]) => [x, y]);
}

function terrain(s, rng, set, get) {
  const b = sectorBounds(s.id);
  const each = (fn) => {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) fn(x, y);
  };
  switch (s.type) {
    case 'town':
    case 'suburb':
      each((x, y) => { if (rng.chance(s.type === 'suburb' ? 0.12 : 0.07)) set(x, y, TILE.TREE); });
      break;
    case 'commercial':
      each((x, y) => set(x, y, rng.chance(0.85) ? TILE.PAVE : TILE.TREE));
      break;
    case 'industrial':
      each((x, y) => set(x, y, rng.chance(0.7) ? TILE.PAVE : TILE.SAND));
      break;
    case 'river': {
      let rx = b.x + rng.int(2, b.w - 3);
      for (let y = b.y; y < b.y + b.h; y++) {
        set(rx, y, TILE.WATER);
        set(rx + 1, y, TILE.WATER);
        if (rng.chance(0.5)) set(rx - 1, y, TILE.MARSH);
        rx = Math.min(b.x + b.w - 3, Math.max(b.x + 1, rx + rng.int(-1, 1)));
      }
      each((x, y) => { if (get(x, y) !== TILE.WATER && rng.chance(0.15)) set(x, y, TILE.FIELD); });
      break;
    }
    case 'hills':
      each((x, y) => { if (rng.chance(0.45)) set(x, y, TILE.HILL); else if (rng.chance(0.15)) set(x, y, TILE.TREE); });
      break;
    case 'fault': {
      each((x, y) => { if (rng.chance(0.25)) set(x, y, TILE.ROCK); else if (rng.chance(0.2)) set(x, y, TILE.SAND); });
      let cy = b.y + rng.int(1, b.h - 2);
      for (let x = b.x; x < b.x + b.w; x++) {
        set(x, cy, TILE.CRACK);
        cy = Math.min(b.y + b.h - 1, Math.max(b.y, cy + rng.int(-1, 1)));
      }
      break;
    }
    default:
      break;
  }
}

// First free spots for a size × size building in a sector, nearest to the center.
export function findFreeSpot(map, buildings, sectorId, size) {
  const b = sectorBounds(sectorId);
  const spots = [];
  for (let y = b.y; y <= b.y + b.h - size; y++) {
    for (let x = b.x; x <= b.x + b.w - size; x++) {
      if (canPlace(map, buildings, sectorId, x, y, size)) spots.push([x, y, Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2)]);
    }
  }
  spots.sort((p, q) => p[2] - q[2]);
  return spots.length ? { x: spots[0][0], y: spots[0][1] } : null;
}

// All tiles inside the sector, buildable, and not under another building.
export function canPlace(map, buildings, sectorId, x, y, size) {
  const b = sectorBounds(sectorId);
  if (x < b.x || y < b.y || x + size > b.x + b.w || y + size > b.y + b.h) return false;
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if (!isBuildable(map.tiles[(y + dy) * MAP.W + x + dx])) return false;
    }
  }
  return !buildings.some((o) => {
    const os = BUILDINGS[o.type].size;
    return x < o.x + os && x + size > o.x && y < o.y + os && y + size > o.y;
  });
}
