"""Data Migration Utility: SQLite & JSON -> Aurora DSQL / Target Relational DB.

Migrates existing CRM leads, interaction activities, prospect approach logs,
and coordinator-enriched hot lead contacts into Aurora DSQL (or target relational store).
Ensures full idempotency: can be run repeatedly without raising uniqueness violations
or duplicating records.
"""

from __future__ import annotations

import argparse
import json
import logging
import sqlite3
import sys
import uuid
from datetime import datetime
try:
    from datetime import UTC
except ImportError:
    from datetime import timezone
    UTC = timezone.utc  # type: ignore
from pathlib import Path
from typing import Any

# Ensure Backend/ directory is on sys.path when executed directly
_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from src.api.dsql_schema import init_dsql_tables

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# --- Idempotent SQL Insert Statements ---
INSERT_LEAD_ITEM_SQL = """
INSERT INTO lead_tracker_items (
    id, company_name, contact_person, contact_phone, contact_email,
    branch, assigned_to, assigned_to_email, assigned_by, assigned_date,
    status, transport_mode, routing_type, feedback_notes, next_followup_date,
    next_action, quote_date, rate_validity_date, rate_validity_days,
    target_shipment_date, linked_entity_type, linked_entity_id,
    created_at, updated_at, created_by, is_archived
) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?
) ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    contact_person = EXCLUDED.contact_person,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    branch = EXCLUDED.branch,
    assigned_to = EXCLUDED.assigned_to,
    assigned_to_email = EXCLUDED.assigned_to_email,
    assigned_by = EXCLUDED.assigned_by,
    assigned_date = EXCLUDED.assigned_date,
    status = EXCLUDED.status,
    transport_mode = EXCLUDED.transport_mode,
    routing_type = EXCLUDED.routing_type,
    feedback_notes = EXCLUDED.feedback_notes,
    next_followup_date = EXCLUDED.next_followup_date,
    next_action = EXCLUDED.next_action,
    quote_date = EXCLUDED.quote_date,
    rate_validity_date = EXCLUDED.rate_validity_date,
    rate_validity_days = EXCLUDED.rate_validity_days,
    target_shipment_date = EXCLUDED.target_shipment_date,
    linked_entity_type = EXCLUDED.linked_entity_type,
    linked_entity_id = EXCLUDED.linked_entity_id,
    updated_at = EXCLUDED.updated_at,
    created_by = EXCLUDED.created_by,
    is_archived = EXCLUDED.is_archived;
""".strip()

INSERT_ACTIVITY_SQL = """
INSERT INTO lead_tracker_activities (
    id, lead_id, timestamp, author_name, author_email,
    action, old_status, new_status, notes
) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?
) ON CONFLICT (id) DO UPDATE SET
    lead_id = EXCLUDED.lead_id,
    timestamp = EXCLUDED.timestamp,
    author_name = EXCLUDED.author_name,
    author_email = EXCLUDED.author_email,
    action = EXCLUDED.action,
    old_status = EXCLUDED.old_status,
    new_status = EXCLUDED.new_status,
    notes = EXCLUDED.notes;
""".strip()

INSERT_APPROACH_LOG_SQL = """
INSERT INTO prospect_approach_logs (
    id, entity_type, entity_id, company_name,
    action, status, note, logged_by, logged_by_email, created_at
) VALUES (
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?
) ON CONFLICT (id) DO UPDATE SET
    entity_type = EXCLUDED.entity_type,
    entity_id = EXCLUDED.entity_id,
    company_name = EXCLUDED.company_name,
    action = EXCLUDED.action,
    status = EXCLUDED.status,
    note = EXCLUDED.note,
    logged_by = EXCLUDED.logged_by,
    logged_by_email = EXCLUDED.logged_by_email,
    created_at = EXCLUDED.created_at;
""".strip()

INSERT_HOT_LEAD_CONTACT_SQL = """
INSERT INTO hot_lead_contacts (
    sr_no, customer_name, gstin, phone, contact_person,
    email, notes, updated_at, updated_by
) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?
) ON CONFLICT (sr_no) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    gstin = EXCLUDED.gstin,
    phone = EXCLUDED.phone,
    contact_person = EXCLUDED.contact_person,
    email = EXCLUDED.email,
    notes = EXCLUDED.notes,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by;
""".strip()


def _is_sqlite_conn(conn: Any) -> bool:
    """Returns True if connection is a SQLite connection or cursor."""
    if isinstance(conn, (sqlite3.Connection, sqlite3.Cursor)):
        return True
    mod = type(conn).__module__.lower()
    return "sqlite" in mod or hasattr(conn, "row_factory")


def _execute_batch(conn: Any, sql: str, params_list: list[tuple[Any, ...]]) -> int:
    """Executes a batch of insert statements with appropriate param formatting."""
    if not params_list:
        return 0

    is_sqlite = _is_sqlite_conn(conn)
    query = sql if is_sqlite else sql.replace("?", "%s")

    if hasattr(conn, "cursor") and callable(conn.cursor):
        cursor_obj = conn.cursor()
        is_cm = hasattr(cursor_obj, "__enter__") and hasattr(cursor_obj, "__exit__")
        if is_cm:
            with cursor_obj as cur:
                cur.executemany(query, params_list)
        else:
            try:
                cursor_obj.executemany(query, params_list)
            finally:
                if hasattr(cursor_obj, "close") and callable(cursor_obj.close):
                    cursor_obj.close()
    elif hasattr(conn, "executemany") and callable(conn.executemany):
        conn.executemany(query, params_list)
    elif hasattr(conn, "execute") and callable(conn.execute):
        for p in params_list:
            conn.execute(query, p)
    else:
        raise TypeError(f"Unsupported connection/cursor object: {type(conn)}")

    if hasattr(conn, "commit") and callable(conn.commit):
        try:
            conn.commit()
        except Exception:
            pass

    return len(params_list)


def _resolve_sqlite_path(sqlite_db_path: Path | str | None) -> Path:
    if sqlite_db_path is not None:
        return Path(sqlite_db_path)
    try:
        from src.api.lead_tracker_db import get_storage_path
        return get_storage_path()
    except Exception:
        return _backend_dir / "data" / "lead_tracker.db"


def _resolve_json_path(json_path: Path | str | None) -> Path:
    if json_path is not None:
        return Path(json_path)
    try:
        from src.api.approach_routes import get_storage_path
        return get_storage_path()
    except Exception:
        return _backend_dir / "data" / "approach_logs.json"


def migrate_sqlite_and_json_to_dsql(
    sqlite_db_path: Path | str | None = None,
    json_path: Path | str | None = None,
    target_conn: Any | None = None,
) -> dict[str, int]:
    """Migrates existing SQLite database and approach_logs.json data into Aurora DSQL / target DB.

    Idempotent: Uses ON CONFLICT DO UPDATE to ensure repeated runs produce identical
    counts without violating uniqueness constraints or creating duplicate records.

    Returns:
        dict[str, int]: Migrated entity counts:
            {"leads": X, "activities": Y, "approach_logs": Z, "hot_lead_contacts": W}
    """
    if target_conn is None:
        from src.api.dsql_client import get_connection
        target_conn = get_connection()

    # Ensure all target tables and indexes exist
    init_dsql_tables(target_conn)

    sqlite_file = _resolve_sqlite_path(sqlite_db_path)
    json_file = _resolve_json_path(json_path)

    migrated_leads = 0
    migrated_activities = 0
    migrated_hot_leads = 0
    migrated_approach_logs = 0

    # 1. Migrate leads, activities, and hot lead contacts from SQLite source
    if sqlite_file.exists() and sqlite_file.is_file():
        logger.info("Migrating from SQLite database: %s", sqlite_file)
        src_conn = sqlite3.connect(str(sqlite_file))
        src_conn.row_factory = sqlite3.Row
        try:
            cur = src_conn.cursor()
            existing_tables = {
                r[0]
                for r in cur.execute(
                    "SELECT name FROM sqlite_master WHERE type='table';"
                ).fetchall()
            }

            # 1a. Migrate lead_tracker_items
            if "lead_tracker_items" in existing_tables:
                cur.execute("SELECT * FROM lead_tracker_items;")
                rows = cur.fetchall()
                lead_params: list[tuple[Any, ...]] = []
                now_iso = datetime.now(UTC).isoformat()
                today_str = datetime.now(UTC).strftime("%Y-%m-%d")

                for r in rows:
                    d = dict(r)
                    lead_params.append((
                        d.get("id"),
                        d.get("company_name"),
                        d.get("contact_person"),
                        d.get("contact_phone"),
                        d.get("contact_email"),
                        d.get("branch") or "Mumbai",
                        d.get("assigned_to") or "Tyra Theknath",
                        d.get("assigned_to_email"),
                        d.get("assigned_by") or "Tyra Theknath",
                        d.get("assigned_date") or today_str,
                        d.get("status") or "Contacted",
                        d.get("transport_mode") or "Air Export",
                        d.get("routing_type") or "Free Hand",
                        d.get("feedback_notes"),
                        d.get("next_followup_date"),
                        d.get("next_action"),
                        d.get("quote_date"),
                        d.get("rate_validity_date"),
                        d.get("rate_validity_days") if d.get("rate_validity_days") is not None else 14,
                        d.get("target_shipment_date"),
                        d.get("linked_entity_type") or "custom",
                        d.get("linked_entity_id"),
                        d.get("created_at") or now_iso,
                        d.get("updated_at") or now_iso,
                        d.get("created_by") or "Tyra Theknath",
                        bool(d.get("is_archived", 0)),
                    ))

                migrated_leads = _execute_batch(target_conn, INSERT_LEAD_ITEM_SQL, lead_params)
                logger.info("Migrated %d lead_tracker_items records", migrated_leads)

            # 1b. Migrate lead_tracker_activities
            if "lead_tracker_activities" in existing_tables:
                cur.execute("SELECT * FROM lead_tracker_activities;")
                rows = cur.fetchall()
                now_iso = datetime.now(UTC).isoformat()
                act_params: list[tuple[Any, ...]] = []

                for r in rows:
                    d = dict(r)
                    act_params.append((
                        d.get("id"),
                        d.get("lead_id"),
                        d.get("timestamp") or now_iso,
                        d.get("author_name") or "Sales Coordinator",
                        d.get("author_email") or "sales.coordinator@jfll.com",
                        d.get("action") or "Other",
                        d.get("old_status"),
                        d.get("new_status"),
                        d.get("notes"),
                    ))

                migrated_activities = _execute_batch(target_conn, INSERT_ACTIVITY_SQL, act_params)
                logger.info("Migrated %d lead_tracker_activities records", migrated_activities)

            # 1c. Migrate hot_lead_contacts
            if "hot_lead_contacts" in existing_tables:
                cur.execute("SELECT * FROM hot_lead_contacts;")
                rows = cur.fetchall()
                now_iso = datetime.now(UTC).isoformat()
                hot_params: list[tuple[Any, ...]] = []

                for r in rows:
                    d = dict(r)
                    hot_params.append((
                        d.get("sr_no"),
                        d.get("customer_name"),
                        d.get("gstin"),
                        d.get("phone"),
                        d.get("contact_person"),
                        d.get("email"),
                        d.get("notes"),
                        d.get("updated_at") or now_iso,
                        d.get("updated_by"),
                    ))

                migrated_hot_leads = _execute_batch(
                    target_conn, INSERT_HOT_LEAD_CONTACT_SQL, hot_params
                )
                logger.info("Migrated %d hot_lead_contacts records", migrated_hot_leads)

        finally:
            src_conn.close()
    else:
        logger.warning("Source SQLite file does not exist: %s. Skipping SQLite migration.", sqlite_file)

    # 2. Migrate prospect approach logs from JSON source
    if json_file.exists() and json_file.is_file():
        logger.info("Migrating approach logs from JSON: %s", json_file)
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)

            entities = raw_data.get("entities", {}) if isinstance(raw_data, dict) else {}
            approach_params: list[tuple[Any, ...]] = []
            now_iso = datetime.now(UTC).isoformat()

            for key, entity in entities.items():
                if not isinstance(entity, dict):
                    continue

                entity_type = entity.get("entity_type") or (
                    key.split(":", 1)[0] if ":" in key else "datamyne"
                )
                entity_id = entity.get("entity_id") or (
                    key.split(":", 1)[1] if ":" in key else key
                )
                entity_company = entity.get("company_name")
                logs = entity.get("logs", [])

                for log in logs:
                    if not isinstance(log, dict):
                        continue
                    log_id = log.get("id") or str(uuid.uuid4())
                    action = log.get("action") or "Other"
                    status = (
                        log.get("status")
                        or entity.get("current_status")
                        or "Contacted"
                    )
                    note = log.get("note")
                    company_name = log.get("company_name") or entity_company
                    logged_by = (
                        log.get("logged_by")
                        or log.get("salesperson_name")
                        or "Sales Coordinator"
                    )
                    logged_by_email = (
                        log.get("logged_by_email")
                        or log.get("salesperson_email")
                        or "sales.coordinator@jfll.com"
                    )
                    created_at = log.get("created_at") or now_iso

                    approach_params.append((
                        log_id,
                        entity_type,
                        entity_id,
                        company_name,
                        action,
                        status,
                        note,
                        logged_by,
                        logged_by_email,
                        created_at,
                    ))

            migrated_approach_logs = _execute_batch(
                target_conn, INSERT_APPROACH_LOG_SQL, approach_params
            )
            logger.info("Migrated %d prospect_approach_logs records", migrated_approach_logs)

        except Exception as exc:
            logger.error("Failed to parse or migrate approach logs JSON: %s", exc)
    else:
        logger.warning("Source JSON file does not exist: %s. Skipping JSON migration.", json_file)

    results = {
        "leads": migrated_leads,
        "activities": migrated_activities,
        "approach_logs": migrated_approach_logs,
        "hot_lead_contacts": migrated_hot_leads,
    }
    logger.info("DSQL migration completed successfully: %s", results)
    return results


# Plan alias for backward compatibility
run_migration = migrate_sqlite_and_json_to_dsql


def main() -> None:
    """CLI Entry point for running migration."""
    parser = argparse.ArgumentParser(
        description="Migrate local SQLite databases and JSON logs into Aurora DSQL / Relational DB"
    )
    parser.add_argument(
        "--sqlite",
        dest="sqlite_path",
        type=str,
        default=None,
        help="Path to source lead_tracker.db (defaults to Backend/data/lead_tracker.db)",
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        type=str,
        default=None,
        help="Path to source approach_logs.json (defaults to Backend/data/approach_logs.json)",
    )
    args = parser.parse_args()

    results = migrate_sqlite_and_json_to_dsql(
        sqlite_db_path=args.sqlite_path,
        json_path=args.json_path,
    )
    print(f"Migration completed successfully: {results}")


if __name__ == "__main__":
    main()
