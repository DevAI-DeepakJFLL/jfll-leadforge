import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.config import settings
from src.api.database import get_cached_parquet_path

client = TestClient(app)


def test_all_customers_config_and_caching():
    """Verify that all_customers dataset is registered in config and resolves to cached parquet."""
    assert "all_customers" in settings.DATASET_FILES
    assert settings.DATASET_FILES["all_customers"] == "all_customers_leads_zstd.parquet"
    path = get_cached_parquet_path("all_customers")
    assert path.exists()
    assert path.name == "all_customers_leads_zstd.parquet"


def test_list_leads_all_customers_pagination():
    """Verify status=All returns 2,223 total records with total_business_till_date field."""
    response = client.get("/api/v1/leads?page=1&page_size=25&status=All")
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 25
    assert payload["total_records"] == 2223
    assert len(payload["data"]) == 25
    assert payload["has_next"] is True
    assert payload["audience_counts"]["all"] == 2223

    # Verify model fields include total_business_till_date
    first = payload["data"][0]
    assert "total_business_till_date" in first
    assert "credit_status" in first
    assert "sales_person" in first


def test_list_leads_all_customers_sorting_total_business():
    """Verify sorting by totalBusinessTillDate descending returns highest total business first."""
    response = client.get("/api/v1/leads?status=All&sort_by=totalBusinessTillDate&sort_order=desc&page_size=10")
    assert response.status_code == 200
    payload = response.json()
    data = payload["data"]
    assert len(data) == 10
    assert data[0]["total_business_till_date"] is not None
    # Verify non-increasing order
    for i in range(len(data) - 1):
        if data[i]["total_business_till_date"] is not None and data[i+1]["total_business_till_date"] is not None:
            assert data[i]["total_business_till_date"] >= data[i+1]["total_business_till_date"]


def test_list_leads_all_customers_revenue_range_filter():
    """Verify revenue filtering on status=All applies against total_business_till_date."""
    # Enterprise range (₹1 Crore+) in total business
    res_1cr = client.get("/api/v1/leads?status=All&revenue_ranges=1cr_plus")
    assert res_1cr.status_code == 200
    payload_1cr = res_1cr.json()
    assert payload_1cr["total_records"] > 0
    for item in payload_1cr["data"]:
        assert item["total_business_till_date"] is not None
        assert item["total_business_till_date"] >= 10000000


def test_list_leads_all_customers_case_insensitive_status():
    """Verify that lowercase status=all works identically."""
    response = client.get("/api/v1/leads?status=all&page_size=5")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 2223


def test_list_leads_all_customers_linked_duplicate_clusters():
    """Verify Option 1 linked corporate parent-branch duplicate clusters."""
    res = client.get("/api/v1/leads?status=All&search=Cargosol")
    assert res.status_code == 200
    payload = res.json()
    assert payload["total_records"] >= 2
    cargosol_records = [r for r in payload["data"] if "CARGOSOL" in r["full_name"].upper()]
    assert len(cargosol_records) >= 2
    
    parent = next((r for r in cargosol_records if not r["is_branch_alias"]), None)
    branch = next((r for r in cargosol_records if r["is_branch_alias"]), None)
    assert parent is not None
    assert branch is not None
    assert parent["id"] == branch["parent_id"]
    assert parent["group_total_business"] == branch["group_total_business"]
    assert branch["group_total_business"] >= 190000000.0  # ₹19.3 Cr combined
    assert branch["branch_alias_tag"] is not None
