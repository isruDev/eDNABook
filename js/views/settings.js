// js/views/settings.js
import { showView, clearElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Reads a setting from localStorage.
 *
 * @param {string} key - The setting key.
 * @param {string} defaultValue - Default if not set.
 * @returns {string} The stored value or default.
 */
export function getSetting(key, defaultValue) {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Writes a setting to localStorage.
 *
 * @param {string} key - The setting key.
 * @param {string} value - The value to store.
 * @returns {void}
 */
export function setSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

/**
 * Applies the current theme setting to the document.
 * Sets a data-theme attribute on <html> which CSS uses to override prefers-color-scheme.
 *
 * @returns {void}
 */
export function applyTheme() {
  const theme = getSetting('edna-theme', 'auto');
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Applies the current UI scale setting to the document.
 * Sets a --ui-scale CSS custom property on <html>.
 *
 * @returns {void}
 */
export function applyScale() {
  const scale = getSetting('edna-scale', '1');
  document.documentElement.style.setProperty('--ui-scale', scale);
}

/**
 * Renders the Settings view with theme switcher, UI scale control,
 * and a link to the changelog.
 *
 * @returns {Promise<void>}
 */
export async function renderSettings() {
  showView('settings');

  const container = document.getElementById('settings-content');
  if (!container) return;
  clearElement(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'settings-page';

  // Page title
  const title = document.createElement('h2');
  title.className = 'settings-title';
  title.textContent = 'Settings';
  wrapper.appendChild(title);

  // --- Theme section ---
  const themeSection = document.createElement('div');
  themeSection.className = 'settings-section';

  const themeLabel = document.createElement('h3');
  themeLabel.className = 'settings-section-title';
  themeLabel.textContent = 'Theme';
  themeSection.appendChild(themeLabel);

  const themeGroup = document.createElement('div');
  themeGroup.className = 'settings-toggle-group';

  const currentTheme = getSetting('edna-theme', 'auto');
  const themeOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  for (const opt of themeOptions) {
    const btn = document.createElement('button');
    btn.className = `settings-toggle-btn${opt.value === currentTheme ? ' active' : ''}`;
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    btn.addEventListener('click', () => {
      setSetting('edna-theme', opt.value);
      applyTheme();
      themeGroup.querySelectorAll('.settings-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    themeGroup.appendChild(btn);
  }

  themeSection.appendChild(themeGroup);
  wrapper.appendChild(themeSection);

  // --- UI Scale section ---
  const scaleSection = document.createElement('div');
  scaleSection.className = 'settings-section';

  const scaleLabel = document.createElement('h3');
  scaleLabel.className = 'settings-section-title';
  scaleLabel.textContent = 'Sample Form Scale';
  scaleSection.appendChild(scaleLabel);

  const scaleDesc = document.createElement('p');
  scaleDesc.className = 'settings-description';
  scaleDesc.textContent = 'Adjust the size of labels, inputs, and checkboxes on the sample entry form.';
  scaleSection.appendChild(scaleDesc);

  const scaleControls = document.createElement('div');
  scaleControls.className = 'settings-scale-controls';

  const currentScale = parseFloat(getSetting('edna-scale', '1'));

  const scaleDown = document.createElement('button');
  scaleDown.className = 'btn-secondary settings-scale-btn';
  scaleDown.id = 'scale-down-btn';
  scaleDown.textContent = '-';
  scaleDown.setAttribute('aria-label', 'Decrease scale');

  const scaleValue = document.createElement('span');
  scaleValue.className = 'settings-scale-value';
  scaleValue.id = 'scale-value';
  scaleValue.textContent = `${Math.round(currentScale * 100)}%`;

  const scaleUp = document.createElement('button');
  scaleUp.className = 'btn-secondary settings-scale-btn';
  scaleUp.id = 'scale-up-btn';
  scaleUp.textContent = '+';
  scaleUp.setAttribute('aria-label', 'Increase scale');

  const scaleReset = document.createElement('button');
  scaleReset.className = 'btn-secondary settings-scale-btn';
  scaleReset.id = 'scale-reset-btn';
  scaleReset.textContent = 'Reset';

  /**
   * Updates the scale value display and persists it.
   *
   * @param {number} newScale - The new scale factor (0.8 to 1.6).
   * @returns {void}
   */
  function updateScale(newScale) {
    const clamped = Math.max(0.8, Math.min(1.6, Math.round(newScale * 10) / 10));
    setSetting('edna-scale', String(clamped));
    applyScale();
    scaleValue.textContent = `${Math.round(clamped * 100)}%`;
  }

  scaleDown.addEventListener('click', () => {
    const cur = parseFloat(getSetting('edna-scale', '1'));
    updateScale(cur - 0.1);
  });

  scaleUp.addEventListener('click', () => {
    const cur = parseFloat(getSetting('edna-scale', '1'));
    updateScale(cur + 0.1);
  });

  scaleReset.addEventListener('click', () => {
    updateScale(1);
  });

  scaleControls.appendChild(scaleDown);
  scaleControls.appendChild(scaleValue);
  scaleControls.appendChild(scaleUp);
  scaleControls.appendChild(scaleReset);
  scaleSection.appendChild(scaleControls);
  wrapper.appendChild(scaleSection);

  // --- Changelog link ---
  const changelogSection = document.createElement('div');
  changelogSection.className = 'settings-section';

  const changelogBtn = document.createElement('button');
  changelogBtn.className = 'btn-secondary settings-changelog-btn';
  changelogBtn.textContent = 'View Changelog';
  changelogBtn.addEventListener('click', () => navigate('#/changelog'));
  changelogSection.appendChild(changelogBtn);
  wrapper.appendChild(changelogSection);

  container.appendChild(wrapper);

  // Wire back button
  const backBtn = document.querySelector('[data-view="settings"] .btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('#/'));
  }
}
