import logging
import os
import threading
from pathlib import Path

import duckdb

from src.api.config import settings

logger = logging.getLogger(__name__)

_SHARED_CONNECTION: duckdb.DuckDBPyConnection | None = None
_INIT_LOCK = threading.Lock()
_LAST_SESSION_TOKEN: str | None = None

def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Returns a thread-safe cursor from the persistent singleton DuckDB connection."""
    global _SHARED_CONNECTION, _LAST_SESSION_TOKEN
    if _SHARED_CONNECTION is None:
        with _INIT_LOCK:
            if _SHARED_CONNECTION is None:
                con = duckdb.connect(":memory:")
                try:
                    con.execute("SET home_directory = '/tmp';")
                    con.execute("SET extension_directory = '/tmp/duckdb_extensions';")
                except Exception as err:
                    logger.debug("Non-critical DuckDB directory PRAGMA notice: %s", err)

                # Performance & Memory PRAGMAs for Serverless Lambda
                try:
                    con.execute("SET max_memory = '380MB';")
                    con.execute("SET threads = 1;")
                    con.execute("SET preserve_insertion_order = false;")
                    con.execute("SET enable_http_metadata_cache = true;")
                    con.execute("SET http_keep_alive = true;")
                except Exception as err:
                    logger.debug("Non-critical DuckDB serverless PRAGMA notice: %s", err)

                try:
                    con.execute("LOAD httpfs;")
                except Exception:
                    try:
                        con.execute("INSTALL httpfs; LOAD httpfs;")
                    except Exception as err:
                        logger.warning("Could not load DuckDB httpfs extension: %s", err)

                if settings.env == "local":
                    try:
                        clean_endpoint = settings.floci_endpoint.replace("'", "''")
                        clean_access_key = settings.aws_access_key_id.replace("'", "''")
                        clean_secret_key = settings.aws_secret_access_key.replace("'", "''")
                        con.execute(f"""
                            SET s3_endpoint = '{clean_endpoint}';
                            SET s3_use_ssl = false;
                            SET s3_url_style = 'path';
                            SET s3_access_key_id = '{clean_access_key}';
                            SET s3_secret_access_key = '{clean_secret_key}';
                        """)
                    except Exception as err:
                        logger.warning("Error configuring local S3/Floci credentials: %s", err)
                else:
                    try:
                        clean_region = settings.aws_region.replace("'", "''")
                        con.execute(f"SET s3_region = '{clean_region}';")
                        access_key = os.getenv("AWS_ACCESS_KEY_ID")
                        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
                        session_token = os.getenv("AWS_SESSION_TOKEN")
                        if access_key and secret_key:
                            clean_ak = access_key.replace("'", "''")
                            clean_sk = secret_key.replace("'", "''")
                            con.execute(f"""
                                SET s3_access_key_id = '{clean_ak}';
                                SET s3_secret_access_key = '{clean_sk}';
                            """)
                        if session_token:
                            clean_st = session_token.replace("'", "''")
                            try:
                                con.execute(f"SET GLOBAL s3_session_token = '{clean_st}';")
                            except Exception:
                                pass
                            con.execute(f"SET s3_session_token = '{clean_st}';")
                        _LAST_SESSION_TOKEN = session_token
                    except Exception as err:
                        logger.warning("Error configuring AWS S3 credentials in DuckDB: %s", err)

                _SHARED_CONNECTION = con

    # In AWS environments, handle IAM STS session token rotation dynamically
    if settings.env != "local":
        current_session_token = os.getenv("AWS_SESSION_TOKEN")
        if current_session_token != _LAST_SESSION_TOKEN:
            with _INIT_LOCK:
                if current_session_token != _LAST_SESSION_TOKEN and _SHARED_CONNECTION is not None:
                    try:
                        if current_session_token:
                            clean_st = current_session_token.replace("'", "''")
                            try:
                                _SHARED_CONNECTION.execute(f"SET GLOBAL s3_session_token = '{clean_st}';")
                            except Exception:
                                pass
                            _SHARED_CONNECTION.execute(f"SET s3_session_token = '{clean_st}';")
                        else:
                            try:
                                _SHARED_CONNECTION.execute("SET GLOBAL s3_session_token = '';")
                            except Exception:
                                pass
                            _SHARED_CONNECTION.execute("SET s3_session_token = '';")
                        _LAST_SESSION_TOKEN = current_session_token
                    except Exception as err:
                        logger.warning("Error updating DuckDB AWS STS session token: %s", err)

    return _SHARED_CONNECTION.cursor()


def get_cached_parquet_path(dataset: str = "active") -> Path:
    """
    Returns the local path to the requested Parquet dataset.
    In AWS Lambda / production, transparently caches the S3 Parquet file in /tmp/lead_cache/
    on cold start, ensuring subsequent queries execute locally in 2-5ms with ZERO S3 GET requests.
    """
    filename = settings.get_dataset_filename(dataset)

    # 1. Local environment check
    if settings.env == "local":
        local_p = settings.local_parquet_path.parent / filename
        if local_p.exists():
            return local_p
        apollo_p = settings.local_parquet_path.parent.parent / "Apollo" / filename
        if apollo_p.exists():
            return apollo_p

    # 2. Large dataset guard: Avoid downloading >50MB datasets to ephemeral Lambda /tmp (512MB limit)
    if dataset in ("apollo_contacts_profile", "apollo_contacts_unprofiled"):
        local_p = settings.local_parquet_path.parent / filename
        if local_p.exists():
            return local_p
        apollo_p = settings.local_parquet_path.parent.parent / "Apollo" / filename
        if apollo_p.exists():
            return apollo_p
        raise FileNotFoundError(f"Large analytical dataset '{dataset}' streamed directly via S3 HTTPFS")

    # 3. Ephemeral /tmp cache check
    cache_path = settings.cache_dir / filename
    if cache_path.exists() and cache_path.stat().st_size > 0:
        return cache_path

    # 4. Cache Miss: Download once from S3 into cache_dir (for small/medium datasets <= 50MB)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3_key = f"leads/{filename}"
        s3.download_file(settings.s3_bucket, s3_key, str(cache_path))
        return cache_path
    except Exception:
        # Fallback to local processed file if available
        local_p = settings.local_parquet_path.parent / filename
        if local_p.exists():
            return local_p
        raise

