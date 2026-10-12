// The 2 rivals (design section 12). Apex enters at the difficulty month; Volt 65 months later.

export const RIVALS = {
  apex: { enterAfterFirst: 0, price: 0.8, outage: [12, 24] },
  volt: { enterAfterFirst: 65, price: 1.1, outage: [1, 3] },
};

export const RIVAL_IDS = Object.keys(RIVALS);

export const RIVAL = {
  CHECK_EVERY: 3,          // months between entry checks
  ENTRY_MIN: 25,
  ENTRY_UNSERVED: 50,
  ENTRY_OUTAGE: 2,         // × max(0, H − 12)
  ENTRY_OUTAGE_FROM: 12,
  ENTRY_PRICE: 30,         // × (m̄ − 1)
  ENTRY_LOW_CS: 20,        // when CS < 30
  START_STRENGTH: 20,
  GROWTH: 3,               // each month × rival growth (difficulty)
  OUTAGE_BONUS: 5,         // when the player's H is over a tier limit
  MAX_STRENGTH: 100,
  MOVE_RATE: 0.03,
  MIN_PRICE_FACTOR: 0.5,
  NEW_RATE: 0.02,          // the rival also wins unserved customers
  NEW_STRENGTH_DIV: 50,
  LEAVE_SHARE: 0.05,
  LEAVE_MONTHS: 6,
  DISCOUNTS: [0, 0.1, 0.2, 0.3],
  CUT_STRENGTH_PER_10: 4,
  CUT_GS_AT_30: -2,
  BUYOUT_MONTHS: 24,
  FRANCHISE_MAX: 3,
  FRANCHISE_GS: 60,
  MONOPOLY_GS: 75,
  MONOPOLY_GS_SHOCK: -10,
};
