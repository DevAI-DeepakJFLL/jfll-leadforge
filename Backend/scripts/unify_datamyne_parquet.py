"""
ETL script to unify Brazil DataMyne corridor leads into the main DataMyne Parquet datasets.
Ensures:
1. All existing records (37,273) have country = "India".
2. Brazil records (2,808) are merged with their respective country ("Brazil" or "India").
3. Datasets updated:
   - Backend/data/processed/datamyne_leads_zstd.parquet (40,081 rows)
   - Backend/data/processed/datamyne_valid_leads_zstd.parquet (20,942 rows)
   - Backend/data/processed/datamyne_missing_leads_zstd.parquet (19,139 rows)
   - Backend/data/processed/datamyne_leads.csv (40,081 rows)
   - Backend/data/processed/datamyne_brazil_leads_zstd.parquet (2,808 rows)
"""

import shutil
import time
from pathlib import Path
import pandas as pd


def unify_datamyne_datasets():
    start_time = time.time()
    backend_root = Path(__file__).resolve().parent.parent
    processed_dir = backend_root / "data" / "processed"
    brazil_dir = backend_root / "data" / "brazil" / "processed"
    backup_dir = backend_root / "data" / ".backups" / "pre_brazil"

    print("=" * 70)
    print("STARTING DATAMYNE BRAZIL UNIFICATION PIPELINE")
    print("=" * 70)

    # 1. Source files
    brazil_parquet = brazil_dir / "datamyne_brazil_leads_zstd.parquet"
    if not brazil_parquet.exists():
        raise FileNotFoundError(f"Brazil parquet not found at {brazil_parquet}")

    # Ensure processed copy of brazil parquet exists
    processed_brazil_parquet = processed_dir / "datamyne_brazil_leads_zstd.parquet"
    if not processed_brazil_parquet.exists() or processed_brazil_parquet.stat().st_size != brazil_parquet.stat().st_size:
        shutil.copy2(brazil_parquet, processed_brazil_parquet)
        print(f"✓ Copied Brazil parquet to {processed_brazil_parquet}")

    # Read Brazil data
    df_brazil = pd.read_parquet(brazil_parquet)
    print(f"Loaded {len(df_brazil):,} Brazil leads (valid: {len(df_brazil[df_brazil['dataset_type'] == 'valid']):,}, missing: {len(df_brazil[df_brazil['dataset_type'] == 'missing']):,})")

    # Target column order
    target_columns = [
        "id",
        "company_name",
        "country",
        "role",
        "transport_mode",
        "category",
        "subcategory",
        "contact_type",
        "phone",
        "email",
        "tax_id",
        "city",
        "address",
        "pin_code",
        "directors",
        "trade_lanes",
        "top_hs_codes",
        "total_shipments",
        "total_value_usd",
        "latest_activity_date",
        "dataset_type",
    ]

    # Ensure df_brazil has target columns
    for col in target_columns:
        if col not in df_brazil.columns:
            df_brazil[col] = ""
    df_brazil = df_brazil[target_columns]

    # Read base datasets (prefer pre_brazil backup to ensure idempotency)
    base_val_path = backup_dir / "datamyne_valid_leads_zstd.parquet" if backup_dir.exists() and (backup_dir / "datamyne_valid_leads_zstd.parquet").exists() else processed_dir / "datamyne_valid_leads_zstd.parquet"
    base_mis_path = backup_dir / "datamyne_missing_leads_zstd.parquet" if backup_dir.exists() and (backup_dir / "datamyne_missing_leads_zstd.parquet").exists() else processed_dir / "datamyne_missing_leads_zstd.parquet"

    df_val_base = pd.read_parquet(base_val_path)
    # If base already contains Brazil rows, filter them out before re-merging
    if "country" in df_val_base.columns:
        df_val_base = df_val_base[~df_val_base["id"].str.startswith("dm-bra-")]
    df_val_base["country"] = "India"
    for col in target_columns:
        if col not in df_val_base.columns:
            df_val_base[col] = ""
    df_val_base = df_val_base[target_columns]

    df_mis_base = pd.read_parquet(base_mis_path)
    if "country" in df_mis_base.columns:
        df_mis_base = df_mis_base[~df_mis_base["id"].str.startswith("dm-bra-")]
    df_mis_base["country"] = "India"
    for col in target_columns:
        if col not in df_mis_base.columns:
            df_mis_base[col] = ""
    df_mis_base = df_mis_base[target_columns]

    print(f"Base Valid rows (India): {len(df_val_base):,}")
    print(f"Base Missing rows (India): {len(df_mis_base):,}")

    # Split Brazil into valid and missing
    df_brazil_val = df_brazil[df_brazil["dataset_type"] == "valid"].copy()
    df_brazil_mis = df_brazil[df_brazil["dataset_type"] == "missing"].copy()

    # Concatenate unified sets
    df_val_unified = pd.concat([df_val_base, df_brazil_val], ignore_index=True)
    df_mis_unified = pd.concat([df_mis_base, df_brazil_mis], ignore_index=True)
    df_all_unified = pd.concat([df_val_unified, df_mis_unified], ignore_index=True)

    # Standardize data types
    for df in [df_val_unified, df_mis_unified, df_all_unified]:
        df["total_shipments"] = pd.to_numeric(df["total_shipments"], errors="coerce").fillna(0).astype("int64")
        df["total_value_usd"] = pd.to_numeric(df["total_value_usd"], errors="coerce").fillna(0.0).astype("float64")
        for col in target_columns:
            if col not in ["total_shipments", "total_value_usd"]:
                df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) and str(x).strip() not in ["None", "nan"] else "")

    # Export to Parquet
    val_out = processed_dir / "datamyne_valid_leads_zstd.parquet"
    mis_out = processed_dir / "datamyne_missing_leads_zstd.parquet"
    all_out = processed_dir / "datamyne_leads_zstd.parquet"
    csv_out = processed_dir / "datamyne_leads.csv"

    print("\nExporting unified Parquet files with ZSTD compression...")
    df_val_unified.to_parquet(val_out, engine="pyarrow", compression="zstd", index=False)
    print(f"  ✓ {val_out.name}: {len(df_val_unified):,} rows ({val_out.stat().st_size / 1024:.1f} KB)")

    df_mis_unified.to_parquet(mis_out, engine="pyarrow", compression="zstd", index=False)
    print(f"  ✓ {mis_out.name}: {len(df_mis_unified):,} rows ({mis_out.stat().st_size / 1024:.1f} KB)")

    df_all_unified.to_parquet(all_out, engine="pyarrow", compression="zstd", index=False)
    print(f"  ✓ {all_out.name}: {len(df_all_unified):,} rows ({all_out.stat().st_size / 1024:.1f} KB)")

    df_all_unified.to_csv(csv_out, index=False, encoding="utf-8-sig")
    print(f"  ✓ {csv_out.name}: {len(df_all_unified):,} rows ({csv_out.stat().st_size / (1024*1024):.2f} MB)")

    print("=" * 70)
    print(f"UNIFICATION COMPLETED IN {time.time() - start_time:.2f}s")
    print("=" * 70)


if __name__ == "__main__":
    unify_datamyne_datasets()
