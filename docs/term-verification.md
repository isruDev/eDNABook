# Term verification: docs/eDNALite_Templates.md

Method: DwC checked against tdwg/dwc term_versions.csv (every term, current status "recommended") and the dwc.tdwg.org quick reference. MIxS checked by slot name in mixs.yaml (v6.2.0, v6.3.1, v7.0.1) and by checklist-class membership in v6.3.1. FAIRe checked against schema.yaml of FAIR-eDNA/FAIRe_checklist. Dates are as reported by the sources on 2026-11-02.

Source keys used below:
- DWC = https://github.com/tdwg/dwc/blob/master/vocabulary/term_versions.csv and https://dwc.tdwg.org/terms/
- MIXS = https://github.com/GenomicsStandardsConsortium/mixs/blob/v6.3.1/src/mixs/schema/mixs.yaml (same slot results in v7.0.1 and, for the slots tested, v6.2.0)
- FAIRE = https://github.com/FAIR-eDNA/FAIRe_checklist/blob/main/schema.yaml

All DwC terms below are in namespace dwc: (no dcterms: terms are used in the docs). All 32 distinct DwC terms in the doc exist. Verdict "valid" means exists and definition fits the row.

### Table A: Aquatic eDNA

| UI Label | Doc DwC term | DwC verdict | Doc MIxS term | MIxS verdict (FAIRe note) | Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Sample ID | materialSampleID | valid (dwc:materialSampleID, id of the MaterialSample) | samp_name | valid slot (Water, MIMARKS-S) ; FAIRe has samp_name | DWC, MIXS, FAIRE |
| Sample ID | eventID | exists, MISUSED: identifies an Event (the sampling occurrence), not a sample; drop it | - | - | DWC |
| Collection Date & Time | eventDate | valid (dwc:eventDate, ISO 8601) | collection_date | valid slot ; FAIRe has eventDate, not collection_date | DWC, MIXS, FAIRE |
| Latitude | decimalLatitude | valid | decimalLatitude (lat_lon) | NOT MIxS. Correct slot is lat_lon (combined, decimal degrees, "lat lon" order). FAIRe DOES have decimalLatitude, so cite it as FAIReDNA/DwC, not MIxS | DWC, MIXS, FAIRE |
| Longitude | decimalLongitude | valid | decimalLongitude (lat_lon) | NOT MIxS, same as above; FAIRe has decimalLongitude | DWC, MIXS, FAIRE |
| GPS Accuracy (m) | coordinateUncertaintyInMeters | valid (def: radius of smallest circle containing the Location; zero is invalid; not strictly "GPS accuracy" but standard use) | coord_uncert | NOT FOUND in MIxS 6.2.0/6.3.1/7.0.1; no uncertainty slot exists. Not in FAIRe either. Mark "DwC only" | DWC, MIXS, FAIRE |
| Geodetic Datum | geodeticDatum | valid | geodeticDatum | NOT MIxS (DwC term). Not in FAIRe (FAIRe only has dwc:verbatimSRS for verbatim coords). Mark "DwC only" | DWC, MIXS, FAIRE |
| Sampler(s) | recordedBy | valid | samp_collect_by | NOT FOUND in MIxS (no collector slot in 6.2.0/6.3.1/7.0.1). FAIRe has recordedBy but defines it as people responsible for the dataset (Project subset), not per-sample collector | DWC, MIXS, FAIRE |
| Site / Location Name | locality | valid | geo_loc_name | valid slot (format "country:region, place") ; FAIRe has geo_loc_name, not locality | DWC, MIXS, FAIRE |
| Site / Location Name | locationID | exists, weak fit: it is an identifier, row holds a name; drop or use only for a coded site ID | - | - | DWC |
| Sample Type | basisOfRecord (MaterialSample) | MISUSED. Term and value MaterialSample are valid, but basisOfRecord is the record type (constant per record); it cannot encode Field Sample / Blank / Equipment Blank | samp_type | exists as slot but only in hydrocarbon/food packages, not Water or MIMARKS-S; def is "type of material sampled": MISUSED. Better: FAIRe samp_category (enum: sample, negative control, positive control) | DWC, MIXS, FAIRE |
| Sample Type | - | - | neg_cont_type | valid slot (MIMARKS-S; "substance or equipment used as negative control"); FAIRe has neg_cont_type. Fits Equipment Blank / Field Blank | MIXS, FAIRE |
| Environmental Medium | habitat | valid (category or description of habitat) | env_medium | valid slot (MIMARKS-S; ENVO term expected) | DWC, MIXS |
| Environmental Medium | - | - | env_local_scale | valid slot, WRONG semantics for this row: it is the local environmental context (e.g. lake, stream), a different field from medium. FAIRe has env_local_scale, env_medium | MIXS, FAIRE |
| Collection Method | samplingProtocol | valid | samp_collect_device | valid slot (MIMARKS-S); FAIRe has it. Also exists: samp_collect_method | DWC, MIXS, FAIRE |
| Volume Filtered (mL) | sampleSizeValue (+ sampleSizeUnit) | valid, both exist | samp_vol_we_dna_ext | valid slot (Water, Host, Plant, MIMARKS-S). Def: volume/mass of sample processed for DNA extraction, which fits filtered volume. FAIRe has it plus samp_vol_we_dna_ext_unit | DWC, MIXS, FAIRE |
| Filter Material & Pore Size | samplingProtocol | valid (loose fit; free text protocol) | size_frac | valid slot (MIMARKS-S; pore size) ; FAIRe has size_frac | DWC, MIXS, FAIRE |
| Filter Material & Pore Size | - | - | filter_material | NOT MIxS (MIxS has filter_type). IS in FAIRe (source column says NMDC), so valid as FAIReDNA only | MIXS, FAIRE |
| Preservation Method | preparations | valid (def: preparations and preservation methods) | samp_store_sol | valid slot (MIXS:0001317; in SymbiontAssociated, not Water/MIMARKS-S); FAIRe has it. Cold/frozen values fit FAIRe samp_store_temp better than a "solution" | DWC, MIXS, FAIRE |
| Water Temperature (C) | dynamicProperties | valid (catch-all key:value) | temp | valid slot (Water, Host, Plant, MIMARKS-S); FAIRe has temp | DWC, MIXS, FAIRE |
| pH | dynamicProperties | valid | ph | valid slot (Water); FAIRe has ph | DWC, MIXS, FAIRE |
| Conductivity | dynamicProperties | valid | conduc | valid slot (Water). Not in FAIRe | DWC, MIXS, FAIRE |
| Turbidity / Secchi | dynamicProperties | valid | turbidity | valid slot (Water); FAIRe has turbidity. No MIxS Secchi slot found (0 matches for "secchi"), so Secchi has no MIxS home | DWC, MIXS, FAIRE |
| Sampling Depth (m) | minimumDepthInMeters | valid | depth | valid slot (Water, Host, Plant, MIMARKS-S). FAIRe has minimumDepthInMeters, not depth | DWC, MIXS, FAIRE |
| Visual Species Observed | associatedTaxa | valid (taxa associated with an Occurrence; loose fit) | misc_param | exists, WRONG semantics: "other measurement or parameter", not an observation. Treat as custom | DWC, MIXS |
| Visual Species Observed | eventRemarks | valid | - | - | DWC |
| Site Photo | associatedMedia | valid (list of ac:Media resources) | associated_media | NOT FOUND in MIxS (nearest: associated_resource, which is for publications/data links, not media). Mark custom | DWC, MIXS |
| QA/QC (3 rows) | dynamicProperties | valid | custom:qaqc_gloves_used / qaqc_gear_decon / qaqc_sample_sealed | custom (not in MIxS) | - |

### Table B: Organismal / tissue

Rows identical to Table A (Sample ID materialSampleID, Collection Date, Latitude, Longitude, GPS Accuracy, Geodetic Datum, Collector(s), Site/Locality, Sample Photo, QA/QC gloves) carry the same verdicts. occurrenceID is the only new DwC term in the Sample ID row.

| UI Label | Doc DwC term | DwC verdict | Doc MIxS term | MIxS verdict (FAIRe note) | Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Sample ID | occurrenceID | valid, but identifies the occurrence record, not the physical sample | samp_name | valid (see Table A) | DWC, MIXS |
| Organism Group | kingdom | valid (full scientific name of kingdom); FAIRe has kingdom | env_broad_scale | MISUSED. Slot exists (MIMARKS-S) but is the biome (ENVO), not taxon group. No MIxS slot for organism group; use custom or drop | DWC, MIXS, FAIRE |
| Organism Group | taxonRank | MISUSED: rank of the name in scientificName (e.g. species), not a group. Drop | - | - | DWC |
| Taxon / Provisional ID | scientificName | valid | host_sci_name | NOT FOUND. Correct MIxS slot is specific_host ("host scientific name"), but it is only in MIGS/Agriculture/MIUViG classes, not Host/Plant-associated. FAIRe has scientificName and host_species | DWC, MIXS, FAIRE |
| Taxon / Provisional ID | verbatimIdentification | valid | - | - | DWC |
| Individual / Host Tag ID | organismID | valid | host_subject_id | valid slot (HostAssociated only, not PlantAssociated). Not in FAIRe | DWC, MIXS, FAIRE |
| Tissue / Sample Material | preparations | exists, weak fit: def is preparations/preservation methods. Better: materialEntityType (exists in DwC term list, issued 2026-10-13) | samp_mat_type | NOT FOUND. Closest: host_body_site (valid, HostAssociated) or host_body_product (valid, HostAssociated; def "substance produced by the body e.g. stool, mucus", fits only fecal/mucosal/blood rows). samp_mat_process is processing, not material | DWC, MIXS |
| Preservation & Container | preparations | valid | samp_store_sol | valid (see Table A) | DWC, MIXS |
| Sample Size / Quantity | sampleSizeValue | exists, partial fit: def lists time, length, area, volume (not mass) | samp_size | valid slot (MIMARKS-S; "volume (ml), mass (g) or area (m2)"); FAIRe has samp_size + samp_size_unit | DWC, MIXS, FAIRE |
| Life Stage / Phenology | lifeStage | valid | host_life_stage | valid slot (Host, Plant); FAIRe has host_life_stage | DWC, MIXS, FAIRE |
| Life Stage / Phenology | reproductiveCondition | valid | - | - | DWC |
| Sex | sex | valid | host_sex | valid slot (HostAssociated). Not in FAIRe | DWC, MIXS, FAIRE |
| Biometric Measurement | dynamicProperties | valid | host_length / host_tot_mass | both valid (Host: both; Plant: both); FAIRe has both with *_unit. Plant height/DBH: host_height exists (valid) | DWC, MIXS, FAIRE |
| Health / Condition State | occurrenceRemarks | valid (free text) | host_disease_stat | valid slot (Host, Plant) | DWC, MIXS |
| Voucher ID / Catalog Link | otherCatalogNumbers | valid (alternate identifiers for same MaterialEntity; loose fit for a voucher link) | source_mat_id | valid slot (MIMARKS-S; def cites dwc:materialSampleID) | DWC, MIXS |
| Microhabitat / Substrate | habitat | valid | env_medium | valid | DWC, MIXS |
| Tools Sterilized | dynamicProperties | valid | custom:qaqc_tools_sterilized | custom (not in MIxS) | - |

### Versions verified

- Darwin Core: latest ratified release tag 2023-07-10 (https://github.com/tdwg/dwc/releases). Term list used is master of tdwg/dwc vocabulary/term_versions.csv; repo last commit 2026-10-20 and many terms carry 2026 issued dates (e.g. preparations 2026-05-26, samplingProtocol 2026-10-13). So cite "Darwin Core term list, tdwg/dwc master, accessed 2026-11-02" or the 2023-07-10 release; term NAMES are unchanged either way (all 32 present).
- MIxS: doc header says v6.0. Latest is v7.0.1 (2026-08-01); v7.0.0 2026-07-29; v6.3.1 2026-07-14; v6.3.0 2026-02-06; v6.2.0 2023-10-18; mixs6.0.0 2022-03-24 (https://github.com/GenomicsStandardsConsortium/mixs/releases). I checked v6.3.1 and v7.0.1 (identical results for all slots), and v6.2.0 for collector/filter/specific_host. v6.0.0 schema file not retrievable at the same path: unconfirmed for exactly v6.0.0. Recommend citing "MIxS v6.3.1" or "v7.0.1" instead of v6.0.
- FAIRe: Takahashi et al. 2025, Environmental DNA 7(3):e70100, doi 10.1002/edn3.70100, published 2025-06-06 (https://pubs.usgs.gov/publication/70265826). Checklist repo CHANGELOG top entry v1.0.3 (2025-07-31, workflow-only change, terms verbatim from v1.0.2); latest GitHub release tag is "FAIRe checklist v1.0.2". Repo main last commit 2026-10-06. Doc says "FAIReDNA": the project name is "FAIRe" (FAIR-eDNA GitHub org); fix the label.

### Suggested corrections

- Latitude/Longitude: replace MIxS cell with `lat_lon` (one field, "lat lon" decimal degrees); keep decimalLatitude/decimalLongitude under DwC and FAIRe only.
- Geodetic Datum: MIxS cell -> "n/a (DwC only)"; Coordinate uncertainty: `coord_uncert` does not exist, -> "n/a (DwC only)".
- Sampler(s)/Collector(s): `samp_collect_by` does not exist; MIxS has no collector slot. Mark n/a or custom. DwC recordedBy is fine.
- Sample ID: drop `eventID` (Event id, not sample id).
- Sample Type: drop basisOfRecord; use FAIRe `samp_category` (sample / negative control / positive control) plus `neg_cont_type`; remove `samp_type` (wrong package, wrong meaning).
- Environmental Medium: drop `env_local_scale` from the same cell (separate concept) or add its own row.
- Filter Material: `filter_material` is FAIRe only; MIxS equivalent is `filter_type`. Pore size = `size_frac` is fine.
- Visual Species Observed: `misc_param` is a parameter, not an observation; mark custom.
- Site/Sample Photo: `associated_media` does not exist in MIxS; mark custom (DwC associatedMedia is valid).
- Organism Group: `env_broad_scale` is the biome and `taxonRank` is the rank of the name; use `kingdom` only, MIxS cell "custom".
- Taxon: `host_sci_name` does not exist; use `specific_host` (MIxS, exists but not in Host/Plant checklists) and note FAIRe `host_species`.
- Tissue / Sample Material: `samp_mat_type` does not exist; use DwC `materialEntityType` and MIxS `host_body_site` / `host_body_product` (HostAssociated only). Drop `preparations` here (keep it for Preservation).
- Sample Size (B): sampleSizeValue definition does not list mass; keep but footnote, or use custom for mass.
- Turbidity / Secchi: no MIxS Secchi slot; split into two rows or footnote.
- Rename column "MIxS v6.0 / FAIReDNA" to name real versions (MIxS v6.3.1 or v7.0.1; FAIRe checklist v1.0.3) and "FAIRe" not "FAIReDNA".
- Counts: 32 distinct DwC terms (32 exist; 4 misused/weak: eventID, taxonRank, basisOfRecord, locationID). 37 distinct non-custom MIxS terms: 28 exist, 9 do not exist (decimalLatitude, decimalLongitude, coord_uncert, geodeticDatum, samp_collect_by, filter_material, associated_media, host_sci_name, samp_mat_type); of the 28 that exist, 5 are semantically wrong in their row (samp_type, env_broad_scale, misc_param, env_local_scale, host_body_product partial). 4 custom terms (qaqc_*), correctly marked.
