# All JFLL Customer Data ETL & Extra Fields Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run a Ponytail audit review on each phase.

**Goal:** Ingest and process the latest raw master customer file `Backend/data/raw/Customer List From 1.04.2026 till Date.csv` (2,223 accounts with extra fields: Credit Status, Sales Person, Total Business from 1.04.2024 till date). Process it using the established Active Customer pipeline standards (entity normalization, contact enrichment from master lists and DataMyne, customer group classification, legal type inference, ZSTD Parquet generation, and professional Excel formatting per `xlsx` skill), and wire the new data into both Backend DuckDB services and Frontend dashboards.

---

## 1. Executive Summary & Ponytail Baseline

### What the New Raw File Contains
- **File**: `Backend/data/raw/Customer List From 1.04.2026 till Date.csv`
- **Total Records**: 2,223 records (all non-null full names and credit statuses)
- **Fields Provided**:
  1. `Full Name`: Corporate identity
  2. `Credit Status`: Risk rating (`approved`, `blocked`, `no_credit`, `high_risk`, `moderate_risk`)
  3. `Sales Person`: Assigned account manager / sales rep (2,202 non-null)
  4. `Total Business from 1.04.2024 till date`: Monetary revenue in INR (ranging from ₹909 to ₹74.6 Crore, mean ~₹60 Lakhs)

### Overlap Analysis with Existing System
- **579 records (100%)** match the existing Active Customer dataset (`Active Customer List For the Last 3 Month.xlsx` — 578 records). These represent **Active Customers** (active within the 3-month window).
- **1,275 records** match existing Inactive customer accounts in `Customer with contact.xlsx`. They now receive previously missing operational fields: Credit Status, Sales Person, and Total Business Revenue!
- **369 records** are newly added customer accounts previously unlisted in the system.
- **1,971 / 2,223 records (88.7%)** achieve direct automated contact enrichment (Contact Person, Phone Number, Email) through our multi-source corporate entity resolution against:
  1. `Backend/data/processed/active_customers_leads.csv`
  2. `Backend/data/raw/Customer with contact.xlsx`
  3. `Backend/data/.backups/2026-10-17-pre-customer-dedup/Customer with contact.xlsx`
  4. `Backend/data/processed/datamyne_leads_zstd.parquet`

---

## 2. Architecture & File Structure

```
Backend/
  data/
    raw/
      Customer List From 1.04.2026 till Date.csv          # Source input file (2,223 rows)
      Customer with contact.xlsx                          # Updated clean master Excel (per xlsx skill)
    processed/
      all_customers_leads.csv                             # Full 2,223 master records CSV
      all_customers_leads_zstd.parquet                    # High-speed ZSTD Parquet for DuckDB
      active_customers_leads.csv                          # Updated Active (3M) CSV
      active_customers_leads_zstd.parquet                 # Updated Active (3M) Parquet
      inactive_customers_leads.csv                        # Updated Inactive CSV
      inactive_customers_leads_zstd.parquet               # Updated Inactive Parquet
  scripts/
    process_all_jfll_customers.py                         # Enterprise ETL pipeline script
  src/api/
    config.py                                             # Register all_customers dataset
    models.py                                             # Add total_business_till_date to schema
    routes.py                                             # Support total_business_till_date sorting/filtering
  tests/
    test_all_customers_etl.py                             # Pytest suite for ETL integrity

Frontend/
  src/
    types/
      jfllCustomer.ts                                     # Add totalBusinessTillDate to Zod schema & types
    data/
      jfllCustomersData.ts                                # Enriched Active customer data
      jfllInactiveCustomersData.ts                        # Enriched Inactive customer data
      jfllAllCustomersData.ts                             # Enriched 2,223 All Customer dataset
    services/
      jfllCustomerService.ts                              # Support totalBusinessTillDate & updated queries
    components/jfll/
      JfllCustomerTable.tsx                               # Render total business revenue pill / column
      JfllCustomerDetailDrawer.tsx                        # Display total revenue & sales rep details
    test/
      jfllCustomers.test.ts                               # Vitest suite covering all 2,223 records
```

---

## 3. Implementation Phases & Bite-Sized Tasks

### Phase 1: Data Engineering & ETL Pipeline (`process_all_jfll_customers.py`)

- [ ] **Task 1.1: Build Enterprise Corporate Entity Matcher & Cleaner**
  - Implement regex normalization `normalize_company` and corporate suffix stripping `clean_corp_stem`.
  - Parse phone strings into valid 10-digit Indian numbers formatted with `+91-XXXXXXXXXX`.
  - Validate and clean email addresses, rejecting placeholder domains.
  - Parse `Total Business from 1.04.2024 till date` into clean float numbers.

- [ ] **Task 1.2: Multi-Source Contact Enrichment & Classification**
  - Match raw records against Active Leads, Raw Contact Excel, Master Backup Excel, and DataMyne Parquet.
  - Infer `Customer Group`:
    - "Subagent" for logistics, freight, cargo, forwarder, airline, sub-broker keywords.
    - "Overseas Agent" for global, overseas, international, GmbH, B.V., LLC, Sdn Bhd.
    - "Shipper / Consignee" for direct manufacturing/commercial shippers.
  - Infer `Type`: Private Limited, Public Limited, LLP, Partnership, Individual / Proprietorship, Company.
  - Determine `Status`:
    - `'Active'` if matching the 3-month active customer accounts (578 records).
    - `'Not Active'` if inactive over 3 months.

- [ ] **Task 1.3: Run Ponytail Audit Review on Phase 1**
  - Audit: Correctness, edge cases, matching accuracy, zero data loss, DRY clean code.

---

### Phase 2: Multi-Format Data Exports (Parquet, CSV, Excel)

- [ ] **Task 2.1: Generate Production Parquet & CSV Datasets**
  - Generate `all_customers_leads_zstd.parquet` (2,223 rows, compressed with ZSTD).
  - Generate `all_customers_leads.csv` (UTF-8 with BOM for Excel compatibility).
  - Regenerate updated `active_customers_leads_zstd.parquet` and `inactive_customers_leads_zstd.parquet`.

- [ ] **Task 2.2: Format Deliverable Excel per `xlsx` Skill Guidelines**
  - Generate `Backend/data/raw/Customer with contact.xlsx` (and formatted All Customers export) using `openpyxl`.
  - Font: Calibri 10pt (consistent, professional font).
  - Headers: Height 26pt, Dark Navy fill (`#1F4E78`), Bold White text, centered/wrap.
  - Number formatting: Currency format for Total Business (`₹#,##0;[Red](₹#,##0);"-"`).
  - Auto-fit column widths with deliberate safety margins.
  - Freeze panes (`A2`) and enable visible gridlines.

- [ ] **Task 2.3: Run Ponytail Audit Review on Phase 2**
  - Audit: File sizes, schema integrity, zero formula/formatting errors, Excel visual hierarchy.

---

### Phase 3: Backend API & DuckDB Query Optimization

- [ ] **Task 3.1: Update Backend Configuration & Dataset Registry**
  - In `Backend/src/api/config.py`: Add `"all_customers": "all_customers_leads_zstd.parquet"`.
  - In `Backend/src/api/models.py`: Add `total_business_till_date: float | None = None` to `LeadResponse`.

- [ ] **Task 3.2: Update DuckDB Lead Querying & Sorting**
  - In `Backend/src/api/routes.py`:
    - Expose `total_business_till_date` in SQL projections.
    - Support sorting by `total_business_till_date` (or `totalBusinessTillDate`).
    - Support revenue range filtering across both `Total Business Received From Cusomer In Last 3 Month` and `Total Business from 1.04.2024 till date`.

- [ ] **Task 3.3: Write Pytest Test Suite (`test_all_customers_etl.py`)**
  - Test Parquet row counts, column types, non-null guarantees, and DuckDB queries.
  - Run full Pytest suite (must pass 105+/105).

- [ ] **Task 3.4: Run Ponytail Audit Review on Phase 3**
  - Audit: Query latency (<15ms via DuckDB), SQL injection safety (parameterized queries), backward compatibility.

---

### Phase 4: Frontend Types, Datasets & UI Integration

- [ ] **Task 4.1: Update TypeScript Schema & Types**
  - In `Frontend/src/types/jfllCustomer.ts`:
    - Add `totalBusinessTillDate: z.number().optional()` to `JfllCustomerSchema`.
    - Add `totalBusinessTillDate` to sort fields.

- [ ] **Task 4.2: Generate Frontend TS Data Files**
  - Generate `Frontend/src/data/jfllCustomersData.ts` (Active records enriched with `totalBusinessTillDate`).
  - Generate `Frontend/src/data/jfllInactiveCustomersData.ts` (Inactive records enriched with `creditStatus`, `salesPerson`, and `totalBusinessTillDate`).
  - Generate `Frontend/src/data/jfllAllCustomersData.ts` (Unified 2,223 master dataset).

- [ ] **Task 4.3: Update Customer Service & Filters**
  - In `Frontend/src/services/jfllCustomerService.ts`:
    - Support sorting by `totalBusinessTillDate`.
    - Apply revenue range filters to `totalBusinessTillDate` when viewing Inactive or All Customers.
    - Update audience counts dynamically.

- [ ] **Task 4.4: Enhance UI Table & Drawer Components**
  - In `JfllCustomerTable.tsx`: Display formatted revenue badge for `totalBusinessTillDate`.
  - In `JfllCustomerDetailDrawer.tsx`: Show Total Business (Till Date), Credit Status badge, and assigned Sales Person.

- [ ] **Task 4.5: Run Ponytail Audit Review on Phase 4**
  - Audit: Clean UI hierarchy, responsive tables, zero layout shift, keyboard accessibility.

---

### Phase 5: Verification, Benchmarking & Completion

- [ ] **Task 5.1: Run Full Automated Test Suites**
  - Run Vitest frontend suite: `npm test --prefix Frontend` (all 23+ files pass).
  - Run Pytest backend suite: `pytest Backend/tests` (all 105+ tests pass).
  - Run production build: `npm run build --prefix Frontend` (`tsc && vite build`).

- [ ] **Task 5.2: Final Comprehensive Ponytail Audit Report**
  - Review all modified files against Ponytail principles: smallest complete change, no bloat, correct, safe, fast.
  - Commit and push to `origin/main`.
