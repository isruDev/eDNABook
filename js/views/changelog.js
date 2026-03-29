// js/views/changelog.js
import { showView, clearElement } from '../ui.js';
import { navigate } from '../app.js';

/**
 * GitHub API URL for fetching commit history.
 * Public repos don't need auth. Rate limited to 60 req/hr.
 *
 * @type {string}
 */
const COMMITS_URL = 'https://api.github.com/repos/isruDev/eDNABook/commits?per_page=50';

/**
 * localStorage key for cached commit data.
 *
 * @type {string}
 */
const CACHE_KEY = 'edna-changelog-cache';

/**
 * Fetches commits from GitHub API, caching the result in localStorage.
 * Falls back to cached data when offline or rate-limited.
 *
 * @returns {Promise<Array<{ date: string, message: string, sha: string }>>}
 */
async function fetchCommits() {
  try {
    const res = await fetch(COMMITS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const commits = data.map(c => ({
      date: c.commit.author.date,
      message: c.commit.message.split('\n')[0],
      sha: c.sha.slice(0, 7),
    }));
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(commits));
    } catch { /* storage full or unavailable */ }
    return commits;
  } catch {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { /* parse error */ }
    return [];
  }
}

/**
 * Formats an ISO date string to a short readable format.
 *
 * @param {string} isoDate - ISO 8601 date string.
 * @returns {string} Formatted date like "Mar 28, 2026".
 */
function formatCommitDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Renders the Changelog view with commit history fetched from GitHub.
 *
 * @returns {Promise<void>}
 */
export async function renderChangelog() {
  showView('changelog');

  const container = document.getElementById('changelog-content');
  if (!container) return;
  clearElement(container);

  const wrapper = document.createElement('div');
  wrapper.className = 'changelog-page';

  const title = document.createElement('h2');
  title.className = 'changelog-title';
  title.textContent = 'Changelog';
  wrapper.appendChild(title);

  const loading = document.createElement('p');
  loading.className = 'changelog-loading';
  loading.textContent = 'Loading commits...';
  wrapper.appendChild(loading);
  container.appendChild(wrapper);

  const commits = await fetchCommits();
  loading.remove();

  if (commits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'changelog-empty';
    empty.textContent = 'No changelog data available. Connect to the internet to load.';
    wrapper.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'changelog-list';

    for (const commit of commits) {
      const entry = document.createElement('div');
      entry.className = 'changelog-entry';

      const meta = document.createElement('div');
      meta.className = 'changelog-meta';

      const sha = document.createElement('span');
      sha.className = 'changelog-sha';
      sha.textContent = commit.sha;

      const date = document.createElement('span');
      date.className = 'changelog-date';
      date.textContent = formatCommitDate(commit.date);

      meta.appendChild(sha);
      meta.appendChild(date);

      const msg = document.createElement('p');
      msg.className = 'changelog-message';
      msg.textContent = commit.message;

      entry.appendChild(meta);
      entry.appendChild(msg);
      list.appendChild(entry);
    }

    wrapper.appendChild(list);
  }

  const backBtn = document.querySelector('[data-view="changelog"] .btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => navigate('#/settings'));
  }
}
