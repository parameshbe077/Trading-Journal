export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatCurrency(n, settings = {}) {
  const sym = settings.currencySymbol ?? '$';
  const sign = n >= 0 ? '' : '-';
  return `${sign}${sym}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(n) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const d = new Date();
  d.setHours(+h, +m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function parseNum(v) {
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const MOODS = [
  { id: 'confident', label: '😎 Confident' },
  { id: 'calm', label: '😌 Calm' },
  { id: 'neutral', label: '😐 Neutral' },
  { id: 'anxious', label: '😰 Anxious' },
  { id: 'frustrated', label: '😤 Frustrated' },
  { id: 'fomo', label: '🤑 FOMO' },
  { id: 'revenge', label: '😡 Revenge' },
];

export const SETUPS = [
  'Breakout', 'Pullback', 'Reversal', 'Trend Follow', 'Range', 'News', 'Scalp', 'Swing', 'Other'
];

export const MARKETS = ['Stocks', 'Options', 'Futures', 'Forex', 'Crypto', 'Other'];

export const DEFAULT_RULES = [
  { id: 'rule-1', text: 'Only trade pre-defined setups', active: true },
  { id: 'rule-2', text: 'Risk max 1% per trade', active: true },
  { id: 'rule-3', text: 'Stop loss set before entry', active: true },
  { id: 'rule-4', text: 'No revenge trading', active: true },
  { id: 'rule-5', text: 'Max 3 trades per day', active: true },
  { id: 'rule-6', text: 'Journal every trade same day', active: true },
];

export function defaultSettings() {
  return {
    accountSize: 25000,
    currencySymbol: '$',
    dailyLossLimit: 500,
    dailyProfitTarget: 1000,
    maxTradesPerDay: 3,
    riskPerTradePct: 1,
  };
}

export function defaultState() {
  return {
    version: 1,
    settings: defaultSettings(),
    rules: DEFAULT_RULES.map(r => ({ ...r })),
    trades: [],
    dailyLogs: [],
  };
}

export function calcTradePnl(trade) {
  const qty = parseNum(trade.quantity);
  const entry = parseNum(trade.entryPrice);
  const exit = parseNum(trade.exitPrice);
  const fees = parseNum(trade.fees);
  const mult = trade.direction === 'short' ? -1 : 1;
  return (exit - entry) * qty * mult - fees;
}

export function calcRMultiple(trade, settings) {
  const pnl = calcTradePnl(trade);
  const risk = parseNum(trade.riskAmount);
  if (risk > 0) return pnl / risk;
  const account = settings?.accountSize ?? 25000;
  const riskPct = settings?.riskPerTradePct ?? 1;
  const impliedRisk = account * (riskPct / 100);
  return impliedRisk > 0 ? pnl / impliedRisk : 0;
}
