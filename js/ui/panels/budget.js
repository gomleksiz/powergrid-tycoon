// Budget panel: total budget, the 5 linked sliders, prices for each tier, loans.

import { h } from '../dom.js';
import { createSlider } from '../slider.js';
import { confirmDialog } from '../dialog.js';
import { T } from '../../data/text.js';
import { BUDGET, PRICE, TIER_IDS, TIERS, MONEY } from '../../data/balance.js';
import { NODES } from '../../data/techTree.js';
import { diff } from '../../data/difficulty.js';
import { dispatch, getState } from '../../core/store.js';
import { budgetDollars, budgetBase, canTakeLoan, canRepay, loanLimit, interest } from '../../sim/economy.js';
import { isTierUnlocked } from '../../sim/effects.js';
import { maxPrice } from '../../sim/actions.js';
import { money, moneyFull, mult } from '../format.js';

const RISKY_PRICE = 1.2;

// Which tech unlocks each tier (read from the tech data).
const tierTech = (tier) => Object.values(NODES).find((n) => n.effects.unlockTier === tier)?.name ?? '';

export function createBudgetPanel() {
  const total = createSlider({
    label: T.budgetTotal, min: BUDGET.MIN_PCT, max: BUDGET.MAX_PCT, step: 1,
    onChange: (v) => dispatch({ type: 'budget/total', payload: v }),
  });

  const parts = {};
  for (const key of BUDGET.KEYS) {
    parts[key] = createSlider({
      label: T.budgetKeys[key], min: 0, max: 100, step: 1, lockable: true,
      onChange: (v) => dispatch({ type: 'budget/split', payload: { key, value: v } }),
      onLock: (locked) => dispatch({ type: 'budget/lock', payload: { key, locked } }),
    });
  }

  const prices = {};
  for (const tier of TIER_IDS) {
    prices[tier] = createSlider({
      label: T.tierNames[tier], min: PRICE.MIN, max: PRICE.MAX, step: PRICE.STEP,
      onChange: (v) => setPrice(tier, v),
    });
  }

  const loanText = h('p', { class: 'small' });
  const interestText = h('p', { class: 'dim small' });
  const take = h('button', { class: 'btn', onclick: () => dispatch({ type: 'loan/take' }) }, T.takeLoan(money(MONEY.LOAN_STEP)));
  const repay = h('button', { class: 'btn', onclick: () => dispatch({ type: 'loan/repay' }) }, T.repayLoan(money(MONEY.LOAN_STEP)));

  const el = h('div', { class: 'panel-body' },
    h('section', { class: 'card' },
      h('h3', {}, T.budgetTitle),
      total.el,
      h('h4', {}, T.budgetSplit),
      h('p', { class: 'dim small' }, T.budgetSplitHelp),
      BUDGET.KEYS.map((k) => parts[k].el),
    ),
    h('section', { class: 'card' },
      h('h3', {}, T.pricesTitle),
      h('p', { class: 'dim small' }, T.pricesHelp),
      TIER_IDS.map((t) => prices[t].el),
    ),
    h('section', { class: 'card' },
      h('h3', {}, T.loansTitle),
      loanText,
      interestText,
      h('div', { class: 'actions' }, take, repay),
    ),
  );

  async function setPrice(tier, v) {
    const s = getState();
    if (diff(s).confirmRisky && v > RISKY_PRICE && s.prices[tier] <= RISKY_PRICE) {
      if (!(await confirmDialog(T.riskyPrice))) return;
    }
    dispatch({ type: 'price/set', payload: { tier, value: v } });
  }

  function update(s) {
    const d = budgetDollars(s);
    total.set(s.budget.totalPct, {
      text: `${s.budget.totalPct}%`,
      extraText: money(d.total),
      noteText: T.budgetTotalHelp(s.budget.totalPct, money(budgetBase(s))),
    });
    for (const k of BUDGET.KEYS) {
      parts[k].set(s.budget.split[k], {
        text: `${s.budget.split[k]}%`,
        extraText: T.perMonth(money(d[k])),
        locked: s.budget.locks[k],
        noteText: T.budgetKeyHelp[k],
      });
    }
    const cap = maxPrice(s);
    for (const t of TIER_IDS) {
      const open = isTierUnlocked(s, t);
      prices[t].set(s.prices[t], {
        text: mult(s.prices[t]),
        extraText: open ? T.priceBill(money(TIERS[t].tariff * s.prices[t])) : '',
        disabled: !open,
        noteText: !open ? T.tierLocked(tierTech(t)) : (cap < PRICE.MAX ? T.priceCapped : ''),
      });
    }
    loanText.textContent = T.loanInfo(moneyFull(s.company.debt), moneyFull(loanLimit(s)));
    interestText.textContent = T.loanInterest(moneyFull(interest(s)));
    take.disabled = !canTakeLoan(s);
    repay.disabled = !canRepay(s);
  }

  return { id: 'budget', el, update };
}
