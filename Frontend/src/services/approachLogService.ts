import { API_BASE_URL } from '@/config/api';
import { getStoredSession } from '@/services/authService';
import { logger } from '@/utils/logger';
import { getDeviceFingerprint } from '@/utils/antiBotGuard';
import {
  ApproachLogCreatePayload,
  ApproachLogEntry,
  BulkStatusesResponse,
  ConvertToActivePayload,
  EntityApproachHistory,
  FUNNEL_RANKS,
  MANDATORY_NOTE_STATUSES,
  SalesAction,
  SalesStatus,
} from '@/types/approachLog';

const APPROACH_STORAGE_KEY = 'jfll_approach_logs_v1';
const OUTBOX_STORAGE_KEY = 'jfll_approach_outbox_v1';
export const APPROACH_STATUS_CHANGED_EVENT = 'jfll-approach-status-updated';

export interface ApproachOutboxItem {
  id: string;
  type: 'log' | 'convert';
  entityType: 'datamyne' | 'jfll_customer';
  entityId: string;
  payload: ApproachLogCreatePayload | ConvertToActivePayload;
  queuedAt: string;
}

export function getPendingOutbox(): ApproachOutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingOutbox(items: ApproachOutboxItem[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    logger.warn('APPROACH_SERVICE', 'Failed to save pending outbox', { error: String(err) });
  }
}

export function enqueueOutboxItem(item: Omit<ApproachOutboxItem, 'id' | 'queuedAt'>): void {
  const items = getPendingOutbox();
  const newItem: ApproachOutboxItem = {
    ...item,
    id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString(),
  };
  items.push(newItem);
  savePendingOutbox(items);
}

let _isSyncingOutbox = false;

export async function syncPendingApproachOutbox(): Promise<number> {
  if (_isSyncingOutbox) return 0;
  _isSyncingOutbox = true;

  try {
    const items = getPendingOutbox();
    if (items.length === 0) return 0;

    const remaining: ApproachOutboxItem[] = [];
    let syncedCount = 0;

    for (const item of items) {
      try {
        if (item.type === 'log') {
          const res = await fetch(`${API_BASE_URL}/api/v1/approach-logs/${item.entityType}/${encodeURIComponent(item.entityId)}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(item.payload),
          });
          if (res.ok) {
            syncedCount++;
            continue;
          }
        } else if (item.type === 'convert') {
          const res = await fetch(
            `${API_BASE_URL}/api/v1/approach-logs/${item.entityType}/${encodeURIComponent(item.entityId)}/convert-to-active`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(item.payload),
            }
          );
          if (res.ok) {
            syncedCount++;
            continue;
          }
        }
      } catch {
        // Still offline, retain item
      }
      remaining.push(item);
    }

    savePendingOutbox(remaining);
    if (syncedCount > 0) {
      logger.info('APPROACH_SERVICE', `Successfully synced ${syncedCount} offline approach logs to server.`);
    }
    return syncedCount;
  } finally {
    _isSyncingOutbox = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingApproachOutbox().catch(() => {});
  });
}

const cachedBulkStatuses: Record<'datamyne' | 'jfll_customer', Record<string, SalesStatus>> = {
  datamyne: {},
  jfll_customer: {},
};

export function getCachedApproachStatus(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string
): SalesStatus {
  if (cachedBulkStatuses[entityType]?.[entityId]) {
    return cachedBulkStatuses[entityType][entityId];
  }
  const store = getLocalStore();
  const key = `${entityType}:${entityId}`;
  return store[key]?.current_status || 'Not Contacted';
}

export function getAllCachedApproachStatuses(
  entityType: 'datamyne' | 'jfll_customer'
): Record<string, SalesStatus> {
  const store = getLocalStore();
  const prefix = `${entityType}:`;
  const result: Record<string, SalesStatus> = { ...(cachedBulkStatuses[entityType] || {}) };
  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith(prefix)) {
      const rawId = value.entity_id || key.substring(prefix.length);
      result[rawId] = value.current_status;
    }
  }
  return result;
}

/**
 * Retrieves the latest logged sales approach note for an entity from local cache.
 * Returns '—' if no notes exist.
 */
export function getCachedApproachLatestNote(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string
): string {
  const store = getLocalStore();
  const key = `${entityType}:${entityId}`;
  const record = store[key];
  if (!record || !record.logs || record.logs.length === 0) {
    return '—';
  }
  for (const log of record.logs) {
    if (log.note && log.note.trim()) {
      return log.note.trim();
    }
  }
  return '—';
}

/**
 * Fetches the latest approach notes for multiple entities in parallel.
 * Utilizes the local store where available and fetches missing records from the API.
 */
export async function getLatestApproachNotesForEntities(
  entityType: 'datamyne' | 'jfll_customer',
  entityIds: string[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const toFetch: string[] = [];

  for (const id of entityIds) {
    const cached = getCachedApproachLatestNote(entityType, id);
    if (cached !== '—') {
      results[id] = cached;
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    await Promise.allSettled(
      toFetch.map(async (id) => {
        try {
          const history = await fetchEntityApproachHistory(entityType, id);
          if (history.logs && history.logs.length > 0) {
            for (const log of history.logs) {
              if (log.note && log.note.trim()) {
                results[id] = log.note.trim();
                return;
              }
            }
          }
          results[id] = '—';
        } catch {
          results[id] = '—';
        }
      })
    );
  }

  return results;
}

interface LocalStorageRecord {
  entity_type: 'datamyne' | 'jfll_customer';
  entity_id: string;
  current_status: SalesStatus;
  is_active_converted: boolean;
  converted_at?: string | null;
  conversion_start_date?: string | null;
  logs: ApproachLogEntry[];
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    err.name === 'TypeError'
  );
}

function getLocalStore(): Record<string, LocalStorageRecord> {
  try {
    const raw = localStorage.getItem(APPROACH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    logger.warn('APPROACH_SERVICE', 'Failed to read local approach store', { error: String(err) });
    return {};
  }
}

function saveLocalStore(store: Record<string, LocalStorageRecord>): void {
  try {
    localStorage.setItem(APPROACH_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    logger.warn('APPROACH_SERVICE', 'Failed to write local approach store', { error: String(err) });
  }
}

function getAuthHeaders(): Record<string, string> {
  const session = getStoredSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': getDeviceFingerprint(),
  };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

export function notifyApproachStatusUpdated(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  newStatus: SalesStatus,
  isActiveConverted: boolean = false
): void {
  if (!cachedBulkStatuses[entityType]) {
    cachedBulkStatuses[entityType] = {};
  }
  cachedBulkStatuses[entityType][entityId] = newStatus;

  if (typeof window !== 'undefined') {
    const event = new CustomEvent(APPROACH_STATUS_CHANGED_EVENT, {
      detail: { entityType, entityId, newStatus, isActiveConverted },
    });
    window.dispatchEvent(event);
  }
}

export async function fetchEntityApproachHistory(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string
): Promise<EntityApproachHistory> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/approach-logs/${entityType}/${encodeURIComponent(entityId)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const data: EntityApproachHistory = await res.json();
      // Cache locally
      const store = getLocalStore();
      store[`${entityType}:${entityId}`] = data;
      saveLocalStore(store);
      return data;
    }
  } catch (err) {
    logger.warn('APPROACH_SERVICE', 'API unreachable, checking local cache for approach history', { error: String(err) });
  }

  // Local fallback
  const store = getLocalStore();
  const cached = store[`${entityType}:${entityId}`];
  if (cached) {
    return cached;
  }

  return {
    entity_type: entityType,
    entity_id: entityId,
    current_status: 'Not Contacted',
    is_active_converted: false,
    logs: [],
  };
}

export async function logApproachActivity(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  payload: ApproachLogCreatePayload
): Promise<EntityApproachHistory> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/approach-logs/${entityType}/${encodeURIComponent(entityId)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: EntityApproachHistory = await res.json();
      const store = getLocalStore();
      store[`${entityType}:${entityId}`] = data;
      saveLocalStore(store);

      notifyApproachStatusUpdated(entityType, entityId, data.current_status, data.is_active_converted);
      return data;
    }

    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || 'Failed to log approach activity.');
  } catch (err: unknown) {
    if (err instanceof Error && !isNetworkError(err)) {
      throw err;
    }

    // Local fallback for offline/isolated mock environments
    logger.warn('APPROACH_SERVICE', 'Operating in offline mode for approach log', { error: String(err) });
    const store = getLocalStore();
    const key = `${entityType}:${entityId}`;
    const entity = store[key] || {
      entity_type: entityType,
      entity_id: entityId,
      current_status: 'Not Contacted',
      is_active_converted: false,
      logs: [],
    };

    const currentStatus = entity.current_status;
    const targetStatus = payload.status;
    const currentRank = FUNNEL_RANKS[currentStatus] ?? 0;
    const targetRank = FUNNEL_RANKS[targetStatus] ?? 0;

    if (targetRank < currentRank && (!payload.note || !payload.note.trim())) {
      throw new Error(`Moving status backward from '${currentStatus}' to '${targetStatus}' requires an explanatory note.`);
    }

    if (MANDATORY_NOTE_STATUSES.has(targetStatus) && (!payload.note || !payload.note.trim())) {
      throw new Error(`Setting status to '${targetStatus}' requires an explanatory note.`);
    }

    const session = getStoredSession();
    const salespersonName = session?.name || 'Sales Coordinator';
    const salespersonEmail = session?.email || 'sales.coordinator@jfll.com';

    const newLog: ApproachLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action: payload.action,
      previous_status: currentStatus,
      status: targetStatus,
      note: payload.note?.trim() || null,
      salesperson_name: salespersonName,
      salesperson_email: salespersonEmail,
      created_at: new Date().toISOString(),
    };

    entity.current_status = targetStatus;
    entity.logs.unshift(newLog);
    store[key] = entity;
    saveLocalStore(store);

    enqueueOutboxItem({
      type: 'log',
      entityType,
      entityId,
      payload,
    });

    notifyApproachStatusUpdated(entityType, entityId, targetStatus, entity.is_active_converted);
    return { ...entity, is_offline_pending: true };
  }
}

export async function convertClientToActive(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  payload: ConvertToActivePayload
): Promise<EntityApproachHistory> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/approach-logs/${entityType}/${encodeURIComponent(entityId)}/convert-to-active`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      const data: EntityApproachHistory = await res.json();
      const store = getLocalStore();
      store[`${entityType}:${entityId}`] = data;
      saveLocalStore(store);

      notifyApproachStatusUpdated(entityType, entityId, 'Converted to Active', true);
      return data;
    }

    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || 'Failed to convert client to active.');
  } catch (err: unknown) {
    if (err instanceof Error && !isNetworkError(err)) {
      throw err;
    }

    // Local fallback
    logger.warn('APPROACH_SERVICE', 'Operating in offline mode for active conversion', { error: String(err) });
    const store = getLocalStore();
    const key = `${entityType}:${entityId}`;
    const entity = store[key] || {
      entity_type: entityType,
      entity_id: entityId,
      current_status: 'Not Contacted',
      is_active_converted: false,
      logs: [],
    };

    const session = getStoredSession();
    const salespersonName = session?.name || 'Sales Coordinator';
    const salespersonEmail = session?.email || 'sales.coordinator@jfll.com';

    let activationNote = `Converted to Active. Effective start date: ${payload.start_date}.`;
    if (payload.note?.trim()) {
      activationNote += ` Handover Notes: ${payload.note.trim()}`;
    }

    const newLog: ApproachLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action: 'Other' as SalesAction,
      previous_status: entity.current_status,
      status: 'Converted to Active',
      note: activationNote,
      salesperson_name: salespersonName,
      salesperson_email: salespersonEmail,
      created_at: new Date().toISOString(),
    };

    entity.current_status = 'Converted to Active';
    entity.is_active_converted = true;
    entity.conversion_start_date = payload.start_date;
    entity.converted_at = new Date().toISOString();
    entity.logs.unshift(newLog);
    store[key] = entity;
    saveLocalStore(store);

    enqueueOutboxItem({
      type: 'convert',
      entityType,
      entityId,
      payload,
    });

    notifyApproachStatusUpdated(entityType, entityId, 'Converted to Active', true);
    return { ...entity, is_offline_pending: true };
  }
}

export async function fetchBulkStatuses(
  entityType: 'datamyne' | 'jfll_customer'
): Promise<Record<string, SalesStatus>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/approach-logs/bulk-statuses?entity_type=${entityType}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const data: BulkStatusesResponse = await res.json();
      const statusMap = data.statuses || {};
      cachedBulkStatuses[entityType] = { ...statusMap };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(APPROACH_STATUS_CHANGED_EVENT, { detail: { entityType, bulk: true } })
        );
      }
      return statusMap;
    }
  } catch (err) {
    logger.warn('APPROACH_SERVICE', 'API bulk statuses unreachable, falling back to local store', { error: String(err) });
  }

  // Local fallback
  const store = getLocalStore();
  const prefix = `${entityType}:`;
  const result: Record<string, SalesStatus> = {};
  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith(prefix)) {
      const rawId = value.entity_id || key.substring(prefix.length);
      result[rawId] = value.current_status;
    }
  }
  return result;
}
