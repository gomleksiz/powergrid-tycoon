// Draws the app icons (a yellow lightning bolt on night blue) into assets/icons/.
// Run: node tools/make-icons.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRaster } from './sprites/raster.js';
import { encodePng } from './sprites/png.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icons');
const BG = '#0b1020';
const GRID = '#1d2647';
const BOLT = '#ffd23f';
const EDGE = '#1a1400';
// The bolt as a polygon in a 0–1 square.
const SHAPE = [[0.58, 0.08], [0.24, 0.56], [0.46, 0.56], [0.38, 0.92], [0.76, 0.40], [0.54, 0.40], [0.64, 0.08]];

function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// pad: empty space around the bolt (maskable icons need a safe zone).
function icon(size, { pad = 0.08, round = true } = {}) {
  const r = createRaster(size, size);
  const rad = round ? size * 0.18 : 0;
  const grid = Math.max(4, Math.round(size / 8));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.min(x, size - 1 - x);
      const cy = Math.min(y, size - 1 - y);
      if (cx < rad && cy < rad && (rad - cx) ** 2 + (rad - cy) ** 2 > rad ** 2) continue;   // rounded corner
      r.px(x, y, x % grid === 0 || y % grid === 0 ? GRID : BG);
    }
  }
  const scale = 1 - pad * 2;
  const pts = SHAPE.map(([x, y]) => [(pad + x * scale) * size, (pad + y * scale) * size]);
  const edge = Math.max(1, Math.round(size / 48));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inside(pts, x + 0.5, y + 0.5)) r.px(x, y, BOLT);
      else {
        let near = false;
        for (let dy = -edge; dy <= edge && !near; dy++) for (let dx = -edge; dx <= edge && !near; dx++) near = inside(pts, x + 0.5 + dx, y + 0.5 + dy);
        if (near) r.px(x, y, EDGE);
      }
    }
  }
  return encodePng(size, size, r.buf);
}

mkdirSync(out, { recursive: true });
for (const s of [32, 180, 192, 512]) writeFileSync(join(out, `icon-${s}.png`), icon(s));
writeFileSync(join(out, 'icon-maskable-512.png'), icon(512, { pad: 0.2, round: false }));
console.log('Wrote icons to assets/icons/.');
