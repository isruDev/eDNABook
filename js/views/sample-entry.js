// js/views/sample-entry.js
import { getProject, parseProject, getSampleBySampleId, createSample, updateSample } from '../db.js';
import { showView, showToast, confirmDialog, vibrate, clearElement } from '../ui.js';
import { navigate } from '../app.js';
import { startScanner, stopScanner } from '../scanner.js';
import { getCurrentPosition } from '../gps.js';
import { capturePhoto, savePhotoToDevice } from '../photo.js';

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
 * scan or manual entry, shows a photo prompt then transitions to the metadata form.
 *
 * @param {string} projectId - The ID of the project receiving the sample.
 * @returns {Promise<void>}
 */
export async function renderSampleEntry(projectId) {
  const project = await getProject(projectId);
  const { title, fields } = parseProject(project.content);

  showView('sample-entry');

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
    await showPhotoPrompt(projectId, title, sampleId, fields);
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
 * Shows an optional photo capture prompt between QR scan and metadata form.
 *
 * @param {string} projectId - The project ID.
 * @param {string} projectTitle - The parsed project title.
 * @param {string} sampleId - The scanned sample identifier.
 * @param {string[]} fields - Project metadata field names.
 * @returns {Promise<void>}
 */
async function showPhotoPrompt(projectId, projectTitle, sampleId, fields) {
  const container = document.querySelector('[data-view="sample-entry"]');

  const prompt = document.createElement('div');
  prompt.id = 'photo-prompt';
  prompt.className = 'photo-prompt';
  prompt.innerHTML = `
    <p>Take a site photo?</p>
    <div class="photo-prompt-actions">
      <button type="button" class="btn-primary" id="take-photo-btn">Take Photo</button>
      <button type="button" class="btn-secondary" id="skip-photo-btn">Skip</button>
    </div>
  `;
  container.appendChild(prompt);

  /**
   * Removes the prompt and proceeds to the entry form.
   *
   * @param {File|null} file - The captured photo file, or null if skipped.
   * @returns {Promise<void>}
   */
  const proceedToForm = async (file) => {
    prompt.remove();
    await renderEntryForm(projectId, fields, sampleId, undefined, file, projectTitle);
  };

  document.getElementById('take-photo-btn').onclick = async () => {
    const file = await capturePhoto(projectTitle, sampleId);
    await proceedToForm(file);
  };

  document.getElementById('skip-photo-btn').onclick = async () => {
    await proceedToForm(null);
  };
}

/**
 * Renders the metadata entry form for a sample, pre-filling fields if editing.
 *
 * Handles duplicate sample ID detection, GPS capture, field rendering,
 * photo section, and save/cancel actions.
 *
 * @param {string} projectId - The ID of the parent project.
 * @param {string[]} fields - Custom metadata field names defined by the project.
 * @param {string} sampleId - The scanned or manually entered sample identifier.
 * @param {string} [existingId] - When provided, the form updates the existing sample instead of creating one.
 * @param {File|null} [photoFile=null] - Captured photo file, or null if no photo.
 * @param {string} [projectTitle=''] - The project title for photo filename generation.
 * @returns {Promise<void>}
 */
export async function renderEntryForm(projectId, fields, sampleId, existingId, photoFile = null, projectTitle = '') {
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

  document.getElementById('display-sample-id').textContent = sampleId;
  document.getElementById('sample-datetime').value = toDatetimeLocalValue(new Date());

  const position = await getCurrentPosition();
  const gpsEl = document.getElementById('gps-value');
  if (position) {
    gpsEl.textContent = `Lat: ${position.latitude.toFixed(6)}, Lon: ${position.longitude.toFixed(6)} (+-${Math.round(position.accuracy)}m)`;
    gpsEl.classList.remove('gps-warning');
  } else {
    gpsEl.textContent = 'Location unavailable -- GPS not captured';
    gpsEl.classList.add('gps-warning');
  }

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

  // Photo section
  let currentPhoto = photoFile;
  const photoSection = document.createElement('div');
  photoSection.id = 'photo-section';
  photoSection.className = 'form-field';

  /**
   * Renders the photo section content based on current photo state.
   *
   * @returns {void}
   */
  function renderPhotoSection() {
    photoSection.innerHTML = '';
    if (currentPhoto) {
      const label = document.createElement('label');
      label.textContent = 'Site Photo';
      const info = document.createElement('p');
      info.className = 'readonly-value';
      info.textContent = currentPhoto.name;
      const btnRow = document.createElement('div');
      btnRow.className = 'photo-btn-row';

      const retakeBtn = document.createElement('button');
      retakeBtn.type = 'button';
      retakeBtn.className = 'btn-secondary';
      retakeBtn.textContent = 'Retake';
      retakeBtn.id = 'retake-photo-btn';
      retakeBtn.onclick = async () => {
        const file = await capturePhoto(projectTitle, sampleId);
        if (file) {
          currentPhoto = file;
          renderPhotoSection();
        }
      };

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-secondary';
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        currentPhoto = null;
        renderPhotoSection();
      };

      btnRow.appendChild(retakeBtn);
      btnRow.appendChild(removeBtn);
      photoSection.appendChild(label);
      photoSection.appendChild(info);
      photoSection.appendChild(btnRow);
    } else {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-secondary';
      addBtn.textContent = 'Add Photo';
      addBtn.id = 'add-photo-btn';
      addBtn.onclick = async () => {
        const file = await capturePhoto(projectTitle, sampleId);
        if (file) {
          currentPhoto = file;
          renderPhotoSection();
        }
      };
      photoSection.appendChild(addBtn);
    }
  }

  renderPhotoSection();
  metaContainer.after(photoSection);

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
      photoFilename: currentPhoto ? currentPhoto.name : null,
    };

    if (existingId) {
      await updateSample(existingId, payload);
    } else {
      await createSample(projectId, payload);
    }

    if (currentPhoto) {
      await savePhotoToDevice(currentPhoto);
    }

    vibrate(50);
    showToast('Sample saved');
    navigate(`#/project/${projectId}`);
  };
}
