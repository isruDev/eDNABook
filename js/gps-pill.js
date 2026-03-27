import { onGpsChange } from './gps.js';

/** @type {HTMLElement|null} */
let pillEl = null;

/** @type {number|null} */
let fadeTimeout = null;

/**
 * Initializes the GPS status pill and injects it into the DOM.
 * Subscribes to GPS status changes to update the pill display.
 * Safe to call multiple times -- only creates one pill.
 *
 * @returns {void}
 */
export function initGpsPill() {
  if (document.getElementById('gps-pill')) return;

  pillEl = document.createElement('div');
  pillEl.id = 'gps-pill';
  pillEl.className = 'gps-pill gps-pill-hidden';
  pillEl.innerHTML = '<span class="gps-dot"></span><span class="gps-text-prefix"></span><span class="gps-text-value"></span>';

  const header = document.getElementById('app-header');
  header.appendChild(pillEl);

  onGpsChange(updatePill);
}

/**
 * Updates the GPS pill DOM to reflect the current GPS status.
 *
 * @param {import('./gps.js').GpsStatus} status - Current GPS status.
 * @returns {void}
 */
function updatePill(status) {
  if (!pillEl) return;

  if (fadeTimeout) {
    clearTimeout(fadeTimeout);
    fadeTimeout = null;
  }

  pillEl.className = 'gps-pill';
  const prefixEl = pillEl.querySelector('.gps-text-prefix');
  const valueEl = pillEl.querySelector('.gps-text-value');

  switch (status.state) {
    case 'waiting':
      pillEl.classList.add('gps-pill-hidden');
      break;
    case 'locking':
      pillEl.classList.add('gps-locking');
      prefixEl.textContent = 'GPS ';
      valueEl.textContent = `${Math.round(status.accuracy)}m`;
      break;
    case 'locked':
      pillEl.classList.add('gps-locked');
      prefixEl.textContent = 'GPS ';
      valueEl.textContent = `${Math.round(status.accuracy)}m`;
      fadeTimeout = setTimeout(() => {
        pillEl.classList.add('gps-pill-hidden');
      }, 3000);
      break;
    case 'error':
      pillEl.classList.add('gps-error');
      prefixEl.textContent = '';
      valueEl.textContent = 'No GPS';
      break;
  }
}
