// tests/export.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Mocks must be hoisted before imports ---

vi.mock('../lib/papaparse.min.js', () => {
  return {
    default: {
      unparse: vi.fn((data) => {
        if (Array.isArray(data) && data.length > 0 && 'fields' in data[0] === false) {
          // called with plain array — unlikely in our code
          return 'mocked-csv';
        }
        // Papa.unparse({ fields, data }) or Papa.unparse(rows, { columns })
        return 'mocked-csv';
      }),
    },
  };
});

// We let sql.js load for real via the vitest alias; it hits node_modules/sql.js.
// The WASM binary path must be absolute in the Node environment because the
// browser-relative '../lib/sql-wasm.wasm' cannot be resolved from cwd.
// (vitest.config.js already aliases ../lib/sql-wasm.js -> node_modules/sql.js/dist/sql-wasm.js)

import { resolve } from 'path';
import Papa from '../lib/papaparse.min.js';
import initSqlJs from '../lib/sql-wasm.js';
import { generateCSV, generateSQLite, shareOrDownload } from '../js/export.js';

// Absolute path to WASM binary used to inject into generateSQLite in tests.
const WASM_PATH = resolve('./node_modules/sql.js/dist/sql-wasm.wasm');
/** @param {string} _file */
const testLocateFile = (_file) => WASM_PATH;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** @type {import('../js/db.js').Project} */
const MOCK_PROJECT = {
  id: 'proj-1',
  content: 'River Study\nSite\nCollector',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** @type {import('../js/db.js').Sample[]} */
const MOCK_SAMPLES = [
  {
    id: 'sample-1',
    projectId: 'proj-1',
    sampleId: 'S-001',
    scannedAt: '2026-01-15T09:30:00',
    latitude: 47.6062,
    longitude: -122.3321,
    gpsAccuracy: 5,
    metadata: { Site: 'River A', Collector: 'Jane' },
    photoFilename: 'River_Study_S-001.jpg',
    createdAt: '2026-01-15T09:30:00',
    updatedAt: '2026-01-15T09:30:00',
  },
  {
    id: 'sample-2',
    projectId: 'proj-1',
    sampleId: 'S-002',
    scannedAt: '2026-01-16T10:00:00',
    latitude: null,
    longitude: null,
    gpsAccuracy: null,
    metadata: { Site: 'Lake B', Collector: 'Bob' },
    photoFilename: null,
    createdAt: '2026-01-16T10:00:00',
    updatedAt: '2026-01-16T10:00:00',
  },
];

// ---------------------------------------------------------------------------
// generateCSV
// ---------------------------------------------------------------------------

describe('generateCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Papa.unparse with correct column headers', () => {
    Papa.unparse.mockReturnValue('csv');
    generateCSV(MOCK_PROJECT, MOCK_SAMPLES);

    expect(Papa.unparse).toHaveBeenCalledOnce();
    const callArg = Papa.unparse.mock.calls[0][0];
    expect(callArg[0]).toEqual([
      'Project Name',
      'eventID',
      'eventDate',
      'decimalLatitude',
      'decimalLongitude',
      'GPS Accuracy',
      'Photo',
      'Site',
      'Collector',
    ]);
  });

  it('maps sample data into correct column order', () => {
    Papa.unparse.mockReturnValue('csv-output');
    generateCSV(MOCK_PROJECT, MOCK_SAMPLES);

    const rows = Papa.unparse.mock.calls[0][0];
    const firstData = rows[1];
    expect(firstData[0]).toBe('River Study');              // Project Name
    expect(firstData[1]).toBe('S-001');                    // eventID
    expect(firstData[2]).toBe('2026-01-15T09:30:00');     // eventDate
    expect(firstData[3]).toBe(47.6062);                   // decimalLatitude
    expect(firstData[4]).toBe(-122.3321);                 // decimalLongitude
    expect(firstData[5]).toBe(5);                         // GPS Accuracy
    expect(firstData[6]).toBe('River_Study_S-001.jpg');   // Photo
    expect(firstData[7]).toBe('River A');                  // Site
    expect(firstData[8]).toBe('Jane');                     // Collector
  });

  it('uses null for missing GPS fields and empty photo', () => {
    Papa.unparse.mockReturnValue('csv-output');
    generateCSV(MOCK_PROJECT, MOCK_SAMPLES);

    const rows = Papa.unparse.mock.calls[0][0];
    const secondData = rows[2];
    expect(secondData[3]).toBeNull(); // decimalLatitude
    expect(secondData[4]).toBeNull(); // decimalLongitude
    expect(secondData[5]).toBeNull(); // GPS Accuracy
    expect(secondData[6]).toBe('');   // Photo (no photo)
  });

  it('handles project fields with special characters in metadata keys', () => {
    const projectWithSpecial = {
      ...MOCK_PROJECT,
      content: 'My Study\nField Name (Units)\nAnother/Field',
    };
    const samplesWithSpecial = [
      {
        ...MOCK_SAMPLES[0],
        metadata: {
          'Field Name (Units)': '42',
          'Another/Field': 'value',
        },
      },
    ];
    Papa.unparse.mockReturnValue('csv-output');
    generateCSV(projectWithSpecial, samplesWithSpecial);

    const rows = Papa.unparse.mock.calls[0][0];
    expect(rows[0]).toContain('Field Name (Units)');
    expect(rows[0]).toContain('Another/Field');
    const dataRow = rows[1];
    expect(dataRow[7]).toBe('42');
    expect(dataRow[8]).toBe('value');
  });

  it('returns the string from Papa.unparse', () => {
    Papa.unparse.mockReturnValue('the-csv-string');
    const result = generateCSV(MOCK_PROJECT, MOCK_SAMPLES);
    expect(result).toBe('the-csv-string');
  });

  it('returns empty CSV string for zero samples (headers only)', () => {
    Papa.unparse.mockReturnValue('headers-only');
    const result = generateCSV(MOCK_PROJECT, []);
    expect(result).toBe('headers-only');
    const rows = Papa.unparse.mock.calls[0][0];
    expect(rows.length).toBe(1); // only the header row
  });
});

// ---------------------------------------------------------------------------
// generateSQLite
// ---------------------------------------------------------------------------

describe('generateSQLite', () => {
  it('returns a Uint8Array', async () => {
    const result = await generateSQLite(MOCK_PROJECT, MOCK_SAMPLES, testLocateFile);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces a valid SQLite database containing all rows', async () => {
    const bytes = await generateSQLite(MOCK_PROJECT, MOCK_SAMPLES, testLocateFile);

    // Open with sql.js to verify contents
    const SQL = await initSqlJs({ locateFile: testLocateFile });
    const db = new SQL.Database(bytes);
    const [res] = db.exec('SELECT COUNT(*) as cnt FROM samples');
    const count = res.values[0][0];
    expect(count).toBe(MOCK_SAMPLES.length);
    db.close();
  });

  it('creates correct columns matching CSV layout', async () => {
    const bytes = await generateSQLite(MOCK_PROJECT, MOCK_SAMPLES, testLocateFile);

    const SQL = await initSqlJs({ locateFile: testLocateFile });
    const db = new SQL.Database(bytes);
    const [res] = db.exec('PRAGMA table_info(samples)');
    const colNames = res.values.map((row) => row[1]);

    expect(colNames[0]).toBe('project_name');
    expect(colNames).toContain('eventID');
    expect(colNames).toContain('eventDate');
    expect(colNames).toContain('decimalLatitude');
    expect(colNames).toContain('decimalLongitude');
    expect(colNames).toContain('gps_accuracy');
    expect(colNames).toContain('photo');
    expect(colNames).toContain('site');
    expect(colNames).toContain('collector');
    db.close();
  });

  it('stores lat/lon/accuracy as REAL, all others as TEXT', async () => {
    const bytes = await generateSQLite(MOCK_PROJECT, MOCK_SAMPLES, testLocateFile);

    const SQL = await initSqlJs({ locateFile: testLocateFile });
    const db = new SQL.Database(bytes);
    const [res] = db.exec('PRAGMA table_info(samples)');
    // PRAGMA table_info columns: cid, name, type, notnull, dflt_value, pk
    const colMap = Object.fromEntries(res.values.map((row) => [row[1], row[2]]));

    expect(colMap['decimalLatitude']).toBe('REAL');
    expect(colMap['decimalLongitude']).toBe('REAL');
    expect(colMap['gps_accuracy']).toBe('REAL');
    expect(colMap['eventID']).toBe('TEXT');
    expect(colMap['eventDate']).toBe('TEXT');
    db.close();
  });

  it('stores null GPS values as NULL in the database', async () => {
    const bytes = await generateSQLite(MOCK_PROJECT, MOCK_SAMPLES, testLocateFile);

    const SQL = await initSqlJs({ locateFile: testLocateFile });
    const db = new SQL.Database(bytes);
    const [res] = db.exec("SELECT decimalLatitude FROM samples WHERE eventID = 'S-002'");
    expect(res.values[0][0]).toBeNull();
    db.close();
  });
});

// ---------------------------------------------------------------------------
// shareOrDownload
// ---------------------------------------------------------------------------

describe('shareOrDownload', () => {
  let originalNavigator;
  let originalURL;
  let createdElements;

  beforeEach(() => {
    originalNavigator = { ...navigator };
    originalURL = globalThis.URL;
    createdElements = [];

    // Track created anchor elements
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        vi.spyOn(el, 'click').mockImplementation(() => {});
        createdElements.push(el);
      }
      return el;
    });

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.URL = originalURL;
  });

  it('uses navigator.share when canShare returns true', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      canShare: vi.fn().mockReturnValue(true),
      share: mockShare,
    });

    await shareOrDownload('hello csv', 'test.csv', 'text/csv');

    expect(mockShare).toHaveBeenCalledOnce();
    const shareArg = mockShare.mock.calls[0][0];
    expect(shareArg).toHaveProperty('files');
    expect(shareArg.files[0]).toBeInstanceOf(File);
    expect(shareArg.files[0].name).toBe('test.csv');
  });

  it('falls back to anchor download when canShare returns false', async () => {
    vi.stubGlobal('navigator', {
      canShare: vi.fn().mockReturnValue(false),
    });

    await shareOrDownload('hello csv', 'test.csv', 'text/csv');

    const anchor = createdElements.find((el) => el.tagName === 'A');
    expect(anchor).toBeDefined();
    expect(anchor.download).toBe('test.csv');
    expect(anchor.href).toBe('blob:mock-url');
    expect(anchor.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('falls back to download when navigator.canShare is not defined', async () => {
    vi.stubGlobal('navigator', {});

    await shareOrDownload('data', 'out.db', 'application/x-sqlite3');

    const anchor = createdElements.find((el) => el.tagName === 'A');
    expect(anchor).toBeDefined();
    expect(anchor.download).toBe('out.db');
    expect(anchor.click).toHaveBeenCalled();
  });

  it('handles AbortError from navigator.share gracefully (no throw)', async () => {
    const abortError = new DOMException('User cancelled', 'AbortError');
    const mockShare = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('navigator', {
      canShare: vi.fn().mockReturnValue(true),
      share: mockShare,
    });

    await expect(shareOrDownload('csv', 'f.csv', 'text/csv')).resolves.toBeUndefined();
  });

  it('re-throws non-AbortError exceptions from navigator.share', async () => {
    const networkError = new Error('Network failure');
    const mockShare = vi.fn().mockRejectedValue(networkError);
    vi.stubGlobal('navigator', {
      canShare: vi.fn().mockReturnValue(true),
      share: mockShare,
    });

    await expect(shareOrDownload('csv', 'f.csv', 'text/csv')).rejects.toThrow('Network failure');
  });
});
