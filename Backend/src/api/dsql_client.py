"""Aurora DSQL Client & Database Abstraction Layer.

Provides high-concurrency distributed SQL connectivity to Amazon Aurora DSQL
with automatic 15-minute IAM auth token generation/caching, connection pooling,
and graceful fallback to local SQLite for offline/testing environments.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from src.api.config import settings

logger = logging.getLogger(__name__)


def _has_postgres_driver() -> bool:
    """Checks whether a PostgreSQL driver is installed in the current environment."""
    try:
        import aurora_dsql_psycopg  # noqa: F401
        return True
    except ImportError:
        pass
    try:
        import psycopg  # noqa: F401
        return True
    except ImportError:
        pass
    try:
        import psycopg2  # noqa: F401
        return True
    except ImportError:
        pass
    try:
        import aurora_dsql  # noqa: F401
        return True
    except ImportError:
        pass
    return False


def get_dsql_endpoint() -> str | None:
    """Returns configured DSQL endpoint from environment or settings if set."""
    env_val = os.getenv("DSQL_ENDPOINT")
    if env_val is not None:
        val = env_val.strip()
        return val if val else None
    ep = getattr(settings, "dsql_endpoint", None)
    if ep and str(ep).strip():
        return str(ep).strip()
    return None


def is_dsql_enabled() -> bool:
    """Returns True if Aurora DSQL endpoint is configured, False otherwise."""
    return get_dsql_endpoint() is not None


class DSQLTokenManager:
    """Manages IAM auth tokens for Aurora DSQL with 15-minute token expiry awareness."""

    def __init__(self, ttl_seconds: int = 900, refresh_margin_seconds: int = 60):
        self.ttl_seconds = ttl_seconds
        self.refresh_margin_seconds = refresh_margin_seconds
        self._token: str | None = None
        self._expires_at: float = 0.0
        self._lock = threading.Lock()

    def get_token(
        self,
        endpoint: str | None = None,
        region: str | None = None,
        force_refresh: bool = False,
    ) -> str:
        """Retrieves a cached token or generates a fresh one if expired."""
        with self._lock:
            now = time.time()
            if (
                not force_refresh
                and self._token is not None
                and now < (self._expires_at - self.refresh_margin_seconds)
            ):
                return self._token

            target_endpoint = endpoint or get_dsql_endpoint() or "localhost"
            target_region = region or getattr(settings, "aws_region", "ap-southeast-2")

            self._token = self._generate_token(target_endpoint, target_region)
            self._expires_at = now + self.ttl_seconds
            return self._token

    def _generate_token(self, endpoint: str, region: str) -> str:
        """Calls AWS SDK boto3 to generate Aurora DSQL admin auth token."""
        try:
            import boto3

            client = boto3.client("dsql", region_name=region)
            if hasattr(client, "generate_db_connect_admin_auth_token"):
                return client.generate_db_connect_admin_auth_token(
                    Hostname=endpoint, Region=region
                )
            elif hasattr(client, "generate_db_connect_auth_token"):
                return client.generate_db_connect_auth_token(
                    Hostname=endpoint, Region=region
                )
        except Exception as exc:
            logger.warning(
                "Could not generate DSQL token via boto3: %s. Using local token.", exc
            )
        return f"dsql-token-{endpoint}-{int(time.time())}"

    def reset(self) -> None:
        """Resets cached token and expiration timestamp."""
        with self._lock:
            self._token = None
            self._expires_at = 0.0


class DSQLConnectionManager:
    """Manages Aurora DSQL database connections and local SQLite fallback."""

    def __init__(
        self,
        token_manager: DSQLTokenManager | None = None,
        conn_ttl_seconds: int = 900,
    ):
        self.token_manager = token_manager or DSQLTokenManager()
        self.conn_ttl_seconds = conn_ttl_seconds
        self._conn: Any = None
        self._conn_created_at: float = 0.0
        self._lock = threading.Lock()

    def get_connection(self) -> Any:
        """Returns an active DSQL connection or SQLite fallback connection."""
        if not is_dsql_enabled():
            return get_sqlite_connection()

        with self._lock:
            now = time.time()
            # Reuse cached connection if still open and within 15m lifetime
            if self._conn is not None:
                is_closed = getattr(self._conn, "closed", False)
                if callable(is_closed):
                    is_closed = is_closed()
                if not is_closed and (now - self._conn_created_at) < self.conn_ttl_seconds:
                    return self._conn
                self._close_conn_unsafe()

            endpoint = get_dsql_endpoint()
            region = getattr(settings, "aws_region", "ap-southeast-2")
            self._conn = self._create_dsql_connection(endpoint, region)
            self._conn_created_at = now
            return self._conn

    def _create_dsql_connection(self, endpoint: str | None, region: str) -> Any:
        """Attempts connection to Aurora DSQL or falls back if driver is unavailable."""
        if not _has_postgres_driver():
            logger.warning(
                "PostgreSQL driver (psycopg/psycopg2) not available; "
                "falling back to local SQLite connection manager."
            )
            return get_sqlite_connection()

        # 1. Try official aurora_dsql_psycopg if available
        try:
            import aurora_dsql_psycopg as dsql_psycopg

            return dsql_psycopg.connect(f"postgresql://{endpoint}/postgres?user=admin")
        except ImportError:
            pass
        except Exception as exc:
            logger.warning("Failed connecting via aurora_dsql_psycopg: %s; trying psycopg.", exc)

        # 2. Try psycopg with IAM auth token
        token = self.token_manager.get_token(endpoint, region)

        try:
            import psycopg

            return psycopg.connect(
                host=endpoint,
                port=5432,
                dbname="postgres",
                user="admin",
                password=token,
                sslmode="require",
            )
        except ImportError:
            pass
        except Exception as exc:
            logger.warning("Failed connecting via psycopg: %s; falling back to SQLite.", exc)
            return get_sqlite_connection()

        # Try psycopg2
        try:
            import psycopg2

            return psycopg2.connect(
                host=endpoint,
                port=5432,
                dbname="postgres",
                user="admin",
                password=token,
                sslmode="require",
            )
        except ImportError:
            pass
        except Exception as exc:
            logger.warning("Failed connecting via psycopg2: %s; falling back to SQLite.", exc)
            return get_sqlite_connection()

        # Try aurora_dsql connector
        try:
            import aurora_dsql

            return aurora_dsql.connect(
                host=endpoint,
                region=region,
                user="admin",
            )
        except ImportError:
            pass
        except Exception as exc:
            logger.warning("Failed connecting via aurora_dsql: %s; falling back to SQLite.", exc)
            return get_sqlite_connection()

        return get_sqlite_connection()

    def _close_conn_unsafe(self) -> None:
        """Closes cached connection without acquiring lock."""
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
            self._conn_created_at = 0.0

    def close(self) -> None:
        """Closes any cached connection safely."""
        with self._lock:
            self._close_conn_unsafe()

    def reset(self) -> None:
        """Resets cached connection and token manager."""
        with self._lock:
            self._close_conn_unsafe()
            self.token_manager.reset()


def get_sqlite_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    """Delegates to existing local SQLite connection manager."""
    from src.api.lead_tracker_db import get_db_connection as get_sqlite_conn

    return get_sqlite_conn(db_path)


_default_manager = DSQLConnectionManager()


def get_connection_manager() -> DSQLConnectionManager:
    """Returns the singleton DSQLConnectionManager."""
    global _default_manager
    return _default_manager


def reset_connection_manager() -> None:
    """Resets the singleton connection manager state."""
    global _default_manager
    if _default_manager:
        _default_manager.reset()


def get_connection() -> Any:
    """Returns a database connection: Aurora DSQL if enabled, else SQLite."""
    return get_connection_manager().get_connection()


def get_db_connection() -> Any:
    """Drop-in compatible alias for get_connection()."""
    return get_connection()


def execute_dsql_query(
    sql: str,
    params: tuple | list | dict | None = None,
    fetch_all: bool = True,
) -> list[dict[str, Any]]:
    """Executes a SQL query on Aurora DSQL or fallback SQLite, returning row dicts."""
    conn = get_connection()
    params = params or ()

    is_sqlite = isinstance(conn, sqlite3.Connection) or hasattr(conn, "row_factory")

    if is_sqlite:
        cur = conn.execute(sql, params)
        if cur.description is not None:
            rows = (
                cur.fetchall()
                if fetch_all
                else ([cur.fetchone()] if cur.fetchone() else [])
            )
            return [dict(r) for r in rows if r is not None]
        conn.commit()
        return []
    else:
        # Postgres / psycopg connection
        pg_sql = sql.replace("?", "%s") if "?" in sql else sql
        with conn.cursor() as cur:
            cur.execute(pg_sql, params)
            if cur.description is not None:
                colnames = [desc[0] for desc in cur.description]
                rows = (
                    cur.fetchall()
                    if fetch_all
                    else ([cur.fetchone()] if cur.fetchone() else [])
                )
                result = []
                for r in rows:
                    if r is None:
                        continue
                    if isinstance(r, dict):
                        result.append(r)
                    else:
                        result.append(dict(zip(colnames, r)))
                return result
            conn.commit()
            return []


def init_dsql_schema() -> None:
    """Initializes tables in DSQL if enabled, or SQLite if fallback."""
    if is_dsql_enabled():
        try:
            from src.api.dsql_schema import DSQL_TABLES_DDL

            for ddl in DSQL_TABLES_DDL:
                execute_dsql_query(ddl)
            logger.info("Aurora DSQL schema initialized successfully.")
        except ImportError:
            logger.warning(
                "dsql_schema module not yet available; skipping DSQL DDL initialization."
            )
    else:
        from src.api.lead_tracker_db import init_db

        init_db()
        logger.info("Local SQLite schema initialized successfully.")
