// Entry point: build the UI and connect it to the session.

import { initSession, newGame, loadGame, quitToTitle, saveToSlot, isActive } from './core/session.js';
import { on } from './core/bus.js';
import { getState } from './core/store.js';
import { T } from './data/text.js';
import { readContinue } from './save/save.js';
import { startAudio, setVolumes, sfx } from './audio/audio.js';
import { mountTopbar } from './ui/topbar.js';
import { mountSidepanel } from './ui/sidepanel.js';
import { mountNews } from './ui/news.js';
import { bindKeys } from './ui/keys.js';
import { mountTitle } from './ui/titleScreen.js';
import { openSaveScreen } from './ui/loadScreen.js';
import { openPauseMenu } from './ui/pauseMenu.js';
import { openSettings } from './ui/settings.js';
import { openCredits } from './ui/credits.js';
import { mountMapView } from './ui/mapView.js';
import { setUi } from './ui/uiState.js';
import { bindDebug } from './ui/debug.js';
import { mountReport } from './ui/report.js';
import { mountPhaseBanner } from './ui/phaseBanner.js';
import { mountEndScreen, mountLossBanners } from './ui/endScreen.js';
import { mountTutorial } from './ui/tutorial.js';
import { bindReactions } from './ui/reactions.js';
import { alertDialog } from './ui/dialog.js';
import { openTechTree } from './ui/techTreeView.js';
import { showEventCard } from './ui/modals.js';
import { getPrefs, setPrefs } from './ui/prefs.js';
import { bindPrefs } from './ui/applyPrefs.js';
import { trackBarSizes } from './ui/barSizes.js';
import { createSectorPanel } from './ui/panels/sector.js';
import { createBudgetPanel } from './ui/panels/budget.js';
import { createResearchPanel } from './ui/panels/research.js';
import { createProjectsPanel } from './ui/panels/projects.js';
import { createStaffPanel } from './ui/panels/staff.js';
import { createCustomersPanel } from './ui/panels/customers.js';
import { createRivalsPanel } from './ui/panels/rivals.js';
import { createGoalsPanel } from './ui/panels/goals.js';

const $ = (id) => document.getElementById(id);
const app = $('app');

bindPrefs();
trackBarSizes();
const loop = initSession();
const newsBar = mountNews($('newsbar'));

// ---------- sound: starts on the first New Game or Continue click ----------
const syncSound = () => { const p = getPrefs(); setVolumes({ music: p.music, effects: p.effects, mute: p.mute }); };
on('prefs:change', syncSound);
const withSound = (fn) => (...args) => { startAudio(); syncSound(); return fn(...args); };
const startGame = withSound(newGame);
const startLoaded = withSound(loadGame);
document.addEventListener('click', (e) => { if (e.target.closest('.btn, .tab, .meter-chip')) sfx('click'); }, true);

// ---------- menu ----------
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
        startLoaded(res, name);
      },
    }),
    onSettings: () => openSettings({ inGame: true }),
    onQuit: quitToTitle,
  });
}

// ---------- side panel (tab order from design section 15) ----------
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
    createGoalsPanel(),
  ],
});
const narrow = () => window.matchMedia('(max-width: 1023px)').matches;
function showTab(id) {
  panel.show(id);
  if (narrow()) panel.open(id);
}
// The map must be visible to place a building, so the drawer closes on small screens.
function startBuild(type) {
  if (narrow()) panel.close();
  map.startPlacing(type);
}

// ---------- map and overlays ----------
const map = mountMapView($('map-area'), $('map'), { onSelectSector: () => showTab('sector') });
mountReport($('map-area'), { isEnabled: () => getPrefs().reportMode === 'popup' });
const phaseBanner = mountPhaseBanner($('map-area'));
mountLossBanners($('map-area'));
mountTutorial($('map-area'), { loop, showTab });

const endScreen = mountEndScreen($('screen-root'), {
  onLoadAuto() {
    const res = readContinue();
    if (res.ok) loadGame(res, T.newestAutoSave);
    else alertDialog(T.loadError);
  },
  onLoadSlot: () => openSaveScreen({ mode: 'load', onLoaded: loadGame }),
  onTitle: quitToTitle,
});
bindReactions({ loop, endScreen });

// ---------- top bar and keys ----------
const toggleMute = () => setPrefs({ mute: !getPrefs().mute });
mountTopbar($('topbar'), { loop, onMenu: openMenu, onTogglePanel: () => panel.toggle(), onMute: toggleMute });
bindKeys({
  loop, isPlaying: isActive, onMenu: openMenu, onTab: showTab,
  onTree: () => openTechTree(), onNews: () => newsBar.openLog(), onMute: toggleMute,
});
bindDebug(loop);

// ---------- title ----------
const title = mountTitle($('screen-root'), {
  onNewGame: startGame,
  onLoaded: startLoaded,
  onOpenLoad: () => openSaveScreen({ mode: 'load', onLoaded: startLoaded, onClose: () => title.refresh() }),
  onOpenSettings: () => openSettings(),
  onOpenCredits: () => openCredits(),
});

on('game:start', () => {
  title.hide();
  app.hidden = false;
  document.activeElement?.blur(); // focus must not stay in the hidden title screen
  setUi({ selected: null, placing: null, ghost: null, view: 'normal' });
  map.start();
  panel.show('sector');
  endScreen.hide();
  const s = getState();
  if (s.goals.ended) { endScreen.show(s.goals.ended); return; }
  if (s.time.month === 1 && s.time.week === 1 && !s.tutorial.enabled) phaseBanner.show(1);
  if (s.events.pending) showEventCard(s.events.pending.id);   // a card from before the save
});

on('game:quit', () => {
  endScreen.hide();
  map.stop();
  app.hidden = true;
  panel.close();
  title.show();
});

title.show();
