import re
from typing import Any, Optional, Dict
from fastapi import HTTPException
from fastapi.params import Query as QueryType
from src.api.config import settings
from src.api.auth import verify_token


def require_auth(authorization: Optional[str], resource_name: str = "leads") -> Dict[str, Any]:
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


SQL_EXTRACT_EMPLOYER_NAME = """
    CASE 
        WHEN email IS NOT NULL AND email LIKE '%@%' 
        THEN upper(regexp_extract(email, '@([^.]+)', 1)) 
        ELSE 'COMMERCIAL SHIPPER' 
    END as employer_name
""".strip()
