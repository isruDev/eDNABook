// tests/views/sample-entry.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/db.js', () => ({
  getProject: vi.fn(),
  parseProject: vi.fn(),
  getSampleBySampleId: vi.fn(),
  createSample: vi.fn(),
  updateSample: vi.fn(),
}));

vi.mock('../../js/ui.js', () => ({
  $: vi.fn((sel) => document.querySelector(sel)),
  $$: vi.fn((sel) => Array.from(document.querySelectorAll(sel))),
  showView: vi.fn(),
  showToast: vi.fn(),
  confirmDialog: vi.fn(),
  vibrate: vi.fn(),
  clearElement: vi.fn((el) => { el.innerHTML = ''; }),
  createElement: vi.fn((tag, attrs, text) => {
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text != null) el.textContent = text;
    return el;
  }),
  formatDate: vi.fn((d) => d),
}));

vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../js/scanner.js', () => ({
  startScanner: vi.fn(),
  stopScanner: vi.fn(),
  isScanning: vi.fn(),
}));

vi.mock('../../js/gps.js', () => ({
  getCurrentPosition: vi.fn(),
  onGpsChange: vi.fn(),
  restartGpsWatch: vi.fn(),
  GPS_LOCK_THRESHOLD_M: 15,
}));

vi.mock('../../js/photo.js', () => ({
  capturePhoto: vi.fn(),
  savePhotoToDevice: vi.fn(),
}));

import { getProject, parseProject, getSampleBySampleId, createSample, updateSample } from '../../js/db.js';
import { showView, showToast, confirmDialog, vibrate } from '../../js/ui.js';
import { navigate } from '../../js/app.js';
import { startScanner, stopScanner } from '../../js/scanner.js';
import { getCurrentPosition, onGpsChange, restartGpsWatch } from '../../js/gps.js';

/** @type {((status: object) => void)|null} Last GPS listener registered by the form. */
let gpsListener = null;
const gpsUnsubscribe = vi.fn();
import { capturePhoto, savePhotoToDevice } from '../../js/photo.js';
import { renderSampleEntry, renderEntryForm } from '../../js/views/sample-entry.js';

const MOCK_PROJECT = {
  id: 'proj-1',
  content: 'River Study\nSite\nCollector\nWeather',
};
const MOCK_PARSED = { title: 'River Study', fields: [{ name: 'Site', type: 'text' }, { name: 'Collector', type: 'text' }, { name: 'Weather', type: 'text' }] };

function buildDOM() {
  document.body.innerHTML = `
    <div data-view="sample-entry" class="view">
      <header>
        <button class="btn-back">Back</button>
        <h1>Scan Sample</h1>
      </header>
      <div id="scanner-container">
        <div id="qr-reader"></div>
        <button class="btn-secondary" id="manual-entry-btn">Enter ID Manually</button>
      </div>
      <form id="sample-form" style="display:none">
        <div class="form-field">
          <label>Sample ID</label>
          <p id="display-sample-id" class="readonly-value"></p>
        </div>
        <div class="form-field">
          <div class="field-label-row">
            <label for="sample-datetime">Date / Time</label>
            <button type="button" class="btn-inline" id="retake-time-btn">Retake Time</button>
          </div>
          <input type="datetime-local" id="sample-datetime">
        </div>
        <div class="form-field" id="gps-display">
          <div class="field-label-row">
            <label>GPS Location</label>
            <button type="button" class="btn-inline" id="retake-gps-btn">Retake GPS</button>
          </div>
          <p id="gps-value"></p>
        </div>
        <div id="metadata-fields"></div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="cancel-sample-btn">Cancel</button>
          <button type="submit" class="btn-primary">Save Sample</button>
        </div>
      </form>
    </div>
  `;
}

beforeEach(() => {
  buildDOM();
  vi.clearAllMocks();
  getProject.mockResolvedValue(MOCK_PROJECT);
  parseProject.mockReturnValue(MOCK_PARSED);
  getSampleBySampleId.mockResolvedValue(null);
  createSample.mockResolvedValue({ id: 'new-s1' });
  startScanner.mockResolvedValue({ getState: () => 2 });
  stopScanner.mockResolvedValue(undefined);
  getCurrentPosition.mockResolvedValue({ latitude: 47.6, longitude: -122.3, accuracy: 8 });
  capturePhoto.mockResolvedValue(null);
  savePhotoToDevice.mockResolvedValue(undefined);
  gpsListener = null;
  onGpsChange.mockImplementation((cb) => { gpsListener = cb; return gpsUnsubscribe; });
});

describe('renderSampleEntry', () => {
  it('redirects to home with toast when project not found', async () => {
    getProject.mockResolvedValue(undefined);
    await renderSampleEntry('nonexistent-id');
    expect(navigate).toHaveBeenCalledWith('#/');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('not found'), 'error');
  });

  it('starts the scanner on render', async () => {
    await renderSampleEntry('proj-1');
    expect(startScanner).toHaveBeenCalledWith('qr-reader', expect.any(Function), expect.any(Function));
  });

  it('shows the manual entry button', async () => {
    await renderSampleEntry('proj-1');
    expect(document.getElementById('manual-entry-btn')).not.toBeNull();
  });

  it('manual entry works while the scanner is still starting', async () => {
    startScanner.mockReturnValue(new Promise(() => {}));
    renderSampleEntry('proj-1');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('manual-entry-btn').click();

    expect(document.getElementById('manual-sample-id')).not.toBeNull();
  });

  it('a scanner error arriving after manual entry was chosen does not remove the manual input', async () => {
    let finishStart;
    startScanner.mockImplementation((id, onSuccess, onError) => new Promise((resolve) => {
      finishStart = () => { onError('Camera unavailable. Use manual entry instead.'); resolve({ getState: () => 1 }); };
    }));
    const rendering = renderSampleEntry('proj-1');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('manual-entry-btn').click();
    finishStart();
    await rendering;

    expect(document.getElementById('manual-sample-id')).not.toBeNull();
  });

  it('stops a scanner that finishes starting after manual entry was chosen', async () => {
    let finishStart;
    const instance = { getState: () => 2 };
    startScanner.mockImplementation(() => new Promise((resolve) => { finishStart = () => resolve(instance); }));
    const rendering = renderSampleEntry('proj-1');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('manual-entry-btn').click();
    finishStart();
    await rendering;

    expect(stopScanner).toHaveBeenCalledWith(instance);
  });

  it('shows the entry form when manual entry button is clicked', async () => {
    await renderSampleEntry('proj-1');
    document.getElementById('manual-entry-btn').click();
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe('photo prompt after scan', () => {
  it('shows photo prompt after handleSampleId is called', async () => {
    await renderSampleEntry('proj-1');
    const onSuccess = startScanner.mock.calls[0][1];
    await onSuccess('S-100');
    await new Promise((r) => setTimeout(r, 0));

    const prompt = document.getElementById('photo-prompt');
    expect(prompt).not.toBeNull();
    expect(prompt.textContent).toContain('photo');
  });

  it('labels the skip button "Not Now"', async () => {
    await renderSampleEntry('proj-1');
    const onSuccess = startScanner.mock.calls[0][1];
    await onSuccess('S-100');
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById('skip-photo-btn').textContent).toBe('Not Now');
  });

  it('skip button proceeds to entry form without photo', async () => {
    await renderSampleEntry('proj-1');
    const onSuccess = startScanner.mock.calls[0][1];
    await onSuccess('S-100');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('skip-photo-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById('photo-prompt')).toBeNull();
    expect(document.getElementById('sample-form').style.display).not.toBe('none');
  });

  it('take photo button calls capturePhoto and shows filename in form', async () => {
    const mockFile = new File(['data'], 'River_Study_S-100.jpg', { type: 'image/jpeg' });
    capturePhoto.mockResolvedValue(mockFile);

    await renderSampleEntry('proj-1');
    const onSuccess = startScanner.mock.calls[0][1];
    await onSuccess('S-100');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('take-photo-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(capturePhoto).toHaveBeenCalledWith('River Study', 'S-100');
    const photoSection = document.getElementById('photo-section');
    expect(photoSection.textContent).toContain('River_Study_S-100.jpg');
  });

  it('shows Add Photo button in form when photo was skipped', async () => {
    await renderSampleEntry('proj-1');
    const onSuccess = startScanner.mock.calls[0][1];
    await onSuccess('S-100');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('skip-photo-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById('add-photo-btn')).not.toBeNull();
  });

  it('saves photo to device and stores filename on form submit', async () => {
    const mockFile = new File(['data'], 'River_Study_S-100.jpg', { type: 'image/jpeg' });
    capturePhoto.mockResolvedValue(mockFile);

    await renderSampleEntry('proj-1');
    const onSuccess = startScanner.mock.calls[0][1];
    await onSuccess('S-100');
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('take-photo-btn').click();
    await new Promise((r) => setTimeout(r, 0));

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(savePhotoToDevice).toHaveBeenCalledWith(mockFile);
    expect(createSample).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ photoFilename: 'River_Study_S-100.jpg' })
    );
  });
});

describe('renderEntryForm', () => {
  it('displays sample ID as read-only', async () => {
    getCurrentPosition.mockResolvedValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }, { key: 'Collector', label: 'Collector', type: 'text', status: 'optional' }], 'S-100');
    expect(document.getElementById('display-sample-id').textContent).toBe('S-100');
  });

  it('pre-populates datetime to approximately now', async () => {
    getCurrentPosition.mockResolvedValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }, { key: 'Collector', label: 'Collector', type: 'text', status: 'optional' }], 'S-100');
    const dtInput = document.getElementById('sample-datetime');
    expect(dtInput.value).not.toBe('');
  });

  it('renders an input for each metadata field', async () => {
    getCurrentPosition.mockResolvedValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }, { key: 'Collector', label: 'Collector', type: 'text', status: 'optional' }, { key: 'Weather', label: 'Weather', type: 'text', status: 'optional' }], 'S-100');
    const inputs = document.querySelectorAll('#metadata-fields input');
    expect(inputs).toHaveLength(3);
  });

  it('shows GPS coordinates when location is available', async () => {
    getCurrentPosition.mockResolvedValue({ latitude: 47.6, longitude: -122.3, accuracy: 8 });
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    const gpsText = document.getElementById('gps-value').textContent;
    expect(gpsText).toContain('47.6');
    expect(gpsText).toContain('-122.3');
  });

  it('shows warning text when GPS is unavailable', async () => {
    getCurrentPosition.mockResolvedValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    const gpsText = document.getElementById('gps-value').textContent.toLowerCase();
    expect(gpsText).toContain('unavailable');
  });

  it('saves a new sample on form submit', async () => {
    getCurrentPosition.mockResolvedValue({ latitude: 47.6, longitude: -122.3, accuracy: 8 });
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }, { key: 'Collector', label: 'Collector', type: 'text', status: 'optional' }], 'S-100');

    document.querySelectorAll('#metadata-fields input')[0].value = 'River A';
    document.querySelectorAll('#metadata-fields input')[1].value = 'Jane';

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(createSample).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        sampleId: 'S-100',
        latitude: 47.6,
        longitude: -122.3,
        gpsAccuracy: 8,
        metadata: { Site: 'River A', Collector: 'Jane' },
      })
    );
    expect(showToast).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('#/project/proj-1');
  });

  it('calls updateSample when existingId is provided', async () => {
    getCurrentPosition.mockResolvedValue(null);
    updateSample.mockResolvedValue(undefined);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100', 'existing-s1');

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(updateSample).toHaveBeenCalledWith('existing-s1', expect.objectContaining({ sampleId: 'S-100' }));
  });

  it('updating an existing sample without a new photo leaves its saved photo alone', async () => {
    getCurrentPosition.mockReturnValue(null);
    updateSample.mockResolvedValue(undefined);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100', 'existing-s1');

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(updateSample.mock.calls[0][1]).not.toHaveProperty('photoFilename');
  });

  it('updating an existing sample with a new photo saves the new filename', async () => {
    getCurrentPosition.mockReturnValue(null);
    updateSample.mockResolvedValue(undefined);
    const file = new File(['d'], 'new.jpg', { type: 'image/jpeg' });
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100', 'existing-s1', file);

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(updateSample).toHaveBeenCalledWith('existing-s1', expect.objectContaining({ photoFilename: 'new.jpg' }));
  });

  it('blocks saving while a required field or QA/QC box is empty, and says which', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [
      { key: 'samplers', label: 'Sampler(s)', type: 'text', status: 'required' },
      { key: 'qaqc_gloves_used', label: 'QA/QC: Sterile Gloves Worn?', type: 'checkbox', status: 'qaqc' },
    ], 'S-100');

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(createSample).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Sampler(s)'), 'error');
    expect(document.querySelectorAll('.field-missing')).toHaveLength(2);
  });

  it('saves once required fields and QA/QC boxes are filled', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [
      { key: 'samplers', label: 'Sampler(s)', type: 'text', status: 'required' },
      { key: 'qaqc_gloves_used', label: 'QA/QC: Sterile Gloves Worn?', type: 'checkbox', status: 'qaqc' },
    ], 'S-100');
    document.querySelector('[data-field="samplers"]').value = 'LS';
    document.querySelector('[data-field="qaqc_gloves_used"]').checked = true;

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(createSample).toHaveBeenCalledWith('proj-1', expect.objectContaining({
      metadata: { samplers: 'LS', qaqc_gloves_used: 'true' },
    }));
  });

  it('keeps listening to GPS when a save is blocked', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [{ key: 'samplers', label: 'Sampler(s)', type: 'text', status: 'required' }], 'S-100');
    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(gpsUnsubscribe).not.toHaveBeenCalled();
  });

  it('shows duplicate warning when sampleId already exists', async () => {
    getSampleBySampleId.mockResolvedValue({ id: 'dup-s1', sampleId: 'S-DUP' });
    confirmDialog.mockResolvedValue(false);
    getCurrentPosition.mockResolvedValue(null);

    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-DUP');

    expect(confirmDialog).toHaveBeenCalled();
  });

  it('cancel button navigates to project dashboard', async () => {
    getCurrentPosition.mockResolvedValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    document.getElementById('cancel-sample-btn').click();
    expect(navigate).toHaveBeenCalledWith('#/project/proj-1');
  });

  it('Retake Time resets the date/time to now', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    const dtInput = document.getElementById('sample-datetime');
    dtInput.value = '2020-01-01T00:00';

    document.getElementById('retake-time-btn').click();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    expect(dtInput.value.startsWith(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T`)).toBe(true);
  });

  it('updates GPS display and saved coordinates when a newer fix arrives', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');

    gpsListener({ latitude: 45.1, longitude: -75.2, accuracy: 6, state: 'locked' });
    expect(document.getElementById('gps-value').textContent).toContain('45.1');

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(createSample).toHaveBeenCalledWith('proj-1', expect.objectContaining({
      latitude: 45.1, longitude: -75.2, gpsAccuracy: 6,
    }));
  });

  it('warns when GPS accuracy is worse than 15 m', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');

    gpsListener({ latitude: 45.1, longitude: -75.2, accuracy: 40, state: 'locking' });
    const gpsEl = document.getElementById('gps-value');
    expect(gpsEl.classList.contains('gps-warning')).toBe(true);
    expect(gpsEl.textContent.toLowerCase()).toContain('low accuracy');

    gpsListener({ latitude: 45.1, longitude: -75.2, accuracy: 9, state: 'locked' });
    expect(gpsEl.classList.contains('gps-warning')).toBe(false);
  });

  it('Retake GPS discards the current fix and restarts the GPS watch', async () => {
    getCurrentPosition.mockReturnValue({ latitude: 47.6, longitude: -122.3, accuracy: 30 });
    restartGpsWatch.mockImplementation(() => {
      gpsListener({ latitude: null, longitude: null, accuracy: null, state: 'waiting' });
    });
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');

    document.getElementById('retake-gps-btn').click();

    expect(restartGpsWatch).toHaveBeenCalledTimes(1);
    expect(document.getElementById('gps-value').textContent.toLowerCase()).toContain('acquiring');

    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(createSample).toHaveBeenCalledWith('proj-1', expect.objectContaining({ latitude: null }));
  });

  it('stops listening to GPS updates when the form is cancelled', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    document.getElementById('cancel-sample-btn').click();
    expect(gpsUnsubscribe).toHaveBeenCalled();
  });

  it('stops listening to GPS updates after saving', async () => {
    getCurrentPosition.mockReturnValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    document.getElementById('sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(gpsUnsubscribe).toHaveBeenCalled();
  });

  it('labels the photo retake button "Retake Photo"', async () => {
    getCurrentPosition.mockReturnValue(null);
    const file = new File(['d'], 'p.jpg', { type: 'image/jpeg' });
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100', undefined, file);
    expect(document.getElementById('retake-photo-btn').textContent).toBe('Retake Photo');
  });

  it('does not leak duplicate #photo-section nodes when rendered multiple times', async () => {
    // Regression: sample-entry.js appended photoSection as a sibling of
    // #metadata-fields via metaContainer.after(), but clearElement() only wiped
    // the contents of #metadata-fields, leaving the prior photo section behind
    // on re-entry. Each re-render stacked another #photo-section and another
    // Add Photo button in the DOM. Fixed by removing any existing photo section
    // before inserting the new one.
    getCurrentPosition.mockResolvedValue(null);
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-100');
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-101');
    await renderEntryForm('proj-1', [{ key: 'Site', label: 'Site', type: 'text', status: 'optional' }], 'S-102');

    const photoSections = document.querySelectorAll('#photo-section');
    expect(photoSections).toHaveLength(1);

    const addPhotoButtons = document.querySelectorAll('#add-photo-btn');
    expect(addPhotoButtons).toHaveLength(1);
  });
});
