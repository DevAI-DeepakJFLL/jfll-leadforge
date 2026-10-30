"""FastAPI router and persistence controller for sales coordinator approach logs and active conversions."""

from datetime import UTC, datetime
import json
import os
from pathlib import Path
import threading
from typing import Any, Literal
import uuid

from fastapi import APIRouter, Header, HTTPException, Query

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
from src.api.helpers import require_auth
from src.api.logger import logger

approach_router = APIRouter(prefix="/api/v1/approach-logs", tags=["Sales Approach Logs"])

_FILE_LOCK = threading.Lock()
_CACHED_DATA: dict[str, Any] | None = None
_CACHED_MTIME: float | None = None
_CACHED_STORAGE_KEY: str | None = None


def get_storage_path() -> Path:
    """Resolves the persistence path for approach_logs.json."""
    custom_path = os.getenv("APPROACH_LOGS_PATH")
    if custom_path:
        return Path(custom_path)
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "approach_logs.json"


def _build_empty_store() -> dict[str, Any]:
    return {
        "version": 1,
        "entities": {},
    }


def load_approach_data() -> dict[str, Any]:
    """Loads approach logs state from memory cache or disk, initializing if missing."""
    global _CACHED_DATA, _CACHED_MTIME, _CACHED_STORAGE_KEY
    storage_path = get_storage_path()

    if not storage_path.exists():
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        initial_data = _build_empty_store()
        save_approach_data(initial_data)
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
        return _build_empty_store()


def save_approach_data(data: dict[str, Any]) -> None:
    """
    Atomically writes approach log data to disk using fsync and os.replace.
    """
    global _CACHED_DATA, _CACHED_MTIME, _CACHED_STORAGE_KEY
    storage_path = get_storage_path()
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = storage_path.with_suffix(".tmp")

    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())

    os.replace(temp_path, storage_path)
    try:
        _CACHED_MTIME = storage_path.stat().st_mtime
        _CACHED_DATA = data
        _CACHED_STORAGE_KEY = str(storage_path)
    except OSError:
        pass


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
    Returns an O(1) lookup dictionary of entity_id -> status for high-speed table rendering.
    """
    require_auth(authorization, "sales approach bulk statuses")

    with _FILE_LOCK:
        data = load_approach_data()

    statuses: dict[str, SalesStatus] = {}
    prefix = f"{entity_type.lower()}:"
    for key, entity_record in data.get("entities", {}).items():
        if key.startswith(prefix):
            raw_id = entity_record.get("entity_id") or key.split(":", 1)[1]
            raw_status = entity_record.get("current_status", SalesStatus.NOT_CONTACTED.value)
            try:
                statuses[raw_id] = SalesStatus(raw_status)
            except ValueError:
                statuses[raw_id] = SalesStatus.NOT_CONTACTED

    return BulkStatusesResponse(
        entity_type=entity_type,
        total_tracked=len(statuses),
        statuses=statuses,
    )


@approach_router.get(
    "/{entity_type}/{entity_id}",
    response_model=EntityApproachHistory,
    summary="Get approach history and timeline for a customer/lead",
)
def get_entity_approach_history(
    entity_type: Literal["datamyne", "jfll_customer"],
    entity_id: str,
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """
    Retrieves full audit log history and current status for a specific lead or customer.
    Defaults to 'Not Contacted' if no outreach has been logged yet.
    """
    require_auth(authorization, "sales approach history")

    with _FILE_LOCK:
        data = load_approach_data()
        key = _entity_key(entity_type, entity_id)
        record = data.get("entities", {}).get(key)

    if not record:
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


@approach_router.post(
    "/{entity_type}/{entity_id}",
    response_model=EntityApproachHistory,
    summary="Log a sales approach activity",
)
def log_approach_activity(
    entity_type: Literal["datamyne", "jfll_customer"],
    entity_id: str,
    payload: ApproachLogCreate,
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """
    Records a sales outreach action, validates status transitions, and enforces mandatory notes.
    """
    user = require_auth(authorization, "log sales approach")
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
            "salesperson_name": user_name,
            "salesperson_email": user_email,
            "created_at": datetime.now(UTC).isoformat(),
        }

        entity["current_status"] = target_status.value
        if "logs" not in entity:
            entity["logs"] = []
        entity["logs"].append(new_entry)

        save_approach_data(data)

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
    authorization: str | None = Header(None),
) -> EntityApproachHistory:
    """
    Dedicated transition workflow: sets status to 'Converted to Active',
    records the effective start date, and appends a permanent milestone log.
    """
    user = require_auth(authorization, "convert client to active")
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

        save_approach_data(data)

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
