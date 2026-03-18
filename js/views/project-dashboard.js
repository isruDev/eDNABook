// js/views/project-dashboard.js
import {
  getProject,
  getSamplesByProject,
  deleteProject,
  deleteSample,
  parseProject,
} from '../db.js';
import { $, clearElement, showView, showToast, confirmDialog, formatDate } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Renders the project dashboard view for the given project.
 *
 * Populates the project title, field tags, sample list, and wires up
 * all action buttons (scan, export, edit, delete, back, sample navigation).
 *
 * @param {string} projectId - The ID of the project to display.
 * @returns {Promise<void>}
 * @example
 *   await renderProjectDashboard('proj-abc123');
 */
export async function renderProjectDashboard(projectId) {
  const project = await getProject(projectId);
  const { title, fields } = parseProject(project);
  const samples = await getSamplesByProject(projectId);

  document.getElementById('dashboard-title').textContent = title;

  // Render field tags
  const fieldsContainer = document.getElementById('dashboard-fields');
  clearElement(fieldsContainer);
  fields.forEach((field) => {
    const tag = document.createElement('span');
    tag.className = 'field-tag';
    tag.textContent = field;
    fieldsContainer.appendChild(tag);
  });

  // Sample count
  document.getElementById('sample-count').textContent =
    samples.length === 1 ? '1 sample' : `${samples.length} samples`;

  // Export button state
  const exportBtn = document.getElementById('export-btn');
  exportBtn.disabled = samples.length === 0;

  // Export button click handler
  exportBtn.onclick = () => {
    if (typeof showExportDialog === 'function') {
      showExportDialog(projectId);
    } else {
      showToast('Export coming soon');
    }
  };

  // Render sample list
  const sampleList = document.getElementById('sample-list');
  clearElement(sampleList);
  samples.forEach((sample) => {
    const card = document.createElement('div');
    card.className = 'sample-card';

    const idEl = document.createElement('strong');
    idEl.textContent = sample.sampleId;
    card.appendChild(idEl);

    const dateEl = document.createElement('span');
    dateEl.className = 'sample-date';
    dateEl.textContent = formatDate(sample.scannedAt);
    card.appendChild(dateEl);

    // Preview first 2 metadata values
    const previewFields = Object.entries(sample.metadata || {}).slice(0, 2);
    if (previewFields.length > 0) {
      const preview = document.createElement('p');
      preview.className = 'sample-preview';
      preview.textContent = previewFields.map(([k, v]) => `${k}: ${v}`).join(' · ');
      card.appendChild(preview);
    }

    card.addEventListener('click', () => navigate(`#/sample/${sample.id}`));
    sampleList.appendChild(card);
  });

  // Wire buttons
  document.querySelector('.btn-back').onclick = () => navigate('#/');
  document.getElementById('scan-btn').onclick = () => navigate(`#/project/${projectId}/scan`);
  document.getElementById('edit-project-btn').onclick = () =>
    navigate(`#/project/${projectId}/edit`);

  document.getElementById('delete-project-btn').onclick = async () => {
    const confirmed = await confirmDialog(
      'Delete project?',
      'This will permanently delete the project and all its samples.'
    );
    if (!confirmed) return;

    await Promise.all(samples.map((s) => deleteSample(s.id)));
    await deleteProject(projectId);
    showToast('Project deleted');
    navigate('#/');
  };

  showView('project-dashboard');
}
