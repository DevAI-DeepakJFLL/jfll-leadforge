import os
from pathlib import Path
import duckdb
from src.api.config import settings

def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Instantiate a DuckDB connection configured with S3 httpfs credentials."""
    con = duckdb.connect(":memory:")
    try:
        con.execute("LOAD httpfs;")
    except Exception:
        con.execute("INSTALL httpfs; LOAD httpfs;")

    if settings.env == "local":
        con.execute(f"""
            SET s3_endpoint = '{settings.floci_endpoint}';
            SET s3_use_ssl = false;
            SET s3_url_style = 'path';
            SET s3_access_key_id = '{settings.aws_access_key_id}';
            SET s3_secret_access_key = '{settings.aws_secret_access_key}';
        """)
    else:
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

    return con


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

    # 2. Ephemeral /tmp cache check
    cache_path = settings.cache_dir / filename
    if cache_path.exists() and cache_path.stat().st_size > 0:
        return cache_path

    # 3. Cache Miss: Download once from S3 into cache_dir
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

