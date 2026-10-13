// Difficulty values (design section 4). Tune here, not in the code.

export const DIFFICULTY = {
  easy: {
    startCash: 250_000,
    startCustomers: 3_000,     // version 1.2: bigger towns (2,400 → 3,000)
    wholesaleStart: 0.045,      // $ per kWh in month 1
    disasterMult: 0.5,
    warningWeeks: 2,
    warningNeedsTech: false,    // warning always, even without Weatherproof Sensors
    rivalMonths: { apex: 18, volt: 80, nova: 150 },   // version 1.2: the month each rival can come
    rivalMaxSectors: 2,         // version 1.2: sectors each rival can be in
    rivalGrowth: 0.5,
    meterUp: 0.25,
    meterDown: 0.10,
    bankruptMonths: 6,
    loanLimit: 500_000,
    victoryCash: 40_000_000,   // version 1.2: smaller margins (90M → 40M)
    victoryShare: 0.68,        // version 1.2: stronger rivals (0.70 → 0.68)
    scoreMult: 0.75,
    advisorAlways: true,
    tutorialDefault: true,
    confirmRisky: true,         // ask before a risky action
  },
  normal: {
    startCash: 150_000,
    startCustomers: 2_500,     // version 1.2: 2,000 → 2,500
    wholesaleStart: 0.05,
    disasterMult: 1.0,
    warningWeeks: 1,
    warningNeedsTech: true,
    rivalMonths: { apex: 1, volt: 30, nova: 80 },
    rivalMaxSectors: 3,
    rivalGrowth: 1.0,
    meterUp: 0.20,
    meterDown: 0.20,
    bankruptMonths: 3,
    loanLimit: 300_000,
    victoryCash: 65_000_000,   // version 1.2: 150M → 65M
    victoryShare: 0.78,        // version 1.2: 0.80 → 0.78
    scoreMult: 1.0,
    advisorAlways: false,
    tutorialDefault: true,
    confirmRisky: false,
  },
  hard: {
    startCash: 150_000,        // version 1.2: 80,000 → 150,000 (rivals and costs from month 1)
    startCustomers: 2_200,     // version 1.2: 1,600 → 2,200
    wholesaleStart: 0.052,      // version 1.2: 0.055 → 0.052
    disasterMult: 1.25,         // version 1.2: 1.5 → 1.25 (damage is 25 % higher now)
    warningWeeks: 1,
    warningNeedsTech: true,
    rivalMonths: { apex: 1, volt: 1, nova: 60 },
    rivalMaxSectors: 3,
    rivalGrowth: 1.1,           // version 1.2: 1.5 → 1.1 (2 rivals from month 1)
    meterUp: 0.15,
    meterDown: 0.30,
    bankruptMonths: 2,
    loanLimit: 250_000,        // version 1.2: 150,000 → 250,000
    victoryCash: 75_000_000,   // version 1.2: 180M → 75M
    victoryShare: 0.80,        // version 1.2: 0.82 → 0.80
    scoreMult: 1.5,
    advisorAlways: false,
    tutorialDefault: false,
    confirmRisky: false,
  },
};

export const diff = (state) => DIFFICULTY[state.difficulty] ?? DIFFICULTY.normal;
