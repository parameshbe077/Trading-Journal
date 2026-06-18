import {
  formatCurrency, formatDate, formatTime, formatPct, escapeHtml,
  calcTradePnl, calcRMultiple, todayISO, MOODS, SETUPS, MARKETS, uid, parseNum,
} from './utils.js';
import {
  getStats, getDailyStats, getDailyPnl, getCumulativePnl, getSetupStats,
  getRulesCompliance, getStreak, getTodayPnl, getThisWeekPnl, getThisMonthPnl,
  getTradesForDate, filterTrades, getAvailableBalance,
} from './analytics.js';
import { destroyCharts, renderEquityChart, renderDailyPnlChart, renderSetupChart, renderWinLossChart } from './charts.js';
import { getPalettes, getPalette } from './theme.js';

const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  trades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  journal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  rules: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { id: 'trades', label: 'Trades', icon: ICONS.trades },
  { id: 'journal', label: 'Journal', icon: ICONS.journal },
  { id: 'calendar', label: 'Calendar', icon: ICONS.calendar },
  { id: 'analytics', label: 'Analytics', icon: ICONS.analytics },
  { id: 'rules', label: 'Rules', icon: ICONS.rules },
  { id: 'settings', label: 'Settings', icon: ICONS.settings },
];

function pnlClass(n) {
  if (n > 0) return 'profit';
  if (n < 0) return 'loss';
  return 'neutral';
}

function pnlText(n, settings) {
  const cls = n > 0 ? 'text-profit' : n < 0 ? 'text-loss' : '';
  return `<span class="${cls}">${formatCurrency(n, settings)}</span>`;
}

function resultBadge(pnl) {
  if (pnl > 0) return '<span class="badge badge-win">Win</span>';
  if (pnl < 0) return '<span class="badge badge-loss">Loss</span>';
  return '<span class="badge badge-be">BE</span>';
}

function tradeRow(t, settings, { showActions = true } = {}) {
  const pnl = calcTradePnl(t);
  const r = calcRMultiple(t, settings);
  return `
    <tr data-id="${t.id}">
      <td>${formatDate(t.date)}</td>
      <td><strong>${escapeHtml(t.symbol)}</strong></td>
      <td><span class="badge badge-${t.direction}">${t.direction}</span></td>
      <td class="td-mono">${escapeHtml(t.setup || '—')}</td>
      <td class="td-mono">${formatCurrency(t.entryPrice, settings)}</td>
      <td class="td-mono">${formatCurrency(t.exitPrice, settings)}</td>
      <td class="td-mono">${t.quantity}</td>
      <td class="td-mono ${pnlClass(pnl)}">${formatCurrency(pnl, settings)}</td>
      <td class="td-mono">${r.toFixed(2)}R</td>
      <td>${resultBadge(pnl)}</td>
      ${showActions ? `<td class="td-actions">
        <button type="button" class="btn-icon btn-edit-trade" data-id="${t.id}" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button type="button" class="btn-icon btn-delete-trade" data-id="${t.id}" aria-label="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>` : ''}
    </tr>`;
}

function tradeCard(t, settings) {
  const pnl = calcTradePnl(t);
  return `
    <div class="trade-card" data-id="${t.id}">
      <div class="trade-card-top">
        <span class="trade-card-symbol">${escapeHtml(t.symbol)}</span>
        <span class="trade-card-pnl ${pnlClass(pnl)}">${formatCurrency(pnl, settings)}</span>
      </div>
      <div class="trade-card-meta">
        <span class="badge badge-${t.direction}">${t.direction}</span>
        ${resultBadge(pnl)}
        <span>${formatDate(t.date)} ${formatTime(t.time)}</span>
        <span>${escapeHtml(t.setup || '')}</span>
      </div>
      <div class="trade-card-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-edit-trade" data-id="${t.id}">Edit</button>
        <button type="button" class="btn btn-danger btn-sm btn-delete-trade" data-id="${t.id}">Delete</button>
      </div>
    </div>`;
}

export function renderNav(activeId, container) {
  container.innerHTML = NAV_ITEMS.map(item => `
    <button type="button" class="nav-item ${item.id === activeId ? 'active' : ''}" data-page="${item.id}">
      ${item.icon}
      <span>${item.label}</span>
    </button>
  `).join('');
}

export function renderPage(page, state, ctx = {}, user = null) {
  destroyCharts();
  const renderers = {
    dashboard: () => renderDashboard(state),
    trades: () => renderTrades(state, ctx.filters),
    journal: () => renderJournal(state, ctx.date),
    calendar: () => renderCalendar(state, ctx.calYear, ctx.calMonth),
    analytics: () => renderAnalytics(state),
    rules: () => renderRules(state),
    settings: () => renderSettings(state, user),
  };
  return (renderers[page] || renderers.dashboard)();
}

function renderDashboard(state) {
  const { trades, settings, dailyLogs, rules } = state;
  const stats = getStats(trades, settings);
  const todayPnl = getTodayPnl(trades);
  const weekPnl = getThisWeekPnl(trades);
  const monthPnl = getThisMonthPnl(trades);
  const compliance = getRulesCompliance(dailyLogs, rules);
  const streak = getStreak(trades);
  const { balance, startingBalance, totalPnl: allTimePnl } = getAvailableBalance(settings, trades);
  const recent = [...trades].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 5);
  const cum = getCumulativePnl(trades);
  const equityData = cum.length
    ? cum.map((c, i) => ({ label: formatDate(c.date), value: settings.accountSize + c.cumulative }))
    : [{ label: 'Start', value: settings.accountSize }];

  const dailyLimitPct = settings.dailyLossLimit
    ? Math.min(100, Math.abs(Math.min(0, todayPnl)) / settings.dailyLossLimit * 100)
    : 0;

  return `
    <div class="balance-card">
      <div class="balance-main">
        <div class="stat-label">Available Balance</div>
        <div class="balance-value ${pnlClass(balance - startingBalance)}">${formatCurrency(balance, settings)}</div>
        <div class="stat-sub">Starting: ${formatCurrency(startingBalance, settings)} · P&L: ${formatCurrency(allTimePnl, settings)}</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Today P&L</div>
        <div class="stat-value ${pnlClass(todayPnl)}">${formatCurrency(todayPnl, settings)}</div>
        <div class="stat-sub">Limit: ${formatCurrency(settings.dailyLossLimit, settings)}</div>
        <div class="compliance-bar"><div class="compliance-fill" style="width:${dailyLimitPct}%;background:var(--loss)"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Week</div>
        <div class="stat-value ${pnlClass(weekPnl)}">${formatCurrency(weekPnl, settings)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Month</div>
        <div class="stat-value ${pnlClass(monthPnl)}">${formatCurrency(monthPnl, settings)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">All-Time P&L</div>
        <div class="stat-value ${pnlClass(stats.totalPnl)}">${formatCurrency(stats.totalPnl, settings)}</div>
        <div class="stat-sub">${stats.totalTrades} trades</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Equity Curve</span></div>
        <div class="chart-container"><canvas id="chart-equity"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Performance Overview</span></div>
        <div class="stats-grid" style="margin-bottom:0">
          <div class="stat-card" style="background:var(--bg-elevated)">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value neutral">${stats.winRate.toFixed(1)}%</div>
          </div>
          <div class="stat-card" style="background:var(--bg-elevated)">
            <div class="stat-label">Profit Factor</div>
            <div class="stat-value neutral">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div>
          </div>
          <div class="stat-card" style="background:var(--bg-elevated)">
            <div class="stat-label">Avg R</div>
            <div class="stat-value ${pnlClass(stats.avgR)}">${stats.avgR.toFixed(2)}R</div>
          </div>
          <div class="stat-card" style="background:var(--bg-elevated)">
            <div class="stat-label">Rules Followed</div>
            <div class="stat-value ${compliance.rate >= 80 ? 'profit' : compliance.rate >= 50 ? 'neutral' : 'loss'}">${compliance.rate.toFixed(0)}%</div>
          </div>
        </div>
        ${streak.count > 0 ? `<p class="stat-sub mt-16">${streak.count}-day ${streak.type} streak</p>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="card-header">
        <span class="section-title" style="margin:0">Recent Trades</span>
        <button type="button" class="btn btn-ghost btn-sm" data-page="trades">View all</button>
      </div>
      ${recent.length ? renderTradesList(recent, settings) : emptyTrades()}
    </div>
    <script type="application/json" id="chart-data-equity">${JSON.stringify(equityData)}</script>
  `;
}

function renderTradesList(trades, settings) {
  return `
    <div class="table-desktop table-wrap">
      <table>
        <thead><tr>
          <th>Date</th><th>Symbol</th><th>Side</th><th>Setup</th>
          <th>Entry</th><th>Exit</th><th>Qty</th><th>P&L</th><th>R</th><th>Result</th><th></th>
        </tr></thead>
        <tbody>${trades.map(t => tradeRow(t, settings)).join('')}</tbody>
      </table>
    </div>
    <div class="trade-cards">${trades.map(t => tradeCard(t, settings)).join('')}</div>
  `;
}

function emptyTrades() {
  return `<div class="empty-state card">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    <h3>No trades yet</h3>
    <p>Log your first trade to start tracking performance.</p>
    <button type="button" class="btn btn-primary" id="btn-empty-trade">Add Trade</button>
  </div>`;
}

function renderTrades(state, filters = {}) {
  const filtered = filterTrades(state.trades, filters);
  const sorted = [...filtered].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return `
    <div class="filters card" style="padding:14px">
      <input type="date" id="filter-from" value="${filters.from || ''}" placeholder="From" />
      <input type="date" id="filter-to" value="${filters.to || ''}" placeholder="To" />
      <input type="text" id="filter-symbol" value="${escapeHtml(filters.symbol || '')}" placeholder="Symbol" />
      <select id="filter-setup">
        <option value="">All setups</option>
        ${SETUPS.map(s => `<option value="${s}" ${filters.setup === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select id="filter-direction">
        <option value="">All sides</option>
        <option value="long" ${filters.direction === 'long' ? 'selected' : ''}>Long</option>
        <option value="short" ${filters.direction === 'short' ? 'selected' : ''}>Short</option>
      </select>
      <select id="filter-result">
        <option value="">All results</option>
        <option value="win" ${filters.result === 'win' ? 'selected' : ''}>Wins</option>
        <option value="loss" ${filters.result === 'loss' ? 'selected' : ''}>Losses</option>
      </select>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-apply-filters">Apply</button>
    </div>
    <p class="text-muted mb-16">${sorted.length} trade${sorted.length !== 1 ? 's' : ''}</p>
    ${sorted.length ? renderTradesList(sorted, state.settings) : emptyTrades()}
  `;
}

function renderJournal(state, selectedDate) {
  const date = selectedDate || todayISO();
  const log = state.dailyLogs.find(l => l.date === date);
  const dayTrades = getTradesForDate(state.trades, date);
  const dayPnl = getDailyPnl(state.trades, date);
  const activeRules = state.rules.filter(r => r.active);

  const ruleChecksHtml = activeRules.map(rule => {
    const checked = log?.ruleChecks?.[rule.id] ?? false;
    return `<label class="checkbox-item">
      <input type="checkbox" name="rule" value="${rule.id}" ${checked ? 'checked' : ''} />
      <span>${escapeHtml(rule.text)}</span>
    </label>`;
  }).join('');

  const mood = log?.mood || '';
  const moodHtml = MOODS.map(m => `
    <button type="button" class="mood-btn ${mood === m.id ? 'selected' : ''}" data-mood="${m.id}">${m.label}</button>
  `).join('');

  return `
    <div class="form-row cols-2 mb-16">
      <div class="form-group">
        <label for="journal-date">Date</label>
        <input type="date" id="journal-date" value="${date}" max="${todayISO()}" />
      </div>
      <div class="form-group">
        <label>Day P&L</label>
        <div class="stat-value ${pnlClass(dayPnl)}" style="font-size:1.25rem;padding-top:8px">${formatCurrency(dayPnl, state.settings)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Daily Rules Checklist</span></div>
        <div class="checkbox-group" id="rule-checks">${ruleChecksHtml || '<p class="text-muted">Add rules in the Rules page.</p>'}</div>
        ${activeRules.length ? `<p class="stat-sub mt-16" id="rules-score"></p>` : ''}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Mindset & Notes</span></div>
        <div class="form-group">
          <label>How did you feel today?</label>
          <div class="mood-selector" id="mood-selector">${moodHtml}</div>
        </div>
        <div class="form-group">
          <label for="pre-market">Pre-market plan</label>
          <textarea id="pre-market" placeholder="What setups are you watching? Key levels?">${escapeHtml(log?.preMarket || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="post-market">Post-market review</label>
          <textarea id="post-market" placeholder="What went well? What to improve?">${escapeHtml(log?.postMarket || '')}</textarea>
        </div>
        <div class="form-group">
          <label for="lessons">Lessons learned</label>
          <textarea id="lessons" placeholder="Key takeaways from today...">${escapeHtml(log?.lessons || '')}</textarea>
        </div>
        <button type="button" class="btn btn-primary" id="btn-save-journal">Save Journal Entry</button>
      </div>
    </div>

    <div class="section mt-16">
      <div class="card-header">
        <span class="section-title" style="margin:0">Trades on ${formatDate(date)}</span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-trade-day">+ Add Trade</button>
      </div>
      ${dayTrades.length
        ? renderTradesList(dayTrades, state.settings)
        : '<p class="text-muted card" style="padding:24px;text-align:center">No trades logged for this day.</p>'}
    </div>
  `;
}

function renderCalendar(state, year, month) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const daily = getDailyStats(state.trades);
  const firstDay = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();
  const monthName = new Date(y, m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = todayISO();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= totalDays; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const pnl = daily[iso]?.pnl;
    const isFuture = iso > today;
    const isToday = iso === today;
    const cls = [
      isFuture ? 'future' : '',
      isToday ? 'today' : '',
      pnl > 0 ? 'profit-day' : pnl < 0 ? 'loss-day' : '',
    ].filter(Boolean).join(' ');

    const pnlLabel = pnl !== undefined
      ? `<span class="day-pnl ${pnlClass(pnl)}">${pnl >= 0 ? '+' : ''}${Math.round(pnl)}</span>`
      : '';

    cells += `<button type="button" class="cal-day ${cls}" data-date="${iso}" ${isFuture ? 'disabled' : ''}>
      <span class="day-num">${d}</span>${pnlLabel}
    </button>`;
  }

  const monthPnl = getMonthlyPnlFromDaily(daily, y, m);

  return `
    <div class="card">
      <div class="calendar-header">
        <button type="button" class="btn-icon" id="cal-prev" aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <div class="calendar-month">${monthName}</div>
          <div class="stat-sub ${pnlClass(monthPnl)}">${formatCurrency(monthPnl, state.settings)}</div>
        </div>
        <button type="button" class="btn-icon" id="cal-next" aria-label="Next month" ${m === now.getMonth() && y === now.getFullYear() ? 'disabled style="opacity:0.3"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="calendar-grid">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-day-name">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
    <p class="text-muted mt-16" style="font-size:0.875rem">Tap a day to open journal & trades.</p>
  `;
}

function getMonthlyPnlFromDaily(daily, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return Object.entries(daily)
    .filter(([d]) => d.startsWith(prefix))
    .reduce((s, [, v]) => s + v.pnl, 0);
}

function renderAnalytics(state) {
  const { trades, settings } = state;
  const stats = getStats(trades, settings);
  const setups = getSetupStats(trades);
  const daily = getDailyStats(trades);
  const last14 = Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const dailyChartData = last14.map(([d, v]) => ({
    label: formatDate(d).replace(/, \d{4}/, ''),
    value: v.pnl,
  }));
  const cum = getCumulativePnl(trades);
  const equityData = cum.map(c => ({ label: formatDate(c.date), value: c.cumulative }));

  return `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value neutral">${stats.winRate.toFixed(1)}%</div><div class="stat-sub">${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE</div></div>
      <div class="stat-card"><div class="stat-label">Avg Win</div><div class="stat-value profit">${formatCurrency(stats.avgWin, settings)}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Loss</div><div class="stat-value loss">${formatCurrency(stats.avgLoss, settings)}</div></div>
      <div class="stat-card"><div class="stat-label">Expectancy</div><div class="stat-value ${pnlClass(stats.expectancy)}">${formatCurrency(stats.expectancy, settings)}</div></div>
      <div class="stat-card"><div class="stat-label">Profit Factor</div><div class="stat-value neutral">${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</div></div>
      <div class="stat-card"><div class="stat-label">Best Trade</div><div class="stat-value profit">${formatCurrency(stats.bestTrade, settings)}</div></div>
      <div class="stat-card"><div class="stat-label">Worst Trade</div><div class="stat-value loss">${formatCurrency(stats.worstTrade, settings)}</div></div>
      <div class="stat-card"><div class="stat-label">Avg R-Multiple</div><div class="stat-value ${pnlClass(stats.avgR)}">${stats.avgR.toFixed(2)}R</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Cumulative P&L</span></div>
        <div class="chart-container"><canvas id="chart-equity"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Last 14 Trading Days</span></div>
        <div class="chart-container"><canvas id="chart-daily"></canvas></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Win / Loss Distribution</span></div>
        <div class="chart-container"><canvas id="chart-winloss"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Trades by Setup</span></div>
        <div class="chart-container"><canvas id="chart-setup"></canvas></div>
      </div>
    </div>

    ${setups.length ? `
    <div class="section card">
      <div class="card-header"><span class="card-title">Setup Performance</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Setup</th><th>Trades</th><th>Win Rate</th><th>Total P&L</th></tr></thead>
          <tbody>
            ${setups.map(s => `<tr>
              <td>${escapeHtml(s.setup)}</td>
              <td>${s.count}</td>
              <td>${s.winRate.toFixed(1)}%</td>
              <td class="td-mono ${pnlClass(s.pnl)}">${formatCurrency(s.pnl, settings)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <script type="application/json" id="chart-data-equity">${JSON.stringify(equityData)}</script>
    <script type="application/json" id="chart-data-daily">${JSON.stringify(dailyChartData)}</script>
    <script type="application/json" id="chart-data-setup">${JSON.stringify(setups)}</script>
    <script type="application/json" id="chart-data-stats">${JSON.stringify(stats)}</script>
  `;
}

function renderRules(state) {
  const compliance = getRulesCompliance(state.dailyLogs, state.rules);
  const activeCount = state.rules.filter(r => r.active).length;

  return `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-label">Active Rules</div><div class="stat-value neutral">${activeCount}</div></div>
      <div class="stat-card"><div class="stat-label">Compliance Rate</div><div class="stat-value ${compliance.rate >= 80 ? 'profit' : 'loss'}">${compliance.rate.toFixed(0)}%</div></div>
      <div class="stat-card"><div class="stat-label">Perfect Days</div><div class="stat-value profit">${compliance.perfect}</div></div>
    </div>

    <div class="card section">
      <div class="card-header">
        <span class="card-title">Your Trading Rules</span>
        <button type="button" class="btn btn-primary btn-sm" id="btn-add-rule">+ Add Rule</button>
      </div>
      <div id="rules-list">
        ${state.rules.map((rule, i) => `
          <div class="checkbox-item" style="margin-bottom:8px;cursor:default" data-rule-id="${rule.id}">
            <input type="checkbox" class="rule-active" data-id="${rule.id}" ${rule.active ? 'checked' : ''} />
            <span style="flex:1">${escapeHtml(rule.text)}</span>
            <button type="button" class="btn-icon btn-edit-rule" data-id="${rule.id}" aria-label="Edit rule">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button type="button" class="btn-icon btn-delete-rule" data-id="${rule.id}" aria-label="Delete rule">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Why Rules Matter</span></div>
      <p style="color:var(--text-secondary);font-size:0.9375rem;line-height:1.6">
        Consistent rule-following is the foundation of profitable trading. Check your rules daily in the Journal page.
        Track compliance over time to identify discipline gaps before they cost you money.
      </p>
    </div>
  `;
}

function renderSettings(state, user = null) {
  const s = state.settings;
  const current = getPalette();
  const palettes = getPalettes();
  const email = user?.email ? escapeHtml(user.email) : '';

  return `
    <div class="card section">
      <div class="card-header"><span class="card-title">Cloud Account</span></div>
      <p class="text-muted mb-16" style="font-size:0.875rem">Signed in as <strong>${email}</strong>. Your journal syncs to Firebase automatically.</p>
      <button type="button" class="btn btn-secondary" id="btn-sign-out">Sign Out</button>
    </div>

    <div class="card section">
      <div class="card-header"><span class="card-title">Color Palette</span></div>
      <p class="text-muted mb-16" style="font-size:0.875rem">Choose a professional gradient theme for your journal.</p>
      <div class="palette-grid">
        ${palettes.map(p => `
          <button type="button" class="palette-card${p.id === current ? ' active' : ''}" data-palette="${p.id}">
            <div class="palette-card-preview" style="background:${p.swatch}"></div>
            <div class="palette-card-body">
              <div class="palette-card-name">${escapeHtml(p.label)}</div>
              <div class="palette-card-desc">${escapeHtml(p.desc)}</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="card section">
      <div class="card-header"><span class="card-title">Account Settings</span></div>
      <form id="settings-form">
        <div class="form-row cols-2">
          <div class="form-group">
            <label for="account-size">Account Size</label>
            <input type="number" id="account-size" value="${s.accountSize}" min="0" step="100" />
          </div>
          <div class="form-group">
            <label for="currency-symbol">Currency Symbol</label>
            <input type="text" id="currency-symbol" value="${escapeHtml(s.currencySymbol)}" maxlength="3" />
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label for="daily-loss-limit">Daily Loss Limit</label>
            <input type="number" id="daily-loss-limit" value="${s.dailyLossLimit}" min="0" step="50" />
          </div>
          <div class="form-group">
            <label for="daily-profit-target">Daily Profit Target</label>
            <input type="number" id="daily-profit-target" value="${s.dailyProfitTarget}" min="0" step="50" />
          </div>
          <div class="form-group">
            <label for="max-trades">Max Trades / Day</label>
            <input type="number" id="max-trades" value="${s.maxTradesPerDay}" min="1" max="50" />
          </div>
        </div>
        <div class="form-group">
          <label for="risk-pct">Default Risk Per Trade (%)</label>
          <input type="number" id="risk-pct" value="${s.riskPerTradePct}" min="0.1" max="10" step="0.1" />
        </div>
        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Data Management</span></div>
      <p class="text-muted mb-16" style="font-size:0.875rem">Data syncs to Firebase cloud and is cached locally. Export regularly for extra backup.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn btn-secondary" id="btn-export-settings">Export Backup</button>
        <label class="btn btn-secondary import-label">
          Import Backup
          <input type="file" id="import-settings" accept=".json" hidden />
        </label>
        <button type="button" class="btn btn-danger" id="btn-clear-data">Clear All Data</button>
      </div>
    </div>
  `;
}

export function initChartsForPage(page) {
  requestAnimationFrame(() => {
    const equityEl = document.getElementById('chart-equity');
    const equityData = document.getElementById('chart-data-equity');
    if (equityEl && equityData) {
      renderEquityChart(equityEl, JSON.parse(equityData.textContent));
    }

    const dailyEl = document.getElementById('chart-daily');
    const dailyData = document.getElementById('chart-data-daily');
    if (dailyEl && dailyData) {
      renderDailyPnlChart(dailyEl, JSON.parse(dailyData.textContent));
    }

    const setupEl = document.getElementById('chart-setup');
    const setupData = document.getElementById('chart-data-setup');
    if (setupEl && setupData) {
      renderSetupChart(setupEl, JSON.parse(setupData.textContent));
    }

    const winlossEl = document.getElementById('chart-winloss');
    const statsData = document.getElementById('chart-data-stats');
    if (winlossEl && statsData) {
      renderWinLossChart(winlossEl, JSON.parse(statsData.textContent));
    }
  });
}

export function tradeFormHtml(trade = null, defaultDate = null) {
  const t = trade || {};
  const now = new Date();
  const time = t.time || `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  return `
    <form id="trade-form" class="trade-form">
      <div class="form-row cols-2">
        <div class="form-group">
          <label for="trade-date">Date *</label>
          <input type="date" id="trade-date" value="${t.date || defaultDate || todayISO()}" max="${todayISO()}" required />
        </div>
        <div class="form-group">
          <label for="trade-time">Time</label>
          <input type="time" id="trade-time" value="${time}" />
        </div>
      </div>
      <div class="form-group">
        <label for="trade-symbol">Symbol *</label>
        <input type="text" id="trade-symbol" value="${escapeHtml(t.symbol || '')}" placeholder="e.g. AAPL, NIFTY, BTC" required autocomplete="off" />
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label for="trade-direction">Direction *</label>
          <select id="trade-direction" required>
            <option value="long" ${t.direction === 'long' || !t.direction ? 'selected' : ''}>Long (Buy)</option>
            <option value="short" ${t.direction === 'short' ? 'selected' : ''}>Short (Sell)</option>
          </select>
          <p class="field-hint">Option buying (call or put) = Long (Buy). Option selling = Short (Sell).</p>
        </div>
        <div class="form-group">
          <label for="trade-market">Market</label>
          <select id="trade-market">
            ${MARKETS.map(m => `<option value="${m}" ${t.market === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label for="trade-setup">Setup</label>
          <select id="trade-setup">
            <option value="">—</option>
            ${SETUPS.map(s => `<option value="${s}" ${t.setup === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="trade-quantity">Quantity *</label>
          <input type="number" id="trade-quantity" value="${t.quantity ?? ''}" min="0" step="any" required />
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label for="trade-entry">Entry Price *</label>
          <input type="number" id="trade-entry" value="${t.entryPrice ?? ''}" min="0" step="any" required />
        </div>
        <div class="form-group">
          <label for="trade-exit">Exit Price *</label>
          <input type="number" id="trade-exit" value="${t.exitPrice ?? ''}" min="0" step="any" required />
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label for="trade-fees">Fees / Commission</label>
          <input type="number" id="trade-fees" value="${t.fees ?? 0}" min="0" step="any" />
        </div>
        <div class="form-group">
          <label for="trade-risk">Risk Amount ($)</label>
          <input type="number" id="trade-risk" value="${t.riskAmount ?? ''}" min="0" step="any" placeholder="For R-multiple" />
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label for="trade-stop">Stop Loss</label>
          <input type="number" id="trade-stop" value="${t.stopLoss ?? ''}" min="0" step="any" />
        </div>
        <div class="form-group">
          <label for="trade-target">Take Profit</label>
          <input type="number" id="trade-target" value="${t.takeProfit ?? ''}" min="0" step="any" />
        </div>
      </div>
      <div class="form-group">
        <label for="trade-notes">Trade Notes</label>
        <textarea id="trade-notes" rows="3" placeholder="Entry reason, execution quality, mistakes...">${escapeHtml(t.notes || '')}</textarea>
      </div>
      <label class="checkbox-item" style="margin-bottom:0">
        <input type="checkbox" id="trade-followed-rules" ${t.followedRules ? 'checked' : ''} />
        <span>Followed all trading rules for this trade</span>
      </label>
    </form>
  `;
}

export function parseTradeForm(form, existingId = null) {
  return {
    id: existingId || uid(),
    date: form.querySelector('#trade-date').value,
    time: form.querySelector('#trade-time').value || '09:30',
    symbol: form.querySelector('#trade-symbol').value.trim().toUpperCase(),
    market: form.querySelector('#trade-market').value,
    direction: form.querySelector('#trade-direction').value,
    setup: form.querySelector('#trade-setup').value,
    quantity: parseNum(form.querySelector('#trade-quantity').value),
    entryPrice: parseNum(form.querySelector('#trade-entry').value),
    exitPrice: parseNum(form.querySelector('#trade-exit').value),
    fees: parseNum(form.querySelector('#trade-fees').value),
    stopLoss: parseNum(form.querySelector('#trade-stop').value) || null,
    takeProfit: parseNum(form.querySelector('#trade-target').value) || null,
    riskAmount: parseNum(form.querySelector('#trade-risk').value) || null,
    notes: form.querySelector('#trade-notes').value.trim(),
    followedRules: form.querySelector('#trade-followed-rules').checked,
    createdAt: existingId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export { NAV_ITEMS as navItems };
