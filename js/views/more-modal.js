// js/views/more-modal.js
import { getAllProjects, createProject, createProjectFromSchema } from '../db.js';
import { projectSchema } from '../field-model.js';
import { TEMPLATES } from '../templates.js';
import { parseTemplateFile, TemplateFileError } from '../template-share.js';
import { pickFile, showToast } from '../ui.js';

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
 * Returns a project title that no existing project uses, appending a number
 * suffix on collision (case-insensitive).
 *
 * @param {string} base - Preferred title.
 * @returns {Promise<string>} `base`, or `base 2`, `base 3`, ... when taken.
 */
async function uniqueTitle(base) {
  const existing = await getAllProjects();
  const taken = new Set(existing.map((p) => projectSchema(p).title.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

/**
 * Creates a new project from a template, resolving name collisions by
 * appending a number suffix. Race-safe via the caller's button-disabled
 * guard — no internal latching needed because the only entry point is a
 * modal menu item that is closed after the async work completes.
 *
 * @param {import('../templates.js').ProjectTemplate} template - The template to instantiate.
 * @returns {Promise<{id: string}>} The newly created project record.
 */
async function createProjectFromTemplate(template) {
  const name = await uniqueTitle(template.name);
  const content = template.content.replace(template.name, name);
  return createProject(content);
}

/**
 * Lets the user pick a template file and creates a project from it, then
 * opens the new project.
 *
 * @returns {Promise<void>} Resolves when the project is created, the file is
 *   rejected (error toast), or the picker is cancelled.
 * @remarks pickFile runs first, inside the tap gesture, so the picker opens.
 * Field keys from the file are kept, so exports from every collector who
 * imported the same file have matching columns.
 */
async function importTemplate() {
  const file = await pickFile('.json,application/json');
  if (!file) return;
  try {
    const schema = parseTemplateFile(await file.text());
    const project = await createProjectFromSchema({ ...schema, title: await uniqueTitle(schema.title) });
    showToast('Template imported');
    navigateTo(`#/project/${project.id}`);
  } catch (err) {
    if (err instanceof TemplateFileError) {
      showToast(err.message, 'error');
      return;
    }
    showToast('Import failed. Try again, or ask for a new copy of the file.', 'error');
    console.error('Template import error:', err);
  }
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
  { label: 'Import Template',          action: importTemplate },
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
