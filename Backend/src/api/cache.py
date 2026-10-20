"""
In-memory LRU caching layer for corporate name and entity resolution in DuckDB.
Prevents repeated full-table or S3 range scans for frequent company queries.
"""
from functools import lru_cache

import duckdb

from src.api.helpers import build_company_search_sql


@lru_cache(maxsize=1024)
def _cached_lookup(company_term: str, apollo_source: str) -> tuple[str, ...]:
    """Execute parameterized query to resolve corporate search term to organization IDs."""
    from src.api.database import get_db_connection
    con = get_db_connection()
    comp_sql, comp_params = build_company_search_sql(company_term, col_prefix="a")
    org_rows = con.execute(
        f"SELECT organization_id FROM '{apollo_source}' a WHERE {comp_sql} LIMIT 100",
        comp_params
    ).fetchall()
    return tuple(r[0] for r in org_rows if r[0])


def resolve_company_ids_cached(
    company_name: str | None,
    apollo_source: str,
    con: duckdb.DuckDBPyConnection | None = None
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
    """Clear in-memory LRU cache entries for testing and memory resets."""
    _cached_lookup.cache_clear()

