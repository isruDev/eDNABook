// scripts/examples/build-examples.mjs
// Writes examples/<slug>.csv, .db, and _template.json for each example project
// using the app's own export code. Run with `npm run examples`.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'examples');
const WASM_PATH = join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

// export.js reads PapaParse and sql.js from window globals, as in the browser.
globalThis.window = { Papa: require('papaparse'), initSqlJs: require('sql.js') };

const { EXAMPLES } = await import('./example-data.js');
const { generateCSV, generateSQLite } = await import('../../js/export.js');
const { templateToJSON } = await import('../../js/template-share.js');
const { projectSchema } = await import('../../js/field-model.js');

mkdirSync(OUT_DIR, { recursive: true });

for (const { slug, project, samples } of EXAMPLES) {
  writeFileSync(join(OUT_DIR, `${slug}.csv`), generateCSV(project, samples));
  writeFileSync(join(OUT_DIR, `${slug}.db`), await generateSQLite(project, samples, () => WASM_PATH));
  writeFileSync(join(OUT_DIR, `${slug}_template.json`), templateToJSON(projectSchema(project)));
  console.log(`examples/${slug}: csv, db, template written`);
}
