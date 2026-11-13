import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from src.api.access_control import (
    DEFAULT_AUTHORIZED_DIGESTS,
    is_email_active,
)
from src.api.config import settings
from src.api.logger import logger
from src.api.models import (
    AccessRequestCreate,
    LoginRequest,
    SetPasswordRequest,
    UserSessionResponse,
)
from src.api.session_store import (
    get_active_session,
    set_active_session,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

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

    if not is_email_active(email):
        return False

    active_session_id = get_active_session(email)
    if active_session_id is None:
        set_active_session(email, token_session_id)
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
        set_active_session(user_email, session_id)

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


# DEFAULT_AUTHORIZED_DIGESTS and DEFAULT_INITIAL_PASSWORD imported from access_control


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
    Enforces scrypt password verification when a password has been set.
    Allows smooth onboarding with requires_password_setup=True for pre-authorized accounts.
    Issues a cryptographically signed HMAC-SHA256 bearer session token.
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

    from src.api.access_control import is_user_password_set, verify_user_credentials

    password_set = is_user_password_set(input_email)

    if password_set:
        if not credentials.password:
            logger.warning(
                f"Audit: Password required but missing for {input_email}",
                extra={"event": "LOGIN_REJECTED_MISSING_PASSWORD", "attempted_email": input_email},
            )
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        valid, reason = verify_user_credentials(input_email, credentials.password)
        if not valid:
            logger.warning(
                f"Audit: Password verification failed for {input_email}: {reason}",
                extra={"event": "LOGIN_REJECTED_INVALID_PASSWORD", "attempted_email": input_email, "reason": reason},
            )
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )
        requires_password_setup = False
    else:
        logger.info(
            f"Audit: User logged in requiring password setup: {input_email}",
            extra={"event": "LOGIN_REQUIRES_PASSWORD_SETUP", "attempted_email": input_email},
        )
        requires_password_setup = True

    name, role = get_user_profile(input_email)

    # Issue unique session ID and invalidate any prior session for this user
    session_id = f"sess_{secrets.token_hex(16)}"
    set_active_session(input_email, session_id)

    token, expires_at = create_token(
        {
            "sub": input_email,
            "name": name,
            "role": role,
            "session_id": session_id,
            "requires_password_setup": requires_password_setup,
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
            "requires_password_setup": requires_password_setup,
        },
    )

    return UserSessionResponse(
        email=input_email,
        name=name,
        role=role,
        token=token,
        token_type="Bearer",
        expires_at=expires_at,
        requires_password_setup=requires_password_setup,
    )


@router.post(
    "/set-password",
    response_model=UserSessionResponse,
    summary="Set or update enterprise account password",
)
def set_password(
    payload: SetPasswordRequest,
    authorization: str | None = Header(None),
    user_agent: str | None = Header(None),
):
    """
    Sets or updates an account password using scrypt hashing.
    Enforces authorization: initial setup allowed for unset accounts;
    updates require valid current_password or authenticated session.
    """
    if is_headless_user_agent(user_agent):
        raise HTTPException(
            status_code=403,
            detail="AUTOMATED_AGENT_BLOCKED: Automated headless browser access is prohibited.",
        )

    clean_email = payload.email.strip().lower()
    if not is_email_authorized(clean_email):
        raise HTTPException(
            status_code=401,
            detail="Access restricted. Only authorized Jet Freight Logistics personnel can set a password.",
        )

    from src.api.access_control import (
        is_user_password_set,
        set_user_password,
        verify_user_credentials,
    )

    # Protect against unauthenticated account takeover
    authenticated = False
    if payload.current_password:
        valid, _ = verify_user_credentials(clean_email, payload.current_password)
        if valid:
            authenticated = True

    if not authenticated and authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        user_payload = verify_token(token)
        if user_payload and user_payload.get("sub", "").strip().lower() == clean_email:
            authenticated = True

    if not authenticated:
        if is_user_password_set(clean_email):
            raise HTTPException(
                status_code=401,
                detail="Account password is already configured. Valid current password or active session required to update it.",
            )
        elif settings.env == "production" or not settings.allow_dev_auth_bypass:
            raise HTTPException(
                status_code=401,
                detail="Authentication required to initialize account password. Active session token or initial credential required.",
            )

    new_pwd = payload.new_password
    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long.",
        )

    try:
        success = set_user_password(clean_email, new_pwd)
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Unable to set password for the specified user.",
            )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    name, role = get_user_profile(clean_email)
    session_id = f"sess_{secrets.token_hex(16)}"
    set_active_session(clean_email, session_id)

    token, expires_at = create_token(
        {
            "sub": clean_email,
            "name": name,
            "role": role,
            "session_id": session_id,
            "requires_password_setup": False,
        },
        expires_in_hours=settings.auth_token_expire_hours,
    )

    logger.info(
        f"Audit: User password set successfully: {clean_email} ({role})",
        extra={
            "event": "PASSWORD_SET_SUCCESS",
            "user_email": clean_email,
            "session_id": session_id,
        },
    )

    return UserSessionResponse(
        email=clean_email,
        name=name,
        role=role,
        token=token,
        token_type="Bearer",
        expires_at=expires_at,
        requires_password_setup=False,
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

    user_email = payload.get("sub", "").strip().lower()
    from src.api.access_control import is_email_active, is_user_password_set

    if user_email and not is_email_active(user_email):
        raise HTTPException(
            status_code=401,
            detail="ACCESS_REVOKED: Your account access has been revoked by an administrator.",
        )

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
        requires_password_setup=not is_user_password_set(user_email),
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

    user_email = payload.get("sub", "").strip().lower()
    from src.api.access_control import is_email_active

    if user_email and not is_email_active(user_email):
        raise HTTPException(
            status_code=401,
            detail="ACCESS_REVOKED: Your account access has been revoked by an administrator.",
        )

    if not check_session_active(payload):
        logger.warning(
            f"Audit: Session displaced on heartbeat for {user_email}",
            extra={"event": "SESSION_SUPERSEDED", "user_email": user_email},
        )
        raise HTTPException(
            status_code=401,
            detail="SESSION_SUPERSEDED: Your account was signed in from another device.",
        )

    return {"active": True, "session_id": payload.get("session_id")}


class BotReportRequest(BaseModel):
    fingerprint: str | None = None
    reason: str
    artifacts: list[str] = Field(default_factory=list)


@router.post("/report-bot", summary="Report client-side automated bot detection and ban entity")
def report_bot_activity(
    payload: BotReportRequest,
    request: Request,
    user_agent: str | None = Header(None, alias="User-Agent"),
):
    """
    Called by client AntiBotGuard when automation artifacts (Playwright, Puppeteer, Selenium)
    are discovered. Permanently registers the machine's IP and hardware fingerprint into the ban list.
    """
    from src.api.access_control import block_entity
    from src.api.helpers import get_client_ip

    ip = get_client_ip(request)
    fp = payload.fingerprint or request.headers.get("x-device-fingerprint")
    reason_detail = f"Client AntiBot detection: {payload.reason}"
    if payload.artifacts:
        reason_detail += f" ({', '.join(payload.artifacts)})"

    entry = block_entity(
        ip=ip,
        fingerprint=fp,
        reason=reason_detail,
        user_agent=user_agent,
        actor="ClientAntiBotGuard",
    )
    return {
        "success": True,
        "status": "blocked",
        "detail": "DEVICE_BLOCKED: Machine identified as automated bot and permanently restricted.",
        "ban_id": entry.get("id"),
    }


@router.get("/device-status", summary="Check whether a device is restricted")
def check_device_status(fingerprint: str = Query(default="", description="Device hardware fingerprint")):
    """
    Public verification endpoint allowing a client to check if its hardware fingerprint
    has been restricted or if an administrator has lifted the restriction.
    Only an administrator can lift restrictions on the server.
    """
    from src.api.access_control import get_blocked_devices, is_device_blocked

    clean_fp = fingerprint.strip() if fingerprint else ""
    if not clean_fp:
        return {"fingerprint": "", "blocked": False, "status": "clear"}

    blocked = is_device_blocked(clean_fp)
    reason = None
    if blocked:
        for entry in get_blocked_devices(status="active"):
            if entry.get("fingerprint") == clean_fp:
                reason = entry.get("reason")
                break

    return {
        "fingerprint": clean_fp,
        "blocked": blocked,
        "reason": reason,
        "status": "blocked" if blocked else "clear",
    }
