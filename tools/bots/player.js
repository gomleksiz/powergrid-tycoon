// A configurable bot that plays like a person: money, staff, research, field work,
// growth, buildings, storms and rivals. The 6 active bots are configs of this player.

import * as L from './lib.js';

export function makePlayer(cfg) {
  const c = {
    budgetPct: 20,
    split: { marketing: 20, rd: 20, maintenance: 20, lobbying: 20, pr: 20 },
    price: 1.0,
    research: [],
    deploy: [],
    teams: (m) => (m < 40 ? 1 : m < 100 ? 2 : 3),
    crews: (m, n) => Math.min(4, 1 + Math.floor(n / 3)),
    pr: (m) => (m < 60 ? 1 : 2),
    expand: true,
    fight: {},
    rush: false,
    builds: () => {},
    path: null,
    power: true,           // version 1.1: own peak power for the regional shortage
    event: () => 0,
    ...cfg,
  };

  return {
    name: c.name,
    setup() {
      L.setBudget(c.budgetPct, c.split);
      L.setPrices(c.price);
      if (c.path) L.act('goals/target', c.path);
      L.act('staff/repairFirst', true);
    },
    month() {
      const s = L.S();
      const m = s.time.month;
      L.manageLoans();
      L.staffPlan({ teams: c.teams(m), crews: c.crews(m, L.owned().length), pr: c.pr(m), backlogCrew: c.backlogCrew ?? true });
      L.research(L.nextOpen(c.research), { teams: 3 });
      L.deployAll(c.deploy);
      L.activateOneTime();
      if (c.expand) L.expand();
      L.substations();
      c.builds(m);
      if (c.power) L.ownPower();
      c.extra?.(m);
      if (c.fight) L.fightRivals(c.fight);
      if (c.campaign) L.campaign(c.campaign);
      if (c.rush) for (const p of s.projects) if (!p.rushed && p.status === 'active' && L.canSpend(50_000, 3)) L.act('project/rush', { id: p.id });
      L.repairPriority();
      if (m % 12 === 0) L.setPrices(c.price);
    },
    week() {
      L.stormPrep();
    },
    event: c.event,
  };
}
