// The 4 phases (design section 3) and the sector rules of each phase (section 5).

export const PHASES = [
  { id: 1, start: 1, maxSectors: 1, openCost: null },
  { id: 2, start: 41, maxSectors: 6, openCost: 50_000 },
  { id: 3, start: 101, maxSectors: 12, openCost: 150_000 },
  { id: 4, start: 181, maxSectors: 12, openCost: 150_000 },
];

export function phaseOf(month) {
  let p = PHASES[0];
  for (const ph of PHASES) if (month >= ph.start) p = ph;
  return p;
}
