import { calcTradePnl, calcRMultiple, parseNum, monthKey } from './utils.js';

export function getTradesForDate(trades, date) {
  return trades.filter(t => t.date === date);
}

export function getDailyPnl(trades, date) {
  return getTradesForDate(trades, date).reduce((s, t) => s + calcTradePnl(t), 0);
}

export function getCumulativePnl(trades) {
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  let cum = 0;
  return sorted.map(t => {
    cum += calcTradePnl(t);
    return { date: t.date, pnl: calcTradePnl(t), cumulative: cum, trade: t };
  });
}

export function getStats(trades, settings) {
  if (!trades.length) {
    return {
      totalPnl: 0, winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0,
      totalTrades: 0, wins: 0, losses: 0, breakeven: 0,
      avgR: 0, bestTrade: 0, worstTrade: 0, expectancy: 0,
    };
  }

  const pnls = trades.map(t => calcTradePnl(t));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const breakeven = pnls.filter(p => p === 0);

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  const rs = trades.map(t => calcRMultiple(t, settings));

  return {
    totalPnl,
    winRate: (wins.length / trades.length) * 100,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    avgR: rs.reduce((a, b) => a + b, 0) / rs.length,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    expectancy: totalPnl / trades.length,
  };
}

export function getDailyStats(trades) {
  const byDay = {};
  for (const t of trades) {
    if (!byDay[t.date]) byDay[t.date] = { pnl: 0, count: 0, wins: 0 };
    const p = calcTradePnl(t);
    byDay[t.date].pnl += p;
    byDay[t.date].count++;
    if (p > 0) byDay[t.date].wins++;
  }
  return byDay;
}

export function getMonthlyPnl(trades, year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  return trades
    .filter(t => t.date.startsWith(key))
    .reduce((s, t) => s + calcTradePnl(t), 0);
}

export function getSetupStats(trades) {
  const map = {};
  for (const t of trades) {
    const setup = t.setup || 'Other';
    if (!map[setup]) map[setup] = { count: 0, pnl: 0, wins: 0 };
    const p = calcTradePnl(t);
    map[setup].count++;
    map[setup].pnl += p;
    if (p > 0) map[setup].wins++;
  }
  return Object.entries(map)
    .map(([setup, d]) => ({ setup, ...d, winRate: (d.wins / d.count) * 100 }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function getRulesCompliance(dailyLogs, rules) {
  const activeRules = rules.filter(r => r.active);
  if (!activeRules.length || !dailyLogs.length) return { rate: 0, days: 0, perfect: 0 };

  let totalChecks = 0;
  let passed = 0;
  let perfect = 0;

  for (const log of dailyLogs) {
    if (!log.ruleChecks) continue;
    let dayPassed = 0;
    for (const rule of activeRules) {
      totalChecks++;
      if (log.ruleChecks[rule.id]) {
        passed++;
        dayPassed++;
      }
    }
    if (dayPassed === activeRules.length) perfect++;
  }

  return {
    rate: totalChecks ? (passed / totalChecks) * 100 : 0,
    days: dailyLogs.length,
    perfect,
  };
}

export function getStreak(trades) {
  const daily = getDailyStats(trades);
  const dates = Object.keys(daily).sort().reverse();
  let current = 0;
  let type = null;

  for (const d of dates) {
    const pnl = daily[d].pnl;
    const dayType = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be';
    if (type === null) { type = dayType; current = 1; }
    else if (dayType === type) current++;
    else break;
  }
  return { type, count: current };
}

export function filterTrades(trades, { from, to, symbol, setup, direction, result } = {}) {
  return trades.filter(t => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (symbol && !t.symbol.toLowerCase().includes(symbol.toLowerCase())) return false;
    if (setup && t.setup !== setup) return false;
    if (direction && t.direction !== direction) return false;
    if (result) {
      const p = calcTradePnl(t);
      if (result === 'win' && p <= 0) return false;
      if (result === 'loss' && p >= 0) return false;
      if (result === 'be' && p !== 0) return false;
    }
    return true;
  });
}

export function getThisWeekPnl(trades) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const startISO = start.toISOString().slice(0, 10);
  return trades
    .filter(t => t.date >= startISO)
    .reduce((s, t) => s + calcTradePnl(t), 0);
}

export function getThisMonthPnl(trades) {
  const mk = monthKey();
  return trades.filter(t => t.date.startsWith(mk)).reduce((s, t) => s + calcTradePnl(t), 0);
}

export function getTodayPnl(trades) {
  const today = new Date().toISOString().slice(0, 10);
  return getDailyPnl(trades, today);
}

export function getAvailableBalance(settings, trades) {
  const totalPnl = trades.reduce((sum, t) => sum + calcTradePnl(t), 0);
  return {
    balance: (settings?.accountSize ?? 0) + totalPnl,
    startingBalance: settings?.accountSize ?? 0,
    totalPnl,
  };
}
