import json
import os
import re
import secrets
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from src.api.config import settings
from src.api.logger import logger

# Thread lock for thread-safe concurrent in-memory reads and atomic disk operations
_ACCESS_LOCK = threading.Lock()
_CACHED_DATA: dict[str, Any] | None = None
_CACHED_MTIME: float = 0.0
_CACHED_STORAGE_KEY: str = ""
_CACHED_ALLOWLIST_MAP: dict[str, dict[str, Any]] = {}
_CACHED_BLOCKED_IPS: set[str] = set()
_CACHED_BLOCKED_FINGERPRINTS: set[str] = set()


def _rebuild_cache(data: dict[str, Any], storage_path: Path, mtime: float) -> None:
    global _CACHED_DATA, _CACHED_STORAGE_KEY, _CACHED_MTIME, _CACHED_ALLOWLIST_MAP, _CACHED_BLOCKED_IPS, _CACHED_BLOCKED_FINGERPRINTS
    _CACHED_DATA = data
    _CACHED_STORAGE_KEY = str(storage_path)
    _CACHED_MTIME = mtime
    _CACHED_ALLOWLIST_MAP = {
        entry.get("email", "").strip().lower(): entry
        for entry in data.get("allowlist", [])
        if entry.get("email")
    }
    _CACHED_BLOCKED_IPS = {
        entry.get("ip", "").strip()
        for entry in data.get("blocked_entities", [])
        if entry.get("ip") and entry.get("status", "active") == "active"
    }
    _CACHED_BLOCKED_FINGERPRINTS = {
        entry.get("fingerprint", "").strip()
        for entry in data.get("blocked_entities", [])
        if entry.get("fingerprint") and entry.get("status", "active") == "active"
    }

ROOT_ADMIN_EMAILS = {
    "deepak@jfll.com",
    "tyra.theknath@jfll.com",
}

ADMIN_ROLES = {"Leadership", "Tech Lead", "Admin"}

DEFAULT_SEEDED_USERS = [
    {
        "email": "deepak@jfll.com",
        "name": "Deepak Naidu",
        "role": "Tech Lead",
        "status": "active",
        "added_at": "2026-10-20T00:00:00Z",
        "added_by": "system_bootstrap",
    },
    {
        "email": "tyra.theknath@jfll.com",
        "name": "Tyra Theknath",
        "role": "Leadership",
        "status": "active",
        "added_at": "2026-10-20T00:00:00Z",
        "added_by": "system_bootstrap",
    },
    {
        "email": "akash.dhara@jfll.com",
        "name": "Akash Dhara",
        "role": "Operations",
        "status": "active",
        "added_at": "2026-10-20T00:00:00Z",
        "added_by": "system_bootstrap",
    },
    {
        "email": "snehal.birje@jfll.com",
        "name": "Snehal Birje",
        "role": "Commercial",
        "status": "active",
        "added_at": "2026-10-20T00:00:00Z",
        "added_by": "system_bootstrap",
    },
]


def get_storage_path() -> Path:
    """Resolves the persistence path for access_control.json."""
    custom_path = os.getenv("ACCESS_CONTROL_PATH")
    if custom_path:
        return Path(custom_path)
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/data/access_control.json")
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "access_control.json"


S3_ACCESS_CONTROL_KEY = "config/access_control.json"


def _restore_from_s3(storage_path: Path) -> bool:
    """Restores access_control.json from S3 if available (e.g. AWS Lambda cold start)."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(settings.s3_bucket, S3_ACCESS_CONTROL_KEY, str(storage_path))
        logger.info(
            "Access Control: Restored access_control.json from s3://%s/%s",
            settings.s3_bucket,
            S3_ACCESS_CONTROL_KEY,
        )
        return True
    except Exception as err:
        logger.debug("Access Control: S3 restore skipped or unavailable: %s", err)
        return False


def _backup_to_s3(storage_path: Path) -> None:
    """Uploads access_control.json to S3 so access modifications persist across Lambda cold starts."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3.upload_file(str(storage_path), settings.s3_bucket, S3_ACCESS_CONTROL_KEY)
        logger.info(
            "Access Control: Persisted access_control.json to s3://%s/%s",
            settings.s3_bucket,
            S3_ACCESS_CONTROL_KEY,
        )
    except Exception as err:
        logger.debug("Access Control: S3 backup skipped or unavailable: %s", err)


def _seed_initial_data() -> dict[str, Any]:
    """Generates the initial bootstrap access control dataset."""
    allowlist = [dict(u) for u in DEFAULT_SEEDED_USERS]
    existing_emails = {u["email"].lower() for u in allowlist}

    # Include any custom allowed_emails configured in environment
    for email in settings.allowed_emails:
        clean = email.strip().lower()
        if clean and clean not in existing_emails:
            local_part = clean.split("@")[0]
            derived_name = local_part.replace(".", " ").replace("_", " ").title()
            allowlist.append(
                {
                    "email": clean,
                    "name": derived_name or "Authorized Personnel",
                    "role": settings.default_user_role or "Commercial",
                    "status": "active",
                    "added_at": datetime.now(UTC).isoformat(),
                    "added_by": "env_config",
                }
            )
            existing_emails.add(clean)

    return {
        "version": 1,
        "allowlist": allowlist,
        "access_requests": [],
        "blocked_entities": [],
    }


def load_access_data() -> dict[str, Any]:
    """Loads access control state from disk or memory cache, or initializes default seed."""
    storage_path = get_storage_path()
    if not storage_path.exists():
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not _restore_from_s3(storage_path):
            initial_data = _seed_initial_data()
            save_access_data(initial_data)
            return initial_data

    try:
        current_mtime = storage_path.stat().st_mtime
        if (
            _CACHED_DATA is not None
            and _CACHED_STORAGE_KEY == str(storage_path)
            and _CACHED_MTIME == current_mtime
        ):
            return _CACHED_DATA

        with open(storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                raise TypeError("Corrupt access control file structure")
            if "allowlist" not in data:
                data["allowlist"] = []
            if "access_requests" not in data:
                data["access_requests"] = []
            if "blocked_entities" not in data:
                data["blocked_entities"] = []
            _rebuild_cache(data, storage_path, current_mtime)
            return data
    except Exception as err:
        logger.warning(
            "Access Control: Could not read JSON storage (%s), using initial bootstrap",
            err,
        )
        return _seed_initial_data()


def save_access_data(data: dict[str, Any]) -> None:
    """
    Atomically writes access control state to disk.
    Writes to a temporary file first, then uses os.replace for crash-resilience.
    """
    storage_path = get_storage_path()
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = storage_path.with_suffix(".tmp")

    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())

    os.replace(temp_path, storage_path)
    try:
        mtime = storage_path.stat().st_mtime
    except OSError:
        mtime = 0.0
    _rebuild_cache(data, storage_path, mtime)

    # Persist to S3 if running in AWS Lambda or explicitly enabled
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("ENABLE_S3_ACCESS_BACKUP"):
        _backup_to_s3(storage_path)


def get_email_status(email: str) -> str | None:
    """Returns 'active', 'revoked', or None if not registered in the allowlist."""
    clean_email = email.strip().lower()
    if not clean_email:
        return None

    with _ACCESS_LOCK:
        load_access_data()
        entry = _CACHED_ALLOWLIST_MAP.get(clean_email)
        if entry:
            return entry.get("status")

    if clean_email in ROOT_ADMIN_EMAILS:
        return "active"
    return None


def is_email_active(email: str) -> bool:
    """Checks whether an email has active status in the allowlist."""
    status = get_email_status(email)
    return status == "active"


def is_admin_user(email: str, role: str | None = None) -> bool:
    """Checks whether a user has administrative privileges for the access portal."""
    clean_email = email.strip().lower()
    if clean_email in ROOT_ADMIN_EMAILS:
        return True
    if role and role.strip() in ADMIN_ROLES:
        return True

    with _ACCESS_LOCK:
        load_access_data()
        entry = _CACHED_ALLOWLIST_MAP.get(clean_email)
        if entry:
            return entry.get("status") == "active" and entry.get("role") in ADMIN_ROLES
    return False


def get_user_profile_by_email(email: str) -> tuple[str, str]:
    """Retrieves full name and role from the active allowlist."""
    clean_email = email.strip().lower()
    with _ACCESS_LOCK:
        load_access_data()
        entry = _CACHED_ALLOWLIST_MAP.get(clean_email)
        if entry:
            name = entry.get("name") or clean_email.split("@")[0].replace(".", " ").title()
            role = entry.get("role") or settings.default_user_role
            return name, role

    # Fallback for root admin
    if clean_email == "deepak@jfll.com":
        return "Deepak Naidu", "Tech Lead"
    if clean_email == "tyra.theknath@jfll.com":
        return "Tyra Theknath", "Leadership"

    local_part = clean_email.split("@")[0]
    return local_part.replace(".", " ").title(), settings.default_user_role


def get_allowlist(status: str | None = None, search: str | None = None) -> list[dict[str, Any]]:
    """Returns allowlist records with optional status and substring search filter."""
    with _ACCESS_LOCK:
        data = load_access_data()
        items = list(data.get("allowlist", []))

    if status and status.lower() != "all":
        items = [i for i in items if i.get("status", "").lower() == status.lower()]

    if search and search.strip():
        term = search.strip().lower()
        items = [
            i
            for i in items
            if term in i.get("email", "").lower()
            or term in i.get("name", "").lower()
            or term in i.get("role", "").lower()
        ]

    # Sort root admins first, then alphabetical by name
    def sort_key(item: dict[str, Any]):
        email = item.get("email", "").lower()
        is_root = 0 if email in ROOT_ADMIN_EMAILS else 1
        name = item.get("name", "").lower()
        return (is_root, name)

    return sorted(items, key=sort_key)


def add_to_allowlist(
    email: str,
    name: str,
    role: str = "Commercial",
    added_by: str = "admin",
) -> dict[str, Any]:
    """Adds a new authorized personnel entry or updates existing entry."""
    clean_email = email.strip().lower()
    clean_name = name.strip() or clean_email.split("@")[0].replace(".", " ").title()
    clean_role = role.strip() or "Commercial"

    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise ValueError("Invalid email address format")

    with _ACCESS_LOCK:
        data = load_access_data()
        allowlist = data.get("allowlist", [])

        now_str = datetime.now(UTC).isoformat()
        target_entry = None

        for entry in allowlist:
            if entry.get("email", "").strip().lower() == clean_email:
                entry["name"] = clean_name
                entry["role"] = clean_role
                entry["status"] = "active"
                entry["updated_at"] = now_str
                entry["updated_by"] = added_by
                target_entry = entry
                break

        if not target_entry:
            new_entry = {
                "email": clean_email,
                "name": clean_name,
                "role": clean_role,
                "status": "active",
                "added_at": now_str,
                "added_by": added_by,
            }
            allowlist.append(new_entry)
            target_entry = new_entry

        data["allowlist"] = allowlist
        save_access_data(data)

    logger.info(
        "Access Control: Added/updated allowlist user: %s (%s) by %s",
        clean_email,
        clean_role,
        added_by,
        extra={"event": "ALLOWLIST_UPDATED", "email": clean_email, "role": clean_role, "actor": added_by},
    )
    return target_entry


def remove_from_allowlist(email: str, removed_by: str = "admin") -> dict[str, Any]:
    """Revokes access for an email address with safety checks for self-lockout."""
    clean_email = email.strip().lower()
    clean_actor = removed_by.strip().lower()

    if clean_email in ROOT_ADMIN_EMAILS:
        raise ValueError(f"Root administrator account '{clean_email}' cannot be revoked.")

    if clean_email == clean_actor:
        raise ValueError("You cannot revoke your own active administrator account.")

    with _ACCESS_LOCK:
        data = load_access_data()
        allowlist = data.get("allowlist", [])
        updated_entry = None

        for entry in allowlist:
            if entry.get("email", "").strip().lower() == clean_email:
                entry["status"] = "revoked"
                entry["revoked_at"] = datetime.now(UTC).isoformat()
                entry["revoked_by"] = clean_actor
                updated_entry = entry
                break

        if not updated_entry:
            raise KeyError(f"Email '{clean_email}' not found in allowlist.")

        data["allowlist"] = allowlist
        save_access_data(data)

    # Invalidate active session immediately
    try:
        from src.api.auth import ACTIVE_USER_SESSIONS
        if clean_email in ACTIVE_USER_SESSIONS:
            del ACTIVE_USER_SESSIONS[clean_email]
    except Exception as err:
        logger.debug("Non-critical notice clearing session for %s: %s", clean_email, err)

    logger.warning(
        "Access Control: Revoked allowlist user: %s by %s",
        clean_email,
        clean_actor,
        extra={"event": "ALLOWLIST_REVOKED", "email": clean_email, "actor": clean_actor},
    )
    return updated_entry


def get_access_requests(status: str | None = None) -> list[dict[str, Any]]:
    """Retrieves access requests with optional status filter."""
    with _ACCESS_LOCK:
        data = load_access_data()
        requests = list(data.get("access_requests", []))

    if status and status.lower() != "all":
        requests = [r for r in requests if r.get("status", "").lower() == status.lower()]

    # Sort descending by requested_at
    return sorted(requests, key=lambda r: r.get("requested_at", ""), reverse=True)


def create_access_request(email: str, name: str, reason: str) -> dict[str, Any]:
    """Submits a new access request from the public login screen."""
    clean_email = email.strip().lower()
    clean_name = name.strip() or clean_email.split("@")[0].replace(".", " ").title()
    clean_reason = reason.strip()

    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise ValueError("Please provide a valid work email address.")

    if len(clean_reason) < 5:
        raise ValueError("Please provide a reason for requesting dashboard access (at least 5 characters).")

    # Prevent HTML / script injection
    sanitized_reason = re.sub(r"[<>]", "", clean_reason)

    with _ACCESS_LOCK:
        data = load_access_data()

        # Check if already active
        for entry in data.get("allowlist", []):
            if entry.get("email", "").strip().lower() == clean_email and entry.get("status") == "active":
                raise ValueError("ALREADY_AUTHORIZED")

        # Check for existing pending request
        for req in data.get("access_requests", []):
            if req.get("email", "").strip().lower() == clean_email and req.get("status") == "pending":
                raise ValueError("PENDING_EXISTS")

        request_id = f"req_{secrets.token_hex(6)}"
        new_request = {
            "id": request_id,
            "email": clean_email,
            "name": clean_name,
            "reason": sanitized_reason,
            "status": "pending",
            "requested_at": datetime.now(UTC).isoformat(),
            "reviewed_at": None,
            "reviewed_by": None,
            "review_notes": None,
        }

        data.setdefault("access_requests", []).append(new_request)
        save_access_data(data)

    logger.info(
        "Access Control: New access request received for %s (%s)",
        clean_email,
        clean_name,
        extra={"event": "ACCESS_REQUEST_SUBMITTED", "email": clean_email, "applicant_name": clean_name},
    )
    return new_request


def approve_access_request(
    request_id: str,
    role: str = "Commercial",
    reviewed_by: str = "admin",
    notes: str | None = None,
) -> dict[str, Any]:
    """Approves a pending access request and automatically enrolls the user in the allowlist."""
    with _ACCESS_LOCK:
        data = load_access_data()
        requests = data.get("access_requests", [])
        target_request = None

        for req in requests:
            if req.get("id") == request_id:
                target_request = req
                break

        if not target_request:
            raise KeyError(f"Access request '{request_id}' not found.")

        target_request["status"] = "approved"
        target_request["reviewed_at"] = datetime.now(UTC).isoformat()
        target_request["reviewed_by"] = reviewed_by
        target_request["review_notes"] = notes or "Approved by administrator"
        save_access_data(data)

    # Auto-enroll in allowlist
    add_to_allowlist(
        email=target_request["email"],
        name=target_request.get("name", ""),
        role=role,
        added_by=reviewed_by,
    )

    logger.info(
        "Access Control: Approved access request %s for %s as %s",
        request_id,
        target_request["email"],
        role,
        extra={
            "event": "ACCESS_REQUEST_APPROVED",
            "request_id": request_id,
            "email": target_request["email"],
            "role": role,
            "reviewer": reviewed_by,
        },
    )
    return target_request


def reject_access_request(
    request_id: str,
    reviewed_by: str = "admin",
    notes: str | None = None,
) -> dict[str, Any]:
    """Rejects a pending access request."""
    with _ACCESS_LOCK:
        data = load_access_data()
        requests = data.get("access_requests", [])
        target_request = None

        for req in requests:
            if req.get("id") == request_id:
                target_request = req
                break

        if not target_request:
            raise KeyError(f"Access request '{request_id}' not found.")

        target_request["status"] = "rejected"
        target_request["reviewed_at"] = datetime.now(UTC).isoformat()
        target_request["reviewed_by"] = reviewed_by
        target_request["review_notes"] = notes or "Declined by administrator"
        save_access_data(data)

    logger.info(
        "Access Control: Rejected access request %s for %s",
        request_id,
        target_request["email"],
        extra={
            "event": "ACCESS_REQUEST_REJECTED",
            "request_id": request_id,
            "email": target_request["email"],
            "reviewer": reviewed_by,
        },
    )
    return target_request


def is_device_blocked(fingerprint: str | None) -> bool:
    """Checks whether a device hardware fingerprint is in the permanent blocklist."""
    clean_fp = fingerprint.strip() if fingerprint else ""
    if not clean_fp:
        return False

    with _ACCESS_LOCK:
        load_access_data()
        return clean_fp in _CACHED_BLOCKED_FINGERPRINTS


def is_ip_or_fingerprint_blocked(ip: str | None, fingerprint: str | None = None) -> bool:
    """
    Checks whether a request is blocked.
    Prioritizes device-level fingerprint checking to ensure innocent machines
    on the same shared network / IP (NAT, office Wi-Fi) are not blocked.
    """
    clean_fp = fingerprint.strip() if fingerprint else ""
    if clean_fp:
        return is_device_blocked(clean_fp)
    clean_ip = ip.strip() if ip else ""
    if clean_ip:
        with _ACCESS_LOCK:
            load_access_data()
            return clean_ip in _CACHED_BLOCKED_IPS
    return False


def block_device(
    fingerprint: str,
    reason: str = "Administrator manual device block",
    user_agent: str | None = None,
    actor: str = "admin",
    device_name: str | None = None,
) -> dict[str, Any]:
    """Permanently adds a hardware device fingerprint to the blocked list."""
    clean_fp = fingerprint.strip() if fingerprint else ""
    if not clean_fp:
        raise ValueError("Must provide a device fingerprint to block.")

    return block_entity(
        ip=None,
        fingerprint=clean_fp,
        reason=reason,
        user_agent=user_agent,
        actor=actor,
    )


def unblock_device(ban_id: str, unblocked_by: str = "admin") -> dict[str, Any]:
    """Removes a permanent block from a device by ban ID."""
    return unblock_entity(ban_id=ban_id, unblocked_by=unblocked_by)


def get_blocked_devices(status: str = "active") -> list[dict[str, Any]]:
    """Retrieves all blocked device records."""
    return get_blocked_entities(status=status)


def block_entity(
    ip: str | None,
    fingerprint: str | None = None,
    reason: str = "Automated bot activity detected",
    user_agent: str | None = None,
    actor: str = "system_auto_bot_guard",
) -> dict[str, Any]:
    """Permanently adds an IP address and/or hardware fingerprint to the blocked list."""
    clean_ip = ip.strip() if ip else ""
    clean_fp = fingerprint.strip() if fingerprint else ""
    if not clean_ip and not clean_fp:
        raise ValueError("Must provide at least an IP address or device fingerprint to block.")

    now_str = datetime.now(UTC).isoformat()
    ban_id = f"ban_{secrets.token_hex(6)}"

    with _ACCESS_LOCK:
        data = load_access_data()
        entities = data.setdefault("blocked_entities", [])

        # Check if already blocked to update last seen timestamp
        for entity in entities:
            if entity.get("status", "active") == "active":
                if clean_ip and entity.get("ip") == clean_ip:
                    entity["last_seen_at"] = now_str
                    entity["reason"] = reason
                    if clean_fp and not entity.get("fingerprint"):
                        entity["fingerprint"] = clean_fp
                    save_access_data(data)
                    return entity
                if clean_fp and entity.get("fingerprint") == clean_fp:
                    entity["last_seen_at"] = now_str
                    entity["reason"] = reason
                    if clean_ip and not entity.get("ip"):
                        entity["ip"] = clean_ip
                    save_access_data(data)
                    return entity

        new_entry = {
            "id": ban_id,
            "ip": clean_ip,
            "fingerprint": clean_fp,
            "reason": reason,
            "user_agent": user_agent or "",
            "status": "active",
            "blocked_at": now_str,
            "last_seen_at": now_str,
            "blocked_by": actor,
        }
        entities.append(new_entry)
        data["blocked_entities"] = entities
        save_access_data(data)

    logger.warning(
        "Security Guard: Permanently blocked entity %s (IP: %s, FP: %s) for: %s",
        ban_id,
        clean_ip,
        clean_fp,
        reason,
        extra={"event": "ENTITY_PERMANENTLY_BLOCKED", "ban_id": ban_id, "ip": clean_ip, "fingerprint": clean_fp},
    )
    return new_entry


def unblock_entity(ban_id: str, unblocked_by: str = "admin") -> dict[str, Any]:
    """Removes a permanent block from an entity by ban ID or device fingerprint."""
    target_identifier = ban_id.strip()
    with _ACCESS_LOCK:
        data = load_access_data()
        entities = data.get("blocked_entities", [])
        target = None
        for entity in entities:
            if entity.get("id") == target_identifier or entity.get("fingerprint") == target_identifier:
                entity["status"] = "unblocked"
                entity["unblocked_at"] = datetime.now(UTC).isoformat()
                entity["unblocked_by"] = unblocked_by
                target = entity

        if not target:
            raise KeyError(f"Ban record '{ban_id}' not found.")

        data["blocked_entities"] = entities
        save_access_data(data)

    logger.info("Security Guard: Unblocked entity %s by %s", ban_id, unblocked_by)
    return target


def get_blocked_entities(status: str = "active") -> list[dict[str, Any]]:
    """Retrieves all blocked entity records."""
    with _ACCESS_LOCK:
        data = load_access_data()
        entities = list(data.get("blocked_entities", []))

    if status and status.lower() != "all":
        entities = [e for e in entities if e.get("status", "active").lower() == status.lower()]

    return sorted(entities, key=lambda e: e.get("blocked_at", ""), reverse=True)
