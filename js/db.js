import { openDB } from 'idb';
import { diffSample } from './edit-log.js';

/**
 * A project record. v1 records carry `content`; v2 records carry `title`,
 * `templateId`, and `fields`. Read either through projectSchema() in field-model.js.
 *
 * @typedef {{ id: string, content?: string, title?: string, templateId?: string|null, fields?: import('./field-model.js').FieldDef[], createdAt: string, updatedAt: string }} Project
 */

/**
 * @typedef {Object} Sample
 * @property {string} id
 * @property {string} projectId
 * @property {string} sampleId
 * @property {string} scannedAt
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {number|null} gpsAccuracy
 * @property {Record<string, string>} metadata
 * @property {string|null} photoFilename - Filename of the site photo saved to the device, or null.
 * @property {import('./edit-log.js').EditLogEntry[]} [editLog] - Append-only history of edits.
 *   Missing on samples saved before edit logs existed; treated as [].
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @typedef {{ title: string, fields: Array<{ name: string, type: 'text' | 'checkbox' }> }} ParsedProject */

const DB_NAME = 'edna-logger';
const DB_VERSION = 1;

/**
 * Opens (or creates) the IndexedDB database, running schema migrations as needed.
 *
 * @param {string} [name=DB_NAME] - Database name. Override in tests to ensure isolation.
 * @returns {Promise<import('idb').IDBPDatabase>} The opened database instance.
 */
export async function initDB(name = DB_NAME) {
  return openDB(name, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('samples')) {
        const sampleStore = db.createObjectStore('samples', { keyPath: 'id' });
        sampleStore.createIndex('projectId', 'projectId', { unique: false });
      }
    },
  });
}

/**
 * Parses a project content string into a structured object.
 *
 * The content format is a newline-delimited string where the first non-empty
 * line is the title and subsequent non-empty lines are metadata field names.
 *
 * @param {string} content - Raw content string from the projects store.
 * @returns {ParsedProject} Parsed title and fields array, both trimmed of whitespace.
 */
export function parseProject(content) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return { title: '', fields: [] };
  }

  const [title, ...rawFields] = lines;
  const fields = rawFields.map(line => {
    if (line.startsWith('[checkbox]')) {
      return { name: line.slice('[checkbox]'.length), type: 'checkbox' };
    }
    return { name: line, type: 'text' };
  });
  return { title, fields };
}

/**
 * Creates a new project record and persists it to the database.
 *
 * @param {string} content - Newline-delimited project content (title + fields).
 * @param {import('idb').IDBPDatabase} [db] - Open database instance. If omitted, opens a new connection.
 * @returns {Promise<Project>} The newly created project record.
 */
export async function createProject(content, db) {
  const conn = db ?? await initDB();
  const now = new Date().toISOString();
  const project = {
    id: crypto.randomUUID(),
    content,
    createdAt: now,
    updatedAt: now,
  };
  await conn.put('projects', project);
  return project;
}

/**
 * Creates a project stored in the v2 schema format (title + field definitions).
 *
 * @param {{ title: string, templateId: string|null, fields: import('./field-model.js').FieldDef[] }} schema - Project schema.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Project>} The new project record.
 * @example
 * await createProjectFromSchema({ title: 'Lake', templateId: 'aquatic', fields: PRESETS.aquatic.fields });
 */
export async function createProjectFromSchema(schema, db) {
  const conn = db ?? await initDB();
  const now = new Date().toISOString();
  const project = {
    id: crypto.randomUUID(),
    title: schema.title,
    templateId: schema.templateId,
    fields: schema.fields,
    createdAt: now,
    updatedAt: now,
  };
  await conn.put('projects', project);
  return project;
}

/**
 * Replaces a project's title and field definitions, writing the v2 format.
 *
 * @param {string} id - The project UUID.
 * @param {{ title: string, templateId: string|null, fields: import('./field-model.js').FieldDef[] }} schema - New schema.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Project>} The updated project record.
 * @throws {Error} If no project exists with the given id.
 * @remarks Converts v1 projects in place: the legacy content string is
 * dropped. Field keys are kept by the caller, so samples stay attached and a
 * label change never moves or loses stored values.
 */
export async function updateProjectSchema(id, schema, db) {
  const conn = db ?? await initDB();
  const existing = await conn.get('projects', id);
  if (!existing) {
    throw new Error(`Project not found: ${id}`);
  }
  const { content: _legacy, ...rest } = existing;
  const updated = {
    ...rest,
    title: schema.title,
    templateId: schema.templateId,
    fields: schema.fields,
    updatedAt: new Date().toISOString(),
  };
  await conn.put('projects', updated);
  return updated;
}

/**
 * Retrieves all projects from the database, sorted by updatedAt descending.
 *
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Project[]>} All project records, newest first.
 */
export async function getAllProjects(db) {
  const conn = db ?? await initDB();
  const all = await conn.getAll('projects');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Retrieves a single project by its ID.
 *
 * @param {string} id - The project UUID.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Project|undefined>} The project, or undefined if not found.
 */
export async function getProject(id, db) {
  const conn = db ?? await initDB();
  return conn.get('projects', id);
}

/**
 * Updates a v1 project's content string and refreshes its updatedAt timestamp.
 *
 * @param {string} id - The project UUID to update.
 * @param {string} content - New content string.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Project>} The updated project record.
 * @throws {Error} If no project exists with the given id.
 * @remarks createdAt is immutable. The project form saves through
 * updateProjectSchema, which keeps field keys stable across renames.
 */
export async function updateProject(id, content, db) {
  const conn = db ?? await initDB();
  const existing = await conn.get('projects', id);
  if (!existing) {
    throw new Error(`Project not found: ${id}`);
  }
  const updated = {
    ...existing,
    content,
    updatedAt: new Date().toISOString(),
  };
  await conn.put('projects', updated);
  return updated;
}

/**
 * Deletes a project and all of its associated samples in a single transaction.
 *
 * @param {string} id - The project UUID to delete.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<void>}
 * @throws {Error} If no project exists with the given id.
 * @remarks The existence check occurs outside the transaction, so there is a
 * theoretical TOCTOU window between the get and the delete. This is acceptable
 * for a single-user offline PWA where concurrent writes cannot occur.
 */
export async function deleteProject(id, db) {
  const conn = db ?? await initDB();
  const existing = await conn.get('projects', id);
  if (!existing) {
    throw new Error(`Project not found: ${id}`);
  }
  const tx = conn.transaction(['projects', 'samples'], 'readwrite');
  const projectStore = tx.objectStore('projects');
  const sampleStore = tx.objectStore('samples');
  const sampleIndex = sampleStore.index('projectId');

  const sampleKeys = await sampleIndex.getAllKeys(id);
  const deleteOps = [
    projectStore.delete(id),
    ...sampleKeys.map(key => sampleStore.delete(key)),
  ];
  await Promise.all(deleteOps);
  await tx.done;
}

/**
 * Creates a new sample record and persists it to the database.
 *
 * @param {string} projectId - UUID of the parent project.
 * @param {{ sampleId: string, scannedAt: string, latitude: number|null, longitude: number|null, gpsAccuracy: number|null, metadata: Record<string, string>, photoFilename?: string|null }} sampleData - Sample data payload. photoFilename defaults to null when omitted.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Sample>} The newly created sample record.
 */
export async function createSample(projectId, sampleData, db) {
  const conn = db ?? await initDB();
  const now = new Date().toISOString();
  const sample = {
    id: crypto.randomUUID(),
    projectId,
    sampleId: sampleData.sampleId,
    scannedAt: sampleData.scannedAt,
    latitude: sampleData.latitude ?? null,
    longitude: sampleData.longitude ?? null,
    gpsAccuracy: sampleData.gpsAccuracy ?? null,
    metadata: sampleData.metadata ?? {},
    photoFilename: sampleData.photoFilename ?? null,
    editLog: [],
    createdAt: now,
    updatedAt: now,
  };
  await conn.put('samples', sample);
  return sample;
}

/**
 * Retrieves all samples belonging to a project, sorted by scannedAt descending.
 *
 * @param {string} projectId - UUID of the parent project.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Sample[]>} All samples for the project, newest first.
 */
export async function getSamplesByProject(projectId, db) {
  const conn = db ?? await initDB();
  const all = await conn.getAllFromIndex('samples', 'projectId', projectId);
  return all.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
}

/**
 * Retrieves a single sample by its UUID.
 *
 * @param {string} id - The sample UUID.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Sample|undefined>} The sample, or undefined if not found.
 */
export async function getSample(id, db) {
  const conn = db ?? await initDB();
  return conn.get('samples', id);
}

/**
 * Merges updates into an existing sample record and refreshes updatedAt.
 *
 * @param {string} id - The sample UUID to update.
 * @param {Partial<Sample>} updates - Fields to merge into the existing record.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Sample>} The updated sample record.
 * @throws {Error} If no sample exists with the given id.
 * @remarks Every changed value is appended to editLog (old and new value), so
 * edits never destroy the original entry. Metadata is merged key by key, so
 * values stored under keys absent from the update (for example a renamed
 * field) are kept.
 */
export async function updateSample(id, updates, db) {
  const conn = db ?? await initDB();
  const existing = await conn.get('samples', id);
  if (!existing) {
    throw new Error(`Sample not found: ${id}`);
  }
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...updates,
    metadata: { ...(existing.metadata ?? {}), ...(updates.metadata ?? {}) },
    editLog: [...(existing.editLog ?? []), ...diffSample(existing, updates, now)],
    id: existing.id,
    projectId: existing.projectId,
    updatedAt: now,
  };
  await conn.put('samples', updated);
  return updated;
}

/**
 * Deletes a single sample by its UUID.
 *
 * @param {string} id - The sample UUID to delete.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<void>}
 * @throws {Error} If no sample exists with the given id.
 */
export async function deleteSample(id, db) {
  const conn = db ?? await initDB();
  const existing = await conn.get('samples', id);
  if (!existing) {
    throw new Error(`Sample not found: ${id}`);
  }
  await conn.delete('samples', id);
}

/**
 * Finds a sample within a project by its QR-code-derived sampleId string.
 *
 * Used for duplicate detection when scanning QR codes.
 *
 * @param {string} projectId - UUID of the parent project.
 * @param {string} sampleId - The sampleId string to search for.
 * @param {import('idb').IDBPDatabase} [db] - Open database instance.
 * @returns {Promise<Sample|undefined>} The matching sample, or undefined if not found.
 */
export async function getSampleBySampleId(projectId, sampleId, db) {
  const conn = db ?? await initDB();
  const samples = await conn.getAllFromIndex('samples', 'projectId', projectId);
  return samples.find(s => s.sampleId === sampleId);
}
