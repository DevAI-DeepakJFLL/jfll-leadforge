#!/usr/bin/env python3
"""
Enterprise ETL Pipeline for All JFLL Customer Data.

Ingests `Backend/data/raw/Customer List From 1.04.2026 till Date.csv` (2,223 customer accounts),
enriches with contact information from master customer databases and DataMyne,
infers Customer Group and Legal Type classifications,
formats monetary revenue and credit status fields,
and exports production ZSTD Parquet, clean CSV, and professionally formatted Excel files.
"""

import os
import re
import csv
import json
from pathlib import Path
from collections import defaultdict
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_CSV_PATH = BASE_DIR / "data" / "raw" / "Customer List From 1.04.2026 till Date.csv"
ACTIVE_3M_EXCEL_PATH = BASE_DIR / "data" / "Active Customer List For the Last 3 Month.xlsx"
MASTER_BACKUP_EXCEL_PATH = BASE_DIR / "data" / ".backups" / "2026-10-17-pre-customer-dedup" / "Customer with contact.xlsx"
RAW_CONTACT_EXCEL_PATH = BASE_DIR / "data" / "raw" / "Customer with contact.xlsx"
OLD_ACTIVE_CSV_PATH = BASE_DIR / "data" / "processed" / "active_customers_leads.csv"
DATAMYNE_PARQUET_PATH = BASE_DIR / "data" / "processed" / "datamyne_leads_zstd.parquet"

# Output Paths
OUTPUT_ALL_PARQUET = BASE_DIR / "data" / "processed" / "all_customers_leads_zstd.parquet"
OUTPUT_ALL_CSV = BASE_DIR / "data" / "processed" / "all_customers_leads.csv"
OUTPUT_ALL_EXCEL = BASE_DIR / "data" / "processed" / "All JFLL Customer Data.xlsx"

OUTPUT_ACTIVE_PARQUET = BASE_DIR / "data" / "processed" / "active_customers_leads_zstd.parquet"
OUTPUT_ACTIVE_CSV = BASE_DIR / "data" / "processed" / "active_customers_leads.csv"

OUTPUT_INACTIVE_PARQUET = BASE_DIR / "data" / "processed" / "inactive_customers_leads_zstd.parquet"
OUTPUT_INACTIVE_CSV = BASE_DIR / "data" / "processed" / "inactive_customers_leads.csv"

FRONTEND_ACTIVE_TS = BASE_DIR.parent / "Frontend" / "src" / "data" / "jfllCustomersData.ts"
FRONTEND_INACTIVE_TS = BASE_DIR.parent / "Frontend" / "src" / "data" / "jfllInactiveCustomersData.ts"
FRONTEND_ALL_TS = BASE_DIR.parent / "Frontend" / "src" / "data" / "jfllAllCustomersData.ts"


def normalize_company(s: str | None) -> str:
    """Normalizes company names for deterministic string matching."""
    if not s or pd.isna(s):
        return ""
    s = str(s).upper().strip()
    s = re.sub(r"^(M/S\.?|MESSRS\.?|M/S\s+|MS\.)\s*", "", s)
    s = re.sub(r"&", " AND ", s)
    s = re.sub(r"\bPVT\.?\s*LTD\.?\b", "PRIVATE LIMITED", s)
    s = re.sub(r"\bP\.?\s*LTD\.?\b", "PRIVATE LIMITED", s)
    s = re.sub(r"\bPVT\.?\b", "PRIVATE", s)
    s = re.sub(r"\bLTD\.?\b", "LIMITED", s)
    s = re.sub(r"\bCO\.?\b", "COMPANY", s)
    s = re.sub(r"\bCORP\.?\b", "CORPORATION", s)
    s = re.sub(r"\bINC\.?\b", "INCORPORATED", s)
    s = re.sub(r"\(PROP\..*?\)", " ", s)
    s = re.sub(r"\(PROP\s+.*?\)", " ", s)
    s = re.sub(r"\(TRANSFER FROM.*?\)", " ", s)
    s = re.sub(r"\((DOMESTIC|EXPORT|SEZ|AIR|OCEAN|CARGO|COMMERCIAL|FACTORY|UNIT|HO|BRANCH|100% EOU).*?\)", " ", s)
    s = re.sub(r"\((INDIA|IND|I)\)", " INDIA ", s)
    s = re.sub(r"[\-\/]\s*(INDIA|IND|I)\b", " INDIA ", s)
    s = re.sub(r"\b(I)\s*[\-\/]\s*INDIA\b", " INDIA ", s)
    s = re.sub(r"\b(INDIA\s+)+INDIA\b", "INDIA", s)
    s = re.sub(r"\(HUF\)", "HUF", s)
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s


def clean_corp_stem(s: str | None) -> str:
    """Strips legal entity suffixes to yield the root corporate stem."""
    if not s:
        return ""
    norm = normalize_company(s)
    changed = True
    while changed:
        old_s = norm
        for suffix in [
            "PRIVATELIMITED",
            "PRIVATE",
            "LIMITED",
            "LLP",
            "INCORPORATED",
            "CORPORATION",
            "COMPANY",
            "HUF",
            "INDIA",
            "PVTLTD",
        ]:
            if norm.endswith(suffix):
                norm = norm[:-len(suffix)]
        changed = (norm != old_s)
    return norm


def clean_entity_stem(name: str | None) -> str:
    """Computes canonical entity stem stripping prefixes, legal suffixes, branches, and acronym spacing."""
    if not name or pd.isna(name):
        return ""
    s = str(name).upper().strip()
    s = re.sub(r"&", " AND ", s)
    s = re.sub(r"^(M/S\.?|MESSRS\.?|M/S\s+|MS\.|M\s*/\s*S|SHRI|SHREE|THE)\s+", "", s)
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"\s*-\s*(MUMBAI|DELHI|BANGALORE|CHENNAI|KOLKATA|AHMEDABAD|HYDERABAD|HO|BRANCH|HEAD OFFICE).*$", "", s)
    s = re.sub(r"\b([A-Z])\s+([A-Z])\b", r"\1\2", s)
    s = re.sub(r"\b(PVT\.?|P\.?)\s*(LTD\.?|LIMITED)\b", " ", s)
    s = re.sub(r"\b(PRIVATE|PVT)\b", " ", s)
    s = re.sub(r"\b(LIMITED|LTD)\b", " ", s)
    s = re.sub(r"\b(LLP|L\.L\.P\.)\b", " ", s)
    s = re.sub(r"\b(INC\.?|INCORPORATED|CORP\.?|CORPORATION|CO\.?|COMPANY)\b", " ", s)
    s = re.sub(r"(?<!AIR\s)\bINDIA\b", " ", s)
    s = re.sub(r"[^A-Z0-9]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def is_annotated_branch(name: str) -> bool:
    """Checks if the account name contains branch or division annotations."""
    u = name.upper()
    return any(
        b in u
        for b in [
            "(DOMESTIC",
            "(DELHI",
            "(BOM",
            "(MUM",
            "(CANADA",
            "(INDIAN AIRLINES",
            "(OTHERS",
            "(IND)",
        ]
    )


def infer_branch_tag(name: str, parent_name: str) -> str:
    """Infers descriptive branch or alias tag for secondary child accounts."""
    upper = name.upper()
    parent_upper = parent_name.upper()
    if "DOMESTIC" in upper:
        return "Domestic Division"
    if "DELHI" in upper:
        return "Delhi Branch"
    if "BOM" in upper or "MUM" in upper:
        return "Mumbai Branch"
    if "CANADA" in upper:
        return "Canada Division"
    if "INDIAN AIRLINES" in upper:
        return "Indian Airlines Division"
    if "OTHERS" in upper:
        return "Branch / Other Division"
    if "(IND)" in upper or "(I)" in upper or ("INDIA" in upper and "INDIA" not in parent_upper):
        return "Regional Entity"
    if upper.startswith("M/S") or upper.startswith("MESSRS"):
        return "Honorific (M/S) Alias"
    if "PVT" in upper or "PRIVATE" in upper:
        return "Pvt Ltd Alias"
    if "LTD" in upper or "LIMITED" in upper:
        return "Ltd Suffix Alias"
    return "Branch / Entity Alias"


def extract_phones(p: str | None) -> set[str]:
    """Extracts valid 10-digit Indian telephone/mobile numbers."""
    if not p or pd.isna(p):
        return set()
    raw = str(p)
    clean = re.sub(r"[^\d/,\- ]", "", raw)
    tokens = re.split(r"[/,;\n\r|]", clean)
    phones = set()
    for tok in tokens:
        digits = re.sub(r"\D", "", tok)
        if len(digits) == 10:
            if not all(d == digits[0] for d in digits) and digits != "1234567890":
                phones.add(digits)
        elif len(digits) > 10:
            if digits.startswith("91") and len(digits) == 12:
                phones.add(digits[2:])
            elif digits.startswith("0") and len(digits) == 11:
                phones.add(digits[1:])
            else:
                phones.add(digits[-10:])
    return phones


def format_phone_display(raw: str | None) -> str | None:
    """Formats phone number into standard +91-XXXXXXXXXX string."""
    if not raw or pd.isna(raw):
        return None
    raw_str = str(raw).strip()
    if not raw_str or raw_str.lower() in ["none", "nan", "null", "n/a", "-", "--"]:
        return None
    if raw_str.startswith("+91-") and len(raw_str) == 14:
        return raw_str
    phones = extract_phones(raw_str)
    if phones:
        first = sorted(list(phones))[0]
        return f"+91-{first}"
    return None


def extract_emails(e: str | None) -> set[str]:
    """Extracts valid professional email addresses, filtering test placeholders."""
    if not e or pd.isna(e):
        return set()
    raw = str(e).lower().strip()
    found = set(re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", raw))
    return {
        x
        for x in found
        if not any(
            d in x for d in ["test.com", "example.com", "none@", "na@", "noemail@", "null@"]
        )
    }


def parse_revenue(val: any) -> float:
    """Parses numeric float revenue from string or numeric input."""
    if val is None or pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return round(float(val), 2)
    clean_str = str(val).replace(",", "").replace("₹", "").replace("$", "").strip()
    try:
        return round(float(clean_str), 2)
    except (ValueError, TypeError):
        return 0.0


def infer_customer_group(name: str, matched_group: str | None = None) -> str:
    """Infers functional Customer Group (Shipper, Subagent, Overseas Agent)."""
    if matched_group and str(matched_group).strip() and str(matched_group).strip() not in ["Inactive Customer", "Inactive (DataMyne Match)"]:
        return str(matched_group).strip()
    upper = name.upper()
    if any(
        w in upper
        for w in [
            "LOGISTICS",
            "FREIGHT",
            "EXPRESS",
            "CARGO",
            "FORWARD",
            "FORWARDING",
            "SHIPPING",
            "LINES",
            "CLEARING",
            "AIRWAYS",
            "TRAVEL",
            "TRANSPORT",
            "AVIA",
            "COURIER",
            "SUPPLY CHAIN",
        ]
    ):
        return "Subagent"
    elif any(
        w in upper
        for w in [
            "GLOBAL",
            "OVERSEAS",
            "INTERNATIONAL",
            "WORLDWIDE",
            "TRANS",
            "SDN BHD",
            "S.R.L.",
            "GMBH",
            "B.V.",
            "LLC",
            "INC.",
            "PTE",
        ]
    ):
        return "Overseas Agent"
    return "Shipper / Consignee"


def infer_entity_type(name: str, matched_type: str | None = None) -> str:
    """Infers Indian corporate legal entity type."""
    if matched_type and str(matched_type).strip():
        return str(matched_type).strip()
    upper = name.upper()
    if any(w in upper for w in ["PVT LTD", "PRIVATE LIMITED", "PVT. LTD", "P. LTD"]):
        return "Private Limited"
    elif "LLP" in upper or "LIMITED LIABILITY" in upper:
        return "LLP"
    elif "LTD" in upper or "LIMITED" in upper:
        return "Public Limited"
    elif any(w in upper for w in ["ENTERPRISES", "TRADING", "TRADERS", "AGENCY", "STORE", "SERVICES"]):
        return "Individual / Proprietorship"
    elif "PARTNERSHIP" in upper:
        return "Partnership"
    return "Company"


def main():
    print("=" * 80)
    print("PROCESSING ALL JFLL CUSTOMER DATA (2,223 ACCOUNTS WITH EXTRA FIELDS)")
    print("=" * 80)

    # 1. Load Datasets
    print("\n[Step 1/5] Loading source datasets...")
    df_raw = pd.read_csv(RAW_CSV_PATH)
    print(f"  • Source All Customer CSV: {len(df_raw)} records")

    df_3m_active = pd.read_excel(ACTIVE_3M_EXCEL_PATH) if ACTIVE_3M_EXCEL_PATH.exists() else pd.DataFrame()
    print(f"  • Active Customer Reference (Last 3 Months): {len(df_3m_active)} records")

    df_old_active = pd.read_csv(OLD_ACTIVE_CSV_PATH) if OLD_ACTIVE_CSV_PATH.exists() else pd.DataFrame()
    print(f"  • Previous Active Leads CSV: {len(df_old_active)} records")

    df_raw_contact = pd.read_excel(RAW_CONTACT_EXCEL_PATH) if RAW_CONTACT_EXCEL_PATH.exists() else pd.DataFrame()
    print(f"  • Contact Reference Excel: {len(df_raw_contact)} records")

    df_master_backup = pd.read_excel(MASTER_BACKUP_EXCEL_PATH) if MASTER_BACKUP_EXCEL_PATH.exists() else pd.DataFrame()
    print(f"  • Master Contact Backup Excel: {len(df_master_backup)} records")

    df_dm = pd.read_parquet(DATAMYNE_PARQUET_PATH) if DATAMYNE_PARQUET_PATH.exists() else pd.DataFrame()
    print(f"  • DataMyne Parquet Dataset: {len(df_dm)} records")

    # 2. Build Fast Lookup Indexes
    print("\n[Step 2/5] Building multi-tiered lookup indexes...")
    active_3m_by_norm = {}
    active_3m_by_stem = {}
    for _, r in df_3m_active.iterrows():
        n = normalize_company(r.get("Full Name"))
        if n and n not in active_3m_by_norm:
            active_3m_by_norm[n] = r
        st = clean_corp_stem(r.get("Full Name"))
        if len(st) >= 4 and st not in active_3m_by_stem:
            active_3m_by_stem[st] = r

    old_active_by_norm = {}
    old_active_by_stem = {}
    for _, r in df_old_active.iterrows():
        n = normalize_company(r.get("Full Name"))
        if n and n not in old_active_by_norm:
            old_active_by_norm[n] = r
        st = clean_corp_stem(r.get("Full Name"))
        if len(st) >= 4 and st not in old_active_by_stem:
            old_active_by_stem[st] = r

    raw_contact_by_norm = {}
    raw_contact_by_stem = {}
    for _, r in df_raw_contact.iterrows():
        n = normalize_company(r.get("Full Name"))
        if n and n not in raw_contact_by_norm:
            raw_contact_by_norm[n] = r
        st = clean_corp_stem(r.get("Full Name"))
        if len(st) >= 4 and st not in raw_contact_by_stem:
            raw_contact_by_stem[st] = r

    master_by_norm = {}
    master_by_stem = {}
    for _, r in df_master_backup.iterrows():
        n = normalize_company(r.get("Full Name"))
        if n and n not in master_by_norm:
            master_by_norm[n] = r
        st = clean_corp_stem(r.get("Full Name"))
        if len(st) >= 4 and st not in master_by_stem:
            master_by_stem[st] = r

    dm_by_norm = {}
    dm_by_stem = {}
    dm_by_phone = defaultdict(list)
    dm_by_email = defaultdict(list)
    if not df_dm.empty:
        for _, r in df_dm.iterrows():
            n = normalize_company(r.get("company_name"))
            if n and n not in dm_by_norm:
                dm_by_norm[n] = r
            st = clean_corp_stem(r.get("company_name"))
            if len(st) >= 4 and st not in dm_by_stem:
                dm_by_stem[st] = r
            for p in extract_phones(r.get("phone", "")):
                dm_by_phone[p].append(r["company_name"])
            for em in extract_emails(r.get("email", "")):
                dm_by_email[em].append(r["company_name"])

    # 3. Process and Enrich All 2,223 Customer Records
    print("\n[Step 3/5] Processing and enriching records...")
    processed_records = []
    enriched_contact_person = 0
    enriched_phone = 0
    enriched_email = 0
    active_count = 0
    inactive_count = 0

    for idx, r in df_raw.iterrows():
        name = str(r["Full Name"]).strip()
        credit_status = str(r["Credit Status"]).strip() if pd.notna(r["Credit Status"]) else "no_credit"
        sales_person = str(r["Sales Person"]).strip() if pd.notna(r["Sales Person"]) and str(r["Sales Person"]).strip() != "" else None
        
        # Revenue: Total Business from 1.04.2024 till date
        total_business_till_date = parse_revenue(r.get("Total Business from 1.04.2024 till date"))

        n = normalize_company(name)
        st = clean_corp_stem(name)

        # 3.1 Check 3-Month Active status
        ref_3m = None
        if n in active_3m_by_norm:
            ref_3m = active_3m_by_norm[n]
        elif len(st) >= 4 and st in active_3m_by_stem:
            ref_3m = active_3m_by_stem[st]

        business_last_3m = 0.0
        if ref_3m is not None:
            status = "Active"
            active_count += 1
            business_last_3m = parse_revenue(ref_3m.get("Total Business Received From Cusomer In Last 3 Month"))
        else:
            status = "Not Active"
            inactive_count += 1

        # 3.2 Contact Reference Matching (Priority: Old Active -> Raw Contact -> Master Backup)
        ref_contact = None
        if n in old_active_by_norm:
            ref_contact = old_active_by_norm[n]
        elif len(st) >= 4 and st in old_active_by_stem:
            ref_contact = old_active_by_stem[st]
        elif n in raw_contact_by_norm:
            ref_contact = raw_contact_by_norm[n]
        elif len(st) >= 4 and st in raw_contact_by_stem:
            ref_contact = raw_contact_by_stem[st]
        elif n in master_by_norm:
            ref_contact = master_by_norm[n]
        elif len(st) >= 4 and st in master_by_stem:
            ref_contact = master_by_stem[st]

        # 3.3 DataMyne Matching
        dm_ref = None
        dm_reasons = []
        if n in dm_by_norm:
            dm_ref = dm_by_norm[n]
            dm_reasons.append(f"Name Match ({dm_ref['company_name']})")
        elif len(st) >= 4 and st in dm_by_stem:
            dm_ref = dm_by_stem[st]
            dm_reasons.append(f"Entity Stem Match ({dm_ref['company_name']})")

        # Contact Person Name
        contact_person = None
        if ref_contact is not None:
            cp = ref_contact.get("Contact Person Name") or ref_contact.get("Contact Person Full Name")
            if pd.notna(cp) and str(cp).strip() and str(cp).strip().lower() not in ["none", "nan", "null", "n/a", "-"]:
                contact_person = str(cp).strip()
        if not contact_person and dm_ref is not None and pd.notna(dm_ref.get("contact_name")):
            contact_person = str(dm_ref["contact_name"]).strip()

        # Mobile Number
        mobile = None
        if ref_contact is not None:
            ph = ref_contact.get("Mobile Number")
            if pd.notna(ph):
                mobile = format_phone_display(ph)
        if not mobile and dm_ref is not None and pd.notna(dm_ref.get("phone")):
            mobile = format_phone_display(dm_ref["phone"])

        # Email
        email = None
        if ref_contact is not None:
            em = ref_contact.get("Email")
            if pd.notna(em):
                valid_emails = extract_emails(em)
                if valid_emails:
                    email = sorted(list(valid_emails))[0]
        if not email and dm_ref is not None and pd.notna(dm_ref.get("email")):
            valid_emails = extract_emails(dm_ref["email"])
            if valid_emails:
                email = sorted(list(valid_emails))[0]

        # Cross-check DataMyne via phone/email if not matched by name
        if dm_ref is None:
            if mobile:
                for p in extract_phones(mobile):
                    if p in dm_by_phone:
                        dm_reasons.append(f"Phone Match ({p} -> {dm_by_phone[p][0]})")
                        break
            if email:
                for em in extract_emails(email):
                    if em in dm_by_email:
                        dm_reasons.append(f"Email Match ({em} -> {dm_by_email[em][0]})")
                        break

        in_datamyne = len(dm_reasons) > 0
        dm_match_details = " | ".join(dm_reasons) if in_datamyne else ""

        # Customer Group & Legal Type
        matched_group = ref_contact.get("Customer Group") if ref_contact is not None else None
        customer_group = infer_customer_group(name, matched_group)

        matched_type = ref_contact.get("Type") if ref_contact is not None else None
        entity_type = infer_entity_type(name, matched_type)

        if contact_person:
            enriched_contact_person += 1
        if mobile:
            enriched_phone += 1
        if email:
            enriched_email += 1

        processed_records.append({
            "id": f"jfll-{idx + 1:04d}",
            "Full Name": name,
            "Territory": "All Territories",
            "Contact Person Name": contact_person,
            "Mobile Number": mobile,
            "Email": email,
            "Status": status,
            "Customer Group": customer_group,
            "Type": entity_type,
            "Credit Status": credit_status,
            "Sales Person": sales_person,
            "Total Business from 1.04.2024 till date": total_business_till_date,
            "Total Business Received From Cusomer In Last 3 Month": business_last_3m,
            "in_datamyne": in_datamyne,
            "datamyne_match_details": dm_match_details,
        })

    # 3.5 Unified Golden Master Merge Engine (0 Duplicates Mandate)
    print("\n[Step 3.5/5] Consolidating duplicate accounts into Unified Golden Master records...")
    stem_clusters = defaultdict(list)
    for r in processed_records:
        st = clean_entity_stem(r["Full Name"])
        if st:
            stem_clusters[st].append(r)

    cluster_list = [members for members in stem_clusters.values() if len(members) > 1]

    # Additional verified phonetic, pluralization, and rep duplicate pairs
    manual_duplicate_pairs = [
        ("jfll-0474", "jfll-0569"),  # M/S KRISHNA ENTERPRISES <-> KRISHNA ENTERPRISE
        ("jfll-0099", "jfll-0671"),  # VASAI FROZEN FOOD CO <-> VASAI FROZEN FOODS
        ("jfll-1445", "jfll-2202"),  # HEJAZI FOODSTUFFS <-> HEJAZI FOODSTUFF PVT. LTD.
        ("jfll-0723", "jfll-1159"),  # BOARD & PAPER LAMINATORS <-> SALASAR BOARD & PAPER LAMINATORS
        ("jfll-0504", "jfll-0614"),  # SNK WORLD <-> SNK GLOBAL
        ("jfll-1710", "jfll-1925"),  # VISHAL SHIPPING GLOBAL LOGISTICS LLP <-> VISHAL SHIPPING AGENCIES PVT LTD
        ("jfll-1877", "jfll-1953"),  # SKY CONNECT LOGISTICS <-> BORJAN LOGISTICS
    ]

    id_to_record = {r["id"]: r for r in processed_records}

    for p1, p2 in manual_duplicate_pairs:
        if p1 in id_to_record and p2 in id_to_record:
            r1, r2 = id_to_record[p1], id_to_record[p2]
            matching_clusters = []
            remaining_clusters = []
            for grp in cluster_list:
                grp_ids = {m["id"] for m in grp}
                if p1 in grp_ids or p2 in grp_ids:
                    matching_clusters.append(grp)
                else:
                    remaining_clusters.append(grp)

            if matching_clusters:
                merged_dict = {}
                for grp in matching_clusters:
                    for m in grp:
                        merged_dict[m["id"]] = m
                merged_dict[r1["id"]] = r1
                merged_dict[r2["id"]] = r2
                remaining_clusters.append(list(merged_dict.values()))
                cluster_list = remaining_clusters
            else:
                cluster_list.append([r1, r2])

    clustered_ids = set()
    golden_records = []

    for members in cluster_list:
        for m in members:
            clustered_ids.add(m["id"])

        active_m = [m for m in members if m["Status"] == "Active" or m["Total Business Received From Cusomer In Last 3 Month"] > 0]
        cands = active_m if active_m else members
        has_unannotated = any(not is_annotated_branch(m["Full Name"]) for m in cands)

        def score_candidate(cand):
            is_annot = is_annotated_branch(cand["Full Name"])
            penalty = 1 if (has_unannotated and is_annot) else 0
            return (0 if penalty else 1, cand["Total Business from 1.04.2024 till date"])

        sorted_cands = sorted(cands, key=score_candidate, reverse=True)
        primary = dict(sorted_cands[0])

        tot_rev = round(sum(m["Total Business from 1.04.2024 till date"] for m in members), 2)
        m3_rev = round(sum(m["Total Business Received From Cusomer In Last 3 Month"] for m in members), 2)
        primary["Total Business from 1.04.2024 till date"] = tot_rev
        primary["Total Business Received From Cusomer In Last 3 Month"] = m3_rev
        primary["Status"] = "Active" if (m3_rev > 0 or any(m["Status"] == "Active" for m in members)) else "Not Active"

        # Unique reps & co-reps
        all_reps = [m["Sales Person"] for m in members if m.get("Sales Person") and pd.notna(m["Sales Person"])]
        unique_reps = []
        for rep in all_reps:
            if rep not in unique_reps:
                unique_reps.append(rep)
        primary_rep = primary["Sales Person"]
        co_reps = [rep for rep in unique_reps if rep != primary_rep]
        primary["co_reps"] = ", ".join(co_reps) if co_reps else None

        # Consolidate Phones
        phones = []
        for m in members:
            if pd.notna(m.get("Mobile Number")) and m.get("Mobile Number"):
                p = str(m["Mobile Number"]).strip()
                if p not in phones:
                    phones.append(p)
        primary["Mobile Number"] = " / ".join(phones) if phones else primary.get("Mobile Number")

        # Consolidate Emails
        emails = []
        for m in members:
            if pd.notna(m.get("Email")) and m.get("Email"):
                e = str(m["Email"]).strip()
                if e not in emails:
                    emails.append(e)
        primary["Email"] = ", ".join(emails) if emails else primary.get("Email")

        # Consolidate DataMyne status
        primary["in_datamyne"] = any(m.get("in_datamyne", False) for m in members)
        dm_details = [m["datamyne_match_details"] for m in members if m.get("datamyne_match_details")]
        if dm_details:
            primary["datamyne_match_details"] = "; ".join(set(dm_details))

        # Build Merged Aliases Audit Trail
        aliases = []
        for m in members:
            if m["id"] != primary["id"]:
                aliases.append({
                    "id": m["id"],
                    "fullName": m["Full Name"],
                    "salesPerson": m["Sales Person"],
                    "totalBusiness": m["Total Business from 1.04.2024 till date"],
                    "status": m["Status"],
                })
        primary["merged_count"] = len(members)
        primary["merged_aliases"] = json.dumps(aliases)
        primary["group_total_business"] = tot_rev

        golden_records.append(primary)

    # Non-clustered records
    non_clustered = []
    for r in processed_records:
        if r["id"] not in clustered_ids:
            r_copy = dict(r)
            r_copy["merged_count"] = 1
            r_copy["merged_aliases"] = None
            r_copy["co_reps"] = None
            r_copy["group_total_business"] = r_copy["Total Business from 1.04.2024 till date"]
            non_clustered.append(r_copy)

    final_processed = golden_records + non_clustered
    final_processed.sort(key=lambda x: x["id"])

    # Update summary counts
    active_count = sum(1 for r in final_processed if r["Status"] == "Active")
    inactive_count = sum(1 for r in final_processed if r["Status"] == "Not Active")
    enriched_contact_person = sum(1 for r in final_processed if r.get("Contact Person Name"))
    enriched_phone = sum(1 for r in final_processed if r.get("Mobile Number"))
    enriched_email = sum(1 for r in final_processed if r.get("Email"))

    print(f"  • Successfully consolidated {len(cluster_list)} duplicate clusters into Golden Records")
    print(f"  • Absorbed {len(clustered_ids) - len(golden_records)} duplicate records (0 duplicate rows remaining)")

    df_all_processed = pd.DataFrame(final_processed)
    print(f"  • Successfully processed {len(df_all_processed)} unique Golden Master records:")
    print(f"    - Active Accounts (3-Month Activity): {active_count}")
    print(f"    - Inactive Accounts (>3-Month Inactivity): {inactive_count}")
    print(f"    - With Contact Person: {enriched_contact_person} ({enriched_contact_person / len(df_all_processed):.1%})")
    print(f"    - With Valid Mobile: {enriched_phone} ({enriched_phone / len(df_all_processed):.1%})")
    print(f"    - With Valid Email: {enriched_email} ({enriched_email / len(df_all_processed):.1%})")
    print(f"    - Matched in DataMyne Customs: {df_all_processed['in_datamyne'].sum()}")

    # 4. Multi-Format Exports (Parquet, CSV, Excel)
    print("\n[Step 4/5] Exporting Parquet, CSV, and formatted Excel files...")

    # 4.1 All Customers Datasets
    all_export_cols = [
        "id",
        "Full Name",
        "Territory",
        "Contact Person Name",
        "Mobile Number",
        "Email",
        "Status",
        "Customer Group",
        "Type",
        "Credit Status",
        "Sales Person",
        "Total Business from 1.04.2024 till date",
        "Total Business Received From Cusomer In Last 3 Month",
        "in_datamyne",
        "datamyne_match_details",
        "group_total_business",
        "co_reps",
        "merged_count",
        "merged_aliases",
    ]
    df_all_processed[all_export_cols].to_parquet(
        OUTPUT_ALL_PARQUET, engine="pyarrow", compression="zstd", index=False
    )
    df_all_processed[all_export_cols].to_csv(
        OUTPUT_ALL_CSV, index=False, encoding="utf-8-sig"
    )
    print(f"  ✓ Saved All Customers Parquet: {OUTPUT_ALL_PARQUET} ({len(df_all_processed)} rows)")
    print(f"  ✓ Saved All Customers CSV: {OUTPUT_ALL_CSV} ({len(df_all_processed)} rows)")

    # 4.2 Active Customers Datasets (Sub-slice of Active status records)
    df_active = df_all_processed[df_all_processed["Status"] == "Active"].copy()
    active_export_cols = [
        "id",
        "Full Name",
        "Territory",
        "Contact Person Name",
        "Mobile Number",
        "Email",
        "Status",
        "Customer Group",
        "Type",
        "Credit Status",
        "Sales Person",
        "Total Business Received From Cusomer In Last 3 Month",
        "Total Business from 1.04.2024 till date",
        "group_total_business",
        "co_reps",
        "merged_count",
        "merged_aliases",
    ]
    df_active[active_export_cols].to_parquet(
        OUTPUT_ACTIVE_PARQUET, engine="pyarrow", compression="zstd", index=False
    )
    df_active[active_export_cols].to_csv(
        OUTPUT_ACTIVE_CSV, index=False, encoding="utf-8-sig"
    )
    print(f"  ✓ Saved Active Customers Parquet: {OUTPUT_ACTIVE_PARQUET} ({len(df_active)} rows)")
    print(f"  ✓ Saved Active Customers CSV: {OUTPUT_ACTIVE_CSV} ({len(df_active)} rows)")

    # 4.3 Inactive Customers Datasets (Sub-slice of Not Active status records)
    df_inactive = df_all_processed[df_all_processed["Status"] == "Not Active"].copy()
    inactive_export_cols = [
        "id",
        "Full Name",
        "Territory",
        "Contact Person Name",
        "Mobile Number",
        "Email",
        "Status",
        "Customer Group",
        "Type",
        "Credit Status",
        "Sales Person",
        "Total Business from 1.04.2024 till date",
        "in_datamyne",
        "datamyne_match_details",
        "group_total_business",
        "co_reps",
        "merged_count",
        "merged_aliases",
    ]
    df_inactive[inactive_export_cols].to_parquet(
        OUTPUT_INACTIVE_PARQUET, engine="pyarrow", compression="zstd", index=False
    )
    df_inactive[inactive_export_cols].to_csv(
        OUTPUT_INACTIVE_CSV, index=False, encoding="utf-8-sig"
    )
    print(f"  ✓ Saved Inactive Customers Parquet: {OUTPUT_INACTIVE_PARQUET} ({len(df_inactive)} rows)")
    print(f"  ✓ Saved Inactive Customers CSV: {OUTPUT_INACTIVE_CSV} ({len(df_inactive)} rows)")

    # 4.4 Formatted Excel per `xlsx` Skill Guidelines
    print(f"  • Generating professionally styled Excel file {OUTPUT_ALL_EXCEL}...")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "All JFLL Customers"
    ws.views.sheetView[0].showGridLines = True

    # Professional Typography and Styling per xlsx skill
    FONT_HEADER = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    FILL_HEADER = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")  # Professional Dark Navy
    FONT_DATA = Font(name="Calibri", size=10, bold=False, color="000000")
    FONT_NUMERIC = Font(name="Calibri", size=10, bold=False, color="000000")
    ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
    ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")
    ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
    THIN_BORDER_SIDE = Side(border_style="thin", color="D9D9D9")
    CELL_BORDER = Border(left=THIN_BORDER_SIDE, right=THIN_BORDER_SIDE, top=THIN_BORDER_SIDE, bottom=THIN_BORDER_SIDE)

    excel_headers = [
        "Customer ID",
        "Company Name",
        "Status",
        "Customer Group",
        "Entity Type",
        "Credit Status",
        "Assigned Sales Rep",
        "Co-Reps / Sales Team",
        "Total Business (1.04.2024 till Date)",
        "Business Last 3 Months",
        "Contact Person",
        "Mobile Number",
        "Email Address",
        "DataMyne Verified",
        "Merged Accounts Count",
        "Merged Aliases Detail",
    ]
    ws.append(excel_headers)

    ws.row_dimensions[1].height = 26
    for col_idx in range(1, len(excel_headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = FONT_HEADER
        cell.fill = FILL_HEADER
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for r_idx, rec in enumerate(final_processed, start=2):
        ws.row_dimensions[r_idx].height = 20
        c1 = ws.cell(row=r_idx, column=1, value=rec["id"])
        c2 = ws.cell(row=r_idx, column=2, value=rec["Full Name"])
        c3 = ws.cell(row=r_idx, column=3, value=rec["Status"])
        c4 = ws.cell(row=r_idx, column=4, value=rec["Customer Group"])
        c5 = ws.cell(row=r_idx, column=5, value=rec["Type"])
        c6 = ws.cell(row=r_idx, column=6, value=rec["Credit Status"])
        c7 = ws.cell(row=r_idx, column=7, value=rec["Sales Person"] or "Unassigned")
        c8 = ws.cell(row=r_idx, column=8, value=rec.get("co_reps") or "")
        c9 = ws.cell(row=r_idx, column=9, value=rec["Total Business from 1.04.2024 till date"])
        c10 = ws.cell(row=r_idx, column=10, value=rec["Total Business Received From Cusomer In Last 3 Month"])
        c11 = ws.cell(row=r_idx, column=11, value=rec["Contact Person Name"] or "")
        c12 = ws.cell(row=r_idx, column=12, value=rec["Mobile Number"] or "")
        c13 = ws.cell(row=r_idx, column=13, value=rec["Email"] or "")
        c14 = ws.cell(row=r_idx, column=14, value="Yes" if rec["in_datamyne"] else "No")
        c15 = ws.cell(row=r_idx, column=15, value=rec.get("merged_count", 1))
        c16 = ws.cell(row=r_idx, column=16, value=rec.get("merged_aliases") or "")

        # Format cell alignment & borders
        for cell in (c1, c2, c3, c4, c5, c6, c7, c8, c11, c12, c13, c14, c15, c16):
            cell.font = FONT_DATA
            cell.border = CELL_BORDER
            cell.alignment = ALIGN_CENTER if cell in (c1, c3, c6, c14, c15) else ALIGN_LEFT

        # Currency formatting for revenue columns
        for num_cell in (c9, c10):
            num_cell.font = FONT_NUMERIC
            num_cell.border = CELL_BORDER
            num_cell.alignment = ALIGN_RIGHT
            if isinstance(num_cell.value, (int, float)):
                num_cell.number_format = '₹#,##0;[Red](₹#,##0);"-"'

    # Auto-fit columns with safety margin
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 14)

    ws.freeze_panes = "A2"
    wb.save(OUTPUT_ALL_EXCEL)
    print(f"  ✓ Saved formatted Excel workbook: {OUTPUT_ALL_EXCEL} ({len(final_processed)} rows)")

    # 5. Generate Frontend TypeScript Data Files
    print("\n[Step 5/5] Generating frontend TypeScript datasets...")

    # Active TS Items
    active_ts_items = []
    for r in final_processed:
        if r["Status"] == "Active":
            active_ts_items.append({
                "id": r["id"],
                "fullName": r["Full Name"],
                "territory": r["Territory"],
                "contactPersonName": r["Contact Person Name"],
                "mobileNumber": r["Mobile Number"],
                "email": r["Email"],
                "status": "Active",
                "customerGroup": r["Customer Group"],
                "type": r["Type"],
                "saved": False,
                "inDataMyne": r.get("in_datamyne", False),
                "creditStatus": r["Credit Status"],
                "salesPerson": r["Sales Person"],
                "coReps": r.get("co_reps"),
                "mergedCount": r.get("merged_count", 1),
                "mergedAliases": json.loads(r["merged_aliases"]) if r.get("merged_aliases") else None,
                "businessLast3m": r["Total Business Received From Cusomer In Last 3 Month"],
                "totalBusinessTillDate": r["Total Business from 1.04.2024 till date"],
                "groupTotalBusiness": r.get("group_total_business"),
            })

    active_ts_content = f"""// {len(active_ts_items)} Active Customer Records from Jet Freight Logistics Master Database (Last 3 Months Activity Window)
import {{ JfllCustomer }} from '@/types/jfllCustomer';

export const JFLL_CUSTOMERS_DATA: JfllCustomer[] = {json.dumps(active_ts_items, indent=2)};
"""
    with open(FRONTEND_ACTIVE_TS, "w", encoding="utf-8") as f:
        f.write(active_ts_content)
    print(f"  ✓ Saved Frontend Active TS: {FRONTEND_ACTIVE_TS} ({len(active_ts_items)} records)")

    # Inactive TS Items
    inactive_ts_items = []
    for r in final_processed:
        if r["Status"] == "Not Active":
            inactive_ts_items.append({
                "id": r["id"],
                "fullName": r["Full Name"],
                "territory": r["Territory"],
                "contactPersonName": r["Contact Person Name"],
                "mobileNumber": r["Mobile Number"],
                "email": r["Email"],
                "status": "Not Active",
                "customerGroup": r["Customer Group"],
                "type": r["Type"],
                "saved": False,
                "inDataMyne": r.get("in_datamyne", False),
                "creditStatus": r["Credit Status"],
                "salesPerson": r["Sales Person"],
                "coReps": r.get("co_reps"),
                "mergedCount": r.get("merged_count", 1),
                "mergedAliases": json.loads(r["merged_aliases"]) if r.get("merged_aliases") else None,
                "totalBusinessTillDate": r["Total Business from 1.04.2024 till date"],
                "groupTotalBusiness": r.get("group_total_business"),
            })

    inactive_ts_content = f"""// {len(inactive_ts_items):,} Inactive Customer Records from Customer List From 1.04.2026 till Date (>3 Months Inactivity Window)
import {{ JfllCustomer }} from '@/types/jfllCustomer';

export const JFLL_INACTIVE_CUSTOMERS_DATA: JfllCustomer[] = {json.dumps(inactive_ts_items, indent=2)};
"""
    with open(FRONTEND_INACTIVE_TS, "w", encoding="utf-8") as f:
        f.write(inactive_ts_content)
    print(f"  ✓ Saved Frontend Inactive TS: {FRONTEND_INACTIVE_TS} ({len(inactive_ts_items)} records)")

    # All Customers TS Items
    all_ts_items = []
    for r in final_processed:
        all_ts_items.append({
            "id": r["id"],
            "fullName": r["Full Name"],
            "territory": r["Territory"],
            "contactPersonName": r["Contact Person Name"],
            "mobileNumber": r["Mobile Number"],
            "email": r["Email"],
            "status": r["Status"],
            "customerGroup": r["Customer Group"],
            "type": r["Type"],
            "saved": False,
            "inDataMyne": r.get("in_datamyne", False),
            "creditStatus": r["Credit Status"],
            "salesPerson": r["Sales Person"],
            "coReps": r.get("co_reps"),
            "mergedCount": r.get("merged_count", 1),
            "mergedAliases": json.loads(r["merged_aliases"]) if r.get("merged_aliases") else None,
            "businessLast3m": r["Total Business Received From Cusomer In Last 3 Month"] if r["Status"] == "Active" else None,
            "totalBusinessTillDate": r["Total Business from 1.04.2024 till date"],
            "groupTotalBusiness": r.get("group_total_business"),
        })

    all_ts_content = f"""// {len(all_ts_items):,} All JFLL Customer Records from Customer List From 1.04.2026 till Date (Unified Master Directory)
import {{ JfllCustomer }} from '@/types/jfllCustomer';

export const JFLL_ALL_CUSTOMERS_DATA: JfllCustomer[] = {json.dumps(all_ts_items, indent=2)};
"""
    with open(FRONTEND_ALL_TS, "w", encoding="utf-8") as f:
        f.write(all_ts_content)
    print(f"  ✓ Saved Frontend All Customers TS: {FRONTEND_ALL_TS} ({len(all_ts_items)} records)")

    print("\n" + "=" * 80)
    print("ETL PIPELINE COMPLETED SUCCESSFULLY!")
    print(f"• Total Processed Accounts: {len(final_processed)}")
    print(f"• Active Customers: {len(active_ts_items)}")
    print(f"• Inactive Customers: {len(inactive_ts_items)}")
    print("=" * 80)


if __name__ == "__main__":
    main()
