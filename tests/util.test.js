import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../js/util.js';

describe('sanitizeFilename', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeFilename('River Study')).toBe('River_Study');
  });

  it('replaces non-alphanumeric chars with underscores', () => {
    expect(sanitizeFilename('Study #1 (2026)')).toBe('Study_1_2026');
  });

  it('collapses consecutive underscores', () => {
    expect(sanitizeFilename('a---b   c')).toBe('a_b_c');
  });

  it('trims leading and trailing underscores', () => {
    expect(sanitizeFilename('  hello!  ')).toBe('hello');
  });

  it('preserves case', () => {
    expect(sanitizeFilename('River ABC')).toBe('River_ABC');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeFilename('')).toBe('');
  });
});
