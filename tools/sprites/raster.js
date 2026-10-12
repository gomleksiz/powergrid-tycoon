// A tiny pixel canvas for drawing sprites in Node.

import { createRng } from '../../js/core/rng.js';

export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return c.length === 9
    ? [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
    : [(n >>> 16) & 255, (n >>> 8) & 255, n & 255, 255];
}

export function createRaster(w, h, seed = 1) {
  const buf = new Uint8Array(w * h * 4);
  const rng = createRng(seed);

  function px(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h || !color) return;
    const [r, g, b, a] = hex(color);
    const i = (y * w + x) * 4;
    if (a === 255) { buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; return; }
    const k = a / 255;
    buf[i] = Math.round(buf[i] * (1 - k) + r * k);
    buf[i + 1] = Math.round(buf[i + 1] * (1 - k) + g * k);
    buf[i + 2] = Math.round(buf[i + 2] * (1 - k) + b * k);
    buf[i + 3] = Math.max(buf[i + 3], a);
  }

  const api = {
    w, h, buf, rng, px,
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) px(x + i, y + j, c); return api; },
    frame(x, y, rw, rh, c) {
      for (let i = 0; i < rw; i++) { px(x + i, y, c); px(x + i, y + rh - 1, c); }
      for (let j = 0; j < rh; j++) { px(x, y + j, c); px(x + rw - 1, y + j, c); }
      return api;
    },
    line(x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
      return api;
    },
    disc(cx, cy, r, c) {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c);
      return api;
    },
    ring(cx, cy, r, c) {
      for (let a = 0; a < 360; a += 3) px(cx + Math.cos(a * Math.PI / 180) * r, cy + Math.sin(a * Math.PI / 180) * r, c);
      return api;
    },
    // Fill with a base color and a few random speckles.
    noise(x, y, rw, rh, base, specks, amount = 0.15) {
      api.rect(x, y, rw, rh, base);
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
        if (rng.next() < amount) px(x + i, y + j, specks[Math.floor(rng.next() * specks.length)]);
      }
      return api;
    },
    // Copy another raster into this one at (dx, dy).
    blit(src, dx, dy) {
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.buf[i + 3] === 0) continue;
        const o = ((dy + y) * w + dx + x) * 4;
        buf[o] = src.buf[i]; buf[o + 1] = src.buf[i + 1]; buf[o + 2] = src.buf[i + 2]; buf[o + 3] = src.buf[i + 3];
      }
      return api;
    },
  };
  return api;
}
