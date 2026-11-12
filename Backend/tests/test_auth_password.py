import pytest
from fastapi.testclient import TestClient

from src.api.access_control import (
    DEFAULT_INITIAL_PASSWORD,
    add_to_allowlist,
    hash_password,
    is_user_password_set,
    set_user_password,
    verify_password,
    verify_user_credentials,
)
from src.api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_access_control(tmp_path, monkeypatch):
    """Isolates access_control.json storage in a temporary directory for each test."""
    temp_file = tmp_path / "test_access_control.json"
    monkeypatch.setenv("ACCESS_CONTROL_PATH", str(temp_file))
    yield temp_file


def test_hash_password_and_verify_password():
    """Verifies that scrypt password hashing and constant-time verification behave correctly."""
    pwd = "SecurePassphrase#2026"
    hex_hash, hex_salt = hash_password(pwd)

    # Output structure checks
    assert isinstance(hex_hash, str)
    assert isinstance(hex_salt, str)
    assert len(hex_hash) == 128  # 64 bytes = 128 hex chars
    assert len(hex_salt) == 32  # 16 bytes = 32 hex chars

    # Positive verification
    assert verify_password(pwd, hex_hash, hex_salt) is True

    # Negative verification: incorrect password
    assert verify_password("WrongPassword#123", hex_hash, hex_salt) is False

    # Negative verification: empty or blank inputs
    assert verify_password("", hex_hash, hex_salt) is False
    assert verify_password(pwd, "", hex_salt) is False
    assert verify_password(pwd, hex_hash, "") is False

    # Negative verification: invalid hex salt or hash
    assert verify_password(pwd, hex_hash, "invalid_hex_salt!") is False


def test_hash_password_salting_uniqueness():
    """Verifies that two hashes of the same password produce distinct salts and hashes."""
    pwd = "SamePasswordEveryTime!123"
    h1, s1 = hash_password(pwd)
    h2, s2 = hash_password(pwd)

    assert s1 != s2
    assert h1 != h2
    assert verify_password(pwd, h1, s1) is True
    assert verify_password(pwd, h2, s2) is True


def test_hash_password_empty_raises_error():
    """Verifies that an empty password raises ValueError."""
    with pytest.raises(ValueError, match="Password cannot be empty"):
        hash_password("")


def test_set_and_verify_user_password():
    """Verifies setting a user password and credentials verification."""
    email = "snehal.birje@jfll.com"

    # Default password should be active initially for seeded user
    assert is_user_password_set(email) is True
    ok, err = verify_user_credentials(email, DEFAULT_INITIAL_PASSWORD)
    assert ok is True
    assert err is None

    # Update password
    new_pwd = "UpdatedPassword#2026"
    assert set_user_password(email, new_pwd) is True

    # Old password fails
    ok_old, err_old = verify_user_credentials(email, DEFAULT_INITIAL_PASSWORD)
    assert ok_old is False
    assert err_old == "INVALID_CREDENTIALS"

    # New password succeeds
    ok_new, err_new = verify_user_credentials(email, new_pwd)
    assert ok_new is True
    assert err_new is None


def test_set_user_password_min_length_validation():
    """Verifies that passwords shorter than 6 characters are rejected."""
    with pytest.raises(ValueError, match="at least 6 characters"):
        set_user_password("deepak@jfll.com", "short")


def test_set_user_password_unauthorized_user():
    """Verifies that setting a password for an unknown email fails."""
    assert set_user_password("unknown.person@external.com", "ValidPassphrase#123") is False


def test_login_with_correct_password():
    """Verifies that logging in with the correct password returns 200 and a valid token."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "deepak@jfll.com", "password": DEFAULT_INITIAL_PASSWORD},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "deepak@jfll.com"
    assert data["role"] == "Tech Lead"
    assert data["requires_password_setup"] is False
    assert "token" in data
    token = data["token"]

    # Verify session on /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["requires_password_setup"] is False


def test_login_with_wrong_password():
    """Verifies that logging in with an invalid password returns 401."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "deepak@jfll.com", "password": "CompletelyWrongPassword!"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."


def test_login_with_missing_password_when_set():
    """Verifies that omitting password for an account with a password configured returns 401."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "deepak@jfll.com"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."


def test_preauthorized_user_without_password_smooth_onboarding():
    """
    Verifies backward-compatible onboarding: a pre-authorized user who has not yet
    set a password receives 200 with requires_password_setup=True.
    """
    new_user_email = "new.commercial@jfll.com"
    add_to_allowlist(email=new_user_email, name="New Commercial Agent", role="Commercial", added_by="admin")

    assert is_user_password_set(new_user_email) is False

    # Login without password
    res = client.post(
        "/api/v1/auth/login",
        json={"email": new_user_email},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == new_user_email
    assert data["requires_password_setup"] is True
    assert "token" in data
    token = data["token"]

    # Check /me reflects requires_password_setup=True
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["requires_password_setup"] is True


def test_set_password_endpoint_flow():
    """
    Tests the complete POST /api/v1/auth/set-password endpoint flow:
    1. Pre-authorized user sets password.
    2. Receives a new signed session token.
    3. Can subsequently log in with the new password.
    4. Login without password now fails.
    """
    user_email = "onboarding.agent@jfll.com"
    add_to_allowlist(email=user_email, name="Onboarding Agent", role="Commercial", added_by="admin")

    new_password = "MyNewSecurePassword#2026"
    set_res = client.post(
        "/api/v1/auth/set-password",
        json={"email": user_email, "new_password": new_password},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert set_res.status_code == 200
    set_data = set_res.json()
    assert set_data["email"] == user_email
    assert set_data["requires_password_setup"] is False
    assert "token" in set_data

    # Subsequent login without password now fails
    res_no_pwd = client.post(
        "/api/v1/auth/login",
        json={"email": user_email},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_no_pwd.status_code == 401
    assert res_no_pwd.json()["detail"] == "Invalid email or password."

    # Subsequent login with new password succeeds
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": new_password},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_login.status_code == 200
    assert res_login.json()["requires_password_setup"] is False


def test_set_password_validation_and_restrictions():
    """Verifies input validation on POST /api/v1/auth/set-password."""
    # 1. Password too short (< 8 chars)
    res_short = client.post(
        "/api/v1/auth/set-password",
        json={"email": "deepak@jfll.com", "new_password": "short"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_short.status_code in (400, 422)

    # 2. Unauthorized email
    res_unauth = client.post(
        "/api/v1/auth/set-password",
        json={"email": "attacker@evil.com", "new_password": "ValidLengthPassword123!"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_unauth.status_code == 401
    assert "Access restricted" in res_unauth.json()["detail"]


def test_set_password_requires_auth_or_current_password_if_already_set():
    """
    SEC-01: Verifies that an unauthenticated attacker cannot overwrite an existing password.
    Requires either the valid current_password or an active authenticated session.
    """
    email = "deepak@jfll.com"

    # 1. Unauthenticated attempt without current_password must be rejected
    res_takeover = client.post(
        "/api/v1/auth/set-password",
        json={"email": email, "new_password": "HackerPassword123!"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_takeover.status_code == 401
    assert "Valid current password or active session required" in res_takeover.json()["detail"]

    # 2. Attempt with wrong current_password must be rejected
    res_wrong_curr = client.post(
        "/api/v1/auth/set-password",
        json={"email": email, "new_password": "HackerPassword123!", "current_password": "WrongPassword#999"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_wrong_curr.status_code == 401

    # 3. Valid update with correct current_password succeeds
    res_valid_curr = client.post(
        "/api/v1/auth/set-password",
        json={"email": email, "new_password": "NewSecretPassword#2026", "current_password": DEFAULT_INITIAL_PASSWORD},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res_valid_curr.status_code == 200
    assert "token" in res_valid_curr.json()

    # 4. Valid update with active authenticated session token succeeds
    active_token = res_valid_curr.json()["token"]
    res_valid_token = client.post(
        "/api/v1/auth/set-password",
        json={"email": email, "new_password": "AnotherSecretPassword#2026"},
        headers={"User-Agent": "Mozilla/5.0", "Authorization": f"Bearer {active_token}"},
    )
    assert res_valid_token.status_code == 200


def test_thread_safe_session_store_concurrency():
    """Verify thread-safe session store accessors handle high-concurrency access without race conditions."""
    import concurrent.futures
    from src.api.session_store import (
        get_active_session,
        set_active_session,
        clear_active_session,
        clear_all_sessions,
    )

    clear_all_sessions()

    def worker(worker_id: int):
        email = f"user_{worker_id % 10}@jfll.com"
        for i in range(50):
            session_id = f"sess_{worker_id}_{i}"
            set_active_session(email, session_id)
            current = get_active_session(email)
            assert current is not None
            if i % 10 == 0:
                clear_active_session(email)

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(worker, i) for i in range(20)]
        for future in concurrent.futures.as_completed(futures):
            future.result()  # Will raise if an assertion or exception occurred


def test_session_store_redis_adapter(monkeypatch):
    """Verify session store delegates to Redis when REDIS_URL is provided for horizontal scaling."""
    import src.api.session_store as store

    mock_redis_storage = {}

    class MockRedis:
        def get(self, key):
            return mock_redis_storage.get(key)

        def set(self, key, value, ex=None):
            mock_redis_storage[key] = value

        def delete(self, key):
            return mock_redis_storage.pop(key, None)

    monkeypatch.setattr(store, "_REDIS_CLIENT", MockRedis())

    email = "redis_user@jfll.com"
    sess_id = "sess_redis_123"

    store.set_active_session(email, sess_id)
    assert mock_redis_storage.get("session:redis_user@jfll.com") == sess_id
    assert store.get_active_session(email) == sess_id

    store.clear_active_session(email)
    assert "session:redis_user@jfll.com" not in mock_redis_storage
    assert store.get_active_session(email) is None


def test_legacy_password_auto_upgrade_to_jet123():
    """Verifies that an account holding the legacy JetFreight@2026! password auto-upgrades to Jet@123 on login."""
    from src.api.access_control import (
        LEGACY_INITIAL_PASSWORD,
        load_access_data,
        save_access_data,
    )

    data = load_access_data()
    leg_h, leg_s = hash_password(LEGACY_INITIAL_PASSWORD)
    user_email = "tyra.theknath@jfll.com"

    for u in data.get("allowlist", []):
        if u.get("email", "").lower() == user_email:
            u["password_hash"] = leg_h
            u["salt"] = leg_s
            u["is_password_set"] = True
            break
    save_access_data(data)

    # Login with Jet@123 must succeed and auto-upgrade
    res = client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": DEFAULT_INITIAL_PASSWORD},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == user_email

    # Subsequent login with Jet@123 still succeeds
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": DEFAULT_INITIAL_PASSWORD},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert res2.status_code == 200


def test_sec_01_onboarding_token_cannot_access_data_endpoints():
    """SEC-01: Verifies that an uninitialized account's onboarding token cannot access data endpoints."""
    user_email = "new.restricted.rep@jfll.com"
    add_to_allowlist(email=user_email, name="Restricted Rep", role="Commercial", added_by="admin")

    # 1. Login returns token with requires_password_setup=True
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": user_email},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["requires_password_setup"] is True
    onboarding_token = data["token"]

    # 2. Attempting to query protected leads with this token is blocked with 403
    leads_res = client.get(
        "/api/v1/leads",
        headers={"Authorization": f"Bearer {onboarding_token}"},
    )
    assert leads_res.status_code == 403
    assert "PASSWORD_SETUP_REQUIRED" in leads_res.json()["detail"]


def test_sec_01_unauthenticated_set_password_rejected_in_production(monkeypatch):
    """SEC-01: Verifies that an unauthenticated attacker cannot set an initial password in production."""
    user_email = "victim.onboarding@jfll.com"
    add_to_allowlist(email=user_email, name="Victim Onboarding", role="Commercial", added_by="admin")

    from src.api.config import settings
    monkeypatch.setattr(settings, "allow_dev_auth_bypass", False)

    # Calling /set-password without token or current_password must be rejected
    unauth_res = client.post(
        "/api/v1/auth/set-password",
        json={"email": user_email, "new_password": "HackerPassword#2026"},
        headers={"User-Agent": "Mozilla/5.0"},
    )
    assert unauth_res.status_code == 401
    assert "Authentication required to initialize account password" in unauth_res.json()["detail"]


def test_sec_03_ip_ban_cannot_be_bypassed_with_arbitrary_device_fingerprint():
    """SEC-03: Verifies that a banned IP cannot bypass the block by supplying an arbitrary device fingerprint."""
    from src.api.access_control import block_entity

    banned_ip = "198.51.100.222"
    block_entity(ip=banned_ip, reason="Malicious activity", actor="test")

    # Request from banned IP with arbitrary clean fingerprint must still be blocked
    bypass_attempt = client.get(
        "/api/v1/leads",
        headers={
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": banned_ip,
            "X-Device-Fingerprint": "fp_random_unbanned_bypass_12345",
        },
    )
    assert bypass_attempt.status_code == 403
    assert "DEVICE_BLOCKED" in bypass_attempt.json()["detail"]


