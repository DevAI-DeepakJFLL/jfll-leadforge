from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query

from src.api.access_control import (
    add_to_allowlist,
    approve_access_request,
    get_access_requests,
    get_allowlist,
    is_admin_user,
    reject_access_request,
    remove_from_allowlist,
)
from src.api.helpers import require_auth
from src.api.logger import logger
from src.api.models import (
    AccessRequestApproval,
    AccessRequestRejection,
    AccessRequestResponse,
    AllowlistEntryCreate,
    AllowlistEntryResponse,
)

admin_router = APIRouter(prefix="/api/v1/admin", tags=["Root Administration"])


def require_admin(authorization: str | None = Header(None)) -> dict[str, Any]:
    """
    Enforces that the caller has an active authenticated session
    AND administrative privileges (Leadership, Tech Lead, or Admin).
    """
    user = require_auth(authorization, "root administration portal")
    user_email = user.get("sub", "").strip().lower()
    user_role = user.get("role", "")

    if not is_admin_user(user_email, user_role):
        logger.warning(
            "Security: Non-admin user attempted admin access: %s (%s)",
            user_email,
            user_role,
            extra={"event": "ADMIN_FORBIDDEN", "user_email": user_email, "role": user_role},
        )
        raise HTTPException(
            status_code=403,
            detail="FORBIDDEN_ADMIN_ACCESS: Administrative privileges required to manage access.",
        )
    return user


@admin_router.get(
    "/stats",
    summary="Get access portal telemetry (pending requests, active allowlist)",
)
def get_admin_stats(
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """Returns quick telemetry counts for the admin notification badge and header."""
    require_admin(authorization)
    all_requests = get_access_requests()
    pending = [r for r in all_requests if r.get("status") == "pending"]
    active_allowlist = get_allowlist(status="active")

    return {
        "pending_requests_count": len(pending),
        "active_allowlist_count": len(active_allowlist),
        "total_requests_count": len(all_requests),
    }


@admin_router.get(
    "/access-requests",
    response_model=list[AccessRequestResponse],
    summary="List all application access requests",
)
def list_access_requests(
    status: str | None = Query(default=None, description="Filter by status: pending, approved, rejected, all"),
    authorization: str | None = Header(None),
):
    """Lists access requests submitted from the login screen for administrative review."""
    require_admin(authorization)
    return get_access_requests(status=status)


@admin_router.post(
    "/access-requests/{request_id}/approve",
    response_model=dict[str, Any],
    summary="Approve access request and grant allowlist access",
)
def approve_request(
    request_id: str,
    payload: AccessRequestApproval = AccessRequestApproval(),
    authorization: str | None = Header(None),
):
    """
    Approves a pending access request, assigns the specified functional role,
    and automatically enrolls the user in the active allowlist.
    """
    admin = require_admin(authorization)
    admin_email = admin.get("sub", "admin")

    try:
        req = approve_access_request(
            request_id=request_id,
            role=payload.role,
            reviewed_by=admin_email,
            notes=payload.notes,
        )
        return {
            "success": True,
            "message": f"Access granted to {req['email']} with role '{payload.role}'.",
            "request": req,
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Access request '{request_id}' not found.")
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@admin_router.post(
    "/access-requests/{request_id}/reject",
    response_model=dict[str, Any],
    summary="Reject access request",
)
def reject_request(
    request_id: str,
    payload: AccessRequestRejection = AccessRequestRejection(),
    authorization: str | None = Header(None),
):
    """Rejects a pending access request with optional explanatory notes."""
    admin = require_admin(authorization)
    admin_email = admin.get("sub", "admin")

    try:
        req = reject_access_request(
            request_id=request_id,
            reviewed_by=admin_email,
            notes=payload.notes,
        )
        return {
            "success": True,
            "message": f"Access request for {req['email']} declined.",
            "request": req,
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Access request '{request_id}' not found.")
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@admin_router.get(
    "/allowlist",
    response_model=list[AllowlistEntryResponse],
    summary="List all authorized personnel on the email allowlist",
)
def list_allowlist(
    status: str | None = Query(default=None, description="Filter by status: active, revoked, all"),
    search: str | None = Query(default=None, description="Filter by email, name or role"),
    authorization: str | None = Header(None),
):
    """Lists current authorized personnel on the email allowlist."""
    require_admin(authorization)
    return get_allowlist(status=status, search=search)


@admin_router.post(
    "/allowlist",
    response_model=dict[str, Any],
    summary="Add an employee directly to the email allowlist",
)
def create_allowlist_entry(
    payload: AllowlistEntryCreate,
    authorization: str | None = Header(None),
):
    """Adds a new employee email directly to the allowlist without waiting for a request."""
    admin = require_admin(authorization)
    admin_email = admin.get("sub", "admin")

    try:
        entry = add_to_allowlist(
            email=payload.email,
            name=payload.name,
            role=payload.role,
            added_by=admin_email,
        )
        return {
            "success": True,
            "message": f"Added {entry['email']} ({entry['role']}) to allowlist.",
            "entry": entry,
        }
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@admin_router.delete(
    "/allowlist/{email}",
    response_model=dict[str, Any],
    summary="Revoke an employee's access",
)
def revoke_allowlist_entry(
    email: str,
    authorization: str | None = Header(None),
):
    """
    Revokes access for an email address.
    Invalidates any active session for that user immediately.
    Self-lockout and root administrator revocation are strictly prevented.
    """
    admin = require_admin(authorization)
    admin_email = admin.get("sub", "admin")

    try:
        entry = remove_from_allowlist(email=email, removed_by=admin_email)
        return {
            "success": True,
            "message": f"Access revoked for {entry['email']}.",
            "entry": entry,
        }
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Email '{email}' not found in allowlist.")
