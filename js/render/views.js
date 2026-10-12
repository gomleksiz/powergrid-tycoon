// Map views V1–V5 (design section 5). Each view uses icons or patterns, not only color.

import { MAP, SECTOR_TYPES } from '../data/sectors.js';
import { sectorBounds } from '../sim/mapgen.js';
import { drawSprite } from './sprites.js';
import { sectorStatus } from '../sim/grid.js';

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

const STATUS_ICON = { ok: 'icon_ok', warn: 'icon_warn', bad: 'icon_bad' };
const STATUS_FILL = { ok: 'rgba(58, 209, 160, 0.30)', warn: 'rgba(255, 210, 63, 0.38)', bad: 'rgba(255, 93, 108, 0.45)' };

// Map color + icon for each owned sector (✓ ! ✕).
function statusIcons(ctx, state, big) {
  for (const s of state.sectors) {
    const st = sectorStatus(s);
    if (!st) continue;
    const b = sectorBounds(s.id);
    if (!big) { drawSprite(ctx, STATUS_ICON[st], (b.x + b.w - 1) * T, b.y * T + 2); continue; }
    ctx.save();
    ctx.translate((b.x + b.w / 2 - 1) * T, (b.y + b.h / 2 - 2) * T);
    ctx.scale(2, 2);
    drawSprite(ctx, STATUS_ICON[st], 0, 0);
    ctx.restore();
    // Hours as readable text (not pixel art)
    const text = `${s.lastH < 10 ? s.lastH.toFixed(1) : Math.round(s.lastH)} h`;
    ctx.font = "700 14px 'Atkinson Hyperlegible', system-ui, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const x = (b.x + b.w / 2) * T;
    const y = (b.y + b.h / 2) * T + 4;
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(11, 16, 32, 0.85)';
    ctx.fillRect(x - w / 2, y, w, 20);
    ctx.fillStyle = '#eef1fb';
    ctx.fillText(text, x, y + 3);
    ctx.textAlign = 'start';
  }
}

const overlays = {
  outage(ctx, state) {
    for (const s of state.sectors) {
      const st = sectorStatus(s);
      if (!st) continue;
      const b = sectorBounds(s.id);
      ctx.fillStyle = STATUS_FILL[st];
      ctx.fillRect(b.x * T, b.y * T, b.w * T, b.h * T);
      if (st === 'bad') hatch(ctx, b, 'rgba(255, 93, 108, 0.6)', 6);
      if (st === 'warn') hatch(ctx, b, 'rgba(255, 210, 63, 0.5)', 12);
    }
  },
  hazards(ctx, state) {
    for (const s of state.sectors) {
      const hz = Object.keys(SECTOR_TYPES[s.type].hazard);
      if (hz.length) hatch(ctx, sectorBounds(s.id), 'rgba(255, 165, 58, 0.6)');
    }
  },
};

const icons = {
  normal(ctx, state) { statusIcons(ctx, state, false); },
  outage(ctx, state) { statusIcons(ctx, state, true); },
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
