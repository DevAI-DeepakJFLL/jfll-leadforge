"""FastAPI router and persistence controller for Phase 2 Lead Status Tracker.

Follows freight-forwarding domain concepts (Transport Mode, Routing Control,
Sales Feedback, Follow-up Cadence) and DSA-conscious design principles:
- O(1) hash map lookups & updates via entity dictionary.
- Lexicographical ISO 8601 date string comparisons (< today_str) avoiding strptime overhead.
- Single O(N) pass for high-level executive KPI metrics.
- Concurrency safety with atomic file replacement and threading lock.
- Automatic hydration of 14 real-world records from Phase2/Lead_Tracker.xlsx.
"""

from datetime import date, datetime, timezone
import json
import logging
import os
from pathlib import Path
import threading
import time
from typing import Any
import uuid

from fastapi import APIRouter, Header, HTTPException, Query, status

from src.api.access_control import (
    Permission,
    ROOT_ADMIN_EMAILS,
    has_permission,
    is_email_active,
)
from src.api.auth import check_session_active, verify_token
from src.api.config import settings
from src.api.lead_tracker_models import (
    LeadTrackerCreate,
    LeadTrackerItem,
    LeadTrackerLogEntry,
    LeadTrackerUpdate,
    RoutingType,
    TrackerActivityCreate,
    TrackerKPIs,
    TrackerStatus,
    TransportMode,
)
from src.api.lead_tracker_seeder import SALES_REP_EMAILS, seed_leads_from_excel
from src.api.logger import logger

lead_tracker_router = APIRouter(prefix="/api/v1/lead-tracker", tags=["Lead Status Tracker"])

_FILE_LOCK = threading.Lock()
_CACHED_DATA: dict[str, Any] | None = None
_CACHED_MTIME: float | None = None
_CACHED_STORAGE_KEY: str | None = None
_LAST_S3_SYNC: float = 0.0

S3_LEAD_TRACKER_KEY = "data/lead_tracker.json"

CLOSED_STATUSES = {
    TrackerStatus.WON.value,
    TrackerStatus.CLOSED_LOST.value,
    "Won",
    "Closed / Lost",
}

TRACKER_ADMIN_EMAILS = {
    "deepak@jfll.com",
    "tyra.theknath@jfll.com",
    "tyra@jfll.com",
}

TRACKER_ADMIN_ROLES = {
    "root admin",
    "admin",
    "leadership",
    "tech lead",
}


def get_storage_path() -> Path:
    """Resolves the persistence path for lead_tracker.json."""
    custom_path = os.getenv("LEAD_TRACKER_PATH")
    if custom_path:
        return Path(custom_path)
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/data/lead_tracker.json")
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "lead_tracker.json"


def _restore_from_s3(storage_path: Path) -> bool:
    """Restores lead_tracker.json from S3 if available (e.g. AWS Lambda cold start)."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(settings.s3_bucket, S3_LEAD_TRACKER_KEY, str(storage_path))
        logger.info(
            "Lead Tracker: Restored lead_tracker.json from s3://%s/%s",
            settings.s3_bucket,
            S3_LEAD_TRACKER_KEY,
        )
        return True
    except Exception as err:
        logger.debug("Lead Tracker: S3 restore skipped or unavailable: %s", err)
        return False


def _backup_to_s3(storage_path: Path) -> None:
    """Uploads lead_tracker.json to S3 so records persist across Lambda cold starts."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3.upload_file(str(storage_path), settings.s3_bucket, S3_LEAD_TRACKER_KEY)
        logger.info(
            "Lead Tracker: Persisted lead_tracker.json to s3://%s/%s",
            settings.s3_bucket,
            S3_LEAD_TRACKER_KEY,
        )
    except Exception as err:
        logger.debug("Lead Tracker: S3 backup skipped or unavailable: %s", err)


def reset_tracker_cache() -> None:
    """Explicitly resets in-memory cache to force reloading from disk on next read."""
    global _CACHED_DATA, _CACHED_MTIME, _CACHED_STORAGE_KEY, _LAST_S3_SYNC
    _CACHED_DATA = None
    _CACHED_MTIME = None
    _CACHED_STORAGE_KEY = None
    _LAST_S3_SYNC = 0.0


def _build_empty_store() -> dict[str, Any]:
    return {
        "version": 1,
        "entities": {},
    }


def _seed_initial_store() -> dict[str, Any]:
    """Hydrates store from Phase2/Lead_Tracker.xlsx or deterministic fallback."""
    store = _build_empty_store()
    try:
        items = seed_leads_from_excel()
        for item in items:
            item_dict = item.model_dump() if hasattr(item, "model_dump") else item.dict()
            store["entities"][item.id] = item_dict
        logger.info("Lead Tracker: Seeded %d initial leads from Excel", len(items))
    except Exception as err:
        logger.warning("Lead Tracker: Seeding failed (%s), initializing empty store", err)
    return store


def save_tracker_data(data: dict[str, Any]) -> None:
    """Atomically writes lead tracker data to disk using fsync and os.replace."""
    global _CACHED_DATA, _CACHED_MTIME, _CACHED_STORAGE_KEY, _LAST_S3_SYNC
    storage_path = get_storage_path()
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = storage_path.with_suffix(f".tmp.{os.getpid()}.{threading.get_ident()}")

    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())

    try:
        os.chmod(temp_path, 0o600)
    except OSError:
        pass

    os.replace(temp_path, storage_path)
    try:
        os.chmod(storage_path, 0o600)
    except OSError:
        pass

    try:
        _CACHED_MTIME = storage_path.stat().st_mtime
        _CACHED_DATA = data
        _CACHED_STORAGE_KEY = str(storage_path)
    except OSError:
        pass

    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or settings.env != "local" or os.getenv("ENABLE_S3_TRACKER_BACKUP"):
        _backup_to_s3(storage_path)
    _LAST_S3_SYNC = time.time()


def load_tracker_data() -> dict[str, Any]:
    """Loads lead tracker state from memory cache or disk, restoring from S3 or seeding if missing."""
    global _CACHED_DATA, _CACHED_MTIME, _CACHED_STORAGE_KEY, _LAST_S3_SYNC
    storage_path = get_storage_path()
    is_lambda = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
    now = time.time()

    should_sync_s3 = not storage_path.exists() or (is_lambda and (now - _LAST_S3_SYNC > 10.0))

    if should_sync_s3:
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        restored = _restore_from_s3(storage_path)
        _LAST_S3_SYNC = now
        if not storage_path.exists():
            initial_data = _seed_initial_store()
            save_tracker_data(initial_data)
            return initial_data
        if restored:
            _CACHED_MTIME = None

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
                raise TypeError("Corrupt lead tracker file structure")
            if "entities" not in data or not isinstance(data["entities"], dict):
                data["entities"] = {}
            _CACHED_DATA = data
            _CACHED_MTIME = current_mtime
            _CACHED_STORAGE_KEY = str(storage_path)
            return data
    except Exception as err:
        logger.warning(
            "Lead Tracker: Could not read JSON storage (%s), using initial/empty fallback",
            err,
        )
        _CACHED_DATA = None
        _CACHED_MTIME = None
        _CACHED_STORAGE_KEY = None
        return _build_empty_store()


def require_lead_tracker_auth(authorization: str | None = Header(None)) -> dict[str, Any]:
    """Validates session token and RBAC for Lead Status Tracker endpoints.
    
    Tyra (tyra.theknath@jfll.com, tyra@jfll.com), Deepak (deepak@jfll.com),
    and users with Admin / Leadership / Tech Lead / Root Admin roles have full access.
    Unauthenticated requests (missing or invalid Bearer token) are rejected with 401.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access Lead Status Tracker",
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme, Bearer token required",
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    user = verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
        )

    user_email = user.get("sub", "").strip().lower()
    if user_email and not is_email_active(user_email):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ACCESS_REVOKED: Your account access has been revoked by an administrator.",
        )

    if not check_session_active(user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
        )

    role = (user.get("role") or "").strip().lower()
    is_root = (
        user_email in TRACKER_ADMIN_EMAILS
        or user_email in ROOT_ADMIN_EMAILS
    )
    is_admin = (
        role in TRACKER_ADMIN_ROLES
        or has_permission(role, Permission.ADMIN_PORTAL)
    )

    if not is_root and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PERMISSION_DENIED: Lead Status Tracker is restricted to leadership and administrators.",
        )

    return user


def compute_tracker_kpis(entities: dict[str, dict[str, Any]], today_str: str | None = None) -> TrackerKPIs:
    """Computes high-level executive KPIs in a single O(N) pass across all records."""
    if today_str is None:
        today_str = date.today().isoformat()

    total = len(entities)
    active = 0
    quoted = 0
    won = 0
    overdue = 0

    for item in entities.values():
        st = item.get("status")
        is_active = st not in CLOSED_STATUSES
        if is_active:
            active += 1
            fup = item.get("next_followup_date")
            # Direct ISO string comparison without strptime overhead
            if fup and str(fup) < today_str:
                overdue += 1
        if st in (TrackerStatus.QUOTED.value, "Quoted"):
            quoted += 1
        elif st in (TrackerStatus.WON.value, "Won"):
            won += 1

    return TrackerKPIs(
        total_leads=total,
        active_leads=active,
        quoted_leads=quoted,
        won_leads=won,
        overdue_leads=overdue,
    )


@lead_tracker_router.get(
    "/kpis",
    response_model=TrackerKPIs,
    summary="Get Lead Status Tracker high-level executive KPIs",
)
def get_tracker_kpis(
    authorization: str | None = Header(None),
) -> TrackerKPIs:
    """Returns aggregated executive metrics across all tracked leads."""
    require_lead_tracker_auth(authorization)
    with _FILE_LOCK:
        data = load_tracker_data()
    return compute_tracker_kpis(data.get("entities", {}))


@lead_tracker_router.get(
    "",
    response_model=list[LeadTrackerItem],
    summary="List tracked freight leads with branch/rep filtering and overdue alerts",
)
def list_tracked_leads(
    branch: str | None = Query(default=None, description="Filter by branch (Mumbai, Gujarat, South India, etc.)"),
    assigned_to: str | None = Query(default=None, description="Filter by assigned sales coordinator"),
    status: str | None = Query(default=None, description="Filter by pipeline stage"),
    overdue_only: bool = Query(default=False, description="Filter only active leads with overdue next follow-up"),
    search: str | None = Query(default=None, description="Free-text search across company, contact, notes, action"),
    sort_by: str = Query(default="updated_at", description="Field to sort by: updated_at, next_followup_date, company_name"),
    order: str = Query(default="desc", description="Sort order: asc or desc"),
    authorization: str | None = Header(None),
) -> list[LeadTrackerItem]:
    """Lists tracked leads with single-pass filtering and O(N log N) sorting."""
    require_lead_tracker_auth(authorization)

    with _FILE_LOCK:
        data = load_tracker_data()
    entities = data.get("entities", {})

    today_str = date.today().isoformat()
    results = []

    # Single-pass filter
    for item in entities.values():
        if branch and item.get("branch", "").strip().lower() != branch.strip().lower():
            continue
        if assigned_to and assigned_to.strip().lower() not in item.get("assigned_to", "").strip().lower():
            continue
        if status and item.get("status", "").strip().lower() != status.strip().lower():
            continue
        if overdue_only:
            fup = item.get("next_followup_date")
            st = item.get("status")
            if not (fup and str(fup) < today_str and st not in CLOSED_STATUSES):
                continue
        if search:
            s_lower = search.strip().lower()
            company = item.get("company_name", "").lower()
            contact = (item.get("contact_person") or "").lower()
            rep = item.get("assigned_to", "").lower()
            notes = (item.get("feedback_notes") or "").lower()
            action = (item.get("next_action") or "").lower()
            if not (
                s_lower in company
                or s_lower in contact
                or s_lower in rep
                or s_lower in notes
                or s_lower in action
            ):
                continue
        results.append(item)

    is_reverse = order.strip().lower() == "desc"
    if sort_by == "next_followup_date":
        # Missing follow-up dates sort to the end
        results.sort(
            key=lambda x: (
                x.get("next_followup_date") is None,
                x.get("next_followup_date") or "",
            ),
            reverse=is_reverse,
        )
    elif sort_by == "company_name":
        results.sort(
            key=lambda x: x.get("company_name", "").lower(),
            reverse=is_reverse,
        )
    else:
        results.sort(
            key=lambda x: x.get("updated_at") or "",
            reverse=is_reverse,
        )

    return [LeadTrackerItem(**item) for item in results]


@lead_tracker_router.get(
    "/{id}",
    response_model=LeadTrackerItem,
    summary="Get details and activity history for a specific tracked lead",
)
def get_tracked_lead(
    id: str,
    authorization: str | None = Header(None),
) -> LeadTrackerItem:
    """Returns single LeadTrackerItem with full chronological history."""
    require_lead_tracker_auth(authorization)
    with _FILE_LOCK:
        data = load_tracker_data()
    entities = data.get("entities", {})
    if id not in entities:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracked lead with ID '{id}' not found",
        )
    return LeadTrackerItem(**entities[id])


@lead_tracker_router.post(
    "",
    response_model=LeadTrackerItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create and assign a new tracked freight lead",
)
def create_tracked_lead(
    payload: LeadTrackerCreate,
    authorization: str | None = Header(None),
) -> LeadTrackerItem:
    """Creates a new lead entry with automatic ID generation, rep email lookup, and initial log."""
    user = require_lead_tracker_auth(authorization)

    with _FILE_LOCK:
        data = load_tracker_data()
        entities = data.setdefault("entities", {})

        now_iso = datetime.now(timezone.utc).isoformat()
        lead_id = f"trk_{uuid.uuid4().hex[:12]}"

        author_name = user.get("name") or payload.assigned_by or "Tyra Theknath"
        author_email = user.get("sub") or "tyra@jfll.com"

        assigned_rep_email = payload.assigned_to_email
        if not assigned_rep_email:
            assigned_rep_email = SALES_REP_EMAILS.get(payload.assigned_to.strip().lower())

        initial_history = [
            LeadTrackerLogEntry(
                id=f"log_{uuid.uuid4().hex[:8]}",
                timestamp=now_iso,
                author_name=author_name,
                author_email=author_email,
                action="Lead Created / Assigned",
                notes=payload.feedback_notes or f"Assigned to {payload.assigned_to} ({payload.branch} branch)",
            )
        ]

        item = LeadTrackerItem(
            id=lead_id,
            company_name=payload.company_name,
            contact_person=payload.contact_person,
            contact_phone=payload.contact_phone,
            contact_email=payload.contact_email,
            branch=payload.branch,
            assigned_to=payload.assigned_to,
            assigned_to_email=assigned_rep_email,
            assigned_by=payload.assigned_by or author_name,
            assigned_date=payload.assigned_date,
            status=payload.status,
            transport_mode=payload.transport_mode,
            routing_type=payload.routing_type,
            feedback_notes=payload.feedback_notes,
            next_followup_date=payload.next_followup_date,
            next_action=payload.next_action,
            linked_entity_type=payload.linked_entity_type,
            linked_entity_id=payload.linked_entity_id,
            history=initial_history,
            created_at=now_iso,
            updated_at=now_iso,
        )

        item_dict = item.model_dump() if hasattr(item, "model_dump") else item.dict()
        entities[lead_id] = item_dict
        save_tracker_data(data)

    return item


@lead_tracker_router.patch(
    "/{id}",
    response_model=LeadTrackerItem,
    summary="Update status, feedback notes, follow-up date, or sales rep for a tracked lead",
)
def update_tracked_lead(
    id: str,
    payload: LeadTrackerUpdate,
    authorization: str | None = Header(None),
) -> LeadTrackerItem:
    """Updates lead attributes and records automatic audit history entries."""
    user = require_lead_tracker_auth(authorization)

    with _FILE_LOCK:
        data = load_tracker_data()
        entities = data.setdefault("entities", {})
        if id not in entities:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tracked lead with ID '{id}' not found",
            )

        record = entities[id]
        updates = (
            payload.model_dump(exclude_unset=True)
            if hasattr(payload, "model_dump")
            else payload.dict(exclude_unset=True)
        )
        now_iso = datetime.now(timezone.utc).isoformat()
        author_name = user.get("name") or "Leadership"
        author_email = user.get("sub") or "leadership@jfll.com"

        history_entries = record.setdefault("history", [])

        # Detect changes and append corresponding history entry
        if "status" in updates and updates["status"] != record.get("status"):
            old_status = record.get("status")
            new_status = updates["status"]
            note = f"Status updated from '{old_status}' to '{new_status}'"
            if updates.get("feedback_notes"):
                note += f". Notes: {updates['feedback_notes']}"
            history_entries.append(
                LeadTrackerLogEntry(
                    id=f"log_{uuid.uuid4().hex[:8]}",
                    timestamp=now_iso,
                    author_name=author_name,
                    author_email=author_email,
                    action="Status Change",
                    notes=note,
                ).model_dump()
            )
        elif "assigned_to" in updates and updates["assigned_to"] != record.get("assigned_to"):
            old_rep = record.get("assigned_to")
            new_rep = updates["assigned_to"]
            history_entries.append(
                LeadTrackerLogEntry(
                    id=f"log_{uuid.uuid4().hex[:8]}",
                    timestamp=now_iso,
                    author_name=author_name,
                    author_email=author_email,
                    action="Reassignment",
                    notes=f"Reassigned from {old_rep} to {new_rep}",
                ).model_dump()
            )
        elif "next_followup_date" in updates and updates["next_followup_date"] != record.get("next_followup_date"):
            new_fup = updates["next_followup_date"]
            note = f"Next follow-up date set to {new_fup}"
            if updates.get("next_action"):
                note += f": {updates['next_action']}"
            history_entries.append(
                LeadTrackerLogEntry(
                    id=f"log_{uuid.uuid4().hex[:8]}",
                    timestamp=now_iso,
                    author_name=author_name,
                    author_email=author_email,
                    action="Follow-up Scheduled",
                    notes=note,
                ).model_dump()
            )
        elif "feedback_notes" in updates and updates["feedback_notes"] != record.get("feedback_notes"):
            history_entries.append(
                LeadTrackerLogEntry(
                    id=f"log_{uuid.uuid4().hex[:8]}",
                    timestamp=now_iso,
                    author_name=author_name,
                    author_email=author_email,
                    action="Feedback Logged",
                    notes=updates["feedback_notes"],
                ).model_dump()
            )

        # Apply field updates
        for k, v in updates.items():
            if v is not None or k in {"feedback_notes", "next_followup_date", "next_action"}:
                record[k] = v

        if "assigned_to" in updates and not updates.get("assigned_to_email"):
            rep_clean = updates["assigned_to"].strip().lower()
            if rep_clean in SALES_REP_EMAILS:
                record["assigned_to_email"] = SALES_REP_EMAILS[rep_clean]

        record["updated_at"] = now_iso
        save_tracker_data(data)

    return LeadTrackerItem(**record)


@lead_tracker_router.post(
    "/{id}/activity",
    response_model=LeadTrackerItem,
    summary="Append a new touchpoint/activity log entry to a tracked lead",
)
def append_tracker_activity(
    id: str,
    payload: TrackerActivityCreate,
    authorization: str | None = Header(None),
) -> LeadTrackerItem:
    """Appends an interaction log entry to history and optionally updates stage/followup date."""
    user = require_lead_tracker_auth(authorization)

    with _FILE_LOCK:
        data = load_tracker_data()
        entities = data.setdefault("entities", {})
        if id not in entities:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tracked lead with ID '{id}' not found",
            )

        record = entities[id]
        now_iso = datetime.now(timezone.utc).isoformat()
        author_name = payload.author_name or user.get("name") or "Sales Coordinator"
        author_email = payload.author_email or user.get("sub") or "sales@jfll.com"

        log_entry = LeadTrackerLogEntry(
            id=f"log_{uuid.uuid4().hex[:8]}",
            timestamp=now_iso,
            author_name=author_name,
            author_email=author_email,
            action=payload.action,
            notes=payload.notes,
        )

        history_entries = record.setdefault("history", [])
        history_entries.append(
            log_entry.model_dump() if hasattr(log_entry, "model_dump") else log_entry.dict()
        )

        # Update stage or follow-up date if specified in activity payload
        if payload.status:
            record["status"] = payload.status
        if payload.next_followup_date is not None:
            record["next_followup_date"] = payload.next_followup_date
        if payload.notes:
            record["feedback_notes"] = payload.notes

        record["updated_at"] = now_iso
        save_tracker_data(data)

    return LeadTrackerItem(**record)


@lead_tracker_router.delete(
    "/{id}",
    summary="Delete or archive a tracked lead",
)
def delete_tracked_lead(
    id: str,
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """Deletes a tracked lead record by ID."""
    require_lead_tracker_auth(authorization)

    with _FILE_LOCK:
        data = load_tracker_data()
        entities = data.setdefault("entities", {})
        if id not in entities:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tracked lead with ID '{id}' not found",
            )

        del entities[id]
        save_tracker_data(data)

    return {
        "success": True,
        "deleted_id": id,
        "message": f"Lead '{id}' deleted successfully",
    }
