import { getAllProjects, getSamplesByProject, parseProject } from '../db.js';
import { showView, formatDate, clearElement, createElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Builds a single project card element.
 *
 * @param {{ id: string, content: string, updatedAt: string }} project - Project record from the database.
 * @param {number} sampleCount - Number of samples associated with this project.
 * @returns {HTMLElement} A card element populated with project summary data.
 */
function buildProjectCard(project, sampleCount) {
  const { title, fields } = parseProject(project.content);

  const heading = createElement('h2', {}, title);

  const meta = createElement('p', { className: 'card-meta' },
    `${fields.length} field${fields.length !== 1 ? 's' : ''} | ${sampleCount} sample${sampleCount !== 1 ? 's' : ''}`
  );

  const dateEl = createElement('p', { className: 'card-date' },
    formatDate(project.updatedAt)
  );

  const card = createElement('div', { className: 'card project-card', 'data-id': project.id }, [
    heading,
    meta,
    dateEl,
  ]);

  card.addEventListener('click', () => {
    navigate(`#/project/${project.id}`);
  });

  return card;
}

/**
 * Renders the home screen into the #app container.
 *
 * Fetches all projects from IndexedDB, resolves sample counts for each,
 * and populates the #project-list element with project cards. Displays an
 * empty state message when no projects exist. Wires up the New Project button
 * to navigate to the project creation form.
 *
 * @returns {Promise<void>}
 */
export async function renderHome() {
  showView('home');

  const actionsContainer = document.getElementById('home-actions');
  const listContainer = document.getElementById('project-list');

  if (actionsContainer) {
    clearElement(actionsContainer);
    const newBtn = createElement('button', { className: 'btn-primary header-action-btn', id: 'new-project-btn' }, '');
    newBtn.innerHTML = '<span class="btn-label-full">New Project</span><span class="btn-label-short">New</span>';
    newBtn.addEventListener('click', () => {
      navigate('#/project/new');
    });
    actionsContainer.appendChild(newBtn);
    // Note: the "New Sample Project" template button used to live here, but
    // it moved to the More modal per Allen's UX request to reduce header
    // clutter.
  }

  const projects = await getAllProjects();
  clearElement(listContainer);

  if (projects.length === 0) {
    // Make the empty state itself a clickable New Project CTA so users aren't
    // forced to scan the header for the button — especially on mobile where
    // the header buttons are visually cramped.
    const emptyState = createElement('button', {
      type: 'button',
      className: 'empty-state empty-state-cta',
      'aria-label': 'Create your first project',
    }, 'No projects yet. Tap here to create your first project.');
    emptyState.addEventListener('click', () => {
      navigate('#/project/new');
    });
    listContainer.appendChild(emptyState);
    return;
  }

  const sampleCountResults = await Promise.all(
    projects.map(p => getSamplesByProject(p.id))
  );

  for (let i = 0; i < projects.length; i++) {
    const card = buildProjectCard(projects[i], sampleCountResults[i].length);
    listContainer.appendChild(card);
  }
}
