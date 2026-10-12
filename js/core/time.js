// Date helpers: month 1 = Jan 2030.

import { TIME } from '../data/balance.js';
import { MONTHS } from '../data/text.js';

export function monthToDate(month) {
  const i = month - 1;
  return {
    year: TIME.START_YEAR + Math.floor(i / TIME.MONTHS_PER_YEAR),
    monthIndex: i % TIME.MONTHS_PER_YEAR,
  };
}

export function dateLabel(month) {
  const { year, monthIndex } = monthToDate(month);
  return `${MONTHS[monthIndex]} ${year}`;
}

// Real milliseconds for 1 week at 1x.
export const WEEK_MS = (TIME.MONTH_SECONDS_AT_1X * 1000) / TIME.WEEKS_PER_MONTH;
