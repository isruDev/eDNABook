import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../js/db.js', () => ({
  createProject: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  parseProject: vi.fn(),
}));

vi.mock('../../js/ui.js', () => ({
  showView: vi.fn(),
  showToast: vi.fn(),
  clearElement: vi.fn(el => { el.innerHTML = ''; }),
  createElement: vi.fn((tag, attrs, children) => {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') el.className = v;
        else if (k === 'textContent') el.textContent = v;
        else el.setAttribute(k, v);
      }
    }
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) {
      for (const c of children) { if (c != null) el.appendChild(c); }
    }
    return el;
  }),
  confirmDialog: vi.fn(),
}));

vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

import { createProject, getProject, updateProject, parseProject } from '../../js/db.js';
import { navigate } from '../../js/app.js';
import { showView, showToast } from '../../js/ui.js';
import {
  serializeFields,
  deserializeContent,
  addField,
  removeField,
  moveFieldUp,
  moveFieldDown,
  renderProjectForm,
} from '../../js/views/project-form.js';

// ---------------------------------------------------------------------------
// DOM setup
// ---------------------------------------------------------------------------

function setupDOM() {
  document.body.innerHTML = `
    <div id="app">
      <div class="view" data-view="project-form">
        <header>
          <button class="btn-back" id="form-back-btn">Back</button>
          <h1 id="form-title">New Project</h1>
        </header>
        <form id="project-form">
          <label for="project-title-input">Project Title</label>
          <input type="text" id="project-title-input" placeholder="e.g., River Survey 2026">
          <h2>Metadata Fields</h2>
          <div id="field-list"></div>
          <button type="button" class="btn-secondary" id="add-field-btn">Add Field</button>
          <button type="submit" class="btn-primary" id="save-project-btn">Save Project</button>
        </form>
      </div>
    </div>
    <div id="toast-container"></div>
  `;
}

beforeEach(() => {
  setupDOM();
  vi.clearAllMocks();
  // Default parseProject behavior mirrors the real implementation
  parseProject.mockImplementation((content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { title: '', fields: [] };
    const [title, ...fields] = lines;
    return { title, fields };
  });
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// serializeFields (pure function)
// ---------------------------------------------------------------------------

describe('serializeFields', () => {
  it('serializes title and fields into newline-delimited content', () => {
    const result = serializeFields('River Survey', ['Collector', 'Site', 'Depth']);
    expect(result).toBe('River Survey\nCollector\nSite\nDepth');
  });

  it('serializes title with no fields', () => {
    const result = serializeFields('Just Title', []);
    expect(result).toBe('Just Title');
  });

  it('trims whitespace from title and fields during serialization', () => {
    const result = serializeFields('  Survey  ', ['  Field1  ', '  Field2  ']);
    expect(result).toBe('Survey\nField1\nField2');
  });
});

// ---------------------------------------------------------------------------
// deserializeContent (pure function)
// ---------------------------------------------------------------------------

describe('deserializeContent', () => {
  it('extracts title and fields from content string', () => {
    const result = deserializeContent('River Survey\nCollector\nSite');
    expect(result.title).toBe('River Survey');
    expect(result.fields).toEqual(['Collector', 'Site']);
  });

  it('returns empty title and fields for empty content', () => {
    const result = deserializeContent('');
    expect(result.title).toBe('');
    expect(result.fields).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addField (pure function)
// ---------------------------------------------------------------------------

describe('addField', () => {
  it('appends an empty string to the fields array', () => {
    const result = addField(['A', 'B']);
    expect(result).toEqual(['A', 'B', '']);
  });

  it('returns a new array (does not mutate input)', () => {
    const original = ['A'];
    const result = addField(original);
    expect(result).not.toBe(original);
    expect(original).toEqual(['A']);
  });
});

// ---------------------------------------------------------------------------
// removeField (pure function)
// ---------------------------------------------------------------------------

describe('removeField', () => {
  it('removes the field at the given index', () => {
    const result = removeField(['A', 'B', 'C'], 1);
    expect(result).toEqual(['A', 'C']);
  });

  it('removes the first field', () => {
    const result = removeField(['A', 'B'], 0);
    expect(result).toEqual(['B']);
  });

  it('returns a new array (does not mutate input)', () => {
    const original = ['A', 'B'];
    const result = removeField(original, 0);
    expect(result).not.toBe(original);
  });
});

// ---------------------------------------------------------------------------
// moveFieldUp (pure function)
// ---------------------------------------------------------------------------

describe('moveFieldUp', () => {
  it('swaps the field at index with the one above it', () => {
    const result = moveFieldUp(['A', 'B', 'C'], 1);
    expect(result).toEqual(['B', 'A', 'C']);
  });

  it('does nothing when index is 0', () => {
    const result = moveFieldUp(['A', 'B'], 0);
    expect(result).toEqual(['A', 'B']);
  });

  it('returns a new array (does not mutate input)', () => {
    const original = ['A', 'B'];
    const result = moveFieldUp(original, 1);
    expect(result).not.toBe(original);
  });
});

// ---------------------------------------------------------------------------
// moveFieldDown (pure function)
// ---------------------------------------------------------------------------

describe('moveFieldDown', () => {
  it('swaps the field at index with the one below it', () => {
    const result = moveFieldDown(['A', 'B', 'C'], 1);
    expect(result).toEqual(['A', 'C', 'B']);
  });

  it('does nothing when index is the last position', () => {
    const result = moveFieldDown(['A', 'B'], 1);
    expect(result).toEqual(['A', 'B']);
  });

  it('returns a new array (does not mutate input)', () => {
    const original = ['A', 'B'];
    const result = moveFieldDown(original, 0);
    expect(result).not.toBe(original);
  });
});

// ---------------------------------------------------------------------------
// renderProjectForm -- create mode
// ---------------------------------------------------------------------------

describe('renderProjectForm (create mode)', () => {
  it('calls showView with "project-form"', async () => {
    await renderProjectForm();
    expect(showView).toHaveBeenCalledWith('project-form');
  });

  it('sets form heading to "New Project"', async () => {
    await renderProjectForm();
    const heading = document.getElementById('form-title');
    expect(heading.textContent).toBe('New Project');
  });

  it('renders the Add Field button', async () => {
    await renderProjectForm();
    const btn = document.getElementById('add-field-btn');
    expect(btn).not.toBeNull();
  });

  it('clicking Add Field adds a field row to #field-list', async () => {
    await renderProjectForm();
    const addBtn = document.getElementById('add-field-btn');
    addBtn.click();
    const rows = document.querySelectorAll('.field-row');
    expect(rows.length).toBe(1);
  });

  it('clicking remove button on a field row removes that row', async () => {
    await renderProjectForm();
    document.getElementById('add-field-btn').click();
    document.getElementById('add-field-btn').click();
    let rows = document.querySelectorAll('.field-row');
    expect(rows.length).toBe(2);
    const removeBtn = rows[0].querySelector('.btn-remove-field');
    removeBtn.click();
    rows = document.querySelectorAll('.field-row');
    expect(rows.length).toBe(1);
  });

  it('submitting with empty title shows error and does not call createProject', async () => {
    await renderProjectForm();
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(createProject).not.toHaveBeenCalled();
  });

  it('submitting with a valid title calls createProject with correct content', async () => {
    createProject.mockResolvedValue({ id: 'new-project-id', content: '' });
    await renderProjectForm();

    document.getElementById('project-title-input').value = 'River Survey';
    document.getElementById('add-field-btn').click();
    document.querySelector('.field-row input').value = 'Collector';

    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
    const [content] = createProject.mock.calls[0];
    expect(content).toBe('River Survey\nCollector');
  });

  it('navigates to project dashboard after successful create', async () => {
    createProject.mockResolvedValue({ id: 'new-project-id', content: '' });
    await renderProjectForm();
    document.getElementById('project-title-input').value = 'Test Project';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('#/project/new-project-id'));
  });
});

// ---------------------------------------------------------------------------
// renderProjectForm -- edit mode
// ---------------------------------------------------------------------------

describe('renderProjectForm (edit mode)', () => {
  it('loads existing project content into the form', async () => {
    getProject.mockResolvedValue({
      id: 'existing-id',
      content: 'River Survey\nCollector\nSite',
    });
    await renderProjectForm('existing-id');
    const titleInput = document.getElementById('project-title-input');
    expect(titleInput.value).toBe('River Survey');
  });

  it('pre-renders existing fields', async () => {
    getProject.mockResolvedValue({
      id: 'existing-id',
      content: 'Survey\nFieldA\nFieldB',
    });
    await renderProjectForm('existing-id');
    const rows = document.querySelectorAll('.field-row');
    expect(rows.length).toBe(2);
  });

  it('sets form heading to "Edit Project"', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Survey\nField' });
    await renderProjectForm('existing-id');
    const heading = document.getElementById('form-title');
    expect(heading.textContent).toBe('Edit Project');
  });

  it('submitting calls updateProject with the project id and new content', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Old Name\nField' });
    updateProject.mockResolvedValue({ id: 'existing-id', content: '' });
    await renderProjectForm('existing-id');

    document.getElementById('project-title-input').value = 'New Name';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));
    const [id, content] = updateProject.mock.calls[0];
    expect(id).toBe('existing-id');
    expect(content).toContain('New Name');
  });

  it('navigates to project dashboard after successful update', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Survey\nField' });
    updateProject.mockResolvedValue({ id: 'existing-id', content: '' });
    await renderProjectForm('existing-id');
    document.getElementById('project-title-input').value = 'Updated';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('#/project/existing-id'));
  });
});
