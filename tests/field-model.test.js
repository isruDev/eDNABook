import { describe, it, expect } from 'vitest';
import {
  projectSchema, createCustomField, missingRequired, BUILTIN_FIELDS,
} from '../js/field-model.js';

describe('projectSchema', () => {
  it('converts a v1 content-only project, using each field name as its key', () => {
    const schema = projectSchema({ id: 'p', content: 'River\nSite\n[checkbox]Gloves Used?' });
    expect(schema).toEqual({
      title: 'River',
      templateId: null,
      fields: [
        { key: 'Site', label: 'Site', type: 'text', status: 'optional' },
        { key: 'Gloves Used?', label: 'Gloves Used?', type: 'checkbox', status: 'optional' },
      ],
    });
  });

  it('returns the stored title, template, and fields for a v2 project', () => {
    const fields = [{ key: 'ph', label: 'pH', type: 'number', status: 'optional' }];
    const schema = projectSchema({ id: 'p', title: 'Lake', templateId: 'aquatic', fields, content: 'stale' });
    expect(schema).toEqual({ title: 'Lake', templateId: 'aquatic', fields });
  });
});

describe('createCustomField', () => {
  it('creates an optional text field with a stable generated key', () => {
    const field = createCustomField('Water Colour');
    expect(field).toEqual({
      key: expect.stringMatching(/^custom_[0-9a-f]{8}$/),
      label: 'Water Colour',
      type: 'text',
      status: 'optional',
    });
  });

  it('creates a different key each time', () => {
    expect(createCustomField('A').key).not.toBe(createCustomField('A').key);
  });
});

describe('missingRequired', () => {
  const fields = [
    { key: 'samplers', label: 'Sampler(s)', type: 'text', status: 'required' },
    { key: 'ph', label: 'pH', type: 'number', status: 'optional' },
    { key: 'qaqc_gloves_used', label: 'QA/QC: Sterile Gloves Worn?', type: 'checkbox', status: 'qaqc' },
  ];

  it('lists required fields left blank and QA/QC boxes left unchecked', () => {
    expect(missingRequired(fields, { samplers: '  ', ph: '', qaqc_gloves_used: 'false' }))
      .toEqual(['Sampler(s)', 'QA/QC: Sterile Gloves Worn?']);
  });

  it('returns an empty list when every required value is present', () => {
    expect(missingRequired(fields, { samplers: 'LS', qaqc_gloves_used: 'true' })).toEqual([]);
  });
});

describe('BUILTIN_FIELDS', () => {
  it('lists the locked fields every sample records automatically', () => {
    expect(BUILTIN_FIELDS.map((f) => f.label)).toEqual([
      'Sample ID', 'Collection Date & Time', 'Latitude', 'Longitude',
      'GPS Accuracy (m)', 'Geodetic Datum', 'Site Photo',
    ]);
  });
});
