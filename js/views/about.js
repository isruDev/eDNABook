// js/views/about.js
import { showView, clearElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Application version string.
 * Hardcoded here because this is a no-build-step project with no access to package.json at runtime.
 *
 * @type {string}
 */
const APP_VERSION = '1.5.0';

/**
 * Renders the About view, populating the #about-content container with app name,
 * version, description, and a GitHub repository link.
 *
 * Wires the back button to navigate to home (#/).
 *
 * @returns {Promise<void>}
 * @example
 * // Called by the router when route is 'about'
 * await renderAbout();
 */
export async function renderAbout() {
  showView('about');

  const container = document.getElementById('about-content');
  if (!container) return;
  clearElement(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'about-info';

  const appName = document.createElement('h2');
  appName.className = 'about-app-name';
  appName.textContent = 'eDNALite';

  const version = document.createElement('p');
  version.className = 'about-version';
  version.textContent = `Version ${APP_VERSION}`;

  const description = document.createElement('p');
  description.className = 'about-description';
  description.textContent = 'Offline-first app for logging environmental DNA sample metadata in the field.';

  const linkRow = document.createElement('p');
  linkRow.className = 'about-link-row';

  const link = document.createElement('a');
  link.href = 'https://github.com/isruDev/eDNABook';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View on GitHub';

  linkRow.appendChild(link);

  wrapper.appendChild(appName);
  wrapper.appendChild(version);
  wrapper.appendChild(description);
  wrapper.appendChild(linkRow);
  container.appendChild(wrapper);

  const backBtn = document.querySelector('[data-view="about"] .btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('#/'));
  }
}
