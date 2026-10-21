import sys
from pathlib import Path
import pytest
import pandas as pd

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from src.etl.brazil_datamyne_etl import (
    clean_phone,
    clean_unicode,
    derive_category_subcategory,
    extract_and_transform_brazil_data,
    load_active_customers,
    norm_email,
    norm_name,
    NOISE_NAMES,
)


def test_norm_name():
    assert norm_name("M/S ABC Logistics Pvt Ltd") == "ABCLOGISTICSPRIVATELIMITED"
    assert norm_name("  São Paulo Comércio Ltda.  ") == "SAOPAULOCOMERCIOLTDA"
    assert norm_name("EMS S.A.") == "EMSSA"
    assert norm_name("") == ""
    assert norm_name(None) == ""


def test_clean_phone():
    assert clean_phone("+55 11 99999-9999") == "+55 11 99999-9999"
    assert clean_phone("nan") == ""
    assert clean_phone("None") == ""
    assert clean_phone(None) == ""


def test_norm_email():
    assert norm_email("test@example.com") == ["test@example.com"]
    emails = norm_email("a@b.com; c@d.com, invalid-email")
    assert "a@b.com" in emails
    assert "c@d.com" in emails
    assert len(emails) == 2
    assert norm_email("") == []
    assert norm_email("notanemail") == []


def test_derive_category_subcategory():
    cat, subcat = derive_category_subcategory(["300490"])
    assert cat == "Pharma & Healthcare"
    assert subcat == "Pharmaceutical Formulations"

    cat, subcat = derive_category_subcategory(["8471"])
    assert cat == "Engineering & Machinery"
    assert subcat == "Industrial Machinery & Boilers"

    cat, subcat = derive_category_subcategory(["9999"])
    assert cat == "General Cargo"
    assert subcat == "General Cargo (Trade)"


def test_noise_token_rejection():
    # 1- and 2-letter tokens must have normalized length < 3
    for token in ["Z", "S", "TO", "NA", "PA", "NG", "A", "BR"]:
        nn = norm_name(token)
        assert len(nn) < 3, f"Token {token} should have normalized length < 3"

    # Known placeholder noise tokens
    for placeholder in ["NOT DECLARED", "TO THE ORDER", "SAME AS CONSIGNEE"]:
        nn = norm_name(placeholder)
        assert nn in NOISE_NAMES or len(nn) < 3, f"Placeholder {placeholder} not caught"


@pytest.fixture(scope="module")
def brazil_df():
    return extract_and_transform_brazil_data()


def test_extract_and_transform_brazil_data(brazil_df):
    df = brazil_df
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 500  # Expect over 2,000 unified Brazil-related leads

    # Check expected schema columns
    expected_cols = [
        "id", "company_name", "country", "role", "transport_mode",
        "category", "subcategory", "contact_type", "phone", "email",
        "tax_id", "city", "address", "pin_code", "directors",
        "trade_lanes", "top_hs_codes", "total_shipments", "total_value_usd",
        "latest_activity_date", "dataset_type"
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column: {col}"

    # Check country distribution
    countries = set(df["country"].unique())
    assert "Brazil" in countries
    assert "India" in countries

    # Check valid contact classification
    valid_leads = df[df["dataset_type"] == "valid"]
    assert len(valid_leads) > 0
    for _, row in valid_leads.iterrows():
        assert bool(row["phone"]) or bool(row["email"]), f"Valid lead {row['company_name']} has no phone or email"

    # Check category distribution adheres to standard taxonomy
    valid_categories = {
        "Perishables", "Pharma & Healthcare", "Textiles & Apparel",
        "Engineering & Machinery", "Chemicals & Materials",
        "Electronics & Electrical", "Automotive & EV", "General Cargo"
    }
    for cat in df["category"].unique():
        assert cat in valid_categories, f"Invalid category: {cat}"


def test_cisco_systems_not_enriched_with_ems(brazil_df):
    df = brazil_df
    cisco_leads = df[df["company_name"].str.contains("CISCO SYSTEMS", case=False, na=False)]
    if not cisco_leads.empty:
        for _, row in cisco_leads.iterrows():
            email = str(row.get("email", ""))
            phone = str(row.get("phone", ""))
            assert "ems.com.br" not in email, f"CISCO SYSTEMS polluted with EMS email: {email}"
            assert "3887-9800" not in phone, f"CISCO SYSTEMS polluted with EMS phone: {phone}"


def test_active_customer_exclusion(brazil_df):
    df = brazil_df
    base_dir = Path(backend_dir).parent
    active_customers = load_active_customers(base_dir)
    lead_norm_names = {norm_name(name) for name in df["company_name"]}
    overlap = lead_norm_names.intersection(active_customers)
    assert len(overlap) == 0, f"Active customers found in leads: {overlap}"


def test_output_files_exist_on_disk():
    brazil_dir = Path(backend_dir) / "data" / "brazil" / "processed"
    parquet_path = brazil_dir / "datamyne_brazil_leads_zstd.parquet"
    excel_path = brazil_dir / "Master_Cleaned_Brazil_Contacts_Directory.xlsx"
    assert parquet_path.exists(), f"Missing Parquet output at {parquet_path}"
    assert excel_path.exists(), f"Missing Excel output at {excel_path}"
    assert parquet_path.stat().st_size > 50_000, "Parquet file too small"
    assert excel_path.stat().st_size > 100_000, "Excel file too small"
