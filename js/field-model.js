// js/field-model.js
// Metadata field definitions: the v2 project schema and v1 compatibility.
import { parseProject } from './db.js';

/**
 * @typedef {'text'|'number'|'choice'|'checkbox'} FieldType
 * @typedef {'required'|'qaqc'|'optional'} FieldStatus
 */

/**
 * A project metadata field. `key` is the stable storage key used in
 * sample.metadata; `label` is what the user sees and may be renamed freely.
 *
 * @typedef {Object} FieldDef
 * @property {string} key - Stable key into sample.metadata. Never changes after creation.
 * @property {string} label - Display label (UI text).
 * @property {FieldType} type - Input type.
 * @property {FieldStatus} status - 'required' must be non-blank, 'qaqc' must be checked.
 * @property {string[]} [options] - Allowed values for 'choice' fields.
 * @property {string} [unit] - Unit shown next to the input (e.g. 'mL').
 * @property {string} [dwc] - Darwin Core term this field maps to.
 * @property {string} [mixs] - MIxS v6.0 / FAIReDNA term this field maps to.
 * @property {string} [description] - Help text from the template document.
 */

/**
 * @typedef {Object} ProjectSchema
 * @property {string} title - Project title.
 * @property {string|null} templateId - Preset the project started from ('aquatic',
 *   'organismal', 'custom'), or null for v1 projects.
 * @property {FieldDef[]} fields - Metadata fields in display order.
 */

/**
 * Fields every sample records automatically. They live on the sample record
 * itself (not in sample.metadata) and cannot be removed from a project.
 *
 * @type {ReadonlyArray<{ label: string, sampleProp: string, dwc: string, mixs: string }>}
 */
export const BUILTIN_FIELDS = Object.freeze([
  { label: 'Sample ID', sampleProp: 'sampleId', dwc: 'materialSampleID', mixs: 'samp_name' },
  { label: 'Collection Date & Time', sampleProp: 'scannedAt', dwc: 'eventDate', mixs: 'collection_date' },
  { label: 'Latitude', sampleProp: 'latitude', dwc: 'decimalLatitude', mixs: 'lat_lon' },
  { label: 'Longitude', sampleProp: 'longitude', dwc: 'decimalLongitude', mixs: 'lat_lon' },
  { label: 'GPS Accuracy (m)', sampleProp: 'gpsAccuracy', dwc: 'coordinateUncertaintyInMeters', mixs: 'coord_uncert' },
  { label: 'Geodetic Datum', sampleProp: 'geodeticDatum', dwc: 'geodeticDatum', mixs: 'geodeticDatum' },
  { label: 'Site Photo', sampleProp: 'photoFilename', dwc: 'associatedMedia', mixs: 'associated_media' },
]);

/**
 * Returns a project's schema, converting v1 (content-string) projects on read.
 *
 * @param {{ content?: string, title?: string, templateId?: string|null, fields?: FieldDef[] }} project - A stored project record.
 * @returns {ProjectSchema} Title, template id, and field definitions.
 * @remarks v1 fields use their name as both key and label, so existing
 * sample.metadata (keyed by name) matches with no data migration. The project
 * is written in v2 form the next time it is saved.
 * @example
 * projectSchema({ content: 'River\nSite' }).fields[0]; // { key: 'Site', label: 'Site', type: 'text', status: 'optional' }
 */
export function projectSchema(project) {
  if (Array.isArray(project.fields)) {
    return { title: project.title ?? '', templateId: project.templateId ?? null, fields: project.fields };
  }
  const { title, fields } = parseProject(project.content ?? '');
  return {
    title,
    templateId: null,
    fields: fields.map((f) => ({ key: f.name, label: f.name, type: f.type, status: 'optional' })),
  };
}

/**
 * Creates a user-defined optional field with a fresh stable key.
 *
 * @param {string} label - Display label typed by the user.
 * @param {FieldType} [type='text'] - Input type.
 * @returns {FieldDef} The new field definition.
 * @example
 * createCustomField('Water Colour'); // { key: 'custom_1a2b3c4d', label: 'Water Colour', type: 'text', status: 'optional' }
 */
export function createCustomField(label, type = 'text') {
  return {
    key: `custom_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
    label,
    type,
    status: 'optional',
  };
}

/**
 * Lists the labels of required fields that are blank and QA/QC boxes that are unchecked.
 *
 * @param {FieldDef[]} fields - Project fields.
 * @param {Record<string, string>} metadata - Values keyed by field key.
 * @returns {string[]} Labels of fields that block saving, in field order. Empty when complete.
 * @example
 * missingRequired([{ key: 'a', label: 'A', type: 'text', status: 'required' }], { a: '' }); // ['A']
 */
export function missingRequired(fields, metadata) {
  return fields
    .filter((f) => {
      const value = (metadata[f.key] ?? '').trim();
      if (f.status === 'qaqc') return value !== 'true';
      if (f.status === 'required') return f.type === 'checkbox' ? value !== 'true' : value === '';
      return false;
    })
    .map((f) => f.label);
}
