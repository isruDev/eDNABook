import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startGpsWatch, stopGpsWatch, restartGpsWatch, getGpsStatus, getCurrentPosition, onGpsChange,
  GPS_LOCK_THRESHOLD_M,
} from '../js/gps.js';

/**
 * Mocks navigator.geolocation with a controllable watchPosition.
 *
 * @param {Object} options - Configuration options.
 * @param {boolean} [options.unavailable=false] - If true, sets geolocation to undefined.
 * @returns {{ mock: Object, watchCallbacks: { success: Function|null, error: Function|null } }}
 */
function mockGeolocation(options = {}) {
  const watchCallbacks = { success: null, error: null };
  const mock = {
    watchPosition: vi.fn((success, error) => {
      watchCallbacks.success = success;
      watchCallbacks.error = error;
      return 42;
    }),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  };
  Object.defineProperty(global.navigator, 'geolocation', {
    value: options.unavailable ? undefined : mock,
    configurable: true,
    writable: true,
  });
  return { mock, watchCallbacks };
}

let originalGeolocation;

beforeEach(() => {
  originalGeolocation = global.navigator.geolocation;
  stopGpsWatch();
});

afterEach(() => {
  stopGpsWatch();
  Object.defineProperty(global.navigator, 'geolocation', {
    value: originalGeolocation,
    configurable: true,
    writable: true,
  });
  vi.restoreAllMocks();
});

describe('startGpsWatch', () => {
  it('calls watchPosition with enableHighAccuracy', () => {
    const { mock } = mockGeolocation();
    startGpsWatch();
    expect(mock.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true })
    );
  });

  it('requests a fresh fix by disallowing cached positions (maximumAge 0)', () => {
    const { mock } = mockGeolocation();
    startGpsWatch();
    expect(mock.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ maximumAge: 0 })
    );
  });

  it('does not start a second watch if already running', () => {
    const { mock } = mockGeolocation();
    startGpsWatch();
    startGpsWatch();
    expect(mock.watchPosition).toHaveBeenCalledTimes(1);
  });
});

describe('getGpsStatus', () => {
  it('returns waiting state before any position update', () => {
    mockGeolocation();
    startGpsWatch();
    const status = getGpsStatus();
    expect(status.state).toBe('waiting');
    expect(status.latitude).toBeNull();
  });

  it('exports a 15 m lock threshold', () => {
    expect(GPS_LOCK_THRESHOLD_M).toBe(15);
  });

  it('returns locking state when accuracy is just above 15 m', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.success({ coords: { latitude: 47.6, longitude: -122.3, accuracy: 15.5 } });
    expect(getGpsStatus().state).toBe('locking');
  });

  it('returns locked state when accuracy is exactly 15 m', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.success({ coords: { latitude: 47.6, longitude: -122.3, accuracy: 15 } });
    expect(getGpsStatus().state).toBe('locked');
  });

  it('returns locking state when accuracy > 15', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.success({ coords: { latitude: 47.6, longitude: -122.3, accuracy: 85 } });
    const status = getGpsStatus();
    expect(status.state).toBe('locking');
    expect(status.accuracy).toBe(85);
  });

  it('returns locked state when accuracy <= 15', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.success({ coords: { latitude: 47.6, longitude: -122.3, accuracy: 12 } });
    const status = getGpsStatus();
    expect(status.state).toBe('locked');
    expect(status.latitude).toBe(47.6);
  });

  it('returns error state on geolocation error', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.error({ code: 1, message: 'Permission denied' });
    const status = getGpsStatus();
    expect(status.state).toBe('error');
  });

  it('returns error state when geolocation is unavailable', () => {
    mockGeolocation({ unavailable: true });
    startGpsWatch();
    expect(getGpsStatus().state).toBe('error');
  });
});

describe('getCurrentPosition (backward compat)', () => {
  it('returns null before any position update', () => {
    mockGeolocation();
    startGpsWatch();
    const pos = getCurrentPosition();
    expect(pos).toBeNull();
  });

  it('returns cached position after a watch update', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.success({ coords: { latitude: 47.6, longitude: -122.3, accuracy: 8 } });
    const pos = getCurrentPosition();
    expect(pos).toEqual({ latitude: 47.6, longitude: -122.3, accuracy: 8 });
  });
});

describe('onGpsChange', () => {
  it('calls listener on each position update', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    const listener = vi.fn();
    onGpsChange(listener);

    watchCallbacks.success({ coords: { latitude: 1, longitude: 2, accuracy: 100 } });
    watchCallbacks.success({ coords: { latitude: 3, longitude: 4, accuracy: 10 } });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'locked' }));
  });

  it('returns an unsubscribe function', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    const listener = vi.fn();
    const unsub = onGpsChange(listener);

    watchCallbacks.success({ coords: { latitude: 1, longitude: 2, accuracy: 100 } });
    unsub();
    watchCallbacks.success({ coords: { latitude: 3, longitude: 4, accuracy: 10 } });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('calls listener on error', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    const listener = vi.fn();
    onGpsChange(listener);

    watchCallbacks.error({ code: 1, message: 'denied' });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ state: 'error' }));
  });
});

describe('stopGpsWatch', () => {
  it('calls clearWatch and resets state', () => {
    const { mock } = mockGeolocation();
    startGpsWatch();
    stopGpsWatch();
    expect(mock.clearWatch).toHaveBeenCalledWith(42);
    expect(getGpsStatus().state).toBe('waiting');
  });
});

describe('restartGpsWatch', () => {
  it('clears the old watch, discards the old fix, and starts a new watch', () => {
    const { mock, watchCallbacks } = mockGeolocation();
    startGpsWatch();
    watchCallbacks.success({ coords: { latitude: 47.6, longitude: -122.3, accuracy: 8 } });

    restartGpsWatch();

    expect(mock.clearWatch).toHaveBeenCalledWith(42);
    expect(mock.watchPosition).toHaveBeenCalledTimes(2);
    expect(getGpsStatus().state).toBe('waiting');
    expect(getCurrentPosition()).toBeNull();
  });

  it('keeps existing listeners and notifies them of the reset', () => {
    const { watchCallbacks } = mockGeolocation();
    startGpsWatch();
    const listener = vi.fn();
    onGpsChange(listener);

    restartGpsWatch();
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'waiting' }));

    watchCallbacks.success({ coords: { latitude: 1, longitude: 2, accuracy: 5 } });
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'locked', latitude: 1 }));
  });
});
