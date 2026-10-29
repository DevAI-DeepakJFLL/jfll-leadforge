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
from src.api.logger import logger
from src.api.models import (
    AccessRequestCreate,
    LoginRequest,
    UserSessionResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# shortcut: In-memory registry assumes single-process deployment (or sticky sessions).
# Horizontal multi-worker scaling (e.g. uvicorn --workers N or multi-instance ECS)
# requires external shared state (e.g. Redis key `session:{email}` or a database column).
ACTIVE_USER_SESSIONS: dict[str, str] = {}

HEADLESS_USER_AGENTS = (
    "headlesschrome",
    "playwright",
    "puppeteer",
    "selenium",
    "phantomjs",
    "electron",
)


def is_headless_user_agent(user_agent: str | None) -> bool:
    """Detects automated browser engines and headless runtimes from User-Agent string."""
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    return any(bot in ua_lower for bot in HEADLESS_USER_AGENTS)


def check_session_active(payload: dict[str, Any]) -> bool:
    """Verifies that the session_id in the token is still the currently active session for this user."""
    email = payload.get("sub", "").strip().lower()
    token_session_id = payload.get("session_id")
    if not token_session_id or not email:
        return True  # Backward compatibility for legacy tests without session_id
    active_session_id = ACTIVE_USER_SESSIONS.get(email)
    if active_session_id is None:
        ACTIVE_USER_SESSIONS[email] = token_session_id
        return True
    return token_session_id == active_session_id


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
    session_id = payload.get("session_id") or secrets.token_hex(16)
    user_email = payload.get("sub", "").strip().lower()
    if user_email:
        ACTIVE_USER_SESSIONS[user_email] = session_id

    full_payload = {
        **payload,
        "session_id": session_id,
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
    
    if not isinstance(payload, dict):
        return None

    exp = payload.get("exp")
    if exp is None or not isinstance(exp, (int, float)):
        return None  # Numeric exp claim is strictly required

    now_ts = datetime.now(UTC).timestamp()
    if now_ts > exp:
        return None  # Token expired

    iat = payload.get("iat")
    if iat is not None and isinstance(iat, (int, float)) and iat > (now_ts + 300):
        return None  # Rejection: token future-dated beyond clock skew allowance

    return payload


DEFAULT_AUTHORIZED_DIGESTS: dict[str, dict[str, str]] = {
    # Tyra Theknath
    "0f1b6d2600c03c27cdca25ea523982fe047b6e332ce1479cfa8fedd0f04fe478": {
        "role": "Leadership",
        "name": "Tyra Theknath",
    },
    # Deepak Naidu (deepak@jfll.com)
    "fb11d6dc98153163787779a2fd66ccf896b369089def0c31cc103e5722db6cf2": {
        "role": "Tech Lead",
        "name": "Deepak Naidu",
    },
    # Akash Dhara
    "c784d6a18385d82a93e4017eee6d64a3c03b196e3d080a46e73bfb5b717c80be": {
        "role": "Operations",
        "name": "Akash Dhara",
    },
    # Snehal Birje
    "6c94ee02a8480810b2daff09013956d2def3ff2b90baf3c18f4f7a3ae53a9f59": {
        "role": "Commercial",
        "name": "Snehal Birje",
    },
}


def is_email_authorized(email: str) -> bool:
    """Checks if an email is authorized via active allowlist, explicit whitelist, or cryptographic digest fallback."""
    clean_email = email.strip().lower()
    if not clean_email:
        return False

    # Check live allowlist store first - if explicitly revoked, deny immediately
    try:
        from src.api.access_control import get_email_status
        status = get_email_status(clean_email)
        if status == "revoked":
            return False
        if status == "active":
            return True
    except Exception as err:
        logger.debug("Non-critical notice checking live allowlist: %s", err)

    allowed_set = {e.strip().lower() for e in settings.allowed_emails if e.strip()}
    if clean_email in allowed_set:
        return True

    digest = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
    return digest in DEFAULT_AUTHORIZED_DIGESTS


def get_user_profiles() -> dict[str, dict[str, str]]:
    """Resolves authorized user profiles dynamically from environment configuration."""
    raw_json = settings.user_profiles_json or os.getenv("AUTH_USER_PROFILES_JSON")
    if raw_json:
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict):
                return {k.strip().lower(): v for k, v in parsed.items()}
        except (json.JSONDecodeError, TypeError) as err:
            logger.debug("Non-critical notice parsing user profiles JSON: %s", err)
    return {}


def get_user_profile(email: str) -> tuple[str, str]:
    """Resolves official display name and functional role for an authorized work email."""
    clean_email = email.strip().lower()

    # Check live allowlist store first
    try:
        from src.api.access_control import get_user_profile_by_email
        name, role = get_user_profile_by_email(clean_email)
        if name and role:
            return name, role
    except Exception as err:
        logger.debug("Non-critical notice resolving user profile: %s", err)

    profiles = get_user_profiles()
    profile = profiles.get(clean_email, {})

    name = profile.get("name")
    role = profile.get("role")

    digest = hashlib.sha256(clean_email.encode("utf-8")).hexdigest()
    digest_info = DEFAULT_AUTHORIZED_DIGESTS.get(digest, {})

    if not name:
        name = digest_info.get("name")

    if not role:
        role = digest_info.get("role", settings.default_user_role)

    if not name:
        # Derive clean display name from email (e.g. "deepak.naidu@jfll.com" -> "Deepak Naidu")
        local_part = clean_email.split("@")[0]
        derived = local_part.replace(".", " ").replace("_", " ").title()
        name = derived or settings.default_user_name

    return name, role


@router.post(
    "/access-request",
    response_model=dict[str, Any],
    summary="Submit application access request",
)
def request_access(
    payload: AccessRequestCreate,
    user_agent: str | None = Header(None),
):
    """
    Submits an access request from the public login screen.
    Surfaces in the Root Admin Portal for administrative review and approval.
    """
    if is_headless_user_agent(user_agent):
        raise HTTPException(
            status_code=403,
            detail="AUTOMATED_AGENT_BLOCKED: Automated headless browser access is prohibited.",
        )

    clean_email = payload.email.strip().lower()
    clean_name = payload.name.strip()
    clean_reason = payload.reason.strip()

    try:
        from src.api.access_control import create_access_request
        req = create_access_request(clean_email, clean_name, clean_reason)
        return {
            "success": True,
            "message": "Your access request has been submitted successfully. An administrator will review your request.",
            "request": req,
        }
    except ValueError as err:
        msg = str(err)
        if msg == "ALREADY_AUTHORIZED":
            return {
                "success": True,
                "already_authorized": True,
                "message": "Your work email is already authorized! You can sign in directly.",
            }
        if msg == "PENDING_EXISTS":
            return {
                "success": True,
                "already_pending": True,
                "message": "An access request for this work email is already under administrative review.",
            }
        raise HTTPException(status_code=400, detail=msg)


@router.post("/login", response_model=UserSessionResponse, summary="Authenticate enterprise user")
def login(credentials: LoginRequest, user_agent: str | None = Header(None)):
    """
    Validates work email against enterprise allowed whitelist.
    Issues a cryptographically signed HMAC-SHA256 bearer session token without requiring passwords.
    Blocks automated headless browsers and enforces single-device session displacement.
    """
    if is_headless_user_agent(user_agent):
        logger.warning(
            "Audit: Automated browser agent login blocked",
            extra={"event": "BOT_BLOCKED", "user_agent": user_agent},
        )
        raise HTTPException(
            status_code=403,
            detail="AUTOMATED_AGENT_BLOCKED: Automated headless browser access is prohibited.",
        )

    input_email = credentials.email.strip().lower()
    if not is_email_authorized(input_email):
        logger.warning(
            f"Audit: Login rejected for unauthorized email: {input_email}",
            extra={"event": "LOGIN_REJECTED", "attempted_email": input_email},
        )
        raise HTTPException(
            status_code=401,
            detail="Access restricted. Only authorized Jet Freight Logistics personnel can sign in.",
        )

    name, role = get_user_profile(input_email)

    # Issue unique session ID and invalidate any prior session for this user
    session_id = f"sess_{secrets.token_hex(16)}"
    ACTIVE_USER_SESSIONS[input_email] = session_id

    token, expires_at = create_token(
        {
            "sub": input_email,
            "name": name,
            "role": role,
            "session_id": session_id,
        },
        expires_in_hours=settings.auth_token_expire_hours,
    )

    logger.info(
        f"Audit: User login successful: {input_email} ({role})",
        extra={
            "event": "LOGIN_SUCCESS",
            "user_email": input_email,
            "user_name": name,
            "role": role,
            "session_id": session_id,
        },
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
def get_current_user(authorization: str | None = Header(None), user_agent: str | None = Header(None)):
    """Verifies active Bearer session token and returns authenticated user profile."""
    if is_headless_user_agent(user_agent):
        raise HTTPException(
            status_code=403,
            detail="AUTOMATED_AGENT_BLOCKED: Automated headless browser access is prohibited.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    if not check_session_active(payload):
        user_email = payload.get("sub", "unknown")
        logger.warning(
            f"Audit: Session displaced on /me for {user_email}",
            extra={"event": "SESSION_SUPERSEDED", "user_email": user_email},
        )
        raise HTTPException(
            status_code=401,
            detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
        )

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


@router.get("/heartbeat", summary="Check if active single-device session is still valid")
def session_heartbeat(authorization: str | None = Header(None), user_agent: str | None = Header(None)):
    """Validates whether caller's session_id is still the active session for the account."""
    if is_headless_user_agent(user_agent):
        raise HTTPException(
            status_code=403,
            detail="AUTOMATED_AGENT_BLOCKED: Automated headless browser access is prohibited.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    if not check_session_active(payload):
        user_email = payload.get("sub", "unknown")
        logger.warning(
            f"Audit: Session displaced on heartbeat for {user_email}",
            extra={"event": "SESSION_SUPERSEDED", "user_email": user_email},
        )
        raise HTTPException(
            status_code=401,
            detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
        )

    return {"active": True, "session_id": payload.get("session_id")}
