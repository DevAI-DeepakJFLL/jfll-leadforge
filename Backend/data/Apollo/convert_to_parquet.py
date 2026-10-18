import os
import sys
import time
import duckdb

CSV_PATH = "Apollo/Apollo_V7_V5_org_all_fields 6,071,657.csv"
OUTPUT_PARQUET = "Apollo/apollo_freight_leads.parquet"

print("================================================================")
print("JET FREIGHT LOGISTICS - APOLLO LEAD SOURCING PIPELINE")
print("================================================================")
print(f"Source CSV: {CSV_PATH}")
print(f"Target Parquet: {OUTPUT_PARQUET}")

con = duckdb.connect()
con.execute("PRAGMA threads=8;")
con.execute("PRAGMA memory_limit='8GB';")

start_time = time.time()

print("\nExecuting resilient cleaning, filtering, deduplication, and Parquet export...")

conversion_sql = f"""
COPY (
    WITH raw_extracted AS (
        SELECT 
            trim(organization_id) AS organization_id,
            trim(organization_name) AS organization_name,
            -- Normalized domain: lowercase, strip http(s)://, www., and trailing path
            lower(regexp_replace(regexp_replace(trim(organization_domain), '^https?://(www\.)?', ''), '/.*$', '')) AS domain,
            trim(organization_website_url) AS website_url,
            trim(organization_phone) AS phone,
            TRY_CAST(organization_num_current_employees AS INTEGER) AS employee_count,
            TRY_CAST(organization_revenue_in_thousands_int AS BIGINT) * 1000 AS revenue_usd,
            TRY_CAST(organization_founded_year AS SMALLINT) AS founded_year,
            -- Cleaned industry: unnest from ['...']
            trim(replace(replace(replace(organization_industries, chr(91)||chr(39), ''), chr(39)||chr(93), ''), chr(39), '')) AS industry,
            trim(organization_linkedin_specialties) AS specialties,
            trim(organization_relevant_keywords_str) AS keywords,
            trim(organization_current_technologies) AS technologies_raw,
            trim(job_functions) AS job_functions_json,
            trim(organization_linkedin_numerical_urls) AS linkedin_url,
            trim(organization_hq_location_city) AS hq_city,
            trim(organization_hq_location_state) AS hq_state,
            -- Standardize country names
            CASE 
                WHEN upper(trim(organization_hq_location_country)) IN ('US', 'USA') THEN 'United States'
                WHEN upper(trim(organization_hq_location_country)) IN ('UK', 'GB', 'GREAT BRITAIN') THEN 'United Kingdom'
                WHEN organization_hq_location_country IS NOT NULL AND trim(organization_hq_location_country) != '' 
                    THEN trim(organization_hq_location_country)
                ELSE NULL
            END AS hq_country,
            trim(organization_hq_location_postal_code) AS hq_postal_code,
            -- Completeness scoring for intelligent deduplication
            (CASE WHEN organization_website_url IS NOT NULL AND trim(organization_website_url) != '' THEN 2 ELSE 0 END +
             CASE WHEN organization_hq_location_city IS NOT NULL AND trim(organization_hq_location_city) != '' THEN 2 ELSE 0 END +
             CASE WHEN organization_hq_location_country IS NOT NULL AND trim(organization_hq_location_country) != '' THEN 2 ELSE 0 END +
             CASE WHEN organization_num_current_employees IS NOT NULL AND trim(organization_num_current_employees) != '' THEN 2 ELSE 0 END +
             CASE WHEN organization_revenue_in_thousands_int IS NOT NULL AND trim(organization_revenue_in_thousands_int) != '' THEN 2 ELSE 0 END +
             CASE WHEN organization_linkedin_numerical_urls IS NOT NULL AND trim(organization_linkedin_numerical_urls) != '' THEN 1 ELSE 0 END +
             CASE WHEN organization_linkedin_specialties IS NOT NULL AND trim(organization_linkedin_specialties) != '' THEN 1 ELSE 0 END
            ) AS completeness_score
        FROM read_csv('{CSV_PATH}',
                      delim='\\t',
                      header=true,
                      quote='',
                      escape='',
                      comment='',
                      null_padding=true,
                      all_varchar=true,
                      strict_mode=false,
                      ignore_errors=true)
        WHERE organization_name IS NOT NULL AND trim(organization_name) != ''
          AND organization_domain IS NOT NULL AND trim(organization_domain) != ''
          -- Valid non-empty phone number
          AND organization_phone IS NOT NULL AND trim(organization_phone) != ''
          AND trim(organization_phone) NOT IN ('0', 'None', 'null', 'n/a', 'unknown')
          -- Filter for 50 freight-active verticals
          AND trim(replace(replace(replace(organization_industries, chr(91)||chr(39), ''), chr(39)||chr(93), ''), chr(39), '')) IN (
              'transportation', 'wholesale', 'logistics & supply chain', 'food production', 
              'medical devices', 'pharmaceuticals', 'chemicals', 'mining & metals', 
              'international trade & development', 'import & export', 'maritime', 'textiles', 
              'airlines/aviation', 'aviation & aerospace', 'packaging & containers', 'plastics', 
              'warehousing', 'automotive', 'machinery', 'electrical/electronic manufacturing', 
              'consumer goods', 'consumer electronics', 'computer hardware', 'semiconductors', 
              'industrial automation', 'mechanical or industrial engineering', 'manufacturing', 
              'nanotechnology', 'defense & space', 'oil & energy', 'building materials', 
              'glass, ceramics & concrete', 'paper & forest products', 'environmental services & clean energy', 
              'food & beverages', 'wine & spirits', 'dairy', 'fishery', 'farming', 'ranching', 
              'tobacco', 'agriculture', 'supermarkets', 'biotechnology', 'retail', 
              'apparel & fashion', 'sporting goods', 'luxury goods & jewelry', 'furniture', 
              'cosmetics', 'events services', 'telecommunications', 'printing', 'business supplies & equipment', 
              'civil engineering', 'construction'
          )
    ),
    deduplicated AS (
        SELECT 
            organization_id,
            organization_name,
            domain,
            website_url,
            phone,
            employee_count,
            revenue_usd,
            founded_year,
            industry,
            specialties,
            keywords,
            technologies_raw,
            job_functions_json,
            linkedin_url,
            hq_city,
            hq_state,
            hq_country,
            hq_postal_code,
            ROW_NUMBER() OVER (
                PARTITION BY domain 
                ORDER BY completeness_score DESC, 
                         employee_count DESC NULLS LAST, 
                         revenue_usd DESC NULLS LAST, 
                         organization_id
            ) as rn
        FROM raw_extracted
    )
    SELECT 
        organization_id,
        organization_name,
        domain,
        website_url,
        phone,
        employee_count,
        revenue_usd,
        founded_year,
        industry,
        specialties,
        keywords,
        technologies_raw,
        job_functions_json,
        linkedin_url,
        hq_city,
        hq_state,
        hq_country,
        hq_postal_code
    FROM deduplicated
    WHERE rn = 1
) TO '{OUTPUT_PARQUET}' (
    FORMAT PARQUET, 
    COMPRESSION 'ZSTD', 
    ROW_GROUP_SIZE 100000
);
"""

con.execute(conversion_sql)
elapsed = time.time() - start_time

file_size_bytes = os.path.getsize(OUTPUT_PARQUET)
file_size_mb = file_size_bytes / (1024 * 1024)

print(f"\nSUCCESS! Parquet file generated in {elapsed:.2f} seconds.")
print(f"File Path: {OUTPUT_PARQUET}")
print(f"File Size: {file_size_mb:.2f} MB ({file_size_bytes:,} bytes)")

# Audit the final Parquet file
print("\nAuditing final Parquet file...")
total_rows = con.execute(f"SELECT count(*) FROM '{OUTPUT_PARQUET}'").fetchone()[0]
unique_domains = con.execute(f"SELECT count(distinct domain) FROM '{OUTPUT_PARQUET}'").fetchone()[0]
unique_ids = con.execute(f"SELECT count(distinct organization_id) FROM '{OUTPUT_PARQUET}'").fetchone()[0]

print(f"Total Freight Leads: {total_rows:,}")
print(f"Unique Domains: {unique_domains:,} (100% deduplicated)")
print(f"Unique Organization IDs: {unique_ids:,}")

print("\nTop 10 Countries in final dataset:")
top_c = con.execute(f"""
    SELECT COALESCE(hq_country, 'Unknown') as country, count(*) as cnt, round(count(*) * 100.0 / {total_rows}, 2) as pct
    FROM '{OUTPUT_PARQUET}'
    GROUP BY country
    ORDER BY cnt DESC
    LIMIT 10;
""").fetchall()
for c, cnt, pct in top_c:
    print(f"  - {c:<25} : {cnt:>8,} ({pct:>5.1f}%)")

print("\nTop 10 Freight Industries in final dataset:")
top_i = con.execute(f"""
    SELECT industry, count(*) as cnt, round(count(*) * 100.0 / {total_rows}, 2) as pct
    FROM '{OUTPUT_PARQUET}'
    GROUP BY industry
    ORDER BY cnt DESC
    LIMIT 10;
""").fetchall()
for ind, cnt, pct in top_i:
    print(f"  - {ind:<35} : {cnt:>8,} ({pct:>5.1f}%)")

print("\nSample clean record:")
sample_rec = con.execute(f"SELECT * FROM '{OUTPUT_PARQUET}' LIMIT 1").fetchone()
cols = [r[0] for r in con.execute(f"DESCRIBE SELECT * FROM '{OUTPUT_PARQUET}'").fetchall()]
for col_name, val in zip(cols, sample_rec):
    print(f"  {col_name:<25}: {val}")

print("\nPipeline execution complete!")
