// A slider with big − / + buttons for small steps, and an optional lock button.
// set() does not move the handle while the player drags it.

import { h } from './dom.js';
import { T } from '../data/text.js';

let count = 0;

export function createSlider({ label, min, max, step, onChange, lockable = false, onLock }) {
  const value = h('span', { class: 'sl-value' });
  const extra = h('span', { class: 'sl-extra dim' });
  const id = `sl-${++count}`;
  const input = h('input', {
    type: 'range', id, min, max, step,
    oninput: () => { current = Number(input.value); onChange(current); },
  });
  // The panel updates a little later, so fast taps count from the last value we sent.
  let current = Number(min);
  const nudge = (dir) => {
    current = Math.min(Number(max), Math.max(Number(min), +(current + dir * Number(step)).toFixed(4)));
    onChange(current);
  };
  const minus = h('button', { class: 'btn sl-step', 'aria-label': T.less(label), onclick: () => nudge(-1) }, '−');
  const plus = h('button', { class: 'btn sl-step', 'aria-label': T.more(label), onclick: () => nudge(1) }, '+');
  const lock = lockable
    ? h('button', { class: 'btn sl-lock', 'aria-pressed': 'false', onclick: () => onLock(lock.getAttribute('aria-pressed') !== 'true') }, '🔓')
    : null;
  const note = h('div', { class: 'sl-note dim small' });
  const effect = h('div', { class: 'sl-effect small', hidden: true });   // version 1.2: what the slider does now

  const el = h('div', { class: 'slider' },
    h('div', { class: 'sl-head' }, h('label', { for: id }, label), value, extra, lock),
    h('div', { class: 'sl-row' }, minus, input, plus),
    effect,
    note,
  );

  return {
    el,
    set(v, { text, extraText = '', disabled = false, locked = false, noteText = '', effectText = '', effectClass = '' } = {}) {
      effect.textContent = effectText;
      effect.hidden = !effectText;
      effect.className = `sl-effect small ${effectClass}`;
      current = v;
      if (document.activeElement !== input) input.value = String(v);
      value.textContent = text ?? String(v);
      extra.textContent = extraText;
      note.textContent = noteText;
      note.hidden = !noteText;
      input.disabled = disabled || locked;
      minus.disabled = disabled || locked;
      plus.disabled = disabled || locked;
      if (lock) {
        lock.setAttribute('aria-pressed', String(locked));
        lock.textContent = locked ? '🔒' : '🔓';
        lock.setAttribute('aria-label', locked ? T.unlockSlider(label) : T.lockSlider(label));
        lock.disabled = disabled;
      }
      el.classList.toggle('disabled', disabled);
    },
  };
}
