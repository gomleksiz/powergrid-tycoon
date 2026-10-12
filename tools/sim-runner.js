// Headless sim runner: node tools/sim-runner.js --seed 42 --difficulty normal --months 24
// Writes a CSV with 1 row per month to stdout. Bots come in step 13.

import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { on } from '../js/core/bus.js';
import { dateLabel } from '../js/core/time.js';
import { TIME, DEFAULT_DIFFICULTY } from '../js/data/balance.js';

function parseArgs(argv) {
  const args = { seed: 1, difficulty: DEFAULT_DIFFICULTY, months: TIME.END_MONTH };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (key in args) args[key] = typeof args[key] === 'number' ? Number(argv[i + 1]) : argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
setState(createState(args.seed, args.difficulty, { companyName: 'Sim' }));

const COLUMNS = ['month', 'date', 'cash', 'debt', 'customers', 'revenue', 'net', 'wholesale'];
const rows = [COLUMNS.join(',')];
on('month:end', ({ month, report }) => {
  const s = getState();
  rows.push([month, dateLabel(month), Math.round(s.company.cash), s.company.debt, report.customers.end,
    Math.round(report.money.revenue), Math.round(report.money.net), report.money.price.toFixed(4)].join(','));
});

while (getState().time.month <= args.months) dispatch({ type: 'time/week' });

process.stdout.write(rows.join('\n') + '\n');
