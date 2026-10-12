// Buildings (design section 5 and tech tree section 10).
// size = tiles on each side. needs = tech node that unlocks it.
// peakMw = help at the evening peak. kwhPerMonth = own energy each month.

const HOURS = 720;

export const BUILDINGS = {
  substation: { size: 1, cost: 40_000, needs: null, capacityMw: 5 },
  battery:    { size: 1, cost: 50_000, needs: 'S1', peakMw: 2 },
  storage:    { size: 2, cost: 400_000, needs: 'S2', peakMw: 10 },
  solar:      { size: 2, cost: 80_000, needs: 'G2', mw: 2, capacityFactor: 0.25, peakShare: 0, clean: true },
  wind:       { size: 2, cost: 90_000, needs: 'G3', mw: 1.5, capacityFactor: 0.35, peakShare: 0.5, clean: true },
  fission:    { size: 3, cost: 2_000_000, needs: 'G4', mw: 25, capacityFactor: 0.9, peakShare: 1, buildWeeks: 24, permitGs: 40, clean: true },
  fusion:     { size: 3, cost: 8_000_000, needs: 'G5', mw: 80, capacityFactor: 0.9, peakShare: 1, buildWeeks: 30, clean: true, fusion: true },
};

export const BUILDING_IDS = Object.keys(BUILDINGS);

export const kwhPerMonth = (b, bonus = 0) =>
  (b.mw ?? 0) * 1000 * HOURS * (b.capacityFactor ?? 0) * (1 + bonus);
