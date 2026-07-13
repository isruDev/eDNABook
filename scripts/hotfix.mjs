// Hotfix release gate for eDNALite.
//
// The service worker (sw.js) caches every asset by a versioned CACHE_NAME.
// Because the fetch handler is cache-first, a changed file is NEVER re-served
// to an installed client unless CACHE_NAME changes. So the two mandatory steps
// before every push are: (1) tests are green, (2) CACHE_NAME is bumped.
//
// This script enforces both in one command:
//   npm run hotfix
// It runs the full test suite; only if it passes does it bump the cache
// version in sw.js, then prints the commit/push steps.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SW_PATH = join(ROOT, 'sw.js');
const CACHE_NAME_RE = /const CACHE_NAME = '(ednalite-v)(\d+)';/;

/**
 * Runs the full vitest suite, inheriting stdio so results stream to the console.
 *
 * @returns {void}
 * @throws {Error} If the test process exits non-zero (execSync throws).
 * @remarks Uses `npm test` (vitest run) so this stays in sync with the canonical
 * test command; the thrown error is caught by the caller to abort the release.
 */
function runTests() {
  execSync('npm test', { cwd: ROOT, stdio: 'inherit' });
}

/**
 * Bumps the numeric suffix of CACHE_NAME in sw.js by one and writes the file.
 *
 * @returns {{ from: string, to: string }} The previous and new cache names.
 * @throws {Error} If sw.js does not contain a CACHE_NAME matching the expected
 *   `ednalite-vN` pattern (guards against a silent no-op after a format change).
 * @remarks Only the version integer changes; the rest of sw.js is untouched.
 */
function bumpCacheName() {
  const source = readFileSync(SW_PATH, 'utf8');
  const match = source.match(CACHE_NAME_RE);
  if (!match) {
    throw new Error(
      `Could not find CACHE_NAME (expected "ednalite-vN") in ${SW_PATH}. ` +
      'Update scripts/hotfix.mjs if the sw.js format changed.'
    );
  }

  const [, prefix, versionStr] = match;
  const from = `${prefix}${versionStr}`;
  const to = `${prefix}${Number(versionStr) + 1}`;
  writeFileSync(SW_PATH, source.replace(CACHE_NAME_RE, `const CACHE_NAME = '${to}';`));

  return { from, to };
}

/**
 * Orchestrates the hotfix gate: tests first, then cache bump, then next steps.
 *
 * @returns {void}
 */
function main() {
  console.log('\n[hotfix] Running test suite before release...\n');
  try {
    runTests();
  } catch {
    console.error('\n[hotfix] ABORTED: tests failed. Cache version NOT bumped. Fix tests, then re-run.\n');
    process.exit(1);
  }

  const { from, to } = bumpCacheName();
  console.log(`\n[hotfix] Tests green. Cache bumped ${from} -> ${to}.`);
  console.log('[hotfix] Next: commit the fix + sw.js together, then push to main:');
  console.log('           git add -A');
  console.log(`           git commit -m "fix: <what you fixed> (${to})"`);
  console.log('           git push');
  console.log('[hotfix] Attendees must reload (or fully close/reopen the PWA) to pick it up.\n');
}

main();
