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
export const MAX_OUTBOX_QUEUE = 200;
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

function savePendingOutbox(items: ApproachOutboxItem[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    logger.warn('APPROACH_SERVICE', 'Failed to save pending outbox', { error: String(err) });
  }
}

function enqueueOutboxItem(item: Omit<ApproachOutboxItem, 'id' | 'queuedAt'>): void {
  let items = getPendingOutbox();
  const newItem: ApproachOutboxItem = {
    ...item,
    id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString(),
  };
  items.push(newItem);
  if (items.length > MAX_OUTBOX_QUEUE) {
    items = items.slice(-MAX_OUTBOX_QUEUE);
  }
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
        let res: Response;
        if (item.type === 'log') {
          res = await fetch(`${API_BASE_URL}/api/v1/approach-logs/${item.entityType}/${encodeURIComponent(item.entityId)}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(item.payload),
          });
        } else {
          res = await fetch(
            `${API_BASE_URL}/api/v1/approach-logs/${item.entityType}/${encodeURIComponent(item.entityId)}/convert-to-active`,
            {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(item.payload),
            }
          );
        }

        if (res.ok) {
          syncedCount++;
          continue;
        }

        // If the server permanently rejected the request with a client error (4xx except 429 rate limit or 408 timeout),
        // discard the item so it doesn't loop infinitely in the outbox queue.
        if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) {
          const errData = await res.json().catch(() => ({}));
          logger.warn('APPROACH_SERVICE', `Discarding permanently rejected offline outbox item ${item.id}`, {
            status: res.status,
            detail: errData.detail || res.statusText,
            item,
          });
          continue;
        }
      } catch {
        // Network offline or connectivity error: retain item for next sync
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

const cachedBulkNotes: Record<'datamyne' | 'jfll_customer', Record<string, string>> = {
  datamyne: {},
  jfll_customer: {},
};

const cachedBulkCompanyStatuses: Record<'datamyne' | 'jfll_customer', Record<string, SalesStatus>> = {
  datamyne: {},
  jfll_customer: {},
};

const cachedBulkCompanyNotes: Record<'datamyne' | 'jfll_customer', Record<string, string>> = {
  datamyne: {},
  jfll_customer: {},
};

export interface PersistedBulkApproachData {
  statuses: Record<string, SalesStatus>;
  notes: Record<string, string>;
  company_statuses: Record<string, SalesStatus>;
  company_notes: Record<string, string>;
}

export function getBulkApproachStorageKey(entityType: 'datamyne' | 'jfll_customer'): string {
  return `jfll_bulk_approach_${entityType}`;
}

export function loadPersistedBulkData(
  entityType: 'datamyne' | 'jfll_customer'
): PersistedBulkApproachData | null {
  const key = getBulkApproachStorageKey(entityType);

  // 1. Try sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage) {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            statuses: parsed.statuses || {},
            notes: parsed.notes || {},
            company_statuses: parsed.company_statuses || {},
            company_notes: parsed.company_notes || {},
          };
        }
      }
    }
  } catch {
    // sessionStorage not available or threw
  }

  // 2. Fallback to localStorage
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            statuses: parsed.statuses || {},
            notes: parsed.notes || {},
            company_statuses: parsed.company_statuses || {},
            company_notes: parsed.company_notes || {},
          };
        }
      }
    }
  } catch {
    // localStorage not available or threw
  }

  return null;
}

export function savePersistedBulkData(
  entityType: 'datamyne' | 'jfll_customer',
  data: Partial<PersistedBulkApproachData>
): void {
  const key = getBulkApproachStorageKey(entityType);
  const payload: PersistedBulkApproachData = {
    statuses: data.statuses || {},
    notes: data.notes || {},
    company_statuses: data.company_statuses || {},
    company_notes: data.company_notes || {},
  };
  const serialized = JSON.stringify(payload);
  let savedInSession = false;

  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage) {
      sessionStorage.setItem(key, serialized);
      savedInSession = true;
    }
  } catch (err) {
    logger.warn('APPROACH_SERVICE', `Failed to save bulk data to sessionStorage for ${entityType}`, {
      error: String(err),
    });
  }

  if (!savedInSession) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(key, serialized);
      }
    } catch (err) {
      logger.warn('APPROACH_SERVICE', `Failed to save bulk data to localStorage for ${entityType}`, {
        error: String(err),
      });
    }
  }
}

export function hydrateBulkCaches(): void {
  const entityTypes: Array<'datamyne' | 'jfll_customer'> = ['datamyne', 'jfll_customer'];
  for (const entityType of entityTypes) {
    const data = loadPersistedBulkData(entityType);
    if (data) {
      if (data.statuses) {
        cachedBulkStatuses[entityType] = { ...data.statuses, ...cachedBulkStatuses[entityType] };
      }
      if (data.notes) {
        cachedBulkNotes[entityType] = { ...data.notes, ...cachedBulkNotes[entityType] };
      }
      if (data.company_statuses) {
        cachedBulkCompanyStatuses[entityType] = {
          ...data.company_statuses,
          ...cachedBulkCompanyStatuses[entityType],
        };
      }
      if (data.company_notes) {
        cachedBulkCompanyNotes[entityType] = {
          ...data.company_notes,
          ...cachedBulkCompanyNotes[entityType],
        };
      }
    }
  }
}

export function clearCachedBulkStatuses(): void {
  cachedBulkStatuses.datamyne = {};
  cachedBulkStatuses.jfll_customer = {};
  cachedBulkNotes.datamyne = {};
  cachedBulkNotes.jfll_customer = {};
  cachedBulkCompanyStatuses.datamyne = {};
  cachedBulkCompanyStatuses.jfll_customer = {};
  cachedBulkCompanyNotes.datamyne = {};
  cachedBulkCompanyNotes.jfll_customer = {};
}

// Hydrate bulk caches on module initialization
hydrateBulkCaches();

function ensureBulkCacheHydrated(entityType: 'datamyne' | 'jfll_customer'): void {
  const isStatusesEmpty =
    !cachedBulkStatuses[entityType] || Object.keys(cachedBulkStatuses[entityType]).length === 0;
  const isNotesEmpty =
    !cachedBulkNotes[entityType] || Object.keys(cachedBulkNotes[entityType]).length === 0;
  const isCompanyStatusesEmpty =
    !cachedBulkCompanyStatuses[entityType] ||
    Object.keys(cachedBulkCompanyStatuses[entityType]).length === 0;
  const isCompanyNotesEmpty =
    !cachedBulkCompanyNotes[entityType] ||
    Object.keys(cachedBulkCompanyNotes[entityType]).length === 0;

  if (isStatusesEmpty || isNotesEmpty || isCompanyStatusesEmpty || isCompanyNotesEmpty) {
    const data = loadPersistedBulkData(entityType);
    if (data) {
      if (isStatusesEmpty && data.statuses) {
        cachedBulkStatuses[entityType] = { ...data.statuses };
      }
      if (isNotesEmpty && data.notes) {
        cachedBulkNotes[entityType] = { ...data.notes };
      }
      if (isCompanyStatusesEmpty && data.company_statuses) {
        cachedBulkCompanyStatuses[entityType] = { ...data.company_statuses };
      }
      if (isCompanyNotesEmpty && data.company_notes) {
        cachedBulkCompanyNotes[entityType] = { ...data.company_notes };
      }
    }
  }
}

export function getCachedApproachStatus(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  companyName?: string | null
): SalesStatus {
  // If in-memory cache is empty, check stored bulk data
  ensureBulkCacheHydrated(entityType);

  if (cachedBulkStatuses[entityType]?.[entityId]) {
    return cachedBulkStatuses[entityType][entityId];
  }
  if (companyName && companyName.trim()) {
    const norm = companyName.trim().toLowerCase();
    if (cachedBulkCompanyStatuses[entityType]?.[norm]) {
      return cachedBulkCompanyStatuses[entityType][norm];
    }
  }

  // Check stored bulk data directly if not yet in memory
  const storedData = loadPersistedBulkData(entityType);
  if (storedData) {
    if (storedData.statuses?.[entityId]) {
      cachedBulkStatuses[entityType][entityId] = storedData.statuses[entityId];
      return storedData.statuses[entityId];
    }
    if (companyName && companyName.trim()) {
      const norm = companyName.trim().toLowerCase();
      if (storedData.company_statuses?.[norm]) {
        cachedBulkCompanyStatuses[entityType][norm] = storedData.company_statuses[norm];
        return storedData.company_statuses[norm];
      }
    }
  }

  const store = getLocalStore();
  const key = `${entityType}:${entityId}`;
  if (store[key]?.current_status) {
    return store[key].current_status;
  }
  if (companyName && companyName.trim()) {
    const norm = companyName.trim().toLowerCase();
    for (const rec of Object.values(store)) {
      if (rec.entity_type === entityType && rec.logs) {
        for (const log of rec.logs) {
          if ((log as any).company_name?.trim().toLowerCase() === norm) {
            return rec.current_status;
          }
        }
      }
    }
  }
  return 'Not Contacted';
}

/**
 * Retrieves the latest logged sales approach note for an entity from local cache.
 * Returns '—' if no notes exist.
 */
export function getCachedApproachLatestNote(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  companyName?: string | null
): string {
  // If in-memory cache is empty, check stored bulk data
  ensureBulkCacheHydrated(entityType);

  if (cachedBulkNotes[entityType]?.[entityId]) {
    return cachedBulkNotes[entityType][entityId];
  }
  if (companyName && companyName.trim()) {
    const norm = companyName.trim().toLowerCase();
    if (cachedBulkCompanyNotes[entityType]?.[norm]) {
      return cachedBulkCompanyNotes[entityType][norm];
    }
  }

  // Check stored bulk data directly if not yet in memory
  const storedData = loadPersistedBulkData(entityType);
  if (storedData) {
    if (storedData.notes?.[entityId]) {
      cachedBulkNotes[entityType][entityId] = storedData.notes[entityId];
      return storedData.notes[entityId];
    }
    if (companyName && companyName.trim()) {
      const norm = companyName.trim().toLowerCase();
      if (storedData.company_notes?.[norm]) {
        cachedBulkCompanyNotes[entityType][norm] = storedData.company_notes[norm];
        return storedData.company_notes[norm];
      }
    }
  }

  const store = getLocalStore();
  const key = `${entityType}:${entityId}`;
  const record = store[key];
  if (record?.logs && record.logs.length > 0) {
    for (const log of record.logs) {
      if (log.note && log.note.trim()) {
        return log.note.trim();
      }
    }
  }
  if (companyName && companyName.trim()) {
    const norm = companyName.trim().toLowerCase();
    for (const rec of Object.values(store)) {
      if (rec.entity_type === entityType && rec.logs) {
        for (const log of rec.logs) {
          if (
            (log as any).company_name?.trim().toLowerCase() === norm &&
            log.note &&
            log.note.trim()
          ) {
            return log.note.trim();
          }
        }
      }
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

  const uniqueIds = Array.from(new Set(entityIds));
  for (const id of uniqueIds) {
    const cached = getCachedApproachLatestNote(entityType, id);
    if (cached !== '—') {
      results[id] = cached;
    } else {
      toFetch.push(id);
    }
  }

  if (toFetch.length > 0) {
    // Process uncached lead history queries in bounded batches to respect browser connection pool limits
    const BATCH_SIZE = 8;
    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      const batch = toFetch.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (id) => {
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

function notifyApproachStatusUpdated(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  newStatus: SalesStatus,
  isActiveConverted: boolean = false,
  companyName?: string | null,
  note?: string | null
): void {
  if (!cachedBulkStatuses[entityType]) {
    cachedBulkStatuses[entityType] = {};
  }
  cachedBulkStatuses[entityType][entityId] = newStatus;

  if (note && note.trim()) {
    if (!cachedBulkNotes[entityType]) {
      cachedBulkNotes[entityType] = {};
    }
    cachedBulkNotes[entityType][entityId] = note.trim();
  }

  if (companyName && companyName.trim()) {
    const norm = companyName.trim().toLowerCase();
    if (!cachedBulkCompanyStatuses[entityType]) {
      cachedBulkCompanyStatuses[entityType] = {};
    }
    cachedBulkCompanyStatuses[entityType][norm] = newStatus;
    if (note && note.trim()) {
      if (!cachedBulkCompanyNotes[entityType]) {
        cachedBulkCompanyNotes[entityType] = {};
      }
      cachedBulkCompanyNotes[entityType][norm] = note.trim();
    }
  }

  // Persist the updated maps into storage so other views or reloads retain the company statuses and notes
  savePersistedBulkData(entityType, {
    statuses: cachedBulkStatuses[entityType],
    notes: cachedBulkNotes[entityType],
    company_statuses: cachedBulkCompanyStatuses[entityType],
    company_notes: cachedBulkCompanyNotes[entityType],
  });

  if (typeof window !== 'undefined') {
    const event = new CustomEvent(APPROACH_STATUS_CHANGED_EVENT, {
      detail: { entityType, entityId, newStatus, isActiveConverted, companyName, note },
    });
    window.dispatchEvent(event);
  }
}

export async function fetchEntityApproachHistory(
  entityType: 'datamyne' | 'jfll_customer',
  entityId: string,
  companyName?: string | null
): Promise<EntityApproachHistory> {
  try {
    let url = `${API_BASE_URL}/api/v1/approach-logs/${entityType}/${encodeURIComponent(entityId)}`;
    if (companyName && companyName.trim()) {
      url += `?company_name=${encodeURIComponent(companyName.trim())}`;
    }
    const res = await fetch(url, {
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
  if (companyName && companyName.trim()) {
    const norm = companyName.trim().toLowerCase();
    for (const rec of Object.values(store)) {
      if (rec.entity_type === entityType && rec.logs) {
        for (const log of rec.logs) {
          if ((log as any).company_name?.trim().toLowerCase() === norm) {
            return rec;
          }
        }
      }
    }
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

      notifyApproachStatusUpdated(
        entityType,
        entityId,
        data.current_status,
        data.is_active_converted,
        payload.company_name,
        payload.note
      );
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
      company_name: payload.company_name,
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

    notifyApproachStatusUpdated(
      entityType,
      entityId,
      targetStatus,
      entity.is_active_converted,
      payload.company_name,
      payload.note
    );
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
      if (data.notes) {
        cachedBulkNotes[entityType] = { ...data.notes };
      }
      if (data.company_statuses) {
        cachedBulkCompanyStatuses[entityType] = { ...data.company_statuses };
      }
      if (data.company_notes) {
        cachedBulkCompanyNotes[entityType] = { ...data.company_notes };
      }

      // Persist the updated maps into storage so other views or reloads retain the company statuses and notes
      savePersistedBulkData(entityType, {
        statuses: cachedBulkStatuses[entityType],
        notes: cachedBulkNotes[entityType],
        company_statuses: cachedBulkCompanyStatuses[entityType],
        company_notes: cachedBulkCompanyNotes[entityType],
      });

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
  const storedData = loadPersistedBulkData(entityType);
  const prefix = `${entityType}:`;
  const result: Record<string, SalesStatus> = {
    ...(storedData?.statuses || {}),
    ...(cachedBulkStatuses[entityType] || {}),
  };
  const store = getLocalStore();
  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith(prefix)) {
      const rawId = value.entity_id || key.substring(prefix.length);
      result[rawId] = value.current_status;
    }
  }
  return result;
}
