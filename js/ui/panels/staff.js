// Staff panel: hire and fire, efficiency, wages, "Repair first".

import { h, fillKeyed } from '../dom.js';
import { createSlider } from '../slider.js';
import { confirmDialog } from '../dialog.js';
import { T } from '../../data/text.js';
import { STAFF, WORK } from '../../data/balance.js';
import { dispatch } from '../../core/store.js';
import { OFFICES, OFFICE_IDS } from '../../data/offices.js';
import { managerReport } from '../../sim/offices.js';
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

  // Offices (version 1.1): Project Manager and Marketing department.
  const offices = {};
  for (const id of OFFICE_IDS) {
    const status = h('p', { class: 'small' });
    const hireBtn = h('button', { class: 'btn btn-primary', onclick: () => dispatch({ type: 'office/hire', payload: id }) });
    const closeBtn = h('button', { class: 'btn btn-danger', onclick: () => closeOffice(id) }, T.officeClose);
    offices[id] = { status, hireBtn, closeBtn,
      el: h('div', { class: 'office' },
        h('h4', {}, T.officeNames[id]),
        h('p', { class: 'dim small' }, T.officeJob[id]),
        status,
        h('div', { class: 'actions' }, hireBtn, closeBtn)) };
  }
  const autoResearch = h('input', { type: 'checkbox', onchange: () => dispatch({ type: 'manager/auto', payload: { key: 'autoResearch', on: autoResearch.checked } }) });
  const autoDeploy = h('input', { type: 'checkbox', onchange: () => dispatch({ type: 'manager/auto', payload: { key: 'autoDeploy', on: autoDeploy.checked } }) });
  const pmOptions = h('div', {},
    h('label', { class: 'check' }, autoResearch, T.pmAutoResearch),
    h('label', { class: 'check' }, autoDeploy, T.pmAutoDeploy));
  offices.manager.el.insertBefore(pmOptions, offices.manager.el.lastChild);
  const pmReport = h('div', { class: 'pm-report' });

  async function closeOffice(id) {
    if (!(await confirmDialog(T.officeCloseConfirm(T.officeNames[id]), { danger: true, yes: T.officeClose }))) return;
    dispatch({ type: 'office/close', payload: id });
  }

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' },
      h('h3', {}, T.pmReportTitle), pmReport),
    h('section', { class: 'card offices' },
      h('h3', {}, T.officesTitle), OFFICE_IDS.map((id) => offices[id].el)),
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
    for (const id of OFFICE_IDS) {
      const o = offices[id];
      const hired = s.offices[id].hired;
      o.status.textContent = hired ? T.officeHired(money(OFFICES[id].wage)) : '';
      o.status.hidden = !hired;
      o.hireBtn.hidden = hired;
      o.hireBtn.textContent = T.officeHire(money(OFFICES[id].hireCost), money(OFFICES[id].wage));
      o.hireBtn.disabled = s.company.cash < OFFICES[id].hireCost;
      o.closeBtn.hidden = !hired;
    }
    pmOptions.hidden = !s.offices.manager.hired;
    autoResearch.checked = s.offices.manager.autoResearch;
    autoDeploy.checked = s.offices.manager.autoDeploy;

    const items = managerReport(s);
    const key = items.map((x) => `${x.id}:${x.role ?? ''}:${x.count ?? ''}:${x.weeks}:${x.reason ?? ''}:${x.project ? T.projectLabel(x.project) : ''}`).join('|') + `|${s.offices.manager.hired}`;
    fillKeyed(pmReport, key, () => [
      items.length
        ? h('ul', { class: 'plain' }, items.map((x) => h('li', { class: `small ${x.weeks >= 4 ? 'warn' : ''}` },
          x.id === 'idle' ? T.pmIdleLine(x.role, x.count, x.weeks) : T.pmStuckLine(T.projectLabel(x.project), x.reason, x.weeks))))
        : h('p', { class: 'small good' }, T.pmAllGood),
      s.offices.manager.hired ? null : h('p', { class: 'dim small' }, T.pmHireHint),
    ]);

    wage.set(s.staff.wageMult, { text: `${s.staff.wageMult.toFixed(2)}×` });
    repairFirst.checked = s.staff.repairFirst;
  }

  return { id: 'staff', el, update };
}

