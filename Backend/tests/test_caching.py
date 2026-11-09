from pathlib import Path

from src.api.config import settings
from src.api.database import get_cached_parquet_path


def test_s3_multi_dataset_uri_generation():
    assert "apollo_freight_leads_zstd.parquet" in settings.s3_uri_for("apollo")
    assert "datamyne_leads_zstd.parquet" in settings.s3_uri_for("datamyne")
    assert "active_customers_leads_zstd.parquet" in settings.s3_uri_for("active")
    assert "inactive_customers_leads_zstd.parquet" in settings.s3_uri_for("inactive")

def test_cache_dir_configuration():
    assert isinstance(settings.cache_dir, Path)

def test_cached_parquet_path_local_resolution():
    path = get_cached_parquet_path("active")
    assert path.exists()
    assert path.suffix == ".parquet"
    assert "active_customers_leads_zstd.parquet" in str(path)

def test_cached_parquet_path_apollo_resolution():
    path = get_cached_parquet_path("apollo")
    assert path.exists()
    assert "apollo_freight_leads_zstd.parquet" in str(path)


def test_resolve_company_ids_lru_cache(monkeypatch):
    """Verify that company search uses LRU caching and normalizes terms to avoid redundant S3/disk scans."""
    from src.api.cache import _cached_lookup, clear_company_cache, resolve_company_ids_cached

    clear_company_cache()
    info_initial = _cached_lookup.cache_info()
    assert info_initial.hits == 0
    assert info_initial.misses == 0

    # Query 1: Empty or whitespace query returns empty list without caching
    assert resolve_company_ids_cached("   ", "dummy_source.parquet") == []

    # Mock _cached_lookup inner execution via get_db_connection
    execution_counter = {"count": 0}

    class MockCursor:
        def fetchall(self):
            execution_counter["count"] += 1
            return [("org_123",), ("org_456",)]

    class MockConnection:
        def execute(self, sql, params):
            return MockCursor()

    monkeypatch.setattr("src.api.cache.get_db_connection", lambda: MockConnection())

    # Query 2: First query with search term "Logistics"
    res1 = resolve_company_ids_cached("Logistics", "dummy_source.parquet")
    assert res1 == ["org_123", "org_456"]
    assert execution_counter["count"] == 1

    # Query 3: Repeated query with identical term but different casing and extra whitespace
    res2 = resolve_company_ids_cached("  lOgIsTiCs   ", "dummy_source.parquet")
    assert res2 == ["org_123", "org_456"]
    # Must NOT have hit the database again; count must remain 1
    assert execution_counter["count"] == 1

    # Cache info should show 1 hit and 1 miss
    info = _cached_lookup.cache_info()
    assert info.hits == 1
    assert info.misses == 1

    # Clear cache and verify count resets
    clear_company_cache()
    assert _cached_lookup.cache_info().currsize == 0


def test_complex_contact_query_cache():
    """Verify complex analytical contact queries are memoized with 10-minute TTL."""
    from src.api.cache import (
        clear_complex_query_cache,
        get_cached_complex_query,
        set_cached_complex_query,
    )

    clear_complex_query_cache()
    sig = "s3://lead-cache/apollo_contacts:1=1:('Logistics', 10, 0)"

    # Initially not cached
    assert get_cached_complex_query(sig) is None

    records = [{"person_id": "p_1", "person_name": "Alice"}]
    set_cached_complex_query(sig, records, total_records=1, total_pages=1, has_next=False)

    cached = get_cached_complex_query(sig)
    assert cached is not None
    assert cached["total_records"] == 1
    assert cached["data"][0]["person_name"] == "Alice"

    # Reset cache
    clear_complex_query_cache()
    assert get_cached_complex_query(sig) is None


