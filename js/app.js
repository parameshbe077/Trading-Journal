import { loadState, saveState, exportData, importData, clearState, setStorageUser, clearStorageUser } from './storage.js';
import { renderNav, renderPage, initChartsForPage, tradeFormHtml, parseTradeForm, NAV_ITEMS } from './views.js';
import { uid, todayISO, defaultState } from './utils.js';
import { setPalette } from './theme.js';
import { watchAuth, signOutUser, authScreenHtml, bindAuthScreen } from './auth.js';

class App {
  constructor() {
    this.state = defaultState();
    this.page = 'dashboard';
    this.ctx = { filters: {}, date: todayISO(), calYear: new Date().getFullYear(), calMonth: new Date().getMonth() };
    this.editingTradeId = null;
    this.booted = false;
    this.user = null;

    this.els = {
      app: document.getElementById('app'),
      authScreen: document.getElementById('auth-screen'),
      authContent: document.getElementById('auth-content'),
      authLoading: document.getElementById('auth-loading'),
      content: document.getElementById('content'),
      pageTitle: document.getElementById('page-title'),
      desktopNav: document.getElementById('desktop-nav'),
      bottomNav: document.getElementById('bottom-nav'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalTitle: document.getElementById('modal-title'),
      modalBody: document.getElementById('modal-body'),
      modalFooter: document.getElementById('modal-footer'),
      sidebar: document.getElementById('sidebar'),
      sidebarOverlay: document.getElementById('sidebar-overlay'),
      toastContainer: document.getElementById('toast-container'),
    };

    this.bindGlobal();
    window.addEventListener('palettechange', e => {
      initChartsForPage(this.page);
      window.TradeVaultTheme?.updatePickerUI(e.detail.palette);
    });
  }

  start() {
    this.els.authContent.innerHTML = authScreenHtml();
    bindAuthScreen(this.els.authContent);

    watchAuth(async user => {
      if (!user) {
        this.user = null;
        clearStorageUser();
        this.showAuth();
        return;
      }

      this.user = user;
      setStorageUser(user.uid);
      this.showLoading('Loading your journal…');

      try {
        this.state = await loadState(user.uid);
      } catch (err) {
        this.toast(err.message, 'error');
        this.state = defaultState();
      }

      this.hideAuth();
      if (!this.booted) {
        this.booted = true;
        this.navigate('dashboard');
      } else {
        this.navigate(this.page, this.ctx);
      }
    });
  }

  showAuth() {
    this.els.authScreen.classList.remove('hidden');
    this.els.app.classList.add('hidden');
    this.els.authLoading.classList.add('hidden');
    this.els.authContent.classList.remove('hidden');
  }

  showLoading(msg) {
    this.els.authScreen.classList.remove('hidden');
    this.els.app.classList.add('hidden');
    this.els.authContent.classList.add('hidden');
    this.els.authLoading.classList.remove('hidden');
    this.els.authLoading.querySelector('p').textContent = msg;
  }

  hideAuth() {
    this.els.authScreen.classList.add('hidden');
    this.els.app.classList.remove('hidden');
  }

  persist() {
    saveState(this.state);
  }

  toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    this.els.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  bindGlobal() {
    document.getElementById('btn-menu').addEventListener('click', () => this.toggleSidebar(true));
    this.els.sidebarOverlay.addEventListener('click', () => this.toggleSidebar(false));
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    this.els.modalBackdrop.addEventListener('click', e => {
      if (e.target === this.els.modalBackdrop) this.closeModal();
    });

    document.getElementById('btn-quick-trade').addEventListener('click', () => this.openTradeModal());
    document.getElementById('btn-export').addEventListener('click', () => {
      exportData(this.state);
      this.toast('Backup exported');
    });
    document.getElementById('import-file').addEventListener('change', e => this.handleImport(e.target));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  toggleSidebar(open) {
    this.els.sidebar.classList.toggle('open', open);
    this.els.sidebarOverlay.classList.toggle('visible', open);
  }

  navigate(page, ctxPatch = {}) {
    this.page = page;
    Object.assign(this.ctx, ctxPatch);
    this.toggleSidebar(false);

    const item = NAV_ITEMS.find(n => n.id === page);
    this.els.pageTitle.textContent = item?.label ?? 'Dashboard';

    renderNav(page, this.els.desktopNav);
    renderNav(page, this.els.bottomNav);

    this.els.content.innerHTML = renderPage(page, this.state, this.ctx, this.user);
    initChartsForPage(page);
    this.bindPageEvents();
  }

  bindPageEvents() {
    const { content } = this.els;

    content.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });

    this.els.desktopNav.querySelectorAll('[data-page]').forEach(btn => {
      btn.onclick = () => this.navigate(btn.dataset.page);
    });
    this.els.bottomNav.querySelectorAll('[data-page]').forEach(btn => {
      btn.onclick = () => this.navigate(btn.dataset.page);
    });

    content.querySelector('#btn-empty-trade')?.addEventListener('click', () => this.openTradeModal());
    content.querySelectorAll('.btn-edit-trade').forEach(btn => {
      btn.addEventListener('click', () => this.openTradeModal(btn.dataset.id));
    });
    content.querySelectorAll('.btn-delete-trade').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTrade(btn.dataset.id));
    });

    content.querySelector('#btn-apply-filters')?.addEventListener('click', () => {
      this.ctx.filters = {
        from: content.querySelector('#filter-from')?.value,
        to: content.querySelector('#filter-to')?.value,
        symbol: content.querySelector('#filter-symbol')?.value,
        setup: content.querySelector('#filter-setup')?.value,
        direction: content.querySelector('#filter-direction')?.value,
        result: content.querySelector('#filter-result')?.value,
      };
      this.navigate('trades');
    });

    content.querySelector('#journal-date')?.addEventListener('change', e => {
      this.navigate('journal', { date: e.target.value });
    });

    content.querySelector('#btn-save-journal')?.addEventListener('click', () => this.saveJournal());
    content.querySelector('#btn-add-trade-day')?.addEventListener('click', () => {
      this.openTradeModal(null, this.ctx.date);
    });

    content.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    this.updateRulesScore();

    content.querySelector('#rule-checks')?.addEventListener('change', () => this.updateRulesScore());

    content.querySelector('#cal-prev')?.addEventListener('click', () => {
      let { calYear, calMonth } = this.ctx;
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      this.navigate('calendar', { calYear, calMonth });
    });

    content.querySelector('#cal-next')?.addEventListener('click', () => {
      let { calYear, calMonth } = this.ctx;
      const now = new Date();
      if (calYear === now.getFullYear() && calMonth >= now.getMonth()) return;
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      this.navigate('calendar', { calYear, calMonth });
    });

    content.querySelectorAll('.cal-day[data-date]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate('journal', { date: btn.dataset.date }));
    });

    content.querySelector('#btn-add-rule')?.addEventListener('click', () => this.openRuleModal());
    content.querySelectorAll('.rule-active').forEach(cb => {
      cb.addEventListener('change', () => {
        const rule = this.state.rules.find(r => r.id === cb.dataset.id);
        if (rule) { rule.active = cb.checked; this.persist(); }
      });
    });
    content.querySelectorAll('.btn-edit-rule').forEach(btn => {
      btn.addEventListener('click', () => this.openRuleModal(btn.dataset.id));
    });
    content.querySelectorAll('.btn-delete-rule').forEach(btn => {
      btn.addEventListener('click', () => this.deleteRule(btn.dataset.id));
    });

    content.querySelector('#settings-form')?.addEventListener('submit', e => {
      e.preventDefault();
      this.saveSettings();
    });
    content.querySelectorAll('.palette-card').forEach(btn => {
      btn.addEventListener('click', () => setPalette(btn.dataset.palette));
    });
    content.querySelector('#btn-export-settings')?.addEventListener('click', () => {
      exportData(this.state);
      this.toast('Backup exported');
    });
    content.querySelector('#import-settings')?.addEventListener('change', e => this.handleImport(e.target));
    content.querySelector('#btn-clear-data')?.addEventListener('click', () => this.clearData());
    content.querySelector('#btn-sign-out')?.addEventListener('click', () => this.handleSignOut());
  }

  updateRulesScore() {
    const container = this.els.content.querySelector('#rule-checks');
    const scoreEl = this.els.content.querySelector('#rules-score');
    if (!container || !scoreEl) return;
    const total = container.querySelectorAll('input[name="rule"]').length;
    const checked = container.querySelectorAll('input[name="rule"]:checked').length;
    const pct = total ? Math.round((checked / total) * 100) : 0;
    scoreEl.textContent = `${checked}/${total} rules followed (${pct}%)`;
    scoreEl.className = `stat-sub mt-16 ${pct === 100 ? 'text-profit' : pct >= 50 ? '' : 'text-loss'}`;
  }

  openModal(title, bodyHtml, footerHtml) {
    this.els.modalTitle.textContent = title;
    this.els.modalBody.innerHTML = bodyHtml;
    this.els.modalFooter.innerHTML = footerHtml;
    this.els.modalBackdrop.classList.add('open');
    this.els.modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const firstInput = this.els.modalBody.querySelector('input, select, textarea');
      firstInput?.focus();
    });
  }

  closeModal() {
    this.els.modalBackdrop.classList.remove('open');
    this.els.modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.editingTradeId = null;
  }

  openTradeModal(tradeId = null, defaultDate = null) {
    const trade = tradeId ? this.state.trades.find(t => t.id === tradeId) : null;
    this.editingTradeId = tradeId;

    this.openModal(
      trade ? 'Edit Trade' : 'New Trade',
      tradeFormHtml(trade, defaultDate),
      `<button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
       <button type="button" class="btn btn-primary" id="modal-save-trade">${trade ? 'Update' : 'Save'} Trade</button>`
    );

    document.getElementById('modal-cancel').onclick = () => this.closeModal();
    document.getElementById('modal-save-trade').onclick = () => this.saveTrade();
  }

  saveTrade() {
    const form = document.getElementById('trade-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const trade = parseTradeForm(form, this.editingTradeId);
    if (this.editingTradeId) {
      const idx = this.state.trades.findIndex(t => t.id === this.editingTradeId);
      if (idx >= 0) {
        trade.createdAt = this.state.trades[idx].createdAt;
        this.state.trades[idx] = trade;
      }
    } else {
      this.state.trades.push(trade);
    }

    const wasEdit = !!this.editingTradeId;
    this.persist();
    this.closeModal();
    this.toast(wasEdit ? 'Trade updated' : 'Trade saved');
    this.navigate(this.page, this.ctx);
  }

  deleteTrade(id) {
    if (!confirm('Delete this trade? This cannot be undone.')) return;
    this.state.trades = this.state.trades.filter(t => t.id !== id);
    this.persist();
    this.toast('Trade deleted', 'error');
    this.navigate(this.page, this.ctx);
  }

  saveJournal() {
    const date = this.els.content.querySelector('#journal-date').value;
    const ruleChecks = {};
    this.els.content.querySelectorAll('input[name="rule"]').forEach(cb => {
      ruleChecks[cb.value] = cb.checked;
    });

    const moodBtn = this.els.content.querySelector('.mood-btn.selected');
    const entry = {
      id: uid(),
      date,
      ruleChecks,
      mood: moodBtn?.dataset.mood || '',
      preMarket: this.els.content.querySelector('#pre-market').value.trim(),
      postMarket: this.els.content.querySelector('#post-market').value.trim(),
      lessons: this.els.content.querySelector('#lessons').value.trim(),
      updatedAt: new Date().toISOString(),
    };

    const idx = this.state.dailyLogs.findIndex(l => l.date === date);
    if (idx >= 0) {
      entry.id = this.state.dailyLogs[idx].id;
      entry.createdAt = this.state.dailyLogs[idx].createdAt;
      this.state.dailyLogs[idx] = entry;
    } else {
      entry.createdAt = new Date().toISOString();
      this.state.dailyLogs.push(entry);
    }

    this.persist();
    this.toast('Journal entry saved');
  }

  openRuleModal(ruleId = null) {
    const rule = ruleId ? this.state.rules.find(r => r.id === ruleId) : null;
    this.openModal(
      rule ? 'Edit Rule' : 'Add Rule',
      `<form id="rule-form">
        <div class="form-group">
          <label for="rule-text">Rule description *</label>
          <input type="text" id="rule-text" value="${rule?.text ?? ''}" placeholder="e.g. Only trade A+ setups" required />
        </div>
        <label><input type="checkbox" id="rule-active" ${rule?.active !== false ? 'checked' : ''} /> Active</label>
      </form>`,
      `<button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
       <button type="button" class="btn btn-primary" id="modal-save-rule">Save</button>`
    );

    document.getElementById('modal-cancel').onclick = () => this.closeModal();
    document.getElementById('modal-save-rule').onclick = () => {
      const text = document.getElementById('rule-text').value.trim();
      if (!text) return;
      const active = document.getElementById('rule-active').checked;

      if (rule) {
        rule.text = text;
        rule.active = active;
      } else {
        this.state.rules.push({ id: uid(), text, active });
      }
      this.persist();
      this.closeModal();
      this.toast('Rule saved');
      this.navigate('rules');
    };
  }

  deleteRule(id) {
    if (!confirm('Delete this rule?')) return;
    this.state.rules = this.state.rules.filter(r => r.id !== id);
    this.persist();
    this.navigate('rules');
  }

  saveSettings() {
    const form = this.els.content.querySelector('#settings-form');
    this.state.settings = {
      accountSize: parseFloat(form.querySelector('#account-size').value) || 0,
      currencySymbol: form.querySelector('#currency-symbol').value || '$',
      dailyLossLimit: parseFloat(form.querySelector('#daily-loss-limit').value) || 0,
      dailyProfitTarget: parseFloat(form.querySelector('#daily-profit-target').value) || 0,
      maxTradesPerDay: parseInt(form.querySelector('#max-trades').value) || 3,
      riskPerTradePct: parseFloat(form.querySelector('#risk-pct').value) || 1,
    };
    this.persist();
    this.toast('Settings saved');
  }

  async handleImport(input) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.state = await importData(file);
      this.persist();
      this.toast('Data imported successfully');
      this.navigate('dashboard');
    } catch (e) {
      this.toast(e.message, 'error');
    }
    input.value = '';
  }

  async clearData() {
    if (!confirm('Delete ALL journal data? This cannot be undone. Export a backup first if needed.')) return;
    if (!this.user) return;
    await clearState(this.user.uid);
    this.state = defaultState();
    this.persist();
    this.toast('All data cleared', 'error');
    this.navigate('dashboard');
  }

  async handleSignOut() {
    try {
      await signOutUser();
      this.toast('Signed out');
    } catch (e) {
      this.toast(e.message, 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new App().start());
