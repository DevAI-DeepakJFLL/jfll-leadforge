"""Shared in-memory user session registry.

Decouples authentication token creation from access control allowlist revocation,
preventing circular imports between auth.py, access_control.py, and helpers.py.
"""

# shortcut: In-memory registry assumes single-process deployment (or sticky sessions).
# Horizontal multi-worker scaling (e.g. uvicorn --workers N or multi-instance ECS)
# requires external shared state (e.g. Redis key `session:{email}` or a database column).
ACTIVE_USER_SESSIONS: dict[str, str] = {}
