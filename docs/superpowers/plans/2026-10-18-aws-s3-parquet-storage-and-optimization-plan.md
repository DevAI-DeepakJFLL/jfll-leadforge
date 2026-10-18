# AWS S3 Parquet Storage & Serverless Query Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy all compressed analytical Parquet datasets (Active Customers, Inactive Customers, DataMyne, and Apollo) to AWS S3, configure the backend DuckDB query engine with local `/tmp` caching for sub-10ms query speeds, enforce AWS Free Tier zero-cost guardrails, and harden IAM/S3 security.

**Architecture:** 
- **Storage Layer:** Private Amazon S3 bucket (`s3://customer-master-leads/leads/`) hosting ~77.5 MB of Zstandard-compressed Parquet datasets with Block Public Access enabled and SSE-S3 encryption.
- **Query & Compute Layer:** Serverless FastAPI + DuckDB execution environment (AWS Lambda / ECS) utilizing an ephemeral `/tmp` SSD cache to download Parquet files once on cold start, executing all subsequent analytical queries locally in 2–5ms with zero network roundtrips.
- **Security & Cost Guardrails:** IAM least-privilege role (`s3:GetObject` only), zero public S3 bucket exposure, parameterized SQL injection shielding, and S3 request optimization keeping monthly usage well under the 20,000 free GET requests ceiling.

**Tech Stack:** AWS S3, AWS IAM, Python 3.12+, Boto3, DuckDB (HTTPFS & Parquet), FastAPI, Pytest, Vitest.

**Spec:** [`Backend/docs/API_DOCUMENTATION.md`](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Lead%20Sourcing%20Tool/Backend/docs/API_DOCUMENTATION.md) and [`Backend/data/Apollo/DATA_PROCESSING_WORKFLOW.md`](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Lead%20Sourcing%20Tool/Backend/data/Apollo/DATA_PROCESSING_WORKFLOW.md).

## Global Constraints
- Target 100% AWS Free Tier compliance ($0.00 / month cost).
- Zero data files (`.xlsx`, `.csv`, `.parquet`, `.tsv`) committed to GitHub.
- S3 bucket must have Block All Public Access enabled.
- Parquet read queries must remain parameterized to prevent SQL injection.
- Zero data loss: All 690,881 Apollo leads, 34,690 DataMyne leads, and 2,544 Customer leads must remain bit-for-bit intact.

---

### Task 1: S3 Bucket Configuration & IAM Security Specification

**Files:**
- Create: `Backend/docs/AWS_S3_SECURITY_POLICY.json`
- Modify: `Backend/src/api/config.py`
- Test: `Backend/tests/test_config.py`

**Interfaces:**
- Consumes: Environment variables (`S3_BUCKET`, `AWS_REGION`, `S3_CACHE_DIR`, `ENV`)
- Produces: `Settings.s3_bucket`, `Settings.s3_leads_prefix`, `Settings.s3_uri_for(dataset: str)`, `Settings.cache_dir`

- [ ] **Step 1: Write failing test for extended S3 configuration**

```python
# Backend/tests/test_config.py
import os
from pathlib import Path
from src.api.config import settings

def test_s3_multi_dataset_uri_generation():
    assert "apollo_freight_leads_zstd.parquet" in settings.s3_uri_for("apollo")
    assert "datamyne_leads_zstd.parquet" in settings.s3_uri_for("datamyne")
    assert "active_customers_leads_zstd.parquet" in settings.s3_uri_for("active")
    assert "inactive_customers_leads_zstd.parquet" in settings.s3_uri_for("inactive")

def test_cache_dir_configuration():
    assert isinstance(settings.cache_dir, Path)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_config.py -v`  
Expected: FAIL (AttributeError: 'Settings' object has no attribute 's3_uri_for')

- [ ] **Step 3: Update `Backend/src/api/config.py` and create IAM policy**

In `Backend/src/api/config.py`, add `s3_leads_prefix`, `cache_dir` (defaulting to `/tmp/lead_cache` in Lambda/production or `Backend/data/processed` in local), and the `s3_uri_for(dataset: str)` helper method.

Create `Backend/docs/AWS_S3_SECURITY_POLICY.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLambdaReadLeadParquetOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::customer-master-leads/leads/*.parquet"
    }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_config.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/docs/AWS_S3_SECURITY_POLICY.json Backend/src/api/config.py Backend/tests/test_config.py
git commit -m "feat(aws): define IAM security policy and multi-dataset S3 configuration"
```

---

### Task 2: Robust Parquet S3 Upload Pipeline & Integrity Verification

**Files:**
- Modify: `Backend/scripts/upload_to_aws_s3.py`
- Create: `Backend/tests/test_upload_s3.py`

**Interfaces:**
- Consumes: Processed Parquet files from `Backend/data/processed/*.parquet`
- Produces: CLI interface supporting `--bucket`, `--region`, `--dry-run`, `--verify`

- [ ] **Step 1: Write test for upload script dry-run and integrity verification**

```python
# Backend/tests/test_upload_s3.py
from pathlib import Path
from scripts.upload_to_aws_s3 import get_parquet_files_to_upload

def test_parquet_file_discovery():
    files = get_parquet_files_to_upload()
    file_names = [f.name for f in files]
    assert "apollo_freight_leads_zstd.parquet" in file_names
    assert "datamyne_leads_zstd.parquet" in file_names
    assert "active_customers_leads_zstd.parquet" in file_names
    assert "inactive_customers_leads_zstd.parquet" in file_names
    assert len(files) >= 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_upload_s3.py -v`  
Expected: FAIL (ImportError: cannot import name 'get_parquet_files_to_upload')

- [ ] **Step 3: Update `Backend/scripts/upload_to_aws_s3.py`**

Refactor `Backend/scripts/upload_to_aws_s3.py` to extract `get_parquet_files_to_upload()`, add `--dry-run` flag, and add SHA-256 / row-count integrity checking after upload.

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_upload_s3.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/scripts/upload_to_aws_s3.py Backend/tests/test_upload_s3.py
git commit -m "feat(aws): add dry-run and integrity verification to S3 upload script"
```

---

### Task 3: Backend Ephemeral `/tmp` Caching Engine for Zero S3 Overhead

**Files:**
- Modify: `Backend/src/api/database.py`
- Test: `Backend/tests/test_caching.py`

**Interfaces:**
- Consumes: S3 Parquet datasets via Boto3, local directory `/tmp/lead_cache/`
- Produces: `get_cached_parquet_path(dataset_name: str) -> Path`

- [ ] **Step 1: Write test for `/tmp` cache logic**

```python
# Backend/tests/test_caching.py
import os
from pathlib import Path
from src.api.database import get_cached_parquet_path

def test_local_dev_fallback_returns_existing_path():
    path = get_cached_parquet_path("active")
    assert path.exists()
    assert path.suffix == ".parquet"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_caching.py -v`  
Expected: FAIL (ImportError: cannot import name 'get_cached_parquet_path')

- [ ] **Step 3: Implement `get_cached_parquet_path` in `Backend/src/api/database.py`**

Implement the caching mechanism:
1. In `ENV=local`: if `Backend/data/processed/<name>.parquet` exists, return immediately.
2. In `ENV=production` / AWS Lambda: Check if `/tmp/lead_cache/<name>.parquet` exists and file size > 0.
3. If not cached, download from S3 (`s3.download_file`) once into `/tmp/lead_cache/<name>.parquet`.
4. Return local Path for DuckDB to query locally via memory-mapped IO.

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_caching.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/src/api/database.py Backend/tests/test_caching.py
git commit -m "perf(backend): implement local /tmp SSD caching for zero S3 request overhead"
```

---

### Task 4: Apollo Freight Shippers API Endpoints

**Files:**
- Modify: `Backend/src/api/routes.py`
- Modify: `Backend/src/api/models.py`
- Test: `Backend/tests/test_apollo_api.py`

**Interfaces:**
- Consumes: `apollo_freight_leads_zstd.parquet` via `get_cached_parquet_path("apollo")`
- Produces: `GET /api/v1/apollo/leads` (paginated, filtered by industry, country, employee count, phone presence) and `GET /api/v1/apollo/stats`

- [ ] **Step 1: Write failing test for Apollo leads endpoint**

```python
# Backend/tests/test_apollo_api.py
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

def test_apollo_leads_endpoint_pagination():
    response = client.get("/api/v1/apollo/leads?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert data["total"] == 690881
    assert len(data["items"]) == 10

def test_apollo_leads_industry_filter():
    response = client.get("/api/v1/apollo/leads?industry=automotive&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert all(item["industry"] == "automotive" for item in data["items"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_apollo_api.py -v`  
Expected: FAIL (HTTP 404 Not Found)

- [ ] **Step 3: Implement Apollo models & API routes**

1. In `Backend/src/api/models.py`, add `ApolloLeadItem` and `ApolloPaginatedResponse`.
2. In `Backend/src/api/routes.py`, add `@router.get("/apollo/leads")` with parameterized DuckDB query filters (`industry`, `country`, `min_employees`, `search`).

- [ ] **Step 4: Run test to verify it passes**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/test_apollo_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/src/api/models.py Backend/src/api/routes.py Backend/tests/test_apollo_api.py
git commit -m "feat(api): implement paginated Apollo freight leads search and filtering endpoints"
```

---

### Task 5: End-to-End Verification & AWS Free Tier Runbook

**Files:**
- Create: `Backend/docs/AWS_FREE_TIER_DEPLOYMENT_RUNBOOK.md`
- Test: Full Vitest + Pytest suites

- [ ] **Step 1: Run full Vitest frontend suite**

Run: `npm test -- --run` (in `Frontend/`)  
Expected: 78/78 tests pass.

- [ ] **Step 2: Run full Pytest backend suite**

Run: `PYTHONPATH=Backend uv run --with-requirements Backend/requirements.txt --with pytest python3 -m pytest Backend/tests/`  
Expected: All tests pass.

- [ ] **Step 3: Create `Backend/docs/AWS_FREE_TIER_DEPLOYMENT_RUNBOOK.md`**

Document:
1. Exact AWS Console walkthrough to create the S3 bucket with Block Public Access and SSE-S3.
2. Step-by-step upload command with credentials.
3. Verification command to confirm sub-10ms query execution.
4. AWS Billing Alert setup guide ($0.01 alarm threshold to guarantee Free Tier compliance).

- [ ] **Step 4: Commit**

```bash
git add Backend/docs/AWS_FREE_TIER_DEPLOYMENT_RUNBOOK.md
git commit -m "docs(aws): create comprehensive AWS Free Tier deployment runbook"
```
