"""Unit tests for Tier A / Tier B segmentation scoring engine.
Directly implements and verifies all test cases from Section 11 of tier_segmentation_spec.md.
"""
from datetime import date
import pytest
from src.services.tier_scoring_engine import (
    score_lead_record,
    calculate_shipment_frequency_score,
    calculate_recency_score,
    calculate_tier_status,
    check_required_fields,
    TierScoringRecord,
)
from src.core.tier_rules_config import DEFAULT_TIER_CONFIG


TEST_EVALUATION_DATE = date(2026, 10, 19)


def test_case_1_tier_a_full_pharma_air():
    """Case 1: 30 shipments, CIF/CFR, IN-US, pharma, air, volume up, 20 days ago, US FDA, Hyderabad."""
    lead = {
        "company_name": "Apex Pharma Labs Ltd",
        "website_or_domain": "apexpharma.com",
        "city": "Hyderabad, Telangana",
        "branch": "HYD",
        "data_source": "datamyne",
        "lane": "India to US",
        "mode": "air",
        "commodity": "pharma",
        "shipments_12m": 30,
        "shipments_prior_6m": 10,
        "shipments_recent_6m": 20,
        "last_shipment_date": "2026-09-29",  # 20 days prior to 2026-10-19
        "incoterm_set": "CIF, CFR",
        "regulated_plant_status": "us_fda",
        "is_existing_customer": False,
        "is_competitor_forwarder": False,
        "is_strategic_account": False,
    }
    result: TierScoringRecord = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.segment_status == "Tier A"
    assert result.base_score == 100
    assert result.bonus_points == 10
    assert result.total_score == 100  # Capped at 100
    assert result.score_breakdown["frequency_score"] == 20
    assert result.score_breakdown["freight_control_score"] == 15
    assert result.score_breakdown["lane_score"] == 15
    assert result.score_breakdown["commodity_score"] == 15
    assert result.score_breakdown["mode_score"] == 15
    assert result.score_breakdown["volume_trend_score"] == 10
    assert result.score_breakdown["recency_score"] == 10
    assert result.score_breakdown["regulated_plant_bonus"] == 5
    assert result.score_breakdown["cluster_bonus"] == 5


def test_case_2_tier_b_ocean_air_suitable():
    """Case 2: 14 shipments, FOB only, IN-UAE, high-value general, ocean air-suitable, flat, 90 days ago.
    12 + 0 + 15 + 8 + 8 + 5 + 5 = 53 -> Tier B.
    """
    lead = {
        "company_name": "Bharat Precision Goods",
        "website_or_domain": "bharatprecision.in",
        "city": "Bengaluru",
        "branch": "BLR",
        "data_source": "datamyne",
        "lane": "India to UAE",
        "mode": "ocean",
        "air_suitable": True,
        "commodity": "high-value general",
        "shipments_12m": 14,
        "shipments_prior_6m": 7,
        "shipments_recent_6m": 7,
        "last_shipment_date": "2026-07-21",  # 90 days prior to 2026-10-19
        "incoterm_set": "FOB",
        "regulated_plant_status": "none",
        "is_existing_customer": False,
        "is_competitor_forwarder": False,
        "is_strategic_account": False,
    }
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.base_score == 53
    assert result.bonus_points == 0
    assert result.total_score == 53
    assert result.segment_status == "Tier B"


def test_case_3_strategic_override_qualifies():
    """Case 3: Score 65, strategic account -> Tier A with strategic_override reason."""
    lead = {
        "company_name": "Strategic Logistics Partner",
        "website_or_domain": "strategiclogistics.com",
        "city": "Delhi",
        "branch": "DEL",
        "data_source": "datamyne",
        "lane": "India to US",  # 15
        "mode": "air",          # 15
        "commodity": "high-value general", # 8
        "shipments_12m": 14,    # 12
        "shipments_prior_6m": 7,
        "shipments_recent_6m": 7, # flat: 5
        "last_shipment_date": "2026-07-21", # 90 days: 5
        "incoterm_set": "FOB",  # 0
        "is_strategic_account": True,
        "is_existing_customer": False,
        "is_competitor_forwarder": False,
    }
    # Base: 15 + 15 + 8 + 12 + 5 + 5 + 0 = 60 to 69 range
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert 60 <= result.total_score <= 69
    assert result.segment_status == "Tier A"
    assert result.tier_reason == "strategic_override"


def test_case_4_strategic_override_below_60():
    """Case 4: Score 55, strategic account -> Keeps Tier B, flags notice."""
    lead = {
        "company_name": "Mid Tier Strategic Client",
        "website_or_domain": "midclient.com",
        "city": "Jaipur",
        "branch": "JAI",
        "data_source": "datamyne",
        "lane": "India to Latin America", # 9
        "mode": "ocean",
        "air_suitable": True,             # 8
        "commodity": "high-value general", # 8
        "shipments_12m": 14,              # 12
        "shipments_prior_6m": 7,
        "shipments_recent_6m": 7,         # flat: 5
        "last_shipment_date": "2026-06-01", # >120 days: 5
        "incoterm_set": "mixed",          # 8
        "is_strategic_account": True,
        "is_existing_customer": False,
        "is_competitor_forwarder": False,
    }
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.total_score == 55
    assert result.segment_status == "Tier B"
    assert result.notice == "Strategic account below 60 cut-off; retained normal tier"


def test_case_5_existing_customer_excluded():
    """Case 5: Existing customer -> Excluded, no score."""
    lead = {
        "company_name": "Jet Active Client Pvt Ltd",
        "website_or_domain": "jetclient.com",
        "city": "Mumbai",
        "branch": "BOM",
        "data_source": "datamyne",
        "lane": "India to US",
        "mode": "air",
        "commodity": "pharma",
        "shipments_12m": 50,
        "last_shipment_date": "2026-10-10",
        "is_existing_customer": True,
    }
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.segment_status == "Excluded"
    assert result.tier_reason == "existing_customer"
    assert result.total_score == 0
    assert result.base_score == 0


def test_case_6_competitor_forwarder_excluded():
    """Case 6: Competitor forwarder -> Excluded, no score."""
    lead = {
        "company_name": "Expeditors International",
        "website_or_domain": "expeditors.com",
        "city": "Mumbai",
        "branch": "BOM",
        "data_source": "datamyne",
        "lane": "India to US",
        "mode": "air",
        "commodity": "pharma",
        "shipments_12m": 100,
        "last_shipment_date": "2026-10-10",
        "is_existing_customer": False,
        "is_competitor_forwarder": True,
    }
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.segment_status == "Excluded"
    assert result.tier_reason == "competitor_forwarder"
    assert result.total_score == 0


def test_case_7_unscored_missing_fields():
    """Case 7: Missing required fields -> Unscored with missing_fields array."""
    lead = {
        "company_name": "Incomplete Export Corp",
        "website_or_domain": "incomplete.com",
        "city": "Mumbai",
        "branch": "BOM",
        "data_source": "datamyne",
        "lane": "India to US",
        "mode": "air",
        "commodity": "pharma",
        "shipments_12m": 10,
        "last_shipment_date": "",  # Empty!
        "is_existing_customer": False,
    }
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.segment_status == "Unscored"
    assert "last_shipment_date" in result.missing_fields
    assert result.total_score == 0


def test_case_8_parked_score_zero():
    """Case 8: 2 shipments, EXW, lane not served, bulk ocean, falling, 200 days ago -> Score 0, Parked."""
    lead = {
        "company_name": "Low Fit Minerals Ltd",
        "website_or_domain": "lowfit.com",
        "city": "Kolkata",
        "branch": "CCU",
        "data_source": "datamyne",
        "lane": "India to Siberia",  # Not served
        "mode": "ocean",
        "air_suitable": False,       # Bulk ocean
        "commodity": "bulk coal",    # 0
        "shipments_12m": 2,          # 0
        "shipments_prior_6m": 2,
        "shipments_recent_6m": 0,    # falling: 0
        "last_shipment_date": "2026-03-30", # >180 days: 0
        "incoterm_set": "EXW",       # 0
        "is_existing_customer": False,
        "is_competitor_forwarder": False,
    }
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.total_score == 0
    assert result.segment_status == "Parked"


def test_case_9_boundary_scores():
    """Case 9: Boundary mapping 69, 70, 40, 39."""
    assert calculate_tier_status(69) == "Tier B"
    assert calculate_tier_status(70) == "Tier A"
    assert calculate_tier_status(40) == "Tier B"
    assert calculate_tier_status(39) == "Parked"


def test_case_10_shipment_frequency_points():
    """Case 10: Shipments 3, 4, 11, 12, 23, 24 -> 0, 6, 6, 12, 12, 20 points."""
    assert calculate_shipment_frequency_score(3) == 0
    assert calculate_shipment_frequency_score(4) == 6
    assert calculate_shipment_frequency_score(11) == 6
    assert calculate_shipment_frequency_score(12) == 12
    assert calculate_shipment_frequency_score(23) == 12
    assert calculate_shipment_frequency_score(24) == 20


def test_case_11_recency_points():
    """Case 11: Days since last shipment 60, 61, 180, 181 -> 10, 5, 5, 0 points."""
    assert calculate_recency_score(60) == 10
    assert calculate_recency_score(61) == 5
    assert calculate_recency_score(180) == 5
    assert calculate_recency_score(181) == 0


def test_case_12_score_capping():
    """Case 12: Base 95 with both bonuses (+10) -> Total 100, not 105."""
    lead = {
        "company_name": "High Flyer Pharma",
        "website_or_domain": "highflyer.com",
        "city": "Hyderabad",
        "branch": "HYD",
        "data_source": "datamyne",
        "lane": "India to US",     # 15
        "mode": "air",             # 15
        "commodity": "pharma",     # 15
        "shipments_12m": 24,       # 20
        "shipments_prior_6m": 12,
        "shipments_recent_6m": 12, # 5 (flat)
        "last_shipment_date": "2026-09-20", # 10 (recency)
        "incoterm_set": "CIF",     # 15
        "regulated_plant_status": "us_fda", # +5
        "is_existing_customer": False,
        "is_competitor_forwarder": False,
    }
    # Base: 15 + 15 + 15 + 20 + 5 + 10 + 15 = 95. Bonuses = 10.
    result = score_lead_record(lead, evaluation_date=TEST_EVALUATION_DATE)
    assert result.base_score == 95
    assert result.bonus_points == 10
    assert result.total_score == 100
    assert result.segment_status == "Tier A"


def test_case_13_capacity_warning_check():
    """Case 13: Tier A above 20% of scored leads triggers warning without changing cutoff automatically."""
    from src.services.tier_scoring_engine import evaluate_capacity_threshold
    status_counts = {"Tier A": 35, "Tier B": 65, "Parked": 50}
    # Scored = 35 + 65 + 50 = 150. Tier A = 35/150 = 23.3% (> 20%)
    warning_info = evaluate_capacity_threshold(status_counts, monthly_capacity=20)
    assert warning_info["exceeds_guideline"] is True
    assert warning_info["tier_a_percentage"] > 20.0
    assert "suggested_cutoff" in warning_info
