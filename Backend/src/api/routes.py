from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from src.api.config import settings
from src.api.database import get_db_connection
from src.api.models import PaginatedResponse

router = APIRouter(prefix="/api/v1", tags=["Leads"])

ALLOWED_STATUSES = {"Active", "Not Active"}


@router.get("/leads", response_model=PaginatedResponse, summary="Retrieve paginated customer leads")
def list_leads(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(25, ge=1, le=100, description="Records per page (max 100)"),
    status: Optional[str] = Query(None, description="Filter by status: 'Active' or 'Not Active'"),
    customer_group: Optional[str] = Query(None, description="Filter by Customer Group"),
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Search company or contact person"),
):
    """
    Fetch paginated lead records directly from ZSTD Parquet stored on S3 / Floci.
    Queries are executed using DuckDB columnar scans with predicate pushdown.
    """
    if status and status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Must be one of: {list(ALLOWED_STATUSES)}",
        )

    offset = (page - 1) * page_size
    con = get_db_connection()

    # Use parameterized / safely escaped queries to prevent SQL injection
    conditions = ["1=1"]
    params = []

    if status:
        conditions.append('"Status" = ?')
        params.append(status)

    if customer_group:
        conditions.append('"Customer Group" = ?')
        params.append(customer_group)

    if search:
        search_pattern = f"%{search.strip()}%"
        conditions.append('("Full Name" ILIKE ? OR "Contact Person Name" ILIKE ?)')
        params.extend([search_pattern, search_pattern])

    where_sql = " AND ".join(conditions)

    # 1. Total Count Query (Prepared statement)
    count_query = f"SELECT count(*) FROM '{settings.s3_uri}' WHERE {where_sql}"
    total_records = con.execute(count_query, params).fetchone()[0]

    # 2. Paginated Data Query
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
    df = con.execute(data_query, query_params).fetchdf()
    raw_records = df.to_dict(orient="records")
    # Clean all NaN/float('nan') to Python None for Pydantic serialization
    import math
    clean_records = []
    for r in raw_records:
        clean_row = {}
        for k, v in r.items():
            if v is None or (isinstance(v, float) and math.isnan(v)):
                clean_row[k] = None
            else:
                clean_row[k] = str(v)
        clean_records.append(clean_row)

    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

    return {
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "data": clean_records,
    }
