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

@pytest.fixture(autouse=True)
def clean_hot_lead_contacts():
    """Ensure test isolation by clearing hot_lead_contacts table before and after each test."""
    from src.api.lead_tracker_db import get_db_connection, _DB_LOCK
    with _DB_LOCK:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS hot_lead_contacts (
                        sr_no INTEGER PRIMARY KEY,
                        customer_name TEXT,
                        gstin TEXT,
                        phone TEXT,
                        contact_person TEXT,
                        email TEXT,
                        notes TEXT,
                        updated_at TEXT NOT NULL,
                        updated_by TEXT
                    );
                """)
                conn.execute("DELETE FROM hot_lead_contacts")
        finally:
            conn.close()
    yield
    with _DB_LOCK:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("DELETE FROM hot_lead_contacts")
        finally:
            conn.close()


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
    assert metrics["decision_makers_count"] == 39

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
    """Verify segment=with-decision-makers filters exactly to 39 accounts with contact info."""
    response = client.get("/api/v1/hot-leads?segment=with-decision-makers&page_size=100")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_records"] == 39
    assert len(payload["data"]) == 39
    for item in payload["data"]:
        has_contact = (
            (item.get("apollo_decision_maker") not in ("-", "", None)) or
            (item.get("jfll_direct_phone") not in ("-", "", None)) or
            (item.get("jfll_direct_email") not in ("-", "", None)) or
            (item.get("decision_maker_direct_email") not in ("-", "", None)) or
            (item.get("jfll_contact_person") not in ("-", "", None))
        )
        assert has_contact

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

    # JFLL Active (14 total: 12 with contacts, 2 without)
    res_active = client.get("/api/v1/hot-leads?segment=active&page_size=100")
    assert res_active.status_code == 200
    assert res_active.json()["total_records"] == 14

    res_active_wc = client.get("/api/v1/hot-leads?segment=active-with-contacts&page_size=100")
    assert res_active_wc.status_code == 200
    assert res_active_wc.json()["total_records"] == 12

    res_active_woc = client.get("/api/v1/hot-leads?segment=active-without-contacts&page_size=100")
    assert res_active_woc.status_code == 200
    assert res_active_woc.json()["total_records"] == 2

    # JFLL Inactive (8 total: 6 with contacts, 2 without)
    res_inactive = client.get("/api/v1/hot-leads?segment=inactive&page_size=100")
    assert res_inactive.status_code == 200
    assert res_inactive.json()["total_records"] == 8

    res_inactive_wc = client.get("/api/v1/hot-leads?segment=inactive-with-contacts&page_size=100")
    assert res_inactive_wc.status_code == 200
    assert res_inactive_wc.json()["total_records"] == 6

    # Verify LINKERS (sr_no 31) and FARTHEST (sr_no 34) are included in inactive-with-contacts
    inactive_wc_sr_nos = [x["sr_no"] for x in res_inactive_wc.json()["data"]]
    assert 31 in inactive_wc_sr_nos
    assert 34 in inactive_wc_sr_nos

    res_inactive_woc = client.get("/api/v1/hot-leads?segment=inactive-without-contacts&page_size=100")
    assert res_inactive_woc.status_code == 200
    assert res_inactive_woc.json()["total_records"] == 2

    # With Contacts (39) and Without Contacts (21) across entire dataset
    res_wc = client.get("/api/v1/hot-leads?segment=with-contacts&page_size=100")
    assert res_wc.status_code == 200
    assert res_wc.json()["total_records"] == 39

    res_woc = client.get("/api/v1/hot-leads?segment=without-contacts&page_size=100")
    assert res_woc.status_code == 200
    assert res_woc.json()["total_records"] == 21

    # Verify metrics fields in response
    m = res_fresh.json()["metrics"]
    assert m["fresh_count"] == 38
    assert m["fresh_with_contacts_count"] == 21
    assert m["fresh_without_contacts_count"] == 17
    assert m["active_count"] == 14
    assert m["active_with_contacts_count"] == 12
    assert m["active_without_contacts_count"] == 2
    assert m["inactive_count"] == 8
    assert m["inactive_with_contacts_count"] == 6
    assert m["inactive_without_contacts_count"] == 2
    assert m["with_contacts_count"] == 39
    assert m["without_contacts_count"] == 21


def test_list_hot_leads_multi_region_support():
    """Verify multi-region queries: Delhi NCR returns live 60 records with region tags, upcoming returns empty state cleanly."""
    # 1. Default query includes region metadata
    res_default = client.get("/api/v1/hot-leads?page_size=10")
    assert res_default.status_code == 200
    first_item = res_default.json()["data"][0]
    assert first_item["region"] == "Delhi NCR"
    assert first_item["region_id"] == "delhi"
    assert res_default.json()["metrics"]["region"] == "all"

    # 2. Explicit region=delhi
    res_delhi = client.get("/api/v1/hot-leads?region=delhi&page_size=100")
    assert res_delhi.status_code == 200
    assert res_delhi.json()["total_records"] == 60
    assert len(res_delhi.json()["data"]) == 60
    assert all(item["region_id"] == "delhi" for item in res_delhi.json()["data"])
    assert res_delhi.json()["metrics"]["region"] == "delhi"

    # 3. Explicit region=all
    res_all = client.get("/api/v1/hot-leads?region=all&page_size=100")
    assert res_all.status_code == 200
    assert res_all.json()["total_records"] == 60

    # 4. Upcoming region (e.g., mumbai, gujarat, south, east)
    res_mumbai = client.get("/api/v1/hot-leads?region=mumbai")
    assert res_mumbai.status_code == 200
    payload_mumbai = res_mumbai.json()
    assert payload_mumbai["total_records"] == 0
    assert payload_mumbai["data"] == []
    assert payload_mumbai["metrics"]["total_count"] == 0
    assert payload_mumbai["metrics"]["total_turnover"] == 0
    assert payload_mumbai["metrics"]["region"] == "mumbai"


def test_hot_leads_contact_inline_update_and_persistence():
    """Verify sales coordinator inline contact editing persists to SQLite database and updates DuckDB query."""
    # Find a record with NO initial contact (e.g. sr_no 17 or any without-contacts)
    res_woc = client.get("/api/v1/hot-leads?segment=without-contacts&page_size=5")
    assert res_woc.status_code == 200
    woc_items = res_woc.json()["data"]
    assert len(woc_items) > 0
    target_lead = woc_items[0]
    target_sr_no = target_lead["sr_no"]

    # 1. Update contact number and person via PATCH endpoint
    test_phone = "+91 98765 43210"
    test_contact = "Rajesh Sharma (Logistics Head)"
    test_email = "rajesh.sharma@enterprise.com"

    update_res = client.patch(
        f"/api/v1/hot-leads/{target_sr_no}/contact",
        json={
            "phone": test_phone,
            "contact_person": test_contact,
            "email": test_email,
            "notes": "Verified via WhatsApp by coordinator",
        },
    )
    assert update_res.status_code == 200
    update_data = update_res.json()
    assert update_data["success"] is True
    assert update_data["sr_no"] == target_sr_no
    assert update_data["phone"] == test_phone
    assert update_data["contact_person"] == test_contact
    assert update_data["email"] == test_email
    assert "updated_at" in update_data

    # 2. Verify GET /api/v1/hot-leads/{sr_no}/contact
    get_contact_res = client.get(f"/api/v1/hot-leads/{target_sr_no}/contact")
    assert get_contact_res.status_code == 200
    contact_data = get_contact_res.json()
    assert contact_data["phone"] == test_phone
    assert contact_data["contact_person"] == test_contact
    assert contact_data["email"] == test_email

    # 3. Verify GET /api/v1/hot-leads now reflects the persisted database update
    res_updated = client.get(f"/api/v1/hot-leads?search={target_lead['customer_name']}")
    assert res_updated.status_code == 200
    updated_items = res_updated.json()["data"]
    match = next(x for x in updated_items if x["sr_no"] == target_sr_no)
    assert match["jfll_direct_phone"] == test_phone
    assert match["jfll_contact_person"] == test_contact
    assert match["jfll_direct_email"] == test_email
    assert match["is_custom_contact"] is True
    assert match["contact_updated_at"] is not None

    # 4. Verify 404 for nonexistent sr_no
    res_404 = client.patch("/api/v1/hot-leads/9999/contact", json={"phone": "+91 99999 99999"})
    assert res_404.status_code == 404



