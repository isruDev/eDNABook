// tests/views/project-dashboard.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock modules before importing the view
vi.mock('../../js/db.js', () => ({
  getProject: vi.fn(),
  getSamplesByProject: vi.fn(),
  deleteProject: vi.fn(),
  deleteSample: vi.fn(),
  parseProject: vi.fn(),
}));

vi.mock('../../js/ui.js', () => ({
  $: vi.fn((sel, ctx) => (ctx || document).querySelector(sel)),
  $$: vi.fn((sel, ctx) => Array.from((ctx || document).querySelectorAll(sel))),
  createElement: vi.fn((tag, attrs, text) => {
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text != null) el.textContent = text;
    return el;
  }),
  clearElement: vi.fn((el) => { el.innerHTML = ''; }),
  showView: vi.fn(),
  showToast: vi.fn(),
  confirmDialog: vi.fn(),
  formatDate: vi.fn((d) => d),
  vibrate: vi.fn(),
}));

vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../js/export.js', () => ({
  generateCSV: vi.fn(),
  generateSQLite: vi.fn(),
  shareOrDownload: vi.fn(),
}));

import {
  getProject,
  getSamplesByProject,
  deleteProject,
  deleteSample,
  parseProject,
} from '../../js/db.js';
import { showView, showToast, confirmDialog } from '../../js/ui.js';
import { navigate } from '../../js/app.js';
import { shareOrDownload } from '../../js/export.js';
import { metadataSummary } from '../../js/template-share.js';
import { renderProjectDashboard } from '../../js/views/project-dashboard.js';

const MOCK_PROJECT = { id: 'proj-1', content: 'Test Project\nSite\nCollector', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const MOCK_PARSED = { title: 'Test Project', fields: [{ name: 'Site', type: 'text' }, { name: 'Collector', type: 'text' }] };
const MOCK_SAMPLES = [
  { id: 's1', sampleId: 'S-001', scannedAt: '2026-01-01T10:00:00', metadata: { Site: 'River A', Collector: 'Jane' } },
  { id: 's2', sampleId: 'S-002', scannedAt: '2026-01-02T11:00:00', metadata: { Site: 'Lake B', Collector: 'John' } },
];

beforeEach(() => {
  document.body.innerHTML = `
    <div data-view="project-dashboard" class="view">
      <header>
        <button class="btn-back">Back</button>
        <h1 id="dashboard-title"></h1>
        <button class="btn-icon" id="edit-project-btn">Edit</button>
      </header>
      <div id="dashboard-fields" class="field-tags"></div>
      <div class="template-actions">
        <button class="btn-secondary" id="share-template-btn">Share Template</button>
        <button class="btn-secondary" id="copy-summary-btn">Copy Summary</button>
      </div>
      <div class="dashboard-actions">
        <button class="btn-primary btn-large" id="scan-btn">Scan Sample</button>
        <button class="btn-secondary" id="export-btn">Export Data</button>
      </div>
      <div id="sample-count"></div>
      <div id="sample-list"></div>
      <button class="btn-danger" id="delete-project-btn">Delete Project</button>
    </div>
  `;
  vi.clearAllMocks();
  getProject.mockResolvedValue(MOCK_PROJECT);
  parseProject.mockReturnValue(MOCK_PARSED);
  getSamplesByProject.mockResolvedValue(MOCK_SAMPLES);
});

describe('renderProjectDashboard', () => {
  it('renders project title', async () => {
    await renderProjectDashboard('proj-1');
    expect(document.getElementById('dashboard-title').textContent).toBe('Test Project');
  });

  it('renders field tags for each custom field', async () => {
    await renderProjectDashboard('proj-1');
    const tags = document.querySelectorAll('#dashboard-fields .field-tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].textContent).toBe('Site');
    expect(tags[1].textContent).toBe('Collector');
  });

  it('renders the title and field labels of a v2 (template-based) project', async () => {
    getProject.mockResolvedValue({
      id: 'proj-1', title: 'Lake Template', templateId: 'aquatic',
      fields: [{ key: 'volume_filtered_ml', label: 'Volume Filtered (mL)', type: 'number', status: 'required' }],
    });
    await renderProjectDashboard('proj-1');
    expect(document.getElementById('dashboard-title').textContent).toBe('Lake Template');
    expect(document.getElementById('dashboard-fields').textContent).toContain('Volume Filtered (mL)');
  });

  it('shows sample count', async () => {
    await renderProjectDashboard('proj-1');
    expect(document.getElementById('sample-count').textContent).toContain('2');
  });

  it('renders a card for each sample', async () => {
    await renderProjectDashboard('proj-1');
    const cards = document.querySelectorAll('#sample-list .sample-card');
    expect(cards).toHaveLength(2);
  });

  it('sample card shows sampleId', async () => {
    await renderProjectDashboard('proj-1');
    const first = document.querySelector('#sample-list .sample-card');
    expect(first.textContent).toContain('S-001');
  });

  it('export button is disabled when there are no samples', async () => {
    getSamplesByProject.mockResolvedValue([]);
    await renderProjectDashboard('proj-1');
    expect(document.getElementById('export-btn').disabled).toBe(true);
  });

  it('export button is enabled when samples exist', async () => {
    await renderProjectDashboard('proj-1');
    expect(document.getElementById('export-btn').disabled).toBe(false);
  });

  it('back button navigates home', async () => {
    await renderProjectDashboard('proj-1');
    document.querySelector('.btn-back').click();
    expect(navigate).toHaveBeenCalledWith('#/');
  });

  it('scan button navigates to scan view', async () => {
    await renderProjectDashboard('proj-1');
    document.getElementById('scan-btn').click();
    expect(navigate).toHaveBeenCalledWith('#/project/proj-1/scan');
  });

  it('edit button navigates to project edit form', async () => {
    await renderProjectDashboard('proj-1');
    document.getElementById('edit-project-btn').click();
    expect(navigate).toHaveBeenCalledWith('#/project/proj-1/edit');
  });

  it('delete button uses tap-to-confirm: first tap enters confirming state', async () => {
    await renderProjectDashboard('proj-1');
    const btn = document.getElementById('delete-project-btn');
    btn.click();

    expect(btn.classList.contains('confirming')).toBe(true);
    expect(btn.textContent).toBe('Tap again to confirm');
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('delete button: second tap within 5s deletes project + samples', async () => {
    deleteProject.mockResolvedValue(undefined);
    deleteSample.mockResolvedValue(undefined);

    await renderProjectDashboard('proj-1');
    const btn = document.getElementById('delete-project-btn');

    btn.click();
    await btn.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(deleteProject).toHaveBeenCalledWith('proj-1');
    MOCK_SAMPLES.forEach((s) => expect(deleteSample).toHaveBeenCalledWith(s.id));
    expect(navigate).toHaveBeenCalledWith('#/');
  });

  it('clicking sample card navigates to sample detail', async () => {
    await renderProjectDashboard('proj-1');
    document.querySelector('#sample-list .sample-card').click();
    expect(navigate).toHaveBeenCalledWith('#/sample/s1');
  });

  it('redirects to home with toast when project not found', async () => {
    getProject.mockResolvedValue(undefined);
    await renderProjectDashboard('nonexistent-id');
    expect(navigate).toHaveBeenCalledWith('#/');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('not found'), 'error');
  });
});

describe('template sharing', () => {
  const SCHEMA = {
    title: 'Test Project',
    templateId: null,
    fields: [
      { key: 'Site', label: 'Site', type: 'text', status: 'optional' },
      { key: 'Collector', label: 'Collector', type: 'text', status: 'optional' },
    ],
  };

  it('Share Template sends the project fields as a JSON template file', async () => {
    await renderProjectDashboard('proj-1');
    await document.getElementById('share-template-btn').onclick();

    expect(shareOrDownload).toHaveBeenCalledTimes(1);
    const [text, filename, mime] = shareOrDownload.mock.calls[0];
    expect(JSON.parse(text)).toMatchObject({ format: 'ednalite-template', title: 'Test Project', fields: SCHEMA.fields });
    expect(filename).toBe('Test_Project_template.json');
    expect(mime).toBe('application/json');
  });

  it('Share Template shows an error toast when sharing fails', async () => {
    shareOrDownload.mockRejectedValueOnce(new Error('boom'));
    await renderProjectDashboard('proj-1');
    await document.getElementById('share-template-btn').onclick();
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/template/i), 'error');
  });

  it('Copy Summary puts the metadata summary on the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await renderProjectDashboard('proj-1');
    await document.getElementById('copy-summary-btn').onclick();

    expect(writeText).toHaveBeenCalledWith(metadataSummary(SCHEMA));
    expect(showToast).toHaveBeenCalledWith('Summary copied');
  });

  it('Copy Summary shows an error toast when the clipboard is blocked', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await renderProjectDashboard('proj-1');
    await document.getElementById('copy-summary-btn').onclick();

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/copy/i), 'error');
  });
});
