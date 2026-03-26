/**
 * @typedef {{ name: string, content: string }} ProjectTemplate
 */

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
