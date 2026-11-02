# Example exports

Exports from two example projects, one per built-in template, made with the app's own export code.

| Template | CSV | SQLite | Template file |
| --- | --- | --- | --- |
| Aquatic eDNA | [aquatic.csv](aquatic.csv) | [aquatic.db](aquatic.db) | [aquatic_template.json](aquatic_template.json) |
| Organismal / Tissue | [organismal.csv](organismal.csv) | [organismal.db](organismal.db) | [organismal_template.json](organismal_template.json) |

Each project has 3 samples. The aquatic example includes a field negative control (blank). One sample in each project was corrected after collection, so the `edit_log` column shows an entry.

The template files can be loaded in the app with **More → Import Template**.

The sample values are illustrative, not real survey data. To rebuild these files after an export change, run `npm run examples`. The test suite fails until the files match the current export code.
