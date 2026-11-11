"""Integration and unit tests for Phase 2 Lead Status Tracker REST API.

Tests:
1. Seeder cold start hydration (14 records from Phase2/Lead_Tracker.xlsx).
2. KPI calculations (total, active, quoted, won, overdue).
3. Single-pass filtering by branch (Mumbai, Gujarat, South India), rep (Edward, Tasneem, Sidhart Ji), and overdue_only.
4. Search across company name, contact, notes, and actions.
5. Create new tracked lead with auto ID and sales rep email resolution.
6. Patch updates (status, feedback notes, follow-up reschedule, reassignment).
7. Append activity / touchpoint timeline logging.
8. Delete lead with 404 verification.
9. RBAC authorization (unauthenticated rejected, Deepak & Tyra accepted, invalid tokens and unauthorized roles rejected).
10. Sorting behavior (by updated_at and next_followup_date).
"""

from datetime import date
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from src.api.access_control import add_to_allowlist
from src.api.auth import create_token
from src.api.lead_tracker_db import seed_from_excel_if_empty
from src.api.lead_tracker_routes import (
    compute_tracker_kpis,
    load_tracker_data,
    reset_tracker_cache,
    save_tracker_data,
)
from src.api.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_tracker_store(request, tmp_path, monkeypatch):
    """Isolate lead tracker storage in a temporary directory for each test run."""
    test_store = tmp_path / "test_lead_tracker.json"
    monkeypatch.setenv("LEAD_TRACKER_PATH", str(test_store))
    reset_tracker_cache()
    # Unless testing unseeded cold-start behavior, seed the test store with the 14 records
    # so filter/KPI/search integration tests have valid baseline fixture data.
    if "unseeded" not in request.node.name and "cold_start" not in request.node.name:
        seed_from_excel_if_empty(db_path=test_store.with_suffix(".db"))
    yield test_store
    reset_tracker_cache()


def _auth_header(
    email: str = "deepak@jfll.com",
    name: str = "Deepak Naidu",
    role: str = "Tech Lead",
) -> dict[str, str]:
    """Generates standard RFC 7519 JWT authorization header with valid user agent."""
    token, _ = create_token({"sub": email, "name": name, "role": role})
    return {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0"}


# ---------------------------------------------------------------------------
# 1. Cold Start & Seeder Hydration
# ---------------------------------------------------------------------------

def test_cold_start_unseeded_store_serves_zero_records():
    """Verifies that an uninitialized store cold-starts clean with 0 records (no Excel auto-seeding)."""
    headers = _auth_header()
    res = client.get("/api/v1/lead-tracker", headers=headers)
    assert res.status_code == 200
    leads = res.json()
    assert len(leads) == 0
    assert leads == []


def test_unseeded_seed_from_excel_utility_populates_14_records(clean_tracker_store):
    """Verifies that seed_from_excel_if_empty populates 14 records when explicitly invoked."""
    db_file = clean_tracker_store.with_suffix(".db")
    count = seed_from_excel_if_empty(db_path=db_file)
    assert count == 14

    headers = _auth_header()
    res = client.get("/api/v1/lead-tracker", headers=headers)
    assert res.status_code == 200
    leads = res.json()
    assert len(leads) == 14

    company_names = {lead["company_name"] for lead in leads}
    assert "Royal Arc" in company_names
    assert "SIMSON PHARMA LIMITED" in company_names
    assert "CLEARSYNTH LABS LIMITED" in company_names
    assert "Himedia labs" in company_names
    assert "Pooja Foods" in company_names
    assert "MEGA FINE PHARMA PRIVATE LIMITED" in company_names

    # Check that each item has a valid trk_ prefix and history
    for item in leads:
        assert item["id"].startswith("trk_")
        assert len(item["history"]) >= 1


# ---------------------------------------------------------------------------
# 2. Executive KPIs Calculation
# ---------------------------------------------------------------------------

def test_kpis_calculation():
    """Verifies single-pass KPI calculations against the baseline 14 records."""
    headers = _auth_header()
    res = client.get("/api/v1/lead-tracker/kpis", headers=headers)
    assert res.status_code == 200
    kpis = res.json()

    assert kpis["total_leads"] == 14
    assert kpis["active_leads"] == 14  # None in Won or Closed / Lost
    assert kpis["quoted_leads"] == 1   # Royal Arc
    assert kpis["won_leads"] == 0
    assert kpis["overdue_leads"] == 13  # 13 have past follow-up dates (< 2026-11-10); Mega Fine has None


# ---------------------------------------------------------------------------
# 3. Filtering: Branch, Sales Rep, Overdue Only
# ---------------------------------------------------------------------------

def test_filter_by_branch_mumbai_and_gujarat():
    """Filters leads by branch location."""
    headers = _auth_header()

    # Mumbai (10 leads)
    res_mumbai = client.get("/api/v1/lead-tracker?branch=Mumbai", headers=headers)
    assert res_mumbai.status_code == 200
    mumbai_leads = res_mumbai.json()
    assert len(mumbai_leads) == 10
    assert all(l["branch"] == "Mumbai" for l in mumbai_leads)

    # Gujarat (3 leads: Veer Internatinal, Pooja Foods, Kirti Foods)
    res_gujarat = client.get("/api/v1/lead-tracker?branch=Gujarat", headers=headers)
    assert res_gujarat.status_code == 200
    gujarat_leads = res_gujarat.json()
    assert len(gujarat_leads) == 3
    assert all(l["branch"] == "Gujarat" for l in gujarat_leads)
    gujarat_companies = {l["company_name"] for l in gujarat_leads}
    assert "Veer Internatinal" in gujarat_companies
    assert "Pooja Foods" in gujarat_companies
    assert "Kirti Foods" in gujarat_companies

    # South India (1 lead: Sun Bio)
    res_south = client.get("/api/v1/lead-tracker?branch=South%20India", headers=headers)
    assert res_south.status_code == 200
    south_leads = res_south.json()
    assert len(south_leads) == 1
    assert south_leads[0]["company_name"] == "Sun Bio"


def test_filter_by_assigned_sales_rep():
    """Filters leads by assigned sales coordinator."""
    headers = _auth_header()

    # Edward (Royal Arc, CLEARSYNTH LABS LIMITED)
    res_edward = client.get("/api/v1/lead-tracker?assigned_to=Edward", headers=headers)
    assert res_edward.status_code == 200
    edward_leads = res_edward.json()
    assert len(edward_leads) == 2
    assert all("Edward" in l["assigned_to"] for l in edward_leads)

    # Tasneem (VEA IMPEX, Himedia labs)
    res_tasneem = client.get("/api/v1/lead-tracker?assigned_to=Tasneem", headers=headers)
    assert res_tasneem.status_code == 200
    tasneem_leads = res_tasneem.json()
    assert len(tasneem_leads) == 2
    assert all("Tasneem" in l["assigned_to"] for l in tasneem_leads)

    # Sidhart Ji (Veer Internatinal, Pooja Foods, Kirti Foods)
    res_sidhart = client.get("/api/v1/lead-tracker?assigned_to=Sidhart%20Ji", headers=headers)
    assert res_sidhart.status_code == 200
    sidhart_leads = res_sidhart.json()
    assert len(sidhart_leads) == 3
    assert all("Sidhart" in l["assigned_to"] for l in sidhart_leads)


def test_filter_overdue_only():
    """Filters only active leads that have next_followup_date < today."""
    headers = _auth_header()
    res = client.get("/api/v1/lead-tracker?overdue_only=true", headers=headers)
    assert res.status_code == 200
    overdue_leads = res.json()
    assert len(overdue_leads) == 13

    today_str = date.today().isoformat()
    for l in overdue_leads:
        assert l["next_followup_date"] is not None
        assert l["next_followup_date"] < today_str
        assert l["status"] not in ("Won", "Closed / Lost")

    # MEGA FINE PHARMA has next_followup_date = None, so it must not be in overdue results
    overdue_companies = {l["company_name"] for l in overdue_leads}
    assert "MEGA FINE PHARMA PRIVATE LIMITED" not in overdue_companies


def test_search_filtering():
    """Tests free-text search across company name, notes, and actions."""
    headers = _auth_header()

    # Search by company name
    res = client.get("/api/v1/lead-tracker?search=Simson", headers=headers)
    assert res.status_code == 200
    leads = res.json()
    assert len(leads) == 1
    assert "SIMSON PHARMA LIMITED" in leads[0]["company_name"]

    # Search by keyword in feedback notes ("temperature" or "cold")
    res_notes = client.get("/api/v1/lead-tracker?search=temperature", headers=headers)
    assert res_notes.status_code == 200
    notes_leads = res_notes.json()
    assert len(notes_leads) >= 1
    assert any("temperature" in (l.get("feedback_notes") or "").lower() for l in notes_leads)


# ---------------------------------------------------------------------------
# 4. CRUD Operations: Create, Read, Update, Activity Log, Delete
# ---------------------------------------------------------------------------

def test_create_new_tracked_lead():
    """Creates a new lead entry and checks rep email lookup and initial history."""
    headers = _auth_header(name="Tyra Theknath", email="tyra@jfll.com")
    payload = {
        "company_name": "Bharat Serums and Vaccines Ltd",
        "contact_person": "Dr. Rajesh Sharma",
        "contact_phone": "+91 98200 12345",
        "contact_email": "r.sharma@bharatserums.com",
        "branch": "Mumbai",
        "assigned_to": "Edward",
        "assigned_by": "Tyra Theknath",
        "assigned_date": "2026-11-10",
        "status": "Assigned",
        "transport_mode": "Air Freight",
        "routing_type": "Freehand",
        "feedback_notes": "Urgent cold chain requirement (+2C to +8C).",
        "next_followup_date": "2026-11-15",
        "next_action": "Send cold chain rate proposal for BOM to FRA",
    }

    res = client.post("/api/v1/lead-tracker", json=payload, headers=headers)
    assert res.status_code == 201
    lead = res.json()

    assert lead["id"].startswith("trk_")
    assert lead["company_name"] == "Bharat Serums and Vaccines Ltd"
    assert lead["assigned_to"] == "Edward"
    assert lead["assigned_to_email"] == "edward@jfll.com"  # Auto-resolved
    assert lead["transport_mode"] == "Air Freight"
    assert lead["routing_type"] == "Freehand"
    assert len(lead["history"]) == 1
    assert lead["history"][0]["action"] == "Lead Created / Assigned"

    # Verify lead count increases from 14 to 15
    res_list = client.get("/api/v1/lead-tracker", headers=headers)
    assert len(res_list.json()) == 15


def test_update_lead_status_and_feedback():
    """Updates lead attributes and records automatic status transition logs."""
    headers = _auth_header()

    # Get first lead
    res_all = client.get("/api/v1/lead-tracker", headers=headers)
    target_id = res_all.json()[0]["id"]

    update_payload = {
        "status": "Quoted",
        "feedback_notes": "Offered $2.10/kg BOM to DXB on EK. Waiting for customer sign-off.",
        "next_followup_date": "2026-11-18",
    }

    res_patch = client.patch(f"/api/v1/lead-tracker/{target_id}", json=update_payload, headers=headers)
    assert res_patch.status_code == 200
    updated = res_patch.json()

    assert updated["id"] == target_id
    assert updated["status"] == "Quoted"
    assert "Offered $2.10/kg" in updated["feedback_notes"]
    assert updated["next_followup_date"] == "2026-11-18"

    # Verify history entry created
    history_actions = [h["action"] for h in updated["history"]]
    assert "Status Change" in history_actions


def test_reassign_lead():
    """Reassigns a lead to another sales coordinator and checks email resolution and history log."""
    headers = _auth_header()
    res_all = client.get("/api/v1/lead-tracker", headers=headers)
    target_id = res_all.json()[0]["id"]

    res_patch = client.patch(
        f"/api/v1/lead-tracker/{target_id}",
        json={"assigned_to": "Tasneem"},
        headers=headers,
    )
    assert res_patch.status_code == 200
    updated = res_patch.json()
    assert updated["assigned_to"] == "Tasneem"
    assert updated["assigned_to_email"] == "tasneem@jfll.com"

    history_actions = [h["action"] for h in updated["history"]]
    assert "Reassignment" in history_actions


def test_append_tracker_activity_history():
    """Appends an interaction log entry to a lead's chronological timeline."""
    headers = _auth_header(name="Deepak Naidu", email="deepak@jfll.com")
    res_all = client.get("/api/v1/lead-tracker", headers=headers)
    target_id = res_all.json()[0]["id"]
    prev_history_len = len(res_all.json()[0]["history"])

    activity_payload = {
        "action": "Shipper Warehouse Visit",
        "notes": "Met shipping head. Verified pallet dimensions and cold packaging requirements.",
        "status": "Trial Shipment",
        "next_followup_date": "2026-11-20",
    }

    res_act = client.post(
        f"/api/v1/lead-tracker/{target_id}/activity",
        json=activity_payload,
        headers=headers,
    )
    assert res_act.status_code == 200
    updated = res_act.json()

    assert updated["status"] == "Trial Shipment"
    assert updated["next_followup_date"] == "2026-11-20"
    assert len(updated["history"]) == prev_history_len + 1

    latest_entry = updated["history"][-1]
    assert latest_entry["action"] == "Shipper Warehouse Visit"
    assert "pallet dimensions" in latest_entry["notes"]
    assert latest_entry["author_name"] == "Deepak Naidu"
    assert latest_entry["author_email"] == "deepak@jfll.com"


def test_append_activity_syncs_notes_and_status():
    """Verifies that appending an activity to a tracked lead updates item.feedback_notes (trimmed), status, and next_followup_date."""
    headers = _auth_header(name="Deepak Naidu", email="deepak@jfll.com")
    res_all = client.get("/api/v1/lead-tracker", headers=headers)
    target = res_all.json()[0]
    target_id = target["id"]

    activity_payload = {
        "action": "Rate Discussion",
        "notes": "  Discussed Q1 contract rates for export freight.  ",
        "status": "Quoted",
        "next_followup_date": "2026-12-01",
    }

    res_act = client.post(
        f"/api/v1/lead-tracker/{target_id}/activity",
        json=activity_payload,
        headers=headers,
    )
    assert res_act.status_code == 200
    item = res_act.json()

    # feedback_notes must be synced and trimmed
    assert item["feedback_notes"] == "Discussed Q1 contract rates for export freight."
    assert item["status"] == "Quoted"
    assert item["next_followup_date"] == "2026-12-01"

    # Direct fetch from persistence must also reflect the synced feedback_notes
    res_get = client.get(f"/api/v1/lead-tracker/{target_id}", headers=headers)
    assert res_get.status_code == 200
    fetched = res_get.json()
    assert fetched["feedback_notes"] == "Discussed Q1 contract rates for export freight."
    assert fetched["status"] == "Quoted"
    assert fetched["next_followup_date"] == "2026-12-01"


def test_delete_tracked_lead():
    """Deletes a tracked lead and confirms it cannot be retrieved subsequently."""
    headers = _auth_header()
    res_all = client.get("/api/v1/lead-tracker", headers=headers)
    target_id = res_all.json()[0]["id"]

    res_del = client.delete(f"/api/v1/lead-tracker/{target_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True
    assert res_del.json()["deleted_id"] == target_id

    # 404 on direct fetch
    res_get = client.get(f"/api/v1/lead-tracker/{target_id}", headers=headers)
    assert res_get.status_code == 404

    # Lead count reduced by 1
    res_remaining = client.get("/api/v1/lead-tracker", headers=headers)
    assert len(res_remaining.json()) == 13


def test_lead_not_found_handling():
    """Non-existent lead IDs return 404 for GET, PATCH, POST activity, and DELETE."""
    headers = _auth_header()
    non_existent = "trk_000000000000"

    assert client.get(f"/api/v1/lead-tracker/{non_existent}", headers=headers).status_code == 404
    assert client.patch(f"/api/v1/lead-tracker/{non_existent}", json={"status": "Won"}, headers=headers).status_code == 404
    assert client.post(f"/api/v1/lead-tracker/{non_existent}/activity", json={"action": "Call"}, headers=headers).status_code == 404
    assert client.delete(f"/api/v1/lead-tracker/{non_existent}", headers=headers).status_code == 404


# ---------------------------------------------------------------------------
# 5. Authorization & RBAC Checks
# ---------------------------------------------------------------------------

def test_unauthenticated_requests_rejected():
    """Unauthenticated requests without Authorization header return 401."""
    assert client.get("/api/v1/lead-tracker").status_code == 401
    assert client.get("/api/v1/lead-tracker/kpis").status_code == 401
    assert client.post("/api/v1/lead-tracker", json={"company_name": "Test", "assigned_to": "Edward"}).status_code == 401
    assert client.patch("/api/v1/lead-tracker/trk_123", json={"status": "Won"}).status_code == 401
    assert client.delete("/api/v1/lead-tracker/trk_123").status_code == 401


def test_invalid_bearer_token_rejected():
    """Malformed or invalid Bearer token returns 401."""
    bad_headers = {"Authorization": "Bearer invalid.signed.jwt.token", "User-Agent": "Mozilla/5.0"}
    res = client.get("/api/v1/lead-tracker", headers=bad_headers)
    assert res.status_code == 401


def test_deepak_and_tyra_authorized():
    """Root admins Deepak and Tyra (both email formats) have full access."""
    # Deepak
    h_deepak = _auth_header(email="deepak@jfll.com", name="Deepak Naidu", role="Tech Lead")
    assert client.get("/api/v1/lead-tracker/kpis", headers=h_deepak).status_code == 200

    # Tyra (tyra.theknath@jfll.com)
    h_tyra1 = _auth_header(email="tyra.theknath@jfll.com", name="Tyra Theknath", role="Leadership")
    assert client.get("/api/v1/lead-tracker/kpis", headers=h_tyra1).status_code == 200

    # Tyra alternate (tyra@jfll.com)
    h_tyra2 = _auth_header(email="tyra@jfll.com", name="Tyra Theknath", role="Leadership")
    assert client.get("/api/v1/lead-tracker/kpis", headers=h_tyra2).status_code == 200


def test_unauthorized_role_rejected():
    """User with unauthorized role (e.g. Viewer) is rejected with 403 Forbidden."""
    # Seed viewer user to allowlist so session/email active check passes
    try:
        add_to_allowlist(email="test.viewer@jfll.com", name="Test Viewer", role="Viewer", added_by="system_test")
    except Exception:
        pass

    h_viewer = _auth_header(email="test.viewer@jfll.com", name="Test Viewer", role="Viewer")
    res = client.get("/api/v1/lead-tracker", headers=h_viewer)
    assert res.status_code == 403
    assert "PERMISSION_DENIED" in res.json()["detail"]


# ---------------------------------------------------------------------------
# 6. Sorting Behavior
# ---------------------------------------------------------------------------

def test_sorting_by_updated_at_and_next_followup_date():
    """Verifies sorting by updated_at descending and next_followup_date ascending."""
    headers = _auth_header()

    # Default sort: updated_at descending
    res_desc = client.get("/api/v1/lead-tracker?sort_by=updated_at&order=desc", headers=headers)
    assert res_desc.status_code == 200
    leads_desc = res_desc.json()
    for i in range(len(leads_desc) - 1):
        assert leads_desc[i]["updated_at"] >= leads_desc[i + 1]["updated_at"]

    # Sort: next_followup_date ascending (None sorts last)
    res_date = client.get("/api/v1/lead-tracker?sort_by=next_followup_date&order=asc", headers=headers)
    assert res_date.status_code == 200
    leads_date = res_date.json()
    # Mega Fine (next_followup_date is None) should be at the end
    assert leads_date[-1]["next_followup_date"] is None
