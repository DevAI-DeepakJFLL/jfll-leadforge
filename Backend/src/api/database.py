import duckdb
from src.api.config import settings


def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Instantiate a DuckDB connection configured with S3 httpfs credentials."""
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")

    if settings.env == "local":
        # Floci AWS Emulator settings
        con.execute(f"""
            SET s3_endpoint = '{settings.floci_endpoint}';
            SET s3_use_ssl = false;
            SET s3_url_style = 'path';
            SET s3_access_key_id = '{settings.aws_access_key_id}';
            SET s3_secret_access_key = '{settings.aws_secret_access_key}';
        """)
    else:
        # Production AWS IAM authentication
        con.execute(f"SET s3_region = '{settings.aws_region}';")

    return con
