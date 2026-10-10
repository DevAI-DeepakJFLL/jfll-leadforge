from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.params import Query as QueryType
from src.api.config import settings
from src.api.database import get_db_connection
from src.api.models import PaginatedResponse, AudienceCounts
from src.api.logger import logger

router = APIRouter(prefix="/api/v1", tags=["Leads"])

ALLOWED_STATUSES = {"Active", "Not Active"}
ALLOWED_TABS = {"all", "shippers", "subagents", "overseas", "with-contacts"}


@router.get("/leads", response_model=PaginatedResponse, summary="Retrieve paginated customer leads")
def list_leads(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=25, ge=1, le=100, description="Records per page (max 100)"),
    status: Optional[str] = Query(default=None, description="Filter by status: 'Active' or 'Not Active'"),
    customer_group: Optional[str] = Query(default=None, description="Single Customer Group filter"),
    customer_groups: Optional[List[str]] = Query(default=None, description="Multi-select Customer Groups"),
    types: Optional[List[str]] = Query(default=None, description="Multi-select Legal Types"),
    has_phone: Optional[bool] = Query(default=None, description="Require valid phone number"),
    has_email: Optional[bool] = Query(default=None, description="Require valid email address"),
    has_contact_person: Optional[bool] = Query(default=None, description="Require contact person name"),
    tab: Optional[str] = Query(default=None, description="Audience quick tab: all, shippers, subagents, overseas, with-contacts"),
    search: Optional[str] = Query(default=None, min_length=1, max_length=100, description="Search company, contact person or email"),
):
    # Normalize Query objects when invoked directly in tests/scripts
    if isinstance(page, QueryType): page = 1
    if isinstance(page_size, QueryType): page_size = 25
    if isinstance(status, QueryType): status = None
    if isinstance(customer_group, QueryType): customer_group = None
    if isinstance(customer_groups, QueryType): customer_groups = None
    if isinstance(types, QueryType): types = None
    if isinstance(has_phone, QueryType): has_phone = None
    if isinstance(has_email, QueryType): has_email = None
    if isinstance(has_contact_person, QueryType): has_contact_person = None
    if isinstance(tab, QueryType): tab = None
    if isinstance(search, QueryType): search = None

    if status and status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Must be one of: {list(ALLOWED_STATUSES)}",
        )

    if tab and tab not in ALLOWED_TABS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tab '{tab}'. Must be one of: {list(ALLOWED_TABS)}",
        )

    offset = (page - 1) * page_size
    con = get_db_connection()

    # Use parameterized / safely escaped queries to prevent SQL injection
    conditions = ["1=1"]
    params = []

    if status:
        conditions.append('"Status" = ?')
        params.append(status)

    # Tab shortcut filters
    if tab == "shippers":
        conditions.append('"Customer Group" = ?')
        params.append("Shipper / Consignee")
    elif tab == "subagents":
        conditions.append('"Customer Group" = ?')
        params.append("Subagent")
    elif tab == "overseas":
        conditions.append('"Customer Group" = ?')
        params.append("Overseas Agent")
    elif tab == "with-contacts":
        conditions.append('("Contact Person Name" IS NOT NULL OR "Email" IS NOT NULL OR "Mobile Number" IS NOT NULL)')

    # Customer Group multi-select or single
    combined_groups = list(customer_groups or [])
    if customer_group and customer_group not in combined_groups:
        combined_groups.append(customer_group)
    if combined_groups:
        placeholders = ", ".join(["?"] * len(combined_groups))
        conditions.append(f'"Customer Group" IN ({placeholders})')
        params.extend(combined_groups)

    # Legal Types multi-select
    if types:
        placeholders = ", ".join(["?"] * len(types))
        conditions.append(f'"Type" IN ({placeholders})')
        params.extend(types)

    # Contact readiness
    if has_phone:
        conditions.append('("Mobile Number" IS NOT NULL AND length(trim("Mobile Number")) > 0)')
    if has_email:
        conditions.append('("Email" IS NOT NULL AND length(trim("Email")) > 0)')
    if has_contact_person:
        conditions.append('("Contact Person Name" IS NOT NULL AND length(trim("Contact Person Name")) > 0)')

    # Full-text / substring search across name, contact person, email, and phone
    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append(
            '("Full Name" ILIKE ? OR "Contact Person Name" ILIKE ? OR "Email" ILIKE ? OR "Mobile Number" ILIKE ?)'
        )
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    where_sql = " AND ".join(conditions)

    # 1. Total Count Query (Prepared statement)
    count_query = f"SELECT count(*) FROM '{settings.s3_uri}' WHERE {where_sql}"
    total_records = con.execute(count_query, params).fetchone()[0]

    # 2. Audience Tab Aggregate Counts (Single-pass table scan)
    agg_row = con.execute(f"""
        SELECT 
            count(*) as all_count,
            count(CASE WHEN "Customer Group" = 'Shipper / Consignee' THEN 1 END) as shippers,
            count(CASE WHEN "Customer Group" = 'Subagent' THEN 1 END) as subagents,
            count(CASE WHEN "Customer Group" = 'Overseas Agent' THEN 1 END) as overseas,
            count(CASE WHEN ("Contact Person Name" IS NOT NULL OR "Email" IS NOT NULL OR "Mobile Number" IS NOT NULL) THEN 1 END) as with_contacts
        FROM '{settings.s3_uri}'
    """).fetchone()

    audience_counts = AudienceCounts(
        all=agg_row[0],
        shippers=agg_row[1],
        subagents=agg_row[2],
        overseas=agg_row[3],
        with_contacts=agg_row[4],
    )

    # 3. Paginated Data Query
    data_query = f"""
        SELECT 
            "Full Name" as full_name,
            "Territory" as territory,
            "Contact Person Name" as contact_person_name,
            "Mobile Number" as mobile_number,
            "Email" as email,
            "Status" as status,
            "Customer Group" as customer_group,
            "Type" as type
        FROM '{settings.s3_uri}'
        WHERE {where_sql}
        ORDER BY "Full Name" ASC
        LIMIT ? OFFSET ?
    """
    query_params = params + [page_size, offset]
    result_cursor = con.execute(data_query, query_params)
    columns = [desc[0] for desc in result_cursor.description]
    rows = result_cursor.fetchall()
    clean_records = [dict(zip(columns, row)) for row in rows]
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

    logger.info(
        "Executed DuckDB analytical query",
        extra={
            "total_records": total_records,
            "page": page,
            "page_size": page_size,
            "returned_count": len(clean_records),
            "tab": tab,
        },
    )

    return {
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "data": clean_records,
        "audience_counts": audience_counts,
    }

