"""Isolated API router for Tier A / Tier B lead segmentation.
Directly implements Section 1, 6, 7, and 10 of tier_segmentation_spec.md.
Cleanly decoupled from core leads, datamyne, and apollo endpoints.
"""
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from src.api.config import settings
from src.api.database import get_db_connection, get_cached_parquet_path
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
    return HTTPException(status_code=500, detail=f"{context_msg}: {str(err)}")


@tier_router.get("/counts", summary="Get Tier A/B status counts and capacity telemetry")
def get_tier_counts():
    """Returns real-time distribution across Tier A, Tier B, Parked, Excluded, and Unscored."""
    try:
        tier_path = get_cached_parquet_path("datamyne_tiers")
        con = get_db_connection()
        query = f"""
            SELECT 
                segment_status,
                count(*) as count
            FROM '{tier_path}'
            GROUP BY segment_status
        """
        rows = con.execute(query).fetchall()
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
    status: Optional[str] = Query(default=None, description="Filter: 'Tier A', 'Tier B', 'Parked', 'Excluded', 'Unscored', or None for all"),
    search: Optional[str] = Query(default=None, description="Search company name or city"),
    min_score: Optional[int] = Query(default=None, ge=0, le=100),
    max_score: Optional[int] = Query(default=None, ge=0, le=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
):
    """Returns paginated DataMyne leads joined with their Tier A / Tier B score breakdown."""
    try:
        dm_path = get_cached_parquet_path("datamyne")
        tier_path = get_cached_parquet_path("datamyne_tiers")
        con = get_db_connection()

        conditions = ["1=1"]
        params = []

        if status and status.strip() and status.strip().lower() != "all":
            clean_status = status.strip()
            # Handle URL variations like 'tier-a' or 'Tier A'
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
            conditions.append("(lower(d.company_name) LIKE ? OR lower(d.city) LIKE ? OR lower(d.category) LIKE ?)")
            params.extend([pat, pat, pat])

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
            # Format score_breakdown as structured object for frontend
            record["score_breakdown"] = {
                "frequency_score": record.pop("frequency_score", 0),
                "freight_control_score": record.pop("freight_control_score", 0),
                "lane_score": record.pop("lane_score", 0),
                "commodity_score": record.pop("commodity_score", 0),
                "mode_score": record.pop("mode_score", 0),
                "volume_trend_score": record.pop("volume_trend_score", 0),
                "recency_score": record.pop("recency_score", 0),
                "regulated_plant_bonus": record.pop("regulated_plant_bonus", 0),
                "cluster_bonus": record.pop("cluster_bonus", 0),
            }
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
def get_lead_score_breakdown(lead_id: str):
    """Returns the full criterion-by-criterion score audit for a single lead."""
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
        record["score_breakdown"] = {
            "frequency_score": record.get("frequency_score", 0),
            "freight_control_score": record.get("freight_control_score", 0),
            "lane_score": record.get("lane_score", 0),
            "commodity_score": record.get("commodity_score", 0),
            "mode_score": record.get("mode_score", 0),
            "volume_trend_score": record.get("volume_trend_score", 0),
            "recency_score": record.get("recency_score", 0),
            "regulated_plant_bonus": record.get("regulated_plant_bonus", 0),
            "cluster_bonus": record.get("cluster_bonus", 0),
        }
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_tier_exception(f"Failed to fetch score breakdown for {lead_id}", e)
