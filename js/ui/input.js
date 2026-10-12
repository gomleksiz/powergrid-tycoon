// Map input with Pointer Events: one code path for mouse, touch and pen.
// tap, drag (pan), pinch (zoom), long-press (0.5 s), wheel, hover.
// All positions are in device pixels of the canvas.

const DRAG_START_PX = 8;      // CSS pixels before a press becomes a drag
const LONG_PRESS_MS = 500;
const PINCH_STEP = 1.25;      // finger distance ratio for 1 zoom level
const WHEEL_STEP = 60;        // wheel delta for 1 zoom level (trackpads send many small steps)

export function bindMapInput(canvas, handlers) {
  const pointers = new Map();
  let press = null;     // { id, x, y, moved, timer, type }
  let pinch = null;     // { dist }
  const dpr = () => window.devicePixelRatio || 1;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr(), y: (e.clientY - r.top) * dpr() };
  }

  function pinchInfo() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  function cancelPress() {
    if (press) clearTimeout(press.timer);
    press = null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      cancelPress();
      pinch = { dist: pinchInfo().dist };
      return;
    }
    if (pointers.size > 2) return;
    press = { id: e.pointerId, x: p.x, y: p.y, last: p, moved: false, type: e.pointerType, long: false };
    press.timer = setTimeout(() => {
      if (press && !press.moved) { press.long = true; handlers.onLongPress?.(press.x, press.y, press.type); }
    }, LONG_PRESS_MS);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse') handlers.onHover?.(p.x, p.y);
      return;
    }
    pointers.set(e.pointerId, p);

    if (pinch && pointers.size === 2) {
      const info = pinchInfo();
      const ratio = info.dist / pinch.dist;
      if (ratio > PINCH_STEP) { handlers.onZoom?.(1, info.cx, info.cy); pinch.dist = info.dist; }
      if (ratio < 1 / PINCH_STEP) { handlers.onZoom?.(-1, info.cx, info.cy); pinch.dist = info.dist; }
      return;
    }

    if (!press || press.id !== e.pointerId) return;
    if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) > DRAG_START_PX * dpr()) {
      press.moved = true;
      clearTimeout(press.timer);
    }
    if (press.moved) {
      handlers.onPan?.(p.x - press.last.x, p.y - press.last.y);
    } else if (e.pointerType === 'mouse') {
      handlers.onHover?.(p.x, p.y);
    }
    press.last = p;
  });

  function end(e, cancelled) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (press && press.id === e.pointerId) {
      if (!cancelled && !press.moved && !press.long) handlers.onTap?.(press.x, press.y, press.type);
      cancelPress();
    }
  }
  canvas.addEventListener('pointerup', (e) => end(e, false));
  canvas.addEventListener('pointercancel', (e) => end(e, true));
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') handlers.onHoverEnd?.(); });

  let wheelAcc = 0;
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    wheelAcc += e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;  // lines → pixels
    if (Math.abs(wheelAcc) < WHEEL_STEP) return;
    const p = pos(e);
    handlers.onZoom?.(wheelAcc < 0 ? 1 : -1, p.x, p.y);
    wheelAcc = 0;
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
