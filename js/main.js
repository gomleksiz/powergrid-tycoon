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
import { createBudgetPanel } from './ui/panels/budget.js';
import { createCustomersPanel } from './ui/panels/customers.js';

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
    createCustomersPanel(),
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
});

on('game:quit', () => {
  map.stop();
  app.hidden = true;
  panel.close();
  title.show();
});

title.show();
