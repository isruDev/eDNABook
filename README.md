# eDNALite

Offline-first Progressive Web App for field technicians to log environmental DNA (eDNA) sample metadata. Set up projects with custom metadata fields, scan sample QR codes in the field, auto-capture GPS coordinates, and export FAIR-compliant datasets as CSV or SQLite.

Live app: https://isrudev.github.io/eDNABook/

## Why eDNALite

Field eDNA collection traditionally relies on paper datasheets, phone photos of labels, and manual transcription once you are back at the bench. Errors compound at every step. eDNALite runs entirely in your browser, works offline, and produces exports with Darwin Core column headers that are ready to load into GBIF, NCBI, or any bioinformatics pipeline that speaks standard metadata terms.

## Tutorial: Making Your Field Data FAIR with eDNALite

While eDNALite allows for infinite metadata customization, ensuring your data is FAIR (Findable, Accessible, Interoperable, and Reusable) requires your exported column headers to match established global standards.

This guide demonstrates how to configure your eDNALite project to align with **Darwin Core (DwC)** and **MIxS-eDNA** standards for seamless database integration.

### Step 1: The Auto-Generated DwC Fields

You do not need to manually create fields for temporal or spatial data. To reduce transcription errors, eDNALite automatically generates the following Darwin Core standard fields for every scan:

- **`eventID`** — Captured instantly when you scan the physical QR code.
- **`eventDate`** — Generated via the device's standardized ISO 8601 timestamp.
- **`decimalLatitude`** and **`decimalLongitude`** — Polled automatically from your device's native GPS API.

### Step 2: Configuring Custom Metadata Fields

When setting up a new project using the **Add Field** module, we highly recommend using exact MIxS-eDNA or Darwin Core term names for your text and numeric inputs. This ensures your final CSV export requires zero manual column renaming before upload.

Here is a baseline template mapping common environmental metadata to global standards:

| Metadata Type     | Description                                                   | MIxS Header                 | DwC Header         | Example Input      |
| :---------------- | :------------------------------------------------------------ | :-------------------------- | :----------------- | :----------------- |
| **Identifier**    | A unique identifier for the specific sampling event.          | -                           | `eventID`          | `VV-2026-001`      |
| **Temporal**      | Date and time of the event, formatted to ISO 8601.            | -                           | `eventDate`        | `2026-03-30T10:50:00Z` |
| **Spatial**       | Geographic latitude in decimal degrees.                       | -                           | `decimalLatitude`  | `44.255983`        |
| **Spatial**       | Geographic longitude in decimal degrees.                      | -                           | `decimalLongitude` | `-76.571709`       |
| **Environmental** | The localized name of the water body sampled.                 | `geo_loc_name`              | `waterBody`        | `Bay of Quinte`    |
| **Environmental** | The physical material that was sampled or displaced.          | `env_medium`                | -                  | `water`, `sediment` |
| **Environmental** | The major environmental system the sample came from.          | `env_broad_scale`           | -                  | `lake biome`       |
| **Methodology**   | The numeric volume or weight of the sample processed.         | `samp_vol_we_dna_ext`       | -                  | `500`              |
| **Methodology**   | The unit of measurement for the volume or weight.             | `samp_vol_we_dna_ext_unit`  | -                  | `mL`, `g`          |
| **Methodology**   | The pore size of the filter used (typically in micrometers).  | `filter_pore_size`          | -                  | `0.45`             |
| **Spatial**       | The depth at which the sample was collected (in meters).      | `depth`                     | -                  | `2.5`              |

### Step 3: Enforcing Sample Integrity (QA/QC)

Contamination tracking is critical for robust eDNA methodology. Use eDNALite's **Checkbox** feature to hardcode physical field protocols.

Example QA/QC checkboxes:

- `Gloves Changed?`
- `Equipment Bleached/Decontaminated?`

### Step 4: Export and Integration

When you return from the field, tap **Export Data** on a project dashboard and choose CSV or SQLite.

Because you used standard terminology in Step 2, the resulting flat file will feature column headers that are instantly readable by bioinformatics pipelines and repositories like GBIF or NCBI. The app effectively bridges the gap between a nimble field workflow and rigorous, centralized data standards.

## Installation

eDNALite is a Progressive Web App — there is nothing to install from an app store. Visit the [live app](https://isrudev.github.io/eDNABook/), then use your browser's **Add to Home Screen** option:

- **iOS (Safari):** Tap the Share icon, then *Add to Home Screen*.
- **Android (Chrome):** Tap the menu, then *Install app* or *Add to Home Screen*.

Once added, the app works fully offline after the first load. In-app, the **More → Offline Access** menu contains platform-specific install guidance.

## Development

eDNALite is built as static files with **no build step** — vanilla JavaScript, HTML, and CSS served directly by any HTTPS-capable static host.

```bash
# Clone the repo
git clone https://github.com/isruDev/eDNABook.git
cd eDNABook

# Serve locally (any static file server works)
python -m http.server 8080

# Run the unit test suite
npx vitest run

# Run the end-to-end suite (requires the server above)
npx playwright test
```

Open `http://localhost:8080` in a modern browser. The service worker and camera APIs require a secure origin, so localhost or an HTTPS deployment is required.

### Tech stack

- Vanilla JavaScript ES modules (no bundler, no transpiler)
- IndexedDB via [`idb`](https://github.com/jakearchibald/idb) for local storage
- [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) for in-browser QR scanning
- [`sql.js`](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly) for SQLite export
- [`papaparse`](https://www.papaparse.com/) for CSV generation
- Service Worker with a cache-first precache strategy for offline support
- Vitest + Playwright for testing

### Repository layout

```
index.html          SPA shell and view containers
js/app.js           Hash-based router, service worker registration
js/db.js            IndexedDB CRUD (projects + samples)
js/export.js        CSV and SQLite export with Darwin Core column headers
js/views/           View render functions (home, project form, dashboard, ...)
css/style.css       All styles, dark-mode tokens, animations
sw.js               Service worker (versioned precache)
lib/                Vendored third-party libraries
tests/              Vitest unit and integration tests
e2e/                Playwright end-to-end specs
```

## Citation

If you use eDNALite in published research, please cite the archived release. A DOI will be minted via Zenodo on the first public release and added here.

```
[Zenodo DOI pending first release]
```

## Support

Bug reports, feature requests, and questions go in the [GitHub issue tracker](https://github.com/isruDev/eDNABook/issues).

## License

Released under the MIT License — see [LICENSE](./LICENSE) for the full text.

## Contributing

Pull requests are welcome. Please open an issue before starting non-trivial work so we can align on scope.
