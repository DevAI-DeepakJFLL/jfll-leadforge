import pytest
from fastapi.testclient import TestClient

from src.api.auth import create_token
from src.api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_access_control(tmp_path, monkeypatch):
    """Isolates access_control.json storage in a temporary directory for each test run."""
    temp_file = tmp_path / "test_access_control.json"
    monkeypatch.setenv("ACCESS_CONTROL_PATH", str(temp_file))
    yield temp_file


def get_admin_headers(email: str = "deepak@jfll.com", role: str = "Tech Lead") -> dict[str, str]:
    token, _ = create_token({"sub": email, "name": "Deepak Naidu", "role": role})
    return {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0"}


def get_commercial_headers(email: str = "snehal.birje@jfll.com", role: str = "Commercial") -> dict[str, str]:
    token, _ = create_token({"sub": email, "name": "Snehal Birje", "role": role})
    return {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0"}


def test_access_request_submission_and_deduplication():
    # 1. New request
    res = client.post(
        "/api/v1/auth/access-request",
        json={
            "email": "kavita.deshmukh@jfll.com",
            "name": "Kavita Deshmukh",
            "reason": "Freight forwarding sales for Pune automotive cluster",
        },
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "submitted successfully" in data["message"]
    req = data["request"]
    assert req["email"] == "kavita.deshmukh@jfll.com"
    assert req["status"] == "pending"

    # 2. Duplicate submission for same email while pending
    res_dup = client.post(
        "/api/v1/auth/access-request",
        json={
            "email": "kavita.deshmukh@jfll.com",
            "name": "Kavita Deshmukh",
            "reason": "Second request attempt",
        },
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_dup.status_code == 200
    data_dup = res_dup.json()
    assert data_dup.get("already_pending") is True
    assert "already under administrative review" in data_dup["message"]

    # 3. Submission for existing active user
    res_existing = client.post(
        "/api/v1/auth/access-request",
        json={
            "email": "deepak@jfll.com",
            "name": "Deepak Naidu",
            "reason": "Already authorized employee",
        },
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_existing.status_code == 200
    data_existing = res_existing.json()
    assert data_existing.get("already_authorized") is True
    assert "already authorized" in data_existing["message"]


def test_admin_endpoints_require_admin_role():
    # Commercial role should be denied with 403 Forbidden
    comm_headers = get_commercial_headers()
    res_forbidden = client.get("/api/v1/admin/access-requests", headers=comm_headers)
    assert res_forbidden.status_code == 403
    assert "Administrative privileges required" in res_forbidden.json()["detail"]

    # Admin role should succeed with 200 OK
    admin_headers = get_admin_headers()
    res_ok = client.get("/api/v1/admin/access-requests", headers=admin_headers)
    assert res_ok.status_code == 200
    assert isinstance(res_ok.json(), list)


def test_approve_access_request_enrolls_in_allowlist():
    # 1. Submit request
    client.post(
        "/api/v1/auth/access-request",
        json={
            "email": "priya.patel@jfll.com",
            "name": "Priya Patel",
            "reason": "Perishables export outbound desk Mumbai",
        },
        headers={"User-Agent": "Mozilla/5.0"},
    )

    # 2. List requests
    admin_headers = get_admin_headers()
    res_list = client.get("/api/v1/admin/access-requests?status=pending", headers=admin_headers)
    assert res_list.status_code == 200
    requests = res_list.json()
    target_req = next((r for r in requests if r["email"] == "priya.patel@jfll.com"), None)
    assert target_req is not None
    req_id = target_req["id"]

    # 3. Approve request
    res_approve = client.post(
        f"/api/v1/admin/access-requests/{req_id}/approve",
        json={"role": "Commercial", "notes": "Approved for Mumbai perishable accounts"},
        headers=admin_headers,
    )
    assert res_approve.status_code == 200
    approve_data = res_approve.json()
    assert approve_data["success"] is True
    assert approve_data["request"]["status"] == "approved"

    # 4. Verify user can now sign in
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "priya.patel@jfll.com"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert login_data["email"] == "priya.patel@jfll.com"
    assert login_data["role"] == "Commercial"
    assert "token" in login_data


def test_reject_access_request():
    # 1. Submit request
    client.post(
        "/api/v1/auth/access-request",
        json={
            "email": "vendor.candidate@jfll.com",
            "name": "Vendor Candidate",
            "reason": "External contractor inquiry",
        },
        headers={"User-Agent": "Mozilla/5.0"},
    )

    admin_headers = get_admin_headers()
    requests = client.get("/api/v1/admin/access-requests?status=pending", headers=admin_headers).json()
    req_id = next(r["id"] for r in requests if r["email"] == "vendor.candidate@jfll.com")

    # 2. Reject request
    res_reject = client.post(
        f"/api/v1/admin/access-requests/{req_id}/reject",
        json={"notes": "External contractors must access via partner portal."},
        headers=admin_headers,
    )
    assert res_reject.status_code == 200
    reject_data = res_reject.json()
    assert reject_data["success"] is True
    assert reject_data["request"]["status"] == "rejected"

    # Verify still cannot sign in
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "vendor.candidate@jfll.com"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_login.status_code == 401


def test_direct_allowlist_management_and_safety():
    admin_headers = get_admin_headers()

    # 1. Add employee directly
    res_add = client.post(
        "/api/v1/admin/allowlist",
        json={"email": "rohit.verma@jfll.com", "name": "Rohit Verma", "role": "Operations"},
        headers=admin_headers,
    )
    assert res_add.status_code == 200
    assert res_add.json()["success"] is True

    # Verify listed
    res_list = client.get("/api/v1/admin/allowlist?search=rohit", headers=admin_headers)
    assert res_list.status_code == 200
    assert any(e["email"] == "rohit.verma@jfll.com" for e in res_list.json())

    # 2. Revoke employee
    res_del = client.delete("/api/v1/admin/allowlist/rohit.verma@jfll.com", headers=admin_headers)
    assert res_del.status_code == 200
    assert res_del.json()["entry"]["status"] == "revoked"

    # Verify revoked employee is immediately rejected at login
    res_revoked_login = client.post(
        "/api/v1/auth/login",
        json={"email": "rohit.verma@jfll.com"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_revoked_login.status_code == 401

    # Verify existing active session tokens for revoked employee are immediately invalidated
    rohit_token, _ = create_token({"sub": "rohit.verma@jfll.com", "name": "Rohit Verma", "role": "Operations"})
    rohit_headers = {"Authorization": f"Bearer {rohit_token}", "User-Agent": "Mozilla/5.0"}
    res_me = client.get("/api/v1/auth/me", headers=rohit_headers)
    assert res_me.status_code == 401
    assert "ACCESS_REVOKED" in res_me.json()["detail"]

    res_heartbeat = client.get("/api/v1/auth/heartbeat", headers=rohit_headers)
    assert res_heartbeat.status_code == 401
    assert "ACCESS_REVOKED" in res_heartbeat.json()["detail"]

    # Revoke a seeded employee and verify login is blocked even with digest fallback
    res_del_seeded = client.delete("/api/v1/admin/allowlist/akash.dhara@jfll.com", headers=admin_headers)
    assert res_del_seeded.status_code == 200
    assert res_del_seeded.json()["entry"]["status"] == "revoked"

    res_seeded_login = client.post(
        "/api/v1/auth/login",
        json={"email": "akash.dhara@jfll.com"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_seeded_login.status_code == 401

    # 3. Self-lockout and root administrator protection
    res_self = client.delete("/api/v1/admin/allowlist/deepak@jfll.com", headers=admin_headers)
    assert res_self.status_code == 400
    assert "Root administrator" in res_self.json()["detail"] or "cannot revoke" in res_self.json()["detail"].lower()

    # Also verify deepak@jfll.com can log in directly
    res_deepak_login = client.post(
        "/api/v1/auth/login",
        json={"email": "deepak@jfll.com"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_deepak_login.status_code == 200
    assert res_deepak_login.json()["email"] == "deepak@jfll.com"
    assert res_deepak_login.json()["role"] == "Tech Lead"


def test_admin_stats_telemetry():
    admin_headers = get_admin_headers()
    res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "pending_requests_count" in data
    assert "active_allowlist_count" in data
    assert "total_requests_count" in data
    assert data["active_allowlist_count"] >= 4


def test_bot_reporting_and_machine_blocking():
    admin_headers = get_admin_headers()

    # 1. Bot reporter endpoint called from client
    report_res = client.post(
        "/api/v1/auth/report-bot",
        json={
            "fingerprint": "fp_testbot999",
            "reason": "Headless webdriver detected",
            "artifacts": ["navigator.webdriver=true", "window.outerWidth=0"],
        },
        headers={"User-Agent": "Mozilla/5.0", "X-Forwarded-For": "198.51.100.42"},
    )
    assert report_res.status_code == 200
    assert report_res.json()["success"] is True

    # 2. Verify IP is blocked at middleware
    blocked_by_ip = client.get(
        "/api/v1/auth/me",
        headers={"User-Agent": "Mozilla/5.0", "X-Forwarded-For": "198.51.100.42"},
    )
    assert blocked_by_ip.status_code == 403
    assert "DEVICE_BLOCKED" in blocked_by_ip.json()["detail"]

    # 3. Verify hardware fingerprint is blocked even if IP changes
    blocked_by_fp = client.get(
        "/api/v1/auth/me",
        headers={
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": "198.51.100.99",
            "X-Device-Fingerprint": "fp_testbot999",
        },
    )
    assert blocked_by_fp.status_code == 403
    assert "DEVICE_BLOCKED" in blocked_by_fp.json()["detail"]

    # 4. Admin lists blocked entities
    entities_res = client.get("/api/v1/admin/blocked-entities", headers=admin_headers)
    assert entities_res.status_code == 200
    entities = entities_res.json()
    assert len(entities) >= 1
    target = next((e for e in entities if e.get("fingerprint") == "fp_testbot999"), None)
    assert target is not None
    assert target["status"] == "active"
    assert "Headless webdriver detected" in target["reason"]

    # 5. Admin unblocks the entity
    ban_id = target["id"]
    unblock_res = client.delete(f"/api/v1/admin/blocked-entities/{ban_id}", headers=admin_headers)
    assert unblock_res.status_code == 200
    assert unblock_res.json()["success"] is True

    # 6. Verify traffic is now allowed through again
    allowed_by_fp = client.get(
        "/api/v1/auth/me",
        headers={
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": "198.51.100.99",
            "X-Device-Fingerprint": "fp_testbot999",
            **admin_headers,
        },
    )
    assert allowed_by_fp.status_code == 200


def test_user_agent_bot_autoban():
    # Automated headless bot makes a request with suspicious User-Agent
    bot_ip = "203.0.113.88"
    bot_res = client.get(
        "/api/v1/leads",
        headers={
            "User-Agent": "Mozilla/5.0 HeadlessChrome/120.0 (Playwright)",
            "X-Forwarded-For": bot_ip,
        },
    )
    assert bot_res.status_code == 403
    assert "AUTOMATED_AGENT_BLOCKED" in bot_res.json()["detail"]

    # Subsequent request with normal browser User-Agent from same machine/IP is permanently blocked
    spoofed_res = client.get(
        "/api/v1/leads",
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "X-Forwarded-For": bot_ip,
        },
    )
    assert spoofed_res.status_code == 403
    assert "DEVICE_BLOCKED" in spoofed_res.json()["detail"]


def test_device_level_blocking_preserves_email_id():
    admin_headers = get_admin_headers()
    employee_email = "akash.dhara@jfll.com"
    shared_ip = "198.51.100.77"
    bad_device_fp = "fp_compromised_pc_001"
    clean_device_fp = "fp_authorized_laptop_002"

    # 1. Admin blocks the compromised hardware device
    block_res = client.post(
        "/api/v1/admin/blocked-devices",
        json={
            "fingerprint": bad_device_fp,
            "reason": "Compromised automated runner on hardware",
        },
        headers=admin_headers,
    )
    assert block_res.status_code == 200
    assert block_res.json()["success"] is True

    # 2. Attempting to login from the blocked device fails with 403 DEVICE_BLOCKED
    bad_device_login = client.post(
        "/api/v1/auth/login",
        json={"email": employee_email},
        headers={
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": shared_ip,
            "X-Device-Fingerprint": bad_device_fp,
        },
    )
    assert bad_device_login.status_code == 403
    assert "DEVICE_BLOCKED" in bad_device_login.json()["detail"]

    # 3. The SAME employee logs in from a clean device on the SAME office IP
    clean_device_login = client.post(
        "/api/v1/auth/login",
        json={"email": employee_email},
        headers={
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": shared_ip,
            "X-Device-Fingerprint": clean_device_fp,
        },
    )
    assert clean_device_login.status_code == 200
    token = clean_device_login.json()["token"]
    assert token

    # 4. Authenticated requests from clean device succeed
    clean_req = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": shared_ip,
            "X-Device-Fingerprint": clean_device_fp,
        },
    )
    assert clean_req.status_code == 200
    assert clean_req.json()["email"] == employee_email

    # 5. Using the valid token on the bad device is still blocked by device guard
    blocked_token_req = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": shared_ip,
            "X-Device-Fingerprint": bad_device_fp,
        },
    )
    assert blocked_token_req.status_code == 403
    assert "DEVICE_BLOCKED" in blocked_token_req.json()["detail"]


def test_only_admin_can_remove_restriction_and_device_status_endpoint():
    """
    Verifies that:
    1. /api/v1/auth/device-status correctly reports restriction state.
    2. Non-admin cannot unblock a restricted device.
    3. ONLY an admin can remove restrictions.
    4. Once unblocked by admin, /api/v1/auth/device-status confirms clearance.
    """
    admin_headers = get_admin_headers()
    target_fp = "fp_restricted_device_abc"

    # 1. Block the device via Admin
    block_res = client.post(
        "/api/v1/admin/blocked-devices",
        json={"fingerprint": target_fp, "reason": "Security restriction policy"},
        headers=admin_headers,
    )
    assert block_res.status_code == 200
    ban_id = block_res.json()["entry"]["id"]

    # 2. Public /device-status reflects that the device is blocked
    status_res = client.get(f"/api/v1/auth/device-status?fingerprint={target_fp}")
    assert status_res.status_code == 200
    assert status_res.json()["blocked"] is True
    assert status_res.json()["reason"] == "Security restriction policy"

    # 3. Unauthorized/anonymous user CANNOT unblock the device
    anon_unblock = client.delete(f"/api/v1/admin/blocked-devices/{ban_id}")
    assert anon_unblock.status_code in (401, 403)

    # 4. Non-admin employee CANNOT unblock the device
    from src.api.auth import create_token
    user_token, _ = create_token({"sub": "user@jfll.com", "role": "Commercial"})
    user_unblock = client.delete(
        f"/api/v1/admin/blocked-devices/{ban_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert user_unblock.status_code in (401, 403)

    # Device remains blocked
    status_res = client.get(f"/api/v1/auth/device-status?fingerprint={target_fp}")
    assert status_res.json()["blocked"] is True

    # 5. ONLY Admin unblocks the device
    admin_unblock = client.delete(
        f"/api/v1/admin/blocked-devices/{ban_id}",
        headers=admin_headers,
    )
    assert admin_unblock.status_code == 200
    assert admin_unblock.json()["success"] is True

    # 6. /device-status now reflects clearance
    status_cleared = client.get(f"/api/v1/auth/device-status?fingerprint={target_fp}")
    assert status_cleared.status_code == 200
    assert status_cleared.json()["blocked"] is False



