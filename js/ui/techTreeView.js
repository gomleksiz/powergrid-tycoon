// The tech tree as a full-screen layer (design section 15).
// PC and tablet: the full graph. Branches are rows, tiers are columns, lines show prerequisites.
// Phone: 1 branch at a time as a list. Each status has a color and an icon.

import { h, fill, fillKeyed } from './dom.js';
import { T } from '../data/text.js';
import { NODES, NODE_IDS, BRANCHES, LEAP } from '../data/techTree.js';
import { getState, dispatch, subscribe } from '../core/store.js';
import { STATUS } from '../sim/effects.js';
import { needsLeap } from '../sim/setup.js';
import { researchCost, canStartResearch } from '../sim/research.js';
import { capexCost } from '../sim/economy.js';
import { money } from './format.js';

const COL_W = 210;
const NODE_W = 180;
const NODE_H = 64;
const ROW_GAP = 18;
const PHONE = '(max-width: 599px)';

function layout() {
  const pos = {};
  let y = 0;
  const rows = [];
  for (const br of BRANCHES) {
    const ids = NODE_IDS.filter((id) => NODES[id].branch === br.id);
    const perTier = {};
    for (const id of ids) {
      const t = NODES[id].tier;
      perTier[t] = (perTier[t] ?? 0) + 1;
      pos[id] = { x: t * COL_W + 8, y: y + (perTier[t] - 1) * (NODE_H + 8) + 26 };
    }
    const height = Math.max(...Object.values(perTier)) * (NODE_H + 8) + 26 + ROW_GAP;
    rows.push({ br, y, height });
    y += height;
  }
  return { pos, rows, width: 5 * COL_W, height: y };
}

function statusClass(st) {
  return { LOCKED: 'locked', AVAILABLE: 'available', RESEARCHING: 'researching', UNLOCKED: 'done', ACTIVE: 'done' }[st];
}

function deployText(id) {
  const d = NODES[id].deploy;
  if (d === null) return T.deployLine.none;
  if (d.build) return T.deployLine.build(T.buildings[d.build]);
  if (d.oneTime) return T.deployLine.oneTime(money(d.oneTime));
  return T.deployLine.sector(money(d.cost), d.weeks);
}

export function openTechTree() {
  const { pos, rows, width, height } = layout();
  let selected = null;
  let branch = BRANCHES[0].id;

  const graph = h('div', { class: 'tree-graph', style: `width:${width}px;height:${height}px` });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('class', 'tree-lines');
  svg.setAttribute('aria-hidden', 'true');
  graph.append(svg);

  for (const r of rows) {
    graph.append(h('div', { class: 'tree-row-label', style: `top:${r.y}px` }, r.br.name));
    graph.append(h('div', { class: 'tree-row-bg', style: `top:${r.y}px;height:${r.height - ROW_GAP / 2}px;width:${width}px` }));
  }

  // lines first, so the nodes are on top
  function line(a, b, dashed) {
    const p1 = pos[a];
    const p2 = pos[b];
    const x1 = p1.x + NODE_W;
    const y1 = p1.y + NODE_H / 2;
    const x2 = p2.x;
    const y2 = p2.y + NODE_H / 2;
    const path = document.createElementNS(svgNS, 'path');
    const mid = x2 > x1 ? (x1 + x2) / 2 : x1 + 10;
    path.setAttribute('d', `M${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`);
    path.setAttribute('class', dashed ? 'leap' : 'need');
    svg.append(path);
  }
  for (const id of NODE_IDS) {
    for (const n of NODES[id].needs) line(n, id, false);
    if (NODES[id].leapFrom) line(NODES[id].leapFrom, id, true);
  }

  const nodeEls = {};
  for (const id of NODE_IDS) {
    nodeEls[id] = h('button', {
      class: 'tree-node', style: `left:${pos[id].x}px;top:${pos[id].y}px;width:${NODE_W}px;height:${NODE_H}px`,
      onclick: () => { selected = id; render(); },
    });
    graph.append(nodeEls[id]);
  }

  const list = h('div', { class: 'tree-list' });
  const branchSelect = h('select', { class: 'branch-select', 'aria-label': T.branchPick, onchange: () => { branch = branchSelect.value; render(); } },
    BRANCHES.map((b) => h('option', { value: b.id }, b.name)));
  const detail = h('div', { class: 'tree-detail' });

  const dlg = h('dialog', { class: 'tree-dlg', 'aria-label': T.treeTitle },
    h('div', { class: 'tree-top' },
      h('h2', {}, T.treeTitle),
      h('div', { class: 'tree-legend small' },
        Object.entries(T.statusIcons).filter(([k]) => k !== 'ACTIVE').map(([k, icon]) =>
          h('span', { class: `legend ${statusClass(k)}` }, icon, ' ', T.statusNames[k]))),
      h('button', { class: 'btn', onclick: () => dlg.close(), 'aria-label': T.close }, '✕')),
    h('div', { class: 'tree-body' },
      h('div', { class: 'tree-scroll' }, graph),
      h('div', { class: 'tree-phone' }, branchSelect, list)),
    detail);

  function nodeLabel(s, id) {
    const st = s.tech.nodes[id].status;
    const leap = needsLeap(s.tech.nodes, id);
    return [
      h('span', { class: 'tn-icon', 'aria-hidden': 'true' }, T.statusIcons[st]),
      h('span', { class: 'tn-name' }, NODES[id].name),
      h('span', { class: 'tn-sub' }, NODES[id].tier === 0 ? T.tierLabel(0) : `${T.tierLabel(NODES[id].tier)} · ${T.rpCost(researchCost(id, leap))}${leap ? ' ⤴' : ''}`),
    ];
  }

  function renderDetail(s) {
    if (!selected) { fillKeyed(detail, 'none', () => h('p', { class: 'dim' }, T.pickNode)); return; }
    const id = selected;
    const node = NODES[id];
    const st = s.tech.nodes[id];
    const leap = needsLeap(s.tech.nodes, id);
    const check = canStartResearch(s, id, leap);
    const owned = s.sectors.filter((x) => x.owned);
    const activeN = owned.filter((x) => x.tech[id] === STATUS.ACTIVE).length;
    fillKeyed(detail, `${id}|${st.status}|${leap}|${check.ok}|${activeN}/${owned.length}|${s.company.cash >= capexCost(s, node.deploy?.oneTime ?? 0)}`, () => [
      h('div', { class: 'td-head' },
        h('strong', {}, `${T.statusIcons[st.status]} ${node.name}`),
        h('span', { class: `tag ${statusClass(st.status)}` }, T.statusNames[st.status])),
      h('p', {}, node.text),
      h('p', { class: 'dim small' }, node.needs.length ? T.needsLine(node.needs.map((n) => NODES[n].name).join(', ')) : T.needsNone),
      node.leapFrom ? h('p', { class: 'dim small' }, T.leapLine(NODES[node.leapFrom].name), ` (+${Math.round((LEAP.COST_MULT - 1) * 100)}% RP)`) : null,
      h('p', { class: 'dim small' }, deployText(id)),
      node.deploy?.weeks && (st.status === STATUS.UNLOCKED || st.status === STATUS.ACTIVE)
        ? h('p', { class: 'small' }, T.activeIn(owned.filter((x) => x.tech[id] === STATUS.ACTIVE).length, owned.length)) : null,
      st.status === STATUS.AVAILABLE
        ? h('div', { class: 'actions' }, h('button', {
          class: 'btn btn-primary', disabled: !check.ok,
          onclick: () => dispatch({ type: 'research/start', payload: { node: id, teams: 1, leap } }),
        }, leap ? `${T.leapfrog} (${T.rpCost(researchCost(id, true))})` : `${T.startResearch} (${T.rpCost(researchCost(id))})`),
        !check.ok ? h('span', { class: 'small warn' }, T.researchReasons[check.reason] ?? '') : null)
        : null,
      node.deploy?.oneTime && st.status === STATUS.UNLOCKED
        ? h('button', { class: 'btn btn-primary', onclick: () => dispatch({ type: 'tech/activate', payload: { node: id } }) },
          T.activate(money(capexCost(s, node.deploy.oneTime))))
        : null]);
  }

  function render() {
    const s = getState();
    if (!s) return;
    for (const id of NODE_IDS) {
      const st = s.tech.nodes[id].status;
      nodeEls[id].className = `tree-node ${statusClass(st)}${selected === id ? ' sel' : ''}`;
      nodeEls[id].setAttribute('aria-label', `${NODES[id].name}: ${T.statusNames[st]}`);
      fill(nodeEls[id], nodeLabel(s, id));
    }
    branchSelect.value = branch;
    fill(list, NODE_IDS.filter((id) => NODES[id].branch === branch)
      .sort((a, b) => NODES[a].tier - NODES[b].tier)
      .map((id) => h('button', {
        class: `tree-node list ${statusClass(s.tech.nodes[id].status)}${selected === id ? ' sel' : ''}`,
        onclick: () => { selected = id; render(); },
      }, nodeLabel(s, id))));
    renderDetail(s);
  }

  const unsub = subscribe(() => { if (dlg.open) render(); });
  dlg.addEventListener('close', () => { unsub(); dlg.remove(); });
  document.body.append(dlg);
  render();
  dlg.showModal();
  dlg.classList.toggle('phone', window.matchMedia(PHONE).matches);
  return dlg;
}
