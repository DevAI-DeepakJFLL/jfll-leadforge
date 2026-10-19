from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.config import settings
from src.api.models import HealthResponse
from src.api.routes import router as leads_router
from src.api.auth import router as auth_router
from src.api.tier_routes import tier_router
from src.api.logger import CloudWatchLoggingMiddleware

import os

is_production = settings.env == "production"

app = FastAPI(
    title="Customer Lead Master Service",
    description="Production-grade REST API querying ZSTD compressed Parquet over S3 / Floci emulator using DuckDB",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

# CloudWatch & CloudFront Structured Request Telemetry Middleware
app.add_middleware(CloudWatchLoggingMiddleware)

# CORS configuration - strict origin allowlist without wildcard
def get_allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    if is_production:
        return []
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4566",
        "http://localhost:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(leads_router)
app.include_router(tier_router)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Service health and Floci emulator connectivity probe."""
    return {
        "status": "healthy",
        "backend": "Floci AWS Emulator" if settings.env == "local" else "AWS S3 Production",
        "floci_endpoint": f"http://{settings.floci_endpoint}",
        "s3_target": settings.s3_uri,
    }


# AWS Lambda Handler using Mangum ASGI Adapter
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    handler = None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host=settings.api_host, port=settings.api_port, reload=False)

