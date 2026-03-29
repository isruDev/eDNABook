// js/views/more-modal.js

/**
 * Navigates to a hash route by setting window.location.hash directly.
 * Used instead of importing navigate() from app.js to avoid circular imports
 * (app.js imports this module).
 *
 * @param {string} hash - The target hash, e.g. '#/about'.
 * @returns {void}
 */
function navigateTo(hash) {
  window.location.hash = hash;
}

/**
 * Menu item definitions for the More modal.
 * Each entry maps a display label to a hash route.
 *
 * @type {Array<{ label: string, route: string }>}
 */
const MENU_ITEMS = [
  { label: 'Settings',                 route: '#/settings' },
  { label: 'Offline Access (iOS)',     route: '#/offline/ios' },
  { label: 'Offline Access (Android)', route: '#/offline/android' },
  { label: 'About eDNALite',           route: '#/about' },
];

/**
 * Removes the More modal overlay from the DOM if it exists.
 *
 * Safe to call when no modal is open -- does nothing in that case.
 *
 * @returns {void}
 */
export function closeMoreModal() {
  const existing = document.querySelector('.more-modal-backdrop');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

/**
 * Opens the More modal by creating and appending modal DOM to document.body.
 *
 * The modal contains a header row (title + close button) and a menu list
 * with one tappable row per entry in MENU_ITEMS. Clicking a menu item
 * closes the modal and navigates to the corresponding hash route.
 * Clicking the backdrop or close button dismisses without navigating.
 *
 * The overlay is destroyed on close -- no persistent DOM.
 *
 * @returns {void}
 * @example
 * document.getElementById('more-btn').addEventListener('click', openMoreModal);
 */
export function openMoreModal() {
  closeMoreModal();

  const backdrop = document.createElement('div');
  backdrop.className = 'more-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'more-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'more-modal-title');

  const header = document.createElement('div');
  header.className = 'more-modal-header';

  const title = document.createElement('h2');
  title.id = 'more-modal-title';
  title.textContent = 'More';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'more-modal-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '\u00D7';
  closeBtn.addEventListener('click', closeMoreModal);

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'more-modal-list';

  for (const item of MENU_ITEMS) {
    const li = document.createElement('li');

    const btn = document.createElement('button');
    btn.className = 'more-modal-item';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      closeMoreModal();
      navigateTo(item.route);
    });

    li.appendChild(btn);
    list.appendChild(li);
  }

  modal.appendChild(list);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeMoreModal();
    }
  });
}
