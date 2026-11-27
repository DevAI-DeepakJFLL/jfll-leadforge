# Aurora DSQL Multi-User Scaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Amazon Aurora DSQL database persistence with local SQLite fallback, unblock RBAC for sales reps, and ensure transparent frontend error handling and real-time multi-user team visibility.

**Architecture:** Distributed SQL backend client for Aurora DSQL with IAM authentication, dual-engine database layer (DSQL in cloud, SQLite locally), RBAC overhaul granting sales reps write access to assigned leads, and frontend error resilience.

**Tech Stack:** Python 3.11/3.12, FastAPI, Amazon Aurora DSQL, psycopg, SQLite, React 19, TypeScript, Vitest, Pytest.

**Spec:** `docs/superpowers/specs/2026-11-27-aurora-dsql-scaling-design.md`

## Global Constraints
- Target 20 concurrent sales users with sub-second response times.
- Zero breaking changes to existing REST endpoints (`/api/v1/lead-tracker`, `/api/v1/approach-logs`, `/api/v1/hot-leads`).
- Offline / Local Development must continue to work seamlessly without AWS credentials by automatically falling back to local SQLite.
- Standard sales reps must be able to view team leads and append interaction touchpoints to assigned leads.
- Never silently swallow API errors into browser `localStorage`.

---

### Task 1: Aurora DSQL Client & Database Abstraction Layer

**Files:**
- Create: `Backend/src/api/dsql_client.py`
- Test: `Backend/tests/test_dsql_client.py`
- Modify: `Backend/src/api/config.py`

**Interfaces:**
- Consumes: `settings.dsql_endpoint`, `settings.aws_region` from `config.py`
- Produces: `get_db_connection()`, `is_dsql_enabled()`, `execute_dsql_query()`, `init_dsql_schema()`

- [ ] **Step 1: Write the failing test for DSQL client abstraction**

```python
# Backend/tests/test_dsql_client.py
import pytest
from src.api.dsql_client import is_dsql_enabled, get_connection_manager

def test_dsql_disabled_by_default_in_local_env(monkeypatch):
    monkeypatch.delenv("DSQL_ENDPOINT", raising=False)
    assert is_dsql_enabled() is False

def test_dsql_enabled_when_endpoint_provided(monkeypatch):
    monkeypatch.setenv("DSQL_ENDPOINT", "test-cluster.dsql.ap-southeast-2.on.aws")
    assert is_dsql_enabled() is True
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest Backend/tests/test_dsql_client.py -v`  
Expected: FAIL with `ModuleNotFoundError: No module named 'src.api.dsql_client'`

- [ ] **Step 3: Implement `dsql_client.py` and update `config.py`**
Implement connection manager that uses IAM auth token when `DSQL_ENDPOINT` is present, with SQLite fallback for offline development.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest Backend/tests/test_dsql_client.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add Backend/src/api/dsql_client.py Backend/src/api/config.py Backend/tests/test_dsql_client.py
git commit -m "feat(dsql): add Aurora DSQL client connection manager with local fallback"
```

---

### Task 2: Aurora DSQL Relational DDL & Data Migration Script

**Files:**
- Create: `Backend/src/api/dsql_schema.py`
- Create: `Backend/scripts/migrate_to_dsql.py`
- Test: `Backend/tests/test_dsql_migration.py`

**Interfaces:**
- Consumes: `init_dsql_schema()` from `dsql_client.py`
- Produces: `migrate_sqlite_to_dsql()` function in `Backend/scripts/migrate_to_dsql.py`

- [ ] **Step 1: Write test for schema creation and migration idempotency**

```python
# Backend/tests/test_dsql_migration.py
from src.api.dsql_schema import DSQL_TABLES_DDL
from scripts.migrate_to_dsql import run_migration

def test_dsql_ddl_contains_core_tables():
    assert "lead_tracker_items" in DSQL_TABLES_DDL
    assert "lead_tracker_activities" in DSQL_TABLES_DDL
    assert "prospect_approach_logs" in DSQL_TABLES_DDL
    assert "hot_lead_contacts" in DSQL_TABLES_DDL
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest Backend/tests/test_dsql_migration.py -v`  
Expected: FAIL

- [ ] **Step 3: Implement `dsql_schema.py` and `migrate_to_dsql.py`**
Define PostgreSQL DDL strings and atomic migration logic importing data from SQLite into Aurora DSQL.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest Backend/tests/test_dsql_migration.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add Backend/src/api/dsql_schema.py Backend/scripts/migrate_to_dsql.py Backend/tests/test_dsql_migration.py
git commit -m "feat(dsql): add relational DDL schema and migration utility"
```

---

### Task 3: Backend Routes & RBAC Alignment for Team Collaboration

**Files:**
- Modify: `Backend/src/api/lead_tracker_routes.py`
- Modify: `Backend/src/api/approach_routes.py`
- Test: `Backend/tests/test_lead_tracker_routes.py`
- Test: `Backend/tests/test_approach_api.py`

**Interfaces:**
- Consumes: `require_lead_tracker_auth()`, `user["sub"]`, `user["name"]`, `user["role"]`
- Produces: Team-wide lead visibility, rep-level activity write permission, strict attribution lock.

- [ ] **Step 1: Write test asserting standard sales reps can view leads and append touchpoints**

```python
# In Backend/tests/test_lead_tracker_routes.py
def test_standard_sales_rep_can_view_leads_and_append_activity():
    h_rep = _auth_header(email="snehal.birje@jfll.com", name="Snehal Birje", role="Sales Representative")
    res = client.get("/api/v1/lead-tracker", headers=h_rep)
    assert res.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest Backend/tests/test_lead_tracker_routes.py -k test_standard_sales_rep_can_view_leads_and_append_activity -v`  
Expected: FAIL with `403 Forbidden`

- [ ] **Step 3: Update RBAC logic in `lead_tracker_routes.py` and `approach_routes.py`**
Allow authenticated sales team members to list leads and append activities, while locking reassignment and archiving to coordinators/admins.

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest Backend/tests/test_lead_tracker_routes.py Backend/tests/test_approach_api.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add Backend/src/api/lead_tracker_routes.py Backend/src/api/approach_routes.py Backend/tests/test_lead_tracker_routes.py
git commit -m "feat(rbac): permit sales representatives to view team leads and log assigned activities"
```

---

### Task 4: Frontend Error Transparency & Multi-User Activity Refresh

**Files:**
- Modify: `Frontend/src/services/leadTrackerService.ts`
- Modify: `Frontend/src/services/approachLogService.ts`
- Modify: `Frontend/src/components/tracker/LeadStatusTrackerView.tsx`
- Test: `Frontend/src/test/leadTrackerService.test.ts`
- Test: `Frontend/src/test/approachLog.test.tsx`

**Interfaces:**
- Consumes: REST API responses from `/api/v1/lead-tracker` and `/api/v1/approach-logs`
- Produces: Transparent error notifications on failed writes, automated background refresh for multi-user sync.

- [ ] **Step 1: Write test verifying errors are surfaced instead of silently swallowed**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update `leadTrackerService.ts` and `LeadStatusTrackerView.tsx`**
Throw and display actual error messages on 401/403/500 responses; add 30-second silent background refresh.
- [ ] **Step 4: Run test to verify it passes**
Run: `npm test -- src/test/leadTrackerService.test.ts src/test/approachLog.test.tsx`
- [ ] **Step 5: Commit**
```bash
git add Frontend/src/services/leadTrackerService.ts Frontend/src/components/tracker/LeadStatusTrackerView.tsx Frontend/src/test/leadTrackerService.test.ts
git commit -m "fix(frontend): surface API errors transparently and add periodic team lead synchronization"
```
