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

export const SECTOR_TYPES = {
  town:       { count: 3, potential: { low: 3_000, medium: 500 }, hazard: {} },
  suburb:     { count: 3, potential: { low: 1_000, medium: 2_500, high: 100 }, hazard: {} },
  commercial: { count: 2, potential: { medium: 300, high: 600, corporate: 10 }, hazard: {} },
  industrial: { count: 1, potential: { high: 200, corporate: 40 }, hazard: {} },
  river:      { count: 1, potential: { low: 2_000, medium: 800 }, hazard: { flood: 3 } },
  hills:      { count: 1, potential: { low: 1_500, medium: 600 }, hazard: { windstorm: 2 }, windBonus: 0.3 },
  fault:      { count: 1, potential: { medium: 1_000, high: 300, corporate: 5 }, hazard: { earthquake: 4 } },
};

export const HOME = { type: 'town', name: 'Home Valley' };

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

// Home Valley starts with 2 substations (the month 1 check has 2 buildings).
export const HOME_BUILDINGS = ['substation', 'substation'];
// A newly opened sector gets 1 substation in the opening cost.
export const NEW_SECTOR_BUILDINGS = ['substation'];
