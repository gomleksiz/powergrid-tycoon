// Goals panel: the 3 victory paths (with the weakest condition), dangers and the Advisor.

import { h, fillKeyed } from '../dom.js';
import { T } from '../../data/text.js';
import { VICTORY } from '../../data/advisorRules.js';
import { diff } from '../../data/difficulty.js';
import { dispatch } from '../../core/store.js';
import { pathProgress, lossWarnings } from '../../sim/victory.js';
import { advisorOn, advisorTips, suggestedBudget } from '../../sim/advisor.js';
import { money, pct } from '../format.js';

function condValue(c) {
  if (c.key === 'cash') return `${money(c.value)} / ${money(c.target)}`;
  if (['share', 'fusion', 'prosumers'].includes(c.key)) return `${pct(c.value)} / ${pct(c.target)}`;
  return `${Math.round(c.value)} / ${c.target}`;
}

export function createGoalsPanel() {
  const paths = h('div', { class: 'proj-list' });
  const dangers = h('div');
  const advisor = h('div');

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' }, h('h3', {}, T.goalsTitle), h('p', { class: 'dim small' }, T.goalsHelp), paths),
    h('section', { class: 'card' }, h('h3', {}, T.lossTitle), dangers),
    h('section', { class: 'card' }, h('h3', {}, T.advisorTitle), advisor),
  );

  function pathItem(s, path) {
    const p = pathProgress(s, path);
    const mine = s.goals.target === path;
    return h('div', { class: `proj ${mine ? 'mine' : ''}` },
      h('div', { class: 'proj-head' }, h('strong', {}, T.pathNames[path]),
        mine ? h('span', { class: 'tag active' }, T.pathFollowing)
          : h('button', { class: 'btn', onclick: () => dispatch({ type: 'goals/target', payload: path }) }, T.pathFollow)),
      h('span', { class: 'bar big' }, h('span', { class: `fill ${p.ok ? 'good' : 'warn'}`, style: `width:${p.weakest.progress * 100}%` })),
      h('p', { class: 'small' }, T.weakest(T.condNames[p.weakest.key])),
      h('ul', { class: 'plain small' }, p.list.map((c) => h('li', { class: c.ok ? 'good' : '' }, `${c.ok ? '✓' : '○'} ${T.condNames[c.key]}: ${condValue(c)}`))),
      p.hold > 0 ? h('p', { class: 'small good' }, T.pathHold(p.hold)) : null);
  }

  function update(s) {
    const key = VICTORY.PATHS.map((p) => {
      const pr = pathProgress(s, p);
      return `${p}:${pr.list.map((c) => (c.progress * 100).toFixed(0)).join('.')}:${pr.hold}`;
    }).join('|') + `|${s.goals.target}`;
    fillKeyed(paths, key, () => VICTORY.PATHS.map((p) => pathItem(s, p)));

    const warns = lossWarnings(s);
    fillKeyed(dangers, warns.map((w) => `${w.key}${w.left}`).join(',') || 'none', () => [
      warns.length ? warns.map((w) => h('p', { class: 'small bad' }, '⚠ ', T.lossBanner[w.key](w.left))) : h('p', { class: 'small good' }, T.lossNone),
      h('p', { class: 'dim small' }, T.lossRules(diff(s).bankruptMonths)),
    ]);

    if (!advisorOn(s)) {
      fillKeyed(advisor, 'off', () => h('p', { class: 'dim small' }, T.advisorOff));
      return;
    }
    const tips = advisorTips(s);
    const tKey = tips.map((t) => `${t.id}:${JSON.stringify(t.details)}:${!!t.action}`).join('|') + `|${s.goals.target}`;
    fillKeyed(advisor, tKey, () => [
      tips.length ? h('div', { class: 'proj-list' }, tips.map((t) => h('div', { class: 'proj tip' },
        h('p', { class: 'small' }, '💡 ', T.tips[t.id](t.details)),
        t.action ? h('button', { class: 'btn btn-primary', onclick: () => dispatch(t.action) }, T.apply) : null)))
        : h('p', { class: 'small good' }, T.advisorNone),
      h('button', { class: 'btn wide', style: 'margin-top:8px', onclick: () => dispatch({ type: 'budget/setAll', payload: suggestedBudget(s) }) }, T.applyBudget),
      h('p', { class: 'dim small' }, T.applyBudgetHelp(s.goals.target ? T.pathNames[s.goals.target] : T.noPath)),
    ]);
  }

  return { id: 'goals', el, update };
}
