# TradeVault — Professional Trading Journal

A full-featured, mobile-friendly trading journal that runs entirely in your browser. No server or installation required — your data stays private in local storage.

## Features

### Dashboard
- Today, weekly, monthly, and all-time P&L at a glance
- Equity curve chart
- Win rate, profit factor, average R-multiple
- Rules compliance percentage
- Win/loss streak tracking
- Recent trades list

### Trade Log
- Log long/short trades with full details (symbol, entry/exit, quantity, fees)
- Setup type, market, stop loss, take profit
- R-multiple calculation
- Per-trade rules compliance flag
- Filter by date, symbol, setup, direction, result
- Mobile card view + desktop table view

### Daily Journal
- Date-based journal entries
- **Rules checklist** — mark which rules you followed each day
- Mood tracking (confident, calm, anxious, FOMO, revenge, etc.)
- Pre-market plan, post-market review, lessons learned
- View all trades for that day

### Calendar
- Visual month view with profit/loss color coding
- Tap any day to open journal + trades
- Monthly P&L summary

### Analytics
- Win rate, avg win/loss, expectancy, profit factor
- Cumulative P&L and daily P&L charts
- Win/loss distribution
- Setup performance breakdown

### Rules Management
- Define your trading rules
- Toggle rules active/inactive
- Track compliance rate and perfect days

### Settings
- Account size, currency symbol
- Daily loss limit & profit target
- Max trades per day, risk per trade %
- Export/import JSON backup
- Clear all data

## How to Run

**Option 1 — Open directly**
Double-click `index.html` in your browser.

**Option 2 — Local server (recommended)**
```bash
# Python
python -m http.server 8080

# Node.js (if installed)
npx serve .
```
Then open `http://localhost:8080`

## Data Storage

All data is stored in your browser's `localStorage` under the key `tradevault_journal`. Use **Export** regularly to back up your journal as a JSON file.

## Tech Stack

- Vanilla HTML, CSS, JavaScript (ES modules)
- Chart.js for analytics charts
- No build step required
- Mobile-first responsive design
