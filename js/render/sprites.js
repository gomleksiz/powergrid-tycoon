// Loads the sprite sheet (assets/sprites/tiles.png + tiles.json).
// Until it loads (or if it fails), draw() paints a colored square instead.

const FALLBACK = '#ff00ff';
let sheet = null;
let index = null;

export async function loadSprites(base = 'assets/sprites/') {
  try {
    const res = await fetch(`${base}tiles.json`);
    index = await res.json();
    const img = new Image();
    img.src = base + index.image;
    await img.decode();
    sheet = img;
  } catch {
    sheet = null;
  }
  return !!sheet;
}

export const spritesReady = () => !!sheet;
export const spriteInfo = (name) => index?.sprites[name] ?? null;

// Draw sprite `name` (frame f) with its top-left at (x, y) in art pixels.
export function drawSprite(ctx, name, x, y, f = 0, fallback = FALLBACK) {
  const s = index?.sprites[name];
  if (!sheet || !s) {
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, s?.w ?? 24, s?.h ?? 24);
    return;
  }
  const [sx, sy] = s.frames[f % s.frames.length];
  ctx.drawImage(sheet, sx, sy, s.w, s.h, x, y, s.w, s.h);
}

export const frameCount = (name) => index?.sprites[name]?.frames.length ?? 1;
