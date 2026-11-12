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
    session_id = "sess_test_rigor_12345"
    set_active_session(email, session_id)
    token, _ = create_token({
        "sub": email,
        "name": "Tech Lead",
        "role": "Tech Lead",
        "session_id": session_id,
    })
    return {"Authorization": f"Bearer {token}"}

# ==============================================================================
# SECTION 1: APOLLO COMPANIES VIEW FILTERS
# ==============================================================================

def test_companies_base_unfiltered(client, auth_headers):
    resp = client.get("/api/v1/apollo/leads?page=1&page_size=10", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 684669
    assert len(data["data"]) == 10

def test_companies_filter_employee_tiers(client, auth_headers):
    tier_ranges = {
        "1-10": (1, 10),
        "11-50": (11, 50),
        "51-200": (51, 200),
        "201-500": (201, 500),
        "501-1000": (501, 1000),
        "1000+": (1001, 10000000),
    }
    tier_counts = {}

    for tier_id, (min_val, max_val) in tier_ranges.items():
        resp = client.get(
            f"/api/v1/apollo/leads?page=1&page_size=20&employee_tiers={tier_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        count = data["total_records"]
        assert count > 0, f"Tier {tier_id} returned 0 records"
        assert count < 684669, f"Tier {tier_id} failed to filter (returned all {count})"
        tier_counts[tier_id] = count

        # Verify all returned records strictly adhere to the range
        for rec in data["data"]:
            emp = rec["employee_count"]
            assert emp is not None, f"Tier {tier_id} returned null employee_count"
            assert min_val <= emp <= max_val, f"Tier {tier_id} returned employee_count {emp} outside [{min_val}, {max_val}]"

    # Verify multi-tier combination: '1-10' and '1000+'
    resp_multi = client.get(
        "/api/v1/apollo/leads?page=1&page_size=10&employee_tiers=1-10&employee_tiers=1000+",
        headers=auth_headers,
    )
    assert resp_multi.status_code == 200
    multi_count = resp_multi.json()["total_records"]
    expected_sum = tier_counts["1-10"] + tier_counts["1000+"]
    assert multi_count == expected_sum, f"Multi-tier count {multi_count} != expected sum {expected_sum}"

def test_companies_filter_revenue_ranges(client, auth_headers):
    rev_ranges = {
        "under-1m": (0, 1000000),
        "1m-10m": (1000000, 10000000),
        "10m-50m": (10000000, 50000000),
        "50m-250m": (50000000, 250000000),
        "250m+": (250000000, 100000000000),
    }
    rev_counts = {}

    for range_id, (min_val, max_val) in rev_ranges.items():
        resp = client.get(
            f"/api/v1/apollo/leads?page=1&page_size=20&revenue_ranges={range_id}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        count = data["total_records"]
        assert count > 0, f"Revenue range {range_id} returned 0 records"
        assert count < 684669, f"Revenue range {range_id} failed to filter (returned all {count})"
        rev_counts[range_id] = count

        for rec in data["data"]:
            rev = rec["revenue_usd"]
            assert rev is not None, f"Revenue range {range_id} returned null revenue"
            assert min_val <= rev < max_val or (range_id == "250m+" and rev >= min_val), (
                f"Revenue range {range_id} returned revenue {rev} outside expected range"
            )

    # Multi-range test: 'under-1m' and '250m+'
    resp_multi = client.get(
        "/api/v1/apollo/leads?page=1&page_size=10&revenue_ranges=under-1m&revenue_ranges=250m+",
        headers=auth_headers,
    )
    assert resp_multi.status_code == 200
    multi_count = resp_multi.json()["total_records"]
    expected_sum = rev_counts["under-1m"] + rev_counts["250m+"]
    assert multi_count == expected_sum, f"Multi-revenue count {multi_count} != expected sum {expected_sum}"

def test_companies_filter_countries(client, auth_headers):
    # Brazil
    resp_br = client.get("/api/v1/apollo/leads?page=1&page_size=10&countries=brazil", headers=auth_headers)
    assert resp_br.status_code == 200
    br_data = resp_br.json()
    assert br_data["total_records"] == 11691
    for r in br_data["data"]:
        assert r["hq_country"].lower() == "brazil"

    # India
    resp_in = client.get("/api/v1/apollo/leads?page=1&page_size=10&countries=india", headers=auth_headers)
    assert resp_in.status_code == 200
    in_data = resp_in.json()
    assert in_data["total_records"] == 12280
    for r in in_data["data"]:
        assert r["hq_country"].lower() == "india"

def test_companies_filter_industries(client, auth_headers):
    resp_auto = client.get("/api/v1/apollo/leads?page=1&page_size=10&industries=automotive", headers=auth_headers)
    assert resp_auto.status_code == 200
    data_auto = resp_auto.json()
    assert data_auto["total_records"] == 39760
    for r in data_auto["data"]:
        assert r["industry"].lower() == "automotive"

    resp_multi = client.get(
        "/api/v1/apollo/leads?page=1&page_size=10&industries=automotive&industries=pharmaceuticals",
        headers=auth_headers,
    )
    assert resp_multi.status_code == 200
    assert resp_multi.json()["total_records"] == 49889

def test_companies_filter_channels(client, auth_headers):
    # has_website
    resp_web = client.get("/api/v1/apollo/leads?page=1&page_size=10&has_website=true", headers=auth_headers)
    assert resp_web.status_code == 200
    data_web = resp_web.json()
    assert data_web["total_records"] == 677579
    for r in data_web["data"]:
        assert r["website_url"] is not None and len(r["website_url"].strip()) > 0

    # has_linkedin
    resp_li = client.get("/api/v1/apollo/leads?page=1&page_size=10&has_linkedin=true", headers=auth_headers)
    assert resp_li.status_code == 200
    data_li = resp_li.json()
    assert data_li["total_records"] == 661101
    for r in data_li["data"]:
        assert r["linkedin_url"] is not None and len(r["linkedin_url"].strip()) > 0

def test_companies_audience_tabs(client, auth_headers):
    tab_expected = {
        "all": 684669,
        "high_headcount": 23227,
        "high_revenue": 81920,
        "top_cargo_verticals": 122797,
        "with_website_linkedin": 654068,
    }
    for tab_name, expected_count in tab_expected.items():
        resp = client.get(f"/api/v1/apollo/leads?page=1&page_size=5&tab={tab_name}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["total_records"] == expected_count, f"Tab {tab_name} mismatch"

def test_companies_search_query(client, auth_headers):
    resp = client.get("/api/v1/apollo/leads?page=1&page_size=10&search=Petrobras", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] > 0
    assert any("petrobras" in r["organization_name"].lower() for r in data["data"])

# ==============================================================================
# SECTION 2: APOLLO PEOPLE / CONTACTS VIEW FILTERS
# ==============================================================================

def test_contacts_default_logistics(client, auth_headers):
    resp = client.get("/api/v1/apollo/contacts?page=1&page_size=10&logistics_only=true", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 684087
    for c in data["data"]:
        assert c["is_logistics_role"] is True

def test_contacts_decision_makers_only(client, auth_headers):
    resp = client.get(
        "/api/v1/apollo/contacts?page=1&page_size=10&decision_makers_only=true",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 4905303
    for c in data["data"]:
        assert c["is_decision_maker"] is True

def test_contacts_filter_company_sizes(client, auth_headers):
    # Test 1000+ Enterprise tier in Contacts view
    resp_ent = client.get(
        "/api/v1/apollo/contacts?page=1&page_size=10&company_sizes=1000+",
        headers=auth_headers,
    )
    assert resp_ent.status_code == 200
    data_ent = resp_ent.json()
    assert data_ent["total_records"] > 0
    assert len(data_ent["data"]) > 0

    # Test 1-10 Micro tier in Contacts view
    resp_micro = client.get(
        "/api/v1/apollo/contacts?page=1&page_size=10&company_sizes=1-10",
        headers=auth_headers,
    )
    assert resp_micro.status_code == 200
    data_micro = resp_micro.json()
    assert data_micro["total_records"] > 0
    assert len(data_micro["data"]) > 0

    # The two subsets must have different records
    ent_orgs = {c["organization_id"] for c in data_ent["data"]}
    micro_orgs = {c["organization_id"] for c in data_micro["data"]}
    assert ent_orgs.isdisjoint(micro_orgs), "Enterprise and Micro contacts should not share org IDs"

def test_contacts_filter_seniority(client, auth_headers):
    for sen in ["director", "vp", "c_suite"]:
        resp = client.get(
            f"/api/v1/apollo/contacts?page=1&page_size=10&seniority={sen}",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) > 0
        for c in data["data"]:
            assert c["seniority"].lower() == sen

def test_contacts_outreach_readiness(client, auth_headers):
    resp_email = client.get(
        "/api/v1/apollo/contacts?page=1&page_size=10&has_email_only=true",
        headers=auth_headers,
    )
    assert resp_email.status_code == 200
    data_email = resp_email.json()
    for c in data_email["data"]:
        assert c["has_email"] is True
        assert c["email"] is not None

    resp_li = client.get(
        "/api/v1/apollo/contacts?page=1&page_size=10&has_linkedin_only=true",
        headers=auth_headers,
    )
    assert resp_li.status_code == 200
    data_li = resp_li.json()
    for c in data_li["data"]:
        assert c["linkedin_url"] is not None and len(c["linkedin_url"]) > 5
