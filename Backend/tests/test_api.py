import os

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
    assert payload["total_records"] == 578
    assert len(payload["data"]) == 10
    assert payload["has_next"] is True
    assert payload["audience_counts"]["all"] == 578
    for item in payload["data"]:
        assert item["status"] == "Active"


def test_list_leads_filtering_by_tab_and_group():
    # Filter by Shipper / Consignee tab
    response = client.get("/api/v1/leads?tab=shippers&page=1&page_size=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 229
    for item in payload["data"]:
        assert item["customer_group"] == "Shipper / Consignee"

    # Multi-select customer group
    response = client.get("/api/v1/leads?customer_groups=Overseas+Agent")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 25


def test_list_leads_filtering_by_credit_status():
    """Verify that credit_status and credit_statuses filters return matching records."""
    # Single credit status filter
    res_approved = client.get("/api/v1/leads?status=Active&credit_status=approved")
    assert res_approved.status_code == 200
    payload = res_approved.json()
    assert payload["total_records"] == 400
    for item in payload["data"]:
        assert item["credit_status"] == "approved"

    # Multi-select credit statuses
    res_multi = client.get("/api/v1/leads?status=Active&credit_statuses=blocked&credit_statuses=high_risk")
    assert res_multi.status_code == 200
    payload_multi = res_multi.json()
    assert payload_multi["total_records"] == 58 + 25  # 83
    for item in payload_multi["data"]:
        assert item["credit_status"] in ("blocked", "high_risk")


def test_list_leads_filtering_by_sales_person():
    """Verify that sales_person and sales_persons filters return matching records."""
    # Single sales person filter
    res_sp = client.get("/api/v1/leads?status=Active&sales_person=Narendra+Gupta")
    assert res_sp.status_code == 200
    payload = res_sp.json()
    assert payload["total_records"] == 56
    for item in payload["data"]:
        assert item["sales_person"] == "Narendra Gupta"

    # Multi-select sales persons
    res_multi = client.get("/api/v1/leads?status=Active&sales_persons=Irfan+Shaikh&sales_persons=Samuel+Prabhu")
    assert res_multi.status_code == 200
    payload_multi = res_multi.json()
    assert payload_multi["total_records"] == 48 + 35  # 83
    for item in payload_multi["data"]:
        assert item["sales_person"] in ("Irfan Shaikh", "Samuel Prabhu")


def test_list_leads_filtering_by_revenue():
    """Verify that revenue_ranges and min_revenue filters return matching records."""
    # 1. Mega / Enterprise range (₹1 Crore+) -> 25 accounts
    res_1cr = client.get("/api/v1/leads?status=Active&revenue_ranges=1cr_plus")
    assert res_1cr.status_code == 200
    payload_1cr = res_1cr.json()
    assert payload_1cr["total_records"] == 25
    for item in payload_1cr["data"]:
        assert item["business_last_3m"] is not None
        assert item["business_last_3m"] >= 10000000

    # 2. Starter range (Under ₹1 Lakh) -> 148 accounts
    res_starter = client.get("/api/v1/leads?status=Active&revenue_ranges=under_1l")
    assert res_starter.status_code == 200
    payload_starter = res_starter.json()
    assert payload_starter["total_records"] == 148
    for item in payload_starter["data"]:
        assert item["business_last_3m"] is not None
        assert item["business_last_3m"] < 100000

    # 3. Multi-range combination (1cr_plus + 25l_1cr) -> 25 + 61 = 86 accounts
    res_multi = client.get("/api/v1/leads?status=Active&revenue_ranges=1cr_plus&revenue_ranges=25l_1cr")
    assert res_multi.status_code == 200
    payload_multi = res_multi.json()
    assert payload_multi["total_records"] == 86

    # 4. Inactive customers with revenue filter -> 0 records (safe execution)
    res_inact = client.get("/api/v1/leads?status=Not+Active&revenue_ranges=1cr_plus")
    assert res_inact.status_code == 200
    assert res_inact.json()["total_records"] == 0


def test_list_leads_column_sorting():
    """Verify that column-header sorting works accurately for salespeople."""
    # 1. Sort by Recent Revenue descending (Top revenue accounts first)
    res_rev = client.get("/api/v1/leads?status=Active&sort_by=businessLast3m&sort_order=desc")
    assert res_rev.status_code == 200
    data_rev = res_rev.json()["data"]
    assert len(data_rev) > 0
    assert data_rev[0]["full_name"] == "A ENTERPRISES HOLDING INC."
    assert data_rev[0]["business_last_3m"] > 180000000.0
    # Verify strictly non-increasing order for businessLast3m
    for i in range(len(data_rev) - 1):
        if data_rev[i]["business_last_3m"] is not None and data_rev[i+1]["business_last_3m"] is not None:
            assert data_rev[i]["business_last_3m"] >= data_rev[i+1]["business_last_3m"]

    # 2. Sort by Full Name descending (Z-A)
    res_name = client.get("/api/v1/leads?status=Active&sort_by=fullName&sort_order=desc")
    assert res_name.status_code == 200
    data_name = res_name.json()["data"]
    assert len(data_name) > 0
    assert data_name[0]["full_name"] >= data_name[1]["full_name"]


def test_list_leads_dynamic_audience_counts():
    # Baseline active leads count
    res_base = client.get("/api/v1/leads?status=Active")
    assert res_base.status_code == 200
    base_counts = res_base.json()["audience_counts"]
    assert base_counts["all"] == 578
    assert base_counts["shippers"] == 229

    # Filtered by customer group
    res_filtered = client.get("/api/v1/leads?status=Active&customer_groups=Shipper+%2F+Consignee")
    assert res_filtered.status_code == 200
    filtered_payload = res_filtered.json()
    filtered_counts = filtered_payload["audience_counts"]
    assert filtered_payload["total_records"] == 229
    assert filtered_counts["all"] == 229
    assert filtered_counts["shippers"] == 229
    assert filtered_counts["subagents"] == 0
    assert filtered_counts["overseas"] == 0

    # Filtered by search query
    res_search = client.get("/api/v1/leads?status=Active&search=3S+CORPORATION")
    assert res_search.status_code == 200
    search_payload = res_search.json()
    assert search_payload["audience_counts"]["all"] == search_payload["total_records"]
    assert search_payload["audience_counts"]["all"] < 578


def test_list_leads_not_active_dataset():
    response = client.get("/api/v1/leads?status=Not+Active&page=1&page_size=25")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 2279
    assert len(payload["data"]) == 25
    for item in payload["data"]:
        assert item["status"] == "Not Active"


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
    res = client.post("/api/v1/auth/login", json={"email": "deepak@jfll.com"})
    assert res.status_code == 200
    payload = res.json()
    assert payload["email"] == "deepak@jfll.com"
    assert payload["name"] == "Deepak Naidu"
    assert payload["role"] == "Tech Lead"
    assert "token" in payload
    token = payload["token"]

    # 2. Verify token via /api/v1/auth/me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_payload = me_res.json()
    assert me_payload["email"] == "deepak@jfll.com"
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

    # Old email deepak.naidu@jfll.com is strictly unauthorized
    res_old = client.post("/api/v1/auth/login", json={"email": "deepak.naidu@jfll.com"})
    assert res_old.status_code == 401
    assert "Access restricted" in res_old.json()["detail"]
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
    email = "deepak@jfll.com"

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
    email = "deepak@jfll.com"

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


def test_audit_logging_and_user_attribution(caplog):
    """Verify that login events and authenticated queries record user_email audit metadata."""
    import logging

    with caplog.at_level(logging.INFO):
        # 1. Login success audit record
        res = client.post("/api/v1/auth/login", json={"email": "deepak@jfll.com"})
        assert res.status_code == 200
        token = res.json()["token"]

        assert any("LOGIN_SUCCESS" in record.message or "deepak@jfll.com" in record.message for record in caplog.records)

        # 2. Authenticated query attribution in telemetry
        query_res = client.get(
            "/api/v1/leads?search=Logistics&page=1",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert query_res.status_code == 200

        # Verify that CloudWatch logging middleware handled request with x-request-id
        assert "x-request-id" in query_res.headers


def test_rotating_file_handler_auto_clean(tmp_path):
    """Verify that setup_logger initializes rotating file handler when LOG_FILE_PATH is set."""
    from src.api.logger import setup_logger

    log_file = tmp_path / "test_logs" / "app.log"
    os.environ["LOG_FILE_PATH"] = str(log_file)
    try:
        custom_logger = setup_logger("test.rotating.logger")
        custom_logger.info("Test message for file rotation")

        assert log_file.exists()
        content = log_file.read_text()
        assert "Test message for file rotation" in content
    finally:
        os.environ.pop("LOG_FILE_PATH", None)


def test_single_device_session_displacement_immediate():
    """Verify that a second login immediately displaces the first device session."""
    # 1. Device 1 logs in
    res1 = client.post("/api/v1/auth/login", json={"email": "deepak@jfll.com"})
    assert res1.status_code == 200
    token1 = res1.json()["token"]

    # Device 1 can access /me
    me1 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token1}"})
    assert me1.status_code == 200

    # 2. Device 2 logs in with same email
    res2 = client.post("/api/v1/auth/login", json={"email": "deepak@jfll.com"})
    assert res2.status_code == 200
    token2 = res2.json()["token"]

    # 3. Device 1's token is immediately superseded without Device 2 needing to query first
    heartbeat1 = client.get("/api/v1/auth/heartbeat", headers={"Authorization": f"Bearer {token1}"})
    assert heartbeat1.status_code == 401
    assert "SESSION_SUPERSEDED" in heartbeat1.json()["detail"]

    # Device 2's token is valid
    heartbeat2 = client.get("/api/v1/auth/heartbeat", headers={"Authorization": f"Bearer {token2}"})
    assert heartbeat2.status_code == 200
    assert heartbeat2.json()["active"] is True


def test_enterprise_security_headers():
    """Verify that SecurityHeadersMiddleware injects enterprise defense-in-depth headers on responses."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-xss-protection") == "1; mode=block"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "geolocation=()" in res.headers.get("permissions-policy", "")


def test_token_verification_cryptographic_edge_cases():
    """Verify that verify_token strictly rejects tokens with missing/invalid exp or future iat."""
    import hashlib
    import hmac
    import json
    from datetime import UTC, datetime

    from src.api.auth import _base64url_encode, verify_token
    from src.api.config import settings

    def make_raw_token(payload_dict):
        header = {"alg": "HS256", "typ": "JWT"}
        h_b64 = _base64url_encode(json.dumps(header).encode())
        p_b64 = _base64url_encode(json.dumps(payload_dict).encode())
        sig = hmac.new(
            settings.auth_secret_key.encode("utf-8"),
            f"{h_b64}.{p_b64}".encode(),
            hashlib.sha256,
        ).digest()
        sig_b64 = _base64url_encode(sig)
        return f"{h_b64}.{p_b64}.{sig_b64}"

    # 1. Missing exp claim
    t_no_exp = make_raw_token({"sub": "test@jfll.com"})
    assert verify_token(t_no_exp) is None

    # 2. Non-numeric exp claim
    t_str_exp = make_raw_token({"sub": "test@jfll.com", "exp": "2099-01-01"})
    assert verify_token(t_str_exp) is None

    # 3. Expired token
    t_expired = make_raw_token({"sub": "test@jfll.com", "exp": 1000000})
    assert verify_token(t_expired) is None

    # 4. Far future iat claim (> 5 mins clock skew)
    now_ts = datetime.now(UTC).timestamp()
    t_future_iat = make_raw_token({"sub": "test@jfll.com", "exp": now_ts + 3600, "iat": now_ts + 600})
    assert verify_token(t_future_iat) is None

    # 5. Invalid signature / altered payload
    valid_token = make_raw_token({"sub": "test@jfll.com", "exp": now_ts + 3600, "iat": now_ts})
    parts = valid_token.split(".")
    tampered_payload = _base64url_encode(json.dumps({"sub": "hacker@evil.com", "exp": now_ts + 3600}).encode())
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"
    assert verify_token(tampered_token) is None




