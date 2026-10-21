import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from src.api.config import settings
from src.api.database import get_cached_parquet_path, get_db_connection


def test_brazil_parquet_registration():
    assert "datamyne_brazil" in settings.DATASET_FILES
    assert settings.DATASET_FILES["datamyne_brazil"] == "datamyne_brazil_leads_zstd.parquet"
    assert "datamyne_brazil_leads_zstd.parquet" in settings.s3_uri_for("datamyne_brazil")
    assert settings.get_dataset_filename("datamyne_brazil") == "datamyne_brazil_leads_zstd.parquet"


def test_brazil_parquet_file_locations():
    brazil_src = Path(backend_dir) / "data" / "brazil" / "processed" / "datamyne_brazil_leads_zstd.parquet"
    processed_dst = Path(backend_dir) / "data" / "processed" / "datamyne_brazil_leads_zstd.parquet"

    assert brazil_src.exists(), f"Source file {brazil_src} must exist"
    assert processed_dst.exists(), f"Target file {processed_dst} must exist"

    con = get_db_connection()
    cnt_src = con.execute(f"SELECT count(*) FROM '{brazil_src}'").fetchone()[0]
    cnt_dst = con.execute(f"SELECT count(*) FROM '{processed_dst}'").fetchone()[0]
    assert cnt_src == 2808
    assert cnt_dst == 2808


def test_cached_parquet_path_datamyne_brazil():
    path = get_cached_parquet_path("datamyne_brazil")
    assert path.exists()
    assert path.name == "datamyne_brazil_leads_zstd.parquet"


def test_unified_datamyne_leads_contains_brazil():
    con = get_db_connection()
    parquet_path = Path(backend_dir) / "data" / "processed" / "datamyne_leads_zstd.parquet"
    assert parquet_path.exists()

    res_brazil = con.execute(
        f"SELECT count(*) FROM '{parquet_path}' WHERE country = 'Brazil'"
    ).fetchone()[0]
    assert res_brazil > 0, "Expected Brazil leads in unified datamyne parquet"
    assert res_brazil == 1302, f"Expected 1,302 Brazil leads, got {res_brazil}"

    res_india = con.execute(
        f"SELECT count(*) FROM '{parquet_path}' WHERE country = 'India'"
    ).fetchone()[0]
    assert res_india == 38779, f"Expected 38,779 India leads (37,273 + 1,506), got {res_india}"

    res_null = con.execute(
        f"SELECT count(*) FROM '{parquet_path}' WHERE country IS NULL OR country = ''"
    ).fetchone()[0]
    assert res_null == 0, f"Expected 0 leads without country, got {res_null}"

    total_rows = con.execute(f"SELECT count(*) FROM '{parquet_path}'").fetchone()[0]
    assert total_rows == 40081, f"Expected 40,081 total leads (37,273 + 2,808), got {total_rows}"


def test_valid_and_missing_datamyne_parquets_unified():
    con = get_db_connection()
    valid_path = Path(backend_dir) / "data" / "processed" / "datamyne_valid_leads_zstd.parquet"
    missing_path = Path(backend_dir) / "data" / "processed" / "datamyne_missing_leads_zstd.parquet"

    assert valid_path.exists()
    assert missing_path.exists()

    # Valid leads checks
    cnt_val = con.execute(f"SELECT count(*) FROM '{valid_path}'").fetchone()[0]
    cnt_val_brazil = con.execute(f"SELECT count(*) FROM '{valid_path}' WHERE country = 'Brazil'").fetchone()[0]
    cnt_val_null = con.execute(f"SELECT count(*) FROM '{valid_path}' WHERE country IS NULL OR country = ''").fetchone()[0]
    assert cnt_val == 20942, f"Expected 20,942 valid leads (19,760 + 1,182), got {cnt_val}"
    assert cnt_val_brazil > 0
    assert cnt_val_null == 0

    # Missing leads checks
    cnt_mis = con.execute(f"SELECT count(*) FROM '{missing_path}'").fetchone()[0]
    cnt_mis_brazil = con.execute(f"SELECT count(*) FROM '{missing_path}' WHERE country = 'Brazil'").fetchone()[0]
    cnt_mis_null = con.execute(f"SELECT count(*) FROM '{missing_path}' WHERE country IS NULL OR country = ''").fetchone()[0]
    assert cnt_mis == 19139, f"Expected 19,139 missing leads (17,513 + 1,626), got {cnt_mis}"
    assert cnt_mis_brazil > 0
    assert cnt_mis_null == 0
