import { describe, it, expect } from 'vitest';
import {
  parseProject,
  initDB,
  createProject,
  getProject,
  getAllProjects,
  updateProject,
  deleteProject,
  createSample,
  getSamplesByProject,
  getSample,
  updateSample,
  deleteSample,
  getSampleBySampleId,
} from '../js/db.js';

// ---------------------------------------------------------------------------
// parseProject (synchronous -- no DB required)
// ---------------------------------------------------------------------------

describe('parseProject', () => {
  it('extracts title from first line', () => {
    const result = parseProject('River Survey 2026\nCollector\nSite');
    expect(result.title).toBe('River Survey 2026');
  });

  it('returns typed field objects for plain fields', () => {
    const result = parseProject('Survey\nCollector\nSite\nDepth');
    expect(result.fields).toEqual([
      { name: 'Collector', type: 'text' },
      { name: 'Site', type: 'text' },
      { name: 'Depth', type: 'text' },
    ]);
  });

  it('parses [checkbox] prefix into checkbox type', () => {
    const result = parseProject('My Project\n[checkbox]Waders Cleaned\nSite');
    expect(result.fields).toEqual([
      { name: 'Waders Cleaned', type: 'checkbox' },
      { name: 'Site', type: 'text' },
    ]);
  });

  it('handles mixed text and checkbox fields', () => {
    const result = parseProject('Study\nCollector\n[checkbox]Blank Used\npH');
    expect(result.fields).toHaveLength(3);
    expect(result.fields[0]).toEqual({ name: 'Collector', type: 'text' });
    expect(result.fields[1]).toEqual({ name: 'Blank Used', type: 'checkbox' });
    expect(result.fields[2]).toEqual({ name: 'pH', type: 'text' });
  });

  it('returns empty fields array when only title is present', () => {
    const result = parseProject('Just a Title');
    expect(result.fields).toEqual([]);
  });

  it('trims whitespace from title and fields', () => {
    const result = parseProject('  River Survey  \n  Collector  \n  Site  ');
    expect(result.title).toBe('River Survey');
    expect(result.fields).toEqual([
      { name: 'Collector', type: 'text' },
      { name: 'Site', type: 'text' },
    ]);
  });

  it('filters out empty lines between fields', () => {
    const result = parseProject('Survey\nCollector\n\nSite\n\n');
    expect(result.fields).toEqual([
      { name: 'Collector', type: 'text' },
      { name: 'Site', type: 'text' },
    ]);
  });

  it('returns empty title and fields for empty content', () => {
    const result = parseProject('');
    expect(result.title).toBe('');
    expect(result.fields).toEqual([]);
  });

  it('returns empty title and fields for whitespace-only content', () => {
    const result = parseProject('   \n   \n   ');
    expect(result.title).toBe('');
    expect(result.fields).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Returns a unique DB name per test to ensure isolation.
 *
 * @returns {string} A unique database name.
 */
function uniqueDbName() {
  return `edna-test-${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// initDB + createProject + getProject + getAllProjects
// ---------------------------------------------------------------------------

describe('initDB + project CRUD (read)', () => {
  it('opens the database without error', async () => {
    const db = await initDB(uniqueDbName());
    expect(db).toBeDefined();
    db.close();
  });

  it('createProject returns a project with id and timestamps', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nCollector\nSite', db);
    expect(project.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(project.content).toBe('Survey\nCollector\nSite');
    expect(project.createdAt).toBeDefined();
    expect(project.updatedAt).toBeDefined();
    db.close();
  });

  it('getProject retrieves a project by id', async () => {
    const db = await initDB(uniqueDbName());
    const created = await createProject('Test\nFieldA', db);
    const fetched = await getProject(created.id, db);
    expect(fetched).toBeDefined();
    expect(fetched.id).toBe(created.id);
    expect(fetched.content).toBe('Test\nFieldA');
    db.close();
  });

  it('getProject returns undefined for unknown id', async () => {
    const db = await initDB(uniqueDbName());
    const result = await getProject('nonexistent-id', db);
    expect(result).toBeUndefined();
    db.close();
  });

  it('getAllProjects returns all projects sorted by updatedAt desc', async () => {
    const db = await initDB(uniqueDbName());
    const p1 = await createProject('Alpha\nField1', db);
    // small delay to ensure distinct timestamps
    await new Promise(r => setTimeout(r, 5));
    const p2 = await createProject('Beta\nField2', db);
    const all = await getAllProjects(db);
    expect(all.length).toBe(2);
    expect(all[0].id).toBe(p2.id);
    expect(all[1].id).toBe(p1.id);
    db.close();
  });

  it('getAllProjects returns empty array when no projects exist', async () => {
    const db = await initDB(uniqueDbName());
    const all = await getAllProjects(db);
    expect(all).toEqual([]);
    db.close();
  });
});

// ---------------------------------------------------------------------------
// updateProject + deleteProject
// ---------------------------------------------------------------------------

describe('updateProject + deleteProject', () => {
  it('updateProject updates content and updatedAt', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Old Title\nField1', db);
    const originalUpdatedAt = project.updatedAt;
    await new Promise(r => setTimeout(r, 5));
    const updated = await updateProject(project.id, 'New Title\nField1\nField2', db);
    expect(updated.content).toBe('New Title\nField1\nField2');
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);
    expect(updated.createdAt).toBe(project.createdAt);
    db.close();
  });

  it('updateProject throws for unknown id', async () => {
    const db = await initDB(uniqueDbName());
    await expect(updateProject('bad-id', 'content', db)).rejects.toThrow();
    db.close();
  });

  it('deleteProject removes the project', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('ToDelete\nField', db);
    await deleteProject(project.id, db);
    const fetched = await getProject(project.id, db);
    expect(fetched).toBeUndefined();
    db.close();
  });

  it('deleteProject throws for unknown id', async () => {
    const db = await initDB(uniqueDbName());
    await expect(deleteProject('bad-id', db)).rejects.toThrow();
    db.close();
  });

  it('deleteProject also removes all associated samples', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    await createSample(project.id, {
      sampleId: 'S001',
      scannedAt: new Date().toISOString(),
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: {},
    }, db);
    await createSample(project.id, {
      sampleId: 'S002',
      scannedAt: new Date().toISOString(),
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: {},
    }, db);
    await deleteProject(project.id, db);
    const samples = await getSamplesByProject(project.id, db);
    expect(samples).toEqual([]);
    db.close();
  });
});

// ---------------------------------------------------------------------------
// Sample CRUD
// ---------------------------------------------------------------------------

describe('sample CRUD', () => {
  it('createSample returns a sample with id, projectId, and timestamps', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    const sample = await createSample(project.id, {
      sampleId: 'S-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: 47.6062,
      longitude: -122.3321,
      gpsAccuracy: 5.2,
      metadata: { Collector: 'Alice' },
    }, db);
    expect(sample.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sample.projectId).toBe(project.id);
    expect(sample.sampleId).toBe('S-001');
    expect(sample.latitude).toBe(47.6062);
    expect(sample.metadata).toEqual({ Collector: 'Alice' });
    expect(sample.createdAt).toBeDefined();
    expect(sample.updatedAt).toBeDefined();
    db.close();
  });

  it('getSamplesByProject returns samples sorted by scannedAt desc', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    const s1 = await createSample(project.id, {
      sampleId: 'S-001',
      scannedAt: '2026-03-17T09:00:00.000Z',
      latitude: null, longitude: null, gpsAccuracy: null, metadata: {},
    }, db);
    const s2 = await createSample(project.id, {
      sampleId: 'S-002',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null, longitude: null, gpsAccuracy: null, metadata: {},
    }, db);
    const samples = await getSamplesByProject(project.id, db);
    expect(samples.length).toBe(2);
    expect(samples[0].id).toBe(s2.id);
    expect(samples[1].id).toBe(s1.id);
    db.close();
  });

  it('getSamplesByProject returns empty array for unknown project', async () => {
    const db = await initDB(uniqueDbName());
    const samples = await getSamplesByProject('no-such-project', db);
    expect(samples).toEqual([]);
    db.close();
  });

  it('getSample retrieves a sample by id', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    const created = await createSample(project.id, {
      sampleId: 'S-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null, longitude: null, gpsAccuracy: null, metadata: {},
    }, db);
    const fetched = await getSample(created.id, db);
    expect(fetched).toBeDefined();
    expect(fetched.id).toBe(created.id);
    db.close();
  });

  it('getSample returns undefined for unknown id', async () => {
    const db = await initDB(uniqueDbName());
    const result = await getSample('nope', db);
    expect(result).toBeUndefined();
    db.close();
  });

  it('updateSample merges fields and updates updatedAt', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    const sample = await createSample(project.id, {
      sampleId: 'S-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: { Collector: 'Alice' },
    }, db);
    await new Promise(r => setTimeout(r, 5));
    const updated = await updateSample(sample.id, { metadata: { Collector: 'Bob', Site: 'R3' } }, db);
    expect(updated.metadata).toEqual({ Collector: 'Bob', Site: 'R3' });
    expect(updated.updatedAt).not.toBe(sample.updatedAt);
    expect(updated.sampleId).toBe('S-001');
    db.close();
  });

  it('updateSample throws for unknown id', async () => {
    const db = await initDB(uniqueDbName());
    await expect(updateSample('bad-id', { metadata: {} }, db)).rejects.toThrow();
    db.close();
  });

  it('deleteSample throws for unknown id', async () => {
    const db = await initDB(uniqueDbName());
    await expect(deleteSample('bad-id', db)).rejects.toThrow();
    db.close();
  });

  it('deleteSample removes the sample', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    const sample = await createSample(project.id, {
      sampleId: 'S-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null, longitude: null, gpsAccuracy: null, metadata: {},
    }, db);
    await deleteSample(sample.id, db);
    const fetched = await getSample(sample.id, db);
    expect(fetched).toBeUndefined();
    db.close();
  });
});

// ---------------------------------------------------------------------------
// getSampleBySampleId
// ---------------------------------------------------------------------------

describe('getSampleBySampleId', () => {
  it('finds a sample by sampleId within a project', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    await createSample(project.id, {
      sampleId: 'QR-ABC-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null, longitude: null, gpsAccuracy: null, metadata: {},
    }, db);
    const found = await getSampleBySampleId(project.id, 'QR-ABC-001', db);
    expect(found).toBeDefined();
    expect(found.sampleId).toBe('QR-ABC-001');
    db.close();
  });

  it('returns undefined when sampleId does not exist in project', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField', db);
    const result = await getSampleBySampleId(project.id, 'NOPE', db);
    expect(result).toBeUndefined();
    db.close();
  });

  it('does not return a match from a different project', async () => {
    const db = await initDB(uniqueDbName());
    const p1 = await createProject('Project 1\nField', db);
    const p2 = await createProject('Project 2\nField', db);
    await createSample(p1.id, {
      sampleId: 'SHARED-ID',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null, longitude: null, gpsAccuracy: null, metadata: {},
    }, db);
    const result = await getSampleBySampleId(p2.id, 'SHARED-ID', db);
    expect(result).toBeUndefined();
    db.close();
  });
});
