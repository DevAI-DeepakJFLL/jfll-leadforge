"""Comprehensive unit and integration tests for Aurora DSQL Relational DDL & Migration utility."""

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from scripts.migrate_to_dsql import (
    migrate_sqlite_and_json_to_dsql,
    run_migration,
)
from src.api.dsql_schema import (
    DSQL_INDEX_DDLS,
    DSQL_TABLE_NAMES,
    DSQL_TABLES_DDL,
    HOT_LEAD_CONTACTS_DDL,
    IDX_APPROACH_ENTITY,
    IDX_LEAD_ACTIVITIES_LEAD_ID,
    IDX_LEAD_TRACKER_BRANCH_STATUS,
    IDX_LEAD_TRACKER_FOLLOWUP,
    IDX_LEAD_TRACKER_REP,
    LEAD_TRACKER_ACTIVITIES_DDL,
    LEAD_TRACKER_ITEMS_DDL,
    PROSPECT_APPROACH_LOGS_DDL,
    TABLES,
    hot_lead_contacts,
    idx_approach_entity,
    idx_lead_activities_lead_id,
    idx_lead_tracker_branch_status,
    idx_lead_tracker_followup,
    idx_lead_tracker_rep,
    init_dsql_tables,
    lead_tracker_activities,
    lead_tracker_items,
    prospect_approach_logs,
)


def test_dsql_ddl_contains_core_tables():
    """Verify DDL exports and containment for all four core tables."""
    assert "lead_tracker_items" in DSQL_TABLES_DDL
    assert "lead_tracker_activities" in DSQL_TABLES_DDL
    assert "prospect_approach_logs" in DSQL_TABLES_DDL
    assert "hot_lead_contacts" in DSQL_TABLES_DDL

    for tbl in ["lead_tracker_items", "lead_tracker_activities", "prospect_approach_logs", "hot_lead_contacts"]:
        assert tbl in TABLES
        assert tbl in DSQL_TABLE_NAMES

    assert "lead_tracker_items" in LEAD_TRACKER_ITEMS_DDL
    assert "lead_tracker_activities" in LEAD_TRACKER_ACTIVITIES_DDL
    assert "prospect_approach_logs" in PROSPECT_APPROACH_LOGS_DDL
    assert "hot_lead_contacts" in HOT_LEAD_CONTACTS_DDL

    # Verify alias exports
    assert lead_tracker_items == LEAD_TRACKER_ITEMS_DDL
    assert lead_tracker_activities == LEAD_TRACKER_ACTIVITIES_DDL
    assert prospect_approach_logs == PROSPECT_APPROACH_LOGS_DDL
    assert hot_lead_contacts == HOT_LEAD_CONTACTS_DDL


def test_dsql_ddl_contains_indexes():
    """Verify index exports and statements."""
    assert "idx_lead_tracker_branch_status" in IDX_LEAD_TRACKER_BRANCH_STATUS
    assert "idx_lead_tracker_rep" in IDX_LEAD_TRACKER_REP
    assert "idx_lead_tracker_followup" in IDX_LEAD_TRACKER_FOLLOWUP
    assert "idx_lead_activities_lead_id" in IDX_LEAD_ACTIVITIES_LEAD_ID
    assert "idx_approach_entity" in IDX_APPROACH_ENTITY

    assert idx_lead_tracker_branch_status == IDX_LEAD_TRACKER_BRANCH_STATUS
    assert idx_lead_tracker_rep == IDX_LEAD_TRACKER_REP
    assert idx_lead_tracker_followup == IDX_LEAD_TRACKER_FOLLOWUP
    assert idx_lead_activities_lead_id == IDX_LEAD_ACTIVITIES_LEAD_ID
    assert idx_approach_entity == IDX_APPROACH_ENTITY
    assert len(DSQL_INDEX_DDLS) == 5


def test_init_dsql_tables_on_sqlite_connection():
    """init_dsql_tables() executes all table and index DDLs on a connection."""
    conn = sqlite3.connect(":memory:")
    init_dsql_tables(conn)

    cur = conn.cursor()
    created_tables = {
        r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
    }
    for tbl in ["lead_tracker_items", "lead_tracker_activities", "prospect_approach_logs", "hot_lead_contacts"]:
        assert tbl in created_tables

    created_indexes = {
        r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='index';").fetchall()
    }
    for idx in [
        "idx_lead_tracker_branch_status",
        "idx_lead_tracker_rep",
        "idx_lead_tracker_followup",
        "idx_lead_activities_lead_id",
        "idx_approach_entity",
    ]:
        assert idx in created_indexes
    conn.close()


def test_init_dsql_tables_on_sqlite_cursor():
    """init_dsql_tables() accepts a cursor object."""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    init_dsql_tables(cursor)

    created_tables = {
        r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
    }
    assert "lead_tracker_items" in created_tables
    assert "lead_tracker_activities" in created_tables
    conn.close()


@pytest.fixture
def mock_source_environment(tmp_path: Path):
    """Creates temporary source SQLite db and approach_logs.json with known fixture records."""
    src_db = tmp_path / "test_source.db"
    conn = sqlite3.connect(str(src_db))
    conn.execute("""
        CREATE TABLE lead_tracker_items (
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
        CREATE TABLE lead_tracker_activities (
            id TEXT PRIMARY KEY,
            lead_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_email TEXT,
            action TEXT NOT NULL,
            old_status TEXT,
            new_status TEXT,
            notes TEXT
        );
    """)
    conn.execute("""
        CREATE TABLE hot_lead_contacts (
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

    # Populate 2 sample leads
    conn.execute(
        """
        INSERT INTO lead_tracker_items (
            id, company_name, contact_person, contact_phone, contact_email,
            branch, assigned_to, assigned_to_email, assigned_date, status,
            transport_mode, routing_type, feedback_notes, created_at, updated_at
        ) VALUES
        ('lead_001', 'Reliance Retail', 'Mukesh A', '9820011111', 'mukesh@reliance.com',
         'Mumbai', 'Deepak Naidu', 'deepak@jfll.com', '2026-11-20', 'Contacted',
         'Air Export', 'Free Hand', 'Promising lead', '2026-11-20T10:00:00Z', '2026-11-20T10:00:00Z'),
        ('lead_002', 'Tata Motors Ltd', 'Ratan T', '9820022222', 'ratan@tata.com',
         'Delhi', 'Tyra Theknath', 'tyra.theknath@jfll.com', '2026-11-21', 'Working on It',
         'Ocean Import', 'Routing Order', 'Needs quote', '2026-11-21T10:00:00Z', '2026-11-21T10:00:00Z');
        """
    )

    # Populate 3 activities
    conn.execute(
        """
        INSERT INTO lead_tracker_activities (
            id, lead_id, timestamp, author_name, author_email, action, old_status, new_status, notes
        ) VALUES
        ('act_001', 'lead_001', '2026-11-20T10:05:00Z', 'Deepak Naidu', 'deepak@jfll.com', 'Called customer', 'Not Contacted', 'Contacted', 'First outreach'),
        ('act_002', 'lead_001', '2026-11-21T11:00:00Z', 'Deepak Naidu', 'deepak@jfll.com', 'Sent email', 'Contacted', 'Contacted', 'Rates brochure sent'),
        ('act_003', 'lead_002', '2026-11-21T10:15:00Z', 'Tyra Theknath', 'tyra.theknath@jfll.com', 'Called customer', 'Not Contacted', 'Working on It', 'Inquired on shipment specs');
        """
    )

    # Populate 1 hot lead contact
    conn.execute(
        """
        INSERT INTO hot_lead_contacts (
            sr_no, customer_name, gstin, phone, contact_person, email, notes, updated_at, updated_by
        ) VALUES
        (101, 'Reliance Retail', '27AAACR1234M1Z5', '9820011111', 'Mukesh A', 'mukesh@reliance.com', 'HQ Mumbai verified', '2026-11-25T12:00:00Z', 'Deepak Naidu');
        """
    )
    conn.commit()
    conn.close()

    # Create sample approach_logs.json with 2 entities and 3 total log entries
    src_json = tmp_path / "test_approach.json"
    json_data = {
        "version": 1,
        "entities": {
            "datamyne:dm_901": {
                "entity_type": "datamyne",
                "entity_id": "dm_901",
                "company_name": "Zenith Pharma",
                "current_status": "Contacted",
                "is_active_converted": False,
                "logs": [
                    {
                        "id": "app_log_001",
                        "action": "Called customer",
                        "status": "Contacted",
                        "note": "Connected with logistics manager",
                        "company_name": "Zenith Pharma",
                        "salesperson_name": "Snehal Birje",
                        "salesperson_email": "snehal.birje@jfll.com",
                        "created_at": "2026-11-26T09:30:00Z",
                    },
                    {
                        "id": "app_log_002",
                        "action": "Sent report",
                        "status": "Contacted",
                        "note": "Forwarded market report",
                        "salesperson_name": "Snehal Birje",
                        "salesperson_email": "snehal.birje@jfll.com",
                        "created_at": "2026-11-26T14:00:00Z",
                    },
                ],
            },
            "jfll_customer:cust_902": {
                "entity_type": "jfll_customer",
                "entity_id": "cust_902",
                "company_name": "Apex Electronics",
                "current_status": "Report Sent",
                "is_active_converted": False,
                "logs": [
                    {
                        "id": "app_log_003",
                        "action": "Sent report",
                        "status": "Report Sent",
                        "note": "Sent quarterly report",
                        "salesperson_name": "Deepak Naidu",
                        "salesperson_email": "deepak@jfll.com",
                        "created_at": "2026-11-27T08:00:00Z",
                    }
                ],
            },
        },
    }
    with open(src_json, "w", encoding="utf-8") as f:
        json.dump(json_data, f)

    return src_db, src_json


def test_migration_execution_and_data_integrity(mock_source_environment, tmp_path: Path):
    """Test full migration into an empty target database, verifying exact counts and fields."""
    src_db, src_json = mock_source_environment
    target_db = tmp_path / "target_dsql.db"
    target_conn = sqlite3.connect(str(target_db))
    target_conn.row_factory = sqlite3.Row

    counts = migrate_sqlite_and_json_to_dsql(
        sqlite_db_path=src_db,
        json_path=src_json,
        target_conn=target_conn,
    )

    assert counts == {
        "leads": 2,
        "activities": 3,
        "approach_logs": 3,
        "hot_lead_contacts": 1,
    }

    # Verify data integrity in target lead_tracker_items
    cur = target_conn.cursor()
    leads = cur.execute("SELECT * FROM lead_tracker_items ORDER BY id;").fetchall()
    assert len(leads) == 2
    l1 = dict(leads[0])
    assert l1["id"] == "lead_001"
    assert l1["company_name"] == "Reliance Retail"
    assert l1["assigned_to"] == "Deepak Naidu"
    assert l1["branch"] == "Mumbai"

    # Verify target lead_tracker_activities
    acts = cur.execute("SELECT * FROM lead_tracker_activities ORDER BY id;").fetchall()
    assert len(acts) == 3
    a1 = dict(acts[0])
    assert a1["id"] == "act_001"
    assert a1["lead_id"] == "lead_001"
    assert a1["author_name"] == "Deepak Naidu"
    assert a1["action"] == "Called customer"

    # Verify target prospect_approach_logs
    app_logs = cur.execute("SELECT * FROM prospect_approach_logs ORDER BY id;").fetchall()
    assert len(app_logs) == 3
    app1 = dict(app_logs[0])
    assert app1["id"] == "app_log_001"
    assert app1["entity_type"] == "datamyne"
    assert app1["entity_id"] == "dm_901"
    assert app1["company_name"] == "Zenith Pharma"
    assert app1["logged_by"] == "Snehal Birje"
    assert app1["logged_by_email"] == "snehal.birje@jfll.com"

    # Verify target hot_lead_contacts
    contacts = cur.execute("SELECT * FROM hot_lead_contacts ORDER BY sr_no;").fetchall()
    assert len(contacts) == 1
    c1 = dict(contacts[0])
    assert c1["sr_no"] == 101
    assert c1["customer_name"] == "Reliance Retail"
    assert c1["gstin"] == "27AAACR1234M1Z5"

    target_conn.close()


def test_migration_idempotency_zero_duplicates(mock_source_environment, tmp_path: Path):
    """Running migration twice on the same target produces identical counts and 0 duplicates."""
    src_db, src_json = mock_source_environment
    target_db = tmp_path / "target_idempotency.db"
    target_conn = sqlite3.connect(str(target_db))
    target_conn.row_factory = sqlite3.Row

    # First migration run
    counts_run1 = migrate_sqlite_and_json_to_dsql(
        sqlite_db_path=src_db,
        json_path=src_json,
        target_conn=target_conn,
    )
    assert counts_run1 == {"leads": 2, "activities": 3, "approach_logs": 3, "hot_lead_contacts": 1}

    # Second migration run (idempotency check)
    counts_run2 = migrate_sqlite_and_json_to_dsql(
        sqlite_db_path=src_db,
        json_path=src_json,
        target_conn=target_conn,
    )
    assert counts_run2 == counts_run1

    # Verify actual row counts in database did not double
    cur = target_conn.cursor()
    assert cur.execute("SELECT count(*) FROM lead_tracker_items;").fetchone()[0] == 2
    assert cur.execute("SELECT count(*) FROM lead_tracker_activities;").fetchone()[0] == 3
    assert cur.execute("SELECT count(*) FROM prospect_approach_logs;").fetchone()[0] == 3
    assert cur.execute("SELECT count(*) FROM hot_lead_contacts;").fetchone()[0] == 1

    target_conn.close()


def test_run_migration_alias_matches(mock_source_environment, tmp_path: Path):
    """run_migration alias behaves identically to migrate_sqlite_and_json_to_dsql."""
    src_db, src_json = mock_source_environment
    target_db = tmp_path / "target_alias.db"
    target_conn = sqlite3.connect(str(target_db))

    counts = run_migration(
        sqlite_db_path=src_db,
        json_path=src_json,
        target_conn=target_conn,
    )
    assert counts["leads"] == 2
    assert counts["activities"] == 3
    assert counts["approach_logs"] == 3
    assert counts["hot_lead_contacts"] == 1
    target_conn.close()


def test_migration_graceful_with_missing_sources(tmp_path: Path):
    """When source files do not exist, migration returns 0 counts without error."""
    non_existent_db = tmp_path / "missing.db"
    non_existent_json = tmp_path / "missing.json"
    target_conn = sqlite3.connect(":memory:")

    counts = migrate_sqlite_and_json_to_dsql(
        sqlite_db_path=non_existent_db,
        json_path=non_existent_json,
        target_conn=target_conn,
    )
    assert counts == {"leads": 0, "activities": 0, "approach_logs": 0, "hot_lead_contacts": 0}
    target_conn.close()


def test_migration_cli_subprocess(mock_source_environment):
    """Test CLI execution using python Backend/scripts/migrate_to_dsql.py."""
    src_db, src_json = mock_source_environment
    backend_dir = Path(__file__).resolve().parent.parent

    cmd = [
        sys.executable,
        str(backend_dir / "scripts" / "migrate_to_dsql.py"),
        "--sqlite",
        str(src_db),
        "--json",
        str(src_json),
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    assert res.returncode == 0, f"CLI migration failed: {res.stderr}"
    assert "Migration completed successfully" in res.stdout
    assert "'leads': 2" in res.stdout
    assert "'activities': 3" in res.stdout
    assert "'approach_logs': 3" in res.stdout
    assert "'hot_lead_contacts': 1" in res.stdout
