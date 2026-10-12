// Entry point: build the UI and connect it to the session.

import { initSession, newGame, loadGame, quitToTitle, saveToSlot, isActive } from './core/session.js';
import { on } from './core/bus.js';
import { mountTopbar } from './ui/topbar.js';
import { mountSidepanel } from './ui/sidepanel.js';
import { mountNews } from './ui/news.js';
import { bindKeys } from './ui/keys.js';
import { mountTitle } from './ui/titleScreen.js';
import { openSaveScreen } from './ui/loadScreen.js';
import { openPauseMenu } from './ui/pauseMenu.js';
import { openSettings } from './ui/settings.js';
import { mountMapView } from './ui/mapView.js';
import { createSectorPanel } from './ui/panels/sector.js';
import { setUi } from './ui/uiState.js';
import { bindDebugKeys } from './ui/debug.js';
import { mountReport } from './ui/report.js';
import { mountPhaseBanner } from './ui/phaseBanner.js';
import { createBudgetPanel } from './ui/panels/budget.js';
import { createCustomersPanel } from './ui/panels/customers.js';
import { createResearchPanel } from './ui/panels/research.js';
import { createProjectsPanel } from './ui/panels/projects.js';
import { createStaffPanel } from './ui/panels/staff.js';
import { createRivalsPanel } from './ui/panels/rivals.js';
import { openTechTree } from './ui/techTreeView.js';
import { getPrefs } from './ui/prefs.js';
import { NODES } from './data/techTree.js';
import { getState } from './core/store.js';
import { news } from './core/session.js';
import { T } from './data/text.js';
import { showEventCard, showWarning, showDisasterReport } from './ui/modals.js';

const $ = (id) => document.getElementById(id);
const app = $('app');

const loop = initSession();
mountNews($('newsbar'));

let pauseMenu = null;

function openMenu() {
  if (pauseMenu?.el.open) return; // the 'close' event comes late, so check .open
  if (map.isPlacing()) { map.cancelPlacing(); return; } // Esc first stops building
  panel.close();
  pauseMenu = openPauseMenu({
    loop,
    onSave: () => openSaveScreen({ mode: 'save', onSave: saveToSlot }),
    onLoad: () => openSaveScreen({
      mode: 'load',
      onLoaded: (res, name) => {
        pauseMenu?.keepPaused();
        pauseMenu?.close();
        loadGame(res, name);
      },
    }),
    onSettings: () => openSettings({ inGame: true }),
    onQuit: quitToTitle,
  });
}

// Tab order from design section 15. More panels join in later steps.
const panel = mountSidepanel({
  panel: $('sidepanel'),
  scrim: $('scrim'),
  bottombar: $('bottombar'),
  panels: [
    createSectorPanel({ onBuild: startBuild }),
    createBudgetPanel(),
    createResearchPanel({ onOpenTree: () => openTechTree() }),
    createProjectsPanel(),
    createStaffPanel(),
    createCustomersPanel(),
    createRivalsPanel(),
  ],
});

// The map must be visible to place a building, so the drawer closes on small screens.
const narrow = () => window.matchMedia('(max-width: 1023px)').matches;
function startBuild(type) {
  if (narrow()) panel.close();
  map.startPlacing(type);
}

const map = mountMapView($('map-area'), $('map'), {
  onSelectSector() {
    panel.show('sector');
    if (narrow()) panel.open('sector');
  },
});
mountReport($('map-area'));
const phaseBanner = mountPhaseBanner($('map-area'));

mountTopbar($('topbar'), { loop, onMenu: openMenu, onTogglePanel: () => panel.toggle() });
bindKeys({ loop, isPlaying: isActive, onMenu: openMenu });
bindDebugKeys();

const title = mountTitle($('screen-root'), {
  onNewGame: newGame,
  onLoaded: loadGame,
  onOpenLoad: () => openSaveScreen({ mode: 'load', onLoaded: loadGame, onClose: () => title.refresh() }),
  onOpenSettings: () => openSettings(),
});

on('game:start', () => {
  title.hide();
  app.hidden = false;
  document.activeElement?.blur(); // focus must not stay in the hidden title screen
  setUi({ selected: null, placing: null, ghost: null, view: 'normal' });
  map.start();
  panel.show('sector');
  if (getState().time.month === 1 && getState().time.week === 1) phaseBanner.show(1);
  if (getState().events.pending) showEventCard(getState().events.pending.id);   // a card from before the save
});

// A project is done: a news line, and a pause if the player wants it.
on('project:done', (p) => {
  const s = getState();
  if (p.kind === 'research') news(T.news.researchDone({ name: NODES[p.node].name }));
  else if (p.kind === 'deploy') news(T.news.deployDone({ name: NODES[p.node].name, sector: s.sectors[p.sector].name }));
  else news(T.news.buildDone({ building: p.type, sector: s.sectors[p.sector].name }));
  if (getPrefs().autoPauseProject) loop.setSpeed(0);
});

// Auto-pause on warnings, disasters and event cards (design section 3).
on('disaster:warning', (w) => {
  loop.setSpeed(0);
  news(T.news.warning({ name: T.disasterNames[w.type], weeks: w.weeks }), 'warn');
  showWarning(w);
});
on('disaster:hit', (r) => {
  loop.setSpeed(0);
  news(T.news.disaster({ name: T.disasterNames[r.type] }), 'error');
  showDisasterReport(r);
});
on('rival:enter', (e) => {
  loop.setSpeed(0);
  news(T.news.rivalEnter(e), 'error');
});
on('rival:leave', (e) => news(T.news.rivalLeave(e)));
on('event:card', ({ id }) => {
  loop.setSpeed(0);
  showEventCard(id);
});

on('game:quit', () => {
  map.stop();
  app.hidden = true;
  panel.close();
  title.show();
});

title.show();
