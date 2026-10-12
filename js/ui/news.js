// News bar: shows the newest message and keeps a short history.

import { h, fill } from './dom.js';
import { on } from '../core/bus.js';
import { UI } from '../data/balance.js';

const TAGS = { info: '●', warn: '▲', error: '✕' };

export function mountNews(bar) {
  const items = [];

  function show({ text, kind = 'info' }) {
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
