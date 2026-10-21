import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from src.api.config import settings
from src.api.models import LoginRequest, UserSessionResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (4 - (len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_token(payload: dict[str, Any], expires_in_hours: int = 24) -> tuple[str, str]:
    """Generates an RFC 7519 compliant HS256 signed JWT token without external dependencies."""
    now = datetime.now(UTC)
    expires_at = now + timedelta(hours=expires_in_hours)
    
    header = {"alg": "HS256", "typ": "JWT"}
    full_payload = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    
    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(full_payload, separators=(",", ":")).encode("utf-8")
    
    header_b64 = _base64url_encode(header_bytes)
    payload_b64 = _base64url_encode(payload_bytes)
    
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    sig_b64 = _base64url_encode(signature)
    
    token = f"{header_b64}.{payload_b64}.{sig_b64}"
    return token, expires_at.isoformat()


def verify_token(token: str) -> dict[str, Any] | None:
    """Verifies HS256 JWT signature and expiration timestamp in constant time."""
    parts = token.split(".")
    if len(parts) != 3:
        return None
    
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode()
    
    expected_sig = hmac.new(
        settings.auth_secret_key.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    
    try:
        actual_sig = _base64url_decode(sig_b64)
    except (binascii.Error, ValueError):
        return None
    
    if not secrets.compare_digest(expected_sig, actual_sig):
        return None
    
    try:
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except (binascii.Error, ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    
    exp = payload.get("exp")
    if exp and datetime.now(UTC).timestamp() > exp:
        return None  # Token expired
    
    return payload


def get_user_profiles() -> dict[str, dict[str, str]]:
    """Resolves authorized user profiles dynamically from environment configuration."""
    raw_json = settings.user_profiles_json or os.getenv("AUTH_USER_PROFILES_JSON")
    if raw_json:
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict):
                return {k.strip().lower(): v for k, v in parsed.items()}
        except Exception:
            pass
    return {}


def get_user_profile(email: str) -> tuple[str, str]:
    """Resolves official display name and functional role for an authorized work email."""
    clean_email = email.strip().lower()
    profiles = get_user_profiles()
    profile = profiles.get(clean_email, {})

    name = profile.get("name")
    role = profile.get("role", settings.default_user_role)

    if not name:
        # Derive clean display name from email (e.g. "deepak.naidu@jfll.com" -> "Deepak Naidu")
        local_part = clean_email.split("@")[0]
        derived = local_part.replace(".", " ").replace("_", " ").title()
        name = derived or settings.default_user_name

    return name, role


@router.post("/login", response_model=UserSessionResponse, summary="Authenticate enterprise user")
def login(credentials: LoginRequest):
    """
    Validates work email against enterprise allowed whitelist.
    Issues a cryptographically signed HMAC-SHA256 bearer session token without requiring passwords.
    """
    input_email = credentials.email.strip().lower()
    allowed_set = {e.strip().lower() for e in settings.allowed_emails}

    if input_email not in allowed_set:
        raise HTTPException(
            status_code=401,
            detail="Access restricted. Only authorized Jet Freight Logistics personnel can sign in.",
        )

    name, role = get_user_profile(input_email)

    token, expires_at = create_token(
        {
            "sub": input_email,
            "name": name,
            "role": role,
        },
        expires_in_hours=settings.auth_token_expire_hours,
    )

    return UserSessionResponse(
        email=input_email,
        name=name,
        role=role,
        token=token,
        token_type="Bearer",
        expires_at=expires_at,
    )


@router.get("/me", response_model=UserSessionResponse, summary="Verify active bearer session token")
def get_current_user(authorization: str | None = Header(None)):
    """Verifies active Bearer session token and returns authenticated user profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    user_email = payload.get("sub", settings.default_user_email)
    fallback_name, fallback_role = get_user_profile(user_email)
    user_name = payload.get("name") or fallback_name
    user_role = payload.get("role") or fallback_role

    return UserSessionResponse(
        email=user_email,
        name=user_name,
        role=user_role,
        token=token,
        token_type="Bearer",
        expires_at=datetime.fromtimestamp(payload.get("exp", 0), UTC).isoformat() if payload.get("exp") else None,
    )
