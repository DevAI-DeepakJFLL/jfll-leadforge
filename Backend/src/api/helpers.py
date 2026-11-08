import re
from typing import Any

from fastapi import HTTPException, Request
from fastapi.params import Query as QueryType

from src.api.access_control import is_email_active
from src.api.auth import check_session_active, verify_token
from src.api.config import settings
from src.api.logger import logger


def get_client_ip(request: Request) -> str:
    """Safely extracts client public IP address considering proxies, CloudFront, and Lambda URL."""
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if cf_connecting_ip:
        return cf_connecting_ip.split(",")[0].strip()

    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()

    if request.client and request.client.host:
        return request.client.host.strip()

    return "unknown"


def require_auth(
    authorization: str | None,
    resource_name: str = "leads",
) -> dict[str, Any]:
    """
    Validates Bearer token if provided, enforces active single-device session,
    and enforces authentication in production environments.
    Automated headless bots are rejected globally by AntiBotMiddleware.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user = verify_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")

        user_email = user.get("sub", "").strip().lower()

        if user_email and not is_email_active(user_email):
            logger.warning(
                f"Audit: Data request rejected (access revoked) for {user_email}",
                extra={"event": "ACCESS_REVOKED", "user_email": user_email, "resource": resource_name},
            )
            raise HTTPException(
                status_code=401,
                detail="ACCESS_REVOKED: Your account access has been revoked by an administrator.",
            )

        if not check_session_active(user):
            logger.warning(
                f"Audit: Data request rejected (session displaced) for {user_email}",
                extra={"event": "SESSION_SUPERSEDED", "user_email": user_email, "resource": resource_name},
            )
            raise HTTPException(
                status_code=401,
                detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
            )
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
    r"\b(inc|corp|corporation|llc|llp|ltd|limited|pvt|private|co|company|group|holdings)\b",
    re.IGNORECASE,
)
LEADING_THE_REGEX = re.compile(r"^(the\s+)", re.IGNORECASE)


def clean_corporate_term(raw: str) -> str:
    """
    Normalizes commercial entity names by stripping legal entity suffixes
    (Inc, Corp, LLC, LLP, Ltd, Limited, Pvt, Private) and leading articles
    to maximize matching across corporate email domains.
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
    Builds SQL fragment and parameters to match companies across organization_name and domain
    using strict word boundaries, preventing partial-string false positives, while supporting
    corporate aliases (e.g., 'Larsen & Toubro' <-> 'L&T') and concatenated domain matches.
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
        kw_sql = " AND ".join([f"regexp_matches(lower({pfx}organization_name), ?)" for _ in kws])
        conds.append(f"({kw_sql})")
        params.extend([rf"\b{re.escape(w)}\b" for w in kws])

        # If multiple keywords, also match domain with concatenated keywords (e.g. 'titanlab' or 'sanofipasteur')
        if len(kws) >= 2:
            concat_kws = "".join(kws)
            if len(concat_kws) >= 4:
                conds.append(f"lower({pfx}domain) LIKE ?")
                params.append(f"%{concat_kws}%")

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


def resolve_target_org_ids(
    con: Any,
    organization_id: str | None,
    company: str | None,
    contacts_source: str,
    apollo_source: str,
    max_sister_ids: int = 50,
) -> list[str]:
    """
    Resolves matching organization IDs for an entity with two-stage fallback:
    1. If organization_id is provided and has contacts directly in contacts_source, return [organization_id].
    2. If direct ID has 0 contacts (e.g. branch or commercial subsidiary), fall back to resolving sister IDs
       by company name (or lookup company name from apollo_source by ID) and return deduplicated IDs.
    """
    if not organization_id or not organization_id.strip():
        return []

    clean_org_id = organization_id.strip()
    matched_ids = [clean_org_id]

    # Check if direct organization_id has contacts
    has_direct = con.execute(
        f"SELECT 1 FROM '{contacts_source}' WHERE organization_id = ? LIMIT 1",
        [clean_org_id],
    ).fetchone()

    if not has_direct:
        comp_to_resolve = company
        if not comp_to_resolve or not comp_to_resolve.strip():
            org_info = con.execute(
                f"SELECT organization_name FROM '{apollo_source}' WHERE organization_id = ?",
                [clean_org_id],
            ).fetchone()
            if org_info and org_info[0]:
                comp_to_resolve = org_info[0]

        if comp_to_resolve and comp_to_resolve.strip():
            from src.api.cache import resolve_company_ids_cached

            resolved_ids = resolve_company_ids_cached(comp_to_resolve.strip(), apollo_source)
            if resolved_ids:
                matched_ids = list(dict.fromkeys([clean_org_id] + resolved_ids[:max_sister_ids]))

    return matched_ids

