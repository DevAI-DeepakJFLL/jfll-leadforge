import { Lead } from '@/types/lead';

export interface SavedList {
  id: string;
  name: string;
  leadIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface SavedLeadItem extends Lead {
  savedAt: string;
  listNames?: string[];
}

const STORAGE_KEYS = {
  SAVED_LEADS: 'leadforge_saved_leads',
  SAVED_LISTS: 'leadforge_saved_lists',
};

export const MAX_SAVED_LEADS = 1000;
export const MAX_SAVED_LISTS = 50;
export const MAX_LIST_NAME_LENGTH = 50;
const FORBIDDEN_LIST_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

const DEFAULT_LISTS: SavedList[] = [];

type StateChangeListener = () => void;
const listeners = new Set<StateChangeListener>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

/**
 * Subscribe to saved leads and lists modifications.
 * Returns an unsubscribe function.
 */
export function subscribeToSavedChanges(listener: StateChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// In-memory fallback if localStorage is unavailable
let memSavedLeads: Record<string, SavedLeadItem> = {};
let memSavedLists: SavedList[] = [...DEFAULT_LISTS];

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function isLocalStorageAvailable(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe JSON Object deserializer preventing Prototype Pollution and Type Errors
 */
function safeParseObject<T>(raw: string | null, fallback: Record<string, T>): Record<string, T> {
  if (!raw) return { ...fallback };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean: Record<string, T> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
          clean[key] = value as T;
        }
      }
      return clean;
    }
    return { ...fallback };
  } catch {
    return { ...fallback };
  }
}

/**
 * Safe JSON Array deserializer preventing Type Confusion Errors
 */
function safeParseArray<T>(raw: string | null, fallback: T[]): T[] {
  if (!raw) return [...fallback];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [...fallback];
  } catch {
    return [...fallback];
  }
}

/**
 * Sanitizes user-defined custom list names to prevent DOM XSS, prototype injection, and layout breakage
 */
export function sanitizeListName(rawName: string): string {
  if (!rawName) return '';
  // Strip control characters, angle brackets (< and >), and trim extra whitespace
  let cleaned = rawName
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();

  if (cleaned.length > MAX_LIST_NAME_LENGTH) {
    cleaned = cleaned.substring(0, MAX_LIST_NAME_LENGTH).trim();
  }

  if (FORBIDDEN_LIST_NAMES.has(cleaned.toLowerCase())) {
    throw new Error(`Invalid list name: '${cleaned}' is a reserved identifier`);
  }

  return cleaned;
}

/**
 * Defensive quota trimmer: prunes oldest leads if the storage limit is exceeded
 */
function enforceSavedLeadsCapacity(map: Record<string, SavedLeadItem>, maxLimit = MAX_SAVED_LEADS): Record<string, SavedLeadItem> {
  const entries = Object.entries(map);
  if (entries.length <= maxLimit) return map;

  // Sort ascending by savedAt (oldest first)
  entries.sort(([, a], [, b]) => (a.savedAt || '').localeCompare(b.savedAt || ''));

  const trimmedEntries = entries.slice(entries.length - maxLimit);
  const result: Record<string, SavedLeadItem> = {};
  for (const [id, lead] of trimmedEntries) {
    result[id] = lead;
  }
  return result;
}

/**
 * Loads saved leads map from storage with defensive prototype pollution protection
 */
export function getSavedLeadsMap(): Record<string, SavedLeadItem> {
  const storage = getStorage();
  if (!isLocalStorageAvailable() || !storage) {
    return { ...memSavedLeads };
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.SAVED_LEADS);
    return safeParseObject<SavedLeadItem>(raw, memSavedLeads);
  } catch {
    return { ...memSavedLeads };
  }
}

function persistSavedLeadsMap(map: Record<string, SavedLeadItem>): void {
  const cappedMap = enforceSavedLeadsCapacity(map);
  memSavedLeads = { ...cappedMap };

  const storage = getStorage();
  if (isLocalStorageAvailable() && storage) {
    try {
      storage.setItem(STORAGE_KEYS.SAVED_LEADS, JSON.stringify(cappedMap));
    } catch (err) {
      // Storage quota exceeded or permission denied: attempt defensive pruning of oldest 15%
      try {
        const reducedMap = enforceSavedLeadsCapacity(cappedMap, Math.floor(MAX_SAVED_LEADS * 0.85));
        memSavedLeads = { ...reducedMap };
        storage.setItem(STORAGE_KEYS.SAVED_LEADS, JSON.stringify(reducedMap));
      } catch {
        // Fall back gracefully to in-memory persistence without crashing
      }
    }
  }
  notifyListeners();
}

/**
 * Returns all saved leads as an array
 */
export function getSavedLeads(): SavedLeadItem[] {
  const map = getSavedLeadsMap();
  return Object.values(map).sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

/**
 * Returns a Set of all saved lead IDs
 */
export function getSavedLeadIds(): Set<string> {
  const map = getSavedLeadsMap();
  return new Set(Object.keys(map));
}

/**
 * Check if a lead is saved
 */
export function isLeadSaved(leadId: string): boolean {
  const map = getSavedLeadsMap();
  return Boolean(map[leadId]);
}

/**
 * Save a single lead
 */
export function saveLead(lead: Lead, listName?: string): SavedLeadItem {
  const map = getSavedLeadsMap();
  const existing = map[lead.id];

  const currentLists = new Set<string>(existing?.listNames || []);
  if (listName) {
    const sanitized = sanitizeListName(listName);
    if (sanitized) {
      currentLists.add(sanitized);
    }
  }

  const savedItem: SavedLeadItem = {
    ...lead,
    saved: true,
    savedAt: existing?.savedAt || new Date().toISOString(),
    listNames: Array.from(currentLists),
  };

  map[lead.id] = savedItem;
  persistSavedLeadsMap(map);
  return savedItem;
}

/**
 * Unsave a single lead
 */
export function unsaveLead(leadId: string): void {
  const map = getSavedLeadsMap();
  if (map[leadId]) {
    delete map[leadId];
    persistSavedLeadsMap(map);
  }
}

/**
 * Toggle saved status for a single lead.
 * Returns true if lead is now saved, false if unsaved.
 */
export function toggleSaveLead(lead: Lead): boolean {
  if (isLeadSaved(lead.id)) {
    unsaveLead(lead.id);
    return false;
  } else {
    saveLead(lead);
    return true;
  }
}

/**
 * Batch save or unsave leads
 */
export function batchSaveLeads(leads: Lead[], saved = true): number {
  const map = getSavedLeadsMap();
  let updatedCount = 0;

  for (const lead of leads) {
    if (saved) {
      if (!map[lead.id]) {
        map[lead.id] = {
          ...lead,
          saved: true,
          savedAt: new Date().toISOString(),
          listNames: [],
        };
        updatedCount += 1;
      }
    } else {
      if (map[lead.id]) {
        delete map[lead.id];
        updatedCount += 1;
      }
    }
  }

  persistSavedLeadsMap(map);
  return updatedCount;
}

/**
 * Loads all saved lists with type guard
 */
export function getSavedLists(): SavedList[] {
  const storage = getStorage();
  if (!isLocalStorageAvailable() || !storage) {
    return [...memSavedLists];
  }
  try {
    const raw = storage.getItem(STORAGE_KEYS.SAVED_LISTS);
    if (!raw) {
      storage.setItem(STORAGE_KEYS.SAVED_LISTS, JSON.stringify(DEFAULT_LISTS));
      return [...DEFAULT_LISTS];
    }
    return safeParseArray<SavedList>(raw, DEFAULT_LISTS);
  } catch {
    return [...memSavedLists];
  }
}

function persistSavedLists(lists: SavedList[]): void {
  memSavedLists = [...lists];
  const storage = getStorage();
  if (isLocalStorageAvailable() && storage) {
    try {
      storage.setItem(STORAGE_KEYS.SAVED_LISTS, JSON.stringify(lists));
    } catch {
      // Ignore quota errors
    }
  }
  notifyListeners();
}

/**
 * Create a new named list with sanitization
 */
export function createSavedList(name: string): SavedList {
  const trimmed = sanitizeListName(name);
  if (!trimmed) throw new Error('List name cannot be empty');

  const lists = getSavedLists();
  const existing = lists.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    return existing;
  }

  const newList: SavedList = {
    id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: trimmed,
    leadIds: [],
    createdAt: new Date().toISOString(),
  };

  lists.push(newList);
  persistSavedLists(lists);
  return newList;
}

/**
 * Add an array of leads to a named list.
 * Automatically saves the lead objects into saved leads as well.
 */
export function addLeadsToList(
  listName: string,
  leads: Lead[]
): { list: SavedList; addedCount: number } {
  const trimmed = sanitizeListName(listName);
  if (!trimmed) throw new Error('List name cannot be empty');

  const lists = getSavedLists();
  let list = lists.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());

  if (!list) {
    list = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      leadIds: [],
      createdAt: new Date().toISOString(),
    };
    lists.push(list);
  }

  const existingIds = new Set(list.leadIds);
  let addedCount = 0;

  for (const lead of leads) {
    if (!existingIds.has(lead.id)) {
      list.leadIds.push(lead.id);
      addedCount += 1;
    }
    // Also save lead to saved leads repository so lead data is permanently preserved
    saveLead(lead, trimmed);
  }

  list.updatedAt = new Date().toISOString();
  persistSavedLists(lists);
  return { list, addedCount };
}

/**
 * Remove a lead from a named list
 */
export function removeLeadFromList(listName: string, leadId: string): void {
  const sanitized = sanitizeListName(listName);
  const lists = getSavedLists();
  const list = lists.find((l) => l.name.toLowerCase() === sanitized.toLowerCase());
  if (list) {
    list.leadIds = list.leadIds.filter((id) => id !== leadId);
    list.updatedAt = new Date().toISOString();
    persistSavedLists(lists);
  }

  // Update lead item
  const map = getSavedLeadsMap();
  const lead = map[leadId];
  if (lead && lead.listNames) {
    lead.listNames = lead.listNames.filter((name) => name.toLowerCase() !== sanitized.toLowerCase());
    persistSavedLeadsMap(map);
  }
}

/**
 * Delete a named list and clean up referential integrity across saved leads
 */
export function deleteSavedList(listName: string): void {
  const sanitized = sanitizeListName(listName);
  const targetLower = sanitized.toLowerCase();

  let lists = getSavedLists();
  lists = lists.filter((l) => l.name.toLowerCase() !== targetLower);
  persistSavedLists(lists);

  // Clean up orphan list references on saved leads
  const map = getSavedLeadsMap();
  let modified = false;
  for (const lead of Object.values(map)) {
    if (lead.listNames && lead.listNames.some((n) => n.toLowerCase() === targetLower)) {
      lead.listNames = lead.listNames.filter((n) => n.toLowerCase() !== targetLower);
      modified = true;
    }
  }
  if (modified) {
    persistSavedLeadsMap(map);
  }
}

/**
 * Retrieve saved leads for a specific list
 */
export function getLeadsForList(listName: string): SavedLeadItem[] {
  const sanitized = sanitizeListName(listName);
  const lists = getSavedLists();
  const list = lists.find((l) => l.name.toLowerCase() === sanitized.toLowerCase());
  if (!list) return [];

  const map = getSavedLeadsMap();
  const leadIdSet = new Set(list.leadIds);
  return Object.values(map)
    .filter((lead) => leadIdSet.has(lead.id))
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

/**
 * Reset all saved storage (useful for testing)
 */
export function resetSavedLeadsStorage(): void {
  memSavedLeads = {};
  memSavedLists = [...DEFAULT_LISTS];
  const storage = getStorage();
  if (isLocalStorageAvailable() && storage) {
    try {
      storage.removeItem(STORAGE_KEYS.SAVED_LEADS);
      storage.removeItem(STORAGE_KEYS.SAVED_LISTS);
    } catch {
      // Ignore
    }
  }
  notifyListeners();
}
