// All tunable numbers. No magic numbers in the code: add new ones here.
// Section numbers point to the design document.

export const GAME_VERSION = '0.3.0';
export const SAVE_VERSION = 1;

export const TIME = {
  START_YEAR: 2030,
  MONTHS_PER_YEAR: 12,
  WEEKS_PER_MONTH: 4,
  END_MONTH: 240,            // Dec 2049
  MONTH_SECONDS_AT_1X: 30,   // 1 month = 30 s at 1x
  SPEEDS: [0, 1, 2, 5],      // index 0 = pause
  MAX_FRAME_MS: 250,         // clamp after a long frame (tab switch, debugger)
  MAX_TICKS_PER_FRAME: 8,    // stop a "spiral of death"
  HOURS_PER_MONTH: 720,
  HOURS_PER_WEEK: 168,
};

export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY = 'normal';

// ---------- Customers and prices (section 6) ----------

export const TIER_IDS = ['low', 'medium', 'high', 'corporate'];

export const TIERS = {
  low:       { tariff: 50,    kwh: 400,    peakKw: 1.2, limitH: 48,  baseChurn: 0.005, outageK: 0.02 },
  medium:    { tariff: 120,   kwh: 900,    peakKw: 2.5, limitH: 12,  baseChurn: 0.01,  outageK: 0.05 },
  high:      { tariff: 250,   kwh: 2_500,  peakKw: 8,   limitH: 4,   baseChurn: 0.015, outageK: 0.08 },
  corporate: { tariff: 6_000, kwh: 60_000, peakKw: 120, limitH: 0.5, baseChurn: 0,     outageK: 0 },
};

export const CORPORATE = {
  CONTRACT_END_CHANCE: 0.5,  // per customer, in a month with H over the limit
  PENALTY_TARIFFS: 3,        // penalty = 3 × tariff
};

export const HIGH_TIER = {
  WITHHOLD_SHARE: 1.0,       // High customers do not pay in a month with H over the limit
};

export const PRICE = { MIN: 0.6, MAX: 1.5, STEP: 0.05, START: 1.0, LOW_GS_MAX: 1.1 };

export const CUSTOMERS = {
  NEW_RATE: 0.02,
  MKT_BASE: 0.5,
  MKT_DIVISOR: 20_000,
  MKT_MAX: 2.0,
  PR_MARKETING: 0.10,        // each PR specialist: + 10% marketing (section 9)
  CS_BASE: 0.5,
  WORD_OF_MOUTH_CS: 75,
  WORD_OF_MOUTH: 0.1,
  PRICE_CHURN: 0.04,
  MAX_CHURN: 0.25,
  LOW_CS: 30,
  LOW_CS_CHURN_MULT: 1.5,
};

// ---------- Money (section 6) ----------

export const MONEY = {
  UPKEEP_SECTOR: 2_000,
  UPKEEP_BUILDING: 500,
  TAX_RATE: 0.20,
  SELLBACK_SHARE: 0.5,       // extra own power sells at 50% of wholesale
  LOAN_STEP: 50_000,
  INTEREST_RATE: 0.01,       // per month
};

export const BUDGET = {
  MIN_PCT: 10,
  MAX_PCT: 60,
  START_PCT: 20,
  KEYS: ['marketing', 'rd', 'maintenance', 'lobbying', 'pr'],
  START_SPLIT: { marketing: 20, rd: 20, maintenance: 20, lobbying: 20, pr: 20 },
};

// Wholesale price = base × season × walk × event.
// The difficulty "start price" is the January 2030 price, so base = start ÷ winter.
export const WHOLESALE = {
  SEASON_MULT: { spring: 1.0, summer: 1.25, fall: 1.0, winter: 1.15 },
  WALK_STEP: 0.03,
  WALK_MIN: 0.7,
  WALK_MAX: 1.6,
};

// Month index 0 = January.
export const SEASON_OF_MONTH = [
  'winter', 'winter', 'spring', 'spring', 'spring', 'summer',
  'summer', 'summer', 'fall', 'fall', 'fall', 'winter',
];

// ---------- Grid (section 7) ----------

export const GRID = {
  WEAR_HOURS: 20,              // H wear = (100 − Health) ÷ 100 × 20 × f line
  PEAK_HOURS: 120,             // about 4 h a day at the evening peak
  RED_HOURS: 48,
  MAINTENANCE_PER_POINT: 2_500,
  SIZE_BASE: 500,              // Maintenance split: 500 + customers in each sector
  FAILURE_HEALTH: 40,
  FAILURE_MAX_CHANCE: 0.6,     // at Health 0
  FAILURE_DAMAGE: [5, 15],
  PROSUMER_DAMAGE_CUT: 0.5,
  VPP_KW_PER_PROSUMER: 0.5,
  HEATWAVE_PEAK: 1.25,
  HEATWAVE_SUPPLY: 0.85,
};

export const REPAIR = {
  POINTS_PER_TECH_WEEK: 1.5,
  PRIORITIES: ['high', 'normal', 'low'],
  STRIKE_MULT: 0.5,
  BACKLOG_MAX_WEEKS: 99,
};

// ---------- Staff (section 9) ----------

export const STAFF = {
  ROLES: ['engineers', 'technicians', 'pr'],
  WAGE: { engineers: 5_000, technicians: 3_500, pr: 4_000 },
  START: { engineers: 3, technicians: 4, pr: 1 },
  HIRE_COST_MONTHS: 1,
  FIRE_COST_MONTHS: 1,
  FIRE_ES_SHOCK: -3,
  WAGE_MIN: 0.8,
  WAGE_MAX: 1.3,
  WAGE_STEP: 0.05,
  MAX_PER_ROLE: 200,
};

export const WORK = {
  MIN_EFFICIENCY: 0.35,
  EFFICIENCY_POWER: 0.8,
  F_ES_LOW: 0.75,
  F_ES_HIGH: 1.2,
  TEAM_SIZE: 3,              // research team = 3 engineers
  CREW_SIZE: 4,              // field crew = 4 technicians
  MAX_TEAMS_PER_PROJECT: 3,
  QUEUE_MAX: 5,
  RP_PER_ENGINEER: 10,       // per month
  RD_BASE: 0.75,
  RD_DIVISOR: 15_000,
  RD_MAX: 1.5,
  RUSH_COST_SHARE: 0.5,
  RUSH_RP_DOLLARS: 50,       // RP projects: original cost = RP × $50
  RUSH_ES_SHOCK: -5,
  CRUNCH_MONTHS: 3,
};

// ---------- Meters (section 11) ----------

export const METERS = {
  START: { cs: 60, es: 65, gs: 50 },
  LOW: 30,
  HIGH: 75,
};

// ---------- Save ----------

export const SAVE = {
  PREFIX: 'pgt.',
  AUTO_KEYS: ['pgt.auto.a', 'pgt.auto.b'],
  SLOT_COUNT: 3,
  SETTINGS_KEY: 'pgt.settings',
  META_SUFFIX: '.meta',
};

export const UI = {
  NEWS_MAX_ITEMS: 5,
  NEWS_LOG_MAX: 60,
  COMPANY_NAME_MAX: 24,
  SEED_MAX: 0xffffffff,
  REPORT_SHOW_MS: 9_000,
  PANEL_REFRESH_MS: 200,
};
