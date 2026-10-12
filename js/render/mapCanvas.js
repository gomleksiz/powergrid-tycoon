// Canvas setup: fills its box, sharp pixels, devicePixelRatio aware.
// Draws a placeholder tile grid until the real map arrives in step 4.

import { T } from '../data/text.js';

const TILE = 16;           // art size of 1 tile in pixels
const COLORS = ['#10182e', '#121b34'];

export function mountMapCanvas(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.imageSmoothingEnabled = false;
    draw(dpr);
  }

  function draw(dpr) {
    // Whole-number scale so every art pixel is the same size on screen.
    const scale = Math.max(1, Math.round(2 * dpr));
    const size = TILE * scale;
    for (let y = 0; y * size < canvas.height; y++) {
      for (let x = 0; x * size < canvas.width; x++) {
        ctx.fillStyle = COLORS[(x + y) % 2];
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
    ctx.fillStyle = '#a9b2d6';
    ctx.font = `${Math.round(18 * dpr)}px 'Atkinson Hyperlegible', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(T.mapPlaceholder, canvas.width / 2, canvas.height / 2);
  }

  new ResizeObserver(resize).observe(canvas);
  document.fonts?.ready.then(resize);
  return { resize };
}
