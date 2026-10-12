// Draws the map. Reads the state and the UI state; never changes them.
// The terrain is drawn once into a cache canvas (1152 × 720 art pixels).

import { MAP, SECTOR_TYPES } from '../data/sectors.js';
import { BUILDINGS } from '../data/buildings.js';
import { TIER_IDS } from '../data/balance.js';
import { mapgen, TILE, sectorBounds } from '../sim/mapgen.js';
import { drawSprite, spritesReady } from './sprites.js';
import { drawViewOverlay, drawViewIcons } from './views.js';

const T = MAP.TILE;

const TILE_SPRITE = {
  [TILE.GRASS]: 'grass', [TILE.GRASS2]: 'grass2', [TILE.TREE]: 'tree', [TILE.WATER]: 'water',
  [TILE.PLOT]: 'plot', [TILE.FIELD]: 'field', [TILE.ROCK]: 'rock', [TILE.HILL]: 'hill',
  [TILE.SAND]: 'sand', [TILE.PAVE]: 'pave', [TILE.MARSH]: 'marsh', [TILE.CRACK]: 'crack',
};

const FALLBACK_COLOR = {
  [TILE.GRASS]: '#4ea454', [TILE.GRASS2]: '#3f8f47', [TILE.TREE]: '#2b6b37', [TILE.WATER]: '#3c7fd4',
  [TILE.ROAD]: '#4a4e5c', [TILE.BRIDGE]: '#6a7080', [TILE.PLOT]: '#c4aa62', [TILE.FIELD]: '#b9a343',
  [TILE.ROCK]: '#6f6a6a', [TILE.HILL]: '#5e8f45', [TILE.SAND]: '#d6c07c', [TILE.PAVE]: '#9da2b0',
  [TILE.MARSH]: '#4f7c5c', [TILE.CRACK]: '#241c1c',
};

// Which house sprite each sector type uses.
const HOUSE_SPRITES = {
  town: ['house_a', 'house_b', 'house_a'],
  suburb: ['house_c', 'house_b', 'house_c'],
  commercial: ['shop', 'office', 'office'],
  industrial: ['factory', 'factory', 'office'],
  river: ['house_a', 'cabin', 'house_b'],
  hills: ['cabin', 'house_a', 'cabin'],
  fault: ['house_b', 'office', 'house_c'],
};
const MIN_HOUSE_SHARE = 0.25;   // a sector always shows some houses
const FRAME_MS = { water: 700, wind: 140, fusion: 500 };

export function createMapRenderer(canvas, camera) {
  const ctx = canvas.getContext('2d');
  let terrain = null;
  let terrainSeed = null;
  let terrainWithSprites = false;

  function buildTerrain(map) {
    terrain = document.createElement('canvas');
    terrain.width = MAP.W * T;
    terrain.height = MAP.H * T;
    const c = terrain.getContext('2d');
    c.imageSmoothingEnabled = false;
    const rows = new Set(map.roadRows);
    const cols = new Set(map.roadCols);
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const t = map.tiles[y * MAP.W + x];
        if (!spritesReady()) {
          c.fillStyle = FALLBACK_COLOR[t] ?? '#f0f';
          c.fillRect(x * T, y * T, T, T);
          continue;
        }
        let name = TILE_SPRITE[t];
        if (t === TILE.ROAD) name = rows.has(y) && cols.has(x) ? 'road_x' : rows.has(y) ? 'road_h' : 'road_v';
        if (t === TILE.BRIDGE) name = rows.has(y) ? 'bridge_h' : 'bridge_v';
        drawSprite(c, t === TILE.PLOT ? 'grass' : name, x * T, y * T); // plots are drawn each frame
      }
    }
    // thin sector borders
    c.strokeStyle = 'rgba(10, 14, 30, 0.55)';
    c.lineWidth = 1;
    for (let i = 1; i < MAP.COLS; i++) { c.beginPath(); c.moveTo(i * MAP.SECTOR_W * T + 0.5, 0); c.lineTo(i * MAP.SECTOR_W * T + 0.5, terrain.height); c.stroke(); }
    for (let j = 1; j < MAP.ROWS; j++) { c.beginPath(); c.moveTo(0, j * MAP.SECTOR_H * T + 0.5); c.lineTo(terrain.width, j * MAP.SECTOR_H * T + 0.5); c.stroke(); }
    terrainWithSprites = spritesReady();
  }

  function frame(name, now) {
    return Math.floor(now / FRAME_MS[name]);
  }

  function drawWater(map, now) {
    const f = frame('water', now) % 2;
    if (f === 0) return; // frame 0 is in the cache
    for (let i = 0; i < map.tiles.length; i++) {
      if (map.tiles[i] === TILE.WATER) drawSprite(ctx, 'water', (i % MAP.W) * T, Math.floor(i / MAP.W) * T, 1);
    }
  }

  function housesFor(sector, map) {
    const plots = map.plots[sector.id];
    const pot = SECTOR_TYPES[sector.type].potential;
    let have = 0;
    let max = 0;
    for (const t of TIER_IDS) { have += sector.customers[t] + (sector.rival?.customers?.[t] ?? 0); max += pot[t] ?? 0; }
    const share = Math.max(MIN_HOUSE_SHARE, max ? have / max : 0);
    return plots.slice(0, Math.round(plots.length * Math.min(1, share)));
  }

  function drawHouses(state, map) {
    for (const s of state.sectors) {
      const list = housesFor(s, map);
      const kinds = HOUSE_SPRITES[s.type];
      list.forEach(([x, y], i) => {
        drawSprite(ctx, 'plot', x * T, y * T);
        drawSprite(ctx, kinds[(x * 7 + y * 3 + i) % kinds.length], x * T, y * T);
      });
      // empty plots show as plain lots
      for (const [x, y] of map.plots[s.id].slice(list.length)) drawSprite(ctx, 'plot', x * T, y * T);
    }
  }

  function drawBuildings(state, now) {
    for (const s of state.sectors) {
      for (const b of s.buildings) {
        const f = b.type === 'wind' ? frame('wind', now) : b.type === 'fusion' ? frame('fusion', now) : 0;
        drawSprite(ctx, b.type, b.x * T, b.y * T, b.status === 'active' ? f : 0);
        if (b.status === 'construction') {
          const size = BUILDINGS[b.type].size;
          ctx.globalAlpha = 0.85;
          for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) drawSprite(ctx, 'construction', (b.x + dx) * T, (b.y + dy) * T);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawLocked(state) {
    for (const s of state.sectors) {
      if (s.owned) continue;
      const b = sectorBounds(s.id);
      ctx.fillStyle = 'rgba(8, 10, 24, 0.42)';
      ctx.fillRect(b.x * T, b.y * T, b.w * T, b.h * T);
      drawSprite(ctx, 'icon_lock', (b.x + b.w / 2) * T - 12, (b.y + b.h / 2) * T - 12);
    }
  }

  function drawSelection(ui) {
    if (ui.selected === null) return;
    const b = sectorBounds(ui.selected);
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x * T + 1, b.y * T + 1, b.w * T - 2, b.h * T - 2);
  }

  function drawGhost(ui, now) {
    if (!ui.placing || !ui.ghost) return;
    const size = BUILDINGS[ui.placing].size;
    const { x, y, ok } = ui.ghost;
    ctx.globalAlpha = 0.7 + 0.15 * Math.sin(now / 200);
    drawSprite(ctx, ui.placing, x * T, y * T);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ok ? 'rgba(58, 209, 160, 0.35)' : 'rgba(255, 93, 108, 0.45)';
    ctx.fillRect(x * T, y * T, size * T, size * T);
    ctx.strokeStyle = ok ? '#3ad1a0' : '#ff5d6c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * T + 0.5, y * T + 0.5, size * T - 1, size * T - 1);
    drawSprite(ctx, ok ? 'icon_ok' : 'icon_bad', (x + size) * T - 14, y * T - 10);
  }

  // Readable text (not pixel art), drawn in screen space.
  function drawLabels(state, ui) {
    const dpr = window.devicePixelRatio || 1;
    const fontPx = Math.round(14 * dpr);
    ctx.font = `700 ${fontPx}px 'Atkinson Hyperlegible', system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    for (const sec of state.sectors) {
      const b = sectorBounds(sec.id);
      const p = camera.toScreen(b.x * T + 4, b.y * T + 4);
      const text = sec.name;
      const w = ctx.measureText(text).width;
      ctx.fillStyle = sec.id === ui.selected ? 'rgba(255, 210, 63, 0.92)' : 'rgba(11, 16, 32, 0.78)';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), w + 12 * dpr, fontPx + 8 * dpr);
      ctx.fillStyle = sec.id === ui.selected ? '#1a1400' : '#eef1fb';
      ctx.fillText(text, Math.round(p.x + 6 * dpr), Math.round(p.y + 4 * dpr));
    }
  }

  function draw(state, ui, now = performance.now()) {
    if (!state) return;
    const map = mapgen(state.seed);
    if (terrainSeed !== state.seed || terrainWithSprites !== spritesReady()) {
      buildTerrain(map);
      terrainSeed = state.seed;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#070b17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = camera.scale();
    ctx.setTransform(s, 0, 0, s, Math.round(-camera.x * s), Math.round(-camera.y * s));
    ctx.drawImage(terrain, 0, 0);
    drawWater(map, now);
    drawHouses(state, map);
    drawBuildings(state, now);
    drawViewOverlay(ctx, state, ui, now);
    drawLocked(state);
    drawViewIcons(ctx, state, ui, now);
    drawSelection(ui);
    drawGhost(ui, now);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawLabels(state, ui);
  }

  return { draw };
}
