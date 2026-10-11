import os
from pathlib import Path
from pydantic import BaseModel, Field


class Settings(BaseModel):
    env: str = Field(default_factory=lambda: os.getenv("ENV", "local"))
    floci_endpoint: str = Field(default_factory=lambda: os.getenv("FLOCI_ENDPOINT", "localhost:4566"))
    aws_region: str = Field(default_factory=lambda: os.getenv("AWS_REGION", "us-east-1"))
    s3_bucket: str = Field(default_factory=lambda: os.getenv("S3_BUCKET", "customer-master-leads"))
    parquet_key: str = Field(default_factory=lambda: os.getenv("PARQUET_KEY", "leads/active_customers_leads_zstd.parquet"))
    aws_access_key_id: str = Field(default_factory=lambda: os.getenv("AWS_ACCESS_KEY_ID", "test"))
    aws_secret_access_key: str = Field(default_factory=lambda: os.getenv("AWS_SECRET_ACCESS_KEY", "test"))
    api_host: str = Field(default_factory=lambda: os.getenv("API_HOST", "0.0.0.0"))
    api_port: int = Field(default_factory=lambda: int(os.getenv("API_PORT", "8000")))
    auth_secret_key: str = Field(default_factory=lambda: os.getenv("AUTH_SECRET_KEY", "jfll-lead-sourcing-secret-key-2026-enterprise"))
    auth_token_expire_hours: int = Field(default_factory=lambda: int(os.getenv("AUTH_TOKEN_EXPIRE_HOURS", "24")))
    default_user_email: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_EMAIL", "leads@jfll.com"))
    default_user_password: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_PASSWORD", "Jet@123"))
    default_user_name: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_NAME", "JFLL"))
    default_user_role: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_ROLE", "Internal Team"))

    @property
    def local_parquet_path(self) -> Path:
        base_dir = Path(__file__).resolve().parent.parent.parent
        return base_dir / "data" / "processed" / "active_customers_leads_zstd.parquet"

    @property
    def s3_uri(self) -> str:
        return f"s3://{self.s3_bucket}/{self.parquet_key}"


settings = Settings()
