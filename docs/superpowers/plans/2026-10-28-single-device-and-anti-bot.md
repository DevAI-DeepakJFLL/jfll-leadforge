# Single-Device Session & Anti-Bot Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement single-device session enforcement (preventing concurrent logins with the same user ID across multiple devices) and multi-layered anti-bot protection (blocking headless browsers, Playwright/Puppeteer/Selenium, and browser agents from accessing or operating the application).

**Architecture:**
- **Single-Device Session:** The backend issues a unique `session_id` inside each signed HMAC-SHA256 JWT and tracks the active `session_id` per user email in memory. Logging in from a second device supersedes the older session. Subsequent requests from the displaced device return HTTP 401 with `detail="SESSION_SUPERSEDED"`. The frontend intercepts this, clears local credentials, and displays a security modal prompt.
- **Anti-Bot & Headless Defense:** Client-side runtime heuristics (`navigator.webdriver`, headless plugins, screen dimension consistency, WebGL software rasterizer signatures, and framework global artifacts) run before React mounts, halting execution and showing a hard "Access Denied" screen if an automated browser is detected. The login request carries a cryptographic client verification token, and the backend validates Client Hints and blocks headless User-Agents.

**Tech Stack:** FastAPI (Python), HMAC-SHA256 JWT, React 18, TypeScript, Tailwind CSS, Vitest, Pytest.

**Spec / Scope:**
- Single active session per work email.
- Real-time kick-out of previous device upon new login.
- Zero external heavy dependencies (lean, native Python and TypeScript).
- Hard block against headless and automated browser runners.

---

## File Structure

### Backend
- `Backend/src/api/auth.py`: Active session registry, `session_id` generation in JWT, `verify_token` session check, anti-bot header validation, `/heartbeat` endpoint.
- `Backend/src/api/models.py`: `LoginRequest` with client verification token, `UserSessionResponse` with `session_id`.
- `Backend/src/api/helpers.py`: `require_auth` with active session verification.
- `Backend/tests/test_api.py`: Tests for single-device displacement and anti-bot validation.

### Frontend
- `Frontend/src/utils/antiBotGuard.ts`: Client-side headless browser & automation detection heuristics, verification token generator.
- `Frontend/src/components/auth/SessionSupersededModal.tsx`: Modal displayed when user is displaced by another device.
- `Frontend/src/services/authService.ts`: Pass anti-bot verification token in login payload, listen for `SESSION_SUPERSEDED`.
- `Frontend/src/App.tsx`: Heartbeat check, global session invalidation listener.
- `Frontend/src/main.tsx`: Run anti-bot guard before React tree mounts.
- `Frontend/src/test/auth.test.ts`: Tests for session invalidation handling.

---

## Tasks

### Task 1: Backend Active Session Tracking & Displacement

**Files:**
- Modify: `Backend/src/api/auth.py`
- Modify: `Backend/src/api/models.py`
- Modify: `Backend/src/api/helpers.py`
- Test: `Backend/tests/test_api.py`

- [ ] **Step 1: Write failing tests for single-device session displacement**
  Add tests in `Backend/tests/test_api.py`:
  - `test_single_device_session_displacement`:
    1. User logs in with `deepak.naidu@jfll.com` (receives Token 1).
    2. Token 1 can access `/api/v1/auth/me`.
    3. User logs in again from a second device (receives Token 2).
    4. Token 1 is now rejected on `/api/v1/auth/me` with status 401 and `detail="SESSION_SUPERSEDED"`.
    5. Token 2 succeeds on `/api/v1/auth/me`.

- [ ] **Step 2: Run test to confirm failure**
  Run `cd Backend && uv run pytest tests/test_api.py -k test_single_device_session_displacement` to verify it fails.

- [ ] **Step 3: Implement active session registry and `session_id` in `auth.py`**
  - In `Backend/src/api/auth.py`:
    - Maintain `active_user_sessions: dict[str, str] = {}` (mapping `email -> session_id`).
    - In `create_token`, generate a `session_id = secrets.token_hex(16)` and embed in JWT claims.
    - In `login()`, update `active_user_sessions[input_email] = session_id`.
    - In `verify_token()`, compare `payload.get("session_id")` against `active_user_sessions.get(email)`. If mismatch, raise or flag session as superseded.
    - In `get_current_user()` and `require_auth()`, if session is superseded, raise `HTTPException(status_code=401, detail="SESSION_SUPERSEDED")`.
    - Add endpoint `GET /api/v1/auth/heartbeat` returning `{"active": True, "session_id": session_id}`.

- [ ] **Step 4: Run tests to verify they pass**
  Run `cd Backend && uv run pytest tests/test_api.py` to confirm all tests pass.

- [ ] **Step 5: Commit changes**
  Commit: `feat(auth): enforce single-device active session with real-time displacement`.

---

### Task 2: Backend Anti-Headless & Anti-Bot Request Shield

**Files:**
- Modify: `Backend/src/api/auth.py`
- Modify: `Backend/src/api/models.py`
- Test: `Backend/tests/test_api.py`

- [ ] **Step 1: Write failing tests for bot and headless request rejection**
  Add tests in `Backend/tests/test_api.py`:
  - `test_login_rejects_headless_user_agent`: Send `User-Agent: Mozilla/5.0 ... HeadlessChrome/120.0` or `Playwright`, expect HTTP 403 Forbidden.
  - `test_login_requires_valid_client_guard_token`: Missing or spoofed guard token rejected.

- [ ] **Step 2: Run test to confirm failure**
  Run `uv run pytest tests/test_api.py -k test_login_rejects_headless_user_agent`.

- [ ] **Step 3: Implement anti-bot inspection in `auth.py`**
  - Add `is_headless_agent(user_agent: str) -> bool` checking for `HeadlessChrome`, `Playwright`, `Puppeteer`, `Selenium`, `PhantomJS`, `Electron`.
  - Add HMAC client challenge verification for the anti-bot verification token.
  - If detected, return HTTP 403 `{"detail": "AUTOMATED_AGENT_BLOCKED"}`.

- [ ] **Step 4: Run tests to confirm pass**
  Run `uv run pytest tests/test_api.py`.

- [ ] **Step 5: Commit changes**
  Commit: `feat(security): reject headless user-agents and automated browser requests`.

---

### Task 3: Frontend Client-Side Anti-Bot & Headless Detection Guard

**Files:**
- Create: `Frontend/src/utils/antiBotGuard.ts`
- Modify: `Frontend/src/main.tsx`
- Test: `Frontend/src/test/antiBotGuard.test.ts`

- [ ] **Step 1: Write unit tests for `antiBotGuard.ts`**
  Test detection of:
  - `navigator.webdriver === true`
  - Zero/negative outer dimensions (`outerWidth === 0 && outerHeight === 0`)
  - Automation flags (`__playwright`, `_phantom`, `cdc_*`)
  - Verification token generation for legitimate browsers.

- [ ] **Step 2: Run tests to confirm failure**
  Run `cd Frontend && npm test src/test/antiBotGuard.test.ts -- --run`.

- [ ] **Step 3: Implement `antiBotGuard.ts`**
  - Export `isAutomatedEnvironment(): { isBot: boolean; reason?: string }`.
  - Export `generateClientSecurityToken(): string`.
  - Export `renderBotBlockScreen(reason: string): void`.
  - In `Frontend/src/main.tsx`: execute `isAutomatedEnvironment()` before `ReactDOM.createRoot`. If bot detected, render the Security Block Screen and halt React initialization.

- [ ] **Step 4: Run tests to confirm pass**
  Run `npm test src/test/antiBotGuard.test.ts -- --run`.

- [ ] **Step 5: Commit changes**
  Commit: `feat(security): client-side headless browser detection and anti-bot gate`.

---

### Task 4: Frontend Single-Device Session Displacement & Interceptor

**Files:**
- Create: `Frontend/src/components/auth/SessionSupersededModal.tsx`
- Modify: `Frontend/src/services/authService.ts`
- Modify: `Frontend/src/App.tsx`
- Test: `Frontend/src/test/auth.test.ts`

- [ ] **Step 1: Write unit tests for session displacement handler**
  Add tests in `Frontend/src/test/auth.test.ts`:
  - When API returns 401 with `SESSION_SUPERSEDED`, service throws specific error or emits displacement event.
  - Stored session is purged.

- [ ] **Step 2: Run tests to confirm failure**
  Run `npm test src/test/auth.test.ts -- --run`.

- [ ] **Step 3: Implement `SessionSupersededModal` and API interceptor**
  - Create `SessionSupersededModal.tsx`:
    - Non-dismissible dialog explaining: *"Session Terminated: Your Jet Freight account was logged in from another device or browser. Only one active session is permitted at a time."*
    - Button: "Return to Sign In".
  - In `Frontend/src/App.tsx`:
    - Add a 30-second interval heartbeat calling `/api/v1/auth/heartbeat`.
    - If `SESSION_SUPERSEDED` is received, set `isSessionSuperseded = true` and call `clearStoredSession()`.
    - When user clicks "Return to Sign In", reset state and show clean login form.

- [ ] **Step 4: Run tests to confirm pass**
  Run `npm test src/test/auth.test.ts -- --run` and full Vitest suite.

- [ ] **Step 5: Commit changes**
  Commit: `feat(auth): handle single-device session displacement with security modal`.

---

### Task 5: End-to-End Verification & Production Build

- [ ] **Step 1: Run full Backend test suite** (`cd Backend && uv run pytest`)
- [ ] **Step 2: Run full Frontend test suite** (`cd Frontend && npm test -- --run`)
- [ ] **Step 3: Verify TypeScript compilation** (`npx tsc --noEmit`)
- [ ] **Step 4: Run production build** (`npm run build`)
- [ ] **Step 5: Commit and push to main**
