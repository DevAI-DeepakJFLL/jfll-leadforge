"""Unit and integration tests for Role-Based Access Control (RBAC) permission matrix and endpoint guards."""

import contextlib

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.api.access_control import (
    ROLE_PERMISSIONS,
    Permission,
    add_to_allowlist,
    has_permission,
)
from src.api.auth import create_token
from src.api.helpers import require_role
from src.api.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Seed Active Users for RBAC Test Suite
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def seed_test_allowlist():
    """Ensure all functional test roles have active allowlist entries."""
    test_users = [
        ("viewer@jfll.com", "Test Viewer", "Viewer"),
        ("commercial@jfll.com", "Test Commercial", "Commercial"),
        ("sales.exec@jfll.com", "Test Sales Exec", "Sales Executive"),
        ("operations@jfll.com", "Test Operations", "Operations"),
        ("leadership@jfll.com", "Test Leadership", "Leadership"),
        ("techlead@jfll.com", "Test Tech Lead", "Tech Lead"),
    ]
    for email, name, role in test_users:
        with contextlib.suppress(Exception):
            add_to_allowlist(email=email, name=name, role=role, added_by="system_test")


def _token_headers(role: str, email: str | None = None, name: str | None = None) -> dict[str, str]:
    role_email_map = {
        "Viewer": "viewer@jfll.com",
        "Commercial": "commercial@jfll.com",
        "Sales Executive": "sales.exec@jfll.com",
        "Operations": "operations@jfll.com",
        "Leadership": "leadership@jfll.com",
        "Tech Lead": "techlead@jfll.com",
        "Root Admin": "deepak@jfll.com",
    }
    sub_email = email or role_email_map.get(role, f"{role.lower().replace(' ', '.')}@jfll.com")
    full_name = name or f"Test {role}"
    token, _ = create_token({"sub": sub_email, "name": full_name, "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def valid_report_payload():
    """Generates a valid report JSON structure from report service."""
    res = client.post("/api/v1/reports/generate", json={"company_name_or_id": "Titan Laboratories"})
    return res.json()


# ---------------------------------------------------------------------------
# Unit Tests: Permission Matrix & Safe Lookup
# ---------------------------------------------------------------------------

def test_permission_enum_values():
    """Verify all 8 standard Permission enum constants match the architectural specification."""
    expected = {
        "view_leads": Permission.VIEW_LEADS,
        "log_approach": Permission.LOG_APPROACH,
        "generate_report": Permission.GENERATE_REPORT,
        "export_docx": Permission.EXPORT_DOCX,
        "export_csv": Permission.EXPORT_CSV,
        "enrich_web": Permission.ENRICH_WEB,
        "admin_portal": Permission.ADMIN_PORTAL,
        "manage_users": Permission.MANAGE_USERS,
    }
    for val_str, perm_enum in expected.items():
        assert perm_enum.value == val_str
        assert Permission(val_str) == perm_enum


def test_rbac_matrix_definition():
    """Verify every defined role contains exactly the expected set of permissions."""
    all_perms = set(Permission)

    # 1. Root Admin & Tech Lead have full god-mode privileges
    assert ROLE_PERMISSIONS["Root Admin"] == all_perms
    assert ROLE_PERMISSIONS["Tech Lead"] == all_perms

    # 2. Leadership has everything except user management
    expected_leadership = {
        Permission.VIEW_LEADS,
        Permission.LOG_APPROACH,
        Permission.GENERATE_REPORT,
        Permission.EXPORT_DOCX,
        Permission.EXPORT_CSV,
        Permission.ENRICH_WEB,
        Permission.ADMIN_PORTAL,
    }
    assert ROLE_PERMISSIONS["Leadership"] == expected_leadership

    # 3. Commercial & Sales Executive have functional sales & export permissions, but no admin
    expected_sales = {
        Permission.VIEW_LEADS,
        Permission.LOG_APPROACH,
        Permission.GENERATE_REPORT,
        Permission.EXPORT_DOCX,
        Permission.EXPORT_CSV,
        Permission.ENRICH_WEB,
    }
    assert ROLE_PERMISSIONS["Commercial"] == expected_sales
    assert ROLE_PERMISSIONS["Sales Executive"] == expected_sales

    # 4. Operations has operational tools, docx export, but NO bulk CSV export or admin portal
    expected_ops = {
        Permission.VIEW_LEADS,
        Permission.LOG_APPROACH,
        Permission.GENERATE_REPORT,
        Permission.EXPORT_DOCX,
    }
    assert ROLE_PERMISSIONS["Operations"] == expected_ops
    assert Permission.EXPORT_CSV not in ROLE_PERMISSIONS["Operations"]
    assert Permission.ADMIN_PORTAL not in ROLE_PERMISSIONS["Operations"]

    # 5. Viewer has read-only access only
    assert ROLE_PERMISSIONS["Viewer"] == {Permission.VIEW_LEADS}


def test_has_permission_function():
    """Test safe lookup behavior including case-insensitivity, strings, and missing roles."""
    # Root Admin
    for perm in Permission:
        assert has_permission("Root Admin", perm) is True
        assert has_permission("root admin", perm) is True

    # Tech Lead
    for perm in Permission:
        assert has_permission("Tech Lead", perm) is True

    # Leadership
    assert has_permission("Leadership", Permission.ADMIN_PORTAL) is True
    assert has_permission("Leadership", Permission.EXPORT_CSV) is True
    assert has_permission("Leadership", Permission.MANAGE_USERS) is False

    # Commercial & Sales Executive
    for role in ("Commercial", "Sales Executive"):
        assert has_permission(role, Permission.VIEW_LEADS) is True
        assert has_permission(role, Permission.LOG_APPROACH) is True
        assert has_permission(role, Permission.GENERATE_REPORT) is True
        assert has_permission(role, Permission.EXPORT_DOCX) is True
        assert has_permission(role, Permission.EXPORT_CSV) is True
        assert has_permission(role, Permission.ENRICH_WEB) is True
        assert has_permission(role, Permission.ADMIN_PORTAL) is False
        assert has_permission(role, Permission.MANAGE_USERS) is False

    # Operations
    assert has_permission("Operations", Permission.VIEW_LEADS) is True
    assert has_permission("Operations", Permission.LOG_APPROACH) is True
    assert has_permission("Operations", Permission.GENERATE_REPORT) is True
    assert has_permission("Operations", Permission.EXPORT_DOCX) is True
    assert has_permission("Operations", Permission.EXPORT_CSV) is False
    assert has_permission("Operations", Permission.ENRICH_WEB) is False
    assert has_permission("Operations", Permission.ADMIN_PORTAL) is False

    # Viewer
    assert has_permission("Viewer", Permission.VIEW_LEADS) is True
    assert has_permission("Viewer", Permission.LOG_APPROACH) is False
    assert has_permission("Viewer", Permission.EXPORT_CSV) is False
    assert has_permission("Viewer", Permission.GENERATE_REPORT) is False
    assert has_permission("Viewer", Permission.EXPORT_DOCX) is False
    assert has_permission("Viewer", Permission.ENRICH_WEB) is False
    assert has_permission("Viewer", Permission.ADMIN_PORTAL) is False

    # Edge cases
    assert has_permission(None, Permission.VIEW_LEADS) is False
    assert has_permission("", Permission.VIEW_LEADS) is False
    assert has_permission("Anonymous", Permission.VIEW_LEADS) is False
    assert has_permission("Commercial", "invalid_permission") is False
    assert has_permission("Commercial", "view_leads") is True


# ---------------------------------------------------------------------------
# Integration Tests: Endpoint Guards with Tokens
# ---------------------------------------------------------------------------

def test_viewer_blocked_from_mutating_and_export_endpoints(valid_report_payload):
    """Viewer role must receive 403 Forbidden on CSV exports, approach logging, and report generation."""
    headers = _token_headers("Viewer")

    # 1. Blocked from CSV Export (403)
    res_csv = client.post("/api/v1/leads/export", headers=headers)
    assert res_csv.status_code == 403
    assert "PERMISSION_DENIED: export_csv" in res_csv.json()["detail"]

    res_csv_get = client.get("/api/v1/leads/export-csv", headers=headers)
    assert res_csv_get.status_code == 403

    # 2. Blocked from Approach Logging (403)
    res_app = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_viewer_01",
        json={"action": "Called customer", "status": "Contacted"},
        headers=headers,
    )
    assert res_app.status_code == 403
    assert "PERMISSION_DENIED: log_approach" in res_app.json()["detail"]

    # Also blocked via direct route alias /api/v1/approaches/log
    res_app_alias = client.post(
        "/api/v1/approaches/log",
        json={"entity_type": "jfll_customer", "entity_id": "cust_viewer_01", "status": "Contacted"},
        headers=headers,
    )
    assert res_app_alias.status_code == 403

    # 3. Blocked from Report Generation (403)
    res_rep = client.post(
        "/api/v1/reports/generate",
        json={"company_name_or_id": "Titan Laboratories"},
        headers=headers,
    )
    assert res_rep.status_code == 403
    assert "PERMISSION_DENIED: generate_report" in res_rep.json()["detail"]

    # 4. Blocked from DOCX Export (403)
    res_docx = client.post(
        "/api/v1/reports/export-docx",
        json=valid_report_payload,
        headers=headers,
    )
    assert res_docx.status_code == 403
    assert "PERMISSION_DENIED: export_docx" in res_docx.json()["detail"]

    # 5. Blocked from Web Enrichment (403)
    res_enrich = client.post(
        "/api/v1/reports/enrich-web",
        json=valid_report_payload,
        headers=headers,
    )
    assert res_enrich.status_code == 403
    assert "PERMISSION_DENIED: enrich_web" in res_enrich.json()["detail"]

    # 6. Blocked from Admin Portal (403)
    res_admin = client.get("/api/v1/admin/stats", headers=headers)
    assert res_admin.status_code == 403
    assert "PERMISSION_DENIED: admin_portal" in res_admin.json()["detail"]

    # BUT Viewer CAN search/view leads (200)
    res_view = client.get("/api/v1/leads?page=1&page_size=5", headers=headers)
    assert res_view.status_code == 200


def test_commercial_and_sales_executive_permissions(valid_report_payload):
    """Commercial / Sales Executive can export reports and CSV, log approaches, but CANNOT access Admin Portal."""
    for role in ("Commercial", "Sales Executive"):
        headers = _token_headers(role)

        # 1. CAN export CSV
        res_csv = client.post("/api/v1/leads/export", headers=headers)
        assert res_csv.status_code == 200
        assert "text/csv" in res_csv.headers["content-type"]

        # 2. CAN log approaches
        res_app = client.post(
            "/api/v1/approach-logs/jfll_customer/cust_comm_01",
            json={"action": "Called customer", "status": "Contacted"},
            headers=headers,
        )
        assert res_app.status_code == 200

        # 3. CAN generate report
        res_rep = client.post(
            "/api/v1/reports/generate",
            json={"company_name_or_id": "Titan Laboratories"},
            headers=headers,
        )
        assert res_rep.status_code == 200

        # 4. CAN export DOCX
        res_docx = client.post(
            "/api/v1/reports/export-docx",
            json=valid_report_payload,
            headers=headers,
        )
        assert res_docx.status_code == 200
        assert res_docx.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        # 5. CANNOT access Admin Portal (403)
        res_admin = client.get("/api/v1/admin/stats", headers=headers)
        assert res_admin.status_code == 403
        assert "PERMISSION_DENIED: admin_portal" in res_admin.json()["detail"]

        res_reqs = client.get("/api/v1/admin/access-requests", headers=headers)
        assert res_reqs.status_code == 403


def test_operations_role_permissions(valid_report_payload):
    """Operations can view leads, log approaches, generate reports, export DOCX, but NO CSV export or admin portal."""
    headers = _token_headers("Operations")

    # CAN log approach
    res_app = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_ops_01",
        json={"action": "Called customer", "status": "Contacted"},
        headers=headers,
    )
    assert res_app.status_code == 200

    # CAN generate report
    res_rep = client.post(
        "/api/v1/reports/generate",
        json={"company_name_or_id": "Titan Laboratories"},
        headers=headers,
    )
    assert res_rep.status_code == 200

    # CAN export DOCX
    res_docx = client.post(
        "/api/v1/reports/export-docx",
        json=valid_report_payload,
        headers=headers,
    )
    assert res_docx.status_code == 200

    # CANNOT export bulk CSV (403)
    res_csv = client.post("/api/v1/leads/export", headers=headers)
    assert res_csv.status_code == 403
    assert "PERMISSION_DENIED: export_csv" in res_csv.json()["detail"]

    # CANNOT access Admin Portal (403)
    res_admin = client.get("/api/v1/admin/stats", headers=headers)
    assert res_admin.status_code == 403


def test_leadership_and_tech_lead_permissions():
    """Leadership and Tech Lead can access full reporting and admin features."""
    # 1. Leadership
    lead_headers = _token_headers("Leadership")
    assert client.post("/api/v1/leads/export", headers=lead_headers).status_code == 200
    assert client.get("/api/v1/admin/stats", headers=lead_headers).status_code == 200
    assert client.get("/api/v1/admin/access-requests", headers=lead_headers).status_code == 200
    assert client.get("/api/v1/admin/allowlist", headers=lead_headers).status_code == 200
    # Leadership does not manage users directly (requires MANAGE_USERS)
    res_lead_manage = client.post(
        "/api/v1/admin/allowlist",
        json={"email": "new.hire.lead@jfll.com", "name": "New Hire", "role": "Commercial"},
        headers=lead_headers,
    )
    assert res_lead_manage.status_code == 403

    # 2. Tech Lead has full privileges including user management
    tech_headers = _token_headers("Tech Lead")
    assert client.post("/api/v1/leads/export", headers=tech_headers).status_code == 200
    assert client.get("/api/v1/admin/stats", headers=tech_headers).status_code == 200
    assert client.get("/api/v1/admin/access-requests", headers=tech_headers).status_code == 200
    assert client.get("/api/v1/admin/allowlist", headers=tech_headers).status_code == 200


def test_root_admin_has_all_permissions(valid_report_payload):
    """Root Admin has all permissions across reporting, exporting, and user administration."""
    root_headers = _token_headers("Root Admin", email="deepak@jfll.com", name="Deepak Naidu")

    # CSV Export
    assert client.post("/api/v1/leads/export", headers=root_headers).status_code == 200
    # Approach logging
    assert client.post(
        "/api/v1/approach-logs/jfll_customer/cust_root_01",
        json={"action": "Called customer", "status": "Contacted"},
        headers=root_headers,
    ).status_code == 200
    # Report generation
    assert client.post(
        "/api/v1/reports/generate",
        json={"company_name_or_id": "Titan Laboratories"},
        headers=root_headers,
    ).status_code == 200
    # DOCX export
    assert client.post(
        "/api/v1/reports/export-docx",
        json=valid_report_payload,
        headers=root_headers,
    ).status_code == 200
    # Admin Portal stats
    assert client.get("/api/v1/admin/stats", headers=root_headers).status_code == 200
    # Admin Portal requests
    assert client.get("/api/v1/admin/access-requests", headers=root_headers).status_code == 200


def test_require_role_dependency():
    """Unit test the require_role helper factory."""
    dep = require_role(["Commercial", "Operations"])

    # Permitted role
    comm_token = _token_headers("Commercial")["Authorization"]
    user = dep(authorization=comm_token)
    assert user["role"] == "Commercial"

    # Forbidden role
    viewer_token = _token_headers("Viewer")["Authorization"]
    with pytest.raises(HTTPException) as exc_info:
        dep(authorization=viewer_token)
    assert exc_info.value.status_code == 403
    assert "FORBIDDEN_ROLE" in exc_info.value.detail
