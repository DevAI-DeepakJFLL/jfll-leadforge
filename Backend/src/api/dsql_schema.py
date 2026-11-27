"""Aurora DSQL Relational DDL & Schema Management.

Defines PostgreSQL- and SQLite-compatible DDL schemas, constraints, and indexes
for Amazon Aurora DSQL and offline local environments.
Provides schema initialization helpers compatible with PostgreSQL and SQLite.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# --- Table Names ---
TABLE_LEAD_TRACKER_ITEMS = "lead_tracker_items"
TABLE_LEAD_TRACKER_ACTIVITIES = "lead_tracker_activities"
TABLE_PROSPECT_APPROACH_LOGS = "prospect_approach_logs"
TABLE_HOT_LEAD_CONTACTS = "hot_lead_contacts"

TABLES: list[str] = [
    TABLE_LEAD_TRACKER_ITEMS,
    TABLE_LEAD_TRACKER_ACTIVITIES,
    TABLE_PROSPECT_APPROACH_LOGS,
    TABLE_HOT_LEAD_CONTACTS,
]
DSQL_TABLE_NAMES = TABLES
DSQL_TABLES = TABLES

# --- Table DDL Statements ---
LEAD_TRACKER_ITEMS_DDL = """
CREATE TABLE IF NOT EXISTS lead_tracker_items (
    id VARCHAR(64) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(64),
    contact_email VARCHAR(255),
    branch VARCHAR(100) NOT NULL,
    assigned_to VARCHAR(150) NOT NULL,
    assigned_to_email VARCHAR(255),
    assigned_by VARCHAR(150) DEFAULT 'Tyra Theknath',
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(64) NOT NULL,
    transport_mode VARCHAR(64) NOT NULL,
    routing_type VARCHAR(64) NOT NULL,
    feedback_notes TEXT,
    next_followup_date DATE,
    next_action VARCHAR(255),
    quote_date DATE,
    rate_validity_date DATE,
    rate_validity_days INT DEFAULT 14,
    target_shipment_date DATE,
    linked_entity_type VARCHAR(64) DEFAULT 'custom',
    linked_entity_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) DEFAULT 'Tyra Theknath',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE
);
""".strip()

LEAD_TRACKER_ACTIVITIES_DDL = """
CREATE TABLE IF NOT EXISTS lead_tracker_activities (
    id VARCHAR(64) PRIMARY KEY,
    lead_id VARCHAR(64) NOT NULL REFERENCES lead_tracker_items(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author_name VARCHAR(150) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(64),
    new_status VARCHAR(64),
    notes TEXT
);
""".strip()

PROSPECT_APPROACH_LOGS_DDL = """
CREATE TABLE IF NOT EXISTS prospect_approach_logs (
    id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    company_name VARCHAR(255),
    action VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    note TEXT,
    logged_by VARCHAR(150) NOT NULL,
    logged_by_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
""".strip()

HOT_LEAD_CONTACTS_DDL = """
CREATE TABLE IF NOT EXISTS hot_lead_contacts (
    sr_no INT PRIMARY KEY,
    customer_name VARCHAR(255),
    gstin VARCHAR(32),
    phone VARCHAR(64),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150)
);
""".strip()

# Named aliases matching table names
lead_tracker_items = LEAD_TRACKER_ITEMS_DDL
lead_tracker_activities = LEAD_TRACKER_ACTIVITIES_DDL
prospect_approach_logs = PROSPECT_APPROACH_LOGS_DDL
hot_lead_contacts = HOT_LEAD_CONTACTS_DDL


# --- Index DDL Statements ---
IDX_LEAD_TRACKER_BRANCH_STATUS = (
    "CREATE INDEX IF NOT EXISTS idx_lead_tracker_branch_status ON lead_tracker_items(branch, status);"
)
IDX_LEAD_TRACKER_REP = (
    "CREATE INDEX IF NOT EXISTS idx_lead_tracker_rep ON lead_tracker_items(assigned_to_email);"
)
IDX_LEAD_TRACKER_FOLLOWUP = (
    "CREATE INDEX IF NOT EXISTS idx_lead_tracker_followup ON lead_tracker_items(next_followup_date);"
)
IDX_LEAD_ACTIVITIES_LEAD_ID = (
    "CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_tracker_activities(lead_id);"
)
IDX_APPROACH_ENTITY = (
    "CREATE INDEX IF NOT EXISTS idx_approach_entity ON prospect_approach_logs(entity_type, entity_id);"
)

# Named aliases matching index names
idx_lead_tracker_branch_status = IDX_LEAD_TRACKER_BRANCH_STATUS
idx_lead_tracker_rep = IDX_LEAD_TRACKER_REP
idx_lead_tracker_followup = IDX_LEAD_TRACKER_FOLLOWUP
idx_lead_activities_lead_id = IDX_LEAD_ACTIVITIES_LEAD_ID
idx_approach_entity = IDX_APPROACH_ENTITY

DSQL_INDEXES_DDL: list[str] = [
    IDX_LEAD_TRACKER_BRANCH_STATUS,
    IDX_LEAD_TRACKER_REP,
    IDX_LEAD_TRACKER_FOLLOWUP,
    IDX_LEAD_ACTIVITIES_LEAD_ID,
    IDX_APPROACH_ENTITY,
]
DSQL_INDEX_DDLS = DSQL_INDEXES_DDL


class _DDLCollection(list):
    """List collection subclass supporting table name containment and dict-like get."""

    def __contains__(self, item: object) -> bool:
        if super().__contains__(item):
            return True
        if isinstance(item, str):
            for ddl in self:
                if item.lower() in ddl.lower():
                    return True
        return False

    def get(self, key: str, default: Any = None) -> Any:
        for ddl in self:
            if key.lower() in ddl.lower():
                return ddl
        return default


DSQL_TABLES_DDL: list[str] = _DDLCollection([
    LEAD_TRACKER_ITEMS_DDL,
    LEAD_TRACKER_ACTIVITIES_DDL,
    PROSPECT_APPROACH_LOGS_DDL,
    HOT_LEAD_CONTACTS_DDL,
])

ALL_DDL_STATEMENTS: list[str] = [
    LEAD_TRACKER_ITEMS_DDL,
    LEAD_TRACKER_ACTIVITIES_DDL,
    PROSPECT_APPROACH_LOGS_DDL,
    HOT_LEAD_CONTACTS_DDL,
    IDX_LEAD_TRACKER_BRANCH_STATUS,
    IDX_LEAD_TRACKER_REP,
    IDX_LEAD_TRACKER_FOLLOWUP,
    IDX_LEAD_ACTIVITIES_LEAD_ID,
    IDX_APPROACH_ENTITY,
]


def init_dsql_tables(conn: Any) -> None:
    """Initializes tables and indexes on Aurora DSQL (PostgreSQL) or SQLite.

    Accepts connection objects (sqlite3.Connection, psycopg/psycopg2 Connection)
    or cursor objects, executing all table and index DDLs.
    """
    if hasattr(conn, "cursor") and callable(conn.cursor):
        cursor_obj = conn.cursor()
        if hasattr(cursor_obj, "__enter__") and hasattr(cursor_obj, "__exit__"):
            with cursor_obj as cur:
                for stmt in ALL_DDL_STATEMENTS:
                    cur.execute(stmt)
        else:
            try:
                for stmt in ALL_DDL_STATEMENTS:
                    cursor_obj.execute(stmt)
            finally:
                if hasattr(cursor_obj, "close") and callable(cursor_obj.close):
                    cursor_obj.close()
    elif hasattr(conn, "execute") and callable(conn.execute):
        for stmt in ALL_DDL_STATEMENTS:
            conn.execute(stmt)
    else:
        raise TypeError(f"Unsupported connection/cursor object: {type(conn)}")

    if hasattr(conn, "commit") and callable(conn.commit):
        try:
            conn.commit()
        except Exception:
            pass
