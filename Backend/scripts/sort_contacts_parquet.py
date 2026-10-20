#!/usr/bin/env python3
"""
ETL script to sort Apollo contacts Parquet dataset by organization_id,
optimizing row-group skipping for serverless S3 DuckDB queries.
"""
import argparse
import sys
import time
from pathlib import Path
from typing import Optional
import duckdb


def sort_parquet_dataset(
    input_path: str,
    output_path: str,
    row_group_size: int = 100000,
    compression: str = "ZSTD"
) -> None:
    """
    Sorts a Parquet file by organization_id, is_decision_maker DESC, person_id.
    Writes out sorted dataset with specified row group size and Zstandard compression.
    """
    start = time.time()
    in_p = Path(input_path)
    out_p = Path(output_path)
    
    if not in_p.exists():
        raise FileNotFoundError(f"Source Parquet file not found at: {input_path}")
        
    print(f"[*] Sorting {input_path} -> {output_path} (row group size: {row_group_size:,}, compression: {compression})...")
    out_p.parent.mkdir(parents=True, exist_ok=True)
    
    con = duckdb.connect()
    con.execute("SET preserve_insertion_order = false;")
    
    query = f"""
        COPY (
            SELECT * FROM '{input_path}'
            ORDER BY organization_id, is_decision_maker DESC, person_id
        ) TO '{output_path}' (
            FORMAT PARQUET,
            COMPRESSION {compression},
            ROW_GROUP_SIZE {row_group_size}
        );
    """
    con.execute(query)
    duration = time.time() - start
    print(f"[+] Sorting completed successfully in {duration:.2f} seconds.")


def main() -> None:
    """CLI entrypoint for dataset sorting."""
    parser = argparse.ArgumentParser(description="Sort Apollo contacts Parquet dataset for row-group pruning.")
    base_dir = Path(__file__).resolve().parent.parent / "data" / "Apollo"
    default_input = base_dir / "apollo_freight_contacts_with_company_profile.parquet"
    default_output = base_dir / "apollo_freight_contacts_with_company_profile_sorted.parquet"
    
    parser.add_argument("--input", default=str(default_input), help="Input parquet path")
    parser.add_argument("--output", default=str(default_output), help="Output sorted parquet path")
    parser.add_argument("--row-group-size", type=int, default=100000, help="Parquet row group size")
    parser.add_argument("--compression", default="ZSTD", help="Parquet compression codec (default: ZSTD)")
    args = parser.parse_args()
    
    sort_parquet_dataset(
        input_path=args.input,
        output_path=args.output,
        row_group_size=args.row_group_size,
        compression=args.compression
    )


if __name__ == "__main__":
    main()

