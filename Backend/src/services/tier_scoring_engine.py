"""Pure scoring engine for Tier A / Tier B lead segmentation.
Implements the business logic specified in the JFLL Lead Generation SOP (Oct 9, 2026).
"""
import re
from datetime import date, datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from src.core.tier_rules_config import TierRulesConfig, DEFAULT_TIER_CONFIG


@dataclass
class TierScoringRecord:
    company_name: str
    segment_status: str  # 'Tier A' | 'Tier B' | 'Parked' | 'Excluded' | 'Unscored'
    tier_reason: str     # 'score' | 'strategic_override' | 'existing_customer' | 'competitor_forwarder' | 'manual'
    total_score: int
    base_score: int
    bonus_points: int
    score_breakdown: Dict[str, int]
    missing_fields: List[str]
    scored_at: str
    rules_version: str
    notice: Optional[str] = None


def check_required_fields(
    lead: Dict[str, Any],
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> List[str]:
    """Checks if all required fields are present and non-empty.
    Section 3: A blank or None is_existing_customer counts as missing, not as false.
    """
    missing = []
    for f in config.required_fields:
        val = lead.get(f)
        if val is None:
            missing.append(f)
        elif isinstance(val, str) and not val.strip():
            missing.append(f)
        elif f == "is_existing_customer" and val is None:
            missing.append(f)
    return missing


def check_exclusions(
    lead: Dict[str, Any],
    existing_customer_names: Optional[set] = None,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> Tuple[bool, Optional[str]]:
    """Checks exclusions before scoring.
    1. Existing customer -> Excluded, reason: existing_customer
    2. Competitor forwarder -> Excluded, reason: competitor_forwarder
    """
    # 1. Existing customer flag
    if lead.get("is_existing_customer") is True:
        return True, "existing_customer"
    
    comp_name = (lead.get("company_name") or "").strip().lower()
    if existing_customer_names and comp_name in existing_customer_names:
        return True, "existing_customer"

    # 2. Competitor forwarder flag or lookup
    if lead.get("is_competitor_forwarder") is True:
        return True, "competitor_forwarder"

    for competitor in config.competitor_forwarders:
        if competitor in comp_name:
            return True, "competitor_forwarder"

    return False, None


def calculate_shipment_frequency_score(
    shipments_12m: int,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.1 Shipment frequency (max 20 points)."""
    for tier in config.frequency_tiers:
        if shipments_12m >= tier["min"]:
            return tier["points"]
    return 0


def calculate_freight_control_score(
    incoterm_raw: Optional[str],
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.2 Freight control Incoterms (max 15 points)."""
    if not incoterm_raw or not str(incoterm_raw).strip():
        return config.incoterm_points["mixed_or_unknown"]  # 8 pts for missing/unknown

    raw_clean = str(incoterm_raw).upper()
    tokens = [term.strip() for term in re.split(r"[,/ ]+", raw_clean) if term.strip()]

    has_exporter = any(t in config.exporter_controlled_incoterms for t in tokens)
    has_buyer = any(t in config.buyer_controlled_incoterms for t in tokens)

    if "MIXED" in tokens:
        return config.incoterm_points["mixed_or_unknown"]
    if has_exporter and not has_buyer:
        return config.incoterm_points["exporter"]  # 15 pts
    if has_buyer and not has_exporter:
        return config.incoterm_points["buyer_only"]  # 0 pts
    
    return config.incoterm_points["mixed_or_unknown"]  # 8 pts


def calculate_lane_score(
    lane_raw: Optional[str],
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.3 Lane fit (max 15 points)."""
    if not lane_raw:
        return 0
    clean_lane = str(lane_raw).strip().lower()

    if any(k in clean_lane for k in config.tier1_lanes):
        return 15
    if any(k in clean_lane for k in config.tier2_lanes):
        return 9
    if any(k in clean_lane for k in config.served_lanes_keywords):
        return 4
    return 0


def calculate_commodity_score(
    commodity_raw: Optional[str],
    subcategory_raw: Optional[str] = None,
    hs_codes_raw: Optional[str] = None,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.4 Commodity fit (max 15 points)."""
    text_corpus = f"{commodity_raw or ''} {subcategory_raw or ''} {hs_codes_raw or ''}".lower()

    if any(bulk in text_corpus for bulk in config.bulk_commodities):
        return 0
    if any(k in text_corpus for k in config.tier1_commodities):
        return 15
    if any(k in text_corpus for k in config.tier2_commodities):
        return 8

    # Default assumption for unclassified cargo
    return 8 if "high-value" in text_corpus else 0


def calculate_mode_score(
    mode_raw: Optional[str],
    air_suitable: Optional[bool] = False,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.5 Mode score (max 15 points)."""
    if not mode_raw:
        return 0
    clean_mode = str(mode_raw).strip().lower()

    if "air" in clean_mode:
        return 15
    if "ocean" in clean_mode:
        if air_suitable is True:
            return 8
        return 0
    return 0


def calculate_volume_trend_score(
    prior_6m: Optional[float] = None,
    recent_6m: Optional[float] = None,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.6 Volume trend (max 10 points)."""
    if prior_6m is None or recent_6m is None:
        return 5  # No earlier data to compare scores 5 (Flat)

    if prior_6m == 0:
        return 10 if recent_6m > 0 else 5

    pct_change = (recent_6m - prior_6m) / prior_6m
    if pct_change > 0.10:
        return 10  # Up
    elif pct_change >= -0.10:
        return 5   # Flat (+/- 10%)
    else:
        return 0   # Falling


def calculate_recency_score(
    days_since_last_shipment: int,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> int:
    """5.7 Recency score (max 10 points)."""
    for tier in config.recency_tiers:
        if days_since_last_shipment <= tier["max_days"]:
            return tier["points"]
    return 0


def calculate_days_since(
    last_date_str: str,
    evaluation_date: Optional[date] = None
) -> int:
    """Computes days from shipment date to evaluation date."""
    if evaluation_date is None:
        evaluation_date = date.today()

    clean_str = str(last_date_str).strip()
    # Try YYYY-MM-DD
    dt = None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(clean_str, fmt).date()
            break
        except ValueError:
            continue

    if not dt:
        return 999999
    return max(0, (evaluation_date - dt).days)


def calculate_bonuses(
    lead: Dict[str, Any],
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> Tuple[int, Dict[str, int]]:
    """5.8 Bonuses (+5 regulated plant, +5 branch cluster match)."""
    bonuses = {"regulated_plant_bonus": 0, "cluster_bonus": 0}

    # 1. Regulated plant bonus
    status = str(lead.get("regulated_plant_status") or "").lower()
    if status in ("us_fda", "who_gmp", "fda", "gmp"):
        bonuses["regulated_plant_bonus"] = config.regulated_plant_bonus

    # 2. Branch cluster match bonus
    city_str = str(lead.get("city") or "").lower()
    if any(cluster in city_str for cluster in config.eligible_branch_clusters):
        bonuses["cluster_bonus"] = config.cluster_bonus

    total_bonus = sum(bonuses.values())
    return total_bonus, bonuses


def calculate_tier_status(
    total_score: int,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> str:
    """6. Tier mapping based on cutoffs."""
    if total_score >= config.tier_a_min:
        return "Tier A"
    elif total_score >= config.tier_b_min:
        return "Tier B"
    return "Parked"


def score_lead_record(
    lead: Dict[str, Any],
    existing_customer_names: Optional[set] = None,
    evaluation_date: Optional[date] = None,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> TierScoringRecord:
    """Full end-to-end evaluation of a lead record according to SOP Stage 2.
    Checks:
    1. Required fields -> Unscored
    2. Exclusions -> Excluded
    3. Calculate 7 criteria + 2 bonuses -> Capped Total
    4. Map Tier Status & check Strategic Override
    """
    comp_name = str(lead.get("company_name") or "Unknown")
    now_str = datetime.now().isoformat()

    # Step 1: Check required fields
    missing = check_required_fields(lead, config=config)
    if missing:
        return TierScoringRecord(
            company_name=comp_name,
            segment_status="Unscored",
            tier_reason="missing_required_fields",
            total_score=0,
            base_score=0,
            bonus_points=0,
            score_breakdown={},
            missing_fields=missing,
            scored_at=now_str,
            rules_version=config.version,
            notice=f"Missing fields: {', '.join(missing)}",
        )

    # Step 2: Check exclusions
    is_excluded, exclude_reason = check_exclusions(
        lead,
        existing_customer_names=existing_customer_names,
        config=config,
    )
    if is_excluded:
        return TierScoringRecord(
            company_name=comp_name,
            segment_status="Excluded",
            tier_reason=exclude_reason or "manual",
            total_score=0,
            base_score=0,
            bonus_points=0,
            score_breakdown={},
            missing_fields=[],
            scored_at=now_str,
            rules_version=config.version,
        )

    # Step 3: Scoring criteria
    freq_score = calculate_shipment_frequency_score(int(lead.get("shipments_12m") or 0), config)
    incoterm_score = calculate_freight_control_score(lead.get("incoterm_set"), config)
    lane_score = calculate_lane_score(lead.get("lane"), config)
    commodity_score = calculate_commodity_score(
        lead.get("commodity"),
        lead.get("subcategory"),
        lead.get("top_hs_codes"),
        config,
    )
    mode_score = calculate_mode_score(
        lead.get("mode"),
        air_suitable=lead.get("air_suitable") is True,
        config=config,
    )

    prior_6m = lead.get("shipments_prior_6m")
    recent_6m = lead.get("shipments_recent_6m")
    volume_score = calculate_volume_trend_score(prior_6m, recent_6m, config)

    days_since = calculate_days_since(str(lead.get("last_shipment_date")), evaluation_date)
    recency_score = calculate_recency_score(days_since, config)

    base_score = (
        freq_score
        + incoterm_score
        + lane_score
        + commodity_score
        + mode_score
        + volume_score
        + recency_score
    )

    bonus_pts, bonus_dict = calculate_bonuses(lead, config)
    total_score = min(100, base_score + bonus_pts)

    breakdown = {
        "frequency_score": freq_score,
        "freight_control_score": incoterm_score,
        "lane_score": lane_score,
        "commodity_score": commodity_score,
        "mode_score": mode_score,
        "volume_trend_score": volume_score,
        "recency_score": recency_score,
        "regulated_plant_bonus": bonus_dict["regulated_plant_bonus"],
        "cluster_bonus": bonus_dict["cluster_bonus"],
    }

    # Step 4: Tier status mapping & Strategic override check
    base_tier = calculate_tier_status(total_score, config)
    tier_reason = "score"
    notice = None

    if lead.get("is_strategic_account") is True:
        if config.strategic_override_min <= total_score <= config.strategic_override_max:
            base_tier = "Tier A"
            tier_reason = "strategic_override"
        elif total_score < config.strategic_override_min:
            notice = f"Strategic account below {config.strategic_override_min} cut-off; retained normal tier"

    return TierScoringRecord(
        company_name=comp_name,
        segment_status=base_tier,
        tier_reason=tier_reason,
        total_score=total_score,
        base_score=base_score,
        bonus_points=bonus_pts,
        score_breakdown=breakdown,
        missing_fields=[],
        scored_at=now_str,
        rules_version=config.version,
        notice=notice,
    )


def evaluate_capacity_threshold(
    status_counts: Dict[str, int],
    monthly_capacity: int = 150,
    config: TierRulesConfig = DEFAULT_TIER_CONFIG
) -> Dict[str, Any]:
    """6.2 Capacity check:
    Ensures Tier A represents approximately top 10% to 20% of scored list or stays within monthly capacity.
    """
    tier_a_count = status_counts.get("Tier A", 0)
    total_scored = (
        tier_a_count
        + status_counts.get("Tier B", 0)
        + status_counts.get("Parked", 0)
    )

    if total_scored == 0:
        return {
            "tier_a_count": 0,
            "tier_a_percentage": 0.0,
            "exceeds_guideline": False,
            "exceeds_capacity": False,
            "suggested_cutoff": config.tier_a_min,
        }

    tier_a_pct = (tier_a_count / total_scored) * 100.0
    exceeds_guideline = tier_a_pct > config.tier_a_max_percentage_guideline
    exceeds_capacity = tier_a_count > monthly_capacity

    suggested_cutoff = config.tier_a_min
    if exceeds_guideline or exceeds_capacity:
        suggested_cutoff = min(90, config.tier_a_min + 5)

    return {
        "tier_a_count": tier_a_count,
        "total_scored": total_scored,
        "tier_a_percentage": round(tier_a_pct, 1),
        "monthly_capacity": monthly_capacity,
        "exceeds_guideline": exceeds_guideline,
        "exceeds_capacity": exceeds_capacity,
        "suggested_cutoff": suggested_cutoff,
    }
