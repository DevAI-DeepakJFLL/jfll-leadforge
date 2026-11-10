import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.auth import create_token, set_active_session

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def auth_headers():
    email = "techlead@jfll.com"
    session_id = "sess_people_rigor_12345"
    set_active_session(email, session_id)
    token, _ = create_token({
        "sub": email,
        "name": "Tech Lead",
        "role": "Tech Lead",
        "session_id": session_id,
    })
    return {"Authorization": f"Bearer {token}"}

# ==============================================================================
# SECTION 1: FREIGHT ROLE FOCUS (logistics_only & decision_makers_only)
# ==============================================================================

def test_people_base_default_logistics(client, auth_headers):
    """Verifies default people search returns the 684,087 logistics specialists."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&logistics_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 684087
    assert len(data["data"]) == 10
    for contact in data["data"]:
        assert contact["is_logistics_role"] is True

def test_people_all_executives_unfiltered(client, auth_headers):
    """Verifies unchecking logistics role returns all 15.5M global decision-makers and executives."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&logistics_only=false", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 15526269
    assert len(data["data"]) == 10

def test_people_decision_makers_only(client, auth_headers):
    """Verifies decision_makers_only filters strictly to C-Suite, VP, Director, Head, or Manager."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=15&decision_makers_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 4905303
    assert len(data["data"]) == 15
    for contact in data["data"]:
        assert contact["is_decision_maker"] is True

# ==============================================================================
# SECTION 2: SENIORITY LEVEL FILTERS
# ==============================================================================

@pytest.mark.parametrize("tier_id,min_count", [
    ("c_suite", 130000),
    ("vp", 250000),
    ("director", 600000),
    ("manager", 3000000),
    ("senior", 600000),
    ("owner", 190000),
])
def test_people_seniority_tiers(client, auth_headers, tier_id, min_count):
    """Verifies all seniority tiers filter accurately and return realistic non-trivial counts."""
    resp = client.get(f"/api/v1/apollo/contacts?page=1&page_size=10&seniority={tier_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] >= min_count
    assert len(data["data"]) == 10
    for contact in data["data"]:
        assert contact["seniority"] is not None

# ==============================================================================
# SECTION 3: DEPARTMENT FILTERS
# ==============================================================================

def test_people_department_operations(client, auth_headers):
    """Verifies Operations department filter."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&department=operations", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 250000
    assert len(data["data"]) == 10

def test_people_department_supply_chain(client, auth_headers):
    """Verifies Supply Chain & Procurement custom mapping captures relevant specialists."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&department=supply_chain", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 100000
    assert len(data["data"]) == 10
    for contact in data["data"]:
        title_lower = (contact["job_title"] or "").lower()
        dept_lower = (contact["department"] or "").lower()
        assert "supply" in title_lower or "procurement" in title_lower or "supply" in dept_lower

# ==============================================================================
# SECTION 4: TRADE CORRIDORS / COUNTRIES (Single & Multi-Select)
# ==============================================================================

def test_people_country_single_name(client, auth_headers):
    """Verifies single country name filter (India)."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&country=India", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 500000
    for contact in data["data"]:
        assert (contact["contact_country"] or "").lower() == "india"

def test_people_country_iso_code(client, auth_headers):
    """Verifies 2-letter ISO country code normalizes accurately (IN -> india)."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&country=IN", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 500000
    for contact in data["data"]:
        assert (contact["contact_country"] or "").lower() == "india"

def test_people_countries_multi_select(client, auth_headers):
    """Verifies multi-select countries (India and Brazil)."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=15&countries=India&countries=Brazil", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 1000000
    for contact in data["data"]:
        c = (contact["contact_country"] or "").lower()
        assert c in ["india", "brazil"]

# ==============================================================================
# SECTION 5: CARGO VERTICALS / INDUSTRIES
# ==============================================================================

def test_people_cargo_vertical_automotive(client, auth_headers):
    """Verifies Automotive & Transportation display label maps to underlying Apollo slugs."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&industry=Automotive+%26+Transportation", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 1000000
    assert len(data["data"]) == 10
    for contact in data["data"]:
        ind = (contact["industry"] or "").lower()
        assert ind in ["automotive", "transportation", "logistics & supply chain"]

def test_people_cargo_vertical_pharma(client, auth_headers):
    """Verifies Pharmaceuticals & Healthcare display label maps to underlying Apollo slugs."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&industries=Pharmaceuticals+%26+Healthcare", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 900000
    assert len(data["data"]) == 10
    for contact in data["data"]:
        ind = (contact["industry"] or "").lower()
        assert ind in ["pharmaceuticals", "medical devices", "biotechnology"]

# ==============================================================================
# SECTION 6: COMPANY HEADCOUNT TIERS
# ==============================================================================

def test_people_company_size_tier_1_10(client, auth_headers):
    """Verifies 1-10 headcount company size tier."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&company_sizes=1-10", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 1000000
    for contact in data["data"]:
        assert contact["employee_count"] is not None
        assert 1 <= contact["employee_count"] <= 10

def test_people_company_size_tier_1000plus(client, auth_headers):
    """Verifies 1000+ enterprise headcount company size tier."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&company_sizes=1000%2B", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 5000000
    for contact in data["data"]:
        assert contact["employee_count"] is not None
        assert contact["employee_count"] > 1000

# ==============================================================================
# SECTION 7: OUTREACH READINESS
# ==============================================================================

def test_people_has_email_only(client, auth_headers):
    """Verifies has_email_only requires verified direct email."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=15&has_email_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 10000000
    for contact in data["data"]:
        assert contact["has_email"] is True
        assert contact["email"] and "@" in contact["email"]

def test_people_has_linkedin_only(client, auth_headers):
    """Verifies has_linkedin_only requires personal LinkedIn URL."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=15&has_linkedin_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 10000000
    for contact in data["data"]:
        assert contact["linkedin_url"] and len(contact["linkedin_url"].strip()) > 5

# ==============================================================================
# SECTION 8: RECORD ENRICHMENT
# ==============================================================================

def test_people_contact_enrichment(client, auth_headers):
    """Verifies contacts are enriched with real employer_name, employee_count, and industry."""
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=20&logistics_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    for contact in data["data"]:
        assert contact["person_id"]
        assert contact["person_name"]
        assert contact["job_title"]
        if contact["organization_id"]:
            assert contact["employer_name"] and contact["employer_name"] != "COMMERCIAL SHIPPER"
            assert contact["employee_count"] is not None
            assert contact["industry"] is not None
