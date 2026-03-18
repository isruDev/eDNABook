// js/views/sample-entry.js
import { getProject, parseProject, getSampleBySampleId, createSample, updateSample } from '../db.js';
import { showView, showToast, confirmDialog, vibrate, clearElement } from '../ui.js';
import { navigate } from '../app.js';
import { startScanner, stopScanner } from '../scanner.js';
import { getCurrentPosition } from '../gps.js';

/**
 * Formats a Date object into a datetime-local input value string (YYYY-MM-DDTHH:MM).
 *
 * @param {Date} date - The date to format.
 * @returns {string} Formatted datetime string suitable for datetime-local input value.
 */
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Renders the sample entry view for a project, starting the QR scanner.
 *
 * Presents the camera viewfinder and a manual entry fallback. On successful
 * scan or manual entry, transitions to the metadata entry form.
 *
 * @param {string} projectId - The ID of the project receiving the sample.
 * @returns {Promise<void>}
 * @example
 *   await renderSampleEntry('proj-abc');
 */
export async function renderSampleEntry(projectId) {
  const project = await getProject(projectId);
  const { fields } = parseProject(project.content);

  showView('sample-entry');

  // Reset DOM state from any previous visit
  const scannerContainer = document.getElementById('scanner-container');
  if (scannerContainer) scannerContainer.style.display = '';
  const sampleForm = document.getElementById('sample-form');
  if (sampleForm) sampleForm.style.display = 'none';
  const qrReader = document.getElementById('qr-reader');
  if (qrReader) qrReader.innerHTML = '';

  let scannerInstance = null;

  const handleSampleId = async (sampleId) => {
    if (scannerInstance) {
      await stopScanner(scannerInstance);
      scannerInstance = null;
    }
    document.getElementById('scanner-container').style.display = 'none';
    await renderEntryForm(projectId, fields, sampleId);
  };

  scannerInstance = await startScanner(
    'qr-reader',
    (decodedText) => handleSampleId(decodedText),
    (errMsg) => {
      const msgEl = document.getElementById('qr-reader');
      if (msgEl) msgEl.textContent = errMsg;
    }
  );

  document.querySelector('[data-view="sample-entry"] .btn-back').onclick = async () => {
    if (scannerInstance) await stopScanner(scannerInstance);
    navigate(`#/project/${projectId}`);
  };

  document.getElementById('manual-entry-btn').onclick = () => {
    const readerEl = document.getElementById('qr-reader');
    readerEl.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'manual-sample-id';
    input.placeholder = 'Enter Sample ID';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn-primary';
    submitBtn.textContent = 'Submit';
    submitBtn.onclick = async () => {
      const val = input.value.trim();
      if (val) {
        if (scannerInstance) await stopScanner(scannerInstance);
        handleSampleId(val);
      }
    };

    readerEl.appendChild(input);
    readerEl.appendChild(submitBtn);
  };

}

/**
 * Renders the metadata entry form for a sample, pre-filling fields if editing.
 *
 * Handles duplicate sample ID detection, GPS capture, field rendering, and
 * save/cancel actions.
 *
 * @param {string} projectId - The ID of the parent project.
 * @param {string[]} fields - Custom metadata field names defined by the project.
 * @param {string} sampleId - The scanned or manually entered sample identifier.
 * @param {string} [existingId] - When provided, the form updates the existing sample instead of creating one.
 * @returns {Promise<void>}
 * @example
 *   // New sample
 *   await renderEntryForm('proj-abc', ['Site', 'Collector'], 'S-001');
 *   // Update existing
 *   await renderEntryForm('proj-abc', ['Site', 'Collector'], 'S-001', 'sample-xyz');
 */
export async function renderEntryForm(projectId, fields, sampleId, existingId) {
  // Duplicate detection -- only check when not already editing an existing record
  if (!existingId) {
    const dup = await getSampleBySampleId(projectId, sampleId);
    if (dup) {
      const proceed = await confirmDialog(
        `Sample "${sampleId}" already exists in this project. Update the existing record?`
      );
      if (proceed) {
        existingId = dup.id;
      } else {
        navigate(`#/project/${projectId}`);
        return;
      }
    }
  }

  const form = document.getElementById('sample-form');
  form.style.display = '';

  // Sample ID read-only display
  document.getElementById('display-sample-id').textContent = sampleId;

  // Datetime default to now
  document.getElementById('sample-datetime').value = toDatetimeLocalValue(new Date());

  // GPS capture
  const position = await getCurrentPosition();
  const gpsEl = document.getElementById('gps-value');
  if (position) {
    gpsEl.textContent = `Lat: ${position.latitude.toFixed(6)}, Lon: ${position.longitude.toFixed(6)} (+-${Math.round(position.accuracy)}m)`;
    gpsEl.classList.remove('gps-warning');
  } else {
    gpsEl.textContent = 'Location unavailable -- GPS not captured';
    gpsEl.classList.add('gps-warning');
  }

  // Render metadata fields
  const metaContainer = document.getElementById('metadata-fields');
  clearElement(metaContainer);
  fields.forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const label = document.createElement('label');
    label.setAttribute('for', `field-${field}`);
    label.textContent = field;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${field}`;
    input.dataset.field = field;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    metaContainer.appendChild(wrapper);
  });

  document.getElementById('cancel-sample-btn').onclick = () =>
    navigate(`#/project/${projectId}`);

  form.onsubmit = async (e) => {
    e.preventDefault();

    const scannedAt = document.getElementById('sample-datetime').value;
    const metadata = {};
    metaContainer.querySelectorAll('input[data-field]').forEach((input) => {
      metadata[input.dataset.field] = input.value;
    });

    const payload = {
      sampleId,
      scannedAt,
      latitude: position ? position.latitude : null,
      longitude: position ? position.longitude : null,
      gpsAccuracy: position ? position.accuracy : null,
      metadata,
    };

    if (existingId) {
      await updateSample(existingId, payload);
    } else {
      await createSample(projectId, payload);
    }

    vibrate(50);
    showToast('Sample saved');
    navigate(`#/project/${projectId}`);
  };
}
