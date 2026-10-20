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

const DEFAULT_LISTS: SavedList[] = [
  {
    id: 'list-west-coast-vips',
    name: 'West Coast VIPs',
    leadIds: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list-high-growth-accounts',
    name: 'High Growth Accounts',
    leadIds: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list-q4-prospects',
    name: 'Q4 Prospects',
    leadIds: [],
    createdAt: new Date().toISOString(),
  },
];

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

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads saved leads map from storage
 */
export function getSavedLeadsMap(): Record<string, SavedLeadItem> {
  if (!isLocalStorageAvailable()) {
    return { ...memSavedLeads };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SAVED_LEADS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return { ...memSavedLeads };
  }
}

function persistSavedLeadsMap(map: Record<string, SavedLeadItem>): void {
  memSavedLeads = { ...map };
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.SAVED_LEADS, JSON.stringify(map));
    } catch {
      // Ignore quota errors
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
  if (listName && listName.trim()) {
    currentLists.add(listName.trim());
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
 * Loads all saved lists
 */
export function getSavedLists(): SavedList[] {
  if (!isLocalStorageAvailable()) {
    return [...memSavedLists];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SAVED_LISTS);
    if (!raw) {
      // Seed default lists once
      window.localStorage.setItem(STORAGE_KEYS.SAVED_LISTS, JSON.stringify(DEFAULT_LISTS));
      return [...DEFAULT_LISTS];
    }
    const parsed: SavedList[] = JSON.parse(raw);
    return parsed;
  } catch {
    return [...memSavedLists];
  }
}

function persistSavedLists(lists: SavedList[]): void {
  memSavedLists = [...lists];
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.SAVED_LISTS, JSON.stringify(lists));
    } catch {
      // Ignore quota errors
    }
  }
  notifyListeners();
}

/**
 * Create a new named list
 */
export function createSavedList(name: string): SavedList {
  const trimmed = name.trim();
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
  const trimmed = listName.trim();
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
  const lists = getSavedLists();
  const list = lists.find((l) => l.name.toLowerCase() === listName.trim().toLowerCase());
  if (list) {
    list.leadIds = list.leadIds.filter((id) => id !== leadId);
    list.updatedAt = new Date().toISOString();
    persistSavedLists(lists);
  }

  // Update lead item
  const map = getSavedLeadsMap();
  const lead = map[leadId];
  if (lead && lead.listNames) {
    lead.listNames = lead.listNames.filter((name) => name.toLowerCase() !== listName.trim().toLowerCase());
    persistSavedLeadsMap(map);
  }
}

/**
 * Delete a named list
 */
export function deleteSavedList(listName: string): void {
  let lists = getSavedLists();
  lists = lists.filter((l) => l.name.toLowerCase() !== listName.trim().toLowerCase());
  persistSavedLists(lists);
}

/**
 * Retrieve saved leads for a specific list
 */
export function getLeadsForList(listName: string): SavedLeadItem[] {
  const lists = getSavedLists();
  const list = lists.find((l) => l.name.toLowerCase() === listName.trim().toLowerCase());
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
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.SAVED_LEADS);
      window.localStorage.removeItem(STORAGE_KEYS.SAVED_LISTS);
    } catch {
      // Ignore
    }
  }
  notifyListeners();
}
