/**
 * @typedef {{ name: string, content: string }} ProjectTemplate
 */

/**
 * @typedef {Object} Preset
 * @property {'aquatic'|'organismal'} id - Stable preset id stored on projects as templateId.
 * @property {string} name - Picker label.
 * @property {string} description - One-line picker description.
 * @property {import('./field-model.js').FieldDef[]} fields - Metadata fields (locked
 *   built-ins are not listed; see BUILTIN_FIELDS).
 */

/**
 * Builds a field definition. Shorthand for the preset tables below.
 *
 * @param {string} key - Stable storage key.
 * @param {string} label - UI label (must match docs/eDNALite_Templates.md).
 * @param {import('./field-model.js').FieldType} type - Input type.
 * @param {import('./field-model.js').FieldStatus} status - Required / QA/QC / optional.
 * @param {string} dwc - Darwin Core term.
 * @param {string} mixs - MIxS v6.0 / FAIReDNA term.
 * @param {{ options?: string[], unit?: string }} [extra] - Choices or unit.
 * @returns {import('./field-model.js').FieldDef} The field definition.
 */
function f(key, label, type, status, dwc, mixs, extra = {}) {
  return { key, label, type, status, dwc, mixs, ...extra };
}

/**
 * Pre-defined metadata templates. Source of truth: docs/eDNALite_Templates.md
 * (tests/template-presets.test.js fails if these drift from the document).
 *
 * @type {Readonly<Record<'aquatic'|'organismal', Preset>>}
 */
export const PRESETS = Object.freeze({
  aquatic: {
    id: 'aquatic',
    name: 'Aquatic eDNA',
    description: 'Water and sediment eDNA (FAIReDNA / MIxS / Darwin Core)',
    fields: [
      f('samplers', 'Sampler(s)', 'text', 'required', 'recordedBy', 'samp_collect_by'),
      f('site_name', 'Site / Location Name', 'text', 'required', 'locality / locationID', 'geo_loc_name'),
      f('sample_type', 'Sample Type', 'choice', 'required', 'basisOfRecord (MaterialSample)', 'samp_type / neg_cont_type',
        { options: ['Field Sample', 'Field Negative Control (Blank)', 'Equipment Blank'] }),
      f('env_medium', 'Environmental Medium', 'choice', 'required', 'habitat', 'env_medium / env_local_scale',
        { options: ['Freshwater', 'Marine water', 'Estuarine', 'Sediment', 'Soil', 'Biofilm'] }),
      f('collection_method', 'Collection Method', 'choice', 'required', 'samplingProtocol', 'samp_collect_device',
        { options: ['Peristaltic pump', 'Syringe filtration', 'Surface grab', 'Passive sampler', 'Sediment core'] }),
      f('volume_filtered_ml', 'Volume Filtered (mL)', 'number', 'required', 'sampleSizeValue (sampleSizeUnit = mL)', 'samp_vol_we_dna_ext',
        { unit: 'mL' }),
      f('filter', 'Filter Material & Pore Size', 'choice', 'required', 'samplingProtocol', 'size_frac / filter_material',
        { options: ['0.22 µm Sterivex (PES)', '0.45 µm Cellulose Nitrate', '0.8 µm MCE', '1.2 µm Glass Fiber', 'Other'] }),
      f('preservation', 'Preservation Method', 'choice', 'required', 'preparations', 'samp_store_sol',
        { options: ['Cold chain / Ice (4°C)', 'Frozen (-20°C)', '95% Ethanol', "Longmire's buffer", 'ATL buffer', 'Silica desiccant'] }),
      f('water_temp_c', 'Water Temperature (°C)', 'number', 'optional', 'dynamicProperties', 'temp', { unit: '°C' }),
      f('ph', 'pH', 'number', 'optional', 'dynamicProperties', 'ph'),
      f('conductivity_us_cm', 'Conductivity (µS/cm)', 'number', 'optional', 'dynamicProperties', 'conduc', { unit: 'µS/cm' }),
      f('turbidity', 'Turbidity (NTU) / Secchi (m)', 'number', 'optional', 'dynamicProperties', 'turbidity'),
      f('depth_m', 'Sampling Depth (m)', 'number', 'optional', 'minimumDepthInMeters', 'depth', { unit: 'm' }),
      f('species_observed', 'Visual Species Observed', 'text', 'optional', 'associatedTaxa / eventRemarks', 'misc_param'),
      f('qaqc_gloves_used', 'QA/QC: Sterile Gloves Worn?', 'checkbox', 'qaqc', 'dynamicProperties', 'custom:qaqc_gloves_used'),
      f('qaqc_gear_decon', 'QA/QC: Gear Decontaminated?', 'checkbox', 'qaqc', 'dynamicProperties', 'custom:qaqc_gear_decon'),
      f('qaqc_sample_sealed', 'QA/QC: Sample Sealed & Shaded?', 'checkbox', 'qaqc', 'dynamicProperties', 'custom:qaqc_sample_sealed'),
    ],
  },
  organismal: {
    id: 'organismal',
    name: 'Organismal / Tissue',
    description: 'Animal and plant tissue or voucher samples (Darwin Core / MIxS host)',
    fields: [
      f('collectors', 'Collector(s)', 'text', 'required', 'recordedBy', 'samp_collect_by'),
      f('site_name', 'Site / Locality Name', 'text', 'required', 'locality / locationID', 'geo_loc_name'),
      f('organism_group', 'Organism Group', 'choice', 'required', 'kingdom / taxonRank', 'env_broad_scale',
        { options: ['Animalia (Vertebrate)', 'Animalia (Invertebrate)', 'Plantae (Vascular)', 'Plantae (Bryophyte/Algae)', 'Fungi/Lichen'] }),
      f('taxon_id', 'Taxon / Provisional ID', 'text', 'required', 'scientificName / verbatimIdentification', 'host_sci_name'),
      f('host_tag_id', 'Individual / Host Tag ID', 'text', 'optional', 'organismID', 'host_subject_id'),
      f('tissue', 'Tissue / Sample Material', 'choice', 'required', 'preparations', 'samp_mat_type / host_body_product',
        { options: ['Leaf/Needle punch', 'Root/Rhizosphere', 'Bark/Cambium', 'Seed/Fruit', 'Mucosal/Skin swab', 'Fin/Toe/Ear clip', 'Blood', 'Feather/Hair', 'Fecal/Scat', 'Whole organism'] }),
      f('preservation', 'Preservation & Container', 'choice', 'required', 'preparations', 'samp_store_sol',
        { options: ['95% Ethanol (Cryovial)', 'RNAlater (Cryovial)', 'Silica desiccant (Zip-lock/Envelope)', 'Liquid N2 / Flash frozen', 'FTA Card', 'Pressed voucher'] }),
      f('sample_size', 'Sample Size / Quantity', 'text', 'optional', 'sampleSizeValue', 'samp_size'),
      f('life_stage', 'Life Stage / Phenology', 'choice', 'optional', 'lifeStage / reproductiveCondition', 'host_life_stage',
        { options: ['Adult', 'Juvenile/Larva', 'Seedling/Sapling', 'Vegetative', 'Flowering', 'Fruiting', 'Senescent/Dormant'] }),
      f('sex', 'Sex', 'choice', 'optional', 'sex', 'host_sex',
        { options: ['Female', 'Male', 'Hermaphrodite', 'Monoecious', 'Dioecious', 'Indeterminate / N/A'] }),
      f('biometric', 'Biometric Measurement', 'text', 'optional', 'dynamicProperties', 'host_length / host_tot_mass'),
      f('health', 'Health / Condition State', 'choice', 'optional', 'occurrenceRemarks', 'host_disease_stat',
        { options: ['Healthy/Asymptomatic', 'Lesions/Disease visible', 'Parasitized', 'Herbivory/Mechanical damage', 'Dead/Salvage'] }),
      f('voucher_id', 'Voucher ID / Catalog Link', 'text', 'optional', 'otherCatalogNumbers', 'source_mat_id'),
      f('microhabitat', 'Microhabitat / Substrate', 'text', 'optional', 'habitat', 'env_medium'),
      f('qaqc_gloves_used', 'QA/QC: Fresh Gloves Worn?', 'checkbox', 'qaqc', 'dynamicProperties', 'custom:qaqc_gloves_used'),
      f('qaqc_tools_sterilized', 'QA/QC: Tools Sterilized?', 'checkbox', 'qaqc', 'dynamicProperties', 'custom:qaqc_tools_sterilized'),
    ],
  },
});

/**
 * Pre-defined project templates for one-tap creation.
 * Each template has a name and a pre-serialized content string
 * ready to pass directly to createProject().
 *
 * @type {ProjectTemplate[]}
 */
export const TEMPLATES = [
  {
    name: 'Sample Project',
    content: [
      'Sample Project',
      'Samplers',
      'pH',
      'Conductivity',
      'Water Temperature',
      'Turbidity',
      'Site depth',
      'Filtration Volume',
      'Site Description',
      '[checkbox]Sample Collected Before Measurements?',
      '[checkbox]Field Blank Used?',
      '[checkbox]Filtration Blank Used?',
      '[checkbox]Waders Bleached?',
      '[checkbox]Fresh Gloves Used?',
    ].join('\n'),
  },
];
