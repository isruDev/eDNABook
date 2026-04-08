import { initDB } from './db.js';
import { showToast } from './ui.js';
import { startGpsWatch } from './gps.js';
import { initGpsPill } from './gps-pill.js';
import { openMoreModal } from './views/more-modal.js';
import { applyTheme, applyScale } from './views/settings.js';

/**
 * @typedef {{ route: string, params: Record<string, string> }} ParsedRoute
 */

/**
 * Route table mapping regex patterns to route names and param extractors.
 *
 * Each entry has:
 *   - pattern: regex that matches against the hash path (after stripping leading #)
 *   - route: string identifier used by view render functions
 *   - params: function that extracts named params from regex match groups
 *
 * @type {Array<{ pattern: RegExp, route: string, params: (match: RegExpMatchArray) => Record<string, string> }>}
 */
const ROUTES = [
  {
    pattern: /^(\/)?$/,
    route: 'home',
    params: () => ({}),
  },
  {
    pattern: /^\/project\/new$/,
    route: 'project-new',
    params: () => ({}),
  },
  {
    pattern: /^\/project\/([^/]+)\/edit$/,
    route: 'project-edit',
    params: match => ({ id: match[1] }),
  },
  {
    pattern: /^\/project\/([^/]+)\/scan$/,
    route: 'project-scan',
    params: match => ({ id: match[1] }),
  },
  {
    pattern: /^\/project\/([^/]+)$/,
    route: 'project-dashboard',
    params: match => ({ id: match[1] }),
  },
  {
    pattern: /^\/sample\/([^/]+)\/edit$/,
    route: 'sample-edit',
    params: match => ({ id: match[1] }),
  },
  {
    pattern: /^\/sample\/([^/]+)$/,
    route: 'sample-detail',
    params: match => ({ id: match[1] }),
  },
  {
    pattern: /^\/offline\/ios$/,
    route: 'offline-ios',
    params: () => ({}),
  },
  {
    pattern: /^\/offline\/android$/,
    route: 'offline-android',
    params: () => ({}),
  },
  {
    pattern: /^\/about$/,
    route: 'about',
    params: () => ({}),
  },
  {
    pattern: /^\/settings$/,
    route: 'settings',
    params: () => ({}),
  },
  {
    pattern: /^\/changelog$/,
    route: 'changelog',
    params: () => ({}),
  },
];

/**
 * Parses a URL hash string into a route name and extracted parameters.
 *
 * @param {string} hash - The full hash string (e.g., '#/project/abc-123/edit').
 * @returns {ParsedRoute} The matched route name and any extracted URL parameters.
 *   Returns { route: '404', params: {} } if no route matches.
 *
 * @example
 * parseRoute('#/project/abc-123') // { route: 'project-dashboard', params: { id: 'abc-123' } }
 * parseRoute('#/') // { route: 'home', params: {} }
 */
export function parseRoute(hash) {
  const path = hash.replace(/^#/, '');

  for (const { pattern, route, params } of ROUTES) {
    const match = path.match(pattern);
    if (match) {
      return { route, params: params(match) };
    }
  }

  return { route: '404', params: {} };
}

/**
 * Programmatically navigates to a hash-based route.
 *
 * @param {string} hash - The target hash (e.g., '#/project/abc-123').
 * @returns {void}
 */
export function navigate(hash) {
  window.location.hash = hash;
}

/**
 * Handles route changes triggered by hashchange events or direct calls.
 * Matches the current hash to a route and invokes the corresponding render function
 * via dynamic import. Missing view modules are handled gracefully.
 *
 * @returns {Promise<void>}
 */
export async function onRouteChange() {
  const { route, params } = parseRoute(window.location.hash);

  /** @type {Record<string, string>} Maps route names to their view module paths. */
  const VIEW_MODULES = {
    'home':               './views/home.js',
    'project-new':        './views/project-form.js',
    'project-edit':       './views/project-form.js',
    'project-dashboard':  './views/project-dashboard.js',
    'project-scan':       './views/sample-entry.js',
    'sample-detail':      './views/sample-detail.js',
    'sample-edit':        './views/sample-detail.js',
    'offline-ios':        './views/offline-guide.js',
    'offline-android':    './views/offline-guide.js',
    'about':              './views/about.js',
    'settings':           './views/settings.js',
    'changelog':          './views/changelog.js',
  };

  const modulePath = VIEW_MODULES[route] ?? VIEW_MODULES['home'];

  try {
    const mod = await import(/* @vite-ignore */ modulePath);

    switch (route) {
      case 'home':
      default:
        await mod.renderHome();
        break;
      case 'project-new':
        await mod.renderProjectForm();
        break;
      case 'project-edit':
        await mod.renderProjectForm(params.id);
        break;
      case 'project-dashboard':
        await mod.renderProjectDashboard(params.id);
        break;
      case 'project-scan':
        await mod.renderSampleEntry(params.id);
        break;
      case 'sample-detail':
        await mod.renderSampleDetail(params.id);
        break;
      case 'sample-edit':
        await mod.renderSampleEdit(params.id);
        break;
      case 'offline-ios':
        await mod.renderOfflineGuide('ios');
        break;
      case 'offline-android':
        await mod.renderOfflineGuide('android');
        break;
      case 'about':
        await mod.renderAbout();
        break;
      case 'settings':
        await mod.renderSettings();
        break;
      case 'changelog':
        await mod.renderChangelog();
        break;
    }
  } catch (err) {
    console.warn(`[router] Failed to load view for route "${route}":`, err.message);
    showToast('Something went wrong loading this view.', 'error');
  }
}

/**
 * Registers the service worker and wires up the hash-based router.
 * Called once on application startup.
 *
 * @returns {Promise<void>}
 */
export async function init() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  }

  await initDB();
  applyTheme();
  applyScale();
  startGpsWatch();
  initGpsPill();

  // Delegate banner clicks across the entire header, not just the h1 text.
  // On mobile the h1 only covers ~27px of the 56px header, so tapping the
  // empty vertical space used to do nothing. Now any tap inside the header
  // that is not on a button navigates home.
  const appHeader = document.getElementById('app-header');
  if (appHeader) {
    appHeader.style.cursor = 'pointer';
    appHeader.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      window.location.hash = '#/';
    });
  }

  const moreBtn = document.getElementById('more-btn');
  if (moreBtn) {
    moreBtn.addEventListener('click', openMoreModal);
  }

  window.addEventListener('hashchange', onRouteChange);
  await onRouteChange();
}

// Auto-initialize only in a real browser context, not during test runs.
// import.meta.env is Vite-only; in the browser it's undefined.
if (typeof import.meta.env === 'undefined' || import.meta.env.MODE !== 'test') {
  init();
}
