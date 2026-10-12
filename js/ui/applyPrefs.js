// Apply the device settings to the page: font, text size, contrast, motion.

import { getPrefs } from './prefs.js';
import { on } from '../core/bus.js';

export function applyPrefs(p = getPrefs()) {
  const root = document.documentElement;
  root.classList.toggle('font-lexend', p.font === 'lexend');
  root.classList.toggle('font-system', p.font === 'system');
  root.classList.toggle('high-contrast', p.highContrast);
  root.classList.toggle('reduce-motion', p.reduceMotion);
  root.classList.toggle('battery-saver', p.batterySaver);
  root.style.setProperty('--text-scale', String(p.textSize / 100));
}

export function bindPrefs() {
  applyPrefs();
  on('prefs:change', applyPrefs);
}
