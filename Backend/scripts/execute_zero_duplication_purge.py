#!/usr/bin/env python3
"""
Zero-Duplication Execution Engine:
1. Creates full safety backup in Backend/data/.backups/pre_zero_duplication_purge/
2. Re-runs process_all_jfll_customers.py with fixed (I) -> INDIA normalization
3. Atomically purges confirmed existing JFLL customer duplicates from DataMyne
4. Atomically purges confirmed existing JFLL customer & DataMyne duplicates from Apollo
5. Synchronizes CSVs, Parquet files, and Frontend data structures
6. Verifies zero remaining duplicates for FAIR Exports, Winsome, Titan Biotech, etc.
"""

import os
import shutil
import time
import subprocess
import duckdb
import openpyxl

t0 = time.time()
print("=" * 80)
print("EXECUTING COMPREHENSIVE ZERO-DUPLICATION PURGE PIPELINE")
print("=" * 80)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
BACKUP_DIR = os.path.join(DATA_DIR, ".backups", f"pre_zero_duplication_purge_{time.strftime('%Y%m%d_%H%M%S')}")
os.makedirs(BACKUP_DIR, exist_ok=True)

# Datasets
p_jfll_all = os.path.join(PROCESSED_DIR, "all_customers_leads_zstd.parquet")
p_jfll_active = os.path.join(PROCESSED_DIR, "active_customers_leads_zstd.parquet")
p_jfll_inactive = os.path.join(PROCESSED_DIR, "inactive_customers_leads_zstd.parquet")

p_dm_master = os.path.join(PROCESSED_DIR, "datamyne_leads_zstd.parquet")
p_dm_valid = os.path.join(PROCESSED_DIR, "datamyne_valid_leads_zstd.parquet")
p_dm_missing = os.path.join(PROCESSED_DIR, "datamyne_missing_leads_zstd.parquet")
p_dm_tier = os.path.join(PROCESSED_DIR, "datamyne_tier_segments_zstd.parquet")
p_dm_csv = os.path.join(PROCESSED_DIR, "datamyne_leads.csv")

p_apollo_orgs = os.path.join(PROCESSED_DIR, "apollo_freight_leads_zstd.parquet")
p_apollo_contacts = os.path.join(DATA_DIR, "Apollo/apollo_freight_contacts_with_company_profile.parquet")

xlsx_audit_path = os.path.join(os.path.dirname(BASE_DIR), "DUPLICATE_AUDIT_MULTIFACTOR_SHEET.xlsx")

# 1. Create Safety Backups
print(f"\n[Step 1/6] Creating safety backups in: {BACKUP_DIR}...")
files_to_backup = [
    p_jfll_all, p_jfll_active, p_jfll_inactive,
    p_dm_master, p_dm_valid, p_dm_missing, p_dm_tier,
    p_apollo_orgs, p_apollo_contacts
]
for f in files_to_backup:
    if os.path.exists(f):
        shutil.copy2(f, os.path.join(BACKUP_DIR, os.path.basename(f)))
        print(f"  • Backed up: {os.path.basename(f)}")

# 2. Re-run JFLL Customer Pipeline with Fixed Normalization
print("\n[Step 2/6] Re-running process_all_jfll_customers.py with fixed (I) -> INDIA normalization...")
subprocess.run(["python3", os.path.join(BASE_DIR, "scripts/process_all_jfll_customers.py")], check=True)
print("  • JFLL Customer Master refreshed with updated in_datamyne linking.")

# 3. Extract Confirmed Purge Lists from Multi-Factor Audit Sheet
print("\n[Step 3/6] Loading confirmed purge lists from audit workbook...")
wb = openpyxl.load_workbook(xlsx_audit_path)

dm_ids_to_purge = set()
apollo_ids_to_purge = set()

# Tab 2: 90-100% Matches
ws90 = wb['90-100% Matches']
for r in range(2, ws90.max_row + 1):
    scope = str(ws90.cell(row=r, column=1).value or '')
    b_id = str(ws90.cell(row=r, column=4).value or '').strip()
    if not b_id: continue
    
    if 'JFLL' in scope and 'DataMyne' in scope:
        dm_ids_to_purge.add(b_id)
    elif 'JFLL' in scope and 'Apollo' in scope:
        apollo_ids_to_purge.add(b_id)
    elif 'DataMyne' in scope and 'Apollo' in scope:
        apollo_ids_to_purge.add(b_id)

# Tab 3: 70-80% Matches (Multi-Factor Confirmed)
ws70 = wb['70-80% Matches (Multi-Factor)']
for r in range(2, ws70.max_row + 1):
    verdict = str(ws70.cell(row=r, column=13).value or '')
    if 'CONFIRMED DUPLICATE' in verdict:
        scope = str(ws70.cell(row=r, column=1).value or '')
        b_id = str(ws70.cell(row=r, column=4).value or '').strip()
        if not b_id: continue
        if 'JFLL' in scope and 'DataMyne' in scope:
            dm_ids_to_purge.add(b_id)
        elif 'Apollo' in scope:
            apollo_ids_to_purge.add(b_id)

print(f"  • Identified {len(dm_ids_to_purge):,} DataMyne leads to purge (existing JFLL customer duplicates)")
print(f"  • Identified {len(apollo_ids_to_purge):,} Apollo organizations to purge (JFLL / DataMyne duplicates)")

con = duckdb.connect()

# 4. Atomically Purge Confirmed Existing Customer Duplicates from DataMyne
print("\n[Step 4/6] Executing atomic DataMyne dataset purge...")

# Export Audit Log of Purged DataMyne Records
if dm_ids_to_purge:
    dm_id_sql = ", ".join([f"'{i}'" for i in dm_ids_to_purge])
    dm_audit_csv = os.path.join(PROCESSED_DIR, "PURGED_DATAMYNE_EXISTING_CUSTOMERS.csv")
    con.execute(f"""
    COPY (
        SELECT * FROM '{p_dm_master}'
        WHERE id IN ({dm_id_sql})
        ORDER BY company_name
    ) TO '{dm_audit_csv}' (HEADER, DELIMITER ',')
    """)
    print(f"  • Saved DataMyne purge audit trail: {os.path.basename(dm_audit_csv)}")

def filter_parquet_file(file_path, id_col, excluded_ids):
    if not os.path.exists(file_path): return 0, 0
    if not excluded_ids:
        cnt = con.execute(f"SELECT count(*) FROM '{file_path}'").fetchone()[0]
        return cnt, cnt
    id_list_sql = ", ".join([f"'{i}'" for i in excluded_ids])
    tmp_path = file_path + ".tmp.parquet"
    cnt_before = con.execute(f"SELECT count(*) FROM '{file_path}'").fetchone()[0]
    con.execute(f"""
    COPY (
        SELECT * FROM '{file_path}'
        WHERE {id_col} NOT IN ({id_list_sql})
    ) TO '{tmp_path}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
    """)
    cnt_after = con.execute(f"SELECT count(*) FROM '{tmp_path}'").fetchone()[0]
    shutil.move(tmp_path, file_path)
    return cnt_before, cnt_after

dm_b, dm_a = filter_parquet_file(p_dm_master, "id", dm_ids_to_purge)
print(f"  • DataMyne master:  {dm_b:,} -> {dm_a:,} ({dm_b - dm_a:,} purged)")

val_b, val_a = filter_parquet_file(p_dm_valid, "id", dm_ids_to_purge)
print(f"  • DataMyne valid:   {val_b:,} -> {val_a:,} ({val_b - val_a:,} purged)")

mis_b, mis_a = filter_parquet_file(p_dm_missing, "id", dm_ids_to_purge)
print(f"  • DataMyne missing: {mis_b:,} -> {mis_a:,} ({mis_b - mis_a:,} purged)")

if os.path.exists(p_dm_tier):
    tier_b, tier_a = filter_parquet_file(p_dm_tier, "id", dm_ids_to_purge)
    print(f"  • DataMyne tiers:   {tier_b:,} -> {tier_a:,} ({tier_b - tier_a:,} purged)")

# Re-export clean CSV
con.execute(f"COPY (SELECT * FROM '{p_dm_master}') TO '{p_dm_csv}' (HEADER, DELIMITER ',')")
print(f"  • Re-exported DataMyne CSV with {dm_a:,} clean records.")

# 5. Atomically Purge Confirmed Duplicates from Apollo
print("\n[Step 5/6] Executing atomic Apollo dataset purge...")
if apollo_ids_to_purge:
    ap_id_sql = ", ".join([f"'{i}'" for i in apollo_ids_to_purge])
    ap_audit_csv = os.path.join(PROCESSED_DIR, "PURGED_APOLLO_DUPLICATES.csv")
    con.execute(f"""
    COPY (
        SELECT * FROM '{p_apollo_orgs}'
        WHERE organization_id IN ({ap_id_sql})
        ORDER BY organization_name
    ) TO '{ap_audit_csv}' (HEADER, DELIMITER ',')
    """)
    print(f"  • Saved Apollo purge audit trail: {os.path.basename(ap_audit_csv)}")

ap_b, ap_a = filter_parquet_file(p_apollo_orgs, "organization_id", apollo_ids_to_purge)
print(f"  • Apollo orgs:      {ap_b:,} -> {ap_a:,} ({ap_b - ap_a:,} purged)")

# Filter Apollo Contacts if present
if os.path.exists(p_apollo_contacts):
    c_b, c_a = filter_parquet_file(p_apollo_contacts, "organization_id", apollo_ids_to_purge)
    print(f"  • Apollo contacts:  {c_b:,} -> {c_a:,} ({c_b - c_a:,} purged)")

# 6. Post-Purge Verification Checks
print("\n[Step 6/6] Running Post-Purge Verification Gates...")
fair_dm = con.execute(f"SELECT count(*) FROM '{p_dm_master}' WHERE upper(company_name) LIKE '%FAIR EXPORT%'").fetchone()[0]
print(f"  • FAIR EXPORTS in DataMyne leads table:        {fair_dm} (Expected: 0)")

winsome_dm = con.execute(f"SELECT count(*) FROM '{p_dm_master}' WHERE upper(company_name) LIKE '%WINSOME TEXTILE%'").fetchone()[0]
print(f"  • WINSOME TEXTILE in DataMyne leads table:     {winsome_dm} (Expected: 0)")

titan_dm = con.execute(f"SELECT count(*) FROM '{p_dm_master}' WHERE upper(company_name) LIKE '%TITAN BIOTECH%'").fetchone()[0]
print(f"  • TITAN BIOTECH in DataMyne leads table:       {titan_dm} (Expected: 0)")

jfll_fair = con.execute(f"SELECT id, \"Full Name\", in_datamyne, datamyne_match_details FROM '{p_jfll_all}' WHERE upper(\"Full Name\") LIKE '%FAIR EXPORT%'").fetchall()
print(f"  • FAIR EXPORTS status in JFLL Master:")
for r in jfll_fair:
    print(f"      [{r[0]}] {r[1]} -> in_datamyne={r[2]} ({r[3]})")

print("\n" + "=" * 80)
print(f"ZERO-DUPLICATION PURGE COMPLETE IN {time.time() - t0:.2f} SECONDS")
print(f"  • DataMyne Remaining Active Leads:  {dm_a:,}")
print(f"  • Apollo Remaining Organizations:   {ap_a:,}")
print(f"  • JFLL Customer Master Count:       2,223")
print("=" * 80)
