// scripts/examples/example-data.js
// Fixed, realistic example projects (one per preset template) used to build
// the files in examples/. Values are deterministic so rebuilt files only
// change when the export code changes.
import { PRESETS } from '../../js/templates.js';

const CREATED = '2026-06-12T12:00:00.000Z';

/**
 * Builds a v2 project record from a preset template.
 *
 * @param {'aquatic'|'organismal'} presetId - Preset to copy fields from.
 * @param {string} title - Project title.
 * @returns {import('../../js/db.js').Project} Project record as stored in IndexedDB.
 */
function project(presetId, title) {
  return {
    id: `example-${presetId}`,
    title,
    templateId: presetId,
    fields: PRESETS[presetId].fields,
    createdAt: CREATED,
    updatedAt: CREATED,
  };
}

/**
 * Builds a sample record as stored in IndexedDB.
 *
 * @param {string} projectId - Owning project id.
 * @param {{ sampleId: string, scannedAt: string, latitude: number, longitude: number,
 *   gpsAccuracy: number, photoFilename?: string|null, metadata: Record<string, string>,
 *   editLog?: Array<{ at: string, field: string, from: string, to: string }> }} data - Sample values.
 * @returns {import('../../js/db.js').Sample} Sample record.
 */
function sample(projectId, data) {
  return {
    id: `${projectId}-${data.sampleId}`,
    projectId,
    sampleId: data.sampleId,
    scannedAt: data.scannedAt,
    latitude: data.latitude,
    longitude: data.longitude,
    gpsAccuracy: data.gpsAccuracy,
    metadata: data.metadata,
    photoFilename: data.photoFilename ?? null,
    editLog: data.editLog ?? [],
    createdAt: CREATED,
    updatedAt: CREATED,
  };
}

const QAQC_AQUATIC = { qaqc_gloves_used: 'true', qaqc_gear_decon: 'true', qaqc_sample_sealed: 'true' };
const QAQC_ORGANISMAL = { qaqc_gloves_used: 'true', qaqc_tools_sterilized: 'true' };

const aquatic = project('aquatic', 'Lake Opinicon eDNA 2026');
const organismal = project('organismal', 'Opinicon Tissue Survey 2026');

/**
 * Example projects with their samples, one per preset template.
 *
 * @type {ReadonlyArray<{ slug: 'aquatic'|'organismal', project: import('../../js/db.js').Project,
 *   samples: import('../../js/db.js').Sample[] }>}
 */
export const EXAMPLES = Object.freeze([
  {
    slug: 'aquatic',
    project: aquatic,
    samples: [
      sample(aquatic.id, {
        sampleId: 'LO-001',
        scannedAt: '2026-06-12T09:14',
        latitude: 44.565312,
        longitude: -76.324701,
        gpsAccuracy: 4.8,
        photoFilename: 'LO-001_site.jpg',
        metadata: {
          samplers: 'LS, AT',
          site_name: 'Canada: Ontario, Lake Opinicon, Cow Island',
          sample_type: 'Field Sample',
          env_medium: 'Freshwater',
          collection_method: 'Peristaltic pump',
          volume_filtered_ml: '1000',
          filter: '0.22 µm Sterivex (PES)',
          preservation: 'Frozen (-20°C)',
          water_temp_c: '18.4',
          ph: '7.9',
          conductivity_us_cm: '182',
          turbidity: '2.1',
          depth_m: '0.5',
          species_observed: 'Common loon; painted turtle',
          ...QAQC_AQUATIC,
        },
        editLog: [{ at: '2026-06-12T15:40:00.000Z', field: 'ph', from: '7.6', to: '7.9' }],
      }),
      sample(aquatic.id, {
        sampleId: 'LO-002',
        scannedAt: '2026-06-12T10:02',
        latitude: 44.558904,
        longitude: -76.318260,
        gpsAccuracy: 6.2,
        photoFilename: 'LO-002_site.jpg',
        metadata: {
          samplers: 'LS, AT',
          site_name: 'Canada: Ontario, Lake Opinicon, Davis Lock',
          sample_type: 'Field Sample',
          env_medium: 'Freshwater',
          collection_method: 'Syringe filtration',
          volume_filtered_ml: '500',
          filter: '0.45 µm Cellulose Nitrate',
          preservation: 'Cold chain / Ice (4°C)',
          water_temp_c: '19.1',
          ph: '8.0',
          conductivity_us_cm: '176',
          turbidity: '3.4',
          depth_m: '1.0',
          species_observed: '',
          ...QAQC_AQUATIC,
        },
      }),
      sample(aquatic.id, {
        sampleId: 'LO-BLK-01',
        scannedAt: '2026-06-12T10:20',
        latitude: 44.558911,
        longitude: -76.318244,
        gpsAccuracy: 5.1,
        metadata: {
          samplers: 'LS, AT',
          site_name: 'Canada: Ontario, Lake Opinicon, Davis Lock',
          sample_type: 'Field Negative Control (Blank)',
          env_medium: 'Freshwater',
          collection_method: 'Peristaltic pump',
          volume_filtered_ml: '1000',
          filter: '0.22 µm Sterivex (PES)',
          preservation: 'Frozen (-20°C)',
          ...QAQC_AQUATIC,
        },
      }),
    ],
  },
  {
    slug: 'organismal',
    project: organismal,
    samples: [
      sample(organismal.id, {
        sampleId: 'OT-001',
        scannedAt: '2026-06-13T08:45',
        latitude: 44.567021,
        longitude: -76.329815,
        gpsAccuracy: 3.9,
        photoFilename: 'OT-001_site.jpg',
        metadata: {
          collectors: 'LS, AT',
          site_name: 'Canada: Ontario, Lake Opinicon, north shore',
          organism_group: 'Animalia (Vertebrate)',
          taxon_id: 'Chrysemys picta',
          host_tag_id: 'PT-0142',
          tissue: 'Mucosal/Skin swab',
          preservation: '95% Ethanol (Cryovial)',
          sample_size: '1 swab',
          life_stage: 'Adult',
          sex: 'Female',
          biometric: 'Carapace length 14.2 cm',
          health: 'Healthy/Asymptomatic',
          microhabitat: 'Basking log, littoral zone',
          ...QAQC_ORGANISMAL,
        },
        editLog: [{ at: '2026-06-13T16:05:00.000Z', field: 'sex', from: 'Indeterminate / N/A', to: 'Female' }],
      }),
      sample(organismal.id, {
        sampleId: 'OT-002',
        scannedAt: '2026-06-13T10:30',
        latitude: 44.569874,
        longitude: -76.333102,
        gpsAccuracy: 7.4,
        photoFilename: 'OT-002_site.jpg',
        metadata: {
          collectors: 'LS, AT',
          site_name: 'Canada: Ontario, Opinicon Road upland forest',
          organism_group: 'Plantae (Vascular)',
          taxon_id: 'Acer saccharum',
          tissue: 'Leaf/Needle punch',
          preservation: 'Silica desiccant (Zip-lock/Envelope)',
          sample_size: '4 punches',
          life_stage: 'Vegetative',
          sex: 'Indeterminate / N/A',
          biometric: 'DBH 38 cm',
          health: 'Healthy/Asymptomatic',
          voucher_id: 'QUBS-H-2291',
          microhabitat: 'Upland mixed forest',
          ...QAQC_ORGANISMAL,
        },
      }),
      sample(organismal.id, {
        sampleId: 'OT-003',
        scannedAt: '2026-06-13T13:12',
        latitude: 44.564480,
        longitude: -76.322957,
        gpsAccuracy: 5.6,
        metadata: {
          collectors: 'AT',
          site_name: 'Canada: Ontario, Lake Opinicon, Cow Island',
          organism_group: 'Animalia (Invertebrate)',
          taxon_id: 'Faxonius sp. (provisional)',
          tissue: 'Whole organism',
          preservation: '95% Ethanol (Cryovial)',
          sample_size: '1 individual',
          life_stage: 'Juvenile/Larva',
          sex: 'Indeterminate / N/A',
          biometric: 'Carapace length 18 mm',
          microhabitat: 'Cobble substrate, 0.3 m depth',
          ...QAQC_ORGANISMAL,
        },
      }),
    ],
  },
]);
