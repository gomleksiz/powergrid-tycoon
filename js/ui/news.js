// News bar: the newest message. Click (or press N) to open the full log.

import { h, fill } from './dom.js';
import { openDialog } from './dialog.js';
import { on } from '../core/bus.js';
import { getState } from '../core/store.js';
import { dateLabel } from '../core/time.js';
import { UI } from '../data/balance.js';
import { T } from '../data/text.js';
import { money } from './format.js';

const TAGS = { info: '●', warn: '▲', error: '✕' };

export function mountNews(bar) {
  const items = [];   // newest first

  function show(payload) {
    const { kind = 'info' } = payload;
    const text = payload.text ?? T.news[payload.key]?.({ ...payload, amount: money(payload.amount ?? 0) }) ?? payload.key;
    const s = getState();
    items.unshift({ text, kind, date: s ? dateLabel(s.time.month) : '' });
    items.length = Math.min(items.length, UI.NEWS_LOG_MAX);
    bar.className = `newsbar ${kind}`;
    fill(bar,
      h('span', { class: 'tag', 'aria-hidden': 'true' }, TAGS[kind] ?? TAGS.info),
      h('span', { class: 'msg', title: text }, text));
  }

  function openLog() {
    const dlg = openDialog(T.newsLogTitle, [
      items.length
        ? h('ul', { class: 'news-log' }, items.map((it) => h('li', { class: it.kind }, h('span', { class: 'dim small' }, it.date), ' ', TAGS[it.kind], ' ', it.text)))
        : h('p', { class: 'dim' }, T.newsLogEmpty),
      h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', onclick: () => dlg.close() }, T.ok)),
    ]);
  }

  bar.tabIndex = 0;
  bar.setAttribute('aria-label', T.newsLogTitle);
  bar.addEventListener('click', openLog);
  bar.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLog(); });
  on('news', show);
  on('game:quit', () => { items.length = 0; });
  return { show, items, openLog };
}
