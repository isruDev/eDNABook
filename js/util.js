/**
 * Sanitizes a string for use as a filename by replacing non-alphanumeric
 * characters with underscores and collapsing consecutive underscores.
 *
 * @param {string} name - Raw string to sanitize.
 * @returns {string} Filename-safe version of the input.
 * @example
 * sanitizeFilename('River Study #1 (2026)'); // "River_Study_1_2026"
 */
export function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
