import { getChartColors } from './theme.js';

let equityChart = null;
let setupChart = null;
let dailyChart = null;

function chartDefaults() {
  const c = getChartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 8, right: 12, bottom: 4, left: 4 },
    },
    plugins: {
      legend: { labels: { color: c.textSecondary, font: { family: 'DM Sans' } } },
    },
    scales: {
      x: {
        ticks: { color: c.textMuted, maxRotation: 0, autoSkip: true },
        grid: { color: c.grid },
      },
      y: {
        ticks: { color: c.textMuted, padding: 6 },
        grid: { color: c.grid },
      },
    },
  };
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function destroyCharts() {
  [equityChart, setupChart, dailyChart].forEach(c => c?.destroy());
  equityChart = setupChart = dailyChart = null;
}

export function renderEquityChart(canvas, data) {
  if (!canvas || typeof Chart === 'undefined') return;
  const c = getChartColors();
  equityChart?.destroy();
  equityChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Equity Curve',
        data: data.map(d => d.value),
        borderColor: c.accent,
        backgroundColor: hexToRgba(c.accent, 0.1),
        fill: true,
        tension: 0.3,
        pointRadius: data.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      ...chartDefaults(),
      plugins: {
        ...chartDefaults().plugins,
        legend: { display: false },
      },
    },
  });
}

export function renderDailyPnlChart(canvas, data) {
  if (!canvas || typeof Chart === 'undefined') return;
  const c = getChartColors();
  dailyChart?.destroy();
  dailyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Daily P&L',
        data: data.map(d => d.value),
        backgroundColor: data.map(d =>
          d.value >= 0 ? hexToRgba(c.profit, 0.7) : hexToRgba(c.loss, 0.7)
        ),
        borderRadius: 4,
      }],
    },
    options: {
      ...chartDefaults(),
      plugins: { ...chartDefaults().plugins, legend: { display: false } },
    },
  });
}

export function renderSetupChart(canvas, setups) {
  if (!canvas || typeof Chart === 'undefined' || !setups.length) return;
  const c = getChartColors();
  setupChart?.destroy();
  setupChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: setups.map(s => s.setup),
      datasets: [{
        data: setups.map(s => s.count),
        backgroundColor: [
          c.accent, c.accent2, c.profit, c.warning, c.loss,
          '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
        ],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, right: 8, bottom: 4, left: 4 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.textSecondary, padding: 12, font: { family: 'DM Sans', size: 11 } },
        },
      },
    },
  });
}

export function renderWinLossChart(canvas, stats) {
  if (!canvas || typeof Chart === 'undefined') return;
  const c = getChartColors();
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses', 'Breakeven'],
      datasets: [{
        data: [stats.wins, stats.losses, stats.breakeven],
        backgroundColor: [c.profit, c.loss, c.warning],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, right: 8, bottom: 4, left: 4 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.textSecondary, padding: 12, font: { family: 'DM Sans', size: 11 } },
        },
      },
    },
  });
}
