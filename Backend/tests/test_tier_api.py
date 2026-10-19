"""Tests for the isolated Tier A / Tier B API router (/api/v1/tiers)."""
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_get_tier_counts():
    """Verify tier summary counts endpoint."""
    response = client.get("/api/v1/tiers/counts")
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
    response = client.get("/api/v1/tiers/leads?status=Tier A&page=1&page_size=10")
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
    # First get a lead id
    list_res = client.get("/api/v1/tiers/leads?status=Tier A&page_size=1")
    assert list_res.status_code == 200
    lead_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/tiers/{lead_id}/breakdown")
    assert response.status_code == 200
    breakdown = response.json()
    assert breakdown["id"] == lead_id
    assert "score_breakdown" in breakdown
    assert "frequency_score" in breakdown["score_breakdown"]
    assert "mode_score" in breakdown["score_breakdown"]
