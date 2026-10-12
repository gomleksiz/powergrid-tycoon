// Research panel: the queue (up to 5) and the techs that are ready to research.

import { h, fillKeyed } from '../dom.js';
import { T } from '../../data/text.js';
import { WORK } from '../../data/balance.js';
import { NODES, NODE_IDS, BRANCHES } from '../../data/techTree.js';
import { dispatch } from '../../core/store.js';
import { STATUS } from '../../sim/effects.js';
import { needsLeap } from '../../sim/setup.js';
import { researchProjects, researchCost, rpPerTeamMonth, monthsLeft, canStartResearch } from '../../sim/research.js';
import { rushCost, canRush } from '../../sim/staffing.js';
import { money } from '../format.js';

export function createResearchPanel({ onOpenTree }) {
  const rpLine = h('p', { class: 'small' });
  const queueTitle = h('h3');
  const queue = h('div', { class: 'proj-list' });
  const available = h('div', { class: 'proj-list' });
  const bars = new Map();   // project id → { fill, text }

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' },
      h('button', { class: 'btn btn-primary wide', onclick: onOpenTree }, '🌳 ', T.openTree),
      rpLine),
    h('section', { class: 'card' }, queueTitle, queue),
    h('section', { class: 'card' }, h('h3', {}, T.availableTitle), available),
  );

  function queueItem(s, p, i, all) {
    const fill = h('span', { class: 'fill' });
    const text = h('span', { class: 'dim small' });
    bars.set(p.id, { fill, text });
    const node = NODES[p.node];
    return h('div', { class: 'proj' },
      h('div', { class: 'proj-head' },
        h('strong', {}, node.name),
        h('span', { class: `tag ${p.status}` }, p.status === 'active' ? T.working(p.teams) : T.waitingTeam)),
      h('span', { class: 'bar' }, fill),
      text,
      h('div', { class: 'proj-actions' },
        h('button', { class: 'btn', 'aria-label': T.lessTeams, disabled: p.teamsWanted <= 1,
          onclick: () => dispatch({ type: 'research/teams', payload: { id: p.id, teams: p.teamsWanted - 1 } }) }, '−'),
        h('span', { class: 'small' }, T.teams(p.teamsWanted)),
        h('button', { class: 'btn', 'aria-label': T.moreTeams, disabled: p.teamsWanted >= WORK.MAX_TEAMS_PER_PROJECT,
          onclick: () => dispatch({ type: 'research/teams', payload: { id: p.id, teams: p.teamsWanted + 1 } }) }, '+'),
        h('button', { class: 'btn', 'aria-label': T.moveUp, disabled: i === 0,
          onclick: () => dispatch({ type: 'research/move', payload: { id: p.id, dir: -1 } }) }, '▲'),
        h('button', { class: 'btn', 'aria-label': T.moveDown, disabled: i === all - 1,
          onclick: () => dispatch({ type: 'research/move', payload: { id: p.id, dir: 1 } }) }, '▼'),
        p.rushed ? h('span', { class: 'tag' }, T.rushed)
          : h('button', { class: 'btn', title: T.rushHelp, disabled: !canRush(s, p),
            onclick: () => dispatch({ type: 'project/rush', payload: { id: p.id } }) }, T.rush(money(rushCost(s, p)))),
        h('button', { class: 'btn btn-danger', onclick: () => dispatch({ type: 'research/cancel', payload: { id: p.id } }) }, T.cancel)));
  }

  function availableItem(s, id) {
    const node = NODES[id];
    const leap = needsLeap(s.tech.nodes, id);
    const cost = researchCost(id, leap);
    const months = Math.max(1, Math.round(cost / rpPerTeamMonth(s)));
    const check = canStartResearch(s, id, leap);
    return h('div', { class: 'proj' },
      h('div', { class: 'proj-head' },
        h('strong', {}, node.name),
        h('span', { class: 'dim small' }, `${T.tierLabel(node.tier)} · ${T.rpCost(cost)}`)),
      h('p', { class: 'small' }, node.text),
      leap ? h('p', { class: 'small warn' }, T.leapHelp(cost), node.leapShock ? ` ${T.leapShockHelp}` : '') : null,
      h('div', { class: 'proj-actions' },
        h('span', { class: 'dim small grow' }, T.timeWith(months, 1)),
        h('button', {
          class: 'btn btn-primary', disabled: !check.ok,
          title: check.ok ? '' : T.researchReasons[check.reason] ?? '',
          onclick: () => dispatch({ type: 'research/start', payload: { node: id, teams: 1, leap } }),
        }, leap ? T.leapfrog : T.startResearch)));
  }

  function update(s) {
    rpLine.textContent = T.rpLine(Math.round(rpPerTeamMonth(s)));
    const list = researchProjects(s);
    queueTitle.textContent = T.queueTitle(list.length, WORK.QUEUE_MAX);
    const qKey = list.map((p) => `${p.id}:${p.teams}:${p.teamsWanted}:${p.status}:${p.rushed}:${canRush(s, p)}`).join('|') || 'empty';
    fillKeyed(queue, qKey, () => {
      bars.clear();
      return list.length ? list.map((p, i) => queueItem(s, p, i, list.length)) : h('p', { class: 'dim small' }, T.queueEmpty);
    });
    for (const p of list) {
      const b = bars.get(p.id);
      if (!b) continue;
      const rp = s.tech.nodes[p.node].rp;
      b.fill.style.width = `${(rp / p.total) * 100}%`;
      b.text.textContent = `${Math.floor(rp)} / ${p.total} RP · ${T.monthsLeft(monthsLeft(s, p))}`;
    }

    const ids = BRANCHES.flatMap((br) => NODE_IDS.filter((id) => NODES[id].branch === br.id && s.tech.nodes[id].status === STATUS.AVAILABLE));
    const aKey = `${ids.join(',')}|${list.length}|${Math.round(rpPerTeamMonth(s))}`;
    fillKeyed(available, aKey, () => (ids.length ? ids.map((id) => availableItem(s, id)) : h('p', { class: 'dim small' }, T.noneAvailable)));
  }

  return { id: 'research', el, update };
}
