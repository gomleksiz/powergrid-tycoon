// All tunable numbers. No magic numbers in the code: add new ones here.

export const GAME_VERSION = '0.2.0';
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
};

export const DIFFICULTIES = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY = 'normal';

export const SAVE = {
  PREFIX: 'pgt.',
  AUTO_KEYS: ['pgt.auto.a', 'pgt.auto.b'],
  SLOT_COUNT: 3,
  SETTINGS_KEY: 'pgt.settings',
  META_SUFFIX: '.meta',
};

export const UI = {
  NEWS_MAX_ITEMS: 5,
  NEWS_SHOW_MS: 8000,
  COMPANY_NAME_MAX: 24,
  SEED_MAX: 0xffffffff,
};
