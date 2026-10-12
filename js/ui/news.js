// News bar: shows the newest message and keeps a short history.

import { h, fill } from './dom.js';
import { on } from '../core/bus.js';
import { UI } from '../data/balance.js';
import { T } from '../data/text.js';
import { money } from './format.js';

const TAGS = { info: '●', warn: '▲', error: '✕' };

export function mountNews(bar) {
  const items = [];

  function show(payload) {
    const { kind = 'info' } = payload;
    const text = payload.text ?? T.news[payload.key]?.({ ...payload, amount: money(payload.amount ?? 0) }) ?? payload.key;
    items.unshift({ text, kind });
    items.length = Math.min(items.length, UI.NEWS_MAX_ITEMS);
    bar.className = `newsbar ${kind}`;
    fill(bar,
      h('span', { class: 'tag', 'aria-hidden': 'true' }, TAGS[kind] ?? TAGS.info),
      h('span', { class: 'msg', title: text }, text),
    );
  }

  on('news', show);
  return { show, items };
}
