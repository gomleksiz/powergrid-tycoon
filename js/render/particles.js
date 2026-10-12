// Power lines along the roads of owned sectors, with dots that show the power flow.
// A broken line (damage > 0) blinks red and shows a ⚡ icon. Visual only: Math.random is fine here.

import { MAP } from '../data/sectors.js';
import { BUILDINGS } from '../data/buildings.js';
import { mapgen, sectorBounds } from '../sim/mapgen.js';
import { drawSprite } from './sprites.js';

const T = MAP.TILE;
const WIRE_OFFSET = 3;          // art px from the road edge
const DOT_SPACING = 30;         // art px between dots
const DOT_SPEED = 0.02;         // art px per ms
const BLINK_MS = 400;

const cache = new Map();

// Line segments [x1, y1, x2, y2] in art pixels for a sector.
function sectorLines(state, sector) {
  const key = `${state.seed}:${sector.id}:${sector.buildings.length}`;
  if (cache.has(key)) return cache.get(key);
  const map = mapgen(state.seed);
  const b = sectorBounds(sector.id);
  const row = map.roadRows[Math.floor(sector.id / MAP.COLS)];
  const col = map.roadCols[sector.id % MAP.COLS];
  const wy = row * T + WIRE_OFFSET;
  const wx = col * T + WIRE_OFFSET;
  const lines = [
    [b.x * T, wy, (b.x + b.w) * T, wy],
    [wx, b.y * T, wx, (b.y + b.h) * T],
  ];
  // Each substation (and plant) links to the nearest road wire.
  for (const bd of sector.buildings) {
    const size = BUILDINGS[bd.type].size;
    const cx = (bd.x + size / 2) * T;
    const cy = (bd.y + size / 2) * T;
    if (Math.abs(cx - wx) < Math.abs(cy - wy)) lines.push([cx, cy, wx, cy]);
    else lines.push([cx, cy, cx, wy]);
  }
  cache.set(key, lines);
  return lines;
}

export function drawPowerLines(ctx, state, now, { particles = true } = {}) {
  for (const s of state.sectors) {
    if (!s.owned) continue;
    const broken = s.damage > 0;
    const blinkOn = Math.floor(now / BLINK_MS) % 2 === 0;
    const lines = sectorLines(state, s);
    ctx.lineWidth = 1;
    ctx.strokeStyle = broken ? (blinkOn ? '#ff5d6c' : '#5a1f27') : 'rgba(26, 28, 44, 0.85)';
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of lines) { ctx.moveTo(x1 + 0.5, y1 + 0.5); ctx.lineTo(x2 + 0.5, y2 + 0.5); }
    ctx.stroke();

    if (broken) {
      const b = sectorBounds(s.id);
      if (blinkOn) drawSprite(ctx, 'icon_bolt', (b.x + b.w / 2) * T - 12, (b.y + b.h / 2) * T - 30);
      continue;
    }
    if (!particles) continue;
    ctx.fillStyle = '#ffd23f';
    for (const [x1, y1, x2, y2] of lines) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 4) continue;
      const shift = (now * DOT_SPEED) % DOT_SPACING;
      for (let d = shift; d < len; d += DOT_SPACING) {
        const k = d / len;
        ctx.fillRect(Math.round(x1 + (x2 - x1) * k), Math.round(y1 + (y2 - y1) * k), 2, 2);
      }
    }
  }
}
