// Keyboard: Space = pause/play, 1/2/3 = 1x/2x/5x, Esc = menu.

import { isDialogOpen } from './dialog.js';

const SPEED_KEYS = { Digit1: 1, Digit2: 2, Digit3: 5, Numpad1: 1, Numpad2: 2, Numpad3: 5 };

export function bindKeys({ loop, isPlaying, onMenu }) {
  // Capture phase: still works when focus was left on a hidden element.
  window.addEventListener('keydown', (e) => {
    if (!isPlaying() || isDialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('input, select, textarea')) return;

    if (e.code === 'Space') {
      e.preventDefault(); // stop a focused button from also clicking
      loop.togglePause();
    } else if (e.code in SPEED_KEYS) {
      loop.setSpeed(SPEED_KEYS[e.code]);
    } else if (e.key === 'Escape') {
      e.preventDefault(); // else Chrome's close watcher cancels the new dialog at once
      onMenu();
    }
  }, true);
}
