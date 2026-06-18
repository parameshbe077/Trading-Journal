(function () {
  'use strict';

  var PALETTE_KEY = 'tradevault_palette';
  var LEGACY_THEME_KEY = 'tradevault_theme';
  var DEFAULT_PALETTE = 'midnight';

  var PALETTES = [
    { id: 'midnight', label: 'Midnight', desc: 'Deep navy & indigo', themeColor: '#0a0e14', swatch: 'linear-gradient(135deg, #1e3a5f, #6366f1)' },
    { id: 'ocean', label: 'Ocean', desc: 'Teal & cyan depths', themeColor: '#061218', swatch: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' },
    { id: 'aurora', label: 'Aurora', desc: 'Violet & emerald glow', themeColor: '#0a0814', swatch: 'linear-gradient(135deg, #8b5cf6, #10b981)' },
    { id: 'ember', label: 'Ember', desc: 'Amber & crimson warmth', themeColor: '#100808', swatch: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    { id: 'forest', label: 'Forest', desc: 'Sage & teal greens', themeColor: '#060f0a', swatch: 'linear-gradient(135deg, #22c55e, #14b8a6)' },
    { id: 'slate', label: 'Slate', desc: 'Cool graphite tones', themeColor: '#0c0e12', swatch: 'linear-gradient(135deg, #94a3b8, #64748b)' },
    { id: 'royal', label: 'Royal', desc: 'Gold & sapphire luxury', themeColor: '#080818', swatch: 'linear-gradient(135deg, #eab308, #3b82f6)' },
    { id: 'pearl', label: 'Pearl', desc: 'Soft lavender light', themeColor: '#f0edf6', swatch: 'linear-gradient(135deg, #7c3aed, #e8e2f2)' },
    { id: 'dawn', label: 'Dawn', desc: 'Warm peach & gold', themeColor: '#faf5ee', swatch: 'linear-gradient(135deg, #ea580c, #f59e0b)' },
  ];

  var PALETTE_IDS = PALETTES.map(function (p) { return p.id; });

  function getPaletteMeta(id) {
    for (var i = 0; i < PALETTES.length; i++) {
      if (PALETTES[i].id === id) return PALETTES[i];
    }
    return PALETTES[0];
  }

  function resolvePalette() {
    try {
      var stored = localStorage.getItem(PALETTE_KEY);
      if (stored && PALETTE_IDS.indexOf(stored) >= 0) return stored;

      var legacy = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacy === 'light') return 'pearl';
      if (legacy === 'dark') return 'midnight';
    } catch (e) {}
    return DEFAULT_PALETTE;
  }

  function getPalette() {
    return resolvePalette();
  }

  function getAppliedPalette() {
    var attr = document.documentElement.getAttribute('data-palette');
    return attr && PALETTE_IDS.indexOf(attr) >= 0 ? attr : DEFAULT_PALETTE;
  }

  function applyPalette(id, silent) {
    if (PALETTE_IDS.indexOf(id) < 0) id = DEFAULT_PALETTE;

    document.documentElement.setAttribute('data-palette', id);
    document.documentElement.removeAttribute('data-theme');

    var meta = getPaletteMeta(id);
    var themeColorEl = document.querySelector('meta[name="theme-color"]');
    if (themeColorEl) themeColorEl.content = meta.themeColor;

    updatePickerUI(id);

    if (!silent) {
      window.dispatchEvent(new CustomEvent('palettechange', { detail: { palette: id } }));
    }
  }

  function setPalette(id) {
    try {
      localStorage.setItem(PALETTE_KEY, id);
      localStorage.removeItem(LEGACY_THEME_KEY);
    } catch (e) {}
    applyPalette(id);
  }

  function initPalette() {
    applyPalette(resolvePalette(), true);
  }

  function updatePickerUI(activeId) {
    var swatch = document.getElementById('palette-swatch-current');
    if (swatch) swatch.style.background = getPaletteMeta(activeId).swatch;

    document.querySelectorAll('.palette-option').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.palette === activeId);
    });

    document.querySelectorAll('.palette-card').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.palette === activeId);
    });
  }

  function buildPaletteMenu() {
    var menu = document.getElementById('palette-menu');
    if (!menu || menu.dataset.built) return;

    menu.innerHTML = '<div class="palette-menu-title">Color palette</div>' +
      PALETTES.map(function (p) {
        return '<button type="button" class="palette-option" data-palette="' + p.id + '">' +
          '<span class="palette-option-swatch" style="background:' + p.swatch + '"></span>' +
          '<span class="palette-option-info">' +
          '<span class="palette-option-name">' + p.label + '</span>' +
          '<span class="palette-option-desc">' + p.desc + '</span>' +
          '</span></button>';
      }).join('');

    menu.dataset.built = '1';

    menu.querySelectorAll('.palette-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPalette(btn.dataset.palette);
        menu.classList.remove('open');
      });
    });
  }

  function bindPalettePicker() {
    buildPaletteMenu();

    var btn = document.getElementById('btn-palette');
    var menu = document.getElementById('palette-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  window.TradeVaultTheme = {
    PALETTES: PALETTES,
    getPalettes: function () { return PALETTES.slice(); },
    getPalette: getPalette,
    getAppliedPalette: getAppliedPalette,
    applyPalette: applyPalette,
    setPalette: setPalette,
    initPalette: initPalette,
    getPaletteMeta: getPaletteMeta,
    updatePickerUI: updatePickerUI,
    // legacy aliases
    getTheme: getPalette,
    setTheme: setPalette,
    applyTheme: applyPalette,
    initTheme: initPalette,
  };

  document.addEventListener('DOMContentLoaded', function () {
    initPalette();
    bindPalettePicker();
  });
})();
