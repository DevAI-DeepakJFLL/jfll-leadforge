import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from src.api.config import settings
from src.api.database import get_cached_parquet_path
from src.api.main import app

client = TestClient(app)

def test_hot_leads_config_and_parquet_resolution():
    """Verify that client_tax_cross_reference is registered in config and resolves to valid parquet."""
    assert "client_tax_cross_reference" in settings.DATASET_FILES
    assert settings.DATASET_FILES["client_tax_cross_reference"] == "client_tax_cross_reference_zstd.parquet"
    path = get_cached_parquet_path("client_tax_cross_reference")
    assert path.exists()
    assert path.name == "client_tax_cross_reference_zstd.parquet"

def test_list_hot_leads_default():
    """Verify default query returns 50 of 60 records, metrics, and default turnover descending."""
    response = client.get("/api/v1/hot-leads")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 60
    assert len(payload["data"]) == 50
    assert payload["has_next"] is True
    assert payload["page"] == 1

    # Verify metrics
    metrics = payload["metrics"]
    assert metrics["total_count"] == 60
    assert metrics["total_turnover"] == 476606748
    assert metrics["prospects_count"] == 38
    assert metrics["reactivations_count"] == 8
    assert metrics["active_count"] == 14
    assert metrics["decision_makers_count"] == 32

    # Verify descending turnover sort
    first = payload["data"][0]
    assert first["taxable_turnover_inr"] >= payload["data"][1]["taxable_turnover_inr"]
    assert first["customer_name"] == "EMO TRANS LOGISTICS INDIA PRIVATE LIMITED)"
    assert first["taxable_turnover_inr"] == 61177562

def test_list_hot_leads_segment_prospects():
    """Verify segment=prospects filters exactly to 38 accounts."""
    response = client.get("/api/v1/hot-leads?segment=prospects&page_size=100")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 38
    assert len(payload["data"]) == 38
    for item in payload["data"]:
        assert item["jfll_crm_status"] == "Prospect (Not in JFLL)"

def test_list_hot_leads_segment_reactivations():
    """Verify segment=reactivations filters exactly to 8 accounts."""
    response = client.get("/api/v1/hot-leads?segment=reactivations&page_size=100")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 8
    assert len(payload["data"]) == 8
    for item in payload["data"]:
        assert item["jfll_crm_status"] == "Not Active Customer"

def test_list_hot_leads_segment_decision_makers():
    """Verify segment=with-decision-makers filters exactly to 32 accounts."""
    response = client.get("/api/v1/hot-leads?segment=with-decision-makers&page_size=100")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 32
    assert len(payload["data"]) == 32
    for item in payload["data"]:
        assert item["apollo_decision_maker"] not in ("-", "", None)

def test_list_hot_leads_search():
    """Verify search by company name, GSTIN, and sales rep."""
    # Search by company name
    res = client.get("/api/v1/hot-leads?search=RICO")
    assert res.status_code == 200
    data = res.json()["data"]
    assert any("RICO" in item["customer_name"].upper() for item in data)

    # Search by GSTIN
    res_gstin = client.get("/api/v1/hot-leads?search=07AAHCE5990P1ZT")
    assert res_gstin.status_code == 200
    assert res_gstin.json()["total_records"] == 1
    assert "EMO TRANS" in res_gstin.json()["data"][0]["customer_name"]
