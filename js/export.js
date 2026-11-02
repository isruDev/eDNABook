// js/export.js
// UMD libs: loaded via <script> in browser (sets globals), via vitest alias in tests
import { projectSchema } from './field-model.js';
import { formatEditLog } from './edit-log.js';

// Resolve Papa: window global (browser) or dynamic import (test/Node)
let Papa;
if (typeof window !== 'undefined' && window.Papa) {
  Papa = window.Papa;
} else {
  Papa = (await import('../lib/papaparse.min.js')).default;
}

/**
 * Converts a user-defined metadata field name into a snake_case SQL column name.
 *
 * Replaces all non-alphanumeric characters (spaces, parentheses, slashes, etc.)
 * with underscores and collapses consecutive underscores into one. Only applied
 * to user-defined metadata fields — fixed columns use explicit names from
 * FIXED_COLUMNS to preserve Darwin Core camelCase.
 *
 * @param {string} name - Human-readable field name (e.g. "GPS Accuracy").
 * @returns {string} Snake-case column name (e.g. "gps_accuracy").
 * @example
 * toSnakeCase('Field Name (Units)'); // "field_name_units"
 */
function toSnakeCase(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Fixed column definitions shared by CSV and SQLite exports. The four Darwin Core
 * auto-generated fields (eventID, eventDate, decimalLatitude, decimalLongitude)
 * preserve camelCase in both the CSV header row and the SQLite column name so
 * exported data is drop-in compatible with GBIF, NCBI, and other DwC-aware
 * bioinformatics pipelines per Allen's FAIR tutorial.
 *
 * @type {ReadonlyArray<{header: string, column: string, type: 'TEXT'|'REAL'}>}
 */
const FIXED_COLUMNS = Object.freeze([
  { header: 'Project Name',     column: 'project_name',     type: 'TEXT' },
  { header: 'eventID',          column: 'eventID',          type: 'TEXT' },
  { header: 'eventDate',        column: 'eventDate',        type: 'TEXT' },
  { header: 'decimalLatitude',  column: 'decimalLatitude',  type: 'REAL' },
  { header: 'decimalLongitude', column: 'decimalLongitude', type: 'REAL' },
  { header: 'GPS Accuracy',     column: 'gps_accuracy',     type: 'REAL' },
  { header: 'Photo',            column: 'photo',            type: 'TEXT' },
]);

/**
 * Columns emitted after the project-specific metadata columns.
 *
 * @type {ReadonlyArray<{header: string, column: string, type: 'TEXT'}>}
 */
const TRAILING_COLUMNS = Object.freeze([
  { header: 'edit_log', column: 'edit_log', type: 'TEXT' },
]);

/**
 * Returns the metadata columns to export: the project's fields, then any other
 * metadata keys found on samples (values left under removed or renamed fields),
 * so no stored value is ever missing from an export.
 *
 * @param {import('./field-model.js').FieldDef[]} fields - Project fields from projectSchema().
 * @param {import('./db.js').Sample[]} samples - Samples being exported.
 * @returns {import('./field-model.js').FieldDef[]} Project fields followed by extra
 *   keys in first-seen order (typed as text).
 */
function exportFields(fields, samples) {
  const known = new Set(fields.map((f) => f.key));
  const extra = [];
  for (const sample of samples) {
    for (const key of Object.keys(sample.metadata ?? {})) {
      if (!known.has(key)) {
        known.add(key);
        extra.push({ key, label: key, type: 'text', status: 'optional' });
      }
    }
  }
  return [...fields, ...extra];
}

/**
 * Makes column names unique by appending _2, _3, ... to repeats.
 *
 * @param {string[]} names - Candidate column names, possibly with duplicates.
 * @param {Set<string>} [taken] - Names already used by other columns.
 * @returns {string[]} Names in the same order with duplicates suffixed.
 */
function uniqueColumnNames(names, taken = new Set()) {
  return names.map((name) => {
    let candidate = name;
    let n = 2;
    while (taken.has(candidate)) candidate = `${name}_${n++}`;
    taken.add(candidate);
    return candidate;
  });
}

/**
 * Builds the ordered list of fixed column headers used in both CSV and SQLite exports.
 *
 * @returns {string[]} Fixed column headers in declaration order.
 */
function fixedHeaders() {
  return FIXED_COLUMNS.map((c) => c.header);
}

/**
 * Extracts a row of values from a sample in fixed-column order plus project-specific fields.
 *
 * @param {import('./db.js').Sample} sample - The sample record to serialize.
 * @param {import('./field-model.js').FieldDef[]} fields - Fields to export (from exportFields()).
 * @param {string} projectTitle - Project title to emit in the Project Name column.
 * @returns {Array<string|number|null>} Ordered array of values matching the column layout.
 */
function sampleToRow(sample, fields, projectTitle) {
  const fixed = [
    projectTitle,
    sample.sampleId,
    sample.scannedAt,
    sample.latitude ?? null,
    sample.longitude ?? null,
    sample.gpsAccuracy ?? null,
    sample.photoFilename ?? '',
  ];
  const meta = fields.map((f) => (sample.metadata ?? {})[f.key] ?? '');
  const labels = Object.fromEntries(fields.map((f) => [f.key, f.label]));
  return [...fixed, ...meta, formatEditLog(sample.editLog, labels)];
}

/**
 * Generates a CSV string from a project and its samples.
 *
 * Column order: Project Name, eventID, eventDate, decimalLatitude, decimalLongitude,
 * GPS Accuracy, Photo, then each project-specific field in the order defined in
 * projectSchema(project).fields (labels as headers), then any other metadata keys stored on
 * samples (values under removed or renamed fields), then edit_log. The four
 * Darwin Core fields are emitted
 * with exact DwC camelCase so exported CSVs are drop-in ready for GBIF/NCBI
 * pipelines per Allen's FAIR tutorial. decimalLatitude, decimalLongitude, and
 * GPS Accuracy are raw numbers (or null); all other values are strings.
 * Uses Papa.unparse() to handle quoting and escaping.
 *
 * @param {import('./db.js').Project} project - The project record.
 * @param {import('./db.js').Sample[]} samples - Array of samples belonging to the project.
 * @returns {string} The complete CSV string including a header row.
 * @example
 * const csv = generateCSV(project, samples);
 * shareOrDownload(csv, 'export.csv', 'text/csv');
 */
export function generateCSV(project, samples) {
  const { title, fields: projectFields } = projectSchema(project);
  const fields = exportFields(projectFields, samples);
  const headers = [...fixedHeaders(), ...fields.map((f) => f.label), ...TRAILING_COLUMNS.map((c) => c.header)];
  const dataRows = samples.map((s) => sampleToRow(s, fields, title));

  return Papa.unparse([headers, ...dataRows]);
}

/**
 * Generates an in-memory SQLite database file from a project and its samples.
 *
 * Creates a `samples` table whose columns mirror the CSV layout. The four
 * Darwin Core fixed columns (eventID, eventDate, decimalLatitude, decimalLongitude)
 * preserve exact camelCase as SQLite column names. Non-DwC fixed columns use
 * snake_case (project_name, gps_accuracy, photo). User-defined metadata fields
 * are converted to snake_case via toSnakeCase(); names that collide get _2, _3
 * suffixes. Extra metadata keys and edit_log follow, as in the CSV. decimalLatitude, decimalLongitude,
 * and GPS Accuracy are REAL; all other columns are TEXT. Column names from
 * FIXED_COLUMNS are hardcoded (no injection risk); user-defined metadata column
 * names pass through toSnakeCase() before being embedded in the CREATE TABLE
 * statement. Row values are always inserted via parameterised statements.
 *
 * @param {import('./db.js').Project} project - The project record.
 * @param {import('./db.js').Sample[]} samples - Array of samples belonging to the project.
 * @param {((file: string) => string)} [locateFile] - Optional override for sql.js WASM
 *   resolution. Defaults to a relative browser path (`../lib/sql-wasm.wasm`).
 *   Pass an absolute path function in test environments where the browser-relative
 *   path is not resolvable.
 * @returns {Promise<Uint8Array>} The SQLite database file as a byte array.
 * @example
 * const bytes = await generateSQLite(project, samples);
 * shareOrDownload(bytes, 'export.db', 'application/x-sqlite3');
 */
export async function generateSQLite(project, samples, locateFile = () => './lib/sql-wasm.wasm') {
  const { title, fields: projectFields } = projectSchema(project);
  const fields = exportFields(projectFields, samples);

  // initSqlJs loaded via <script> tag (UMD, sets window.initSqlJs)
  // In test env, vitest alias provides it as an ESM import
  const loader = typeof window !== 'undefined' && window.initSqlJs ? window.initSqlJs : (await import('../lib/sql-wasm.js')).default;
  const SQL = await loader({ locateFile });
  const db = new SQL.Database();

  const fixedColDefs = FIXED_COLUMNS.map((c) => `"${c.column}" ${c.type}`);
  const reserved = new Set([...FIXED_COLUMNS, ...TRAILING_COLUMNS].map((c) => c.column));
  const metaColDefs = uniqueColumnNames(fields.map((f) => toSnakeCase(f.label)), reserved)
    .map((name) => `"${name}" TEXT`);
  const trailingColDefs = TRAILING_COLUMNS.map((c) => `"${c.column}" ${c.type}`);
  const colDefs = [...fixedColDefs, ...metaColDefs, ...trailingColDefs].join(', ');

  db.run(`CREATE TABLE samples (${colDefs})`);

  if (samples.length > 0) {
    const totalCols = FIXED_COLUMNS.length + fields.length + TRAILING_COLUMNS.length;
    const placeholders = new Array(totalCols).fill('?').join(', ');
    const stmt = db.prepare(`INSERT INTO samples VALUES (${placeholders})`);

    for (const sample of samples) {
      stmt.run(sampleToRow(sample, fields, title));
    }
    stmt.free();
  }

  const bytes = db.export();
  db.close();

  return bytes;
}

/**
 * Shares or downloads a file using the Web Share API with a fallback to a
 * programmatic anchor-click download.
 *
 * If `navigator.canShare({ files: [file] })` returns true the file is offered
 * to the OS share sheet via `navigator.share()`. An AbortError (user dismissed
 * the share sheet) is swallowed silently. All other errors are re-thrown.
 *
 * When the Web Share API is unavailable or cannot handle files, an in-memory
 * object URL is created and an `<a download>` click is triggered, then the URL
 * is immediately revoked.
 *
 * @param {string|Uint8Array} data - File content: a string for text formats or
 *   a Uint8Array for binary formats.
 * @param {string} filename - The suggested filename including extension.
 * @param {string} mimeType - MIME type string (e.g. 'text/csv').
 * @returns {Promise<void>}
 * @throws {Error} Re-throws any non-AbortError from navigator.share.
 * @example
 * await shareOrDownload(csvString, 'samples_2026-03-17.csv', 'text/csv');
 * await shareOrDownload(sqliteBytes, 'samples_2026-03-17.db', 'application/x-sqlite3');
 */
export async function shareOrDownload(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      throw err;
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
