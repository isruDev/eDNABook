import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../js/db.js', () => ({
  createProjectFromSchema: vi.fn(),
  getProject: vi.fn(),
  updateProjectSchema: vi.fn(),
  getAllProjects: vi.fn(),
  parseProject: vi.fn((content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { title: '', fields: [] };
    const [title, ...rawFields] = lines;
    const fields = rawFields.map(l => {
      if (l.startsWith('[checkbox]')) return { name: l.slice(10), type: 'checkbox' };
      return { name: l, type: 'text' };
    });
    return { title, fields };
  }),
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

import { createProjectFromSchema, getProject, updateProjectSchema, parseProject, getAllProjects } from '../../js/db.js';
import { navigate } from '../../js/app.js';
import { PRESETS } from '../../js/templates.js';
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
          <div id="preset-picker"></div>
          <div id="builtin-fields"></div>
          <div id="preset-fields"></div>
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
  getAllProjects.mockResolvedValue([]);
  // Default parseProject behavior mirrors the real implementation
  parseProject.mockImplementation((content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { title: '', fields: [] };
    const [title, ...rawFields] = lines;
    const fields = rawFields.map(l => {
      if (l.startsWith('[checkbox]')) return { name: l.slice(10), type: 'checkbox' };
      return { name: l, type: 'text' };
    });
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
  it('serializes title and typed fields into newline-delimited content', () => {
    const result = serializeFields('River Survey', [
      { name: 'Collector', type: 'text' },
      { name: 'Site', type: 'text' },
    ]);
    expect(result).toBe('River Survey\nCollector\nSite');
  });

  it('serializes checkbox fields with [checkbox] prefix', () => {
    const result = serializeFields('Study', [
      { name: 'pH', type: 'text' },
      { name: 'Waders Cleaned', type: 'checkbox' },
    ]);
    expect(result).toBe('Study\npH\n[checkbox]Waders Cleaned');
  });

  it('serializes title with no fields', () => {
    const result = serializeFields('Just Title', []);
    expect(result).toBe('Just Title');
  });

  it('trims whitespace from title and field names', () => {
    const result = serializeFields('  Survey  ', [
      { name: '  Field1  ', type: 'text' },
      { name: '  Field2  ', type: 'text' },
    ]);
    expect(result).toBe('Survey\nField1\nField2');
  });

  it('handles legacy string fields for backward compat', () => {
    const result = serializeFields('Survey', ['Collector', 'Site']);
    expect(result).toBe('Survey\nCollector\nSite');
  });
});

// ---------------------------------------------------------------------------
// deserializeContent (pure function)
// ---------------------------------------------------------------------------

describe('deserializeContent', () => {
  it('extracts title and typed fields from content string', () => {
    const result = deserializeContent('River Survey\nCollector\nSite');
    expect(result.title).toBe('River Survey');
    expect(result.fields).toEqual([
      { name: 'Collector', type: 'text' },
      { name: 'Site', type: 'text' },
    ]);
  });

  it('parses checkbox fields', () => {
    const result = deserializeContent('Study\n[checkbox]Clean Waders');
    expect(result.fields).toEqual([{ name: 'Clean Waders', type: 'checkbox' }]);
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
  it('appends a new text field object to the array', () => {
    const result = addField([{ name: 'A', type: 'text' }, { name: 'B', type: 'text' }]);
    expect(result).toEqual([
      { name: 'A', type: 'text' },
      { name: 'B', type: 'text' },
      { name: '', type: 'text' },
    ]);
  });

  it('returns a new array (does not mutate input)', () => {
    const original = [{ name: 'A', type: 'text' }];
    const result = addField(original);
    expect(result).not.toBe(original);
    expect(original).toHaveLength(1);
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

  it('submitting with empty title shows error and does not call createProjectFromSchema', async () => {
    await renderProjectForm();
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(createProjectFromSchema).not.toHaveBeenCalled();
  });

  it('submitting a custom project saves its title and custom fields as a v2 schema', async () => {
    createProjectFromSchema.mockResolvedValue({ id: 'new-project-id' });
    await renderProjectForm();

    document.getElementById('project-title-input').value = 'River Survey';
    document.getElementById('add-field-btn').click();
    document.querySelector('.field-row input').value = 'Collector';

    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(createProjectFromSchema).toHaveBeenCalledTimes(1));
    const [schema] = createProjectFromSchema.mock.calls[0];
    expect(schema).toEqual({
      title: 'River Survey',
      templateId: 'custom',
      fields: [{ key: expect.stringMatching(/^custom_[0-9a-f]{8}$/), label: 'Collector', type: 'text', status: 'optional' }],
    });
  });

  it('navigates to project dashboard after successful create', async () => {
    createProjectFromSchema.mockResolvedValue({ id: 'new-project-id', content: '' });
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
  it('redirects to home with toast when project not found', async () => {
    getProject.mockResolvedValue(undefined);
    await renderProjectForm('nonexistent-id');
    expect(navigate).toHaveBeenCalledWith('#/');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('not found'), 'error');
  });

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

  it('submitting calls updateProjectSchema with the project id and new content', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Old Name\nField' });
    updateProjectSchema.mockResolvedValue({ id: 'existing-id', content: '' });
    await renderProjectForm('existing-id');

    document.getElementById('project-title-input').value = 'New Name';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(updateProjectSchema).toHaveBeenCalledTimes(1));
    const [id, schema] = updateProjectSchema.mock.calls[0];
    expect(id).toBe('existing-id');
    expect(schema.title).toBe('New Name');
  });

  it('navigates to project dashboard after successful update', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Survey\nField' });
    updateProjectSchema.mockResolvedValue({ id: 'existing-id', content: '' });
    await renderProjectForm('existing-id');
    document.getElementById('project-title-input').value = 'Updated';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('#/project/existing-id'));
  });
});

// ---------------------------------------------------------------------------
// Duplicate project name prevention
// ---------------------------------------------------------------------------

describe('renderProjectForm (field renames keep data)', () => {
  it('renaming a v1 field keeps its key, so stored sample values stay attached', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Survey\nSite\npH' });
    updateProjectSchema.mockResolvedValue({ id: 'existing-id' });
    await renderProjectForm('existing-id');

    const input = document.querySelectorAll('#field-list .field-row input')[0];
    input.value = 'Location';
    input.dispatchEvent(new Event('input'));
    document.getElementById('project-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(updateProjectSchema).toHaveBeenCalledTimes(1));
    const [, schema] = updateProjectSchema.mock.calls[0];
    expect(schema.fields.map((f) => [f.key, f.label])).toEqual([['Site', 'Location'], ['pH', 'pH']]);
  });

  it('keeps each key with its field after the field is moved', async () => {
    getProject.mockResolvedValue({ id: 'existing-id', content: 'Survey\nSite\npH' });
    updateProjectSchema.mockResolvedValue({ id: 'existing-id' });
    await renderProjectForm('existing-id');

    document.querySelectorAll('#field-list .field-row input')[0].value = 'Location';
    document.querySelectorAll('#field-list .btn-move-down')[0].click();
    document.getElementById('project-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(updateProjectSchema).toHaveBeenCalledTimes(1));
    expect(updateProjectSchema.mock.calls[0][1].fields.map((f) => [f.key, f.label]))
      .toEqual([['pH', 'pH'], ['Site', 'Location']]);
  });
});

describe('renderProjectForm (preset templates, #7)', () => {
  /**
   * Returns the keys of preset field toggles that are switched on.
   *
   * @returns {string[]} Keys from data-key of pressed toggles.
   */
  const pressedKeys = () => [...document.querySelectorAll('#preset-fields [aria-pressed="true"]')].map((b) => b.dataset.key);

  it('offers Aquatic eDNA, Organismal / Tissue, and Custom when creating a project', async () => {
    await renderProjectForm();
    const choices = [...document.querySelectorAll('#preset-picker button')].map((b) => b.textContent);
    expect(choices).toEqual([expect.stringContaining('Aquatic eDNA'), expect.stringContaining('Organismal / Tissue'), expect.stringContaining('Custom')]);
  });

  it('choosing Aquatic eDNA turns on every aquatic field and shows the locked fields', async () => {
    await renderProjectForm();
    document.querySelector('#preset-picker [data-preset="aquatic"]').click();
    expect(pressedKeys()).toEqual(PRESETS.aquatic.fields.map((f) => f.key));
    const locked = [...document.querySelectorAll('#builtin-fields button')];
    expect(locked.map((b) => b.textContent)).toContain('Sample ID');
    locked.forEach((b) => {
      expect(b.disabled).toBe(true);
      expect(b.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('tapping a field toggle turns it off and leaves it out of the saved project', async () => {
    createProjectFromSchema.mockResolvedValue({ id: 'new-id' });
    await renderProjectForm();
    document.getElementById('project-title-input').value = 'Lake 1';
    document.querySelector('#preset-picker [data-preset="aquatic"]').click();
    document.querySelector('#preset-fields [data-key="ph"]').click();
    document.getElementById('add-field-btn').click();
    document.querySelector('#field-list .field-row input').value = 'Weather';

    document.getElementById('project-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(createProjectFromSchema).toHaveBeenCalledTimes(1));

    const [schema] = createProjectFromSchema.mock.calls[0];
    expect(schema.templateId).toBe('aquatic');
    const keys = schema.fields.map((f) => f.key);
    expect(keys).not.toContain('ph');
    expect(keys.slice(0, 2)).toEqual(['samplers', 'site_name']);
    expect(schema.fields.at(-1)).toMatchObject({ label: 'Weather', status: 'optional' });
    expect(schema.fields.find((f) => f.key === 'sample_type').options).toEqual(PRESETS.aquatic.fields.find((f) => f.key === 'sample_type').options);
  });

  it('hides the picker when editing and restores the saved toggles and custom fields', async () => {
    getProject.mockResolvedValue({
      id: 'p1', title: 'Lake', templateId: 'aquatic',
      fields: [
        PRESETS.aquatic.fields[0],
        { key: 'custom_ab12cd34', label: 'Weather', type: 'text', status: 'optional' },
      ],
    });
    await renderProjectForm('p1');
    expect(document.getElementById('preset-picker').hidden).toBe(true);
    expect(pressedKeys()).toEqual(['samplers']);
    const row = document.querySelector('#field-list .field-row');
    expect(row.querySelector('input').value).toBe('Weather');
    expect(row.dataset.key).toBe('custom_ab12cd34');
  });

  it('switching back to Custom clears the preset fields', async () => {
    await renderProjectForm();
    document.querySelector('#preset-picker [data-preset="aquatic"]').click();
    document.querySelector('#preset-picker [data-preset="custom"]').click();
    expect(document.querySelectorAll('#preset-fields button')).toHaveLength(0);
  });
});

describe('duplicate project name prevention', () => {
  it('shows error and does not create when title matches existing project', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'existing-1', content: 'River Survey\nField1' },
    ]);
    createProjectFromSchema.mockResolvedValue({ id: 'new-id', content: '' });

    await renderProjectForm();
    document.getElementById('project-title-input').value = 'River Survey';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise(r => setTimeout(r, 0));
    expect(createProjectFromSchema).not.toHaveBeenCalled();
    expect(document.getElementById('title-error')).not.toBeNull();
    expect(document.getElementById('title-error').textContent).toMatch(/already exists/i);
  });

  it('allows saving when title matches the project being edited (same project)', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'existing-id', content: 'River Survey\nField1' },
    ]);
    getProject.mockResolvedValue({ id: 'existing-id', content: 'River Survey\nField1' });
    updateProjectSchema.mockResolvedValue({ id: 'existing-id', content: '' });

    await renderProjectForm('existing-id');
    document.getElementById('project-title-input').value = 'River Survey';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(updateProjectSchema).toHaveBeenCalledTimes(1));
  });

  it('blocks saving when edit title matches a different existing project', async () => {
    getAllProjects.mockResolvedValue([
      { id: 'other-id', content: 'Lake Study\nField1' },
    ]);
    getProject.mockResolvedValue({ id: 'existing-id', content: 'River Survey\nField1' });
    updateProjectSchema.mockResolvedValue({ id: 'existing-id', content: '' });

    await renderProjectForm('existing-id');
    document.getElementById('project-title-input').value = 'Lake Study';
    const form = document.getElementById('project-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise(r => setTimeout(r, 0));
    expect(updateProjectSchema).not.toHaveBeenCalled();
    expect(document.getElementById('title-error')).not.toBeNull();
  });
});
