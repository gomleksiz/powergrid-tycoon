// Disasters (design section 13). Chances are for Normal; × difficulty disasterMult.
// chance: by season. sectors: how many are hit. hazard: the sector-type key that raises the chance.
// spread: 'neighbor' = + 1 neighbor; 'neighbors' = + all neighbors (half damage).

export const DISASTERS = {
  windstorm: {
    chance: { spring: 0.08, summer: 0.02, fall: 0.08, winter: 0.02 },
    sectors: [1, 3], damage: [20, 40], hazard: 'windstorm',
  },
  ice: {
    chance: { spring: 0, summer: 0, fall: 0, winter: 0.04 },
    sectors: [1, 2], damage: [15, 30],
  },
  flood: {
    chance: { spring: 0.01, summer: 0.06, fall: 0.01, winter: 0.01 },
    sectors: [1, 1], damage: [25, 50], hazard: 'flood', spread: 'neighbor',
  },
  earthquake: {
    chance: { spring: 0.01, summer: 0.01, fall: 0.01, winter: 0.01 },
    fromMonth: 60, sectors: [1, 1], damage: [30, 60], hazard: 'earthquake', spread: 'neighbors',
    stopsFission: 2,       // months
  },
  heatwave: {
    chance: { spring: 0, summer: 0.10, fall: 0, winter: 0 },
    allSectors: true, damage: [0, 0], heat: { peakMult: 1.25, supplyShare: 0.85 },
  },
};

// The scripted "Storm of the Decade": always at month 110, week 1, warning 4 weeks before.
export const SUPERSTORM = {
  month: 110, week: 1, warningWeeks: 4, sectors: 4, damage: [50, 70],
};

export const DISASTER = {
  SCHEDULE_AHEAD: 2,        // months: roll now for 2 months later, so warnings fit
  NEIGHBOR_DAMAGE: 0.5,
  PREP_COST: 10_000,
  PREP_DAMAGE_MULT: 0.8,
  LOG_MAX: 12,
};

export const DISASTER_TYPES = Object.keys(DISASTERS);
