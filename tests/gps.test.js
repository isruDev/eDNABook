import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentPosition } from '../js/gps.js';

describe('getCurrentPosition', () => {
  let originalGeolocation;

  beforeEach(() => {
    originalGeolocation = global.navigator.geolocation;
  });

  afterEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('returns coords on success', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: { latitude: 47.6062, longitude: -122.3321, accuracy: 5 },
          });
        }),
      },
      configurable: true,
      writable: true,
    });

    const result = await getCurrentPosition();
    expect(result).toEqual({ latitude: 47.6062, longitude: -122.3321, accuracy: 5 });
  });

  it('returns null on permission denied', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 1, message: 'Permission denied' });
        }),
      },
      configurable: true,
      writable: true,
    });

    const result = await getCurrentPosition();
    expect(result).toBeNull();
  });

  it('returns null on timeout', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 3, message: 'Timeout' });
        }),
      },
      configurable: true,
      writable: true,
    });

    const result = await getCurrentPosition();
    expect(result).toBeNull();
  });

  it('returns null when geolocation is unavailable', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const result = await getCurrentPosition();
    expect(result).toBeNull();
  });
});
