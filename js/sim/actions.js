// Every action the UI (or a bot) can dispatch. handler(state, payload) → events[].
// Handlers check the rules themselves, so a bad action does nothing.

import { weekTick } from './tick.js';
import { withStateRng } from '../core/rng.js';
import { UI, PRICE, BUDGET, TIER_IDS, METERS, REPAIR, TUTORIAL, REGION } from '../data/balance.js';
import { NODES } from '../data/techTree.js';
import { refreshAvailable } from './setup.js';
import { setSplit } from './budget.js';
import { takeLoan, repayLoan } from './economy.js';
import { isTierUnlocked } from './effects.js';
import { placeBuilding, upgradeBuilding, buildInSector } from './build.js';
import { hireOffice, closeOffice, scheduleAll } from './offices.js';
import { startCampaign, stopCampaign } from './marketing.js';
import { startResearch, cancelResearch, clampTeams, scheduleResearch } from './research.js';
import { startDeploy, cancelField, activateOneTime } from './deployment.js';
import { hire, fire, setWage, rush } from './staffing.js';
import { openSector } from './growth.js';
import { stormPrep } from './disasters.js';
import { callContractors, repairBuilding, assignTechnicians } from './repair.js';
import { chooseEvent } from './eventCards.js';
import { setFranchise, monopolyCharter, buyout, setDiscount } from './rivals.js';
import { VICTORY } from '../data/advisorRules.js';
import { debugSetup } from './debugSetups.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const roundStep = (v, step) => Math.round(v / step) * step;

export function maxPrice(state) {
  return state.meters.gs < METERS.LOW ? PRICE.LOW_GS_MAX : PRICE.MAX;
}

export const ACTIONS = {
  'time/week': (state) => (state.goals.ended ? [] : withStateRng(state, (rng) => weekTick(state, rng))),

  'company/rename': (state, name) => {
    state.company.name = String(name).slice(0, UI.COMPANY_NAME_MAX);
  },

  'tutorial/skip': (state) => {
    state.tutorial.enabled = false;
  },
  'tutorial/next': (state) => {
    if (!state.tutorial.enabled) return;
    state.tutorial.step += 1;
    if (state.tutorial.step >= TUTORIAL.STEPS) state.tutorial.enabled = false;
  },

  'price/set': (state, { tier, value }) => {
    if (!TIER_IDS.includes(tier) || !isTierUnlocked(state, tier)) return;
    state.prices[tier] = +clamp(roundStep(value, PRICE.STEP), PRICE.MIN, maxPrice(state)).toFixed(2);
  },

  'budget/total': (state, value) => {
    state.budget.totalPct = Math.round(clamp(value, BUDGET.MIN_PCT, BUDGET.MAX_PCT));
  },

  'budget/split': (state, { key, value }) => {
    if (!BUDGET.KEYS.includes(key) || state.budget.locks[key]) return;
    state.budget.split = setSplit(state.budget.split, state.budget.locks, key, value);
  },

  'budget/lock': (state, { key, locked }) => {
    if (BUDGET.KEYS.includes(key)) state.budget.locks[key] = !!locked;
  },

  'loan/take': (state) => {
    takeLoan(state);
  },

  'loan/repay': (state) => {
    repayLoan(state);
  },

  'build/place': (state, { type, x, y }) => placeBuilding(state, type, x, y),
  'build/sector': (state, { type, sector }) => buildInSector(state, type, sector),   // version 1.2: no tile to pick
  'policy/autoPrep': (state, on) => { state.policy.autoPrep = !!on; },
  'building/upgrade': (state, { id }) => upgradeBuilding(state, id),

  // Version 1.1: offices, "Schedule all", campaigns and selling power to the government.
  'office/hire': (state, id) => (hireOffice(state, id) ? [{ type: 'news', payload: { key: 'officeHired', office: id } }] : []),
  'office/close': (state, id) => { closeOffice(state, id); },
  'manager/auto': (state, { key, on }) => {
    if (key === 'autoResearch' || key === 'autoDeploy') state.offices.manager[key] = !!on;
  },
  'projects/scheduleAll': (state) => [{ type: 'news', payload: { key: 'scheduledAll', count: scheduleAll(state) } }],
  'campaign/start': (state, opts) => (startCampaign(state, opts)
    ? [{ type: 'news', payload: { key: 'campaignStart', cut: Math.round(opts.cut * 100), months: opts.months } }] : []),
  'campaign/stop': (state, { id }) => { stopCampaign(state, id); },
  'govt/share': (state, value) => {
    state.govtSale.share = +clamp(roundStep(Number(value) || 0, REGION.SHARE_STEP), 0, 1).toFixed(2);
  },

  'sector/open': (state, { sector }) => {
    if (openSector(state, sector)) return [{ type: 'news', payload: { key: 'sectorOpened', sector: state.sectors[sector].name } }];
    return [];
  },

  'disaster/prep': (state, { sector }) => { stormPrep(state, sector); },
  // Version 1.2: emergency crews and repairs of broken buildings.
  'sector/contractors': (state, { sector }) => (callContractors(state, sector)
    ? [{ type: 'news', payload: { key: 'contractors', sector: state.sectors[sector].name } }] : []),
  'building/repair': (state, { id }) => { repairBuilding(state, id); },
  'sector/assign': (state, { sector, count }) => { assignTechnicians(state, sector, count); },
  'event/choose': (state, { choice }) => { withStateRng(state, (rng) => chooseEvent(state, choice, rng)); },

  'rival/franchise': (state, { sector, on }) => { setFranchise(state, sector, on); },
  'rival/monopoly': (state) => (monopolyCharter(state) ? [{ type: 'news', payload: { key: 'monopoly', kind: 'warn' } }] : []),
  'rival/buyout': (state, { sector }) => {
    const name = state.sectors[sector]?.name;
    return buyout(state, sector) ? [{ type: 'news', payload: { key: 'buyout', sector: name } }] : [];
  },
  'sector/discount': (state, { sector, discount }) => { setDiscount(state, sector, discount); },

  'goals/target': (state, path) => {
    state.goals.target = VICTORY.PATHS.includes(path) ? path : null;
  },
  'budget/setAll': (state, split) => {
    if (BUDGET.KEYS.reduce((n, k) => n + (split[k] ?? 0), 0) !== 100) return;
    state.budget.split = Object.fromEntries(BUDGET.KEYS.map((k) => [k, split[k]]));
    state.budget.locks = Object.fromEntries(BUDGET.KEYS.map((k) => [k, false]));
  },
  'prices/down': (state, step) => {
    for (const t of TIER_IDS) state.prices[t] = +Math.max(PRICE.MIN, state.prices[t] - step).toFixed(2);
  },
  'debug/setup': (state, name) => { debugSetup(state, name); },

  'sector/priority': (state, { sector, priority }) => {
    const s = state.sectors[sector];
    if (s && REPAIR.PRIORITIES.includes(priority)) s.priority = priority;
  },

  'staff/repairFirst': (state, on) => {
    state.staff.repairFirst = !!on;
  },

  'staff/hire': (state, { role, count }) => { hire(state, role, count); },
  'staff/fire': (state, { role, count }) => { fire(state, role, count); },
  'staff/wage': (state, v) => { setWage(state, v); },

  'research/start': (state, { node, teams = 1, leap = false }) => { startResearch(state, node, teams, leap); },
  'research/cancel': (state, { id }) => { cancelResearch(state, id); },
  'research/teams': (state, { id, teams }) => {
    const p = state.projects.find((x) => x.id === id && x.kind === 'research');
    if (p) { p.teamsWanted = clampTeams(teams); scheduleResearch(state); }
  },
  'research/move': (state, { id, dir }) => {
    const list = state.projects;
    const i = list.findIndex((x) => x.id === id);
    let j = i + dir;
    while (j >= 0 && j < list.length && list[j].kind !== list[i]?.kind) j += dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    scheduleResearch(state);
  },
  'deploy/start': (state, { node, sector }) => { startDeploy(state, node, sector); },
  'deploy/cancel': (state, { id }) => { cancelField(state, id); },
  'tech/activate': (state, { node }) => { activateOneTime(state, node); },
  'project/rush': (state, { id }) => { rush(state, id); },

  // Debug only (the UI sends it with ?debug=1).
  'debug/damage': (state, { sector, amount }) => {
    const s = state.sectors[sector];
    if (s?.owned) s.damage = Math.min(100, s.damage + amount);
  },
  'debug/unlock': (state, { node }) => {
    const n = state.tech.nodes[node];
    if (!n) return;
    n.status = NODES[node].deploy === null ? 'ACTIVE' : 'UNLOCKED';
    refreshAvailable(state.tech.nodes);
  },
  'debug/cash': (state, amount) => { state.company.cash += amount; },
  'debug/meter': (state, { key, value }) => {
    if (key in state.meters) state.meters[key] = Math.max(0, Math.min(100, value));
  },
  'debug/disaster': (state, { type, sector }) => {
    // Strike next week in the given sector.
    const base = type === 'heatwave' ? 0 : 40;
    const next = state.time.week + 1 > 4 ? { month: state.time.month + 1, week: 1 } : { month: state.time.month, week: state.time.week + 1 };
    state.disasters.scheduled.push({ id: state.nextId++, type, ...next, hits: [{ sector, base }], warned: false });
  },
  'debug/event': (state, id) => { state.events.pending = { id, month: state.time.month }; return [{ type: 'event:card', payload: { id } }]; },
  'debug/month': (state, month) => {
    state.time.month = Math.max(1, Math.min(240, Math.round(month)));
    state.time.week = 1;
  },
};
