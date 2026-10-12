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
import { mountMapCanvas } from './render/mapCanvas.js';

const $ = (id) => document.getElementById(id);
const app = $('app');

const loop = initSession();
mountNews($('newsbar'));

let pauseMenu = null;

function openMenu() {
  if (pauseMenu?.el.open) return; // the 'close' event comes late, so check .open
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

const panel = mountSidepanel({
  panel: $('sidepanel'),
  scrim: $('scrim'),
  bottombar: $('bottombar'),
  onMenu: openMenu,
});

mountTopbar($('topbar'), { loop, onMenu: openMenu, onTogglePanel: () => panel.toggle() });
bindKeys({ loop, isPlaying: isActive, onMenu: openMenu });

const title = mountTitle($('screen-root'), {
  onNewGame: newGame,
  onLoaded: loadGame,
  onOpenLoad: () => openSaveScreen({ mode: 'load', onLoaded: loadGame, onClose: () => title.refresh() }),
  onOpenSettings: () => openSettings(),
});

let map = null;
on('game:start', () => {
  title.hide();
  app.hidden = false;
  document.activeElement?.blur(); // focus must not stay in the hidden title screen
  map ??= mountMapCanvas($('map'));
  map.resize();
});

on('game:quit', () => {
  app.hidden = true;
  panel.close();
  title.show();
});

title.show();
