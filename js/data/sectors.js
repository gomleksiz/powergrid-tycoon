// Map and sector data (design section 5).

export const MAP = {
  COLS: 4,                 // sectors across
  ROWS: 3,                 // sectors down
  SECTOR_W: 12,            // tiles
  SECTOR_H: 10,
  TILE: 24,                // pixels
  get W() { return this.COLS * this.SECTOR_W; },   // 48 tiles
  get H() { return this.ROWS * this.SECTOR_H; },   // 30 tiles
  HOME_CELLS: [[1, 1], [2, 1]],  // Home Valley sits in the middle row, so it has 4 neighbors
};

// Possible customers: the section 5 table × 1.8 (balance step 13, see docs/balance-log.md).
export const SECTOR_TYPES = {
  town:       { count: 3, potential: { low: 5_400, medium: 900 }, hazard: {} },
  suburb:     { count: 3, potential: { low: 1_800, medium: 4_500, high: 180 }, hazard: {} },
  commercial: { count: 2, potential: { medium: 540, high: 1_080, corporate: 18 }, hazard: {} },
  industrial: { count: 1, potential: { high: 360, corporate: 72 }, hazard: {} },
  river:      { count: 1, potential: { low: 3_600, medium: 1_440 }, hazard: { flood: 3 } },
  hills:      { count: 1, potential: { low: 2_700, medium: 1_080 }, hazard: { windstorm: 2 }, windBonus: 0.3 },
  fault:      { count: 1, potential: { medium: 1_800, high: 540, corporate: 9 }, hazard: { earthquake: 4 } },
};

// Home Valley is the capital: 30 % bigger than other towns (balance step 13).
export const HOME = { type: 'town', name: 'Home Valley', potentialMult: 1.3 };

// Version 1.2: more homes and firms in every sector (× 1.5). New customers still need
// a free connection (substation capacity) and must be won from the rivals.
export const POTENTIAL_MULT = 1.5;

// Names are picked with the map seed.
export const SECTOR_NAMES = {
  town: ['Maple Town', 'Old Mill', 'Brookside', 'Kingsford', 'Ashby'],
  suburb: ['Cedar Park', 'Green Acres', 'Willow Heights', 'Sunny Fields', 'Oak Ridge'],
  commercial: ['Market Square', 'Harbor Point', 'Union Plaza', 'Central Row'],
  industrial: ['Steelworks', 'Iron Bay', 'Foundry Flats'],
  river: ['Silver River', 'Low Marsh', 'Delta Bend'],
  hills: ['High Hills', 'Windy Crest', 'Stone Ridge'],
  fault: ['Crack Canyon', 'Split Rock', 'Fault Basin'],
};

// Start values for every sector.
export const SECTOR_START = {
  health: 80,
  homeHealth: 80,
  priority: 'normal',
};

// Home Valley starts with 1 substation (version 1.2; before: 2, far more than the start peak).
export const HOME_BUILDINGS = ['substation'];
// A newly opened sector gets 1 substation in the opening cost.
export const NEW_SECTOR_BUILDINGS = ['substation'];
