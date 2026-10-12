// Read aloud with the browser's speech API (design section 15).

import { h } from './dom.js';
import { T } from '../data/text.js';

export const canSpeak = () => 'speechSynthesis' in window;

export function speak(text) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// A 🔊 button. getText runs at click time, so it reads what is on the screen now.
export function readButton(getText) {
  if (!canSpeak()) return null;
  return h('button', { class: 'btn read-btn', 'aria-label': T.readAloud, title: T.readAloud, onclick: () => speak(getText()) }, '🔊');
}

// The visible text of an element, in reading order.
export const textOf = (el) => el.innerText.replace(/\s+\n/g, '\n').replace(/[✕🔊]/g, '').trim();
