"""Gemini 3.8 Flash web search grounding enricher for client reports.

Sources hard customs shipment metrics from the local DuckDB database first,
then fills background, facility, export market, and contact gaps using
live Google Search grounding via Google's Gemini API.
"""

from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import json
import logging
import os
import re
import time
from typing import Any

from src.api.report_models import (
    ClientReportData,
    CompanyBackground,
    ContactItem,
    JfllFit,
)

logger = logging.getLogger("gemini_enricher")

# In-memory TTL cache for web search grounding: normalized_name -> (timestamp, ClientReportData)
_ENRICHMENT_CACHE: dict[str, tuple[float, ClientReportData]] = {}
CACHE_DEFAULT_TTL_SECONDS = 3600  # 1 hour
GEMINI_TIMEOUT_SECONDS = 10.0


def _normalize_company_key(company_name: str) -> str:
    """Normalize company name to lowercase alphanumeric key for cache matching."""
    return re.sub(r"[^a-zA-Z0-9]", "", company_name.lower())


def clear_enrichment_cache() -> None:
    """Clear in-memory enrichment cache."""
    _ENRICHMENT_CACHE.clear()


def get_cached_enrichment(company_name: str) -> ClientReportData | None:
    """Retrieve cached enrichment if within TTL."""
    key = _normalize_company_key(company_name)
    if key in _ENRICHMENT_CACHE:
        timestamp, report = _ENRICHMENT_CACHE[key]
        if time.time() - timestamp < CACHE_DEFAULT_TTL_SECONDS:
            return report.model_copy(deep=True)
        # Remove expired entry
        _ENRICHMENT_CACHE.pop(key, None)
    return None


def set_cached_enrichment(
    company_name: str,
    report: ClientReportData,
    ttl_seconds: float = CACHE_DEFAULT_TTL_SECONDS,
) -> None:
    """Save enriched report to in-memory TTL cache."""
    key = _normalize_company_key(company_name)
    # Store timestamp adjusted for requested TTL
    stored_timestamp = time.time() - (CACHE_DEFAULT_TTL_SECONDS - ttl_seconds)
    _ENRICHMENT_CACHE[key] = (stored_timestamp, report.model_copy(deep=True))


def get_gemini_config() -> dict[str, Any]:
    """Read Gemini API configuration from environment variables."""
    api_key = os.getenv("GEMINI_API_KEY")
    clean_key = api_key.strip() if api_key and api_key.strip() else None
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
    return {
        "api_key": clean_key,
        "model": model_name,
        "is_available": clean_key is not None,
    }


def _get_genai_client(api_key: str):
    """Instantiate Google GenAI client."""
    from google import genai

    return genai.Client(api_key=api_key)


def _sanitize_target_name(name: str) -> str:
    """Sanitize company name to prevent prompt injection and remove malformed characters."""
    clean = re.sub(r"[^a-zA-Z0-9\s\.,\-\(\)&]", " ", name)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:80]


def _build_grounding_prompt(
    company_name: str,
    db_lead: dict[str, Any] | None,
) -> str:
    """Construct search grounding prompt with strict XML delimiters."""
    sanitized = _sanitize_target_name(company_name)
    category = db_lead.get("category", "General Commercial Cargo") if db_lead else "General Commercial Cargo"
    mode = db_lead.get("transport_mode", "Air / Ocean") if db_lead else "Air / Ocean"
    shipments = db_lead.get("total_shipments", 0) if db_lead else 0
    usd = f"${db_lead.get('total_value_usd', 0.0):,.0f} USD" if db_lead else "$0 USD"
    city = db_lead.get("city", "India") if db_lead else "India"

    return f"""You are a Senior Logistics and Freight Forwarding Industry Research Analyst working for Jet Freight Logistics Ltd (JFLL), an Indian publicly-listed multimodal logistics company, IATA cargo agent, and licensed customs broker (CHA).

Conduct an up-to-date Google Search web grounding research on the following target commercial enterprise in India:
<target_company>{sanitized}</target_company>

Authoritative context from Indian customs manifest database:
- Registered Location / Gateway: {city}
- Declared Cargo Category: {category}
- Transport Mode: {mode}
- Customs Track Record: {shipments} verified shipments ({usd})

Research Instructions:
1. Search Google for official website, manufacturing plant locations, product catalogs, export destinations, and leadership.
2. Fill the briefing sections with concrete, verified details.
3. Formulate a high-impact freight pitch connecting their specific cargo to Jet Freight's strengths:
   - Licensed customs broker (CHA) at BOM (Mumbai Air) and JNPT (Nhava Sheva Sea)
   - Temperature-controlled cold chain for perishables & pharmaceuticals (IATA CEIV / GDP)
   - Hazardous goods & chemicals (IATA DG accredited)
   - Multimodal sea-air & global freight consolidation covering 150+ countries

Output Requirement:
Return ONLY a valid JSON object matching this exact schema without any markdown formatting or commentary:
{{
  "company_name": "{company_name}",
  "subtitle": "Concise industry positioning (e.g. API & advanced-intermediate manufacturer–exporter)",
  "what_they_do": "Detailed summary of manufactured or traded product lines and commercial offerings",
  "hq_facilities": "Corporate headquarters address, plus specific factory, processing unit, or R&D plant locations in India",
  "export_markets": "Key global export destination countries and trade corridors",
  "scale_credibility": "Accreditations, certifications (e.g. Star Export House, USFDA, ISO, FSSAI), and operational scale",
  "cargo_strength": "Specific cargo fit and handling synergies with Jet Freight Logistics",
  "pitch_angle": "Persuasive 1-2 sentence sales pitch highlighting Jet Freight's competitive edge for their specific cargo",
  "contacts": [
    {{
      "name": "Full name of real senior logistics decision maker (Supply Chain Head, Logistics Manager, MD)",
      "designation": "Executive designation",
      "contact_info": "Corporate email or direct contact if publicly available",
      "notes": "Decision-making responsibility context"
    }}
  ]
}}"""


def _extract_json_block(text: str) -> dict[str, Any] | None:
    """Robust regex extraction of JSON object from Gemini response text."""
    if not text:
        return None
    # 1. Match code fence ```json ... ```
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except Exception:
            pass

    # 2. Match outermost { ... }
    brace_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(1))
        except Exception:
            pass

    return None


def enrich_report_with_gemini_search(
    draft: ClientReportData,
    company_query: str,
    db_lead: dict[str, Any] | None = None,
) -> ClientReportData:
    """Enrich client report draft with live web search grounding using Gemini 3.8 Flash.

    Preserves authoritative DuckDB numbers (shipments, trade value, mode, lading port)
    and fills gaps in background, facilities, contacts, and pitch angle.
    """
    # 1. Check TTL cache
    cached = get_cached_enrichment(company_query)
    if cached is not None:
        return cached

    # 2. Check configuration
    config = get_gemini_config()
    if not config["is_available"]:
        logger.debug("GEMINI_API_KEY not configured. Returning ungrounded draft.")
        return draft

    from google.genai import types

    # 3. Build grounded prompt
    prompt = _build_grounding_prompt(company_query, db_lead)
    model_name = config["model"]
    api_key = config["api_key"]

    def _call_gemini_api():
        client = _get_genai_client(api_key=api_key)
        tool = types.Tool(google_search=types.GoogleSearch())
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[tool],
                temperature=0.2,
            ),
        )
        return response

    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini_api)
            response = future.result(timeout=GEMINI_TIMEOUT_SECONDS)

        response_text = getattr(response, "text", "") or ""
        parsed_json = _extract_json_block(response_text)

        if not parsed_json:
            logger.warning("Gemini web search did not return parsable JSON. Retaining local draft.")
            return draft

        # 4. Merge enriched data into report while strictly preserving database metrics
        enriched = draft.model_copy(deep=True)
        enriched.header.web_grounded = True

        if parsed_json.get("subtitle"):
            enriched.header.subtitle = str(parsed_json["subtitle"])[:300]

        # Background section
        if parsed_json.get("what_they_do"):
            enriched.section_1_background.what_they_do = str(parsed_json["what_they_do"])[:2000]
        if parsed_json.get("hq_facilities"):
            enriched.section_1_background.hq_facilities = str(parsed_json["hq_facilities"])[:1000]
        if parsed_json.get("export_markets"):
            enriched.section_1_background.export_markets = str(parsed_json["export_markets"])[:1000]
        if parsed_json.get("scale_credibility"):
            enriched.section_1_background.scale_credibility = str(parsed_json["scale_credibility"])[:1000]

        # Pitch & JFLL fit
        if parsed_json.get("cargo_strength"):
            enriched.section_3_jfll_fit.cargo_strength = str(parsed_json["cargo_strength"])[:2000]
        if parsed_json.get("pitch_angle"):
            enriched.section_3_jfll_fit.pitch_angle = str(parsed_json["pitch_angle"])[:2000]

        # Contacts enrichment (replace generic fallback placeholders with discovered decision makers)
        raw_contacts = parsed_json.get("contacts", [])
        if isinstance(raw_contacts, list) and len(raw_contacts) > 0:
            new_contacts: list[ContactItem] = []
            for c in raw_contacts[:5]:
                if isinstance(c, dict) and c.get("name"):
                    new_contacts.append(
                        ContactItem(
                            name=str(c.get("name", "Decision Maker"))[:150],
                            designation=str(c.get("designation", "Supply Chain / Logistics"))[:200],
                            contact_info=str(c.get("contact_info", "Corporate Directory"))[:300],
                            notes=str(c.get("notes", "Web Grounded via Gemini 3.8 Flash"))[:500],
                        )
                    )
            if new_contacts:
                enriched.section_4_contacts = new_contacts

        # 5. Save to TTL cache
        set_cached_enrichment(company_query, enriched)
        return enriched

    except FuturesTimeoutError:
        logger.warning("Gemini web search grounding timed out after %s seconds. Falling back to local draft.", GEMINI_TIMEOUT_SECONDS)
        return draft
    except Exception as exc:
        logger.warning("Gemini web search grounding encountered exception: %s. Falling back to local draft.", exc)
        return draft
