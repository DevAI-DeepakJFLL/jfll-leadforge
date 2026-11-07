import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

def test_get_report_companies_autocomplete():
    response = client.get("/api/v1/reports/companies?q=Titan")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any("TITAN LABORATORIES" in item["company_name"] for item in data)

def test_post_generate_report():
    response = client.post(
        "/api/v1/reports/generate",
        json={
            "company_name_or_id": "Titan Laboratories",
            "prepared_for": "Mumbai Sales Branch",
            "prepared_by": "Tyra Theknath",
        },
    )
    assert response.status_code == 200
    report = response.json()
    assert "TITAN LABORATORIES" in report["header"]["company_name"]
    assert report["section_2_trade_lane"]["total_shipments"] == 130
    assert len(report["section_4_contacts"]) >= 1

def test_post_export_docx_stream_and_sanitized_filename():
    # 1. Generate report data
    gen_resp = client.post(
        "/api/v1/reports/generate",
        json={"company_name_or_id": "Titan Laboratories"},
    )
    assert gen_resp.status_code == 200
    report_data = gen_resp.json()
    # Test date with slashes
    report_data["header"]["date"] = "07/11/2026"

    # 2. Export docx
    doc_resp = client.post("/api/v1/reports/export-docx", json=report_data)
    assert doc_resp.status_code == 200
    assert doc_resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    cd_header = doc_resp.headers.get("content-disposition", "")
    assert "attachment; filename=" in cd_header
    assert "07_11_2026" in cd_header
    assert "/" not in cd_header.split("filename=")[1]
    
    # Check binary buffer starts with PK zip header (0x50, 0x4B)
    assert doc_resp.content[:2] == b"PK"
    assert len(doc_resp.content) > 1000
