"""Shared in-memory user session registry.

Decouples authentication token creation from access control allowlist revocation,
preventing circular imports between auth.py, access_control.py, and helpers.py.
Thread-safe accessors protect the registry against concurrent access under multi-threaded
asyncio runtimes.
"""

import threading
from typing import Optional

# shortcut: In-memory registry assumes single-process deployment (or sticky sessions).
# Horizontal multi-worker scaling (e.g. uvicorn --workers N or multi-instance ECS)
# requires external shared state (e.g. Redis key `session:{email}` or a database column).
ACTIVE_USER_SESSIONS: dict[str, str] = {}
_SESSION_LOCK = threading.Lock()


def get_active_session(email: str) -> Optional[str]:
    """Retrieve the active session ID for a user in a thread-safe manner."""
    if not email:
        return None
    with _SESSION_LOCK:
        return ACTIVE_USER_SESSIONS.get(email.strip().lower())


def set_active_session(email: str, session_id: str) -> None:
    """Register or update an active session ID for a user thread-safely."""
    if not email or not session_id:
        return
    with _SESSION_LOCK:
        ACTIVE_USER_SESSIONS[email.strip().lower()] = session_id


def clear_active_session(email: str) -> Optional[str]:
    """Remove and return the active session for a user thread-safely."""
    if not email:
        return None
    with _SESSION_LOCK:
        return ACTIVE_USER_SESSIONS.pop(email.strip().lower(), None)


def clear_all_sessions() -> None:
    """Clear all active sessions (primarily for test resets)."""
    with _SESSION_LOCK:
        ACTIVE_USER_SESSIONS.clear()

