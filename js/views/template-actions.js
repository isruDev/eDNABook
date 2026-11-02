// js/views/template-actions.js
// Dashboard actions: share a project's template file, copy its metadata summary.
import { showToast } from '../ui.js';
import { shareOrDownload } from '../export.js';
import { sanitizeFilename } from '../util.js';
import { templateToJSON, metadataSummary } from '../template-share.js';

/**
 * Sends the project's field list as a template file through the share sheet,
 * or downloads it when sharing files is not supported.
 *
 * @param {import('../field-model.js').ProjectSchema} schema - Project schema to share.
 * @returns {Promise<void>} Resolves when the share sheet closes or the download starts.
 * @remarks Errors are reported with a toast, never thrown.
 * @example
 * shareBtn.onclick = () => shareTemplate(projectSchema(project));
 */
export async function shareTemplate(schema) {
  try {
    await shareOrDownload(
      templateToJSON(schema),
      `${sanitizeFilename(schema.title)}_template.json`,
      'application/json',
    );
  } catch (err) {
    showToast('Template share failed. Try again, or check storage space for the download.', 'error');
    console.error('Template share error:', err);
  }
}

/**
 * Copies the project's plain-text metadata summary to the clipboard.
 *
 * @param {import('../field-model.js').ProjectSchema} schema - Project schema to describe.
 * @returns {Promise<void>} Resolves after the copy succeeds or the error toast shows.
 * @remarks Errors are reported with a toast, never thrown.
 * @example
 * copyBtn.onclick = () => copySummary(projectSchema(project));
 */
export async function copySummary(schema) {
  try {
    await navigator.clipboard.writeText(metadataSummary(schema));
    showToast('Summary copied');
  } catch (err) {
    showToast('Copy failed. Allow clipboard access for this site, then try again.', 'error');
    console.error('Summary copy error:', err);
  }
}
