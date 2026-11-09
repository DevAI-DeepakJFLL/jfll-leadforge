"""
In-memory LRU caching layer for corporate name and entity resolution in DuckDB.
Prevents repeated full-table or S3 range scans for frequent company queries.
"""
from functools import lru_cache
import threading
import time
from typing import Any, Optional

from src.api.database import get_db_connection
from src.api.helpers import build_company_search_sql


@lru_cache(maxsize=1024)
def _cached_lookup(company_term: str, apollo_source: str) -> tuple[str, ...]:
    """Execute parameterized query to resolve corporate search term to organization IDs."""
    try:
        con = get_db_connection()
        comp_sql, comp_params = build_company_search_sql(company_term, col_prefix="a")
        org_rows = con.execute(
            f"SELECT organization_id FROM '{apollo_source}' a WHERE {comp_sql} LIMIT 100",
            comp_params
        ).fetchall()
        return tuple(r[0] for r in org_rows if r[0])
    except Exception:
        return ()


def resolve_company_ids_cached(
    company_name: str | None,
    apollo_source: str,
) -> list[str]:
    """
    Resolves corporate search term to matched organization IDs using in-memory LRU cache.
    Normalizes input by stripping whitespace and converting to lowercase.
    """
    clean_term = (company_name or "").strip().lower()
    if not clean_term:
        return []
    return list(_cached_lookup(clean_term, apollo_source))


def clear_company_cache() -> None:
    """Clears the LRU company search cache (useful for test resets)."""
    _cached_lookup.cache_clear()


# In-memory query result cache with 10-minute TTL for complex analytical contact queries
# Memoizes top complex contact queries over remote S3 HTTPFS to eliminate network jitter
_QUERY_RESULT_CACHE: dict[str, tuple[float, list[dict[str, Any]], int, int, bool]] = {}
_MAX_QUERY_CACHE_SIZE = 100
_QUERY_CACHE_TTL_SECONDS = 600  # 10 minutes
_QUERY_CACHE_LOCK = threading.Lock()


def get_cached_complex_query(signature: str) -> Optional[dict[str, Any]]:
    """Retrieve memoized query results if within 10-minute TTL."""
    now = time.time()
    with _QUERY_CACHE_LOCK:
        if signature in _QUERY_RESULT_CACHE:
            ts, records, total_records, total_pages, has_next = _QUERY_RESULT_CACHE[signature]
            if now - ts <= _QUERY_CACHE_TTL_SECONDS:
                return {
                    "total_records": total_records,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "data": records,
                }
            del _QUERY_RESULT_CACHE[signature]
    return None


def set_cached_complex_query(
    signature: str,
    records: list[dict[str, Any]],
    total_records: int,
    total_pages: int,
    has_next: bool,
) -> None:
    """Store query result in-memory with FIFO eviction capped at 100 entries."""
    now = time.time()
    with _QUERY_CACHE_LOCK:
        if len(_QUERY_RESULT_CACHE) >= _MAX_QUERY_CACHE_SIZE:
            oldest_key = min(_QUERY_RESULT_CACHE.keys(), key=lambda k: _QUERY_RESULT_CACHE[k][0])
            del _QUERY_RESULT_CACHE[oldest_key]
        _QUERY_RESULT_CACHE[signature] = (now, records, total_records, total_pages, has_next)


def clear_complex_query_cache() -> None:
    """Clear all memoized complex query results."""
    with _QUERY_CACHE_LOCK:
        _QUERY_RESULT_CACHE.clear()

