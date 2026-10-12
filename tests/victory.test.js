import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { on } from '../js/core/bus.js';
import { computeScore, gradeOf, netWorth, pathProgress, lossWarnings } from '../js/sim/victory.js';
import { advisorTips, advisorOn, suggestedBudget } from '../js/sim/advisor.js';
import { marketShare } from '../js/sim/economy.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

// Run a debug setup and play until the game ends (or 6 months).
function endAfter(setup, difficulty = 'normal', seed = 1) {
  setState(createState(seed, difficulty));
  const s = getState();
  dispatch({ type: 'debug/setup', payload: setup });
  let ended = null;
  const off = on('game:end', (e) => { ended = e; });
  const offCard = on('event:card', () => dispatch({ type: 'event/choose', payload: { choice: 0 } }));
  const stop = s.time.month + 6;
  while (!ended && s.time.month < stop && s.time.month <= 240) dispatch({ type: 'time/week' });
  off();
  offCard();
  return ended;
}

test('debug jumps trigger each of the 3 wins', () => {
  assert.deepEqual([endAfter('winMonopoly').result, endAfter('winMonopoly').path], ['win', 'monopoly']);
  assert.equal(endAfter('winSingularity').path, 'singularity');
  assert.equal(endAfter('winUtopia').path, 'utopia');
});

test('debug jumps trigger each of the 3 losses', () => {
  assert.equal(endAfter('loseBankrupt').reason, 'bankrupt');
  assert.equal(endAfter('loseLicense').reason, 'license');
  assert.equal(endAfter('loseCollapse').reason, 'collapse');
  for (const d of ['easy', 'hard']) {
    assert.equal(endAfter('loseBankrupt', d).reason, 'bankrupt');
    assert.equal(endAfter('loseLicense', d).reason, 'license');
  }
});

test('the game ends after December 2049 with a score', () => {
  const e = endAfter('endOfTime');
  assert.equal(e.result, 'time');
  assert.equal(e.month, 240);
  assert.ok(Number.isFinite(e.score.total));
  assert.ok(['S', 'A', 'B', 'C', 'D'].includes(e.score.grade));
  assert.equal(getState().time.month, 241);
});

test('a win needs the conditions for 3 months in a row', () => {
  setState(createState(2));
  const s = getState();
  dispatch({ type: 'debug/setup', payload: 'winMonopoly' });
  s.goals.hold.monopoly = 0;
  const ends = [];
  const off = on('game:end', (e) => ends.push(s.time.month - 1));
  while (s.time.month < 5 && !s.goals.ended) dispatch({ type: 'time/week' });
  off();
  assert.deepEqual(ends, [3]);
  // after the end, the clock does not move any more
  const m = s.time.month;
  dispatch({ type: 'time/week' });
  assert.equal(s.time.month, m);
});

test('bankruptcy counts only when the loan is at its limit', () => {
  setState(createState(3));
  const s = getState();
  s.company.cash = -10_000;
  for (let i = 0; i < 4; i++) dispatch({ type: 'time/week' });
  assert.equal(s.goals.loss.bankrupt, 0);   // the bank gave an emergency loan
  assert.equal(s.company.debt, 50_000);
});

test('red warnings: bankruptcy 1 month before, license at month 4, collapse at month 2', () => {
  const s = createState(4);
  s.goals.loss.bankrupt = 2;              // Normal: 3 months
  s.goals.loss.license = 4;
  s.goals.loss.collapse = 2;
  assert.deepEqual(lossWarnings(s).map((w) => [w.key, w.left]), [['bankrupt', 1], ['license', 2], ['collapse', 1]]);
  s.goals.loss.bankrupt = 1;
  s.goals.loss.license = 3;
  s.goals.loss.collapse = 1;
  assert.deepEqual(lossWarnings(s), []);
});

test('score formula and grades', () => {
  const s = createState(5, 'hard');
  s.company.cash = 1_000_000;
  s.company.debt = 200_000;
  s.company.capexTotal = 400_000;
  s.meters = { cs: 60, es: 70, gs: 50 };
  near(netWorth(s), 1_000_000);
  const sc = computeScore(s, { win: true, monthEnded: 200 });
  near(sc.parts.netWorth, 100);
  near(sc.parts.share, 50 * marketShare(s) * 100);
  near(sc.parts.meters, 600);
  near(sc.parts.win, 2000);
  near(sc.parts.monthsLeft, 800);
  assert.equal(sc.total, Math.round((100 + sc.parts.share + 600 + 2000 + 800) * 1.5));
  assert.equal(gradeOf(15_000), 'S');
  assert.equal(gradeOf(10_000), 'A');
  assert.equal(gradeOf(6_000), 'B');
  assert.equal(gradeOf(3_000), 'C');
  assert.equal(gradeOf(2_999), 'D');
});

test('progress bars show the weakest condition', () => {
  const s = createState(6);
  const p = pathProgress(s, 'monopoly');
  assert.equal(p.weakest.key, 'cash');
  assert.ok(p.weakest.progress < 0.01);
  assert.equal(pathProgress(s, 'utopia').list.length, 4);
});

test('Advisor: off on Normal until O5, on from the start on Easy; tips and Apply', () => {
  const s = createState(7, 'normal');
  assert.equal(advisorOn(s), false);
  s.tech.nodes.O5.status = 'ACTIVE';
  assert.equal(advisorOn(s), true);
  assert.equal(advisorOn(createState(7, 'easy')), true);
  s.sectors.find((x) => x.owned).health = 20;
  const tips = advisorTips(s);
  assert.ok(tips.length <= 3);
  assert.ok(tips.some((t) => t.id === 'lowHealth'));
  assert.ok(tips.some((t) => t.id === 'idleEngineers'));
  const lh = tips.find((t) => t.id === 'lowHealth');
  setState(s);
  dispatch(lh.action);
  assert.equal(s.budget.split.maintenance, 30);
});

test('Apply suggested budget sets the 5 sliders for the chosen path', () => {
  setState(createState(8));
  const s = getState();
  dispatch({ type: 'goals/target', payload: 'singularity' });
  dispatch({ type: 'budget/setAll', payload: suggestedBudget(s) });
  assert.deepEqual(s.budget.split, { marketing: 10, rd: 40, maintenance: 25, lobbying: 10, pr: 15 });
});
