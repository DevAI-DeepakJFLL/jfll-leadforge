"""Core service for Client Report / Prospect Brief data synthesis.
Queries DataMyne leads and synthesizes executive 4-section briefings.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import os
import re

from src.api.database import get_db_connection
from src.api.report_models import (
    ClientReportData,
    CompanyBackground,
    ContactItem,
    JfllFit,
    ReportCompanySuggestion,
    ReportHeader,
    TradeLaneCommodity,
)

DATAMYNE_PARQUET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data",
    "processed",
    "datamyne_leads_zstd.parquet",
)

def _get_duckdb_cursor():
    return get_db_connection().cursor()

def search_report_companies(query: str, limit: int = 10) -> List[Dict[str, Any]]:
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

def _find_datamyne_lead(query: str) -> Optional[Dict[str, Any]]:
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

def _row_to_lead_dict(r) -> Dict[str, Any]:
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

def generate_client_report_data(
    company_query: str,
    prepared_for: str = "Mumbai Sales Branch",
    prepared_by: str = "Tyra Theknath",
) -> ClientReportData:
    """Generate complete 4-section client report data for a company."""
    lead = _find_datamyne_lead(company_query)
    today_str = datetime.now().strftime("%d-%m-%Y")

    if not lead:
        # Graceful unlisted SME fallback
        return ClientReportData(
            lead_id=None,
            header=ReportHeader(
                company_name=company_query,
                subtitle="Commercial Merchant Exporter (Unpublished SME)",
                prepared_for=prepared_for,
                prepared_by=prepared_by,
                date=today_str,
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
            section_4_contacts=[
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
        )

    # 1. Header Subtitle Synthesis
    subcat = lead["subcategory"]
    cat = lead["category"]
    if "Chemical" in cat or "API" in subcat or "Organic" in subcat:
        subtitle = "API, intermediate & fine-chemical export house" if "Exports" in lead["company_name"] else "API & advanced-intermediate manufacturer–exporter"
    elif "Pharma" in cat or "Formulation" in subcat:
        subtitle = "Pharmaceutical & healthcare formulations manufacturer–exporter"
    elif "Perishable" in cat:
        subtitle = "Fresh produce & perishables exporter (cold-chain specialized)"
    else:
        subtitle = f"{subcat} Manufacturer–Exporter"

    # 2. Section 1: Background
    hs_snippet = f" (Top HS: {lead['top_hs_codes']})" if lead["top_hs_codes"] else ""
    what_they_do = f"Manufacturer-exporter of {subcat} & fine materials{hs_snippet}"
    
    clean_addr = lead["address"].replace("*", " ").strip(", ")
    hq_facilities = f"HQ: {lead['city']} · Address: {clean_addr}"
    if lead["pin_code"]:
        hq_facilities += f" (PIN: {lead['pin_code']})"
    hq_facilities += " → Gateways: Mumbai (BOM) air; Nhava Sheva (JNPT) sea"

    export_markets = f"Active customs corridors: {lead['trade_lanes']} (Global distribution)"
    
    scale_cred = f"Verified Exporter (IEC: {lead['tax_id']}); Declared Export Turnover: ${lead['total_value_usd']:,.2f} USD ({lead['total_shipments']} shipments)"
    if lead["directors"]:
        d_preview = lead["directors"].split("PHONE")[0].replace("1.  :  ", "").strip()[:60]
        scale_cred += f"; Management: {d_preview}"

    # 3. Section 2: Trade Lane & Commodity
    origin_dest = f"Mumbai (BOM / JNPT) → {lead['trade_lanes']}"
    commodity = f"{cat} — {subcat}"
    primary_mode = f"{lead['transport_mode'].upper()} ({lead['total_shipments']} recorded customs shipments)"

    is_pharma_chem = "Chemical" in cat or "Pharma" in cat
    if is_pharma_chem:
        special_handling = "IATA DG / IMO Hazardous Chemical Handling · Temperature-Controlled Storage & Cold Chain (2-8°C / 15-25°C) · Regulated Market Customs Documentation"
    elif "Perishable" in cat:
        special_handling = "Cold-chain reefer handling · Fast-track perishables tarmac clearance · Pre-cooling coordination"
    else:
        special_handling = "Standard export cargo handling · Licensed CHA export documentation"

    # 4. Section 3: JFLL Fit — Why Us
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

    # 5. Section 4: Decision-Makers / Logistics Contacts
    contacts: List[ContactItem] = []
    
    # Row 1: Customs registered corporate office
    contacts.append(
        ContactItem(
            name="General / Customs Filing",
            designation=clean_addr[:50] if clean_addr else "Registered Corporate Office",
            contact_info=f"{lead['email']} | {lead['phone']}".strip(" |"),
            notes=f"IEC: {lead['tax_id']} (Customs Record)",
        )
    )

    # Row 2: Directors if available
    if lead["directors"]:
        d_chunks = re.split(r"\d+\.\s*:\s*", lead["directors"])
        for chunk in d_chunks:
            if not chunk.strip():
                continue
            name_part = chunk.split("PHONE")[0].strip()
            # Clean name from parent name if joined
            clean_name = re.sub(r"\s+", " ", name_part).strip()
            # Take first 3-4 words as director name
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
                break  # add top director

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

    return ClientReportData(
        lead_id=lead["id"],
        header=ReportHeader(
            company_name=lead["company_name"],
            subtitle=subtitle,
            prepared_for=prepared_for,
            prepared_by=prepared_by,
            date=today_str,
        ),
        section_1_background=CompanyBackground(
            what_they_do=what_they_do,
            hq_facilities=hq_facilities,
            export_markets=export_markets,
            scale_credibility=scale_cred,
        ),
        section_2_trade_lane=TradeLaneCommodity(
            origin_destination=origin_dest,
            commodity=commodity,
            primary_mode=primary_mode,
            special_handling=special_handling,
            total_shipments=lead["total_shipments"],
            total_value_usd=lead["total_value_usd"],
            lading_port="INBOM4 (Mumbai Air) / INNSA1 (Nhava Sheva Sea)",
        ),
        section_3_jfll_fit=JfllFit(
            cargo_strength=cargo_strength,
            pitch_angle=pitch_angle,
        ),
        section_4_contacts=contacts,
    )
