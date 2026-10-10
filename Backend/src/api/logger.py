import json
import logging
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class CloudWatchJSONFormatter(logging.Formatter):
    """
    JSON Formatter conforming to AWS CloudWatch Logs Insights indexing standards.
    Outputs single-line valid JSON objects for seamless aggregation.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include custom metadata passed via extra={"key": "val"}
        for key, val in record.__dict__.items():
            if key not in {
                "args", "asctime", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "module", "msecs",
                "message", "msg", "name", "pathname", "process", "processName",
                "relativeCreated", "stack_info", "thread", "threadName",
            }:
                log_payload[key] = val

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, default=str)


def setup_logger(name: str = "jfll.backend") -> logging.Logger:
    """Configures structured stdout logging for AWS Lambda and CloudWatch."""
    app_logger = logging.getLogger(name)
    app_logger.setLevel(logging.INFO)

    # Avoid duplicate handlers on warm Lambda containers
    if not app_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(CloudWatchJSONFormatter())
        app_logger.addHandler(handler)
        app_logger.propagate = False

    return app_logger


logger = setup_logger()


class CloudWatchLoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP Request Telemetry Middleware designed for AWS CloudFront and API Gateway.
    Captures request correlation ID, viewer client IP, HTTP latency, and status code.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # Capture CloudFront edge viewer IP or X-Forwarded-For
        client_ip = (
            request.headers.get("cloudfront-viewer-address")
            or request.headers.get("x-forwarded-for")
            or (request.client.host if request.client else "unknown")
        ).split(",")[0].strip()

        # Capture AWS X-Ray Trace ID or generate unique correlation ID
        trace_id = (
            request.headers.get("x-amzn-trace-id")
            or request.headers.get("x-request-id")
            or str(uuid.uuid4())
        )

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Echo correlation ID to response headers for distributed tracing
            response.headers["x-request-id"] = trace_id

            extra_meta = {
                "trace_id": trace_id,
                "client_ip": client_ip,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params) if request.query_params else None,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "user_agent": request.headers.get("user-agent", "unknown"),
            }

            if response.status_code >= 500:
                logger.error(
                    f"HTTP Server Error: {request.method} {request.url.path} -> {response.status_code}",
                    extra=extra_meta,
                )
            elif response.status_code >= 400:
                logger.warning(
                    f"HTTP Client Warning: {request.method} {request.url.path} -> {response.status_code}",
                    extra=extra_meta,
                )
            else:
                logger.info(
                    f"HTTP Request: {request.method} {request.url.path} -> {response.status_code}",
                    extra=extra_meta,
                )

            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.exception(
                f"Unhandled Exception: {request.method} {request.url.path}",
                extra={
                    "trace_id": trace_id,
                    "client_ip": client_ip,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                    "error": str(exc),
                },
            )
            raise
