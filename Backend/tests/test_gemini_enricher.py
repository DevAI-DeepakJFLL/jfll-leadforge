import time
from unittest.mock import MagicMock, patch

from src.api.report_models import (
    ClientReportData,
    CompanyBackground,
    ContactItem,
    JfllFit,
    ReportHeader,
    TradeLaneCommodity,
)
from src.services.gemini_report_enricher import (
    clear_enrichment_cache,
    enrich_report_with_gemini_search,
    get_cached_enrichment,
    get_gemini_config,
    set_cached_enrichment,
)


def _create_sample_draft(company: str = "Sunrise Global Exports") -> ClientReportData:
    return ClientReportData(
        lead_id="dm-val-sample",
        header=ReportHeader(
            company_name=company,
            subtitle="Commercial Merchant Exporter",
            prepared_for="Mumbai Sales Branch",
            prepared_by="Tyra Theknath",
            date="07-11-2026",
            web_grounded=False,
        ),
        section_1_background=CompanyBackground(
            what_they_do="General commodity exporter",
            hq_facilities="Mumbai",
            export_markets="Global markets",
            scale_credibility="SME Exporter",
        ),
        section_2_trade_lane=TradeLaneCommodity(
            origin_destination="Mumbai -> Global",
            commodity="Spices & Commercial Goods",
            primary_mode="AIR / OCEAN",
            special_handling="Standard Export Clearance",
            total_shipments=45,
            total_value_usd=1250000.0,
            lading_port="INBOM4",
        ),
        section_3_jfll_fit=JfllFit(
            cargo_strength="Standard multimodal fit",
            pitch_angle="Standard pitch",
        ),
        section_4_contacts=[
            ContactItem(name="General", designation="Desk", contact_info="info@sunrise.com", notes="Primary")
        ],
    )


def test_gemini_config_fallback_when_unset(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)

    config = get_gemini_config()
    assert config["api_key"] is None
    assert config["model"] == "gemini-3.8-flash"
    assert config["is_available"] is False


def test_gemini_config_reads_env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-12345")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.8-flash")

    config = get_gemini_config()
    assert config["api_key"] == "test-key-12345"
    assert config["model"] == "gemini-3.8-flash"
    assert config["is_available"] is True


def test_ttl_cache_storage_and_expiry():
    clear_enrichment_cache()
    draft = _create_sample_draft("Sunrise Global")
    draft.header.web_grounded = True

    # Cache should be empty initially
    assert get_cached_enrichment("Sunrise Global") is None

    # Set cache with 1-hour TTL
    set_cached_enrichment("Sunrise Global", draft, ttl_seconds=3600)
    cached = get_cached_enrichment("  SUNRISE GLOBAL  ")
    assert cached is not None
    assert cached.header.company_name == "Sunrise Global"
    assert cached.header.web_grounded is True

    # Test expired item
    set_cached_enrichment("Expired Co", draft, ttl_seconds=-10)
    assert get_cached_enrichment("Expired Co") is None


def test_enrich_report_graceful_fallback_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    clear_enrichment_cache()
    draft = _create_sample_draft("Sunrise Global")

    enriched = enrich_report_with_gemini_search(draft, "Sunrise Global")
    assert enriched.header.company_name == "Sunrise Global"
    assert enriched.header.web_grounded is False
    assert enriched.section_2_trade_lane.total_shipments == 45


def test_enrich_report_preserves_database_numbers_on_mock_success(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "mock-valid-key")
    clear_enrichment_cache()
    draft = _create_sample_draft("Sunrise Global Exports Pvt Ltd")

    mock_llm_json_response = """
    ```json
    {
        "company_name": "Sunrise Global Exports",
        "subtitle": "Organic Agro-Commodity & Spices Export House",
        "what_they_do": "Specialty processor and exporter of certified organic spices, oilseeds, and botanical herbs",
        "hq_facilities": "Corporate HQ: Nariman Point, Mumbai. Processing & Packhouse: Navi Mumbai APMC & Unjha, Gujarat",
        "export_markets": "European Union (Germany, Netherlands), United States, UAE, and Southeast Asia",
        "scale_credibility": "APEDA & Spices Board Registered Star Export House with ISO 22000, USDA Organic and BRCGS accreditation",
        "cargo_strength": "Temperature-controlled air freight for high-value organic consignments; licensed CHA customs broker for fast export documentation; reefer container drayage via Nhava Sheva (JNPT).",
        "pitch_angle": "Cold-chain air express + Ocean reefer consolidation · Direct JNPT gateway access · Licensed CHA customs clearance broker · 150+ country agency network.",
        "contacts": [
            {
                "name": "Rajesh Mehta",
                "designation": "Director of Supply Chain & Logistics",
                "contact_info": "r.mehta@sunriseglobal.in",
                "notes": "Primary freight contract decision-maker"
            },
            {
                "name": "Priya Sharma",
                "designation": "Export Documentation Manager",
                "contact_info": "shipping@sunriseglobal.in",
                "notes": "Customs clearance & CHA coordination"
            }
        ]
    }
    ```
    """

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = mock_llm_json_response
    mock_client.models.generate_content.return_value = mock_response

    with patch("src.services.gemini_report_enricher._get_genai_client", return_value=mock_client):
        enriched = enrich_report_with_gemini_search(draft, "Sunrise Global Exports")

    # Web grounded flag must be True
    assert enriched.header.web_grounded is True
    assert "Agro-Commodity" in enriched.header.subtitle

    # Background details populated from Gemini web search
    assert "certified organic spices" in enriched.section_1_background.what_they_do
    assert "Navi Mumbai APMC" in enriched.section_1_background.hq_facilities
    assert "European Union" in enriched.section_1_background.export_markets
    assert "Star Export House" in enriched.section_1_background.scale_credibility

    # Pitch enriched
    assert "Cold-chain air express" in enriched.section_3_jfll_fit.pitch_angle

    # Contacts enriched
    assert len(enriched.section_4_contacts) == 2
    assert enriched.section_4_contacts[0].name == "Rajesh Mehta"

    # STRICT CHECK: Authoritative database numbers must NEVER be overwritten!
    assert enriched.section_2_trade_lane.total_shipments == 45
    assert enriched.section_2_trade_lane.total_value_usd == 1250000.0
    assert enriched.section_2_trade_lane.lading_port == "INBOM4"


def test_enrich_report_handles_timeout_and_exceptions_gracefully(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "mock-valid-key")
    clear_enrichment_cache()
    draft = _create_sample_draft("Sunrise Global")

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = TimeoutError("Gemini Search Grounding timed out after 10s")

    with patch("src.services.gemini_report_enricher._get_genai_client", return_value=mock_client):
        enriched = enrich_report_with_gemini_search(draft, "Sunrise Global")

    # Must return draft without crashing
    assert enriched.header.company_name == "Sunrise Global"
    assert enriched.header.web_grounded is False
    assert enriched.section_2_trade_lane.total_shipments == 45


def test_enrich_report_preserves_caller_section_5_feedback_on_cache_hit():
    """Fix #1: Verify that a cache hit preserves user's typed section_5_feedback and does not wipe it."""
    clear_enrichment_cache()
    company = "Sunrise Global"
    
    # 1. Populate cache with an earlier search result where feedback is empty
    earlier_report = _create_sample_draft(company)
    earlier_report.header.web_grounded = True
    earlier_report.section_1_background.what_they_do = "Cached web research result"
    earlier_report.section_5_feedback.meeting_takeaways = ""
    set_cached_enrichment(company, earlier_report)

    # 2. Caller has a draft with their own typed feedback
    current_draft = _create_sample_draft(company)
    current_draft.section_5_feedback.meeting_takeaways = "Critical customer pain point: needs temperature sensors"
    current_draft.section_5_feedback.preferred_carriers = "Qatar Airways"
    current_draft.section_5_feedback.target_pricing = "$2.90/kg"
    current_draft.section_5_feedback.next_action_followup = "Quote by Monday 10 AM"

    # 3. Call enrich (which hits cache)
    result = enrich_report_with_gemini_search(current_draft, company)

    # 4. Web research should come from cache, but sales feedback MUST BE PRESERVED from current_draft!
    assert result.header.web_grounded is True
    assert result.section_1_background.what_they_do == "Cached web research result"
    assert result.section_5_feedback.meeting_takeaways == "Critical customer pain point: needs temperature sensors"
    assert result.section_5_feedback.preferred_carriers == "Qatar Airways"
    assert result.section_5_feedback.target_pricing == "$2.90/kg"
    assert result.section_5_feedback.next_action_followup == "Quote by Monday 10 AM"

