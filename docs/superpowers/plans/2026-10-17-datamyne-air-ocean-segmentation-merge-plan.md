# DataMyne Air & Ocean Segmentation and Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Segment the DataMyne database into Air and Ocean hierarchies, merge DataMyne_2 into DataMyne with multi-stage deduplication (including active JFLL customer purging), update Excel master directories, rebuild the ETL pipeline, and expose Transport Mode filtering in the frontend dashboard.

**Architecture:** 
1. Restructure `Backend/data/Datamyne` into root `Air/` and `Ocean/` branches containing respective `Valid Contacts/` and `Missing Contacts/`.
2. Cleanse and merge `Backend/data/Datamyne_2` into `DataMyne` while removing all 37 identified active JFLL customer matches and cross-dataset duplicate entities using canonical name, phone, email, and IEC matching.
3. Re-generate standardized Excel master directories (`Master_Cleaned_Air_Contacts.xlsx`, `Master_Cleaned_Ocean_Contacts.xlsx`, and unified master contacts directories with `Transport Mode`).
4. Re-run backend ETL pipeline (`datamyne_etl.py`) to generate updated Parquet and CSV files, update Frontend types/data, and add Transport Mode visual badges and filters.

**Tech Stack:** Python 3.13 (`uv run --with pandas,openpyxl,pyarrow`), React 18, TypeScript, Tailwind CSS, TanStack Table, Vitest.

**Spec/Context:**
- Original DataMyne records: 34,664 (16,886 With Contacts, 17,778 Without Contacts)
- DataMyne_2 records: 3,030 (2,453 Air, 623 Ocean, with 45 multi-modal overlaps)
- Active JFLL customer matches found in DataMyne_2: 37 accounts (must be purged)
- Duplicate overlap between DataMyne and DataMyne_2 normalized names: 0 (already deduplicated by user)

## Global Constraints

- Never lose raw file data; always create a full backup before restructuring.
- Strict deduplication: Active JFLL customers must NEVER appear in cold prospecting datasets.
- Normalized Company Name canonical key: strip prefixes (`M/S`, `MESSRS`), standardize corporate suffixes (`PVT LTD` -> `PRIVATE LIMITED`, `LTD` -> `LIMITED`), remove punctuation, handle ampersands (`&` -> `AND`).
- Phone normalization: strip country codes (`+91`, `91-`) and city STD codes (`022`, `011`, `079`, `044`) to match standard 10-digit mobile/primary numbers.
- Email normalization: case-insensitive, trimmed, split multiple emails on `,` or `;`.
- Excel deliverables must conform to professional styling: Arial font, zero formula errors (`#REF!`, `#VALUE!`), clear headers, and RFC-4180 / CWE-1236 CSV formula injection sanitization.
- All 69 frontend Vitest tests must pass, and `npm run build` must succeed with 0 errors.

---

### Task 1: Safety Snapshot & Active Customer Audit

**Files:**
- Create: `Backend/data/Datamyne/DUPLICATES_REMOVED_DATAMYNE2_AUDIT.csv`
- Backup: `Backend/data/.backups/2026-10-17-pre-merge/`

**Interfaces:**
- Consumes: `Backend/data/processed/active_customers_leads.csv`, `Backend/data/Datamyne_2/`
- Produces: `DUPLICATES_REMOVED_DATAMYNE2_AUDIT.csv` logging all purged records

- [ ] **Step 1: Create snapshot backup of Datamyne and Datamyne_2**
  Copy both directories to `Backend/data/.backups/2026-10-17-pre-merge/` to ensure 100% reversible rollback.
- [ ] **Step 2: Generate audit log for the 37 active JFLL customer matches**
  Scan `DataMyne_2/Air` and `DataMyne_2/Ocean` against `active_customers_leads.csv` and export exact matched records with match reason (Name, Phone, Email) to `DUPLICATES_REMOVED_DATAMYNE2_AUDIT.csv`.
- [ ] **Step 3: Verify audit log accuracy**
  Ensure each purged record has its original source file and company name recorded.

---

### Task 2: Restructure Original DataMyne into Air and Ocean Hierarchy

**Files:**
- Modify: `Backend/data/Datamyne/` folder tree
- Move: `GCR/Air` and `PER/AIR` -> `Backend/data/Datamyne/Air/`
- Move: `EX-China_INDIA` -> `Backend/data/Datamyne/Ocean/`

**Interfaces:**
- Consumes: Current `Valid Contacts/` and `Missing Contacts/` subfolders in `Datamyne/`
- Produces: Dual-level hierarchy: `Datamyne/Air/` and `Datamyne/Ocean/`

- [ ] **Step 1: Create target directory structure**
  ```bash
  mkdir -p "Backend/data/Datamyne/Air/Valid Contacts" "Backend/data/Datamyne/Air/Missing Contacts"
  mkdir -p "Backend/data/Datamyne/Ocean/Valid Contacts" "Backend/data/Datamyne/Ocean/Missing Contacts"
  ```
- [ ] **Step 2: Move Air folders in Valid Contacts and Missing Contacts**
  - Move `Datamyne/Valid Contacts/GCR/Air` and `Datamyne/Valid Contacts/PER/AIR` to `Datamyne/Air/Valid Contacts/`
  - Move `Datamyne/Missing Contacts/GCR/Air` and `Datamyne/Missing Contacts/PER/AIR` to `Datamyne/Air/Missing Contacts/`
- [ ] **Step 3: Move Ocean folders in Valid Contacts and Missing Contacts**
  - Move `Datamyne/Valid Contacts/EX-China_INDIA` to `Datamyne/Ocean/Valid Contacts/`
  - Move `Datamyne/Missing Contacts/EX-China_INDIA` to `Datamyne/Ocean/Missing Contacts/`
- [ ] **Step 4: Verify all raw files remain intact**
  Verify file count matches the pre-move total (540 raw excel files).

---

### Task 3: Merge DataMyne_2 into DataMyne with Deduplication & Purging

**Files:**
- Merge: `Backend/data/Datamyne_2/Air/` -> `Backend/data/Datamyne/Air/`
- Merge: `Backend/data/Datamyne_2/Ocean/` -> `Backend/data/Datamyne/Ocean/`
- Script: `Backend/data/Datamyne/merge_and_deduplicate.py`
- Delete: `Backend/data/Datamyne_2/`

**Interfaces:**
- Consumes: `Backend/data/Datamyne_2/` raw files and master sheets
- Produces: Single unified `Backend/data/Datamyne/` tree without duplicate entities

- [ ] **Step 1: Write deduplication and merge pipeline script**
  Create `Backend/data/Datamyne/merge_and_deduplicate.py` implementing:
  - Canonical name normalization (strip prefixes, standardize legal suffixes, remove punctuation).
  - Phone normalization (last 10 digits matching, STD code stripping).
  - Email matching (case-insensitive, trimmed).
  - Active JFLL customer exclusion filter.
  - Multi-modal detection: identify companies shipping via both Air and Ocean and flag as `Air & Ocean`.
  - Contact readiness upgrade: if a company is Missing in one dataset but has valid phone/email in another, upgrade to With Contacts.
- [ ] **Step 2: Execute merge of raw excel files**
  Move unique raw excel files from `DataMyne_2/Air` and `DataMyne_2/Ocean` into their corresponding folders in `Datamyne/Air/` and `Datamyne/Ocean/`.
- [ ] **Step 3: Remove DataMyne_2 directory**
  After confirming all unique records and files are transferred and verified, delete `Backend/data/Datamyne_2`.

---

### Task 4: Generate Updated Master Directories (Excel Engineering)

**Files:**
- Create: `Backend/data/Datamyne/Air/Master_Cleaned_Air_Contacts.xlsx`
- Create: `Backend/data/Datamyne/Ocean/Master_Cleaned_Ocean_Contacts.xlsx`
- Update: `Backend/data/Datamyne/Valid Contacts/Master_Cleaned_Contacts_Directory.xlsx`
- Update: `Backend/data/Datamyne/Missing Contacts/Master_Cleaned_Missing_Contacts_Directory.xlsx`

**Interfaces:**
- Consumes: Aggregated records from merged raw datasets
- Produces: Standardized `.xlsx` files with professional formatting, styling, and `Transport Mode` column

- [ ] **Step 1: Generate mode-specific master directories**
  - Compile `Master_Cleaned_Air_Contacts.xlsx` for Air leads.
  - Compile `Master_Cleaned_Ocean_Contacts.xlsx` for Ocean leads.
- [ ] **Step 2: Generate unified Master Cleaned Contacts directories**
  - Add explicit `Transport Mode` column (`Air`, `Ocean`, or `Air & Ocean`).
  - Standardize column order: `Company Name`, `Role`, `Transport Mode`, `Category`, `Subcategory`, `Contact Type`, `Phone`, `Email`, `Tax ID (IEC/PAN)`, `City`, `Address`, `PIN Code`, `Directors / Contact`, `Trade Lanes / Sectors`, `Top HS Codes`, `Total Shipments`, `Total FOB/CIF (USD)`, `Latest Activity Date`.
  - Format with Arial 10pt font, navy header fill (`#1F4E78`), zero formula errors, autofitted column widths.

---

### Task 5: Backend ETL Pipeline Update

**Files:**
- Modify: `Backend/src/etl/datamyne_etl.py`
- Output: `Backend/data/processed/datamyne_leads.csv`
- Output: `Backend/data/processed/datamyne_leads_zstd.parquet`
- Output: `Backend/data/processed/datamyne_valid_leads_zstd.parquet`
- Output: `Backend/data/processed/datamyne_missing_leads_zstd.parquet`

**Interfaces:**
- Consumes: Updated master directories in `Backend/data/Datamyne/`
- Produces: Standardized ZSTD Parquet and CSV files with `transport_mode` column

- [ ] **Step 1: Update column mappings in `datamyne_etl.py`**
  Add `"Transport Mode": "transport_mode"` to `col_mapping` and `target_columns`.
- [ ] **Step 2: Execute ETL pipeline**
  Run `uv run --with pandas,openpyxl,pyarrow python Backend/src/etl/datamyne_etl.py`.
- [ ] **Step 3: Verify output row counts and schema**
  Verify `datamyne_leads.csv` and parquet files contain valid `transport_mode` values (`Air`, `Ocean`, `Air & Ocean`).

---

### Task 6: Frontend Data & TypeScript Model Updates

**Files:**
- Modify: `Frontend/src/types/datamyneLead.ts`
- Modify: `Frontend/src/services/datamyneService.ts`
- Regenerate: `Frontend/public/data/datamyne_leads.json`
- Update: `Frontend/src/data/datamyneLeadsData.ts`

**Interfaces:**
- Consumes: Updated `datamyne_leads.csv`
- Produces: Frontend types and JSON mock data with `transport_mode`

- [ ] **Step 1: Update TypeScript interface in `datamyneLead.ts`**
  ```typescript
  export type TransportMode = 'Air' | 'Ocean' | 'Air & Ocean';
  export interface DatamyneLead {
    // ... existing fields
    transport_mode?: TransportMode;
  }
  export interface DatamyneFilterParams {
    // ... existing fields
    transportModes?: TransportMode[];
  }
  ```
- [ ] **Step 2: Export JSON dataset for frontend**
  Convert updated `datamyne_leads.csv` into `Frontend/public/data/datamyne_leads.json` and sync sample leads in `datamyneLeadsData.ts`.
- [ ] **Step 3: Update `datamyneService.ts` query filter logic**
  Add support for filtering by `transportModes` array in client-side queries and CSV export headers.

---

### Task 7: Frontend UI/UX Enhancement (Transport Mode Filter & Badges)

**Files:**
- Modify: `Frontend/src/components/datamyne/DatamyneFilterSidebar.tsx`
- Modify: `Frontend/src/components/datamyne/DatamyneTable.tsx`
- Modify: `Frontend/src/components/datamyne/DatamyneDetailDrawer.tsx`

**Interfaces:**
- Consumes: `transport_mode` from `DatamyneLead`
- Produces: Interactive Transport Mode accordion filter and visual badges in table/drawer

- [ ] **Step 1: Add Transport Mode filter accordion in `DatamyneFilterSidebar.tsx`**
  - Section with options: `✈️ Air Freight`, `🚢 Ocean Freight`, `✈️🚢 Multi-modal (Air & Ocean)`.
  - Active selection counter and reset binding.
- [ ] **Step 2: Add Transport Mode badge in `DatamyneTable.tsx`**
  - Display compact icon pill next to Company & Role:
    - Air: `bg-sky-50 text-sky-700 border-sky-200` with `Plane` icon
    - Ocean: `bg-cyan-50 text-cyan-700 border-cyan-200` with `Ship` icon
    - Multi-modal: `bg-indigo-50 text-indigo-700 border-indigo-200` with dual icons
- [ ] **Step 3: Display Transport Mode in `DatamyneDetailDrawer.tsx`**
  - Add Transport Mode chip and trade lane logistics details in the dossier header.

---

### Task 8: Verification, Test Suite & Documentation

**Files:**
- Test: `Frontend/src/test/datamyneLeads.test.ts`
- Documentation: `docs/DATAMYNE_AIR_OCEAN_SEGMENTATION_REPORT.md`

**Interfaces:**
- Consumes: Test runner and build tools
- Produces: 100% passing tests and production build

- [ ] **Step 1: Add unit tests for Transport Mode filtering**
  In `Frontend/src/test/datamyneLeads.test.ts`, add test cases verifying:
  - Filtering by `Air`, `Ocean`, and `Air & Ocean`
  - Export CSV includes `Transport Mode` column with formula sanitization
- [ ] **Step 2: Run all frontend tests**
  ```bash
  npm test -- --run
  ```
  Ensure all test files pass (69/69 tests or more).
- [ ] **Step 3: Run production build**
  ```bash
  npm run build
  ```
  Ensure 0 TypeScript errors and clean compilation.
- [ ] **Step 4: Generate completion documentation**
  Create `docs/DATAMYNE_AIR_OCEAN_SEGMENTATION_REPORT.md` with final record counts, deduplication metrics, and folder map.
