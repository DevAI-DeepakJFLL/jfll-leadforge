import re
from typing import Any

from fastapi import HTTPException
from fastapi.params import Query as QueryType

from src.api.auth import verify_token
from src.api.config import settings


def require_auth(authorization: str | None, resource_name: str = "leads") -> dict[str, Any]:
    """
    Validates Bearer token if provided, and enforces authentication in production environments.
    Returns the decoded user payload or empty dict in local non-production environments without token.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        return user
    elif settings.env == "production":
        raise HTTPException(status_code=401, detail=f"Authentication required to access {resource_name}")
    return {}


def normalize_query(val: Any, default: Any = None) -> Any:
    """
    Normalizes FastAPI Query default instances into standard Python values
    when endpoint functions are invoked directly in unit tests or scripts.
    """
    return default if isinstance(val, QueryType) else val


def parse_csv_query_param(val: str | None) -> list[str]:
    """
    Safely parses a comma-separated query parameter string into clean, trimmed lowercase tokens.
    Returns an empty list if None or whitespace.
    """
    if not val or not isinstance(val, str) or not val.strip():
        return []
    return [token.strip().lower() for token in val.split(",") if token.strip()]


CORPORATE_SUFFIX_REGEX = re.compile(
    r"\b(inc|corp|corporation|llc|ltd|co|company|group|holdings)\b", re.IGNORECASE
)
LEADING_THE_REGEX = re.compile(r"^(the\s+)", re.IGNORECASE)


def clean_corporate_term(raw: str) -> str:
    """
    Normalizes commercial entity names by stripping legal entities (Inc, Corp, LLC)
    and leading articles to maximize matching across corporate email domains.
    """
    cleaned = LEADING_THE_REGEX.sub("", raw.strip().lower())
    return CORPORATE_SUFFIX_REGEX.sub("", cleaned).strip(" .,-")


COMPANY_STOP_WORDS = {
    "ltd", "limited", "pvt", "private", "inc", "corp", "corporation",
    "llc", "co", "company", "holdings", "group", "and", "india", "the", "enterprises",
    "healthcare", "pharma", "pharmaceuticals", "technologies", "services", "solutions",
    "industries", "international", "global", "trading", "engineering"
}


def extract_company_search_keywords(raw: str) -> list[str]:
    """Extract clean significant keywords from a corporate name or search query."""
    if not raw:
        return []
    words = re.findall(r"[a-zA-Z0-9]+", raw.lower())
    sig = [w for w in words if w not in COMPANY_STOP_WORDS and len(w) > 1]
    return sig if sig else [w for w in words if len(w) > 1]


def build_company_search_sql(raw_search: str, col_prefix: str = "") -> tuple[str, list[Any]]:
    """
    Builds SQL fragment and parameters to match companies across organization_name and domain,
    supporting corporate aliases (e.g., 'Larsen & Toubro' <-> 'L&T') and stripping suffixes (e.g. 'LIMITED').
    """
    if not raw_search or not raw_search.strip():
        return "1=1", []

    raw = raw_search.strip().lower()
    kws = extract_company_search_keywords(raw)

    pfx = f"{col_prefix}." if col_prefix else ""
    conds = []
    params: list[Any] = []

    # 1. Exact raw containment on name or domain
    pat = f"%{raw}%"
    conds.append(f"(lower({pfx}organization_name) LIKE ? OR lower({pfx}domain) LIKE ?)")
    params.extend([pat, pat])

    # 2. Significant keywords matching (e.g. 'sanofi' from 'SANOFI INDIA LIMITED')
    if kws:
        kw_sql = " AND ".join([f"lower({pfx}organization_name) LIKE ?" for _ in kws])
        conds.append(f"({kw_sql})")
        params.extend([f"%{w}%" for w in kws])

        # If multiple keywords, also match on primary brand keyword (e.g. 'sanofi' in 'sanofi healthcare')
        if len(kws) > 1 and len(kws[0]) >= 3:
            conds.append(f"(lower({pfx}organization_name) LIKE ? OR lower({pfx}domain) LIKE ?)")
            params.extend([f"%{kws[0]}%", f"%{kws[0]}%"])

        # Cross-alias for Larsen & Toubro <-> L&T
        words = re.findall(r"[a-zA-Z0-9]+", raw)
        if ("larsen" in kws and "toubro" in kws) or ("l" in words and "t" in words):
            conds.append(
                f"(lower({pfx}organization_name) LIKE 'l&t %' OR lower({pfx}organization_name) LIKE '% l&t %' "
                f"OR lower({pfx}organization_name) LIKE 'l&t,%' OR lower({pfx}organization_name) = 'l&t' "
                f"OR lower({pfx}organization_name) LIKE '%larsen%toubro%')"
            )

    return " OR ".join(conds), params


SQL_EXTRACT_EMPLOYER_NAME = """
    CASE 
        WHEN email IS NOT NULL AND email LIKE '%@%' 
        THEN upper(regexp_extract(email, '@([^.]+)', 1)) 
        ELSE 'COMMERCIAL SHIPPER' 
    END as employer_name
""".strip()
