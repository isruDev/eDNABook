import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/gps.js', () => ({
  onGpsChange: vi.fn(),
}));

import { onGpsChange } from '../js/gps.js';
import { initGpsPill } from '../js/gps-pill.js';

beforeEach(() => {
  document.body.innerHTML = '<header class="app-header" id="app-header"><h1>eDNA Logger</h1></header><main></main>';
  vi.clearAllMocks();
  onGpsChange.mockReturnValue(() => {});
});

afterEach(() => {
  const pill = document.getElementById('gps-pill');
  if (pill) pill.remove();
});

describe('initGpsPill', () => {
  it('creates a #gps-pill element after the header', () => {
    initGpsPill();
    const pill = document.getElementById('gps-pill');
    expect(pill).not.toBeNull();
    expect(pill.previousElementSibling.id).toBe('app-header');
  });

  it('starts hidden', () => {
    initGpsPill();
    const pill = document.getElementById('gps-pill');
    expect(pill.classList.contains('gps-pill-hidden')).toBe(true);
  });

  it('subscribes to onGpsChange', () => {
    initGpsPill();
    expect(onGpsChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('shows yellow state for locking', () => {
    let changeCallback;
    onGpsChange.mockImplementation((cb) => { changeCallback = cb; return () => {}; });
    initGpsPill();

    changeCallback({ latitude: 47.6, longitude: -122.3, accuracy: 85, state: 'locking' });
    const pill = document.getElementById('gps-pill');
    expect(pill.classList.contains('gps-pill-hidden')).toBe(false);
    expect(pill.classList.contains('gps-locking')).toBe(true);
    expect(pill.textContent).toContain('85');
  });

  it('shows green state for locked', () => {
    let changeCallback;
    onGpsChange.mockImplementation((cb) => { changeCallback = cb; return () => {}; });
    initGpsPill();

    changeCallback({ latitude: 47.6, longitude: -122.3, accuracy: 12, state: 'locked' });
    const pill = document.getElementById('gps-pill');
    expect(pill.classList.contains('gps-locked')).toBe(true);
    expect(pill.textContent).toContain('12');
  });

  it('shows red state for error', () => {
    let changeCallback;
    onGpsChange.mockImplementation((cb) => { changeCallback = cb; return () => {}; });
    initGpsPill();

    changeCallback({ latitude: null, longitude: null, accuracy: null, state: 'error' });
    const pill = document.getElementById('gps-pill');
    expect(pill.classList.contains('gps-error')).toBe(true);
    expect(pill.textContent.toLowerCase()).toContain('unavailable');
  });

  it('reappears in yellow if accuracy degrades after being locked', () => {
    let changeCallback;
    onGpsChange.mockImplementation((cb) => { changeCallback = cb; return () => {}; });
    initGpsPill();

    changeCallback({ latitude: 47.6, longitude: -122.3, accuracy: 12, state: 'locked' });
    changeCallback({ latitude: 47.6, longitude: -122.3, accuracy: 85, state: 'locking' });

    const pill = document.getElementById('gps-pill');
    expect(pill.classList.contains('gps-locking')).toBe(true);
    expect(pill.classList.contains('gps-pill-hidden')).toBe(false);
  });

  it('does not create duplicate pills on double init', () => {
    initGpsPill();
    initGpsPill();
    const pills = document.querySelectorAll('#gps-pill');
    expect(pills.length).toBe(1);
  });
});
