"""Tests for the isolated Tier A / Tier B API router (/api/v1/tiers)."""
from fastapi.testclient import TestClient

from src.api.auth import create_token
from src.api.config import settings
from src.api.main import app

client = TestClient(app)


def _get_auth_headers() -> dict[str, str]:
    token, _ = create_token({"sub": "deepak@jfll.com", "name": "Deepak Naidu", "role": "Tech Lead"})
    return {"Authorization": f"Bearer {token}"}


def test_get_tier_counts():
    """Verify tier summary counts endpoint."""
    headers = _get_auth_headers()
    response = client.get("/api/v1/tiers/counts", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "tier_a" in data
    assert "tier_b" in data
    assert "parked" in data
    assert "excluded" in data
    assert "unscored" in data
    assert "all" in data
    assert data["tier_a"] > 0
    assert data["all"] == 37273


def test_get_tier_leads_pagination():
    """Verify paginated listing for Tier A leads."""
    headers = _get_auth_headers()
    response = client.get("/api/v1/tiers/leads?status=Tier A&page=1&page_size=10", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1
    assert len(data["items"]) == 10
    first = data["items"][0]
    assert first["segment_status"] == "Tier A"
    assert "total_score" in first
    assert first["total_score"] >= 60  # Minimum for Tier A (normal cutoff 70, strategic override 60)
    assert "score_breakdown" in first


def test_get_tier_lead_single_breakdown():
    """Verify single lead breakdown lookup."""
    headers = _get_auth_headers()
    # First get a lead id
    list_res = client.get("/api/v1/tiers/leads?status=Tier A&page_size=1", headers=headers)
    assert list_res.status_code == 200
    lead_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/tiers/{lead_id}/breakdown", headers=headers)
    assert response.status_code == 200
    breakdown = response.json()
    assert breakdown["id"] == lead_id
    assert "score_breakdown" in breakdown
    assert "frequency_score" in breakdown["score_breakdown"]
    assert "mode_score" in breakdown["score_breakdown"]


def test_tier_endpoints_unauthorized_or_invalid_token():
    """Verify that invalid/expired token or production unauthenticated request returns 401."""
    # 1. Invalid Bearer token
    invalid_headers = {"Authorization": "Bearer invalid.expired.token"}
    res1 = client.get("/api/v1/tiers/counts", headers=invalid_headers)
    assert res1.status_code == 401
    assert "Invalid or expired session token" in res1.json()["detail"]

    res2 = client.get("/api/v1/tiers/leads", headers=invalid_headers)
    assert res2.status_code == 401
    assert "Invalid or expired session token" in res2.json()["detail"]

    res3 = client.get("/api/v1/tiers/some-lead-id/breakdown", headers=invalid_headers)
    assert res3.status_code == 401
    assert "Invalid or expired session token" in res3.json()["detail"]

    # 2. Production environment without auth
    orig_env = settings.env
    try:
        settings.env = "production"
        res_prod_counts = client.get("/api/v1/tiers/counts")
        assert res_prod_counts.status_code == 401
        assert "Authentication required to access tiered leads" in res_prod_counts.json()["detail"]

        res_prod_leads = client.get("/api/v1/tiers/leads")
        assert res_prod_leads.status_code == 401
        assert "Authentication required to access tiered leads" in res_prod_leads.json()["detail"]

        res_prod_breakdown = client.get("/api/v1/tiers/some-lead-id/breakdown")
        assert res_prod_breakdown.status_code == 401
        assert "Authentication required to access tiered leads" in res_prod_breakdown.json()["detail"]
    finally:
        settings.env = orig_env


def test_tier_leads_faceted_filtering_perishables_and_mumbai():
    """Verify multi-faceted filtering for SOP Tier A with Category, City, Mode, and Role."""
    headers = _get_auth_headers()

    # 1. Tier A + Perishables
    res_perishables = client.get("/api/v1/tiers/leads?status=Tier A&categories=Perishables&page_size=10", headers=headers)
    assert res_perishables.status_code == 200
    data_p = res_perishables.json()
    assert data_p["total"] == 243
    assert all(item["category"] == "Perishables" for item in data_p["items"])
    assert all(item["segment_status"] == "Tier A" for item in data_p["items"])

    # 2. Tier A + Perishables + Mumbai (verifying the exact user reported test case)
    res_mumbai = client.get("/api/v1/tiers/leads?status=Tier A&categories=Perishables&cities=MUMBAI&page_size=100", headers=headers)
    assert res_mumbai.status_code == 200
    data_m = res_mumbai.json()
    assert data_m["total"] == 57
    assert len(data_m["items"]) == 57
    assert all("mumbai" in item["city"].lower() for item in data_m["items"])
    assert all(item["category"] == "Perishables" for item in data_m["items"])

    # 3. Tier A + Perishables + Mumbai + Transport Mode Air
    res_air = client.get("/api/v1/tiers/leads?status=Tier A&categories=Perishables&cities=MUMBAI&transport_modes=Air", headers=headers)
    assert res_air.status_code == 200
    data_air = res_air.json()
    assert data_air["total"] == 53
    assert all(item["transport_mode"] == "Air" for item in data_air["items"])

    # 4. Tier A + Pharma & Healthcare + Hyderabad (with URL encoded &)
    res_pharma = client.get("/api/v1/tiers/leads?status=Tier A&categories=Pharma%20%26%20Healthcare&cities=HYDERABAD", headers=headers)
    assert res_pharma.status_code == 200
    assert res_pharma.json()["total"] == 92

    # 5. Filtered Tier Counts
    res_counts = client.get("/api/v1/tiers/counts?categories=Perishables&cities=MUMBAI", headers=headers)
    assert res_counts.status_code == 200
    counts = res_counts.json()
    assert counts["tier_a"] == 57

