# Sales Approach Sync and Re-Render Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the sales approach log desynchronization where approach activities logged by team members (like Snehal) fail to reflect across other accounts, ensuring real-time multi-user consistency, active outbox syncing, and immediate UI re-rendering.

**Architecture:** 
1. **Frontend Event & Sync Architecture:** Update `approachLogService.ts` to dispatch `APPROACH_STATUS_CHANGED_EVENT` immediately upon completing `fetchBulkStatuses()`, triggering instant table badge re-renders. Trigger `syncPendingApproachOutbox()` on app initialization and user login, rather than relying solely on the browser `online` event.
2. **Offline Transparency:** Provide clear user feedback when logging offline so salespeople know a log is queued in their browser rather than confirmed on the server.
3. **Backend Multi-Container Cache Invalidation:** Add a short-lived cache TTL (10s) in `Backend/src/api/approach_routes.py` on AWS Lambda to ensure warm containers pull fresh updates from S3 instead of serving stale `/tmp` files.

**Tech Stack:** React 18, TypeScript, Vitest, FastAPI, Python 3.12, DuckDB, AWS Lambda/S3.

**Spec:** Issue root-cause analysis from conversation:
- Problem 1: `fetchBulkStatuses()` updates module-level cache but never notifies listeners or triggers React re-render.
- Problem 2: Offline outbox only flushes on window `online` event; silent fallback gives false sense of server persistence.
- Problem 3: Warm Lambda containers only read S3 on cold start (`if not storage_path.exists()`), creating multi-container desync.

## Global Constraints
- Ponytail doctrine: Smallest working change, no new external dependencies, total net diff < 80 lines.
- Zero breaking changes to existing approach status schema or audit logs.
- All 26 existing frontend Vitest tests and 9 backend pytest tests must pass.

---

### Task 1: Dispatch UI Update Event on Server Bulk Status Fetch & App Mount Sync

**Files:**
- Modify: `Frontend/src/services/approachLogService.ts`
- Modify: `Frontend/src/App.tsx`
- Test: `Frontend/src/test/approachLog.test.tsx`

**Interfaces:**
- Consumes: `APPROACH_STATUS_CHANGED_EVENT`, `syncPendingApproachOutbox()`
- Produces: `fetchBulkStatuses()` automatically dispatches `APPROACH_STATUS_CHANGED_EVENT` so all tables re-render with fresh server data.

- [ ] **Step 1: Write failing frontend test in `Frontend/src/test/approachLog.test.tsx`**
  - Assert that calling `fetchBulkStatuses` dispatches `APPROACH_STATUS_CHANGED_EVENT`.
  - Assert that `syncPendingApproachOutbox` is exported and runnable on app boot.

- [ ] **Step 2: Run Vitest to verify test fails**
  - Run: `cd Frontend && npm test -- src/test/approachLog.test.tsx`

- [ ] **Step 3: Implement the fix in `Frontend/src/services/approachLogService.ts` and `Frontend/src/App.tsx`**
  - In `fetchBulkStatuses()`: After `cachedBulkStatuses[entityType] = { ...statusMap };`, dispatch `window.dispatchEvent(new CustomEvent(APPROACH_STATUS_CHANGED_EVENT))`.
  - In `approachLogService.ts`: Run `syncPendingApproachOutbox().catch(() => {})` at module initialization.
  - In `Frontend/src/App.tsx`: In the startup `useEffect`, call `syncPendingApproachOutbox().catch(() => {})`.

- [ ] **Step 4: Run Vitest and confirm all tests pass**
  - Run: `cd Frontend && npm test -- src/test/approachLog.test.tsx`

- [ ] **Step 5: Commit Task 1**
  - Run: `git commit -m "fix(approach): dispatch change event on bulk status fetch and auto-flush outbox on boot"`

---

### Task 2: Explicit Offline Feedback in Approach Modal

**Files:**
- Modify: `Frontend/src/services/approachLogService.ts`
- Modify: `Frontend/src/components/approach/LogApproachModal.tsx`
- Test: `Frontend/src/test/approachLog.test.tsx`

**Interfaces:**
- Consumes: `EntityApproachHistory`, `ApproachLogCreatePayload`
- Produces: `is_offline_pending: boolean` attribute on locally saved approach history.

- [ ] **Step 1: Write failing frontend test in `Frontend/src/test/approachLog.test.tsx`**
  - Test that `logApproachActivity` in offline mode flags the record as `is_offline_pending: true`.

- [ ] **Step 2: Run Vitest to verify test fails**
  - Run: `cd Frontend && npm test -- src/test/approachLog.test.tsx`

- [ ] **Step 3: Implement fix in `approachLogService.ts` & `LogApproachModal.tsx`**
  - When network request throws in `logApproachActivity`, attach `is_offline_pending = true` to the local store and returned object.
  - In `LogApproachModal.tsx`: If `result.is_offline_pending`, show warning toast: `Logged offline (queued to sync with server)`. Otherwise show success toast: `Logged approach: ${action} (${selectedStatus})`.

- [ ] **Step 4: Run Vitest and confirm all tests pass**
  - Run: `cd Frontend && npm test -- src/test/approachLog.test.tsx`

- [ ] **Step 5: Commit Task 2**
  - Run: `git commit -m "fix(approach): alert user when approach log is saved in offline queue"`

---

### Task 3: Multi-Container Lambda S3 Cache Refresh

**Files:**
- Modify: `Backend/src/api/approach_routes.py`
- Test: `Backend/tests/test_approach_api.py`

**Interfaces:**
- Consumes: `_restore_from_s3()`, `load_approach_data()`
- Produces: Periodic S3 refresh on warm AWS Lambda containers (TTL: 10 seconds).

- [ ] **Step 1: Write failing backend test in `Backend/tests/test_approach_api.py`**
  - Test that when S3 has updated data, a warm container with an expired cache TTL re-syncs from S3.

- [ ] **Step 2: Run pytest to verify test fails**
  - Run: `Backend/.venv/bin/pytest Backend/tests/test_approach_api.py`

- [ ] **Step 3: Implement fix in `Backend/src/api/approach_routes.py`**
  - Add `_LAST_S3_CHECK: float = 0.0`.
  - In `load_approach_data()`: If running in AWS Lambda and `time.time() - _LAST_S3_CHECK > 10.0`, call `_restore_from_s3(storage_path)` before checking mtime, updating `_LAST_S3_CHECK = time.time()`.

- [ ] **Step 4: Run pytest and confirm all 9 tests pass**
  - Run: `Backend/.venv/bin/pytest Backend/tests/test_approach_api.py`

- [ ] **Step 5: Commit Task 3**
  - Run: `git commit -m "fix(approach): invalidate lambda cache after 10s to ensure multi-container s3 consistency"`

---

### Task 4: End-to-End Verification & Documentation

- [ ] **Step 1: Run complete test suites**
  - Frontend: `cd Frontend && npm test`
  - Backend: `Backend/.venv/bin/pytest Backend/tests/`
- [ ] **Step 2: Verify live build**
  - `cd Frontend && npm run build`
- [ ] **Step 3: Document resolution in git log**
