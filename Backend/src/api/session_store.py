"""Shared in-memory user session registry.

Decouples authentication token creation from access control allowlist revocation,
preventing circular imports between auth.py, access_control.py, and helpers.py.
Thread-safe accessors protect the registry against concurrent access under multi-threaded
asyncio runtimes.
"""

import json
import os
import threading
from typing import Any

from src.api.logger import logger

# In-memory registry with thread-safe locking for single-process/Lambda deployments.
# For distributed multi-worker/ECS clusters, setting REDIS_URL transparently delegates
# session checks and revocations to Redis key `session:{email}` with 24-hour TTL.
ACTIVE_USER_SESSIONS: dict[str, str] = {}
ACTIVE_USER_DEVICES: dict[str, dict[str, Any]] = {}
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


def set_active_session(
    email: str,
    session_id: str,
    ttl_seconds: int = 86400,
    device_fingerprint: str | None = None,
) -> None:
    """Register or update an active session ID for a user thread-safely with 24h TTL.
    
    Keys sessions by device fingerprint so multiple tabs on the same device share access
    and do not displace each other, while a login from a genuinely different device
    supersedes older device sessions.
    """
    if not email or not session_id:
        return
    clean = email.strip().lower()
    clean_fp = device_fingerprint.strip() if device_fingerprint else None
    if _REDIS_CLIENT:
        try:
            _REDIS_CLIENT.set(f"session:{clean}", session_id, ex=ttl_seconds)
            if clean_fp:
                existing_json = _REDIS_CLIENT.get(f"session_dev:{clean}")
                session_ids_list = [session_id]
                if existing_json:
                    try:
                        existing_data = json.loads(existing_json)
                        if existing_data.get("fp") == clean_fp:
                            prev_ids = existing_data.get("session_ids", [])
                            if session_id not in prev_ids:
                                session_ids_list = prev_ids + [session_id]
                    except (json.JSONDecodeError, TypeError, ValueError):
                        pass
                _REDIS_CLIENT.set(
                    f"session_dev:{clean}",
                    json.dumps({
                        "fp": clean_fp,
                        "active": session_id,
                        "session_ids": session_ids_list,
                    }),
                    ex=ttl_seconds,
                )
        except Exception as err:
            logger.debug(f"Redis set failed for session:{clean}: {err}")
    with _SESSION_LOCK:
        ACTIVE_USER_SESSIONS[clean] = session_id
        current_dev = ACTIVE_USER_DEVICES.get(clean)
        
        if current_dev and clean_fp and current_dev.get("device_fingerprint") == clean_fp:
            # Same device: record new session ID alongside previous ones for tab coexistence
            current_dev.setdefault("session_ids", set()).add(session_id)
            current_dev["active_session_id"] = session_id
        else:
            # New device or initial login: set active device and session
            ACTIVE_USER_DEVICES[clean] = {
                "device_fingerprint": clean_fp,
                "active_session_id": session_id,
                "session_ids": {session_id},
            }


def is_session_valid_on_device(
    email: str,
    session_id: str,
    device_fingerprint: str | None = None,
) -> bool:
    """Evaluates whether session is valid for this user on this device.
    
    Returns True if:
    1. session_id matches the latest active session.
    2. OR session_id was issued to the same device (matching non-empty device_fingerprint)
       and has not been superseded by a different device.
    Returns False when superseded by a genuinely different device or subsequent session.
    """
    if not email or not session_id:
        return True
    clean = email.strip().lower()
    
    active_sess = get_active_session(clean)
    if active_sess is None:
        set_active_session(clean, session_id, device_fingerprint=device_fingerprint)
        return True
    
    if session_id == active_sess:
        return True

    # Session ID differs from the single latest one; verify if on the same identified device
    clean_fp = device_fingerprint.strip() if device_fingerprint else None
    if not clean_fp:
        return False

    if _REDIS_CLIENT:
        try:
            dev_json = _REDIS_CLIENT.get(f"session_dev:{clean}")
            if dev_json:
                dev_data = json.loads(dev_json)
                if dev_data.get("fp") == clean_fp:
                    valid_sessions = dev_data.get("session_ids", [])
                    return session_id in valid_sessions
        except Exception as err:
            logger.debug(f"Redis get failed for session_dev:{clean}: {err}")

    with _SESSION_LOCK:
        dev_info = ACTIVE_USER_DEVICES.get(clean)
        if not dev_info:
            return False
        
        active_fp = dev_info.get("device_fingerprint")
        valid_sessions = dev_info.get("session_ids", set())

        # If both caller and active record have matching device_fingerprints:
        # allow if session was issued to this same device
        if active_fp and clean_fp == active_fp:
            return session_id in valid_sessions

    return False


def clear_active_session(email: str) -> str | None:
    """Remove and return the active session for a user thread-safely."""
    if not email:
        return None
    clean = email.strip().lower()
    if _REDIS_CLIENT:
        try:
            _REDIS_CLIENT.delete(f"session:{clean}")
            _REDIS_CLIENT.delete(f"session_dev:{clean}")
        except Exception as err:
            logger.debug(f"Redis delete failed for session:{clean}: {err}")
    with _SESSION_LOCK:
        ACTIVE_USER_DEVICES.pop(clean, None)
        return ACTIVE_USER_SESSIONS.pop(clean, None)


def clear_all_sessions() -> None:
    """Clear all active sessions (primarily for test resets)."""
    with _SESSION_LOCK:
        ACTIVE_USER_DEVICES.clear()
        ACTIVE_USER_SESSIONS.clear()

