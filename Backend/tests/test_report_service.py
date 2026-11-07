import pytest

from src.api.report_models import ClientReportData
from src.services.report_service import (
    generate_client_report_data,
    search_report_companies,
)


def test_search_report_companies_matches():
    results = search_report_companies("Titan", limit=5)
    assert len(results) > 0
    names = [r["company_name"] for r in results]
    assert any("TITAN LABORATORIES" in n for n in names)

def test_generate_client_report_megafine():
    report = generate_client_report_data(
        company_query="Megafine",
        prepared_for="Mumbai Sales Branch",
        prepared_by="Tyra Theknath",
    )
    assert isinstance(report, ClientReportData)
    assert "MEGA FINE PHARMA" in report.header.company_name
    assert report.header.prepared_for == "Mumbai Sales Branch"
    assert report.header.prepared_by == "Tyra Theknath"
    
    # Section 1
    assert "Organic Chemicals & APIs" in report.section_1_background.what_they_do or "29420090" in report.section_1_background.what_they_do
    assert "MUMBAI" in report.section_1_background.hq_facilities
    
    # Section 2
    assert report.section_2_trade_lane.total_shipments == 237
    assert report.section_2_trade_lane.total_value_usd > 7000000
    assert "DG" in report.section_2_trade_lane.special_handling
    
    # Section 3
    assert "IATA DG" in report.section_3_jfll_fit.cargo_strength or "multimodal" in report.section_3_jfll_fit.cargo_strength.lower()
    
    # Section 4
    assert len(report.section_4_contacts) >= 1
    customs_contact = report.section_4_contacts[0]
    assert "hitesh.gour@megafine.in" in customs_contact.contact_info

def test_generate_client_report_titan():
    report = generate_client_report_data("Titan Laboratories")
    assert isinstance(report, ClientReportData)
    assert "TITAN LABORATORIES" in report.header.company_name
    assert report.section_2_trade_lane.total_shipments == 130
    assert report.section_2_trade_lane.total_value_usd > 8000000

@pytest.mark.parametrize("target_query,expected_part", [
    ("Gemini Exports", "GEMINI EXPORTS"),
    ("HiMedia Laboratories", "HIMEDIA LABORATORIES"),
    ("Inventia Healthcare", "INVENTIA HEALTHCARE"),
    ("Nivira Exports", "NIVIRA EXPORTS"),
    ("Simson Pharma", "SIMSON PHARMA"),
    ("Vea Impex", "VEA IMPEX"),
])
def test_generate_client_report_all_reference_leads(target_query, expected_part):
    report = generate_client_report_data(target_query)
    assert isinstance(report, ClientReportData)
    assert expected_part in report.header.company_name
    assert report.section_2_trade_lane.total_shipments > 0
    assert report.section_2_trade_lane.total_value_usd > 0
    assert len(report.section_4_contacts) >= 1

def test_generate_client_report_unlisted_fallback():
    report = generate_client_report_data("NonExistentUnknownCo999")
    assert isinstance(report, ClientReportData)
    assert report.header.company_name == "NonExistentUnknownCo999"
    assert report.section_2_trade_lane.total_shipments == 0
    assert len(report.section_4_contacts) >= 1

def test_generate_client_report_extracts_apollo_decision_makers():
    """Verify that Apollo 15.5M contact directory is queried for verified logistics decision makers."""
    report = generate_client_report_data("Amphenol")
    assert isinstance(report, ClientReportData)
    assert any("Apollo Verified" in c.notes for c in report.section_4_contacts)
    apollo_contact = next(c for c in report.section_4_contacts if "Apollo Verified" in c.notes)
    assert len(apollo_contact.name) > 2
    assert len(apollo_contact.designation) > 2


def test_generate_client_report_prepopulates_historical_approach_notes():
    """Fix #5: Verify that historical approach log notes pre-populate section_5_feedback."""
    from unittest.mock import patch
    
    mock_logs = {
        "version": 1,
        "entities": {
            "datamyne:dm-val-00001": {
                "logs": [
                    {
                        "timestamp": "2026-11-05T10:00:00Z",
                        "user_name": "Deepak Naidu",
                        "user_email": "deepak@jfll.com",
                        "action": "Held meeting",
                        "status": "In Progress",
                        "note": "Client requests dedicated reefer container for cold chain APIs to Frankfurt.",
                        "next_follow_up": "2026-11-12",
                    }
                ]
            }
        }
    }
    
    with patch("src.api.approach_routes.load_approach_data", return_value=mock_logs):
        report = generate_client_report_data("dm-val-00001")
        assert report.section_5_feedback.meeting_takeaways != ""
        assert "Client requests dedicated reefer container" in report.section_5_feedback.meeting_takeaways
        assert "Deepak Naidu" in report.section_5_feedback.meeting_takeaways
        assert report.section_5_feedback.next_action_followup == "2026-11-12"

