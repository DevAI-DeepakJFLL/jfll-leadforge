"""End-to-end integration test verifying the complete flow from DataMyne lead seeding,
user authentication as 'Tester', logging an outreach approach, and confirming the lead
appears with the correct mapped status, sales rep attribution, and activity history in Lead Status Tracker.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.approach_routes import save_approach_data
from src.api.auth import create_token
from src.api.lead_tracker_routes import reset_tracker_cache
from src.api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_stores(tmp_path, monkeypatch):
    """Isolates approach logs and lead tracker databases in tmp directory."""
    approach_file = tmp_path / "test_e2e_approach_logs.json"
    tracker_file = tmp_path / "test_e2e_lead_tracker.json"
    access_file = tmp_path / "test_e2e_access_control.json"

    monkeypatch.setenv("APPROACH_LOGS_PATH", str(approach_file))
    monkeypatch.setenv("LEAD_TRACKER_PATH", str(tracker_file))
    monkeypatch.setenv("ACCESS_CONTROL_PATH", str(access_file))

    save_approach_data({"version": 1, "entities": {}})
    reset_tracker_cache()

    yield

    reset_tracker_cache()


def test_e2e_datamyne_seed_and_log_to_lead_tracker():
    """E2E flow:

    1. Authenticate newly seeded user 'Tester'.
    2. Define sample DataMyne entity.
    3. 'Tester' logs approach activity (Not Contacted -> Contacted).
    4. Verify lead automatically materializes in Lead Status Tracker with 'Contacted' status.
    5. 'Tester' logs quotation (Contacted -> Quoted).
    6. Verify Lead Status Tracker updates status to 'Quoted' and logs timeline activity.
    """
    # -------------------------------------------------------------------------
    # Step 1: User 'Tester' authenticates with enterprise initial credentials
    # -------------------------------------------------------------------------
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "tester@jfll.com", "password": "Jet@123"},
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert login_data["email"] == "tester@jfll.com"
    assert login_data["name"] == "Tester"
    assert login_data["role"] == "Commercial"
    assert "token" in login_data

    tester_token = login_data["token"]
    tester_auth = {"Authorization": f"Bearer {tester_token}"}

    # Also prepare leadership auth header for Lead Tracker oversight queries
    admin_token, _ = create_token({"sub": "deepak@jfll.com", "name": "Deepak Naidu", "role": "Tech Lead"})
    admin_auth = {"Authorization": f"Bearer {admin_token}", "User-Agent": "Mozilla/5.0"}

    # -------------------------------------------------------------------------
    # Step 2: Seed sample DataMyne lead coordinate
    # -------------------------------------------------------------------------
    datamyne_id = "dm-test-77001"
    company_name = "TESTER FREIGHT WORLDWIDE PVT LTD"

    # Verify initial state is Not Contacted
    init_check = client.get(f"/api/v1/approach-logs/datamyne/{datamyne_id}", headers=tester_auth)
    assert init_check.status_code == 200
    assert init_check.json()["current_status"] == "Not Contacted"

    # -------------------------------------------------------------------------
    # Step 3: 'Tester' logs first approach outreach: Called customer -> Contacted
    # -------------------------------------------------------------------------
    first_log_payload = {
        "action": "Called customer",
        "status": "Contacted",
        "company_name": company_name,
        "note": "Spoke with logistics director; interested in Mumbai to Frankfurt air freight consolidation",
    }

    log_resp = client.post(
        f"/api/v1/approach-logs/datamyne/{datamyne_id}",
        json=first_log_payload,
        headers=tester_auth,
    )
    assert log_resp.status_code == 200, f"Logging approach failed: {log_resp.text}"
    log_data = log_resp.json()
    assert log_data["current_status"] == "Contacted"
    assert len(log_data["logs"]) == 1
    assert log_data["logs"][0]["salesperson_name"] == "Tester"
    assert log_data["logs"][0]["salesperson_email"] == "tester@jfll.com"

    # -------------------------------------------------------------------------
    # Step 4: Verify lead materialized in Lead Status Tracker with 'Contacted' status
    # -------------------------------------------------------------------------
    tracker_resp = client.get("/api/v1/lead-tracker", headers=admin_auth)
    assert tracker_resp.status_code == 200
    leads = tracker_resp.json()

    matching_leads = [l for l in leads if l.get("linked_entity_id") == datamyne_id]
    assert len(matching_leads) == 1, f"Expected 1 matching lead, found: {matching_leads}"

    tracked_lead = matching_leads[0]
    assert tracked_lead["company_name"] == company_name
    assert tracked_lead["status"] == "Contacted"
    assert tracked_lead["assigned_to"] == "Tester"
    assert tracked_lead["assigned_to_email"] == "tester@jfll.com"
    assert tracked_lead["linked_entity_type"] == "datamyne"
    assert tracked_lead["linked_entity_id"] == datamyne_id
    assert "Mumbai to Frankfurt air freight consolidation" in tracked_lead["feedback_notes"]

    # Verify activity history has touchpoint recorded with 'Tester' as author
    assert len(tracked_lead["history"]) >= 1
    latest_activity = tracked_lead["history"][0]
    assert latest_activity["author_name"] == "Tester"
    assert latest_activity["author_email"] == "tester@jfll.com"
    assert latest_activity["action"] == "Called customer"
    assert "Mumbai to Frankfurt air freight consolidation" in latest_activity["notes"]

    # -------------------------------------------------------------------------
    # Step 5: 'Tester' submits quote: Sent quote -> Report Sent (maps to 'Quoted')
    # -------------------------------------------------------------------------
    second_log_payload = {
        "action": "Sent quote",
        "status": "Report Sent",
        "company_name": company_name,
        "note": "Submitted spot rate quote EUR 2.45/kg for BOM-FRA 1500kg air shipment",
    }

    log_resp2 = client.post(
        f"/api/v1/approach-logs/datamyne/{datamyne_id}",
        json=second_log_payload,
        headers=tester_auth,
    )
    assert log_resp2.status_code == 200
    assert log_resp2.json()["current_status"] == "Report Sent"

    # -------------------------------------------------------------------------
    # Step 6: Verify Lead Status Tracker reflects updated 'Quoted' status and history
    # -------------------------------------------------------------------------
    tracker_resp2 = client.get("/api/v1/lead-tracker", headers=admin_auth)
    assert tracker_resp2.status_code == 200
    leads2 = tracker_resp2.json()

    updated_lead = next(l for l in leads2 if l.get("linked_entity_id") == datamyne_id)
    assert updated_lead["status"] == "Quoted"
    assert len(updated_lead["history"]) == 2
    assert updated_lead["history"][-1]["action"] == "Sent quote"
    assert updated_lead["history"][-1]["author_name"] == "Tester"
    assert "Submitted spot rate quote EUR 2.45/kg" in updated_lead["history"][-1]["notes"]

    # -------------------------------------------------------------------------
    # Step 7: Verify KPIs aggregate this quoted lead
    # -------------------------------------------------------------------------
    kpis_resp = client.get("/api/v1/lead-tracker/kpis", headers=admin_auth)
    assert kpis_resp.status_code == 200
    kpis = kpis_resp.json()
    assert kpis["total_leads"] >= 1
    assert kpis["quoted_leads"] >= 1
    assert kpis["active_leads"] >= 1
