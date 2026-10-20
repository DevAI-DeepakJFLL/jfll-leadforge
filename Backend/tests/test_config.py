from pathlib import Path

import pytest

from src.api.config import Settings, settings


def test_s3_multi_dataset_uri_generation():
    assert "apollo_freight_leads_zstd.parquet" in settings.s3_uri_for("apollo")
    assert "datamyne_leads_zstd.parquet" in settings.s3_uri_for("datamyne")
    assert "active_customers_leads_zstd.parquet" in settings.s3_uri_for("active")
    assert "inactive_customers_leads_zstd.parquet" in settings.s3_uri_for("inactive")
    assert settings.s3_bucket == "jfll-leadforge-data"


def test_cache_dir_configuration():
    assert isinstance(settings.cache_dir, Path)


def test_production_security_validation_fails_on_default_secret():
    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        Settings(env="production", auth_secret_key=Settings.DEFAULT_INSECURE_SECRET)


def test_production_security_validation_passes_with_secure_secret():
    prod_settings = Settings(
        env="production",
        auth_secret_key="prod-super-secure-high-entropy-secret-key-998877",
    )
    assert prod_settings.auth_secret_key == "prod-super-secure-high-entropy-secret-key-998877"
    assert prod_settings.env == "production"


def test_local_environment_allows_default_secret():
    local_settings = Settings(env="local")
    assert local_settings.auth_secret_key == Settings.DEFAULT_INSECURE_SECRET

