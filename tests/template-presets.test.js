// Keeps js/templates.js in sync with docs/eDNALite_Templates.md (the source of truth).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PRESETS } from '../js/templates.js';
import { BUILTIN_FIELDS } from '../js/field-model.js';

const DOC = readFileSync(resolve(__dirname, '../docs/eDNALite_Templates.md'), 'utf8');

/**
 * Parses one markdown table (the section starting at `heading`) into rows.
 *
 * @param {string} heading - Text that starts the table's "### " heading.
 * @returns {{ label: string, dataType: string, status: string, vocab: string[] }[]} One entry per field row.
 */
function docRows(heading) {
  const section = DOC.split('### ').find((s) => s.startsWith(heading));
  return section.split('\n')
    .filter((line) => line.startsWith('| **'))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      return {
        label: cells[0].replace(/\*\*/g, ''),
        dataType: cells[1],
        status: cells[2],
        vocab: [...cells[5].matchAll(/`([^`]+)`/g)].map((m) => m[1]),
      };
    });
}

/**
 * Maps a doc Status cell to the field status used in code.
 *
 * @param {string} status - e.g. "Required", "Required (QA/QC)", "Optional".
 * @returns {'required'|'qaqc'|'optional'} The code status.
 */
function codeStatus(status) {
  if (status.includes('QA/QC')) return 'qaqc';
  return status.startsWith('Required') ? 'required' : 'optional';
}

const builtinLabels = new Set([...BUILTIN_FIELDS.map((f) => f.label), 'Specimen / Site Photo']);

for (const [id, heading] of [['aquatic', 'Table A'], ['organismal', 'Table B']]) {
  describe(`PRESETS.${id} matches ${heading} in docs/eDNALite_Templates.md`, () => {
    const preset = PRESETS[id];
    const rows = docRows(heading).filter((r) => !builtinLabels.has(r.label));

    it('has one field per non-locked row, in document order', () => {
      expect(preset.fields.map((f) => f.label)).toEqual(rows.map((r) => r.label));
    });

    it('matches each row status', () => {
      for (const row of rows) {
        const field = preset.fields.find((f) => f.label === row.label);
        expect([row.label, field.status]).toEqual([row.label, codeStatus(row.status)]);
      }
    });

    it('offers the documented choices for controlled vocabulary rows', () => {
      for (const row of rows.filter((r) => r.dataType === 'Controlled Vocabulary')) {
        const field = preset.fields.find((f) => f.label === row.label);
        expect([row.label, field.type, field.options]).toEqual([row.label, 'choice', row.vocab]);
      }
    });

    it('uses checkboxes for boolean rows and number inputs for numeric rows', () => {
      for (const row of rows) {
        const field = preset.fields.find((f) => f.label === row.label);
        if (row.dataType.startsWith('Boolean')) expect([row.label, field.type]).toEqual([row.label, 'checkbox']);
        if (row.dataType === 'Numeric') expect([row.label, field.type]).toEqual([row.label, 'number']);
      }
    });

    it('gives every field a unique, stable snake_case key', () => {
      const keys = preset.fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      keys.forEach((k) => expect(k).toMatch(/^[a-z][a-z0-9_]*$/));
    });

    it('records the DwC and MIxS terms from the document', () => {
      preset.fields.forEach((f) => {
        expect(typeof f.dwc).toBe('string');
        expect(typeof f.mixs).toBe('string');
      });
    });
  });
}
