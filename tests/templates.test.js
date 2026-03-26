import { describe, it, expect } from 'vitest';
import { TEMPLATES } from '../js/templates.js';

describe('TEMPLATES', () => {
  it('exports an array with at least one template', () => {
    expect(Array.isArray(TEMPLATES)).toBe(true);
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(1);
  });

  it('each template has a name and content string', () => {
    for (const t of TEMPLATES) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.content).toBe('string');
      expect(t.content.length).toBeGreaterThan(0);
    }
  });

  it('Sample Project template has correct fields', () => {
    const sample = TEMPLATES.find(t => t.name === 'Sample Project');
    expect(sample).toBeDefined();
    expect(sample.content).toContain('Samplers');
    expect(sample.content).toContain('[checkbox]Waders Bleached?');
    expect(sample.content).toContain('[checkbox]Fresh Gloves Used?');
  });

  it('template content starts with the template name', () => {
    for (const t of TEMPLATES) {
      expect(t.content.startsWith(t.name)).toBe(true);
    }
  });
});
