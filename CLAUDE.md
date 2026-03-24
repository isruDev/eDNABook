# eDNA Logger PWA

Offline-first Progressive Web App for field technicians to log environmental DNA sample metadata.
Live at: https://isrudev.github.io/eDNABook/

## Architecture

- **No build step.** Vanilla JS, HTML, CSS served directly. No bundler, no transpiler.
- **ES modules** with `<script type="importmap">` for `idb` bare specifier.
- **UMD libs** loaded via `<script>` tags in index.html (NOT ES module imports):
  - `window.Papa` (papaparse), `window.Html5Qrcode` (html5-qrcode), `window.initSqlJs` (sql.js)
  - In tests, vitest resolve aliases map these to vendored paths.
- **Hash-based SPA router** in `js/app.js` with dynamic `import()` for view modules.
- **IndexedDB** via `idb` wrapper (`js/db.js`) -- two object stores: `projects`, `samples`.
- **Service Worker** (`sw.js`) with cache-first precache strategy.

## File Structure

```
index.html          -- SPA shell, all view containers, UMD script tags
css/style.css       -- All styles, dark mode, animations
js/app.js           -- Router, SW registration, init
js/db.js            -- IndexedDB CRUD (13 exported functions)
js/ui.js            -- DOM helpers: showView, showToast, confirmDialog, etc.
js/scanner.js       -- html5-qrcode wrapper
js/export.js        -- CSV/SQLite export + Web Share API
js/gps.js           -- Geolocation wrapper
js/views/           -- View render functions (home, project-form, project-dashboard,
                       sample-entry, sample-detail, export-dialog)
sw.js               -- Service worker (precache list + cache-first fetch)
lib/                -- Vendored third-party libraries (idb, papaparse, html5-qrcode, sql.js)
tests/              -- Vitest unit tests (186 tests, jsdom + fake-indexeddb)
e2e/                -- Playwright E2E specs
```

## Critical Rules

1. **Bump `CACHE_NAME` in sw.js** on EVERY change. The SW aggressively caches everything. Without a version bump, browsers serve stale files indefinitely.
2. **Never add a build step.** The app must run from a static file server with zero compilation.
3. **UMD libs are NOT ES-importable in browser.** Use `window.Papa`, `window.Html5Qrcode`, `window.initSqlJs` in app code. Tests use vitest aliases.
4. **`import.meta.env.MODE`** is Vite-specific and undefined in browser. The auto-init guard in app.js uses `typeof import.meta.env === 'undefined'`.
5. **View back buttons** are positioned `fixed` in the header bar via CSS. They live in each view's HTML but visually overlay the header.
6. **Delete buttons** use tap-to-confirm (CSS `.confirming` class + 5s JS timeout + conic-gradient countdown border animation). No modal dialog.

## Testing

```bash
npx vitest run          # 186 unit tests
npx playwright test     # E2E (needs `python -m http.server 8080`)
```

Playwright MCP is configured for headless browser testing. When using it, you MUST clear the SW cache between CSS/JS changes or you will see stale content. The browser's HTTP module cache is separate from the SW CacheStorage -- closing the page and reopening helps, but cache-busting query strings on fetch() are the most reliable approach.

## Design

- Mobile-first, max-width 600px centered
- Dark mode via `@media (prefers-color-scheme: dark)` token overrides
- Dark green primary (#1a5632 light, #2d8a4e dark)
- 48px minimum touch targets
- Compact card-based layout for outdoor/field use
- High contrast for sunlight readability
