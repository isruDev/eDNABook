### Table A: FAIReDNA / MIxS / DwC Aquatic eDNA Template

| eDNALite UI Label | Data Type | Status | Darwin Core (DwC) Term | MIxS v6.0 / FAIReDNA Term | Description / Controlled Vocabulary / Units |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sample ID** | Text (QR / Manual) | Required (Locked) | `materialSampleID` / `eventID` | `samp_name` | Unique alphanumeric identifier affixed to the sample container or filter housing. |
| **Collection Date & Time** | Datetime (Auto) | Required (Locked) | `eventDate` | `collection_date` | ISO 8601 timestamp (`YYYY-MM-DDTHH:MM:SS±hh:mm`). |
| **Latitude** | Numeric (Auto GPS) | Required (Locked) | `decimalLatitude` | `decimalLatitude` (`lat_lon`) | Geodetic latitude in decimal degrees. |
| **Longitude** | Numeric (Auto GPS) | Required (Locked) | `decimalLongitude` | `decimalLongitude` (`lat_lon`) | Geodetic longitude in decimal degrees. |
| **GPS Accuracy (m)** | Numeric (Auto GPS) | Required (Locked) | `coordinateUncertaintyInMeters` | `coord_uncert` | Horizontal GPS accuracy estimate in meters (warns if >15 m). |
| **Geodetic Datum** | Text (Auto Default) | Required (Locked) | `geodeticDatum` | `geodeticDatum` | Defaults to `WGS84`. |
| **Sampler(s)** | Text | Required | `recordedBy` | `samp_collect_by` | Name(s) or initials of personnel collecting the sample. |
| **Site / Location Name** | Text | Required | `locality` / `locationID` | `geo_loc_name` | Standardized geographic description (e.g., `Canada: Ontario, Lake Opinicon`). |
| **Sample Type** | Controlled Vocabulary | Required | `basisOfRecord` (`MaterialSample`) | `samp_type` / `neg_cont_type` | `Field Sample`, `Field Negative Control (Blank)`, `Equipment Blank`. |
| **Environmental Medium** | Controlled Vocabulary | Required | `habitat` | `env_medium` / `env_local_scale` | `Freshwater`, `Marine water`, `Estuarine`, `Sediment`, `Soil`, `Biofilm`. |
| **Collection Method** | Controlled Vocabulary | Required | `samplingProtocol` | `samp_collect_device` | `Peristaltic pump`, `Syringe filtration`, `Surface grab`, `Passive sampler`, `Sediment core`. |
| **Volume Filtered (mL)** | Numeric | Required | `sampleSizeValue` (`sampleSizeUnit` = mL) | `samp_vol_we_dna_ext` | Total volume of water passed through the filter in milliliters. |
| **Filter Material & Pore Size** | Controlled Vocabulary | Required | `samplingProtocol` | `size_frac` / `filter_material` | `0.22 µm Sterivex (PES)`, `0.45 µm Cellulose Nitrate`, `0.8 µm MCE`, `1.2 µm Glass Fiber`, `Other`. |
| **Preservation Method** | Controlled Vocabulary | Required | `preparations` | `samp_store_sol` | `Cold chain / Ice (4°C)`, `Frozen (-20°C)`, `95% Ethanol`, `Longmire's buffer`, `ATL buffer`, `Silica desiccant`. |
| **Water Temperature (°C)** | Numeric | Optional | `dynamicProperties` | `temp` | In-situ water temperature in degrees Celsius. |
| **pH** | Numeric | Optional | `dynamicProperties` | `ph` | In-situ water or soil pH (`0.0–14.0`). |
| **Conductivity (µS/cm)** | Numeric | Optional | `dynamicProperties` | `conduc` | Electrical conductivity in microsiemens per centimeter. |
| **Turbidity (NTU) / Secchi (m)** | Numeric | Optional | `dynamicProperties` | `turbidity` | Water clarity metric relevant to filter clogging and PCR inhibition. |
| **Sampling Depth (m)** | Numeric | Optional | `minimumDepthInMeters` | `depth` | Depth below surface in meters. |
| **Visual Species Observed** | Text | Optional | `associatedTaxa` / `eventRemarks` | `misc_param` | In-field visual observations of target or notable taxa at the time of sampling. |
| **Site Photo** | Media (Image) | Optional | `associatedMedia` | `associated_media` | Local image filename captured via device camera. |
| **QA/QC: Sterile Gloves Worn?** | Boolean (Checkbox) | Required (QA/QC) | `dynamicProperties` | `custom:qaqc_gloves_used` | Confirms fresh nitrile/latex gloves were worn prior to handling. |
| **QA/QC: Gear Decontaminated?** | Boolean (Checkbox) | Required (QA/QC) | `dynamicProperties` | `custom:qaqc_gear_decon` | Confirms filtration equipment/forceps were bleached or single-use. |
| **QA/QC: Sample Sealed & Shaded?** | Boolean (Checkbox) | Required (QA/QC) | `dynamicProperties` | `custom:qaqc_sample_sealed` | Confirms filter housing/container was sealed and protected from UV/heat. |

### Table B: Animal & Plant Organismal / Tissue Sampling Template (DwC & MIxS Host/Plant-Associated)

| eDNALite UI Label | Data Type | Status | Darwin Core (DwC) Term | MIxS v6.0 (Host / Plant) Term | Description / Controlled Vocabulary / Units |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sample ID** | Text (QR / Manual) | Required (Locked) | `materialSampleID` / `occurrenceID` | `samp_name` | Unique identifier affixed to the cryovial, zip-lock bag, or coin envelope. |
| **Collection Date & Time** | Datetime (Auto) | Required (Locked) | `eventDate` | `collection_date` | ISO 8601 timestamp (`YYYY-MM-DDTHH:MM:SS±hh:mm`). |
| **Latitude** | Numeric (Auto GPS) | Required (Locked) | `decimalLatitude` | `decimalLatitude` (`lat_lon`) | Geodetic latitude in decimal degrees. |
| **Longitude** | Numeric (Auto GPS) | Required (Locked) | `decimalLongitude` | `decimalLongitude` (`lat_lon`) | Geodetic longitude in decimal degrees. |
| **GPS Accuracy (m)** | Numeric (Auto GPS) | Required (Locked) | `coordinateUncertaintyInMeters` | `coord_uncert` | Horizontal GPS accuracy estimate in meters (warns if >15 m). |
| **Geodetic Datum** | Text (Auto Default) | Required (Locked) | `geodeticDatum` | `geodeticDatum` | Defaults to `WGS84`. |
| **Collector(s)** | Text | Required | `recordedBy` | `samp_collect_by` | Name(s) or initials of field personnel collecting the specimen. |
| **Site / Locality Name** | Text | Required | `locality` / `locationID` | `geo_loc_name` | Standardized geographic description of the sampling site. |
| **Organism Group** | Controlled Vocabulary | Required | `kingdom` / `taxonRank` | `env_broad_scale` | `Animalia (Vertebrate)`, `Animalia (Invertebrate)`, `Plantae (Vascular)`, `Plantae (Bryophyte/Algae)`, `Fungi/Lichen`. |
| **Taxon / Provisional ID** | Text | Required | `scientificName` / `verbatimIdentification` | `host_sci_name` | Field taxonomic identification (binomial or morphospecies). |
| **Individual / Host Tag ID** | Text | Optional | `organismID` | `host_subject_id` | Band number, PIT tag, ear tag, or permanent tree/plot tag ID. |
| **Tissue / Sample Material** | Controlled Vocabulary | Required | `preparations` | `samp_mat_type` / `host_body_product` | `Leaf/Needle punch`, `Root/Rhizosphere`, `Bark/Cambium`, `Seed/Fruit`, `Mucosal/Skin swab`, `Fin/Toe/Ear clip`, `Blood`, `Feather/Hair`, `Fecal/Scat`, `Whole organism`. |
| **Preservation & Container** | Controlled Vocabulary | Required | `preparations` | `samp_store_sol` | `95% Ethanol (Cryovial)`, `RNAlater (Cryovial)`, `Silica desiccant (Zip-lock/Envelope)`, `Liquid N2 / Flash frozen`, `FTA Card`, `Pressed voucher`. |
| **Sample Size / Quantity** | Text / Numeric | Optional | `sampleSizeValue` | `samp_size` | Tissue mass (mg), blood volume (µL), number of leaf punches, or swabbing duration (s). |
| **Life Stage / Phenology** | Controlled Vocabulary | Optional | `lifeStage` / `reproductiveCondition` | `host_life_stage` | `Adult`, `Juvenile/Larva`, `Seedling/Sapling`, `Vegetative`, `Flowering`, `Fruiting`, `Senescent/Dormant`. |
| **Sex** | Controlled Vocabulary | Optional | `sex` | `host_sex` | `Female`, `Male`, `Hermaphrodite`, `Monoecious`, `Dioecious`, `Indeterminate / N/A`. |
| **Biometric Measurement** | Text / Numeric | Optional | `dynamicProperties` | `host_length` / `host_tot_mass` | Snout-vent length (mm), fork length (mm), mass (g), or plant height / DBH (cm). |
| **Health / Condition State** | Controlled Vocabulary | Optional | `occurrenceRemarks` | `host_disease_stat` | `Healthy/Asymptomatic`, `Lesions/Disease visible`, `Parasitized`, `Herbivory/Mechanical damage`, `Dead/Salvage`. |
| **Voucher ID / Catalog Link** | Text | Optional | `otherCatalogNumbers` | `source_mat_id` | Herbarium sheet or museum voucher ID linked to the genetic tissue sample. |
| **Microhabitat / Substrate** | Text | Optional | `habitat` | `env_medium` | Specific microhabitat (e.g., epiphyte on *Acer*, benthic cobble, rotting log). |
| **Specimen / Site Photo** | Media (Image) | Optional | `associatedMedia` | `associated_media` | Diagnostic photo of the organism, diagnostic traits, or habitat. |
| **QA/QC: Fresh Gloves Worn?** | Boolean (Checkbox) | Required (QA/QC) | `dynamicProperties` | `custom:qaqc_gloves_used` | Confirms gloves were changed between individuals to prevent cross-contamination. |
| **QA/QC: Tools Sterilized?** | Boolean (Checkbox) | Required (QA/QC) | `dynamicProperties` | `custom:qaqc_tools_sterilized` | Confirms forceps, scalpels, biopsy punches, or secateurs were flame- or bleach-sterilized. |