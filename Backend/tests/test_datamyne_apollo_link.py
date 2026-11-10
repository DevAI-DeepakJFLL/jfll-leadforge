import pytest
from fastapi.testclient import TestClient

from src.api.auth import create_token, set_active_session
from src.api.helpers import (
    COMPANY_STOP_WORDS,
    CUSTOMS_PREFIX_REGEX,
    ENTERPRISE_ALIASES,
    FREE_WEBMAIL_DOMAINS,
    build_company_search_sql,
    clean_corporate_term,
    extract_company_search_keywords,
    extract_customs_director_name,
    extract_domain_from_email,
)
from src.api.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    email = "techlead@jfll.com"
    session_id = "sess_datamyne_apollo_link_test"
    set_active_session(email, session_id)
    token, _ = create_token({
        "sub": email,
        "name": "Tech Lead",
        "role": "Tech Lead",
        "session_id": session_id,
    })
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# SECTION 1: CUSTOMS PREFIX & SUFFIX NORMALIZATION
# ==============================================================================

def test_customs_prefix_regex():
    """Verify customs prefixes (M/S, MESSRS, SHREE, SHRI, THE) match regex."""
    assert CUSTOMS_PREFIX_REGEX.match("M/S ABC")
    assert CUSTOMS_PREFIX_REGEX.match("M/S. ABC")
    assert CUSTOMS_PREFIX_REGEX.match("M/S.ABC")
    assert CUSTOMS_PREFIX_REGEX.match("M / S ABC")
    assert CUSTOMS_PREFIX_REGEX.match("MESSRS XYZ")
    assert CUSTOMS_PREFIX_REGEX.match("MESSRS. XYZ")
    assert CUSTOMS_PREFIX_REGEX.match("SHREE GANESH")
    assert CUSTOMS_PREFIX_REGEX.match("SHRI GANESH")
    assert CUSTOMS_PREFIX_REGEX.match("THE SUPREME")
    assert CUSTOMS_PREFIX_REGEX.match("MS STEEL")

    # Word boundary guards
    assert not CUSTOMS_PREFIX_REGEX.match("MICROSOFT")
    assert not CUSTOMS_PREFIX_REGEX.match("SHREEDHAR")
    assert not CUSTOMS_PREFIX_REGEX.match("THERMO")


@pytest.mark.parametrize("raw_name,expected_clean", [
    ("M/S SCHNEIDER ELECTRIC INDIA PRIVATE LIMITED", "schneider electric"),
    ("M/S. ACME EXPORTS & IMPEX (ASIA) LTD", "acme exports"),
    ("MESSRS RELIANCE INDUSTRIES LIMITED", "reliance industries"),
    ("SHREE GANESH ENTERPRISES PVT LTD", "ganesh enterprises"),
    ("THE SUPREME INDUSTRIES LTD", "supreme industries"),
    ("NAMDHARI SEEDS PRIVATE LIMITED", "namdhari seeds"),
    ("AMPHENOL INTERCONNECT INDIA PRIVATE LIMITED", "amphenol interconnect"),
    ("M/S.SHREE BALAJI IMPEX", "balaji"),
    ("TATA MOTORS ASIA PACIFIC LTD", "tata motors pacific"),
    ("LARSEN & TOUBRO LIMITED", "larsen & toubro"),
])
def test_clean_corporate_term_customs_and_suffixes(raw_name, expected_clean):
    """Verify commercial names strip customs prefixes, regional qualifiers, and trading tokens."""
    assert clean_corporate_term(raw_name) == expected_clean


def test_clean_corporate_term_edge_cases():
    """Verify fallback safety when cleaning corporate terms."""
    assert clean_corporate_term("") == ""
    assert clean_corporate_term(None) == ""
    # When name is only stop words / suffix tokens, it should preserve the base rather than returning empty
    result = clean_corporate_term("IMPEX INDIA")
    assert len(result) >= 2


# ==============================================================================
# SECTION 2: COMPANY STOP WORDS & KEYWORD EXTRACTION
# ==============================================================================

def test_company_stop_words_membership():
    """Verify COMPANY_STOP_WORDS includes customs prefixes, regional qualifiers, and trading tokens."""
    for token in ["ms", "messrs", "shree", "shri", "asia", "impex", "exports", "imports", "llp", "india"]:
        assert token in COMPANY_STOP_WORDS


def test_extract_company_search_keywords():
    """Verify extracted keywords strip stop words cleanly."""
    assert extract_company_search_keywords("M/S ACME IMPEX INDIA") == ["acme"]
    assert extract_company_search_keywords("SHREE GANESH ENTERPRISES") == ["ganesh"]
    assert extract_company_search_keywords("SCHNEIDER ELECTRIC INDIA PVT LTD") == ["schneider", "electric"]


# ==============================================================================
# SECTION 3: BIDIRECTIONAL ENTERPRISE & PSU ALIASES
# ==============================================================================

def test_enterprise_aliases_bidirectional():
    """Verify major Indian PSUs and enterprises are mapped bidirectionally."""
    # BHEL <-> Bharat Heavy Electricals
    assert "bharat heavy electricals" in ENTERPRISE_ALIASES["bhel"]
    assert "bhel" in ENTERPRISE_ALIASES["bharat heavy electricals"]

    # L&T <-> Larsen & Toubro
    assert "larsen & toubro" in ENTERPRISE_ALIASES["l&t"]
    assert "l&t" in ENTERPRISE_ALIASES["larsen & toubro"]

    # ONGC <-> Oil and Natural Gas Corporation
    assert any("oil" in alias for alias in ENTERPRISE_ALIASES["ongc"])
    assert "ongc" in ENTERPRISE_ALIASES["oil and natural gas corporation"]

    # IOCL <-> Indian Oil Corporation
    assert any("indian oil" in alias for alias in ENTERPRISE_ALIASES["iocl"])
    assert "iocl" in ENTERPRISE_ALIASES["indian oil corporation"]

    # TCS <-> Tata Consultancy Services
    assert "tata consultancy services" in ENTERPRISE_ALIASES["tcs"]
    assert "tcs" in ENTERPRISE_ALIASES["tata consultancy services"]

    # RIL <-> Reliance Industries
    assert "reliance industries" in ENTERPRISE_ALIASES["ril"]
    assert "ril" in ENTERPRISE_ALIASES["reliance industries"]


def test_build_company_search_sql_aliases():
    """Verify build_company_search_sql integrates enterprise aliases and word boundaries."""
    # Querying BHEL should include condition for Bharat Heavy Electricals
    sql_bhel, params_bhel = build_company_search_sql("BHEL")
    assert any("bharat" in str(p) for p in params_bhel)

    # Querying Bharat Heavy Electricals should include condition for BHEL
    sql_bharat, params_bharat = build_company_search_sql("Bharat Heavy Electricals Limited")
    assert any("bhel" in str(p) for p in params_bharat)

    # Querying Larsen & Toubro should include L&T pattern
    sql_lt, _params_lt = build_company_search_sql("Larsen & Toubro Ltd")
    assert "l&t" in sql_lt.lower()

    # Querying customs-prefixed company should clean prefix and match
    _sql_customs, params_customs = build_company_search_sql("M/S BHEL PVT LTD")
    assert any("bharat" in str(p) for p in params_customs)


def test_build_company_search_sql_isolation_preserved():
    """Ensure multi-keyword word boundary isolation from test_report_service is preserved."""
    _sql, params = build_company_search_sql("Titan Laboratories")
    assert r"\btitan\b" in params
    assert r"\blaboratories\b" in params
    assert "%titan%" not in params


# ==============================================================================
# SECTION 4: FREE WEBMAIL FILTERING & DOMAIN EXTRACTION
# ==============================================================================

def test_extract_domain_from_corporate_email():
    """Verify genuine corporate domains are cleanly extracted."""
    assert extract_domain_from_email("john.doe@schneider-electric.com") == "schneider-electric.com"
    assert extract_domain_from_email("sales@tatamotors.com") == "tatamotors.com"
    assert extract_domain_from_email("procurement@corp.tatamotors.com") == "corp.tatamotors.com"
    assert extract_domain_from_email("info@jfll.com:443") == "jfll.com"


@pytest.mark.parametrize("free_email", [
    "user@gmail.com",
    "user@googlemail.com",
    "trader@yahoo.com",
    "trader@yahoo.co.in",
    "admin@hotmail.com",
    "logistics@outlook.com",
    "import@rediffmail.com",
    "export@rediff.com",
    "customs@zoho.com",
    "ceo@protonmail.com",
    "info@sub.gmail.com",
    "manager@mail.com",
])
def test_extract_domain_rejects_free_webmail(free_email):
    """Verify free public webmail domains return None to prevent corrupting corporate matches."""
    assert extract_domain_from_email(free_email) is None


@pytest.mark.parametrize("invalid_email", [
    None,
    "",
    "   ",
    "not-an-email",
    "@gmail.com",
    "user@",
    "user@nodot",
    "user@@domain.com",
])
def test_extract_domain_invalid_inputs(invalid_email):
    """Verify malformed email strings safely return None."""
    assert extract_domain_from_email(invalid_email) is None


# ==============================================================================
# SECTION 5: CUSTOMS DIRECTOR EXTRACTION
# ==============================================================================

@pytest.mark.parametrize("raw_manifest,expected_name", [
    ("DIRECTOR: RAJESH SHARMA, TEL: 9819000000", "Rajesh Sharma"),
    ("DIR. ANIL AGARWAL (DIN: 00123456)", "Anil Agarwal"),
    ("PROP: VIKRAM MEHTA", "Vikram Mehta"),
    ("PROPRIETOR: RAMESH PATEL", "Ramesh Patel"),
    ("PARTNER: SURESH JAIN", "Suresh Jain"),
    ("MANAGING DIRECTOR: SANJEEV VERMA", "Sanjeev Verma"),
    ("MD: AJAY GUPTA", "Ajay Gupta"),
    ("ATTN: MR. DEEPAK JOSHI", "Deepak Joshi"),
    ("CONTACT: PRIYA NAIR", "Priya Nair"),
    ("NAME: MANISH TIWARI", "Manish Tiwari"),
    ("RAJESH SHARMA - DIRECTOR", "Rajesh Sharma"),
    ("SUNIL KUMAR (MD)", "Sunil Kumar"),
    ("SHRI SANJEEV VERMA", "Sanjeev Verma"),
    ("DR. AMIT PATEL", "Amit Patel"),
    ("MRS. PRIYA NAIR", "Priya Nair"),
    ("R. K. GUPTA", "R. K. Gupta"),
])
def test_extract_customs_director_valid(raw_manifest, expected_name):
    """Verify director names are accurately parsed from diverse manifest text formats."""
    assert extract_customs_director_name(raw_manifest) == expected_name


@pytest.mark.parametrize("invalid_manifest", [
    "ACME EXPORTS PVT LTD",
    "SCHNEIDER ELECTRIC INDIA LIMITED",
    "No Direct Contact on File",
    "N/A",
    "NA",
    "NONE",
    "NULL",
    "AS PER INVOICE",
    "TO ORDER",
    "SAME AS CONSIGNEE",
    "123456",
    None,
    "",
    "   ",
    "-",
    "DIRECTOR",
])
def test_extract_customs_director_rejects_noise(invalid_manifest):
    """Verify manifest placeholders, noise, and company names are rejected."""
    assert extract_customs_director_name(invalid_manifest) is None


# ==============================================================================
# SECTION 6: API ENDPOINT INTEGRATION (search_apollo_contacts with domain)
# ==============================================================================

def test_api_search_contacts_by_domain(client, auth_headers):
    """Verify searching contacts by exact domain returns 200 and matches contacts."""
    resp = client.get(
        "/api/v1/apollo/contacts?domain=diamond-medical.com&logistics_only=false",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
    for contact in data["data"]:
        # Either the email matches domain or organization matches
        if contact["email"]:
            assert "diamond" in contact["email"].lower() or contact["employer_name"] != "COMMERCIAL SHIPPER"


def test_api_search_contacts_by_domain_with_url_prefix(client, auth_headers):
    """Verify domain parameter safely cleans http:// and www. prefixes."""
    resp = client.get(
        "/api/v1/apollo/contacts?domain=https://www.diamond-medical.com/&logistics_only=false",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1


def test_api_search_contacts_by_company_and_domain(client, auth_headers):
    """Verify combined company and domain search parameters filter cleanly."""
    resp = client.get(
        "/api/v1/apollo/contacts?company=Diamond&domain=diamond-medical.com&logistics_only=false",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1


def test_api_search_contacts_nonexistent_domain(client, auth_headers):
    """Verify non-existent domain safely returns 0 records without 500 error."""
    resp = client.get(
        "/api/v1/apollo/contacts?domain=nonexistentdomain99999xyz.io&logistics_only=false",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_records"] == 0
    assert len(data["data"]) == 0


def test_api_search_contacts_customs_prefixed_company(client, auth_headers):
    """Verify passing a customs-prefixed company name resolves contacts in Apollo."""
    resp = client.get(
        "/api/v1/apollo/contacts?company=M/S SCHNEIDER ELECTRIC INDIA PRIVATE LIMITED&logistics_only=false",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) >= 1
