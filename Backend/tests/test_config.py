from pathlib import Path
from src.api.config import settings


def test_s3_multi_dataset_uri_generation():
    assert "apollo_freight_leads_zstd.parquet" in settings.s3_uri_for("apollo")
    assert "datamyne_leads_zstd.parquet" in settings.s3_uri_for("datamyne")
    assert "active_customers_leads_zstd.parquet" in settings.s3_uri_for("active")
    assert "inactive_customers_leads_zstd.parquet" in settings.s3_uri_for("inactive")
    assert settings.s3_bucket == "jfll-leadforge-data"


def test_cache_dir_configuration():
    assert isinstance(settings.cache_dir, Path)
