// The bars size to their text. The drawer and the bottom sheet need their heights,
// so keep --topbar-h, --newsbar-h and --bottombar-h up to date.

const BARS = { topbar: '--topbar-h', newsbar: '--newsbar-h', bottombar: '--bottombar-h' };

export function trackBarSizes() {
  const root = document.documentElement;
  const ro = new ResizeObserver(() => {
    for (const [id, v] of Object.entries(BARS)) {
      const el = document.getElementById(id);
      const hgt = el && el.offsetParent !== null ? el.getBoundingClientRect().height : 0;
      root.style.setProperty(v, `${Math.round(hgt)}px`);
    }
  });
  for (const id of Object.keys(BARS)) {
    const el = document.getElementById(id);
    if (el) ro.observe(el);
  }
}
