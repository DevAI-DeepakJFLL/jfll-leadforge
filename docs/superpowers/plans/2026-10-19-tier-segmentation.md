# Tier A / Tier B Segmentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an isolated, modular Tier A / Tier B segmentation engine that classifies DataMyne freight leads according to the JFLL SOP, complete with score breakdowns, separate subcategory audience tabs, accessible info popovers, and dynamic context banners.

**Architecture:** Pure backend Python scoring engine reading from DataMyne Parquet leads, cross-referencing JFLL Active Customers for exclusions, storing results in a decoupled companion Parquet table, exposing via an isolated FastAPI router `/api/v1/tiers`, and rendered in the frontend via a separate subcategory component (`TierAudienceTabs`, `SegmentContextBanner`, and `CategoryInfoTooltip`).

**Tech Stack:** Python 3.11, DuckDB, FastAPI, Pytest, React 19, TypeScript, Vitest, Tailwind CSS, Lucide React.

**Spec:** [`tier_segmentation_spec.md`](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Lead%20Sourcing%20Tool/tier_segmentation_spec.md)

## Global Constraints
- Python backend must preserve all existing docstrings and comments.
- Raw DataMyne dataset (`datamyne_leads_zstd.parquet`) must remain 100% intact and uncorrupted.
- The Tier A / Tier B feature must be isolated so that deleting `Frontend/src/components/tiers/` and `Backend/src/api/routes/tier_routes.py` leaves the rest of the application completely functional.
- All 13 test cases specified in Section 11 of `tier_segmentation_spec.md` must pass.
- Accessible UI/UX: Tooltips must use `CategoryInfoTooltip` with keyboard accessibility (Escape, Enter) and `stopPropagation()`.

---

### Task 1: Backend Pure Scoring Engine & Settings
**Files:**
- Create: `Backend/src/core/tier_rules_config.py`
- Create: `Backend/src/services/tier_scoring_engine.py`
- Test: `Backend/tests/test_tier_scoring.py`

**Interfaces:**
- Consumes: Lead dict with fields (`company_name`, `transport_mode`, `category`, `subcategory`, `trade_lanes`, `top_hs_codes`, `total_shipments`, `latest_activity_date`, `city`, etc.)
- Produces: `TierScoringRecord` containing `segment_status`, `tier_reason`, `total_score`, `base_score`, `bonus_points`, `score_breakdown`, `missing_fields`.

- [ ] **Step 1: Write the failing tests covering all 13 test cases in Section 11 of the spec**
- [ ] **Step 2: Run pytest to verify they fail**
- [ ] **Step 3: Implement `tier_rules_config.py` and `tier_scoring_engine.py`**
- [ ] **Step 4: Run pytest to verify all 13 test cases pass**
- [ ] **Step 5: Commit task 1**

---

### Task 2: Parquet Batch Processor & Isolated Backend API Router
**Files:**
- Create: `Backend/scripts/generate_tier_segments.py`
- Create: `Backend/src/api/routes/tier_routes.py`
- Modify: `Backend/src/api/main.py`
- Test: `Backend/tests/test_tier_api.py`

**Interfaces:**
- Consumes: `Backend/data/processed/datamyne_leads_zstd.parquet` & `Backend/data/processed/active_customers_leads_zstd.parquet`
- Produces: `Backend/data/processed/datamyne_tier_segments_zstd.parquet`, `/api/v1/tiers/leads`, `/api/v1/tiers/counts`

- [ ] **Step 1: Write test for tier API endpoints**
- [ ] **Step 2: Write batch script and generate `datamyne_tier_segments_zstd.parquet`**
- [ ] **Step 3: Implement `tier_routes.py` and register router in `main.py`**
- [ ] **Step 4: Run pytest to verify all API tests pass**
- [ ] **Step 5: Commit task 2**

---

### Task 3: Frontend Types, Service & Subcategory Filter Hook
**Files:**
- Create: `Frontend/src/types/tierSegmentation.ts`
- Create: `Frontend/src/services/tierService.ts`
- Create: `Frontend/src/hooks/useTierFilter.ts`
- Test: `Frontend/src/test/tierService.test.ts`

**Interfaces:**
- Consumes: Backend `/api/v1/tiers/...`
- Produces: `useTierFilter` hook, `fetchTieredLeads`, `fetchTierCounts`

- [ ] **Step 1: Write frontend tests for tier service and filtering**
- [ ] **Step 2: Implement types and service with offline starter fallback support**
- [ ] **Step 3: Run Vitest to verify tests pass**
- [ ] **Step 4: Commit task 3**

---

### Task 4: Modular Tier Subcategory UI with Info Popovers & Banners
**Files:**
- Create: `Frontend/src/components/tiers/TierAudienceTabs.tsx`
- Create: `Frontend/src/components/tiers/TierScoreBadge.tsx`
- Create: `Frontend/src/components/tiers/TierScoreBreakdownModal.tsx`
- Create: `Frontend/src/components/tiers/index.ts`
- Modify: `Frontend/src/components/datamyne/DatamyneView.tsx`
- Test: `Frontend/src/test/tierComponents.test.tsx`

**Interfaces:**
- Consumes: `CategoryInfoTooltip`, `SegmentContextBanner`, `TierAudienceTabs`
- Produces: Interactive subcategory tabs with popovers and context banner

- [ ] **Step 1: Write tests for `TierAudienceTabs` and `TierScoreBadge`**
- [ ] **Step 2: Implement components and integrate cleanly into `DatamyneView`**
- [ ] **Step 3: Run Vitest to verify all tests pass**
- [ ] **Step 4: Commit task 4**

---

### Task 5: End-to-End Verification & Build
- [ ] **Step 1: Run full frontend test suite (`npm test -- --run`)**
- [ ] **Step 2: Run full backend test suite (`PYTHONPATH=. pytest`)**
- [ ] **Step 3: Run frontend production build (`npm run build`)**
- [ ] **Step 4: Push to git repository**
