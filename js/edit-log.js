// js/edit-log.js
// Non-destructive audit trail for sample edits: diffing and formatting.

/**
 * @typedef {Object} EditLogEntry
 * @property {string} at - ISO 8601 UTC timestamp of the edit.
 * @property {string} field - Storage key for top-level fields (e.g. 'scannedAt')
 *   or the metadata field name for project-defined fields.
 * @property {string} from - Previous value as a string ('' when empty).
 * @property {string} to - New value as a string ('' when empty).
 */

/**
 * Top-level sample keys tracked by the edit log, with their display labels.
 *
 * @type {ReadonlyArray<[string, string]>}
 */
const TRACKED_FIELDS = Object.freeze([
  ['sampleId', 'Sample ID'],
  ['scannedAt', 'Date/Time'],
  ['latitude', 'Latitude'],
  ['longitude', 'Longitude'],
  ['gpsAccuracy', 'GPS Accuracy'],
  ['photoFilename', 'Photo'],
]);

/** @type {Readonly<Record<string, string>>} */
const LABELS = Object.freeze(Object.fromEntries(TRACKED_FIELDS));

/**
 * Normalizes a stored value to a string so null, undefined, and '' compare equal
 * and numbers compare by value.
 *
 * @param {unknown} value - Raw stored value.
 * @returns {string} '' for null/undefined, otherwise String(value).
 */
function normalize(value) {
  return value == null ? '' : String(value);
}

/**
 * Lists the changes an update would make to a sample.
 *
 * @param {Partial<import('./db.js').Sample>} existing - The stored sample before the update.
 * @param {Partial<import('./db.js').Sample>} updates - The fields being written.
 * @param {string} at - ISO 8601 timestamp to stamp on each entry.
 * @returns {EditLogEntry[]} One entry per changed value, top-level fields first,
 *   then metadata fields in update order. Empty when nothing changed.
 * @remarks Only keys present in `updates` are compared. Metadata keys missing
 * from `updates.metadata` are not treated as cleared, because updateSample
 * merges metadata instead of replacing it.
 * @example
 * diffSample({ metadata: { pH: '7.1' } }, { metadata: { pH: '7.4' } }, new Date().toISOString());
 * // [{ at: '...', field: 'pH', from: '7.1', to: '7.4' }]
 */
export function diffSample(existing, updates, at) {
  /** @type {EditLogEntry[]} */
  const entries = [];
  for (const [key] of TRACKED_FIELDS) {
    if (!(key in updates)) continue;
    const from = normalize(existing[key]);
    const to = normalize(updates[key]);
    if (from !== to) entries.push({ at, field: key, from, to });
  }
  const oldMeta = existing.metadata ?? {};
  for (const [name, value] of Object.entries(updates.metadata ?? {})) {
    const from = normalize(oldMeta[name]);
    const to = normalize(value);
    if (from !== to) entries.push({ at, field: name, from, to });
  }
  return entries;
}

/**
 * Formats one edit log entry as "time Label: old -> new".
 *
 * @param {EditLogEntry} entry - A single edit log entry.
 * @returns {string} The formatted line; empty values are shown as "(empty)".
 * @example
 * formatEditLogEntry({ at: '2026-05-01T14:02:00.000Z', field: 'gpsAccuracy', from: '30', to: '6' });
 * // '2026-05-01T14:02:00.000Z GPS Accuracy: 30 -> 6'
 */
export function formatEditLogEntry(entry) {
  const show = (v) => (v === '' ? '(empty)' : v);
  return `${entry.at} ${LABELS[entry.field] ?? entry.field}: ${show(entry.from)} -> ${show(entry.to)}`;
}

/**
 * Formats an edit log as one human-readable line for CSV/SQLite export.
 *
 * @param {EditLogEntry[]|undefined} log - The sample's edit log.
 * @returns {string} Entries formatted by formatEditLogEntry, joined by "; ".
 *   '' when there are no entries.
 * @example
 * formatEditLog([{ at: '2026-05-01T14:02:00.000Z', field: 'pH', from: '7.1', to: '7.4' }]);
 * // '2026-05-01T14:02:00.000Z pH: 7.1 -> 7.4'
 */
export function formatEditLog(log) {
  if (!log || log.length === 0) return '';
  return log.map(formatEditLogEntry).join('; ');
}
