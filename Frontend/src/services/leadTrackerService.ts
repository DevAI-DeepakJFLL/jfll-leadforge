/**
 * Phase 2 Lead Status Tracker Service.
 * Provides full CRUD operations, high-performance O(1) in-memory caching,
 * single-pass client-side filtering, deterministic offline fallback, and
 * freight sales pipeline analytics.
 */

import { API_BASE_URL } from '@/config/api';
import { getStoredSession, getAuthHeaders } from '@/services/authService';
export { getAuthHeaders };
import { logger } from '@/utils/logger';
import {
  CLOSED_TRACKER_STATUSES,
  LeadTrackerCreatePayload,
  LeadTrackerFilterParams,
  LeadTrackerItem,
  LeadTrackerLogEntry,
  LeadTrackerUpdatePayload,
  RateValidityInfo,
  RateValidityStatus,
  TrackerActivityCreatePayload,
  TrackerFollowupStatus,
  TrackerKPIs,
} from '@/types/leadTracker';

export type { RateValidityInfo, RateValidityStatus };

export const TRACKER_API_BASE_URL = `${API_BASE_URL}/api/v1/lead-tracker`;
export const TRACKER_CACHE_STORAGE_KEY = 'jfll_lead_tracker_cache_v2';
export const LEGACY_TRACKER_CACHE_STORAGE_KEY = 'jfll_lead_tracker_cache_v1';
export const TRACKER_UPDATED_EVENT = 'jfll-tracker-lead-updated';

/**
 * Standard sales rep email mappings for automatic rep notification and assignment.
 */
export const SALES_REP_EMAILS: Record<string, string> = {
  'edward': 'edward@jfll.com',
  'tasneem': 'tasneem@jfll.com',
  'priyanka sardesai': 'priyanka.sardesai@jfll.com',
  'priyanka': 'priyanka.sardesai@jfll.com',
  'utkarsha': 'utkarsha@jfll.com',
  'sanjay': 'sanjay@jfll.com',
  'sidhart ji': 'sidhart@jfll.com',
  'sidhart': 'sidhart@jfll.com',
  'jaya': 'jaya@jfll.com',
  'sheela': 'sheela@jfll.com',
};

/**
 * Baseline for tracker starter leads. Hardcoded mock leads have been stripped;
 * live leads load exclusively from SQLite / REST API.
 */
export const DEFAULT_TRACKER_STARTER_LEADS: LeadTrackerItem[] = [];

/**
 * In-memory cache: Map<id, LeadTrackerItem> providing O(1) random access.
 */
const leadTrackerCache = new Map<string, LeadTrackerItem>();
let _cacheInitialized = false;

/**
 * Ensures the in-memory cache is populated from localStorage.
 * Initializes to empty [] if no cached data exists.
 */
function ensureCacheInitialized(): void {
  if (_cacheInitialized) return;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Purge any stale legacy cache containing deprecated hardcoded seed leads
      if (localStorage.getItem(LEGACY_TRACKER_CACHE_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_TRACKER_CACHE_STORAGE_KEY);
      }

      const raw = localStorage.getItem(TRACKER_CACHE_STORAGE_KEY);
      if (raw) {
        const parsed: LeadTrackerItem[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          leadTrackerCache.clear();
          for (const item of parsed) {
            leadTrackerCache.set(item.id, item);
          }
          _cacheInitialized = true;
          return;
        }
      }
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to read localStorage cache', {
      error: String(err),
    });
  }

  // Initialize clean empty cache (no mock leads auto-seeding)
  leadTrackerCache.clear();
  _cacheInitialized = true;
}

/**
 * Persists current in-memory cache state into browser localStorage.
 */
function persistCache(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const items = Array.from(leadTrackerCache.values());
      localStorage.setItem(TRACKER_CACHE_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to persist cache to localStorage', {
      error: String(err),
    });
  }
}

/**
 * Resets local cache to empty []. Useful for clean test isolation.
 */
export function resetTrackerLocalCache(): void {
  leadTrackerCache.clear();
  _cacheInitialized = true;
  persistCache();
}

/**
 * Test helper to populate the local tracker cache for isolated testing.
 */
export function seedTrackerLocalCacheForTesting(items: LeadTrackerItem[]): void {
  setTrackerCachedItems(items);
}

/**
 * Returns a cached tracked lead by ID in O(1) time.
 */
export function getTrackerCachedItem(id: string): LeadTrackerItem | undefined {
  ensureCacheInitialized();
  return leadTrackerCache.get(id);
}

/**
 * Returns all items in the in-memory cache.
 */
export function getAllTrackerCachedItems(): LeadTrackerItem[] {
  ensureCacheInitialized();
  return Array.from(leadTrackerCache.values());
}

/**
 * Replaces the in-memory cache with the provided items.
 */
export function setTrackerCachedItems(items: LeadTrackerItem[]): void {
  leadTrackerCache.clear();
  for (const item of items) {
    leadTrackerCache.set(item.id, item);
  }
  _cacheInitialized = true;
  persistCache();
}

/**
 * Evaluates the follow-up urgency status using O(1) ISO date string comparison.
 * Avoids expensive `new Date()` parsing on every table render.
 *
 * Rules:
 * - Returns 'none' if followupDate is missing or if status is 'Won' or 'Closed / Lost'.
 * - Returns 'overdue' if followupDate < todayStr.
 * - Returns 'due_today' if followupDate === todayStr.
 * - Returns 'upcoming' if followupDate > todayStr.
 */
export function getFollowupStatus(
  followupDate?: string | null,
  status?: string,
  todayStrOverride?: string
): TrackerFollowupStatus {
  if (!followupDate || !followupDate.trim()) {
    return 'none';
  }
  if (status === 'Won' || status === 'Closed / Lost') {
    return 'none';
  }

  const todayStr = todayStrOverride || new Date().toISOString().slice(0, 10);
  const cleanDate = followupDate.trim();

  if (cleanDate < todayStr) {
    return 'overdue';
  }
  if (cleanDate === todayStr) {
    return 'due_today';
  }
  return 'upcoming';
}

export const NO_QUOTE_INFO: RateValidityInfo = Object.freeze({
  status: 'none',
  daysRemaining: null,
  label: 'No Quote',
  badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
  borderClass: 'border-slate-200',
});

/**
 * Evaluates the freight quote rate validity horizon using pure UTC date arithmetic.
 * Ensures O(1) constant time evaluation and eliminates timezone drift across client environments.
 *
 * Rules:
 * - Returns 'none' with 'No Quote' label and slate styling if rate_validity_date is missing or invalid.
 * - If delta < 0: status is 'expired', label is `Expired (${Math.abs(delta)}d ago)`, rose styling.
 * - If delta === 0: status is 'expiring_soon', label is 'Expires Today', amber styling.
 * - If delta is 1 or 2: status is 'expiring_soon', label is `${delta}d left`, amber styling.
 * - If delta > 2: status is 'valid', label is `${delta}d valid`, emerald styling.
 */
export function getRateValidityInfo(
  lead?: Partial<LeadTrackerItem> | null,
  referenceDateStr?: string
): RateValidityInfo {
  const dateStr = lead?.rate_validity_date?.trim();
  if (!dateStr) {
    return NO_QUOTE_INFO;
  }

  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return NO_QUOTE_INFO;
  }

  const [vy, vm, vd] = parts.map(Number);
  if (Number.isNaN(vy) || Number.isNaN(vm) || Number.isNaN(vd)) {
    return NO_QUOTE_INFO;
  }

  const refStr = referenceDateStr?.trim() || new Date().toISOString().slice(0, 10);
  const refParts = refStr.split('-');
  if (refParts.length !== 3) {
    return NO_QUOTE_INFO;
  }

  const [ry, rm, rd] = refParts.map(Number);
  if (Number.isNaN(ry) || Number.isNaN(rm) || Number.isNaN(rd)) {
    return NO_QUOTE_INFO;
  }

  const targetUtc = Date.UTC(vy, vm - 1, vd);
  const refUtc = Date.UTC(ry, rm - 1, rd);
  const diffMs = targetUtc - refUtc;
  const delta = Math.round(diffMs / 86400000);

  if (delta < 0) {
    return {
      status: 'expired',
      daysRemaining: delta,
      label: `Expired (${Math.abs(delta)}d ago)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      borderClass: 'border-rose-300',
    };
  }

  if (delta <= 2) {
    return {
      status: 'expiring_soon',
      daysRemaining: delta,
      label: delta === 0 ? 'Expires Today' : `${delta}d left`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      borderClass: 'border-amber-300',
    };
  }

  return {
    status: 'valid',
    daysRemaining: delta,
    label: `${delta}d valid`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-300',
  };
}

/**
 * High-performance single-pass in-memory filter and sort.
 * Executes in O(N log N) time without multi-pass array allocations.
 */
export function filterTrackedLeadsInMemory(
  items: LeadTrackerItem[],
  filters?: LeadTrackerFilterParams,
  todayStr?: string
): LeadTrackerItem[] {
  if (!items || items.length === 0) return [];
  const activeToday = todayStr || new Date().toISOString().slice(0, 10);

  const branchFilter = filters?.branch?.trim().toLowerCase();
  const repFilter = filters?.assigned_to?.trim().toLowerCase();
  const statusFilter = filters?.status?.trim().toLowerCase();
  const overdueOnly = !!filters?.overdue_only;
  const searchFilter = filters?.search?.trim().toLowerCase();

  const filtered: LeadTrackerItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (branchFilter && branchFilter !== 'all' && item.branch.trim().toLowerCase() !== branchFilter) {
      continue;
    }

    if (repFilter && repFilter !== 'all') {
      const repLower = item.assigned_to.trim().toLowerCase();
      if (!repLower.includes(repFilter)) {
        continue;
      }
    }

    if (statusFilter && statusFilter !== 'all' && item.status.trim().toLowerCase() !== statusFilter) {
      continue;
    }

    if (overdueOnly) {
      const fupStatus = getFollowupStatus(item.next_followup_date, item.status, activeToday);
      if (fupStatus !== 'overdue') {
        continue;
      }
    }

    if (searchFilter) {
      const match =
        item.company_name.toLowerCase().includes(searchFilter) ||
        (item.contact_person && item.contact_person.toLowerCase().includes(searchFilter)) ||
        (item.feedback_notes && item.feedback_notes.toLowerCase().includes(searchFilter)) ||
        (item.next_action && item.next_action.toLowerCase().includes(searchFilter)) ||
        item.branch.toLowerCase().includes(searchFilter) ||
        item.assigned_to.toLowerCase().includes(searchFilter);

      if (!match) {
        continue;
      }
    }

    filtered.push(item);
  }

  // Sorting: in-place on the filtered array
  const sortBy = filters?.sort_by || 'updated_at';
  const isAsc = filters?.order === 'asc';

  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'next_followup_date') {
      // Null follow-up dates sort to the bottom
      if (!a.next_followup_date && !b.next_followup_date) comparison = 0;
      else if (!a.next_followup_date) return 1;
      else if (!b.next_followup_date) return -1;
      else comparison = a.next_followup_date.localeCompare(b.next_followup_date);
    } else if (sortBy === 'company_name') {
      comparison = a.company_name.localeCompare(b.company_name);
    } else if (sortBy === 'assigned_date') {
      comparison = a.assigned_date.localeCompare(b.assigned_date);
    } else {
      comparison = (a.updated_at || '').localeCompare(b.updated_at || '');
    }
    return isAsc ? comparison : -comparison;
  });

  return filtered;
}

/**
 * Computes executive KPIs in a single O(N) pass across all tracked items.
 */
export function computeTrackerKPIsInMemory(
  items: LeadTrackerItem[],
  todayStr?: string
): TrackerKPIs {
  const activeToday = todayStr || new Date().toISOString().slice(0, 10);
  let active = 0;
  let quoted = 0;
  let won = 0;
  let overdue = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isClosed = CLOSED_TRACKER_STATUSES.includes(item.status);
    if (!isClosed) {
      active++;
      if (getFollowupStatus(item.next_followup_date, item.status, activeToday) === 'overdue') {
        overdue++;
      }
    }
    if (item.status === 'Quoted') {
      quoted++;
    } else if (item.status === 'Won') {
      won++;
    }
  }

  return {
    total_leads: items.length,
    active_leads: active,
    quoted_leads: quoted,
    won_leads: won,
    overdue_leads: overdue,
  };
}

/**
 * Fetches tracked leads from the backend API.
 * Falls back gracefully to in-memory/localStorage cache if backend is offline.
 */
export async function fetchTrackedLeads(
  filters?: LeadTrackerFilterParams
): Promise<LeadTrackerItem[]> {
  ensureCacheInitialized();

  const params = new URLSearchParams();
  if (filters?.branch && filters.branch !== 'all') params.set('branch', filters.branch);
  if (filters?.assigned_to && filters.assigned_to !== 'all') params.set('assigned_to', filters.assigned_to);
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.overdue_only) params.set('overdue_only', 'true');
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sort_by) params.set('sort_by', filters.sort_by);
  if (filters?.order) params.set('order', filters.order);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Lead Tracker API returned HTTP ${response.status}`);
    }

    const data: LeadTrackerItem[] = await response.json();

    // Refresh in-memory cache with fresh items
    leadTrackerCache.clear();
    for (const item of data) {
      leadTrackerCache.set(item.id, item);
    }
    persistCache();

    return data;
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to fetch live tracked leads, using local fallback', {
      error: String(err),
    });

    const cachedItems = Array.from(leadTrackerCache.values());
    return filterTrackedLeadsInMemory(cachedItems, filters);
  }
}

/**
 * Fetches aggregated executive KPIs from the API.
 * Falls back to O(N) client-side calculation if offline.
 */
export async function fetchTrackerKPIs(): Promise<TrackerKPIs> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/kpis`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Lead Tracker KPIs API returned HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Failed to fetch tracker KPIs, calculating locally', {
      error: String(err),
    });

    const cachedItems = Array.from(leadTrackerCache.values());
    return computeTrackerKPIsInMemory(cachedItems);
  }
}

/**
 * Fetches a single tracked lead by ID.
 * Returns cached item if available, or pulls from backend.
 */
export async function fetchTrackedLeadById(id: string): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data: LeadTrackerItem = await response.json();
      leadTrackerCache.set(data.id, data);
      persistCache();
      return data;
    }
  } catch (err) {
    logger.debug('LEAD_TRACKER_SERVICE', `Fetch lead '${id}' failed, checking local cache`, {
      error: String(err),
    });
  }

  const cached = leadTrackerCache.get(id);
  if (cached) {
    return cached;
  }

  throw new Error(`Tracked lead with ID '${id}' not found`);
}

/**
 * Creates and assigns a new tracked lead.
 * Persists optimistically to local cache on network error.
 */
export async function createTrackedLead(
  payload: LeadTrackerCreatePayload
): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(TRACKER_API_BASE_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const created: LeadTrackerItem = await response.json();
      leadTrackerCache.set(created.id, created);
      persistCache();
      notifyTrackerLeadUpdated(created);
      return created;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', 'Backend unavailable, creating tracked lead locally', {
      error: String(err),
    });
  }

  // Offline / fallback item creation
  const nowIso = new Date().toISOString();
  const id = `trk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const repClean = payload.assigned_to.trim().toLowerCase();
  const repEmail = payload.assigned_to_email || SALES_REP_EMAILS[repClean] || null;

  const initialHistory: LeadTrackerLogEntry[] = [
    {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: payload.assigned_by || 'Tyra Theknath',
      author_email: 'tyra@jfll.com',
      action: 'Lead Created / Assigned',
      notes: payload.feedback_notes || `Assigned to ${payload.assigned_to} (${payload.branch || 'Mumbai'} branch)`,
    },
  ];

  const localItem: LeadTrackerItem = {
    id,
    company_name: payload.company_name,
    contact_person: payload.contact_person ?? null,
    contact_phone: payload.contact_phone ?? null,
    contact_email: payload.contact_email ?? null,
    branch: payload.branch || 'Mumbai',
    assigned_to: payload.assigned_to,
    assigned_to_email: repEmail,
    assigned_by: payload.assigned_by || 'Tyra Theknath',
    assigned_date: payload.assigned_date || nowIso.slice(0, 10),
    status: payload.status || 'Assigned',
    transport_mode: payload.transport_mode || 'Air Freight',
    routing_type: payload.routing_type || 'Freehand',
    feedback_notes: payload.feedback_notes ?? null,
    next_followup_date: payload.next_followup_date ?? null,
    next_action: payload.next_action ?? null,
    quote_date: payload.quote_date ?? null,
    rate_validity_date: payload.rate_validity_date ?? null,
    rate_validity_days: payload.rate_validity_days ?? null,
    target_shipment_date: payload.target_shipment_date ?? null,
    linked_entity_type: payload.linked_entity_type || 'custom',
    linked_entity_id: payload.linked_entity_id ?? null,
    history: initialHistory,
    created_at: nowIso,
    updated_at: nowIso,
  };

  leadTrackerCache.set(id, localItem);
  persistCache();
  notifyTrackerLeadUpdated(localItem);
  return localItem;
}

/**
 * Updates a tracked lead's stage, feedback notes, follow-up date, or assignment.
 * Generates audit log entries for status transitions or reassignments.
 */
export async function updateTrackedLead(
  id: string,
  updates: LeadTrackerUpdatePayload
): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const updated: LeadTrackerItem = await response.json();
      leadTrackerCache.set(updated.id, updated);
      persistCache();
      notifyTrackerLeadUpdated(updated);
      return updated;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', `Backend unavailable, updating lead '${id}' locally`, {
      error: String(err),
    });
  }

  // Local fallback update
  const existing = leadTrackerCache.get(id);
  if (!existing) {
    throw new Error(`Tracked lead with ID '${id}' not found in local cache`);
  }

  const nowIso = new Date().toISOString();
  const session = getStoredSession();
  const authorName = session?.name || updates.assigned_by || 'Leadership';
  const authorEmail = session?.email || 'leadership@jfll.com';

  const newHistory = [...existing.history];

  // Detect and log changes
  if (updates.status && updates.status !== existing.status) {
    let note = `Status updated from '${existing.status}' to '${updates.status}'`;
    if (updates.feedback_notes) {
      note += `. Notes: ${updates.feedback_notes}`;
    }
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Status Change',
      notes: note,
    });
  } else if (updates.assigned_to && updates.assigned_to !== existing.assigned_to) {
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Reassignment',
      notes: `Reassigned from ${existing.assigned_to} to ${updates.assigned_to}`,
    });
  } else if (updates.next_followup_date && updates.next_followup_date !== existing.next_followup_date) {
    let note = `Next follow-up date set to ${updates.next_followup_date}`;
    if (updates.next_action) {
      note += `: ${updates.next_action}`;
    }
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Follow-up Scheduled',
      notes: note,
    });
  } else if (updates.feedback_notes && updates.feedback_notes !== existing.feedback_notes) {
    newHistory.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowIso,
      author_name: authorName,
      author_email: authorEmail,
      action: 'Feedback Logged',
      notes: updates.feedback_notes,
    });
  }

  const updatedRep = updates.assigned_to || existing.assigned_to;
  const repClean = updatedRep.trim().toLowerCase();
  const repEmail = updates.assigned_to_email || SALES_REP_EMAILS[repClean] || existing.assigned_to_email;

  const mergedItem: LeadTrackerItem = {
    ...existing,
    ...updates,
    assigned_to: updatedRep,
    assigned_to_email: repEmail,
    history: newHistory,
    updated_at: nowIso,
  };

  leadTrackerCache.set(id, mergedItem);
  persistCache();
  notifyTrackerLeadUpdated(mergedItem);
  return mergedItem;
}

/**
 * Records an activity/touchpoint log entry for a tracked lead.
 */
export async function logTrackerActivity(
  id: string,
  payload: TrackerActivityCreatePayload
): Promise<LeadTrackerItem> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}/activity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const updated: LeadTrackerItem = await response.json();
      leadTrackerCache.set(updated.id, updated);
      persistCache();
      notifyTrackerLeadUpdated(updated);
      return updated;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', `Backend unavailable, logging activity for '${id}' locally`, {
      error: String(err),
    });
  }

  // Local fallback activity log
  const existing = leadTrackerCache.get(id);
  if (!existing) {
    throw new Error(`Tracked lead with ID '${id}' not found in local cache`);
  }

  const nowIso = new Date().toISOString();
  const session = getStoredSession();
  const authorName = payload.author_name || session?.name || 'Sales Coordinator';
  const authorEmail = payload.author_email || session?.email || 'sales@jfll.com';

  const entry: LeadTrackerLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: nowIso,
    author_name: authorName,
    author_email: authorEmail,
    action: payload.action,
    notes: payload.notes ?? null,
  };

  const updatedItem: LeadTrackerItem = {
    ...existing,
    status: payload.status || existing.status,
    next_followup_date:
      payload.next_followup_date !== undefined ? payload.next_followup_date : existing.next_followup_date,
    history: [...existing.history, entry],
    updated_at: nowIso,
  };

  leadTrackerCache.set(id, updatedItem);
  persistCache();
  notifyTrackerLeadUpdated(updatedItem);
  return updatedItem;
}

/**
 * Deletes or archives a tracked lead.
 */
export async function deleteTrackedLead(id: string): Promise<boolean> {
  ensureCacheInitialized();

  try {
    const response = await fetch(`${TRACKER_API_BASE_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      leadTrackerCache.delete(id);
      persistCache();
      return true;
    }
  } catch (err) {
    logger.warn('LEAD_TRACKER_SERVICE', `Backend unavailable, deleting lead '${id}' locally`, {
      error: String(err),
    });
  }

  // Local deletion
  const deleted = leadTrackerCache.delete(id);
  persistCache();
  return deleted;
}

/**
 * Dispatches a custom DOM event so reactive UI components can synchronize instantly.
 */
function notifyTrackerLeadUpdated(item: LeadTrackerItem): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent(TRACKER_UPDATED_EVENT, {
          detail: item,
        })
      );
    } catch {
      // Ignore in non-browser or test environments
    }
  }
}
