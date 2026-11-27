import os
import time
from unittest.mock import MagicMock, patch
import pytest

from src.api.config import settings
from src.api.dsql_client import (
    DSQLConnectionManager,
    DSQLTokenManager,
    execute_dsql_query,
    get_connection,
    get_connection_manager,
    get_db_connection,
    is_dsql_enabled,
    reset_connection_manager,
)


@pytest.fixture(autouse=True)
def cleanup_dsql_state(monkeypatch):
    """Ensure clean state before and after each test."""
    reset_connection_manager()
    yield
    reset_connection_manager()


def test_dsql_disabled_by_default_in_local_env(monkeypatch):
    """When DSQL_ENDPOINT is not set, is_dsql_enabled() must return False."""
    monkeypatch.delenv("DSQL_ENDPOINT", raising=False)
    # Also patch settings if it was loaded with something
    monkeypatch.setattr(settings, "dsql_endpoint", None)
    assert is_dsql_enabled() is False


def test_dsql_enabled_when_endpoint_provided(monkeypatch):
    """When DSQL_ENDPOINT is provided, is_dsql_enabled() must return True."""
    endpoint = "test-cluster.dsql.ap-southeast-2.on.aws"
    monkeypatch.setenv("DSQL_ENDPOINT", endpoint)
    monkeypatch.setattr(settings, "dsql_endpoint", endpoint)
    assert is_dsql_enabled() is True


def test_sqlite_fallback_connection_when_dsql_disabled(monkeypatch):
    """When DSQL is disabled, get_connection() returns a valid SQLite connection."""
    monkeypatch.delenv("DSQL_ENDPOINT", raising=False)
    monkeypatch.setattr(settings, "dsql_endpoint", None)
    
    conn = get_connection()
    assert conn is not None
    # Verify it can execute standard SQLite queries
    cursor = conn.execute("SELECT 1 AS status")
    row = cursor.fetchone()
    assert row["status"] == 1
    conn.close()


def test_get_db_connection_alias_matches_get_connection(monkeypatch):
    """get_db_connection() should be an alias/interface compatible with existing callers."""
    monkeypatch.delenv("DSQL_ENDPOINT", raising=False)
    monkeypatch.setattr(settings, "dsql_endpoint", None)
    
    conn = get_db_connection()
    assert conn is not None
    cursor = conn.execute("SELECT 'ok' AS val")
    assert cursor.fetchone()["val"] == "ok"
    conn.close()


def test_token_manager_generates_and_caches_token():
    """DSQLTokenManager generates a token and reuses it until near expiry."""
    token_mgr = DSQLTokenManager(ttl_seconds=900, refresh_margin_seconds=60)
    
    with patch.object(token_mgr, "_generate_token", return_value="mock-token-abc-123") as mock_gen:
        token1 = token_mgr.get_token(endpoint="test.dsql.on.aws", region="ap-southeast-2")
        assert token1 == "mock-token-abc-123"
        assert mock_gen.call_count == 1
        
        # Second call within TTL should return cached token without calling generator
        token2 = token_mgr.get_token(endpoint="test.dsql.on.aws", region="ap-southeast-2")
        assert token2 == "mock-token-abc-123"
        assert mock_gen.call_count == 1


def test_token_manager_renews_token_after_expiry():
    """DSQLTokenManager generates a new token once token expires past TTL buffer."""
    token_mgr = DSQLTokenManager(ttl_seconds=900, refresh_margin_seconds=60)
    
    with patch.object(token_mgr, "_generate_token", side_effect=["initial-token", "renewed-token"]) as mock_gen:
        token1 = token_mgr.get_token(endpoint="test.dsql.on.aws", region="ap-southeast-2")
        assert token1 == "initial-token"
        assert mock_gen.call_count == 1
        
        # Fast forward time past expiry (now + 850 seconds >= 900 - 60)
        with patch("time.time", return_value=time.time() + 850):
            token2 = token_mgr.get_token(endpoint="test.dsql.on.aws", region="ap-southeast-2")
            assert token2 == "renewed-token"
            assert mock_gen.call_count == 2


def test_token_manager_force_refresh():
    """force_refresh=True generates a new token immediately even if cached."""
    token_mgr = DSQLTokenManager(ttl_seconds=900, refresh_margin_seconds=60)
    
    with patch.object(token_mgr, "_generate_token", side_effect=["token-1", "token-2"]) as mock_gen:
        t1 = token_mgr.get_token(endpoint="test.dsql.on.aws", region="ap-southeast-2")
        assert t1 == "token-1"
        
        t2 = token_mgr.get_token(endpoint="test.dsql.on.aws", region="ap-southeast-2", force_refresh=True)
        assert t2 == "token-2"
        assert mock_gen.call_count == 2


def test_dsql_connection_caching_and_expiry(monkeypatch):
    """Connection manager caches connection and closes/reconnects when expired."""
    monkeypatch.setenv("DSQL_ENDPOINT", "test.dsql.ap-southeast-2.on.aws")
    monkeypatch.setattr(settings, "dsql_endpoint", "test.dsql.ap-southeast-2.on.aws")
    
    mgr = DSQLConnectionManager()
    mock_conn_1 = MagicMock()
    mock_conn_1.closed = False
    mock_conn_2 = MagicMock()
    mock_conn_2.closed = False
    
    with patch.object(mgr, "_create_dsql_connection", side_effect=[mock_conn_1, mock_conn_2]):
        c1 = mgr.get_connection()
        assert c1 == mock_conn_1
        
        # Immediate next call returns cached connection
        c2 = mgr.get_connection()
        assert c2 == mock_conn_1
        
        # Simulate time advancing 15 minutes (900 seconds)
        mgr._conn_created_at = time.time() - 950
        c3 = mgr.get_connection()
        assert c3 == mock_conn_2
        mock_conn_1.close.assert_called_once()


def test_dsql_fallback_when_postgres_driver_missing_in_local_dev(monkeypatch):
    """When DSQL_ENDPOINT is set but postgres drivers are not installed locally, fallback to SQLite."""
    monkeypatch.setenv("DSQL_ENDPOINT", "test.dsql.ap-southeast-2.on.aws")
    monkeypatch.setattr(settings, "dsql_endpoint", "test.dsql.ap-southeast-2.on.aws")
    
    mgr = DSQLConnectionManager()
    with patch("src.api.dsql_client._has_postgres_driver", return_value=False):
        conn = mgr.get_connection()
        assert conn is not None
        # Should be SQLite fallback connection
        cur = conn.execute("SELECT 'fallback_ok' AS res")
        assert cur.fetchone()["res"] == "fallback_ok"
        conn.close()


def test_execute_dsql_query_helper(monkeypatch):
    """execute_dsql_query correctly runs queries and returns dict results."""
    monkeypatch.delenv("DSQL_ENDPOINT", raising=False)
    monkeypatch.setattr(settings, "dsql_endpoint", None)
    
    results = execute_dsql_query("SELECT 42 AS num, 'hello' AS text")
    assert len(results) == 1
    assert results[0]["num"] == 42
    assert results[0]["text"] == "hello"
