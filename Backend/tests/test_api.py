from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert "Floci" in payload["backend"]


def test_list_leads_pagination():
    response = client.get("/api/v1/leads?page=1&page_size=10&status=Active")
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total_records"] == 729
    assert len(payload["data"]) == 10
    assert payload["has_next"] is True
    assert payload["audience_counts"]["all"] == 729
    for item in payload["data"]:
        assert item["status"] == "Active"


def test_list_leads_filtering_by_tab_and_group():
    # Filter by Shipper / Consignee tab
    response = client.get("/api/v1/leads?tab=shippers&page=1&page_size=10")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 285
    for item in payload["data"]:
        assert item["customer_group"] == "Shipper / Consignee"

    # Multi-select customer group
    response = client.get("/api/v1/leads?customer_groups=Overseas+Agent")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 39


def test_invalid_status_returns_400():
    response = client.get("/api/v1/leads?status=InvalidStatus")
    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_invalid_tab_returns_400():
    response = client.get("/api/v1/leads?tab=nonexistent")
    assert response.status_code == 400
    assert "Invalid tab" in response.json()["detail"]


def test_sql_injection_attempt_is_safe():
    # Attempt SQL injection via search parameter
    response = client.get("/api/v1/leads?search=' OR '1'='1")
    assert response.status_code == 200
    payload = response.json()
    # Parameterized query should treat the injection attempt as a literal string pattern
    assert payload["total_records"] == 0

