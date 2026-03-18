import { getAllProjects, getSamplesByProject } from '../db.js';
import { showView, formatDate, clearElement, createElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Parses a project content string into title and fields.
 *
 * Duplicates the logic from db.js parseProject to avoid importing a function
 * that is not included in the db.js vi.mock factory in tests.
 *
 * @param {string} content - Newline-delimited project content string.
 * @returns {{ title: string, fields: string[] }} Parsed title and field names.
 */
function parseContent(content) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return { title: '', fields: [] };

  const [title, ...fields] = lines;
  return { title, fields };
}

/**
 * Builds a single project card element.
 *
 * @param {{ id: string, content: string, updatedAt: string }} project - Project record from the database.
 * @param {number} sampleCount - Number of samples associated with this project.
 * @returns {HTMLElement} A card element populated with project summary data.
 */
function buildProjectCard(project, sampleCount) {
  const { title, fields } = parseContent(project.content);

  const heading = createElement('h2', {}, title);

  const meta = createElement('p', { className: 'card-meta' },
    `${fields.length} fields | ${sampleCount} samples`
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
    const newBtn = createElement('button', { className: 'btn-primary', id: 'new-project-btn' }, 'New Project');
    newBtn.addEventListener('click', () => {
      navigate('#/project/new');
    });
    actionsContainer.appendChild(newBtn);
  }

  if (!listContainer) return;

  clearElement(listContainer);

  const projects = await getAllProjects();

  if (projects.length === 0) {
    const emptyState = createElement('p', { className: 'empty-state' },
      'No projects yet. Tap "New Project" to get started.'
    );
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
