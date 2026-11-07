"""Core service for Client Report / Prospect Brief data synthesis.
Queries DataMyne leads and synthesizes executive 4-section briefings.
"""
import os
import re
from datetime import datetime
from typing import Any

from src.api.database import get_db_connection
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

def search_report_companies(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Search for companies in DataMyne by name or ID for quick autocomplete."""
    if not query or not query.strip():
        return []

    clean_q = query.strip()
    conn = _get_duckdb_cursor()
    try:
        sql = """
            SELECT id, company_name, city, country, total_shipments, total_value_usd, category
            FROM read_parquet(?)
            WHERE id = ? OR company_name ILIKE '%' || ? || '%'
            ORDER BY total_shipments DESC, total_value_usd DESC
            LIMIT ?
        """
        rows = conn.execute(sql, [DATAMYNE_PARQUET_PATH, clean_q, clean_q, limit]).fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r[0],
                "company_name": r[1],
                "city": r[2],
                "country": r[3] or "India",
                "total_shipments": int(r[4]) if r[4] is not None else 0,
                "total_value_usd": float(r[5]) if r[5] is not None else 0.0,
                "category": r[6],
            })
        return results
    finally:
        conn.close()

def _find_datamyne_lead(query: str) -> dict[str, Any] | None:
    """Look up a lead by ID or flexible company name matching."""
    clean_q = query.strip()
    conn = _get_duckdb_cursor()
    try:
        # 1. Exact ID check
        sql_id = """
            SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
                   city, address, pin_code, email, phone, total_shipments, total_value_usd, 
                   trade_lanes, top_hs_codes, directors
            FROM read_parquet(?)
            WHERE id = ?
            LIMIT 1
        """
        row = conn.execute(sql_id, [DATAMYNE_PARQUET_PATH, clean_q]).fetchone()
        if row:
            return _row_to_lead_dict(row)

        # 2. Exact or ILIKE pattern check
        tokens = [t for t in re.split(r"[\s,\-\(\)\.]+", clean_q) if len(t) >= 3 and t.lower() not in {"pvt", "ltd", "private", "limited", "the", "and"}]
        pattern = "%" + "%".join(tokens) + "%" if tokens else f"%{clean_q}%"

        sql_name = """
            SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
                   city, address, pin_code, email, phone, total_shipments, total_value_usd, 
                   trade_lanes, top_hs_codes, directors
            FROM read_parquet(?)
            WHERE company_name ILIKE ?
            ORDER BY total_shipments DESC, total_value_usd DESC
            LIMIT 1
        """
        row = conn.execute(sql_name, [DATAMYNE_PARQUET_PATH, pattern]).fetchone()
        if row:
            return _row_to_lead_dict(row)

        # 3. First token fallback if multiple words
        if tokens:
            row = conn.execute(sql_name, [DATAMYNE_PARQUET_PATH, f"%{tokens[0]}%"]).fetchone()
            if row:
                return _row_to_lead_dict(row)

        # 4. Vectorized compound word split fallback (single pass with OR conditions)
        candidates_to_split = [clean_q] + tokens
        compound_patterns = []
        for candidate in candidates_to_split:
            alphanumeric = re.sub(r"[^a-zA-Z0-9]", "", candidate)
            if len(alphanumeric) >= 6:
                for i in range(3, len(alphanumeric) - 2):
                    compound_patterns.append(f"%{alphanumeric[:i]}%{alphanumeric[i:]}%")

        if compound_patterns:
            or_clause = " OR ".join(["company_name ILIKE ?" for _ in compound_patterns])
            sql_compound = f"""
                SELECT id, company_name, tax_id, transport_mode, category, subcategory, 
                       city, address, pin_code, email, phone, total_shipments, total_value_usd, 
                       trade_lanes, top_hs_codes, directors
                FROM read_parquet(?)
                WHERE {or_clause}
                ORDER BY total_shipments DESC, total_value_usd DESC
                LIMIT 1
            """
            row = conn.execute(sql_compound, [DATAMYNE_PARQUET_PATH] + compound_patterns).fetchone()
            if row:
                return _row_to_lead_dict(row)

        return None
    finally:
        conn.close()

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
    except Exception:
        pass

    return SalesFeedback()


def _build_unlisted_sme_report(
    company_name: str,
    prepared_for: str,
    prepared_by: str,
    date_str: str,
) -> ClientReportData:
    """Fallback draft briefing for SMEs without primary DataMyne customs records."""
    return ClientReportData(
        lead_id=None,
        header=ReportHeader(
            company_name=company_name,
            subtitle="Commercial Merchant Exporter (Unpublished SME)",
            prepared_for=prepared_for,
            prepared_by=prepared_by,
            date=date_str,
        ),
        section_1_background=CompanyBackground(
            what_they_do="Commercial exporter / merchant trader of general commodities and industrial goods",
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
        section_4_contacts=_find_apollo_contacts(company_name, limit=3) or [
            ContactItem(
                name="General / Switchboard",
                designation="Corporate Inquiries",
                contact_info="info@company.com",
                notes="Primary Corporate Contact",
            ),
            ContactItem(
                name="Logistics Head",
                designation="Supply Chain / Logistics Manager",
                contact_info="logistics@company.com",
                notes="Key Freight Decision-Maker",
            ),
        ],
        section_5_feedback=_find_historical_approach_feedback(None, company_name),
    )


def _synthesize_subtitle(lead: dict[str, Any]) -> str:
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
    subcat = lead["subcategory"]
    hs_snippet = f" (Top HS: {lead['top_hs_codes']})" if lead["top_hs_codes"] else ""
    what_they_do = f"Manufacturer-exporter of {subcat} & fine materials{hs_snippet}"

    clean_addr = lead["address"].replace("*", " ").strip(", ")
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
        hq_facilities=hq_facilities,
        export_markets=export_markets,
        scale_credibility=scale_cred,
    )


def _synthesize_trade_lane(lead: dict[str, Any]) -> TradeLaneCommodity:
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


def _find_apollo_contacts(company_name: str, limit: int = 2) -> list[ContactItem]:
    """Search Apollo 15.5M contact directory for verified logistics & supply chain decision makers."""
    contacts: list[ContactItem] = []
    clean_name = (company_name or "").strip()
    if not clean_name:
        return contacts

    conn = _get_duckdb_cursor()

    # 1. Profiled contacts via Apollo organization lookup
    try:
        from src.api.cache import resolve_company_ids_cached

        if os.path.exists(APOLLO_LEADS_PATH) and os.path.exists(APOLLO_CONTACTS_PATH):
            org_ids = resolve_company_ids_cached(clean_name, APOLLO_LEADS_PATH)
            if org_ids:
                placeholders = ", ".join(["?"] * len(org_ids[:15]))
                sql = f"""
                    SELECT person_name, job_title, email, linkedin_url, seniority, is_logistics_role
                    FROM '{APOLLO_CONTACTS_PATH}'
                    WHERE organization_id IN ({placeholders})
                    ORDER BY is_logistics_role DESC, is_decision_maker DESC, has_email DESC
                    LIMIT ?
                """
                rows = conn.execute(sql, list(org_ids[:15]) + [limit]).fetchall()
                for r in rows:
                    p_name, title, email, linkedin, sen, is_log = r
                    c_info = email or (linkedin if linkedin else "Apollo Verified")
                    sen_tag = sen.title() if sen else ("Logistics Lead" if is_log else "Executive")
                    notes = f"Apollo Verified ({sen_tag})"
                    if linkedin and linkedin != c_info:
                        notes += f" · {linkedin}"
                    contacts.append(
                        ContactItem(
                            name=p_name,
                            designation=title or "Logistics Decision-Maker",
                            contact_info=c_info,
                            notes=notes,
                        )
                    )
    except Exception as exc:
        logger.debug("Apollo profiled contact lookup encountered: %s", exc)

    # 2. Unprofiled contacts by employer name if limit not reached
    if len(contacts) < limit and os.path.exists(APOLLO_UNPROFILED_PATH):
        try:
            tokens = clean_name.split()
            first_token = tokens[0] if tokens else clean_name
            if len(first_token) >= 3:
                sql2 = f"""
                    SELECT person_name, job_title, email, linkedin_url, seniority
                    FROM '{APOLLO_UNPROFILED_PATH}'
                    WHERE employer_name ILIKE ?
                    ORDER BY is_logistics_role DESC, is_decision_maker DESC, has_email DESC
                    LIMIT ?
                """
                rows2 = conn.execute(sql2, [f"%{first_token}%", limit - len(contacts)]).fetchall()
                for r in rows2:
                    p_name, title, email, linkedin, sen = r
                    c_info = email or (linkedin if linkedin else "Apollo Verified")
                    sen_tag = sen.title() if sen else "Logistics Lead"
                    notes = f"Apollo Verified ({sen_tag})"
                    if linkedin and linkedin != c_info:
                        notes += f" · {linkedin}"
                    contacts.append(
                        ContactItem(
                            name=p_name,
                            designation=title or "Logistics Decision-Maker",
                            contact_info=c_info,
                            notes=notes,
                        )
                    )
        except Exception as exc:
            logger.debug("Apollo unprofiled contact lookup encountered: %s", exc)

    return contacts


def _synthesize_contacts(lead: dict[str, Any]) -> list[ContactItem]:
    contacts: list[ContactItem] = []
    clean_addr = lead["address"].replace("*", " ").strip(", ")

    # Row 1: Customs registered corporate office (DataMyne)
    contacts.append(
        ContactItem(
            name="General / Customs Filing",
            designation=clean_addr[:50] if clean_addr else "Registered Corporate Office",
            contact_info=f"{lead['email']} | {lead['phone']}".strip(" |"),
            notes=f"IEC: {lead['tax_id']} (Customs Record)",
        )
    )

    # Row 2: Statutory Directors if available (DataMyne MCA Registry)
    if lead["directors"]:
        d_chunks = re.split(r"\d+\.\s*:\s*", lead["directors"])
        for chunk in d_chunks:
            if not chunk.strip():
                continue
            name_part = chunk.split("PHONE")[0].strip()
            clean_name = re.sub(r"\s+", " ", name_part).strip()
            name_tokens = clean_name.split()[:3]
            director_name = " ".join(name_tokens).title()
            if director_name and len(director_name) > 3:
                contacts.append(
                    ContactItem(
                        name=director_name,
                        designation="Director / Board Member",
                        contact_info=lead["email"] or "MCA Directory",
                        notes="Corporate Director (Ministry of Corporate Affairs)",
                    )
                )
                break

    # Row 3 & 4: Apollo Decision Makers (Logistics / Supply Chain Managers)
    apollo_contacts = _find_apollo_contacts(lead["company_name"], limit=2)
    contacts.extend(apollo_contacts)

    # If only 1 contact, append an editable row for the sales rep to fill
    if len(contacts) < 2:
        contacts.append(
            ContactItem(
                name="Logistics / SCM Head",
                designation="Supply Chain Manager",
                contact_info="[Enter email / phone]",
                notes="Primary Logistics Decision-Maker",
            )
        )

    return contacts


def generate_client_report_data(
    company_query: str,
    prepared_for: str = "Mumbai Sales Branch",
    prepared_by: str = "Tyra Theknath",
) -> ClientReportData:
    """Generate complete 4-section client report data for a company."""
    lead = _find_datamyne_lead(company_query)
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
