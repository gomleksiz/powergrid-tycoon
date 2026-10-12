// Map views V1–V5 (design section 5). Each view uses icons or patterns, not only color.

import { MAP, SECTOR_TYPES } from '../data/sectors.js';
import { sectorBounds } from '../sim/mapgen.js';
import { drawSprite } from './sprites.js';

const T = MAP.TILE;

export const VIEWS = ['normal', 'outage', 'tiers', 'rivals', 'hazards'];

const HAZARD_ICON = { flood: 'icon_flood', windstorm: 'icon_wind', earthquake: 'icon_quake' };

// Diagonal stripes, so the view still reads without color.
function hatch(ctx, b, color, gap = 8) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x * T, b.y * T, b.w * T, b.h * T);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = -b.h * T; i < b.w * T; i += gap) {
    ctx.beginPath();
    ctx.moveTo(b.x * T + i, b.y * T + b.h * T);
    ctx.lineTo(b.x * T + i + b.h * T, b.y * T);
    ctx.stroke();
  }
  ctx.restore();
}

const overlays = {
  hazards(ctx, state) {
    for (const s of state.sectors) {
      const hz = Object.keys(SECTOR_TYPES[s.type].hazard);
      if (hz.length) hatch(ctx, sectorBounds(s.id), 'rgba(255, 165, 58, 0.6)');
    }
  },
};

const icons = {
  hazards(ctx, state) {
    for (const s of state.sectors) {
      const hz = Object.entries(SECTOR_TYPES[s.type].hazard);
      const b = sectorBounds(s.id);
      // 2 × size, in the middle of the sector
      hz.forEach(([kind], i) => {
        ctx.save();
        ctx.translate((b.x + b.w / 2 - 1 + i * 2) * T, (b.y + b.h / 2 - 3) * T);
        ctx.scale(2, 2);
        drawSprite(ctx, HAZARD_ICON[kind], 0, 0);
        ctx.restore();
      });
    }
  },
};

// Views fill these in later steps (outage, tiers, rivals).
export function registerView(name, { overlay, icon }) {
  if (overlay) overlays[name] = overlay;
  if (icon) icons[name] = icon;
}

export const viewReady = (name) => name === 'normal' || !!overlays[name] || !!icons[name];

export function drawViewOverlay(ctx, state, ui, now) {
  overlays[ui.view]?.(ctx, state, now);
}

export function drawViewIcons(ctx, state, ui, now) {
  icons[ui.view]?.(ctx, state, now);
}
