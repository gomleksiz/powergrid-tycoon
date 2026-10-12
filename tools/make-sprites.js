// Draws all sprites and writes assets/sprites/tiles.png and tiles.json.
// Run: node tools/make-sprites.js
// You can also edit tiles.png by hand (Piskel, LibreSprite, Aseprite). Keep the positions in tiles.json.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRaster } from './sprites/raster.js';
import { encodePng } from './sprites/png.js';
import { SPRITES, T } from './sprites/art.js';

const SHEET_W = 16 * T;   // 384 px
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sprites');

// Shelf packing: put each frame left to right, start a new row when full.
const placed = [];
let x = 0;
let y = 0;
let rowH = 0;
for (const s of SPRITES) {
  for (let f = 0; f < s.frames; f++) {
    if (x + s.w > SHEET_W) { x = 0; y += rowH; rowH = 0; }
    placed.push({ s, f, x, y });
    x += s.w;
    rowH = Math.max(rowH, s.h);
  }
}
const SHEET_H = y + rowH;

const sheet = createRaster(SHEET_W, SHEET_H);
const json = { tile: T, image: 'tiles.png', width: SHEET_W, height: SHEET_H, sprites: {} };
let seed = 1;
for (const { s, f, x: px, y: py } of placed) {
  const r = createRaster(s.w, s.h, seed++);
  s.draw(r, f);
  sheet.blit(r, px, py);
  const entry = json.sprites[s.name] ?? (json.sprites[s.name] = { w: s.w, h: s.h, frames: [] });
  entry.frames.push([px, py]);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'tiles.png'), encodePng(SHEET_W, SHEET_H, sheet.buf));
writeFileSync(join(outDir, 'tiles.json'), JSON.stringify(json, null, 1) + '\n');
console.log(`Wrote ${Object.keys(json.sprites).length} sprites (${placed.length} frames), sheet ${SHEET_W} × ${SHEET_H}.`);
