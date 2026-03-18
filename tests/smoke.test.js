import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('test runner is functional', () => {
    expect(1 + 1).toBe(2);
  });

  it('indexedDB is available via fake-indexeddb', () => {
    expect(typeof indexedDB).toBe('object');
  });
});
