// Version 1.1: alerts that do not stop the game, offices, "Schedule all", outage help,
// growth, the regional shortage, selling to the government, upgrades, campaigns and price wars.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, setState, getState, dispatch } from '../js/core/store.js';
import { createLoop } from '../js/core/loop.js';
import { createRng } from '../js/core/rng.js';
import { MONEY, WORK, GROWTH, REGION } from '../js/data/balance.js';
import { OFFICES, MANAGER, CAMPAIGN } from '../js/data/offices.js';
import { BUILDINGS, LEVELS } from '../js/data/buildings.js';
import { RIVAL } from '../js/data/rivals.js';
import { wages, upkeep, sectorRevenue, energyTrade, monthlyMoney, wholesalePrice, govPrice } from '../js/sim/economy.js';
import { capacityMw, ownEnergy, supplyGapMw } from '../js/sim/grid.js';
import { shortageAt, regionMargin, govPriceMult, updateRegion } from '../js/sim/market.js';
import { sectorPotential, emptyTiers } from '../js/sim/setup.js';
import { growthAt } from '../js/sim/growth.js';
import { priceCut, campaignCut, campaignsMonth } from '../js/sim/marketing.js';
import { rivalsMonth, winBackCount } from '../js/sim/rivals.js';
import { managerWeek, watchWeek, scheduleAll, deployCandidates, idleEngineers } from '../js/sim/offices.js';
import { researchProjects } from '../js/sim/research.js';
import { fieldProjects } from '../js/sim/deployment.js';
import { busyTechnicians, repairWeek } from '../js/sim/repair.js';
import { outageAdvice } from '../js/sim/advice.js';
import { gsTarget } from '../js/sim/satisfaction.js';
import { STATUS } from '../js/sim/effects.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const home = (s) => s.sectors.find((x) => x.owned);

function game(seed = 1) {
  const s = createState(seed, 'normal');
  s.company.cash = 1e8;
  setState(s);
  return getState();
}

function addBuilding(s, sector, type, extra = {}) {
  const b = { id: s.nextId++, type, x: 0, y: 0, status: 'active', ...extra };
  sector.buildings.push(b);
  return b;
}

function unlock(s, id) {
  s.tech.nodes[id].status = STATUS.UNLOCKED;
}

// ---------- alerts pause only while they are open ----------

test('an alert pauses the game and it runs on at the old speed after', () => {
  const loop = createLoop({ onTick() {} });
  loop.setSpeed(2);
  const release = loop.hold();
  assert.equal(loop.getSpeed(), 0);
  release();
  assert.equal(loop.getSpeed(), 2);
  release();   // a second call does nothing
  assert.equal(loop.getSpeed(), 2);
});

test('2 alerts: the game runs on after the last one; a paused game stays paused', () => {
  const loop = createLoop({ onTick() {} });
  loop.setSpeed(5);
  const a = loop.hold();
  const b = loop.hold();
  a();
  assert.equal(loop.getSpeed(), 0);
  b();
  assert.equal(loop.getSpeed(), 5);

  loop.togglePause();                 // the player pauses
  assert.equal(loop.getSpeed(), 0);
  const c = loop.hold();
  c();
  assert.equal(loop.getSpeed(), 0);
});

test('the player pauses during an alert, or the game ends: no restart', () => {
  const loop = createLoop({ onTick() {} });
  loop.setSpeed(1);
  const a = loop.hold();
  loop.togglePause();   // play …
  loop.togglePause();   // … and pause again
  a();
  assert.equal(loop.getSpeed(), 0);

  loop.setSpeed(2);
  const b = loop.hold();
  loop.cancelHolds();
  b();
  assert.equal(loop.getSpeed(), 0);
});

// ---------- offices ----------

test('offices: hire cost once, then a monthly wage; letting go stops the campaigns', () => {
  const s = game();
  const before = wages(s);
  const cash = s.company.cash;
  dispatch({ type: 'office/hire', payload: 'manager' });
  dispatch({ type: 'office/hire', payload: 'marketing' });
  near(cash - s.company.cash, OFFICES.manager.hireCost + OFFICES.marketing.hireCost);
  near(wages(s) - before, OFFICES.manager.wage + OFFICES.marketing.wage);
  dispatch({ type: 'campaign/start', payload: { cut: 0.25, months: 6, sector: null } });
  assert.equal(s.campaigns.length, 1);
  dispatch({ type: 'office/close', payload: 'marketing' });
  assert.equal(s.campaigns.length, 0);
  near(wages(s) - before, OFFICES.manager.wage);
});

test('Project Manager: free research teams get work', () => {
  const s = game();
  assert.equal(researchProjects(s).length, 0);
  managerWeek(s);
  assert.equal(researchProjects(s).length, 0, 'no manager, no plan');
  dispatch({ type: 'office/hire', payload: 'manager' });
  managerWeek(s);
  assert.equal(researchProjects(s).length, 1);
  assert.equal(idleEngineers(s), 0);
});

test('Project Manager: deployments only with a free crew and a cash reserve', () => {
  const s = game();
  dispatch({ type: 'office/hire', payload: 'manager' });
  s.offices.manager.autoResearch = false;
  unlock(s, 'D2');
  s.company.cash = 1_000;                      // below the reserve
  managerWeek(s);
  assert.equal(fieldProjects(s).length, 0);
  s.company.cash = 1e7;
  managerWeek(s);
  assert.equal(fieldProjects(s).length, 1);
  assert.equal(fieldProjects(s)[0].node, 'D2');
});

test('Schedule all queues every deployment and fills research', () => {
  const s = game();
  s.sectors.find((x) => !x.owned).owned = true;
  unlock(s, 'D2');
  unlock(s, 'D3');
  const n = deployCandidates(s).length;
  assert.equal(n, 4);
  const events = dispatch({ type: 'projects/scheduleAll' });
  assert.equal(fieldProjects(s).length, 4);
  assert.equal(researchProjects(s).length, 1);
  assert.equal(events[0].payload.count, 5);
  assert.equal(deployCandidates(s).length, 0);
});

test('the manager tells you when engineers have no work for 4 weeks', () => {
  const s = game();
  s.staff.engineers = 6;                       // 2 teams, no research
  let news = [];
  for (let w = 0; w < MANAGER.IDLE_WEEKS; w++) news = watchWeek(s);
  assert.equal(s.staff.idle.engineers, MANAGER.IDLE_WEEKS);
  assert.equal(news.length, 0, 'no manager, no news');
  s.staff.idle.engineers = 0;
  s.offices.manager.hired = true;
  s.offices.manager.autoResearch = false;
  for (let w = 0; w < MANAGER.IDLE_WEEKS; w++) news = watchWeek(s);
  assert.equal(news.length, 1);
  assert.equal(news[0].payload.key, 'pmIdle');
  assert.equal(news[0].payload.role, 'engineers');
});

test('the manager tells you about a project that waits too long', () => {
  const s = game();
  s.offices.manager.hired = true;
  unlock(s, 'D2');
  s.staff.technicians = 0;                     // no crew
  dispatch({ type: 'deploy/start', payload: { node: 'D2', sector: home(s).id } });
  let news = [];
  for (let w = 0; w < MANAGER.WAIT_WEEKS; w++) news = watchWeek(s);
  const stuck = news.find((e) => e.payload.key === 'pmStuck');
  assert.ok(stuck);
  assert.equal(stuck.payload.reason, 'crew');
});

// ---------- outages: who repairs, and what to do ----------

test('repair crews are counted in each sector', () => {
  const s = game();
  const h = home(s);
  h.damage = 50;
  repairWeek(s);
  assert.equal(h.repairTechs, s.staff.technicians);
  h.damage = 0;
  repairWeek(s);
  assert.equal(h.repairTechs, 0);
});

test('outage help: no free technicians → hire; overload → upgrade a substation; shortage → own power', () => {
  const s = game();
  const h = home(s);
  h.damage = 30;
  s.staff.technicians = 4;
  unlock(s, 'D2');
  s.projects.push({ id: 999, kind: 'deploy', node: 'D2', sector: h.id, status: 'active', progress: 0, total: 6, paid: true });
  let tips = outageAdvice(s, h);
  const hire = tips.find((t) => t.id === 'noCrew');
  assert.ok(hire);
  assert.deepEqual(hire.action, { type: 'staff/hire', payload: { role: 'technicians', count: WORK.CREW_SIZE } });

  s.projects = [];
  h.damage = 0;
  h.customers.low = 20_000;                    // far over the capacity
  h.lastParts = { wear: 0, overload: 30, damage: 0, shortage: 5, R: 1 };
  tips = outageAdvice(s, h);
  const up = tips.find((t) => t.id === 'upgradeSubstation');
  assert.equal(up.action.type, 'building/upgrade');
  assert.ok(tips.find((t) => t.id === 'ownPower'));
});

// ---------- growth ----------

test('the region grows from Phase 3; the peak grows a little each year', () => {
  const s = game();
  const h = home(s);
  const start = sectorPotential(h).low;
  assert.deepEqual(growthAt(GROWTH.START_MONTH), { low: 1, medium: 1, high: 1, corporate: 1 });
  h.growth = growthAt(GROWTH.START_MONTH + 24);
  near(sectorPotential(h).low, Math.round(start * (1 + GROWTH.POTENTIAL_YEAR.low) ** 2), 1);
  assert.ok(sectorPotential(h).medium > 0);
});

test('a December news line tells how much the region grew', () => {
  const s = game();
  s.time.month = 120;                          // Dec 2039 → next month is January
  s.time.week = 4;
  const events = dispatch({ type: 'time/week' });
  const grew = events.find((e) => e.payload?.key === 'regionGrew');
  assert.ok(grew && grew.payload.count > 0);
});

// ---------- regional shortage and selling to the government ----------

test('no shortage at the start; shortages come later, most in summer', () => {
  assert.equal(shortageAt(1), 0);
  assert.ok(regionMargin(1) > 0);
  assert.ok(shortageAt(235) > 0, 'July 2049');
  assert.ok(shortageAt(235) > shortageAt(232), 'summer is worse than spring');
  near(govPriceMult(0), MONEY.SELLBACK_SHARE);
  near(govPriceMult(0.05), MONEY.SELLBACK_SHARE + REGION.GOV_K * 0.05);
  near(govPriceMult(1), REGION.GOV_MAX);
});

test('a shortage lowers the supply and raises the wholesale price', () => {
  const s = game();
  const p0 = wholesalePrice(s);
  s.time.month = 234;
  updateRegion(s, createRng(1));
  assert.ok(s.market.shortage > 0);
  near(s.market.supplyShare, 1 - s.market.shortage);
  s.time.month = 1;
  assert.ok(wholesalePrice(s) > p0);
});

test('energy trade: extra own power is sold; the promised share goes to the government', () => {
  const t = energyTrade(1000, 1500, 0.1, 0.2, 0);
  near(t.cost, 0);
  near(t.sales, 500 * 0.2);
  const g = energyTrade(1000, 1500, 0.1, 0.2, 0.5);   // 750 to the government, 750 own
  near(g.buyKwh, 250);
  near(g.sellKwh, 750);
  near(g.cost, 25);
  near(g.sales, 150);
});

test('selling to the government: income in the report, more GS, less own power at the peak', () => {
  const s = game();
  const h = home(s);
  addBuilding(s, h, 'fission');
  s.market.shortage = 0.08;
  s.market.supplyShare = 1 - 0.08;
  dispatch({ type: 'govt/share', payload: 0.5 });
  assert.equal(s.govtSale.share, 0.5);
  const m = monthlyMoney(s, { ownKwh: ownEnergy(s).kwh });
  assert.ok(m.sales > 0);
  near(m.govPrice, govPrice(s));
  // Peak 300 MW: the shortage is 24 MW. The plant (25 MW) covers it, but half is sold.
  near(supplyGapMw(s, 300), 24 - 25 * 0.5);
  s.govtSale.lastKwh = 5e6;
  const gs = gsTarget(s).parts.find((p) => p.key === 'gridHelp');
  near(gs.value, 5 * REGION.GS_PER_GWH);
  s.market.shortage = 0;
  near(gsTarget(s).parts.find((p) => p.key === 'gridHelp').value, 0);
});

// ---------- upgrades ----------

test('a substation upgrade is instant: level 2 gives 1.5×, level 3 gives 2×', () => {
  const s = game();
  const h = home(s);
  const sub = h.buildings.find((b) => b.type === 'substation');
  const cap = capacityMw(h);
  const cash = s.company.cash;
  const up = upkeep(s);
  dispatch({ type: 'building/upgrade', payload: { id: sub.id } });
  assert.equal(sub.level, 2);
  near(cash - s.company.cash, BUILDINGS.substation.cost * LEVELS.COST[2]);
  near(capacityMw(h), cap + BUILDINGS.substation.capacityMw * 0.5);
  near(upkeep(s) - up, MONEY.UPKEEP_BUILDING);
  dispatch({ type: 'building/upgrade', payload: { id: sub.id } });
  assert.equal(sub.level, 3);
  dispatch({ type: 'building/upgrade', payload: { id: sub.id } });
  assert.equal(sub.level, 3, 'level 3 is the top');
});

test('a fission upgrade needs a field crew; the plant works at its old level meanwhile', () => {
  const s = game();
  const h = home(s);
  s.meters.gs = 60;
  const plant = addBuilding(s, h, 'fission');
  const kwh = ownEnergy(s).kwh;
  dispatch({ type: 'building/upgrade', payload: { id: plant.id } });
  assert.equal(plant.level, undefined);
  assert.equal(plant.upgrading, true);
  const p = s.projects.find((x) => x.kind === 'upgrade');
  near(p.total, BUILDINGS.fission.buildWeeks * LEVELS.WEEKS_SHARE);
  near(ownEnergy(s).kwh, kwh);
  for (let w = 0; w < 20 && plant.upgrading; w++) dispatch({ type: 'time/week' });
  assert.equal(plant.level, 2);
  near(ownEnergy(s).kwh, kwh * 1.5);
});

test('build and upgrade projects keep their crew busy', () => {
  const s = game();
  const h = home(s);
  s.meters.gs = 60;
  const plant = addBuilding(s, h, 'fission');
  dispatch({ type: 'building/upgrade', payload: { id: plant.id } });
  dispatch({ type: 'time/week' });
  assert.equal(busyTechnicians(s), WORK.CREW_SIZE);
});

// ---------- campaigns and price wars ----------

test('a campaign needs the Marketing department, costs a start fee and cuts the bill', () => {
  const s = game();
  const h = home(s);
  dispatch({ type: 'campaign/start', payload: { cut: 0.5, months: 6, sector: null } });
  assert.equal(s.campaigns.length, 0);
  dispatch({ type: 'office/hire', payload: 'marketing' });
  const cash = s.company.cash;
  const bill = sectorRevenue(s, h);
  dispatch({ type: 'campaign/start', payload: { cut: 0.5, months: 6, sector: null } });
  near(cash - s.company.cash, CAMPAIGN.SETUP_PER_SECTOR);
  near(campaignCut(s, h), 0.5);
  near(sectorRevenue(s, h), bill * 0.5);
  h.discount = 0.2;
  near(priceCut(s, h), 1 - 0.8 * 0.5);
  dispatch({ type: 'campaign/start', payload: { cut: 0.1, months: 3, sector: null } });
  assert.equal(s.campaigns.length, 1, 'one campaign for each place');
});

test('a campaign brings more customers and ends after its months; 50% costs GS', () => {
  const run = (withCampaign) => {
    const s = game(7);
    if (withCampaign) {
      dispatch({ type: 'office/hire', payload: 'marketing' });
      dispatch({ type: 'campaign/start', payload: { cut: 0.5, months: 3, sector: null } });
    }
    for (let w = 0; w < 12; w++) dispatch({ type: 'time/week' });
    return s;
  };
  const a = run(false);
  const b = run(true);
  const n = (s) => home(s).customers.low;
  assert.ok(n(b) > n(a), `${n(b)} > ${n(a)}`);
  assert.equal(b.campaigns.length, 0, 'ended after 3 months');

  const s = game();
  s.campaigns.push({ id: 1, cut: 0.5, months: 3, left: 3, sector: null });
  const gs = s.meters.gs;
  campaignsMonth(s);
  near(s.meters.gs, gs + CAMPAIGN.DEEP_GS);
  assert.equal(s.campaigns[0].left, 2);
});

test('cheaper than the rival: its customers switch to you, and it starts a price war', () => {
  const s = game();
  const h = home(s);
  h.rival = { id: 'apex', strength: 50, customers: { ...emptyTiers(), low: 1000 }, lowMonths: 0, H: 15 };
  s.prices.low = 0.6;                          // Apex: 0.8
  near(winBackCount(1000, 0.8, 0.6), 1000 * RIVAL.WIN_RATE * 0.2);
  const before = h.customers.low;
  const events = rivalsMonth(s, createRng(3));
  assert.ok(h.customers.low > before - 100, 'won some back');
  assert.ok(h.rival.customers.low < 1000 + 100);
  assert.ok(events.some((e) => e.type === 'rival:priceWar'));
  near(h.rival.price, 0.8 - RIVAL.WAR_STEP);
  rivalsMonth(s, createRng(4));
  near(h.rival.price, 0.8 - 2 * RIVAL.WAR_STEP);
  s.prices.low = 1;                            // stop the price war
  rivalsMonth(s, createRng(5));
  near(h.rival.price, 0.8 - 2 * RIVAL.WAR_STEP + RIVAL.WAR_RECOVER);
});

test('old saves (version 1.0) load with the new fields', async () => {
  const { serialize, readSave } = await import('../js/save/save.js');
  const s = game();
  delete s.offices;
  delete s.campaigns;
  delete s.govtSale;
  for (const sec of s.sectors) { delete sec.growth; delete sec.repairTechs; }
  const text = JSON.stringify(serialize(s, { playTimeSec: 0 }));
  const res = readSave('x', { getItem: () => text });
  assert.ok(res.ok, res.reason);
  assert.equal(res.state.offices.manager.hired, false);
  assert.deepEqual(res.state.campaigns, []);
  assert.equal(res.state.govtSale.share, 0);
  assert.equal(res.state.sectors[0].growth.low, 1);
});
