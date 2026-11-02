import { createProjectFromSchema, getProject, updateProjectSchema, parseProject, getAllProjects } from '../db.js';
import { projectSchema, createCustomField, BUILTIN_FIELDS } from '../field-model.js';
import { PRESETS } from '../templates.js';
import { showView, showToast, clearElement, createElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Module-level mutable state: the custom (non-preset) field rows being edited.
 * `key` is set for fields loaded from a saved project; renaming changes only
 * the name, so stored sample values stay attached to the key.
 *
 * @type {Array<{ name: string, type: 'text' | 'checkbox', key?: string }>}
 */
let _fields = [];

/**
 * Preset the project uses: 'aquatic', 'organismal', or 'custom'.
 *
 * @type {string}
 */
let _templateId = 'custom';

/**
 * Keys of the preset fields currently switched on.
 *
 * @type {Set<string>}
 */
let _presetKeys = new Set();

/**
 * Saved field definitions by key (edit mode), so attributes not shown in the
 * form survive a save.
 *
 * @type {Map<string, import('../field-model.js').FieldDef>}
 */
let _existingFields = new Map();

/** @type {ReadonlyArray<{ id: string, name: string, description: string }>} */
const PICKER_CHOICES = Object.freeze([
  ...Object.values(PRESETS).map((p) => ({ id: p.id, name: p.name, description: p.description })),
  { id: 'custom', name: 'Custom', description: 'Start empty and add your own fields' },
]);

/**
 * Builds a toggle-style button (aria-pressed) used for presets and field chips.
 *
 * @param {string} text - Visible label.
 * @param {boolean} pressed - Whether the toggle is on.
 * @param {string} className - CSS class.
 * @returns {HTMLButtonElement} The button.
 */
function toggleButton(text, pressed, className) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-pressed', String(pressed));
  btn.textContent = text;
  return btn;
}

/**
 * Renders the Aquatic / Organismal / Custom picker into #preset-picker.
 *
 * @returns {void}
 */
function renderPresetPicker() {
  const container = document.getElementById('preset-picker');
  if (!container) return;
  container.innerHTML = '';
  PICKER_CHOICES.forEach((choice) => {
    const btn = toggleButton('', _templateId === choice.id, 'preset-choice');
    btn.dataset.preset = choice.id;
    const name = document.createElement('strong');
    name.textContent = choice.name;
    const desc = document.createElement('span');
    desc.textContent = choice.description;
    btn.append(name, desc);
    btn.addEventListener('click', () => selectPreset(choice.id));
    container.appendChild(btn);
  });
}

/**
 * Switches the form to a preset and turns all of its fields on.
 *
 * @param {string} id - 'aquatic', 'organismal', or 'custom'.
 * @returns {void}
 */
function selectPreset(id) {
  _templateId = id;
  _presetKeys = new Set((PRESETS[id]?.fields ?? []).map((f) => f.key));
  renderPresetPicker();
  renderPresetFields();
}

/**
 * Renders the always-recorded fields as locked (on, disabled) chips.
 *
 * @returns {void}
 */
function renderBuiltinFields() {
  const container = document.getElementById('builtin-fields');
  if (!container) return;
  container.innerHTML = '';
  BUILTIN_FIELDS.forEach((f) => {
    const chip = toggleButton(f.label, true, 'field-chip field-chip-locked');
    chip.disabled = true;
    chip.title = 'Always recorded';
    container.appendChild(chip);
  });
}

/**
 * Renders one tap-to-toggle chip per field of the current preset.
 *
 * @returns {void}
 */
function renderPresetFields() {
  const container = document.getElementById('preset-fields');
  if (!container) return;
  container.innerHTML = '';
  const presetFields = PRESETS[_templateId]?.fields ?? [];
  const section = document.getElementById('preset-section');
  if (section) section.hidden = presetFields.length === 0;
  presetFields.forEach((f) => {
    const chip = toggleButton(f.label, _presetKeys.has(f.key), 'field-chip');
    chip.dataset.key = f.key;
    chip.addEventListener('click', () => {
      if (_presetKeys.has(f.key)) _presetKeys.delete(f.key);
      else _presetKeys.add(f.key);
      chip.setAttribute('aria-pressed', String(_presetKeys.has(f.key)));
    });
    container.appendChild(chip);
  });
}

/**
 * Builds the project's field definitions from the form state: switched-on
 * preset fields in preset order, then custom fields in list order.
 *
 * @returns {import('../field-model.js').FieldDef[]} Fields to save.
 * @remarks Custom rows keep their saved key (so stored values stay attached
 * through renames); new rows get a fresh key from createCustomField.
 */
function buildSchemaFields() {
  const preset = (PRESETS[_templateId]?.fields ?? []).filter((f) => _presetKeys.has(f.key));
  const custom = _fields
    .map((row) => ({ ...row, name: row.name.trim() }))
    .filter((row) => row.name)
    .map((row) => {
      const base = (row.key && _existingFields.get(row.key)) || createCustomField(row.name, row.type);
      return { ...base, key: row.key ?? base.key, label: row.name, type: row.type };
    });
  return [...preset.map((f) => ({ ...f })), ...custom];
}

/**
 * The project ID being edited, or null when creating a new project.
 *
 * @type {string|null}
 */
let _editingId = null;

/**
 * Serializes a title and fields array into a newline-delimited content string.
 *
 * @param {string} title - Project title. Whitespace is trimmed.
 * @param {string[]} fields - Array of metadata field names. Each is trimmed; empty strings are excluded.
 * @returns {string} Content string suitable for storage in the projects record.
 *
 * @example
 * serializeFields('River Survey', ['Collector', 'Site']) // 'River Survey\nCollector\nSite'
 */
export function serializeFields(title, fields) {
  const trimmedTitle = title.trim();
  const serialized = fields
    .map(f => {
      const name = (typeof f === 'string' ? f : f.name).trim();
      if (!name) return '';
      const type = typeof f === 'string' ? 'text' : (f.type || 'text');
      return type === 'checkbox' ? `[checkbox]${name}` : name;
    })
    .filter(line => line.length > 0);
  return [trimmedTitle, ...serialized].join('\n');
}

/**
 * Deserializes a content string into a title and fields array.
 *
 * Delegates to parseProject for consistency with the db layer.
 *
 * @param {string} content - Newline-delimited content string.
 * @returns {{ title: string, fields: string[] }} Parsed title and fields.
 */
export function deserializeContent(content) {
  return parseProject(content);
}

/**
 * Returns a new array with an empty string appended (represents a blank new field).
 *
 * @param {string[]} fields - Current fields array.
 * @returns {string[]} New array with empty string appended.
 */
export function addField(fields) {
  return [...fields, { name: '', type: 'text' }];
}

/**
 * Returns a new array with the element at the given index removed.
 *
 * @param {string[]} fields - Current fields array.
 * @param {number} index - Zero-based index of the field to remove.
 * @returns {string[]} New array without the removed field.
 */
export function removeField(fields, index) {
  return fields.filter((_, i) => i !== index);
}

/**
 * Returns a new array with the element at index swapped with the element above it.
 * If index is 0, returns a copy of the array unchanged.
 *
 * @param {string[]} fields - Current fields array.
 * @param {number} index - Zero-based index of the field to move up.
 * @returns {string[]} New array with the swap applied.
 */
export function moveFieldUp(fields, index) {
  if (index === 0) return [...fields];
  const result = [...fields];
  [result[index - 1], result[index]] = [result[index], result[index - 1]];
  return result;
}

/**
 * Returns a new array with the element at index swapped with the element below it.
 * If index is the last position, returns a copy of the array unchanged.
 *
 * @param {string[]} fields - Current fields array.
 * @param {number} index - Zero-based index of the field to move down.
 * @returns {string[]} New array with the swap applied.
 */
export function moveFieldDown(fields, index) {
  if (index >= fields.length - 1) return [...fields];
  const result = [...fields];
  [result[index], result[index + 1]] = [result[index + 1], result[index]];
  return result;
}

/**
 * Syncs current input values from the DOM back into the _fields array.
 * Must be called before any reorder/remove operation to preserve typed-but-not-blurred values.
 *
 * @returns {void}
 */
function syncFieldsFromDOM() {
  const rows = document.querySelectorAll('#field-list .field-row');
  _fields = Array.from(rows).map(row => {
    const input = row.querySelector('input');
    const typeBtn = row.querySelector('.btn-field-type');
    const field = {
      name: input.value,
      type: typeBtn && typeBtn.dataset.fieldType === 'checkbox' ? 'checkbox' : 'text',
    };
    if (row.dataset.key) field.key = row.dataset.key;
    return field;
  });
}

/**
 * Renders the field list into #field-list based on the current _fields state.
 * Attaches up/down/remove handlers to each row.
 *
 * @returns {void}
 */
function renderFieldList() {
  const container = document.getElementById('field-list');
  if (!container) return;
  clearElement(container);

  _fields.forEach((field, index) => {
    const fieldObj = typeof field === 'string' ? { name: field, type: 'text' } : field;

    const typeBtn = createElement('button', {
      type: 'button',
      className: `btn-icon btn-field-type ${fieldObj.type === 'checkbox' ? 'field-type-checkbox' : 'field-type-text'}`,
      'aria-label': 'Toggle field type',
    }, fieldObj.type === 'checkbox' ? '\u2611' : 'Aa');
    typeBtn.dataset.fieldType = fieldObj.type;
    typeBtn.addEventListener('click', () => {
      syncFieldsFromDOM();
      _fields[index] = {
        ..._fields[index],
        type: _fields[index].type === 'checkbox' ? 'text' : 'checkbox',
      };
      renderFieldList();
    });

    const input = createElement('input', {
      type: 'text',
      placeholder: 'Field name (e.g., Collector)',
      value: fieldObj.name,
    }, '');
    input.value = fieldObj.name;
    input.addEventListener('input', e => {
      _fields[index] = { ..._fields[index], name: e.target.value };
    });

    const upBtn = createElement('button', {
      type: 'button',
      className: 'btn-icon btn-move-up',
      'aria-label': 'Move field up',
    }, 'up');
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => {
      syncFieldsFromDOM();
      _fields = moveFieldUp(_fields, index);
      renderFieldList();
    });

    const downBtn = createElement('button', {
      type: 'button',
      className: 'btn-icon btn-move-down',
      'aria-label': 'Move field down',
    }, 'down');
    downBtn.disabled = index === _fields.length - 1;
    downBtn.addEventListener('click', () => {
      syncFieldsFromDOM();
      _fields = moveFieldDown(_fields, index);
      renderFieldList();
    });

    const removeBtn = createElement('button', {
      type: 'button',
      className: 'btn-icon btn-remove-field',
      'aria-label': 'Remove field',
    }, 'X');
    removeBtn.addEventListener('click', () => {
      syncFieldsFromDOM();
      _fields = removeField(_fields, index);
      renderFieldList();
    });

    const row = createElement('div', { className: 'field-row' }, [
      typeBtn, input, upBtn, downBtn, removeBtn,
    ]);
    if (fieldObj.key) row.dataset.key = fieldObj.key;
    container.appendChild(row);
  });
}

/**
 * Handles form submission for both create and edit modes.
 *
 * Validates that the title is non-empty and unique. Builds the v2 schema from the form.
 * Calls createProjectFromSchema or updateProjectSchema depending on _editingId.
 * Navigates to the project dashboard on success.
 *
 * @param {Event} event - The form submit event.
 * @returns {Promise<void>}
 */
async function handleSubmit(event) {
  event.preventDefault();
  syncFieldsFromDOM();

  const titleInput = document.getElementById('project-title-input');
  const title = titleInput ? titleInput.value.trim() : '';

  if (!title) {
    const existing = document.getElementById('title-error');
    if (!existing) {
      const errorEl = createElement('p', { className: 'error-message', id: 'title-error' }, 'Project title is required.');
      titleInput.insertAdjacentElement('afterend', errorEl);
    }
    return;
  }

  const existingError = document.getElementById('title-error');
  if (existingError) existingError.remove();

  const allProjects = await getAllProjects();
  const duplicate = allProjects.find(p => {
    if (_editingId && p.id === _editingId) return false;
    return projectSchema(p).title.toLowerCase() === title.toLowerCase();
  });
  if (duplicate) {
    const errorEl = createElement('p', { className: 'error-message', id: 'title-error' }, 'A project with this name already exists.');
    titleInput.insertAdjacentElement('afterend', errorEl);
    return;
  }

  const schema = { title, templateId: _templateId, fields: buildSchemaFields() };

  try {
    if (_editingId) {
      await updateProjectSchema(_editingId, schema);
      showToast('Project updated.', 'success');
      navigate(`#/project/${_editingId}`);
    } else {
      const project = await createProjectFromSchema(schema);
      showToast('Project created.', 'success');
      navigate(`#/project/${project.id}`);
    }
  } catch (err) {
    showToast('Failed to save project. Please try again.', 'error');
    console.error('Project save error:', err);
  }
}

/**
 * Renders the project create/edit form view.
 *
 * When projectId is provided, loads the existing project and populates the form
 * for editing. When omitted, renders a blank form for creation.
 *
 * @param {string} [projectId] - UUID of the project to edit. Omit for create mode.
 * @returns {Promise<void>}
 */
export async function renderProjectForm(projectId) {
  showView('project-form');

  _fields = [];
  _editingId = projectId ?? null;
  _templateId = 'custom';
  _presetKeys = new Set();
  _existingFields = new Map();

  const heading = document.getElementById('form-title');
  const backBtn = document.getElementById('form-back-btn');

  if (heading) heading.textContent = projectId ? 'Edit Project' : 'New Project';

  let loadedTitle = '';
  if (projectId) {
    const project = await getProject(projectId);
    if (!project) {
      showToast('Project not found', 'error');
      navigate('#/');
      return;
    }
    const schema = projectSchema(project);
    loadedTitle = schema.title;
    _templateId = schema.templateId ?? 'custom';
    const presetKeys = new Set((PRESETS[_templateId]?.fields ?? []).map((f) => f.key));
    schema.fields.forEach((f) => _existingFields.set(f.key, f));
    _presetKeys = new Set(schema.fields.filter((f) => presetKeys.has(f.key)).map((f) => f.key));
    _fields = schema.fields
      .filter((f) => !presetKeys.has(f.key))
      .map((f) => ({ name: f.label, type: f.type === 'checkbox' ? 'checkbox' : 'text', key: f.key }));
  }

  if (backBtn) {
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    newBackBtn.addEventListener('click', () => {
      if (projectId) {
        navigate(`#/project/${projectId}`);
      } else {
        navigate('#/');
      }
    });
  }

  // Clone the form to drop listeners from a previous render. A clone also
  // drops listeners on everything inside it, so all interactive children are
  // rendered after this point.
  const form = document.getElementById('project-form');
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    const freshAddBtn = newForm.querySelector('#add-field-btn');
    if (freshAddBtn) {
      freshAddBtn.addEventListener('click', () => {
        syncFieldsFromDOM();
        _fields = addField(_fields);
        renderFieldList();
      });
    }
    newForm.addEventListener('submit', handleSubmit);
  }

  const titleInput = document.getElementById('project-title-input');
  if (titleInput) titleInput.value = loadedTitle;
  const picker = document.getElementById('preset-picker');
  if (picker) picker.hidden = Boolean(projectId);
  renderPresetPicker();
  renderBuiltinFields();
  renderPresetFields();
  renderFieldList();
}
