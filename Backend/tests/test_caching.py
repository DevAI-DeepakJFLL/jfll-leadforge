from pathlib import Path

from src.api.config import settings
from src.api.database import get_cached_parquet_path


def test_s3_multi_dataset_uri_generation():
    assert "apollo_freight_leads_zstd.parquet" in settings.s3_uri_for("apollo")
    assert "datamyne_leads_zstd.parquet" in settings.s3_uri_for("datamyne")
    assert "active_customers_leads_zstd.parquet" in settings.s3_uri_for("active")
    assert "inactive_customers_leads_zstd.parquet" in settings.s3_uri_for("inactive")

def test_cache_dir_configuration():
    assert isinstance(settings.cache_dir, Path)

def test_cached_parquet_path_local_resolution():
    path = get_cached_parquet_path("active")
    assert path.exists()
    assert path.suffix == ".parquet"
    assert "active_customers_leads_zstd.parquet" in str(path)

def test_cached_parquet_path_apollo_resolution():
    path = get_cached_parquet_path("apollo")
    assert path.exists()
    assert "apollo_freight_leads_zstd.parquet" in str(path)
