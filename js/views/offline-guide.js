// js/views/offline-guide.js
import { showView, clearElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Platform-specific install step definitions.
 * Each step is a plain string instruction.
 *
 * @type {Record<'ios'|'android', string[]>}
 */
const INSTALL_STEPS = {
  ios: [
    'Open this page in Safari (not Chrome or other browsers).',
    'Tap the Share button (square with arrow) in the toolbar.',
    'Scroll down and tap "Add to Home Screen".',
    'Tap "Add" to confirm.',
  ],
  android: [
    'Open this page in Chrome and browse for at least 30 seconds.',
    'Tap the three-dot menu in the top-right corner.',
    'Tap "Add to Home Screen" or "Install App" (may not appear until Chrome detects engagement).',
    'Tap "Add" to confirm.',
  ],
};

/**
 * Platform-specific troubleshooting instructions for clearing cache.
 *
 * @type {Record<'ios'|'android', Array<{ browser: string, steps: string }>>}
 */
const TROUBLESHOOT = {
  ios: [
    {
      browser: 'Safari',
      steps: 'Settings > Safari > Advanced > Website Data > find this site and swipe to delete. Or tap "Clear History and Website Data" to clear all sites.',
    },
  ],
  android: [
    {
      browser: 'Chrome',
      steps: 'Settings > Privacy and Security > Clear Browsing Data > select "Cached images and files".',
    },
    {
      browser: 'Firefox',
      steps: 'Tap the shield icon in the address bar to clear cache for this specific site.',
    },
  ],
};

/**
 * Determines whether the service worker is active and controlling the page.
 *
 * @returns {boolean} True if navigator.serviceWorker.controller is set.
 */
function isOfflineReady() {
  return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
}

/**
 * Builds and returns the offline status indicator pill element.
 *
 * @returns {HTMLElement} A div with class `offline-status` and either `ready` or `not-ready`.
 */
function buildStatusPill() {
  const ready = isOfflineReady();
  const pill = document.createElement('div');
  pill.className = `offline-status ${ready ? 'ready' : 'not-ready'}`;
  pill.textContent = ready ? 'Ready for offline use' : 'Not ready for offline use';
  return pill;
}

/**
 * Builds and returns a numbered install step card.
 *
 * @param {number} index - Zero-based step index (displayed as 1-based).
 * @param {string} text - Instruction text for the step.
 * @returns {HTMLElement} A div with class `install-step`.
 */
function buildInstallStep(index, text) {
  const step = document.createElement('div');
  step.className = 'install-step';

  const num = document.createElement('span');
  num.className = 'install-step-number';
  num.textContent = String(index + 1);

  const label = document.createElement('p');
  label.className = 'install-step-text';
  label.textContent = text;

  step.appendChild(num);
  step.appendChild(label);
  return step;
}

/**
 * Builds and returns the troubleshooting section for the given platform.
 *
 * @param {'ios'|'android'} platform - The target platform.
 * @returns {HTMLElement} A section element containing per-browser cache-clearing instructions.
 */
function buildTroubleshootSection(platform) {
  const section = document.createElement('section');
  section.className = 'troubleshoot-section';

  const heading = document.createElement('h3');
  heading.className = 'troubleshoot-heading';
  heading.textContent = 'Troubleshooting: Clearing Cache';
  section.appendChild(heading);

  for (const entry of TROUBLESHOOT[platform]) {
    const browserLabel = document.createElement('p');
    browserLabel.className = 'troubleshoot-browser';
    browserLabel.textContent = entry.browser;

    const stepsText = document.createElement('p');
    stepsText.className = 'troubleshoot-steps';
    stepsText.textContent = entry.steps;

    section.appendChild(browserLabel);
    section.appendChild(stepsText);
  }

  return section;
}

/**
 * Renders the Offline Access guide view for the specified platform.
 *
 * Populates the `#offline-{platform}-content` container with:
 *   1. An offline status indicator pill (green/red based on SW controller state).
 *   2. Numbered install step cards (platform-specific).
 *   3. A troubleshooting section for cache clearing (platform-specific).
 *
 * Wires the back button to navigate to home (#/).
 *
 * @param {'ios'|'android'} platform - The platform to render instructions for.
 * @returns {Promise<void>}
 * @example
 * // Called by the router for route 'offline-ios'
 * await renderOfflineGuide('ios');
 */
export async function renderOfflineGuide(platform) {
  const viewName = `offline-${platform}`;
  showView(viewName);

  const contentId = `offline-${platform}-content`;
  const container = document.getElementById(contentId);
  if (!container) return;
  clearElement(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'offline-guide';

  const pageTitle = document.createElement('h2');
  pageTitle.className = 'offline-guide-title';
  pageTitle.textContent = platform === 'ios' ? 'Offline Access (iOS)' : 'Offline Access (Android)';

  const statusPill = buildStatusPill();

  const stepsHeading = document.createElement('h3');
  stepsHeading.className = 'install-steps-heading';
  stepsHeading.textContent = 'Install to Home Screen';

  wrapper.appendChild(pageTitle);
  wrapper.appendChild(statusPill);
  wrapper.appendChild(stepsHeading);

  for (const [i, text] of INSTALL_STEPS[platform].entries()) {
    wrapper.appendChild(buildInstallStep(i, text));
  }

  wrapper.appendChild(buildTroubleshootSection(platform));

  container.appendChild(wrapper);

  const backBtn = document.querySelector(`[data-view="${viewName}"] .btn-back`);
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('#/'));
  }
}
