// The tutorial: 8 steps from design section 15. The game pauses until the player does each step.
// Some steps let time run (they wait for the month 3 line break or a monthly report).

import { h, fill } from './dom.js';
import { T } from '../data/text.js';
import { getState, dispatch, subscribe } from '../core/store.js';
import { on } from '../core/bus.js';
import { readButton } from './readAloud.js';

// wait: 'next' = a Next button; a function = the action that finishes the step.
const STEPS = [
  { id: 'topbar', wait: 'next', target: '#topbar' },
  { id: 'budget', tab: 'budget', target: '#pane-budget .card', wait: (a) => a.type === 'budget/split' || a.type === 'budget/total' },
  { id: 'price', tab: 'budget', target: '#pane-budget .card:nth-child(2)', wait: (a) => a.type === 'price/set' && a.payload?.tier === 'low' },
  { id: 'research', tab: 'research', target: '#pane-research', wait: (a) => a.type === 'research/start' && a.payload?.node === 'P2' },
  { id: 'repair', tab: 'sector', target: '.grid-card', runUntil: 'break', wait: (a) => a.type === 'sector/priority' },
  { id: 'hire', tab: 'staff', target: '#pane-staff .role-card:nth-of-type(2)', wait: (a) => a.type === 'staff/hire' && a.payload?.role === 'technicians' },
  { id: 'report', runUntil: 'report', wait: 'next', target: '.report-card' },
  { id: 'save', target: '#topbar .btn', waitEvent: 'game:saved' },
];

export function mountTutorial(area, { loop, showTab }) {
  const box = h('section', { class: 'tutorial', hidden: true, 'aria-live': 'polite' });
  area.append(box);
  let shown = -1;
  let waitingFor = null;     // 'break' | 'report' | null
  let marked = null;

  const t = () => getState()?.tutorial;
  const active = () => !!t()?.enabled && t().step < STEPS.length;
  const step = () => STEPS[t().step];
  const needsPause = () => active() && !waitingFor;

  function mark(sel) {
    marked?.classList.remove('tut-target');
    marked = sel ? document.querySelector(sel) : null;
    marked?.classList.add('tut-target');
  }

  function render() {
    if (!active()) { box.hidden = true; mark(null); shown = -1; return; }
    const i = t().step;
    const st = STEPS[i];
    if (shown !== i) {
      shown = i;
      waitingFor = st.runUntil ?? null;
      if (st.runUntil === 'break' && t().breakDone) waitingFor = null;
      if (st.tab) showTab(st.tab);
      if (needsPause()) loop.setSpeed(0);
    }
    const text = waitingFor ? T.tutorial[st.id].before : T.tutorial[st.id].text;
    fill(box,
      h('div', { class: 'tut-head' },
        h('strong', {}, T.tutorialStep(i + 1, STEPS.length)),
        readButton(() => text)),
      h('p', {}, text),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => dispatch({ type: 'tutorial/skip' }) }, T.skipTutorial),
        st.wait === 'next' && !waitingFor ? h('button', { class: 'btn btn-primary', onclick: () => dispatch({ type: 'tutorial/next' }) }, T.next) : null));
    box.hidden = false;
    requestAnimationFrame(() => mark(waitingFor === 'report' ? null : st.target));
  }

  // Finish a step when the player does the action.
  subscribe((state, action) => {
    if (active() && action) {
      const st = step();
      if (typeof st.wait === 'function' && !waitingFor && st.wait(action)) dispatch({ type: 'tutorial/next' });
    }
    if (action?.type !== 'time/week') render();
  });

  on('tutorial:break', () => {
    if (active() && step().runUntil === 'break') { waitingFor = null; loop.setSpeed(0); render(); }
  });
  on('month:end', () => {
    if (active() && step().runUntil === 'report' && waitingFor) {
      waitingFor = null;
      loop.setSpeed(0);
      render();
    }
  });
  on('game:saved', () => { if (active() && step().waitEvent === 'game:saved') dispatch({ type: 'tutorial/next' }); });

  // While a step waits for the player, the clock does not run.
  on('speed:change', (speed) => { if (speed > 0 && needsPause()) { loop.setSpeed(0); box.classList.remove('nudge'); void box.offsetWidth; box.classList.add('nudge'); } });
  on('game:start', () => { shown = -1; render(); });
  on('game:quit', () => { box.hidden = true; mark(null); });
  return { render };
}
