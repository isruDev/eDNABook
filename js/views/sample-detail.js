// js/views/sample-detail.js
import { getSample, getProject, parseProject, updateSample, deleteSample } from '../db.js';
import { showView, showToast, confirmDialog, vibrate, clearElement, formatDate } from '../ui.js';
import { navigate } from '../app.js';
import { capturePhoto, savePhotoToDevice } from '../photo.js';

/**
 * Formats a datetime string for a datetime-local input (YYYY-MM-DDTHH:MM).
 *
 * @param {string} isoString - ISO 8601 datetime string.
 * @returns {string} Truncated to minute precision for datetime-local input compatibility.
 */
function toDatetimeLocalValue(isoString) {
  return isoString ? isoString.slice(0, 16) : '';
}

/**
 * Renders the sample detail read-only view.
 *
 * Displays all recorded fields for a sample including GPS, datetime, and
 * custom metadata. Provides edit, delete, and back navigation.
 *
 * @param {string} sampleId - The ID of the sample to display.
 * @returns {Promise<void>}
 * @example
 *   await renderSampleDetail('sample-abc');
 */
export async function renderSampleDetail(sampleId) {
  const sample = await getSample(sampleId);
  const project = await getProject(sample.projectId);
  const { fields } = parseProject(project.content);

  const content = document.getElementById('sample-detail-content');
  clearElement(content);

  /**
   * Appends a labeled field row to the detail content container.
   *
   * @param {string} label - Display label for the field.
   * @param {string} value - Display value for the field.
   * @returns {void}
   */
  function addRow(label, value) {
    const row = document.createElement('div');
    row.className = 'detail-row';

    const lEl = document.createElement('span');
    lEl.className = 'detail-label';
    lEl.textContent = label;

    const vEl = document.createElement('span');
    vEl.className = 'detail-value';
    vEl.textContent = value;

    row.appendChild(lEl);
    row.appendChild(vEl);
    content.appendChild(row);
  }

  addRow('Sample ID', sample.sampleId);
  addRow('Date / Time', formatDate(sample.scannedAt));

  if (sample.latitude != null) {
    addRow(
      'GPS Location',
      `Lat: ${sample.latitude.toFixed(6)}, Lon: ${sample.longitude.toFixed(6)} (+-${Math.round(sample.gpsAccuracy)}m)`
    );
  } else {
    addRow('GPS Location', 'No location recorded');
  }

  fields.forEach((field) => {
    const val = (sample.metadata || {})[field.name] || '';
    if (field.type === 'checkbox') {
      addRow(field.name, val === 'true' ? 'Yes' : 'No');
    } else {
      addRow(field.name, val);
    }
  });

  // Photo row
  if (sample.photoFilename) {
    addRow('Photo', sample.photoFilename);
    const retakeBtn = document.createElement('button');
    retakeBtn.type = 'button';
    retakeBtn.className = 'btn-secondary';
    retakeBtn.id = 'retake-photo-detail-btn';
    retakeBtn.textContent = 'Retake Photo';
    retakeBtn.onclick = async () => {
      const { title } = parseProject(project.content);
      const file = await capturePhoto(title, sample.sampleId);
      if (file) {
        await savePhotoToDevice(file);
        await updateSample(sampleId, { photoFilename: file.name });
        showToast('Photo retaken');
        await renderSampleDetail(sampleId);
      }
    };
    content.appendChild(retakeBtn);
  } else {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-secondary';
    addBtn.id = 'add-photo-detail-btn';
    addBtn.textContent = 'Add Photo';
    addBtn.onclick = async () => {
      const { title } = parseProject(project.content);
      const file = await capturePhoto(title, sample.sampleId);
      if (file) {
        await savePhotoToDevice(file);
        await updateSample(sampleId, { photoFilename: file.name });
        showToast('Photo added');
        await renderSampleDetail(sampleId);
      }
    };
    content.appendChild(addBtn);
  }

  const detailView = document.querySelector('[data-view="sample-detail"]');
  detailView.querySelector('.btn-back').onclick = () =>
    navigate(`#/project/${sample.projectId}`);

  document.getElementById('edit-sample-btn').onclick = () =>
    navigate(`#/sample/${sampleId}/edit`);

  const deleteSampleBtn = document.getElementById('delete-sample-btn');
  let deleteSampleTimeout = null;

  deleteSampleBtn.onclick = async () => {
    if (deleteSampleBtn.classList.contains('confirming')) {
      clearTimeout(deleteSampleTimeout);
      deleteSampleBtn.classList.remove('confirming');
      deleteSampleBtn.textContent = 'Delete Sample';

      await deleteSample(sampleId);
      showToast('Sample deleted');
      navigate(`#/project/${sample.projectId}`);
      return;
    }

    deleteSampleBtn.classList.add('confirming');
    deleteSampleBtn.textContent = 'Tap again to confirm';

    deleteSampleTimeout = setTimeout(() => {
      deleteSampleBtn.classList.remove('confirming');
      deleteSampleBtn.textContent = 'Delete Sample';
    }, 5000);
  };

  showView('sample-detail');
}

/**
 * Renders the sample edit form pre-populated with existing sample data.
 *
 * Allows editing of datetime and custom metadata fields. Sample ID remains
 * read-only. GPS data from the original sample is displayed but not re-captured.
 *
 * @param {string} sampleId - The ID of the sample to edit.
 * @returns {Promise<void>}
 * @example
 *   await renderSampleEdit('sample-abc');
 */
export async function renderSampleEdit(sampleId) {
  const sample = await getSample(sampleId);
  const project = await getProject(sample.projectId);
  const { fields } = parseProject(project.content);

  document.getElementById('edit-display-sample-id').textContent = sample.sampleId;
  document.getElementById('edit-sample-datetime').value = toDatetimeLocalValue(sample.scannedAt);

  const gpsEl = document.getElementById('edit-gps-value');
  if (sample.latitude != null) {
    gpsEl.textContent = `Lat: ${sample.latitude.toFixed(6)}, Lon: ${sample.longitude.toFixed(6)} (+-${Math.round(sample.gpsAccuracy)}m)`;
    gpsEl.classList.remove('gps-warning');
  } else {
    gpsEl.textContent = 'No location recorded for this sample';
    gpsEl.classList.add('gps-warning');
  }

  const metaContainer = document.getElementById('edit-metadata-fields');
  clearElement(metaContainer);
  fields.forEach((field) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    if (field.type === 'checkbox') {
      const checkWrapper = document.createElement('div');
      checkWrapper.className = 'checkbox-field';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `edit-field-${field.name}`;
      input.dataset.field = field.name;
      input.checked = (sample.metadata || {})[field.name] === 'true';
      const checkLabel = document.createElement('label');
      checkLabel.setAttribute('for', `edit-field-${field.name}`);
      checkLabel.className = 'checkbox-label';
      checkLabel.textContent = field.name;
      checkWrapper.appendChild(input);
      checkWrapper.appendChild(checkLabel);
      wrapper.appendChild(checkWrapper);
    } else {
      const label = document.createElement('label');
      label.setAttribute('for', `edit-field-${field.name}`);
      label.textContent = field.name;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `edit-field-${field.name}`;
      input.dataset.field = field.name;
      input.value = (sample.metadata || {})[field.name] || '';
      wrapper.appendChild(label);
      wrapper.appendChild(input);
    }

    metaContainer.appendChild(wrapper);
  });

  const editView = document.querySelector('[data-view="sample-edit"]');
  editView.querySelector('.btn-back').onclick = () =>
    navigate(`#/sample/${sampleId}`);

  document.getElementById('edit-sample-form').onsubmit = async (e) => {
    e.preventDefault();

    const scannedAt = document.getElementById('edit-sample-datetime').value;
    const metadata = {};
    metaContainer.querySelectorAll('input[data-field]').forEach((input) => {
      metadata[input.dataset.field] = input.type === 'checkbox' ? String(input.checked) : input.value;
    });

    await updateSample(sampleId, {
      sampleId: sample.sampleId,
      scannedAt,
      latitude: sample.latitude,
      longitude: sample.longitude,
      gpsAccuracy: sample.gpsAccuracy,
      metadata,
    });

    vibrate(50);
    showToast('Sample updated');
    navigate(`#/sample/${sampleId}`);
  };

  showView('sample-edit');
}
