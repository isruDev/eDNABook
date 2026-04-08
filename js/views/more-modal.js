// js/views/more-modal.js
import { getAllProjects, createProject, parseProject } from '../db.js';
import { TEMPLATES } from '../templates.js';

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
 * Creates a new project from a template, resolving name collisions by
 * appending a number suffix (case-insensitive comparison against existing
 * project titles). Race-safe via the caller's button-disabled guard — no
 * internal latching needed because the only entry point is a modal menu
 * item that is closed after the async work completes.
 *
 * @param {import('../templates.js').ProjectTemplate} template - The template to instantiate.
 * @returns {Promise<{id: string}>} The newly created project record.
 */
async function createProjectFromTemplate(template) {
  const existing = await getAllProjects();
  const existingTitlesLower = new Set(
    existing.map((p) => parseProject(p.content).title.toLowerCase())
  );
  let name = template.name;
  if (existingTitlesLower.has(name.toLowerCase())) {
    let n = 2;
    while (existingTitlesLower.has(`${template.name} ${n}`.toLowerCase())) n++;
    name = `${template.name} ${n}`;
  }
  const content = template.content.replace(template.name, name);
  return createProject(content);
}

/**
 * Menu item definitions for the More modal.
 * Each entry has a display label plus either a hash route (for navigation)
 * or an async action function (for side-effects like creating a project).
 *
 * @type {Array<{ label: string, route?: string, action?: () => Promise<void> }>}
 */
const MENU_ITEMS = [
  {
    label: 'Create Sample Project',
    action: async () => {
      const project = await createProjectFromTemplate(TEMPLATES[0]);
      navigateTo(`#/project/${project.id}`);
    },
  },
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
    btn.addEventListener('click', async () => {
      // Latch rapid taps: disable the button for the duration of the work.
      // Navigation items finish synchronously; action items await async work
      // before closing the modal so the UI stays visible while the project
      // is being written.
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        if (item.action) {
          await item.action();
        } else if (item.route) {
          navigateTo(item.route);
        }
      } finally {
        closeMoreModal();
      }
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
