// Victory, loss, score and Advisor data (design section 14).

export const VICTORY = {
  HOLD_MONTHS: 3,
  PATHS: ['monopoly', 'singularity', 'utopia'],
  singularity: { fusionShare: 0.5, wirelessSectors: 9 },
  utopia: { prosumerShare: 0.8, vppSectors: 9, gs: 60, cs: 70 },
  // monopoly: cash and market share come from the difficulty (section 4)
};

export const LOSS = {
  LICENSE_GS: 10, LICENSE_MONTHS: 6, LICENSE_WARN: 4,
  COLLAPSE_CUSTOMERS: 200, COLLAPSE_MONTHS: 3, COLLAPSE_WARN: 2,
  BANKRUPT_WARN_BEFORE: 1,      // red banner 1 month before (months from the difficulty)
};

export const SCORE = {
  NET_WORTH_DIV: 10_000,
  SHARE: 50,              // × share in %
  METERS: 10,             // × average meter
  WIN: 2_000,
  MONTH_LEFT: 20,
  CAPEX_SHARE: 0.5,       // net worth = cash − debt + 50 % of all CapEx
  GRADES: [['S', 15_000], ['A', 10_000], ['B', 6_000], ['C', 3_000], ['D', -Infinity]],
};

// Advisor rules. when = { kind, value }; apply = what the Apply button does.
// Higher priority tips come first; the Advisor shows the top 3.
export const ADVISOR_RULES = [
  { id: 'cashLow', priority: 100, when: { kind: 'cashMonthsBelow', value: 2 }, apply: { kind: 'loan' } },
  { id: 'lowHealth', priority: 90, when: { kind: 'healthBelow', value: 40 }, apply: { kind: 'budget', key: 'maintenance', add: 10 } },
  { id: 'backlog', priority: 85, when: { kind: 'backlogAbove', value: 2 }, apply: { kind: 'hire', role: 'technicians', count: 4 } },
  { id: 'highPrice', priority: 80, when: { kind: 'csBelowAndPriceAbove', cs: 40, price: 1.2 }, apply: { kind: 'priceDown', step: 0.1 } },
  { id: 'staffNearM', priority: 70, when: { kind: 'staffOverShareOfM', value: 0.9 }, apply: { kind: 'research', branch: 'organization' } },
  { id: 'rivalNear', priority: 65, when: { kind: 'gsBelowAndRivalNear', value: 60 }, apply: { kind: 'budget', key: 'lobbying', add: 10 } },
  { id: 'prosumers', priority: 60, when: { kind: 'pathAndProsumersBelow', path: 'utopia', value: 0.5 }, apply: { kind: 'budget', key: 'marketing', add: 10 } },
  { id: 'idleEngineers', priority: 50, when: { kind: 'noResearch' }, apply: { kind: 'research' } },
];

// Outage help in the Sector tab (version 1.1, sim/advice.js).
export const OUTAGE_HELP = {
  SLOW_REPAIR_WEEKS: 2,      // tip "hire technicians" when the repair here takes longer
  WEAR_HOURS: 2,             // tip "Maintenance" from 2 h of wear …
  HEALTH: 50,                // … or Health below 50
  BUDGET_STEP: 10,
  CAPACITY_WARN: 0.9,        // tip "capacity" when the peak is over 90 % of the capacity
  WAGE_STEP: 0.1,
  PLANTS: ['battery', 'storage', 'wind', 'fission', 'fusion'],  // own peak power, the first one you can build
  MAX_TIPS: 4,
};

// "Apply suggested budget" for each victory path.
export const SUGGESTED_BUDGET = {
  none: { marketing: 20, rd: 20, maintenance: 20, lobbying: 20, pr: 20 },
  monopoly: { marketing: 35, rd: 15, maintenance: 20, lobbying: 20, pr: 10 },
  singularity: { marketing: 10, rd: 40, maintenance: 25, lobbying: 10, pr: 15 },
  utopia: { marketing: 30, rd: 15, maintenance: 15, lobbying: 20, pr: 20 },
};
