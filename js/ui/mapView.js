// The map area: canvas, camera, input, tooltip, view buttons and the place bar.

import { h, fill } from './dom.js';
import { ui, setUi } from './uiState.js';
import { bindMapInput } from './input.js';
import { T } from '../data/text.js';
import { MAP, SECTOR_TYPES } from '../data/sectors.js';
import { BUILDINGS } from '../data/buildings.js';
import { TIER_IDS } from '../data/balance.js';
import { getState, dispatch } from '../core/store.js';
import { on } from '../core/bus.js';
import { createCamera } from '../render/camera.js';
import { createMapRenderer } from '../render/map.js';
import { loadSprites } from '../render/sprites.js';
import { VIEWS, viewReady } from '../render/views.js';
import { sectorAt, sectorBounds } from '../sim/mapgen.js';
import { buildCheck, capexCost } from '../sim/build.js';
import { money, numFull } from './format.js';

const PAN_KEY_PX = 48;     // art pixels per arrow key press

export function mountMapView(area, canvas, { onSelectSector }) {
  const camera = createCamera();
  const renderer = createMapRenderer(canvas, camera);
  const dpr = () => window.devicePixelRatio || 1;
  let running = false;
  let firstFit = true;

  // ---------- overlays ----------
  const tooltip = h('div', { class: 'map-tip', hidden: true, role: 'tooltip' });
  const viewButtons = VIEWS.map((v, i) => h('button', {
    class: 'btn view-btn', 'aria-pressed': String(v === ui.view), title: T.viewHelp(i + 1, T.views[v]),
    onclick: () => setView(v),
  }, h('span', { class: 'view-key' }, `V${i + 1}`), h('span', { class: 'view-name' }, T.views[v])));
  const viewBar = h('div', { class: 'view-bar', role: 'group', 'aria-label': T.mapViews }, viewButtons);
  const zoomBar = h('div', { class: 'zoom-bar' },
    h('button', { class: 'btn', 'aria-label': T.zoomIn, onclick: () => zoom(1) }, '+'),
    h('button', { class: 'btn', 'aria-label': T.zoomOut, onclick: () => zoom(-1) }, '−'),
    h('button', { class: 'btn', 'aria-label': T.zoomHome, title: T.zoomHome, onclick: () => fitHome() }, '⌂'));
  const placeText = h('span', { class: 'place-text' });
  const placeOk = h('button', { class: 'btn btn-primary', 'aria-label': T.placeConfirm, onclick: confirmPlace }, '✓');
  const placeBar = h('div', { class: 'place-bar', hidden: true },
    placeText, placeOk,
    h('button', { class: 'btn', 'aria-label': T.placeCancel, onclick: cancelPlacing }, '✕'));
  area.append(viewBar, zoomBar, placeBar, tooltip);

  // ---------- sizing ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr()));
    canvas.height = Math.max(1, Math.round(r.height * dpr()));
    camera.resize(canvas.width, canvas.height);
    if (firstFit && getState() && r.width > 0) { fitHome(); firstFit = false; }
  }
  new ResizeObserver(resize).observe(canvas);

  function fitHome() {
    const s = getState();
    const home = s?.sectors.find((x) => x.owned) ?? s?.sectors[0];
    if (!home) return;
    const b = sectorBounds(home.id);
    camera.fit((b.w + 2) * MAP.TILE, (b.h + 2) * MAP.TILE);
    camera.centerOn((b.x + b.w / 2) * MAP.TILE, (b.y + b.h / 2) * MAP.TILE);
  }

  function zoom(dir, x = canvas.width / 2, y = canvas.height / 2) {
    camera.zoomBy(dir, x, y);
    hideTip();
  }

  // ---------- views ----------
  function setView(v) {
    if (!viewReady(v)) return;
    setUi({ view: v });
  }
  function syncViews() {
    VIEWS.forEach((v, i) => {
      viewButtons[i].setAttribute('aria-pressed', String(v === ui.view));
      viewButtons[i].disabled = !viewReady(v);
    });
  }

  // ---------- tooltip ----------
  function sectorTip(sid) {
    const s = getState()?.sectors[sid];
    if (!s) return '';
    const type = SECTOR_TYPES[s.type];
    const lines = [`<strong>${s.name}</strong>`, T.sectorTypes[s.type]];
    const hz = Object.entries(type.hazard).map(([k, m]) => T.hazardLine(T.hazards[k], m));
    if (hz.length) lines.push(...hz);
    if (!s.owned) lines.push(T.sectorLocked);
    else {
      const n = TIER_IDS.reduce((sum, t) => sum + s.customers[t], 0);
      lines.push(T.customersTotal(numFull(n)));
    }
    return lines.join('<br>');
  }

  function showTip(x, y, html) {
    tooltip.innerHTML = html;
    tooltip.hidden = !html;
    const cssX = x / dpr();
    const cssY = y / dpr();
    const r = area.getBoundingClientRect();
    tooltip.style.left = `${Math.min(cssX + 14, r.width - 240)}px`;
    tooltip.style.top = `${Math.min(cssY + 14, r.height - 120)}px`;
  }
  function hideTip() { tooltip.hidden = true; }

  // ---------- placement ----------
  function ghostAt(sx, sy) {
    const size = BUILDINGS[ui.placing].size;
    const t = camera.toTile(sx, sy);
    const x = t.x - Math.floor((size - 1) / 2);
    const y = t.y - Math.floor((size - 1) / 2);
    const check = buildCheck(getState(), ui.placing, x, y);
    return { x, y, ok: check.ok, reason: check.reason };
  }

  function showPlaceBar() {
    const g = ui.ghost;
    const cost = money(capexCost(getState(), BUILDINGS[ui.placing].cost));
    placeText.textContent = g
      ? (g.ok ? T.placeHere(T.buildings[ui.placing], cost) : T.buildReasons[g.reason] ?? T.buildReasons.blocked)
      : T.placePick(T.buildings[ui.placing], cost);
    placeOk.disabled = !g?.ok;
    placeBar.hidden = false;
  }

  function startPlacing(type) {
    setUi({ placing: type, ghost: null });
    showPlaceBar();
  }

  function confirmPlace() {
    if (!ui.placing || !ui.ghost?.ok) return;
    dispatch({ type: 'build/place', payload: { type: ui.placing, x: ui.ghost.x, y: ui.ghost.y } });
    cancelPlacing();
  }

  function cancelPlacing() {
    setUi({ placing: null, ghost: null });
    placeBar.hidden = true;
  }

  // ---------- input ----------
  bindMapInput(canvas, {
    onTap(x, y, type) {
      hideTip();
      if (ui.placing) {
        setUi({ ghost: ghostAt(x, y) });
        if (type === 'mouse' && ui.ghost.ok) confirmPlace();   // a mouse click places at once
        else showPlaceBar();                                   // touch: tap ✓ to confirm
        return;
      }
      const t = camera.toTile(x, y);
      const sid = sectorAt(t.x, t.y);
      if (sid < 0) return;
      setUi({ selected: sid });
      onSelectSector?.(sid);
    },
    onLongPress(x, y) {
      const t = camera.toTile(x, y);
      const sid = sectorAt(t.x, t.y);
      if (sid >= 0) showTip(x, y, sectorTip(sid));
    },
    onHover(x, y) {
      if (ui.placing) { setUi({ ghost: ghostAt(x, y) }); showPlaceBar(); return; }
      const t = camera.toTile(x, y);
      const sid = sectorAt(t.x, t.y);
      if (sid >= 0) showTip(x, y, sectorTip(sid)); else hideTip();
    },
    onHoverEnd: hideTip,
    onPan(dx, dy) { camera.pan(dx, dy); hideTip(); },
    onZoom(dir, x, y) { zoom(dir, x, y); },
  });

  // Keys: + / − zoom, arrows move, V changes the view.
  window.addEventListener('keydown', (e) => {
    if (!running || document.querySelector('dialog[open]') || e.target.closest?.('input, select, textarea')) return;
    const s = camera.scale();
    const keys = {
      '+': () => zoom(1), '=': () => zoom(1), '-': () => zoom(-1), '_': () => zoom(-1),
      ArrowLeft: () => camera.pan(PAN_KEY_PX * s, 0), ArrowRight: () => camera.pan(-PAN_KEY_PX * s, 0),
      ArrowUp: () => camera.pan(0, PAN_KEY_PX * s), ArrowDown: () => camera.pan(0, -PAN_KEY_PX * s),
      v: () => cycleView(), V: () => cycleView(),
    };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  });

  function cycleView() {
    const ready = VIEWS.filter(viewReady);
    setView(ready[(ready.indexOf(ui.view) + 1) % ready.length]);
  }

  // ---------- frame loop ----------
  // Battery saver: draw at 30 frames each second.
  let skip = false;
  function frame(now) {
    if (!running) return;
    skip = !skip;
    if (!skip || !document.documentElement.classList.contains('battery-saver')) renderer.draw(getState(), ui, now);
    requestAnimationFrame(frame);
  }

  on('ui:change', syncViews);
  syncViews();
  loadSprites();

  return {
    start() {
      if (running) return;
      running = true;
      firstFit = true;
      resize();
      requestAnimationFrame(frame);
    },
    stop() { running = false; cancelPlacing(); hideTip(); },
    startPlacing,
    cancelPlacing,
    isPlacing: () => !!ui.placing,
    fitHome,
    camera,
  };
}
