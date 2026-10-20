import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_apollo_leads_pagination():
    response = client.get("/api/v1/apollo/leads?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert data["total_records"] == 686700
    assert len(data["data"]) == 5
    assert data["audience_counts"] is not None
    assert data["audience_counts"]["all"] == 686700
    first_lead = data["data"][0]
    assert "organization_name" in first_lead
    assert "industry" in first_lead
    assert "phone" in first_lead


def test_apollo_leads_industry_filter():
    response = client.get("/api/v1/apollo/leads?industry=automotive&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 39850
    assert len(data["data"]) == 5
    for lead in data["data"]:
        assert lead["industry"].lower() == "automotive"


def test_apollo_leads_search():
    response = client.get("/api/v1/apollo/leads?search=logistics&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] > 0
    assert len(data["data"]) <= 3


def test_apollo_leads_tab_filter():
    response = client.get("/api/v1/apollo/leads?tab=high_headcount&page_size=5")
    assert response.status_code == 200
    data = response.json()
    for lead in data["data"]:
        if lead["employee_count"] is not None:
            assert lead["employee_count"] >= 100


def test_apollo_stats_endpoint():
    response = client.get("/api/v1/apollo/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 686700
    assert len(data["top_industries"]) > 0
    assert data["top_industries"][0]["industry"] == "construction"
    assert data["top_industries"][0]["count"] == 91760


def test_company_contacts_endpoint():
    # Boeing organization_id: 54a1229169702d9a8b695403
    response = client.get("/api/v1/apollo/companies/54a1229169702d9a8b695403/contacts?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert data["total_records"] > 0
    assert len(data["data"]) == 5
    first_contact = data["data"][0]
    assert "person_name" in first_contact
    assert "job_title" in first_contact
    assert first_contact["organization_id"] == "54a1229169702d9a8b695403"


def test_apollo_contacts_global_search():
    response = client.get("/api/v1/apollo/contacts?search=logistics&logistics_only=true&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["total_records"] > 0
    assert len(data["data"]) == 5
    for contact in data["data"]:
        assert contact["is_logistics_role"] is True


def test_apollo_contacts_search_company_streaming():
    response = client.get("/api/v1/apollo/contacts?search=The+Boeing+Company&logistics_only=true&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["total_records"] > 0
    assert len(data["data"]) > 0


def test_apollo_contacts_by_organization_id():
    response = client.get("/api/v1/apollo/contacts?organization_id=54a1229169702d9a8b695403&page_size=3")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["total_records"] > 0
    assert len(data["data"]) > 0
    for contact in data["data"]:
        assert contact["organization_id"] == "54a1229169702d9a8b695403"


def test_apollo_contacts_by_company_lnt_two_stage():
    response = client.get("/api/v1/apollo/contacts?company=LARSEN+AND+TOUBRO+LIMITED&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["total_records"] > 0
    assert len(data["data"]) > 0


def test_apollo_contacts_by_company_sanofi_two_stage():
    response = client.get("/api/v1/apollo/contacts?company=SANOFI+INDIA+LIMITED&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["total_records"] > 0
    assert len(data["data"]) > 0


def test_apollo_contacts_nonexistent_company():
    response = client.get("/api/v1/apollo/contacts?company=NONEXISTENT_COMPANY_XYZ_99999&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 0
    assert len(data["data"]) == 0



