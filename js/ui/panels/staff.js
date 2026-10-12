// Staff panel: hire and fire, efficiency, wages, "Repair first".

import { h } from '../dom.js';
import { createSlider } from '../slider.js';
import { confirmDialog } from '../dialog.js';
import { T } from '../../data/text.js';
import { STAFF, WORK } from '../../data/balance.js';
import { dispatch } from '../../core/store.js';
import { totalStaff, managementThreshold, companyEfficiency, isStriking } from '../../sim/workforce.js';
import { hireCost, fireCost, pendingHires, crunchCount } from '../../sim/staffing.js';
import { busyTechnicians, repairTechnicians } from '../../sim/repair.js';
import { researchProjects } from '../../sim/research.js';
import { money, pct } from '../format.js';

const GROUP = { engineers: WORK.TEAM_SIZE, technicians: WORK.CREW_SIZE, pr: 1 };
const WARN_AT = 0.9;   // the bar turns yellow at 90 % of M

export function createStaffPanel() {
  const effText = h('p', { class: 'small' });
  const effFill = h('span', { class: 'fill' });
  const effBar = h('span', { class: 'bar big', role: 'meter', 'aria-label': T.efficiencyTitle }, effFill);
  const notes = h('div');

  const roles = {};
  for (const role of STAFF.ROLES) {
    const count = h('strong', { class: 'role-count' });
    const info = h('p', { class: 'dim small' });
    const work = h('p', { class: 'small' });
    const hire1 = h('button', { class: 'btn', onclick: () => doHire(role, 1) }, T.hire(1));
    const hireN = GROUP[role] > 1 ? h('button', { class: 'btn', onclick: () => doHire(role, GROUP[role]) }, T.hire(GROUP[role])) : null;
    const fire1 = h('button', { class: 'btn btn-danger', onclick: () => doFire(role, 1) }, T.fire(1));
    roles[role] = { count, info, work, hire1, hireN, fire1,
      el: h('section', { class: 'card role-card' },
        h('div', { class: 'role-head' }, h('h3', {}, T.roles[role]), count),
        h('p', { class: 'small' }, T.roleJob[role]),
        info, work,
        h('div', { class: 'actions' }, hire1, hireN, fire1)) };
  }

  const wage = createSlider({
    label: T.wageSlider, min: STAFF.WAGE_MIN, max: STAFF.WAGE_MAX, step: STAFF.WAGE_STEP,
    onChange: (v) => dispatch({ type: 'staff/wage', payload: v }),
  });
  const repairFirst = h('input', { type: 'checkbox', onchange: () => dispatch({ type: 'staff/repairFirst', payload: repairFirst.checked }) });

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' },
      h('h3', {}, T.efficiencyTitle), effText, effBar,
      h('p', { class: 'dim small' }, T.efficiencyHelp), notes),
    STAFF.ROLES.map((r) => roles[r].el),
    h('section', { class: 'card' },
      wage.el,
      h('p', { class: 'dim small' }, T.wageHelp),
      h('label', { class: 'check' }, repairFirst, T.repairFirst),
      h('p', { class: 'dim small' }, T.repairFirstHelp),
      h('p', { class: 'dim small' }, T.fireWarn)),
  );

  function doHire(role, n) {
    dispatch({ type: 'staff/hire', payload: { role, count: n } });
  }

  async function doFire(role, n) {
    if (!(await confirmDialog(`${T.fire(n)} ${n === 1 ? T.roleOne[role] : T.roles[role].toLowerCase()}? ${T.fireWarn}`, { danger: true, yes: T.fire(n) }))) return;
    dispatch({ type: 'staff/fire', payload: { role, count: n } });
  }

  function update(s) {
    const S = totalStaff(s);
    const M = managementThreshold(s);
    const eff = companyEfficiency(s);
    effText.textContent = T.efficiencyLine(S, M, pct(eff));
    effFill.style.width = `${Math.min(100, (S / M) * 100)}%`;
    effFill.className = `fill ${S > M ? 'bad' : S >= M * WARN_AT ? 'warn' : 'good'}`;
    effBar.setAttribute('aria-valuenow', String(S));
    effBar.setAttribute('aria-valuemax', String(M));

    const nCrunch = crunchCount(s);
    notes.replaceChildren(...[
      nCrunch ? h('p', { class: 'small warn' }, T.crunchLine(nCrunch)) : null,
      isStriking(s) ? h('p', { class: 'small bad' }, T.strikeLine(s.staff.strikeMonths)) : null,
    ].filter(Boolean));

    const teams = Math.floor(s.staff.engineers / WORK.TEAM_SIZE);
    const busyTeams = researchProjects(s).reduce((n, p) => n + p.teams, 0);
    const deploying = busyTechnicians(s);
    const repairing = repairTechnicians(s);
    for (const role of STAFF.ROLES) {
      const r = roles[role];
      r.count.textContent = T.staffCount(s.staff[role], pendingHires(s, role));
      r.info.textContent = `${T.wageEach(money(STAFF.WAGE[role] * s.staff.wageMult))} · ${T.hireCostLine(money(hireCost(s, role, 1)))}`;
      r.work.textContent = role === 'engineers' ? T.teamsLine(busyTeams, teams)
        : role === 'technicians' ? T.crewsLine(deploying, repairing, Math.max(0, s.staff.technicians - deploying - repairing)) : '';
      r.hire1.disabled = s.company.cash < hireCost(s, role, 1);
      if (r.hireN) r.hireN.disabled = s.company.cash < hireCost(s, role, GROUP[role]);
      r.fire1.disabled = s.staff[role] < 1;
      r.fire1.title = money(fireCost(s, role, 1));
    }
    wage.set(s.staff.wageMult, { text: `${s.staff.wageMult.toFixed(2)}×` });
    repairFirst.checked = s.staff.repairFirst;
  }

  return { id: 'staff', el, update };
}

