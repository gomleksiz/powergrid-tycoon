// Rain, wind, snow, flood, quake and heat overlays during disasters (visual only).
// "Reduce motion" keeps only a still tint.

import { MAP } from '../data/sectors.js';
import { sectorBounds } from '../sim/mapgen.js';

const T = MAP.TILE;
const TINT = {
  windstorm: 'rgba(40, 50, 80, 0.35)', superstorm: 'rgba(25, 30, 60, 0.5)', ice: 'rgba(200, 225, 255, 0.28)',
  flood: 'rgba(40, 110, 220, 0.38)', earthquake: 'rgba(120, 80, 40, 0.25)', heatwave: 'rgba(255, 120, 40, 0.16)',
};

// A stable pseudo-random number for particle i (no Math.random, so it does not flicker).
const hash = (i) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function streaks(ctx, b, now, { color, dx, dy, len, count, speed, width = 1 }) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  const W = b.w * T;
  const H = b.h * T;
  for (let i = 0; i < count; i++) {
    const t = ((now * speed) / 1000 + hash(i)) % 1;
    const x = b.x * T + ((hash(i + 99) * W + t * dx) % W + W) % W;
    const y = b.y * T + ((hash(i + 7) * H + t * dy) % H + H) % H;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (dx / Math.hypot(dx, dy)) * len, y + (dy / Math.hypot(dx, dy)) * len);
  }
  ctx.stroke();
}

export function drawWeather(ctx, state, now, { motion = true } = {}) {
  const heat = state.market.mods.some((m) => m.kind === 'heat');
  if (heat) {
    ctx.fillStyle = TINT.heatwave;
    ctx.fillRect(0, 0, MAP.W * T, MAP.H * T);
  }
  for (const a of state.disasters.active) {
    if (a.type === 'heatwave') continue;
    for (const id of a.sectors) {
      const b = sectorBounds(id);
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x * T, b.y * T, b.w * T, b.h * T);
      ctx.clip();
      ctx.fillStyle = TINT[a.type] ?? TINT.windstorm;
      ctx.fillRect(b.x * T, b.y * T, b.w * T, b.h * T);
      if (motion) {
        if (a.type === 'windstorm' || a.type === 'superstorm') {
          streaks(ctx, b, now, { color: 'rgba(190, 210, 255, 0.55)', dx: 140, dy: 260, len: 10, count: a.type === 'superstorm' ? 160 : 90, speed: 1.6 });
        } else if (a.type === 'ice') {
          streaks(ctx, b, now, { color: 'rgba(255, 255, 255, 0.85)', dx: 20, dy: 120, len: 2, count: 80, speed: 0.4, width: 2 });
        } else if (a.type === 'flood') {
          streaks(ctx, b, now, { color: 'rgba(200, 230, 255, 0.5)', dx: 200, dy: 0, len: 8, count: 40, speed: 0.3 });
        } else if (a.type === 'earthquake') {
          streaks(ctx, b, now, { color: 'rgba(40, 25, 15, 0.55)', dx: 0, dy: 1, len: 3, count: 40, speed: 6, width: 2 });
        }
      }
      ctx.restore();
    }
  }
}
