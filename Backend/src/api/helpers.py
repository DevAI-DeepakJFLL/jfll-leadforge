import re
from typing import Any

from fastapi import Header, HTTPException, Request
from fastapi.params import Query as QueryType

from src.api.access_control import (
    ROOT_ADMIN_EMAILS,
    Permission,
    has_permission,
    is_email_active,
)
from src.api.auth import check_session_active, verify_token
from src.api.config import settings
from src.api.logger import logger

_IP_FORMAT_RE = re.compile(r"^[0-9a-fA-F:\.]+$")


def _clean_ip_header(val: str | None) -> str | None:
    if not val:
        return None
    candidate = val.split(",")[0].strip()
    if candidate and len(candidate) <= 45 and _IP_FORMAT_RE.match(candidate):
        return candidate
    return None


def get_client_ip(request: Request) -> str:
    """Safely extracts client public IP address considering proxies, CloudFront, and Lambda URL."""
    cf_connecting_ip = _clean_ip_header(request.headers.get("cf-connecting-ip"))
    if cf_connecting_ip:
        return cf_connecting_ip

    x_forwarded_for = _clean_ip_header(request.headers.get("x-forwarded-for"))
    if x_forwarded_for:
        return x_forwarded_for

    x_real_ip = _clean_ip_header(request.headers.get("x-real-ip"))
    if x_real_ip:
        return x_real_ip

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
    elif settings.env == "production" or not settings.allow_dev_auth_bypass:
        raise HTTPException(status_code=401, detail=f"Authentication required to access {resource_name}")
    return {}


def require_permission(perm: Permission):
    """
    FastAPI dependency that extracts user session from Authorization header,
    validates active session and email, and verifies that the role has the required permission.
    Raises HTTPException(403) with PERMISSION_DENIED if unauthorized.
    Allows development bypass when Authorization is omitted in non-production.
    """
    def dependency(
        authorization: str | None = Header(None),
    ) -> dict[str, Any]:
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split("Bearer ", 1)[1].strip()
            user = verify_token(token)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid or expired session token")

            user_email = user.get("sub", "").strip().lower()

            if user_email and not is_email_active(user_email):
                logger.warning(
                    f"Audit: Data request rejected (access revoked) for {user_email}",
                    extra={"event": "ACCESS_REVOKED", "user_email": user_email, "permission": perm.value},
                )
                raise HTTPException(
                    status_code=401,
                    detail="ACCESS_REVOKED: Your account access has been revoked by an administrator.",
                )

            if not check_session_active(user):
                logger.warning(
                    f"Audit: Data request rejected (session displaced) for {user_email}",
                    extra={"event": "SESSION_SUPERSEDED", "user_email": user_email, "permission": perm.value},
                )
                raise HTTPException(
                    status_code=401,
                    detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
                )

            user_role = user.get("role", "")
            if not user_role and user_email in ROOT_ADMIN_EMAILS:
                user_role = "Root Admin"

            if user_email in ROOT_ADMIN_EMAILS:
                return user

            if not has_permission(user_role, perm):
                logger.warning(
                    "Security: User '%s' with role '%s' denied permission '%s'",
                    user_email,
                    user_role,
                    perm.value,
                    extra={"event": "PERMISSION_DENIED", "user_email": user_email, "role": user_role, "permission": perm.value},
                )
                detail_msg = f"PERMISSION_DENIED: {perm.value} requires elevated role privileges"
                if perm in (Permission.ADMIN_PORTAL, Permission.MANAGE_USERS):
                    detail_msg += ". Administrative privileges required."
                raise HTTPException(
                    status_code=403,
                    detail=detail_msg,
                )
            return user
        elif (
            settings.env == "production"
            or not settings.allow_dev_auth_bypass
            or perm in (Permission.ADMIN_PORTAL, Permission.MANAGE_USERS)
        ):
            raise HTTPException(status_code=401, detail=f"Authentication required to access {perm.value}")
        return {
            "sub": "dev@jfll.com",
            "name": "Dev User",
            "role": "Tech Lead",
        }

    return dependency


def require_role(allowed_roles: set[str] | list[str]):
    """
    FastAPI dependency that extracts user session and validates that caller's
    role is in allowed_roles.
    """
    allowed_set = {r.strip().lower() for r in allowed_roles}

    def dependency(
        authorization: str | None = Header(None),
    ) -> dict[str, Any]:
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split("Bearer ", 1)[1].strip()
            user = verify_token(token)
            if not user:
                raise HTTPException(status_code=401, detail="Invalid or expired session token")

            user_email = user.get("sub", "").strip().lower()

            if user_email and not is_email_active(user_email):
                logger.warning(
                    f"Audit: Data request rejected (access revoked) for {user_email}",
                    extra={"event": "ACCESS_REVOKED", "user_email": user_email},
                )
                raise HTTPException(
                    status_code=401,
                    detail="ACCESS_REVOKED: Your account access has been revoked by an administrator.",
                )

            if not check_session_active(user):
                logger.warning(
                    f"Audit: Data request rejected (session displaced) for {user_email}",
                    extra={"event": "SESSION_SUPERSEDED", "user_email": user_email},
                )
                raise HTTPException(
                    status_code=401,
                    detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
                )

            user_role = user.get("role", "").strip()
            if user_email in ROOT_ADMIN_EMAILS:
                return user

            if user_role.lower() not in allowed_set:
                logger.warning(
                    "Security: User '%s' with role '%s' not in allowed roles: %s",
                    user_email,
                    user_role,
                    allowed_set,
                    extra={"event": "ROLE_FORBIDDEN", "user_email": user_email, "role": user_role},
                )
                raise HTTPException(
                    status_code=403,
                    detail=f"FORBIDDEN_ROLE: Role '{user_role}' requires elevated role privileges",
                )
            return user
        elif settings.env == "production" or not settings.allow_dev_auth_bypass:
            raise HTTPException(status_code=401, detail="Authentication required")
        return {
            "sub": "dev@jfll.com",
            "name": "Dev User",
            "role": "Tech Lead",
        }

    return dependency


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


CUSTOMS_PREFIX_REGEX = re.compile(
    r"^(?:(?:m\s*/\s*s(?:\.|\b)|m\.s(?:\.|\b)|ms\b\.?|messrs(?:\.|\b)|shree\b|shri\b|the\b)\s*)+",
    re.IGNORECASE,
)
CORPORATE_SUFFIX_REGEX = re.compile(
    r"\b(inc|corp|corporation|llc|llp|ltd|limited|pvt|private|co|company|group|holdings|india|asia|impex)\b",
    re.IGNORECASE,
)
LEADING_THE_REGEX = re.compile(r"^(the\s+)", re.IGNORECASE)


# Canonical mapping from frontend Freight Cargo Verticals to underlying DuckDB Apollo industry slugs
CARGO_VERTICAL_TO_APOLLO_INDUSTRIES: dict[str, list[str]] = {
    "automotive & transportation": ["automotive", "transportation", "logistics & supply chain"],
    "pharmaceuticals & healthcare": ["pharmaceuticals", "medical devices", "biotechnology"],
    "perishables, food & beverage": ["food & beverages", "food production", "farming", "wine & spirits"],
    "chemicals & hazardous goods": ["chemicals", "plastics"],
    "industrial machinery & engineering": [
        "machinery",
        "mechanical or industrial engineering",
        "industrial automation",
        "civil engineering",
    ],
    "textiles, apparel & retail": ["apparel & fashion", "retail", "textiles", "wholesale"],
    "electronics & high tech": [
        "electrical/electronic manufacturing",
        "consumer electronics",
        "telecommunications",
        "semiconductors",
    ],
    "construction & building materials": ["construction", "building materials"],
    "oil, gas & energy": ["oil & energy", "mining & metals", "environmental services & clean energy"],
}

# Seniority synonyms and hierarchy expansion to capture relevant decision-makers
SENIORITY_EXPANSIONS: dict[str, list[str]] = {
    "c_suite": ["c_suite", "cxo"],
    "owner": ["owner", "partner", "founder"],
    "director": ["director", "head"],
    "vp": ["vp"],
    "manager": ["manager"],
    "senior": ["senior"],
    "entry": ["entry"],
}

# ISO 2-letter country codes mapped to lowercase full country names in contacts parquet
COUNTRY_CODE_TO_NAME: dict[str, str] = {
    "us": "united states",
    "usa": "united states",
    "in": "india",
    "ind": "india",
    "gb": "united kingdom",
    "uk": "united kingdom",
    "br": "brazil",
    "bra": "brazil",
    "ca": "canada",
    "can": "canada",
    "ae": "united arab emirates",
    "uae": "united arab emirates",
    "de": "germany",
    "deu": "germany",
    "nl": "netherlands",
    "nld": "netherlands",
    "fr": "france",
    "fra": "france",
    "au": "australia",
    "aus": "australia",
    "it": "italy",
    "ita": "italy",
    "mx": "mexico",
    "mex": "mexico",
    "es": "spain",
    "esp": "spain",
    "cn": "china",
    "chn": "china",
    "jp": "japan",
    "jpn": "japan",
    "sg": "singapore",
    "sgp": "singapore",
}


def expand_cargo_industries(raw_industries: list[str]) -> list[str]:
    """Expands frontend cargo vertical labels or slug tokens to all matching Apollo industry slugs."""
    expanded: list[str] = []
    for item in raw_industries:
        if not item or not item.strip():
            continue
        token = item.strip().lower()
        if token in CARGO_VERTICAL_TO_APOLLO_INDUSTRIES:
            expanded.extend(CARGO_VERTICAL_TO_APOLLO_INDUSTRIES[token])
        else:
            expanded.append(token)
    return list(dict.fromkeys(expanded))


def expand_seniorities(raw_seniorities: list[str]) -> list[str]:
    """Expands seniority tokens with relevant synonyms (e.g., owner -> owner, partner, founder)."""
    expanded: list[str] = []
    for item in raw_seniorities:
        if not item or not item.strip():
            continue
        token = item.strip().lower()
        if token in SENIORITY_EXPANSIONS:
            expanded.extend(SENIORITY_EXPANSIONS[token])
        else:
            expanded.append(token)
    return list(dict.fromkeys(expanded))


def normalize_country_names(raw_countries: list[str]) -> list[str]:
    """Normalizes country names or ISO 2-letter codes to lowercase full country names."""
    normalized: list[str] = []
    for item in raw_countries:
        if not item or not item.strip():
            continue
        token = item.strip().lower()
        if token in COUNTRY_CODE_TO_NAME:
            normalized.append(COUNTRY_CODE_TO_NAME[token])
        else:
            normalized.append(token)
    return list(dict.fromkeys(normalized))


def clean_corporate_term(raw: str) -> str:
    """
    Normalizes commercial entity names by stripping customs prefixes (M/S, Messrs, Shree, The),
    legal entity suffixes (Inc, Corp, LLC, LLP, Ltd, Limited, Pvt, Private),
    regional qualifiers (India, Asia), and trading tokens (Impex) to maximize matching across
    corporate email domains and Apollo directories.
    """
    if not raw:
        return ""
    cleaned = raw.strip().lower()
    cleaned = CUSTOMS_PREFIX_REGEX.sub("", cleaned).strip()
    cleaned = LEADING_THE_REGEX.sub("", cleaned).strip()
    # Normalize punctuation that separates suffixes or noise
    normalized = re.sub(r"[\(\)\[\],]", " ", cleaned)
    stripped = CORPORATE_SUFFIX_REGEX.sub("", normalized)
    stripped = re.sub(r"\s+", " ", stripped).strip(" .,-&")
    if len(stripped) >= 2:
        return stripped
    fallback = re.sub(r"\s+", " ", normalized).strip(" .,-&")
    return fallback if fallback else cleaned


COMPANY_STOP_WORDS = {
    "ltd", "limited", "pvt", "private", "inc", "corp", "corporation",
    "llc", "llp", "co", "company", "holdings", "group", "and", "india", "asia", "the", "enterprises",
    "healthcare", "pharma", "pharmaceuticals", "technologies", "services", "solutions",
    "industries", "international", "global", "trading", "engineering",
    "impex", "ms", "messrs", "shree", "shri", "exports", "imports",
}


ENTERPRISE_ALIASES: dict[str, list[str]] = {
    "l&t": ["larsen & toubro", "larsen and toubro"],
    "larsen & toubro": ["l&t", "larsen and toubro"],
    "larsen and toubro": ["l&t", "larsen & toubro"],
    "bhel": ["bharat heavy electricals"],
    "bharat heavy electricals": ["bhel"],
    "ongc": ["oil and natural gas corporation", "oil & natural gas corporation"],
    "oil and natural gas corporation": ["ongc", "oil & natural gas corporation"],
    "oil & natural gas corporation": ["ongc", "oil and natural gas corporation"],
    "iocl": ["indian oil corporation", "indian oil"],
    "indian oil corporation": ["iocl", "indian oil"],
    "indian oil": ["iocl", "indian oil corporation"],
    "bpcl": ["bharat petroleum corporation", "bharat petroleum"],
    "bharat petroleum corporation": ["bpcl", "bharat petroleum"],
    "bharat petroleum": ["bpcl", "bharat petroleum corporation"],
    "hpcl": ["hindustan petroleum corporation", "hindustan petroleum"],
    "hindustan petroleum corporation": ["hpcl", "hindustan petroleum"],
    "hindustan petroleum": ["hpcl", "hindustan petroleum corporation"],
    "tcs": ["tata consultancy services"],
    "tata consultancy services": ["tcs"],
    "ril": ["reliance industries"],
    "reliance industries": ["ril"],
    "gail": ["gas authority of india"],
    "gas authority of india": ["gail"],
    "sail": ["steel authority of india"],
    "steel authority of india": ["sail"],
    "ntpc": ["national thermal power corporation"],
    "national thermal power corporation": ["ntpc"],
    "hal": ["hindustan aeronautics"],
    "hindustan aeronautics": ["hal"],
    "bel": ["bharat electronics"],
    "bharat electronics": ["bel"],
    "itc": ["itc limited"],
    "itc limited": ["itc"],
    "hcl": ["hcl technologies"],
    "hcl technologies": ["hcl"],
    "sbi": ["state bank of india"],
    "state bank of india": ["sbi"],
}


FREE_WEBMAIL_DOMAINS: set[str] = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.in",
    "yahoo.co.uk",
    "hotmail.com",
    "hotmail.co.in",
    "outlook.com",
    "outlook.in",
    "rediffmail.com",
    "rediff.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "aol.com",
    "zoho.com",
    "zoho.in",
    "protonmail.com",
    "proton.me",
    "live.com",
    "mail.com",
    "yandex.com",
    "gmx.com",
    "msn.com",
}


def extract_domain_from_email(email: str | None) -> str | None:
    """
    Extracts corporate domain from an email address, filtering out common free webmail providers
    (Gmail, Yahoo, Outlook, Rediffmail, etc.) to ensure only authentic commercial corporate domains
    are used for entity matching and Apollo linking.
    """
    if not email or not isinstance(email, str):
        return None
    email_clean = email.strip().lower()
    if "@" not in email_clean:
        return None
    parts = email_clean.split("@")
    if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
        return None
    domain = parts[1].strip(" .;,/<>[]{}()\"'")
    if not domain or "." not in domain:
        return None
    if ":" in domain:
        domain = domain.split(":")[0]
    if domain in FREE_WEBMAIL_DOMAINS:
        return None
    for free_domain in FREE_WEBMAIL_DOMAINS:
        if domain == free_domain or domain.endswith(f".{free_domain}"):
            return None
    return domain


_DIRECTOR_PREFIX_RE = re.compile(
    r"(?:director\s*[:\-]|dir\s*[:\.\-]|proprietor\s*[:\-]|prop\s*[:\.\-]|"
    r"partner\s*[:\-]|managing\s+director\s*[:\-]|md\s*[:\.\-]|ceo\s*[:\-]|"
    r"attn\s*[:\.\-]|attention\s*[:\-]|contact\s*[:\-]|name\s*[:\-])\s*",
    re.IGNORECASE,
)

_HONORIFIC_PREFIX_RE = re.compile(
    r"^(?:mr\b\.?|mrs\b\.?|ms\b\.?|dr\b\.?|shri\b|shree\b|smt\b\.?)\s*",
    re.IGNORECASE,
)

_DESIGNATION_SUFFIX_RE = re.compile(
    r"[\s,\-\(\[]+(?:director|managing\s+director|proprietor|partner|md|ceo|head|manager|promoter|founder)[\s\)\],]*$",
    re.IGNORECASE,
)

_INVALID_DIRECTOR_STRINGS = {
    "na", "n/a", "none", "null", "not available", "no direct contact on file",
    "as per invoice", "to order", "self", "same as consignee", "applicant",
    "unknown", "nil", "director", "proprietor", "partner", "commercial shipper",
}


def extract_customs_director_name(raw: str | None) -> str | None:
    """
    Extracts and standardizes an executive or director name from messy customs manifest text dumps,
    removing manifest prefixes (DIR:, MD:, ATTN:), corporate designations, DIN numbers,
    and phone/email noise, while rejecting generic placeholders and corporate entity names.
    """
    if not raw or not isinstance(raw, str):
        return None

    cleaned = raw.strip()
    if not cleaned:
        return None

    # Check for known invalid/placeholder values
    if cleaned.lower() in _INVALID_DIRECTOR_STRINGS:
        return None

    # If it's a corporate legal entity name (contains Ltd, Pvt, LLC, etc.), it's not a director
    if re.search(r"\b(pvt|private\s+limited|limited|ltd|llc|llp|inc|corp|co\.|company)\b", cleaned, re.IGNORECASE):
        return None

    # 1. Check for labeled prefix (e.g. "DIR: RAJESH SHARMA", "ATTN: MR. AMIT GUPTA")
    prefix_match = _DIRECTOR_PREFIX_RE.search(cleaned)
    if prefix_match:
        cleaned = cleaned[prefix_match.end():]

    # 2. Cut off at delimiters like DIN, Tel, Mobile, Email, S/O, newline, semicolon
    cleaned = re.split(r"[;\n\r|]|\b(?:din|tel|phone|mob|mobile|email|s/o|d/o|w/o)\b", cleaned, flags=re.IGNORECASE)[0]

    # 3. Cut off designation suffixes (e.g. "RAJESH SHARMA - DIRECTOR" or "RAJESH SHARMA, MD")
    cleaned = _DESIGNATION_SUFFIX_RE.sub("", cleaned).strip()

    # 4. Remove honorifics (Mr., Mrs., Shri, etc.)
    cleaned = _HONORIFIC_PREFIX_RE.sub("", cleaned).strip()

    # 5. Clean up lingering punctuation and parentheses
    cleaned = re.sub(r"[\(\)\[\]\"']", "", cleaned).strip(" .,-/:")

    # 6. Normalize internal whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Reject if empty, or too short
    if not cleaned or len(cleaned) < 3:
        return None

    if cleaned.lower() in _INVALID_DIRECTOR_STRINGS:
        return None

    # Reject if it has digits
    if re.search(r"\d", cleaned):
        return None

    # Reject if it contains invalid non-name characters
    if not re.match(r"^[a-zA-Z\s\.\'-]+$", cleaned):
        return None

    return cleaned.title()


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
    bidirectional corporate/PSU aliases (e.g., 'Larsen & Toubro' <-> 'L&T', 'BHEL' <-> 'Bharat Heavy Electricals')
    and concatenated domain matches.
    """
    if not raw_search or not raw_search.strip():
        return "1=1", []

    raw = raw_search.strip().lower()
    cleaned = clean_corporate_term(raw)
    kws = extract_company_search_keywords(cleaned if cleaned else raw)

    pfx = f"{col_prefix}." if col_prefix else ""
    conds = []
    params: list[Any] = []

    # 1. Exact raw containment on name or domain
    pat = f"%{raw}%"
    conds.append(f"(lower({pfx}organization_name) LIKE ? OR lower({pfx}domain) LIKE ?)")
    params.extend([pat, pat])

    # If clean_corporate_term stripped prefixes/suffixes, also match the cleaned term
    if cleaned and cleaned != raw:
        clean_pat = f"%{cleaned}%"
        conds.append(f"(lower({pfx}organization_name) LIKE ? OR lower({pfx}domain) LIKE ?)")
        params.extend([clean_pat, clean_pat])

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

    # 3. Bidirectional PSU and Enterprise alias matching
    matched_aliases: list[str] = []
    lookup_candidates = [raw, cleaned, raw.replace(" ", ""), cleaned.replace(" ", "")]
    for cand in lookup_candidates:
        if cand in ENTERPRISE_ALIASES:
            matched_aliases.extend(ENTERPRISE_ALIASES[cand])

    if not matched_aliases:
        for alias_key, alias_vals in ENTERPRISE_ALIASES.items():
            if len(alias_key) >= 5 and (alias_key in raw or alias_key in cleaned):
                matched_aliases.extend(alias_vals)

    # Cross-alias for Larsen & Toubro <-> L&T
    words = re.findall(r"[a-zA-Z0-9]+", raw)
    if ("larsen" in kws and "toubro" in kws) or ("l" in words and "t" in words):
        conds.append(
            f"(lower({pfx}organization_name) LIKE 'l&t %' OR lower({pfx}organization_name) LIKE '% l&t %' "
            f"OR lower({pfx}organization_name) LIKE 'l&t,%' OR lower({pfx}organization_name) = 'l&t' "
            f"OR lower({pfx}organization_name) LIKE '%larsen%toubro%')"
        )

    for alias in list(dict.fromkeys(matched_aliases)):
        alias_clean = alias.strip().lower()
        if not alias_clean:
            continue
        if len(alias_clean) <= 5:
            conds.append(
                f"(regexp_matches(lower({pfx}organization_name), ?) OR lower({pfx}domain) LIKE ?)"
            )
            params.extend([rf"\b{re.escape(alias_clean)}\b", f"%{alias_clean}%"])
        else:
            conds.append(
                f"(lower({pfx}organization_name) LIKE ? OR lower({pfx}domain) LIKE ?)"
            )
            params.extend([f"%{alias_clean}%", f"%{alias_clean.replace(' ', '')}%"])
            alias_kws = extract_company_search_keywords(alias_clean)
            if alias_kws:
                alias_kw_sql = " AND ".join([f"regexp_matches(lower({pfx}organization_name), ?)" for _ in alias_kws])
                conds.append(f"({alias_kw_sql})")
                params.extend([rf"\b{re.escape(w)}\b" for w in alias_kws])

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

