// Camera in art pixels. scale = device pixels per art pixel, always a whole number,
// so every art pixel has the same size and stays sharp.

import { MAP } from '../data/sectors.js';

export const ZOOM_LEVELS = [1, 2, 3, 4, 5, 6, 8, 10];
const MARGIN = 48; // art pixels the player can move past the map edge

export function createCamera() {
  const cam = { x: 0, y: 0, level: 1, viewW: 1, viewH: 1 };
  const mapW = () => MAP.W * MAP.TILE;
  const mapH = () => MAP.H * MAP.TILE;

  cam.scale = () => ZOOM_LEVELS[cam.level];

  function clampAxis(pos, view, size) {
    if (view >= size + MARGIN * 2) return (size - view) / 2;
    return Math.min(size + MARGIN - view, Math.max(-MARGIN, pos));
  }

  cam.clamp = () => {
    const s = cam.scale();
    cam.x = clampAxis(cam.x, cam.viewW / s, mapW());
    cam.y = clampAxis(cam.y, cam.viewH / s, mapH());
  };

  cam.resize = (w, h) => {
    const cx = cam.x + cam.viewW / cam.scale() / 2;
    const cy = cam.y + cam.viewH / cam.scale() / 2;
    cam.viewW = w;
    cam.viewH = h;
    cam.centerOn(cx, cy);
  };

  cam.centerOn = (ax, ay) => {
    const s = cam.scale();
    cam.x = ax - cam.viewW / s / 2;
    cam.y = ay - cam.viewH / s / 2;
    cam.clamp();
  };

  // Biggest zoom where an area of w × h art pixels fits.
  cam.fit = (w, h) => {
    let best = 0;
    ZOOM_LEVELS.forEach((s, i) => { if (w * s <= cam.viewW && h * s <= cam.viewH) best = i; });
    cam.level = best;
  };

  // Keep the art point under the screen point (sx, sy) in place.
  cam.zoomTo = (level, sx = cam.viewW / 2, sy = cam.viewH / 2) => {
    const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, level));
    if (next === cam.level) return false;
    const before = cam.toArt(sx, sy);
    cam.level = next;
    cam.x = before.x - sx / cam.scale();
    cam.y = before.y - sy / cam.scale();
    cam.clamp();
    return true;
  };

  cam.zoomBy = (dir, sx, sy) => cam.zoomTo(cam.level + dir, sx, sy);

  // dx, dy in device pixels.
  cam.pan = (dx, dy) => {
    cam.x -= dx / cam.scale();
    cam.y -= dy / cam.scale();
    cam.clamp();
  };

  cam.toArt = (sx, sy) => ({ x: cam.x + sx / cam.scale(), y: cam.y + sy / cam.scale() });
  cam.toScreen = (ax, ay) => ({ x: (ax - cam.x) * cam.scale(), y: (ay - cam.y) * cam.scale() });
  cam.toTile = (sx, sy) => {
    const a = cam.toArt(sx, sy);
    return { x: Math.floor(a.x / MAP.TILE), y: Math.floor(a.y / MAP.TILE) };
  };

  return cam;
}
