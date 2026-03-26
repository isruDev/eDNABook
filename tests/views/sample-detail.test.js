// tests/views/sample-detail.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/db.js', () => ({
  getSample: vi.fn(),
  getProject: vi.fn(),
  parseProject: vi.fn(),
  updateSample: vi.fn(),
  deleteSample: vi.fn(),
}));

vi.mock('../../js/ui.js', () => ({
  $: vi.fn((sel) => document.querySelector(sel)),
  showView: vi.fn(),
  showToast: vi.fn(),
  confirmDialog: vi.fn(),
  vibrate: vi.fn(),
  clearElement: vi.fn((el) => { el.innerHTML = ''; }),
  formatDate: vi.fn((d) => `formatted:${d}`),
}));

vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../js/photo.js', () => ({
  capturePhoto: vi.fn(),
  savePhotoToDevice: vi.fn(),
}));

import { getSample, getProject, parseProject, updateSample, deleteSample } from '../../js/db.js';
import { showView, showToast, confirmDialog, vibrate } from '../../js/ui.js';
import { navigate } from '../../js/app.js';
import { capturePhoto, savePhotoToDevice } from '../../js/photo.js';
import { renderSampleDetail, renderSampleEdit } from '../../js/views/sample-detail.js';

const MOCK_PROJECT = { id: 'proj-1', content: 'River Study\nSite\nCollector' };
const MOCK_PARSED = { title: 'River Study', fields: [{ name: 'Site', type: 'text' }, { name: 'Collector', type: 'text' }] };
const MOCK_SAMPLE = {
  id: 'sample-1',
  projectId: 'proj-1',
  sampleId: 'S-001',
  scannedAt: '2026-01-15T09:30:00',
  latitude: 47.6062,
  longitude: -122.3321,
  gpsAccuracy: 5,
  metadata: { Site: 'River A', Collector: 'Jane' },
  createdAt: '2026-01-15T09:30:00',
  updatedAt: '2026-01-15T09:30:00',
};

function buildDetailDOM() {
  document.body.innerHTML = `
    <div data-view="sample-detail" class="view">
      <header>
        <button class="btn-back">Back</button>
        <h1>Sample Details</h1>
        <button class="btn-icon" id="edit-sample-btn">Edit</button>
      </header>
      <div id="sample-detail-content"></div>
      <button class="btn-danger" id="delete-sample-btn">Delete Sample</button>
    </div>
    <div data-view="sample-edit" class="view">
      <header>
        <button class="btn-back">Cancel</button>
        <h1>Edit Sample</h1>
      </header>
      <form id="edit-sample-form">
        <div class="form-field">
          <label>Sample ID</label>
          <p id="edit-display-sample-id" class="readonly-value"></p>
        </div>
        <div class="form-field">
          <label for="edit-sample-datetime">Date / Time</label>
          <input type="datetime-local" id="edit-sample-datetime">
        </div>
        <div class="form-field" id="edit-gps-display">
          <label>GPS Location</label>
          <p id="edit-gps-value"></p>
        </div>
        <div id="edit-metadata-fields"></div>
        <button type="submit" class="btn-primary">Save Changes</button>
      </form>
    </div>
  `;
}

beforeEach(() => {
  buildDetailDOM();
  vi.clearAllMocks();
  getSample.mockResolvedValue(MOCK_SAMPLE);
  getProject.mockResolvedValue(MOCK_PROJECT);
  parseProject.mockReturnValue(MOCK_PARSED);
  updateSample.mockResolvedValue(undefined);
  deleteSample.mockResolvedValue(undefined);
  capturePhoto.mockResolvedValue(null);
  savePhotoToDevice.mockResolvedValue(undefined);
});

describe('renderSampleDetail', () => {
  it('renders sample ID in content area', async () => {
    await renderSampleDetail('sample-1');
    expect(document.getElementById('sample-detail-content').textContent).toContain('S-001');
  });

  it('renders formatted date', async () => {
    await renderSampleDetail('sample-1');
    expect(document.getElementById('sample-detail-content').textContent).toContain('formatted:2026-01-15T09:30:00');
  });

  it('renders GPS coordinates', async () => {
    await renderSampleDetail('sample-1');
    const content = document.getElementById('sample-detail-content').textContent;
    expect(content).toContain('47.6062');
    expect(content).toContain('-122.3321');
  });

  it('shows no location message when GPS fields are null', async () => {
    getSample.mockResolvedValue({ ...MOCK_SAMPLE, latitude: null, longitude: null, gpsAccuracy: null });
    await renderSampleDetail('sample-1');
    const content = document.getElementById('sample-detail-content').textContent.toLowerCase();
    expect(content).toContain('no location');
  });

  it('renders each metadata field with its value', async () => {
    await renderSampleDetail('sample-1');
    const content = document.getElementById('sample-detail-content').textContent;
    expect(content).toContain('Site');
    expect(content).toContain('River A');
    expect(content).toContain('Collector');
    expect(content).toContain('Jane');
  });

  it('back button navigates to project dashboard', async () => {
    await renderSampleDetail('sample-1');
    document.querySelector('[data-view="sample-detail"] .btn-back').click();
    expect(navigate).toHaveBeenCalledWith('#/project/proj-1');
  });

  it('edit button navigates to sample edit view', async () => {
    await renderSampleDetail('sample-1');
    document.getElementById('edit-sample-btn').click();
    expect(navigate).toHaveBeenCalledWith('#/sample/sample-1/edit');
  });

  it('delete button uses tap-to-confirm: second tap deletes sample', async () => {
    await renderSampleDetail('sample-1');
    const btn = document.getElementById('delete-sample-btn');

    btn.click();
    expect(btn.classList.contains('confirming')).toBe(true);

    await btn.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(deleteSample).toHaveBeenCalledWith('sample-1');
    expect(navigate).toHaveBeenCalledWith('#/project/proj-1');
  });

  it('shows photo filename when sample has photoFilename', async () => {
    getSample.mockResolvedValue({ ...MOCK_SAMPLE, photoFilename: 'River_Study_S-001.jpg' });
    await renderSampleDetail('sample-1');
    const content = document.getElementById('sample-detail-content').textContent;
    expect(content).toContain('River_Study_S-001.jpg');
  });

  it('shows Retake Photo button when sample has photoFilename', async () => {
    getSample.mockResolvedValue({ ...MOCK_SAMPLE, photoFilename: 'River_Study_S-001.jpg' });
    await renderSampleDetail('sample-1');
    const retakeBtn = document.getElementById('retake-photo-detail-btn');
    expect(retakeBtn).not.toBeNull();
  });

  it('shows Add Photo button when sample has no photoFilename', async () => {
    await renderSampleDetail('sample-1');
    const addBtn = document.getElementById('add-photo-detail-btn');
    expect(addBtn).not.toBeNull();
  });

  it('delete button reverts if not confirmed (first tap only)', async () => {
    await renderSampleDetail('sample-1');
    const btn = document.getElementById('delete-sample-btn');
    btn.click();

    await new Promise((r) => setTimeout(r, 0));

    expect(deleteSample).not.toHaveBeenCalled();
  });
});

describe('renderSampleEdit', () => {
  it('displays sample ID as read-only', async () => {
    await renderSampleEdit('sample-1');
    expect(document.getElementById('edit-display-sample-id').textContent).toBe('S-001');
  });

  it('pre-populates datetime input', async () => {
    await renderSampleEdit('sample-1');
    expect(document.getElementById('edit-sample-datetime').value).toBe('2026-01-15T09:30');
  });

  it('renders GPS info from existing sample', async () => {
    await renderSampleEdit('sample-1');
    const gpsText = document.getElementById('edit-gps-value').textContent;
    expect(gpsText).toContain('47.6062');
  });

  it('shows no location when GPS fields are null', async () => {
    getSample.mockResolvedValue({ ...MOCK_SAMPLE, latitude: null, longitude: null, gpsAccuracy: null });
    await renderSampleEdit('sample-1');
    const gpsText = document.getElementById('edit-gps-value').textContent.toLowerCase();
    expect(gpsText).toContain('no location');
  });

  it('pre-populates metadata field inputs', async () => {
    await renderSampleEdit('sample-1');
    const inputs = document.querySelectorAll('#edit-metadata-fields input');
    expect(inputs[0].value).toBe('River A');
    expect(inputs[1].value).toBe('Jane');
  });

  it('calls updateSample with correct data on submit', async () => {
    await renderSampleEdit('sample-1');

    const inputs = document.querySelectorAll('#edit-metadata-fields input');
    inputs[0].value = 'Lake C';
    inputs[1].value = 'Bob';

    document.getElementById('edit-sample-form').dispatchEvent(new Event('submit', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(updateSample).toHaveBeenCalledWith(
      'sample-1',
      expect.objectContaining({
        sampleId: 'S-001',
        metadata: { Site: 'Lake C', Collector: 'Bob' },
      })
    );
    expect(showToast).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('#/sample/sample-1');
  });

  it('cancel button navigates back to detail view', async () => {
    await renderSampleEdit('sample-1');
    document.querySelector('[data-view="sample-edit"] .btn-back').click();
    expect(navigate).toHaveBeenCalledWith('#/sample/sample-1');
  });
});
