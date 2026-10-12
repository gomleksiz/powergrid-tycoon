// Title screen: New Game, Continue, Load, Settings.

import { h, fill } from './dom.js';
import { alertDialog } from './dialog.js';
import { T } from '../data/text.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, GAME_VERSION, UI } from '../data/balance.js';
import { DIFFICULTY } from '../data/difficulty.js';
import { hasContinue, readContinue } from '../save/save.js';
import { fnv1a } from '../save/checksum.js';

export function randomSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// A number stays a number; any other text is hashed, so "storm" is a valid seed.
export function parseSeed(text) {
  const t = String(text).trim();
  if (/^\d+$/.test(t) && Number(t) <= UI.SEED_MAX) return Number(t);
  return t === '' ? randomSeed() : fnv1a(t);
}

export function mountTitle(root, { onNewGame, onLoaded, onOpenLoad, onOpenSettings, onOpenCredits }) {
  const screen = h('section', { class: 'title-screen', 'aria-label': T.gameTitle });
  root.append(screen);

  function logo() {
    return [
      h('h1', { class: 'logo' }, h('span', { class: 'bolt', 'aria-hidden': 'true' }, '⚡'), ' PowerGrid', h('br'), 'Tycoon'),
      h('p', { class: 'tagline' }, T.tagline),
    ];
  }

  function showMenu() {
    const canContinue = hasContinue();
    const card = h('div', { class: 'title-card' },
      logo(),
      h('div', { class: 'menu-list' },
        h('button', { class: 'btn btn-primary', onclick: continueGame, disabled: !canContinue }, T.continueGame),
        !canContinue && h('p', { class: 'dim small', style: 'text-align:center;margin:0' }, T.noContinue),
        h('button', { class: canContinue ? 'btn' : 'btn btn-primary', onclick: showNewGame }, T.newGame),
        h('button', { class: 'btn', onclick: onOpenLoad }, T.load),
        h('button', { class: 'btn', onclick: onOpenSettings }, T.settings),
        h('button', { class: 'btn', onclick: onOpenCredits }, T.credits),
      ),
      h('p', { class: 'title-foot dim small' }, T.versionInfo(GAME_VERSION)),
    );
    fill(screen, card);
    card.querySelector('button:not(:disabled)')?.focus();
  }

  function continueGame() {
    const res = readContinue();
    if (res.ok) onLoaded(res, T.newestAutoSave);
    else alertDialog(T.loadError);
  }

  function showNewGame() {
    let difficulty = DEFAULT_DIFFICULTY;
    const name = h('input', { type: 'text', id: 'ng-name', maxLength: UI.COMPANY_NAME_MAX, value: T.companyNameDefault, autocomplete: 'off' });
    const seed = h('input', { type: 'text', id: 'ng-seed', inputMode: 'numeric', value: String(randomSeed()), autocomplete: 'off' });
    // The tutorial is on by default for Easy and Normal (section 15).
    const tutorial = h('input', { type: 'checkbox', checked: DIFFICULTY[difficulty].tutorialDefault });
    const diffButtons = DIFFICULTIES.map((d) => h('button', {
      type: 'button',
      class: 'btn',
      'aria-pressed': String(d === difficulty),
      onclick: () => {
        difficulty = d;
        diffButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(DIFFICULTIES[i] === d)));
        tutorial.checked = DIFFICULTY[d].tutorialDefault;
      },
    }, T.difficulty[d]));

    const form = h('form', {
      class: 'title-card',
      onsubmit: (e) => {
        e.preventDefault();
        onNewGame({
          companyName: name.value.trim() || T.companyNameDefault,
          difficulty,
          seed: parseSeed(seed.value),
          tutorial: tutorial.checked,
        });
      },
    },
      logo(),
      h('h2', {}, T.newGame),
      h('div', { class: 'field' }, h('label', { for: 'ng-name' }, T.companyName), name),
      h('fieldset', { class: 'field' }, h('legend', {}, T.difficultyLabel), h('div', { class: 'seg' }, diffButtons)),
      h('div', { class: 'field' },
        h('label', { for: 'ng-seed' }, T.seedLabel),
        h('div', { class: 'row' }, seed,
          h('button', { type: 'button', class: 'btn', onclick: () => { seed.value = String(randomSeed()); } }, T.randomSeed)),
        h('span', { class: 'dim small' }, T.seedHint)),
      h('label', { class: 'check' }, tutorial, T.tutorialLabel),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn', onclick: showMenu }, T.back),
        h('button', { type: 'submit', class: 'btn btn-primary' }, T.start)),
    );
    fill(screen, form);
    name.focus();
    name.select();
  }

  return {
    show() { screen.hidden = false; showMenu(); },
    hide() { screen.hidden = true; },
    refresh() { if (!screen.hidden) showMenu(); },
  };
}
