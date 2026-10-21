"""
Export unified DataMyne Parquet dataset (40,081 records) to Frontend JSON files:
- Frontend/public/data/datamyne_leads.json
- Frontend/dist/data/datamyne_leads.json (if dist exists)
"""
import time
from pathlib import Path
import json
import pandas as pd


def export_datamyne_json():
    start_time = time.time()
    backend_root = Path(__file__).resolve().parent.parent
    project_root = backend_root.parent
    parquet_path = backend_root / "data" / "processed" / "datamyne_leads_zstd.parquet"

    if not parquet_path.exists():
        raise FileNotFoundError(f"Parquet file not found: {parquet_path}")

    print(f"Reading {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    print(f"Loaded {len(df):,} records with columns: {list(df.columns)}")

    # Fill NAs
    df["total_shipments"] = pd.to_numeric(df["total_shipments"], errors="coerce").fillna(0).astype("int64")
    df["total_value_usd"] = pd.to_numeric(df["total_value_usd"], errors="coerce").fillna(0.0).astype("float64")
    for col in df.columns:
        if col not in ["total_shipments", "total_value_usd"]:
            df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) and str(x).strip() not in ["None", "nan"] else "")

    records = df.to_dict(orient="records")

    # Destination 1: Frontend/public/data/datamyne_leads.json
    pub_dir = project_root / "Frontend" / "public" / "data"
    pub_dir.mkdir(parents=True, exist_ok=True)
    pub_file = pub_dir / "datamyne_leads.json"

    print(f"Writing to {pub_file}...")
    with open(pub_file, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False)
    print(f"✓ Wrote {len(records):,} records to {pub_file} ({pub_file.stat().st_size / (1024*1024):.2f} MB)")

    # Destination 2: Frontend/dist/data/datamyne_leads.json (if dist exists)
    dist_dir = project_root / "Frontend" / "dist" / "data"
    if dist_dir.exists():
        dist_file = dist_dir / "datamyne_leads.json"
        print(f"Writing to {dist_file}...")
        with open(dist_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False)
        print(f"✓ Wrote {len(records):,} records to {dist_file} ({dist_file.stat().st_size / (1024*1024):.2f} MB)")

    print(f"Export completed in {time.time() - start_time:.2f}s")


if __name__ == "__main__":
    export_datamyne_json()
