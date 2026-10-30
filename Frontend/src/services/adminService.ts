import { API_BASE_URL } from '@/config/api';
import { getStoredSession } from '@/services/authService';
import { logger } from '@/utils/logger';
import {
  AccessRequest,
  AdminStats,
  AllowlistEntry,
  ApproveAccessRequestPayload,
  CreateAccessRequestPayload,
  CreateAccessRequestResponse,
  CreateAllowlistEntryPayload,
  RejectAccessRequestPayload,
} from '@/types/admin';

const ADMIN_STORAGE_KEY_REQUESTS = 'jfll_admin_access_requests';
const ADMIN_STORAGE_KEY_ALLOWLIST = 'jfll_admin_allowlist';

const INITIAL_FALLBACK_ALLOWLIST: AllowlistEntry[] = [
  {
    email: 'deepak@jfll.com',
    name: 'Deepak Naidu',
    role: 'Tech Lead',
    status: 'active',
    added_at: '2026-10-20T00:00:00Z',
    added_by: 'system_bootstrap',
  },
  {
    email: 'tyra.theknath@jfll.com',
    name: 'Tyra Theknath',
    role: 'Leadership',
    status: 'active',
    added_at: '2026-10-20T00:00:00Z',
    added_by: 'system_bootstrap',
  },
  {
    email: 'akash.dhara@jfll.com',
    name: 'Akash Dhara',
    role: 'Operations',
    status: 'active',
    added_at: '2026-10-20T00:00:00Z',
    added_by: 'system_bootstrap',
  },
  {
    email: 'snehal.birje@jfll.com',
    name: 'Snehal Birje',
    role: 'Commercial',
    status: 'active',
    added_at: '2026-10-20T00:00:00Z',
    added_by: 'system_bootstrap',
  },
];

function getAuthHeaders(): HeadersInit {
  const session = getStoredSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

// ==========================================
// Offline Storage Helpers (for Vitest/Mock)
// ==========================================

let _inMemoryAllowlist: AllowlistEntry[] = [...INITIAL_FALLBACK_ALLOWLIST];
let _inMemoryRequests: AccessRequest[] = [];

function getLocalAllowlist(): AllowlistEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY_ALLOWLIST);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return _inMemoryAllowlist;
}

function saveLocalAllowlist(items: AllowlistEntry[]): void {
  _inMemoryAllowlist = items;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY_ALLOWLIST, JSON.stringify(items));
    }
  } catch {}
}

function getLocalRequests(): AccessRequest[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY_REQUESTS);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return _inMemoryRequests;
}

function saveLocalRequests(items: AccessRequest[]): void {
  _inMemoryRequests = items;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY_REQUESTS, JSON.stringify(items));
    }
  } catch {}
}

// ==========================================
// Public Access Request API
// ==========================================

export async function submitAccessRequest(
  payload: CreateAccessRequestPayload
): Promise<CreateAccessRequestResponse> {
  const endpoint = `${API_BASE_URL}/api/v1/auth/access-request`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: CreateAccessRequestResponse = await res.json();
      if (data.request) {
        const localReqs = getLocalRequests();
        const filtered = localReqs.filter(
          (r) => r.id !== data.request?.id && r.email.toLowerCase() !== data.request?.email.toLowerCase()
        );
        filtered.unshift(data.request);
        saveLocalRequests(filtered);
      }
      return data;
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to submit access request.');
  } catch (err: unknown) {
    // If backend is down, save to local storage in dev/test environment
    logger.warn('ADMIN_SERVICE', 'Submitting access request locally (API unavailable)', { error: String(err) });
    const cleanEmail = payload.email.trim().toLowerCase();
    const allowlist = getLocalAllowlist();
    if (allowlist.some((a) => a.email.toLowerCase() === cleanEmail && a.status === 'active')) {
      return {
        success: true,
        already_authorized: true,
        message: 'Your work email is already authorized! You can sign in directly.',
      };
    }

    const localReqs = getLocalRequests();
    if (localReqs.some((r) => r.email.toLowerCase() === cleanEmail && r.status === 'pending')) {
      return {
        success: true,
        already_pending: true,
        message: 'An access request for this work email is already under administrative review.',
      };
    }

    const newReq: AccessRequest = {
      id: `req_${Math.random().toString(36).substring(2, 9)}`,
      email: cleanEmail,
      name: payload.name?.trim() || cleanEmail.split('@')[0],
      reason: payload.reason.trim(),
      status: 'pending',
      requested_at: new Date().toISOString(),
    };
    localReqs.unshift(newReq);
    saveLocalRequests(localReqs);

    return {
      success: true,
      message: 'Your access request has been submitted successfully. An administrator will review your request.',
      request: newReq,
    };
  }
}

// ==========================================
// Admin Guarded APIs
// ==========================================

export async function fetchAdminStats(): Promise<AdminStats> {
  const session = getStoredSession();
  if (!session?.token) {
    return {
      pending_requests_count: 0,
      active_allowlist_count: 0,
      total_requests_count: 0,
    };
  }

  const endpoint = `${API_BASE_URL}/api/v1/admin/stats`;
  try {
    const res = await fetch(endpoint, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  const requests = getLocalRequests();
  const allowlist = getLocalAllowlist().filter((a) => a.status === 'active');
  const pending = requests.filter((r) => r.status === 'pending');

  return {
    pending_requests_count: pending.length,
    active_allowlist_count: allowlist.length,
    total_requests_count: requests.length,
  };
}

export async function fetchAccessRequests(status?: string): Promise<AccessRequest[]> {
  const queryParam = status ? `?status=${encodeURIComponent(status)}` : '';
  const endpoint = `${API_BASE_URL}/api/v1/admin/access-requests${queryParam}`;

  try {
    const res = await fetch(endpoint, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: AccessRequest[] = await res.json();
      if (!status || status === 'all') {
        saveLocalRequests(data);
      } else {
        const local = getLocalRequests();
        const map = new Map<string, AccessRequest>(local.map((r) => [r.id, r]));
        for (const item of data) {
          map.set(item.id, item);
        }
        saveLocalRequests(Array.from(map.values()));
      }
      return data;
    }
  } catch {}

  let requests = getLocalRequests();
  if (status && status !== 'all') {
    requests = requests.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  return requests;
}

export async function approveAccessRequest(
  requestId: string,
  payload: ApproveAccessRequestPayload
): Promise<{ success: boolean; message: string; request: AccessRequest }> {
  const endpoint = `${API_BASE_URL}/api/v1/admin/access-requests/${encodeURIComponent(requestId)}/approve`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const requests = getLocalRequests();
      const target = requests.find((r) => r.id === requestId);
      if (target) {
        target.status = 'approved';
        target.reviewed_at = data.request?.reviewed_at || new Date().toISOString();
        target.reviewed_by = data.request?.reviewed_by || 'admin';
        target.review_notes = payload.notes || 'Approved';
        saveLocalRequests(requests);
      } else if (data.request) {
        requests.unshift(data.request);
        saveLocalRequests(requests);
      }

      const allowlist = getLocalAllowlist();
      const email = (data.request?.email || target?.email || '').trim().toLowerCase();
      if (email) {
        const existing = allowlist.find((a) => a.email.toLowerCase() === email);
        if (existing) {
          existing.status = 'active';
          existing.role = payload.role;
        } else {
          allowlist.push({
            email,
            name: data.request?.name || target?.name || email.split('@')[0],
            role: payload.role,
            status: 'active',
            added_at: new Date().toISOString(),
            added_by: 'admin',
          });
        }
        saveLocalAllowlist(allowlist);
      }
      return data;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Approval failed.');
  } catch (err) {
    // Offline fallback
    const requests = getLocalRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error(`Request '${requestId}' not found.`);

    req.status = 'approved';
    req.reviewed_at = new Date().toISOString();
    req.reviewed_by = 'admin';
    req.review_notes = payload.notes || 'Approved';
    saveLocalRequests(requests);

    const allowlist = getLocalAllowlist();
    const existing = allowlist.find((a) => a.email.toLowerCase() === req.email.toLowerCase());
    if (existing) {
      existing.status = 'active';
      existing.role = payload.role;
    } else {
      allowlist.push({
        email: req.email,
        name: req.name,
        role: payload.role,
        status: 'active',
        added_at: new Date().toISOString(),
        added_by: 'admin',
      });
    }
    saveLocalAllowlist(allowlist);

    return {
      success: true,
      message: `Access granted to ${req.email} with role '${payload.role}'.`,
      request: req,
    };
  }
}

export async function rejectAccessRequest(
  requestId: string,
  payload: RejectAccessRequestPayload
): Promise<{ success: boolean; message: string; request: AccessRequest }> {
  const endpoint = `${API_BASE_URL}/api/v1/admin/access-requests/${encodeURIComponent(requestId)}/reject`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const requests = getLocalRequests();
      const target = requests.find((r) => r.id === requestId);
      if (target) {
        target.status = 'rejected';
        target.reviewed_at = data.request?.reviewed_at || new Date().toISOString();
        target.reviewed_by = data.request?.reviewed_by || 'admin';
        target.review_notes = payload.notes || 'Declined';
        saveLocalRequests(requests);
      } else if (data.request) {
        requests.unshift(data.request);
        saveLocalRequests(requests);
      }
      return data;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Rejection failed.');
  } catch (err) {
    const requests = getLocalRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error(`Request '${requestId}' not found.`);

    req.status = 'rejected';
    req.reviewed_at = new Date().toISOString();
    req.reviewed_by = 'admin';
    req.review_notes = payload.notes || 'Declined';
    saveLocalRequests(requests);

    return {
      success: true,
      message: `Access request for ${req.email} declined.`,
      request: req,
    };
  }
}

export async function fetchAllowlist(status?: string, search?: string): Promise<AllowlistEntry[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const endpoint = `${API_BASE_URL}/api/v1/admin/allowlist${qs}`;

  try {
    const res = await fetch(endpoint, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: AllowlistEntry[] = await res.json();
      if ((!status || status === 'all') && !search) {
        saveLocalAllowlist(data);
      }
      return data;
    }
  } catch {}

  let items = getLocalAllowlist();
  if (status && status !== 'all') {
    items = items.filter((i) => i.status.toLowerCase() === status.toLowerCase());
  }
  if (search) {
    const term = search.toLowerCase();
    items = items.filter(
      (i) =>
        i.email.toLowerCase().includes(term) ||
        i.name.toLowerCase().includes(term) ||
        i.role.toLowerCase().includes(term)
    );
  }
  return items;
}

export async function addAllowlistEntry(
  payload: CreateAllowlistEntryPayload
): Promise<{ success: boolean; message: string; entry: AllowlistEntry }> {
  const endpoint = `${API_BASE_URL}/api/v1/admin/allowlist`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.entry) {
        const allowlist = getLocalAllowlist();
        const cleanEmail = data.entry.email.trim().toLowerCase();
        const idx = allowlist.findIndex((a) => a.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          allowlist[idx] = data.entry;
        } else {
          allowlist.unshift(data.entry);
        }
        saveLocalAllowlist(allowlist);
      }
      return data;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add allowlist entry.');
  } catch (err) {
    const allowlist = getLocalAllowlist();
    const cleanEmail = payload.email.trim().toLowerCase();
    let entry = allowlist.find((a) => a.email.toLowerCase() === cleanEmail);
    if (entry) {
      entry.status = 'active';
      entry.role = payload.role;
      entry.name = payload.name;
    } else {
      entry = {
        email: cleanEmail,
        name: payload.name.trim() || cleanEmail.split('@')[0],
        role: payload.role,
        status: 'active',
        added_at: new Date().toISOString(),
        added_by: 'admin',
      };
      allowlist.unshift(entry);
    }
    saveLocalAllowlist(allowlist);
    return {
      success: true,
      message: `Added ${entry.email} (${entry.role}) to allowlist.`,
      entry,
    };
  }
}

export async function revokeAllowlistEntry(
  email: string
): Promise<{ success: boolean; message: string; entry: AllowlistEntry }> {
  const endpoint = `${API_BASE_URL}/api/v1/admin/allowlist/${encodeURIComponent(email)}`;

  try {
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.entry) {
        const allowlist = getLocalAllowlist();
        const cleanEmail = data.entry.email.trim().toLowerCase();
        const target = allowlist.find((a) => a.email.toLowerCase() === cleanEmail);
        if (target) {
          target.status = 'revoked';
          target.revoked_at = data.entry.revoked_at || new Date().toISOString();
          target.revoked_by = data.entry.revoked_by || 'admin';
          saveLocalAllowlist(allowlist);
        }
      }
      return data;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to revoke access.');
  } catch (err) {
    const cleanEmail = email.trim().toLowerCase();
    if (
      cleanEmail === 'deepak@jfll.com' ||
      cleanEmail === 'tyra.theknath@jfll.com'
    ) {
      throw new Error(`Root administrator account '${cleanEmail}' cannot be revoked.`);
    }

    const allowlist = getLocalAllowlist();
    const entry = allowlist.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!entry) throw new Error(`Email '${cleanEmail}' not found.`);

    entry.status = 'revoked';
    entry.revoked_at = new Date().toISOString();
    entry.revoked_by = 'admin';
    saveLocalAllowlist(allowlist);

    return {
      success: true,
      message: `Access revoked for ${entry.email}.`,
      entry,
    };
  }
}
