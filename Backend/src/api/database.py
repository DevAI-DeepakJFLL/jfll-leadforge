import os
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

