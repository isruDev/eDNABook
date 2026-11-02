// js/views/sample-entry.js
import { getProject, getSampleBySampleId, createSample, updateSample } from '../db.js';
import { projectSchema, missingRequired } from '../field-model.js';
import { renderMetadataInputs, readMetadataInputs, flagMissing, missingMessage } from './metadata-inputs.js';
import { showView, showToast, confirmDialog, vibrate } from '../ui.js';
import { navigate } from '../app.js';
import { startScanner, stopScanner } from '../scanner.js';
import { getCurrentPosition, onGpsChange, restartGpsWatch, GPS_LOCK_THRESHOLD_M } from '../gps.js';
import { capturePhoto, savePhotoToDevice } from '../photo.js';

/**
 * Unsubscribe handle for the entry form's live GPS listener, or null when the
 * form is not listening.
 *
 * @type {(() => void)|null}
 */
let unsubscribeFormGps = null;

/**
 * Stops the entry form's live GPS updates, if any are active.
 *
 * @returns {void}
 */
function stopFormGpsUpdates() {
  if (unsubscribeFormGps) {
    unsubscribeFormGps();
    unsubscribeFormGps = null;
  }
}

/**
 * Writes the GPS status line in the entry form and toggles the warning style.
 *
 * @param {HTMLElement} gpsEl - The #gps-value element.
 * @param {{ latitude: number, longitude: number, accuracy: number }|null} position - Current fix, or null.
 * @param {'acquiring'|'unavailable'} [emptyReason='unavailable'] - Message shown when position is null.
 * @returns {void}
 * @remarks A fix worse than GPS_LOCK_THRESHOLD_M is shown with a low-accuracy
 * warning so the user can wait for a better fix or press Retake GPS.
 */
function renderGpsValue(gpsEl, position, emptyReason = 'unavailable') {
  if (!position) {
    gpsEl.textContent = emptyReason === 'acquiring'
      ? 'Acquiring GPS...'
      : 'Location unavailable -- GPS not captured';
    gpsEl.classList.add('gps-warning');
    return;
  }
  const coords = `Lat: ${position.latitude.toFixed(6)}, Lon: ${position.longitude.toFixed(6)} (+-${Math.round(position.accuracy)}m)`;
  if (position.accuracy > GPS_LOCK_THRESHOLD_M) {
    gpsEl.textContent = `${coords} -- low accuracy, wait or retake`;
    gpsEl.classList.add('gps-warning');
  } else {
    gpsEl.textContent = coords;
    gpsEl.classList.remove('gps-warning');
  }
}

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
  if (!project) {
    showToast('Project not found', 'error');
    navigate('#/');
    return;
  }
  const { title, fields } = projectSchema(project);

  showView('sample-entry');

  const scannerContainer = document.getElementById('scanner-container');
  if (scannerContainer) scannerContainer.style.display = '';
  const sampleForm = document.getElementById('sample-form');
  if (sampleForm) sampleForm.style.display = 'none';
  const qrReader = document.getElementById('qr-reader');
  if (qrReader) qrReader.innerHTML = '';

  let scannerInstance = null;
  // Set once the user picks manual entry or leaves, so a camera that finishes
  // starting afterwards is stopped and its error text cannot overwrite the input.
  let scannerUnwanted = false;

  /**
   * Stops the camera scanner if it is running.
   *
   * @returns {Promise<void>}
   */
  const releaseScanner = async () => {
    if (scannerInstance) {
      const instance = scannerInstance;
      scannerInstance = null;
      await stopScanner(instance);
    }
  };

  const handleSampleId = async (sampleId) => {
    scannerUnwanted = true;
    await releaseScanner();
    document.getElementById('scanner-container').style.display = 'none';
    await showPhotoPrompt(projectId, title, sampleId, fields);
  };

  // Handlers are attached before the scanner starts: starting (or failing to
  // start) the camera can take seconds, and manual entry must work meanwhile.
  document.querySelector('[data-view="sample-entry"] .btn-back').onclick = async () => {
    scannerUnwanted = true;
    stopFormGpsUpdates();
    await releaseScanner();
    navigate(`#/project/${projectId}`);
  };

  document.getElementById('manual-entry-btn').onclick = () => {
    scannerUnwanted = true;
    releaseScanner();
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
        handleSampleId(val);
      }
    };

    readerEl.appendChild(input);
    readerEl.appendChild(submitBtn);
  };

  const started = await startScanner(
    'qr-reader',
    (decodedText) => handleSampleId(decodedText),
    (errMsg) => {
      if (scannerUnwanted) return;
      const msgEl = document.getElementById('qr-reader');
      if (msgEl) msgEl.textContent = errMsg;
    }
  );

  if (scannerUnwanted) {
    await stopScanner(started);
  } else {
    scannerInstance = started;
  }
}

/**
 * Shows an optional photo capture prompt between QR scan and metadata form.
 *
 * @param {string} projectId - The project ID.
 * @param {string} projectTitle - The parsed project title.
 * @param {string} sampleId - The scanned sample identifier.
 * @param {import('../field-model.js').FieldDef[]} fields - Project metadata fields.
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
      <button type="button" class="btn-secondary" id="skip-photo-btn">Not Now</button>
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
 * @param {import('../field-model.js').FieldDef[]} fields - Metadata fields defined by the project.
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
  const datetimeInput = document.getElementById('sample-datetime');
  datetimeInput.value = toDatetimeLocalValue(new Date());
  document.getElementById('retake-time-btn').onclick = () => {
    datetimeInput.value = toDatetimeLocalValue(new Date());
  };

  let position = await getCurrentPosition();
  const gpsEl = document.getElementById('gps-value');
  renderGpsValue(gpsEl, position);

  stopFormGpsUpdates();
  unsubscribeFormGps = onGpsChange((status) => {
    position = status.latitude === null
      ? null
      : { latitude: status.latitude, longitude: status.longitude, accuracy: status.accuracy };
    renderGpsValue(gpsEl, position, status.state === 'waiting' ? 'acquiring' : 'unavailable');
  });
  document.getElementById('retake-gps-btn').onclick = () => restartGpsWatch();

  const metaContainer = document.getElementById('metadata-fields');
  renderMetadataInputs(metaContainer, fields);

  // Photo section — sibling of #metadata-fields, so re-rendering the fields
  // does NOT remove it. Explicitly drop any leftover from a prior render or
  // every re-entry stacks another photo section in the DOM.
  const staleSection = document.getElementById('photo-section');
  if (staleSection) staleSection.remove();

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
      retakeBtn.textContent = 'Retake Photo';
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

  document.getElementById('cancel-sample-btn').onclick = () => {
    stopFormGpsUpdates();
    navigate(`#/project/${projectId}`);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    const scannedAt = document.getElementById('sample-datetime').value;
    const metadata = readMetadataInputs(metaContainer);
    const missing = missingRequired(fields, metadata);
    flagMissing(metaContainer, fields, missing);
    if (missing.length > 0) {
      showToast(missingMessage(missing), 'error');
      return;
    }
    stopFormGpsUpdates();

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
      // This form never loads the existing photo, so "no photo" here means
      // "no new photo": keep whatever filename the sample already has.
      if (!currentPhoto) delete payload.photoFilename;
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
