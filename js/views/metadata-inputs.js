// js/views/metadata-inputs.js
// Shared metadata form controls for the sample entry and sample edit views.

/**
 * Builds the label for a field, with a required marker for required and QA/QC fields.
 *
 * @param {import('../field-model.js').FieldDef} field - Field definition.
 * @param {string} id - id of the control the label points at.
 * @param {string} [className] - Optional class for the label.
 * @returns {HTMLLabelElement} The label element.
 */
function buildLabel(field, id, className) {
  const label = document.createElement('label');
  label.setAttribute('for', id);
  if (className) label.className = className;
  label.textContent = field.label;
  if (field.status === 'required' || field.status === 'qaqc') {
    const mark = document.createElement('span');
    mark.className = 'required-mark';
    mark.setAttribute('aria-label', 'required');
    mark.textContent = ' *';
    label.appendChild(mark);
  }
  return label;
}

/**
 * Builds the input control for one field.
 *
 * @param {import('../field-model.js').FieldDef} field - Field definition.
 * @param {string} id - Element id.
 * @param {string} value - Stored value ('' when none).
 * @returns {HTMLInputElement|HTMLSelectElement} The control, tagged with data-field = field.key.
 */
function buildControl(field, id, value) {
  let control;
  if (field.type === 'checkbox') {
    control = document.createElement('input');
    control.type = 'checkbox';
    control.checked = value === 'true';
  } else if (field.type === 'choice') {
    control = document.createElement('select');
    const choices = ['', ...(field.options ?? [])];
    if (value && !choices.includes(value)) choices.push(value);
    choices.forEach((choice) => {
      const opt = document.createElement('option');
      opt.value = choice;
      opt.textContent = choice === '' ? 'Select...' : choice;
      control.appendChild(opt);
    });
    control.value = value;
  } else {
    control = document.createElement('input');
    control.type = 'text';
    if (field.type === 'number') control.setAttribute('inputmode', 'decimal');
    control.value = value;
  }
  control.id = id;
  control.dataset.field = field.key;
  return control;
}

/**
 * Renders one labeled control per field into a container, replacing its contents.
 *
 * @param {HTMLElement} container - Element to fill (e.g. #metadata-fields).
 * @param {import('../field-model.js').FieldDef[]} fields - Fields in display order.
 * @param {Record<string, string>} [values={}] - Stored values keyed by field key.
 * @param {string} [idPrefix='field'] - Prefix for element ids (`${idPrefix}-${key}`).
 * @returns {void}
 * @remarks Choice fields keep a stored value that is no longer one of the
 * options, so editing an old sample never silently changes its data.
 * @example
 * renderMetadataInputs(document.getElementById('metadata-fields'), schema.fields, sample.metadata);
 */
export function renderMetadataInputs(container, fields, values = {}, idPrefix = 'field') {
  container.innerHTML = '';
  fields.forEach((field) => {
    const id = `${idPrefix}-${field.key}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    const control = buildControl(field, id, values[field.key] ?? '');
    if (field.type === 'checkbox') {
      const row = document.createElement('div');
      row.className = 'checkbox-field';
      row.appendChild(control);
      row.appendChild(buildLabel(field, id, 'checkbox-label'));
      wrapper.appendChild(row);
    } else {
      wrapper.appendChild(buildLabel(field, id));
      wrapper.appendChild(control);
    }
    container.appendChild(wrapper);
  });
}

/**
 * Reads every metadata control in a container.
 *
 * @param {HTMLElement} container - Element previously filled by renderMetadataInputs.
 * @returns {Record<string, string>} Values keyed by field key; checkboxes as 'true'/'false'.
 * @example
 * const metadata = readMetadataInputs(document.getElementById('metadata-fields'));
 */
export function readMetadataInputs(container) {
  /** @type {Record<string, string>} */
  const values = {};
  container.querySelectorAll('[data-field]').forEach((el) => {
    values[el.dataset.field] = el.type === 'checkbox' ? String(el.checked) : el.value;
  });
  return values;
}

/**
 * Highlights the fields that block saving and clears earlier highlights.
 *
 * @param {HTMLElement} container - Element previously filled by renderMetadataInputs.
 * @param {import('../field-model.js').FieldDef[]} fields - Fields in the container.
 * @param {string[]} missingLabels - Labels returned by missingRequired().
 * @returns {void}
 * @example
 * flagMissing(container, fields, missingRequired(fields, readMetadataInputs(container)));
 */
export function flagMissing(container, fields, missingLabels) {
  const missingKeys = new Set(fields.filter((f) => missingLabels.includes(f.label)).map((f) => f.key));
  let first = null;
  container.querySelectorAll('[data-field]').forEach((el) => {
    const wrapper = el.closest('.form-field');
    const missing = missingKeys.has(el.dataset.field);
    wrapper.classList.toggle('field-missing', missing);
    if (missing && !first) first = wrapper;
  });
  if (first && typeof first.scrollIntoView === 'function') {
    first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

/**
 * Builds the toast text shown when a save is blocked by missing fields.
 *
 * @param {string[]} missingLabels - Labels returned by missingRequired().
 * @returns {string} Names up to two fields; for three or more, gives a count
 *   so the message fits on a phone screen.
 * @example
 * missingMessage(['Sampler(s)']); // 'Fill in before saving: Sampler(s)'
 */
export function missingMessage(missingLabels) {
  if (missingLabels.length <= 2) return `Fill in before saving: ${missingLabels.join(', ')}`;
  return `Fill in ${missingLabels.length} required fields (marked in red)`;
}
