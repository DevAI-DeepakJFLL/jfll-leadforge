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
    assert data["total_records"] == 690881
    assert len(data["data"]) == 5
    assert data["audience_counts"] is not None
    assert data["audience_counts"]["all"] == 690881
    first_lead = data["data"][0]
    assert "organization_name" in first_lead
    assert "industry" in first_lead
    assert "phone" in first_lead


def test_apollo_leads_industry_filter():
    response = client.get("/api/v1/apollo/leads?industry=automotive&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 40036
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
    assert data["total_records"] == 690881
    assert len(data["top_industries"]) > 0
    assert data["top_industries"][0]["industry"] == "construction"
    assert data["top_industries"][0]["count"] == 91910
