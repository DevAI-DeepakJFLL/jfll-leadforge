import os
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

    @property
    def s3_uri(self) -> str:
        return f"s3://{self.s3_bucket}/{self.parquet_key}"


settings = Settings()
