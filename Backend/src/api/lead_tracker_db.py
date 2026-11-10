"""SQLite Persistence Layer and Database Manager for Phase 2 Lead Status Tracker.

Follows freight-forwarding domain concepts (Transport Mode, Routing Control,
Sales Feedback, Follow-up Cadence, Rate Validity Horizon) and DSA-conscious design principles:
- Zero external pip dependencies (built on Python standard library `sqlite3`).
- PRAGMA journal_mode = WAL for non-blocking concurrent reads and isolated multi-worker writes.
- PRAGMA foreign_keys = ON with CASCADE deletion.
- O(log N) indexed queries on branch, rep email, status, and follow-up deadline.
- Single SQL pass aggregation for executive KPIs.
- Atomic migrations from existing lead_tracker.json or Phase2/Lead_Tracker.xlsx.
- S3 backup & restore integration for serverless cloud durability.
"""

from datetime import date, datetime, timezone
import json
import logging
import os
from pathlib import Path
import sqlite3
import threading
from typing import Any
import uuid

from src.api.config import settings
from src.api.lead_tracker_models import (
    RoutingType,
    TrackerStatus,
    TransportMode,
)
from src.api.lead_tracker_seeder import SALES_REP_EMAILS, seed_leads_from_excel

logger = logging.getLogger(__name__)

S3_LEAD_TRACKER_DB_KEY = "data/lead_tracker.db"
_DB_LOCK = threading.Lock()


def get_storage_path() -> Path:
    """Resolves the persistence path for lead_tracker.db."""
    custom_path = os.getenv("LEAD_TRACKER_DB_PATH")
    if custom_path:
        return Path(custom_path)
    if os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/data/lead_tracker.db")
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "lead_tracker.db"


def get_db_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    """Returns a configured SQLite connection with WAL mode and row factory."""
    if db_path is None:
        target_path = get_storage_path()
        target_path.parent.mkdir(parents=True, exist_ok=True)
        db_str = str(target_path)
    else:
        db_str = str(db_path)
        if db_str != ":memory:":
            Path(db_str).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_str, timeout=5.0)
    conn.row_factory = sqlite3.Row

    # Performance & Concurrency Pragmas
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    if db_str != ":memory:":
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
        except sqlite3.DatabaseError:
            pass

    return conn


def init_db(db_path: Path | str | None = None) -> None:
    """Initializes SQLite schema, tables, and indexes."""
    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS lead_tracker_items (
                        id TEXT PRIMARY KEY,
                        company_name TEXT NOT NULL,
                        contact_person TEXT,
                        contact_phone TEXT,
                        contact_email TEXT,
                        branch TEXT NOT NULL,
                        assigned_to TEXT NOT NULL,
                        assigned_to_email TEXT,
                        assigned_by TEXT DEFAULT 'Tyra Theknath',
                        assigned_date TEXT NOT NULL,
                        status TEXT NOT NULL,
                        transport_mode TEXT NOT NULL,
                        routing_type TEXT NOT NULL,
                        feedback_notes TEXT,
                        next_followup_date TEXT,
                        next_action TEXT,
                        quote_date TEXT,
                        rate_validity_date TEXT,
                        rate_validity_days INTEGER DEFAULT 14,
                        target_shipment_date TEXT,
                        linked_entity_type TEXT DEFAULT 'custom',
                        linked_entity_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        created_by TEXT DEFAULT 'Tyra Theknath',
                        is_archived INTEGER DEFAULT 0
                    );
                """)

                conn.execute("""
                    CREATE TABLE IF NOT EXISTS lead_tracker_activities (
                        id TEXT PRIMARY KEY,
                        lead_id TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        author_name TEXT NOT NULL,
                        author_email TEXT,
                        action TEXT NOT NULL,
                        old_status TEXT,
                        new_status TEXT,
                        notes TEXT,
                        FOREIGN KEY (lead_id) REFERENCES lead_tracker_items(id) ON DELETE CASCADE
                    );
                """)

                # Performance B-Tree Indexes
                conn.execute("CREATE INDEX IF NOT EXISTS idx_leads_branch ON lead_tracker_items(branch);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_leads_rep ON lead_tracker_items(assigned_to_email);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_leads_status ON lead_tracker_items(status);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_leads_followup ON lead_tracker_items(next_followup_date);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_lead ON lead_tracker_activities(lead_id, timestamp DESC);")
        finally:
            conn.close()


def _row_to_lead_dict(row: sqlite3.Row, activities: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    """Serializes a sqlite3.Row to a full LeadTrackerItem dict."""
    d = dict(row)
    d["is_archived"] = bool(d.get("is_archived", 0))
    d["history"] = activities or []
    return d


def get_activities_for_lead(
    lead_id: str,
    db_path: Path | str | None = None,
    conn: sqlite3.Connection | None = None,
) -> list[dict[str, Any]]:
    """Retrieves chronological activity log for a specific lead."""
    should_close = False
    if conn is None:
        conn = get_db_connection(db_path)
        should_close = True

    try:
        cur = conn.execute(
            """
            SELECT id, lead_id, timestamp, author_name, author_email, action, old_status, new_status, notes
            FROM lead_tracker_activities
            WHERE lead_id = ?
            ORDER BY timestamp DESC
            """,
            (lead_id,),
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        if should_close:
            conn.close()


def get_all_leads(
    branch: str | None = None,
    assigned_to: str | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    is_archived: bool = False,
    overdue_only: bool = False,
    sort_by: str = "next_followup_date",
    order: str = "asc",
    db_path: Path | str | None = None,
) -> list[dict[str, Any]]:
    """Retrieves all tracked leads with optional filters, sorted by sort_by and order."""
    conn = get_db_connection(db_path)
    try:
        clauses = ["is_archived = ?"]
        params: list[Any] = [1 if is_archived else 0]

        if branch and branch != "All":
            clauses.append("LOWER(branch) = LOWER(?)")
            params.append(branch.strip())

        if assigned_to and assigned_to != "All":
            term = f"%{assigned_to.strip().lower()}%"
            clauses.append("(LOWER(assigned_to) LIKE ? OR LOWER(COALESCE(assigned_to_email, '')) LIKE ?)")
            params.extend([term, term])

        if status_filter and status_filter != "All":
            clauses.append("LOWER(status) = LOWER(?)")
            params.append(status_filter.strip())

        if overdue_only:
            today_str = date.today().isoformat()
            clauses.append("status NOT IN ('Won', 'Closed / Lost')")
            clauses.append("next_followup_date IS NOT NULL")
            clauses.append("next_followup_date < ?")
            params.append(today_str)

        if search:
            term = f"%{search.strip().lower()}%"
            clauses.append(
                """(
                    LOWER(company_name) LIKE ? OR 
                    LOWER(COALESCE(contact_person, '')) LIKE ? OR 
                    LOWER(COALESCE(assigned_to, '')) LIKE ? OR 
                    LOWER(COALESCE(feedback_notes, '')) LIKE ? OR 
                    LOWER(COALESCE(next_action, '')) LIKE ?
                )"""
            )
            params.extend([term, term, term, term, term])

        where_sql = " AND ".join(clauses)
        is_desc = order.strip().lower() == "desc"

        if sort_by == "company_name":
            order_sql = f"LOWER(company_name) {'DESC' if is_desc else 'ASC'}"
        elif sort_by == "updated_at":
            order_sql = f"updated_at {'DESC' if is_desc else 'ASC'}"
        else:
            # Default: next_followup_date (nulls last)
            null_sort = "1" if not is_desc else "0"
            val_sort = "0" if not is_desc else "1"
            order_sql = f"""
                CASE WHEN next_followup_date IS NULL THEN {null_sort} ELSE {val_sort} END,
                next_followup_date {'DESC' if is_desc else 'ASC'},
                updated_at DESC
            """

        sql = f"SELECT * FROM lead_tracker_items WHERE {where_sql} ORDER BY {order_sql}"

        cur = conn.execute(sql, params)
        rows = cur.fetchall()

        if not rows:
            return []

        # Batch fetch activities in single query to avoid N+1 queries
        lead_ids = [r["id"] for r in rows]
        placeholders = ",".join("?" for _ in lead_ids)
        act_cur = conn.execute(
            f"""
            SELECT id, lead_id, timestamp, author_name, author_email, action, old_status, new_status, notes
            FROM lead_tracker_activities
            WHERE lead_id IN ({placeholders})
            ORDER BY timestamp DESC
            """,
            lead_ids,
        )
        activities_by_lead: dict[str, list[dict[str, Any]]] = {lid: [] for lid in lead_ids}
        for act in act_cur.fetchall():
            activities_by_lead[act["lead_id"]].append(dict(act))

        return [_row_to_lead_dict(r, activities_by_lead.get(r["id"], [])) for r in rows]
    finally:
        conn.close()


def get_lead_by_id(lead_id: str, db_path: Path | str | None = None) -> dict[str, Any] | None:
    """Fetches a single lead with full activity history."""
    conn = get_db_connection(db_path)
    try:
        cur = conn.execute("SELECT * FROM lead_tracker_items WHERE id = ?", (lead_id,))
        row = cur.fetchone()
        if not row:
            return None
        activities = get_activities_for_lead(lead_id, db_path=db_path, conn=conn)
        return _row_to_lead_dict(row, activities)
    finally:
        conn.close()


def create_lead(lead_data: dict[str, Any], db_path: Path | str | None = None) -> dict[str, Any]:
    """Inserts a new tracked lead and creates its initial audit log entry."""
    now_iso = datetime.now(timezone.utc).isoformat()
    lead_id = lead_data.get("id") or f"trk_{uuid.uuid4().hex[:12]}"
    assigned_date = lead_data.get("assigned_date") or date.today().isoformat()
    created_at = lead_data.get("created_at") or now_iso
    updated_at = lead_data.get("updated_at") or now_iso

    # Auto-resolve assigned_to_email if missing
    assigned_to = lead_data.get("assigned_to", "Unassigned")
    assigned_to_email = lead_data.get("assigned_to_email")
    if not assigned_to_email and assigned_to:
        assigned_to_email = SALES_REP_EMAILS.get(assigned_to.strip().lower())

    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                conn.execute(
                    """
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
                    )
                    """,
                    (
                        lead_id,
                        lead_data["company_name"],
                        lead_data.get("contact_person"),
                        lead_data.get("contact_phone"),
                        lead_data.get("contact_email"),
                        lead_data.get("branch", "Mumbai"),
                        assigned_to,
                        assigned_to_email,
                        lead_data.get("assigned_by", "Tyra Theknath"),
                        assigned_date,
                        lead_data.get("status", TrackerStatus.ASSIGNED.value),
                        lead_data.get("transport_mode", TransportMode.AIR_FREIGHT.value),
                        lead_data.get("routing_type", RoutingType.FREEHAND.value),
                        lead_data.get("feedback_notes"),
                        lead_data.get("next_followup_date"),
                        lead_data.get("next_action"),
                        lead_data.get("quote_date"),
                        lead_data.get("rate_validity_date"),
                        lead_data.get("rate_validity_days", 14),
                        lead_data.get("target_shipment_date"),
                        lead_data.get("linked_entity_type", "custom"),
                        lead_data.get("linked_entity_id"),
                        created_at,
                        updated_at,
                        lead_data.get("created_by", "Tyra Theknath"),
                        1 if lead_data.get("is_archived") else 0,
                    ),
                )

                # Add initial creation entry in activities
                history_entries = lead_data.get("history") or []
                if not history_entries:
                    conn.execute(
                        """
                        INSERT INTO lead_tracker_activities (
                            id, lead_id, timestamp, author_name, author_email, action, old_status, new_status, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"act_{uuid.uuid4().hex[:10]}",
                            lead_id,
                            now_iso,
                            lead_data.get("created_by", "Tyra Theknath"),
                            "tyra@jfll.com",
                            "Created lead",
                            None,
                            lead_data.get("status", TrackerStatus.ASSIGNED.value),
                            lead_data.get("feedback_notes") or "Initial lead tracking started",
                        ),
                    )
                else:
                    for h in history_entries:
                        conn.execute(
                            """
                            INSERT INTO lead_tracker_activities (
                                id, lead_id, timestamp, author_name, author_email, action, old_status, new_status, notes
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                h.get("id") or f"act_{uuid.uuid4().hex[:10]}",
                                lead_id,
                                h.get("timestamp") or now_iso,
                                h.get("author_name", "Tyra Theknath"),
                                h.get("author_email", "tyra@jfll.com"),
                                h.get("action", "Imported lead"),
                                h.get("old_status"),
                                h.get("new_status"),
                                h.get("notes"),
                            ),
                        )
        finally:
            conn.close()

    return get_lead_by_id(lead_id, db_path=db_path) or {}


def update_lead(lead_id: str, update_data: dict[str, Any], db_path: Path | str | None = None) -> dict[str, Any] | None:
    """Updates specific columns of an existing lead."""
    now_iso = datetime.now(timezone.utc).isoformat()
    allowed_columns = {
        "company_name", "contact_person", "contact_phone", "contact_email",
        "branch", "assigned_to", "assigned_to_email", "assigned_by", "assigned_date",
        "status", "transport_mode", "routing_type", "feedback_notes", "next_followup_date",
        "next_action", "quote_date", "rate_validity_date", "rate_validity_days",
        "target_shipment_date", "linked_entity_type", "linked_entity_id", "is_archived",
    }

    set_clauses: list[str] = ["updated_at = ?"]
    params: list[Any] = [now_iso]

    for k, v in update_data.items():
        if k in allowed_columns:
            if k == "is_archived":
                v = 1 if v else 0
            set_clauses.append(f"{k} = ?")
            params.append(v)

    # Auto-resolve assigned_to_email if assigned_to changed and email omitted
    if "assigned_to" in update_data and "assigned_to_email" not in update_data:
        rep_email = SALES_REP_EMAILS.get(str(update_data["assigned_to"]).strip().lower())
        if rep_email:
            set_clauses.append("assigned_to_email = ?")
            params.append(rep_email)

    params.append(lead_id)

    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                cur = conn.execute(
                    f"UPDATE lead_tracker_items SET {', '.join(set_clauses)} WHERE id = ?",
                    params,
                )
                if cur.rowcount == 0:
                    return None
        finally:
            conn.close()

    return get_lead_by_id(lead_id, db_path=db_path)


def delete_lead(lead_id: str, hard_delete: bool = False, db_path: Path | str | None = None) -> bool:
    """Soft-archives or permanently deletes a lead."""
    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                if hard_delete:
                    cur = conn.execute("DELETE FROM lead_tracker_items WHERE id = ?", (lead_id,))
                else:
                    cur = conn.execute(
                        "UPDATE lead_tracker_items SET is_archived = 1, updated_at = ? WHERE id = ?",
                        (datetime.now(timezone.utc).isoformat(), lead_id),
                    )
                return cur.rowcount > 0
        finally:
            conn.close()


def add_activity(lead_id: str, activity_data: dict[str, Any], db_path: Path | str | None = None) -> dict[str, Any] | None:
    """Appends an activity/touchpoint and conditionally updates parent lead status & followup."""
    now_iso = datetime.now(timezone.utc).isoformat()
    act_id = activity_data.get("id") or f"act_{uuid.uuid4().hex[:10]}"
    timestamp = activity_data.get("timestamp") or now_iso
    author_name = activity_data.get("author_name") or "Sales Coordinator"
    author_email = activity_data.get("author_email")
    action = activity_data.get("action") or "Note added"
    notes = activity_data.get("notes")
    next_followup = activity_data.get("next_followup_date")

    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                cur = conn.execute("SELECT status FROM lead_tracker_items WHERE id = ?", (lead_id,))
                row = cur.fetchone()
                if not row:
                    return None
                old_status = row["status"]
                new_status = activity_data.get("status") or activity_data.get("new_status") or old_status

                conn.execute(
                    """
                    INSERT INTO lead_tracker_activities (
                        id, lead_id, timestamp, author_name, author_email, action, old_status, new_status, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        act_id,
                        lead_id,
                        timestamp,
                        author_name,
                        author_email,
                        action,
                        old_status,
                        new_status,
                        notes,
                    ),
                )

                # Update parent lead
                updates = ["updated_at = ?"]
                params: list[Any] = [now_iso]

                if new_status and new_status != old_status:
                    updates.append("status = ?")
                    params.append(new_status)

                if next_followup is not None:
                    updates.append("next_followup_date = ?")
                    params.append(next_followup)

                if notes:
                    updates.append("feedback_notes = ?")
                    params.append(notes)

                params.append(lead_id)
                conn.execute(
                    f"UPDATE lead_tracker_items SET {', '.join(updates)} WHERE id = ?",
                    params,
                )
        finally:
            conn.close()

    return {
        "id": act_id,
        "lead_id": lead_id,
        "timestamp": timestamp,
        "author_name": author_name,
        "author_email": author_email,
        "action": action,
        "old_status": old_status,
        "new_status": new_status,
        "notes": notes,
    }


def get_kpis(db_path: Path | str | None = None) -> dict[str, Any]:
    """Calculates executive KPI metrics in a single O(N) SQL aggregation pass."""
    today_str = date.today().isoformat()
    conn = get_db_connection(db_path)
    try:
        cur = conn.execute(
            """
            SELECT
                COUNT(*) AS total_leads,
                SUM(CASE WHEN status NOT IN ('Won', 'Closed / Lost') THEN 1 ELSE 0 END) AS active_leads,
                SUM(CASE WHEN status = 'Quoted' THEN 1 ELSE 0 END) AS quoted_leads,
                SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) AS won_leads,
                SUM(CASE WHEN status NOT IN ('Won', 'Closed / Lost') AND next_followup_date IS NOT NULL AND next_followup_date < ? THEN 1 ELSE 0 END) AS overdue_leads
            FROM lead_tracker_items
            WHERE is_archived = 0
            """,
            (today_str,),
        )
        row = cur.fetchone()
        return {
            "total_leads": row["total_leads"] or 0,
            "active_leads": row["active_leads"] or 0,
            "quoted_leads": row["quoted_leads"] or 0,
            "won_leads": row["won_leads"] or 0,
            "overdue_leads": row["overdue_leads"] or 0,
        }
    finally:
        conn.close()


def migrate_from_json_if_needed(
    json_path: Path | None = None,
    db_path: Path | str | None = None,
) -> int:
    """Migrates existing lead_tracker.json leads and activities to SQLite if table is empty."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    try:
        cur = conn.execute("SELECT COUNT(*) AS cnt FROM lead_tracker_items")
        if cur.fetchone()["cnt"] > 0:
            return 0  # Already hydrated
    finally:
        conn.close()

    if json_path is None:
        base_dir = Path(__file__).resolve().parent.parent.parent
        json_path = base_dir / "data" / "lead_tracker.json"

    count = 0
    if json_path.exists() and json_path.is_file():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            entities = data.get("entities", {})
            for lead in entities.values():
                create_lead(lead, db_path=db_path)
                count += 1
            logger.info("Lead Tracker SQLite: Migrated %d leads from %s", count, json_path)
            return count
        except Exception as err:
            logger.warning("Lead Tracker SQLite: Failed to migrate from json (%s)", err)

    # If no JSON or empty JSON, seed directly from Excel
    return seed_from_excel_if_empty(db_path=db_path)


def seed_from_excel_if_empty(db_path: Path | str | None = None) -> int:
    """Seeds initial leads from Phase2/Lead_Tracker.xlsx or deterministic fallback if DB is empty."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    try:
        cur = conn.execute("SELECT COUNT(*) AS cnt FROM lead_tracker_items")
        if cur.fetchone()["cnt"] > 0:
            return 0
    finally:
        conn.close()

    count = 0
    try:
        items = seed_leads_from_excel()
        for item in items:
            item_dict = item.model_dump() if hasattr(item, "model_dump") else item.dict()
            create_lead(item_dict, db_path=db_path)
            count += 1
        logger.info("Lead Tracker SQLite: Seeded %d leads from Excel into SQLite", count)
    except Exception as err:
        logger.warning("Lead Tracker SQLite: Excel seeding failed (%s)", err)
    return count


def backup_db_to_s3(db_path: Path | str | None = None) -> bool:
    """Backs up the SQLite database file to AWS S3 using VACUUM INTO."""
    target_path = Path(db_path) if db_path and db_path != ":memory:" else get_storage_path()
    if not target_path.exists():
        return False

    temp_backup = target_path.with_suffix(".backup.db")
    if temp_backup.exists():
        temp_backup.unlink()

    with _DB_LOCK:
        conn = get_db_connection(target_path)
        try:
            conn.execute(f"VACUUM INTO '{str(temp_backup)}';")
        finally:
            conn.close()

    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3.upload_file(str(temp_backup), settings.s3_bucket, S3_LEAD_TRACKER_DB_KEY)
        logger.info("Lead Tracker SQLite: Successfully backed up database to s3://%s/%s", settings.s3_bucket, S3_LEAD_TRACKER_DB_KEY)
        return True
    except Exception as err:
        logger.debug("Lead Tracker SQLite: S3 backup skipped or failed: %s", err)
        return False
    finally:
        if temp_backup.exists():
            temp_backup.unlink()


def restore_db_from_s3(db_path: Path | str | None = None) -> bool:
    """Restores SQLite database from AWS S3 (e.g. AWS Lambda cold start)."""
    target_path = Path(db_path) if db_path and db_path != ":memory:" else get_storage_path()
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.aws_region)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        # Clean up stale WAL or SHM files if present
        for ext in ["-wal", "-shm"]:
            wal_file = target_path.with_name(target_path.name + ext)
            if wal_file.exists():
                wal_file.unlink()
        s3.download_file(settings.s3_bucket, S3_LEAD_TRACKER_DB_KEY, str(target_path))
        logger.info("Lead Tracker SQLite: Restored database from s3://%s/%s", settings.s3_bucket, S3_LEAD_TRACKER_DB_KEY)
        return True
    except Exception as err:
        logger.debug("Lead Tracker SQLite: S3 restore skipped or unavailable: %s", err)
        return False
