// Projects panel: field work (deployments and plant building), start a deployment, one-time techs.

import { h, fillKeyed } from '../dom.js';
import { T } from '../../data/text.js';
import { WORK } from '../../data/balance.js';
import { NODES, NODE_IDS } from '../../data/techTree.js';
import { dispatch } from '../../core/store.js';
import { STATUS } from '../../sim/effects.js';
import { fieldProjects, deployCost, deployWeeks, canDeploy } from '../../sim/deployment.js';
import { waitReason as reasonOf, deployCandidates } from '../../sim/offices.js';
import { rushCost, canRush } from '../../sim/staffing.js';
import { capexCost } from '../../sim/economy.js';
import { money } from '../format.js';

export function createProjectsPanel() {
  const crews = h('p', { class: 'small' });
  const pmNote = h('p', { class: 'dim small' }, T.pmPlans);
  const scheduleBtn = h('button', { class: 'btn btn-primary', title: T.scheduleAllHelp,
    onclick: () => dispatch({ type: 'projects/scheduleAll' }) }, T.scheduleAll);
  const list = h('div', { class: 'proj-list' });
  const deploy = h('div', { class: 'proj-list' });
  const oneTime = h('div', { class: 'proj-list' });
  const bars = new Map();

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' }, h('h3', {}, T.projectsTitle), crews,
      h('div', { class: 'actions' }, scheduleBtn), h('p', { class: 'dim small' }, T.scheduleAllHelp), pmNote, list),
    h('section', { class: 'card' }, h('h3', {}, T.deployTitle), deploy),
    h('section', { class: 'card one-time' }, h('h3', {}, T.activateTitle), oneTime),
  );

  const WAIT_TEXT = { repair: T.waitingRepair, crew: T.waitingCrew, cash: T.waitingCash, team: T.waitingCrew };
  const waitReason = (s, p) => WAIT_TEXT[reasonOf(s, p)];

  function projectName(s, p) {
    const sector = s.sectors[p.sector].name;
    if (p.kind === 'deploy') return `${NODES[p.node].name} · ${sector}`;
    if (p.kind === 'upgrade') return T.upgradeProject(T.buildings[p.type], sector, p.level);
    return T.buildingProject(T.buildings[p.type], sector);
  }

  function item(s, p) {
    const fill = h('span', { class: 'fill' });
    const text = h('span', { class: 'dim small' });
    bars.set(p.id, { fill, text });
    return h('div', { class: 'proj' },
      h('div', { class: 'proj-head' },
        h('strong', {}, projectName(s, p)),
        h('span', { class: `tag ${p.status}` }, p.status === 'active' ? T.crewWorking : waitReason(s, p))),
      h('span', { class: 'bar' }, fill),
      text,
      h('div', { class: 'proj-actions' },
        p.rushed ? h('span', { class: 'tag' }, T.rushed)
          : h('button', { class: 'btn', title: T.rushHelp, disabled: !canRush(s, p),
            onclick: () => dispatch({ type: 'project/rush', payload: { id: p.id } }) }, T.rush(money(rushCost(s, p)))),
        p.status === 'waiting' && p.kind === 'deploy'
          ? h('button', { class: 'btn btn-danger', onclick: () => dispatch({ type: 'deploy/cancel', payload: { id: p.id } }) }, T.cancel)
          : null));
  }

  function deployItem(s, id) {
    const owned = s.sectors.filter((x) => x.owned);
    const open = owned.filter((x) => canDeploy(s, id, x.id).ok);
    const activeCount = owned.filter((x) => x.tech[id] === STATUS.ACTIVE).length;
    return h('div', { class: 'proj' },
      h('div', { class: 'proj-head' }, h('strong', {}, NODES[id].name),
        h('span', { class: 'dim small' }, T.activeIn(activeCount, owned.length))),
      h('p', { class: 'small' }, NODES[id].text),
      h('p', { class: 'dim small' }, T.deployInfo(money(deployCost(s, id)), Math.ceil(deployWeeks(s, id)))),
      open.length
        ? h('div', { class: 'proj-actions wrap' }, open.map((sec) => h('button', {
          class: 'btn', onclick: () => dispatch({ type: 'deploy/start', payload: { node: id, sector: sec.id } }),
        }, T.deployIn(sec.name))))
        : h('p', { class: 'small good' }, T.deployDone));
  }

  function update(s) {
    const all = Math.floor(s.staff.technicians / WORK.CREW_SIZE);
    const field = fieldProjects(s);
    crews.textContent = T.crewsTitle(all, field.filter((p) => p.status === 'active').length);
    pmNote.hidden = !s.offices.manager.hired;
    scheduleBtn.disabled = deployCandidates(s).length === 0 && !(s.staff.engineers >= WORK.TEAM_SIZE);

    const key = field.map((p) => `${p.id}:${p.status}:${p.rushed}:${canRush(s, p)}:${p.status === 'waiting' ? waitReason(s, p) : ''}`).join('|') || 'none';
    fillKeyed(list, key, () => {
      bars.clear();
      return field.length ? field.map((p) => item(s, p)) : h('p', { class: 'dim small' }, T.noFieldProjects);
    });
    for (const p of field) {
      const b = bars.get(p.id);
      if (!b) continue;
      b.fill.style.width = `${(p.progress / p.total) * 100}%`;
      b.text.textContent = T.weeksProgress(p.progress, p.total);
    }

    const ready = NODE_IDS.filter((id) => NODES[id].deploy?.weeks
      && (s.tech.nodes[id].status === STATUS.UNLOCKED || s.tech.nodes[id].status === STATUS.ACTIVE));
    const dKey = ready.map((id) => `${id}:${s.sectors.filter((x) => x.owned && canDeploy(s, id, x.id).ok).map((x) => x.id).join('.')}`).join('|')
      + `|${s.sectors.filter((x) => x.owned).length}|${Math.round(s.meters.gs > 75)}`;
    fillKeyed(deploy, dKey || 'none', () => (ready.length ? ready.map((id) => deployItem(s, id)) : h('p', { class: 'dim small' }, T.deployNone)));

    const once = NODE_IDS.filter((id) => NODES[id].deploy?.oneTime && s.tech.nodes[id].status === STATUS.UNLOCKED);
    oneTime.closest('.one-time').hidden = once.length === 0;
    fillKeyed(oneTime, `${once.join(',')}|${s.company.cash >= 50_000}`, () => once.map((id) => {
      const cost = capexCost(s, NODES[id].deploy.oneTime);
      return h('div', { class: 'proj' }, h('strong', {}, NODES[id].name), h('p', { class: 'small' }, NODES[id].text),
        h('button', { class: 'btn btn-primary', disabled: s.company.cash < cost,
          onclick: () => dispatch({ type: 'tech/activate', payload: { node: id } }) }, T.activate(money(cost))));
    }));
  }

  return { id: 'projects', el, update };
}
