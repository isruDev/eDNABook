import { describe, it, expect } from 'vitest';
import { diffSample, formatEditLog, formatEditLogEntry } from '../js/edit-log.js';

const AT = '2026-05-01T14:02:00.000Z';

/**
 * Builds a sample record with sensible defaults for diff tests.
 *
 * @param {object} [overrides] - Fields to override on the default sample.
 * @returns {object} A sample-shaped object.
 */
function sample(overrides = {}) {
  return {
    sampleId: 'S-1',
    scannedAt: '2026-05-01T10:00',
    latitude: 45.1,
    longitude: -75.2,
    gpsAccuracy: 8,
    photoFilename: null,
    metadata: { pH: '7.1', Site: 'A' },
    ...overrides,
  };
}

describe('diffSample', () => {
  it('returns one entry per changed metadata field with old and new values', () => {
    const entries = diffSample(sample(), { metadata: { pH: '7.4', Site: 'A' } }, AT);
    expect(entries).toEqual([{ at: AT, field: 'pH', from: '7.1', to: '7.4' }]);
  });

  it('records changes to top-level fields using their storage key', () => {
    const entries = diffSample(sample(), { scannedAt: '2026-05-01T11:00', photoFilename: 'p.jpg' }, AT);
    expect(entries).toEqual([
      { at: AT, field: 'scannedAt', from: '2026-05-01T10:00', to: '2026-05-01T11:00' },
      { at: AT, field: 'photoFilename', from: '', to: 'p.jpg' },
    ]);
  });

  it('returns no entries when nothing changed', () => {
    expect(diffSample(sample(), sample(), AT)).toEqual([]);
  });

  it('treats null, undefined, and empty string as the same empty value', () => {
    const entries = diffSample(
      sample({ metadata: { pH: '' } }),
      { metadata: { pH: '', Turbidity: '' }, photoFilename: undefined },
      AT,
    );
    expect(entries).toEqual([]);
  });

  it('compares numbers by value so an unchanged GPS fix is not logged', () => {
    expect(diffSample(sample(), { latitude: 45.1, longitude: -75.2, gpsAccuracy: 8 }, AT)).toEqual([]);
  });

  it('ignores metadata keys absent from the update (they are kept, not cleared)', () => {
    expect(diffSample(sample(), { metadata: { pH: '7.1' } }, AT)).toEqual([]);
  });
});

describe('formatEditLogEntry', () => {
  it('formats a single entry with its display label', () => {
    expect(formatEditLogEntry({ at: AT, field: 'gpsAccuracy', from: '30', to: '6' }))
      .toBe(`${AT} GPS Accuracy: 30 -> 6`);
  });
});

describe('formatEditLog', () => {
  it('returns an empty string for a missing or empty log', () => {
    expect(formatEditLog(undefined)).toBe('');
    expect(formatEditLog([])).toBe('');
  });

  it('formats entries as "time Label: old -> new" joined by "; "', () => {
    const text = formatEditLog([
      { at: AT, field: 'pH', from: '7.1', to: '7.4' },
      { at: AT, field: 'scannedAt', from: '2026-05-01T10:00', to: '2026-05-01T11:00' },
    ]);
    expect(text).toBe(
      `${AT} pH: 7.1 -> 7.4; ${AT} Date/Time: 2026-05-01T10:00 -> 2026-05-01T11:00`,
    );
  });

  it('shows empty old or new values as (empty)', () => {
    expect(formatEditLog([{ at: AT, field: 'photoFilename', from: '', to: 'p.jpg' }]))
      .toBe(`${AT} Photo: (empty) -> p.jpg`);
  });
});
