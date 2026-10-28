from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert "Floci" in payload["backend"]


def test_list_leads_pagination():
    response = client.get("/api/v1/leads?page=1&page_size=10&status=Active")
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total_records"] == 728
    assert len(payload["data"]) == 10
    assert payload["has_next"] is True
    assert payload["audience_counts"]["all"] == 728
    for item in payload["data"]:
        assert item["status"] == "Active"


def test_list_leads_filtering_by_tab_and_group():
    # Filter by Shipper / Consignee tab
    response = client.get("/api/v1/leads?tab=shippers&page=1&page_size=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 285
    for item in payload["data"]:
        assert item["customer_group"] == "Shipper / Consignee"

    # Multi-select customer group
    response = client.get("/api/v1/leads?customer_groups=Overseas+Agent")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 39


def test_list_leads_dynamic_audience_counts():
    # Baseline active leads count
    res_base = client.get("/api/v1/leads?status=Active")
    assert res_base.status_code == 200
    base_counts = res_base.json()["audience_counts"]
    assert base_counts["all"] == 728
    assert base_counts["shippers"] == 285

    # Filtered by customer group
    res_filtered = client.get("/api/v1/leads?status=Active&customer_groups=Shipper+%2F+Consignee")
    assert res_filtered.status_code == 200
    filtered_payload = res_filtered.json()
    filtered_counts = filtered_payload["audience_counts"]
    assert filtered_payload["total_records"] == 285
    assert filtered_counts["all"] == 285
    assert filtered_counts["shippers"] == 285
    assert filtered_counts["subagents"] == 0
    assert filtered_counts["overseas"] == 0

    # Filtered by search query
    res_search = client.get("/api/v1/leads?status=Active&search=3S+CORPORATION")
    assert res_search.status_code == 200
    search_payload = res_search.json()
    assert search_payload["audience_counts"]["all"] == search_payload["total_records"]
    assert search_payload["audience_counts"]["all"] < 728


def test_invalid_status_returns_400():
    response = client.get("/api/v1/leads?status=InvalidStatus")
    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_invalid_tab_returns_400():
    response = client.get("/api/v1/leads?tab=nonexistent")
    assert response.status_code == 400
    assert "Invalid tab" in response.json()["detail"]


def test_sql_injection_attempt_is_safe():
    # Attempt SQL injection via search parameter
    response = client.get("/api/v1/leads?search=' OR '1'='1")
    assert response.status_code == 200
    payload = response.json()
    # Parameterized query should treat the injection attempt as a literal string pattern
    assert payload["total_records"] == 0


def test_auth_login_success_and_verify_token():
    # 1. Successful passwordless whitelist login
    res = client.post("/api/v1/auth/login", json={"email": "deepak.naidu@jfll.com"})
    assert res.status_code == 200
    payload = res.json()
    assert payload["email"] == "deepak.naidu@jfll.com"
    assert payload["name"] == "Deepak Naidu"
    assert payload["role"] == "Tech Lead"
    assert "token" in payload
    token = payload["token"]

    # 2. Verify token via /api/v1/auth/me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_payload = me_res.json()
    assert me_payload["email"] == "deepak.naidu@jfll.com"
    assert me_payload["name"] == "Deepak Naidu"
    assert me_payload["role"] == "Tech Lead"
    assert me_payload["token"] == token

    # 3. Test all other whitelisted members and case/whitespace normalization
    for email, expected_name, expected_role in [
        ("  TYRA.THEKNATH@jfll.com  ", "Tyra Theknath", "Leadership"),
        ("akash.dhara@jfll.com", "Akash Dhara", "Operations"),
        ("snehal.birje@jfll.com", "Snehal Birje", "Commercial"),
    ]:
        team_res = client.post("/api/v1/auth/login", json={"email": email})
        assert team_res.status_code == 200
        team_payload = team_res.json()
        assert team_payload["email"] == email.strip().lower()
        assert team_payload["name"] == expected_name
        assert team_payload["role"] == expected_role


def test_auth_login_invalid_credentials():
    # Unlisted email (previously default email)
    res1 = client.post("/api/v1/auth/login", json={"email": "leads@jfll.com"})
    assert res1.status_code == 401
    assert "Access restricted. Only authorized Jet Freight Logistics personnel can sign in." in res1.json()["detail"]

    # Unknown domain / external user
    res2 = client.post("/api/v1/auth/login", json={"email": "unauthorized@example.com"})
    assert res2.status_code == 401
    assert "Access restricted. Only authorized Jet Freight Logistics personnel can sign in." in res2.json()["detail"]


def test_auth_me_unauthorized():
    # Missing header
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

    # Invalid token format
    res2 = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.signature"})
    assert res2.status_code == 401


def test_single_device_session_displacement():
    """Verify that logging in from a second device displaces and revokes the active session of the first device."""
    email = "deepak.naidu@jfll.com"

    # 1. Device 1 logs in and receives token_dev1
    res1 = client.post("/api/v1/auth/login", json={"email": email})
    assert res1.status_code == 200
    token_dev1 = res1.json()["token"]

    # Device 1 token works
    me1 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_dev1}"})
    assert me1.status_code == 200
    assert me1.json()["email"] == email

    # 2. Device 2 logs in with same email and receives token_dev2
    res2 = client.post("/api/v1/auth/login", json={"email": email})
    assert res2.status_code == 200
    token_dev2 = res2.json()["token"]
    assert token_dev1 != token_dev2

    # 3. Device 1 is now displaced and rejected with SESSION_SUPERSEDED
    displaced_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_dev1}"})
    assert displaced_res.status_code == 401
    assert "SESSION_SUPERSEDED" in displaced_res.json()["detail"]

    # 4. Device 2 continues to work
    me2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_dev2}"})
    assert me2.status_code == 200
    assert me2.json()["email"] == email


def test_login_rejects_headless_user_agent():
    """Verify that requests from automated browser engines (HeadlessChrome, Playwright, etc.) are blocked."""
    email = "deepak.naidu@jfll.com"

    for bot_agent in [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/122.0.6261.94 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) Playwright/1.42.0 Chrome/122.0.6261.94",
        "Puppeteer/22.0.0 (NodeJS)",
        "selenium-webdriver/4.18.0",
        "Mozilla/5.0 (compatible; PhantomJS/2.1.1; Linux x86_64)",
    ]:
        res = client.post(
            "/api/v1/auth/login",
            json={"email": email},
            headers={"User-Agent": bot_agent},
        )
        assert res.status_code == 403
        assert "AUTOMATED_AGENT_BLOCKED" in res.json()["detail"]


def test_data_routes_reject_headless_user_agent():
    """Verify that AntiBotMiddleware blocks headless user agents across all data routes."""
    res = client.get(
        "/api/v1/leads",
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Playwright/1.42.0"},
    )
    assert res.status_code == 403
    assert "AUTOMATED_AGENT_BLOCKED" in res.json()["detail"]


def test_cors_origin_restrictions():
    """Verify that only explicitly allowlisted origins are accepted, not arbitrary CloudFront domains."""
    # Authorized origin
    res_allowed = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://d3c4bsffw7tf7s.cloudfront.net",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_allowed.headers.get("access-control-allow-origin") == "https://d3c4bsffw7tf7s.cloudfront.net"

    # Arbitrary CloudFront distribution origin should be rejected
    res_blocked = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://evil-unauthorized.cloudfront.net",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_blocked.headers.get("access-control-allow-origin") is None



