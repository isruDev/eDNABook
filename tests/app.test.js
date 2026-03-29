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

describe('clickable title', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header class="app-header" id="app-header">
        <h1 id="app-title">eDNALite</h1>
      </header>
      <main id="main-content"></main>
    `;
    window.location.hash = '';
  });

  it('app-title h1 has cursor pointer style and navigates home on click', async () => {
    await init();

    const title = document.getElementById('app-title');
    expect(title.style.cursor).toBe('pointer');

    title.click();
    expect(window.location.hash).toBe('#/');
  });
});
