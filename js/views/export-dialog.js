// js/views/export-dialog.js
import { getProject, getSamplesByProject, parseProject } from '../db.js';
import { showToast } from '../ui.js';
import { generateCSV, generateSQLite, shareOrDownload } from '../export.js';
import { sanitizeFilename } from '../util.js';

/**
 * Formats today's date as YYYY-MM-DD for use in export filenames.
 *
 * @returns {string} ISO date string (date portion only, e.g. "2026-03-17").
 */
function todayString() {
  return new Date().toISOString().slice(0, 10);
}


/**
 * Displays a modal dialog that allows the user to export a project's samples
 * as either a CSV or SQLite file.
 *
 * The dialog shows the sample count and provides two export buttons plus a
 * cancel button. CSV and SQLite exports use Web Share API when available,
 * falling back to an anchor-click download. Export errors are surfaced via
 * showToast with an error style.
 *
 * @param {string} projectId - UUID of the project to export.
 * @returns {Promise<void>}
 * @example
 * document.getElementById('export-btn').addEventListener('click', () => {
 *   showExportDialog('proj-abc-123');
 * });
 */
export async function showExportDialog(projectId) {
  const project = await getProject(projectId);
  const samples = await getSamplesByProject(projectId);
  const { title } = parseProject(project.content);

  const filename = `${sanitizeFilename(title)}_${todayString()}`;

  // ---- Build modal DOM ----

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'export-dialog-title');

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';

  const heading = document.createElement('h2');
  heading.id = 'export-dialog-title';
  heading.textContent = 'Export Samples';

  const countEl = document.createElement('p');
  countEl.className = 'export-count';
  countEl.textContent = `${samples.length} sample${samples.length !== 1 ? 's' : ''} in this project`;

  const btnRow = document.createElement('div');
  btnRow.className = 'modal-btn-row';

  const csvBtn = document.createElement('button');
  csvBtn.className = 'btn-primary';
  csvBtn.textContent = 'Export CSV';

  const sqliteBtn = document.createElement('button');
  sqliteBtn.className = 'btn-primary';
  sqliteBtn.textContent = 'Export SQLite';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';

  btnRow.appendChild(csvBtn);
  btnRow.appendChild(sqliteBtn);
  btnRow.appendChild(cancelBtn);

  dialog.appendChild(heading);
  dialog.appendChild(countEl);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // ---- Event handlers ----

  /**
   * Removes the modal overlay from the DOM.
   *
   * @returns {void}
   */
  function closeDialog() {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  cancelBtn.addEventListener('click', closeDialog);

  csvBtn.addEventListener('click', async () => {
    try {
      const csv = generateCSV(project, samples);
      await shareOrDownload(csv, `${filename}.csv`, 'text/csv');
    } catch (err) {
      showToast('CSV export failed', 'error');
      console.error('CSV export error:', err);
    }
    closeDialog();
  });

  sqliteBtn.addEventListener('click', async () => {
    try {
      const bytes = await generateSQLite(project, samples);
      await shareOrDownload(bytes, `${filename}.db`, 'application/x-sqlite3');
    } catch (err) {
      showToast('SQLite export failed', 'error');
      console.error('SQLite export error:', err);
    }
    closeDialog();
  });
}
