import os
import sys
import time
import duckdb

CSV_PEOPLE_PATH = "Apollo/Apollo_V7_V5_per_all_fields 93,239,628.csv"
PARQUET_COMPANIES_PATH = "Apollo/apollo_freight_leads.parquet"
OUTPUT_CONTACTS_PARQUET = "Apollo/apollo_freight_contacts.parquet"

print("=================================================================")
print("JET FREIGHT LOGISTICS - APOLLO PEOPLE RELATIONAL PIPELINE")
print("=================================================================")
print(f"Source 93.2M People CSV: {CSV_PEOPLE_PATH}")
print(f"Target Companies Parquet: {PARQUET_COMPANIES_PATH}")
print(f"Output Contacts Parquet:  {OUTPUT_CONTACTS_PARQUET}")

con = duckdb.connect()
con.execute("PRAGMA threads=8;")
con.execute("PRAGMA memory_limit='8GB';")

print("\nStep 1: Loading target freight companies hash index into memory...")
start_t = time.time()
con.execute(f"""
    CREATE TEMP TABLE target_companies AS
    SELECT 
        organization_id,
        organization_name,
        domain AS company_domain,
        website_url AS company_website,
        phone AS company_phone,
        industry AS company_industry,
        employee_count AS company_employee_count,
        revenue_usd AS company_revenue_usd,
        hq_city AS company_city,
        hq_state AS company_state,
        hq_country AS company_country,
        hq_postal_code AS company_postal_code
    FROM '{PARQUET_COMPANIES_PATH}';
""")
load_time = time.time() - start_t
total_target_orgs = con.execute("SELECT count(*) FROM target_companies").fetchone()[0]
print(f"Loaded {total_target_orgs:,} target companies in {load_time:.2f}s")

print("\nStep 2: Executing streaming relational filter & join across 93.2M people...")
start_stream = time.time()

pipeline_sql = f"""
COPY (
    WITH people_stream AS (
        SELECT 
            trim(_id) AS person_id,
            trim(person_name) AS person_name,
            trim(person_first_name_unanalyzed) AS first_name,
            trim(person_last_name_unanalyzed) AS last_name,
            trim(person_title) AS job_title,
            trim(person_title_normalized) AS job_title_normalized,
            lower(trim(person_seniority)) AS seniority,
            trim(replace(replace(replace(person_functions, chr(91)||chr(39), ''), chr(39)||chr(93), ''), chr(39), '')) AS department,
            lower(trim(person_email)) AS email,
            trim(person_email_status_cd) AS email_status,
            TRY_CAST(person_extrapolated_email_confidence AS FLOAT) AS email_confidence,
            trim(person_linkedin_url) AS linkedin_url,
            trim(person_location_city) AS contact_city,
            trim(person_location_state) AS contact_state,
            trim(person_location_country) AS contact_country,
            regexp_extract(current_organization_ids, '[0-9a-f]{{24}}') AS org_id,
            -- Sales & Logistics Intelligence Flags
            CASE WHEN lower(trim(person_seniority)) IN ('c_suite', 'owner', 'founder', 'partner', 'vp', 'head', 'director', 'manager') 
                 THEN true ELSE false END AS is_decision_maker,
            CASE WHEN lower(person_title) LIKE '%logistics%' 
                   OR lower(person_title) LIKE '%supply chain%'
                   OR lower(person_title) LIKE '%procurement%'
                   OR lower(person_title) LIKE '%purchasing%'
                   OR lower(person_title) LIKE '%import%'
                   OR lower(person_title) LIKE '%export%'
                   OR lower(person_title) LIKE '%warehouse%'
                   OR lower(person_title) LIKE '%freight%'
                   OR lower(person_title) LIKE '%shipping%'
                   OR lower(person_title) LIKE '%operations%' 
                 THEN true ELSE false END AS is_logistics_role,
            CASE WHEN person_email IS NOT NULL AND trim(person_email) != '' 
                 THEN true ELSE false END AS has_email
        FROM read_csv('{CSV_PEOPLE_PATH}',
                      delim='\\t',
                      header=true,
                      quote='',
                      escape='',
                      comment='',
                      null_padding=true,
                      all_varchar=true,
                      strict_mode=false,
                      ignore_errors=true)
        WHERE person_name IS NOT NULL AND trim(person_name) != ''
    )
    SELECT 
        p.person_id,
        p.person_name,
        p.first_name,
        p.last_name,
        p.job_title,
        p.job_title_normalized,
        p.seniority,
        p.department,
        p.email,
        p.email_status,
        p.email_confidence,
        p.linkedin_url,
        p.contact_city,
        p.contact_state,
        p.contact_country,
        p.is_decision_maker,
        p.is_logistics_role,
        p.has_email,
        -- Joined Target Company Attributes
        c.organization_id AS company_id,
        c.organization_name AS company_name,
        c.company_domain,
        c.company_website,
        c.company_phone,
        c.company_industry,
        c.company_employee_count,
        c.company_revenue_usd,
        c.company_city,
        c.company_state,
        c.company_country,
        c.company_postal_code
    FROM people_stream p
    INNER JOIN target_companies c ON p.org_id = c.organization_id
) TO '{OUTPUT_CONTACTS_PARQUET}' (
    FORMAT PARQUET, 
    COMPRESSION 'ZSTD', 
    ROW_GROUP_SIZE 100000
);
"""

con.execute(pipeline_sql)
total_stream_time = time.time() - start_stream

file_size_bytes = os.path.getsize(OUTPUT_CONTACTS_PARQUET)
file_size_mb = file_size_bytes / (1024 * 1024)

print(f"\nSUCCESS! Freight Contacts Parquet generated in {total_stream_time:.2f} seconds ({total_stream_time/60:.2f} minutes).")
print(f"File Path: {OUTPUT_CONTACTS_PARQUET}")
print(f"File Size: {file_size_mb:.2f} MB ({file_size_bytes:,} bytes)")

# Audit Output
print("\nAuditing final Freight Contacts Parquet...")
total_contacts = con.execute(f"SELECT count(*) FROM '{OUTPUT_CONTACTS_PARQUET}'").fetchone()[0]
unique_companies = con.execute(f"SELECT count(distinct company_id) FROM '{OUTPUT_CONTACTS_PARQUET}'").fetchone()[0]
contacts_with_email = con.execute(f"SELECT count(*) FROM '{OUTPUT_CONTACTS_PARQUET}' WHERE has_email = true").fetchone()[0]
decision_makers = con.execute(f"SELECT count(*) FROM '{OUTPUT_CONTACTS_PARQUET}' WHERE is_decision_maker = true").fetchone()[0]
logistics_titles = con.execute(f"SELECT count(*) FROM '{OUTPUT_CONTACTS_PARQUET}' WHERE is_logistics_role = true").fetchone()[0]

print(f"Total Freight Decision-Maker Contacts: {total_contacts:,}")
print(f"Unique Freight Companies Covered:     {unique_companies:,} of {total_target_orgs:,} ({unique_companies/total_target_orgs*100:.1f}%)")
print(f"Contacts with Direct Work Email:      {contacts_with_email:,} ({contacts_with_email/total_contacts*100:.1f}%)")
print(f"Contacts in Decision-Maker Roles:     {decision_makers:,} ({decision_makers/total_contacts*100:.1f}%)")
print(f"Contacts in Logistics / SCM Roles:    {logistics_titles:,} ({logistics_titles/total_contacts*100:.1f}%)")

print("\nTop 10 Supply Chain Job Titles in dataset:")
top_titles = con.execute(f"""
    SELECT job_title_normalized, count(*) as cnt
    FROM '{OUTPUT_CONTACTS_PARQUET}'
    WHERE is_logistics_role = true
    GROUP BY job_title_normalized
    ORDER BY cnt DESC
    LIMIT 10;
""").fetchall()
for t, cnt in top_titles:
    print(f"  - {t:<35} : {cnt:>7,}")

print("\nPipeline execution complete!")
