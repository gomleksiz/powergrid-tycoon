// Pixel art for the sprite sheet. 1 tile = 24 × 24 pixels. Light comes from the top left.
// Each sprite: { name, w, h, frames, draw(r, frame) }. r is a raster (raster.js).

export const T = 24;

export const P = {
  ink: '#1a1c2c',
  grass1: '#3f8f47', grass2: '#4ea454', grass3: '#63b85e', grassD: '#2f7038',
  leaf1: '#25603a', leaf2: '#3d8a45', leaf3: '#6fbf52', trunk: '#6b4a2e',
  water1: '#2a5ea6', water2: '#3c7fd4', water3: '#8cc4f2',
  road: '#4a4e5c', roadE: '#3a3c48', roadL: '#5a5f6e', mark: '#e8d27c',
  pave1: '#8b909e', pave2: '#9da2b0', pave3: '#787d8a',
  sand1: '#d6c07c', sand2: '#c4aa62', sand3: '#e6d39a',
  rock1: '#6f6a6a', rock2: '#8f8984', rock3: '#504b4c',
  hill1: '#5e8f45', hill2: '#79ab58', hill3: '#47723a',
  field1: '#b9a343', field2: '#9c8935', field3: '#d6c264',
  marsh1: '#4f7c5c', marsh2: '#6a9a74', reed: '#a8b85c',
  crack: '#241c1c',
  wall: '#eadfca', wallS: '#c4b79f', roofR: '#c4483d', roofRD: '#8e3029', roofB: '#3f63a8', roofBD: '#2b4578',
  roofG: '#6d6a5c', roofGD: '#4c4a40', wood: '#9a6b40', woodD: '#6b4a2e',
  win: '#ffd23f', winD: '#3a4466', door: '#5a3a22',
  glass: '#6cb8ff', glassD: '#3f7fc4', glassL: '#bfe2ff',
  steel: '#b9bfcc', steelD: '#6a7080', steelL: '#e1e5ee',
  brick: '#a8664a', brickD: '#7d4a35', smoke: '#d5d9e2',
  yellow: '#ffd23f', yellowD: '#c99a12', green: '#3ad1a0', greenD: '#1f8f6a', greenL: '#9df0cf',
  red: '#ff5d6c', redD: '#b8323f', orange: '#ffa53a', blue: '#4f8dff', blueD: '#2a55b0',
  panel: '#1f3b73', panelL: '#3b6fd8', panelH: '#8fb4ff', white: '#f4f4f4', grey: '#9aa0ab',
  concrete: '#cdc9bf', concreteD: '#a29d92', concreteL: '#e4e1d8',
  violet: '#7a5cff', violetD: '#4b33b8', violetL: '#d2c4ff',
  shadow: '#0000004d', black: '#000000',
};

// ---------- helpers ----------

function grassBase(r) {
  r.noise(0, 0, T, T, P.grass2, [P.grass1, P.grass3], 0.18);
}

function shadowEllipse(r, cx, cy, rx, ry) {
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) r.px(cx + x, cy + y, P.shadow);
  }
}

// Gable roof: a trapezoid that gets narrower to the top.
function roof(r, x, y, w, h, c, cd) {
  for (let i = 0; i < h; i++) {
    const inset = Math.max(0, h - 1 - i) >> 1;
    r.rect(x + inset, y + i, w - inset * 2, 1, i === h - 1 ? cd : c);
  }
  r.rect(x + (w >> 1), y, 1, h - 1, cd);
}

function windowAt(r, x, y, lit = true) {
  r.rect(x, y, 3, 3, lit ? P.win : P.winD);
  r.px(x, y, P.white);
}

function outlineRect(r, x, y, w, h, fill, edge) {
  r.rect(x, y, w, h, fill).frame(x, y, w, h, edge);
}

// Round icon badge with a dark ring.
function badge(r, fill, dark) {
  r.disc(12, 12, 9, P.ink);
  r.disc(12, 12, 8, fill);
  r.disc(11, 11, 6, fill);
  r.ring(12, 12, 8, dark);
}

// ---------- terrain tiles ----------

const tiles = [
  { name: 'grass', draw: (r) => {
    grassBase(r);
    for (let i = 0; i < 3; i++) { const x = r.rng.int(2, 20); const y = r.rng.int(3, 20); r.px(x, y, P.grass3); r.px(x + 1, y - 1, P.grass3); r.px(x + 2, y, P.grass3); }
  } },
  { name: 'grass2', draw: (r) => {
    r.noise(0, 0, T, T, P.grass1, [P.grass2, P.grassD], 0.2);
    for (let i = 0; i < 4; i++) { const x = r.rng.int(2, 21); const y = r.rng.int(2, 21); r.px(x, y, i % 2 ? P.white : P.yellow); }
  } },
  { name: 'tree', draw: (r) => {
    grassBase(r);
    shadowEllipse(r, 13, 19, 8, 3);
    r.rect(11, 14, 3, 6, P.trunk);
    r.disc(12, 10, 8, P.leaf1);
    r.disc(12, 9, 7, P.leaf2);
    r.disc(10, 7, 3, P.leaf3);
    r.px(15, 12, P.leaf1); r.px(8, 12, P.leaf1);
  } },
  { name: 'water', frames: 2, draw: (r, f) => {
    r.noise(0, 0, T, T, P.water2, [P.water1], 0.12);
    for (let i = 0; i < 4; i++) {
      const y = 3 + i * 6;
      const x = ((i * 7 + f * 4) % 18) + 1;
      r.rect(x, y, 4, 1, P.water3);
      r.rect(x + 1, y + 1, 2, 1, P.water1);
    }
  } },
  { name: 'road_h', draw: (r) => {
    r.noise(0, 0, T, T, P.road, [P.roadL], 0.06);
    r.rect(0, 0, T, 2, P.roadE).rect(0, T - 2, T, 2, P.roadE);
    for (let x = 1; x < T; x += 8) r.rect(x, 11, 5, 2, P.mark);
  } },
  { name: 'road_v', draw: (r) => {
    r.noise(0, 0, T, T, P.road, [P.roadL], 0.06);
    r.rect(0, 0, 2, T, P.roadE).rect(T - 2, 0, 2, T, P.roadE);
    for (let y = 1; y < T; y += 8) r.rect(11, y, 2, 5, P.mark);
  } },
  { name: 'road_x', draw: (r) => {
    r.noise(0, 0, T, T, P.road, [P.roadL], 0.06);
    for (const c of [0, T - 2]) { r.rect(c, 0, 2, 2, P.roadE); r.rect(c, T - 2, 2, 2, P.roadE); }
    for (let i = 4; i < 20; i += 3) { r.rect(i, 2, 2, 3, P.white); r.rect(i, 19, 2, 3, P.white); }
  } },
  { name: 'bridge_h', draw: (r) => {
    r.noise(0, 0, T, T, P.water2, [P.water1], 0.12);
    r.rect(0, 3, T, 18, P.concreteD).rect(0, 4, T, 16, P.road);
    r.rect(0, 3, T, 1, P.steelL).rect(0, 20, T, 1, P.steelD);
    for (let x = 1; x < T; x += 8) r.rect(x, 11, 5, 2, P.mark);
  } },
  { name: 'bridge_v', draw: (r) => {
    r.noise(0, 0, T, T, P.water2, [P.water1], 0.12);
    r.rect(3, 0, 18, T, P.concreteD).rect(4, 0, 16, T, P.road);
    r.rect(3, 0, 1, T, P.steelL).rect(20, 0, 1, T, P.steelD);
    for (let y = 1; y < T; y += 8) r.rect(11, y, 2, 5, P.mark);
  } },
  { name: 'plot', draw: (r) => {
    grassBase(r);
    r.rect(3, 4, 18, 17, P.sand2);
    r.noise(4, 5, 16, 15, P.sand1, [P.sand2, P.sand3], 0.2);
  } },
  { name: 'pave', draw: (r) => {
    r.noise(0, 0, T, T, P.pave2, [P.pave1], 0.08);
    for (let i = 0; i < T; i += 6) { r.rect(i, 0, 1, T, P.pave1); r.rect(0, i, T, 1, P.pave1); }
  } },
  { name: 'sand', draw: (r) => r.noise(0, 0, T, T, P.sand1, [P.sand2, P.sand3], 0.22) },
  { name: 'rock', draw: (r) => {
    r.noise(0, 0, T, T, P.rock2, [P.rock1], 0.2);
    for (const [x, y, s] of [[6, 7, 4], [15, 14, 5], [17, 5, 3]]) {
      r.disc(x, y + 1, s, P.rock3); r.disc(x, y, s, P.rock1); r.disc(x - 1, y - 1, s - 2, P.rock2);
    }
  } },
  { name: 'hill', draw: (r) => {
    r.noise(0, 0, T, T, P.hill1, [P.hill3], 0.12);
    r.disc(12, 14, 9, P.hill3);
    r.disc(11, 12, 8, P.hill1);
    r.disc(9, 9, 5, P.hill2);
    r.px(8, 7, P.grass3); r.px(10, 6, P.grass3);
  } },
  { name: 'field', draw: (r) => {
    r.rect(0, 0, T, T, P.field1);
    for (let y = 1; y < T; y += 4) { r.rect(0, y, T, 1, P.field2); r.rect(0, y + 1, T, 1, P.field3); }
    r.frame(0, 0, T, T, P.grassD);
  } },
  { name: 'marsh', draw: (r) => {
    r.noise(0, 0, T, T, P.marsh1, [P.marsh2, P.water1], 0.2);
    for (let i = 0; i < 6; i++) { const x = r.rng.int(2, 21); const y = r.rng.int(6, 21); r.line(x, y, x, y - 4, P.reed); }
  } },
  { name: 'crack', draw: (r) => {
    r.noise(0, 0, T, T, P.rock2, [P.rock1, P.sand2], 0.2);
    let y = 12;
    for (let x = 0; x < T; x++) {
      r.rect(x, y - 1, 1, 3, P.crack);
      if (x % 4 === 3) y += (x % 8 === 3 ? 2 : -2);
    }
  } },
];

// ---------- houses (transparent background, sit on a plot) ----------

const houses = [
  { name: 'house_a', draw: (r) => {
    shadowEllipse(r, 13, 20, 9, 2);
    outlineRect(r, 5, 11, 14, 9, P.wall, P.wallS);
    roof(r, 3, 4, 18, 8, P.roofR, P.roofRD);
    windowAt(r, 7, 14); r.rect(13, 14, 3, 6, P.door);
  } },
  { name: 'house_b', draw: (r) => {
    shadowEllipse(r, 12, 20, 10, 2);
    outlineRect(r, 3, 12, 18, 8, P.wall, P.wallS);
    roof(r, 2, 5, 20, 8, P.roofB, P.roofBD);
    windowAt(r, 5, 15); windowAt(r, 16, 15, false); r.rect(10, 15, 3, 5, P.door);
  } },
  { name: 'house_c', draw: (r) => {
    shadowEllipse(r, 12, 21, 11, 2);
    outlineRect(r, 2, 8, 14, 13, P.wall, P.wallS);
    roof(r, 1, 2, 16, 7, P.roofG, P.roofGD);
    windowAt(r, 4, 11); windowAt(r, 10, 11); windowAt(r, 4, 16, false); r.rect(10, 16, 3, 5, P.door);
    outlineRect(r, 16, 13, 7, 8, P.wallS, P.roofGD); r.rect(17, 16, 5, 5, P.steelD);
  } },
  { name: 'shop', draw: (r) => {
    shadowEllipse(r, 12, 21, 11, 2);
    outlineRect(r, 2, 7, 20, 14, P.wall, P.wallS);
    r.rect(2, 4, 20, 3, P.roofBD);
    for (let x = 2; x < 22; x += 4) r.rect(x, 8, 2, 3, P.red);
    for (let x = 4; x < 22; x += 4) r.rect(x, 8, 2, 3, P.white);
    r.rect(4, 13, 7, 5, P.glass); r.rect(4, 13, 7, 1, P.glassL); r.rect(14, 13, 4, 8, P.door);
  } },
  { name: 'office', draw: (r) => {
    shadowEllipse(r, 13, 22, 10, 2);
    outlineRect(r, 5, 2, 14, 20, P.glassD, P.ink);
    for (let y = 4; y < 20; y += 4) for (let x = 7; x < 17; x += 3) r.rect(x, y, 2, 2, (x + y) % 5 ? P.glass : P.win);
    r.rect(6, 3, 1, 18, P.glassL);
    r.rect(4, 1, 16, 1, P.steelD);
  } },
  { name: 'factory', draw: (r) => {
    shadowEllipse(r, 12, 21, 11, 2);
    outlineRect(r, 2, 10, 20, 11, P.brick, P.brickD);
    for (let x = 2; x < 22; x += 5) { for (let i = 0; i < 5; i++) r.rect(x + i, 10 - i, 1, i + 1, i === 4 ? P.steelD : P.steel); }
    r.rect(16, 2, 4, 8, P.brickD); r.rect(16, 2, 4, 1, P.steelD);
    r.disc(19, 1, 2, P.smoke);
    for (let x = 4; x < 20; x += 5) r.rect(x, 14, 3, 3, P.win);
    r.rect(9, 17, 5, 4, P.steelD);
  } },
  { name: 'cabin', draw: (r) => {
    shadowEllipse(r, 12, 20, 8, 2);
    outlineRect(r, 6, 12, 12, 8, P.wood, P.woodD);
    for (let y = 14; y < 20; y += 2) r.rect(6, y, 12, 1, P.woodD);
    roof(r, 4, 6, 16, 7, P.roofRD, P.ink);
    windowAt(r, 8, 14); r.rect(13, 15, 3, 5, P.door);
  } },
];

// ---------- buildings ----------

const buildings = [
  { name: 'substation', draw: (r) => {
    r.rect(1, 1, 22, 22, P.concreteD).rect(2, 2, 20, 20, P.concrete);
    r.frame(1, 1, 22, 22, P.steelD);
    for (let x = 2; x < 22; x += 3) r.px(x, 1, P.steelL);
    outlineRect(r, 4, 8, 7, 10, P.steel, P.steelD); r.rect(5, 9, 2, 8, P.steelL);
    outlineRect(r, 13, 8, 7, 10, P.steel, P.steelD); r.rect(14, 9, 2, 8, P.steelL);
    for (const x of [6, 9, 15, 18]) { r.rect(x, 4, 1, 4, P.steelD); r.disc(x, 4, 1, P.white); }
    r.line(6, 4, 18, 4, P.ink);
    r.rect(10, 18, 4, 3, P.yellow); r.px(11, 19, P.ink); r.px(12, 19, P.ink);
  } },
  { name: 'battery', draw: (r) => {
    shadowEllipse(r, 12, 21, 11, 2);
    outlineRect(r, 2, 5, 20, 15, P.green, P.greenD);
    r.rect(3, 6, 18, 2, P.greenL);
    for (let x = 5; x < 20; x += 4) r.rect(x, 9, 1, 10, P.greenD);
    r.rect(9, 9, 6, 8, P.yellow);
    r.line(13, 10, 11, 13, P.ink); r.line(11, 13, 13, 13, P.ink); r.line(13, 13, 11, 16, P.ink);
  } },
  { name: 'storage', w: 2 * T, h: 2 * T, draw: (r) => {
    r.rect(1, 1, 46, 46, P.concreteD).rect(2, 2, 44, 44, P.concrete);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      const x = 4 + col * 21; const y = 4 + row * 14;
      outlineRect(r, x, y, 19, 12, P.green, P.greenD);
      r.rect(x + 1, y + 1, 17, 2, P.greenL);
      for (let i = x + 3; i < x + 18; i += 3) r.rect(i, y + 4, 1, 7, P.greenD);
    }
    r.rect(20, 42, 8, 3, P.yellow);
  } },
  { name: 'solar', w: 2 * T, h: 2 * T, draw: (r) => {
    r.noise(0, 0, 48, 48, P.grass2, [P.grass1, P.grass3], 0.15);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      const x = 3 + col * 22; const y = 3 + row * 15;
      r.rect(x + 1, y + 11, 20, 2, P.shadow);
      outlineRect(r, x, y, 20, 11, P.panel, P.steelD);
      for (let i = x + 5; i < x + 20; i += 5) r.rect(i, y + 1, 1, 9, P.panelL);
      r.rect(x + 1, y + 5, 18, 1, P.panelL);
      r.rect(x + 2, y + 1, 3, 1, P.panelH);
    }
  } },
  { name: 'wind', w: 2 * T, h: 2 * T, frames: 3, draw: (r, f) => {
    shadowEllipse(r, 30, 45, 8, 2);
    r.rect(22, 18, 3, 28, P.steel); r.rect(22, 18, 1, 28, P.white); r.rect(24, 18, 1, 28, P.grey);
    r.rect(19, 44, 9, 3, P.concreteD);
    const cx = 23; const cy = 15;
    for (let b = 0; b < 3; b++) {
      const a = (f * 40 + b * 120) * Math.PI / 180;
      for (let i = 2; i < 15; i++) {
        const x = cx + Math.cos(a) * i; const y = cy + Math.sin(a) * i;
        r.px(x, y, P.white); r.px(x + 0.6, y + 0.6, i > 11 ? P.red : P.grey);
      }
    }
    r.disc(cx, cy, 2, P.steelL); r.px(cx, cy, P.steelD);
  } },
  { name: 'fission', w: 3 * T, h: 3 * T, draw: (r) => {
    r.rect(2, 2, 68, 68, P.concreteD).rect(3, 3, 66, 66, P.concrete);
    r.frame(2, 2, 68, 68, P.steelD);
    // cooling tower (narrow waist)
    for (let y = 10; y < 62; y++) {
      const t = (y - 10) / 52;
      const half = Math.round(15 - 6 * Math.sin(t * Math.PI));
      r.rect(24 - half, y, half * 2, 1, y % 6 === 0 ? P.concreteD : P.concreteL);
      r.px(24 - half, y, P.concreteD); r.px(24 + half - 1, y, P.grey);
    }
    r.rect(10, 8, 28, 3, P.grey);
    r.disc(24, 5, 5, P.smoke); r.disc(19, 4, 4, P.white); r.disc(29, 3, 3, P.smoke);
    // reactor dome
    r.rect(42, 34, 24, 28, P.steel).frame(42, 34, 24, 28, P.steelD);
    r.disc(54, 34, 11, P.steelL); r.disc(52, 32, 6, P.white);
    r.rect(42, 34, 24, 1, P.steelD);
    r.rect(50, 52, 8, 10, P.steelD);
    r.rect(44, 64, 20, 3, P.yellow);
  } },
  { name: 'fusion', w: 3 * T, h: 3 * T, frames: 2, draw: (r, f) => {
    r.rect(2, 2, 68, 68, P.steelD).rect(3, 3, 66, 66, P.steel);
    r.frame(2, 2, 68, 68, P.ink);
    r.disc(36, 36, 27, P.violetD);
    r.disc(36, 36, 24, P.violet);
    r.disc(36, 36, 12, P.steel);
    r.disc(36, 36, 9, f ? P.violetL : P.white);
    for (let a = 0; a < 360; a += 30) {
      const x = 36 + Math.cos(a * Math.PI / 180) * 18; const y = 36 + Math.sin(a * Math.PI / 180) * 18;
      r.disc(x, y, 2, (a / 30 + f) % 2 ? P.violetL : P.violetD);
    }
    r.ring(36, 36, 24, P.violetL);
    r.rect(6, 6, 10, 6, P.glass); r.rect(56, 60, 10, 6, P.glass);
  } },
  { name: 'construction', draw: (r) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (((x + y) >> 2) % 2 === 0 && (x < 2 || y < 2 || x > 21 || y > 21)) r.px(x, y, P.yellow);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (((x + y) >> 2) % 2 === 1 && (x < 2 || y < 2 || x > 21 || y > 21)) r.px(x, y, P.ink);
    r.rect(4, 14, 16, 6, P.sand2);
    r.rect(7, 4, 2, 12, P.orange); r.rect(7, 4, 12, 2, P.orange); r.line(18, 6, 18, 12, P.ink);
    r.rect(16, 12, 4, 3, P.steelD);
  } },
];

// ---------- icons (transparent, centered) ----------

const icons = [
  { name: 'icon_ok', draw: (r) => {
    badge(r, P.green, P.greenD);
    r.line(7, 12, 10, 15, P.ink).line(10, 15, 16, 8, P.ink).line(7, 13, 10, 16, P.ink).line(10, 16, 16, 9, P.ink);
  } },
  { name: 'icon_warn', draw: (r) => {
    for (let i = 0; i < 16; i++) r.rect(12 - (i >> 1) - 1, 4 + i, (i >> 1) * 2 + 2, 1, i === 15 ? P.ink : P.orange);
    r.line(12 - 9, 20, 12, 3, P.ink).line(12, 3, 21, 20, P.ink);
    r.rect(11, 8, 2, 7, P.ink).rect(11, 16, 2, 2, P.ink);
  } },
  { name: 'icon_bad', draw: (r) => {
    badge(r, P.red, P.redD);
    for (let i = -4; i <= 4; i++) { r.rect(12 + i, 12 + i, 2, 2, P.ink); r.rect(12 + i, 12 - i, 2, 2, P.ink); }
  } },
  { name: 'icon_bolt', draw: (r) => {
    const pts = [[14, 2], [6, 13], [11, 13], [9, 22], [18, 10], [13, 10], [15, 2]];
    for (let y = 2; y < 23; y++) for (let x = 4; x < 20; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) r.px(x, y, P.yellow);
    }
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) r.line(pts[j][0], pts[j][1], pts[i][0], pts[i][1], P.ink);
  } },
  { name: 'icon_lock', draw: (r) => {
    r.rect(5, 11, 14, 10, P.ink).rect(6, 12, 12, 8, P.yellow).rect(6, 12, 12, 1, P.white);
    r.ring(12, 10, 5, P.ink); r.ring(12, 10, 4, P.steel);
    r.rect(6, 10, 12, 2, P.ink);
    r.rect(11, 14, 2, 4, P.ink);
  } },
  { name: 'icon_flood', draw: (r) => {
    badge(r, P.blue, P.blueD);
    for (const y of [9, 13, 17]) for (let x = 5; x < 20; x++) r.px(x, y + Math.round(Math.sin(x * 0.9)), P.white);
  } },
  { name: 'icon_wind', draw: (r) => {
    badge(r, P.steelL, P.steelD);
    r.line(5, 9, 15, 9, P.ink).ring(16, 7, 2, P.ink);
    r.line(5, 13, 18, 13, P.ink);
    r.line(5, 17, 13, 17, P.ink).ring(14, 19, 2, P.ink);
  } },
  { name: 'icon_quake', draw: (r) => {
    badge(r, P.orange, P.brickD);
    const ys = [12, 12, 8, 16, 7, 17, 10, 12, 12];
    for (let i = 0; i < ys.length - 1; i++) r.line(4 + i * 2, ys[i], 6 + i * 2, ys[i + 1], P.ink);
  } },
  { name: 'icon_heat', draw: (r) => {
    badge(r, P.red, P.redD);
    r.disc(12, 12, 4, P.yellow);
    for (let a = 0; a < 360; a += 45) r.px(12 + Math.cos(a * Math.PI / 180) * 6.5, 12 + Math.sin(a * Math.PI / 180) * 6.5, P.yellow);
  } },
  { name: 'icon_apex', draw: (r) => {
    r.rect(3, 3, 18, 18, P.ink).rect(4, 4, 16, 16, P.red);
    r.line(8, 17, 12, 7, P.white).line(12, 7, 16, 17, P.white).line(10, 13, 14, 13, P.white);
    r.line(9, 17, 13, 7, P.white);
  } },
  { name: 'icon_volt', draw: (r) => {
    r.rect(3, 3, 18, 18, P.ink).rect(4, 4, 16, 16, P.blue);
    r.line(8, 7, 12, 17, P.white).line(12, 17, 16, 7, P.white).line(9, 7, 13, 17, P.white);
  } },
  { name: 'icon_nova', draw: (r) => {
    r.rect(3, 3, 18, 18, P.ink).rect(4, 4, 16, 16, P.greenD);
    r.line(8, 17, 8, 7, P.white).line(8, 7, 16, 17, P.white).line(16, 17, 16, 7, P.white).line(9, 17, 9, 7, P.white);
  } },
  { name: 'icon_broken', draw: (r) => {
    r.disc(12, 12, 8, P.ink); r.disc(12, 12, 7, P.red);
    r.line(8, 8, 16, 16, P.white).line(16, 8, 8, 16, P.white).line(9, 8, 16, 15, P.white).line(15, 8, 8, 15, P.white);
  } },
  { name: 'icon_star', draw: (r) => {
    r.disc(12, 12, 9, P.ink); r.disc(12, 12, 8, P.yellow);
    r.rect(11, 6, 2, 12, P.yellowD).rect(6, 11, 12, 2, P.yellowD);
  } },
];

export const SPRITES = [...tiles, ...houses, ...buildings, ...icons].map((s) => ({ w: T, h: T, frames: 1, ...s }));
