# LeadForge — Expert Data Engineering Audit: Three-Way Dataset Deduplication & Entity Resolution

> **Audit Framework**: Advanced Entity Resolution & Fuzzy Text-Similarity Matching  
> **Audited Datasets**:
> 1. **JFLL Customers (Internal Master)**: 2,223 Accounts (`data/processed/all_customers_leads_zstd.parquet`)  
> 2. **DataMyne (Customs Trade Manifests)**: 40,081 Leads (`data/processed/datamyne_leads_zstd.parquet`)  
> 3. **Apollo (B2B Commercial Directory)**: 686,700 Organizations (`data/processed/apollo_freight_leads_zstd.parquet`)  
> **Audit Date**: November 2026  
> **Status**: Comprehensive Discovery Phase Completed (3,234 Candidate Duplicate Pairs Surfaced)  
> **Full Itemized Audit Log**: [`Backend/data/processed/CANDIDATE_DUPLICATES_AUDIT.csv`](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Lead%20Sourcing%20Tool/Backend/data/processed/CANDIDATE_DUPLICATES_AUDIT.csv)

---

## 1. Executive Summary & Audit Overview

As requested, we performed an exhaustive, record-by-record data engineering audit across all three datasets in **LeadForge** to identify duplicates, entity variants, and cross-dataset contamination.

### Global Audit Metrics
| Dataset Comparison | Total Records Audited | Candidate Duplicate Pairs | Match Mechanisms |
| :--- | :--- | :--- | :--- |
| **JFLL Customers ∩ DataMyne** | 2,223 × 40,081 | **892 Pairs** | Exact Norm (325), Exact Entity (9), Squashed (10), Domain (27), Core Stem (63), Fuzzy (458) |
| **JFLL Customers ∩ Apollo** | 2,223 × 686,700 | **355 Pairs** | Domain (78), Exact Norm (33), Exact Entity (34), Squashed (12), Core Stem (198) |
| **DataMyne ∩ Apollo** | 40,081 × 686,700 | **1,987 Pairs** | Exact Norm (322), Exact Entity (268), Squashed (212), Core Stem (1,185) |
| **Intra-JFLL Internal Master** | 2,223 × 2,223 | **14 Clusters** | Parent-Child Divisional Aliases (`is_branch_alias = True`) |
| **TOTAL CANDIDATE PAIRS** | — | **3,234 Pairs** | Itemized in `CANDIDATE_DUPLICATES_AUDIT.csv` |

---

## 2. In-Depth Case Study: "FAIR EXPORTS (I) - INDIA" Discrepancy

### 2.1 The Discovered Records
The audit confirmed the exact discrepancy highlighted in the prompt:

1. **In JFLL Customer Master (`all_customers_leads_zstd.parquet`)**:
   - `jfll-2218`: **`FAIR EXPORTS (I) PVT LTD.`**  
     *(Status: Not Active | Contact: Ashish | Mobile: +91-8108151461 | Email: fairexports@gmail.com | in_datamyne: False)*
   - `jfll-0078`: **`FAIR EXPORTS (INDIA) PVT LTD. (DOMESTIC DIVISION)`**  
     *(Status: Active | Contact: MOHAMMED SHAMEER | Mobile: +91-9037363138 | Email: fmcgmumbaidoc@fairexports.net | in_datamyne: False)*
2. **In DataMyne Leads (`datamyne_leads_zstd.parquet`)**:
   - `dm-val-16801`: **`FAIR EXPORTS (INDIA) PRIVATE LIMITED`**  
     *(Country: India | Role: Exporter | Transport Mode: Air & Ocean | Total Shipments: 15)*
3. **In Apollo Directory (`apollo_freight_leads_zstd.parquet`)**:
   - *0 records* (Fair Exports does not exist in Apollo).

---

### 2.2 Why Previous Deduplication Pipelines Missed FAIR Exports

Tracing through the historical pipeline scripts revealed two compounding flaws:

```
Historical Flaw in process_all_jfll_customers.py (Line 64 vs Line 65):
┌─────────────────────────────────────────────────────────────┐
│ Line 64: s = re.sub(r"\(INDIA\)", "INDIA", s)   --> "INDIA" │
│ Line 65: s = re.sub(r"\(I\)", "I", s)           --> "I"     │  <-- BUG: (I) was reduced to "I" instead of "INDIA"
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Input: "FAIR EXPORTS (I) PVT LTD."       --> clean_corp_stem --> "FAIREXPORTSI"         │
│ Input: "FAIR EXPORTS (INDIA) PVT LTD."   --> clean_corp_stem --> "FAIREXPORTS" (stripped)│
│ Comparison: "FAIREXPORTSI" != "FAIREXPORTS" --> NO MATCH! (in_datamyne remained False)   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **The `(I)` vs `INDIA` Normalization Bug**:
   In `Backend/scripts/process_all_jfll_customers.py`:
   - Line 64 handled `(INDIA)` by expanding to `INDIA`.
   - Line 65 handled `(I)` by substituting `"I"` (single letter) instead of expanding to `"INDIA"`.
   - Subsequent regex stripped `"INDIA"`, but left `"I"` attached to the entity stem.
   - Result: `FAIR EXPORTS (I)` became `FAIREXPORTSI`, while DataMyne's `FAIR EXPORTS (INDIA)` became `FAIREXPORTS`. Because of this 1-character divergence, the exact stem match failed.
2. **The Flawed Three-Way Inner Join**:
   In `Backend/scripts/remove_threeway_duplicates.py`, deduplication required an `INNER JOIN` across **ALL THREE** datasets:
   ```sql
   FROM datamyne d
   JOIN jfll j ON clean_legal(d.company_name) = j.clean_name
   JOIN apollo a ON clean_legal(d.company_name) = clean_legal(a.organization_name)
   ```
   Because Apollo did not contain Fair Exports, the 3-way join returned 0 rows for this entity, leaving `dm-val-16801` untouched in DataMyne.
3. **The Business Problem**:
   Sales reps prospecting in DataMyne see `FAIR EXPORTS (INDIA) PRIVATE LIMITED` as an untargeted cold lead, completely unaware that Fair Exports is already an active customer of Jet Freight Logistics (`jfll-0078`).

---

### 2.3 Other Indian Entities with Shorthand `(I)` / `(INDIA)` Discrepancies
The audit discovered 59 accounts in JFLL utilizing `(I)`, `(INDIA)`, or `(IND)` syntax. Examples where variant names caused cross-dataset mismatches:

| JFLL ID | JFLL Customer Name | Target Dataset | Matching Record ID & Name | Match Type |
| :--- | :--- | :--- | :--- | :--- |
| `jfll-2218` | `FAIR EXPORTS (I) PVT LTD.` | DataMyne | `dm-val-16801` (`FAIR EXPORTS (INDIA) PRIVATE LIMITED`) | `EXACT_NORM` (100%) |
| `jfll-0078` | `FAIR EXPORTS (INDIA) PVT LTD. (DOMESTIC DIVISION)` | DataMyne | `dm-val-16801` (`FAIR EXPORTS (INDIA) PRIVATE LIMITED`) | `EXACT_NORM` (100%) |
| `jfll-0834` | `TANDEM GLOBAL LOGISTICS (I)P.LTD.` | Apollo | `Tandem Global Logistics India Pvt. Ltd.` | `EXACT_NORM` (100%) |
| `jfll-0204` | `INDUCTOTHERM (INDIA) PRIVATE LIMITED` | DataMyne | `dm-val-00280` (`INDUCTOTHERM (INDIA) PRIVATE LIMITED`) | `EXACT_NORM` (100%) |
| `jfll-0204` | `INDUCTOTHERM (INDIA) PRIVATE LIMITED` | DataMyne | `dm-val-13274` (`INDUCTOTHERM GROUP PUNE PRIVATE LIMITED`) | `FUZZY` (92.4%) |
| `jfll-1273` | `SACHI EXPORTS (INDIA)` | DataMyne | `dm-val-00075` (`SACHI EXPORTS (INDIA)`) | `EXACT_NORM` (100%) |
| `jfll-1179` | `SAFE WATER LINES (I) PVT. LTD.` | DataMyne/Apollo | `Safe Water Lines India Pvt Ltd` | `EXACT_NORM` (100%) |

---

## 3. Comprehensive Breakdown of Candidate Duplicate Pairs

### 3.1 Intersection 1: JFLL Customers ∩ DataMyne (892 Pairs)
*Core Rule: Existing JFLL customers must NEVER be surfaced as cold prospecting leads in DataMyne.*

```
JFLL ∩ DataMyne Matches by Resolution Engine (892 Total):
┌───────────────────────────┬───────┬────────────────────────────────────────────────────────┐
│ Match Type                │ Count │ Description & Examples                                 │
├───────────────────────────┼───────┼────────────────────────────────────────────────────────┤
│ EXACT_NORM                │   325 │ 100% Normalized match (e.g., Fair Exports, Winsome)    │
│ EXACT_ENTITY              │     9 │ Core entity identical, legal suffix varies (Pvt vs Ltd)│
│ SQUASHED_MATCH            │    10 │ Spacing/compound variation (Anish Pharma Equip)        │
│ CORPORATE_DOMAIN          │    27 │ Verified non-generic email domain (@allana.com)        │
│ EXACT_CORE_STEM           │    63 │ Core brand identical, secondary trade tokens vary      │
│ FUZZY_HIGH_CONFIDENCE     │   458 │ Token Set >= 92%, Token Sort >= 78%                    │
└───────────────────────────┴───────┴────────────────────────────────────────────────────────┘
```

#### Representative High-Priority Pairs (JFLL vs DataMyne):
1. **Fair Exports**:
   - JFLL: `[jfll-0078]` `FAIR EXPORTS (INDIA) PVT LTD. (DOMESTIC DIVISION)` & `[jfll-2218]` `FAIR EXPORTS (I) PVT LTD.`
   - DataMyne: `[dm-val-16801]` `FAIR EXPORTS (INDIA) PRIVATE LIMITED` *(Score: 100.0%)*
2. **Allana Sons / Frigorifico Allana**:
   - JFLL: `[jfll-0878]` `FRIGORIFICO ALLANA PVT. LTD (DOMESTICS)` & `[jfll-1604]` `FRIGORIFICO ALLANA PVT. LTD`
   - DataMyne: `[dm-val-00010]` `ALLANA SONS PRIVATE LIMITED` *(Domain: `allana.com` | Score: 98.0%)*
3. **Anish Pharma Equip**:
   - JFLL: `[jfll-0016]` `ANISH PHARMA EQUIP PVT LTD`
   - DataMyne: `[dm-val-01053]` `ANISH PHARMAEQUIP PRIVATE LIMITED` *(Score: 97.0%)*
4. **Inductotherm**:
   - JFLL: `[jfll-0204]` `INDUCTOTHERM (INDIA) PRIVATE LIMITED`
   - DataMyne: `[dm-val-00280]` `INDUCTOTHERM (INDIA) PRIVATE LIMITED` *(Score: 100.0%)*
   - DataMyne: `[dm-val-13274]` `INDUCTOTHERM GROUP PUNE PRIVATE LIMITED` *(Score: 92.4%)*
5. **Winsome Textile**:
   - JFLL: `[jfll-0005]` `WINSOME TEXTILE INDUSTRIES LIMITED`
   - DataMyne: `[dm-val-00201]` `WINSOME TEXTILE INDUSTRIES LIMITED` *(Score: 100.0%)*
6. **Kay Bee Exports**:
   - JFLL: `[jfll-0019]` `KAY BEE EXPORTS INTERNATIONAL PRIVATE LIMITED`
   - DataMyne: `[dm-val-00115]` `KAY BEE EXPORTS INTERNATIONAL PRIVATE LIMITED` *(Score: 100.0%)*

---

### 3.2 Intersection 2: JFLL Customers ∩ Apollo (355 Pairs)
*Core Rule: Existing JFLL customer organizations must not clutter Apollo lead exploration.*

```
JFLL ∩ Apollo Matches by Resolution Engine (355 Total):
┌───────────────────────────┬───────┬────────────────────────────────────────────────────────┐
│ Match Type                │ Count │ Description & Examples                                 │
├───────────────────────────┼───────┼────────────────────────────────────────────────────────┤
│ CORPORATE_DOMAIN          │    78 │ Exact verified corporate domain (upl-ltd.com, etc.)   │
│ EXACT_NORM                │    33 │ Full normalized match                                  │
│ EXACT_ENTITY              │    34 │ Legal structure variant                                │
│ SQUASHED_MATCH            │    12 │ Spacing / token collapse                               │
│ EXACT_CORE_STEM           │   198 │ Core brand match with Token Set >= 88%                 │
└───────────────────────────┴───────┴────────────────────────────────────────────────────────┘
```

#### Representative High-Priority Pairs (JFLL vs Apollo):
1. **UPL Limited**:
   - JFLL: `[jfll-0144]` `UPL LIMITED`
   - Apollo: `[54a1236569702d847c213200]` `UPL Limited` *(Domain: `upl-ltd.com` | Score: 100.0%)*
2. **Indo Amines**:
   - JFLL: `[jfll-0092]` `INDO AMINES LIMITED`
   - Apollo: `[54a1411c69702d534571d800]` `Indo Amines Ltd` *(Domain: `indoaminesltd.com` | Score: 98.0%)*
3. **Suzlon Energy**:
   - JFLL: `[jfll-0450]` `SUZLON ENERGY LIMITED`
   - Apollo: `[54a1221769702d81571f8400]` `Suzlon Group` *(Domain: `suzlon.com` | Score: 96.0%)*
4. **Air India**:
   - JFLL: `[jfll-2204]` `AIR INDIA LTD`
   - Apollo: `[54a1231869702d86940a4501]` `Air India` *(Domain: `airindia.in` | Score: 100.0%)*
5. **SK Group / SK Logistics**:
   - JFLL: `[jfll-1510]` `S.K. LOGISTICS`
   - Apollo: `[556dcd1c7369641261358b02]` `SK Group` *(Domain: `skgroup.com` | Score: 95.0%)*

---

### 3.3 Intersection 3: DataMyne ∩ Apollo (1,987 Residual Pairs)
*Core Rule: Single source of truth. If a company exists in customs trade manifests (DataMyne), purge redundant copies from Apollo.*

```
DataMyne ∩ Apollo Matches by Resolution Engine (1,987 Total):
┌───────────────────────────┬───────┬────────────────────────────────────────────────────────┐
│ Match Type                │ Count │ Description & Examples                                 │
├───────────────────────────┼───────┼────────────────────────────────────────────────────────┤
│ EXACT_NORM                │   322 │ Bypassed prior exact match due to (I) or & / and       │
│ EXACT_ENTITY              │   268 │ Mismatched legal suffixes (Pvt Ltd vs Ltd)             │
│ SQUASHED_MATCH            │   212 │ Compound words / spacing variations                    │
│ EXACT_CORE_STEM           │ 1,185 │ Distinctive core brand with Token Set >= 90%           │
└───────────────────────────┴───────┴────────────────────────────────────────────────────────┘
```

#### Why Did 1,987 Pairs Remain After Prior Deduplication?
In the previous purge (`remove_apollo_datamyne_intersection.py`), only strict string equality on `normalize_name` was used. Entities with:
- `&` vs `AND`
- `(INDIA)` in DataMyne vs no `INDIA` in Apollo
- Missing `PVT` in Apollo (e.g. `ALEMBIC PHARMACEUTICALS LIMITED` in DataMyne vs `ALEMBIC PHARMACEUTICALS` in Apollo)
- Punctuation differences (`M.L. EXPORTS` vs `ML EXPORTS`)  
were missed by exact matching. Applying fuzzy token set and stem normalization surfaces all 1,987 latent duplicates.

---

### 3.4 Intersection 4: Intra-JFLL Customer Master Clusters (14 Clusters)
Within the 2,223 internal JFLL customer master records, 14 entity clusters exist where multiple records represent divisions, branches, or honorific aliases of the same client:

1. **FAIR EXPORTS INDIA PVT LTD**:
   - `[jfll-2218]` `FAIR EXPORTS (I) PVT LTD.` *(Primary / Parent)*
   - `[jfll-0078]` `FAIR EXPORTS (INDIA) PVT LTD. (DOMESTIC DIVISION)` *(Child Alias)*
2. **NAIK FROZEN FOODS**:
   - `[jfll-0623]` `NAIK FROZEN FOODS PVT.LTD` *(Primary / Parent)*
   - `[jfll-0146]` `NAIK FROZEN FOODS PRIVATE LIMITED( DOMESTIC)` *(Child Alias)*
3. **MOL LOGISTICS**:
   - `[jfll-1793]` `MOL LOGISTICS (INDIA) PRIVATE LIMITED` *(Primary / Parent)*
   - `[jfll-0262]` `MOL LOGISTICS INDIA PVT LTD` *(Child Alias)*
4. **JET FREIGHT EXPRESS**:
   - `[jfll-0855]` `JET FREIGHT EXPRESS PVT. LTD. (OTHERS)` *(Primary / Parent)*
   - `[jfll-0314]` `JET FREIGHT EXPRESS PRIVATE LIMITED` *(Child Alias)*
5. **AIR INDIA**:
   - `[jfll-2204]` `AIR INDIA LTD` *(Primary / Parent)*
   - `[jfll-0546]` `AIR INDIA LTD. (INDIAN AIRLINES)` *(Child Alias)*
6. **FRIGORIFICO ALLANA**:
   - `[jfll-1604]` `FRIGORIFICO ALLANA PVT. LTD` *(Primary / Parent)*
   - `[jfll-0878]` `FRIGORIFICO ALLANA PVT. LTD (DOMESTICS)` *(Child Alias)*
7. **DEVDAS SEA FOODS**:
   - `[jfll-2078]` `M/S. DEVDAS SEA FOODS` *(Primary / Parent)*
   - `[jfll-1411]` `DEVDAS SEA FOODS` *(Child Alias)*

---

## 4. Technical Architecture: Normalization & Matching Protocol

```
Multi-Stage Entity Resolution Engine:
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Raw Input String: e.g. "FAIR EXPORTS (I) PVT LTD."                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Shorthand Country & Region Expansion:                                    │
│    • (I) / (IND) / (INDIA) / - INDIA / / INDIA  --> " INDIA "               │
│    • & --> " AND "                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Divisional & Honorific Stripping:                                        │
│    • (DOMESTIC DIVISION) / (SEZ UNIT) / (EXPORT) --> Captured as metadata   │
│    • M/S / MESSRS / THE / SHRI / SHREE           --> Stripped               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Legal Structure Standardization:                                         │
│    • PRIVATE LIMITED / PVT LTD / P. LTD / PLTD   --> "PVT LTD"              │
│    • LIMITED / LTD / LTD.                        --> "LTD"                  │
│    • LLP / LLC / INC / CORP / CO                 --> Standardized           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. Three Distinct Key Representations:                                      │
│    A. Normalized String (norm): "FAIR EXPORTS INDIA PVT LTD"                │
│    B. Entity Name (ent):       "FAIR EXPORTS INDIA"                         │
│    C. Core Brand Stem (core):   "FAIR" (Trade stopwords stripped)           │
│    D. Squashed String (sq):    "FAIREXPORTSINDIA"                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. Similarity Metrics Applied:                                              │
│    • Exact Inverted Index Lookup (Norm, Entity, Squashed, Domain)           │
│    • RapidFuzz Token Set Ratio (>= 92%) & Token Sort Ratio (>= 78%)         │
│    • Jaccard Token Overlap on Core Stems (>= 0.75)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phased Roadmap Toward Zero Duplication

As instructed, all candidate pairs have been identified and itemized without prematurely modifying source data. Below is the structured roadmap to achieve **Zero Duplication**:

### Step 1: Normalization Patch Deployment
- Update `normalize_company` and `clean_corp_stem` in `Backend/scripts/process_all_jfll_customers.py` and `Backend/scripts/unify_datamyne_parquet.py`:
  - Map `(I)`, `(IND)`, `(INDIA)`, `- INDIA` cleanly to `INDIA`.
  - Strip domestic/division suffixes for core entity matching while retaining them in the display alias.

### Step 2: JFLL ∩ DataMyne Direct Purge & Flag Sync
- For the confirmed 338 exact/stem matches and verified fuzzy matches:
  - **In JFLL Master**: Set `in_datamyne = True` and populate `datamyne_match_details` with the matched DataMyne ID, total shipments, and trade lanes.
  - **In DataMyne**: Remove or quarantine these records (`dm-val-16801`, etc.) so sales reps do not waste outbound prospecting effort on existing internal clients.

### Step 3: JFLL ∩ Apollo Direct Purge
- Purge confirmed matches from Apollo organizations and their linked contacts (`apollo_freight_contacts_with_company_profile.parquet`).

### Step 4: DataMyne ∩ Apollo Secondary Purge
- Purge the 1,987 residual duplicates from Apollo organizations and contacts, preserving DataMyne manifests as the single source of truth for freight activity.

### Step 5: Post-Purge Verification Gate
- Run automated hermetic tests asserting:
  - `JFLL ∩ DataMyne Candidate Duplicates == 0`
  - `JFLL ∩ Apollo Candidate Duplicates == 0`
  - `DataMyne ∩ Apollo Candidate Duplicates == 0`
- Re-export clean ZSTD Parquet files, CSV archives, and Frontend mock data files.
