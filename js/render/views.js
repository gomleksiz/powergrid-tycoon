// Map views V1–V5 (design section 5). Each view uses icons or patterns, not only color.

import { MAP, SECTOR_TYPES } from '../data/sectors.js';
import { sectorBounds } from '../sim/mapgen.js';
import { drawSprite } from './sprites.js';
import { sectorStatus } from '../sim/grid.js';
import { TIER_IDS } from '../data/balance.js';

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

// Tier colors; each segment also has a letter (L, M, H, C), so color is not needed.
const TIER_COLOR = { low: '#6cb8ff', medium: '#3ad1a0', high: '#ffd23f', corporate: '#c9b8ff' };
const TIER_LETTER = { low: 'L', medium: 'M', high: 'H', corporate: 'C' };

function tierBars(ctx, state) {
  ctx.font = "700 13px 'Atkinson Hyperlegible', system-ui, sans-serif";
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (const s of state.sectors) {
    if (!s.owned) continue;
    const b = sectorBounds(s.id);
    const total = TIER_IDS.reduce((n, t) => n + s.customers[t], 0);
    const x0 = (b.x + 1) * T;
    const w = (b.w - 2) * T;
    const y = (b.y + b.h / 2 - 0.5) * T;
    ctx.fillStyle = 'rgba(11, 16, 32, 0.9)';
    ctx.fillRect(x0 - 3, y - 3, w + 6, T + 26);
    let x = x0;
    for (const t of TIER_IDS) {
      if (!s.customers[t] || !total) continue;
      const sw = Math.max(16, (w * s.customers[t]) / total);
      ctx.fillStyle = TIER_COLOR[t];
      ctx.fillRect(x, y, Math.min(sw, x0 + w - x), T);
      ctx.fillStyle = '#0b1020';
      ctx.fillText(TIER_LETTER[t], x + Math.min(sw, x0 + w - x) / 2, y + T / 2);
      x += sw;
    }
    ctx.fillStyle = '#eef1fb';
    ctx.fillText(TIER_IDS.filter((t) => s.customers[t]).map((t) => `${TIER_LETTER[t]} ${s.customers[t]}`).join('  ') || '0', x0 + w / 2, y + T + 11);
  }
  ctx.textAlign = 'start';
}

const RIVAL_COLOR = { apex: 'rgba(255, 93, 108, 0.55)', volt: 'rgba(79, 141, 255, 0.55)', nova: 'rgba(58, 209, 160, 0.55)' };
const RIVAL_ICON = { apex: 'icon_apex', volt: 'icon_volt', nova: 'icon_nova' };
const RIVAL_HATCH = { apex: 6, volt: 12, nova: 9 };

function rivalIcons(ctx, state, big) {
  for (const s of state.sectors) {
    if (!s.rival) continue;
    const b = sectorBounds(s.id);
    if (!big) { drawSprite(ctx, RIVAL_ICON[s.rival.id], (b.x + b.w - 2) * T, b.y * T + 2); continue; }
    ctx.save();
    ctx.translate((b.x + b.w / 2 - 1) * T, (b.y + b.h / 2 - 2) * T);
    ctx.scale(2, 2);
    drawSprite(ctx, RIVAL_ICON[s.rival.id], 0, 0);
    ctx.restore();
    // strength bar
    const x = (b.x + 2) * T;
    const y = (b.y + b.h / 2 + 1) * T;
    const w = (b.w - 4) * T;
    ctx.fillStyle = 'rgba(11, 16, 32, 0.9)';
    ctx.fillRect(x - 2, y - 2, w + 4, 14);
    ctx.fillStyle = '#ff5d6c';
    ctx.fillRect(x, y, (w * Math.min(100, s.rival.strength)) / 100, 10);
  }
}

overlays.rivals = (ctx, state) => {
  for (const s of state.sectors) if (s.rival) hatch(ctx, sectorBounds(s.id), RIVAL_COLOR[s.rival.id], RIVAL_HATCH[s.rival.id]);
};

const icons = {
  normal(ctx, state) { statusIcons(ctx, state, false); rivalIcons(ctx, state, false); },
  rivals(ctx, state) { rivalIcons(ctx, state, true); },
  tiers(ctx, state) { tierBars(ctx, state); },
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
