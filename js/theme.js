const api = () => window.TradeVaultTheme;

export function getPalettes() {
  return api().getPalettes();
}

export function getPaletteMeta(id) {
  return api().getPaletteMeta(id);
}

export function getPalette() {
  return api().getPalette();
}

export function getAppliedPalette() {
  return api().getAppliedPalette();
}

export function applyPalette(palette, options = {}) {
  api().applyPalette(palette, options.silent);
}

export function setPalette(palette) {
  api().setPalette(palette);
}

export function initPalette() {
  api().initPalette();
}

/** @deprecated use getPalette */
export function getTheme() {
  return getPalette();
}

/** @deprecated use setPalette */
export function setTheme(theme) {
  setPalette(theme);
}

export function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => style.getPropertyValue(name).trim() || fallback;

  return {
    textMuted: pick('--text-muted', '#5c6b82'),
    textSecondary: pick('--text-secondary', '#8b9cb3'),
    accent: pick('--accent', '#3b82f6'),
    accent2: pick('--accent-2', '#6366f1'),
    profit: pick('--profit', '#22c55e'),
    loss: pick('--loss', '#ef4444'),
    warning: pick('--warning', '#f59e0b'),
    grid: pick('--chart-grid', 'rgba(42, 53, 72, 0.5)'),
  };
}
