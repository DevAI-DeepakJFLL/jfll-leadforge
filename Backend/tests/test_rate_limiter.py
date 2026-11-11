import time
from collections import defaultdict
import pytest
from starlette.requests import Request
from starlette.responses import Response
from src.api.main import RateLimitingMiddleware


def test_rate_limiter_prunes_expired_ip_keys():
    app = None
    middleware = RateLimitingMiddleware(app, max_requests=5, window_seconds=1)

    # Add an expired timestamp for an IP
    past = time.time() - 10
    middleware.requests["192.168.1.100"] = [past]
    middleware.requests["192.168.1.101"] = [past]

    # Run cleanup method
    middleware.prune_expired()

    assert "192.168.1.100" not in middleware.requests
    assert "192.168.1.101" not in middleware.requests
    assert len(middleware.requests) == 0


def test_rate_limiter_retains_active_timestamps():
    middleware = RateLimitingMiddleware(None, max_requests=5, window_seconds=10)
    now = time.time()
    past = now - 20
    fresh = now - 2

    # Mixed timestamps
    middleware.requests["192.168.1.50"] = [past, fresh]
    middleware.requests["192.168.1.51"] = [past]

    middleware.prune_expired(now=now)

    assert "192.168.1.50" in middleware.requests
    assert middleware.requests["192.168.1.50"] == [fresh]
    assert "192.168.1.51" not in middleware.requests
    assert len(middleware.requests) == 1


@pytest.mark.anyio
async def test_rate_limiter_dispatch_auto_prunes_at_threshold():
    async def call_next(req):
        return Response("ok", status_code=200)

    middleware = RateLimitingMiddleware(None, max_requests=5, window_seconds=60)
    # Inject 550 stale IPs into dictionary
    stale_time = time.time() - 120
    for i in range(550):
        middleware.requests[f"10.0.{i // 256}.{i % 256}"] = [stale_time]

    assert len(middleware.requests) == 550

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": [(b"x-forwarded-for", b"203.0.113.199")],
    }
    req = Request(scope)
    res = await middleware.dispatch(req, call_next)
    assert res.status_code == 200

    # Stale keys pruned, only active IP remains
    assert len(middleware.requests) == 1
    assert "203.0.113.199" in middleware.requests
