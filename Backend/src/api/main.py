import os
import threading
import time
from collections import defaultdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from src.api.access_control import ROOT_ADMIN_EMAILS, block_entity, is_ip_or_fingerprint_blocked
from src.api.admin_routes import admin_router
from src.api.approach_routes import approach_router
from src.api.auth import is_headless_user_agent, verify_token
from src.api.auth import router as auth_router
from src.api.config import settings
from src.api.helpers import get_client_ip
from src.api.logger import CloudWatchLoggingMiddleware, logger
from src.api.models import HealthResponse
from src.api.routes import router as leads_router
from src.api.tier_routes import tier_router
from src.api.report_routes import router as report_router

is_production = settings.env == "production"

app = FastAPI(
    title="Customer Lead Master Service",
    description="Production-grade REST API querying ZSTD compressed Parquet over S3 / Floci emulator using DuckDB",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)


class AntiBotMiddleware(BaseHTTPMiddleware):
    """Enforces permanent rejection of blocked machines and auto-bans detected headless browsers."""
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if (
            request.method != "OPTIONS"
            and not path.endswith("/health")
            and not path.endswith("/device-status")
        ):
            ip = get_client_ip(request)
            fingerprint = request.headers.get("x-device-fingerprint")

            # Root Administrator bypass: never lock out root administrators
            auth_header = request.headers.get("authorization")
            is_root = False
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    token = auth_header.split("Bearer ", 1)[1].strip()
                    payload = verify_token(token)
                    if payload and payload.get("sub", "").strip().lower() in ROOT_ADMIN_EMAILS:
                        is_root = True
                except Exception as err:
                    logger.debug("Non-critical token inspection notice: %s", err)

            if not is_root:
                # 1. Immediate check: Is this device permanently banned?
                if is_ip_or_fingerprint_blocked(ip, fingerprint):
                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": "DEVICE_BLOCKED: This device has been permanently restricted from accessing the platform.",
                            "code": "PERMANENT_DEVICE_BAN",
                        },
                    )

                # 2. Check for automated headless signature
                ua = request.headers.get("user-agent")
                if is_headless_user_agent(ua):
                    # Auto-ban this IP and device fingerprint permanently
                    if ip and ip != "unknown" and ip != "127.0.0.1" and ip != "testclient":
                        try:
                            block_entity(
                                ip=ip,
                                fingerprint=fingerprint if fingerprint and fingerprint not in ("unknown", "fp_fallback") else None,
                                reason=f"Automated headless bot detected: {ua}",
                                user_agent=ua,
                                actor="AntiBotMiddleware",
                            )
                        except Exception as err:
                            logger.warning("Could not auto-ban entity: %s", err)

                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": "AUTOMATED_AGENT_BLOCKED: Automated headless browser access is prohibited.",
                            "code": "AUTOMATED_AGENT_BLOCKED",
                        },
                    )
        return await call_next(request)


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Protects authentication endpoints from brute-force password/email spray attacks."""
    def __init__(self, app, max_requests: int = 20, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method != "OPTIONS" and path.startswith(
            ("/api/v1/auth/login", "/api/v1/auth/access-request", "/api/v1/auth/report-bot")
        ):
            ip = get_client_ip(request)
            # Skip throttling for unit test client in test runs
            if ip != "testclient":
                now = time.time()
                with self._lock:
                    # Clean up expired entries if dictionary exceeds 1,000 tracked IPs
                    if len(self.requests) > 1000:
                        cutoff_global = now - self.window_seconds
                        self.requests = defaultdict(
                            list,
                            {k: [t for t in v if t > cutoff_global] for k, v in self.requests.items() if any(t > cutoff_global for t in v)}
                        )

                    timestamps = self.requests[ip]
                    cutoff = now - self.window_seconds
                    self.requests[ip] = [t for t in timestamps if t > cutoff]
                    if len(self.requests[ip]) >= self.max_requests:
                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": "RATE_LIMIT_EXCEEDED: Too many authentication attempts. Please wait a minute before retrying.",
                                "code": "RATE_LIMIT_EXCEEDED",
                            },
                        )
                    self.requests[ip].append(now)

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces enterprise defense-in-depth security headers across all API responses."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        if is_production or request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitingMiddleware)
app.add_middleware(AntiBotMiddleware)

# CloudWatch & CloudFront Structured Request Telemetry Middleware
app.add_middleware(CloudWatchLoggingMiddleware)

# CORS configuration - strict origin allowlist with CloudFront and local development support
def get_allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    if is_production:
        return ["https://d3c4bsffw7tf7s.cloudfront.net"]
    return [
        "https://d3c4bsffw7tf7s.cloudfront.net",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4566",
        "http://localhost:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "User-Agent",
        "X-Request-ID",
        "X-Amzn-Trace-Id",
        "X-Device-Fingerprint",
    ],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(leads_router)
app.include_router(tier_router)
app.include_router(approach_router)
app.include_router(report_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import uuid
    incident_id = str(uuid.uuid4())[:8]
    logger.error(f"[Incident {incident_id}] Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    origin = request.headers.get("origin", "")
    allowed_origins = get_allowed_origins()

    headers = {}
    if origin and (origin in allowed_origins or "*" in allowed_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        headers["Access-Control-Allow-Headers"] = (
            "Authorization, Content-Type, Accept, Origin, User-Agent, "
            "X-Request-ID, X-Amzn-Trace-Id, X-Device-Fingerprint"
        )

    detail = "Internal server error" if is_production else str(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "incident_id": incident_id},
        headers=headers,
    )


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

