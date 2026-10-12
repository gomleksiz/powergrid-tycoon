// The tech tree (design section 10): 33 nodes in 7 branches. Data only.
//
// deploy:
//   null                    – no field work. ACTIVE everywhere when research is done.
//   { cost, weeks }         – a field crew deploys it in 1 sector.
//   { build: 'solar' }      – unlocks a building that the player places on the map.
//   { oneTime: 50000 }      – pay once to switch it on everywhere.
// effects: read by sim/effects.js (see EFFECT_RULES). sector effects work only
//   where the node is ACTIVE; anyEffects work everywhere once 1 sector has it.

export const RESEARCH_COST = { 1: 90, 2: 300, 3: 1_200, 4: 4_800 };

export const LEAP = { COST_MULT: 1.6, DEPLOY_MULT: 2 };

export const BRANCHES = [
  { id: 'distribution', name: 'Distribution' },
  { id: 'resilience', name: 'Resilience' },
  { id: 'generation', name: 'Generation' },
  { id: 'storage', name: 'Storage' },
  { id: 'customers', name: 'Customers and PR' },
  { id: 'regulatory', name: 'Regulatory' },
  { id: 'organization', name: 'Organization' },
];

const STORM = ['windstorm', 'ice', 'superstorm'];
const mult = (types, v) => Object.fromEntries(types.map((t) => [t, v]));

export const NODES = {
  // Distribution
  D1: { name: 'Overhead Lines', branch: 'distribution', tier: 0, needs: [], start: true, deploy: null,
    effects: { fLine: 1.0, healthDecay: 2 }, text: 'f line = 1.0. Health − 2 each month.' },
  D2: { name: 'Reinforced Storm Poles', branch: 'distribution', tier: 2, needs: ['D1'], deploy: { cost: 25_000, weeks: 6 },
    effects: { fLine: 0.7, damageMult: { windstorm: 0.6, ice: 0.6, superstorm: 0.6 } }, text: 'f line = 0.7. Wind and ice damage − 40%.' },
  D5: { name: 'Underground Conduits', branch: 'distribution', tier: 3, needs: ['D3'], leapFrom: 'D1', deploy: { cost: 120_000, weeks: 10 },
    effects: { fLine: 0.3, healthDecay: 1, damageMult: { ...mult(STORM, 0), earthquake: 1.5 } }, text: 'f line = 0.3. No storm damage. Earthquake damage × 1.5.' },
  D8: { name: 'Resonant Wireless Grid', branch: 'distribution', tier: 4, needs: ['D5'], deploy: { cost: 300_000, weeks: 16 },
    effects: { fLine: 0.1, healthDecay: 0.5, wireless: true, damageMult: { ...mult(STORM, 0), flood: 0, earthquake: 0 } }, text: 'f line = 0.1. No storm, flood or quake damage.' },

  // Resilience
  D3: { name: 'Weatherproof Sensors', branch: 'resilience', tier: 2, needs: ['D2'], deploy: { cost: 10_000, weeks: 2 },
    effects: { warning: true }, text: 'Disaster warning 1 week before.' },
  D4: { name: 'Automated Line Splitters', branch: 'resilience', tier: 3, needs: ['D3'], deploy: { cost: 40_000, weeks: 6 },
    effects: { damageMult: mult(STORM, 0.5) }, text: 'Storm damage − 50%.' },
  D6: { name: 'Shock-Dampened Substations', branch: 'resilience', tier: 3, needs: ['D5'], deploy: { cost: 60_000, weeks: 6 },
    effects: { damageMult: { earthquake: 0.3 } }, text: 'Earthquake damage − 70%.' },
  D7: { name: 'Elevated Substations', branch: 'resilience', tier: 2, needs: ['D2'], deploy: { cost: 30_000, weeks: 4 },
    effects: { damageMult: { flood: 0.3 } }, text: 'Flood damage − 70%.' },

  // Generation
  G1: { name: 'Bulk Grid Resale', branch: 'generation', tier: 0, needs: [], start: true, deploy: null,
    effects: {}, text: 'Buy all power from the wholesaler. Coal hurts GS.' },
  G2: { name: 'Solar Farms', branch: 'generation', tier: 2, needs: ['G1'], deploy: { build: 'solar' },
    effects: { unlockBuilding: 'solar' }, text: '+ 2 MW in the day. Clean.' },
  G3: { name: 'Wind Farms', branch: 'generation', tier: 2, needs: ['G2'], deploy: { build: 'wind' },
    effects: { unlockBuilding: 'wind' }, text: '+ 1.5 MW. + 30% in Hills. Clean.' },
  G4: { name: 'Modular Fission', branch: 'generation', tier: 3, needs: ['G3'], leapFrom: 'G1', leapShock: { cs: -25 }, deploy: { build: 'fission' },
    effects: { unlockBuilding: 'fission' }, text: '+ 25 MW, day and night. Needs GS 40 or more.' },
  G5: { name: 'Commercial Fusion', branch: 'generation', tier: 4, needs: ['G4'], deploy: { build: 'fusion' },
    effects: { unlockBuilding: 'fusion' }, text: '+ 80 MW. Clean.' },

  // Storage
  S1: { name: 'Battery Banks', branch: 'storage', tier: 2, needs: ['G2'], deploy: { build: 'battery' },
    effects: { unlockBuilding: 'battery' }, text: '+ 2 MW at the evening peak.' },
  S2: { name: 'Grid-Scale Storage', branch: 'storage', tier: 3, needs: ['S1'], deploy: { build: 'storage' },
    effects: { unlockBuilding: 'storage' }, text: '+ 10 MW at the evening peak.' },
  S3: { name: 'Virtual Power Plant', branch: 'storage', tier: 3, needs: ['S1', 'P5'], deploy: { cost: 30_000, weeks: 4 },
    effects: { vpp: true }, text: 'Each prosumer adds 0.5 kW at the evening peak.' },

  // Customers and PR
  P1: { name: 'Local Billboards', branch: 'customers', tier: 0, needs: [], start: true, deploy: null,
    effects: { unlockTier: 'low' }, text: 'Low tier customers.' },
  P2: { name: 'Targeted Grid Ads', branch: 'customers', tier: 1, needs: ['P1'], deploy: null,
    effects: { unlockTier: 'medium' }, text: 'Unlocks the Medium tier.' },
  P7: { name: 'Community Outreach', branch: 'customers', tier: 1, needs: ['P1'], deploy: null,
    effects: { csBonus: 3, prBonus: 0.1 }, text: 'CS + 3. PR specialists 10% stronger.' },
  P3: { name: 'B2B Sales Team', branch: 'customers', tier: 2, needs: ['P2'], deploy: null,
    effects: { unlockTier: 'high' }, text: 'Unlocks the High tier.' },
  P5: { name: 'Prosumer Solar Program', branch: 'customers', tier: 2, needs: ['P2', 'G2'], deploy: { cost: 15_000, weeks: 4 },
    effects: { prosumer: true }, anyEffects: { csBonus: 5 }, text: 'Homes add rooftop solar. CS + 5.' },
  P6: { name: 'Smart Meters', branch: 'customers', tier: 2, needs: ['P2'], deploy: { cost: 20_000, weeks: 4 },
    effects: { outageReduce: 0.10, withheldHighMult: 0.5 }, text: 'Outage hours − 10%. Withheld High payments − 50%.' },
  P4: { name: 'Corporate Direct Sales', branch: 'customers', tier: 3, needs: ['P3', 'D3'], deploy: null,
    effects: { unlockTier: 'corporate' }, text: 'Unlocks the Corporate tier.' },

  // Regulatory
  R1: { name: 'Municipal Lobbying', branch: 'regulatory', tier: 1, needs: [], deploy: null,
    effects: { capexTaxCredit: 0.10 }, text: 'Tax − 10% of the CapEx you spend.' },
  R2: { name: 'Environmental Compliance Office', branch: 'regulatory', tier: 2, needs: ['R1'], deploy: null,
    effects: { gsBonus: 5, coalDragMult: 0.5 }, text: 'GS + 5. Coal drag − 50%.' },
  R3: { name: 'Exclusive Franchise Charters', branch: 'regulatory', tier: 3, needs: ['R1'], deploy: null,
    effects: { franchiseSectors: 3 }, text: 'Protect up to 3 sectors from new rivals while GS ≥ 60.' },
  R4: { name: 'Utility Monopoly Charter', branch: 'regulatory', tier: 4, needs: ['R3'], deploy: null,
    effects: { monopolyCharter: true }, text: 'Remove all rivals when GS > 75. GS − 10 one time.' },

  // Organization
  O1: { name: 'Modular Project Management', branch: 'organization', tier: 2, needs: [], deploy: null,
    effects: { managementThreshold: 45 }, text: 'M = 45.' },
  O2: { name: 'Field Crew Training', branch: 'organization', tier: 2, needs: ['O1'], deploy: null,
    effects: { repairBonus: 0.25, esBonus: 5 }, text: 'Repair speed + 25%. ES + 5.' },
  O3: { name: 'Autonomous Drone Logistics', branch: 'organization', tier: 3, needs: ['O2'], deploy: null,
    effects: { managementThreshold: 70, repairBonus: 0.25, deployTimeMult: 0.8, esBonus: 10 }, text: 'M = 70. Repair + 25%. Deploy time − 20%. ES + 10.' },
  O4: { name: 'Grid Operations Center', branch: 'organization', tier: 3, needs: ['O1', 'P6'], deploy: { oneTime: 50_000 },
    effects: { outageReduce: 0.20 }, text: 'Outage hours − 20%. $50,000 one time.' },
  O5: { name: 'AI Advisor Core', branch: 'organization', tier: 3, needs: ['O3', 'O4'], deploy: null,
    effects: { advisor: true }, text: 'Unlocks the Advisor.' },
  O6: { name: 'Enterprise Resource Planning', branch: 'organization', tier: 4, needs: ['O3'], deploy: null,
    effects: { managementThreshold: 100 }, text: 'M = 100.' },
};

export const NODE_IDS = Object.keys(NODES);

// How effects from several nodes combine, and the value when no node gives it.
export const EFFECT_RULES = {
  fLine: { combine: 'min', none: 1.0 },
  healthDecay: { combine: 'min', none: 2 },
  managementThreshold: { combine: 'max', none: 25 },
  franchiseSectors: { combine: 'max', none: 0 },
  outageReduce: { combine: 'sum', none: 0 },
  csBonus: { combine: 'sum', none: 0 },
  esBonus: { combine: 'sum', none: 0 },
  gsBonus: { combine: 'sum', none: 0 },
  repairBonus: { combine: 'sum', none: 0 },
  prBonus: { combine: 'sum', none: 0 },
  capexTaxCredit: { combine: 'sum', none: 0 },
  deployTimeMult: { combine: 'mul', none: 1 },
  withheldHighMult: { combine: 'mul', none: 1 },
  coalDragMult: { combine: 'mul', none: 1 },
  damageMult: { combine: 'mulMap', none: {} },
  unlockTier: { combine: 'list', none: [] },
  unlockBuilding: { combine: 'list', none: [] },
  warning: { combine: 'or', none: false },
  prosumer: { combine: 'or', none: false },
  vpp: { combine: 'or', none: false },
  wireless: { combine: 'or', none: false },
  monopolyCharter: { combine: 'or', none: false },
  advisor: { combine: 'or', none: false },
};

export const OUTAGE_REDUCE_MIN_R = 0.5;   // R cannot go below 0.5
