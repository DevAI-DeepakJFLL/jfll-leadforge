"""FastAPI router and persistence controller for sales coordinator approach logs and active conversions."""

import json
import os
import threading
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from pydantic import BaseModel

from src.api.access_control import Permission
from src.api.approach_models import (
    FUNNEL_RANKS,
    MANDATORY_NOTE_STATUSES,
    ApproachLogCreate,
    ApproachLogEntry,
    BulkStatusesResponse,
    ConvertToActiveRequest,
    EntityApproachHistory,
    SalesAction,
    SalesStatus,
)
from src.api.config import settings
from src.api.helpers import require_auth, require_permission
from src.api.logger import logger

approach_router = APIRouter(prefix="/api/v1/approach-logs", tags=["Sales Approach Logs"])

_FILE_LOCK = threading.Lock()
_CACHED_DATA: dict[str, Any] | None = None
_CACHED_MTIME: float | None = None
_CACHED_STORAGE_KEY: str | None = None
_LAST_S3_SYNC: float = 0.0

S3_APPROACH_LOGS_KEY = "data/approach_logs.json"


def _restore_from_s3(storage_path: Path) -> bool:
    """Restores approach_logs.json from S3 if available (e.g. AWS Lambda cold start)."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(settings.s3_bucket, S3_APPROACH_LOGS_KEY, str(storage_path))
        logger.info(
            "Approach Logs: Restored approach_logs.json from s3://%s/%s",
            settings.s3_bucket,
            S3_APPROACH_LOGS_KEY,
        )
        return True
    except Exception as err:
        logger.debug("Approach Logs: S3 restore skipped or unavailable: %s", err)
        return False


def _backup_to_s3(storage_path: Path) -> None:
    """Uploads approach_logs.json to S3 so approach records persist across Lambda cold starts."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3.upload_file(str(storage_path), settings.s3_bucket, S3_APPROACH_LOGS_KEY)
        logger.info(
            "Approach Logs: Persisted approach_logs.json to s3://%s/%s",
            settings.s3_bucket,
            S3_APPROACH_LOGS_KEY,
        )
    except Exception as err:
        logger.debug("Approach Logs: S3 backup skipped or unavailable: %s", err)


def get_storage_path() -> Path:
    """Resolves the persistence path for approach_logs.json."""
    custom_path = os.getenv("APPROACH_LOGS_PATH")
    if custom_path:
        return Path(custom_path)
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/data/approach_logs.json")
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "approach_logs.json"


def _build_empty_store() -> dict[str, Any]:
    return {
        "version": 1,
        "entities": {},
    }


def load_approach_data() -> dict[str, Any]:
    """Loads approach logs state from memory cache or disk, restoring from S3 if missing or periodically on Lambda."""
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
            initial_data = _build_empty_store()
            save_approach_data(initial_data)
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
                raise TypeError("Corrupt approach logs file structure")
            if "entities" not in data or not isinstance(data["entities"], dict):
                data["entities"] = {}
            _CACHED_DATA = data
            _CACHED_MTIME = current_mtime
            _CACHED_STORAGE_KEY = str(storage_path)
            return data
    except Exception as err:
        logger.warning(
            "Approach Logs: Could not read JSON storage (%s), using empty fallback",
            err,
        )
        _CACHED_DATA = None
        _CACHED_MTIME = None
        _CACHED_STORAGE_KEY = None
        return _build_empty_store()


def save_approach_data(
    data: dict[str, Any],
    background_tasks: BackgroundTasks | None = None,
    force_s3: bool = False,
) -> None:
    """
    Atomically writes approach log data to disk using fsync and os.replace.
    """
    global _CACHED_DATA, _CACHED_MTIME, _CACHED_STORAGE_KEY, _LAST_S3_SYNC
    storage_path = get_storage_path()
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = storage_path.with_suffix(".tmp")

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

    should_backup = (
        force_s3
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or settings.env != "local"
        or os.getenv("ENABLE_S3_APPROACH_BACKUP")
    )
    if should_backup:
        if background_tasks is not None:
            background_tasks.add_task(_backup_to_s3, storage_path)
        else:
            _backup_to_s3(storage_path)
    _LAST_S3_SYNC = time.time()


def get_converted_active_entity_ids(entity_type: str = "jfll_customer") -> set[str]:
    """Returns set of entity IDs that have been converted to Active."""
    data = load_approach_data()
    prefix = f"{entity_type.lower()}:"
    converted = set()
    for key, entity_record in data.get("entities", {}).items():
        if key.startswith(prefix) and entity_record.get("is_active_converted"):
            raw_id = entity_record.get("entity_id") or key.split(":", 1)[1]
            converted.add(raw_id)
    return converted


def _entity_key(entity_type: str, entity_id: str) -> str:
    return f"{entity_type.strip().lower()}:{entity_id.strip()}"


def _get_or_create_entity(
    data: dict[str, Any], entity_type: str, entity_id: str
) -> dict[str, Any]:
    key = _entity_key(entity_type, entity_id)
    if key not in data["entities"]:
        data["entities"][key] = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "current_status": SalesStatus.NOT_CONTACTED.value,
            "is_active_converted": False,
            "converted_at": None,
            "conversion_start_date": None,
            "logs": [],
        }
    return data["entities"][key]


@approach_router.get(
    "/bulk-statuses",
    response_model=BulkStatusesResponse,
    summary="Get all latest approach statuses for an entity type",
)
def get_bulk_statuses(
    entity_type: Literal["datamyne", "jfll_customer"] = Query(..., description="Target dataset entity type"),
    authorization: str | None = Header(None),
) -> BulkStatusesResponse:
    """
    Returns an O(1) lookup dictionary of entity_id -> status for high-speed table rendering,
    including mapped company-level statuses and notes for seamless cross-dataset visibility.
    """
    require_auth(authorization, "sales approach bulk statuses")

    with _FILE_LOCK:
        data = load_approach_data()

    statuses: dict[str, SalesStatus] = {}
    notes: dict[str, str] = {}
    company_statuses: dict[str, SalesStatus] = {}
    company_notes: dict[str, str] = {}

    prefix = f"{entity_type.lower()}:"
    for key, entity_record in data.get("entities", {}).items():
        if key.startswith(prefix):
            raw_id = entity_record.get("entity_id") or key.split(":", 1)[1]
            raw_status = entity_record.get("current_status", SalesStatus.NOT_CONTACTED.value)
            try:
                st = SalesStatus(raw_status)
            except ValueError:
                st = SalesStatus.NOT_CONTACTED
            statuses[raw_id] = st

            logs = entity_record.get("logs", [])
            latest_note = ""
            for log in reversed(logs):
                n = (log.get("note") or "").strip()
                if n:
                    latest_note = n
                    break
            if latest_note:
                notes[raw_id] = latest_note

            comp_name = (entity_record.get("company_name") or "").strip()
            if not comp_name:
                for log in reversed(logs):
                    c = (log.get("company_name") or "").strip()
                    if c:
                        comp_name = c
                        break
            if comp_name:
                norm_c = comp_name.lower()
                company_statuses[norm_c] = st
                if latest_note:
                    company_notes[norm_c] = latest_note

    # Augment with any synced leads from lead_tracker_items
    try:
        from src.api.lead_tracker_db import get_db_connection
        conn = get_db_connection()
        try:
            cur = conn.execute(
                """
                SELECT linked_entity_id, company_name, status, feedback_notes
                FROM lead_tracker_items
                WHERE linked_entity_type = ? AND is_archived = 0
                """,
                (entity_type,),
            )
            for row in cur.fetchall():
                lid = row["linked_entity_id"]
                cname = (row["company_name"] or "").strip()
                r_status = row["status"]
                f_notes = (row["feedback_notes"] or "").strip()

                st = SalesStatus.CONTACTED
                for s in SalesStatus:
                    if s.value == r_status:
                        st = s
                        break

                if lid and lid not in statuses:
                    statuses[lid] = st
                    if f_notes:
                        notes[lid] = f_notes
                if cname:
                    norm_c = cname.lower()
                    if norm_c not in company_statuses:
                        company_statuses[norm_c] = st
                    if f_notes and norm_c not in company_notes:
                        company_notes[norm_c] = f_notes
        finally:
            conn.close()
    except Exception:
        pass

    return BulkStatusesResponse(
        entity_type=entity_type,
        total_tracked=len(statuses),
        statuses=statuses,
        notes=notes,
        company_statuses=company_statuses,
        company_notes=company_notes,
    )


@approach_router.get(
    "/{entity_type}/{entity_id}",
    response_model=EntityApproachHistory,
    summary="Get approach history and timeline for a customer/lead",
)
def get_entity_approach_history(
    entity_type: Literal["datamyne", "jfll_customer"],
    entity_id: str,
    company_name: str | None = Query(None, description="Optional company name fallback for cross-record resolution"),
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """
    Retrieves full audit log history and current status for a specific lead or customer.
    Defaults to 'Not Contacted' if no outreach has been logged yet.
    """
    require_auth(authorization, "sales approach history")

    record = None
    with _FILE_LOCK:
        data = load_approach_data()
        key = _entity_key(entity_type, entity_id)
        record = data.get("entities", {}).get(key)

        # Fallback: cross-record match by company name if entity ID differs across import datasets
        if not record and company_name and company_name.strip():
            target_norm = company_name.strip().lower()
            prefix = f"{entity_type.lower()}:"
            for k, ent in data.get("entities", {}).items():
                if k.startswith(prefix):
                    ent_comp = (ent.get("company_name") or "").strip().lower()
                    if not ent_comp:
                        for l in ent.get("logs", []):
                            lc = (l.get("company_name") or "").strip().lower()
                            if lc:
                                ent_comp = lc
                                break
                    if ent_comp == target_norm:
                        record = ent
                        break

    if not record:
        # Check SQLite lead_tracker_items fallback
        if company_name and company_name.strip():
            try:
                from src.api.lead_tracker_db import get_db_connection
                conn = get_db_connection()
                try:
                    cur = conn.execute(
                        """
                        SELECT id, status, feedback_notes, assigned_to, updated_at
                        FROM lead_tracker_items
                        WHERE (linked_entity_type = ? AND linked_entity_id = ?)
                           OR LOWER(TRIM(company_name)) = LOWER(TRIM(?))
                        LIMIT 1
                        """,
                        (entity_type, entity_id, company_name.strip()),
                    )
                    row = cur.fetchone()
                    if row:
                        cur_act = conn.execute(
                            """
                            SELECT id, author_name, author_email, action, notes, new_status, created_at
                            FROM lead_tracker_activities
                            WHERE lead_id = ?
                            ORDER BY created_at DESC
                            """,
                            (row["id"],),
                        )
                        act_rows = cur_act.fetchall()
                        fallback_logs = []
                        for act in act_rows:
                            fallback_logs.append(
                                ApproachLogEntry(
                                    id=act["id"],
                                    action=act["action"] or "Called customer",
                                    previous_status=SalesStatus.NOT_CONTACTED,
                                    status=SalesStatus.CONTACTED,
                                    note=act["notes"],
                                    company_name=company_name.strip(),
                                    salesperson_name=act["author_name"] or row["assigned_to"] or "Sales Coordinator",
                                    salesperson_email=act["author_email"] or "sales@jfll.com",
                                    created_at=act["created_at"] or datetime.now(UTC).isoformat(),
                                )
                            )
                        if fallback_logs:
                            return EntityApproachHistory(
                                entity_type=entity_type,
                                entity_id=entity_id,
                                current_status=SalesStatus.CONTACTED,
                                is_active_converted=False,
                                logs=fallback_logs,
                            )
                finally:
                    conn.close()
            except Exception:
                pass

        return EntityApproachHistory(
            entity_type=entity_type,
            entity_id=entity_id,
            current_status=SalesStatus.NOT_CONTACTED,
            is_active_converted=False,
            logs=[],
        )

    # Sort logs newest first for presentation
    logs_data = list(record.get("logs", []))
    logs_data.sort(key=lambda l: l.get("created_at", ""), reverse=True)

    return EntityApproachHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        current_status=SalesStatus(record.get("current_status", SalesStatus.NOT_CONTACTED.value)),
        is_active_converted=record.get("is_active_converted", False),
        converted_at=record.get("converted_at"),
        conversion_start_date=record.get("conversion_start_date"),
        logs=[ApproachLogEntry(**item) for item in logs_data],
    )


def _map_approach_to_tracker_status(sales_status: SalesStatus, action: SalesAction) -> str:
    """Maps SalesStatus / SalesAction to LeadTracker pipeline status."""
    if action == SalesAction.SENT_QUOTE:
        return "Quoted"
    if action == SalesAction.HELD_MEETING:
        return "Feedback Received"
    if action == SalesAction.FOLLOW_UP_SCHEDULED:
        return "Meeting Scheduled"

    status_map = {
        SalesStatus.NOT_CONTACTED: "Assigned",
        SalesStatus.CONTACTED: "Contacted",
        SalesStatus.REPORT_SENT: "Quoted",
        SalesStatus.WORKING_ON_IT: "Contacted",
        SalesStatus.IN_PROGRESS: "Feedback Received",
        SalesStatus.ON_HOLD: "On Hold",
        SalesStatus.NO_RESPONSE: "On Hold",
        SalesStatus.NOT_INTERESTED: "Closed / Lost",
        SalesStatus.CONVERTED_TO_ACTIVE: "Won",
    }
    return status_map.get(sales_status, "Contacted")


def _sync_to_lead_tracker(
    entity_type: str,
    entity_id: str,
    company_name: str | None,
    action: str,
    status: SalesStatus,
    note: str | None,
    user_name: str,
    user_email: str,
) -> None:
    """
    Synchronizes logged sales coordinator outreach to the SQLite Lead Status Tracker.
    If the lead is already tracked, appends an activity touchpoint and updates its status.
    If not yet tracked, creates a new tracked lead assigned to the logging user.
    """
    try:
        from src.api.lead_tracker_db import (
            get_db_connection,
            create_lead,
            add_activity,
            update_lead,
            init_db,
        )

        init_db()

        sales_act = SalesAction.CALLED_CUSTOMER
        try:
            sales_act = SalesAction(action)
        except Exception:
            pass

        mapped_status = _map_approach_to_tracker_status(status, sales_act)
        clean_company = (company_name or "").strip()
        if not clean_company:
            clean_company = entity_id.replace("dm_", "").replace("cust_", "").replace("_", " ").title()

        conn = get_db_connection()
        existing_lead_id = None
        try:
            cur = conn.execute(
                """
                SELECT id, company_name, status FROM lead_tracker_items
                WHERE (linked_entity_type = ? AND linked_entity_id = ?)
                   OR (LOWER(TRIM(company_name)) = LOWER(TRIM(?)))
                LIMIT 1
                """,
                (entity_type, entity_id, clean_company),
            )
            row = cur.fetchone()
            if row:
                existing_lead_id = row["id"]
        finally:
            conn.close()

        if existing_lead_id:
            add_activity(
                lead_id=existing_lead_id,
                activity_data={
                    "author_name": user_name,
                    "author_email": user_email,
                    "action": action,
                    "notes": note,
                    "new_status": mapped_status,
                },
            )
            update_lead(
                lead_id=existing_lead_id,
                update_data={
                    "status": mapped_status,
                    "feedback_notes": note,
                    "linked_entity_type": entity_type,
                    "linked_entity_id": entity_id,
                },
            )
        else:
            create_lead(
                lead_data={
                    "company_name": clean_company,
                    "assigned_to": user_name,
                    "assigned_to_email": user_email,
                    "assigned_by": user_name,
                    "status": mapped_status,
                    "feedback_notes": note,
                    "linked_entity_type": entity_type,
                    "linked_entity_id": entity_id,
                    "branch": "Mumbai",
                    "history": [
                        {
                            "author_name": user_name,
                            "author_email": user_email,
                            "action": action,
                            "new_status": mapped_status,
                            "notes": note,
                        }
                    ],
                }
            )
    except Exception as err:
        logger.warning("Lead Tracker Sync: Failed to sync activity for %s %s: %s", entity_type, entity_id, err)


class ApproachLogDirectRequest(BaseModel):
    entity_type: Literal["datamyne", "jfll_customer"] = "datamyne"
    entity_id: str
    company_name: str | None = None
    action: SalesAction = SalesAction.CALLED_CUSTOMER
    status: SalesStatus = SalesStatus.CONTACTED
    note: str | None = None


@approach_router.post(
    "/log",
    response_model=EntityApproachHistory,
    summary="Log a sales approach activity directly",
)
def post_direct_approach_log(
    payload: ApproachLogDirectRequest,
    background_tasks: BackgroundTasks = None,
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """Convenience endpoint accepting full payload including entity coordinates."""
    create_payload = ApproachLogCreate(
        action=payload.action,
        status=payload.status,
        note=payload.note,
        company_name=payload.company_name,
    )
    return log_approach_activity(
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        payload=create_payload,
        background_tasks=background_tasks,
        authorization=authorization,
    )


@approach_router.post(
    "/{entity_type}/{entity_id}",
    response_model=EntityApproachHistory,
    summary="Log a sales approach activity",
)
def log_approach_activity(
    entity_type: Literal["datamyne", "jfll_customer"],
    entity_id: str,
    payload: ApproachLogCreate,
    background_tasks: BackgroundTasks = None,
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """
    Records a sales outreach action, validates status transitions, and enforces mandatory notes.
    """
    user = require_permission(Permission.LOG_APPROACH)(authorization)
    user_email = user.get("sub", "sales.coordinator@jfll.com").strip().lower()
    user_name = user.get("name") or user_email.split("@")[0].replace(".", " ").title()

    # Rule: Converted to Active cannot be picked from standard status dropdown
    if payload.status == SalesStatus.CONVERTED_TO_ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Cannot select 'Converted to Active' directly. Use the dedicated Convert to Active button.",
        )

    with _FILE_LOCK:
        data = load_approach_data()
        entity = _get_or_create_entity(data, entity_type, entity_id)

        current_status_val = entity.get("current_status", SalesStatus.NOT_CONTACTED.value)
        try:
            current_status = SalesStatus(current_status_val)
        except ValueError:
            current_status = SalesStatus.NOT_CONTACTED

        target_status = payload.status

        # Evaluate funnel ranks
        current_rank = FUNNEL_RANKS.get(current_status, 0)
        target_rank = FUNNEL_RANKS.get(target_status, 0)

        # Rule: Moving backward requires a note
        is_backward = target_rank < current_rank
        if is_backward and not payload.note:
            raise HTTPException(
                status_code=422,
                detail=f"Moving status backward from '{current_status.value}' to '{target_status.value}' requires an explanatory note.",
            )

        # Rule: Note required for On Hold, No Response, Not Interested
        if target_status in MANDATORY_NOTE_STATUSES and not payload.note:
            raise HTTPException(
                status_code=422,
                detail=f"Setting status to '{target_status.value}' requires an explanatory note.",
            )

        new_entry = {
            "id": str(uuid.uuid4()),
            "action": payload.action.value,
            "previous_status": current_status.value,
            "status": target_status.value,
            "note": payload.note,
            "company_name": payload.company_name,
            "salesperson_name": user_name,
            "salesperson_email": user_email,
            "created_at": datetime.now(UTC).isoformat(),
        }

        entity["current_status"] = target_status.value
        if payload.company_name:
            entity["company_name"] = payload.company_name
        if "logs" not in entity:
            entity["logs"] = []
        entity["logs"].append(new_entry)

        save_approach_data(data, background_tasks=background_tasks)

    # Sync touchpoint to Lead Status Tracker SQLite database
    _sync_to_lead_tracker(
        entity_type=entity_type,
        entity_id=entity_id,
        company_name=payload.company_name,
        action=payload.action.value,
        status=target_status,
        note=payload.note,
        user_name=user_name,
        user_email=user_email,
    )

    logger.info(
        "Sales Approach Logged: %s %s -> %s by %s",
        entity_type,
        entity_id,
        target_status.value,
        user_email,
        extra={
            "event": "SALES_APPROACH_LOGGED",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": payload.action.value,
            "status": target_status.value,
            "user_email": user_email,
        },
    )

    logs_sorted = list(entity["logs"])
    logs_sorted.sort(key=lambda l: l.get("created_at", ""), reverse=True)

    return EntityApproachHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        current_status=target_status,
        is_active_converted=entity.get("is_active_converted", False),
        converted_at=entity.get("converted_at"),
        conversion_start_date=entity.get("conversion_start_date"),
        logs=[ApproachLogEntry(**item) for item in logs_sorted],
    )


@approach_router.post(
    "/{entity_type}/{entity_id}/convert-to-active",
    response_model=EntityApproachHistory,
    summary="Convert an inactive client or lead to Active",
)
def convert_client_to_active(
    entity_type: Literal["datamyne", "jfll_customer"],
    entity_id: str,
    payload: ConvertToActiveRequest,
    background_tasks: BackgroundTasks = None,
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """
    Dedicated transition workflow: sets status to 'Converted to Active',
    records the effective start date, and appends a permanent milestone log.
    """
    user = require_auth(authorization, "convert client to active")
    user_role = user.get("role", "")
    from src.api.access_control import ADMIN_ROLES
    ALLOWED_CONVERT_ROLES = ADMIN_ROLES | {"Commercial Lead", "Commercial", "Operations"}
    if not user_role or user_role not in ALLOWED_CONVERT_ROLES:
        raise HTTPException(
            status_code=403,
            detail="FORBIDDEN_CONVERSION: Role not authorized to convert client to active.",
        )
    user_email = user.get("sub", "sales.coordinator@jfll.com").strip().lower()
    user_name = user.get("name") or user_email.split("@")[0].replace(".", " ").title()

    with _FILE_LOCK:
        data = load_approach_data()
        entity = _get_or_create_entity(data, entity_type, entity_id)

        previous_status = entity.get("current_status", SalesStatus.NOT_CONTACTED.value)
        conversion_time = datetime.now(UTC).isoformat()

        activation_note = (
            f"Converted to Active. Effective start date: {payload.start_date}."
        )
        if payload.note:
            activation_note += f" Handover Notes: {payload.note}"

        new_entry = {
            "id": str(uuid.uuid4()),
            "action": SalesAction.OTHER.value,
            "previous_status": previous_status,
            "status": SalesStatus.CONVERTED_TO_ACTIVE.value,
            "note": activation_note,
            "salesperson_name": user_name,
            "salesperson_email": user_email,
            "created_at": conversion_time,
        }

        entity["current_status"] = SalesStatus.CONVERTED_TO_ACTIVE.value
        entity["is_active_converted"] = True
        entity["converted_at"] = conversion_time
        entity["conversion_start_date"] = payload.start_date
        if "logs" not in entity:
            entity["logs"] = []
        entity["logs"].append(new_entry)

        save_approach_data(data, background_tasks=background_tasks)

    # Sync touchpoint to Lead Status Tracker SQLite database
    _sync_to_lead_tracker(
        entity_type=entity_type,
        entity_id=entity_id,
        company_name=None,
        action=SalesAction.OTHER.value,
        status=SalesStatus.CONVERTED_TO_ACTIVE,
        note=activation_note,
        user_name=user_name,
        user_email=user_email,
    )

    logger.info(
        "Client Converted to Active: %s %s by %s (Start Date: %s)",
        entity_type,
        entity_id,
        user_email,
        payload.start_date,
        extra={
            "event": "CLIENT_CONVERTED_ACTIVE",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_email": user_email,
            "start_date": payload.start_date,
        },
    )

    logs_sorted = list(entity["logs"])
    logs_sorted.sort(key=lambda l: l.get("created_at", ""), reverse=True)

    return EntityApproachHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        current_status=SalesStatus.CONVERTED_TO_ACTIVE,
        is_active_converted=True,
        converted_at=conversion_time,
        conversion_start_date=payload.start_date,
        logs=[ApproachLogEntry(**item) for item in logs_sorted],
    )


# Alias endpoints for backward compatibility / alternate naming
update_entity_approach_status = log_approach_activity

