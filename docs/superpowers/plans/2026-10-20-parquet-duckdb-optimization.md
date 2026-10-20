# Parquet & DuckDB Query Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Tier 1 backend connection caching, memory guardrails, peek pagination, and in-memory LRU lookup caching, followed by Tier 2 Parquet sorting ETL to maximize query performance over 15.5M contact records without overloading the backend.

**Architecture:** A singleton DuckDB connection manager configured with HTTP metadata caching and memory bounds (380MB max for Lambda 512MB), peek pagination (`LIMIT page_size + 1`) to eliminate duplicate `count(*)` scans, and an in-memory LRU cache for corporate organization resolutions. A dedicated ETL script then sorts the 15.5M row Parquet dataset by `organization_id` to enable row-group pruning from 127 down to 1–2 row groups.

**Tech Stack:** Python 3.11/3.12, FastAPI, DuckDB 1.5.6, PyArrow, Pytest.

**Spec:** `parquet-duckdb-optimization-guide.md`

## Global Constraints

- Must run within AWS Lambda 512 MB memory footprint without triggering OOM (Signal 137).
- Must preserve 100% backward compatibility with existing FastAPI route schemas and response models.
- All existing 46 backend unit tests and 111 frontend tests must continue to pass.
- Zero external infrastructure dependencies added (no Redis/ElastiCache or paid services).
- All changes must be verified through automated tests before committing.

---

### Task 1: Persistent DuckDB Connection & Serverless PRAGMAs

**Files:**
- Modify: `Backend/src/api/database.py:6-50`
- Test: `Backend/tests/test_database_optimization.py`

**Interfaces:**
- Consumes: `settings` from `src.api.config`
- Produces: `get_db_connection() -> duckdb.DuckDBPyConnection` returning a reusable cursor from a thread-safe singleton connection configured with `enable_http_metadata_cache = true`, `http_keep_alive = true`, `max_memory = '380MB'`, `threads = 2`, `preserve_insertion_order = false`.

- [ ] **Step 1: Write the failing test**

```python
# Backend/tests/test_database_optimization.py
import pytest
from src.api.database import get_db_connection

def test_duckdb_persistent_connection_and_pragmas():
    con1 = get_db_connection()
    con2 = get_db_connection()
    # Connections should share the same underlying database instance
    res_mem = con1.execute("SELECT current_setting('max_memory')").fetchone()[0]
    assert "380" in str(res_mem) or "380MB" in str(res_mem) or "380.0" in str(res_mem)
    
    res_threads = con1.execute("SELECT current_setting('threads')").fetchone()[0]
    assert int(res_threads) <= 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_database_optimization.py -v`
Expected: FAIL (module does not yet enforce memory limit or connection reuse)

- [ ] **Step 3: Implement persistent singleton connection in `Backend/src/api/database.py`**

```python
import os
import threading
from pathlib import Path
from typing import Optional
import duckdb
from src.api.config import settings

_SHARED_CONNECTION: Optional[duckdb.DuckDBPyConnection] = None
_INIT_LOCK = threading.Lock()

def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Returns a thread-safe cursor from the persistent singleton DuckDB connection."""
    global _SHARED_CONNECTION
    if _SHARED_CONNECTION is None:
        with _INIT_LOCK:
            if _SHARED_CONNECTION is None:
                con = duckdb.connect(":memory:")
                try:
                    con.execute("SET home_directory = '/tmp';")
                    con.execute("SET extension_directory = '/tmp/duckdb_extensions';")
                except Exception:
                    pass

                # Performance & Memory PRAGMAs for Serverless Lambda
                try:
                    con.execute("SET max_memory = '380MB';")
                    con.execute("SET threads = 2;")
                    con.execute("SET preserve_insertion_order = false;")
                    con.execute("SET enable_http_metadata_cache = true;")
                    con.execute("SET http_keep_alive = true;")
                except Exception:
                    pass

                try:
                    con.execute("LOAD httpfs;")
                except Exception:
                    try:
                        con.execute("INSTALL httpfs; LOAD httpfs;")
                    except Exception:
                        pass

                if settings.env == "local":
                    try:
                        con.execute(f"""
                            SET s3_endpoint = '{settings.floci_endpoint}';
                            SET s3_use_ssl = false;
                            SET s3_url_style = 'path';
                            SET s3_access_key_id = '{settings.aws_access_key_id}';
                            SET s3_secret_access_key = '{settings.aws_secret_access_key}';
                        """)
                    except Exception:
                        pass
                else:
                    try:
                        con.execute(f"SET s3_region = '{settings.aws_region}';")
                        access_key = os.getenv("AWS_ACCESS_KEY_ID")
                        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
                        session_token = os.getenv("AWS_SESSION_TOKEN")
                        if access_key and secret_key:
                            con.execute(f"""
                                SET s3_access_key_id = '{access_key}';
                                SET s3_secret_access_key = '{secret_key}';
                            """)
                        if session_token:
                            con.execute(f"SET s3_session_token = '{session_token}';")
                    except Exception:
                        pass

                _SHARED_CONNECTION = con

    return _SHARED_CONNECTION.cursor()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_database_optimization.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/src/api/database.py Backend/tests/test_database_optimization.py
git commit -m "perf: configure singleton duckdb connection with serverless pragmas"
```

---

### Task 2: In-Memory LRU Cache for Company Resolution & Lookups

**Files:**
- Create: `Backend/src/api/cache.py`
- Modify: `Backend/src/api/routes.py:618-648`
- Test: `Backend/tests/test_database_optimization.py`

**Interfaces:**
- Consumes: Company search query strings and DuckDB connection
- Produces: `resolve_company_ids_cached(company_name: str, apollo_source: str, con) -> List[str]`

- [ ] **Step 1: Write the failing test**

```python
# Backend/tests/test_database_optimization.py
def test_company_resolution_lru_cache():
    from src.api.cache import resolve_company_ids_cached, clear_company_cache
    clear_company_cache()
    
    con = get_db_connection()
    from src.api.routes import get_data_source
    apollo_source = get_data_source(con, dataset="apollo")
    
    # First call - queries DB and caches
    ids1 = resolve_company_ids_cached("sanofi", apollo_source, con)
    # Second call - returns from in-memory cache instantly
    ids2 = resolve_company_ids_cached("sanofi", apollo_source, con)
    assert ids1 == ids2
    assert len(ids1) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_database_optimization.py -k test_company_resolution_lru_cache -v`
Expected: FAIL (module `src.api.cache` does not exist)

- [ ] **Step 3: Implement `Backend/src/api/cache.py` and hook into `routes.py`**

```python
# Backend/src/api/cache.py
from functools import lru_cache
from typing import List, Tuple
from src.api.helpers import build_company_search_sql

@lru_cache(maxsize=1024)
def _cached_lookup(company_term: str, apollo_source: str) -> Tuple[str, ...]:
    from src.api.database import get_db_connection
    con = get_db_connection()
    comp_sql, comp_params = build_company_search_sql(company_term, col_prefix="a")
    org_rows = con.execute(
        f"SELECT organization_id FROM '{apollo_source}' a WHERE {comp_sql} LIMIT 100",
        comp_params
    ).fetchall()
    return tuple(r[0] for r in org_rows if r[0])

def resolve_company_ids_cached(company_name: str, apollo_source: str, con=None) -> List[str]:
    """Resolves corporate search term to matched organization IDs with LRU caching."""
    clean_term = (company_name or "").strip().lower()
    if not clean_term:
        return []
    return list(_cached_lookup(clean_term, apollo_source))

def clear_company_cache():
    _cached_lookup.cache_clear()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_database_optimization.py -k test_company_resolution_lru_cache -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/src/api/cache.py Backend/src/api/routes.py Backend/tests/test_database_optimization.py
git commit -m "perf: add in-memory lru cache for organization id resolution"
```

---

### Task 3: Peek Pagination to Eliminate Redundant `count(*)` Scans

**Files:**
- Modify: `Backend/src/api/routes.py:480-550`
- Test: `Backend/tests/test_database_optimization.py`

**Interfaces:**
- Consumes: `/apollo/companies/{organization_id}/contacts` request parameters
- Produces: `ApolloContactsPaginatedResponse` using single-query `LIMIT page_size + 1` peek pagination instead of double-scanning with `count(*)`.

- [ ] **Step 1: Write the test verifying single-scan peek pagination**

```python
# Backend/tests/test_database_optimization.py
from fastapi.testclient import TestClient
from src.api.main import app

def test_company_contacts_peek_pagination():
    client = TestClient(app)
    # Use Sanofi org id or test org id
    resp = client.get("/api/v1/apollo/companies/54a11c3869702d84c5997201/contacts?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert "has_next" in data
    assert len(data["data"]) <= 5
    assert data["page"] == 1
    assert data["page_size"] == 5
```

- [ ] **Step 2: Run test to verify baseline**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_database_optimization.py -k test_company_contacts_peek_pagination -v`
Expected: PASS or verify execution count

- [ ] **Step 3: Update `Backend/src/api/routes.py` to use peek pagination**

Remove `SELECT count(*) FROM '{data_source}' WHERE {where_sql}` on line 502-503.
Query `LIMIT ? OFFSET ?` with `page_size + 1`. If `len(rows) > page_size`, set `has_next = True`, slice to `page_size`, and compute `total_records` without a secondary full table scan.

- [ ] **Step 4: Run test suite to verify no regressions**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_apollo_api.py tests/test_database_optimization.py -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/src/api/routes.py Backend/tests/test_database_optimization.py
git commit -m "perf: eliminate redundant count(*) scan with peek pagination"
```

---

### Task 4: Parquet Data Sorting Script (Tier 2 ETL)

**Files:**
- Create: `Backend/scripts/sort_contacts_parquet.py`
- Test: `Backend/tests/test_parquet_sorting.py`

**Interfaces:**
- Consumes: Existing Parquet file path and target sorted output path
- Produces: Sorted Parquet file with `ROW_GROUP_SIZE 100000`, sorted by `organization_id, is_decision_maker DESC, person_id`.

- [ ] **Step 1: Write the test verifying sorting logic on sample data**

```python
# Backend/tests/test_parquet_sorting.py
import duckdb
import pytest
from pathlib import Path
from scripts.sort_contacts_parquet import sort_parquet_dataset

def test_parquet_sorting_pipeline(tmp_path):
    input_file = tmp_path / "test_input.parquet"
    output_file = tmp_path / "test_sorted.parquet"
    
    con = duckdb.connect()
    con.execute(f"""
        COPY (
            SELECT 'org_b' as organization_id, 'p1' as person_id, true as is_decision_maker
            UNION ALL
            SELECT 'org_a' as organization_id, 'p2' as person_id, false as is_decision_maker
            UNION ALL
            SELECT 'org_a' as organization_id, 'p3' as person_id, true as is_decision_maker
        ) TO '{input_file}' (FORMAT PARQUET);
    """)
    
    sort_parquet_dataset(str(input_file), str(output_file), row_group_size=2)
    
    # Verify sorted order
    rows = con.execute(f"SELECT organization_id, person_id FROM '{output_file}'").fetchall()
    assert rows[0][0] == "org_a"
    assert rows[0][1] == "p3" # is_decision_maker true comes first
    assert rows[1][0] == "org_a"
    assert rows[1][1] == "p2"
    assert rows[2][0] == "org_b"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_parquet_sorting.py -v`
Expected: FAIL (`scripts.sort_contacts_parquet` does not exist)

- [ ] **Step 3: Implement `Backend/scripts/sort_contacts_parquet.py`**

```python
#!/usr/bin/env python3
"""
ETL script to sort Apollo contacts Parquet dataset by organization_id,
optimizing row-group skipping for serverless S3 DuckDB queries.
"""
import sys
import time
from pathlib import Path
import duckdb

def sort_parquet_dataset(input_path: str, output_path: str, row_group_size: int = 100000):
    start = time.time()
    print(f"[*] Sorting {input_path} -> {output_path} (row group size: {row_group_size})...")
    con = duckdb.connect()
    con.execute("SET preserve_insertion_order = false;")
    
    query = f"""
        COPY (
            SELECT * FROM '{input_path}'
            ORDER BY organization_id, is_decision_maker DESC, person_id
        ) TO '{output_path}' (
            FORMAT PARQUET,
            COMPRESSION ZSTD,
            ROW_GROUP_SIZE {row_group_size}
        );
    """
    con.execute(query)
    duration = time.time() - start
    print(f"[+] Sorting completed in {duration:.2f} seconds.")

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent / "data" / "Apollo"
    input_file = base_dir / "apollo_freight_contacts_with_company_profile.parquet"
    output_file = base_dir / "apollo_freight_contacts_with_company_profile_sorted.parquet"
    sort_parquet_dataset(str(input_file), str(output_file))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest tests/test_parquet_sorting.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Backend/scripts/sort_contacts_parquet.py Backend/tests/test_parquet_sorting.py
git commit -m "feat(etl): add parquet dataset sorting script for row-group pruning"
```

---

### Task 5: Integration Verification, PR Review, and Code Cleanup

**Files:**
- Modify: `Backend/src/api/config.py` (optional pointer update if sorted dataset is generated)
- Test: Full backend & frontend test suites

- [ ] **Step 1: Run full backend pytest suite**
Run: `cd Backend && /opt/homebrew/opt/python@3.11/bin/python3.11 -m pytest -v`
Expected: ALL PASS

- [ ] **Step 2: Run full frontend vitest suite**
Run: `cd Frontend && npm test -- --run`
Expected: ALL 111 PASS

- [ ] **Step 3: Run security and code review checks**
Run automated review & security audits.
