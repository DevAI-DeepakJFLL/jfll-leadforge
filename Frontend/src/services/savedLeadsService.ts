import { Lead } from '@/types/lead';

export interface SavedList {
  id: string;
  name: string;
  leadIds: string[];
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEYS = {
  SAVED_LISTS: 'leadforge_saved_lists',
};

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
 * Subscribe to saved lists modifications.
 * Returns an unsubscribe function.
 */
export function subscribeToSavedChanges(listener: StateChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// In-memory fallback if localStorage is unavailable
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
}

/**
 * Delete a named list
 */
export function deleteSavedList(listName: string): void {
  const sanitized = sanitizeListName(listName);
  const targetLower = sanitized.toLowerCase();

  let lists = getSavedLists();
  lists = lists.filter((l) => l.name.toLowerCase() !== targetLower);
  persistSavedLists(lists);
}

/**
 * Reset all saved lists storage (useful for testing)
 */
export function resetSavedLeadsStorage(): void {
  memSavedLists = [...DEFAULT_LISTS];
  const storage = getStorage();
  if (isLocalStorageAvailable() && storage) {
    try {
      storage.removeItem(STORAGE_KEYS.SAVED_LISTS);
    } catch {
      // Ignore
    }
  }
  notifyListeners();
}
