import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/db.js', () => ({
  initDB: vi.fn(),
}));

vi.mock('../js/gps.js', () => ({
  startGpsWatch: vi.fn(),
}));

vi.mock('../js/gps-pill.js', () => ({
  initGpsPill: vi.fn(),
}));

vi.mock('../js/ui.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('../js/views/more-modal.js', () => ({
  openMoreModal: vi.fn(),
}));

vi.mock('../js/views/settings.js', () => ({
  applyTheme: vi.fn(),
  applyScale: vi.fn(),
}));

import { parseRoute, init } from '../js/app.js';

describe('parseRoute', () => {
  it('maps empty hash to home route', () => {
    expect(parseRoute('')).toEqual({ route: 'home', params: {} });
  });

  it('maps # to home route', () => {
    expect(parseRoute('#')).toEqual({ route: 'home', params: {} });
  });

  it('maps #/ to home route', () => {
    expect(parseRoute('#/')).toEqual({ route: 'home', params: {} });
  });

  it('maps #/project/new to project-new route', () => {
    expect(parseRoute('#/project/new')).toEqual({ route: 'project-new', params: {} });
  });

  it('maps #/project/:id to project-dashboard route', () => {
    const result = parseRoute('#/project/abc-123');
    expect(result.route).toBe('project-dashboard');
    expect(result.params.id).toBe('abc-123');
  });

  it('maps #/project/:id/edit to project-edit route', () => {
    const result = parseRoute('#/project/xyz-789/edit');
    expect(result.route).toBe('project-edit');
    expect(result.params.id).toBe('xyz-789');
  });

  it('maps #/project/:id/scan to project-scan route', () => {
    const result = parseRoute('#/project/proj-1/scan');
    expect(result.route).toBe('project-scan');
    expect(result.params.id).toBe('proj-1');
  });

  it('maps #/sample/:id to sample-detail route', () => {
    const result = parseRoute('#/sample/samp-456');
    expect(result.route).toBe('sample-detail');
    expect(result.params.id).toBe('samp-456');
  });

  it('maps #/sample/:id/edit to sample-edit route', () => {
    const result = parseRoute('#/sample/samp-456/edit');
    expect(result.route).toBe('sample-edit');
    expect(result.params.id).toBe('samp-456');
  });

  it('returns 404 route for unknown hash', () => {
    expect(parseRoute('#/unknown/path')).toEqual({ route: '404', params: {} });
  });

  it('maps #/offline/ios to offline-ios route', () => {
    expect(parseRoute('#/offline/ios')).toEqual({ route: 'offline-ios', params: {} });
  });

  it('maps #/offline/android to offline-android route', () => {
    expect(parseRoute('#/offline/android')).toEqual({ route: 'offline-android', params: {} });
  });

  it('maps #/about to about route', () => {
    expect(parseRoute('#/about')).toEqual({ route: 'about', params: {} });
  });

  it('maps #/settings to settings route', () => {
    expect(parseRoute('#/settings')).toEqual({ route: 'settings', params: {} });
  });

  it('maps #/changelog to changelog route', () => {
    expect(parseRoute('#/changelog')).toEqual({ route: 'changelog', params: {} });
  });
});

describe('clickable header banner', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header class="app-header" id="app-header">
        <button class="btn-back" id="back-btn" style="display:none" aria-label="Back"></button>
        <h1 id="app-title">eDNALite</h1>
        <button class="btn-icon" id="header-action-btn" style="display:none" aria-label="Action"></button>
        <button class="more-btn" id="more-btn" aria-label="More options">More</button>
      </header>
      <main id="main-content"></main>
    `;
    window.location.hash = '';
  });

  it('app-title h1 navigates home on click', async () => {
    await init();
    window.location.hash = '#/somewhere';
    const title = document.getElementById('app-title');
    title.click();
    expect(window.location.hash).toBe('#/');
  });

  it('clicking header dead space (not on any button) navigates home', async () => {
    // Regression: the h1 only covers ~27px of the 56px header on mobile, so
    // Allen reported that tapping above/below the text did nothing. The whole
    // banner should navigate home.
    await init();
    window.location.hash = '#/somewhere';
    const header = document.getElementById('app-header');
    header.click();
    expect(window.location.hash).toBe('#/');
  });

  it('clicking the More button does NOT navigate home', async () => {
    // The More button has its own handler — header delegation must ignore it.
    await init();
    window.location.hash = '#/somewhere';
    const moreBtn = document.getElementById('more-btn');
    moreBtn.click();
    expect(window.location.hash).toBe('#/somewhere');
  });

  it('header has cursor pointer to signal tappable', async () => {
    await init();
    const header = document.getElementById('app-header');
    expect(header.style.cursor).toBe('pointer');
  });
});
