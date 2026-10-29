"""
ETL Pipeline for DataMyne Brazil Dataset.
Consolidates Brazil-India import/export manifests and curated Brazil contacts into
standardized logistics leads with active-customer exclusion and HS code categorization.
"""

import csv
import re
import unicodedata
from collections import Counter
from pathlib import Path

import openpyxl
import pandas as pd

# Standard 2-digit HS chapter to logistics vertical taxonomy
CHAPTER_MAP = {
    # Perishables
    "02": ("Perishables", "Meat & Edible Meat Offal"),
    "03": ("Perishables", "Seafood & Marine Products"),
    "04": ("Perishables", "Dairy & Edible Animal Products"),
    "06": ("Perishables", "Floriculture & Cut Flowers"),
    "07": ("Perishables", "Fresh Vegetables & Produce"),
    "08": ("Perishables", "Fresh Fruits"),
    "09": ("Perishables", "Spices, Coffee & Tea"),
    "12": ("Perishables", "Agricultural Seeds & Sowing"),
    "13": ("Perishables", "Botanical Extracts & Resins"),
    "20": ("Perishables", "Processed Fruits & Vegetables"),
    "21": ("Perishables", "Processed Foods & Edible Preparations"),
    "22": ("Perishables", "Beverages & Liquids"),

    # Pharma & Healthcare
    "30": ("Pharma & Healthcare", "Pharmaceutical Formulations"),
    "90": ("Pharma & Healthcare", "Medical & Surgical Devices"),

    # Chemicals & Materials
    "28": ("Chemicals & Materials", "Inorganic Chemicals"),
    "29": ("Chemicals & Materials", "Organic Chemicals & APIs"),
    "38": ("Chemicals & Materials", "Specialty Chemicals & Auxiliaries"),

    # Textiles & Apparel
    "50": ("Textiles & Apparel", "Silk & Silk Textiles"),
    "51": ("Textiles & Apparel", "Wool & Animal Hair"),
    "52": ("Textiles & Apparel", "Cotton & Cotton Textiles"),
    "54": ("Textiles & Apparel", "Synthetic Filaments & Yarns"),
    "55": ("Textiles & Apparel", "Man-made Staple Fibres"),
    "56": ("Textiles & Apparel", "Wadding, Felt & Non-wovens"),
    "58": ("Textiles & Apparel", "Special Woven Fabrics"),
    "59": ("Textiles & Apparel", "Fabrics & Technical Textiles"),
    "60": ("Textiles & Apparel", "Knitted or Crocheted Fabrics"),
    "61": ("Textiles & Apparel", "Apparel & Ready-Made Garments (Knitted)"),
    "62": ("Textiles & Apparel", "Apparel & Ready-Made Garments (Woven)"),
    "63": ("Textiles & Apparel", "Made-up Textile Articles"),

    # Engineering & Machinery
    "84": ("Engineering & Machinery", "Industrial Machinery & Boilers"),
    "72": ("Engineering & Machinery", "Iron & Steel"),
    "73": ("Engineering & Machinery", "Iron, Steel & Hardware"),
    "82": ("Engineering & Machinery", "Tools & Implements"),

    # Electronics & Electrical
    "85": ("Electronics & Electrical", "Electrical Equipment & Switchgear"),

    # Automotive & EV
    "87": ("Automotive & EV", "Motor Vehicles, EV & Auto Parts"),

    # General Cargo
    "39": ("General Cargo", "Plastics & Polymers"),
    "40": ("General Cargo", "Rubber & Rubber Products"),
    "48": ("General Cargo", "Paper, Paperboard & Packaging"),
    "70": ("General Cargo", "Glass & Glassware"),
    "71": ("General Cargo", "Precious Metals & Jewellery"),
    "74": ("General Cargo", "Copper & Articles Thereof"),
    "76": ("General Cargo", "Aluminium & Articles Thereof"),
    "94": ("General Cargo", "Furniture, Bedding & Lighting"),
}

# Known noise tokens and placeholder names
NOISE_NAMES = {
    "NOTDECLARED", "NOTAVAILABLE", "TOTHEORDER", "TOTHEORDEROF",
    "UNKNOWN", "NA", "NONE", "NULL", "SAMEASCONSIGNEE", "TOORDER"
}


def clean_unicode(text: object) -> str:
    if not isinstance(text, str):
        text = str(text) if pd.notna(text) else ""
    text = text.replace("\xa0", " ").replace("Â", " ")
    text = unicodedata.normalize("NFKD", text)
    return re.sub(r"\s+", " ", text).strip()


def norm_name(s: object) -> str:
    if not s or pd.isna(s):
        return ""
    s = clean_unicode(s).upper()
    s = re.sub(r"^(M/S\.?|MESSRS\.?|M/S\s+|MS\.)\s*", "", s)
    s = re.sub(r"&", " AND ", s)
    s = re.sub(r"\bPVT\.?\s*LTD\.?\b", "PRIVATE LIMITED", s)
    s = re.sub(r"\bLTD\.\b", "LIMITED", s)
    s = re.sub(r"\bLTDA\b", "LTDA", s)
    s = re.sub(r"\bS\.?A\.?\b", "SA", s)
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s


def clean_phone(p: object) -> str:
    if not p or pd.isna(p):
        return ""
    p_str = clean_unicode(p)
    p_str = re.sub(r"^(None|nan|null)", "", p_str, flags=re.IGNORECASE).strip()
    return p_str


def norm_email(e: object) -> list[str]:
    if not e or pd.isna(e):
        return []
    e_str = clean_unicode(e).lower()
    if "@" in e_str and len(e_str) > 5:
        parts = [re.sub(r"\s+", "", x) for x in re.split(r"[,;/]", e_str)]
        return [x for x in parts if "@" in x and "." in x.split("@")[-1]]
    return []


def derive_category_subcategory(top_hs_codes: list[str], default_vertical: str = "General Cargo") -> tuple[str, str]:
    for code in top_hs_codes:
        digits = re.sub(r"\D", "", str(code))
        if len(digits) >= 2:
            ch = digits[:2]
            if ch in CHAPTER_MAP:
                return CHAPTER_MAP[ch]
    return (default_vertical, f"{default_vertical} (Trade)")


def get_base_dir() -> Path:
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / "Backend" / "data" / "brazil").exists():
            return parent
        if (parent / "data" / "brazil").exists() and parent.name == "Backend":
            return parent.parent
    cwd = Path.cwd()
    if (cwd / "Backend" / "data" / "brazil").exists():
        return cwd
    if (cwd / "data" / "brazil").exists() and cwd.name == "Backend":
        return cwd.parent
    return current.parent.parent.parent.parent


def load_active_customers(base_dir: Path) -> set[str]:
    active_path = base_dir / "Backend" / "data" / "processed" / "active_customers_leads.csv"
    if not active_path.exists():
        active_path = base_dir / "data" / "processed" / "active_customers_leads.csv"
    active_set = set()
    if active_path.exists():
        with open(active_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                n = norm_name(row.get("Full Name", ""))
                if n:
                    active_set.add(n)
    return active_set


def extract_and_transform_brazil_data() -> pd.DataFrame:
    base_dir = get_base_dir()
    brazil_dir = base_dir / "Backend" / "data" / "brazil"
    if not brazil_dir.exists():
        brazil_dir = base_dir / "data" / "brazil"
    output_dir = brazil_dir / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)

    active_customers = load_active_customers(base_dir)

    # 1. Load Brazil Target Companies (Curated Sheet 1)
    b15_file = brazil_dir / "Brazil_Data_12082026.xlsx"
    b15_map = {}
    if b15_file.exists():
        wb15 = openpyxl.load_workbook(b15_file, read_only=True)
        ws15 = wb15["Sheet1"]
        r15 = list(ws15.iter_rows(values_only=True))
        if len(r15) > 1:
            col_name = r15[0][0]
            df15 = pd.DataFrame(r15[1:], columns=r15[0]).dropna(subset=[col_name])
            for _, r in df15.iterrows():
                c_name = str(r[col_name]).strip()
                b15_map[norm_name(c_name)] = {
                    "company_name": c_name,
                    "phone": clean_phone(r.get("Phone / WhatsApp")),
                    "email": clean_unicode(r.get("Email")),
                    "website": str(r.get("Website", "")).strip(),
                    "city": str(r.get("City", "")).strip() or "São Paulo",
                    "address": str(r.get("Address", "")).strip(),
                }

    # 2. Load Curated Brazil Contacts from BRA_CON_JAN25_FEB26.xlsx Sheet2
    bcon_file = brazil_dir / "BRA_CON_JAN25_FEB26.xlsx"
    bcon_map = {}
    if bcon_file.exists():
        wb_bcon = openpyxl.load_workbook(bcon_file, read_only=True)
        if "Sheet2" in wb_bcon.sheetnames:
            ws_s2 = wb_bcon["Sheet2"]
            r_s2 = list(ws_s2.iter_rows(values_only=True))
            if len(r_s2) > 1:
                df_s2 = pd.DataFrame(r_s2[1:], columns=r_s2[0]).dropna(subset=["Company name"])
                for _, r in df_s2.iterrows():
                    c_name = str(r["Company name"]).strip()
                    addr = str(r.get("Address", "")).strip()
                    # Extract Brazilian city from address
                    city_match = re.search(r"^(São Paulo|Guarulhos|Hortolândia|Sumaré|Curitiba|Rio de Janeiro|Campinas)", addr, re.IGNORECASE)
                    city = city_match.group(1) if city_match else "São Paulo"
                    # Extract CEP postal code
                    cep_match = re.search(r"\b(\d{5}-?\d{3})\b", addr)
                    cep = cep_match.group(1) if cep_match else ""

                    bcon_map[norm_name(c_name)] = {
                        "company_name": c_name,
                        "phone": clean_phone(r.get("Phone number")),
                        "email": clean_unicode(r.get("E-mail ID")),
                        "website": str(r.get("Website", "")).strip(),
                        "city": city,
                        "address": addr,
                        "pin_code": cep,
                        "directors": f"{r.get('Contact person', '')} ({r.get('Designation', '')})".strip(),
                    }

    # Entity Storage
    companies = {}

    def get_or_create_company(c_name: str, country: str, role: str):
        nn = norm_name(c_name)
        if not nn or len(nn) < 3 or nn in NOISE_NAMES:
            return None
        if nn in active_customers:
            return None
        if nn not in companies:
            companies[nn] = {
                "company_name": c_name,
                "country": country,
                "roles": {role},
                "modes": set(),
                "phones": set(),
                "emails": set(),
                "tax_id": "",
                "city": "",
                "address": "",
                "pin_code": "",
                "directors": "",
                "trade_lanes": set(),
                "hs_codes": Counter(),
                "total_shipments": 0,
                "total_value_usd": 0.0,
                "latest_activity_date": "2024-01-01",
            }
        else:
            companies[nn]["roles"].add(role)
        return companies[nn]

    # 3. Ingest Brazil Imports (Datamyne_Brazil_All.xlsx DATA)
    imp_file = brazil_dir / "Datamyne_Brazil_All.xlsx"
    if imp_file.exists():
        wb_imp = openpyxl.load_workbook(imp_file, read_only=True)
        ws_imp = wb_imp["DATA"]
        rows_imp = list(ws_imp.iter_rows(values_only=True))
        if len(rows_imp) > 1:
            hdr = rows_imp[0]
            df_imp = pd.DataFrame(rows_imp[1:], columns=hdr)
            df_imp = df_imp.loc[:, df_imp.columns.notnull() & (df_imp.columns != "")]

            for _, r in df_imp.iterrows():
                # A. Indian Importer
                c_name = str(r.get("Importer", "")).strip()
                ent = get_or_create_company(c_name, "India", "Importer")
                if ent:
                    t_method = str(r.get("Transport Method", "AIR")).upper()
                    mode = "Air" if "AIR" in t_method else "Ocean"
                    ent["modes"].add(mode)
                    ent["trade_lanes"].add(f"Brazil-India/{mode}")
                    ent["total_shipments"] += 1
                    try:
                        ent["total_value_usd"] += float(r.get("Total Value (USD)", 0) or 0)
                    except Exception:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > ent["latest_activity_date"]:
                        ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        ent["hs_codes"][hs] += 1
                    p = clean_phone(r.get("Importer Phone"))
                    if p:
                        ent["phones"].add(p)
                    for em in norm_email(r.get("Importer Email")):
                        ent["emails"].add(em)
                    if not ent["tax_id"] and r.get("Importer Tax ID"):
                        ent["tax_id"] = str(r.get("Importer Tax ID")).strip()
                    if not ent["city"] and r.get("Importer City"):
                        ent["city"] = str(r.get("Importer City")).strip()
                    if not ent["address"] and r.get("Importer Address"):
                        ent["address"] = str(r.get("Importer Address")).strip()
                    if not ent["pin_code"] and r.get("Importer Zip Code"):
                        ent["pin_code"] = str(r.get("Importer Zip Code")).strip()
                    if not ent["directors"] and r.get("Importer Directors"):
                        ent["directors"] = str(r.get("Importer Directors")).strip()

                # B. Brazilian Supplier
                sup_name = str(r.get("Supplier", "")).strip()
                sup_ent = get_or_create_company(sup_name, "Brazil", "Exporter")
                if sup_ent:
                    t_method = str(r.get("Transport Method", "AIR")).upper()
                    mode = "Air" if "AIR" in t_method else "Ocean"
                    sup_ent["modes"].add(mode)
                    sup_ent["trade_lanes"].add(f"Brazil-India/{mode}")
                    sup_ent["total_shipments"] += 1
                    try:
                        sup_ent["total_value_usd"] += float(r.get("Total Value (USD)", 0) or 0)
                    except Exception:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > sup_ent["latest_activity_date"]:
                        sup_ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        sup_ent["hs_codes"][hs] += 1
                    if not sup_ent["address"] and r.get("Supplier Address"):
                        sup_ent["address"] = str(r.get("Supplier Address")).strip()

    # 4. Ingest Brazil Exports (BRA_CON_JAN25_FEB26.xlsx DATA)
    if bcon_file.exists():
        wb_exp = openpyxl.load_workbook(bcon_file, read_only=True)
        ws_exp = wb_exp["DATA"]
        rows_exp = list(ws_exp.iter_rows(values_only=True))
        if len(rows_exp) > 1:
            hdr_exp = rows_exp[0]
            df_exp = pd.DataFrame(rows_exp[1:], columns=hdr_exp)
            df_exp = df_exp.loc[:, df_exp.columns.notnull() & (df_exp.columns != "")]

            for _, r in df_exp.iterrows():
                # Filter exclusively for Brazil destination
                dest_country = str(r.get("Country of Destination", "")).strip().upper()
                if dest_country != "BRAZIL":
                    continue

                # A. Indian Exporter
                c_name = str(r.get("Exporter", "")).strip()
                ent = get_or_create_company(c_name, "India", "Exporter")
                if ent:
                    ent["modes"].add("Air")
                    ent["trade_lanes"].add("India-Brazil/Air")
                    ent["total_shipments"] += 1
                    try:
                        ent["total_value_usd"] += float(r.get("FOB Value (USD)", 0) or 0)
                    except Exception:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > ent["latest_activity_date"]:
                        ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        ent["hs_codes"][hs] += 1
                    p = clean_phone(r.get("Exporter Phone"))
                    if p:
                        ent["phones"].add(p)
                    for em in norm_email(r.get("Exporter Email")):
                        ent["emails"].add(em)
                    if not ent["tax_id"] and r.get("Exporter Tax ID"):
                        ent["tax_id"] = str(r.get("Exporter Tax ID")).strip()
                    if not ent["city"] and r.get("Exporter City"):
                        ent["city"] = str(r.get("Exporter City")).strip()
                    if not ent["address"] and r.get("Exporter Address"):
                        ent["address"] = str(r.get("Exporter Address")).strip()
                    if not ent["pin_code"] and r.get("Exporter Zip Code"):
                        ent["pin_code"] = str(r.get("Exporter Zip Code")).strip()
                    if not ent["directors"] and r.get("Exporter Directors"):
                        ent["directors"] = str(r.get("Exporter Directors")).strip()

                # B. Brazilian Foreign Buyer
                buy_name = str(r.get("Foreign Buyer", "")).strip()
                buy_ent = get_or_create_company(buy_name, "Brazil", "Importer")
                if buy_ent:
                    buy_ent["modes"].add("Air")
                    buy_ent["trade_lanes"].add("India-Brazil/Air")
                    buy_ent["total_shipments"] += 1
                    try:
                        buy_ent["total_value_usd"] += float(r.get("FOB Value (USD)", 0) or 0)
                    except Exception:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > buy_ent["latest_activity_date"]:
                        buy_ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        buy_ent["hs_codes"][hs] += 1
                    if not buy_ent["address"] and r.get("Foreign Buyer Declared"):
                        buy_ent["address"] = str(r.get("Foreign Buyer Declared")).strip()

    # 5. Enrich Brazilian Entities with Curated Contact Dossiers (1-to-1 matching)
    used_curated = set()
    matched_pairs = {}

    # Pass 1: Exact matches
    for nn, ent in companies.items():
        if ent["country"] == "Brazil":
            curated = None
            curated_key = None
            if nn in bcon_map and nn not in used_curated:
                curated_key = nn
                curated = bcon_map[nn]
            elif nn in b15_map and nn not in used_curated:
                curated_key = nn
                curated = b15_map[nn]

            if curated and curated_key:
                used_curated.add(curated_key)
                matched_pairs[nn] = curated

    # Pass 2: Strict prefix / word boundary matching (min length >= 6, 1-to-1)
    combined_curated = {**bcon_map, **b15_map}
    for nn, ent in companies.items():
        if ent["country"] == "Brazil" and nn not in matched_pairs:
            for k, v in combined_curated.items():
                if k in used_curated:
                    continue
                if len(k) >= 6 and len(nn) >= 6 and (nn.startswith(k) or k.startswith(nn)):
                    used_curated.add(k)
                    matched_pairs[nn] = v
                    break

    # Apply enrichment from matched pairs
    for nn, curated in matched_pairs.items():
        ent = companies[nn]
        if curated.get("phone"):
            ent["phones"].add(curated["phone"])
        for em in norm_email(curated.get("email")):
            ent["emails"].add(em)
        if curated.get("city") and not ent["city"]:
            ent["city"] = curated["city"]
        if curated.get("address") and (not ent["address"] or len(curated["address"]) > len(ent["address"])):
            ent["address"] = curated["address"]
        if curated.get("pin_code") and not ent["pin_code"]:
            ent["pin_code"] = curated["pin_code"]
        if curated.get("directors") and not ent["directors"]:
            ent["directors"] = curated["directors"]

    # Also add any remaining unmatched curated Brazilian companies as target leads
    for k, v in combined_curated.items():
        if k not in used_curated and k not in active_customers and k not in companies:
            ent = get_or_create_company(v["company_name"], "Brazil", "Importer")
            if ent:
                ent["modes"].add("Air")
                ent["trade_lanes"].add("India-Brazil/Air")
                if v.get("phone"):
                    ent["phones"].add(v["phone"])
                for em in norm_email(v.get("email")):
                    ent["emails"].add(em)
                if v.get("city"):
                    ent["city"] = v["city"]
                if v.get("address"):
                    ent["address"] = v["address"]
                if v.get("pin_code"):
                    ent["pin_code"] = v["pin_code"]
                if v.get("directors"):
                    ent["directors"] = v["directors"]

    # 6. Format Standardized Leads
    formatted_records = []
    lead_idx = 1
    # Deterministic sorting: highest total value first, tie-break by company name
    for nn, c in sorted(companies.items(), key=lambda x: (-x[1]["total_value_usd"], x[1]["company_name"])):
        # Role
        role = "Both" if len(c["roles"]) > 1 else next(iter(c["roles"]))

        # Transport Mode
        if "Air" in c["modes"] and "Ocean" in c["modes"]:
            transport_mode = "Air & Ocean"
        elif "Ocean" in c["modes"]:
            transport_mode = "Ocean"
        else:
            transport_mode = "Air"

        # Phones and Emails
        phone_str = " / ".join(sorted(c["phones"]))
        email_str = " / ".join(sorted(c["emails"]))

        # Contact Type & Dataset Type
        if phone_str and email_str:
            contact_type = "Both Phone & Email"
            dataset_type = "valid"
        elif phone_str:
            contact_type = "Phone only"
            dataset_type = "valid"
        elif email_str:
            contact_type = "Email only"
            dataset_type = "valid"
        else:
            contact_type = "Missing Phone & Email"
            dataset_type = "missing"

        # Top HS Codes
        top_hs = [h for h, _ in c["hs_codes"].most_common(5)]
        top_hs_str = ", ".join(top_hs)

        # Category and Subcategory
        category, subcategory = derive_category_subcategory(top_hs)

        # City fallback if in Brazil
        city_str = c["city"]
        if not city_str and c["country"] == "Brazil":
            m = re.search(
                r"\b(São Paulo|Rio de Janeiro|Guarulhos|Curitiba|Santos|Hortolândia|Sumaré|Sorocaba|Belo Horizonte|Porto Alegre)\b",
                c["address"],
                re.IGNORECASE,
            )
            city_str = m.group(1).title() if m else "São Paulo, Brazil"

        formatted_records.append({
            "id": f"dm-bra-{lead_idx:05d}",
            "company_name": c["company_name"],
            "country": c["country"],
            "role": role,
            "transport_mode": transport_mode,
            "category": category,
            "subcategory": subcategory,
            "contact_type": contact_type,
            "phone": phone_str,
            "email": email_str,
            "tax_id": c["tax_id"],
            "city": city_str,
            "address": c["address"],
            "pin_code": c["pin_code"],
            "directors": c["directors"],
            "trade_lanes": ", ".join(sorted(c["trade_lanes"])),
            "top_hs_codes": top_hs_str,
            "total_shipments": int(c["total_shipments"]),
            "total_value_usd": round(float(c["total_value_usd"]), 2),
            "latest_activity_date": c["latest_activity_date"],
            "dataset_type": dataset_type,
        })
        lead_idx += 1

    df_out = pd.DataFrame(formatted_records)

    # Save to Parquet
    parquet_path = output_dir / "datamyne_brazil_leads_zstd.parquet"
    df_out.to_parquet(parquet_path, engine="pyarrow", compression="zstd", index=False)
    print(f"Exported {len(df_out):,} Brazil leads to {parquet_path.name}")

    # Also save to main processed directory
    main_processed_dir = base_dir / "Backend" / "data" / "processed"
    if not main_processed_dir.exists():
        main_processed_dir = base_dir / "data" / "processed"
    if main_processed_dir.exists():
        main_parquet_path = main_processed_dir / "datamyne_brazil_leads_zstd.parquet"
        df_out.to_parquet(main_parquet_path, engine="pyarrow", compression="zstd", index=False)
        print(f"Exported copy to {main_parquet_path}")

    # Save to Excel Directory
    excel_path = output_dir / "Master_Cleaned_Brazil_Contacts_Directory.xlsx"
    df_out.to_excel(excel_path, index=False)
    print(f"Exported {len(df_out):,} Brazil leads to {excel_path.name}")

    return df_out


if __name__ == "__main__":
    extract_and_transform_brazil_data()
