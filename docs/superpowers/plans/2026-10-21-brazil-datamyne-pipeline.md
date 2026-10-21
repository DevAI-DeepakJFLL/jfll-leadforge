# Brazil DataMyne Dataset Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate the DataMyne data engineering pipeline on the newly added Brazil dataset (`Backend/data/brazil`), extracting and standardizing 1,524 Indian corridor companies and 1,322 Brazilian enterprises (81 with enriched corporate contacts), updating Parquet/JSON data artifacts, and expanding the frontend to support Brazil operational hubs and trade corridors without committing or pushing to Git.

**Architecture:** A standalone Python data engineering script (`Backend/src/etl/brazil_datamyne_etl.py`) processes raw customs manifests (`Datamyne_Brazil_All.xlsx` and `BRA_CON_JAN25_FEB26.xlsx`) and contact enrichment sheets (`Sheet2` and `Brazil_Data_12082026.xlsx`), applying active-customer deduplication, HS code chapter classification, and contact readiness segmentation. The pipeline outputs standardized ZSTD-compressed Parquet files, regenerates the unified leads dataset (`datamyne_leads_zstd.parquet`), updates the frontend data bundle (`Frontend/public/data/datamyne_leads.json`), and adapts the Datamyne UI filter sidebar to display Brazilian cities and trade corridors.

**Tech Stack:** Python 3.11, OpenPyXL, Pandas, PyArrow, DuckDB, TypeScript, React, Tailwind CSS, Pytest, Vitest.

**Spec:** User task instructions: Process Brazil DataMyne dataset, replicate existing preparation/modification process, test locally first, and strictly do NOT commit or push to Git.

## Global Constraints

- **STRICT ZERO-COMMIT/PUSH RULE:** Under NO circumstances run `git commit` or `git push`. The application is live in production.
- **DATA INTEGRITY & ISOLATION:** All existing Indian DataMyne leads (37,312 records) and Active Customer exclusions must be preserved without corruption.
- **STANDARDIZED TAXONOMY:** Follow the established 8 logistics categories and subcategories defined in `CHAPTER_MAP` (Perishables, Pharma & Healthcare, Textiles & Apparel, Engineering & Machinery, Chemicals & Materials, Electronics & Electrical, Automotive & EV, General Cargo).
- **CONTACT READINESS CONVENTION:** Leads with verified phone OR email are segmented as `valid` ("With Contacts"); leads lacking both are classified as `missing` ("Without Contacts").
- **LOCAL TESTING FIRST:** All validations must run on local server instances (`http://localhost:8000` and `http://localhost:5173`) before any deployment.

---

### Task 1: Brazil Data Ingestion, Normalization & Enrichment ETL

**Files:**
- Create: `Backend/src/etl/brazil_datamyne_etl.py`
- Test: `Backend/tests/test_brazil_etl.py`

**Interfaces:**
- Consumes:
  - `Backend/data/brazil/Datamyne_Brazil_All.xlsx` (Sheet `DATA`: 12,357 import shipments)
  - `Backend/data/brazil/BRA_CON_JAN25_FEB26.xlsx` (Sheet `DATA`: 8,349 export shipments; Sheet `Sheet2`: 66 curated Brazil companies)
  - `Backend/data/brazil/Brazil_Data_12082026.xlsx` (Sheet `Sheet1`: 15 Brazil target enterprises)
  - `Backend/data/processed/active_customers_leads.csv` (Active customer exclusion list)
- Produces:
  - `Backend/data/brazil/processed/datamyne_brazil_leads_zstd.parquet`
  - `Backend/data/brazil/processed/Master_Cleaned_Brazil_Contacts_Directory.xlsx`
  - Returns `pd.DataFrame` containing standardized columns: `id`, `company_name`, `country`, `role`, `transport_mode`, `category`, `subcategory`, `contact_type`, `phone`, `email`, `tax_id`, `city`, `address`, `pin_code`, `directors`, `trade_lanes`, `top_hs_codes`, `total_shipments`, `total_value_usd`, `latest_activity_date`, `dataset_type`.

- [ ] **Step 1: Write the failing test**

```python
# Backend/tests/test_brazil_etl.py
import pytest
import pandas as pd
from pathlib import Path
from src.etl.brazil_datamyne_etl import extract_and_transform_brazil_data

def test_extract_and_transform_brazil_data():
    df = extract_and_transform_brazil_data()
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 500  # Expect over 2,000 unified Brazil-related leads
    
    # Check expected schema columns
    expected_cols = [
        "id", "company_name", "country", "role", "transport_mode",
        "category", "subcategory", "contact_type", "phone", "email",
        "tax_id", "city", "address", "pin_code", "directors",
        "trade_lanes", "top_hs_codes", "total_shipments", "total_value_usd",
        "latest_activity_date", "dataset_type"
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column: {col}"
        
    # Check country distribution
    countries = set(df["country"].unique())
    assert "Brazil" in countries
    assert "India" in countries
    
    # Check valid contact classification
    valid_leads = df[df["dataset_type"] == "valid"]
    assert len(valid_leads) > 0
    for _, row in valid_leads.iterrows():
        assert bool(row["phone"]) or bool(row["email"]), f"Valid lead {row['company_name']} has no phone or email"
        
    # Check category distribution adheres to standard taxonomy
    valid_categories = {
        "Perishables", "Pharma & Healthcare", "Textiles & Apparel",
        "Engineering & Machinery", "Chemicals & Materials",
        "Electronics & Electrical", "Automotive & EV", "General Cargo"
    }
    for cat in df["category"].unique():
        assert cat in valid_categories, f"Invalid category: {cat}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/deepak/.gemini/antigravity-cli/brain/89badbe2-0b7a-449a-ae32-01d520b4a325/scratch/venv/bin/python -m pytest Backend/tests/test_brazil_etl.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.etl.brazil_datamyne_etl'`

- [ ] **Step 3: Implement `Backend/src/etl/brazil_datamyne_etl.py`**

```python
"""
ETL Pipeline for DataMyne Brazil Dataset.
Consolidates Brazil-India import/export manifests and curated Brazil contacts into
standardized logistics leads with active-customer exclusion and HS code categorization.
"""

import os
import re
import csv
import time
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
    "94": ("General Cargo", "Furniture, Bedding & Lighting")
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

def load_active_customers(base_dir: Path) -> set[str]:
    active_path = base_dir / "Backend" / "data" / "processed" / "active_customers_leads.csv"
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
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    brazil_dir = base_dir / "Backend" / "data" / "brazil"
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
            df15 = pd.DataFrame(r15[1:], columns=r15[0]).dropna(subset=["Company "])
            for _, r in df15.iterrows():
                c_name = str(r["Company "]).strip()
                b15_map[norm_name(c_name)] = {
                    "company_name": c_name,
                    "phone": clean_phone(r.get("Phone / WhatsApp")),
                    "email": clean_phone(r.get("Email")),
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
                        "email": clean_phone(r.get("E-mail ID")),
                        "website": str(r.get("Website", "")).strip(),
                        "city": city,
                        "address": addr,
                        "pin_code": cep,
                        "directors": f"{r.get('Contact person', '')} ({r.get('Designation', '')})".strip()
                    }

    # Entity Storage
    companies = {}

    def get_or_create_company(c_name: str, country: str, role: str):
        nn = norm_name(c_name)
        if not nn or nn in ["NOTDECLARED", "NOTAVAILABLE", "TOTHEORDER", "TOTHEORDEROF"]:
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
                "latest_activity_date": "2024-01-01"
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
                    except:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > ent["latest_activity_date"]:
                        ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        ent["hs_codes"][hs] += 1
                    p = clean_phone(r.get("Importer Phone"))
                    if p: ent["phones"].add(p)
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
                    except:
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
                # A. Indian Exporter
                c_name = str(r.get("Exporter", "")).strip()
                ent = get_or_create_company(c_name, "India", "Exporter")
                if ent:
                    ent["modes"].add("Air")
                    ent["trade_lanes"].add("India-Brazil/Air")
                    ent["total_shipments"] += 1
                    try:
                        ent["total_value_usd"] += float(r.get("FOB Value (USD)", 0) or 0)
                    except:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > ent["latest_activity_date"]:
                        ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        ent["hs_codes"][hs] += 1
                    p = clean_phone(r.get("Exporter Phone"))
                    if p: ent["phones"].add(p)
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
                    except:
                        pass
                    dt = str(r.get("Date", ""))[:10]
                    if dt and dt > buy_ent["latest_activity_date"]:
                        buy_ent["latest_activity_date"] = dt
                    hs = str(r.get("HS Code", "")).strip()
                    if hs:
                        buy_ent["hs_codes"][hs] += 1
                    if not buy_ent["address"] and r.get("Foreign Buyer Declared"):
                        buy_ent["address"] = str(r.get("Foreign Buyer Declared")).strip()

    # 5. Enrich Brazilian Entities with Curated Contact Dossiers
    for nn, ent in companies.items():
        if ent["country"] == "Brazil":
            # Match against curated contacts from Sheet2 or 15 Target Companies
            curated = bcon_map.get(nn) or b15_map.get(nn)
            if not curated:
                # Substring matching for fuzzy match
                for k, v in {**bcon_map, **b15_map}.items():
                    if k in nn or nn in k:
                        curated = v
                        break
            if curated:
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

    # 6. Format Standardized Leads
    formatted_records = []
    lead_idx = 1
    for nn, c in sorted(companies.items(), key=lambda x: x[1]["total_value_usd"], reverse=True):
        # Role
        role = "Both" if len(c["roles"]) > 1 else list(c["roles"])[0]
        
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

        # Contact Type
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
            # infer from address
            m = re.search(r"\b(São Paulo|Rio de Janeiro|Guarulhos|Curitiba|Santos|Hortolândia|Sumaré|Sorocaba|Belo Horizonte|Porto Alegre)\b", c["address"], re.IGNORECASE)
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
            "dataset_type": dataset_type
        })
        lead_idx += 1

    df_out = pd.DataFrame(formatted_records)

    # Save to Parquet
    parquet_path = output_dir / "datamyne_brazil_leads_zstd.parquet"
    df_out.to_parquet(parquet_path, engine="pyarrow", compression="zstd", index=False)
    print(f"Exported {len(df_out):,} Brazil leads to {parquet_path.name}")

    return df_out

if __name__ == "__main__":
    extract_and_transform_brazil_data()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `/Users/deepak/.gemini/antigravity-cli/brain/89badbe2-0b7a-449a-ae32-01d520b4a325/scratch/venv/bin/python -m pytest Backend/tests/test_brazil_etl.py -v`
Expected: PASS

- [ ] **Step 5: Verification check (Zero Commit/Push)**

Verify test passes cleanly and Parquet artifact is written to `Backend/data/brazil/processed/datamyne_brazil_leads_zstd.parquet`. Confirm working tree is NOT committed.

---

### Task 2: Backend Parquet Integration & Unified Lead Catalog

**Files:**
- Modify: `Backend/src/api/config.py:60-70`
- Test: `Backend/tests/test_brazil_parquet_config.py`

**Interfaces:**
- Consumes: `Backend/data/brazil/processed/datamyne_brazil_leads_zstd.parquet`
- Produces: `DATASET_FILES["datamyne_brazil"] = "datamyne_brazil_leads_zstd.parquet"` and updated unified `datamyne_leads_zstd.parquet` with Brazil leads merged in.

- [ ] **Step 1: Write the failing test**

```python
# Backend/tests/test_brazil_parquet_config.py
from src.api.config import settings
from src.api.database import get_db_connection

def test_brazil_parquet_registration():
    assert "datamyne_brazil" in settings.DATASET_FILES
    assert settings.DATASET_FILES["datamyne_brazil"] == "datamyne_brazil_leads_zstd.parquet"

def test_unified_datamyne_leads_contains_brazil():
    con = get_db_connection()
    res = con.execute("SELECT count(*) FROM 'Backend/data/processed/datamyne_leads_zstd.parquet' WHERE country = 'Brazil'").fetchone()[0]
    assert res > 0, "Expected Brazil leads in unified datamyne parquet"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `/Users/deepak/.gemini/antigravity-cli/brain/89badbe2-0b7a-449a-ae32-01d520b4a325/scratch/venv/bin/python -m pytest Backend/tests/test_brazil_parquet_config.py -v`
Expected: FAIL (`AssertionError: 'datamyne_brazil' not in settings.DATASET_FILES`)

- [ ] **Step 3: Update `Backend/src/api/config.py` & Merge into Unified Parquet**

Update `Backend/src/api/config.py`:
```python
    DATASET_FILES: ClassVar[dict[str, str]] = {
        "active": "active_customers_leads_zstd.parquet",
        "inactive": "inactive_customers_leads_zstd.parquet",
        "datamyne": "datamyne_leads_zstd.parquet",
        "datamyne_valid": "datamyne_valid_leads_zstd.parquet",
        "datamyne_missing": "datamyne_missing_leads_zstd.parquet",
        "datamyne_tiers": "datamyne_tier_segments_zstd.parquet",
        "datamyne_brazil": "datamyne_brazil_leads_zstd.parquet",
        "apollo": "apollo_freight_leads_zstd.parquet",
        "apollo_contacts_profile": "apollo_freight_contacts_with_company_profile.parquet",
        "apollo_contacts_unprofiled": "apollo_freight_contacts_without_company_profile.parquet",
    }
```
Run ETL merge script to append Brazil leads to `Backend/data/processed/datamyne_leads_zstd.parquet` (ensuring `country` column exists across all rows: "India" for existing records, "Brazil" or "India" for Brazil corridor records).

- [ ] **Step 4: Run test to verify it passes**

Run: `/Users/deepak/.gemini/antigravity-cli/brain/89badbe2-0b7a-449a-ae32-01d520b4a325/scratch/venv/bin/python -m pytest Backend/tests/test_brazil_parquet_config.py -v`
Expected: PASS

- [ ] **Step 5: Verification check (Zero Commit/Push)**

Verify all existing backend tests pass:
Run: `/Users/deepak/.gemini/antigravity-cli/brain/89badbe2-0b7a-449a-ae32-01d520b4a325/scratch/venv/bin/python -m pytest Backend/tests/test_api.py -v`
Expected: 54/54 PASS. Confirm no git commit.

---

### Task 3: Frontend Data & Service Integration for Brazil Leads

**Files:**
- Modify: `Frontend/src/types/datamyneLead.ts`
- Modify: `Frontend/src/services/datamyneService.ts`
- Output: `Frontend/public/data/datamyne_leads.json` (regenerated with Brazil leads)
- Test: `Frontend/src/test/datamyne_brazil.test.ts`

**Interfaces:**
- Consumes: `Frontend/public/data/datamyne_leads.json`
- Produces: `DatamyneFilterParams` supporting `countries?: string[]` and querying Brazil records.

- [ ] **Step 1: Write the failing test**

```typescript
// Frontend/src/test/datamyne_brazil.test.ts
import { describe, it, expect } from 'vitest';
import { queryDatamyneLeads } from '@/services/datamyneService';

describe('DataMyne Brazil Dataset Integration', () => {
  it('filters leads by country Brazil', () => {
    const res = queryDatamyneLeads({ countries: ['Brazil'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((d) => d.country === 'Brazil')).toBe(true);
  });

  it('filters leads by Brazilian cities', () => {
    const res = queryDatamyneLeads({ cities: ['SÃO PAULO'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.some((d) => d.city.toUpperCase().includes('SÃO PAULO'))).toBe(true);
  });

  it('filters leads by Brazil trade lanes', () => {
    const res = queryDatamyneLeads({ tradeLanes: ['India-Brazil/Air'] });
    expect(res.items.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Frontend && npm test src/test/datamyne_brazil.test.ts`
Expected: FAIL (`countries` property not recognized or 0 Brazil leads returned).

- [ ] **Step 3: Update `datamyneLead.ts`, `datamyneService.ts`, and regenerate `datamyne_leads.json`**

1. In `Frontend/src/types/datamyneLead.ts`:
   - Add `country: z.string().default('India')` to `DatamyneLeadSchema`.
   - Add `countries?: string[]` to `DatamyneFilterParams`.
2. In `Frontend/src/services/datamyneService.ts`:
   - Add country filtering:
     ```typescript
     if (countries && countries.length > 0) {
       filtered = filtered.filter((d) => countries.includes(d.country || 'India'));
     }
     ```
3. Run python export script to rebuild `Frontend/public/data/datamyne_leads.json` including the new Brazil leads.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Frontend && npm test src/test/datamyne_brazil.test.ts`
Expected: PASS

- [ ] **Step 5: Verification check (Zero Commit/Push)**

Verify all 148 frontend vitest tests pass: `npm run test:run`. Confirm no git commit.

---

### Task 4: UI Filters for Region & Brazil Operational Hubs

**Files:**
- Modify: `Frontend/src/components/datamyne/DatamyneFilterSidebar.tsx:135-155`
- Modify: `Frontend/src/components/datamyne/DatamyneActiveFilterChips.tsx`
- Test: `Frontend/src/test/datamyne_sidebar.test.tsx`

**Interfaces:**
- Consumes: `DatamyneFilterSidebarProps`
- Produces: UI filters for Region/Country (`All`, `India`, `Brazil`), Brazilian cities (`SÃO PAULO`, `GUARULHOS`, `RIO DE JANEIRO`, `CURITIBA`, `SOROCABA`, `SUMARÉ`, `SANTOS`), and Brazil trade corridors (`India-Brazil/Air`, `Brazil-India/Ocean`, `Brazil-India/Air`).

- [ ] **Step 1: Write the failing test**

```typescript
// Frontend/src/test/datamyne_sidebar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatamyneFilterSidebar } from '@/components/datamyne/DatamyneFilterSidebar';

describe('DatamyneFilterSidebar Brazil Filters', () => {
  it('displays Brazil regional and city options in the sidebar', () => {
    render(
      <DatamyneFilterSidebar
        filters={{}}
        setSearch={vi.fn()}
        setDataset={vi.fn()}
        toggleTransportMode={vi.fn()}
        toggleCategory={vi.fn()}
        toggleSubcategory={vi.fn()}
        toggleRole={vi.fn()}
        toggleCity={vi.fn()}
        toggleTradeLane={vi.fn()}
        toggleContactStatus={vi.fn()}
        toggleHasDirectors={vi.fn()}
        setMinShipments={vi.fn()}
        setMinTradedValueUsd={vi.fn()}
        clearAllFilters={vi.fn()}
        activeFilterCount={0}
      />
    );
    // Should render Brazilian cities in Operational Hub accordion
    expect(screen.getByText(/SÃO PAULO/i)).toBeInTheDocument();
    expect(screen.getByText(/GUARULHOS/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd Frontend && npm test src/test/datamyne_sidebar.test.tsx`
Expected: FAIL (`Unable to find element with text /SÃO PAULO/i`)

- [ ] **Step 3: Update `DatamyneFilterSidebar.tsx` and `DatamyneActiveFilterChips.tsx`**

In `Frontend/src/components/datamyne/DatamyneFilterSidebar.tsx`:
Add Brazilian cities to `topCities`:
```typescript
  const topCities = [
    'MUMBAI',
    'NEW DELHI',
    'BENGALURU',
    'CHENNAI',
    'PUNE',
    'AHMEDABAD',
    'KOLKATA',
    'HYDERABAD',
    'SURAT',
    'JAIPUR',
    // Brazil Operational Hubs
    'SÃO PAULO',
    'GUARULHOS',
    'RIO DE JANEIRO',
    'CURITIBA',
    'SOROCABA',
    'SUMARÉ',
    'SANTOS',
  ];
```
Add Brazil trade corridors to `corridorsList`:
```typescript
  const corridorsList = [
    { id: 'PER/AIR', label: 'PER/AIR (Perishables Air)' },
    { id: 'GCR/Air', label: 'GCR/Air (General Cargo Air)' },
    { id: 'EX-China_INDIA', label: 'EX-China_INDIA (China Imports)' },
    { id: 'India-Brazil/Air', label: 'India-Brazil (Air Export)' },
    { id: 'Brazil-India/Air', label: 'Brazil-India (Air Import)' },
    { id: 'Brazil-India/Ocean', label: 'Brazil-India (Ocean Import)' },
  ];
```
Add Region toggle/filter for `All`, `India`, and `Brazil`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd Frontend && npm test src/test/datamyne_sidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Verification check (Zero Commit/Push)**

Verify frontend builds without errors: `npm run build`. Confirm no git commit.

---

### Task 5: End-to-End Local Validation & Production Live Guardrails

**Files:**
- Test: All Backend Pytest & Frontend Vitest test files.

**Interfaces:**
- Consumes: Running Backend on `localhost:8000` and Frontend on `localhost:5173`.
- Produces: Verified local experience displaying Brazil leads, filters, and drawer details.

- [ ] **Step 1: Execute full test suites**

Backend:
Run: `/Users/deepak/.gemini/antigravity-cli/brain/89badbe2-0b7a-449a-ae32-01d520b4a325/scratch/venv/bin/python -m pytest Backend/tests/ -v`
Expected: ALL PASS.

Frontend:
Run: `cd Frontend && npm run test:run`
Expected: ALL PASS.

Frontend Production Build:
Run: `cd Frontend && npm run build`
Expected: 0 errors, successful bundle generation.

- [ ] **Step 2: Live Local UI Smoke Test**

Start local dev server and test:
1. Navigate to DataMyne tab.
2. Select "SÃO PAULO" in Operational Hub filter -> Brazilian enterprise leads appear.
3. Select "India-Brazil (Air Export)" in Trade Corridors -> Indian exporters and Brazilian buyers appear.
4. Click a lead row -> Drawer opens with full contact info, Brazilian address/CEP, and shipments.

- [ ] **Step 3: Verify Zero Git Commit / Git Push**

Run: `git status`
Expected: Branch `main`, modified files present in working directory, 0 commits made, 0 pushes.

---
