import os
from pathlib import Path
from typing import Any, ClassVar

from pydantic import BaseModel, Field, field_validator, model_validator


class Settings(BaseModel):
    DEFAULT_INSECURE_SECRET: ClassVar[str] = "jfll-lead-sourcing-secret-key-2026-enterprise"

    env: str = Field(default_factory=lambda: os.getenv("ENV", "local"))
    floci_endpoint: str = Field(default_factory=lambda: os.getenv("FLOCI_ENDPOINT", "localhost:4566"))
    aws_region: str = Field(default_factory=lambda: os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "ap-southeast-2")
    s3_bucket: str = Field(default_factory=lambda: os.getenv("S3_BUCKET") or "jfll-leadforge-data")
    parquet_key: str = Field(default_factory=lambda: os.getenv("PARQUET_KEY", "leads/active_customers_leads_zstd.parquet"))
    aws_access_key_id: str = Field(default_factory=lambda: os.getenv("AWS_ACCESS_KEY_ID", "test"))
    aws_secret_access_key: str = Field(default_factory=lambda: os.getenv("AWS_SECRET_ACCESS_KEY", "test"))
    api_host: str = Field(default_factory=lambda: os.getenv("API_HOST", "127.0.0.1" if os.getenv("ENV") == "local" else "0.0.0.0"))
    api_port: int = Field(default_factory=lambda: int(os.getenv("API_PORT", "8000")))
    auth_secret_key: str = Field(default_factory=lambda: os.getenv("AUTH_SECRET_KEY", "jfll-lead-sourcing-secret-key-2026-enterprise"))
    auth_token_expire_hours: int = Field(default_factory=lambda: int(os.getenv("AUTH_TOKEN_EXPIRE_HOURS", "24")))
    default_user_email: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_EMAIL", "deepak.naidu@jfll.com"))
    default_user_name: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_NAME", "Deepak Naidu"))
    default_user_role: str = Field(default_factory=lambda: os.getenv("DEFAULT_USER_ROLE", "Internal Team"))
    allowed_emails: list[str] = Field(
        default_factory=lambda: [
            e.strip().lower()
            for e in os.getenv(
                "ALLOWED_EMAILS",
                "tyra.theknath@jfll.com,deepak.naidu@jfll.com,akash.dhara@jfll.com,snehal.birje@jfll.com",
            ).split(",")
            if e.strip()
        ]
    )

    @field_validator("allowed_emails", mode="before")
    @classmethod
    def parse_allowed_emails(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            return [e.strip().lower() for e in v.split(",") if e.strip()]
        if isinstance(v, list):
            return [str(e).strip().lower() for e in v if str(e).strip()]
        return v

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.env == "production" and (
            not self.auth_secret_key or self.auth_secret_key == self.DEFAULT_INSECURE_SECRET
        ):
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET_KEY must be set to a secure, "
                "high-entropy secret in production environments. Using the default placeholder is disallowed."
            )
        return self

    cache_dir: Path = Field(
        default_factory=lambda: Path(os.getenv("S3_CACHE_DIR", "/tmp/lead_cache" if os.getenv("AWS_LAMBDA_FUNCTION_NAME") else str(Path(__file__).resolve().parent.parent.parent / "data" / "processed")))
    )

    DATASET_FILES: ClassVar[dict[str, str]] = {
        "active": "active_customers_leads_zstd.parquet",
        "inactive": "inactive_customers_leads_zstd.parquet",
        "datamyne": "datamyne_leads_zstd.parquet",
        "datamyne_valid": "datamyne_valid_leads_zstd.parquet",
        "datamyne_missing": "datamyne_missing_leads_zstd.parquet",
        "datamyne_tiers": "datamyne_tier_segments_zstd.parquet",
        "apollo": "apollo_freight_leads_zstd.parquet",
        "apollo_contacts_profile": "apollo_freight_contacts_with_company_profile.parquet",
        "apollo_contacts_unprofiled": "apollo_freight_contacts_without_company_profile.parquet",
    }

    @property
    def local_parquet_path(self) -> Path:
        base_dir = Path(__file__).resolve().parent.parent.parent
        return base_dir / "data" / "processed" / "active_customers_leads_zstd.parquet"

    @property
    def s3_uri(self) -> str:
        return f"s3://{self.s3_bucket}/{self.parquet_key}"

    def s3_uri_for(self, dataset: str) -> str:
        filename = self.DATASET_FILES.get(dataset, self.DATASET_FILES["active"])
        return f"s3://{self.s3_bucket}/leads/{filename}"

    def get_dataset_filename(self, dataset: str) -> str:
        return self.DATASET_FILES.get(dataset, self.DATASET_FILES["active"])


settings = Settings()
