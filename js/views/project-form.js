import { createProject, getProject, updateProject, parseProject } from '../db.js';
import { showView, showToast, clearElement, createElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * Module-level mutable state: the in-progress field array during editing.
 * Scoped to this module -- not exported.
 *
 * @type {string[]}
 */
let _fields = [];

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
  const trimmedFields = fields.map(f => f.trim()).filter(f => f.length > 0);
  return [trimmedTitle, ...trimmedFields].join('\n');
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
  return [...fields, ''];
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
  const inputs = document.querySelectorAll('#field-list .field-row input');
  _fields = Array.from(inputs).map(input => input.value);
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
    const input = createElement('input', {
      type: 'text',
      placeholder: 'Field name (e.g., Collector)',
      value: field,
    }, '');
    input.value = field;
    input.addEventListener('input', e => {
      _fields[index] = e.target.value;
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
      input, upBtn, downBtn, removeBtn,
    ]);
    container.appendChild(row);
  });
}

/**
 * Handles form submission for both create and edit modes.
 *
 * Validates that the title is non-empty. Serializes title + fields into content.
 * Calls createProject or updateProject depending on _editingId.
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

  const content = serializeFields(title, _fields);

  try {
    if (_editingId) {
      await updateProject(_editingId, content);
      showToast('Project updated.', 'success');
      navigate(`#/project/${_editingId}`);
    } else {
      const project = await createProject(content);
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

  const heading = document.getElementById('form-title');
  const titleInput = document.getElementById('project-title-input');
  const form = document.getElementById('project-form');
  const addFieldBtn = document.getElementById('add-field-btn');
  const backBtn = document.getElementById('form-back-btn');

  if (heading) heading.textContent = projectId ? 'Edit Project' : 'New Project';

  if (projectId) {
    const project = await getProject(projectId);
    if (project) {
      const parsed = deserializeContent(project.content);
      if (titleInput) titleInput.value = parsed.title;
      _fields = parsed.fields;
    }
  } else {
    if (titleInput) titleInput.value = '';
  }

  renderFieldList();

  if (addFieldBtn) {
    const newAddBtn = addFieldBtn.cloneNode(true);
    addFieldBtn.parentNode.replaceChild(newAddBtn, addFieldBtn);
    newAddBtn.addEventListener('click', () => {
      syncFieldsFromDOM();
      _fields = addField(_fields);
      renderFieldList();
    });
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

  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    // Re-attach add field button reference after clone
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
}
