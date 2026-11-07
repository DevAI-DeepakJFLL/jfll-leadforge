import pytest
from pydantic import ValidationError

from src.api.report_models import (
    ClientReportData,
    CompanyBackground,
    ContactItem,
    JfllFit,
    ReportHeader,
    SalesFeedback,
    TradeLaneCommodity,
)


def _sample_report_dict():
    return {
        "header": {
            "title": "CLIENT REPORT · PROSPECT BRIEF",
            "company_name": "TITAN LABORATORIES PVT LTD",
            "subtitle": "Integrated pharma",
            "prepared_for": "Mumbai Sales Branch",
            "prepared_by": "Tyra Theknath",
            "date": "07-Nov-2026",
        },
        "section_1_background": {
            "what_they_do": "Pharma manufacturer",
            "hq_facilities": "Mumbai",
            "export_markets": "EU, US",
            "scale_credibility": "WHO-GMP",
        },
        "section_2_trade_lane": {
            "origin_destination": "Mumbai -> Global",
            "commodity": "APIs",
            "primary_mode": "Air / Sea",
            "special_handling": "Temperature controlled",
            "total_shipments": 100,
            "total_value_usd": 500000.0,
            "lading_port": "INBOM4",
        },
        "section_3_jfll_fit": {
            "cargo_strength": "Cold chain",
            "pitch_angle": "Dual capability",
        },
        "section_4_contacts": [
            {
                "name": "Kunal Shah",
                "designation": "GM Sales",
                "contact_info": "kunal@test.com",
                "notes": "Decision maker",
            }
        ],
    }


def test_sales_feedback_model_defaults_and_validation():
    # 1. Default instantiation has empty strings
    feedback = SalesFeedback()
    assert feedback.meeting_takeaways == ""
    assert feedback.preferred_carriers == ""
    assert feedback.target_pricing == ""
    assert feedback.next_action_followup == ""

    # 2. Accepts realistic multi-line takeaways up to 4000 chars
    long_notes = "Meeting notes paragraph 1\n- Bullet 1: 50 pallets/month\n- Bullet 2: Air express needed\n" * 40
    assert len(long_notes) <= 4000
    custom_feedback = SalesFeedback(
        meeting_takeaways=long_notes,
        preferred_carriers="Emirates SkyCargo, Qatar Airways",
        target_pricing="$3.20/kg ex-BOM to FRA",
        next_action_followup="Submit formal rate matrix by Tuesday",
    )
    assert custom_feedback.preferred_carriers == "Emirates SkyCargo, Qatar Airways"

    # 3. Rejects notes exceeding 4000 chars
    with pytest.raises(ValidationError):
        SalesFeedback(meeting_takeaways="A" * 4001)


def test_client_report_data_backwards_compatible_default():
    """Verify an older report JSON payload without section_5_feedback loads cleanly."""
    raw_data = _sample_report_dict()
    assert "section_5_feedback" not in raw_data

    report = ClientReportData(**raw_data)
    assert hasattr(report, "section_5_feedback")
    assert isinstance(report.section_5_feedback, SalesFeedback)
    assert report.section_5_feedback.meeting_takeaways == ""


def test_client_report_data_with_sales_feedback_roundtrip():
    raw_data = _sample_report_dict()
    raw_data["section_5_feedback"] = {
        "meeting_takeaways": "Met with procurement team. Needs DG packaging certification.",
        "preferred_carriers": "Lufthansa Cargo",
        "target_pricing": "$2.80/kg",
        "next_action_followup": "Follow up on 12-Nov-2026",
    }
    # Fix syntax key
    raw_data["section_5_feedback"]["next_action_followup"] = "Follow up on 12-Nov-2026"

    report = ClientReportData(**raw_data)
    assert report.section_5_feedback.preferred_carriers == "Lufthansa Cargo"
    dumped = report.model_dump()
    assert dumped["section_5_feedback"]["meeting_takeaways"] == "Met with procurement team. Needs DG packaging certification."
