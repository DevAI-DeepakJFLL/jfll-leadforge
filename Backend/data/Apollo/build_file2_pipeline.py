import os
import sys
import time
import duckdb

CSV_PEOPLE_PATH = "Apollo/Apollo_V7_V5_per_all_fields 93,239,628.csv"
PARQUET_COMPANIES_PATH = "Apollo/apollo_freight_leads.parquet"
OUTPUT_FILE_2 = "Apollo/apollo_freight_contacts_without_company_profile.parquet"

print("=================================================================")
print("GENERATING FILE 2: FREIGHT CONTACTS WITHOUT COMPANY PROFILE")
print("=================================================================")
print(f"Source 93.2M People CSV: {CSV_PEOPLE_PATH}")
print(f"Target Companies DB:     {PARQUET_COMPANIES_PATH}")
print(f"Output File 2 Parquet:   {OUTPUT_FILE_2}")

con = duckdb.connect()
con.execute("PRAGMA threads=8;")
con.execute("PRAGMA memory_limit='8GB';")

print("\nStep 1: Loading target company IDs into memory...")
con.execute(f"""
    CREATE TEMP TABLE target_companies AS
    SELECT organization_id
    FROM '{PARQUET_COMPANIES_PATH}';
""")

print("\nStep 2: Streaming 93.2M contacts and extracting freight roles outside company DB...")
start_time = time.time()

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
            trim(sanitized_organization_name_unanalyzed) AS employer_name,
            regexp_extract(current_organization_ids, '[0-9a-f]{{24}}') AS raw_organization_id,
            -- Flags
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
        person_id,
        person_name,
        first_name,
        last_name,
        job_title,
        job_title_normalized,
        seniority,
        department,
        email,
        email_status,
        email_confidence,
        linkedin_url,
        contact_city,
        contact_state,
        contact_country,
        employer_name,
        raw_organization_id,
        is_decision_maker,
        is_logistics_role,
        has_email
    FROM people_stream
    WHERE (raw_organization_id IS NULL OR raw_organization_id NOT IN (SELECT organization_id FROM target_companies))
      AND is_logistics_role = true
) TO '{OUTPUT_FILE_2}' (
    FORMAT PARQUET, 
    COMPRESSION 'ZSTD', 
    ROW_GROUP_SIZE 100000
);
"""

con.execute(pipeline_sql)
elapsed = time.time() - start_time

file_size_bytes = os.path.getsize(OUTPUT_FILE_2)
file_size_mb = file_size_bytes / (1024 * 1024)

print(f"\nSUCCESS! File 2 generated in {elapsed:.2f} seconds ({elapsed/60:.2f} minutes).")
print(f"File Path: {OUTPUT_FILE_2}")
print(f"File Size: {file_size_mb:.2f} MB ({file_size_bytes:,} bytes)")

total_unmatched_freight = con.execute(f"SELECT count(*) FROM '{OUTPUT_FILE_2}'").fetchone()[0]
with_email = con.execute(f"SELECT count(*) FROM '{OUTPUT_FILE_2}' WHERE has_email = true").fetchone()[0]
unique_employers = con.execute(f"SELECT count(distinct employer_name) FROM '{OUTPUT_FILE_2}' WHERE employer_name IS NOT NULL").fetchone()[0]

print(f"Total Freight Decision-Makers (Without Company Profile): {total_unmatched_freight:,}")
print(f"Unique Employer Names Captured:                         {unique_employers:,}")
print(f"Contacts with Direct Work Email:                        {with_email:,} ({with_email/total_unmatched_freight*100:.1f}%)")
print("Pipeline execution complete!")
