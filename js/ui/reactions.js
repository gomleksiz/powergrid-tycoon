// What the screen does when the simulation reports something:
// news lines, dialogs, sounds and the music mood.
// Version 1.1: an alert dialog pauses the game only while it is open; then the game runs on.
// Each sound also has a visual signal (a news line, a banner or a dialog).

import { on } from '../core/bus.js';
import { getState } from '../core/store.js';
import { news } from '../core/session.js';
import { T } from '../data/text.js';
import { NODES } from '../data/techTree.js';
import { getPrefs } from './prefs.js';
import { showEventCard, showWarning, showDisasterReport } from './modals.js';
import { sfx, setMood } from '../audio/audio.js';
import { dateLabel } from '../core/time.js';
import { signedMoney, signed } from './format.js';

const TENSE_WEEKS = 8;   // tense music after a warning, a disaster or a rival

export function bindReactions({ loop, endScreen }) {
  let tense = 0;
  const tenseNow = () => { tense = TENSE_WEEKS; setMood('tense'); };
  // Pause while the dialog is open, then go on at the old speed.
  const holdWhile = (dlg) => {
    const release = loop.hold();
    dlg.el.addEventListener('close', release, { once: true });
  };
  on('week:end', () => { if (tense > 0 && --tense === 0) setMood('calm'); });

  on('project:done', (p) => {
    const s = getState();
    if (p.kind === 'research') news(T.news.researchDone({ name: NODES[p.node].name }));
    else if (p.kind === 'deploy') news(T.news.deployDone({ name: NODES[p.node].name, sector: s.sectors[p.sector].name }));
    else news(T.news.buildDone({ building: p.type, sector: s.sectors[p.sector].name }));
    sfx('done');
    if (getPrefs().pauseOnProject) loop.setSpeed(0);
  });

  on('disaster:warning', (w) => {
    news(T.news.warning({ name: T.disasterNames[w.type], weeks: w.weeks }), 'warn');
    sfx('alert');
    tenseNow();
    holdWhile(showWarning(w));
  });

  on('disaster:hit', (r) => {
    news(T.news.disaster({ name: T.disasterNames[r.type] }), 'error');
    sfx(r.type === 'heatwave' ? 'alert' : 'storm');
    tenseNow();
    holdWhile(showDisasterReport(r));
  });

  // A rival only shows in the news bar; the game does not stop.
  on('rival:enter', (e) => {
    news(T.news.rivalEnter(e), 'error');
    sfx('alert');
    tenseNow();
  });
  on('rival:leave', (e) => news(T.news.rivalLeave(e)));
  on('rival:priceWar', (e) => news(T.news.priceWar(e), 'warn'));

  on('event:card', ({ id }) => {
    sfx('alert');
    holdWhile(showEventCard(id));
  });

  on('month:end', ({ report }) => {
    if (report?.money.net > 0) sfx('cash');
    // "Log only": the report goes to the news log instead of a card.
    if (report && getPrefs().reportMode === 'log') {
      news(T.reportLog(dateLabel(report.month), signedMoney(report.money.net), signed(report.customers.end - report.customers.start)));
    }
  });

  on('game:end', (e) => {
    loop.cancelHolds();
    loop.setSpeed(0);
    sfx(e.result === 'win' ? 'victory' : e.result === 'loss' ? 'loss' : 'done');
    endScreen.show(e);
  });

  on('game:start', () => { tense = 0; setMood('calm'); });
}
