"""FastAPI router and persistence controller for Phase 2 Lead Status Tracker.

Follows freight-forwarding domain concepts (Transport Mode, Routing Control,
Sales Feedback, Follow-up Cadence, Rate Validity Horizon) and DSA-conscious design principles:
- SQLite persistence backed by WAL mode for multi-worker safe concurrency.
- O(log N) indexed lookups and queries via relational SQLite tables.
- Single O(N) pass for high-level executive KPI metrics.
- Automatic migration from legacy lead_tracker.json or Phase2/Lead_Tracker.xlsx.
- S3 backup & restore integration for serverless cloud durability.
"""

import os
import threading
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, status

from src.api.access_control import (
    ROOT_ADMIN_EMAILS,
    Permission,
    has_permission,
    is_email_active,
)
from src.api.auth import check_session_active, verify_token
from src.api.config import settings
from src.api.lead_tracker_db import (
    add_activity,
    backup_db_to_s3,
    create_lead,
    delete_lead,
    get_all_leads,
    get_db_connection,
    get_kpis,
    get_lead_by_id,
    init_db,
    migrate_from_json_if_needed,
    restore_db_from_s3,
    update_lead,
)
from src.api.lead_tracker_models import (
    LeadTrackerCreate,
    LeadTrackerItem,
    LeadTrackerUpdate,
    TrackerActivityCreate,
    TrackerKPIs,
    TrackerStatus,
)

lead_tracker_router = APIRouter(prefix="/api/v1/lead-tracker", tags=["Lead Status Tracker"])

_ROUTER_LOCK = threading.Lock()
_DB_INITIALIZED = False

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
    """Resolves legacy json persistence path."""
    custom_path = os.getenv("LEAD_TRACKER_PATH")
    if custom_path:
        return Path(custom_path)
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/data/lead_tracker.json")
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "lead_tracker.json"


def get_db_path() -> Path:
    """Resolves SQLite database path, inheriting directory overrides from tests or environment."""
    custom_db = os.getenv("LEAD_TRACKER_DB_PATH")
    if custom_db:
        return Path(custom_db)
    custom_json = os.getenv("LEAD_TRACKER_PATH")
    if custom_json:
        return Path(custom_json).with_suffix(".db")
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/data/lead_tracker.db")
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "lead_tracker.db"


def _ensure_db_initialized() -> Path:
    """Ensures SQLite schema exists and initial records are hydrated."""
    global _DB_INITIALIZED
    db_path = get_db_path()
    with _ROUTER_LOCK:
        if not db_path.exists() and os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            restore_db_from_s3(db_path)
        init_db(db_path)
        conn = get_db_connection(db_path)
        try:
            cur = conn.execute("SELECT COUNT(*) AS cnt FROM lead_tracker_items")
            cnt = cur.fetchone()["cnt"]
        finally:
            conn.close()

        if cnt == 0:
            migrate_from_json_if_needed(json_path=get_storage_path(), db_path=db_path)
        _DB_INITIALIZED = True
    return db_path


def reset_tracker_cache() -> None:
    """Resets memory state for clean test isolation."""
    global _DB_INITIALIZED
    _DB_INITIALIZED = False


def load_tracker_data() -> dict[str, Any]:
    """Compatibility wrapper that reads leads from SQLite into entity dictionary."""
    db_path = _ensure_db_initialized()
    leads = get_all_leads(db_path=db_path)
    entities = {lead["id"]: lead for lead in leads}
    return {"version": 1, "entities": entities}


def save_tracker_data(data: dict[str, Any]) -> None:
    """Compatibility wrapper for tests that invoke save_tracker_data directly."""
    db_path = _ensure_db_initialized()
    entities = data.get("entities", {})
    for item in entities.values():
        if get_lead_by_id(item["id"], db_path=db_path):
            update_lead(item["id"], item, db_path=db_path)
        else:
            create_lead(item, db_path=db_path)


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
    db_path = _ensure_db_initialized()
    kpi_dict = get_kpis(db_path=db_path)
    return TrackerKPIs(**kpi_dict)


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
    """Lists tracked leads with indexed SQLite queries and O(N log N) ordering."""
    require_lead_tracker_auth(authorization)
    db_path = _ensure_db_initialized()

    leads = get_all_leads(
        branch=branch,
        assigned_to=assigned_to,
        status_filter=status,
        search=search,
        overdue_only=overdue_only,
        sort_by=sort_by,
        order=order,
        db_path=db_path,
    )

    return [LeadTrackerItem(**item) for item in leads]


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
    db_path = _ensure_db_initialized()

    lead = get_lead_by_id(id, db_path=db_path)
    if not lead or lead.get("is_archived"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracked lead with ID '{id}' not found",
        )

    return LeadTrackerItem(**lead)


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
    db_path = _ensure_db_initialized()

    lead_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    assigned_by = payload.assigned_by or user.get("name") or "Tyra Theknath"
    lead_dict["assigned_by"] = assigned_by
    lead_dict["created_by"] = assigned_by

    created = create_lead(lead_dict, db_path=db_path)

    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or settings.env != "local" or os.getenv("ENABLE_S3_TRACKER_BACKUP"):
        backup_db_to_s3(db_path)

    return LeadTrackerItem(**created)


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
    db_path = _ensure_db_initialized()

    existing = get_lead_by_id(id, db_path=db_path)
    if not existing or existing.get("is_archived"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracked lead with ID '{id}' not found",
        )

    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)
    if not update_data:
        return LeadTrackerItem(**existing)

    author_name = user.get("name") or "Leadership"
    author_email = user.get("sub") or "admin@jfll.com"

    # Detect reassignment and log activity
    new_rep = update_data.get("assigned_to")
    old_rep = existing.get("assigned_to")
    if new_rep and new_rep != old_rep:
        add_activity(
            id,
            {
                "action": "Reassignment",
                "author_name": author_name,
                "author_email": author_email,
                "old_status": existing.get("status"),
                "new_status": existing.get("status"),
                "notes": f"Reassigned from {old_rep} to {new_rep}",
            },
            db_path=db_path,
        )

    # Detect status changes and log activity
    new_status = update_data.get("status")
    old_status = existing.get("status")
    if new_status and new_status != old_status:
        add_activity(
            id,
            {
                "action": "Status Change",
                "author_name": author_name,
                "author_email": author_email,
                "old_status": old_status,
                "new_status": new_status,
                "notes": update_data.get("feedback_notes") or f"Stage moved to {new_status}",
            },
            db_path=db_path,
        )

    updated = update_lead(id, update_data, db_path=db_path)

    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or settings.env != "local" or os.getenv("ENABLE_S3_TRACKER_BACKUP"):
        backup_db_to_s3(db_path)

    return LeadTrackerItem(**updated)


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
    db_path = _ensure_db_initialized()

    existing = get_lead_by_id(id, db_path=db_path)
    if not existing or existing.get("is_archived"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracked lead with ID '{id}' not found",
        )

    author_name = payload.author_name or user.get("name") or "Sales Coordinator"
    author_email = payload.author_email or user.get("sub") or "sales@jfll.com"

    activity_data = {
        "action": payload.action,
        "author_name": author_name,
        "author_email": author_email,
        "status": payload.status,
        "next_followup_date": payload.next_followup_date,
        "notes": payload.notes,
    }

    add_activity(id, activity_data, db_path=db_path)

    update_data: dict[str, Any] = {}
    if payload.notes and payload.notes.strip():
        update_data["feedback_notes"] = payload.notes.strip()
    if payload.status:
        update_data["status"] = payload.status
    if payload.next_followup_date:
        update_data["next_followup_date"] = payload.next_followup_date
    if update_data:
        update_lead(id, update_data, db_path=db_path)

    updated = get_lead_by_id(id, db_path=db_path)

    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or settings.env != "local" or os.getenv("ENABLE_S3_TRACKER_BACKUP"):
        backup_db_to_s3(db_path)

    return LeadTrackerItem(**updated)


@lead_tracker_router.delete(
    "/{id}",
    summary="Delete or archive a tracked lead",
)
def delete_tracked_lead(
    id: str,
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """Deletes or archives a tracked lead record by ID."""
    require_lead_tracker_auth(authorization)
    db_path = _ensure_db_initialized()

    existing = get_lead_by_id(id, db_path=db_path)
    if not existing or existing.get("is_archived"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tracked lead with ID '{id}' not found",
        )

    delete_lead(id, hard_delete=False, db_path=db_path)

    if os.getenv("AWS_LAMBDA_FUNCTION_NAME") or settings.env != "local" or os.getenv("ENABLE_S3_TRACKER_BACKUP"):
        backup_db_to_s3(db_path)

    return {
        "success": True,
        "deleted_id": id,
        "status": "success",
        "message": f"Tracked lead '{existing['company_name']}' has been archived",
        "id": id,
    }


@lead_tracker_router.post(
    "/sync-s3",
    summary="Manually trigger synchronization of Lead Tracker database to AWS S3",
)
def sync_tracker_to_s3(
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """Flushes active SQLite database snapshot to AWS S3 bucket."""
    require_lead_tracker_auth(authorization)
    db_path = _ensure_db_initialized()
    ok = backup_db_to_s3(db_path)
    return {
        "status": "success" if ok else "skipped",
        "message": "SQLite database synced to S3" if ok else "S3 sync skipped (running locally or S3 unreachable)",
    }


@lead_tracker_router.post(
    "/restore-s3",
    summary="Manually trigger restoration of Lead Tracker database from AWS S3",
)
def restore_tracker_from_s3(
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """Fetches SQLite database snapshot from AWS S3 and replaces local file."""
    require_lead_tracker_auth(authorization)
    db_path = get_db_path()
    ok = restore_db_from_s3(db_path)
    if ok:
        reset_tracker_cache()
        _ensure_db_initialized()
    return {
        "status": "success" if ok else "skipped",
        "message": "SQLite database restored from S3" if ok else "No remote S3 snapshot restored",
    }
