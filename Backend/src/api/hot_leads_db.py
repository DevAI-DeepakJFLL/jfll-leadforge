"""SQLite persistence layer for Hot Leads contact enrichments and updates.

Persists sales coordinator contact additions (phone numbers, contact persons, emails)
directly to the persistent SQLite database, ensuring changes are durable, ACID-compliant,
and shared across all coordinators without relying on browser local storage.
"""

import logging
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from src.api.lead_tracker_db import _DB_LOCK, get_db_connection

logger = logging.getLogger(__name__)


def init_hot_leads_db(db_path: Path | str | None = None) -> None:
    """Initializes the hot_lead_contacts table and associated index."""
    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS hot_lead_contacts (
                        sr_no INTEGER PRIMARY KEY,
                        customer_name TEXT,
                        gstin TEXT,
                        phone TEXT,
                        contact_person TEXT,
                        email TEXT,
                        notes TEXT,
                        updated_at TEXT NOT NULL,
                        updated_by TEXT
                    );
                """)
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hot_lead_contacts_sr_no
                    ON hot_lead_contacts(sr_no);
                """)
        finally:
            conn.close()


def get_all_hot_lead_contacts(db_path: Path | str | None = None) -> dict[int, dict[str, Any]]:
    """Returns all hot lead contact overrides indexed by sr_no."""
    init_hot_leads_db(db_path)
    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            cursor = conn.execute("""
                SELECT sr_no, customer_name, gstin, phone, contact_person, email, notes, updated_at, updated_by
                FROM hot_lead_contacts
            """)
            results: dict[int, dict[str, Any]] = {}
            for row in cursor.fetchall():
                results[row["sr_no"]] = {
                    "sr_no": row["sr_no"],
                    "customer_name": row["customer_name"],
                    "gstin": row["gstin"],
                    "phone": row["phone"],
                    "contact_person": row["contact_person"],
                    "email": row["email"],
                    "notes": row["notes"],
                    "updated_at": row["updated_at"],
                    "updated_by": row["updated_by"],
                }
            return results
        finally:
            conn.close()


def get_hot_lead_contact(sr_no: int, db_path: Path | str | None = None) -> dict[str, Any] | None:
    """Returns contact details for a specific hot lead by sr_no."""
    init_hot_leads_db(db_path)
    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            cursor = conn.execute(
                """
                SELECT sr_no, customer_name, gstin, phone, contact_person, email, notes, updated_at, updated_by
                FROM hot_lead_contacts
                WHERE sr_no = ?
                """,
                (sr_no,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "sr_no": row["sr_no"],
                "customer_name": row["customer_name"],
                "gstin": row["gstin"],
                "phone": row["phone"],
                "contact_person": row["contact_person"],
                "email": row["email"],
                "notes": row["notes"],
                "updated_at": row["updated_at"],
                "updated_by": row["updated_by"],
            }
        finally:
            conn.close()


def upsert_hot_lead_contact(
    sr_no: int,
    phone: str | None = None,
    contact_person: str | None = None,
    email: str | None = None,
    notes: str | None = None,
    customer_name: str | None = None,
    gstin: str | None = None,
    updated_by: str | None = None,
    db_path: Path | str | None = None,
) -> dict[str, Any]:
    """Upserts hot lead contact information into SQLite.

    If a field is provided as a non-empty string, it updates the record.
    If existing record exists, preserves unmentioned fields.
    """
    init_hot_leads_db(db_path)
    now_iso = datetime.now(UTC).isoformat()
    clean_phone = phone.strip() if phone is not None else None
    clean_person = contact_person.strip() if contact_person is not None else None
    clean_email = email.strip() if email is not None else None
    clean_notes = notes.strip() if notes is not None else None
    effective_updater = (updated_by or "").strip() or "Sales Coordinator"

    with _DB_LOCK:
        conn = get_db_connection(db_path)
        try:
            with conn:
                # Check existing
                cursor = conn.execute(
                    "SELECT sr_no, customer_name, gstin, phone, contact_person, email, notes FROM hot_lead_contacts WHERE sr_no = ?",
                    (sr_no,),
                )
                existing = cursor.fetchone()

                if existing:
                    final_customer = customer_name or existing["customer_name"]
                    final_gstin = gstin or existing["gstin"]
                    final_phone = clean_phone if phone is not None else existing["phone"]
                    final_person = clean_person if contact_person is not None else existing["contact_person"]
                    final_email = clean_email if email is not None else existing["email"]
                    final_notes = clean_notes if notes is not None else existing["notes"]

                    conn.execute(
                        """
                        UPDATE hot_lead_contacts
                        SET customer_name = ?,
                            gstin = ?,
                            phone = ?,
                            contact_person = ?,
                            email = ?,
                            notes = ?,
                            updated_at = ?,
                            updated_by = ?
                        WHERE sr_no = ?
                        """,
                        (
                            final_customer,
                            final_gstin,
                            final_phone,
                            final_person,
                            final_email,
                            final_notes,
                            now_iso,
                            effective_updater,
                            sr_no,
                        ),
                    )
                else:
                    final_customer = customer_name
                    final_gstin = gstin
                    final_phone = clean_phone
                    final_person = clean_person
                    final_email = clean_email
                    final_notes = clean_notes

                    conn.execute(
                        """
                        INSERT INTO hot_lead_contacts (
                            sr_no, customer_name, gstin, phone, contact_person, email, notes, updated_at, updated_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            sr_no,
                            final_customer,
                            final_gstin,
                            final_phone,
                            final_person,
                            final_email,
                            final_notes,
                            now_iso,
                            effective_updater,
                        ),
                    )

            return {
                "sr_no": sr_no,
                "customer_name": final_customer,
                "gstin": final_gstin,
                "phone": final_phone,
                "contact_person": final_person,
                "email": final_email,
                "notes": final_notes,
                "updated_at": now_iso,
                "updated_by": effective_updater,
            }
        finally:
            conn.close()
