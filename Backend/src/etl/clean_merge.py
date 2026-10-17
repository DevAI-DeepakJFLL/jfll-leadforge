"""
ETL Pipeline for Active Customer Lead Database.
Cleans, normalizes, deduplicates, and formats Active Customer leads.
Produces active_customers_leads.csv and active_customers_leads_zstd.parquet.
"""

from pathlib import Path
import re
import unicodedata
import pandas as pd


def clean_unicode(text: object) -> str:
    """Normalize unicode characters, replacing non-breaking spaces and artifacts."""
    if not isinstance(text, str):
        text = str(text) if pd.notna(text) else ""
    text = text.replace("\xa0", " ").replace("Â", " ")
    text = unicodedata.normalize("NFKD", text)
    return re.sub(r"\s+", " ", text).strip()


def clean_company_name(name: str) -> str:
    """Clean company name: strip M/S prefixes and standardize legal entity suffixes."""
    cleaned = clean_unicode(name)
    cleaned = re.sub(r"^(M/S\.?|MESSRS\.?|M/S\s+|MS\.)\s*", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"\bPVT\.?\s*LTD\.?\b", "PRIVATE LIMITED", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bLTD\.?\b", "LIMITED", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", cleaned).strip()


def generate_alnum_key(name: str) -> str:
    """Generate alphanumeric key ignoring punctuation and casing for deduplication."""
    return re.sub(r"[^A-Z0-9]", "", str(name).upper())


def clean_contact_person(name: object) -> str:
    """Strip salutations (Mr., Ms., Dr., etc.) and return Title Case personal name."""
    if pd.isna(name):
        return ""
    cleaned = clean_unicode(name)
    if cleaned in ["-", "--", "N/A", "NA", "nan"]:
        return ""
    cleaned = re.sub(r"^(mr|ms|mrs|dr|prof|shri|smt)\.?\s+", "", cleaned, flags=re.IGNORECASE).strip()
    return " ".join(word.capitalize() for word in cleaned.split())


def clean_mobile_number(phone: object) -> str:
    """Standardize phone numbers with +91- or international prefix; strip placeholders."""
    if pd.isna(phone):
        return ""
    raw = str(phone).strip()
    if raw in ["-", "--", "---", "+91-", "+91", "N/A", "NA", "nan", "null", "none"]:
        return ""
    if raw.endswith(".0") and raw[:-2].isdigit():
        raw = raw[:-2]
    cleaned = clean_unicode(raw)
    if cleaned.startswith("-") and len(cleaned) > 1 and cleaned[1:].isdigit():
        cleaned = cleaned[1:]
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) < 5 or digits == "91":
        return ""
    if len(cleaned) == 10 and cleaned.isdigit():
        return f"+91-{cleaned}"
    if len(digits) == 12 and digits.startswith("91") and not cleaned.startswith("+"):
        return f"+91-{digits[2:]}"
    return cleaned


def clean_email_address(email: object) -> str:
    """Strip mailto:, trailing whitespace, and force lowercase."""
    if pd.isna(email):
        return ""
    raw = str(email).strip().lower()
    if raw in ["-", "--", "N/A", "NA", "nan", "none"]:
        return ""
    cleaned = clean_unicode(raw).replace(" ", "")
    return re.sub(r"^mailto:", "", cleaned)


def process_active_leads(
    input_csv: Path,
    output_dir: Path,
) -> pd.DataFrame:
    """Deduplicate and output active customer leads as CSV and ZSTD Parquet."""
    df = pd.read_csv(input_csv)

    # Clean fields
    df["Full Name"] = df["Full Name"].apply(clean_company_name)
    df["Contact Person Name"] = df["Contact Person Name"].apply(clean_contact_person)
    df["Mobile Number"] = df["Mobile Number"].apply(clean_mobile_number)
    df["Email"] = df["Email"].apply(clean_email_address)

    # Deduplicate by alphanumeric key
    df["alnum_key"] = df["Full Name"].apply(generate_alnum_key)

    def resolve_group(grp: pd.DataFrame) -> pd.Series:
        if len(grp) == 1:
            return grp.iloc[0]
        sorted_grp = grp.sort_values(
            by=["Email", "Mobile Number"],
            key=lambda col: col.map(lambda x: 1 if pd.notna(x) and str(x) != "nan" and str(x) != "" else 0),
            ascending=False,
        )
        return sorted_grp.iloc[0]

    deduped = df.groupby("alnum_key", as_index=False, group_keys=False).apply(resolve_group)
    deduped = deduped.drop(columns=["alnum_key"]).sort_values("Full Name").reset_index(drop=True)

    # Filter: Remove records where both Phone Number and Email are missing
    has_phone = deduped["Mobile Number"].notna() & (deduped["Mobile Number"].astype(str).str.strip() != "") & (deduped["Mobile Number"].astype(str).str.strip() != "nan")
    has_email = deduped["Email"].notna() & (deduped["Email"].astype(str).str.strip() != "") & (deduped["Email"].astype(str).str.strip() != "nan")
    deduped = deduped[has_phone | has_email].copy().reset_index(drop=True)

    target_columns = [
        "Full Name",
        "Territory",
        "Contact Person Name",
        "Mobile Number",
        "Email",
        "Status",
        "Customer Group",
        "Type"
    ]
    final_df = deduped[target_columns].copy()

    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "active_customers_leads.csv"
    zstd_path = output_dir / "active_customers_leads_zstd.parquet"

    final_df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    final_df.to_parquet(zstd_path, engine="pyarrow", compression="zstd", index=False)

    return final_df


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    process_active_leads(
        input_csv=base_dir / "data" / "processed" / "active_customers_leads.csv",
        output_dir=base_dir / "data" / "processed",
    )
