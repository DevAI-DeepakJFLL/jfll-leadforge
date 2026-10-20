import os
import threading
from pathlib import Path
from typing import Optional
import duckdb
from src.api.config import settings

_SHARED_CONNECTION: Optional[duckdb.DuckDBPyConnection] = None
_INIT_LOCK = threading.Lock()

def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Returns a thread-safe cursor from the persistent singleton DuckDB connection."""
    global _SHARED_CONNECTION
    if _SHARED_CONNECTION is None:
        with _INIT_LOCK:
            if _SHARED_CONNECTION is None:
                con = duckdb.connect(":memory:")
                try:
                    con.execute("SET home_directory = '/tmp';")
                    con.execute("SET extension_directory = '/tmp/duckdb_extensions';")
                except Exception:
                    pass

                # Performance & Memory PRAGMAs for Serverless Lambda
                try:
                    con.execute("SET max_memory = '380MB';")
                    con.execute("SET threads = 1;")
                    con.execute("SET preserve_insertion_order = false;")
                    con.execute("SET enable_http_metadata_cache = true;")
                    con.execute("SET http_keep_alive = true;")
                except Exception:
                    pass

                try:
                    con.execute("LOAD httpfs;")
                except Exception:
                    try:
                        con.execute("INSTALL httpfs; LOAD httpfs;")
                    except Exception:
                        pass

                if settings.env == "local":
                    try:
                        con.execute(f"""
                            SET s3_endpoint = '{settings.floci_endpoint}';
                            SET s3_use_ssl = false;
                            SET s3_url_style = 'path';
                            SET s3_access_key_id = '{settings.aws_access_key_id}';
                            SET s3_secret_access_key = '{settings.aws_secret_access_key}';
                        """)
                    except Exception:
                        pass
                else:
                    try:
                        con.execute(f"SET s3_region = '{settings.aws_region}';")
                        access_key = os.getenv("AWS_ACCESS_KEY_ID")
                        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
                        session_token = os.getenv("AWS_SESSION_TOKEN")
                        if access_key and secret_key:
                            con.execute(f"""
                                SET s3_access_key_id = '{access_key}';
                                SET s3_secret_access_key = '{secret_key}';
                            """)
                        if session_token:
                            con.execute(f"SET s3_session_token = '{session_token}';")
                    except Exception:
                        pass

                _SHARED_CONNECTION = con

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

