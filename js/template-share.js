// js/template-share.js
// Template files (share a project's fields with other collectors) and the
// plain-text metadata summary for a methods section.
import { BUILTIN_FIELDS } from './field-model.js';

/** Format marker written into every template file. */
export const TEMPLATE_FORMAT = 'ednalite-template';

/** Template file version this app writes and reads. */
const TEMPLATE_VERSION = 1;

const FIELD_TYPES = ['text', 'number', 'choice', 'checkbox'];
const FIELD_STATUSES = ['required', 'qaqc', 'optional'];
const TEMPLATE_IDS = ['aquatic', 'organismal', 'custom'];
const OPTIONAL_STRING_PROPS = ['unit', 'dwc', 'mixs', 'description'];
const MAX_FIELDS = 500;
const MAX_TEXT_LENGTH = 1000;

/**
 * A template file that cannot be imported. The message tells the user what
 * is wrong and what to do.
 */
export class TemplateFileError extends Error {
  /**
   * Creates a template file error.
   *
   * @param {string} message - User-facing explanation and fix.
   */
  constructor(message) {
    super(message);
    this.name = 'TemplateFileError';
  }
}

/**
 * Serializes a project schema as a template file.
 *
 * @param {import('./field-model.js').ProjectSchema} schema - Project title, template id, and fields.
 * @returns {string} Pretty-printed JSON text for the template file.
 * @remarks Field keys are written as-is, so every project imported from the
 * same file stores values under the same keys and exports line up.
 * @example
 * const text = templateToJSON(projectSchema(project));
 */
export function templateToJSON(schema) {
  return JSON.stringify(
    {
      format: TEMPLATE_FORMAT,
      version: TEMPLATE_VERSION,
      title: schema.title,
      templateId: schema.templateId,
      fields: schema.fields,
    },
    null,
    2,
  );
}

/**
 * Tests whether a value is a non-blank string within the length limit.
 *
 * @param {unknown} value - Value to check.
 * @returns {value is string} True for a usable text value.
 */
function isText(value) {
  return typeof value === 'string' && value.trim() !== '' && value.length <= MAX_TEXT_LENGTH;
}

/**
 * Validates one field from a template file and copies only known properties.
 *
 * @param {unknown} raw - Field object from the parsed file.
 * @param {number} index - Zero-based field position (for the error message).
 * @param {Set<string>} seenKeys - Keys of the fields already accepted.
 * @returns {import('./field-model.js').FieldDef} A clean field definition.
 * @throws {TemplateFileError} If the field is malformed or its key repeats.
 */
function parseField(raw, index, seenKeys) {
  /**
   * Builds the error for this field.
   *
   * @param {string} problem - What is wrong with the field.
   * @returns {TemplateFileError} Error naming the field number.
   */
  const fail = (problem) =>
    new TemplateFileError(`Template field ${index + 1} ${problem}. Ask the sender for a new copy of the file.`);

  if (typeof raw !== 'object' || raw === null) throw fail('is not a field');
  const f = /** @type {Record<string, unknown>} */ (raw);
  if (!isText(f.key)) throw fail('has no key');
  if (seenKeys.has(f.key)) throw fail(`repeats the key "${f.key}"`);
  if (!isText(f.label)) throw fail('has no label');
  if (!FIELD_TYPES.includes(/** @type {string} */ (f.type))) throw fail('has an unknown type');
  if (!FIELD_STATUSES.includes(/** @type {string} */ (f.status))) throw fail('has an unknown status');

  /** @type {import('./field-model.js').FieldDef} */
  const field = {
    key: f.key,
    label: f.label,
    type: /** @type {import('./field-model.js').FieldType} */ (f.type),
    status: /** @type {import('./field-model.js').FieldStatus} */ (f.status),
  };

  if (field.type === 'choice') {
    const options = f.options;
    if (!Array.isArray(options) || options.length === 0 || !options.every(isText)) {
      throw fail('is a pick list with no choices');
    }
    field.options = /** @type {string[]} */ (options);
  }
  for (const prop of OPTIONAL_STRING_PROPS) {
    if (isText(f[prop])) field[prop] = f[prop];
  }

  seenKeys.add(field.key);
  return field;
}

/**
 * Parses and validates the text of a template file.
 *
 * @param {string} text - File contents.
 * @returns {import('./field-model.js').ProjectSchema} The project schema, with field keys kept.
 * @throws {TemplateFileError} If the text is not a valid eDNALite template file.
 * @remarks Unknown properties are dropped. An unknown templateId becomes null.
 * @example
 * const schema = parseTemplateFile(await file.text());
 * await createProjectFromSchema(schema);
 */
export function parseTemplateFile(text) {
  const notTemplate = new TemplateFileError(
    'This is not an eDNALite template file. Pick the .json file made with Share Template.',
  );
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw notTemplate;
  }
  if (typeof data !== 'object' || data === null) throw notTemplate;
  const d = /** @type {Record<string, unknown>} */ (data);
  if (d.format !== TEMPLATE_FORMAT) throw notTemplate;
  if (typeof d.version !== 'number' || d.version > TEMPLATE_VERSION) {
    throw new TemplateFileError(
      'This template file is from a newer version of eDNALite. Update the app (reload it), then try again.',
    );
  }
  if (!isText(d.title)) {
    throw new TemplateFileError('This template file has no project title. Ask the sender for a new copy of the file.');
  }
  if (!Array.isArray(d.fields) || d.fields.length > MAX_FIELDS) {
    throw new TemplateFileError('This template file has no valid field list. Ask the sender for a new copy of the file.');
  }

  const seenKeys = new Set();
  return {
    title: d.title.trim(),
    templateId: TEMPLATE_IDS.includes(/** @type {string} */ (d.templateId)) ? /** @type {string} */ (d.templateId) : null,
    fields: d.fields.map((raw, i) => parseField(raw, i, seenKeys)),
  };
}

/**
 * Describes one field for the summary: label plus unit, choices, and terms.
 *
 * @param {{ label: string, unit?: string, options?: string[], dwc?: string, mixs?: string }} field - Field to describe.
 * @returns {string} For example "Water Temperature (°C; DwC dynamicProperties)".
 */
function describeField(field) {
  const details = [
    field.unit,
    field.options?.length ? `one of: ${field.options.join(', ')}` : '',
    field.dwc ? `DwC ${field.dwc}` : '',
    field.mixs ? `MIxS ${field.mixs}` : '',
  ].filter(Boolean);
  return details.length ? `${field.label} (${details.join('; ')})` : field.label;
}

/**
 * Writes a plain-text paragraph that lists the metadata a project records,
 * for pasting into a methods section.
 *
 * @param {import('./field-model.js').ProjectSchema} schema - Project schema.
 * @returns {string} One paragraph, no line breaks.
 * @example
 * await navigator.clipboard.writeText(metadataSummary(projectSchema(project)));
 */
export function metadataSummary(schema) {
  const sentences = [
    'Sample metadata were recorded in the field with eDNALite.',
    `Recorded automatically for every sample: ${BUILTIN_FIELDS.map(describeField).join(', ')}.`,
    schema.fields.length
      ? `Additional fields recorded per sample: ${schema.fields.map(describeField).join(', ')}.`
      : 'No additional fields were recorded.',
  ];
  const required = schema.fields.filter((f) => f.status === 'required').map((f) => f.label);
  const qaqc = schema.fields.filter((f) => f.status === 'qaqc').map((f) => f.label);
  if (required.length) sentences.push(`Required before a sample could be saved: ${required.join(', ')}.`);
  if (qaqc.length) sentences.push(`QA/QC checks confirmed for every sample: ${qaqc.join(', ')}.`);
  return sentences.join(' ');
}
