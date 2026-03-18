// js/export.js
// UMD libs: loaded via <script> in browser (sets globals), via vitest alias in tests
import { parseProject } from './db.js';

// Resolve Papa: window global (browser) or dynamic import (test/Node)
let Papa;
if (typeof window !== 'undefined' && window.Papa) {
  Papa = window.Papa;
} else {
  Papa = (await import('../lib/papaparse.min.js')).default;
}

/**
 * Converts a field name string into a snake_case SQL column name.
 *
 * Replaces all non-alphanumeric characters (spaces, parentheses, slashes, etc.)
 * with underscores and collapses consecutive underscores into one.
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
 * Builds the ordered list of fixed column headers used in both CSV and SQLite exports.
 *
 * @returns {string[]} Fixed column headers: Sample ID, Date/Time, Latitude, Longitude, GPS Accuracy.
 */
function fixedHeaders() {
  return ['Sample ID', 'Date/Time', 'Latitude', 'Longitude', 'GPS Accuracy'];
}

/**
 * Extracts a row of values from a sample in fixed-column order plus project-specific fields.
 *
 * @param {import('./db.js').Sample} sample - The sample record to serialize.
 * @param {string[]} fields - Project-specific field names from parseProject().
 * @returns {Array<string|number|null>} Ordered array of values matching the column layout.
 */
function sampleToRow(sample, fields) {
  const fixed = [
    sample.sampleId,
    sample.scannedAt,
    sample.latitude ?? null,
    sample.longitude ?? null,
    sample.gpsAccuracy ?? null,
  ];
  const meta = fields.map((f) => (sample.metadata ?? {})[f] ?? '');
  return [...fixed, ...meta];
}

/**
 * Generates a CSV string from a project and its samples.
 *
 * Column order: Sample ID, Date/Time, Latitude, Longitude, GPS Accuracy, then each
 * project-specific field in the order defined in parseProject(project.content).fields.
 * Latitude, Longitude, and GPS Accuracy are raw numbers (or null); all other values
 * are strings. Uses Papa.unparse() to handle quoting and escaping.
 *
 * @param {import('./db.js').Project} project - The project record.
 * @param {import('./db.js').Sample[]} samples - Array of samples belonging to the project.
 * @returns {string} The complete CSV string including a header row.
 * @example
 * const csv = generateCSV(project, samples);
 * shareOrDownload(csv, 'export.csv', 'text/csv');
 */
export function generateCSV(project, samples) {
  const { fields } = parseProject(project.content);
  const headers = [...fixedHeaders(), ...fields];
  const dataRows = samples.map((s) => sampleToRow(s, fields));

  return Papa.unparse([headers, ...dataRows]);
}

/**
 * Generates an in-memory SQLite database file from a project and its samples.
 *
 * Creates a `samples` table whose columns mirror the CSV layout. Latitude,
 * Longitude, and GPS Accuracy columns are REAL; all other columns are TEXT.
 * Column names are the snake_case versions of the CSV headers. All rows are
 * inserted via parameterised statements to avoid SQL injection from field names
 * containing special characters.
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
export async function generateSQLite(project, samples, locateFile = () => '../lib/sql-wasm.wasm') {
  const { fields } = parseProject(project.content);
  const allHeaders = [...fixedHeaders(), ...fields];

  /** @type {Record<string, 'TEXT'|'REAL'>} */
  const colTypes = {
    'Sample ID': 'TEXT',
    'Date/Time': 'TEXT',
    'Latitude': 'REAL',
    'Longitude': 'REAL',
    'GPS Accuracy': 'REAL',
  };
  fields.forEach((f) => { colTypes[f] = 'TEXT'; });

  // initSqlJs loaded via <script> tag (UMD, sets window.initSqlJs)
  // In test env, vitest alias provides it as an ESM import
  const loader = typeof window !== 'undefined' && window.initSqlJs ? window.initSqlJs : (await import('../lib/sql-wasm.js')).default;
  const SQL = await loader({ locateFile });
  const db = new SQL.Database();

  const colDefs = allHeaders
    .map((h) => `${toSnakeCase(h)} ${colTypes[h]}`)
    .join(', ');

  db.run(`CREATE TABLE samples (${colDefs})`);

  if (samples.length > 0) {
    const placeholders = allHeaders.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO samples VALUES (${placeholders})`);

    for (const sample of samples) {
      stmt.run(sampleToRow(sample, fields));
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
