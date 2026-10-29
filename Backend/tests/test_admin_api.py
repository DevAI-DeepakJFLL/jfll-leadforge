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
