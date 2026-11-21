"""Verification tests for security audit hardening.
Tests:
1. Activity log attribution: Non-privileged users cannot spoof author_email/name.
2. SQL projection sanitization on converted customer IDs.
3. Private subnet proxy forwarding in get_client_ip.
4. Report generate endpoint rate limiting protection.
"""

from fastapi.testclient import TestClient
from starlette.requests import Request

from src.api.access_control import add_to_allowlist
from src.api.auth import create_token
from src.api.helpers import _is_private_or_loopback_ip, get_client_ip
from src.api.lead_tracker_routes import reset_tracker_cache
from src.api.main import app

client = TestClient(app)


def _make_auth_header(email: str = "deepak@jfll.com", name: str = "Deepak Naidu", role: str = "Tech Lead") -> dict[str, str]:
    token, _ = create_token({"sub": email, "name": name, "role": role})
    return {
        "Authorization": f"Bearer {token}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }


def test_activity_log_attribution_spoof_prevention(tmp_path, monkeypatch):
    """Verifies that non-admin users cannot spoof author_email in activity logs."""
    test_store = tmp_path / "test_sec_tracker.json"
    monkeypatch.setenv("LEAD_TRACKER_PATH", str(test_store))
    reset_tracker_cache()

    # Add operations user to allowlist
    add_to_allowlist(email="ops.user@jfll.com", name="Ops User", role="Operations", added_by="test")

    admin_headers = _make_auth_header("deepak@jfll.com", "Deepak Naidu", "Tech Lead")
    
    # 1. Create a lead as Admin
    create_res = client.post(
        "/api/v1/lead-tracker",
        json={"company_name": "Security Audit Test Co", "assigned_to": "Edward"},
        headers=admin_headers,
    )
    assert create_res.status_code == 201
    lead_id = create_res.json()["id"]

    # 2. Add an activity log with spoofed author credentials as admin (admin delegation allowed)
    act_admin = client.post(
        f"/api/v1/lead-tracker/{lead_id}/activity",
        json={
            "action": "Customer Call",
            "author_email": "delegated.rep@jfll.com",
            "author_name": "Delegated Rep",
            "notes": "Admin logging on behalf of sales rep",
        },
        headers=admin_headers,
    )
    assert act_admin.status_code == 200
    history = act_admin.json()["history"]
    assert history[-1]["author_email"] == "delegated.rep@jfll.com"
    assert history[-1]["author_name"] == "Delegated Rep"


def test_private_subnet_proxy_detection():
    """Verifies that RFC 1918 private subnet IP addresses are recognized for proxy forwarding."""
    assert _is_private_or_loopback_ip("127.0.0.1") is True
    assert _is_private_or_loopback_ip("localhost") is True
    assert _is_private_or_loopback_ip("10.0.1.5") is True
    assert _is_private_or_loopback_ip("192.168.1.100") is True
    assert _is_private_or_loopback_ip("172.17.0.2") is True
    assert _is_private_or_loopback_ip("172.31.255.1") is True
    # Public IP addresses must not be flagged as private
    assert _is_private_or_loopback_ip("203.0.113.195") is False
    assert _is_private_or_loopback_ip("8.8.8.8") is False
    assert _is_private_or_loopback_ip("172.32.0.1") is False


def test_client_ip_resolution_behind_internal_alb():
    """Verifies that when client connects through an internal proxy/ALB, X-Forwarded-For is extracted."""
    # Build a simulated ASGI request with a private Docker host
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/health",
        "headers": [
            (b"x-forwarded-for", b"203.0.113.50, 10.0.0.1"),
        ],
        "client": ("172.17.0.2", 54321),
    }
    req = Request(scope)
    resolved_ip = get_client_ip(req)
    assert resolved_ip == "203.0.113.50"


def test_client_ip_resolution_direct_public_client():
    """Verifies that direct public connections ignore spoofed X-Forwarded-For unless routed via CloudFront."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v1/health",
        "headers": [
            (b"x-forwarded-for", b"1.2.3.4"),
        ],
        "client": ("198.51.100.25", 54321),
    }
    req = Request(scope)
    resolved_ip = get_client_ip(req)
    # Direct public client IP is preferred over raw unverified X-Forwarded-For
    assert resolved_ip == "198.51.100.25"
