// Headless sim runner (design section 18).
//   node tools/sim-runner.js --seed 42 --difficulty normal --bot balanced --months 240 [--out run.csv]
// Writes a CSV with 1 row for each month: cash, customers, market share, CS, ES, GS, RP, outage hours.
// The bots use the same dispatch actions as the UI.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { on } from '../js/core/bus.js';
import { dateLabel } from '../js/core/time.js';
import { TIME, DEFAULT_DIFFICULTY } from '../js/data/balance.js';
import { marketShare, totalCustomers } from '../js/sim/economy.js';
import { averageOutage } from '../js/sim/grid.js';

export const BOTS = ['idle', 'balanced', 'rusher', 'pennyPincher', 'pathMonopoly', 'pathSingularity', 'pathUtopia'];
const COLUMNS = ['month', 'date', 'cash', 'debt', 'customers', 'share', 'cs', 'es', 'gs', 'rp', 'outageH', 'sectors'];

const totalRp = (s) => Object.values(s.tech.nodes).reduce((n, x) => n + x.rp, 0);

export async function runGame({ seed = 1, difficulty = DEFAULT_DIFFICULTY, bot = 'balanced', months = TIME.END_MONTH }) {
  const b = (await import(`./bots/${bot}.js`)).default;
  setState(createState(seed, difficulty, { companyName: `Sim ${bot}` }));
  const s = getState();
  const rows = [];
  let end = null;
  const offs = [
    on('event:card', ({ id }) => dispatch({ type: 'event/choose', payload: { choice: b.event(id) } })),
    on('game:end', (e) => { end = e; }),
    on('month:end', ({ month }) => {
      rows.push({
        month, date: dateLabel(month), cash: Math.round(s.company.cash), debt: s.company.debt,
        customers: totalCustomers(s), share: +marketShare(s).toFixed(4),
        cs: +s.meters.cs.toFixed(1), es: +s.meters.es.toFixed(1), gs: +s.meters.gs.toFixed(1),
        rp: Math.round(totalRp(s)), outageH: +averageOutage(s).toFixed(2), sectors: s.sectors.filter((x) => x.owned).length,
      });
    }),
  ];
  try {
    b.setup();
    let month = s.time.month;
    while (s.time.month <= months && !end) {
      b.week?.();
      dispatch({ type: 'time/week' });
      if (s.time.month !== month) {
        month = s.time.month;
        if (!end) b.month();
      }
    }
  } finally {
    offs.forEach((off) => off());
  }
  return { seed, difficulty, bot, end, rows };
}

export function toCsv(rows) {
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((k) => r[k]).join(','))].join('\n') + '\n';
}

function parseArgs(argv) {
  const args = { seed: 1, difficulty: DEFAULT_DIFFICULTY, bot: 'balanced', months: TIME.END_MONTH, out: null };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (key in args) args[key] = typeof args[key] === 'number' ? Number(argv[i + 1]) : argv[i + 1];
  }
  return args;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const res = await runGame(args);
  const csv = toCsv(res.rows);
  if (args.out) writeFileSync(args.out, csv); else process.stdout.write(csv);
  const e = res.end;
  process.stderr.write(`${args.bot} seed ${args.seed} ${args.difficulty}: ${e ? `${e.result}${e.path ? ` (${e.path})` : ''}${e.reason ? ` (${e.reason})` : ''} at month ${e.month}, score ${e.score.total} grade ${e.score.grade}` : 'no end'}\n`);
}
