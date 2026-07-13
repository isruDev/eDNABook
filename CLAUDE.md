# eDNALite — project context

Offline-first PWA for logging environmental DNA sample metadata. Vanilla ES
modules, no framework, no build step. Personal/research project (Allen is the
eDNA research partner) — NOT WSB work, so WSB workflow/ClickUp rules do not apply.

## Stack

- Hash router (`js/app.js`) → dynamic `import()` of view modules in `js/views/`
- Storage: IndexedDB via `idb` (`js/db.js`) — the only data layer
- UMD libs loaded as `<script>` globals in `index.html`: PapaParse, html5-qrcode, sql.js
- Hosting: GitHub Pages, served from `main` branch root. No CI workflow — push to `main` IS the deploy.
- Tests: vitest, `npm test`. Keep green before any push.

## Hotfix procedure (workshop-critical)

The service worker (`sw.js`) is cache-first with a versioned `CACHE_NAME`
(`ednalite-vN`). A changed file is NEVER re-served to an installed client unless
`CACHE_NAME` changes. Every hotfix therefore MUST:

1. Make the fix (TDD — write/adjust the failing test first).
2. Run `npm run hotfix` — runs the full suite, and only if green bumps
   `CACHE_NAME` in `sw.js`. If tests fail it aborts without bumping.
3. Commit the fix AND the bumped `sw.js` together, then push to `main`.
4. Tell attendees to reload (or fully close/reopen the PWA) to pick it up.
   The SW does `skipWaiting()` + `clients.claim()`, so one refresh after the new
   SW installs is enough. iOS standalone PWAs lag on SW update detection — a full
   close/reopen is the reliable nudge.

Skipping the cache bump = pushing a fix that does nothing for installed users.
That is the single most common way to "fix" the app without changing anything.

## Known issues

- Photo filename data loss on new samples: `createSample` (`js/db.js`) uses an
  explicit field whitelist that omits `photoFilename`, so the filename is dropped
  when a freshly-scanned sample is saved (it only persists on edit via
  `updateSample`'s spread). Export's Photo column is blank for those rows and the
  photo files on the device have nothing linking them. The `sample-entry` test
  asserts on the argument to a mocked `createSample`, so the suite is green and
  does not catch it. Fix = add `photoFilename` to the `createSample` object plus a
  real persistence test.

## Field-failure notes

- Camera/scanner: needs HTTPS (Pages is fine). Denial/unavailable falls back to a
  message + "Enter ID Manually". MDM-locked phones may only get the fallback.
- GPS: `enableHighAccuracy: true`, no timeout, "locked" only under 50m. Indoors it
  stays "locking"/error. Samples still save with null coords — not a blocker.
- Export: `navigator.share` with anchor-download fallback. iOS is where share-sheet
  quirks surface.

## Conventions

- Full JSDoc on every function. No `any` (this is JS but keep types honest via JSDoc).
- Dark mode is mandatory — every CSS change must cover the dark theme.
- Compact/tight layouts, minimal whitespace.
- Commit messages < 80 chars, no attribution. Ask before commit/push.
