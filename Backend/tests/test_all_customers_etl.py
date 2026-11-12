import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure Backend directory is in sys.path for scripts import
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scripts.process_all_jfll_customers import normalize_company
from src.api.config import settings
from src.api.database import get_cached_parquet_path
from src.api.main import app

client = TestClient(app)


def test_all_customers_config_and_caching():
    """Verify that all_customers dataset is registered in config and resolves to cached parquet."""
    assert "all_customers" in settings.DATASET_FILES
    assert settings.DATASET_FILES["all_customers"] == "all_customers_leads_zstd.parquet"
    path = get_cached_parquet_path("all_customers")
    assert path.exists()
    assert path.name == "all_customers_leads_zstd.parquet"


def test_list_leads_all_customers_pagination():
    """Verify status=All returns 2,185 total unique records with total_business_till_date field."""
    response = client.get("/api/v1/leads?page=1&page_size=25&status=All")
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 25
    assert payload["total_records"] == 2185
    assert len(payload["data"]) == 25
    assert payload["has_next"] is True
    assert payload["audience_counts"]["all"] == 2185

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
    assert payload["total_records"] == 2185


def test_list_leads_all_customers_linked_duplicate_clusters():
    """Verify Unified Golden Master consolidation with 0 duplicate rows."""
    res = client.get("/api/v1/leads?status=All&search=Cargosol")
    assert res.status_code == 200
    payload = res.json()
    cargosol_records = [r for r in payload["data"] if "CARGOSOL" in r["full_name"].upper()]
    # Strictly 1 unified Golden Master record for Cargosol
    assert len(cargosol_records) == 1
    
    master = cargosol_records[0]
    assert master["id"] == "jfll-2212"
    assert master["merged_count"] == 2
    assert master["total_business_till_date"] >= 190000000.0  # ₹19.3 Cr combined
    assert master["merged_aliases"] is not None
    assert "jfll-1679" in master["merged_aliases"]


@pytest.mark.parametrize(
    "raw_name_1,raw_name_2,expected_normalized",
    [
        # (I) vs (INDIA) vs (IND)
        ("FAIR EXPORTS (I) PVT LTD.", "FAIR EXPORTS (INDIA) PVT LTD.", "FAIREXPORTSINDIAPRIVATELIMITED"),
        (
            "TANDEM GLOBAL LOGISTICS (I) P.LTD.",
            "TANDEM GLOBAL LOGISTICS (INDIA) PVT. LTD.",
            "TANDEMGLOBALLOGISTICSINDIAPRIVATELIMITED",
        ),
        ("SAFE WATER LINES - INDIA PVT LTD", "SAFE WATER LINES (I) PVT. LTD.", "SAFEWATERLINESINDIAPRIVATELIMITED"),
        # Stripping of division / transfer tags
        (
            "FAIR EXPORTS (INDIA) PVT LTD. (DOMESTIC DIVISION)",
            "FAIR EXPORTS (INDIA) PVT LTD.",
            "FAIREXPORTSINDIAPRIVATELIMITED",
        ),
        ("ABC EXPORTS (TRANSFER FROM AIR)", "ABC EXPORTS", "ABCEXPORTS"),
        ("XYZ INDUSTRIES (100% EOU UNIT)", "XYZ INDUSTRIES", "XYZINDUSTRIES"),
        ("GLOBAL CARGO (SEZ)", "GLOBAL CARGO", "GLOBALCARGO"),
        ("SHREE TRADERS (PROP. RAMESH)", "SHREE TRADERS", "SHREETRADERS"),
    ],
)
def test_normalize_company_deduplication_cases(raw_name_1: str, raw_name_2: str, expected_normalized: str):
    """Verify normalize_company produces identical canonical stems across country notations and business division tags."""
    norm_1 = normalize_company(raw_name_1)
    norm_2 = normalize_company(raw_name_2)
    assert norm_1 == norm_2
    assert norm_1 == expected_normalized

