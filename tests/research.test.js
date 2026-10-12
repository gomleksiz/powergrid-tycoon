import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { researchCost, fRD, rpPerTeamMonth, researchSlots, canStartResearch } from '../js/sim/research.js';
import { globalEffects, sectorEffects, STATUS } from '../js/sim/effects.js';
import { NODES, NODE_IDS, EFFECT_RULES, RESEARCH_COST, LEAP } from '../js/data/techTree.js';
import { WORK } from '../js/data/balance.js';
import { serialize, readSave } from '../js/save/save.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const week = (n = 1) => { for (let i = 0; i < n; i++) dispatch({ type: 'time/week' }); };
const home = () => getState().sectors.find((s) => s.owned);

test('the tree has 33 nodes; 3 are active at the start', () => {
  assert.equal(NODE_IDS.length, 33);
  const s = createState(1);
  assert.deepEqual(NODE_IDS.filter((id) => s.tech.nodes[id].status === STATUS.ACTIVE).sort(), ['D1', 'G1', 'P1']);
  // every "needs" and "leapFrom" points to a real node
  for (const id of NODE_IDS) for (const n of [...NODES[id].needs, NODES[id].leapFrom].filter(Boolean)) assert.ok(NODES[n], `${id} → ${n}`);
});

test('all 33 nodes load from data: every effect key has a rule', () => {
  const s = createState(1);
  for (const id of NODE_IDS) {
    for (const k of Object.keys({ ...NODES[id].effects, ...NODES[id].anyEffects })) assert.ok(EFFECT_RULES[k], `${id}.${k}`);
    s.tech.nodes[id].status = NODES[id].deploy === null || NODES[id].deploy.build || NODES[id].deploy.oneTime ? 'ACTIVE' : 'UNLOCKED';
    for (const sec of s.sectors) if (NODES[id].deploy?.weeks) sec.tech[id] = 'ACTIVE';
  }
  const g = globalEffects(s);
  assert.equal(g.managementThreshold, 100);
  assert.deepEqual(g.unlockTier.sort(), ['corporate', 'high', 'low', 'medium']);
  const fx = sectorEffects(s, s.sectors[0]);
  near(fx.fLine, 0.1);
  near(fx.healthDecay, 0.5);
  near(fx.outageReduce, 0.3);
  assert.equal(fx.damageMult.windstorm, 0);
});

test('research costs by tier, and leapfrog + 60 %', () => {
  assert.equal(researchCost('P2'), RESEARCH_COST[1]);
  assert.equal(researchCost('D2'), RESEARCH_COST[2]);
  assert.equal(researchCost('D5'), RESEARCH_COST[3]);
  assert.equal(researchCost('D5', true), Math.round(RESEARCH_COST[3] * LEAP.COST_MULT));
  assert.equal(researchCost('G5'), RESEARCH_COST[4]);
});

test('F RD and RP for 1 team', () => {
  near(fRD(3_750), 1);
  near(fRD(100_000), 1.5);
  const s = createState(1);
  s.budget.split = { marketing: 25, rd: 0, maintenance: 25, lobbying: 25, pr: 25 };
  near(rpPerTeamMonth(s), 30 * 0.75);
});

test('tier 1 takes 3 months with 1 team', () => {
  setState(createState(2));
  dispatch({ type: 'research/start', payload: { node: 'P2', teams: 1 } });
  assert.equal(getState().tech.nodes.P2.status, STATUS.RESEARCHING);
  let weeks = 0;
  while (getState().tech.nodes.P2.status === STATUS.RESEARCHING && weeks < 100) { week(); weeks++; }
  assert.equal(getState().tech.nodes.P2.status, STATUS.ACTIVE);   // no field work
  assert.ok(weeks >= 11 && weeks <= 12, `weeks ${weeks}`);
  // it unlocks the next nodes
  assert.equal(getState().tech.nodes.P3.status, STATUS.AVAILABLE);
});

test('teams of 3 engineers; up to 3 teams; queue of 5', () => {
  setState(createState(3));
  const s = getState();
  assert.equal(researchSlots(s), 1);
  s.staff.engineers = 9;
  dispatch({ type: 'research/start', payload: { node: 'O1', teams: 3 } });
  dispatch({ type: 'research/start', payload: { node: 'R1', teams: 1 } });
  week();
  const [a, b] = s.projects;
  assert.equal(a.teams, 3);
  assert.equal(b.teams, 0);
  assert.equal(b.status, 'waiting');
  for (const id of ['P2', 'P7', 'D2']) dispatch({ type: 'research/start', payload: { node: id } });
  assert.equal(s.projects.length, 5);
  assert.equal(canStartResearch(s, 'G2').reason, 'queueFull');
});

test('new staff start next week; hire and fire cost 1 month of wage', () => {
  setState(createState(4));
  const s = getState();
  const cash = s.company.cash;
  dispatch({ type: 'staff/hire', payload: { role: 'engineers', count: 3 } });
  assert.equal(s.staff.engineers, 3);
  assert.equal(s.company.cash, cash - 15_000);
  week();
  assert.equal(s.staff.engineers, 6);
  dispatch({ type: 'staff/fire', payload: { role: 'technicians', count: 1 } });
  assert.equal(s.staff.technicians, 3);
  assert.equal(s.meters.es, 62);
});

test('rush: time left − 50 %, ES − 5 at once, crunch for 3 months, 1 time only', () => {
  setState(createState(5));
  const s = getState();
  dispatch({ type: 'research/start', payload: { node: 'D2', teams: 1 } });
  week(4);
  const rpBefore = s.tech.nodes.D2.rp;
  const p = s.projects[0];
  const cash = s.company.cash;
  dispatch({ type: 'project/rush', payload: { id: p.id } });
  near(s.tech.nodes.D2.rp, rpBefore + (300 - rpBefore) / 2);
  near(s.company.cash, cash - 300 * WORK.RUSH_RP_DOLLARS * WORK.RUSH_COST_SHARE);
  assert.equal(s.meters.es, 60);
  assert.equal(s.staff.crunch.length, 1);
  const rp2 = s.tech.nodes.D2.rp;
  dispatch({ type: 'project/rush', payload: { id: p.id } });
  near(s.tech.nodes.D2.rp, rp2);
  week(4 * 3);
  assert.equal(s.staff.crunch.length, 0);
});

test('research and deploy Storm Poles in Home Valley', () => {
  setState(createState(6));
  const s = getState();
  dispatch({ type: 'research/start', payload: { node: 'D2' } });
  let weeks = 0;
  while (s.tech.nodes.D2.status !== STATUS.UNLOCKED && weeks < 200) { week(); weeks++; }
  assert.equal(s.tech.nodes.D2.status, STATUS.UNLOCKED);
  assert.ok(weeks > 30 && weeks < 45, `research weeks ${weeks}`);  // 300 RP at ~30 RP a month
  const h = home();
  h.damage = 0;
  const capex = s.company.capexTotal;
  dispatch({ type: 'deploy/start', payload: { node: 'D2', sector: h.id } });
  week();
  assert.equal(h.tech.D2, STATUS.DEPLOYING);
  assert.equal(s.company.capexTotal, capex + 25_000);   // the CapEx is paid at the start
  week(6);
  assert.equal(h.tech.D2, STATUS.ACTIVE);
  near(sectorEffects(s, h).fLine, 0.7);
});

test('leapfrog: Underground from Overhead Lines costs + 60 %, deploys × 2', () => {
  setState(createState(7));
  const s = getState();
  assert.equal(s.tech.nodes.D5.status, STATUS.AVAILABLE);   // open by the leap path
  assert.equal(canStartResearch(s, 'D5').reason, 'needsLeap');
  dispatch({ type: 'research/start', payload: { node: 'D5', leap: true } });
  assert.equal(s.projects[0].total, Math.round(RESEARCH_COST[3] * LEAP.COST_MULT));
  assert.equal(s.tech.nodes.D5.leap, true);
});

test('fission leap: CS − 25 when the research is done', () => {
  setState(createState(8));
  const s = getState();
  s.staff.engineers = 9;
  dispatch({ type: 'research/start', payload: { node: 'G4', teams: 3, leap: true } });
  const cs = s.meters.cs;
  s.tech.nodes.G4.rp = s.projects[0].total - 0.01;
  week();
  assert.equal(s.tech.nodes.G4.status, STATUS.UNLOCKED);
  assert.ok(s.meters.cs <= cs - 25 + 1e-9, `cs ${s.meters.cs}`);
});

test('projects in progress stay after save and load', () => {
  setState(createState(9));
  dispatch({ type: 'research/start', payload: { node: 'P2' } });
  dispatch({ type: 'staff/hire', payload: { role: 'technicians', count: 4 } });
  week(3);
  const before = JSON.stringify({ p: getState().projects, t: getState().tech, st: getState().staff });
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  storage.setItem('k', JSON.stringify(serialize(getState())));
  const l = readSave('k', storage).state;
  assert.equal(JSON.stringify({ p: l.projects, t: l.tech, st: l.staff }), before);
});
