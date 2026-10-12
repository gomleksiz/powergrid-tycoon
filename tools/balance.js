// Run every bot with many seeds and check the balance targets (design section 18).
//   node tools/balance.js [--seeds 20] [--difficulty normal|easy|hard|all] [--bots a,b]
// A target passes when it holds in at least 16 of 20 seeds (80 %).

import { fileURLToPath } from 'node:url';
import { runGame, BOTS } from './sim-runner.js';

const PASS_SHARE = 0.8;

const custAt = (r, m) => r.rows.find((x) => x.month === m)?.customers ?? 0;
const winMonth = (r) => (r.end?.result === 'win' ? r.end.month : null);

// Each target: which bot, a check for 1 run → true/false, and a short text.
export const TARGETS = [
  { bot: 'idle', text: 'does not win; grade D', check: (r) => winMonth(r) === null && r.end?.score.grade === 'D' },
  { bot: 'balanced', text: 'wins at month 200–235', check: (r) => winMonth(r) >= 200 && winMonth(r) <= 235 },
  { bot: 'balanced', text: 'customers month 40: 4,000–6,000', check: (r) => custAt(r, 40) >= 4000 && custAt(r, 40) <= 6000 },
  { bot: 'balanced', text: 'customers month 100: 15,000–25,000', check: (r) => custAt(r, 100) >= 15000 && custAt(r, 100) <= 25000 },
  { bot: 'balanced', text: 'customers month 180: more than 30,000', check: (r) => custAt(r, 180) > 30000 || (winMonth(r) && winMonth(r) < 180) },
  { bot: 'pathMonopoly', text: 'wins Monopoly before month 240', check: (r) => r.end?.path === 'monopoly' },
  { bot: 'pathSingularity', text: 'wins Singularity before month 240', check: (r) => r.end?.path === 'singularity' },
  { bot: 'pathUtopia', text: 'wins Utopia before month 240', check: (r) => r.end?.path === 'utopia' },
  { bot: 'pennyPincher', text: 'loses customers, low score, not bankrupt before month 100',
    check: (r) => !(r.end?.reason === 'bankrupt' && r.end.month < 100) && custAt(r, 100) < 2000 && ['C', 'D'].includes(r.end?.score.grade ?? 'D') },
  { bot: '*', text: 'fastest win of any bot not before month 160', check: (r) => winMonth(r) === null || winMonth(r) >= 160 },
];

function describe(r) {
  const e = r.end;
  if (!e) return 'none';
  return e.result === 'win' ? `win:${e.path}@${e.month}` : e.result === 'loss' ? `loss:${e.reason}@${e.month}` : `time:${e.score.grade}`;
}

export async function runAll({ seeds = 20, difficulty = 'normal', bots = BOTS } = {}) {
  const results = {};
  for (const bot of bots) {
    results[bot] = [];
    for (let seed = 1; seed <= seeds; seed++) results[bot].push(await runGame({ seed, difficulty, bot }));
  }
  return results;
}

export function report(results, { verbose = true } = {}) {
  const lines = [];
  for (const [bot, runs] of Object.entries(results)) {
    const ends = {};
    for (const r of runs) { const k = describe(r).replace(/@\d+/, ''); ends[k] = (ends[k] ?? 0) + 1; }
    const wins = runs.map(winMonth).filter(Boolean);
    const avgWin = wins.length ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length) : '-';
    const grades = runs.map((r) => r.end?.score.grade ?? '-').join('');
    lines.push(`${bot.padEnd(16)} ends ${JSON.stringify(ends)}  avg win month ${avgWin}  grades ${grades}`);
    if (verbose) lines.push(`${''.padEnd(16)} cust@40/100/180 ${[40, 100, 180].map((m) => Math.round(runs.reduce((a, r) => a + custAt(r, m), 0) / runs.length)).join(' / ')}`);
  }
  lines.push('');
  let passed = 0;
  for (const t of TARGETS) {
    const runs = t.bot === '*' ? Object.values(results).flat() : results[t.bot] ?? [];
    if (!runs.length) continue;
    const ok = runs.filter(t.check).length;
    const pass = ok / runs.length >= PASS_SHARE;
    if (pass) passed++;
    lines.push(`${pass ? 'PASS' : 'FAIL'}  ${t.bot.padEnd(16)} ${t.text}: ${ok}/${runs.length}`);
  }
  lines.push(`\n${passed}/${TARGETS.length} targets pass.`);
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const get = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  const seeds = Number(get('seeds', 20));
  const bots = get('bots', BOTS.join(',')).split(',');
  const diffs = get('difficulty', 'normal') === 'all' ? ['easy', 'normal', 'hard'] : [get('difficulty', 'normal')];
  for (const difficulty of diffs) {
    const t0 = Date.now();
    const results = await runAll({ seeds, difficulty, bots });
    console.log(`=== ${difficulty} (${seeds} seeds, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    console.log(report(results));
  }
}
