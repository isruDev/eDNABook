// tests/template-share.test.js
import { describe, it, expect } from 'vitest';
import {
  templateToJSON,
  parseTemplateFile,
  metadataSummary,
  TemplateFileError,
  TEMPLATE_FORMAT,
} from '../js/template-share.js';
import { PRESETS } from '../js/templates.js';

const SCHEMA = {
  title: 'River Survey',
  templateId: 'aquatic',
  fields: [
    { key: 'ph', label: 'pH', type: 'number', status: 'required', dwc: 'dynamicProperties', mixs: 'ph' },
    { key: 'water_temp', label: 'Water Temperature', type: 'number', status: 'optional', unit: '°C' },
    { key: 'samp_type', label: 'Sample Type', type: 'choice', status: 'optional', options: ['water', 'sediment'] },
    { key: 'gloves', label: 'Sterile Gloves Worn?', type: 'checkbox', status: 'qaqc' },
    { key: 'custom_1a2b3c4d', label: 'Notes', type: 'text', status: 'optional' },
  ],
};

describe('templateToJSON', () => {
  it('writes the format marker, version, title, template id, and fields', () => {
    const data = JSON.parse(templateToJSON(SCHEMA));
    expect(data.format).toBe(TEMPLATE_FORMAT);
    expect(data.version).toBe(1);
    expect(data.title).toBe('River Survey');
    expect(data.templateId).toBe('aquatic');
    expect(data.fields).toEqual(SCHEMA.fields);
  });
});

describe('parseTemplateFile', () => {
  it('round-trips a schema written by templateToJSON, keeping field keys', () => {
    expect(parseTemplateFile(templateToJSON(SCHEMA))).toEqual(SCHEMA);
  });

  it('round-trips both built-in presets', () => {
    for (const preset of Object.values(PRESETS)) {
      const schema = { title: preset.name, templateId: preset.id, fields: preset.fields };
      expect(parseTemplateFile(templateToJSON(schema))).toEqual(schema);
    }
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseTemplateFile('Site\nCollector')).toThrow(TemplateFileError);
  });

  it('rejects JSON without the eDNALite format marker', () => {
    expect(() => parseTemplateFile('{"title":"x","fields":[]}')).toThrow(/not an eDNALite template/i);
  });

  it('rejects a newer file version with an update hint', () => {
    const text = JSON.stringify({ format: TEMPLATE_FORMAT, version: 2, title: 'x', fields: [] });
    expect(() => parseTemplateFile(text)).toThrow(/newer version.*update/i);
  });

  it('rejects a field with an unknown type and names the field number', () => {
    const text = JSON.stringify({
      format: TEMPLATE_FORMAT, version: 1, title: 'x',
      fields: [{ key: 'a', label: 'A', type: 'date', status: 'optional' }],
    });
    expect(() => parseTemplateFile(text)).toThrow(/field 1/i);
  });

  it('rejects a field with a blank label', () => {
    const text = JSON.stringify({
      format: TEMPLATE_FORMAT, version: 1, title: 'x',
      fields: [{ key: 'a', label: '  ', type: 'text', status: 'optional' }],
    });
    expect(() => parseTemplateFile(text)).toThrow(TemplateFileError);
  });

  it('rejects duplicate field keys', () => {
    const field = { key: 'a', label: 'A', type: 'text', status: 'optional' };
    const text = JSON.stringify({ format: TEMPLATE_FORMAT, version: 1, title: 'x', fields: [field, field] });
    expect(() => parseTemplateFile(text)).toThrow(/field 2/i);
  });

  it('rejects a choice field without options', () => {
    const text = JSON.stringify({
      format: TEMPLATE_FORMAT, version: 1, title: 'x',
      fields: [{ key: 'a', label: 'A', type: 'choice', status: 'optional' }],
    });
    expect(() => parseTemplateFile(text)).toThrow(/field 1/i);
  });

  it('rejects a blank project title', () => {
    const text = JSON.stringify({ format: TEMPLATE_FORMAT, version: 1, title: '', fields: [] });
    expect(() => parseTemplateFile(text)).toThrow(TemplateFileError);
  });

  it('drops properties the app does not use', () => {
    const text = JSON.stringify({
      format: TEMPLATE_FORMAT, version: 1, title: 'x', templateId: 'custom', extra: 1,
      fields: [{ key: 'a', label: 'A', type: 'text', status: 'optional', onclick: 'alert(1)' }],
    });
    expect(parseTemplateFile(text)).toEqual({
      title: 'x', templateId: 'custom',
      fields: [{ key: 'a', label: 'A', type: 'text', status: 'optional' }],
    });
  });

  it('treats a missing or unknown template id as null', () => {
    const text = JSON.stringify({ format: TEMPLATE_FORMAT, version: 1, title: 'x', templateId: 'zzz', fields: [] });
    expect(parseTemplateFile(text).templateId).toBeNull();
  });
});

describe('metadataSummary', () => {
  it('lists the automatically recorded fields with their standard terms', () => {
    const text = metadataSummary(SCHEMA);
    expect(text).toMatch(/Sample ID \(DwC materialSampleID; MIxS samp_name\)/);
    expect(text).toMatch(/Collection Date & Time/);
    expect(text).toMatch(/Site Photo/);
  });

  it('lists project fields with unit, options, and standard terms', () => {
    const text = metadataSummary(SCHEMA);
    expect(text).toMatch(/pH \(DwC dynamicProperties; MIxS ph\)/);
    expect(text).toMatch(/Water Temperature \(°C\)/);
    expect(text).toMatch(/Sample Type \(one of: water, sediment\)/);
    expect(text).toMatch(/Notes[,.]/);
  });

  it('names required fields and QA/QC checks in separate sentences', () => {
    const text = metadataSummary(SCHEMA);
    expect(text).toMatch(/Required before a sample could be saved: pH\./);
    expect(text).toMatch(/QA\/QC checks confirmed for every sample: Sterile Gloves Worn\?\./);
  });

  it('omits the required and QA/QC sentences when there are none', () => {
    const text = metadataSummary({ title: 'x', templateId: 'custom', fields: [] });
    expect(text).not.toMatch(/Required before/);
    expect(text).not.toMatch(/QA\/QC/);
    expect(text).toMatch(/No additional fields were recorded\./);
  });

  it('is a single plain-text paragraph', () => {
    expect(metadataSummary(SCHEMA)).not.toMatch(/\n/);
  });
});
