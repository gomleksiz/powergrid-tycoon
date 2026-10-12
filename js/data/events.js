// Event cards (design section 13). About 1 card each 6 months.
// when: conditions (all must hold). weight: how often it comes. choices: effects.
// Effect keys (read by sim/eventCards.js):
//   cash, cs, es, gs (add), rp (to research), wageMult (add),
//   wholesale / price / supply: { mult or share, months } (a temporary change).

export const EVENT_RULES = {
  CHANCE: 1 / 6,          // each month, when no card is waiting
  COOLDOWN: 3,            // months after a card
};

export const EVENTS = {
  fuelCrisis: {
    weight: 3, when: { minMonth: 6 },
    choices: [
      { effects: { wholesale: { mult: 1.5, months: 3 } } },
      { effects: { wholesale: { mult: 1.5, months: 3 }, price: { mult: 1.1, months: 3 }, cs: -5 } },
    ],
  },
  evChargers: {
    weight: 2, when: { minMonth: 24 },
    choices: [
      { effects: { cash: -100_000, gs: 8 } },
      { effects: { gs: -3 } },
    ],
  },
  unionRaise: {
    weight: 2, when: { minMonth: 12, minStaff: 10 },
    choices: [
      { effects: { es: 10, wageMult: 0.05 } },
      { effects: { es: -10 } },
    ],
  },
  university: {
    weight: 2, when: { minMonth: 12 },
    choices: [
      { effects: { cash: -50_000, rp: 300 } },
      { effects: {} },
    ],
  },
  reporter: {
    weight: 2, when: { minMonth: 18 },
    choices: [
      { effects: { cs: 3, gs: -2 } },
      { effects: { cs: -5 } },
    ],
  },
  supplyCrunch: {
    weight: 2, when: { minMonth: 30 },
    choices: [
      { effects: { wholesale: { mult: 1.3, months: 2 } } },
      { effects: { supply: { share: 0.85, months: 2 } } },
    ],
  },
  publicPetition: {
    weight: 6, when: { csBelow: 30 },
    choices: [
      { effects: { price: { mult: 0.9, months: 3 }, cs: 5 } },
      { effects: { cs: -3, gs: -3 } },
    ],
  },
};

export const EVENT_IDS = Object.keys(EVENTS);
