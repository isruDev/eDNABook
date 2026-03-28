// tests/views/offline-guide.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/ui.js', () => ({
  showView: vi.fn(),
  clearElement: vi.fn((el) => { el.innerHTML = ''; }),
  createElement: vi.fn((tag, attrs, text) => {
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, v);
    });
    if (typeof text === 'string') el.textContent = text;
    return el;
  }),
}));

vi.mock('../../js/app.js', () => ({
  navigate: vi.fn(),
}));

import { showView, clearElement } from '../../js/ui.js';
import { navigate } from '../../js/app.js';
import { renderOfflineGuide } from '../../js/views/offline-guide.js';

function setupDOM(platform) {
  const viewId = `offline-${platform}`;
  const contentId = `offline-${platform}-content`;
  document.body.innerHTML = `
    <div class="view" data-view="${viewId}">
      <button class="btn-back">Back</button>
      <div id="${contentId}"></div>
    </div>
  `;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'serviceWorker', {
    value: undefined,
    configurable: true,
    writable: true,
  });
});

describe('renderOfflineGuide -- iOS', () => {
  beforeEach(() => setupDOM('ios'));

  it('calls showView with "offline-ios"', async () => {
    await renderOfflineGuide('ios');
    expect(showView).toHaveBeenCalledWith('offline-ios');
  });

  it('renders install steps for iOS (Safari instructions)', async () => {
    await renderOfflineGuide('ios');
    const content = document.getElementById('offline-ios-content');
    expect(content.textContent).toContain('Safari');
  });

  it('renders 4 install steps for iOS', async () => {
    await renderOfflineGuide('ios');
    const steps = document.querySelectorAll('#offline-ios-content .install-step');
    expect(steps).toHaveLength(4);
  });

  it('renders troubleshooting section for iOS', async () => {
    await renderOfflineGuide('ios');
    const content = document.getElementById('offline-ios-content').textContent;
    expect(content.toLowerCase()).toContain('troubleshoot');
  });

  it('back button navigates to home', async () => {
    await renderOfflineGuide('ios');
    document.querySelector('[data-view="offline-ios"] .btn-back').click();
    expect(navigate).toHaveBeenCalledWith('#/');
  });
});

describe('renderOfflineGuide -- Android', () => {
  beforeEach(() => setupDOM('android'));

  it('calls showView with "offline-android"', async () => {
    await renderOfflineGuide('android');
    expect(showView).toHaveBeenCalledWith('offline-android');
  });

  it('renders install steps for Android (Chrome instructions)', async () => {
    await renderOfflineGuide('android');
    const content = document.getElementById('offline-android-content');
    expect(content.textContent).toContain('Chrome');
  });

  it('renders 4 install steps for Android', async () => {
    await renderOfflineGuide('android');
    const steps = document.querySelectorAll('#offline-android-content .install-step');
    expect(steps).toHaveLength(4);
  });

  it('renders troubleshooting section for Android', async () => {
    await renderOfflineGuide('android');
    const content = document.getElementById('offline-android-content').textContent;
    expect(content.toLowerCase()).toContain('troubleshoot');
  });

  it('back button navigates to home', async () => {
    await renderOfflineGuide('android');
    document.querySelector('[data-view="offline-android"] .btn-back').click();
    expect(navigate).toHaveBeenCalledWith('#/');
  });
});

describe('offline status indicator', () => {
  it('shows "Ready for offline use" when navigator.serviceWorker.controller is set', async () => {
    setupDOM('ios');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: {} },
      configurable: true,
      writable: true,
    });
    await renderOfflineGuide('ios');
    const status = document.querySelector('#offline-ios-content .offline-status');
    expect(status).not.toBeNull();
    expect(status.textContent).toContain('Ready');
    expect(status.classList.contains('ready')).toBe(true);
  });

  it('shows "Not ready for offline use" when navigator.serviceWorker is absent', async () => {
    setupDOM('android');
    await renderOfflineGuide('android');
    const status = document.querySelector('#offline-android-content .offline-status');
    expect(status).not.toBeNull();
    expect(status.textContent).toContain('Not ready');
    expect(status.classList.contains('not-ready')).toBe(true);
  });

  it('shows "Not ready" when serviceWorker exists but controller is null', async () => {
    setupDOM('ios');
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { controller: null },
      configurable: true,
      writable: true,
    });
    await renderOfflineGuide('ios');
    const status = document.querySelector('#offline-ios-content .offline-status');
    expect(status.classList.contains('not-ready')).toBe(true);
  });
});
