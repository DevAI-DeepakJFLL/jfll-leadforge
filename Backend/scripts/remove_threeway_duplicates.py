import os
import shutil
import duckdb

con = duckdb.connect()

print("=" * 80)
print("EXECUTING COMPLETE THREE-WAY INTERSECTION DUPLICATE REMOVAL")
print("Target: JFLL Customers ∩ DataMyne ∩ Apollo")
print("=" * 80)

# 1. Define robust legal entity cleanup macro (boundary match using space/edge without backslash escaping)
con.execute("""
CREATE MACRO clean_legal(raw) AS (
    trim(regexp_replace(
        regexp_replace(
            regexp_replace(
                upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9 ]', ' ', 'g')),
                '(^| )(PRIVATE LIMITED|PVT LTD|PVT LIMITED|PLTD|PRIVATE|PVT|LIMITED|LTD|INCORPORATED|INC|CORPORATION|CORP|LLC|LLP|COMPANY|CO)( |$)', ' ', 'g'
            ),
            '(^| )(PRIVATE LIMITED|PVT LTD|PVT LIMITED|PLTD|PRIVATE|PVT|LIMITED|LTD|INCORPORATED|INC|CORPORATION|CORP|LLC|LLP|COMPANY|CO)( |$)', ' ', 'g'
        ),
        ' +', ' ', 'g'
    ))
);
""")

p_jfll_active = "Backend/data/processed/active_customers_leads_zstd.parquet"
p_jfll_inactive = "Backend/data/processed/inactive_customers_leads_zstd.parquet"

# Using original backups as source of truth for full audit
backup_dir = "Backend/data/.backups/pre_threeway_removal"
p_datamyne_src = os.path.join(backup_dir, "datamyne_leads_zstd.parquet")
p_datamyne_valid_src = os.path.join(backup_dir, "datamyne_valid_leads_zstd.parquet")
p_datamyne_missing_src = os.path.join(backup_dir, "datamyne_missing_leads_zstd.parquet")
p_apollo_orgs_src = os.path.join(backup_dir, "apollo_freight_leads_zstd.parquet")

p_datamyne = "Backend/data/processed/datamyne_leads_zstd.parquet"
p_datamyne_valid = "Backend/data/processed/datamyne_valid_leads_zstd.parquet"
p_datamyne_missing = "Backend/data/processed/datamyne_missing_leads_zstd.parquet"
p_datamyne_csv = "Backend/data/processed/datamyne_leads.csv"
p_apollo_orgs = "Backend/data/processed/apollo_freight_leads_zstd.parquet"
p_apollo_orgs_copy = "Backend/data/Apollo/apollo_freight_leads.parquet"
p_apollo_contacts = "Backend/data/Apollo/apollo_freight_contacts_with_company_profile.parquet"

# 2. Extract Complete 3-Way Matches
print("\n[Step 1/5] Extracting exact 3-way intersection records from base datasets...")

audit_query = f"""
WITH jfll AS (
    SELECT "Full Name" as full_name, clean_legal("Full Name") as clean_name, 'active' as jfll_status FROM '{p_jfll_active}'
    UNION ALL
    SELECT "Full Name" as full_name, clean_legal("Full Name") as clean_name, 'inactive' as jfll_status FROM '{p_jfll_inactive}'
)
SELECT DISTINCT
    d.id as datamyne_id,
    d.company_name as datamyne_name,
    d.city as datamyne_city,
    d.dataset_type,
    d.total_shipments,
    a.organization_id as apollo_id,
    a.organization_name as apollo_name,
    a.domain as apollo_domain,
    j.full_name as jfll_name,
    j.jfll_status
FROM '{p_datamyne_src}' d
JOIN jfll j ON clean_legal(d.company_name) = j.clean_name AND length(j.clean_name) >= 4
JOIN '{p_apollo_orgs_src}' a ON clean_legal(d.company_name) = clean_legal(a.organization_name)
ORDER BY d.company_name
"""

matches = con.execute(audit_query).fetchall()
print(f"Found {len(matches)} matched records across all three datasets.")

dm_ids = sorted(list(set([r[0] for r in matches])))
apollo_ids = sorted(list(set([r[5] for r in matches])))
print(f"• Unique DataMyne IDs to purge: {len(dm_ids)}")
print(f"• Unique Apollo Organization IDs to purge: {len(apollo_ids)}")

# 3. Export Comprehensive Audit Trail
audit_csv_path = "Backend/data/processed/DUPLICATES_REMOVED_THREEWAY_AUDIT.csv"
con.execute(f"""
COPY ({audit_query}) TO '{audit_csv_path}' (HEADER, DELIMITER ',')
""")
print(f"[Step 2/5] Saved complete audit trail to: {audit_csv_path}")

# 4. Atomic Filtering for DataMyne Datasets
print("\n[Step 3/5] Filtering DataMyne datasets...")

def filter_parquet(src_path, dest_path, id_col, excluded_ids):
    placeholders = ", ".join([f"'{i}'" for i in excluded_ids])
    tmp_path = dest_path + ".tmp.parquet"
    before_count = con.execute(f"SELECT count(*) FROM '{src_path}'").fetchone()[0]
    con.execute(f"""
    COPY (
        SELECT * FROM '{src_path}'
        WHERE {id_col} NOT IN ({placeholders})
    ) TO '{tmp_path}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
    """)
    after_count = con.execute(f"SELECT count(*) FROM '{tmp_path}'").fetchone()[0]
    shutil.move(tmp_path, dest_path)
    return before_count, after_count

dm_before, dm_after = filter_parquet(p_datamyne_src, p_datamyne, "id", dm_ids)
print(f"• DataMyne master: {dm_before:,} -> {dm_after:,} ({dm_before - dm_after} purged)")

valid_before, valid_after = filter_parquet(p_datamyne_valid_src, p_datamyne_valid, "id", dm_ids)
print(f"• DataMyne valid: {valid_before:,} -> {valid_after:,} ({valid_before - valid_after} purged)")

missing_before, missing_after = filter_parquet(p_datamyne_missing_src, p_datamyne_missing, "id", dm_ids)
print(f"• DataMyne missing: {missing_before:,} -> {missing_after:,} ({missing_before - missing_after} purged)")

# Sync CSV
con.execute(f"COPY (SELECT * FROM '{p_datamyne}') TO '{p_datamyne_csv}' (HEADER, DELIMITER ',')")
print(f"• DataMyne CSV re-exported with {dm_after:,} records.")

# 5. Atomic Filtering for Apollo Datasets
print("\n[Step 4/5] Filtering Apollo datasets...")
ap_before, ap_after = filter_parquet(p_apollo_orgs_src, p_apollo_orgs, "organization_id", apollo_ids)
print(f"• Apollo organizations: {ap_before:,} -> {ap_after:,} ({ap_before - ap_after} purged)")

if os.path.exists(p_apollo_orgs_copy):
    shutil.copy2(p_apollo_orgs, p_apollo_orgs_copy)
    print("• Synced Apollo organizations copy to Backend/data/Apollo/.")

# Filter Contacts if contacts file exists
if os.path.exists(p_apollo_contacts):
    contacts_tmp = p_apollo_contacts + ".tmp.parquet"
    contacts_before = con.execute(f"SELECT count(*) FROM '{p_apollo_contacts}'").fetchone()[0]
    apollo_placeholders = ", ".join([f"'{i}'" for i in apollo_ids])
    con.execute(f"""
    COPY (
        SELECT * FROM '{p_apollo_contacts}'
        WHERE organization_id NOT IN ({apollo_placeholders})
    ) TO '{contacts_tmp}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
    """)
    contacts_after = con.execute(f"SELECT count(*) FROM '{contacts_tmp}'").fetchone()[0]
    shutil.move(contacts_tmp, p_apollo_contacts)
    print(f"• Apollo contacts: {contacts_before:,} -> {contacts_after:,} ({contacts_before - contacts_after} purged)")

# 6. Post-Removal Verification
print("\n" + "=" * 50)
print("POST-REMOVAL VERIFICATION")
print("=" * 50)
verify_query = f"""
WITH jfll AS (
    SELECT "Full Name" as full_name, clean_legal("Full Name") as clean_name FROM '{p_jfll_active}'
    UNION ALL
    SELECT "Full Name" as full_name, clean_legal("Full Name") as clean_name FROM '{p_jfll_inactive}'
)
SELECT count(*)
FROM '{p_datamyne}' d
JOIN jfll j ON clean_legal(d.company_name) = j.clean_name AND length(j.clean_name) >= 4
JOIN '{p_apollo_orgs}' a ON clean_legal(d.company_name) = clean_legal(a.organization_name)
"""
remaining = con.execute(verify_query).fetchone()[0]
print(f"Remaining 3-way intersection count: {remaining}")
if remaining == 0:
    print("SUCCESS: 3-way intersection is now exactly 0!")
else:
    print(f"ERROR: {remaining} matches still exist.")

print("=" * 80)
