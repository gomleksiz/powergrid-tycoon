// The rivals (design section 12). Version 1.2: a third rival (Nova), and the month each one
// can come is in the difficulty (rivalMonths).

export const RIVALS = {
  apex: { price: 0.8, outage: [12, 24] },
  volt: { price: 1.1, outage: [1, 3] },
  nova: { price: 0.95, outage: [4, 8] },
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
  ENTRY_OWNED: 15,         // version 1.2: rivals like your sectors (your customers are there)
  START_STRENGTH: 30,      // version 1.2: 20 → 30
  GROWTH: 3,               // each month × rival growth (difficulty)
  BETTER_GROWTH: 0.5,      // version 1.2: with better service the rival grows at half speed (before: not at all)
  OUTAGE_BONUS: 5,         // when the player's H is over a tier limit
  MAX_STRENGTH: 100,
  MOVE_RATE: 0.03,
  MIN_PRICE_FACTOR: 0.5,
  NEW_RATE: 0.02,          // the rival also wins unserved customers …
  NEW_MAX_SHARE: 0.4,      // … up to 40 % of the sector (version 1.2)
  NEW_STRENGTH_DIV: 50,
  LEAVE_SHARE: 0.05,
  LEAVE_MONTHS: 6,
  DISCOUNTS: [0, 0.1, 0.2, 0.3],
  CUT_STRENGTH_PER_10: 3,  // version 1.2: 4 → 3
  CUT_GS_AT_30: -2,
  BUYOUT_MONTHS: 36,       // version 1.2: 24 → 36
  BUYOUT_MIN: 150_000,     // version 1.2: a buyout costs at least this …
  BUYOUT_BAN: 24,          // … and no rival can enter that sector for 24 months after it
  FRANCHISE_MAX: 3,
  FRANCHISE_GS: 60,
  MONOPOLY_GS: 75,
  MONOPOLY_GS_SHOCK: -10,
  // Price war (version 1.1): when your price is below the rival's, its customers switch to you.
  WIN_RATE: 0.15,          // share each month × (rival price − your price)
  WAR_STEP: 0.03,          // the undercut rival lowers its price each month …
  WAR_FLOOR: 0.75,         // … to 75 % of its normal price at most
  WAR_RECOVER: 0.01,       // and raises it again when you stop
  WON_NEWS_MIN: 25,        // news when at least 25 customers switched to you in a month
  // Sales drive (version 1.2): now and then a rival cuts its price and pushes hard in 1 sector.
  DRIVE_CHANCE: 0.04,      // each month, for each rival presence × rival growth (difficulty)
  DRIVE_MONTHS: 6,
  DRIVE_PRICE: 0.85,       // × its price
  DRIVE_STRENGTH: 10,      // strength at once
};
