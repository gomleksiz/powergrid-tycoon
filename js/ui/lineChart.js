// A small line chart on a canvas (no library). Sharp on any devicePixelRatio.

const PAD = { l: 52, r: 8, t: 8, b: 20 };
const PAD_COMPACT = { l: 40, r: 4, t: 6, b: 6 };   // version 1.2: small charts on the live board

// Shorter series (started later, for example after loading an old save) are drawn at the right end.
export function drawLineChart(canvas, series, { format = (v) => String(Math.round(v)), min = null, max = null, compact = false } = {}) {
  const pad = compact ? PAD_COMPACT : PAD;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 140;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  if (!all.length) return;
  const lo = min ?? Math.min(0, ...all);
  const hi = max ?? Math.max(...all, lo + 1);
  const n = Math.max(...series.map((s) => s.values.length));
  const x = (i) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (h - pad.t - pad.b);

  // grid and labels
  ctx.font = "12px 'Atkinson Hyperlegible', system-ui, sans-serif";
  ctx.fillStyle = '#a9b2d6';
  ctx.strokeStyle = 'rgba(46, 58, 102, 0.8)';
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const lines = compact ? 1 : 3;
  for (let k = 0; k <= lines; k++) {
    const v = lo + ((hi - lo) * k) / lines;
    ctx.beginPath();
    ctx.moveTo(pad.l, Math.round(y(v)) + 0.5);
    ctx.lineTo(w - pad.r, Math.round(y(v)) + 0.5);
    ctx.stroke();
    ctx.fillText(format(v), pad.l - 6, y(v));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (!compact) for (let yr = 0; yr <= n / 12; yr += 5) ctx.fillText(String(2030 + yr), x(yr * 12), h - pad.b + 4);

  // lines (each series also gets a dash style, so color is not needed)
  const DASH = [[], [6, 4], [2, 3]];
  series.forEach((s, i) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.setLineDash(DASH[i % DASH.length]);
    ctx.beginPath();
    const off = n - s.values.length;
    s.values.forEach((v, j) => (j ? ctx.lineTo(x(j + off), y(v)) : ctx.moveTo(x(j + off), y(v))));
    ctx.stroke();
  });
  ctx.setLineDash([]);
}
