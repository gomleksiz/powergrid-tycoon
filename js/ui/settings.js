// Settings dialog (design section 15). The settings belong to the device, not to a save.

import { h } from './dom.js';
import { openDialog } from './dialog.js';
import { createSlider } from './slider.js';
import { T } from '../data/text.js';
import { GAME_VERSION } from '../data/balance.js';
import { getState } from '../core/store.js';
import { on } from '../core/bus.js';
import { getPrefs, setPrefs } from './prefs.js';

const FONTS = ['atkinson', 'lexend', 'system'];
const TEXT = { MIN: 90, MAX: 150, STEP: 10 };

export function openSettings({ inGame = false } = {}) {
  const p = getPrefs();
  const storageLine = h('p', { class: 'dim small' });
  navigator.storage?.persisted?.().then((yes) => {
    storageLine.textContent = yes ? T.storagePersisted : T.storageNotPersisted;
  }).catch(() => {});

  const fontButtons = FONTS.map((f) => h('button', {
    class: `btn font-${f}`, 'aria-pressed': String(p.font === f),
    onclick: () => { setPrefs({ font: f }); fontButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(FONTS[i] === f))); },
  }, T.fontNames[f]));

  const size = createSlider({ label: T.textSize, min: TEXT.MIN, max: TEXT.MAX, step: TEXT.STEP, onChange: (v) => setPrefs({ textSize: clamp(v, TEXT.MIN, TEXT.MAX) }) });
  const music = createSlider({ label: T.musicVolume, min: 0, max: 100, step: 10, onChange: (v) => setPrefs({ music: clamp(v, 0, 100) }) });
  const effects = createSlider({ label: T.effectsVolume, min: 0, max: 100, step: 10, onChange: (v) => setPrefs({ effects: clamp(v, 0, 100) }) });

  const check = (key, label, help) => {
    const input = h('input', { type: 'checkbox', checked: !!p[key], onchange: () => setPrefs({ [key]: input.checked }) });
    return [h('label', { class: 'check' }, input, label), help ? h('p', { class: 'dim small' }, help) : null];
  };

  const reportButtons = ['popup', 'log'].map((m) => h('button', {
    class: 'btn', 'aria-pressed': String(p.reportMode === m),
    onclick: () => { setPrefs({ reportMode: m }); reportButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(['popup', 'log'][i] === m))); },
  }, T.reportModes[m]));

  function sync() {
    const q = getPrefs();
    size.set(q.textSize, { text: `${q.textSize}%` });
    music.set(q.music, { text: `${q.music}%` });
    effects.set(q.effects, { text: `${q.effects}%` });
  }
  sync();
  const off = on('prefs:change', sync);

  const dlg = openDialog(T.settingsTitle, [
    h('h3', {}, T.settingsRead),
    h('fieldset', { class: 'field' }, h('legend', {}, T.fontLabel), h('div', { class: 'seg' }, fontButtons)),
    size.el,
    check('highContrast', T.highContrast),
    check('reduceMotion', T.reduceMotion, T.reduceMotionHelp),
    check('batterySaver', T.batterySaver, T.batterySaverHelp),
    h('h3', {}, T.settingsGame),
    check('pauseOnProject', T.pauseOnProject),
    h('fieldset', { class: 'field' }, h('legend', {}, T.reportMode), h('div', { class: 'seg seg2' }, reportButtons)),
    h('h3', {}, T.settingsSound),
    music.el,
    effects.el,
    check('mute', T.mute),
    h('h3', {}, T.settingsSaves),
    h('p', { class: 'note warn' }, T.privateNote),
    storageLine,
    inGame && getState() && h('p', { class: 'dim small' }, T.seedInfo(getState().seed)),
    h('p', { class: 'dim small' }, T.versionInfo(GAME_VERSION)),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
  ], { onClose: off });
  return dlg;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
