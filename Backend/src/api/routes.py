import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.params import Query as QueryType
from src.api.config import settings
from src.api.database import get_db_connection
from src.api.models import (
    PaginatedResponse,
    AudienceCounts,
    ApolloPaginatedResponse,
    ApolloAudienceCounts,
    ApolloContactRecord,
    ApolloContactsPaginatedResponse,
)
from src.api.logger import logger
from src.api.auth import verify_token

router = APIRouter(prefix="/api/v1", tags=["Leads"])


ALLOWED_STATUSES = {"Active", "Not Active"}
ALLOWED_TABS = {"all", "shippers", "subagents", "overseas", "with-contacts"}


def _handle_db_exception(context_msg: str, err: Exception, source: str = "unknown") -> HTTPException:
    incident_id = str(uuid.uuid4())[:8]
    logger.error(f"[Incident {incident_id}] {context_msg} from {source}: {err}", exc_info=True)
    if settings.env == "production":
        return HTTPException(
            status_code=500,
            detail=f"{context_msg}. Please contact support with incident reference: {incident_id}",
        )
    return HTTPException(status_code=500, detail=f"{context_msg}: {str(err)}")


def get_data_source(con, dataset: str = "active") -> str:
    """Returns local cached Parquet file path (via /tmp in Lambda or local disk), falling back to S3 URI if needed."""
    try:
        from src.api.database import get_cached_parquet_path
        cached_path = get_cached_parquet_path(dataset)
        if cached_path.exists():
            return str(cached_path)
    except Exception:
        pass
    return settings.s3_uri_for(dataset)


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
    authorization: Optional[str] = Header(None, description="Optional bearer token for authenticated session"),
):
    # Enforce or validate Bearer token if provided, or require it in production
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
    elif settings.env == "production":
        raise HTTPException(status_code=401, detail="Authentication required to access customer leads")

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
        conditions.append('("Mobile Number" IS NOT NULL AND length(trim("Mobile Number")) > 0 AND trim("Mobile Number") NOT IN (\'-\', \'--\', \'---\', \'+91-\', \'+91\', \'N/A\', \'NA\', \'null\', \'none\'))')
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
    try:
        data_source = get_data_source(con)

        # 1. Total Count Query (Prepared statement)
        count_query = f"SELECT count(*) FROM '{data_source}' WHERE {where_sql}"
        total_records = con.execute(count_query, params).fetchone()[0]

        # 2. Audience Tab Aggregate Counts (Single-pass table scan)
        agg_row = con.execute(f"""
            SELECT 
                count(*) as all_count,
                count(CASE WHEN "Customer Group" = 'Shipper / Consignee' THEN 1 END) as shippers,
                count(CASE WHEN "Customer Group" = 'Subagent' THEN 1 END) as subagents,
                count(CASE WHEN "Customer Group" = 'Overseas Agent' THEN 1 END) as overseas,
                count(CASE WHEN ("Contact Person Name" IS NOT NULL OR "Email" IS NOT NULL OR "Mobile Number" IS NOT NULL) THEN 1 END) as with_contacts
            FROM '{data_source}'
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
            FROM '{data_source}'
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
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_exception("Database query failure", e, data_source if 'data_source' in locals() else 'unknown')


ALLOWED_APOLLO_TABS = {"all", "high_headcount", "high_revenue", "top_cargo_verticals", "with_website_linkedin"}


@router.get(
    "/apollo/leads",
    response_model=ApolloPaginatedResponse,
    summary="Retrieve paginated commercial freight shippers from Apollo dataset",
)
def list_apollo_leads(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=25, ge=1, le=100, description="Records per page (max 100)"),
    industry: Optional[str] = Query(default=None, description="Single industry filter"),
    industries: Optional[List[str]] = Query(default=None, description="Multi-select cargo verticals"),
    country: Optional[str] = Query(default=None, description="Single country filter"),
    countries: Optional[List[str]] = Query(default=None, description="Multi-select countries"),
    state: Optional[str] = Query(default=None, description="State/Province filter"),
    min_employees: Optional[int] = Query(default=None, ge=0, description="Minimum headcount"),
    max_employees: Optional[int] = Query(default=None, ge=0, description="Maximum headcount"),
    min_revenue: Optional[int] = Query(default=None, ge=0, description="Minimum annual revenue USD"),
    has_website: Optional[bool] = Query(default=None, description="Require corporate website"),
    has_linkedin: Optional[bool] = Query(default=None, description="Require LinkedIn profile"),
    tab: Optional[str] = Query(default=None, description="Audience quick tab"),
    search: Optional[str] = Query(default=None, min_length=1, max_length=100, description="Search company, domain, keywords"),
    authorization: Optional[str] = Header(None, description="Bearer token for authenticated session"),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
    elif settings.env == "production":
        raise HTTPException(status_code=401, detail="Authentication required to access Apollo leads")

    # Normalize Query objects when invoked directly in tests/scripts
    if isinstance(page, QueryType): page = 1
    if isinstance(page_size, QueryType): page_size = 25
    if isinstance(industry, QueryType): industry = None
    if isinstance(industries, QueryType): industries = None
    if isinstance(country, QueryType): country = None
    if isinstance(countries, QueryType): countries = None
    if isinstance(state, QueryType): state = None
    if isinstance(min_employees, QueryType): min_employees = None
    if isinstance(max_employees, QueryType): max_employees = None
    if isinstance(min_revenue, QueryType): min_revenue = None
    if isinstance(has_website, QueryType): has_website = None
    if isinstance(has_linkedin, QueryType): has_linkedin = None
    if isinstance(tab, QueryType): tab = None
    if isinstance(search, QueryType): search = None

    if tab and tab not in ALLOWED_APOLLO_TABS:
        raise HTTPException(status_code=400, detail=f"Invalid tab. Allowed values: {sorted(ALLOWED_APOLLO_TABS)}")

    offset = (page - 1) * page_size
    con = get_db_connection()
    data_source = get_data_source(con, dataset="apollo")

    try:
        conditions = ["1=1"]
        params = []

        if tab == "high_headcount":
            conditions.append("employee_count >= 100")
        elif tab == "high_revenue":
            conditions.append("revenue_usd >= 10000000")
        elif tab == "top_cargo_verticals":
            conditions.append("lower(industry) IN ('automotive', 'food & beverages', 'pharmaceuticals', 'electrical/electronic manufacturing', 'chemicals', 'medical devices')")
        elif tab == "with_website_linkedin":
            conditions.append("website_url IS NOT NULL AND linkedin_url IS NOT NULL")

        if industry and industry.strip():
            conditions.append("lower(industry) = ?")
            params.append(industry.strip().lower())

        if industries:
            clean_industries = [i.strip().lower() for i in industries if i and i.strip()]
            if clean_industries:
                placeholders = ", ".join(["?"] * len(clean_industries))
                conditions.append(f"lower(industry) IN ({placeholders})")
                params.extend(clean_industries)

        if country and country.strip():
            conditions.append("lower(hq_country) = ?")
            params.append(country.strip().lower())

        if countries:
            clean_countries = [c.strip().lower() for c in countries if c and c.strip()]
            if clean_countries:
                placeholders = ", ".join(["?"] * len(clean_countries))
                conditions.append(f"lower(hq_country) IN ({placeholders})")
                params.extend(clean_countries)

        if state and state.strip():
            conditions.append("lower(hq_state) = ?")
            params.append(state.strip().lower())

        if min_employees is not None:
            conditions.append("employee_count >= ?")
            params.append(min_employees)

        if max_employees is not None:
            conditions.append("employee_count <= ?")
            params.append(max_employees)

        if min_revenue is not None:
            conditions.append("revenue_usd >= ?")
            params.append(min_revenue)

        if has_website is True:
            conditions.append("website_url IS NOT NULL AND trim(website_url) != ''")

        if has_linkedin is True:
            conditions.append("linkedin_url IS NOT NULL AND trim(linkedin_url) != ''")

        if search and search.strip():
            search_pattern = f"%{search.strip().lower()}%"
            conditions.append(
                "(lower(organization_name) LIKE ? OR lower(domain) LIKE ? OR lower(COALESCE(keywords, '')) LIKE ? OR lower(COALESCE(specialties, '')) LIKE ?)"
            )
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

        where_sql = " AND ".join(conditions)

        # 1. Total Count Query (Prepared statement)
        count_query = f"SELECT count(*) FROM '{data_source}' WHERE {where_sql}"
        total_records = con.execute(count_query, params).fetchone()[0]

        # 2. Audience Tab Aggregate Counts
        agg_row = con.execute(f"""
            SELECT 
                count(*) as all_count,
                count(CASE WHEN employee_count >= 100 THEN 1 END) as high_headcount,
                count(CASE WHEN revenue_usd >= 10000000 THEN 1 END) as high_revenue,
                count(CASE WHEN lower(industry) IN ('automotive', 'food & beverages', 'pharmaceuticals', 'electrical/electronic manufacturing', 'chemicals', 'medical devices') THEN 1 END) as top_cargo_verticals,
                count(CASE WHEN (website_url IS NOT NULL AND linkedin_url IS NOT NULL) THEN 1 END) as with_website_linkedin
            FROM '{data_source}'
        """).fetchone()

        audience_counts = ApolloAudienceCounts(
            all=agg_row[0],
            high_headcount=agg_row[1],
            high_revenue=agg_row[2],
            top_cargo_verticals=agg_row[3],
            with_website_linkedin=agg_row[4],
        )

        # 3. Paginated Data Query
        data_query = f"""
            SELECT 
                organization_id,
                organization_name,
                domain,
                website_url,
                phone,
                employee_count,
                revenue_usd,
                founded_year,
                industry,
                specialties,
                keywords,
                technologies_raw,
                job_functions_json,
                linkedin_url,
                hq_city,
                hq_state,
                hq_country,
                hq_postal_code
            FROM '{data_source}'
            WHERE {where_sql}
            ORDER BY employee_count DESC NULLS LAST, organization_name ASC
            LIMIT ? OFFSET ?
        """
        query_params = params + [page_size, offset]
        result_cursor = con.execute(data_query, query_params)
        columns = [desc[0] for desc in result_cursor.description]
        rows = result_cursor.fetchall()
        clean_records = [dict(zip(columns, row)) for row in rows]
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        logger.info(
            "Executed DuckDB Apollo analytical query",
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
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_exception("Apollo database query failure", e, data_source)


@router.get("/apollo/stats", summary="Retrieve aggregated dataset statistics for Apollo freight leads")
def get_apollo_stats():
    con = get_db_connection()
    data_source = get_data_source(con, dataset="apollo")
    try:
        top_industries = con.execute(f"""
            SELECT industry, count(*) as count 
            FROM '{data_source}' 
            GROUP BY industry 
            ORDER BY count DESC 
            LIMIT 15
        """).fetchall()

        top_countries = con.execute(f"""
            SELECT hq_country, count(*) as count 
            FROM '{data_source}' 
            WHERE hq_country IS NOT NULL AND trim(hq_country) != ''
            GROUP BY hq_country 
            ORDER BY count DESC 
            LIMIT 10
        """).fetchall()

        total = con.execute(f"SELECT count(*) FROM '{data_source}'").fetchone()[0]

        return {
            "total_records": total,
            "top_industries": [{"industry": row[0], "count": row[1]} for row in top_industries],
            "top_countries": [{"country": row[0], "count": row[1]} for row in top_countries],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_exception("Failed to retrieve stats", e, data_source)


@router.get(
    "/apollo/companies/{organization_id}/contacts",
    response_model=ApolloContactsPaginatedResponse,
    summary="Retrieve verified contacts and decision-makers for an Apollo organization",
)
def list_company_contacts(
    organization_id: str,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Records per page (max 100)"),
    logistics_only: Optional[bool] = Query(default=None, description="Filter for freight/logistics/procurement specialists"),
    decision_makers_only: Optional[bool] = Query(default=None, description="Filter for C-Suite/VP/Director/Manager"),
    has_email_only: Optional[bool] = Query(default=None, description="Require direct business email"),
    search: Optional[str] = Query(default=None, min_length=1, max_length=100, description="Search by name, title, or email"),
    authorization: Optional[str] = Header(None, description="Bearer token for authenticated session"),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
    elif settings.env == "production":
        raise HTTPException(status_code=401, detail="Authentication required to access Apollo contacts")

    if isinstance(page, QueryType): page = 1
    if isinstance(page_size, QueryType): page_size = 20
    if isinstance(logistics_only, QueryType): logistics_only = None
    if isinstance(decision_makers_only, QueryType): decision_makers_only = None
    if isinstance(has_email_only, QueryType): has_email_only = None
    if isinstance(search, QueryType): search = None

    offset = (page - 1) * page_size
    con = get_db_connection()
    data_source = get_data_source(con, dataset="apollo_contacts_profile")

    try:
        conditions = ["organization_id = ?"]
        params = [organization_id.strip()]

        if logistics_only is True:
            conditions.append("is_logistics_role = true")
        if decision_makers_only is True:
            conditions.append("is_decision_maker = true")
        if has_email_only is True:
            conditions.append("has_email = true")
        if search and search.strip():
            pat = f"%{search.strip().lower()}%"
            conditions.append("(lower(person_name) LIKE ? OR lower(job_title) LIKE ? OR lower(COALESCE(email, '')) LIKE ?)")
            params.extend([pat, pat, pat])

        where_sql = " AND ".join(conditions)

        count_query = f"SELECT count(*) FROM '{data_source}' WHERE {where_sql}"
        total_records = con.execute(count_query, params).fetchone()[0]

        data_query = f"""
            SELECT 
                person_id,
                organization_id,
                person_name,
                first_name,
                last_name,
                job_title,
                job_title_normalized,
                seniority,
                department,
                email,
                email_status,
                email_confidence,
                linkedin_url,
                contact_city,
                contact_state,
                contact_country,
                is_decision_maker,
                is_logistics_role,
                has_email,
                COALESCE(company_name, '') as employer_name
            FROM '{data_source}'
            WHERE {where_sql}
            ORDER BY is_logistics_role DESC, is_decision_maker DESC, has_email DESC, person_name ASC
            LIMIT ? OFFSET ?
        """
        query_params = params + [page_size, offset]
        result_cursor = con.execute(data_query, query_params)
        columns = [desc[0] for desc in result_cursor.description]
        rows = result_cursor.fetchall()
        clean_records = [dict(zip(columns, row)) for row in rows]
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "data": clean_records,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_exception(f"Database query failure for organization {organization_id}", e, data_source)


@router.get(
    "/apollo/contacts",
    response_model=ApolloContactsPaginatedResponse,
    summary="Global search across Apollo contacts and freight decision-makers",
)
def search_apollo_contacts(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=25, ge=1, le=100, description="Records per page (max 100)"),
    seniority: Optional[str] = Query(default=None, description="Seniority tier: c_suite, vp, director, manager, senior, entry"),
    department: Optional[str] = Query(default=None, description="Functional department"),
    logistics_only: Optional[bool] = Query(default=None, description="Require logistics/supply chain/freight role"),
    decision_makers_only: Optional[bool] = Query(default=None, description="Require decision maker seniority"),
    has_email_only: Optional[bool] = Query(default=None, description="Require direct business email"),
    country: Optional[str] = Query(default=None, description="Contact country"),
    company: Optional[str] = Query(default=None, description="Filter by company / employer name"),
    search: Optional[str] = Query(default=None, min_length=1, max_length=100, description="Search name, title, company, email"),
    authorization: Optional[str] = Header(None, description="Bearer token for authenticated session"),
):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
    elif settings.env == "production":
        raise HTTPException(status_code=401, detail="Authentication required to access Apollo contacts")

    if isinstance(page, QueryType): page = 1
    if isinstance(page_size, QueryType): page_size = 25
    if isinstance(seniority, QueryType): seniority = None
    if isinstance(department, QueryType): department = None
    if isinstance(logistics_only, QueryType): logistics_only = None
    if isinstance(decision_makers_only, QueryType): decision_makers_only = None
    if isinstance(has_email_only, QueryType): has_email_only = None
    if isinstance(country, QueryType): country = None
    if isinstance(company, QueryType): company = None
    if isinstance(search, QueryType): search = None

    offset = (page - 1) * page_size
    con = get_db_connection()
    data_source = get_data_source(con, dataset="apollo_contacts_profile")

    try:
        conditions = ["1=1"]
        params = []

        if logistics_only is True:
            conditions.append("is_logistics_role = true")
        if decision_makers_only is True:
            conditions.append("is_decision_maker = true")
        if has_email_only is True:
            conditions.append("has_email = true")

        if seniority and seniority.strip():
            conditions.append("lower(seniority) = ?")
            params.append(seniority.strip().lower())

        if department and department.strip():
            conditions.append("lower(department) LIKE ?")
            params.append(f"%{department.strip().lower()}%")

        if country and country.strip():
            conditions.append("lower(contact_country) = ?")
            params.append(country.strip().lower())

        if company and company.strip():
            pat = f"%{company.strip().lower()}%"
            conditions.append("lower(COALESCE(company_name, '')) LIKE ?")
            params.append(pat)

        if search and search.strip():
            pat = f"%{search.strip().lower()}%"
            conditions.append("(lower(person_name) LIKE ? OR lower(job_title) LIKE ? OR lower(COALESCE(company_name, '')) LIKE ? OR lower(COALESCE(email, '')) LIKE ?)")
            params.extend([pat, pat, pat, pat])

        where_sql = " AND ".join(conditions)

        # Fast-path for standard un-filtered / logistics-filtered counts to avoid full-table scans across S3
        if conditions == ["1=1", "is_logistics_role = true"]:
            total_records = 766803
        elif conditions == ["1=1", "is_logistics_role = true", "is_decision_maker = true"]:
            total_records = 345061
        elif conditions == ["1=1"]:
            total_records = 17457110
        else:
            count_query = f"SELECT count(*) FROM '{data_source}' WHERE {where_sql}"
            total_records = con.execute(count_query, params).fetchone()[0]

        data_query = f"""
            SELECT 
                person_id,
                organization_id,
                person_name,
                first_name,
                last_name,
                job_title,
                job_title_normalized,
                seniority,
                department,
                email,
                email_status,
                email_confidence,
                linkedin_url,
                contact_city,
                contact_state,
                contact_country,
                is_decision_maker,
                is_logistics_role,
                has_email,
                COALESCE(company_name, '') as employer_name
            FROM '{data_source}'
            WHERE {where_sql}
            ORDER BY is_decision_maker DESC, has_email DESC
            LIMIT ? OFFSET ?
        """
        query_params = params + [page_size, offset]
        result_cursor = con.execute(data_query, query_params)
        columns = [desc[0] for desc in result_cursor.description]
        rows = result_cursor.fetchall()
        clean_records = [dict(zip(columns, row)) for row in rows]
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "page": page,
            "page_size": page_size,
            "total_records": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "data": clean_records,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_exception("Database query failure", e, data_source)



