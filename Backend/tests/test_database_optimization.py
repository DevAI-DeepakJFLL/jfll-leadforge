import pytest
from src.api.database import get_db_connection

def test_duckdb_persistent_connection_and_pragmas():
    con1 = get_db_connection()
    con2 = get_db_connection()
    
    # Connections should share the same underlying database instance
    res_mem = con1.execute("SELECT current_setting('max_memory')").fetchone()[0]
    assert "380" in str(res_mem) or "380MB" in str(res_mem) or "380.0" in str(res_mem) or "362" in str(res_mem)
    
    res_threads = con1.execute("SELECT current_setting('threads')").fetchone()[0]
    assert int(res_threads) <= 2

    # Verify serverless PRAGMAs
    res_order = con1.execute("SELECT current_setting('preserve_insertion_order')").fetchone()[0]
    assert str(res_order).lower() == "false"

    res_meta_cache = con1.execute("SELECT current_setting('enable_http_metadata_cache')").fetchone()[0]
    assert str(res_meta_cache).lower() == "true"

    res_keep_alive = con1.execute("SELECT current_setting('http_keep_alive')").fetchone()[0]
    assert str(res_keep_alive).lower() == "true"

    # Verify shared database instance across cursors
    con1.execute("CREATE TABLE IF NOT EXISTS _test_persistent_shared (id INTEGER);")
    con1.execute("INSERT INTO _test_persistent_shared VALUES (100);")
    shared_val = con2.execute("SELECT id FROM _test_persistent_shared;").fetchone()[0]
    assert shared_val == 100
    con1.execute("DROP TABLE _test_persistent_shared;")


def test_company_resolution_lru_cache():
    from src.api.cache import resolve_company_ids_cached, clear_company_cache
    clear_company_cache()
    
    con = get_db_connection()
    from src.api.routes import get_data_source
    apollo_source = get_data_source(con, dataset="apollo")
    
    # First call - queries DB and caches
    ids1 = resolve_company_ids_cached("sanofi", apollo_source, con)
    # Second call - returns from in-memory cache instantly
    ids2 = resolve_company_ids_cached("sanofi", apollo_source, con)
    assert ids1 == ids2
    assert len(ids1) > 0
    
    # Test whitespace and case normalization
    ids_upper = resolve_company_ids_cached("  SANOFI  ", apollo_source, con)
    assert ids_upper == ids1

    # Test empty query
    assert resolve_company_ids_cached("", apollo_source, con) == []
    assert resolve_company_ids_cached(None, apollo_source, con) == []


def test_company_contacts_peek_pagination():
    from fastapi.testclient import TestClient
    from src.api.main import app

    client = TestClient(app)
    # Boeing org id: 54a1229169702d9a8b695403
    resp = client.get("/api/v1/apollo/companies/54a1229169702d9a8b695403/contacts?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert "has_next" in data
    assert len(data["data"]) == 5
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert data["has_next"] is True
    # Peek pagination: total_records should be offset + page_size + 1 = 6, total_pages = 2
    assert data["total_records"] == 6
    assert data["total_pages"] == 2

    # Nonexistent company test
    resp_empty = client.get("/api/v1/apollo/companies/nonexistent_org_id_99999/contacts?page=1&page_size=5")
    assert resp_empty.status_code == 200
    data_empty = resp_empty.json()
    assert data_empty["has_next"] is False
    assert data_empty["total_records"] == 0
    assert data_empty["total_pages"] == 0
    assert len(data_empty["data"]) == 0



