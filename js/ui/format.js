// Number formats. Short form on screen ($1.2M); the full number goes in the tooltip.

const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function money(v) {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1e9) return `${sign}$${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}$${trim(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}$${trim(a / 1e3)}K`;
  return `${sign}$${full.format(a)}`;
}

export function moneyFull(v) {
  return `${v < 0 ? '−' : ''}$${full.format(Math.abs(Math.round(v)))}`;
}

export function signedMoney(v) {
  return v >= 0 ? `+${money(v)}` : money(v);
}

export function num(v) {
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${trim(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}${trim(a / 1e3)}K`;
  return `${sign}${full.format(a)}`;
}

export const numFull = (v) => full.format(Math.round(v));
export const signed = (v) => (v > 0 ? `+${num(v)}` : v < 0 ? num(v) : '0');
export const pct = (v, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const mult = (v) => `${v.toFixed(2)}×`;
export const hours = (h) => (h < 10 ? `${h.toFixed(1)} h` : `${Math.round(h)} h`);

function trim(x) {
  return x >= 100 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, '');
}
