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


def test_list_hot_leads_new_taxonomy_and_contact_splits():
    """Verify new taxonomy (JFLL Active, JFLL Inactive, Fresh Data) split by With/Without Contacts."""
    # Fresh Data (38 total: 21 with contacts, 17 without)
    res_fresh = client.get("/api/v1/hot-leads?segment=fresh&page_size=100")
    assert res_fresh.status_code == 200
    assert res_fresh.json()["total_records"] == 38

    res_fresh_wc = client.get("/api/v1/hot-leads?segment=fresh-with-contacts&page_size=100")
    assert res_fresh_wc.status_code == 200
    assert res_fresh_wc.json()["total_records"] == 21

    res_fresh_woc = client.get("/api/v1/hot-leads?segment=fresh-without-contacts&page_size=100")
    assert res_fresh_woc.status_code == 200
    assert res_fresh_woc.json()["total_records"] == 17

    # JFLL Active (14 total: 7 with contacts, 7 without)
    res_active = client.get("/api/v1/hot-leads?segment=active&page_size=100")
    assert res_active.status_code == 200
    assert res_active.json()["total_records"] == 14

    res_active_wc = client.get("/api/v1/hot-leads?segment=active-with-contacts&page_size=100")
    assert res_active_wc.status_code == 200
    assert res_active_wc.json()["total_records"] == 7

    res_active_woc = client.get("/api/v1/hot-leads?segment=active-without-contacts&page_size=100")
    assert res_active_woc.status_code == 200
    assert res_active_woc.json()["total_records"] == 7

    # JFLL Inactive (8 total: 4 with contacts, 4 without)
    res_inactive = client.get("/api/v1/hot-leads?segment=inactive&page_size=100")
    assert res_inactive.status_code == 200
    assert res_inactive.json()["total_records"] == 8

    res_inactive_wc = client.get("/api/v1/hot-leads?segment=inactive-with-contacts&page_size=100")
    assert res_inactive_wc.status_code == 200
    assert res_inactive_wc.json()["total_records"] == 4

    res_inactive_woc = client.get("/api/v1/hot-leads?segment=inactive-without-contacts&page_size=100")
    assert res_inactive_woc.status_code == 200
    assert res_inactive_woc.json()["total_records"] == 4

    # With Contacts (32) and Without Contacts (28) across entire dataset
    res_wc = client.get("/api/v1/hot-leads?segment=with-contacts&page_size=100")
    assert res_wc.status_code == 200
    assert res_wc.json()["total_records"] == 32

    res_woc = client.get("/api/v1/hot-leads?segment=without-contacts&page_size=100")
    assert res_woc.status_code == 200
    assert res_woc.json()["total_records"] == 28

    # Verify metrics fields in response
    m = res_fresh.json()["metrics"]
    assert m["fresh_count"] == 38
    assert m["fresh_with_contacts_count"] == 21
    assert m["fresh_without_contacts_count"] == 17
    assert m["active_count"] == 14
    assert m["active_with_contacts_count"] == 7
    assert m["active_without_contacts_count"] == 7
    assert m["inactive_count"] == 8
    assert m["inactive_with_contacts_count"] == 4
    assert m["inactive_without_contacts_count"] == 4
    assert m["with_contacts_count"] == 32
    assert m["without_contacts_count"] == 28

