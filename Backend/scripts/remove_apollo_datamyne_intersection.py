import os
import shutil
import time
import duckdb

t0 = time.time()
con = duckdb.connect()

print("=" * 80)
print("EXECUTING APOLLO-DATAMYNE INTERSECTION REMOVAL FROM APOLLO")
print("Rule: If company exists in DataMyne and Apollo -> Keep in DataMyne, Purge from Apollo")
print("=" * 80)

# Paths
p_datamyne = "Backend/data/processed/datamyne_leads_zstd.parquet"
p_apollo_orgs = "Backend/data/processed/apollo_freight_leads_zstd.parquet"
p_apollo_orgs_copy = "Backend/data/Apollo/apollo_freight_leads.parquet"
p_apollo_contacts = "Backend/data/Apollo/apollo_freight_contacts_with_company_profile.parquet"

backup_dir = "Backend/data/.backups/pre_apollo_datamyne_removal"
os.makedirs(backup_dir, exist_ok=True)
audit_csv_path = "Backend/data/processed/DUPLICATES_REMOVED_APOLLO_DATAMYNE_AUDIT.csv"

# 1. Define Pure DuckDB Macros
con.execute(r"""
CREATE MACRO normalize_name(raw) AS (
    trim(regexp_replace(
        regexp_replace(
            upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9 ]', ' ', 'g')),
            '(^| )(PRIVATE LIMITED|PVT LTD|PVT|PLTD|LIMITED|LTD|INCORPORATED|INC|CORPORATION|CORP|LLC|LLP|COMPANY|CO|ENTERPRISES|ENTERPRISE|TRADERS|TRADING|INDUSTRIES|INDUSTRY|INTERNATIONAL|INTL|GLOBAL|LOGISTICS|SERVICES|INDIA|M S|MESSRS|THE|AND)( |$)', ' ', 'g'
        ),
        ' +', ' ', 'g'
    ))
);

CREATE MACRO extract_domain(raw_email) AS (
    case 
        when raw_email is null or position('@' in raw_email) = 0 then ''
        else lower(trim(split_part(split_part(split_part(raw_email, '@', 2), ',', 1), ' ', 1)))
    end
);
""")

generic_domains = "'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'vsnl.net.in', 'bom2.vsnl.net.in', 'md2.vsnl.net.in', 'vsnl.com', 'sancharnet.in'"

# 2. Precompute Keys
print("\n[Step 1/5] Precomputing indexed matching keys...")
con.execute(f"""
CREATE TEMP TABLE dm_keys AS
SELECT 
    id,
    company_name,
    city,
    role,
    total_shipments,
    normalize_name(company_name) as norm_name,
    extract_domain(email) as email_domain
FROM '{p_datamyne}'
""")

con.execute(f"""
CREATE TEMP TABLE ap_keys AS
SELECT 
    organization_id,
    organization_name,
    domain,
    hq_city,
    hq_country,
    employee_count,
    revenue_usd,
    normalize_name(organization_name) as norm_name,
    lower(coalesce(domain, '')) as norm_domain
FROM '{p_apollo_orgs}'
""")

# 3. Identify Matches
print("[Step 2/5] Identifying intersection pairs...")
con.execute(f"""
CREATE TEMP TABLE matched_pairs AS
SELECT DISTINCT
    a.organization_id as apollo_id,
    a.organization_name as apollo_name,
    a.domain as apollo_domain,
    a.hq_country as apollo_country,
    a.employee_count as apollo_employees,
    d.id as datamyne_id,
    d.company_name as datamyne_name,
    d.city as datamyne_city,
    d.total_shipments as datamyne_shipments,
    'normalized_name' as match_type
FROM dm_keys d
JOIN ap_keys a ON d.norm_name = a.norm_name
WHERE length(d.norm_name) > 3

UNION

SELECT DISTINCT
    a.organization_id as apollo_id,
    a.organization_name as apollo_name,
    a.domain as apollo_domain,
    a.hq_country as apollo_country,
    a.employee_count as apollo_employees,
    d.id as datamyne_id,
    d.company_name as datamyne_name,
    d.city as datamyne_city,
    d.total_shipments as datamyne_shipments,
    'corporate_domain' as match_type
FROM dm_keys d
JOIN ap_keys a ON d.email_domain = a.norm_domain
WHERE d.email_domain != '' 
  AND d.email_domain NOT IN ({generic_domains})
""")

counts = con.execute("""
SELECT 
    count(DISTINCT apollo_id) as apollo_orgs,
    count(DISTINCT datamyne_id) as datamyne_leads,
    count(*) as total_pairs
FROM matched_pairs
""").fetchone()

print(f"• Unique Apollo Organizations to purge: {counts[0]:,}")
print(f"• DataMyne Leads preserved:              {counts[1]:,} (100% retained)")
print(f"• Total Matched Pairs:                   {counts[2]:,}")

# Export Audit Log
con.execute(f"""
COPY (
    SELECT * FROM matched_pairs 
    ORDER BY apollo_name, datamyne_name
) TO '{audit_csv_path}' (HEADER, DELIMITER ',')
""")
print(f"• Audit trail saved to: {audit_csv_path}")

# 4. Backup Datasets
print("\n[Step 3/5] Creating safety backups in Backend/data/.backups/pre_apollo_datamyne_removal/...")
shutil.copy2(p_apollo_orgs, os.path.join(backup_dir, "apollo_freight_leads_zstd.parquet"))
print("Backup created.")

# 5. Atomic Filter & Rewrite Apollo Organizations
print("\n[Step 4/5] Filtering Apollo Organizations...")
ap_orgs_before = con.execute(f"SELECT count(*) FROM '{p_apollo_orgs}'").fetchone()[0]

con.execute(f"""
CREATE TEMP TABLE apollo_ids_to_purge AS
SELECT DISTINCT apollo_id as organization_id FROM matched_pairs
""")

tmp_apollo_orgs = p_apollo_orgs + ".tmp.parquet"
con.execute(f"""
COPY (
    SELECT a.*
    FROM '{p_apollo_orgs}' a
    LEFT JOIN apollo_ids_to_purge p ON a.organization_id = p.organization_id
    WHERE p.organization_id IS NULL
) TO '{tmp_apollo_orgs}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
""")

ap_orgs_after = con.execute(f"SELECT count(*) FROM '{tmp_apollo_orgs}'").fetchone()[0]
shutil.move(tmp_apollo_orgs, p_apollo_orgs)
print(f"• Apollo Organizations: {ap_orgs_before:,} -> {ap_orgs_after:,} ({ap_orgs_before - ap_orgs_after:,} purged)")

if os.path.exists(p_apollo_orgs_copy):
    shutil.copy2(p_apollo_orgs, p_apollo_orgs_copy)
    print("• Synced Apollo organizations copy to Backend/data/Apollo/.")

# Filter Contacts
if os.path.exists(p_apollo_contacts):
    print("\n[Step 5/5] Filtering Apollo Contacts...")
    contacts_before = con.execute(f"SELECT count(*) FROM '{p_apollo_contacts}'").fetchone()[0]
    tmp_contacts = p_apollo_contacts + ".tmp.parquet"
    con.execute(f"""
    COPY (
        SELECT c.*
        FROM '{p_apollo_contacts}' c
        LEFT JOIN apollo_ids_to_purge p ON c.organization_id = p.organization_id
        WHERE p.organization_id IS NULL
    ) TO '{tmp_contacts}' (FORMAT PARQUET, COMPRESSION 'ZSTD')
    """)
    contacts_after = con.execute(f"SELECT count(*) FROM '{tmp_contacts}'").fetchone()[0]
    shutil.move(tmp_contacts, p_apollo_contacts)
    print(f"• Apollo Contacts: {contacts_before:,} -> {contacts_after:,} ({contacts_before - contacts_after:,} purged)")

# Post-Removal Verification
print("\n" + "=" * 50)
print("POST-REMOVAL VERIFICATION")
print("=" * 50)
remaining_pairs = con.execute(f"""
WITH dm_check AS (
    SELECT 
        id,
        normalize_name(company_name) as norm_name,
        extract_domain(email) as email_domain
    FROM '{p_datamyne}'
),
ap_check AS (
    SELECT 
        organization_id,
        normalize_name(organization_name) as norm_name,
        lower(coalesce(domain, '')) as norm_domain
    FROM '{p_apollo_orgs}'
)
SELECT count(DISTINCT a.organization_id)
FROM dm_check d
JOIN ap_check a ON (d.norm_name = a.norm_name AND length(d.norm_name) > 3)
                OR (d.email_domain = a.norm_domain AND d.email_domain != '' AND d.email_domain NOT IN ({generic_domains}))
""").fetchone()[0]

dm_total = con.execute(f"SELECT count(*) FROM '{p_datamyne}'").fetchone()[0]

print(f"Remaining Apollo-DataMyne Intersections: {remaining_pairs}")
print(f"DataMyne Total Records (Retained):      {dm_total:,}")
print(f"Apollo Total Organizations:             {ap_orgs_after:,}")
if remaining_pairs == 0:
    print("SUCCESS: DataMyne ∩ Apollo intersection is now exactly 0!")
else:
    print(f"ERROR: {remaining_pairs} matches still remain!")

print(f"Total script runtime: {time.time() - t0:.2f} seconds")
print("=" * 80)
