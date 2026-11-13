"""Shared in-memory user session registry.

Decouples authentication token creation from access control allowlist revocation,
preventing circular imports between auth.py, access_control.py, and helpers.py.
Thread-safe accessors protect the registry against concurrent access under multi-threaded
asyncio runtimes.
"""

import os
import threading

from src.api.logger import logger

# In-memory registry with thread-safe locking for single-process/Lambda deployments.
# For distributed multi-worker/ECS clusters, setting REDIS_URL transparently delegates
# session checks and revocations to Redis key `session:{email}` with 24-hour TTL.
ACTIVE_USER_SESSIONS: dict[str, str] = {}
_SESSION_LOCK = threading.Lock()

_REDIS_CLIENT = None
_REDIS_URL = os.getenv("REDIS_URL")
if _REDIS_URL:
    try:
        import redis  # type: ignore[import-untyped]
        _REDIS_CLIENT = redis.from_url(_REDIS_URL, decode_responses=True)
    except Exception as err:
        logger.warning(f"Failed to initialize Redis session store: {err}")
        _REDIS_CLIENT = None


def get_active_session(email: str) -> str | None:
    """Retrieve the active session ID for a user in a thread-safe manner."""
    if not email:
        return None
    clean = email.strip().lower()
    if _REDIS_CLIENT:
        try:
            return _REDIS_CLIENT.get(f"session:{clean}")
        except Exception as err:
            logger.debug(f"Redis get failed for session:{clean}: {err}")
    with _SESSION_LOCK:
        return ACTIVE_USER_SESSIONS.get(clean)


def set_active_session(email: str, session_id: str, ttl_seconds: int = 86400) -> None:
    """Register or update an active session ID for a user thread-safely with 24h TTL."""
    if not email or not session_id:
        return
    clean = email.strip().lower()
    if _REDIS_CLIENT:
        try:
            _REDIS_CLIENT.set(f"session:{clean}", session_id, ex=ttl_seconds)
        except Exception as err:
            logger.debug(f"Redis set failed for session:{clean}: {err}")
    with _SESSION_LOCK:
        ACTIVE_USER_SESSIONS[clean] = session_id


def clear_active_session(email: str) -> str | None:
    """Remove and return the active session for a user thread-safely."""
    if not email:
        return None
    clean = email.strip().lower()
    if _REDIS_CLIENT:
        try:
            _REDIS_CLIENT.delete(f"session:{clean}")
        except Exception as err:
            logger.debug(f"Redis delete failed for session:{clean}: {err}")
    with _SESSION_LOCK:
        return ACTIVE_USER_SESSIONS.pop(clean, None)


def clear_all_sessions() -> None:
    """Clear all active sessions (primarily for test resets)."""
    with _SESSION_LOCK:
        ACTIVE_USER_SESSIONS.clear()

