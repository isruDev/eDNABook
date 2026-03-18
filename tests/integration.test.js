// tests/integration.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/papaparse.min.js', () => ({
  default: {
    unparse: vi.fn((rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return '';
      return rows.map((row) => (Array.isArray(row) ? row.join(',') : '')).join('\n');
    }),
  },
}));

import Papa from '../lib/papaparse.min.js';
import {
  initDB,
  createProject,
  getProject,
  createSample,
  getSamplesByProject,
  parseProject,
} from '../js/db.js';
import { generateCSV } from '../js/export.js';

/**
 * Returns a unique database name per test to prevent cross-test contamination.
 *
 * @returns {string} A UUID-suffixed database name string.
 */
function uniqueDbName() {
  return `edna-integration-${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Project create + retrieve
// ---------------------------------------------------------------------------

describe('integration: create project and retrieve from DB', () => {
  it('stores project content and retrieves it by id', async () => {
    const db = await initDB(uniqueDbName());
    const content = 'River Survey 2026\nCollector\nSite\nDepth';
    const created = await createProject(content, db);

    const fetched = await getProject(created.id, db);

    expect(fetched).toBeDefined();
    expect(fetched.id).toBe(created.id);
    expect(fetched.content).toBe(content);
    expect(fetched.createdAt).toBeDefined();
    expect(fetched.updatedAt).toBeDefined();

    db.close();
  });

  it('parseProject returns correct title and fields from stored content', async () => {
    const db = await initDB(uniqueDbName());
    const content = 'Lake Monitoring\nCollector\nSite\nWater Temp';
    const created = await createProject(content, db);
    const fetched = await getProject(created.id, db);

    const { title, fields } = parseProject(fetched.content);

    expect(title).toBe('Lake Monitoring');
    expect(fields).toEqual(['Collector', 'Site', 'Water Temp']);

    db.close();
  });
});

// ---------------------------------------------------------------------------
// Sample create + project association
// ---------------------------------------------------------------------------

describe('integration: create sample and verify project association', () => {
  it('sample projectId matches the parent project', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Survey\nField A\nField B', db);

    const sample = await createSample(project.id, {
      sampleId: 'QR-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: { 'Field A': 'value1', 'Field B': 'value2' },
    }, db);

    expect(sample.projectId).toBe(project.id);

    db.close();
  });

  it('getSamplesByProject only returns samples for the correct project', async () => {
    const db = await initDB(uniqueDbName());
    const projectA = await createProject('Project A\nField', db);
    const projectB = await createProject('Project B\nField', db);

    await createSample(projectA.id, {
      sampleId: 'A-001',
      scannedAt: '2026-03-17T09:00:00.000Z',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: {},
    }, db);

    await createSample(projectB.id, {
      sampleId: 'B-001',
      scannedAt: '2026-03-17T09:05:00.000Z',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: {},
    }, db);

    const samplesA = await getSamplesByProject(projectA.id, db);
    const samplesB = await getSamplesByProject(projectB.id, db);

    expect(samplesA).toHaveLength(1);
    expect(samplesA[0].sampleId).toBe('A-001');
    expect(samplesB).toHaveLength(1);
    expect(samplesB[0].sampleId).toBe('B-001');

    db.close();
  });
});

// ---------------------------------------------------------------------------
// Full scan+save simulation
// ---------------------------------------------------------------------------

describe('integration: full scan and save simulation', () => {
  it('stores all fields correctly for a GPS-tagged sample with metadata', async () => {
    const db = await initDB(uniqueDbName());

    const project = await createProject(
      'Field Study 2026\nCollector\nSite\nHabitat Type',
      db
    );

    const sampleData = {
      sampleId: 'QR-SCAN-001',
      scannedAt: '2026-03-17T14:30:00.000Z',
      latitude: 47.6062,
      longitude: -122.3321,
      gpsAccuracy: 4.8,
      metadata: {
        Collector: 'Dr. Smith',
        Site: 'River Bend Station 3',
        'Habitat Type': 'Riparian',
      },
    };

    const saved = await createSample(project.id, sampleData, db);

    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.projectId).toBe(project.id);
    expect(saved.sampleId).toBe('QR-SCAN-001');
    expect(saved.scannedAt).toBe('2026-03-17T14:30:00.000Z');
    expect(saved.latitude).toBe(47.6062);
    expect(saved.longitude).toBe(-122.3321);
    expect(saved.gpsAccuracy).toBe(4.8);
    expect(saved.metadata).toEqual({
      Collector: 'Dr. Smith',
      Site: 'River Bend Station 3',
      'Habitat Type': 'Riparian',
    });

    const fetched = await getSamplesByProject(project.id, db);
    expect(fetched).toHaveLength(1);
    expect(fetched[0].id).toBe(saved.id);
    expect(fetched[0].latitude).toBe(47.6062);
    expect(fetched[0].metadata['Habitat Type']).toBe('Riparian');

    db.close();
  });

  it('stores null GPS fields when location is unavailable', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('No-GPS Survey\nSite', db);

    const saved = await createSample(project.id, {
      sampleId: 'NO-GPS-001',
      scannedAt: '2026-03-17T08:00:00.000Z',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: { Site: 'Indoor Lab' },
    }, db);

    expect(saved.latitude).toBeNull();
    expect(saved.longitude).toBeNull();
    expect(saved.gpsAccuracy).toBeNull();

    db.close();
  });
});

// ---------------------------------------------------------------------------
// Export generates valid CSV from saved samples
// ---------------------------------------------------------------------------

describe('integration: export generates CSV from saved samples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateCSV is called with headers matching project fields', async () => {
    const db = await initDB(uniqueDbName());
    const content = 'Export Test\nCollector\nSite';
    const project = await createProject(content, db);

    await createSample(project.id, {
      sampleId: 'EXP-001',
      scannedAt: '2026-03-17T10:00:00.000Z',
      latitude: 51.5074,
      longitude: -0.1278,
      gpsAccuracy: 3.5,
      metadata: { Collector: 'Alice', Site: 'Thames North' },
    }, db);

    const samples = await getSamplesByProject(project.id, db);
    const fetched = await getProject(project.id, db);

    Papa.unparse.mockReturnValue('Sample ID,Date/Time,Latitude,Longitude,GPS Accuracy,Collector,Site\nEXP-001,2026-03-17T10:00:00.000Z,51.5074,-0.1278,3.5,Alice,Thames North');

    const csv = generateCSV(fetched, samples);

    expect(Papa.unparse).toHaveBeenCalledOnce();
    const callArg = Papa.unparse.mock.calls[0][0];

    // Verify headers row
    const headers = callArg[0];
    expect(headers).toContain('Sample ID');
    expect(headers).toContain('Date/Time');
    expect(headers).toContain('Latitude');
    expect(headers).toContain('Longitude');
    expect(headers).toContain('GPS Accuracy');
    expect(headers).toContain('Collector');
    expect(headers).toContain('Site');

    // Verify data row maps correctly
    const dataRow = callArg[1];
    expect(dataRow[0]).toBe('EXP-001');
    expect(dataRow[2]).toBe(51.5074);
    expect(dataRow[3]).toBe(-0.1278);

    expect(typeof csv).toBe('string');
    expect(csv.length).toBeGreaterThan(0);

    db.close();
  });

  it('generateCSV produces headers-only row when project has no samples', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Empty Project\nDepth\nTemp', db);
    const fetched = await getProject(project.id, db);
    const samples = await getSamplesByProject(project.id, db);

    Papa.unparse.mockReturnValue('Sample ID,Date/Time,Latitude,Longitude,GPS Accuracy,Depth,Temp');

    generateCSV(fetched, samples);

    const callArg = Papa.unparse.mock.calls[0][0];
    // Only the header row — no data rows
    expect(callArg).toHaveLength(1);
    expect(callArg[0]).toContain('Depth');
    expect(callArg[0]).toContain('Temp');

    db.close();
  });

  it('generateCSV encodes null GPS as null in data rows', async () => {
    const db = await initDB(uniqueDbName());
    const project = await createProject('Null GPS Test\nSite', db);

    await createSample(project.id, {
      sampleId: 'NULL-GPS-001',
      scannedAt: '2026-03-17T11:00:00.000Z',
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
      metadata: { Site: 'Field 7' },
    }, db);

    const samples = await getSamplesByProject(project.id, db);
    const fetched = await getProject(project.id, db);

    Papa.unparse.mockReturnValue('row');
    generateCSV(fetched, samples);

    const callArg = Papa.unparse.mock.calls[0][0];
    const dataRow = callArg[1];
    expect(dataRow[2]).toBeNull(); // Latitude
    expect(dataRow[3]).toBeNull(); // Longitude
    expect(dataRow[4]).toBeNull(); // GPS Accuracy

    db.close();
  });
});
