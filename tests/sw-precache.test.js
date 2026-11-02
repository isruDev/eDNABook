// tests/sw-precache.test.js
// Every app module must be precached, or a screen opened for the first time
// while offline fails to load.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

/**
 * Lists the .js files in a repo folder as precache paths ('./js/x.js').
 *
 * @param {string} dir - Folder relative to the repo root, e.g. 'js/views'.
 * @returns {string[]} Precache-style paths.
 */
function jsFiles(dir) {
  return readdirSync(join(ROOT, dir))
    .filter((name) => name.endsWith('.js'))
    .map((name) => `./${dir}/${name}`);
}

describe('service worker precache list', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');

  it('includes every module in js/ and js/views/', () => {
    const missing = [...jsFiles('js'), ...jsFiles('js/views')].filter((p) => !sw.includes(`'${p}'`));
    expect(missing).toEqual([]);
  });
});
