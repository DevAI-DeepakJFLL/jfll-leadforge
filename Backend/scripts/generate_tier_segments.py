"""Batch script to generate Tier A / Tier B segmentation for all DataMyne leads.
Saves the results to an isolated companion Parquet file: Backend/data/processed/datamyne_tier_segments_zstd.parquet.
Preserves the base datamyne dataset 100% untouched.
"""
import sys
from pathlib import Path
from datetime import date
import duckdb

# Add backend root to path
backend_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root))

from src.services.tier_scoring_engine import score_lead_record, evaluate_capacity_threshold
from src.core.tier_rules_config import DEFAULT_TIER_CONFIG


def run_batch_segmentation():
    data_dir = backend_root / "data" / "processed"
    datamyne_path = data_dir / "datamyne_leads_zstd.parquet"
    active_cust_path = data_dir / "active_customers_leads_zstd.parquet"
    output_path = data_dir / "datamyne_tier_segments_zstd.parquet"

    print(f"Connecting to DuckDB...")
    con = duckdb.connect()

    # Load existing customer names for exclusion rule
    print(f"Loading existing customers from {active_cust_path}...")
    existing_customers = set()
    if active_cust_path.exists():
        rows = con.execute(f"SELECT DISTINCT lower(trim(\"Full Name\")) FROM '{active_cust_path}' WHERE \"Full Name\" IS NOT NULL").fetchall()
        existing_customers = {r[0] for r in rows if r[0]}
    print(f"Loaded {len(existing_customers):,} existing customer names for exclusion check.")

    # Query DataMyne leads
    print(f"Reading DataMyne leads from {datamyne_path}...")
    dm_leads = con.execute(f"""
        SELECT 
            id,
            company_name,
            transport_mode,
            category,
            subcategory,
            city,
            trade_lanes,
            top_hs_codes,
            total_shipments,
            total_value_usd,
            latest_activity_date
        FROM '{datamyne_path}'
    """).fetchall()
    
    total_leads = len(dm_leads)
    print(f"Evaluating {total_leads:,} DataMyne leads against JFLL SOP scoring rules...")

    eval_date = date.today()
    scored_records = []
    status_counts = {"Tier A": 0, "Tier B": 0, "Parked": 0, "Excluded": 0, "Unscored": 0}

    for row in dm_leads:
        (
            lead_id,
            company_name,
            transport_mode,
            category,
            subcategory,
            city,
            trade_lanes,
            top_hs_codes,
            total_shipments,
            total_value_usd,
            latest_activity_date,
        ) = row

        comp_clean = (company_name or "").strip().lower()
        is_existing = comp_clean in existing_customers

        lead_dict = {
            "company_name": company_name,
            "city": city,
            "data_source": "datamyne",
            "lane": trade_lanes or "GCR/Air",
            "mode": transport_mode or "Air",
            "commodity": category,
            "subcategory": subcategory,
            "top_hs_codes": top_hs_codes,
            "shipments_12m": total_shipments or 0,
            "last_shipment_date": latest_activity_date,
            "is_existing_customer": is_existing,
            "is_competitor_forwarder": False,
            "is_strategic_account": False,
        }

        res = score_lead_record(
            lead_dict,
            existing_customer_names=existing_customers,
            evaluation_date=eval_date,
            config=DEFAULT_TIER_CONFIG,
        )

        status_counts[res.segment_status] = status_counts.get(res.segment_status, 0) + 1
        bd = res.score_breakdown or {}

        scored_records.append({
            "id": lead_id,
            "company_name": company_name,
            "segment_status": res.segment_status,
            "tier_reason": res.tier_reason,
            "total_score": res.total_score,
            "base_score": res.base_score,
            "bonus_points": res.bonus_points,
            "frequency_score": bd.get("frequency_score", 0),
            "freight_control_score": bd.get("freight_control_score", 0),
            "lane_score": bd.get("lane_score", 0),
            "commodity_score": bd.get("commodity_score", 0),
            "mode_score": bd.get("mode_score", 0),
            "volume_trend_score": bd.get("volume_trend_score", 0),
            "recency_score": bd.get("recency_score", 0),
            "regulated_plant_bonus": bd.get("regulated_plant_bonus", 0),
            "cluster_bonus": bd.get("cluster_bonus", 0),
            "missing_fields": ",".join(res.missing_fields),
            "scored_at": res.scored_at,
            "rules_version": res.rules_version,
        })

    print(f"\n=== SEGMENTATION DISTRIBUTION ===")
    for status, count in status_counts.items():
        pct = (count / total_leads) * 100
        print(f"  {status:12}: {count:6,} ({pct:5.1f}%)")

    capacity_report = evaluate_capacity_threshold(status_counts)
    print(f"\n=== CAPACITY CHECK ===")
    print(f"  Tier A share among scored: {capacity_report['tier_a_percentage']}% (Guideline: 10-20%)")
    print(f"  Exceeds guideline: {capacity_report['exceeds_guideline']}")
    print(f"  Suggested cutoff: {capacity_report['suggested_cutoff']}")

    # Create table directly in DuckDB
    con.execute("""
        CREATE OR REPLACE TABLE tier_segments (
            id VARCHAR,
            company_name VARCHAR,
            segment_status VARCHAR,
            tier_reason VARCHAR,
            total_score INTEGER,
            base_score INTEGER,
            bonus_points INTEGER,
            frequency_score INTEGER,
            freight_control_score INTEGER,
            lane_score INTEGER,
            commodity_score INTEGER,
            mode_score INTEGER,
            volume_trend_score INTEGER,
            recency_score INTEGER,
            regulated_plant_bonus INTEGER,
            cluster_bonus INTEGER,
            missing_fields VARCHAR,
            scored_at VARCHAR,
            rules_version VARCHAR
        )
    """)
    
    con.executemany("""
        INSERT INTO tier_segments VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    """, [
        (
            r["id"], r["company_name"], r["segment_status"], r["tier_reason"],
            r["total_score"], r["base_score"], r["bonus_points"],
            r["frequency_score"], r["freight_control_score"], r["lane_score"],
            r["commodity_score"], r["mode_score"], r["volume_trend_score"],
            r["recency_score"], r["regulated_plant_bonus"], r["cluster_bonus"],
            r["missing_fields"], r["scored_at"], r["rules_version"]
        ) for r in scored_records
    ])

    con.execute(f"""
        COPY tier_segments TO '{output_path}' (FORMAT 'PARQUET', CODEC 'ZSTD')
    """)
    print(f"Successfully generated {output_path} with {len(scored_records):,} records.")


if __name__ == "__main__":
    run_batch_segmentation()
