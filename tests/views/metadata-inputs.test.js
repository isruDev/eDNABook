import { describe, it, expect, beforeEach } from 'vitest';
import { renderMetadataInputs, readMetadataInputs, flagMissing, missingMessage } from '../../js/views/metadata-inputs.js';

const FIELDS = [
  { key: 'samplers', label: 'Sampler(s)', type: 'text', status: 'required' },
  { key: 'volume_filtered_ml', label: 'Volume Filtered (mL)', type: 'number', status: 'required', unit: 'mL' },
  { key: 'sample_type', label: 'Sample Type', type: 'choice', status: 'required', options: ['Field Sample', 'Equipment Blank'] },
  { key: 'notes', label: 'Notes', type: 'text', status: 'optional' },
  { key: 'qaqc_gloves_used', label: 'QA/QC: Sterile Gloves Worn?', type: 'checkbox', status: 'qaqc' },
];

let container;
beforeEach(() => {
  document.body.innerHTML = '<div id="c"></div>';
  container = document.getElementById('c');
});

describe('renderMetadataInputs', () => {
  it('renders one control per field, keyed by field key', () => {
    renderMetadataInputs(container, FIELDS);
    const keys = [...container.querySelectorAll('[data-field]')].map((el) => el.dataset.field);
    expect(keys).toEqual(['samplers', 'volume_filtered_ml', 'sample_type', 'notes', 'qaqc_gloves_used']);
  });

  it('uses a select with a blank first option for choice fields', () => {
    renderMetadataInputs(container, FIELDS);
    const select = container.querySelector('select[data-field="sample_type"]');
    expect([...select.options].map((o) => o.value)).toEqual(['', 'Field Sample', 'Equipment Blank']);
  });

  it('opens the decimal keypad for number fields', () => {
    renderMetadataInputs(container, FIELDS);
    const input = container.querySelector('[data-field="volume_filtered_ml"]');
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('marks required and QA/QC fields in their labels, not optional ones', () => {
    renderMetadataInputs(container, FIELDS);
    const marked = [...container.querySelectorAll('.required-mark')].map((m) => m.closest('.form-field').querySelector('[data-field]').dataset.field);
    expect(marked).toEqual(['samplers', 'volume_filtered_ml', 'sample_type', 'qaqc_gloves_used']);
  });

  it('pre-fills stored values, including checkboxes and selects', () => {
    renderMetadataInputs(container, FIELDS, { samplers: 'LS', sample_type: 'Equipment Blank', qaqc_gloves_used: 'true' });
    expect(container.querySelector('[data-field="samplers"]').value).toBe('LS');
    expect(container.querySelector('[data-field="sample_type"]').value).toBe('Equipment Blank');
    expect(container.querySelector('[data-field="qaqc_gloves_used"]').checked).toBe(true);
  });

  it('keeps a stored value that is no longer in the choice list', () => {
    renderMetadataInputs(container, FIELDS, { sample_type: 'Legacy Value' });
    expect(container.querySelector('[data-field="sample_type"]').value).toBe('Legacy Value');
  });

  it('labels each control so tapping the label focuses it', () => {
    renderMetadataInputs(container, FIELDS, {}, 'edit-field');
    const input = container.querySelector('[data-field="samplers"]');
    expect(input.id).toBe('edit-field-samplers');
    expect(container.querySelector('label[for="edit-field-samplers"]')).not.toBeNull();
  });
});

describe('readMetadataInputs', () => {
  it('reads every control into a key -> string map', () => {
    renderMetadataInputs(container, FIELDS);
    container.querySelector('[data-field="samplers"]').value = 'LS';
    container.querySelector('[data-field="sample_type"]').value = 'Field Sample';
    container.querySelector('[data-field="qaqc_gloves_used"]').checked = true;
    expect(readMetadataInputs(container)).toEqual({
      samplers: 'LS', volume_filtered_ml: '', sample_type: 'Field Sample', notes: '', qaqc_gloves_used: 'true',
    });
  });
});

describe('missingMessage', () => {
  it('names up to two missing fields', () => {
    expect(missingMessage(['Sampler(s)', 'Sample Type'])).toBe('Fill in before saving: Sampler(s), Sample Type');
  });

  it('gives a count instead of a long list for three or more', () => {
    expect(missingMessage(['A', 'B', 'C'])).toBe('Fill in 3 required fields (marked in red)');
  });
});

describe('flagMissing', () => {
  it('scrolls the first missing field into view', () => {
    renderMetadataInputs(container, FIELDS);
    const scrolled = [];
    container.querySelectorAll('.form-field').forEach((el) => {
      el.scrollIntoView = () => scrolled.push(el.querySelector('[data-field]').dataset.field);
    });
    flagMissing(container, FIELDS, ['Sample Type', 'Sampler(s)']);
    expect(scrolled).toEqual(['samplers']);
  });

  it('marks the fields with the given labels as invalid and clears the rest', () => {
    renderMetadataInputs(container, FIELDS);
    flagMissing(container, FIELDS, ['Sampler(s)']);
    flagMissing(container, FIELDS, ['Sample Type']);
    const invalid = [...container.querySelectorAll('.form-field.field-missing [data-field]')].map((el) => el.dataset.field);
    expect(invalid).toEqual(['sample_type']);
  });
});
