// Offices and marketing campaigns (version 1.1).
// An office is 1 hire with a monthly wage. It does not count as staff for the efficiency.

export const OFFICES = {
  manager: { hireCost: 25_000, wage: 9_000 },     // Project Manager
  marketing: { hireCost: 40_000, wage: 7_000 },   // Marketing department
};

export const OFFICE_IDS = Object.keys(OFFICES);

export const MANAGER = {
  IDLE_WEEKS: 4,             // alert when a full team or crew has had no work this long
  WAIT_WEEKS: 6,             // alert when a project has waited this long
  REPEAT_WEEKS: 12,          // then again every 12 weeks
  RESERVE_MONTHS: 3,         // auto-deploy keeps 3 months of costs in cash
};

export const CAMPAIGN = {
  CUTS: [0.1, 0.25, 0.5],    // price cut
  MONTHS: [3, 6, 12],
  SETUP_PER_SECTOR: 15_000,  // ads, flyers, call center
  BUZZ: 1.3,                 // × new customers while it runs
  DEEP_CUT: 0.5,             // from this cut: GS − 1 each month (an unfair price)
  DEEP_GS: -1,
  MAX_ACTIVE: 4,
};
