// tests/examples.test.js
// The files in examples/ must match what the current export code produces.
// After any export change, run `npm run examples` and commit the result.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import initSqlJs from '../lib/sql-wasm.js';
import { EXAMPLES } from '../scripts/examples/example-data.js';
import { generateCSV, generateSQLite } from '../js/export.js';
import { templateToJSON } from '../js/template-share.js';
import { projectSchema, missingRequired } from '../js/field-model.js';

const EXAMPLES_DIR = join(__dirname, '..', 'examples');
const WASM_PATH = resolve('./node_modules/sql.js/dist/sql-wasm.wasm');

/**
 * Reads a file from examples/ as UTF-8 text.
 *
 * @param {string} name - File name inside examples/.
 * @returns {string} File contents.
 */
function readExample(name) {
  return readFileSync(join(EXAMPLES_DIR, name), 'utf8');
}

/**
 * Returns every row of the samples table in a SQLite file.
 *
 * @param {Uint8Array} bytes - SQLite database file contents.
 * @returns {Promise<{ columns: string[], values: unknown[][] }>} Column names and rows.
 */
async function dumpSamples(bytes) {
  const SQL = await initSqlJs({ locateFile: () => WASM_PATH });
  const db = new SQL.Database(bytes);
  const [result] = db.exec('SELECT * FROM samples');
  db.close();
  return result;
}

describe('example data', () => {
  it('has one example per preset template', () => {
    expect(EXAMPLES.map((e) => e.slug).sort()).toEqual(['aquatic', 'organismal']);
  });

  it('fills every required field and QA/QC check', () => {
    for (const { project, samples } of EXAMPLES) {
      const { fields } = projectSchema(project);
      for (const sample of samples) {
        expect(missingRequired(fields, sample.metadata), sample.sampleId).toEqual([]);
      }
    }
  });

  it('uses only listed choices for pick-list fields', () => {
    for (const { project, samples } of EXAMPLES) {
      const choiceFields = projectSchema(project).fields.filter((f) => f.type === 'choice');
      for (const sample of samples) {
        for (const f of choiceFields) {
          const value = sample.metadata[f.key];
          if (value) expect(f.options, `${sample.sampleId} ${f.key}`).toContain(value);
        }
      }
    }
  });

  it('includes a sample with an edit history', () => {
    for (const { samples } of EXAMPLES) {
      expect(samples.some((s) => s.editLog.length > 0)).toBe(true);
    }
  });
});

describe.each(EXAMPLES)('examples/$slug files match the current export code', ({ slug, project, samples }) => {
  it('CSV', () => {
    expect(readExample(`${slug}.csv`)).toBe(generateCSV(project, samples));
  });

  it('SQLite', async () => {
    const committed = await dumpSamples(readFileSync(join(EXAMPLES_DIR, `${slug}.db`)));
    const fresh = await dumpSamples(await generateSQLite(project, samples, () => WASM_PATH));
    expect(committed).toEqual(fresh);
  });

  it('template file', () => {
    expect(readExample(`${slug}_template.json`)).toBe(templateToJSON(projectSchema(project)));
  });
});
