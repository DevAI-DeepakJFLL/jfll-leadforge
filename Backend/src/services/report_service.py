"""Core service for Client Report / Prospect Brief data synthesis.
Queries DataMyne leads and synthesizes executive 4-section briefings.
"""
import functools
import os
import re
from datetime import datetime
from typing import Any

from src.api.cache import resolve_company_ids_cached
from src.api.database import get_data_source, get_db_connection
from src.api.helpers import clean_corporate_term, extract_company_search_keywords
from src.api.logger import logger
from src.api.report_models import (
    ClientReportData,
    CompanyBackground,
    ContactItem,
    JfllFit,
    ReportHeader,
    SalesFeedback,
    TradeLaneCommodity,
)
from src.services.gemini_report_enricher import (
    enrich_report_with_gemini_search,
    get_gemini_config,
)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATAMYNE_PARQUET_PATH = os.path.join(
    BACKEND_DIR,
    "data",
    "processed",
    "datamyne_leads_zstd.parquet",
)
DATAMYNE_BRAZIL_PARQUET_PATH = os.path.join(
    BACKEND_DIR,
    "data",
    "processed",
    "datamyne_brazil_leads_zstd.parquet",
)
APOLLO_CONTACTS_PATH = os.path.join(
    BACKEND_DIR,
    "data",
    "Apollo",
    "apollo_freight_contacts_with_company_profile.parquet",
)
APOLLO_LEADS_PATH = os.path.join(
    BACKEND_DIR,
    "data",
    "processed",
    "apollo_freight_leads_zstd.parquet",
)
APOLLO_UNPROFILED_PATH = os.path.join(
    BACKEND_DIR,
    "data",
    "Apollo",
    "apollo_freight_contacts_without_company_profile.parquet",
)

def _get_duckdb_cursor():
    return get_db_connection().cursor()

def _get_datamyne_source() -> str:
    try:
        return get_data_source(dataset="datamyne")
    except Exception as exc:
        logger.debug("Falling back to local datamyne path: %s", exc)
        return DATAMYNE_PARQUET_PATH

def _get_datamyne_brazil_source() -> str:
    try:
        return get_data_source(dataset="datamyne_brazil")
    except Exception as exc:
        logger.debug("Falling back to local datamyne brazil path: %s", exc)
        return DATAMYNE_BRAZIL_PARQUET_PATH

def _get_apollo_leads_source() -> str:
    try:
        return get_data_source(dataset="apollo")
    except Exception as exc:
        logger.debug("Falling back to local apollo leads path: %s", exc)
        return APOLLO_LEADS_PATH

def _get_apollo_contacts_source() -> str:
    try:
        return get_data_source(dataset="apollo_contacts_profile")
    except Exception as exc:
        logger.debug("Falling back to local apollo contacts path: %s", exc)
        return APOLLO_CONTACTS_PATH

def _get_apollo_unprofiled_source() -> str:
    try:
        return get_data_source(dataset="apollo_contacts_unprofiled")
    except Exception as exc:
        logger.debug("Falling back to local apollo unprofiled path: %s", exc)
        return APOLLO_UNPROFILED_PATH

@functools.lru_cache(maxsize=128)
def _cached_search_report_companies(clean_q: str, limit: int) -> tuple[dict[str, Any], ...]:
    conn = _get_duckdb_cursor()
    try:
        dm_src = _get_datamyne_source()
        brazil_src = _get_datamyne_brazil_source()
        apollo_src = _get_apollo_leads_source()
        pattern = f"%{clean_q}%"
        sql = f"""
            SELECT id, company_name, city, country, total_shipments, total_value_usd, category, 'datamyne' as source, CAST(NULL AS INTEGER) as employee_count
            FROM '{dm_src}'
            WHERE id = ? OR company_name ILIKE ?
            UNION ALL
            SELECT id, company_name, city, country, total_shipments, total_value_usd, category, 'datamyne_brazil' as source, CAST(NULL AS INTEGER) as employee_count
            FROM '{brazil_src}'
            WHERE id = ? OR company_name ILIKE ?
            UNION ALL
            SELECT organization_id as id, organization_name as company_name, hq_city as city, hq_country as country,
                   0 as total_shipments, COALESCE(revenue_usd, 0.0) as total_value_usd,
                   industry as category, 'apollo' as source, COALESCE(employee_count, 0) as employee_count
            FROM '{apollo_src}'
            WHERE organization_id = ? OR organization_name ILIKE ?
            ORDER BY total_shipments DESC, total_value_usd DESC
            LIMIT ?
        """
        rows = conn.execute(sql, [clean_q, pattern, clean_q, pattern, clean_q, pattern, limit]).fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r[0],
                "company_name": r[1],
                "city": r[2],
                "country": r[3] or ("Brazil" if r[7] == "datamyne_brazil" else "India"),
                "total_shipments": int(r[4]) if r[4] is not None else 0,
                "total_value_usd": float(r[5]) if r[5] is not None else 0.0,
                "category": r[6],
                "source": r[7],
                "employee_count": int(r[8]) if r[8] is not None else None,
            })
        return tuple(results)
    except Exception as exc:
        logger.warning("Error searching report companies for '%s': %s", clean_q, exc)
        return ()
    finally:
        conn.close()

def search_report_companies(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Search for companies across DataMyne (India), DataMyne Brazil, and Apollo for autocomplete."""
    if not query or not query.strip():
        return []
    clean_q = query.strip()
    return [dict(item) for item in _cached_search_report_companies(clean_q.lower(), limit)]

def _query_datamyne_parquet(conn: Any, src: str, clean_q: str) -> dict[str, Any] | None:
    """Helper to query a DataMyne parquet file (India or Brazil) by ID or tokenized name."""
    # 1. Exact ID check
    sql_id = f"""
        SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
               city, address, pin_code, email, phone, total_shipments, total_value_usd, 
               trade_lanes, top_hs_codes, directors
        FROM '{src}'
        WHERE id = ?
        LIMIT 1
    """
    row = conn.execute(sql_id, [clean_q]).fetchone()
    if row:
        return _row_to_lead_dict(row)

    # 2. Exact or ILIKE pattern check
    tokens = [t for t in re.split(r"[\s,\-\(\)\.]+", clean_q) if len(t) >= 3 and t.lower() not in {"pvt", "ltd", "private", "limited", "the", "and"}]
    pattern = "%" + "%".join(tokens) + "%" if tokens else f"%{clean_q}%"

    sql_name = f"""
        SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
               city, address, pin_code, email, phone, total_shipments, total_value_usd, 
               trade_lanes, top_hs_codes, directors
        FROM '{src}'
        WHERE company_name ILIKE ?
        ORDER BY total_shipments DESC, total_value_usd DESC
        LIMIT 1
    """
    row = conn.execute(sql_name, [pattern]).fetchone()
    if row:
        return _row_to_lead_dict(row)

    # 3. Clean fallback for single-word queries without spaces (e.g. 'Sunpharma')
    if len(tokens) <= 1 and len(clean_q) >= 4:
        sql_clean = f"""
            SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
                   city, address, pin_code, email, phone, total_shipments, total_value_usd, 
                   trade_lanes, top_hs_codes, directors
            FROM '{src}'
            WHERE replace(lower(company_name), ' ', '') LIKE ?
            ORDER BY total_shipments DESC, total_value_usd DESC
            LIMIT 1
        """
        row = conn.execute(sql_clean, [f"%{clean_q.lower()}%"]).fetchone()
        if row:
            return _row_to_lead_dict(row)

    return None

def _apollo_row_to_lead_dict(r: tuple) -> dict[str, Any]:
    org_id, name, domain, _website, phone, emp_count, rev_usd, _founded, ind, specs, city, state, country, pin = r
    rev_val = float(rev_usd) if rev_usd is not None else 0.0
    emp_val = int(emp_count) if emp_count is not None else 0
    trade_lanes = f"{city or ''}, {country or 'Global'} → International Gateways".strip(", ")
    
    return {
        "id": org_id,
        "company_name": name,
        "tax_id": f"APOLLO-{org_id[:8].upper()}",
        "transport_mode": "Multimodal (Air & Ocean)",
        "category": ind or "Commercial Shipper",
        "subcategory": specs or ind or "Industrial & Commercial Trade",
        "city": city or "Global Operations",
        "address": f"{city or ''}, {state or ''}, {country or ''}".strip(", "),
        "pin_code": pin or "",
        "email": f"info@{domain}" if domain else "",
        "phone": phone or "",
        "total_shipments": 0,
        "total_value_usd": rev_val,
        "trade_lanes": trade_lanes,
        "top_hs_codes": "",
        "directors": "",
        "domain": domain or "",
        "employee_count": emp_val,
        "revenue_usd": rev_val,
        "country": country or "International",
        "source": "apollo",
    }

def _find_lead(
    query: str,
    lead_id: str | None = None,
    source: str | None = None,
) -> dict[str, Any] | None:
    """Look up a lead across DataMyne (India), Brazil, and Apollo by ID or company name."""
    clean_id = (lead_id or "").strip()
    clean_q = (query or "").strip()
    conn = _get_duckdb_cursor()

    try:
        # A. Targeted ID Lookup if lead_id or clean_q looks like an ID
        lookup_id = clean_id or (clean_q if (clean_q.startswith("dm-") or (len(clean_q) == 24 and re.match(r"^[0-9a-f]{24}$", clean_q))) else None)

        if lookup_id:
            # 1. Apollo ID check
            if source == "apollo" or (len(lookup_id) == 24 and re.match(r"^[0-9a-f]{24}$", lookup_id)):
                apollo_src = _get_apollo_leads_source()
                sql = f"""
                    SELECT organization_id, organization_name, domain, website_url, phone,
                           employee_count, revenue_usd, founded_year, industry, specialties,
                           hq_city, hq_state, hq_country, hq_postal_code
                    FROM '{apollo_src}'
                    WHERE organization_id = ?
                    LIMIT 1
                """
                row = conn.execute(sql, [lookup_id]).fetchone()
                if row:
                    return _apollo_row_to_lead_dict(row)

            # 2. Brazil DataMyne ID check
            if source == "datamyne_brazil" or lookup_id.startswith("dm-bra-"):
                brazil_src = _get_datamyne_brazil_source()
                sql = f"""
                    SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
                           city, address, pin_code, email, phone, total_shipments, total_value_usd, 
                           trade_lanes, top_hs_codes, directors
                    FROM '{brazil_src}'
                    WHERE id = ?
                    LIMIT 1
                """
                row = conn.execute(sql, [lookup_id]).fetchone()
                if row:
                    d = _row_to_lead_dict(row)
                    d["source"] = "datamyne_brazil"
                    d["country"] = "Brazil"
                    return d

            # 3. India DataMyne ID check
            if source in (None, "datamyne") or lookup_id.startswith("dm-"):
                dm_src = _get_datamyne_source()
                sql = f"""
                    SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
                           city, address, pin_code, email, phone, total_shipments, total_value_usd, 
                           trade_lanes, top_hs_codes, directors
                    FROM '{dm_src}'
                    WHERE id = ?
                    LIMIT 1
                """
                row = conn.execute(sql, [lookup_id]).fetchone()
                if row:
                    d = _row_to_lead_dict(row)
                    d["source"] = "datamyne"
                    d["country"] = "India"
                    return d

        # B. Company Name / Query Matching
        search_target = clean_q or clean_id
        if not search_target:
            return None

        # If source is explicitly specified, query that source
        if source == "apollo":
            apollo_src = _get_apollo_leads_source()
            sql = f"""
                SELECT organization_id, organization_name, domain, website_url, phone,
                       employee_count, revenue_usd, founded_year, industry, specialties,
                       hq_city, hq_state, hq_country, hq_postal_code
                FROM '{apollo_src}'
                WHERE organization_name ILIKE ?
                ORDER BY COALESCE(employee_count, 0) DESC, COALESCE(revenue_usd, 0) DESC
                LIMIT 1
            """
            row = conn.execute(sql, [f"%{search_target}%"]).fetchone()
            if row:
                return _apollo_row_to_lead_dict(row)

        if source == "datamyne_brazil":
            brazil_src = _get_datamyne_brazil_source()
            lead = _query_datamyne_parquet(conn, brazil_src, search_target)
            if lead:
                lead["source"] = "datamyne_brazil"
                lead["country"] = "Brazil"
                return lead

        if source == "datamyne":
            dm_src = _get_datamyne_source()
            lead = _query_datamyne_parquet(conn, dm_src, search_target)
            if lead:
                lead["source"] = "datamyne"
                lead["country"] = "India"
                return lead

        # Fallback cascade when source is not specified: DataMyne India -> Brazil -> Apollo
        dm_src = _get_datamyne_source()
        lead = _query_datamyne_parquet(conn, dm_src, search_target)
        if lead:
            lead["source"] = "datamyne"
            lead["country"] = "India"
            return lead

        brazil_src = _get_datamyne_brazil_source()
        lead = _query_datamyne_parquet(conn, brazil_src, search_target)
        if lead:
            lead["source"] = "datamyne_brazil"
            lead["country"] = "Brazil"
            return lead

        apollo_src = _get_apollo_leads_source()
        sql = f"""
            SELECT organization_id, organization_name, domain, website_url, phone,
                   employee_count, revenue_usd, founded_year, industry, specialties,
                   hq_city, hq_state, hq_country, hq_postal_code
            FROM '{apollo_src}'
            WHERE organization_name ILIKE ?
            ORDER BY COALESCE(employee_count, 0) DESC, COALESCE(revenue_usd, 0) DESC
            LIMIT 1
        """
        row = conn.execute(sql, [f"%{search_target}%"]).fetchone()
        if row:
            return _apollo_row_to_lead_dict(row)

        return None
    except Exception as exc:
        logger.warning("Error searching lead for query='%s', lead_id='%s', source='%s': %s", query, lead_id, source, exc)
        return None
    finally:
        conn.close()

def _find_datamyne_lead(query: str) -> dict[str, Any] | None:
    """Look up a lead by ID or flexible company name matching (DataMyne India priority for backward compat)."""
    return _find_lead(query=query, source="datamyne")

def _row_to_lead_dict(r) -> dict[str, Any]:
    return {
        "id": r[0],
        "company_name": r[1],
        "tax_id": r[2],
        "transport_mode": r[3] or "Air",
        "category": r[4] or "General Cargo",
        "subcategory": r[5] or "Commercial Cargo",
        "city": r[6] or "Mumbai",
        "address": r[7] or "",
        "pin_code": r[8] or "",
        "email": r[9] or "",
        "phone": r[10] or "",
        "total_shipments": int(r[11]) if r[11] is not None else 0,
        "total_value_usd": float(r[12]) if r[12] is not None else 0.0,
        "trade_lanes": r[13] or "Global Corridors",
        "top_hs_codes": r[14] or "",
        "directors": r[15] or "",
    }

def _find_historical_approach_feedback(
    lead_id: str | None = None,
    company_name: str | None = None,
) -> SalesFeedback:
    """Pre-populates Section 5 with the latest recorded approach notes if available."""
    try:
        from src.api.approach_routes import load_approach_data
        data = load_approach_data()
        entities = data.get("entities", {})
        
        target_keys = []
        if lead_id:
            target_keys.append(f"datamyne:{lead_id}")
            target_keys.append(lead_id)
        if company_name:
            target_keys.append(f"datamyne:{company_name.lower()}")
            target_keys.append(f"apollo:{company_name.lower()}")

        found_logs: list[dict[str, Any]] = []
        for k in target_keys:
            if k in entities and entities[k].get("logs"):
                found_logs = entities[k]["logs"]
                break

        if not found_logs and company_name:
            c_lower = company_name.lower()
            for ek, ev in entities.items():
                if c_lower in ek.lower() and ev.get("logs"):
                    found_logs = ev["logs"]
                    break

        if found_logs:
            latest = found_logs[-1]
            note = str(latest.get("note", "") or "").strip()
            user = str(latest.get("user_name", "Sales Coordinator") or "Sales Coordinator")
            action = str(latest.get("action", "Log Update") or "Log Update")
            follow_up = str(latest.get("next_follow_up", "") or "")
            
            takeaways = f"{note}\n[Prior log: {action} by {user}]" if note else ""
            return SalesFeedback(
                meeting_takeaways=takeaways,
                next_action_followup=follow_up,
            )
    except Exception as exc:
        logger.debug("Historical approach feedback lookup failed: %s", exc)

    return SalesFeedback()


def _build_unlisted_sme_report(
    company_name: str,
    prepared_for: str = "Mumbai Sales Branch",
    prepared_by: str = "Tyra Theknath",
    date_str: str | None = None,
    today_str: str | None = None,
) -> ClientReportData:
    """Fallback draft briefing for SMEs without primary DataMyne customs records."""
    effective_date = date_str or today_str or datetime.now().strftime("%d-%m-%Y")
    return ClientReportData(
        lead_id=None,
        header=ReportHeader(
            company_name=company_name,
            subtitle="Commercial Merchant Exporter (Unpublished SME)",
            prepared_for=prepared_for,
            prepared_by=prepared_by,
            date=effective_date,
        ),
        section_1_background=CompanyBackground(
            what_they_do="Commercial exporter / merchant trader of general commodities and industrial goods",
            address="Mumbai Metropolitan Region, Maharashtra, India",
            hq_facilities="Mumbai Metropolitan Region → Gateways: BOM Air / JNPT Sea",
            export_markets="Global emerging and regulated markets",
            scale_credibility="SME Exporter (Customs records unlisted in local primary sample)",
        ),
        section_2_trade_lane=TradeLaneCommodity(
            origin_destination="Mumbai (BOM/JNPT) → Global Destination Hubs",
            commodity="Commercial Goods & Industrial Supplies",
            primary_mode="AIR / OCEAN (LCL/FCL)",
            special_handling="Standard Cargo Handling & Export Customs Clearance",
            total_shipments=0,
            total_value_usd=0.0,
            lading_port="INBOM4 (Mumbai Air) / INNSA1 (Nhava Sheva Sea)",
        ),
        section_3_jfll_fit=JfllFit(
            cargo_strength="Multimodal air + ocean network covers their global trade lanes; licensed CHA for fast Mumbai customs clearance; 150+ country partner network.",
            pitch_angle="Multimodal sea + express air · Licensed CHA customs broker · ISO 9001:2015 · Listed since 1986 (NSE/BSE: JETFREIGHT) · Mumbai-local dedicated account team",
        ),
        section_4_contacts=_find_apollo_contacts(company_name, limit=10) or [
            ContactItem(
                name="General / Switchboard",
                designation="Corporate Inquiries",
                phone="+91 22 2830 7400",
                email="info@company.com",
                contact_info="info@company.com",
                notes="Primary Corporate Contact",
            ),
            ContactItem(
                name="Logistics Head",
                designation="Supply Chain / Logistics Manager",
                phone="+91 98200 12345",
                email="logistics@company.com",
                contact_info="logistics@company.com",
                notes="Key Freight Decision-Maker",
            ),
        ],
        section_5_feedback=_find_historical_approach_feedback(None, company_name),
    )


def _synthesize_subtitle(lead: dict[str, Any]) -> str:
    if lead.get("source") == "apollo":
        cat = lead.get("category", "")
        return f"{cat.title() if cat else 'Commercial'} · Verified International Account"
    if lead.get("country") == "Brazil" or lead.get("source") == "datamyne_brazil":
        subcat = lead.get("subcategory", "")
        return f"{subcat} · Brazil Customs Verified Account"

    subcat = lead["subcategory"]
    cat = lead["category"]
    if "Chemical" in cat or "API" in subcat or "Organic" in subcat:
        return (
            "API, intermediate & fine-chemical export house"
            if "Exports" in lead["company_name"]
            else "API & advanced-intermediate manufacturer–exporter"
        )
    if "Pharma" in cat or "Formulation" in subcat:
        return "Pharmaceutical & healthcare formulations manufacturer–exporter"
    if "Perishable" in cat:
        return "Fresh produce & perishables exporter (cold-chain specialized)"
    return f"{subcat} Manufacturer–Exporter"


def _synthesize_company_background(lead: dict[str, Any]) -> CompanyBackground:
    if lead.get("source") == "apollo":
        what_they_do = f"International commercial enterprise operating in {lead['category']} ({lead['subcategory']})"
        loc_str = lead.get("address") or lead.get("city") or lead.get("country") or "International"
        hq_facilities = f"Global HQ: {loc_str} · Corporate Domain: {lead.get('domain') or 'N/A'}"
        export_markets = f"Cross-border trade and international freight lanes ({lead.get('country', 'Global')})"
        rev_str = f"${lead['total_value_usd']:,.0f} USD" if lead['total_value_usd'] else "Private / Undisclosed"
        emp_val = lead.get('employee_count') or 0
        emp_str = f"{emp_val:,} employees" if emp_val else "Enterprise"
        scale_cred = f"Apollo Verified Account (Org ID: {lead['id']}); Estimated Scale: {rev_str}; Workforce: {emp_str}"
        return CompanyBackground(
            what_they_do=what_they_do,
            address=lead.get("address") or loc_str,
            hq_facilities=hq_facilities,
            export_markets=export_markets,
            scale_credibility=scale_cred,
        )

    if lead.get("country") == "Brazil" or lead.get("source") == "datamyne_brazil":
        subcat = lead["subcategory"]
        hs_snippet = f" (Top HS: {lead['top_hs_codes']})" if lead["top_hs_codes"] else ""
        what_they_do = f"Manufacturer-exporter of {subcat}{hs_snippet} (Brazil Customs Record)"
        clean_addr = lead["address"].replace("*", " ").strip(", ")
        full_address = clean_addr or f"{lead['city']}, Brazil"
        hq_facilities = f"HQ: {lead['city']}, Brazil · Gateways: Santos (SSZ) Sea / Guarulhos (GRU) Air"
        export_markets = f"Active corridors: {lead['trade_lanes']} (Brazil ↔ International)"
        scale_cred = (
            f"Verified Latin America Shipper (Tax ID: {lead['tax_id']}); "
            f"Customs Export Turnover: ${lead['total_value_usd']:,.2f} USD ({lead['total_shipments']} shipments)"
        )
        return CompanyBackground(
            what_they_do=what_they_do,
            address=full_address,
            hq_facilities=hq_facilities,
            export_markets=export_markets,
            scale_credibility=scale_cred,
        )

    subcat = lead["subcategory"]
    hs_snippet = f" (Top HS: {lead['top_hs_codes']})" if lead["top_hs_codes"] else ""
    what_they_do = f"Manufacturer-exporter of {subcat} & fine materials{hs_snippet}"

    clean_addr = lead["address"].replace("*", " ").strip(", ")
    addr_tokens = [clean_addr] if clean_addr else []
    if lead["city"] and (not clean_addr or lead["city"].lower() not in clean_addr.lower()):
        addr_tokens.append(lead["city"])
    if lead["pin_code"]:
        addr_tokens.append(f"PIN: {lead['pin_code']}")
    full_address = ", ".join(addr_tokens) if addr_tokens else (f"{lead['city']}, India" if lead["city"] else "Registered Corporate Office")

    hq_facilities = f"HQ: {lead['city']} · Address: {clean_addr}"
    if lead["pin_code"]:
        hq_facilities += f" (PIN: {lead['pin_code']})"
    hq_facilities += " → Gateways: Mumbai (BOM) air; Nhava Sheva (JNPT) sea"

    export_markets = f"Active customs corridors: {lead['trade_lanes']} (Global distribution)"

    scale_cred = (
        f"Verified Exporter (IEC: {lead['tax_id']}); "
        f"Declared Export Turnover: ${lead['total_value_usd']:,.2f} USD ({lead['total_shipments']} shipments)"
    )
    if lead["directors"]:
        d_preview = lead["directors"].split("PHONE")[0].replace("1.  :  ", "").strip()[:60]
        scale_cred += f"; Management: {d_preview}"

    return CompanyBackground(
        what_they_do=what_they_do,
        address=full_address,
        hq_facilities=hq_facilities,
        export_markets=export_markets,
        scale_credibility=scale_cred,
    )


def _synthesize_trade_lane(lead: dict[str, Any]) -> TradeLaneCommodity:
    if lead.get("source") == "apollo":
        origin_dest = f"{lead.get('country', 'International Hub')} → Global Corridors / India"
        commodity = f"{lead['category']} — {lead['subcategory']}"
        primary_mode = "MULTIMODAL (Air & Ocean Freight)"
        special_handling = "Global air freight consolidation · FCL/LCL ocean freight · Cross-border customs clearance"
        return TradeLaneCommodity(
            origin_destination=origin_dest,
            commodity=commodity,
            primary_mode=primary_mode,
            special_handling=special_handling,
            total_shipments=0,
            total_value_usd=lead["total_value_usd"],
            lading_port="International Air / Ocean Hubs",
        )

    if lead.get("country") == "Brazil" or lead.get("source") == "datamyne_brazil":
        origin_dest = f"Brazil ({lead['city']}) → {lead['trade_lanes']}"
        commodity = f"{lead['category']} — {lead['subcategory']}"
        primary_mode = f"{lead['transport_mode'].upper()} ({lead['total_shipments']} recorded customs shipments)"
        special_handling = "International multimodal handling · Reefer/Containerized ocean · Air cargo clearance"
        return TradeLaneCommodity(
            origin_destination=origin_dest,
            commodity=commodity,
            primary_mode=primary_mode,
            special_handling=special_handling,
            total_shipments=lead["total_shipments"],
            total_value_usd=lead["total_value_usd"],
            lading_port="BRSSZ (Santos Sea) / BRGRU (Guarulhos Air)",
        )

    cat = lead["category"]
    subcat = lead["subcategory"]
    origin_dest = f"Mumbai (BOM / JNPT) → {lead['trade_lanes']}"
    commodity = f"{cat} — {subcat}"
    primary_mode = f"{lead['transport_mode'].upper()} ({lead['total_shipments']} recorded customs shipments)"

    is_pharma_chem = "Chemical" in cat or "Pharma" in cat
    if is_pharma_chem:
        special_handling = (
            "IATA DG / IMO Hazardous Chemical Handling · Temperature-Controlled Storage & Cold Chain (2-8°C / 15-25°C) · "
            "Regulated Market Customs Documentation"
        )
    elif "Perishable" in cat:
        special_handling = "Cold-chain reefer handling · Fast-track perishables tarmac clearance · Pre-cooling coordination"
    else:
        special_handling = "Standard export cargo handling · Licensed CHA export documentation"

    return TradeLaneCommodity(
        origin_destination=origin_dest,
        commodity=commodity,
        primary_mode=primary_mode,
        special_handling=special_handling,
        total_shipments=lead["total_shipments"],
        total_value_usd=lead["total_value_usd"],
        lading_port="INBOM4 (Mumbai Air) / INNSA1 (Nhava Sheva Sea)",
    )


def _synthesize_jfll_fit(lead: dict[str, Any]) -> JfllFit:
    if lead.get("source") == "apollo":
        cargo_strength = (
            f"International cargo profile across {lead['category']} aligns with Jet Freight's global forwarding network, "
            "150+ country partner network, and competitive scheduled air & ocean container contracts."
        )
        pitch_angle = (
            "Global multimodal air & ocean forwarding · Direct customs brokerage · "
            "Publicly listed logistics provider since 1986 (NSE/BSE: JETFREIGHT) · Dedicated multinational account support"
        )
        return JfllFit(
            cargo_strength=cargo_strength,
            pitch_angle=pitch_angle,
        )

    if lead.get("country") == "Brazil" or lead.get("source") == "datamyne_brazil":
        cargo_strength = (
            f"Latin America trade volumes ({lead['total_shipments']} shipments, ${lead['total_value_usd']:,.2f} USD) suit Jet Freight's "
            "multimodal network, South America-to-India/Middle East corridors, and specialized cross-border customs brokerage."
        )
        pitch_angle = (
            "Multimodal Santos/GRU sea-air connectivity · Full-container & LCL consolidation · Licensed customs broker · "
            "Listed since 1986 (NSE/BSE: JETFREIGHT) · Dedicated Latin America trade desk"
        )
        return JfllFit(
            cargo_strength=cargo_strength,
            pitch_angle=pitch_angle,
        )

    cat = lead["category"]
    subcat = lead["subcategory"]
    is_pharma_chem = "Chemical" in cat or "Pharma" in cat
    shipments_str = f"{lead['total_shipments']} shipments"
    val_str = f"${lead['total_value_usd']:,.2f} USD"

    if is_pharma_chem:
        cargo_strength = (
            f"High-value {subcat} export flows ({shipments_str}, {val_str}) suit JFLL multimodal + IATA DG capability; "
            "licensed CHA for two-way chemical/pharma customs; temperature-controlled storage; 150+ country global network."
        )
        pitch_angle = (
            "IATA-accredited DG & pharma express air · Temperature-controlled/reefer cold chain · "
            "Licensed CHA two-way customs · ISO 9001:2015 · Listed since 1986 (NSE/BSE: JETFREIGHT) · Mumbai-local plant-to-gateway lane"
        )
    else:
        cargo_strength = (
            f"Export cargo volume ({shipments_str}, {val_str}) matches JFLL scheduled air capacity and multimodal sea freight; "
            "end-to-end customs brokerage and tracking across 150+ global destinations."
        )
        pitch_angle = (
            "Multimodal sea (JNPT) + express air (BOM) · Licensed CHA customs brokerage · ISO 9001:2015 · "
            "Listed since 1986 (NSE/BSE: JETFREIGHT) · Dedicated Mumbai operations desk"
        )

    return JfllFit(
        cargo_strength=cargo_strength,
        pitch_angle=pitch_angle,
    )


def _find_apollo_contacts(
    company_name: str,
    org_id: str | None = None,
    limit: int = 10,
) -> list[ContactItem]:
    """Search Apollo 15.5M contact directory for verified logistics & supply chain decision makers."""
    contacts: list[ContactItem] = []
    clean_name = (company_name or "").strip()
    if not clean_name and not org_id:
        return contacts

    conn = _get_duckdb_cursor()
    try:
        seen_names: set[str] = set()
        cleaned_term = clean_corporate_term(clean_name) if clean_name else ""
        apollo_leads_src = _get_apollo_leads_source()
        apollo_contacts_src = _get_apollo_contacts_source()

        # 1. Exact organization_id lookup if provided directly
        if org_id:
            try:
                sql_direct = f"""
                    SELECT c.person_name, c.job_title, c.email, c.linkedin_url, c.seniority, c.is_logistics_role, l.phone
                    FROM '{apollo_contacts_src}' c
                    LEFT JOIN '{apollo_leads_src}' l ON c.organization_id = l.organization_id
                    WHERE c.organization_id = ?
                    ORDER BY c.is_logistics_role DESC, c.is_decision_maker DESC, c.has_email DESC
                    LIMIT ?
                """
                rows = conn.execute(sql_direct, [org_id, limit]).fetchall()
                for r in rows:
                    p_name, title, email, linkedin, sen, is_log, org_phone = r
                    norm_name = p_name.strip().lower()
                    if norm_name in seen_names:
                        continue
                    seen_names.add(norm_name)
                    c_email = str(email or "").strip()
                    c_phone = str(org_phone or "").strip()
                    c_info = f"{c_email} | {c_phone}".strip(" |") if (c_email or c_phone) else (linkedin if linkedin else "Apollo Verified")
                    sen_tag = sen.title() if sen else ("Logistics Lead" if is_log else "Executive")
                    notes = f"Apollo Verified ({sen_tag})"
                    if linkedin and linkedin != c_info:
                        notes += f" · {linkedin}"
                    contacts.append(
                        ContactItem(
                            name=p_name,
                            designation=title or "Logistics Decision-Maker",
                            phone=c_phone,
                            email=c_email,
                            contact_info=c_info,
                            notes=notes,
                        )
                    )
            except Exception as exc:
                logger.debug("Apollo direct org contact lookup encountered: %s", exc)

        # 2. Profiled contacts via Apollo organization resolution by company name
        if len(contacts) < limit and clean_name:
            try:
                org_ids = resolve_company_ids_cached(clean_name, apollo_leads_src)
                if not org_ids and cleaned_term and cleaned_term.lower() != clean_name.lower():
                    org_ids = resolve_company_ids_cached(cleaned_term, apollo_leads_src)

                if org_ids:
                    placeholders = ", ".join(["?"] * len(org_ids[:15]))
                    sql = f"""
                        SELECT c.person_name, c.job_title, c.email, c.linkedin_url, c.seniority, c.is_logistics_role, l.phone
                        FROM '{apollo_contacts_src}' c
                        JOIN '{apollo_leads_src}' l ON c.organization_id = l.organization_id
                        WHERE c.organization_id IN ({placeholders})
                          AND (c.is_logistics_role = TRUE OR c.is_decision_maker = TRUE)
                        ORDER BY c.is_logistics_role DESC, c.is_decision_maker DESC, c.has_email DESC
                        LIMIT ?
                    """
                    rows = conn.execute(sql, list(org_ids[:15]) + [limit - len(contacts)]).fetchall()
                    for r in rows:
                        p_name, title, email, linkedin, sen, is_log, org_phone = r
                        norm_name = p_name.strip().lower()
                        if norm_name in seen_names:
                            continue
                        seen_names.add(norm_name)
                        c_email = str(email or "").strip()
                        c_phone = str(org_phone or "").strip()
                        c_info = f"{c_email} | {c_phone}".strip(" |") if (c_email or c_phone) else (linkedin if linkedin else "Apollo Verified")
                        sen_tag = sen.title() if sen else ("Logistics Lead" if is_log else "Executive")
                        notes = f"Apollo Verified ({sen_tag})"
                        if linkedin and linkedin != c_info:
                            notes += f" · {linkedin}"
                        contacts.append(
                            ContactItem(
                                name=p_name,
                                designation=title or "Logistics Decision-Maker",
                                phone=c_phone,
                                email=c_email,
                                contact_info=c_info,
                                notes=notes,
                            )
                        )
            except Exception as exc:
                logger.debug("Apollo profiled contact lookup encountered: %s", exc)

        # 3. Unprofiled contacts by employer name if limit not reached
        if len(contacts) < limit and clean_name:
            try:
                apollo_unprofiled_src = _get_apollo_unprofiled_source()
                search_term = cleaned_term if cleaned_term else clean_name
                kws = extract_company_search_keywords(search_term)
                if kws:
                    where_clause = " AND ".join(["employer_name ILIKE ?" for _ in kws])
                    sql2 = f"""
                        SELECT person_name, job_title, email, linkedin_url, seniority
                        FROM '{apollo_unprofiled_src}'
                        WHERE {where_clause}
                        ORDER BY is_logistics_role DESC, is_decision_maker DESC, has_email DESC
                        LIMIT ?
                    """
                    rows2 = conn.execute(sql2, [f"%{w}%" for w in kws] + [limit - len(contacts)]).fetchall()
                    for r in rows2:
                        p_name, title, email, linkedin, sen = r
                        norm_name = p_name.strip().lower()
                        if norm_name in seen_names:
                            continue
                        seen_names.add(norm_name)
                        c_email = str(email or "").strip()
                        c_info = c_email or (linkedin if linkedin else "Apollo Verified")
                        sen_tag = sen.title() if sen else "Logistics Lead"
                        notes = f"Apollo Verified ({sen_tag})"
                        if linkedin and linkedin != c_info:
                            notes += f" · {linkedin}"
                        contacts.append(
                            ContactItem(
                                name=p_name,
                                designation=title or "Logistics Decision-Maker",
                                phone="",
                                email=c_email,
                                contact_info=c_info,
                                notes=notes,
                            )
                        )
            except Exception as exc:
                logger.debug("Apollo unprofiled contact lookup encountered: %s", exc)
    finally:
        conn.close()

    return contacts


def _synthesize_contacts(lead: dict[str, Any], apollo_limit: int = 10) -> list[ContactItem]:
    contacts: list[ContactItem] = []
    seen_names: set[str] = set()

    # Special handling for Apollo leads: prioritize verified executive contacts
    if lead.get("source") == "apollo":
        corp_phone = str(lead.get("phone", "") or "").strip()
        corp_email = str(lead.get("email", "") or (f"info@{lead.get('domain')}" if lead.get("domain") else "")).strip()
        corp_info = f"{corp_email} | {corp_phone}".strip(" |")
        contacts.append(
            ContactItem(
                name="Headquarters / Corporate Office",
                designation="Global Headquarters",
                phone=corp_phone,
                email=corp_email,
                contact_info=corp_info or (f"domain: {lead.get('domain')}" if lead.get("domain") else "Apollo Verified Account"),
                notes=f"Org ID: {lead['id']} (Apollo Verified)",
            )
        )
        apollo_contacts = _find_apollo_contacts(lead["company_name"], org_id=lead["id"], limit=apollo_limit)
        for ac in apollo_contacts:
            norm_ac_name = ac.name.strip().lower()
            if norm_ac_name not in seen_names:
                seen_names.add(norm_ac_name)
                contacts.append(ac)

        if len(contacts) < 2:
            contacts.append(
                ContactItem(
                    name="Logistics / SCM Head",
                    designation="Supply Chain Manager",
                    phone="",
                    email="",
                    contact_info="[Enter email / phone]",
                    notes="Primary Logistics Decision-Maker",
                )
            )
        return contacts

    clean_addr = lead["address"].replace("*", " ").strip(", ")
    dm_phone = str(lead.get("phone", "") or "").strip()
    dm_email = str(lead.get("email", "") or "").strip()
    dm_info = f"{dm_email} | {dm_phone}".strip(" |")

    # Row 1: Customs registered corporate office (DataMyne)
    contacts.append(
        ContactItem(
            name="General / Customs Filing",
            designation=clean_addr[:50] if clean_addr else "Registered Corporate Office",
            phone=dm_phone,
            email=dm_email,
            contact_info=dm_info or "Customs Manifest Record",
            notes=f"IEC: {lead['tax_id']} (Customs Record)",
        )
    )

    # Statutory Directors if available (DataMyne MCA Registry)
    if lead.get("directors"):
        d_chunks = re.split(r"\d+\.\s*:\s*", lead["directors"])
        for chunk in d_chunks:
            if not chunk.strip():
                continue
            name_part = chunk.split("PHONE")[0].strip()
            clean_name = re.sub(r"\s+", " ", name_part).strip()
            name_tokens = clean_name.split()[:3]
            director_name = " ".join(name_tokens).title()
            if director_name and len(director_name) > 3:
                norm_dname = director_name.lower()
                if norm_dname not in seen_names:
                    seen_names.add(norm_dname)
                    # Extract director phone if present in PHONE/EMAIL: chunk, otherwise fallback to company phone
                    d_phone = ""
                    if "PHONE/EMAIL:" in chunk:
                        pe_part = chunk.split("PHONE/EMAIL:")[1].strip()
                        m_phone = re.search(r"(\+?\d[\d\s\-\/\(\)]{5,}\d)", pe_part)
                        if m_phone:
                            d_phone = m_phone.group(1).strip()
                    if not d_phone:
                        d_phone = dm_phone
                    d_email = dm_email
                    d_info = f"{d_email} | {d_phone}".strip(" |") if (d_email or d_phone) else "MCA Directory"
                    contacts.append(
                        ContactItem(
                            name=director_name,
                            designation="Director / Board Member",
                            phone=d_phone,
                            email=d_email,
                            contact_info=d_info,
                            notes="Corporate Director (Ministry of Corporate Affairs)",
                        )
                    )

    # Apollo Decision Makers (Logistics / Supply Chain Managers / CXOs)
    apollo_contacts = _find_apollo_contacts(lead["company_name"], limit=apollo_limit)
    for ac in apollo_contacts:
        norm_ac_name = ac.name.strip().lower()
        if norm_ac_name not in seen_names:
            seen_names.add(norm_ac_name)
            contacts.append(ac)

    # If only 1 contact, append an editable row for the sales rep to fill
    if len(contacts) < 2:
        contacts.append(
            ContactItem(
                name="Logistics / SCM Head",
                designation="Supply Chain Manager",
                phone="",
                email="",
                contact_info="[Enter email / phone]",
                notes="Primary Logistics Decision-Maker",
            )
        )

    return contacts


def generate_client_report_data(
    company_query: str,
    lead_id: str | None = None,
    source: str | None = None,
    prepared_for: str = "Mumbai Sales Branch",
    prepared_by: str = "Tyra Theknath",
) -> ClientReportData:
    """Generate complete 4-section client report data for a company from any source."""
    lead = _find_lead(query=company_query, lead_id=lead_id, source=source)
    today_str = datetime.now().strftime("%d-%m-%Y")

    if not lead:
        draft = _build_unlisted_sme_report(company_query, prepared_for, prepared_by, today_str)
        if get_gemini_config()["is_available"]:
            return enrich_report_with_gemini_search(draft, company_query, None)
        return draft

    return ClientReportData(
        lead_id=lead["id"],
        header=ReportHeader(
            company_name=lead["company_name"],
            subtitle=_synthesize_subtitle(lead),
            prepared_for=prepared_for,
            prepared_by=prepared_by,
            date=today_str,
        ),
        section_1_background=_synthesize_company_background(lead),
        section_2_trade_lane=_synthesize_trade_lane(lead),
        section_3_jfll_fit=_synthesize_jfll_fit(lead),
        section_4_contacts=_synthesize_contacts(lead),
        section_5_feedback=_find_historical_approach_feedback(lead["id"], lead["company_name"]),
    )
