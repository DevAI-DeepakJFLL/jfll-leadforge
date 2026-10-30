"""Unit and integration tests for Sales Approach Logs and Active Conversion API."""

from fastapi.testclient import TestClient
import pytest

from src.api.approach_routes import get_storage_path, save_approach_data
from src.api.auth import create_token
from src.api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_approach_store(tmp_path, monkeypatch):
    """Isolate approach log persistence file for each test."""
    test_store = tmp_path / "test_approach_logs.json"
    monkeypatch.setenv("APPROACH_LOGS_PATH", str(test_store))
    save_approach_data({"version": 1, "entities": {}})
    yield test_store


def _auth_header(email: str = "deepak@jfll.com", name: str = "Deepak Naidu", role: str = "Tech Lead") -> dict[str, str]:
    token, _ = create_token({"sub": email, "name": name, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_approach_history_defaults_to_not_contacted():
    """Uncontacted customer or lead returns Not Contacted and empty timeline."""
    headers = _auth_header()
    res = client.get("/api/v1/approach-logs/jfll_customer/cust_999", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["entity_type"] == "jfll_customer"
    assert data["entity_id"] == "cust_999"
    assert data["current_status"] == "Not Contacted"
    assert data["is_active_converted"] is False
    assert len(data["logs"]) == 0


def test_log_forward_approach_without_note_succeeds():
    """Forward status change (Not Contacted -> Contacted) allows optional note."""
    headers = _auth_header(email="deepak@jfll.com", name="Deepak Naidu")
    payload = {
        "action": "Called customer",
        "status": "Contacted",
        "note": None,
    }
    res = client.post("/api/v1/approach-logs/jfll_customer/cust_001", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["current_status"] == "Contacted"
    assert len(data["logs"]) == 1
    log = data["logs"][0]
    assert log["action"] == "Called customer"
    assert log["previous_status"] == "Not Contacted"
    assert log["status"] == "Contacted"
    assert log["salesperson_name"] == "Deepak Naidu"
    assert log["salesperson_email"] == "deepak@jfll.com"


def test_log_mandatory_note_for_hold_no_response_uninterested():
    """On Hold, No Response, and Not Interested strictly require an explanatory note."""
    headers = _auth_header()

    for target_status in ["On Hold", "No Response", "Not Interested"]:
        # Without note -> 422 Unprocessable Entity
        res_fail = client.post(
            "/api/v1/approach-logs/datamyne/dm_101",
            json={"action": "Sent email", "status": target_status, "note": "   "},
            headers=headers,
        )
        assert res_fail.status_code == 422
        assert "requires an explanatory note" in res_fail.json()["detail"]

        # With note -> 200 OK
        res_ok = client.post(
            "/api/v1/approach-logs/datamyne/dm_101",
            json={"action": "Sent email", "status": target_status, "note": f"Explaining why {target_status}"},
            headers=headers,
        )
        assert res_ok.status_code == 200
        assert res_ok.json()["current_status"] == target_status


def test_backward_status_movement_requires_note():
    """Moving backward in the funnel strictly requires an explanatory note."""
    headers = _auth_header()

    # Step 1: Advance to In Progress (Rank 4)
    res1 = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_002",
        json={"action": "Held meeting", "status": "In Progress", "note": "Meeting done"},
        headers=headers,
    )
    assert res1.status_code == 200
    assert res1.json()["current_status"] == "In Progress"

    # Step 2: Attempt backward move to Contacted (Rank 1) without note -> 422
    res_bad = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_002",
        json={"action": "Called customer", "status": "Contacted", "note": None},
        headers=headers,
    )
    assert res_bad.status_code == 422
    assert "Moving status backward" in res_bad.json()["detail"]

    # Step 3: Backward move with valid note -> 200 OK
    res_good = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_002",
        json={"action": "Called customer", "status": "Contacted", "note": "Resetting deal scope after restructuring"},
        headers=headers,
    )
    assert res_good.status_code == 200
    assert res_good.json()["current_status"] == "Contacted"
    assert len(res_good.json()["logs"]) == 2


def test_standard_endpoint_rejects_converted_to_active_selection():
    """Attempting to select 'Converted to Active' from standard approach form is rejected with 400."""
    headers = _auth_header()
    res = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_003",
        json={"action": "Sent quote", "status": "Converted to Active", "note": "Trying to shortcut"},
        headers=headers,
    )
    assert res.status_code == 400
    assert "Cannot select 'Converted to Active' directly" in res.json()["detail"]


def test_convert_to_active_workflow():
    """Dedicated conversion endpoint records start date, transitions status, and appends milestone log."""
    headers = _auth_header(email="deepak@jfll.com", name="Deepak Naidu")

    # Invalid date format -> 422
    res_bad_date = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_004/convert-to-active",
        json={"start_date": "30-10-2026", "note": "Bad date format"},
        headers=headers,
    )
    assert res_bad_date.status_code == 422

    # Valid conversion
    payload = {
        "start_date": "2026-11-01",
        "note": "Signed 1-year freight contract.",
    }
    res = client.post(
        "/api/v1/approach-logs/jfll_customer/cust_004/convert-to-active",
        json=payload,
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["current_status"] == "Converted to Active"
    assert data["is_active_converted"] is True
    assert data["conversion_start_date"] == "2026-11-01"
    assert data["converted_at"] is not None

    assert len(data["logs"]) == 1
    log = data["logs"][0]
    assert log["status"] == "Converted to Active"
    assert "Effective start date: 2026-11-01" in log["note"]
    assert "Signed 1-year freight contract." in log["note"]
    assert log["salesperson_email"] == "deepak@jfll.com"


def test_bulk_statuses_endpoint():
    """Bulk status endpoint provides quick dictionary for fast table column hydration."""
    headers = _auth_header()

    # Log approach for two customers
    client.post(
        "/api/v1/approach-logs/jfll_customer/cust_10",
        json={"action": "Called customer", "status": "Contacted"},
        headers=headers,
    )
    client.post(
        "/api/v1/approach-logs/jfll_customer/cust_20",
        json={"action": "Sent quote", "status": "Working on It"},
        headers=headers,
    )

    bulk_res = client.get("/api/v1/approach-logs/bulk-statuses?entity_type=jfll_customer", headers=headers)
    assert bulk_res.status_code == 200
    data = bulk_res.json()
    assert data["entity_type"] == "jfll_customer"
    assert data["total_tracked"] >= 2
    assert data["statuses"]["cust_10"] == "Contacted"
    assert data["statuses"]["cust_20"] == "Working on It"
