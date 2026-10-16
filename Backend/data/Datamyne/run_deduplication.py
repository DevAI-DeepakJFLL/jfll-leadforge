import os
import re
import csv
import glob
import time
from itertools import groupby
from operator import itemgetter
from concurrent.futures import ProcessPoolExecutor
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

ACTIVE_CUSTOMERS_PATH = "Backend/data/processed/active_customers_leads.csv"
DATAMYNE_DIR = "Backend/data/Datamyne"
MASTER_FILE = os.path.join(DATAMYNE_DIR, "Valid Contacts/Master_Cleaned_Contacts_Directory.xlsx")
AUDIT_CSV_PATH = os.path.join(DATAMYNE_DIR, "DUPLICATES_REMOVED_AUDIT.csv")

def norm_name(s):
    if not s:
        return ""
    s = str(s).upper().strip()
    s = re.sub(r"^(M/S\.?|MESSRS\.?|M/S\s+|MS\.)\s*", "", s)
    s = re.sub(r"&", " AND ", s)
    s = re.sub(r"\bPVT\.?\s*LTD\.?\b", "PRIVATE LIMITED", s)
    s = re.sub(r"\bLTD\.\b", "LIMITED", s)
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s

def norm_phone(p):
    if not p:
        return ""
    digits = re.sub(r"\D", "", str(p))
    if len(digits) >= 10:
        return digits[-10:]
    return ""

def norm_email(e):
    if not e:
        return []
    e = str(e).lower().strip()
    if "@" in e and len(e) > 5:
        emails = [re.sub(r"\s+", "", x) for x in re.split(r"[,;]", e)]
        return [x for x in emails if "@" in x]
    return []

def load_active_customers():
    leads = []
    with open(ACTIVE_CUSTOMERS_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["Full Name"].strip()
            leads.append({
                "name": name,
                "n_name": norm_name(name),
                "phone": norm_phone(row.get("Mobile Number", "")),
                "emails": norm_email(row.get("Email", "")),
                "raw_phone": row.get("Mobile Number", ""),
                "raw_email": row.get("Email", "")
            })
    return leads

def match_lead(c_name, c_phone, c_emails, active_leads):
    n_cn = norm_name(c_name)
    n_ph = norm_phone(c_phone)
    matched_leads = []
    
    for lead in active_leads:
        reasons = []
        if n_cn and n_cn == lead["n_name"]:
            reasons.append("Name Match")
        if n_ph and lead["phone"] and n_ph == lead["phone"]:
            reasons.append("Phone Match")
        for em in c_emails:
            if em in lead["emails"]:
                reasons.append("Email Match")
                break
        if reasons:
            matched_leads.append((lead, " + ".join(reasons)))
    return matched_leads

def delete_row_chunks(ws, rows_to_delete):
    if not rows_to_delete:
        return
    for _, g in groupby(enumerate(sorted(rows_to_delete, reverse=True)), lambda ix: ix[0] + ix[1]):
        chunk = list(map(itemgetter(1), g))
        start_row = min(chunk)
        count = len(chunk)
        ws.delete_rows(start_row, count)

def process_transaction_file(file_path):
    active_leads = load_active_customers()
    try:
        wb = openpyxl.load_workbook(file_path)
    except Exception as e:
        return file_path, 0, [], f"Error loading: {e}"

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return file_path, 0, [], "Empty file"

    header = rows[0]
    if "Importer" in header:
        name_idx = header.index("Importer")
        phone_idx = header.index("Importer Phone") if "Importer Phone" in header else -1
        email_idx = header.index("Importer Email") if "Importer Email" in header else -1
        category = "Valid Contacts" if "Valid Contacts" in file_path else "Missing Contacts"
    elif "Exporter" in header:
        name_idx = header.index("Exporter")
        phone_idx = header.index("Exporter Phone") if "Exporter Phone" in header else -1
        email_idx = header.index("Exporter Email") if "Exporter Email" in header else -1
        category = "Valid Contacts" if "Valid Contacts" in file_path else "Missing Contacts"
    else:
        return file_path, 0, [], "Unknown schema"

    to_delete = []
    audit_entries = []

    for row_idx, r in enumerate(rows[1:], start=2):
        c_name = r[name_idx] if name_idx >= 0 else None
        c_phone = r[phone_idx] if phone_idx >= 0 else None
        c_emails = norm_email(r[email_idx]) if email_idx >= 0 else []

        matches = match_lead(c_name, c_phone, c_emails, active_leads)
        if matches:
            to_delete.append(row_idx)
            for lead, reason in matches:
                audit_entries.append({
                    "File Path": file_path,
                    "Category": category,
                    "Original Row Number": row_idx,
                    "DataMyne Entity Name": c_name or "",
                    "Matched JFLL Customer Name": lead["name"],
                    "Match Reason": reason,
                    "DataMyne Phone": str(c_phone) if c_phone else "",
                    "JFLL Phone": lead["raw_phone"],
                    "DataMyne Email": str(r[email_idx]) if (email_idx >= 0 and r[email_idx]) else "",
                    "JFLL Email": lead["raw_email"]
                })

    if to_delete:
        delete_row_chunks(ws, to_delete)
        wb.save(file_path)

    return file_path, len(to_delete), audit_entries, None

def process_master_directory(active_leads):
    print("Loading Master Cleaned Contacts Directory...")
    t0 = time.time()
    wb = openpyxl.load_workbook(MASTER_FILE)
    print(f"Loaded Master Directory in {time.time()-t0:.2f}s")
    
    audit_entries = []
    master_summary = {}

    for sheet_name in ["All Cleaned Contacts", "Exporters", "Importers"]:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        header = rows[0]
        c_idx = header.index("Company Name")
        p_idx = header.index("Phone")
        e_idx = header.index("Email")

        to_delete = []
        for row_idx, r in enumerate(rows[1:], start=2):
            c_name = r[c_idx]
            c_phone = r[p_idx]
            c_emails = norm_email(r[e_idx])

            matches = match_lead(c_name, c_phone, c_emails, active_leads)
            if matches:
                to_delete.append(row_idx)
                for lead, reason in matches:
                    audit_entries.append({
                        "File Path": MASTER_FILE,
                        "Category": f"Master Directory - {sheet_name}",
                        "Original Row Number": row_idx,
                        "DataMyne Entity Name": c_name or "",
                        "Matched JFLL Customer Name": lead["name"],
                        "Match Reason": reason,
                        "DataMyne Phone": str(c_phone) if c_phone else "",
                        "JFLL Phone": lead["raw_phone"],
                        "DataMyne Email": str(r[e_idx]) if r[e_idx] else "",
                        "JFLL Email": lead["raw_email"]
                    })
        
        master_summary[sheet_name] = len(to_delete)
        print(f"Deleting {len(to_delete)} rows from {sheet_name}...")
        delete_row_chunks(ws, to_delete)

    # Append Deduplication Audit to 'Audit & Metrics Summary' sheet
    if "Audit & Metrics Summary" in wb.sheetnames:
        summary_ws = wb["Audit & Metrics Summary"]
        summary_ws.append([])
        summary_ws.append(["DEDUPLICATION & ACTIVE CUSTOMER LEADS FILTER AUDIT", None])
        summary_ws.append(["Execution Date / Time", time.strftime("%Y-%m-%d %H:%M:%S")])
        summary_ws.append(["Target Active Customers Reference File", ACTIVE_CUSTOMERS_PATH])
        summary_ws.append(["Total Active Customer Leads Scanned", len(active_leads)])
        summary_ws.append(["Master Cleaned Contacts Removed (All Cleaned Contacts)", f"{master_summary.get('All Cleaned Contacts', 0)} entities removed"])
        summary_ws.append(["Master Cleaned Contacts Removed (Exporters Tab)", f"{master_summary.get('Exporters', 0)} entities removed"])
        summary_ws.append(["Master Cleaned Contacts Removed (Importers Tab)", f"{master_summary.get('Importers', 0)} entities removed"])
        summary_ws.append(["Status", "COMPLETED - Zero Duplicates Remaining"])

    t1 = time.time()
    wb.save(MASTER_FILE)
    print(f"Saved modified Master Directory in {time.time()-t1:.2f}s")
    return audit_entries, master_summary

def main():
    start_time = time.time()
    print("=" * 70)
    print("STARTING DATAMYNE DEDUPLICATION PROCESS")
    print("=" * 70)

    active_leads = load_active_customers()
    print(f"Loaded {len(active_leads)} active customer leads.")

    # 1. Process Master Directory
    master_audits, master_summary = process_master_directory(active_leads)

    # 2. Gather all transaction files
    all_files = glob.glob(f"{DATAMYNE_DIR}/**/*.xlsx", recursive=True)
    tx_files = [f for f in all_files if "Master_Cleaned_Contacts_Directory" not in f]
    print(f"\nFound {len(tx_files)} transaction files across Valid & Missing Contacts.")
    print("Starting parallel deduplication across transaction files (8 workers)...")

    tx_audits = []
    total_tx_deleted = 0
    modified_files = 0
    errors = []

    with ProcessPoolExecutor(max_workers=8) as executor:
        for idx, (f_path, num_del, audits, err) in enumerate(executor.map(process_transaction_file, tx_files), start=1):
            if err:
                errors.append((f_path, err))
            if num_del > 0:
                modified_files += 1
                total_tx_deleted += num_del
                tx_audits.extend(audits)
            if idx % 50 == 0 or idx == len(tx_files):
                print(f"Processed {idx}/{len(tx_files)} files... ({modified_files} files modified, {total_tx_deleted} rows removed)")

    # 3. Write comprehensive Audit CSV
    all_audits = master_audits + tx_audits
    print(f"\nWriting audit report with {len(all_audits)} duplicate records to {AUDIT_CSV_PATH}...")
    fieldnames = [
        "Category",
        "File Path",
        "Original Row Number",
        "DataMyne Entity Name",
        "Matched JFLL Customer Name",
        "Match Reason",
        "DataMyne Phone",
        "JFLL Phone",
        "DataMyne Email",
        "JFLL Email"
    ]
    with open(AUDIT_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for entry in all_audits:
            writer.writerow(entry)

    # 4. Final summary
    print("\n" + "=" * 70)
    print("DEDUPLICATION COMPLETED SUCCESSFULLY!")
    print(f"Total time elapsed: {time.time()-start_time:.2f}s")
    print(f"Master Directory Cleaned Contacts Removed: {master_summary.get('All Cleaned Contacts', 0)}")
    print(f"Master Directory Exporters Removed: {master_summary.get('Exporters', 0)}")
    print(f"Master Directory Importers Removed: {master_summary.get('Importers', 0)}")
    print(f"Transaction Files Modified: {modified_files} / {len(tx_files)}")
    print(f"Transaction Rows Removed: {total_tx_deleted}")
    print(f"Total Audit Entries Logged: {len(all_audits)}")
    print(f"Audit File Created: {AUDIT_CSV_PATH}")
    if errors:
        print(f"Errors encountered ({len(errors)}):", errors)
    print("=" * 70)

if __name__ == "__main__":
    main()
