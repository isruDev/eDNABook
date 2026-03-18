import { describe, it, expect } from 'vitest';
import { parseRoute } from '../js/app.js';

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
});
