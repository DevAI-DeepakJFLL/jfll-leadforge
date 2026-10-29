"""Isolated API router for Tier A / Tier B lead segmentation.
Directly implements Section 1, 6, 7, and 10 of tier_segmentation_spec.md.
Cleanly decoupled from core leads, datamyne, and apollo endpoints.
"""
import uuid
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query

from src.api.config import settings
from src.api.database import get_cached_parquet_path, get_db_connection
from src.api.helpers import require_auth
from src.api.logger import logger
from src.services.tier_scoring_engine import evaluate_capacity_threshold

tier_router = APIRouter(prefix="/api/v1/tiers", tags=["Tier Segmentation"])


def _handle_tier_exception(context_msg: str, err: Exception) -> HTTPException:
    incident_id = str(uuid.uuid4())[:8]
    logger.error(f"[Incident {incident_id}] {context_msg}: {err}", exc_info=True)
    if settings.env == "production":
        return HTTPException(
            status_code=500,
            detail=f"{context_msg}. Please reference incident {incident_id}",
        )
    return HTTPException(status_code=500, detail=f"{context_msg}: {err!s}")


def _format_score_breakdown(record: dict[str, Any], pop: bool = False) -> dict[str, int]:
    """Helper to assemble structured score breakdown dictionary from flat row."""
    extractor = record.pop if pop else record.get
    return {
        "frequency_score": extractor("frequency_score", 0),
        "freight_control_score": extractor("freight_control_score", 0),
        "lane_score": extractor("lane_score", 0),
        "commodity_score": extractor("commodity_score", 0),
        "mode_score": extractor("mode_score", 0),
        "volume_trend_score": extractor("volume_trend_score", 0),
        "recency_score": extractor("recency_score", 0),
        "regulated_plant_bonus": extractor("regulated_plant_bonus", 0),
        "cluster_bonus": extractor("cluster_bonus", 0),
    }


def _build_tier_filter_conditions(
    status: str | None = None,
    search: str | None = None,
    min_score: int | None = None,
    max_score: int | None = None,
    categories: list[str] | None = None,
    category: str | None = None,
    subcategories: list[str] | None = None,
    subcategory: str | None = None,
    cities: list[str] | None = None,
    city: str | None = None,
    countries: list[str] | None = None,
    country: str | None = None,
    transport_modes: list[str] | None = None,
    transport_mode: str | None = None,
    roles: list[str] | None = None,
    role: str | None = None,
    trade_lanes: list[str] | None = None,
    contact_status: list[str] | None = None,
    min_shipments: int | None = None,
    min_value: float | None = None,
    has_directors: bool | None = None,
    dataset: str | None = None,
) -> tuple[list[str], list[Any]]:
    """Build parameterized WHERE clauses for combined status and Datamyne faceted filters."""
    conditions = ["1=1"]
    params: list[Any] = []

    if status and status.strip() and status.strip().lower() != "all":
        clean_status = status.strip()
        if clean_status.lower() in ("tier a", "tier_a", "tier-a"):
            clean_status = "Tier A"
        elif clean_status.lower() in ("tier b", "tier_b", "tier-b"):
            clean_status = "Tier B"
        elif clean_status.lower() == "parked":
            clean_status = "Parked"
        elif clean_status.lower() == "excluded":
            clean_status = "Excluded"
        elif clean_status.lower() == "unscored":
            clean_status = "Unscored"
        conditions.append("t.segment_status = ?")
        params.append(clean_status)

    if min_score is not None:
        conditions.append("t.total_score >= ?")
        params.append(min_score)

    if max_score is not None:
        conditions.append("t.total_score <= ?")
        params.append(max_score)

    if search and search.strip():
        pat = f"%{search.strip().lower()}%"
        conditions.append(
            "(lower(d.company_name) LIKE ? OR lower(d.city) LIKE ? OR lower(d.category) LIKE ? OR lower(d.subcategory) LIKE ? OR lower(d.top_hs_codes) LIKE ? OR lower(d.address) LIKE ?)"
        )
        params.extend([pat, pat, pat, pat, pat, pat])

    # Categories
    all_cats: list[str] = []
    if categories:
        all_cats.extend(categories if isinstance(categories, list) else [categories])
    if category and category not in all_cats:
        all_cats.append(category)
    flat_cats = []
    for c in all_cats:
        if isinstance(c, str):
            flat_cats.extend([x.strip() for x in c.split(",") if x.strip()])
    if flat_cats:
        placeholders = ", ".join(["?"] * len(flat_cats))
        conditions.append(f"d.category IN ({placeholders})")
        params.extend(flat_cats)

    # Subcategories
    all_subs: list[str] = []
    if subcategories:
        all_subs.extend(subcategories if isinstance(subcategories, list) else [subcategories])
    if subcategory and subcategory not in all_subs:
        all_subs.append(subcategory)
    flat_subs = []
    for s in all_subs:
        if isinstance(s, str):
            flat_subs.extend([x.strip() for x in s.split(",") if x.strip()])
    if flat_subs:
        placeholders = ", ".join(["?"] * len(flat_subs))
        conditions.append(f"d.subcategory IN ({placeholders})")
        params.extend(flat_subs)

    # Cities (normalized matching for hub aliases)
    all_cities: list[str] = []
    if cities:
        all_cities.extend(cities if isinstance(cities, list) else [cities])
    if city and city not in all_cities:
        all_cities.append(city)
    flat_cities = []
    for ct in all_cities:
        if isinstance(ct, str):
            flat_cities.extend([x.strip() for x in ct.split(",") if x.strip()])
    if flat_cities:
        city_clauses = []
        for c in flat_cities:
            city_clauses.append("lower(d.city) LIKE ?")
            params.append(f"%{c.lower()}%")
        conditions.append(f"({' OR '.join(city_clauses)})")

    # Countries
    all_countries: list[str] = []
    if countries:
        all_countries.extend(countries if isinstance(countries, list) else [countries])
    if country and country not in all_countries:
        all_countries.append(country)
    flat_countries = []
    for c in all_countries:
        if isinstance(c, str):
            flat_countries.extend([x.strip() for x in c.split(",") if x.strip()])
    if flat_countries:
        placeholders = ", ".join(["?"] * len(flat_countries))
        conditions.append(f"COALESCE(d.country, 'India') IN ({placeholders})")
        params.extend(flat_countries)

    # Transport Modes
    all_modes: list[str] = []
    if transport_modes:
        all_modes.extend(transport_modes if isinstance(transport_modes, list) else [transport_modes])
    if transport_mode and transport_mode not in all_modes:
        all_modes.append(transport_mode)
    flat_modes = []
    for m in all_modes:
        if isinstance(m, str):
            flat_modes.extend([x.strip() for x in m.split(",") if x.strip()])
    if flat_modes:
        placeholders = ", ".join(["?"] * len(flat_modes))
        conditions.append(f"d.transport_mode IN ({placeholders})")
        params.extend(flat_modes)

    # Roles
    all_roles: list[str] = []
    if roles:
        all_roles.extend(roles if isinstance(roles, list) else [roles])
    if role and role not in all_roles:
        all_roles.append(role)
    flat_roles = []
    for r in all_roles:
        if isinstance(r, str):
            flat_roles.extend([x.strip() for x in r.split(",") if x.strip()])
    if flat_roles:
        has_exp = "Exporter" in flat_roles
        has_imp = "Importer" in flat_roles
        has_both = any(x in flat_roles for x in ("Both", "Both (Exporter & Importer)"))
        role_clauses = []
        if has_both:
            role_clauses.append("d.role IN ('Both', 'Both (Exporter & Importer)')")
        if has_exp:
            role_clauses.append("d.role = 'Exporter'")
            if has_imp:
                role_clauses.append("d.role IN ('Both', 'Both (Exporter & Importer)')")
        if has_imp:
            role_clauses.append("d.role = 'Importer'")
        if role_clauses:
            conditions.append(f"({' OR '.join(role_clauses)})")

    # Trade Lanes
    all_lanes: list[str] = []
    if trade_lanes:
        all_lanes.extend(trade_lanes if isinstance(trade_lanes, list) else [trade_lanes])
    flat_lanes = []
    for tl in all_lanes:
        if isinstance(tl, str):
            flat_lanes.extend([x.strip() for x in tl.split(",") if x.strip()])
    if flat_lanes:
        lane_clauses = []
        for lane in flat_lanes:
            lane_clauses.append("d.trade_lanes LIKE ?")
            params.append(f"%{lane}%")
        conditions.append(f"({' OR '.join(lane_clauses)})")

    # Contact Status
    all_contacts: list[str] = []
    if contact_status:
        all_contacts.extend(contact_status if isinstance(contact_status, list) else [contact_status])
    flat_contacts = []
    for cs in all_contacts:
        if isinstance(cs, str):
            flat_contacts.extend([x.strip() for x in cs.split(",") if x.strip()])
    if flat_contacts:
        contact_clauses = []
        if "both" in flat_contacts:
            contact_clauses.append("(d.phone IS NOT NULL AND d.phone != '' AND d.email IS NOT NULL AND d.email != '')")
        if "phone_only" in flat_contacts:
            contact_clauses.append("(d.phone IS NOT NULL AND d.phone != '' AND (d.email IS NULL OR d.email = ''))")
        if "email_only" in flat_contacts:
            contact_clauses.append("((d.phone IS NULL OR d.phone = '') AND d.email IS NOT NULL AND d.email != '')")
        if "missing" in flat_contacts:
            contact_clauses.append("((d.phone IS NULL OR d.phone = '') AND (d.email IS NULL OR d.email = ''))")
        if contact_clauses:
            conditions.append(f"({' OR '.join(contact_clauses)})")

    # Volume & Value Thresholds
    if min_shipments is not None and min_shipments > 0:
        conditions.append("d.total_shipments >= ?")
        params.append(min_shipments)

    if min_value is not None and min_value > 0:
        conditions.append("d.total_value_usd >= ?")
        params.append(min_value)

    # Has Directors
    if has_directors:
        conditions.append("d.directors IS NOT NULL AND trim(d.directors) != ''")

    # Dataset Type
    if dataset and dataset != "all":
        conditions.append("d.dataset_type = ?")
        params.append(dataset)

    return conditions, params


@tier_router.get("/counts", summary="Get Tier A/B status counts and capacity telemetry")
def get_tier_counts(
    search: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=100),
    max_score: int | None = Query(default=None, ge=0, le=100),
    categories: list[str] | None = Query(default=None),
    category: str | None = Query(default=None),
    subcategories: list[str] | None = Query(default=None),
    subcategory: str | None = Query(default=None),
    cities: list[str] | None = Query(default=None),
    city: str | None = Query(default=None),
    countries: list[str] | None = Query(default=None),
    country: str | None = Query(default=None),
    transport_modes: list[str] | None = Query(default=None),
    transport_mode: str | None = Query(default=None),
    roles: list[str] | None = Query(default=None),
    role: str | None = Query(default=None),
    trade_lanes: list[str] | None = Query(default=None),
    contact_status: list[str] | None = Query(default=None),
    min_shipments: int | None = Query(default=None),
    min_value: float | None = Query(default=None),
    has_directors: bool | None = Query(default=None),
    dataset: str | None = Query(default=None),
    authorization: str | None = Header(None, description="Optional bearer token for authenticated session"),
) -> dict[str, Any]:
    """Returns real-time distribution across Tier A, Tier B, Parked, Excluded, and Unscored."""
    require_auth(authorization, "tiered leads")
    try:
        dm_path = get_cached_parquet_path("datamyne")
        tier_path = get_cached_parquet_path("datamyne_tiers")
        con = get_db_connection()

        conditions, params = _build_tier_filter_conditions(
            status=None,
            search=search,
            min_score=min_score,
            max_score=max_score,
            categories=categories,
            category=category,
            subcategories=subcategories,
            subcategory=subcategory,
            cities=cities,
            city=city,
            countries=countries,
            country=country,
            transport_modes=transport_modes,
            transport_mode=transport_mode,
            roles=roles,
            role=role,
            trade_lanes=trade_lanes,
            contact_status=contact_status,
            min_shipments=min_shipments,
            min_value=min_value,
            has_directors=has_directors,
            dataset=dataset,
        )
        where_clause = " AND ".join(conditions)

        if where_clause == "1=1":
            # Fast path: compute breakdown directly without joining trade leads parquet
            query = f"""
                SELECT 
                    segment_status,
                    count(*) as count
                FROM '{tier_path}'
                GROUP BY segment_status
            """
            rows = con.execute(query).fetchall()
        else:
            query = f"""
                SELECT 
                    t.segment_status,
                    count(*) as count
                FROM '{dm_path}' d
                JOIN '{tier_path}' t ON d.id = t.id
                WHERE {where_clause}
                GROUP BY t.segment_status
            """
            rows = con.execute(query, params).fetchall()
        counts_map = {r[0]: r[1] for r in rows}

        tier_a = counts_map.get("Tier A", 0)
        tier_b = counts_map.get("Tier B", 0)
        parked = counts_map.get("Parked", 0)
        excluded = counts_map.get("Excluded", 0)
        unscored = counts_map.get("Unscored", 0)
        all_count = tier_a + tier_b + parked + excluded + unscored

        capacity_info = evaluate_capacity_threshold(counts_map)

        return {
            "tier_a": tier_a,
            "tier_b": tier_b,
            "parked": parked,
            "excluded": excluded,
            "unscored": unscored,
            "all": all_count,
            "capacity": capacity_info,
        }
    except Exception as e:
        raise _handle_tier_exception("Failed to compute tier counts", e)


@tier_router.get("/leads", summary="Query paginated leads enriched with Tier A/B scoring")
def get_tier_leads(
    status: str | None = Query(default=None, description="Filter: 'Tier A', 'Tier B', 'Parked', 'Excluded', 'Unscored', or None for all"),
    search: str | None = Query(default=None, description="Search company name or city"),
    min_score: int | None = Query(default=None, ge=0, le=100),
    max_score: int | None = Query(default=None, ge=0, le=100),
    categories: list[str] | None = Query(default=None),
    category: str | None = Query(default=None),
    subcategories: list[str] | None = Query(default=None),
    subcategory: str | None = Query(default=None),
    cities: list[str] | None = Query(default=None),
    city: str | None = Query(default=None),
    countries: list[str] | None = Query(default=None),
    country: str | None = Query(default=None),
    transport_modes: list[str] | None = Query(default=None),
    transport_mode: str | None = Query(default=None),
    roles: list[str] | None = Query(default=None),
    role: str | None = Query(default=None),
    trade_lanes: list[str] | None = Query(default=None),
    contact_status: list[str] | None = Query(default=None),
    min_shipments: int | None = Query(default=None),
    min_value: float | None = Query(default=None),
    has_directors: bool | None = Query(default=None),
    dataset: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    authorization: str | None = Header(None, description="Optional bearer token for authenticated session"),
):
    """Returns paginated DataMyne leads joined with their Tier A / Tier B score breakdown."""
    require_auth(authorization, "tiered leads")
    try:
        dm_path = get_cached_parquet_path("datamyne")
        tier_path = get_cached_parquet_path("datamyne_tiers")
        con = get_db_connection()

        conditions, params = _build_tier_filter_conditions(
            status=status,
            search=search,
            min_score=min_score,
            max_score=max_score,
            categories=categories,
            category=category,
            subcategories=subcategories,
            subcategory=subcategory,
            cities=cities,
            city=city,
            countries=countries,
            country=country,
            transport_modes=transport_modes,
            transport_mode=transport_mode,
            roles=roles,
            role=role,
            trade_lanes=trade_lanes,
            contact_status=contact_status,
            min_shipments=min_shipments,
            min_value=min_value,
            has_directors=has_directors,
            dataset=dataset,
        )

        where_clause = " AND ".join(conditions)

        count_query = f"""
            SELECT count(*) 
            FROM '{dm_path}' d
            JOIN '{tier_path}' t ON d.id = t.id
            WHERE {where_clause}
        """
        total_records = con.execute(count_query, params).fetchone()[0]

        offset = (page - 1) * page_size
        data_query = f"""
            SELECT 
                d.id,
                d.company_name,
                d.role,
                d.transport_mode,
                d.category,
                d.subcategory,
                d.contact_type,
                d.phone,
                d.email,
                d.tax_id,
                d.city,
                d.address,
                d.pin_code,
                d.directors,
                d.trade_lanes,
                d.top_hs_codes,
                d.total_shipments,
                d.total_value_usd,
                d.latest_activity_date,
                d.dataset_type,
                t.segment_status,
                t.tier_reason,
                t.total_score,
                t.base_score,
                t.bonus_points,
                t.frequency_score,
                t.freight_control_score,
                t.lane_score,
                t.commodity_score,
                t.mode_score,
                t.volume_trend_score,
                t.recency_score,
                t.regulated_plant_bonus,
                t.cluster_bonus,
                t.missing_fields,
                t.scored_at,
                t.rules_version
            FROM '{dm_path}' d
            JOIN '{tier_path}' t ON d.id = t.id
            WHERE {where_clause}
            ORDER BY t.total_score DESC, d.total_shipments DESC
            LIMIT ? OFFSET ?
        """
        cursor = con.execute(data_query, params + [page_size, offset])
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()

        items = []
        for row in rows:
            record = dict(zip(columns, row))
            record["score_breakdown"] = _format_score_breakdown(record, pop=True)
            items.append(record)

        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

        return {
            "page": page,
            "page_size": page_size,
            "total": total_records,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "items": items,
        }
    except Exception as e:
        raise _handle_tier_exception("Failed to query tiered leads", e)


@tier_router.get("/{lead_id}/breakdown", summary="Get detailed score breakdown for a lead")
def get_lead_score_breakdown(
    lead_id: str,
    authorization: str | None = Header(None, description="Optional bearer token for authenticated session"),
) -> dict[str, Any]:
    """Returns the full criterion-by-criterion score audit for a single lead."""
    require_auth(authorization, "tiered leads")
    try:
        tier_path = get_cached_parquet_path("datamyne_tiers")
        dm_path = get_cached_parquet_path("datamyne")
        con = get_db_connection()

        query = f"""
            SELECT 
                t.*,
                d.category,
                d.subcategory,
                d.transport_mode,
                d.trade_lanes,
                d.total_shipments,
                d.latest_activity_date,
                d.city
            FROM '{tier_path}' t
            JOIN '{dm_path}' d ON t.id = d.id
            WHERE t.id = ?
            LIMIT 1
        """
        cursor = con.execute(query, [lead_id])
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Lead with id '{lead_id}' not found")

        columns = [desc[0] for desc in cursor.description]
        record = dict(zip(columns, row))
        record["score_breakdown"] = _format_score_breakdown(record, pop=False)
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_tier_exception(f"Failed to fetch score breakdown for {lead_id}", e)
