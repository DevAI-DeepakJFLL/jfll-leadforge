"""Unit tests for SQLite Persistence Layer (lead_tracker_db.py)."""

from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
from typing import Any

import pytest

from src.api.lead_tracker_db import (
    add_activity,
    create_lead,
    delete_lead,
    get_activities_for_lead,
    get_all_leads,
    get_db_connection,
    get_kpis,
    get_lead_by_id,
    init_db,
    migrate_from_json_if_needed,
    seed_from_excel_if_empty,
    update_lead,
)


@pytest.fixture
def temp_db(tmp_path: Path) -> Path:
    """Fixture providing a clean SQLite database in a temporary directory."""
    db_file = tmp_path / "test_tracker.db"
    init_db(db_file)
    return db_file


def test_init_db_creates_tables_and_indexes(temp_db: Path):
    """Verifies tables and B-Tree indexes are created correctly."""
    conn = get_db_connection(temp_db)
    try:
        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {r["name"] for r in cur.fetchall()}
        assert "lead_tracker_items" in tables
        assert "lead_tracker_activities" in tables

        cur = conn.execute("SELECT name FROM sqlite_master WHERE type='index';")
        indexes = {r["name"] for r in cur.fetchall()}
        assert "idx_leads_branch" in indexes
        assert "idx_leads_rep" in indexes
        assert "idx_leads_status" in indexes
        assert "idx_leads_followup" in indexes
        assert "idx_activities_lead" in indexes
    finally:
        conn.close()


def test_create_and_get_lead_by_id(temp_db: Path):
    """Verifies inserting a lead and reading it back by ID."""
    payload = {
        "company_name": "Royal Arc Electrodes",
        "branch": "Mumbai",
        "assigned_to": "Edward",
        "status": "Quoted",
        "transport_mode": "Ocean FCL",
        "routing_type": "Freehand",
        "feedback_notes": "Needs competitive 20ft rates for Nhava Sheva to Rotterdam.",
        "next_followup_date": "2026-11-20",
        "quote_date": "2026-11-10",
        "rate_validity_date": "2026-11-24",
        "rate_validity_days": 14,
    }
    lead = create_lead(payload, db_path=temp_db)
    assert lead["id"].startswith("trk_")
    assert lead["company_name"] == "Royal Arc Electrodes"
    assert lead["assigned_to_email"] == "edward@jfll.com"
    assert lead["status"] == "Quoted"
    assert lead["rate_validity_days"] == 14
    assert len(lead["history"]) >= 1

    fetched = get_lead_by_id(lead["id"], db_path=temp_db)
    assert fetched is not None
    assert fetched["id"] == lead["id"]
    assert fetched["company_name"] == "Royal Arc Electrodes"


def test_get_all_leads_filtering(temp_db: Path):
    """Verifies multi-field query filters (branch, status, assigned_to, search)."""
    create_lead({"company_name": "Alpha Pharma", "branch": "Mumbai", "assigned_to": "Edward", "status": "Contacted"}, db_path=temp_db)
    create_lead({"company_name": "Beta Chemicals", "branch": "Delhi", "assigned_to": "Tasneem", "status": "Quoted"}, db_path=temp_db)
    create_lead({"company_name": "Gamma Steel", "branch": "Mumbai", "assigned_to": "Tasneem", "status": "Won"}, db_path=temp_db)

    all_leads = get_all_leads(db_path=temp_db)
    assert len(all_leads) == 3

    mumbai_leads = get_all_leads(branch="Mumbai", db_path=temp_db)
    assert len(mumbai_leads) == 2

    edward_leads = get_all_leads(assigned_to="Edward", db_path=temp_db)
    assert len(edward_leads) == 1
    assert edward_leads[0]["company_name"] == "Alpha Pharma"

    quoted_leads = get_all_leads(status_filter="Quoted", db_path=temp_db)
    assert len(quoted_leads) == 1
    assert quoted_leads[0]["company_name"] == "Beta Chemicals"

    search_leads = get_all_leads(search="Chemicals", db_path=temp_db)
    assert len(search_leads) == 1
    assert search_leads[0]["company_name"] == "Beta Chemicals"


def test_overdue_filter(temp_db: Path):
    """Verifies overdue filter accurately isolates past followup dates."""
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    create_lead({"company_name": "Overdue Lead", "status": "Quoted", "next_followup_date": yesterday}, db_path=temp_db)
    create_lead({"company_name": "Future Lead", "status": "Quoted", "next_followup_date": tomorrow}, db_path=temp_db)
    create_lead({"company_name": "Won Overdue Lead", "status": "Won", "next_followup_date": yesterday}, db_path=temp_db)

    overdue = get_all_leads(overdue_only=True, db_path=temp_db)
    assert len(overdue) == 1
    assert overdue[0]["company_name"] == "Overdue Lead"


def test_update_lead(temp_db: Path):
    """Verifies updating existing lead attributes."""
    lead = create_lead({"company_name": "Test Co", "assigned_to": "Edward", "status": "Assigned"}, db_path=temp_db)
    updated = update_lead(
        lead["id"],
        {"status": "Quoted", "assigned_to": "Tasneem", "feedback_notes": "Rate sent via email"},
        db_path=temp_db,
    )
    assert updated is not None
    assert updated["status"] == "Quoted"
    assert updated["assigned_to"] == "Tasneem"
    assert updated["assigned_to_email"] == "tasneem@jfll.com"
    assert updated["feedback_notes"] == "Rate sent via email"


def test_delete_lead_soft_and_hard(temp_db: Path):
    """Verifies soft archive and hard cascade delete."""
    lead = create_lead({"company_name": "To Archive", "status": "Assigned"}, db_path=temp_db)
    lead_id = lead["id"]

    # Soft delete (archive)
    assert delete_lead(lead_id, hard_delete=False, db_path=temp_db) is True
    active_leads = get_all_leads(is_archived=False, db_path=temp_db)
    assert len(active_leads) == 0

    archived_leads = get_all_leads(is_archived=True, db_path=temp_db)
    assert len(archived_leads) == 1
    assert archived_leads[0]["id"] == lead_id

    # Hard delete (cascade deletes activities)
    assert delete_lead(lead_id, hard_delete=True, db_path=temp_db) is True
    assert get_lead_by_id(lead_id, db_path=temp_db) is None
    activities = get_activities_for_lead(lead_id, db_path=temp_db)
    assert len(activities) == 0


def test_add_activity_and_parent_update(temp_db: Path):
    """Verifies adding activity updates parent lead status and followup date."""
    lead = create_lead({"company_name": "Activity Test", "status": "Contacted"}, db_path=temp_db)
    next_week = (date.today() + timedelta(days=7)).isoformat()

    activity = add_activity(
        lead["id"],
        {
            "action": "Phone Call",
            "author_name": "Tyra",
            "author_email": "tyra@jfll.com",
            "status": "Quoted",
            "next_followup_date": next_week,
            "notes": "Spoke to purchase manager, requested Nhava Sheva FCL quote.",
        },
        db_path=temp_db,
    )
    assert activity is not None
    assert activity["action"] == "Phone Call"
    assert activity["old_status"] == "Contacted"
    assert activity["new_status"] == "Quoted"

    refreshed = get_lead_by_id(lead["id"], db_path=temp_db)
    assert refreshed["status"] == "Quoted"
    assert refreshed["next_followup_date"] == next_week
    assert refreshed["feedback_notes"] == "Spoke to purchase manager, requested Nhava Sheva FCL quote."
    assert len(refreshed["history"]) == 2  # initial create + new activity


def test_get_kpis_aggregation(temp_db: Path):
    """Verifies KPI calculations across active, quoted, won, and overdue leads."""
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    create_lead({"company_name": "L1", "status": "Assigned", "next_followup_date": yesterday}, db_path=temp_db) # active, overdue
    create_lead({"company_name": "L2", "status": "Quoted", "next_followup_date": tomorrow}, db_path=temp_db)   # active, quoted, not overdue
    create_lead({"company_name": "L3", "status": "Won", "next_followup_date": yesterday}, db_path=temp_db)      # won, not active, not overdue
    create_lead({"company_name": "L4", "status": "Closed / Lost"}, db_path=temp_db)                             # not active

    kpis = get_kpis(db_path=temp_db)
    assert kpis["total_leads"] == 4
    assert kpis["active_leads"] == 2
    assert kpis["quoted_leads"] == 1
    assert kpis["won_leads"] == 1
    assert kpis["overdue_leads"] == 1


def test_migrate_from_json(tmp_path: Path):
    """Verifies migrating existing json records into SQLite."""
    db_file = tmp_path / "migrated.db"
    json_file = tmp_path / "lead_tracker.json"

    sample_json = {
        "version": 1,
        "entities": {
            "trk_001": {
                "id": "trk_001",
                "company_name": "Clear Synth Labs",
                "branch": "Mumbai",
                "assigned_to": "Edward",
                "assigned_to_email": "edward@jfll.com",
                "status": "In Conversation",
                "transport_mode": "Courier / Express",
                "routing_type": "Freehand",
                "assigned_date": "2026-11-01",
                "feedback_notes": "Courier vendor contract under review",
                "history": [
                    {
                        "id": "act_001",
                        "timestamp": "2026-11-02T10:00:00Z",
                        "author_name": "Edward",
                        "action": "Met client",
                        "notes": "Discussed courier charges",
                    }
                ],
            }
        },
    }
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(sample_json, f)

    count = migrate_from_json_if_needed(json_path=json_file, db_path=db_file)
    assert count == 1

    leads = get_all_leads(db_path=db_file)
    assert len(leads) == 1
    assert leads[0]["company_name"] == "Clear Synth Labs"
    assert len(leads[0]["history"]) == 1

    # Second call should be a no-op since table is no longer empty
    assert migrate_from_json_if_needed(json_path=json_file, db_path=db_file) == 0


def test_concurrent_writes(temp_db: Path):
    """Verifies that multiple concurrent threads can write without SQLite lock collisions."""
    errors = []

    def worker(worker_id: int):
        try:
            for i in range(5):
                lead = create_lead(
                    {
                        "company_name": f"Worker-{worker_id}-Lead-{i}",
                        "branch": "Mumbai",
                        "assigned_to": "Edward",
                        "status": "Assigned",
                    },
                    db_path=temp_db,
                )
                add_activity(
                    lead["id"],
                    {"action": "Ping", "notes": f"Ping from worker {worker_id}"},
                    db_path=temp_db,
                )
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0
    leads = get_all_leads(db_path=temp_db)
    assert len(leads) == 20


def test_migrate_from_json_missing_or_empty_returns_zero(tmp_path: Path):
    """Verifies that migrate_from_json_if_needed returns 0 and does NOT auto-seed from Excel when JSON is absent or empty."""
    db_file = tmp_path / "empty_tracker.db"
    missing_json = tmp_path / "non_existent.json"

    count = migrate_from_json_if_needed(json_path=missing_json, db_path=db_file)
    assert count == 0

    leads = get_all_leads(db_path=db_file)
    assert len(leads) == 0
    assert leads == []


def test_seed_from_excel_if_empty_manual_invocation(tmp_path: Path):
    """Verifies that seed_from_excel_if_empty still works for manual/script seeding when invoked explicitly."""
    db_file = tmp_path / "manual_seeded_tracker.db"
    count = seed_from_excel_if_empty(db_path=db_file)
    assert count == 14

    leads = get_all_leads(db_path=db_file)
    assert len(leads) == 14

    # Second invocation is a no-op since table is no longer empty
    assert seed_from_excel_if_empty(db_path=db_file) == 0

